/**
 * @file Logo.tsx
 * @brief Logo de marque Twittrr : pastille corail au glyphe « T » prolongé d'une
 * brise (clin d'œil au souffle / au tweet), optionnellement suivi du mot-symbole.
 *
 * Le badge utilise `currentColor` (corail via `text-ac`) afin de rester cohérent
 * en thème clair et sombre ; le mot-symbole hérite du token de texte thémé `text-tx`.
 */
type LogoProps = {
  /** Taille du badge en pixels (carré). */
  size?: number;
  /** Affiche le mot-symbole « Twittrr » à droite du badge. */
  withWord?: boolean;
  /** Classes additionnelles sur le conteneur. */
  className?: string;
  /** Classes additionnelles sur le mot-symbole (ex. taille de police). */
  wordClassName?: string;
};

export function Logo({ size = 32, withWord = false, className = '', wordClassName = '' }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="text-ac" style={{ lineHeight: 0 }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          role="img"
          aria-label="Twittrr"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="32" height="32" rx="9" fill="currentColor" />
          <g stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11.5H23" />
            <path d="M16 11.5V18c0 3 1.6 4.6 4.6 4.6" />
          </g>
        </svg>
      </span>
      {withWord && <span className={`serif text-2xl text-tx ${wordClassName}`}>Twittrr</span>}
    </span>
  );
}
