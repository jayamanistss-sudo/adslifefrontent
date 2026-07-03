import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Phone } from 'lucide-react';
import { useUserStore } from '../store/useUserStore';
import { api, endpoints } from '../utils/api';
import toast from 'react-hot-toast';

const PHONE_PATTERN = /^[6-9]\d{9}$/;

/**
 * Blocking gate for accounts missing a phone number — mainly Google sign-ups,
 * whose OAuth profile never carries one. Shown on every authenticated page
 * until the user supplies a valid number.
 */
export default function RequirePhoneModal() {
  const { user, updateUser } = useUserStore();
  const [phone, setPhone]     = useState('');
  const [error, setError]     = useState('');
  const [saving, setSaving]   = useState(false);

  if (!user || user.phone) return null;

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!PHONE_PATTERN.test(phone)) {
      setError('Enter a valid 10-digit mobile number starting with 6–9');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put(endpoints.authProfile, { phone });
      if (res.data.success) {
        updateUser({ phone: res.data.data.phone });
        toast.success('Phone number saved!');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Could not save phone number';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div className="modal-content max-w-sm rounded-3xl shadow-2xl">
        <div className="p-6 bg-[var(--surface)]">
          <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mb-4">
            <Phone size={20} className="text-[var(--primary)]" />
          </div>
          <h2 className="font-heading font-bold text-lg text-[var(--text)] mb-1.5">Add your phone number</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-5">
            We need a mobile number on file to keep your account secure and let vendors reach you about redemptions.
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              <input
                autoFocus
                value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                placeholder="10-digit mobile number"
                inputMode="numeric"
                className="input w-full pl-9"
              />
            </div>
            {error && <p className="text-xs font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
            <button type="submit" disabled={saving || phone.length !== 10} className="btn btn-primary w-full py-2.5 cursor-pointer disabled:opacity-50">
              {saving ? 'Saving…' : 'Save & Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}
