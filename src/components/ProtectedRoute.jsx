import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingState from './LoadingState';
import Panel from './Panel';

export const ProtectedRoute = ({ children }) => {
  const { user, loading, login, signup } = useAuth();

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0a0c10' }}><LoadingState message="Authenticating session…" /></div>;
  }
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0a0c10', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <Panel title="Sign in to ThreatStream">
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6, marginBottom: '20px' }}>
              Clerk securely handles sign-in, account creation, recovery, and connected identity providers. ThreatStream manages workspace authorization separately.
            </p>
            <div style={{ display: 'grid', gap: '10px' }}>
              <button type="button" className="btn btn-primary" onClick={login}>Sign in</button>
              <button type="button" className="btn btn-secondary" onClick={signup}>Create account</button>
            </div>
          </Panel>
        </div>
      </div>
    );
  }
  return children;
};

export default ProtectedRoute;
