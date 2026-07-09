import { useState, useEffect } from 'react';
import BackButton from '../../components/BackButton';
import { ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';

interface FraudFlag {
  id: number; entity_type: string; entity_id: number; entity_name: string | null;
  flag_reason: string; confidence_score: number; status: string; created_at: string;
}

export default function FraudDashboard() {
  const [flags, setFlags]     = useState<FraudFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState({ status: '', type: '' });

  const load = () => {
    setLoading(true);
    api.get(endpoints.fraudFlagged()).then((res) => {
      if (res.data.success) setFlags(res.data.data);
    }).finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  // Live-refresh whenever a fraud flag changes locally via PowerSync
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [filter]);

  // "Take Action" previously only flipped this flag's own status column —
  // the flagged vendor/offer was never actually touched, so an admin had to
  // separately find and act on it a second time. Now the chosen action is
  // applied atomically by the same request.
  const handleAction = async (flag: FraudFlag, downstreamAction?: 'suspend_vendor' | 'deactivate_offer') => {
    const status = downstreamAction ? 'actioned' : 'false_positive';
    if (downstreamAction && !window.confirm(
      downstreamAction === 'suspend_vendor'
        ? `Suspend vendor #${flag.entity_id}${flag.entity_name ? ` (${flag.entity_name})` : ''}? This will also deactivate all of their live offers.`
        : `Deactivate offer #${flag.entity_id}${flag.entity_name ? ` (${flag.entity_name})` : ''}?`
    )) return;
    try {
      const res = await api.post(endpoints.fraudReview(flag.id), { status, downstream_action: downstreamAction });
      const cascaded = res.data.data?.cascaded_offers;
      toast.success(downstreamAction
        ? `Action taken${cascaded ? ` — deactivated ${cascaded} offer(s)` : ''}`
        : 'Dismissed as false positive');
      setFlags((fs) => fs.map((f) => f.id === flag.id ? { ...f, status } : f));
    } catch {
      toast.error('Action failed');
    }
  };

  const riskColor = (score: number) =>
    score >= 85 ? 'text-danger bg-danger/10' : score >= 60 ? 'text-warning bg-warning/10' : 'text-accent bg-accent/10';

  const riskLabel = (score: number) =>
    score >= 85 ? '🔴 High' : score >= 60 ? '🟡 Medium' : '🟢 Low';

  return (
    <div className="pb-20 sm:pb-6">
      <BackButton to="/admin/dashboard" label="Admin Panel" />
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--danger-light)' }}>
            <ShieldAlert size={20} style={{ color: 'var(--danger)' }} />
          </div>
          <div>
            <h1 className="page-title">Fraud Detection</h1>
            <p className="page-subtitle">Review flagged offers and vendors</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select
          value={filter.status}
          onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
          className="input w-auto"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="dismissed">Dismissed</option>
          <option value="actioned">Actioned</option>
        </select>
        <select
          value={filter.type}
          onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))}
          className="input w-auto"
        >
          <option value="">All Types</option>
          <option value="vendor">Vendor</option>
          <option value="offer">Offer</option>
          <option value="user">User</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : flags.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <ShieldAlert size={32} className="mx-auto mb-3 opacity-30" />
          <p>No flagged items found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => (
            <div key={flag.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-bold bg-[var(--surface-2)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full capitalize">
                      {flag.entity_type} #{flag.entity_id}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${riskColor(flag.confidence_score)}`}>
                      {riskLabel(flag.confidence_score)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      flag.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                      flag.status === 'actioned' ? 'bg-danger/10 text-danger' :
                      'bg-[var(--surface-2)] text-[var(--text-muted)]'
                    }`}>
                      {flag.status}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-2">{flag.flag_reason}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-[var(--surface-2)] rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          flag.confidence_score >= 85 ? 'bg-danger' :
                          flag.confidence_score >= 60 ? 'bg-warning' : 'bg-accent'
                        }`}
                        style={{ width: `${flag.confidence_score}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-[var(--text-muted)]">{flag.confidence_score}%</span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">{new Date(flag.created_at).toLocaleString()}</div>
                </div>

                {flag.status === 'pending' && (
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {flag.entity_type === 'vendor' && (
                      <button
                        onClick={() => handleAction(flag, 'suspend_vendor')}
                        className="flex items-center gap-1 text-xs bg-danger/10 text-danger hover:bg-danger/20 transition-colors px-3 py-1.5 rounded-xl font-medium"
                      >
                        <XCircle size={12} /> Suspend Vendor
                      </button>
                    )}
                    {flag.entity_type === 'offer' && (
                      <button
                        onClick={() => handleAction(flag, 'deactivate_offer')}
                        className="flex items-center gap-1 text-xs bg-danger/10 text-danger hover:bg-danger/20 transition-colors px-3 py-1.5 rounded-xl font-medium"
                      >
                        <XCircle size={12} /> Deactivate Offer
                      </button>
                    )}
                    <button
                      onClick={() => handleAction(flag)}
                      className="flex items-center gap-1 text-xs bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--border)] transition-colors px-3 py-1.5 rounded-xl font-medium"
                    >
                      <CheckCircle size={12} /> Dismiss (false positive)
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
