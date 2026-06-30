import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Tag, Plus, Upload, X, Eye, MousePointer, Bookmark,
  ToggleLeft, ToggleRight, Pencil, ArrowLeft, Trash2, TrendingUp,
  Sparkles, Globe, Loader2, ImageIcon, Copy,
} from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';

interface Offer {
  id: number; title: string; category: string; description: string;
  discount_percent: number | null; original_price: number | null;
  offer_price: number | null; image_url: string; images: string[] | null;
  coupon_code: string; redeem_url: string | null;
  max_redemptions: number; current_redemptions: number;
  valid_from: string; valid_until: string; is_active: number | boolean;
  views: number; clicks: number; saves: number; created_at: string;
}

interface Category { slug: string; name: string; }

const MIN_IMG_SIZE = 400; // px — minimum width & height for offer images

const emptyForm = {
  title: '', description: '', category: '', image_url: '',
  images: [] as string[],
  discount_percent: '', original_price: '', offer_price: '',
  coupon_code: '', redeem_url: '', max_redemptions: '100',
  valid_from: new Date().toISOString().slice(0, 10),
  valid_until: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  is_active: '1',
};

type Mode = 'list' | 'create' | 'view' | 'edit';

function offerToForm(o: Offer) {
  return {
    title:            o.title,
    description:      o.description ?? '',
    category:         o.category,
    image_url:        o.image_url ?? '',
    images:           Array.isArray(o.images) ? o.images : [],
    discount_percent: o.discount_percent != null ? String(o.discount_percent) : '',
    original_price:   o.original_price  != null ? String(o.original_price)   : '',
    offer_price:      o.offer_price     != null ? String(o.offer_price)      : '',
    coupon_code:      o.coupon_code ?? '',
    redeem_url:       o.redeem_url ?? '',
    max_redemptions:  String(o.max_redemptions ?? 0),
    valid_from:       o.valid_from  ? o.valid_from.slice(0, 10)  : '',
    valid_until:      o.valid_until ? o.valid_until.slice(0, 10) : '',
    is_active:        o.is_active ? '1' : '0',
  };
}

function ImageUploadBox({ imageUrl, uploading, onUpload, onClear, fileRef }: {
  readonly imageUrl: string;
  readonly uploading: boolean;
  readonly onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onClear: () => void;
  readonly fileRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div>
      <div
        onClick={() => fileRef.current?.click()}
        className="relative border-2 border-dashed border-[var(--border)] rounded-xl overflow-hidden cursor-pointer hover:border-[var(--primary)] transition-colors bg-[var(--surface-2)]"
        style={{ height: '120px' }}
      >
        {imageUrl ? (
          <>
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            <button type="button"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80">
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
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onUpload} />
      <p className="text-xs text-[var(--text-muted)] mt-1">JPG, PNG or WebP · Max 10 MB · Min {MIN_IMG_SIZE}×{MIN_IMG_SIZE}px</p>
    </div>
  );
}

function GalleryUploadBox({ images, onAdd, onRemove, uploadingIdx }: {
  readonly images: string[];
  readonly onAdd: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onRemove: (idx: number) => void;
  readonly uploadingIdx: boolean;
}) {
  const galleryRef = useRef<HTMLInputElement | null>(null);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {images.map((url, idx) => (
          <div key={idx} className="relative w-20 h-16 rounded-xl overflow-hidden border border-[var(--border)]">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => onRemove(idx)}
              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center">
              <X size={9} className="text-white" />
            </button>
          </div>
        ))}
        {images.length < 5 && (
          <button type="button" onClick={() => galleryRef.current?.click()}
            className="w-20 h-16 rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-0.5 text-[var(--text-muted)] hover:border-[var(--primary)] transition-colors">
            {uploadingIdx ? <Upload size={14} className="animate-bounce" /> : <Plus size={14} />}
            <span className="text-[10px]">{uploadingIdx ? '…' : 'Add'}</span>
          </button>
        )}
      </div>
      <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onAdd} />
      <p className="text-xs text-[var(--text-muted)] mt-1">Up to 5 extra images</p>
    </div>
  );
}

