// Boston Post — main game: input, movement, deliveries, squirrels, zoomies, quests, HUD.
import * as THREE from 'three';
import { buildWorld, PLACES, BOUNDS, PARK, makeLabel } from './world.js';
import { createBoston } from './dog.js';
import { makePerson, makeSquirrel, makeBone, makeSock, makeOrb, makeBeam } from './entities.js';
import { QUESTS } from './quests.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

// ---------- renderer / scene
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfe6f2);
scene.fog = new THREE.Fog(0xdcebf0, 140, 430);
const camera = new THREE.PerspectiveCamera(60, 1, 0.5, 700);
scene.add(new THREE.HemisphereLight(0xfff4e0, 0x8f9a70, 1.5));
const sun = new THREE.DirectionalLight(0xffe6bd, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 1, far: 260 });
sun.shadow.bias = -0.0006;
scene.add(sun, sun.target);

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

const W = buildWorld(scene);

// ---------- save data
const SAVE_KEY = 'boston-post-save-v1';
const fresh = () => ({ level: 1, xp: 0, treats: 0, points: 0, skills: { speed: 0, bag: 0, focus: 0, bone: 0 }, stats: { delivered: 0, socks: 0, squirrels: 0, quests: 0 } });
let S = fresh();
try { const raw = localStorage.getItem(SAVE_KEY); if (raw) S = { ...fresh(), ...JSON.parse(raw) }; } catch { /* storage unavailable */ }
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch { /* ignore */ } };
const xpNeed = (lvl) => 60 + 40 * (lvl - 1);
const maxSpeed = () => 11 * (1 + 0.07 * S.skills.speed);
const bagSize = () => 3 + S.skills.bag;
const boneMax = () => 1 + S.skills.bone;
const distractTime = () => 3.2 * Math.pow(0.82, S.skills.focus);

// ---------- sound (tiny synth, no assets)
let ac = null;
function tone(freq, dur = 0.12, type = 'sine', vol = 0.07, slide = 0, delay = 0) {
  if (!ac) return;
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
}
const sfx = {
  pickup: () => { tone(660, 0.08); tone(990, 0.12, 'sine', 0.07, 0, 0.07); },
  deliver: () => [523, 659, 784].forEach((f, i) => tone(f, 0.14, 'triangle', 0.08, 0, i * 0.08)),
  bark: () => { tone(320, 0.09, 'square', 0.09, -140); tone(280, 0.1, 'square', 0.09, -120, 0.13); },
  zoom: () => tone(200, 0.6, 'sawtooth', 0.06, 900),
  bonk: () => tone(120, 0.18, 'square', 0.1, -60),
  squirrel: () => { tone(1400, 0.06, 'square', 0.04); tone(1700, 0.06, 'square', 0.04, 0, 0.08); },
  level: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'triangle', 0.09, 0, i * 0.1)),
  fail: () => tone(300, 0.4, 'sawtooth', 0.06, -180),
};

// ---------- player
const boston = createBoston();
scene.add(boston.group);
const dog = { x: PLACES.start.x, z: PLACES.start.z, yaw: Math.PI / 2, speed: 0 };
let bones = 1, zoomT = 0, bonkT = 0, barkT = 0;
let distract = null, distractCD = 4;
let bag = [];            // {id,type,icon,addr,route}
let routeLeft = 0, itemId = 1;
const TYPES = {
  letter: { icon: '✉️', color: 0x3f8fe0, xp: 10, name: 'Letter' },
  paper: { icon: '📰', color: 0x7a8a99, xp: 12, name: 'Newspaper' },
  sock: { icon: '🧦', color: 0xe94f64, xp: 18, name: 'Lost sock' },
};

