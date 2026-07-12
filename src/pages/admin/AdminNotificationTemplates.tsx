/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Plus, Pencil, Trash2, X, Save, Sparkles, Database, CheckCircle } from 'lucide-react';
import BackButton from '../../components/BackButton';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';

// This CRUD API was fully built on the backend with zero admin UI — the
// only way to edit campaign copy was Postman or raw SQL. Also closes the
// AI-approval gap: generated templates now land here as inactive/pending
// instead of shipping straight to users.

const TYPES = [
  'morning', 'lunch', 'evening', 'dinner', 'goodnight', 'weekend',
  'reengage', 'personalized_search', 'interest_alert', 'expiry_reminder',
];

interface Template {
  id: number; type: string; title: string; body: string; route: string;
  language: string; is_ai_generated: boolean; is_active: boolean; created_at: string;
}

const empty = (): Partial<Template> => ({ type: TYPES[0], title: '', body: '', route: '/feed', language: 'ta' });

export default function AdminNotificationTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [editing, setEditing] = useState<Partial<Template> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(endpoints.notificationTemplates(filterType))
      .then((r) => {
        if (r.data.success) {
          setTemplates(r.data.data ?? []);
          setStats(r.data.stats ?? {});
        }
      })
      .catch(() => toast.error('Failed to load templates'))
      .finally(() => setLoading(false));
  }, [filterType]);

  useEffect(() => { load(); }, [load]);

  const pendingCount = templates.filter((t) => t.is_ai_generated && !t.is_active).length;

  const openNew = () => { setEditing(empty()); setIsNew(true); };
  const openEdit = (t: Template) => { setEditing({ ...t }); setIsNew(false); };
  const close = () => { setEditing(null); setIsNew(false); };

  const save = async () => {
    if (!editing?.title?.trim() || !editing?.body?.trim()) { toast.error('Title and body are required'); return; }
    setSaving(true);
    try {
      if (isNew) {
        await api.post(endpoints.notificationTemplateCreate, editing);
        toast.success('Template created');
      } else {
        await api.put(endpoints.notificationTemplateUpdate(editing.id!), editing);
        toast.success('Template updated');
      }
      close();
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const approve = async (t: Template) => {
    try {
      await api.put(endpoints.notificationTemplateUpdate(t.id), { is_active: true });
      toast.success('Approved — now live');
      load();
    } catch { toast.error('Failed'); }
  };

  const toggleActive = async (t: Template) => {
    try {
      await api.put(endpoints.notificationTemplateUpdate(t.id), { is_active: !t.is_active });
      load();
    } catch { toast.error('Failed'); }
  };

  const remove = async (t: Template) => {
    if (!window.confirm(`Delete this ${t.type} template?`)) return;
    try {
      await api.delete(endpoints.notificationTemplateDelete(t.id));
      toast.success('Deleted');
      load();
    } catch { toast.error('Failed'); }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      await api.post(endpoints.notificationTemplateGenerate, {});
      toast.success('AI generation triggered — new templates will appear below, inactive, pending your approval');
      setTimeout(load, 2000);
    } catch { toast.error('Generation failed'); }
    finally { setGenerating(false); }
  };

  const seed = async () => {
    setSeeding(true);
    try {
      const res = await api.post(endpoints.notificationTemplateSeed, {});
      if (!res.data.success) { toast.error(res.data.error ?? 'Seed failed'); return; }
      toast.success(`Seeded ${res.data.data?.inserted ?? 0} default template(s)`);
      load();
    } catch { toast.error('Seed failed'); }
    finally { setSeeding(false); }
  };

  return (
    <div className="pb-8">
      <BackButton to="/admin/dashboard" label="Admin Panel" />
      <div className="page-header mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
            <Bell size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="page-title">Notification Templates</h1>
            <p className="page-subtitle">{templates.length} templates{pendingCount ? ` — ${pendingCount} AI-generated pending your approval` : ''}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={seed} disabled={seeding} className="btn btn-secondary btn-sm">
            <Database size={14} /> {seeding ? 'Seeding…' : 'Seed Defaults'}
          </button>
          <button onClick={generate} disabled={generating} className="btn btn-secondary btn-sm">
            <Sparkles size={14} /> {generating ? 'Generating…' : 'Generate with AI'}
          </button>
          <button onClick={openNew} className="btn btn-primary btn-sm">
            <Plus size={14} /> New Template
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-[var(--surface-2)] p-1 rounded-xl border border-[var(--border)] mb-5 overflow-x-auto">
        <button
          onClick={() => setFilterType('')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${filterType === '' ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm border border-[var(--border)]' : 'text-[var(--text-secondary)]'}`}
        >
          All ({templates.length})
        </button>
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap capitalize ${filterType === t ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm border border-[var(--border)]' : 'text-[var(--text-secondary)]'}`}
          >
            {t.replace(/_/g, ' ')} ({stats[t] ?? 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-10 text-center text-[var(--text-muted)] text-sm">Loading…</div>
      ) : templates.length === 0 ? (
        <div className="card p-10 text-center text-[var(--text-muted)] text-sm">No templates found for this filter</div>
      ) : (
        <div className="space-y-2.5">
          {templates.map((t) => {
            const pending = t.is_ai_generated && !t.is_active;
            return (
              <div key={t.id} className={`card p-4 ${pending ? 'border-amber-300 dark:border-amber-800' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold bg-[var(--surface-2)] text-[var(--text-secondary)] px-2 py-0.5 rounded-full capitalize">{t.type.replace(/_/g, ' ')}</span>
                      {t.is_ai_generated && <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1"><Sparkles size={10} /> AI</span>}
                      {pending && <span className="text-xs font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-600 px-2 py-0.5 rounded-full">Pending Approval</span>}
                      {!pending && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.is_active ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' : 'bg-[var(--surface-2)] text-[var(--text-muted)]'}`}>
                          {t.is_active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-[var(--text)] text-sm">{t.title}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t.body}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {pending && (
                      <button onClick={() => approve(t)} title="Approve & activate" className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600">
                        <CheckCircle size={14} />
                      </button>
                    )}
                    {!pending && (
                      <button onClick={() => toggleActive(t)} title={t.is_active ? 'Deactivate' : 'Activate'} className="px-2 py-1 rounded-lg hover:bg-[var(--surface-2)] text-xs text-[var(--text-muted)]">
                        {t.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                    <button onClick={() => openEdit(t)} title="Edit" className="p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-secondary)]">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => remove(t)} title="Delete" className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && createPortal(
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h2 className="modal-title">{isNew ? 'New Template' : 'Edit Template'}</h2>
              <button onClick={close} className="modal-close"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="modal-label">Type</label>
                <select className="input" value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
                  {TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="modal-label">Title *</label>
                <input className="input" value={editing.title ?? ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <label className="modal-label">Body *</label>
                <textarea className="input h-24 resize-none" value={editing.body ?? ''} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
              </div>
              <div>
                <label className="modal-label">Route</label>
                <input className="input" value={editing.route ?? '/feed'} onChange={(e) => setEditing({ ...editing, route: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={close} className="btn btn-secondary flex-1">Cancel</button>
              <button onClick={save} disabled={saving} className="btn btn-primary flex-1">
                <Save size={16} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
