import React, { useEffect, useMemo, useState } from 'react';
import { Panel } from '../components/Panel';
import { SectionHeader } from '../components/SectionHeader';
import { StatusBadge } from '../components/StatusBadge';
import DashboardLayout from '../layouts/DashboardLayout';
import { Icon } from '../components/Icons';
import { ConfigurationRepository } from '../repositories/ConfigurationRepository';

/* ─────────────────────────────────────────────
   Shared micro-components
───────────────────────────────────────────── */
const inputStyle = {
  backgroundColor: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: '5px',
  color: 'var(--text-primary)',
  fontSize: '13px',
  padding: '8px 12px',
  width: '100%',
  outline: 'none',
};

const labelStyle = {
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '6px',
  display: 'block',
};

const fieldStyle = { marginBottom: '18px' };

const btnPrimary = {
  backgroundColor: 'var(--color-blue)',
  color: '#fff',
  border: 'none',
  borderRadius: '5px',
  padding: '8px 18px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

const btnSecondary = {
  backgroundColor: 'transparent',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: '5px',
  padding: '8px 14px',
  fontSize: '13px',
  cursor: 'pointer',
};

const Toggle = ({ value, onChange }) => (
  <div
    onClick={() => onChange(!value)}
    style={{
      width: '42px',
      height: '22px',
      borderRadius: '11px',
      backgroundColor: value ? 'var(--color-blue)' : 'var(--border-color)',
      position: 'relative',
      cursor: 'pointer',
      transition: 'background-color 200ms',
      flexShrink: 0,
    }}
  >
    <div
      style={{
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        backgroundColor: '#fff',
        position: 'absolute',
        top: '3px',
        left: value ? '23px' : '3px',
        transition: 'left 200ms',
      }}
    />
  </div>
);

const ToggleRow = ({ label, description, value, onChange }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 0',
      borderBottom: '1px solid var(--border-color)',
    }}
  >
    <div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
      {description && (
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{description}</div>
      )}
    </div>
    <Toggle value={value} onChange={onChange} />
  </div>
);

const SaveButton = ({ label = 'Save Changes', onClick }) => (
  <button style={btnPrimary} className="btn-primary-hover" onClick={onClick}>
    {label}
  </button>
);

