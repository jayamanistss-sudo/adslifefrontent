/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Phone, Globe, FileText, Mail, User, Tag,
  Eye, MousePointer, Bookmark, ShoppingBag, Users, CheckCircle,
  PauseCircle, XCircle, Calendar, Building2, CreditCard, ExternalLink,
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';

interface VendorDetail { vendor: any; offers: any[]; application: any | null; }

const STATUS: Record<string, { bg: string; text: string; dot: string }> = {
  approved:       { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  pending_review: { bg: 'bg-amber-50 dark:bg-amber-950/30',    text: 'text-amber-700 dark:text-amber-300',     dot: 'bg-amber-400'   },
  suspended:      { bg: 'bg-orange-50 dark:bg-orange-950/30',  text: 'text-orange-600 dark:text-orange-300',   dot: 'bg-orange-400'  },
  rejected:       { bg: 'bg-red-50 dark:bg-red-950/30',        text: 'text-red-600 dark:text-red-400',         dot: 'bg-red-500'     },
  active:         { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  inactive:       { bg: 'bg-[var(--surface-2)]',               text: 'text-[var(--text-muted)]',               dot: 'bg-[var(--border)]'    },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.inactive;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status.replace('_', ' ')}
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, accent }: any) {
  return (
    <div className="flex-1 min-w-[110px] bg-[var(--surface)] border border-[var(--border)] rounded-2xl px-4 py-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent} bg-opacity-10 flex-shrink-0`}
           style={{ background: 'color-mix(in srgb, currentColor 10%, transparent)' }}>
        <Icon size={17} className={accent} />
      </div>
      <div>
        <div className="font-heading font-bold text-[var(--text)] text-lg leading-none">{value}</div>
        <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{label}</div>
      </div>
    </div>
  );
}

