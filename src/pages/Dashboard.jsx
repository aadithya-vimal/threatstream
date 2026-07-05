// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import MetricCard from '../components/MetricCard';
import Panel from '../components/Panel';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import LoadingState from '../components/LoadingState';
import Globe from '../components/Globe';
import { ThreatService } from '../services/ThreatService';
import { Icon } from '../components/Icons';

const threatService = new ThreatService();

function Dashboard() {
  const [threats, setThreats] = useState([]);
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

  // Calculate threat statistics
  const calculateStats = (threatsArray) => {
    const stats = {
      total: threatsArray.length,
      critical: 0,
      high: 0,
      mediumLow: 0
    };

    threatsArray.forEach(threat => {
      const type = threat.attack_type?.toLowerCase() || 'unknown';

      // Critical: bots, strongips
      if (type === 'bots' || type === 'strongips') {
        stats.critical++;
      }
      // High: ssh, apache
      else if (type === 'ssh' || type === 'apache') {
        stats.high++;
      }
      // Medium/Low: everything else (ftp, imap, sip, unknown)
      else {
        stats.mediumLow++;
      }
    });

    return stats;
  };

  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true;

    const setupListener = () => {
      unsubscribe = threatService.listenForThreats((newThreat) => {
        if (isMounted) {
          setThreats(prev => {
            // Prevent adding duplicates
            if (prev.some(t => t.timestamp === newThreat.timestamp && t.ip === newThreat.ip)) {
              return prev;
            }
            const updated = [newThreat, ...prev];
            // Cache current state in repository for other widgets correlation
            threatService.updateLocalThreatCache(updated.slice(0, 100));
            return updated.slice(0, 100); // Keep max 100
          });
        }
      });
    };

    const fetchInitialData = async () => {
      setIsLoading(true);
      const initialThreats = await threatService.getRecentThreats(50);
      if (isMounted) {
        setThreats(initialThreats);
        setIsLoading(false);
        setupListener();
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

  const stats = calculateStats(threats);

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

  // Slice latest 15 threats for the dashboard live feed widget
  const displayThreats = threats.slice(0, 15);

  return (
    <DashboardLayout>
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
          title="Total Events Analyzed" 
          value={isLoading ? '...' : stats.total} 
          status="info" 
          icon={<Icon name="dashboard" size={16} />}
          subtitle="Real-time honeypot logs"
        />
        <MetricCard 
          title="Critical Severities" 
          value={isLoading ? '...' : stats.critical} 
          status="critical" 
          icon={<Icon name="shield" size={16} />}
          subtitle="Active bots & critical honeypot hits"
        />
        <MetricCard 
          title="High Severities" 
          value={isLoading ? '...' : stats.high} 
          status="high" 
          icon={<Icon name="incidents" size={16} />}
          subtitle="SSH and Web Service attacks"
        />
        <MetricCard 
          title="Medium & Low Severities" 
          value={isLoading ? '...' : stats.mediumLow} 
          status="low" 
          icon={<Icon name="vulnerabilities" size={16} />}
          subtitle="Generic honeypot events"
        />
      </div>

      {/* Grid: Globe & Live Feed */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', 
          gap: '24px',
          alignItems: 'stretch',
          flex: 1
        }}
        className="dashboard-grid-layout"
      >
        {/* Globe Visualization */}
        <Panel 
          title="Global Honeypot Visualization" 
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-low)' }}>
              <span className="pulse-dot" style={{ backgroundColor: 'var(--color-low)' }} />
              <span style={{ fontSize: '11px', fontWeight: 600 }}>LIVE GLOBE ACTIVE</span>
            </div>
          }
          style={{ height: '550px' }}
        >
          <div style={{ width: '100%', height: '100%', borderRadius: '4px', overflow: 'hidden', backgroundColor: '#000' }}>
            <Globe threats={threats} />
          </div>
        </Panel>

        {/* Live Attack Feed */}
        <Panel 
          title="Real-time Detection Stream" 
          actions={
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Max logs cached: 100
            </span>
          }
          style={{ height: '550px' }}
        >
          <div style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {isLoading ? (
              <LoadingState message="Connecting to threat feed..." />
            ) : (
              <DataTable 
                columns={columns} 
                data={displayThreats} 
                emptyText="Awaiting stream triggers..." 
              />
            )}
          </div>
        </Panel>
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;
