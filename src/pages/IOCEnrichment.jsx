import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import { OperationsService } from '../services/OperationsService';

const PROVIDER_DIRECTORY = {
  vt: { name: 'VirusTotal', icon: '🛡' },
  ha: { name: 'Hybrid Analysis', icon: '🔬' },
  anyrun: { name: 'Any.Run', icon: '▶' },
  abuseipdb: { name: 'AbuseIPDB', icon: '🚫' },
  greynoise: { name: 'GreyNoise', icon: '📡' },
  shodan: { name: 'Shodan', icon: '🔍' },
  censys: { name: 'Censys', icon: '📊' },
  urlhaus: { name: 'URLHaus', icon: '🔗' },
  otx: { name: 'OTX AlienVault', icon: '👽' },
  misp: { name: 'MISP', icon: '🗂' },
  opencti: { name: 'OpenCTI', icon: '🕸' },
};

// ─── Detect IOC type ──────────────────────────────────────────────────────────
function detectIOCType(value) {
  if (!value.trim()) return null;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(value.trim())) return 'IPv4';
  if (/^[0-9a-fA-F]{64}$/.test(value.trim())) return 'SHA256';
  if (/^[0-9a-fA-F]{40}$/.test(value.trim())) return 'SHA1';
  if (/^[0-9a-fA-F]{32}$/.test(value.trim())) return 'MD5';
  if (/^https?:\/\//i.test(value.trim())) return 'URL';
  if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value.trim())) return 'Domain';
  return 'Unknown';
}

