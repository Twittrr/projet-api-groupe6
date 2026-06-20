'use client';
/**
 * @file moderation/page.tsx
 * @brief File de modération (Fx21), réservée aux modérateurs/administrateurs (RBAC).
 */
import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';
import AppHeader from '@/components/AppHeader';
import { timeAgo } from '@/lib/helpers';
import type { Report } from '@/lib/types';

// Fx21 — Écran de modération, réservé aux modérateurs/administrateurs (RBAC)
export default function ModerationPage() {
  const { user, ready } = useRequireAuth(['moderator', 'admin']);
  const [reports, setReports] = useState<Report[]>([]);

  const load = useCallback(() => {
    api.get('/posts/reports?status=open').then((r) => setReports(r.data.data.reports)).catch(() => {});
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  if (!ready || !user) return <div className="flex h-screen items-center justify-center text-tx3">Chargement…</div>;

  async function resolve(id: string, status: 'reviewed' | 'dismissed') {
    await api.patch(`/posts/reports/${id}`, { status }).catch(() => {});
    setReports((rs) => rs.filter((r) => r._id !== id));
  }

  async function deleteTarget(r: Report) {
    if (r.targetType === 'post') await api.delete(`/posts/${r.targetId}`).catch(() => {});
    await resolve(r._id, 'reviewed');
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[600px] flex-col border-x border-bd">
      <AppHeader title="Modération" back />
      <main className="flex-1 space-y-3 p-3">
        {reports.length === 0 && <p className="py-16 text-center text-tx3">Aucun signalement en attente 🎉</p>}
        {reports.map((r) => (
          <div key={r._id} className="rounded-xl3 border border-bd bg-sf p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-err/10 px-2 py-0.5 text-xs font-semibold text-err">
                {r.targetType} signalé
              </span>
              <span className="text-xs text-tx3">{timeAgo(r.createdAt)}</span>
            </div>
            <p className="mt-2 text-sm text-tx2">
              <b>Motif :</b> {r.reason}
            </p>
            {r.snapshot?.content && (
              <blockquote className="mt-2 rounded-xl2 bg-bg p-3 text-sm text-tx">
                @{r.snapshot.authorUsername} : « {r.snapshot.content} »
              </blockquote>
            )}
            <p className="mt-1 text-xs text-tx3">Signalé par @{r.reporterUsername}</p>
            <div className="mt-3 flex gap-2">
              {r.targetType === 'post' && (
                <button onClick={() => deleteTarget(r)} className="flex-1 rounded-xl2 bg-err py-2 text-sm font-semibold text-white">
                  Supprimer le contenu
                </button>
              )}
              <button onClick={() => resolve(r._id, 'dismissed')} className="flex-1 rounded-xl2 border border-bd2 py-2 text-sm font-semibold text-tx">
                Ignorer
              </button>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
