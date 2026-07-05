/**
 * src/contexts/AuthContext.jsx
 * Centralized Supabase Authentication and RBAC Context Provider
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase/client';

const AuthContext = createContext(null);

// Mapped permissions for each SOC role
const ROLE_PERMISSIONS = {
  'Administrator': [
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
    'read:intel',
    'read:assets',
    'read:telemetry',
    'read:incidents', 'write:incidents', 'close:incidents'
  ],
  'Threat Hunter': [
    'read:intel', 'write:intel',
    'read:assets', 'scan:assets',
    'read:telemetry', 'write:rules',
    'read:incidents'
  ],
  'Read Only': [
    'read:intel',
    'read:assets',
    'read:telemetry',
    'read:incidents'
  ]
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState('Read Only');
  const [permissions, setPermissions] = useState(ROLE_PERMISSIONS['Read Only']);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setRole('Read Only');
        setPermissions(ROLE_PERMISSIONS['Read Only']);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Fetch operator role from users mapping table in database
   */
  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile doesn't exist yet, insert a default profile or mock
        console.warn('AuthContext: Profile not found, using default Read Only role.');
        setRole('Read Only');
        setPermissions(ROLE_PERMISSIONS['Read Only']);
      } else {
        const userRole = data.role || 'Read Only';
        setRole(userRole);
        setPermissions(ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS['Read Only']);
      }
    } catch (err) {
      console.error('Failed to resolve profile mapping:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Supabase Authenticate with Email / Password
   */
  const login = async (email, password) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      setLoading(false);
      throw error;
    }
    return data;
  };

  /**
   * Secure Logout
   */
  const logout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setLoading(false);
      throw error;
    }
    setUser(null);
    setSession(null);
    setRole('Read Only');
    setPermissions(ROLE_PERMISSIONS['Read Only']);
    setLoading(false);
  };

  /**
   * Authorization check helper
   */
  const hasPermission = (permissionCode) => {
    return permissions.includes(permissionCode);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, permissions, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};

export default AuthContext;
