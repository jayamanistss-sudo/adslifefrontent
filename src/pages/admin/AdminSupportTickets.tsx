import { useState, useEffect } from 'react';
import { LifeBuoy, MessageSquare } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';

interface Ticket {
  id: number; user_name: string; user_email: string; subject: string;
  message: string; category: string; priority: string; status: string;
  admin_reply: string | null; created_at: string;
}

// Matches the backend TicketStatus enum exactly (open/answered/closed) —
// the dropdown previously offered in_progress/resolved, neither of which
// the backend accepted, so a chosen status silently never persisted.
const STATUS_STYLE: Record<string, string> = {
  open: 'badge-warning', answered: 'badge-primary', closed: 'badge-neutral',
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
  const [replyMap, setReplyMap] = useState<Record<number, { text: string; status: string; priority: string }>>({});

  const load = () => {
    setLoading(true);
    api.get(endpoints.supportList(filter || undefined)).then((r) => {
      if (r.data.success) setTickets(r.data.data);
    }).finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  // Live-refresh whenever a support ticket changes locally via PowerSync
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [filter]);

  const handleReply = async (ticketId: number) => {
    const { text, status, priority } = replyMap[ticketId] ?? { text: '', status: 'answered', priority: undefined };
    if (!text.trim()) { toast.error('Reply cannot be empty'); return; }
    setReplying(ticketId);
    try {
      const res = await api.post(endpoints.supportReply(ticketId), { message: text, status, priority });
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
          { v: '',         l: 'All' },
          { v: 'open',     l: 'Open' },
          { v: 'answered', l: 'Answered' },
          { v: 'closed',   l: 'Closed' },
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
                  <p className="text-sm text-[var(--text-secondary)]">{t.message}</p>

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
                      onChange={(e) => setReplyMap((m) => ({ ...m, [t.id]: { ...(m[t.id] ?? { status: 'answered', priority: t.priority }), text: e.target.value } }))}
                    />
                    <div className="flex items-center gap-3">
                      <select
                        className="input w-36"
                        value={replyMap[t.id]?.status ?? 'answered'}
                        onChange={(e) => setReplyMap((m) => ({ ...m, [t.id]: { ...(m[t.id] ?? { text: '', priority: t.priority }), status: e.target.value } }))}
                      >
                        <option value="open">Open</option>
                        <option value="answered">Answered</option>
                        <option value="closed">Closed</option>
                      </select>
                      <select
                        className="input w-32"
                        value={replyMap[t.id]?.priority ?? t.priority ?? 'medium'}
                        onChange={(e) => setReplyMap((m) => ({ ...m, [t.id]: { ...(m[t.id] ?? { text: '', status: 'answered' }), priority: e.target.value } }))}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
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
