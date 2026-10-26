import * as THREE from 'three';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import fontData from './sairaFont.json';

/**
 * Formaning 3D modeli (three.js) — GL'dan mustaqil: sahna, kamera va yangilash. Testda Node'da ham quriladi.
 *
 * Tana — LatheGeometry (aylanish jismi) old-orqa tomonga siqilgan; yenglar — konussimon silindr va yelka
 * qopqog'i; yoqa va manjetlar — torus. Ism/raqam SVG emas, shrift konturlaridan (Saira, 2D bilan bir xil)
 * yassi geometriya yasalib, maydalanadi va tana sirtiga "o'raladi" — matn mato bilan birga egiladi.
 * Mato: tashqi yorug'likka mos MeshStandardMaterial + to'qima (pike) normal xaritasi (DataTexture,
 * canvas kerak emas). Soyalar xaritasi, render-target va shaffof materiallar yo'q — telefonda arzon.
 */

// Tana profili: [radius, balandlik] — pastki etakdan bo'yingacha
const PROFILE = [
  [0.6, -1.15],
  [0.6, -0.95],
  [0.61, -0.55],
  [0.635, -0.1],
  [0.66, 0.3],
  [0.665, 0.5],
  [0.64, 0.65],
  [0.56, 0.77],
  [0.43, 0.87],
  [0.32, 0.93],
  [0.285, 0.955],
];
/** Old-orqa siqilish (ko'ndalang kesim — ellips) */
export const DEPTH = 0.5;
const NECK_Y = 0.955;
const SHOULDER = { x: 0.47, y: 0.66 };
const SLEEVE = { length: 0.6, rTop: 0.24, rBottom: 0.195, angle: (52 * Math.PI) / 180, depth: 0.78 };

const FONT = new Font(fontData);
const RES = fontData.resolution;
// Bosh harf balandligi (shrift birligida) — matn o'lchami "H" balandligi bo'yicha beriladi
const CAP = (() => {
  const nums = fontData.glyphs.H.o.split(' ').filter((v) => /^-?\d+$/.test(v)).map(Number);
  return Math.max(...nums.filter((_, i) => i % 2 === 1));
})();

/** Tana radiusi berilgan balandlikda (profil bo'yicha chiziqli) */
export function radiusAt(y) {
  if (y <= PROFILE[0][1]) return PROFILE[0][0];
  for (let i = 1; i < PROFILE.length; i++) {
    const [r1, y1] = PROFILE[i];
    if (y <= y1) {
      const [r0, y0] = PROFILE[i - 1];
      return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
    }
  }
  return PROFILE[PROFILE.length - 1][0];
}

/** Matnni 3D shrift chiza oladimi (kirill va boshqa belgilar yo'q — 2D zaxira ko'rinish ishlatiladi) */
export function hasGlyphs(text) {
  return [...String(text || '')].every((ch) => ch === ' ' || Boolean(fontData.glyphs[ch]));
}

// ─── Mato teksturasi ────────────────────────────────────────────────────────