// ---------- input
const keys = new Set();
let started = false, dialog = null;
addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  if (!started) return;
  if (dialog) {
    if (e.code === 'KeyE' || e.code === 'Enter') acceptQuest();
    else if (e.code === 'KeyQ' || e.code === 'Escape') closeDialog();
    return;
  }
  if (e.code === 'Space') useBone();
  if (e.code === 'KeyB') bark();
  if (e.code === 'KeyE') interact();
  if (e.code === 'KeyR') { dog.x = PLACES.start.x; dog.z = PLACES.start.z; dog.speed = 0; toast('Back at the Postamt.'); }
  const sk = { Digit1: 'speed', Digit2: 'bag', Digit3: 'focus', Digit4: 'bone' }[e.code];
  if (sk && S.points > 0) { S.points--; S.skills[sk]++; sfx.pickup(); toast(`Upgraded: ${sk}!`); persist(); refreshHUD(); }
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
let camDist = 6.5;
addEventListener('wheel', (e) => { camDist = clamp(camDist + Math.sign(e.deltaY) * 0.8, 4, 18); }, { passive: true });

// ---------- HUD helpers
function toast(msg, cls = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + cls; el.textContent = msg;
  $('toasts').prepend(el);
  setTimeout(() => el.remove(), 3600);
}
let bannerT = 0;
function banner(text, secs = 1.6, cls = '') {
  const b = $('banner'); b.textContent = text; b.className = 'show ' + cls; bannerT = secs;
}
function addXP(n, treats = 0) {
  S.xp += n; S.treats += treats;
  while (S.xp >= xpNeed(S.level)) {
    S.xp -= xpNeed(S.level); S.level++; S.points++;
    banner(`Level ${S.level}!`, 2.2, 'gold'); sfx.level();
  }
  persist(); refreshHUD();
}
function refreshHUD() {
  $('level').textContent = S.level;
  $('xpfill').style.width = `${(100 * S.xp) / xpNeed(S.level)}%`;
  $('xptext').textContent = `${S.xp} / ${xpNeed(S.level)} XP`;
  $('treats').textContent = S.treats;
  $('bones').textContent = '🦴'.repeat(bones) + '▫️'.repeat(Math.max(0, boneMax() - bones));
  $('levelup').style.display = S.points > 0 ? 'block' : 'none';
  $('points').textContent = S.points;
  $('skills').textContent = `Speed ${S.skills.speed} · Bag ${bagSize()} · Focus ${S.skills.focus} · Bone pouch ${boneMax()}`;
}

// ---------- target beams
const beams = new Map();
function setBeam(key, pos, color) {
  if (beams.has(key)) return;
  const b = makeBeam(color); b.position.set(pos.x, W.heightAt(pos.x, pos.z), pos.z);
  scene.add(b); beams.set(key, b);
}
function clearBeam(key) { const b = beams.get(key); if (b) { scene.remove(b); beams.delete(key); } }
function clearBeams(prefix) { for (const k of [...beams.keys()]) if (k.startsWith(prefix)) clearBeam(k); }

// ---------- bones & socks lying around
const pickups = [];
function spawnPickup(kind) {
  const pos = W.randomWalkable(BOUNDS);
  const mesh = kind === 'bone' ? makeBone() : makeSock(pick([0xe94f64, 0x4aa3df, 0xf2b134, 0x7bc66a, 0xb26fd1]));
  mesh.scale.setScalar(kind === 'bone' ? 1.1 : 1.3);
  scene.add(mesh);
  pickups.push({ kind, mesh, x: pos.x, z: pos.z, wait: 0 });
}
for (let i = 0; i < 10; i++) spawnPickup('bone');
for (let i = 0; i < 7; i++) spawnPickup('sock');

