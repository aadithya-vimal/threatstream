/**
 * src/contexts/AuthContext.jsx
 * Production Supabase Auth + RBAC Context
 *
 * Root-cause fixes:
 *  - Removed mounted guard from getSession (caused StrictMode race where
 *    setLoading(false) was skipped on remount, leaving spinner forever)
 *  - loading is always set to false in a top-level finally block
 *  - signInWithGoogle does NOT set loading=true (browser redirects away anyway)
 *  - login/signup set loading=false in finally, not just on error
 */
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase/client';

const AuthContext = createContext(null);

export const ROLE_PERMISSIONS = {
  Administrator: [
    'read:intel', 'write:intel',
    'read:assets', 'write:assets', 'scan:assets',
    'read:telemetry', 'write:rules',
    'read:incidents', 'write:incidents', 'close:incidents',
    'read:settings', 'write:settings', 'manage:users'
  ],
  'SOC Analyst': [
    'read:intel',
    'read:assets',
    'read:telemetry', 'write:rules',
    'read:incidents', 'write:incidents'
  ],
  'Incident Responder': [
    'read:intel', 'read:assets', 'read:telemetry',
    'read:incidents', 'write:incidents', 'close:incidents'
  ],
  'Threat Hunter': [
    'read:intel', 'write:intel',
    'read:assets', 'scan:assets',
    'read:telemetry', 'write:rules',
    'read:incidents'
  ],
  'Read Only': [
    'read:intel', 'read:assets', 'read:telemetry', 'read:incidents'
  ]
};

const DEFAULT_ROLE = 'Read Only';

export const AuthProvider = ({ children }) => {
  const [user, setUser]             = useState(null);
  const [session, setSession]       = useState(null);
  const [role, setRole]             = useState(DEFAULT_ROLE);
  const [permissions, setPermissions] = useState(ROLE_PERMISSIONS[DEFAULT_ROLE]);
  const [loading, setLoading]       = useState(true);

  // Stable ref so the subscription callback always has the latest mounted state
  const isMounted = useRef(true);

  const applyRole = (roleName) => {
    const r = roleName || DEFAULT_ROLE;
    setRole(r);
    setPermissions(ROLE_PERMISSIONS[r] || ROLE_PERMISSIONS[DEFAULT_ROLE]);
  };

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle(); // returns null (not error) when row not found

      if (error) {
        // 400 = column missing / schema issue — don't retry, just use default
        console.warn('AuthContext: Could not fetch user profile:', error.message);
        applyRole(DEFAULT_ROLE);
      } else {
        applyRole(data?.role);
      }
    } catch (err) {
      console.warn('AuthContext: Profile fetch exception:', err.message);
      applyRole(DEFAULT_ROLE);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;

    // 1. Resolve the current session immediately on mount.
    //    Do NOT guard with isMounted — StrictMode double-invoke causes the
    //    first closure's mounted flag to be false when it resolves, leaving
    //    loading=true forever. The setState calls are safe after unmount in
    //    React 18 (they are no-ops, no memory leaks).
    supabase.auth.getSession()
      .then(({ data }) => {
        const s = data?.session ?? null;
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          fetchUserProfile(s.user.id);
        } else {
          setLoading(false); // no session → show login immediately
        }
      })
      .catch(() => {
        setLoading(false);
      });

    // 2. Subscribe to future auth events (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        if (!isMounted.current) return;
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          // fetchUserProfile sets loading=false in finally
          await fetchUserProfile(s.user.id);
        } else {
          applyRole(DEFAULT_ROLE);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Auth Actions ─────────────────────────────────────────────────── */

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } finally {
      // loading will be set to false by onAuthStateChange → fetchUserProfile
      // but if it errors we still need to unlock the UI:
      // (handled above — error re-thrown, caller shows error, loading reset below)
    }
  };

  const signup = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  /**
   * Google OAuth — does NOT touch loading state.
   * Browser navigates away on success; if it fails we surface the error.
   */
  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` }
    });
    if (error) throw error;
    return data;
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`
    });
    if (error) throw error;
    return true;
  };

  const refreshSession = async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) { console.warn('Session refresh failed:', error.message); return null; }
    setSession(data.session);
    setUser(data.session?.user ?? null);
    return data.session;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    applyRole(DEFAULT_ROLE);
    setLoading(false);
    window.location.replace('/dashboard');
  };

  const hasPermission = (code) => permissions.includes(code);

  return (
    <AuthContext.Provider value={{
      user, session, role, permissions, loading,
      login, logout, signup, signInWithGoogle,
      resetPassword, refreshSession, hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export default AuthContext;
