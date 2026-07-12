import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Camera, Phone, MapPin, Mail, Lock, Moon, Sun,
  ShieldCheck, KeyRound, CheckCircle2, XCircle, ArrowRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useUserStore } from '../store/useUserStore';
import { api, endpoints } from '../utils/api';
import toast from 'react-hot-toast';

const PHONE_PATTERN = /^[6-9]\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{6,}$/;

function SectionCard({ icon: Icon, title, subtitle, children }: {
  readonly icon: React.ElementType; readonly title: string; readonly subtitle?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
          <Icon size={16} className="text-[var(--primary)]" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-sm text-[var(--text)]">{title}</h3>
          {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Profile info section ───────────────────────────────────────────────────
function ProfileInfoSection() {
  const { user, updateUser } = useUserStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name:  user?.name  ?? '',
    phone: user?.phone ?? '',
    city:  user?.city  ?? '',
    avatar_url: user?.avatarUrl ?? '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [phoneErr, setPhoneErr]   = useState('');

  const upd = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const dirty = form.name !== (user?.name ?? '') || form.phone !== (user?.phone ?? '') ||
    form.city !== (user?.city ?? '') || form.avatar_url !== (user?.avatarUrl ?? '');

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
    if (!PHONE_PATTERN.test(form.phone)) {
      setPhoneErr('Enter a valid 10-digit mobile number starting with 6–9');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put(endpoints.authProfile, {
        name: form.name.trim() || undefined,
        phone: form.phone.trim(),
        city: form.city.trim() || undefined,
        avatar_url: form.avatar_url || undefined,
      });
      if (res.data.success) {
        updateUser({
          name: res.data.data.name,
          phone: res.data.data.phone,
          city: res.data.data.city,
          avatarUrl: res.data.data.avatar_url ?? undefined,
        });
        toast.success('Profile updated!');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Update failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard icon={User} title="Profile Info" subtitle="Your name, photo and contact details">
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-[var(--primary)] to-primary-400 flex items-center justify-center cursor-pointer group shadow-md"
          >
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-2xl font-extrabold">{form.name?.[0]?.toUpperCase()}</span>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Camera size={18} className="text-white" />}
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleAvatarUpload} />
          <p className="text-[10px] text-[var(--text-muted)] font-medium">Tap to change</p>
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Full Name</label>
            <input value={form.name} onChange={(e) => upd('name', e.target.value)} placeholder="Your name" className="input w-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
                Phone <span className="text-[var(--danger)]">*</span>
              </label>
              <div className="relative">
                <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                <input
                  value={form.phone}
                  onChange={(e) => { upd('phone', e.target.value.replace(/\D/g, '').slice(0, 10)); setPhoneErr(''); }}
                  placeholder="10-digit mobile number"
                  inputMode="numeric"
                  className="input w-full pl-9"
                />
              </div>
              {phoneErr && <p className="text-xs mt-1 font-medium" style={{ color: 'var(--danger)' }}>{phoneErr}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">City</label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                <input value={form.city} onChange={(e) => upd('city', e.target.value)} placeholder="Your city" className="input w-full pl-9" />
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || uploading || !form.name.trim() || !dirty}
            className="btn btn-primary py-2.5 px-5 cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Personal location section ──────────────────────────────────────────────
// Mobile already had this (a map pin feeding PUT /auth/location, used for
// "near me" ranking) — web had no equivalent, so a user who denies browser
// geolocation has no manual fallback here. Mirrors EditVendorProfile.tsx's
// Leaflet map pattern (same CDN load, same click/drag-to-pin behavior).
declare const L: any;

function LocationSection() {
  const { user, updateUser } = useUserStore();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [lat, setLat] = useState<number | null>(user?.lat ?? null);
  const [lng, setLng] = useState<number | null>(user?.lng ?? null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapObj.current) return;
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      const initLat = lat ?? 13.0827;
      const initLng = lng ?? 80.2707;
      const map = L.map(mapRef.current!).setView([initLat, initLng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      if (lat != null && lng != null) {
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
        markerRef.current.on('dragend', (e: any) => {
          const { lat: la, lng: lo } = e.target.getLatLng();
          setLat(la); setLng(lo);
        });
      }
      map.on('click', (e: any) => {
        const { lat: la, lng: lo } = e.latlng;
        setLat(la); setLng(lo);
        if (markerRef.current) markerRef.current.setLatLng([la, lo]);
        else markerRef.current = L.marker([la, lo], { draggable: true }).addTo(map);
      });
      mapObj.current = map;
    };
    document.head.appendChild(script);
    if (!document.querySelector('link[href*="leaflet"]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLocate = () => {
    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      const { latitude: la, longitude: lo } = coords;
      setLat(la); setLng(lo);
      if (mapObj.current) {
        mapObj.current.setView([la, lo], 15);
        if (markerRef.current) markerRef.current.setLatLng([la, lo]);
        else markerRef.current = L.marker([la, lo], { draggable: true }).addTo(mapObj.current);
      }
    }, () => toast.error('Could not get your location'));
  };

  const handleSave = async () => {
    if (lat == null || lng == null) { toast.error('Pin a location on the map first'); return; }
    setSaving(true);
    try {
      const res = await api.put(endpoints.authLocation, { lat, lng, source: 'manual' });
      if (res.data.success) {
        updateUser({ lat, lng });
        toast.success('Location saved!');
      }
    } catch {
      toast.error('Could not save location');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard icon={MapPin} title="Your Location" subtitle="Used to show nearby offers — drag the pin or tap the map">
      <div ref={mapRef} className="w-full rounded-xl overflow-hidden border border-[var(--border)] mb-4" style={{ height: '220px' }} />
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={handleLocate} className="btn btn-secondary py-2.5 px-4 text-sm">
          Use my current location
        </button>
        <button onClick={handleSave} disabled={saving || lat == null} className="btn btn-primary py-2.5 px-5 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Location'}
        </button>
      </div>
    </SectionCard>
  );
}

// ─── Email change section ───────────────────────────────────────────────────
function EmailSection() {
  const { user, updateUser } = useUserStore();
  const [editing, setEditing]   = useState(false);
  const [stage, setStage]       = useState<'enter' | 'verify'>('enter');
  const [newEmail, setNewEmail] = useState('');
  const [otp, setOtp]           = useState('');
  const [loading, setLoading]   = useState(false);

  const reset = () => { setEditing(false); setStage('enter'); setNewEmail(''); setOtp(''); };

  const sendCode = async () => {
    if (!EMAIL_PATTERN.test(newEmail)) { toast.error('Enter a valid email address'); return; }
    setLoading(true);
    try {
      const res = await api.post(endpoints.emailChangeRequest, { new_email: newEmail.trim() });
      if (res.data.success) {
        toast.success(res.data.data.message ?? 'Verification code sent');
        setStage('verify');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Could not send code';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async () => {
    if (otp.trim().length !== 6) { toast.error('Enter the 6-digit code'); return; }
    setLoading(true);
    try {
      const res = await api.post(endpoints.emailChangeConfirm, { otp: otp.trim() });
      if (res.data.success) {
        updateUser({ email: res.data.data.email });
        toast.success('Email address updated!');
        reset();
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Invalid or expired code';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard icon={Mail} title="Email Address" subtitle="Used to sign in and receive notifications">
      <div className="flex items-center justify-between gap-3 mb-1">
        <span className="text-sm font-semibold text-[var(--text)] truncate">{user?.email}</span>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn btn-secondary btn-sm py-1.5 px-3.5 cursor-pointer flex-shrink-0">
            Change
          </button>
        )}
      </div>

      {editing && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-[var(--border)] space-y-3">
          {stage === 'enter' ? (
            <>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">New email address</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@example.com"
                className="input w-full"
              />
              <div className="flex gap-2">
                <button onClick={reset} className="btn btn-secondary py-2 px-4 cursor-pointer">Cancel</button>
                <button onClick={sendCode} disabled={loading || !newEmail.trim()} className="btn btn-primary flex-1 py-2 cursor-pointer disabled:opacity-50">
                  {loading ? 'Sending…' : <>Send verification code <ArrowRight size={14} /></>}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-[var(--text-secondary)]">
                Enter the 6-digit code sent to <strong className="text-[var(--text)]">{newEmail}</strong>
              </p>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                className="input w-full text-center font-mono text-lg tracking-[0.5em]"
              />
              <div className="flex gap-2">
                <button onClick={reset} className="btn btn-secondary py-2 px-4 cursor-pointer">Cancel</button>
                <button onClick={confirmCode} disabled={loading || otp.length !== 6} className="btn btn-primary flex-1 py-2 cursor-pointer disabled:opacity-50">
                  {loading ? 'Verifying…' : 'Confirm Change'}
                </button>
              </div>
              <button onClick={sendCode} disabled={loading} className="text-xs text-[var(--primary)] font-semibold hover:underline cursor-pointer">
                Resend code
              </button>
            </>
          )}
        </motion.div>
      )}
    </SectionCard>
  );
}

// ─── Password section ───────────────────────────────────────────────────────
function PasswordSection() {
  const { logout } = useUserStore();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const upd = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const reset = () => { setEditing(false); setForm({ current: '', next: '', confirm: '' }); };

  const checks = [
    { label: 'Uppercase', ok: /[A-Z]/.test(form.next) },
    { label: 'Number',    ok: /[0-9]/.test(form.next) },
    { label: 'Special',   ok: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(form.next) },
    { label: '6+ chars',  ok: form.next.length >= 6 },
  ];

  const handleSubmit = async () => {
    if (!PASSWORD_PATTERN.test(form.next)) { toast.error('New password does not meet the requirements'); return; }
    if (form.next !== form.confirm) { toast.error('New passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await api.post(endpoints.authChangePassword, {
        current_password: form.current,
        new_password: form.next,
      });
      if (res.data.success) {
        // Backend invalidates the current JWT on password change — the local
        // session is now stale, so sign out immediately instead of leaving
        // the user on a page whose next API call would silently 401.
        // logout() alone only clears local state — it never revokes the
        // cookie server-side (see Profile.tsx's handleLogout, which this
        // was inconsistent with), leaving a dead-but-uncleared cookie and
        // skipping the /auth/logout audit-log entry.
        toast.success('Password changed! Please sign in again.');
        reset();
        try { await api.post(endpoints.logout); } catch { /* still clear local state below */ }
        logout();
        navigate('/login');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Could not change password';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionCard icon={KeyRound} title="Password" subtitle="Change the password used to sign in">
      {!editing ? (
        <button onClick={() => setEditing(true)} className="btn btn-secondary btn-sm py-1.5 px-3.5 cursor-pointer">
          Change Password
        </button>
      ) : (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Current Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              <input type={showPw ? 'text' : 'password'} value={form.current} onChange={(e) => upd('current', e.target.value)} className="input w-full pl-9" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">New Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              <input type={showPw ? 'text' : 'password'} value={form.next} onChange={(e) => upd('next', e.target.value)} className="input w-full pl-9" />
            </div>
            {form.next && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {checks.map(({ label, ok }) => (
                  <span key={label} className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                    ok ? 'bg-[var(--accent-light)] border-[rgba(16,185,129,0.2)] text-[var(--accent)]' : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-muted)]'
                  }`}>
                    {ok ? <CheckCircle2 size={9} /> : <XCircle size={9} />} {label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Confirm New Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              <input type={showPw ? 'text' : 'password'} value={form.confirm} onChange={(e) => upd('confirm', e.target.value)} className="input w-full pl-9" />
            </div>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer select-none">
            <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} className="cursor-pointer" /> Show passwords
          </label>
          <div className="flex gap-2 pt-1">
            <button onClick={reset} className="btn btn-secondary py-2 px-4 cursor-pointer">Cancel</button>
            <button onClick={handleSubmit} disabled={loading || !form.current || !form.next || !form.confirm} className="btn btn-primary flex-1 py-2 cursor-pointer disabled:opacity-50">
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </motion.div>
      )}
    </SectionCard>
  );
}

// ─── Notifications section ──────────────────────────────────────────────────
function NotificationsSection() {
  const { user, updateUser } = useUserStore();
  const [emailAlerts, setEmailAlerts] = useState(user?.emailAlerts !== false);
  const [pushEnabled, setPushEnabled] = useState(user?.pushEnabled !== false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPush, setSavingPush] = useState(false);

  const toggleEmail = async () => {
    const next = !emailAlerts;
    setEmailAlerts(next);
    setSavingEmail(true);
    try {
      const res = await api.put(endpoints.authProfile, { email_alerts: next });
      if (res.data.success) {
        updateUser({ emailAlerts: res.data.data.email_alerts });
      }
    } catch {
      setEmailAlerts(!next);
      toast.error('Could not update notification preference');
    } finally {
      setSavingEmail(false);
    }
  };

  // Mobile had a "Push Notifications" switch with no backend behind it at
  // all — toggling it did nothing. Web had no equivalent control whatsoever.
  // Both now hit the same push_enabled column the backend gates every FCM
  // send on.
  const togglePush = async () => {
    const next = !pushEnabled;
    setPushEnabled(next);
    setSavingPush(true);
    try {
      const res = await api.put(endpoints.authProfile, { push_enabled: next });
      if (res.data.success) {
        updateUser({ pushEnabled: res.data.data.push_enabled });
      }
    } catch {
      setPushEnabled(!next);
      toast.error('Could not update notification preference');
    } finally {
      setSavingPush(false);
    }
  };

  return (
    <SectionCard icon={Mail} title="Notifications" subtitle="Choose what you get notified about">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-[var(--text)] font-semibold">Push Notifications</div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Offers, badges and alerts on this device</p>
        </div>
        <button
          onClick={togglePush}
          disabled={savingPush}
          role="switch"
          aria-checked={pushEnabled}
          className="relative w-11 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 disabled:opacity-60"
          style={{ background: pushEnabled ? 'var(--primary)' : 'var(--border-strong)' }}
        >
          <motion.span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
            animate={{ left: pushEnabled ? '1.375rem' : '0.125rem' }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          />
        </button>
      </div>
      <div className="divider my-3" />
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-[var(--text)] font-semibold">Email Alerts</div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Get an email when a shop you follow posts a new offer</p>
        </div>
        <button
          onClick={toggleEmail}
          disabled={savingEmail}
          role="switch"
          aria-checked={emailAlerts}
          className="relative w-11 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 disabled:opacity-60"
          style={{ background: emailAlerts ? 'var(--primary)' : 'var(--border-strong)' }}
        >
          <motion.span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
            animate={{ left: emailAlerts ? '1.375rem' : '0.125rem' }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          />
        </button>
      </div>
    </SectionCard>
  );
}

// ─── Preferences section ────────────────────────────────────────────────────
function PreferencesSection() {
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('adslife-theme', next ? 'dark' : 'light');
  };

  return (
    <SectionCard icon={ShieldCheck} title="Preferences" subtitle="Display and appearance settings">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-sm text-[var(--text)] font-semibold">
          {darkMode ? <Moon size={16} /> : <Sun size={16} />}
          {darkMode ? 'Dark Mode' : 'Light Mode'}
        </div>
        <button
          onClick={toggleDark}
          role="switch"
          aria-checked={darkMode}
          className="relative w-11 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0"
          style={{ background: darkMode ? 'var(--primary)' : 'var(--border-strong)' }}
        >
          <motion.span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
            animate={{ left: darkMode ? '1.375rem' : '0.125rem' }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          />
        </button>
      </div>
    </SectionCard>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Settings() {
  const { user } = useUserStore();

  useEffect(() => { globalThis.scrollTo(0, 0); }, []);

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto pb-20 sm:pb-6 px-4 space-y-5">
      <div>
        <h1 className="font-heading font-extrabold text-2xl text-[var(--text)]">Settings</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Manage your account, contact details and preferences</p>
      </div>

      <ProfileInfoSection />
      <LocationSection />
      <EmailSection />
      <PasswordSection />
      <NotificationsSection />
      <PreferencesSection />
    </div>
  );
}
