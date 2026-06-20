'use client';
/**
 * @file report/page.tsx
 * @brief Signalement de contenu inapproprié (Fx20).
 */
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, apiError } from '@/lib/api';
import AppHeader from '@/components/AppHeader';

const REASONS = ['Spam', 'Harcèlement', 'Contenu haineux', 'Désinformation', 'Contenu explicite', 'Autre'];

function ReportForm() {
  const router = useRouter();
  const params = useSearchParams();
  const targetType = (params.get('type') || 'post') as 'post' | 'comment' | 'user';
  const targetId = params.get('id') || '';
  const [reason, setReason] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!reason) return;
    try {
      await api.post('/posts/reports', { targetType, targetId, reason });
      setDone(true);
      setTimeout(() => router.back(), 1200);
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[600px] flex-col border-x border-bd">
      <AppHeader title="Signaler" back />
      <main className="flex-1 p-4">
        {done ? (
          <p className="py-16 text-center text-ok">Merci, votre signalement a été transmis à la modération.</p>
        ) : (
          <>
            <p className="mb-4 text-sm text-tx2">Pourquoi signalez-vous ce contenu ?</p>
            <div className="space-y-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full rounded-xl2 border p-3 text-left text-sm ${reason === r ? 'border-ac bg-ac2 text-ac' : 'border-bd2 text-tx'}`}
                >
                  {r}
                </button>
              ))}
            </div>
            {error && <p className="mt-3 text-sm text-err">{error}</p>}
            <button
              onClick={submit}
              disabled={!reason}
              className="mt-6 w-full rounded-xl2 bg-err py-3 font-semibold text-white disabled:opacity-40"
            >
              Soumettre le signalement
            </button>
          </>
        )}
      </main>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-tx3">Chargement…</div>}>
      <ReportForm />
    </Suspense>
  );
}