function updatePickups(dt, t) {
  for (const p of pickups) {
    if (p.wait > 0) {
      p.wait -= dt;
      if (p.wait <= 0) { const pos = W.randomWalkable(BOUNDS); p.x = pos.x; p.z = pos.z; p.mesh.visible = true; }
      continue;
    }
    p.mesh.position.set(p.x, W.heightAt(p.x, p.z) + 0.9 + Math.sin(t * 2.5 + p.x) * 0.15, p.z);
    p.mesh.rotation.y = t * 1.5 + p.z;
    if (dist(dog, p) > 1.8) continue;
    if (p.kind === 'bone') {
      if (bones >= boneMax()) continue;
      bones++; sfx.pickup(); toast('🦴 Bone! Press Space for zoomies.');
    } else {
      if (bag.length >= bagSize()) continue;
      const addr = pick(W.addresses);
      addItem('sock', addr, false);
      sfx.pickup(); toast(`🧦 Lost sock! It belongs to ${addr.label}.`);
    }
    p.mesh.visible = false; p.wait = p.kind === 'bone' ? 25 : 40;
    refreshHUD();
  }
}

// ---------- deliveries
function addItem(type, addr, route) {
  const it = { id: itemId++, type, addr, route };
  bag.push(it);
  setBeam('bag' + it.id, addr, TYPES[type].color);
  renderBag();
}
function takeRoute() {
  const free = bagSize() - bag.length;
  if (free <= 0) return toast('Your bag is full. Deliver something first!');
  // early routes stay close to the Postamt; higher levels reach further out
  const reach = 130 + S.level * 35;
  const anchor = pick(W.addresses.filter((a) => dist(a, PLACES.post) < reach));
  const near = [...W.addresses].sort((a, b) => dist(a, anchor) - dist(b, anchor)).slice(0, 10);
  const used = new Set(bag.map((i) => i.addr.id));
  let n = 0;
  while (n < free && near.length) {
    const a = near.splice((Math.random() * near.length) | 0, 1)[0];
    if (used.has(a.id)) continue;
    addItem(Math.random() < 0.6 ? 'letter' : 'paper', a, true); n++;
  }
  routeLeft += n;
  sfx.pickup(); banner('New route!', 1.4);
  toast(`📯 ${n} deliveries around ${anchor.label.replace(/ \d+$/, '')}.`);
}
function checkDeliveries() {
  for (const it of [...bag]) {
    if (dist(dog, it.addr) > 2.8) continue;
    bag.splice(bag.indexOf(it), 1); clearBeam('bag' + it.id);
    const T = TYPES[it.type];
    S.stats.delivered++; if (it.type === 'sock') S.stats.socks++;
    toast(`${T.icon} Delivered to ${it.addr.label}  +${T.xp} XP`, 'good');
    sfx.deliver(); addXP(T.xp, 1);
    if (it.route && --routeLeft === 0) { toast('Route complete! Bonus +20 XP, +3 treats', 'good'); addXP(20, 3); }
    renderBag();
  }
}
function renderBag() {
  const rows = bag.map((it) => `<div class="row"><span>${TYPES[it.type].icon}</span><span class="addr">${it.addr.label}</span><span class="d">${Math.round(dist(dog, it.addr))} m</span></div>`);
  $('baglist').innerHTML = rows.join('') || '<div class="empty">Empty. Visit the Postamt 📯 or sniff out socks 🧦</div>';
  $('bagcap').textContent = `${bag.length}/${bagSize()}`;
}

