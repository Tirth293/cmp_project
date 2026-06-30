import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';
import { CalendarDays, CheckCircle, XCircle, Clock, User, Filter, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import companyLogo from './Transparent logo.png?inline';

const addPdfHeader = (doc, title) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(245, 248, 252);
  doc.rect(0, 0, pageWidth, 38, 'F');

  try {
    doc.addImage(companyLogo, 'PNG', 14, 8, 20, 20);
  } catch (error) {
    console.warn('Unable to add logo to leave PDF:', error);
  }

  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text(title, pageWidth / 2, 22, { align: 'center' });
};

const LeaveManagement = () => {
  const { user } = useAuth();
  const { showNotification } = useNotify();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/leave/all?role=${user.role}`);
      const data = await response.json();
      setLeaves(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch leaves:", err);
      showNotification('Failed to load leave requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ✅ HR-ONLY approval (single step)
  const handleApproveReject = async (leaveId, status) => {
    // Only HR and Admin can approve (Admin can also approve for oversight)
    if (user.role !== 'hr' && user.role !== 'admin') {
      showNotification('Only HR can approve leave requests', 'warning');
      return;
    }
    
    try {
      const response = await fetch(`/api/leave/${leaveId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: status, 
          role: user.role,
          approverId: user.id,
          singleStep: true  // Flag for backend to bypass dual approval
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        showNotification(data.message, 'success');
        fetchLeaves();
      } else {
        showNotification(data.error || 'Update failed', 'warning');
      }
    } catch (err) {
      showNotification('Server error during approval', 'error');
    }
  };

  const filteredLeaves = leaves.filter(l => {
    const matchesFilter = filter === 'All' || l.final_status === filter;
    const matchesSearch = l.employee_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved': 
        return <span className="badge success"><CheckCircle size={12} /> Approved</span>;
      case 'Rejected': 
        return <span className="badge danger"><XCircle size={12} /> Rejected</span>;
      case 'Not Required': 
        return <span className="badge info" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>Not Required</span>;
      default: 
        return <span className="badge warning"><Clock size={12} /> Pending</span>;
    }
  };

  const handleDownloadReport = () => {
    const doc = new jsPDF();
    
    // Add Header
    addPdfHeader(doc, 'Leave Management Report');
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 48);
    doc.text(`Filter Status: ${filter}`, 14, 53);
    
    // ✅ Updated table columns - HR only
    const tableColumn = ["Employee", "Branch", "Dept", "From", "To", "Reason", "Status", "Approved By", "Approved At"];
    const tableRows = filteredLeaves.map(l => [
      l.employee_name,
      l.branch || '-',
      l.department,
      new Date(l.from_date).toLocaleDateString(),
      new Date(l.to_date).toLocaleDateString(),
      l.reason,
      l.final_status,
      l.approved_by || (l.final_status === 'Approved' ? 'HR' : '-'),
      l.approved_at ? new Date(l.approved_at).toLocaleString() : '-'
    ]);

    doc.autoTable({
      startY: 62,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
      columnStyles: {
        4: { cellWidth: 30 } // Reason column width
      }
    });

    doc.save(`Leave_Report_${filter}_${new Date().toISOString().split('T')[0]}.pdf`);
    showNotification('Leave report downloaded successfully', 'success');
  };

  return (
    <div className="main-content">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Leave Management</h1>
          <p>HR approval system</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Search employee..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                padding: '0.65rem 1rem 0.65rem 2.5rem', 
                borderRadius: '8px', 
                background: 'var(--bg-card)', 
                color: 'white', 
                border: '1px solid var(--border)',
                width: '250px'
              }}
            />
            <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Filter size={18} />
            </div>
          </div>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            style={{ padding: '0.65rem 1rem', borderRadius: '8px', background: 'var(--bg-card)', color: 'white', border: '1px solid var(--border)' }}
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <button className="btn btn-secondary" onClick={fetchLeaves}>Refresh</button>
          <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={handleDownloadReport}>
            <Download size={18} /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid-cards" style={{ gridTemplateColumns: '1fr' }}>
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Branch</th>
                  <th>Duration</th>
                  <th>Reason</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th>Approved By</th>
                  <th>Approved At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>Loading requests...</td></tr>
                ) : filteredLeaves.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No leave requests found.</td></tr>
                ) : filteredLeaves.map((leave) => (
                  <tr key={leave.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
                          <User size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{leave.employee_name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{leave.department}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{leave.branch || '-'}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{new Date(leave.from_date).toLocaleDateString()}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>to {new Date(leave.to_date).toLocaleDateString()}</div>
                    </td>
                    <td style={{ maxWidth: '200px' }}>
                      <div style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>"{leave.reason}"</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {getStatusBadge(leave.final_status)}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {leave.approved_by || (leave.final_status === 'Approved' ? 'HR' : '-')}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {leave.approved_at ? new Date(leave.approved_at).toLocaleString() : '-'}
                      </div>
                    </td>
                    <td>
                      {leave.final_status === 'Pending' && (user.role === 'hr' || user.role === 'admin') ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn" 
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', backgroundColor: 'var(--success)' }}
                            onClick={() => handleApproveReject(leave.id, 'Approved')}
                          >
                            <CheckCircle size={12} /> Approve
                          </button>
                          <button 
                            className="btn" 
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', backgroundColor: 'var(--danger)' }}
                            onClick={() => handleApproveReject(leave.id, 'Rejected')}
                          >
                            <XCircle size={12} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {leave.final_status === 'Approved' ? '✓ Approved by HR' : 
                           leave.final_status === 'Rejected' ? '✗ Rejected by HR' : 
                           'Awaiting HR action'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ✅ Updated Policy Card */}
      <div className="card" style={{ marginTop: '2rem', background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
        <h3>📋 Leave Approval Policy</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
          All leave requests are reviewed and approved by the <strong>HR Manager</strong>. 
          Once approved or rejected by HR, the status is final. Employees will receive 
          notifications about their leave request status via the notification center.
        </p>
      </div>
    </div>
  );
};

export default LeaveManagement;
