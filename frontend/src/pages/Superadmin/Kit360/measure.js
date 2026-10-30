/* Har bir suratdan bosma joyini o'lchaymiz — kadrlar neyroset chizgani uchun har biri biroz boshqacha.
   img — ImageData ko'rinishi: { data, width, height }. Tekislangan kadr: 600×800, maneken markazi x ≈ 300.
   Barcha koordinatalar — asl JPEG kadr koordinatalari (CROP faqat ekranga chizishda qo'llanadi). */

// Tekislashda kadr atrofiga qo'shilgan bir xil kulrang (#b2b2b3) hoshiya — ekranda kesib tashlanadi, nisbat 3:4 saqlanadi
export const CROP = { x: 24, y: 48, w: 552, h: 736 };

const FABRIC = 2; // aniq mato: to'yingan rang, juda qorong'i yoki rang tusli yorug' oq
const TINTED = 1; // rang tusli, lekin xira: soyadagi oq mato (yoki rang aks etgan maneken qo'li)
const GREY = 0; // neytral kulrang: maneken plastigi
const BG = -1; // studiya foni

function pixel(img, x, y) {
  const i = (y * img.width + x) * 4;
  const r = img.data[i];
  const g = img.data[i + 1];
  const b = img.data[i + 2];
  return { l: 0.299 * r + 0.587 * g + 0.114 * b, s: Math.max(r, g, b) - Math.min(r, g, b) };
}

const median = (xs) => [...xs].sort((p, q) => p - q)[xs.length >> 1];

/* Studiya foni — chapdan o'ngga silliq: qatorning ikki chetidan (tekislash hoshiyasidan ichkarida) va formaga yaqinroq
   to'rt nuqtadan (x ≈ 130, 168, 432, 470) o'lchab, bo'laklab chiziqli to'ldiramiz. Ichki nuqtalar o'rtadagi yorug'
   prozhektor dog'ini ham ushlaydi (pt 45°: chetda 175, o'rtada 212 — chetdan 35–42 yorug'). Ichki nuqta neytral va
   yorug' (s ≤ 6, l ≥ 155) bo'lmasa yoki chetdan 48 dan ko'p farq qilsa (mato tushib qolgan) — tashlanadi. */
const BG_INNER = [130, 168, 432, 470];
function backgroundRow(img, y) {
  const side = (xs) => median(xs.map((x) => pixel(img, x, y).l));
  const left = side([CROP.x + 4, CROP.x + 10, CROP.x + 16]);
  const right = side([img.width - CROP.x - 16, img.width - CROP.x - 10, img.width - CROP.x - 4]);
  const inner = (x, edge) => {
    const ps = [x - 6, x, x + 6].map((xx) => pixel(img, xx, y));
    const l = median(ps.map((p) => p.l));
    return ps.every((p) => p.s <= 6 && p.l >= 155) && Math.abs(l - edge) <= 48 ? l : null;
  };
  const xs = [0];
  const ls = [left];
  for (const x of BG_INNER) {
    const l = inner(x, x < img.width / 2 ? left : right);
    if (l !== null) { xs.push(x); ls.push(l); }
  }
  xs.push(img.width);
  ls.push(right);
  return (x) => {
    let i = 0;
    while (i < xs.length - 2 && x > xs[i + 1]) i += 1;
    return ls[i] + ((ls[i + 1] - ls[i]) * (x - xs[i])) / (xs[i + 1] - xs[i]);
  };
}

/* Piksel turi. Fon va maneken — neytral kulrang (JPEG shovqini bilan to'yinganlik ≤ 4, fonda aks etgan rang bilan ≤ 10);
   mato odatda ozgina rang tusiga ega. Studiya oqidagi forma (rm, en, fr, mu, mci) esa butunlay neytral — lekin juda yorug'
   (l ≥ 205, fon emas): bu ham mato. Maneken plastigi shu chegaradan qorong'i (isGrey bilan bir xil chegara). */
const WHITE_L = 205;
// Maneken plastigi bundan qorong'i; yorug'roq neytral kulrang soyadagi oq mato ham bo'lishi mumkin
const MANNEQUIN_L = 150;
function pixelKind(img, x, y, bg = backgroundRow(img, y)) {
  const { l, s } = pixel(img, x, y);
  if (l < 55 || s > 30) return FABRIC;
  // s ≤ 10 (BG_SAT = 4 emas): ghost kadrlarda shortik ostidagi yorug' fon JPEG'da s = 5 gacha (mci 315°) — qat'iy
  // chegarada u "oq mato" bo'lib, pastki chet 20 px pastga tushadi
  if (s <= 10 && Math.abs(l - bg(x)) <= 10) return BG;
  if (l >= WHITE_L) return FABRIC;
  if (s >= 5) return l >= 196 ? FABRIC : TINTED;
  return GREY;
}


/* y qatorida x0 atrofidagi mato bo'lagi [chap, o'ng]: gap px gacha kulrang tirqishlar (burma, chiziq) o'tkaziladi,
   lekin 2 px fon — siluet chegarasi (qo'l bilan tana orasidagi bo'shliq). minKind = FABRIC — faqat aniq mato. */
