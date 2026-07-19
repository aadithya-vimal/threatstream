import React, { useEffect, useState } from 'react';
import { FINDING_SEVERITIES, severityLabel } from '../lib/findings';

const defaults = { title: '', description: '', severity: 'medium', source: 'manual', external_id: '', remediation: '', assignee_user_id: '', asset_id: '' };

export const FindingForm = ({ finding, assignees = [], assets = [], pending = false, submitLabel = 'Save finding', onSubmit, onCancel }) => {
  const [values, setValues] = useState(defaults);
  const [assetSearch, setAssetSearch] = useState('');
  useEffect(() => setValues(finding ? {
    title: finding.title || '', description: finding.description || '', severity: finding.severity || 'medium',
    source: finding.source || 'manual', external_id: finding.external_id || '', remediation: finding.remediation || '',
    resolution_summary: finding.resolution_summary || '', assignee_user_id: finding.assignee?.id || '', asset_id: finding.asset?.id || ''
  } : defaults), [finding?.id, finding?.version]);
  const set = (key, value) => setValues(current => ({ ...current, [key]: value }));
  const submit = event => {
    event.preventDefault();
    onSubmit({
      title: values.title.trim(), description: values.description.trim(), severity: values.severity,
      ...(finding ? {} : { source: values.source.trim(), external_id: values.external_id.trim() || null }),
      remediation: values.remediation.trim() || null,
      ...(finding ? { resolution_summary: values.resolution_summary.trim() || null, version: finding.version } : {}),
      assignee_user_id: values.assignee_user_id || null, asset_id: values.asset_id || null
    });
  };
  const allAssetOptions = finding?.asset && !assets.some(asset => asset.id === finding.asset.id) ? [finding.asset, ...assets] : assets;
  const assetOptions = allAssetOptions.filter(asset => `${asset.name} ${asset.canonical_identifier}`.toLowerCase().includes(assetSearch.trim().toLowerCase()));
  return <form className="stack" onSubmit={submit}>
    <label className="field">Title<input className="input" required minLength={3} maxLength={240} value={values.title} onChange={e=>set('title',e.target.value)} /></label>
    <label className="field">Description<textarea className="textarea" required minLength={3} maxLength={20000} value={values.description} onChange={e=>set('description',e.target.value)} /></label>
    <div className="content-grid" style={{marginTop:0}}>
      <label className="field">Severity<select className="select" value={values.severity} onChange={e=>set('severity',e.target.value)}>{FINDING_SEVERITIES.map(value=><option key={value} value={value}>{severityLabel(value)}</option>)}</select></label>
      <label className="field">Assignee<select className="select" value={values.assignee_user_id} onChange={e=>set('assignee_user_id',e.target.value)}><option value="">Unassigned</option>{assignees.map(user=><option key={user.id} value={user.id}>{user.display_name || user.email || user.id}</option>)}</select></label>
      <div className="field"><label>Asset search<input className="input" value={assetSearch} onChange={e=>setAssetSearch(e.target.value)} placeholder="Search name or identifier" /></label><label>Asset<select className="select" value={values.asset_id||''} onChange={e=>set('asset_id',e.target.value)}><option value="">No asset</option>{assetOptions.map(asset=><option key={asset.id} value={asset.id}>{asset.name} · {asset.canonical_identifier}{asset.is_active?'':' (inactive)'}</option>)}</select></label></div>
    </div>
    {!finding&&<div className="content-grid" style={{marginTop:0}}><label className="field">Source<input className="input" required minLength={2} maxLength={120} value={values.source} onChange={e=>set('source',e.target.value)} /></label><label className="field">External ID<input className="input" maxLength={240} value={values.external_id} onChange={e=>set('external_id',e.target.value)} placeholder="Optional scanner identifier" /></label></div>}
    <label className="field">Remediation guidance<textarea className="textarea" maxLength={20000} value={values.remediation} onChange={e=>set('remediation',e.target.value)} /></label>
    {finding&&<label className="field">Resolution summary<textarea className="textarea" maxLength={10000} value={values.resolution_summary} onChange={e=>set('resolution_summary',e.target.value)} /></label>}
    <div className="panel__actions"><button className="btn btn-primary" disabled={pending}>{pending?'Saving…':submitLabel}</button>{onCancel&&<button type="button" className="btn btn-secondary" onClick={onCancel} disabled={pending}>Cancel</button>}</div>
  </form>;
};
export default FindingForm;
