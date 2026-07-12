import { useState, useEffect, useRef } from 'react';
import { Store, CheckCircle, XCircle, Eye, MapPin, Phone, Globe, CreditCard } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
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

const PAGE_SIZE = 30;

export default function VendorRequests() {
  const [apps, setApps]         = useState<VendorApp[]>([]);
  const [total, setTotal]       = useState(0);
  const [counts, setCounts]     = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [page, setPage]         = useState(1);
  const pageRef = useRef(1);
  pageRef.current = page;
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [noteMap, setNoteMap]   = useState<Record<number, string>>({});

  // Previously fetched the entire table unconditionally — fine at current
  // volume, but paginated server-side now so it doesn't degrade as
  // applications accumulate. Status filtering moved server-side too, so tab
  // counts come from the backend's whole-table counts, not just what's
  // currently loaded on screen.
  const load = (p: number) => {
    setLoading(true);
    api.get(endpoints.adminVendorRequests(filter, p, PAGE_SIZE)).then((r) => {
      if (r.data.success) {
        const { apps: rows, total: t, counts: c } = r.data.data;
        setApps((prev) => (p === 1 ? rows : [...prev, ...rows]));
        setTotal(t);
        setCounts(c);
        setPage(p);
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live-refresh whenever a vendor application changes locally via PowerSync
  // (new submission, status change from another admin session, etc.). Was
  // unconditionally calling load(1) — which resets apps to just page 1's
  // rows — every 30s regardless of how many pages the admin had already
  // loaded via "Load more", silently truncating their scrolled-down list
  // back to the top. Only auto-refresh while still on page 1; an admin
  // deeper in the list can refresh manually without losing their place.
  useEffect(() => {
    const t = setInterval(() => {
      if (pageRef.current === 1) load(1);
    }, 30000);
    return () => clearInterval(t);
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReview = async (appId: number, action: 'approve' | 'reject') => {
    // Previously fired immediately on click — every other approve/reject
    // control in the vendor-review flow (AdminVendorDetail's suspend/reject)
    // already confirms first; this was the one inconsistent gap.
    const confirmMsg = action === 'approve'
      ? 'Approve this vendor application?'
      : 'Reject this vendor application? The applicant will be notified.';
    if (!window.confirm(confirmMsg)) return;
    setReviewing(appId);
    try {
      const res = await api.put(endpoints.adminReviewVendor(appId), {
        status: action === 'approve' ? 'approved' : 'rejected',
        note: noteMap[appId] ?? '',
      });
      if (res.data.success) {
        toast.success(action === 'approve' ? 'Vendor approved!' : 'Application rejected');
        load(1);
        setExpanded(null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Action failed');
    } finally {
      setReviewing(null);
    }
  };

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

      {loading && apps.length === 0 ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
      ) : apps.length === 0 ? (
        <div className="card p-10 text-center">
          <Store size={36} className="mx-auto text-[var(--text-muted)] mb-3" />
          <p className="font-heading font-semibold text-[var(--text-secondary)]">No applications found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map((app) => (
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
          {apps.length < total && (
            <button
              onClick={() => load(page + 1)}
              disabled={loading}
              className="w-full text-sm text-[var(--primary)] font-medium py-2.5 hover:bg-[var(--surface-2)] rounded-xl transition-colors"
            >
              {loading ? 'Loading…' : `Load more (${apps.length} of ${total})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