// ---------- squirrels
const squirrels = [];
{
  const parkTrees = W.trees.filter((t) => t.park);
  for (let i = 0; i < 18; i++) {
    const tree = parkTrees[(i * 13 + 5) % parkTrees.length];
    const mesh = makeSquirrel(); scene.add(mesh);
    squirrels.push({ tree, mesh, x: tree.x + 3, z: tree.z + 2, y: 0, state: 'ground', timer: 0, goal: null, yaw: 0, scared: false });
  }
}
function onSquirrelTreed(sq) {
  S.stats.squirrels++;
  if (distract && distract.sq === sq) {
    distract = null; distractCD = 9;
    toast('🐿️ Chased it up a tree!  +5 XP', 'good'); addXP(5);
  }
  if (quest) { const st = quest.steps[quest.i]; if (st.type === 'chase') { st.got = (st.got || 0) + 1; if (st.got >= st.count) nextStep(); renderQuest(); } }
}
function updateSquirrels(dt, t) {
  for (const s of squirrels) {
    const base = W.heightAt(s.x, s.z);
    if (s.state === 'tree') {
      s.timer -= dt;
      if (s.timer <= 0 && dist(dog, s.tree) > 14) {
        const a = Math.random() * 6.28; s.x = s.tree.x + Math.cos(a) * 1.6; s.z = s.tree.z + Math.sin(a) * 1.6;
        s.y = 0; s.state = 'ground'; s.goal = null; s.mesh.visible = true;
      }
      continue;
    }
    if (s.state === 'climb') {
      s.y += 7 * dt; s.mesh.rotation.x = -Math.PI / 2;
      if (s.y > 4.5) { s.state = 'tree'; s.timer = 7 + Math.random() * 8; s.mesh.visible = false; s.mesh.rotation.x = 0; }
    } else {
      const d = dist(dog, s);
      if (s.state === 'ground' && d < 6.5) { s.state = 'flee'; s.scared = true; sfx.squirrel(); }
      let tx, tz, sp;
      if (s.state === 'flee') { tx = s.tree.x; tz = s.tree.z; sp = 9.5; }
      else {
        if (!s.goal || dist(s, s.goal) < 0.5 || s.timer <= 0) {
          const a = Math.random() * 6.28, r = 2 + Math.random() * 5;
          s.goal = { x: s.tree.x + Math.cos(a) * r, z: s.tree.z + Math.sin(a) * r }; s.timer = 2 + Math.random() * 3;
        }
        s.timer -= dt; tx = s.goal.x; tz = s.goal.z; sp = Math.sin(t * 3 + s.tree.x) > 0 ? 2.5 : 0;
      }
      const dx = tx - s.x, dz = tz - s.z, l = Math.hypot(dx, dz);
      if (l > 0.05 && sp > 0) { s.x += (dx / l) * sp * dt; s.z += (dz / l) * sp * dt; s.yaw = Math.atan2(dx, dz); }
      if (s.state === 'flee' && l < 1.1) { s.state = 'climb'; if (s.scared) onSquirrelTreed(s); s.scared = false; }
      // SQUIRREL!
      if (s.state === 'ground' && !distract && distractCD <= 0 && zoomT <= 0 && !dialog && d < 16 && d > 6.5) {
        distract = { sq: s, t: distractTime() };
        banner('🐿️ SQUIRREL!!', 1.3, 'red'); sfx.squirrel();
      }
    }
    s.mesh.position.set(s.x, base + s.y + (s.state !== 'climb' ? Math.abs(Math.sin(t * 9 + s.tree.z)) * 0.12 : 0), s.z);
    s.mesh.rotation.y = s.yaw;
  }
}

