/**
 * @file avatars.ts
 * @brief Cache global des photos de profil par username (Zustand).
 *
 * Les posts/commentaires/notifications ne portent que `authorUsername`, pas l'avatar.
 * Plutôt que dénormaliser l'avatar partout (et gérer la péremption), on le résout à la
 * volée : chaque <Avatar> sans `avatarUrl` explicite demande son username, les demandes
 * sont regroupées (fenêtre de 40 ms) en un seul appel `/users/avatars`, et le résultat
 * est mis en cache. Reste frais (relit la source) et corrige tous les écrans d'un coup.
 */
import { create } from 'zustand';
import { api } from '@/lib/api';

interface AvatarState {
  /** username (minuscule) → URL d'avatar, ou null si aucun/inconnu (évite de redemander). */
  map: Record<string, string | null>;
  _queue: Set<string>;
  _timer: ReturnType<typeof setTimeout> | null;
  /** Demande la résolution de l'avatar d'un username (no-op si déjà connu/en file). */
  request: (username: string) => void;
}

export const useAvatarStore = create<AvatarState>((set, get) => ({
  map: {},
  _queue: new Set(),
  _timer: null,
  request(username) {
    const key = (username || '').toLowerCase();
    if (!key) return;
    const s = get();
    if (key in s.map || s._queue.has(key)) return; // déjà résolu ou en attente
    s._queue.add(key);
    if (s._timer) return; // un flush est déjà programmé

    const timer = setTimeout(async () => {
      const batch = Array.from(get()._queue).slice(0, 100);
      set({ _queue: new Set(), _timer: null });
      try {
        const qs = batch.map(encodeURIComponent).join(',');
        const r = await api.get(`/users/avatars?usernames=${qs}`);
        const found: Record<string, string | null> = {};
        for (const u of r.data.data.users ?? []) {
          found[String(u.username).toLowerCase()] = u.avatarUrl ?? null;
        }
        // Tout username demandé mais absent de la réponse → null (pas d'avatar / inconnu).
        const patch: Record<string, string | null> = {};
        for (const k of batch) patch[k] = found[k] ?? null;
        set((st) => ({ map: { ...st.map, ...patch } }));
      } catch {
        // Échec réseau : on ne met rien en cache → les clés pourront être redemandées.
      }
    }, 40);
    set({ _timer: timer });
  },
}));