export default function AdminVendorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    api.get(endpoints.adminVendorDetail(Number(id)))
      .then(r => { if (r.data.success) setDetail(r.data.data); })
      .catch(() => toast.error('Failed to load vendor'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const action = async (act: string) => {
    setActing(true);
    try {
      const res = await api.put(endpoints.adminVendorAction(Number(id)), { action: act });
      toast.success(res.data.message ?? 'Done');
      load();
    } catch { toast.error('Action failed'); }
    finally { setActing(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!detail) return null;

  const { vendor: v, offers, application } = detail;

  return (
    <div className="pb-10 w-full">

      {/* ── Hero Header ───────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] border border-[var(--border)] rounded-2xl mb-5 overflow-hidden">
        {/* top accent strip */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-blue-400 to-violet-500" />

        <div className="p-6">
          <div className="flex items-start gap-4 mb-5">
            <button onClick={() => navigate('/admin/vendors')}
              className="p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--text-secondary)] transition-colors mt-0.5 flex-shrink-0">
              <ArrowLeft size={18} />
            </button>

            {/* Logo / avatar */}
            {v.logo_url ? (
              <img src={v.logo_url} alt="" className="w-16 h-16 rounded-2xl object-cover border border-[var(--border)] flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center text-primary font-heading font-bold text-2xl flex-shrink-0">
                {v.business_name?.[0]?.toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="font-heading font-bold text-2xl text-[var(--text)] truncate">{v.business_name}</h1>
                <StatusBadge status={v.status} />
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1"><Mail size={11} />{v.owner_email}</span>
                {v.phone && <span className="flex items-center gap-1"><Phone size={11} />{v.phone}</span>}
                {v.city  && <span className="flex items-center gap-1"><MapPin size={11} />{v.city}</span>}
                {v.category && <span className="flex items-center gap-1"><Tag size={11} />{v.category}</span>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              {v.status !== 'approved' && (
                <button disabled={acting} onClick={() => action('approve')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm">
                  <CheckCircle size={15} /> Approve
                </button>
              )}
              {v.status === 'approved' && (
                <button disabled={acting} onClick={() => action('suspend')}
                  className="btn btn-primary text-sm disabled:opacity-60">
                  <PauseCircle size={15} /> Suspend
                </button>
              )}
              {v.status === 'suspended' && (
                <button disabled={acting} onClick={() => action('approve')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm">
                  <CheckCircle size={15} /> Reinstate
                </button>
              )}
              {v.status === 'pending_review' && (
                <button disabled={acting} onClick={() => action('reject')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-60 transition-colors shadow-sm">
                  <XCircle size={15} /> Reject
                </button>
              )}
            </div>
          </div>

          {/* KPI strip */}
          <div className="flex flex-wrap gap-3">
            <KpiCard icon={Eye}          label="Total Views"       value={Number(v.total_views).toLocaleString()}       accent="text-blue-600" />
            <KpiCard icon={MousePointer} label="Total Clicks"      value={Number(v.total_clicks).toLocaleString()}      accent="text-emerald-600" />
            <KpiCard icon={Bookmark}     label="Total Saves"       value={Number(v.total_saves).toLocaleString()}       accent="text-amber-600" />
            <KpiCard icon={ShoppingBag}  label="Redemptions"       value={Number(v.total_redemptions).toLocaleString()} accent="text-violet-600" />
            <KpiCard icon={Users}        label="Followers"         value={Number(v.total_followers).toLocaleString()}   accent="text-pink-600" />
            <KpiCard icon={Tag}          label="Active / Total"    value={`${v.active_offers ?? 0} / ${v.total_offers ?? 0}`} accent="text-primary" />
          </div>
        </div>
      </div>

      {/* ── Main Grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">

        {/* Vendor Info — 2 cols */}
        <div className="xl:col-span-2 card p-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface-2)] flex items-center gap-2">
            <Building2 size={15} className="text-primary" />
            <h2 className="font-heading font-semibold text-[var(--text)] text-sm">Vendor Details</h2>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {[
              { icon: Mail,       label: 'Email',        value: v.owner_email },
              { icon: User,       label: 'Owner Name',   value: v.owner_name },
              { icon: Phone,      label: 'Phone',        value: v.phone || '—' },
              { icon: Tag,        label: 'Category',     value: v.category || '—' },
              { icon: MapPin,     label: 'City',         value: v.city || '—' },
              { icon: Building2,  label: 'Plan',         value: v.subscription_plan ?? 'free' },
              { icon: Globe,      label: 'Website',      value: v.website || '—' },
              { icon: CreditCard, label: 'Plan Expires', value: v.plan_expires_at ? v.plan_expires_at.slice(0,10) : 'N/A' },
              { icon: FileText,   label: 'GST Number',   value: v.gst_number || '—' },
              { icon: Calendar,   label: 'Joined',       value: v.created_at?.slice(0, 10) },
              { icon: MapPin,     label: 'Coordinates',  value: (v.lat && v.lng) ? `${parseFloat(v.lat).toFixed(5)}, ${parseFloat(v.lng).toFixed(5)}` : '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-2.5 text-sm">
                <Icon size={13} className="text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                <span className="text-[var(--text-muted)] w-28 flex-shrink-0 text-xs">{label}</span>
                <span className="text-[var(--text)] text-xs break-all">{value}</span>
              </div>
            ))}
          </div>
          {v.address && (
            <div className="px-5 pb-4">
              <div className="flex items-start gap-2.5 text-sm">
                <MapPin size={13} className="text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                <span className="text-[var(--text-muted)] w-28 flex-shrink-0 text-xs">Address</span>
                <span className="text-[var(--text)] text-xs">{v.address}</span>
              </div>
            </div>
          )}
          {v.description && (
            <div className="mx-5 mb-5 p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm text-[var(--text)]">{v.description}</p>
            </div>
          )}
        </div>

        {/* Application — 1 col */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-primary" />
              <h2 className="font-heading font-semibold text-[var(--text)] text-sm">Registration Application</h2>
            </div>
            {application && <StatusBadge status={application.status} />}
          </div>
          {application ? (
            <div className="p-5 space-y-2.5 text-sm">
              <p className="text-[10px] text-[var(--text-muted)]">Applied {application.created_at?.slice(0, 10)}</p>
              {[
                ['Business Name', application.business_name],
                ['Category',      application.category],
                ['City',          application.city],
                ['Address',       application.address],
                ['Phone',         application.phone],
                ['Website',       application.website || '—'],
                ['GST',           application.gst_number || '—'],
                ['Coordinates',   (application.lat && application.lng)
                  ? `${parseFloat(application.lat).toFixed(5)}, ${parseFloat(application.lng).toFixed(5)}` : '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-2 text-xs">
                  <span className="text-[var(--text-muted)] w-24 flex-shrink-0">{label}</span>
                  <span className="text-[var(--text)] break-all">{value}</span>
                </div>
              ))}
              {application.description && (
                <div className="pt-3 border-t border-[var(--border)]">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">Description</p>
                  <p className="text-xs text-[var(--text)]">{application.description}</p>
                </div>
              )}
              {application.review_note && (
                <div className="pt-2">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">Review Note</p>
                  <p className="text-xs text-[var(--text)] bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30 rounded-lg p-2">{application.review_note}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-5 text-sm text-[var(--text-muted)]">No application record found.</div>
          )}
        </div>
      </div>

      {/* ── Location ──────────────────────────────────────── */}
      {v.lat && v.lng && (
        <div className="card p-0 overflow-hidden mb-5">
          <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-primary" />
              <h2 className="font-heading font-semibold text-[var(--text)] text-sm">Location</h2>
            </div>
            <a
              href={`https://www.openstreetmap.org/?mlat=${v.lat}&mlon=${v.lng}#map=16/${v.lat}/${v.lng}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Open in Maps <ExternalLink size={11} />
            </a>
          </div>
          <div className="p-5 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2 text-sm">
              <MapPin size={14} className="text-[var(--text-muted)]" />
              <span className="text-[var(--text-muted)] text-xs">Lat:</span>
              <span className="text-[var(--text)] font-mono text-xs">{parseFloat(v.lat).toFixed(6)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin size={14} className="text-[var(--text-muted)]" />
              <span className="text-[var(--text-muted)] text-xs">Lng:</span>
              <span className="text-[var(--text)] font-mono text-xs">{parseFloat(v.lng).toFixed(6)}</span>
            </div>
            {v.address && (
              <span className="text-xs text-[var(--text-muted)]">{v.address}</span>
            )}
          </div>
          <iframe
            title="map"
            loading="lazy"
            className="w-full h-52 border-t border-[var(--border)]"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${parseFloat(v.lng)-0.01},${parseFloat(v.lat)-0.01},${parseFloat(v.lng)+0.01},${parseFloat(v.lat)+0.01}&layer=mapnik&marker=${v.lat},${v.lng}`}
          />
        </div>
      )}

      {/* ── Offers Table ──────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface-2)] flex items-center gap-2">
          <Tag size={15} className="text-primary" />
          <h2 className="font-heading font-semibold text-[var(--text)] text-sm">
            Offers <span className="text-[var(--text-muted)] font-normal">({offers.length})</span>
          </h2>
        </div>
        {offers.length === 0 ? (
          <div className="text-center py-14 text-[var(--text-muted)] text-sm">No offers yet</div>
        ) : (
          <div className="overflow-x-auto overflow-y-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[var(--surface-2)] text-[var(--text-muted)]">
                  <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Title</th>
                  <th className="text-left px-4 py-3 font-semibold">Category</th>
                  <th className="text-center px-4 py-3 font-semibold">Discount</th>
                  <th className="text-center px-4 py-3 font-semibold">Views</th>
                  <th className="text-center px-4 py-3 font-semibold">Clicks</th>
                  <th className="text-center px-4 py-3 font-semibold">Saves</th>
                  <th className="text-center px-4 py-3 font-semibold">Redeemed</th>
                  <th className="text-center px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Valid Until</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {offers.map((o) => (
                  <tr key={o.id} className="hover:bg-[var(--surface-2)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {o.image_url ? (
                          <img src={o.image_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-[var(--border)]" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0">
                            <Tag size={12} className="text-[var(--text-muted)]" />
                          </div>
                        )}
                        <span className="font-medium text-[var(--text)] max-w-[180px] truncate" title={o.title}>{o.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)] capitalize">{o.category || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-emerald-600">{o.discount_percent}%</span>
                    </td>
                    <td className="px-4 py-3 text-center text-[var(--text-muted)]">{Number(o.views).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-[var(--text-muted)]">{Number(o.clicks).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-[var(--text-muted)]">{Number(o.saves).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-[var(--text-muted)]">
                      {Number(o.current_redemptions ?? 0)}/{Number(o.max_redemptions ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${
                        o.is_active
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${o.is_active ? 'bg-emerald-500' : 'bg-[var(--border)]'}`} />
                        {o.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap">
                      {o.valid_until ? o.valid_until.slice(0, 10) : 'No expiry'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
