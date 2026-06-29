import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone, MapPin, Gift, CheckCircle2, XCircle, LocateFixed } from 'lucide-react';
import { api, endpoints } from '../utils/api';
import GoogleAuthButton from '../components/GoogleAuthButton';
import { useGeolocation } from '../hooks/useGeolocation';
import toast from 'react-hot-toast';

/* ─── Validation ─────────────────────────────────────── */
const validators = {
  name:     (v: string) => /^[A-Za-z\s]{2,}$/.test(v.trim()),
  email:    (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  phone:    (v: string) => /^\d{10}$/.test(v),
  city:     (v: string) => /^[A-Za-z\s]{2,}$/.test(v.trim()),
  password: (v: string) => /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{6,}$/.test(v),
};
const messages = {
  name:     'Only letters and spaces (min 2 chars)',
  email:    'Enter a valid email address',
  phone:    'Must be exactly 10 digits',
  city:     'Only letters and spaces',
  password: 'Min 6 chars · 1 uppercase · 1 number · 1 special',
};
type Field = 'name' | 'email' | 'phone' | 'city' | 'password';

/* ─── Left panel (shared with Login) ─────────────────── */
const AD_FLOATERS = [
  { emoji: '🏷️', label: '50% OFF',    sub: 'Flash Sale',    x: 8,  y: 15, delay: 0,   dur: 9  },
  { emoji: '🪙',  label: '+20 Coins',  sub: 'Reward earned', x: 68, y: 10, delay: 1.5, dur: 11 },
  { emoji: '📍',  label: 'Near You',   sub: 'Chennai deals', x: 75, y: 55, delay: 3,   dur: 8  },
  { emoji: '🔥',  label: 'Trending',   sub: '1.2k views',    x: 12, y: 85, delay: 2,   dur: 13 },
  { emoji: '🎯',  label: 'For You',    sub: 'Personalised',  x: 70, y: 80, delay: 0.5, dur: 10 },
  { emoji: '💸',  label: '₹200 off',   sub: 'Min ₹999',      x: 43, y: 90, delay: 4,   dur: 12 },
  { emoji: '⚡',  label: '2 hrs left', sub: 'Limited deal',  x: 58, y: 32, delay: 2.5, dur: 7  },
  { emoji: '🛍️', label: 'New Offer',  sub: 'Just added',    x: 38, y: 5,  delay: 1,   dur: 14 },
];

function LeftPanel() {
  return (
    <div className="hidden lg:flex relative flex-col justify-between overflow-hidden h-full"
      style={{ background: 'linear-gradient(145deg,#FF7420 0%,#C84E00 50%,#8B3200 100%)' }}>
      <style>{`
        @keyframes adFloat{0%{transform:translateY(0) rotate(0deg);opacity:.92}33%{transform:translateY(-14px) rotate(1deg);opacity:1}66%{transform:translateY(-6px) rotate(-1deg);opacity:.95}100%{transform:translateY(0) rotate(0deg);opacity:.92}}
        @keyframes orbPulse{0%,100%{transform:scale(1);opacity:var(--op)}50%{transform:scale(1.08);opacity:calc(var(--op)*1.4)}}
        @keyframes shimmerL{0%{background-position:-200% center}100%{background-position:200% center}}
        .ad-floater{animation:adFloat var(--dur) ease-in-out infinite;animation-delay:var(--delay)}
        .lp-orb{animation:orbPulse var(--dur) ease-in-out infinite;animation-delay:var(--delay)}
        .shimmer-bar{background:linear-gradient(90deg,rgba(255,255,255,.05) 0%,rgba(255,255,255,.18) 50%,rgba(255,255,255,.05) 100%);background-size:200% auto;animation:shimmerL 3s linear infinite}
      `}</style>

      {[{w:340,h:340,x:-8,y:-10,op:.18,d:0,dur:20},{w:260,h:260,x:55,y:60,op:.14,d:4,dur:16},{w:180,h:180,x:70,y:-5,op:.12,d:8,dur:22},{w:140,h:140,x:20,y:75,op:.10,d:2,dur:18}].map((o,i)=>(
        <div key={i} className="lp-orb absolute rounded-full" style={{width:o.w,height:o.h,left:`${o.x}%`,top:`${o.y}%`,background:'radial-gradient(circle,rgba(255,255,255,.22) 0%,rgba(255,255,255,0) 70%)',['--op' as string]:o.op,['--dur' as string]:`${o.dur}s`,['--delay' as string]:`${o.d}s`}}/>
      ))}
      <div className="shimmer-bar absolute inset-0 pointer-events-none" style={{transform:'rotate(-12deg) scaleX(2)',transformOrigin:'center'}}/>

      {AD_FLOATERS.map((f,i)=>(
        <div key={i} className="ad-floater absolute z-10" style={{left:`${f.x}%`,top:`${f.y}%`,['--dur' as string]:`${f.dur}s`,['--delay' as string]:`${f.delay}s`}}>
          <div style={{background:'rgba(255,255,255,.15)',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,.28)',borderRadius:14,padding:'8px 13px',display:'flex',alignItems:'center',gap:8,boxShadow:'0 4px 20px rgba(0,0,0,.15)',minWidth:110}}>
            <span style={{fontSize:18,lineHeight:1}}>{f.emoji}</span>
            <div>
              <div style={{color:'#fff',fontSize:12,fontWeight:700,lineHeight:1.2}}>{f.label}</div>
              <div style={{color:'rgba(255,255,255,.65)',fontSize:10,lineHeight:1.3}}>{f.sub}</div>
            </div>
          </div>
        </div>
      ))}

      <div className="relative z-20 flex flex-col justify-between h-full p-8 xl:p-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white font-bold text-lg border border-white/30">A</div>
          <span className="text-white font-bold text-xl tracking-tight">AdsLife</span>
        </div>
        <div className="space-y-5 my-auto py-8">
          <span className="inline-block bg-white/15 border border-white/30 text-white text-[10px] font-bold px-3 py-1.5 rounded-full tracking-widest uppercase">
            Local Deals · Rewards · Discovery
          </span>
          <h2 className="text-white font-black text-4xl xl:text-5xl leading-[1.1]">Discover deals<br/>in your city.</h2>
          <p className="text-white/75 text-sm leading-relaxed max-w-xs">Join thousands earning coins while exploring the best local offers around them.</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {['🎯 Personalised','🪙 Earn Coins','📍 Local First','🔥 Streaks'].map(f=>(
              <span key={f} className="bg-white/12 border border-white/22 text-white/90 text-xs px-3 py-1.5 rounded-full">{f}</span>
            ))}
          </div>
          <div className="flex gap-7 pt-2">
            {[['50K+','Users'],['200+','Cities'],['1M+','Coins Earned']].map(([n,l])=>(
              <div key={l}><p className="text-white font-black text-2xl">{n}</p><p className="text-white/60 text-xs mt-0.5">{l}</p></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Password strength ───────────────────────────────── */
function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const checks = [
    { label: 'Uppercase', ok: /[A-Z]/.test(value) },
    { label: 'Number',    ok: /[0-9]/.test(value) },
    { label: 'Special',   ok: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value) },
    { label: '6+ chars',  ok: value.length >= 6 },
  ];
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {checks.map(({ label, ok }) => (
        <span key={label} className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-all ${
          ok
            ? 'bg-[var(--accent-light)] border-[rgba(16,185,129,0.2)] text-emerald-700 dark:text-emerald-400'
            : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-muted)]'
        }`}>
          {ok ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
          {label}
        </span>
      ))}
    </div>
  );
}

/* ─── Input field ─────────────────────────────────────── */
function InputField({ id, label, icon: Icon, error, touched, children }: {
  id: string; label: string; icon: React.ElementType;
  error: boolean; touched: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[10px] font-bold text-[var(--text-secondary)] mb-1.5 tracking-widest uppercase">
        {label}
      </label>
      <div className="relative rounded-xl border transition-all duration-200"
        style={{
          background: 'var(--surface)',
          borderColor: touched ? (error ? 'var(--danger)' : 'var(--accent)') : 'var(--border)',
          boxShadow: touched ? (error ? '0 0 0 3px rgba(239,68,68,0.10)' : '0 0 0 3px rgba(16,185,129,0.10)') : undefined,
        }}
        onFocus={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            (e.currentTarget as HTMLElement).style.borderColor = touched
              ? (error ? 'var(--danger)' : 'var(--accent)')
              : 'var(--primary)';
            if (!touched) (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px var(--primary-muted)';
          }
        }}
      >
        <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
        {children}
        {touched && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {error
              ? <XCircle size={13} className="text-red-400" />
              : <CheckCircle2 size={13} className="text-emerald-500" />
            }
          </span>
        )}
      </div>
      {touched && error && (
        <p className="mt-1 text-[11px] text-[var(--danger)] flex items-center gap-1">
          <XCircle size={10} /> {messages[id as Field]}
        </p>
      )}
    </div>
  );
}

/* ─── Main ────────────────────────────────────────────── */
export default function Register() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode        = searchParams.get('ref') ?? '';

  const [form, setForm]       = useState({ name: '', email: '', password: '', phone: '', city: '' });
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [detectingCity, setDetectingCity] = useState(false);
  const cityEditedByUser = useRef(false);

  const { lat, lng, loading: geoLoading, error: geoError } = useGeolocation();

  useEffect(() => {
    if (geoLoading || geoError || cityEditedByUser.current || form.city) return;
    setDetectingCity(true);
    api.get(endpoints.targetingResolve(String(lat), String(lng)))
      .then((r) => {
        const city = r.data?.data?.city;
        if (city && !cityEditedByUser.current) setForm((f) => ({ ...f, city }));
      })
      .catch(() => {})
      .finally(() => setDetectingCity(false));
  }, [geoLoading, geoError, lat, lng]);

  const field = (key: Field, value: string) => {
    if (key === 'city') cityEditedByUser.current = true;
    if (key === 'phone') value = value.replace(/\D/g, '').slice(0, 10);
    if (key === 'name' || key === 'city') value = value.replace(/[^A-Za-z\s]/g, '');
    setForm(f => ({ ...f, [key]: value }));
  };
  const blur    = (key: Field) => setTouched(t => ({ ...t, [key]: true }));
  const isErr   = (key: Field) => !!touched[key] && !validators[key](form[key]);
  const allValid = (['name', 'email', 'password', 'phone', 'city'] as Field[]).every(k => validators[k](form[k]));

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, phone: true, city: true });
    if (!allValid) return;
    setLoading(true);
    try {
      const res = await api.post(endpoints.register, { ...form, ...(refCode ? { ref: refCode } : {}) });
      if (res.data.success) {
        toast.success(refCode
          ? 'Account created! Sign in to claim your 20 bonus coins 🎉'
          : 'Account created! Please sign in.');
        navigate('/login');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? 'Registration failed');
    } finally { setLoading(false); }
  };

  const inp = 'w-full bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none pl-9 pr-8 py-2.5';

  return (
    <div className="h-screen w-screen overflow-hidden grid lg:grid-cols-[0.82fr_1.18fr]">
      <style>{`
        @keyframes rSlide{from{opacity:0;transform:translateX(28px)}to{opacity:1;transform:translateX(0)}}
        @keyframes rUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes accentShimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        .r-enter{animation:rSlide .6s cubic-bezier(.22,1,.36,1) both}
        .r-f1{animation:rUp .5s cubic-bezier(.22,1,.36,1) .06s both}
        .r-f2{animation:rUp .5s cubic-bezier(.22,1,.36,1) .12s both}
        .r-f3{animation:rUp .5s cubic-bezier(.22,1,.36,1) .18s both}
        .r-f4{animation:rUp .5s cubic-bezier(.22,1,.36,1) .24s both}
        .r-f5{animation:rUp .5s cubic-bezier(.22,1,.36,1) .30s both}
        .r-f6{animation:rUp .5s cubic-bezier(.22,1,.36,1) .36s both}
        .r-f7{animation:rUp .5s cubic-bezier(.22,1,.36,1) .42s both}
        .accent-bar{background:linear-gradient(90deg,#FF7420,#FFB347,#FF7420);background-size:200% auto;animation:accentShimmer 3s linear infinite}
        .btn-reg{transition:transform .18s ease,box-shadow .18s ease}
        .btn-reg:not(:disabled):hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(255,116,32,.28)}
        .btn-reg:not(:disabled):active{transform:translateY(0)}
      `}</style>

      <LeftPanel />

      {/* Right panel */}
      <div className="relative flex flex-col justify-center overflow-hidden h-full px-8 py-5 xl:px-14 bg-[var(--surface)]"
        style={{ backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '22px 22px' }}>

        {/* Ambient orbs */}
        <div className="absolute pointer-events-none rounded-full"
          style={{ width: 260, height: 260, top: -60, right: -55, background: 'radial-gradient(circle,rgba(255,116,32,.07) 0%,transparent 65%)', animation: 'orbFloat 10s ease-in-out infinite' }} />
        <div className="absolute pointer-events-none rounded-full"
          style={{ width: 180, height: 180, bottom: -45, left: -35, background: 'radial-gradient(circle,rgba(255,150,50,.05) 0%,transparent 65%)', animation: 'orbFloat 13s ease-in-out infinite reverse' }} />

        {/* Top accent shimmer */}
        <div className="accent-bar absolute top-0 left-0 right-0 h-[3px] pointer-events-none" />

        <div className="r-enter relative z-10 w-full max-w-[420px] mx-auto">

          {/* Brand */}
          <div className="r-f1 flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 bg-gradient-to-br from-[#FF7420] to-[#C84E00] rounded-[11px] flex items-center justify-center text-white font-bold text-sm shadow-md">A</div>
            <span className="font-bold text-[var(--text)] text-[15px] tracking-tight">AdsLife</span>
          </div>

          {/* Heading */}
          <div className="r-f1 mb-4">
            <p className="text-[11px] font-semibold text-[var(--primary)] uppercase tracking-widest mb-0.5">Start for free</p>
            <h1 className="font-heading font-black text-[26px] text-[var(--text)] leading-tight">Create account</h1>
            <p className="text-[var(--text-muted)] text-sm mt-0.5">Join AdsLife and start discovering local deals</p>
          </div>

          {/* Referral bonus */}
          {refCode && (
            <div className="r-f2 flex items-start gap-2.5 bg-[var(--warning-light)] border border-[rgba(245,158,11,0.2)] rounded-xl px-3 py-2.5 mb-3">
              <Gift size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Invited with <strong>{refCode}</strong> — get <strong>20 bonus coins</strong> on signup!
              </p>
            </div>
          )}

          {/* Google */}
          <div className="r-f2">
            <GoogleAuthButton label="Sign up with Google" />
          </div>

          {/* Divider */}
          <div className="r-f3 flex items-center gap-3 my-3.5">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-[10px] text-[var(--text-muted)] font-semibold tracking-widest uppercase">or</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-3">

            <div className="r-f3">
              <InputField id="name" label="Full name" icon={User} error={isErr('name')} touched={!!touched.name}>
                <input id="reg-name" type="text" required autoComplete="name" className={inp}
                  placeholder="Enter your full name"
                  value={form.name} onChange={e => field('name', e.target.value)} onBlur={() => blur('name')} />
              </InputField>
            </div>

            <div className="r-f4">
              <InputField id="email" label="Email" icon={Mail} error={isErr('email')} touched={!!touched.email}>
                <input id="reg-email" type="email" required autoComplete="email" className={inp}
                  placeholder="you@example.com"
                  value={form.email} onChange={e => field('email', e.target.value)} onBlur={() => blur('email')} />
              </InputField>
            </div>

            <div className="r-f5 grid grid-cols-2 gap-3">
              <InputField id="phone" label="Phone" icon={Phone} error={isErr('phone')} touched={!!touched.phone}>
                <input id="reg-phone" type="tel" inputMode="numeric" maxLength={10} required className={inp}
                  placeholder="10-digit number"
                  value={form.phone} onChange={e => field('phone', e.target.value)} onBlur={() => blur('phone')} />
              </InputField>
              <InputField id="city" label="City" icon={MapPin} error={isErr('city')} touched={!!touched.city}>
                <input id="reg-city" type="text" required autoComplete="address-level2" className={inp}
                  style={{ paddingRight: 28 }}
                  placeholder={detectingCity ? 'Detecting…' : 'Your city'}
                  value={form.city} onChange={e => field('city', e.target.value)} onBlur={() => blur('city')} />
                {detectingCity && (
                  <LocateFixed size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] animate-pulse" />
                )}
              </InputField>
            </div>

            <div className="r-f6">
              <InputField id="password" label="Password" icon={Lock} error={isErr('password')} touched={!!touched.password}>
                <input id="reg-password" type={showPw ? 'text' : 'password'} required autoComplete="new-password"
                  className={inp} style={{ paddingRight: 58 }} placeholder="Create a password"
                  value={form.password} onChange={e => field('password', e.target.value)} onBlur={() => blur('password')} />
                <button type="button" onClick={() => setShowPw(!showPw)} tabIndex={-1}
                  className="absolute right-8 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                  {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </InputField>
              <PasswordStrength value={form.password} />
            </div>

            <div className="r-f7">
              <button type="submit" disabled={loading}
                className="btn-reg btn btn-primary btn-lg w-full"
                style={{ marginTop: 4, opacity: (!allValid && Object.keys(touched).length > 0) ? 0.75 : 1 }}>
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account…</>
                  : <>Create Account <span className="text-white/70 text-base ml-1">→</span></>
                }
              </button>
            </div>
          </form>

          <p className="r-f7 text-center text-sm text-[var(--text-muted)] mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-[var(--primary)] font-semibold hover:underline underline-offset-2">Sign in</Link>
          </p>
          <p className="text-center text-[10px] text-[var(--text-muted)] mt-1.5">
            By signing up you agree to our{' '}
            <a href="/terms" className="underline underline-offset-2 hover:text-[var(--text)] transition-colors">Terms</a>{' & '}
            <a href="/privacy" className="underline underline-offset-2 hover:text-[var(--text)] transition-colors">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
