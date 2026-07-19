import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import SectionHeader from "../components/SectionHeader";
import Panel from "../components/Panel";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { useTenancy } from "../contexts/TenancyContext";
import { api } from "../lib/api";
import { canManageScans, formatScanDate, scanLabel } from "../lib/scans";
const ZONES = ["UTC", "Asia/Kolkata", "America/New_York", "Europe/London"];
export const ScanSchedules = () => {
  const { currentWorkspace } = useTenancy();
  const [data, setData] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    name: "",
    profile_id: "",
    schedule_type: "interval",
    interval_minutes: 60,
    cron_expression: "0 2 * * *",
    timezone: "UTC",
    misfire_policy: "run_once",
  });
  const load = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const [s, p] = await Promise.all([
        api.getScanSchedules(currentWorkspace.id, { page_size: 100 }),
        api.getScanProfiles(currentWorkspace.id),
      ]);
      setData(s);
      setProfiles(p);
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
      await api.createScanSchedule(currentWorkspace.id, {
        name: form.name,
        profile_id: form.profile_id,
        schedule_type: form.schedule_type,
        interval_minutes:
          form.schedule_type === "interval"
            ? Number(form.interval_minutes)
            : null,
        cron_expression:
          form.schedule_type === "cron" ? form.cron_expression : null,
        timezone: form.timezone,
        is_enabled: true,
        misfire_policy: form.misfire_policy,
        max_catch_up_runs: 1,
      });
      setCreating(false);
      await load();
    } catch (e) {
      setError(e);
    }
  };
  const preview =
    form.schedule_type === "interval"
      ? `Every ${form.interval_minutes} minutes`
      : `${form.cron_expression} in ${form.timezone}`;
  return (
    <DashboardLayout>
      <SectionHeader
        title="Scan schedules"
        description="Durable interval and five-field cron schedules processed by PostgreSQL-backed workers."
        actions={
          <>
            <Link className="btn btn-secondary" to="/scans">
              Scan overview
            </Link>
            {canManageScans(currentWorkspace?.role_key) && (
              <button
                className="btn btn-primary"
                onClick={() => setCreating((v) => !v)}
              >
                {creating ? "Close" : "Create schedule"}
              </button>
            )}
          </>
        }
      />
      {error && (
        <div className="notice notice-error" role="alert">
          <strong>
            {error.status === 409
              ? "Schedule conflict"
              : "Schedule request failed"}
          </strong>
          <div>{error.message}</div>
        </div>
      )}
      {creating && (
        <Panel title="New schedule">
          <form className="stack" onSubmit={submit}>
            <label className="field">
              Name
              <input
                className="input"
                required
                minLength={2}
                value={form.name}
                onChange={(e) =>
                  setForm((v) => ({ ...v, name: e.target.value }))
                }
              />
            </label>
            <label className="field">
              Profile
              <select
                className="select"
                required
                value={form.profile_id}
                onChange={(e) =>
                  setForm((v) => ({ ...v, profile_id: e.target.value }))
                }
              >
                <option value="">Select profile</option>
                {profiles.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Schedule type
              <select
                className="select"
                value={form.schedule_type}
                onChange={(e) =>
                  setForm((v) => ({ ...v, schedule_type: e.target.value }))
                }
              >
                <option value="interval">Interval</option>
                <option value="cron">Cron</option>
              </select>
            </label>
            {form.schedule_type === "interval" ? (
              <label className="field">
                Interval minutes
                <input
                  className="input"
                  type="number"
                  min="15"
                  max="525600"
                  value={form.interval_minutes}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, interval_minutes: e.target.value }))
                  }
                />
              </label>
            ) : (
              <label className="field">
                Cron expression
                <input
                  className="input mono"
                  value={form.cron_expression}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, cron_expression: e.target.value }))
                  }
                />
              </label>
            )}
            <label className="field">
              Timezone
              <select
                className="select"
                value={form.timezone}
                onChange={(e) =>
                  setForm((v) => ({ ...v, timezone: e.target.value }))
                }
              >
                {ZONES.map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Misfire policy
              <select
                className="select"
                value={form.misfire_policy}
                onChange={(e) =>
                  setForm((v) => ({ ...v, misfire_policy: e.target.value }))
                }
              >
                <option value="run_once">Run once</option>
                <option value="skip">Skip</option>
              </select>
            </label>
            <div className="notice notice-info">
              Next-run preview: {preview}. The API calculates the authoritative
              timezone-aware timestamp.
            </div>
            <button className="btn btn-primary">Create schedule</button>
          </form>
        </Panel>
      )}
      {data === null ? (
        <LoadingState message="Loading schedules…" />
      ) : (
        <Panel
          title={`${data.total} schedule${data.total === 1 ? "" : "s"}`}
          style={{ marginTop: 16 }}
        >
          {data.items.length ? (
            <div className="data-list">
              {data.items.map((s) => (
                <Link
                  className="data-row"
                  style={{ textDecoration: "none" }}
                  key={s.id}
                  to={`/scans/schedules/${s.id}`}
                >
                  <div>
                    <h3>{s.name}</h3>
                    <p>
                      {s.profile_name} · {scanLabel(s.schedule_type)} ·{" "}
                      {s.timezone}
                    </p>
                    <p>Next {formatScanDate(s.next_run_at)}</p>
                  </div>
                  <div>
                    <span
                      className={
                        s.is_enabled
                          ? "badge badge-success"
                          : "badge badge-muted"
                      }
                    >
                      {s.is_enabled ? "Enabled" : "Disabled"}
                    </span>
                    {s.last_outcome && (
                      <p className="muted">{scanLabel(s.last_outcome)}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No scan schedules"
              description="Create a schedule for an enabled scan profile."
            />
          )}
        </Panel>
      )}
    </DashboardLayout>
  );
};
export default ScanSchedules;
