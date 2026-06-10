import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Pencil, Trash2, Save, X, ChevronDown } from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';
import CategoryIcon from '../../components/CategoryIcon';
import BackButton from '../../components/BackButton';

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  sort_order: number;
  is_active: number;
}

const empty = (): Partial<Category> => ({ name: '', icon: '🏷️', sort_order: 0, is_active: 1 });

export default function AdminCategories() {
  const [categories, setCategories]   = useState<Category[]>([]);
  const [loading, setLoading]         = useState(true);
  const [editing, setEditing]         = useState<Partial<Category> | null>(null);
  const [isNew, setIsNew]             = useState(false);
  const [saving, setSaving]           = useState(false);
  const [deleteId, setDeleteId]       = useState<number | null>(null);
  const [iconDropdownOpen, setIconDropdownOpen] = useState(false);
  const iconDropdownRef               = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get(endpoints.categoriesList(false));
      setCategories(r.data.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (iconDropdownRef.current && !iconDropdownRef.current.contains(e.target as Node)) {
        setIconDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openNew = () => { setEditing(empty()); setIsNew(true); setIconDropdownOpen(false); };
  const openEdit = (cat: Category) => { setEditing({ ...cat }); setIsNew(false); setIconDropdownOpen(false); };
  const closeEdit = () => { setEditing(null); setIsNew(false); setIconDropdownOpen(false); };

  const save = async () => {
    if (!editing?.name?.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      if (isNew) {
        await api.post(endpoints.categoriesCreate, editing);
        toast.success('Category created');
      } else {
        await api.put(endpoints.categoriesUpdate(editing.id!), editing);
        toast.success('Category updated');
      }
      closeEdit();
      load();
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (cat: Category) => {
    try {
      await api.put(endpoints.categoriesUpdate(cat.id), { ...cat, is_active: cat.is_active ? 0 : 1 });
      load();
    } catch {
      toast.error('Failed to update');
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(endpoints.categoriesDelete(deleteId));
      toast.success('Deleted');
      setDeleteId(null);
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="pb-8">
      <BackButton to="/admin/dashboard" label="Admin Panel" />
      
      {/* Header */}
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">
            Manage categories shown in Browse &amp; offer forms
          </p>
        </div>
        <button
          onClick={openNew}
          className="btn btn-primary"
        >
          <Plus size={16} /> Add Category
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
          </div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-secondary)]">No categories yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/40 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="px-6 py-4">Icon</th>
                  <th className="px-6 py-4">Category Details</th>
                  <th className="px-6 py-4">Sort Order</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-sm">
                {categories.map((cat) => (
                  <tr
                    key={cat.id}
                    className={`group transition-colors duration-150 hover:bg-[var(--surface-2)]/30 ${
                      !cat.is_active && "opacity-75 bg-[var(--surface-2)]/10"
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-10 h-10 rounded-xl bg-[var(--primary-light)] dark:bg-primary/10 flex items-center justify-center text-[var(--primary)] border border-[var(--primary)]/10">
                        <CategoryIcon name={cat.icon} size={20} />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col leading-tight">
                        <span className="font-semibold text-[var(--text)] text-sm">{cat.name}</span>
                        <span className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">{cat.slug}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="bg-[var(--surface-2)] px-2 py-0.5 rounded text-xs font-medium text-[var(--text-secondary)]">
                        {cat.sort_order}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleActive(cat)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer border border-transparent hover:border-[var(--primary)]/20 transition-all ${
                          cat.is_active
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                            : "bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                        title="Click to toggle status"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            cat.is_active ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                          }`}
                        />
                        {cat.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(cat)}
                          className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteId(cat.id)}
                          className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit / Create Modal */}
      {editing && createPortal(
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <div className="flex flex-col">
                <h2 className="modal-title">
                  {isNew ? 'Add Category' : 'Edit Category'}
                </h2>
                <span className="block w-8 h-[2.5px] bg-[var(--primary)] rounded-full mt-1"></span>
              </div>
              <button onClick={closeEdit} className="modal-close">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="modal-label">Icon</label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl border border-[var(--border)] bg-[var(--bg)] flex-shrink-0 shadow-sm">
                    <CategoryIcon name={editing.icon ?? 'tag'} size={24} className="text-[var(--primary)]" />
                  </div>
                  <div ref={iconDropdownRef} className="relative flex-1">
                    <button
                      type="button"
                      onClick={() => setIconDropdownOpen(!iconDropdownOpen)}
                      className="input flex items-center justify-between text-left w-full cursor-pointer rounded-lg hover:border-[var(--primary)]/50 transition-colors"
                    >
                      <span className="capitalize font-medium">{editing.icon ?? 'tag'}</span>
                      <ChevronDown size={16} className={`text-[var(--text-secondary)] transition-transform duration-200 ${iconDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {iconDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto p-3 grid grid-cols-4 gap-2">
                        {['utensils','shirt','smartphone','sparkles','plane','film','shopping-cart','shopping-bag','heart','dumbbell','tag','package','star','coffee','pizza','car','home','briefcase','music','book-open','camera','scissors','gem','gift','globe','leaf','monitor','tv','watch','wine','baby','bike','dog','flower','gamepad','hammer','headphones','hotel','laptop','paintbrush','pill','stethoscope','ticket','truck','umbrella','wallet','wrench','zap'].map(name => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => {
                              setEditing({ ...editing, icon: name });
                              setIconDropdownOpen(false);
                            }}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                              editing.icon === name
                                ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]'
                                : 'border-[var(--border)] hover:border-[var(--primary)]/40 hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text)]'
                            }`}
                            title={name}
                          >
                            <CategoryIcon name={name} size={20} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="modal-label">Name *</label>
                <input
                  type="text"
                  value={editing.name ?? ''}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  className="input rounded-lg"
                  placeholder="e.g. Food & Dining"
                />
              </div>
              <div>
                <label className="modal-label">Sort Order</label>
                <input
                  type="number"
                  value={editing.sort_order ?? 0}
                  onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                  className="input rounded-lg"
                  min={0}
                />
              </div>
              {!isNew && (
                <div className="flex items-center justify-between bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)]">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[var(--text)]">Active Status</span>
                    <span className="text-xs text-[var(--text-secondary)]">Show this category on feed & forms</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, is_active: editing.is_active ? 0 : 1 })}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      editing.is_active ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        editing.is_active ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={closeEdit} className="btn btn-secondary flex-1 py-2.5">Cancel</button>
              <button
                onClick={save}
                disabled={saving}
                className="btn btn-primary flex-1 py-2.5 hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                <Save size={16} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirm */}
      {deleteId && createPortal(
        <div className="modal-overlay">
          <div className="modal-content max-w-sm">
            <div className="modal-header">
              <div className="flex flex-col">
                <h2 className="modal-title">Delete Category?</h2>
                <span className="block w-8 h-[2.5px] bg-red-500 rounded-full mt-1"></span>
              </div>
              <button onClick={() => setDeleteId(null)} className="modal-close">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body space-y-3">
              <p className="text-sm text-[var(--text)] font-semibold">
                Delete "{categories.find(c => c.id === deleteId)?.name}"?
              </p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                This will remove the category. Existing offers with this category won't be affected.
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setDeleteId(null)} className="btn btn-secondary flex-1 py-2.5">Cancel</button>
              <button
                onClick={confirmDelete}
                className="btn bg-red-500 hover:bg-red-600 text-white flex-1 py-2.5 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
