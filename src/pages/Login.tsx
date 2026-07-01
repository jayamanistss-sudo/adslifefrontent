import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { api, endpoints } from '../utils/api';
import { useUserStore } from '../store/useUserStore';
import GoogleAuthButton from '../components/GoogleAuthButton';
import toast from 'react-hot-toast';

/* ─── Left panel ─────────────────────────────────────────── */
const AD_FLOATERS = [
  { emoji: '🏷️', label: '50% OFF',    sub: 'Flash Sale',    x: 8,  y: 15, delay: 0,   dur: 9  },
  { emoji: '🪙', label: '+20 Coins',  sub: 'Reward earned', x: 68, y: 10, delay: 1.5, dur: 11 },
  { emoji: '📍', label: 'Near You',   sub: 'Chennai deals', x: 75, y: 55, delay: 3,   dur: 8  },
  { emoji: '🔥', label: 'Trending',   sub: '1.2k views',    x: 12, y: 85, delay: 2,   dur: 13 },
  { emoji: '🎯', label: 'For You',    sub: 'Personalised',  x: 70, y: 80, delay: 0.5, dur: 10 },
  { emoji: '💸', label: '₹200 off',   sub: 'Min ₹999',      x: 43, y: 90, delay: 4,   dur: 12 },
  { emoji: '⚡', label: '2 hrs left', sub: 'Limited deal',  x: 58, y: 32, delay: 2.5, dur: 7  },
  { emoji: '🛍️', label: 'New Offer',  sub: 'Just added',    x: 38, y: 5,  delay: 1,   dur: 14 },
];
const ORBS = [
  { w: 340, h: 340, x: -8,  y: -10, opacity: 0.18, delay: 0,  dur: 20 },
  { w: 260, h: 260, x: 55,  y: 60,  opacity: 0.14, delay: 4,  dur: 16 },
  { w: 180, h: 180, x: 70,  y: -5,  opacity: 0.12, delay: 8,  dur: 22 },
  { w: 140, h: 140, x: 20,  y: 75,  opacity: 0.10, delay: 2,  dur: 18 },
];

