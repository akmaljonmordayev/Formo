import * as storage from '../utils/storage';
import { resolveApiUrl } from '../utils/apiUrl';

// mobile/.env:  EXPO_PUBLIC_API_URL=http://<kompyuter-IP>:3001/api
// Telefonda "localhost" ishlamaydi — kompyuterning Wi-Fi IP manzili kerak.
// Android emulator uchun: http://10.0.2.2:3001/api
// Dev'da: .env dagi lokal IP eskirgan bo'lsa (Wi-Fi almashgan) — Metro xostiga almashtiriladi (utils/apiUrl)
const devServerUrl = (() => {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return null;
  try {
    // eslint-disable-next-line global-require
    return require('react-native/Libraries/Core/Devtools/getDevServer').default().url;
  } catch {
    return null;
  }
})();
const BASE_URL = resolveApiUrl(process.env.EXPO_PUBLIC_API_URL, devServerUrl);

/** Ilova ulanadigan API manzili (dev diagnostikasi uchun — xato xabarida ko'rsatiladi) */
export const API_BASE_URL = BASE_URL;

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
  // Fayl yuklash (masalan profil rasmi): RN FormData — Content-Type'ni brauzer/RN o'zi boundary bilan qo'yadi
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(!isForm && { 'Content-Type': 'application/json' }),
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
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
    // Faqat 401/403 — sessiya haqiqatan tugagan. 429/5xx (deploy, limit) — vaqtinchalik: tokenlar saqlanadi
    if (response.status === 401 || response.status === 403) return false;
    if (!response.ok || !data?.accessToken || !data?.refreshToken) {
      throw new ApiError(errorMessage(data, `API error: ${response.status}`), response.status);
    }

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

// Mijozlar faqat Telegram bot orqali kiradi (parol/SMS yo'q) — backend/src/telegram
export const auth = {
  /**
   * Telegram bot orqali kirish, 1-qadam: so'rov ochish (10 daqiqa amal qiladi).
   * Javob raqam ro'yxatdan o'tgan-o'tmaganiga bog'liq emas.
   * @returns {Promise<{challengeId: string, botUsername: string, deepLink: string, expiresAt: string}>}
   */
  telegramStart: (phone) =>
    request('/auth/telegram/start', {
      method: 'POST',
      auth: false,
      body: { phone: normalizePhone(phone) },
    }),

  /**
   * Telegram bot orqali kirish, 2-qadam: botdagi 5 xonali kod. Hisob bo'lmasa server ochadi.
   * Sessiya boshqa kirish usullari kabi saqlanadi (refresh/logout o'zgarmaydi).
   * @returns {Promise<{user: object, isNewUser: boolean, profileComplete: boolean}>}
   */
  async telegramVerify(challengeId, code) {
    const data = await request('/auth/telegram/verify', {
      method: 'POST',
      auth: false,
      body: { challengeId, code },
    });
    const user = await storeSession(data);
    return { user, isNewUser: Boolean(data?.isNewUser), profileComplete: Boolean(data?.profileComplete) };
  },

  /** Fetch the currently authenticated user's profile. */
  me: () => request('/auth/me'),

  /**
   * PATCH /auth/me — profil o'lchovlari. Faqat shu maydonlar (boshqasi → 400); null qiymatni tozalaydi.
   * @param {{gender?: 'MALE'|'FEMALE'|null, age?: number|null, height?: number|null, weight?: number|null}} fields
   * @returns {Promise<object>} yangilangan user
   */
  updateMe: (fields) => request('/auth/me', { method: 'PATCH', body: fields }),

  /** PATCH /auth/password — joriy parol + yangi parol. Boshqa qurilmalar chiqarib yuboriladi. */
  changePassword: (currentPassword, newPassword) =>
    request('/auth/password', { method: 'PATCH', body: { currentPassword, newPassword } }),

  /**
   * Profil rasmi: PNG/JPEG/WEBP, 2 MB gacha. `file` — { uri, name, type } (expo-image-picker natijasidan).
   * @returns {Promise<object>} yangilangan user
   */
  setAvatar: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/auth/me/avatar', { method: 'POST', body: form });
  },

  /** Profil rasmini o'chiradi (standart harf-belgiga qaytadi) */
  removeAvatar: () => request('/auth/me/avatar', { method: 'DELETE' }),

  /**
   * Telefon raqamini almashtirish, 1-qadam: yangi raqamga Telegram orqali tasdiqlash so'rovi.
   * @returns {Promise<{challengeId: string, botUsername: string, deepLink: string, expiresAt: string}>}
   */
  phoneChangeStart: (phone) => request('/auth/telegram/change/start', { method: 'POST', body: { phone: normalizePhone(phone) } }),

  /** Telefon raqamini almashtirish, 2-qadam: botdagi kod. Sessiya ochilmaydi — faqat raqam yangilanadi. */
  phoneChangeVerify: (challengeId, code) =>
    request('/auth/telegram/change/verify', { method: 'POST', body: { challengeId, code } }),

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
  // Ilova faqat Forma 360° suratlari bor klublarni ko'rsatadi — kit360=true (backend Club.kit360Id bog'langanlar)

  /** [{ id, name, slug, clubsCount }] — faqat 360° klubi bor ligalar */
  categories: () => request(`/catalog/categories${query({ kit360: true })}`),

  /** { items: [club card], total, page, limit } — club card: { id, name, league, season, code, markColor, kit360Id, category, kitsCount } */
  clubs: ({ categoryId, category, search, page, limit } = {}) =>
    request(`/catalog/clubs${query({ categoryId, category, search, page, limit, kit360: true })}`),

  /** [club card + ordersCount] */
  popular: (limit) => request(`/catalog/clubs/popular${query({ limit, kit360: true })}`),

  /** Club + kits: [{ id, label, title, bgColor, textColor, price, priceBreakdown, sizes, ... }] */
  club: (id) => request(`/catalog/clubs/${id}`),

  /** Kit + { club, siblings, sizeGroups } */
  kit: (id) => request(`/catalog/kits/${id}`),

  /** Eng ko'p sotilgan formalar (Forma 360°: har klubdan bitta): [kit + { club, soldCount }] */
  bestSellingKits: (limit) => request(`/catalog/kits/best-selling${query({ limit, kit360: true })}`),

  /** Yoqtirilgan formalar (yurakcha) — forma bo'yicha */
  favoriteKits: () => request('/catalog/favorite-kits'),
  addFavoriteKit: (kitId) => request(`/catalog/kits/${kitId}/favorite`, { method: 'PUT' }),
  removeFavoriteKit: (kitId) => request(`/catalog/kits/${kitId}/favorite`, { method: 'DELETE' }),

  favorites: () => request('/catalog/favorites'),
  addFavorite: (clubId) => request(`/catalog/clubs/${clubId}/favorite`, { method: 'PUT' }),
  removeFavorite: (clubId) => request(`/catalog/clubs/${clubId}/favorite`, { method: 'DELETE' }),
};

