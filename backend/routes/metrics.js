const express = require('express');
const router = express.Router();
const db = require('../db');

// Update performance metrics for an employee
router.post('/update', async (req, res) => {
  const { 
    employee_id, 
    month_year, 
    total_calls_made, 
    total_talk_time_minutes,
    site_visits_planned, 
    site_visits_done, 
    total_bookings, 
    approved_leaves, 
    unwanted_leaves 
  } = req.body;
  
  try {
    const result = await db.query(
      `INSERT INTO performance_metrics 
       (employee_id, month_year, total_calls_made, total_talk_time_minutes, 
        site_visits_planned, site_visits_done, total_bookings, approved_leaves, unwanted_leaves) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (employee_id, month_year) 
       DO UPDATE SET 
          total_calls_made = EXCLUDED.total_calls_made,
          total_talk_time_minutes = EXCLUDED.total_talk_time_minutes,
          site_visits_planned = EXCLUDED.site_visits_planned,
          site_visits_done = EXCLUDED.site_visits_done,
          total_bookings = EXCLUDED.total_bookings,
          approved_leaves = EXCLUDED.approved_leaves,
          unwanted_leaves = EXCLUDED.unwanted_leaves,
          created_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [employee_id, month_year || new Date().toISOString().slice(0, 7) + '-01', 
       total_calls_made || 0, total_talk_time_minutes || 0, 
       site_visits_planned || 0, site_visits_done || 0, 
       total_bookings || 0, approved_leaves || 0, unwanted_leaves || 0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating metrics:', err);
    res.status(500).json({ error: err.message });
  }
});

// Build a monthly performance report from Monday-Friday hourly updates.
router.post('/submit-from-updates', async (req, res) => {
  const { employee_id, month_year } = req.body;

  if (!employee_id || !month_year) {
    return res.status(400).json({ error: 'employee_id and month_year are required.' });
  }

  try {
    const monthStart = new Date(month_year).toISOString().slice(0, 7) + '-01';

    const aggregateResult = await db.query(
      `SELECT
         COALESCE(SUM(total_calls_made), 0)::INT AS total_calls_made,
         COALESCE(SUM(total_talk_time_minutes), 0)::INT AS total_talk_time_minutes,
         COALESCE(SUM(svp), 0)::INT AS site_visits_planned,
         COALESCE(SUM(svd), 0)::INT AS site_visits_done,
         COALESCE(SUM(total_bookings), 0)::INT AS total_bookings,
         COUNT(DISTINCT date)::INT AS work_days,
         COUNT(*)::INT AS update_entries
       FROM work_updates
       WHERE user_id = $1
         AND date >= $2::DATE
         AND date < ($2::DATE + INTERVAL '1 month')
         AND EXTRACT(ISODOW FROM date) BETWEEN 1 AND 5`,
      [employee_id, monthStart]
    );

    const totals = aggregateResult.rows[0];

    const result = await db.query(
      `INSERT INTO performance_metrics
       (employee_id, month_year, total_calls_made, total_talk_time_minutes,
        site_visits_planned, site_visits_done, total_bookings, approved_leaves, unwanted_leaves)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0)
       ON CONFLICT (employee_id, month_year)
       DO UPDATE SET
          total_calls_made = EXCLUDED.total_calls_made,
          total_talk_time_minutes = EXCLUDED.total_talk_time_minutes,
          site_visits_planned = EXCLUDED.site_visits_planned,
          site_visits_done = EXCLUDED.site_visits_done,
          total_bookings = EXCLUDED.total_bookings,
          created_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        employee_id,
        monthStart,
        totals.total_calls_made,
        totals.total_talk_time_minutes,
        totals.site_visits_planned,
        totals.site_visits_done,
        totals.total_bookings
      ]
    );

    res.json({
      ...result.rows[0],
      work_days: totals.work_days,
      update_entries: totals.update_entries
    });
  } catch (err) {
    console.error('Error submitting metrics from hourly updates:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get day-by-day weekday hourly update totals for a month.
router.get('/monthly-from-updates/:employeeId', async (req, res) => {
  const { month } = req.query;
  const monthYear = month || new Date().toISOString().slice(0, 7);
  const monthStart = `${monthYear}-01`;

  try {
    const result = await db.query(
      `SELECT
         date,
         COUNT(*)::INT AS update_entries,
         COALESCE(SUM(total_calls_made), 0)::INT AS total_calls_made,
         COALESCE(SUM(total_talk_time_minutes), 0)::INT AS total_talk_time_minutes,
         ROUND((COALESCE(SUM(total_talk_time_minutes), 0)::NUMERIC / 60), 2)::FLOAT AS total_talk_time_hours,
         COALESCE(SUM(svp), 0)::INT AS site_visits_planned,
         COALESCE(SUM(svd), 0)::INT AS site_visits_done,
         COALESCE(SUM(total_bookings), 0)::INT AS total_bookings
       FROM work_updates
       WHERE user_id = $1
         AND date >= $2::DATE
         AND date < ($2::DATE + INTERVAL '1 month')
         AND EXTRACT(ISODOW FROM date) BETWEEN 1 AND 5
       GROUP BY date
       ORDER BY date ASC`,
      [req.params.employeeId, monthStart]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching monthly updates report:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get metrics for an employee
router.get('/:employeeId', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM performance_metrics 
       WHERE employee_id = $1 
       ORDER BY month_year DESC`,
      [req.params.employeeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
