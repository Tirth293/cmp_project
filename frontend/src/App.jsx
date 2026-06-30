import EmployeeSidebar from './components/EmployeeSidebar';
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import BiMonthlyReport from './pages/BiMonthlyReport';
import EmployeePerformance from './pages/EmployeePerformance';
import LeaveManagement from './pages/LeaveManagement';
import AttendanceManagement from './pages/AttendanceManagement';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SearchProvider } from './context/SearchContext';
import { NotificationProvider } from './context/NotificationContext';
import Header from './components/Header';
import HRChatbot from './components/HRChatbot';
import Welcome from './pages/Welcome';  // ✅ ADD THIS IMPORT
import PostLoginWelcome from './pages/PostLoginWelcome';  // ✅ ADD THIS IMPORT
import './index.css';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If user role is not allowed for this route, redirect to their default dashboard
    if (user.role === 'admin' || user.role === 'hr') return <Navigate to="/admin" replace />;
    return <Navigate to="/employee" replace />;
  }

  return children;
};

function AppContent() {
  const { user } = useAuth();

  return (
    <div className="layout-wrapper">
      {user && <Header />}
      <div className="app-container">
        {user && <Sidebar />}
        <main className={user ? "main-content" : "full-content"}>
        <Routes>
          {/* ✅ ADD WELCOME ROUTE AT THE TOP */}
          <Route path="/" element={<Welcome />} />
          
          {/* ✅ ADD POST-LOGIN WELCOME ROUTE */}
          <Route path="/welcome-user" element={<PostLoginWelcome />} />
          
          <Route
            path="/login"
            element={
              user ? (
                user.role === 'admin' || user.role === 'hr'
                  ? <Navigate to="/admin" replace />
                  : <Navigate to="/employee" replace />
              ) : (
                <LoginPage />
              )
            }
          />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* REMOVE OR COMMENT OUT THE OLD "/" ROUTE SINCE WE HAVE THE WELCOME PAGE NOW */}
          {/* 
          <Route
            path="/"
            element={
              user ? (
                user.role === 'admin' || user.role === 'hr'
                  ? <Navigate to="/admin" replace />
                  : <Navigate to="/employee" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          */}
          
          <Route 
            path="/admin" 
            element={<ProtectedRoute allowedRoles={['admin', 'hr']}><AdminDashboard /></ProtectedRoute>} 
          />

          <Route 
            path="/employee" 
            element={<ProtectedRoute allowedRoles={['admin', 'hr', 'employee']}><EmployeeDashboard /></ProtectedRoute>} 
          />
          <Route 
            path="/employee/performance" 
            element={<ProtectedRoute allowedRoles={['admin', 'hr', 'employee']}><EmployeePerformance /></ProtectedRoute>} 
          />
          <Route 
            path="/profile" 
            element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} 
          />
          <Route 
            path="/reports" 
            element={<ProtectedRoute allowedRoles={['admin', 'hr']}><ReportsPage /></ProtectedRoute>} 
          />
          <Route 
            path="/settings" 
            element={<ProtectedRoute allowedRoles={['admin']}><SettingsPage /></ProtectedRoute>} 
          />
          <Route 
            path="/reports/bi-monthly" 
            element={<ProtectedRoute allowedRoles={['admin', 'hr']}><BiMonthlyReport /></ProtectedRoute>} 
          />
          <Route 
            path="/leaves" 
            element={<ProtectedRoute allowedRoles={['admin', 'hr']}><LeaveManagement /></ProtectedRoute>} 
          />
          <Route 
            path="/attendance" 
            element={<ProtectedRoute allowedRoles={['admin', 'hr']}><AttendanceManagement /></ProtectedRoute>} 
          />
          {/* You have a duplicate /employee route - consider removing this one */}
          {/* 
          <Route path="/employee" element={
            <div style={{ display: 'flex' }}>
              <EmployeeSidebar />
              <div style={{ flex: 1, marginLeft: '280px', padding: '2rem' }}>
                <EmployeeDashboard />
              </div>
            </div>
          } />
          */}
        </Routes>
      </main>
    </div>
    {user && <HRChatbot />}
  </div>
);
}

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <SearchProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </AuthProvider>
        </SearchProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;