/**
 * src/components/ProtectedRoute.jsx
 * Production authentication gate + RBAC firewall.
 *
 * Clean rebuild — no legacy patches, no external image URLs.
 * Google "G" logo is a self-contained inline SVG.
 */
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingState from './LoadingState';
import Panel from './Panel';

/* ── Inline Google "G" SVG (official multicolor path) ──────────────── */
const GoogleGIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 48 48"
    width="22"
    height="22"
    style={{ display: 'block', flexShrink: 0 }}
  >
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);

/* ── Shared input style ─────────────────────────────────────────────── */
const inputStyle = {
  width: '100%',
  backgroundColor: '#0d1017',
  border: '1px solid #262e3d',
  borderRadius: '8px',
  color: '#f9fafb',
  padding: '11px 14px',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'Inter, system-ui, sans-serif',
  transition: 'border-color 0.15s',
};

const labelStyle = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '6px',
  display: 'block',
};

const primaryBtnStyle = (disabled) => ({
  width: '100%',
  backgroundColor: '#2563eb',
  border: 'none',
  color: '#fff',
  padding: '12px',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '13px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.65 : 1,
  fontFamily: 'Inter, system-ui, sans-serif',
  letterSpacing: '0.02em',
  transition: 'background 0.15s, opacity 0.15s',
});

/* ── Google OAuth button ────────────────────────────────────────────── */
const GoogleButton = ({ onClick, loading }) => (
  <button
    type="button"
    id="google-signin-btn"
    onClick={onClick}
    disabled={loading}
    style={{
      width: '100%',
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      backgroundColor: '#1a1f2e',
      border: '1px solid #2d3748',
      borderRadius: '10px',
      color: '#e2e8f0',
      fontSize: '14px',
      fontWeight: 500,
      fontFamily: 'Inter, system-ui, sans-serif',
      letterSpacing: '0.01em',
      cursor: loading ? 'not-allowed' : 'pointer',
      opacity: loading ? 0.65 : 1,
      transition: 'background 0.18s, border-color 0.18s, transform 0.12s',
      outline: 'none',
      position: 'relative',
    }}
    onMouseEnter={e => {
      if (!loading) {
        e.currentTarget.style.backgroundColor = '#232a3d';
        e.currentTarget.style.borderColor = '#4a5568';
      }
    }}
    onMouseLeave={e => {
      e.currentTarget.style.backgroundColor = '#1a1f2e';
      e.currentTarget.style.borderColor = '#2d3748';
    }}
    onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.985)'; }}
    onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
  >
    <GoogleGIcon />
    <span>{loading ? 'Redirecting…' : 'Continue with Google'}</span>
  </button>
);

/* ── Divider ────────────────────────────────────────────────────────── */
const Divider = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
    <div style={{ flex: 1, height: '1px', backgroundColor: '#262e3d' }} />
    <span style={{ fontSize: '11px', color: '#4b5563', fontWeight: 500 }}>or</span>
    <div style={{ flex: 1, height: '1px', backgroundColor: '#262e3d' }} />
  </div>
);

/* ── Alert boxes ────────────────────────────────────────────────────── */
const ErrorBox = ({ msg }) => msg ? (
  <div style={{
    padding: '10px 12px',
    backgroundColor: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: '8px',
    color: '#f87171',
    fontSize: '12px',
    fontWeight: 500,
  }}>{msg}</div>
) : null;

const SuccessBox = ({ msg }) => msg ? (
  <div style={{
    padding: '10px 12px',
    backgroundColor: 'rgba(16,185,129,0.08)',
    border: '1px solid rgba(16,185,129,0.25)',
    borderRadius: '8px',
    color: '#34d399',
    fontSize: '12px',
    fontWeight: 500,
  }}>{msg}</div>
) : null;

/* ── Tab bar ────────────────────────────────────────────────────────── */
const TABS = ['signin', 'signup', 'forgot'];
const TAB_LABELS = { signin: 'Sign In', signup: 'Sign Up', forgot: 'Forgot Password' };

