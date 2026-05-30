import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Zap } from 'lucide-react';
import { api, endpoints } from '../utils/api';
import { useUserStore } from '../store/useUserStore';
import GoogleAuthButton from '../components/GoogleAuthButton';
import toast from 'react-hot-toast';

export default function Login() {
  const { setUser }  = useUserStore();
  const navigate     = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-[var(--bg)] flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 bg-gradient-to-br from-[#B04200] via-[#C85200] to-[#FF7420] p-10 text-white relative overflow-hidden">
        {/* Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-heading font-bold text-lg">A</div>
            <span className="font-heading font-bold text-xl">AdsLife</span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Zap size={20} /></div>
            <div>
              <div className="font-semibold">Flash Deals Near You</div>
              <div className="text-white/70 text-sm">Discover hyper-local offers</div>
            </div>
          </div>
          <div className="space-y-2 text-sm text-white/80">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-white/60" /> Earn rewards on every interaction
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-white/60" /> Exclusive deals and rewards
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-white/60" /> Compete on leaderboards
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-white/60" /> AI-powered personalized feed
            </div>
          </div>
        </div>

        <p className="text-white/50 text-xs">© 2025 AdsLife. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-[#FF7420] to-[#B04200] rounded-2xl flex items-center justify-center text-white font-heading font-bold text-xl mx-auto mb-3">A</div>
            <h1 className="font-heading font-bold text-2xl text-[var(--text)]">AdsLife</h1>
          </div>

          <div className="mb-8">
            <h2 className="font-heading font-bold text-2xl text-[var(--text)]">Welcome back</h2>
            <p className="text-[var(--text-secondary)] text-sm mt-1">Sign in to your account</p>
          </div>

          <GoogleAuthButton label="Continue with Google" />

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--text-muted)]">or</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="email" required
                  className="input pl-9"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type={showPw ? 'text' : 'password'} required
                  className="input pl-9 pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>


          <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
            {'No account? '}
            <Link to="/register" className="text-[var(--primary)] font-medium hover:underline">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
