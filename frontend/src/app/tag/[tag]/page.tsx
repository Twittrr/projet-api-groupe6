'use client';
/**
 * @file tag/[tag]/page.tsx
 * @brief Recherche de posts par tag (Fx13).
 */
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import PostCard from '@/components/PostCard';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import type { Post } from '@/lib/types';

// Fx13 — Recherche par tag
export default function TagPage() {
  const { tag: rawTag } = useParams<{ tag: string }>();
  const tag = decodeURIComponent(rawTag ?? '');
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!tag) return;
    api.get(`/posts/tag/${encodeURIComponent(tag)}`).then((r) => setPosts(r.data.data.posts)).catch(() => {});
  }, [tag]);

  return (
    <AppShell>
      <AppHeader title={`#${tag}`} back />
      <main className="space-y-2.5 p-3 pb-24 lg:pb-6">
        {posts.map((p) => <PostCard key={p.id} post={p} />)}
        {posts.length === 0 && <p className="py-10 text-center text-tx3">Aucun message avec ce tag.</p>}
      </main>
    </AppShell>
  );
}
