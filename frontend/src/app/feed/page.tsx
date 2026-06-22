'use client';
/**
 * @file feed/page.tsx
 * @brief Écran principal : fil chronologique avec onglets « Pour toi » / « Abonnements » (Fx5).
 */
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Send } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useT } from '@/lib/useT';
import AppShell from '@/components/AppShell';
import StoryRail from '@/components/StoryRail';
import PostCard from '@/components/PostCard';
import type { Post } from '@/lib/types';

type Tab = 'foryou' | 'following';

function TabButton({ label, active, onClick }: Readonly<{ label: string; active: boolean; onClick: () => void }>) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 py-3 text-[13px] transition ${active ? 'border-tx font-bold text-tx' : 'border-transparent text-tx3'}`}
    >
      {label}
    </button>
  );
}

export default function FeedPage() {
  const router = useRouter();
  const { user, ready } = useRequireAuth();
  const t = useT();
  const [tab, setTab] = useState<Tab>('foryou');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback((current: Tab) => {
    setLoading(true);
    setError('');
    const url = current === 'following' ? '/posts/feed' : '/posts/explore';
    api.get(url)
      .then((r) => {
        const fetched: Post[] = r.data.data.posts ?? [];
        setPosts(fetched);
        if (current === 'following' && fetched.length === 0) setTab('foryou');
      })
      .catch((err) => setError(apiError(err, t('feed.error'))))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    if (user) load(tab);
  }, [user, tab, load]);

  if (!ready || !user) {
    return <div className="flex h-screen items-center justify-center text-tx3">{t('common.loading')}</div>;
  }

  return (
    <AppShell>
      <header className="flex items-center justify-between bg-bg px-5 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <span className="serif flex h-8 w-8 items-center justify-center rounded-lg bg-tx text-base text-bg">d</span>
          <span className="serif text-2xl text-tx">dad.</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/explore')} aria-label={t('nav.explore')} className="flex h-9 w-9 items-center justify-center rounded-full bg-sf text-tx2">
            <Search size={16} />
          </button>
          <button onClick={() => router.push('/messages')} aria-label={t('nav.messages')} className="flex h-9 w-9 items-center justify-center rounded-full bg-sf text-tx2">
            <Send size={16} />
          </button>
        </div>
      </header>

      <div className="sticky top-0 z-10 flex items-center gap-5 border-b border-bd bg-bg/90 px-5 backdrop-blur">
        <TabButton label={t('feed.forYou')}    active={tab === 'foryou'}    onClick={() => setTab('foryou')} />
        <TabButton label={t('feed.following')} active={tab === 'following'} onClick={() => setTab('following')} />
      </div>

      <StoryRail />

      <main className="flex flex-col gap-2.5 p-3.5 pb-24 lg:pb-6">
        {loading && <p className="py-10 text-center text-tx3">{t('feed.loading')}</p>}

        {!loading && error && (
          <p className="py-6 text-center text-sm text-err">{error}</p>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-tx2">
              {tab === 'following' ? t('feed.empty.following') : t('feed.empty.explore')}
            </p>
            {tab === 'following' && (
              <button onClick={() => setTab('foryou')} className="mt-3 font-semibold text-ac">
                {t('feed.discover')}
              </button>
            )}
          </div>
        )}

        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </main>
    </AppShell>
  );
}
