'use client';
/**
 * @file forgot/page.tsx
 * @brief Demande de réinitialisation de mot de passe (Fx — mot de passe oublié).
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, apiError } from '@/lib/api';

export default function ForgotPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [devLink, setDevLink] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await api.post('/auth/forgot-password', { email });
      setDone(true);
      // Hors production, le backend renvoie le lien pour faciliter le test (pas d'e-mail réel).
      if (r.data?.data?.resetLink) setDevLink(r.data.data.resetLink);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col justify-center p-8">
      <h1 className="serif text-4xl text-tx">Mot de passe oublié</h1>
      <p className="mt-2 text-tx2">Entrez votre e-mail : nous vous enverrons un lien de réinitialisation.</p>

      {done ? (
        <div className="mt-8 space-y-4">
          <p className="rounded-xl2 border border-bd2 bg-sf p-4 text-sm text-tx">
            Si un compte existe pour cet e-mail, un lien de réinitialisation vient d&apos;être envoyé.
          </p>
          {devLink && (
            <p className="break-all rounded-xl2 border border-bd2 bg-sf p-3 text-xs text-tx2">
              Lien de test (dév.) :{' '}
              <a href={devLink} className="text-ac underline">{devLink}</a>
            </p>
          )}
          <button onClick={() => router.push('/login')} className="font-bold text-tx">
            ← Retour à la connexion
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          <input
            type="email"
            className="h-13 w-full rounded-xl2 border border-bd2 bg-sf px-4 py-3 text-tx outline-none focus:border-ac"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          {error && <p className="text-sm text-err">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="h-13 w-full rounded-xl2 bg-tx py-4 font-semibold text-bg disabled:opacity-60"
          >
            {loading ? 'Envoi…' : 'Envoyer le lien'}
          </button>
          <button type="button" onClick={() => router.push('/login')} className="mt-2 block text-sm text-tx2 hover:text-tx">
            ← Retour à la connexion
          </button>
        </form>
      )}
    </div>
  );
}
