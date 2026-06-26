'use client';
/**
 * @file register/page.tsx
 * @brief Écran d'inscription (Fx1).
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { apiError } from '@/lib/api';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import PasswordInput from '@/components/PasswordInput';

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuth((s) => s.register);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      router.replace('/feed');
    } catch (err) {
      setError(apiError(err, 'Inscription impossible.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col justify-center p-8">
      <h1 className="serif text-4xl text-tx">Créer un compte</h1>
      <p className="mt-2 text-tx2">Rejoignez Twittrr en quelques secondes.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-3">
        <input
          className="h-13 w-full rounded-xl2 border border-bd2 bg-sf px-4 py-3 text-tx outline-none focus:border-ac"
          placeholder="Nom d'utilisateur"
          value={form.username}
          onChange={set('username')}
        />
        <input
          type="email"
          className="h-13 w-full rounded-xl2 border border-bd2 bg-sf px-4 py-3 text-tx outline-none focus:border-ac"
          placeholder="Email"
          value={form.email}
          onChange={set('email')}
        />
        <PasswordInput
          placeholder="Mot de passe (8+, maj, min, chiffre)"
          value={form.password}
          onChange={(v) => setForm((f) => ({ ...f, password: v }))}
          autoComplete="new-password"
          showStrength
        />
        {error && <p className="text-sm text-err">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="h-13 w-full rounded-xl2 bg-ac py-4 font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>

      <div className="mt-5">
        <GoogleSignInButton onError={setError} />
      </div>

      <p className="mt-6 text-center text-sm text-tx2">
        Déjà inscrit ?{' '}
        <button onClick={() => router.push('/login')} className="font-bold text-tx">
          Se connecter
        </button>
      </p>
    </div>
  );
}
