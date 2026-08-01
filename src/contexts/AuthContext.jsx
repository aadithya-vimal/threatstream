import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { NeonAuthUIProvider } from '@neondatabase/auth-ui';
import '@neondatabase/auth-ui/css';
import { useNavigate } from 'react-router-dom';
import { configureApiAuth } from '../lib/api';
import { authClient, getNeonAuthToken, isNeonAuthConfigured } from '../lib/neonAuth';

const AuthContext = createContext(null);

const normalizeUser = (user) => user ? {
  id: user.id,
  email: user.email || null,
  displayName: user.name || null,
  imageUrl: user.image || null,
} : null;

const NeonAuthBridge = ({ children }) => {
  const navigate = useNavigate();
  const sessionResult = authClient.useSession();
  const [operation, setOperation] = useState(null);
  const [operationError, setOperationError] = useState(null);
  const session = sessionResult.data?.session || null;
  const user = useMemo(() => normalizeUser(sessionResult.data?.user), [sessionResult.data?.user]);
  const error = operationError || sessionResult.error || null;

  const getToken = useCallback(async (options = {}) => {
    if (options.forceRefresh) setOperation('refreshing');
    setOperationError(null);
    try {
      return await getNeonAuthToken(options);
    } catch (requestError) {
      setOperationError(requestError);
      throw requestError;
    } finally {
      if (options.forceRefresh) setOperation(null);
    }
  }, []);

  const runAuthOperation = useCallback(async (name, action) => {
    setOperation(name);
    setOperationError(null);
    try {
      return await action();
    } catch (requestError) {
      setOperationError(requestError);
      throw requestError;
    } finally {
      setOperation(null);
    }
  }, []);

  const signIn = useCallback((credentials) => runAuthOperation(
    'authenticating',
    () => authClient.signIn.email(credentials),
  ), [runAuthOperation]);
  const signUp = useCallback((details) => runAuthOperation(
    'authenticating',
    () => authClient.signUp.email(details),
  ), [runAuthOperation]);
  const signOut = useCallback(async () => {
    await runAuthOperation('authenticating', () => authClient.signOut());
    navigate('/', { replace: true });
  }, [navigate, runAuthOperation]);

  useEffect(() => {
    configureApiAuth({ getToken, onAuthenticationFailure: signOut });
    return () => configureApiAuth(null);
  }, [getToken, signOut]);
  const retryInitialization = useCallback(async () => {
    setOperationError(null);
    setOperation('initializing');
    try {
      await sessionResult.refetch?.();
    } catch (requestError) {
      setOperationError(requestError);
    } finally {
      setOperation(null);
    }
  }, [sessionResult]);

  const status = error
    ? 'error'
    : operation || (sessionResult.isPending ? 'initializing' : (user ? 'signed_in' : 'signed_out'));

  const value = useMemo(() => ({
    status,
    error,
    user,
    session: session ? { id: session.id, expiresAt: session.expiresAt } : null,
    loading: status === 'initializing' || status === 'authenticating' || status === 'refreshing',
    isAuthenticated: status === 'signed_in',
    signIn,
    signUp,
    signOut,
    getToken,
    retryInitialization,
    login: () => navigate('/auth/sign-in'),
    signup: () => navigate('/auth/sign-up'),
    logout: signOut,
  }), [error, getToken, navigate, session, signIn, signOut, signUp, status, user, retryInitialization]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  if (!isNeonAuthConfigured) {
    return (
      <div role="alert" style={{ padding: '32px', color: '#fca5a5', background: '#0a0c10', minHeight: '100vh' }}>
        Authentication is not configured. Set VITE_NEON_AUTH_URL locally.
      </div>
    );
  }

  return (
    <NeonAuthUIProvider
      authClient={authClient}
      defaultTheme="dark"
      navigate={navigate}
      replace={(path) => navigate(path, { replace: true })}
      redirectTo="/overview"
    >
      <NeonAuthBridge>{children}</NeonAuthBridge>
    </NeonAuthUIProvider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
};

export default AuthContext;
