import React from 'react';
import { Moon, Sun, Cloud, User, X, Users as TeamIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationCenter from './NotificationCenter'; // ✅ ADD THIS IMPORT
import API_BASE_URL from '../utils/api';

const Header = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [time, setTime] = React.useState(new Date());
  const [serverStatus, setServerStatus] = React.useState('checking');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);

    const checkServer = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/health`);
        if (res.ok) setServerStatus('connected');
        else setServerStatus('error');
      } catch {
        setServerStatus('disconnected');
      }
    };

    checkServer();
    const serverInterval = setInterval(checkServer, 10000);

    return () => {
      clearInterval(timer);
      clearInterval(serverInterval);
    };
  }, []);

  const getRoleName = (role) => {
    const roles = {
      admin: 'Admin',
      hr: 'HR Manager',
      employee: 'Employee',
    };
    return roles[role] || role;
  };

  if (!user) return null;

  return (
    <header className="main-header">

      {/* Mobile Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 1001,
          width: '55px',
          height: '55px',
          borderRadius: '50%',
          backgroundColor: 'var(--primary)',
          color: 'white',
          border: 'none',
          boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
          display: window.innerWidth < 768 ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isMobileMenuOpen ? <X size={26} /> : <TeamIcon size={26} />}
      </button>

      {/* LEFT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

        {/* Role Title */}
        <div style={{
          fontWeight: '700',
          fontSize: '1.1rem',
          color: 'var(--text-main)',
        }}>
          {getRoleName(user.role)} Dashboard
        </div>

        {/* Time */}
        <div style={{
          fontWeight: '600',
          fontSize: '0.85rem',
          background: 'var(--bg-dark)',
          padding: '0.4rem 0.75rem',
          borderRadius: '6px',
          border: '1px solid var(--border)',
          color: 'var(--text-main)'
        }}>
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>

        {/* Server Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.4rem 0.75rem',
          borderRadius: '6px',
          background: 'var(--bg-dark)',
          border: '1px solid var(--border)',
          fontSize: '0.7rem',
          fontWeight: '600',
          color: serverStatus === 'connected'
            ? 'var(--success)'
            : 'var(--danger)',
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: serverStatus === 'connected'
              ? 'var(--success)'
              : 'var(--danger)',
          }}></div>
          {serverStatus === 'connected' ? 'ONLINE' : 'OFFLINE'}
        </div>
      </div>

      {/* RIGHT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title="Toggle Theme"
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'var(--bg-dark)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            color: 'var(--text-main)'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--primary)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-dark)'}
        >
          {theme === 'dark' ? (
            <Sun size={18} />
          ) : theme === 'dim' ? (
            <Cloud size={18} />
          ) : (
            <Moon size={18} />
          )}
        </button>

        {/* ✅ REPLACE old notifications with NotificationCenter */}
        <NotificationCenter />

        {/* Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>
              {user.name}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {getRoleName(user.role)}
            </div>
          </div>

          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            overflow: 'hidden',
            background: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {user.profile_pic ? (
              <img
                src={user.profile_pic}
                alt="profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <User size={18} color="white" />
            )}
          </div>
        </div>

      </div>
    </header>
  );
};

export default Header;