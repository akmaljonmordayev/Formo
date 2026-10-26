import { session, SESSION_EXPIRED_EVENT } from './session';

// Oxirgi "/" olib tashlanadi: "https://api.formo.uz/" + "/api" ikki slashli manzil bo'lib qolmasin
const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const token = auth ? session.accessToken : null;
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { res, data };
}

// Bir vaqtda bir nechta so'rov 401 olsa ham refresh faqat bir marta chaqiriladi
let refreshing = null;
function refreshTokens() {
  refreshing ??= (async () => {
    const refreshToken = session.refreshToken;
    if (!refreshToken) return false;
    const { res, data } = await request('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    });
    if (!res.ok) return false;
    session.save(data);
    return true;
  })().finally(() => {
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
  let { res, data } = await request(path, options);

  if (res.status === 401 && options.auth !== false && session.refreshToken) {
    if (await refreshTokens()) {
      ({ res, data } = await request(path, options));
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
    });
  let res = await load();
  if (res.status === 401 && session.refreshToken && (await refreshTokens())) res = await load();
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(errorMessage(data), res.status);
  }
  return URL.createObjectURL(await res.blob());
}
