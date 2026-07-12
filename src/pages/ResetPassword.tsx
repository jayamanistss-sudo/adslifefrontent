import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api, endpoints } from '../utils/api';
import toast from 'react-hot-toast';

// Matches the backend's actual policy (register.dto.ts / password-policy.ts)
// so this fails fast client-side instead of round-tripping to a generic
// server error.
const PASSWORD_COMPLEXITY = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{6,}$/;

export default function ResetPassword() {
  const [params]               = useSearchParams();
  const navigate                = useNavigate();
  const token                   = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!PASSWORD_COMPLEXITY.test(password)) {
      toast.error('Password must be 6+ characters with an uppercase letter, a number, and a special character.');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post(endpoints.resetPassword, { token, password });
      if (res.data.success) setDone(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error ?? 'Reset link is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 py-10 bg-[var(--bg)]">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="brand-mark brand-mark-md">A</div>
          <span className="font-bold text-[var(--text)] text-[15px] tracking-tight">AdsLife</span>
        </div>

        <div className="card p-7">
          {!token ? (
            <div className="text-center py-4">
              <p className="font-heading font-bold text-lg text-[var(--text)] mb-2">Invalid reset link</p>
              <p className="text-sm text-[var(--text-secondary)] mb-6">This link is missing its reset token. Request a new one.</p>
              <Link to="/forgot-password" className="btn btn-primary w-full">Request new link</Link>
            </div>
          ) : done ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent-light)] flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={26} className="text-emerald-600" />
              </div>
              <h1 className="font-heading font-bold text-xl text-[var(--text)] mb-2">Password reset</h1>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
                Your password has been changed. Sign in with your new password.
              </p>
              <button onClick={() => navigate('/login')} className="btn btn-primary w-full">Sign in</button>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-semibold text-[var(--primary)] uppercase tracking-widest mb-1">Reset password</p>
              <h1 className="font-heading font-black text-2xl text-[var(--text)] leading-tight mb-1">Choose a new password</h1>
              <p className="text-[var(--text-muted)] text-sm mb-6">Must be 6+ characters with an uppercase letter, a number, and a special character.</p>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label className="label" htmlFor="rp-password">New password</label>
                  <div className="auth-input-wrap">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                    <input id="rp-password" type={showPw ? 'text' : 'password'} required autoComplete="new-password"
                      className="!pr-10"
                      placeholder="Enter new password"
                      value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button type="button" onClick={() => setShowPw(!showPw)} tabIndex={-1}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="rp-confirm">Confirm password</label>
                  <div className="auth-input-wrap">
                    <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                    <input id="rp-confirm" type={showPw ? 'text' : 'password'} required autoComplete="new-password"
                      placeholder="Re-enter new password"
                      value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Resetting…</>
                    : 'Reset password'}
                </button>
              </form>

              <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mt-5">
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
