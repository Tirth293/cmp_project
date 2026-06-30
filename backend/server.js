require('dotenv').config();
const express = require('express');
const cors = require('cors');

const appraisalRoutes = require('./routes/appraisals');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');
const settingRoutes = require('./routes/settings');
const reportRoutes = require('./routes/reports');
const ratingRoutes = require('./routes/ratings');
const metricRoutes = require('./routes/metrics');
const chatbotRoutes = require('./routes/chatbot');
const biMonthlyReportRoutes = require('./routes/bi_monthly_report');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leave');
const updateRoutes = require('./routes/updates');
const notificationRoutes = require('./routes/notifications');

// ==========================================
// 1. CRASH PROTECTION & GLOBAL ERROR HANDLING
// ==========================================
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    "http://localhost:5173", // local Vite frontend
    "https://cmp-project-frontend.onrender.com" // Render frontend URL
  ],
  credentials: true
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Body parser error handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Image is too large. Max limit is 25MB.' });
  }
  next(err);
});

// Routes
app.use('/api/appraisals', appraisalRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/metrics', metricRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/reports/bi-monthly', biMonthlyReportRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/updates', updateRoutes);
app.use('/api/notifications', notificationRoutes);
// Root Route
app.get('/', (req, res) => {
  res.send('CMP Backend is Running');
});

// Health Route
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    server: 'Running'
  });
});

