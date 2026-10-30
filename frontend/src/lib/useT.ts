/**
 * @file useT.ts
 * @brief Hook de traduction — retourne une fonction t(key) selon la langue active (Fx22).
 */
import { useCallback } from 'react';
import { useLang } from '@/store/lang';
import { translate, type TKey } from '@/lib/i18n';

export function useT() {
  const { lang } = useLang();
  return useCallback((key: TKey) => translate(lang, key), [lang]);
}
