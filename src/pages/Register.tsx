import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone, MapPin, Gift, CheckCircle2, XCircle } from 'lucide-react';
import { api, endpoints } from '../utils/api';
import { useUserStore } from '../store/useUserStore';
import GoogleAuthButton from '../components/GoogleAuthButton';
import toast from 'react-hot-toast';

/* ─── Validation ─────────────────────────────────────────── */
const validators = {
  name:     (v: string) => /^[A-Za-z\s]{2,}$/.test(v.trim()),
  email:    (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  phone:    (v: string) => v === '' || /^\d{10}$/.test(v),
  city:     (v: string) => v === '' || /^[A-Za-z\s]{2,}$/.test(v.trim()),
  password: (v: string) => /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{6,}$/.test(v),
};
const messages = {
  name:     'Only letters and spaces (min 2 chars)',
  email:    'Enter a valid email address',
  phone:    'Must be exactly 10 digits',
  city:     'Only letters and spaces',
  password: 'Min 6 chars • 1 uppercase • 1 number • 1 special char',
};
type Field = 'name' | 'email' | 'phone' | 'city' | 'password';

/* ─── Floating ad elements for left panel ───────────────── */
const AD_FLOATERS = [
  { emoji: '🏷️', label: '50% OFF',      sub: 'Flash Sale',     x: 8,  y: 15, delay: 0,   dur: 9  },
  { emoji: '🪙', label: '+20 Coins',    sub: 'Reward earned',  x: 68, y: 10,  delay: 1.5, dur: 11 },
  { emoji: '📍', label: 'Near You',     sub: 'Chennai deals',  x: 75, y: 55, delay: 3,   dur: 8  },
  { emoji: '🔥', label: 'Trending',     sub: '1.2k views',     x: 12,  y: 85, delay: 2,   dur: 13 },
  { emoji: '🎯', label: 'For You',      sub: 'Personalised',   x: 70, y: 80, delay: 0.5, dur: 10 },
  { emoji: '💸', label: '₹200 off',     sub: 'Min ₹999',       x: 43, y: 90, delay: 4,   dur: 12 },
  { emoji: '⚡', label: '2 hrs left',   sub: 'Limited deal',   x: 58, y: 32, delay: 2.5, dur: 7  },
  { emoji: '🛍️', label: 'New Offer',    sub: 'Just added',     x: 38, y: 5,  delay: 1,   dur: 14 },
];

const ORBS = [
  { w: 340, h: 340, x: -8,  y: -10, opacity: 0.18, delay: 0,  dur: 20 },
  { w: 260, h: 260, x: 55,  y: 60,  opacity: 0.14, delay: 4,  dur: 16 },
  { w: 180, h: 180, x: 70,  y: -5,  opacity: 0.12, delay: 8,  dur: 22 },
  { w: 140, h: 140, x: 20,  y: 75,  opacity: 0.10, delay: 2,  dur: 18 },
];

function LeftPanel() {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden h-full"
      style={{ background: 'linear-gradient(145deg,#FF7420 0%,#C84E00 50%,#8B3200 100%)' }}>

      <style>{`
        @keyframes adFloat {
          0%   { transform: translateY(0px) rotate(0deg);   opacity: 0.92; }
          33%  { transform: translateY(-14px) rotate(1deg); opacity: 1;    }
          66%  { transform: translateY(-6px) rotate(-1deg); opacity: 0.95; }
          100% { transform: translateY(0px) rotate(0deg);   opacity: 0.92; }
        }
        @keyframes orbPulse {
          0%, 100% { transform: scale(1);    opacity: var(--op); }
          50%       { transform: scale(1.08); opacity: calc(var(--op) * 1.4); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .ad-floater {
          animation: adFloat var(--dur) ease-in-out infinite;
          animation-delay: var(--delay);
        }
        .orb {
          animation: orbPulse var(--dur) ease-in-out infinite;
          animation-delay: var(--delay);
        }
        .shimmer-bar {
          background: linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.05) 100%);
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
        }
      `}</style>

      {/* Background orbs */}
      {ORBS.map((o, i) => (
        <div key={i} className="orb absolute rounded-full"
          style={{
            width: o.w, height: o.h,
            left: `${o.x}%`, top: `${o.y}%`,
            background: 'radial-gradient(circle, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 70%)',
            ['--op' as any]: o.opacity,
            ['--dur' as any]: `${o.dur}s`,
            ['--delay' as any]: `${o.delay}s`,
          }} />
      ))}

      {/* Diagonal shimmer stripe */}
      <div className="shimmer-bar absolute inset-0 pointer-events-none"
        style={{ transform: 'rotate(-12deg) scaleX(2)', transformOrigin: 'center' }} />

      {/* Floating ad cards */}
      {AD_FLOATERS.map((f, i) => (
        <div key={i} className="ad-floater absolute z-10"
          style={{
            left: `${f.x}%`, top: `${f.y}%`,
            ['--dur' as any]: `${f.dur}s`,
            ['--delay' as any]: `${f.delay}s`,
          }}>
          <div style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.28)',
            borderRadius: 14,
            padding: '8px 13px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            minWidth: 110,
          }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{f.emoji}</span>
            <div>
              <div style={{ color: '#fff', fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>{f.label}</div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, lineHeight: 1.3 }}>{f.sub}</div>
            </div>
          </div>
        </div>
      ))}

      {/* Content */}
      <div className="relative z-20 flex flex-col justify-between h-full p-8 xl:p-10">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white font-bold text-lg border border-white/30 shadow-lg">
            A
          </div>
          <span className="text-white font-bold text-xl tracking-tight drop-shadow">AdsLife</span>
        </div>

        {/* Hero */}
        <div className="space-y-5 my-auto py-8">
          <span className="inline-block bg-white/15 border border-white/30 text-white text-[10px] font-bold px-3 py-1.5 rounded-full tracking-widest uppercase shadow">
            Local Deals · Rewards · Discovery
          </span>
          <h2 className="text-white font-black text-4xl xl:text-5xl leading-[1.1] drop-shadow-md">
            Discover deals<br />in your city.
          </h2>
          <p className="text-white/75 text-sm leading-relaxed max-w-xs">
            Join thousands earning coins while exploring the best local offers around them.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {['🎯 Personalised', '🪙 Earn Coins', '📍 Local First', '🔥 Streaks'].map(f => (
              <span key={f} className="bg-white/12 border border-white/22 text-white/90 text-xs px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm">
                {f}
              </span>
            ))}
          </div>
          {/* Stats */}
          <div className="flex gap-7 pt-2">
            {[['50K+','Users'],['200+','Cities'],['1M+','Coins Earned']].map(([n,l]) => (
              <div key={l}>
                <p className="text-white font-black text-2xl drop-shadow">{n}</p>
                <p className="text-white/60 text-xs mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Password strength pills ────────────────────────────── */
function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const checks = [
    { label: 'Uppercase', ok: /[A-Z]/.test(value) },
    { label: 'Number',    ok: /[0-9]/.test(value) },
    { label: 'Special',   ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value) },
    { label: '6+ chars',  ok: value.length >= 6 },
  ];
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {checks.map(({ label, ok }) => (
        <span key={label} className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-all duration-200 ${
          ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-400'
        }`}>
          {ok ? <CheckCircle2 size={9} /> : <XCircle size={9} />} {label}
        </span>
      ))}
    </div>
  );
}

/* ─── Input field wrapper ────────────────────────────────── */
function InputField({ id, label, icon: Icon, error, touched, children }: {
  id: string; label: string; icon: any; error: boolean; touched: boolean; children: React.ReactNode;
}) {
  const ring = touched
    ? error
      ? 'border-red-300 focus-within:border-red-400 bg-red-50/40'
      : 'border-emerald-300 focus-within:border-emerald-400 bg-emerald-50/30'
    : 'border-[var(--border)] focus-within:border-[#FF7420]';

  return (
    <div>
      <label htmlFor={id} className="block text-[10px] font-bold text-[var(--text-secondary)] mb-1.5 tracking-widest uppercase">
        {label}
      </label>
      <div className={`relative rounded-xl border transition-all duration-200 bg-[var(--bg)] ${ring}`}>
        <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        {children}
        {touched && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {error ? <XCircle size={14} className="text-red-400" /> : <CheckCircle2 size={14} className="text-emerald-500" />}
          </span>
        )}
      </div>
      {touched && error && (
        <p className="mt-1 text-[10px] text-red-500">⚠ {messages[id as Field]}</p>
      )}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────── */
export default function Register() {
  const { setUser }    = useUserStore();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode        = searchParams.get('ref') ?? '';

  const [form, setForm]       = useState({ name: '', email: '', password: '', phone: '', city: '' });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);

  const field = (key: Field, value: string) => {
    if (key === 'phone') value = value.replace(/\D/g, '').slice(0, 10);
    if (key === 'name' || key === 'city') value = value.replace(/[^A-Za-z\s]/g, '');
    setForm(f => ({ ...f, [key]: value }));
  };
  const blur  = (key: Field) => setTouched(t => ({ ...t, [key]: true }));
  const isErr = (key: Field) => !!touched[key] && !validators[key](form[key]);
  const allValid =
    (['name','email','password'] as Field[]).every(k => validators[k](form[k])) &&
    validators.phone(form.phone) && validators.city(form.city);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setTouched({ name:true, email:true, password:true, phone:true, city:true });
    if (!allValid) return;
    setLoading(true);
    try {
      const res = await api.post(endpoints.register, { ...form, ...(refCode ? { ref: refCode } : {}) });
      if (res.data.success) {
        const { user, token } = res.data.data;
        setUser({ id: user.id, name: user.name, email: user.email, streakDays: 0, role: user.role }, token);
        toast.success(refCode ? `Welcome! You've earned 20 bonus coins 🎉` : `Welcome to AdsLife, ${user.name}!`);
        navigate('/feed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Registration failed');
    } finally { setLoading(false); }
  };

  const inp = 'w-full bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none pl-9 pr-9 py-2.5';

  return (
    /* Full-viewport wrapper — no centering, just fill */
    <div className="h-screen w-screen overflow-hidden grid lg:grid-cols-[1.1fr_0.9fr]">

      {/* LEFT — full height brand panel */}
      <LeftPanel />

      {/* RIGHT — scrollable form column */}
      <div className="flex flex-col justify-center overflow-y-auto bg-[var(--bg)] px-8 py-8 xl:px-12">
        <div className="w-full max-w-md mx-auto">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-9 h-9 bg-gradient-to-br from-[#FF7420] to-[#B04200] rounded-xl flex items-center justify-center text-white font-bold">A</div>
            <span className="font-bold text-[var(--text)] text-lg">AdsLife</span>
          </div>

          <h1 className="font-heading font-black text-[26px] text-[var(--text)] leading-tight">Create account</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1 mb-6">Join AdsLife and start discovering local deals</p>

          {refCode && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3 mb-5">
              <Gift size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                Invited with code <strong>{refCode}</strong> — get <strong>20 bonus coins</strong> on signup!
              </p>
            </div>
          )}

          <GoogleAuthButton label="Sign up with Google" />

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-[10px] text-[var(--text-muted)] font-semibold tracking-widest uppercase">or email</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            <InputField id="name" label="Full name" icon={User} error={isErr('name')} touched={!!touched.name}>
              <input id="reg-name" type="text" required className={inp} placeholder="Arjun Kumar"
                value={form.name} onChange={e => field('name', e.target.value)} onBlur={() => blur('name')} />
            </InputField>

            <InputField id="email" label="Email" icon={Mail} error={isErr('email')} touched={!!touched.email}>
              <input id="reg-email" type="email" required className={inp} placeholder="you@example.com"
                value={form.email} onChange={e => field('email', e.target.value)} onBlur={() => blur('email')} />
            </InputField>

            <div className="grid grid-cols-2 gap-3">
              <InputField id="phone" label="Phone" icon={Phone} error={isErr('phone')} touched={!!touched.phone}>
                <input id="reg-phone" type="tel" inputMode="numeric" maxLength={10}
                  className={inp} placeholder="9876543210"
                  value={form.phone} onChange={e => field('phone', e.target.value)} onBlur={() => blur('phone')} />
              </InputField>
              <InputField id="city" label="City" icon={MapPin} error={isErr('city')} touched={!!touched.city}>
                <input id="reg-city" type="text" className={inp} placeholder="Chennai"
                  value={form.city} onChange={e => field('city', e.target.value)} onBlur={() => blur('city')} />
              </InputField>
            </div>

            <div>
              <InputField id="password" label="Password" icon={Lock} error={isErr('password')} touched={!!touched.password}>
                <input id="reg-password" type={showPw ? 'text' : 'password'} required
                  className={`${inp} pr-16`} placeholder="Min 6 characters"
                  value={form.password} onChange={e => field('password', e.target.value)} onBlur={() => blur('password')} />
                <button type="button" onClick={() => setShowPw(!showPw)} tabIndex={-1}
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </InputField>
              <PasswordStrength value={form.password} />
            </div>

            <button type="submit" disabled={loading}
              className="btn btn-primary btn-lg w-full flex items-center justify-center gap-2 transition-all duration-200"
              style={{ opacity: (!allValid && Object.keys(touched).length > 0) ? 0.72 : 1 }}>
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account…</>
                : <>Create Account <span className="text-white/70 text-base leading-none">→</span></>
              }
            </button>
          </form>

          <p className="text-center text-sm text-[var(--text-secondary)] mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-[#FF7420] font-semibold hover:underline underline-offset-2">Sign in</Link>
          </p>
          <p className="text-center text-[10px] text-[var(--text-muted)] mt-2">
            By signing up you agree to our{' '}
            <a href="/terms" className="underline underline-offset-2">Terms</a>{' & '}
            <a href="/privacy" className="underline underline-offset-2">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}