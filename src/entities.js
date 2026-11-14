// Small props and characters: neighbors, squirrels, bones, socks, target beams.
import * as THREE from 'three';

const L = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
const sphere = new THREE.SphereGeometry(1, 14, 10);

function part(parent, geo, mat, x, y, z, sx = 1, sy = sx, sz = sx) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; parent.add(m);
  return m;
}

export function makePerson(coat = 0x9b6fa8, hair = 0x5a3a22, skin = 0xf0c8a0, scale = 1.3) {
  const g = new THREE.Group();
  for (const s of [-1, 1]) part(g, new THREE.CylinderGeometry(0.16, 0.16, 0.9, 8), L(0x3d4658), s * 0.2, 0.45, 0);
  part(g, new THREE.CylinderGeometry(0.4, 0.52, 1.2, 12), L(coat), 0, 1.45, 0);
  for (const s of [-1, 1]) part(g, new THREE.CylinderGeometry(0.11, 0.11, 0.9, 8), L(coat), s * 0.55, 1.5, 0);
  part(g, sphere, L(skin), 0, 2.38, 0, 0.36);
  part(g, new THREE.SphereGeometry(1, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), L(hair), 0, 2.42, -0.03, 0.39);
  for (const s of [-1, 1]) part(g, sphere, L(0x221a16), s * 0.13, 2.42, 0.33, 0.04);
  g.scale.setScalar(scale);
  return g;
}

export function makeSquirrel() {
  const g = new THREE.Group();
  const fur = L(0xb5581e);
  part(g, sphere, fur, 0, 0.3, 0, 0.22, 0.24, 0.34);
  part(g, sphere, fur, 0, 0.55, 0.3, 0.16);
  part(g, sphere, L(0xf3e6d2), 0, 0.26, 0.12, 0.15, 0.17, 0.2);
  for (const s of [-1, 1]) part(g, new THREE.ConeGeometry(0.05, 0.14, 5), fur, s * 0.09, 0.72, 0.28);
  const tail = part(g, sphere, L(0xc96a28), 0, 0.62, -0.34, 0.16, 0.42, 0.18);
  tail.rotation.x = -0.35;
  g.scale.setScalar(1.25);
  return g;
}

export function makeBone() {
  const g = new THREE.Group();
  const m = L(0xfff7e8, { emissive: 0x554a30 });
  const shaft = part(g, new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8), m, 0, 0, 0);
  shaft.rotation.z = Math.PI / 2;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) part(g, sphere, m, sx * 0.42, sy * 0.11, 0, 0.17);
  return g;
}

export function makeSock(color = 0xe94f64) {
  const g = new THREE.Group();
  part(g, new THREE.BoxGeometry(0.3, 0.6, 0.26), L(color), 0, 0.2, 0);
  part(g, new THREE.BoxGeometry(0.55, 0.28, 0.26), L(color), 0.13, -0.2, 0);
  part(g, new THREE.BoxGeometry(0.32, 0.12, 0.28), L(0xffffff), 0, 0.5, 0);
  part(g, new THREE.BoxGeometry(0.32, 0.08, 0.28), L(0xffffff), 0, 0.22, 0);
  return g;
}

export function makeOrb(color = 0xffc93c) {
  const g = new THREE.Group();
  part(g, sphere, L(color, { emissive: color, emissiveIntensity: 0.4 }), 0, 0, 0, 0.45);
  return g;
}

const beamGeo = new THREE.CylinderGeometry(0.7, 0.7, 60, 12, 1, true);
const ringGeo = new THREE.TorusGeometry(2.2, 0.12, 6, 28);
export function makeBeam(color) {
  const g = new THREE.Group();
  const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 30;
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.3;
  g.add(beam, ring);
  g.userData.ring = ring;
  return g;
}
