import React, { useState, useEffect } from 'react';
import { Send, X, Users, User, AlertTriangle, Globe, Briefcase, Shield, UserCheck, Search, ChevronDown, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';

const SendNotificationModal = ({ onClose, onSend }) => {
    const { user } = useAuth();
    const { showNotification } = useNotify();
    const [sending, setSending] = useState(false);
    const [allEmployees, setAllEmployees] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
    
    const [form, setForm] = useState({
        title: '',
        message: '',
        recipient_role: 'all',
        recipient_id: null,
        recipient_name: '',
        is_urgent: false
    });

    // Fetch all employees for dropdown
    useEffect(() => {
        if (form.recipient_role === 'specific') {
            fetchEmployees();
        }
    }, [form.recipient_role]);

    const fetchEmployees = async () => {
        setLoadingEmployees(true);
        try {
            const response = await fetch('/api/users');
            const data = await response.json();
            setAllEmployees(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch employees:', err);
        } finally {
            setLoadingEmployees(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!form.title.trim()) {
            showNotification('Please enter a title', 'error');
            return;
        }
        if (!form.message.trim()) {
            showNotification('Please enter a message', 'error');
            return;
        }
        if (form.recipient_role === 'specific' && !form.recipient_id) {
            showNotification('Please select an employee', 'error');
            return;
        }

        setSending(true);
        try {
            const payload = {
                title: form.title,
                message: form.message,
                recipient_role: form.recipient_role === 'specific' ? 'employee' : form.recipient_role,
                recipient_id: form.recipient_role === 'specific' ? form.recipient_id : null,
                is_urgent: form.is_urgent,
                sender_id: user.id
            };

            const response = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                showNotification(`✅ Notification sent to ${getRecipientLabel()} successfully!`, 'success');
                if (onSend) onSend();
                onClose();
            } else {
                showNotification(data.error || 'Failed to send notification', 'error');
            }
        } catch (err) {
            console.error('Send notification error:', err);
            showNotification('Server error. Please try again.', 'error');
        } finally {
            setSending(false);
        }
    };

    const getRecipientLabel = () => {
        const labels = {
            'all': 'Everyone',
            'employee': 'All Employees',
            'hr': 'All HR',
            'admin': 'All Admin',
            'specific': form.recipient_name || 'Selected Employee'
        };
        return labels[form.recipient_role] || form.recipient_role;
    };

    const getRecipientIcon = (role) => {
        const icons = {
            'all': <Globe size={16} />,
            'employee': <Users size={16} />,
            'hr': <Shield size={16} />,
            'admin': <Shield size={16} />,
            'specific': <UserCheck size={16} />
        };
        return icons[role] || <Users size={16} />;
    };

    const getRecipientColor = (role) => {
        const colors = {
            'all': 'var(--primary)',
            'employee': '#10b981',
            'hr': '#8b5cf6',
            'admin': '#ef4444',
            'specific': '#f59e0b'
        };
        return colors[role] || 'var(--primary)';
    };

    const filteredEmployees = allEmployees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectEmployee = (emp) => {
        setForm({ 
            ...form, 
            recipient_id: emp.id, 
            recipient_name: emp.name,
            recipient_role: 'specific'
        });
        setShowEmployeeDropdown(false);
        setSearchTerm('');
    };

    // 🎯 ROLE-BASED AUDIENCE OPTIONS
    // Only show options that are relevant to the logged-in user's role
    const getAudienceOptions = () => {
        const userRole = user?.role;
        
        // All possible options
        const allOptions = [
            { value: 'all', label: '📢 Everyone', description: 'All employees across all branches', color: 'var(--primary)', icon: Globe, allowedRoles: ['admin', 'hr'] },
            { value: 'employee', label: '👥 All Employees', description: 'Only employees (not HR/Admin)', color: '#10b981', icon: Users, allowedRoles: ['admin', 'hr'] },
            { value: 'hr', label: '👩‍💼 All HR', description: 'All HR Managers only', color: '#8b5cf6', icon: Shield, allowedRoles: ['admin'] },
            { value: 'admin', label: '🛡️ All Admin', description: 'All System Administrators', color: '#ef4444', icon: Shield, allowedRoles: ['admin'] },
            { value: 'specific', label: '🎯 Specific Employee', description: 'Send to one specific person', color: '#f59e0b', icon: UserCheck, allowedRoles: ['admin', 'hr'] },
        ];
        
        // Filter options based on user role
        return allOptions.filter(option => option.allowedRoles.includes(userRole));
    };

    const audienceOptions = getAudienceOptions();

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            animation: 'fadeIn 0.2s ease'
        }}>
            <div className="card" style={{ 
                width: '100%', 
                maxWidth: '580px', 
                padding: '1.75rem', 
                maxHeight: '90vh', 
                overflowY: 'auto',
                borderRadius: '24px'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Send size={22} color="var(--primary)" /> 
                            <span>Send Notification</span>
                        </h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            {user?.role === 'admin' ? 'Admin' : 'HR'} - Send announcements
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            color: 'var(--text-muted)',
                            padding: '0.5rem',
                            borderRadius: '10px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-dark)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Title */}
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                        <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                            Title <span style={{ color: 'var(--danger)' }}>*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="e.g., Holiday Announcement, Meeting Reminder, Policy Update"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '12px' }}
                            autoFocus
                        />
                    </div>

                    {/* Message */}
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                        <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                            Message <span style={{ color: 'var(--danger)' }}>*</span>
                        </label>
                        <textarea
                            required
                            rows={4}
                            value={form.message}
                            onChange={(e) => setForm({ ...form, message: e.target.value })}
                            placeholder="Write your notification message here..."
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', resize: 'vertical' }}
                        />
                    </div>

                    {/* Audience Selection - Only shows options based on user role */}
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                        <label style={{ fontWeight: '600', marginBottom: '0.75rem', display: 'block' }}>
                            <Users size={14} style={{ display: 'inline', marginRight: '0.25rem' }} /> Send To
                        </label>
                        
                        {audienceOptions.length === 0 ? (
                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                You don't have permission to send notifications
                            </div>
                        ) : (
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: `repeat(${Math.min(audienceOptions.length, 2)}, 1fr)`, 
                                gap: '0.75rem',
                                marginBottom: '0.75rem'
                            }}>
                                {audienceOptions.map(option => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setForm({ 
                                            ...form, 
                                            recipient_role: option.value,
                                            recipient_id: option.value === 'specific' ? form.recipient_id : null
                                        })}
                                        style={{
                                            padding: '0.75rem',
                                            borderRadius: '12px',
                                            border: form.recipient_role === option.value ? `2px solid ${option.color}` : '1px solid var(--border)',
                                            background: form.recipient_role === option.value ? `${option.color}15` : 'var(--bg-dark)',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                            {React.createElement(option.icon, { size: 16, color: option.color })}
                                            <span style={{ fontWeight: '600', fontSize: '0.85rem' }}>{option.label}</span>
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                            {option.description}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Specific Employee Dropdown */}
                    {form.recipient_role === 'specific' && (
                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                            <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                                <UserCheck size={14} style={{ display: 'inline', marginRight: '0.25rem' }} /> Select Employee
                            </label>
                            
                            {form.recipient_name ? (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0.6rem 0.75rem',
                                    background: 'var(--primary-light)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--primary)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <User size={16} color="var(--primary)" />
                                        <span style={{ fontWeight: '500' }}>{form.recipient_name}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setForm({ ...form, recipient_id: null, recipient_name: '' })}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--text-muted)',
                                            cursor: 'pointer',
                                            padding: '0.25rem'
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div style={{ position: 'relative' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.6rem 0.75rem',
                                        background: 'var(--bg-dark)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}>
                                        <Search size={16} color="var(--text-muted)" />
                                        <input
                                            type="text"
                                            placeholder="Search employee by name or email..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                flex: 1,
                                                background: 'none',
                                                border: 'none',
                                                outline: 'none',
                                                color: 'var(--text-main)'
                                            }}
                                        />
                                        <ChevronDown size={16} color="var(--text-muted)" />
                                    </div>
                                    
                                    {showEmployeeDropdown && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            marginTop: '0.5rem',
                                            background: 'var(--bg-card)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '12px',
                                            maxHeight: '250px',
                                            overflowY: 'auto',
                                            zIndex: 10,
                                            boxShadow: 'var(--shadow-lg)'
                                        }}>
                                            {loadingEmployees ? (
                                                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                    Loading...
                                                </div>
                                            ) : filteredEmployees.length === 0 ? (
                                                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                    No employees found
                                                </div>
                                            ) : (
                                                filteredEmployees.map(emp => (
                                                    <div
                                                        key={emp.id}
                                                        onClick={() => selectEmployee(emp)}
                                                        style={{
                                                            padding: '0.75rem',
                                                            cursor: 'pointer',
                                                            borderBottom: '1px solid var(--border)',
                                                            transition: 'background 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-dark)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        <div style={{ fontWeight: '500' }}>{emp.name}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                            {emp.email} • {emp.role}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Urgent Checkbox */}
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={form.is_urgent}
                                onChange={(e) => setForm({ ...form, is_urgent: e.target.checked })}
                                style={{ width: 'auto', marginRight: '0.5rem' }}
                            />
                            <AlertTriangle size={14} color="var(--danger)" />
                            <span style={{ fontWeight: '500' }}>Mark as Urgent</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(Highlighted in red for recipients)</span>
                        </label>
                    </div>

                    {/* Preview Box */}
                    <div style={{ 
                        padding: '1rem', 
                        background: 'var(--bg-dark)', 
                        borderRadius: '16px', 
                        marginBottom: '1.5rem',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <Upload size={14} color="var(--text-muted)" />
                            <span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-muted)' }}>PREVIEW</span>
                        </div>
                        <div style={{ 
                            padding: '0.75rem', 
                            background: 'var(--bg-card)', 
                            borderRadius: '12px',
                            borderLeft: form.is_urgent ? `3px solid var(--danger)` : `3px solid ${getRecipientColor(form.recipient_role)}`
                        }}>
                            <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {form.title || '[Title]'}
                                {form.is_urgent && <span className="badge danger" style={{ fontSize: '0.6rem' }}>URGENT</span>}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', lineHeight: '1.4' }}>
                                {form.message || '[Your message will appear here]'}
                            </div>
                            <div style={{ 
                                fontSize: '0.65rem', 
                                color: 'var(--text-muted)', 
                                marginTop: '0.5rem',
                                paddingTop: '0.5rem',
                                borderTop: '1px solid var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                {getRecipientIcon(form.recipient_role)}
                                <span>To: {getRecipientLabel()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button 
                            type="button" 
                            className="btn btn-secondary" 
                            onClick={onClose} 
                            style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', fontWeight: '600' }}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="btn" 
                            disabled={sending} 
                            style={{ 
                                flex: 1, 
                                padding: '0.8rem', 
                                borderRadius: '12px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: '0.5rem',
                                fontWeight: '600'
                            }}
                        >
                            <Send size={16} />
                            {sending ? 'Sending...' : 'Send Notification'}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
};

export default SendNotificationModal;