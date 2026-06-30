const express = require('express');
const router = express.Router();
const db = require('../db');
const { normalizeBranch } = require('../utils/normalizers');

const ALLOWED_SLOTS = [
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
  '6:30 PM'
];

const SLOT_ORDER_SQL = `
  CASE wu.update_slot
    WHEN '11:00 AM' THEN 1
    WHEN '12:00 PM' THEN 2
    WHEN '1:00 PM' THEN 3
    WHEN '3:00 PM' THEN 4
    WHEN '4:00 PM' THEN 5
    WHEN '5:00 PM' THEN 6
    WHEN '6:30 PM' THEN 7
    ELSE 99
  END
`;

const applyCommonFilters = ({ branch, project, userId, dateFrom, dateTo }) => {
  const conditions = [];
  const params = [];

  if (branch && branch !== 'all') {
    params.push(normalizeBranch(branch));
    conditions.push(
      `INITCAP(LOWER(TRIM(REGEXP_REPLACE(COALESCE(wu.branch, ''), '\\s+', ' ', 'g')))) = $${params.length}`
    );
  }

  if (project && project !== 'all') {
    params.push(project);
    conditions.push(`wu.project_name = $${params.length}`);
  }

  if (userId && userId !== 'all') {
    params.push(parseInt(userId, 10));
    conditions.push(`wu.user_id = $${params.length}`);
  }

  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`wu.date >= $${params.length}`);
  }

  if (dateTo) {
    params.push(dateTo);
    conditions.push(`wu.date <= $${params.length}`);
  }

  return { conditions, params };
};

// Submit an hourly update call / project update
router.post('/submit', async (req, res) => {
  const {
    userId,
    project_name,
    branch,
    update_slot,
    notes,
    total_calls_made,
    total_talk_time_minutes,
    svp,
    svd,
    total_bookings
  } = req.body;
  if (!userId || !project_name || !update_slot) {
    return res.status(400).json({ error: 'userId, project_name and update_slot are required.' });
  }
  if (!ALLOWED_SLOTS.includes(update_slot)) {
    return res.status(400).json({ error: `update_slot must be one of: ${ALLOWED_SLOTS.join(', ')}` });
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const userResult = await db.query(
      'SELECT id, branch, email FROM employees WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const employee = userResult.rows[0];
    const selectedBranch = normalizeBranch(employee.branch || branch);

    const finalAlreadySubmitted = await db.query(
      `SELECT 1 FROM work_updates WHERE user_id = $1 AND date = $2 AND is_final_submission = TRUE LIMIT 1`,
      [userId, today]
    );

    if (finalAlreadySubmitted.rows.length > 0) {
      return res.status(409).json({ error: 'Final update already submitted for today. No further updates allowed.' });
    }

    const slotAlreadyUsed = await db.query(
      `SELECT 1 FROM work_updates WHERE user_id = $1 AND date = $2 AND update_slot = $3 LIMIT 1`,
      [userId, today, update_slot]
    );

    if (slotAlreadyUsed.rows.length > 0) {
      return res.status(409).json({ error: 'This update slot has already been submitted for today.' });
    }

    const result = await db.query(
      `INSERT INTO work_updates
         (user_id, project_name, branch, date, update_slot, notes, hours, total_calls_made, total_talk_time_minutes, svp, svd, total_bookings, is_final_submission, locked, submission_timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
       RETURNING *`,
      [
        userId,
        project_name.trim(),
        selectedBranch,
        today,
        update_slot,
        notes || '',
        Math.round((parseInt(total_talk_time_minutes, 10) || 0) / 60),
        parseInt(total_calls_made, 10) || 0,
        parseInt(total_talk_time_minutes, 10) || 0,
        parseInt(svp, 10) || 0,
        parseInt(svd, 10) || 0,
        parseInt(total_bookings, 10) || 0,
        update_slot === '6:30 PM',
        true
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Work update submit error:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An update already exists for this slot today.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get all updates for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT wu.*, e.name AS employee_name, e.email
       FROM work_updates wu
       LEFT JOIN employees e ON e.id = wu.user_id
       WHERE wu.user_id = $1
       ORDER BY wu.date DESC, ${SLOT_ORDER_SQL}, wu.submission_timestamp DESC`,
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get latest updates for all employees with optional filters
router.get('/', async (req, res) => {
  const { conditions, params } = applyCommonFilters(req.query);

  let query = `
    SELECT wu.*, e.name AS employee_name, e.email, e.department
    FROM work_updates wu
    LEFT JOIN employees e ON e.id = wu.user_id
  `;
  if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
  query += ` ORDER BY wu.date DESC, ${SLOT_ORDER_SQL}, wu.submission_timestamp DESC`;

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get project summary totals
router.get('/summary', async (req, res) => {
  const { conditions, params } = applyCommonFilters(req.query);

  let query = `
    SELECT
      wu.project_name,
      COUNT(*)::INT AS update_count,
      COUNT(DISTINCT wu.user_id)::INT AS contributor_count,
      COUNT(*) FILTER (WHERE wu.is_final_submission = TRUE)::INT AS final_submission_count,
      ROUND((SUM(wu.total_talk_time_minutes)::NUMERIC / 60), 2)::FLOAT AS total_hours,
      SUM(wu.total_calls_made)::INT AS total_calls_made,
      SUM(wu.total_talk_time_minutes)::INT AS total_talk_time_minutes,
      SUM(wu.svp)::INT AS total_svp,
      SUM(wu.svd)::INT AS total_svd,
      SUM(wu.total_bookings)::INT AS total_bookings,
      STRING_AGG(DISTINCT COALESCE(NULLIF(wu.branch, ''), 'Unassigned'), ', ' ORDER BY COALESCE(NULLIF(wu.branch, ''), 'Unassigned')) AS branches,
      MAX(wu.submission_timestamp) AS last_submission
    FROM work_updates wu
  `;
  if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
  query += ` GROUP BY wu.project_name ORDER BY total_talk_time_minutes DESC, wu.project_name ASC`;

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get employee hourly update summary
router.get('/by-employee', async (req, res) => {
  const { conditions, params } = applyCommonFilters(req.query);

  let query = `
    SELECT
      wu.user_id,
      e.name AS employee_name,
      e.email,
      e.branch,
      COUNT(*)::INT AS update_entries,
      COUNT(DISTINCT wu.project_name)::INT AS project_count,
      COUNT(*) FILTER (WHERE wu.locked = TRUE)::INT AS locked_entries,
      COUNT(*) FILTER (WHERE wu.is_final_submission = TRUE)::INT AS final_submission_count,
      ROUND((SUM(wu.total_talk_time_minutes)::NUMERIC / 60), 2)::FLOAT AS total_hours,
      SUM(wu.total_calls_made)::INT AS total_calls_made,
      SUM(wu.total_talk_time_minutes)::INT AS total_talk_time_minutes,
      SUM(wu.svp)::INT AS total_svp,
      SUM(wu.svd)::INT AS total_svd,
      SUM(wu.total_bookings)::INT AS total_bookings,
      MAX(wu.submission_timestamp) AS last_submission
    FROM work_updates wu
    LEFT JOIN employees e ON e.id = wu.user_id
  `;
  if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
  query += `
    GROUP BY wu.user_id, e.name, e.email, e.branch
    ORDER BY total_talk_time_minutes DESC, e.name ASC
  `;

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get distinct project names
router.get('/projects', async (req, res) => {
  try {
    const result = await db.query(`SELECT DISTINCT project_name FROM work_updates ORDER BY project_name ASC`);
    res.json(result.rows.map((r) => r.project_name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
