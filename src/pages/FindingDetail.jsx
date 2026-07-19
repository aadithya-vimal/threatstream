import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import SectionHeader from "../components/SectionHeader";
import Panel from "../components/Panel";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import FindingForm from "../components/FindingForm";
import { useTenancy } from "../contexts/TenancyContext";
import { api } from "../lib/api";
import {
  canTriageFindings,
  formatFindingDate,
  severityLabel,
  statusLabel,
  transitionsFor,
} from "../lib/findings";

const ErrorNotice = ({ error }) =>
  error ? (
    <div
      className="notice notice-error"
      role="alert"
      style={{ marginBottom: 14 }}
    >
      <strong>
        {error.status === 409 ? "Finding changed" : "Request failed"}
      </strong>
      <div>{error.message}</div>
      {error.correlationId && (
        <div className="mono">Correlation: {error.correlationId}</div>
      )}
    </div>
  ) : null;

export const FindingDetail = () => {
  const { findingId } = useParams();
  const navigate = useNavigate();
  const { currentWorkspace } = useTenancy();
  const [finding, setFinding] = useState(null);
  const [assignees, setAssignees] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [nextStatus, setNextStatus] = useState("");
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");
  const [evidence, setEvidence] = useState({
    kind: "text",
    title: "",
    content: "",
  });
  const canManage = canTriageFindings(currentWorkspace?.role_key);
  const load = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const [detail, users, assetResult] = await Promise.all([
        api.getFinding(currentWorkspace.id, findingId),
        api.getFindingAssignees(currentWorkspace.id),
        api.getAssets(currentWorkspace.id, {
          page_size: 100,
          sort: "name",
          direction: "asc",
        }),
      ]);
      setFinding(detail);
      setAssignees(users);
      setAssets(assetResult.items);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, findingId]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    setNextStatus(finding ? transitionsFor(finding.status)[0] || "" : "");
  }, [finding?.status]);
  const act = async (action) => {
    setPending(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (e) {
      setError(e);
    } finally {
      setPending(false);
    }
  };
  const update = (payload) =>
    act(async () => {
      await api.updateFinding(currentWorkspace.id, finding.id, payload);
      setEditing(false);
    });
  const transition = (event) => {
    event.preventDefault();
    act(async () => {
      await api.transitionFinding(currentWorkspace.id, finding.id, {
        version: finding.version,
        status: nextStatus,
        note: note.trim() || null,
      });
      setNote("");
    });
  };
  const addComment = (event) => {
    event.preventDefault();
    act(async () => {
      await api.addFindingComment(
        currentWorkspace.id,
        finding.id,
        finding.version,
        comment.trim(),
      );
      setComment("");
    });
  };
  const addEvidence = (event) => {
    event.preventDefault();
    act(async () => {
      await api.addFindingEvidence(currentWorkspace.id, finding.id, {
        ...evidence,
        version: finding.version,
        title: evidence.title.trim(),
        content: evidence.content.trim(),
      });
      setEvidence({ kind: "text", title: "", content: "" });
    });
  };
  const removeEvidence = (item) => {
    if (window.confirm(`Delete evidence “${item.title}”?`))
      act(() =>
        api.deleteFindingEvidence(
          currentWorkspace.id,
          finding.id,
          item.id,
          finding.version,
        ),
      );
  };
  const removeFinding = () => {
    if (window.confirm(`Delete “${finding.title}”? This cannot be undone.`))
      act(async () => {
        await api.deleteFinding(
          currentWorkspace.id,
          finding.id,
          finding.version,
        );
        navigate("/findings");
      });
  };
  return (
    <DashboardLayout>
      <SectionHeader
        title={finding?.title || "Finding detail"}
        description="Live workspace finding, evidence, discussion, and append-only activity."
        actions={
          <Link className="btn btn-secondary" to="/findings">
            Back to findings
          </Link>
        }
      />
      {!currentWorkspace ? (
        <EmptyState
          title="No workspace selected"
          description="Select a workspace to view this finding."
        />
      ) : loading && !finding ? (
        <LoadingState message="Loading finding…" />
      ) : error?.status === 404 ? (
        <EmptyState
          title="Finding not found"
          description="It does not exist in the selected workspace or is no longer available."
        />
      ) : !finding ? (
        <>
          <ErrorNotice error={error} />
          <EmptyState
            title="Finding unavailable"
            description="Refresh to try loading the finding again."
          />
        </>
      ) : (
        <>
          <ErrorNotice error={error} />
          {editing ? (
            <Panel
              title="Edit finding"
              hint="The version is checked on save to prevent overwriting newer changes."
            >
              <FindingForm
                finding={finding}
                assignees={assignees}
                assets={assets}
                pending={pending}
                onSubmit={update}
                onCancel={() => setEditing(false)}
              />
            </Panel>
          ) : (
            <div className="content-grid">
              <Panel
                title="Finding"
                actions={
                  canManage ? (
                    <button
                      className="btn btn-secondary"
                      onClick={() => setEditing(true)}
                    >
                      Edit
                    </button>
                  ) : null
                }
              >
                <div className="stack">
                  <div>
                    <span
                      className={`badge ${finding.severity === "critical" || finding.severity === "high" ? "badge-danger" : finding.severity === "medium" ? "badge-warning" : "badge-info"}`}
                    >
                      {severityLabel(finding.severity)}
                    </span>{" "}
                    <span className="badge">{statusLabel(finding.status)}</span>
                  </div>
                  <p style={{ whiteSpace: "pre-wrap" }}>
                    {finding.description}
                  </p>
                  <div className="data-row">
                    <div>
                      <h3>Source</h3>
                      <p>
                        {finding.source}
                        {finding.external_id ? ` · ${finding.external_id}` : ""}
                      </p>
                    </div>
                    <div>
                      <h3>Assignee</h3>
                      <p>
                        {finding.assignee?.display_name ||
                          finding.assignee?.email ||
                          "Unassigned"}
                      </p>
                    </div>
                  </div>
                  {finding.asset && (
                    <div>
                      <h3>Asset</h3>
                      <p>
                        <Link to={`/assets/${finding.asset.id}`}>
                          {finding.asset.name}
                        </Link>{" "}
                        · {finding.asset.canonical_identifier}
                        {!finding.asset.is_active && " · inactive"}
                      </p>
                    </div>
                  )}
                  {finding.remediation && (
                    <div>
                      <h3>Remediation</h3>
                      <p className="muted" style={{ whiteSpace: "pre-wrap" }}>
                        {finding.remediation}
                      </p>
                    </div>
                  )}
                  {finding.resolution_summary && (
                    <div>
                      <h3>Resolution summary</h3>
                      <p className="muted" style={{ whiteSpace: "pre-wrap" }}>
                        {finding.resolution_summary}
                      </p>
                    </div>
                  )}
                  <p className="mono muted">
                    Created {formatFindingDate(finding.created_at)} · Updated{" "}
                    {formatFindingDate(finding.updated_at)} · Version{" "}
                    {finding.version}
                  </p>
                </div>
              </Panel>
              <Panel
                title="Lifecycle"
                hint={
                  canManage
                    ? "Every state change creates domain activity and an audit event."
                    : "Your role has read-only access."
                }
              >
                {canManage && transitionsFor(finding.status).length ? (
                  <form className="stack" onSubmit={transition}>
                    <label className="field">
                      Next status
                      <select
                        className="select"
                        value={nextStatus}
                        onChange={(e) => setNextStatus(e.target.value)}
                      >
                        {transitionsFor(finding.status).map((value) => (
                          <option key={value} value={value}>
                            {statusLabel(value)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Resolution or reopen note
                      <textarea
                        className="textarea"
                        maxLength={2000}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Required when resolving, closing without an existing summary, or reopening"
                      />
                    </label>
                    <button
                      className="btn btn-primary"
                      disabled={pending || !nextStatus}
                    >
                      Change status
                    </button>
                  </form>
                ) : (
                  <div className="notice notice-info">
                    {finding.status === "closed" && !canManage
                      ? "This finding is closed."
                      : "No permitted transition is available."}
                  </div>
                )}
                {canManage && (
                  <button
                    className="btn btn-danger"
                    style={{ marginTop: 18 }}
                    onClick={removeFinding}
                    disabled={pending}
                  >
                    Delete finding
                  </button>
                )}
              </Panel>
            </div>
          )}
          <div className="content-grid">
            <Panel title={`Evidence · ${finding.evidence.length}`}>
              {finding.evidence.length ? (
                <div className="data-list">
                  {finding.evidence.map((item) => (
                    <article className="data-row" key={item.id}>
                      <div>
                        <h3>{item.title}</h3>
                        {item.kind === "url" ? (
                          <a
                            href={item.content}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {item.content}
                          </a>
                        ) : (
                          <p style={{ whiteSpace: "pre-wrap" }}>
                            {item.content}
                          </p>
                        )}
                      </div>
                      {canManage && (
                        <button
                          className="btn btn-danger"
                          onClick={() => removeEvidence(item)}
                          disabled={pending}
                        >
                          Delete
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No evidence"
                  description="Attach text, a safe URL, or code evidence to support triage."
                />
              )}
              {canManage && (
                <form
                  className="stack"
                  style={{ marginTop: 18 }}
                  onSubmit={addEvidence}
                >
                  <div className="content-grid" style={{ marginTop: 0 }}>
                    <label className="field">
                      Type
                      <select
                        className="select"
                        value={evidence.kind}
                        onChange={(e) =>
                          setEvidence((v) => ({ ...v, kind: e.target.value }))
                        }
                      >
                        <option value="text">Text</option>
                        <option value="url">URL</option>
                        <option value="code">Code</option>
                      </select>
                    </label>
                    <label className="field">
                      Title
                      <input
                        className="input"
                        required
                        minLength={2}
                        maxLength={200}
                        value={evidence.title}
                        onChange={(e) =>
                          setEvidence((v) => ({ ...v, title: e.target.value }))
                        }
                      />
                    </label>
                  </div>
                  <label className="field">
                    Content
                    <textarea
                      className="textarea"
                      required
                      maxLength={30000}
                      value={evidence.content}
                      onChange={(e) =>
                        setEvidence((v) => ({ ...v, content: e.target.value }))
                      }
                    />
                  </label>
                  <button className="btn btn-secondary" disabled={pending}>
                    Add evidence
                  </button>
                </form>
              )}
            </Panel>
            <Panel title={`Comments · ${finding.comments.length}`}>
              {finding.comments.length ? (
                <div className="data-list">
                  {finding.comments.map((item) => (
                    <article className="data-row" key={item.id}>
                      <div>
                        <h3>
                          {item.author_name ||
                            item.author_email ||
                            "Workspace user"}
                        </h3>
                        <p style={{ whiteSpace: "pre-wrap" }}>{item.body}</p>
                      </div>
                      <span className="mono muted">
                        {formatFindingDate(item.created_at)}
                      </span>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No comments"
                  description="Use comments for durable triage context."
                />
              )}
              {canManage && (
                <form
                  className="stack"
                  style={{ marginTop: 18 }}
                  onSubmit={addComment}
                >
                  <label className="field">
                    Add comment
                    <textarea
                      className="textarea"
                      required
                      maxLength={10000}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </label>
                  <button className="btn btn-secondary" disabled={pending}>
                    Post comment
                  </button>
                </form>
              )}
            </Panel>
          </div>
          <Panel
            title="Activity history"
            hint="Newest first; status changes are also written to the workspace audit log."
            style={{ marginTop: 16 }}
          >
            {finding.activity.length ? (
              <div className="data-list">
                {finding.activity.map((item) => (
                  <article className="data-row" key={item.id}>
                    <div>
                      <h3>{item.action.replaceAll(".", " · ")}</h3>
                      <p>
                        {item.actor_name || item.actor_email || "System actor"}
                        {item.from_status && item.to_status
                          ? ` · ${statusLabel(item.from_status)} → ${statusLabel(item.to_status)}`
                          : ""}
                      </p>
                    </div>
                    <span className="mono muted">
                      {formatFindingDate(item.created_at)}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No activity"
                description="Finding activity will appear after changes are recorded."
              />
            )}
          </Panel>
        </>
      )}
    </DashboardLayout>
  );
};
export default FindingDetail;
