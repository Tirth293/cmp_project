const express = require('express');
const router = express.Router();
const db = require('../db');

// Submit a qualitative rating
router.post('/', async (req, res) => {
  const { employee_id, evaluator_id, month_year, team_leader_rating, hr_rating, team_captain_rating, justification } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO qualitative_ratings 
       (employee_id, evaluator_id, month_year, team_leader_rating, hr_rating, team_captain_rating, justification) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (employee_id, month_year) 
       DO UPDATE SET 
          team_leader_rating = COALESCE(NULLIF($4, 0), qualitative_ratings.team_leader_rating),
          hr_rating = COALESCE(NULLIF($5, 0), qualitative_ratings.hr_rating),
          team_captain_rating = COALESCE(NULLIF($6, 0), qualitative_ratings.team_captain_rating),
          justification = COALESCE($7, qualitative_ratings.justification),
          created_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [employee_id, evaluator_id, month_year || new Date().toISOString().slice(0, 7) + '-01', team_leader_rating || 0, hr_rating || 0, team_captain_rating || 0, justification]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get ratings for an employee
router.get('/:employeeId', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM qualitative_ratings WHERE employee_id = $1 ORDER BY month_year DESC',
      [req.params.employeeId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
