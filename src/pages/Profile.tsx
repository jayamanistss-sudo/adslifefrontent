import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LogOut, Store, ChevronRight, X, CheckCircle,
  MapPin, Search, LocateFixed, Upload, ImagePlus,
  ChevronLeft, Building2, FileText, Camera, Layers, Check,
  Bookmark, Bell, BellOff, ExternalLink, Tag, Copy, Gift, MessageCircle,
} from 'lucide-react';
import CategoryIcon from '../components/CategoryIcon';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useUserStore } from '../store/useUserStore';
import { api, endpoints } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'saved' | 'subscribed';

interface SavedOffer {
  id: number; title: string; description?: string; category?: string;
  discount_percent: number; original_price?: number; offer_price?: number;
  image_url?: string; banner_url?: string; coupon_code?: string;
  valid_until?: string; is_active: number;
  business_name: string; vendor_logo?: string; vendor_city?: string;
  saved_at: string;
}

interface FollowedVendor {
  id: number; business_name: string; category: string;
  logo_url?: string; city?: string; description?: string;
  total_followers: number; active_offers: number; followed_at: string;
}

interface VendorCategory { slug: string; name: string; icon: string; }

const STEPS = [
  { label: 'Business Info', icon: Building2 },
  { label: 'Location',      icon: MapPin     },
  { label: 'Details',       icon: FileText   },
  { label: 'Select Plan',   icon: Layers     },
];

interface Plan {
  id: number; name: string; slug: string; price: number;
  duration_days: number; max_offers: number; features: string[];
}

const PLAN_COLORS: Record<string, string> = {
  free: 'border-[var(--border)]', starter: 'border-blue-400',
  growth: 'border-[var(--primary)]', professional: 'border-violet-500',
};
const PLAN_BADGES: Record<string, string> = {
  growth: 'Popular', professional: 'Best Value',
};