function OfferForm({ form, setForm, uploading, uploadingGallery, fileRef, onUpload, onGalleryAdd, onSubmit, submitting, mode, onCancel, categories }: {
  readonly form: typeof emptyForm;
  readonly setForm: (fn: (f: typeof emptyForm) => typeof emptyForm) => void;
  readonly uploading: boolean;
  readonly uploadingGallery: boolean;
  readonly fileRef: React.RefObject<HTMLInputElement | null>;
  readonly onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onGalleryAdd: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onSubmit: (e: { preventDefault: () => void }) => void;
  readonly submitting: boolean;
  readonly mode: 'create' | 'edit';
  readonly onCancel: () => void;
  readonly categories: Category[];
}) {
  const upd = (k: keyof typeof emptyForm, v: string | string[]) => setForm((f) => ({ ...f, [k]: v }));

  // Auto-calculate discount % when both prices are entered
  const handleOrigPrice = (v: string) => {
    upd('original_price', v);
    const orig = parseFloat(v);
    const offer = parseFloat(form.offer_price);
    if (orig > 0 && offer >= 0 && offer < orig) {
      upd('discount_percent', Math.round(((orig - offer) / orig) * 100).toString());
    }
  };
  const handleOfferPrice = (v: string) => {
    upd('offer_price', v);
    const orig = parseFloat(form.original_price);
    const offer = parseFloat(v);
    if (orig > 0 && offer >= 0 && offer < orig) {
      upd('discount_percent', Math.round(((orig - offer) / orig) * 100).toString());
    }
  };

  const applyBOGO = () => {
    setForm((f) => ({
      ...f,
      title: f.title || 'Buy 1 Get 1 Free',
      description: f.description || 'Buy any 1 item and get the second one absolutely free! Limited time offer.',
      coupon_code: 'BOGO',
      discount_percent: '50',
      offer_price: f.original_price ? String(Math.round(parseFloat(f.original_price) / 2)) : f.offer_price,
    }));
  };

  const dateError = form.valid_from && form.valid_until && form.valid_until < form.valid_from
    ? 'Valid Until must be after Valid From'
    : null;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Title + Category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="of-title" className="block text-sm font-medium text-[var(--text)] mb-1.5">Title *</label>
          <input id="of-title" className="input" placeholder="e.g. 30% off all pizzas" required
            value={form.title} onChange={(e) => upd('title', e.target.value)} />
        </div>
        <div>
          <label htmlFor="of-cat" className="block text-sm font-medium text-[var(--text)] mb-1.5">Category *</label>
          <select id="of-cat" className="input" required value={form.category} onChange={(e) => upd('category', e.target.value)}>
            <option value="">Select category</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="of-desc" className="block text-sm font-medium text-[var(--text)] mb-1.5">Description *</label>
        <textarea id="of-desc" className="input h-20 resize-none" placeholder="Describe your offer…" required
          value={form.description} onChange={(e) => upd('description', e.target.value)} />
      </div>

      {/* Primary image */}
      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Offer Image *</label>
        <ImageUploadBox
          imageUrl={form.image_url} uploading={uploading} fileRef={fileRef}
          onUpload={onUpload} onClear={() => upd('image_url', '')}
        />
      </div>

      {/* Gallery images */}
      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-1.5">
          Gallery Images <span className="text-[var(--text-muted)] font-normal">(optional)</span>
        </label>
        <GalleryUploadBox
          images={form.images}
          uploadingIdx={uploadingGallery}
          onAdd={onGalleryAdd}
          onRemove={(idx) => upd('images', form.images.filter((_, i) => i !== idx))}
        />
      </div>

      {/* Coupon + Redeem URL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="of-coupon" className="block text-sm font-medium text-[var(--text)] mb-1.5">
            Coupon Code <span className="text-[var(--text-secondary)] font-normal">(optional)</span>
          </label>
          <input id="of-coupon" className="input font-mono uppercase tracking-wider" placeholder="SAVE30"
            value={form.coupon_code} onChange={(e) => upd('coupon_code', e.target.value.toUpperCase())} />
        </div>
        <div>
          <label htmlFor="of-redeem-url" className="block text-sm font-medium text-[var(--text)] mb-1.5">
            Redeem Page URL <span className="text-[var(--text-secondary)] font-normal">(optional)</span>
          </label>
          <input id="of-redeem-url" className="input" type="url" placeholder="https://yoursite.com/offer-page"
            value={form.redeem_url} onChange={(e) => upd('redeem_url', e.target.value)} />
        </div>
      </div>

      {/* Pricing — auto-discount */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-[var(--text)]">Pricing *</span>
          <button type="button" onClick={applyBOGO}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--primary)] bg-[var(--primary)]/10 px-2.5 py-1 rounded-lg hover:bg-[var(--primary)]/20 transition-colors">
            <Copy size={11} /> BOGO Template
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="of-orig" className="block text-xs text-[var(--text-muted)] mb-1">Original Price (₹) *</label>
            <input id="of-orig" className="input" type="number" min="0" placeholder="500" required
              value={form.original_price} onChange={(e) => handleOrigPrice(e.target.value)} />
          </div>
          <div>
            <label htmlFor="of-price" className="block text-xs text-[var(--text-muted)] mb-1">Offer Price (₹) *</label>
            <input id="of-price" className="input" type="number" min="0" placeholder="350" required
              value={form.offer_price} onChange={(e) => handleOfferPrice(e.target.value)} />
          </div>
          <div>
            <label htmlFor="of-disc" className="block text-xs text-[var(--text-muted)] mb-1">
              Discount % * <span className="text-[var(--primary)]">(auto-calculated)</span>
            </label>
            <input id="of-disc" className="input" type="number" min="0" max="100" placeholder="30" required
              value={form.discount_percent} onChange={(e) => upd('discount_percent', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="of-from" className="block text-sm font-medium text-[var(--text)] mb-1.5">Valid From *</label>
          <input id="of-from" className={`input ${dateError ? 'border-red-400' : ''}`} type="date" required
            value={form.valid_from} onChange={(e) => upd('valid_from', e.target.value)} />
        </div>
        <div>
          <label htmlFor="of-until" className="block text-sm font-medium text-[var(--text)] mb-1.5">Valid Until *</label>
          <input id="of-until" className={`input ${dateError ? 'border-red-400' : ''}`} type="date" required
            min={form.valid_from || undefined}
            value={form.valid_until} onChange={(e) => upd('valid_until', e.target.value)} />
          {dateError && <p className="text-xs text-red-500 mt-1">{dateError}</p>}
        </div>
        <div>
          <label htmlFor="of-max" className="block text-sm font-medium text-[var(--text)] mb-1.5">Max Redemptions</label>
          <input id="of-max" className="input" type="number" min="0" placeholder="100 (0 = unlimited)"
            value={form.max_redemptions} onChange={(e) => upd('max_redemptions', e.target.value)} />
        </div>
      </div>

      {/* Active toggle — shown in both create and edit */}
      <div className="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
        <div>
          <p className="text-sm font-medium text-[var(--text)]">Offer Status</p>
          <p className="text-xs text-[var(--text-muted)]">
            {form.is_active === '1' ? 'Visible to customers in the feed' : 'Hidden from the feed (draft)'}
          </p>
        </div>
        <button type="button" onClick={() => upd('is_active', form.is_active === '1' ? '0' : '1')}>
          {form.is_active === '1'
            ? <ToggleRight size={34} className="text-emerald-500" />
            : <ToggleLeft  size={34} className="text-[var(--text-muted)]" />}
        </button>
      </div>

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={submitting} className="btn btn-primary">
          {submitting ? (mode === 'create' ? 'Creating…' : 'Saving…') : (mode === 'create' ? 'Create Offer' : 'Save Changes')}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
      </div>
    </form>
  );
}

