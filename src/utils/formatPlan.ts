/**
 * Shared "Free" vs "₹X,XXX" formatting for subscription plan prices.
 * Centralizing this avoids the class of bug where a plan price arrives as a
 * numeric-string ("0.00") from Postgres and `price === 0` silently never
 * matches — coerce with Number(...) at the call site before formatting.
 */
export function formatPlanPrice(price: number, suffix = ''): string {
  return price === 0 ? 'Free' : `₹${price.toLocaleString()}${suffix}`;
}
