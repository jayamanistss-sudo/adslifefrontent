import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Tag, Pencil,
  Eye, MousePointer, Bookmark,
  ArrowUpRight, ArrowDownRight, Minus, Image, LifeBuoy,
  Layers, RefreshCw, Store, CheckCircle2, XCircle, Clock,
} from 'lucide-react';
import BackButton from '../../components/BackButton';
import { ErrorState } from '../../components/ui/EmptyState';
import { api, endpoints } from '../../utils/api';
import { useUserStore } from '../../store/useUserStore';
import { useVendorDashboardPS } from '../../powersync/queries';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';

interface DashboardData {
  vendor: {
    id: number; business_name: string; city: string; status: string;
    logo_url: string; total_followers: number;
    subscription_plan: string; plan_name: string; plan_max_offers: number;
  };
  stats: {
    impressions: number; clicks: number; saves: number; engagement_rate: number;
    impressions_trend: string; clicks_trend: string;
    saves_trend: string; engagement_trend: string;
  };
  offers: {
    total: number; active: number; inactive: number; expired: number;
    total_views: number; total_clicks: number; total_saves: number; total_redemptions: number;
  };
  recent_offers: Array<{
    id: number; title: string; category: string; discount_percent: number;
    views: number; clicks: number; saves: number;
    is_active: string | number; valid_until: string | null;
    current_redemptions: number; max_redemptions: number;
  }>;
  peak_hours: number[];
  daily_trend: Array<{ stat_date: string; impressions: number; clicks: number; saves: number }>;
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend.startsWith('+') && trend !== '+0%') return <ArrowUpRight size={12} className="text-emerald-600" />;
  if (trend.startsWith('-')) return <ArrowDownRight size={12} className="text-red-500" />;
  return <Minus size={12} className="text-[var(--text-muted)]" />;
}

function trendColor(trend: string) {
  if (trend.startsWith('+') && trend !== '+0%') return 'text-emerald-600';
  if (trend.startsWith('-')) return 'text-red-500';
  return 'text-[var(--text-muted)]';
}

interface FollowersData {
  total: number; this_month: number; last_month: number; growth_pct: number;
  followers: Array<{ id: number; name: string; avatar_url: string | null; city: string; followed_at: string }>;
}

