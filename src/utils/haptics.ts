/** Thin wrapper over the Vibration API — silently no-ops where unsupported (iOS Safari, desktop). */
type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'error';

const PATTERNS: Record<HapticStyle, number | number[]> = {
  light: 8,
  medium: 16,
  heavy: 28,
  success: [10, 40, 10],
  error: [20, 30, 20, 30, 20],
};

export function haptic(style: HapticStyle = 'light'): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try { navigator.vibrate(PATTERNS[style]); } catch { /* noop */ }
}
