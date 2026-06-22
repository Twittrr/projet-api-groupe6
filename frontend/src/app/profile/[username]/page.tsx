'use client';
/**
 * @file profile/[username]/page.tsx
 * @brief Profil public d'un utilisateur : en-tête, suivi (Fx9), liste des posts (Fx11),
 *        modal abonnés/abonnements (Fx9).
 */
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useT } from '@/lib/useT';
import Avatar from '@/components/Avatar';
import PostCard from '@/components/PostCard';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import type { Post, User } from '@/lib/types';

type FollowModal = 'followers' | 'following' | null;

function FollowListModal({
  mode,
  profileId,
  onClose,
}: Readonly<{ mode: FollowModal; profileId: string; onClose: () => void }>) {
  const router = useRouter();
  const t = useT();
  const [list, setList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mode) return;
    setLoading(true);
    setList([]);
    api.get(`/users/${profileId}/${mode}`)
      .then((r) => setList(r.data.data.users ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [mode, profileId]);

  if (!mode) return null;

  const title = mode === 'followers' ? t('profile.followersList') : t('profile.followingsList');
  const emptyMsg = mode === 'followers' ? t('profile.noFollowers') : t('profile.noFollowing');

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 flex w-full max-w-sm flex-col rounded-t-2xl border border-bd bg-bg sm:rounded-2xl" style={{ maxHeight: '70vh' }}>
        <div className="flex items-center justify-between border-b border-bd px-4 py-3">
          <h3 className="font-semibold text-tx">{title}</h3>
          <button onClick={onClose} aria-label={t('common.cancel')} className="flex h-8 w-8 items-center justify-center rounded-full text-tx3 hover:bg-sf">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading && <p className="py-8 text-center text-sm text-tx3">{t('profile.loading')}</p>}
          {!loading && list.length === 0 && (
            <p className="py-8 text-center text-sm text-tx3">{emptyMsg}</p>
          )}
          {list.map((u) => (
            <button
              key={u.id}
              onClick={() => { onClose(); router.push(`/profile/${u.username}`); }}
              className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-sf"
            >
              <Avatar username={u.username} size={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-tx">{u.displayName || u.username}</p>
                <p className="truncate text-xs text-tx3">@{u.username}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const me = useAuth((s) => s.user);
  const t = useT();
  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [following, setFollowing] = useState(false);
  const [followModal, setFollowModal] = useState<FollowModal>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    setNotFound(false);
    setProfile(null);
    api.get(`/users/${username}`).then((r) => {
      const u: User = r.data.data.user;
      setProfile(u);
      setFollowing(!!u.isFollowing);
      api.get(`/posts/user/${u.id}`).then((p) => setPosts(p.data.data.posts)).catch(() => {});
    }).catch(() => setNotFound(true));
  }, [username]);

  async function toggleFollow() {
    if (!me) return router.push('/login');
    if (!profile) return;
    const next = !following;
    setFollowing(next);
    setProfile((p) => p && { ...p, followers: (p.followers || 0) + (next ? 1 : -1) });
    try {
      if (next) await api.post(`/users/${profile.id}/follow`);
      else await api.delete(`/users/${profile.id}/follow`);
    } catch {
      setFollowing(!next);
    }
  }

  if (notFound) return (
    <AppShell>
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-tx3">
        <span className="text-4xl">👤</span>
        <p className="font-semibold text-tx">{t('profile.notFound')}</p>
        <button onClick={() => router.back()} className="text-sm text-ac underline">{t('profile.back')}</button>
      </div>
    </AppShell>
  );
  if (!profile) return <div className="flex h-screen items-center justify-center text-tx3">{t('profile.loading')}</div>;
  const isMe = me?.id === profile.id;

  return (
    <AppShell>
      <AppHeader title={`@${profile.username}`} back />
      <main className="pb-24 lg:pb-6">
        <section className="border-b border-bd p-4">
          <div className="flex items-start justify-between">
            <Avatar username={profile.username} size={72} />
            {isMe ? (
              <button onClick={() => router.push('/settings')} className="rounded-full border border-bd2 px-4 py-1.5 text-sm font-semibold text-tx">
                {t('profile.edit')}
              </button>
            ) : (
              <button
                onClick={toggleFollow}
                className={`rounded-full px-5 py-1.5 text-sm font-semibold ${following ? 'border border-bd2 text-tx' : 'bg-tx text-bg'}`}
              >
                {following ? t('profile.following') : t('profile.follow')}
              </button>
            )}
          </div>
          <h2 className="mt-3 text-xl font-bold text-tx">{profile.displayName}</h2>
          <p className="text-sm text-tx3">@{profile.username}</p>
          {profile.role !== 'user' && (
            <span className="mt-1 inline-block rounded-full bg-ac2 px-2 py-0.5 text-xs font-semibold text-ac">
              {profile.role === 'admin' ? 'Administrateur' : 'Modérateur'}
            </span>
          )}
          {profile.bio && <p className="mt-2 text-sm text-tx2">{profile.bio}</p>}

          <div className="mt-3 flex gap-4 text-sm">
            <button
              onClick={() => isMe ? router.push('/connections?tab=following') : setFollowModal('following')}
              className="text-tx hover:underline"
            >
              <b>{profile.following ?? 0}</b>{' '}
              <span className="text-tx3">{t('profile.followings')}</span>
            </button>
            <button
              onClick={() => isMe ? router.push('/connections?tab=followers') : setFollowModal('followers')}
              className="text-tx hover:underline"
            >
              <b>{profile.followers ?? 0}</b>{' '}
              <span className="text-tx3">{t('profile.followers')}</span>
            </button>
          </div>
        </section>

        <div className="space-y-2.5 p-3">
          {posts.map((p) => <PostCard key={p.id} post={p} />)}
          {posts.length === 0 && <p className="py-10 text-center text-tx3">{t('profile.noPosts')}</p>}
        </div>
      </main>

      <FollowListModal
        mode={followModal}
        profileId={profile.id}
        onClose={() => setFollowModal(null)}
      />
    </AppShell>
  );
}
