'use client';
/**
 * @file compose/page.tsx
 * @brief Écran de composition d'un post (texte ≤ 280 caractères, médias, tags).
 *
 * Les #hashtags présents dans le texte sont extraits en temps réel et affichés
 * sous forme de chips cliquables (suppression). La liste finale est soumise avec le post.
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, X } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useT } from '@/lib/useT';
import { useToast } from '@/store/toast';
import Avatar from '@/components/Avatar';
import { mediaUrl } from '@/lib/helpers';
import type { Media } from '@/lib/types';

const MAX_LENGTH = 280;
const MAX_MEDIA = 4;

interface MentionUser { id: string; username: string; displayName: string; }

const MENTION_RE = /@(\w*)$/;

function getMentionQuery(value: string, cursor: number): string | null {
  const m = MENTION_RE.exec(value.slice(0, cursor));
  return m ? m[1] : null;
}

function insertMention(value: string, cursor: number, username: string): [string, number] {
  const before = value.slice(0, cursor).replace(MENTION_RE, `@${username} `);
  const newVal = before + value.slice(cursor);
  return [newVal, before.length];
}

/** Extrait les hashtags uniques d'un texte (ex. "#lecture" → "lecture"). */
function extractTags(text: string): string[] {
  const matches = text.match(/#([a-zA-ZÀ-ÿ0-9_]+)/g) ?? [];
  return [...new Set(matches.map((t) => t.slice(1).toLowerCase()))];
}

/** Fusionne suggestions locales + résultats API, suggestions prioritaires, max 6. */
function mergeMentionList(suggestions: MentionUser[], results: MentionUser[], q: string): MentionUser[] {
  const sugIds = new Set(suggestions.map((s) => s.id));
  return [
    ...suggestions.filter((s) => s.username.toLowerCase().includes(q.toLowerCase())),
    ...results.filter((u) => !sugIds.has(u.id)),
  ].slice(0, 6);
}

function remainingClass(n: number): string {
  if (n < 0) return 'text-err font-semibold';
  if (n < 30) return 'text-tx2';
  return 'text-tx3';
}

export default function ComposePage() {
  const router = useRouter();
  const { user, ready } = useRequireAuth();
  const t = useT();
  const { addToast } = useToast();
  const fileRef     = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [content, setContent]           = useState('');
  const [media, setMedia]               = useState<Media[]>([]);
  const [error, setError]               = useState('');
  const [busy, setBusy]                 = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionList, setMentionList]   = useState<MentionUser[]>([]);
  const [suggestions, setSuggestions]   = useState<MentionUser[]>([]);

  /* Pré-chargement des suggestions de mention au montage */
  useEffect(() => {
    api.get('/users/suggestions')
      .then((r) => setSuggestions(r.data.data.users ?? []))
      .catch(() => {});
  }, []);

  /* Recherche debounced pour l'autocomplete @mention */
  useEffect(() => {
    if (mentionQuery === null) { setMentionList([]); return; }
    if (mentionQuery.length >= 2) {
      const timer = setTimeout(() => {
        api.get(`/users/search?q=${encodeURIComponent(mentionQuery)}&limit=5`)
          .then((r) => {
            const results: MentionUser[] = r.data.data.users ?? [];
            setMentionList(mergeMentionList(suggestions, results, mentionQuery));
          })
          .catch(() => setMentionList([]));
      }, 200);
      return () => clearTimeout(timer);
    }
    setMentionList(suggestions.filter((u) => u.username.toLowerCase().startsWith(mentionQuery.toLowerCase())));
  }, [mentionQuery, suggestions]);

  function selectMention(u: MentionUser) {
    const cursor = textareaRef.current?.selectionStart ?? content.length;
    const [next, pos] = insertMention(content, cursor, u.username);
    setContent(next);
    setMentionQuery(null);
    setMentionList([]);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    });
  }

  /* Tags extraits dynamiquement du contenu */
  const tags = extractTags(content);

  const remaining = MAX_LENGTH - content.length;

  /** Téléverse le fichier sélectionné et l'ajoute à la liste des médias. */
  const onUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const r = await api.post('/posts/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMedia((list) => [...list, r.data.data].slice(0, MAX_MEDIA));
    } catch (err) {
      setError(apiError(err, 'Upload impossible.'));
    } finally {
      /* Réinitialise l'input pour permettre de re-sélectionner le même fichier */
      if (fileRef.current) fileRef.current.value = '';
    }
  }, []);

  const removeMedia = useCallback((index: number) => {
    setMedia((list) => list.filter((_, i) => i !== index));
  }, []);

  async function publish() {
    if (!content.trim() || content.length > MAX_LENGTH) return;
    setBusy(true);
    setError('');
    try {
      await api.post('/posts', { content, media, tags });
      addToast(t('compose.published'));
      router.replace('/feed');
    } catch (err) {
      setError(apiError(err, 'Publication impossible.'));
      setBusy(false);
    }
  }

  if (!ready || !user) {
    return <div className="flex h-screen items-center justify-center text-tx3">Chargement…</div>;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[600px] flex-col border-x border-bd bg-bg pb-[76px] lg:pb-0">
      {/* En-tête */}
      <header className="flex items-center justify-between border-b border-bd px-4 py-3">
        <button onClick={() => router.back()} className="text-sm text-tx2">Annuler</button>
        <span className="serif text-base text-tx">nouvelle note</span>
        <button
          onClick={publish}
          disabled={busy || !content.trim() || remaining < 0}
          className="rounded-full px-4 py-1.5 text-sm font-semibold text-white transition disabled:opacity-40"
          style={{ background: 'var(--c-ac)' }}
        >
          {busy ? 'Publication…' : 'Publier'}
        </button>
      </header>

      <main className="flex flex-1 flex-col p-4">
        {/* Zone de rédaction */}
        <div className="flex items-start gap-3">
          <Avatar username={user.username} size={40} />
          <div className="flex-1">
            <div className="text-sm font-semibold text-tx">
              {user.displayName}{' '}
              <span className="font-normal text-tx3">· public</span>
            </div>
            <textarea
              ref={textareaRef}
              autoFocus
              value={content}
              onChange={(e) => {
                const val = e.target.value;
                const cursor = e.target.selectionStart ?? val.length;
                setContent(val);
                setMentionQuery(getMentionQuery(val, cursor));
              }}
              onKeyDown={(e) => { if (e.key === 'Escape') { setMentionQuery(null); setMentionList([]); } }}
              placeholder="Qu'est-ce qui te traverse ? Utilisez #tags ou @mentions."
              className="serif mt-1 h-36 w-full resize-none bg-transparent text-[22px] leading-snug text-tx outline-none placeholder:text-tx4"
            />
          </div>
        </div>

        {/* Chips de tags extraits */}
        {tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full bg-sf2 px-2.5 py-0.5 text-[12px] text-ac"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Aperçu des médias */}
        {media.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {media.map((m, i) => (
              <div key={`${m.url}-${i}`} className="relative">
                {m.type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl(m.url)}
                    alt="Aperçu du média"
                    className="h-32 w-full rounded-xl2 object-cover"
                  />
                ) : (
                  <video src={mediaUrl(m.url)} className="h-32 w-full rounded-xl2 object-cover">
                    <track kind="captions" />
                  </video>
                )}
                <button
                  onClick={() => removeMedia(i)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white"
                  aria-label="Retirer le média"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-err">{error}</p>}

        <div className="flex-1" />
      </main>

      {/* Dropdown @mention */}
      {mentionQuery !== null && mentionList.length > 0 && (
        <div className="border-t border-bd bg-bg">
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

      {/* Barre d'outils */}
      <footer className="flex items-center justify-between border-t border-bd px-4 py-3">
        <button
          onClick={() => fileRef.current?.click()}
          className="text-ac"
          aria-label="Ajouter un média"
          disabled={media.length >= MAX_MEDIA}
        >
          <ImagePlus size={22} />
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/mp4" hidden onChange={onUpload} />
        <span className={`text-sm tabular-nums ${remainingClass(remaining)}`}>
          {remaining}
        </span>
      </footer>
    </div>
  );
}
