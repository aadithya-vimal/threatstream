export function isDemoMode() {
  return false;
}

export function withRepositoryFallback({ repository, action, error, mockValue, emptyValue }) {
  console.warn(`${repository}: ${action} unavailable in live mode.`, error?.message || error);
  return emptyValue;
}
