import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X, AlertCircle, Mail, CheckCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';

const NotificationCenter = () => {
    const { user } = useAuth();
    const { showNotification } = useNotify();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        
        setLoading(true);
        try {
            const response = await fetch(`/api/notifications/my?userId=${user.id}&userRole=${user.role}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch notifications');
            }
            
            const data = await response.json();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
        // Poll every 30 seconds for new notifications
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const markAsRead = async (id) => {
        try {
            const response = await fetch(`/api/notifications/${id}/read`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });
            
            if (!response.ok) {
                throw new Error('Failed to mark as read');
            }
            
            // Update local state
            setNotifications(prev => prev.map(n => 
                n.id === id ? { ...n, is_read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark as read:', err);
            showNotification('Failed to mark notification as read', 'error');
        }
    };

    const markAllAsRead = async () => {
        try {
            const response = await fetch('/api/notifications/mark-all-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, userRole: user.role })
            });
            
            if (!response.ok) {
                throw new Error('Failed to mark all as read');
            }
            
            const data = await response.json();
            
            // Update local state - mark ALL notifications in current view as read
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
            showNotification(data.message || `Marked ${data.count} notifications as read`, 'success');
        } catch (err) {
            console.error('Failed to mark all as read:', err);
            showNotification('Failed to mark all as read', 'error');
        }
    };

    const getTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    };

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'relative',
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'var(--bg-dark)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: 'var(--text-main)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-light)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-dark)'}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: 'var(--danger)',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        borderRadius: '10px',
                        padding: '2px 6px',
                        minWidth: '18px',
                        textAlign: 'center'
                    }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div 
                        onClick={() => setIsOpen(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 999,
                        }}
                    />
                    <div style={{
                        position: 'absolute',
                        top: '50px',
                        right: 0,
                        width: '380px',
                        maxWidth: 'calc(100vw - 20px)',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 1000,
                        overflow: 'hidden',
                        animation: 'slideDown 0.2s ease'
                    }}>
                        <div style={{
                            padding: '1rem',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                                    Notifications
                                </h3>
                                {unreadCount > 0 && (
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                        {unreadCount} unread
                                    </span>
                                )}
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--primary)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        fontSize: '0.7rem',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '6px',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-light)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <CheckCheck size={14} /> Mark all read
                                </button>
                            )}
                        </div>

                        <div style={{
                            maxHeight: '450px',
                            overflowY: 'auto'
                        }}>
                            {loading ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <div className="spinner" style={{ width: '30px', height: '30px', margin: '0 auto 0.5rem' }}></div>
                                    Loading...
                                </div>
                            ) : notifications.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <Mail size={40} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                    <p>No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map(notif => (
                                    <div
                                        key={notif.id}
                                        onClick={() => !notif.is_read && markAsRead(notif.id)}
                                        style={{
                                            padding: '1rem',
                                            borderBottom: '1px solid var(--border)',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s',
                                            background: notif.is_read ? 'transparent' : 'var(--primary-light)',
                                            position: 'relative'
                                        }}
                                    >
                                        {notif.is_urgent && !notif.is_read && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '8px',
                                                right: '8px'
                                            }}>
                                                <AlertCircle size={12} color="var(--danger)" />
                                            </div>
                                        )}
                                        <div style={{ fontWeight: '600', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {notif.is_urgent && <span className="badge danger" style={{ fontSize: '0.6rem' }}>URGENT</span>}
                                            <span style={{ fontSize: '0.9rem' }}>{notif.title}</span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', lineHeight: '1.4' }}>
                                            {notif.message}
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            fontSize: '0.65rem',
                                            color: 'var(--text-muted)'
                                        }}>
                                            <span>{getTimeAgo(notif.created_at)}</span>
                                            {notif.sender_name && <span>From: {notif.sender_name}</span>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <button
                            onClick={() => setIsOpen(false)}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'var(--bg-dark)',
                                border: 'none',
                                borderTop: '1px solid var(--border)',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-dark)'}
                        >
                            Close
                        </button>
                    </div>
                </>
            )}

            <style>{`
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
};

export default NotificationCenter;