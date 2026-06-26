'use client';
/**
 * @file GoogleSignInButton.tsx
 * @brief Bouton « Se connecter avec Google » (Google Identity Services, connexion en 2 clics).
 *
 * Charge le SDK GIS, initialise le client avec NEXT_PUBLIC_GOOGLE_CLIENT_ID, puis affiche le
 * bouton officiel. À la réception du jeton d'identité, délègue au store d'auth (loginWithGoogle)
 * et redirige vers le fil. Si l'identifiant client n'est pas configuré, le composant ne rend rien
 * (l'authentification classique par e-mail reste pleinement fonctionnelle).
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/store/theme';
import { apiError } from '@/lib/api';

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const GSI_SRC = 'https://accounts.google.com/gsi/client';

/** Charge le script GIS une seule fois (mémoïsé au niveau module). */
let gsiPromise: Promise<void> | null = null;
function loadGsi(): Promise<void> {
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((resolve, reject) => {
    if (typeof document === 'undefined') return;
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('GSI_LOAD_FAILED'));
    document.head.appendChild(script);
  });
  return gsiPromise;
}

/** Logo « G » multicolore officiel de Google. */
function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

type GoogleCredentialResponse = { credential?: string };

export function GoogleSignInButton({ onError }: Readonly<{ onError?: (message: string) => void }>) {
  const router = useRouter();
  const loginWithGoogle = useAuth((s) => s.loginWithGoogle);
  const theme = useTheme((s) => s.theme);
  const ref = useRef<HTMLDivElement>(null);
  const [gisReady, setGisReady] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    async function handleCredential(response: GoogleCredentialResponse) {
      if (!response.credential) return;
      try {
        await loginWithGoogle(response.credential);
        router.replace('/feed');
      } catch (err) {
        onError?.(apiError(err, 'Connexion Google impossible.'));
      }
    }

    loadGsi()
      .then(() => {
        if (cancelled) return;
        const google = (globalThis as unknown as { google?: any }).google;
        if (!google?.accounts?.id || !ref.current) return;
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: handleCredential,
        });
        ref.current.replaceChildren();
        google.accounts.id.renderButton(ref.current, {
          type: 'standard',
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'center',
          width: 320,
        });
        setGisReady(true);
      })
      .catch(() => onError?.('Le service Google est indisponible pour le moment.'));

    return () => {
      cancelled = true;
    };
  }, [loginWithGoogle, router, theme, onError]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-3 self-stretch text-xs text-tx3">
        <span className="h-px flex-1 bg-bd2" />
        ou
        <span className="h-px flex-1 bg-bd2" />
      </div>

      {/* Bouton officiel Google (rempli par GIS lorsque l'identifiant client est configuré). */}
      {CLIENT_ID && <div ref={ref} className="min-h-[44px]" />}

      {/* Repli visible : si non configuré, ou tant que GIS n'a pas fini de s'initialiser. */}
      {(!CLIENT_ID || !gisReady) && (
        <button
          type="button"
          onClick={() =>
            onError?.(
              CLIENT_ID
                ? 'Connexion Google en cours d’initialisation, réessayez dans un instant.'
                : "La connexion Google n'est pas encore configurée sur ce serveur.",
            )
          }
          className="flex h-12 w-full max-w-[320px] items-center justify-center gap-3 rounded-full border border-bd2 bg-bg text-sm font-semibold text-tx transition hover:bg-sf"
        >
          <GoogleGlyph />
          Continuer avec Google
        </button>
      )}
    </div>
  );
}