function runAt(img, y, x0, gap = 4, bg = backgroundRow(img, y), minKind = TINTED) {
  if (y < 0 || y >= img.height) return null;
  let start = -1;
  for (let d = 0; d < 30 && start < 0; d += 1) {
    for (const x of [x0 + d, x0 - d]) {
      if (x >= 0 && x < img.width && pixelKind(img, x, y, bg) >= minKind) { start = x; break; }
    }
  }
  if (start < 0) return null;
  const edge = (dir) => {
    let x = start;
    let last = start;
    let miss = 0;
    let bgRun = 0;
    while (miss <= gap && bgRun < 2 && x + dir >= 0 && x + dir < img.width) {
      x += dir;
      const k = pixelKind(img, x, y, bg);
      if (k >= minKind) { last = x; miss = 0; bgRun = 0; } else { miss += 1; bgRun = k === BG ? bgRun + 1 : 0; }
    }
    return last;
  };
  return [edge(-1), edge(1)];
}

// Qatordagi barcha mato bo'laklari (chapdan o'ngga), kengligi minW dan kichiklari tashlanadi
function runsAt(img, y, x0, x1, gap, minW, minKind = TINTED) {
  const bg = backgroundRow(img, y);
  const runs = [];
  let start = -1;
  let last = -1;
  for (let x = Math.max(0, x0); x <= Math.min(img.width - 1, x1); x += 1) {
    if (pixelKind(img, x, y, bg) < minKind) continue;
    if (start >= 0 && x - last > gap + 1) {
      if (last - start + 1 >= minW) runs.push([start, last]);
      start = x;
    }
    if (start < 0) start = x;
    last = x;
  }
  if (start >= 0 && last - start + 1 >= minW) runs.push([start, last]);
  return runs;
}

// Bir nechta qator bo'yicha mediana — bitta burma yoki soya natijani buzmasin
function spanNear(img, y, x0, gap) {
  const runs = [];
  for (let dy = -8; dy <= 8; dy += 4) {
    const r = runAt(img, y + dy, x0, gap, backgroundRow(img, y + dy), FABRIC);
    if (r) runs.push(r);
  }
  return runs.length ? [median(runs.map((r) => r[0])), median(runs.map((r) => r[1]))] : null;
}

// Tana: qo'llar ostidagi qatorda (y ≈ 300) futbolka kengligi — faqat aniq mato bo'yicha: rang aks etgan qo'l qo'shilmasin
const TORSO_Y = 300;
export function measureTorso(img) {
  const s = spanNear(img, TORSO_Y, 300, 4);
  return s && s[1] - s[0] > 60 ? { mid: (s[0] + s[1]) / 2, half: (s[1] - s[0]) / 2 } : null;
}

/* Burilgan kadrda tana kengligi ma'lum (180° kadridan, ellips proyeksiyasi 2R). Siluet chetiga ishonmaymiz — soyadagi oq
   mato fonga o'xshab kesiladi, rang aks etgan qo'l esa tanaga qo'shiladi; o'rniga 2R kenglikdagi oynani matoga eng
   ko'p to'g'ri keladigan joyga qo'yamiz: aniq mato +2, xira rangli +1, maneken va fon −1. */
export function fitTorso(img, R) {
  const w = Math.round(R * 2);
  const mids = [];
  for (let y = TORSO_Y - 8; y <= TORSO_Y + 8; y += 4) {
    const bg = backgroundRow(img, y);
    const sum = new Float64Array(img.width + 1);
    for (let x = 0; x < img.width; x += 1) {
      const k = pixelKind(img, x, y, bg);
      sum[x + 1] = sum[x] + (k === FABRIC ? 2 : k === TINTED ? 1 : -1);
    }
    let best = -Infinity;
    let at = -1;
    for (let x = 150; x + w <= 450; x += 1) {
      const score = sum[x + w] - sum[x];
      // teng ballda — markazga yaqini (maneken ustuni x ≈ 300 da)
      if (score > best || (score === best && Math.abs(x + w / 2 - 300) < Math.abs(at + w / 2 - 300))) {
        best = score;
        at = x;
      }
    }
    if (best > w * 0.6) mids.push(at + w / 2);
  }
  return mids.length >= 3 ? median(mids) : null;
}

// Kulrang maneken tanasi yoki fon (rangsiz, o'rtacha yorqin)
function isGrey(img, x, y, maxSat = 4) {
  const { l, s } = pixel(img, x, y);
  // Ghost kadrda yoqa tepasida bo'yin emas, yorug' studiya foni (l ≥ 205 ham bo'lishi mumkin) — u ham "yoqadan tashqari"
  return s <= maxSat && l > 70 && (l < WHITE_L || Math.abs(l - backgroundRow(img, y)(x)) <= 10);
}

/* Yoqa: futbolkadan (y = 260) yuqoriga — kulrang bo'yin boshlanguncha; boshdagi yaltirash xato bermaydi.
   Bo'yindagi yaltirash biroz tusli bo'lishi mumkin (en 180°: s = 5) — qat'iy (s ≤ 4) qidiruv bo'yinni o'tkazib ensani
   topadi (y < 135, boshqa formalarda 140–150). Faqat shunda s ≤ 6 bilan qayta qidiriladi: oq yoqa soyasi ham s 5–6,
   uni hamma formalarga yoyib bo'lmaydi (rm 135°, es 180° da ism 8–16 px pastga tushardi). */
