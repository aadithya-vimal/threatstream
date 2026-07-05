/**
 * src/pages/Network.jsx
 * Network Flow Monitoring — real data from Supabase telemetry table.
 * Shows network connection events with search, filter, and pagination.
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

const PAGE_SIZE = 50;

const SEVERITY_COLOR = { informational: 'info', low: 'low', medium: 'medium', high: 'high', critical: 'critical' };

export const Network = () => {
  const [searchTerm, setSearchTerm]     = useState('');
  const [eventType, setEventType]       = useState('ALL');
  const [severityFilter, setSeverity]   = useState('ALL');

  // Fetch network-related telemetry events
  const fetchData = useCallback(async () => {
    const query = supabase
      .from('telemetry')
      .select('id,hostname,event_type,source_ip,dest_ip,dest_port,protocol,severity,mitre_id,mitre_name,mitre_tactic,risk_score,timestamp,status', { count: 'exact' })
      .in('event_type', ['network_conn', 'dns_query', 'network_block', 'firewall_event', 'socket_create', 'process_create'])
      .order('timestamp', { ascending: false })
      .limit(PAGE_SIZE);

    const { data, error, count } = await query;
    if (error) throw error;
    return { rows: data || [], total: count || 0 };
  }, []);

  const { data, loading, error, refresh } = useApi(fetchData, []);
  const rows  = data?.rows  || [];
  const total = data?.total || 0;

  // Client-side filter for instant search
  const filtered = rows.filter(r => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || [r.hostname, r.source_ip, r.dest_ip, r.dest_port]
      .some(v => String(v || '').toLowerCase().includes(q));
    const matchType = eventType === 'ALL' || (r.event_type || '').toLowerCase() === eventType.toLowerCase();
    const matchSev  = severityFilter === 'ALL' || (r.severity || '').toLowerCase() === severityFilter.toLowerCase();
    return matchSearch && matchType && matchSev;
  });

  const totalEvents     = total;
  const criticalCount   = rows.filter(r => r.severity === 'critical' || r.severity === 'high').length;
  const blockedCount    = rows.filter(r => (r.event_type || '').includes('block')).length;
  const uniqueHosts     = new Set(rows.map(r => r.hostname).filter(Boolean)).size;

  const columns = [
    {
      header: 'Timestamp',
      accessor: 'timestamp',
      renderCell: val => (
        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
          {val ? new Date(val).toLocaleTimeString() : '—'}
        </span>
      )
    },
    {
      header: 'Host',
      accessor: 'hostname',
      renderCell: val => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{val || '—'}</span>
    },
    {
      header: 'Event Type',
      accessor: 'event_type',
      renderCell: val => <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>{val || '—'}</span>
    },
    {
      header: 'Source IP',
      accessor: 'source_ip',
      renderCell: val => <span style={{ fontFamily: 'monospace' }}>{val || '—'}</span>
    },
    {
      header: 'Dest IP',
      accessor: 'dest_ip',
      renderCell: val => <span style={{ fontFamily: 'monospace' }}>{val || '—'}</span>
    },
    {
      header: 'Port',
      accessor: 'dest_port',
      renderCell: val => <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{val || '—'}</span>
    },
    {
      header: 'Severity',
      accessor: 'severity',
      renderCell: val => val ? <StatusBadge status={SEVERITY_COLOR[val] || 'info'} text={val} /> : <span style={{ color: 'var(--text-muted)' }}>—</span>
    },
    {
      header: 'MITRE',
      accessor: 'mitre_id',
      renderCell: (val, row) => val ? (
        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-blue)' }} title={row.mitre_name}>
          {val}
        </span>
      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>
    },
    {
      header: 'Risk',
      accessor: 'risk_score',
      renderCell: val => {
        if (!val && val !== 0) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
        const color = val >= 80 ? 'var(--color-critical)' : val >= 50 ? 'var(--color-high)' : 'var(--color-low)';
        return <span style={{ fontWeight: 700, color }}>{val}</span>;
      }
    }
  ];

  const hasFilters = searchTerm || eventType !== 'ALL' || severityFilter !== 'ALL';

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
        title="Network Flow Monitor"
        description="Inspect live network connection events, DNS queries, and firewall actions from endpoint telemetry."
        actions={
          <button
            onClick={refresh}
            style={{
              backgroundColor: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              padding: '7px 14px',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            ↻ Refresh
          </button>
        }
      />

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <MetricCard title="Total Network Events" value={totalEvents.toLocaleString()} status="info" subtitle={`Last ${PAGE_SIZE} fetched`} />
        <MetricCard title="Unique Hosts" value={uniqueHosts} status="low" subtitle="Active endpoints" />
        <MetricCard title="High/Critical Events" value={criticalCount} status={criticalCount > 0 ? 'critical' : 'low'} subtitle="Severity ≥ high" />
        <MetricCard title="Blocked Flows" value={blockedCount} status={blockedCount > 0 ? 'high' : 'low'} subtitle="Firewall drops detected" />
      </div>

      <Panel title="Network Telemetry Events">
        <FilterBar
          showClear={hasFilters}
          onClear={() => { setSearchTerm(''); setEventType('ALL'); setSeverity('ALL'); }}
        >
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search hostname, IP, port…"
            style={{ maxWidth: '280px' }}
          />
          <select value={eventType} onChange={e => setEventType(e.target.value)} style={selectStyle}>
            <option value="ALL">All Event Types</option>
            <option value="network_conn">network_conn</option>
            <option value="dns_query">dns_query</option>
            <option value="network_block">network_block</option>
            <option value="firewall_event">firewall_event</option>
            <option value="socket_create">socket_create</option>
          </select>
          <select value={severityFilter} onChange={e => setSeverity(e.target.value)} style={selectStyle}>
            <option value="ALL">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="informational">Informational</option>
          </select>
        </FilterBar>

        {loading ? (
          <LoadingState message="Loading network events…" />
        ) : error ? (
          <EmptyState
            icon="⚠️"
            title="Failed to load network data"
            description={error}
            action={<button onClick={refresh} style={{ color: 'var(--color-blue)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Retry</button>}
          />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            emptyText={
              hasFilters
                ? "No events match the current filters."
                : "No network events found. Configure endpoint agents to start collecting telemetry."
            }
          />
        )}
      </Panel>
    </DashboardLayout>
  );
};

export default Network;
