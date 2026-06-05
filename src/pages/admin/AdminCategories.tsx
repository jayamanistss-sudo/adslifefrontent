import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Save, X, ChevronDown } from 'lucide-react';
import { api, endpoints } from '../../utils/api';
import toast from 'react-hot-toast';
import CategoryIcon from '../../components/CategoryIcon';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Categories</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage categories shown in Browse &amp; offer forms
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90"
        >
          <Plus size={16} /> Add Category
        </button>
      </div>

      {/* Table */}
      <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[var(--text-secondary)]">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg)] border-b border-[var(--border)]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)]">Icon</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)]">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)]">Slug</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)]">Order</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)]">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-[var(--text-secondary)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-[var(--bg)] transition-colors">
                  <td className="px-4 py-3">
                    <CategoryIcon name={cat.icon} size={24} className="text-[var(--primary)]" />
                  </td>
                  <td className="px-4 py-3 font-medium text-[var(--text)]">{cat.name}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] font-mono text-xs">{cat.slug}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{cat.sort_order}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(cat)} className="flex items-center gap-1.5">
                      {cat.is_active ? (
                        <><ToggleRight size={20} className="text-green-500" /><span className="text-green-600 text-xs font-medium">Active</span></>
                      ) : (
                        <><ToggleLeft size={20} className="text-gray-400" /><span className="text-gray-400 text-xs font-medium">Inactive</span></>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(cat)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteId(cat.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--text-secondary)]">No categories yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit / Create Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
              <h2 className="font-bold text-lg text-[var(--text)]">
                {isNew ? 'Add Category' : 'Edit Category'}
              </h2>
              <button onClick={closeEdit} className="p-1.5 rounded-lg hover:bg-[var(--bg)]">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Icon</label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl border border-[var(--border)] bg-[var(--bg)]">
                    <CategoryIcon name={editing.icon ?? 'tag'} size={24} className="text-[var(--primary)]" />
                  </div>
                  <div ref={iconDropdownRef} className="relative flex-1">
                    <button
                      type="button"
                      onClick={() => setIconDropdownOpen(!iconDropdownOpen)}
                      className="input flex items-center justify-between text-left w-full cursor-pointer rounded-lg"
                    >
                      <span className="capitalize">{editing.icon ?? 'tag'}</span>
                      <ChevronDown size={16} className={`text-[var(--text-secondary)] transition-transform duration-200 ${iconDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {iconDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-[var(--border)]">
                        {['utensils','shirt','smartphone','sparkles','plane','film','shopping-cart','shopping-bag','heart','dumbbell','tag','package','star','coffee','pizza','car','home','briefcase','music','book-open','camera','scissors','gem','gift','globe','leaf','monitor','tv','watch','wine','baby','bike','dog','flower','gamepad','hammer','headphones','hotel','laptop','paintbrush','pill','stethoscope','ticket','truck','umbrella','wallet','wrench','zap'].map(name => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => {
                              setEditing({ ...editing, icon: name });
                              setIconDropdownOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[var(--bg)] text-left text-[var(--text)] transition-colors cursor-pointer"
                          >
                            <CategoryIcon name={name} size={18} className="text-[var(--primary)]" />
                            <span className="capitalize text-sm font-medium">{name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Name *</label>
                <input
                  type="text"
                  value={editing.name ?? ''}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  className="input rounded-lg"
                  placeholder="e.g. Food & Dining"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Sort Order</label>
                <input
                  type="number"
                  value={editing.sort_order ?? 0}
                  onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                  className="input rounded-lg"
                  min={0}
                />
              </div>
              {!isNew && (
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-[var(--text)]">Active</label>
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, is_active: editing.is_active ? 0 : 1 })}
                  >
                    {editing.is_active ? (
                      <ToggleRight size={28} className="text-green-500" />
                    ) : (
                      <ToggleLeft size={28} className="text-gray-400" />
                    )}
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={closeEdit} className="flex-1 btn btn-secondary rounded-lg py-3">Cancel</button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 btn bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-60 rounded-lg py-3"
              >
                <Save size={16} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h2 className="font-bold text-lg text-[var(--text)]">
              Delete "{categories.find(c => c.id === deleteId)?.name}"?
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              This will remove the category. Existing offers with this category won't be affected.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 btn btn-secondary rounded-lg py-3">Cancel</button>
              <button
                onClick={confirmDelete}
                className="flex-1 btn bg-red-500 text-white hover:bg-red-600 rounded-lg py-3"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
