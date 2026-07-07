import { useState } from 'react';
import toast from 'react-hot-toast';
import { CreditCard, Loader2 } from 'lucide-react';
import { startRazorpayCheckout, type RazorpayResult } from '../utils/razorpay';
import { useUserStore } from '../store/useUserStore';

interface Props {
  /** Amount in paise (min 100 = ₹1) */
  readonly amountPaise: number;
  readonly description?: string;
  readonly receipt?: string;
  readonly label?: string;
  readonly className?: string;
  readonly onSuccess?: (result: RazorpayResult) => void;
}

/** Drop-in "Pay with Razorpay" button — order, modal and verification included. */
export default function RazorpayButton({
  amountPaise, description, receipt, label, className, onSuccess,
}: Props) {
  const { user } = useUserStore();
  const [busy, setBusy] = useState(false);

  const pay = async () => {
    if (busy) return;
    if (!user) { toast.error('Login to make a payment'); return; }
    setBusy(true);
    try {
      const result = await startRazorpayCheckout({
        amountPaise,
        description,
        receipt,
        prefill: { name: user.name, email: user.email, contact: user.phone },
      });
      toast.success('✅ Payment successful and verified!');
      onSuccess?.(result);
    } catch (err: any) {
      const msg = err?.message ?? 'Payment failed';
      if (msg === 'Payment cancelled') toast('Payment cancelled', { icon: '↩️' });
      else toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={pay} disabled={busy} className={className ?? 'btn btn-primary'}>
      {busy ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
      {label ?? `Pay ₹${(amountPaise / 100).toLocaleString('en-IN')}`}
    </button>
  );
}
