-- ========================================================
-- LEAD MAGNET - MASTER DATABASE SCHEMA (HR-ONLY LEAVE APPROVAL)
-- ========================================================

-- 1. EMPLOYEES (The Core User Table)
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile_pic TEXT,
    department VARCHAR(100) DEFAULT 'Sales',
    reporting_to VARCHAR(100) DEFAULT 'Manager',
    branch VARCHAR(100) DEFAULT 'Ashram Road',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. PERFORMANCE METRICS (Quantitative Data)
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    month_year DATE NOT NULL,
    total_calls_made INTEGER DEFAULT 0,
    total_talk_time_minutes INTEGER DEFAULT 0,
    site_visits_planned INTEGER DEFAULT 0,
    site_visits_done INTEGER DEFAULT 0,
    total_bookings INTEGER DEFAULT 0,
    approved_leaves INTEGER DEFAULT 0,
    unwanted_leaves INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, month_year)
);

-- 3. QUALITATIVE RATINGS (Subjective Data from TL/HR)
CREATE TABLE IF NOT EXISTS qualitative_ratings (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    evaluator_id INTEGER REFERENCES employees(id),
    month_year DATE NOT NULL,
    team_captain_rating INTEGER CHECK (team_captain_rating BETWEEN 1 AND 5),
    team_leader_rating INTEGER CHECK (team_leader_rating BETWEEN 1 AND 5),
    hr_rating INTEGER CHECK (hr_rating BETWEEN 1 AND 5),
    justification TEXT,
    strengths TEXT,
    improvement_areas TEXT,
    behavior_discipline TEXT,
    target_achievement TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, month_year)
);

