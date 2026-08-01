import { createInternalNeonAuth } from '@neondatabase/auth';
import { BetterAuthReactAdapter } from '@neondatabase/auth/react/adapters';

export const neonAuthUrl = import.meta.env.VITE_NEON_AUTH_URL?.trim() || '';

const neonAuth = neonAuthUrl
  ? createInternalNeonAuth(neonAuthUrl, { adapter: BetterAuthReactAdapter() })
  : null;

// UI and session hooks use the adapter. JWT retrieval must use the Neon wrapper;
// calling getJWTToken on the Better Auth adapter creates a bogus remote action.
export const authClient = neonAuth?.adapter || null;
export const isNeonAuthConfigured = Boolean(neonAuth);

let tokenRequest = null;

const retrieveToken = async ({ forceRefresh, retries }) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      if (forceRefresh || attempt > 0) {
        await authClient.getSession({ query: { disableCookieCache: true } });
      }
      return await neonAuth.getJWTToken();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};

export const getNeonAuthToken = ({ forceRefresh = false, retries = 1 } = {}) => {
  if (!neonAuth) return Promise.resolve(null);
  if (tokenRequest && !forceRefresh) return tokenRequest;

  const request = retrieveToken({ forceRefresh, retries: Math.min(Math.max(retries, 0), 1) });
  const trackedRequest = request.finally(() => {
    if (tokenRequest === trackedRequest) tokenRequest = null;
  });
  tokenRequest = trackedRequest;
  return trackedRequest;
};

export const resetTokenRequestForTests = () => {
  tokenRequest = null;
};
