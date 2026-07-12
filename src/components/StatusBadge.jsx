import React from 'react';

export const StatusBadge = ({ status = 'info', text, hint }) => {
  const styles = {
    critical: {
      backgroundColor: 'var(--color-critical-bg)',
      color: 'var(--color-critical)',
      border: '1px solid var(--color-critical-border)',
    },
    high: {
      backgroundColor: 'var(--color-high-bg)',
      color: 'var(--color-high)',
      border: '1px solid var(--color-high-border)',
    },
    medium: {
      backgroundColor: 'var(--color-medium-bg)',
      color: 'var(--color-medium)',
      border: '1px solid var(--color-medium-border)',
    },
    low: {
      backgroundColor: 'var(--color-low-bg)',
      color: 'var(--color-low)',
      border: '1px solid var(--color-low-border)',
    },
    info: {
      backgroundColor: 'var(--color-blue-bg)',
      color: 'var(--color-blue)',
      border: '1px solid rgba(59, 130, 246, 0.2)',
    },
    success: {
      backgroundColor: 'var(--color-low-bg)',
      color: 'var(--color-low)',
      border: '1px solid var(--color-low-border)',
    },
    warning: {
      backgroundColor: 'var(--color-high-bg)',
      color: 'var(--color-high)',
      border: '1px solid var(--color-high-border)',
    }
  };

  const currentStyle = styles[status?.toLowerCase()] || styles.info;

  return (
    <span
      className={`status-badge badge-${status}`}
      title={hint || `${text || status} status`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3px 8px',
        fontSize: '11px',
        fontWeight: 600,
        borderRadius: '4px',
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap',
        ...currentStyle
      }}
    >
      {text || status}
    </span>
  );
};

export default StatusBadge;
