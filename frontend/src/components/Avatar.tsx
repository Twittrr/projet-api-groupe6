'use client';
/**
 * @file Avatar.tsx
 * @brief Avatar : photo de profil si disponible, sinon lettre colorée déterministe.
 *
 * Si `avatarUrl` est fourni (même `null`), il fait foi. S'il est *omis*, l'avatar est
 * résolu automatiquement depuis le username via le cache global (voir store/avatars).
 * → les photos de profil s'affichent partout, sans dénormaliser l'avatar sur chaque objet.
 */
import { useEffect } from 'react';
import { avatarColor, initials, mediaUrl } from '@/lib/helpers';
import { useAvatarStore } from '@/store/avatars';

export default function Avatar({
  username,
  size = 40,
  avatarUrl,
}: Readonly<{ username: string; size?: number; avatarUrl?: string | null }>) {
  const radius = size * 0.34;

  // avatarUrl omis (undefined) → résolu via le cache ; fourni (string|null) → fait foi.
  const explicit = avatarUrl !== undefined;
  const key = (username || '').toLowerCase();
  const cached = useAvatarStore((s) => (explicit ? undefined : s.map[key]));
  const request = useAvatarStore((s) => s.request);

  useEffect(() => {
    if (!explicit && username) request(username);
  }, [explicit, username, request]);

  const resolved = explicit ? avatarUrl : cached;
  const src = resolved ? mediaUrl(resolved) : '';

  if (src) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden
        width={size}
        height={size}
        className="flex-shrink-0 object-cover"
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }

  return (
    <div
      className="serif flex flex-shrink-0 items-center justify-center text-white"
      style={{ width: size, height: size, borderRadius: radius, background: avatarColor(username), fontSize: size * 0.42 }}
      aria-hidden
    >
      {initials(username)}
    </div>
  );
}
