import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  LogOut, Store, ChevronRight, X, CheckCircle,
  MapPin, Search, LocateFixed, Upload, ImagePlus,
  ChevronLeft, Building2, FileText, Camera, Layers, Check,
  Bookmark, Bell, BellOff, ExternalLink, Tag, Copy, Gift, MessageCircle, Info, Coins, Pencil
} from 'lucide-react';
import CategoryIcon from '../components/CategoryIcon';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useUserStore } from '../store/useUserStore';
import { api, endpoints } from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'saved' | 'subscribed';

const PHONE_PATTERN = /^[6-9]\d{9}$/;
const GST_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z]{1}[A-Z\d]{1}$/;
const URL_PATTERN = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

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

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { type: 'spring', stiffness: 280, damping: 22 } 
  }
};

function Step4({ selectedPlanId, onSelect, plans, loadingPlans }: {
  readonly selectedPlanId: number | null;
  readonly onSelect: (plan: Plan) => void;
  readonly plans: Plan[];
  readonly loadingPlans: boolean;
}) {
  if (loadingPlans) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[1,2,3,4].map((i) => <div key={i} className="skeleton h-40 rounded-3xl" />)}
    </div>
  );
  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--text-secondary)] font-medium">Choose an advertising plan to start listing your exclusive deals.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {plans.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelect(plan)}
            className={`relative text-left p-5 rounded-3xl border-2 transition-all duration-300 ${PLAN_COLORS[plan.slug] ?? 'border-[var(--border)]'} ${
              selectedPlanId === plan.id
                ? 'ring-2 ring-[var(--primary)] bg-[var(--primary-light)] border-[var(--primary)]'
                : 'bg-[var(--surface)] hover:bg-[var(--surface-2)] border-[var(--border)] hover:border-gray-300'
            }`}
          >
            {PLAN_BADGES[plan.slug] && (
              <span className="absolute -top-2.5 left-4 badge badge-primary text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-1 shadow-sm">{PLAN_BADGES[plan.slug]}</span>
            )}
            <div className="flex items-start justify-between mb-2">
              <span className="font-heading font-bold text-[var(--text)] text-sm">{plan.name}</span>
              {selectedPlanId === plan.id && <Check size={16} className="text-[var(--primary)] flex-shrink-0" />}
            </div>
            <div className="font-heading font-extrabold text-2xl text-[var(--text)] mb-3">
              {plan.price === 0 ? 'Free' : `₹${plan.price.toLocaleString()}/mo`}
            </div>
            <ul className="space-y-1.5">
              {plan.features.slice(0, 3).map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <Check size={11} className="text-emerald-500 flex-shrink-0" />
                  <span className="truncate">{f}</span>
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
    <div className="space-y-5">
      <div>
        <label className="modal-label font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Business Name *</label>
        <input
          type="text"
          value={form.business_name}
          onChange={(e) => update('business_name', e.target.value)}
          placeholder="e.g. Spice Garden Restaurant"
          className="input mt-1.5"
        />
      </div>

      <div>
        <label className="modal-label font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Category *</label>
        {categories.length === 0 ? (
          <div className="grid grid-cols-3 gap-2.5 mt-1.5">
            {[1,2,3,4,5,6].map((i) => <div key={i} className="skeleton h-12 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 mt-1.5">
            {categories.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => update('category', c.slug)}
                className={`flex items-center justify-center gap-2 px-3 py-3 rounded-2xl border text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  form.category === c.slug
                    ? 'bg-gradient-to-r from-[var(--primary)] to-orange-500 border-transparent text-white shadow-md shadow-primary/10'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] bg-[var(--surface)] hover:bg-[var(--surface-2)]'
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
        <label className="modal-label font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Description</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Tell customers what makes your shop special..."
          className="input mt-1.5 resize-none"
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
    html: `<div style="width:28px;height:28px;background:#FF6200;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
    className: '',
    iconSize:   [28, 28],
    iconAnchor: [14, 28],
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

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json() as { display_name?: string; address?: Record<string, string> };
      if (data.display_name) {
        update('address', data.display_name.split(',').slice(0, 3).join(',').trim());
      }
      const city = data.address?.city ?? data.address?.town ?? data.address?.village ?? data.address?.suburb;
      if (city) update('city', city);
    } catch {
      // best-effort — lat/lng are already set, user can fill address/city manually
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        placeMarker(pos.coords.latitude, pos.coords.longitude);
        reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      },
      () => toast.error('Location access denied'),
    );
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div>
        <label className="modal-label font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Search your shop location</label>
        <div className="flex gap-2 mt-1.5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchAddress(); } }}
              placeholder="Anna Salai, Chennai..."
              className="input pl-10"
            />
          </div>
          <button
            type="button"
            onClick={searchAddress}
            disabled={searching}
            className="px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-2xl text-xs font-bold transition-colors disabled:opacity-60 flex-shrink-0 cursor-pointer shadow-sm shadow-primary/10"
          >
            {searching ? '...' : 'Search'}
          </button>
          <button
            type="button"
            onClick={useMyLocation}
            className="p-2.5 border border-[var(--border)] rounded-2xl text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors flex-shrink-0 cursor-pointer"
            title="Use my location"
          >
            <LocateFixed size={16} />
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="relative rounded-3xl overflow-hidden border border-[var(--border)] shadow-sm">
        <div ref={mapRef} className="h-56 w-full" />
        <div className="absolute bottom-2.5 left-2.5 bg-[var(--surface)]/90 backdrop-blur-sm rounded-xl px-3 py-2 text-[10px] font-semibold text-[var(--text-secondary)] border border-[var(--border)] shadow-md pointer-events-none flex items-center gap-1.5">
          <Info size={11} className="text-[var(--primary)]" />
          <span>Click on the map to pin your exact location</span>
        </div>
      </div>

      {/* Coordinates display */}
      {form.lat && form.lng && (
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 rounded-2xl px-4 py-2.5">
          <MapPin size={14} className="text-emerald-500 flex-shrink-0" />
          <span className="text-xs text-[var(--text-secondary)] font-mono font-semibold">
            {form.lat.toFixed(6)}, {form.lng.toFixed(6)}
          </span>
          <CheckCircle size={14} className="text-emerald-500 ml-auto flex-shrink-0" />
        </div>
      )}

      {/* Address */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="modal-label font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Shop Address</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            placeholder="Full address shown on your profile"
            className="input mt-1.5"
          />
        </div>

        <div>
          <label className="modal-label font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">City</label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            placeholder="e.g. Chennai"
            className="input mt-1.5"
          />
        </div>
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
    <div className="space-y-5">
      {/* Business photo */}
      <div>
        <label className="modal-label font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Business Photo / Logo</label>
        <div className="flex items-center gap-4 mt-2">
          <div
            className="w-20 h-20 rounded-2xl border-2 border-dashed border-[var(--border)] flex items-center justify-center overflow-hidden bg-[var(--surface-2)] cursor-pointer hover:border-[var(--primary)] transition-all flex-shrink-0 shadow-sm"
            onClick={() => fileRef.current?.click()}
          >
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1 text-[var(--text-muted)]">
                <ImagePlus size={20} />
                <span className="text-[9px] font-bold uppercase tracking-wider">Add Photo</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-3.5 py-2 border border-[var(--border)] rounded-2xl text-xs font-bold text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {uploading ? <Upload size={14} className="animate-bounce" /> : <Camera size={14} />}
              {uploading ? 'Uploading...' : 'Choose Photo'}
            </button>
            <p className="text-[10px] text-[var(--text-muted)] mt-1.5">JPG, PNG or WebP · Max 5 MB</p>
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

      <hr className="border-[var(--border)] opacity-60" />

      {/* GST Number */}
      <div>
        <label className="modal-label font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
          GST Number
          <span className="text-[var(--text-muted)] font-normal ml-1 text-xs lowercase">(optional)</span>
        </label>
        <input
          type="text"
          value={form.gst_number}
          onChange={(e) => update('gst_number', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          placeholder="22AAAAA0000A1Z5"
          maxLength={15}
          className="input mt-1.5 font-mono tracking-wider uppercase"
        />
        {form.gst_number && !GST_PATTERN.test(form.gst_number) ? (
          <p className="text-[10px] text-red-500 mt-1.5">Enter a valid 15-character GSTIN, e.g. 22AAAAA0000A1Z5</p>
        ) : (
          <p className="text-[10px] text-[var(--text-muted)] mt-1.5">15-character GSTIN — adds a verified badge to your shop</p>
        )}
      </div>

      {/* Contact info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="modal-label font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">Phone Number *</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="9876543210"
            inputMode="numeric"
            className="input mt-1.5"
          />
          {form.phone && !PHONE_PATTERN.test(form.phone) && (
            <p className="text-[10px] text-red-500 mt-1.5">Enter a valid 10-digit mobile number</p>
          )}
        </div>

        <div>
          <label className="modal-label font-bold text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
            Website
            <span className="text-[var(--text-muted)] font-normal ml-1 text-xs lowercase">(optional)</span>
          </label>
          <input
            type="url"
            value={form.website}
            onChange={(e) => update('website', e.target.value)}
            placeholder="https://yourshop.com"
            className="input mt-1.5"
          />
          {form.website && !URL_PATTERN.test(form.website) && (
            <p className="text-[10px] text-red-500 mt-1.5">Enter a valid URL, e.g. https://yourshop.com</p>
          )}
        </div>
      </div>

      {/* Trust notice */}
      <div className="bg-[var(--primary-light)] border border-[var(--primary)]/20 rounded-2xl p-4 flex gap-3 text-xs text-[var(--text-secondary)]">
        <CheckCircle size={15} className="text-[var(--primary)] flex-shrink-0 mt-0.5" />
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
    if (step === 2) {
      if (!PHONE_PATTERN.test(form.phone)) return false;
      if (form.gst_number && !GST_PATTERN.test(form.gst_number)) return false;
      if (form.website && !URL_PATTERN.test(form.website)) return false;
      return true;
    }
    return selectedPlan !== null;
  };

  const stepValidationMessage = () => {
    if (step === 0) {
      if (!form.business_name.trim()) return 'Enter your business name to continue';
      if (!form.category) return 'Select a category to continue';
    }
    if (step === 1 && (form.lat === null || form.lng === null)) {
      return 'Pin your shop location on the map to continue';
    }
    if (step === 2) {
      if (!form.phone.trim()) return 'Enter a phone number to continue';
      if (!PHONE_PATTERN.test(form.phone)) return 'Enter a valid 10-digit mobile number to continue';
      if (form.gst_number && !GST_PATTERN.test(form.gst_number)) return 'Fix the GST number to continue';
      if (form.website && !URL_PATTERN.test(form.website)) return 'Fix the website URL to continue';
    }
    if (step === 3 && !selectedPlan) {
      return 'Select a plan to continue';
    }
    return null;
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

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-content max-w-lg max-h-[92vh] rounded-3xl shadow-2xl">

        {/* Header */}
        <div className="modal-header px-6 py-4.5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
              <Store size={18} className="text-[var(--primary)]" />
            </div>
            <div>
              <h2 className="modal-title text-base font-bold">Become a Vendor</h2>
              <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mt-0.5">Step {step + 1} of {STEPS.length} — {STEPS[step].label}</p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close">
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-6 py-3 border-b border-[var(--border)] bg-[var(--surface-2)]/30 overflow-x-auto scrollbar-hide flex-shrink-0">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center flex-1 min-w-[70px] sm:min-w-0">
                <div className={`flex items-center gap-1.5 ${i <= step ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold transition-all duration-300 ${
                    i < step  ? 'bg-[var(--primary)] text-white' :
                    i === step ? 'bg-[var(--primary)]/10 text-[var(--primary)] ring-2 ring-[var(--primary)]/30 border border-[var(--primary)]' :
                    'bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]'
                  }`}>
                    {i < step ? '✓' : <Icon size={12} />}
                  </div>
                  <span className={`text-[10px] font-extrabold tracking-wider uppercase hidden md:block ${i <= step ? 'text-[var(--text)]' : 'text-[var(--text-secondary)]'}`}>{s.label.split(' ')[0]}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-[2px] mx-2.5 rounded-full transition-all duration-300 ${i < step ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[var(--surface)]">
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

        {/* Real-time validation hint */}
        {stepValidationMessage() && (
          <p className="px-6 pt-1 text-[11px] font-semibold text-amber-600 text-right">
            {stepValidationMessage()}
          </p>
        )}

        {/* Footer buttons */}
        <div className="modal-footer px-6 py-4">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="btn btn-secondary py-2.5 px-4 cursor-pointer"
            >
              <ChevronLeft size={15} /> Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
              className="btn btn-primary flex-1 py-2.5 cursor-pointer"
            >
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !canNext()}
              className="btn btn-primary flex-1 py-2.5 cursor-pointer"
            >
              {loading ? 'Submitting...' : selectedPlan && selectedPlan.price > 0 ? 'Pay & Submit' : 'Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Edit Profile Modal ────────────────────────────────────────────────────────
function EditProfileModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { user, updateUser } = useUserStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name:       user?.name       ?? '',
    phone:      user?.phone      ?? '',
    city:       user?.city       ?? '',
    avatar_url: user?.avatarUrl  ?? '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [phoneErr,  setPhoneErr]  = useState('');

  const upd = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post(endpoints.uploadImage, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) upd('avatar_url', res.data.data.url as string);
    } catch {
      toast.error('Photo upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (form.phone && !PHONE_PATTERN.test(form.phone)) {
      setPhoneErr('Enter a valid 10-digit mobile number starting with 6–9');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put(endpoints.authProfile, {
        name:       form.name.trim()  || undefined,
        phone:      form.phone.trim() || undefined,
        city:       form.city.trim()  || undefined,
        avatar_url: form.avatar_url   || undefined,
      });
      if (res.data.success) {
        updateUser({
          name:      res.data.data.name,
          phone:     res.data.data.phone,
          city:      res.data.data.city,
          avatarUrl: res.data.data.avatar_url ?? undefined,
        });
        toast.success('Profile updated!');
        onSaved();
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Update failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-content max-w-sm rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="modal-header px-6 py-4.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center">
              <Pencil size={16} className="text-[var(--primary)]" />
            </div>
            <h2 className="modal-title text-base font-bold">Edit Profile</h2>
          </div>
          <button onClick={onClose} className="modal-close"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5 bg-[var(--surface)]">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-[var(--primary)] to-orange-500 flex items-center justify-center cursor-pointer group shadow-md"
            >
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-3xl font-extrabold">
                  {form.name?.[0]?.toUpperCase() ?? user?.name?.[0]?.toUpperCase()}
                </span>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera size={20} className="text-white" />
                )}
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleAvatarUpload} />
            <p className="text-[11px] text-[var(--text-muted)] font-medium">Tap to change photo</p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Full Name</label>
            <input
              value={form.name}
              onChange={(e) => upd('name', e.target.value)}
              placeholder="Your name"
              className="input-field w-full"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => {
                upd('phone', e.target.value.replace(/\D/g, '').slice(0, 10));
                setPhoneErr('');
              }}
              placeholder="10-digit mobile number"
              inputMode="numeric"
              className="input-field w-full"
            />
            {phoneErr && <p className="text-xs text-red-500 mt-1 font-medium">{phoneErr}</p>}
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">City</label>
            <input
              value={form.city}
              onChange={(e) => upd('city', e.target.value)}
              placeholder="Your city"
              className="input-field w-full"
            />
          </div>
        </div>

        <div className="modal-footer px-6 py-4">
          <button onClick={onClose} className="btn btn-secondary py-2.5 px-5 cursor-pointer">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || uploading || !form.name.trim()}
            className="btn btn-primary flex-1 py-2.5 cursor-pointer"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Profile Page ─────────────────────────────────────────────────────────────
export default function Profile() {
  const { user, logout } = useUserStore();
  const [tab, setTab]               = useState<Tab>('overview');
  const [showVendorModal,  setShowVendorModal]  = useState(false);
  const [showEditProfile,  setShowEditProfile]  = useState(false);
  const [savedOffers,   setSavedOffers]   = useState<SavedOffer[]>([]);
  const [savedLoading,  setSavedLoading]  = useState(false);
  const [followedVendors, setFollowedVendors] = useState<FollowedVendor[]>([]);
  const [followedLoading, setFollowedLoading] = useState(false);
  const [referral, setReferral] = useState<{ referral_code: string; coins: number; referral_count: number } | null>(null);
  const [refCopied, setRefCopied] = useState(false);
  const [vendorApp, setVendorApp] = useState<{ status: string; business_name: string } | null>(null);
  const navigate = useNavigate();

  const refreshVendorAppStatus = () => {
    if (!user) return;
    api.get(endpoints.vendorApplyStatus).then((r) => {
      if (r.data.success) setVendorApp(r.data.data);
    }).catch(() => {});
  };

  useEffect(() => {
    if (user) {
      api.get(endpoints.referralMy).then((r) => {
        if (r.data.success) setReferral(r.data.data);
      }).catch(() => {});
      refreshVendorAppStatus();
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
    refreshVendorAppStatus();
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
    <motion.div 
      initial="hidden" 
      animate="show" 
      variants={containerVariants}
      className="max-w-4xl mx-auto pb-20 sm:pb-6 px-4"
    >
      {/* Become a Vendor CTA / Application Status */}
      {user.role === 'user' && !vendorApp && (
        <motion.button
          onClick={() => setShowVendorModal(true)}
          variants={itemVariants}
          whileHover={{ y: -4, boxShadow: '0 20px 30px rgba(255,98,0,0.15)' }}
          whileTap={{ scale: 0.99 }}
          className="w-full flex items-center justify-between bg-gradient-to-r from-[var(--primary)] to-orange-500 text-white rounded-3xl p-5 mb-6 shadow-md transition-all duration-300 cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
              <Store size={22} className="text-white" />
            </div>
            <div className="text-left">
              <p className="font-heading font-bold text-base">Become a Vendor Partner</p>
              <p className="text-white/85 text-xs mt-0.5 font-medium">Advertise your business and connect with customers nearby</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-white/80" />
        </motion.button>
      )}

      {user.role === 'user' && vendorApp?.status === 'pending' && (
        <motion.div
          variants={itemVariants}
          className="w-full flex items-center gap-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-3xl p-5 mb-6"
        >
          <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
            <Store size={22} className="text-amber-600" />
          </div>
          <div className="text-left">
            <p className="font-heading font-bold text-base text-[var(--text)]">Vendor Application Under Review</p>
            <p className="text-[var(--text-secondary)] text-xs mt-0.5 font-medium">
              {vendorApp.business_name} — our team will notify you once it's reviewed (24–48 hours).
            </p>
          </div>
        </motion.div>
      )}

      {user.role === 'user' && vendorApp?.status === 'rejected' && (
        <motion.button
          onClick={() => setShowVendorModal(true)}
          variants={itemVariants}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.99 }}
          className="w-full flex items-center justify-between bg-red-50 dark:bg-red-950/20 border border-red-200/60 dark:border-red-900/30 rounded-3xl p-5 mb-6 transition-all duration-300 cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
              <Store size={22} className="text-red-500" />
            </div>
            <div className="text-left">
              <p className="font-heading font-bold text-base text-[var(--text)]">Vendor Application Not Approved</p>
              <p className="text-[var(--text-secondary)] text-xs mt-0.5 font-medium">{vendorApp.business_name} — tap to update details and reapply</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-[var(--text-secondary)]" />
        </motion.button>
      )}

      {/* Profile Header */}
      <motion.div 
        variants={itemVariants} 
        className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-sm mb-6 flex items-center gap-4 relative overflow-hidden"
        style={{ boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)' }}
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-accent flex items-center justify-center text-2xl font-extrabold text-white flex-shrink-0 shadow-md overflow-hidden">
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            : user.name?.[0]?.toUpperCase()
          }
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-heading font-extrabold text-xl text-[var(--text)] leading-tight">{user.name}</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">{user.email}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[10px] font-bold tracking-wider uppercase bg-[var(--primary-light)] text-[#9A3300] px-2.5 py-0.5 rounded-full border border-orange-200/50">
              {user.role}
            </span>
            {user.city && (
              <span className="text-xs text-[var(--text-secondary)] font-medium flex items-center gap-0.5">
                📍 {user.city}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowEditProfile(true)}
            className="p-2.5 text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-[var(--primary)]/20"
            title="Edit Profile"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={handleLogout}
            className="p-2.5 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-red-200/30"
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div 
        variants={itemVariants}
        className="flex gap-2 bg-[var(--surface-2)] p-1.5 rounded-2xl mb-6 border border-[var(--border)]"
      >
        {tabs.map((t) => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-grow flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold font-heading transition-all duration-300 cursor-pointer ${
                isActive
                  ? 'bg-[var(--surface)] text-[var(--primary)] shadow-sm border border-[var(--border)]/50 font-extrabold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)]/30'
              }`}
            >
              <span className="text-base leading-none">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </motion.div>

      {/* Tab Contents */}
      <AnimatePresence mode="wait">
        {tab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Coins & Referral Card */}
            {referral && (
              <div 
                className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-500 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden border border-white/10"
                style={{ boxShadow: '0 10px 30px rgba(255,98,0,0.15)' }}
              >
                {/* Visual accents */}
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -left-10 -top-10 w-32 h-32 bg-amber-400/20 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between mb-5 relative z-10">
                  <div className="flex items-center gap-2.5">
                    <Gift size={22} className="text-white" />
                    <span className="font-heading font-extrabold text-lg">Invite & Earn</span>
                  </div>
                  <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl px-3.5 py-1.5 flex items-center gap-1.5 shadow-inner">
                    <Coins size={16} className="text-yellow-300" />
                    <span className="font-extrabold text-base tracking-tight">{referral.coins}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-90">Coins</span>
                  </div>
                </div>

                <p className="text-sm opacity-90 mb-5 leading-relaxed font-medium">
                  Invite friends to AdsLife. You earn <strong className="font-extrabold text-yellow-200">50 coins</strong>, and they get <strong className="font-extrabold text-yellow-200">20 coins</strong> to redeem premium localized offers!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
                  <div className="sm:col-span-2 bg-white/10 border border-white/20 rounded-2xl px-4 py-2.5 flex items-center justify-between backdrop-blur-sm shadow-inner font-mono text-sm font-extrabold tracking-widest">
                    <span>{referral.referral_code}</span>
                    <button 
                      onClick={copyReferralLink} 
                      className="p-1.5 hover:bg-white/10 active:scale-95 rounded-lg transition-all cursor-pointer text-white"
                      title="Copy Code"
                    >
                      {refCopied ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                  </div>

                  <button
                    onClick={shareWhatsAppReferral}
                    className="flex items-center justify-center gap-2 bg-white text-orange-600 hover:bg-orange-50 active:scale-95 shadow-md rounded-2xl py-2.5 text-xs font-bold transition-all cursor-pointer flex-shrink-0"
                  >
                    <MessageCircle size={15} fill="currentColor" className="text-orange-500" /> Share Link
                  </button>
                </div>

                {referral.referral_count > 0 && (
                  <p className="text-xs opacity-85 mt-4 text-center font-semibold relative z-10 flex items-center justify-center gap-1.5 bg-black/10 py-1.5 rounded-xl border border-white/5">
                    🎉 {referral.referral_count} friend{referral.referral_count > 1 ? 's' : ''} joined using your invite link!
                  </p>
                )}
              </div>
            )}

            {/* Quick dashboard overview welcome */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-sm">
              <h3 className="font-heading font-extrabold text-base text-[var(--text)] mb-1.5">Welcome back, {user.name?.split(' ')[0]}!</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-6 font-medium">Here's a quick look at your platform activities and details.</p>
              
              <div className="grid grid-cols-3 gap-4">
                <button onClick={() => setTab('saved')} className="bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--primary)]/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer hover:shadow-sm">
                  <Bookmark size={18} className="text-[var(--primary)] mb-2" />
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">Saved Offers</span>
                  <span className="text-base font-extrabold text-[var(--text)] mt-1">{savedOffers.length}</span>
                </button>
                <button onClick={() => setTab('subscribed')} className="bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--primary)]/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer hover:shadow-sm">
                  <Bell size={18} className="text-emerald-500 mb-2" />
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">Subscriptions</span>
                  <span className="text-base font-extrabold text-[var(--text)] mt-1">{followedVendors.length}</span>
                </button>
                <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                  <Coins size={18} className="text-amber-500 mb-2" />
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">Coins Wallet</span>
                  <span className="text-base font-extrabold text-[var(--text)] mt-1">{referral?.coins ?? 0}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'saved' && (
          <motion.div
            key="saved"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-sm overflow-hidden"
          >
            <div className="flex items-center gap-2 px-6 py-4.5 border-b border-[var(--border)] bg-[var(--surface-2)]/30">
              <Bookmark size={16} className="text-[var(--primary)]" />
              <h3 className="font-heading font-bold text-sm text-[var(--text)]">Saved Offers</h3>
              <span className="ml-auto badge badge-neutral px-2.5 py-0.5 rounded-full text-[10px] font-bold">{savedOffers.length} offers</span>
            </div>
            {savedLoading ? (
              <div className="divide-y divide-[var(--border)]/60 px-6">
                {[1,2,3].map((i) => (
                  <div key={i} className="flex gap-4 py-4">
                    <div className="skeleton w-14 h-14 rounded-2xl flex-shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="skeleton h-3.5 w-3/4 rounded" />
                      <div className="skeleton h-3 w-1/2 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : savedOffers.length === 0 ? (
              <div className="py-20 text-center text-[var(--text-muted)] px-6">
                <div className="text-4xl mb-3">🔖</div>
                <p className="text-sm font-semibold text-[var(--text-secondary)]">No saved offers yet</p>
                <p className="text-xs mt-1">Bookmark exclusive deals while browsing to find them listed here.</p>
              </div>
            ) : (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="divide-y divide-[var(--border)]/60 px-4"
              >
                {savedOffers.map((o) => {
                  const tl = (() => {
                    if (!o.valid_until) return '';
                    const diff = new Date(o.valid_until).getTime() - Date.now();
                    if (diff <= 0) return 'Expired';
                    const d = Math.floor(diff / 86400000);
                    return d > 0 ? `${d}d left` : 'Ending soon';
                  })();
                  const isExpiring = tl === 'Ending soon' || tl === 'Expired';
                  return (
                    <motion.div 
                      key={o.id} 
                      variants={itemVariants}
                      className="flex items-start gap-4 p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-all duration-300 rounded-2xl my-2 border border-transparent hover:border-[var(--primary)]/10"
                    >
                      {(o.image_url ?? o.banner_url) ? (
                        <img src={o.image_url ?? o.banner_url} alt={o.title}
                          className="w-14 h-14 rounded-2xl object-cover flex-shrink-0 shadow-sm border border-[var(--border)]" />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 flex items-center justify-center flex-shrink-0 shadow-sm">
                          <Tag size={20} className="text-[var(--primary)]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--text)] truncate leading-snug">{o.title}</p>
                        <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5 font-medium">{o.business_name}{o.vendor_city ? ` · ${o.vendor_city}` : ''}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {o.discount_percent > 0 && (
                            <span className="text-[10px] font-bold bg-orange-50 dark:bg-orange-950/20 text-[var(--primary)] px-2 py-0.5 rounded-full border border-orange-200/50 dark:border-orange-900/30">
                              {o.discount_percent}% OFF
                            </span>
                          )}
                          {tl && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isExpiring 
                                ? 'bg-red-50 dark:bg-red-950/20 text-red-500 border-red-200/30' 
                                : 'bg-gray-50 dark:bg-gray-800/40 text-[var(--text-secondary)] border-[var(--border)]'
                            }`}>
                              {tl}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/offer/${o.id}`)}
                        className="flex-shrink-0 p-2 text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--surface-2)] rounded-xl transition-all cursor-pointer border border-transparent hover:border-[var(--border)]/50"
                        title="View Deal"
                      >
                        <ExternalLink size={15} />
                      </button>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
        )}

        {tab === 'subscribed' && (
          <motion.div
            key="subscribed"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-sm overflow-hidden"
          >
            <div className="flex items-center gap-2 px-6 py-4.5 border-b border-[var(--border)] bg-[var(--surface-2)]/30">
              <Bell size={16} className="text-[var(--primary)]" />
              <h3 className="font-heading font-bold text-sm text-[var(--text)]">Subscribed Shops</h3>
              <span className="ml-auto badge badge-neutral px-2.5 py-0.5 rounded-full text-[10px] font-bold">{followedVendors.length} subscribed</span>
            </div>
            {followedLoading ? (
              <div className="divide-y divide-[var(--border)]/60 px-6">
                {[1,2,3].map((i) => (
                  <div key={i} className="flex gap-4 py-4">
                    <div className="skeleton w-12 h-12 rounded-2xl flex-shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="skeleton h-3.5 w-2/3 rounded" />
                      <div className="skeleton h-3 w-1/3 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : followedVendors.length === 0 ? (
              <div className="py-20 text-center text-[var(--text-muted)] px-6">
                <div className="text-4xl mb-3">🔔</div>
                <p className="text-sm font-semibold text-[var(--text-secondary)]">Not subscribed to any shops</p>
                <p className="text-xs mt-1">Subscribe to businesses to get real-time alerts on active flash sales.</p>
              </div>
            ) : (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="divide-y divide-[var(--border)]/60 px-4"
              >
                {followedVendors.map((v) => (
                  <motion.div 
                    key={v.id} 
                    variants={itemVariants}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-all duration-300 rounded-2xl my-2 border border-transparent hover:border-[var(--primary)]/10"
                  >
                    {v.logo_url ? (
                      <img src={v.logo_url} alt={v.business_name}
                        className="w-12 h-12 rounded-2xl object-cover flex-shrink-0 shadow-sm border border-[var(--border)]" />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center flex-shrink-0 font-extrabold text-emerald-600 dark:text-emerald-400 text-lg shadow-sm">
                        {v.business_name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--text)] truncate leading-snug">{v.business_name}</p>
                      <p className="text-xs text-[var(--text-secondary)] capitalize truncate mt-0.5 font-semibold">
                        {v.category}{v.city ? ` · ${v.city}` : ''}
                      </p>
                      <p className="text-[10px] text-[var(--text-secondary)] font-medium mt-1">
                        <strong className="text-[var(--primary)] font-bold">{v.active_offers ?? 0} active</strong> deal{(v.active_offers ?? 0) !== 1 ? 's' : ''} · {(v.total_followers ?? 0).toLocaleString()} followers
                      </p>
                    </div>
                    <button
                      onClick={() => handleUnfollow(v.id)}
                      title="Unsubscribe"
                      className="flex-shrink-0 flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-red-500 font-bold border border-[var(--border)] hover:border-red-200 bg-[var(--surface)] hover:bg-red-50/40 dark:hover:bg-red-950/10 px-3 py-2 rounded-xl transition-all cursor-pointer"
                    >
                      <BellOff size={13} />
                      <span className="hidden sm:inline">Unsubscribe</span>
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {showVendorModal && (
        <BecomeVendorModal
          onClose={() => setShowVendorModal(false)}
          onSuccess={handleVendorSuccess}
        />
      )}

      {showEditProfile && (
        <EditProfileModal
          onClose={() => setShowEditProfile(false)}
          onSaved={() => setShowEditProfile(false)}
        />
      )}
    </motion.div>
  );
}
