import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Target, CheckCircle, Clock, ArrowUpRight, BarChart3 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const EmployeePerformance = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchMetrics();
    }
  }, [user]);

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`/api/metrics/${user.id}`);
      const data = await response.json();
      setMetrics(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('default', { month: 'short', year: 'numeric' });
  };

  // Prepare chart data
  const chartData = [...metrics].reverse().map(m => ({
    name: formatDate(m.month_year),
    Calls: m.total_calls_made,
    Bookings: m.total_bookings,
    Visits: m.site_visits_done
  }));

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <TrendingUp size={36} color="var(--primary)" />
          <div>
            <h1>Monthly Performance Session</h1>
            <p>Detailed track record of your productivity and goal achievements</p>
          </div>
        </div>
      </div>

      <div className="grid-cards" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <h3><Target size={20} /> Average Calls</h3>
          <div className="metric-value">
            {metrics.length > 0 
              ? Math.round(metrics.reduce((acc, m) => acc + m.total_calls_made, 0) / metrics.length) 
              : 0}
          </div>
          <div className="metric-label">Per month average</div>
        </div>
        <div className="card">
          <h3><CheckCircle size={20} /> Total Bookings</h3>
          <div className="metric-value">
            {metrics.reduce((acc, m) => acc + m.total_bookings, 0)}
          </div>
          <div className="metric-label" style={{ color: 'var(--success)' }}>Cumulative success</div>
        </div>
        <div className="card">
          <h3><BarChart3 size={20} /> Total Visits</h3>
          <div className="metric-value">
            {metrics.reduce((acc, m) => acc + m.site_visits_done, 0)}
          </div>
          <div className="metric-label">Client interactions</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3><ArrowUpRight size={20} /> Performance Trend</h3>
        <div style={{ height: '300px', marginTop: '2rem' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border)', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Bar dataKey="Calls" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Bookings" fill="var(--success)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3><Clock size={20} /> Historical Monthly Session</h3>
        {loading ? (
          <p>Loading session data...</p>
        ) : metrics.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No historical metrics found.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Total Calls</th>
                  <th>Bookings</th>
                  <th>Site Visits</th>
                  <th>Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{formatDate(m.month_year)}</td>
                    <td>{m.total_calls_made}</td>
                    <td><span className="badge success">{m.total_bookings}</span></td>
                    <td>{m.site_visits_done}</td>
                    <td>
                      <span className="badge info">
                        {m.total_calls_made > 0 ? ((m.total_bookings / m.total_calls_made) * 100).toFixed(1) : 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeePerformance;