function Step4({ selectedPlanId, onSelect, plans, loadingPlans }: {
  readonly selectedPlanId: number | null;
  readonly onSelect: (plan: Plan) => void;
  readonly plans: Plan[];
  readonly loadingPlans: boolean;
}) {
  if (loadingPlans) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {[1,2,3,4].map((i) => <div key={i} className="skeleton h-40 rounded-xl" />)}
    </div>
  );
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--text-secondary)]">Choose a plan for your vendor account. You can upgrade anytime.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {plans.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelect(plan)}
            className={`relative text-left p-4 rounded-xl border-2 transition-all ${PLAN_COLORS[plan.slug] ?? 'border-[var(--border)]'} ${
              selectedPlanId === plan.id
                ? 'ring-2 ring-[var(--primary)] bg-[var(--primary-light)]'
                : 'bg-[var(--surface)] hover:bg-[var(--surface-2)]'
            }`}
          >
            {PLAN_BADGES[plan.slug] && (
              <span className="absolute -top-2.5 left-3 badge badge-primary text-[10px]">{PLAN_BADGES[plan.slug]}</span>
            )}
            <div className="flex items-start justify-between mb-2">
              <span className="font-heading font-bold text-[var(--text)] text-sm">{plan.name}</span>
              {selectedPlanId === plan.id && <Check size={16} className="text-[var(--primary)]" />}
            </div>
            <div className="font-heading font-bold text-lg text-[var(--text)] mb-2">
              {plan.price === 0 ? 'Free' : `₹${plan.price.toLocaleString()}/mo`}
            </div>
            <ul className="space-y-1">
              {plan.features.slice(0, 3).map((f) => (
                <li key={f} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                  <Check size={10} className="text-emerald-500 flex-shrink-0" />{f}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  );
}

interface VendorForm {
  business_name: string;
  category: string;
  description: string;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  phone: string;
  website: string;
  gst_number: string;
  logo_url: string;
}

// ─── Step 1: Business Info ───────────────────────────────────────────────────
function Step1({ form, update, categories }: {
  readonly form: VendorForm;
  readonly update: (k: keyof VendorForm, v: string) => void;
  readonly categories: VendorCategory[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Business Name *</label>
        <input
          type="text"
          value={form.business_name}
          onChange={(e) => update('business_name', e.target.value)}
          placeholder="e.g. Spice Garden Restaurant"
          className="search-input"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Category *</label>
        {categories.length === 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3,4,5,6].map((i) => <div key={i} className="skeleton h-10 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {categories.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => update('category', c.slug)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  form.category === c.slug
                    ? 'bg-primary border-primary text-white shadow-sm'
                    : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary bg-white'
                }`}
              >
                <CategoryIcon name={c.icon} size={15} />
                <span className="truncate text-xs">{c.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Tell customers what makes your shop special..."
          className="search-input resize-none"
        />
      </div>
    </div>
  );
}

// ─── Step 2: Location Map Picker ─────────────────────────────────────────────
function Step2({ form, update, updateLatLng }: {
  readonly form: VendorForm;
  readonly update: (k: keyof VendorForm, v: string) => void;
  readonly updateLatLng: (lat: number, lng: number, address?: string) => void;
}) {
  const mapRef    = useRef<HTMLDivElement>(null);
  const mapInst   = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery]         = useState(form.address);

  // Marker icon
  const pinIcon = L.divIcon({
    html: `<div style="width:32px;height:32px;background:#FF6200;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
    className: '',
    iconSize:   [32, 32],
    iconAnchor: [16, 32],
  });

  const placeMarker = useCallback((lat: number, lng: number) => {
    if (!mapInst.current) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(mapInst.current);
      markerRef.current.on('dragend', () => {
        const p = markerRef.current?.getLatLng();
        if (p) updateLatLng(p.lat, p.lng);
      });
    }
    mapInst.current.setView([lat, lng], 16);
    updateLatLng(lat, lng);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInst.current) return;
    const initLat = form.lat ?? 13.0827;
    const initLng = form.lng ?? 80.2707;

    const map = L.map(mapRef.current, { zoomControl: true }).setView([initLat, initLng], 13);
    mapInst.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => placeMarker(e.latlng.lat, e.latlng.lng));

    if (form.lat && form.lng) placeMarker(form.lat, form.lng);

    return () => { map.remove(); mapInst.current = null; markerRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const searchAddress = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`;
      const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>;
      if (data.length > 0) {
        const lat = Number.parseFloat(data[0].lat);
        const lng = Number.parseFloat(data[0].lon);
        placeMarker(lat, lng);
        update('address', data[0].display_name.split(',').slice(0, 3).join(',').trim());
        update('city', data[0].display_name.split(',').find((p) => p.trim().length > 2 && p.trim().length < 20)?.trim() ?? '');
      } else {
        toast.error('Location not found — try a different search');
      }
    } catch {
      toast.error('Search failed — try again');
    } finally {
      setSearching(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => placeMarker(pos.coords.latitude, pos.coords.longitude),
      () => toast.error('Location access denied'),
    );
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Search your shop location</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchAddress(); } }}
              placeholder="Anna Salai, Chennai..."
              className="search-input pl-9"
            />
          </div>
          <button
            type="button"
            onClick={searchAddress}
            disabled={searching}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 flex-shrink-0"
          >
            {searching ? '...' : 'Search'}
          </button>
          <button
            type="button"
            onClick={useMyLocation}
            className="p-2.5 border border-gray-200 rounded-xl text-gray-500 hover:border-primary hover:text-primary transition-colors flex-shrink-0"
            title="Use my location"
          >
            <LocateFixed size={16} />
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-gray-200">
        <div ref={mapRef} className="h-60 w-full" />
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-gray-600 shadow pointer-events-none">
          Click on the map to pin your exact location
        </div>
      </div>

      {/* Coordinates display */}
      {form.lat && form.lng && (
        <div className="flex items-center gap-2 bg-accent/5 border border-accent/20 rounded-xl px-3 py-2">
          <MapPin size={14} className="text-accent flex-shrink-0" />
          <span className="text-xs text-gray-600 font-mono">
            {form.lat.toFixed(6)}, {form.lng.toFixed(6)}
          </span>
          <CheckCircle size={14} className="text-accent ml-auto flex-shrink-0" />
        </div>
      )}

      {/* Address */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Shop Address</label>
        <input
          type="text"
          value={form.address}
          onChange={(e) => update('address', e.target.value)}
          placeholder="Full address shown on your profile"
          className="search-input"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">City</label>
        <input
          type="text"
          value={form.city}
          onChange={(e) => update('city', e.target.value)}
          placeholder="e.g. Chennai"
          className="search-input"
        />
      </div>
    </div>
  );
}

// ─── Step 3: Details — GST, Contact, Photo ───────────────────────────────────
function Step3({ form, update }: {
  readonly form: VendorForm;
  readonly update: (k: keyof VendorForm, v: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post(endpoints.uploadImage, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        update('logo_url', res.data.data.url as string);
        toast.success('Photo uploaded!');
      }
    } catch {
      toast.error('Upload failed — check file size (max 5 MB)');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Business photo */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Business Photo / Logo</label>
        <div className="flex items-center gap-4">
          <div
            className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer hover:border-primary transition-colors flex-shrink-0"
            onClick={() => fileRef.current?.click()}
          >
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-gray-400">
                <ImagePlus size={22} />
                <span className="text-[10px]">Add Photo</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            >
              {uploading ? <Upload size={15} className="animate-bounce" /> : <Camera size={15} />}
              {uploading ? 'Uploading...' : 'Choose Photo'}
            </button>
            <p className="text-xs text-gray-400 mt-1.5">JPG, PNG or WebP · Max 5 MB</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* GST Number */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          GST Number
          <span className="text-gray-400 font-normal ml-1 text-xs">(optional)</span>
        </label>
        <input
          type="text"
          value={form.gst_number}
          onChange={(e) => update('gst_number', e.target.value.toUpperCase())}
          placeholder="22AAAAA0000A1Z5"
          maxLength={15}
          className="search-input font-mono tracking-wider uppercase"
        />
        <p className="text-xs text-gray-400 mt-1">15-character GSTIN — adds a verified badge to your shop</p>
      </div>

      {/* Phone */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">Phone Number *</label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => update('phone', e.target.value)}
          placeholder="9876543210"
          className="search-input"
        />
      </div>

      {/* Website */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Website
          <span className="text-gray-400 font-normal ml-1 text-xs">(optional)</span>
        </label>
        <input
          type="url"
          value={form.website}
          onChange={(e) => update('website', e.target.value)}
          placeholder="https://yourshop.com"
          className="search-input"
        />
      </div>

      {/* Trust notice */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex gap-2.5 text-xs text-gray-600">
        <CheckCircle size={14} className="text-primary flex-shrink-0 mt-0.5" />
        <span>
          Your application is reviewed by our admin team. You'll receive a notification once approved.
          You can start adding offers immediately after submission.
        </span>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
function BecomeVendorModal({ onClose, onSuccess }: {
  readonly onClose: () => void;
  readonly onSuccess: () => void;
}) {
  const [step, setStep]               = useState(0);
  const [loading, setLoading]         = useState(false);
  const [plans, setPlans]             = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [categories, setCategories]   = useState<VendorCategory[]>([]);
  const [form, setForm]               = useState<VendorForm>({
    business_name: '', category: '', description: '',
    address: '', city: '', lat: null, lng: null,
    phone: '', website: '', gst_number: '', logo_url: '',
  });

  useEffect(() => {
    setLoadingPlans(true);
    api.get(endpoints.plansList).then((r) => {
      if (r.data.success) {
        // Coerce price to number — API returns it as a decimal string e.g. "499.00"
        setPlans((r.data.data as Plan[]).map((p) => ({ ...p, price: parseFloat(String(p.price)) })));
      }
    }).finally(() => setLoadingPlans(false));

    api.get(endpoints.categoriesList(true)).then((r) => {
      if (r.data.success) {
        const cats: VendorCategory[] = r.data.data ?? [];
        setCategories(cats);
        if (cats.length > 0) setForm((f) => ({ ...f, category: cats[0].slug }));
      }
    }).catch(() => toast.error('Failed to load categories'));
  }, []);

  const update = (k: keyof VendorForm, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const updateLatLng = (lat: number, lng: number, address?: string) =>
    setForm((f) => ({ ...f, lat, lng, ...(address ? { address } : {}) }));

  const canNext = () => {
    if (step === 0) return form.business_name.trim().length > 0 && form.category.length > 0;
    if (step === 1) return form.lat !== null && form.lng !== null;
    if (step === 2) return form.phone.trim().length > 0;
    return selectedPlan !== null;
  };

  const submitApplication = async (paymentOrderId?: string) => {
    const res = await api.post(endpoints.vendorApplySubmit, {
      ...form,
      plan_id: selectedPlan!.id,
      ...(paymentOrderId ? { payment_order_id: paymentOrderId } : {}),
    });
    if (res.data.success) {
      toast.success('Application submitted! Our team will review it shortly.');
      onSuccess();
    }
  };

  const handleSubmit = async () => {
    if (!canNext() || !selectedPlan) return;
    setLoading(true);
    try {
      if (selectedPlan.price === 0) {
        await submitApplication();
        return;
      }
      const orderRes = await api.post(endpoints.paymentCreateOrder, {
        plan_id: selectedPlan.id,
        amount: selectedPlan.price,
      });
      if (!orderRes.data.success) { toast.error('Could not initiate payment'); return; }
      const { payment_session_id, order_id } = orderRes.data.data as { payment_session_id: string; order_id: string };

      // Guard: free-plan edge case — backend returned {free:true} without order_id
      if (!order_id || !payment_session_id) {
        await submitApplication();
        return;
      }

      const { load: loadCF } = await import('@cashfreepayments/cashfree-js');
      const cashfree = await loadCF({ mode: 'sandbox' });
      await cashfree.checkout({ paymentSessionId: payment_session_id, redirectTarget: '_modal' });
      const interval = setInterval(async () => {
        try {
          const vRes = await api.get(endpoints.paymentVerify(order_id));
          // Backend returns status as lowercase 'paid' / 'pending'
          if (vRes.data.success && vRes.data.data.status === 'paid') {
            clearInterval(interval);
            await submitApplication(order_id);
          }
        } catch { /* poll silently */ }
      }, 3000);
      setTimeout(() => clearInterval(interval), 300000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Failed to submit';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Store size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-gray-900 text-base">Become a Vendor</h2>
              <p className="text-xs text-gray-400">Step {step + 1} of {STEPS.length} — {STEPS[step].label}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-5 py-3 border-b border-gray-50 flex-shrink-0">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center flex-1">
                <div className={`flex items-center gap-1.5 ${i <= step ? 'text-primary' : 'text-gray-300'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i < step  ? 'bg-primary text-white' :
                    i === step ? 'bg-primary/10 text-primary ring-2 ring-primary/30' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {i < step ? '✓' : <Icon size={13} />}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${i <= step ? 'text-gray-700' : 'text-gray-400'}`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 rounded-full transition-all ${i < step ? 'bg-primary' : 'bg-gray-100'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === 0 && <Step1 form={form} update={update} categories={categories} />}
          {step === 1 && <Step2 form={form} update={update} updateLatLng={updateLatLng} />}
          {step === 2 && <Step3 form={form} update={update} />}
          {step === 3 && (
            <Step4
              selectedPlanId={selectedPlan?.id ?? null}
              onSelect={setSelectedPlan}
              plans={plans}
              loadingPlans={loadingPlans}
            />
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 flex-shrink-0">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={15} /> Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
              className="flex-1 flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !canNext()}
              className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? 'Submitting...' : selectedPlan && selectedPlan.price > 0 ? 'Pay & Submit' : 'Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Profile Page ─────────────────────────────────────────────────────────────
export default function Profile() {
  const { user, logout } = useUserStore();
  const [tab, setTab]               = useState<Tab>('overview');
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [savedOffers,   setSavedOffers]   = useState<SavedOffer[]>([]);
  const [savedLoading,  setSavedLoading]  = useState(false);
  const [followedVendors, setFollowedVendors] = useState<FollowedVendor[]>([]);
  const [followedLoading, setFollowedLoading] = useState(false);
  const [referral, setReferral] = useState<{ referral_code: string; coins: number; referral_count: number } | null>(null);
  const [refCopied, setRefCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      api.get(endpoints.referralMy).then((r) => {
        if (r.data.success) setReferral(r.data.data);
      }).catch(() => {});
    }
    if (tab === 'saved' && user) {
      setSavedLoading(true);
      api.get(endpoints.savedOffers()).then((r) => {
        if (r.data.success) setSavedOffers(r.data.data ?? []);
      }).finally(() => setSavedLoading(false));
    }
    if (tab === 'subscribed' && user) {
      setFollowedLoading(true);
      api.get(endpoints.vendorFollowing).then((r) => {
        if (r.data.success) setFollowedVendors(r.data.data ?? []);
      }).finally(() => setFollowedLoading(false));
    }
  }, [tab, user]);

  const handleUnfollow = async (vendorId: number) => {
    await api.post(endpoints.vendorFollow, { vendor_id: vendorId, action: 'unfollow' }).catch(() => {});
    setFollowedVendors((prev) => prev.filter((v) => v.id !== vendorId));
    toast.success('Unsubscribed');
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleVendorSuccess = () => {
    setShowVendorModal(false);
    toast.success('Application submitted! We\'ll notify you once our team reviews it.');
  };

  const copyReferralLink = () => {
    if (!referral) return;
    const link = `${window.location.origin}/register?ref=${referral.referral_code}`;
    navigator.clipboard.writeText(link);
    setRefCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setRefCopied(false), 2000);
  };

  const shareWhatsAppReferral = () => {
    if (!referral) return;
    const link = `${window.location.origin}/register?ref=${referral.referral_code}`;
    const text = `Join me on AdsLife — discover the best local offers near you and earn coins! Use my referral link: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'overview',   label: 'Overview',   icon: '👤' },
    { key: 'saved',      label: 'Saved',      icon: '🔖' },
    { key: 'subscribed', label: 'Subscribed', icon: '🔔' },
  ];

  if (!user) return null;

  return (
    <div className="w-full pb-20 sm:pb-6">

      {/* Become a Vendor CTA */}
      {user.role === 'user' && (
        <button
          onClick={() => setShowVendorModal(true)}
          className="w-full flex items-center justify-between bg-gradient-to-r from-primary to-orange-400 text-white rounded-2xl p-4 mb-5 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Store size={20} />
            </div>
            <div className="text-left">
              <p className="font-heading font-bold text-sm">Become a Vendor</p>
              <p className="text-white/80 text-xs mt-0.5">List your shop &amp; reach more customers</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-white/70" />
        </button>
      )}

      {/* Profile header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
            {user.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading font-bold text-xl text-gray-900">{user.name}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize font-medium">{user.role}</span>
              {user.city && <span className="text-xs text-gray-400">📍 {user.city}</span>}
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-danger transition-colors">
            <LogOut size={18} />
          </button>
        </div>

      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-heading font-semibold transition-all ${tab === t.key ? 'bg-white shadow-sm text-primary' : 'text-gray-500'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Coins & Referral Card */}
          {referral && (
            <div className="bg-gradient-to-br from-orange-500 to-amber-400 rounded-2xl p-5 text-white shadow-lg shadow-orange-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Gift size={20} />
                  <span className="font-heading font-bold text-lg">Invite & Earn</span>
                </div>
                <div className="bg-white/20 rounded-xl px-3 py-1 flex items-center gap-1.5">
                  <span className="text-lg">🪙</span>
                  <span className="font-bold text-lg">{referral.coins}</span>
                  <span className="text-xs opacity-80">coins</span>
                </div>
              </div>
              <p className="text-sm opacity-90 mb-4">
                Invite friends — you earn <strong>50 coins</strong>, they get <strong>20 coins</strong> free!
              </p>
              <div className="bg-white/20 rounded-xl px-3 py-2 flex items-center justify-between mb-3">
                <span className="font-mono text-sm font-bold tracking-widest">{referral.referral_code}</span>
                <button onClick={copyReferralLink} className="ml-2 p-1 hover:bg-white/20 rounded-lg transition-colors">
                  {refCopied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={shareWhatsAppReferral}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 rounded-xl py-2.5 text-sm font-semibold transition-colors"
                >
                  <MessageCircle size={16} /> Share on WhatsApp
                </button>
              </div>
              {referral.referral_count > 0 && (
                <p className="text-xs opacity-70 mt-3 text-center">
                  🎉 {referral.referral_count} friend{referral.referral_count > 1 ? 's' : ''} joined using your link
                </p>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-heading font-semibold text-gray-800 mb-1">Welcome, {user.name?.split(' ')[0]}!</h3>
            <p className="text-sm text-gray-500">Manage your saved offers and subscribed vendors below.</p>
          </div>
        </div>
      )}


      {tab === 'saved' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
            <Bookmark size={16} className="text-[var(--primary)]" />
            <h3 className="font-heading font-semibold text-gray-800">Saved Offers</h3>
            <span className="ml-auto text-xs text-gray-400">{savedOffers.length} saved</span>
          </div>
          {savedLoading ? (
            <div className="divide-y divide-gray-50">
              {[1,2,3].map((i) => (
                <div key={i} className="flex gap-3 p-4">
                  <div className="skeleton w-14 h-14 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="skeleton h-3.5 w-3/4 rounded" />
                    <div className="skeleton h-3 w-1/2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : savedOffers.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Bookmark size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No saved offers yet</p>
              <p className="text-xs mt-1">Save offers while browsing to find them here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {savedOffers.map((o) => {
                const tl = (() => {
                  if (!o.valid_until) return '';
                  const diff = new Date(o.valid_until).getTime() - Date.now();
                  if (diff <= 0) return 'Expired';
                  const d = Math.floor(diff / 86400000);
                  return d > 0 ? `${d}d left` : 'Ending soon';
                })();
                return (
                  <div key={o.id} className="flex items-start gap-3 p-4 hover:bg-gray-50/50 transition-colors">
                    {(o.image_url ?? o.banner_url) ? (
                      <img src={o.image_url ?? o.banner_url} alt={o.title}
                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Tag size={20} className="text-[var(--primary)]" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{o.title}</p>
                      <p className="text-xs text-gray-500 truncate">{o.business_name}{o.vendor_city ? ` · ${o.vendor_city}` : ''}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {o.discount_percent > 0 && (
                          <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                            {o.discount_percent}% OFF
                          </span>
                        )}
                        {tl && (
                          <span className={`text-[10px] font-medium ${tl === 'Expired' ? 'text-red-400' : 'text-gray-400'}`}>
                            {tl}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/offer/${o.id}`)}
                      className="flex-shrink-0 p-1.5 text-gray-400 hover:text-[var(--primary)] transition-colors"
                    >
                      <ExternalLink size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'subscribed' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
            <Bell size={16} className="text-[var(--primary)]" />
            <h3 className="font-heading font-semibold text-gray-800">Subscribed Shops</h3>
            <span className="ml-auto text-xs text-gray-400">{followedVendors.length} subscribed</span>
          </div>
          {followedLoading ? (
            <div className="divide-y divide-gray-50">
              {[1,2,3].map((i) => (
                <div key={i} className="flex gap-3 p-4">
                  <div className="skeleton w-12 h-12 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="skeleton h-3.5 w-2/3 rounded" />
                    <div className="skeleton h-3 w-1/3 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : followedVendors.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Bell size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Not subscribed to any shops</p>
              <p className="text-xs mt-1">Subscribe to shops to get notified about their deals</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {followedVendors.map((v) => (
                <div key={v.id} className="flex items-center gap-3 p-4 hover:bg-gray-50/50 transition-colors">
                  {v.logo_url ? (
                    <img src={v.logo_url} alt={v.business_name}
                      className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary text-lg">
                      {v.business_name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{v.business_name}</p>
                    <p className="text-xs text-gray-500 capitalize truncate">
                      {v.category}{v.city ? ` · ${v.city}` : ''}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {v.active_offers} active offer{v.active_offers !== 1 ? 's' : ''} · {v.total_followers} followers
                    </p>
                  </div>
                  <button
                    onClick={() => handleUnfollow(v.id)}
                    title="Unsubscribe"
                    className="flex-shrink-0 flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-300 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <BellOff size={13} />
                    Unsubscribe
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showVendorModal && (
        <BecomeVendorModal
          onClose={() => setShowVendorModal(false)}
          onSuccess={handleVendorSuccess}
        />
      )}
    </div>
  );
}
