import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './contexts/AuthContext';
import { TenancyProvider } from './contexts/TenancyContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';

const Landing = lazy(() => import('./pages/Landing'));
const Terms = lazy(() => import('./pages/Terms'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Integrations = lazy(() => import('./pages/Integrations'));
const Teams = lazy(() => import('./pages/Teams'));
const Audit = lazy(() => import('./pages/Audit'));

function App() {
  return (
    <Router>
      <AuthProvider>
        <TenancyProvider>
          <NotificationProvider>
          <div className="app-container"><Suspense fallback={<div className="ambient-page" style={{ minHeight: '100vh' }} />}>
          <Routes>
            {/* Public Views */}
            <Route path="/" element={<Landing />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/auth/:path" element={<AuthPage />} />

            {/* Authenticated shell. Domain routes are added only with working backends. */}
            <Route path="/overview" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={<Navigate to="/overview" replace />} />
            <Route path="/settings/integrations" element={
              <ProtectedRoute>
                <Integrations />
              </ProtectedRoute>
            } />
            <Route path="/workspace/teams" element={<ProtectedRoute><Teams /></ProtectedRoute>} />
            <Route path="/audit" element={<ProtectedRoute><Audit /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes></Suspense>
        </div>
          </NotificationProvider>
        </TenancyProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
