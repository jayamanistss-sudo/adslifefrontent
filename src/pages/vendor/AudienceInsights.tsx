import { Link } from 'react-router-dom';
import BackButton from '../../components/BackButton';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { ErrorState, EmptyState } from '../../components/ui/EmptyState';
import { useState, useEffect } from 'react';
import { Users, Smartphone, Monitor, Tablet, MapPin, TrendingUp, MousePointer, Bookmark, Star, Store } from 'lucide-react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { AudienceData } from '../../types';
import { useUserStore } from '../../store/useUserStore';
import { useVendorDashboardPS } from '../../powersync/queries';
import { useCachedApi } from '../../hooks/useCachedApi';
import { api, endpoints } from '../../utils/api';

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } } };

const DEVICE_COLORS = { Mobile: '#3B82F6', Desktop: '#10B981', Tablet: '#F59E0B' };

interface Review {
  id: number; rating: number; comment: string | null;
  createdAt: string; userName: string; userAvatar: string | null; offerTitle: string;
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <Star key={s} size={12} className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-[var(--border)]'} />
      ))}
    </div>
  );
}

export default function AudienceInsights() {
  const { user } = useUserStore();
  const [days, setDays] = useState(30);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewLoading, setReviewLoading] = useState(false);

  const loadReviews = (page: number) => {
    setReviewLoading(true);
    api.get(endpoints.vendorReviews(page)).then((r) => {
      if (r.data.success) {
        setReviews(r.data.data);
        setReviewTotal(r.data.total ?? 0);
        setReviewPage(page);
      }
    }).finally(() => setReviewLoading(false));
  };

  // Load reviews once on mount
  useEffect(() => { loadReviews(1); }, []);

  const ps = useVendorDashboardPS(user?.id ?? 0);
  const vendorId = ps.vendorId > 0 ? ps.vendorId : 0;

  const { data: raw, loading, error } = useCachedApi<any>(
    vendorId ? endpoints.audience(vendorId, days) : '',
  );

  const data: AudienceData | null = raw ? {
    deviceBreakdown:  raw.device_breakdown,
    peakHours:        raw.peak_hours,
    topCities:        raw.top_cities,
    engagementRate:   raw.engagement_rate,
    totalImpressions: raw.total_impressions,
    totalClicks:      raw.total_clicks,
    totalSaves:       raw.total_saves,
  } : null;

  if (!vendorId) return (
    <div className="pb-6">
      <BackButton to="/vendor/dashboard" />
      <EmptyState
        icon="🏪"
        title="You don't have a vendor account yet"
        description="Apply as a vendor to see audience insights for your offers."
        action={<Link to="/become-vendor" className="btn btn-primary btn-sm"><Store size={16} /> Apply as Vendor</Link>}
      />
    </div>
  );

  if (loading) return (
    <div className="pb-6">
      <BackButton to="/vendor/dashboard" />
      <DashboardSkeleton />
    </div>
  );

  if (error || !data) return (
    <div className="pb-6">
      <BackButton to="/vendor/dashboard" />
      <ErrorState description={error || 'No audience data available yet.'} />
    </div>
  );

  const deviceData = [
    { name: 'Mobile',  value: data.deviceBreakdown.mobile,  color: DEVICE_COLORS.Mobile },
    { name: 'Desktop', value: data.deviceBreakdown.desktop, color: DEVICE_COLORS.Desktop },
    { name: 'Tablet',  value: data.deviceBreakdown.tablet,  color: DEVICE_COLORS.Tablet },
  ].filter(d => d.value > 0);

  const hourData  = data.peakHours.map((count, hr) => ({ hour: `${hr}:00`, users: count }));
  const cityData  = data.topCities.map(c => ({ city: c.city, count: c.count }));

  const deviceIcons: Record<string, React.ElementType> = { Mobile: Smartphone, Desktop: Monitor, Tablet };

  const kpis = [
    { label: 'Impressions',    value: data.totalImpressions?.toLocaleString() ?? '0', icon: TrendingUp, accent: '#3B82F6' },
    { label: 'Clicks',         value: data.totalClicks?.toLocaleString()      ?? '0', icon: MousePointer, accent: '#FF6200' },
    { label: 'Saves',          value: data.totalSaves?.toLocaleString()       ?? '0', icon: Bookmark, accent: '#F59E0B' },
    { label: 'Engagement',     value: `${data.engagementRate ?? 0}%`,                 icon: Users, accent: '#10B981' },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.07 } } }}
      className="pb-10"
    >
      <BackButton to="/vendor/dashboard" />

      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-start justify-between mb-6 mt-1 flex-wrap gap-3">
        <div>
          <h1 className="page-title">Audience Insights</h1>
          <p className="page-subtitle">Who engages with your offers and when</p>
        </div>
        <div className="flex gap-1 bg-[var(--surface-2)] p-1 rounded-xl border border-[var(--border)]">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${days === d
                ? 'bg-[var(--surface)] shadow-sm text-[var(--text)] border border-[var(--border)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
              }`}>
              {d}d
            </button>
          ))}
        </div>
      </motion.div>

      {/* KPI row */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {kpis.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="card p-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${accent}18` }}>
              <Icon size={17} style={{ color: accent }} />
            </div>
            <div className="font-heading font-bold text-2xl text-[var(--text)]">{value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{label}</div>
          </div>
        ))}
      </motion.div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* Device breakdown */}
        <motion.div variants={fadeUp} className="card p-5">
          <h3 className="font-heading font-semibold text-[var(--text)] text-sm mb-1">Device Breakdown</h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">Which devices your audience uses</p>
          {deviceData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={deviceData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} dataKey="value" strokeWidth={0}>
                      {deviceData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {deviceData.map(d => {
                  const Icon = deviceIcons[d.name] as React.ElementType ?? Smartphone;
                  return (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${d.color}18` }}>
                          <Icon size={13} style={{ color: d.color }} />
                        </div>
                        <span className="text-sm text-[var(--text-secondary)]">{d.name}</span>
                      </div>
                      <span className="font-semibold text-sm text-[var(--text)]">{d.value}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center text-sm text-[var(--text-muted)]">No device data yet</div>
          )}
        </motion.div>

        {/* Top cities */}
        <motion.div variants={fadeUp} className="card p-5">
          <h3 className="font-heading font-semibold text-[var(--text)] text-sm mb-1">Top Cities</h3>
          <p className="text-xs text-[var(--text-muted)] mb-4">Where your audience is located</p>
          {cityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={cityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="city" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', fontSize: '0.75rem', color: 'var(--text)' }} />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Users" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-36 flex items-center justify-center text-sm text-[var(--text-muted)]">
              <div className="text-center">
                <MapPin size={28} className="mx-auto mb-2 text-[var(--text-muted)]" />
                <p>No city data yet</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Peak hours */}
      <motion.div variants={fadeUp} className="card p-5">
        <h3 className="font-heading font-semibold text-[var(--text)] text-sm mb-1">Peak Engagement Hours</h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">User activity across the day — post offers when they're most active</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={hourData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="hourGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10B981" stopOpacity={0.20} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval={3} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', fontSize: '0.75rem', color: 'var(--text)' }} />
            <Area type="monotone" dataKey="users" stroke="#10B981" fill="url(#hourGrad)" strokeWidth={2.5} dot={false} name="Active users" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Customer Feedback */}
      <motion.div variants={fadeUp} className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading font-semibold text-[var(--text)] text-sm">Customer Feedback</h3>
            <p className="text-xs text-[var(--text-muted)]">{reviewTotal} review{reviewTotal !== 1 ? 's' : ''} across all offers</p>
          </div>
          <Star size={18} className="text-amber-400 fill-amber-400" />
        </div>
        {reviewLoading ? (
          <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-10 text-sm text-[var(--text-muted)]">
            <Star size={32} className="mx-auto mb-2 opacity-20" />
            No customer reviews yet — they appear after users rate your offers
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="p-3 bg-[var(--surface-2)] rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--primary)]/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {r.userAvatar
                      ? <img src={r.userAvatar} alt="" className="w-full h-full object-cover" />
                      : <span className="text-xs font-bold text-[var(--primary)]">{r.userName?.[0] ?? '?'}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-[var(--text)]">{r.userName}</span>
                      <StarRow rating={r.rating} />
                    </div>
                    {r.offerTitle && (
                      <p className="text-[10px] text-[var(--text-muted)] mb-1 truncate">on "{r.offerTitle}"</p>
                    )}
                    {r.comment && (
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{r.comment}</p>
                    )}
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {reviewTotal > reviews.length && (
              <button onClick={() => loadReviews(reviewPage + 1)} className="w-full text-sm text-[var(--primary)] font-medium py-2 hover:bg-[var(--surface-2)] rounded-xl transition-colors">
                Load more
              </button>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
