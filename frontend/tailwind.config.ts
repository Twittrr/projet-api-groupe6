import type { Config } from 'tailwindcss';

/**
 * Tailwind config Twittrr.
 *
 * Deux niveaux de couleurs coexistent intentionnellement :
 * - Tokens CSS-variables (c-*) : thémés clair/sombre via [data-theme].
 * - Palette statique (paper, ink, coral, moss) : conservée pour la charte
 *   graphique historique du mockup.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      /* ---------- Tokens thémés (CSS variables) ---------- */
      colors: {
        bg:  'var(--c-bg)',
        sf:  'var(--c-sf)',
        sf2: 'var(--c-sf2)',
        bd:  'var(--c-bd)',
        bd2: 'var(--c-bd2)',
        tx:  'var(--c-tx)',
        tx2: 'var(--c-tx2)',
        tx3: 'var(--c-tx3)',
        tx4: 'var(--c-tx4)',
        ac:  'var(--c-ac)',
        acd: 'var(--c-acd)',
        nav: 'var(--c-nav)',
        ok:  'var(--c-ok)',
        err: 'var(--c-err)',

        /* ---------- Palette statique (charte mockup) ---------- */
        paper: '#FBFAF6',
        ink: {
          50:  '#F7F6F2',
          100: '#EFEDE4',
          200: '#DFDBCC',
          900: '#111110',
          950: '#0A0A09',
        },
        coral: {
          400: '#FF7A66',
          500: '#FF5C45',
          600: '#E94A35',
        },
        moss: {
          500: '#3E7C5A',
        },
      },

      /* ---------- Typographie ---------- */
      fontFamily: {
        sans:  ['var(--font-inter)',  'Inter', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', '"Instrument Serif"', 'Georgia', 'serif'],
      },

      /* ---------- Rayons ---------- */
      borderRadius: {
        xl2: '20px',
        xl3: '24px',
        xl4: '32px',
        xl5: '44px',
      },

      /* ---------- Ombres ---------- */
      boxShadow: {
        soft:  '0 1px 0 rgba(17,17,16,0.04), 0 8px 24px -12px rgba(17,17,16,0.18)',
        phone: '0 30px 80px -20px rgba(17,17,16,0.35), 0 8px 24px -8px rgba(17,17,16,0.25)',
      },

      /* ---------- Animations ---------- */
      keyframes: {
        sin:  { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        hpop: { '0%': { transform: 'scale(1)' }, '35%': { transform: 'scale(1.5)' }, '70%': { transform: 'scale(.88)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        sin:  'sin .22s cubic-bezier(.34,1.2,.64,1) both',
        hpop: 'hpop .35s ease both',
      },
    },
  },
  plugins: [],
};

export default config;
