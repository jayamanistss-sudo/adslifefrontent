import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Store, ShieldAlert, LifeBuoy, Image, Users, TrendingUp,
  Tag, Bell, ArrowUpRight, ArrowDownRight, Minus,
  Activity, DollarSign, Star,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { api, endpoints } from '../../utils/api';
import { db } from '../../powersync/database';
import toast from 'react-hot-toast';

interface Stats {
  totals: { users: number; vendors: number; offers: number; interactions: number; revenue: number };
  pending: { vendors: number; tickets: number; banners: number; spotlights: number; fraud: number };
  users: { this_month: number; growth_pct: number; today_active: number; role_breakdown: Record<string, number> };
  daily_signups: Array<{ d: string; cnt: number }>;
  recent_users: Array<{ id: number; name: string; email: string; role: string }>;
  recent_vendors: Array<{ id: number; business_name: string; status: string; subscription_plan: string; email: string }>;
}

const MotionLink = motion(Link);

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 280, damping: 22 }
  }
};

function TrendChip({ v }: { v: number }) {
  if (v > 0) return (
    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full border border-emerald-200/50 dark:border-emerald-900/30">
      <ArrowUpRight size={12} />+{v}%
    </span>
  );
  if (v < 0) return (
    <span className="flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-950/20 px-2.5 py-1 rounded-full border border-red-200/50 dark:border-red-900/30">
      <ArrowDownRight size={12} />{v}%
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs font-semibold text-gray-400 bg-gray-50 dark:bg-gray-800/30 px-2.5 py-1 rounded-full border border-gray-200/50 dark:border-gray-700/30">
      <Minus size={12} />0%
    </span>
  );
}

