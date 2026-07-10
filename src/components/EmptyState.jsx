import React from 'react';
import { Icon } from './Icons';

export const EmptyState = ({ 
  title = 'No Results Found', 
  description = 'There is currently no data or activity matching the criteria.', 
  icon,
  footer
}) => {
  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '40px 20px', 
        textAlign: 'center',
        backgroundColor: 'var(--panel-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        minHeight: '200px'
      }}
    >
      <div style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-md)' }}>
        {icon || <Icon name="info" size={36} />}
      </div>
      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--spacing-xs)' }}>
        {title}
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '320px', margin: 0 }}>
        {description}
      </p>
      {footer ? (
        <div style={{ marginTop: 'var(--spacing-md)', color: 'var(--text-muted)', fontSize: '12px' }}>
          {footer}
        </div>
      ) : null}
    </div>
  );
};

export default EmptyState;
