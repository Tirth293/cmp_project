const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all tasks
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t.*, e1.name as assigned_to_name, e2.name as assigned_by_name 
      FROM tasks t
      LEFT JOIN employees e1 ON t.assigned_to = e1.id
      LEFT JOIN employees e2 ON t.assigned_by = e2.id
      ORDER BY t.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get tasks for a specific employee
router.get('/employee/:id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT t.*, e.name as assigned_by_name 
      FROM tasks t
      LEFT JOIN employees e ON t.assigned_by = e.id
      WHERE t.assigned_to = $1
      ORDER BY t.deadline ASC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new task
router.post('/', async (req, res) => {
  const { title, description, assigned_to, assigned_by, deadline, priority } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO tasks (title, description, assigned_to, assigned_by, deadline, priority) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, description, assigned_to, assigned_by, deadline, priority]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update task status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    const result = await db.query(
      'UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Full update task
router.put('/:id', async (req, res) => {
  const { title, description, deadline, priority, status } = req.body;
  try {
    const result = await db.query(
      'UPDATE tasks SET title = $1, description = $2, deadline = $3, priority = $4, status = $5 WHERE id = $6 RETURNING *',
      [title, description, deadline, priority, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