// ---------- neighbors & quests
const npcs = QUESTS.map((q) => {
  const pos = PLACES[q.id];
  const mesh = makePerson(q.coat, q.hair, 0xf0c8a0, 1.3 * (q.scale || 1));
  mesh.position.set(pos.x, W.heightAt(pos.x, pos.z), pos.z);
  scene.add(mesh);
  const mark = makeLabel('!', { color: '#3b2f2a', bg: '#ffd23f', size: 1.2 });
  mark.position.set(pos.x, 4.9 * (q.scale || 1), pos.z); scene.add(mark);
  const name = makeLabel(q.name, { size: 0.8 }); name.position.set(pos.x, 3.9 * (q.scale || 1), pos.z); scene.add(name);
  W.circles.push({ x: pos.x, z: pos.z, r: 0.6 });
  return { q, pos, mesh, mark, cooldown: 0 };
});
let quest = null;       // {def, npc, steps, i}
const questItems = [];  // meshes for the current step
const questCtx = {
  near(center, rMin, rMax, rect) {
    for (let i = 0; i < 60; i++) {
      const p = W.randomWalkable(rect);
      const d = dist(p, center);
      if (d >= rMin && d <= rMax) return p;
    }
    return W.randomWalkable(rect);
  },
};
function openDialog(npc) {
  dialog = npc;
  $('dlgname').textContent = npc.q.name; $('dlgtitle').textContent = npc.q.title; $('dlgtext').textContent = npc.q.intro;
  $('dialog').style.display = 'block';
}
function closeDialog() { dialog = null; $('dialog').style.display = 'none'; }
function acceptQuest() {
  const npc = dialog; closeDialog();
  quest = { def: npc.q, npc, steps: npc.q.steps(questCtx), i: -1 };
  sfx.pickup(); nextStep(true);
}
function clearStep() {
  clearBeams('quest');
  for (const m of questItems.splice(0)) scene.remove(m);
}
function nextStep(first = false) {
  clearStep();
  quest.i++;
  if (quest.i >= quest.steps.length) return finishQuest();
  if (!first) sfx.pickup();
  const st = quest.steps[quest.i];
  if (st.timer) st.left = st.timer;
  const pts = st.type === 'goto' ? [st.pos] : st.type === 'collect' ? st.points : [];
  pts.forEach((p, k) => {
    setBeam('quest' + k, p, 0xa45ee5);
    if (st.item || st.type === 'collect') {
      const m = st.type === 'collect' ? makeSock(st.color) : makeOrb(st.color || 0xffc93c);
      m.position.set(p.x, W.heightAt(p.x, p.z) + 0.9, p.z); m.scale.setScalar(1.3);
      m.userData.k = k; scene.add(m); questItems.push(m);
    }
  });
  renderQuest();
}
function finishQuest() {
  const { def, npc } = quest;
  quest = null; npc.cooldown = 75; S.stats.quests++;
  banner('Quest complete!', 2, 'gold'); sfx.deliver();
  toast(`${def.name}: “${def.done}”`, 'good');
  toast(`+${def.xp} XP, +${def.treats} treats`, 'good');
  addXP(def.xp, def.treats); renderQuest();
}
function failQuest() {
  const { def, npc } = quest;
  clearStep(); quest = null; npc.cooldown = 20;
  sfx.fail(); toast(`${def.name}: “${def.fail || 'Maybe next time.'}”`); renderQuest();
}
function updateQuest(dt, t) {
  for (const n of npcs) {
    n.cooldown = Math.max(0, n.cooldown - dt);
    n.mark.visible = !quest && n.cooldown <= 0;
    n.mark.position.y = (4.9 + Math.sin(t * 3) * 0.15) * (n.q.scale || 1);
    if (dist(dog, n.pos) < 12) n.mesh.rotation.y = Math.atan2(dog.x - n.pos.x, dog.z - n.pos.z);
  }
  for (const m of questItems) m.rotation.y = t * 2;
  if (!quest) return;
  const st = quest.steps[quest.i];
  if (st.timer) { st.left -= dt; if (st.left <= 0) return failQuest(); }
  if (st.type === 'goto' && dist(dog, st.pos) < (st.r || 3.2)) nextStep();
  else if (st.type === 'collect') {
    st.points.forEach((p, k) => {
      if (p.got || dist(dog, p) > 2.2) return;
      p.got = true; clearBeam('quest' + k); sfx.pickup();
      const m = questItems.find((q) => q.userData.k === k); if (m) { scene.remove(m); questItems.splice(questItems.indexOf(m), 1); }
    });
    if (st.points.every((p) => p.got)) nextStep();
  }
}
function renderQuest() {
  const el = $('quest');
  if (!quest) { el.style.display = 'none'; return; }
  const st = quest.steps[quest.i];
  let extra = '';
  if (st.type === 'chase') extra = ` (${st.got || 0}/${st.count})`;
  if (st.type === 'collect') extra = ` (${st.points.filter((p) => p.got).length}/${st.points.length})`;
  if (st.timer) extra += `  ⏱ ${Math.ceil(st.left)}s`;
  el.style.display = 'block';
  el.innerHTML = `<b>${quest.def.title}</b><br>${st.text}${extra}`;
}

