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

async function rawRequest(path, { method = 'GET', body, auth = true } = {}) {
  const token = await storage.getToken();

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);
  return { response, data };
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
   * Update the current user's profile fields (age, height, weight, gender, address...).
   * @returns {Promise<object>} updated user object
   */
  updateMe(fields) {
    return request('/auth/me', { method: 'PATCH', body: fields });
  },

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

// ─── Public API object ───────────────────────────────────────────────────────

export const api = {
  auth,

  // ── Products ─────────────────────────────────────────────────────────────────
  products: {
    /** List all products. NOTE: endpoint not yet deployed — callers must handle errors. */
    list: () => request('/products'),
  },

  // ── Orders ───────────────────────────────────────────────────────────────────
  orders: {
    /** List current user's orders. NOTE: endpoint not yet deployed — callers must handle errors. */
    list: () => request('/orders'),

    /** Create a new order. */
    create(payload) {
      return request('/orders', { method: 'POST', body: payload });
    },

    /** Fetch a single order by ID. */
    get: (id) => request(`/orders/${id}`),
  },
};
