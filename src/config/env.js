/**
 * src/config/env.js
 * Centralised environment config.
 *
 * Live mode only: set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
 */

const env = {
  supabaseUrl:  import.meta.env.VITE_SUPABASE_URL  || '',
  supabaseKey:  import.meta.env.VITE_SUPABASE_ANON_KEY
             || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
             || '',
};

if (!env.supabaseUrl || !env.supabaseKey) {
  throw new Error(
    'Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

export default env;
