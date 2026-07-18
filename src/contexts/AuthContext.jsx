import React, { createContext, useContext, useEffect } from 'react';
import { ClerkProvider, useAuth as useClerkAuth, useClerk, useUser } from '@clerk/clerk-react';
import { configureApiAuth } from '../lib/api';

const AuthContext = createContext(null);
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const ClerkAuthBridge = ({ children }) => {
  const { isLoaded, isSignedIn, getToken, sessionId } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const clerk = useClerk();

  useEffect(() => {
    configureApiAuth(() => getToken());
    return () => configureApiAuth(async () => null);
  }, [getToken]);

  const user = isSignedIn && clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || null,
    displayName: clerkUser.fullName || clerkUser.username || null,
    imageUrl: clerkUser.imageUrl || null,
  } : null;

  return (
    <AuthContext.Provider value={{
      user,
      session: sessionId ? { id: sessionId } : null,
      loading: !isLoaded,
      login: () => clerk.openSignIn(),
      signup: () => clerk.openSignUp(),
      logout: () => clerk.signOut({ redirectUrl: '/' }),
      getToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const AuthProvider = ({ children }) => {
  if (!publishableKey) {
    return (
      <div role="alert" style={{ padding: '32px', color: '#fca5a5', background: '#0a0c10', minHeight: '100vh' }}>
        Authentication is not configured. Set VITE_CLERK_PUBLISHABLE_KEY locally.
      </div>
    );
  }
  return <ClerkProvider publishableKey={publishableKey}><ClerkAuthBridge>{children}</ClerkAuthBridge></ClerkProvider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
};

export default AuthContext;
