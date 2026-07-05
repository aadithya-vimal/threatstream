import React from 'react';

export const LoadingState = ({ message = 'Loading resources...' }) => {
  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: 'var(--spacing-xl)', 
        minHeight: '200px',
        backgroundColor: 'var(--panel-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px'
      }}
    >
      <div 
        className="spinner"
        style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(59, 130, 246, 0.1)',
          borderTop: '3px solid var(--color-blue)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: 'var(--spacing-md)'
        }}
      />
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{message}</span>
    </div>
  );
};

export default LoadingState;
