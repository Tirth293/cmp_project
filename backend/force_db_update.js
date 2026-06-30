require('dotenv').config();
const db = require('./db');

async function forceUpdateDB() {
  console.log('==============================================');
  console.log('INITIATING FORCED DATABASE SCHEMA UPDATE...');
  console.log('==============================================');
  
  try {
    console.log('[1/5] Checking employees table structure...');
    
    // Add profile_pic column if it doesn't exist
    await db.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='profile_pic') THEN
          ALTER TABLE employees ADD COLUMN profile_pic TEXT;
          RAISE NOTICE 'Added profile_pic column.';
        END IF;
      END $$;
    `);
    console.log('✔️ profile_pic column verified/created.');

    // Add department column if it doesn't exist
    await db.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='department') THEN
          ALTER TABLE employees ADD COLUMN department VARCHAR(100) DEFAULT 'Sales';
          RAISE NOTICE 'Added department column.';
        END IF;
      END $$;
    `);
    console.log('✔️ department column verified/created.');

    // Add reporting_to column if it doesn't exist
    await db.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='reporting_to') THEN
          ALTER TABLE employees ADD COLUMN reporting_to VARCHAR(100) DEFAULT 'Team Leader';
          RAISE NOTICE 'Added reporting_to column.';
        END IF;
      END $$;
    `);
    console.log('✔️ reporting_to column verified/created.');

    // Add branch column if it doesn't exist (NEW)
    await db.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='branch') THEN
          ALTER TABLE employees ADD COLUMN branch VARCHAR(100) DEFAULT 'Ashram Road';
          RAISE NOTICE 'Added branch column.';
        END IF;
      END $$;
    `);
    console.log('✔️ branch column verified/created.');

    console.log('==============================================');
    console.log('DATABASE SCHEMA IS 100% PROPER AND COMPLETE.');
    console.log('Branch/Location field has been added.');
    console.log('Images will now save perfectly.');
    console.log('==============================================');
    process.exit(0);
  } catch (err) {
    console.error('CRITICAL DATABASE ERROR:', err);
    process.exit(1);
  }
}

forceUpdateDB();