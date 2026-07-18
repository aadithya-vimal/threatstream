import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { AuthView } from '@neondatabase/auth-ui';

const supportedPaths = new Set([
  'sign-in',
  'sign-up',
  'forgot-password',
  'reset-password',
  'verify-email',
]);

const AuthPage = () => {
  const { path } = useParams();

  if (!supportedPaths.has(path)) {
    return <Navigate to="/auth/sign-in" replace />;
  }

  return (
    <main className="auth-page">
      <div className="auth-page__brand">ThreatStream</div>
      <AuthView path={path} />
    </main>
  );
};

export default AuthPage;
