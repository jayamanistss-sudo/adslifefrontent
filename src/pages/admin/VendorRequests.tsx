import { useState, useEffect } from 'react';
import { Store, CheckCircle, XCircle, Eye, MapPin, Phone, Globe, CreditCard } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import { db } from '../../powersync/database';
import toast from 'react-hot-toast';

interface VendorApp {
  id: number; user_id: number; user_name: string; user_email: string;
  business_name: string; category: string; description: string;
  address: string; city: string; phone: string; website: string;
  gst_number: string; logo_url: string;
  plan_name: string; plan_price: number; payment_status: string; paid_at: string;
  status: string; admin_note: string; vendor_id: number | null; created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  pending:  'badge-warning',
  approved: 'badge-accent',
  rejected: 'badge-danger',
};

export default function VendorRequests() {
  const [apps, setApps]         = useState<VendorApp[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [noteMap, setNoteMap]   = useState<Record<number, string>>({});

  const load = () => {
    setLoading(true);
    api.get(endpoints.adminVendorRequests()).then((r) => {
      if (r.data.success) setApps(r.data.data);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Live-refresh whenever a vendor application changes locally via PowerSync
  // (new submission, status change from another admin session, etc.)
  useEffect(() => {
    const unsubscribe = db.onChange(
      { onChange: () => load() },
      { tables: ['vendor_applications'], throttleMs: 1000 },
    );
    return unsubscribe;
  }, []);

  const handleReview = async (appId: number, action: 'approve' | 'reject') => {
    setReviewing(appId);
    try {
      const res = await api.put(endpoints.adminReviewVendor(appId), {
        status: action === 'approve' ? 'approved' : 'rejected',
        note: noteMap[appId] ?? '',
      });
      if (res.data.success) {
        toast.success(action === 'approve' ? 'Vendor approved!' : 'Application rejected');
        load();
        setExpanded(null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Action failed');
    } finally {
      setReviewing(null);
    }
  };

  const counts = {
    all:      apps.length,
    pending:  apps.filter((a) => a.status === 'pending').length,
    approved: apps.filter((a) => a.status === 'approved').length,
    rejected: apps.filter((a) => a.status === 'rejected').length,
  };

  const visibleApps = filter ? apps.filter((a) => a.status === filter) : apps;

  return (
    <div className="max-w-4xxl pb-6">
      <BackButton to="/admin/dashboard" />

      <div className="page-header">
        <div>
          <h1 className="page-title">Vendor Requests</h1>
          <p className="page-subtitle">Review and approve vendor applications</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-warning">{counts.pending} pending</span>
          <span className="badge badge-accent">{counts.approved} approved</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { v: '', l: 'All', c: counts.all },
          { v: 'pending', l: 'Pending', c: counts.pending },
          { v: 'approved', l: 'Approved', c: counts.approved },
          { v: 'rejected', l: 'Rejected', c: counts.rejected },
        ].map(({ v, l, c }) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`filter-tab ${filter === v ? 'active' : ''}`}>
            {l} {c > 0 && <span className="ml-1 opacity-75">({c})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
      ) : visibleApps.length === 0 ? (
        <div className="card p-10 text-center">
          <Store size={36} className="mx-auto text-[var(--text-muted)] mb-3" />
          <p className="font-heading font-semibold text-[var(--text-secondary)]">No applications found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleApps.map((app) => (
            <div key={app.id} className="card overflow-hidden">
              {/* Header row */}
              <div className="flex items-center gap-4 p-4">
                {app.logo_url ? (
                  <img src={app.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0">
                    <Store size={20} className="text-[var(--text-muted)]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-heading font-semibold text-[var(--text)]">{app.business_name}</span>
                    <span className="badge badge-neutral capitalize">{app.category}</span>
                    <span className={`badge ${STATUS_STYLE[app.status] ?? 'badge-neutral'}`}>
                      {app.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {app.user_name} · {app.user_email} · {new Date(app.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Payment status */}
                  <div className="flex items-center gap-1 text-xs">
                    <CreditCard size={12} className={app.payment_status === 'paid' ? 'text-emerald-600' : 'text-[var(--text-muted)]'} />
                    <span className={app.payment_status === 'paid' ? 'text-emerald-600 font-medium' : 'text-[var(--text-muted)]'}>
                      {app.plan_name ?? 'Free'} {app.payment_status === 'paid' ? '✓ Paid' : app.plan_price > 0 ? '⚠ Unpaid' : ''}
                    </span>
                  </div>
                  <button
                    onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                    className="btn btn-ghost btn-icon-sm"
                  >
                    <Eye size={15} />
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === app.id && (
                <div className="border-t border-[var(--border)] p-4 space-y-4">
                  {/* Details grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {app.description && (
                      <div className="sm:col-span-2">
                        <p className="text-xs font-semibold text-[var(--text-muted)] mb-0.5 uppercase">Description</p>
                        <p className="text-[var(--text-secondary)]">{app.description}</p>
                      </div>
                    )}
                    {app.address && (
                      <div className="flex items-start gap-2">
                        <MapPin size={14} className="text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                        <span className="text-[var(--text-secondary)]">{app.address}, {app.city}</span>
                      </div>
                    )}
                    {app.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-[var(--text-muted)]" />
                        <span className="text-[var(--text-secondary)]">{app.phone}</span>
                      </div>
                    )}
                    {app.website && (
                      <div className="flex items-center gap-2">
                        <Globe size={14} className="text-[var(--text-muted)]" />
                        <a href={app.website} target="_blank" rel="noreferrer" className="text-[var(--primary)] hover:underline truncate">{app.website}</a>
                      </div>
                    )}
                    {app.gst_number && (
                      <div>
                        <span className="text-xs text-[var(--text-muted)]">GST: </span>
                        <span className="font-mono text-sm text-[var(--text)]">{app.gst_number}</span>
                      </div>
                    )}
                  </div>

                  {/* Admin note */}
                  {app.status === 'pending' && (
                    <div>
                      <label htmlFor={`note-${app.id}`} className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5 uppercase">
                        Admin Note (optional)
                      </label>
                      <textarea
                        id={`note-${app.id}`}
                        className="input h-16 resize-none text-sm"
                        placeholder="Reason for rejection, or notes for the vendor…"
                        value={noteMap[app.id] ?? ''}
                        onChange={(e) => setNoteMap((m) => ({ ...m, [app.id]: e.target.value }))}
                      />
                    </div>
                  )}

                  {app.admin_note && app.status !== 'pending' && (
                    <div className="bg-[var(--surface-2)] rounded-xl p-3">
                      <p className="text-xs font-semibold text-[var(--text-muted)] mb-1">Admin Note</p>
                      <p className="text-sm text-[var(--text-secondary)]">{app.admin_note}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {app.status === 'pending' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleReview(app.id, 'approve')}
                        disabled={reviewing === app.id}
                        className="btn btn-primary flex-1"
                      >
                        <CheckCircle size={15} />
                        {reviewing === app.id ? 'Processing…' : 'Approve Vendor'}
                      </button>
                      <button
                        onClick={() => handleReview(app.id, 'reject')}
                        disabled={reviewing === app.id}
                        className="btn btn-danger flex-1"
                      >
                        <XCircle size={15} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
