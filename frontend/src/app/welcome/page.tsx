'use client';
/**
 * @file welcome/page.tsx
 * @brief Écran d'onboarding Twittrr — thémé clair/sombre, responsive mobile → desktop.
 *
 * Mobile : flux vertical (logo, hero serif oversized, CTA empilés).
 * Desktop (lg) : mise en page deux colonnes — hero à gauche, carte d'accès à droite.
 * Toutes les couleurs utilisent les tokens thémés (bg/tx/ac…) pour suivre le thème actif.
 */
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';

export default function Welcome() {
  const router = useRouter();

  return (
    <div className="grain relative min-h-screen w-full bg-bg text-tx">
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col justify-between p-8 lg:max-w-[1080px] lg:grid lg:grid-cols-2 lg:items-center lg:gap-20 lg:p-16">

        {/* Colonne marque + hero */}
        <div className="flex flex-1 flex-col lg:flex-none">
          <header className="flex items-center justify-between pt-6 lg:pt-0">
            <Logo withWord />
            <button
              onClick={() => router.push('/explore')}
              className="text-xs text-tx3 underline-offset-4 hover:underline lg:hidden"
            >
              passer
            </button>
          </header>

          <div className="flex flex-col gap-5 py-12 lg:mt-12 lg:py-0">
            <h1 className="serif text-[52px] leading-[0.95] text-tx lg:text-[78px]">
              Écris<br />
              moins.<br />
              <em className="text-ac">Pense</em> mieux.
            </h1>
            <p className="text-[15px] leading-relaxed text-tx2 lg:max-w-md lg:text-lg">
              Un fil pour partager une idée, une image, un instant — sans la course aux likes.
            </p>
          </div>
        </div>

        {/* Colonne accès (carte sur desktop) */}
        <div className="space-y-3 pb-8 lg:rounded-[28px] lg:border lg:border-bd lg:bg-sf lg:p-9 lg:pb-9 lg:shadow-soft">
          <div className="hidden lg:mb-3 lg:block">
            <h2 className="serif text-2xl text-tx">Bienvenue sur Twittrr</h2>
            <p className="mt-1 text-sm text-tx2">Créez votre compte ou connectez-vous pour commencer.</p>
          </div>

          <button
            onClick={() => router.push('/register')}
            className="h-12 w-full rounded-2xl bg-tx font-semibold text-sm text-bg transition hover:opacity-90"
          >
            Créer un compte
          </button>
          <button
            onClick={() => router.push('/login')}
            className="h-12 w-full rounded-2xl border border-bd2 bg-bg font-semibold text-sm text-tx transition hover:bg-sf2"
          >
            J&apos;ai déjà un compte
          </button>
          <button
            onClick={() => router.push('/explore')}
            className="hidden w-full pt-1 text-center text-sm text-tx3 underline-offset-4 hover:underline lg:block"
          >
            Explorer sans compte
          </button>
          <p className="text-center text-[11px] text-tx3 pt-1">
            En continuant, vous acceptez les{' '}
            <span className="underline cursor-pointer">CGU</span> et la{' '}
            <button
              type="button"
              onClick={() => router.push('/privacy')}
              className="underline underline-offset-2 hover:text-tx2"
            >
              politique de confidentialité
            </button>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