export default function VendorDashboard() {
  const { user } = useUserStore();
  const [data, setData]           = useState<DashboardData | null>(null);
  const [followers, setFollowers] = useState<FollowersData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [trendsReady, setTrendsReady] = useState(false);
  const [error, setError]         = useState('');

  // PowerSync: instant data from local SQLite — renders before API responds
  const ps = useVendorDashboardPS(user?.id ?? 0);

  // Pre-populate from PowerSync while API loads
  useEffect(() => {
    if (!ps.vendor || data !== null) return;
    setData({
      vendor: { ...ps.vendor, plan_name: ps.vendor.subscription_plan, plan_max_offers: 0 },
      stats: {
        impressions: 0,
        clicks: ps.offerStats?.total_clicks ?? 0,
        saves:  ps.offerStats?.total_saves  ?? 0,
        engagement_rate: 0,
        impressions_trend: '—', clicks_trend: '—', saves_trend: '—', engagement_trend: '—',
      },
      offers: ps.offerStats
        ? { ...ps.offerStats, expired: 0 }
        : { total: 0, active: 0, inactive: 0, expired: 0, total_views: 0, total_clicks: 0, total_saves: 0, total_redemptions: 0 },
      recent_offers: ps.recentOffers,
      peak_hours: Array(24).fill(0),
      daily_trend: [],
    });
    setLoading(false);
  }, [ps.vendor?.id, ps.offerStats?.total_clicks]);

  const fetchDashboard = useCallback((silent = false) => {
    if (!silent && !ps.vendor) setLoading(true);
    api.get(endpoints.vendorDashboard)
      .then((r) => {
        if (!r.data.success) {
          setError(r.data.error ?? 'Vendor profile not found');
          return;
        }
        const d = r.data.data as DashboardData;
        setData(d);
        setTrendsReady(true);
        setLoading(false);
        api.get(endpoints.vendorFollowers(d.vendor.id, 5))
          .then((fr) => { if (fr?.data?.success) setFollowers(fr.data.data); })
          .catch(() => {});
      })
      .catch((err) => setError(err?.response?.data?.error ?? 'Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, [ps.vendor]);

  useEffect(() => { fetchDashboard(); }, []);


  if (loading) return (
    <div className="pb-6 max-w-6xxl">
      <BackButton to="/feed" label="Back to Feed" />
      <div className="page-header">
        <div className="skeleton h-8 w-48 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-10 w-10 rounded-xl mb-3" />
            <div className="skeleton h-6 w-20 mb-1" />
            <div className="skeleton h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="skeleton h-48 rounded-2xl mb-6" />
      <div className="skeleton h-32 rounded-2xl" />
    </div>
  );

  if (error || !data) {
    const isNoVendor = (error || '').toLowerCase().includes('not found') || (error || '').toLowerCase().includes('profile');
    return (
      <div className="pb-6">
        <BackButton to="/feed" label="Back to Feed" />
        <ErrorState
          title={isNoVendor ? 'No vendor account yet' : 'Failed to load dashboard'}
          description={isNoVendor
            ? 'List your business on AdsLife to post offers, attract customers, and track analytics.'
            : (error || 'Something went wrong loading your dashboard.')
          }
          onRetry={isNoVendor ? undefined : () => fetchDashboard()}
        />
        {isNoVendor && (
          <div className="flex items-center justify-center gap-3 mt-2">
            <Link to="/become-vendor" className="btn btn-primary text-sm">
              <Store size={15} /> Apply as Vendor
            </Link>
            <Link to="/feed" className="btn btn-secondary text-sm">
              Back to Feed
            </Link>
          </div>
        )}
      </div>
    );
  }

  const s = data.stats;
  const o = data.offers;
  const v = data.vendor;

  const peakData = data.peak_hours.map((count, hr) => ({ hour: `${hr}h`, users: count }));

  const dailyData = data.daily_trend.map((d) => ({
    date: d.stat_date.slice(5),
    impressions: Number(d.impressions),
    clicks: Number(d.clicks),
    saves: Number(d.saves),
  }));

  const manageLinks = [
    { to: '/vendor/offers',       icon: Tag,       label: 'My Offers',    gradient: 'from-green-500 to-emerald-600' },
    { to: '/vendor/edit-profile', icon: Pencil,    label: 'Edit Profile', gradient: 'from-indigo-500 to-violet-600' },
    { to: '/vendor/banner-ads',   icon: Image,     label: 'Banner Ad',    gradient: 'from-pink-500 to-rose-600'    },
    { to: '/vendor/support',      icon: LifeBuoy,  label: 'Support',      gradient: 'from-sky-500 to-cyan-600'     },
    { to: '/vendor/select-plan',  icon: Layers,    label: 'Select Plan',  gradient: 'from-violet-500 to-purple-600' },
    { to: '/vendor/renew-plan',   icon: RefreshCw, label: 'Renew Plan',   gradient: 'from-emerald-500 to-teal-600' },
  ];

  return (
    <div className="pb-10">

      {/* ── Manage Quick Links — top bar ─────────────── */}
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2.5 px-0.5">Manage</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {manageLinks.map(({ to, icon: Icon, label, gradient }) => (
            <Link key={to} to={to}
              className="card card-hover flex flex-col items-center gap-2 p-3 sm:p-4 text-center group">
              <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200`}>
                <Icon size={16} className="text-white" />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-[var(--text)] group-hover:text-[var(--primary)] transition-colors leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Main content ─────────────────────────────── */}
      <div className="min-w-0">

      {/* ── Hero Banner ─────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden mb-6"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #1a1040 100%)' }}>
        {/* Decorative orb */}
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #FF6200 0%, transparent 70%)' }} />
        <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #818cf8 0%, transparent 70%)' }} />

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            {/* Logo */}
            <div className="relative flex-shrink-0">
              {v.logo_url
                ? <img src={v.logo_url} alt="" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/20" />
                : <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center font-heading font-bold text-white text-2xl shadow-lg">{v.business_name?.[0]}</div>
              }
              <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0f172a] ${v.status === 'approved' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            </div>
            {/* Info */}
            <div className="flex-1">
              <h1 className="font-heading font-bold text-white text-2xl sm:text-3xl leading-tight">{v.business_name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-white/60 text-sm">{v.city}</span>
                <span className="text-white/30">·</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white/80 capitalize border border-white/10">{v.plan_name || v.subscription_plan} plan</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${v.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>{v.status}</span>
              </div>
            </div>
            {/* Refresh */}
            <button onClick={() => fetchDashboard(true)}
              className="self-start sm:self-center p-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all">
              <RefreshCw size={16} />
            </button>
          </div>

          {/* Hero stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Impressions',  value: s.impressions.toLocaleString(), trend: s.impressions_trend, accent: '#60a5fa' },
              { label: 'Clicks',       value: s.clicks.toLocaleString(),      trend: s.clicks_trend,      accent: '#FF6200' },
              { label: 'Saves',        value: s.saves.toLocaleString(),       trend: s.saves_trend,       accent: '#fbbf24' },
              { label: 'Engagement',   value: trendsReady ? `${s.engagement_rate}%` : '—', trend: s.engagement_trend, accent: '#a78bfa' },
            ].map(({ label, value, trend, accent }) => (
              <div key={label} className="bg-white/8 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/50 text-xs font-medium">{label}</span>
                  {trendsReady && trend !== '—' && (
                    <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${trendColor(trend)}`}>
                      <TrendIcon trend={trend} />{trend}
                    </span>
                  )}
                </div>
                <div className="font-heading font-bold text-2xl" style={{ color: accent }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Offers at a glance ───────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Offers',  value: o.total,             icon: Store,        accent: '#64748b', bg: 'from-slate-50  to-slate-100  dark:from-slate-800/30 dark:to-slate-900/20' },
          { label: 'Active',        value: o.active,            icon: CheckCircle2, accent: '#16a34a', bg: 'from-green-50  to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10' },
          { label: 'Inactive',      value: o.inactive,          icon: XCircle,      accent: '#dc2626', bg: 'from-red-50    to-rose-50    dark:from-red-900/20   dark:to-rose-900/10' },
          { label: 'Redemptions',   value: o.total_redemptions, icon: Clock,        accent: '#ea580c', bg: 'from-orange-50 to-amber-50   dark:from-orange-900/20 dark:to-amber-900/10' },
        ].map(({ label, value, icon: Icon, accent, bg }) => (
          <div key={label} className={`card p-5 bg-gradient-to-br ${bg}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}18` }}>
                <Icon size={17} style={{ color: accent }} />
              </div>
            </div>
            <div className="font-heading font-bold text-3xl text-[var(--text)]">{value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5 font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Charts row ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">

        {/* Daily trend */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-semibold text-[var(--text)] text-sm">Daily Performance</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Last 14 days</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Impressions</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" />Clicks</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Saves</span>
            </div>
          </div>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dailyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', fontSize: '0.75rem' }} labelStyle={{ color: 'var(--text)' }} />
                <Bar dataKey="impressions" fill="#93c5fd" radius={[3, 3, 0, 0]} name="Impressions" />
                <Bar dataKey="clicks"      fill="#FF6200" radius={[3, 3, 0, 0]} name="Clicks" />
                <Bar dataKey="saves"       fill="#fbbf24" radius={[3, 3, 0, 0]} name="Saves" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-sm text-[var(--text-muted)]">No data yet</div>
          )}
        </div>

        {/* Peak hours */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-semibold text-[var(--text)] text-sm">Peak Hours</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">When your audience is active</p>
            </div>
          </div>
          {peakData.some(p => p.users > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={peakData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#FF6200" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#FF6200" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval={3} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', fontSize: '0.75rem' }} labelStyle={{ color: 'var(--text)' }} />
                <Area type="monotone" dataKey="users" stroke="#FF6200" fill="url(#areaGrad)" strokeWidth={2.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-sm text-[var(--text-muted)]">No peak hour data yet</div>
          )}
        </div>
      </div>

      {/* ── Recent Offers + Subscribers row ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">

        {/* Recent Offers — wider */}
        <div className="card p-0 overflow-hidden lg:col-span-3">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <h3 className="font-heading font-semibold text-[var(--text)] text-sm">Recent Offers</h3>
            <Link to="/vendor/offers" className="text-xs text-[var(--primary)] font-semibold hover:underline flex items-center gap-1">
              View all <ArrowUpRight size={12} />
            </Link>
          </div>
          {data.recent_offers.length > 0 ? (
            <div className="divide-y divide-[var(--border)]">
              {data.recent_offers.map((offer) => (
                <div key={offer.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-2)] transition-colors">
                  <div className={`w-2 h-8 rounded-full flex-shrink-0 ${Number(offer.is_active) ? 'bg-emerald-500' : 'bg-[var(--border-strong)]'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text)] truncate">{offer.title}</p>
                    <p className="text-xs text-[var(--text-muted)] capitalize mt-0.5">{offer.category} · <span className="text-emerald-600 font-semibold">{offer.discount_percent}% off</span></p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-xs text-[var(--text-muted)]">
                    <span className="flex items-center gap-1"><Eye size={11} />{Number(offer.views)}</span>
                    <span className="flex items-center gap-1"><MousePointer size={11} />{Number(offer.clicks)}</span>
                    <span className="flex items-center gap-1"><Bookmark size={11} />{Number(offer.saves)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-sm text-[var(--text-muted)]">No offers yet</div>
          )}
        </div>

        {/* Subscribers — narrower */}
        <div className="card p-0 overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <h3 className="font-heading font-semibold text-[var(--text)] text-sm">Subscribers</h3>
            <Link to="/vendor/audience" className="text-xs text-[var(--primary)] font-semibold hover:underline">Insights</Link>
          </div>
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-4">
            <div>
              <div className="font-heading font-bold text-3xl text-[var(--text)]">{(followers?.total ?? v.total_followers).toLocaleString()}</div>
              <div className="text-xs text-[var(--text-muted)]">total</div>
            </div>
            {followers && (
              <div className={`px-3 py-1.5 rounded-xl text-sm font-bold ${(followers.growth_pct ?? 0) >= 0 ? 'bg-[var(--accent-light)] text-emerald-700 dark:text-emerald-400' : 'bg-[var(--danger-light)] text-red-600 dark:text-red-400'}`}>
                {(followers.growth_pct ?? 0) >= 0 ? '+' : ''}{followers.growth_pct ?? 0}% this month
              </div>
            )}
          </div>
          <div className="divide-y divide-[var(--border)]">
            {followers && followers.followers.length > 0 ? followers.followers.map((f) => (
              <div key={f.id} className="flex items-center gap-3 px-5 py-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-sm overflow-hidden">
                  {f.avatar_url ? <img src={f.avatar_url} alt="" className="w-full h-full object-cover" /> : f.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text)] truncate">{f.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{f.city || '—'}</p>
                </div>
                <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{new Date(f.followed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              </div>
            )) : (
              <div className="text-center py-8 text-sm text-[var(--text-muted)]">No subscribers yet</div>
            )}
          </div>
        </div>
      </div>

      </div>{/* end main content */}
    </div>
  );

}
