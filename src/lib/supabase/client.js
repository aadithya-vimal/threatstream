/**
 * src/lib/supabase/client.js
 * Centralized Supabase Client Wrapper
 */
import { createClient } from '@supabase/supabase-js';
import env from '../../config/env';

// Initialize the Supabase Client
export const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey);

export default supabase;
