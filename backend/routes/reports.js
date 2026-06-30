const express = require('express');
const router = express.Router();
const db = require('../db');

// Get company-wide performance summary
router.get('/summary', async (req, res) => {
  try {
    const summaryRes = await db.query(`
      SELECT 
        COUNT(id) as total_employees,
        AVG(achievement_score) as avg_score
      FROM (
        SELECT 
          e.id,
          (AVG(m.total_bookings)::float / NULLIF(AVG(m.total_calls_made), 0) * 100) as achievement_score
        FROM employees e
        LEFT JOIN performance_metrics m ON e.id = m.employee_id
        WHERE e.role = 'employee'
        GROUP BY e.id
      ) sub
    `);
    res.json({ summary: summaryRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get performance trends over time
router.get('/trends', async (req, res) => {
  try {
    const trendsRes = await db.query(`
      SELECT 
        TO_CHAR(month_year, 'Mon YYYY') as name,
        AVG(total_calls_made) as productivity,
        AVG(total_bookings) as achievement
      FROM performance_metrics
      JOIN employees e ON e.id = performance_metrics.employee_id
      WHERE e.role = 'employee'
      GROUP BY month_year
      ORDER BY month_year ASC
    `);
    res.json(trendsRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all archived reports
router.get('/all', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM appraisal_reports ORDER BY date_generated DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
