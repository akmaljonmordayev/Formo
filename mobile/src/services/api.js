import * as storage from '../utils/storage';

// mobile/.env:  EXPO_PUBLIC_API_URL=http://<kompyuter-IP>:3001/api
// Telefonda "localhost" ishlamaydi — kompyuterning Wi-Fi IP manzili kerak.
// Android emulator uchun: http://10.0.2.2:3001/api
const BASE_URL = (() => {
  const raw = (process.env.EXPO_PUBLIC_API_URL || 'https://api.formo.uz/api').trim().replace(/\/+$/, '');
  if (!raw) return 'https://api.formo.uz/api';
  return raw.endsWith('/api') ? raw : `${raw}/api`;
})();

// ─── Error types ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export class AuthError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'AuthError';
  }
}

// Sessiya muddati tugaganda (refresh ham ishlamasa) chaqiriladigan callback
let sessionExpiredHandler = null;

// ─── Phone helper (kept local so api.js has no extra deps) ───────────────────

/** "+998 90 123 45 67" / "901234567" -> "+998901234567" */
export function normalizePhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  digits = digits.slice(0, 9);
  return `+998${digits}`;
}

// ─── Core request helper ─────────────────────────────────────────────────────

// Tarmoq osilib qolsa ekran abadiy kutmasin. Abort → TypeError, shuning uchun
// mavjud `networkError` xatosiga aylanadi (secrets/URL log qilinmaydi).
const REQUEST_TIMEOUT_MS = 15000;

async function rawRequest(path, { method = 'GET', body, auth = true } = {}) {
  const token = await storage.getToken();
  const controller = typeof AbortController === 'undefined' ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      ...(controller ? { signal: controller.signal } : {}),
    });

    const data = await response.json().catch(() => null);
    return { response, data };
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new TypeError('Request timed out');
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const errorMessage = (data, fallback) => {
  const msg = data?.message;
  if (Array.isArray(msg)) return msg[0] || fallback;
  return msg || fallback;
};

let refreshing = null;

