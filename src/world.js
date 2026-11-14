// The neighborhood: a stylized Hasenheide (Berlin Kreuzberg/Neukölln).
// Coordinates: +X = east, +Z = south. The world is generated from a fixed seed
// so every player sees the same map (needed later for multiplayer).
import * as THREE from 'three';

export const BOUNDS = { minX: -215, maxX: 215, minZ: -170, maxZ: 170 };
export const PARK = { minX: -170, maxX: 90, minZ: -50, maxZ: 70 };
export const FELD = { minX: -215, maxX: 40, minZ: 88, maxZ: 170 };
const CEMETERY = { minX: -215, maxX: -188, minZ: -50, maxZ: 72 };
const HILL = { x: 50, z: 30, r: 28, h: 7 };
const POND = { x: -120, z: -10, r: 9 };
const DOGRUN = { x: -100, z: 35, w: 36, d: 24 };

export const PLACES = {
  start: { x: -8, z: -63 },
  post: { x: -20, z: -70.5 },
  spaeti: { x: 34, z: -70 },
  kino: { x: -10, z: -14 },
  hilltop: { x: 50, z: 30 },
  hermannplatz: { x: 120, z: -60 },
  suedstern: { x: -180, z: -60 },
  // neighbors
  schmidt: { x: -50, z: -69.5 },
  mehmet: { x: 29, z: -70.5 },
  lina: { x: -70, z: -20 },
  horst: { x: -24, z: 27 },
  ayse: { x: -150, z: 10 },
  jonas: { x: -40, z: 125 },
};

export const ROADS = [
  { name: 'Hasenheide', a: [-180, -60], b: [120, -60], w: 12 },
  { name: 'Columbiadamm', a: [-215, 80], b: [120, 80], w: 11 },
  { name: 'Hermannstraße', a: [120, -60], b: [120, 170], w: 11 },
  { name: 'Kottbusser Damm', a: [120, -60], b: [120, -170], w: 11 },
  { name: 'Karl-Marx-Straße', a: [120, -60], b: [215, 70], w: 11 },
  { name: 'Sonnenallee', a: [120, -60], b: [215, -25], w: 10 },
  { name: 'Urbanstraße', a: [120, -60], b: [-10, -170], w: 10 },
  { name: 'Graefestraße', a: [20, -60], b: [20, -170], w: 8 },
  { name: 'Fichtestraße', a: [-60, -60], b: [-60, -170], w: 8 },
  { name: 'Körtestraße', a: [-140, -60], b: [-140, -170], w: 8 },
  { name: 'Dieffenbachstraße', a: [-140, -115], b: [55, -115], w: 8 },
  { name: 'Gneisenaustraße', a: [-215, -60], b: [-180, -60], w: 12 },
  { name: 'Lilienthalstraße', a: [-180, -60], b: [-180, 80], w: 8 },
  { name: 'Flughafenstraße', a: [120, 110], b: [215, 110], w: 8 },
  { name: 'Herrfurthstraße', a: [45, 125], b: [120, 125], w: 8 },
  { name: 'Schillerpromenade', a: [80, 80], b: [80, 170], w: 8 },
  { name: 'Oderstraße', a: [45, 80], b: [45, 170], w: 8 },
];

const PATHS = [
  [[-160, -40], [80, -40]], [[-160, 60], [80, 60]], [[-160, -40], [-160, 60]],
  [[80, -40], [80, 60]], [[-160, 10], [80, 10]], [[-40, -54], [-40, 74]],
  [[-100, -40], [-40, 10]], [[20, -54], [20, 10]], [[20, 10], [60, 60]],
  [[-160, 10], [-174, 10]],
];

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function segInfo(px, pz, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const len2 = dx * dx + dz * dz;
  let t = len2 ? ((px - a[0]) * dx + (pz - a[1]) * dz) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = a[0] + dx * t, cz = a[1] + dz * t;
  return { d: Math.hypot(px - cx, pz - cz), cx, cz };
}

