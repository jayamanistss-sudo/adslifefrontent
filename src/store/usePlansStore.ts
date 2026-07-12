import { create } from "zustand";
import { api, endpoints } from "../utils/api";

export interface Plan {
  id: number;
  name: string;
  slug: string;
  price: number;
  annual_price: number | null;
  duration_days: number;
  max_offers: number;
  features: string[];
  feature_flags: string[];
  is_active: number;
}

interface PlansState {
  plans: Plan[];
  loading: boolean;
  loaded: boolean;
  fetchPlans: (force?: boolean) => Promise<Plan[]>;
  createPlan: (plan: Partial<Plan>) => Promise<boolean>;
  updatePlan: (id: number, plan: Partial<Plan>) => Promise<boolean>;
  deletePlan: (id: number) => Promise<boolean>;
  seedPlans: () => Promise<number>;
}

export const usePlansStore = create<PlansState>((set, get) => ({
  plans: [],
  loading: false,
  loaded: false,
  fetchPlans: async (force = false) => {
    if (get().loaded && !force) return get().plans;
    set({ loading: true });
    try {
      const res = await api.get(endpoints.plansList);
      if (res.data.success) {
        // price is a numeric-string ("0.00") from Postgres — coerce once here
        // so every consumer can safely compare/format it as a number.
        const fetchedPlans = (res.data.data || []).map((p: Plan) => ({
          ...p, price: Number(p.price),
          annual_price: p.annual_price != null ? Number(p.annual_price) : null,
        }));
        set({ plans: fetchedPlans, loaded: true });
        return fetchedPlans;
      }
    } catch (err) {
      console.error("Failed to fetch plans:", err);
    } finally {
      set({ loading: false });
    }
    return get().plans;
  },
  createPlan: async (plan) => {
    set({ loading: true });
    try {
      const res = await api.post(endpoints.plansCreate, plan);
      if (res.data.success) {
        await get().fetchPlans(true);
        return true;
      }
    } catch (err) {
      console.error("Failed to create plan:", err);
      throw err;
    } finally {
      set({ loading: false });
    }
    return false;
  },
  updatePlan: async (id, plan) => {
    set({ loading: true });
    try {
      const res = await api.put(endpoints.plansUpdate(id), plan);
      if (res.data.success) {
        await get().fetchPlans(true);
        return true;
      }
    } catch (err) {
      console.error("Failed to update plan:", err);
      throw err;
    } finally {
      set({ loading: false });
    }
    return false;
  },
  deletePlan: async (id) => {
    set({ loading: true });
    try {
      const res = await api.delete(endpoints.plansUpdate(id));
      if (res.data.success) {
        await get().fetchPlans(true);
        return true;
      }
      // Backend rejects in-use plans with {success:false, error} over a 200
      // response (not a thrown HTTP error) — surface that reason instead of
      // silently falling through to "false" and letting the caller assume
      // a generic failure.
      throw new Error(res.data.error || "Failed to delete plan");
    } catch (err) {
      console.error("Failed to delete plan:", err);
      throw err;
    } finally {
      set({ loading: false });
    }
    return false;
  },
  seedPlans: async () => {
    set({ loading: true });
    try {
      const res = await api.post(endpoints.plansSeed);
      if (res.data.success) {
        await get().fetchPlans(true);
        return res.data.data?.inserted ?? 0;
      }
    } catch (err) {
      console.error("Failed to seed plans:", err);
      throw err;
    } finally {
      set({ loading: false });
    }
    return 0;
  },
}));
