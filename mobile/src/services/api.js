import * as storage from '../utils/storage';

/**
 * API client for Formo Mobile App.
 * Base host: https://api.formo.uz
 * Global prefix: /api
 * Ensures NO duplicated '/api/api/' paths.
 */
const BASE_URL = (() => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!envUrl) return 'https://api.formo.uz/api';
  const clean = envUrl.trim().replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
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

let sessionExpiredHandler = null;

// ─── API → App data mappers ──────────────────────────────────────────────────
// Backend sends bgColor/textColor; JerseyVisualizer uses color/trim/ink.

export function mapApiKit(apiKit) {
  return {
    id: String(apiKit.id),
    name: apiKit.title || apiKit.label || 'Forma',
    label: apiKit.label || apiKit.title || 'Uy',
    color: apiKit.bgColor || '#F3F5F9',
    trim: apiKit.textColor || '#F2A33A',
    ink: apiKit.textColor || '#0E1A3F',
    pattern: apiKit.pattern || 'none',
    price: apiKit.price || 189000,
    priceBreakdown: apiKit.priceBreakdown || {},
    sizes: apiKit.sizes || [],
    includes: apiKit.includes || 'Futbolka + shortik',
  };
}

export function mapApiClub(apiClub) {
  const kits = Array.isArray(apiClub.kits)
    ? apiClub.kits.map(mapApiKit)
    : [{ id: 'home', name: 'Uy formasi', label: 'Uy', color: apiClub.markColor || '#F3F5F9', trim: '#F2A33A', ink: '#0E1A3F', price: 189000, sizes: [], pattern: 'none' }];

  return {
    id: String(apiClub.id),
    name: apiClub.name,
    league: apiClub.league || apiClub.category?.name || 'Liga',
    ini: apiClub.code || apiClub.name.slice(0, 3).toUpperCase(),
    c1: apiClub.markColor || kits[0]?.color || '#F3F5F9',
    c2: kits[0]?.trim || '#F2A33A',
    kits,
    season: apiClub.season,
    category: apiClub.category,
    ordersCount: apiClub.ordersCount || 0,
  };
}

// ─── Phone normalization helper ──────────────────────────────────────────────

export function normalizePhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  digits = digits.slice(0, 9);
  return `+998${digits}`;
}

export function formatPhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  digits = digits.slice(0, 9);
  const parts = [
    digits.slice(0, 2),
    digits.slice(2, 5),
    digits.slice(5, 7),
    digits.slice(7, 9),
  ].filter(Boolean);
  return parts.join(' ');
}

// ─── Core fetch with timeout ─────────────────────────────────────────────────

