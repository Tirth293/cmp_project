import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Shield, Save, Trash2, Edit2, X, AlertTriangle, Lock, Image, Link as LinkIcon, Upload, Briefcase, Download, Building2, Calendar, UserCircle, Key, Globe, Camera, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotify } from '../context/NotificationContext';
import { apiFetch } from '../utils/api';

const ProfilePage = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    profile_pic: '',
    department: '',
    reporting_to: '',
    branch: ''
  });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [showPassForm, setShowPassForm] = useState(false);
  const [avatarHover, setAvatarHover] = useState(false);
  const { showNotification } = useNotify();

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role || '',
        profile_pic: user.profile_pic || '',
        department: user.department || '',
        reporting_to: user.reporting_to || '',
        branch: user.branch || ''
      });
    }
  }, [user]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedUser = await apiFetch(`/api/users/update-profile`, {
        method: 'PUT',
        body: JSON.stringify({ userId: user.id, ...formData }),
      });
      
      updateUser(updatedUser);
      showNotification('Profile updated successfully!', 'success');
      setIsEditing(false);
    } catch (err) {
      showNotification(err.message || 'Server connection error', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      return showNotification('New passwords do not match', 'error');
    }
    if (passwords.new.length < 6) {
      return showNotification('Password must be at least 6 characters', 'error');
    }
    try {
      await apiFetch('/api/users/change-password', {
        method: 'POST',
        body: JSON.stringify({ 
          userId: user.id, 
          currentPassword: passwords.current, 
          newPassword: passwords.new 
        }),
      });
      
      showNotification('Password changed successfully!', 'success');
      setPasswords({ current: '', new: '', confirm: '' });
      setShowPassForm(false);
    } catch (err) {
      showNotification(err.message || 'Server error changing password', 'error');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) { 
        showNotification('Image is extremely large. Please use a file under 20MB.', 'error');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_DIM = 500;

          if (width > height) {
            if (width > MAX_DIM) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setFormData({ ...formData, profile_pic: dataUrl });
          showNotification('Image optimized! Click "Save Profile Changes" to store it.', 'success');
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete your profile? This action is permanent.')) {
      try {
        const response = await fetch(`https://cmp-project.onrender.com/api/users/${user.id}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          logout();
          navigate('/login');
        }
      } catch (err) {
        showNotification('Failed to delete profile', 'error');
      }
    }
  };

  const getRoleStyle = (role) => {
    const styles = {
      admin: { bg: '#ef4444', light: 'rgba(239, 68, 68, 0.1)' },
      hr: { bg: '#8b5cf6', light: 'rgba(139, 92, 246, 0.1)' },
      employee: { bg: '#10b981', light: 'rgba(16, 185, 129, 0.1)' }
    };
    return styles[role] || styles.employee;
  };

  const roleStyle = getRoleStyle(user?.role);
  const joinDate = user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) : 'Not available';

  if (!user) return (
    <div className="page-header">
      <h1>Access Denied</h1>
      <p>Please log in to view your profile.</p>
    </div>
  );

  return (
    <div>
      {/* Page Header with Edit Button */}
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p>Manage your account settings and personal information</p>
        </div>
        {!isEditing ? (
          <button className="btn" onClick={() => setIsEditing(true)}>
            <Edit2 size={18} /> Edit Profile
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn" onClick={handleUpdate} disabled={isSaving}>
              <Save size={18} /> {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>
              <X size={18} /> Cancel
            </button>
          </div>
        )}
      </div>

      {/* Profile Overview Card */}
      <div className="card" style={{ 
        marginBottom: '2rem', 
        background: `linear-gradient(135deg, var(--bg-card) 0%, var(--bg-dark) 100%)`,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          right: 0, 
          width: '300px', 
          height: '300px', 
          background: `radial-gradient(circle, ${roleStyle.light} 0%, transparent 70%)`,
          borderRadius: '50%',
          transform: 'translate(100px, -100px)'
        }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          {/* Avatar */}
          <div 
            style={{ position: 'relative' }}
            onMouseEnter={() => setAvatarHover(true)}
            onMouseLeave={() => setAvatarHover(false)}
          >
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${roleStyle.bg}, ${roleStyle.bg}cc)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
              transition: 'transform 0.3s ease'
            }}>
              {formData.profile_pic ? (
                <img 
                  src={formData.profile_pic} 
                  alt={user.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  onError={(e) => e.target.src = 'https://ui-avatars.com/api/?name=' + user.name}
                />
              ) : (
                <User size={40} color="white" />
              )}
            </div>
            {isEditing && avatarHover && (
              <label style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                background: 'var(--primary)',
                borderRadius: '50%',
                padding: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}>
                <Camera size={14} color="white" />
                <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
              </label>
            )}
          </div>

          {/* User Info */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>{user.name}</h2>
              <span style={{
                background: roleStyle.light,
                color: roleStyle.bg,
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.7rem',
                fontWeight: '700',
                textTransform: 'uppercase'
              }}>
                {user.role === 'admin' ? 'Administrator' : user.role === 'hr' ? 'HR Manager' : 'Employee'}
              </span>
            </div>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <Mail size={14} />
                  <span>{user.email}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <Calendar size={14} />
                  <span>Joined {joinDate}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <Building2 size={14} />
                  <span>{formData.department || 'Not specified'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <MapPin size={14} />
                  <span>{formData.branch || 'No branch'}</span>
                </div>
              </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '2rem',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '0.5rem'
      }}>
        {[
          { id: 'profile', label: 'Profile Settings', icon: UserCircle },
          { id: 'security', label: 'Security', icon: Shield },
          { id: 'danger', label: 'Danger Zone', icon: AlertTriangle }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.6rem 1.25rem',
              background: activeTab === tab.id ? 'var(--primary-light)' : 'transparent',
              border: 'none',
              borderRadius: '10px',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Settings Tab */}
      {activeTab === 'profile' && (
        <div className="card">
          <form>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
              <div className="form-group">
                <label>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    style={{ paddingLeft: '2.5rem', opacity: isEditing ? 1 : 0.7 }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                  <input
                    type="email"
                    disabled={!isEditing}
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    style={{ paddingLeft: '2.5rem', opacity: isEditing ? 1 : 0.7 }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Department</label>
                <div style={{ position: 'relative' }}>
                  <Briefcase style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    style={{ paddingLeft: '2.5rem', opacity: isEditing ? 1 : 0.7 }}
                    placeholder="e.g., Sales, Engineering"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Reporting To</label>
                <div style={{ position: 'relative' }}>
                  <User style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.reporting_to}
                    onChange={(e) => setFormData({...formData, reporting_to: e.target.value})}
                    style={{ paddingLeft: '2.5rem', opacity: isEditing ? 1 : 0.7 }}
                    placeholder="Manager name"
                  />
                </div>
              </div>

              {user?.role === 'admin' && (
                <div className="form-group">
                  <label>Account Role</label>
                  <div style={{ position: 'relative' }}>
                    <Shield style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                    <select
                      disabled={!isEditing}
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      style={{ paddingLeft: '2.5rem', opacity: (isEditing && user.role === 'admin') ? 1 : 0.7 }}
                    >
                      <option value="employee">Employee</option>
                      <option value="hr">HR Manager</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Branch / Office Location</label>
                <div style={{ position: 'relative' }}>
                  <MapPin style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.branch}
                    onChange={(e) => setFormData({...formData, branch: e.target.value})}
                    style={{ paddingLeft: '2.5rem', opacity: isEditing ? 1 : 0.7 }}
                    placeholder="e.g., Ashram Road, Satellite, Prahlad Nagar"
                  />
                </div>
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Profile Picture</label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <LinkIcon style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                    <input
                      type="text"
                      disabled={!isEditing}
                      placeholder="Enter image URL..."
                      value={formData.profile_pic}
                      onChange={(e) => setFormData({...formData, profile_pic: e.target.value})}
                      style={{ paddingLeft: '2.5rem', opacity: isEditing ? 1 : 0.7 }}
                    />
                  </div>
                  {isEditing && (
                    <label className="btn btn-secondary" style={{ padding: '0.7rem 1rem', margin: 0, cursor: 'pointer' }}>
                      <Upload size={16} /> Upload
                      <input type="file" hidden accept="image/*" onChange={handleFileUpload} />
                    </label>
                  )}
                </div>
                {formData.profile_pic && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                    <a 
                      href={formData.profile_pic} 
                      download="profile_pic.png"
                      className="btn-secondary"
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.7rem', textDecoration: 'none' }}
                    >
                      <Download size={12} /> Download
                    </a>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, profile_pic: ''})}
                      className="btn-secondary"
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.7rem', color: 'var(--danger)' }}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Edit mode action buttons removed from here - they are now in the header */}
          </form>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="card">
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Lock size={18} /> Password Management
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Choose a strong password with at least 6 characters
            </p>
          </div>

          {!showPassForm ? (
            <button className="btn" onClick={() => setShowPassForm(true)}>
              <Key size={16} /> Change Password
            </button>
          ) : (
            <form onSubmit={handlePasswordChange} style={{ maxWidth: '450px' }}>
              <div className="form-group">
                <label>Current Password</label>
                <input 
                  type="password" 
                  required 
                  value={passwords.current}
                  onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                  placeholder="Enter your current password"
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input 
                  type="password" 
                  required 
                  value={passwords.new}
                  onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input 
                  type="password" 
                  required 
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                  placeholder="Re-enter your new password"
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn">Update Password</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPassForm(false)}>Cancel</button>
              </div>
            </form>
          )}

          {/* Session Info */}
          <div style={{ 
            marginTop: '2rem', 
            paddingTop: '1.5rem', 
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h4 style={{ marginBottom: '0.25rem', fontSize: '0.9rem' }}>Active Sessions</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                You are currently logged in on this device
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe size={14} style={{ color: 'var(--success)' }} />
              <span style={{ fontSize: '0.75rem' }}>Current session active</span>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone Tab */}
      {activeTab === 'danger' && (
        <div className="card" style={{ border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '20px',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, color: 'var(--danger)', fontSize: '1.1rem' }}>Delete Account</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0.25rem 0 0' }}>
                Permanently remove your account and all associated data
              </p>
            </div>
          </div>

          <div style={{ 
            background: 'rgba(239, 68, 68, 0.05)', 
            padding: '0.75rem', 
            borderRadius: '10px',
            marginBottom: '1.25rem'
          }}>
            <p style={{ fontSize: '0.75rem', margin: 0 }}>
              <strong>Warning:</strong> This action cannot be undone. Deleting your account will:
            </p>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <li>Remove all your personal information</li>
              <li>Delete your performance metrics and ratings</li>
              <li>Revoke access to all system features</li>
              <li>Remove you from all teams and tasks</li>
            </ul>
          </div>

          <button 
            onClick={handleDelete}
            className="btn"
            style={{ 
              background: 'var(--danger)',
              borderColor: 'var(--danger)',
              fontSize: '0.85rem'
            }}
          >
            <Trash2 size={16} /> I understand, delete my account
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