const COLLAR_MIN = 135;
function collarAt(img, x) {
  const cx = Math.round(x);
  const scan = (maxSat) => {
    let grey = 0;
    for (let y = 260; y > 100; y -= 1) {
      grey = isGrey(img, cx, y, maxSat) ? grey + 1 : 0;
      if (grey === 4) return y + 4;
    }
    return null;
  };
  const strict = scan(4);
  return strict !== null && strict >= COLLAR_MIN ? strict : (scan(6) ?? strict);
}

/* Shortikning raqamli oyog'i — manekenning chap oyog'i, rasmda doim o'ngdagi oyoq (0°, 45°, 315°); oyoq hech qachon
   almashtirilmaydi, aks holda aylantirganda raqam va gerb oyoqdan oyoqqa sakraydi.
   - 45° da manekenning qo'li son ustiga osilib turadi (y ≈ 435–478): bel qatori (y = 420) va pastki chetdan yuqoridagi
     qatorlardan o'lchaymiz; o'ng chet faqat tashqarisida fon bo'lgan qatorlardan olinadi (qo'l bilan to'silgani emas),
     chiziqli moslashtiriladi — edge(y) raqamning o'z qatorida beriladi, kengaygan pastki chet silindrni fonga surmaydi.
   - pastki chet: oyoqning 5 ta ustunida 10 qator ketma-ket mato bo'lmagan joy (burma soyasi qisqa), ustunlar medianasi.
   - rangli/qora shortik ostidagi son rang aks ettiradi (xira rangli) — u holda faqat aniq mato hisoblanadi.
   legA — oyoq silindri radiusi (180° kadridagi tanadan), berilsa proyeksiya kengligi shundan. */
const WAIST_Y = 420;
// To'q kulrang son (oq shortik ostida) va uni qidirish oralig'i: chot soyasi < 465, tizza > 535
const THIGH_L = 158;
const THIGH_FROM = 465;
const THIGH_TO = 535;
/* Qatordagi shortikning o'ng cheti: asosiy bo'lak (≥ 12 px), so'ng o'ngdagi ingichka mato bo'laklari (≥ 3 px — barmoqlar
   yoki rangli lampas ortidagi 6–10 px mato) orqali kengaytiriladi, agar oralig'ida 2 px studiya foni bo'lmasa (kulrang
   qo'l yoki rangli chiziq — fon emas). clean — chetning tashqarisida fon (qo'l bilan to'silmagan). */
function rightEdgeAt(img, y, x0, x1, minKind) {
  const bg = backgroundRow(img, y);
  const pieces = runsAt(img, y, x0, x1, 6, 3, minKind);
  let mainAt = -1;
  for (let i = 0; i < pieces.length; i += 1) if (pieces[i][1] - pieces[i][0] + 1 >= 12) mainAt = i;
  if (mainAt < 0) return null;
  const run = [...pieces[mainAt]];
  for (let i = mainAt + 1; i < pieces.length; i += 1) {
    let bgRun = 0;
    let blocked = false;
    for (let x = run[1] + 1; x < pieces[i][0]; x += 1) {
      bgRun = pixelKind(img, x, y, bg) === BG ? bgRun + 1 : 0;
      if (bgRun >= 2) { blocked = true; break; }
    }
    if (blocked) break;
    run[1] = pieces[i][1];
  }
  let outside = 0;
  for (let d = 3; d <= 8; d += 1) if (run[1] + d < img.width && pixelKind(img, run[1] + d, y, bg) === BG) outside += 1;
  return { x: run[1], left: run[0], clean: outside >= 4 };
}

