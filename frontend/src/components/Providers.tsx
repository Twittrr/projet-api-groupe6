'use client';
/**
 * @file Providers.tsx
 * @brief Initialisation globale côté client : thème, restauration de session, navigation mobile.
 *
 * BottomNav est rendu ici (enfant direct de body via le layout) pour que
 * position:fixed soit toujours relatif au viewport, sans aucun ancêtre interférant.
 */
import { useEffect } from 'react';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/store/theme';
import BottomNav from './BottomNav';

/**
 * @brief Enveloppe l'application ; applique le thème, restaure la session au montage,
 *        et injecte la barre de navigation mobile au niveau racine.
 */
export default function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  const bootstrap = useAuth((s) => s.bootstrap);
  const initTheme = useTheme((s) => s.init);

  useEffect(() => {
    initTheme();
    bootstrap();
  }, [bootstrap, initTheme]);

  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}
