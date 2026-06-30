// components/EmployeeSidebar.jsx

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  ListChecks,
  CalendarDays,
  User,
  LogOut,
  Settings,
  Bell,
  HelpCircle,
  Award,
  TrendingUp,
  Clock,
  FileText,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../pages/Transparent logo.png';

const EmployeeSidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Navigation items for Employee
  const navItems = [
    { 
      path: '/employee', 
      label: 'My Dashboard', 
      icon: LayoutDashboard,
      description: 'Performance overview'
    },
    { 
      path: '/employee/mywork', 
      label: 'My Work', 
      icon: Briefcase,
      description: 'Submit performance data'
    },
    { 
      path: '/employee/tasks', 
      label: 'My Tasks', 
      icon: ListChecks,
      description: 'Task management',
      badge: null
    },
    { 
      path: '/employee/attendance', 
      label: 'Attendance', 
      icon: CalendarDays,
      description: 'Track attendance & leaves'
    },
    { 
      path: '/employee/performance', 
      label: 'Performance', 
      icon: TrendingUp,
      description: 'View your metrics'
    },
    { 
      path: '/employee/profile', 
      label: 'Profile', 
      icon: User,
      description: 'Personal information'
    }
  ];

  // Quick stats for sidebar (optional)
  const [pendingTasks, setPendingTasks] = React.useState(0);
  
  React.useEffect(() => {
    // Fetch pending tasks count
    const fetchPendingTasks = async () => {
      try {
        const response = await fetch(`/api/tasks/employee/${user?.id}`);
        const tasks = await response.json();
        const pending = tasks.filter(t => t.status !== 'Completed').length;
        setPendingTasks(pending);
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
      }
    };
    
    if (user?.id) {
      fetchPendingTasks();
    }
  }, [user]);

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="mobile-toggle"
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
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          transition: 'transform 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <LayoutDashboard size={24} />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 999,
            backdropFilter: 'blur(2px)'
          }}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`} style={{
        width: '280px',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        backgroundColor: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        transition: 'transform 0.3s ease',
        boxShadow: 'var(--shadow-md)'
      }}>
        
        {/* Logo Section */}
        <div style={{ 
          padding: '1.5rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img 
              src={logo} 
              alt="Lead Magnets" 
              style={{ height: '40px', width: 'auto' }} 
            />
            <div>
              <h2 style={{
                fontSize: '1rem',
                fontWeight: '800',
                margin: 0,
                background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                LEAD MAGNETS
              </h2>
              <p style={{
                fontSize: '0.6rem',
                color: 'var(--text-muted)',
                margin: 0,
                letterSpacing: '0.5px'
              }}>
                Employee Portal
              </p>
            </div>
          </div>
        </div>

        {/* User Profile Section */}
        <div style={{
          padding: '0 1rem 1rem 1rem',
          marginBottom: '1rem',
          borderBottom: '1px solid var(--border)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            borderRadius: '12px',
            background: 'var(--bg-dark)',
            border: '1px solid var(--border)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
              fontSize: '1.2rem',
              color: 'white'
            }}>
              {user?.name?.charAt(0) || 'E'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontWeight: '600', 
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {user?.name || 'Employee'}
              </div>
              <div style={{ 
                fontSize: '0.7rem', 
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--success)'
                }} />
                {user?.role === 'employee' ? 'Employee' : user?.role}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.25rem',
          padding: '0 0.75rem'
        }}>
          {/* Dashboard Header */}
          <div style={{
            padding: '0.5rem 0.75rem',
            fontSize: '0.7rem',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: 'var(--text-muted)'
          }}>
            MAIN MENU
          </div>

          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                isActive ? "nav-link active" : "nav-link"
              }
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.7rem 1rem',
                borderRadius: '10px',
                textDecoration: 'none',
                color: isActive ? 'var(--primary)' : 'var(--text-main)',
                backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                transition: 'all 0.2s',
                position: 'relative'
              })}
              onClick={() => setIsMobileOpen(false)}
            >
              <item.icon size={20} />
              <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500 }}>
                {item.label}
              </span>
              {item.badge && (
                <span className="badge" style={{
                  fontSize: '0.65rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '20px',
                  backgroundColor: 'var(--danger)',
                  color: 'white'
                }}>
                  {item.badge}
                </span>
              )}
              {item.label === 'My Tasks' && pendingTasks > 0 && (
                <span style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--danger)',
                  color: 'white',
                  fontSize: '0.6rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {pendingTasks}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section */}
        <div style={{
          padding: '1rem',
          borderTop: '1px solid var(--border)',
          marginTop: 'auto'
        }}>
          {/* Quick Stats */}
          <div style={{
            padding: '0.75rem',
            borderRadius: '10px',
            background: 'var(--bg-dark)',
            marginBottom: '1rem'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Performance Score</span>
              <Award size={14} color="var(--primary)" />
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>--%</div>
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: 'var(--border)',
              borderRadius: '2px',
              marginTop: '0.5rem',
              overflow: 'hidden'
            }}>
              <div style={{
                width: '0%',
                height: '100%',
                backgroundColor: 'var(--primary)',
                borderRadius: '2px'
              }} />
            </div>
          </div>

          {/* Help & Support */}
          <NavLink
            to="/employee/support"
            className="nav-link"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.6rem 0.75rem',
              borderRadius: '10px',
              textDecoration: 'none',
              color: 'var(--text-muted)',
              marginBottom: '0.5rem'
            }}
          >
            <HelpCircle size={18} />
            <span style={{ fontSize: '0.85rem' }}>Help & Support</span>
          </NavLink>

          <NavLink
            to="/employee/settings"
            className="nav-link"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.6rem 0.75rem',
              borderRadius: '10px',
              textDecoration: 'none',
              color: 'var(--text-muted)',
              marginBottom: '0.5rem'
            }}
          >
            <Settings size={18} />
            <span style={{ fontSize: '0.85rem' }}>Settings</span>
          </NavLink>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              width: '100%',
              padding: '0.6rem 0.75rem',
              borderRadius: '10px',
              border: 'none',
              background: 'transparent',
              color: 'var(--danger)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '0.85rem',
              marginTop: '0.5rem'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Version Info */}
        <div style={{
          padding: '0.75rem',
          textAlign: 'center',
          fontSize: '0.6rem',
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border)'
        }}>
          <p>Version 2.0.0</p>
          <p>© 2026 Lead Magnets</p>
        </div>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .sidebar {
            transform: translateX(-100%);
          }
          .sidebar.mobile-open {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
};

export default EmployeeSidebar;