export function measureShorts(img, legA = null, theta = 0) {
  // Oldi-yondan oq futbolka soyada fonga o'xshab qolishi mumkin — unda o'rtacha tana olinadi
  const torso = measureTorso(img) ?? { mid: 300, half: 60 };
  const x0 = Math.round(torso.mid - torso.half * 2.4);
  const x1 = Math.round(torso.mid + torso.half * 2.4);
  const maxHalf = torso.half * 0.65;
  const loose = runsAt(img, WAIST_Y, x0, x1, 6, 30).pop();
  if (!loose) return null;
  let strong = 0;
  for (let x = loose[0]; x <= loose[1]; x += 1) {
    const { l, s } = pixel(img, x, WAIST_Y);
    if (s > 30 || l < 55) strong += 1;
  }
  const minKind = strong > (loose[1] - loose[0] + 1) / 2 ? FABRIC : TINTED;
  const projected = legA ? legA * Math.hypot(Math.cos(theta), LEG_DEPTH * Math.sin(theta)) : null;

  const waist = [];
  for (let y = WAIST_Y - 4; y <= WAIST_Y + 8; y += 2) {
    const e = rightEdgeAt(img, y, x0, x1, minKind);
    if (e) waist.push(e);
  }
  if (!waist.length) return null;
  const waistClean = waist.filter((e) => e.clean);
  const e0 = median((waistClean.length ? waistClean : waist).map((e) => e.x));
  const half0 = projected ?? Math.min((e0 - median(waist.map((e) => e.left))) / 4, maxHalf);
  const c0 = e0 - half0;
  const hems = [];
  for (let k = -2; k <= 2; k += 1) {
    const cx = Math.round(c0 + k * half0 * 0.3);
    let miss = 0;
    for (let y = WAIST_Y + 10; y < 700; y += 1) {
      miss = pixelKind(img, cx, y) >= minKind ? 0 : miss + 1;
      if (miss === 10) { hems.push(y - 10); break; }
    }
  }
  if (hems.length < 3) return null;
  let hem = median(hems);
  // Oq shortik: soyadagi oq mato (l 180–204, deyarli neytral) fon/kulrangga o'xshab skanni erta to'xtatadi (rm 45°: qo'l
  // va chot soyasi). Shortik ostida doim to'q kulrang maneken soni — y 465..535 oralig'ida matodan songa oxirgi o'tishni olamiz.
  if (minKind === TINTED) {
    const thigh = (x, y) => { const { l, s } = pixel(img, x, y); return l < THIGH_L && s <= 12; };
    const ends = [];
    for (let k = -2; k <= 2; k += 1) {
      const cx = Math.round(c0 + k * half0 * 0.3);
      let last = null;
      for (let y = THIGH_FROM; y <= THIGH_TO; y += 1) {
        if (!thigh(cx, y - 1) && [0, 1, 2, 3].every((d) => thigh(cx, y + d))) last = y;
      }
      if (last !== null) ends.push(last - 1);
    }
    if (ends.length >= 3) hem = median(ends);
  }

  // O'ng chet chizig'i: toza (fon bilan chegaradosh) qatorlar bo'yicha eng kichik kvadratlar
  const pts = [];
  for (let y = WAIST_Y; y <= hem - 3; y += 1) {
    const e = rightEdgeAt(img, y, x0, x1, minKind);
    if (e) pts.push({ y, ...e });
  }
  if (!pts.length) return null;
  const clean = pts.filter((p) => p.clean);
  let edge;
  if (clean.length && clean[clean.length - 1].y - clean[0].y < 20) {
    // Qo'l sonning yuqorisini yopgan (mci 45°): qisqa toza bo'lakdan qiyalik shovqinli — mediana va shortikning
    // yuqoriga qarab doimiy anatomik torayishi
    const x = median(clean.map((p) => p.x));
    edge = (y) => x - 0.08 * (hem - 8 - y);
  } else {
    const fit = clean.length >= 4 ? clean : pts;
    const my = fit.reduce((s, p) => s + p.y, 0) / fit.length;
    const mx = fit.reduce((s, p) => s + p.x, 0) / fit.length;
    const vy = fit.reduce((s, p) => s + (p.y - my) ** 2, 0);
    const slope = vy ? fit.reduce((s, p) => s + (p.y - my) * (p.x - mx), 0) / vy : 0;
    // Juda qiya chiziq — o'lchov xatosi (qo'l, logotip); bunday holda vertikal deb olamiz
    const k = Math.abs(slope) > 0.6 ? 0 : slope;
    edge = (y) => mx + k * (y - my);
  }

  const low = runsAt(img, hem - 14, x0, x1, 6, 20, minKind).pop();
  const half = projected ?? Math.min(low ? (low[1] - low[0]) / 2 : maxHalf, maxHalf);
  return { cx: edge(hem - 15) - half, half, hem, edge };
}

/* Pastki chetdagi brend logotipi (Nike/Adidas/Puma): raqam ustunida mato medianasidan keskin farq qiladigan (|Δl| > 70)
   va o'tkir chegarali (qo'shni bilan > 35) piksellar — qatorda kamida 2 ta bo'lsa, logotip boshlandi. Burma soyasi yumshoq. */
export function logoTop(img, xa, xb, ya, yb) {
  const x0 = Math.max(1, Math.round(xa));
  const x1 = Math.min(img.width - 2, Math.round(xb));
  const y0 = Math.max(1, Math.round(ya));
  const y1 = Math.min(img.height - 2, Math.round(yb));
  if (x1 <= x0 || y1 <= y0) return null;
  const ls = [];
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) ls.push(pixel(img, x, y).l);
  const med = median(ls);
  for (let y = y0; y <= y1; y += 1) {
    let hits = 0;
    for (let x = x0; x <= x1; x += 1) {
      const l = pixel(img, x, y).l;
      // to'rt qo'shnidan biri bilan keskin farq — logotip cheti (yuqori qatori ham, faqat pastki emas)
      const sharp = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => Math.abs(pixel(img, x + dx, y + dy).l - l) > 35);
      if (Math.abs(l - med) > 70 && sharp) hits += 1;
    }
    if (hits >= 2) return y;
  }
  return null;
}

/* Alohida turgan "nishon" (klub gerbi) — oyoq ichidagi to'rtburchakda:
   - mato rangidan (to'rtburchakdagi eng ko'p rang) keskin farqli ichki mato piksellari (|ΔRGB| > 90); 1 px kengaytirib
     8-bog'lamli bo'laklarga ajratiladi;
   - bo'lak gerbmi: o'lchami minSide..60 px, tomonlar nisbati 0.55..1.7 (yon chiziq — ingichka-uzun, Nike — yassi), ikkala
     chetga tegmaydi, zich (≥ 25 %) va kamida ikki xil rangdan iborat (gerb — qalqon + rasm; Nike/Adidas/Puma — bir rang).
   profile — 45° da chap oyoq chetidagi gerb yonidan (6–10 px eni) ko'rinadi: nisbat tekshirilmaydi, siluet chetidagi
   piksellar ham olinadi.
   Eng katta mos bo'lak qaytadi: { x0, y0, x1, y1, offH, chroma } (kadr koordinatalarida; offH — kengaytirilmagan
   balandlik, chroma — rangli (max−min > 25) piksellar ulushi) yoki null. */
