import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import SectionHeader from "../components/SectionHeader";
import Panel from "../components/Panel";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import { useTenancy } from "../contexts/TenancyContext";
import { api } from "../lib/api";
import { ACTIVE_SCAN_STATUSES, formatScanDate, scanLabel } from "../lib/scans";
export const Scans = () => {
  const { currentWorkspace } = useTenancy();
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    if (!currentWorkspace) return;
    setError(null);
    try {
      const [defs, profiles, jobs, assets] = await Promise.all([
        api.getScanners(currentWorkspace.id),
        api.getScanProfiles(currentWorkspace.id),
        api.getScanJobs(currentWorkspace.id, { page_size: 50 }),
        api.getAssets(currentWorkspace.id, { page_size: 100, active: true }),
      ]);
      const active = defs.find((d) => d.active);
      const health = active
        ? await api.getScannerHealth(currentWorkspace.id, active.scanner_type)
        : null;
      setState({
        defs,
        profiles,
        jobs: jobs.items,
        assets: assets.items,
        health,
      });
    } catch (e) {
      setError(e);
    }
  }, [currentWorkspace?.id]);
  useEffect(() => {
    load();
  }, [load]);
  if (!currentWorkspace)
    return (
      <DashboardLayout>
        <EmptyState
          title="No workspace selected"
          description="Select a workspace to view scan operations."
        />
      </DashboardLayout>
    );
  const configured = new Set(
    (state?.profiles || []).flatMap((p) => p.target_asset_ids || []),
  );
  const activeJobs = (state?.jobs || []).filter((j) =>
    ACTIVE_SCAN_STATUSES.includes(j.status),
  );
  return (
    <DashboardLayout>
      <SectionHeader
        title="Scans"
        description="Scanner availability, reusable profiles, execution progress, and Finding ingestion."
        actions={
          <>
            <Link className="btn btn-secondary" to="/scans/profiles">
              Manage profiles
            </Link>
            <button className="btn btn-secondary" onClick={load}>
              Refresh
            </button>
          </>
        }
      />
      {error && (
        <div className="notice notice-error" role="alert">
          {error.message}
        </div>
      )}
      {!state ? (
        <LoadingState message="Loading scan operations…" />
      ) : (
        <>
          <div className="content-grid">
            <Panel title="Nuclei runtime">
              <span
                className={
                  state.health?.available
                    ? "badge badge-success"
                    : "badge badge-warning"
                }
              >
                {state.health?.available ? "Available" : "Unavailable"}
              </span>
              <p>{state.health?.message}</p>
              {!state.health?.available && (
                <div className="notice notice-info">
                  Install and configure the Nuclei CLI on the backend runtime to
                  execute profiles. ThreatStream remains fully operational
                  without it.
                </div>
              )}
            </Panel>
            <Panel title="Live summary">
              <div className="data-list">
                <div className="data-row">
                  <span>Active jobs</span>
                  <strong>{activeJobs.length}</strong>
                </div>
                <div className="data-row">
                  <span>Profiles</span>
                  <strong>{state.profiles.length}</strong>
                </div>
                <div className="data-row">
                  <span>Assets without profiles</span>
                  <strong>
                    {state.assets.filter((a) => !configured.has(a.id)).length}
                  </strong>
                </div>
                <div className="data-row">
                  <span>Findings created / updated</span>
                  <strong>
                    {state.jobs.reduce(
                      (n, j) => n + j.findings_created_count,
                      0,
                    )}{" "}
                    /{" "}
                    {state.jobs.reduce(
                      (n, j) => n + j.findings_updated_count,
                      0,
                    )}
                  </strong>
                </div>
              </div>
            </Panel>
          </div>
          <Panel title="Recent scan jobs" style={{ marginTop: 16 }}>
            {state.jobs.length ? (
              <div className="data-list">
                {state.jobs.map((j) => (
                  <Link
                    className="data-row"
                    style={{ textDecoration: "none" }}
                    to={`/scans/jobs/${j.id}`}
                    key={j.id}
                  >
                    <div>
                      <h3>{j.profile_name || "Scan job"}</h3>
                      <p>
                        {scanLabel(j.scanner_type)} · {j.processed_target_count}
                        /{j.target_count} targets
                      </p>
                    </div>
                    <div>
                      <span
                        className={`badge ${j.status === "completed" ? "badge-success" : j.status === "failed" ? "badge-danger" : "badge-info"}`}
                      >
                        {scanLabel(j.status)}
                      </span>
                      <p className="mono muted">
                        {formatScanDate(j.created_at)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No scan jobs"
                description="Run an enabled profile to create the first job."
              />
            )}
          </Panel>
        </>
      )}
    </DashboardLayout>
  );
};
export default Scans;
