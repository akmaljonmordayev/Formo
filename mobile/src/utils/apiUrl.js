/**
 * API manzilini aniqlash.
 *
 * Muammo: mobile/.env da EXPO_PUBLIC_API_URL=http://<kompyuter-IP>:3001/api yoziladi, lekin Wi-Fi
 * almashsa kompyuter IP'si o'zgaradi va ilova eski IP'ga ulanib "fetch failed / canceled" beradi.
 * Yechim (faqat dev): .env da lokal tarmoq manzili bo'lsa, xostni Metro (Expo) serveri xosti bilan
 * almashtiramiz — telefon JS kodni aynan shu IP'dan yuklagan, demak backend ham shu IP'da (port o'sha).
 * Production (https://api.formo.uz) manziliga tegilmaydi.
 */
export const DEFAULT_API_URL = 'https://api.formo.uz/api';

const PRIVATE_HOST = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/;

/** "http://192.168.1.42:8081/" → "192.168.1.42" (yoki null) */
export function hostOf(url) {
  const m = /^https?:\/\/\[?([^\]/:]+)\]?(?::\d+)?/i.exec(String(url || ''));
  return m ? m[1] : null;
}

/**
 * @param {string|undefined} envUrl   EXPO_PUBLIC_API_URL
 * @param {string|null} devServerUrl  Metro manzili (dev'da), masalan "http://192.168.1.42:8081/"
 */
export function resolveApiUrl(envUrl, devServerUrl = null) {
  let url = String(envUrl || '').trim().replace(/\/+$/, '') || DEFAULT_API_URL;
  if (!url.endsWith('/api')) url = `${url}/api`;

  const envHost = hostOf(url);
  const devHost = hostOf(devServerUrl);
  // Emulyator (10.0.2.2) yoki brauzer (localhost) Metro'si — almashtirish shart emas
  if (envHost && devHost && devHost !== 'localhost' && devHost !== '127.0.0.1' && PRIVATE_HOST.test(envHost) && envHost !== devHost) {
    url = url.replace(envHost, devHost);
  }
  return url;
}
