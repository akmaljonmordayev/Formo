import { demoPaymentEnabled } from './order-view';

describe('demoPaymentEnabled', () => {
  const env = { NODE_ENV: process.env.NODE_ENV, PAYMENT_DEMO: process.env.PAYMENT_DEMO };
  const set = (nodeEnv: string | undefined, demo: string | undefined) => {
    if (nodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = nodeEnv;
    if (demo === undefined) delete process.env.PAYMENT_DEMO;
    else process.env.PAYMENT_DEMO = demo;
  };
  afterEach(() => set(env.NODE_ENV, env.PAYMENT_DEMO));

  it("o'zgaruvchi berilmasa o'chiq (NODE_ENV'siz staging ham xavfsiz)", () => {
    set(undefined, undefined);
    expect(demoPaymentEnabled()).toBe(false);
    set('development', undefined);
    expect(demoPaymentEnabled()).toBe(false);
  });

  it("faqat aniq 'true' bilan yoqiladi", () => {
    set('development', 'false');
    expect(demoPaymentEnabled()).toBe(false);
    set('development', 'true');
    expect(demoPaymentEnabled()).toBe(true);
    set('development', ' TRUE ');
    expect(demoPaymentEnabled()).toBe(true);
  });

  it('productionda hech qachon yoqilmaydi', () => {
    set('production', 'true');
    expect(demoPaymentEnabled()).toBe(false);
  });
});
