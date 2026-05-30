import { useEffect, useRef, useCallback } from 'react';

export function useInfiniteScroll(
  onLoadMore: () => void,
  hasMore: boolean,
  loading = false,
) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const cooldown    = useRef(false);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (!entries[0].isIntersecting) return;
      if (!hasMore || loading || cooldown.current) return;
      cooldown.current = true;
      onLoadMore();
      setTimeout(() => { cooldown.current = false; }, 1000);
    },
    [onLoadMore, hasMore, loading],
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { rootMargin: '300px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  return sentinelRef;
}
