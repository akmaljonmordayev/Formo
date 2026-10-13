import { api } from '../../services/api';

const qs = (params = {}) => {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null),
  ).toString();
  return q ? `?${q}` : '';
};

export const operatorApi = {
  get: () => api('/admin/operator'),
  create: (body) => api('/admin/operator', { method: 'POST', body }),
  update: (body) => api('/admin/operator', { method: 'PATCH', body }),
  remove: () => api('/admin/operator', { method: 'DELETE' }),
};

export const workshopsApi = {
  list: (params) => api(`/admin/workshops${qs(params)}`),
  create: (body) => api('/admin/workshops', { method: 'POST', body }),
  update: (id, body) => api(`/admin/workshops/${id}`, { method: 'PATCH', body }),
  remove: (id) => api(`/admin/workshops/${id}`, { method: 'DELETE' }),
};

export const usersApi = {
  list: (params) => api(`/admin/users${qs(params)}`),
  setStatus: (id, isActive) => api(`/admin/users/${id}/status`, { method: 'PATCH', body: { isActive } }),
  remove: (id) => api(`/admin/users/${id}`, { method: 'DELETE' }),
};

/** "+998901234567" -> "+998 90 123 45 67" */
export function prettyPhone(phone = '') {
  const m = phone.match(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
