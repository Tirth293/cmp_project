require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcryptjs');

async function fixPasswords() {
  try {
    console.log('🔧 Fixing passwords for all roles...');
    
    // Generate hashes for different passwords
    const adminHash = await bcrypt.hash('admin123', 10);
    const hrHash = await bcrypt.hash('hr123', 10);
    const employeeHash = await bcrypt.hash('password123', 10);
    
    console.log('✅ Generated password hashes');
    
    // Update passwords based on role
    await db.query(`
      UPDATE employees 
      SET password_hash = CASE
        WHEN role = 'admin' THEN $1
        WHEN role = 'hr' THEN $2
        ELSE $3
      END
    `, [adminHash, hrHash, employeeHash]);
    
    console.log('✅ Updated all employee passwords by role');
    
    // Ensure admin exists
    const adminCheck = await db.query("SELECT * FROM employees WHERE email = 'admin@mtpas.com'");
    if (adminCheck.rows.length === 0) {
      await db.query(
        `INSERT INTO employees (name, role, email, password_hash, department, reporting_to, branch) 
         VALUES ('Master Admin', 'admin', 'admin@mtpas.com', $1, 'IT Management', 'System Owner', 'Ashram Road')`,
        [adminHash]
      );
      console.log('✅ Master Admin account created.');
    } else {
      // Update existing admin password
      await db.query(
        "UPDATE employees SET password_hash = $1 WHERE email = 'admin@mtpas.com'",
        [adminHash]
      );
      console.log('✅ Master Admin password updated.');
    }
    
    // Ensure HR exists
    const hrCheck = await db.query("SELECT * FROM employees WHERE email = 'hr@mtpas.com'");
    if (hrCheck.rows.length === 0) {
      await db.query(
        `INSERT INTO employees (name, role, email, password_hash, department, reporting_to, branch) 
         VALUES ('HR Manager', 'hr', 'hr@mtpas.com', $1, 'Human Resources', 'Admin', 'Ashram Road')`,
        [hrHash]
      );
      console.log('✅ HR Manager account created.');
    } else {
      // Update existing HR password
      await db.query(
        "UPDATE employees SET password_hash = $1 WHERE email = 'hr@mtpas.com'",
        [hrHash]
      );
      console.log('✅ HR Manager password updated.');
    }
    
    // Display all users and their credentials
    const users = await db.query(`
      SELECT id, name, email, role, branch 
      FROM employees 
      ORDER BY role, name
    `);
    
    console.log('\n==============================================');
    console.log('✅ PASSWORD FIX COMPLETED SUCCESSFULLY!');
    console.log('==============================================');
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('──────────────────────────────────────────────');
    
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
    
    console.log('\n──────────────────────────────────────────────');
    console.log('💡 TIPS:');
    console.log('   • Admin can access everything');
    console.log('   • HR can manage leaves and approvals');
    console.log('   • Employees can submit updates and view performance');
    console.log('==============================================\n');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

fixPasswords();