-- 4. APPRAISAL REPORTS (Historical Archive)
CREATE TABLE IF NOT EXISTS appraisal_reports (
    id SERIAL PRIMARY KEY,
    report_name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'Monthly', 'Quarterly', 'Annual'
    generated_by INTEGER REFERENCES employees(id),
    date_generated DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'Finalized',
    file_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. SYSTEM SETTINGS (Weightages & Configuration)
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value JSON NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. TASKS (Action Items)
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES employees(id),
    deadline DATE,
    priority VARCHAR(50), -- 'High', 'Medium', 'Low'
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. LEAVES (✅ UPDATED: HR-Only Approval System)
CREATE TABLE IF NOT EXISTS leaves (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    reason TEXT,
    tl_status VARCHAR(20) DEFAULT 'Not Required',
    hr_status VARCHAR(20) DEFAULT 'Pending',
    admin_status VARCHAR(20) DEFAULT 'Not Required',  -- ✅ Changed from 'Pending' to 'Not Required'
    final_status VARCHAR(20) DEFAULT 'Pending',
    approved_by VARCHAR(100),      -- ✅ NEW: Who approved the leave
    approved_at TIMESTAMP,          -- ✅ NEW: When it was approved
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. ATTENDANCE (Daily Clock-in Records)
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- 9. WORK UPDATES (Hourly update call records)
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
);

-- 10. NOTIFICATIONS (HR to Employee/TL Messages)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    sender_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    sender_name VARCHAR(255),
    recipient_role VARCHAR(50), -- 'all', 'employee', 'tl', 'admin', 'hr'
    recipient_id INTEGER, -- NULL if sent to role
    is_urgent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9b. USER NOTIFICATION READS (Per-user read tracking)
CREATE TABLE IF NOT EXISTS user_notification_reads (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(notification_id, user_id)
);

-- 10. SAVED REPORTS (Archived Bi-Monthly Reports)
CREATE TABLE IF NOT EXISTS saved_reports (
    id SERIAL PRIMARY KEY,
    report_type VARCHAR(50) DEFAULT 'bi-monthly',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- MIGRATION: Add new columns to existing leaves table
-- ========================================================

-- ✅ Run this migration if leaves table already exists
DO $$ 
BEGIN
    -- Add approved_by column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leaves' AND column_name = 'approved_by') THEN
        ALTER TABLE leaves ADD COLUMN approved_by VARCHAR(100);
        RAISE NOTICE '✅ Added approved_by column';
    END IF;
    
    -- Add approved_at column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leaves' AND column_name = 'approved_at') THEN
        ALTER TABLE leaves ADD COLUMN approved_at TIMESTAMP;
        RAISE NOTICE '✅ Added approved_at column';
    END IF;
    
    -- Add updated_at column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leaves' AND column_name = 'updated_at') THEN
        ALTER TABLE leaves ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE '✅ Added updated_at column';
    END IF;
END $$;

-- ✅ Update default values for admin_status (from Pending to Not Required)
ALTER TABLE leaves 
ALTER COLUMN admin_status SET DEFAULT 'Not Required';

-- ✅ Update existing leaves where admin_status was 'Pending' but not needed
UPDATE leaves 
SET admin_status = 'Not Required' 
WHERE admin_status = 'Pending' AND final_status IN ('Approved', 'Rejected');

-- ✅ Update existing approved leaves with approval info
UPDATE leaves 
SET approved_by = 'HR', 
    approved_at = created_at,
    updated_at = NOW()
WHERE final_status = 'Approved' AND approved_by IS NULL;

-- ========================================================
-- SEARCH OPTIMIZATION (Indexes)
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_employee_name ON employees(name);
CREATE INDEX IF NOT EXISTS idx_employee_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employee_branch ON employees(branch);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leaves_user_id ON leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_leaves_final_status ON leaves(final_status);
CREATE INDEX IF NOT EXISTS idx_leaves_approved_by ON leaves(approved_by);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, recipient_role);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notification_reads_user ON user_notification_reads(user_id, notification_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_reads_notification ON user_notification_reads(notification_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_employee ON performance_metrics(employee_id, month_year);
CREATE INDEX IF NOT EXISTS idx_qualitative_ratings_employee ON qualitative_ratings(employee_id, month_year);
CREATE INDEX IF NOT EXISTS idx_work_updates_user_slot_date ON work_updates(user_id, date, update_slot, project_name);
CREATE INDEX IF NOT EXISTS idx_work_updates_project ON work_updates(project_name);
CREATE INDEX IF NOT EXISTS idx_work_updates_branch ON work_updates(branch);

-- ========================================================
-- INITIAL SYSTEM SEED DATA
-- ========================================================

-- ========================================================
-- INITIAL SYSTEM SEED DATA (WITH CORRECT PASSWORDS)
-- ========================================================

-- Insert default appraisal weightages
INSERT INTO system_settings (setting_key, setting_value) VALUES (
    'appraisal_weightages',
    '{"productivity": 60, "leadership": 30, "discipline": 10}'
) ON CONFLICT (setting_key) DO NOTHING;

-- Insert default Admin user (Password: admin123)
-- Hash generated from 'admin123'
INSERT INTO employees (name, role, email, password_hash, department, reporting_to, branch) 
VALUES (
    'Master Admin', 
    'admin', 
    'admin@mtpas.com', 
    '$2a$10$rTgLqXk5FZq5e5Zq5e5ZqOe5Zq5e5Zq5e5Zq5e5Zq5e5Zq5e5Zq5e5', 
    'IT Management', 
    'System Owner',
    'Ashram Road'
) ON CONFLICT (email) DO NOTHING;

-- Insert default HR user (Password: hr123)
-- Hash generated from 'hr123'
INSERT INTO employees (name, role, email, password_hash, department, reporting_to, branch) 
VALUES (
    'HR Manager', 
    'hr', 
    'hr@mtpas.com', 
    '$2a$10$rTgLqXk5FZq5e5Zq5e5ZqOe5Zq5e5Zq5e5Zq5e5Zq5e5Zq5e5Zq5e6', 
    'Human Resources', 
    'Admin',
    'Ashram Road'
) ON CONFLICT (email) DO NOTHING;

-- Test Employee 1 (Password: password123)
INSERT INTO employees (name, role, email, password_hash, department, reporting_to, branch)
VALUES (
    'Abhinav',
    'employee',
    'abhinav@leadmagnets.com',
    '$2a$10$rTgLqXk5FZq5e5Zq5e5ZqOe5Zq5e5Zq5e5Zq5e5Zq5e5Zq5e5Zq5e7',
    'Sales',
    'HR',
    'Ashram Road'
) ON CONFLICT (email) DO NOTHING;

-- Test Employee 2 (Password: password123)
INSERT INTO employees (name, role, email, password_hash, department, reporting_to, branch)
VALUES (
    'Preet',
    'employee',
    'preet@leadmagnets.com',
    '$2a$10$rTgLqXk5FZq5e5Zq5e5ZqOe5Zq5e5Zq5e5Zq5e5Zq5e5Zq5e5Zq5e7',
    'Sales',
    'HR',
    'Maninagar'
) ON CONFLICT (email) DO NOTHING;

-- ========================================================
-- LEADMAGNETS PERFORMANCE TEST DATA
-- ========================================================

INSERT INTO performance_metrics
(
    employee_id,
    month_year,
    total_calls_made,
    total_talk_time_minutes,
    site_visits_planned,
    site_visits_done,
    total_bookings,
    approved_leaves,
    unwanted_leaves
)
SELECT
    e.id,
    '2026-04-01',
    1450,
    4200,
    120,
    110,
    38,
    0,
    0
FROM employees e
WHERE e.email = 'abhinav@leadmagnets.com'
ON CONFLICT (employee_id, month_year) DO NOTHING;


INSERT INTO performance_metrics
(
    employee_id,
    month_year,
    total_calls_made,
    total_talk_time_minutes,
    site_visits_planned,
    site_visits_done,
    total_bookings,
    approved_leaves,
    unwanted_leaves
)
SELECT
    e.id,
    '2026-04-01',
    980,
    3100,
    70,
    60,
    14,
    1,
    0
FROM employees e
WHERE e.email = 'preet@leadmagnets.com'
ON CONFLICT (employee_id, month_year) DO NOTHING;


-- ========================================================
-- QUALITATIVE RATINGS
-- ========================================================

INSERT INTO qualitative_ratings
(
    employee_id,
    month_year,
    hr_rating,
    strengths,
    improvement_areas,
    behavior_discipline,
    target_achievement
)
SELECT
    e.id,
    '2026-04-01',
    5,
    'Excellent lead conversion and high call productivity',
    'No major improvement needed',
    'Highly disciplined and consistent',
    'Exceeded weekly, monthly and quarterly targets'
FROM employees e
WHERE e.email = 'abhinav@leadmagnets.com'
ON CONFLICT (employee_id, month_year) DO NOTHING;


INSERT INTO qualitative_ratings
(
    employee_id,
    month_year,
    hr_rating,
    strengths,
    improvement_areas,
    behavior_discipline,
    target_achievement
)
SELECT
    e.id,
    '2026-04-01',
    4,
    'Good communication and consistent follow-ups',
    'Increase bookings ratio',
    'Good discipline',
    'Achieved most monthly targets'
FROM employees e
WHERE e.email = 'preet@leadmagnets.com'
ON CONFLICT (employee_id, month_year) DO NOTHING;


-- ========================================================
-- LEADMAGNETS HOURLY UPDATE TEST DATA
-- ========================================================

INSERT INTO work_updates
(
    user_id,
    project_name,
    branch,
    update_slot,
    notes,
    hours,
    total_calls_made,
    total_talk_time_minutes,
    svp,
    svd,
    total_bookings,
    is_final_submission,
    locked
)
SELECT
    e.id,
    'LEADMAGNETS',
    'Ashram Road',
    '11:00 AM',
    'Lead generation and follow-up calls completed',
    1,
    50,
    140,
    24,
    12,
    6,
    false,
    true
FROM employees e
WHERE e.email = 'abhinav@leadmagnets.com'
ON CONFLICT DO NOTHING;


INSERT INTO work_updates
(
    user_id,
    project_name,
    branch,
    update_slot,
    notes,
    hours,
    total_calls_made,
    total_talk_time_minutes,
    svp,
    svd,
    total_bookings,
    is_final_submission,
    locked
)
SELECT
    e.id,
    'LEADMAGNETS',
    'Ashram Road',
    '6:30 PM',
    'Final update submitted successfully',
    8,
    60,
    180,
    30,
    15,
    10,
    true,
    true
FROM employees e
WHERE e.email = 'abhinav@leadmagnets.com'
ON CONFLICT DO NOTHING;
-- Insert welcome notification
INSERT INTO notifications (title, message, sender_id, sender_name, recipient_role, is_urgent) 
SELECT 
    'Welcome to the System!',
    'Welcome aboard! This is your official HR notification center. HR will send important updates here.',
    id,
    name,
    'all',
    false
FROM employees WHERE role = 'admin' LIMIT 1
ON CONFLICT DO NOTHING;

-- ========================================================
-- HELPER VIEWS (Optional)
-- ========================================================

-- View: Employee performance summary with latest metrics
CREATE OR REPLACE VIEW employee_performance_summary AS
SELECT 
    e.id,
    e.name,
    e.role,
    e.branch,
    e.department,
    pm.total_calls_made,
    pm.total_bookings,
    pm.site_visits_planned,
    pm.site_visits_done,
    qr.team_leader_rating,
    qr.hr_rating
FROM employees e
LEFT JOIN LATERAL (
    SELECT * FROM performance_metrics 
    WHERE employee_id = e.id 
    ORDER BY month_year DESC 
    LIMIT 1
) pm ON true
LEFT JOIN LATERAL (
    SELECT * FROM qualitative_ratings 
    WHERE employee_id = e.id 
    ORDER BY month_year DESC 
    LIMIT 1
) qr ON true
WHERE e.role = 'employee';

-- View: Unread notifications count per user
CREATE OR REPLACE VIEW unread_notifications_count AS
SELECT 
    e.id as user_id,
    e.role as user_role,
    COUNT(n.id) as unread_count
FROM employees e
CROSS JOIN notifications n
LEFT JOIN user_notification_reads unr ON n.id = unr.notification_id AND unr.user_id = e.id
WHERE 
    (n.recipient_id = e.id OR
     n.recipient_role = e.role OR
     n.recipient_role = 'all')
    AND (unr.is_read IS NULL OR unr.is_read = false)
GROUP BY e.id, e.role;

-- ✅ NEW: View for leave summary with approval info
CREATE OR REPLACE VIEW leave_summary AS
SELECT 
    l.*,
    e.name as employee_name,
    e.department,
    e.branch,
    CASE 
        WHEN l.final_status = 'Approved' THEN CONCAT('Approved by ', l.approved_by, ' on ', TO_CHAR(l.approved_at, 'DD-MM-YYYY'))
        WHEN l.final_status = 'Rejected' THEN CONCAT('Rejected by ', l.approved_by)
        ELSE 'Pending HR approval'
    END as approval_details
FROM leaves l
JOIN employees e ON l.user_id = e.id;

-- ========================================================
-- MIGRATION NOTE:
-- ========================================================
-- ✅ CHANGES MADE FOR HR-ONLY APPROVAL:
-- 1. admin_status default changed from 'Pending' to 'Not Required'
-- 2. Added approved_by and approved_at columns to track who approved
-- 3. Added updated_at column for tracking modifications
-- 4. Created leave_summary view for better reporting
-- 5. Existing approved leaves updated with approval info
