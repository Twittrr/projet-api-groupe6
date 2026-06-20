'use client';
/**
 * @file notifications/page.tsx
 * @brief Écran d'activité (likes, réponses, nouveaux abonnés — Fx14/Fx15/Fx16).
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, UserPlus, AtSign } from 'lucide-react';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';
import Avatar from '@/components/Avatar';
import AppShell from '@/components/AppShell';
import { timeAgo } from '@/lib/helpers';
import type { Notification } from '@/lib/types';

const ICON = { like: Heart, comment: MessageCircle, follow: UserPlus, mention: AtSign };
const LABEL: Record<string, string> = {
  like: 'a aimé votre message',
  comment: 'a répondu à votre message',
  follow: 'a commencé à vous suivre',
  mention: 'vous a mentionné',
};

export default function NotificationsPage() {
  const router = useRouter();
  const { user, ready } = useRequireAuth();
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;
    api.get('/notifications').then((r) => setItems(r.data.data.notifications)).catch(() => {});
    api.post('/notifications/read-all').catch(() => {});
  }, [user]);

  if (!ready || !user) return <div className="flex h-screen items-center justify-center text-tx3">Chargement…</div>;

  return (
    <AppShell>
      <header className="sticky top-0 z-20 border-b border-bd bg-bg/90 px-4 py-3 backdrop-blur">
        <h1 className="serif text-2xl text-tx">Activité</h1>
      </header>
      <main className="divide-y divide-bd pb-24 lg:pb-6">
        {items.length === 0 && <p className="py-16 text-center text-tx3">Aucune notification.</p>}
        {items.map((n) => {
          const Icon = ICON[n.type] || Heart;
          const postId = n.payload?.postId as string | undefined;
          return (
            <button
              key={n._id}
              onClick={() => (postId ? router.push(`/post/${postId}`) : router.push(`/profile/${n.actor.username}`))}
              className={`flex w-full items-center gap-3 p-3 text-left ${n.read ? '' : 'bg-ac2'}`}
            >
              <Avatar username={n.actor.username} size={40} />
              <div className="flex-1">
                <p className="text-sm text-tx">
                  <b>@{n.actor.username}</b> {LABEL[n.type]}
                </p>
                <span className="text-xs text-tx3">{timeAgo(n.createdAt)}</span>
              </div>
              <Icon size={18} className="text-ac" />
            </button>
          );
        })}
      </main>
    </AppShell>
  );
}
