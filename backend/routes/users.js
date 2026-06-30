const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const { normalizeBranch, normalizeEmail } = require('../utils/normalizers');

// Get all users (excluding passwords) with their latest performance score
router.get('/', async (req, res) => {
  const { branch } = req.query;
  try {
    let branchCondition = '';
    const params = [];
    if (branch && branch !== 'all') {
      params.push(normalizeBranch(branch));
      branchCondition = `WHERE INITCAP(LOWER(TRIM(REGEXP_REPLACE(COALESCE(e.branch, ''), '\\s+', ' ', 'g')))) = $${params.length}`;
    }
    const result = await db.query(`
      WITH latest_metrics AS (
        SELECT DISTINCT ON (employee_id) *
        FROM performance_metrics
        ORDER BY employee_id, month_year DESC
      )
      SELECT e.id, e.name, e.role, e.email, e.created_at, e.department, e.reporting_to, e.profile_pic, e.branch,
             'N/A' as score,
             'No Data' as status
      FROM employees e
      LEFT JOIN latest_metrics m ON e.id = m.employee_id 
      ${branchCondition}
      ORDER BY e.name ASC
    `, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get per-branch analytics stats
router.get('/branch-stats', async (req, res) => {
  try {
    const result = await db.query(`
      WITH latest_metrics AS (
        SELECT DISTINCT ON (employee_id) employee_id, total_bookings
        FROM performance_metrics
        ORDER BY employee_id, month_year DESC
      )
      SELECT 
        COALESCE(NULLIF(INITCAP(LOWER(TRIM(REGEXP_REPLACE(e.branch, '\\s+', ' ', 'g')))), ''), 'Unassigned') as branch,
        COUNT(e.id) as employee_count,
        COUNT(CASE WHEN e.role = 'employee' THEN 1 END) as employees,
        COUNT(CASE WHEN e.role = 'hr' THEN 1 END) as hr_count,
        0 as avg_score
      FROM employees e
      LEFT JOIN latest_metrics m ON e.id = m.employee_id
      GROUP BY COALESCE(NULLIF(INITCAP(LOWER(TRIM(REGEXP_REPLACE(e.branch, '\\s+', ' ', 'g')))), ''), 'Unassigned')
      ORDER BY employee_count DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// IMPORTANT: Specific routes must come BEFORE generic /:id routes
// Update profile (Name, Email, Profile Pic, etc.)
router.put('/update-profile', async (req, res) => {
  const { userId, name, email, profile_pic, department, reporting_to, branch } = req.body;
  try {
    const normalizedEmail = normalizeEmail(email);
    const normalizedBranch = normalizeBranch(branch);

    const result = await db.query(
      'UPDATE employees SET name = $1, email = $2, profile_pic = $3, department = $4, reporting_to = $5, branch = $6 WHERE id = $7 RETURNING id, name, email, role, profile_pic, department, reporting_to, branch',
      [name, normalizedEmail, profile_pic, department, reporting_to, normalizedBranch, userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change password
router.post('/change-password', async (req, res) => {
  const { userId, currentPassword, newPassword } = req.body;
  console.log(`[PASSWORD_CHANGE] Attempt for user ${userId}`);
  
  try {
    const id = parseInt(userId);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid User ID' });

    const userRes = await db.query('SELECT password_hash FROM employees WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      console.log(`[PASSWORD_CHANGE] User ${id} not found`);
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
    if (!isMatch) {
      console.log(`[PASSWORD_CHANGE] Current password incorrect for ${id}`);
      return res.status(400).json({ error: 'Current password incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    await db.query('UPDATE employees SET password_hash = $1 WHERE id = $2', [hash, id]);
    
    console.log(`[PASSWORD_CHANGE] Success for ${id}`);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(`[PASSWORD_CHANGE] ERROR for ${userId}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// Generic Update user (for Admin) - Only matches numeric IDs
router.put('/:id(\\d+)', async (req, res) => {
  const { name, email, role, department, reporting_to, branch } = req.body;
  try {
    const normalizedEmail = normalizeEmail(email);
    const normalizedBranch = normalizeBranch(branch);

    const result = await db.query(
      'UPDATE employees SET name = $1, email = $2, role = $3, department = $4, reporting_to = $5, branch = $6 WHERE id = $7 RETURNING id, name, role, email, branch',
      [name, normalizedEmail, role, department, reporting_to, normalizedBranch, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user - Only matches numeric IDs
router.delete('/:id(\\d+)', async (req, res) => {
  try {
    await db.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
