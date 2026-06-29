import { useState, useEffect, useRef } from 'react';
import { Image, Video, Clock, Plus, Upload, X, Check, Calendar } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';

interface BannerPlan {
  id: number;
  name: string;
  duration_days: number;
  price: number;
  description: string | null;
  position: string;
  is_active: boolean;
}

interface BannerAd {
  id: number; title: string | null; image_url: string; media_type: string; target_url: string;
  duration_days: number; banner_plan_id: number | null; plan_name: string | null;
  price: number | null; position: string;
  status: string; review_note: string | null; expires_at: string | null; created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending:  'badge-warning',
  approved: 'badge-accent',
  rejected: 'badge-danger',
  live:     'badge-accent',
  expired:  'badge-neutral',
};

// Top is currently the only live placement on the site (the homepage hero strip),
// so every banner — regardless of chosen position — is validated against its size.
const BANNER_ASPECT_RATIO = 4;     // width / height, e.g. 1600x400
const BANNER_ASPECT_TOLERANCE = 0.15; // ±15%
const BANNER_MIN_WIDTH = 1200;
const BANNER_MIN_HEIGHT = 300;
const BANNER_MAX_VIDEO_SECONDS = 30;
const BANNER_SIZE_HINT = '1600×400px (4:1) · min 1200×300px';

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
    img.src = url;
  });
}

function readVideoMeta(file: File): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration });
    };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read video')); };
    video.src = url;
  });
}

/** Returns an error message if the media fails the Top Banner size requirement, otherwise null. */
function validateBannerSize(width: number, height: number): string | null {
  if (width < BANNER_MIN_WIDTH || height < BANNER_MIN_HEIGHT) {
    return `Too small — needs at least ${BANNER_MIN_WIDTH}×${BANNER_MIN_HEIGHT}px (yours is ${width}×${height}px)`;
  }
  const ratio = width / height;
  const minRatio = BANNER_ASPECT_RATIO * (1 - BANNER_ASPECT_TOLERANCE);
  const maxRatio = BANNER_ASPECT_RATIO * (1 + BANNER_ASPECT_TOLERANCE);
  if (ratio < minRatio || ratio > maxRatio) {
    return `Wrong aspect ratio — needs ~${BANNER_ASPECT_RATIO}:1 (wide banner), yours is ${ratio.toFixed(2)}:1`;
  }
  return null;
}

