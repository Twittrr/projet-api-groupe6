/**
 * @file layout.tsx
 * @brief Layout racine : métadonnées, polices next/font (zéro render-blocking), providers.
 *
 * next/font charge Inter & Instrument Serif en self-hosted avec preload automatique,
 * évitant le rendu bloquant du @import CSS et améliorant le LCP/CLS (cible CdC : TTI < 3s sur 3G).
 */
import type { Metadata, Viewport } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';

/* Inter : police sans-serif principale (UI, libellés, corps) */
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

/* Instrument Serif : police d'accroche (titres, contenu des posts) */
const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Breezy — un journal social, plus lent, plus soigné',
  description: 'Réseau social léger et réactif, optimisé mobile-first.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FBFAF6',
};

/**
 * Applique le thème mémorisé avant le premier rendu (évite tout clignotement clair→sombre).
 * Exécuté en inline script synchrone côté client, avant hydratation React.
 */
const themeBootstrap = `try{var t=localStorage.getItem('breezy-theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" data-theme="light" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
