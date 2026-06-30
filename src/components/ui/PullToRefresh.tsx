import { useRef, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { haptic } from '../../utils/haptics';

const THRESHOLD = 64;   // px of pull needed to trigger refresh
const MAX_PULL  = 100;  // px — visual cap so the indicator doesn't drag forever

interface Props {
  readonly onRefresh: () => Promise<void> | void;
  readonly children: React.ReactNode;
  readonly disabled?: boolean;
}

/** Walks up the DOM to find the nearest ancestor that actually scrolls (this component's own wrapper doesn't scroll — Layout's <main> does). */
function findScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  let node = el;
  while (node) {
    if (node.scrollHeight > node.clientHeight && getComputedStyle(node).overflowY !== 'visible') {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

export default function PullToRefresh({ onRefresh, children, disabled }: Props) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggeredHaptic = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || refreshing) return;
    // Only start tracking if the actual scroll container is already at the top
    const scrollEl = findScrollableAncestor(containerRef.current);
    if (scrollEl && scrollEl.scrollTop > 0) { startY.current = null; return; }
    startY.current = e.touches[0].clientY;
    triggeredHaptic.current = false;
  }, [disabled, refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current == null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) { setPull(0); return; }
    const damped = Math.min(MAX_PULL, delta * 0.5);
    setPull(damped);
    if (damped >= THRESHOLD && !triggeredHaptic.current) {
      haptic('light');
      triggeredHaptic.current = true;
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (startY.current == null) return;
    startY.current = null;
    if (pull >= THRESHOLD) {
      setRefreshing(true);
      setPull(THRESHOLD);
      haptic('success');
      try { await onRefresh(); } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  }, [pull, onRefresh]);

  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-150"
        style={{ height: refreshing ? THRESHOLD : pull }}
      >
        <div
          className="w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-md flex items-center justify-center"
          style={{ opacity: refreshing ? 1 : progress, transform: `scale(${refreshing ? 1 : 0.6 + progress * 0.4})` }}
        >
          <RefreshCw size={15} className={`text-[var(--primary)] ${refreshing ? 'ptr-spinner' : ''}`}
            style={!refreshing ? { transform: `rotate(${progress * 360}deg)` } : undefined} />
        </div>
      </div>
      {children}
    </div>
  );
}
