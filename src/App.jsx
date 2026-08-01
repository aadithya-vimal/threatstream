import React, { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Routes,
  Route,
} from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./contexts/AuthContext";
import { TenancyProvider } from "./contexts/TenancyContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import ProtectedRoute from "./components/ProtectedRoute";

const Landing = lazy(() => import("./features/public/Landing"));
const Terms = lazy(() => import("./features/public/Terms"));
const AuthPage = lazy(() => import("./features/auth/AuthPage"));
const Dashboard = lazy(() => import("./features/overview/Dashboard"));
const Integrations = lazy(() => import("./features/integrations/Integrations"));
const Teams = lazy(() => import("./features/teams/Teams"));
const Audit = lazy(() => import("./features/audit/Audit"));
const Findings = lazy(() => import("./features/findings/Findings"));
const FindingCreate = lazy(() => import("./features/findings/FindingCreate"));
const FindingDetail = lazy(() => import("./features/findings/FindingDetail"));
const Assets = lazy(() => import("./features/assets/Assets"));
const AssetDetail = lazy(() => import("./features/assets/AssetDetail"));
const Scans = lazy(() => import("./features/scans/Scans"));
const ScanProfiles = lazy(() => import("./features/scans/ScanProfiles"));
const ScanProfileDetail = lazy(() => import("./features/scans/ScanProfileDetail"));
const ScanJobDetail = lazy(() => import("./features/scans/ScanJobDetail"));
const ScanSchedules = lazy(() => import("./features/scans/ScanSchedules"));
const ScanScheduleDetail = lazy(() => import("./features/scans/ScanScheduleDetail"));

function App() {
  return (
    <Router>
      <AuthProvider>
        <TenancyProvider>
          <NotificationProvider>
            <div className="app-container">
              <Suspense
                fallback={
                  <div
                    className="ambient-page"
                    style={{ minHeight: "100vh" }}
                  />
                }
              >
                <Routes>
                  {/* Public Views */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/auth/:path" element={<AuthPage />} />

                  {/* Authenticated shell. Domain routes are added only with working backends. */}
                  <Route
                    path="/overview"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={<Navigate to="/overview" replace />}
                  />
                  <Route
                    path="/settings/integrations"
                    element={
                      <ProtectedRoute>
                        <Integrations />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/workspace/teams"
                    element={
                      <ProtectedRoute>
                        <Teams />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/audit"
                    element={
                      <ProtectedRoute>
                        <Audit />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/findings"
                    element={
                      <ProtectedRoute>
                        <Findings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/findings/new"
                    element={
                      <ProtectedRoute>
                        <FindingCreate />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/findings/:findingId"
                    element={
                      <ProtectedRoute>
                        <FindingDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/assets"
                    element={
                      <ProtectedRoute>
                        <Assets />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/assets/:assetId"
                    element={
                      <ProtectedRoute>
                        <AssetDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/scans"
                    element={
                      <ProtectedRoute>
                        <Scans />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/scans/profiles"
                    element={
                      <ProtectedRoute>
                        <ScanProfiles />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/scans/profiles/:profileId"
                    element={
                      <ProtectedRoute>
                        <ScanProfileDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/scans/jobs/:jobId"
                    element={
                      <ProtectedRoute>
                        <ScanJobDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/scans/schedules"
                    element={
                      <ProtectedRoute>
                        <ScanSchedules />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/scans/schedules/:scheduleId"
                    element={
                      <ProtectedRoute>
                        <ScanScheduleDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="*"
                    element={<Navigate to="/overview" replace />}
                  />
                </Routes>
              </Suspense>
            </div>
          </NotificationProvider>
        </TenancyProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
