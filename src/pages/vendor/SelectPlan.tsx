import { useState, useEffect } from 'react';
import { Check, Zap } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import { useUserStore } from '../../store/useUserStore';
import toast from 'react-hot-toast';

interface Plan {
  id: number; name: string; slug: string; price: number;
  duration_days: number; max_offers: number; features: string[];
}

interface VendorPlan {
  plan: string; plan_name: string; plan_price: number; status: string;
}

const PLAN_COLORS: Record<string, string> = {
  free:         'border-[var(--border)]',
  starter:      'border-blue-400',
  growth:       'border-[var(--primary)]',
  professional: 'border-violet-500',
};
const PLAN_BADGE: Record<string, string> = {
  growth: 'Most Popular', professional: 'Best Value',
};

export default function SelectPlan() {
  const { user } = useUserStore();
  const [plans, setPlans]         = useState<Plan[]>([]);
  const [current, setCurrent]     = useState<VendorPlan | null>(null);
  const [selected, setSelected]   = useState<Plan | null>(null);
  const [loading, setLoading]     = useState(true);
  const [paying, setPaying]       = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(endpoints.plansList),
      api.get(endpoints.vendorMyPlan),
    ]).then(([planRes, vendorRes]) => {
      if (planRes.data.success)   setPlans(planRes.data.data);
      if (vendorRes.data.success) setCurrent(vendorRes.data.data);
    }).finally(() => setLoading(false));
  }, [user]);

  const handleSelect = async (plan: Plan) => {
    if (plan.slug === current?.plan) return;
    setSelected(plan);

    if (plan.price === 0) {
      toast('Free plan selected. Contact support to downgrade.', { icon: 'ℹ️' });
      return;
    }

    setPaying(true);
    try {
      const orderRes = await api.post(endpoints.paymentCreateOrder, { plan_id: plan.id, purpose: 'plan_change' });
      if (!orderRes.data.success) { toast.error('Could not create payment order'); return; }

      const { order_id, payment_session_id } = orderRes.data.data;
      const { load: loadCF } = await import('@cashfreepayments/cashfree-js');
      const cashfree = await loadCF({ mode: import.meta.env.VITE_CASHFREE_ENV === 'production' ? 'production' : 'sandbox' });
      await cashfree.checkout({ paymentSessionId: payment_session_id, redirectTarget: '_modal' });

      // Poll verify endpoint until paid or max retries
      let verified = false;
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        try {
          const vRes = await api.get(endpoints.paymentVerify(order_id));
          if (vRes.data.data?.status === 'paid') { verified = true; break; }
        } catch { /* keep polling */ }
      }

      if (verified) {
        toast.success('Plan upgraded successfully!');
        // Refresh current plan display
        const vendorRes = await api.get(endpoints.vendorMyPlan);
        if (vendorRes.data.success) setCurrent(vendorRes.data.data);
      } else {
        toast('Payment processing — your plan will update shortly.', { icon: 'ℹ️' });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  if (loading) return (
    <div className="max-w-4xxl pb-6">
      <BackButton to="/vendor/dashboard" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {[1,2,3,4].map((i) => <div key={i} className="skeleton h-64 rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xxl pb-6">
      <BackButton to="/vendor/dashboard" />

      <div className="page-header">
        <div>
          <h1 className="page-title">Select Plan</h1>
          <p className="page-subtitle">
            Current plan: <span className="font-semibold text-[var(--primary)] capitalize">{current?.plan_name ?? 'Free'}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.slug === current?.plan;
          const badge     = PLAN_BADGE[plan.slug];
          return (
            <div
              key={plan.id}
              className={`card p-5 flex flex-col gap-4 relative border-2 transition-all ${PLAN_COLORS[plan.slug] ?? 'border-[var(--border)]'} ${isCurrent ? 'ring-2 ring-[var(--primary)]' : ''}`}
            >
              {badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 badge badge-primary whitespace-nowrap">{badge}</div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 right-4 badge badge-accent">Current</div>
              )}

              <div>
                <div className="font-heading font-bold text-[var(--text)] text-lg">{plan.name}</div>
                <div className="flex items-baseline gap-1 mt-1">
                  {plan.price === 0 ? (
                    <span className="font-heading font-bold text-2xl text-[var(--text)]">Free</span>
                  ) : (
                    <>
                      <span className="text-sm text-[var(--text-muted)]">₹</span>
                      <span className="font-heading font-bold text-2xl text-[var(--text)]">{plan.price.toLocaleString()}</span>
                      <span className="text-xs text-[var(--text-muted)]">/mo</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {plan.max_offers === -1 ? 'Unlimited' : plan.max_offers} offers · {plan.duration_days} days
                </p>
              </div>

              <ul className="flex-1 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                    <Check size={12} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(plan)}
                disabled={isCurrent || paying}
                className={`btn w-full ${isCurrent ? 'btn-secondary opacity-60 cursor-default' : plan.slug === 'growth' || plan.slug === 'professional' ? 'btn-primary' : 'btn-secondary'}`}
              >
                {paying && selected?.id === plan.id ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    Processing…
                  </span>
                ) : isCurrent ? 'Current Plan' : plan.price === 0 ? 'Downgrade' : (
                  <span className="flex items-center gap-1"><Zap size={13} /> Upgrade</span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
