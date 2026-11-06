import { api } from '../../services/api';

const PAGE_LIMIT = 100;

// Sexda ikki holat: qabul qilindi → tayyor. SENT_TO_WORKSHOP — operator yubordi, sex hali qabul qilmagan.
// Yetkazishga chiqarishni operator qiladi (DELIVERING sex ro'yxatida yo'q). PRINTING/QUALITY_CHECK — eski
// buyurtmalar uchun, "qabul qilindi" sifatida ko'rsatiladi.
export const TAILOR_ORDER_STATUS = {
  SENT_TO_WORKSHOP: 'yangi',
  ACCEPTED: 'qabul',
  PRINTING: 'qabul',
  QUALITY_CHECK: 'qabul',
  READY: 'tayyor',
};

export const TAILOR_NEXT_STATUS = {
  ACCEPTED: 'READY',
  PRINTING: 'READY',
  QUALITY_CHECK: 'READY',
};

const orderToQueueItem = (order) => {
  const line = order.items?.[0];
  const status = TAILOR_ORDER_STATUS[order.status];
  if (!status) return null;

  const details = [
    line?.clubName,
    line?.kitLabel,
    line?.shirtSize && `${line.shirtSize}`,
    `×${line?.quantity ?? order.quantity}`,
  ].filter(Boolean);
  const deliveryTime = order.deliveryDate
    ? new Date(order.deliveryDate).toLocaleDateString('en-CA', { timeZone: 'UTC' })
    : null;

  return {
    id: order.code,
    apiId: order.id,
    apiStatus: order.status,
    apiBacked: true,
    customer: order.customerName,
    initials: order.customerName?.trim()?.[0]?.toUpperCase() ?? '?',
    kind: 'futbolka',
    colorKey: null,
    model: line?.clubName || line?.kitLabel || '',
    number: line?.printNumber ?? order.printNumber ?? '',
    size: line?.shirtSize ?? order.size ?? '',
    fabric: '',
    composition: '',
    qty: line?.quantity ?? order.quantity ?? 0,
    printColor: '',
    // 3D dizayn: buyurtma paytidagi nusxa — sex aynan shu ranglar bilan tikadi
    jerseyColor: line?.designSnapshot?.primaryColor ?? '#172238',
    jerseyColorName: '',
    location: '',
    status,
    stage: status === 'yangi' ? 0 : status === 'qabul' ? 1 : 2,
    createdAt: order.createdAt,
    deliveryTime,
    deadline: order.deliverySlot
      ? { time: order.deliverySlot, done: status === 'tayyor' }
      : null,
    design: line?.design ?? null,
    kitDesign: line?.designSnapshot ?? null,
    clubName: line?.clubName ?? '',
    kitLabel: line?.kitLabel ?? '',
    isCustomDesign: Boolean(line && (line.kitId == null || line.design)),
    // Shortik: futbolka bilan birga tikiladimi va unda raqam bormi (null raqam — futbolkadagi raqam)
    withShorts: line?.withShorts ?? true,
    shortsNumber: line?.numberOnShorts ? String(line.shortsNumber ?? line.printNumber ?? order.printNumber ?? '') : '',
    apiItems: order.items ?? [],
    apiSummary: details.join(' · '),
    apiPrintName: line?.printName ?? order.printName ?? '',
    apiOrder: order,
  };
};

export async function listTailorOrders() {
  const params = new URLSearchParams({ page: '1', limit: String(PAGE_LIMIT) });

  const first = await api(`/workshop/orders?${params}`);
  const records = [...(first.items ?? [])];
  const pageCount = Math.ceil((first.total ?? records.length) / PAGE_LIMIT);

  // Qolgan sahifalar bir vaqtda yuklanadi (ketma-ket kutish yo'q)
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pageCount - 1) }, (_, i) => {
      const p = new URLSearchParams(params);
      p.set('page', String(i + 2));
      return api(`/workshop/orders?${p}`);
    })
  );
  rest.forEach((next) => records.push(...(next.items ?? [])));

  return records.map(orderToQueueItem).filter(Boolean);
}

export const getTailorOrder = (orderId) => api(`/workshop/orders/${orderId}`);

export const acceptTailorOrder = (orderId) =>
  api(`/workshop/orders/${orderId}/accept`, { method: 'POST' });

export const rejectTailorOrder = (orderId, reason) =>
  api(`/workshop/orders/${orderId}/reject`, { method: 'POST', body: { reason } });

export const updateTailorOrderStatus = (orderId, status) =>
  api(`/workshop/orders/${orderId}/status`, { method: 'PATCH', body: { status } });

export const tailorInventoryApi = {
  list: () => api('/workshop/inventory?productType=TSHIRT'),
  save: (items) => api('/workshop/inventory', { method: 'PUT', body: { items } }),
  kits: () => api('/workshop/inventory/kits'),
};

export const getTailorProduction = () => api('/workshop/production');

export const getTailorDashboard = (days) =>
  api(`/workshop/stats?days=${encodeURIComponent(days)}`);

// ---------- chat ----------
export const listChatMessages = (after) =>
  api(after ? `/workshop/chat/messages?after=${encodeURIComponent(after)}` : '/workshop/chat/messages');
export const sendChatMessage = (text) =>
  api('/workshop/chat/messages', { method: 'POST', body: { text } });
export const getChatUnread = () => api('/workshop/chat/unread');

// ---------- defects ----------
export const createDefect = (body) => api('/workshop/defects', { method: 'POST', body });
export const listDefects = (limit = 10) => api(`/workshop/defects?page=1&limit=${limit}`);

// ---------- profile / employees ----------
export const getWorkshopProfile = () => api('/workshop/profile');
export const updateWorkshopProfile = (body) => api('/workshop/profile', { method: 'PATCH', body });
export const listEmployees = () => api('/workshop/employees');
export const createEmployee = (body) => api('/workshop/employees', { method: 'POST', body });
export const updateEmployee = (id, body) => api(`/workshop/employees/${id}`, { method: 'PATCH', body });
export const deleteEmployee = (id) => api(`/workshop/employees/${id}`, { method: 'DELETE' });
