import React, { useState, useEffect } from 'react';
import { Settings, Shield, Bell, Database, Save, Percent } from 'lucide-react';
import { useNotify } from '../context/NotificationContext';

const SettingsPage = () => {
  const [weightages, setWeightages] = useState({
    productivity: 60,
    leadership: 30,
    discipline: 10
  });
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotify();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('https://cmp-project.onrender.com/api/settings');
      const data = await response.json();
      if (data.appraisal_weightages) {
        setWeightages(data.appraisal_weightages);
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (weightages.productivity + weightages.leadership + weightages.discipline !== 100) {
      showNotification("Weightages must total 100%", "error");
      return;
    }

    try {
      const response = await fetch('https://cmp-project.onrender.com/api/settings/appraisal_weightages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: weightages })
      });
      if (response.ok) {
        showNotification("System weightages updated successfully!", "success");
      }
    } catch (err) {
      showNotification("Failed to save settings", "error");
    }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>System Settings</h1>
        <p>Configure appraisal parameters and system preferences</p>
      </div>

      <div className="grid-cards">
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3><Percent size={20} /> Appraisal Weightages</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Define how different metrics contribute to the final appraisal score.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label>Productivity (Output)</label>
                <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{weightages.productivity}%</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" 
                value={weightages.productivity}
                onChange={(e) => setWeightages({...weightages, productivity: parseInt(e.target.value)})}
                style={{ width: '100%', accentColor: 'var(--primary)' }}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label>Leadership & Teamwork</label>
                <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{weightages.leadership}%</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" 
                value={weightages.leadership}
                onChange={(e) => setWeightages({...weightages, leadership: parseInt(e.target.value)})}
                style={{ width: '100%', accentColor: 'var(--primary)' }}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <label>Discipline & Attendance</label>
                <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{weightages.discipline}%</span>
              </div>
              <input 
                type="range" 
                min="0" max="100" 
                value={weightages.discipline}
                onChange={(e) => setWeightages({...weightages, discipline: parseInt(e.target.value)})}
                style={{ width: '100%', accentColor: 'var(--primary)' }}
              />
            </div>

            <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: (weightages.productivity + weightages.leadership + weightages.discipline === 100) ? 'var(--primary-light)' : 'rgba(239, 68, 68, 0.1)', color: (weightages.productivity + weightages.leadership + weightages.discipline === 100) ? 'var(--primary)' : 'var(--danger)', fontWeight: '600', textAlign: 'center' }}>
              Total: {weightages.productivity + weightages.leadership + weightages.discipline}% 
              {weightages.productivity + weightages.leadership + weightages.discipline !== 100 && " (Must equal 100%)"}
            </div>

            <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={handleSaveSettings}>
              <Save size={18} /> Save Weightages
            </button>
          </div>
        </div>

        <div className="card">
          <h3><Shield size={20} /> Security Policy</h3>
          <div className="form-group">
            <label>Session Timeout (Minutes)</label>
            <input type="number" defaultValue="30" />
          </div>
          <div className="form-group">
            <label>Password Complexity</label>
            <select>
              <option>Standard</option>
              <option>High (Includes Symbols)</option>
            </select>
          </div>
          <button className="btn btn-secondary" style={{ width: '100%' }}>Update Security</button>
        </div>

        <div className="card">
          <h3><Bell size={20} /> Notifications</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked style={{ width: 'auto' }} /> Email on Task Assignment
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked style={{ width: 'auto' }} /> Appraisals Ready Reminder
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: 'auto' }} /> System Maintenance Alerts
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
