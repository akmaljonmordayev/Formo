import { api } from '../../services/api';

const PAGE_LIMIT = 100;

// Sexda ikki holat: qabul qilindi → tayyor. SENT_TO_WORKSHOP — sexga yuborilgan, sex hali qabul qilmagan.
// Yetkazishga chiqarish sex ro'yxatidan tashqarida (DELIVERING sex ro'yxatida yo'q). PRINTING — eski
// buyurtmalar uchun, "qabul qilindi" sifatida ko'rsatiladi.
export const TAILOR_ORDER_STATUS = {
  SENT_TO_WORKSHOP: 'yangi',
  ACCEPTED: 'qabul',
  PRINTING: 'qabul',
  READY: 'tayyor',
};

export const TAILOR_NEXT_STATUS = {
  ACCEPTED: 'READY',
  PRINTING: 'READY',
};

/**
 * Buyurtmaning bitta qatori (forma) — sex aynan shuni tikadi. Bitta buyurtmada bir nechta qator bo'lishi mumkin
 * (masalan, biri shortikli, biri shalvarli) — har biri alohida ko'rsatiladi.
 */
const lineToItem = (line, order) => {
  const number = line?.printNumber ?? order.printNumber ?? '';
  // withShorts — pastki qism (shortik yoki shalvar) futbolka bilan birga tikiladimi
  const withBottom = line?.withShorts ?? true;
  return {
    key: line?.id ?? 0,
    clubName: line?.clubName ?? '',
    kitLabel: line?.kitLabel ?? '',
    kit360Id: line?.kit360Id ?? null,
    sleeve: line?.sleeve === 'LONG' ? 'long' : 'short',
    bottom: line?.bottom === 'PANTS' ? 'pants' : 'shorts',
    withBottom,
    // Pastki qismdagi raqam (null raqam — futbolkadagi raqam); '' — raqamsiz
    bottomNumber: withBottom && line?.numberOnShorts ? String(line.shortsNumber ?? number ?? '') : '',
    bottomSize: withBottom ? line?.shortsSize ?? '' : '',
    name: line?.printName ?? order.printName ?? '',
    number: number === null ? '' : String(number),
    size: line?.shirtSize ?? order.size ?? '',
    qty: line?.quantity ?? order.quantity ?? 0,
    // 3D dizayn: buyurtma paytidagi nusxa — sex aynan shu ranglar bilan tikadi
    jerseyColor: line?.design?.color?.hex || line?.designSnapshot?.primaryColor || '#172238',
    kitDesign: line?.designSnapshot ?? null,
  };
};

export const orderToQueueItem = (order) => {
  const line = order.items?.[0];
  const status = TAILOR_ORDER_STATUS[order.status];
  if (!status) return null;

  const lines = (order.items?.length ? order.items : [undefined]).map((item) => lineToItem(item, order));
  const qty = lines.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
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
    // Barcha qatorlar bo'yicha jami dona
    qty: qty || order.quantity || 0,
    lines,
    printColor: '',
    jerseyColor: lines[0].jerseyColor,
    jerseyColorName: '',
    location: '',
    status,
    stage: status === 'yangi' ? 0 : status === 'qabul' ? 1 : 2,
    createdAt: order.createdAt,
    deliveryTime,
    deadline: order.deliverySlot
      ? { time: order.deliverySlot, done: status === 'tayyor' }
      : null,
    // Manzil, izoh va xaritadagi nuqta — buyurtma tafsilotida ko'rsatiladi
    apiOrder: order,
  };
};

export async function listTailorOrders() {
  // Faqat sex ko'radigan holatlar so'raladi — yetkazilgan/bekor qilingan eski buyurtmalar har 5 soniyada yuklanmaydi
  const params = new URLSearchParams({
    page: '1',
    limit: String(PAGE_LIMIT),
    statuses: Object.keys(TAILOR_ORDER_STATUS).join(','),
  });

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
