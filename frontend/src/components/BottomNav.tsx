'use client';
/**
 * @file BottomNav.tsx
 * @brief Barre de navigation inférieure (mobile) — pill sombre flottant fidèle à la maquette.
 *
 * Rendu directement depuis Providers (enfant direct de body) pour garantir que
 * position:fixed soit relatif au viewport et non à un ancêtre conteneur.
 */
import { usePathname, useRouter } from 'next/navigation';
import { Home, Compass, Plus, Bell, User, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/store/auth';

/**
 * Pages sur lesquelles la barre de navigation ne doit pas apparaître.
 * Inclut /welcome pour éviter la nav sur les pages d'onboarding.
 */
const HIDDEN_PATHS = new Set(['/login', '/register', '/welcome']);

interface NavTabProps {
  active: boolean;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  dot?: boolean;
}

/** @brief Onglet de la barre (icône + libellé), style pill sombre. */
function NavTab({ active, label, icon: Icon, onClick, dot }: Readonly<NavTabProps>) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="relative flex h-[46px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[17px] transition"
      style={{ background: active ? 'rgba(255,255,255,.11)' : 'transparent' }}
    >
      <Icon size={19} color={active ? '#fff' : 'rgba(255,255,255,.48)'} />
      <span className="text-[9px]" style={{ color: active ? '#fff' : 'rgba(255,255,255,.4)' }}>
        {label}
      </span>
      {dot && (
        <span
          className="absolute right-4 top-2 h-[7px] w-[7px] rounded-full"
          style={{ background: 'var(--c-ac)', border: '1.5px solid var(--c-nav)' }}
        />
      )}
    </button>
  );
}

/**
 * @brief Barre de navigation mobile flottante.
 *
 * Styles inline intentionnels sur position:fixed pour garantir le comportement
 * indépendamment de tout contexte CSS parent.
 */
export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuth((s) => s.user);

  if (HIDDEN_PATHS.has(pathname)) return null;

  const go = (href: string) => () => router.push(href);
  const profileHref = user ? `/profile/${user.username}` : '/login';

  return (
    <nav
      className="lg:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '0 10px 10px',
        pointerEvents: 'none',
      }}
    >
      <div className="mx-auto w-full max-w-[600px]" style={{ pointerEvents: 'auto' }}>
        <div
          className="flex items-center justify-between rounded-[24px] p-[7px]"
          style={{
            background: 'var(--c-nav)',
            boxShadow: '0 8px 32px rgba(0,0,0,.3),0 2px 8px rgba(0,0,0,.18)',
          }}
        >
          <NavTab active={pathname === '/feed'}        label="Accueil" icon={Home}    onClick={go('/feed')} />
          <NavTab active={pathname === '/explore'}     label="Explorer" icon={Compass} onClick={go('/explore')} />

          {/* Bouton central « Publier » — accent corail */}
          <button
            onClick={() => router.push(user ? '/compose' : '/login')}
            aria-label="Publier"
            className="flex flex-1 items-center justify-center"
          >
            <span
              className="flex h-[46px] w-[46px] items-center justify-center rounded-[17px]"
              style={{
                background: 'var(--c-ac)',
                boxShadow: '0 4px 14px rgba(255,92,69,.45)',
              }}
            >
              <Plus size={22} color="#fff" />
            </span>
          </button>

          <NavTab active={pathname === '/notifications'} label="Activité" icon={Bell} onClick={go('/notifications')} dot />
          <NavTab active={pathname.startsWith('/profile')} label="Profil" icon={User} onClick={go(profileHref)} />
        </div>
      </div>
    </nav>
  );
}
