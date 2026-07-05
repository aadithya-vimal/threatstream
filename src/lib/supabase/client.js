/**
 * src/lib/supabase/client.js
 * Production Supabase client.
 *
 * Uses real Supabase when VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set.
 * Falls back to a complete in-memory mock when VITE_USE_MOCK=true (dev/demo mode).
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY
                  || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const useMock      = import.meta.env.VITE_USE_MOCK === 'true'
                  || (!supabaseUrl || !supabaseKey);

let supabase;

if (!useMock && supabaseUrl && supabaseKey) {
  // ── Production real client ──────────────────────────────────────────
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  console.info('[Supabase] Using real client →', supabaseUrl);
} else {
  // ── Development/demo mock client ────────────────────────────────────
  // Provides full no-op stubs so the app never throws on missing tables.
  console.warn('[Supabase] MOCK client active. Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY and remove VITE_USE_MOCK to connect a real database.');

  const makeChain = (result = { data: [], error: null }) => {
    const chain = {
      select: () => chain,
      insert: () => chain,
      update: () => chain,
      upsert: () => chain,
      delete: () => chain,
      eq: () => chain,
      neq: () => chain,
      gt: () => chain,
      gte: () => chain,
      lt: () => chain,
      lte: () => chain,
      like: () => chain,
      ilike: () => chain,
      in: () => chain,
      is: () => chain,
      not: () => chain,
      or: () => chain,
      order: () => chain,
      limit: () => chain,
      range: () => chain,
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (resolve) => Promise.resolve(result).then(resolve),
      catch: (reject) => Promise.resolve(result).catch(reject),
    };
    return chain;
  };

  let _authListeners = [];
  let _session = null;

  const mockAuth = {
    getSession: async () => ({ data: { session: _session }, error: null }),

    onAuthStateChange: (callback) => {
      _authListeners.push(callback);
      // Fire immediately with current state (mirrors real Supabase behaviour)
      setTimeout(() => callback('INITIAL_SESSION', _session), 0);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              _authListeners = _authListeners.filter(fn => fn !== callback);
            }
          }
        }
      };
    },

    signInWithPassword: async ({ email, password }) => {
      // Accept any credentials in mock mode
      _session = {
        access_token: 'mock-token',
        user: { id: 'mock-user-id', email, role: 'authenticated' },
      };
      _authListeners.forEach(fn => fn('SIGNED_IN', _session));
      return { data: { session: _session, user: _session.user }, error: null };
    },

    signUp: async ({ email }) => {
      return {
        data: {
          user: { id: 'mock-new-id', email },
          session: null, // email confirmation required
        },
        error: null,
      };
    },

    signInWithOAuth: async ({ provider, options }) => {
      // In mock mode, redirect to dashboard directly
      console.info('[Mock] OAuth redirect →', options?.redirectTo || '/dashboard');
      window.location.href = options?.redirectTo || '/dashboard';
      return { data: {}, error: null };
    },

    signOut: async () => {
      _session = null;
      _authListeners.forEach(fn => fn('SIGNED_OUT', null));
      return { error: null };
    },

    resetPasswordForEmail: async (email) => {
      console.info('[Mock] Password reset email →', email);
      return { error: null };
    },

    refreshSession: async () => ({ data: { session: _session }, error: null }),

    updateUser: async (updates) => ({ data: { user: { ..._session?.user, ...updates } }, error: null }),
  };

  supabase = {
    auth: mockAuth,
    from: (table) => {
      console.debug(`[Mock] supabase.from('${table}')`);
      return makeChain({ data: [], error: null });
    },
    rpc: (fn) => {
      console.debug(`[Mock] supabase.rpc('${fn}')`);
      return Promise.resolve({ data: null, error: null });
    },
    channel: (name) => {
      console.debug(`[Mock] supabase.channel('${name}')`);
      const ch = {
        on: () => ch,
        subscribe: () => ch,
        unsubscribe: () => ch,
      };
      return ch;
    },
    removeChannel: () => {},
  };
}

export { supabase };
export default supabase;