export default function ManageOffers() {
  const [offers, setOffers]     = useState<Offer[]>([]);
  const [loading, setLoading]   = useState(true);
  const [mode, setMode]         = useState<Mode>('list');
  const [selected, setSelected] = useState<Offer | null>(null);
  const [submitting, setSubmitting]         = useState(false);
  const [uploading, setUploading]           = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState<Category[]>([]);

  // AI generation
  const [aiOpen, setAiOpen]         = useState(false);
  const [aiWebsite, setAiWebsite]   = useState('');
  const [aiPrompt, setAiPrompt]     = useState('');
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiResult, setAiResult]     = useState<null | {
    title: string; description: string; category: string;
    discount_percent: number; original_price: number; offer_price: number;
    coupon_code: string; image_url: string;
  }>(null);

  const load = () => {
    setLoading(true);
    api.get(endpoints.myOffers).then((r) => {
      if (r.data.success) setOffers(r.data.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get(endpoints.categoriesList(true)).then((r) => {
      if (r.data.success) {
        const cats: Category[] = r.data.data ?? [];
        setCategories(cats);
        if (cats.length > 0) setForm((f) => ({ ...f, category: cats[0].slug }));
      }
    }).catch(() => toast.error('Failed to load categories'));
  }, []);

  const checkImgDimensions = (file: File): Promise<boolean> =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        if (img.naturalWidth < MIN_IMG_SIZE || img.naturalHeight < MIN_IMG_SIZE) {
          toast.error(`Image too small — minimum ${MIN_IMG_SIZE}×${MIN_IMG_SIZE}px (yours is ${img.naturalWidth}×${img.naturalHeight}px)`);
          resolve(false);
        } else {
          resolve(true);
        }
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(true); };
      img.src = url;
    });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await checkImgDimensions(file);
    if (!ok) { e.target.value = ''; return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post(endpoints.uploadImage, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) { setForm((f) => ({ ...f, image_url: res.data.data.url as string })); toast.success('Image uploaded!'); }
    } catch { toast.error('Upload failed — max 10 MB'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await checkImgDimensions(file);
    if (!ok) { e.target.value = ''; return; }
    setUploadingGallery(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post(endpoints.uploadImage, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) {
        const url = res.data.data.url as string;
        setForm((f) => ({ ...f, images: [...(f.images ?? []), url] }));
        toast.success('Image added to gallery!');
      }
    } catch { toast.error('Upload failed — max 10 MB'); }
    finally { setUploadingGallery(false); e.target.value = ''; }
  };

  const openCreate = () => {
    const today = new Date().toISOString().slice(0, 10);
    const in30  = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    setForm({ ...emptyForm, category: categories[0]?.slug ?? '', valid_from: today, valid_until: in30 });
    setMode('create');
  };
  const openView   = (o: Offer) => { setSelected(o); setMode('view'); };
  const openEdit   = (o: Offer) => { setSelected(o); setForm(offerToForm(o)); setMode('edit'); };
  const backToList = () => { setMode('list'); setSelected(null); };

  const handleAiGenerate = async () => {
    if (!aiWebsite.trim()) { toast.error('Enter your website URL'); return; }
    if (!aiPrompt.trim())  { toast.error('Describe the offer you want'); return; }
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.post('/vendor/ai-generate-offer', {
        website_url: aiWebsite.trim(),
        prompt: aiPrompt.trim(),
      });
      if (res.data.success) {
        setAiResult(res.data.data);
      } else {
        toast.error(res.data.error ?? 'AI generation failed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'AI generation failed, try again');
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiResult = () => {
    if (!aiResult) return;
    const today = new Date().toISOString().slice(0, 10);
    const in30  = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    setForm({
      title:            aiResult.title,
      description:      aiResult.description,
      category:         aiResult.category,
      image_url:        aiResult.image_url,
      images:           [],
      discount_percent: String(aiResult.discount_percent),
      original_price:   String(aiResult.original_price),
      offer_price:      String(aiResult.offer_price),
      coupon_code:      aiResult.coupon_code,
      redeem_url:       '',
      max_redemptions:  '100',
      valid_from:       today,
      valid_until:      in30,
      is_active:        '1',
    });
    setAiOpen(false);
    setAiResult(null);
    setMode('create');
  };

  const validateOfferForm = () => {
    if (!form.title.trim())        { toast.error('Title is required'); return false; }
    if (!form.category)            { toast.error('Category is required'); return false; }
    if (!form.description.trim())  { toast.error('Description is required'); return false; }
    if (!form.image_url)           { toast.error('Offer image is required'); return false; }
    if (!form.discount_percent)    { toast.error('Discount % is required'); return false; }
    if (!form.original_price)      { toast.error('Original price is required'); return false; }
    if (!form.offer_price)         { toast.error('Offer price is required'); return false; }
    if (!form.valid_from)          { toast.error('Valid From date is required'); return false; }
    if (!form.valid_until)         { toast.error('Valid Until date is required'); return false; }
    if (form.valid_until < form.valid_from) { toast.error('Valid Until must be after Valid From'); return false; }
    return true;
  };

  const handleCreate = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!validateOfferForm()) return;
    setSubmitting(true);
    try {
      const res = await api.post(endpoints.offerCreate, {
        title:            form.title.trim(),
        description:      form.description.trim(),
        category:         form.category,
        image_url:        form.image_url,
        images:           form.images.length > 0 ? form.images : null,
        coupon_code:      form.coupon_code || null,
        redeem_url:       form.redeem_url || null,
        discount_percent: parseFloat(form.discount_percent),
        original_price:   parseFloat(form.original_price),
        offer_price:      parseFloat(form.offer_price),
        max_redemptions:  form.max_redemptions ? Number.parseInt(form.max_redemptions) : 0,
        valid_from:       form.valid_from,
        valid_until:      form.valid_until,
        is_active:        form.is_active === '1',
      });
      if (res.data.success) { toast.success('Offer created!'); backToList(); load(); }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to create offer');
    } finally { setSubmitting(false); }
  };

  const handleToggleActive = async (o: Offer) => {
    try {
      await api.put(endpoints.offerUpdate(o.id), {
        title:            o.title,
        description:      o.description ?? '',
        category:         o.category,
        image_url:        o.image_url ?? '',
        coupon_code:      o.coupon_code ?? '',
        discount_percent: o.discount_percent,
        original_price:   o.original_price,
        offer_price:      o.offer_price,
        max_redemptions:  o.max_redemptions ?? 0,
        valid_from:       o.valid_from  ? o.valid_from.slice(0, 10)  : null,
        valid_until:      o.valid_until ? o.valid_until.slice(0, 10) : null,
        is_active:        !o.is_active,
      });
      setOffers((prev) => prev.map((x) => x.id === o.id ? { ...x, is_active: o.is_active ? 0 : 1 } : x));
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to update offer');
    }
  };

  const handleDelete = async (o: Offer) => {
    if (!window.confirm(`Delete "${o.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(endpoints.offerDelete(o.id));
      toast.success('Offer deleted');
      setOffers((prev) => prev.filter((x) => x.id !== o.id));
    } catch { toast.error('Failed to delete offer'); }
  };

  const handleUpdate = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!selected) return;
    if (!validateOfferForm()) return;
    setSubmitting(true);
    try {
      const res = await api.put(endpoints.offerUpdate(selected.id), {
        title:            form.title.trim(),
        description:      form.description.trim(),
        category:         form.category,
        image_url:        form.image_url,
        images:           form.images.length > 0 ? form.images : null,
        coupon_code:      form.coupon_code || null,
        redeem_url:       form.redeem_url || null,
        discount_percent: parseFloat(form.discount_percent),
        original_price:   parseFloat(form.original_price),
        offer_price:      parseFloat(form.offer_price),
        max_redemptions:  form.max_redemptions ? Number.parseInt(form.max_redemptions) : 0,
        valid_from:       form.valid_from,
        valid_until:      form.valid_until,
        is_active:        form.is_active === '1',
      });
      if (res.data.success) { toast.success('Offer updated!'); backToList(); load(); }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to update offer');
    } finally { setSubmitting(false); }
  };

  /* ── View detail ─────────────────────────────────────────── */
  if (mode === 'view' && selected) {
    return (
      <div className="max-w-2xxl pb-6">
        <button onClick={backToList} className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors mb-5 group">
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> Back to My Offers
        </button>
        <div className="card overflow-hidden">
          {selected.image_url && (
            <img src={selected.image_url} alt={selected.title} className="w-full h-52 object-cover" />
          )}
          <div className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-heading font-bold text-xl text-[var(--text)]">{selected.title}</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`badge ${selected.is_active ? 'badge-accent' : 'badge-neutral'}`}>{selected.is_active ? 'Active' : 'Inactive'}</span>
                  {selected.discount_percent && <span className="badge badge-primary">{selected.discount_percent}% off</span>}
                  <span className="badge badge-neutral">{selected.category}</span>
                  {selected.coupon_code && <span className="badge badge-warning font-mono">{selected.coupon_code}</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link to={`/vendor/roi/${selected.id}`} className="btn btn-secondary btn-sm">
                  <TrendingUp size={13} /> ROI
                </Link>
                <button onClick={() => openEdit(selected)} className="btn btn-secondary btn-sm">
                  <Pencil size={13} /> Edit
                </button>
              </div>
            </div>

            {selected.description && <p className="text-sm text-[var(--text-secondary)]">{selected.description}</p>}

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[var(--surface-2)] rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-[var(--text)]">{selected.views}</div>
                <div className="text-xs text-[var(--text-muted)] flex items-center justify-center gap-1 mt-0.5"><Eye size={10} /> Views</div>
              </div>
              <div className="bg-[var(--surface-2)] rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-[var(--text)]">{selected.clicks}</div>
                <div className="text-xs text-[var(--text-muted)] flex items-center justify-center gap-1 mt-0.5"><MousePointer size={10} /> Clicks</div>
              </div>
              <div className="bg-[var(--surface-2)] rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-[var(--text)]">{selected.saves}</div>
                <div className="text-xs text-[var(--text-muted)] flex items-center justify-center gap-1 mt-0.5"><Bookmark size={10} /> Saves</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {selected.original_price != null && (
                <div className="bg-[var(--surface-2)] rounded-xl p-3">
                  <div className="text-xs text-[var(--text-muted)] mb-0.5">Original Price</div>
                  <div className="font-semibold text-[var(--text)]">₹{selected.original_price}</div>
                </div>
              )}
              {selected.offer_price != null && (
                <div className="bg-[var(--surface-2)] rounded-xl p-3">
                  <div className="text-xs text-[var(--text-muted)] mb-0.5">Offer Price</div>
                  <div className="font-semibold text-[var(--primary)]">₹{selected.offer_price}</div>
                </div>
              )}
              {selected.valid_from && (
                <div className="bg-[var(--surface-2)] rounded-xl p-3">
                  <div className="text-xs text-[var(--text-muted)] mb-0.5">Valid From</div>
                  <div className="font-semibold text-[var(--text)]">{new Date(selected.valid_from).toLocaleDateString()}</div>
                </div>
              )}
              {selected.valid_until && (
                <div className="bg-[var(--surface-2)] rounded-xl p-3">
                  <div className="text-xs text-[var(--text-muted)] mb-0.5">Valid Until</div>
                  <div className="font-semibold text-[var(--text)]">{new Date(selected.valid_until).toLocaleDateString()}</div>
                </div>
              )}
            </div>

            {selected.max_redemptions > 0 && (
              <div className="bg-[var(--surface-2)] rounded-xl p-3 text-sm">
                <div className="text-xs text-[var(--text-muted)] mb-1">Redemptions</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-[var(--border)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--primary)] rounded-full transition-all"
                      style={{ width: `${Math.min(100, (selected.current_redemptions / selected.max_redemptions) * 100)}%` }} />
                  </div>
                  <span className="font-semibold text-[var(--text)]">{selected.current_redemptions}/{selected.max_redemptions}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Create / Edit form ──────────────────────────────────── */
  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="max-w-2xxl pb-6">
        <button onClick={backToList} className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors mb-5 group">
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> Back to My Offers
        </button>
        <div className="card p-5">
          <h3 className="font-heading font-bold text-[var(--text)] text-lg mb-5">
            {mode === 'create' ? 'New Offer' : `Edit: ${selected?.title}`}
          </h3>
          <OfferForm
            form={form} setForm={setForm} uploading={uploading}
            uploadingGallery={uploadingGallery}
            fileRef={fileRef} onUpload={handleImageUpload}
            onGalleryAdd={handleGalleryUpload}
            onSubmit={mode === 'create' ? handleCreate : handleUpdate}
            submitting={submitting} mode={mode} onCancel={backToList}
            categories={categories}
          />
        </div>
      </div>
    );
  }

  /* ── List ────────────────────────────────────────────────── */
  return (
    <div className="max-w-4xxl pb-6">
      <BackButton to="/vendor/dashboard" />
      <div className="page-header">
        <div>
          <h1 className="page-title">My Offers</h1>
          <p className="page-subtitle">Create and manage your promotional offers</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setAiOpen(true); setAiResult(null); }} className="btn btn-secondary btn-sm">
            <Sparkles size={14} /> AI Generate
          </button>
          <button onClick={openCreate} className="btn btn-primary btn-sm">
            <Plus size={14} /> Add Offer
          </button>
        </div>
      </div>

      {/* AI Generate Modal */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setAiOpen(false); }}>
          <div className="w-full max-w-lg bg-[var(--surface)] rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Sparkles size={15} className="text-white" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-[var(--text)] text-sm">AI Offer Generator</h3>
                  <p className="text-xs text-[var(--text-muted)]">Free · powered by Pollinations AI</p>
                </div>
              </div>
              <button onClick={() => setAiOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Inputs */}
              <div>
                <label className="label">Your Website URL</label>
                <div className="relative">
                  <Globe size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="url"
                    value={aiWebsite}
                    onChange={(e) => setAiWebsite(e.target.value)}
                    placeholder="https://yourbusiness.in"
                    className="input pl-9"
                    disabled={aiLoading}
                  />
                </div>
              </div>
              <div>
                <label className="label">Describe the offer</label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Create a web development offer with 30% discount for startups"
                  className="input resize-none"
                  rows={3}
                  disabled={aiLoading}
                />
              </div>

              {/* AI Result Preview */}
              {aiResult && (
                <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                  {/* Generated image */}
                  <div className="relative bg-[var(--surface-2)] aspect-[16/9] overflow-hidden">
                    <img
                      src={aiResult.image_url}
                      alt="AI generated"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ImageIcon size={10} /> AI Image
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-heading font-bold text-[var(--text)] text-sm leading-snug">{aiResult.title}</h4>
                      <span className="badge badge-primary flex-shrink-0">{aiResult.discount_percent}% off</span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{aiResult.description}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="badge badge-neutral text-[10px]">{aiResult.category}</span>
                      {aiResult.coupon_code && <span className="badge badge-warning font-mono text-[10px]">{aiResult.coupon_code}</span>}
                      <span className="text-xs text-[var(--text-muted)]">₹{aiResult.original_price} → <span className="text-[var(--primary)] font-semibold">₹{aiResult.offer_price}</span></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {aiResult ? (
                  <>
                    <button onClick={handleAiGenerate} disabled={aiLoading} className="btn btn-secondary btn-sm flex-1">
                      <Sparkles size={13} /> Regenerate
                    </button>
                    <button onClick={applyAiResult} className="btn btn-primary btn-sm flex-1">
                      Use this offer
                    </button>
                  </>
                ) : (
                  <button onClick={handleAiGenerate} disabled={aiLoading} className="btn btn-primary w-full justify-center">
                    {aiLoading ? (
                      <><Loader2 size={15} className="animate-spin" /> Generating<span className="opacity-60">… up to 30s</span></>
                    ) : (
                      <><Sparkles size={15} /> Generate Offer</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : offers.length === 0 ? (
        <div className="card p-10 text-center">
          <Tag size={36} className="mx-auto text-[var(--text-muted)] mb-3" />
          <p className="font-heading font-semibold text-[var(--text-secondary)]">No offers yet</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Click "Add Offer" to create your first promotion</p>
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map((o) => (
            <div key={o.id} className="card p-4 flex flex-col sm:flex-row items-start gap-4">
              <button onClick={() => openView(o)} className="flex-shrink-0">
                {o.image_url ? (
                  <img src={o.image_url} alt="" className="w-16 h-12 rounded-lg object-cover hover:opacity-80 transition-opacity" />
                ) : (
                  <div className="w-16 h-12 rounded-lg bg-[var(--surface-2)] flex items-center justify-center hover:bg-[var(--border)] transition-colors">
                    <Tag size={16} className="text-[var(--text-muted)]" />
                  </div>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => openView(o)} className="font-heading font-semibold text-[var(--text)] text-sm hover:text-[var(--primary)] transition-colors text-left">
                    {o.title}
                  </button>
                  <span className={`badge ${o.is_active ? 'badge-accent' : 'badge-neutral'}`}>{o.is_active ? 'Active' : 'Inactive'}</span>
                  {o.discount_percent && <span className="badge badge-primary">{o.discount_percent}% off</span>}
                  <span className="badge badge-neutral">{o.category}</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1"><Eye size={11} />{o.views}</span>
                  <span className="flex items-center gap-1"><MousePointer size={11} />{o.clicks}</span>
                  <span className="flex items-center gap-1"><Bookmark size={11} />{o.saves}</span>
                  {o.current_redemptions > 0 && <span>{o.current_redemptions}/{o.max_redemptions || '∞'} redeemed</span>}
                  {o.valid_until && <span>Expires {new Date(o.valid_until).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 sm:flex-shrink-0">
                <button onClick={() => openEdit(o)} className="btn btn-secondary btn-sm">
                  <Pencil size={13} /> <span className="hidden xs:inline sm:inline">Edit</span>
                </button>
                <button
                  onClick={() => handleToggleActive(o)}
                  title={o.is_active ? 'Deactivate' : 'Activate'}
                  className="p-1 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
                >
                  {o.is_active
                    ? <ToggleRight size={20} className="text-emerald-500" />
                    : <ToggleLeft  size={20} className="text-[var(--text-muted)]" />}
                </button>
                <button
                  onClick={() => handleDelete(o)}
                  title="Delete offer"
                  className="p-1 rounded-lg hover:bg-[var(--danger-light)] text-[var(--text-muted)] hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
