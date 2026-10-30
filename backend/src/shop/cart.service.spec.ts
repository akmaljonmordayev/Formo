import { CartService } from './cart.service';
import { unitPrice } from './pricing';

// normalize — servisning ichki qadami: savatga yoziladigan qator shu natija bilan saqlanadi
const normalize = (c: Record<string, unknown>) =>
  (new CartService({} as never, {} as never, {} as never, {} as never) as unknown as {
    normalize: (sizes: string[], c: unknown) => Record<string, unknown>;
  }).normalize(['S', 'M', 'L'], c);

describe('CartService — shortiksiz klub formasi', () => {
  const base = { printName: 'ALI', printNumber: '10', shirtSize: 'L', shortsSize: 'L' };

  it("withShorts=false: shortik o'lchami, raqami va numberOnShorts tozalanadi", () => {
    expect(normalize({ ...base, withShorts: false, numberOnShorts: true, shortsNumber: '7' })).toMatchObject({
      withShorts: false,
      numberOnShorts: false,
      shortsNumber: null,
      shortsSize: null,
    });
  });

  it("withShorts=true + numberOnShorts: shortik raqami berilmasa — futbolka raqami", () => {
    expect(normalize({ ...base, withShorts: true, numberOnShorts: true, shortsNumber: null })).toMatchObject({
      numberOnShorts: true,
      shortsNumber: '10',
    });
  });

  it("narx: shortiksiz to'plamga shortsPrice qo'shilmaydi", () => {
    const kit = { shirtPrice: 99000, shortsPrice: 60000, printPrice: 30000 };
    expect(unitPrice(kit, { withShorts: false, printName: 'ALI' })).toBe(129000);
    expect(unitPrice(kit, { withShorts: true, printName: 'ALI' })).toBe(189000);
  });
});
