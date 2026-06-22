'use client';
/**
 * @file post/[id]/page.tsx
 * @brief Détail d'un post et fil de discussion avec replies inline (Fx7/Fx8).
 */
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, apiError } from '@/lib/api';
import { useAuth } from '@/store/auth';
import Avatar from '@/components/Avatar';
import PostCard from '@/components/PostCard';
import AppHeader from '@/components/AppHeader';
import { timeAgo } from '@/lib/helpers';
import type { Post, Comment, Reply } from '@/lib/types';

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  // Replies state: map commentId → Reply[]
  const [repliesMap, setRepliesMap] = useState<Record<string, Reply[]>>({});
  // Which comment has the reply box open
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get(`/posts/${id}`).then((r) => setPost(r.data.data.post)).catch(() => setError('Post introuvable.'));
    api.get(`/posts/${id}/comments`).then((r) => setComments(r.data.data.comments)).catch(() => {});
  }, [id]);

  async function send() {
    if (!user) return router.push('/login');
    if (!text.trim()) return;
    try {
      const r = await api.post(`/posts/${id}/comments`, { content: text });
      setComments((c) => [...c, r.data.data.comment]);
      setText('');
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function loadReplies(commentId: string) {
    if (repliesMap[commentId]) return; // already loaded
    try {
      const r = await api.get(`/posts/comments/${commentId}/replies`);
      setRepliesMap((prev) => ({ ...prev, [commentId]: r.data.data.replies }));
    } catch {
      setRepliesMap((prev) => ({ ...prev, [commentId]: [] }));
    }
  }

  function toggleReplyBox(commentId: string) {
    if (!user) { router.push('/login'); return; }
    if (replyingTo === commentId) {
      setReplyingTo(null);
      setReplyText('');
    } else {
      setReplyingTo(commentId);
      setReplyText('');
      loadReplies(commentId);
    }
  }

  async function sendReply(commentId: string) {
    if (!user || !replyText.trim()) return;
    try {
      const r = await api.post(`/posts/comments/${commentId}/replies`, { content: replyText });
      const newReply: Reply = r.data.data.reply;
      setRepliesMap((prev) => ({
        ...prev,
        [commentId]: [...(prev[commentId] ?? []), newReply],
      }));
      setReplyText('');
      setReplyingTo(null);
    } catch (err) {
      setError(apiError(err));
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[600px] flex-col border-x border-bd">
      <AppHeader title="Discussion" back />
      <main className="flex-1 p-3 pb-20">
        {error && <p className="text-sm text-err">{error}</p>}
        {post && <PostCard post={post} />}

        <div className="mt-4 space-y-2">
          {comments.map((c) => (
            <div key={c.id} className={`rounded-xl2 border border-bd bg-sf p-3 ${c.parentCommentId ? 'ml-6' : ''}`}>
              {/* Comment header */}
              <div className="flex items-center gap-2">
                <Avatar username={c.authorUsername} size={28} />
                <span className="text-sm font-semibold text-tx">@{c.authorUsername}</span>
                <span className="text-xs text-tx3">· {timeAgo(c.createdAt)}</span>
              </div>
              <p className="mt-1.5 text-sm text-tx">{c.content}</p>

              {/* Reply toggle button */}
              <button
                onClick={() => toggleReplyBox(c.id)}
                className="mt-1.5 text-xs text-ac hover:underline"
              >
                {replyingTo === c.id ? 'Annuler' : 'Répondre'}
              </button>

              {/* Existing replies */}
              {(repliesMap[c.id] ?? []).length > 0 && (
                <div className="mt-2 space-y-1.5 border-l-2 border-bd pl-3">
                  {(repliesMap[c.id] ?? []).map((reply) => (
                    <div key={reply.id} className="rounded-lg bg-bg p-2">
                      <div className="flex items-center gap-1.5">
                        <Avatar username={reply.authorUsername} size={22} />
                        <span className="text-xs font-semibold text-tx">@{reply.authorUsername}</span>
                        <span className="text-[11px] text-tx3">· {timeAgo(reply.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-tx">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Inline reply box */}
              {replyingTo === c.id && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendReply(c.id)}
                    placeholder="Votre reply…"
                    className="flex-1 rounded-full bg-bg px-3 py-1.5 text-xs text-tx outline-none placeholder:text-tx4 border border-bd"
                    autoFocus
                  />
                  <button
                    onClick={() => sendReply(c.id)}
                    disabled={!replyText.trim()}
                    className="rounded-full bg-ac px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    Envoyer
                  </button>
                </div>
              )}
            </div>
          ))}
          {comments.length === 0 && (
            <p className="py-6 text-center text-sm text-tx3">Aucune réponse pour l&apos;instant.</p>
          )}
        </div>
      </main>

      <footer className="sticky bottom-[76px] lg:bottom-0 flex items-center gap-2 border-t border-bd bg-bg/95 p-3 backdrop-blur">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={user ? 'Votre réponse…' : 'Connectez-vous pour répondre'}
          disabled={!user}
          className="flex-1 rounded-full bg-sf px-4 py-2.5 text-sm text-tx outline-none placeholder:text-tx4"
        />
        <button
          onClick={send}
          disabled={!user || !text.trim()}
          className="rounded-full bg-ac px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Envoyer
        </button>
      </footer>
    </div>
  );
}
