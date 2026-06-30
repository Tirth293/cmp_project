import React, { useState, useEffect } from 'react';
import { useNotify } from '../context/NotificationContext';
import { generateBiMonthlyReportPDF } from '../utils/pdfExport';
import { generateBiMonthlyReportDOC } from '../utils/docExport';
import { FileText, Download, Calendar, MapPin, Users, TrendingUp, AlertCircle, CheckCircle, FileDown, FileCode, Copy, ClipboardCheck } from 'lucide-react';

const BiMonthlyReport = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [copied, setCopied] = useState(false);
  const { showNotification } = useNotify();

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let url = '/api/reports/bi-monthly/generate';
      if (startDate && endDate) {
        url += `?start_date=${startDate}&end_date=${endDate}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to generate report');
      }

      setReportData(data);
      // Automatically archive this generated report
      autoSaveReport(data);
      // Automatically export to PDF as requested
      setTimeout(() => generateBiMonthlyReportPDF(data), 500);
    } catch (error) {
      console.error('Fetch error:', error);
      showNotification(`Failed to fetch report data: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const autoSaveReport = async (data) => {
    if (!data) return;
    try {
      await fetch('/api/reports/bi-monthly/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: data.startDate,
          endDate: data.endDate,
          reportData: data
        })
      });
      // Silent save, no notification to avoid cluttering UI
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const generateReportText = () => {
    if (!reportData) return '';

    let text = `Branches: ${reportData.branches.join(' & ')}\nDuration: ${reportData.duration}\n\n`;

    reportData.employees.forEach((emp, index) => {
      text += `Employee ${index + 1}:\n`;
      text += `Branch: ${emp.branch || 'N/A'}\n`;
      text += `Total Calls: ${emp.total_calls || 0}\n`;
      text += `SVP: ${emp.total_svp || 0}\n`;
      text += `SVD: ${emp.total_svd || 0}\n`;
      text += `Bookings: ${emp.total_bookings || 0}\n`;
      text += `Leaves Taken: ${emp.total_leaves || 0}\n`;
      text += `UL: ${emp.total_ul || 0}\n`;
      text += `Punctuality (%): ${Number(emp.avg_punctuality || 100).toFixed(1)}%\n`;
      text += `Overall Rating: ${Number(emp.overall_rating || 0).toFixed(1)}\n`;
      text += `Performance Analysis:\n`;
      text += `- Strengths: ${emp.strengths || 'N/A'}\n`;
      text += `- Areas of Improvement: ${emp.areas_of_improvement || 'N/A'}\n`;
      text += `- Behavior & Discipline: ${emp.behavior_discipline || 'N/A'}\n`;
      text += `- Target Achievement: ${emp.target_achievement || 'N/A'}\n\n`;
    });

    text += `Overall Summary:\n`;
    text += `Total Calls: ${reportData.summary.total_calls}\n`;
    text += `Total SVP: ${reportData.summary.total_svp}\n`;
    text += `Total SVD: ${reportData.summary.total_svd}\n`;
    text += `Total Bookings: ${reportData.summary.total_bookings}\n`;
    text += `Average Punctuality: ${Number(reportData.summary.avg_punctuality || 0).toFixed(1)}%\n`;
    text += `Total Leaves / UL: ${reportData.summary.total_leaves} / ${reportData.summary.total_ul}\n\n`;

    text += `Final Performance Insights:\n`;
    text += `Best Performer: ${reportData.insights.bestPerformer}\n`;
    text += `Needs Improvement: ${reportData.insights.needsImprovement}\n`;
    text += `Team Productivity Level: ${reportData.insights.productivityLevel}\n`;
    text += `Recommendation: ${reportData.insights.recommendation}\n`;

    return text;
  };

  const handleCopyReport = () => {
    const text = generateReportText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    showNotification('Report copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadText = () => {
    const text = generateReportText();
    if (!text) return;

    const element = document.createElement("a");
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "2_Month_Performance_Report.txt";
    document.body.appendChild(element);
    element.click();
    showNotification('Report downloaded as plain text', 'success');
  };

  if (loading) return <div className="flex-center" style={{ height: '80vh' }}><div className="spinner"></div></div>;
  if (!reportData) return <div className="flex-center" style={{ height: '80vh' }}><h3>No report data found.</h3></div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <FileText size={36} color="var(--primary)" />
            2-Month Performance Report
          </h1>
          <p>Comprehensive bi-monthly analysis across Ashram Road & Maninagar branches</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>Start Date</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: '0.4rem', fontSize: '0.85rem' }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>End Date</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: '0.4rem', fontSize: '0.85rem' }}
            />
          </div>
          <button className="btn" onClick={fetchReport} style={{ padding: '0.6rem 1rem' }}>
            Generate
          </button>
          <button className="btn btn-secondary" onClick={handleCopyReport} title="Copy to Clipboard">
            {copied ? <ClipboardCheck size={20} color="var(--success)" /> : <Copy size={20} />} {copied ? 'Copied' : 'Copy'}
          </button>
          <button className="btn btn-secondary" onClick={handleDownloadText} title="Export as TXT">
            <FileCode size={20} /> TXT
          </button>
          <button className="btn btn-secondary" onClick={() => generateBiMonthlyReportDOC(reportData)} title="Export as Word">
            <FileText size={20} /> DOC
          </button>
          <button className="btn" onClick={() => generateBiMonthlyReportPDF(reportData)} title="Export as PDF">
            <FileDown size={20} /> PDF
          </button>
        </div>
      </div>

      <div className="grid-cards" style={{ marginBottom: '3rem' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary-light) 0%, transparent 100%)' }}>
          <h3><MapPin size={20} /> Branches</h3>
          <div className="metric-value" style={{ fontSize: '1.5rem' }}>Ashram Road & Maninagar</div>
        </div>
        <div className="card">
          <h3><Calendar size={20} /> Duration</h3>
          <div className="metric-value" style={{ fontSize: '1.5rem' }}>Last 2 Months</div>
        </div>
        <div className="card">
          <h3><TrendingUp size={20} /> Global Productivity</h3>
          <div className="metric-value" style={{ fontSize: '1.5rem' }}>{reportData.insights.productivityLevel}</div>
        </div>
      </div>

      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Users size={24} color="var(--primary)" /> Individual Employee Performance
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        {reportData.employees.map((emp, index) => (
          <div key={emp.id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ 
              position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', 
              backgroundColor: emp.overall_rating >= 4 ? 'var(--success)' : emp.overall_rating >= 3 ? 'var(--warning)' : 'var(--danger)' 
            }}></div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.25rem' }}>{emp.name}</h3>
                <span className="badge info" style={{ marginTop: '0.5rem' }}>{emp.branch}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{emp.overall_rating || 0}/5</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rating</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: 'var(--bg-dark)', padding: '1rem', borderRadius: '12px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{emp.total_calls}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>CALLS</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{emp.total_bookings}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>BOOKINGS</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{Number(emp.avg_punctuality || 0).toFixed(1)}%</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>PUNCTUALITY</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <strong style={{ fontSize: '0.85rem', color: 'var(--success)' }}>Strengths:</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{emp.strengths || 'Consistent performance across calls.'}</p>
              </div>
              <div>
                <strong style={{ fontSize: '0.85rem', color: 'var(--warning)' }}>Areas for Improvement:</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{emp.areas_of_improvement || 'Lead conversion ratio.'}</p>
              </div>
              <div>
                <strong style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>Behavior & Discipline:</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{emp.behavior_discipline || 'Excellent'}</p>
              </div>
              <div>
                <strong style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>Target Achievement:</strong>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{emp.target_achievement || 'Met 90% of monthly goals.'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-cards">
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Overall Summary</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem' }}>
            <div>
              <label>Total Calls</label>
              <div className="metric-value" style={{ fontSize: '2rem' }}>{reportData.summary.total_calls}</div>
            </div>
            <div>
              <label>Total Bookings</label>
              <div className="metric-value" style={{ fontSize: '2rem', color: 'var(--success)' }}>{reportData.summary.total_bookings}</div>
            </div>
            <div>
              <label>Total SVP/SVD</label>
              <div className="metric-value" style={{ fontSize: '2rem' }}>{reportData.summary.total_svp}/{reportData.summary.total_svd}</div>
            </div>
            <div>
              <label>Leaves / UL</label>
              <div className="metric-value" style={{ fontSize: '2rem', color: 'var(--danger)' }}>{reportData.summary.total_leaves}/{reportData.summary.total_ul}</div>
            </div>
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Final Insights</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <CheckCircle size={20} color="var(--success)" />
              <div>
                <strong>Best Performer:</strong>
                <div style={{ color: 'var(--primary)', fontWeight: 700 }}>{reportData.insights.bestPerformer}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <AlertCircle size={20} color="var(--danger)" />
              <div>
                <strong>Needs Improvement:</strong>
                <div style={{ color: 'var(--danger)', fontWeight: 700 }}>{reportData.insights.needsImprovement}</div>
              </div>
            </div>
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '12px' }}>
              <strong>Recommendation:</strong>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {reportData.insights.recommendation}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BiMonthlyReport;
