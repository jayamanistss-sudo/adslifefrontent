import { useState, useEffect } from 'react';
import { LifeBuoy, MessageSquare } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import { db } from '../../powersync/database';
import toast from 'react-hot-toast';

interface Ticket {
  id: number; user_name: string; user_email: string; subject: string;
  description: string; category: string; priority: string; status: string;
  admin_reply: string | null; created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  open: 'badge-warning', in_progress: 'badge-primary', resolved: 'badge-accent', closed: 'badge-neutral',
};
const PRIORITY_STYLE: Record<string, string> = {
  low: 'badge-neutral', medium: 'badge-warning', high: 'badge-danger', urgent: 'badge-danger',
};

export default function AdminSupportTickets() {
  const [tickets, setTickets]   = useState<Ticket[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [replying, setReplying] = useState<number | null>(null);
  const [replyMap, setReplyMap] = useState<Record<number, { text: string; status: string }>>({});

  const load = () => {
    setLoading(true);
    api.get(endpoints.supportList(filter || undefined)).then((r) => {
      if (r.data.success) setTickets(r.data.data);
    }).finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  // Live-refresh whenever a support ticket changes locally via PowerSync
  useEffect(() => {
    const unsubscribe = db.onChange(
      { onChange: () => load() },
      { tables: ['support_tickets'], throttleMs: 1000 },
    );
    return unsubscribe;
  }, [filter]);

  const handleReply = async (ticketId: number) => {
    const { text } = replyMap[ticketId] ?? { text: '' };
    if (!text.trim()) { toast.error('Reply cannot be empty'); return; }
    setReplying(ticketId);
    try {
      const res = await api.post(endpoints.supportReply(ticketId), { message: text });
      if (res.data.success) {
        toast.success('Reply sent!');
        load();
        setExpanded(null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to send reply');
    } finally {
      setReplying(null);
    }
  };

  return (
    <div className="max-w-4xxl pb-6">
      <BackButton to="/admin/dashboard" />

      <div className="page-header">
        <div>
          <h1 className="page-title">Support Tickets</h1>
          <p className="page-subtitle">Respond to vendor and user support requests</p>
        </div>
        <span className="badge badge-warning">
          {tickets.filter((t) => t.status === 'open').length} open
        </span>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[
          { v: '',            l: 'All' },
          { v: 'open',        l: 'Open' },
          { v: 'in_progress', l: 'In Progress' },
          { v: 'resolved',    l: 'Resolved' },
          { v: 'closed',      l: 'Closed' },
        ].map(({ v, l }) => (
          <button key={v} onClick={() => setFilter(v)} className={`filter-tab ${filter === v ? 'active' : ''}`}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : tickets.length === 0 ? (
        <div className="card p-10 text-center">
          <LifeBuoy size={36} className="mx-auto text-[var(--text-muted)] mb-3" />
          <p className="font-heading font-semibold text-[var(--text-secondary)]">No tickets found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="card overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                className="w-full flex items-start gap-4 p-4 text-left hover:bg-[var(--surface-2)] transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <LifeBuoy size={15} className="text-[var(--text-secondary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-heading font-semibold text-[var(--text)] text-sm">#{t.id} {t.subject}</span>
                    <span className={`badge ${STATUS_STYLE[t.status] ?? 'badge-neutral'}`}>{t.status.replace('_', ' ')}</span>
                    <span className={`badge ${PRIORITY_STYLE[t.priority] ?? 'badge-neutral'}`}>{t.priority}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {t.user_name} · {t.user_email} · {t.category} · {new Date(t.created_at).toLocaleDateString()}
                  </p>
                </div>
                {t.admin_reply && <span className="badge badge-accent flex-shrink-0"><MessageSquare size={10} /> Replied</span>}
              </button>

              {expanded === t.id && (
                <div className="border-t border-[var(--border)] p-4 space-y-4">
                  <p className="text-sm text-[var(--text-secondary)]">{t.description}</p>

                  {t.admin_reply && (
                    <div className="bg-[var(--primary-light)] rounded-xl p-3">
                      <p className="text-xs font-semibold text-[var(--primary)] mb-1">Previous Reply</p>
                      <p className="text-sm text-[var(--text)]">{t.admin_reply}</p>
                    </div>
                  )}

                  {/* Reply form */}
                  <div className="space-y-3">
                    <textarea
                      className="input h-24 resize-none text-sm"
                      placeholder="Type your reply…"
                      value={replyMap[t.id]?.text ?? ''}
                      onChange={(e) => setReplyMap((m) => ({ ...m, [t.id]: { ...(m[t.id] ?? { status: 'in_progress' }), text: e.target.value } }))}
                    />
                    <div className="flex items-center gap-3">
                      <select
                        className="input w-40"
                        value={replyMap[t.id]?.status ?? 'in_progress'}
                        onChange={(e) => setReplyMap((m) => ({ ...m, [t.id]: { ...(m[t.id] ?? { text: '' }), status: e.target.value } }))}
                      >
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                      <button
                        onClick={() => handleReply(t.id)}
                        disabled={replying === t.id}
                        className="btn btn-primary btn-sm"
                      >
                        {replying === t.id ? 'Sending…' : 'Send Reply'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
