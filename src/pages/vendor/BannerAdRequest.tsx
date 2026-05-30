import { useState, useEffect, useRef } from 'react';
import { Image, Clock, Plus, Upload, X } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';

interface BannerAd {
  id: number; title: string; description: string; image_url: string;
  budget: number; start_date: string; end_date: string; placement: string;
  status: string; admin_note: string; created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending:  'badge-warning',
  approved: 'badge-accent',
  rejected: 'badge-danger',
  live:     'badge-accent',
  expired:  'badge-neutral',
};

export default function BannerAdRequest() {
  const [ads, setAds]         = useState<BannerAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: '', description: '', image_url: '', target_url: '',
    budget: '', start_date: '', end_date: '', placement: 'feed_top',
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post(endpoints.uploadImage, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) {
        setForm((f) => ({ ...f, image_url: res.data.data.url as string }));
        toast.success('Image uploaded!');
      }
    } catch {
      toast.error('Upload failed — max 5 MB');
    } finally {
      setUploading(false);
    }
  };

  const load = () => {
    setLoading(true);
    api.get(endpoints.bannerList).then((r) => {
      if (r.data.success) setAds(r.data.data);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!form.title) return;
    setSubmitting(true);
    try {
      const res = await api.post(endpoints.bannerRequest, {
        ...form, budget: parseFloat(form.budget) || 0,
      });
      if (res.data.success) {
        toast.success('Banner ad request submitted!');
        setShowForm(false);
        setForm({ title: '', description: '', image_url: '', target_url: '', budget: '', start_date: '', end_date: '', placement: 'feed_top' });
        load();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xxl pb-6">
      <BackButton to="/vendor/dashboard" />

      <div className="page-header">
        <div>
          <h1 className="page-title">Banner Ad Requests</h1>
          <p className="page-subtitle">Submit and track your banner advertisement requests</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">
          <Plus size={14} /> New Request
        </button>
      </div>

      {/* New request form */}
      {showForm && (
        <div className="card p-5 mb-6 animate-slide-up">
          <h3 className="font-heading font-semibold text-[var(--text)] mb-4">New Banner Ad Request</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ba-title" className="block text-sm font-medium text-[var(--text)] mb-1.5">Ad Title *</label>
                <input id="ba-title" className="input" placeholder="Summer Sale Banner" required
                  value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="ba-placement" className="block text-sm font-medium text-[var(--text)] mb-1.5">Placement</label>
                <select id="ba-placement" className="input"
                  value={form.placement} onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value }))}>
                  <option value="feed_top">Feed Top</option>
                  <option value="feed_mid">Feed Middle</option>
                  <option value="sidebar">Sidebar</option>
                  <option value="splash">Splash Screen</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="ba-desc" className="block text-sm font-medium text-[var(--text)] mb-1.5">Description</label>
              <textarea id="ba-desc" className="input h-20 resize-none" placeholder="What is this ad about?"
                value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Banner Image</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="relative border-2 border-dashed border-[var(--border)] rounded-xl overflow-hidden cursor-pointer hover:border-[var(--primary)] transition-colors bg-[var(--surface-2)]"
                  style={{ height: '80px' }}
                >
                  {form.image_url ? (
                    <>
                      <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setForm((f) => ({ ...f, image_url: '' })); }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80"
                      >
                        <X size={11} className="text-white" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-1 text-[var(--text-muted)]">
                      {uploading ? <Upload size={16} className="animate-bounce" /> : <Upload size={16} />}
                      <span className="text-xs">{uploading ? 'Uploading…' : 'Click to upload'}</span>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload} />
                <p className="text-xs text-[var(--text-muted)] mt-1">JPG, PNG or WebP · Max 5 MB</p>
              </div>
              <div>
                <label htmlFor="ba-target" className="block text-sm font-medium text-[var(--text)] mb-1.5">Target URL</label>
                <input id="ba-target" className="input" placeholder="https://..." type="url"
                  value={form.target_url} onChange={(e) => setForm((f) => ({ ...f, target_url: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="ba-budget" className="block text-sm font-medium text-[var(--text)] mb-1.5">Budget (₹)</label>
                <input id="ba-budget" className="input" type="number" min="0" placeholder="5000"
                  value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="ba-start" className="block text-sm font-medium text-[var(--text)] mb-1.5">Start Date</label>
                <input id="ba-start" className="input" type="date"
                  value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="ba-end" className="block text-sm font-medium text-[var(--text)] mb-1.5">End Date</label>
                <input id="ba-end" className="input" type="date"
                  value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="btn btn-primary">
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : ads.length === 0 ? (
        <div className="card p-10 text-center">
          <Image size={36} className="mx-auto text-[var(--text-muted)] mb-3" />
          <p className="font-heading font-semibold text-[var(--text-secondary)]">No banner ad requests yet</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Submit a request to promote your business</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ads.map((ad) => (
            <div key={ad.id} className="card p-4 flex items-start gap-4">
              {ad.image_url ? (
                <img src={ad.image_url} alt="" className="w-16 h-12 rounded-lg object-cover flex-shrink-0 bg-[var(--surface-2)]" />
              ) : (
                <div className="w-16 h-12 rounded-lg bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0">
                  <Image size={18} className="text-[var(--text-muted)]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-heading font-semibold text-[var(--text)] text-sm">{ad.title}</span>
                  <span className={`badge ${STATUS_STYLES[ad.status] ?? 'badge-neutral'}`}>{ad.status}</span>
                  <span className="badge badge-neutral">{ad.placement}</span>
                </div>
                {ad.description && <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">{ad.description}</p>}
                {ad.admin_note && (
                  <p className="text-xs text-[var(--text-muted)] mt-1 italic">Admin note: {ad.admin_note}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                {ad.budget > 0 && <div className="font-semibold text-[var(--text)] text-sm">₹{ad.budget.toLocaleString()}</div>}
                <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] mt-1 justify-end">
                  <Clock size={10} />
                  {new Date(ad.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status legend */}
      <div className="flex items-center gap-3 mt-6 flex-wrap">
        <span className="text-xs text-[var(--text-muted)]">Status:</span>
        {[
          { s: 'pending', l: 'Under Review' },
          { s: 'approved', l: 'Approved' },
          { s: 'live', l: 'Live' },
          { s: 'rejected', l: 'Rejected' },
        ].map(({ s, l }) => (
          <span key={s} className={`badge ${STATUS_STYLES[s]}`}>{l}</span>
        ))}
      </div>
    </div>
  );
}
