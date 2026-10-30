/**
 * @file lang.ts
 * @brief Store Zustand pour la langue d'interface (Fx22).
 * Persisté dans localStorage sous la clé "breezy-lang".
 */
import { create } from 'zustand';
import type { Lang } from '@/lib/i18n';

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
}

export const useLang = create<LangState>()((set) => ({
  lang: 'fr',
  setLang: (lang) => {
    try { localStorage.setItem('breezy-lang', lang); } catch {}
    set({ lang });
  },
}));

// Hydratation côté client : restaure la langue depuis localStorage au chargement du module.
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('breezy-lang') as Lang | null;
  if (stored === 'fr' || stored === 'en') {
    useLang.setState({ lang: stored });
  }
}
