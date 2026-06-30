const express = require('express');
const router = express.Router();
const db = require('../db');

// Apply for leave
router.post('/apply', async (req, res) => {
  const { userId, from, to, reason } = req.body;
  try {
    // Check user role first
    const userRes = await db.query('SELECT role FROM employees WHERE id = $1', [userId]);
    const userRole = userRes.rows[0]?.role;

    await db.query(
      `INSERT INTO leaves (user_id, from_date, to_date, reason, tl_status, hr_status, admin_status, final_status)
       VALUES ($1, $2, $3, $4, 'Not Required', 'Pending', 'Not Required', 'Pending')`,
      [userId, from, to, reason]
    );
    res.json({ message: "Leave application submitted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all leaves (with role-based filtering)
router.get('/all', async (req, res) => {
  const { role } = req.query; // role: 'admin' or 'hr'

  try {
    let query = `
      SELECT l.*, e.name as employee_name, e.department, e.role as employee_role, e.branch
      FROM leaves l 
      JOIN employees e ON l.user_id = e.id 
    `;
    let conditions = [];

    if (role === 'hr' || role === 'admin') {
      // HR and Admin see everything
    } else {
      return res.status(403).json({ error: "Unauthorized access to leave logs" });
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY l.created_at DESC`;

    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get leave summary for a specific user
router.get('/user/:userId/summary', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         COUNT(*)::int AS total_leaves,
         COUNT(*) FILTER (WHERE final_status = 'Approved')::int AS approved_leaves,
         COUNT(*) FILTER (WHERE final_status = 'Pending')::int AS pending_leaves,
         COUNT(*) FILTER (WHERE final_status = 'Rejected')::int AS rejected_leaves,
         COALESCE(SUM((l.to_date - l.from_date) + 1) FILTER (WHERE l.final_status = 'Approved'), 0)::int AS approved_leave_days
       FROM leaves l
       WHERE l.user_id = $1`,
      [req.params.userId]
    );
    res.json(result.rows[0] || {
      total_leaves: 0,
      approved_leaves: 0,
      pending_leaves: 0,
      rejected_leaves: 0,
      approved_leave_days: 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get leave history for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM leaves WHERE user_id = $1 ORDER BY created_at DESC',
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ HR-ONLY approval (single step)
router.patch('/:id/status', async (req, res) => {
  const { status, role, singleStep, approverId } = req.body;
  const leaveId = req.params.id;

  // Only HR or Admin can approve (Admin can approve for oversight)
  if (role !== 'hr' && role !== 'admin') {
    return res.status(403).json({ error: "Only HR can approve leave requests" });
  }

  try {
    const approverRes = approverId
      ? await db.query('SELECT name, role FROM employees WHERE id = $1', [approverId])
      : { rows: [] };
    const approvedByName = approverRes.rows[0]?.name || (role === 'admin' ? 'Admin' : 'HR');
    
    // Get leave details for notification
    const leaveRes = await db.query(`
      SELECT l.user_id, l.from_date, l.to_date, l.final_status, e.name as employee_name
      FROM leaves l
      JOIN employees e ON l.user_id = e.id
      WHERE l.id = $1
    `, [leaveId]);
    const leave = leaveRes.rows[0];

    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    if (leave.final_status !== 'Pending') {
      return res.status(409).json({ error: 'This leave request has already been finalized.' });
    }

    if (singleStep === true) {
      // ✅ SINGLE-STEP APPROVAL: Update all statuses at once
      await db.query(`
        UPDATE leaves 
        SET final_status = $1, 
            hr_status = $1,
            admin_status = 'Not Required',
            approved_by = $2,
            approved_at = NOW(),
            updated_at = NOW()
        WHERE id = $3
      `, [status, approvedByName, leaveId]);

      // ✅ FIXED: Create notification for the employee using correct column names
      if (status === 'Approved') {
        await db.query(`
          INSERT INTO notifications (title, message, sender_name, recipient_id, recipient_role, is_urgent, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [
          'Leave Request Approved',
          `Your leave request from ${new Date(leave.from_date).toLocaleDateString()} to ${new Date(leave.to_date).toLocaleDateString()} has been approved.`,
          approvedByName,
          leave.user_id,
          'employee',
          false
        ]);
      } else if (status === 'Rejected') {
        await db.query(`
          INSERT INTO notifications (title, message, sender_name, recipient_id, recipient_role, is_urgent, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [
          'Leave Request Rejected',
          `Your leave request from ${new Date(leave.from_date).toLocaleDateString()} to ${new Date(leave.to_date).toLocaleDateString()} has been rejected.`,
          approvedByName,
          leave.user_id,
          'employee',
          true
        ]);
      }

      res.json({ 
        message: `Leave request ${status.toLowerCase()} successfully`,
        finalStatus: status
      });
      
    } else {
      // Legacy dual-approval (kept for backward compatibility)
      let columnToUpdate = '';
      if (role === 'hr') columnToUpdate = 'hr_status';
      else if (role === 'admin') columnToUpdate = 'admin_status';
      else return res.status(400).json({ error: "Invalid role for approval" });

      await db.query(`UPDATE leaves SET ${columnToUpdate} = $1 WHERE id = $2`, [status, leaveId]);

      // Re-evaluate Final Status
      const { rows } = await db.query(`
        SELECT l.hr_status, l.admin_status 
        FROM leaves l 
        WHERE l.id = $1
      `, [leaveId]);
      
      const leaveData = rows[0];

      let finalStatus = 'Pending';
      if (leaveData.hr_status === 'Rejected' || leaveData.admin_status === 'Rejected') {
        finalStatus = 'Rejected';
      } else if (leaveData.hr_status === 'Approved' && leaveData.admin_status === 'Approved') {
        finalStatus = 'Approved';
      }

      await db.query('UPDATE leaves SET final_status = $1 WHERE id = $2', [finalStatus, leaveId]);

      res.json({ 
        message: `Level approval updated to ${status}`,
        finalStatus: finalStatus
      });
    }
  } catch (err) {
    console.error('Leave status update error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