export default function AdminDashboard() {
  const [stats, setStats]         = useState<Stats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [broadcast, setBroadcast] = useState({ title: '', message: '', target: 'all' });
  const [sending, setSending]     = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadFromPowerSync = async (): Promise<Stats> => {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const one = async (sql: string, params: unknown[] = []) => (await db.getAll<any>(sql, params))[0];

      const [
        totalUsers, approvedVendors, activeOffers, totalInteractions, revenue,
        pendingVendors, openTickets, pendingBanners, pendingSpotlights, pendingFraud,
        thisMonthUsers, lastMonthUsers, todayActive,
      ] = await Promise.all([
        one('SELECT COUNT(*) AS cnt FROM users'),
        one("SELECT COUNT(*) AS cnt FROM vendors WHERE status = 'approved'"),
        one('SELECT COUNT(*) AS cnt FROM offers WHERE is_active = 1'),
        one('SELECT COUNT(*) AS cnt FROM user_interactions'),
        one("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'paid'"),
        one("SELECT COUNT(*) AS cnt FROM vendor_applications WHERE status = 'pending'"),
        one("SELECT COUNT(*) AS cnt FROM support_tickets WHERE status = 'open'"),
        one("SELECT COUNT(*) AS cnt FROM banner_ad_requests WHERE status = 'pending'"),
        one("SELECT COUNT(*) AS cnt FROM spotlight_requests WHERE status = 'pending'"),
        one("SELECT COUNT(*) AS cnt FROM fraud_flags WHERE status = 'pending'"),
        one('SELECT COUNT(*) AS cnt FROM users WHERE created_at >= ?', [thisMonthStart]),
        one('SELECT COUNT(*) AS cnt FROM users WHERE created_at >= ? AND created_at < ?', [lastMonthStart, thisMonthStart]),
        one('SELECT COUNT(*) AS cnt FROM user_interactions WHERE created_at >= ?', [todayStart]),
      ]);

      const roleRows = await db.getAll<{ role: string; cnt: number }>(
        'SELECT role, COUNT(*) AS cnt FROM users GROUP BY role',
      );
      const roleBreakdown: Record<string, number> = { user: 0, vendor: 0, admin: 0 };
      for (const r of roleRows) roleBreakdown[r.role] = Number(r.cnt);

      const dailyRows = await db.getAll<{ d: string; cnt: number }>(
        "SELECT date(created_at) AS d, COUNT(*) AS cnt FROM users WHERE created_at >= ? GROUP BY date(created_at) ORDER BY d ASC",
        [sevenDaysAgo],
      );

      const recentUsers = await db.getAll<any>(
        'SELECT id, name, email, role FROM users ORDER BY created_at DESC LIMIT 5',
      );
      const recentVendors = await db.getAll<any>(
        `SELECT v.id AS id, v.business_name AS business_name, v.status AS status,
                v.subscription_plan AS subscription_plan, u.email AS email
         FROM vendors v JOIN users u ON u.id = v.user_id
         ORDER BY v.created_at DESC LIMIT 5`,
      );

      const tm = Number(thisMonthUsers?.cnt ?? 0);
      const lm = Number(lastMonthUsers?.cnt ?? 0);
      let growth = 0;
      if (lm > 0) growth = Math.round(((tm - lm) / lm) * 1000) / 10;
      else if (tm > 0) growth = 100;

      return {
        totals: {
          users: Number(totalUsers?.cnt ?? 0),
          vendors: Number(approvedVendors?.cnt ?? 0),
          offers: Number(activeOffers?.cnt ?? 0),
          interactions: Number(totalInteractions?.cnt ?? 0),
          revenue: Math.round(Number(revenue?.total ?? 0) * 100) / 100,
        },
        pending: {
          vendors: Number(pendingVendors?.cnt ?? 0),
          tickets: Number(openTickets?.cnt ?? 0),
          banners: Number(pendingBanners?.cnt ?? 0),
          spotlights: Number(pendingSpotlights?.cnt ?? 0),
          fraud: Number(pendingFraud?.cnt ?? 0),
        },
        users: {
          this_month: tm, growth_pct: growth,
          today_active: Number(todayActive?.cnt ?? 0), role_breakdown: roleBreakdown,
        },
        daily_signups: dailyRows,
        recent_users: recentUsers,
        recent_vendors: recentVendors,
      };
    };

    (async () => {
      try {
        const data = await loadFromPowerSync();
        if (!cancelled) setStats(data);
      } catch {
        try {
          const r = await api.get(endpoints.adminStats);
          if (!cancelled && r.data.success) setStats(r.data.data);
        } catch { /* leave stats null — UI shows skeletons */ }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const handleBroadcast = async () => {
    if (!broadcast.title || !broadcast.message) { toast.error('Title and message required'); return; }
    setSending(true);
    try {
      const res = await api.post(endpoints.adminBroadcast, { title: broadcast.title, body: broadcast.message });
      toast.success(res.data.message);
      setBroadcast({ title: '', message: '', target: 'all' });
    } catch { toast.error('Failed to send broadcast'); }
    finally   { setSending(false); }
  };

  const signupData = (stats?.daily_signups ?? []).map((d) => ({ day: d.d.slice(5), users: Number(d.cnt) }));

  const pendingAlerts = stats ? [
    { label: 'Vendor Requests', count: stats.pending.vendors,    to: '/admin/vendor-requests', gradient: 'from-amber-400 to-orange-500',   icon: Store },
    { label: 'Support Tickets', count: stats.pending.tickets,    to: '/admin/support-tickets', gradient: 'from-sky-400 to-blue-500',       icon: LifeBuoy },
    { label: 'Banner Ads',      count: stats.pending.banners,    to: '/admin/banner-ads',      gradient: 'from-violet-400 to-purple-600',  icon: Image },
    { label: 'Spotlights',      count: stats.pending.spotlights, to: '/admin/spotlight',       gradient: 'from-pink-400 to-rose-500',      icon: Star },
    { label: 'Fraud Flags',     count: stats.pending.fraud,      to: '/admin/fraud',           gradient: 'from-red-500 to-rose-600',       icon: ShieldAlert },
  ] : [];

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="max-w-7xxl mx-auto pb-12 px-4 sm:px-6"
    >
      {/* Page header */}
      <div className="page-header mb-8 mt-2 flex justify-between items-end">
        <div>
          <h1 className="page-title text-3xl font-extrabold tracking-tight">
            Super <span className="gradient-text">Admin Dashboard</span>
          </h1>
          <p className="page-subtitle text-sm text-[var(--text-secondary)] mt-1">Platform overview & operations management · AdsLife</p>
        </div>
        {stats && (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 px-3.5 py-2 rounded-full text-xs font-semibold text-emerald-600 dark:text-emerald-400 shadow-sm flex-shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{stats.users.today_active.toLocaleString()} interactions today</span>
          </div>
        )}
      </div>

      {/* KPI cards */}
      <motion.div variants={containerVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Total Users',   value: stats?.totals.users,        icon: Users,      gradient: 'from-blue-500 to-indigo-600' },
          { label: 'Vendors',       value: stats?.totals.vendors,      icon: Store,      gradient: 'from-emerald-400 to-teal-600' },
          { label: 'Active Offers', value: stats?.totals.offers,       icon: Tag,        gradient: 'from-amber-400 to-orange-500' },
          { label: 'Interactions',  value: stats?.totals.interactions, icon: Activity,   gradient: 'from-purple-500 to-indigo-500' },
          { label: 'Revenue',       value: stats ? `₹${stats.totals.revenue.toLocaleString()}` : '–', icon: DollarSign, gradient: 'from-orange-500 to-red-600' },
          { label: 'New Users/mo',  value: stats?.users.this_month,    icon: TrendingUp, gradient: 'from-cyan-400 to-blue-500' },
        ].map(({ label, value, icon: Icon, gradient }) => (
          <motion.div
            key={label}
            variants={cardVariants}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-5 shadow-sm flex flex-col justify-between"
            style={{ boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)' }}
            whileHover={{ 
              y: -5, 
              boxShadow: '0 15px 35px -10px rgba(255,98,0,0.12), 0 4px 12px -5px rgba(255,98,0,0.05)',
              borderColor: 'rgba(255,98,0,0.25)' 
            }}
          >
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 bg-gradient-to-br ${gradient} text-white shadow-md`}>
              <Icon size={18} />
            </div>
            <div>
              <div className="font-heading font-extrabold text-2xl text-[var(--text)] tracking-tight">
                {loading ? (
                  <div className="h-6 w-16 skeleton my-1" />
                ) : typeof value === 'number' ? (
                  value.toLocaleString()
                ) : (
                  value ?? '–'
                )}
              </div>
              <div className="text-[11px] font-bold tracking-wider text-[var(--text-secondary)] uppercase mt-1">
                {label}
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Charts & Demographics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Signups chart */}
        <motion.div variants={cardVariants} className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 lg:col-span-2 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-heading font-bold text-base text-[var(--text)]">User Registration</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Platform growth over the last 7 days</p>
            </div>
            {stats && <TrendChip v={stats.users.growth_pct} />}
          </div>
          <div className="h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={signupData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--primary)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.6} />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 10, fill: 'var(--text-secondary)', fontWeight: 500 }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'var(--text-secondary)', fontWeight: 500 }} 
                  axisLine={false} 
                  tickLine={false} 
                  allowDecimals={false} 
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'var(--surface)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '1rem', 
                    boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)', 
                    fontSize: '0.75rem',
                    color: 'var(--text)'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="users" 
                  stroke="var(--primary)" 
                  fill="url(#signupGrad)" 
                  strokeWidth={2.5} 
                  dot={{ r: 4, stroke: 'var(--primary)', strokeWidth: 1.5, fill: 'var(--surface)' }} 
                  activeDot={{ r: 6, stroke: 'var(--primary)', strokeWidth: 2, fill: 'var(--surface)' }}
                  name="New Users" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Role breakdown */}
        <motion.div variants={cardVariants} className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-heading font-bold text-base text-[var(--text)] mb-1">User Demographics</h3>
            <p className="text-xs text-[var(--text-muted)] mb-6">User role distribution analysis</p>
            {stats ? (
              <div className="space-y-4">
                {Object.entries(stats.users.role_breakdown).map(([role, cnt]) => {
                  const pct = Math.round(cnt / (stats.totals.users || 1) * 100);
                  const barGradient: Record<string, string> = { 
                    user: 'from-blue-400 to-indigo-500', 
                    vendor: 'from-emerald-400 to-teal-500', 
                    admin: 'from-rose-400 to-red-600' 
                  };
                  const bulletColor: Record<string, string> = {
                    user: 'bg-blue-500',
                    vendor: 'bg-emerald-500',
                    admin: 'bg-red-500'
                  };
                  return (
                    <div key={role} className="group">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="capitalize font-semibold text-[var(--text)] flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${bulletColor[role] ?? 'bg-gray-400'}`}></span>
                          {role}s
                        </span>
                        <span className="text-[var(--text-secondary)] font-medium">{cnt} ({pct}%)</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <motion.div 
                          className={`h-full rounded-full bg-gradient-to-r ${barGradient[role] ?? 'from-gray-400 to-gray-500'}`} 
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-3 w-16 skeleton" />
                      <div className="h-3 w-10 skeleton" />
                    </div>
                    <div className="h-2 w-full skeleton" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Pending actions section */}
      <h2 className="font-heading font-bold text-[var(--text)] text-base mb-4 flex items-center gap-2">
        <Activity size={18} className="text-[var(--primary)]" /> Pending Tasks & Reviews
      </h2>
      <motion.div variants={containerVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {pendingAlerts.map(({ label, count, to, gradient, icon: Icon }) => {
          const hasActions = count > 0;
          return (
            <MotionLink 
              key={to} 
              to={to} 
              variants={cardVariants}
              className={`relative bg-[var(--surface)] border rounded-3xl p-5 shadow-sm overflow-hidden flex flex-col justify-between transition-all duration-300 ${
                hasActions 
                  ? 'border-red-200/60 dark:border-red-900/30' 
                  : 'border-[var(--border)]'
              }`}
              style={{ boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)' }}
              whileHover={{ 
                y: -5, 
                boxShadow: hasActions 
                  ? '0 15px 35px -10px rgba(239,68,68,0.15), 0 4px 12px -5px rgba(239,68,68,0.08)'
                  : '0 15px 35px -10px rgba(0,0,0,0.08), 0 4px 12px -5px rgba(0,0,0,0.03)',
                borderColor: hasActions ? 'rgba(239,68,68,0.3)' : 'rgba(255,98,0,0.25)'
              }}
            >
              {hasActions && (
                <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-bl-xl border-l border-b border-[var(--surface)]" />
              )}
              <div className="flex items-center justify-between mb-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${gradient} text-white shadow-md`}>
                  <Icon size={16} />
                </div>
                {hasActions ? (
                  <span className="badge badge-danger badge-shine animate-pulse">{count} pending</span>
                ) : (
                  <span className="badge badge-neutral text-[10px]">0</span>
                )}
              </div>
              <div>
                <div className="font-heading font-extrabold text-2xl text-[var(--text)] tracking-tight">
                  {count}
                </div>
                <div className="text-xs font-bold text-[var(--text-secondary)] mt-1 truncate">
                  {label}
                </div>
              </div>
            </MotionLink>
          );
        })}
      </motion.div>

      {/* Recents row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent users */}
        <motion.div variants={cardVariants} className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-heading font-bold text-base text-[var(--text)]">Newly Joined Users</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Most recent platform signups</p>
            </div>
            <Link to="/admin/users" className="text-xs text-[var(--primary)] font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity">
              View all <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-[var(--border)]/60">
            {stats ? (
              (stats.recent_users ?? []).map((u) => {
                const roleBadge: Record<string, string> = {
                  admin: 'badge-danger',
                  vendor: 'badge-accent',
                  user: 'badge-primary'
                };
                const initialBg: Record<string, string> = {
                  admin: 'from-red-400 to-rose-500',
                  vendor: 'from-emerald-400 to-teal-500',
                  user: 'from-blue-400 to-indigo-500'
                };
                return (
                  <div key={u.id} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0 transition-colors hover:bg-gray-50/40 dark:hover:bg-gray-800/10 rounded-2xl px-2 -mx-2">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${initialBg[u.role] ?? 'from-gray-400 to-gray-500'} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm`}>
                      {u.name[0]?.toUpperCase() ?? 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text)] truncate">{u.name}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{u.email}</p>
                    </div>
                    <span className={`badge ${roleBadge[u.role] ?? 'badge-neutral'} capitalize`}>
                      {u.role}
                    </span>
                  </div>
                );
              })
            ) : (
              [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 py-3.5 border-b border-[var(--border)]/60 last:border-0">
                  <div className="w-9 h-9 rounded-full skeleton flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-1/3 skeleton" />
                    <div className="h-2.5 w-1/2 skeleton" />
                  </div>
                  <div className="h-5 w-12 rounded-full skeleton" />
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent vendors */}
        <motion.div variants={cardVariants} className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-heading font-bold text-base text-[var(--text)]">Recently Onboarded Vendors</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">Businesses awaiting review or newly active</p>
            </div>
            <Link to="/admin/vendors" className="text-xs text-[var(--primary)] font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity">
              View all <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className="divide-y divide-[var(--border)]/60">
            {stats ? (
              (stats.recent_vendors ?? []).map((v) => {
                const statusBadge: Record<string, string> = {
                  approved: 'badge-accent',
                  pending_review: 'badge-warning animate-pulse',
                  rejected: 'badge-danger'
                };
                return (
                  <div key={v.id} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0 transition-colors hover:bg-gray-50/40 dark:hover:bg-gray-800/10 rounded-2xl px-2 -mx-2">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                      {v.business_name[0]?.toUpperCase() ?? 'V'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--text)] truncate">{v.business_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-[var(--text-muted)] truncate max-w-[150px] sm:max-w-none">{v.email}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                        <span className="text-[10px] font-bold text-[var(--primary)] bg-orange-50 dark:bg-orange-950/20 px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0">{v.subscription_plan}</span>
                      </div>
                    </div>
                    <span className={`badge ${statusBadge[v.status] ?? 'badge-neutral'}`}>
                      {v.status.replace('_', ' ')}
                    </span>
                  </div>
                );
              })
            ) : (
              [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 py-3.5 border-b border-[var(--border)]/60 last:border-0">
                  <div className="w-9 h-9 rounded-full skeleton flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-1/3 skeleton" />
                    <div className="h-2.5 w-1/2 skeleton" />
                  </div>
                  <div className="h-5 w-16 rounded-full skeleton" />
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Broadcast Section */}
      <motion.div variants={cardVariants} className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-sm mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-md">
            <Bell size={16} />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-[var(--text)]">Broadcast System Notification</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Send a real-time push broadcast to users</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Campaign Title</label>
            <input className="input" placeholder="Enter notification title..." value={broadcast.title}
              onChange={(e) => setBroadcast((b) => ({ ...b, title: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Target Audience</label>
            <select className="input" value={broadcast.target}
              onChange={(e) => setBroadcast((b) => ({ ...b, target: e.target.value }))}>
              <option value="all">All Registered Users</option>
              <option value="user">Consumers Only</option>
              <option value="vendor">Vendors Only</option>
              <option value="admin">Platform Admins Only</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5 justify-end">
            <button 
              onClick={handleBroadcast} 
              disabled={sending} 
              className="btn btn-primary w-full bg-gradient-to-r from-orange-500 to-[#FF6200] hover:from-orange-600 hover:to-[#E55800] text-white shadow-[0_4px_14px_rgba(255,98,0,0.3)] font-semibold transition-all duration-300"
            >
              {sending ? 'Processing...' : 'Dispatch Broadcast'}
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Message Content</label>
          <textarea className="input w-full resize-none min-h-[80px]" rows={3} placeholder="Compose message body. Keep it concise for better visibility..."
            value={broadcast.message}
            onChange={(e) => setBroadcast((b) => ({ ...b, message: e.target.value }))} />
        </div>
      </motion.div>

      {/* Quick Nav Section */}
      <h2 className="font-heading font-bold text-[var(--text)] text-base mb-4 flex items-center gap-2">
        <Store size={18} className="text-[var(--primary)]" /> Platform Management Tools
      </h2>
      <motion.div variants={containerVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { to: '/admin/users',           icon: Users,       label: 'User Directory',       gradient: 'from-blue-500 to-indigo-600' },
          { to: '/admin/vendors',         icon: Store,       label: 'Vendor Registry',      gradient: 'from-emerald-400 to-teal-600' },
          { to: '/admin/all-offers',      icon: Tag,         label: 'Offer Management',     gradient: 'from-amber-400 to-orange-500' },
          { to: '/admin/spotlight',       icon: Star,        label: 'Spotlight Content',    gradient: 'from-pink-400 to-rose-500' },
          { to: '/admin/vendor-requests', icon: Store,       label: 'Vendor Applications',  gradient: 'from-orange-400 to-red-500' },
          { to: '/admin/support-tickets', icon: LifeBuoy,    label: 'Help Desk Tickets',    gradient: 'from-sky-400 to-blue-500' },
          { to: '/admin/banner-ads',      icon: Image,       label: 'Billboard Banners',    gradient: 'from-violet-400 to-purple-600' },
          { to: '/admin/fraud',           icon: ShieldAlert, label: 'Risk & Fraud Center',  gradient: 'from-red-500 to-rose-600' },
        ].map(({ to, icon: Icon, label, gradient }) => (
          <MotionLink 
            key={to} 
            to={to} 
            variants={cardVariants}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-5 shadow-sm flex items-center gap-4 group"
            style={{ boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)' }}
            whileHover={{ 
              y: -5, 
              boxShadow: '0 15px 35px -10px rgba(255,98,0,0.12), 0 4px 12px -5px rgba(255,98,0,0.05)',
              borderColor: 'rgba(255,98,0,0.25)' 
            }}
          >
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br ${gradient} text-white shadow-md flex-shrink-0`}>
              <Icon size={18} />
            </div>
            <span className="font-bold text-sm text-[var(--text)] leading-snug group-hover:text-[var(--primary)] transition-colors duration-200">{label}</span>
          </MotionLink>
        ))}
      </motion.div>
    </motion.div>
  );
}
