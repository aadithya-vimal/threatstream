/**
 * src/hooks/useApi.js
 * Generic data-fetching hook with loading, error, and refresh support.
 * Usage: const { data, loading, error, refresh } = useApi(fetchFn, deps)
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export function useApi(fetchFn, deps = [], options = {}) {
  const { defaultValue = null, skip = false } = options;
  const [data, setData]       = useState(defaultValue);
  const [loading, setLoading] = useState(!skip);
  const [error, setError]     = useState(null);
  const mounted = useRef(true);

  const run = useCallback(async () => {
    if (skip) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      if (mounted.current) setData(result);
    } catch (err) {
      if (mounted.current) setError(err.message || 'Failed to load data');
    } finally {
      if (mounted.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, ...deps]);

  useEffect(() => {
    mounted.current = true;
    run();
    return () => { mounted.current = false; };
  }, [run]);

  return { data, loading, error, refresh: run };
}

export default useApi;
