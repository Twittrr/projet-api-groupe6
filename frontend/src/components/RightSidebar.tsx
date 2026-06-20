'use client';
/**
 * @file RightSidebar.tsx
 * @brief Colonne de droite (desktop) : recherche, suggestions à suivre, tags tendances.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import Avatar from './Avatar';
import type { User } from '@/lib/types';

interface TrendingTag {
  tag: string;
  count: number;
}

/**
 * @brief Affiche les modules latéraux desktop (cachés sous le point de rupture `lg`).
 */
export default function RightSidebar() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [tags, setTags] = useState<TrendingTag[]>([]);

  useEffect(() => {
    if (user) api.get('/users/suggestions').then((r) => setSuggestions(r.data.data.users)).catch(() => {});
    api.get('/posts/tags/trending').then((r) => setTags(r.data.data.tags)).catch(() => {});
  }, [user]);

  /** @brief Suit un utilisateur suggéré puis le retire de la liste. */
  async function follow(id: string) {
    await api.post(`/users/${id}/follow`).catch(() => {});
    setSuggestions((list) => list.filter((u) => u.id !== id));
  }

  return (
    <aside className="hidden w-[300px] flex-shrink-0 px-5 py-5 lg:block">
      <div className="sticky top-5 space-y-4">
        {/* Recherche (renvoie vers l'écran Explorer) */}
        <button onClick={() => router.push('/explore')} className="flex w-full items-center gap-2 rounded-2xl bg-sf px-4 py-2.5 text-left text-sm text-tx3">
          <Search size={16} /> Rechercher sur Breezy
        </button>

        {/* Suggestions « à suivre » */}
        {user && suggestions.length > 0 && (
          <section className="rounded-[22px] border border-bd bg-sf p-4">
            <h3 className="serif mb-3 text-lg text-tx">À suivre</h3>
            <div className="space-y-3">
              {suggestions.map((u) => (
                <div key={u.id} className="flex items-center gap-2.5">
                  <button onClick={() => router.push(`/profile/${u.username}`)} aria-label={`Profil de @${u.username}`}>
                    <Avatar username={u.username} size={36} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-tx">{u.displayName}</div>
                    <div className="truncate text-xs text-tx3">@{u.username}</div>
                  </div>
                  <button onClick={() => follow(u.id)} className="rounded-full bg-tx px-3 py-1 text-xs font-semibold text-bg">
                    Suivre
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tags tendances */}
        {tags.length > 0 && (
          <section className="rounded-[22px] border border-bd bg-sf p-4">
            <h3 className="serif mb-2 text-lg text-tx">Tendances</h3>
            <ul className="space-y-1.5">
              {tags.map((t) => (
                <li key={t.tag}>
                  <button onClick={() => router.push(`/tag/${t.tag}`)} className="flex w-full justify-between text-sm">
                    <span className="font-medium text-ac">#{t.tag}</span>
                    <span className="text-tx3">{t.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="px-2 text-[11px] leading-relaxed text-tx4">Breezy v0.2 — un journal social, plus lent, plus soigné.</p>
      </div>
    </aside>
  );
}
