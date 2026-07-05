import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from './Icons';

export const Topbar = () => {
  const location = useLocation();
  const { user, role, logout } = useAuth();

  // Map path to a friendly name for breadcrumbs
  const getPageTitle = (path) => {
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return 'Landing';
    
    return segments.map(seg => {
      // replace dash/underscore with space and capitalize words
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* System Status Indicator */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            padding: '3px 8px',
            borderRadius: '4px'
          }}
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
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-low)', textTransform: 'uppercase' }}>
            System Operational
          </span>
        </div>

        {/* Notifications Mock Icon */}
        <button
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
          <span 
            style={{ 
              position: 'absolute', 
              top: '4px', 
              right: '4px', 
              width: '6px', 
              height: '6px', 
              backgroundColor: 'var(--color-critical)', 
              borderRadius: '50%' 
            }}
          />
        </button>

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
