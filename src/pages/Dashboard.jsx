import React, { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import Panel from '../components/Panel';
import SectionHeader from '../components/SectionHeader';
import { useTenancy } from '../contexts/TenancyContext';

const foundations = [
  ['Authenticated web application', 'Available', 'React, Vite, and Neon Auth provide the protected application shell.'],
  ['Tenant authorization', 'Available', 'Organizations, workspaces, teams, backend permissions, RLS boundaries, and audit foundations are implemented.'],
  ['Background execution concepts', 'Experimental', 'Jobs and plugins exist in the legacy archive but are not active API capabilities.'],
  ['Repository-to-runtime workflow', 'Planned', 'Applications, GitHub, normalized findings, deployments, runtime events, remediation, and verification are next.']
];

const workflow = [
  'Connect a repository to an application',
  'Run versioned scanners in a dedicated worker',
  'Normalize and deduplicate findings',
  'Map a commit or artifact to a deployment',
  'Ingest an authenticated runtime event',
  'Correlate evidence and assign remediation',
  'Rescan, redeploy, and verify the fix'
];

const statusStyle = {
  Available: { color: 'var(--color-low)', background: 'var(--color-low-bg)' },
  Experimental: { color: 'var(--color-medium)', background: 'var(--color-medium-bg)' },
  Planned: { color: 'var(--text-secondary)', background: 'var(--bg-primary)' }
};

const inputStyle = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: '5px',
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  fontSize: '12px',
  padding: '10px 12px',
  width: '100%'
};

const slugify = (value) => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const WorkspaceContextPanel = () => {
  const {
    organizations,
    currentOrganization,
    currentWorkspace,
    loading,
    error,
    refresh,
    createOrganization
  } = useTenancy();
  const [organizationName, setOrganizationName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  if (loading) {
    return <Panel title="Workspace context"><p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: 0 }}>Loading tenant context…</p></Panel>;
  }

  if (error) {
    return (
      <Panel title="Workspace context">
        <div style={{ borderLeft: '3px solid var(--color-critical)', paddingLeft: '12px' }}>
          <strong style={{ color: 'var(--text-primary)', fontSize: '12px' }}>Tenant context unavailable</strong>
          <p style={{ color: 'var(--text-secondary)', fontSize: '11px', lineHeight: 1.5, margin: '6px 0 10px' }}>{error.message}</p>
          {error.correlationId && <p style={{ color: 'var(--text-muted)', fontSize: '10px', margin: '0 0 10px' }}>Correlation ID: {error.correlationId}</p>}
          <button onClick={refresh} style={{ background: 'var(--color-blue)', border: 0, borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '11px', padding: '7px 12px' }}>Retry</button>
        </div>
      </Panel>
    );
  }

  if (organizations.length === 0) {
    const handleSubmit = async (event) => {
      event.preventDefault();
      setSubmitting(true);
      setSubmitError(null);
      try {
        await createOrganization({
          name: organizationName,
          slug: slugify(organizationName),
          workspace_name: workspaceName,
          workspace_slug: slugify(workspaceName)
        });
      } catch (requestError) {
        setSubmitError(requestError);
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <Panel title="Create your tenant boundary" hint="The first organization and workspace are created atomically with administrator membership and an audit event.">
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.55, margin: '0 0 16px' }}>
          ThreatStream requires an organization and workspace before operational data can be created.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
          <label style={{ color: 'var(--text-muted)', display: 'grid', fontSize: '10px', gap: '6px', textTransform: 'uppercase' }}>
            Organization
            <input required minLength={2} maxLength={120} value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} placeholder="Example Company" style={inputStyle} />
          </label>
          <label style={{ color: 'var(--text-muted)', display: 'grid', fontSize: '10px', gap: '6px', textTransform: 'uppercase' }}>
            First workspace
            <input required minLength={2} maxLength={120} value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="Product Security" style={inputStyle} />
          </label>
          <button disabled={submitting} type="submit" style={{ background: 'var(--color-blue)', border: 0, borderRadius: '5px', color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: 700, opacity: submitting ? 0.6 : 1, padding: '11px 16px' }}>
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </form>
        {submitError && (
          <p style={{ color: 'var(--color-critical)', fontSize: '11px', margin: '12px 0 0' }}>
            {submitError.message}{submitError.correlationId ? ` — ${submitError.correlationId}` : ''}
          </p>
        )}
      </Panel>
    );
  }

  return (
    <Panel title="Workspace context" hint="This selection scopes all subsequent application-security records and permission checks.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
        {[
          ['Organization', currentOrganization?.name || 'Unavailable'],
          ['Workspace', currentWorkspace?.name || 'Unavailable'],
          ['Role', currentWorkspace?.role_key?.replaceAll('_', ' ') || 'Unavailable']
        ].map(([label, value]) => (
          <div key={label} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '5px', padding: '12px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '9px', marginBottom: '6px', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 700, textTransform: label === 'Role' ? 'capitalize' : 'none' }}>{value}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
};

export const Dashboard = () => (
  <DashboardLayout>
    <SectionHeader
      title="Application Security Operations"
      description="Connect code-security findings, deployments, runtime evidence, ownership, remediation, and verification around the applications your team operates."
    />

    <div style={{ marginTop: '20px' }}><WorkspaceContextPanel /></div>

    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(300px, 0.8fr)', gap: '20px', marginTop: '20px' }}>
      <Panel title="Current foundation" hint="Verified repository capabilities and their implementation status.">
        <div style={{ display: 'grid', gap: '12px' }}>
          {foundations.map(([name, status, detail]) => (
            <div key={name} style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', background: 'var(--bg-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '7px' }}>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{name}</strong>
                <span style={{ ...statusStyle[status], border: '1px solid var(--border-color)', borderRadius: '999px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.05em', padding: '3px 8px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{status}</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.55, margin: 0 }}>{detail}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="First complete workflow" hint="The vertical slice ThreatStream must prove before adding broader integrations.">
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '10px' }}>
          {workflow.map((step, index) => (
            <li key={step} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.45 }}>
              <span style={{ width: '22px', height: '22px', flex: '0 0 22px', borderRadius: '50%', background: 'var(--color-blue-bg)', border: '1px solid rgba(59, 130, 246, 0.25)', color: 'var(--color-blue)', display: 'grid', placeItems: 'center', fontSize: '10px', fontWeight: 700 }}>{index + 1}</span>
              <span style={{ paddingTop: '2px' }}>{step}</span>
            </li>
          ))}
        </ol>
      </Panel>
    </div>

    <Panel title="Next milestone: application model" hint="Applications and components become the parent objects for repositories, findings, deployments, runtime events, and remediation." style={{ marginTop: '20px' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.6, margin: 0 }}>
        Phase 3 introduces applications, components, ownership, persisted relationships, and the application security timeline within the selected workspace.
      </p>
    </Panel>
  </DashboardLayout>
);

export default Dashboard;
