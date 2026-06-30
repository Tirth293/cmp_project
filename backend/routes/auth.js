const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { normalizeBranch, normalizeEmail } = require('../utils/normalizers');

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_change_this';

// Register (for initial setup/demo)
router.post('/register', async (req, res) => {
  const { name, email, password, role, department, reporting_to, branch } = req.body;
  try {
    const normalizedEmail = normalizeEmail(email);
    const normalizedBranch = normalizeBranch(branch);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const result = await db.query(
      'INSERT INTO employees (name, email, password_hash, role, department, reporting_to, branch) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, role, department, reporting_to, branch',
      [name, normalizedEmail, hashedPassword, role || 'employee', department || 'Sales', reporting_to || 'Manager', normalizedBranch]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all distinct branch names
router.get('/branches', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT INITCAP(LOWER(TRIM(REGEXP_REPLACE(branch, '\\s+', ' ', 'g')))) AS branch
       FROM employees
       WHERE branch IS NOT NULL AND TRIM(branch) != ''
       ORDER BY branch ASC`
    );
    const branches = result.rows.map(r => r.branch);
    res.json(branches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const normalizedEmail = normalizeEmail(email);
    const result = await db.query('SELECT * FROM employees WHERE email = $1', [normalizedEmail]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        profile_pic: user.profile_pic,
        created_at: user.created_at,
        department: user.department,
        reporting_to: user.reporting_to,
        branch: user.branch  // ← ADDED: branch field
      } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Profile
router.get('/profile/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT id, name, email, role, department, reporting_to, branch, profile_pic, created_at FROM employees WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Profile
router.put('/profile/:id', async (req, res) => {
  const { name, email, role, department, reporting_to, branch, profile_pic } = req.body;
  try {
    const normalizedEmail = normalizeEmail(email);
    const normalizedBranch = normalizeBranch(branch);

    const result = await db.query(
      'UPDATE employees SET name = $1, email = $2, role = $3, department = $4, reporting_to = $5, branch = $6, profile_pic = $7 WHERE id = $8 RETURNING id, name, email, role, department, reporting_to, branch, profile_pic, created_at',
      [name, normalizedEmail, role, department, reporting_to, normalizedBranch, profile_pic, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Profile
router.delete('/profile/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM employees WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Profile deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
