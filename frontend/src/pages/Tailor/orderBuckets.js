const TZ = 'Asia/Tashkent';

/** Toshkent vaqti bo'yicha { date: 'YYYY-MM-DD', minutes: kun boshidan daqiqa } */
function tashkentNow(now) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

const dayNumber = (isoDate) => Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000);

/**
 * Buyurtma muddati bo'yicha guruh: late (kechikkan) | today | upcoming | nodate.
 * Tayyor buyurtma hech qachon kechikkan hisoblanmaydi. Slot ('10:00-14:00') boshlanishi muddat.
 */
export function orderUrgency(order, now = new Date()) {
  const date = order.deliveryTime;
  if (!date || order.status === 'tayyor') return { bucket: 'nodate', daysLate: 0 };

  const today = tashkentNow(now);
  const diff = dayNumber(today.date) - dayNumber(date);
  if (diff > 0) return { bucket: 'late', daysLate: diff };
  if (diff < 0) return { bucket: 'upcoming', daysLate: 0 };

  const [hh, mm] = String(order.deadline?.time ?? '').split('-')[0].split(':').map(Number);
  if (Number.isFinite(hh) && today.minutes >= hh * 60 + (mm || 0)) return { bucket: 'late', daysLate: 0 };
  return { bucket: 'today', daysLate: 0 };
}

const byDeadline = (a, b) =>
  String(a.deliveryTime ?? '9999').localeCompare(String(b.deliveryTime ?? '9999'))
  || String(a.deadline?.time ?? '').localeCompare(String(b.deadline?.time ?? ''));

/** Faol (tayyor bo'lmagan) buyurtmalarni guruhlarga ajratadi; har guruh muddat bo'yicha tartiblangan */
export function groupActiveOrders(orders, now = new Date()) {
  const groups = { late: [], today: [], upcoming: [], nodate: [] };
  orders
    .filter((order) => order.status !== 'tayyor')
    .forEach((order) => {
      const { bucket, daysLate } = orderUrgency(order, now);
      groups[bucket].push({ ...order, daysLate });
    });
  Object.values(groups).forEach((list) => list.sort(byDeadline));
  return groups;
}
