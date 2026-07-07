import { Link } from 'react-router-dom';
import BackButton from '../../components/BackButton';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { ErrorState, EmptyState } from '../../components/ui/EmptyState';
import { useState, useEffect } from 'react';
import { Users, TrendingUp, MousePointer, Bookmark, Star, Store } from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { AudienceData } from '../../types';
import { useVendorId } from '../../hooks/useVendorId';
import { useCachedApi } from '../../hooks/useCachedApi';
import { api, endpoints } from '../../utils/api';

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } } };


interface Review {
  id: number; rating: number; comment: string | null;
  createdAt: string; userName: string; userAvatar: string | null; offerTitle: string;
  vendorReply?: string | null; repliedAt?: string | null;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <Star key={s} size={12} className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-[var(--border)]'} />
      ))}
    </div>
  );
}

function ReplyBox({ review, onReplied }: { readonly review: Review; readonly onReplied: () => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(review.vendorReply ?? '');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await api.put(`/vendor/reviews/${review.id}/reply`, { reply: text.trim() });
      if (res.data.success) { setEditing(false); onReplied(); }
    } finally { setBusy(false); }
  };

  if (!editing && review.vendorReply) {
    return (
      <div className="mt-2 p-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-wide">Your reply</span>
          <button onClick={() => setEditing(true)} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--primary)]">Edit</button>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{review.vendorReply}</p>
      </div>
    );
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)}
        className="mt-2 text-[11px] font-semibold text-[var(--primary)] hover:underline">
        ↩ Reply to this review
      </button>
    );
  }

  return (
    <div className="mt-2 flex gap-2">
      <input
        className="input flex-1 text-xs py-1.5"
        placeholder="Write a public reply…"
        value={text}
        maxLength={1000}
        onChange={(e) => setText(e.target.value)}
      />
      <button onClick={submit} disabled={busy} className="btn btn-primary btn-sm text-xs">
        {busy ? '…' : 'Send'}
      </button>
      <button onClick={() => setEditing(false)} className="btn btn-secondary btn-sm text-xs">Cancel</button>
    </div>
  );
}

export default function AudienceInsights() {
  const [days, setDays] = useState(30);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewLoading, setReviewLoading] = useState(false);

  const loadReviews = (page: number) => {
    setReviewLoading(true);
    api.get(endpoints.vendorReviews(page)).then((r) => {
      if (r.data.success) {
        setReviews(r.data.data);
        setReviewTotal(r.data.total ?? 0);
        setReviewPage(page);
      }
    }).finally(() => setReviewLoading(false));
  };

  // Load reviews once on mount
  useEffect(() => { loadReviews(1); }, []);

  const vendorId = useVendorId();

  const { data: raw, loading, error } = useCachedApi<any>(
    vendorId ? endpoints.audience(vendorId, days) : '',
  );

  const data: AudienceData | null = raw ? {
    deviceBreakdown:  raw.device_breakdown,
    peakHours:        raw.peak_hours,
    topCities:        raw.top_cities,
    engagementRate:   raw.engagement_rate,
    totalImpressions: raw.total_impressions,
    totalClicks:      raw.total_clicks,
    totalSaves:       raw.total_saves,
  } : null;

  const hourData  = data ? data.peakHours.map((count, hr) => ({ hour: `${hr}:00`, users: count })) : [];

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
    { label: 'Impressions',    value: data.totalImpressions?.toLocaleString() ?? '0', icon: TrendingUp, accent: '#3B82F6' },
    { label: 'Clicks',         value: data.totalClicks?.toLocaleString()      ?? '0', icon: MousePointer, accent: '#FF6200' },
    { label: 'Saves',          value: data.totalSaves?.toLocaleString()       ?? '0', icon: Bookmark, accent: '#F59E0B' },
    { label: 'Engagement',     value: `${data.engagementRate ?? 0}%`,                 icon: Users, accent: '#10B981' },
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

      {/* KPI row */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {kpis.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="card p-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${accent}18` }}>
              <Icon size={17} style={{ color: accent }} />
            </div>
            <div className="font-heading font-bold text-2xl text-[var(--text)]">{value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{label}</div>
          </div>
        ))}
      </motion.div>

      {/* Peak hours */}
      <motion.div variants={fadeUp} className="card p-5">
        <h3 className="font-heading font-semibold text-[var(--text)] text-sm mb-1">Peak Engagement Hours</h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">User activity across the day — post offers when they're most active</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={hourData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="hourGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10B981" stopOpacity={0.20} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval={3} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', fontSize: '0.75rem', color: 'var(--text)' }} />
            <Area type="monotone" dataKey="users" stroke="#10B981" fill="url(#hourGrad)" strokeWidth={2.5} dot={false} name="Active users" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Customer Feedback */}
      <motion.div variants={fadeUp} className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading font-semibold text-[var(--text)] text-sm">Customer Feedback</h3>
            <p className="text-xs text-[var(--text-muted)]">{reviewTotal} review{reviewTotal !== 1 ? 's' : ''} across all offers</p>
          </div>
          <Star size={18} className="text-amber-400 fill-amber-400" />
        </div>
        {reviewLoading ? (
          <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-10 text-sm text-[var(--text-muted)]">
            <Star size={32} className="mx-auto mb-2 opacity-20" />
            No customer reviews yet — they appear after users rate your offers
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="p-3 bg-[var(--surface-2)] rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--primary)]/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {r.userAvatar
                      ? <img src={r.userAvatar} alt="" className="w-full h-full object-cover" />
                      : <span className="text-xs font-bold text-[var(--primary)]">{r.userName?.[0] ?? '?'}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-[var(--text)]">{r.userName}</span>
                      <StarRow rating={r.rating} />
                    </div>
                    {r.offerTitle && (
                      <p className="text-[10px] text-[var(--text-muted)] mb-1 truncate">on "{r.offerTitle}"</p>
                    )}
                    {r.comment && (
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{r.comment}</p>
                    )}
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <ReplyBox review={r} onReplied={() => loadReviews(reviewPage)} />
                  </div>
                </div>
              </div>
            ))}
            {reviewTotal > reviews.length && (
              <button onClick={() => loadReviews(reviewPage + 1)} className="w-full text-sm text-[var(--primary)] font-medium py-2 hover:bg-[var(--surface-2)] rounded-xl transition-colors">
                Load more
              </button>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
