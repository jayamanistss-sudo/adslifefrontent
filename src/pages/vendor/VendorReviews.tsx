import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { motion } from 'framer-motion';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';

interface Review {
  id: number; rating: number; comment: string | null;
  createdAt: string; userName: string; userAvatar: string | null; offerTitle: string;
  vendorReply?: string | null; repliedAt?: string | null;
}

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } } };

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
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

export default function VendorReviews() {
  const [reviewPage, setReviewPage] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewLoading, setReviewLoading] = useState(false);

  const loadReviews = (page: number) => {
    setReviewLoading(true);
    api.get(endpoints.vendorReviews(page)).then((r) => {
      if (r.data.success) {
        // Was unconditionally replacing the list — every "Load more" click
        // discarded the previous page's reviews instead of accumulating,
        // so the list never grew past one page.
        setReviews((prev) => (page === 1 ? r.data.data : [...prev, ...r.data.data]));
        setReviewTotal(r.data.total ?? 0);
        setReviewPage(page);
      }
    }).finally(() => setReviewLoading(false));
  };

  useEffect(() => { loadReviews(1); }, []);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.07 } } }}
      className="pb-10"
    >
      <BackButton to="/vendor/dashboard" />

      <motion.div variants={fadeUp} className="mb-6 mt-1">
        <h1 className="page-title">Reviews</h1>
        <p className="page-subtitle">What customers are saying about your offers</p>
      </motion.div>

      <motion.div variants={fadeUp} className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading font-semibold text-[var(--text)] text-sm">Customer Feedback</h3>
            <p className="text-xs text-[var(--text-muted)]">{reviewTotal} review{reviewTotal !== 1 ? 's' : ''} across all offers</p>
          </div>
          <Star size={18} className="text-amber-400 fill-amber-400" />
        </div>
        {reviewLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
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
