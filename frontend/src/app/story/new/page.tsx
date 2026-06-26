'use client';
/**
 * @file story/new/page.tsx
 * @brief Composer de story : choix d'un dégradé de fond et d'un court texte.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, apiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';
import AppHeader from '@/components/AppHeader';

const GRADIENTS = [
  'linear-gradient(135deg,#FF6F59,#C2412B)', // corail → brique
  'linear-gradient(135deg,#3E7C5A,#1F4D38)', // mousse profonde
  'linear-gradient(135deg,#2F8E86,#185A55)', // sapin / teal
  'linear-gradient(135deg,#D69A3A,#A86A1E)', // ocre doré
  'linear-gradient(135deg,#4E6E92,#2C3F55)', // bleu ardoise
  'linear-gradient(135deg,#B5503A,#7C2D1E)', // terracotta
];

export default function NewStoryPage() {
  const router = useRouter();
  const { user, ready } = useRequireAuth();
  const [gradient, setGradient] = useState(GRADIENTS[0]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  if (!ready || !user) return <div className="flex h-screen items-center justify-center text-tx3">Chargement…</div>;

  async function publish() {
    try {
      await api.post('/posts/stories', { gradient, text });
      router.replace('/feed');
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader title="Nouvelle story" back />
      <main className="flex-1 p-4 pb-24 lg:pb-4">
        {/* Aperçu */}
        <div className="relative mx-auto flex aspect-[9/16] max-h-[60vh] w-full max-w-[280px] items-center justify-center rounded-3xl p-6" style={{ background: gradient }}>
          <p className="serif text-center text-2xl text-white drop-shadow">{text || 'Ton mot du jour…'}</p>
        </div>

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={120}
          placeholder="Écris quelque chose…"
          className="mt-4 w-full rounded-xl2 border border-bd2 bg-sf px-4 py-3 text-tx outline-none focus:border-ac"
        />

        <div className="mt-4 flex flex-wrap gap-2">
          {GRADIENTS.map((g) => (
            <button
              key={g}
              onClick={() => setGradient(g)}
              aria-label="Choisir un fond"
              className={`h-10 w-10 rounded-xl ${gradient === g ? 'ring-2 ring-ac ring-offset-2 ring-offset-bg' : ''}`}
              style={{ background: g }}
            />
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-err">{error}</p>}
        <button onClick={publish} className="mt-6 w-full rounded-xl2 bg-tx py-3 font-semibold text-bg">
          Publier ma story
        </button>
      </main>
    </div>
  );
}