const inRect = (x, z, r, pad = 0) =>
  x > r.minX - pad && x < r.maxX + pad && z > r.minZ - pad && z < r.maxZ + pad;

export function heightAt(x, z) {
  const d = Math.hypot(x - HILL.x, z - HILL.z);
  return d < HILL.r ? HILL.h * 0.5 * (1 + Math.cos((Math.PI * d) / HILL.r)) : 0;
}

export function makeLabel(text, { color = '#3b2f2a', bg = 'rgba(255,250,238,0.92)', size = 1 } = {}) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = '600 44px "Trebuchet MS", "Avenir Next", sans-serif';
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 48;
  c.width = w; c.height = 72;
  ctx.font = font;
  if (bg) {
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(2, 2, w - 4, 68, 30); ctx.fill();
  }
  ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.fillText(text, w / 2, 38);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set((w / 72) * 1.6 * size, 1.6 * size, 1);
  return sp;
}

function windowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const rng = mulberry32(7);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#d9d2c4'; g.fillRect(0, 206, 256, 50); // ground floor band
  for (let r = 0; r < 4; r++) for (let col = 0; col < 4; col++) {
    const x = 18 + col * 60, y = 16 + r * 48;
    g.fillStyle = rng() < 0.22 ? '#ffd98a' : '#5f7186';
    g.fillRect(x, y, 30, 34);
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.fillRect(x + 14, y, 2, 34); g.fillRect(x, y + 14, 30, 2);
  }
  g.fillStyle = '#6b4a3a'; g.fillRect(108, 214, 40, 42); // door
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildWorld(scene) {
  const rng = mulberry32(20261114);
  const colliders = [];   // axis-aligned boxes {minX,maxX,minZ,maxZ}
  const circles = [];     // {x,z,r}
  const specials = [];    // rects that procedural buildings must avoid
  const animated = [];

  const lambert = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, ...opts });
  const flat = (w, d, color, y, x = 0, z = 0) => {
    const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, lambert(color));
    m.position.set(x, y, z); m.receiveShadow = true; scene.add(m);
    return m;
  };
  const rectFlat = (r, color, y) =>
    flat(r.maxX - r.minX, r.maxZ - r.minZ, color, y, (r.minX + r.maxX) / 2, (r.minZ + r.maxZ) / 2);

  // ---- ground layers
  flat(520, 430, 0xd8cfbf, 0);
  rectFlat(PARK, 0x8fbf6a, 0.05);
  rectFlat(FELD, 0xb9c77a, 0.05);
  rectFlat(CEMETERY, 0x7fa868, 0.05);
  flat(255, 14, 0x8d8a86, 0.1, -87, 140); // old runway on Tempelhofer Feld
  for (let x = -200; x < 36; x += 14) flat(6, 0.8, 0xf2efe6, 0.14, x, 140);

  // hill (Rixdorfer Höhe)
  {
    const g = new THREE.PlaneGeometry(HILL.r * 2, HILL.r * 2, 36, 36); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i) + HILL.x, p.getZ(i) + HILL.z) + 0.12);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, lambert(0x86b862));
    m.position.set(HILL.x, 0, HILL.z); m.receiveShadow = true; scene.add(m);
  }

  // pond
  {
    const g = new THREE.CircleGeometry(POND.r, 28); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, lambert(0x6fb4d6)); m.position.set(POND.x, 0.12, POND.z); scene.add(m);
  }

  // ---- roads and paths
  const strip = (a, b, w, color, y, caps = true) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    const g = new THREE.PlaneGeometry(len, w); g.rotateX(-Math.PI / 2);
    const mat = lambert(color);
    const m = new THREE.Mesh(g, mat);
    m.position.set((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2);
    m.rotation.y = -Math.atan2(dz, dx); m.receiveShadow = true; scene.add(m);
    if (caps) for (const p of [a, b]) {
      const cg = new THREE.CircleGeometry(w / 2, 18); cg.rotateX(-Math.PI / 2);
      const c = new THREE.Mesh(cg, mat); c.position.set(p[0], y, p[1]); c.receiveShadow = true; scene.add(c);
    }
  };
  for (const r of ROADS) strip(r.a, r.b, r.w + 6, 0xc9c2b6, 0.1);
  for (const r of ROADS) strip(r.a, r.b, r.w, 0x6f6e72, 0.16);
  for (const p of PATHS) strip(p[0], p[1], 4, 0xe2cfa0, 0.1);
  // plazas
  for (const [p, rad] of [[PLACES.hermannplatz, 17], [PLACES.suedstern, 13]]) {
    const g = new THREE.CircleGeometry(rad, 32); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, lambert(0xcfc6b4)); m.position.set(p.x, 0.13, p.z); m.receiveShadow = true; scene.add(m);
  }

  // ---- building helpers
  const winTex = windowTexture();
  const palette = [0xf2d9b8, 0xe8c9c0, 0xd9e2c4, 0xf0e3a8, 0xc9d8e6, 0xe9d3df, 0xd6c4a8, 0xf4ede0];
  const sideMats = palette.map((c) => lambert(c, { map: winTex }));
  const roofMats = [lambert(0x8a5a4a), lambert(0x6f6a6a), lambert(0x9a6b55)];
  const unitBox = new THREE.BoxGeometry(1, 1, 1);

  const addCollider = (x, z, w, d) =>
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });

  const box = (x, y, z, w, h, d, mat, parent = scene) => {
    const m = new THREE.Mesh(unitBox, typeof mat === 'number' ? lambert(mat) : mat);
    m.scale.set(w, h, d); m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true; parent.add(m);
    return m;
  };
  const solid = (x, z, w, d, h, color, special = true) => {
    const m = box(x, h / 2, z, w, h, d, color);
    addCollider(x, z, w, d);
    if (special) specials.push({ x, z, w, d });
    return m;
  };
  const label = (text, x, y, z, size = 1.4) => {
    const s = makeLabel(text, { size }); s.position.set(x, y, z); scene.add(s); return s;
  };

  // ---- landmarks
  // Post office (mail routes start here)
  solid(-20, -80, 16, 12, 8, 0xf6c628);
  box(-20, 8.4, -80, 17, 0.8, 13, 0x4a4038);
  box(-20, 2.2, -73.6, 5, 4.4, 0.6, 0x5a4634);
  label('📯 Postamt', -20, 11, -78, 2);

  // Späti
  solid(34, -78, 10, 10, 6, 0xe9e2d2);
  box(34, 4.2, -72.2, 10.4, 0.5, 2.6, 0xd1483a);
  label('Späti · 24h', 34, 8, -76, 1.5);

  // Kaufhaus am Hermannplatz (two towers like the historic department store)
  solid(68, -78, 24, 14, 20, 0xdcc9a2);
  box(60, 25, -78, 5, 10, 5, 0xdcc9a2); box(76, 25, -78, 5, 10, 5, 0xdcc9a2);
  label('Kaufhaus am Hermannplatz', 68, 33, -78, 2);

  // Church at Südstern
  solid(-180, -86, 12, 20, 12, 0xa5644c);
  box(-180, 12, -78, 6, 24, 6, 0xa5644c);
  {
    const spire = new THREE.Mesh(new THREE.ConeGeometry(4.2, 12, 4), lambert(0x4f6b5e));
    spire.position.set(-180, 30, -78); spire.rotation.y = Math.PI / 4; spire.castShadow = true; scene.add(spire);
  }
  label('Südstern', -172, 6, -64, 1.6);
  label('Hermannplatz', 110, 6, -50, 1.6);
  for (const [x, z] of [[-172, -66], [108, -49]]) { // U-Bahn signs
    box(x, 2, z, 0.3, 4, 0.3, 0x555555);
    box(x, 4.6, z, 1.8, 1.8, 0.3, 0x1f5fbf);
    const u = makeLabel('U', { color: '#ffffff', bg: null, size: 1.1 }); u.position.set(x, 4.6, z + 0.3); scene.add(u);
  }

  // Şehitlik mosque on Columbiadamm
  solid(-70, 104, 18, 18, 8, 0xf4f1ea);
  {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(7, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), lambert(0xdfe7ea));
    dome.position.set(-70, 8, 104); dome.castShadow = true; scene.add(dome);
    for (const sx of [-11, 11]) {
      const mn = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 22, 10), lambert(0xf4f1ea));
      mn.position.set(-70 + sx, 11, 96); mn.castShadow = true; scene.add(mn);
      const top = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4, 10), lambert(0x8aa3ad));
      top.position.set(-70 + sx, 24, 96); scene.add(top);
      circles.push({ x: -70 + sx, z: 96, r: 1 });
    }
  }
  label('Şehitlik-Moschee', -70, 19, 104, 1.6);

  // Columbiabad (outdoor pool)
  flat(32, 18, 0xe9e4d8, 0.1, 0, 102); flat(28, 14, 0x58b7e0, 0.14, 0, 102);
  label('Columbiabad', 0, 4, 102, 1.4);

  // Hasenschänke kiosk
  solid(-32, 22, 8, 6, 4, 0x6f8f5a);
  box(-32, 4.3, 22, 9.5, 0.5, 8, 0x8a5a4a);
  for (const [x, z] of [[-25, 20], [-23, 24], [-27, 29]]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.15, 12), lambert(0xc9a877));
    t.position.set(x, 1, z); t.castShadow = true; scene.add(t);
    box(x, 0.5, z, 0.2, 1, 0.2, 0x6b4a3a);
  }
  label('Hasenschänke', -32, 6.4, 22, 1.4);

  // Freiluftkino
  box(-10, 6, -24, 14, 7, 0.5, 0xfafafa); box(-16, 1.5, -24, 0.5, 3, 0.5, 0x444444); box(-4, 1.5, -24, 0.5, 3, 0.5, 0x444444);
  addCollider(-10, -24, 14, 1);
  for (let r = 0; r < 3; r++) box(-10, 0.4, -17 + r * 3, 10, 0.5, 0.8, 0x8a6a4a);
  label('Freiluftkino', -10, 11, -24, 1.4);

  // fences
  const fence = (cx, cz, w, d, color = 0x9a7b55) => {
    for (const y of [0.6, 1.2]) {
      box(cx, y, cz - d / 2, w, 0.12, 0.12, color); box(cx, y, cz + d / 2, w, 0.12, 0.12, color);
      box(cx - w / 2, y, cz, 0.12, 0.12, d, color); box(cx + w / 2, y, cz, 0.12, 0.12, d, color);
    }
  };
  // Tierpark (petting zoo)
  fence(55, -18, 24, 18);
  for (const [x, z, c] of [[50, -20, 0xf5f0e6], [58, -14, 0xd9c6a8], [61, -22, 0xf5f0e6]]) {
    box(x, 0.9, z, 0.7, 0.7, 1.4, c); box(x, 1.4, z + 0.8, 0.5, 0.5, 0.6, c);
    for (const lx of [-0.2, 0.2]) for (const lz of [-0.5, 0.5]) box(x + lx, 0.3, z + lz, 0.15, 0.6, 0.15, 0x555555);
  }
  label('Tierpark', 55, 4.5, -18, 1.4);
  // dog run
  fence(DOGRUN.x, DOGRUN.z, DOGRUN.w, DOGRUN.d, 0x7c8a6a);
  label('Hundeauslauf', DOGRUN.x, 4, DOGRUN.z, 1.4);
  label('Rixdorfer Höhe', HILL.x, HILL.h + 4, HILL.z, 1.4);
  label('Volkspark Hasenheide', -40, 9, -47, 2);
  label('Tempelhofer Feld', -90, 8, 150, 2.2);

  // rose garden
  {
    const n = 90, g = new THREE.SphereGeometry(0.35, 6, 5);
    const im = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial(), n);
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    const cols = [0xe0527a, 0xf08aa8, 0xd23c4f, 0xf7c6d4, 0xf2a03c];
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2, r = 2 + rng() * 7;
      m4.setPosition(-135 + Math.cos(a) * r, 0.45, 38 + Math.sin(a) * r);
      im.setMatrixAt(i, m4); im.setColorAt(i, col.setHex(cols[(rng() * cols.length) | 0]));
    }
    scene.add(im);
    label('Rosengarten', -135, 3.5, 38, 1.3);
  }

  // kites over the Feld
  for (let i = 0; i < 5; i++) {
    const g = new THREE.PlaneGeometry(2.4, 3.2);
    const k = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: [0xe94f64, 0xf2b134, 0x4aa3df, 0x7bc66a, 0xb26fd1][i], side: THREE.DoubleSide }));
    const base = { x: -170 + i * 42 + rng() * 10, z: 112 + rng() * 40, y: 16 + rng() * 10, ph: rng() * 6 };
    k.rotation.z = Math.PI / 4; scene.add(k);
    animated.push((t) => {
      k.position.set(base.x + Math.sin(t * 0.5 + base.ph) * 5, base.y + Math.sin(t * 0.9 + base.ph) * 1.5, base.z + Math.cos(t * 0.4 + base.ph) * 4);
      k.rotation.y = Math.sin(t * 0.7 + base.ph) * 0.5;
    });
  }

  // ---- procedural blocks of Berlin apartment houses
  const buildings = [];
  const CELL = 16;
  const blocked = (x, z) => {
    for (const r of ROADS) if (segInfo(x, z, r.a, r.b).d < r.w / 2 + CELL / 2 + 2.5) return true;
    for (const s of specials) if (Math.abs(x - s.x) < s.w / 2 + CELL / 2 + 1 && Math.abs(z - s.z) < s.d / 2 + CELL / 2 + 1) return true;
    return false;
  };
  const fill = (x0, z0, x1, z1) => {
    for (let x = x0 + CELL / 2; x + CELL / 2 <= x1 + 0.01; x += CELL)
      for (let z = z0 + CELL / 2; z + CELL / 2 <= z1 + 0.01; z += CELL) {
        const h = 13 + rng() * 9;
        const mat = sideMats[(rng() * sideMats.length) | 0], roof = roofMats[(rng() * roofMats.length) | 0];
        if (blocked(x, z)) continue;
        const m = new THREE.Mesh(unitBox, [mat, mat, roof, roof, mat, mat]);
        m.scale.set(CELL, h, CELL); m.position.set(x, h / 2, z);
        m.castShadow = true; m.receiveShadow = true; scene.add(m);
        addCollider(x, z, CELL, CELL);
        buildings.push({ x, z });
      }
  };
  fill(-215, -170, 112, -66);   // Graefekiez (Kreuzberg)
  fill(128, -170, 215, 170);    // Neukölln east of Hermannstraße
  fill(96, -38, 112, 72);       // strip between park and Hermannstraße
  fill(56, 90, 120, 170);       // Schillerkiez

  // ---- addresses with mailboxes
  const addresses = [];
  {
    const counters = {};
    const inAnyBox = (x, z) => colliders.some((b) => x > b.minX - 0.3 && x < b.maxX + 0.3 && z > b.minZ - 0.3 && z < b.maxZ + 0.3);
    for (const b of buildings) {
      let best = null;
      for (const r of ROADS) {
        const s = segInfo(b.x, b.z, r.a, r.b);
        if (!best || s.d - r.w / 2 < best.gap) best = { gap: s.d - r.w / 2, r, s };
      }
      if (best.gap > CELL / 2 + 9) continue;
      let dx = best.s.cx - b.x, dz = best.s.cz - b.z;
      const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
      const t = CELL / 2 / Math.max(Math.abs(dx), Math.abs(dz)) + 1.3;
      const x = b.x + dx * t, z = b.z + dz * t;
      if (inAnyBox(x, z) || !inRect(x, z, BOUNDS, -3)) continue;
      const n = (counters[best.r.name] = (counters[best.r.name] || 0) + 1);
      addresses.push({ x, z, label: `${best.r.name} ${n * 2 + (n % 2)}`, id: addresses.length });
    }
    const post = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 1, 0.15), lambert(0x555555), addresses.length);
    const mb = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.5, 0.45), lambert(0xf6c628), addresses.length);
    const m4 = new THREE.Matrix4();
    addresses.forEach((a, i) => {
      m4.setPosition(a.x, 0.5, a.z); post.setMatrixAt(i, m4);
      m4.setPosition(a.x, 1.2, a.z); mb.setMatrixAt(i, m4);
    });
    mb.castShadow = true; scene.add(post, mb);
  }

  // ---- trees (autumn colors)
  const trees = [];
  {
    const keepOut = [
      { x: POND.x, z: POND.z, r: POND.r + 2 }, { x: -10, z: -18, r: 13 }, { x: -30, z: 24, r: 11 },
      { x: 55, z: -18, r: 17 }, { x: DOGRUN.x, z: DOGRUN.z, r: 23 }, { x: -135, z: 38, r: 11 },
      { x: HILL.x, z: HILL.z, r: 7 }, { x: -70, z: -20, r: 5 }, { x: -150, z: 10, r: 5 },
    ];
    const ok = (x, z) => {
      for (const k of keepOut) if (Math.hypot(x - k.x, z - k.z) < k.r) return false;
      for (const p of PATHS) if (segInfo(x, z, p[0], p[1]).d < 4.5) return false;
      for (const t of trees) if (Math.hypot(x - t.x, z - t.z) < 5) return false;
      return true;
    };
    const tryAdd = (r, n, park) => {
      for (let i = 0; i < n; i++) {
        const x = r.minX + 3 + rng() * (r.maxX - r.minX - 6), z = r.minZ + 3 + rng() * (r.maxZ - r.minZ - 6);
        if (ok(x, z)) trees.push({ x, z, s: 3 + rng() * 2, park });
      }
    };
    tryAdd(PARK, 700, true);
    tryAdd(CEMETERY, 30, false);
    tryAdd({ minX: -215, maxX: 40, minZ: 150, maxZ: 170 }, 8, false);
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.6, 5, 7), lambert(0x6b4a34), trees.length);
    const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial(), trees.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
    const leaf = [0xe39a2e, 0xd9702c, 0xe8c341, 0x8fb04a, 0xc9532f, 0x6f9e4a, 0xf0b23c];
    trees.forEach((t, i) => {
      const y = heightAt(t.x, t.z);
      m4.compose(new THREE.Vector3(t.x, y + 2.5, t.z), q, new THREE.Vector3(1, 1, 1)); trunk.setMatrixAt(i, m4);
      m4.compose(new THREE.Vector3(t.x, y + 4.5 + t.s * 0.6, t.z), q, new THREE.Vector3(t.s, t.s * 0.9, t.s)); crown.setMatrixAt(i, m4);
      crown.setColorAt(i, col.setHex(leaf[(rng() * leaf.length) | 0]));
      circles.push({ x: t.x, z: t.z, r: 0.75 });
    });
    trunk.castShadow = crown.castShadow = true;
    scene.add(trunk, crown);
  }

  // ---- queries
  const inPond = (x, z) => Math.hypot(x - POND.x, z - POND.z) < POND.r - 0.5;
  const blockedAt = (x, z, pad = 1.5) => {
    for (const b of colliders) if (x > b.minX - pad && x < b.maxX + pad && z > b.minZ - pad && z < b.maxZ + pad) return true;
    for (const c of circles) if (Math.hypot(x - c.x, z - c.z) < c.r + pad) return true;
    return inPond(x, z);
  };
  const randomWalkable = (rect = BOUNDS, rnd = Math.random) => {
    for (let i = 0; i < 80; i++) {
      const x = rect.minX + 4 + rnd() * (rect.maxX - rect.minX - 8), z = rect.minZ + 4 + rnd() * (rect.maxZ - rect.minZ - 8);
      if (!blockedAt(x, z)) return { x, z };
    }
    return { x: PLACES.start.x, z: PLACES.start.z };
  };
  const locationName = (x, z) => {
    if (Math.hypot(x - 120, z + 60) < 18) return 'Hermannplatz';
    if (Math.hypot(x + 180, z + 60) < 14) return 'Südstern';
    if (inRect(x, z, PARK)) {
      if (Math.hypot(x - HILL.x, z - HILL.z) < HILL.r * 0.7) return 'Rixdorfer Höhe';
      if (Math.abs(x - DOGRUN.x) < DOGRUN.w / 2 && Math.abs(z - DOGRUN.z) < DOGRUN.d / 2) return 'Hundeauslauf';
      return 'Volkspark Hasenheide';
    }
    if (inRect(x, z, FELD)) return 'Tempelhofer Feld';
    if (inRect(x, z, CEMETERY)) return 'Friedhöfe Lilienthalstraße';
    let best = null;
    for (const r of ROADS) { const d = segInfo(x, z, r.a, r.b).d; if (d < r.w / 2 + 9 && (!best || d < best.d)) best = { d, n: r.name }; }
    if (best) return best.n;
    return z < -60 ? 'Graefekiez' : x > 120 ? 'Neukölln' : 'Schillerkiez';
  };

  // minimap base layer (north is up)
  const drawMinimapBase = (ctx, W, H) => {
    const sx = W / (BOUNDS.maxX - BOUNDS.minX), sz = H / (BOUNDS.maxZ - BOUNDS.minZ);
    const X = (x) => (x - BOUNDS.minX) * sx, Z = (z) => (z - BOUNDS.minZ) * sz;
    const rect = (r, c) => { ctx.fillStyle = c; ctx.fillRect(X(r.minX), Z(r.minZ), (r.maxX - r.minX) * sx, (r.maxZ - r.minZ) * sz); };
    ctx.fillStyle = '#e4d9c6'; ctx.fillRect(0, 0, W, H);
    rect(PARK, '#a5cf84'); rect(FELD, '#c6d28e'); rect(CEMETERY, '#93b97d');
    ctx.fillStyle = '#7dbde0'; ctx.beginPath(); ctx.arc(X(POND.x), Z(POND.z), POND.r * sx, 0, 7); ctx.fill();
    ctx.fillStyle = '#93c070'; ctx.beginPath(); ctx.arc(X(HILL.x), Z(HILL.z), HILL.r * 0.6 * sx, 0, 7); ctx.fill();
    ctx.lineCap = 'round';
    const lines = (list, color, wFn) => {
      ctx.strokeStyle = color;
      for (const l of list) { ctx.lineWidth = wFn(l); ctx.beginPath(); ctx.moveTo(X(l.a[0]), Z(l.a[1])); ctx.lineTo(X(l.b[0]), Z(l.b[1])); ctx.stroke(); }
    };
    lines(PATHS.map((p) => ({ a: p[0], b: p[1] })), '#efe0b4', () => 1.5);
    lines(ROADS, '#ffffff', (r) => Math.max(2.5, r.w * sx * 0.9));
    ctx.fillStyle = '#f6c628'; ctx.fillRect(X(PLACES.post.x) - 4, Z(PLACES.post.z) - 7, 8, 7);
  };

  return {
    colliders, circles, addresses, trees, heightAt, inPond, blockedAt, randomWalkable, locationName, drawMinimapBase,
    update: (t) => { for (const f of animated) f(t); },
  };
}