export function findBadge(img, xa, xb, ya, yb, { minSide = 12, profile = false } = {}) {
  const x0 = Math.max(1, Math.round(xa));
  const x1 = Math.min(img.width - 2, Math.round(xb));
  const y0 = Math.max(1, Math.round(ya));
  const y1 = Math.min(img.height - 2, Math.round(yb));
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  if (w < minSide + 4 || h < minSide + 4) return null;
  const rgb = (x, y) => { const i = (y * img.width + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2]]; };
  // Mato rangi — eng ko'p uchraydigan (32 pog'onali) rang: yon panel yoki chiziqlar bo'lsa ham asosiy mato olinadi
  const modes = new Map();
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const c = rgb(x, y);
      const key = ((c[0] >> 5) << 6) | ((c[1] >> 5) << 3) | (c[2] >> 5);
      const e = modes.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      e.n += 1; e.r += c[0]; e.g += c[1]; e.b += c[2];
      modes.set(key, e);
    }
  }
  const top = [...modes.values()].reduce((m, e) => (e.n > m.n ? e : m));
  const fabric = [top.r / top.n, top.g / top.n, top.b / top.n];
  const off = new Uint8Array(w * h);
  const bins = new Int16Array(w * h).fill(-1);
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const c = rgb(x, y);
      if (Math.abs(c[0] - fabric[0]) + Math.abs(c[1] - fabric[1]) + Math.abs(c[2] - fabric[2]) <= 90) continue;
      // faqat ichki mato: 3×3 atrofida maneken (qo'l) yoki fon bo'lmasin — qo'l yaltirashi gerbga qo'shilmaydi
      // (profile: chetdagi gerb siluetga tegib turadi — faqat pikselning o'zi mato bo'lsa yetarli)
      let inside = !profile || pixelKind(img, x, y) > GREY;
      if (!profile) {
        for (let dy = -1; dy <= 1 && inside; dy += 1) for (let dx = -1; dx <= 1; dx += 1) if (pixelKind(img, x + dx, y + dy) <= GREY) { inside = false; break; }
      }
      if (!inside) continue;
      off[(y - y0) * w + (x - x0)] = 1;
      bins[(y - y0) * w + (x - x0)] = ((c[0] >> 6) << 4) | ((c[1] >> 6) << 2) | (c[2] >> 6);
    }
  }
  const grown = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p += 1) {
    if (!off[p]) continue;
    const x = p % w;
    const y = (p / w) | 0;
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h) grown[yy * w + xx] = 1;
    }
  }
  let best = null;
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let p0 = 0; p0 < w * h; p0 += 1) {
    if (!grown[p0] || seen[p0]) continue;
    let n = 0;
    let bx0 = w;
    let by0 = h;
    let bx1 = 0;
    let by1 = 0;
    let oy0 = h;
    let oy1 = -1;
    let chroma = 0;
    const count = new Map();
    seen[p0] = 1;
    stack.push(p0);
    while (stack.length) {
      const p = stack.pop();
      const x = p % w;
      const y = (p / w) | 0;
      if (off[p]) {
        n += 1;
        count.set(bins[p], (count.get(bins[p]) || 0) + 1);
        oy0 = Math.min(oy0, y);
        oy1 = Math.max(oy1, y);
        const [r, g, b] = rgb(x0 + x, y0 + y);
        if (Math.max(r, g, b) - Math.min(r, g, b) > 25) chroma += 1;
      }
      bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const xx = x + dx;
          const yy = y + dy;
          const q = yy * w + xx;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h && grown[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
        }
      }
    }
    const bw = bx1 - bx0 + 1;
    const bh = by1 - by0 + 1;
    if (bw < minSide || bh < minSide || bw > 60 || bh > 60) continue;
    if (!profile && (bw / bh < 0.55 || bw / bh > 1.7)) continue;
    if ((bx0 === 0 && bx1 === w - 1) || n < bw * bh * 0.25) continue;
    const colors = [...count.values()].filter((v) => v >= n * 0.08).length;
    if (colors < 2) continue;
    if (!best || n > best.n) best = { n, bx0, by0, bx1, by1, offH: oy1 - oy0 + 1, chroma: chroma / n };
  }
  return best && {
    x0: x0 + best.bx0, y0: y0 + best.by0, x1: x0 + best.bx1, y1: y0 + best.by1, offH: best.offH, chroma: best.chroma,
  };
}

/* Nishonni mato bilan "yamash":
   - to'rtburchak 3 px kengaytiriladi — gerb atrofidagi 2 px JPEG/antialias "halo"si ham qolmaydi;
   - shortik matosi rangi — to'rtburchak atrofidagi (10 px halqa) eng ko'p uchraydigan rang;
   - har qatorda chap va o'ng namuna (±4 px tashqarida, 3 px o'rtacha) faqat shu matoga yaqin piksellardan
     (|ΔR| + |ΔG| + |ΔB| ≤ 55): yon lampas, kesik, maneken va fon olinmaydi; ikkala tomon yo'q bo'lsa — mato rangi;
   - oraliq chiziqli RGB interpolyatsiya va ±2 deterministik don. Asl ImageData o'zgarmaydi, nusxa qaytariladi. */
