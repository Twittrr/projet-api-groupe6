'use client';
/**
 * @file reset/page.tsx
 * @brief Réinitialisation du mot de passe via le jeton reçu (`/reset?token=...`).
 *
 * Le jeton est lu depuis l'URL dans un effet (plutôt que `useSearchParams`) pour
 * éviter d'imposer une frontière <Suspense> au build statique.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, apiError } from '@/lib/api';
import PasswordInput from '@/components/PasswordInput';

export default function ResetPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') || '');
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setDone(true);
      setTimeout(() => router.replace('/login'), 1500);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col justify-center p-8">
      <h1 className="serif text-4xl text-tx">Nouveau mot de passe</h1>
      <p className="mt-2 text-tx2">Choisissez un nouveau mot de passe pour votre compte.</p>

      {done ? (
        <p className="mt-8 rounded-xl2 border border-bd2 bg-sf p-4 text-sm text-ok">
          Mot de passe réinitialisé ✓ Redirection vers la connexion…
        </p>
      ) : !token ? (
        <p className="mt-8 text-sm text-err">Lien invalide : jeton manquant.</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          <PasswordInput
            placeholder="Nouveau mot de passe (8+, maj, min, chiffre)"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            showStrength
          />
          {error && <p className="text-sm text-err">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="h-13 w-full rounded-xl2 bg-tx py-4 font-semibold text-bg disabled:opacity-60"
          >
            {loading ? 'Réinitialisation…' : 'Réinitialiser'}
          </button>
        </form>
      )}
    </div>
  );
}
