import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { Icon } from './Icons';

export const Topbar = ({ onSearchTrigger }) => {
  const location = useLocation();
  const { user, role, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotifications();
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const clickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  // Map path to a friendly name for breadcrumbs
  const getPageTitle = (path) => {
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return 'Landing';
    
    return segments.map(seg => {
      return seg
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    }).join(' / ');
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const getDisplayName = () => {
    if (!user) return 'Operator';
    if (user.email) {
      const parts = user.email.split('@');
      return parts[0].replace(/[^a-zA-Z]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    return 'Active Operator';
  };

  const getSeverityColor = (type) => {
    switch (type) {
      case 'critical': return 'var(--color-critical)';
      case 'warning': return 'var(--color-high)';
      case 'success': return 'var(--color-low)';
      default: return 'var(--color-blue)';
    }
  };

  return (
    <header
      style={{
        height: '60px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 30,
        position: 'sticky',
        top: 0
      }}
    >
      {/* Page Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>
          SOC Portal
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>/</span>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {getPageTitle(location.pathname)}
        </span>
      </div>

      {/* Utilities / Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
        
        {/* Command Search Bar Trigger */}
        <button
          onClick={onSearchTrigger}
          title="Open command palette (Ctrl+K)"
          style={{
            background: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-primary)',
            padding: '6px 12px',
            fontSize: '11px',
            gap: '8px',
            borderRadius: '4px',
            fontFamily: 'inherit'
          }}
          className="btn-icon-hover hide-on-mobile"
        >
          <Icon name="search" size={13} />
          <span style={{ color: 'var(--text-muted)' }}>Search console...</span>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)', padding: '1px 4px', borderRadius: '2px' }}>
            ⌘K
          </span>
        </button>

        {/* System Status Indicator */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            padding: '4px 8px',
            borderRadius: '4px'
          }}
          className="hide-on-mobile"
        >
          <span 
            style={{ 
              width: '6px', 
              height: '6px', 
              backgroundColor: 'var(--color-low)', 
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'pulse-slow 2s infinite'
            }}
          />
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-low)', textTransform: 'uppercase' }}>
            Live backend
          </span>
        </div>

        {/* Notifications Icon with Unread Dropdown Container */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              position: 'relative'
            }}
            className="btn-icon-hover"
          >
            <Icon name="bell" size={18} />
            {unreadCount > 0 && (
              <span 
                style={{ 
                  position: 'absolute', 
                  top: '2px', 
                  right: '2px', 
                  backgroundColor: 'var(--color-critical)',
                  color: '#fff',
                  fontSize: '8px',
                  fontWeight: 700,
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {notifDropdownOpen && (
            <div 
              style={{
                position: 'absolute',
                top: '38px',
                right: 0,
                width: '320px',
                backgroundColor: 'var(--panel-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
                zIndex: 50,
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>SOC Warnings & Notifications</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    style={{ background: 'none', border: 'none', color: 'var(--color-blue)', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                {notifications.length > 0 ? (
                  notifications.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => markAsRead(item.id)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: item.read ? 'transparent' : 'rgba(59, 130, 246, 0.03)',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: '10px',
                        position: 'relative'
                      }}
                    >
                      {/* Status dot indicator */}
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: getSeverityColor(item.type),
                        marginTop: '5px',
                        flexShrink: 0
                      }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>{item.message}</span>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotification(item.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: '12px',
                          cursor: 'pointer',
                          alignSelf: 'flex-start',
                          padding: '0 4px'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                    No pending alerts in queue.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Vertical Divider */}
        <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--border-color)' }} />

        {/* User Profile Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div 
            style={{ 
              width: '28px', 
              height: '28px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--border-color)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--color-blue)'
            }}
          >
            <Icon name="user" size={16} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }} className="hide-on-mobile">
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{getDisplayName()}</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{role}</span>
          </div>
        </div>

        {/* Logout Secure Action Icon */}
        <button
          onClick={handleLogout}
          title="Disconnect Session"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            marginLeft: '4px'
          }}
          className="btn-icon-hover"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Topbar;
