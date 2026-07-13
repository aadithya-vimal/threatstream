import React, { useState } from 'react';
import { Panel } from '../components/Panel';
import { SectionHeader } from '../components/SectionHeader';
import { StatusBadge } from '../components/StatusBadge';
import DashboardLayout from '../layouts/DashboardLayout';
import { Icon } from '../components/Icons';

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

/* ─────────────────────────────────────────────
   Section: API Keys
───────────────────────────────────────────── */
const ALL_SCOPES = [
  'read:intel', 'write:intel', 'read:incidents', 'write:incidents',
  'read:assets', 'manage:users', 'read:telemetry', 'manage:connectors',
];

const MOCK_KEYS = [
  {
    id: 1, name: 'Automation', prefix: 'ts_live_ab12',
    scopes: ALL_SCOPES, created: '2026-06-01', lastUsed: '2026-07-05', expires: '2027-06-01', status: 'active',
  },
  {
    id: 2, name: 'SIEM Integration', prefix: 'ts_live_cd34',
    scopes: ['read:intel', 'read:incidents', 'read:assets', 'read:telemetry'],
    created: '2026-05-15', lastUsed: '2026-07-04', expires: '2027-05-15', status: 'active',
  },
  {
    id: 3, name: 'Reporting Bot', prefix: 'ts_live_ef56',
    scopes: ['read:incidents'],
    created: '2026-04-01', lastUsed: '2026-07-03', expires: '2026-07-20', status: 'active',
  },
  {
    id: 4, name: 'Deprecated Key', prefix: 'ts_live_gh78',
    scopes: ['read:intel'],
    created: '2026-01-01', lastUsed: '2026-03-12', expires: '—', status: 'revoked',
  },
];

