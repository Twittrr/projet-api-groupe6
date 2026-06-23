'use client';
/**
 * @file PostCard.tsx
 * @brief Carte d'affichage d'un post dans le fil.
 *
 * Pattern "stretched link" : un <button> absolu couvre toute la carte pour la navigation
 * (accessible, pas de role non-interactif sur <article>), les boutons internes
 * sont placés en z-10 pour rester cliquables au-dessus.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Repeat2, Bookmark, MoreHorizontal, Pencil, X } from 'lucide-react';
import Avatar from './Avatar';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useLang } from '@/store/lang';
import { useT } from '@/lib/useT';
import { timeAgo, mediaUrl, isGradient } from '@/lib/helpers';
import type { Post, Media } from '@/lib/types';

/** Rend le texte avec les @mentions en orange ; surbrillance si c'est le lecteur actuel. */
function parseContent(text: string, currentUsername?: string): React.ReactNode {
  let pos = 0;
  return text.split(/(@\w+)/g).map((part) => {
    const key = `c${pos}`;
    pos += part.length;
    if (/^@\w+$/.test(part)) {
      const isMe = !!currentUsername && part.toLowerCase() === `@${currentUsername.toLowerCase()}`;
      const cls = isMe ? 'font-semibold text-ac rounded bg-ac/10 px-0.5' : 'font-semibold text-ac';
      return <span key={key} className={cls}>{part}</span>;
    }
    return <span key={key}>{part}</span>;
  });
}

function mediaStyle(url: string): React.CSSProperties {
  if (isGradient(url)) return { background: url };
  const resolved = mediaUrl(url);
  if (!resolved) return {};
  return { backgroundImage: `url(${resolved})`, backgroundSize: 'cover', backgroundPosition: 'center' };
}

function MediaBlock({ media }: Readonly<{ media: Media[] }>) {
  if (!media?.length) return null;

  if (media.length === 1) {
    const m = media[0];
    if (m.type === 'video' && !isGradient(m.url)) {
      return (
        <video src={mediaUrl(m.url)} controls className="mt-2.5 w-full rounded-2xl" style={{ aspectRatio: '4/3', objectFit: 'cover' }}>
          <track kind="captions" />
        </video>
      );
    }
    return <div className="mt-2.5 w-full rounded-2xl" style={{ aspectRatio: '4/3', ...mediaStyle(m.url) }} />;
  }

  return (
    <div className="mt-2.5 grid grid-cols-3 gap-1.5">
      {media.slice(0, 3).map((m, i) => (
        <div key={`${m.url}-${i}`} className="rounded-xl" style={{ aspectRatio: '1', ...mediaStyle(m.url) }} />
      ))}
    </div>
  );
}

