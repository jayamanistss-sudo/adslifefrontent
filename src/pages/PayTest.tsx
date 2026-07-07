import { useState } from 'react';
import BackButton from '../components/BackButton';
import RazorpayButton from '../components/RazorpayButton';
import type { RazorpayResult } from '../utils/razorpay';

/** Razorpay Standard Checkout test page (test-mode keys). */
export default function PayTest() {
  const [amount, setAmount] = useState('100');
  const [last, setLast] = useState<RazorpayResult | null>(null);

  const paise = Math.round((Number.parseFloat(amount) || 0) * 100);

  return (
    <div className="pb-10 max-w-md mx-auto">
      <BackButton to="/feed" />
      <h1 className="page-title mt-2">Razorpay Checkout Test</h1>
      <p className="page-subtitle mb-6">Test-mode keys — no real money moves. Use card 4111 1111 1111 1111, any future expiry, any CVV.</p>

      <div className="card p-6 space-y-4">
        <div>
          <label htmlFor="pay-amt" className="label">Amount (₹)</label>
          <input id="pay-amt" className="input" type="number" min="1" step="1"
            value={amount} onChange={(e) => setAmount(e.target.value)} />
          <p className="text-[10px] text-[var(--text-muted)] mt-1">Minimum ₹1 (100 paise)</p>
        </div>

        <RazorpayButton
          amountPaise={paise}
          description="AdsLife test payment"
          receipt={`test_${Date.now()}`}
          className="btn btn-primary w-full"
          onSuccess={setLast}
        />

        {last && (
          <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--accent-light)' }}>
            <p className="font-bold" style={{ color: 'var(--accent)' }}>✅ Verified server-side</p>
            <p className="mt-1 font-mono break-all">order: {last.orderId}</p>
            <p className="font-mono break-all">payment: {last.paymentId}</p>
          </div>
        )}
      </div>
    </div>
  );
}
