import { useState, useEffect } from 'react';
import { LifeBuoy, Plus, MessageSquare } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';

interface Ticket {
  id: number; subject: string; description: string; category: string;
  priority: string; status: string; admin_reply: string | null;
  replied_at: string | null; created_at: string;
}

const PRIORITY_STYLE: Record<string, string> = {
  low: 'badge-neutral', medium: 'badge-warning', high: 'badge-danger', urgent: 'badge-danger',
};
const STATUS_STYLE: Record<string, string> = {
  open: 'badge-warning', in_progress: 'badge-primary', resolved: 'badge-accent', closed: 'badge-neutral',
};

export default function SupportTickets() {
  const [tickets, setTickets]   = useState<Ticket[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    subject: '', description: '', category: 'other', priority: 'medium',
  });

  const load = () => {
    setLoading(true);
    api.get(endpoints.supportList()).then((r) => {
      if (r.data.success) setTickets(r.data.data);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!form.subject || !form.description) return;
    setSubmitting(true);
    try {
      const res = await api.post(endpoints.supportCreate, form);
      if (res.data.success) {
        toast.success('Support ticket created!');
        setShowForm(false);
        setForm({ subject: '', description: '', category: 'other', priority: 'medium' });
        load();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xxl pb-6">
      <BackButton to="/vendor/dashboard" />

      <div className="page-header">
        <div>
          <h1 className="page-title">Support Tickets</h1>
          <p className="page-subtitle">Get help from our support team</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">
          <Plus size={14} /> New Ticket
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-5 mb-6 animate-slide-up">
          <h3 className="font-heading font-semibold text-[var(--text)] mb-4">Raise Support Ticket</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="st-subject" className="block text-sm font-medium text-[var(--text)] mb-1.5">Subject *</label>
              <input id="st-subject" className="input" placeholder="Briefly describe your issue" required
                value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="st-category" className="block text-sm font-medium text-[var(--text)] mb-1.5">Category</label>
                <select id="st-category" className="input"
                  value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  <option value="technical">Technical</option>
                  <option value="billing">Billing</option>
                  <option value="account">Account</option>
                  <option value="offer">Offer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="st-priority" className="block text-sm font-medium text-[var(--text)] mb-1.5">Priority</label>
                <select id="st-priority" className="input"
                  value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="st-desc" className="block text-sm font-medium text-[var(--text)] mb-1.5">Description *</label>
              <textarea id="st-desc" className="input h-28 resize-none" required
                placeholder="Describe your issue in detail..."
                value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={submitting} className="btn btn-primary">
                {submitting ? 'Submitting…' : 'Submit Ticket'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Ticket list */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : tickets.length === 0 ? (
        <div className="card p-10 text-center">
          <LifeBuoy size={36} className="mx-auto text-[var(--text-muted)] mb-3" />
          <p className="font-heading font-semibold text-[var(--text-secondary)]">No tickets yet</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Create a ticket if you need assistance</p>
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
                  <LifeBuoy size={16} className="text-[var(--text-secondary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-heading font-semibold text-[var(--text)] text-sm">#{t.id} {t.subject}</span>
                    <span className={`badge ${STATUS_STYLE[t.status] ?? 'badge-neutral'}`}>{t.status.replace('_', ' ')}</span>
                    <span className={`badge ${PRIORITY_STYLE[t.priority] ?? 'badge-neutral'}`}>{t.priority}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t.category} · {new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                {t.admin_reply && (
                  <span className="badge badge-accent flex-shrink-0"><MessageSquare size={10} /> Reply</span>
                )}
              </button>

              {expanded === t.id && (
                <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 space-y-3">
                  <p className="text-sm text-[var(--text-secondary)]">{t.description}</p>
                  {t.admin_reply && (
                    <div className="bg-[var(--primary-light)] rounded-xl p-3">
                      <p className="text-xs font-semibold text-[var(--primary)] mb-1">Admin Reply</p>
                      <p className="text-sm text-[var(--text)]">{t.admin_reply}</p>
                      {t.replied_at && (
                        <p className="text-xs text-[var(--text-muted)] mt-1">{new Date(t.replied_at).toLocaleString()}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