async function rawRequest(path, { method = 'GET', body, auth = true, timeoutMs = 15000 } = {}) {
  const token = await storage.getToken();
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);
    return { response, data };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('So‘rov vaqti tugadi (Timeout). Tarmoqni tekshiring', 0);
    }
    throw new ApiError('Tarmoqqa ulanib bo‘lmadi', 0);
  } finally {
    clearTimeout(timeoutId);
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
    if (!response || !response.ok || !data?.accessToken) return false;

    await storage.setToken(data.accessToken);
    if (data.refreshToken) await storage.setRefreshToken(data.refreshToken);
    return true;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function request(path, options = {}) {
  let { response, data } = await rawRequest(path, options);

  // 401 — attempt token refresh once
  if (response.status === 401 && options.auth !== false) {
    const refreshed = await refreshTokens();
    if (refreshed) {
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
      throw new ApiError('Juda ko‘p urinish. Birozdan so‘ng qayta urinib ko‘ring', 429);
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

<<<<<<< HEAD
// ─── API Endpoints ───────────────────────────────────────────────────────────

export const api = {
  // ── Authentication ──
  auth: {
    async login(phone, password) {
      const data = await request('/auth/login', {
        method: 'POST',
        auth: false,
        body: { phone: normalizePhone(phone), password },
      });
      return storeSession(data);
    },

    async register(payload) {
      // Whitelist to exactly the fields the backend RegisterDto accepts.
      // The API runs with `forbidNonWhitelisted: true`, so sending anything
      // else (e.g. favoriteClub / jerseyName / jerseyNumber) is a 400.
      const body = {
        phone: normalizePhone(payload.phone),
        password: payload.password,
        fullName: payload.fullName,
      };
      if (payload.gender != null) body.gender = payload.gender;
      if (payload.age != null) body.age = payload.age;
      if (payload.height != null) body.height = payload.height;
      if (payload.weight != null) body.weight = payload.weight;

      const data = await request('/auth/register', {
        method: 'POST',
        auth: false,
        body,
      });
      return storeSession(data);
    },

    me: () => request('/auth/me'),

    updateMe(fields) {
      return request('/auth/me', { method: 'PATCH', body: fields });
    },

    changePassword(oldPassword, newPassword) {
      return request('/auth/password', {
        method: 'PATCH',
        body: { oldPassword, newPassword },
      });
    },

    async logout() {
      try {
        if (await storage.getToken()) {
          await request('/auth/logout', { method: 'POST' }).catch(() => null);
        }
      } finally {
        await storage.removeToken();
        await storage.removeRefreshToken();
      }
    },

    onSessionExpired(callback) {
      sessionExpiredHandler = callback;
    },
  },

  // ── Catalog ──
  catalog: {
    getCategories: () => request('/catalog/categories'),

    getClubs(params = {}) {
      const query = new URLSearchParams();
      if (params.search) query.append('search', params.search);
      if (params.categoryId) query.append('categoryId', String(params.categoryId));
      if (params.page) query.append('page', String(params.page));
      if (params.limit) query.append('limit', String(params.limit));
      const qs = query.toString();
      return request(`/catalog/clubs${qs ? `?${qs}` : ''}`);
    },

    getPopularClubs(limit = 6) {
      return request(`/catalog/clubs/popular?limit=${limit}`);
    },

    getClub: (id) => request(`/catalog/clubs/${id}`),

    getKit: (id) => request(`/catalog/kits/${id}`),

    getFavorites: () => request('/catalog/favorites'),

    addFavorite: (clubId) => request(`/catalog/clubs/${clubId}/favorite`, { method: 'PUT' }),

    removeFavorite: (clubId) => request(`/catalog/clubs/${clubId}/favorite`, { method: 'DELETE' }),
  },

  // ── Cart ──
  cart: {
    getCart(promocode = '') {
      const qs = promocode ? `?promocode=${encodeURIComponent(promocode)}` : '';
      return request(`/cart${qs}`);
    },

    addItem(dto) {
      return request('/cart/items', { method: 'POST', body: dto });
    },

    updateItem(id, dto) {
      return request(`/cart/items/${id}`, { method: 'PATCH', body: dto });
    },

    removeItem(id) {
      return request(`/cart/items/${id}`, { method: 'DELETE' });
    },

    clearCart() {
      return request('/cart', { method: 'DELETE' });
    },

    applyPromocode(code) {
      return request('/cart/promocode', { method: 'POST', body: { code } });
    },
  },

  // ── Orders & Checkout ──
  orders: {
    getDeliverySlots(days = 7) {
      return request(`/checkout/delivery-slots?days=${days}`);
    },

    checkout(dto) {
      return request('/orders/checkout', { method: 'POST', body: dto });
    },

    list(query = {}) {
      const qs = query.status ? `?status=${query.status}` : '';
      return request(`/orders${qs}`);
    },

    getActive() {
      return request('/orders/active');
    },

    get(id) {
      return request(`/orders/${id}`);
    },

    getById(id) {
      return request(`/orders/${id}`);
    },

    confirmPayment(id) {
      return request(`/orders/${id}/payment/confirm`, { method: 'POST' });
    },

    changePaymentMethod(id, dto) {
      return request(`/orders/${id}/payment-method`, { method: 'PATCH', body: dto });
    },

    cancel(id) {
      return request(`/orders/${id}/cancel`, { method: 'POST' });
    },
  },

  // ── Addresses ──
  addresses: {
    list: () => request('/addresses'),
    create: (dto) => request('/addresses', { method: 'POST', body: dto }),
    update: (id, dto) => request(`/addresses/${id}`, { method: 'PATCH', body: dto }),
    remove: (id) => request(`/addresses/${id}`, { method: 'DELETE' }),
  },
=======
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

/** Universal chat (USER <-> OPERATOR/SUPERADMIN): suhbatlar va xabarlar */
export const chat = {
  /** [{ id, counterpart, order, lastMessage, unread }] — yangisi birinchi */
  conversations: (orderId) => request(`/chat/conversations${query({ orderId })}`),

  /** Suhbat ochish/yaratish: {} -> yordam (operator), { orderId } -> buyurtma suhbati */
  open: ({ role, participantId, orderId } = {}) =>
    request('/chat/conversations', { method: 'POST', body: { role, participantId, orderId } }),

  /** { items: [{ id, text, mine, senderId, senderRole, createdAt, readAt }] } — eskisi birinchi */
  messages: (id, { after, before } = {}) =>
    request(`/chat/conversations/${id}/messages${query({ after, before })}`),

  send: (id, text) => request(`/chat/conversations/${id}/messages`, { method: 'POST', body: { text } }),

  read: (id) => request(`/chat/conversations/${id}/read`, { method: 'POST' }),

  /** { total } — o'qilmagan xabarlar soni */
  unread: () => request('/chat/unread'),
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
  chat,
>>>>>>> fb102bed4b36fd02c0a0e3b3ae938f93892f7dd5
};

export default api;
