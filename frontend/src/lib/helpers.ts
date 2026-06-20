/**
 * @file helpers.ts
 * @brief Fonctions utilitaires de présentation (avatars, dates relatives, médias).
 */

const AVATAR_COLORS = ['var(--av1)', 'var(--av2)', 'var(--av3)', 'var(--av4)', 'var(--av5)'];

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (seed.codePointAt(i) ?? 0) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function initials(name: string): string {
  return (name.trim()[0] || '?').toUpperCase();
}

export function isGradient(url: string): boolean {
  return url.startsWith('linear-gradient');
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/**
 * @brief Résout une URL de média en URL absolue exploitable par le navigateur.
 * Seuls les chemins `/uploads/` et les URLs HTTPS/HTTP absolues sont autorisés.
 * Toute autre valeur (schéma inconnu, chaîne vide) retourne '' pour éviter
 * l'injection CSS via backgroundImage.
 */
export function mediaUrl(url: string): string {
  if (!url) return '';
  if (isGradient(url)) return url;
  if (url.startsWith('/uploads/')) {
    const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api$/, '');
    return `${base}${url}`;
  }
  if (url.startsWith('https://') || url.startsWith('http://')) return url;
  // Schéma inconnu (javascript:, data:, etc.) — refusé pour éviter XSS/injection CSS
  return '';
}
