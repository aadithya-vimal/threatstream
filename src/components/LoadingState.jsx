import React from 'react';
export const LoadingState = ({ message = 'Loading resources…', subtext = '' }) => (
  <div className="empty-state" role="status" aria-live="polite">
    <div style={{ width: 34, height: 34, border: '2px solid var(--border)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
    <div><h3>{message}</h3>{subtext && <p>{subtext}</p>}</div>
  </div>
);
export default LoadingState;
