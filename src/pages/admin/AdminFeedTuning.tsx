/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { Sliders, RotateCcw, Save, Eye } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import { useUserStore } from '../../store/useUserStore';
import toast from 'react-hot-toast';

// Every one of these ~15 weights was a hardcoded constant in feed.service.ts
// — the single algorithm that decides what every user sees first had zero
// admin tuning surface. Gated to super-admins given the blast radius.

interface FeedWeights {
  distance_tier1: number; distance_tier2: number; distance_tier3: number;
  distance_tier4: number; distance_tier5: number; distance_no_location: number;
  category_preferred: number; category_has: number; vendor_preferred: number;
  recency_1day: number; recency_3day: number; recency_7day: number; recency_default: number;
  discount_max_weight: number; featured_bonus: number;
  trending_view_weight: number; trending_click_weight: number; trending_save_weight: number;
  filter_flash_min_discount: number; filter_trending_min_views: number; filter_ending_soon_days: number;
  plan_tier_starter: number; plan_tier_growth: number; plan_tier_pro: number;
}

interface PreviewOffer { id: number; title: string; score: string; business_name: string }

const FIELD_GROUPS: { title: string; fields: { key: keyof FeedWeights; label: string; step?: number }[] }[] = [
  {
    title: 'Distance',
    fields: [
      { key: 'distance_tier1', label: '≤ 1 km', step: 0.01 },
      { key: 'distance_tier2', label: '≤ 5 km', step: 0.01 },
      { key: 'distance_tier3', label: '≤ 10 km', step: 0.01 },
      { key: 'distance_tier4', label: '≤ 20 km', step: 0.01 },
      { key: 'distance_tier5', label: '> 20 km', step: 0.01 },
      { key: 'distance_no_location', label: 'No location available', step: 0.01 },
    ],
  },
  {
    title: 'Category & Vendor Preference',
    fields: [
      { key: 'category_preferred', label: "User's preferred category", step: 0.01 },
      { key: 'category_has', label: 'Has any category', step: 0.01 },
      { key: 'vendor_preferred', label: "User's preferred/followed vendor", step: 0.01 },
    ],
  },
  {
    title: 'Recency',
    fields: [
      { key: 'recency_1day', label: 'Posted within 1 day', step: 0.01 },
      { key: 'recency_3day', label: 'Posted within 3 days', step: 0.01 },
      { key: 'recency_7day', label: 'Posted within 7 days', step: 0.01 },
      { key: 'recency_default', label: 'Older', step: 0.01 },
    ],
  },
  {
    title: 'Discount & Featured',
    fields: [
      { key: 'discount_max_weight', label: 'Max discount bonus (at 100% off)', step: 0.01 },
      { key: 'featured_bonus', label: 'Featured offer bonus', step: 0.01 },
    ],
  },
  {
    title: 'Trending Sort (views + clicks + saves)',
    fields: [
      { key: 'trending_view_weight', label: 'Per view', step: 1 },
      { key: 'trending_click_weight', label: 'Per click', step: 1 },
      { key: 'trending_save_weight', label: 'Per save', step: 1 },
    ],
  },
  {
    title: 'Quick Filter Thresholds',
    fields: [
      { key: 'filter_flash_min_discount', label: '"Flash" min discount %', step: 1 },
      { key: 'filter_trending_min_views', label: '"Trending" min views', step: 1 },
      { key: 'filter_ending_soon_days', label: '"Ending Soon" within N days', step: 1 },
    ],
  },
  {
    title: 'Plan Tier Boost (Search Ranking)',
    fields: [
      { key: 'plan_tier_starter', label: 'Starter plan', step: 0.01 },
      { key: 'plan_tier_growth', label: 'Growth plan', step: 0.01 },
      { key: 'plan_tier_pro', label: 'Pro plan', step: 0.01 },
    ],
  },
];

export default function AdminFeedTuning() {
  const currentUser = useUserStore((s) => s.user);
  const isSuper = currentUser?.adminRole === 'super';

  const [weights, setWeights] = useState<FeedWeights | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<PreviewOffer[] | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(endpoints.adminFeedConfig)
      .then((r) => { if (r.data.success) setWeights(r.data.data); })
      .catch(() => toast.error('Failed to load feed config'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (key: keyof FeedWeights, value: number) => {
    if (!weights) return;
    setWeights({ ...weights, [key]: value });
  };

  const save = async () => {
    if (!weights) return;
    setSaving(true);
    try {
      await api.put(endpoints.adminFeedConfig, weights);
      toast.success('Feed weights updated — live immediately (30s cache)');
      loadPreview();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Only super-admins can change this');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm('Reset all feed weights to their original defaults?')) return;
    setSaving(true);
    try {
      const res = await api.put(endpoints.adminFeedConfigReset, {});
      setWeights(res.data.data);
      toast.success('Reset to defaults');
      loadPreview();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const loadPreview = () => {
    setPreviewing(true);
    // Chennai center — matches the app's existing hardcoded fallback location.
    api.get(endpoints.feed(0, 13.0827, 80.2707, 1, 10))
      .then((r) => { if (r.data.success) setPreview(r.data.data ?? []); })
      .catch(() => toast.error('Preview failed'))
      .finally(() => setPreviewing(false));
  };

  if (loading || !weights) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="pb-8">
      <BackButton to="/admin/dashboard" label="Admin Panel" />
      <div className="page-header mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
            <Sliders size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="page-title">Feed Tuning</h1>
            <p className="page-subtitle">The algorithm that decides what every user sees first — changes are immediate</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} disabled={saving || !isSuper} className="btn btn-secondary btn-sm">
            <RotateCcw size={14} /> Reset to Defaults
          </button>
          <button onClick={save} disabled={saving || !isSuper} className="btn btn-primary btn-sm">
            <Save size={14} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {!isSuper && (
        <div className="mb-5 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30 text-xs text-amber-700 dark:text-amber-300">
          You can view these weights, but only a super-admin can change them — this is the highest blast-radius setting in the app.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {FIELD_GROUPS.map((group) => (
          <div key={group.title} className="card p-5">
            <h3 className="font-heading font-semibold text-sm text-[var(--text)] mb-4">{group.title}</h3>
            <div className="space-y-3">
              {group.fields.map((f) => (
                <div key={f.key} className="flex items-center justify-between gap-3">
                  <label className="text-xs text-[var(--text-secondary)]">{f.label}</label>
                  <input
                    type="number"
                    step={f.step ?? 0.01}
                    className="input text-xs py-1 w-24 text-right"
                    value={weights[f.key]}
                    disabled={!isSuper}
                    onChange={(e) => set(f.key, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-semibold text-sm text-[var(--text)] flex items-center gap-2">
            <Eye size={15} className="text-primary" /> Live Preview — Top 10 (Chennai reference point)
          </h3>
          <button onClick={loadPreview} disabled={previewing} className="btn btn-secondary btn-sm">
            {previewing ? 'Loading…' : 'Refresh Preview'}
          </button>
        </div>
        {preview === null ? (
          <div className="card p-6 text-center text-[var(--text-muted)] text-sm">Click "Refresh Preview" to see the current top-10 feed order</div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[var(--surface-2)] text-[var(--text-muted)]">
                  <th className="text-left px-4 py-2.5 font-semibold">#</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Offer</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Vendor</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {preview.map((o, i) => (
                  <tr key={o.id}>
                    <td className="px-4 py-2.5 text-[var(--text-muted)]">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium">{o.title}</td>
                    <td className="px-4 py-2.5 text-[var(--text-muted)]">{o.business_name}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-primary">{o.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
