import { describe, expect, it } from 'vitest';
import { orderToQueueItem } from './tailorApi';
import { bottomStatus, translate } from './i18n';

const t = (key, vars) => translate('uz', key, vars);

const order = (items, extra = {}) => ({
  id: 5, code: 'F-005', status: 'ACCEPTED', customerName: 'Ali', quantity: 3, items, ...extra,
});
const line = (extra) => ({
  id: 1, clubName: 'Real Madrid', kitLabel: 'Uy', printName: 'ALI', printNumber: '7', shirtSize: 'L', shortsSize: 'M',
  quantity: 1, withShorts: true, numberOnShorts: false, shortsNumber: null, sleeve: 'SHORT', bottom: 'SHORTS', ...extra,
});

describe('orderToQueueItem', () => {
  it("shalvarli qator shalvar deb ko'rsatiladi, raqami bilan", () => {
    const item = orderToQueueItem(order([line({ sleeve: 'LONG', bottom: 'PANTS', numberOnShorts: true, shortsNumber: '9' })]));
    expect(item.lines[0]).toMatchObject({ bottom: 'pants', sleeve: 'long', withBottom: true, bottomNumber: '9', bottomSize: 'M' });
    expect(bottomStatus(t, item.lines[0])).toBe('Shalvar · raqam 9');
  });

  it("kalta yengli shalvar ham shalvar (yeng turiga bog'liq emas); raqam berilmasa futbolka raqami", () => {
    const item = orderToQueueItem(order([line({ bottom: 'PANTS', numberOnShorts: true })]));
    expect(item.lines[0]).toMatchObject({ bottom: 'pants', sleeve: 'short', bottomNumber: '7' });
  });

  it('raqamsiz shortik va faqat futbolka', () => {
    const [shorts, shirtOnly] = orderToQueueItem(order([line(), line({ id: 2, withShorts: false, numberOnShorts: true })])).lines;
    expect(bottomStatus(t, shorts)).toBe('Shortik · raqamsiz');
    expect(shirtOnly).toMatchObject({ withBottom: false, bottomNumber: '', bottomSize: '' });
    expect(bottomStatus(t, shirtOnly)).toBe('Faqat futbolka');
  });

  it("bitta buyurtmadagi barcha qatorlar ko'rinadi: shortikli va shalvarli", () => {
    const item = orderToQueueItem(order([line({ quantity: 2 }), line({ id: 2, bottom: 'PANTS', sleeve: 'LONG', quantity: 1 })]));
    expect(item.lines.map((l) => l.bottom)).toEqual(['shorts', 'pants']);
    expect(item.qty).toBe(3);
  });

  it("sex ko'rmaydigan holat — null", () => {
    expect(orderToQueueItem(order([line()], { status: 'DELIVERED' }))).toBeNull();
  });
});
