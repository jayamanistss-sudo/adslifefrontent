import { useState, useEffect } from 'react';
import { RefreshCw, Check, AlertCircle } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import { useUserStore } from '../../store/useUserStore';
import toast from 'react-hot-toast';

interface VendorPlan {
  vendor_id: number; plan: string; plan_name: string; plan_price: number;
  max_offers: number; features: string[]; status: string;
}

export default function RenewPlan() {
  const { user } = useUserStore();
  const [vendorPlan, setVendorPlan] = useState<VendorPlan | null>(null);
  const [loading, setLoading]       = useState(true);
  const [renewing, setRenewing]     = useState(false);

  useEffect(() => {
    api.get(endpoints.vendorMyPlan).then((r) => {
      if (r.data.success) setVendorPlan(r.data.data);
    }).finally(() => setLoading(false));
  }, [user]);

  const handleRenew = async () => {
    if (!vendorPlan) return;
    if (vendorPlan.plan_price === 0) {
      toast('Free plan does not need renewal.', { icon: 'ℹ️' });
      return;
    }

    setRenewing(true);
    try {
      // Get plan id from plans list
      const plansRes = await api.get(endpoints.plansList);
      const plans    = plansRes.data.data as { id: number; slug: string }[];
      const plan     = plans.find((p) => p.slug === vendorPlan.plan);
      if (!plan) { toast.error('Plan not found'); return; }

      const orderRes = await api.post(endpoints.paymentCreateOrder, { plan_id: plan.id, purpose: 'plan_renewal' });
      if (!orderRes.data.success) { toast.error('Could not create payment order'); return; }

      const { order_id, payment_session_id } = orderRes.data.data;
      const { load: loadCF } = await import('@cashfreepayments/cashfree-js');
      const cashfree = await loadCF({ mode: import.meta.env.VITE_CASHFREE_ENV === 'production' ? 'production' : 'sandbox' });
      await cashfree.checkout({ paymentSessionId: payment_session_id, redirectTarget: '_modal' });

      let verified = false;
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        try {
          const vRes = await api.get(endpoints.paymentVerify(order_id));
          if (vRes.data.data?.status === 'paid') { verified = true; break; }
        } catch { /* keep polling */ }
      }

      if (verified) {
        toast.success('Plan renewed successfully!');
        const vendorRes = await api.get(endpoints.vendorMyPlan);
        if (vendorRes.data.success) setVendorPlan(vendorRes.data.data);
      } else {
        toast('Payment processing — your plan will renew shortly.', { icon: 'ℹ️' });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Renewal failed');
    } finally {
      setRenewing(false);
    }
  };

  if (loading) return (
    <div className="max-w-md pb-6">
      <BackButton to="/vendor/dashboard" />
      <div className="skeleton h-48 rounded-2xl mt-6" />
    </div>
  );

  if (!vendorPlan) return (
    <div className="max-w-md pb-6">
      <BackButton to="/vendor/dashboard" />
      <div className="card p-8 text-center">
        <AlertCircle size={32} className="mx-auto text-[var(--text-muted)] mb-3" />
        <p className="text-[var(--text-secondary)]">Vendor profile not found.</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-md pb-6">
      <BackButton to="/vendor/dashboard" />

      <div className="mb-6">
        <h1 className="page-title">Renew Plan</h1>
        <p className="page-subtitle">Renew your subscription to keep your offers active</p>
      </div>

      <div className="card p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-1">Current Plan</p>
            <h2 className="font-heading font-bold text-xl text-[var(--text)] capitalize">{vendorPlan.plan_name}</h2>
          </div>
          <div className={`badge ${vendorPlan.status === 'approved' ? 'badge-accent' : 'badge-warning'}`}>
            {vendorPlan.status}
          </div>
        </div>

        <div className="divider" />

        <ul className="space-y-2 my-4">
          {vendorPlan.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Check size={14} className="text-emerald-500 flex-shrink-0" />
              {f}
            </li>
          ))}
          <li className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Check size={14} className="text-emerald-500 flex-shrink-0" />
            {vendorPlan.max_offers === -1 ? 'Unlimited' : vendorPlan.max_offers} active offers
          </li>
        </ul>

        <div className="divider" />

        <div className="flex items-center justify-between mt-4">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Renewal amount</p>
            <p className="font-heading font-bold text-2xl text-[var(--text)]">
              {vendorPlan.plan_price === 0 ? 'Free' : `₹${vendorPlan.plan_price.toLocaleString()}`}
            </p>
            {vendorPlan.plan_price > 0 && (
              <p className="text-xs text-[var(--text-muted)]">for 30 days</p>
            )}
          </div>
          <button
            onClick={handleRenew}
            disabled={renewing || vendorPlan.plan_price === 0}
            className="btn btn-primary"
          >
            {renewing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <RefreshCw size={15} />
                {vendorPlan.plan_price === 0 ? 'No renewal needed' : 'Renew Now'}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="card p-4 bg-[var(--surface-2)]">
        <p className="text-xs text-[var(--text-secondary)]">
          Payment is processed securely via Cashfree. You will receive a confirmation notification after successful payment.
        </p>
      </div>
    </div>
  );
}
