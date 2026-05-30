import BackButton from '../../components/BackButton';
import { useState, useEffect } from 'react';

import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { api, endpoints } from '../../utils/api';
import type { BenchmarkData } from '../../types';

export default function BenchmarkPage() {
  const [data, setData]       = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const vendorId = 1;

  useEffect(() => {
    api.get(endpoints.benchmark(vendorId)).then((res) => {
      if (res.data.success) {
        const d = res.data.data;
        setData({
          vendor:      { avgCtr: d.vendor.avg_ctr, avgDiscount: d.vendor.avg_discount, offersPerMonth: d.vendor.offers_per_month },
          categoryAvg: { avgCtr: d.category_avg.avg_ctr, avgDiscount: d.category_avg.avg_discount, offersPerMonth: d.category_avg.offers_per_month },
          percentile:  { ctr: d.percentile.ctr, discount: d.percentile.discount, activity: d.percentile.activity },
          category:    d.category,
        });
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <><BackButton to="/vendor/dashboard" /><div className="text-center py-20 text-gray-400">Loading benchmarks...</div></>;

  if (!data) return null;

  const radarData = [
    { metric: 'CTR',            You: data.vendor.avgCtr,        Category: data.categoryAvg.avgCtr },
    { metric: 'Avg Discount %', You: data.vendor.avgDiscount,   Category: data.categoryAvg.avgDiscount },
    { metric: 'Offers/Month',   You: data.vendor.offersPerMonth,Category: data.categoryAvg.offersPerMonth },
  ];

  const tips = [];
  if (data.vendor.avgCtr < data.categoryAvg.avgCtr)
    tips.push(`Your CTR (${data.vendor.avgCtr}%) is below the ${data.category} average. Add a larger discount or clearer CTA.`);
  if (data.vendor.offersPerMonth < data.categoryAvg.offersPerMonth)
    tips.push(`Vendors with 2+ offers/week in ${data.category} get 40% more engagement. Try posting more often.`);
  if (data.vendor.avgDiscount < 20)
    tips.push('Offers with 25%+ discount receive 2x more saves on average.');

  return (
    <div className="pb-20 sm:pb-6">
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-6">Competitor Benchmark</h1>

      {/* Percentile badges */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'CTR Percentile',      value: data.percentile.ctr,      icon: '📊' },
          { label: 'Discount Percentile', value: data.percentile.discount, icon: '💸' },
          { label: 'Activity Percentile', value: data.percentile.activity, icon: '🏃' },
        ].map((p) => (
          <div key={p.label} className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <div className="text-2xl mb-1">{p.icon}</div>
            <div className="font-heading font-bold text-2xl text-primary">Top {100 - p.value}%</div>
            <div className="text-xs text-gray-500 mt-0.5">{p.label}</div>
          </div>
        ))}
      </div>

      {/* Radar chart */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
        <h3 className="font-heading font-semibold text-gray-800 mb-4">You vs. {data.category} Category Average</h3>
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
            <PolarRadiusAxis tick={{ fontSize: 10 }} />
            <Radar name="You" dataKey="You" stroke="#1A73E8" fill="#1A73E8" fillOpacity={0.15} strokeWidth={2} />
            <Radar name="Category Avg" dataKey="Category" stroke="#EA4335" fill="#EA4335" fillOpacity={0.1} strokeWidth={2} />
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Improvement tips */}
      {tips.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-heading font-semibold text-gray-800 mb-3">💡 Improvement Tips</h3>
          <ul className="space-y-2">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-accent mt-0.5">→</span> {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
