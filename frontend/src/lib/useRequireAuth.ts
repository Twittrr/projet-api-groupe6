'use client';
/**
 * @file useRequireAuth.ts
 * @brief Hook de garde de navigation (contrôle d'accès frontend, §9.1 du cahier).
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import type { Role } from '@/lib/types';

/**
 * @brief Redirige les visiteurs non autorisés et expose l'utilisateur courant.
 * @param roles Rôles autorisés ; si fourni, un rôle non listé renvoie vers `/feed`.
 * @returns `{ user, ready }` — l'utilisateur courant et l'état de restauration de session.
 */
export function useRequireAuth(roles?: Role[]) {
  const router = useRouter();
  const { user, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace('/login');
    } else if (roles && !roles.includes(user.role)) {
      router.replace('/feed');
    }
  }, [ready, user, roles, router]);

  return { user, ready };
}
