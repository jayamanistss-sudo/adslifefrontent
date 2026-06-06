import { create } from "zustand";
import { api, endpoints } from "../utils/api";

export interface Plan {
  id: number;
  name: string;
  slug: string;
  price: number;
  duration_days: number;
  max_offers: number;
  features: string[];
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
        const fetchedPlans = res.data.data || [];
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
    } catch (err) {
      console.error("Failed to delete plan:", err);
      throw err;
    } finally {
      set({ loading: false });
    }
    return false;
  },
}));
