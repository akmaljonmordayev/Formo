import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { normalizeDesign, normalizePrint } from './design.js';
import { buildKit } from './geometry.js';
import { drawKitTextures, drawKnitBump, drawRibBump } from './textures.js';
import { loadKitFonts } from './fonts.js';

/**
 * Studiya sahnasi (reference/forma-3d.html): yumshoq yorug'lik, soyalar, trikotaj relyefi, avtomatik aylanish,
 * "Old/Orqa" burilishi. Kadr faqat nimadir o'zgarganda chiziladi — tinch turganda GPU ishlamaydi.
 *
 * three r128 → r186: rang fazosi `colorSpace`, PCFSoft o'rniga PCF + radius, chiroqlar kuchi ×π
 * (eski "legacy lights" yorug'ligini saqlash uchun).
 */

export { STUDIO_BACKGROUND } from './scene-background.js';

const PI = Math.PI;
const PRINT_KEYS = ['backName', 'number', 'glow', 'patch'];

function studioEnvironment(renderer, scene) {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 256;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#d9dcff');
  g.addColorStop(0.45, '#4a4580');
  g.addColorStop(1, '#0a0812');
  c.fillStyle = g;
  c.fillRect(0, 0, 512, 256);
  c.fillStyle = 'rgba(80,220,255,0.6)';
  c.fillRect(330, 60, 70, 70);
  c.fillStyle = 'rgba(190,110,255,0.6)';
  c.fillRect(90, 80, 70, 60);
  const tex = new THREE.CanvasTexture(cv);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(tex).texture;
  pm.dispose();
  tex.dispose();
  scene.environment = env;
  return env;
}

function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xc2c8ff, 0x160d24, 0.35 * PI));
  const key = new THREE.DirectionalLight(0xfff6ee, 1.35 * PI);
  key.position.set(-2.2, 3.2, 4.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -1.8, right: 1.8, top: 1.8, bottom: -1.8, near: 0.5, far: 12 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 4;
  scene.add(key);
  // "Studiya" foni uchun kontr-chiroqlar
  const rimA = new THREE.DirectionalLight(0xdfe6ff, 0.9 * PI);
  rimA.position.set(3.5, 1.6, -3);
  const rimB = new THREE.DirectionalLight(0xfff0e2, 0.7 * PI);
  rimB.position.set(-3.6, 0.6, -2.6);
  scene.add(rimA, rimB);
}

function contactShadow() {
  const sc = document.createElement('canvas');
  sc.width = 256;
  sc.height = 256;
  const ctx = sc.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(0,0,0,0.6)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.9),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -PI / 2;
  mesh.position.y = -1.45;
  return mesh;
}

/** Rasmlar (nishon/homiy) URL bo'yicha bir marta yuklanadi; CORS — snapshot "iflos" bo'lmasligi uchun */
function imageCache(onLoad) {
  const cache = new Map();
  return (url) => {
    if (!url) return null;
    const hit = cache.get(url);
    if (hit) return hit.img;
    const entry = { img: null };
    cache.set(url, entry);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      entry.img = img;
      onLoad();
    };
    img.src = url;
    return null;
  };
}

/**
 * @param {HTMLElement} container o'lchami bor element (canvas uning ichiga joylanadi)
 * @param {{ design?: object, backName?: string, number?: string|number, glow?: boolean, patch?: string|null,
 *   view?: 'front'|'back',
 *   autoRotate?: boolean, textureSize?: number, debounceMs?: number, maxPixelRatio?: number,
 *   shadows?: boolean, onViewChange?: (view: 'front'|'back') => void }} [opts]
 */
