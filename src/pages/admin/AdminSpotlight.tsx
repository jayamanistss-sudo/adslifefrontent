import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, Star, Play, X } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';

interface SpotlightRow {
  id: number; title: string; tagline: string; video_url: string;
  status: string; created_at: string; reviewed_at: string | null; review_note: string | null;
  business_name: string; city: string; subscription_plan: string; vendor_email: string;
  offer_title: string | null; discount_percent: string | null;
}

export default function AdminSpotlight() {
  const [rows, setRows]       = useState<SpotlightRow[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('pending');
  const [selected, setSelected] = useState<SpotlightRow | null>(null);
  const [note, setNote]       = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get(endpoints.adminSpotlight(filter))
      .then((r) => {
        if (r.data.success) { setRows(r.data.data.requests); setTotal(r.data.data.total); }
      }).finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const action = async (id: number, act: 'approve' | 'reject') => {
    try {
      const res = await api.post(endpoints.adminSpotlightAction(id), { status: act, duration_days: 7 });
      toast.success(res.data.message);
      setSelected(null);
      setNote('');
      load();
    } catch { toast.error('Action failed'); }
  };

  const statusColor = (s: string) => ({
    pending:  'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-300',
    approved: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300',
    rejected: 'bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400',
  }[s] ?? 'bg-[var(--surface-2)] text-[var(--text-muted)]');

  return (
    <div className="pb-8">
      <BackButton to="/admin/dashboard" label="Admin Panel" />
      <div className="page-header mb-5">
        <div>
          <h1 className="page-title">Spotlight Requests</h1>
          <p className="page-subtitle">{total} {filter} requests</p>
        </div>
        <div className="flex gap-1 bg-[var(--surface-2)] p-1 rounded-xl">
          {['pending', 'approved', 'rejected', ''].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${filter === s ? 'bg-[var(--surface)] shadow text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Review modal */}
      {selected && createPortal(
        <div className="modal-overlay">
          <div className="modal-content max-w-lg">
            <div className="modal-header">
              <div className="flex flex-col">
                <h2 className="modal-title">Review Request</h2>
                <span className="block w-8 h-[2.5px] bg-[var(--primary)] rounded-full mt-1"></span>
              </div>
              <button onClick={() => { setSelected(null); setNote(''); }} className="modal-close">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body space-y-4">
              <div>
                <h3 className="font-bold text-base text-[var(--text)]">{selected.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{selected.business_name} · {selected.city}</p>
              </div>

              {selected.tagline && (
                <div className="bg-[var(--surface-2)] border border-[var(--border)] p-3 rounded-xl">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-secondary)] block mb-1">Tagline</span>
                  <p className="text-xs italic text-[var(--text)]">"{selected.tagline}"</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selected.video_url && (
                  <a
                    href={selected.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-[var(--primary)]/5 border border-[var(--primary)]/20 px-3 py-2 rounded-xl text-[var(--primary)] text-xs font-semibold hover:bg-[var(--primary)]/10 transition-colors"
                  >
                    <Play size={14} fill="currentColor" /> Watch Spotlight Video
                  </a>
                )}
                {selected.offer_title && (
                  <div className="bg-[var(--surface-2)] border border-[var(--border)] px-3 py-2 rounded-xl flex flex-col justify-center">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--text-secondary)]">Associated Offer</span>
                    <span className="text-xs text-[var(--text)] truncate font-semibold">
                      {selected.offer_title} ({selected.discount_percent}% off)
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="modal-label">Review Note (Optional)</label>
                <textarea
                  className="input w-full resize-none rounded-xl"
                  rows={3}
                  placeholder="Type any reason or feedback for the vendor..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer flex-col sm:flex-row sm:justify-between gap-3">
              <button
                onClick={() => { setSelected(null); setNote(''); }}
                className="btn btn-secondary w-full sm:w-auto px-5 py-2.5"
              >
                Cancel
              </button>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => action(selected.id, 'reject')}
                  className="btn btn-danger flex-1 sm:flex-initial px-5 py-2.5 flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  <XCircle size={15} /> Reject
                </button>
                <button
                  onClick={() => action(selected.id, 'approve')}
                  className="btn btn-primary flex-1 sm:flex-initial px-5 py-2.5 flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  <CheckCircle size={15} /> Approve
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-5"><div className="skeleton h-32 rounded-xl" /></div>
        )) : rows.map((r) => (
          <div key={r.id} className="card p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--text)] truncate">{r.title}</p>
                <p className="text-xs text-[var(--text-muted)]">{r.business_name} · {r.city}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor(r.status)}`}>
                {r.status}
              </span>
            </div>

            {r.tagline && <p className="text-xs italic text-[var(--text-muted)]">"{r.tagline}"</p>}

            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <span className="capitalize font-medium text-[var(--text)]">{r.subscription_plan}</span>
              <span>·</span>
              <span>{r.created_at.slice(0, 10)}</span>
            </div>

            {r.review_note && (
              <p className="text-xs bg-[var(--surface-2)] rounded-lg p-2 text-[var(--text-muted)]">Note: {r.review_note}</p>
            )}

            <div className="flex gap-2 mt-auto">
              {r.status === 'pending' && (
                <button onClick={() => { setSelected(r); setNote(''); }}
                  className="flex-1 btn btn-primary btn-sm flex items-center justify-center gap-1.5">
                  <Star size={12} /> Review
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {rows.length === 0 && !loading && (
        <div className="card p-12 text-center text-[var(--text-muted)]">
          <Star size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No {filter || ''} spotlight requests</p>
        </div>
      )}
    </div>
  );
}
