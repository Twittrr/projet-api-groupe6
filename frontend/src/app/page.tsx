'use client';
/**
 * @file page.tsx
 * @brief Point d'entrée racine : redirige vers le fil ou l'accueil selon la session.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';

/** @brief Redirige vers `/feed` (authentifié) ou `/welcome` (visiteur). */
export default function Home() {
  const router = useRouter();
  const { user, ready } = useAuth();
  useEffect(() => {
    if (!ready) return;
    router.replace(user ? '/feed' : '/welcome');
  }, [ready, user, router]);
  return <div className="flex h-screen items-center justify-center text-tx3">Chargement…</div>;
}
