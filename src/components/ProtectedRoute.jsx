import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingState from './LoadingState';
import Brand from './Brand';

export const ProtectedRoute = ({ children }) => {
  const { user, loading, login, signup } = useAuth();
  if (loading) return <div className="ambient-page" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}><LoadingState message="Authenticating session…" subtext="Confirming your identity before workspace access." /></div>;
  if (!user) return <main className="ambient-page" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}><section className="panel gradient-border" style={{ width: 'min(460px, 100%)' }}><div className="panel__body" style={{ padding: 34 }}><Brand /><span className="eyebrow" style={{ display: 'block', marginTop: 34 }}>Protected workspace</span><h1 style={{ margin: '8px 0 10px', fontSize: 30 }}>Sign in to continue</h1><p style={{ color: 'var(--text-secondary)', margin: '0 0 24px' }}>Neon Auth verifies your identity. ThreatStream separately enforces workspace membership and permissions.</p><div style={{ display: 'grid', gap: 10 }}><button className="btn btn-primary" onClick={login}>Sign in</button><button className="btn btn-secondary" onClick={signup}>Create account</button></div></div></section></main>;
  return children;
};
export default ProtectedRoute;
