import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import SectionHeader from "../components/SectionHeader";
import Panel from "../components/Panel";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { useTenancy } from "../contexts/TenancyContext";
import { api } from "../lib/api";
import { canManageScans, scanLabel } from "../lib/scans";
export const ScanProfiles = () => {
  const { currentWorkspace } = useTenancy();
  const [items, setItems] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    severities: [],
  });
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    if (currentWorkspace)
      try {
        setItems(await api.getScanProfiles(currentWorkspace.id));
        setError(null);
      } catch (e) {
        setError(e);
      }
  }, [currentWorkspace?.id]);
  useEffect(() => {
    load();
  }, [load]);
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.createScanProfile(currentWorkspace.id, {
        name: form.name,
        description: form.description || null,
        scanner_type: "nuclei",
        configuration_json: { severities: form.severities },
        is_enabled: true,
      });
      setCreating(false);
      setForm({ name: "", description: "", severities: [] });
      await load();
    } catch (e) {
      setError(e);
    }
  };
  return (
    <DashboardLayout>
      <SectionHeader
        title="Scan profiles"
        description="Reusable, validated scanner configuration and Asset targets."
        actions={
          <>
            <Link className="btn btn-secondary" to="/scans">
              Overview
            </Link>
            {canManageScans(currentWorkspace?.role_key) && (
              <button
                className="btn btn-primary"
                onClick={() => setCreating((v) => !v)}
              >
                {creating ? "Close" : "Create profile"}
              </button>
            )}
          </>
        }
      />
      {error && (
        <div className="notice notice-error" role="alert">
          {error.message}
        </div>
      )}
      {creating && (
        <Panel title="New Nuclei profile">
          <form className="stack" onSubmit={submit}>
            <label className="field">
              Name
              <input
                className="input"
                required
                minLength={2}
                maxLength={160}
                value={form.name}
                onChange={(e) =>
                  setForm((v) => ({ ...v, name: e.target.value }))
                }
              />
            </label>
            <label className="field">
              Description
              <textarea
                className="textarea"
                maxLength={5000}
                value={form.description}
                onChange={(e) =>
                  setForm((v) => ({ ...v, description: e.target.value }))
                }
              />
            </label>
            <fieldset className="field">
              <legend>Severity filters</legend>
              {["critical", "high", "medium", "low", "info"].map((s) => (
                <label key={s} style={{ marginRight: 14 }}>
                  <input
                    type="checkbox"
                    checked={form.severities.includes(s)}
                    onChange={(e) =>
                      setForm((v) => ({
                        ...v,
                        severities: e.target.checked
                          ? [...v.severities, s]
                          : v.severities.filter((x) => x !== s),
                      }))
                    }
                  />{" "}
                  {scanLabel(s)}
                </label>
              ))}
            </fieldset>
            <button className="btn btn-primary">Create profile</button>
          </form>
        </Panel>
      )}
      {items === null ? (
        <LoadingState message="Loading profiles…" />
      ) : (
        <Panel
          title={`${items.length} profile${items.length === 1 ? "" : "s"}`}
          style={{ marginTop: 16 }}
        >
          {items.length ? (
            <div className="data-list">
              {items.map((p) => (
                <Link
                  className="data-row"
                  style={{ textDecoration: "none" }}
                  to={`/scans/profiles/${p.id}`}
                  key={p.id}
                >
                  <div>
                    <h3>{p.name}</h3>
                    <p>
                      {scanLabel(p.scanner_type)} · {p.target_count} targets
                    </p>
                  </div>
                  <span
                    className={
                      p.is_enabled ? "badge badge-success" : "badge badge-muted"
                    }
                  >
                    {p.is_enabled ? "Enabled" : "Disabled"}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No profiles"
              description="Create a Nuclei profile to configure authorized Asset targets."
            />
          )}
        </Panel>
      )}
    </DashboardLayout>
  );
};
export default ScanProfiles;
