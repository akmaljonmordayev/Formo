import { describe, expect, it } from 'vitest';
import { findBadge, garmentMask, healFabricPatch, logoTop, measureShorts, measureTorso, printLayout } from './measure';

const WHITE = [245, 238, 226]; // oq mato — ozgina iliq tus bilan (fon va maneken neytral)
const GREY_ARM = [120, 120, 120];

/* Sun'iy kadr: kulrang fon (178), oq futbolka (x 230–370, y 150–400), oq shortik (x 225–375, y 400–505),
   ixtiyoriy kulrang maneken qo'li (x 380–400, y 200–420), o'ng oyoqda ikki rangli gerb (x 335–360, y 440–465),
   shortik ustiga osilgan kulrang qo'l (x 360–385, y 415–480), pastki chetda qora logotip (x 330–350, y 490–497). */
function frame({ arm = false, white = WHITE, badge = false, hand: overHand = false, logo = false } = {}) {
  const width = 600;
  const height = 800;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const shirt = x >= 230 && x <= 370 && y >= 150 && y < 400;
      const shorts = x >= 225 && x <= 375 && y >= 400 && y <= 505;
      const hand = arm && x >= 380 && x < 400 && y >= 200 && y < 420;
      const crest = badge && x >= 335 && x < 360 && y >= 440 && y < 465;
      const finger = overHand && x >= 360 && x < 385 && y >= 415 && y < 480;
      const mark = logo && x >= 330 && x < 350 && y >= 490 && y < 498;
      const [r, g, b] = crest ? (x < 347 ? [200, 30, 40] : [30, 60, 190]) : finger ? GREY_ARM : mark ? [20, 20, 22]
        : shirt || shorts ? white : hand ? GREY_ARM : [178, 178, 178];
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  return { data, width, height };
}

