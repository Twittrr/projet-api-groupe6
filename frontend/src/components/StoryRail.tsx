'use client';
/**
 * @file StoryRail.tsx
 * @brief Rail horizontal de stories en tête du fil.
 *
 * Gère l'état de chargement, le fallback silencieux sur erreur réseau,
 * et l'anneau corail (non vues) / gris (vues) autour de chaque avatar.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import type { StoryGroup } from '@/lib/types';

function ringShadow(seen: boolean): string {
  const color = seen ? 'var(--c-bd2)' : 'var(--c-ac)';
  return `0 0 0 2px var(--c-bg),0 0 0 3.5px ${color}`;
}

export default function StoryRail() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    api.get('/posts/stories')
      .then((r) => setGroups(r.data.data.stories ?? []))
      .catch(() => setError(true));
  }, []);

  /* En cas d'erreur réseau : le rail reste visible mais vide (pas de crash) */
  if (error) {
    return (
      <div className="border-b border-bd px-5 py-[13px]">
        <span className="text-[11px] text-tx4">Stories temporairement indisponibles.</span>
      </div>
    );
  }

  return (
    <div className="no-scrollbar flex gap-3 overflow-x-auto border-b border-bd px-5 py-[13px]">
      {/* Ajouter sa propre story */}
      <button
        onClick={() => router.push(user ? '/story/new' : '/login')}
        className="flex flex-shrink-0 flex-col items-center gap-1.5"
      >
        <span className="flex h-[54px] w-[54px] items-center justify-center rounded-[17px] border-[1.5px] border-dashed border-bd2 bg-sf">
          <Plus size={18} className="text-tx3" />
        </span>
        <span className="text-[10px] text-tx3">Ton mot</span>
      </button>

      {groups.map((g) => (
        <button
          key={g.authorId}
          onClick={() => router.push(`/story/${g.authorId}`)}
          className="flex flex-shrink-0 flex-col items-center gap-1.5"
        >
          <span
            className="h-[54px] w-[54px] overflow-hidden rounded-[17px]"
            style={{ boxShadow: ringShadow(g.seen) }}
          >
            <span className="block h-full w-full" style={{ background: g.gradient }} />
          </span>
          <span className="max-w-[58px] truncate text-[10px] text-tx2">{g.authorUsername}</span>
        </button>
      ))}
    </div>
  );
}
