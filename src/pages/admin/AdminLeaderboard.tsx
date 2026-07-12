/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { Trophy, Ban, RotateCcw } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';

// No admin surface existed for the leaderboard at all — no way to moderate
// a user gaming the ranking. The one existing admin endpoint ("rebuild")
// wrote into a table nothing reads, using a different formula than the
// live leaderboard — removed as part of this fix, replaced with real
// exclude/include moderation on the live ranking itself.

interface Row {
  user_id: number; name: string; city: string;
  total_saves: number; total_redemptions: number; score: number; rank: number;
}

export default function AdminLeaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'all'>('monthly');
  const [loading, setLoading] = useState(true);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());

  const load = useCallback(() => {
    setLoading(true);
    api.get(endpoints.leaderboard('', period))
      .then((r) => { if (r.data.success) setRows(r.data.data ?? []); })
      .catch(() => toast.error('Failed to load leaderboard'))
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const exclude = async (userId: number) => {
    if (!window.confirm(`Exclude user #${userId} from the leaderboard? They'll no longer rank or appear publicly.`)) return;
    try {
      await api.put(endpoints.adminLeaderboardExclude(userId), {});
      setExcluded((s) => new Set(s).add(userId));
      toast.success('Excluded — refreshing…');
      load();
    } catch { toast.error('Failed'); }
  };

  const include = async (userId: number) => {
    try {
      await api.put(endpoints.adminLeaderboardInclude(userId), {});
      toast.success('Re-included');
      load();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="pb-8">
      <BackButton to="/admin/dashboard" label="Admin Panel" />
      <div className="page-header mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
            <Trophy size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="page-title">Leaderboard Moderation</h1>
            <p className="page-subtitle">Exclude a user gaming the ranking — reward amounts live in Site Settings</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-[var(--surface-2)] p-1 rounded-xl border border-[var(--border)] mb-5 w-fit">
        {(['weekly', 'monthly', 'all'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              period === p ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm border border-[var(--border)]' : 'text-[var(--text-secondary)]'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-[var(--text-muted)] text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-[var(--text-muted)] text-sm">No ranked users for this period</div>
        ) : (
          <div className="overflow-x-auto overflow-y-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[var(--surface-2)] text-[var(--text-muted)]">
                  <th className="text-left px-4 py-2.5 font-semibold">Rank</th>
                  <th className="text-left px-4 py-2.5 font-semibold">User</th>
                  <th className="text-left px-4 py-2.5 font-semibold">City</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Saves</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Redemptions</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Score</th>
                  <th className="text-right px-4 py-2.5 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rows.map((r) => (
                  <tr key={r.user_id} className="hover:bg-[var(--surface-2)] transition-colors">
                    <td className="px-4 py-2.5 font-mono">#{r.rank}</td>
                    <td className="px-4 py-2.5 font-medium">{r.name}</td>
                    <td className="px-4 py-2.5 text-[var(--text-muted)]">{r.city || '—'}</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-muted)]">{r.total_saves}</td>
                    <td className="px-4 py-2.5 text-right text-[var(--text-muted)]">{r.total_redemptions}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-primary">{r.score}</td>
                    <td className="px-4 py-2.5 text-right">
                      {excluded.has(r.user_id) ? (
                        <button onClick={() => include(r.user_id)} className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600" title="Re-include">
                          <RotateCcw size={14} />
                        </button>
                      ) : (
                        <button onClick={() => exclude(r.user_id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500" title="Exclude from leaderboard">
                          <Ban size={14} />
                        </button>
                      )}
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
