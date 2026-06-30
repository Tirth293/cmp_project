const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function repair() {
  try {
    console.log('Attempting to add punctuality_percent column...');
    await pool.query(`
      ALTER TABLE performance_metrics 
      ADD COLUMN IF NOT EXISTS punctuality_percent INTEGER DEFAULT 100;
    `);
    console.log('Success!');
    
    console.log('Checking columns...');
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'performance_metrics';
    `);
    console.log('Columns in performance_metrics:', res.rows.map(r => r.column_name));
    
  } catch (err) {
    console.error('Repair failed:', err.message);
  } finally {
    await pool.end();
  }
}

repair();
