'use client';
/**
 * @file AppShell.tsx
 * @brief Ossature responsive de l'application.
 *
 * Desktop (≥ lg) : 3 colonnes (navigation gauche 240px, contenu central 600px, sidebar droite).
 * Mobile : contenu seul + BottomNav flottante.
 */
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Compass, Bell, MessageSquare, User, Settings, Shield, PenLine, Moon, Sun } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/store/theme';
import { useT } from '@/lib/useT';
import { Logo } from '@/components/Logo';
import Avatar from './Avatar';
import RightSidebar from './RightSidebar';

export default function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuth((s) => s.user);
  const { theme, toggle } = useTheme();
  const t = useT();
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user) { setUnreadMessages(0); return; }
    const fetch = () => {
      api.get('/conversations/unread-count')
        .then((r) => setUnreadMessages(r.data.data.count ?? 0))
        .catch(() => {});
    };
    fetch();
    const timer = setInterval(fetch, 30_000);
    return () => clearInterval(timer);
  }, [user]);

  useEffect(() => {
    if (pathname === '/messages' || pathname.startsWith('/messages/')) setUnreadMessages(0);
  }, [pathname]);

  const navItems = [
    { href: '/feed',          icon: Home,          label: t('nav.feed'),          badge: 0 },
    { href: '/explore',       icon: Compass,       label: t('nav.explore'),       badge: 0 },
    { href: '/notifications', icon: Bell,          label: t('nav.notifications'), badge: 0 },
    { href: '/messages',      icon: MessageSquare, label: t('nav.messages'),      badge: unreadMessages },
    { href: user ? `/profile/${user.username}` : '/login', icon: User, label: t('nav.profile'), badge: 0 },
    { href: '/settings',      icon: Settings,      label: t('nav.settings'),      badge: 0 },
  ];

  const isActive = (href: string) =>
    pathname === href || (href.startsWith('/profile') && pathname.startsWith('/profile'));

  return (
    <div className="mx-auto flex w-full max-w-[1100px] justify-center">
      {/* ---- Navigation gauche (desktop) ---- */}
      <aside className="sticky top-0 hidden h-screen w-[240px] flex-shrink-0 flex-col px-3 py-5 lg:flex">
        <button onClick={() => router.push('/feed')} className="mb-6 flex items-center gap-2.5 px-3">
          <Logo size={36} withWord />
        </button>

        <nav className="flex flex-col gap-1">
          {navItems.map(({ href, icon: Icon, label, badge }) => {
            const active = isActive(href);
            return (
              <button
                key={href}
                onClick={() => router.push(href)}
                className={`flex items-center gap-3.5 rounded-2xl px-3.5 py-2.5 text-[15px] transition ${
                  active ? 'font-bold text-tx' : 'text-tx2 hover:bg-sf'
                }`}
              >
                <span className="relative">
                  <Icon size={22} strokeWidth={active ? 2.4 : 2} className={active ? 'text-ac' : ''} />
                  {badge > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-ac text-[9px] font-bold text-white">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>
                {label}
              </button>
            );
          })}

          {(user?.role === 'moderator' || user?.role === 'admin') && (
            <button
              onClick={() => router.push('/moderation')}
              className={`flex items-center gap-3.5 rounded-2xl px-3.5 py-2.5 text-[15px] transition ${
                pathname === '/moderation' ? 'font-bold text-tx' : 'text-tx2 hover:bg-sf'
              }`}
            >
              <Shield size={22} strokeWidth={pathname === '/moderation' ? 2.4 : 2} className={pathname === '/moderation' ? 'text-ac' : ''} />
              {t('nav.moderation')}
            </button>
          )}
        </nav>

        <button
          onClick={() => router.push(user ? '/compose' : '/login')}
          className="mt-4 flex items-center justify-center gap-2 rounded-2xl py-3 font-semibold text-white transition hover:opacity-90"
          style={{ background: 'var(--c-ac)' }}
        >
          <PenLine size={18} /> {t('nav.publish')}
        </button>

        <div className="mt-auto flex items-center gap-2 rounded-2xl p-2">
          {user ? (
            <>
              <button onClick={() => router.push(`/profile/${user.username}`)} aria-label={t('nav.profile')}>
                <Avatar username={user.username} size={38} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-tx">{user.displayName}</div>
                <div className="truncate text-xs text-tx3">@{user.username}</div>
              </div>
            </>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="flex-1 rounded-2xl py-2 text-sm font-semibold text-bg"
              style={{ background: 'var(--c-tx)' }}
            >
              {t('nav.signIn')}
            </button>
          )}
          <button onClick={toggle} aria-label={t('settings.darkMode')} className="text-tx2">
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </aside>

      {/* ---- Colonne centrale ---- */}
      <div className="min-h-screen w-full max-w-[600px] flex-shrink-0 border-x border-bd bg-bg">
        {children}
      </div>

      {/* ---- Sidebar droite (desktop) ---- */}
      <RightSidebar />
    </div>
  );
}
