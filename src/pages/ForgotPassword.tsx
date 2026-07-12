import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api, endpoints } from '../utils/api';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(endpoints.forgotPassword, { email });
      // Backend always returns success (never reveals whether the email
      // exists) — the same message covers both cases.
      setSent(true);
    } catch {
      toast.error('Something went wrong. Try again.');
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
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent-light)] flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={26} className="text-emerald-600" />
              </div>
              <h1 className="font-heading font-bold text-xl text-[var(--text)] mb-2">Check your email</h1>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                If an account exists for <span className="font-semibold text-[var(--text)]">{email}</span>, we've sent a link to reset your password. It expires in 1 hour.
              </p>
              <Link to="/login" className="btn btn-secondary w-full mt-6">
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-semibold text-[var(--primary)] uppercase tracking-widest mb-1">Reset password</p>
              <h1 className="font-heading font-black text-2xl text-[var(--text)] leading-tight mb-1">Forgot your password?</h1>
              <p className="text-[var(--text-muted)] text-sm mb-6">Enter your email and we'll send you a reset link.</p>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label className="label" htmlFor="fp-email">Email</label>
                  <div className="auth-input-wrap">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
                    <input id="fp-email" type="email" required autoComplete="email"
                      placeholder="you@example.com"
                      value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending…</>
                    : 'Send reset link'}
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
