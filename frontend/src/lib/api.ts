/**
 * @file api.ts
 * @brief Client HTTP Axios partagé : injection du JWT et rafraîchissement silencieux.
 *
 * Le jeton d'accès est conservé en mémoire (et non en localStorage) pour limiter
 * l'exposition au XSS ; le refresh token vit dans un cookie HttpOnly géré par le
 * service Auth.
 */
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

// URL de l'API : relative par défaut.
// Garde-fou runtime : si l'image Docker a été construite avec une URL absolue
// (ex. NEXT_PUBLIC_API_URL=http://localhost/api) mais que la page est servie sur
// un port différent (ex. :8080), les requêtes violerait le CSP. On détecte ce
// cas au runtime et on repasse en URL relative pour rester same-origin.
const _baked = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const API_URL = (() => {
  if (globalThis.window === undefined || !_baked.startsWith('http')) return _baked;
  try {
    const baked   = new URL(_baked);
    const current = new URL(globalThis.location.href);
    if (baked.hostname === current.hostname && baked.port !== current.port) {
      return baked.pathname; // '/api' — URL relative same-origin
    }
  } catch { /* noop */ }
  return _baked;
})();

// Jeton d'accès conservé en mémoire (jamais en localStorage : limite l'exposition au XSS).
// Le refresh token vit dans un cookie HttpOnly géré par le service Auth.
let accessToken: string | null = null;
/** @brief Retourne le jeton d'accès courant. */
export const getAccessToken = () => accessToken;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // envoi du cookie de refresh
});

// Injecte le Bearer token sur chaque requête
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Rejoue une requête 401 après rafraîchissement silencieux du token
let refreshing: Promise<string | null> | null = null;
let sessionExpired = false;

type RefreshFailedCallback = () => void;
let onRefreshFailed: RefreshFailedCallback | null = null;
export const setOnRefreshFailed = (cb: RefreshFailedCallback) => { onRefreshFailed = cb; };

export const setAccessToken = (t: string | null) => {
  accessToken = t;
  if (t) sessionExpired = false;
};

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
    const token = res.data?.data?.accessToken ?? null;
    setAccessToken(token);
    return token;
  } catch {
    setAccessToken(null);
    sessionExpired = true;
    onRefreshFailed?.();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const isAuthRoute = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');
    if (error.response?.status === 401 && !original._retry && !isAuthRoute && !sessionExpired) {
      original._retry = true;
      refreshing = refreshing || refreshAccessToken();
      const token = await refreshing;
      refreshing = null;
      if (token) {
        original.headers = original.headers || {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    throw error;
  }
);

/**
 * @brief Extrait un message d'erreur lisible depuis l'enveloppe `{ error }` de l'API.
 * @param err Erreur capturée (typiquement une AxiosError).
 * @param fallback Message par défaut si aucun message structuré n'est disponible.
 * @returns Le message à présenter à l'utilisateur.
 */
export function apiError(err: unknown, fallback = 'Une erreur est survenue.'): string {
  const e = err as AxiosError<{ error?: { message?: string } }>;
  return e?.response?.data?.error?.message || fallback;
}