export function createKitScene(container, opts = {}) {
  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const textureSize = opts.textureSize || 2048;
  const debounceMs = opts.debounceMs ?? 60;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.maxPixelRatio ?? 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = opts.shadows !== false;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const canvas = renderer.domElement;
  Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%', touchAction: 'none', cursor: 'grab' });
  container.prepend(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(1.1, 0.45, 5.4);
  const env = studioEnvironment(renderer, scene);
  addLights(scene);

  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const knit = new THREE.CanvasTexture(drawKnitBump());
  knit.wrapS = knit.wrapT = THREE.RepeatWrapping;
  knit.repeat.set(34, 34);
  const rib = new THREE.CanvasTexture(drawRibBump());
  rib.wrapS = rib.wrapT = THREE.RepeatWrapping;
  rib.repeat.set(60, 1);

  let design = normalizeDesign(opts.design);
  let print = normalizePrint(opts);
  const kit = buildKit(design);
  const mats = kit.materials;
  mats.front.bumpMap = knit;
  mats.back.bumpMap = knit;
  mats.inside.bumpMap = knit;
  mats.rib.bumpMap = rib;
  scene.add(kit.group);

  const floor = contactShadow();
  scene.add(floor);

  let frontTex = null;
  let backTex = null;
  let dirty = true;
  const getImage = imageCache(() => scheduleDraw(0));

  function drawTextures() {
    const { front, back } = drawKitTextures(design, print, {
      size: textureSize,
      images: { crest: getImage(design.crestImageUrl), sponsor: getImage(design.sponsorImageUrl) },
    });
    if (!frontTex) {
      frontTex = new THREE.CanvasTexture(front);
      backTex = new THREE.CanvasTexture(back);
      [frontTex, backTex].forEach((t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = anisotropy;
      });
      mats.front.map = frontTex;
      mats.back.map = backTex;
      mats.front.needsUpdate = true;
      mats.back.needsUpdate = true;
    } else {
      frontTex.image = front;
      backTex.image = back;
      frontTex.needsUpdate = true;
      backTex.needsUpdate = true;
    }
    dirty = true;
  }

  let drawTimer = null;
  function scheduleDraw(delay = debounceMs) {
    clearTimeout(drawTimer);
    drawTimer = setTimeout(drawTextures, delay);
  }

  drawTextures();
  // Shrift kech yuklansa — qayta chiziladi (aks holda zaxira shrift qolib ketadi)
  let disposed = false;
  loadKitFonts().then(() => {
    if (!disposed) scheduleDraw(0);
  });

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 2.6;
  controls.maxDistance = 8;
  controls.minPolarAngle = PI * 0.22;
  controls.maxPolarAngle = PI * 0.72;
  controls.autoRotate = opts.autoRotate !== false && !reduceMotion;
  controls.autoRotateSpeed = 1.3;
  controls.addEventListener('start', () => {
    canvas.style.cursor = 'grabbing';
    turnTo = null;
  });
  controls.addEventListener('end', () => {
    canvas.style.cursor = 'grab';
  });

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.setLength(w / h < 0.8 ? 6.8 : 5.4);
    camera.updateProjectionMatrix();
    dirty = true;
  }
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  ro?.observe(container);
  resize();

  const azimuth = () => Math.atan2(camera.position.x, camera.position.z);
  function setAzimuth(a) {
    const r = Math.hypot(camera.position.x, camera.position.z);
    camera.position.x = Math.sin(a) * r;
    camera.position.z = Math.cos(a) * r;
    dirty = true;
  }

  let turnTo = null;
  let lastFace = null;
  function setView(view, { immediate = false } = {}) {
    controls.autoRotate = false;
    turnTo = view === 'back' ? PI : 0;
    if (immediate || reduceMotion) {
      setAzimuth(turnTo);
      turnTo = null;
    }
  }
  if (opts.view === 'back') setView('back', { immediate: true });
  controls.autoRotate = opts.autoRotate !== false && !reduceMotion;

  let raf = 0;
  function loop() {
    raf = requestAnimationFrame(loop);
    if (turnTo !== null) {
      const cur = azimuth();
      const d = Math.atan2(Math.sin(turnTo - cur), Math.cos(turnTo - cur));
      if (Math.abs(d) < 0.003) turnTo = null;
      else setAzimuth(cur + d * 0.09);
    }
    if (controls.update()) dirty = true;
    if (!dirty) return;
    dirty = false;
    renderer.render(scene, camera);
    if (opts.onViewChange) {
      const face = Math.cos(azimuth()) >= 0 ? 'front' : 'back';
      if (face !== lastFace) {
        lastFace = face;
        opts.onViewChange(face);
      }
    }
  }
  loop();

  let lastKey = JSON.stringify([design, print]);

  return {
    /** Dizayn va/yoki orqadagi ism-raqamni yangilaydi (tekstura debounce bilan qayta chiziladi) */
    update(next = {}) {
      const nd = 'design' in next ? normalizeDesign(next.design) : design;
      const np = PRINT_KEYS.some((k) => k in next) ? normalizePrint({ ...print, ...next }) : print;
      const key = JSON.stringify([nd, np]);
      if (key === lastKey) return;
      lastKey = key;
      design = nd;
      print = np;
      kit.update(design);
      dirty = true;
      scheduleDraw();
    },
    setView,
    setAutoRotate(on) {
      controls.autoRotate = Boolean(on) && !reduceMotion;
      if (controls.autoRotate) turnTo = null;
    },
    /** Joriy kadrni PNG (yoki boshqa tur) sifatida qaytaradi — ro'yxatdagi kichik rasm uchun */
    snapshot(type = 'image/png', quality) {
      clearTimeout(drawTimer);
      drawTextures();
      renderer.render(scene, camera);
      return canvas.toDataURL(type, quality);
    },
    resize,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(drawTimer);
      ro?.disconnect();
      controls.dispose();
      kit.dispose();
      [frontTex, backTex, knit, rib, env, floor.material.map].forEach((t) => t?.dispose());
      floor.geometry.dispose();
      floor.material.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
