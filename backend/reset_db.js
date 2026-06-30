const fs = require('fs');
const path = require('path');
const db = require('./db');
const bcrypt = require('bcryptjs');

async function resetDatabase() {
  try {
    console.log('--- Starting Database Reset ---');

    console.log('Dropping existing tables...');
    await db.query(`
      DROP TABLE IF EXISTS user_notification_reads CASCADE;
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TABLE IF EXISTS saved_reports CASCADE;
      DROP TABLE IF EXISTS attendance CASCADE;
      DROP TABLE IF EXISTS leaves CASCADE;
      DROP TABLE IF EXISTS tasks CASCADE;
      DROP TABLE IF EXISTS qualitative_ratings CASCADE;
      DROP TABLE IF EXISTS performance_metrics CASCADE;
      DROP TABLE IF EXISTS appraisal_reports CASCADE;
      DROP TABLE IF EXISTS system_settings CASCADE;
      DROP TABLE IF EXISTS employees CASCADE;
    `);

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Recreating tables from schema.sql...');
    await db.query(schemaSql);

    console.log('✅ Database reset successfully!');
    
    // ==========================================
    // FIX PASSWORDS WITH REAL HASHES
    // ==========================================
    console.log('\n🔧 Fixing passwords with correct hashes...');
    
    const adminHash = await bcrypt.hash('admin123', 10);
    const hrHash = await bcrypt.hash('hr123', 10);
    const empHash = await bcrypt.hash('password123', 10);
    
    // Update all existing users with correct passwords
    await db.query(`
      UPDATE employees 
      SET password_hash = CASE
        WHEN email = 'admin@mtpas.com' THEN $1
        WHEN email = 'hr@mtpas.com' THEN $2
        ELSE $3
      END
    `, [adminHash, hrHash, empHash]);
    
    // Ensure admin exists with correct password
    await db.query(`
      INSERT INTO employees (name, role, email, password_hash, department, reporting_to, branch)
      VALUES ('Master Admin', 'admin', 'admin@mtpas.com', $1, 'IT Management', 'System Owner', 'Ashram Road')
      ON CONFLICT (email) 
      DO UPDATE SET password_hash = $1, name = 'Master Admin', role = 'admin'
    `, [adminHash]);
    
    // Ensure HR exists with correct password
    await db.query(`
      INSERT INTO employees (name, role, email, password_hash, department, reporting_to, branch)
      VALUES ('HR Manager', 'hr', 'hr@mtpas.com', $1, 'Human Resources', 'Admin', 'Ashram Road')
      ON CONFLICT (email)
      DO UPDATE SET password_hash = $1, name = 'HR Manager', role = 'hr'
    `, [hrHash]);
    
    console.log('✅ Passwords fixed with real bcrypt hashes!');
    
    // Display all users and their credentials
    const users = await db.query(`
      SELECT id, name, email, role, branch 
      FROM employees 
      ORDER BY role, name
    `);
    
    console.log('\n========================================');
    console.log('📋 LOGIN CREDENTIALS:');
    console.log('========================================');
    
    for (const user of users.rows) {
      let password = '';
      if (user.role === 'admin') password = 'admin123';
      else if (user.role === 'hr') password = 'hr123';
      else password = 'password123';
      
      console.log(`\n👤 ${user.name} (${user.role})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${password}`);
      if (user.branch) console.log(`   Branch: ${user.branch}`);
    }
    
    console.log('\n========================================');
    console.log('✅ Database ready with correct passwords!');
    console.log('========================================');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Reset failed:', err);
    console.error(err.stack);
    process.exit(1);
  }
}

resetDatabase();