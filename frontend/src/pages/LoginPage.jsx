import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import logo from './Transparent logo.png';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('https://cmp-project.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        login(data.user, data.token);
        // ✅ CHANGED: Now redirects to welcome screen instead of direct dashboard
        navigate('/welcome-user');
      } else {
        setError(data.error || 'Login failed');
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
      <div className="card auth-card login-card" style={{
        width: '100%',
        maxWidth: 'min(440px, 94vw)',
        padding: 'clamp(1.4rem, 3vh, 2.25rem)',
        borderRadius: '18px'
      }}>
        
        {/* Company Logo Section with Animation */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(1rem, 2.5vh, 1.6rem)' }}>
          {/* Animated Circular Logo Container */}
          <div style={{
            width: 'clamp(86px, 13vh, 118px)',
            height: 'clamp(86px, 13vh, 118px)',
            margin: '0 auto clamp(0.7rem, 1.8vh, 1rem)',
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
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              opacity: 0.15,
              animation: 'pulse 2s ease-in-out infinite'
            }} />
            
            {/* Rotating Border */}
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'conic-gradient(from 0deg, #3b82f6, #8b5cf6, #3b82f6)',
              padding: '3px',
              animation: 'rotate 3s linear infinite'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {/* Logo Image */}
                <div style={{
                  width: '78%',
                  height: '78%',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  overflow: 'hidden'
                }}>
                  <img 
                    src={logo} 
                    alt="Lead Magnets Logo" 
                    style={{ 
                      width: '80%', 
                      height: '80%', 
                      objectFit: 'contain'
                    }} 
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Company Name with Animation */}
          <h1 style={{ 
            fontSize: 'clamp(1.35rem, 3vh, 1.7rem)', 
            fontWeight: '800', 
            margin: '1rem 0 0',
            background: 'linear-gradient(135deg, #fff 0%, #3b82f6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em',
            animation: 'fadeInUp 0.8s ease-out'
          }}>
            LEAD MAGNETS
          </h1>
          <p style={{ 
            color: '#60a5fa', 
            fontSize: '0.8rem', 
            fontWeight: '600',
            letterSpacing: '0.1em',
            marginTop: '0.25rem',
            animation: 'fadeInUp 0.8s ease-out 0.1s backwards'
          }}>
            EMPLOYEE PERFORMANCE PORTAL
          </p>
        </div>

        {/* Welcome Text with Animation */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(1rem, 2.5vh, 1.5rem)', animation: 'fadeIn 0.6s ease-out' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white', marginBottom: '0.5rem' }}>
            Welcome Back
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Sign in to your performance portal
          </p>
        </div>

        {error && (
          <div style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid var(--danger)', 
            color: 'var(--danger)', 
            padding: '0.875rem', 
            borderRadius: '12px', 
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            textAlign: 'center',
            animation: 'shake 0.5s ease-out'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1rem', animation: 'fadeInUp 0.6s ease-out 0.2s backwards' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ 
                position: 'absolute', 
                left: '14px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'var(--text-muted)',
                pointerEvents: 'none',
                zIndex: 1
              }}>
                <Mail size={18} />
              </div>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '2.75rem' }}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem', animation: 'fadeInUp 0.6s ease-out 0.3s backwards' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ 
                position: 'absolute', 
                left: '14px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'var(--text-muted)',
                pointerEvents: 'none',
                zIndex: 1
              }}>
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
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
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn" 
            style={{ 
              width: '100%', 
              padding: '0.875rem', 
              fontSize: '1rem',
              animation: 'fadeInUp 0.6s ease-out 0.4s backwards',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(59, 130, 246, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            Sign In to Dashboard
          </button>
        </form>

        <p style={{ 
          textAlign: 'center', 
          marginTop: 'clamp(1rem, 2.5vh, 1.5rem)', 
          color: 'var(--text-muted)', 
          fontSize: '0.875rem',
          animation: 'fadeIn 0.6s ease-out 0.5s backwards'
        }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>
            Create one
          </Link>
        </p>

        {/* Footer Text */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: 'clamp(1rem, 2.5vh, 1.5rem)', 
          paddingTop: '1rem', 
          borderTop: '1px solid var(--border)',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          animation: 'fadeIn 0.6s ease-out 0.6s backwards'
        }}>
          <p>© 2026 LEAD MAGNETS. All rights reserved.</p>
          <p style={{ marginTop: '0.25rem' }}>Employee Performance Management System</p>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.15;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.25;
          }
        }
        
      
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-10px);
          }
          75% {
            transform: translateX(10px);
          }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
