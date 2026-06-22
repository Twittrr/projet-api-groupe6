'use client';
/**
 * @file messages/page.tsx
 * @brief Liste des conversations + modal de création avec recherche par @username.
 *
 * Correction BUG-03 : le formulaire de création résout les IDs via
 * GET /users/search?q=username avant de créer la conversation,
 * évitant d'exposer les ObjectIDs MongoDB à l'utilisateur.
 */
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, MessageSquare, Search, X } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';
import Avatar from '@/components/Avatar';
import AppShell from '@/components/AppShell';
import { timeAgo } from '@/lib/helpers';
import type { Conversation } from '@/lib/types';

function convName(conv: Conversation, currentUserId: string): string {
  if (conv.name) return conv.name;
  if (conv.isGroup) return `Groupe (${conv.participants.length})`;
  const other = conv.participants.find((p) => p.userId !== currentUserId);
  return other ? `@${other.username}` : 'Conversation';
}

function convAvatar(conv: Conversation, currentUserId: string): string {
  if (conv.isGroup) return conv.name || 'groupe';
  const other = conv.participants.find((p) => p.userId !== currentUserId);
  return other ? other.username : 'inconnu';
}

/** Résultat de la recherche d'utilisateur. */
interface UserResult {
  id: string;
  username: string;
  displayName: string;
}

/**
 * Modal de création d'une conversation.
 * Affiche des suggestions par défaut (abonnements + suggestions API) puis des résultats
 * de recherche en temps réel quand l'utilisateur tape au moins 2 caractères.
 */
