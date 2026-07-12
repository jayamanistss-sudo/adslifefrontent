import { useState, useEffect } from 'react';
import { RefreshCw, Check, AlertCircle } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import { openCashfreeForOrder } from '../../utils/cashfree';
import { formatPlanPrice } from '../../utils/formatPlan';
import { useUserStore } from '../../store/useUserStore';
import toast from 'react-hot-toast';

// Matches GET /vendor/my-plan's actual response shape — NOT
// {plan, plan_name, plan_price}. See SelectPlan.tsx for the same fix.
interface VendorPlan {
  subscription_plan: string; name: string; price: number; annual_price: number | null;
  max_offers: number; features: string[]; status: string;
}

export default function RenewPlan() {
  const { user } = useUserStore();
  const [vendorPlan, setVendorPlan] = useState<VendorPlan | null>(null);
  const [loading, setLoading]       = useState(true);
  const [renewing, setRenewing]     = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    api.get(endpoints.vendorMyPlan).then((r) => {
      // price comes back as a numeric-string ("0.00") from Postgres — coerce
      // once here so every comparison/format below can treat it as a number.
      if (r.data.success) setVendorPlan({
        ...r.data.data, price: Number(r.data.data.price),
        annual_price: r.data.data.annual_price != null ? Number(r.data.data.annual_price) : null,
      });
    }).finally(() => setLoading(false));
  }, [user]);

  const handleRenew = async () => {
    if (!vendorPlan) return;
    if (vendorPlan.price === 0) {
      toast('Free plan does not need renewal.', { icon: 'ℹ️' });
      return;
    }

    setRenewing(true);
    try {
      // Get plan id from plans list
      const plansRes = await api.get(endpoints.plansList);
      const plans    = plansRes.data.data as { id: number; slug: string }[];
      const plan     = plans.find((p) => p.slug === vendorPlan.subscription_plan);
      if (!plan) { toast.error('Plan not found'); return; }

      const cycle = billingCycle === 'annual' && vendorPlan.annual_price != null ? 'annual' : 'monthly';
      const orderRes = await api.post(endpoints.paymentCreateOrder, { plan_id: plan.id, purpose: 'plan_renewal', billing_cycle: cycle });
      if (!orderRes.data.success) { toast.error('Could not create payment order'); return; }

      await openCashfreeForOrder(
        orderRes.data.data,
        { description: `Plan renewal (${cycle})`, prefill: orderRes.data.data.prefill },
        async (orderId) => {
          const v = await api.post('/payment/confirm', { order_id: orderId });
          if (!v.data.success || v.data.data.status !== 'paid') throw new Error('Payment not completed');
        },
      );

      toast.success('Plan renewed successfully!');
      const vendorRes = await api.get(endpoints.vendorMyPlan);
      if (vendorRes.data.success) setVendorPlan({ ...vendorRes.data.data, price: Number(vendorRes.data.data.price) });
    } catch (err: any) {
      const msg = err.response?.data?.error ?? err?.message ?? 'Renewal failed';
      toast.error(msg);
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
            <h2 className="font-heading font-bold text-xl text-[var(--text)] capitalize">{vendorPlan.name}</h2>
          </div>
          <div className={`badge ${vendorPlan.status === 'approved' ? 'badge-accent' : 'badge-warning'}`}>
            {vendorPlan.status}
          </div>
        </div>

        <div className="divider" />

        <ul className="space-y-2 my-4">
          {(vendorPlan.features ?? []).map((f) => (
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

        {vendorPlan.price > 0 && vendorPlan.annual_price != null && (
          <div className="flex items-center gap-1 bg-[var(--surface-2)] p-1 rounded-xl border border-[var(--border)] w-fit mb-4">
            {(['monthly', 'annual'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setBillingCycle(c)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  billingCycle === c
                    ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm border border-[var(--border)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text)] border border-transparent'
                }`}
              >
                {c === 'monthly' ? 'Monthly' : 'Annual'}
                {c === 'annual' && <span className="badge badge-accent !text-[10px] !py-0">Save ~17%</span>}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Renewal amount</p>
            <p className="font-heading font-bold text-2xl text-[var(--text)]">
              {billingCycle === 'annual' && vendorPlan.annual_price != null
                ? formatPlanPrice(vendorPlan.annual_price)
                : formatPlanPrice(vendorPlan.price)}
            </p>
            {vendorPlan.price > 0 && (
              <p className="text-xs text-[var(--text-muted)]">
                for {billingCycle === 'annual' && vendorPlan.annual_price != null ? 365 : 30} days
              </p>
            )}
          </div>
          <button
            onClick={handleRenew}
            disabled={renewing || vendorPlan.price === 0}
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
                {vendorPlan.price === 0 ? 'No renewal needed' : 'Renew Now'}
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
