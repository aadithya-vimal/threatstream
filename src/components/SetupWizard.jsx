/**
 * src/components/SetupWizard.jsx
 * First-Time Operator and Organization Provisioning Setup Wizard
 */
import React, { useState } from 'react';
import Panel from './Panel';

export const SetupWizard = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    orgName: 'Cyberdyne Systems Corp',
    socName: 'Global Threat Operations Center',
    adminName: '',
    adminRole: 'Platform Director',
    timezone: 'UTC',
    defaultRegion: 'us-east-1',
    feedsEnabled: ['AbuseIPDB', 'CISA Feed'],
    storageRetentionDays: '90',
    evidenceBucketQuota: '10' // in GB
  });

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const handleCheckboxChange = (feed) => {
    setFormData(prev => {
      const feeds = prev.feedsEnabled.includes(feed)
        ? prev.feedsEnabled.filter(f => f !== feed)
        : [...prev.feedsEnabled, feed];
      return { ...prev, feedsEnabled: feeds };
    });
  };

  const handleFinish = () => {
    // Collect all configurations and triggers setup_completed in parent/service
    onComplete(formData);
  };

  const totalSteps = 7;
  const progressPercent = Math.round((step / totalSteps) * 100);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--bg-primary)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      overflowY: 'auto'
    }}>
      <div style={{ width: '100%', maxWidth: '580px' }}>
        <Panel title={`ThreatStream Platform Seeding Wizard (Step ${step} of ${totalSteps})`}>
          
          {/* Progress bar */}
          <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-primary)', borderRadius: '2px', overflow: 'hidden', marginBottom: '24px' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: 'var(--color-blue)', transition: 'width 0.3s ease' }} />
          </div>

          <div style={{ minHeight: '260px', marginBottom: '24px' }}>
            {/* Step 1: Org Info */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Establish Validation Workspace</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Identify your organization and primary workspace for tracking exposure reviews, evidence, and workflow state.</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Organization Name</label>
                  <input
                    type="text"
                    value={formData.orgName}
                    onChange={e => setFormData({ ...formData, orgName: e.target.value })}
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', padding: '10px', fontSize: '13px', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Operations Center Name</label>
                  <input
                    type="text"
                    value={formData.socName}
                    onChange={e => setFormData({ ...formData, socName: e.target.value })}
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', padding: '10px', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Admin Profile */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Workspace Owner Profile</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Assign the initial operator profile who will manage the workspace.</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Operator Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g., Sarah Connor"
                    value={formData.adminName}
                    onChange={e => setFormData({ ...formData, adminName: e.target.value })}
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', padding: '10px', fontSize: '13px', outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Designation Role</label>
                  <input
                    type="text"
                    value={formData.adminRole}
                    onChange={e => setFormData({ ...formData, adminRole: e.target.value })}
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', padding: '10px', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Timezone */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>System Default Timezone</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Standardize timestamps for alerts, evidence, and reports.</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Preferred Timezone</label>
                  <select
                    value={formData.timezone}
                    onChange={e => setFormData({ ...formData, timezone: e.target.value })}
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', padding: '10px', fontSize: '13px', outline: 'none' }}
                  >
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                    <option value="EST">EST (Eastern Standard Time)</option>
                    <option value="GMT">GMT (Greenwich Mean Time)</option>
                    <option value="IST">IST (Indian Standard Time)</option>
                    <option value="SGT">SGT (Singapore Standard Time)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 4: Default Region */}
            {step === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Default Infrastructure Region</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Set the default region for inventory and telemetry grouping.</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Deployment Region</label>
                  <select
                    value={formData.defaultRegion}
                    onChange={e => setFormData({ ...formData, defaultRegion: e.target.value })}
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', padding: '10px', fontSize: '13px', outline: 'none' }}
                  >
                    <option value="us-east-1">US East (N. Virginia)</option>
                    <option value="eu-central-1">EU Central (Frankfurt)</option>
                    <option value="ap-south-1">AP South (Mumbai)</option>
                    <option value="ap-southeast-1">AP Southeast (Singapore)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 5: Threat Intel Preferences */}
            {step === 5 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Threat Intelligence Feeds</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Select default feeds to enrich indicators and context records.</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {['AbuseIPDB', 'CISA Feed', 'VirusTotal Pulses', 'GreyNoise Analytics'].map(feed => (
                    <label key={feed} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.feedsEnabled.includes(feed)}
                        onChange={() => handleCheckboxChange(feed)}
                      />
                      {feed}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Step 6: Storage Configuration */}
            {step === 6 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Log Retention & Storage</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Define retention for evidence, telemetry, and analysis artifacts.</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Telemetry Logs Retention (Days)</label>
                  <select
                    value={formData.storageRetentionDays}
                    onChange={e => setFormData({ ...formData, storageRetentionDays: e.target.value })}
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', padding: '10px', fontSize: '13px', outline: 'none' }}
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
                    value={formData.evidenceBucketQuota}
                    onChange={e => setFormData({ ...formData, evidenceBucketQuota: e.target.value })}
                    style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', padding: '10px', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              </div>
            )}

            {/* Step 7: Finish */}
            {step === 7 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center', padding: '12px 0' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-low)',
                  fontSize: '24px',
                  fontWeight: 'bold'
                }}>
                  ✓
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Provisioning Complete</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '400px' }}>
                  ThreatStream has been configured successfully. We will write these settings to the database and initialize the validation workspace.
                </span>
                
                <div style={{
                  width: '100%',
                  textAlign: 'left',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: 'var(--text-muted)',
                  marginTop: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div>Operations Center: {formData.socName}</div>
                  <div>Operator: {formData.adminName} ({formData.adminRole})</div>
                  <div>Timezone: {formData.timezone} • Region: {formData.defaultRegion}</div>
                  <div>Feeds: {formData.feedsEnabled.join(', ')}</div>
                  <div>Retention: {formData.storageRetentionDays} Days • Storage: {formData.evidenceBucketQuota} GB</div>
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            {step > 1 ? (
              <button
                onClick={prevStep}
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
                Back
              </button>
            ) : <div />}

            {step < totalSteps ? (
              <button
                onClick={nextStep}
                disabled={step === 2 && !formData.adminName.trim()}
                style={{
                  backgroundColor: 'var(--color-blue)',
                  border: 'none',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: (step === 2 && !formData.adminName.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (step === 2 && !formData.adminName.trim()) ? 0.5 : 1
                }}
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={handleFinish}
                style={{
                  backgroundColor: 'var(--color-low)',
                  border: 'none',
                  color: '#fff',
                  padding: '8px 20px',
                  borderRadius: '4px',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Complete Initialization
              </button>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default SetupWizard;
