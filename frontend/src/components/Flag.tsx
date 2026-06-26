/**
 * @file Flag.tsx
 * @brief Drapeaux FR/GB en SVG inline.
 *
 * Les emoji 🇫🇷/🇬🇧 (regional indicators) ne rendent pas sur Windows/Chrome,
 * qui n'embarque pas de glyphes de drapeau → on affichait "FR"/"GB". Un SVG
 * inline rend partout, sans police emoji ni image externe (bloquée par la CSP).
 */
import type { Lang } from '@/lib/i18n';

export default function Flag({ lang, size = 14 }: Readonly<{ lang: Lang; size?: number }>) {
  const w = Math.round(size * 1.5);
  const common = { width: w, height: size, className: 'inline-block shrink-0 rounded-[2px]' };
  if (lang === 'fr') {
    return (
      <svg viewBox="0 0 3 2" {...common} aria-hidden>
        <rect width="3" height="2" fill="#fff" />
        <rect width="1" height="2" fill="#0055A4" />
        <rect x="2" width="1" height="2" fill="#EF4135" />
      </svg>
    );
  }
  // Union Jack (en) — version compacte standard.
  return (
    <svg viewBox="0 0 60 30" {...common} aria-hidden>
      <clipPath id="flag-uk-t">
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#flag-uk-t)" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}