function NewConversationModal({
  onClose,
  onCreated,
}: Readonly<{ onClose: () => void; onCreated: (id: string) => void }>) {
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState<UserResult[]>([]);
  const [suggestions, setSuggestions] = useState<UserResult[]>([]);
  const [selected, setSelected]     = useState<UserResult[]>([]);
  const [searching, setSearching]   = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  /* Suggestions par défaut au montage */
  useEffect(() => {
    api.get('/users/suggestions')
      .then((r) => setSuggestions(r.data.data.users ?? []))
      .catch(() => {});
  }, []);

  /* Recherche debounced — strip le "@" éventuel avant d'envoyer à l'API */
  useEffect(() => {
    const q = query.trim().replace(/^@/, '');
    if (q.length < 1) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await api.get(`/users/search?q=${encodeURIComponent(q)}&limit=6`);
        setResults(r.data.data.users ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  function toggleUser(u: UserResult) {
    setSelected((prev) =>
      prev.some((s) => s.id === u.id)
        ? prev.filter((s) => s.id !== u.id)
        : [...prev, u]
    );
  }

  async function handleCreate() {
    if (selected.length === 0) { setError('Sélectionnez au moins un utilisateur.'); return; }
    setLoading(true);
    setError('');
    try {
      const r = await api.post('/conversations', {
        participantIds: selected.map((u) => u.id),
      });
      onCreated(r.data.data.conversation._id as string);
    } catch (err) {
      setError(apiError(err, 'Impossible de créer la conversation.'));
    } finally {
      setLoading(false);
    }
  }

  const startLabel  = selected.length > 1 ? 'Démarrer le groupe' : 'Démarrer';
  const buttonLabel = loading ? 'Création…' : startLabel;

  /* Escape key closes the modal without adding listeners to non-interactive elements */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-center">
      {/* Backdrop: <button> is a native interactive element — satisfies S6847 */}
      <button
        className="absolute inset-0 cursor-default bg-black/50"
        onClick={onClose}
        aria-label="Fermer la fenêtre"
        tabIndex={-1}
      />
      <dialog
        open
        aria-labelledby="new-conv-title"
        className="relative z-10 m-0 w-full max-w-sm rounded-t-3xl border-0 bg-bg p-5 pb-[88px] shadow-xl sm:rounded-3xl sm:pb-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="new-conv-title" className="serif text-lg text-tx">Nouvelle conversation</h2>
          <button onClick={onClose} aria-label="Fermer" className="text-tx3"><X size={18} /></button>
        </div>

        {/* Chips des utilisateurs sélectionnés */}
        {selected.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {selected.map((u) => (
              <button
                key={u.id}
                onClick={() => toggleUser(u)}
                className="flex items-center gap-1 rounded-full bg-ac/10 px-2.5 py-1 text-xs font-medium text-ac"
              >
                @{u.username} <X size={11} />
              </button>
            ))}
          </div>
        )}

        {/* Champ de recherche */}
        <div className="mb-3 flex items-center gap-2 rounded-2xl border border-bd bg-sf px-3">
          <Search size={14} className="text-tx3" />
          <input
            className="flex-1 bg-transparent py-2.5 text-sm text-tx outline-none"
            placeholder="Rechercher @username…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {searching && <span className="text-[10px] text-tx3">…</span>}
        </div>

        {/* Liste : résultats de recherche OU suggestions par défaut */}
        {(() => {
          const list = query.trim().replace(/^@/, '').length >= 1 ? results : suggestions;
          if (list.length === 0) return null;
          return (
            <div className="mb-3">
              {query.trim().length < 2 && (
                <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-tx3">
                  Suggestions
                </p>
              )}
              <ul className="max-h-44 overflow-y-auto rounded-2xl border border-bd">
                {list.map((u) => {
                  const isSelected = selected.some((s) => s.id === u.id);
                  return (
                    <li key={u.id}>
                      <button
                        onClick={() => toggleUser(u)}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-sf ${isSelected ? 'bg-ac/5' : ''}`}
                      >
                        <Avatar username={u.username} size={32} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-tx">{u.displayName}</div>
                          <div className="text-xs text-tx3">@{u.username}</div>
                        </div>
                        {isSelected && <span className="text-xs font-bold text-ac">✓</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })()}

        {error && <p className="mb-2 text-xs text-err">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-bd py-2 text-sm text-tx2"
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || selected.length === 0}
            className="flex-1 rounded-xl py-2 text-sm font-semibold text-white transition disabled:opacity-50"
            style={{ background: 'var(--c-ac)' }}
          >
            {buttonLabel}
          </button>
        </div>
      </dialog>
    </div>
  );
}

export default function MessagesPage() {
  const router = useRouter();
  const { user, ready } = useRequireAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(() => {
    api.get('/conversations')
      .then((r) => setConversations(r.data.data.conversations as Conversation[]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (!ready || !user) {
    return <div className="flex h-screen items-center justify-center text-tx3">Chargement…</div>;
  }

  function handleCreated(id: string) {
    setShowModal(false);
    router.push(`/messages/${id}`);
  }

  return (
    <AppShell>
      {showModal && <NewConversationModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-bd bg-bg/90 px-4 py-3 backdrop-blur">
        <h1 className="serif text-2xl text-tx">Messages</h1>
        <button
          onClick={() => setShowModal(true)}
          aria-label="Nouvelle conversation"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-sf text-tx2 transition hover:text-white"
          style={{ ['--hover-bg' as string]: 'var(--c-ac)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--c-ac)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '')}
        >
          <Plus size={18} />
        </button>
      </header>

      <main className="divide-y divide-bd pb-24 lg:pb-6">
        {conversations.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-tx3">
            <MessageSquare size={40} strokeWidth={1.5} />
            <p>Aucune conversation pour le moment.</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 rounded-2xl px-4 py-2 text-sm font-semibold text-white"
              style={{ background: 'var(--c-ac)' }}
            >
              Démarrer une conversation
            </button>
          </div>
        )}

        {conversations.map((conv) => {
          const name = convName(conv, user.id);
          const avatarSeed = convAvatar(conv, user.id);
          return (
            <button
              key={conv._id}
              onClick={() => router.push(`/messages/${conv._id}`)}
              className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-sf"
            >
              <div className="relative flex-shrink-0">
                <Avatar username={avatarSeed} size={46} />
                {conv.isGroup && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-ac">
                    <Users size={9} color="#fff" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-tx">{name}</span>
                  {conv.lastMessage?.sentAt && (
                    <span className="flex-shrink-0 text-xs text-tx3">{timeAgo(conv.lastMessage.sentAt)}</span>
                  )}
                </div>
                {conv.lastMessage ? (
                  <p className="truncate text-xs text-tx3">
                    <span className="font-medium">@{conv.lastMessage.authorUsername} :</span>{' '}
                    {conv.lastMessage.content}
                  </p>
                ) : (
                  <p className="text-xs italic text-tx3">Aucun message</p>
                )}
              </div>
            </button>
          );
        })}
      </main>
    </AppShell>
  );
}