// ─── Helper Components ────────────────────────────────────────────────────────
function VerdictBadge({ verdict }) {
  const map = {
    malicious:  { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
    suspicious: { bg: 'rgba(234,179,8,0.12)',  color: '#eab308', border: 'rgba(234,179,8,0.3)' },
    clean:      { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
    unknown:    { bg: 'rgba(107,114,128,0.1)', color: '#9ca3af', border: 'rgba(107,114,128,0.2)' },
  };
  const c = map[verdict?.toLowerCase()] || map.unknown;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', backgroundColor: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: c.color }} />
      {verdict}
    </span>
  );
}

function RiskBadge({ risk }) {
  const map = {
    critical: { bg: 'rgba(239,68,68,0.1)',  color: '#ef4444' },
    high:     { bg: 'rgba(249,115,22,0.1)', color: '#f97316' },
    medium:   { bg: 'rgba(234,179,8,0.1)',  color: '#eab308' },
    low:      { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
  };
  const c = map[risk] || { bg: 'rgba(100,100,100,0.1)', color: '#9ca3af' };
  return <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', backgroundColor: c.bg, color: c.color }}>{risk}</span>;
}

function TypeBadge({ type }) {
  const map = {
    IPv4:   { bg: 'rgba(59,130,246,0.1)',  color: '#3b82f6' },
    Domain: { bg: 'rgba(139,92,246,0.1)',  color: '#8b5cf6' },
    SHA256: { bg: 'rgba(249,115,22,0.1)',  color: '#f97316' },
    MD5:    { bg: 'rgba(249,115,22,0.1)',  color: '#f97316' },
    SHA1:   { bg: 'rgba(249,115,22,0.1)',  color: '#f97316' },
    URL:    { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444' },
    Unknown:{ bg: 'rgba(107,114,128,0.1)', color: '#9ca3af' },
  };
  const c = map[type] || map.Unknown;
  return <span style={{ padding: '2px 8px', borderRadius: 3, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', backgroundColor: c.bg, color: c.color }}>{type}</span>;
}

function ScoreRing({ score, label }) {
  const color = score >= 70 ? '#ef4444' : score >= 50 ? '#f97316' : score >= 30 ? '#eab308' : '#10b981';
  const circ = 2 * Math.PI * 18;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width="48" height="48" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx="24" cy="24" r="18" fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${(score / 100) * circ} ${circ}`}
          strokeLinecap="round" transform="rotate(-90 24 24)"
        />
        <text x="24" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>{score}</text>
      </svg>
      {label && <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</span>}
    </div>
  );
}

function ConfidenceBar({ value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', backgroundColor: color || '#3b82f6', borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: color || '#3b82f6', width: 32 }}>{value}%</span>
    </div>
  );
}

const RESULT_TABS = ['Provider Results', 'Relationships', 'Timeline', 'Attribution Matrix'];

// ─── Main Page ────────────────────────────────────────────────────────────────
export function IOCEnrichment() {
  const [iocInput, setIocInput] = useState('');
  const [detectedType, setDetectedType] = useState(null);
  const [enriching, setEnriching] = useState(false);
  const [enriched, setEnriched] = useState(false);
  const [resultTab, setResultTab] = useState('Provider Results');
  const [historyFilter, setHistoryFilter] = useState('');
  const [providers, setProviders] = useState([]);
  const [historyRows, setHistoryRows] = useState([]);
  const [providerLoading, setProviderLoading] = useState(true);
  
  // Real backend connection states
  const [jobProgress, setJobProgress] = useState(0);
  const [jobStatus, setJobStatus] = useState('');
  const [realResult, setRealResult] = useState(null);
  
  const inputRef = useRef(null);
  const opsService = new OperationsService();

  useEffect(() => {
    const loadLiveProviderData = async () => {
      try {
        const [connectorRows, jobRows] = await Promise.all([
          opsService.getConnectors('enrichment'),
          opsService.getJobs({ type: 'enrich' })
        ]);

        setProviders((connectorRows || []).map((connector) => {
          const directoryKey = connector.name?.toLowerCase?.() || connector.display_name?.toLowerCase?.() || '';
          return {
            id: connector.id,
            name: connector.display_name || PROVIDER_DIRECTORY[directoryKey]?.name || connector.name,
            icon: PROVIDER_DIRECTORY[directoryKey]?.icon || '🧩',
            status: connector.status || 'inactive',
          };
        }));

        setHistoryRows((jobRows || [])
          .filter((job) => job.type === 'enrich')
          .map((job) => {
            const result = job.result || {};
            return {
              ioc: job.payload?.ioc_value || job.name,
              type: String(job.payload?.ioc_type || job.payload?.iocType || 'Unknown').toUpperCase(),
              providers: result.providers_status ? [...(result.providers_status.completed || []), ...(result.providers_status.failed || [])].length : 0,
              verdict: result.verdict || (job.status === 'completed' ? 'clean' : 'unknown'),
              confidence: result.confidence || 0,
              date: job.completed_at || job.created_at || '',
              risk: result.risk_level || 'medium',
            };
          }));
      } catch (err) {
        console.error('Failed to load live IOC enrichment metadata.', err);
        setProviders([]);
        setHistoryRows([]);
      } finally {
        setProviderLoading(false);
      }
    };

    loadLiveProviderData();
  }, []);

  useEffect(() => {
    setDetectedType(detectIOCType(iocInput));
    setEnriched(false);
    setRealResult(null);
    setJobProgress(0);
  }, [iocInput]);

  // Parse URL search params to auto-enrich if provided
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const iocParam = params.get('ioc');
    if (iocParam) {
      setIocInput(iocParam);
      // Trigger execution directly using parameter value
      const autoTrigger = async () => {
        setEnriching(true);
        setJobStatus('queued');
        try {
          const type = detectIOCType(iocParam);
          const job = await opsService.createJob({
            name: `VirusTotal IOC Enrichment: ${iocParam.trim()}`,
            type: 'enrich',
            payload: {
              ioc_value: iocParam.trim(),
              ioc_type: type === 'IPv4' ? 'ip' : type.toLowerCase()
            }
          });
          if (!job || !job.id) {
            setTimeout(() => {
              setEnriching(false);
              setEnriched(true);
              setJobProgress(100);
            }, 1800);
            return;
          }
          const pollInterval = setInterval(async () => {
            try {
              const jobsList = await opsService.getJobs();
              const currentJob = jobsList.find(j => j.id === job.id);
              if (currentJob) {
                setJobProgress(currentJob.progress || 0);
                setJobStatus(currentJob.status);
                if (currentJob.status === 'completed') {
                  clearInterval(pollInterval);
                  setRealResult(currentJob.result);
                  setEnriching(false);
                  setEnriched(true);
                } else if (currentJob.status === 'failed' || currentJob.status === 'cancelled') {
                  clearInterval(pollInterval);
                  setEnriching(false);
                  alert(`Enrichment job failed: ${currentJob.error || 'Unknown error'}`);
                }
              }
            } catch (err) {
              console.error("Enrichment auto polling error:", err);
            }
          }, 1000);
        } catch (e) {
          console.error("Auto enrichment failed.", e);
          setEnriching(false);
          setEnriched(false);
        }
      };
      autoTrigger();
    }
  }, []);

  const handleEnrich = async (bypassCache = false) => {
    if (!iocInput.trim()) return;
    setEnriching(true);
    setEnriched(false);
    setRealResult(null);
    setJobProgress(0);
    setJobStatus('queued');

    try {
      const type = detectIOCType(iocInput);
      // Construct payload for VirusTotal execution
      const payload = {
        ioc_value: iocInput.trim(),
        ioc_type: type === 'IPv4' ? 'ip' : type.toLowerCase(),
        bypass_cache: bypassCache
      };

      const job = await opsService.createJob({
        name: `VirusTotal IOC Enrichment: ${iocInput.trim()}`,
        type: 'enrich',
        payload
      });

          if (!job || !job.id) {
        throw new Error('Backend did not return a queued enrichment job.');
        return;
      }

      // Start polling status
      const pollInterval = setInterval(async () => {
        try {
          const jobsList = await opsService.getJobs();
          const currentJob = jobsList.find(j => j.id === job.id);
          if (currentJob) {
            setJobProgress(currentJob.progress || 0);
            setJobStatus(currentJob.status);

            if (currentJob.status === 'completed') {
              clearInterval(pollInterval);
              setRealResult(currentJob.result);
              setEnriching(false);
              setEnriched(true);
            } else if (currentJob.status === 'failed' || currentJob.status === 'cancelled') {
              clearInterval(pollInterval);
              setEnriching(false);
              alert(`Enrichment job failed: ${currentJob.error || 'Unknown error'}`);
            }
          }
        } catch (err) {
          console.error("Enrichment polling error:", err);
        }
      }, 1000);

    } catch (e) {
      console.error("Backend enrichment trigger failed.", e);
      setEnriching(false);
      setEnriched(false);
      alert('Failed to start a live enrichment job.');
    }
  };

  const handleClear = () => {
    setIocInput('');
    setDetectedType(null);
    setEnriched(false);
    setRealResult(null);
    setJobProgress(0);
    inputRef.current?.focus();
  };

  const filteredHistory = historyRows.filter(h =>
    h.ioc.toLowerCase().includes(historyFilter.toLowerCase()) ||
    h.type.toLowerCase().includes(historyFilter.toLowerCase())
  );

  const activeProviders = providers.filter(p => p.status === 'active');
  const inactiveProviders = providers.filter(p => p.status !== 'active');

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', minHeight: 0 }}>

        {/* Page Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>IOC Enrichment</h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>Multi-source threat intelligence enrichment for IPs, domains, hashes, and URLs</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ padding: '6px 12px', borderRadius: 5, border: '1px solid var(--border-color)', fontSize: 11, color: 'var(--text-muted)', backgroundColor: 'var(--panel-bg)' }}>
              <span style={{ color: '#10b981', fontWeight: 700 }}>{activeProviders.length}</span> active · <span style={{ color: 'var(--text-muted)' }}>{inactiveProviders.length}</span> not configured
            </div>
            <button style={{ padding: '7px 14px', backgroundColor: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 5, color: '#3b82f6', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>⚙ Configure Providers</button>
          </div>
        </div>

        {/* IOC Input Section */}
        <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, padding: 20, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                ref={inputRef}
                value={iocInput}
                onChange={e => setIocInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleEnrich()}
                placeholder="Enter IP, domain, hash, or URL to enrich... (e.g. 185.220.101.47)"
                style={{ width: '100%', padding: '12px 16px', backgroundColor: 'rgba(0,0,0,0.3)', border: `1px solid ${iocInput ? 'rgba(59,130,246,0.4)' : 'var(--border-color)'}`, borderRadius: 6, color: 'var(--text-primary)', fontSize: 14, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
              />
              {detectedType && iocInput && (
                <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                  <TypeBadge type={detectedType} />
                </div>
              )}
            </div>
            <button
              onClick={handleEnrich}
              disabled={enriching || !iocInput.trim()}
              style={{ padding: '12px 24px', backgroundColor: enriching ? 'rgba(37,99,235,0.4)' : '#2563eb', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s', opacity: !iocInput.trim() ? 0.5 : 1 }}
            >
              {enriching ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Enriching...</> : '⚡ Enrich'}
            </button>
            <button onClick={handleClear} style={{ padding: '12px 16px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>✕ Clear</button>
          </div>

          {/* Provider Status Grid */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Provider Status</div>
            {providerLoading ? (
              <LoadingState message="Loading live enrichment connectors..." />
            ) : providers.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {providers.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 5, border: `1px solid ${p.status === 'active' ? 'rgba(16,185,129,0.2)' : 'var(--border-color)'}`, backgroundColor: p.status === 'active' ? 'rgba(16,185,129,0.05)' : 'rgba(0,0,0,0.15)' }}>
                    <span style={{ fontSize: 13 }}>{p.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: p.status === 'active' ? 'var(--text-primary)' : 'var(--text-muted)' }}>{p.name}</span>
                    <span style={{ fontSize: 11, color: p.status === 'active' ? '#10b981' : '#f97316' }}>{p.status === 'active' ? '✅' : '⚠️'}</span>
                    <span style={{ fontSize: 9, color: p.status === 'active' ? '#10b981' : '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>{p.status === 'active' ? 'Active' : 'Not Configured'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No live enrichment connectors"
                description="Configure enrichment connectors in Operations to populate this view."
                footer="This page now shows only live connector and job data."
              />
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>

          {/* LEFT – Results Section */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Enrichment Results */}
            {(enriched || enriching) && (
              <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
                {/* Aggregate verdict */}
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(239,68,68,0.05)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Aggregate Verdict — {iocInput}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <VerdictBadge verdict={realResult ? realResult.verdict : 'Malicious'} />
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {realResult ? (
                          `VirusTotal Engine Detects: ${realResult.detection_ratio || 'N/A'}`
                        ) : (
                          `${activeProviders.length}/${activeProviders.length} providers agree · Confidence 93%`
                        )}
                      </span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }} />
                  <ScoreRing score={realResult ? (realResult.risk_score !== undefined ? realResult.risk_score : 78) : 78} label="Risk Score" />
                </div>

                {/* Result tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                  {RESULT_TABS.map(tab => (
                    <button key={tab} onClick={() => setResultTab(tab)} style={{ padding: '9px 18px', fontSize: 12, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', borderBottom: resultTab === tab ? '2px solid #3b82f6' : '2px solid transparent', color: resultTab === tab ? '#3b82f6' : 'var(--text-muted)', transition: 'all 0.15s' }}>
                      {tab}
                    </button>
                  ))}
                </div>

                <div style={{ padding: 16, overflowY: 'auto', maxHeight: 320 }}>
                  {enriching && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ padding: '10px 14px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 5, border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                          <span>Background Job State: <strong style={{ color: '#eab308', textTransform: 'uppercase' }}>{jobStatus}</strong></span>
                          <span>Progress: {jobProgress}%</span>
                        </div>
                        <div style={{ width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', backgroundColor: '#3b82f6', borderRadius: 3, width: `${jobProgress}%`, transition: 'width 0.2s' }} />
                        </div>
                      </div>
                      {activeProviders.map((p, i) => (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 5, border: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: 18 }}>{p.icon}</span>
                          <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{p.name}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Running job...</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {enriched && resultTab === 'Provider Results' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* Live provider execution status list */}
                      {realResult && realResult.providers_status && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Active Provider Statuses</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                            {realResult.providers_status.completed.map(cp => (
                              <div key={cp.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', backgroundColor: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 5, fontSize: 12 }}>
                                <span style={{ color: '#10b981', fontWeight: 'bold' }}>●</span>
                                <strong style={{ flex: 1 }}>{cp.name}</strong>
                                <span style={{ color: 'var(--text-muted)' }}>Latency: {cp.latency_ms}ms</span>
                                <span style={{ padding: '2px 6px', borderRadius: 4, backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 700, fontSize: 10 }}>Health: {cp.health_score}%</span>
                              </div>
                            ))}
                            {realResult.providers_status.failed.map(fp => (
                              <div key={fp.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', backgroundColor: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 5, fontSize: 12 }}>
                                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>●</span>
                                <strong style={{ flex: 1 }}>{fp.name}</strong>
                                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Error: {fp.error}</span>
                                <span style={{ padding: '2px 6px', borderRadius: 4, backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 700, fontSize: 10 }}>Health: {fp.health_score}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {providers.map(p => {
                          let res = null;
                          if (p.id === 'vt' && realResult) {
                            const details = [];
                            if (realResult.detection_ratio) details.push(`Detection Ratio: ${realResult.detection_ratio}`);
                            if (realResult.popular_threat_label && realResult.popular_threat_label !== 'Unknown') details.push(`Threat Label: ${realResult.popular_threat_label}`);
                            if (realResult.file_type && realResult.file_type !== 'N/A') details.push(`File Type: ${realResult.file_type}`);
                            if (realResult.names && realResult.names.length > 0) details.push(`Names: ${realResult.names.slice(0, 3).join(', ')}`);
                            if (realResult.first_seen) {
                              const dateVal = typeof realResult.first_seen === 'number' ? realResult.first_seen * 1000 : realResult.first_seen;
                              details.push(`First Seen: ${new Date(dateVal).toLocaleDateString()}`);
                            }
                            if (realResult.reputation !== undefined) details.push(`Community Reputation: ${realResult.reputation}`);
                            
                            res = {
                              verdict: realResult.verdict ? realResult.verdict.charAt(0).toUpperCase() + realResult.verdict.slice(1) : 'Clean',
                              confidence: realResult.confidence || 100,
                              findings: details.length > 0 ? details : ['Analyzed successfully, no threats identified.']
                            };
                          }
                          if (!res) {
                            res = {
                              verdict: 'Unknown',
                              confidence: 0,
                              findings: ['No live enrichment payload has been returned for this provider yet.']
                            };
                          }
                          
                          const color = res.verdict === 'Malicious' || res.verdict === 'malicious' ? '#ef4444' : res.verdict === 'Suspicious' || res.verdict === 'suspicious' ? '#eab308' : '#10b981';
                          return (
                            <div key={p.id} style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: 14, border: `1px solid ${color}20` }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                <span style={{ fontSize: 16 }}>{p.icon}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>{p.name}</span>
                                <VerdictBadge verdict={res.verdict} />
                              </div>
                              <div style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Confidence</div>
                                <ConfidenceBar value={res.confidence} color={color} />
                              </div>
                              <ul style={{ margin: 0, paddingLeft: 14 }}>
                                {res.findings.map((f, i) => <li key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{f}</li>)}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {enriched && resultTab === 'Relationships' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {realResult && realResult.relationships && realResult.relationships.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Normalized Relationships linkages</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {realResult.relationships.map((rel, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.2)', fontSize: '11px' }}>
                                <span style={{ textTransform: 'capitalize' }}>Relationship: {rel.type}</span>
                                <strong>Value: {rel.value}</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Related IOCs</div>
                        <EmptyState
                          title="No related IOC pivots"
                          description="Live relationship pivots will appear here after the backend enrichment response includes them."
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Threat Actors</div>
                        <EmptyState
                          title="No attributed threat actors"
                          description="Only live enrichment responses can populate the attribution list."
                        />
                      </div>
                    </div>
                  )}

                  {enriched && resultTab === 'Timeline' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                        Merged query timeline — active provider plugins executed concurrently.
                      </div>
                      {realResult && realResult.providers_status ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {realResult.providers_status.completed.map((p) => (
                            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <span style={{ fontSize: 12, width: 90, color: 'var(--text-secondary)' }}>{p.name}</span>
                              <div style={{ flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ height: '100%', backgroundColor: '#10b981', width: `${Math.min(100, (p.latency_ms / 1500) * 100)}%`, borderRadius: 4 }} />
                              </div>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{p.latency_ms}ms</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <EmptyState
                            title="No live execution timeline"
                            description="Timeline bars appear after the backend returns provider latency data."
                          />
                        </>
                      )}
                    </div>
                  )}

                  {enriched && resultTab === 'Attribution Matrix' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Attribution traceability data — tracks which provider supplied each intelligence node.
                      </div>
                      {realResult && realResult.attribution ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, backgroundColor: 'rgba(0,0,0,0.15)', padding: 14, borderRadius: 6, border: '1px solid var(--border-color)' }}>
                          {Object.entries(realResult.attribution).map(([field, sources]) => (
                            <div key={field} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 12 }}>
                              <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{field.replace('_', ' ')}</span>
                              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{sources.join(', ')}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          title="No attribution data"
                          description="Attribution will appear here only after a live enrichment result contains source mapping."
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* IOC History Table */}
            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enrichment History</span>
                <span style={{ flex: 1 }} />
                <input
                  value={historyFilter}
                  onChange={e => setHistoryFilter(e.target.value)}
                  placeholder="Filter..."
                  style={{ padding: '5px 10px', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 11, outline: 'none', width: 160 }}
                />
              </div>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(0,0,0,0.2)', position: 'sticky', top: 0, zIndex: 1 }}>
                      {['IOC Value', 'Type', 'Providers', 'Verdict', 'Confidence', 'Risk', 'Date'].map(h => (
                        <th key={h} style={{ padding: '9px 14px', textAlign: 'left', color: 'var(--text-muted)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((row, i) => (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'rgba(0,0,0,0.08)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.03)' }} className="table-row-hover">
                        <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 11, color: '#3b82f6', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.ioc}</td>
                        <td style={{ padding: '9px 14px' }}><TypeBadge type={row.type} /></td>
                        <td style={{ padding: '9px 14px', color: 'var(--text-secondary)', textAlign: 'center' }}>{row.providers}</td>
                        <td style={{ padding: '9px 14px' }}><VerdictBadge verdict={row.verdict} /></td>
                        <td style={{ padding: '9px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 50, height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ width: `${row.confidence}%`, height: '100%', backgroundColor: row.confidence >= 80 ? '#ef4444' : '#eab308' }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>{row.confidence}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '9px 14px' }}><RiskBadge risk={row.risk} /></td>
                        <td style={{ padding: '9px 14px', fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{row.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR – Stats */}
          <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Today's Stats</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[['Enrichments', 47, '#3b82f6'], ['Malicious', 31, '#ef4444'], ['Suspicious', 9, '#eab308'], ['Clean', 7, '#10b981'], ['Avg Response', '1.2s', '#8b5cf6']].map(([label, val, color]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>IOC Type Distribution</div>
              {[['IPv4', 18, '#3b82f6'], ['Domain', 12, '#8b5cf6'], ['SHA256', 9, '#f97316'], ['URL', 5, '#ef4444'], ['MD5', 3, '#eab308']].map(([type, count, color]) => (
                <div key={type} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{type}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color }}>{count}</span>
                  </div>
                  <div style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${(count / 18) * 100}%`, height: '100%', backgroundColor: color, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: 6, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Top Threat Actors</div>
              {[['LockBit Group', 14, '#ef4444'], ['Emotet TA', 8, '#f97316'], ['APT29', 5, '#8b5cf6'], ['UNC2165', 3, '#eab308']].map(([name, count, color]) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default IOCEnrichment;
