'use client';
/**
 * @file BottomNav.tsx
 * @brief Barre de navigation inférieure (mobile) — pill sombre flottant fidèle à la maquette.
 */
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Compass, Plus, Bell, User, MessageSquare, type LucideIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useT } from '@/lib/useT';

const HIDDEN_PATHS = new Set(['/login', '/register', '/welcome']);

interface NavTabProps {
  active: boolean;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  dot?: boolean;
  badge?: number;
}

function NavTab({ active, label, icon: Icon, onClick, dot, badge }: Readonly<NavTabProps>) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="relative flex h-[46px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[17px] transition"
      style={{ background: active ? 'rgba(255,255,255,.11)' : 'transparent' }}
    >
      <span className="relative">
        <Icon size={19} color={active ? '#fff' : 'rgba(255,255,255,.48)'} />
        {badge != null && badge > 0 && (
          <span
            className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-0.5 text-[8px] font-bold text-white"
            style={{ background: 'var(--c-ac)', border: '1.5px solid var(--c-nav)' }}
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
        {dot && !badge && (
          <span
            className="absolute -right-0.5 -top-0.5 h-[7px] w-[7px] rounded-full"
            style={{ background: 'var(--c-ac)', border: '1.5px solid var(--c-nav)' }}
          />
        )}
      </span>
      <span className="text-[9px]" style={{ color: active ? '#fff' : 'rgba(255,255,255,.4)' }}>
        {label}
      </span>
    </button>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const t = useT();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    const fetchCount = () => {
      api.get('/notifications/unread-count')
        .then((r) => setUnreadCount(r.data.data.count ?? 0))
        .catch(() => {});
    };
    fetchCount();
    const timer = setInterval(fetchCount, 60_000);
    return () => clearInterval(timer);
  }, [user]);

  useEffect(() => {
    if (!user) { setUnreadMessages(0); return; }
    const fetchMsg = () => {
      api.get('/conversations/unread-count')
        .then((r) => setUnreadMessages(r.data.data.count ?? 0))
        .catch(() => {});
    };
    fetchMsg();
    const timer = setInterval(fetchMsg, 30_000);
    return () => clearInterval(timer);
  }, [user]);

  useEffect(() => {
    if (pathname === '/notifications') setUnreadCount(0);
  }, [pathname]);

  useEffect(() => {
    if (pathname === '/messages' || pathname.startsWith('/messages/')) setUnreadMessages(0);
  }, [pathname]);

  if (HIDDEN_PATHS.has(pathname)) return null;

  const go = (href: string) => () => router.push(href);
  const profileHref = user ? `/profile/${user.username}` : '/login';

  return (
    <nav
      className="lg:hidden"
      style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999, padding: '0 10px 10px', pointerEvents: 'none' }}
    >
      <div className="mx-auto w-full max-w-[600px]" style={{ pointerEvents: 'auto' }}>
        <div
          className="flex items-center justify-between rounded-[24px] p-[7px]"
          style={{ background: 'var(--c-nav)', boxShadow: '0 8px 32px rgba(0,0,0,.3),0 2px 8px rgba(0,0,0,.18)' }}
        >
          <NavTab active={pathname === '/feed'}           label={t('nav.home')}     icon={Home}          onClick={go('/feed')} />
          <NavTab active={pathname === '/explore'}        label={t('nav.explore')}  icon={Compass}       onClick={go('/explore')} />

          <button
            onClick={() => router.push(user ? '/compose' : '/login')}
            aria-label={t('nav.publish')}
            className="flex flex-1 items-center justify-center"
          >
            <span
              className="flex h-[46px] w-[46px] items-center justify-center rounded-[17px]"
              style={{ background: 'var(--c-ac)', boxShadow: '0 4px 14px rgba(255,92,69,.45)' }}
            >
              <Plus size={22} color="#fff" />
            </span>
          </button>

          <NavTab active={pathname.startsWith('/messages')} label={t('nav.messages')}  icon={MessageSquare} onClick={go('/messages')} badge={unreadMessages} />
          <NavTab active={pathname === '/notifications'}    label={t('nav.activity')}  icon={Bell}          onClick={go('/notifications')} dot={unreadCount > 0} />
          <NavTab active={pathname.startsWith('/profile')} label={t('nav.profile')}   icon={User}          onClick={go(profileHref)} />
        </div>
      </div>
    </nav>
  );
}
