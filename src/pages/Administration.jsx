/**
 * src/pages/Administration.jsx
 * Enterprise SOC Administration and Systems Configuration Panel - User Directory
 */
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import SectionHeader from '../components/SectionHeader';
import Panel from '../components/Panel';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import { ConfigurationService } from '../services/ConfigurationService';
import { UserService } from '../services/UserService';
import { Icon } from '../components/Icons';

const configService = new ConfigurationService();
const userService = new UserService();

export const Administration = () => {
  const [activeTab, setActiveTab] = useState('org'); // org, users, settings, deployment
  const [settings, setSettings] = useState({
    organization_name: 'Cyberdyne Systems Corp',
    soc_name: 'Global Threat Operations Center',
    admin_profile_name: 'Sarah Connor',
    admin_profile_role: 'SOC Director',
    default_timezone: 'UTC',
    default_region: 'us-east-1',
    storage_retention_days: '90',
    evidence_quota_gb: '10',
    feeds_list: '["AbuseIPDB", "CISA Feed"]',
    license_key: 'TS-ENTERPRISE-PRO-9981-2026',
    language: 'English (US)',
    company_logo_url: '',
    support_link: 'https://support.threatstream.io'
  });
  
  // Users state
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'SOC Analyst' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const sourceLabel = 'Live data from Supabase system_settings and users tables';

  useEffect(() => {
    const loadSystemData = async () => {
      try {
        const fetchedSettings = await configService.getSettings();
        if (fetchedSettings && Object.keys(fetchedSettings).length > 0) {
          setSettings(prev => ({ ...prev, ...fetchedSettings }));
        }

        const fetchedUsers = await userService.getUsers();
        setUsers(fetchedUsers);
      } catch (err) {
        console.error('Failed to load administrative configurations:', err);
      }
    };
    loadSystemData();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSaveSuccess(false);
    try {
      await Promise.all(
        Object.entries(settings).map(([key, val]) => configService.updateSetting(key, val))
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) return;

    try {
      const newUser = await userService.inviteUser(inviteForm.name, inviteForm.email, inviteForm.role);
      setUsers(prev => [newUser, ...prev]);
      setInviteForm({ name: '', email: '', role: 'SOC Analyst' });
      setIsInviteOpen(false);
    } catch (err) {
      console.error('Failed to invite user:', err);
    }
  };

  const handleDeactivateUser = async (email) => {
    try {
      const updated = await userService.deactivateUser(email);
      setUsers(prev => prev.map(u => u.email === email ? updated : u));
    } catch (err) {
      console.error('Failed to deactivate user:', err);
    }
  };

  const handleDeleteUser = async (email) => {
    try {
      await userService.deleteUser(email);
      setUsers(prev => prev.filter(u => u.email !== email));
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  // Filter users based on query and role selector
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    return matchesSearch && matchesRole;
  });

  const tabStyle = (tabId) => ({
    padding: '10px 16px',
    backgroundColor: activeTab === tabId ? 'var(--panel-bg)' : 'transparent',
    border: '1px solid',
    borderColor: activeTab === tabId ? 'var(--border-color) var(--border-color) transparent var(--border-color)' : 'transparent',
    color: activeTab === tabId ? 'var(--color-blue)' : 'var(--text-secondary)',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
    borderRadius: '4px 4px 0 0',
    marginBottom: '-1px'
  });

  const configInputStyle = {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    padding: '8px 12px',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  };

  return (
    <DashboardLayout>
      <SectionHeader 
        title="SOC Portal Administration" 
        description="Provision organization profiles, manage operator directories, configure global retention/storage policies, and review Docker specifications."
      />

      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-blue)' }}>{sourceLabel}</span>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Organization settings and user records are loaded from live backend state
        </span>
      </div>

      {/* Navigation tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '4px', marginBottom: '20px', overflowX: 'auto' }}>
        <button style={tabStyle('org')} onClick={() => setActiveTab('org')}>Organization Profile</button>
        <button style={tabStyle('users')} onClick={() => setActiveTab('users')}>Identity & Access</button>
        <button style={tabStyle('settings')} onClick={() => setActiveTab('settings')}>System Settings</button>
        <button style={tabStyle('deployment')} onClick={() => setActiveTab('deployment')}>Self-Hosted Deployment</button>
      </div>

      {saveSuccess && (
        <div style={{
          padding: '10px 14px',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid var(--color-low)',
          borderRadius: '4px',
          color: 'var(--color-low)',
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '20px'
        }}>
          Configurations persisted successfully to system_settings registry.
        </div>
      )}

      {/* 1. ORGANIZATION PROFILE TAB */}
      {activeTab === 'org' && (
        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <Panel title="Organization Branding and License Details">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Organization Name</label>
                <input
                  type="text"
                  value={settings.organization_name}
                  onChange={e => setSettings({ ...settings, organization_name: e.target.value })}
                  style={configInputStyle}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>SOC Name</label>
                <input
                  type="text"
                  value={settings.soc_name}
                  onChange={e => setSettings({ ...settings, soc_name: e.target.value })}
                  style={configInputStyle}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Company Logo URL</label>
                <input
                  type="text"
                  value={settings.company_logo_url}
                  onChange={e => setSettings({ ...settings, company_logo_url: e.target.value })}
                  style={configInputStyle}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>License Token Key</label>
                <input
                  type="text"
                  readOnly
                  value={settings.license_key}
                  style={{ ...configInputStyle, opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>ThreatStream Version</label>
                <input
                  type="text"
                  readOnly
                  value="v2.4.0 (Enterprise)"
                  style={{ ...configInputStyle, opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Technical Support Desk</label>
                <input
                  type="text"
                  value={settings.support_link}
                  onChange={e => setSettings({ ...settings, support_link: e.target.value })}
                  style={configInputStyle}
                />
              </div>
            </div>
            
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  backgroundColor: 'var(--color-blue)',
                  border: 'none',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {isSubmitting ? 'Saving...' : 'Save Profile Configs'}
              </button>
            </div>
          </Panel>
        </form>
      )}

      {/* 2. IDENTITY & ACCESS TAB */}
      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* User management */}
          <Panel 
            title="Authorized Security Operations Personnel"
            actions={
              <button
                onClick={() => setIsInviteOpen(true)}
                style={{
                  backgroundColor: 'var(--color-blue)',
                  border: 'none',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Invite SOC Operator
              </button>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Search and Filters */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                  <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search operators by name or email..." />
                </div>
                <div style={{ width: '180px' }}>
                  <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      fontSize: '13px',
                      outline: 'none',
                      height: '100%'
                    }}
                  >
                    <option value="">All Roles</option>
                    <option value="Administrator">Administrator</option>
                    <option value="SOC Analyst">SOC Analyst</option>
                    <option value="Incident Responder">Incident Responder</option>
                    <option value="Threat Hunter">Threat Hunter</option>
                    <option value="Read Only">Read Only</option>
                  </select>
                </div>
              </div>

              {/* Users Directory Table */}
              <DataTable 
                columns={[
                  { header: 'Full Name', accessor: 'name', renderCell: (val) => <span style={{ fontWeight: 600 }}>{val}</span> },
                  { header: 'Email Address', accessor: 'email', renderCell: (val) => <span style={{ fontFamily: 'monospace' }}>{val}</span> },
                  { header: 'Assigned Role', accessor: 'role' },
                  {
                    header: 'MFA Status',
                    accessor: 'mfa',
                    renderCell: (val) => <StatusBadge status={val ? 'low' : 'muted'} text={val ? 'ENABLED' : 'INACTIVE'} />
                  },
                  {
                    header: 'Account Status',
                    accessor: 'status',
                    renderCell: (val) => <StatusBadge status={val === 'Active' ? 'low' : 'critical'} text={val} />
                  },
                  { header: 'Last Login', accessor: 'lastLogin' },
                  {
                    header: 'Actions',
                    accessor: 'email',
                    renderCell: (val, row) => (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => handleDeactivateUser(val)}
                          disabled={row.status === 'Suspended'}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: row.status === 'Suspended' ? 'var(--text-muted)' : 'var(--color-high)',
                            fontWeight: 600,
                            fontSize: '11px',
                            cursor: row.status === 'Suspended' ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Suspend
                        </button>
                        <button
                          onClick={() => handleDeleteUser(val)}
                          style={{ background: 'none', border: 'none', color: 'var(--color-critical)', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}
                        >
                          Revoke
                        </button>
                      </div>
                    )
                  }
                ]} 
                data={filteredUsers} 
              />
            </div>
          </Panel>

          {/* Invitation modal overlay */}
          {isInviteOpen && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              zIndex: 110,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}>
              <div style={{ width: '100%', maxWidth: '440px' }}>
                <Panel title="Invite New System Operator">
                  <form onSubmit={handleInviteUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={inviteForm.name}
                        onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                        style={configInputStyle}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="jdoe@company.com"
                        value={inviteForm.email}
                        onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                        style={configInputStyle}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Role Level Permission</label>
                      <select
                        value={inviteForm.role}
                        onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                        style={configInputStyle}
                      >
                        <option value="Administrator">Administrator</option>
                        <option value="SOC Analyst">SOC Analyst</option>
                        <option value="Incident Responder">Incident Responder</option>
                        <option value="Threat Hunter">Threat Hunter</option>
                        <option value="Read Only">Read Only</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setIsInviteOpen(false)}
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                          padding: '8px 16px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{
                          backgroundColor: 'var(--color-blue)',
                          border: 'none',
                          color: '#fff',
                          padding: '8px 16px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        Send Invite
                      </button>
                    </div>
                  </form>
                </Panel>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. SYSTEM SETTINGS TAB */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            
            {/* Storage and Retention settings */}
            <Panel title="Log Retention & Storage Buckets">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Log Retention Prune Threshold (Days)</label>
                  <select
                    value={settings.storage_retention_days}
                    onChange={e => setSettings({ ...settings, storage_retention_days: e.target.value })}
                    style={configInputStyle}
                  >
                    <option value="30">30 Days</option>
                    <option value="90">90 Days</option>
                    <option value="180">180 Days</option>
                    <option value="365">365 Days (1 Year)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Evidence File Vault Allocation Quota (GB)</label>
                  <input
                    type="number"
                    value={settings.evidence_quota_gb}
                    onChange={e => setSettings({ ...settings, evidence_quota_gb: e.target.value })}
                    style={configInputStyle}
                  />
                </div>
              </div>
            </Panel>

            {/* General Preferences */}
            <Panel title="General Locale Preferences">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Default Timezone</label>
                  <select
                    value={settings.default_timezone}
                    onChange={e => setSettings({ ...settings, default_timezone: e.target.value })}
                    style={configInputStyle}
                  >
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                    <option value="EST">EST (Eastern Standard Time)</option>
                    <option value="GMT">GMT (Greenwich Mean Time)</option>
                    <option value="IST">IST (Indian Standard Time)</option>
                    <option value="SGT">SGT (Singapore Standard Time)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Default Region</label>
                  <select
                    value={settings.default_region}
                    onChange={e => setSettings({ ...settings, default_region: e.target.value })}
                    style={configInputStyle}
                  >
                    <option value="us-east-1">US East (N. Virginia)</option>
                    <option value="eu-central-1">EU Central (Frankfurt)</option>
                    <option value="ap-south-1">AP South (Mumbai)</option>
                    <option value="ap-southeast-1">AP Southeast (Singapore)</option>
                  </select>
                </div>
              </div>
            </Panel>

            {/* Security settings */}
            <Panel title="Portal Console Security Gate">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Force MFA Enrolment:</span>
                  <StatusBadge status="muted" text="RECOMMENDED" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Restrict Logins by IP range:</span>
                  <StatusBadge status="muted" text="INACTIVE" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Automatic Console Timeout:</span>
                  <span>15 Mins</span>
                </div>
              </div>
            </Panel>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                backgroundColor: 'var(--color-blue)',
                border: 'none',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: '4px',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {isSubmitting ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}

      {/* 4. SELF-HOSTED DEPLOYMENT TAB */}
      {activeTab === 'deployment' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)', gap: '24px' }}>
          <Panel title="Docker Compose Spec">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Deploy ThreatStream locally using standard self-hosted containers.
              </span>
              <pre style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: '11px',
                padding: '12px',
                overflowX: 'auto',
                lineHeight: '1.4',
                maxHeight: '380px'
              }}>
{`version: '3.8'

services:
  # Web API & WebSocket Server
  api:
    image: threatstream/api:latest
    build: ./api
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://threat_user:ts_pass@postgres:5432/threatstream
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis

  # State Cache Broker
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # Core Relational Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: threat_user
      POSTGRES_PASSWORD: ts_pass
      POSTGRES_DB: threatstream
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  pgdata:`}
              </pre>
            </div>
          </Panel>

          <Panel title="Deployment Guidelines">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>1. Local Configuration</strong>
                <span>Configure connection details for PostgreSQL and Redis. Connect feed collectors to Supabase using <code>.env.local</code>.</span>
              </div>
              
              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>2. Initialize Database Schema</strong>
                <span>Run the migrations head scripts via Supabase SQL Console using:</span>
                <pre style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', padding: '6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-blue)', marginTop: '4px' }}>
                  supabase migration up
                </pre>
              </div>

              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>3. Boundary Protections</strong>
                <span>Bind the API servers behind SSL reverse proxies and isolate container ports from external networks.</span>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Administration;
