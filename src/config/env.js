/**
 * src/config/env.js
 * Centralised environment config.
 *
 * In production:  set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
 * In demo mode:   set VITE_USE_MOCK=true (or leave env vars unset)
 */

const env = {
  supabaseUrl:  import.meta.env.VITE_SUPABASE_URL  || '',
  supabaseKey:  import.meta.env.VITE_SUPABASE_ANON_KEY
             || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
             || '',
  useMock:      import.meta.env.VITE_USE_MOCK === 'true'
             || !import.meta.env.VITE_SUPABASE_URL
             || !import.meta.env.VITE_SUPABASE_ANON_KEY,
};

if (!env.useMock && (!env.supabaseUrl || !env.supabaseKey)) {
  throw new Error(
    'Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, ' +
    'or set VITE_USE_MOCK=true for demo mode.'
  );
}

export default env;
