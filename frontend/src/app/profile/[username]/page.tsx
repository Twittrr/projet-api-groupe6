'use client';
/**
 * @file profile/[username]/page.tsx
 * @brief Profil public d'un utilisateur : en-tête, suivi (Fx9), liste des posts (Fx11).
 */
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import Avatar from '@/components/Avatar';
import PostCard from '@/components/PostCard';
import AppHeader from '@/components/AppHeader';
import AppShell from '@/components/AppShell';
import type { Post, User } from '@/lib/types';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const me = useAuth((s) => s.user);
  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [following, setFollowing] = useState(false);
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
        <p className="font-semibold text-tx">Utilisateur introuvable</p>
        <button onClick={() => router.back()} className="text-sm text-ac underline">Retour</button>
      </div>
    </AppShell>
  );
  if (!profile) return <div className="flex h-screen items-center justify-center text-tx3">Chargement…</div>;
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
                Modifier
              </button>
            ) : (
              <button
                onClick={toggleFollow}
                className={`rounded-full px-5 py-1.5 text-sm font-semibold ${following ? 'border border-bd2 text-tx' : 'bg-tx text-bg'}`}
              >
                {following ? 'Suivi' : 'Suivre'}
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
            <span className="text-tx"><b>{profile.following ?? 0}</b> <span className="text-tx3">abonnements</span></span>
            <span className="text-tx"><b>{profile.followers ?? 0}</b> <span className="text-tx3">abonnés</span></span>
          </div>
        </section>

        <div className="space-y-2.5 p-3">
          {posts.map((p) => <PostCard key={p.id} post={p} />)}
          {posts.length === 0 && <p className="py-10 text-center text-tx3">Aucune publication.</p>}
        </div>
      </main>
    </AppShell>
  );
}
