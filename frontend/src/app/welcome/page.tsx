'use client';
/**
 * @file welcome/page.tsx
 * @brief Écran d'onboarding — design "dad." (grain de papier, hero serif corail, CGU).
 *
 * Fidèle au mockup : fond paper + texture grain, typographie Instrument Serif oversized,
 * accent corail sur le mot-clé, deux CTA principaux + lien secondaire d'exploration.
 */
import { useRouter } from 'next/navigation';

export default function Welcome() {
  const router = useRouter();

  return (
    <div className="grain relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col justify-between bg-paper p-8">

      {/* En-tête : logo + lien "passer" */}
      <header className="flex items-center justify-between pt-6">
        <div className="flex items-center gap-2">
          <span className="serif flex h-8 w-8 items-center justify-center rounded-xl bg-ink-950 text-base text-paper">d</span>
          <span className="serif text-2xl text-ink-950">dad.</span>
        </div>
        <button
          onClick={() => router.push('/explore')}
          className="text-xs text-ink-900/60 underline-offset-4 hover:underline"
        >
          passer
        </button>
      </header>

      {/* Hero */}
      <div className="flex flex-col gap-5 py-12">
        <h1 className="serif text-[52px] leading-[0.95] text-ink-950">
          Écris<br />
          moins.<br />
          <em className="text-coral-500">Pense</em> mieux.
        </h1>
        <p className="text-[15px] leading-relaxed text-ink-900/70">
          Un fil pour partager une idée, une image, un instant — sans la course aux likes.
        </p>
      </div>

      {/* CTA */}
      <div className="space-y-3 pb-8">
        <button
          onClick={() => router.push('/register')}
          className="h-12 w-full rounded-2xl bg-ink-950 font-semibold text-sm text-paper transition hover:bg-ink-900"
        >
          Créer un compte
        </button>
        <button
          onClick={() => router.push('/login')}
          className="h-12 w-full rounded-2xl border border-ink-200 bg-paper font-semibold text-sm text-ink-950 transition hover:bg-ink-100"
        >
          J&apos;ai déjà un compte
        </button>
        <p className="text-center text-[11px] text-ink-900/50 pt-1">
          En continuant, vous acceptez les{' '}
          <span className="underline cursor-pointer">CGU</span> et la{' '}
          <span className="underline cursor-pointer">politique de confidentialité</span>.
        </p>
      </div>
    </div>
  );
}
