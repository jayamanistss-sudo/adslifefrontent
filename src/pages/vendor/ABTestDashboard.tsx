import BackButton from '../../components/BackButton';
import { useState, useEffect } from 'react';

import { Trophy } from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';

interface TestResult {
  offer_a: any; offer_b: any; winner: 'A' | 'B' | null;
  confidence: number; status: string; started_at: string;
}

export default function ABTestDashboard() {
  const [result, setResult]   = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [concluding, setConcluding] = useState(false);
  const testId = 1; // demo

  useEffect(() => {
    api.get(endpoints.abResults(testId)).then((res) => {
      if (res.data.success) setResult(res.data.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleConclude = async (winnerId: number) => {
    setConcluding(true);
    try {
      const winner: 'A' | 'B' = result?.offer_a?.id === winnerId ? 'A' : 'B';
      const res = await api.post(endpoints.abConclude(testId), { winner });
      if (res.data.success) {
        toast.success('Winner declared and promoted! 🏆');
        setResult((r) => r ? { ...r, status: 'completed', winner } : r);
      }
    } finally {
      setConcluding(false);
    }
  };

  if (loading) return <><BackButton to="/vendor/dashboard" /><div className="text-center py-20 text-gray-400">Loading A/B test...</div></>;

  if (!result) return null;

  const canDeclare = result.confidence >= 85 && result.status === 'running';

  return (
    <div className="pb-20 sm:pb-6">
      <h1 className="text-2xl font-heading font-bold text-gray-900 mb-2">A/B Test Dashboard</h1>
      <p className="text-gray-500 text-sm mb-6">Started {new Date(result.started_at).toLocaleDateString()}</p>

      {/* Confidence meter */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-600">Statistical Confidence</span>
          <span className={`text-sm font-bold ${result.confidence >= 85 ? 'text-accent' : result.confidence >= 60 ? 'text-warning' : 'text-gray-400'}`}>
            {result.confidence}%
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${result.confidence >= 85 ? 'bg-accent' : result.confidence >= 60 ? 'bg-warning' : 'bg-gray-300'}`}
            style={{ width: `${result.confidence}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {result.confidence >= 85 ? '✅ Results are statistically significant — you can declare a winner.' :
           `Need ${(85 - result.confidence).toFixed(1)}% more confidence to declare. Keep running...`}
        </p>
      </div>

      {/* Side-by-side offer cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {[
          { label: 'Variant A', offer: result.offer_a, isWinner: result.winner === 'A' },
          { label: 'Variant B', offer: result.offer_b, isWinner: result.winner === 'B' },
        ].map(({ label, offer, isWinner }) => (
          <div key={label} className={`bg-white rounded-2xl shadow-sm p-5 border-2 transition-colors ${
            isWinner ? 'border-accent' : 'border-transparent'
          }`}>
            {isWinner && (
              <div className="flex items-center gap-1 text-accent text-xs font-bold mb-2">
                <Trophy size={12} /> Winner!
              </div>
            )}
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${label === 'Variant A' ? 'bg-primary/10 text-primary' : 'bg-purple-100 text-purple-700'}`}>
                {label}
              </span>
            </div>
            <h3 className="font-heading font-semibold text-gray-800 text-sm mb-3 line-clamp-2">{offer.title}</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Impressions', value: offer.impressions },
                { label: 'Clicks',      value: offer.clicks },
                { label: 'Saves',       value: offer.saves },
                { label: 'CTR',         value: `${offer.ctr}%` },
              ].map((m) => (
                <div key={m.label} className="flex justify-between">
                  <span className="text-gray-500">{m.label}</span>
                  <span className="font-heading font-semibold text-gray-800">{m.value}</span>
                </div>
              ))}
            </div>
            {result.status === 'running' && canDeclare && (
              <button
                onClick={() => handleConclude(offer.id)}
                disabled={concluding}
                className="mt-4 w-full py-2 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors"
              >
                Declare {label} Winner 🏆
              </button>
            )}
          </div>
        ))}
      </div>

      {result.status === 'completed' && (
        <div className="bg-accent/10 border border-accent/30 rounded-2xl p-4 text-center">
          <p className="text-sm font-heading font-semibold text-accent">
            ✅ Test completed. Variant {result.winner} has been promoted as the main offer.
          </p>
        </div>
      )}
    </div>
  );
}
