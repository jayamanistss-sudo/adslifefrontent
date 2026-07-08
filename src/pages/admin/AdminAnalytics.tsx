import { useEffect, useState } from 'react';
import {
  Activity, Server, Users, ShieldAlert, AlertTriangle, Gauge, Bell, ShieldX,
  LogIn, UserCheck, Store, MapPin,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { api, endpoints } from '../../utils/api';
import BackButton from '../../components/BackButton';

// ─── Response shapes ────────────────────────────────────────────────────────
interface MonitoringOverview {
  total_requests: number;
  active_users: number;
  failed_logins: number;
  errors_4xx: number;
  errors_5xx: number;
  avg_response_ms: number;
  top_apis: { endpoint: string; count: string }[];
  top_ips: { ip_address: string; count: string }[];
  suspicious_count: number;
  unread_alerts: number;
  hourly_trend: { hr: string; count: string }[];
  recent_errors: { id: number; endpoint: string; method: string; status_code: number; error_message: string; created_at: string }[];
}

interface LoginsData {
  daily_logins: { d: string; cnt: string }[];
  login_success_count: number;
  login_failure_count: number;
  login_success_rate: number;
  active_users_7d: number;
  active_users_30d: number;
  top_active_users: { user_id: number; name: string; email: string; role: string; login_count: string }[];
}

interface VendorActivityData {
  vendor_signup_trend: { d: string; cnt: string }[];
  offers_posted_trend: { d: string; cnt: string }[];
  redemption_trend: { d: string; cnt: string }[];
  top_vendors: { vendor_id: number; business_name: string; subscription_plan: string; views: string; clicks: string; redemptions: string }[];
  vendors_by_plan: { plan: string; cnt: string }[];
  vendor_last_active: { vendor_id: number; business_name: string; last_login: string | null }[];
}

interface GeographyData {
  users_by_city: { city: string; cnt: string }[];
  vendors_by_city: { city: string; cnt: string }[];
  redemptions_by_city: { city: string; cnt: string }[];
  revenue_by_city: { city: string; total: string }[];
}

// ─── Small building blocks ──────────────────────────────────────────────────
function KpiTile({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="stat-value">{value}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mt-2">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--primary-light)]">
        <span className="text-[var(--primary)]">{icon}</span>
      </div>
      <div>
        <h2 className="font-heading font-bold text-lg text-[var(--text)]">{title}</h2>
        <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
      </div>
    </div>
  );
}

function fmtDay(d: string): string {
  // DATE columns serialize as plain "YYYY-MM-DD" — slice to "MM-DD".
  return d?.length >= 10 ? d.slice(5) : d;
}

function TrendCard({ title, data, dataKey, color, unit = '' }: {
  title: string; data: { d: string; cnt: string }[]; dataKey: string; color: string; unit?: string;
}) {
  const chartData = data.map((r) => ({ day: fmtDay(r.d), value: Number(r.cnt) }));
  const gradId = `grad-${dataKey}-${color.replace('#', '')}`;
  return (
    <div className="card p-5">
      <h3 className="font-heading font-semibold text-sm text-[var(--text)] mb-3">{title}</h3>
      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.6} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-secondary)', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-secondary)', fontWeight: 500 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              formatter={(v: any) => [`${v}${unit}`, title]}
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '1rem', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)', fontSize: '0.75rem', color: 'var(--text)' }}
            />
            <Area type="monotone" dataKey="value" stroke={color} fill={`url(#${gradId})`} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: color, strokeWidth: 2, fill: 'var(--surface)' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {chartData.every((d) => d.value === 0) && <p className="text-xs text-[var(--text-muted)] italic mt-1">No activity in this window yet</p>}
    </div>
  );
}

