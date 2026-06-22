'use client';
/**
 * @file explore/page.tsx
 * @brief Écran Explorer : recherche par @utilisateur, #tag ou mot-clé dans le contenu.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import Avatar from '@/components/Avatar';
import PostCard from '@/components/PostCard';
import AppShell from '@/components/AppShell';
import type { Post, User } from '@/lib/types';

type SearchMode = 'user' | 'tag' | 'keyword';

function getMode(q: string): SearchMode {
  if (q.startsWith('@')) return 'user';
  if (q.startsWith('#')) return 'tag';
  return 'keyword';
}

export default function ExplorePage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);

  useEffect(() => {
    api.get('/posts/explore').then((r) => setPosts(r.data.data.posts)).catch(() => {});
  }, []);

  useEffect(() => {
    const raw = q.trim();
    if (raw.length < 1) { setUsers([]); setPostResults([]); return; }

    const mode = getMode(raw);
    const term = raw.replace(/^[@#]/, '');

    const t = setTimeout(() => {
      if (mode === 'user') {
        api.get(`/users/search?q=${encodeURIComponent(term)}&limit=10`)
          .then((r) => { setUsers(r.data.data.users ?? []); setPostResults([]); })
          .catch(() => {});
        return;
      }
      if (mode === 'tag') {
        api.get(`/posts/tag/${encodeURIComponent(term)}`)
          .then((r) => { setPostResults(r.data.data.posts ?? []); setUsers([]); })
          .catch(() => {});
        return;
      }
      // keyword: search both users and posts in parallel
      Promise.all([
        api.get(`/users/search?q=${encodeURIComponent(term)}&limit=5`).catch(() => null),
        api.get(`/posts/search?q=${encodeURIComponent(term)}&limit=10`).catch(() => null),
      ]).then(([uRes, pRes]) => {
        setUsers(uRes?.data.data.users ?? []);
        setPostResults(pRes?.data.data.posts ?? []);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const hasQuery = q.trim().length > 0;
  const mode = getMode(q.trim());
  const noResults = users.length === 0 && postResults.length === 0;

  return (
    <AppShell>
      <header className="sticky top-0 z-20 border-b border-bd bg-bg/90 p-3 backdrop-blur">
        <div className="flex items-center gap-2 rounded-xl2 bg-sf px-3 py-2.5">
          <Search size={18} className="text-tx3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="@user  #tag  ou mot-clé…"
            className="w-full bg-transparent text-sm text-tx outline-none placeholder:text-tx4"
          />
        </div>
      </header>

      <main className="p-3 pb-24 lg:pb-6">
        {!hasQuery && (
          <>
            <h2 className="serif mb-2 text-xl text-tx">Explorer</h2>
            <div className="space-y-2.5">
              {posts.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          </>
        )}

        {hasQuery && noResults && (
          <p className="py-10 text-center text-sm text-tx3">
            Aucun résultat pour « {q.trim()} »
          </p>
        )}

        {hasQuery && users.length > 0 && (
          <section className="mb-4">
            {mode === 'keyword' && (
              <h3 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-tx3">Utilisateurs</h3>
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
          </section>
        )}

        {hasQuery && postResults.length > 0 && (
          <section>
            {mode === 'keyword' && (
              <h3 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-tx3">Publications</h3>
            )}
            <div className="space-y-2.5">
              {postResults.map((p) => <PostCard key={p.id} post={p} />)}
            </div>
          </section>
        )}
      </main>
    </AppShell>
  );
}
