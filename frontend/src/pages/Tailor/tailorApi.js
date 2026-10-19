import { api } from '../../services/api';

const PAGE_LIMIT = 100;

export const TAILOR_ORDER_STATUS = {
  ACCEPTED: 'qabul',
  PRINTING: 'bosildi',
  QUALITY_CHECK: 'bosildi',
  READY: 'tayyor',
};

export const TAILOR_NEXT_STATUS = {
  ACCEPTED: 'PRINTING',
  PRINTING: 'QUALITY_CHECK',
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
    jerseyColor: '#172238',
    jerseyColorName: '',
    location: '',
    status,
    stage: status === 'qabul' ? 1 : status === 'tayyor' ? 3 : 2,
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

export async function listTailorOrders(workshopId) {
  const params = new URLSearchParams({ page: '1', limit: String(PAGE_LIMIT) });
  if (workshopId) params.set('workshopId', String(workshopId));

  const first = await api(`/admin/orders?${params}`);
  const records = [...(first.items ?? [])];
  const pageCount = Math.ceil((first.total ?? records.length) / PAGE_LIMIT);

  for (let page = 2; page <= pageCount; page += 1) {
    params.set('page', String(page));
    const next = await api(`/admin/orders?${params}`);
    records.push(...(next.items ?? []));
  }

  return records.map(orderToQueueItem).filter(Boolean);
}

export const updateTailorOrderStatus = (orderId, status) =>
  api(`/admin/orders/${orderId}/status`, { method: 'PATCH', body: { status } });

export const tailorInventoryApi = {
  list: () => api('/admin/inventory?productType=TSHIRT'),
  save: (items) => api('/admin/inventory', { method: 'PUT', body: { items } }),
};

export const getTailorProduction = () => api('/admin/production');

export const getTailorDashboard = (days) =>
  api(`/admin/dashboard?days=${encodeURIComponent(days)}`);
