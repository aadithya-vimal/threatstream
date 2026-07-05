/**
 * src/components/ProtectedRoute.jsx
 * Secure Authentication Gate and Role-Based Access Control Middleware
 */
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingState from './LoadingState';
import Panel from './Panel';

export const ProtectedRoute = ({ children, requiredPermission }) => {
  const { user, role, loading, login, hasPermission } = useAuth();
  const [email, setEmail] = useState('analyst@threatstream.io');
  const [password, setPassword] = useState('password123');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)'
      }}>
        <LoadingState message="Authenticating SOC security session..." />
      </div>
    );
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setErrorMsg(err.message || 'Invalid operator credentials. Access denied.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        padding: '20px'
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <Panel title="ThreatStream Portal Access Gate">
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Secure on-premises sign-in. Enter your SOC credential token to access ThreatStream dashboards.
              </span>

              {errorMsg && (
                <div style={{
                  padding: '10px 12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid var(--color-critical)',
                  borderRadius: '4px',
                  color: 'var(--color-critical)',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  {errorMsg}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Operator Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@threatstream.io"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    padding: '10px 12px',
                    fontSize: '13px',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Password Token</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    padding: '10px 12px',
                    fontSize: '13px',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  backgroundColor: 'var(--color-blue)',
                  border: 'none',
                  color: '#fff',
                  padding: '10px',
                  borderRadius: '4px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  marginTop: '6px'
                }}
              >
                {isSubmitting ? 'Authenticating...' : 'Sign In to Portal'}
              </button>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Demo Accounts:
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  • Administrator: <code>admin@threatstream.io</code> / <code>password123</code>
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  • SOC Analyst: <code>analyst@threatstream.io</code> / <code>password123</code>
                </span>
              </div>
            </form>
          </Panel>
        </div>
      </div>
    );
  }

  // Enforce granular RBAC permission codes
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        padding: '20px'
      }}>
        <div style={{ width: '100%', maxWidth: '460px' }}>
          <Panel title="403 Unauthorized Access">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0', alignItems: 'center', textAlign: 'center' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-critical)',
                fontSize: '24px',
                fontWeight: 'bold'
              }}>
                !
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Role Level Restriction Active</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Your assigned role (<strong>{role}</strong>) does not hold the required token permissions (<code>{requiredPermission}</code>) to view this module. Contact your Global SOC Administrator.
                </span>
              </div>
              <button
                onClick={() => window.location.href = '/dashboard'}
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
                Return to Dashboard
              </button>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
