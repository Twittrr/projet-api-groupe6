'use client';
/**
 * @file moderation/page.tsx
 * @brief File de modération (Fx21) : signalements ouverts + gestion des bannis.
 */
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';
import AppHeader from '@/components/AppHeader';
import Avatar from '@/components/Avatar';
import { timeAgo } from '@/lib/helpers';
import type { Report, User } from '@/lib/types';

type Tab = 'reports' | 'banned';

export default function ModerationPage() {
  const router = useRouter();
  const { user, ready } = useRequireAuth(['moderator', 'admin']);
  const [tab, setTab] = useState<Tab>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [banned, setBanned] = useState<User[]>([]);
  const [banningId, setBanningId] = useState<string | null>(null);

  const loadReports = useCallback(() => {
    api.get('/posts/reports?status=open').then((r) => setReports(r.data.data.reports)).catch(() => {});
  }, []);

  const loadBanned = useCallback(() => {
    api.get('/users/banned').then((r) => setBanned(r.data.data.users ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    loadReports();
    loadBanned();
  }, [user, loadReports, loadBanned]);

  if (!ready || !user) return <div className="flex h-screen items-center justify-center text-tx3">Chargement…</div>;

  async function resolve(id: string, status: 'reviewed' | 'dismissed') {
    await api.patch(`/posts/reports/${id}`, { status }).catch(() => {});
    setReports((rs) => rs.filter((r) => r._id !== id));
  }

  async function deleteTarget(r: Report) {
    if (r.targetType === 'post') await api.delete(`/posts/${r.targetId}`).catch(() => {});
    await resolve(r._id, 'reviewed');
  }

  async function banAuthor(r: Report, andResolve = true) {
    const username = r.snapshot?.authorUsername;
    if (!username) return;
    setBanningId(r._id);
    try {
      const found = await api.get(`/users/${username}`);
      const targetId: string = found.data.data.user.id;
      await api.patch(`/users/${targetId}/status`, { status: 'banned' });
      loadBanned();
      if (andResolve) await resolve(r._id, 'reviewed');
    } catch (err) {
      alert(apiError(err, 'Impossible de bannir cet utilisateur.'));
    } finally {
      setBanningId(null);
    }
  }

  async function unban(userId: string) {
    try {
      await api.patch(`/users/${userId}/status`, { status: 'active' });
      setBanned((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      alert(apiError(err, 'Impossible de débannir cet utilisateur.'));
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[600px] flex-col border-x border-bd">
      <AppHeader title="Modération" back />

      {/* Onglets */}
      <div className="sticky top-0 z-10 flex border-b border-bd bg-bg/90 backdrop-blur">
        <button
          onClick={() => setTab('reports')}
          className={`flex-1 border-b-2 py-3 text-sm font-medium transition ${tab === 'reports' ? 'border-tx text-tx' : 'border-transparent text-tx3'}`}
        >
          Signalements {reports.length > 0 && <span className="ml-1 rounded-full bg-err/10 px-1.5 py-0.5 text-xs text-err">{reports.length}</span>}
        </button>
        <button
          onClick={() => setTab('banned')}
          className={`flex-1 border-b-2 py-3 text-sm font-medium transition ${tab === 'banned' ? 'border-tx text-tx' : 'border-transparent text-tx3'}`}
        >
          Bannis {banned.length > 0 && <span className="ml-1 rounded-full bg-sf2 px-1.5 py-0.5 text-xs text-tx3">{banned.length}</span>}
        </button>
      </div>

      <main className="flex-1 space-y-3 p-3 pb-24 lg:pb-0">

        {/* ─── Tab : Signalements ─── */}
        {tab === 'reports' && (
          <>
            {reports.length === 0 && <p className="py-16 text-center text-tx3">Aucun signalement en attente 🎉</p>}
            {reports.map((r) => (
              <div key={r._id} className="rounded-xl3 border border-bd bg-sf p-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-err/10 px-2 py-0.5 text-xs font-semibold text-err">
                    {r.targetType} signalé
                  </span>
                  <span className="text-xs text-tx3">{timeAgo(r.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm text-tx2"><b>Motif :</b> {r.reason}</p>
                {r.snapshot?.content && (
                  <blockquote className="mt-2 rounded-xl2 bg-bg p-3 text-sm text-tx">
                    @{r.snapshot.authorUsername} : « {r.snapshot.content} »
                  </blockquote>
                )}
                {r.snapshot?.authorUsername && (
                  <button
                    onClick={() => router.push(`/profile/${r.snapshot.authorUsername}`)}
                    className="mt-1 text-xs text-ac hover:underline"
                  >
                    Voir le profil de @{r.snapshot.authorUsername}
                  </button>
                )}
                <p className="mt-1 text-xs text-tx3">Signalé par @{r.reporterUsername}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {r.targetType === 'post' && (
                    <button
                      onClick={() => deleteTarget(r)}
                      className="flex-1 rounded-xl2 bg-err py-2 text-sm font-semibold text-white"
                    >
                      Supprimer le contenu
                    </button>
                  )}
                  {r.snapshot?.authorUsername && (
                    <button
                      onClick={() => banAuthor(r)}
                      disabled={banningId === r._id}
                      className="flex-1 rounded-xl2 border border-err py-2 text-sm font-semibold text-err transition hover:bg-err hover:text-white disabled:opacity-40"
                    >
                      {banningId === r._id ? 'Bannissement…' : 'Bannir l\'auteur'}
                    </button>
                  )}
                  <button
                    onClick={() => resolve(r._id, 'dismissed')}
                    className="flex-1 rounded-xl2 border border-bd2 py-2 text-sm font-semibold text-tx"
                  >
                    Ignorer
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ─── Tab : Bannis ─── */}
        {tab === 'banned' && (
          <>
            {banned.length === 0 && <p className="py-16 text-center text-tx3">Aucun utilisateur banni.</p>}
            {banned.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-xl2 border border-bd bg-sf p-3">
                <button onClick={() => router.push(`/profile/${u.username}`)} className="flex-shrink-0">
                  <Avatar username={u.username} size={40} />
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => router.push(`/profile/${u.username}`)}
                    className="block truncate text-sm font-semibold text-tx hover:underline"
                  >
                    {u.displayName}
                  </button>
                  <p className="truncate text-xs text-tx3">@{u.username}</p>
                </div>
                <button
                  onClick={() => unban(u.id)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-ok px-3 py-1.5 text-xs font-semibold text-ok transition hover:bg-ok hover:text-white"
                >
                  <ShieldCheck size={13} />
                  Débannir
                </button>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
