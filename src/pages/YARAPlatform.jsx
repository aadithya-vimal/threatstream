import React, { useState } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import SectionHeader from '../components/SectionHeader';
import MetricCard from '../components/MetricCard';
import Panel from '../components/Panel';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import { Icon } from '../components/Icons';

const INITIAL_YARA_RULES = [
  {
    id: 'yara-001',
    name: 'Detect_LockBit_3',
    description: 'Detects LockBit 3.0 (LockBit Black) ransomware binaries based on specific cryptographic constants and string builders.',
    author: 'SOC Threat Team',
    version: '1.2',
    category: 'Ransomware',
    severity: 'critical',
    status: 'Active',
    execution_count: 342,
    last_triggered: '2026-07-05 12:44:12',
    mitre_id: 'T1486',
    definition: `rule Detect_LockBit_3 {\n    meta:\n        author = "SOC Threat Team"\n        description = "Detects LockBit 3.0 Ransomware"\n        severity = "Critical"\n        mitre_tactic = "Impact"\n        mitre_technique = "T1486"\n    strings:\n        $g1 = "LockBit 3.0" ascii wide\n        $g2 = ".lockbit" ascii wide\n        $s1 = { 8B 45 FC 83 C0 01 89 45 FC 8B 4D FC 3B 4D 08 7D 2F }\n        $s2 = { 8A 04 0B 32 04 0A 88 04 0B }\n    condition:\n        uint16(0) == 0x5A4D and ($g1 or $g2) and all of ($s*)\n}`
  },
  {
    id: 'yara-002',
    name: 'Emotet_Dropper_Office',
    description: 'Identifies MS Office documents containing Emotet downloader VBA macros.',
    author: 'VBA Analyst Group',
    version: '2.0',
    category: 'Malware Families',
    severity: 'high',
    status: 'Active',
    execution_count: 89,
    last_triggered: '2026-07-04 18:21:05',
    mitre_id: 'T1204.002',
    definition: `rule Emotet_Dropper_Office {\n    meta:\n        author = "VBA Analyst Group"\n        description = "Detects Emotet Dropper Macros in Office Docs"\n        mitre_technique = "T1204.002"\n    strings:\n        $magic_doc = { D0 CF 11 E0 A1 B1 1A E1 }\n        $vba1 = "Document_Open" ascii\n        $vba2 = "AutoOpen" ascii\n        $payload1 = "powershell.exe -w hidden -c" ascii wide\n        $payload2 = "WScript.Shell" ascii wide\n    condition:\n        $magic_doc at 0 and ($vba1 or $vba2) and 1 of ($payload*)\n}`
  },
  {
    id: 'yara-003',
    name: 'LSASS_Dump_Detect',
    description: 'Flags credential harvesting via dumping of local security authority subsystem (lsass.exe).',
    author: 'IR Specialist',
    version: '1.0',
    category: 'Credential Dumping',
    severity: 'critical',
    status: 'Active',
    execution_count: 1204,
    last_triggered: '2026-07-05 13:02:44',
    mitre_id: 'T1003.001',
    definition: `rule LSASS_Dump_Detect {\n    meta:\n        author = "IR Specialist"\n        description = "Detects Minidump files of LSASS process"\n        mitre_technique = "T1003.001"\n    strings:\n        $magic_dmp = { 4D 44 4D 50 93 A7 }\n        $lsass_str1 = "lsass.exe" wide\n        $lsass_str2 = "lsass.dmp" ascii wide\n    condition:\n        $magic_dmp at 0 and 1 of ($lsass_str*)\n}`
  },
  {
    id: 'yara-004',
    name: 'Cobalt_Strike_Beacon',
    description: 'Detects Cobalt Strike beacon payloads in memory or files based on shellcode signature configurations.',
    author: 'Red Team Tracker',
    version: '3.4',
    category: 'C2 Detection',
    severity: 'critical',
    status: 'Active',
    execution_count: 148,
    last_triggered: '2026-07-03 09:12:00',
    mitre_id: 'T2071',
    definition: `rule Cobalt_Strike_Beacon {\n    meta:\n        author = "Red Team Tracker"\n        description = "Detects Cobalt Strike Beacon shellcode"\n    strings:\n        $s1 = { FC E8 89 00 00 00 60 89 E5 31 D2 64 8B 52 30 8B 52 0C }\n        $s2 = "ReflectiveLoader" ascii wide\n        $beacon_cfg = "beacon.x64.dll" ascii\n    condition:\n        uint16(0) == 0x5A4D and 2 of them\n}`
  },
  {
    id: 'yara-005',
    name: 'Mimikatz_Strings',
    description: 'Detects Mimikatz credentials stealing tool strings.',
    author: 'SOC Analyst',
    version: '1.5',
    category: 'Credential Dumping',
    severity: 'high',
    status: 'Active',
    execution_count: 412,
    last_triggered: '2026-07-05 11:30:15',
    mitre_id: 'T1003.001',
    definition: `rule Mimikatz_Strings {\n    meta:\n        author = "SOC Analyst"\n        description = "Detects Mimikatz Strings"\n    strings:\n        $m1 = "mimikatz" ascii wide case-insensitive\n        $m2 = "sekurlsa::logonpasswords" ascii wide\n        $m3 = "wdigest.dll" ascii wide\n        $m4 = "lsadump" ascii wide\n    condition:\n        2 of them\n}`
  },
  {
    id: 'yara-006',
    name: 'PowerShell_Obfuscation_Stage2',
    description: 'Detects heavily obfuscated PowerShell command line strings.',
    author: 'Threat Hunter Alpha',
    version: '1.1',
    category: 'Lateral Movement',
    severity: 'medium',
    status: 'Active',
    execution_count: 228,
    last_triggered: '2026-07-05 13:04:19',
    mitre_id: 'T1027',
    definition: `rule PowerShell_Obfuscation_Stage2 {\n    meta:\n        author = "Threat Hunter Alpha"\n        description = "PowerShell Obfuscation Stage 2"\n    strings:\n        $obf1 = "-join" ascii wide case-insensitive\n        $obf2 = "[char[]]" ascii wide case-insensitive\n        $obf3 = "[Convert]::ToBase64String" ascii wide\n        $obf4 = "IO.MemoryStream" ascii wide\n    condition:\n        3 of them\n}`
  },
  {
    id: 'yara-007',
    name: 'BankBot_APK',
    description: 'Detects BankBot android banking trojan based on package name, permissions, and service attributes.',
    author: 'Mobile Team',
    version: '1.0',
    category: 'Malware Families',
    severity: 'high',
    status: 'Active',
    execution_count: 51,
    last_triggered: '2026-07-02 14:15:36',
    mitre_id: 'T1437',
    definition: `rule BankBot_APK {\n    meta:\n        author = "Mobile Team"\n        description = "Detects BankBot APK"\n    strings:\n        $apk1 = "Android.app.admin" ascii wide\n        $apk2 = "smspayment" ascii wide\n        $apk3 = "banking_trojan" ascii wide\n    condition:\n        2 of them\n}`
  },
  {
    id: 'yara-008',
    name: 'Ryuk_Ransomware',
    description: 'Detects Ryuk ransomware indicators and file encryption markers.',
    author: 'SOC Threat Team',
    version: '1.3',
    category: 'Ransomware',
    severity: 'critical',
    status: 'Active',
    execution_count: 83,
    last_triggered: '2026-07-01 02:44:00',
    mitre_id: 'T1486',
    definition: `rule Ryuk_Ransomware {\n    meta:\n        author = "SOC Threat Team"\n        description = "Ryuk Ransomware"\n    strings:\n        $r1 = "RyukReadMe" ascii wide\n        $r2 = "HERMES" ascii wide\n        $r3 = "ryuk" ascii wide case-insensitive\n    condition:\n        2 of them\n}`
  }
];

