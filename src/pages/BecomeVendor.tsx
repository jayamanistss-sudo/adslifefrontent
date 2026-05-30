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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-md w-full">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
        <p className="text-gray-500 mb-6">Our team will review your application and notify you within 24–48 hours.</p>
        <button onClick={() => navigate('/feed')} className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:opacity-90">
          Back to AdsLife
        </button>
      </div>
    </div>
  );

  if (step === 'form') return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <button onClick={() => setStep('landing')} className="flex items-center gap-1 text-gray-500 text-sm mb-6 hover:text-primary">
          ← Back
        </button>
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Store size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Tell us about your business</h2>
              <p className="text-sm text-gray-400">Takes less than 2 minutes</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
              <input className="input-field w-full" placeholder="e.g. Sharma Electronics" value={form.business_name} onChange={e => set('business_name', e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select className="input-field w-full" value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c.toLowerCase().replace(/\s+&\s+/, '-').replace(/\s+/g, '-')}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input className="input-field w-full" placeholder="Chennai" value={form.city} onChange={e => set('city', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input className="input-field w-full" placeholder="9876543210" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input className="input-field w-full" placeholder="Shop address" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website (optional)</label>
              <input className="input-field w-full" placeholder="https://yourshop.com" type="url" value={form.website} onChange={e => set('website', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">About your business</label>
              <textarea className="input-field w-full" rows={3} placeholder="What do you sell? What makes you special?" value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
            {!user && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                You'll need to <button type="button" onClick={() => navigate('/login?redirect=/become-vendor')} className="underline font-semibold">sign in</button> before submitting.
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
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-orange-400 text-white py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Store size={14} /> List your business on AdsLife
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
            Reach More Customers.<br />Grow Your Business.
          </h1>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
            Join hundreds of local businesses already using AdsLife to post offers, attract foot traffic, and build loyal customers — all for free.
          </p>
          <button
            onClick={() => setStep('form')}
            className="inline-flex items-center gap-2 bg-white text-primary font-bold text-lg px-8 py-4 rounded-2xl hover:shadow-xl transition-shadow"
          >
            Get Listed Free <ChevronRight size={20} />
          </button>
          <p className="text-xs opacity-70 mt-3">No credit card required · Free for 30 days</p>
        </div>
      </div>

      {/* Benefits */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">Everything you need to grow locally</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {BENEFITS.map((b, i) => (
            <div key={i} className="bg-gray-50 rounded-2xl p-5 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">{b.icon}</div>
              <h3 className="font-bold text-gray-900 mb-1">{b.title}</h3>
              <p className="text-sm text-gray-500">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gray-50 py-16 px-6 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to get started?</h2>
        <p className="text-gray-500 mb-8">It takes less than 2 minutes to list your business.</p>
        <button
          onClick={() => setStep('form')}
          className="inline-flex items-center gap-2 bg-primary text-white font-bold text-lg px-8 py-4 rounded-2xl hover:opacity-90 transition-opacity"
        >
          Apply Now — It's Free <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
