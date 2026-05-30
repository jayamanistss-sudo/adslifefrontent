import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Store, ShieldAlert, LifeBuoy, Image, Users, TrendingUp,
  Tag, Bell, ArrowUpRight, ArrowDownRight, Minus,
  Activity, DollarSign, Star,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';

interface Stats {
  totals: { users: number; vendors: number; offers: number; interactions: number; revenue: number };
  pending: { vendors: number; tickets: number; banners: number; spotlights: number; fraud: number };
  users: { this_month: number; growth_pct: number; today_active: number; role_breakdown: Record<string, number> };
  daily_signups: Array<{ d: string; cnt: number }>;
  recent_users: Array<{ id: number; name: string; email: string; role: string }>;
  recent_vendors: Array<{ id: number; business_name: string; status: string; subscription_plan: string; email: string }>;
}

function TrendChip({ v }: { v: number }) {
  if (v > 0) return <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600"><ArrowUpRight size={12} />+{v}%</span>;
  if (v < 0) return <span className="flex items-center gap-0.5 text-xs font-semibold text-red-500"><ArrowDownRight size={12} />{v}%</span>;
  return <span className="flex items-center gap-0.5 text-xs font-semibold text-gray-400"><Minus size={12} />0%</span>;
}

export default function AdminDashboard() {
  const [stats, setStats]         = useState<Stats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [broadcast, setBroadcast] = useState({ title: '', message: '', target: 'all' });
  const [sending, setSending]     = useState(false);

  useEffect(() => {
    api.get(endpoints.adminStats)
      .then((r) => { if (r.data.success) setStats(r.data.data); })
      .finally(() => setLoading(false));
  }, []);

  const handleBroadcast = async () => {
    if (!broadcast.title || !broadcast.message) { toast.error('Title and message required'); return; }
    setSending(true);
    try {
      const res = await api.post(endpoints.adminBroadcast, broadcast);
      toast.success(res.data.message);
      setBroadcast({ title: '', message: '', target: 'all' });
    } catch { toast.error('Failed to send broadcast'); }
    finally   { setSending(false); }
  };

  const signupData = (stats?.daily_signups ?? []).map((d) => ({ day: d.d.slice(5), users: Number(d.cnt) }));

  const pendingAlerts = stats ? [
    { label: 'Vendor Requests', count: stats.pending.vendors,    to: '/admin/vendor-requests', color: 'bg-amber-50 text-amber-700',   icon: Store },
    { label: 'Support Tickets', count: stats.pending.tickets,    to: '/admin/support-tickets', color: 'bg-blue-50 text-blue-700',     icon: LifeBuoy },
    { label: 'Banner Ads',      count: stats.pending.banners,    to: '/admin/banner-ads',      color: 'bg-violet-50 text-violet-700', icon: Image },
    { label: 'Spotlights',      count: stats.pending.spotlights, to: '/admin/spotlight',       color: 'bg-pink-50 text-pink-700',     icon: Star },
    { label: 'Fraud Flags',     count: stats.pending.fraud,      to: '/admin/fraud',           color: 'bg-red-50 text-red-700',       icon: ShieldAlert },
  ] : [];

  return (
    <div className="max-w-6xxl pb-8">
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">Super Admin Panel</h1>
          <p className="page-subtitle">Platform overview · AdsLife</p>
        </div>
        {stats && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Activity size={13} className="text-emerald-500" />
            <span>{stats.users.today_active} interactions today</span>
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Total Users',   value: stats?.totals.users,        icon: Users,      color: 'bg-blue-50 text-blue-600' },
          { label: 'Vendors',       value: stats?.totals.vendors,      icon: Store,      color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Active Offers', value: stats?.totals.offers,       icon: Tag,        color: 'bg-amber-50 text-amber-600' },
          { label: 'Interactions',  value: stats?.totals.interactions, icon: Activity,   color: 'bg-violet-50 text-violet-600' },
          { label: 'Revenue',       value: stats ? `₹${stats.totals.revenue.toLocaleString()}` : '–', icon: DollarSign, color: 'bg-green-50 text-green-600' },
          { label: 'New Users/mo',  value: stats?.users.this_month,    icon: TrendingUp, color: 'bg-cyan-50 text-cyan-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${color}`}><Icon size={15} /></div>
            <div className="font-heading font-bold text-xl text-[var(--text)]">
              {loading ? '…' : typeof value === 'number' ? value.toLocaleString() : (value ?? '–')}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Signups chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-semibold text-[var(--text)]">User Signups</h3>
              <p className="text-xs text-[var(--text-muted)]">Last 7 days</p>
            </div>
            {stats && <TrendChip v={stats.users.growth_pct} />}
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={signupData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#FF6200" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#FF6200" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', fontSize: '0.75rem' }} />
              <Area type="monotone" dataKey="users" stroke="#FF6200" fill="url(#signupGrad)" strokeWidth={2} dot={false} name="Signups" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Role breakdown */}
        <div className="card p-5">
          <h3 className="font-heading font-semibold text-[var(--text)] mb-4">User Roles</h3>
          {stats ? (
            <div className="space-y-3">
              {Object.entries(stats.users.role_breakdown).map(([role, cnt]) => {
                const pct = Math.round(cnt / (stats.totals.users || 1) * 100);
                const bar: Record<string, string> = { user: 'bg-blue-500', vendor: 'bg-emerald-500', admin: 'bg-red-500' };
                return (
                  <div key={role}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="capitalize font-medium text-[var(--text)]">{role}s</span>
                      <span className="text-[var(--text-muted)]">{cnt} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${bar[role] ?? 'bg-gray-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div className="text-center py-8 text-gray-400 text-sm">Loading…</div>}
        </div>
      </div>

      {/* Pending alerts */}
      <h2 className="font-heading font-semibold text-[var(--text)] text-base mb-3">Pending Actions</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {pendingAlerts.map(({ label, count, to, color, icon: Icon }) => (
          <Link key={to} to={to} className="card card-hover p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}><Icon size={16} /></div>
            <div>
              <div className="font-heading font-bold text-xl text-[var(--text)]">{count}</div>
              <div className="text-xs text-[var(--text-muted)]">{label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent users */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-[var(--text)]">Recent Users</h3>
            <Link to="/admin/users" className="text-xs text-primary font-medium hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {(stats?.recent_users ?? []).map((u) => (
              <div key={u.id} className="flex items-center gap-3 py-1.5 border-b border-[var(--border)] last:border-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                  {u.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text)] truncate">{u.name}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{u.email}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                  u.role === 'admin' ? 'bg-red-50 text-red-600' : u.role === 'vendor' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                }`}>{u.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent vendors */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-[var(--text)]">Recent Vendors</h3>
            <Link to="/admin/vendors" className="text-xs text-primary font-medium hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {(stats?.recent_vendors ?? []).map((v) => (
              <div key={v.id} className="flex items-center gap-3 py-1.5 border-b border-[var(--border)] last:border-0">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-sm flex-shrink-0">
                  {v.business_name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text)] truncate">{v.business_name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{v.subscription_plan}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  v.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                  v.status === 'pending_review' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'
                }`}>{v.status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Broadcast */}
      <div className="card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={16} className="text-primary" />
          <h3 className="font-heading font-semibold text-[var(--text)]">Broadcast Notification</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <input className="input" placeholder="Title" value={broadcast.title}
            onChange={(e) => setBroadcast((b) => ({ ...b, title: e.target.value }))} />
          <select className="input" value={broadcast.target}
            onChange={(e) => setBroadcast((b) => ({ ...b, target: e.target.value }))}>
            <option value="all">All Users</option>
            <option value="user">Consumers only</option>
            <option value="vendor">Vendors only</option>
            <option value="admin">Admins only</option>
          </select>
          <button onClick={handleBroadcast} disabled={sending} className="btn btn-primary">
            {sending ? 'Sending…' : 'Send Broadcast'}
          </button>
        </div>
        <textarea className="input w-full resize-none" rows={2} placeholder="Message body…"
          value={broadcast.message}
          onChange={(e) => setBroadcast((b) => ({ ...b, message: e.target.value }))} />
      </div>

      {/* Quick nav */}
      <h2 className="font-heading font-semibold text-[var(--text)] text-base mb-3">Management</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/admin/users',           icon: Users,       label: 'Users',           color: 'bg-blue-50 text-blue-700' },
          { to: '/admin/vendors',         icon: Store,       label: 'Vendors',         color: 'bg-emerald-50 text-emerald-700' },
          { to: '/admin/all-offers',      icon: Tag,         label: 'All Offers',      color: 'bg-amber-50 text-amber-700' },
          { to: '/admin/spotlight',       icon: Star,        label: 'Spotlight',       color: 'bg-pink-50 text-pink-700' },
          { to: '/admin/vendor-requests', icon: Store,       label: 'Vendor Requests', color: 'bg-orange-50 text-orange-700' },
          { to: '/admin/support-tickets', icon: LifeBuoy,    label: 'Support',         color: 'bg-sky-50 text-sky-700' },
          { to: '/admin/banner-ads',      icon: Image,       label: 'Banner Ads',      color: 'bg-violet-50 text-violet-700' },
          { to: '/admin/fraud',           icon: ShieldAlert, label: 'Fraud Center',    color: 'bg-red-50 text-red-700' },
        ].map(({ to, icon: Icon, label, color }) => (
          <Link key={to} to={to} className="card card-hover p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color} flex-shrink-0`}><Icon size={16} /></div>
            <span className="font-medium text-sm text-[var(--text)]">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
