/**
 * src/config/env.js
 * Centralized Environment Validation and Fail-Fast Ingestion
 */

const REQUIRED_ENV_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY'
];

const missingVars = [];

// Safely access Vite environment variables
const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  useMock: import.meta.env.VITE_USE_MOCK !== 'false' // default to true if not explicitly set to false to ensure smooth demo operation
};

// Check for missing required variables
REQUIRED_ENV_VARS.forEach(key => {
  const value = import.meta.env[key];
  if (!value) {
    missingVars.push(key);
  }
});

// Fail fast if required variables are missing and mock mode is disabled or variables are strictly missing for production
if (missingVars.length > 0) {
  const errorMsg = `CRITICAL ARCHITECTURE ERROR: Missing required environment variables: [${missingVars.join(', ')}]. Please configure your .env file.`;
  console.error(errorMsg);
  
  // Throwing the error directly crashes Vite bundle evaluation on load, satisfying the fail-fast constraint.
  throw new Error(errorMsg);
}

export default env;
