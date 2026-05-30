import BackButton from '../../components/BackButton';
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronRight, CheckCircle } from 'lucide-react';
import { api, endpoints } from '../../utils/api';

type Goal = 'reach' | 'conversions' | 'awareness';
const CATEGORIES = ['food', 'electronics', 'fashion', 'fitness', 'beauty', 'services'];

interface SuggestData {
  goal: string; category: string; avgCtr: number;
  recommendedDurationDays: number; estTotalImpressions: number;
  estTotalClicks: number; bestPostingHours: number[];
  chartData: { day: number; impressions: number; clicks: number }[];
  tips: string[];
}

export default function BudgetSuggester() {
  const [step, setStep]         = useState<1|2|3|4>(1);
  const [goal, setGoal]         = useState<Goal>('reach');
  const [category, setCategory] = useState('food');
  const [data, setData]         = useState<SuggestData | null>(null);
  const [loading, setLoading]   = useState(false);
  const vendorId = 1;

  const goals: { key: Goal; label: string; icon: string; desc: string }[] = [
    { key: 'reach',       label: 'Maximize Reach',    icon: '📡', desc: 'Get seen by as many people as possible' },
    { key: 'conversions', label: 'Drive Conversions', icon: '💰', desc: 'Turn views into redemptions' },
    { key: 'awareness',   label: 'Build Awareness',   icon: '🌟', desc: 'Long-term brand recognition' },
  ];

  const fetchSuggestion = async () => {
    setLoading(true);
    try {
      const res = await api.get(endpoints.budgetSuggest(vendorId, goal, category));
      if (res.data.success) {
        const d = res.data.data;
        setData({
          goal:                    d.goal,
          category:                d.category,
          avgCtr:                  d.avg_ctr,
          recommendedDurationDays: d.recommended_duration_days,
          estTotalImpressions:     d.est_total_impressions,
          estTotalClicks:          d.est_total_clicks,
          bestPostingHours:        d.best_posting_hours,
          chartData:               d.chart_data,
          tips:                    d.tips,
        });
        setStep(4);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto pb-20 sm:pb-6">
      <BackButton to="/vendor/dashboard" />
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-2">Budget Suggester</h1>
      <p className="text-gray-500 text-sm mb-8">Get a data-driven plan for your next campaign</p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1,2,3,4].map((s) => (
          <React.Fragment key={s}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              step >= s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              {step > s ? <CheckCircle size={16} /> : s}
            </div>
            {s < 4 && <div className={`flex-1 h-0.5 transition-all ${step > s ? 'bg-primary' : 'bg-gray-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div>
          <h2 className="font-heading font-semibold text-gray-800 mb-4">What's your goal?</h2>
          <div className="space-y-3">
            {goals.map((g) => (
              <button key={g.key} onClick={() => setGoal(g.key)}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${goal === g.key ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{g.icon}</span>
                  <div>
                    <div className="font-heading font-semibold text-gray-800">{g.label}</div>
                    <div className="text-xs text-gray-500">{g.desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(2)} className="mt-6 w-full bg-primary text-white py-3 rounded-xl font-heading font-semibold hover:bg-blue-600 flex items-center justify-center gap-2">
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="font-heading font-semibold text-gray-800 mb-4">Select your category</h2>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={`p-3 rounded-2xl border-2 text-sm font-medium capitalize transition-all ${category === c ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(1)} className="flex-1 border border-gray-200 py-3 rounded-xl font-heading font-semibold text-gray-600 hover:bg-gray-50">Back</button>
            <button onClick={fetchSuggestion} disabled={loading} className="flex-1 bg-primary text-white py-3 rounded-xl font-heading font-semibold hover:bg-blue-600 flex items-center justify-center gap-2">
              {loading ? 'Analyzing...' : <><span>Get Plan</span><ChevronRight size={16} /></>}
            </button>
          </div>
        </div>
      )}

      {step === 4 && data && (
        <div>
          <h2 className="font-heading font-semibold text-gray-800 mb-5">Your Recommended Plan</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { label: 'Duration',    value: `${data.recommendedDurationDays} days` },
              { label: 'Est. Reach',  value: data.estTotalImpressions.toLocaleString() },
              { label: 'Est. Clicks', value: data.estTotalClicks.toLocaleString() },
              { label: 'Avg CTR',     value: `${data.avgCtr}%` },
            ].map((k) => (
              <div key={k.label} className="bg-white rounded-2xl shadow-sm p-4 text-center">
                <div className="font-heading font-bold text-xl text-primary">{k.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
            <h3 className="font-heading font-semibold text-gray-700 text-sm mb-3">Projected Performance</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.chartData.slice(0, 14)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="impressions" fill="#1A73E8" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
            <h3 className="font-heading font-semibold text-gray-700 text-sm mb-3">
              🕐 Best Posting Hours: {data.bestPostingHours.map((h) => `${h}:00`).join(', ')}
            </h3>
          </div>

          {data.tips.length > 0 && (
            <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 mb-4">
              <h3 className="font-heading font-semibold text-gray-700 text-sm mb-2">💡 Tips</h3>
              <ul className="space-y-1">
                {data.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-2"><span className="text-accent">→</span>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          <button onClick={() => setStep(1)} className="w-full border border-gray-200 py-3 rounded-xl font-heading font-semibold text-gray-600 hover:bg-gray-50">
            Start Over
          </button>
        </div>
      )}
    </div>
  );
}
