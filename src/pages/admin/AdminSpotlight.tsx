import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Star, Play } from 'lucide-react';
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
    pending:  'bg-amber-50 text-amber-600',
    approved: 'bg-emerald-50 text-emerald-600',
    rejected: 'bg-red-50 text-red-500',
  }[s] ?? 'bg-gray-100 text-gray-500');

  return (
    <div className="pb-8">
      <BackButton to="/admin/dashboard" label="Admin Panel" />
      <div className="page-header mb-5">
        <div>
          <h1 className="page-title">Spotlight Requests</h1>
          <p className="page-subtitle">{total} {filter} requests</p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {['pending', 'approved', 'rejected', ''].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${filter === s ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Review modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="font-heading font-bold text-lg text-gray-900 mb-1">{selected.title}</h2>
            <p className="text-sm text-gray-500 mb-3">{selected.business_name} · {selected.city}</p>
            {selected.tagline && <p className="text-sm italic text-gray-600 mb-3">"{selected.tagline}"</p>}
            {selected.video_url && (
              <a href={selected.video_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary text-sm mb-4 hover:underline">
                <Play size={14} /> Watch video
              </a>
            )}
            {selected.offer_title && (
              <p className="text-xs text-gray-500 mb-4">Offer: {selected.offer_title} ({selected.discount_percent}% off)</p>
            )}
            <textarea className="input w-full resize-none mb-4" rows={2} placeholder="Review note (optional)…"
              value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex gap-3">
              <button onClick={() => action(selected.id, 'approve')}
                className="flex-1 btn btn-primary flex items-center justify-center gap-2">
                <CheckCircle size={15} /> Approve
              </button>
              <button onClick={() => action(selected.id, 'reject')}
                className="flex-1 btn btn-danger flex items-center justify-center gap-2">
                <XCircle size={15} /> Reject
              </button>
              <button onClick={() => { setSelected(null); setNote(''); }}
                className="btn btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
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
              <p className="text-xs bg-gray-50 rounded-lg p-2 text-gray-500">Note: {r.review_note}</p>
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
