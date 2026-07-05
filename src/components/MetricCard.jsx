import React from 'react';

export const MetricCard = ({ title, value, status = 'info', trend, subtitle, icon }) => {
  const statusClasses = {
    critical: 'border-l-4 border-l-red-500 text-red-500',
    high: 'border-l-4 border-l-orange-500 text-orange-500',
    medium: 'border-l-4 border-l-yellow-500 text-yellow-500',
    low: 'border-l-4 border-l-green-500 text-green-500',
    info: 'border-l-4 border-l-blue-500 text-blue-500',
  };

  const statusBorderColor = {
    critical: 'var(--color-critical)',
    high: 'var(--color-high)',
    medium: 'var(--color-medium)',
    low: 'var(--color-low)',
    info: 'var(--color-blue)',
  };

  return (
    <div 
      className="metric-card"
      style={{
        backgroundColor: 'var(--panel-bg)',
        border: '1px solid var(--border-color)',
        borderLeft: `4px solid ${statusBorderColor[status] || 'var(--border-color)'}`,
        borderRadius: '6px',
        padding: 'var(--spacing-lg)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform var(--transition-fast), border-color var(--transition-fast)',
        position: 'relative',
        overflow: 'hidden',
        minWidth: '200px',
        flex: 1
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </span>
        {icon && <span style={{ color: 'var(--text-muted)' }}>{icon}</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-sm)' }}>
        <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {value}
        </span>
        {trend && (
          <span style={{ 
            fontSize: '12px', 
            fontWeight: 500, 
            color: trend.startsWith('-') ? 'var(--color-low)' : 'var(--color-critical)',
            backgroundColor: trend.startsWith('-') ? 'var(--color-low-bg)' : 'var(--color-critical-bg)',
            padding: '2px 6px',
            borderRadius: '4px'
          }}>
            {trend}
          </span>
        )}
      </div>

      {subtitle && (
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'var(--spacing-xs)' }}>
          {subtitle}
        </span>
      )}
    </div>
  );
};

export default MetricCard;
