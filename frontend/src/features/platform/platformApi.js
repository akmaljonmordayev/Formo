import { api, apiBlobUrl } from '../../services/api';

const qs = (params = {}) => {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null),
  ).toString();
  return q ? `?${q}` : '';
};

export const dashboardApi = {
  // { days } yoki { from, to } (YYYY-MM-DD)
  get: (params) => api(`/admin/dashboard${qs(params)}`),
};

export const financeApi = {
  // params: { days } | { from, to } | { all: true }
  get: (params) => api(`/admin/finance${qs(params)}`),
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
  listKits: () => api('/admin/clubs/kits'),
  createKit: (clubId, body) => api(`/admin/clubs/${clubId}/kits`, { method: 'POST', body }),
  updateKit: (kitId, body) => api(`/admin/clubs/kits/${kitId}`, { method: 'PATCH', body }),
  removeKit: (kitId) => api(`/admin/clubs/kits/${kitId}`, { method: 'DELETE' }),
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
  kits: () => api('/admin/inventory/kits'),
  removeKit: (kitId, productType) => api(`/admin/inventory/kit/${kitId}${qs({ productType })}`, { method: 'DELETE' }),
};

export const pricingApi = {
  list: () => api('/admin/pricing'),
  save: (items) => api('/admin/pricing', { method: 'PUT', body: { items } }),
};

export const promocodesApi = {
  list: () => api('/admin/promocodes'),
  create: (body) => api('/admin/promocodes', { method: 'POST', body }),
  update: (id, body) => api(`/admin/promocodes/${id}`, { method: 'PATCH', body }),
  remove: (id) => api(`/admin/promocodes/${id}`, { method: 'DELETE' }),
};

export const campaignsApi = {
  list: () => api('/admin/campaigns'),
  create: (body) => api('/admin/campaigns', { method: 'POST', body }),
  update: (id, body) => api(`/admin/campaigns/${id}`, { method: 'PATCH', body }),
};

// Botga ulangan barcha mijozlarga bir martalik Telegram xabari
export const broadcastApi = {
  recipients: () => api('/admin/broadcast/recipients'),
  send: (message) => api('/admin/broadcast', { method: 'POST', body: { message } }),
};

export const auditLogApi = {
  list: (params) => api(`/admin/audit-log${qs(params)}`),
};

// Balansni qo'lda to'ldirish so'rovlari (faqat superadmin). Pul faqat approve() da qo'shiladi
export const topupsApi = {
  list: (params) => api(`/admin/topups${qs(params)}`),
  receiptUrl: (id) => apiBlobUrl(`/admin/topups/${id}/receipt`),
  // amount — chekdagi haqiqiy summa so'rovdan farq qilsa (ixtiyoriy)
  approve: (id, amount) => api(`/admin/topups/${id}/approve`, { method: 'POST', body: amount ? { amount } : {} }),
  reject: (id, reason) => api(`/admin/topups/${id}/reject`, { method: 'POST', body: { reason } }),
};

export const settingsApi = {
  all: () => api('/admin/settings'),
  update: (key, value) => api(`/admin/settings/${key}`, { method: 'PUT', body: { value } }),
  // Telegram bildirishnomalari: { telegramConfigured } va sinov xabari { sent, reason? }
  notificationsStatus: () => api('/admin/settings/notifications/status'),
  notificationsTest: () => api('/admin/settings/notifications/test', { method: 'POST' }),
};

// Superadmin ↔ tikuv sexi yozishmasi
export const chatApi = {
  threads: () => api('/admin/chat/threads'), // [{ workshopId, name, unread, lastMessage }]
  messages: (workshopId, after) => api(`/admin/chat/${workshopId}/messages${qs({ after })}`), // { items }
  send: (workshopId, text) => api(`/admin/chat/${workshopId}/messages`, { method: 'POST', body: { text } }),
};

// Superadmin ↔ mobil ilova mijozi (qo'llab-quvvatlash chati)
export const supportApi = {
  threads: () => api('/admin/support/threads'), // [{ workshopId(=userId), name, phone, unread, lastMessage }]
  unread: () => api('/admin/support/unread'), // { unread }
  messages: (userId, after) => api(`/admin/support/${userId}/messages${qs({ after })}`), // { items }
  send: (userId, text) => api(`/admin/support/${userId}/messages`, { method: 'POST', body: { text } }),
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
  READY: { label: 'Tayyor', color: 'blue' },
  DELIVERING: { label: 'Yetkazishda', color: 'blue' },
  DELIVERED: { label: 'Yetkazildi', color: 'green' },
  CANCELLED: { label: 'Bekor qilindi', color: 'red' },
  RETURNED: { label: 'Qaytarildi', color: 'red' },
};

export const PAYMENT_METHOD = { CLICK: 'Click', PAYME: 'Payme', CASH: 'Naqd', BALANCE: 'Balans', WALLET: 'Balans' };
export const PAYMENT_STATUS = { PENDING: 'kutilmoqda', PAID: "to'landi", FAILED: 'xato', REFUNDED: 'qaytarildi' };

/** `t` berilsa — usul va holat alohida tarjima qilinadi (superadmin tili) */
export function paymentLabel(method, status, t = (s) => s) {
  const base = t(PAYMENT_METHOD[method] ?? method);
  return status && status !== 'PAID' ? `${base} · ${t(PAYMENT_STATUS[status] ?? status)}` : base;
}

export const money = (n) => `${Math.round(n ?? 0).toLocaleString('uz-UZ')} so'm`;
export const moneyShort = (n) => {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toLocaleString('uz-UZ', { maximumFractionDigits: 2 })} mln so'm`;
  return money(v);
};

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('uz-UZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
