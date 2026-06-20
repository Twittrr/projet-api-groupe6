/**
 * @file auth.ts
 * @brief « Access store » de session (Zustand) : état utilisateur + actions d'auth.
 *
 * Référence : §7.3 du cahier des charges (access store partagé).
 */
import { create } from 'zustand';
import { api, setAccessToken } from '@/lib/api';
import type { User } from '@/lib/types';

/** État et actions exposés par le store d'authentification. */
interface AuthState {
  user: User | null;
  ready: boolean; // session restaurée (bootstrap terminé)
  login: (identifier: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  bootstrap: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setUser: (u: User) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  ready: false,

  login: async (identifier, password) => {
    const res = await api.post('/auth/login', { identifier, password });
    setAccessToken(res.data.data.accessToken);
    set({ user: res.data.data.user });
  },

  register: async (username, email, password) => {
    const res = await api.post('/auth/register', { username, email, password });
    setAccessToken(res.data.data.accessToken);
    set({ user: res.data.data.user });
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    setAccessToken(null);
    set({ user: null });
  },

  // Restaure la session au chargement via le cookie de refresh
  bootstrap: async () => {
    try {
      const res = await api.post('/auth/refresh');
      setAccessToken(res.data.data.accessToken);
      set({ user: res.data.data.user, ready: true });
    } catch {
      set({ user: null, ready: true });
    }
  },

  refreshMe: async () => {
    const res = await api.get('/auth/me');
    set({ user: res.data.data.user });
  },

  setUser: (u) => set({ user: u }),
}));