function LeftPanel() {
  return (
    <div className="hidden lg:flex auth-panel-left relative flex-col justify-between overflow-hidden h-full">
      {ORBS.map((o,i)=>(
        <div key={i} className="auth-orb absolute rounded-full" style={{
          width:o.w,height:o.h,left:`${o.x}%`,top:`${o.y}%`,
          background:'radial-gradient(circle,rgba(255,255,255,.22) 0%,rgba(255,255,255,0) 70%)',
          ['--op' as string]:o.opacity,['--dur' as string]:`${o.dur}s`,['--delay' as string]:`${o.delay}s`,
        }}/>
      ))}

      {AD_FLOATERS.map((f,i)=>(
        <div key={i} className="auth-float absolute z-10"
          style={{left:`${f.x}%`,top:`${f.y}%`,['--dur' as string]:`${f.dur}s`,['--delay' as string]:`${f.delay}s`}}>
          <div className="auth-floater-card">
            <span className="text-lg leading-none">{f.emoji}</span>
            <div>
              <div className="text-white text-xs font-bold leading-tight">{f.label}</div>
              <div className="text-white/65 text-[10px] leading-snug">{f.sub}</div>
            </div>
          </div>
        </div>
      ))}

      <div className="relative z-20 flex flex-col justify-between h-full p-8 xl:p-10">
        <div className="flex items-center gap-3">
          <div className="brand-mark brand-mark-lg bg-white/20 backdrop-blur-sm border-white/30">A</div>
          <span className="text-white font-bold text-xl tracking-tight">AdsLife</span>
        </div>
        <div className="space-y-5 my-auto py-8">
          <span className="inline-block bg-white/15 border border-white/30 text-white text-[10px] font-bold px-3 py-1.5 rounded-full tracking-widest uppercase shadow">
            Local Deals · Rewards · Discovery
          </span>
          <h2 className="text-white font-black text-4xl xl:text-5xl leading-[1.1] drop-shadow-md">
            Discover deals<br/>in your city.
          </h2>
          <p className="text-white/75 text-sm leading-relaxed max-w-xs">
            Join thousands earning coins while exploring the best local offers around them.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {['🎯 Personalised','🪙 Earn Coins','📍 Local First','🔥 Streaks'].map(f=>(
              <span key={f} className="bg-white/12 border border-white/22 text-white/90 text-xs px-3 py-1.5 rounded-full backdrop-blur-sm shadow-sm">{f}</span>
            ))}
          </div>
          <div className="flex gap-7 pt-2">
            {[['50K+','Users'],['200+','Cities'],['1M+','Coins Earned']].map(([n,l])=>(
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

/* ─── Main ───────────────────────────────────────────────── */
export default function Login() {
  const { setUser }           = useUserStore();
  const navigate              = useNavigate();
  const [form,setForm]        = useState({email:'',password:''});
  const [showPw,setShowPw]    = useState(false);
  const [loading,setLoading]  = useState(false);

  const handleSubmit = async (e:{preventDefault:()=>void}) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post(endpoints.login, form);
      if (res.data.success) {
        const {user,token} = res.data.data;
        setUser({
          id:user.id,name:user.name,email:user.email,
          streakDays:Number.parseInt(user.streak_days)||0,
          role:user.role,city:user.city,
          lat:parseFloat(user.lat)||undefined,
          lng:parseFloat(user.lng)||undefined,
          avatarUrl: user.avatar_url ?? undefined,
        },token);
        toast.success(`Welcome back, ${user.name}!`);
        navigate('/feed');
      }
    } catch(err: unknown){
      const e = err as {response?:{data?:{error?:string}}};
      toast.error(e.response?.data?.error ?? 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="h-screen w-screen overflow-hidden grid lg:grid-cols-[0.82fr_1.18fr]">
      <LeftPanel/>

      <div className="auth-form-panel relative flex flex-col justify-center overflow-hidden h-full px-6 py-6 sm:px-8 xl:px-14">
        <div className="auth-accent-bar" />

        <div className="auth-enter relative z-10 w-full max-w-[400px] mx-auto">
          <div className="auth-stagger-1 flex items-center gap-2.5 mb-5">
            <div className="brand-mark brand-mark-md">A</div>
            <span className="font-bold text-[var(--text)] text-[15px] tracking-tight">AdsLife</span>
          </div>

          <div className="auth-stagger-1 mb-6">
            <p className="text-[11px] font-semibold text-[var(--primary)] uppercase tracking-widest mb-1">Sign in</p>
            <h1 className="font-heading font-black text-[28px] text-[var(--text)] leading-tight">Welcome back</h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">Sign in to continue to your account</p>
          </div>

          <div className="auth-stagger-2">
            <GoogleAuthButton label="Continue with Google"/>
          </div>

          <div className="auth-stagger-3 flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[var(--border)]"/>
            <span className="text-[10px] text-[var(--text-muted)] font-semibold tracking-widest uppercase">or</span>
            <div className="flex-1 h-px bg-[var(--border)]"/>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="auth-stagger-3">
              <label className="label">Email</label>
              <div className="auth-input-wrap">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"/>
                <input id="login-email" type="email" required autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
              </div>
            </div>

            <div className="auth-stagger-4">
              <label className="label">Password</label>
              <div className="auth-input-wrap">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"/>
                <input id="login-password" type={showPw?'text':'password'} required autoComplete="current-password"
                  className="!pr-10"
                  placeholder="Enter your password"
                  value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/>
                <button type="button" onClick={()=>setShowPw(!showPw)} tabIndex={-1}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                  {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                </button>
              </div>
            </div>

            <div className="auth-stagger-5">
              <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-shine w-full mt-1">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Signing in…</>
                  : <>Sign in <span className="text-white/70 text-base ml-1">→</span></>
                }
              </button>
            </div>
          </form>

          <p className="auth-stagger-6 text-center text-sm text-[var(--text-muted)] mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-[var(--primary)] font-semibold hover:underline underline-offset-2">Create one free</Link>
          </p>
          <p className="text-center text-[10px] text-[var(--text-muted)] mt-2">
            By signing in you agree to our{' '}
            <a href="/terms" className="underline underline-offset-2 hover:text-[var(--text)] transition-colors">Terms</a>{' & '}
            <a href="/privacy" className="underline underline-offset-2 hover:text-[var(--text)] transition-colors">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
