import React, { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import SectionHeader from '../components/SectionHeader';
import MetricCard from '../components/MetricCard';
import Panel from '../components/Panel';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';

export const Vulnerabilities = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [vulnSeverity, setVulnSeverity] = useState('ALL');

  const vulnerabilities = [
    { cve: 'CVE-2024-3094', title: 'XZ Utils Backdoor', severity: 'critical', cvss: '10.0', assets: '12 systems', status: 'Pending Patch' },
    { cve: 'CVE-2023-38606', title: 'Apple macOS Kernel Memory Corruption', severity: 'high', cvss: '8.8', assets: '4 systems', status: 'In Review' },
    { cve: 'CVE-2021-44228', title: 'Apache Log4j RCE (Log4Shell)', severity: 'critical', cvss: '10.0', assets: '1 server', status: 'Mitigated' },
    { cve: 'CVE-2023-4863', title: 'libwebp Heap Buffer Overflow', severity: 'high', cvss: '8.8', assets: '124 endpoints', status: 'Auto-updated' },
    { cve: 'CVE-2024-21626', title: 'runc Container Escape', severity: 'high', cvss: '8.6', assets: '6 clusters', status: 'Pending Patch' },
    { cve: 'CVE-2023-22515', title: 'Confluence Server Privilege Escalation', severity: 'critical', cvss: '9.8', assets: '2 systems', status: 'Patched' }
  ];

  const filteredVulns = vulnerabilities.filter(item => {
    const matchesSearch = item.cve.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSev = vulnSeverity === 'ALL' || item.severity.toLowerCase() === vulnSeverity.toLowerCase();
    return matchesSearch && matchesSev;
  });

  const columns = [
    { header: 'CVE ID', accessor: 'cve', renderCell: (val) => <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{val}</span> },
    { header: 'Vulnerability Title', accessor: 'title' },
    { 
      header: 'CVSS Score', 
      accessor: 'cvss',
      renderCell: (val) => (
        <span style={{ fontWeight: 700, color: parseFloat(val) >= 9.0 ? 'var(--color-critical)' : 'var(--color-high)' }}>{val}</span>
      )
    },
    {
      header: 'Severity',
      accessor: 'severity',
      renderCell: (val) => <StatusBadge status={val} text={val} />
    },
    { header: 'Affected Assets', accessor: 'assets', renderCell: (val) => <span style={{ color: 'var(--text-secondary)' }}>{val}</span> },
    {
      header: 'Remediation Status',
      accessor: 'status',
      renderCell: (val) => {
        let status = 'info';
        if (val.includes('Pending')) status = 'high';
        else if (val.includes('Review')) status = 'medium';
        else if (val.includes('Mitigated') || val.includes('Patched') || val.includes('updated')) status = 'low';
        return <StatusBadge status={status} text={val} />;
      }
    }
  ];

  return (
    <DashboardLayout>
      <SectionHeader 
        title="Vulnerability Management" 
        description="Review security scans, Common Vulnerabilities and Exposures (CVEs), and mitigation schedules."
      />

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <MetricCard title="Total Identified CVEs" value="142" status="medium" subtitle="Across 2.4k tracked systems" />
        <MetricCard title="Critical (CVSS 9.0+)" value="15" status="critical" subtitle="Require patch within 24h" />
        <MetricCard title="High (CVSS 7.0-8.9)" value="42" status="high" subtitle="Require patch within 14 days" />
        <MetricCard title="Average MTTR" value="8.4 Days" status="low" subtitle="Mean Time to Remediation" />
      </div>

      <Panel title="CVE Registries and Vulnerability States">
        <FilterBar showClear={searchTerm || vulnSeverity !== 'ALL'} onClear={() => { setSearchTerm(''); setVulnSeverity('ALL'); }}>
          <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="Filter by CVE ID, title..." style={{ maxWidth: '300px' }} />
          <select 
            value={vulnSeverity} 
            onChange={e => setVulnSeverity(e.target.value)}
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
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
          </select>
        </FilterBar>

        <DataTable columns={columns} data={filteredVulns} emptyText="No vulnerabilities found matching the current selections." />
      </Panel>
    </DashboardLayout>
  );
};

export default Vulnerabilities;
