import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import SectionHeader from "../components/SectionHeader";
import Panel from "../components/Panel";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { useTenancy } from "../contexts/TenancyContext";
import { api } from "../lib/api";
import {
  ACTIVE_SCAN_STATUSES,
  canManageScans,
  formatScanDate,
  scanLabel,
} from "../lib/scans";
export const ScanJobDetail = () => {
  const { jobId } = useParams();
  const { currentWorkspace } = useTenancy();
  const [job, setJob] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    if (!currentWorkspace) return;
    try {
      const [j, r] = await Promise.all([
        api.getScanJob(currentWorkspace.id, jobId),
        api.getScanResults(currentWorkspace.id, jobId),
      ]);
      setJob(j);
      setResults(r);
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [currentWorkspace?.id, jobId]);
  useEffect(() => {
    load();
    if (!job || ACTIVE_SCAN_STATUSES.includes(job.status)) {
      const timer = setInterval(load, 3000);
      return () => clearInterval(timer);
    }
  }, [load, job?.status]);
  const cancel = async () => {
    try {
      setJob(await api.cancelScanJob(currentWorkspace.id, jobId));
      await load();
    } catch (e) {
      setError(e);
    }
  };
  return (
    <DashboardLayout>
      <SectionHeader
        title="Scan job"
        description="Execution progress, safe result summaries, Finding ingestion, and target outcomes."
        actions={
          <Link className="btn btn-secondary" to="/scans">
            Back to scans
          </Link>
        }
      />
      {error && (
        <div className="notice notice-error" role="alert">
          {error.message}
        </div>
      )}
      {!job ? (
        <LoadingState message="Loading scan job…" />
      ) : (
        <>
          <div className="content-grid">
            <Panel title={job.profile_name || "Profile execution"}>
              <div className="stack">
                <span
                  className={`badge ${job.status === "completed" ? "badge-success" : job.status === "failed" ? "badge-danger" : "badge-info"}`}
                >
                  {scanLabel(job.status)}
                </span>
                <p>
                  {scanLabel(job.scanner_type)} · requested{" "}
                  {formatScanDate(job.created_at)}
                </p>
                <p>
                  {job.processed_target_count}/{job.target_count} targets ·{" "}
                  {job.raw_result_count} safe raw records
                </p>
                <p>
                  Attempt {job.attempt_count}/{job.max_attempts} ·{" "}
                  {scanLabel(job.origin)} origin
                </p>
                {job.schedule_id && (
                  <Link to={`/scans/schedules/${job.schedule_id}`}>
                    Open associated schedule
                  </Link>
                )}
                {job.scheduled_for && (
                  <p>Scheduled for {formatScanDate(job.scheduled_for)}</p>
                )}
                {job.next_retry_at && (
                  <div className="notice notice-info">
                    Retry scheduled for {formatScanDate(job.next_retry_at)}.
                  </div>
                )}
                {job.stalled && (
                  <div className="notice notice-error">
                    The worker lease expired. Recovery will retry or fail this
                    job according to its attempt policy.
                  </div>
                )}
                {job.cancellation_requested_at && (
                  <div className="notice notice-info">
                    Cancellation requested. The worker will stop at the next
                    safe boundary.
                  </div>
                )}
                {job.failure_message && (
                  <div className="notice notice-error">
                    {job.failure_message}
                  </div>
                )}
                {canManageScans(currentWorkspace.role_key) &&
                  ["queued", "claimed", "running", "processing"].includes(
                    job.status,
                  ) && (
                    <button className="btn btn-danger" onClick={cancel}>
                      Cancel job
                    </button>
                  )}
              </div>
            </Panel>
            <Panel title="Finding ingestion">
              <div className="data-list">
                <div className="data-row">
                  <span>Created</span>
                  <strong>{job.findings_created_count}</strong>
                </div>
                <div className="data-row">
                  <span>Updated</span>
                  <strong>{job.findings_updated_count}</strong>
                </div>
                <div className="data-row">
                  <span>Reopened</span>
                  <strong>{job.findings_reopened_count}</strong>
                </div>
                <div className="data-row">
                  <span>Unchanged</span>
                  <strong>{job.findings_unchanged_count}</strong>
                </div>
              </div>
            </Panel>
          </div>
          <Panel title="Target progress" style={{ marginTop: 16 }}>
            <div className="data-list">
              {job.targets.map((t) => (
                <div className="data-row" key={t.id}>
                  <div>
                    <h3 className="mono">{t.normalized_target}</h3>
                    <p>
                      {scanLabel(t.asset_type)} · {t.result_count} results
                    </p>
                  </div>
                  <span
                    className={`badge ${t.execution_status === "completed" ? "badge-success" : t.execution_status === "failed" ? "badge-danger" : "badge-info"}`}
                  >
                    {scanLabel(t.execution_status)}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel
            title={`Safe result summaries · ${results.length}`}
            style={{ marginTop: 16 }}
          >
            {results.length ? (
              <div className="data-list">
                {results.map((r) => (
                  <div className="data-row" key={r.id}>
                    <div>
                      <h3>{r.summary.template_id || "Nuclei result"}</h3>
                      <p>
                        {r.summary.severity || "unknown"} ·{" "}
                        {r.summary.matched_at || "location withheld"}
                      </p>
                      {r.finding_id && (
                        <Link to={`/findings/${r.finding_id}`}>
                          Open generated Finding
                        </Link>
                      )}
                    </div>
                    <span className="mono muted">
                      {r.payload_hash.slice(0, 12)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No results"
                description={
                  ACTIVE_SCAN_STATUSES.includes(job.status)
                    ? "Results will appear after execution."
                    : "This scan produced no persisted results."
                }
              />
            )}
          </Panel>
        </>
      )}
    </DashboardLayout>
  );
};
export default ScanJobDetail;
