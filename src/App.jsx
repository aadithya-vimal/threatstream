import React from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import Landing from './pages/Landing';
import Terms from './pages/Terms';

// Active product shell
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <div className="app-container">
          <Routes>
            {/* Public Views */}
            <Route path="/" element={<Landing />} />
            <Route path="/terms" element={<Terms />} />

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
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
