const express = require('express');
const router = express.Router();
const db = require('../db');
const { normalizeBranch } = require('../utils/normalizers');

router.get('/generate', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let startDate, endDate;
    if (start_date && end_date) {
      startDate = new Date(start_date);
      endDate = new Date(end_date);
    } else {
      // Default to last 2 months
      endDate = new Date();
      startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 2);
    }

    // 1. Fetch Employee Data with Metrics and Ratings for the range
    const employeeDataQuery = `
      WITH metric_agg AS (
        SELECT 
          employee_id,
          SUM(total_calls_made)::int as total_calls,
          SUM(site_visits_planned)::int as total_svp,
          SUM(site_visits_done)::int as total_svd,
          SUM(total_bookings)::int as total_bookings,
          SUM(approved_leaves)::int as total_leaves,
          SUM(unwanted_leaves)::int as total_ul,
          AVG(punctuality_percent)::float as avg_punctuality
        FROM performance_metrics
        WHERE month_year >= $1 AND month_year <= $2
        GROUP BY employee_id
      ),
      rating_agg AS (
        SELECT 
          employee_id,
          AVG(team_leader_rating)::float as overall_rating,
          STRING_AGG(strengths, ' | ') as strengths,
          STRING_AGG(improvement_areas, ' | ') as areas_of_improvement,
          STRING_AGG(behavior_discipline, ' | ') as behavior_discipline,
          STRING_AGG(target_achievement, ' | ') as target_achievement
        FROM qualitative_ratings
        WHERE month_year >= $1 AND month_year <= $2
        GROUP BY employee_id
      )
      SELECT 
        e.id, e.name, e.branch, e.department,
        m.total_calls, m.total_svp, m.total_svd, m.total_bookings, m.total_leaves, m.total_ul, m.avg_punctuality,
        r.overall_rating, r.strengths, r.areas_of_improvement, r.behavior_discipline, r.target_achievement
      FROM employees e
      LEFT JOIN metric_agg m ON e.id = m.employee_id
      LEFT JOIN rating_agg r ON e.id = r.employee_id
      WHERE e.role = 'employee'
      ORDER BY e.name ASC
    `;

    const { rows: employees } = await db.query(employeeDataQuery, [startDate, endDate]);

    // 2. Calculate Overall Summary
    const summary = {
      total_calls: employees.reduce((sum, e) => sum + parseInt(e.total_calls || 0), 0),
      total_svp: employees.reduce((sum, e) => sum + parseInt(e.total_svp || 0), 0),
      total_svd: employees.reduce((sum, e) => sum + parseInt(e.total_svd || 0), 0),
      total_bookings: employees.reduce((sum, e) => sum + parseInt(e.total_bookings || 0), 0),
      avg_punctuality: employees.reduce((sum, e) => sum + parseFloat(e.avg_punctuality || 0), 0) / (employees.length || 1),
      total_leaves: employees.reduce((sum, e) => sum + parseInt(e.total_leaves || 0), 0),
      total_ul: employees.reduce((sum, e) => sum + parseInt(e.total_ul || 0), 0)
    };

    // 3. Find Best Performer and Needs Improvement
    const bestPerformer = employees.length > 0 
      ? [...employees].sort((a, b) => (b.overall_rating || 0) - (a.overall_rating || 0))[0].name 
      : 'N/A';
    
    const needsImprovement = employees.length > 0 
      ? [...employees].sort((a, b) => (a.overall_rating || 0) - (b.overall_rating || 0))[0].name 
      : 'N/A';

    const branches = [...new Set(
      employees
        .map((employee) => normalizeBranch(employee.branch, 'Ashram Road'))
        .filter(Boolean)
    )];

    res.json({
      duration: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
      startDate,
      endDate,
      branches,
      employees,
      summary,
      insights: {
        bestPerformer,
        needsImprovement,
        productivityLevel: summary.total_calls > 1000 ? "High" : "Moderate",
        recommendation: "Focus on increasing Site Visit to Booking conversion ratio."
      }
    });

  } catch (error) {
    console.error('Error generating bi-monthly report:', error);
    res.status(500).json({ 
      error: 'Failed to generate report', 
      details: error.message,
      suggestion: 'Check if database schema is up to date. Run the health check endpoint to auto-repair.'
    });
  }
});

// Save Report to Database
router.post('/save', async (req, res) => {
  const { startDate, endDate, reportData } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO saved_reports (start_date, end_date, data) VALUES ($1, $2, $3) RETURNING id',
      [startDate, endDate, reportData]
    );
    res.status(201).json({ message: 'Report saved successfully', id: result.rows[0].id });
  } catch (err) {
    console.error('Error saving report:', err);
    res.status(500).json({ error: 'Failed to save report' });
  }
});

module.exports = router;