export default function PostCard({ post: initial }: Readonly<{ post: Post }>) {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const { lang } = useLang();
  const t = useT();
  const [post, setPost] = useState(initial);

  const isTextOnly = !post.media?.length;
  const open = () => router.push(`/post/${post.id}`);
  const isAuthor = !!user && user.id === post.authorId;

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');

  async function saveEdit() {
    const content = editText.trim();
    if (!content) return;
    try {
      const r = await api.patch(`/posts/${post.id}`, { content });
      setPost((p) => ({ ...p, content: r.data.data.post.content, tags: r.data.data.post.tags ?? p.tags }));
      setEditing(false);
    } catch { /* silent */ }
  }

  async function toggleLike() {
    if (!user) { router.push('/login'); return; }
    const liked = !post.liked;
    setPost((p) => ({ ...p, liked, likeCount: p.likeCount + (liked ? 1 : -1) }));
    try {
      await (liked ? api.post(`/posts/${post.id}/like`) : api.delete(`/posts/${post.id}/like`));
    } catch {
      setPost((p) => ({ ...p, liked: !liked, likeCount: p.likeCount + (liked ? -1 : 1) }));
    }
  }

  async function toggleBookmark() {
    if (!user) { router.push('/login'); return; }
    const bookmarked = !post.bookmarked;
    setPost((p) => ({ ...p, bookmarked }));
    try {
      await (bookmarked
        ? api.post(`/posts/${post.id}/bookmark`)
        : api.delete(`/posts/${post.id}/bookmark`));
    } catch {
      setPost((p) => ({ ...p, bookmarked: !bookmarked }));
    }
  }

  const inner = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };

  const displayName = post.authorDisplayName || post.authorUsername;

  return (
    <article className="animate-sin relative rounded-[24px] border border-bd bg-sf p-[15px]">
      {!editing && (
        <button
          onClick={open}
          aria-label={`${post.authorUsername}`}
          className="absolute inset-0 rounded-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ac"
        />
      )}

      <div className="relative z-10">
        <div className="flex items-center gap-[11px]">
          <button
            onClick={inner(() => router.push(`/profile/${post.authorUsername}`))}
            aria-label={`@${post.authorUsername}`}
          >
            <Avatar username={post.authorUsername} size={40} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-tx">
              {displayName}{' '}
              <span className="font-normal text-tx3">@{post.authorUsername} · {timeAgo(post.createdAt, lang)}</span>
            </div>
            <div className="text-[10px] text-tx4">{t('post.public')}</div>
          </div>
          {isAuthor ? (
            <button
              onClick={inner(() => { if (!editing) { setEditText(post.content); } setEditing((e) => !e); })}
              aria-label={editing ? 'Annuler la modification' : 'Modifier'}
              className="flex h-[30px] w-[30px] items-center justify-center text-tx3"
            >
              {editing ? <X size={15} /> : <Pencil size={15} />}
            </button>
          ) : (
            <button
              onClick={inner(() => router.push(`/report?type=post&id=${post.id}`))}
              aria-label={t('post.report')}
              className="flex h-[30px] w-[30px] items-center justify-center text-tx3"
            >
              <MoreHorizontal size={15} />
            </button>
          )}
        </div>

        {editing ? (
          <div className="mt-2.5">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
              rows={4}
              maxLength={280}
              className="w-full resize-none rounded-xl2 border border-bd2 bg-bg px-3 py-2 text-sm text-tx outline-none focus:border-ac"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-tx4">{280 - editText.length}</span>
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm text-tx3 hover:text-tx">Annuler</button>
                <button
                  onClick={saveEdit}
                  disabled={!editText.trim()}
                  className="rounded-full bg-ac px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {isTextOnly ? (
              <p className="serif mt-2.5 text-[19px] leading-[1.45] text-tx">{parseContent(post.content, user?.username)}</p>
            ) : (
              <>
                <p className="mt-2.5 text-[13px] leading-[1.55] text-tx2">{parseContent(post.content, user?.username)}</p>
                <MediaBlock media={post.media} />
              </>
            )}

            {post.tags?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={inner(() => router.push(`/tag/${encodeURIComponent(tag)}`))}
                    className="rounded-full bg-sf2 px-2.5 py-0.5 text-[12px] text-ac"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <div className="mt-[13px] flex items-center justify-between border-t border-bd pt-[11px]">
          <div className="flex items-center gap-[14px]">
            <button onClick={inner(toggleLike)} className="flex items-center gap-[5px] text-[13px] text-tx3" aria-label={t('post.like')}>
              <Heart size={15} className={post.liked ? 'animate-hpop fill-err text-err' : ''} />
              <span className={post.liked ? 'text-err' : ''}>{post.likeCount}</span>
            </button>
            <button onClick={inner(open)} className="flex items-center gap-[5px] text-[13px] text-tx3" aria-label={t('post.comment')}>
              <MessageCircle size={15} /> {post.commentCount}
            </button>
            <span className="flex items-center gap-[5px] text-[13px] text-tx4" aria-hidden>
              <Repeat2 size={15} /> {post.repostCount ?? 0}
            </span>
          </div>
          <button onClick={inner(toggleBookmark)} aria-label={t('post.bookmark')} className="text-tx3">
            <Bookmark size={15} className={post.bookmarked ? 'fill-ac text-ac' : ''} />
          </button>
        </div>
      </div>
    </article>
  );
}
