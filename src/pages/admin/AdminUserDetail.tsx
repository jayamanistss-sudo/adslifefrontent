/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, Coins, Flame,
  Bookmark, Gift, Ban, CheckCircle, LogOut, ShieldCheck,
} from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import { useUserStore } from '../../store/useUserStore';
import toast from 'react-hot-toast';

interface UserDetail {
  user: any;
  saved_count: number;
  referral_count: number;
  login_history: Array<{ id: number; action: string; ip_address: string; user_agent: string | null; created_at: string }>;
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

const ADMIN_ROLE_OPTIONS = [
  { value: '', label: 'None (plain admin)' },
  { value: 'support', label: 'Support' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'super', label: 'Super' },
];

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useUserStore((s) => s.user);
  const isSuper = currentUser?.adminRole === 'super';

  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    api.get(endpoints.adminUserDetail(Number(id)))
      .then((r) => { if (r.data.success) setDetail(r.data.data); })
      .catch(() => toast.error('Failed to load user'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const action = async (act: string, extra?: Record<string, string>) => {
    setActing(true);
    try {
      const res = await api.put(endpoints.adminUserAction(Number(id)), { action: act, ...extra });
      toast.success(res.data.message ?? 'Done');
      load();
    } catch { toast.error('Action failed'); }
    finally { setActing(false); }
  };

  const forceLogout = async () => {
    if (!window.confirm('Sign this user out on all devices?')) return;
    setActing(true);
    try {
      const res = await api.put(endpoints.adminUserForceLogout(Number(id)), {});
      toast.success(res.data.message ?? 'Done');
    } catch { toast.error('Action failed'); }
    finally { setActing(false); }
  };

  const setBaseRole = async (role: string) => {
    if (!window.confirm(`Change base role to "${role}"?`)) return;
    action('update_role', { role });
  };

  const setAdminRole = async (adminRole: string) => {
    setActing(true);
    try {
      const res = await api.put(endpoints.adminUserAdminRole(Number(id)), { admin_role: adminRole });
      toast.success(res.data.message ?? 'Done');
      load();
    } catch { toast.error('Action failed — you may not have super-admin permission'); }
    finally { setActing(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!detail) return null;

  const { user: u, saved_count, referral_count, login_history } = detail;

  return (
    <div className="pb-10 w-full">
      {/* ── Hero Header ───────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] border border-[var(--border)] rounded-2xl mb-5 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-blue-400 to-violet-500" />
        <div className="p-6">
          <div className="flex items-start gap-4 mb-5">
            <button onClick={() => navigate('/admin/users')}
              className="p-2 rounded-xl hover:bg-[var(--surface-2)] text-[var(--text-secondary)] transition-colors mt-0.5 flex-shrink-0">
              <ArrowLeft size={18} />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center text-primary font-heading font-bold text-2xl flex-shrink-0">
              {u.name?.[0]?.toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="font-heading font-bold text-2xl text-[var(--text)] truncate">{u.name}</h1>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                  u.is_active ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {u.is_active ? 'Active' : 'Banned'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary capitalize">
                  {u.role}{u.admin_role ? ` · ${u.admin_role}` : ''}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1"><Mail size={11} />{u.email}</span>
                {u.phone && <span className="flex items-center gap-1"><Phone size={11} />{u.phone}</span>}
                {u.city && <span className="flex items-center gap-1"><MapPin size={11} />{u.city}</span>}
                <span className="flex items-center gap-1"><Calendar size={11} />Joined {u.created_at?.slice(0, 10)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              {u.is_active ? (
                <button disabled={acting} onClick={() => action('ban')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-60 transition-colors shadow-sm">
                  <Ban size={15} /> Ban
                </button>
              ) : (
                <button disabled={acting} onClick={() => action('unban')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm">
                  <CheckCircle size={15} /> Unban
                </button>
              )}
              <button disabled={acting} onClick={forceLogout}
                className="btn btn-primary text-sm disabled:opacity-60">
                <LogOut size={15} /> Sign out everywhere
              </button>
            </div>
          </div>

          {/* KPI strip */}
          <div className="flex flex-wrap gap-3">
            <KpiCard icon={Bookmark} label="Saved Offers" value={saved_count} accent="text-amber-600" />
            <KpiCard icon={Gift}     label="Referrals"    value={referral_count} accent="text-pink-600" />
            <KpiCard icon={Coins}    label="Coins"         value={(u.coins ?? 0).toLocaleString()} accent="text-yellow-600" />
            <KpiCard icon={Flame}    label="Streak"        value={`${u.streak_count ?? 0}d`} accent="text-orange-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        {/* Role management — super-admins only */}
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface-2)] flex items-center gap-2">
            <ShieldCheck size={15} className="text-primary" />
            <h2 className="font-heading font-semibold text-[var(--text)] text-sm">Access</h2>
          </div>
          <div className="p-5 space-y-3 text-sm">
            <div className="flex gap-2 text-xs items-center">
              <span className="text-[var(--text-muted)] w-24 flex-shrink-0">Base role</span>
              <select
                className="input text-xs py-1"
                value={u.role}
                disabled={acting}
                onChange={(e) => setBaseRole(e.target.value)}
              >
                <option value="user">User</option>
                <option value="vendor">Vendor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {u.role === 'admin' && (
              <div className="flex gap-2 text-xs items-center">
                <span className="text-[var(--text-muted)] w-24 flex-shrink-0">Admin scope</span>
                {isSuper ? (
                  <select
                    className="input text-xs py-1"
                    value={u.admin_role ?? ''}
                    disabled={acting}
                    onChange={(e) => {
                      if (window.confirm(`Set admin scope to "${e.target.value || 'none'}"?`)) setAdminRole(e.target.value);
                    }}
                  >
                    {ADMIN_ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <span className="text-[var(--text)] capitalize">{u.admin_role || 'None'} <span className="text-[var(--text-muted)]">(super-admin only)</span></span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Login history */}
        <div className="xl:col-span-2 card p-0 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--border)] bg-[var(--surface-2)] flex items-center gap-2">
            <Calendar size={15} className="text-primary" />
            <h2 className="font-heading font-semibold text-[var(--text)] text-sm">
              Login History <span className="text-[var(--text-muted)] font-normal">(last {login_history.length})</span>
            </h2>
          </div>
          {login_history.length === 0 ? (
            <div className="text-center py-10 text-[var(--text-muted)] text-sm">No auth activity recorded yet</div>
          ) : (
            <div className="overflow-x-auto overflow-y-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--surface-2)] text-[var(--text-muted)]">
                    <th className="text-left px-4 py-2.5 font-semibold">Event</th>
                    <th className="text-left px-4 py-2.5 font-semibold">IP</th>
                    <th className="text-left px-4 py-2.5 font-semibold">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {login_history.map((l) => (
                    <tr key={l.id} className="hover:bg-[var(--surface-2)] transition-colors">
                      <td className="px-4 py-2.5 capitalize">{l.action.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2.5 text-[var(--text-muted)] font-mono">{l.ip_address}</td>
                      <td className="px-4 py-2.5 text-[var(--text-muted)] whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
