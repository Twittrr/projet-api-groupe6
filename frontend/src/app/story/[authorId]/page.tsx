'use client';
/**
 * @file story/[authorId]/page.tsx
 * @brief Lecteur de stories plein écran (barres de progression, navigation tactile).
 */
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import Avatar from '@/components/Avatar';
import { timeAgo } from '@/lib/helpers';
import type { Story } from '@/lib/types';

const DURATION = 4000; // ms par story

export default function StoryPlayer() {
  const { authorId } = useParams<{ authorId: string }>();
  const router = useRouter();
  const [stories, setStories] = useState<Story[]>([]);
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!authorId) return;
    api.get(`/posts/stories/${authorId}`).then((r) => setStories(r.data.data.stories)).catch(() => {});
  }, [authorId]);

  useEffect(() => {
    if (!stories.length) return;
    setProgress(0);
    const started = Date.now();
    timer.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / DURATION);
      setProgress(p);
      if (p >= 1) next();
    }, 50);
    return () => { if (timer.current) clearInterval(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, stories.length]);

  function next() {
    if (timer.current) clearInterval(timer.current);
    if (idx + 1 < stories.length) setIdx((i) => i + 1);
    else router.back();
  }
  function prev() {
    if (timer.current) clearInterval(timer.current);
    if (idx > 0) setIdx((i) => i - 1);
  }

  /** @brief Largeur d'une barre de progression : pleine (vue), en cours, ou vide. */
  function barWidth(i: number): string {
    if (i < idx) return '100%';
    if (i === idx) return `${progress * 100}%`;
    return '0%';
  }

  if (!stories.length) {
    return <div className="flex h-screen items-center justify-center bg-black text-white/60">Chargement…</div>;
  }

  const s = stories[idx];

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[600px] flex-col" style={{ background: s.gradient }}>
      {/* Barres de progression */}
      <div className="flex gap-1 p-3">
        {stories.map((st, i) => (
          <div key={st._id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
            <div className="h-full bg-white" style={{ width: barWidth(i) }} />
          </div>
        ))}
      </div>

      {/* En-tête */}
      <div className="flex items-center gap-2.5 px-4">
        <Avatar username={s.authorUsername} size={36} />
        <div className="flex-1">
          <div className="text-sm font-semibold text-white">@{s.authorUsername}</div>
          <div className="text-xs text-white/70">{timeAgo(s.createdAt)}</div>
        </div>
        <button onClick={() => router.back()} aria-label="Fermer" className="text-white">
          <X size={22} />
        </button>
      </div>

      {/* Zones de navigation + contenu */}
      <div className="relative flex-1">
        <button aria-label="Précédent" onClick={prev} className="absolute left-0 top-0 h-full w-1/3" />
        <button aria-label="Suivant" onClick={next} className="absolute right-0 top-0 h-full w-2/3" />
        {s.text && (
          <div className="pointer-events-none flex h-full items-center justify-center p-8">
            <p className="serif text-center text-2xl leading-snug text-white drop-shadow">{s.text}</p>
          </div>
        )}
      </div>
    </div>
  );
}
