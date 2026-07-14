/**
 * src/contexts/NotificationContext.jsx
 * Centralized Security Alert and Notification Context Provider
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    let channel;
    try {
      channel = supabase
        .channel('public:alerts')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'alerts' },
          (payload) => {
            addNotification({
              id: payload.new.id,
              title: payload.new.title,
              message: payload.new.details || 'Security alert triggered.',
              type: payload.new.severity === 'critical' ? 'critical'
                  : payload.new.severity === 'high'     ? 'warning' : 'info',
              read: false,
              timestamp: payload.new.created_at,
            });
          }
        )
        .subscribe();
    } catch {
      // Realtime channel unavailable — notifications still work via addNotification()
    }

    return () => {
      if (channel) {
        try { supabase.removeChannel(channel); } catch { /* ignore */ }
      }
    };
  }, []);

  const addNotification = (notif) => {
    setNotifications(prev => [
      {
        id: notif.id || `notif-${Math.random()}`,
        title: notif.title,
        message: notif.message,
        type: notif.type || 'info',
        read: false,
        timestamp: notif.timestamp || new Date().toISOString()
      },
      ...prev
    ]);
  };

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used inside NotificationProvider');
  }
  return context;
};

export default NotificationContext;
