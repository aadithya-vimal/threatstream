/**
 * src/pages/Vulnerabilities.jsx
 * Real vulnerability data from Supabase `vulnerabilities` table.
 * Shows CVEs, CVSS scores, affected assets, and remediation status.
 */
import React, { useState, useCallback } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import SectionHeader from '../components/SectionHeader';
import MetricCard from '../components/MetricCard';
import Panel from '../components/Panel';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import { supabase } from '../lib/supabase/client';
import { useApi } from '../hooks/useApi';

const SEVERITY_STATUS = { critical: 'critical', high: 'high', medium: 'medium', low: 'low' };

export const Vulnerabilities = () => {
  const [searchTerm, setSearchTerm]   = useState('');
  const [vulnSeverity, setVulnSev]    = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchVulns = useCallback(async () => {
    const { data, error, count } = await supabase
      .from('vulnerabilities')
      .select('id,cve_id,title,severity,cvss_score,affected_assets,status,exploit_available,patch_available,vendor_advisory,description,created_at', { count: 'exact' })
      .order('cvss_score', { ascending: false })
      .limit(200);
    if (error) throw error;
    return { rows: data || [], total: count || 0 };
  }, []);

  const { data, loading, error, refresh } = useApi(fetchVulns, []);
  const rows  = data?.rows  || [];
  const total = data?.total || 0;

  const filtered = rows.filter(r => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || [r.cve_id, r.title, r.description]
      .some(v => String(v || '').toLowerCase().includes(q));
    const matchSev  = vulnSeverity === 'ALL' || (r.severity || '').toLowerCase() === vulnSeverity.toLowerCase();
    const matchStat = statusFilter === 'ALL' || (r.status || '').toLowerCase().includes(statusFilter.toLowerCase());
    return matchSearch && matchSev && matchStat;
  });

  const critCount = rows.filter(r => r.severity === 'critical').length;
  const highCount = rows.filter(r => r.severity === 'high').length;
  const exploitable = rows.filter(r => r.exploit_available && r.status !== 'Mitigated' && r.status !== 'Patched').length;
  const patchReady  = rows.filter(r => r.patch_available && !r.exploit_available).length;

  const columns = [
    {
      header: 'CVE ID',
      accessor: 'cve_id',
      renderCell: val => <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-blue)' }}>{val || '—'}</span>
    },
    {
      header: 'Title',
      accessor: 'title',
      renderCell: val => <span style={{ fontWeight: 600 }}>{val || '—'}</span>
    },
    {
      header: 'CVSS',
      accessor: 'cvss_score',
      renderCell: val => {
        if (!val && val !== 0) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
        const n = parseFloat(val);
        return <span style={{ fontWeight: 700, color: n >= 9.0 ? 'var(--color-critical)' : n >= 7.0 ? 'var(--color-high)' : 'var(--color-medium)' }}>{n.toFixed(1)}</span>;
      }
    },
    {
      header: 'Severity',
      accessor: 'severity',
      renderCell: val => val ? <StatusBadge status={SEVERITY_STATUS[val] || 'info'} text={val} /> : '—'
    },
    {
      header: 'Affected Assets',
      accessor: 'affected_assets',
      renderCell: val => <span style={{ color: 'var(--text-secondary)' }}>{val || 'Unknown'}</span>
    },
    {
      header: 'Exploit',
      accessor: 'exploit_available',
      renderCell: val => val
        ? <span style={{ color: 'var(--color-critical)', fontWeight: 700, fontSize: '11px' }}>⚡ PUBLIC</span>
        : <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>None known</span>
    },
    {
      header: 'Remediation',
      accessor: 'status',
      renderCell: val => {
        if (!val) return '—';
        const v = val.toLowerCase();
        let status = 'info';
        if (v.includes('pending')) status = 'high';
        else if (v.includes('review')) status = 'medium';
        else if (v.includes('mitigated') || v.includes('patched') || v.includes('updated')) status = 'low';
        return <StatusBadge status={status} text={val} />;
      }
    }
  ];

  const hasFilters = searchTerm || vulnSeverity !== 'ALL' || statusFilter !== 'ALL';

  const selectStyle = {
    backgroundColor: 'var(--panel-bg)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <DashboardLayout>
      <SectionHeader
        title="Vulnerability Management"
        description="Review security scans, CVEs, exploit availability, and remediation schedules."
        actions={
          <button
            onClick={refresh}
            style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
          >
            ↻ Refresh
          </button>
        }
      />

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <MetricCard title="Total CVEs" value={total.toLocaleString()} status="medium" subtitle="Tracked vulnerabilities" />
        <MetricCard title="Critical (CVSS 9.0+)" value={critCount} status="critical" subtitle="Patch within 24h" />
        <MetricCard title="High (CVSS 7.0–8.9)" value={highCount} status="high" subtitle="Patch within 14 days" />
        <MetricCard title="Active Exploits" value={exploitable} status={exploitable > 0 ? 'critical' : 'low'} subtitle="Public exploits known" />
      </div>

      <Panel title="CVE Registry">
        <FilterBar
          showClear={hasFilters}
          onClear={() => { setSearchTerm(''); setVulnSev('ALL'); setStatusFilter('ALL'); }}
        >
          <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Search CVE ID, title…" style={{ maxWidth: '300px' }} />
          <select value={vulnSeverity} onChange={e => setVulnSev(e.target.value)} style={selectStyle}>
            <option value="ALL">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
            <option value="ALL">All Statuses</option>
            <option value="pending">Pending Patch</option>
            <option value="review">In Review</option>
            <option value="mitigated">Mitigated</option>
            <option value="patched">Patched</option>
          </select>
        </FilterBar>

        {loading ? (
          <LoadingState message="Loading vulnerabilities…" />
        ) : error ? (
          <EmptyState
            icon="⚠️"
            title="Failed to load vulnerabilities"
            description={error}
            action={<button onClick={refresh} style={{ color: 'var(--color-blue)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Retry</button>}
          />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            emptyText={
              hasFilters
                ? "No vulnerabilities match the current filters."
                : "No vulnerabilities found. Run a discovery scan to populate this view."
            }
          />
        )}
      </Panel>
    </DashboardLayout>
  );
};

export default Vulnerabilities;
