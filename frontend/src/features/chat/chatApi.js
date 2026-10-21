import { api } from '../../services/api';

// Bo'sh qiymatlar tushirib qoldiriladi: { a: 1, b: '' } -> "?a=1"
const qs = (params = {}) => {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
};

// Universal chat: Operator, Superadmin va tikuv sexi (Tailor) uchun bitta API
export const chatApi = {
  contacts: (role, q) => api(`/chat/contacts${qs({ role, q })}`), // [{ id, role, name, phone? }]
  conversations: (orderId) => api(`/chat/conversations${qs({ orderId })}`),
  open: ({ participantId, role, orderId } = {}) =>
    api('/chat/conversations', { method: 'POST', body: { participantId, role, orderId } }),
  messages: (id, { after, before } = {}) => api(`/chat/conversations/${id}/messages${qs({ after, before })}`), // { items }
  send: (id, text) => api(`/chat/conversations/${id}/messages`, { method: 'POST', body: { text } }),
  read: (id) => api(`/chat/conversations/${id}/read`, { method: 'POST' }),
  unread: () => api('/chat/unread'), // { total }
};
