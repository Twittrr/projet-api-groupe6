'use client';
/**
 * @file messages/[id]/page.tsx
 * @brief Vue d'une conversation : en-tête, fil de messages, zone de saisie et @mention autocomplete.
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Send, ChevronLeft, Users, Trash2 } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';
import Avatar from '@/components/Avatar';
import AppShell from '@/components/AppShell';
import { timeAgo } from '@/lib/helpers';
import type { Conversation, Message } from '@/lib/types';

interface MentionUser { id: string; username: string; displayName: string; }

const MENTION_RE = /@(\w*)$/;

/** Rend le texte avec les @mentions en orange. */
function parseContent(text: string, currentUsername?: string, isMine = false): React.ReactNode {
  let pos = 0;
  return text.split(/(@\w+)/g).map((part) => {
    const key = `c${pos}`;
    pos += part.length;
    if (/^@\w+$/.test(part)) {
      const isMe = !!currentUsername && part.toLowerCase() === `@${currentUsername.toLowerCase()}`;
      if (isMine) {
        return <span key={key} className={isMe ? 'font-bold underline' : 'font-bold'}>{part}</span>;
      }
      const cls = isMe ? 'font-semibold text-ac rounded bg-ac/10 px-0.5' : 'font-semibold text-ac';
      return <span key={key} className={cls}>{part}</span>;
    }
    return <span key={key}>{part}</span>;
  });
}

/** Retourne le fragment après "@" immédiatement avant le curseur, ou null. */
function getMentionQuery(value: string, cursor: number): string | null {
  const m = MENTION_RE.exec(value.slice(0, cursor));
  return m ? m[1] : null;
}

/** Remplace "@query" avant le curseur par "@username " et retourne [nouvelle valeur, nouvelle position]. */
function insertMention(value: string, cursor: number, username: string): [string, number] {
  const before  = value.slice(0, cursor).replace(MENTION_RE, `@${username} `);
  const newVal  = before + value.slice(cursor);
  return [newVal, before.length];
}

function convName(conv: Conversation, currentUserId: string): string {
  if (conv.name) return conv.name;
  if (conv.isGroup) return `Groupe (${conv.participants.length})`;
  const other = conv.participants.find((p) => p.userId !== currentUserId);
  return other ? `@${other.username}` : 'Conversation';
}

function buildSubtitle(conv: Conversation, other: { username: string } | undefined): string {
  if (conv.isGroup) return `${conv.participants.length} participants`;
  return other ? `@${other.username}` : '';
}

function mergeMentionList(suggestions: MentionUser[], results: MentionUser[], q: string): MentionUser[] {
  const sugIds = new Set(suggestions.map((s) => s.id));
  return [
    ...suggestions.filter((s) => s.username.toLowerCase().includes(q.toLowerCase())),
    ...results.filter((u) => !sugIds.has(u.id)),
  ].slice(0, 6);
}

