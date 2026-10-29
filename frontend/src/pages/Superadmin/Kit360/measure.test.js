import { describe, expect, it } from 'vitest';
import { measureShorts, measureTorso, printLayout } from './measure';

// Sun'iy kadr: kulrang fon, oq futbolka (x 230–370, y 150–400) va oq shortik (x 225–375, y 400–505)
function frame() {
  const width = 600;
  const height = 800;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const shirt = x >= 230 && x <= 370 && y >= 150 && y < 400;
      const shorts = x >= 225 && x <= 375 && y >= 400 && y <= 505;
      const v = shirt || shorts ? 245 : 178;
      data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
    }
  }
  return { data, width, height };
}

describe('Forma 360° — suratdan bosma joyini o\'lchash', () => {
  it('tana kengligi va markazi', () => {
    expect(measureTorso(frame())).toEqual({ mid: 300, half: 70 });
  });

  it('shortikning o\'ng oyog\'i va pastki cheti', () => {
    expect(measureShorts(frame())).toEqual({ cx: 343, w: 70, hem: 505 });
  });

  it('orqa: ism yoqadan pastroq, raqam undan pastda; burilmagan kadrda theta = 0', () => {
    const [name, number] = printLayout(4, frame());
    expect(name.surface.theta).toBe(0);
    expect(name.y).toBeGreaterThan(150);
    expect(number.y).toBeGreaterThan(name.y);
    expect(number.y).toBeLessThan(400);
  });

  it('burilgan orqa (135°): kenglik va yoqa 180° kadridan olinadi', () => {
    const [name] = printLayout(3, frame(), frame());
    expect(name.surface.theta).toBe(Math.PI / 4);
    expect(name.surface.a).toBe(70);
    expect(name.y).toBeGreaterThan(150);
  });
});
