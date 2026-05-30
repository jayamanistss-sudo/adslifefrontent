import { useState, useEffect, useCallback } from 'react';
import { Search, Ban, CheckCircle, Shield, User, Store, Trash2 } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';

interface UserRow {
  id: number; name: string; email: string; role: string; city: string;
  streak_days: number; is_active: number;
  created_at: string; last_login: string | null; login_count: number;
  interactions: number; follows: number;
}

const ROLES = ['', 'user', 'vendor', 'admin'];
const STATUSES = ['', 'active', 'banned'];

export default function AdminUsers() {
  const [users, setUsers]     = useState<UserRow[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [role, setRole]       = useState('');
  const [status, setStatus]   = useState('');
  const [offset, setOffset]   = useState(0);
  const LIMIT = 30;

  const load = useCallback(() => {
    setLoading(true);
    api.get(endpoints.adminUsers(search, role, status, LIMIT, offset))
      .then((r) => {
        if (r.data.success) { setUsers(r.data.data.users); setTotal(r.data.data.total); }
      }).finally(() => setLoading(false));
  }, [search, role, status, offset]);

  useEffect(() => { setOffset(0); }, [search, role, status]);
  useEffect(() => { load(); }, [load]);

  const action = async (userId: number, act: string, extra?: Record<string, string>) => {
    try {
      const res = await api.put(endpoints.adminUserAction(userId), { action: act, ...extra });
      toast.success(res.data.message);
      load();
    } catch { toast.error('Action failed'); }
  };

  const roleIcon = (r: string) => r === 'admin' ? <Shield size={12} /> : r === 'vendor' ? <Store size={12} /> : <User size={12} />;
  const roleColor = (r: string) => r === 'admin' ? 'bg-red-50 text-red-600' : r === 'vendor' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600';

  return (
    <div className="pb-8">
      <BackButton to="/admin/dashboard" label="Admin Panel" />
      <div className="page-header mb-5">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">{total.toLocaleString()} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8 w-full" placeholder="Search name, email, city…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-32" value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => <option key={r} value={r}>{r || 'All roles'}</option>)}
        </select>
        <select className="input w-32" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s || 'All status'}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-gray-50/50">
                {['User', 'Role', 'City', 'Interactions', 'Logins', 'Joined', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-[var(--text-muted)] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border)]">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="py-3 px-4"><div className="skeleton h-4 w-20 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : users.map((u) => (
                <tr key={u.id} className={`border-b border-[var(--border)] hover:bg-gray-50/50 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                        {u.name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--text)] truncate max-w-32">{u.name}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate max-w-32">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${roleColor(u.role)}`}>
                      {roleIcon(u.role)} {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[var(--text-muted)] capitalize">{u.city || '–'}</td>
                  <td className="py-3 px-4 text-[var(--text-muted)]">{u.interactions}</td>
                  <td className="py-3 px-4 text-[var(--text-muted)]">{u.login_count}</td>
                  <td className="py-3 px-4 text-[var(--text-muted)] whitespace-nowrap">{u.created_at.slice(0, 10)}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                      {u.is_active ? 'Active' : 'Banned'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      {u.is_active
                        ? <button onClick={() => action(u.id, 'ban')} title="Ban" className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"><Ban size={14} /></button>
                        : <button onClick={() => action(u.id, 'unban')} title="Unban" className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"><CheckCircle size={14} /></button>
                      }
                      <select
                        className="text-xs border border-[var(--border)] rounded-lg px-1.5 py-1 bg-[var(--surface)] text-[var(--text)] cursor-pointer"
                        value={u.role}
                        onChange={(e) => action(u.id, 'update_role', { role: e.target.value })}
                      >
                        <option value="user">user</option>
                        <option value="vendor">vendor</option>
                        <option value="admin">admin</option>
                      </select>
                      <button onClick={() => { if (window.confirm(`Delete ${u.name}?`)) action(u.id, 'delete'); }}
                        title="Delete" className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
            <span className="text-xs text-[var(--text-muted)]">Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}</span>
            <div className="flex gap-2">
              <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                className="btn btn-secondary btn-sm" >Prev</button>
              <button disabled={offset + LIMIT >= total} onClick={() => setOffset(offset + LIMIT)}
                className="btn btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
