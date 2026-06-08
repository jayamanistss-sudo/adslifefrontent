import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { api, endpoints } from '../utils/api';
import { useUserStore } from '../store/useUserStore';
import GoogleAuthButton from '../components/GoogleAuthButton';
import toast from 'react-hot-toast';

const SLIDES = [
  {
    url: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1920&q=90&auto=format&fit=crop',
    label: 'Fashion & Style',
  },
  {
    url: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1920&q=90&auto=format&fit=crop',
    label: 'Shopping Mall Deals',
  },
  {
    url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1920&q=90&auto=format&fit=crop',
    label: 'Exclusive Offers',
  },
  {
    url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1920&q=90&auto=format&fit=crop',
    label: 'Top Brands Near You',
  },
  {
    url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&q=90&auto=format&fit=crop',
    label: 'Flash Sales Today',
  },
];

const INTERVAL = 4000;

export default function Login() {
  const { setUser } = useUserStore();
  const navigate    = useNavigate();

  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [prev, setPrev]       = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);

  /* Auto-advance slides */
  useEffect(() => {
    const id = setInterval(() => {
      setPrev(current);
      setTransitioning(true);
      setCurrent(c => (c + 1) % SLIDES.length);
      setTimeout(() => { setPrev(null); setTransitioning(false); }, 900);
    }, INTERVAL);
    return () => clearInterval(id);
  }, [current]);

  const goTo = (i: number) => {
    if (i === current || transitioning) return;
    setPrev(current);
    setTransitioning(true);
    setCurrent(i);
    setTimeout(() => { setPrev(null); setTransitioning(false); }, 900);
  };

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post(endpoints.login, form);
      if (res.data.success) {
        const { user, token } = res.data.data;
        setUser({
          id: user.id, name: user.name, email: user.email,
          streakDays: Number.parseInt(user.streak_days) || 0,
          role: user.role, city: user.city,
          lat: parseFloat(user.lat) || undefined,
          lng: parseFloat(user.lng) || undefined,
        }, token);
        toast.success(`Welcome back, ${user.name}!`);
        navigate('/feed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes ken-burns {
          0%   { transform: scale(1.0) translate(0, 0);       }
          100% { transform: scale(1.12) translate(-2%, -1.5%); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes fade-out {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes card-in {
          from { opacity: 0; transform: translateY(28px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes label-slide {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes orb-drift {
          0%,100% { transform: translate(0, 0); }
          50%      { transform: translate(40px, -30px); }
        }
        @keyframes blink {
          0%,100% { opacity: 1; } 50% { opacity: 0.2; }
        }
        @keyframes progress {
          from { width: 0%; }
          to   { width: 100%; }
        }
        .ken-burns  { animation: ken-burns ${INTERVAL}ms linear forwards; }
        .fade-in    { animation: fade-in 0.9s ease forwards; }
        .fade-out   { animation: fade-out 0.9s ease forwards; }
        .card-in    { animation: card-in 0.65s cubic-bezier(0.22,1,0.36,1) both; }
        .label-in   { animation: label-slide 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .orb-drift  { animation: orb-drift 14s ease-in-out infinite alternate; }
        .live-blink { animation: blink 2s ease-in-out infinite; }
        .progress-bar { animation: progress ${INTERVAL}ms linear forwards; }

        input[type='email']:focus,
        input[type='password']:focus,
        input[type='text']:focus {
          border-color: rgba(255,98,0,0.75) !important;
          box-shadow: 0 0 0 3px rgba(255,98,0,0.18) !important;
          outline: none;
        }
      `}</style>

      <div className="relative min-h-screen flex items-center justify-center overflow-hidden">

        {/* ── Background slideshow ── */}
        <div className="absolute inset-0">

          {/* Previous slide fading out */}
          {prev !== null && (
            <img
              key={`prev-${prev}`}
              src={SLIDES[prev].url}
              alt=""
              aria-hidden
              className="fade-out absolute inset-0 w-full h-full object-cover"
              style={{ filter: 'brightness(0.30) saturate(1.25)' }}
            />
          )}

          {/* Current slide with Ken Burns */}
          <img
            key={`curr-${current}`}
            src={SLIDES[current].url}
            alt=""
            aria-hidden
            className="ken-burns fade-in absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'brightness(0.30) saturate(1.25)' }}
          />
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: [
            'radial-gradient(ellipse 65% 65% at 20% 55%, rgba(176,60,0,0.55), transparent)',
            'radial-gradient(ellipse 55% 65% at 80% 45%, rgba(200,75,0,0.38), transparent)',
            'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.55) 100%)',
          ].join(','),
        }} />

        {/* Ambient orbs */}
        <div className="orb-drift absolute w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(255,98,0,0.18),transparent 65%)', top: '-130px', left: '-120px' }} />
        <div className="orb-drift absolute w-[380px] h-[380px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(255,140,40,0.15),transparent 65%)', bottom: '-100px', right: '-90px', animationDelay: '7s', animationDirection: 'alternate-reverse' }} />

        {/* ── Slide label — bottom left ── */}
        <div className="absolute bottom-16 left-8 z-10 pointer-events-none">
          <p key={current} className="label-in text-xs font-semibold tracking-widest uppercase"
            style={{ color: 'rgba(255,255,255,0.38)' }}>
            {SLIDES[current].label}
          </p>
        </div>

        {/* ── Dot indicators + progress bar ── */}
        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="relative overflow-hidden rounded-full transition-all duration-300"
                style={{
                  width: i === current ? 28 : 8,
                  height: 8,
                  background: i === current ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.28)',
                }}
              >
                {i === current && (
                  <span
                    key={current}
                    className="progress-bar absolute left-0 top-0 bottom-0 rounded-full"
                    style={{ background: '#FF6200' }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Centred form card ── */}
        <div className="card-in relative z-10 w-full mx-4" style={{
          maxWidth: 400,
          background: 'rgba(8, 5, 2, 0.70)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          border: '1px solid rgba(255,255,255,0.11)',
          borderRadius: 22,
          boxShadow: '0 28px 70px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
          padding: '38px 34px 34px',
        }}>

          {/* Top highlight line */}
          <div className="absolute top-0 left-8 right-8 h-[1px] rounded-full"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)' }} />

          {/* Logo */}
          <div className="flex flex-col items-center mb-7">
            <div className="w-12 h-12 rounded-[14px] flex items-center justify-center font-bold text-xl text-white mb-3"
              style={{
                background: 'linear-gradient(135deg, #FF6200 0%, #C04800 100%)',
                boxShadow: '0 0 24px rgba(255,98,0,0.5), 0 4px 12px rgba(0,0,0,0.4)',
              }}>
              A
            </div>
            <span className="font-bold text-lg text-white tracking-wide">AdsLife</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="live-blink w-1.5 h-1.5 rounded-full" style={{ background: '#4ade80' }} />
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.38)' }}>Live deals near you</span>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-7">
            <h2 className="font-bold text-[1.5rem] text-white">Welcome back</h2>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.42)' }}>
              Sign in to continue to your account
            </p>
          </div>

          {/* Google */}
          <GoogleAuthButton label="Continue with Google" />

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.28)' }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                style={{ color: 'rgba(255,255,255,0.5)' }}>Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'rgba(255,255,255,0.32)' }} />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '10px 14px 10px 40px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.13)',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#fff', fontSize: 14,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                style={{ color: 'rgba(255,255,255,0.5)' }}>Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'rgba(255,255,255,0.32)' }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '10px 44px 10px 40px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.13)',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#fff', fontSize: 14,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(255,255,255,0.32)' }}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full" style={{ marginTop: 20 }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: 'rgba(255,255,255,0.36)' }}>
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold hover:underline" style={{ color: '#FF7420' }}>
              Create one free
            </Link>
          </p>
        </div>

        {/* Copyright */}
        <p className="absolute bottom-[6px] text-[10px] z-10" style={{ color: 'rgba(255,255,255,0.18)' }}>
          © 2025 AdsLife
        </p>
      </div>
    </>
  );
}
