import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Store, TrendingUp, Users, Zap, ChevronRight, MapPin, BarChart2, Navigation } from 'lucide-react';
import { api, endpoints } from '../utils/api';
import { useUserStore } from '../store/useUserStore';
import toast from 'react-hot-toast';

declare const L: any;

const BENEFITS = [
  { icon: <TrendingUp size={20} className="text-primary" />, title: 'Reach local customers', desc: 'Get discovered by thousands of users near your shop.' },
  { icon: <Zap size={20} className="text-primary" />, title: 'Post offers in 2 minutes', desc: 'Simple dashboard — no tech skills needed.' },
  { icon: <BarChart2 size={20} className="text-primary" />, title: 'Real analytics', desc: 'See views, clicks, and redemptions for every offer.' },
  { icon: <Users size={20} className="text-primary" />, title: 'Build followers', desc: 'Users subscribe to your shop and get notified of new deals.' },
  { icon: <MapPin size={20} className="text-primary" />, title: 'Map visibility', desc: 'Your shop appears on the map when users search nearby.' },
  { icon: <CheckCircle size={20} className="text-primary" />, title: 'Free to start', desc: "No cost for the first 30 days. Upgrade when you're ready." },
];

export default function BecomeVendor() {
  const { user, isAuthenticated, setUser } = useUserStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<'landing' | 'form'>('landing');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    business_name: '', category: '', city: '', address: '',
    phone: '', website: '', description: '',
    lat: '', lng: '', referral_code: '',
  });
  const [categories, setCategories] = useState<{ id: number; name: string; slug: string }[]>([]);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Load categories from API
  useEffect(() => {
    api.get(endpoints.categoriesList()).then(res => {
      if (res.data?.success) setCategories(res.data.data ?? []);
    }).catch(() => {});
  }, []);

  // Load Leaflet and init map when form step is shown
  useEffect(() => {
    if (step !== 'form' || !mapRef.current || mapObj.current) return;

    const initMap = () => {
      const lat = form.lat ? parseFloat(form.lat) : 13.0827;
      const lng = form.lng ? parseFloat(form.lng) : 80.2707;
      const map = L.map(mapRef.current!).setView([lat, lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      if (form.lat && form.lng) {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current.on('dragend', (e: any) => {
          const { lat: la, lng: lo } = e.target.getLatLng();
          setForm(f => ({ ...f, lat: String(la.toFixed(7)), lng: String(lo.toFixed(7)) }));
          reverseGeocode(la, lo);
        });
      }

      map.on('click', (e: any) => {
        const { lat: la, lng: lo } = e.latlng;
        setForm(f => ({ ...f, lat: String(la.toFixed(7)), lng: String(lo.toFixed(7)) }));
        if (markerRef.current) {
          markerRef.current.setLatLng([la, lo]);
        } else {
          markerRef.current = L.marker([la, lo], { draggable: true }).addTo(map);
          markerRef.current.on('dragend', (ev: any) => {
            const { lat: la2, lng: lo2 } = ev.target.getLatLng();
            setForm(f => ({ ...f, lat: String(la2.toFixed(7)), lng: String(lo2.toFixed(7)) }));
            reverseGeocode(la2, lo2);
          });
        }
        reverseGeocode(la, lo);
      });

      mapObj.current = map;
    };

    if (typeof L !== 'undefined') {
      initMap();
      return;
    }

    if (!document.querySelector('link[href*="leaflet"]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
    }
    if (!document.querySelector('script[src*="leaflet"]')) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Cleanup map when leaving form
  useEffect(() => {
    if (step !== 'form' && mapObj.current) {
      mapObj.current.remove();
      mapObj.current = null;
      markerRef.current = null;
    }
  }, [step]);

  const reverseGeocode = async (la: number, lo: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${la}&lon=${lo}&zoom=18&addressdetails=1`,
      );
      const data = await res.json();
      const addr = data?.address ?? {};
      const city = addr.city ?? addr.town ?? addr.village ?? addr.county ?? addr.state ?? '';
      setForm(f => ({
        ...f,
        address: data.display_name ?? f.address,
        ...(city ? { city } : {}),
      }));
    } catch {}
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const la = coords.latitude;
        const lo = coords.longitude;
        setForm(f => ({ ...f, lat: String(la.toFixed(7)), lng: String(lo.toFixed(7)) }));
        if (mapObj.current) {
          mapObj.current.setView([la, lo], 16);
          if (markerRef.current) {
            markerRef.current.setLatLng([la, lo]);
          } else {
            markerRef.current = L.marker([la, lo], { draggable: true }).addTo(mapObj.current);
            markerRef.current.on('dragend', (e: any) => {
              const { lat: la2, lng: lo2 } = e.target.getLatLng();
              setForm(f2 => ({ ...f2, lat: String(la2.toFixed(7)), lng: String(lo2.toFixed(7)) }));
              reverseGeocode(la2, lo2);
            });
          }
        }
        reverseGeocode(la, lo);
      },
      () => toast.error('Could not get your location'),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/login?redirect=/become-vendor'); return; }
    if (!form.business_name.trim()) { toast.error('Business name is required'); return; }
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone.trim())) { toast.error('Enter a valid 10-digit mobile number'); return; }
    if (!form.lat || !form.lng) { toast.error('Please pin your business location on the map'); return; }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        lat: form.lat ? parseFloat(form.lat) : undefined,
        lng: form.lng ? parseFloat(form.lng) : undefined,
        referral_code: form.referral_code.trim() || undefined,
      };
      const res = await api.post(endpoints.vendorApplySubmit, payload);
      if (res.data.success) setDone(true);
      else toast.error(res.data.error ?? 'Submission failed');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  // Poll /auth/me after submission so vendor permissions activate without logout/login
  useEffect(() => {
    if (!done || !isAuthenticated) return;
    const poll = setInterval(async () => {
      try {
        const res = await api.get(endpoints.authMe);
        const u = res.data?.data;
        if (u?.role === 'vendor') {
          setUser({
            id: u.id, name: u.name, email: u.email,
            streakDays: Number.parseInt(u.streak_days) || 0,
            role: u.role, adminRole: u.admin_role ?? null, city: u.city ?? undefined,
            phone: u.phone ?? undefined,
            lat: u.lat != null ? Number.parseFloat(u.lat) : undefined,
            lng: u.lng != null ? Number.parseFloat(u.lng) : undefined,
            avatarUrl: u.avatar_url ?? undefined,
            emailAlerts: u.email_alerts,
            pushEnabled: u.push_enabled,
          });
          toast.success('🎉 Your vendor account is now active!');
          clearInterval(poll);
          navigate('/vendor/dashboard');
        }
      } catch {}
    }, 10000); // check every 10s
    return () => clearInterval(poll);
  }, [done, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  if (done) return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-[var(--surface-2)]">
      <div className="w-full max-w-md p-10 text-center card rounded-3xl">
        <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 rounded-full" style={{ background: 'var(--accent-light)' }}>
          <CheckCircle size={40} style={{ color: 'var(--accent)' }} />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-[var(--text)]">Application Submitted!</h2>
        <p className="mb-2 text-[var(--text-muted)]">Our team will review your application and notify you within 24–48 hours.</p>
        <p className="mb-6 text-sm text-[var(--text-muted)]">This page will automatically redirect you to the vendor dashboard once approved — no need to log out.</p>
        <div className="flex items-center justify-center gap-2 mb-6 text-xs text-primary">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Waiting for admin approval…
        </div>
        <button onClick={() => navigate('/feed')} className="btn btn-primary w-full">
          Back to AdsLife
        </button>
      </div>
    </div>
  );

  if (step === 'form') return (
    <div className="min-h-screen px-4 py-10 bg-[var(--surface-2)]">
      <div className="max-w-lg mx-auto">
        <button onClick={() => setStep('landing')} className="flex items-center gap-1 mb-6 text-sm text-[var(--text-muted)] hover:text-primary">
          ← Back
        </button>
        <div className="p-8 card rounded-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-2xl">
              <Store size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text)]">Tell us about your business</h2>
              <p className="text-sm text-[var(--text-muted)]">Takes less than 2 minutes</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label label-required">Business Name</label>
              <input className="w-full input" placeholder="e.g. Sharma Electronics" value={form.business_name} onChange={e => set('business_name', e.target.value)} required />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="w-full input" value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">Select category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.slug ?? c.name.toLowerCase()}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Map picker */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label label-required">Business Location</label>
                <button
                  type="button"
                  onClick={useMyLocation}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Navigation size={12} /> Use my location
                </button>
              </div>
              <p className="mb-2 text-xs text-[var(--text-muted)]">Click on the map to pin your shop location. Drag the marker to adjust.</p>
              <div
                ref={mapRef}
                style={{ height: 220, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}
              />
              {form.lat && form.lng && (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  📍 {parseFloat(form.lat).toFixed(5)}, {parseFloat(form.lng).toFixed(5)}
                </p>
              )}
            </div>

            <div>
              <label className="label">Address</label>
              <input
                className="w-full input"
                placeholder="Auto-filled from map, or type manually"
                value={form.address}
                onChange={e => set('address', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">City</label>
                <input
                  className="w-full input"
                  placeholder="Auto-filled from map"
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="w-full input" placeholder="9876543210" type="tel" maxLength={10} value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, ''))} />
              </div>
            </div>
            <div>
              <label className="label">Website (optional)</label>
              <input className="w-full input" placeholder="https://yourshop.com" type="url" value={form.website} onChange={e => set('website', e.target.value)} />
            </div>
            <div>
              <label className="label">About your business</label>
              <textarea className="w-full input" rows={3} placeholder="What do you sell? What makes you special?" value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            <div>
              <label className="label">Referral Code (optional)</label>
              <input
                className="w-full input uppercase"
                placeholder="e.g. ADS7K9XQP2"
                value={form.referral_code}
                onChange={e => set('referral_code', e.target.value.toUpperCase())}
              />
            </div>
            {!user && (
              <div className="p-3 text-sm border rounded-xl" style={{ background: 'var(--warning-light)', borderColor: 'rgba(245,158,11,0.25)', color: '#78350F' }}>
                You'll need to <button type="button" onClick={() => navigate('/login?redirect=/become-vendor')} className="font-semibold underline">sign in</button> before submitting.
              </div>
            )}
            <button type="submit" disabled={submitting} className="btn btn-primary btn-lg w-full">
              {submitting ? 'Submitting…' : 'Submit Application →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {/* Hero */}
      <div className="px-6 py-16 text-center text-white gradient-bg">
        <div className="mx-auto max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Store size={14} /> List your business on AdsLife
          </div>
          <h1 className="mb-4 text-4xl font-bold leading-tight sm:text-5xl text-white">
            Reach More Customers.<br />Grow Your Business.
          </h1>
          <p className="max-w-xl mx-auto mb-8 text-lg opacity-90">
            Join hundreds of local businesses already using AdsLife to post offers, attract foot traffic, and build loyal customers — all for free.
          </p>
          <button
            onClick={() => setStep('form')}
            className="inline-flex items-center gap-2 px-8 py-4 text-lg font-bold transition-shadow bg-white text-primary rounded-2xl hover:shadow-xl"
          >
            Get Listed Free <ChevronRight size={20} />
          </button>
          <p className="mt-3 text-xs opacity-70">No credit card required · Free for 30 days</p>
        </div>
      </div>

      {/* Benefits */}
      <div className="px-6 py-16 mx-auto max-w-5xl">
        <h2 className="mb-10 text-3xl font-bold text-center text-[var(--text)]">Everything you need to grow locally</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <div key={i} className="p-5 transition-shadow bg-[var(--surface-2)] rounded-2xl hover:shadow-md">
              <div className="flex items-center justify-center w-10 h-10 mb-3 bg-primary/10 rounded-xl">{b.icon}</div>
              <h3 className="mb-1 font-bold text-[var(--text)]">{b.title}</h3>
              <p className="text-sm text-[var(--text-muted)]">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 py-16 text-center bg-[var(--surface-2)]">
        <h2 className="mb-4 text-3xl font-bold text-[var(--text)]">Ready to get started?</h2>
        <p className="mb-8 text-[var(--text-muted)]">It takes less than 2 minutes to list your business.</p>
        <button
          onClick={() => setStep('form')}
          className="inline-flex items-center gap-2 px-8 py-4 text-lg font-bold text-white transition-opacity bg-primary rounded-2xl hover:opacity-90"
        >
          Apply Now — It's Free <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