export default function BannerAdRequest() {
  const [ads, setAds]         = useState<BannerAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans]         = useState<BannerPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: '', image_url: '', media_type: 'image' as 'image' | 'video',
    target_url: '', banner_plan_id: null as number | null,
  });

  const switchMediaType = (type: 'image' | 'video') => {
    setForm((f) => ({ ...f, media_type: type, image_url: '' }));
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      if (form.media_type === 'video') {
        const meta = await readVideoMeta(file).catch(() => null);
        if (!meta) { toast.error('Could not read video file'); return; }
        if (meta.duration > BANNER_MAX_VIDEO_SECONDS) {
          toast.error(`Video too long — max ${BANNER_MAX_VIDEO_SECONDS}s (yours is ${Math.round(meta.duration)}s)`);
          return;
        }
        const sizeError = validateBannerSize(meta.width, meta.height);
        if (sizeError) { toast.error(sizeError); return; }

        const fd = new FormData();
        fd.append('video', file);
        const res = await api.post(endpoints.uploadVideo, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (res.data.success) {
          setForm((f) => ({ ...f, image_url: res.data.data.url as string }));
          toast.success('Video uploaded!');
        }
      } else {
        const dims = await readImageDimensions(file).catch(() => null);
        if (!dims) { toast.error('Could not read image file'); return; }
        const sizeError = validateBannerSize(dims.width, dims.height);
        if (sizeError) { toast.error(sizeError); return; }

        const fd = new FormData();
        fd.append('image', file);
        const res = await api.post(endpoints.uploadImage, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (res.data.success) {
          setForm((f) => ({ ...f, image_url: res.data.data.url as string }));
          toast.success('Image uploaded!');
        }
      }
    } catch {
      toast.error(form.media_type === 'video' ? 'Upload failed — max 50 MB' : 'Upload failed — max 5 MB');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const load = () => {
    setLoading(true);
    api.get(endpoints.bannerListMine).then((r) => {
      if (r.data.success) setAds(r.data.data);
    }).finally(() => setLoading(false));
  };

  const loadPlans = () => {
    setPlansLoading(true);
    api.get(endpoints.bannerPlansList).then((r) => {
      if (r.data.success) setPlans(r.data.data);
    }).finally(() => setPlansLoading(false));
  };

  useEffect(load, []);
  useEffect(loadPlans, []);

  const openForm = () => {
    setForm({ title: '', image_url: '', media_type: 'image', target_url: '', banner_plan_id: null });
    setShowForm(true);
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Ad title is required'); return; }
    if (!form.banner_plan_id) { toast.error('Choose a banner plan'); return; }
    if (!form.image_url) { toast.error(`Upload a banner ${form.media_type}`); return; }
    if (!form.target_url) { toast.error('Target URL is required'); return; }
    setSubmitting(true);
    try {
      const res = await api.post(endpoints.bannerRequest, {
        title: form.title.trim(),
        image_url: form.image_url,
        media_type: form.media_type,
        target_url: form.target_url,
        banner_plan_id: form.banner_plan_id,
      });
      if (res.data.success) {
        toast.success('Banner ad request submitted!');
        setShowForm(false);
        load();
      } else {
        toast.error(res.data.error ?? 'Failed to submit');
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
        <button onClick={openForm} className="btn btn-primary btn-sm">
          <Plus size={14} /> New Request
        </button>
      </div>

      {/* New request form */}
      {showForm && (
        <div className="card p-5 mb-6 animate-slide-up">
          <h3 className="font-heading font-semibold text-[var(--text)] mb-4">New Banner Ad Request</h3>
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Title */}
            <div>
              <label htmlFor="ba-title" className="block text-sm font-medium text-[var(--text)] mb-1.5">Ad Title *</label>
              <input id="ba-title" className="input" placeholder="Summer Sale Banner" required
                value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>

            {/* Plan picker */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">Choose a Plan *</label>
              {plansLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-xl" />)}
                </div>
              ) : plans.length === 0 ? (
                <div className="card p-4 text-sm text-[var(--text-secondary)] text-center">
                  No banner plans are available right now. Please check back later.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {plans.map((plan) => {
                    const active = form.banner_plan_id === plan.id;
                    return (
                      <button
                        type="button"
                        key={plan.id}
                        onClick={() => setForm((f) => ({ ...f, banner_plan_id: plan.id }))}
                        className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                          active
                            ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                            : 'border-[var(--border)] hover:border-[var(--primary)]/40'
                        }`}
                      >
                        {active && (
                          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[var(--primary)] flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                        <p className="font-bold text-[var(--text)] text-sm">{plan.name}</p>
                        <div className="flex items-end gap-1 mt-1.5">
                          <span className="text-xl font-bold text-[var(--text)]">₹{Number(plan.price).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mt-1.5">
                          <Calendar size={12} />
                          <span>{plan.duration_days} day{plan.duration_days !== 1 ? 's' : ''}</span>
                          <span>· ₹{(Number(plan.price) / plan.duration_days).toFixed(0)}/day</span>
                        </div>
                        {plan.description && (
                          <p className="text-xs text-[var(--text-muted)] mt-2 leading-snug">{plan.description}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Media */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-[var(--text)]">Banner Media *</label>
                <div className="flex gap-1 bg-[var(--surface-2)] p-0.5 rounded-lg">
                  <button type="button" onClick={() => switchMediaType('image')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${form.media_type === 'image' ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)]'}`}>
                    <Image size={11} /> Image
                  </button>
                  <button type="button" onClick={() => switchMediaType('video')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${form.media_type === 'video' ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)]'}`}>
                    <Video size={11} /> Video
                  </button>
                </div>
              </div>
              <div
                onClick={() => fileRef.current?.click()}
                className="relative aspect-[4/1] border-2 border-dashed border-[var(--border)] rounded-xl overflow-hidden cursor-pointer hover:border-[var(--primary)] transition-colors bg-[var(--surface-2)]"
              >
                {form.image_url ? (
                  <>
                    {form.media_type === 'video' ? (
                      <video src={form.image_url} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                    ) : (
                      <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setForm((f) => ({ ...f, image_url: '' })); }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80"
                    >
                      <X size={13} className="text-white" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-1 text-[var(--text-muted)]">
                    {uploading ? <Upload size={18} className="animate-bounce" /> : <Upload size={18} />}
                    <span className="text-xs">{uploading ? 'Uploading…' : 'Click to upload — wide banner shape'}</span>
                  </div>
                )}
              </div>
              <input
                ref={fileRef} type="file" className="hidden" onChange={handleMediaUpload}
                accept={form.media_type === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp'}
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {form.media_type === 'video'
                  ? `MP4 or WebM · Max 50 MB · Max ${BANNER_MAX_VIDEO_SECONDS}s · ${BANNER_SIZE_HINT}`
                  : `JPG, PNG or WebP · Max 5 MB · ${BANNER_SIZE_HINT}`}
              </p>
            </div>

            {/* Target URL */}
            <div>
              <label htmlFor="ba-target" className="block text-sm font-medium text-[var(--text)] mb-1.5">Target URL *</label>
              <input id="ba-target" className="input" placeholder="https://..." type="url" required
                value={form.target_url} onChange={(e) => setForm((f) => ({ ...f, target_url: e.target.value }))} />
              <p className="text-xs text-[var(--text-muted)] mt-1">Where the banner click takes users</p>
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
                ad.media_type === 'video' ? (
                  <video src={ad.image_url} className="w-16 h-12 rounded-lg object-cover flex-shrink-0 bg-[var(--surface-2)]" muted />
                ) : (
                  <img src={ad.image_url} alt="" className="w-16 h-12 rounded-lg object-cover flex-shrink-0 bg-[var(--surface-2)]" />
                )
              ) : (
                <div className="w-16 h-12 rounded-lg bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0">
                  <Image size={18} className="text-[var(--text-muted)]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-heading font-semibold text-[var(--text)] text-sm">{ad.title ?? ad.plan_name ?? 'Banner Ad'}</span>
                  <span className={`badge ${STATUS_STYLES[ad.status] ?? 'badge-neutral'}`}>{ad.status}</span>
                  {ad.media_type === 'video' && <span className="badge badge-neutral flex items-center gap-1"><Video size={10} /> Video</span>}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {ad.plan_name ? `${ad.plan_name} · ` : ''}{ad.duration_days} day{ad.duration_days !== 1 ? 's' : ''} display
                  {ad.expires_at && ad.status === 'approved' ? ` · expires ${new Date(ad.expires_at).toLocaleDateString()}` : ''}
                </p>
                {ad.review_note && (
                  <p className="text-xs text-[var(--text-muted)] mt-1 italic">Admin note: {ad.review_note}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                {ad.price != null && <div className="font-semibold text-[var(--text)] text-sm">₹{Number(ad.price).toLocaleString()}</div>}
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
