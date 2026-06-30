import React, { useState, useEffect } from 'react';
import { Target, AlertTriangle, CheckCircle, Clock, ListChecks, User, Mail, Calendar, Briefcase, Download, Bot, Plus, Edit2, Trash2, X, TrendingUp, LogIn, CalendarDays, ClipboardList, XCircle, FileText, FileSpreadsheet, Save, Workflow, Database, BarChart3, Award, Calendar as CalendarIcon, Clock as ClockIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line } from 'recharts';
import { generateAppraisalPDF } from '../utils/pdfExport';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { Sparkles, Activity } from 'lucide-react';
import * as XLSX from 'xlsx';
import HourlyUpdatesForm from '../components/HourlyUpdatesForm';
import API_BASE_URL from '../utils/api';

// ─────────── Modal Backdrop ───────────
const Modal = ({ title, onClose, children }) => (
  <div style={{
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1100, padding: '1rem'
  }}>
    <div className="card" style={{ width: '100%', maxWidth: '500px', animation: 'slideUp 0.2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={22} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const { showNotification } = useNotify();
  const [activeTab, setActiveTab] = useState('performance');
  const [tasks, setTasks] = useState([]);
  const [perfMetrics, setPerfMetrics] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [leaveData, setLeaveData] = useState({ 
    approvedLeaves: 0, 
    approvedCount: 0,
    rejectedLeaves: 0, 
    rejectedCount: 0,
    pendingLeaves: 0,
    pendingCount: 0,
    hasData: false 
  });
  const [leaveHistory, setLeaveHistory] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [submittingWork, setSubmittingWork] = useState(false);
  const [monthlyUpdateReport, setMonthlyUpdateReport] = useState([]);
  
  // ✨ Work Month State
  const [workMonth, setWorkMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // Task Form State
  const [modal, setModal] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', deadline: '', priority: 'Medium' });
  
  // Date filter only
  const [filters, setFilters] = useState({
    period: 'weekly',
    date: new Date().toISOString().split('T')[0]
  });

  const formatDateValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDateRangeFromFilter = () => {
    let startDate = new Date(filters.date);
    let endDate = new Date(filters.date);

    if (filters.period === 'weekly') {
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), diff);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 4);
    } else if (filters.period === 'monthly') {
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      endDate = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
    } else {
      const quarter = Math.floor(endDate.getMonth() / 3);
      startDate = new Date(endDate.getFullYear(), quarter * 3, 1);
      endDate = new Date(endDate.getFullYear(), quarter * 3 + 3, 0);
    }

    return { start: formatDateValue(startDate), end: formatDateValue(endDate) };
  };

  const getReportPeriodLabel = () => {
    const range = getDateRangeFromFilter();
    const format = (dateString) => new Date(`${dateString}T00:00:00`).toLocaleDateString();
    if (filters.period === 'weekly') return `Weekly (${format(range.start)} - ${format(range.end)}, 5 days)`;
    if (filters.period === 'monthly') return `Monthly (${format(range.start)} - ${format(range.end)})`;
    return `Quarterly (${format(range.start)} - ${format(range.end)})`;
  };

  // Helper function to calculate number of days between two dates
  const calculateLeaveDays = (fromDate, toDate) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const days = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
    return days > 0 ? days : 1;
  };

  useEffect(() => {
    if (user?.id) {
      fetchTasks();
      fetchPerfMetrics();
      fetchRatings();
      fetchLeaveData();
      fetchAttendanceHistory();
      fetchMonthlyUpdateReport();
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      fetchMonthlyUpdateReport();
    }
  }, [user?.id, workMonth]);

  const fetchPerfMetrics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/metrics/${user.id}`);
      const data = await response.json();
      setPerfMetrics(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
    }
  };

  const fetchRatings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ratings/${user.id}`);
      const data = await response.json();
      setRatings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch ratings:", err);
    }
  };

  // ✅ UPDATED: Show both count and total days
  const fetchLeaveData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/leave/user/${user.id}`);
      const data = await response.json();
      if (data && Array.isArray(data) && data.length > 0) {
        // Approved leaves
        const approvedRequests = data.filter(l => l.final_status === 'Approved');
        const approvedDays = approvedRequests.reduce((total, leave) => 
          total + calculateLeaveDays(leave.from_date, leave.to_date), 0);
        const approvedCount = approvedRequests.length;
        
        // Rejected leaves
        const rejectedRequests = data.filter(l => l.final_status === 'Rejected');
        const rejectedDays = rejectedRequests.reduce((total, leave) => 
          total + calculateLeaveDays(leave.from_date, leave.to_date), 0);
        const rejectedCount = rejectedRequests.length;
        
        // Pending leaves
        const pendingRequests = data.filter(l => l.final_status === 'Pending');
        const pendingDays = pendingRequests.reduce((total, leave) => 
          total + calculateLeaveDays(leave.from_date, leave.to_date), 0);
        const pendingCount = pendingRequests.length;
        
        setLeaveData({ 
          approvedLeaves: approvedDays,
          approvedCount: approvedCount,
          rejectedLeaves: rejectedDays,
          rejectedCount: rejectedCount,
          pendingLeaves: pendingDays,
          pendingCount: pendingCount,
          hasData: true 
        });
        setLeaveHistory(data);
      } else {
        setLeaveData({ 
          approvedLeaves: 0, 
          approvedCount: 0,
          rejectedLeaves: 0, 
          rejectedCount: 0,
          pendingLeaves: 0,
          pendingCount: 0,
          hasData: false 
        });
        setLeaveHistory([]);
      }
    } catch (err) {
      console.error("Failed to fetch leave data:", err);
      setLeaveData({ 
        approvedLeaves: 0, 
        approvedCount: 0,
        rejectedLeaves: 0, 
        rejectedCount: 0,
        pendingLeaves: 0,
        pendingCount: 0,
        hasData: false 
      });
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/attendance/user/${user.id}`);
      const data = await response.json();
      setAttendanceHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch attendance:", err);
    }
  };

  const fetchMonthlyUpdateReport = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/metrics/monthly-from-updates/${user.id}?month=${workMonth}`);
      const data = await response.json();
      setMonthlyUpdateReport(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch monthly hourly update report:", err);
      setMonthlyUpdateReport([]);
    }
  };

  const handleClockIn = async () => {
    setIsClockingIn(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/attendance/clock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await response.json();
      if (response.ok) {
        showNotification(data.message, 'success');
        fetchAttendanceHistory();
      } else {
        showNotification(data.error || 'Clock-in failed', 'warning');
      }
    } catch (err) {
      showNotification('Server error during clock-in', 'error');
    } finally {
      setIsClockingIn(false);
    }
  };

  const [leaveForm, setLeaveForm] = useState({ from: '', to: '', reason: '' });
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/leave/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...leaveForm, userId: user.id })
      });
      if (response.ok) {
        showNotification('Leave application submitted successfully!', 'success');
        setModal(null);
        setLeaveForm({ from: '', to: '', reason: '' });
        fetchLeaveData();
      }
    } catch (err) {
      showNotification('Failed to apply for leave', 'error');
    }
  };

  // ✨ UPDATED: Submit Work with selected month
  const handleSubmitWork = async (e) => {
    e.preventDefault();
    setSubmittingWork(true);
    
    try {
      const month_year = `${workMonth}-01`;
      
      const response = await fetch(`${API_BASE_URL}/api/metrics/submit-from-updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: user.id,
          month_year
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        const monthName = new Date(month_year).toLocaleString('default', { month: 'long', year: 'numeric' });
        showNotification(`Monthly report for ${monthName} submitted from ${result.work_days || 0} weekday update day(s)!`, 'success');
        
        fetchPerfMetrics();
        fetchMonthlyUpdateReport();
      } else {
        showNotification(result.error || 'Failed to submit data', 'error');
      }
    } catch (err) {
      console.error('Submit error:', err);
      showNotification('Server error. Please try again.', 'error');
    } finally {
      setSubmittingWork(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/employee/${user.id}`);
      const data = await response.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...taskForm,
          assigned_to: user.id,
          assigned_by: user.id,
          status: 'Pending'
        })
      });
      if (response.ok) {
        showNotification('Task added successfully', 'success');
        setModal(null);
        setTaskForm({ title: '', description: '', deadline: '', priority: 'Medium' });
        fetchTasks();
      }
    } catch (err) {
      showNotification('Failed to add task', 'error');
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${selectedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...taskForm,
          status: selectedTask.status
        })
      });
      if (response.ok) {
        showNotification('Task updated successfully', 'success');
        setModal(null);
        fetchTasks();
      }
    } catch (err) {
      showNotification('Failed to update task', 'error');
    }
  };

  const handleDeleteTask = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${selectedTask.id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        showNotification('Task deleted', 'info');
        setModal(null);
        fetchTasks();
      }
    } catch (err) {
      showNotification('Failed to delete task', 'error');
    }
  };

  const toggleStatus = async (task) => {
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${task.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        fetchTasks();
      }
    } catch (err) {
      showNotification('Failed to update status', 'error');
    }
  };

  const openEdit = (task) => {
    setSelectedTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      deadline: task.deadline ? task.deadline.split('T')[0] : '',
      priority: task.priority
    });
    setModal('edit');
  };

  const getTotalCalls = () => {
    if (!perfMetrics.length) return 0;
    return perfMetrics.reduce((sum, m) => sum + (m.total_calls_made || 0), 0);
  };

  const getTotalBookings = () => {
    if (!perfMetrics.length) return 0;
    return perfMetrics.reduce((sum, m) => sum + (m.total_bookings || 0), 0);
  };

  const getTotalVisits = () => {
    if (!perfMetrics.length) return 0;
    return perfMetrics.reduce((sum, m) => sum + (m.site_visits_done || 0), 0);
  };

  const getTotalSVP = () => {
    if (!perfMetrics.length) return 0;
    return perfMetrics.reduce((sum, m) => sum + (m.site_visits_planned || 0), 0);
  };

  const getTotalTalkTime = () => {
    if (!perfMetrics.length) return 0;
    return perfMetrics.reduce((sum, m) => sum + Math.round((m.total_talk_time_minutes || 0) / 60), 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };

  const profile = {
    name: user?.name || 'N/A',
    role: user?.role === 'employee' ? 'Sales Professional' : user?.role || 'N/A',
    email: user?.email || 'N/A',
    joinDate: formatDate(user?.created_at),
    department: user?.department || 'Sales',
    reportingTo: user?.reporting_to || 'Manager'
  };

  const handleDownloadPDF = async () => {
    try {
      const [attendanceRes, leaveRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/attendance/user/${user.id}/summary`),
        fetch(`${API_BASE_URL}/api/leave/user/${user.id}/summary`)
      ]);
      const attendanceSummary = await attendanceRes.json();
      const leaveSummary = await leaveRes.json();

      generateAppraisalPDF({
        ...profile,
        metrics: perfMetrics,
        ratings: ratings,
        attendanceSummary,
        leaveSummary,
        score: 'N/A',
        period: getReportPeriodLabel()
      });
    } catch (err) {
      console.error('Failed to prepare appraisal PDF:', err);
      showNotification('Failed to generate appraisal report', 'error');
    }
  };

  const handleExportExcel = () => {
    try {
      const exportData = [];
      
      if (perfMetrics.length > 0) {
        perfMetrics.forEach(metric => {
          exportData.push({
            'Month': new Date(metric.month_year).toLocaleString('default', { month: 'long', year: 'numeric' }),
            'Calls Made': metric.total_calls_made || 0,
            'Talk Time (hrs)': ((metric.total_talk_time_minutes || 0) / 60).toFixed(2),
            'SVP': metric.site_visits_planned || 0,
            'SVD': metric.site_visits_done || 0,
            'Bookings': metric.total_bookings || 0,
            'Approved Leaves': metric.approved_leaves || 0,
            'Unwanted Leaves': metric.unwanted_leaves || 0
          });
        });
        
        exportData.push({});
        exportData.push({
          'Month': 'TOTALS',
          'Calls Made': getTotalCalls(),
          'Talk Time (hrs)': getTotalTalkTime(),
          'SVP': getTotalSVP(),
          'SVD': getTotalVisits(),
          'Bookings': getTotalBookings(),
          'Approved Leaves': leaveData.approvedLeaves,
          'Unwanted Leaves': leaveData.rejectedLeaves
        });
      }
      
      if (ratings.length > 0) {
        exportData.push({});
        exportData.push({ 'Month': '--- RATINGS ---' });
        ratings.forEach(rating => {
          exportData.push({
            'Month': new Date(rating.month_year).toLocaleString('default', { month: 'long', year: 'numeric' }),
            'Team Leader Rating': rating.team_leader_rating || 'N/A',
            'HR Rating': rating.hr_rating || 'N/A',
            'Justification': rating.justification || ''
          });
        });
      }
      
      if (tasks.length > 0) {
        exportData.push({});
        exportData.push({ 'Month': '--- TASKS ---' });
        tasks.forEach(task => {
          exportData.push({
            'Task': task.title || '',
            'Description': task.description || '',
            'Deadline': task.deadline ? formatDate(task.deadline) : 'N/A',
            'Priority': task.priority || 'Medium',
            'Status': task.status || 'Pending'
          });
        });
      }
      
      if (leaveHistory.length > 0) {
        exportData.push({});
        exportData.push({ 'Month': '--- LEAVE HISTORY ---' });
        leaveHistory.forEach(leave => {
          exportData.push({
            'Period': `${formatDate(leave.from_date)} - ${formatDate(leave.to_date)}`,
            'Days': calculateLeaveDays(leave.from_date, leave.to_date),
            'Reason': leave.reason || '',
            'Status': leave.final_status || 'Pending'
          });
        });
      }

      if (exportData.length === 0) {
        showNotification('No data to export', 'warning');
        return;
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      if (exportData.length > 0 && exportData[0]) {
        const colWidths = Object.keys(exportData[0] || {}).map(key => ({
          wch: Math.max(key.length, 15)
        }));
        ws['!cols'] = colWidths;
      }
      
      XLSX.utils.book_append_sheet(wb, ws, 'Performance Data');
      
      const date = new Date().toISOString().split('T')[0];
      const fileName = `LEAD_MAGNETS_Employee_${profile.name.replace(/\s+/g, '_')}_${date}.xlsx`;
      
      XLSX.writeFile(wb, fileName);
      showNotification(`✅ Excel report "${fileName}" exported successfully!`, 'success');
    } catch (err) {
      console.error('Excel export error:', err);
      showNotification('Failed to export Excel file', 'error');
    }
  };

  return (
    <div>
      {/* Header Section */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <BarChart3 size={28} color="var(--primary)" />
              Employee Performance Dashboard
            </h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.85rem' }}>
              Track your performance metrics and submit work data
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ 
        marginBottom: '1.5rem', 
        padding: '1rem 1.25rem',
        borderRadius: '12px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClockIcon size={16} color="var(--text-muted)" />
            <select 
              value={filters.period}
              onChange={(e) => setFilters({...filters, period: e.target.value})}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'var(--bg-dark)', border: '1px solid var(--border)', fontSize: '0.85rem', fontWeight: '500' }}
            >
              <option value="weekly">Weekly View</option>
              <option value="monthly">Monthly View</option>
              <option value="quarterly">Quarterly View</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarIcon size={16} color="var(--text-muted)" />
            <input 
              type="date" 
              value={filters.date}
              onChange={(e) => setFilters({...filters, date: e.target.value})}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'var(--bg-dark)', border: '1px solid var(--border)', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ width: '1px', height: '30px', background: 'var(--border)' }}></div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-secondary" onClick={handleDownloadPDF} style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={14} /> Export PDF
            </button>
            <button className="btn-secondary" onClick={handleExportExcel} style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileSpreadsheet size={14} /> Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {[
          { id: 'performance', label: 'Performance Overview', icon: BarChart3 },
          { id: 'updates', label: 'Hourly Updates', icon: Clock },
          { id: 'mywork', label: 'Submit Work', icon: Workflow },
          { id: 'attendance', label: 'Attendance & Leaves', icon: CalendarDays },
          { id: 'profile', label: 'Profile', icon: User }
        ].map(tab => (
          <button 
            key={tab.id}
            className={`btn ${activeTab === tab.id ? '' : 'btn-secondary'}`} 
            onClick={() => setActiveTab(tab.id)}
            style={{ padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========== HOURLY UPDATES TAB ========== */}
      {activeTab === 'updates' && (
        <HourlyUpdatesForm />
      )}

      {/* ========== PERFORMANCE TAB ========== */}
      {activeTab === 'performance' && (
        <>
          {/* ✅ UPDATED Leave Tracker - Shows both count and total days */}
          <div className="card" style={{ borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>
              <CalendarDays size={16} style={{ marginRight: '0.5rem' }} />
              Leave Tracker
            </h3>
            {leaveData.hasData ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {/* Approved Leaves */}
                <div style={{ padding: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: '600' }}>✅ APPROVED</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>{leaveData.approvedCount}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {leaveData.approvedLeaves} day{leaveData.approvedLeaves !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Pending Leaves */}
                <div style={{ padding: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: '600' }}>⏳ PENDING</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f59e0b' }}>{leaveData.pendingCount}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {leaveData.pendingLeaves} day{leaveData.pendingLeaves !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Rejected Leaves */}
                <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: '600' }}>❌ REJECTED</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>{leaveData.rejectedCount}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {leaveData.rejectedLeaves} day{leaveData.rejectedLeaves !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No leave records found</p>
            )}
          </div>
        </>
      )}

      {/* ========== MY WORK TAB ========== */}
      {activeTab === 'mywork' && (
        <div className="card" style={{ borderRadius: '12px' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Submit Monthly Report</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Monthly performance is generated from Monday-Friday hourly updates.
            </p>
          </div>

          <div style={{ 
            marginBottom: '1.5rem', 
            padding: '1rem', 
            background: 'var(--bg-dark)', 
            borderRadius: '10px',
            border: '1px solid var(--primary)',
            borderLeft: '4px solid var(--primary)'
          }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
              <CalendarIcon size={16} />
              Select Reporting Month
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="month"
                value={workMonth}
                onChange={(e) => setWorkMonth(e.target.value)}
                style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)', fontSize: '0.9rem', fontWeight: '500', width: '100%', maxWidth: '300px' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Data will be saved for: <strong>{new Date(workMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</strong>
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmitWork}>
            <div className="table-container" style={{ maxHeight: '260px', overflowY: 'auto' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                <thead><tr><th>Date</th><th>Updates</th><th>Calls</th><th>Talk Hours</th><th>SVP</th><th>SVD</th><th>Bookings</th></tr></thead>
                <tbody>
                  {monthlyUpdateReport.length === 0 ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center' }}>No Monday-Friday hourly updates for this month</td></tr>
                  ) : monthlyUpdateReport.map((day) => (
                    <tr key={day.date}>
                      <td>{formatDate(day.date)}</td>
                      <td>{day.update_entries || 0}</td>
                      <td>{day.total_calls_made || 0}</td>
                      <td>{day.total_talk_time_hours || 0}h</td>
                      <td>{day.site_visits_planned || 0}</td>
                      <td>{day.site_visits_done || 0}</td>
                      <td><span className="badge success">{day.total_bookings || 0}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={fetchMonthlyUpdateReport} className="btn-secondary" style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer' }}>Refresh</button>
              <button type="submit" disabled={submittingWork} className="btn" style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Save size={16} />{submittingWork ? 'Submitting...' : 'Submit Monthly Report'}</button>
            </div>
          </form>

          {perfMetrics.length > 0 && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.75rem' }}>Recent Submissions</h3>
              <div className="table-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                  <thead><tr><th>Month</th><th>Calls</th><th>Talk Hours</th><th>SVP</th><th>SVD</th><th>Bookings</th></tr></thead>
                  <tbody>
                    {perfMetrics.slice(0, 3).map((metric, idx) => (
                      <tr key={idx}>
                        <td>{new Date(metric.month_year).toLocaleString('default', { month: 'short', year: 'numeric' })}</td>
                        <td>{metric.total_calls_made || 0}</td>
                        <td>{((metric.total_talk_time_minutes || 0) / 60).toFixed(2)}h</td>
                        <td>{metric.site_visits_planned || 0}</td>
                        <td>{metric.site_visits_done || 0}</td>
                        <td><span className="badge success">{metric.total_bookings || 0}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== ATTENDANCE TAB ========== */}
      {activeTab === 'attendance' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
          <div className="card" style={{ borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Daily Attendance</h3>
              <button className="btn" onClick={handleClockIn} disabled={isClockingIn} style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.8rem' }}>{isClockingIn ? 'Clocking in...' : 'Clock In'}</button>
            </div>
            <div className="table-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                <thead><tr><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {attendanceHistory.length === 0 ? (
                    <tr><td colSpan="2" style={{ textAlign: 'center' }}>No records</td></tr>
                  ) : (
                    attendanceHistory.slice(0, 10).map((log, i) => (
                      <tr key={i}><td>{formatDate(log.date)}</td><td><span className="badge success">Present</span></td></tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Leave Management</h3>
              <button className="btn-secondary" onClick={() => setModal('leave')} style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.8rem' }}>Apply Leave</button>
            </div>
            <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
              <table className="data-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                <thead><tr><th>Period</th><th>Days</th><th>Status</th></tr></thead>
                <tbody>
                  {leaveHistory.length === 0 ? (
                    <tr><td colSpan="3" style={{ textAlign: 'center' }}>No applications</td></tr>
                  ) : (
                    leaveHistory.slice(0, 5).map((leave, i) => (
                      <tr key={i}>
                        <td>{formatDate(leave.from_date)} - {formatDate(leave.to_date)}</td>
                        <td>{calculateLeaveDays(leave.from_date, leave.to_date)}</td>
                        <td><span className={`badge ${leave.final_status === 'Approved' ? 'success' : leave.final_status === 'Rejected' ? 'danger' : 'warning'}`}>{leave.final_status}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========== PROFILE TAB ========== */}
      {activeTab === 'profile' && (
        <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <div className="card" style={{ borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Personal Information</h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Full Name</label><div style={{ fontWeight: '500' }}>{profile.name}</div></div>
              <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Email</label><div style={{ fontWeight: '500' }}>{profile.email}</div></div>
              <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Role</label><div style={{ fontWeight: '500' }}>{profile.role}</div></div>
              <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Department</label><div style={{ fontWeight: '500' }}>{profile.department}</div></div>
              <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Reports To</label><div style={{ fontWeight: '500' }}>{profile.reportingTo}</div></div>
              <div><label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Join Date</label><div style={{ fontWeight: '500' }}>{profile.joinDate}</div></div>
            </div>
            <button className="btn-secondary" style={{ width: '100%', marginTop: '1rem', padding: '0.5rem', borderRadius: '8px' }} onClick={() => window.location.href = '/profile'}>Edit Profile</button>
          </div>
          
          <div className="card" style={{ borderRadius: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Security</h3>
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: '1.5' }}>Update your password regularly to keep your account secure and change password by going in profile settings.</p>
            </div>
            <button className="btn-secondary" style={{ width: '100%', padding: '0.5rem', borderRadius: '8px' }} onClick={() => window.location.href = '/profile'}>Change Password</button>
          </div>
        </div>
      )}

      {/* MODALS */}
      {(modal === 'add' || modal === 'edit') && (
        <Modal title={modal === 'add' ? 'New Task' : 'Edit Task'} onClose={() => setModal(null)}>
          <form onSubmit={modal === 'add' ? handleAddTask : handleUpdateTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group"><label>Task Title</label><input required value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} /></div>
            <div className="form-group"><label>Description</label><textarea rows={3} value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group"><label>Deadline</label><input type="date" required value={taskForm.deadline} onChange={e => setTaskForm({ ...taskForm, deadline: e.target.value })} /></div>
              <div className="form-group"><label>Priority</label><select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}><option>High</option><option>Medium</option><option>Low</option></select></div>
            </div>
            <button className="btn" type="submit" style={{ marginTop: '0.5rem' }}>{modal === 'add' ? 'Create Task' : 'Update Task'}</button>
          </form>
        </Modal>
      )}

      {modal === 'leave' && (
        <Modal title="Apply for Leave" onClose={() => setModal(null)}>
          <form onSubmit={handleApplyLeave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group"><label>From Date</label><input type="date" required value={leaveForm.from} onChange={e => setLeaveForm({ ...leaveForm, from: e.target.value })} /></div>
              <div className="form-group"><label>To Date</label><input type="date" required value={leaveForm.to} onChange={e => setLeaveForm({ ...leaveForm, to: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>Reason</label><textarea required rows={3} placeholder="Explain your reason..." value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} /></div>
            <button className="btn" type="submit">Submit Application</button>
          </form>
        </Modal>
      )}

      {modal === 'delete' && (
        <Modal title="Delete Task" onClose={() => setModal(null)}>
          <p>Are you sure you want to delete this task? This action cannot be undone.</p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button className="btn-secondary" onClick={() => setModal(null)} style={{ flex: 1 }}>Cancel</button>
            <button className="btn" onClick={handleDeleteTask} style={{ flex: 1, backgroundColor: 'var(--danger)' }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default EmployeeDashboard;
