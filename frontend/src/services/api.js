import { session, SESSION_EXPIRED_EVENT } from './session';

// Oxirgi "/" olib tashlanadi: "https://api.formo.uz/" + "/api" ikki slashli manzil bo'lib qolmasin
const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/** Server bergan fayl manzili: lokal xotirada nisbiy (/api/uploads/...), S3'da to'liq URL */
export const assetUrl = (url) => (!url || /^https?:\/\//.test(url) ? url : `${BASE_URL}${url}`);

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const token = auth ? session.accessToken : null;
  // FormData (fayl yuklash) — Content-Type'ni brauzer o'zi boundary bilan qo'yadi
  const form = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers: {
      ...(!form && { 'Content-Type': 'application/json' }),
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: form ? body : body ? JSON.stringify(body) : undefined,
    // Server osilib qolsa spinner abadiy aylanmasin (fayl yuklashga ko'proq vaqt)
    signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(form ? 120_000 : 20_000) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { res, data };
}

// Tokenlar localStorage'da — barcha tablar uchun umumiy. Ikki tab bir vaqtda bitta refresh token bilan
// yangilasa, server rotatsiyasi tufayli eskirgan juftlik saqlanib qolib, keyin sessiya yopilardi.
// Shuning uchun refresh tablararo qulf (Web Locks) ostida; qulf yo'q brauzerda — tab ichida bir marta.
const withRefreshLock = (fn) =>
  typeof navigator !== 'undefined' && navigator.locks?.request ? navigator.locks.request('formo-auth-refresh', fn) : fn();

// Bir vaqtda bir nechta so'rov 401 olsa ham refresh faqat bir marta chaqiriladi
let refreshing = null;
/**
 * `staleToken` — 401 olgan so'rov paytidagi refresh token. Qulfni kutayotganda boshqa tab allaqachon
 * yangilagan bo'lsa (token o'zgargan), serverga bormasdan yangi tokenlar bilan davom etiladi.
 * false — sessiya haqiqatan tugagan (401/403). Vaqtinchalik xato (5xx, 429, tarmoq) — ApiError, sessiya saqlanadi.
 */
function refreshTokens(staleToken) {
  refreshing ??= withRefreshLock(async () => {
    const refreshToken = session.refreshToken;
    if (!refreshToken) return false;
    if (staleToken && refreshToken !== staleToken) return true;
    let res;
    let data;
    try {
      ({ res, data } = await request('/auth/refresh', {
        method: 'POST',
        body: { refreshToken },
        auth: false,
      }));
    } catch {
      throw new ApiError("Internetga ulanib bo'lmadi. Tarmoqni tekshiring", 0);
    }
    if (res.status === 401 || res.status === 403) return false;
    if (!res.ok || !data?.accessToken || !data?.refreshToken) throw new ApiError(errorMessage(data), res.status);
    session.save(data);
    return true;
  }).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

function errorMessage(data) {
  const msg = data?.message;
  if (Array.isArray(msg)) return msg[0];
  return msg || 'Serverda xatolik yuz berdi';
}

export async function api(path, options = {}) {
  let res;
  let data;
  const refreshBefore = session.refreshToken;
  try {
    ({ res, data } = await request(path, options));
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new ApiError("Server javob bermayapti. Birozdan so'ng qayta urinib ko'ring", 0);
    }
    throw new ApiError("Internetga ulanib bo'lmadi. Tarmoqni tekshiring", 0);
  }

  if (res.status === 401 && options.auth !== false && session.refreshToken) {
    if (await refreshTokens(refreshBefore)) {
      try {
        ({ res, data } = await request(path, options));
      } catch {
        throw new ApiError("Internetga ulanib bo'lmadi. Tarmoqni tekshiring", 0);
      }
    } else {
      session.clear();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
  }

  if (!res.ok) {
    if (res.status === 429) throw new ApiError("Juda ko'p urinish. Bir daqiqadan so'ng qayta urinib ko'ring", 429);
    throw new ApiError(errorMessage(data), res.status);
  }
  return data;
}

/** Rasm/fayl (Bearer bilan) — <img> uchun object URL qaytaradi; chaqiruvchi URL.revokeObjectURL qiladi */
export async function apiBlobUrl(path) {
  const load = () =>
    fetch(`${BASE_URL}/api${path}`, {
      headers: session.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {},
      // Server osilib qolsa spinner abadiy aylanmasin — request()dagi bilan bir xil timeout
      signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(20_000) : undefined,
    });
  const refreshBefore = session.refreshToken;
  const safeLoad = async () => {
    try {
      return await load();
    } catch (err) {
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
        throw new ApiError("Server javob bermayapti. Birozdan so'ng qayta urinib ko'ring", 0);
      }
      throw new ApiError("Internetga ulanib bo'lmadi. Tarmoqni tekshiring", 0);
    }
  };
  let res = await safeLoad();
  if (res.status === 401 && session.refreshToken && (await refreshTokens(refreshBefore))) res = await safeLoad();
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(errorMessage(data), res.status);
  }
  return URL.createObjectURL(await res.blob());
}
