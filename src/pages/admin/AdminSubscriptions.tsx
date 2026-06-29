import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Save, X,
  CreditCard, Image, Calendar, Tag,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../utils/api";
import { usePlansStore, type Plan } from "../../store/usePlansStore";

// ─── Banner Plan types ──────────────────────────────────────────────────────
interface BannerPlan {
  id: number;
  name: string;
  duration_days: number;
  price: number;
  description: string | null;
  position: string;
  is_active: boolean;
}

const emptyBannerPlan = (): Partial<BannerPlan> => ({
  name: "",
  duration_days: 7,
  price: 0,
  description: "",
  position: "top",
  is_active: true,
});

// Top Banner is currently the only live placement on the site — position is
// fixed and shown for context only, not editable, until more placements exist.

// ─── Subscription Plan helpers (unchanged) ──────────────────────────────────
const emptyPlan = (): Partial<Plan> => ({
  name: "", slug: "", price: 0, duration_days: 30, max_offers: 5, features: [], is_active: 1,
});

// ─── Component ──────────────────────────────────────────────────────────────
export default function AdminSubscriptions() {
  const [tab, setTab] = useState<"subscription" | "banner">("subscription");

  // ── Subscription Plans state ────────────────────────────────────────────
  const { plans, loading: plansLoading, fetchPlans, createPlan, updatePlan, deletePlan } = usePlansStore();
  const [editing, setEditing]       = useState<Partial<Plan> | null>(null);
  const [isNew, setIsNew]           = useState(false);
  const [saving, setSaving]         = useState(false);
  const [deleteId, setDeleteId]     = useState<number | null>(null);
  const [featureInput, setFeatureInput] = useState("");

  // ── Banner Plans state ──────────────────────────────────────────────────
  const [bannerPlans, setBannerPlans]       = useState<BannerPlan[]>([]);
  const [bannerLoading, setBannerLoading]   = useState(false);
  const [bannerEditing, setBannerEditing]   = useState<Partial<BannerPlan> | null>(null);
  const [bannerIsNew, setBannerIsNew]       = useState(false);
  const [bannerSaving, setBannerSaving]     = useState(false);
  const [bannerDeleteId, setBannerDeleteId] = useState<number | null>(null);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const loadBannerPlans = async () => {
    setBannerLoading(true);
    try {
      const r = await api.get("/banner-plans/all");
      setBannerPlans(r.data.data ?? []);
    } finally {
      setBannerLoading(false);
    }
  };

  useEffect(() => { if (tab === "banner") loadBannerPlans(); }, [tab]);

  // ── Subscription helpers ───────────────────────────────────────────────
  const openNew  = () => { setEditing(emptyPlan()); setIsNew(true); setFeatureInput(""); };
  const openEdit = (p: Plan) => { setEditing({ ...p, features: [...p.features] }); setIsNew(false); setFeatureInput(""); };
  const closeEdit = () => { setEditing(null); setFeatureInput(""); };
  const addFeature = () => {
    const f = featureInput.trim(); if (!f) return;
    setEditing((e) => ({ ...e, features: [...(e?.features ?? []), f] }));
    setFeatureInput("");
  };
  const removeFeature = (i: number) =>
    setEditing((e) => ({ ...e, features: (e?.features ?? []).filter((_, idx) => idx !== i) }));
  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  const savePlan = async () => {
    if (!editing?.name?.trim()) { toast.error("Name is required"); return; }
    if (isNew && !editing?.slug?.trim()) { toast.error("Slug is required"); return; }
    setSaving(true);
    try {
      if (isNew) { await createPlan(editing); toast.success("Plan created"); }
      else        { await updatePlan(editing.id!, editing); toast.success("Plan updated"); }
      closeEdit();
    } catch (err: unknown) {
      toast.error((err as any).response?.data?.error ?? "Failed to save");
    } finally { setSaving(false); }
  };

  const togglePlanActive = async (plan: Plan) => {
    try { await updatePlan(plan.id, { ...plan, is_active: plan.is_active ? 0 : 1 }); }
    catch { toast.error("Failed to update"); }
  };

  const confirmDeletePlan = async () => {
    if (!deleteId) return;
    try { await deletePlan(deleteId); toast.success("Plan deleted"); setDeleteId(null); }
    catch (err: unknown) { toast.error((err as any).response?.data?.error ?? "Failed to delete"); }
  };

  // ── Banner Plan helpers ─────────────────────────────────────────────────
  const openBannerNew  = () => { setBannerEditing(emptyBannerPlan()); setBannerIsNew(true); };
  const openBannerEdit = (p: BannerPlan) => { setBannerEditing({ ...p }); setBannerIsNew(false); };
  const closeBannerEdit = () => { setBannerEditing(null); };

  const saveBannerPlan = async () => {
    if (!bannerEditing?.name?.trim())        { toast.error("Name is required"); return; }
    if (!bannerEditing?.duration_days || bannerEditing.duration_days < 1)
                                              { toast.error("Duration must be at least 1 day"); return; }
    if (bannerEditing?.price == null || bannerEditing.price < 0)
                                              { toast.error("Price is required"); return; }
    setBannerSaving(true);
    try {
      if (bannerIsNew) {
        await api.post("/banner-plans", {
          name: bannerEditing.name,
          duration_days: Number(bannerEditing.duration_days),
          price: Number(bannerEditing.price),
          description: bannerEditing.description || null,
        });
        toast.success("Banner plan created");
      } else {
        await api.put(`/banner-plans/${bannerEditing.id}`, {
          name: bannerEditing.name,
          duration_days: Number(bannerEditing.duration_days),
          price: Number(bannerEditing.price),
          description: bannerEditing.description || null,
          is_active: bannerEditing.is_active,
        });
        toast.success("Banner plan updated");
      }
      closeBannerEdit();
      loadBannerPlans();
    } catch (err: unknown) {
      toast.error((err as any).response?.data?.error ?? "Failed to save");
    } finally { setBannerSaving(false); }
  };

  const toggleBannerActive = async (p: BannerPlan) => {
    try {
      await api.put(`/banner-plans/${p.id}`, { is_active: !p.is_active });
      setBannerPlans((prev) => prev.map((x) => x.id === p.id ? { ...x, is_active: !p.is_active } : x));
    } catch { toast.error("Failed to update"); }
  };

  const confirmDeleteBanner = async () => {
    if (!bannerDeleteId) return;
    try {
      await api.delete(`/banner-plans/${bannerDeleteId}`);
      toast.success("Banner plan deleted");
      setBannerDeleteId(null);
      loadBannerPlans();
    } catch (err: unknown) {
      toast.error((err as any).response?.data?.error ?? "Failed to delete");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Plans</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage subscription and banner advertising plans
          </p>
        </div>
        <button
          onClick={tab === "subscription" ? openNew : openBannerNew}
          className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90"
        >
          <Plus size={16} /> {tab === "subscription" ? "Add Plan" : "Add Banner Plan"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--surface-2)] p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab("subscription")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === "subscription"
              ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
          }`}
        >
          <CreditCard size={15} /> Subscription Plans
        </button>
        <button
          onClick={() => setTab("banner")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            tab === "banner"
              ? "bg-[var(--surface)] text-[var(--text)] shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text)]"
          }`}
        >
          <Image size={15} /> Banner Plans
        </button>
      </div>

      {/* ── Subscription Plans tab ──────────────────────────────────────── */}
      {tab === "subscription" && (
        plansLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map((i) => <div key={i} className="skeleton h-52 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div key={plan.id} className={`bg-[var(--surface)] rounded-2xl border-2 p-5 flex flex-col gap-3 ${plan.is_active ? "border-[var(--primary)]/30" : "border-[var(--border)] opacity-60"}`}>
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
                  <button onClick={() => togglePlanActive(plan)}>
                    {plan.is_active
                      ? <ToggleRight size={22} className="text-green-500" />
                      : <ToggleLeft  size={22} className="text-[var(--text-muted)]" />}
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
                    {plan.features.length > 3 && <li className="text-xs text-[var(--text-secondary)] pl-2.5">+{plan.features.length - 3} more</li>}
                  </ul>
                )}
                <div className="flex gap-2 mt-auto pt-2 border-t border-[var(--border)]">
                  <button onClick={() => openEdit(plan)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]">
                    <Pencil size={13} /> Edit
                  </button>
                  <button onClick={() => setDeleteId(plan.id)} className="flex items-center justify-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-xl border border-red-100 dark:border-red-900/30 bg-[var(--danger-light)] hover:bg-red-100 dark:hover:bg-red-950/40 text-red-500 dark:text-red-400 text-xs">
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
        )
      )}

      {/* ── Banner Plans tab ────────────────────────────────────────────── */}
      {tab === "banner" && (
        bannerLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map((i) => <div key={i} className="skeleton h-44 rounded-2xl" />)}
          </div>
        ) : (
          <>
            {/* Summary row */}
            <div className="flex gap-2 flex-wrap text-xs text-[var(--text-secondary)]">
              <span className="bg-[var(--surface-2)] px-3 py-1.5 rounded-lg font-medium">
                {bannerPlans.length} plan{bannerPlans.length !== 1 ? "s" : ""}
              </span>
              <span className="bg-[var(--surface-2)] px-3 py-1.5 rounded-lg font-medium">
                {bannerPlans.filter(p => p.is_active).length} active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bannerPlans.map((plan) => (
                <div key={plan.id} className={`bg-[var(--surface)] rounded-2xl border-2 p-5 flex flex-col gap-3 transition-opacity ${plan.is_active ? "border-[var(--primary)]/30" : "border-[var(--border)] opacity-60"}`}>
                  {/* Header row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                        <Image size={17} className="text-[var(--primary)]" />
                      </div>
                      <div>
                        <p className="font-bold text-[var(--text)] text-sm">{plan.name}</p>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                          Top Banner
                        </span>
                      </div>
                    </div>
                    <button onClick={() => toggleBannerActive(plan)}>
                      {plan.is_active
                        ? <ToggleRight size={22} className="text-green-500" />
                        : <ToggleLeft  size={22} className="text-[var(--text-muted)]" />}
                    </button>
                  </div>

                  {/* Price */}
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold text-[var(--text)]">₹{Number(plan.price).toLocaleString()}</span>
                    <span className="text-xs text-[var(--text-secondary)] mb-1">/ booking</span>
                  </div>

                  {/* Duration badge */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <Calendar size={13} className="text-[var(--text-muted)]" />
                    <span className="bg-[var(--bg)] px-2 py-1 rounded-lg font-semibold text-[var(--text)]">
                      {plan.duration_days} day{plan.duration_days !== 1 ? "s" : ""}
                    </span>
                    <span className="text-[var(--text-muted)]">display duration</span>
                  </div>

                  {/* Per-day rate */}
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <Tag size={12} />
                    <span>₹{(Number(plan.price) / plan.duration_days).toFixed(0)}/day</span>
                  </div>

                  {/* Description */}
                  {plan.description && (
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border)] pt-2">
                      {plan.description}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto pt-2 border-t border-[var(--border)]">
                    <button onClick={() => openBannerEdit(plan)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text)] hover:bg-[var(--bg)]">
                      <Pencil size={13} /> Edit
                    </button>
                    <button onClick={() => setBannerDeleteId(plan.id)} className="flex items-center justify-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-xl border border-red-100 dark:border-red-900/30 bg-[var(--danger-light)] hover:bg-red-100 dark:hover:bg-red-950/40 text-red-500 dark:text-red-400 text-xs">
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              ))}

              {bannerPlans.length === 0 && (
                <div className="col-span-3 py-16 text-center text-[var(--text-secondary)]">
                  <Image size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No banner plans yet.</p>
                  <p className="text-xs mt-1">Add day-wise pricing for banner ad slots.</p>
                </div>
              )}
            </div>
          </>
        )
      )}

      {/* ── Subscription Plan Modal ─────────────────────────────────────── */}
      {editing && createPortal(
        <div className="modal-overlay">
          <div className="modal-content max-w-lg">
            <div className="modal-header">
              <div className="flex flex-col">
                <h2 className="modal-title">{isNew ? "Add Plan" : "Edit Plan"}</h2>
                <span className="block w-8 h-[2.5px] bg-[var(--primary)] rounded-full mt-1" />
              </div>
              <button onClick={closeEdit} className="modal-close"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <div>
                <label className="modal-label">Plan Name *</label>
                <input type="text" value={editing.name ?? ""} onChange={(e) => { const name = e.target.value; setEditing((p) => ({ ...p, name, ...(isNew ? { slug: autoSlug(name) } : {}) })); }} className="input" placeholder="e.g. Growth" />
              </div>
              <div>
                <label className="modal-label">Slug *</label>
                <input type="text" value={editing.slug ?? ""} onChange={(e) => isNew && setEditing({ ...editing, slug: e.target.value })} className={`input font-mono text-sm ${!isNew ? "opacity-50 cursor-not-allowed" : ""}`} placeholder="e.g. growth" readOnly={!isNew} />
                {isNew && <p className="text-[11px] text-[var(--text-secondary)] mt-1.5">Auto-filled. Lowercase, no spaces.</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="modal-label">Price (₹/mo)</label>
                  <input type="number" value={editing.price ?? 0} min={0} onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value) || 0 })} className="input" />
                </div>
                <div>
                  <label className="modal-label">Duration (days)</label>
                  <input type="number" value={editing.duration_days ?? 30} min={1} onChange={(e) => setEditing({ ...editing, duration_days: parseInt(e.target.value) || 30 })} className="input" />
                </div>
              </div>
              <div>
                <label className="modal-label">Max Offers</label>
                <input type="number" value={editing.max_offers ?? 5} min={1} onChange={(e) => setEditing({ ...editing, max_offers: parseInt(e.target.value) || 1 })} className="input" />
              </div>
              <div>
                <label className="modal-label">Features</label>
                <div className="flex gap-2 mb-3">
                  <input type="text" value={featureInput} onChange={(e) => setFeatureInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())} className="input flex-1" placeholder="e.g. Priority listing" />
                  <button type="button" onClick={addFeature} className="btn btn-primary">Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(editing.features ?? []).map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-[var(--surface-2)] border border-[var(--border)] pl-3 pr-2 py-1.5 rounded-xl text-xs font-semibold text-[var(--text)]">
                      <span>{f}</span>
                      <button type="button" onClick={() => removeFeature(i)} className="text-[var(--text-secondary)] hover:text-red-500 p-0.5 rounded-full"><X size={12} /></button>
                    </div>
                  ))}
                  {(editing.features ?? []).length === 0 && <p className="text-xs text-[var(--text-secondary)] italic">No features added yet</p>}
                </div>
              </div>
              <div className="flex items-center justify-between bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)]">
                <div>
                  <span className="text-sm font-semibold text-[var(--text)]">Active Status</span>
                  <p className="text-xs text-[var(--text-secondary)]">Show during vendor registration</p>
                </div>
                <button type="button" onClick={() => setEditing({ ...editing, is_active: editing.is_active ? 0 : 1 })}>
                  {editing.is_active ? <ToggleRight size={36} className="text-green-500" /> : <ToggleLeft size={36} className="text-[var(--text-muted)]" />}
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={closeEdit} className="btn btn-secondary flex-1 py-2.5">Cancel</button>
              <button onClick={savePlan} disabled={saving} className="btn btn-primary flex-1 py-2.5">
                <Save size={16} /> {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Banner Plan Modal ───────────────────────────────────────────── */}
      {bannerEditing && createPortal(
        <div className="modal-overlay">
          <div className="modal-content max-w-lg">
            <div className="modal-header">
              <div className="flex flex-col">
                <h2 className="modal-title">{bannerIsNew ? "Add Banner Plan" : "Edit Banner Plan"}</h2>
                <span className="block w-8 h-[2.5px] bg-[var(--primary)] rounded-full mt-1" />
              </div>
              <button onClick={closeBannerEdit} className="modal-close"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              {/* Name */}
              <div>
                <label className="modal-label">Plan Name *</label>
                <input type="text" value={bannerEditing.name ?? ""} onChange={(e) => setBannerEditing({ ...bannerEditing, name: e.target.value })} className="input" placeholder="e.g. Starter, Popular, Premium" />
              </div>

              {/* Duration + Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="modal-label">Duration (days) *</label>
                  <input type="number" value={bannerEditing.duration_days ?? 7} min={1} onChange={(e) => setBannerEditing({ ...bannerEditing, duration_days: parseInt(e.target.value) || 1 })} className="input" placeholder="7" />
                  <p className="text-[11px] text-[var(--text-muted)] mt-1">How long the banner displays</p>
                </div>
                <div>
                  <label className="modal-label">Price (₹) *</label>
                  <input type="number" value={bannerEditing.price ?? 0} min={0} onChange={(e) => setBannerEditing({ ...bannerEditing, price: parseFloat(e.target.value) || 0 })} className="input" placeholder="299" />
                  {bannerEditing.duration_days && Number(bannerEditing.price) > 0 && (
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      ₹{(Number(bannerEditing.price) / bannerEditing.duration_days).toFixed(0)}/day
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="modal-label">Description <span className="text-[var(--text-muted)]">(optional)</span></label>
                <input type="text" value={bannerEditing.description ?? ""} onChange={(e) => setBannerEditing({ ...bannerEditing, description: e.target.value })} className="input" placeholder="e.g. Best for short campaigns" />
              </div>

              {/* Active toggle */}
              {!bannerIsNew && (
                <div className="flex items-center justify-between bg-[var(--bg)] p-3 rounded-xl border border-[var(--border)]">
                  <div>
                    <span className="text-sm font-semibold text-[var(--text)]">Active Status</span>
                    <p className="text-xs text-[var(--text-secondary)]">Show this plan to vendors</p>
                  </div>
                  <button type="button" onClick={() => setBannerEditing({ ...bannerEditing, is_active: !bannerEditing.is_active })}>
                    {bannerEditing.is_active ? <ToggleRight size={36} className="text-green-500" /> : <ToggleLeft size={36} className="text-[var(--text-muted)]" />}
                  </button>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={closeBannerEdit} className="btn btn-secondary flex-1 py-2.5">Cancel</button>
              <button onClick={saveBannerPlan} disabled={bannerSaving} className="btn btn-primary flex-1 py-2.5">
                <Save size={16} /> {bannerSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Subscription Delete Confirm ─────────────────────────────────── */}
      {deleteId && createPortal(
        <div className="modal-overlay">
          <div className="modal-content max-w-sm">
            <div className="modal-header">
              <div className="flex flex-col">
                <h2 className="modal-title">Delete Plan?</h2>
                <span className="block w-8 h-[2.5px] bg-red-500 rounded-full mt-1" />
              </div>
              <button onClick={() => setDeleteId(null)} className="modal-close"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-3">
              <p className="text-sm text-[var(--text)] font-semibold">Delete "{plans.find(p => p.id === deleteId)?.name}"?</p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">Plans used by existing vendor applications cannot be deleted.</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setDeleteId(null)} className="btn btn-secondary flex-1 py-2.5">Cancel</button>
              <button onClick={confirmDeletePlan} className="btn bg-red-500 hover:bg-red-600 text-white flex-1 py-2.5">Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Banner Delete Confirm ───────────────────────────────────────── */}
      {bannerDeleteId && createPortal(
        <div className="modal-overlay">
          <div className="modal-content max-w-sm">
            <div className="modal-header">
              <div className="flex flex-col">
                <h2 className="modal-title">Delete Banner Plan?</h2>
                <span className="block w-8 h-[2.5px] bg-red-500 rounded-full mt-1" />
              </div>
              <button onClick={() => setBannerDeleteId(null)} className="modal-close"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-3">
              <p className="text-sm text-[var(--text)] font-semibold">Delete "{bannerPlans.find(p => p.id === bannerDeleteId)?.name}"?</p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">This will remove the pricing tier from the vendor banner request form.</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setBannerDeleteId(null)} className="btn btn-secondary flex-1 py-2.5">Cancel</button>
              <button onClick={confirmDeleteBanner} className="btn bg-red-500 hover:bg-red-600 text-white flex-1 py-2.5">Delete</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
