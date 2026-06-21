import { create } from "zustand";
import type { User } from "../types";
import { registerPushToken } from "../services/pushNotifications";

interface UserState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User, token: string) => void;
  logout: () => void;
}

function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function loadFromStorage(): { user: User | null; token: string | null } {
  try {
    const token = localStorage.getItem("adslife_token");
    // Clear storage immediately if the token is expired
    if (token && !isTokenValid(token)) {
      localStorage.removeItem("adslife_token");
      localStorage.removeItem("adslife_user");
      return { user: null, token: null };
    }
    const user = JSON.parse(localStorage.getItem("adslife_user") || "null");
    return { user, token };
  } catch {
    return { user: null, token: null };
  }
}

const stored = loadFromStorage();

// Already logged in from a previous session — register for push on load too.
if (stored.token && isTokenValid(stored.token)) registerPushToken();

export const useUserStore = create<UserState>((set) => ({
  user: stored.user,
  token: stored.token,
  isAuthenticated: !!stored.token && isTokenValid(stored.token),

  setUser: (user, token) => {
    localStorage.setItem("adslife_user", JSON.stringify(user));
    localStorage.setItem("adslife_token", token);
    set({ user, token, isAuthenticated: true });
    registerPushToken();
  },

  logout: () => {
    localStorage.removeItem("adslife_user");
    localStorage.removeItem("adslife_token");
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
