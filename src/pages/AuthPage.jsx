import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AuthView } from '@neondatabase/auth-ui';
const supportedPaths = new Set(['sign-in','sign-up','forgot-password','reset-password','verify-email']);
const AuthPage = () => {
  const { path } = useParams();
  if (!supportedPaths.has(path)) return <Navigate to="/auth/sign-in" replace />;
  return <main className="auth-page">
    <section className="auth-page__story"><Link to="/" className="auth-page__brand"><img src="/logo.svg" alt="" />THREATSTREAM</Link><div className="auth-page__copy"><span className="eyebrow">Identity boundary</span><h1>Enter the <span className="gradient-text">defensive workspace.</span></h1><p>Your identity is handled by Neon Auth. Workspace access, roles, permissions, and audit history remain controlled by ThreatStream.</p></div><p className="muted" style={{ fontSize: 11 }}>Hosted web application · Local capabilities are not enabled</p></section>
    <section className="auth-page__form"><div><AuthView path={path} /></div></section>
  </main>;
};
export default AuthPage;
