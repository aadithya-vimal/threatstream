import React, { createContext, useContext, useEffect } from 'react';
import { NeonAuthUIProvider } from '@neondatabase/auth-ui';
import '@neondatabase/auth-ui/css';
import { useNavigate } from 'react-router-dom';
import { configureApiAuth } from '../lib/api';
import { authClient, isNeonAuthConfigured } from '../lib/neonAuth';

const AuthContext = createContext(null);

const NeonAuthBridge = ({ children }) => {
  const navigate = useNavigate();
  const sessionResult = authClient.useSession();
  const session = sessionResult.data?.session || null;
  const neonUser = sessionResult.data?.user || null;

  useEffect(() => {
    configureApiAuth(() => authClient.getJWTToken());
    return () => configureApiAuth(async () => null);
  }, []);

  const user = neonUser ? {
    id: neonUser.id,
    email: neonUser.email || null,
    displayName: neonUser.name || null,
    imageUrl: neonUser.image || null,
  } : null;

  const logout = async () => {
    await authClient.signOut();
    navigate('/', { replace: true });
  };

  return (
    <AuthContext.Provider value={{
      user,
      session: session ? { id: session.id, expiresAt: session.expiresAt } : null,
      loading: sessionResult.isPending,
      isAuthenticated: Boolean(user),
      login: () => navigate('/auth/sign-in'),
      signup: () => navigate('/auth/sign-up'),
      logout,
      getToken: () => authClient.getJWTToken(),
    }}>
      {children}
    </AuthContext.Provider>
  );
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
