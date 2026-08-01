import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenancy } from '../contexts/TenancyContext';
import LoadingState from './LoadingState';
import Brand from './Brand';

export const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const { user, loading, status, login, signup, retryInitialization } = useAuth();
  const tenancy = useTenancy();
  if (loading) return <div className="ambient-page" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}><LoadingState message="Authenticating session…" subtext="Confirming your identity before workspace access." /></div>;
  if (status === 'error') return <main className="ambient-page" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}><section className="panel gradient-border" role="alert" style={{ width: 'min(460px, 100%)' }}><div className="panel__body" style={{ padding: 34 }}><Brand /><span className="eyebrow" style={{ display: 'block', marginTop: 34 }}>Authentication unavailable</span><h1 style={{ margin: '8px 0 10px', fontSize: 30 }}>We could not restore your session</h1><p style={{ color: 'var(--text-secondary)', margin: '0 0 24px' }}>No workspace data was loaded. Retry the secure session check or return later.</p><button className="btn btn-primary" onClick={retryInitialization}>Retry authentication</button></div></section></main>;
  if (!user) return <main className="ambient-page" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}><section className="panel gradient-border" style={{ width: 'min(460px, 100%)' }}><div className="panel__body" style={{ padding: 34 }}><Brand /><span className="eyebrow" style={{ display: 'block', marginTop: 34 }}>Protected workspace</span><h1 style={{ margin: '8px 0 10px', fontSize: 30 }}>Sign in to continue</h1><p style={{ color: 'var(--text-secondary)', margin: '0 0 24px' }}>Neon Auth verifies your identity. ThreatStream separately enforces workspace membership and permissions.</p><div style={{ display: 'grid', gap: 10 }}><button className="btn btn-primary" onClick={login}>Sign in</button><button className="btn btn-secondary" onClick={signup}>Create account</button></div></div></section></main>;
  if (tenancy.status === 'loading' || tenancy.status === 'authentication_expired') return <div className="ambient-page" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}><LoadingState message="Loading workspace context…" subtext="Confirming your authorized tenant boundary." /></div>;
  if (tenancy.status === 'permission_denied' || tenancy.status === 'backend_unavailable' || tenancy.status === 'workspace_unavailable') return <main className="ambient-page" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}><section className="panel gradient-border" role="alert" style={{ width: 'min(520px, 100%)' }}><div className="panel__body" style={{ padding: 34 }}><Brand /><span className="eyebrow" style={{ display: 'block', marginTop: 34 }}>Workspace unavailable</span><h1 style={{ margin: '8px 0 10px', fontSize: 30 }}>ThreatStream could not establish an authorized workspace</h1><p style={{ color: 'var(--text-secondary)' }}>{tenancy.status === 'permission_denied' ? 'Your identity is valid, but this operation is not permitted.' : tenancy.status === 'workspace_unavailable' ? 'Your organization has no workspace available to this account.' : 'The workspace service is temporarily unavailable.'}</p><button className="btn btn-primary" onClick={tenancy.refresh}>Retry workspace check</button></div></section></main>;
  if (tenancy.status === 'onboarding' && location.pathname !== '/overview') return <Navigate to="/overview" replace state={{ onboarding: true }} />;
  return children;
};
export default ProtectedRoute;
