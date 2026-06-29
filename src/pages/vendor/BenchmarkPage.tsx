import BackButton from '../../components/BackButton';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/EmptyState';
import { motion } from 'framer-motion';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp, Award, Zap, Lightbulb } from 'lucide-react';
import { endpoints } from '../../utils/api';
import type { BenchmarkData } from '../../types';
import { useUserStore } from '../../store/useUserStore';
import { useVendorDashboardPS } from '../../powersync/queries';
import { useCachedApi } from '../../hooks/useCachedApi';

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } } };

export default function BenchmarkPage() {
  const { user } = useUserStore();
  const ps = useVendorDashboardPS(user?.id ?? 0);
  const vendorId = ps.vendorId > 0 ? ps.vendorId : 0;

  const { data: raw, loading, error } = useCachedApi<any>(
    vendorId ? endpoints.benchmark(vendorId) : '',
  );

  const data: BenchmarkData | null = raw ? {
    vendor:      { avgCtr: raw.vendor?.avg_ctr, avgDiscount: raw.vendor?.avg_discount, offersPerMonth: raw.vendor?.offers_per_month },
    categoryAvg: { avgCtr: raw.category_avg?.avg_ctr, avgDiscount: raw.category_avg?.avg_discount, offersPerMonth: raw.category_avg?.offers_per_month },
    percentile:  { ctr: raw.percentile?.ctr, discount: raw.percentile?.discount, activity: raw.percentile?.activity },
    category:    raw.category,
  } : null;

  if (loading || !vendorId) return (
    <div className="pb-6">
      <BackButton to="/vendor/dashboard" />
      <DashboardSkeleton />
    </div>
  );

  if (error || !data) return (
    <div className="pb-6">
      <BackButton to="/vendor/dashboard" />
      <ErrorState description={error || 'No benchmark data available yet.'} />
    </div>
  );

  const radarData = [
    { metric: 'CTR',            You: data.vendor.avgCtr,         Category: data.categoryAvg.avgCtr },
    { metric: 'Avg Discount %', You: data.vendor.avgDiscount,    Category: data.categoryAvg.avgDiscount },
    { metric: 'Offers/Month',   You: data.vendor.offersPerMonth, Category: data.categoryAvg.offersPerMonth },
  ];

  const tips: string[] = [];
  if (data.vendor.avgCtr < data.categoryAvg.avgCtr)
    tips.push(`Your CTR (${data.vendor.avgCtr}%) is below the ${data.category} average. Add a larger discount or clearer CTA.`);
  if (data.vendor.offersPerMonth < data.categoryAvg.offersPerMonth)
    tips.push(`Vendors with 2+ offers/week in ${data.category} get 40% more engagement. Post more often.`);
  if (data.vendor.avgDiscount < 20)
    tips.push('Offers with 25%+ discount receive 2× more saves on average.');

  const percentileItems = [
    { label: 'CTR',      value: data.percentile.ctr,      icon: TrendingUp, color: 'text-blue-500',   bg: 'bg-blue-50   dark:bg-blue-950/20' },
    { label: 'Discount', value: data.percentile.discount, icon: Award,      color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/20' },
    { label: 'Activity', value: data.percentile.activity, icon: Zap,        color: 'text-amber-500',  bg: 'bg-amber-50  dark:bg-amber-950/20' },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.07 } } }}
      className="pb-10"
    >
      <BackButton to="/vendor/dashboard" />

      <motion.div variants={fadeUp} className="page-header mb-6 mt-1">
        <div>
          <h1 className="page-title">Competitor Benchmark</h1>
          <p className="page-subtitle">How you stack up against {data.category} vendors</p>
        </div>
      </motion.div>

      {/* Percentile cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4 mb-6">
        {percentileItems.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5 flex flex-col items-center text-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${bg}`}>
              <Icon size={20} className={color} />
            </div>
            <div>
              <div className="font-heading font-bold text-2xl text-[var(--text)]">Top {100 - value}%</div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">{label} Percentile</div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Radar chart */}
      <motion.div variants={fadeUp} className="card p-6 mb-6">
        <h3 className="font-heading font-semibold text-[var(--text)] text-sm mb-1">You vs. {data.category} Average</h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">Performance across 3 key dimensions</p>
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} />
            <PolarRadiusAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
            <Radar name="You" dataKey="You" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} strokeWidth={2.5} />
            <Radar name={`${data.category} Avg`} dataKey="Category" stroke="#EF4444" fill="#EF4444" fillOpacity={0.10} strokeWidth={2} />
            <Legend wrapperStyle={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }} />
            <Tooltip
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', fontSize: '0.75rem', color: 'var(--text)' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Improvement tips */}
      {tips.length > 0 && (
        <motion.div variants={fadeUp} className="card p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center">
              <Lightbulb size={17} className="text-amber-500" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-[var(--text)] text-sm">Improvement Tips</h3>
              <p className="text-xs text-[var(--text-muted)]">{tips.length} suggestions for you</p>
            </div>
          </div>
          <ul className="space-y-3">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{tip}</p>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
}
