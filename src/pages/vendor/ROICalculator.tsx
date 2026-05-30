import BackButton from '../../components/BackButton';
import { useState, useEffect } from 'react';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { api, endpoints } from '../../utils/api';

interface ROIData {
  impressions: number; clicks: number; saves: number; redemptions: number;
  ctr: number; conversionRate: number; estimatedRevenue: number; roiScore: number;
  trends: { impressions: number; clicks: number; saves: number; redemptions: number };
}

function TrendIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp size={14} className="text-accent" />;
  if (value < 0) return <TrendingDown size={14} className="text-danger" />;
  return <Minus size={14} className="text-gray-400" />;
}

export default function ROICalculator() {
  const [data, setData]       = useState<ROIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays]       = useState(30);
  const offerId = 1; // demo

  useEffect(() => {
    setLoading(true);
    api.get(endpoints.roi(offerId, days)).then((res) => {
      if (res.data.success) {
        const d = res.data.data;
        setData({
          impressions:      d.impressions,
          clicks:           d.clicks,
          saves:            d.saves,
          redemptions:      d.redemptions,
          ctr:              d.ctr,
          conversionRate:   d.conversion_rate,
          estimatedRevenue: d.estimated_revenue,
          roiScore:         d.roi_score,
          trends:           d.trends,
        });
      }
    }).finally(() => setLoading(false));
  }, [days]);

  if (loading) return <><BackButton to="/vendor/dashboard" /><div className="text-center py-20 text-gray-400">Calculating ROI...</div></>;

  if (!data) return null;

  const funnelData = [
    { stage: 'Impressions', value: data.impressions, color: '#1A73E8' },
    { stage: 'Clicks',      value: data.clicks,      color: '#FBBC04' },
    { stage: 'Saves',       value: data.saves,        color: '#34A853' },
    { stage: 'Redemptions', value: data.redemptions, color: '#9C27B0' },
  ];

  const handlePrint = () => window.print();

  return (
    <div className="pb-20 sm:pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-900">ROI Calculator</h1>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${days === d ? 'bg-white shadow text-primary' : 'text-gray-500'}`}>
                {d}d
              </button>
            ))}
          </div>
          <button onClick={handlePrint} className="text-xs border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-50">
            🖨️ Print
          </button>
        </div>
      </div>

      {/* ROI Score */}
      <div className="bg-gradient-to-br from-primary to-blue-600 text-white rounded-2xl p-6 mb-6 text-center">
        <div className="text-5xl font-heading font-bold mb-1">{data.roiScore}</div>
        <div className="text-blue-100 text-sm">ROI Score / 100</div>
        <div className="mt-3 text-xs text-blue-200">
          {data.roiScore >= 80 ? '🚀 Excellent performance!' :
           data.roiScore >= 60 ? '👍 Good performance' :
           data.roiScore >= 40 ? '📊 Room for improvement' : '⚠️ Needs attention'}
        </div>
      </div>

      {/* KPI Cards with trends */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Impressions',     value: data.impressions.toLocaleString(), trend: data.trends.impressions },
          { label: 'Clicks',          value: data.clicks.toLocaleString(),      trend: data.trends.clicks },
          { label: 'CTR',             value: `${data.ctr}%`,                    trend: data.trends.clicks },
          { label: 'Est. Revenue',    value: `₹${data.estimatedRevenue.toLocaleString()}`, trend: data.trends.redemptions },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl shadow-sm p-4">
            <div className="font-heading font-bold text-xl text-gray-900">{k.value}</div>
            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <TrendIcon value={k.trend} />
              {Math.abs(k.trend)}% vs prev period
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Funnel chart */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-heading font-semibold text-gray-800 mb-4">Conversion Funnel</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={funnelData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="value" radius={[6,6,0,0]}>
              {funnelData.map((entry, i) => (
                <rect key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-between text-xs text-gray-400 mt-2 px-2">
          <span>Conv. Rate: <strong className="text-gray-700">{data.conversionRate}%</strong></span>
          <span>Redemptions: <strong className="text-gray-700">{data.redemptions}</strong></span>
        </div>
      </div>
    </div>
  );
}