/** Pike to'qimasi uchun normal xarita: kichik bo'rtiqlar, har qatorda yarim qadam siljigan */
export function knitNormalMap(size = 64, cells = 8) {
  const data = new Uint8Array(size * size * 4);
  const cell = size / cells;
  const height = (x, y) => {
    const row = Math.floor((((y % size) + size) % size) / cell);
    const shift = row % 2 ? cell / 2 : 0;
    const u = ((((x + shift) % cell) + cell) % cell) / cell;
    const v = ((((y % cell) + cell) % cell)) / cell;
    return Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = height(x - 1, y) - height(x + 1, y);
      const ny = height(x, y - 1) - height(x, y + 1);
      const nz = 0.9;
      const len = Math.hypot(nx, ny, nz);
      const i = (y * size + x) * 4;
      data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

/** Yerdagi yumshoq soya (radial shaffoflik) */
function shadowTexture(size = 64) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x / size - 0.5, y / size - 0.5) * 2;
      const i = (y * size + x) * 4;
      data[i + 3] = Math.max(0, 1 - d) ** 1.6 * 150;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

// ─── Matn ───────────────────────────────────────────────────────────────────

/**
 * Matn geometriyasi: (0,0) markazda, balandligi `cap` (bosh harf), kengligi `maxWidth` dan oshmaydi.
 * spacing — harflar orasi (cap ulushida), italic — qiyalik.
 */
export function textGeometry(text, { cap, maxWidth = Infinity, spacing = 0, italic = false, maxEdge }) {
  const chars = [...String(text || '')];
  const size = (cap * RES) / CAP;
  const parts = [];
  let x = 0;
  for (const ch of chars) {
    const glyph = fontData.glyphs[ch] || fontData.glyphs['?'];
    if (ch !== ' ') {
      const g = new THREE.ShapeGeometry(FONT.generateShapes(ch, size), 3);
      g.translate(x, 0, 0);
      parts.push(g);
    }
    x += (glyph.ha / RES) * size + spacing * cap;
  }
  if (!parts.length) return null;
  let geo = mergeGeometries(parts.map((g) => g.toNonIndexed()));
  parts.forEach((g) => g.dispose());
  if (italic) geo.applyMatrix4(new THREE.Matrix4().makeShear(0, 0, 0.2, 0, 0, 0));
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  geo.translate(-(box.min.x + box.max.x) / 2, -cap / 2, 0);
  const width = box.max.x - box.min.x;
  if (width > maxWidth) geo.scale(maxWidth / width, 1, 1);
  // Uzun uchburchaklar egilganda sirt ichiga botmasin — mayda bo'laklarga bo'linadi
  geo = new TessellateModifier(maxEdge ?? cap / 5, 6).modify(geo);
  return geo;
}

/** Yassi geometriyani tana sirtiga o'raydi: x — yoy uzunligi, y — balandlik. side: 'front' | 'back' */
export function wrapOnTorso(geo, { side = 'front', x = 0, y = 0, lift = 0.012 }) {
  const pos = geo.attributes.position;
  const s = side === 'back' ? -1 : 1;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i) + x;
    const py = pos.getY(i) + y;
    const a = radiusAt(py) * (1 + lift);
    const theta = px / a;
    pos.setXYZ(i, s * a * Math.sin(theta), py, s * a * DEPTH * Math.cos(theta));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

// ─── Model ──────────────────────────────────────────────────────────────────

const FONT_STYLE = {
  sport: { italic: true, spacing: -0.02 },
  klassik: { italic: false, spacing: 0.1 },
  oddiy: { italic: false, spacing: 0.02 },
};

/** Studiya shrift uslubi ({ fontStyle, letterSpacing }) → 3D matn sozlamasi */
export function fontOptions(textStyle) {
  if (!textStyle) return FONT_STYLE.klassik;
  if (textStyle.fontStyle === 'italic') return FONT_STYLE.sport;
  if (textStyle.fontWeight === '600') return FONT_STYLE.oddiy;
  return { italic: false, spacing: Math.max(-0.05, Math.min(0.2, (textStyle.letterSpacing ?? 2) / 20)) };
}

function shieldShape(w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, h / 2);
  s.lineTo(w / 2, h / 2);
  s.lineTo(w / 2, -h * 0.05);
  s.quadraticCurveTo(w / 2, -h * 0.35, 0, -h / 2);
  s.quadraticCurveTo(-w / 2, -h * 0.35, -w / 2, -h * 0.05);
  s.closePath();
  return s;
}

function starShape(r) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    if (i === 0) s.moveTo(rr * Math.cos(a), rr * Math.sin(a));
    else s.lineTo(rr * Math.cos(a), rr * Math.sin(a));
  }
  s.closePath();
  return s;
}

/** Normallashtirilgan ko'rinish holati — o'zgarishlarni solishtirish uchun */
export function normalizeOptions(o = {}) {
  const kit = o.kit || {};
  return {
    color: kit.color || '#1A3582',
    ink: kit.ink || '#F3F5F9',
    trim: kit.trim || kit.ink || '#F3F5F9',
    grad: Array.isArray(kit.grad) && kit.grad.length > 1 ? kit.grad : null,
    glow: Boolean(kit.glow),
    crest: String(kit.crest || '').slice(0, 3).toUpperCase(),
    patches: kit.patches || [],
    font: fontOptions(kit.textStyle),
    name: String(o.name || '').trim().toUpperCase(),
    number: String(o.number || '').trim(),
  };
}

const textKey = (s) => JSON.stringify([s.name, s.number, s.crest, s.patches, s.font, s.glow]);

/**
 * Sahna: { scene, camera, root, update(opts), setAspect(aspect), dispose() }.
 * root.rotation.y — aylantirish (0 — old, π — orqa).
 */
