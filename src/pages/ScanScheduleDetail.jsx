import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import SectionHeader from "../components/SectionHeader";
import Panel from "../components/Panel";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import { useTenancy } from "../contexts/TenancyContext";
import { api } from "../lib/api";
import { canManageScans, formatScanDate, scanLabel } from "../lib/scans";
export const ScanScheduleDetail = () => {
  const { scheduleId } = useParams();
  const { currentWorkspace } = useTenancy();
  const [schedule, setSchedule] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);
  const [name, setName] = useState("");
  const load = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const value = await api.getScanSchedule(currentWorkspace.id, scheduleId);
      setSchedule(value);
      setName(value.name);
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [currentWorkspace?.id, scheduleId]);
  useEffect(() => {
    load();
  }, [load]);
  const toggle = async () => {
    try {
      const fn = schedule.is_enabled
        ? api.disableScanSchedule
        : api.enableScanSchedule;
      setSchedule(await fn(currentWorkspace.id, schedule.id, schedule.version));
    } catch (e) {
      setError(e);
    }
  };
  const save = async (e) => {
    e.preventDefault();
    try {
      setSchedule(
        await api.updateScanSchedule(currentWorkspace.id, schedule.id, {
          version: schedule.version,
          name,
        }),
      );
      setEditing(false);
    } catch (e) {
      setError(e);
    }
  };
  return (
    <DashboardLayout>
      <SectionHeader
        title={schedule?.name || "Scan schedule"}
        description="Durable schedule state, next execution, misfire behavior, and generated job history."
        actions={
          <Link className="btn btn-secondary" to="/scans/schedules">
            Back to schedules
          </Link>
        }
      />
      {error && (
        <div className="notice notice-error" role="alert">
          <strong>
            {error.status === 409 ? "Schedule changed" : "Request failed"}
          </strong>
          <div>{error.message}</div>
        </div>
      )}
      {!schedule ? (
        <LoadingState message="Loading schedule…" />
      ) : (
        <div className="content-grid">
          <Panel title="Schedule">
            <div className="stack">
              <div>
                <span
                  className={
                    schedule.is_enabled
                      ? "badge badge-success"
                      : "badge badge-muted"
                  }
                >
                  {schedule.is_enabled ? "Enabled" : "Disabled"}
                </span>{" "}
                <span className="badge">
                  {scanLabel(schedule.schedule_type)}
                </span>
              </div>
              <p>
                {schedule.interval_minutes
                  ? `Every ${schedule.interval_minutes} minutes`
                  : schedule.cron_expression}{" "}
                · {schedule.timezone}
              </p>
              <p>
                Misfire: {scanLabel(schedule.misfire_policy)} · Next{" "}
                {formatScanDate(schedule.next_run_at)}
              </p>
              <p>
                Last run {formatScanDate(schedule.last_run_at)} · Outcome{" "}
                {scanLabel(schedule.last_outcome || "none")}
              </p>
              {schedule.last_job_id && (
                <Link to={`/scans/jobs/${schedule.last_job_id}`}>
                  Open last generated job
                </Link>
              )}
            </div>
          </Panel>
          <Panel title="Controls">
            {canManageScans(currentWorkspace.role_key) ? (
              <div className="stack">
                <button className="btn btn-secondary" onClick={toggle}>
                  {schedule.is_enabled ? "Disable" : "Enable"}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setEditing((v) => !v)}
                >
                  Edit name
                </button>
                {editing && (
                  <form className="stack" onSubmit={save}>
                    <label className="field">
                      Name
                      <input
                        className="input"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </label>
                    <button className="btn btn-primary">Save schedule</button>
                  </form>
                )}
              </div>
            ) : (
              <EmptyState
                title="Read-only schedule"
                description="scan:manage is required to edit this schedule."
              />
            )}
          </Panel>
        </div>
      )}
    </DashboardLayout>
  );
};
export default ScanScheduleDetail;
