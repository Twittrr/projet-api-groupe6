'use client';
/**
 * @file connections/page.tsx
 * @brief Page abonnés / abonnements du compte connecté avec désabonnement rapide.
 */
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserMinus } from 'lucide-react';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useT } from '@/lib/useT';
import Avatar from '@/components/Avatar';
import AppShell from '@/components/AppShell';
import AppHeader from '@/components/AppHeader';
import type { User } from '@/lib/types';

type Tab = 'following' | 'followers';

export default function ConnectionsPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-tx3">Chargement…</div>}>
      <ConnectionsContent />
    </Suspense>
  );
}

function ConnectionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, ready } = useRequireAuth();
  const t = useT();
  const [tab, setTab] = useState<Tab>(() => {
    const p = searchParams.get('tab');
    return p === 'followers' ? 'followers' : 'following';
  });
  const [list, setList] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [unfollowing, setUnfollowing] = useState<Set<string>>(new Set());

  const load = useCallback((current: Tab) => {
    if (!user) return;
    setLoading(true);
    setList([]);
    api.get(`/users/${user.id}/${current}`)
      .then((r) => setList(r.data.data.users ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { load(tab); }, [tab, load]);

  async function unfollow(targetId: string) {
    setUnfollowing((prev) => new Set(prev).add(targetId));
    try {
      await api.delete(`/users/${targetId}/follow`);
      setList((prev) => prev.filter((u) => u.id !== targetId));
    } catch {
      setUnfollowing((prev) => { const s = new Set(prev); s.delete(targetId); return s; });
    }
  }

  if (!ready || !user) {
    return <div className="flex h-screen items-center justify-center text-tx3">{t('common.loading')}</div>;
  }

  return (
    <AppShell>
      <AppHeader title={t('nav.profile')} back />

      <div className="sticky top-0 z-10 flex border-b border-bd bg-bg/90 backdrop-blur">
        <TabBtn label={t('profile.followingsList')} active={tab === 'following'} onClick={() => setTab('following')} />
        <TabBtn label={t('profile.followersList')} active={tab === 'followers'} onClick={() => setTab('followers')} />
      </div>

      <main className="divide-y divide-bd pb-24 lg:pb-6">
        {loading && (
          <p className="py-16 text-center text-sm text-tx3">{t('common.loading')}</p>
        )}

        {!loading && list.length === 0 && (
          <p className="py-16 text-center text-sm text-tx3">
            {tab === 'followers' ? t('profile.noFollowers') : t('profile.noFollowing')}
          </p>
        )}

        {list.map((u) => (
          <div key={u.id} className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => router.push(`/profile/${u.username}`)}
              className="flex flex-1 items-center gap-3 text-left"
            >
              <Avatar username={u.username} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-tx">{u.displayName || u.username}</p>
                <p className="truncate text-xs text-tx3">@{u.username}</p>
                {u.bio && <p className="mt-0.5 truncate text-xs text-tx2">{u.bio}</p>}
              </div>
            </button>

            {tab === 'following' && (
              <button
                onClick={() => unfollow(u.id)}
                disabled={unfollowing.has(u.id)}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-bd2 px-3 py-1.5 text-xs font-semibold text-tx2 transition hover:border-err hover:text-err disabled:opacity-40"
              >
                <UserMinus size={13} />
                {t('profile.unfollow')}
              </button>
            )}
          </div>
        ))}
      </main>
    </AppShell>
  );
}

function TabBtn({ label, active, onClick }: Readonly<{ label: string; active: boolean; onClick: () => void }>) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 border-b-2 py-3.5 text-sm font-medium transition ${
        active ? 'border-tx text-tx' : 'border-transparent text-tx3'
      }`}
    >
      {label}
    </button>
  );
}