describe('Forma 360° — suratdan bosma joyini o\'lchash', () => {
  it('studiya oqi (butunlay neytral [235, 235, 236]) ham mato: tana, shortik, maska', () => {
    const img = frame({ white: [235, 235, 236] });
    expect(measureTorso(img)).toEqual({ mid: 300, half: 70 });
    expect(measureShorts(img)).toMatchObject({ hem: 505 });
    expect(garmentMask(img)[300 * img.width + 300]).toBe(255);
  });

  it("shortik raqami doim o'ng oyoqda (cx > 300) — o'ng oyoqda nishon bo'lsa ham", () => {
    const img = frame({ badge: true });
    for (const f of [0, 1, 7]) expect(printLayout(f, img, frame())[0].surface.mid).toBeGreaterThan(300);
  });

  it('logoTop: pastki chetdagi qora logotip boshlanishini topadi, toza matoda null', () => {
    expect(logoTop(frame({ logo: true }), 320, 360, 471, 499)).toBe(490);
    expect(logoTop(frame(), 320, 360, 471, 499)).toBeNull();
  });

  it("findBadge: ikki rangli gerb topiladi, bir rangli yassi logotip (chetda) — yo'q", () => {
    const box = findBadge(frame({ badge: true }), 300, 372, 420, 500);
    // 1 px kengaytirilgan (antialias chetini ham qamrab oladi)
    expect(box).toMatchObject({ x0: 334, y0: 439, x1: 360, y1: 465 });
    expect(box.chroma).toBeGreaterThan(0.05);
    expect(findBadge(frame({ logo: true }), 300, 372, 420, 500)).toBeNull();
  });

  it('healFabricPatch: gerb mato bilan yamaladi, yondagi rangli lampas tortilmaydi', () => {
    const img = frame({ badge: true });
    // gerbning o'ng tomonida, namuna olinadigan joyda qizil lampas (x 362–366)
    for (let y = 400; y <= 505; y += 1) {
      for (let x = 362; x <= 366; x += 1) img.data.set([210, 20, 30], (y * img.width + x) * 4);
    }
    const out = healFabricPatch(img, { x0: 335, y0: 440, x1: 359, y1: 464 });
    for (const [x, y] of [[340, 450], [355, 460], [358, 444]]) {
      const i = (y * img.width + x) * 4;
      const d = Math.abs(out.data[i] - WHITE[0]) + Math.abs(out.data[i + 1] - WHITE[1]) + Math.abs(out.data[i + 2] - WHITE[2]);
      expect(d).toBeLessThanOrEqual(12);
    }
    expect(img.data[(450 * img.width + 340) * 4]).toBe(200); // asl kadr o'zgarmaydi
  });

  it("measureShorts: o'ng chetni yopgan kulrang qo'l (y 415–480) markazni siljitmaydi", () => {
    const leg = measureShorts(frame({ hand: true }));
    expect(leg.hem).toBe(505);
    expect(Math.abs(leg.edge(470) - 375)).toBeLessThanOrEqual(2);
    expect(Math.abs(leg.cx - 329.5)).toBeLessThanOrEqual(2);
  });

  it('tana kengligi va markazi', () => {
    expect(measureTorso(frame())).toEqual({ mid: 300, half: 70 });
  });

  it("shortikning o'ng oyog'i va pastki cheti", () => {
    expect(measureShorts(frame())).toMatchObject({ cx: 329.5, half: 45.5, hem: 505 });
  });

  it('orqa: ism yoqadan pastroq, raqam undan pastda; burilmagan kadrda theta = 0', () => {
    const [name, number] = printLayout(4, frame());
    expect(name.surface.theta).toBe(0);
    expect(name.y).toBeGreaterThan(150);
    expect(number.y).toBeGreaterThan(name.y);
    expect(number.y).toBeLessThan(400);
  });

  it("120% da ham raqam ismga (pastki chiqiqlari bilan) tegmaydi; raqamga maxW bor", () => {
    for (const scale of [0.8, 1, 1.2]) {
      const [name, number] = printLayout(4, frame(), null, scale);
      const nameBottom = name.y + Math.ceil(name.size * 0.3);
      expect(number.y - number.size).toBeGreaterThanOrEqual(nameBottom + number.gap);
      expect(number.size).toBe(Math.round(70 * 0.95 * scale));
      expect(number.maxW).toBeCloseTo(70 * 1.35);
    }
  });

  it("burilgan orqa (135°): tana o'qi 180° kadridan, kengligi undan", () => {
    const [name, number] = printLayout(3, frame(), frame());
    expect(number.surface.theta).toBe(Math.PI / 4);
    expect(Math.abs(number.surface.mid - 300)).toBeLessThanOrEqual(1);
    expect(name.surface.a).toBeCloseTo(70 * 1.15);
    expect(name.y).toBeGreaterThan(150);
  });

  it("burilgan kadrda soyadagi oq yon kesilmaydi, yondagi qo'l qo'shilmaydi — markaz siljimaydi", () => {
    // 135° proyeksiya kengligi 2R ≈ 115 px: x 243–357, chap 30 px — soyadagi oq (xira tus), o'ngda yopishgan kulrang qo'l
    const img = frame();
    for (let y = 150; y < 400; y += 1) {
      for (let x = 225; x < 400; x += 1) {
        const i = (y * img.width + x) * 4;
        const c = x < 243 ? [178, 178, 178] : x < 273 ? [160, 155, 148] : x <= 357 ? WHITE : x < 385 ? GREY_ARM : [178, 178, 178];
        [img.data[i], img.data[i + 1], img.data[i + 2]] = c;
      }
    }
    expect(measureTorso(img).mid).toBeGreaterThan(310); // faqat aniq mato bo'yicha — o'ngga siljigan
    const [, number] = printLayout(3, img, frame());
    expect(Math.abs(number.surface.mid - 300)).toBeLessThanOrEqual(1);
  });

  it('shortik raqami oldidan 0°, 45° va 315° kadrlarda — oyoq silindri burilishi bilan', () => {
    for (const [frameNo, theta] of [[0, 0], [1, -Math.PI / 4], [7, Math.PI / 4]]) {
      const zones = printLayout(frameNo, frame(), frame());
      expect(zones).toHaveLength(1);
      expect(zones[0]).toMatchObject({ text: 'number', shorts: true });
      expect(zones[0].surface.theta).toBe(theta);
      expect(zones[0].y).toBeLessThan(505);
    }
    expect(printLayout(2, frame(), frame())).toEqual([]);
  });

  it("maska: maneken qo'li va tashqi fon kesiladi, mato qoladi", () => {
    const img = frame({ arm: true });
    const mask = garmentMask(img);
    const at = (x, y) => mask[y * img.width + x];
    expect(at(390, 300)).toBe(0);
    expect(at(300, 300)).toBe(255);
    expect(at(100, 300)).toBe(0);
  });
});
