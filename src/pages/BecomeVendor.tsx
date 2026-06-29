import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Store, TrendingUp, Users, Zap, ChevronRight, MapPin, BarChart2 } from 'lucide-react';
import { api, endpoints } from '../utils/api';
import { useUserStore } from '../store/useUserStore';
import toast from 'react-hot-toast';

const BENEFITS = [
  { icon: <TrendingUp size={20} className="text-primary" />, title: 'Reach local customers', desc: 'Get discovered by thousands of users near your shop.' },
  { icon: <Zap size={20} className="text-primary" />, title: 'Post offers in 2 minutes', desc: 'Simple dashboard — no tech skills needed.' },
  { icon: <BarChart2 size={20} className="text-primary" />, title: 'Real analytics', desc: 'See views, clicks, and redemptions for every offer.' },
  { icon: <Users size={20} className="text-primary" />, title: 'Build followers', desc: 'Users subscribe to your shop and get notified of new deals.' },
  { icon: <MapPin size={20} className="text-primary" />, title: 'Map visibility', desc: 'Your shop appears on the map when users search nearby.' },
  { icon: <CheckCircle size={20} className="text-primary" />, title: 'Free to start', desc: 'No cost for the first 30 days. Upgrade when you\'re ready.' },
];

const CATEGORIES = [
  'Food & Dining', 'Fashion', 'Electronics', 'Beauty', 'Travel',
  'Entertainment', 'Grocery', 'Health', 'Sports', 'General',
];

export default function BecomeVendor() {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const [step, setStep] = useState<'landing' | 'form'>('landing');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    business_name: '', category: '', city: '', address: '',
    phone: '', website: '', description: '',
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/login?redirect=/become-vendor'); return; }
    if (!form.business_name.trim()) { toast.error('Business name is required'); return; }
    setSubmitting(true);
    try {
      const res = await api.post(endpoints.vendorApplySubmit, form);
      if (res.data.success) setDone(true);
      else toast.error(res.data.error ?? 'Submission failed');
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-[var(--surface-2)]">
      <div className="w-full max-w-md p-10 text-center card rounded-3xl">
        <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-[var(--text)]">Application Submitted!</h2>
        <p className="mb-6 text-[var(--text-muted)]">Our team will review your application and notify you within 24–48 hours.</p>
        <button onClick={() => navigate('/feed')} className="w-full py-3 font-semibold text-white bg-primary rounded-xl hover:opacity-90">
          Back to AdsLife
        </button>
      </div>
    </div>
  );

  if (step === 'form') return (
    <div className="min-h-screen px-4 py-10 bg-[var(--surface-2)]">
      <div className="max-w-lg mx-auto">
        <button onClick={() => setStep('landing')} className="flex items-center gap-1 mb-6 text-sm text-[var(--text-muted)] hover:text-primary">
          ← Back
        </button>
        <div className="p-8 card rounded-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-2xl">
              <Store size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text)]">Tell us about your business</h2>
              <p className="text-sm text-[var(--text-muted)]">Takes less than 2 minutes</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 text-sm font-medium text-[var(--text-secondary)]">Business Name *</label>
              <input className="w-full input" placeholder="e.g. Sharma Electronics" value={form.business_name} onChange={e => set('business_name', e.target.value)} required />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-[var(--text-secondary)]">Category</label>
              <select className="w-full input" value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c.toLowerCase().replace(/\s+&\s+/, '-').replace(/\s+/g, '-')}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-sm font-medium text-[var(--text-secondary)]">City</label>
                <input className="w-full input" placeholder="Chennai" value={form.city} onChange={e => set('city', e.target.value)} />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-[var(--text-secondary)]">Phone</label>
                <input className="w-full input" placeholder="9876543210" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-[var(--text-secondary)]">Address</label>
              <input className="w-full input" placeholder="Shop address" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-[var(--text-secondary)]">Website (optional)</label>
              <input className="w-full input" placeholder="https://yourshop.com" type="url" value={form.website} onChange={e => set('website', e.target.value)} />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-[var(--text-secondary)]">About your business</label>
              <textarea className="w-full input" rows={3} placeholder="What do you sell? What makes you special?" value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            {!user && (
              <div className="p-3 text-sm border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/30 rounded-xl text-amber-700 dark:text-amber-300">
                You'll need to <button type="button" onClick={() => navigate('/login?redirect=/become-vendor')} className="font-semibold underline">sign in</button> before submitting.
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-base hover:opacity-90 disabled:opacity-60 transition-opacity"
            >
              {submitting ? 'Submitting…' : 'Submit Application →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {/* Hero */}
      <div className="px-6 py-16 text-center text-white bg-gradient-to-br from-primary to-orange-400">
        <div className="mx-auto max-w-2xxl">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Store size={14} /> List your business on AdsLife
          </div>
          <h1 className="mb-4 text-4xl font-bold leading-tight sm:text-5xl">
            Reach More Customers.<br />Grow Your Business.
          </h1>
          <p className="max-w-xl mx-auto mb-8 text-lg opacity-90">
            Join hundreds of local businesses already using AdsLife to post offers, attract foot traffic, and build loyal customers — all for free.
          </p>
          <button
            onClick={() => setStep('form')}
            className="inline-flex items-center gap-2 px-8 py-4 text-lg font-bold transition-shadow bg-white text-primary rounded-2xl hover:shadow-xl"
          >
            Get Listed Free <ChevronRight size={20} />
          </button>
          <p className="mt-3 text-xs opacity-70">No credit card required · Free for 30 days</p>
        </div>
      </div>

      {/* Benefits */}
      <div className="max-w-4xl px-6 py-16 mx-auto">
        <h2 className="mb-10 text-3xl font-bold text-center text-[var(--text)]">Everything you need to grow locally</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <div key={i} className="p-5 transition-shadow bg-[var(--surface-2)] rounded-2xl hover:shadow-md">
              <div className="flex items-center justify-center w-10 h-10 mb-3 bg-primary/10 rounded-xl">{b.icon}</div>
              <h3 className="mb-1 font-bold text-[var(--text)]">{b.title}</h3>
              <p className="text-sm text-[var(--text-muted)]">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 py-16 text-center bg-[var(--surface-2)]">
        <h2 className="mb-4 text-3xl font-bold text-[var(--text)]">Ready to get started?</h2>
        <p className="mb-8 text-[var(--text-muted)]">It takes less than 2 minutes to list your business.</p>
        <button
          onClick={() => setStep('form')}
          className="inline-flex items-center gap-2 px-8 py-4 text-lg font-bold text-white transition-opacity bg-primary rounded-2xl hover:opacity-90"
        >
          Apply Now — It's Free <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
