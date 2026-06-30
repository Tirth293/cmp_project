import React, { useState, useEffect } from 'react';
import { FileText, Download, Filter, TrendingUp, Users, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import companyLogo from './Transparent logo.png?inline';
import API_BASE_URL from '../utils/api';

const addReportHeader = (doc, title) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(245, 248, 252);
  doc.rect(0, 0, pageWidth, 38, 'F');

  try {
    doc.addImage(companyLogo, 'PNG', 18, 8, 20, 20);
  } catch (error) {
    console.warn('Unable to add company logo to PDF:', error);
  }

  doc.setFontSize(20);
  doc.setTextColor(59, 130, 246);
  doc.text(title, pageWidth / 2, 18, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 27, { align: 'center' });
};

const ReportsPage = () => {
  const [reportType, setReportType] = useState('monthly');
  const [summary, setSummary] = useState({ total_employees: 0, avg_score: 0 });
  const [trends, setTrends] = useState([]);
  const [archivedReports, setArchivedReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      const [summaryRes, trendsRes, archiveRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/reports/summary`),
        fetch(`${API_BASE_URL}/api/reports/trends`),
        fetch(`${API_BASE_URL}/api/reports/all`)
      ]);
      
      const summaryData = await summaryRes.json();
      const trendsData = await trendsRes.json();
      const archiveData = await archiveRes.json();
      
      setSummary(summaryData.summary || { total_employees: 0, avg_score: 0 });
      setTrends(trendsData || []);
      setArchivedReports(archiveData || []);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    addReportHeader(doc, 'Monthly Performance Report');
    
    doc.setFontSize(12);
    doc.text('Employee Overview:', 14, 50);
    doc.setFontSize(10);
    doc.text(`Total Employees: ${summary.total_employees}`, 14, 57);
    doc.text(`Average Employee Score: ${Math.round(summary.avg_score || 0)}%`, 14, 62);

    const tableColumn = ["Month", "Avg Productivity (Calls)", "Avg Achievement (%)"];
    const tableRows = trends.map(t => [
      t.name,
      t.productivity,
      `${t.achievement}%`
    ]);

    doc.autoTable({
      startY: 72,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [139, 92, 246] }
    });

    doc.save(`Performance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) return <div>Loading reports...</div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Performance Reports</h1>
          <p>Deep dive into company and team performance analytics</p>
        </div>
        <button className="btn" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Download size={18} /> Download PDF
        </button>
      </div>

      <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3>Total Employees</h3>
          <div className="metric-value" style={{ fontSize: '2rem' }}>{summary.total_employees}</div>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3>Avg Company Score</h3>
          <div className="metric-value" style={{ fontSize: '2rem' }}>{Math.round(summary.avg_score || 0)}%</div>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3>Top Performers</h3>
          <div className="metric-value" style={{ fontSize: '2rem' }}>15</div>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3>Pending Reviews</h3>
          <div className="metric-value" style={{ fontSize: '2rem' }}>8</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h3><TrendingUp size={20} /> Performance Trends</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
              <option>April 2026</option>
              <option>March 2026</option>
            </select>
            <button className="btn"><Download size={18} /> Export CSV</button>
          </div>
        </div>
        
        <div style={{ height: '400px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" tickFormatter={(val) => `${val}%`} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
              <Line type="monotone" dataKey="productivity" name="Avg Calls" stroke="#3b82f6" strokeWidth={3} />
              <Line type="monotone" dataKey="achievement" name="Avg Score" stroke="#8b5cf6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3><FileText size={20} /> Generated Reports Archive</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Report Name</th>
                <th>Type</th>
                <th>Date Generated</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {archivedReports.map(report => (
                <tr key={report.id}>
                  <td>{report.report_name}</td>
                  <td>{report.type}</td>
                  <td>{new Date(report.date_generated).toLocaleDateString()}</td>
                  <td><span className={`badge ${report.status === 'Finalized' ? 'success' : 'warning'}`}>{report.status}</span></td>
                  <td><button className="btn-secondary" style={{ padding: '0.4rem 0.8rem' }}>View</button></td>
                </tr>
              ))}
              {archivedReports.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No reports found in archive.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
