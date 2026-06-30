const db = require('./db');

async function migrate() {
  console.log('--- Starting Database Migration ---');
  try {
    console.log('Updating employees table structure...');
    await db.query(`
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS profile_pic TEXT;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'Sales';
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS reporting_to VARCHAR(100) DEFAULT 'Team Leader';
    `);
    
    console.log('Verifying system weightages...');
    await db.query(`
      INSERT INTO system_settings (setting_key, setting_value) 
      VALUES ('appraisal_weightages', '{"productivity": 60, "leadership": 30, "discipline": 10}')
      ON CONFLICT (setting_key) DO NOTHING;
    `);

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
