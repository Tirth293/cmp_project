import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon,
  CalendarDays,
  TrendingUp,
  Clock
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import logo from '../pages/Transparent logo.png';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ✅ Role checks
  const isEmployee = user?.role === 'employee';
  const isTL = user?.role === 'tl';
  const isAdminOrHR = user?.role === 'admin' || user?.role === 'hr';
  const isAdmin = user?.role === 'admin';

  return (
    <>
      {/* MOBILE BUTTON */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'var(--primary)',
          color: 'white',
          border: 'none',
          zIndex: 1001,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
        }}
      >
        <LayoutDashboard size={24} />
      </button>

      {/* OVERLAY */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 999
          }}
        />
      )}

      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>

        {/* LOGO AND NAME */}
        <div
          style={{
            padding: '1.4rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.5rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background:
              'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))'
          }}
        >
          {/* LOGO */}
          <div
            style={{
              width: '58px',
              height: '58px',
              minWidth: '58px',
              borderRadius: '16px',
              background:
                'linear-gradient(135deg, rgba(59,130,246,0.20), rgba(139,92,246,0.20))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              boxShadow: '0 4px 14px rgba(59,130,246,0.25)'
            }}
          >
            <img
              src={logo}
              alt="Lead Magnets Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
          </div>

          {/* COMPANY NAME */}
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '1.45rem',
                fontWeight: '900',
                letterSpacing: '1px',
                lineHeight: '1.1',
                textTransform: 'uppercase',
                background:
                  'linear-gradient(135deg, #60a5fa 0%, #818cf8 50%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              LEAD MAGNETS
            </h1>

            <div
              style={{
                marginTop: '4px',
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.65)',
                letterSpacing: '2px',
                fontWeight: '700'
              }}
            >
              
            </div>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.25rem', 
          padding: '0 1rem' 
        }}>

          {/* EMPLOYEE */}
          {isEmployee && (
            <>
              <div className="nav-section-label">Employee Portal</div>

              <NavLink
                to="/employee"
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                <LayoutDashboard size={20} />
                My Dashboard
              </NavLink>

              
            </>
          )}



          {/* ADMIN / HR */}
          {isAdminOrHR && (
            <>
              <div className="nav-section-label">
                Administration
              </div>

              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                <LayoutDashboard size={20} />
                Admin Console
              </NavLink>

              <NavLink
                to="/leaves"
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                <CalendarDays size={20} />
                Leave Requests
              </NavLink>

              <NavLink
                to="/attendance"
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                <Users size={20} />
                Attendance Logs
              </NavLink>

              {isAdmin && (
                <NavLink
                  to="/settings"
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link"
                  }
                >
                  <SettingsIcon size={20} />
                  System Settings
                </NavLink>
              )}
            </>
          )}

          {/* ACCOUNT */}
          <div style={{ 
            marginTop: '1rem',
            borderTop: '1px solid var(--border)',
            paddingTop: '1rem'
          }} />

          <div className="nav-section-label">
            Account
          </div>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            <UserIcon size={20} />
            Profile Settings
          </NavLink>

          {/* LOGOUT */}
          <button
            onClick={handleLogout}
            className="nav-link"
            style={{
              color: '#ef4444',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.7rem 1rem',
              borderRadius: '10px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                'rgba(239, 68, 68, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor =
                'transparent';
            }}
          >
            <LogOut size={20} />
            Sign Out
          </button>

        </nav>

        {/* FOOTER */}
        <div style={{
          position: 'absolute',
          bottom: '1rem',
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: '0.6rem',
          color: 'var(--text-muted)'
        }}>
          © 2026 Lead Magnets
        </div>

      </aside>
    </>
  );
};

export default Sidebar;