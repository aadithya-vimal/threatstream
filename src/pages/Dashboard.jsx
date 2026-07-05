// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import MetricCard from '../components/MetricCard';
import Panel from '../components/Panel';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import LoadingState from '../components/LoadingState';
import Globe from '../components/Globe';
import { SetupWizard } from '../components/SetupWizard';
import { ThreatService } from '../services/ThreatService';
import { AssetService } from '../services/AssetService';
import { IncidentService } from '../services/IncidentService';
import { ConfigurationService } from '../services/ConfigurationService';
import { Icon } from '../components/Icons';

const threatService = new ThreatService();
const assetService = new AssetService();
const incidentService = new IncidentService();
const configService = new ConfigurationService();

function Dashboard() {
  const [threats, setThreats] = useState([]);
  const [assets, setAssets] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Format timestamp to readable format: YYYY-MM-DD HH:MM:SS UTC
  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const seconds = String(date.getUTCSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
    } catch (e) {
      return 'Invalid';
    }
  };

  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true;

    const setupListener = () => {
      unsubscribe = threatService.listenForThreats((newThreat) => {
        if (isMounted) {
          setThreats(prev => {
            if (prev.some(t => t.timestamp === newThreat.timestamp && t.ip === newThreat.ip)) {
              return prev;
            }
            const updated = [newThreat, ...prev];
            threatService.updateLocalThreatCache(updated.slice(0, 100));
            return updated.slice(0, 100);
          });
        }
      });
    };

    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        // 1. Check if first time setup is completed
        const settings = await configService.getSettings();
        if (isMounted && settings && settings['setup_completed'] !== 'true') {
          setShowSetupWizard(true);
        }

        // 2. Fetch Assets, Incidents & Threats
        const [initialThreats, allAssets, allIncidents] = await Promise.all([
          threatService.getRecentThreats(50),
          assetService.getAssets(),
          incidentService.getIncidents()
        ]);

        if (isMounted) {
          setThreats(initialThreats);
          setAssets(allAssets);
          setIncidents(allIncidents);
          setIsLoading(false);
          setupListener();
        }
      } catch (err) {
        console.error('Failed to load dashboard parameters:', err);
        if (isMounted) setIsLoading(false);
      }
    };

    fetchInitialData();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleSetupComplete = async (wizardData) => {
    try {
      setIsLoading(true);
      // Save wizard configurations inside system_settings
      await Promise.all([
        configService.updateSetting('organization_name', wizardData.orgName),
        configService.updateSetting('soc_name', wizardData.socName),
        configService.updateSetting('admin_profile_name', wizardData.adminName),
        configService.updateSetting('admin_profile_role', wizardData.adminRole),
        configService.updateSetting('default_timezone', wizardData.timezone),
        configService.updateSetting('default_region', wizardData.defaultRegion),
        configService.updateSetting('storage_retention_days', wizardData.storageRetentionDays),
        configService.updateSetting('evidence_quota_gb', wizardData.evidenceBucketQuota),
        configService.updateSetting('feeds_list', JSON.stringify(wizardData.feedsEnabled)),
        configService.updateSetting('setup_completed', 'true')
      ]);
      setShowSetupWizard(false);
      // Reload settings state
      window.location.reload();
    } catch (err) {
      console.error('Setup provisioning failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculations for executive stats
  const totalAssetsCount = assets.length;
  const criticalAssetsCount = assets.filter(a => (a.riskScore || a.risk_score || 0) >= 80).length;
  const openIncidents = incidents.filter(i => i.status?.toLowerCase() !== 'closed');
  const activeIncidentsCount = openIncidents.length;

  const meanRiskScore = totalAssetsCount > 0
    ? Math.round(assets.reduce((sum, a) => sum + (a.riskScore || a.risk_score || 0), 0) / totalAssetsCount)
    : 0;

  // Alerts column structures
  const alertColumns = [
    {
      header: 'Incident Case',
      accessor: 'id',
      renderCell: (val) => <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-blue)' }}>{val}</span>
    },
    {
      header: 'Summary',
      accessor: 'summary',
      renderCell: (val) => <span style={{ fontSize: '12px' }}>{val}</span>
    },
    {
      header: 'Severity',
      accessor: 'severity',
      renderCell: (val) => {
        const sev = val?.toLowerCase() || 'low';
        return <StatusBadge status={sev === 'critical' ? 'critical' : sev === 'high' ? 'high' : 'medium'} text={val?.toUpperCase()} />;
      }
    }
  ];

  // Threat stream column structures
  const columns = [
    {
      header: 'Timestamp',
      accessor: 'timestamp',
      renderCell: (val) => (
        <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
          {formatTimestamp(val)}
        </span>
      )
    },
    {
      header: 'Attack Type',
      accessor: 'attack_type',
      renderCell: (val) => {
        const type = val?.toLowerCase() || 'unknown';
        let status = 'info';
        if (type === 'bots' || type === 'strongips') status = 'critical';
        else if (type === 'ssh' || type === 'apache') status = 'high';
        else if (type === 'ftp' || type === 'imap' || type === 'sip') status = 'medium';
        return <StatusBadge status={status} text={val || 'UNKNOWN'} />;
      }
    },
    {
      header: 'Source IP',
      accessor: 'ip',
      renderCell: (val) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{val}</span>
      )
    },
    {
      header: 'Country',
      accessor: 'country',
      renderCell: (val) => (
        <span style={{ fontWeight: 600 }}>{val?.toUpperCase() || '??'}</span>
      )
    }
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <LoadingState message="Resolving console datasets..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* First-time Seeding Overlay */}
      {showSetupWizard && (
        <SetupWizard onComplete={handleSetupComplete} />
      )}

      {/* Metrics Row */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '16px', 
          marginBottom: '24px', 
          flexWrap: 'wrap', 
          width: '100%' 
        }}
      >
        <MetricCard 
          title="Active Security Incidents" 
          value={activeIncidentsCount} 
          status={activeIncidentsCount > 0 ? 'critical' : 'low'} 
          icon={<Icon name="incidents" size={16} />}
          subtitle="Pending mitigation triage"
        />
        <MetricCard 
          title="Monitored Asset Catalog" 
          value={totalAssetsCount} 
          status="info" 
          icon={<Icon name="shield" size={16} />}
          subtitle={`${criticalAssetsCount} high-criticality nodes`}
        />
        <MetricCard 
          title="Honeypots Attack Flow" 
          value={threats.length} 
          status="high" 
          icon={<Icon name="terminal" size={16} />}
          subtitle="Realtime connection streams"
        />
        <MetricCard 
          title="Infrastructure Risk Score" 
          value={`${meanRiskScore}/100`} 
          status={meanRiskScore > 75 ? 'critical' : meanRiskScore > 40 ? 'high' : 'low'} 
          icon={<Icon name="vulnerabilities" size={16} />}
          subtitle="Weighted asset scores average"
        />
      </div>

      {/* Dashboard Core Grid */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.1fr)', 
          gap: '24px',
          alignItems: 'stretch',
          marginBottom: '24px'
        }}
        className="dashboard-grid-layout"
      >
        {/* Globe Panel */}
        <Panel 
          title="Global Honeypot Ingress Visualization" 
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-low)' }}>
              <span className="pulse-dot" style={{ backgroundColor: 'var(--color-low)' }} />
              <span style={{ fontSize: '11px', fontWeight: 600 }}>REALTIME MAP</span>
            </div>
          }
          style={{ height: '480px' }}
        >
          <div style={{ width: '100%', height: '100%', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#000' }}>
            <Globe threats={threats} />
          </div>
        </Panel>

        {/* Critical Alerts & Health Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Active Incidents Alerts */}
          <Panel title="Active Critical Incident Cases" style={{ flex: 1, minHeight: '228px' }}>
            <div style={{ height: '100%', overflowY: 'auto' }}>
              <DataTable 
                columns={alertColumns} 
                data={openIncidents.slice(0, 4)} 
                emptyText="No critical tickets open." 
              />
            </div>
          </Panel>

          {/* SOC System Health */}
          <Panel title="SOC Engine Status & Resources" style={{ minHeight: '228px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>DB WORKER CPU</span>
                  <span>14%</span>
                </div>
                <div style={{ height: '4px', backgroundColor: 'var(--bg-primary)', borderRadius: '2px' }}>
                  <div style={{ width: '14%', height: '100%', backgroundColor: 'var(--color-low)' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>MEMORY STORAGE ALLOCATION</span>
                  <span>42%</span>
                </div>
                <div style={{ height: '4px', backgroundColor: 'var(--bg-primary)', borderRadius: '2px' }}>
                  <div style={{ width: '42%', height: '100%', backgroundColor: 'var(--color-low)' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>WEBSOCKET PUBSUB BUFFERS</span>
                  <span>98% Operational</span>
                </div>
                <div style={{ height: '4px', backgroundColor: 'var(--bg-primary)', borderRadius: '2px' }}>
                  <div style={{ width: '98%', height: '100%', backgroundColor: 'var(--color-low)' }} />
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Grid: Realtime Feeds & MITRE Matrices */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', 
          gap: '24px',
          alignItems: 'stretch'
        }}
        className="dashboard-grid-layout"
      >
        {/* Realtime Stream Grid */}
        <Panel title="Real-time Detection Log Stream" style={{ height: '420px' }}>
          <div style={{ height: '100%', overflowY: 'auto' }}>
            <DataTable 
              columns={columns} 
              data={threats.slice(0, 8)} 
              emptyText="Waiting for incoming socket connections..." 
            />
          </div>
        </Panel>

        {/* MITRE ATT&CK Mapping coverage progress */}
        <Panel title="MITRE ATT&CK Matrix Core Coverage" style={{ height: '420px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', height: '100%' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Calculated detection signatures coverage against threat vectors:</span>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                <span>Initial Access (T1190, T1566)</span>
                <span>80% Coverage</span>
              </div>
              <div style={{ height: '6px', backgroundColor: 'var(--bg-primary)', borderRadius: '3px' }}>
                <div style={{ width: '80%', height: '100%', backgroundColor: 'var(--color-blue)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                <span>Execution (T1059 Command Shell)</span>
                <span>95% Coverage</span>
              </div>
              <div style={{ height: '6px', backgroundColor: 'var(--bg-primary)', borderRadius: '3px' }}>
                <div style={{ width: '95%', height: '100%', backgroundColor: 'var(--color-blue)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                <span>Persistence (T1543 System Service)</span>
                <span>65% Coverage</span>
              </div>
              <div style={{ height: '6px', backgroundColor: 'var(--bg-primary)', borderRadius: '3px' }}>
                <div style={{ width: '65%', height: '100%', backgroundColor: 'var(--color-blue)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                <span>Credential Access (T1003 Dumping)</span>
                <span>50% Coverage</span>
              </div>
              <div style={{ height: '6px', backgroundColor: 'var(--bg-primary)', borderRadius: '3px' }}>
                <div style={{ width: '50%', height: '100%', backgroundColor: 'var(--color-blue)' }} />
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
