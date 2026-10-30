/**
 * @file theme.ts
 * @brief Store de thème clair/sombre (Fx23), persisté dans localStorage.
 */
import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  init: () => void;
}

/** @brief Applique le thème au document et le persiste localement. */
function apply(theme: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('breezy-theme', theme);
  }
}

// Fx23 — thème personnalisé (clair/sombre), persisté localement
export const useTheme = create<ThemeState>((set, get) => ({
  theme: 'light',
  toggle: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    apply(next);
    set({ theme: next });
  },
  init: () => {
    const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('breezy-theme')) as Theme | null;
    const theme = stored || 'light';
    apply(theme);
    set({ theme });
  },
}));
