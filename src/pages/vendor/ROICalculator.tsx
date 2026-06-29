import BackButton from '../../components/BackButton';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Printer, Target, DollarSign, MousePointer, Repeat } from 'lucide-react';
import { endpoints } from '../../utils/api';
import { useUserStore } from '../../store/useUserStore';
import { useVendorDashboardPS } from '../../powersync/queries';
import { useCachedApi } from '../../hooks/useCachedApi';

interface ROIData {
  impressions: number; clicks: number; saves: number; redemptions: number;
  ctr: number; conversionRate: number; estimatedRevenue: number; roiScore: number;
  trends: { impressions: number; clicks: number; saves: number; redemptions: number };
}

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } } };

const FUNNEL_COLORS = ['#3B82F6', '#FF6200', '#F59E0B', '#8B5CF6'];

function TrendPill({ value }: { value: number }) {
  if (value > 0) return (
    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full">
      <TrendingUp size={11} />+{value}%
    </span>
  );
  if (value < 0) return (
    <span className="flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-full">
      <TrendingDown size={11} />{value}%
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full">
      <Minus size={11} />0%
    </span>
  );
}

export default function ROICalculator() {
  const { user } = useUserStore();
  const [days, setDays] = useState(30);

  const ps = useVendorDashboardPS(user?.id ?? 0);
  const offerId = ps.recentOffers[0]?.id ?? 0;

  const { data: raw, loading } = useCachedApi<any>(
    offerId ? endpoints.roi(offerId, days) : '',
  );

  const data: ROIData | null = raw ? {
    impressions:      raw.impressions,
    clicks:           raw.clicks,
    saves:            raw.saves,
    redemptions:      raw.redemptions,
    ctr:              raw.ctr,
    conversionRate:   raw.conversion_rate,
    estimatedRevenue: raw.estimated_revenue,
    roiScore:         raw.roi_score,
    trends:           raw.trends,
  } : null;

  if (loading || !offerId) return (
    <div className="pb-6">
      <BackButton to="/vendor/dashboard" />
      <DashboardSkeleton />
    </div>
  );

  if (!data) return null;

  const funnelData = [
    { stage: 'Impressions', value: data.impressions, color: FUNNEL_COLORS[0] },
    { stage: 'Clicks',      value: data.clicks,      color: FUNNEL_COLORS[1] },
    { stage: 'Saves',       value: data.saves,       color: FUNNEL_COLORS[2] },
    { stage: 'Redemptions', value: data.redemptions, color: FUNNEL_COLORS[3] },
  ];

  const scoreColor = data.roiScore >= 80 ? '#10B981' : data.roiScore >= 60 ? '#3B82F6' : data.roiScore >= 40 ? '#F59E0B' : '#EF4444';
  const scoreLabel = data.roiScore >= 80 ? 'Excellent' : data.roiScore >= 60 ? 'Good' : data.roiScore >= 40 ? 'Fair' : 'Needs attention';

  const kpis = [
    { label: 'Impressions',   value: data.impressions.toLocaleString(), icon: Target,       trend: data.trends.impressions, accent: '#3B82F6' },
    { label: 'Clicks',        value: data.clicks.toLocaleString(),      icon: MousePointer, trend: data.trends.clicks,      accent: '#FF6200' },
    { label: 'CTR',           value: `${data.ctr}%`,                   icon: TrendingUp,   trend: data.trends.clicks,      accent: '#10B981' },
    { label: 'Est. Revenue',  value: `₹${data.estimatedRevenue.toLocaleString()}`, icon: DollarSign, trend: data.trends.redemptions, accent: '#8B5CF6' },
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
          <h1 className="page-title">ROI Calculator</h1>
          <p className="page-subtitle">Performance and return on your most recent offer</p>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            onClick={() => window.print()}
            className="btn btn-secondary btn-sm gap-1.5"
          >
            <Printer size={13} /> Export
          </button>
        </div>
      </motion.div>

      {/* ROI Score hero */}
      <motion.div variants={fadeUp} className="card p-6 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ background: `radial-gradient(circle at 80% 50%, ${scoreColor}, transparent 60%)` }} />
        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
          {/* Circular score */}
          <div className="relative flex-shrink-0">
            <svg width={120} height={120} viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--surface-2)" strokeWidth="8" />
              <circle cx="60" cy="60" r="50" fill="none" stroke={scoreColor} strokeWidth="8"
                strokeDasharray={`${(data.roiScore / 100) * 314} 314`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dasharray 1s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-heading font-bold text-3xl text-[var(--text)]" style={{ color: scoreColor }}>{data.roiScore}</span>
              <span className="text-[10px] text-[var(--text-muted)] font-medium">/ 100</span>
            </div>
          </div>
          {/* Score info */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-heading font-bold text-xl text-[var(--text)]">{scoreLabel}</span>
              <span className="badge badge-accent text-xs">ROI Score</span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-md">
              {data.roiScore >= 80
                ? 'Outstanding performance! Your offers are converting well. Keep up the great work.'
                : data.roiScore >= 60
                ? 'Good results. A few tweaks to discount levels or CTA copy could push you higher.'
                : data.roiScore >= 40
                ? 'Room for improvement. Consider increasing your discount or posting more frequently.'
                : 'This offer needs attention. Review targeting, discount level, and post timing.'}
            </p>
            <div className="flex items-center gap-3 mt-3 text-sm text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><Repeat size={13} /> Conv. rate: <strong className="text-[var(--text)]">{data.conversionRate}%</strong></span>
              <span>·</span>
              <span>{data.redemptions} redemptions</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {kpis.map(({ label, value, icon: Icon, trend, accent }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}14` }}>
                <Icon size={16} style={{ color: accent }} />
              </div>
              <TrendPill value={trend} />
            </div>
            <div className="font-heading font-bold text-2xl text-[var(--text)]">{value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{label}</div>
          </div>
        ))}
      </motion.div>

      {/* Funnel */}
      <motion.div variants={fadeUp} className="card p-5">
        <h3 className="font-heading font-semibold text-[var(--text)] text-sm mb-1">Conversion Funnel</h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">From impression to redemption</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={funnelData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="stage" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', fontSize: '0.75rem', color: 'var(--text)' }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Count">
              {funnelData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </motion.div>
  );
}
