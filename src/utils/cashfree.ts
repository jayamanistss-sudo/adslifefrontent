import { api } from './api';

declare global {
  interface Window { Cashfree?: (opts: { mode: 'sandbox' | 'production' }) => CashfreeSdk }
}

interface CashfreeCheckoutResult {
  error?: { message?: string };
  redirect?: boolean;
  paymentDetails?: { paymentMessage?: string };
}

interface CashfreeSdk {
  checkout(opts: { paymentSessionId: string; redirectTarget?: '_modal' | '_self' | '_blank' }): Promise<CashfreeCheckoutResult>;
}

let scriptPromise: Promise<void> | null = null;
let sdkPromise: Promise<CashfreeSdk> | null = null;

/** Load the Cashfree JS SDK once, on demand (CSP-friendly: only when paying). */
function loadCheckoutScript(): Promise<void> {
  if (window.Cashfree) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error('Could not load Cashfree checkout')); };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

async function getSdk(): Promise<CashfreeSdk> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = loadCheckoutScript().then(() => {
    const mode = (import.meta.env.VITE_CASHFREE_ENV === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production';
    return window.Cashfree!({ mode });
  });
  return sdkPromise;
}

/**
 * Open Cashfree Checkout for an order some OTHER endpoint already created
 * (e.g. banner payment, plan payment). Unlike Razorpay's flow, Cashfree never
 * hands the client anything cryptographic to submit back — the checkout
 * modal's own result isn't trustworthy proof of payment, so `onVerify` is
 * ALWAYS called afterward with just the order_id; the caller's own confirm
 * endpoint re-checks the true status with Cashfree server-to-server. This
 * function only rejects if `onVerify` itself throws (i.e. not actually paid).
 */
export async function openCashfreeForOrder(
  order: { order_id: string; payment_session_id: string },
  _meta: { description?: string; prefill?: { name?: string; email?: string; contact?: string } },
  onVerify: (orderId: string) => Promise<void>,
): Promise<void> {
  const cashfree = await getSdk();
  await cashfree.checkout({ paymentSessionId: order.payment_session_id, redirectTarget: '_modal' });
  await onVerify(order.order_id);
}

export interface CashfreeCheckoutOptions {
  /** Amount in rupees (min ₹1) */
  amountRupees: number;
  receipt?: string;
}

export interface CashfreeResult {
  orderId: string;
}

/**
 * Full generic checkout flow: create order → open modal → re-verify with the
 * backend. Resolves only after the backend confirms the order is PAID.
 */
export async function startCashfreeCheckout(opts: CashfreeCheckoutOptions): Promise<CashfreeResult> {
  const orderRes = await api.post('/cashfree/create-order', {
    amount: opts.amountRupees,
    currency: 'INR',
    receipt: opts.receipt,
  });
  if (!orderRes.data.success) {
    throw new Error(orderRes.data.error ?? 'Could not create payment order');
  }
  const { order_id, payment_session_id } = orderRes.data.data;

  const cashfree = await getSdk();
  await cashfree.checkout({ paymentSessionId: payment_session_id, redirectTarget: '_modal' });

  const verify = await api.post('/cashfree/verify-payment', { order_id });
  if (!verify.data.success) {
    throw new Error('Payment not completed');
  }
  return { orderId: order_id };
}
