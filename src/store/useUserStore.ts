import { create } from "zustand";
import type { User } from "../types";
import { registerPushToken, unregisterPushToken } from "../services/pushNotifications";
import { connectNotificationSocket, disconnectNotificationSocket } from "../services/notificationSocket";

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  // False until the initial cookie-session check (App.tsx, on mount) resolves.
  // ProtectedRoute must wait for this instead of trusting isAuthenticated's
  // default — there's no JS-readable token to derive it from synchronously
  // anymore, so an already-logged-in user would otherwise get bounced to
  // /login on every page load/refresh before the check completes.
  authChecked: boolean;
  setUser: (user: User) => void;
  updateUser: (fields: Partial<User>) => void;
  // Called once by App.tsx's bootstrap check with the /auth/me result (or
  // null if the cookie session is absent/invalid).
  setAuthChecked: (user: User | null) => void;
  logout: () => void;
}

// The JWT itself is no longer kept anywhere JS can read — it lives only in
// the httpOnly cookie the backend already sets on login/register (auth.
// controller.ts's setAuthCookie), which was already authenticating every
// request ahead of the Bearer header. Keeping a second, JS-readable copy in
// localStorage was pure unnecessary XSS attack surface. This cache is only
// the *user object* (name/avatar/etc.) for a fast initial paint — never
// trusted to mean "logged in" on its own; authChecked/isAuthenticated is
// only ever set from a real server response.
function loadCachedUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem("adslife_user") || "null");
  } catch {
    return null;
  }
}

export const useUserStore = create<UserState>((set) => ({
  user: loadCachedUser(),
  isAuthenticated: false,
  authChecked: false,

  setUser: (user) => {
    localStorage.setItem("adslife_user", JSON.stringify(user));
    set({ user, isAuthenticated: true, authChecked: true });
    registerPushToken();
    connectNotificationSocket();
  },

  updateUser: (fields) => {
    set((state) => {
      if (!state.user) return {};
      const updated = { ...state.user, ...fields };
      localStorage.setItem("adslife_user", JSON.stringify(updated));
      return { user: updated };
    });
  },

  setAuthChecked: (user) => {
    if (user) {
      localStorage.setItem("adslife_user", JSON.stringify(user));
      set({ user, isAuthenticated: true, authChecked: true });
      registerPushToken();
      connectNotificationSocket();
    } else {
      localStorage.removeItem("adslife_user");
      set({ user: null, isAuthenticated: false, authChecked: true });
    }
  },

  logout: () => {
    unregisterPushToken().catch(() => {});
    disconnectNotificationSocket();
    localStorage.removeItem("adslife_user");
    set({ user: null, isAuthenticated: false });
  },
}));
