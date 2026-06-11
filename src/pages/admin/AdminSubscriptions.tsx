import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Save, X, CreditCard } from "lucide-react";
import toast from "react-hot-toast";
import { usePlansStore, type Plan } from "../../store/usePlansStore";

const emptyPlan = (): Partial<Plan> => ({
  name: "",
  slug: "",
  price: 0,
  duration_days: 30,
  max_offers: 5,
  features: [],
  is_active: 1,
});

export default function AdminSubscriptions() {
  const { plans, loading, fetchPlans, createPlan, updatePlan, deletePlan } = usePlansStore();
  const [editing, setEditing] = useState<Partial<Plan> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [featureInput, setFeatureInput] = useState("");

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const openNew = () => {
    setEditing(emptyPlan());
    setIsNew(true);
    setFeatureInput("");
  };
  const openEdit = (p: Plan) => {
    setEditing({ ...p, features: [...p.features] });
    setIsNew(false);
    setFeatureInput("");
  };
  const closeEdit = () => {
    setEditing(null);
    setFeatureInput("");
  };

  const addFeature = () => {
    const f = featureInput.trim();
    if (!f) return;
    setEditing((e) => ({ ...e, features: [...(e?.features ?? []), f] }));
    setFeatureInput("");
  };

  const removeFeature = (i: number) =>
    setEditing((e) => ({ ...e, features: (e?.features ?? []).filter((_, idx) => idx !== i) }));

  const autoSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

  const save = async () => {
    if (!editing?.name?.trim()) {
      toast.error("Name is required");
      return;
    }
    if (isNew && !editing?.slug?.trim()) {
      toast.error("Slug is required");
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await createPlan(editing);
        toast.success("Plan created");
      } else {
        await updatePlan(editing.id!, editing);
        toast.success("Plan updated");
      }
      closeEdit();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? "Failed to save";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (plan: Plan) => {
    try {
      await updatePlan(plan.id, { ...plan, is_active: plan.is_active ? 0 : 1 });
    } catch {
      toast.error("Failed to update");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deletePlan(deleteId);
      toast.success("Plan deleted");
      setDeleteId(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? "Failed to delete";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Subscription Plans</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage vendor subscription plans shown during vendor registration
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90"
        >
          <Plus size={16} /> Add Plan
        </button>
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-52 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-[var(--surface)] rounded-2xl border-2 p-5 flex flex-col gap-3 ${
                plan.is_active ? "border-[var(--primary)]/30" : "border-[var(--border)] opacity-60"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                    <CreditCard size={18} className="text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="font-bold text-[var(--text)] text-sm">{plan.name}</p>
                    <p className="text-xs text-[var(--text-secondary)] font-mono">{plan.slug}</p>
                  </div>
                </div>
                <button onClick={() => toggleActive(plan)}>
                  {plan.is_active ? (
                    <ToggleRight size={22} className="text-green-500" />
                  ) : (
                    <ToggleLeft size={22} className="text-gray-400" />
                  )}
                </button>
              </div>

              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold text-[var(--text)]">
                  {plan.price === 0 ? "Free" : `₹${plan.price.toLocaleString()}`}
                </span>
                {plan.price > 0 && <span className="text-xs text-[var(--text-secondary)] mb-1">/mo</span>}
              </div>

              <div className="flex gap-3 text-xs text-[var(--text-secondary)]">
                <span className="bg-[var(--bg)] px-2 py-1 rounded-lg">{plan.duration_days}d</span>
                <span className="bg-[var(--bg)] px-2 py-1 rounded-lg">{plan.max_offers} offers</span>
              </div>

              {plan.features.length > 0 && (
                <ul className="space-y-0.5">
                  {plan.features.slice(0, 3).map((f, i) => (
                    <li key={i} className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-[var(--primary)] flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                  {plan.features.length > 3 && (
                    <li className="text-xs text-[var(--text-secondary)] pl-2.5">+{plan.features.length - 3} more</li>
                  )}
                </ul>
              )}

              <div className="flex gap-2 mt-auto pt-2 border-t border-[var(--border)]">
                <button
                  onClick={() => openEdit(plan)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]"
                >
                  <Pencil size={13} /> Edit
                </button>
                <button
                  onClick={() => setDeleteId(plan.id)}
                  className="flex items-center justify-center bg-red-50 hover:bg-red-100 gap-1.5 cursor-pointer px-3 py-1.5 rounded-xl border border-red-100 text-red-500 text-xs"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          ))}

          {plans.length === 0 && (
            <div className="col-span-3 py-16 text-center text-[var(--text-secondary)]">
              <CreditCard size={36} className="mx-auto mb-3 opacity-30" />
              <p>No plans yet. Add one to get started.</p>
            </div>
          )}
        </div>
      )}
      {/* Edit / Create Modal */}
      {editing && createPortal(
        <div className="modal-overlay">
          <div className="modal-content max-w-lg">
            <div className="modal-header">
              <div className="flex flex-col">
                <h2 className="modal-title">{isNew ? "Add Plan" : "Edit Plan"}</h2>
                <span className="block w-8 h-[2.5px] bg-[var(--primary)] rounded-full mt-1"></span>
              </div>
              <button onClick={closeEdit} className="modal-close">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body space-y-4">
              {/* Name */}
              <div>
                <label className="modal-label">Plan Name *</label>
                <input
                  type="text"
                  value={editing.name ?? ""}
                  onChange={(e) => {
                    const name = e.target.value;
                    setEditing((prev) => ({
                      ...prev,
                      name,
                      ...(isNew ? { slug: autoSlug(name) } : {}),
                    }));
                  }}
                  className="input"
                  placeholder="e.g. Growth"
                />
              </div>

              {/* Slug (only editable on create) */}
              <div>
                <label className="modal-label">Slug *</label>
                <input
                  type="text"
                  value={editing.slug ?? ""}
                  onChange={(e) => isNew && setEditing({ ...editing, slug: e.target.value })}
                  className={`input font-mono text-sm ${!isNew ? "opacity-50 cursor-not-allowed" : ""}`}
                  placeholder="e.g. growth"
                  readOnly={!isNew}
                />
                {isNew && (
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">
                    Auto-filled from name. Lowercase, no spaces.
                  </p>
                )}
              </div>

              {/* Price + Duration in a row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="modal-label">Price (₹/mo)</label>
                  <input
                    type="number"
                    value={editing.price ?? 0}
                    min={0}
                    onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value) || 0 })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="modal-label">Duration (days)</label>
                  <input
                    type="number"
                    value={editing.duration_days ?? 30}
                    min={1}
                    onChange={(e) => setEditing({ ...editing, duration_days: parseInt(e.target.value) || 30 })}
                    className="input"
                  />
                </div>
              </div>

              {/* Max offers */}
              <div>
                <label className="modal-label">Max Offers</label>
                <input
                  type="number"
                  value={editing.max_offers ?? 5}
                  min={1}
                  onChange={(e) => setEditing({ ...editing, max_offers: parseInt(e.target.value) || 1 })}
                  className="input"
                />
              </div>

              {/* Features */}
              <div>
                <label className="modal-label">Features</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                    className="input flex-1"
                    placeholder="e.g. Priority listing"
                  />
                  <button
                    type="button"
                    onClick={addFeature}
                    className="btn btn-primary"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(editing.features ?? []).map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 bg-[var(--surface-2)] border border-[var(--border)] pl-3 pr-2 py-1.5 rounded-xl text-xs font-semibold text-[var(--text)] transition-all hover:border-[var(--primary)]/30"
                    >
                      <span>{f}</span>
                      <button
                        type="button"
                        onClick={() => removeFeature(i)}
                        className="text-[var(--text-secondary)] hover:text-red-500 p-0.5 rounded-full hover:bg-[var(--surface)] transition-all"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {(editing.features ?? []).length === 0 && (
                    <p className="text-xs text-[var(--text-secondary)] italic">No features added yet</p>
                  )}
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)]">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[var(--text)]">Active Status</span>
                  <span className="text-xs text-[var(--text-secondary)]">Show this plan during vendor registration</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing({ ...editing, is_active: editing.is_active ? 0 : 1 })}
                  className="text-[var(--primary)] hover:opacity-90 transition-opacity"
                >
                  {editing.is_active ? (
                    <ToggleRight size={36} className="text-green-500" />
                  ) : (
                    <ToggleLeft size={36} className="text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={closeEdit} className="btn btn-secondary flex-1 py-2.5">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="btn btn-primary flex-1 py-2.5 hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                <Save size={16} /> {saving ? "Saving…" : "Save"}
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
                <h2 className="modal-title">Delete Plan?</h2>
                <span className="block w-8 h-[2.5px] bg-red-500 rounded-full mt-1"></span>
              </div>
              <button onClick={() => setDeleteId(null)} className="modal-close">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body space-y-3">
              <p className="text-sm text-[var(--text)] font-semibold">
                Delete "{plans.find(p => p.id === deleteId)?.name}"?
              </p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Plans used by existing vendor applications cannot be deleted.
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setDeleteId(null)} className="btn btn-secondary flex-1 py-2.5">
                Cancel
              </button>
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