function MessageBubble({ msg, isMine, currentUsername, onDelete }: Readonly<{ msg: Message; isMine: boolean; currentUsername?: string; onDelete: (id: string) => void }>) {
  const [confirming, setConfirming] = useState(false);

  if (msg.deleted) {
    return (
      <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isMine && <Avatar username={msg.authorUsername} size={28} />}
        <div className={`flex max-w-[72%] flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
          <div className="rounded-2xl border border-bd px-3 py-2 text-sm italic text-tx3">Message supprimé</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isMine && <Avatar username={msg.authorUsername} size={28} />}
      <div className={`flex max-w-[72%] flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
        {!isMine && <span className="px-1 text-[10px] text-tx3">@{msg.authorUsername}</span>}
        <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${isMine ? 'rounded-br-sm bg-ac text-white' : 'rounded-bl-sm bg-sf text-tx'}`}>
          {parseContent(msg.content, currentUsername, isMine)}
        </div>
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] text-tx3">{timeAgo(msg.createdAt)}</span>
          {isMine && !confirming && (
            <button onClick={() => setConfirming(true)} aria-label="Supprimer le message"
              className="text-tx3 opacity-0 transition group-hover:opacity-100 hover:text-err">
              <Trash2 size={12} />
            </button>
          )}
          {isMine && confirming && (
            <span className="flex items-center gap-1.5 text-[10px]">
              <button onClick={() => { onDelete(msg._id); setConfirming(false); }} className="font-semibold text-err">Supprimer</button>
              <button onClick={() => setConfirming(false)} className="text-tx3">Annuler</button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, ready } = useRequireAuth();

  const [conv, setConv]         = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // @mention autocomplete
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionList,  setMentionList]  = useState<MentionUser[]>([]);
  const [suggestions,  setSuggestions]  = useState<MentionUser[]>([]);

  const loadMessages = useCallback(() => {
    api.get(`/conversations/${id}/messages?limit=50`)
      .then((r) => setMessages(r.data.data.messages as Message[]))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!user) return;
    api.get(`/conversations/${id}`)
      .then((r) => setConv(r.data.data.conversation as Conversation))
      .catch(() => router.replace('/messages'));
    loadMessages();
    // Marque les messages comme lus et supprime les notifications associées
    api.patch(`/conversations/${id}/read`).catch(() => {});
    // Pré-chargement des suggestions pour les mentions
    api.get('/users/suggestions')
      .then((r) => setSuggestions(r.data.data.users ?? []))
      .catch(() => {});
  }, [user, id, loadMessages, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Recherche debounced quand mentionQuery ≥ 2 chars
  useEffect(() => {
    if (mentionQuery === null) { setMentionList([]); return; }
    if (mentionQuery.length >= 2) {
      const t = setTimeout(() => {
        api.get(`/users/search?q=${encodeURIComponent(mentionQuery)}&limit=5`)
          .then((r) => {
            const results: MentionUser[] = r.data.data.users ?? [];
            setMentionList(mergeMentionList(suggestions, results, mentionQuery));
          })
          .catch(() => setMentionList([]));
      }, 200);
      return () => clearTimeout(t);
    }
    setMentionList(suggestions.filter((u) => u.username.toLowerCase().startsWith(mentionQuery.toLowerCase())));
  }, [mentionQuery, suggestions]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val    = e.target.value;
    const cursor = e.target.selectionStart ?? val.length;
    setInput(val);
    setMentionQuery(getMentionQuery(val, cursor));
  }

  function selectMention(u: MentionUser) {
    const cursor  = inputRef.current?.selectionStart ?? input.length;
    const [next, pos] = insertMention(input, cursor, u.username);
    setInput(next);
    setMentionQuery(null);
    setMentionList([]);
    // Remet le focus et le curseur après le username inséré
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(pos, pos);
    });
  }

  async function handleSend(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    setError('');
    setMentionQuery(null);
    setMentionList([]);
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

  async function handleDelete(messageId: string) {
    // Optimiste : on marque le message supprimé localement, rollback si l'API échoue.
    setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, deleted: true, content: '' } : m)));
    try {
      await api.delete(`/conversations/${id}/messages/${messageId}`);
    } catch (err) {
      setError(apiError(err, 'Impossible de supprimer le message.'));
      loadMessages();
    }
  }

  if (!ready || !user) {
    return <div className="flex h-screen items-center justify-center text-tx3">Chargement…</div>;
  }

  const title = conv ? convName(conv, user.id) : '…';
  const otherParticipant = conv?.participants.find((p) => p.userId !== user.id);
  const subtitle = conv ? buildSubtitle(conv, otherParticipant) : '';

  return (
    <AppShell>
      {/* En-tête */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-bd bg-bg/90 px-3 py-3 backdrop-blur">
        <button onClick={() => router.push('/messages')} aria-label="Retour" className="text-tx">
          <ChevronLeft size={22} />
        </button>
        {conv && (
          <div className="relative flex-shrink-0">
            <Avatar
              username={conv.isGroup ? (conv.name || 'groupe') : (otherParticipant?.username ?? 'inconnu')}
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

      {/* Fil de messages */}
      <main className="flex flex-col gap-3 overflow-y-auto p-4 pb-[180px] lg:pb-[80px]" style={{ minHeight: 'calc(100dvh - 130px)' }}>
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-tx3">Aucun message. Soyez le premier à écrire !</p>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg._id} msg={msg} isMine={msg.authorId === user.id} currentUsername={user.username} onDelete={handleDelete} />
        ))}
        <div ref={bottomRef} />
      </main>

      {/* Zone de saisie + dropdown @mention */}
      <div className="sticky bottom-[76px] lg:bottom-0">
        {/* Dropdown @mention */}
        {mentionQuery !== null && mentionList.length > 0 && (
          <div className="border-t border-bd bg-bg shadow-soft">
            {mentionList.map((u) => (
              <button
                key={u.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); selectMention(u); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition hover:bg-sf"
              >
                <Avatar username={u.username} size={28} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-tx">{u.displayName}</div>
                  <div className="text-xs text-tx3">@{u.username}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-bd bg-bg px-3 py-3">
          <input
            ref={inputRef}
            className="flex-1 rounded-2xl border border-bd bg-sf px-4 py-2 text-sm text-tx outline-none focus:border-ac"
            placeholder="Votre message… (@nom pour mentionner)"
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setMentionQuery(null); setMentionList([]); }
              if (e.key === 'Enter' && mentionQuery === null) handleSend(e);
            }}
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
        {error && <p className="bg-bg px-4 pb-2 text-xs text-err">{error}</p>}
      </div>
    </AppShell>
  );
}
