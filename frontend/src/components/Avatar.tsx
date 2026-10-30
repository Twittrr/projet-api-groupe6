/**
 * @file Avatar.tsx
 * @brief Avatar : photo de profil si disponible, sinon lettre colorée déterministe.
 */
import { avatarColor, initials, mediaUrl } from '@/lib/helpers';

export default function Avatar({
  username,
  size = 40,
  avatarUrl,
}: Readonly<{ username: string; size?: number; avatarUrl?: string | null }>) {
  const radius = size * 0.34;
  const src = avatarUrl ? mediaUrl(avatarUrl) : '';

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
