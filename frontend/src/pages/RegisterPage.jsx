import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Shield, Eye, EyeOff, MapPin } from 'lucide-react';
import logo from './Transparent logo.png';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    department: 'Sales',
    reporting_to: 'Team Leader',
    branch: ''  // Text box for branch/location
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('https://cmp-project.onrender.com/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Could not connect to server');
    }
  };

  return (
    <div className="full-content auth-page" style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      minHeight: '100vh',
      padding: 'clamp(1rem, 2.5vh, 2rem)',
      overflowY: 'auto'
    }}>
      <div className="card auth-card register-card" style={{ 
        width: '100%', 
        maxWidth: 'min(820px, 96vw)', 
        padding: 'clamp(1.25rem, 2.5vh, 2rem)',
        borderRadius: '18px'
      }}>
        
        {/* Company Logo Section with Animation */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(0.9rem, 2vh, 1.25rem)' }}>
          {/* Animated Circular Logo Container */}
          <div style={{
            width: 'clamp(72px, 11vh, 96px)',
            height: 'clamp(72px, 11vh, 96px)',
            margin: '0 auto 0.75rem',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'float 3s ease-in-out infinite'
          }}>
            {/* Pulsing Ring Animation */}
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              opacity: 0.1,
              animation: 'pulse 2s ease-in-out infinite'
            }} />
            
            <div style={{
              width: '78%',
              height: '78%',
              borderRadius: '50%',
              background: 'var(--bg-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #10b981',
              overflow: 'hidden'
            }}>
              <img 
                src={logo} 
                alt="Lead Magnets Logo" 
                style={{ 
                  width: '70%', 
                  height: '70%', 
                  objectFit: 'contain'
                }} 
              />
            </div>
          </div>
          
          <h2 style={{ 
            fontSize: 'clamp(1.25rem, 2.7vh, 1.5rem)', 
            fontWeight: '800', 
            margin: '0',
            color: 'white',
            letterSpacing: '-0.02em'
          }}>
            LEAD MAGNETS
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Join the performance appraisal system</p>
        </div>

        {error && (
          <div style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid var(--danger)', 
            color: 'var(--danger)', 
            padding: '0.75rem', 
            borderRadius: '12px', 
            marginBottom: '1.25rem',
            fontSize: '0.8rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ 
            backgroundColor: 'rgba(16, 185, 129, 0.1)', 
            border: '1px solid var(--success)', 
            color: 'var(--success)', 
            padding: '0.75rem', 
            borderRadius: '12px', 
            marginBottom: '1.25rem',
            fontSize: '0.8rem',
            textAlign: 'center'
          }}>
            Registration successful! Redirecting to login...
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="register-form-grid">
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', marginBottom: '0.4rem' }}>Full Name</label>
            <div style={{ position: 'relative' }}>
              <div style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'var(--text-muted)',
                pointerEvents: 'none',
                zIndex: 1
              }}>
                <User size={16} />
              </div>
              <input
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                style={{ paddingLeft: '2.5rem', paddingTop: '0.7rem', paddingBottom: '0.7rem', fontSize: '0.9rem' }}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', marginBottom: '0.4rem' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <div style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'var(--text-muted)',
                pointerEvents: 'none',
                zIndex: 1
              }}>
                <Mail size={16} />
              </div>
              <input
                type="email"
                placeholder="name@company.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                style={{ paddingLeft: '2.5rem', paddingTop: '0.7rem', paddingBottom: '0.7rem', fontSize: '0.9rem' }}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', marginBottom: '0.4rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <div style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'var(--text-muted)',
                pointerEvents: 'none',
                zIndex: 1
              }}>
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem', paddingTop: '0.7rem', paddingBottom: '0.7rem', fontSize: '0.9rem' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                  zIndex: 1
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Branch/Location - Dropdown */}
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', marginBottom: '0.4rem' }}>Branch / Location *</label>
            <select
              value={formData.branch}
              onChange={(e) => setFormData({...formData, branch: e.target.value})}
              required
              style={{
                width: '100%',
                padding: '0.7rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'white',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              <option value="">Select a branch</option>
              <option value="Ashram Road">Ashram Road</option>
              <option value="Maninagar">Maninagar</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', marginBottom: '0.4rem' }}>Role</label>
            <div style={{ position: 'relative' }}>
              <div style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'var(--text-muted)',
                pointerEvents: 'none',
                zIndex: 1
              }}>
                <Shield size={16} />
              </div>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                style={{ paddingLeft: '2.5rem', paddingTop: '0.7rem', paddingBottom: '0.7rem', fontSize: '0.9rem' }}
              >
                <option value="employee">Employee</option>
                <option value="hr">HR</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', marginBottom: '0.4rem' }}>Department</label>
            <input
              type="text"
              placeholder="e.g. Sales, Tech, Marketing"
              value={formData.department}
              onChange={(e) => setFormData({...formData, department: e.target.value})}
              style={{ paddingTop: '0.7rem', paddingBottom: '0.7rem', fontSize: '0.9rem' }}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: '0.8rem', marginBottom: '0.4rem' }}>Reporting To</label>
            <input
              type="text"
              placeholder="Manager Name"
              value={formData.reporting_to}
              onChange={(e) => setFormData({...formData, reporting_to: e.target.value})}
              style={{ paddingTop: '0.7rem', paddingBottom: '0.7rem', fontSize: '0.9rem' }}
              required
            />
          </div>
          </div>

          <button type="submit" className="btn" style={{ width: '100%', padding: '0.85rem', backgroundColor: 'var(--success)', fontSize: '0.9rem' }}>
            Register Account
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>Sign In</Link>
        </p>
    </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.1; }
          50% { transform: scale(1.2); opacity: 0.2; }
        }
      `}</style>
    </div>
  );
};

export default RegisterPage;