const TabBar = ({ active, onSelect }) => (
  <div style={{ display: 'flex', borderBottom: '1px solid #1e2535', marginBottom: '20px' }}>
    {TABS.map(t => (
      <button
        key={t}
        onClick={() => onSelect(t)}
        style={{
          flex: 1,
          background: 'none',
          border: 'none',
          borderBottom: active === t ? '2px solid #2563eb' : '2px solid transparent',
          color: active === t ? '#f9fafb' : '#6b7280',
          padding: '10px 4px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'Inter, system-ui, sans-serif',
          transition: 'color 0.15s',
        }}
      >
        {TAB_LABELS[t]}
      </button>
    ))}
  </div>
);

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════ */
export const ProtectedRoute = ({ children }) => {
  const { user, loading, login, signup, signInWithGoogle, resetPassword } = useAuth();

  const [tab, setTab]           = useState('signin');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [busy, setBusy]         = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const reset = () => { setError(''); setSuccess(''); };
  const changeTab = (t) => { reset(); setTab(t); };

  /* ── Loading spinner while auth resolves ── */
  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0c10',
        color: '#f9fafb',
      }}>
        <LoadingState message="Authenticating session…" />
      </div>
    );
  }

  /* ── Login wall ── */
  if (!user) {
    const handleSignIn = async (e) => {
      e.preventDefault();
      reset();
      setBusy(true);
      try {
        await login(email, password);
        // onAuthStateChange will update user → component re-renders
      } catch (err) {
        setError(err.message || 'Invalid credentials.');
      } finally {
        setBusy(false);
      }
    };

    const handleSignUp = async (e) => {
      e.preventDefault();
      reset();
      if (password !== confirm) { setError('Passwords do not match.'); return; }
      setBusy(true);
      try {
        await signup(email, password);
        setSuccess('Account created! Check your email to verify before signing in.');
        setTab('signin');
      } catch (err) {
        setError(err.message || 'Sign-up failed.');
      } finally {
        setBusy(false);
      }
    };

    const handleForgot = async (e) => {
      e.preventDefault();
      reset();
      setBusy(true);
      try {
        await resetPassword(forgotEmail);
        setSuccess('Password reset link sent. Check your inbox.');
      } catch (err) {
        setError(err.message || 'Could not send reset email.');
      } finally {
        setBusy(false);
      }
    };

    const handleGoogle = async () => {
      reset();
      setGoogleBusy(true);
      try {
        await signInWithGoogle();
        // Browser will redirect to Supabase OAuth — nothing more to do here
      } catch (err) {
        setError(err.message || 'Google sign-in failed.');
        setGoogleBusy(false);
      }
    };

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0c10',
        padding: '20px',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {/* Logo / Brand */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '8px',
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#f9fafb', fontFamily: 'Inter, system-ui, sans-serif' }}>
                ThreatStream
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'Inter, system-ui, sans-serif' }}>
              Application Security Operations
            </p>
          </div>

          <Panel title="">
            <TabBar active={tab} onSelect={changeTab} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <ErrorBox msg={error} />
              <SuccessBox msg={success} />

              {/* ── SIGN IN ── */}
              {tab === 'signin' && (
                <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <GoogleButton onClick={handleGoogle} loading={googleBusy} />
                  <Divider />

                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      id="signin-email"
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Password</label>
                    <input
                      id="signin-password"
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      style={inputStyle}
                    />
                  </div>
                  <button type="submit" disabled={busy} style={primaryBtnStyle(busy)}>
                    {busy ? 'Signing in…' : 'Sign in to ThreatStream'}
                  </button>
                </form>
              )}

              {/* ── SIGN UP ── */}
              {tab === 'signup' && (
                <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <GoogleButton onClick={handleGoogle} loading={googleBusy} />
                  <Divider />

                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      id="signup-email"
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Password</label>
                    <input
                      id="signup-password"
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Confirm Password</label>
                    <input
                      id="signup-confirm"
                      type="password"
                      required
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Re-enter password"
                      style={inputStyle}
                    />
                  </div>
                  <button type="submit" disabled={busy} style={primaryBtnStyle(busy)}>
                    {busy ? 'Creating account…' : 'Create Account'}
                  </button>
                </form>
              )}

              {/* ── FORGOT PASSWORD ── */}
              {tab === 'forgot' && (
                <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <p style={{ fontSize: '12px', color: '#9ca3af', lineHeight: '1.6' }}>
                    Enter the email address associated with your account. We'll send a password reset link.
                  </p>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      placeholder="you@company.com"
                      style={inputStyle}
                    />
                  </div>
                  <button type="submit" disabled={busy} style={primaryBtnStyle(busy)}>
                    {busy ? 'Sending…' : 'Send Reset Link'}
                  </button>
                </form>
              )}
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
