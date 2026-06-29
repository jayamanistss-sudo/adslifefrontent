import { create } from 'zustand';
import { api, endpoints } from '../utils/api';
import { db } from '../powersync/database';

interface SavedState {
  savedIds: Set<number>;
  loaded: boolean;
  load: (userId: number) => Promise<void>;
  save: (offerId: number) => Promise<void>;
  unsave: (offerId: number) => Promise<void>;
  isSaved: (offerId: number) => boolean;
}

export const useSavedStore = create<SavedState>((set, get) => ({
  savedIds: new Set(),
  loaded: false,

  load: async (userId: number) => {
    try {
      const rows = await db.getAll('SELECT offer_id FROM saved_offers WHERE user_id = ?', [userId]);
      set({ savedIds: new Set<number>(rows.map((r: any) => Number(r.offer_id))), loaded: true });
    } catch {
      try {
        const r = await api.get(endpoints.savedIds);
        if (r.data.success) set({ savedIds: new Set<number>((r.data.data as number[]).map(Number)), loaded: true });
      } catch {}
    }
  },

  save: async (offerId) => {
    if (get().savedIds.has(offerId)) return; // already saved — prevent duplicate API call
    set((s) => ({ savedIds: new Set([...s.savedIds, offerId]) }));
    try {
      await api.post(endpoints.interaction, { offer_id: offerId, action: 'save' });
    } catch {
      set((s) => { const ids = new Set(s.savedIds); ids.delete(offerId); return { savedIds: ids }; });
    }
  },

  unsave: async (offerId) => {
    if (!get().savedIds.has(offerId)) return; // not saved — nothing to do
    set((s) => { const ids = new Set(s.savedIds); ids.delete(offerId); return { savedIds: ids }; });
    try {
      await api.delete(endpoints.unsaveOffer, { data: { offer_id: offerId } });
    } catch {
      set((s) => ({ savedIds: new Set([...s.savedIds, offerId]) }));
    }
  },

  isSaved: (offerId) => get().savedIds.has(offerId),
}));
