import React from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import Panel from '../components/Panel';
import SectionHeader from '../components/SectionHeader';

const foundations = [
  {
    name: 'Authenticated web application',
    status: 'Available',
    detail: 'React, Vite, Supabase Auth, and the protected application shell are working foundations.'
  },
  {
    name: 'API and persistence foundation',
    status: 'Experimental',
    detail: 'FastAPI and Supabase are connected, but tenancy and backend permission enforcement are not complete.'
  },
  {
    name: 'Background execution concepts',
    status: 'Experimental',
    detail: 'Jobs, scheduling, and plugins exist but must move to a dedicated, isolated worker architecture.'
  },
  {
    name: 'Repository-to-runtime workflow',
    status: 'Planned',
    detail: 'Applications, GitHub, normalized findings, deployments, runtime events, remediation, and verification are the active roadmap.'
  }
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

export const Dashboard = () => (
  <DashboardLayout>
    <SectionHeader
      title="Application Security Operations"
      description="Connect code-security findings, deployments, runtime evidence, ownership, remediation, and verification around the applications your team operates."
    />

    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(300px, 0.8fr)', gap: '20px', marginTop: '20px' }}>
      <Panel title="Current foundation" hint="Verified repository capabilities and their implementation status.">
        <div style={{ display: 'grid', gap: '12px' }}>
          {foundations.map((item) => (
            <div key={item.name} style={{ border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px', background: 'var(--bg-primary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '7px' }}>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.name}</strong>
                <span style={{ ...statusStyle[item.status], border: '1px solid var(--border-color)', borderRadius: '999px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.05em', padding: '3px 8px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  {item.status}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.55, margin: 0 }}>{item.detail}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="First complete workflow" hint="The vertical slice ThreatStream must prove before adding broader integrations.">
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '10px' }}>
          {workflow.map((step, index) => (
            <li key={step} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.45 }}>
              <span style={{ width: '22px', height: '22px', flex: '0 0 22px', borderRadius: '50%', background: 'var(--color-blue-bg)', border: '1px solid rgba(59, 130, 246, 0.25)', color: 'var(--color-blue)', display: 'grid', placeItems: 'center', fontSize: '10px', fontWeight: 700 }}>
                {index + 1}
              </span>
              <span style={{ paddingTop: '2px' }}>{step}</span>
            </li>
          ))}
        </ol>
      </Panel>
    </div>

    <Panel title="Next milestone: tenant security" hint="Application data cannot be introduced safely until tenant boundaries are enforced." style={{ marginTop: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        {[
          ['Organizations and workspaces', 'Create explicit operational boundaries for every record.'],
          ['Backend permissions', 'Enforce permissions in API routes instead of trusting frontend role checks.'],
          ['Tenant-safe RLS', 'Replace broad authenticated policies with organization and workspace predicates.'],
          ['Secure credentials', 'Encrypt provider secrets and return only masked configuration metadata.'],
          ['Append-only audit', 'Record membership, authorization, integration, and configuration changes.']
        ].map(([title, detail]) => (
          <div key={title} style={{ padding: '12px', borderLeft: '3px solid var(--color-blue)', background: 'var(--bg-primary)' }}>
            <div style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 700, marginBottom: '5px' }}>{title}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', lineHeight: 1.5 }}>{detail}</div>
          </div>
        ))}
      </div>
    </Panel>
  </DashboardLayout>
);

export default Dashboard;
