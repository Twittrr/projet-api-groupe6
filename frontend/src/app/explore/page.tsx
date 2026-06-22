'use client';
/**
 * @file explore/page.tsx
 * @brief Écran Explorer : recherche d'utilisateurs et posts récents de la plateforme.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import Avatar from '@/components/Avatar';
import PostCard from '@/components/PostCard';
import AppShell from '@/components/AppShell';
import type { Post, User } from '@/lib/types';

export default function ExplorePage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    api.get('/posts/explore').then((r) => setPosts(r.data.data.posts)).catch(() => {});
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 1) { setUsers([]); return; }
    const t = setTimeout(() => {
      api.get(`/users/search?q=${encodeURIComponent(term)}&limit=8`).then((r) => setUsers(r.data.data.users ?? [])).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <AppShell>
      <header className="sticky top-0 z-20 border-b border-bd bg-bg/90 p-3 backdrop-blur">
        <div className="flex items-center gap-2 rounded-xl2 bg-sf px-3 py-2.5">
          <Search size={18} className="text-tx3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher des utilisateurs…"
            className="w-full bg-transparent text-sm text-tx outline-none placeholder:text-tx4"
          />
        </div>
      </header>

      <main className="p-3 pb-24 lg:pb-6">
        {q.trim().length > 0 ? (
          <>
            {users.length === 0 && (
              <p className="py-10 text-center text-sm text-tx3">Aucun résultat pour « {q.trim()} »</p>
            )}
            <div className="space-y-1">
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => router.push(`/profile/${u.username}`)}
                  className="flex w-full items-center gap-3 rounded-xl2 p-2 text-left hover:bg-sf"
                >
                  <Avatar username={u.username} size={40} />
                  <div>
                    <div className="text-sm font-semibold text-tx">{u.displayName}</div>
                    <div className="text-xs text-tx3">@{u.username}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="serif mb-2 text-xl text-tx">Explorer</h2>
            <div className="space-y-2.5">
              {posts.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}