/**
 * Server savati. Har bir o'zgartiruvchi so'rov butun savatni qaytaradi:
 * { items, count, promocode, summary: { subtotal, discount, delivery, total } }
 */
export const cart = {
  /** Promokod berilsa chegirma bilan hisoblanadi (yaroqsiz bo'lsa 400). Viloyat — yetkazish narxi shundan. */
  view: (promocode, region) => request(`/cart${query({ promocode, region })}`),

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
  deliverySlots: (days, region) => request(`/checkout/delivery-slots${query({ days, region })}`),

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

/**
 * Ichki balans — server yagona manba (ilova balansni hech qachon o'zi hisoblamaydi).
 * { balance, transactions: [{ id, type, amount, balanceAfter, note, createdAt }], topUps: [{ id, code, amount, status, rejectReason, createdAt }] }
 * To'ldirish faqat Telegram bot orqali (summa → Humo karta → chek → admin tasdig'i).
 */
export const wallet = {
  get: () => request('/wallet'),
};

/** Superadmin sozlamalarining ochiq ko'rinishi: { general, rules } (public) */
export const appConfig = {
  get: () => request('/app/config', { auth: false }),
};

/**
 * Superadmin yasagan 3D forma dizaynlari (faqat nashr qilinganlar, tartib bo'yicha):
 * [{ id, name, thumbnailUrl, design: { designVersion: 1, ... }, prices: { shirt, shorts, print } }]
 */
export const kits = {
  designs: () => request('/kits/designs', { auth: false }),
};

/** Server bergan fayl manzili: lokal xotirada "/api/uploads/..." (API origin'iga qo'shiladi), S3'da to'liq URL */
export function assetUrl(url) {
  if (!url || /^https?:\/\//.test(url)) return url || null;
  return `${BASE_URL.replace(/\/api$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Bildirishnomalar (Superadmin push kampaniyalari): { items: [{ id, title, message, sentAt }] } */
export const notifications = {
  list: () => request('/notifications'),
};

/** Qo'llab-quvvatlash chati (operator bilan): { items: [{ id, text, fromWorkshop (true = mijoz yozgan), createdAt }] } */
export const support = {
  messages: (after) => request(`/support/messages${query({ after })}`),
  send: (text) => request('/support/messages', { method: 'POST', body: { text } }),
  unread: () => request('/support/unread'),
};

// ─── Public API object ───────────────────────────────────────────────────────

export const api = {
  auth,
  catalog,
  cart,
  addresses,
  orders,
  wallet,
  appConfig,
  notifications,
  kits,
  support,
};
