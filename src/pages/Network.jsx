import React, { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import SectionHeader from '../components/SectionHeader';
import MetricCard from '../components/MetricCard';
import Panel from '../components/Panel';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';

export const Network = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('ALL');

  const connections = [
    { id: 'FLOW-901', source: '10.100.4.12', sport: '50293', dest: '185.220.101.5', dport: '443', protocol: 'TCP', bytes: '124.5 KB', status: 'Blocked', action: 'drop' },
    { id: 'FLOW-902', source: '10.100.4.25', sport: '80', dest: '98.137.11.20', dport: '80', protocol: 'HTTP', bytes: '12.8 MB', status: 'Allowed', action: 'accept' },
    { id: 'FLOW-903', source: '10.100.20.91', sport: '52834', dest: '10.100.4.12', dport: '5432', protocol: 'Postgres', bytes: '840.1 KB', status: 'Allowed', action: 'accept' },
    { id: 'FLOW-904', source: '192.168.1.5', sport: '60124', dest: '10.100.12.8', dport: '22', protocol: 'SSH', bytes: '3.4 MB', status: 'Flagged', action: 'inspect' },
    { id: 'FLOW-905', source: '10.100.20.144', sport: '53182', dest: '8.8.8.8', dport: '53', protocol: 'UDP', bytes: '4.2 KB', status: 'Allowed', action: 'accept' },
    { id: 'FLOW-906', source: '213.82.19.120', sport: '41940', dest: '10.100.4.25', dport: '23', protocol: 'Telnet', bytes: '0 B', status: 'Blocked', action: 'drop' }
  ];

  const filteredConnections = connections.filter(item => {
    const matchesSearch = item.source.includes(searchTerm) || 
                          item.dest.includes(searchTerm) ||
                          item.dport.includes(searchTerm);
    const matchesProto = protocolFilter === 'ALL' || item.protocol.toUpperCase() === protocolFilter.toUpperCase();
    return matchesSearch && matchesProto;
  });

  const columns = [
    { header: 'Flow ID', accessor: 'id', renderCell: (val) => <span style={{ fontWeight: 600 }}>{val}</span> },
    { header: 'Source IP', accessor: 'source', renderCell: (val) => <span style={{ fontFamily: 'monospace' }}>{val}</span> },
    { header: 'Src Port', accessor: 'sport', renderCell: (val) => <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{val}</span> },
    { header: 'Destination IP', accessor: 'dest', renderCell: (val) => <span style={{ fontFamily: 'monospace' }}>{val}</span> },
    { header: 'Dst Port', accessor: 'dport', renderCell: (val) => <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{val}</span> },
    { header: 'Protocol', accessor: 'protocol' },
    { header: 'Bytes Transferred', accessor: 'bytes' },
    {
      header: 'Firewall Action',
      accessor: 'status',
      renderCell: (val, row) => {
        let status = 'info';
        if (row.action === 'drop') status = 'critical';
        else if (row.action === 'accept') status = 'low';
        else if (row.action === 'inspect') status = 'high';
        return <StatusBadge status={status} text={val} />;
      }
    }
  ];

  return (
    <DashboardLayout>
      <SectionHeader 
        title="Network Flow Logs" 
        description="Inspect internal networks, ingress/egress border flows, and firewall actions."
      />

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <MetricCard title="Network Flows/sec" value="48,924" status="info" subtitle="Peak capacity: 100k" />
        <MetricCard title="Active Sockets" value="1,842" status="low" subtitle="Within normal limits" />
        <MetricCard title="Intrusions Blocked" value="284" status="critical" subtitle="Last 24 hours" />
        <MetricCard title="Suspicious DNS Requests" value="14" status="high" subtitle="Investigating now" />
      </div>

      <Panel title="Real-time Network Flow Audits">
        <FilterBar showClear={searchTerm || protocolFilter !== 'ALL'} onClear={() => { setSearchTerm(''); setProtocolFilter('ALL'); }}>
          <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Filter by source IP/dest IP..." style={{ maxWidth: '300px' }} />
          <select 
            value={protocolFilter} 
            onChange={e => setProtocolFilter(e.target.value)}
            style={{
              backgroundColor: 'var(--panel-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '13px',
              outline: 'none'
            }}
          >
            <option value="ALL">All Protocols</option>
            <option value="TCP">TCP</option>
            <option value="UDP">UDP</option>
            <option value="SSH">SSH</option>
            <option value="HTTP">HTTP</option>
          </select>
        </FilterBar>

        <DataTable columns={columns} data={filteredConnections} emptyText="No network flows match the search query." />
      </Panel>
    </DashboardLayout>
  );
};

export default Network;
