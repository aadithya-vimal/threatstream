import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';

// Public Pages
import Landing from './pages/Landing';
import Terms from './pages/Terms';

// SOC Console Module Pages
import Dashboard from './pages/Dashboard';
import ThreatIntelligence from './pages/ThreatIntelligence';
import Assets from './pages/Assets';
import Network from './pages/Network';
import Endpoints from './pages/Endpoints';
import Vulnerabilities from './pages/Vulnerabilities';
import ThreatHunting from './pages/ThreatHunting';
import MalwareAnalysis from './pages/MalwareAnalysis';
import IOCEnrichment from './pages/IOCEnrichment';
import YARAPlatform from './pages/YARAPlatform';
import GraphInvestigation from './pages/GraphInvestigation';
import Incidents from './pages/Incidents';
import Reports from './pages/Reports';
import Administration from './pages/Administration';

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

            {/* Private SOC Console Module Views (Protected via RBAC Gates) */}
            <Route path="/dashboard" element={
              <ProtectedRoute requiredPermission="read:intel">
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/threat-intelligence" element={
              <ProtectedRoute requiredPermission="read:intel">
                <ThreatIntelligence />
              </ProtectedRoute>
            } />
            <Route path="/assets" element={
              <ProtectedRoute requiredPermission="read:assets">
                <Assets />
              </ProtectedRoute>
            } />
            <Route path="/network" element={
              <ProtectedRoute requiredPermission="read:intel">
                <Network />
              </ProtectedRoute>
            } />
            <Route path="/endpoints" element={
              <ProtectedRoute requiredPermission="read:telemetry">
                <Endpoints />
              </ProtectedRoute>
            } />
            <Route path="/vulnerabilities" element={
              <ProtectedRoute requiredPermission="read:assets">
                <Vulnerabilities />
              </ProtectedRoute>
            } />
            <Route path="/threat-hunting" element={
              <ProtectedRoute requiredPermission="read:telemetry">
                <ThreatHunting />
              </ProtectedRoute>
            } />
            <Route path="/malware-analysis" element={
              <ProtectedRoute requiredPermission="read:intel">
                <MalwareAnalysis />
              </ProtectedRoute>
            } />
            <Route path="/ioc-enrichment" element={
              <ProtectedRoute requiredPermission="read:intel">
                <IOCEnrichment />
              </ProtectedRoute>
            } />
            <Route path="/yara-platform" element={
              <ProtectedRoute requiredPermission="read:intel">
                <YARAPlatform />
              </ProtectedRoute>
            } />
            <Route path="/graph-investigation" element={
              <ProtectedRoute requiredPermission="read:intel">
                <GraphInvestigation />
              </ProtectedRoute>
            } />
            <Route path="/incidents" element={
              <ProtectedRoute requiredPermission="read:incidents">
                <Incidents />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute requiredPermission="read:incidents">
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="/administration" element={
              <ProtectedRoute requiredPermission="manage:users">
                <Administration />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;