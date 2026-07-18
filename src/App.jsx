import React from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './contexts/AuthContext';
import { TenancyProvider } from './contexts/TenancyContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import Landing from './pages/Landing';
import Terms from './pages/Terms';
import AuthPage from './pages/AuthPage';

// Active product shell
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Router>
      <AuthProvider>
        <TenancyProvider>
          <NotificationProvider>
          <div className="app-container">
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
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </div>
          </NotificationProvider>
        </TenancyProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
