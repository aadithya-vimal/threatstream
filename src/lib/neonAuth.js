import { createAuthClient } from '@neondatabase/auth';
import { BetterAuthReactAdapter } from '@neondatabase/auth/react/adapters';

export const neonAuthUrl = import.meta.env.VITE_NEON_AUTH_URL?.trim() || '';

export const authClient = neonAuthUrl
  ? createAuthClient(neonAuthUrl, { adapter: BetterAuthReactAdapter() })
  : null;

export const isNeonAuthConfigured = Boolean(authClient);