const HEAL_PAD = 3;
const HEAL_TOL = 55;
export function healFabricPatch(img, rawBox) {
  const out = { data: new Uint8ClampedArray(img.data), width: img.width, height: img.height };
  const box = {
    x0: Math.max(0, rawBox.x0 - HEAL_PAD),
    y0: Math.max(0, rawBox.y0 - HEAL_PAD),
    x1: Math.min(img.width - 1, rawBox.x1 + HEAL_PAD),
    y1: Math.min(img.height - 1, rawBox.y1 + HEAL_PAD),
  };
  const rgb = (x, y) => { const i = (y * img.width + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2]]; };
  const modes = new Map();
  for (let y = Math.max(0, box.y0 - 10); y <= Math.min(img.height - 1, box.y1 + 10); y += 1) {
    for (let x = Math.max(0, box.x0 - 10); x <= Math.min(img.width - 1, box.x1 + 10); x += 1) {
      if (x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1) continue;
      if (pixelKind(img, x, y) <= GREY) continue;
      const c = rgb(x, y);
      const key = ((c[0] >> 5) << 6) | ((c[1] >> 5) << 3) | (c[2] >> 5);
      const e = modes.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      e.n += 1; e.r += c[0]; e.g += c[1]; e.b += c[2];
      modes.set(key, e);
    }
  }
  if (!modes.size) return out;
  const top = [...modes.values()].reduce((m, e) => (e.n > m.n ? e : m));
  const fabric = [top.r / top.n, top.g / top.n, top.b / top.n];
  const near = (c) => Math.abs(c[0] - fabric[0]) + Math.abs(c[1] - fabric[1]) + Math.abs(c[2] - fabric[2]) <= HEAL_TOL;
  const sample = (x, y) => {
    const acc = [0, 0, 0];
    let n = 0;
    for (let d = -1; d <= 1; d += 1) {
      const xx = x + d;
      if (xx < 0 || xx >= img.width || pixelKind(img, xx, y) <= GREY) continue;
      const c = rgb(xx, y);
      if (!near(c)) continue;
      acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
      n += 1;
    }
    return n ? acc.map((v) => v / n) : null;
  };
  for (let y = box.y0; y <= box.y1; y += 1) {
    const left = sample(box.x0 - 4, y);
    const right = sample(box.x1 + 4, y);
    const a = left ?? right ?? fabric;
    const b = right ?? left ?? fabric;
    for (let x = box.x0; x <= box.x1; x += 1) {
      const t = box.x1 > box.x0 ? (x - box.x0) / (box.x1 - box.x0) : 0.5;
      const grain = ((((x * 73856093) ^ (y * 19349663)) >>> 0) % 5) - 2;
      const i = (y * img.width + x) * 4;
      for (let c = 0; c < 3; c += 1) out.data[i + c] = a[c] + (b[c] - a[c]) * t + grain;
    }
  }
  return out;
}

/* Bosma joylari (y — harflar pastki chizig'i, size — bosh harflar balandligi, scale allaqachon hisobga olingan):
   orqa (135°/180°/225°) — ism va katta raqam tana sirti bo'ylab; tana kesimi ellips: a — yarim kenglik (180° kadridan),
   b — chuqurlik, theta — kadr burilishi (kadrlar 45° qadam bilan);
   oldi (0°/45°/315°) — shortik raqami oyoq silindri bo'ylab, t0 — oyoq oldidan biroz tashqariga. */
export const BACK_FRAMES = { 3: Math.PI / 4, 4: 0, 5: -Math.PI / 4 };
export const FRONT_FRAMES = { 0: 0, 1: -Math.PI / 4, 7: Math.PI / 4 };
const TORSO_DEPTH = 0.6;
// Oyoq kesimi — oldidan orqaga yassiroq ellips; t0 — raqam oyoq oldidan ozgina tashqariga (0°/45°/315° kadrlarda tekshirilgan)
const LEG_DEPTH = 0.58;
const LEG_T0 = 0.06;
// Futbolka pastki cheti — shortik raqamining tepasi bundan yuqoriga chiqmaydi
const SHORTS_TOP = 424;

// Ellips proyeksiyasining yarim kengligi
export const projectedHalf = ({ a, b, theta }) => Math.hypot(a * Math.cos(theta), b * Math.sin(theta));

