import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart2, Map, Users, Target, Tag, Pencil,
  ShieldAlert, Eye, MousePointer, Bookmark, Activity,
  ArrowUpRight, ArrowDownRight, Minus, Image, LifeBuoy,
  Layers, RefreshCw, Store, CheckCircle2, XCircle, Clock, Bell,
} from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import { useUserStore } from '../../store/useUserStore';
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
  return <Minus size={12} className="text-gray-400" />;
}

function trendColor(trend: string) {
  if (trend.startsWith('+') && trend !== '+0%') return 'text-emerald-600';
  if (trend.startsWith('-')) return 'text-red-500';
  return 'text-gray-400';
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
  const [error, setError]         = useState('');

  const fetchDashboard = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    api.get(endpoints.vendorDashboard)
      .then((r) => {
        if (r.data.success) {
          const d = r.data.data as DashboardData;
          setData(d);
          return api.get(endpoints.vendorFollowers(d.vendor.id, 5));
        }
        // success:false with 2xx — treat as an error so the null-data guard triggers
        setError(r.data.error ?? 'Vendor profile not found');
        return null;
      })
      .then((r) => { if (r?.data?.success) setFollowers(r.data.data); })
      .catch((err) => setError(err?.response?.data?.error ?? 'Failed to load dashboard data'))
      .finally(() => { if (!silent) setLoading(false); });
  }, []);

  useEffect(() => { fetchDashboard(); }, []);

  const navLinks = [
    { to: '/vendor/heatmap',   icon: Map,         label: 'Heatmap',      desc: 'Where your customers are',  color: 'bg-blue-50 text-blue-700' },
    { to: '/vendor/audience',  icon: Users,       label: 'Audience',     desc: 'Device & time insights',    color: 'bg-violet-50 text-violet-700' },
    { to: '/vendor/benchmark', icon: BarChart2,   label: 'Benchmark',    desc: 'vs category averages',      color: 'bg-emerald-50 text-emerald-700' },
    { to: '/vendor/targeting', icon: Target,      label: 'Targeting',    desc: 'Neighborhood reach',        color: 'bg-cyan-50 text-cyan-700' },
    { to: '/admin/fraud',      icon: ShieldAlert, label: 'Fraud Center', desc: 'Admin: flagged items',      color: 'bg-red-50 text-red-700', adminOnly: true },
  ].filter((l: any) => !l.adminOnly || user?.role === 'admin');

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
      <div className="pb-6 max-w-6xxl">
        <BackButton to="/feed" label="Back to Feed" />
        <div className="card p-10 text-center text-gray-500 space-y-4">
          <div className="text-5xl">{isNoVendor ? '🏪' : '⚠️'}</div>
          <p className="font-semibold text-gray-700 text-lg">
            {isNoVendor ? 'You don\'t have a vendor account yet' : error}
          </p>
          {isNoVendor && (
            <>
              <p className="text-sm text-gray-400 max-w-sm mx-auto">
                List your business on AdsLife to post offers, attract customers, and track analytics.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Link to="/become-vendor"
                  className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-semibold hover:opacity-90 text-sm">
                  <Store size={16} /> Apply as Vendor
                </Link>
                <Link to="/feed"
                  className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-50 text-sm">
                  Back to Feed
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const s = data.stats;
  const o = data.offers;
  const v = data.vendor;

  const kpis = [
    { label: 'Impressions',     value: s.impressions.toLocaleString(), icon: Eye,          trend: s.impressions_trend, color: 'bg-blue-50',    iconColor: 'text-blue-600' },
    { label: 'Clicks',          value: s.clicks.toLocaleString(),      icon: MousePointer, trend: s.clicks_trend,      color: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { label: 'Saves',           value: s.saves.toLocaleString(),       icon: Bookmark,     trend: s.saves_trend,       color: 'bg-amber-50',   iconColor: 'text-amber-600' },
    { label: 'Engagement Rate', value: `${s.engagement_rate}%`,        icon: Activity,     trend: s.engagement_trend,  color: 'bg-violet-50',  iconColor: 'text-violet-600' },
  ];

  const peakData = data.peak_hours.map((count, hr) => ({ hour: `${hr}h`, users: count }));

  const dailyData = data.daily_trend.map((d) => ({
    date: d.stat_date.slice(5),
    impressions: Number(d.impressions),
    clicks: Number(d.clicks),
    saves: Number(d.saves),
  }));

  return (
    <div className="pb-6 max-w-6xxl">
      <BackButton to="/feed" label="Back to Feed" />

      {/* Page header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          {v.logo_url
            ? <img src={v.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
            : <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-lg">{v.business_name?.[0]}</div>
          }
          <div>
            <h1 className="page-title">{v.business_name}</h1>
            <p className="page-subtitle">{v.city} · <span className="capitalize">{v.status}</span> · {v.plan_name} plan</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="badge badge-accent">{v.total_followers} followers</span>
          <span className="text-xs text-[var(--text-muted)]">{o.active}/{v.plan_max_offers} offer slots used</span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {kpis.map(({ label, value, icon: Icon, trend, color, iconColor }) => (
          <div key={label} className="stat-card">
            <div className="flex items-start justify-between">
              <div className={`stat-card-icon ${color}`}>
                <Icon size={18} className={iconColor} />
              </div>
              <span className={`flex items-center gap-0.5 text-xs font-semibold ${trendColor(trend)}`}>
                <TrendIcon trend={trend} />{trend}
              </span>
            </div>
            <div>
              <div className="font-heading font-bold text-2xl text-[var(--text)]">{value}</div>
              <div className="text-xs text-[var(--text-secondary)] mt-0.5">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Offers overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Offers',    value: o.total,              icon: Store,        color: 'bg-gray-50 text-gray-600' },
          { label: 'Active',          value: o.active,             icon: CheckCircle2, color: 'bg-green-50 text-green-600' },
          { label: 'Inactive',        value: o.inactive,           icon: XCircle,      color: 'bg-red-50 text-red-500' },
          { label: 'Redemptions',     value: o.total_redemptions,  icon: Clock,        color: 'bg-orange-50 text-orange-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon size={17} />
            </div>
            <div>
              <div className="font-heading font-bold text-xl text-[var(--text)]">{value}</div>
              <div className="text-xs text-[var(--text-muted)]">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Daily trend chart */}
      {dailyData.length > 0 && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-semibold text-[var(--text)]">Daily Performance</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Last 14 days — impressions, clicks, saves</p>
            </div>
            <span className="badge badge-accent">14 days</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', fontSize: '0.75rem' }}
                labelStyle={{ color: 'var(--text)' }}
              />
              <Bar dataKey="impressions" fill="#93c5fd" radius={[3, 3, 0, 0]} name="Impressions" />
              <Bar dataKey="clicks"      fill="#FF6200" radius={[3, 3, 0, 0]} name="Clicks" />
              <Bar dataKey="saves"       fill="#fbbf24" radius={[3, 3, 0, 0]} name="Saves" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Peak hours chart */}
      {peakData.some((p) => p.users > 0) && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-semibold text-[var(--text)]">Peak Engagement Hours</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">User activity across 24 hours</p>
            </div>
            <span className="badge badge-accent">Last 30 days</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={peakData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#FF6200" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#FF6200" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval={3} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', fontSize: '0.75rem' }}
                labelStyle={{ color: 'var(--text)' }}
              />
              <Area type="monotone" dataKey="users" stroke="#FF6200" fill="url(#areaGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Subscribers */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-primary" />
            <h3 className="font-heading font-semibold text-[var(--text)]">Subscribers</h3>
          </div>
          <Link to="/vendor/audience" className="text-xs text-primary font-medium hover:underline">View insights</Link>
        </div>
        <div className="flex items-center gap-6 mb-4">
          <div>
            <div className="font-heading font-bold text-3xl text-[var(--text)]">{(followers?.total ?? v.total_followers).toLocaleString()}</div>
            <div className="text-xs text-[var(--text-muted)]">Total subscribers</div>
          </div>
          {followers && (
            <div>
              <div className={`font-semibold text-lg ${(followers.growth_pct ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {(followers.growth_pct ?? 0) >= 0 ? '+' : ''}{followers.growth_pct ?? 0}%
              </div>
              <div className="text-xs text-[var(--text-muted)]">{followers.this_month} this month</div>
            </div>
          )}
        </div>
        {followers && followers.followers.length > 0 ? (
          <div className="space-y-2">
            {followers.followers.map((f) => (
              <div key={f.id} className="flex items-center gap-3 py-1.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-sm">
                  {f.avatar_url
                    ? <img src={f.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    : f.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text)] truncate">{f.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{f.city || 'Unknown city'}</p>
                </div>
                <span className="text-xs text-[var(--text-muted)]">{new Date(f.followed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">No subscribers yet — share your offers to grow your audience!</p>
        )}
      </div>

      {/* Recent Offers */}
      {data.recent_offers.length > 0 && (
        <div className="card p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-[var(--text)]">Recent Offers</h3>
            <Link to="/vendor/offers" className="text-xs text-primary font-medium hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {data.recent_offers.map((offer) => (
              <div key={offer.id} className="flex items-center justify-between gap-3 py-2 border-b border-[var(--border)] last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${Number(offer.is_active) ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text)] truncate">{offer.title}</p>
                    <p className="text-xs text-[var(--text-muted)] capitalize">{offer.category} · {offer.discount_percent}% off</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1"><Eye size={11} /> {Number(offer.views).toLocaleString()}</span>
                  <span className="flex items-center gap-1"><MousePointer size={11} /> {Number(offer.clicks).toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Bookmark size={11} /> {Number(offer.saves).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Account & Management */}
      <div className="mb-6">
        <h2 className="font-heading font-semibold text-[var(--text)] text-base mb-3">Account & Management</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { to: '/vendor/offers',        icon: Tag,       label: 'My Offers',      desc: 'Create & manage offers',     color: 'bg-green-50 text-green-700' },
            { to: '/vendor/edit-profile',  icon: Pencil,    label: 'Edit Profile',   desc: 'Update business details',    color: 'bg-indigo-50 text-indigo-700' },
            { to: '/vendor/banner-ads',    icon: Image,     label: 'Post Banner Ad', desc: 'Request a banner placement', color: 'bg-pink-50 text-pink-700' },
            { to: '/vendor/support',       icon: LifeBuoy,  label: 'Support',        desc: 'Raise a support request',    color: 'bg-sky-50 text-sky-700' },
            { to: '/vendor/select-plan',   icon: Layers,    label: 'Select Plan',    desc: 'Upgrade your subscription',  color: 'bg-violet-50 text-violet-700' },
            { to: '/vendor/renew-plan',    icon: RefreshCw, label: 'Renew Plan',     desc: 'Renew your existing plan',   color: 'bg-emerald-50 text-emerald-700' },
          ].map(({ to, icon: Icon, label, desc, color }) => (
            <Link key={to} to={to} className="card card-hover p-4 group flex flex-col gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={17} />
              </div>
              <div>
                <div className="font-heading font-semibold text-[var(--text)] text-sm group-hover:text-[var(--primary)] transition-colors">{label}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Analytics & Tools */}
      <div>
        <h2 className="font-heading font-semibold text-[var(--text)] text-base mb-3">Analytics & Tools</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {navLinks.map(({ to, icon: Icon, label, desc, color }) => (
            <Link key={to} to={to} className="card card-hover p-4 group flex flex-col gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color} transition-all`}>
                <Icon size={17} />
              </div>
              <div>
                <div className="font-heading font-semibold text-[var(--text)] text-sm group-hover:text-[var(--primary)] transition-colors">{label}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