/* ─────────────────────────────────────────────
   Section: General
───────────────────────────────────────────── */
const GeneralSection = () => {
  const [form, setForm] = useState({
    orgName: 'Acme Corporation',
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    rateLimit: '1000',
    sessionTimeout: '8h',
    locale: 'en-US',
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <SectionHeader title="General Settings" description="Configure organization-wide platform preferences." />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px', maxWidth: '820px' }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Organization Name</label>
          <input style={inputStyle} value={form.orgName} onChange={set('orgName')} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Timezone</label>
          <select style={inputStyle} value={form.timezone} onChange={set('timezone')}>
            {['UTC', 'US/Eastern', 'US/Pacific', 'Europe/London', 'Asia/Kolkata'].map((tz) => (
              <option key={tz}>{tz}</option>
            ))}
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Date Format</label>
          <select style={inputStyle} value={form.dateFormat} onChange={set('dateFormat')}>
            {['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'].map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Max API Rate Limit (req/min)</label>
          <input style={inputStyle} type="number" value={form.rateLimit} onChange={set('rateLimit')} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Session Timeout</label>
          <select style={inputStyle} value={form.sessionTimeout} onChange={set('sessionTimeout')}>
            {['1h', '4h', '8h', '24h'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Platform Locale</label>
          <select style={inputStyle} value={form.locale} onChange={set('locale')}>
            {['en-US', 'fr-FR', 'de-DE', 'ja-JP'].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>
      <SaveButton />
    </div>
  );
};

/* ─────────────────────────────────────────────
   Section: Security
───────────────────────────────────────────── */
const SecuritySection = () => {
  const [mfa, setMfa] = useState(true);
  const [sessionInvalid, setSessionInvalid] = useState(true);
  const [complexity, setComplexity] = useState({
    uppercase: true,
    lowercase: true,
    number: true,
    special: true,
  });
  const [minLen, setMinLen] = useState('12');
  const [lockout, setLockout] = useState('5');
  const [auditRetention, setAuditRetention] = useState('365');
  const [sslWarn, setSslWarn] = useState('30');
  const [ipList, setIpList] = useState('10.0.0.0/8\n192.168.1.0/24');

  const toggleComplexity = (k) =>
    setComplexity((c) => ({ ...c, [k]: !c[k] }));

  return (
    <div>
      <SectionHeader title="Security Settings" description="Manage authentication, password policy, and access controls." />

      <ToggleRow
        label="MFA Enforcement"
        description="Require multi-factor authentication for all users."
        value={mfa}
        onChange={setMfa}
      />
      <ToggleRow
        label="Invalidate Session on IP Change"
        description="Terminate active sessions if the user's IP address changes."
        value={sessionInvalid}
        onChange={setSessionInvalid}
      />

      <div style={{ height: '24px' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 32px', maxWidth: '820px' }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Min Password Length</label>
          <input style={inputStyle} type="number" value={minLen} onChange={(e) => setMinLen(e.target.value)} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Login Attempt Lockout</label>
          <input style={inputStyle} type="number" value={lockout} onChange={(e) => setLockout(e.target.value)} />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>SSL Cert Expiry Warning (days)</label>
          <input style={inputStyle} type="number" value={sslWarn} onChange={(e) => setSslWarn(e.target.value)} />
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Password Complexity Requirements</label>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {[
            { key: 'uppercase', label: 'Uppercase (A–Z)' },
            { key: 'lowercase', label: 'Lowercase (a–z)' },
            { key: 'number', label: 'Number (0–9)' },
            { key: 'special', label: 'Special (!@#$…)' },
          ].map(({ key, label }) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={complexity[key]}
                onChange={() => toggleComplexity(key)}
                style={{ accentColor: 'var(--color-blue)', width: '14px', height: '14px' }}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px', maxWidth: '820px' }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Audit Log Retention (days)</label>
          <input style={inputStyle} type="number" value={auditRetention} onChange={(e) => setAuditRetention(e.target.value)} />
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>IP Allowlist (one per line)</label>
        <textarea
          style={{ ...inputStyle, height: '100px', resize: 'vertical', fontFamily: 'monospace' }}
          value={ipList}
          onChange={(e) => setIpList(e.target.value)}
        />
      </div>

      <SaveButton label="Save Security Settings" />
    </div>
  );
};

const INTEGRATION_FIELDS = [
  { key: 'virustotal.api_key', label: 'VirusTotal API Key', type: 'password', help: 'File hash, URL, IP, and domain enrichment.' },
  { key: 'abuseipdb.api_key', label: 'AbuseIPDB API Key', type: 'password', help: 'IP reputation lookups.' },
  { key: 'greynoise.api_key', label: 'GreyNoise API Key', type: 'password', help: 'IP noise classification.' },
  { key: 'shodan.api_key', label: 'Shodan API Key', type: 'password', help: 'Host and exposure lookups.' },
  { key: 'censys.api_id', label: 'Censys API ID', type: 'text', help: 'Pair this with the Censys API secret.' },
  { key: 'censys.api_secret', label: 'Censys API Secret', type: 'password', help: 'Stored in workspace settings.' },
  { key: 'otx.api_key', label: 'AlienVault OTX API Key', type: 'password', help: 'Pulse and reputation lookups.' },
  { key: 'hybridanalysis.api_key', label: 'Hybrid Analysis API Key', type: 'password', help: 'Sample and sandbox lookups.' },
  { key: 'anyrun.api_key', label: 'Any.Run API Key', type: 'password', help: 'Detonation and report lookup.' },
  { key: 'misp.url', label: 'MISP URL', type: 'text', help: 'Base URL for your MISP instance.' },
  { key: 'misp.api_key', label: 'MISP API Key', type: 'password', help: 'API key for MISP sync.' },
  { key: 'opencti.url', label: 'OpenCTI URL', type: 'text', help: 'Base URL for your OpenCTI instance.' },
  { key: 'opencti.api_key', label: 'OpenCTI API Key', type: 'password', help: 'API key for OpenCTI GraphQL.' },
];

const buildDefaultIntegrationValues = () => INTEGRATION_FIELDS.reduce((accumulator, field) => {
  accumulator[field.key] = '';
  return accumulator;
}, {});

const ApiKeysSection = () => {
  const configRepo = useMemo(() => new ConfigurationRepository(), []);
  const [values, setValues] = useState(buildDefaultIntegrationValues());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const settings = await configRepo.getSettings();
      const nextValues = buildDefaultIntegrationValues();
      INTEGRATION_FIELDS.forEach(({ key }) => {
        nextValues[key] = settings[`integrations.${key}`] || '';
      });
      setValues(nextValues);
      setLoading(false);
    };
    load();
  }, [configRepo]);

  const updateField = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    setSavedMessage('');
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await Promise.all(
        INTEGRATION_FIELDS.map((field) => configRepo.updateSetting(`integrations.${field.key}`, values[field.key] || ''))
      );
      setSavedMessage('Integration credentials saved to workspace settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <SectionHeader
        title="Integration Credentials"
        description="Store provider credentials in the workspace so live enrichment no longer depends on local environment files."
        actions={
          <button style={btnPrimary} className="btn-primary-hover" onClick={saveAll} disabled={saving}>
            {saving ? 'Saving…' : 'Save Credentials'}
          </button>
        }
      />

      {savedMessage && (
        <div style={{ marginBottom: '16px', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--color-low-border)', backgroundColor: 'var(--color-low-bg)', color: 'var(--color-low)', fontSize: '13px' }}>
          {savedMessage}
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading integration settings…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '18px 24px' }}>
          {INTEGRATION_FIELDS.map((field) => (
            <div key={field.key} style={fieldStyle}>
              <label style={labelStyle}>{field.label}</label>
              <input
                style={inputStyle}
                type={field.type}
                placeholder={field.label}
                value={values[field.key] || ''}
                onChange={(e) => updateField(field.key, e.target.value)}
                autoComplete="off"
              />
              <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                {field.help}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   Section: Notifications
───────────────────────────────────────────── */
const NotificationsSection = () => {
  const [threshold, setThreshold] = useState('High');
  const [email, setEmail] = useState(true);
  const [emailAddr, setEmailAddr] = useState('soc-alerts@acme.com');
  const [slack, setSlack] = useState(false);
  const [slackUrl, setSlackUrl] = useState('');
  const [pagerduty, setPagerduty] = useState(false);
  const [pdKey, setPdKey] = useState('');
  const [inApp, setInApp] = useState(true);

  return (
    <div>
      <SectionHeader title="Notifications" description="Configure alert delivery channels and severity thresholds." />

      <div style={fieldStyle}>
        <label style={labelStyle}>Alert Severity Threshold</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          {['Low', 'Medium', 'High', 'Critical'].map((s) => {
            const colorMap = { Low: 'var(--color-low)', Medium: 'var(--color-medium)', High: 'var(--color-high)', Critical: 'var(--color-critical)' };
            const active = threshold === s;
            return (
              <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '7px 14px', border: `1px solid ${active ? colorMap[s] : 'var(--border-color)'}`, borderRadius: '5px', backgroundColor: active ? `${colorMap[s]}15` : 'transparent', fontSize: '13px', fontWeight: active ? 600 : 400, color: active ? colorMap[s] : 'var(--text-secondary)' }}>
                <input type="radio" name="threshold" value={s} checked={active} onChange={() => setThreshold(s)} style={{ accentColor: colorMap[s] }} />
                {s}
              </label>
            );
          })}
        </div>
      </div>

      <Panel style={{ marginBottom: '16px' }}>
        <div>
          <ToggleRow label="Email Notifications" description="Send alerts to a configured email address." value={email} onChange={setEmail} />
          {email && (
            <div style={{ padding: '12px 0' }}>
              <label style={labelStyle}>Email Address</label>
              <input style={{ ...inputStyle, maxWidth: '360px' }} value={emailAddr} onChange={(e) => setEmailAddr(e.target.value)} />
            </div>
          )}

          <ToggleRow label="Slack Webhook" description="Post alerts to a Slack channel via webhook URL." value={slack} onChange={setSlack} />
          {slack && (
            <div style={{ padding: '12px 0' }}>
              <label style={labelStyle}>Webhook URL</label>
              <input style={{ ...inputStyle, maxWidth: '480px' }} placeholder="https://hooks.slack.com/services/..." value={slackUrl} onChange={(e) => setSlackUrl(e.target.value)} />
            </div>
          )}

          <ToggleRow label="PagerDuty" description="Trigger PagerDuty incidents for critical alerts." value={pagerduty} onChange={setPagerduty} />
          {pagerduty && (
            <div style={{ padding: '12px 0' }}>
              <label style={labelStyle}>Integration Key</label>
              <input style={{ ...inputStyle, maxWidth: '360px' }} placeholder="PagerDuty routing key" value={pdKey} onChange={(e) => setPdKey(e.target.value)} />
            </div>
          )}

          <ToggleRow label="In-App Notifications" description="Show notification toasts inside the platform." value={inApp} onChange={setInApp} />
        </div>
      </Panel>

      <SaveButton />
    </div>
  );
};

/* ─────────────────────────────────────────────
   Section: Data Retention
───────────────────────────────────────────── */
const RetentionSlider = ({ label, value, onChange, min = 7, max = 1095 }) => (
  <div style={{ marginBottom: '24px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
      <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</label>
      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-blue)' }}>{value} days</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: '100%', accentColor: 'var(--color-blue)', cursor: 'pointer' }}
    />
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
      <span>{min}d</span><span>{max}d</span>
    </div>
  </div>
);

const DataRetentionSection = () => {
  const [telemetry, setTelemetry] = useState(90);
  const [alerts, setAlerts] = useState(180);
  const [incidents, setIncidents] = useState(730);
  const [auditLogs, setAuditLogs] = useState(365);
  const [backups, setBackups] = useState(30);
  const [autoArchive, setAutoArchive] = useState(true);
  const [saved, setSaved] = useState(false);

  const apply = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <SectionHeader title="Data Retention" description="Define how long each data category is retained before automatic deletion." />

      <div style={{ backgroundColor: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '6px', padding: '12px 16px', marginBottom: '24px', color: 'var(--color-high)', fontSize: '13px' }}>
        ⚠ Changing retention policies will schedule deletion of data older than the new thresholds. Deleted data cannot be recovered.
      </div>

      <Panel>
        <div style={{ padding: '0' }}>
          <RetentionSlider label="Telemetry Events" value={telemetry} onChange={setTelemetry} />
          <RetentionSlider label="Alerts" value={alerts} onChange={setAlerts} max={730} />
          <RetentionSlider label="Incidents" value={incidents} onChange={setIncidents} max={1825} />
          <RetentionSlider label="Audit Logs" value={auditLogs} onChange={setAuditLogs} max={1825} />
          <RetentionSlider label="Backups" value={backups} onChange={setBackups} max={365} />
        </div>
      </Panel>

      <div style={{ height: '20px' }} />

      <ToggleRow
        label="Auto-Archive"
        description="Automatically archive data approaching the retention limit instead of deleting."
        value={autoArchive}
        onChange={setAutoArchive}
      />

      <div style={{ marginTop: '20px' }}>
        <button style={{ ...btnPrimary, backgroundColor: saved ? 'var(--color-low)' : 'var(--color-high)' }} onClick={apply}>
          {saved ? '✓ Policy Applied' : 'Apply Retention Policy'}
        </button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Section: Import / Export
───────────────────────────────────────────── */
const ImportExportSection = () => {
  const [exportFormat, setExportFormat] = useState('JSON');
  const [entities, setEntities] = useState({
    IOCs: true, 'Threat Actors': true, Campaigns: false, Malware: true,
    Assets: false, Incidents: true, 'YARA Rules': false, 'Hunt Sessions': false,
  });
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-07-05');
  const [dragOver, setDragOver] = useState(false);
  const [importFile, setImportFile] = useState(null);

  const toggleEntity = (k) => setEntities((e) => ({ ...e, [k]: !e[k] }));

  return (
    <div>
      <SectionHeader title="Import / Export" description="Transfer platform data in supported formats." />

      {/* Export */}
      <Panel title="Export Data" style={{ marginBottom: '20px' }}>
        <div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Export Format</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {['JSON', 'CSV', 'STIX 2.1'].map((f) => (
                <button
                  key={f}
                  style={{ ...btnSecondary, borderColor: exportFormat === f ? 'var(--color-blue)' : 'var(--border-color)', color: exportFormat === f ? 'var(--color-blue)' : 'var(--text-secondary)', backgroundColor: exportFormat === f ? 'var(--color-blue-bg)' : 'transparent', fontWeight: exportFormat === f ? 600 : 400 }}
                  onClick={() => setExportFormat(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Entity Types</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {Object.keys(entities).map((k) => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)', padding: '6px 10px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: entities[k] ? 'var(--color-blue-bg)' : 'transparent' }}>
                  <input type="checkbox" checked={entities[k]} onChange={() => toggleEntity(k)} style={{ accentColor: 'var(--color-blue)' }} />
                  {k}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>From Date</label>
              <input type="date" style={inputStyle} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>To Date</label>
              <input type="date" style={inputStyle} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>

          <button style={btnPrimary} className="btn-primary-hover">⬇ Export Data</button>
        </div>
      </Panel>

      {/* Import */}
      <Panel title="Import Data">
        <div>
          <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Supported formats: <strong style={{ color: 'var(--text-primary)' }}>MISP JSON</strong>, <strong style={{ color: 'var(--text-primary)' }}>OpenCTI JSON</strong>, <strong style={{ color: 'var(--text-primary)' }}>STIX 2.1</strong>, <strong style={{ color: 'var(--text-primary)' }}>ThreatStream CSV</strong>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setImportFile(f); }}
            style={{
              border: `2px dashed ${dragOver ? 'var(--color-blue)' : 'var(--border-color)'}`,
              borderRadius: '8px',
              padding: '40px',
              textAlign: 'center',
              backgroundColor: dragOver ? 'var(--color-blue-bg)' : 'var(--bg-secondary)',
              cursor: 'pointer',
              transition: 'all 200ms',
              marginBottom: '16px',
            }}
            onClick={() => document.getElementById('import-file-input').click()}
          >
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>📂</div>
            {importFile ? (
              <div style={{ color: 'var(--color-low)', fontWeight: 600 }}>
                {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
              </div>
            ) : (
              <>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Drag & drop a file here, or click to browse
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>JSON, CSV, STIX 2.1 supported</div>
              </>
            )}
            <input
              id="import-file-input"
              type="file"
              accept=".json,.csv,.xml,.stix"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files[0]; if (f) setImportFile(f); }}
            />
          </div>

          <button style={{ ...btnPrimary, opacity: importFile ? 1 : 0.5 }} disabled={!importFile}>
            ⬆ Import File
          </button>
          {importFile && (
            <button style={{ ...btnSecondary, marginLeft: '10px' }} onClick={() => setImportFile(null)}>Clear</button>
          )}
        </div>
      </Panel>
    </div>
  );
};

const LIVE_INTEGRATIONS = [
  {
    name: 'VirusTotal',
    category: 'Enrichment',
    icon: '🔬',
    description: 'File malware scanning and indicator enrichment.',
    requiredKeys: ['virustotal.api_key'],
  },
  {
    name: 'AbuseIPDB',
    category: 'Reputation',
    icon: '🛡️',
    description: 'IP reputation and abuse history lookups.',
    requiredKeys: ['abuseipdb.api_key'],
  },
  {
    name: 'GreyNoise',
    category: 'Reputation',
    icon: '🌐',
    description: 'Public IP noise classification.',
    requiredKeys: ['greynoise.api_key'],
  },
  {
    name: 'Shodan',
    category: 'Exposure',
    icon: '🔎',
    description: 'Host exposure and service discovery.',
    requiredKeys: ['shodan.api_key'],
  },
  {
    name: 'Censys',
    category: 'Exposure',
    icon: '🛰️',
    description: 'Internet asset and certificate lookups.',
    requiredKeys: ['censys.api_id', 'censys.api_secret'],
  },
  {
    name: 'AlienVault OTX',
    category: 'Threat Intel',
    icon: '📡',
    description: 'Pulse and IOC enrichment.',
    requiredKeys: ['otx.api_key'],
  },
  {
    name: 'Hybrid Analysis',
    category: 'Sandbox',
    icon: '🧪',
    description: 'Sample detonation and sandbox reports.',
    requiredKeys: ['hybridanalysis.api_key'],
  },
  {
    name: 'Any.Run',
    category: 'Sandbox',
    icon: '▶️',
    description: 'Interactive detonation and artifact review.',
    requiredKeys: ['anyrun.api_key'],
  },
  {
    name: 'MISP',
    category: 'Threat Intel',
    icon: '📚',
    description: 'IOC synchronization with your MISP instance.',
    requiredKeys: ['misp.url', 'misp.api_key'],
  },
  {
    name: 'OpenCTI',
    category: 'Threat Intel',
    icon: '🧬',
    description: 'Knowledge graph sync with OpenCTI.',
    requiredKeys: ['opencti.url', 'opencti.api_key'],
  },
];

/* ─────────────────────────────────────────────
   Section: Integrations
───────────────────────────────────────────── */
const IntegrationsSection = () => {
  const [credentials, setCredentials] = useState({});

  useEffect(() => {
    const repo = new ConfigurationRepository();
    const load = async () => {
      setCredentials(await repo.getSettings());
    };
    load();
  }, []);

  const integrations = LIVE_INTEGRATIONS.map((integration) => {
    const configured = integration.requiredKeys.every((key) => Boolean(credentials[`integrations.${key}`]));
    return {
      ...integration,
      status: configured ? 'configured' : 'needs setup',
    };
  });

  return (
    <div>
      <SectionHeader
        title="Integrations"
        description="Live provider readiness is driven by credentials saved in workspace settings."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {integrations.map((int) => (
          <div
            key={int.name}
            style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flex: 1 }}>
              <div style={{ fontSize: '28px', lineHeight: 1 }}>{int.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '2px' }}>{int.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-blue)', textTransform: 'uppercase', marginBottom: '4px' }}>{int.category}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{int.description}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase', backgroundColor: int.status === 'configured' ? 'var(--color-low-bg)' : 'var(--bg-secondary)', color: int.status === 'configured' ? 'var(--color-low)' : 'var(--text-muted)', border: `1px solid ${int.status === 'configured' ? 'var(--color-low-border)' : 'var(--border-color)'}` }}>
                {int.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Section: Appearance
───────────────────────────────────────────── */
const AppearanceSection = () => {
  const [density, setDensity] = useState('Comfortable');
  const [fontSize, setFontSize] = useState('13');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [animations, setAnimations] = useState(true);
  const [accentColor, setAccentColor] = useState('#2563eb');

  return (
    <div>
      <SectionHeader title="Appearance" description="Customize the platform's look and feel." />

      <div style={{ maxWidth: '600px' }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>UI Density</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['Compact', 'Comfortable', 'Spacious'].map((d) => (
              <button
                key={d}
                style={{ ...btnSecondary, borderColor: density === d ? 'var(--color-blue)' : 'var(--border-color)', color: density === d ? 'var(--color-blue)' : 'var(--text-secondary)', backgroundColor: density === d ? 'var(--color-blue-bg)' : 'transparent', fontWeight: density === d ? 600 : 400 }}
                onClick={() => setDensity(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Base Font Size (px)</label>
          <select style={{ ...inputStyle, maxWidth: '140px' }} value={fontSize} onChange={(e) => setFontSize(e.target.value)}>
            {['12', '13', '14', '15', '16'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Accent Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} style={{ width: '44px', height: '36px', border: '1px solid var(--border-color)', borderRadius: '5px', backgroundColor: 'transparent', cursor: 'pointer', padding: '2px' }} />
            <input style={{ ...inputStyle, maxWidth: '120px', fontFamily: 'monospace' }} value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
          </div>
        </div>

        <ToggleRow label="Sidebar Collapsed by Default" description="Start with the navigation sidebar in collapsed mode." value={sidebarCollapsed} onChange={setSidebarCollapsed} />
        <ToggleRow label="UI Animations" description="Enable smooth transitions and micro-animations." value={animations} onChange={setAnimations} />

        <div style={{ marginTop: '20px' }}>
          <SaveButton />
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Section: About
───────────────────────────────────────────── */
const CHANGELOG = [
  {
    version: 'v2.0.0', date: '2026-07-05', label: 'Current',
    notes: ['Threat Analysis Platform with YARA integration', 'IOC Enrichment pipeline', 'Graph Investigation view', 'Unified IOC Explorer with AI scoring'],
  },
  {
    version: 'v1.9.0', date: '2026-06-28', label: 'Previous',
    notes: ['Incident Response overhaul', 'Case Management with timelines', 'Forensics artifact viewer', 'Playbook automation engine'],
  },
  {
    version: 'v1.8.0', date: '2026-06-21', label: null,
    notes: ['Endpoint Telemetry dashboard', 'Detection Engineering workbench', 'Alert Lifecycle management', 'Sigma rule import'],
  },
];

const AboutSection = () => {
  const [checking, setChecking] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');

  const checkUpdates = () => {
    setChecking(true);
    setUpdateMsg('');
    setTimeout(() => {
      setChecking(false);
      setUpdateMsg('✓ v2.0.0 is the latest version.');
    }, 2000);
  };

  return (
    <div>
      <SectionHeader title="About ThreatStream" description="Platform information, license details, and release notes." />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', maxWidth: '820px', marginBottom: '28px' }}>
        {[
          { label: 'Platform', value: 'ThreatStream v2.0.0' },
          { label: 'Build', value: '20260705-prod' },
          { label: 'Database', value: 'PostgreSQL 15.4 (Supabase)' },
          { label: 'Uptime', value: '47 days, 3h 12m' },
          { label: 'License', value: 'Enterprise (expires 2027-07-01)' },
          { label: 'Support', value: 'security@threatstream.io' },
        ].map(({ label, value }) => (
          <div key={label} style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '14px 18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{label}</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', alignItems: 'center' }}>
        <a href="https://docs.threatstream.io" target="_blank" rel="noreferrer" style={{ ...btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          📖 Documentation
        </a>
        <button style={btnPrimary} className="btn-primary-hover" onClick={checkUpdates} disabled={checking}>
          {checking ? '⟳ Checking…' : '⟳ Check for Updates'}
        </button>
        {updateMsg && <span style={{ fontSize: '13px', color: 'var(--color-low)', fontWeight: 600 }}>{updateMsg}</span>}
      </div>

      {/* Changelog */}
      <div>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Release Notes</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {CHANGELOG.map((rel) => (
            <div key={rel.version} style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderLeft: `4px solid var(--color-blue)`, borderRadius: '6px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{rel.version}</span>
                  {rel.label && <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', backgroundColor: 'var(--color-blue-bg)', color: 'var(--color-blue)', border: '1px solid rgba(37,99,235,0.2)', textTransform: 'uppercase' }}>{rel.label}</span>}
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{rel.date}</span>
              </div>
              <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {rel.notes.map((n) => (
                  <li key={n} style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{n}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   NAV ITEMS
───────────────────────────────────────────── */
const NAV_ITEMS = [
  { key: 'general', label: 'General', icon: '⚙' },
  { key: 'security', label: 'Security', icon: '🔒' },
  { key: 'apikeys', label: 'Integration Credentials', icon: '🔑' },
  { key: 'notifications', label: 'Notifications', icon: '🔔' },
  { key: 'retention', label: 'Data Retention', icon: '🗄' },
  { key: 'importexport', label: 'Import / Export', icon: '↕' },
  { key: 'integrations', label: 'Integrations', icon: '🔗' },
  { key: 'appearance', label: 'Appearance', icon: '🎨' },
  { key: 'about', label: 'About', icon: 'ℹ' },
];

const SECTION_MAP = {
  general: <GeneralSection />,
  security: <SecuritySection />,
  apikeys: <ApiKeysSection />,
  notifications: <NotificationsSection />,
  retention: <DataRetentionSection />,
  importexport: <ImportExportSection />,
  integrations: <IntegrationsSection />,
  appearance: <AppearanceSection />,
  about: <AboutSection />,
};

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export const SystemSettings = () => {
  const [activeSection, setActiveSection] = useState('general');

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', height: '100%', minHeight: 0, gap: '0', overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <aside
          style={{
            width: '210px',
            flexShrink: 0,
            backgroundColor: 'var(--panel-bg)',
            borderRight: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            paddingTop: '8px',
            paddingBottom: '8px',
          }}
        >
          <div style={{ padding: '12px 16px 8px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Settings
          </div>
          {NAV_ITEMS.map(({ key, label, icon }) => {
            const active = activeSection === key;
            return (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 16px',
                  backgroundColor: active ? 'var(--color-blue-bg)' : 'transparent',
                  border: 'none',
                  borderLeft: `3px solid ${active ? 'var(--color-blue)' : 'transparent'}`,
                  color: active ? 'var(--color-blue)' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'all 150ms',
                }}
                className={active ? '' : 'sidebar-item-hover'}
              >
                <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{icon}</span>
                {label}
              </button>
            );
          })}
        </aside>

        {/* Main Content */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '28px 32px',
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          {SECTION_MAP[activeSection]}
        </main>
      </div>
    </DashboardLayout>
  );
};

export default SystemSettings;
