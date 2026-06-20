/**
 * @file Avatar.tsx
 * @brief Avatar « lettre » coloré, déterministe à partir du nom d'utilisateur.
 *
 * Reproduit les avatars de la maquette (carré arrondi, initiale serif blanche)
 * sans nécessiter de stockage d'image.
 */
import { avatarColor, initials } from '@/lib/helpers';

/**
 * @brief Affiche l'avatar d'un utilisateur.
 * @param username Nom d'utilisateur servant de graine pour la couleur et l'initiale.
 * @param size Taille en pixels (40 par défaut).
 */
export default function Avatar({ username, size = 40 }: Readonly<{ username: string; size?: number }>) {
  return (
    <div
      className="serif flex flex-shrink-0 items-center justify-center text-white"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.34,
        background: avatarColor(username),
        fontSize: size * 0.42,
      }}
      aria-hidden
    >
      {initials(username)}
    </div>
  );
}
