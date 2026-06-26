'use client';
/**
 * @file login/page.tsx
 * @brief Écran de connexion (Fx2).
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { apiError } from '@/lib/api';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import PasswordInput from '@/components/PasswordInput';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(identifier, password);
      router.replace('/feed');
    } catch (err) {
      setError(apiError(err, 'Connexion impossible.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col justify-center p-8">
      <h1 className="serif text-4xl text-tx">Bon retour.</h1>
      <p className="mt-2 text-tx2">Connectez-vous pour retrouver votre fil.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-3">
        <input
          className="h-13 w-full rounded-xl2 border border-bd2 bg-sf px-4 py-3 text-tx outline-none focus:border-ac"
          placeholder="Nom d'utilisateur ou email"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoComplete="username"
        />
        <PasswordInput
          placeholder="Mot de passe"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        <div className="text-right">
          <button
            type="button"
            onClick={() => router.push('/forgot')}
            className="text-sm text-tx2 hover:text-tx"
          >
            Mot de passe oublié ?
          </button>
        </div>
        {error && <p className="text-sm text-err">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="h-13 w-full rounded-xl2 bg-tx py-4 font-semibold text-bg disabled:opacity-60"
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <div className="mt-5">
        <GoogleSignInButton onError={setError} />
      </div>

      <p className="mt-6 text-center text-sm text-tx2">
        Pas de compte ?{' '}
        <button onClick={() => router.push('/register')} className="font-bold text-tx">
          Créer
        </button>
      </p>
    </div>
  );
}
