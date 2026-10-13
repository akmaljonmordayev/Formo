import * as storage from '../utils/storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.formo.uz/api';

// ─── Custom error type for auth failures ─────────────────────────────────────

export class AuthError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthError';
  }
}

// ─── Core request helper ──────────────────────────────────────────────────────

async function request(path, options = {}) {
  const token = await storage.getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Clear stored credentials and signal auth failure to the caller
    await storage.removeToken();
    await storage.removeRefreshToken();
    throw new AuthError();
  }

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// ─── Public API object ────────────────────────────────────────────────────────

export const api = {
  // ── Authentication ──────────────────────────────────────────────────────────
  auth: {
    /**
     * Login with phone + password.
     * Phone must be in +998XXXXXXXXX format.
     * @returns {{ accessToken: string, refreshToken: string, user: object }}
     */
    async login(phone, password) {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      });
      return data;
    },

    /**
     * Register a new user account.
     * @returns {{ accessToken: string, refreshToken: string, user: object }}
     */
    async register(fullName, phone, password) {
      const data = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName, phone, password }),
      });
      return data;
    },

    /** Fetch the currently authenticated user's profile. */
    async me() {
      return request('/auth/me');
    },

    /** Invalidate the current session on the server and clear local tokens. */
    async logout() {
      try {
        await request('/auth/logout', { method: 'POST' });
      } finally {
        await storage.removeToken();
        await storage.removeRefreshToken();
      }
    },
  },

  // ── Products ─────────────────────────────────────────────────────────────────
  products: {
    /** List all products. NOTE: endpoint not yet deployed — callers must handle errors. */
    async list() {
      return request('/products');
    },
  },

  // ── Orders ───────────────────────────────────────────────────────────────────
  orders: {
    /** List current user's orders. NOTE: endpoint not yet deployed — callers must handle errors. */
    async list() {
      return request('/orders');
    },

    /**
     * Create a new order.
     * @param {object} payload - Order creation payload.
     */
    async create(payload) {
      return request('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },

    /**
     * Fetch a single order by ID.
     * @param {string|number} id
     */
    async get(id) {
      return request(`/orders/${id}`);
    },
  },
};
