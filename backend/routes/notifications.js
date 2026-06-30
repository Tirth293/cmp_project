const express = require('express');
const router = express.Router();
const db = require('../db');

// Send notification (HR/Admin only)
router.post('/send', async (req, res) => {
    const { title, message, recipient_role, recipient_id, is_urgent, sender_id } = req.body;
    
    try {
        const senderCheck = await db.query(
            'SELECT role FROM employees WHERE id = $1',
            [sender_id]
        );
        
        if (!senderCheck.rows.length || !['admin', 'hr'].includes(senderCheck.rows[0].role)) {
            return res.status(403).json({ error: 'Only HR and Admin can send notifications' });
        }
        
        const result = await db.query(
            `INSERT INTO notifications (title, message, sender_id, recipient_role, recipient_id, is_urgent)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [title, message, sender_id, recipient_role, recipient_id || null, is_urgent || false]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Send notification error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get notifications for logged-in user with their personal read status
router.get('/my', async (req, res) => {
    const { userId, userRole } = req.query;
    
    try {
        const result = await db.query(
            `SELECT 
                n.*, 
                e.name as sender_name,
                COALESCE(unr.is_read, false) as is_read
             FROM notifications n
             LEFT JOIN employees e ON n.sender_id = e.id
             LEFT JOIN user_notification_reads unr ON n.id = unr.notification_id AND unr.user_id = $1
             WHERE 
                (n.recipient_id = $1) OR
                (n.recipient_role = $2) OR
                (n.recipient_role = 'all') OR
                (n.recipient_role = 'employee' AND $2 = 'employee') OR
                (n.recipient_role = 'tl' AND $2 = 'tl') OR
                (n.recipient_role = 'hr' AND $2 = 'hr') OR
                (n.recipient_role = 'admin' AND $2 = 'admin')
             ORDER BY n.created_at DESC
             LIMIT 100`,
            [userId, userRole]
        );
        
        // Count unread for THIS SPECIFIC USER only
        const countResult = await db.query(
            `SELECT COUNT(*) FROM notifications n
             LEFT JOIN user_notification_reads unr ON n.id = unr.notification_id AND unr.user_id = $1
             WHERE ((n.recipient_id = $1) OR (n.recipient_role = $2) OR (n.recipient_role = 'all'))
             AND (unr.is_read IS NULL OR unr.is_read = false)`,
            [userId, userRole]
        );
        
        res.json({
            notifications: result.rows,
            unreadCount: parseInt(countResult.rows[0].count)
        });
    } catch (err) {
        console.error('Get notifications error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Mark notification as read for current user only
router.patch('/:id/read', async (req, res) => {
    const { userId } = req.body;
    const notificationId = req.params.id;
    
    try {
        // Check if notification exists and user has access
        const checkResult = await db.query(
            `SELECT id FROM notifications 
             WHERE id = $1 
             AND ((recipient_id = $2) OR 
                  (recipient_role = (SELECT role FROM employees WHERE id = $2)) OR 
                  (recipient_role = 'all'))`,
            [notificationId, userId]
        );
        
        if (checkResult.rows.length === 0) {
            return res.status(403).json({ error: 'You do not have permission to mark this notification as read' });
        }
        
        // Insert or update read status for this user
        await db.query(
            `INSERT INTO user_notification_reads (notification_id, user_id, is_read, read_at)
             VALUES ($1, $2, true, CURRENT_TIMESTAMP)
             ON CONFLICT (notification_id, user_id) 
             DO UPDATE SET is_read = true, read_at = CURRENT_TIMESTAMP`,
            [notificationId, userId]
        );
        
        res.json({ success: true });
    } catch (err) {
        console.error('Mark read error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Mark ALL as read for CURRENT USER only
router.post('/mark-all-read', async (req, res) => {
    const { userId, userRole } = req.body;
    
    try {
        // Get all notifications that belong to this user and are not yet read
        const notificationsResult = await db.query(
            `SELECT n.id FROM notifications n
             WHERE ((n.recipient_id = $1) OR (n.recipient_role = $2) OR (n.recipient_role = 'all'))
             AND n.id NOT IN (
                SELECT notification_id FROM user_notification_reads 
                WHERE user_id = $1 AND is_read = true
             )`,
            [userId, userRole]
        );
        
        const notificationIds = notificationsResult.rows.map(row => row.id);
        
        if (notificationIds.length > 0) {
            // Build bulk insert query
            const values = notificationIds.map(id => `(${id}, ${userId}, true, CURRENT_TIMESTAMP)`).join(',');
            
            await db.query(
                `INSERT INTO user_notification_reads (notification_id, user_id, is_read, read_at)
                 VALUES ${values}
                 ON CONFLICT (notification_id, user_id) 
                 DO UPDATE SET is_read = true, read_at = CURRENT_TIMESTAMP`
            );
        }
        
        res.json({ 
            success: true, 
            message: `Marked ${notificationIds.length} notification${notificationIds.length !== 1 ? 's' : ''} as read`,
            count: notificationIds.length 
        });
    } catch (err) {
        console.error('Mark all read error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Send notification about missing 6:30 PM final updates (HR/Admin only)
router.post('/send-missed-final-updates', async (req, res) => {
    const { sender_id, date } = req.body;
    const targetDate = date || new Date().toISOString().slice(0, 10);

    try {
        const senderCheck = await db.query(
            'SELECT id, name, role FROM employees WHERE id = $1',
            [sender_id]
        );

        if (!senderCheck.rows.length || !['admin', 'hr'].includes(senderCheck.rows[0].role)) {
            return res.status(403).json({ error: 'Only HR and Admin can send missed final update notifications' });
        }

        const existingNotification = await db.query(
            `SELECT id FROM notifications
             WHERE title = $1
               AND sender_id = $2
               AND DATE(created_at) = $3
               AND recipient_role IN ('admin', 'hr')
             LIMIT 1`,
            [`Missing 6:30 PM Final Updates (${targetDate})`, sender_id, targetDate]
        );

        if (existingNotification.rows.length > 0) {
            return res.status(409).json({ error: 'Missed final update notification already sent for this date.' });
        }

        const missingResult = await db.query(
            `SELECT e.id, e.name, e.role
             FROM employees e
             LEFT JOIN work_updates wu ON wu.user_id = e.id AND wu.date = $1 AND wu.is_final_submission = TRUE
             WHERE e.role IN ('employee', 'tl')
               AND wu.id IS NULL
             ORDER BY e.name`,
            [targetDate]
        );

        if (missingResult.rows.length === 0) {
            return res.json({
                success: true,
                message: `All expected employees submitted the 6:30 PM final update for ${targetDate}.`,
                date: targetDate,
                missingCount: 0
            });
        }

        const missingNames = missingResult.rows.map((row) => row.name || `Employee ${row.id}`);
        const displayNames = missingNames.length > 10
            ? `${missingNames.slice(0, 10).join(', ')} and ${missingNames.length - 10} more`
            : missingNames.join(', ');
        const title = `Missing 6:30 PM Final Updates (${targetDate})`;
        const message = `${missingResult.rows.length} ${missingResult.rows.length === 1 ? 'employee has' : 'employees have'} not submitted their 6:30 PM final update for ${targetDate}. ${missingNames.length <= 10 ? `Missing: ${displayNames}.` : `Missing employees include: ${displayNames}.`}`;

        const notifications = [];
        for (const recipientRole of ['admin', 'hr']) {
            const result = await db.query(
                `INSERT INTO notifications (title, message, sender_id, sender_name, recipient_role, is_urgent)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [title, message, sender_id, senderCheck.rows[0].name, recipientRole, true]
            );
            notifications.push(result.rows[0]);
        }

        res.status(201).json({
            success: true,
            date: targetDate,
            missingCount: missingResult.rows.length,
            notifications,
        });
    } catch (err) {
        console.error('Send missed final update notification error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete notification (Admin only)
router.delete('/:id', async (req, res) => {
    const { userId } = req.body;
    
    try {
        const userCheck = await db.query('SELECT role FROM employees WHERE id = $1', [userId]);
        if (!userCheck.rows.length || userCheck.rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'Only Admin can delete notifications' });
        }
        
        // Also delete associated read records
        await db.query('DELETE FROM user_notification_reads WHERE notification_id = $1', [req.params.id]);
        await db.query('DELETE FROM notifications WHERE id = $1', [req.params.id]);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Delete notification error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;