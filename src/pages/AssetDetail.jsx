import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import SectionHeader from "../components/SectionHeader";
import Panel from "../components/Panel";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import AssetForm from "../components/AssetForm";
import { useTenancy } from "../contexts/TenancyContext";
import { api } from "../lib/api";
import {
  assetLabel,
  canManageAssets,
  canWriteAssets,
  formatAssetDate,
} from "../lib/assets";
const Metadata = ({ value }) => {
  const entries = Object.entries(value || {});
  return entries.length ? (
    <div className="data-list">
      {entries.map(([key, item]) => (
        <div className="data-row" key={key}>
          <strong>{key}</strong>
          <code style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {typeof item === "object"
              ? JSON.stringify(item, null, 2)
              : String(item)}
          </code>
        </div>
      ))}
    </div>
  ) : (
    <EmptyState
      title="No metadata"
      description="Scanner and integration metadata will appear here when supplied."
    />
  );
};
export const AssetDetail = () => {
  const { assetId } = useParams();
  const { currentWorkspace } = useTenancy();
  const [asset, setAsset] = useState(null);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);
  const canWrite = canWriteAssets(currentWorkspace?.role_key);
  const canManage = canManageAssets(currentWorkspace?.role_key);
  const load = useCallback(async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const [detail, userList] = await Promise.all([
        api.getAsset(currentWorkspace.id, assetId),
        api.getAssetOwners(currentWorkspace.id),
      ]);
      setAsset(detail);
      setOwners(userList);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id, assetId]);
  useEffect(() => {
    load();
  }, [load]);
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
      await api.updateAsset(currentWorkspace.id, asset.id, payload);
      setEditing(false);
    });
  const toggle = () =>
    act(() =>
      asset.is_active
        ? api.deactivateAsset(currentWorkspace.id, asset.id, asset.version)
        : api.activateAsset(currentWorkspace.id, asset.id, asset.version),
    );
  return (
    <DashboardLayout>
      <SectionHeader
        title={asset?.name || "Asset detail"}
        description="Canonical identity, ownership, classification, metadata, and related workspace findings."
        actions={
          <Link className="btn btn-secondary" to="/assets">
            Back to assets
          </Link>
        }
      />
      {!currentWorkspace ? (
        <EmptyState
          title="No workspace selected"
          description="Select a workspace to inspect this asset."
        />
      ) : loading && !asset ? (
        <LoadingState message="Loading asset…" />
      ) : error?.status === 404 ? (
        <EmptyState
          title="Asset not found"
          description="It does not exist in the selected workspace."
        />
      ) : !asset ? (
        <>
          <div className="notice notice-error" role="alert">
            {error?.message || "Asset unavailable"}
          </div>
          <EmptyState
            title="Asset unavailable"
            description="Refresh to retry."
          />
        </>
      ) : (
        <>
          {error && (
            <div className="notice notice-error" role="alert">
              <strong>
                {error.status === 409 ? "Asset changed" : "Request failed"}
              </strong>
              <div>{error.message}</div>
            </div>
          )}
          {editing ? (
            <Panel
              title="Edit asset"
              hint="Optimistic version checks prevent overwriting newer inventory changes."
            >
              <AssetForm
                asset={asset}
                owners={owners}
                canManage={canManage}
                pending={pending}
                onSubmit={update}
                onCancel={() => setEditing(false)}
              />
            </Panel>
          ) : (
            <div className="content-grid">
              <Panel
                title="Asset identity"
                actions={
                  canWrite ? (
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
                    <span className="badge">
                      {assetLabel(asset.asset_type)}
                    </span>{" "}
                    <span
                      className={`badge ${asset.criticality === "critical" || asset.criticality === "high" ? "badge-danger" : "badge-info"}`}
                    >
                      {assetLabel(asset.criticality)}
                    </span>{" "}
                    <span
                      className={
                        asset.is_active
                          ? "badge badge-success"
                          : "badge badge-muted"
                      }
                    >
                      {asset.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div>
                    <h3>Canonical identifier</h3>
                    <p className="mono" style={{ wordBreak: "break-word" }}>
                      {asset.canonical_identifier}
                    </p>
                  </div>
                  <div>
                    <h3>Normalized identifier</h3>
                    <p
                      className="mono muted"
                      style={{ wordBreak: "break-word" }}
                    >
                      {asset.normalized_identifier}
                    </p>
                  </div>
                  <div className="data-row">
                    <div>
                      <h3>Environment</h3>
                      <p>{assetLabel(asset.environment)}</p>
                    </div>
                    <div>
                      <h3>Owner</h3>
                      <p>
                        {asset.owner?.display_name ||
                          asset.owner?.email ||
                          "Unassigned"}
                      </p>
                    </div>
                  </div>
                  <p style={{ whiteSpace: "pre-wrap" }}>
                    {asset.description || "No description provided."}
                  </p>
                  <p>
                    Tags:{" "}
                    {asset.tags.length
                      ? asset.tags.map((tag) => (
                          <span
                            className="badge"
                            key={tag}
                            style={{ marginRight: 6 }}
                          >
                            {tag}
                          </span>
                        ))
                      : "None"}
                  </p>
                  <p className="mono muted">
                    First seen {formatAssetDate(asset.first_seen_at)} · Last
                    seen {formatAssetDate(asset.last_seen_at)} · Version{" "}
                    {asset.version}
                  </p>
                </div>
              </Panel>
              <Panel
                title="Inventory controls"
                hint={
                  canManage
                    ? "Activation and ownership require asset:manage."
                    : "Your role cannot change activation or ownership."
                }
              >
                <div className="stack">
                  <div>
                    <h3>Source</h3>
                    <p>
                      {asset.source}
                      {asset.external_id ? ` · ${asset.external_id}` : ""}
                    </p>
                  </div>
                  <div>
                    <h3>Related findings</h3>
                    <p>{asset.related_findings_count}</p>
                  </div>
                  {canManage && (
                    <button
                      className={
                        asset.is_active ? "btn btn-danger" : "btn btn-primary"
                      }
                      disabled={pending}
                      onClick={toggle}
                    >
                      {asset.is_active ? "Deactivate asset" : "Activate asset"}
                    </button>
                  )}
                </div>
              </Panel>
            </div>
          )}
          <div className="content-grid">
            <Panel
              title={`Related findings · ${asset.related_findings.length}`}
            >
              {asset.related_findings.length ? (
                <div className="data-list">
                  {asset.related_findings.map((finding) => (
                    <Link
                      className="data-row"
                      style={{ textDecoration: "none" }}
                      key={finding.id}
                      to={`/findings/${finding.id}`}
                    >
                      <div>
                        <h3>{finding.title}</h3>
                        <p>
                          {assetLabel(finding.severity)} ·{" "}
                          {assetLabel(finding.status)}
                        </p>
                      </div>
                      <span className="mono muted">
                        {formatAssetDate(finding.updated_at)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No related findings"
                  description="Findings linked to this asset will remain visible even when the asset is inactive."
                />
              )}
            </Panel>
            <Panel
              title="Safe metadata"
              hint="Known secret-like keys are redacted by the API. Values render as text, never HTML."
            >
              <Metadata value={asset.metadata_json} />
            </Panel>
          </div>
          <Panel
            title="Scan coverage"
            hint="Profiles and recent jobs targeting this Asset."
            style={{ marginTop: 16 }}
          >
            <p>
              Last scanned:{" "}
              {asset.last_scanned_at
                ? formatAssetDate(asset.last_scanned_at)
                : "Never"}
            </p>
            {asset.scan_profiles?.length ? (
              <div className="data-list">
                {asset.scan_profiles.map((profile) => (
                  <Link
                    className="data-row"
                    style={{ textDecoration: "none" }}
                    key={profile.id}
                    to={`/scans/profiles/${profile.id}`}
                  >
                    <div>
                      <h3>{profile.name}</h3>
                      <p>
                        {profile.scanner_type} ·{" "}
                        {profile.is_enabled ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No scan profiles"
                description="This Asset is not assigned to a scan profile."
              />
            )}
            {asset.recent_scan_jobs?.length ? (
              <div className="data-list" style={{ marginTop: 16 }}>
                {asset.recent_scan_jobs.map((job) => (
                  <Link
                    className="data-row"
                    style={{ textDecoration: "none" }}
                    key={job.id}
                    to={`/scans/jobs/${job.id}`}
                  >
                    <span>{job.scanner_type}</span>
                    <span className="badge">{job.status}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </Panel>
          <Panel
            title="Asset activity"
            hint="Safe workspace audit actions for this Asset; newest first."
            style={{ marginTop: 16 }}
          >
            {asset.activity?.length ? (
              <div className="data-list">
                {asset.activity.map((item) => (
                  <div className="data-row" key={item.id}>
                    <div>
                      <h3>{item.action.replaceAll(".", " · ")}</h3>
                      <p>{item.actor_email || "System actor"}</p>
                    </div>
                    <span className="mono muted">
                      {formatAssetDate(item.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No Asset activity"
                description="Audited Asset mutations will appear here."
              />
            )}
          </Panel>
        </>
      )}
    </DashboardLayout>
  );
};
export default AssetDetail;