// ---------- actions
function useBone() {
  if (zoomT > 0 || bones <= 0) return;
  bones--; zoomT = 4.5; distract = null;
  banner('ZOOMIES!!!', 1.5, 'gold'); sfx.zoom(); refreshHUD();
}
function bark() {
  if (barkT > 0) return;
  barkT = 1.2; sfx.bark();
  for (const s of squirrels) if (s.state === 'ground' && dist(dog, s) < 13) { s.state = 'flee'; s.scared = true; }
  if (distract) { distract = null; distractCD = 7; toast('Woof! Focus regained.'); }
}
function nearestInteract() {
  if (dist(dog, PLACES.post) < 5) return { text: 'Pick up a mail route', run: takeRoute };
  if (!quest) for (const n of npcs) if (n.cooldown <= 0 && dist(dog, n.pos) < 4) return { text: `Talk to ${n.q.name}`, run: () => openDialog(n) };
  return null;
}
function interact() { const i = nearestInteract(); if (i) i.run(); }

// ---------- movement & collisions
function resolve(p, r) {
  let hit = false;
  for (const b of W.colliders) {
    const cx = clamp(p.x, b.minX, b.maxX), cz = clamp(p.z, b.minZ, b.maxZ);
    const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    hit = true;
    if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = cx + (dx / d) * r; p.z = cz + (dz / d) * r; }
    else {
      const l = p.x - b.minX, rr = b.maxX - p.x, t = p.z - b.minZ, bb = b.maxZ - p.z, m = Math.min(l, rr, t, bb);
      if (m === l) p.x = b.minX - r; else if (m === rr) p.x = b.maxX + r; else if (m === t) p.z = b.minZ - r; else p.z = b.maxZ + r;
    }
  }
  for (const c of W.circles) {
    const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), min = r + c.r;
    if (d < min && d > 1e-6) { hit = true; p.x = c.x + (dx / d) * min; p.z = c.z + (dz / d) * min; }
  }
  const bx = clamp(p.x, BOUNDS.minX + 1, BOUNDS.maxX - 1), bz = clamp(p.z, BOUNDS.minZ + 1, BOUNDS.maxZ - 1);
  if (bx !== p.x || bz !== p.z) { hit = true; p.x = bx; p.z = bz; }
  return hit;
}
function updateDog(dt, t) {
  const k = (c) => keys.has(c);
  const fwd = (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0);
  let turn = (k('KeyA') || k('ArrowLeft') ? 1 : 0) - (k('KeyD') || k('ArrowRight') ? 1 : 0);
  if (dialog) { dog.speed *= 0.8; return 'normal'; }
  const max = maxSpeed();
  let target, turnRate = 2.9, mood = 'normal';
  distractCD = Math.max(0, distractCD - dt); barkT = Math.max(0, barkT - dt); bonkT = Math.max(0, bonkT - dt);
  if (zoomT > 0) {
    mood = 'zoom'; zoomT -= dt;
    target = max * 2.4; turnRate = 1.0;                       // barely steerable
    dog.yaw += (Math.sin(t * 9) * 1.1 + Math.sin(t * 3.7) * 0.9) * dt;
    if (zoomT <= 0) toast('Phew... zoomies over.');
  } else if (distract) {
    mood = 'distract'; distract.t -= dt;
    const sq = distract.sq;
    if (distract.t <= 0 || sq.state === 'tree') { distract = null; distractCD = 9; toast('...what was I doing again?'); }
    else {
      const want = Math.atan2(sq.x - dog.x, sq.z - dog.z);
      dog.yaw += clamp(angDiff(want, dog.yaw), -2.8 * dt, 2.8 * dt);
      turn *= 0.3; target = max * 0.95;
    }
  }
  if (target === undefined) target = fwd > 0 ? max : fwd < 0 ? -max * 0.4 : 0;
  if (W.inPond(dog.x, dog.z)) target *= 0.5;
  dog.speed += (target - dog.speed) * Math.min(1, dt * (mood === 'zoom' ? 4 : 7));
  dog.yaw += turn * turnRate * dt;
  dog.x += Math.sin(dog.yaw) * dog.speed * dt;
  dog.z += Math.cos(dog.yaw) * dog.speed * dt;
  const hit = resolve(dog, 0.55);
  if (hit && mood === 'zoom' && bonkT <= 0) {
    bonkT = 0.5; dog.yaw += (Math.random() < 0.5 ? -1 : 1) * (1.6 + Math.random() * 1.2); dog.speed *= 0.4;
    banner('BONK!', 0.6, 'red'); sfx.bonk();
  }
  return mood;
}