export function createJerseyScene({ background = '#0E1A3F', ...opts } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);

  const camera = new THREE.PerspectiveCamera(27, 1, 0.1, 50);
  camera.position.set(0, 0.15, 6.2);
  camera.lookAt(0, -0.08, 0);

  // Yorug'lik dunyoga bog'langan — forma aylanganda soya-yorug' mato bo'ylab "yuradi"
  scene.add(new THREE.HemisphereLight(0xe6ebff, 0x1b2142, 1.25));
  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(2.6, 3.2, 4.2);
  const rim = new THREE.DirectionalLight(0x9db8ff, 1.5);
  rim.position.set(-3.2, 1.8, -3.6);
  const fill = new THREE.DirectionalLight(0xffe3bd, 0.55);
  fill.position.set(-3, -1.2, 2.4);
  scene.add(key, rim, fill);

  const root = new THREE.Group();
  root.position.y = 0.05;
  scene.add(root);

  const knit = knitNormalMap();
  const torsoKnit = knit.clone();
  torsoKnit.repeat.set(30, 22);
  torsoKnit.needsUpdate = true;
  const sleeveKnit = knit.clone();
  sleeveKnit.repeat.set(12, 6);
  sleeveKnit.needsUpdate = true;

  const fabric = (map) =>
    new THREE.MeshStandardMaterial({ roughness: 0.8, metalness: 0, normalMap: map, normalScale: new THREE.Vector2(0.45, 0.45) });
  const bodyMat = fabric(torsoKnit);
  const sleeveMat = fabric(sleeveKnit);
  const innerMat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, side: THREE.BackSide });
  const trimMat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0 });

  // Tana (tashqi va ichki qatlam — bo'yin/etakdan ichi qorong'iroq ko'rinadi)
  const lathe = new THREE.LatheGeometry(PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 64);
  lathe.scale(1, 1, DEPTH);
  const body = new THREE.Mesh(lathe, bodyMat);
  const inner = new THREE.Mesh(lathe, innerMat);
  root.add(body, inner);

  // Yoqa va etak
  const collar = new THREE.Mesh(new THREE.TorusGeometry(radiusAt(NECK_Y), 0.034, 10, 48), trimMat);
  collar.rotation.x = Math.PI / 2;
  collar.scale.set(1, DEPTH, 1);
  collar.position.y = NECK_Y - 0.01;
  const hem = new THREE.Mesh(new THREE.TorusGeometry(radiusAt(-1.15), 0.016, 6, 64), trimMat);
  hem.rotation.x = Math.PI / 2;
  hem.scale.set(1, DEPTH, 1);
  hem.position.y = -1.14;
  root.add(collar, hem);

  // Yenglar: yelka qopqog'i + konussimon yeng + manjet
  const sleeves = [1, -1].map((dir) => {
    const g = new THREE.Group();
    g.position.set(dir * SHOULDER.x, SHOULDER.y, 0);
    g.rotation.z = dir * SLEEVE.angle;
    g.scale.z = SLEEVE.depth;
    const tube = new THREE.CylinderGeometry(SLEEVE.rTop, SLEEVE.rBottom, SLEEVE.length, 32, 6, true);
    tube.translate(0, -SLEEVE.length / 2, 0);
    const cap = new THREE.SphereGeometry(SLEEVE.rTop, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(SLEEVE.rBottom, 0.026, 8, 36), trimMat);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -SLEEVE.length;
    g.add(new THREE.Mesh(tube, sleeveMat), new THREE.Mesh(tube, innerMat), new THREE.Mesh(cap, sleeveMat), cuff);
    root.add(g);
    return g;
  });

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 0.55),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.3;
  scene.add(shadow);

  // Yozuvlar (ism, raqam, gerb, yamoqlar) — matn o'zgarsa qayta quriladi
  const decor = new THREE.Group();
  root.add(decor);
  const inkMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.05, polygonOffset: true, polygonOffsetFactor: -2 });
  const haloMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
  const badgeMat = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2 });
  const badgeInkMat = new THREE.MeshStandardMaterial({ roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -4 });
  const goldMat = new THREE.MeshStandardMaterial({ color: '#F2A33A', roughness: 0.45, metalness: 0.3, polygonOffset: true, polygonOffsetFactor: -2 });
  const flagMats = ['#19A7A1', '#F3F5F9', '#4CAF6A'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }));

  let state = null;
  let builtKey = null;

  const clearDecor = () => {
    decor.children.slice().forEach((child) => {
      child.geometry?.dispose();
      decor.remove(child);
    });
    sleeves.forEach((g) => g.children.filter((c) => c.userData.patch).forEach((c) => {
      c.geometry.dispose();
      g.remove(c);
    }));
  };

  const addText = (text, opts, place, mat = inkMat) => {
    const geo = textGeometry(text, opts);
    if (!geo) return;
    wrapOnTorso(geo, place);
    decor.add(new THREE.Mesh(geo, mat));
    if (mat === inkMat && state.glow) {
      const halo = wrapOnTorso(textGeometry(text, { ...opts, cap: opts.cap * 1.12, maxWidth: opts.maxWidth * 1.08 }), { ...place, lift: (place.lift ?? 0.012) - 0.003 });
      decor.add(new THREE.Mesh(halo, haloMat));
    }
  };

  const buildDecor = (s) => {
    clearDecor();
    const f = s.font;
    // Orqa: ism yelkalar ostida, katta raqam markazda
    if (s.name) addText(s.name, { cap: 0.13, maxWidth: 0.95, ...f }, { side: 'back', y: 0.5 });
    if (s.number) {
      addText(s.number, { cap: 0.64, maxWidth: 0.82, ...f, spacing: f.spacing / 2 }, { side: 'back', y: -0.08 });
      // Old: ko'krakning o'ng tomonida kichik raqam
      addText(s.number, { cap: 0.17, maxWidth: 0.3, ...f }, { side: 'front', x: 0.27, y: 0.4 });
    }
    // Gerb (klub kodi) — chap ko'krakda qalqon
    if (s.crest) {
      const shield = new THREE.ShapeGeometry(shieldShape(0.17, 0.2), 4);
      decor.add(new THREE.Mesh(wrapOnTorso(new TessellateModifier(0.03, 6).modify(shield.toNonIndexed()), { side: 'front', x: -0.27, y: 0.41 }), badgeMat));
      shield.dispose();
      addText(s.crest, { cap: 0.045, maxWidth: 0.13, spacing: 0.05, maxEdge: 0.02 }, { side: 'front', x: -0.27, y: 0.425, lift: 0.02 }, badgeInkMat);
    }
    if (s.patches.includes('star')) {
      [-0.33, -0.27, -0.21].forEach((x) => {
        const star = new THREE.ShapeGeometry(starShape(0.026), 2);
        decor.add(new THREE.Mesh(wrapOnTorso(star.toNonIndexed(), { side: 'front', x, y: 0.57 }), goldMat));
        star.dispose();
      });
    }
    // Kapitan bog'ichi — chap yengda (kiyuvchiga nisbatan; old tomondan o'ngda)
    if (s.patches.includes('cap')) {
      const r = (SLEEVE.rTop + SLEEVE.rBottom) / 2 + 0.008;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.97, 0.11, 32, 1, true), goldMat);
      band.position.y = -SLEEVE.length * 0.5;
      band.userData.patch = true;
      sleeves[0].add(band);
    }
    // Bayroq — o'ng yengning old tomonida
    if (s.patches.includes('flag')) {
      const r = SLEEVE.rTop - (SLEEVE.rTop - SLEEVE.rBottom) * 0.35 + 0.006;
      [0.024, 0, -0.024].forEach((dy, i) => {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.022), flagMats[i]);
        stripe.position.set(0, -SLEEVE.length * 0.35 + dy, r);
        stripe.userData.patch = true;
        sleeves[1].add(stripe);
      });
    }
  };

  const applyColors = (s) => {
    const base = new THREE.Color(s.grad ? s.grad[0] : s.color);
    if (s.grad) {
      // Gradient — tepadan pastga vertex ranglari bilan
      const from = new THREE.Color(s.grad[0]);
      const to = new THREE.Color(s.grad[s.grad.length - 1]);
      const pos = lathe.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      const c = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const t = THREE.MathUtils.clamp((pos.getX(i) * 0.5 - pos.getY(i) + 1.1) / 2.2, 0, 1);
        c.copy(from).lerp(to, t);
        colors.set([c.r, c.g, c.b], i * 3);
      }
      lathe.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      bodyMat.vertexColors = true;
      bodyMat.color.set('#FFFFFF');
      sleeveMat.color.copy(from).lerp(to, 0.25);
    } else {
      if (lathe.getAttribute('color')) lathe.deleteAttribute('color');
      bodyMat.vertexColors = false;
      bodyMat.color.copy(base);
      sleeveMat.color.copy(base);
    }
    bodyMat.needsUpdate = true;
    innerMat.color.copy(base).multiplyScalar(0.45);
    trimMat.color.set(s.trim);
    inkMat.color.set(s.ink);
    inkMat.emissive.set(s.glow ? s.ink : '#000000');
    inkMat.emissiveIntensity = s.glow ? 0.85 : 0;
    haloMat.color.set(s.ink);
    badgeMat.color.set(s.trim);
    badgeInkMat.color.set(base);
  };

  const update = (next) => {
    const s = normalizeOptions(next);
    applyColors(s);
    state = s;
    const k = textKey(s);
    if (k !== builtKey) {
      buildDecor(s);
      builtKey = k;
    }
  };

  update(opts);

  return {
    scene,
    camera,
    root,
    update,
    setAspect(aspect) {
      camera.aspect = aspect;
      // Tor ekranda forma kesilmasin — gorizontal ko'rinish yetmasa kamera uzoqlashadi
      camera.position.z = aspect < 0.82 ? 6.2 * (0.82 / aspect) : 6.2;
      camera.updateProjectionMatrix();
    },
    dispose() {
      clearDecor();
      scene.traverse((obj) => {
        obj.geometry?.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
        mats.forEach((m) => {
          m.map?.dispose();
          m.normalMap?.dispose();
          m.dispose();
        });
      });
      [knit, inkMat, haloMat, badgeMat, badgeInkMat, goldMat, ...flagMats].forEach((x) => x.dispose());
    },
  };
}
