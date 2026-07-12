import { useState } from 'react';
import toast from 'react-hot-toast';
import { CreditCard, Loader2 } from 'lucide-react';
import { startCashfreeCheckout, type CashfreeResult } from '../utils/cashfree';
import { useUserStore } from '../store/useUserStore';

interface Props {
  /** Amount in rupees (min ₹1) */
  readonly amountRupees: number;
  readonly receipt?: string;
  readonly label?: string;
  readonly className?: string;
  readonly onSuccess?: (result: CashfreeResult) => void;
}

/** Drop-in "Pay with Cashfree" button — order, modal and verification included. */
export default function CashfreeButton({
  amountRupees, receipt, label, className, onSuccess,
}: Props) {
  const { user } = useUserStore();
  const [busy, setBusy] = useState(false);

  const pay = async () => {
    if (busy) return;
    if (!user) { toast.error('Login to make a payment'); return; }
    setBusy(true);
    try {
      const result = await startCashfreeCheckout({ amountRupees, receipt });
      toast.success('✅ Payment successful and verified!');
      onSuccess?.(result);
    } catch (err: any) {
      const msg = err?.message ?? 'Payment failed';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={pay} disabled={busy} className={className ?? 'btn btn-primary'}>
      {busy ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
      {label ?? `Pay ₹${amountRupees.toLocaleString('en-IN')}`}
    </button>
  );
}