const CATEGORIES = [
  { name: 'All Rules', count: 91 },
  { name: 'Ransomware', count: 12 },
  { name: 'Credential Dumping', count: 8 },
  { name: 'Lateral Movement', count: 6 },
  { name: 'Persistence', count: 15 },
  { name: 'C2 Detection', count: 11 },
  { name: 'Exfiltration', count: 5 },
  { name: 'Malware Families', count: 34 }
];

export const YARAPlatform = () => {
  const [rules, setRules] = useState(INITIAL_YARA_RULES);
  const [selectedRule, setSelectedRule] = useState(INITIAL_YARA_RULES[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Rules');
  const [fileToScan, setFileToScan] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const handleScanFile = async () => {
    if (!fileToScan) return;
    setScanning(true);
    setScanResult(null);
    
    const formData = new FormData();
    formData.append('file', fileToScan);
    if (selectedRule) {
      formData.append('rule_id', selectedRule.id);
    }
    
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/telemetry/yara/scan', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setScanResult(data);
      } else {
        setScanResult({ matches_count: 0, matches: [], error: 'Scan failed on backend.' });
      }
    } catch (err) {
      // Local fallback simulation
      setTimeout(() => {
        const reader = new FileReader();
        reader.onload = () => {
          const text = (reader.result || '').toLowerCase();
          const matches = [];
          if (text.includes('lockbit') || text.includes('.lockbit')) {
            matches.push({ rule_name: 'Detect_LockBit_3', severity: 'critical', description: 'LockBit Ransomware signature match.' });
          }
          if (text.includes('lsass') || text.includes('taskmgr')) {
            matches.push({ rule_name: 'LSASS_Dump_Detect', severity: 'critical', description: 'LSASS memory dump signature match.' });
          }
          setScanResult({
            file_name: fileToScan.name,
            file_size: fileToScan.size,
            matches_count: matches.length,
            matches: matches
          });
        };
        reader.readAsText(fileToScan);
      }, 1000);
    } finally {
      setScanning(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          rule.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All Rules' || rule.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout>
      <SectionHeader 
        title="YARA Rules Management Platform" 
        subtitle="Create, manage, version, and monitor YARA detection signatures across the enterprise log stream."
      />

      <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
        <MetricCard title="Total YARA Rules" value="91" change="+4 rules this week" icon="yara" />
        <MetricCard title="Executions (Today)" value="847" change="+12% vs yesterday" icon="play" />
        <MetricCard title="Total Triggered Rules" value="14,293" change="Across 240+ hosts" icon="activity" />
        <MetricCard title="Active Rules Deployments" value="91" change="100% active state" icon="check" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 320px', gap: '20px', height: 'calc(100vh - 280px)', minHeight: '600px' }}>
        {/* Left Side: Rule Library categories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Panel title="Rule Library">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Search rule library..." 
                value={searchTerm}
                onChange={handleSearch}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '13px'
                }}
              />
              <button 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '8px',
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  marginTop: '4px'
                }}
              >
                <Icon name="plus" size={14} /> New YARA Rule
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '16px' }}>
              {CATEGORIES.map(category => (
                <button
                  key={category.name}
                  onClick={() => setSelectedCategory(category.name)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: selectedCategory === category.name ? 'var(--bg-tertiary)' : 'transparent',
                    color: selectedCategory === category.name ? 'var(--accent)' : 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontWeight: selectedCategory === category.name ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  <span>{category.name}</span>
                  <span style={{ 
                    fontSize: '11px', 
                    padding: '2px 6px', 
                    borderRadius: '10px', 
                    backgroundColor: selectedCategory === category.name ? 'var(--accent)' : 'var(--bg-primary)',
                    color: selectedCategory === category.name ? '#fff' : 'var(--text-secondary)'
                  }}>{category.count}</span>
                </button>
              ))}
            </div>
          </Panel>
        </div>

        {/* Center Panel: Table and Rule Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          <Panel title="Deployments Queue">
            <DataTable
              headers={[
                { key: 'name', label: 'Rule Name' },
                { key: 'category', label: 'Category' },
                { key: 'severity', label: 'Severity' },
                { key: 'execution_count', label: 'Executions' },
                { key: 'status', label: 'Status' }
              ]}
              data={filteredRules.map(rule => ({
                ...rule,
                name: (
                  <span 
                    onClick={() => setSelectedRule(rule)} 
                    style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: '600' }}
                  >
                    {rule.name}
                  </span>
                ),
                severity: <StatusBadge value={rule.severity} />,
                status: <span style={{ color: 'var(--color-green)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}><span style={{ width: '6px', height: '6px', backgroundColor: 'var(--color-green)', borderRadius: '50%' }}></span> Active</span>
              }))}
            />
          </Panel>

          {selectedRule && (
            <Panel title={`Rule Details: ${selectedRule.name}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', color: 'var(--text-primary)' }}>{selectedRule.name}</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>{selectedRule.description}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>Author: {selectedRule.author}</span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>v{selectedRule.version}</span>
                    </div>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent)' }}>MITRE: {selectedRule.mitre_id}</span>
                  </div>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>YARA Rule Definition</h4>
                  <pre style={{
                    margin: 0,
                    padding: '16px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: '#60a5fa',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    overflowX: 'auto',
                    lineHeight: '1.5'
                  }}>
                    {selectedRule.definition}
                  </pre>
                </div>
              </div>
            </Panel>
          )}
        </div>

        {/* Right Panel: Rule Analytics & Recent Matches */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Panel title="Rule Analytics">
            <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Top Triggered Rules</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>LSASS_Dump_Detect</span>
                  <span>1,204 hits</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                  <div style={{ width: '90%', height: '100%', backgroundColor: 'var(--color-red)' }}></div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Mimikatz_Strings</span>
                  <span>412 hits</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                  <div style={{ width: '55%', height: '100%', backgroundColor: 'var(--color-orange)' }}></div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Detect_LockBit_3</span>
                  <span>342 hits</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                  <div style={{ width: '45%', height: '100%', backgroundColor: 'var(--color-orange)' }}></div>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>PowerShell_Obfuscation_Stage2</span>
                  <span>228 hits</span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--bg-tertiary)', overflow: 'hidden' }}>
                  <div style={{ width: '30%', height: '100%', backgroundColor: 'var(--color-blue)' }}></div>
                </div>
              </div>
            </div>

            <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Recent Matches</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)', borderLeft: '3px solid var(--color-red)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>WIN-HR-04 (10.0.5.42)</span>
                  <span>12:44:12</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Detect_LockBit_3</div>
                <div style={{ fontSize: '11px', color: 'var(--color-red)', marginTop: '2px' }}>File: update_agent.exe</div>
              </div>

              <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)', borderLeft: '3px solid var(--color-red)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>DC-01 (10.0.5.10)</span>
                  <span>13:02:44</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>LSASS_Dump_Detect</div>
                <div style={{ fontSize: '11px', color: 'var(--color-red)', marginTop: '2px' }}>File: lsass.dmp</div>
              </div>

              <div style={{ padding: '10px', borderRadius: '6px', backgroundColor: 'var(--bg-tertiary)', borderLeft: '3px solid var(--color-orange)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  <span>WIN-SRV02 (10.0.5.15)</span>
                  <span>13:04:19</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>PowerShell_Obfuscation_Stage2</div>
                <div style={{ fontSize: '11px', color: 'var(--color-orange)', marginTop: '2px' }}>Process: powershell.exe</div>
              </div>
            </div>
          </Panel>

          <Panel title="Ad-hoc File Scanner">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Scan a local binary or log payload against selected YARA signature:</span>
              <input 
                type="file" 
                onChange={(e) => setFileToScan(e.target.files[0])}
                style={{
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  padding: '6px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              />
              <button
                onClick={handleScanFile}
                disabled={scanning || !fileToScan}
                style={{
                  padding: '8px 12px',
                  backgroundColor: scanning || !fileToScan ? 'var(--border-color)' : 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: scanning || !fileToScan ? 'not-allowed' : 'pointer',
                  textAlign: 'center'
                }}
              >
                {scanning ? 'Scanning File...' : 'Scan File'}
              </button>

              {scanResult && (
                <div style={{ marginTop: '8px', padding: '10px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: scanResult.matches_count > 0 ? '#ef4444' : '#10b981' }}>
                    {scanResult.matches_count > 0 ? `⚠️ Matches Found: ${scanResult.matches_count}` : '✅ No Signatures Matched'}
                  </div>
                  {scanResult.matches?.map((match, idx) => (
                    <div key={idx} style={{ fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px', marginBottom: '4px' }}>
                      <strong>{match.rule_name}</strong> - <span style={{ textTransform: 'uppercase', color: '#ef4444' }}>{match.severity}</span>
                      <div style={{ color: 'var(--text-muted)' }}>{match.description}</div>
                    </div>
                  ))}
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Size: {scanResult.file_size} bytes
                  </div>
                </div>
              )}
            </div>
          </Panel>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default YARAPlatform;