const ApiKeysSection = () => {
  const [keys, setKeys] = useState(MOCK_KEYS);
  const [showModal, setShowModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(null);
  const [newKey, setNewKey] = useState({ name: '', scopes: [], expiry: '1 year' });
  const [copied, setCopied] = useState(false);

  const toggleScope = (scope) => {
    setNewKey((k) => ({
      ...k,
      scopes: k.scopes.includes(scope) ? k.scopes.filter((s) => s !== scope) : [...k.scopes, scope],
    }));
  };

  const createKey = () => {
    if (!newKey.name.trim()) return;
    const prefix = 'ts_live_' + Math.random().toString(36).substring(2, 6);
    const fullKey = prefix + '_' + Math.random().toString(36).substring(2, 18);
    const entry = {
      id: Date.now(), name: newKey.name, prefix,
      scopes: newKey.scopes, created: '2026-07-05',
      lastUsed: '—', expires: newKey.expiry, status: 'active',
    };
    setKeys((k) => [entry, ...k]);
    setShowModal(false);
    setShowCopyModal({ ...entry, fullKey });
    setNewKey({ name: '', scopes: [], expiry: '1 year' });
  };

  const revokeKey = (id) =>
    setKeys((ks) => ks.map((k) => (k.id === id ? { ...k, status: 'revoked' } : k)));

  const statusColor = (s) =>
    s === 'active' ? 'var(--color-low)' : 'var(--color-critical)';

  const isExpiringSoon = (exp) => {
    if (exp === '—' || !exp.includes('-')) return false;
    return (new Date(exp) - new Date()) / 86400000 < 30;
  };

  return (
    <div>
      <SectionHeader
        title="API Keys"
        description="Manage API credentials and access scopes."
        actions={
          <button style={btnPrimary} className="btn-primary-hover" onClick={() => setShowModal(true)}>
            + Create New API Key
          </button>
        }
      />

      {/* Keys Table */}
      <div style={{ overflowX: 'auto', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--panel-bg)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              {['Name', 'Prefix', 'Scopes', 'Created', 'Last Used', 'Expires', 'Status', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em', whiteSpace: 'nowrap', textAlign: 'left' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.map((key, idx) => (
              <tr key={key.id} className="table-row-hover" style={{ borderBottom: idx === keys.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 14px', color: 'var(--text-primary)', fontWeight: 600 }}>{key.name}</td>
                <td style={{ padding: '12px 14px' }}>
                  <code style={{ fontSize: '12px', color: 'var(--color-blue)', backgroundColor: 'var(--color-blue-bg)', padding: '2px 6px', borderRadius: '4px' }}>
                    {key.prefix}
                  </code>
                </td>
                <td style={{ padding: '12px 14px', maxWidth: '200px' }}>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {key.scopes.slice(0, 3).map((s) => (
                      <span key={s} style={{ fontSize: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '3px', padding: '1px 5px', color: 'var(--text-secondary)' }}>
                        {s}
                      </span>
                    ))}
                    {key.scopes.length > 3 && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>+{key.scopes.length - 3}</span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{key.created}</td>
                <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{key.lastUsed}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ color: isExpiringSoon(key.expires) ? 'var(--color-high)' : 'var(--text-secondary)' }}>
                    {key.expires}
                  </span>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', backgroundColor: key.status === 'active' ? 'var(--color-low-bg)' : 'var(--color-critical-bg)', color: statusColor(key.status), border: `1px solid ${key.status === 'active' ? 'var(--color-low-border)' : 'var(--color-critical-border)'}`, textTransform: 'uppercase' }}>
                    {key.status}
                  </span>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {key.status === 'active' && (
                      <button
                        style={{ ...btnSecondary, padding: '4px 10px', fontSize: '12px', color: 'var(--color-critical)', borderColor: 'var(--color-critical-border)' }}
                        onClick={() => revokeKey(key.id)}
                      >
                        Revoke
                      </button>
                    )}
                    <button
                      style={{ ...btnSecondary, padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => { navigator.clipboard?.writeText(key.prefix); }}
                    >
                      Copy
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Key Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '28px', width: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Create New API Key</h3>

            <div style={fieldStyle}>
              <label style={labelStyle}>Key Name</label>
              <input style={inputStyle} placeholder="e.g. SIEM Integration" value={newKey.name} onChange={(e) => setNewKey((k) => ({ ...k, name: e.target.value }))} />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Expiry</label>
              <select style={inputStyle} value={newKey.expiry} onChange={(e) => setNewKey((k) => ({ ...k, expiry: e.target.value }))}>
                {['30 days', '90 days', '1 year', 'Never'].map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Scopes</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {ALL_SCOPES.map((scope) => (
                  <label key={scope} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)', padding: '6px 10px', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: newKey.scopes.includes(scope) ? 'var(--color-blue-bg)' : 'transparent' }}>
                    <input type="checkbox" checked={newKey.scopes.includes(scope)} onChange={() => toggleScope(scope)} style={{ accentColor: 'var(--color-blue)' }} />
                    <code style={{ fontSize: '12px' }}>{scope}</code>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button style={btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
              <button style={btnPrimary} className="btn-primary-hover" onClick={createKey}>Create Key</button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Key Modal */}
      {showCopyModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '28px', width: '480px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>API Key Created</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-high)', marginBottom: '16px' }}>
              ⚠ Copy this key now. It will not be shown again.
            </p>
            <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '5px', padding: '12px', fontFamily: 'monospace', fontSize: '13px', color: 'var(--color-low)', wordBreak: 'break-all', marginBottom: '16px' }}>
              {showCopyModal.fullKey}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                style={btnSecondary}
                onClick={() => { navigator.clipboard?.writeText(showCopyModal.fullKey); setCopied(true); }}
              >
                {copied ? '✓ Copied!' : 'Copy to Clipboard'}
              </button>
              <button style={btnPrimary} className="btn-primary-hover" onClick={() => { setShowCopyModal(null); setCopied(false); }}>Done</button>
            </div>
          </div>
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

/* ─────────────────────────────────────────────
   Section: Integrations
───────────────────────────────────────────── */
const INTEGRATIONS = [
  { name: 'Splunk SIEM', category: 'SIEM', status: 'connected', icon: '🔗', description: 'Forward alerts and events to Splunk Enterprise.' },
  { name: 'Microsoft Sentinel', category: 'SIEM', status: 'disconnected', icon: '🔗', description: 'Push incidents and IOCs to Microsoft Sentinel.' },
  { name: 'CrowdStrike Falcon', category: 'EDR', status: 'connected', icon: '🦅', description: 'Receive endpoint telemetry and detections.' },
  { name: 'VirusTotal', category: 'Enrichment', status: 'connected', icon: '🔬', description: 'Enrich file hashes, URLs, and IPs automatically.' },
  { name: 'MISP', category: 'Threat Intel', status: 'connected', icon: '📡', description: 'Bi-directional IOC sync with MISP instances.' },
  { name: 'TheHive', category: 'SOAR', status: 'disconnected', icon: '🐝', description: 'Push cases and alerts to TheHive platform.' },
  { name: 'Jira', category: 'Ticketing', status: 'disconnected', icon: '📋', description: 'Create Jira tickets from ThreatStream incidents.' },
  { name: 'Slack', category: 'Comms', status: 'connected', icon: '💬', description: 'Send real-time notifications to Slack channels.' },
];

const IntegrationsSection = () => {
  const [integrations, setIntegrations] = useState(INTEGRATIONS);

  const toggle = (name) =>
    setIntegrations((ints) =>
      ints.map((i) =>
        i.name === name
          ? { ...i, status: i.status === 'connected' ? 'disconnected' : 'connected' }
          : i
      )
    );

  return (
    <div>
      <SectionHeader title="Integrations" description="Connect ThreatStream with your existing security stack." />
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
              <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase', backgroundColor: int.status === 'connected' ? 'var(--color-low-bg)' : 'var(--bg-secondary)', color: int.status === 'connected' ? 'var(--color-low)' : 'var(--text-muted)', border: `1px solid ${int.status === 'connected' ? 'var(--color-low-border)' : 'var(--border-color)'}` }}>
                {int.status}
              </span>
              <button
                style={{ ...btnSecondary, fontSize: '12px', padding: '4px 10px', color: int.status === 'connected' ? 'var(--color-critical)' : 'var(--color-blue)', borderColor: int.status === 'connected' ? 'var(--color-critical-border)' : 'var(--color-blue)' }}
                onClick={() => toggle(int.name)}
              >
                {int.status === 'connected' ? 'Disconnect' : 'Connect'}
              </button>
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
  { key: 'apikeys', label: 'API Keys', icon: '🔑' },
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
