/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, Search, Download, CheckCircle, Ban, KeyRound,
  Activity, Bug, Bell,
} from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';
import { Pagination } from '../../components';

// The backend monitoring module (13 endpoints: logs, security events, alerts,
// IP blocking, CSV export) was fully built with zero admin UI before this —
// only the aggregate overview was wired anywhere. This page surfaces the rest.

type TabKey = 'auth-logs' | 'activity-logs' | 'error-logs' | 'security-events' | 'alerts' | 'blocked-ips';

const TABS: { key: TabKey; label: string; icon: any; exportType?: string }[] = [
  { key: 'auth-logs', label: 'Auth Logs', icon: KeyRound, exportType: 'auth_logs' },
  { key: 'activity-logs', label: 'Activity Logs', icon: Activity, exportType: 'activity_logs' },
  { key: 'error-logs', label: 'Error Logs', icon: Bug, exportType: 'error_logs' },
  { key: 'security-events', label: 'Security Events', icon: ShieldCheck, exportType: 'security_events' },
  { key: 'alerts', label: 'Alerts', icon: Bell },
  { key: 'blocked-ips', label: 'Blocked IPs', icon: Ban },
];

function timeAgo(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function AdminSecurityLogs() {
  const [tab, setTab] = useState<TabKey>('auth-logs');
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [limit] = useState(30);
  const [newIp, setNewIp] = useState('');
  const [newReason, setNewReason] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const page = Math.floor(offset / limit) + 1;
    const req = tab === 'blocked-ips'
      ? api.get(endpoints.adminMonitoringBlockedIps)
      : tab === 'alerts'
        ? api.get(endpoints.adminMonitoringAlerts(page, limit))
        : api.get(endpoints.adminMonitoringLogs(tab, page, limit, search));
    req.then((r) => {
      if (!r.data.success) return;
      if (tab === 'blocked-ips') {
        setRows(r.data.data);
        setTotal(r.data.data.length);
      } else {
        setRows(r.data.data.data ?? r.data.data);
        setTotal(r.data.data.total ?? r.data.data.length);
      }
    }).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
  }, [tab, search, offset, limit]);

  useEffect(() => { setOffset(0); setSearch(''); }, [tab]);
  useEffect(() => { load(); }, [load]);

  const resolveEvent = async (id: number) => {
    try {
      await api.post(endpoints.adminMonitoringSecurityEventResolve(id), {});
      toast.success('Marked resolved');
      load();
    } catch { toast.error('Failed'); }
  };

  const markAlertRead = async (id: number) => {
    try {
      await api.put(endpoints.adminMonitoringAlertRead(id), {});
      toast.success('Marked read');
      load();
    } catch { toast.error('Failed'); }
  };

  const unblockIp = async (ip: string) => {
    if (!window.confirm(`Unblock ${ip}?`)) return;
    try {
      await api.delete(endpoints.adminMonitoringUnblockIp(ip));
      toast.success('Unblocked');
      load();
    } catch { toast.error('Failed'); }
  };

  const blockIp = async () => {
    if (!newIp.trim() || !newReason.trim()) { toast.error('IP and reason are required'); return; }
    try {
      await api.post(endpoints.adminMonitoringBlockIp, { ip_address: newIp.trim(), reason: newReason.trim() });
      toast.success('IP blocked');
      setNewIp(''); setNewReason('');
      load();
    } catch { toast.error('Failed to block IP'); }
  };

  const exportCsv = async () => {
    const t = TABS.find((x) => x.key === tab)?.exportType;
    if (!t) return;
    try {
      const res = await api.get(endpoints.adminMonitoringExport(t), { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${t}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
  };

  const currentTab = TABS.find((t) => t.key === tab)!;

  return (
    <div className="pb-8">
      <BackButton to="/admin/dashboard" label="Admin Panel" />
      <div className="page-header mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
            <ShieldCheck size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="page-title">Security &amp; Logs</h1>
            <p className="page-subtitle">Auth, activity, errors, security events, alerts, and IP blocking</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-[var(--surface-2)] p-1 rounded-xl border border-[var(--border)] mb-5 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              tab === t.key
                ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm border border-[var(--border)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text)] border border-transparent'
            }`}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'blocked-ips' && (
        <div className="card p-4 mb-5">
          <p className="text-xs font-semibold text-[var(--text)] mb-2">Block a new IP</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input className="input flex-1" placeholder="IP address (e.g. 203.0.113.5)" value={newIp} onChange={(e) => setNewIp(e.target.value)} />
            <input className="input flex-1" placeholder="Reason" value={newReason} onChange={(e) => setNewReason(e.target.value)} />
            <button onClick={blockIp} className="btn btn-primary whitespace-nowrap">Block IP</button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        {tab !== 'blocked-ips' && tab !== 'alerts' && (
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              className="input pl-8 w-full"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {currentTab.exportType && (
            <button onClick={exportCsv} className="btn btn-secondary btn-sm">
              <Download size={13} /> Export CSV
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-[var(--text-muted)] text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-[var(--text-muted)] text-sm">No records found</div>
        ) : (
          <div className="overflow-x-auto overflow-y-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[var(--surface-2)] text-[var(--text-muted)]">
                  {tab === 'auth-logs' && <>
                    <th className="text-left px-4 py-2.5 font-semibold">Action</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Email</th>
                    <th className="text-left px-4 py-2.5 font-semibold">IP</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Failure Reason</th>
                    <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">When</th>
                  </>}
                  {tab === 'activity-logs' && <>
                    <th className="text-left px-4 py-2.5 font-semibold">Action</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Role</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Entity</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Description</th>
                    <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">When</th>
                  </>}
                  {tab === 'error-logs' && <>
                    <th className="text-left px-4 py-2.5 font-semibold">Type</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Endpoint</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Message</th>
                    <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">When</th>
                  </>}
                  {tab === 'security-events' && <>
                    <th className="text-left px-4 py-2.5 font-semibold">Type</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Severity</th>
                    <th className="text-left px-4 py-2.5 font-semibold">IP</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Description</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                    <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">When</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Action</th>
                  </>}
                  {tab === 'alerts' && <>
                    <th className="text-left px-4 py-2.5 font-semibold">Severity</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Title</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Message</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                    <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">When</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Action</th>
                  </>}
                  {tab === 'blocked-ips' && <>
                    <th className="text-left px-4 py-2.5 font-semibold">IP</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Reason</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Blocked By</th>
                    <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Expires</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Action</th>
                  </>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.map((r: any) => (
                  <tr key={r.id} className="hover:bg-[var(--surface-2)] transition-colors">
                    {tab === 'auth-logs' && <>
                      <td className="px-4 py-2.5 capitalize">{r.action?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2.5">{r.email ?? '—'}</td>
                      <td className="px-4 py-2.5 font-mono">{r.ip_address}</td>
                      <td className="px-4 py-2.5 text-[var(--text-muted)]">{r.failure_reason ?? '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[var(--text-muted)]">{timeAgo(r.created_at)}</td>
                    </>}
                    {tab === 'activity-logs' && <>
                      <td className="px-4 py-2.5">{r.action}</td>
                      <td className="px-4 py-2.5 capitalize">{r.role}</td>
                      <td className="px-4 py-2.5">{r.entity_type ? `${r.entity_type} #${r.entity_id}` : '—'}</td>
                      <td className="px-4 py-2.5 text-[var(--text-muted)] max-w-xs truncate" title={r.description}>{r.description ?? '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[var(--text-muted)]">{timeAgo(r.created_at)}</td>
                    </>}
                    {tab === 'error-logs' && <>
                      <td className="px-4 py-2.5">{r.error_type}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px]">{r.method} {r.endpoint}</td>
                      <td className="px-4 py-2.5"><span className="text-red-500 font-semibold">{r.status_code ?? '—'}</span></td>
                      <td className="px-4 py-2.5 text-[var(--text-muted)] max-w-xs truncate" title={r.error_message}>{r.error_message}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[var(--text-muted)]">{timeAgo(r.created_at)}</td>
                    </>}
                    {tab === 'security-events' && <>
                      <td className="px-4 py-2.5">{r.event_type}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                          r.severity === 'critical' || r.severity === 'high' ? 'bg-red-50 dark:bg-red-950/30 text-red-500' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600'
                        }`}>{r.severity}</span>
                      </td>
                      <td className="px-4 py-2.5 font-mono">{r.ip_address}</td>
                      <td className="px-4 py-2.5 text-[var(--text-muted)] max-w-xs truncate" title={r.description}>{r.description}</td>
                      <td className="px-4 py-2.5">
                        {r.is_resolved ? <span className="text-emerald-600 text-xs font-semibold">Resolved</span> : <span className="text-amber-600 text-xs font-semibold">Open</span>}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[var(--text-muted)]">{timeAgo(r.created_at)}</td>
                      <td className="px-4 py-2.5 text-right">
                        {!r.is_resolved && (
                          <button onClick={() => resolveEvent(r.id)} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600" title="Mark resolved">
                            <CheckCircle size={14} />
                          </button>
                        )}
                      </td>
                    </>}
                    {tab === 'alerts' && <>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                          r.severity === 'critical' || r.severity === 'error' ? 'bg-red-50 dark:bg-red-950/30 text-red-500' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600'
                        }`}>{r.severity}</span>
                      </td>
                      <td className="px-4 py-2.5 font-medium">{r.title}</td>
                      <td className="px-4 py-2.5 text-[var(--text-muted)] max-w-xs truncate" title={r.message}>{r.message}</td>
                      <td className="px-4 py-2.5">
                        {r.is_read ? <span className="text-[var(--text-muted)] text-xs">Read</span> : <span className="text-primary text-xs font-semibold">Unread</span>}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[var(--text-muted)]">{timeAgo(r.created_at)}</td>
                      <td className="px-4 py-2.5 text-right">
                        {!r.is_read && (
                          <button onClick={() => markAlertRead(r.id)} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)]" title="Mark read">
                            <CheckCircle size={14} />
                          </button>
                        )}
                      </td>
                    </>}
                    {tab === 'blocked-ips' && <>
                      <td className="px-4 py-2.5 font-mono">{r.ip_address}</td>
                      <td className="px-4 py-2.5 text-[var(--text-muted)]">{r.reason ?? '—'}</td>
                      <td className="px-4 py-2.5">{r.blocked_by_name ?? '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-[var(--text-muted)]">{r.expires_at ? timeAgo(r.expires_at) : 'Never'}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => unblockIp(r.ip_address)} className="px-2.5 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 text-xs font-semibold" title="Unblock">
                          Unblock
                        </button>
                      </td>
                    </>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {tab !== 'blocked-ips' && (
        <div className="flex justify-end mt-4">
          <Pagination
            page={Math.floor(offset / limit) + 1}
            totalPages={Math.ceil(total / limit) || 1}
            currentPageSize={limit}
            pageSizeOptions={[{ value: '30', label: '30' }]}
            onPageChange={(p) => setOffset((p - 1) * limit)}
            onPageSizeChanged={() => {}}
          />
        </div>
      )}
    </div>
  );
}
