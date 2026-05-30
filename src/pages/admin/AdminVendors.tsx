import { useState, useEffect, useCallback } from 'react';
import { Search, CheckCircle, XCircle, PauseCircle, Tag, Eye } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';

interface VendorRow {
  id: number; business_name: string; category: string; city: string;
  status: string; subscription_plan: string; plan_expires_at: string | null;
  total_followers: number; created_at: string; email: string;
  user_id: number; user_active: number;
  total_offers: number; active_offers: number; total_views: number; total_clicks: number;
}

const STATUSES = ['', 'approved', 'pending_review', 'suspended', 'rejected'];
const PLANS    = ['', 'free', 'starter', 'growth', 'professional'];

export default function AdminVendors() {
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [plan, setPlan]       = useState('');
  const [offset, setOffset]   = useState(0);
  const LIMIT = 30;

  const load = useCallback(() => {
    setLoading(true);
    api.get(endpoints.adminVendors(search, status, plan, LIMIT, offset))
      .then((r) => {
        if (r.data.success) { setVendors(r.data.data.vendors); setTotal(r.data.data.total); }
      }).finally(() => setLoading(false));
  }, [search, status, plan, offset]);

  useEffect(() => { setOffset(0); }, [search, status, plan]);
  useEffect(() => { load(); }, [load]);

  const action = async (vendorId: number, act: string, extra?: Record<string, string>) => {
    try {
      const res = await api.put(endpoints.adminVendorAction(vendorId), { action: act, ...extra });
      toast.success(res.data.message);
      load();
    } catch { toast.error('Action failed'); }
  };

  const statusColor = (s: string) => ({
    approved:       'bg-emerald-50 text-emerald-600',
    pending_review: 'bg-amber-50 text-amber-600',
    suspended:      'bg-orange-50 text-orange-600',
    rejected:       'bg-red-50 text-red-500',
  }[s] ?? 'bg-gray-100 text-gray-500');

  return (
    <div className="pb-8">
      <BackButton to="/admin/dashboard" label="Admin Panel" />
      <div className="page-header mb-5">
        <div>
          <h1 className="page-title">Vendors</h1>
          <p className="page-subtitle">{total.toLocaleString()} total vendors</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8 w-full" placeholder="Search name, email, city…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-36" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s ? s.replace('_', ' ') : 'All status'}</option>)}
        </select>
        <select className="input w-36" value={plan} onChange={(e) => setPlan(e.target.value)}>
          {PLANS.map((p) => <option key={p} value={p}>{p || 'All plans'}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-gray-50/50">
                {['Vendor', 'City', 'Plan', 'Offers', 'Reach', 'Followers', 'Joined', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border)]">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="py-3 px-4"><div className="skeleton h-4 w-20 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : vendors.map((v) => (
                <tr key={v.id} className="border-b border-[var(--border)] hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-xs flex-shrink-0">
                        {v.business_name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--text)] truncate max-w-32">{v.business_name}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate max-w-32">{v.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[var(--text-muted)] capitalize">{v.city || '–'}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs font-semibold capitalize text-[var(--text)]">{v.subscription_plan}</span>
                    {v.plan_expires_at && <p className="text-xs text-[var(--text-muted)]">exp {v.plan_expires_at.slice(0,10)}</p>}
                  </td>
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]"><Tag size={11} /> {v.active_offers}/{v.total_offers}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]"><Eye size={11} /> {Number(v.total_views).toLocaleString()}</span>
                  </td>
                  <td className="py-3 px-4 text-[var(--text-muted)]">{v.total_followers}</td>
                  <td className="py-3 px-4 text-xs text-[var(--text-muted)] whitespace-nowrap">{v.created_at.slice(0,10)}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusColor(v.status)}`}>
                      {v.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      {v.status !== 'approved' && (
                        <button onClick={() => action(v.id, 'approve')} title="Approve"
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"><CheckCircle size={14} /></button>
                      )}
                      {v.status === 'approved' && (
                        <button onClick={() => action(v.id, 'suspend')} title="Suspend"
                          className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-500 transition-colors"><PauseCircle size={14} /></button>
                      )}
                      {v.status !== 'rejected' && (
                        <button onClick={() => action(v.id, 'reject')} title="Reject"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><XCircle size={14} /></button>
                      )}
                      <select className="text-xs border border-[var(--border)] rounded-lg px-1.5 py-1 bg-[var(--surface)] text-[var(--text)] cursor-pointer"
                        value={v.subscription_plan}
                        onChange={(e) => action(v.id, 'update_plan', { plan: e.target.value })}>
                        {PLANS.filter(Boolean).map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > LIMIT && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
            <span className="text-xs text-[var(--text-muted)]">Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}</span>
            <div className="flex gap-2">
              <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))} className="btn btn-secondary btn-sm">Prev</button>
              <button disabled={offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)} className="btn btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
