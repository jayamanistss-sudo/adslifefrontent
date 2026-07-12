// Tracks whether any page has already rendered in this browser tab's SPA
// lifetime. Module state, not React state — persists across client-side
// route changes (unlike document.referrer, which only reflects how the tab
// itself was opened and never updates on pushState navigation) and resets
// on a genuine full page load, since the whole script re-executes then.
let started = false;

export function hasSpaSessionStarted(): boolean {
  return started;
}

export function markSpaSessionStarted(): void {
  started = true;
}
