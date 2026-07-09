import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import BackButton from '../../components/BackButton';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { ErrorState, EmptyState } from '../../components/ui/EmptyState';
import { useState, useEffect } from 'react';
import { Eye, MousePointer, Bookmark, Star, Store, Tag, X } from 'lucide-react';
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

const ACTION_LABEL: Record<string, string> = { view: 'Views', click: 'Clicks', save: 'Saves', redeem: 'Redemptions' };

function DetailModal({ action, vendorId, onClose }: { readonly action: string; readonly vendorId: number; readonly onClose: () => void }) {
  const [rows, setRows] = useState<InteractionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = (p: number) => {
    setLoading(true);
    api.get(endpoints.audienceInteractions(action, vendorId, p)).then((r) => {
      if (r.data.success) {
        setRows((prev) => p === 1 ? r.data.data.rows : [...prev, ...r.data.data.rows]);
        setTotal(r.data.data.total);
        setPage(p);
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, [action]); // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-content max-w-lg">
        <div className="modal-header">
          <div className="flex flex-col">
            <h2 className="modal-title">{ACTION_LABEL[action] ?? action}</h2>
            <span className="block w-8 h-[2.5px] bg-[var(--primary)] rounded-full mt-1" />
          </div>
          <button onClick={onClose} className="modal-close"><X size={18} /></button>
        </div>
        <div className="modal-body">
          {loading && rows.length === 0 ? (
            <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-8">Nothing here yet</p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 p-2.5 bg-[var(--surface-2)] rounded-xl">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text)] truncate">{r.user_name}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{r.offer_title}</p>
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] flex-shrink-0">
                    {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
              {total > rows.length && (
                <button onClick={() => load(page + 1)} disabled={loading} className="w-full text-sm text-[var(--primary)] font-medium py-2 hover:bg-[var(--surface-2)] rounded-xl transition-colors">
                  {loading ? 'Loading…' : 'Load more'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

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
  const [detailAction, setDetailAction] = useState<string | null>(null);
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
    deviceBreakdown:   raw.device_breakdown,
    peakHours:         raw.peak_hours,
    topCities:         raw.top_cities,
    engagementRate:    raw.engagement_rate,
    totalImpressions:  raw.total_impressions,
    totalClicks:       raw.total_clicks,
    totalSaves:        raw.total_saves,
    totalRedemptions:  raw.total_redemptions,
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
    { label: 'Views',      action: 'view',   value: data.totalImpressions?.toLocaleString() ?? '0', icon: Eye,         accent: '#3B82F6' },
    { label: 'Clicks',     action: 'click',  value: data.totalClicks?.toLocaleString()       ?? '0', icon: MousePointer, accent: '#FF6200' },
    { label: 'Saves',      action: 'save',   value: data.totalSaves?.toLocaleString()        ?? '0', icon: Bookmark,     accent: '#F59E0B' },
    { label: 'Redeemed',   action: 'redeem', value: data.totalRedemptions?.toLocaleString()   ?? '0', icon: Tag,          accent: '#10B981' },
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

      {/* KPI row — tap any tile to see who's behind the number */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {kpis.map(({ label, action, value, icon: Icon, accent }) => (
          <button key={label} onClick={() => setDetailAction(action)} className="card card-hover p-5 text-left">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${accent}18` }}>
              <Icon size={17} style={{ color: accent }} />
            </div>
            <div className="font-heading font-bold text-2xl text-[var(--text)]">{value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{label}</div>
          </button>
        ))}
      </motion.div>

      {detailAction && vendorId && (
        <DetailModal action={detailAction} vendorId={vendorId} onClose={() => setDetailAction(null)} />
      )}

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
