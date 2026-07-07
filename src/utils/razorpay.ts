import { api } from './api';

declare global {
  interface Window { Razorpay: any }
}

let scriptPromise: Promise<void> | null = null;

/** Load checkout.js once, on demand (CSP-friendly: only when paying). */
function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error('Could not load Razorpay checkout')); };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Open Razorpay for an order that some OTHER endpoint already created
 * (e.g. banner payment). `onVerify` receives the payment response and must
 * hit that flow's own verify endpoint. Resolves once verified.
 */
export async function openRazorpayForOrder(
  order: { order_id: string; amount: number; currency?: string; key_id?: string },
  meta: { description?: string; prefill?: { name?: string; email?: string; contact?: string } },
  onVerify: (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => Promise<void>,
): Promise<void> {
  await loadCheckoutScript();
  return new Promise<void>((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.key_id ?? import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency ?? 'INR',
      name: 'AdsLife',
      description: meta.description ?? 'AdsLife payment',
      order_id: order.order_id,
      prefill: meta.prefill,
      theme: { color: '#FF6200' },
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
      handler: async (resp: any) => {
        try {
          await onVerify({
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });
          resolve();
        } catch (e) { reject(e); }
      },
    });
    rzp.on('payment.failed', (resp: any) => reject(new Error(resp?.error?.description ?? 'Payment failed')));
    rzp.open();
  });
}

export interface RazorpayCheckoutOptions {
  /** Amount in paise (min 100 = ₹1) */
  amountPaise: number;
  description?: string;
  receipt?: string;
  prefill?: { name?: string; email?: string; contact?: string };
}

export interface RazorpayResult {
  orderId: string;
  paymentId: string;
}

/**
 * Full Standard Checkout flow:
 * create order → open modal → verify signature on the backend.
 * Resolves only after the backend confirms the signature.
 * Rejects on cancel, payment failure, or verification failure.
 */
export async function startRazorpayCheckout(opts: RazorpayCheckoutOptions): Promise<RazorpayResult> {
  const orderRes = await api.post('/razorpay/create-order', {
    amount: opts.amountPaise,
    currency: 'INR',
    receipt: opts.receipt,
  });
  if (!orderRes.data.success) {
    throw new Error(orderRes.data.error ?? 'Could not create payment order');
  }
  const { order_id, amount, currency, key_id } = orderRes.data.data;

  await loadCheckoutScript();

  return new Promise<RazorpayResult>((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: key_id ?? import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount,
      currency,
      name: 'AdsLife',
      description: opts.description ?? 'AdsLife payment',
      order_id,
      prefill: opts.prefill,
      theme: { color: '#FF6200' },
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled')),
      },
      handler: async (resp: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        try {
          const verify = await api.post('/razorpay/verify-payment', resp);
          if (verify.data.success) {
            resolve({ orderId: resp.razorpay_order_id, paymentId: resp.razorpay_payment_id });
          } else {
            reject(new Error(verify.data.error ?? 'Payment verification failed'));
          }
        } catch (err: any) {
          reject(new Error(err.response?.data?.error ?? 'Payment verification failed'));
        }
      },
    });
    rzp.on('payment.failed', (resp: any) => {
      reject(new Error(resp?.error?.description ?? 'Payment failed'));
    });
    rzp.open();
  });
}
