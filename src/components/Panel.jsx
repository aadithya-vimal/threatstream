import React from 'react';

export const Panel = ({ title, children, className = '', actions, style = {} }) => {
  return (
    <div 
      className={`panel-container ${className}`}
      style={{
        backgroundColor: 'var(--panel-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        ...style
      }}
    >
      {title && (
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '12px 16px', 
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)'
          }}
        >
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {title}
          </h3>
          {actions && <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>{actions}</div>}
        </div>
      )}
      <div style={{ padding: '16px', flex: 1, position: 'relative' }}>
        {children}
      </div>
    </div>
  );
};

export default Panel;
