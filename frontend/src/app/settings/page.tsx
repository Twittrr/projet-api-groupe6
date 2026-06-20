'use client';
/**
 * @file settings/page.tsx
 * @brief Réglages : thème (Fx23), édition de profil (Fx10), accès modération, déconnexion.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Moon, Sun, Shield, LogOut } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/store/theme';
import AppHeader from '@/components/AppHeader';

export default function SettingsPage() {
  const router = useRouter();
  const { user, ready } = useRequireAuth();
  const setUser = useAuth((s) => s.setUser);
  const logout = useAuth((s) => s.logout);
  const { theme, toggle } = useTheme();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (user) { setDisplayName(user.displayName || ''); setBio(user.bio || ''); }
  }, [user]);

  if (!ready || !user) return <div className="flex h-screen items-center justify-center text-tx3">Chargement…</div>;

  async function save() {
    setMsg('');
    try {
      const r = await api.patch('/users/me', { displayName, bio });
      setUser(r.data.data.user);
      setMsg('Profil enregistré ✓');
    } catch (err) {
      setMsg(apiError(err));
    }
  }

  async function onLogout() {
    await logout();
    router.replace('/welcome');
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[600px] flex-col border-x border-bd">
      <AppHeader title="Réglages" back />
      <main className="flex-1 space-y-6 p-4">
        {/* Apparence — Fx23 */}
        <section className="rounded-xl3 border border-bd bg-sf p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-tx3">Apparence</h2>
          <button onClick={toggle} className="flex w-full items-center justify-between">
            <span className="flex items-center gap-2 text-tx">
              {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />} Mode sombre
            </span>
            <span className={`relative h-6 w-11 rounded-full transition ${theme === 'dark' ? 'bg-ac' : 'bg-bd2'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${theme === 'dark' ? 'left-[22px]' : 'left-0.5'}`} />
            </span>
          </button>
        </section>

        {/* Profil — Fx10 */}
        <section className="rounded-xl3 border border-bd bg-sf p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-tx3">Profil</h2>
          <label htmlFor="displayName" className="mb-1 block text-xs text-tx3">Nom affiché</label>
          <input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mb-3 w-full rounded-xl2 border border-bd2 bg-bg px-3 py-2 text-tx outline-none focus:border-ac"
          />
          <label htmlFor="bio" className="mb-1 block text-xs text-tx3">Biographie ({160 - bio.length})</label>
          <textarea
            id="bio"
            value={bio}
            maxLength={160}
            onChange={(e) => setBio(e.target.value)}
            className="h-20 w-full resize-none rounded-xl2 border border-bd2 bg-bg px-3 py-2 text-tx outline-none focus:border-ac"
          />
          <button onClick={save} className="mt-3 w-full rounded-xl2 bg-ac py-2.5 font-semibold text-white">Enregistrer</button>
          {msg && <p className="mt-2 text-sm text-ok">{msg}</p>}
        </section>

        {/* Administration — Fx21 (RBAC frontend) */}
        {(user.role === 'admin' || user.role === 'moderator') && (
          <section className="rounded-xl3 border border-bd bg-sf p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-tx3">Administration</h2>
            <button onClick={() => router.push('/moderation')} className="flex items-center gap-2 text-tx">
              <Shield size={18} className="text-ac" /> File de modération
            </button>
          </section>
        )}

        <button onClick={onLogout} className="flex w-full items-center justify-center gap-2 rounded-xl2 border border-bd2 py-3 font-semibold text-err">
          <LogOut size={18} /> Se déconnecter
        </button>
      </main>
    </div>
  );
}
