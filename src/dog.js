// The hero: a senior Boston Terrier with a crocheted bow tie and mail saddlebags.
// Built facing +Z. `bow` color is configurable so other players can be told apart later.
import * as THREE from 'three';

export function createBoston({ bow = 0x5b5a35, bib = 0xa89684 } = {}) {
  const L = (c) => new THREE.MeshLambertMaterial({ color: c });
  const coat = L(0x3b302b), white = L(0xf6f1ea), grey = L(0xd9d2c8), black = L(0x141110);
  const sphere = new THREE.SphereGeometry(1, 20, 14);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const part = (geo, mat, x, y, z, sx = 1, sy = sx, sz = sx, parent = body) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; parent.add(m);
    return m;
  };

  // torso + white chest
  part(sphere, coat, 0, 0.78, 0, 0.47, 0.45, 0.85);
  part(sphere, white, 0, 0.7, 0.52, 0.38, 0.4, 0.36);
  part(sphere, coat, 0, 0.92, -0.86, 0.09); // nub tail

  // head
  const head = new THREE.Group();
  head.position.set(0, 1.25, 0.82);
  body.add(head);
  part(sphere, coat, 0, 0, 0, 0.43, 0.4, 0.4, head);
  part(sphere, white, 0, 0.14, 0.26, 0.09, 0.27, 0.17, head);       // blaze
  part(sphere, grey, 0, -0.13, 0.33, 0.3, 0.2, 0.2, head);          // greying muzzle
  part(sphere, black, 0, -0.05, 0.53, 0.11, 0.07, 0.06, head);      // nose
  part(new THREE.BoxGeometry(0.3, 0.025, 0.05), black, 0, -0.24, 0.49, 1, 1, 1, head); // grumpy mouth
  for (const s of [-1, 1]) {
    part(sphere, L(0x2a160c), s * 0.24, 0.06, 0.3, 0.12, 0.12, 0.09, head);                // big brown eyes
    part(sphere, white, s * 0.24 + 0.035, 0.11, 0.385, 0.03, 0.03, 0.02, head);
    const ear = part(new THREE.ConeGeometry(0.17, 0.46, 8), coat, s * 0.27, 0.48, -0.05, 1, 1, 0.55, head);
    ear.rotation.z = -s * 0.22;
    ear.name = 'ear';
  }

  // collar + crocheted bow tie on a taupe bib
  const collar = part(new THREE.TorusGeometry(0.3, 0.05, 8, 20), L(bow), 0, 1.0, 0.66);
  collar.rotation.x = Math.PI / 2 - 0.55;
  part(new THREE.BoxGeometry(0.46, 0.3, 0.05), L(bib), 0, 0.86, 0.9);
  for (const s of [-1, 1]) {
    const wing = part(new THREE.ConeGeometry(0.15, 0.26, 4), L(bow), s * 0.15, 0.86, 0.95, 1, 1, 0.5);
    wing.rotation.z = s * Math.PI / 2;
  }
  part(sphere, L(bib), 0, 0.86, 0.97, 0.05);

  // mail saddlebags
  const leather = L(0xb07a3c);
  for (const s of [-1, 1]) part(new THREE.BoxGeometry(0.16, 0.34, 0.5), leather, s * 0.5, 0.78, -0.05);
  part(new THREE.BoxGeometry(0.9, 0.04, 0.12), leather, 0, 1.23, -0.05);
  const letter = part(new THREE.BoxGeometry(0.03, 0.2, 0.3), white, 0.5, 1.0, -0.05);
  letter.rotation.x = 0.2;

  // legs: dark thighs, white socks
  const legs = [];
  for (const [x, z] of [[-0.25, 0.5], [0.25, 0.5], [-0.25, -0.5], [0.25, -0.5]]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.6, z);
    part(new THREE.CylinderGeometry(0.11, 0.1, 0.36, 8), coat, 0, -0.14, 0, 1, 1, 1, leg);
    part(new THREE.CylinderGeometry(0.095, 0.09, 0.28, 8), white, 0, -0.44, 0, 1, 1, 1, leg);
    part(sphere, white, 0, -0.57, 0.04, 0.11, 0.06, 0.14, leg);
    root.add(leg); legs.push(leg);
  }
  const ears = head.children.filter((c) => c.name === 'ear');

  root.scale.setScalar(0.62);
  let phase = 0;
  return {
    group: root,
    head,
    // speedN: 0..1+ movement intensity; mood: 'normal' | 'zoom' | 'distract'
    animate(dt, speedN, mood, t) {
      phase += dt * (6 + speedN * 14);
      const amp = Math.min(1.1, speedN) * 0.8;
      legs[0].rotation.x = Math.sin(phase) * amp; legs[3].rotation.x = Math.sin(phase) * amp;
      legs[1].rotation.x = -Math.sin(phase) * amp; legs[2].rotation.x = -Math.sin(phase) * amp;
      body.position.y = Math.abs(Math.sin(phase)) * 0.06 * Math.min(1, speedN);
      body.rotation.z = mood === 'zoom' ? Math.sin(t * 18) * 0.12 : 0;
      head.rotation.z = mood === 'distract' ? 0.35 : Math.sin(t * 1.3) * 0.04;
      head.rotation.x = mood === 'zoom' ? -0.25 : 0;
      const flap = mood === 'zoom' ? Math.sin(t * 30) * 0.3 : 0;
      ears[0].rotation.x = ears[1].rotation.x = -0.5 * Math.min(1, speedN) * (mood === 'zoom' ? 1.6 : 0.5) + flap;
    },
  };
}
