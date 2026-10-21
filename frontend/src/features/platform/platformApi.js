import { api } from '../../services/api';

const qs = (params = {}) => {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null),
  ).toString();
  return q ? `?${q}` : '';
};

export const dashboardApi = {
  get: (days) => api(`/admin/dashboard${qs({ days })}`),
};

export const financeApi = {
  get: (days) => api(`/admin/finance${qs({ days })}`),
};

export const reportsApi = {
  get: (days) => api(`/admin/reports${qs({ days })}`),
};

export const productionApi = {
  get: () => api('/admin/production'),
};

export const clubsApi = {
  list: (params) => api(`/admin/clubs${qs(params)}`),
  create: (body) => api('/admin/clubs', { method: 'POST', body }),
  update: (id, body) => api(`/admin/clubs/${id}`, { method: 'PATCH', body }),
  remove: (id) => api(`/admin/clubs/${id}`, { method: 'DELETE' }),
  updateKit: (kitId, body) => api(`/admin/clubs/kits/${kitId}`, { method: 'PATCH', body }),
};

export const categoriesApi = {
  list: () => api('/admin/categories'),
  create: (body) => api('/admin/categories', { method: 'POST', body }),
  update: (id, body) => api(`/admin/categories/${id}`, { method: 'PATCH', body }),
  remove: (id) => api(`/admin/categories/${id}`, { method: 'DELETE' }),
};

export const ordersApi = {
  list: (params) => api(`/admin/orders${qs(params)}`),
  assign: (id, body) => api(`/admin/orders/${id}/assign`, { method: 'POST', body }),
  updateStatus: (id, body) => api(`/admin/orders/${id}/status`, { method: 'PATCH', body }),
};

export const inventoryApi = {
  list: (params) => api(`/admin/inventory${qs(params)}`),
  save: (items) => api('/admin/inventory', { method: 'PUT', body: { items } }),
};

export const pricingApi = {
  list: () => api('/admin/pricing'),
  save: (items) => api('/admin/pricing', { method: 'PUT', body: { items } }),
};

export const promocodesApi = {
  list: () => api('/admin/promocodes'),
  create: (body) => api('/admin/promocodes', { method: 'POST', body }),
  update: (id, body) => api(`/admin/promocodes/${id}`, { method: 'PATCH', body }),
};

export const campaignsApi = {
  list: () => api('/admin/campaigns'),
  create: (body) => api('/admin/campaigns', { method: 'POST', body }),
  update: (id, body) => api(`/admin/campaigns/${id}`, { method: 'PATCH', body }),
};

export const auditLogApi = {
  list: (params) => api(`/admin/audit-log${qs(params)}`),
};

export const settingsApi = {
  all: () => api('/admin/settings'),
  update: (key, value) => api(`/admin/settings/${key}`, { method: 'PUT', body: { value } }),
  // Telegram bildirishnomalari: { telegramConfigured } va sinov xabari { sent, reason? }
  notificationsStatus: () => api('/admin/settings/notifications/status'),
  notificationsTest: () => api('/admin/settings/notifications/test', { method: 'POST' }),
};

// Sexlar topgan nuqsonlar (brak)
export const defectsApi = {
  list: (params) => api(`/admin/defects${qs(params)}`), // { items, total, page, limit, openCount }
  resolve: (id, note) => api(`/admin/defects/${id}/resolve`, { method: 'PATCH', body: { note } }),
};

export const diagnosticsApi = {
  request: () => api('/admin/diagnostics/request'),
};

// Superadminning o'z akkaunti (Sozlamalar → Xavfsizlik)
export const securityApi = {
  changePassword: (body) => api('/auth/password', { method: 'PATCH', body }),
  logoutAll: () => api('/auth/logout-all', { method: 'POST' }),
};

// Mobil foydalanuvchi tafsiloti (ro'yxat, bloklash, o'chirish — accountsApi.usersApi da)
export const userDetailApi = {
  get: (id) => api(`/admin/users/${id}`),
};

// --- Buyurtma holati: panel ko'rsatadigan label va badge rangi ---
export const ORDER_STATUS = {
  PENDING_PAYMENT: { label: "To'lov kutilmoqda", color: 'orange' },
  NEW: { label: 'Yangi', color: 'orange' },
  SENT_TO_WORKSHOP: { label: 'Sexga yuborildi', color: 'blue' },
  ACCEPTED: { label: 'Sex qabul qildi', color: 'blue' },
  PRINTING: { label: 'Bosilmoqda', color: 'violet' },
  QUALITY_CHECK: { label: 'Sifat nazorati', color: 'violet' },
  READY: { label: 'Tayyor', color: 'blue' },
  DELIVERING: { label: 'Yetkazishda', color: 'blue' },
  DELIVERED: { label: 'Yetkazildi', color: 'green' },
  CANCELLED: { label: 'Bekor qilindi', color: 'red' },
  RETURNED: { label: 'Qaytarildi', color: 'red' },
};

export const PAYMENT_METHOD = { CLICK: 'Click', PAYME: 'Payme', CASH: 'Naqd' };
export const PAYMENT_STATUS = { PENDING: 'kutilmoqda', PAID: "to'landi", FAILED: 'xato', REFUNDED: 'qaytarildi' };

export function paymentLabel(method, status) {
  const base = PAYMENT_METHOD[method] ?? method;
  return status && status !== 'PAID' ? `${base} · ${PAYMENT_STATUS[status] ?? status}` : base;
}

export const money = (n) => `${Math.round(n ?? 0).toLocaleString('uz-UZ')} so'm`;
export const moneyShort = (n) => {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('uz-UZ', { maximumFractionDigits: 2 })} mln so'm`;
  return money(v);
};

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('uz-UZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
