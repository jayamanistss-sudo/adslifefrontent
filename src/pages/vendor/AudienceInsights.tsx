import { Link } from 'react-router-dom';
import BackButton from '../../components/BackButton';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { ErrorState, EmptyState } from '../../components/ui/EmptyState';
import { useState, useEffect } from 'react';
import { Eye, MousePointer, Bookmark, Store, Tag, Users, X, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import type { AudienceData } from '../../types';
import { useVendorId } from '../../hooks/useVendorId';
import { useCachedApi } from '../../hooks/useCachedApi';
import { api, endpoints } from '../../utils/api';

interface InteractionRow {
  id: number;
  created_at: string;
  offer_id: number;
  offer_title: string;
  user_name: string;
}

interface FollowerRow {
  id: number;
  name: string;
  city: string | null;
  followed_at: string;
}

const ACTION_LABEL: Record<string, string> = { view: 'Views', click: 'Clicks', save: 'Saves', redeem: 'Redemptions', follower: 'Followers' };

// Inline table, shown/hidden by click — no popup. Views/Clicks/Saves/Redeemed
// share one row shape (InteractionRow); Followers uses a different endpoint
// and row shape, so the two are merged into one {name, meta, date} form here.
function DetailTable({ action, vendorId, onClose }: { readonly action: string; readonly vendorId: number; readonly onClose: () => void }) {
  const isFollowers = action === 'follower';
  const [rows, setRows] = useState<{ id: number; name: string; meta: string; date: string }[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  const load = (p: number) => {
    setLoading(true);
    const req = isFollowers
      ? api.get(endpoints.vendorFollowers(vendorId, 20, p)).then((r) => r.data.success
          ? { rows: (r.data.data.followers as FollowerRow[]).map((f) => ({ id: f.id, name: f.name, meta: f.city ?? '—', date: f.followed_at })), total: r.data.data.total, locked: r.data.data.locked?.subscriber_details }
          : null)
      : api.get(endpoints.audienceInteractions(action, vendorId, p)).then((r) => r.data.success
          ? { rows: (r.data.data.rows as InteractionRow[]).map((row) => ({ id: row.id, name: row.user_name, meta: row.offer_title, date: row.created_at })), total: r.data.data.total, locked: false }
          : { rows: [], total: 0, locked: r.data.code === 'PLAN_FEATURE_LOCKED' });
    req.then((res) => {
      if (res) {
        setRows((prev) => p === 1 ? res.rows : [...prev, ...res.rows]);
        setTotal(res.total);
        setPage(p);
        setLocked(!!res.locked);
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, [action]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="card p-0 overflow-hidden mb-6"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <div className="flex flex-col">
          <h2 className="font-heading font-bold text-[var(--text)]">{ACTION_LABEL[action] ?? action}</h2>
          <span className="block w-8 h-[2.5px] bg-[var(--primary)] rounded-full mt-1" />
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors" aria-label="Close">
          <X size={18} />
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <div className="p-5 space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-10 rounded-xl" />)}</div>
      ) : locked ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-[var(--text-muted)]">
          <span>This detail view isn't included in your current plan</span>
          <Link to="/vendor/select-plan" className="text-xs font-bold text-[var(--primary)] px-3 py-1.5 rounded-full border border-[var(--primary)]/30 hover:bg-[var(--primary)]/10 transition-colors">Upgrade to unlock</Link>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-10">Nothing here yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-[var(--text-muted)] uppercase tracking-wide border-b border-[var(--border)]">
                <th className="px-5 py-2.5 font-semibold">User</th>
                <th className="px-5 py-2.5 font-semibold">{isFollowers ? 'City' : 'Offer'}</th>
                <th className="px-5 py-2.5 font-semibold text-right">{isFollowers ? 'Followed' : 'Date'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors">
                  <td className="px-5 py-3 font-medium text-[var(--text)] truncate max-w-[160px]">{r.name}</td>
                  <td className="px-5 py-3 text-[var(--text-secondary)] truncate max-w-[240px]">{r.meta}</td>
                  <td className="px-5 py-3 text-[var(--text-muted)] text-right whitespace-nowrap">
                    {new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > rows.length && (
            <div className="p-3 text-center border-t border-[var(--border)]">
              <button onClick={() => load(page + 1)} disabled={loading} className="text-sm text-[var(--primary)] font-medium py-1.5 px-4 hover:bg-[var(--surface-2)] rounded-xl transition-colors">
                {loading ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } } };

export default function AudienceInsights() {
  const [days, setDays] = useState(30);
  const [detailAction, setDetailAction] = useState<string | null>(null);

  const vendorId = useVendorId();

  const { data: raw, loading, error } = useCachedApi<any>(
    vendorId ? endpoints.audience(vendorId, days) : '',
  );

  const data: AudienceData | null = raw ? {
    peakHours:         raw.peak_hours,
    topCities:         raw.top_cities,
    engagementRate:    raw.engagement_rate,
    totalImpressions:  raw.total_impressions,
    totalClicks:       raw.total_clicks,
    totalSaves:        raw.total_saves,
    totalRedemptions:  raw.total_redemptions,
    followersCount:    raw.followers_count,
    locked:            raw.locked,
  } : null;

  if (!vendorId) return (
    <div className="pb-6">
      <BackButton to="/vendor/dashboard" />
      <EmptyState
        icon="🏪"
        title="You don't have a vendor account yet"
        description="Apply as a vendor to see audience insights for your offers."
        action={<Link to="/become-vendor" className="btn btn-primary btn-sm"><Store size={16} /> Apply as Vendor</Link>}
      />
    </div>
  );

  if (loading) return (
    <div className="pb-6">
      <BackButton to="/vendor/dashboard" />
      <DashboardSkeleton />
    </div>
  );

  if (error || !data) return (
    <div className="pb-6">
      <BackButton to="/vendor/dashboard" />
      <ErrorState description={error || 'No audience data available yet.'} />
    </div>
  );


  const kpis = [
    { label: 'Views',      action: 'view',     value: data.totalImpressions?.toLocaleString() ?? '0', icon: Eye,         accent: '#3B82F6', locked: data.locked?.view_count },
    { label: 'Clicks',     action: 'click',    value: data.totalClicks?.toLocaleString()       ?? '0', icon: MousePointer, accent: '#FF6200', locked: data.locked?.click_count },
    { label: 'Saves',      action: 'save',     value: data.totalSaves?.toLocaleString()        ?? '0', icon: Bookmark,     accent: '#F59E0B', locked: data.locked?.save_count },
    { label: 'Redeemed',   action: 'redeem',   value: data.totalRedemptions?.toLocaleString()   ?? '0', icon: Tag,          accent: '#10B981', locked: data.locked?.redeemed_count },
    { label: 'Followers',  action: 'follower', value: data.followersCount?.toLocaleString()     ?? '0', icon: Users,        accent: '#8B5CF6', locked: data.locked?.subscriber_count },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.07 } } }}
      className="pb-10"
    >
      <BackButton to="/vendor/dashboard" />

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-start justify-between mb-6 mt-1 flex-wrap gap-3">
        <div>
          <h1 className="page-title">Audience Insights</h1>
          <p className="page-subtitle">Who engages with your offers and when</p>
        </div>
        <div className="flex gap-1 bg-[var(--surface-2)] p-1 rounded-xl border border-[var(--border)]">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${days === d
                ? 'bg-[var(--surface)] shadow-sm text-[var(--text)] border border-[var(--border)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
              }`}>
              {d}d
            </button>
          ))}
        </div>
      </motion.div>

      {/* KPI row — tap any tile to see who's behind the number, shown as a table below */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {kpis.map(({ label, action, value, icon: Icon, accent, locked }) => {
          const active = detailAction === action;
          return (
            <div key={label} className="relative overflow-hidden rounded-2xl">
              <button
                onClick={() => !locked && setDetailAction(active ? null : action)}
                className={`card card-hover p-5 text-left transition-shadow w-full ${active ? 'ring-2 ring-[var(--primary)]' : ''}`}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${accent}18` }}>
                  <Icon size={17} style={{ color: accent }} />
                </div>
                <div
                  className="font-heading font-bold text-2xl text-[var(--text)]"
                  style={locked ? { filter: 'blur(6px)', userSelect: 'none' } : undefined}
                >
                  {value}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{label}</div>
              </button>
              {locked && (
                <Link
                  to="/vendor/select-plan"
                  className="absolute inset-0 flex items-center justify-center bg-white/40 dark:bg-black/40 hover:bg-white/55 dark:hover:bg-black/55 transition-colors"
                >
                  <span className="text-[10px] font-bold bg-[var(--primary)] text-white px-2.5 py-1 rounded-full shadow-sm">Upgrade</span>
                </Link>
              )}
            </div>
          );
        })}
      </motion.div>

      {detailAction && vendorId && (
        <DetailTable action={detailAction} vendorId={vendorId} onClose={() => setDetailAction(null)} />
      )}

      {/* Top Cities — ranked by interaction count, single-hue bar list */}
      <motion.div variants={fadeUp} className="card p-5 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={15} className="text-[var(--primary)]" />
          <h2 className="font-heading font-bold text-sm text-[var(--text)]">Top Cities</h2>
        </div>
        {data.locked?.analytics_city_graph ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-sm text-[var(--text-muted)]">
            <span>This chart isn't included in your current plan</span>
            <Link to="/vendor/select-plan" className="text-xs font-bold text-[var(--primary)] px-3 py-1.5 rounded-full border border-[var(--primary)]/30 hover:bg-[var(--primary)]/10 transition-colors">Upgrade to unlock</Link>
          </div>
        ) : data.topCities && data.topCities.length > 0 ? (
          <div className="space-y-2.5">
            {(() => {
              const max = Math.max(...data.topCities.map((c) => c.count), 1);
              return data.topCities.map((c) => (
                <div key={c.city} className="flex items-center gap-3">
                  <span className="text-xs text-[var(--text-secondary)] w-24 truncate flex-shrink-0">{c.city}</span>
                  <div className="flex-1 h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--primary)]"
                      style={{ width: `${Math.max((c.count / max) * 100, 4)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-[var(--text)] w-10 text-right tabular-nums flex-shrink-0">{c.count}</span>
                </div>
              ));
            })()}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">No city data yet</p>
        )}
      </motion.div>
    </motion.div>
  );
}
