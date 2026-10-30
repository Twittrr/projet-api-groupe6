'use client';
/**
 * @file AppHeader.tsx
 * @brief En-tête simple d'écran secondaire (titre serif + bouton retour optionnel).
 */
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

/**
 * @brief Affiche un en-tête collant avec titre et flèche de retour facultative.
 * @param title Titre affiché.
 * @param back Si vrai, affiche un bouton de retour vers l'écran précédent.
 */
export default function AppHeader({ title, back = false }: Readonly<{ title: string; back?: boolean }>) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-bd bg-bg/90 px-4 py-3 backdrop-blur">
      {back && (
        <button onClick={() => router.back()} aria-label="Retour" className="text-tx">
          <ChevronLeft size={22} />
        </button>
      )}
      <h1 className="serif text-2xl text-tx">{title}</h1>
    </header>
  );
}
