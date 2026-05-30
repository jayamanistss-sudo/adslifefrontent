import { useState, useEffect, useRef } from 'react';
import { Store, Upload, X, MapPin, Search, LocateFixed } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';

declare const L: any;

const CATEGORIES = ['food', 'retail', 'beauty', 'fitness', 'tech', 'travel', 'entertainment', 'general'];

interface VendorProfile {
  business_name: string; category: string; description: string;
  address: string; city: string; phone: string; website: string;
  gst_number: string; logo_url: string; lat: number | null; lng: number | null;
  subscription_plan: string; plan_name: string; total_followers: number;
  email: string; status: string;
}

export default function EditVendorProfile() {
  const [profile, setProfile]   = useState<VendorProfile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const mapRef  = useRef<HTMLDivElement>(null);
  const mapObj  = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [form, setForm] = useState({
    business_name: '', category: 'general', description: '',
    address: '', city: '', phone: '', website: '', gst_number: '', logo_url: '',
    lat: '' as string, lng: '' as string,
  });
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    api.get(endpoints.vendorProfile).then((r) => {
      if (r.data.success) {
        const p = r.data.data as VendorProfile;
        setProfile(p);
        setForm({
          business_name: p.business_name ?? '',
          category:      p.category      ?? 'general',
          description:   p.description   ?? '',
          address:       p.address       ?? '',
          city:          p.city          ?? '',
          phone:         p.phone         ?? '',
          website:       p.website       ?? '',
          gst_number:    p.gst_number    ?? '',
          logo_url:      p.logo_url      ?? '',
          lat:           p.lat != null   ? String(p.lat) : '',
          lng:           p.lng != null   ? String(p.lng) : '',
        });
      }
    }).finally(() => setLoading(false));
  }, []);

  /* ── Leaflet map init ───────────────────────────────────── */
  useEffect(() => {
    if (loading || !mapRef.current || mapObj.current) return;
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      const lat = form.lat ? parseFloat(form.lat) : 13.0827;
      const lng = form.lng ? parseFloat(form.lng) : 80.2707;
      const map = L.map(mapRef.current!).setView([lat, lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      if (form.lat && form.lng) {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current.on('dragend', (e: any) => {
          const { lat: la, lng: lo } = e.target.getLatLng();
          setForm((f) => ({ ...f, lat: String(la.toFixed(7)), lng: String(lo.toFixed(7)) }));
        });
      }
      map.on('click', (e: any) => {
        const { lat: la, lng: lo } = e.latlng;
        setForm((f) => ({ ...f, lat: String(la.toFixed(7)), lng: String(lo.toFixed(7)) }));
        if (markerRef.current) { markerRef.current.setLatLng([la, lo]); }
        else { markerRef.current = L.marker([la, lo], { draggable: true }).addTo(map); }
      });
      mapObj.current = map;
    };
    document.head.appendChild(script);
    if (!document.querySelector('link[href*="leaflet"]')) {
      const css = document.createElement('link');
      css.rel  = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
    }
  }, [loading]);

  const upd = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post(endpoints.uploadImage, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data.success) { upd('logo_url', res.data.data.url as string); toast.success('Logo uploaded!'); }
    } catch { toast.error('Upload failed — max 10 MB'); }
    finally { setUploading(false); }
  };

  const handleSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&limit=1`);
      const data = await res.json();
      if (data[0]) {
        const { lat: la, lon: lo, display_name } = data[0];
        setForm((f) => ({ ...f, lat: parseFloat(la).toFixed(7), lng: parseFloat(lo).toFixed(7), address: display_name }));
        if (mapObj.current) {
          mapObj.current.setView([parseFloat(la), parseFloat(lo)], 15);
          if (markerRef.current) { markerRef.current.setLatLng([parseFloat(la), parseFloat(lo)]); }
          else { markerRef.current = L.marker([parseFloat(la), parseFloat(lo)], { draggable: true }).addTo(mapObj.current); }
        }
      } else { toast.error('Location not found'); }
    } catch { toast.error('Search failed'); }
    finally { setSearching(false); }
  };

  const handleLocate = () => {
    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      const { latitude: la, longitude: lo } = coords;
      setForm((f) => ({ ...f, lat: la.toFixed(7), lng: lo.toFixed(7) }));
      if (mapObj.current) {
        mapObj.current.setView([la, lo], 15);
        if (markerRef.current) { markerRef.current.setLatLng([la, lo]); }
        else { markerRef.current = L.marker([la, lo], { draggable: true }).addTo(mapObj.current); }
      }
    }, () => toast.error('Could not get location'));
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!form.business_name.trim()) return;
    setSaving(true);
    try {
      const res = await api.put(endpoints.vendorProfile, {
        ...form,
        lat: form.lat ? parseFloat(form.lat) : null,
        lng: form.lng ? parseFloat(form.lng) : null,
      });
      if (res.data.success) { toast.success('Profile updated!'); }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to save');
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="max-w-2xxl pb-6">
        <BackButton to="/vendor/dashboard" />
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xxl pb-6">
      <BackButton to="/vendor/dashboard" />

      <div className="page-header">
        <div>
          <h1 className="page-title">Edit Business Profile</h1>
          <p className="page-subtitle">Update your business details visible to customers</p>
        </div>
        {profile && (
          <div className="text-right">
            <span className="badge badge-accent">{profile.plan_name ?? profile.subscription_plan}</span>
            <div className="text-xs text-[var(--text-muted)] mt-1">{profile.total_followers} followers</div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Logo */}
        <div className="card p-5">
          <h3 className="font-heading font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
            <Store size={16} /> Business Identity
          </h3>
          <div className="flex items-start gap-4 mb-4">
            <div
              onClick={() => fileRef.current?.click()}
              className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-[var(--border)] flex items-center justify-center overflow-hidden bg-[var(--surface-2)] cursor-pointer hover:border-[var(--primary)] transition-colors flex-shrink-0"
            >
              {form.logo_url ? (
                <>
                  <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); upd('logo_url', ''); }}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                    <X size={10} className="text-white" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-1 text-[var(--text-muted)]">
                  {uploading ? <Upload size={16} className="animate-bounce" /> : <Upload size={16} />}
                  <span className="text-[10px]">{uploading ? 'Uploading…' : 'Logo'}</span>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <label htmlFor="vp-name" className="block text-sm font-medium text-[var(--text)] mb-1.5">Business Name *</label>
                <input id="vp-name" className="input" placeholder="Your business name" required
                  value={form.business_name} onChange={(e) => upd('business_name', e.target.value)} />
              </div>
              <div>
                <label htmlFor="vp-cat" className="block text-sm font-medium text-[var(--text)] mb-1.5">Category</label>
                <select id="vp-cat" className="input" value={form.category} onChange={(e) => upd('category', e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} />
          <div>
            <label htmlFor="vp-desc" className="block text-sm font-medium text-[var(--text)] mb-1.5">Description</label>
            <textarea id="vp-desc" className="input h-24 resize-none" placeholder="Tell customers about your business…"
              value={form.description} onChange={(e) => upd('description', e.target.value)} />
          </div>
        </div>

        {/* Contact */}
        <div className="card p-5">
          <h3 className="font-heading font-semibold text-[var(--text)] mb-4">Contact Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="vp-phone" className="block text-sm font-medium text-[var(--text)] mb-1.5">Phone *</label>
              <input id="vp-phone" className="input" type="tel" placeholder="9876543210"
                value={form.phone} onChange={(e) => upd('phone', e.target.value)} />
            </div>
            <div>
              <label htmlFor="vp-city" className="block text-sm font-medium text-[var(--text)] mb-1.5">City</label>
              <input id="vp-city" className="input" placeholder="Chennai"
                value={form.city} onChange={(e) => upd('city', e.target.value)} />
            </div>
            <div>
              <label htmlFor="vp-web" className="block text-sm font-medium text-[var(--text)] mb-1.5">Website <span className="text-[var(--text-muted)] font-normal text-xs">(optional)</span></label>
              <input id="vp-web" className="input" type="url" placeholder="https://yourshop.com"
                value={form.website} onChange={(e) => upd('website', e.target.value)} />
            </div>
            <div>
              <label htmlFor="vp-gst" className="block text-sm font-medium text-[var(--text)] mb-1.5">GST Number <span className="text-[var(--text-muted)] font-normal text-xs">(optional)</span></label>
              <input id="vp-gst" className="input font-mono uppercase tracking-wider" placeholder="22AAAAA0000A1Z5" maxLength={15}
                value={form.gst_number} onChange={(e) => upd('gst_number', e.target.value.toUpperCase())} />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="card p-5">
          <h3 className="font-heading font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
            <MapPin size={16} /> Location
          </h3>
          <div className="flex gap-2 mb-3">
            <input className="input flex-1" placeholder="Search address…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())} />
            <button type="button" onClick={handleSearch} disabled={searching} className="btn btn-secondary btn-sm">
              <Search size={14} /> {searching ? 'Searching…' : 'Search'}
            </button>
            <button type="button" onClick={handleLocate} className="btn btn-secondary btn-sm" title="Use my location">
              <LocateFixed size={14} />
            </button>
          </div>
          <div ref={mapRef} className="w-full rounded-xl overflow-hidden border border-[var(--border)]" style={{ height: '220px' }} />
          {form.address && <p className="text-xs text-[var(--text-muted)] mt-2 truncate"><MapPin size={10} className="inline mr-1" />{form.address}</p>}
          {form.lat && form.lng && (
            <p className="text-xs text-[var(--text-muted)] mt-1">Coordinates: {parseFloat(form.lat).toFixed(5)}, {parseFloat(form.lng).toFixed(5)}</p>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn btn-primary flex-1">
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
          <BackButton to="/vendor/dashboard" label="Cancel" />
        </div>
      </form>
    </div>
  );
}
