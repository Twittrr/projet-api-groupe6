/**
 * @file auth.ts
 * @brief « Access store » de session (Zustand) : état utilisateur + actions d'auth.
 *
 * Référence : §7.3 du cahier des charges (access store partagé).
 */
import { create } from 'zustand';
import { api, setAccessToken, setOnRefreshFailed } from '@/lib/api';
import { useLang } from '@/store/lang';
import type { User } from '@/lib/types';

function syncLang(user: User) {
  if (user.language === 'fr' || user.language === 'en') {
    useLang.getState().setLang(user.language);
  }
}

/** État et actions exposés par le store d'authentification. */
interface AuthState {
  user: User | null;
  ready: boolean; // session restaurée (bootstrap terminé)
  login: (identifier: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
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
    const { accessToken, user } = res.data.data;
    setAccessToken(accessToken);
    syncLang(user);
    set({ user });
  },

  loginWithGoogle: async (credential) => {
    const res = await api.post('/auth/google', { credential });
    const { accessToken, user } = res.data.data;
    setAccessToken(accessToken);
    syncLang(user);
    set({ user });
  },

  register: async (username, email, password) => {
    const res = await api.post('/auth/register', { username, email, password });
    const { accessToken, user } = res.data.data;
    setAccessToken(accessToken);
    syncLang(user);
    set({ user });
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
      const { accessToken, user } = res.data.data;
      setAccessToken(accessToken);
      syncLang(user);
      set({ user, ready: true });
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

// Déconnecte proprement si le refresh token expire côté serveur
setOnRefreshFailed(() => {
  setAccessToken(null);
  useAuth.setState({ user: null });
});