export function printLayout(frame, img, backImg, scale = 1) {
  if (frame in FRONT_FRAMES) {
    const theta = FRONT_FRAMES[frame];
    const straight = backImg && measureTorso(backImg);
    // Oyoq radiusi ≈ 0.64 × tana yarim kengligi (10 jamoaning 0° kadrlari medianasi)
    const leg = measureShorts(img, straight ? straight.half * 0.64 : null, theta);
    if (!leg) return [];
    const a = leg.half / Math.hypot(Math.cos(theta), LEG_DEPTH * Math.sin(theta));
    const base = Math.round(a * 0.5);
    const size = Math.round(base * scale);
    // Silindr markazi raqamning o'z qatoridagi o'ng chetdan: cx = edge(yPrint) − half
    const surfaceAt = (y) => ({ mid: leg.edge(y - size / 2) - leg.half, a, b: a * LEG_DEPTH, theta, t0: LEG_T0 });
    const centerX = (s) => s.mid + s.a * Math.sin(s.t0) * Math.cos(theta) + s.b * Math.cos(s.t0) * Math.sin(theta);
    // Odatiy joy — pastki chetdan 1.5 raqam balandligida; ostida brend logotipi bo'lsa, undan 6 px yuqoriga ko'tariladi
    let y = leg.hem - Math.round(base * 1.5);
    const cx = centerX(surfaceAt(y));
    const logo = logoTop(img, cx - size * 0.65, cx + size * 0.65, leg.hem - 34, leg.hem - 6);
    if (logo !== null) y = Math.min(y, logo - 6);
    y = Math.max(y, SHORTS_TOP + size);
    return [{ text: 'number', shorts: true, surface: surfaceAt(y), track: 0, size, maxW: a * 1.1, y }];
  }
  if (!(frame in BACK_FRAMES)) return [];
  const theta = BACK_FRAMES[frame];
  const straight = frame === 4 ? measureTorso(img) : (backImg && measureTorso(backImg));
  let surface;
  if (straight) {
    const a = straight.half;
    surface = { mid: straight.mid, a, b: a * TORSO_DEPTH, theta };
    if (frame !== 4) surface.mid = fitTorso(img, projectedHalf(surface)) ?? measureTorso(img)?.mid ?? straight.mid;
  } else {
    // 180° kadr hali yuklanmagan yoki xato — joriy kadrning o'zidan (taxminan)
    const torso = measureTorso(img);
    if (!torso) return [];
    const a = torso.half / Math.hypot(Math.cos(theta), TORSO_DEPTH * Math.sin(theta));
    surface = { mid: torso.mid, a, b: a * TORSO_DEPTH, theta };
  }
  const { a, b } = surface;
  // Kadrlar bir xil tekislangan — burilgan kadrda yoqa 180° dagidan uzoq bo'lolmaydi (chiziq/soya xato bersa, o'shani olamiz)
  const straightCollar = straight && frame !== 4 ? collarAt(backImg, straight.mid) : null;
  let collar = collarAt(img, surface.mid + b * Math.sin(theta)) ?? straightCollar ?? 150;
  if (straightCollar && Math.abs(collar - straightCollar) > 15) collar = straightCollar;

  const nameSize = Math.round(a * 0.23 * scale);
  // Yoqa chizig'idan ~0.8a pastda: qalin yoqali (en) formalarda ham ism yoqa tasmasiga tegmaydi
  const nameY = collar + Math.round(a * 0.8);
  const numberSize = Math.round(a * 0.95 * scale);
  // Raqam tepasi ism pastidan (kirill harflarining pastki chiqiqlari bilan, ~0.3 bosh harf) kamida gap px pastda
  // (qalin klub konturi — rm, psg — ham 120% da Қ/Щ chiqiqlariga tegmasin)
  const gap = Math.round(a * 0.16);
  const numberY = Math.max(collar + Math.round(a * 2.1), nameY + Math.ceil(nameSize * 0.3) + gap + numberSize);
  // Ism kurak balandligida, raqam orqa o'rtasida — u yerda tana o'lchov qatoridan (y = 300) ~15% va ~10% kengroq (yengsiz);
  // aks holda burilgan kadrda harflar uchi ellips chetida kesilib qoladi
  const widen = (k) => ({ ...surface, a: a * k, b: b * k });
  return [
    { text: 'name', surface: widen(1.15), track: 2, size: nameSize, maxW: a * 1.45, y: nameY },
    { text: 'number', surface: widen(1.1), track: 0, size: numberSize, maxW: a * 1.35, y: numberY, gap },
  ];
}

/* Neyroset ba'zi kadrlarda klub gerbini raqamli (chap) oyoqqa ham chizgan: 45° (fr, en, mci — ko'zgu kabi) va 90° yon
   ko'rinish (en, mu, ar, rm, fr, mci). Raqam yozilganda bu nishon mato bilan yamaladi (healFabricPatch), oyoqlar esa
   almashtirilmaydi. 45° da: chap oyoqdagi raqam joyi o'ngdagidan ancha tinch bo'lsa — gerb o'ng oyoqda. */
export function crestToHeal(frame, img, backImg) {
  // Faqat 45°: 90° da raqam chizilmaydi, u yerdagi gerb/logotipga tegish shart emas
  if (frame !== 1) return null;
  const theta = FRONT_FRAMES[1];
  const straight = backImg && measureTorso(backImg);
  const leg = measureShorts(img, straight ? straight.half * 0.64 : null, theta);
  const [zone] = printLayout(1, img, backImg);
  if (!leg || !zone) return null;
  const right = zone.surface.mid;
  const low = runsAt(img, leg.hem - 14, 150, 450, 6, 20).shift();
  if (!low) return null;
  const left = low[0] + leg.half;
  if (left >= right - leg.half) return null;
  // Gerb o'z joyida (chap oyoqda) bo'lsa — o'ngdagi topilma brend logotipi, tegilmaydi; chap oyoq toza bo'lsa — gerb
  // o'ngga ko'zgudek chizilgan (fr, en, mci). Chap oyoqdagi gerb 45° da chetdan, yonidan ko'rinadi (6–10 px eni).
  if (findBadge(img, low[0], left + leg.half * 0.9, WAIST_Y, leg.hem - 4, { minSide: 6, profile: true })) return null;
  const y = Math.round((WAIST_Y + leg.hem) / 2);
  const box = findBadge(img, right - leg.half * 0.9, leg.edge(y) - 1, WAIST_Y, leg.hem - 4);
  // Klub gerbi: kengaytirilmagan balandligi ≥ 22 px, markazi pastki chetdagi logotip qatoridan yuqorida, ≥ 5 % rangli
  // piksel — oq/qora Adidas va Nike (mu, ar, psg 45°) bu shartlardan o'tmaydi
  if (!box || box.offH < 22 || (box.y0 + box.y1) / 2 > leg.hem - 23 || box.chroma < 0.05) return null;
  return box;
}

