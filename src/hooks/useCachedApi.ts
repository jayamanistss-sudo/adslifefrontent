import { useState, useEffect } from 'react';
import { api } from '../utils/api';

/**
 * Fetches data from a URL with sessionStorage caching.
 * On mount: returns cached data immediately (no spinner), then refreshes in background.
 * On URL change: clears loading state only if no cache for new URL.
 */
export function useCachedApi<T>(url: string) {
  const cacheKey = `api_cache_${url.replace(/\W/g, '_')}`;

  const [data, setData] = useState<T | null>(() => {
    try { return JSON.parse(sessionStorage.getItem(cacheKey) ?? 'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState<boolean>(() => {
    try { return !sessionStorage.getItem(cacheKey); } catch { return true; }
  });
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const cached = (() => { try { return sessionStorage.getItem(cacheKey); } catch { return null; } })();
    if (!cached) {
      setLoading(true);
      setData(null);
    }
    setError('');

    api.get(url)
      .then(r => {
        if (cancelled) return;
        if (r.data.success) {
          setData(r.data.data as T);
          try { sessionStorage.setItem(cacheKey, JSON.stringify(r.data.data)); } catch {}
        } else {
          setError(r.data.error ?? 'Failed to load');
        }
      })
      .catch(e => { if (!cancelled) setError(e?.response?.data?.error ?? 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [url]);

  return { data, loading, error };
}
