'use client';
/**
 * @file settings/page.tsx
 * @brief Réglages : thème (Fx23), langue (Fx22), édition de profil (Fx10), modération, déconnexion.
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Moon, Sun, Shield, LogOut, Globe, Camera, Lock } from 'lucide-react';
import { api, apiError } from '@/lib/api';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/store/theme';
import { useLang } from '@/store/lang';
import { useT } from '@/lib/useT';
import type { Lang } from '@/lib/i18n';
import AppHeader from '@/components/AppHeader';
import Avatar from '@/components/Avatar';
import PasswordInput from '@/components/PasswordInput';

const LANGS: { value: Lang; flag: string }[] = [
  { value: 'fr', flag: '🇫🇷' },
  { value: 'en', flag: '🇬🇧' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, ready } = useRequireAuth();
  const setUser = useAuth((s) => s.setUser);
  const logout = useAuth((s) => s.logout);
  const { theme, toggle } = useTheme();
  const { lang, setLang } = useLang();
  const t = useT();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [msg, setMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Changement de mot de passe
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdErr, setPwdErr] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    if (user) { setDisplayName(user.displayName || ''); setBio(user.bio || ''); }
  }, [user]);

  if (!ready || !user) return <div className="flex h-screen items-center justify-center text-tx3">{t('common.loading')}</div>;

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg('');
    try {
      const form = new FormData();
      form.append('file', file);
      const up = await api.post('/posts/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const { url } = up.data.data;
      const updated = await api.patch('/users/me', { avatarUrl: url });
      setUser(updated.data.data.user);
      setMsg('Photo de profil mise à jour ✓');
    } catch {
      setMsg('Impossible de mettre à jour la photo.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function save() {
    setMsg('');
    try {
      const r = await api.patch('/users/me', { displayName, bio });
      setUser(r.data.data.user);
      setMsg(t('settings.saved'));
    } catch (err) {
      setMsg(apiError(err));
    }
  }

  async function changeLanguage(l: Lang) {
    setLang(l);
    try { await api.patch('/users/me/language', { language: l }); } catch {}
  }

  async function changePassword() {
    setPwdMsg('');
    setPwdErr('');
    setPwdLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword: curPwd, newPassword: newPwd });
      setCurPwd('');
      setNewPwd('');
      setPwdMsg('Mot de passe mis à jour ✓');
    } catch (err) {
      setPwdErr(apiError(err));
    } finally {
      setPwdLoading(false);
    }
  }

  async function onLogout() {
    await logout();
    router.replace('/welcome');
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[600px] flex-col border-x border-bd">
      <AppHeader title={t('settings.title')} back />
      <main className="flex-1 space-y-6 p-4 pb-24 lg:pb-4">

        {/* Apparence — Fx23 */}
        <section className="rounded-xl3 border border-bd bg-sf p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-tx3">{t('settings.appearance')}</h2>
          <button onClick={toggle} className="flex w-full items-center justify-between">
            <span className="flex items-center gap-2 text-tx">
              {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />} {t('settings.darkMode')}
            </span>
            <span className={`relative h-6 w-11 rounded-full transition ${theme === 'dark' ? 'bg-ac' : 'bg-bd2'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${theme === 'dark' ? 'left-[22px]' : 'left-0.5'}`} />
            </span>
          </button>
        </section>

        {/* Langue — Fx22 */}
        <section className="rounded-xl3 border border-bd bg-sf p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-tx3">
            <span className="flex items-center gap-1.5"><Globe size={13} />{t('settings.language')}</span>
          </h2>
          <div className="flex gap-2">
            {LANGS.map(({ value, flag }) => (
              <button
                key={value}
                onClick={() => changeLanguage(value)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
                  lang === value ? 'bg-ac text-white' : 'border border-bd2 text-tx hover:bg-sf2'
                }`}
              >
                <span>{flag}</span>
                {value === 'fr' ? t('settings.langFr') : t('settings.langEn')}
              </button>
            ))}
          </div>
        </section>

        {/* Profil — Fx10 */}
        <section className="rounded-xl3 border border-bd bg-sf p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-tx3">{t('settings.profile')}</h2>

          {/* Photo de profil */}
          <div className="mb-4 flex items-center gap-4">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="group relative flex-shrink-0"
              aria-label="Changer la photo de profil"
            >
              <Avatar username={user.username} size={72} avatarUrl={user.avatarUrl} />
              <span className="absolute inset-0 flex items-center justify-center rounded-[24px] bg-black/50 opacity-0 transition group-hover:opacity-100">
                <Camera size={22} color="white" />
              </span>
            </button>
            <div>
              <p className="text-sm font-semibold text-tx">{user.displayName || user.username}</p>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mt-0.5 text-xs text-ac hover:underline disabled:opacity-50"
              >
                {uploading ? 'Envoi en cours…' : 'Changer la photo'}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={uploadAvatar} />
          </div>

          <label htmlFor="displayName" className="mb-1 block text-xs text-tx3">{t('settings.displayName')}</label>
          <input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mb-3 w-full rounded-xl2 border border-bd2 bg-bg px-3 py-2 text-tx outline-none focus:border-ac"
          />
          <label htmlFor="bio" className="mb-1 block text-xs text-tx3">{t('settings.bio')} ({160 - bio.length})</label>
          <textarea
            id="bio"
            value={bio}
            maxLength={160}
            onChange={(e) => setBio(e.target.value)}
            className="h-20 w-full resize-none rounded-xl2 border border-bd2 bg-bg px-3 py-2 text-tx outline-none focus:border-ac"
          />
          <button onClick={save} className="mt-3 w-full rounded-xl2 bg-ac py-2.5 font-semibold text-white">{t('settings.save')}</button>
          {msg && <p className="mt-2 text-sm text-ok">{msg}</p>}
        </section>

        {/* Sécurité — changement de mot de passe (comptes locaux uniquement) */}
        {user.provider !== 'google' && (
          <section className="rounded-xl3 border border-bd bg-sf p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-tx3">
              <span className="flex items-center gap-1.5"><Lock size={13} />Mot de passe</span>
            </h2>
            <div className="space-y-3">
              <PasswordInput
                placeholder="Mot de passe actuel"
                value={curPwd}
                onChange={setCurPwd}
                autoComplete="current-password"
                className="h-11 w-full rounded-xl2 border border-bd2 bg-bg px-3 py-2 pr-12 text-tx outline-none focus:border-ac"
              />
              <PasswordInput
                placeholder="Nouveau mot de passe (8+, maj, min, chiffre)"
                value={newPwd}
                onChange={setNewPwd}
                autoComplete="new-password"
                showStrength
                className="h-11 w-full rounded-xl2 border border-bd2 bg-bg px-3 py-2 pr-12 text-tx outline-none focus:border-ac"
              />
              <button
                onClick={changePassword}
                disabled={pwdLoading || !curPwd || !newPwd}
                className="w-full rounded-xl2 bg-ac py-2.5 font-semibold text-white disabled:opacity-60"
              >
                {pwdLoading ? 'Mise à jour…' : 'Changer le mot de passe'}
              </button>
              {pwdMsg && <p className="text-sm text-ok">{pwdMsg}</p>}
              {pwdErr && <p className="text-sm text-err">{pwdErr}</p>}
            </div>
          </section>
        )}

        {/* Administration — Fx21 (RBAC frontend) */}
        {(user.role === 'admin' || user.role === 'moderator') && (
          <section className="rounded-xl3 border border-bd bg-sf p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-tx3">{t('settings.admin')}</h2>
            <button onClick={() => router.push('/moderation')} className="flex items-center gap-2 text-tx">
              <Shield size={18} className="text-ac" /> {t('settings.modQueue')}
            </button>
          </section>
        )}

        <button onClick={onLogout} className="flex w-full items-center justify-center gap-2 rounded-xl2 border border-bd2 py-3 font-semibold text-err">
          <LogOut size={18} /> {t('settings.logout')}
        </button>
      </main>
    </div>
  );
}
