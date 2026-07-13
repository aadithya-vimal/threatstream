import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from './Icons';

export const Sidebar = ({ collapsed = false, onToggle }) => {
  const location = useLocation();

  const navigationItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
    { name: 'Emulation Workspace', path: '/incidents', icon: 'incidents' },
    { name: 'Threat Intelligence', path: '/threat-intelligence', icon: 'intelligence' },
    { name: 'Target Assets Scope', path: '/assets', icon: 'assets' },
    { name: 'Vulnerability Targets', path: '/vulnerabilities', icon: 'vulnerabilities' },
    { name: 'Remediation Database', path: '/reports', icon: 'reports' },
    { name: 'Settings', path: '/settings', icon: 'administration' },
  ];

  return (
    <aside 
      style={{
        width: collapsed ? '64px' : '240px',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        transition: 'width var(--transition-normal) ease',
        flexShrink: 0,
        zIndex: 40,
        position: 'relative'
      }}
    >
      {/* Top Brand Area */}
      <div 
        style={{ 
          height: '60px', 
          display: 'flex', 
          alignItems: 'center', 
          padding: collapsed ? '0' : '0 20px', 
          justifyContent: collapsed ? 'center' : 'space-between',
          borderBottom: '1px solid var(--border-color)'
        }}
      >
        {!collapsed && (
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src="/logo.svg" alt="ThreatStream Logo" style={{ width: '28px', height: '28px' }} />
            <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--color-blue)', letterSpacing: '0.5px' }}>
              THREAT<span style={{ color: 'var(--text-primary)' }}>STREAM</span>
            </span>
          </Link>
        )}
        {collapsed && (
          <Link to="/">
            <img src="/logo.svg" alt="ThreatStream Logo" style={{ width: '28px', height: '28px' }} />
          </Link>
        )}
      </div>

      {/* Navigation Items */}
      <nav style={{ flex: 1, padding: '16px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.name : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 12px',
                borderRadius: '6px',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--panel-bg)' : 'transparent',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                borderLeft: isActive ? '3px solid var(--color-blue)' : '3px solid transparent',
                transition: 'all var(--transition-fast) ease',
              }}
              className={isActive ? '' : 'sidebar-item-hover'}
            >
              <span style={{ color: isActive ? 'var(--color-blue)' : 'inherit', display: 'flex', alignItems: 'center' }}>
                <Icon name={item.icon} size={18} />
              </span>
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Toggle button at the bottom */}
      <div 
        style={{ 
          padding: '12px', 
          borderTop: '1px solid var(--border-color)', 
          display: 'flex', 
          justifyContent: collapsed ? 'center' : 'flex-end' 
        }}
      >
        <button
          onClick={onToggle}
          style={{
            backgroundColor: 'var(--panel-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            borderRadius: '4px',
            padding: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all var(--transition-fast) ease'
          }}
          className="btn-icon-hover"
        >
          <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={14} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