/* 45° kadrda ko'zgudek chizilgan gerbni yamagan nusxa (ImageData ko'rinishida) yoki null — yamash kerak emas.
   Joylashuv (logoTop) ham shu nusxa bo'yicha o'lchanadi: o'chirilgan gerbni logotip deb raqamni yuqoriga ko'tarmaydi. */
export function healedPixels(frame, img, backImg) {
  const box = crestToHeal(frame, img, backImg);
  return box ? healFabricPatch(img, box) : null;
}

/* Kiyim maskasi (0..255, kadr o'lchamida):
   - tashqi studiya foni — CROP perimetridan 4 tomonga to'ldirish (flood fill) fonga o'xshash piksellar bo'ylab; qo'shni
     piksellar orasidagi yorqinlik sakrashi ≤ 4 (studiya foni silliq) — soyadagi oq mato (rm 45°: 185–200, fon 190)
     fonga o'xshasa ham, oyoqlar orasidagi tirqishdan siluet chetidagi o'tish orqali ichkariga oqib kirmaydi;
   - maneken (qo'l, bo'yin, son, 45°/315° da shortik ustiga osilgan barmoqlar) — 10 px dan keng neytral kulrang
     (yorqinlik < 150) bo'laklar;
   - chegarada 1 px [1, 2, 1]/4 yumshatish — kesilgan harf cheti ham silliq qoladi. */
const MANNEQUIN_RUN = 10;
const BG_TOL = 12;
const BG_STEP = 4;
const BG_SAT = 4;
export function garmentMask(img) {
  const { width: w, height: h } = img;
  const L = new Float32Array(w * h);
  const S = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p += 1) {
    const r = img.data[p * 4];
    const g = img.data[p * 4 + 1];
    const b = img.data[p * 4 + 2];
    L[p] = 0.299 * r + 0.587 * g + 0.114 * b;
    S[p] = Math.max(r, g, b) - Math.min(r, g, b);
  }
  const rows = Array.from({ length: h }, (_, y) => backgroundRow(img, y));
  // Fon neytral (s ≤ 4); soyadagi oq mato yorqinlikda fonga teng bo'lsa ham ozgina tusli (s ≥ 5) — unga oqib o'tilmaydi
  const bgLike = (p) => S[p] <= BG_SAT && Math.abs(L[p] - rows[(p / w) | 0](p % w)) <= BG_TOL;

  const hard = new Uint8Array(w * h).fill(255);
  const x0 = CROP.x;
  const x1 = Math.min(w, CROP.x + CROP.w) - 1;
  const y0 = CROP.y;
  const y1 = Math.min(h, CROP.y + CROP.h) - 1;
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const seed = (p) => {
    if (hard[p] && bgLike(p)) { hard[p] = 0; queue[tail++] = p; }
  };
  for (let x = x0; x <= x1; x += 1) { seed(y0 * w + x); seed(y1 * w + x); }
  for (let y = y0; y <= y1; y += 1) { seed(y * w + x0); seed(y * w + x1); }
  while (head < tail) {
    const p = queue[head++];
    const x = p % w;
    const y = (p / w) | 0;
    for (const q of [x > x0 ? p - 1 : -1, x < x1 ? p + 1 : -1, y > y0 ? p - w : -1, y < y1 ? p + w : -1]) {
      if (q >= 0 && hard[q] && Math.abs(L[q] - L[p]) <= BG_STEP && bgLike(q)) { hard[q] = 0; queue[tail++] = q; }
    }
  }
  // Kadr hoshiyasi (CROP tashqarisi) ekranga chiqmaydi — fon deb belgilanadi
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) if (x < x0 || x > x1 || y < y0 || y > y1) hard[y * w + x] = 0;
  }
  for (let y = 0; y < h; y += 1) {
    const bg = rows[y];
    let start = -1;
    for (let x = 0; x <= w; x += 1) {
      // soyadagi oq mato ham neytral kulrang, lekin yorug'roq (150–204); maneken plastigi qorong'iroq
      const grey = x < w && L[y * w + x] < MANNEQUIN_L && pixelKind(img, x, y, bg) === GREY;
      if (grey && start < 0) start = x;
      if (!grey && start >= 0) {
        if (x - start >= MANNEQUIN_RUN) hard.fill(0, y * w + start, y * w + x);
        start = -1;
      }
    }
  }
  // Ajraluvchi [1, 2, 1]/4 yumshatish: avval gorizontal, keyin vertikal
  const tmp = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      tmp[p] = (hard[x > 0 ? p - 1 : p] + 2 * hard[p] + hard[x < w - 1 ? p + 1 : p]) / 4;
    }
  }
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      mask[p] = Math.round((tmp[y > 0 ? p - w : p] + 2 * tmp[p] + tmp[y < h - 1 ? p + w : p]) / 4);
    }
  }
  return mask;
}
