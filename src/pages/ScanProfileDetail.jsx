import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import SectionHeader from "../components/SectionHeader";
import Panel from "../components/Panel";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { useTenancy } from "../contexts/TenancyContext";
import { api } from "../lib/api";
import { canManageScans, canRunScans, scanLabel } from "../lib/scans";
export const ScanProfileDetail = () => {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const { currentWorkspace } = useTenancy();
  const [profile, setProfile] = useState(null);
  const [assets, setAssets] = useState([]);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const [p, a, h] = await Promise.all([
        api.getScanProfile(currentWorkspace.id, profileId),
        api.getAssets(currentWorkspace.id, { page_size: 100, active: true }),
        api.getScannerHealth(currentWorkspace.id, "nuclei"),
      ]);
      setProfile(p);
      setAssets(a.items);
      setHealth(h);
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [currentWorkspace?.id, profileId]);
  useEffect(() => {
    load();
  }, [load]);
  const assigned = new Set((profile?.targets || []).map((t) => t.asset_id));
  const supported = new Set([
    "domain",
    "subdomain",
    "url",
    "ip_address",
    "host",
  ]);
  const add = async (id) => {
    try {
      await api.addScanTargets(currentWorkspace.id, profileId, [id]);
      await load();
    } catch (e) {
      setError(e);
    }
  };
  const remove = async (id) => {
    try {
      await api.removeScanTarget(currentWorkspace.id, profileId, id);
      await load();
    } catch (e) {
      setError(e);
    }
  };
  const run = async () => {
    try {
      const job = await api.runScanProfile(currentWorkspace.id, profileId);
      navigate(`/scans/jobs/${job.id}`);
    } catch (e) {
      setError(e);
    }
  };
  const toggle = async () => {
    try {
      await api.updateScanProfile(currentWorkspace.id, profileId, {
        version: profile.version,
        is_enabled: !profile.is_enabled,
      });
      await load();
    } catch (e) {
      setError(e);
    }
  };
  return (
    <DashboardLayout>
      <SectionHeader
        title={profile?.name || "Scan profile"}
        description="Validated Nuclei options, authorized Asset targets, and execution controls."
        actions={
          <Link className="btn btn-secondary" to="/scans/profiles">
            Back to profiles
          </Link>
        }
      />
      {error && (
        <div className="notice notice-error" role="alert">
          <strong>
            {error.status === 409 ? "Active job conflict" : "Request failed"}
          </strong>
          <div>{error.message}</div>
        </div>
      )}
      {!profile ? (
        <LoadingState message="Loading scan profile…" />
      ) : (
        <>
          <div className="content-grid">
            <Panel title="Profile">
              <div className="stack">
                <div>
                  <span
                    className={
                      profile.is_enabled
                        ? "badge badge-success"
                        : "badge badge-muted"
                    }
                  >
                    {profile.is_enabled ? "Enabled" : "Disabled"}
                  </span>{" "}
                  <span className="badge">
                    {scanLabel(profile.scanner_type)}
                  </span>
                </div>
                <p>{profile.description || "No description."}</p>
                <pre className="mono" style={{ whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(profile.configuration_json, null, 2)}
                </pre>
                {canManageScans(currentWorkspace.role_key) && (
                  <button className="btn btn-secondary" onClick={toggle}>
                    {profile.is_enabled ? "Disable" : "Enable"}
                  </button>
                )}
              </div>
            </Panel>
            <Panel title="Execution">
              <span
                className={
                  health?.available
                    ? "badge badge-success"
                    : "badge badge-warning"
                }
              >
                {health?.available ? "Nuclei available" : "Nuclei unavailable"}
              </span>
              <p>{health?.message}</p>
              <button
                className="btn btn-primary"
                disabled={
                  !health?.available ||
                  !profile.is_enabled ||
                  !profile.target_count ||
                  !canRunScans(currentWorkspace.role_key)
                }
                onClick={run}
              >
                Run scan
              </button>
            </Panel>
          </div>
          <Panel
            title={`Targets · ${profile.target_count}`}
            style={{ marginTop: 16 }}
          >
            {profile.targets.length ? (
              <div className="data-list">
                {profile.targets.map((t) => (
                  <div className="data-row" key={t.asset_id}>
                    <div>
                      <h3>{t.asset_name}</h3>
                      <p className="mono">{t.normalized_target}</p>
                    </div>
                    {canManageScans(currentWorkspace.role_key) && (
                      <button
                        className="btn btn-danger"
                        onClick={() => remove(t.asset_id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No targets"
                description="Add an authorized, supported Asset before running this profile."
              />
            )}
          </Panel>
          {canManageScans(currentWorkspace.role_key) && (
            <Panel title="Available Assets" style={{ marginTop: 16 }}>
              <div className="data-list">
                {assets
                  .filter((a) => !assigned.has(a.id))
                  .map((a) => (
                    <div className="data-row" key={a.id}>
                      <div>
                        <h3>{a.name}</h3>
                        <p>
                          {scanLabel(a.asset_type)} ·{" "}
                          <span className="mono">
                            {a.normalized_identifier}
                          </span>
                        </p>
                        {!supported.has(a.asset_type) && (
                          <span className="badge badge-warning">
                            Unsupported by Nuclei
                          </span>
                        )}
                      </div>
                      <button
                        className="btn btn-secondary"
                        disabled={!supported.has(a.asset_type)}
                        onClick={() => add(a.id)}
                      >
                        Add
                      </button>
                    </div>
                  ))}
              </div>
            </Panel>
          )}
        </>
      )}
    </DashboardLayout>
  );
};
export default ScanProfileDetail;
