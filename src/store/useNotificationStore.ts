import { create } from 'zustand';
import type { Notification } from '../types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Notification) => void;
  markRead: (id: number) => void;
  markAllRead: () => void;
  /** unreadCount: pass the backend's authoritative count when available —
   *  deriving it from the fetched list undercounts once a user has more
   *  than the list's page size (30) unread. */
  setNotifications: (ns: Notification[], unreadCount?: number) => void;
  setUnreadCount: (n: number) => void;
  removeNotification: (id: number) => void;
  clearAll: () => void;
}

// A push can arrive via both the Socket.IO realtime channel and an FCM
// foreground message for the same event — dedupe by content signature within
// a short window instead of trying to invent a shared id between the two.
const recentSignatures = new Map<string, number>();
const DEDUPE_WINDOW_MS = 4000;
function isDuplicate(n: Notification): boolean {
  const sig = `${n.type}|${n.title}|${n.body}`;
  const now = Date.now();
  for (const [key, ts] of recentSignatures) {
    if (now - ts > DEDUPE_WINDOW_MS) recentSignatures.delete(key);
  }
  if (recentSignatures.has(sig)) return true;
  recentSignatures.set(sig, now);
  return false;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount:   0,

  setNotifications: (ns, unreadCount) =>
    set({ notifications: ns, unreadCount: unreadCount ?? ns.filter((n) => !n.isRead).length }),

  setUnreadCount: (n) => set({ unreadCount: Math.max(0, n) }),

  addNotification: (n) =>
    set((s) => {
      if (isDuplicate(n)) return s;
      return {
        notifications: [n, ...s.notifications],
        unreadCount: s.unreadCount + (n.isRead ? 0 : 1),
      };
    }),

  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => n.id === id ? { ...n, isRead: true } : n),
      unreadCount:   Math.max(0, s.unreadCount - 1),
    })),

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount:   0,
    })),

  removeNotification: (id) =>
    set((s) => {
      const removed = s.notifications.find((n) => n.id === id);
      return {
        notifications: s.notifications.filter((n) => n.id !== id),
        unreadCount: removed && !removed.isRead ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
      };
    }),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));