async function refreshTokens() {
  refreshing ??= (async () => {
    const refreshToken = await storage.getRefreshToken();
    if (!refreshToken) return false;

    const { response, data } = await rawRequest('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    });
    if (!response.ok) return false;

    await storage.setToken(data.accessToken);
    await storage.setRefreshToken(data.refreshToken);
    return true;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function request(path, options = {}) {
  let { response, data } = await rawRequest(path, options);

  // 401 — bir marta token yangilab ko'rishga urinamiz
  if (response.status === 401 && options.auth !== false) {
    if (await refreshTokens()) {
      ({ response, data } = await rawRequest(path, options));
    } else {
      await storage.removeToken();
      await storage.removeRefreshToken();
      sessionExpiredHandler?.();
      throw new AuthError(errorMessage(data, 'Unauthorized'));
    }
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new ApiError("Juda ko'p urinish. Birozdan so'ng qayta urinib ko'ring", 429);
    }
    throw new ApiError(errorMessage(data, `API error: ${response.status}`), response.status);
  }

  return data;
}

async function storeSession(data) {
  if (data?.accessToken) await storage.setToken(data.accessToken);
  if (data?.refreshToken) await storage.setRefreshToken(data.refreshToken);
  return data?.user;
}

// ─── Auth API ────────────────────────────────────────────────────────────────

export const auth = {
  /**
   * Login with phone + password. Phone: "+998XXXXXXXXX".
   * @returns {Promise<object>} user object
   */
  async login(phone, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      auth: false,
      body: { phone: normalizePhone(phone), password },
    });
    return storeSession(data);
  },

  /**
   * Register a new user.
   * @param {{phone, password, fullName, gender?, age?, height?, weight?}} payload
   * @returns {Promise<object>} user object
   */
  async register(payload) {
    const data = await request('/auth/register', {
      method: 'POST',
      auth: false,
      body: { ...payload, phone: normalizePhone(payload.phone) },
    });
    return storeSession(data);
  },

  /** Fetch the currently authenticated user's profile. */
  me: () => request('/auth/me'),

  /**
   * PATCH /auth/me — profil o'lchovlari. Faqat shu maydonlar (boshqasi → 400); null qiymatni tozalaydi.
   * @param {{gender?: 'MALE'|'FEMALE'|null, age?: number|null, height?: number|null, weight?: number|null}} fields
   * @returns {Promise<object>} yangilangan user
   */
  updateMe: (fields) => request('/auth/me', { method: 'PATCH', body: fields }),

  /** Invalidate the current session on the server and clear local tokens. */
  async logout() {
    try {
      if (await storage.getToken()) await request('/auth/logout', { method: 'POST' });
    } finally {
      await storage.removeToken();
      await storage.removeRefreshToken();
    }
  },

  /** Sessiya tugaganda (refresh ham o'tmasa) chaqiriladi — login ekraniga qaytarish uchun */
  onSessionExpired(callback) {
    sessionExpiredHandler = callback;
  },
};

// ─── Shop API (role USER) ───────────────────────────────────────────────────

/** { a: 1, b: undefined } -> "?a=1" */
function query(params = {}) {
  const parts = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

/** Katalog: GET'lar ochiq (public), sevimlilar — faqat USER */
export const catalog = {
  /** [{ id, name, slug, clubsCount }] */
  categories: () => request('/catalog/categories'),

  /** { items: [club card], total, page, limit } — club card: { id, name, league, season, code, markColor, category, kitsCount } */
  clubs: ({ categoryId, category, search, page, limit } = {}) =>
    request(`/catalog/clubs${query({ categoryId, category, search, page, limit })}`),

  /** [club card + ordersCount] */
  popular: (limit) => request(`/catalog/clubs/popular${query({ limit })}`),

  /** Club + kits: [{ id, label, title, bgColor, textColor, price, priceBreakdown, sizes, ... }] */
  club: (id) => request(`/catalog/clubs/${id}`),

  /** Kit + { club, siblings, sizeGroups } */
  kit: (id) => request(`/catalog/kits/${id}`),

  favorites: () => request('/catalog/favorites'),
  addFavorite: (clubId) => request(`/catalog/clubs/${clubId}/favorite`, { method: 'PUT' }),
  removeFavorite: (clubId) => request(`/catalog/clubs/${clubId}/favorite`, { method: 'DELETE' }),
};

/**
 * Server savati. Har bir o'zgartiruvchi so'rov butun savatni qaytaradi:
 * { items, count, promocode, summary: { subtotal, discount, delivery, total } }
 */
export const cart = {
  /** Promokod berilsa chegirma bilan hisoblanadi (yaroqsiz bo'lsa 400). */
  view: (promocode) => request(`/cart${query({ promocode })}`),

  /** @param {{kitId, shirtSize, printName?, printNumber?, numberOnShorts?, withShorts?, shortsSize?, quantity?}} item */
  add: (item) => request('/cart/items', { method: 'POST', body: item }),

  update: (id, fields) => request(`/cart/items/${id}`, { method: 'PATCH', body: fields }),
  remove: (id) => request(`/cart/items/${id}`, { method: 'DELETE' }),
  clear: () => request('/cart', { method: 'DELETE' }),

  /** Promokodni tekshirish — chegirmali savat yoki 400 (sababi `message`da). */
  applyPromocode: (code) => request('/cart/promocode', { method: 'POST', body: { code } }),
};

/** Yetkazish manzillari: { id, label, address, apartment, latitude, longitude, isDefault } */
export const addresses = {
  list: () => request('/addresses'),
  create: (payload) => request('/addresses', { method: 'POST', body: payload }),
  update: (id, fields) => request(`/addresses/${id}`, { method: 'PATCH', body: fields }),
  remove: (id) => request(`/addresses/${id}`, { method: 'DELETE' }),
};

/** Rasmiylashtirish va buyurtmalarim */
export const orders = {
  /** { fee, days: [{ date: 'YYYY-MM-DD', dayLabel, slots: [{ slot, start, end, remaining, available }] }] } */
  deliverySlots: (days) => request(`/checkout/delivery-slots${query({ days })}`),

  /**
   * Savatdan buyurtma: CASH -> NEW (operatorga tushadi), CLICK/PAYME -> PENDING_PAYMENT.
   * @param {{addressId, deliveryDate, deliverySlot, paymentMethod, promocode?, comment?}} payload
   */
  checkout: (payload) => request('/orders/checkout', { method: 'POST', body: payload }),

  /** { items: [order view], total, page, limit } */
  list: ({ status, page, limit } = {}) => request(`/orders${query({ status, page, limit })}`),

  /** { order: order view | null } — bosh sahifadagi "Kuzatish" kartasi */
  active: () => request('/orders/active'),

  /** Order view + timeline, canCancel, payment */
  get: (id) => request(`/orders/${id}`),

  cancel: (id) => request(`/orders/${id}/cancel`, { method: 'POST' }),

  /** Demo to'lov (backend PAYMENT_DEMO o'chirilgan bo'lsa 403) */
  confirmPayment: (id) => request(`/orders/${id}/payment/confirm`, { method: 'POST' }),

  changePaymentMethod: (id, paymentMethod) =>
    request(`/orders/${id}/payment-method`, { method: 'PATCH', body: { paymentMethod } }),
};

/** Superadmin sozlamalarining ochiq ko'rinishi: { general, rules } (public) */
export const appConfig = {
  get: () => request('/app/config', { auth: false }),
};

/** Bildirishnomalar (Superadmin push kampaniyalari): { items: [{ id, title, message, sentAt }] } */
export const notifications = {
  list: () => request('/notifications'),
};

// ─── Public API object ───────────────────────────────────────────────────────

export const api = {
  auth,
  catalog,
  cart,
  addresses,
  orders,
  appConfig,
  notifications,
};
