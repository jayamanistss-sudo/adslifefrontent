import { create } from 'zustand';
import type { User } from '../types';

interface UserState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User, token: string) => void;
  logout: () => void;
}

function loadFromStorage(): { user: User | null; token: string | null } {
  try {
    const user  = JSON.parse(localStorage.getItem('adslife_user') || 'null');
    const token = localStorage.getItem('adslife_token');
    return { user, token };
  } catch {
    return { user: null, token: null };
  }
}

const stored = loadFromStorage();

export const useUserStore = create<UserState>((set) => ({
  user:            stored.user,
  token:           stored.token,
  isAuthenticated: !!stored.token,

  setUser: (user, token) => {
    localStorage.setItem('adslife_user',  JSON.stringify(user));
    localStorage.setItem('adslife_token', token);
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('adslife_user');
    localStorage.removeItem('adslife_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
