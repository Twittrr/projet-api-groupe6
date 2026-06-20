'use client';
/**
 * @file messages/[id]/page.tsx
 * @brief Vue d'une conversation : en-tête, fil de messages et zone de saisie.
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Send, ChevronLeft, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, apiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';
import Avatar from '@/components/Avatar';
import AppShell from '@/components/AppShell';
import { timeAgo } from '@/lib/helpers';
import type { Conversation, Message } from '@/lib/types';

/**
 * @brief Dérive le nom d'affichage de la conversation.
 */
function convName(conv: Conversation, currentUserId: string): string {
  if (conv.name) return conv.name;
  if (conv.isGroup) return `Groupe (${conv.participants.length})`;
  const other = conv.participants.find((p) => p.userId !== currentUserId);
  return other ? `@${other.username}` : 'Conversation';
}

/**
 * @brief Ligne d'un message individuel (bulle gauche / droite).
 */
function MessageBubble({
  msg,
  isMine,
}: Readonly<{ msg: Message; isMine: boolean }>) {
  return (
    <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isMine && <Avatar username={msg.authorUsername} size={28} />}
      <div className={`flex max-w-[72%] flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
        {!isMine && (
          <span className="px-1 text-[10px] text-tx3">@{msg.authorUsername}</span>
        )}
        <div
          className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${
            isMine
              ? 'rounded-br-sm bg-ac text-white'
              : 'rounded-bl-sm bg-sf text-tx'
          }`}
        >
          {msg.content}
        </div>
        <span className="px-1 text-[10px] text-tx3">{timeAgo(msg.createdAt)}</span>
      </div>
    </div>
  );
}

/**
 * @brief Page d'une conversation individuelle.
 */
export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, ready } = useRequireAuth();

  const [conv, setConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(() => {
    api
      .get(`/conversations/${id}/messages?limit=50`)
      .then((r) => setMessages(r.data.data.messages as Message[]))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!user) return;
    api
      .get(`/conversations/${id}`)
      .then((r) => setConv(r.data.data.conversation as Conversation))
      .catch(() => router.replace('/messages'));
    loadMessages();
  }, [user, id, loadMessages, router]);

  // Scroll vers le bas après chargement ou nouveau message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await api.post(`/conversations/${id}/messages`, { content: input.trim() });
      setMessages((prev) => [...prev, res.data.data.message as Message]);
      setInput('');
    } catch (err) {
      setError(apiError(err, "Impossible d'envoyer le message."));
    } finally {
      setSending(false);
    }
  }

  if (!ready || !user) {
    return <div className="flex h-screen items-center justify-center text-tx3">Chargement…</div>;
  }

  const title = conv ? convName(conv, user.id) : '…';
  const subtitle = conv
    ? conv.isGroup
      ? `${conv.participants.length} participants`
      : conv.participants.find((p) => p.userId !== user.id)?.username
        ? `@${conv.participants.find((p) => p.userId !== user.id)!.username}`
        : ''
    : '';

  return (
    <AppShell>
      {/* En-tête de la conversation */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-bd bg-bg/90 px-3 py-3 backdrop-blur">
        <button onClick={() => router.push('/messages')} aria-label="Retour" className="text-tx">
          <ChevronLeft size={22} />
        </button>
        {conv && (
          <div className="relative flex-shrink-0">
            <Avatar
              username={
                conv.isGroup
                  ? conv.name || 'groupe'
                  : (conv.participants.find((p) => p.userId !== user.id)?.username ?? 'inconnu')
              }
              size={36}
            />
            {conv.isGroup && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-ac">
                <Users size={9} color="#fff" />
              </span>
            )}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-tx">{title}</div>
          {subtitle && <div className="truncate text-xs text-tx3">{subtitle}</div>}
        </div>
      </header>

      {/* Liste des messages */}
      <main className="flex flex-col gap-3 overflow-y-auto p-4 pb-4" style={{ minHeight: 'calc(100dvh - 130px)' }}>
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-tx3">Aucun message. Soyez le premier à écrire !</p>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg._id} msg={msg} isMine={msg.authorId === user.id} />
        ))}
        <div ref={bottomRef} />
      </main>

      {/* Zone de saisie */}
      <form
        onSubmit={handleSend}
        className="sticky bottom-0 flex items-center gap-2 border-t border-bd bg-bg px-3 py-3"
      >
        <input
          className="flex-1 rounded-2xl border border-bd bg-sf px-4 py-2 text-sm text-tx outline-none focus:border-ac"
          placeholder="Votre message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={2000}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          aria-label="Envoyer"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-ac text-white transition disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
      {error && <p className="bg-bg px-4 pb-2 text-xs text-red-500">{error}</p>}
    </AppShell>
  );
}
