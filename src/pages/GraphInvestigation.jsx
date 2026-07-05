import React, { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import SectionHeader from '../components/SectionHeader';
import Panel from '../components/Panel';
import DataTable from '../components/DataTable';
import { Icon } from '../components/Icons';

// Node type colors and icons mapping
const NODE_TYPES = {
  asset: { color: '#3b82f6', label: 'Asset', icon: 'cpu' },
  incident: { color: '#ef4444', label: 'Incident', icon: 'alertCircle' },
  alert: { color: '#f97316', label: 'Alert', icon: 'bell' },
  ioc: { color: '#eab308', label: 'IOC', icon: 'enrichment' },
  actor: { color: '#a855f7', label: 'Threat Actor', icon: 'user' },
  campaign: { color: '#10b981', label: 'Campaign', icon: 'globe' },
  malware: { color: '#f43f5e', label: 'Malware', icon: 'malware' },
  cve: { color: '#06b6d4', label: 'CVE', icon: 'shield' },
  mitre: { color: '#84cc16', label: 'MITRE ATT&CK', icon: 'yara' }
};

const NODES_DATA = [
  { id: 'node-1', label: 'LockBit Campaign 2026', type: 'campaign', x: 400, y: 280, size: 60, risk: 95, details: { description: 'Global ransomware campaign targeting financial institutions.', created: '2026-01-10', status: 'Active' } },
  { id: 'node-2', label: 'APT-37 (LockBit Group)', type: 'actor', x: 220, y: 180, size: 50, risk: 98, details: { country: 'Unknown', target_sectors: ['Finance', 'Healthcare', 'Infrastructure'], status: 'Active' } },
  { id: 'node-3', label: 'LockBit_v3_ransomware', type: 'malware', x: 420, y: 120, size: 50, risk: 90, details: { compile_time: '2025-11-20', file_type: 'PE32 Executable', family: 'LockBit' } },
  { id: 'node-4', label: '185.220.101.44', type: 'ioc', x: 580, y: 220, size: 45, risk: 85, details: { type: 'IP Address', location: 'Netherlands', first_seen: '2026-06-15' } },
  { id: 'node-5', label: 'WIN-SRV01 (Active Directory)', type: 'asset', x: 300, y: 420, size: 55, risk: 72, details: { os: 'Windows Server 2022', ip: '10.0.5.10', zone: 'Internal Server Zone' } },
  { id: 'node-6', label: 'compromised_domain.com', type: 'ioc', x: 560, y: 380, size: 45, risk: 65, details: { type: 'Domain Name', registrar: 'NameCheap', active: true } },
  { id: 'node-7', label: 'CVE-2024-3400', type: 'cve', x: 180, y: 340, size: 45, risk: 88, details: { severity: '9.8 Critical', vulnerability_type: 'RCE', product: 'GlobalProtect' } },
  { id: 'node-8', label: 'T1486 (Data Encrypted)', type: 'mitre', x: 520, y: 60, size: 45, risk: 0, details: { tactic: 'Impact', description: 'Encrypts critical target system data.' } },
  { id: 'node-9', label: 'T1003.001 (LSASS Dump)', type: 'mitre', x: 260, y: 50, size: 45, risk: 0, details: { tactic: 'Credential Access', description: 'Dumps local LSASS memory storage.' } },
  { id: 'node-10', label: 'Active Intrusion Alert', type: 'alert', x: 120, y: 460, size: 45, risk: 90, details: { source: 'Zeek NIDS', signature: 'LockBit C2 Beaconing Pattern', timestamp: '2026-07-05 13:00' } },
  { id: 'node-11', label: 'Ransomware Outbreak AD', type: 'incident', x: 440, y: 440, size: 55, risk: 92, details: { title: 'Ransomware Outbreak AD', status: 'Investigating', priority: 'Critical' } }
];

const EDGES_DATA = [
  { from: 'node-2', to: 'node-1', label: 'operates' },
  { from: 'node-3', to: 'node-1', label: 'deployed_in' },
  { from: 'node-3', to: 'node-8', label: 'implements' },
  { from: 'node-3', to: 'node-9', label: 'implements' },
  { from: 'node-3', to: 'node-4', label: 'beacons_to' },
  { from: 'node-1', to: 'node-5', label: 'targets' },
  { from: 'node-7', to: 'node-5', label: 'exploits' },
  { from: 'node-5', to: 'node-6', label: 'communicates_with' },
  { from: 'node-10', to: 'node-5', label: 'triggered_on' },
  { from: 'node-11', to: 'node-5', label: 'affects' },
  { from: 'node-11', to: 'node-1', label: 'associated_with' },
  { from: 'node-6', to: 'node-1', label: 'used_by' }
];

export const GraphInvestigation = () => {
  const [selectedNode, setSelectedNode] = useState(NODES_DATA[0]);
  const [layout, setLayout] = useState('force');
  const [depth, setDepth] = useState(2);
  const [searchQuery, setSearchQuery] = useState('');

  const handleNodeClick = (node) => {
    setSelectedNode(node);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    const found = NODES_DATA.find(n => n.label.toLowerCase().includes(e.target.value.toLowerCase()));
    if (found) {
      setSelectedNode(found);
    }
  };

  const getRelationsForSelected = () => {
    if (!selectedNode) return [];
    return EDGES_DATA.filter(edge => edge.from === selectedNode.id || edge.to === selectedNode.id)
      .map(edge => {
        const fromNode = NODES_DATA.find(n => n.id === edge.from);
        const toNode = NODES_DATA.find(n => n.id === edge.to);
        return {
          id: `${edge.from}-${edge.to}`,
          source: fromNode?.label || edge.from,
          sourceType: fromNode?.type || 'unknown',
          relationship: edge.label,
          target: toNode?.label || edge.to,
          targetType: toNode?.type || 'unknown',
          confidence: 'High',
          discovered: '2026-07-05 13:00'
        };
      });
  };

  return (
    <DashboardLayout>
      <SectionHeader 
        title="Investigation Graph Engine" 
        subtitle="Explore correlation mappings and structural linkages between all assets, incidents, alerts, threats, and indicators."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', height: 'calc(100vh - 200px)', minHeight: '650px' }}>
        {/* Left Side: Graph Canvas and controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
          {/* Controls Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px'
          }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search graph entities..."
                value={searchQuery}
                onChange={handleSearchChange}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  width: '220px'
                }}
              />
              <select
                value={depth}
                onChange={(e) => setDepth(Number(e.target.value))}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '13px'
                }}
              >
                <option value={1}>1 Hop Depth</option>
                <option value={2}>2 Hops Depth</option>
                <option value={3}>3 Hops Depth</option>
              </select>
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '13px'
                }}
              >
                <option value="force">Force-Directed</option>
                <option value="radial">Radial Layout</option>
                <option value="hierarchical">Hierarchical</option>
              </select>
            </div>
            <button style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px'
            }}>
              <Icon name="download" size={14} /> Export Image
            </button>
          </div>

          {/* Canvas Wrapper */}
          <div style={{
            flex: 1,
            position: 'relative',
            backgroundColor: '#070a13',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            {/* SVG lines for edges */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              {EDGES_DATA.map((edge, idx) => {
                const fromNode = NODES_DATA.find(n => n.id === edge.from);
                const toNode = NODES_DATA.find(n => n.id === edge.to);
                if (!fromNode || !toNode) return null;

                // Calculate edge labels offset position
                const midX = (fromNode.x + toNode.x) / 2;
                const midY = (fromNode.y + toNode.y) / 2;

                const isEdgeHighlighted = selectedNode && (selectedNode.id === edge.from || selectedNode.id === edge.to);

                return (
                  <g key={idx}>
                    <line
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      stroke={isEdgeHighlighted ? 'var(--accent)' : '#1f2937'}
                      strokeWidth={isEdgeHighlighted ? 2.5 : 1.5}
                      strokeDasharray={edge.label === 'exploits' || edge.label === 'targets' ? '4 4' : '0'}
                      transition="stroke-width 0.2s"
                    />
                    {isEdgeHighlighted && (
                      <text
                        x={midX}
                        y={midY - 5}
                        fill="var(--text-secondary)"
                        fontSize="9px"
                        fontFamily="monospace"
                        textAnchor="middle"
                        style={{ backgroundColor: '#070a13', padding: '2px' }}
                      >
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Nodes layer */}
            {NODES_DATA.map((node) => {
              const typeCfg = NODE_TYPES[node.type];
              const isSelected = selectedNode && selectedNode.id === node.id;

              return (
                <div
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  style={{
                    position: 'absolute',
                    left: `${node.x - node.size / 2}px`,
                    top: `${node.y - node.size / 2}px`,
                    width: `${node.size}px`,
                    height: `${node.size}px`,
                    borderRadius: '50%',
                    backgroundColor: isSelected ? 'var(--bg-secondary)' : '#111827',
                    border: `3px solid ${typeCfg.color}`,
                    boxShadow: isSelected ? `0 0 15px ${typeCfg.color}` : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    zIndex: isSelected ? 10 : 5
                  }}
                  title={node.label}
                >
                  <span style={{ color: typeCfg.color }}>
                    <Icon name={typeCfg.icon} size={20} />
                  </span>
                  <span style={{
                    position: 'absolute',
                    top: `${node.size + 4}px`,
                    whiteSpace: 'nowrap',
                    fontSize: '11px',
                    fontWeight: isSelected ? '700' : '500',
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                    backgroundColor: '#070a13',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: isSelected ? '1px solid var(--border-color)' : 'none'
                  }}>
                    {node.label}
                  </span>
                </div>
              );
            })}

            {/* Legend Panel */}
            <div style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              backgroundColor: 'rgba(15, 21, 37, 0.9)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '12px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 120px)',
              gap: '6px',
              zIndex: 20
            }}>
              {Object.keys(NODE_TYPES).map(type => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                  <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: NODE_TYPES[type].color,
                    display: 'inline-block'
                  }}></span>
                  <span style={{ color: 'var(--text-secondary)' }}>{NODE_TYPES[type].label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Inspector Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {selectedNode ? (
            <Panel title="Entity Inspector">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--bg-primary)',
                    border: `3px solid ${NODE_TYPES[selectedNode.type].color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px auto',
                    color: NODE_TYPES[selectedNode.type].color
                  }}>
                    <Icon name={NODE_TYPES[selectedNode.type].icon} size={28} />
                  </div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--text-primary)' }}>{selectedNode.label}</h3>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: NODE_TYPES[selectedNode.type].color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {NODE_TYPES[selectedNode.type].label}
                  </span>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Properties</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <tbody>
                      {Object.keys(selectedNode.details).map((key) => (
                        <tr key={key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '6px 0', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{key.replace('_', ' ')}</td>
                          <td style={{ padding: '6px 0', color: 'var(--text-primary)', textAlign: 'right', fontWeight: '600' }}>{selectedNode.details[key]}</td>
                        </tr>
                      ))}
                      {selectedNode.risk > 0 && (
                        <tr>
                          <td style={{ padding: '6px 0', color: 'var(--text-secondary)' }}>Risk Score</td>
                          <td style={{ padding: '6px 0', color: selectedNode.risk > 80 ? 'var(--color-red)' : 'var(--color-orange)', textAlign: 'right', fontWeight: '700' }}>
                            {selectedNode.risk}/100
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  <button style={{
                    padding: '10px',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}>
                    Open Full Incident Case
                  </button>
                  <button style={{
                    padding: '10px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}>
                    Pivot to Threat Intelligence
                  </button>
                </div>
              </div>
            </Panel>
          ) : (
            <Panel title="Entity Inspector">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-secondary)' }}>
                <Icon name="search" size={24} style={{ marginBottom: '8px' }} />
                <span>Select a node to inspect properties.</span>
              </div>
            </Panel>
          )}
        </div>
      </div>

      {/* Relationships Table bottom */}
      <div style={{ marginTop: '24px' }}>
        <Panel title="Graph Relationship Mappings">
          <DataTable
            headers={[
              { key: 'source', label: 'Source Node' },
              { key: 'sourceType', label: 'Source Type' },
              { key: 'relationship', label: 'Relationship' },
              { key: 'target', label: 'Target Node' },
              { key: 'targetType', label: 'Target Type' },
              { key: 'confidence', label: 'Confidence' },
              { key: 'discovered', label: 'Discovered' }
            ]}
            data={getRelationsForSelected().map(row => ({
              ...row,
              sourceType: <span style={{ textTransform: 'uppercase', fontSize: '11px', color: NODE_TYPES[row.sourceType]?.color }}>{row.sourceType}</span>,
              targetType: <span style={{ textTransform: 'uppercase', fontSize: '11px', color: NODE_TYPES[row.targetType]?.color }}>{row.targetType}</span>,
              relationship: <span style={{ fontFamily: 'monospace', color: '#60a5fa' }}>{row.relationship}</span>
            }))}
          />
        </Panel>
      </div>
    </DashboardLayout>
  );
};

export default GraphInvestigation;
