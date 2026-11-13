import { inTashkentCity } from './tashkent';

describe('inTashkentCity — naqd faqat shahar ichida', () => {
  it.each([
    ['Amir Temur xiyoboni', 41.3111, 69.2797],
    ['Chilonzor', 41.2756, 69.2034],
    ['Yunusobod', 41.3644, 69.2869],
    ['Sergeli', 41.2234, 69.2219],
    ["Mirzo Ulug'bek", 41.3367, 69.3346],
  ])('%s — shahar ichi', (_name, lat, lng) => {
    expect(inTashkentCity(lat, lng)).toBe(true);
  });

  it.each([
    ['Chirchiq', 41.4689, 69.5822],
    ['Samarqand', 39.6542, 66.9597],
    ["Yangiyo'l", 41.1122, 69.0475],
    ['Olmaliq', 40.8447, 69.5986],
  ])('%s — shahardan tashqari', (_name, lat, lng) => {
    expect(inTashkentCity(lat, lng)).toBe(false);
  });

  it("koordinata yo'q — shahar ichi hisoblanmaydi", () => {
    expect(inTashkentCity(null, null)).toBe(false);
    expect(inTashkentCity(undefined, 69.2)).toBe(false);
    expect(inTashkentCity(Number.NaN, 69.2)).toBe(false);
  });
});

describe('isPostalDelivery / tashkentPointMismatch', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { isPostalDelivery, tashkentPointMismatch } = require('./tashkent');

  it('viloyat tanlangan — pochta; Toshkent shahri — kuryer', () => {
    expect(isPostalDelivery({ region: 'SAMARQAND', latitude: 39.65, longitude: 66.96 })).toBe(true);
    expect(isPostalDelivery({ region: 'TOSHKENT_VILOYATI' })).toBe(true);
    expect(isPostalDelivery({ region: 'TOSHKENT_SHAHRI', latitude: 41.31, longitude: 69.28 })).toBe(false);
  });

  it("eski manzil (viloyatsiz): nuqta bo'yicha; nuqta ham yo'q — kuryer", () => {
    expect(isPostalDelivery({ latitude: 41.4689, longitude: 69.5822 })).toBe(true);
    expect(isPostalDelivery({ latitude: 41.31, longitude: 69.28 })).toBe(false);
    expect(isPostalDelivery({})).toBe(false);
  });

  it('Toshkent shahri tanlanib, nuqta boshqa viloyatda — mos emas', () => {
    expect(tashkentPointMismatch({ region: 'TOSHKENT_SHAHRI', latitude: 39.6542, longitude: 66.9597 })).toBe(true);
    expect(tashkentPointMismatch({ region: 'TOSHKENT_SHAHRI', latitude: 41.2234, longitude: 69.2219 })).toBe(false);
    expect(tashkentPointMismatch({ region: 'TOSHKENT_SHAHRI' })).toBe(false);
    expect(tashkentPointMismatch({ region: 'SAMARQAND', latitude: 39.6542, longitude: 66.9597 })).toBe(false);
  });
});
