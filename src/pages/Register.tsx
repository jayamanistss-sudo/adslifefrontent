import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone, MapPin, Gift } from 'lucide-react';
import { api, endpoints } from '../utils/api';
import { useUserStore } from '../store/useUserStore';
import GoogleAuthButton from '../components/GoogleAuthButton';
import toast from 'react-hot-toast';

export default function Register() {
  const { setUser }      = useUserStore();
  const navigate         = useNavigate();
  const [searchParams]   = useSearchParams();
  const refCode          = searchParams.get('ref') ?? '';
  const [form, setForm]  = useState({ name: '', email: '', password: '', phone: '', city: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const field = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post(endpoints.register, { ...form, ...(refCode ? { ref: refCode } : {}) });
      if (res.data.success) {
        const { user, token } = res.data.data;
        setUser({
          id: user.id, name: user.name, email: user.email,
          streakDays: 0, role: user.role,
        }, token);
        toast.success(refCode
          ? `Welcome to AdsLife! You've earned 20 bonus coins 🎉`
          : `Welcome to AdsLife, ${user.name}!`
        );
        navigate('/feed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-[#FF7420] to-[#B04200] rounded-2xl flex items-center justify-center text-white font-heading font-bold text-xl mx-auto mb-3">A</div>
          <h1 className="font-heading font-bold text-2xl text-[var(--text)]">Create account</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Join AdsLife and start discovering local deals</p>
        </div>

        {refCode && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
            <Gift size={16} className="text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-700">
              You were invited! Sign up with code <strong>{refCode}</strong> and get <strong>20 bonus coins</strong> free.
            </p>
          </div>
        )}

        <GoogleAuthButton label="Sign up with Google" />

        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-xs text-[var(--text-muted)]">or</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Name */}
          <div>
            <label htmlFor="reg-name" className="block text-sm font-medium text-[var(--text)] mb-1.5">Full name</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input id="reg-name" type="text" required className="input pl-9" placeholder="Arjun Kumar"
                value={form.name} onChange={(e) => field('name', e.target.value)} />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-[var(--text)] mb-1.5">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input id="reg-email" type="email" required className="input pl-9" placeholder="you@example.com"
                value={form.email} onChange={(e) => field('email', e.target.value)} />
            </div>
          </div>

          {/* Phone + City row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="reg-phone" className="block text-sm font-medium text-[var(--text)] mb-1.5">Phone</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input id="reg-phone" type="tel" className="input pl-9" placeholder="9876543210"
                  value={form.phone} onChange={(e) => field('phone', e.target.value)} />
              </div>
            </div>
            <div>
              <label htmlFor="reg-city" className="block text-sm font-medium text-[var(--text)] mb-1.5">City</label>
              <div className="relative">
                <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input id="reg-city" type="text" className="input pl-9" placeholder="Chennai"
                  value={form.city} onChange={(e) => field('city', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-[var(--text)] mb-1.5">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input id="reg-password" type={showPw ? 'text' : 'password'} required minLength={6}
                className="input pl-9 pr-10" placeholder="Min 6 characters"
                value={form.password} onChange={(e) => field('password', e.target.value)} />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full mt-1">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account…
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
          {'Already have an account? '}
          <Link to="/login" className="text-[var(--primary)] font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
