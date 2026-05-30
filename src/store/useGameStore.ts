import { create } from 'zustand';
import type { Badge, StreakStatus } from '../types';
import { api, endpoints } from '../utils/api';

interface GameState {
  streak: StreakStatus | null;
  badges: Badge[];
  newBadges: Badge[];
  leaderboardRank: number | null;
  loadStreak: (userId: number) => Promise<void>;
  loadBadges: (userId: number) => Promise<void>;
  checkBadges: (userId: number) => Promise<Badge[]>;
  clearNewBadges: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  streak:          null,
  badges:          [],
  newBadges:       [],
  leaderboardRank: null,

  loadStreak: async (userId) => {
    try {
      const res = await api.get(endpoints.streakStatus(userId));
      if (res.data.success) {
        const d = res.data.data;
        set({
          streak: {
            currentStreak:   d.current_streak,
            longestStreak:   d.longest_streak,
            lastActiveDate:  d.last_active_date,
            nextMilestone:   d.next_milestone,
            daysUntilNext:   d.days_until_next,
          }
        });
      }
    } catch {}
  },

  loadBadges: async (userId) => {
    try {
      const res = await api.get(endpoints.badgesUser(userId));
      if (res.data.success) {
        set({ badges: mapBadges(res.data.data) });
      }
    } catch {}
  },

  checkBadges: async (userId) => {
    try {
      const res = await api.post(endpoints.badgesCheck, { user_id: userId });
      if (res.data.success && res.data.data.new_badges?.length > 0) {
        const newOnes = mapBadges(res.data.data.new_badges);
        set((s) => ({ newBadges: [...s.newBadges, ...newOnes] }));
        return newOnes;
      }
    } catch {}
    return [];
  },

  clearNewBadges: () => set({ newBadges: [] }),
}));

function mapBadges(raw: any[]): Badge[] {
  return raw.map((b: any) => ({
    id:             b.id,
    name:           b.name,
    icon:           b.icon,
    description:    b.description,
    conditionType:  b.condition_type,
    conditionValue: b.condition_value,
    earned:         !!b.earned || !!b.earned_at,
    earnedAt:       b.earned_at,
  }));
}
