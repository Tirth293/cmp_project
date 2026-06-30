const express = require('express');
const router = express.Router();
const db = require('../db');

// Mark attendance (Clock In)
router.post('/clock-in', async (req, res) => {
  const { userId } = req.body;
  try {
    // Check if already clocked in today
    const check = await db.query(
      'SELECT * FROM attendance WHERE user_id = $1 AND date = CURRENT_DATE',
      [userId]
    );
    
    if (check.rows.length > 0) {
      return res.status(400).json({ error: "Already clocked in today" });
    }

    await db.query(
      `INSERT INTO attendance (user_id, date) VALUES ($1, CURRENT_DATE)`,
      [userId]
    );
    res.json({ message: "Clock-in successful! Have a great day." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all attendance records (with role-based filtering)
router.get('/all', async (req, res) => {
  const { role, branch } = req.query; // role: 'admin', 'hr', or 'tl'
  
  try {
    let query = `
      SELECT a.*, e.name as employee_name, e.role as employee_role, e.department, e.branch
      FROM attendance a
      JOIN employees e ON a.user_id = e.id
    `;
    let conditions = ["e.role NOT IN ('admin', 'hr')"];
    let params = [];

    if (role === 'admin' || role === 'hr') {
      // Admin and HR can view attendance, but attendance reports only include non-admin staff.
    } else if (role === 'tl') {
      conditions.push("e.role = 'employee'");
    } else {
      return res.status(403).json({ error: "Unauthorized access to attendance logs" });
    }

    if (branch && branch !== 'all') {
      params.push(branch);
      conditions.push(`e.branch = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY a.date DESC, a.created_at DESC LIMIT 500`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get attendance summary for a user
router.get('/user/:userId/summary', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT COUNT(*)::int AS total_attendance
       FROM attendance
       WHERE user_id = $1`,
      [req.params.userId]
    );
    res.json(result.rows[0] || { total_attendance: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get attendance history for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM attendance WHERE user_id = $1 ORDER BY date DESC LIMIT 30',
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get daily status for all relevant employees (Present vs Absent)
router.get('/daily-status', async (req, res) => {
  const { role, branch } = req.query;
  
  try {
    let query = `
      SELECT e.id, e.name, e.role as employee_role, e.department, e.branch,
             CASE WHEN a.id IS NOT NULL THEN 'Present' ELSE 'Absent' END as status,
             a.created_at as clock_in_time
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.user_id AND a.date = CURRENT_DATE
    `;
    let conditions = ["e.role NOT IN ('admin', 'hr')"];
    let params = [];

    if (role === 'admin' || role === 'hr') {
      // Admin and HR can view daily status, but attendance reports only include non-admin staff.
    } else if (role === 'tl') {
      conditions.push("e.role = 'employee'");
    } else {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    if (branch && branch !== 'all') {
      params.push(branch);
      conditions.push(`e.branch = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY status ASC, e.name ASC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