// ---------- camera
let camYaw = dog.yaw;
const camPos = new THREE.Vector3(), look = new THREE.Vector3();
const insideBox = (x, z) => W.colliders.some((b) => x > b.minX - 0.6 && x < b.maxX + 0.6 && z > b.minZ - 0.6 && z < b.maxZ + 0.6);
function updateCamera(dt, t, mood) {
  camYaw += angDiff(dog.yaw, camYaw) * Math.min(1, dt * (mood === 'zoom' ? 2.2 : 3.5));
  const y = W.heightAt(dog.x, dog.z);
  const selfie = keys.has('KeyC');                 // hold C to admire your Boston from the front
  const cy = selfie ? camYaw + Math.PI : camYaw;
  let d = selfie ? 3.2 : camDist;
  for (let i = 0; i < 6 && insideBox(dog.x - Math.sin(cy) * d, dog.z - Math.cos(cy) * d); i++) d *= 0.72;
  camPos.set(dog.x - Math.sin(cy) * d, y + (selfie ? 0.9 : 1.4 + d * 0.38), dog.z - Math.cos(cy) * d);
  if (mood === 'zoom') camPos.add(new THREE.Vector3(Math.sin(t * 40) * 0.12, Math.sin(t * 33) * 0.1, 0));
  camera.position.lerp(camPos, Math.min(1, dt * 8));
  if (selfie) look.set(dog.x, y + 0.7, dog.z); else look.set(dog.x + Math.sin(camYaw) * 2, y + 1.1, dog.z + Math.cos(camYaw) * 2);
  camera.lookAt(look);
  const fov = mood === 'zoom' ? 80 : 60;
  if (Math.abs(camera.fov - fov) > 0.1) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix(); }
}

// ---------- minimap & compass
const mini = $('minimap'), mctx = mini.getContext('2d');
const miniBase = document.createElement('canvas'); miniBase.width = mini.width; miniBase.height = mini.height;
W.drawMinimapBase(miniBase.getContext('2d'), mini.width, mini.height);
const MX = (x) => ((x - BOUNDS.minX) / (BOUNDS.maxX - BOUNDS.minX)) * mini.width;
const MZ = (z) => ((z - BOUNDS.minZ) / (BOUNDS.maxZ - BOUNDS.minZ)) * mini.height;
function drawMinimap() {
  mctx.drawImage(miniBase, 0, 0);
  const dot = (p, c, r = 4) => { mctx.fillStyle = c; mctx.strokeStyle = '#fff'; mctx.lineWidth = 1.5; mctx.beginPath(); mctx.arc(MX(p.x), MZ(p.z), r, 0, 7); mctx.fill(); mctx.stroke(); };
  for (const n of npcs) if (n.mark.visible) dot(n.pos, '#ffd23f', 3.5);
  for (const it of bag) dot(it.addr, '#' + TYPES[it.type].color.toString(16).padStart(6, '0'));
  if (quest) { const st = quest.steps[quest.i]; (st.type === 'goto' ? [st.pos] : st.type === 'collect' ? st.points.filter((p) => !p.got) : []).forEach((p) => dot(p, '#a45ee5', 4.5)); }
  mctx.save(); mctx.translate(MX(dog.x), MZ(dog.z)); mctx.rotate(Math.atan2(Math.sin(dog.yaw), -Math.cos(dog.yaw)));
  mctx.fillStyle = '#2e2624'; mctx.strokeStyle = '#fff'; mctx.lineWidth = 2;
  mctx.beginPath(); mctx.moveTo(0, -8); mctx.lineTo(6, 6); mctx.lineTo(0, 3); mctx.lineTo(-6, 6); mctx.closePath(); mctx.fill(); mctx.stroke();
  mctx.restore();
}
function currentTarget() {
  if (quest) {
    const st = quest.steps[quest.i];
    if (st.type === 'goto') return { pos: st.pos, label: st.text };
    if (st.type === 'collect') { const p = st.points.filter((q) => !q.got).sort((a, b) => dist(dog, a) - dist(dog, b))[0]; if (p) return { pos: p, label: st.text }; }
    if (st.type === 'chase') return null;
  }
  if (bag.length) { const it = [...bag].sort((a, b) => dist(dog, a.addr) - dist(dog, b.addr))[0]; return { pos: it.addr, label: `${TYPES[it.type].icon} ${it.addr.label}` }; }
  return { pos: PLACES.post, label: '📯 Postamt: pick up a route' };
}
function updateCompass() {
  const tg = currentTarget();
  $('compass').style.display = tg ? 'flex' : 'none';
  if (!tg) return;
  const rel = angDiff(Math.atan2(tg.pos.x - dog.x, tg.pos.z - dog.z), camYaw);
  $('arrow').style.transform = `rotate(${-rel}rad)`;
  $('target').textContent = `${tg.label} · ${Math.round(dist(dog, tg.pos))} m`;
}

