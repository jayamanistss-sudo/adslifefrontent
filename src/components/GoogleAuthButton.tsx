import { useGoogleLogin } from '@react-oauth/google';
import { api, endpoints } from '../utils/api';
import { useUserStore } from '../store/useUserStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useState } from 'react';

interface Props {
  readonly label?: string;
}

export default function GoogleAuthButton({ label = 'Continue with Google' }: Props) {
  const { setUser } = useUserStore();
  const navigate    = useNavigate();
  const [loading, setLoading] = useState(false);

  const login = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const res = await api.post(endpoints.googleAuth, { access_token: tokenResponse.access_token });
        if (res.data.success) {
          const { user, token, is_new } = res.data.data;
          setUser({
            id: user.id, name: user.name, email: user.email,
            streakDays: Number.parseInt(user.streak_days) || 0,
            role: user.role, city: user.city,
            lat: user.lat ? Number.parseFloat(user.lat) : undefined,
            lng: user.lng ? Number.parseFloat(user.lng) : undefined,
          }, token);
          toast.success(is_new ? `Welcome to AdsLife, ${user.name}! 🎉` : `Welcome back, ${user.name}!`);
          navigate('/feed');
        }
      } catch (err: any) {
        toast.error(err.response?.data?.error ?? 'Google sign-in failed');
      } finally {
        setLoading(false);
      }
    },
    onError: () => toast.error('Google sign-in was cancelled'),
  });

  return (
    <button
      type="button"
      onClick={() => login()}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors font-medium text-sm text-[var(--text)] shadow-sm disabled:opacity-60"
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      ) : (
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
          <path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z"/>
          <path fill="#FBBC05" d="M24 46c5.6 0 10.6-1.9 14.5-5.1l-6.7-5.5C29.8 37 27 38 24 38c-5.7 0-10.6-3.1-11.8-7.5l-7 5.4C8.3 42 15.5 46 24 46z"/>
          <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.6 2.7-2.2 5-4.5 6.5l6.7 5.5C42.2 37.4 45 31.1 45 24c0-1.3-.2-2.7-.5-4z"/>
        </svg>
      )}
      {loading ? 'Signing in…' : label}
    </button>
  );
}