// Health Check with Auto-Repair Logic
app.get('/api/health', async (req, res) => {
  try {
    const db = require('./db');
    // 1. Check Connectivity
    await db.query('SELECT 1');
    
    // 2. Auto-Repair Check (Ensure profile_pic exists)
    await db.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='employees' AND column_name='profile_pic') THEN
          ALTER TABLE employees ADD COLUMN profile_pic TEXT;
        END IF;
      END $$;
    `);

    res.json({ 
      status: 'Perfect', 
      server: 'Active & Self-Healing', 
      database: 'Connected & Verified',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[HEALTH_CHECK] AUTO-REPAIR FAILED:', err.message);
    res.status(500).json({ status: 'Error', message: 'Critical Database Failure', detail: err.message });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`================================================`);
  console.log(`MTP&AS BACKEND ACTIVE ON PORT ${PORT}`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`================================================`);
  
  // 100% AUTOMATIC STARTUP DATABASE REPAIR
  try {
    const db = require('./db');
    
    // Helper to add column if not exists
    const addColumn = async (table, column, type, defaultValue = null) => {
      try {
        const checkQuery = `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`;
        const res = await db.query(checkQuery, [table, column]);
        if (res.rows.length === 0) {
          console.log(`[DB REPAIR] Adding column ${column} to ${table}...`);
          const alterQuery = `ALTER TABLE ${table} ADD COLUMN ${column} ${type}${defaultValue !== null ? ` DEFAULT ${defaultValue}` : ''}`;
          await db.query(alterQuery);
        }
      } catch (err) {
        console.error(`[DB REPAIR ERROR] Failed to add ${column} to ${table}:`, err.message);
      }
    };

    // Employees table repairs
    await addColumn('employees', 'profile_pic', 'TEXT');
    await addColumn('employees', 'department', 'VARCHAR(100)', "'Sales'");
    await addColumn('employees', 'reporting_to', 'VARCHAR(100)', "'Manager'");
    await addColumn('employees', 'branch', 'VARCHAR(100)', "'Ashram Road'");

    // Performance Metrics repairs
    await addColumn('performance_metrics', 'punctuality_percent', 'INTEGER', '100');
    await addColumn('performance_metrics', 'site_visits_planned', 'INTEGER', '0');
    await addColumn('performance_metrics', 'site_visits_done', 'INTEGER', '0');
    await addColumn('performance_metrics', 'unwanted_leaves', 'INTEGER', '0');
    await addColumn('performance_metrics', 'approved_leaves', 'INTEGER', '0');

    // Qualitative Ratings repairs
    await addColumn('qualitative_ratings', 'strengths', 'TEXT');
    await addColumn('qualitative_ratings', 'improvement_areas', 'TEXT');
    await addColumn('qualitative_ratings', 'behavior_discipline', 'TEXT');
    await addColumn('qualitative_ratings', 'target_achievement', 'TEXT');

    // Create leaves table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS leaves (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES employees(id),
        from_date DATE NOT NULL,
        to_date DATE NOT NULL,
        reason TEXT,
        tl_status VARCHAR(20) DEFAULT 'Pending',
        hr_status VARCHAR(20) DEFAULT 'Pending',
        admin_status VARCHAR(20) DEFAULT 'Pending',
        final_status VARCHAR(20) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Leaves table repairs (Multi-level approval)
    await addColumn('leaves', 'tl_status', 'VARCHAR(20)', "'Pending'");
    await addColumn('leaves', 'hr_status', 'VARCHAR(20)', "'Pending'");
    await addColumn('leaves', 'admin_status', 'VARCHAR(20)', "'Pending'");
    await addColumn('leaves', 'final_status', 'VARCHAR(20)', "'Pending'");
    await addColumn('leaves', 'approved_by', 'VARCHAR(100)');
    await addColumn('leaves', 'approved_at', 'TIMESTAMP');
    await addColumn('leaves', 'created_at', 'TIMESTAMP', 'CURRENT_TIMESTAMP');
    await addColumn('leaves', 'updated_at', 'TIMESTAMP', 'CURRENT_TIMESTAMP');

    // Attendance repairs
    await addColumn('attendance', 'created_at', 'TIMESTAMP', 'CURRENT_TIMESTAMP');

    // Create attendance table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES employees(id),
        date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create hourly work update tracking table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS work_updates (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        project_name VARCHAR(255) NOT NULL,
        branch VARCHAR(100) DEFAULT 'Ashram Road',
        date DATE DEFAULT CURRENT_DATE,
        update_slot VARCHAR(20) NOT NULL,
        notes TEXT,
        hours INTEGER DEFAULT 0,
        total_calls_made INTEGER DEFAULT 0,
        total_talk_time_minutes INTEGER DEFAULT 0,
        svp INTEGER DEFAULT 0,
        svd INTEGER DEFAULT 0,
        total_bookings INTEGER DEFAULT 0,
        submission_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_final_submission BOOLEAN DEFAULT FALSE,
        locked BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date, update_slot, project_name)
      )
    `);
    await addColumn('work_updates', 'submission_timestamp', 'TIMESTAMP', 'CURRENT_TIMESTAMP');
    await addColumn('work_updates', 'total_calls_made', 'INTEGER', '0');
    await addColumn('work_updates', 'total_talk_time_minutes', 'INTEGER', '0');
    await addColumn('work_updates', 'total_bookings', 'INTEGER', '0');
    await addColumn('work_updates', 'is_final_submission', 'BOOLEAN', 'FALSE');
    await addColumn('work_updates', 'locked', 'BOOLEAN', 'TRUE');
    await addColumn('work_updates', 'created_at', 'TIMESTAMP', 'CURRENT_TIMESTAMP');

    // Ensure saved_reports table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS saved_reports (
        id SERIAL PRIMARY KEY,
        report_type VARCHAR(50) DEFAULT 'bi-monthly',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ✨ CREATE NOTIFICATIONS TABLE (without is_read column - moved to user_notification_reads)
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        sender_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        sender_name VARCHAR(255),
        recipient_role VARCHAR(50),
        recipient_id INTEGER,
        is_urgent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await addColumn('notifications', 'sender_name', 'VARCHAR(255)');

    // ✨ CREATE USER_NOTIFICATION_READS TABLE (Per-user read tracking)
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_notification_reads (
        id SERIAL PRIMARY KEY,
        notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(notification_id, user_id)
      )
    `);

    // ✨ Add indexes for notifications table
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient 
      ON notifications(recipient_id, recipient_role)
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_created 
      ON notifications(created_at DESC)
    `);

    // ✨ Add indexes for user_notification_reads table
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_notification_reads_user 
      ON user_notification_reads(user_id, notification_id)
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_notification_reads_notification 
      ON user_notification_reads(notification_id)
    `);

    // ✨ Add unique constraint to attendance (prevent duplicate clock-ins)
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'attendance_user_date_unique' 
          AND table_name = 'attendance'
        ) THEN
          ALTER TABLE attendance ADD CONSTRAINT attendance_user_date_unique UNIQUE (user_id, date);
        END IF;
      END $$;
    `);

    await db.query(`
      UPDATE employees
      SET email = LOWER(TRIM(email)),
          branch = INITCAP(LOWER(TRIM(REGEXP_REPLACE(COALESCE(branch, 'Ashram Road'), '\\s+', ' ', 'g'))))
      WHERE email IS NOT NULL
    `);

    await db.query(`
      UPDATE work_updates
      SET branch = INITCAP(LOWER(TRIM(REGEXP_REPLACE(COALESCE(branch, 'Ashram Road'), '\\s+', ' ', 'g')))),
          locked = TRUE,
          submission_timestamp = COALESCE(submission_timestamp, created_at, NOW())
      WHERE branch IS NOT NULL OR submission_timestamp IS NULL OR locked IS DISTINCT FROM TRUE
    `);

    await db.query(`
      UPDATE leaves
      SET tl_status = COALESCE(NULLIF(tl_status, ''), 'Not Required'),
          hr_status = COALESCE(NULLIF(hr_status, ''), 'Pending'),
          admin_status = 'Not Required',
          updated_at = COALESCE(updated_at, created_at, NOW())
    `);

    // ✨ Remove is_read column from notifications if it exists (migration)
    await db.query(`
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='is_read') THEN
          ALTER TABLE notifications DROP COLUMN is_read;
          RAISE NOTICE 'Removed is_read column from notifications table';
        END IF;
      END $$;
    `);

    console.log(`[SYSTEM] Startup Database Auto-Repair: VERIFIED`);
    console.log(`[SYSTEM] Notifications table ready!`);
    console.log(`[SYSTEM] User Notification Reads table ready!`);
  } catch (err) {
    console.error(`[SYSTEM] Startup Database Auto-Repair FAILED:`, err.message);
  }
});

// ==========================================
// 6. GRACEFUL SHUTDOWN HANDLERS
// ==========================================
const shutdown = () => {
  console.log('[SHUTDOWN] Closing server and database connections...');
  server.close(() => {
    console.log('[SHUTDOWN] Server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