function RankedList({ title, rows, color, formatValue, emptyText = 'No data yet' }: {
  title: string; rows: { label: string; value: number; sub?: string }[]; color: string;
  formatValue?: (n: number) => string; emptyText?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const fmt = formatValue ?? ((n: number) => n.toLocaleString());
  return (
    <div className="card p-5">
      <h3 className="font-heading font-semibold text-sm text-[var(--text)] mb-3">{title}</h3>
      {rows.length === 0 && <p className="text-xs text-[var(--text-muted)] italic">{emptyText}</p>}
      <div className="space-y-2.5">
        {rows.map((r, i) => (
          <div key={i}>
            <div className="flex justify-between items-baseline gap-2 text-xs mb-1">
              <span className="text-[var(--text)] font-medium truncate">{r.label}{r.sub && <span className="text-[var(--text-muted)] font-normal"> · {r.sub}</span>}</span>
              <span className="text-[var(--text-muted)] font-semibold flex-shrink-0">{fmt(r.value)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default function AdminAnalytics() {
  const [overview, setOverview] = useState<MonitoringOverview | null>(null);
  const [logins, setLogins] = useState<LoginsData | null>(null);
  const [vendorActivity, setVendorActivity] = useState<VendorActivityData | null>(null);
  const [geography, setGeography] = useState<GeographyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(endpoints.adminMonitoringOverview),
      api.get(endpoints.adminAnalyticsLogins(30)),
      api.get(endpoints.adminAnalyticsVendorActivity(30)),
      api.get(endpoints.adminAnalyticsGeography(10)),
    ])
      .then(([o, l, v, g]) => {
        if (o.data.success) setOverview(o.data.data);
        if (l.data.success) setLogins(l.data.data);
        if (v.data.success) setVendorActivity(v.data.data);
        if (g.data.success) setGeography(g.data.data);
      })
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="max-w-7xl mx-auto pb-6 space-y-4">
      <BackButton to="/admin/dashboard" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-56 rounded-2xl" />)}
      </div>
    </div>
  );

  const hourlyTrafficData = (overview?.hourly_trend ?? []).map((r) => ({ d: `${r.hr}:00`, cnt: r.count }));

  return (
    <div className="max-w-7xl mx-auto pb-10 space-y-4">
      <BackButton to="/admin/dashboard" />

      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--primary-light)' }}>
            <Activity size={20} style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h1 className="page-title">Platform Analytics</h1>
            <p className="page-subtitle">Traffic, logins, vendor activity, and geography — last 30 days unless noted</p>
          </div>
        </div>
      </div>

      {/* ── Traffic & Logins (today) ─────────────────────────────────── */}
      <SectionHeader icon={<Server size={18} />} title="Traffic Today" subtitle="Live request, login, and error counters" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile icon={<Server size={20} />} label="Total Requests" value={(overview?.total_requests ?? 0).toLocaleString()} color="var(--info)" />
        <KpiTile icon={<Users size={20} />} label="Active Users Today" value={overview?.active_users ?? 0} color="var(--accent)" />
        <KpiTile icon={<ShieldX size={20} />} label="Failed Logins" value={overview?.failed_logins ?? 0} color="var(--danger)" />
        <KpiTile icon={<Gauge size={20} />} label="Avg Response (ms)" value={overview?.avg_response_ms ?? 0} color="var(--primary)" />
        <KpiTile icon={<AlertTriangle size={20} />} label="4xx Errors" value={overview?.errors_4xx ?? 0} color="var(--warning)" />
        <KpiTile icon={<ShieldAlert size={20} />} label="5xx Errors" value={overview?.errors_5xx ?? 0} color="var(--danger)" />
        <KpiTile icon={<Bell size={20} />} label="Unread Alerts" value={overview?.unread_alerts ?? 0} color="var(--warning)" />
        <KpiTile icon={<ShieldAlert size={20} />} label="Unresolved Security Events" value={overview?.suspicious_count ?? 0} color="var(--danger)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrendCard title="Hourly Traffic (today)" data={hourlyTrafficData} dataKey="requests" color="var(--info)" />
        <RankedList
          title="Top API Endpoints (today)"
          color="var(--info)"
          rows={(overview?.top_apis ?? []).map((r) => ({ label: r.endpoint, value: Number(r.count) }))}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankedList
          title="Top IPs (today)"
          color="var(--text-muted)"
          rows={(overview?.top_ips ?? []).map((r) => ({ label: r.ip_address, value: Number(r.count) }))}
        />
        <div className="card p-5">
          <h3 className="font-heading font-semibold text-sm text-[var(--text)] mb-3">Recent Errors</h3>
          {(overview?.recent_errors ?? []).length === 0 && <p className="text-xs text-[var(--text-muted)] italic">No recent errors</p>}
          <div className="space-y-2">
            {(overview?.recent_errors ?? []).map((e) => (
              <div key={e.id} className="flex items-start gap-2 text-xs border-b border-[var(--border)] last:border-0 pb-2 last:pb-0">
                <span className="font-mono font-bold text-[var(--danger)] flex-shrink-0">{e.status_code}</span>
                <span className="text-[var(--text-muted)] flex-shrink-0">{e.method}</span>
                <span className="text-[var(--text)] truncate flex-1">{e.endpoint}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Login & Session Activity ─────────────────────────────────── */}
      <SectionHeader icon={<LogIn size={18} />} title="Login Activity" subtitle="Who's signing in, how often, and how reliably" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile icon={<UserCheck size={20} />} label="Active Users (7d)" value={logins?.active_users_7d ?? 0} color="var(--accent)" />
        <KpiTile icon={<UserCheck size={20} />} label="Active Users (30d)" value={logins?.active_users_30d ?? 0} color="var(--accent)" />
        <KpiTile icon={<LogIn size={20} />} label="Successful Logins (30d)" value={logins?.login_success_count ?? 0} color="var(--accent)" />
        <KpiTile icon={<ShieldX size={20} />} label="Failed Logins (30d)" value={logins?.login_failure_count ?? 0} color="var(--danger)" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrendCard title="Daily Logins (30d)" data={logins?.daily_logins ?? []} dataKey="logins" color="var(--accent)" />
        <div className="card p-5 flex flex-col">
          <h3 className="font-heading font-semibold text-sm text-[var(--text)] mb-3">Login Success Rate</h3>
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <p className="stat-value" style={{ fontSize: '2.5rem' }}>{logins?.login_success_rate ?? 100}%</p>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} /> {logins?.login_success_count ?? 0} success</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--danger)' }} /> {logins?.login_failure_count ?? 0} failed</span>
            </div>
          </div>
        </div>
      </div>
      <RankedList
        title="Most Active Users (30d, by login count)"
        color="var(--accent)"
        rows={(logins?.top_active_users ?? []).map((u) => ({ label: u.name, sub: u.role, value: Number(u.login_count) }))}
      />

      {/* ── Vendor Activity ───────────────────────────────────────────── */}
      <SectionHeader icon={<Store size={18} />} title="Vendor Activity" subtitle="Growth, output, and engagement across vendors" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TrendCard title="Vendor Signups (30d)" data={vendorActivity?.vendor_signup_trend ?? []} dataKey="vendors" color="var(--primary)" />
        <TrendCard title="Offers Posted (30d)" data={vendorActivity?.offers_posted_trend ?? []} dataKey="offers" color="var(--info)" />
        <TrendCard title="Redemptions (30d)" data={vendorActivity?.redemption_trend ?? []} dataKey="redemptions" color="var(--accent)" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankedList
          title="Top Vendors (by redemptions)"
          color="var(--accent)"
          rows={(vendorActivity?.top_vendors ?? []).map((v) => ({ label: v.business_name, sub: v.subscription_plan, value: Number(v.redemptions) }))}
        />
        <RankedList
          title="Vendors by Plan"
          color="var(--primary)"
          rows={(vendorActivity?.vendors_by_plan ?? []).map((p) => ({ label: p.plan, value: Number(p.cnt) }))}
        />
      </div>
      <div className="card p-5">
        <h3 className="font-heading font-semibold text-sm text-[var(--text)] mb-3">Vendor Last Active</h3>
        {(vendorActivity?.vendor_last_active ?? []).length === 0 && <p className="text-xs text-[var(--text-muted)] italic">No vendors yet</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(vendorActivity?.vendor_last_active ?? []).map((v) => (
            <div key={v.vendor_id} className="flex items-center justify-between text-xs border-b border-[var(--border)] pb-1.5">
              <span className="text-[var(--text)] font-medium truncate">{v.business_name}</span>
              <span className="text-[var(--text-muted)] flex-shrink-0 ml-2">{v.last_login ? new Date(v.last_login).toLocaleDateString() : 'Never'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Geography ─────────────────────────────────────────────────── */}
      <SectionHeader icon={<MapPin size={18} />} title="Geography" subtitle="Grouped by city — the finest location data captured today" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankedList
          title="Users by City"
          color="var(--info)"
          rows={(geography?.users_by_city ?? []).map((c) => ({ label: c.city, value: Number(c.cnt) }))}
        />
        <RankedList
          title="Vendors by City"
          color="var(--primary)"
          rows={(geography?.vendors_by_city ?? []).map((c) => ({ label: c.city, value: Number(c.cnt) }))}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RankedList
          title="Redemptions by City"
          color="var(--accent)"
          rows={(geography?.redemptions_by_city ?? []).map((c) => ({ label: c.city, value: Number(c.cnt) }))}
        />
        <RankedList
          title="Revenue by City"
          color="var(--warning)"
          formatValue={(n) => `₹${n.toLocaleString()}`}
          rows={(geography?.revenue_by_city ?? []).map((c) => ({ label: c.city, value: Number(c.total) }))}
        />
      </div>
    </div>
  );
}
