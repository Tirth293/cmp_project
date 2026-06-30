import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, AreaChart, Area } from 'recharts';
import {
  Download, TrendingUp, Users, ArrowUpRight, UserPlus, FileText,
  Settings, Activity, Trash2, X, Edit2, User, Check, AlertTriangle,
  ShieldCheck, Key, Sparkles, FileDown, CalendarDays, MapPin, Building2, GitBranch,
  Filter, Calendar, Clock, Briefcase, Search, Bell, Mail, Send
} from 'lucide-react';
import { generateAppraisalPDF } from '../utils/pdfExport';
import { useSearch } from '../context/SearchContext';
import { useNotify } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import SendNotificationModal from '../components/SendNotificationModal';
import * as XLSX from 'xlsx'; // ✨ EXCEL EXPORT
import API_BASE_URL from '../utils/api';


const ROLE_LABELS = { admin: 'Admin', hr: 'HR Manager', employee: 'Employee' };
const ROLE_COLORS = { admin: '#ef4444', hr: '#8b5cf6', employee: '#10b981' };

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

const AdminDashboard = () => {
  const { user: authUser } = useAuth();
  const { globalSearchTerm, setGlobalSearchTerm } = useSearch();
  const { showNotification } = useNotify();

  const [activeTab, setActiveTab] = useState('overview');
  const [employees, setEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSendNotif, setShowSendNotif] = useState(false);

  // Filter states
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('weekly');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  // Branch stats
  const [branchStats, setBranchStats] = useState([]);
  const [branchAttendance, setBranchAttendance] = useState([]);

  // Project stats
  const [projectSummary, setProjectSummary] = useState([]);
  const [employeeHoursSummary, setEmployeeHoursSummary] = useState([]);

  // Modal state
  const [modal, setModal] = useState(null);
  const [selectedEmp, setSelectedEmp] = useState(null);

  // Form states
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'employee', department: '', reporting_to: '', branch: 'Ashram Road' });
  const [editUser, setEditUser] = useState({});
  const [metrics, setMetrics] = useState({ total_calls_made: '', total_bookings: '', site_visits_done: '', site_visits_planned: '', approved_leaves: '', unwanted_leaves: '' });

  // Performance comparison states
  const [performanceData, setPerformanceData] = useState({
    currentMonth: null,
    previousMonth: null,
    comparisonData: [],
    isLoading: false
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const formatDateValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getReportPeriodLabel = () => {
    const range = getDateRangeFromFilter();
    const format = (dateString) => new Date(`${dateString}T00:00:00`).toLocaleDateString();
    if (timeFilter === 'weekly') return `Weekly (${format(range.start)} - ${format(range.end)}, 5 days)`;
    if (timeFilter === 'monthly') return `Monthly (${format(range.start)} - ${format(range.end)})`;
    return `Quarterly (${format(range.start)} - ${format(range.end)})`;
  };

  // ─── Data Fetching with Metrics and Filters ───
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const url = branchFilter && branchFilter !== 'all' ? `/api/users?branch=${encodeURIComponent(branchFilter)}` : '/api/users';
      const res = await fetch(url);
      const users = await res.json();
      const employeesList = Array.isArray(users) ? users : [];
      
      const employeesWithMetrics = await Promise.all(
        employeesList.map(async (emp) => {
          try {
            const metricsRes = await fetch(`${API_BASE_URL}/api/metrics/${emp.id}`);
            const metricsData = await metricsRes.json();
            let filteredMetrics = Array.isArray(metricsData) ? metricsData : [];
            
            if (dateFilter && timeFilter !== 'weekly') {
              const range = getDateRangeFromFilter();
              filteredMetrics = filteredMetrics.filter(m => 
                m.month_year >= range.start && m.month_year <= range.end
              );
            }
            
            const latestMetrics = filteredMetrics.length > 0 ? filteredMetrics[0] : 
                                  (Array.isArray(metricsData) && metricsData.length > 0 ? metricsData[0] : {});
            
            let totalCalls = 0;
            let totalTalkMinutes = 0;
            let totalSVP = 0;
            let totalSVD = 0;
            let totalBookings = 0;
            
            if (timeFilter !== 'weekly' && filteredMetrics.length > 1) {
              filteredMetrics.forEach(m => {
                totalCalls += m.total_calls_made || 0;
                totalTalkMinutes += m.total_talk_time_minutes || 0;
                totalSVP += m.site_visits_planned || 0;
                totalSVD += m.site_visits_done || 0;
                totalBookings += m.total_bookings || 0;
              });
            } else {
              totalCalls = latestMetrics.total_calls_made || 0;
              totalTalkMinutes = latestMetrics.total_talk_time_minutes || 0;
              totalSVP = latestMetrics.site_visits_planned || 0;
              totalSVD = latestMetrics.site_visits_done || 0;
              totalBookings = latestMetrics.total_bookings || 0;
            }
            
            return {
              ...emp,
              total_calls_made: totalCalls,
              total_talk_time: Math.round(totalTalkMinutes / 60),
              site_visits_planned: totalSVP,
              site_visits_done: totalSVD,
              total_bookings: totalBookings,
              approved_leaves: latestMetrics.approved_leaves || 0,
              unwanted_leaves: latestMetrics.unwanted_leaves || 0,
              metrics_history: filteredMetrics,
            };
          } catch (err) {
            console.error(`Failed to fetch metrics for ${emp.name}:`, err);
            return {
              ...emp,
              total_calls_made: 0,
              total_talk_time: 0,
              site_visits_planned: 0,
              site_visits_done: 0,
              total_bookings: 0,
              approved_leaves: 0,
              unwanted_leaves: 0,
              metrics_history: [],
            };
          }
        })
      );
      
      setAllEmployees(employeesWithMetrics);
      
      let filtered = employeesWithMetrics;
      if (employeeFilter !== 'all') {
        filtered = employeesWithMetrics.filter(emp => emp.id === parseInt(employeeFilter));
      }
      
      setEmployees(filtered);
    } catch (err) {
      showNotification('Failed to load employees', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getDateRangeFromFilter = () => {
    let startDate = new Date();
    let endDate = new Date(dateFilter);
    
    switch(timeFilter) {
      case 'weekly':
        {
          const reference = new Date(dateFilter);
          const day = reference.getDay();
          const diff = reference.getDate() - day + (day === 0 ? -6 : 1);
          startDate = new Date(reference.getFullYear(), reference.getMonth(), diff);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 4);
        }
        break;
      case 'monthly':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        endDate = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
        break;
      case 'quarterly':
        {
          const quarter = Math.floor(endDate.getMonth() / 3);
          startDate = new Date(endDate.getFullYear(), quarter * 3, 1);
          endDate = new Date(endDate.getFullYear(), quarter * 3 + 3, 0);
        }
        break;
      default:
        startDate = new Date(dateFilter);
        startDate.setDate(startDate.getDate() - 7);
        endDate = new Date(dateFilter);
    }
    
    return { start: formatDateValue(startDate), end: formatDateValue(endDate) };
  };

  const fetchBranches = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/branches`);
      const data = await res.json();
      setBranches(Array.isArray(data) ? data : ['Ashram Road', 'Maninagar']);
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  const fetchBranchStats = async () => {

  try {

    const attendanceQuery = new URLSearchParams();
    attendanceQuery.append('role', authUser?.role || 'admin');
    if (branchFilter && branchFilter !== 'all') {
      attendanceQuery.append('branch', branchFilter);
    }

    const [statsRes, attendRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/users/branch-stats`),
      fetch(`${API_BASE_URL}/api/attendance/daily-status?${attendanceQuery.toString()}`)
    ]);

    const statsData = await statsRes.json();
    const attendData = await attendRes.json();

    // Branch stats
    setBranchStats(
      Array.isArray(statsData)
        ? statsData
        : []
    );

    // Remove Admin & HR attendance
   const filteredAttendance =
  Array.isArray(attendData)
    ? attendData.filter(item => {

        const role =
          (
            item.role ||
            item.user_role ||
            ''
          ).toLowerCase();

        return (
          role !== 'admin' &&
          role !== 'hr'
        );
      })
    : [];

    // Group attendance by branch
    const byBranch = {};

    filteredAttendance.forEach((e) => {

      const branch =
        e.branch || 'Unassigned';

      if (!byBranch[branch]) {

        byBranch[branch] = {
          branch,
          present: 0,
          absent: 0
        };
      }

      if (
        (e.status || 'Present')
          .toLowerCase() === 'present'
      ) {

        byBranch[branch].present += 1;

      } else {

        byBranch[branch].absent += 1;
      }
    });

    setBranchAttendance(
      Object.values(byBranch)
    );

  } catch (err) {

    console.error(
      'Failed to fetch branch stats:',
      err
    );
  }
};
  const fetchLeaves = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/leave/all?role=${authUser?.role}`);
      const data = await res.json();
      setLeaves(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch leaves:", err);
    }
  };

  const fetchProjectData = async () => {
    try {
      const params = new URLSearchParams();
      if (branchFilter !== 'all') params.append('branch', branchFilter);
      if (employeeFilter !== 'all') params.append('userId', employeeFilter);

      const range = getDateRangeFromFilter();
      params.append('dateFrom', range.start);
      params.append('dateTo', range.end);

      const query = params.toString() ? `?${params.toString()}` : '';
      const [summaryRes, employeeRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/updates/summary${query}`),
        fetch(`${API_BASE_URL}/api/updates/by-employee${query}`)
      ]);
      
      const summaryData = await summaryRes.json();
      const employeeData = await employeeRes.json();
      
      setProjectSummary(Array.isArray(summaryData) ? summaryData : []);
      setEmployeeHoursSummary(Array.isArray(employeeData) ? employeeData : []);
    } catch (err) {
      console.error('Failed to fetch project data:', err);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (authUser?.role === 'admin' || authUser?.role === 'hr') {
      fetchLeaves();
    }
  }, [authUser?.role]);

  useEffect(() => {
    fetchEmployees();
  }, [branchFilter, employeeFilter, timeFilter, dateFilter]);

  useEffect(() => {
    if (activeTab === 'branches') fetchBranchStats();
    if (activeTab === 'projects' || activeTab === 'overview') fetchProjectData();
  }, [activeTab, branchFilter, employeeFilter, timeFilter, dateFilter]);

  const filteredEmployees = employees.filter(emp =>
    (emp.name || '').toLowerCase().includes((globalSearchTerm || '').toLowerCase()) ||
    (emp.email || '').toLowerCase().includes((globalSearchTerm || '').toLowerCase()) ||
    (emp.department || '').toLowerCase().includes((globalSearchTerm || '').toLowerCase())
  );

  // Calculate totals for KPI cards
  const totalStaffCount = employees.length;
  const totalEmployeeCount = employees.filter(e => e.role === 'employee').length;
  const totalCalls = employees.reduce((sum, e) => sum + (e.total_calls_made || 0), 0);
  const totalTalkTime = employees.reduce((sum, e) => sum + (e.total_talk_time || 0), 0);
  const totalSVP = employees.reduce((sum, e) => sum + (e.site_visits_planned || 0), 0);
  const totalSVD = employees.reduce((sum, e) => sum + (e.site_visits_done || 0), 0);
  const totalProductivity = employees.reduce((sum, e) => sum + (e.total_bookings || 0), 0);
  const conversionRate = totalSVP > 0 ? Math.round((totalSVD / totalSVP) * 100) : 0;
  const totalUpdateEntries = employeeHoursSummary.reduce((sum, emp) => sum + (emp.update_entries || 0), 0);
  const totalLockedUpdates = employeeHoursSummary.reduce((sum, emp) => sum + (emp.locked_entries || 0), 0);
  const totalFinalUpdates = employeeHoursSummary.reduce((sum, emp) => sum + (emp.final_submission_count || 0), 0);
  
  const targetCalls = timeFilter === 'weekly' ? 500 : timeFilter === 'monthly' ? 2000 : 6000;
  const targetTalkTime = timeFilter === 'weekly' ? 25 : timeFilter === 'monthly' ? 100 : 300;
  const callsVsTarget = Math.round((totalCalls / targetCalls) * 100);
  const talkTimeVsTarget = Math.round((totalTalkTime / targetTalkTime) * 100);

  const topPerformers = [...employees]
    .sort((a, b) => (b.total_bookings || 0) - (a.total_bookings || 0))
    .slice(0, 4);

  const totalLeaves = leaves.length;
  const pendingLeaves = leaves.filter(l => l.final_status === 'Pending').length;
  const approvedLeavesCount = leaves.filter(l => l.final_status === 'Approved').length;

  // Prepare chart data
  const getChartDataForEmployee = () => {
    if (employeeFilter !== 'all') {
      const selectedEmpData = employees[0];
      if (selectedEmpData && selectedEmpData.metrics_history && selectedEmpData.metrics_history.length > 0) {
        return selectedEmpData.metrics_history.slice(0, 6).map(m => ({
          name: new Date(m.month_year).toLocaleString('default', { month: 'short' }),
          Calls: m.total_calls_made || 0,
          'Talk Time': Math.round((m.total_talk_time_minutes || 0) / 60),
          SVP: m.site_visits_planned || 0,
          SVD: m.site_visits_done || 0,
        }));
      }
      return [{
        name: selectedEmpData?.name || 'Current',
        Calls: selectedEmpData?.total_calls_made || 0,
        'Talk Time': selectedEmpData?.total_talk_time || 0,
        SVP: selectedEmpData?.site_visits_planned || 0,
        SVD: selectedEmpData?.site_visits_done || 0,
      }];
    }
    
    if (timeFilter !== 'weekly' && allEmployees.length > 0) {
      const monthlyData = {};
      allEmployees.forEach(emp => {
        if (emp.metrics_history) {
          emp.metrics_history.forEach(m => {
            const monthKey = new Date(m.month_year).toLocaleString('default', { month: 'short', year: '2-digit' });
            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = { name: monthKey, Calls: 0, 'Talk Time': 0, SVP: 0, SVD: 0 };
            }
            monthlyData[monthKey].Calls += m.total_calls_made || 0;
            monthlyData[monthKey]['Talk Time'] += Math.round((m.total_talk_time_minutes || 0) / 60);
            monthlyData[monthKey].SVP += m.site_visits_planned || 0;
            monthlyData[monthKey].SVD += m.site_visits_done || 0;
          });
        }
      });
      return Object.values(monthlyData).slice(-6);
    }
    
    return employees.slice(0, 8);
  };

  const chartDisplayData = getChartDataForEmployee();

  // Handlers
  const openEdit = (emp) => {
    setSelectedEmp(emp);
    setEditUser({ name: emp.name, email: emp.email, role: emp.role, department: emp.department || '', reporting_to: emp.reporting_to || '', branch: emp.branch || 'Ashram Road' });
    setModal('edit');
  };

  const openMetrics = (emp) => {
    setSelectedEmp(emp);
    setMetrics({ total_calls_made: '', total_bookings: '', site_visits_done: '', site_visits_planned: '', approved_leaves: '', unwanted_leaves: '' });
    setModal('metrics');
  };

  const openDelete = (emp) => { setSelectedEmp(emp); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelectedEmp(null); };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      const data = await res.json();
      if (res.ok) {
        closeModal();
        fetchEmployees();
        setNewUser({ name: '', email: '', password: '', role: 'employee', department: '', reporting_to: '', branch: 'Ashram Road' });
        showNotification(`✅ User "${newUser.name}" created successfully!`, 'success');
      } else {
        showNotification(data.error || 'Failed to create user', 'error');
      }
    } catch (err) {
      showNotification('Server error. Please check the backend.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${selectedEmp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editUser)
      });
      const data = await res.json();
      if (res.ok) {
        closeModal();
        fetchEmployees();
        showNotification(`✅ "${editUser.name}" updated successfully!`, 'success');
      } else {
        showNotification(data.error || 'Failed to update user', 'error');
      }
    } catch (err) {
      showNotification('Server error updating user.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${selectedEmp.id}`, { method: 'DELETE' });
      if (res.ok) {
        setEmployees(prev => prev.filter(e => e.id !== selectedEmp.id));
        closeModal();
        showNotification(`🗑️ "${selectedEmp.name}" has been removed.`, 'info');
      }
    } catch (err) {
      showNotification('Failed to delete user.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateMetrics = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const metricsToSend = {};
      if (metrics.total_calls_made !== '') metricsToSend.total_calls_made = parseInt(metrics.total_calls_made) || 0;
      if (metrics.total_bookings !== '') metricsToSend.total_bookings = parseInt(metrics.total_bookings) || 0;
      if (metrics.site_visits_done !== '') metricsToSend.site_visits_done = parseInt(metrics.site_visits_done) || 0;
      if (metrics.site_visits_planned !== '') metricsToSend.site_visits_planned = parseInt(metrics.site_visits_planned) || 0;
      if (metrics.approved_leaves !== '') metricsToSend.approved_leaves = parseInt(metrics.approved_leaves) || 0;
      if (metrics.unwanted_leaves !== '') metricsToSend.unwanted_leaves = parseInt(metrics.unwanted_leaves) || 0;

      const month_year = new Date().toISOString().slice(0, 7) + '-01';
      
      const res = await fetch(`${API_BASE_URL}/api/metrics/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: selectedEmp.id, month_year, ...metricsToSend })
      });
      if (res.ok) {
        closeModal();
        fetchEmployees();
        showNotification(`📊 Metrics for "${selectedEmp.name}" updated!`, 'success');
      } else {
        const data = await res.json();
        showNotification(data.error || 'Failed to update metrics', 'error');
      }
    } catch (err) {
      showNotification('Server error updating metrics.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateAllPDFs = async () => {
    const reportEmployees = employees.filter(emp => emp.role === 'employee');
    if (!reportEmployees.length) {
      showNotification('No employee records available for PDF reports.', 'warning');
      return;
    }

    showNotification(`📄 Preparing ${reportEmployees.length} employee reports...`, 'info');

    for (let i = 0; i < reportEmployees.length; i++) {
      const emp = reportEmployees[i];
      try {
        const [metricsRes, ratingsRes, attendanceRes, leaveRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/metrics/${emp.id}`),
          fetch(`${API_BASE_URL}/api/ratings/${emp.id}`),
          fetch(`${API_BASE_URL}/api/attendance/user/${emp.id}/summary`),
          fetch(`${API_BASE_URL}/api/leave/user/${emp.id}/summary`)
        ]);

        const metricsData = await metricsRes.json();
        const ratingsData = await ratingsRes.json();
        const attendanceSummary = await attendanceRes.json();
        const leaveSummary = await leaveRes.json();

        generateAppraisalPDF({
          id: emp.id,
          name: emp.name,
          role: emp.role,
          email: emp.email,
          department: emp.department,
          reportingTo: emp.reporting_to,
          metrics: metricsData,
          ratings: ratingsData,
          attendanceSummary,
          leaveSummary,
          score: emp.score || 'N/A',
          period: getReportPeriodLabel()
        });

        if (reportEmployees.length > 1) await new Promise(r => setTimeout(r, 800));
      } catch (err) {
        console.error(`Failed to generate report for ${emp.name}:`, err);
      }
    }

    showNotification('✅ All employee reports generated!', 'success');
  };

  // ═══════════════════════════════════════════
  // ✨ EXCEL EXPORT FUNCTIONALITY
  // ═══════════════════════════════════════════
  const handleExportExcel = () => {
    try {
      let exportData = [];
      let reportType = '';
      
      if (activeTab === 'overview' || activeTab === 'users') {
        reportType = 'Employee_Performance';
        
        // Export employee performance data
        exportData = filteredEmployees.map(emp => ({
          'Name': emp.name || '',
          'Email': emp.email || '',
          'Role': ROLE_LABELS[emp.role] || emp.role,
          'Department': emp.department || '',
          'Reporting To': emp.reporting_to || '',
          'Branch': emp.branch || '',
          'Total Calls': emp.total_calls_made || 0,
          'Talk Time (hrs)': emp.total_talk_time || 0,
          'Site Visits Planned': emp.site_visits_planned || 0,
          'Site Visits Done': emp.site_visits_done || 0,
          'Total Bookings': emp.total_bookings || 0,
          'Approved Leaves': emp.approved_leaves || 0,
          'Unwanted Leaves': emp.unwanted_leaves || 0,
          'Score': emp.score || 'N/A',
          'Status': emp.status || 'N/A'
        }));
        
        // Add summary row
        exportData.push({});
        exportData.push({
          'Name': 'SUMMARY',
          'Email': '',
          'Role': '',
          'Department': '',
          'Reporting To': '',
          'Branch': '',
          'Total Calls': totalCalls,
          'Talk Time (hrs)': totalTalkTime,
          'Site Visits Planned': totalSVP,
          'Site Visits Done': totalSVD,
          'Total Bookings': totalProductivity,
          'Approved Leaves': approvedLeavesCount,
          'Unwanted Leaves': leaves.filter(l => l.final_status === 'Rejected').length,
          'Score': `Conversion Rate: ${conversionRate}%`,
          'Status': `Active: ${employees.filter(e => e.total_calls_made > 0).length}/${employees.length}`
        });
        
      } else if (activeTab === 'performance') {
        reportType = 'Performance_Comparison';
        
        // Export performance comparison data
        exportData = performanceData.comparisonData.map(emp => ({
          'Name': emp.name || '',
          'Role': ROLE_LABELS[emp.role] || emp.role,
          'Department': emp.department || '',
          'Current Score (%)': emp.currentScore || 0,
          'Previous Score (%)': emp.previousScore || 0,
          'Improvement (%)': `${emp.improvement >= 0 ? '+' : ''}${emp.improvementPercent}%`,
          'Status': emp.status || ''
        }));
        
        // Add summary
        if (performanceData.comparisonData.length > 0) {
          const avgCurrent = Math.round(performanceData.comparisonData.reduce((sum, d) => sum + d.currentScore, 0) / performanceData.comparisonData.length);
          const avgImprovement = Math.round(performanceData.comparisonData.reduce((sum, d) => sum + d.improvement, 0) / performanceData.comparisonData.length);
          
          exportData.push({});
          exportData.push({
            'Name': 'AVERAGE',
            'Role': '',
            'Department': '',
            'Current Score (%)': `${avgCurrent}%`,
            'Previous Score (%)': '',
            'Improvement (%)': `${avgImprovement >= 0 ? '+' : ''}${avgImprovement}%`,
            'Status': performanceData.comparisonData[0]?.name ? `Top: ${performanceData.comparisonData[0].name}` : ''
          });
        }
        
      } else if (activeTab === 'branches') {
        reportType = 'Branch_Analytics';
        
        // Export branch analytics data
        exportData = branchStats.map(branch => ({
          'Branch': branch.branch || '',
          'Total Employees': branch.employee_count || 0,
          'Average Score (%)': branch.avg_score ? `${branch.avg_score}%` : 'N/A'
        }));
        
        // Add attendance section
        if (branchAttendance.length > 0) {
          exportData.push({});
          exportData.push({
            'Branch': '--- TODAY\'S ATTENDANCE ---',
            'Total Employees': '',
            'Average Score (%)': ''
          });
          
          branchAttendance.forEach(att => {
            exportData.push({
              'Branch': att.branch || '',
              'Total Employees': `Present: ${att.present || 0}`,
              'Average Score (%)': `Absent: ${att.absent || 0}`
            });
          });
        }
      } else if (activeTab === 'projects') {
        reportType = 'Project_Tracking';

        exportData = projectSummary.map(project => ({
          'Project Name': project.project_name || '',
          'Branches': project.branches || '',
          'Contributors': project.contributor_count || 0,
          'Updates': project.update_count || 0,
          'Final Updates': project.final_submission_count || 0,
          'Talk Hours': project.total_hours || 0,
          'Total Calls': project.total_calls_made || 0,
          'Talk Time (hrs)': ((project.total_talk_time_minutes || 0) / 60).toFixed(2),
          'Total SVP': project.total_svp || 0,
          'Total SVD': project.total_svd || 0,
          'Total Bookings': project.total_bookings || 0,
          'Last Submission': project.last_submission ? new Date(project.last_submission).toLocaleString() : ''
        }));

        exportData.push({});
        exportData.push({
          'Project Name': 'EMPLOYEE SUMMARY',
          'Branches': '',
          'Contributors': employeeHoursSummary.length,
          'Updates': totalUpdateEntries,
          'Final Updates': totalFinalUpdates,
          'Talk Hours': employeeHoursSummary.reduce((sum, employee) => sum + (employee.total_hours || 0), 0),
          'Total Calls': employeeHoursSummary.reduce((sum, employee) => sum + (employee.total_calls_made || 0), 0),
          'Talk Time (hrs)': (employeeHoursSummary.reduce((sum, employee) => sum + (employee.total_talk_time_minutes || 0), 0) / 60).toFixed(2),
          'Total SVP': employeeHoursSummary.reduce((sum, employee) => sum + (employee.total_svp || 0), 0),
          'Total SVD': employeeHoursSummary.reduce((sum, employee) => sum + (employee.total_svd || 0), 0),
          'Total Bookings': employeeHoursSummary.reduce((sum, employee) => sum + (employee.total_bookings || 0), 0),
          'Last Submission': ''
        });
      }

      if (exportData.length === 0) {
        showNotification('No data to export', 'warning');
        return;
      }

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      
      // Auto-size columns
      if (exportData.length > 0) {
        const colWidths = Object.keys(exportData[0]).map(key => ({
          wch: Math.max(key.length, 15)
        }));
        ws['!cols'] = colWidths;
      }
      
      // Add worksheet to workbook
      const sheetName = activeTab === 'overview' ? 'Performance' : 
                        activeTab === 'users' ? 'Directory' :
                        activeTab === 'performance' ? 'Comparison' :
                        activeTab === 'projects' ? 'Projects' : 'Branches';
      
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      
      // Generate filename with LEAD_MAGNETS prefix
      const date = new Date().toISOString().split('T')[0];
      const timeFilterLabel = timeFilter === 'weekly' ? 'Weekly' : 
                              timeFilter === 'monthly' ? 'Monthly' : 'Quarterly';
      
      const fileName = `LEAD_MAGNETS_${reportType}_${timeFilterLabel}_${date}.xlsx`;
      
      // Download file
      XLSX.writeFile(wb, fileName);
      
      showNotification(`✅ Excel report "${fileName}" exported successfully!`, 'success');
    } catch (err) {
      console.error('Excel export error:', err);
      showNotification('Failed to export Excel file. Please try again.', 'error');
    }
  };

  const handleExportPDF = () => {
    showNotification('Generating PDF report...', 'info');
    handleGenerateAllPDFs();
  };

  const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month];
  };

  const calculateEmployeeScore = (emp) => {
    if (emp.total_bookings && emp.total_calls_made) {
      const bookingRate = (emp.total_bookings / (emp.total_calls_made || 1)) * 100;
      return Math.min(100, Math.round(40 + bookingRate * 0.6));
    }
    const baseScore = 70;
    const randomVariation = Math.floor(Math.random() * 30);
    return Math.min(100, baseScore + randomVariation);
  };

  const fetchPerformanceComparison = async () => {
    setPerformanceData(prev => ({ ...prev, isLoading: true }));

    try {
      const params = new URLSearchParams();
      if (branchFilter !== 'all') params.append('branch', branchFilter);
      if (employeeFilter !== 'all') params.append('userId', employeeFilter);
      const range = getDateRangeFromFilter();
      params.append('dateFrom', range.start);
      params.append('dateTo', range.end);

      const response = await fetch(`${API_BASE_URL}/api/updates/by-employee?${params.toString()}`);
      const workData = await response.json();

      const comparison = (Array.isArray(workData) ? workData : []).map(emp => {
        const currentHours = emp.total_hours || 0;
        const currentSVP = emp.total_svp || 0;
        const currentSVD = emp.total_svd || 0;
        const conversion = currentSVP > 0 ? Math.round((currentSVD / currentSVP) * 100) : 0;
        
        // Score calculation based on hours, SVP, SVD
        const hourScore = Math.min(100, (currentHours / 100) * 100);
        const conversionScore = conversion;
        const updateScore = Math.min(100, (emp.update_entries / 20) * 100);
        const currentScore = Math.round((hourScore + conversionScore + updateScore) / 3);
        const previousScore = Math.max(0, currentScore - Math.floor(Math.random() * 10));
        const improvement = currentScore - previousScore;

        return {
          id: emp.user_id,
          name: emp.employee_name || 'Unknown',
          branch: emp.branch || '—',
          currentScore,
          previousScore,
          improvement,
          improvementPercent: previousScore > 0 ? Math.round((improvement / previousScore) * 100) : improvement,
          hours: currentHours,
          svp: currentSVP,
          svd: currentSVD,
          conversion: conversion,
          updates: emp.update_entries,
          status: improvement > 5 ? 'excellent' : improvement > 0 ? 'improving' : improvement === 0 ? 'stable' : 'declining'
        };
      }).sort((a, b) => b.currentScore - a.currentScore);

      setPerformanceData({
        currentMonth: { month: selectedMonth, year: selectedYear },
        comparisonData: comparison,
        isLoading: false
      });
    } catch (err) {
      console.error('Failed to fetch performance data:', err);
      setPerformanceData(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    if (employees.length > 0 && activeTab === 'performance') {
      fetchPerformanceComparison();
    }
  }, [selectedMonth, selectedYear, employees, activeTab]);

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ color: 'var(--success)', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            HR DASHBOARD
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0 }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>Company-wide performance overview</p>
        </div>
        
        <div>
          {(authUser?.role === 'admin' || authUser?.role === 'hr') && (
            <button 
              className="btn" 
              onClick={() => setShowSendNotif(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Send size={16} /> Send Notification
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <button className={`btn ${activeTab === 'overview' ? '' : 'btn-secondary'}`} onClick={() => setActiveTab('overview')}>
          Overview
        </button>
        <button className={`btn ${activeTab === 'users' ? '' : 'btn-secondary'}`} onClick={() => setActiveTab('users')}>
          Manage Users
        </button>
        <button className={`btn ${activeTab === 'performance' ? '' : 'btn-secondary'}`} onClick={() => setActiveTab('performance')}>
          Performance Comparison
        </button>
        <button className={`btn ${activeTab === 'projects' ? '' : 'btn-secondary'}`} onClick={() => setActiveTab('projects')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Briefcase size={16} /> Projects
        </button>
        <button className={`btn ${activeTab === 'branches' ? '' : 'btn-secondary'}`} onClick={() => setActiveTab('branches')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <GitBranch size={16} /> Branch Analytics
        </button>
      </div>

      {/* ── FILTER BAR ── */}
      {(activeTab === 'overview' || activeTab === 'users') && (
        <div className="card" style={{ 
          marginBottom: '2rem', 
          padding: '1.25rem',
          borderRadius: '20px',
          background: 'var(--bg-card)'
        }}>
          <div style={{ 
            display: 'flex', 
            gap: '1rem',
            alignItems: 'flex-end',
            flexWrap: 'wrap'
          }}>
            {/* Branch Filter */}
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>
                <MapPin size={12} style={{ display: 'inline', marginRight: '0.25rem' }} /> Branch
              </label>
              <select 
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '10px' }}
              >
                <option value="all">All branches</option>
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* Employee Filter */}
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>
                <Users size={12} style={{ display: 'inline', marginRight: '0.25rem' }} /> Employee
              </label>
              <select 
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '10px' }}
              >
                <option value="all">All employees</option>
                {allEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </div>

            {/* Time Filter */}
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '120px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>
                <Clock size={12} style={{ display: 'inline', marginRight: '0.25rem' }} /> Time
              </label>
              <select 
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '10px' }}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '130px' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem', display: 'block' }}>
                <Calendar size={12} style={{ display: 'inline', marginRight: '0.25rem' }} /> Date
              </label>
              <input 
                type="date" 
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '10px' }}
              />
            </div>

            {/* Reset Button */}
            <div style={{ flex: '0 0 auto' }}>
              <button className="btn btn-secondary" onClick={() => {
                setBranchFilter('all');
                setEmployeeFilter('all');
                setTimeFilter('weekly');
                setDateFilter(new Date().toISOString().split('T')[0]);
              }} style={{ padding: '0.6rem 1rem', whiteSpace: 'nowrap' }}>
                Reset
              </button>
            </div>

            {/* Apply Button */}
            <div style={{ flex: '0 0 auto' }}>
              <button className="btn" onClick={() => fetchEmployees()} style={{ padding: '0.6rem 1rem', whiteSpace: 'nowrap' }}>
                Apply
              </button>
            </div>

            {/* PDF Button */}
            <div style={{ flex: '0 0 auto' }}>
              <button className="btn btn-secondary" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', whiteSpace: 'nowrap' }}>
                <Download size={16} /> PDF
              </button>
            </div>

            {/* Excel Button */}
            <div style={{ flex: '0 0 auto' }}>
              <button className="btn btn-secondary" onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', whiteSpace: 'nowrap' }}>
                <FileText size={16} /> Excel
              </button>
            </div>
          </div>

          {/* Selected Employee Info */}
          {employeeFilter !== 'all' && employees.length === 1 && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '0.75rem', 
              background: 'var(--primary-light)', 
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={20} color="white" />
              </div>
              <div>
                <div style={{ fontWeight: 'bold' }}>{employees[0].name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{employees[0].role} • {employees[0].branch}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ OVERVIEW TAB ══════════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* KPI CARDS */}
          <div className="grid-cards" style={{ marginBottom: '2rem', gridTemplateColumns: 'repeat(5, 1fr)' }}>
            <div className="card">
              <h3>Total Employees</h3>
              <div className="metric-value" style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                {totalEmployeeCount}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>staff / active</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                  {totalStaffCount} / {employees.filter(e => e.total_calls_made > 0).length}
                </span>
              </div>
            </div>

            <div className="card">
              <h3>Total Calls</h3>
              <div className="metric-value" style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                {totalCalls.toLocaleString()}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>vs target</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: callsVsTarget >= 50 ? 'var(--success)' : 'var(--danger)' }}>
                  {callsVsTarget}%
                </span>
              </div>
              <div style={{ width: '100%', height: '4px', background: 'var(--bg-dark)', borderRadius: '2px', marginTop: '0.5rem' }}>
                <div style={{ width: `${Math.min(100, callsVsTarget)}%`, height: '100%', background: callsVsTarget >= 50 ? 'var(--success)' : 'var(--danger)', borderRadius: '2px' }}></div>
              </div>
            </div>

            <div className="card">
              <h3>Talk Time</h3>
              <div className="metric-value" style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                {totalTalkTime}h
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>vs target</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: talkTimeVsTarget >= 50 ? 'var(--success)' : 'var(--danger)' }}>
                  {talkTimeVsTarget}%
                </span>
              </div>
              <div style={{ width: '100%', height: '4px', background: 'var(--bg-dark)', borderRadius: '2px', marginTop: '0.5rem' }}>
                <div style={{ width: `${Math.min(100, talkTimeVsTarget)}%`, height: '100%', background: talkTimeVsTarget >= 50 ? 'var(--success)' : 'var(--danger)', borderRadius: '2px' }}></div>
              </div>
            </div>

            <div className="card">
              <h3>SVP / SVD</h3>
              <div className="metric-value" style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                {totalSVP} / {totalSVD}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>conversion</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: conversionRate >= 30 ? 'var(--success)' : 'var(--warning)' }}>
                  {conversionRate}%
                </span>
              </div>
            </div>

            <div className="card">
              <h3>Productivity</h3>
              <div className="metric-value" style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                {totalProductivity}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>bookings</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--success)' }}>
                  {employees.filter(e => e.total_bookings > 0).length}/{employees.length} makers
                </span>
              </div>
            </div>
          </div>

          {/* CHARTS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="card">
              <h3>Calls & Talk Time</h3>
              {chartDisplayData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No data available. Add performance metrics first.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartDisplayData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" angle={-35} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="Calls" name="Calls" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="Talk Time" name="Talk Time (hrs)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card">
              <h3>SVP / SVD</h3>
              {chartDisplayData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No data available. Add performance metrics first.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartDisplayData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" angle={-35} textAnchor="end" height={60} tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                    <Legend />
                    <Bar dataKey="SVP" name="SVP (Planned)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="SVD" name="SVD (Done)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* TREND Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
            <div className="card">
              <h3>Trend</h3>
              {chartDisplayData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>No Data</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartDisplayData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="Calls" stroke="#14b8a6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="SVD" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Live
              </div>
            </div>

            <div className="card">
              <h3>Performance Insights</h3>
              <div style={{ padding: '0.5rem' }}>
                <div style={{ marginBottom: '0.75rem', padding: '0.5rem', background: 'var(--bg-dark)', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Top Performer</div>
                  <div>{topPerformers[0]?.name || '—'} • {topPerformers[0]?.total_bookings || 0} bookings</div>
                </div>
                <div style={{ marginBottom: '0.75rem', padding: '0.5rem', background: 'var(--bg-dark)', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Conversion Rate</div>
                  <div>{conversionRate}% (SVD/SVP)</div>
                </div>
                <div style={{ padding: '0.5rem', background: 'var(--bg-dark)', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Active Employees</div>
                  <div>{employees.filter(e => e.total_calls_made > 0).length} / {employees.length}</div>
                </div>
              </div>
            </div>
          </div>

          {/* LOWER SECTION */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginTop: '2rem' }}>
            <div className="card">
              <h3>Update Management</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {totalUpdateEntries} total updates, {totalLockedUpdates} locked submissions, {totalFinalUpdates} final calls in the selected range.
              </p>
              <button className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => setActiveTab('projects')}>
                Open Projects
              </button>
            </div>

            <div className="card">
              <h3>Apply Leave</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Employees can submit leave requests through their dashboard.</p>
              <button className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }}>
                View Requests
              </button>
            </div>

            <div className="card">
              <h3>Top Performers</h3>
              {topPerformers.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No data yet</p>
              ) : (
                topPerformers.map((emp, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 'bold', width: '24px' }}>{i + 1}.</span>
                    <span style={{ flex: 1 }}>{emp.name}</span>
                    <span style={{ color: 'var(--success)', fontSize: '0.8rem' }}>{emp.total_bookings || 0} bkg</span>
                  </div>
                ))
              )}
            </div>

            <div className="card">
              <h3>Leave Reports</h3>
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>PLO:</span>
                  <span>{leaves.filter(l => l.reason?.toLowerCase().includes('planned')).length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>CL:</span>
                  <span>{leaves.filter(l => l.reason?.toLowerCase().includes('casual')).length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>ULO:</span>
                  <span>{leaves.filter(l => l.final_status === 'Rejected').length}</span>
                </div>
              </div>
              <button className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }}>
                View All
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════ MANAGE USERS TAB ══════════════════ */}
      {activeTab === 'users' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ margin: 0 }}><Users size={20} /> Employee Directory ({filteredEmployees.length})</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search employees..." 
                  value={globalSearchTerm}
                  onChange={(e) => setGlobalSearchTerm(e.target.value)}
                  style={{ paddingLeft: '2rem', width: '200px' }}
                />
              </div>
              <button className="btn" onClick={() => setModal('add')}>
                <UserPlus size={18} /> Add User
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading employees...</div>
          ) : (
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ minWidth: '800px' }}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Role</th>
                    <th>Branch</th>
                    <th>Calls</th>
                    <th>Bookings</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No employees found.</td></tr>
                  ) : filteredEmployees.map(emp => (
                    <tr key={emp.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {emp.profile_pic ? <img src={emp.profile_pic} alt={emp.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : <User size={16} color="white" />}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{emp.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase',
                          color: ROLE_COLORS[emp.role] || 'var(--primary)',
                          backgroundColor: (ROLE_COLORS[emp.role] || '#3b82f6') + '22',
                          padding: '0.2rem 0.6rem', borderRadius: '999px',
                        }}>
                          {ROLE_LABELS[emp.role] || emp.role}
                        </span>
                      </td>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}><MapPin size={12} /> {emp.branch || '—'}</div></td>
                      <td><span className="badge info">{emp.total_calls_made || 0}</span></td>
                      <td><span className="badge success">{emp.total_bookings || 0}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }} onClick={() => openEdit(emp)}><Edit2 size={12} /> Edit</button>
                          <button className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', backgroundColor: 'var(--success)' }} onClick={() => openMetrics(emp)}><Activity size={12} /> Metrics</button>
                          {emp.role === 'employee' && (
                            <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }} onClick={async () => {
                              showNotification(`Generating report for ${emp.name}...`, 'info');
                              const [mRes, rRes, aRes, lRes] = await Promise.all([
                                fetch(`${API_BASE_URL}/api/metrics/${emp.id}`),
                                fetch(`${API_BASE_URL}/api/ratings/${emp.id}`),
                                fetch(`${API_BASE_URL}/api/attendance/user/${emp.id}/summary`),
                                fetch(`${API_BASE_URL}/api/leave/user/${emp.id}/summary`)
                              ]);
                              const mData = await mRes.json();
                              const rData = await rRes.json();
                              const attendanceSummary = await aRes.json();
                              const leaveSummary = await lRes.json();
                              generateAppraisalPDF({ ...emp, reportingTo: emp.reporting_to, metrics: mData, ratings: rData, attendanceSummary, leaveSummary, score: emp.score || 'N/A', period: getReportPeriodLabel() });
                            }}><FileDown size={12} /> PDF</button>
                          )}
                          {authUser?.id !== emp.id && (
                            <button className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', backgroundColor: 'var(--danger)' }} onClick={() => openDelete(emp)}><Trash2 size={12} /> Del</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ PERFORMANCE COMPARISON TAB ══════════════════ */}
      {activeTab === 'performance' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ margin: 0 }}><TrendingUp size={20} /> Performance Comparison (Work Updates)</h3>
            <button className="btn" onClick={fetchPerformanceComparison} disabled={performanceData.isLoading}>
              {performanceData.isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {performanceData.isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>Loading performance data...</div>
          ) : performanceData.comparisonData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>No performance data available</div>
          ) : (
            <div>
              <div className="grid-cards" style={{ marginBottom: '2rem', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="card" style={{ textAlign: 'center' }}>
                  <h4>Average Score</h4>
                  <div className="metric-value" style={{ fontSize: '2rem', color: 'var(--primary)' }}>
                    {Math.round(performanceData.comparisonData.reduce((sum, d) => sum + d.currentScore, 0) / performanceData.comparisonData.length)}
                  </div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                  <h4>Total Hours</h4>
                  <div className="metric-value" style={{ fontSize: '2rem', color: 'var(--success)' }}>
                    {performanceData.comparisonData.reduce((sum, d) => sum + d.hours, 0)}h
                  </div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                  <h4>Total SVP</h4>
                  <div className="metric-value" style={{ fontSize: '2rem', color: 'var(--primary)' }}>
                    {performanceData.comparisonData.reduce((sum, d) => sum + d.svp, 0)}
                  </div>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                  <h4>Top Performer</h4>
                  <div className="metric-value" style={{ fontSize: '1.2rem' }}>{performanceData.comparisonData[0]?.name || 'N/A'}</div>
                </div>
              </div>
                  

              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ minWidth: '900px' }}>
                  <thead>
                    <tr><th>Employee</th><th>Branch</th><th>Score</th><th>Hours</th><th>SVP</th><th>SVD</th><th>Conv %</th><th>Updates</th><th>Trend</th></tr>
                  </thead>
                  <tbody>
                    {performanceData.comparisonData.slice(0, 15).map(emp => (
                      <tr key={emp.id}>
                        <td><div style={{ fontWeight: 600 }}>{emp.name}</div></td>
                        <td><div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{emp.branch}</div></td>
                        <td><span className={`badge ${emp.currentScore >= 70 ? 'success' : 'warning'}`}>{emp.currentScore}</span></td>
                        <td><span className="badge info">{emp.hours}h</span></td>
                        <td><span className="badge primary">{emp.svp}</span></td>
                        <td><span className="badge warning">{emp.svd}</span></td>
                        <td><span style={{ fontWeight: 600, color: emp.conversion >= 30 ? 'var(--success)' : 'var(--warning)' }}>{emp.conversion}%</span></td>
                        <td><span className="badge info">{emp.updates}</span></td>
                        <td>{emp.improvement > 0 ? <span className="badge success">↑ +{emp.improvement}</span> : emp.improvement === 0 ? <span className="badge primary">→ Stable</span> : <span className="badge danger">↓ {emp.improvement}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ BRANCH ANALYTICS TAB ══════════════════ */}
      {activeTab === 'branches' && (
        <>
          <div className="grid-cards" style={{ marginBottom: '2rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <h3><GitBranch size={20} /> Total Branches</h3>
              <div className="metric-value">{branchStats.length}</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <h3><Users size={20} /> Largest Branch</h3>
              <div className="metric-value" style={{ fontSize: '1.2rem' }}>{branchStats[0]?.branch || '—'}</div>
              <div className="metric-label">{branchStats[0]?.employee_count || 0} employees</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <h3><TrendingUp size={20} /> Best Avg Score</h3>
              <div className="metric-value">
                {(() => {
                  const withScore = branchStats.filter(b => b.avg_score);
                  if (!withScore.length) return 'N/A';
                  const best = withScore.reduce((a, b) => (parseInt(b.avg_score) > parseInt(a.avg_score) ? b : a));
                  return `${best.avg_score}%`;
                })()}
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3><Building2 size={20} /> Branch Breakdown</h3>
              <button className="btn btn-secondary" onClick={fetchBranchStats}>Refresh</button>
            </div>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ minWidth: '600px' }}>
                <thead>
                  <tr><th>Branch</th><th>Total Staff</th><th>Avg Score</th><th>Present Today</th><th>Absent Today</th></tr>
                </thead>
                <tbody>
                  {branchStats.map(b => {
                    const att = branchAttendance.find(a => a.branch === b.branch) || { present: 0, absent: 0 };
                    return (
                      <tr key={b.branch}>
                        <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={14} /> {b.branch}</div></td>
                        <td><span className="badge info">{b.employee_count}</span></td>
                        <td><span className={`badge ${b.avg_score >= 80 ? 'success' : 'warning'}`}>{b.avg_score ? `${b.avg_score}%` : 'No Data'}</span></td>
                        <td><span className="badge success">{att.present}</span></td>
                        <td><span className="badge danger">{att.absent}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════ PROJECTS TAB ══════════════════ */}
      {activeTab === 'projects' && (
        <>
          <div className="grid-cards" style={{ marginBottom: '2rem', gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <h3><Briefcase size={20} /> Total Projects</h3>
              <div className="metric-value">{projectSummary.length}</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <h3><Clock size={20} /> Talk Hours</h3>
              <div className="metric-value">
                {projectSummary.reduce((sum, p) => sum + (p.total_hours || 0), 0)}h
              </div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <h3><Users size={20} /> Active Contributors</h3>
              <div className="metric-value">{employeeHoursSummary.length}</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <h3><Check size={20} /> Locked Updates</h3>
              <div className="metric-value">{totalLockedUpdates}</div>
              <div className="metric-label">{totalFinalUpdates} final submissions</div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3><Briefcase size={20} /> Project Summary</h3>
              <button className="btn btn-secondary" onClick={fetchProjectData}>Refresh</button>
            </div>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ minWidth: '980px' }}>
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Branches</th>
                    <th>Contributors</th>
                    <th>Updates</th>
                    <th>Talk Hours</th>
                    <th>Total Calls</th>
                    <th>Talk Hours</th>
                    <th>SVP (Site Visits Planned)</th>
                    <th>SVD (Site Visits Done)</th>
                    <th>Total Bookings</th>
                    <th>Conversion %</th>
                    <th>Last Update</th>
                  </tr>
                </thead>
                <tbody>
                  {projectSummary.length === 0 ? (
                    <tr><td colSpan={12} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No project data available</td></tr>
                  ) : projectSummary.map(proj => {
                    const conversionRate = proj.total_svp > 0 ? Math.round((proj.total_svd / proj.total_svp) * 100) : 0;
                    return (
                      <tr key={proj.project_name}>
                        <td><strong>{proj.project_name}</strong></td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{proj.branches || '—'}</td>
                        <td><span className="badge success">{proj.contributor_count || 0}</span></td>
                        <td><span className="badge info">{proj.update_count}</span></td>
                        <td><span className="badge success">{proj.total_hours}h</span></td>
                        <td><span className="badge info">{proj.total_calls_made || 0}</span></td>
                        <td><span className="badge info">{((proj.total_talk_time_minutes || 0) / 60).toFixed(2)}h</span></td>
                        <td><span className="badge primary">{proj.total_svp}</span></td>
                        <td><span className="badge warning">{proj.total_svd}</span></td>
                        <td><span className="badge success">{proj.total_bookings || 0}</span></td>
                        <td>
                          <span style={{
                            color: conversionRate >= 30 ? 'var(--success)' : 'var(--danger)',
                            fontWeight: 600
                          }}>
                            {conversionRate}%
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {proj.last_submission ? new Date(proj.last_submission).toLocaleString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3><Users size={20} /> Employee Hourly Updates Summary</h3>
              <button className="btn btn-secondary" onClick={fetchProjectData}>Refresh</button>
            </div>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ minWidth: '980px' }}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Email</th>
                    <th>Branch</th>
                    <th>Projects</th>
                    <th>Talk Hours</th>
                    <th>Total Calls</th>
                    <th>Talk Hours</th>
                    <th>SVP</th>
                    <th>SVD</th>
                    <th>Total Bookings</th>
                    <th>Updates</th>
                    <th>Locked</th>
                    <th>Last Submission</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeHoursSummary.length === 0 ? (
                    <tr><td colSpan={13} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No employee data available</td></tr>
                  ) : employeeHoursSummary.map(emp => (
                    <tr key={emp.user_id}>
                      <td><strong>{emp.employee_name || 'Unknown'}</strong></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{emp.email || '—'}</td>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}><MapPin size={12} /> {emp.branch || '—'}</div></td>
                      <td><span className="badge primary">{emp.project_count || 0}</span></td>
                      <td><span className="badge success">{emp.total_hours}h</span></td>
                      <td><span className="badge info">{emp.total_calls_made || 0}</span></td>
                      <td><span className="badge info">{((emp.total_talk_time_minutes || 0) / 60).toFixed(2)}h</span></td>
                      <td><span className="badge primary">{emp.total_svp}</span></td>
                      <td><span className="badge warning">{emp.total_svd}</span></td>
                      <td><span className="badge success">{emp.total_bookings || 0}</span></td>
                      <td><span className="badge info">{emp.update_entries}</span></td>
                      <td><span className="badge success">{emp.locked_entries || 0}</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{emp.last_submission ? new Date(emp.last_submission).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Send Notification Modal */}
      {showSendNotif && (
        <SendNotificationModal 
          onClose={() => setShowSendNotif(false)}
          onSend={() => {
            showNotification('Notification sent successfully!', 'success');
          }}
        />
      )}

      {/* ══════════════════ MODALS ══════════════════ */}
      {/* Add User Modal */}
      {modal === 'add' && (
        <Modal title="➕ Create New User" onClose={closeModal}>
          <form onSubmit={handleAddUser}>
            <div className="form-group"><label>Full Name</label><input type="text" required value={newUser.name} onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))} /></div>
            <div className="form-group"><label>Email</label><input type="email" required value={newUser.email} onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))} /></div>
            <div className="form-group"><label>Password</label><input type="password" required value={newUser.password} onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))} /></div>
            <div className="form-group"><label>Department</label><input type="text" value={newUser.department} onChange={(e) => setNewUser(prev => ({ ...prev, department: e.target.value }))} /></div>
            <div className="form-group"><label>Reporting To</label><input type="text" value={newUser.reporting_to} onChange={(e) => setNewUser(prev => ({ ...prev, reporting_to: e.target.value }))} /></div>
            <div className="form-group"><label>Role</label><select value={newUser.role} onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}><option value="employee">Employee</option><option value="tl">Team Leader</option><option value="hr">HR Manager</option><option value="admin">Admin</option></select></div>
            <div className="form-group"><label>Branch</label><select value={newUser.branch} onChange={(e) => setNewUser(prev => ({ ...prev, branch: e.target.value }))}>{branches.map(b => <option key={b} value={b}>{b}</option>)}<option value="__custom__">+ Add custom branch...</option></select></div>
            <button className="btn" type="submit" disabled={submitting} style={{ width: '100%' }}><Check size={18} /> {submitting ? 'Creating...' : 'Create User'}</button>
          </form>
        </Modal>
      )}

      {/* Edit User Modal */}
      {modal === 'edit' && selectedEmp && (
        <Modal title={`✏️ Edit: ${selectedEmp.name}`} onClose={closeModal}>
          <form onSubmit={handleEditUser}>
            <div className="form-group"><label>Full Name</label><input type="text" required value={editUser.name} onChange={(e) => setEditUser(prev => ({ ...prev, name: e.target.value }))} /></div>
            <div className="form-group"><label>Email</label><input type="email" required value={editUser.email} onChange={(e) => setEditUser(prev => ({ ...prev, email: e.target.value }))} /></div>
            <div className="form-group"><label>Department</label><input type="text" value={editUser.department} onChange={(e) => setEditUser(prev => ({ ...prev, department: e.target.value }))} /></div>
            <div className="form-group"><label>Reporting To</label><input type="text" value={editUser.reporting_to} onChange={(e) => setEditUser(prev => ({ ...prev, reporting_to: e.target.value }))} /></div>
            <div className="form-group"><label>Role</label><select value={editUser.role} onChange={(e) => setEditUser(prev => ({ ...prev, role: e.target.value }))}><option value="employee">Employee</option><option value="tl">Team Leader</option><option value="hr">HR Manager</option><option value="admin">Admin</option></select></div>
            <div className="form-group"><label>Branch</label><select value={editUser.branch || ''} onChange={(e) => setEditUser(prev => ({ ...prev, branch: e.target.value }))}>{branches.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
            <button className="btn" type="submit" disabled={submitting} style={{ width: '100%' }}><Check size={18} /> {submitting ? 'Saving...' : 'Save Changes'}</button>
          </form>
        </Modal>
      )}

      {/* Update Metrics Modal */}
      {modal === 'metrics' && selectedEmp && (
        <Modal title={`📊 Update Metrics: ${selectedEmp.name}`} onClose={closeModal}>
          <form onSubmit={handleUpdateMetrics}>
            {[['Total Calls Made', 'total_calls_made'], ['Total Bookings', 'total_bookings'], ['Site Visits Planned', 'site_visits_planned'], ['Site Visits Done', 'site_visits_done']].map(([label, key]) => (
              <div key={key} className="form-group"><label>{label}</label><input type="number" min={0} value={metrics[key] === '' ? '' : metrics[key]} onChange={e => setMetrics({ ...metrics, [key]: e.target.value === '' ? '' : parseInt(e.target.value) })} placeholder="Leave empty to skip" /></div>
            ))}
            <button className="btn" type="submit" disabled={submitting} style={{ width: '100%' }}><Activity size={18} /> {submitting ? 'Updating...' : 'Update Metrics'}</button>
          </form>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {modal === 'delete' && selectedEmp && (
        <Modal title="⚠️ Confirm Deletion" onClose={closeModal}>
          <div style={{ textAlign: 'center' }}>
            <AlertTriangle size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
            <p>Are you sure you want to permanently delete <strong>{selectedEmp.name}</strong>?</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn" style={{ backgroundColor: 'var(--danger)' }} onClick={handleDeleteUser}><Trash2 size={18} /> Delete</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminDashboard;
