import { useState, useEffect } from 'react';
import { Check, Zap } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import { openCashfreeForOrder } from '../../utils/cashfree';
import { useUserStore } from '../../store/useUserStore';
import toast from 'react-hot-toast';

interface Plan {
  id: number; name: string; slug: string; price: number; annual_price: number | null;
  duration_days: number; max_offers: number; features: string[];
}

// Matches GET /vendor/my-plan's actual response shape (vendors.subscription_plan
// joined with the subscription_plans row) — NOT {plan, plan_name, plan_price}.
interface VendorPlan {
  subscription_plan: string; name: string; price: number; status: string;
}

const PLAN_COLORS: Record<string, string> = {
  starter: 'border-[var(--border)]',
  growth:  'border-[var(--primary)]',
  pro:     'border-violet-500',
};
const PLAN_BADGE: Record<string, string> = {
  growth: 'Most Popular', pro: 'Best Value',
};

export default function SelectPlan() {
  const { user } = useUserStore();
  const [plans, setPlans]         = useState<Plan[]>([]);
  const [current, setCurrent]     = useState<VendorPlan | null>(null);
  const [selected, setSelected]   = useState<Plan | null>(null);
  const [loading, setLoading]     = useState(true);
  const [paying, setPaying]       = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    Promise.all([
      api.get(endpoints.plansList).catch(() => ({ data: { success: false } })),
      api.get(endpoints.vendorMyPlan).catch(() => ({ data: { success: false } })),
    ]).then(([planRes, vendorRes]) => {
      // price comes back as a numeric-string ("0.00") from Postgres — coerce
      // once here so every comparison/format below can treat it as a number.
      if (planRes.data.success)
        setPlans(planRes.data.data.map((p: Plan) => ({
          ...p, price: Number(p.price),
          annual_price: p.annual_price != null ? Number(p.annual_price) : null,
        })));
      if (vendorRes.data.success)
        setCurrent({ ...vendorRes.data.data, price: Number(vendorRes.data.data.price) });
    }).finally(() => setLoading(false));
  }, [user]);

  const handleSelect = async (plan: Plan) => {
    if (plan.slug === current?.subscription_plan) return;
    setSelected(plan);

    if (plan.price === 0) {
      toast('Free plan selected. Contact support to downgrade.', { icon: 'ℹ️' });
      return;
    }
    const cycle = billingCycle === 'annual' && plan.annual_price != null ? 'annual' : 'monthly';

    setPaying(true);
    try {
      const orderRes = await api.post(endpoints.paymentCreateOrder, { plan_id: plan.id, purpose: 'plan_change', billing_cycle: cycle });
      if (!orderRes.data.success) { toast.error('Could not create payment order'); return; }

      await openCashfreeForOrder(
        orderRes.data.data,
        { description: `${plan.name} plan (${cycle})`, prefill: orderRes.data.data.prefill },
        async (orderId) => {
          const v = await api.post('/payment/confirm', { order_id: orderId });
          if (!v.data.success || v.data.data.status !== 'paid') throw new Error('Payment not completed');
        },
      );

      toast.success('Plan upgraded successfully!');
      const vendorRes = await api.get(endpoints.vendorMyPlan);
      if (vendorRes.data.success)
        setCurrent({ ...vendorRes.data.data, price: Number(vendorRes.data.data.price) });
    } catch (err: any) {
      const msg = err.response?.data?.error ?? err?.message ?? 'Payment failed';
      toast.error(msg);
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
            Current plan: <span className="font-semibold text-[var(--primary)] capitalize">{current?.name ?? 'Free'}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-[var(--surface-2)] p-1 rounded-xl border border-[var(--border)] w-fit mb-5">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.slug === current?.subscription_plan;
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
                {(() => {
                  const useAnnual = billingCycle === 'annual' && plan.annual_price != null;
                  const displayPrice = useAnnual ? plan.annual_price! : plan.price;
                  const monthlyEquivalent = useAnnual ? Math.round(plan.annual_price! / 12) : null;
                  return (
                    <>
                      <div className="flex items-baseline gap-1 mt-1">
                        {plan.price === 0 ? (
                          <span className="font-heading font-bold text-2xl text-[var(--text)]">Free</span>
                        ) : (
                          <>
                            <span className="text-sm text-[var(--text-muted)]">₹</span>
                            <span className="font-heading font-bold text-2xl text-[var(--text)]">{displayPrice.toLocaleString()}</span>
                            <span className="text-xs text-[var(--text-muted)]">{useAnnual ? '/yr' : '/mo'}</span>
                          </>
                        )}
                      </div>
                      {useAnnual && monthlyEquivalent != null && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                          ≈ ₹{monthlyEquivalent.toLocaleString()}/mo — 2 months free
                        </p>
                      )}
                      {billingCycle === 'annual' && plan.annual_price == null && plan.price > 0 && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Billed monthly only</p>
                      )}
                    </>
                  );
                })()}
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {plan.max_offers === -1 ? 'Unlimited' : plan.max_offers} offers · {billingCycle === 'annual' && plan.annual_price != null ? 365 : plan.duration_days} days
                </p>
              </div>

              <ul className="flex-1 space-y-2">
                {(plan.features ?? []).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                    <Check size={12} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(plan)}
                disabled={isCurrent || paying}
                className={`btn w-full ${isCurrent ? 'btn-secondary opacity-60 cursor-default' : plan.slug === 'growth' || plan.slug === 'pro' ? 'btn-primary' : 'btn-secondary'}`}
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
