const useMock = import.meta.env.VITE_USE_MOCK === 'true'
  || !import.meta.env.VITE_SUPABASE_URL
  || !import.meta.env.VITE_SUPABASE_ANON_KEY;

export function isDemoMode() {
  return useMock;
}

export function withRepositoryFallback({ repository, action, error, mockValue, emptyValue }) {
  if (useMock) {
    console.warn(`${repository}: ${action} falling back to mock data.`, error?.message || error);
    return typeof mockValue === 'function' ? mockValue() : mockValue;
  }

  console.warn(`${repository}: ${action} unavailable in live mode.`, error?.message || error);
  return emptyValue;
}
