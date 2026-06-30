import React, { createContext, useRef, useState, useContext, useCallback } from 'react';
import { CheckCircle, AlertCircle, X, Info, AlertTriangle } from 'lucide-react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const nextIdRef = useRef(1);
  const timersRef = useRef(new Map());

  const removeNotification = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showNotification = useCallback((message, type = 'success') => {
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    setNotifications(prev => [...prev, { id, message, type }]);
    
    const timer = setTimeout(() => {
      removeNotification(id);
    }, 4000);
    timersRef.current.set(id, timer);
  }, [removeNotification]);

  return (
    <NotificationContext.Provider value={{ showNotification, removeNotification }}>
      {children}
      <div className="toast-container">
        {notifications.map(n => (
          <div key={n.id} className={`toast toast-${n.type}`}>
            <div className="toast-icon">
              {n.type === 'success' && <CheckCircle size={20} />}
              {n.type === 'error' && <AlertCircle size={20} />}
              {n.type === 'info' && <Info size={20} />}
              {n.type === 'warning' && <AlertTriangle size={20} />}
            </div>
            <div className="toast-content">{n.message}</div>
            <button type="button" className="toast-close" onClick={() => removeNotification(n.id)} aria-label="Dismiss notification">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotify = () => useContext(NotificationContext);
