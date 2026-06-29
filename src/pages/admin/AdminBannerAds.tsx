import { useState, useEffect } from 'react';
import { Image, Video, CheckCircle, XCircle } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';

interface BannerAd {
  id: number; business_name: string; title: string | null; image_url: string; media_type: string; target_url: string;
  duration_days: number; banner_plan_id: number | null; plan_name: string | null;
  price: number | null; position: string;
  status: string; review_note: string; expires_at: string | null; created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'badge-warning', approved: 'badge-accent', rejected: 'badge-danger',
  live: 'badge-accent', expired: 'badge-neutral',
};

const POSITION_LABELS: Record<string, string> = {
  top: 'Top Banner', mid: 'Mid Page', bottom: 'Bottom Banner', any: 'Any Position',
};

export default function AdminBannerAds() {
  const [ads, setAds]           = useState<BannerAd[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [noteMap, setNoteMap]   = useState<Record<number, string>>({});

  const load = () => {
    setLoading(true);
    api.get(endpoints.bannerListAdmin).then((r) => {
      if (r.data.success) {
        const all = r.data.data as BannerAd[];
        setAds(filter ? all.filter((a) => a.status === filter) : all);
      }
    }).finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  const handleAction = async (adId: number, action: string) => {
    setReviewing(adId);
    try {
      const res = await api.post(endpoints.bannerReview(adId), {
        status: action, note: noteMap[adId] ?? '',
      });
      if (res.data.success) { toast.success(`Ad ${action}`); load(); setExpanded(null); }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Action failed');
    } finally {
      setReviewing(null);
    }
  };

  return (
    <div className="max-w-4xxl pb-6">
      <BackButton to="/admin/dashboard" />

      <div className="page-header">
        <div>
          <h1 className="page-title">Banner Ad Requests</h1>
          <p className="page-subtitle">Review and approve banner advertisement requests</p>
        </div>
        <span className="badge badge-warning">{ads.filter((a) => a.status === 'pending').length} pending</span>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { v: '',         l: 'All' },
          { v: 'pending',  l: 'Pending' },
          { v: 'approved', l: 'Approved' },
          { v: 'live',     l: 'Live' },
          { v: 'rejected', l: 'Rejected' },
        ].map(({ v, l }) => (
          <button key={v} onClick={() => setFilter(v)} className={`filter-tab ${filter === v ? 'active' : ''}`}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : ads.length === 0 ? (
        <div className="card p-10 text-center">
          <Image size={36} className="mx-auto text-[var(--text-muted)] mb-3" />
          <p className="font-heading font-semibold text-[var(--text-secondary)]">No banner ad requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ads.map((ad) => (
            <div key={ad.id} className="card overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === ad.id ? null : ad.id)}
                className="w-full flex items-start gap-4 p-4 text-left hover:bg-[var(--surface-2)] transition-colors"
              >
                {ad.image_url ? (
                  ad.media_type === 'video' ? (
                    <video src={ad.image_url} className="w-14 h-10 rounded-lg object-cover flex-shrink-0" muted />
                  ) : (
                    <img src={ad.image_url} alt="" className="w-14 h-10 rounded-lg object-cover flex-shrink-0" />
                  )
                ) : (
                  <div className="w-14 h-10 rounded-lg bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0">
                    <Image size={16} className="text-[var(--text-muted)]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-heading font-semibold text-[var(--text)] text-sm">{ad.title ?? ad.plan_name ?? 'Banner Ad'}</span>
                    <span className={`badge ${STATUS_STYLE[ad.status] ?? 'badge-neutral'}`}>{ad.status}</span>
                    <span className="badge badge-neutral">{POSITION_LABELS[ad.position] ?? ad.position}</span>
                    {ad.media_type === 'video' && <span className="badge badge-neutral flex items-center gap-1"><Video size={10} /> Video</span>}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {ad.business_name} · {ad.plan_name ? `${ad.plan_name} · ` : ''}₹{ad.price != null ? Number(ad.price).toLocaleString() : 0} · {ad.duration_days}d · {new Date(ad.created_at).toLocaleDateString()}
                  </p>
                </div>
              </button>

              {expanded === ad.id && (
                <div className="border-t border-[var(--border)] p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-xs text-[var(--text-muted)]">
                    {ad.expires_at && <span>Expires: {new Date(ad.expires_at).toLocaleDateString()}</span>}
                    {ad.target_url && (
                      <a href={ad.target_url} target="_blank" rel="noreferrer" className="text-[var(--primary)] hover:underline col-span-2 truncate">{ad.target_url}</a>
                    )}
                  </div>

                  {ad.status === 'pending' && (
                    <>
                      <div>
                        <label htmlFor={`bn-note-${ad.id}`} className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Admin Note</label>
                        <textarea id={`bn-note-${ad.id}`} className="input h-16 resize-none text-sm" placeholder="Optional note…"
                          value={noteMap[ad.id] ?? ''}
                          onChange={(e) => setNoteMap((m) => ({ ...m, [ad.id]: e.target.value }))} />
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => handleAction(ad.id, 'approved')} disabled={reviewing === ad.id} className="btn btn-primary flex-1">
                          <CheckCircle size={15} /> {reviewing === ad.id ? 'Processing…' : 'Approve'}
                        </button>
                        <button onClick={() => handleAction(ad.id, 'rejected')} disabled={reviewing === ad.id} className="btn btn-danger flex-1">
                          <XCircle size={15} /> Reject
                        </button>
                      </div>
                    </>
                  )}
                  {ad.review_note && ad.status !== 'pending' && (
                    <div className="bg-[var(--surface-2)] rounded-xl p-3">
                      <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">Admin Note</p>
                      <p className="text-sm text-[var(--text-secondary)]">{ad.review_note}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