// ---------- main loop
let last = performance.now(), hudT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000), t = now / 1000; last = now;
  W.update(t);
  if (!started) { // slow fly-around behind the menu
    camera.position.set(-40 + Math.sin(t * 0.08) * 150, 70, 10 + Math.cos(t * 0.08) * 130);
    camera.lookAt(-30, 0, 0);
    sun.position.set(40, 90, 30); sun.target.position.set(-30, 0, 0);
    renderer.render(scene, camera);
    return;
  }
  const mood = updateDog(dt, t);
  updateSquirrels(dt, t);
  updatePickups(dt, t);
  checkDeliveries();
  updateQuest(dt, t);

  boston.group.position.set(dog.x, W.heightAt(dog.x, dog.z), dog.z);
  boston.group.rotation.y = dog.yaw;
  boston.animate(dt, Math.abs(dog.speed) / 11, mood, t);
  for (const b of beams.values()) b.userData.ring.scale.setScalar(1 + Math.sin(t * 4) * 0.12);

  updateCamera(dt, t, mood);
  sun.position.set(dog.x + 45, 80, dog.z + 30); sun.target.position.set(dog.x, 0, dog.z);

  if (bannerT > 0 && (bannerT -= dt) <= 0) $('banner').className = '';
  if ((hudT -= dt) <= 0) {
    hudT = 0.2;
    $('location').textContent = W.locationName(dog.x, dog.z);
    const i = dialog ? null : nearestInteract();
    $('prompt').style.display = i ? 'block' : 'none';
    if (i) $('prompt').innerHTML = `<kbd>E</kbd> ${i.text}`;
    $('status').textContent = mood === 'zoom' ? '⚡ ZOOMIES' : mood === 'distract' ? '🐿️ Distracted! (B to bark it off)' : '';
    renderBag(); renderQuest(); updateCompass();
  }
  drawMinimap();
  renderer.render(scene, camera);
}

$('play').addEventListener('click', () => {
  $('menu').style.display = 'none'; $('hud').style.display = 'block';
  started = true;
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* no audio */ }
  camera.position.set(dog.x - 8, 5, dog.z);
  refreshHUD(); renderBag();
  toast('Visit the yellow Postamt 📯 and press E to start a route.');
});
refreshHUD();
requestAnimationFrame(frame);

// small debugging handle
window.__game = { dog, S, W, get bag() { return bag; }, get quest() { return quest; }, squirrels };
