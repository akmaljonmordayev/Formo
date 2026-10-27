import { api } from '../../services/api';

const file = (blob, name) => {
  const fd = new FormData();
  fd.append('file', blob, name);
  return fd;
};

/** 3D forma dizaynlari (Superadmin): /admin/kit-designs */
export const kitDesignsApi = {
  list: () => api('/admin/kit-designs'),
  get: (id) => api(`/admin/kit-designs/${id}`),
  create: (body) => api('/admin/kit-designs', { method: 'POST', body }),
  update: (id, body) => api(`/admin/kit-designs/${id}`, { method: 'PATCH', body }),
  remove: (id) => api(`/admin/kit-designs/${id}`, { method: 'DELETE' }),
  /** Nishon/homiy rasmi → { url } */
  upload: (kind, blob) => api(`/admin/kit-designs/uploads?kind=${kind}`, { method: 'POST', body: file(blob, blob.name || `${kind}.png`) }),
  /** Ro'yxat uchun kichik PNG */
  setThumbnail: (id, blob) => api(`/admin/kit-designs/${id}/thumbnail`, { method: 'PUT', body: file(blob, 'thumb.png') }),
};
