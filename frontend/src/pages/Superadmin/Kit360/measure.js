/* Har bir suratdan bosma joyini o'lchaymiz — kadrlar neyroset chizgani uchun har biri biroz boshqacha.
   img — ImageData ko'rinishi: { data, width, height }. Tekislangan kadr: 600×800, maneken markazi x ≈ 300. */

// Mato pikseli: manekenning kulrang tanasi (soyada ham) va kulrang fon emas — rangli, juda oq yoki deyarli qora
export function isFabric(img, x, y) {
  const i = (y * img.width + x) * 4;
  const r = img.data[i];
  const g = img.data[i + 1];
  const b = img.data[i + 2];
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  return Math.max(r, g, b) - Math.min(r, g, b) > 30 || l > 192 || l < 55;
}

// y qatorida x0 atrofidagi mato bo'lagi [chap, o'ng]; gap px gacha tirqishlar (soya, chiziq) o'tkaziladi
export function runAt(img, y, x0, gap = 4) {
  let start = -1;
  for (let d = 0; d < 30 && start < 0; d += 1) {
    for (const x of [x0 + d, x0 - d]) {
      if (x >= 0 && x < img.width && isFabric(img, x, y)) { start = x; break; }
    }
  }
  if (start < 0) return null;
  const edge = (dir) => {
    let x = start;
    let last = start;
    let miss = 0;
    while (miss <= gap && x + dir >= 0 && x + dir < img.width) {
      x += dir;
      if (isFabric(img, x, y)) { last = x; miss = 0; } else miss += 1;
    }
    return last;
  };
  return [edge(-1), edge(1)];
}

const median = (xs) => [...xs].sort((p, q) => p - q)[xs.length >> 1];

// Bir nechta qator bo'yicha mediana — bitta burma yoki soya natijani buzmasin
function spanNear(img, y, x0, gap) {
  const runs = [];
  for (let dy = -8; dy <= 8; dy += 4) {
    const r = runAt(img, y + dy, x0, gap);
    if (r) runs.push(r);
  }
  return runs.length ? [median(runs.map((r) => r[0])), median(runs.map((r) => r[1]))] : null;
}

// Tana: qo'llar ostidagi qatorda (y ≈ 300) futbolka kengligi
export function measureTorso(img) {
  const s = spanNear(img, 300, 300, 4);
  return s && s[1] - s[0] > 60 ? { mid: (s[0] + s[1]) / 2, half: (s[1] - s[0]) / 2 } : null;
}

// Kulrang maneken tanasi yoki fon (rangsiz, o'rtacha yorqin)
function isGrey(img, x, y) {
  const i = (y * img.width + x) * 4;
  const r = img.data[i];
  const g = img.data[i + 1];
  const b = img.data[i + 2];
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  return Math.max(r, g, b) - Math.min(r, g, b) < 25 && l > 70 && l < 186;
}

// Yoqa: futbolkadan (y = 260) yuqoriga — kulrang bo'yin boshlanguncha; boshdagi yaltirash xato bermaydi
export function collarAt(img, x) {
  const cx = Math.round(x);
  let grey = 0;
  for (let y = 260; y > 100; y -= 1) {
    grey = isGrey(img, cx, y) ? grey + 1 : 0;
    if (grey === 4) return y + 4;
  }
  return null;
}

// Shortik: manekenning chap oyog'i (rasmda o'ngda) — tana kengligidan, pastki cheti — kulrang son boshlangan joy
export function measureShorts(img) {
  const torso = measureTorso(img);
  if (!torso) return null;
  const cx = Math.round(torso.mid + torso.half * 0.62);
  let grey = 0;
  for (let y = 450; y < 600; y += 1) {
    grey = isGrey(img, cx, y) ? grey + 1 : 0;
    if (grey === 4) return { cx, w: torso.half, hem: y - 4 };
  }
  return null;
}

/* Bosma joylari (y — harflar pastki chizig'i, size — bosh harflar balandligi):
   orqa (135°/180°/225°) — ism va katta raqam tana sirti bo'ylab; tana kesimi ellips: a — yarim kenglik (180° kadridan),
   b — chuqurlik, theta — kadr burilishi (kadrlar 45° qadam bilan); oldi (0°) — shortik raqami. */
export const BACK_FRAMES = { 3: Math.PI / 4, 4: 0, 5: -Math.PI / 4 };

export function printLayout(frame, img, backImg) {
  if (frame === 0) {
    const s = measureShorts(img);
    if (!s) return [];
    const size = Math.round(s.w * 0.28);
    // Pastki chetdagi brend logotipi ustida
    return [{ text: 'number', shorts: true, track: 0, size, cx: s.cx, y: s.hem - Math.round(size * 1.5) }];
  }
  if (!(frame in BACK_FRAMES)) return [];
  const torso = measureTorso(img);
  if (!torso) return [];
  const straight = frame === 4 ? torso : (backImg && measureTorso(backImg));
  const a = straight ? straight.half : torso.half;
  const surface = { mid: torso.mid, a, b: a * 0.6, theta: BACK_FRAMES[frame] };
  const { b, theta } = surface;
  // Kadrlar bir xil tekislangan — burilgan kadrda yoqa 180° dagidan uzoq bo'lolmaydi (chiziq/soya xato bersa, o'shani olamiz)
  const straightCollar = straight && frame !== 4 ? collarAt(backImg, straight.mid) : null;
  let collar = collarAt(img, torso.mid + b * Math.sin(theta)) ?? straightCollar ?? 150;
  if (straightCollar && Math.abs(collar - straightCollar) > 15) collar = straightCollar;
  return [
    { text: 'name', surface, track: 2, size: Math.round(a * 0.23), maxW: a * 1.45, y: collar + Math.round(a * 0.7) },
    { text: 'number', surface, track: 0, size: Math.round(a * 0.95), y: collar + Math.round(a * 2.1) },
  ];
}
