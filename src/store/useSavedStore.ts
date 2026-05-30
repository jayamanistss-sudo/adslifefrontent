import { create } from 'zustand';
import { api, endpoints } from '../utils/api';

interface SavedState {
  savedIds: Set<number>;
  loaded: boolean;
  load: () => Promise<void>;
  save: (offerId: number) => Promise<void>;
  unsave: (offerId: number) => Promise<void>;
  isSaved: (offerId: number) => boolean;
}

export const useSavedStore = create<SavedState>((set, get) => ({
  savedIds: new Set(),
  loaded: false,

  load: async () => {
    try {
      const r = await api.get(endpoints.savedIds);
      if (r.data.success) {
        set({ savedIds: new Set<number>(r.data.data.ids), loaded: true });
      }
    } catch {}
  },

  save: async (offerId) => {
    set((s) => ({ savedIds: new Set([...s.savedIds, offerId]) }));
    try {
      await api.post(endpoints.interaction, { offer_id: offerId, action: 'save' });
    } catch {
      set((s) => { const ids = new Set(s.savedIds); ids.delete(offerId); return { savedIds: ids }; });
    }
  },

  unsave: async (offerId) => {
    set((s) => { const ids = new Set(s.savedIds); ids.delete(offerId); return { savedIds: ids }; });
    try {
      await api.delete(endpoints.unsaveOffer, { data: { offer_id: offerId } });
    } catch {
      set((s) => ({ savedIds: new Set([...s.savedIds, offerId]) }));
    }
  },

  isSaved: (offerId) => get().savedIds.has(offerId),
}));
