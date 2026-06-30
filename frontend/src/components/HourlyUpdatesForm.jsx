import React, { useEffect, useState } from 'react';
import { AlertCircle, Briefcase, Building2, CalendarClock, Loader, Phone, Route, Save, Send, Timer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotificationContext';

const ALLOWED_SLOTS = [
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '3:00 PM',
  '4:00 PM',
  '5:00 PM',
  '6:30 PM'
];

const fieldStyle = (disabled = false) => ({
  width: '100%',
  padding: '0.75rem 0.85rem',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'white',
  fontSize: '0.9rem',
  outline: 'none',
  opacity: disabled ? 0.6 : 1
});

const labelStyle = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 700,
  marginBottom: '0.45rem',
  color: 'var(--text-secondary)'
};

const metricCardStyle = {
  padding: '1rem',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  background: 'rgba(255,255,255,0.02)'
};

const HourlyUpdatesForm = () => {
  const { user } = useAuth();
  const { showNotification } = useNotify();
  const selectedBranch = user?.branch || 'Ashram Road';

  const [form, setForm] = useState({
    project_name: '',
    branch: selectedBranch,
    update_slot: '',
    total_calls_made: '',
    total_talk_time_minutes: '',
    svp: '',
    svd: '',
    total_bookings: '',
    notes: ''
  });

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [todayUpdates, setTodayUpdates] = useState([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isFinalSubmitted, setIsFinalSubmitted] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchProjects();
      fetchTodayUpdates();
    }
  }, [user]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, branch: selectedBranch }));
  }, [selectedBranch]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/updates/projects');
      const data = await response.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchTodayUpdates = async () => {
    try {
      const response = await fetch(`/api/updates/user/${user.id}`);
      const data = await response.json();
      const today = new Date().toISOString().slice(0, 10);
      const todayData = (Array.isArray(data) ? data : [])
        .filter((update) => update.date === today)
        .sort((a, b) => ALLOWED_SLOTS.indexOf(a.update_slot) - ALLOWED_SLOTS.indexOf(b.update_slot));

      setTodayUpdates(todayData);
      setIsFinalSubmitted(todayData.some((update) => update.is_final_submission));
    } catch (err) {
      console.error('Error fetching updates:', err);
    }
  };

  const getAvailableSlots = () => {
    const usedSlots = todayUpdates.map((update) => update.update_slot);
    return ALLOWED_SLOTS.filter((slot) => !usedSlots.includes(slot));
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitAttempted(true);

    if (!form.project_name || !form.update_slot || !form.total_talk_time_minutes) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    if (isFinalSubmitted) {
      showNotification('Final update already submitted for today. No further updates allowed.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/updates/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          ...form,
          branch: selectedBranch,
          project_name: form.project_name.trim(),
          total_calls_made: parseInt(form.total_calls_made, 10) || 0,
          total_talk_time_minutes: parseInt(form.total_talk_time_minutes, 10) || 0,
          svp: parseInt(form.svp, 10) || 0,
          svd: parseInt(form.svd, 10) || 0,
          total_bookings: parseInt(form.total_bookings, 10) || 0
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit update');
      }

      const result = await response.json();
      showNotification(
        form.update_slot === '6:30 PM'
          ? 'Final update submitted successfully!'
          : 'Update submitted successfully!',
        'success'
      );

      setForm({
        project_name: '',
        branch: selectedBranch,
        update_slot: '',
        total_calls_made: '',
        total_talk_time_minutes: '',
        svp: '',
        svd: '',
        total_bookings: '',
        notes: ''
      });
      setSubmitAttempted(false);

      await fetchTodayUpdates();
      if (result.is_final_submission) {
        setIsFinalSubmitted(true);
      }
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const availableSlots = getAvailableSlots();
  const disabled = loading || isFinalSubmitted;

  return (
    <div style={{ width: '100%', maxWidth: '920px' }}>
      <div className="card" style={{ borderRadius: '12px', padding: '1.5rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <CalendarClock size={22} color="var(--primary)" />
              Submit Hourly Update
            </h2>
            <div style={{ marginTop: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Record the current slot's calling, visit, and booking activity.
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <span className="badge info" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Building2 size={13} />
              {selectedBranch}
            </span>
          </div>
        </div>

        {isFinalSubmitted && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-start'
          }}>
            <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '0.125rem' }} />
            <div>
              <strong>Final update submitted</strong>
              <p style={{ fontSize: '0.85rem', margin: '0.25rem 0 0 0', color: 'var(--text-muted)' }}>
                No further updates can be submitted today.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(180px, 1fr)', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Project Name *</label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  list="project-options"
                  name="project_name"
                  value={form.project_name}
                  onChange={handleInputChange}
                  disabled={disabled}
                  placeholder="Select or type a project"
                  style={{ ...fieldStyle(disabled), paddingLeft: '2.45rem' }}
                />
              </div>
              <datalist id="project-options">
                {projects.map((project) => (
                  <option key={project} value={project} />
                ))}
              </datalist>
              {submitAttempted && !form.project_name && (
                <small style={{ color: 'var(--danger)' }}>Required</small>
              )}
            </div>

            <div>
              <label style={labelStyle}>Update Slot *</label>
              <select
                name="update_slot"
                value={form.update_slot}
                onChange={handleInputChange}
                disabled={disabled || availableSlots.length === 0}
                style={{
                  ...fieldStyle(disabled || availableSlots.length === 0),
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  colorScheme: 'dark'
                }}
              >
                <option value="" style={{ background: '#111827', color: '#f9fafb' }}>
                  {availableSlots.length === 0 ? 'No slots available' : 'Select slot'}
                </option>
                {availableSlots.map((slot) => (
                  <option key={slot} value={slot} style={{ background: '#111827', color: '#f9fafb' }}>
                    {slot}
                  </option>
                ))}
              </select>
              {submitAttempted && !form.update_slot && (
                <small style={{ color: 'var(--danger)' }}>Required</small>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
            <div style={metricCardStyle}>
              <label style={labelStyle}>Talk Time (minutes) *</label>
              <div style={{ position: 'relative' }}>
                <Timer size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="number"
                  name="total_talk_time_minutes"
                  value={form.total_talk_time_minutes}
                  onChange={handleInputChange}
                  min="0"
                  disabled={disabled}
                  placeholder="0"
                  style={{ ...fieldStyle(disabled), paddingLeft: '2.45rem' }}
                />
              </div>
              {submitAttempted && !form.total_talk_time_minutes && (
                <small style={{ color: 'var(--danger)' }}>Required</small>
              )}
            </div>

            <div style={metricCardStyle}>
              <label style={labelStyle}>Total Calls</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="number"
                  name="total_calls_made"
                  value={form.total_calls_made}
                  onChange={handleInputChange}
                  min="0"
                  disabled={disabled}
                  placeholder="0"
                  style={{ ...fieldStyle(disabled), paddingLeft: '2.45rem' }}
                />
              </div>
            </div>

            <div style={metricCardStyle}>
              <label style={labelStyle}>SVP</label>
              <div style={{ position: 'relative' }}>
                <Route size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="number"
                  name="svp"
                  value={form.svp}
                  onChange={handleInputChange}
                  min="0"
                  disabled={disabled}
                  placeholder="0"
                  style={{ ...fieldStyle(disabled), paddingLeft: '2.45rem' }}
                />
              </div>
            </div>

            <div style={metricCardStyle}>
              <label style={labelStyle}>SVD</label>
              <div style={{ position: 'relative' }}>
                <Route size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="number"
                  name="svd"
                  value={form.svd}
                  onChange={handleInputChange}
                  min="0"
                  disabled={disabled}
                  placeholder="0"
                  style={{ ...fieldStyle(disabled), paddingLeft: '2.45rem' }}
                />
              </div>
            </div>

            <div style={metricCardStyle}>
              <label style={labelStyle}>Total Bookings</label>
              <div style={{ position: 'relative' }}>
                <Save size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="number"
                  name="total_bookings"
                  value={form.total_bookings}
                  onChange={handleInputChange}
                  min="0"
                  disabled={disabled}
                  placeholder="0"
                  style={{ ...fieldStyle(disabled), paddingLeft: '2.45rem' }}
                />
              </div>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleInputChange}
              disabled={disabled}
              placeholder="Add notes about follow-ups, client response, blockers, or outcomes"
              style={{
                ...fieldStyle(disabled),
                minHeight: '110px',
                fontFamily: 'inherit',
                resize: 'vertical',
                lineHeight: 1.5
              }}
            />
          </div>

          <button
            type="submit"
            disabled={disabled}
            className="btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.85rem 1.5rem',
              borderRadius: '8px',
              opacity: disabled ? 0.6 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontWeight: 800
            }}
          >
            {loading ? (
              <>
                <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Submitting
              </>
            ) : (
              <>
                <Send size={18} />
                {form.update_slot === '6:30 PM' ? 'Submit Final Update' : 'Submit Update'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default HourlyUpdatesForm;
