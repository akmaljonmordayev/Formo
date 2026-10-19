import { api } from '../../services/api';

const PAGE_LIMIT = 100;

// SENT_TO_WORKSHOP — operator yubordi, sex hali qabul qilmagan. DELIVERING sexning ishi tugagan, ro'yxatda yo'q.
export const TAILOR_ORDER_STATUS = {
  SENT_TO_WORKSHOP: 'yangi',
  ACCEPTED: 'qabul',
  PRINTING: 'bosildi',
  QUALITY_CHECK: 'bosildi',
  READY: 'tayyor',
};

export const TAILOR_NEXT_STATUS = {
  ACCEPTED: 'PRINTING',
  PRINTING: 'QUALITY_CHECK',
  QUALITY_CHECK: 'READY',
  READY: 'DELIVERING',
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
    jerseyColor: '#172238',
    jerseyColorName: '',
    location: '',
    status,
    stage: status === 'yangi' ? 0 : status === 'qabul' ? 1 : status === 'tayyor' ? 3 : 2,
    createdAt: order.createdAt,
    deliveryTime,
    deadline: order.deliverySlot
      ? { time: order.deliverySlot, done: status === 'tayyor' }
      : null,
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

  for (let page = 2; page <= pageCount; page += 1) {
    params.set('page', String(page));
    const next = await api(`/workshop/orders?${params}`);
    records.push(...(next.items ?? []));
  }

  return records.map(orderToQueueItem).filter(Boolean);
}

export const acceptTailorOrder = (orderId) =>
  api(`/workshop/orders/${orderId}/accept`, { method: 'POST' });

export const rejectTailorOrder = (orderId, reason) =>
  api(`/workshop/orders/${orderId}/reject`, { method: 'POST', body: { reason } });

export const updateTailorOrderStatus = (orderId, status) =>
  api(`/workshop/orders/${orderId}/status`, { method: 'PATCH', body: { status } });

export const tailorInventoryApi = {
  list: () => api('/workshop/inventory?productType=TSHIRT'),
  save: (items) => api('/workshop/inventory', { method: 'PUT', body: { items } }),
};

export const getTailorProduction = () => api('/workshop/production');

export const getTailorDashboard = (days) =>
  api(`/workshop/stats?days=${encodeURIComponent(days)}`);
