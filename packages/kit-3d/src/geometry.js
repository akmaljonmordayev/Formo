import * as THREE from 'three';
import { normalizeDesign } from './design.js';
import { BOUNDS, BOUNDS_H, BOUNDS_W, buildOutline, depth, halfOutline, insidePoly, outlineName, segDist } from './outline.js';
import { shade } from './color.js';

/**
 * Formaning protsedural geometriyasi: old va orqa panel tikilgan choklardan "puflangan",
 * yoqa/yeng/etak ochiq, ichki tomon alohida material, yoqa va manjetlar — rezinka quvur, etak — ingichka quvur.
 * GL kerak emas (Node testida ham quriladi); xaritalar (teksturalar) sahnada ulanadi.
 */

const GRID = { nx: 176, ny: 190 };

/** Old yoki orqa panel: to'r nuqtalari kontur ichida qoladi, tashqaridagilari konturga tortiladi */
export function buildPanel(back, neck, grid = GRID) {
  const { poly, edges } = buildOutline(back ? 'back' : outlineName(neck));
  const { nx, ny } = grid;
  const { minX, minY } = BOUNDS;
  const pos = [];
  const uv = [];
  const flags = [];
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      let x = minX + (BOUNDS_W * i) / nx;
      let y = minY + (BOUNDS_H * j) / ny;
      const ins = insidePoly(poly, x, y);
      if (!ins) {
        let best = Infinity;
        let bx = x;
        let by = y;
        for (const e of edges) {
          const [d, px, py] = segDist(x, y, e.a, e.b);
          if (d < best) {
            best = d;
            bx = px;
            by = py;
          }
        }
        x = bx;
        y = by;
      }
      pos.push(x, y, depth(x, y, back));
      const u = (x - minX) / BOUNDS_W;
      const v = (y - minY) / BOUNDS_H;
      uv.push(back ? 1 - u : u, v);
      flags.push(ins);
    }
  }
  const idx = [];
  const row = nx + 1;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * row + i;
      const b = a + 1;
      const c = a + row + 1;
      const d = a + row;
      if (!(flags[a] || flags[b] || flags[c] || flags[d])) continue;
      if (back) idx.push(a, c, b, a, d, c);
      else idx.push(a, b, c, a, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Ochiq qirra bo'ylab halqa (yoqa, manjet, etak): avval old egri, keyin orqa egri */
export function edgeRing(neck, tag, side, radius) {
  const pickPts = (name) => {
    const { start, segs } = halfOutline(name);
    let pts = [];
    if (tag === 'neck') {
      pts = [start].concat(segs[0][1]);
      const l = pts
        .slice(1)
        .reverse()
        .map((p) => [-p[0], p[1]]);
      pts = l.concat(pts);
    } else if (tag === 'cuff') {
      pts = [[0.985, 0.655]].concat(segs[3][1]).map((p) => [p[0] * side, p[1]]);
    } else {
      pts = [[0.53, -1.08]].concat(segs[7][1]);
      const l = pts
        .slice(0, -1)
        .reverse()
        .map((p) => [-p[0], p[1]]);
      pts = pts.concat(l);
    }
    return pts;
  };
  const toV = (back) => (p) => new THREE.Vector3(p[0], p[1], depth(p[0], p[1], back));
  const f = pickPts(tag === 'neck' ? outlineName(neck) : 'back');
  const fr = f.map(toV(false));
  if (tag === 'neck') {
    const bb = pickPts('back').slice().reverse().map(toV(true));
    const curve = new THREE.CatmullRomCurve3(fr.concat(bb.slice(1, -1)), true, 'centripetal');
    return new THREE.TubeGeometry(curve, 260, radius, 14, true);
  }
  const bk = f.slice().reverse().map(toV(true));
  const curve = new THREE.CatmullRomCurve3(fr.concat(bk.slice(1, -1)), true, 'centripetal');
  return new THREE.TubeGeometry(curve, 140, radius, 10, true);
}

/** Forma materiallari (xaritalarsiz). Sahna map/bumpMap'larni ulaydi. */
export function createKitMaterials() {
  const cloth = () => new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0, bumpScale: 0.003, envMapIntensity: 0.55 });
  return {
    front: cloth(),
    back: cloth(),
    inside: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9, side: THREE.BackSide, bumpScale: 0.002, envMapIntensity: 0.2 }),
    rib: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65, bumpScale: 0.004, envMapIntensity: 0.5 }),
    hem: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, envMapIntensity: 0.4 }),
  };
}

/** Ichki tomon, rezinka va etak ranglari dizayndan (prototipdagi kabi) */
export function applyDesignColors(materials, design) {
  const d = normalizeDesign(design);
  materials.inside.color.set(shade(d.primaryColor, -0.55));
  materials.rib.color.set(d.secondaryColor);
  materials.hem.color.set(shade(d.primaryColor, -0.15));
}

/** Guruhdagi geometriyalarni almashtiradi (yoqa turi o'zgarganda) */
function fillGroup(group, neck, materials) {
  group.children.slice().forEach((m) => {
    group.remove(m);
    m.geometry.dispose();
  });
  const gF = buildPanel(false, neck);
  const gB = buildPanel(true, neck);
  const add = (geometry, material, cast = true) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  add(gF, materials.front);
  add(gB, materials.back);
  // ichki tomon — o'sha geometriya, BackSide material bilan (ikkinchi nusxa yaratilmaydi)
  add(gF, materials.inside, false);
  add(gB, materials.inside, false);
  add(edgeRing(neck, 'neck', 1, 0.032), materials.rib);
  add(edgeRing(neck, 'cuff', 1, 0.018), materials.rib);
  add(edgeRing(neck, 'cuff', -1, 0.018), materials.rib);
  add(edgeRing(neck, 'hem', 1, 0.009), materials.hem);
}

/**
 * Dizayndan 3D forma yasaydi.
 * @param {import('./design.js').KitDesign} design
 * @returns {{ group: THREE.Group, materials: ReturnType<typeof createKitMaterials>, neck: string,
 *   update: (design: object) => void, dispose: () => void }}
 */
export function buildKit(design) {
  const d = normalizeDesign(design);
  const materials = createKitMaterials();
  const group = new THREE.Group();
  group.name = 'kit';
  const kit = {
    group,
    materials,
    neck: d.neck,
    update(next) {
      const n = normalizeDesign(next);
      if (n.neck !== kit.neck) {
        fillGroup(group, n.neck, materials);
        kit.neck = n.neck;
      }
      applyDesignColors(materials, n);
    },
    dispose() {
      const seen = new Set();
      group.children.forEach((m) => {
        if (!seen.has(m.geometry)) m.geometry.dispose();
        seen.add(m.geometry);
      });
      group.clear();
      Object.values(materials).forEach((m) => m.dispose());
    },
  };
  fillGroup(group, d.neck, materials);
  applyDesignColors(materials, d);
  return kit;
}
