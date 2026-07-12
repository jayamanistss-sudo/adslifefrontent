import { useState } from 'react';
import BackButton from '../components/BackButton';
import CashfreeButton from '../components/CashfreeButton';
import type { CashfreeResult } from '../utils/cashfree';

/** Cashfree Checkout test page (sandbox keys). */
export default function CashfreeTest() {
  const [amount, setAmount] = useState('100');
  const [last, setLast] = useState<CashfreeResult | null>(null);

  const rupees = Number.parseFloat(amount) || 0;

  return (
    <div className="pb-10 max-w-md mx-auto">
      <BackButton to="/feed" />
      <h1 className="page-title mt-2">Cashfree Checkout Test</h1>
      <p className="page-subtitle mb-6">Sandbox keys — no real money moves. Use Cashfree's published test card / UPI credentials.</p>

      <div className="card p-6 space-y-4">
        <div>
          <label htmlFor="pay-amt" className="label">Amount (₹)</label>
          <input id="pay-amt" className="input" type="number" min="1" step="1"
            value={amount} onChange={(e) => setAmount(e.target.value)} />
          <p className="text-[10px] text-[var(--text-muted)] mt-1">Minimum ₹1</p>
        </div>

        <CashfreeButton
          amountRupees={rupees}
          receipt={`test_${Date.now()}`}
          className="btn btn-primary w-full"
          onSuccess={setLast}
        />

        {last && (
          <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--accent-light)' }}>
            <p className="font-bold" style={{ color: 'var(--accent)' }}>✅ Verified server-side</p>
            <p className="mt-1 font-mono break-all">order: {last.orderId}</p>
          </div>
        )}
      </div>
    </div>
  );
}
