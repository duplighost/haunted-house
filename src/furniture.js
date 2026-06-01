// furniture.js — primitive-built props for a lived-in family home.
// Every builder returns a THREE.Group positioned with its origin at the floor.
import * as THREE from 'three';

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.85, metalness: opts.metal ?? 0.0, emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.ei ?? 1, ...opts });

const box = (w, h, d, material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
};
const cyl = (rt, rb, h, material, x = 0, y = 0, z = 0, seg = 12) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
};

const WOOD = mat(0x4a3526), WOOD_DK = mat(0x32241a), FABRIC = mat(0x5b4636), FABRIC2 = mat(0x6d2e2e);
const METAL = mat(0x6a6a72, { metal: 0.7, rough: 0.4 }), WHITE = mat(0xd8d4c8), DARK = mat(0x1c1c20);
const GLASS = new THREE.MeshStandardMaterial({ color: 0x223036, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.35 });

export function makeSofa() {
  const g = new THREE.Group();
  g.add(box(2.4, 0.5, 0.95, FABRIC, 0, 0.3, 0));        // base
  g.add(box(2.4, 0.6, 0.25, FABRIC, 0, 0.75, -0.35));   // back
  g.add(box(0.25, 0.65, 0.95, FABRIC, -1.07, 0.62, 0)); // arms
  g.add(box(0.25, 0.65, 0.95, FABRIC, 1.07, 0.62, 0));
  g.add(box(1.0, 0.18, 0.8, FABRIC2, -0.55, 0.62, 0.05));
  g.add(box(1.0, 0.18, 0.8, FABRIC2, 0.55, 0.62, 0.05));
  return g;
}
export function makeArmchair() {
  const g = new THREE.Group();
  g.add(box(0.95, 0.45, 0.9, FABRIC, 0, 0.28, 0));
  g.add(box(0.95, 0.6, 0.2, FABRIC, 0, 0.7, -0.32));
  g.add(box(0.18, 0.55, 0.9, FABRIC, -0.45, 0.55, 0));
  g.add(box(0.18, 0.55, 0.9, FABRIC, 0.45, 0.55, 0));
  return g;
}
export function makeCoffeeTable() {
  const g = new THREE.Group();
  g.add(box(1.3, 0.1, 0.7, WOOD, 0, 0.45, 0));
  for (const [x, z] of [[-0.55,-0.27],[0.55,-0.27],[-0.55,0.27],[0.55,0.27]]) g.add(box(0.08, 0.45, 0.08, WOOD_DK, x, 0.22, z));
  g.add(box(0.4, 0.02, 0.3, mat(0x2a3a44), -0.2, 0.51, 0)); // a book
  return g;
}
export function makeTV() {
  const g = new THREE.Group();
  g.add(box(1.4, 0.5, 0.4, WOOD_DK, 0, 0.25, 0));       // console
  const screen = box(1.5, 0.85, 0.07, DARK, 0, 1.05, -0.05);
  g.add(screen);
  g.add(box(1.62, 0.97, 0.05, mat(0x0a0a0c), 0, 1.05, -0.09));
  return g;
}
export function makeBookshelf() {
  const g = new THREE.Group();
  g.add(box(1.6, 2.4, 0.4, WOOD_DK, 0, 1.2, 0));
  const colors = [0x5a2b2b, 0x2b3a5a, 0x3a5a2b, 0x6a5a2b, 0x4a2b5a, 0x70402b];
  for (let s = 0; s < 5; s++) {
    g.add(box(1.5, 0.04, 0.36, WOOD, 0, 0.35 + s * 0.46, 0)); // shelf
    let x = -0.66;
    while (x < 0.66) {
      const w = 0.05 + Math.random() * 0.06, h = 0.28 + Math.random() * 0.1;
      g.add(box(w, h, 0.26, mat(colors[(Math.random() * colors.length) | 0]), x, 0.37 + s * 0.46 + h / 2, 0));
      x += w + 0.012;
    }
  }
  return g;
}
export function makeFireplace() {
  const g = new THREE.Group();
  const stone = mat(0x3a3632);
  g.add(box(2.2, 2.0, 0.5, stone, 0, 1.0, 0));
  g.add(box(1.2, 1.0, 0.55, DARK, 0, 0.6, 0.02)); // opening
  g.add(box(2.5, 0.2, 0.7, stone, 0, 1.35, 0.05)); // mantel
  // embers (emissive, subtle)
  const ember = box(1.0, 0.18, 0.4, mat(0x000000, { emissive: 0xff5512, ei: 1.6, rough: 1 }), 0, 0.22, 0.05);
  g.add(ember); g.userData.ember = ember;
  return g;
}
export function makeRug(w = 3, d = 2, color = 0x5a2f2f) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(color, { rough: 1 }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.receiveShadow = true;
  const g = new THREE.Group(); g.add(m); return g;
}
export function makeFloorLamp() {
  const g = new THREE.Group();
  g.add(cyl(0.04, 0.04, 1.6, METAL, 0, 0.8, 0));
  g.add(cyl(0.25, 0.18, 0.3, mat(0xb9a06a, { emissive: 0x000000 }), 0, 1.6, 0));
  const bulb = new THREE.PointLight(0xffd9a0, 0, 6, 2);
  bulb.position.set(0, 1.55, 0);
  g.add(bulb); g.userData.light = bulb;
  return g;
}
export function makeKitchenCounter() {
  const g = new THREE.Group();
  g.add(box(3.4, 0.9, 0.7, mat(0x6f6258), 0, 0.45, 0)); // cabinets
  g.add(box(3.5, 0.08, 0.75, mat(0x2c2c30, { rough: 0.4 }), 0, 0.92, 0)); // countertop
  // sink basin
  g.add(box(0.7, 0.2, 0.5, METAL, 0.7, 0.86, 0));
  g.add(cyl(0.03, 0.03, 0.35, METAL, 0.7, 1.1, -0.15)); // faucet
  g.add(box(0.05, 0.15, 0.05, METAL, 0.7, 1.25, -0.15));
  return g;
}
export function makeFridge() {
  const g = new THREE.Group();
  g.add(box(0.9, 1.9, 0.8, mat(0xc9c6bd, { metal: 0.3, rough: 0.4 }), 0, 0.95, 0));
  g.add(box(0.05, 0.5, 0.05, METAL, -0.38, 1.3, 0.42));
  return g;
}
export function makeStove() {
  const g = new THREE.Group();
  g.add(box(0.9, 0.9, 0.7, mat(0x3a3a3e, { metal: 0.4, rough: 0.4 }), 0, 0.45, 0));
  for (const [x, z] of [[-0.2,-0.15],[0.2,-0.15],[-0.2,0.15],[0.2,0.15]]) g.add(cyl(0.1, 0.1, 0.02, DARK, x, 0.91, z));
  return g;
}
export function makeDiningTable() {
  const g = new THREE.Group();
  g.add(box(2.6, 0.1, 1.2, WOOD, 0, 0.78, 0));
  for (const [x, z] of [[-1.1,-0.45],[1.1,-0.45],[-1.1,0.45],[1.1,0.45]]) g.add(box(0.1, 0.78, 0.1, WOOD_DK, x, 0.39, z));
  // chairs
  const chair = (cx, cz, rot) => {
    const c = new THREE.Group();
    c.add(box(0.45, 0.06, 0.45, WOOD, 0, 0.45, 0));
    c.add(box(0.45, 0.5, 0.06, WOOD, 0, 0.7, -0.2));
    for (const [x, z] of [[-0.18,-0.18],[0.18,-0.18],[-0.18,0.18],[0.18,0.18]]) c.add(box(0.05, 0.45, 0.05, WOOD_DK, x, 0.22, z));
    c.position.set(cx, 0, cz); c.rotation.y = rot; g.add(c);
  };
  chair(-1.0, 0.95, 0); chair(1.0, 0.95, 0); chair(-1.0, -0.95, Math.PI); chair(1.0, -0.95, Math.PI);
  // place settings (plates)
  for (const x of [-0.8, 0.8]) for (const z of [0.45, -0.45]) g.add(cyl(0.16, 0.16, 0.02, WHITE, x, 0.84, z));
  return g;
}
export function makeChandelier() {
  const g = new THREE.Group();
  g.add(cyl(0.02, 0.02, 0.6, METAL, 0, 0.3, 0));
  g.add(cyl(0.3, 0.4, 0.12, mat(0x70603a, { metal: 0.5 }), 0, 0, 0));
  const light = new THREE.PointLight(0xffcf95, 0, 8, 2);
  g.add(light); g.userData.light = light;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.add(box(0.05, 0.18, 0.05, mat(0xfff0c0, { emissive: 0xffd070, ei: 0.4 }), Math.cos(a) * 0.35, 0.12, Math.sin(a) * 0.35));
  }
  return g;
}
export function makeBed(childSize = false) {
  const g = new THREE.Group();
  const w = childSize ? 1.0 : 1.6, d = childSize ? 1.9 : 2.0;
  g.add(box(w, 0.4, d, WOOD_DK, 0, 0.2, 0));
  g.add(box(w, 0.2, d * 0.9, mat(childSize ? 0x3a5a6a : 0x6a6055), 0, 0.5, 0.03)); // mattress/duvet
  g.add(box(w * 0.7, 0.15, 0.4, WHITE, 0, 0.58, -d / 2 + 0.3)); // pillow
  g.add(box(w + 0.1, 0.7, 0.1, WOOD, 0, 0.45, -d / 2)); // headboard
  return g;
}
export function makeDresser() {
  const g = new THREE.Group();
  g.add(box(1.2, 1.0, 0.5, WOOD, 0, 0.5, 0));
  for (let i = 0; i < 3; i++) g.add(box(1.0, 0.04, 0.02, METAL, 0, 0.3 + i * 0.28, 0.26));
  return g;
}
export function makeNightstand() {
  const g = new THREE.Group();
  g.add(box(0.5, 0.5, 0.5, WOOD, 0, 0.25, 0));
  return g;
}
export function makeDesk() {
  const g = new THREE.Group();
  g.add(box(1.5, 0.08, 0.7, WOOD, 0, 0.75, 0));
  g.add(box(0.5, 0.7, 0.65, WOOD_DK, -0.45, 0.35, 0));
  g.add(box(0.06, 0.75, 0.06, WOOD_DK, 0.65, 0.37, -0.3));
  g.add(box(0.06, 0.75, 0.06, WOOD_DK, 0.65, 0.37, 0.3));
  return g;
}
export function makeTrainSet() {
  const g = new THREE.Group();
  const r = 0.9;
  // oval track
  const track = new THREE.Mesh(new THREE.TorusGeometry(r, 0.04, 8, 40), mat(0x4a3a2a));
  track.rotation.x = -Math.PI / 2; track.position.y = 0.04; g.add(track);
  // train (animated around track)
  const train = new THREE.Group();
  train.add(box(0.22, 0.18, 0.34, mat(0x7a2222), 0, 0.16, 0));
  train.add(cyl(0.06, 0.06, 0.16, DARK, 0, 0.28, -0.08));
  train.position.set(r, 0, 0);
  g.add(train);
  g.userData.train = train; g.userData.r = r;
  // scattered blocks
  for (let i = 0; i < 6; i++) g.add(box(0.12, 0.12, 0.12, mat([0x6a8a3a,0x3a6a8a,0x8a6a3a,0x8a3a6a][i%4]), (Math.random()-0.5)*1.6, 0.06, (Math.random()-0.5)*1.6));
  return g;
}
export function makePainting(w = 0.9, h = 1.1, hue = 0x2a3038) {
  const g = new THREE.Group();
  g.add(box(w + 0.1, h + 0.1, 0.06, mat(0x5a4a2a, { metal: 0.3 }), 0, 0, 0)); // frame
  g.add(box(w, h, 0.02, mat(hue), 0, 0, 0.04));
  return g;
}
export function makeWindow() {
  const g = new THREE.Group();
  g.add(box(1.4, 1.8, 0.08, GLASS, 0, 0, 0));
  g.add(box(1.5, 0.1, 0.12, WOOD_DK, 0, 0.9, 0));
  g.add(box(1.5, 0.1, 0.12, WOOD_DK, 0, -0.9, 0));
  g.add(box(0.1, 1.8, 0.12, WOOD_DK, 0, 0, 0));
  g.add(box(1.4, 0.1, 0.12, WOOD_DK, 0, 0, 0));
  return g;
}

// The "strange" object at the end of the hall: a shrouded shape that reads as a
// figure in the dark, but is plainly a dress form draped with a sheet once lit.
export function makeShroudedFigure() {
  const g = new THREE.Group();
  const sheet = mat(0xdedbce, { rough: 1 });
  // body
  g.add(cyl(0.18, 0.34, 1.1, sheet, 0, 0.95, 0, 10));
  // "head" lump
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), sheet);
  head.position.set(0, 1.62, 0); head.castShadow = true; g.add(head);
  // stand legs revealed under sheet
  g.add(cyl(0.03, 0.03, 0.4, METAL, 0, 0.2, 0));
  g.add(box(0.5, 0.04, 0.04, METAL, 0, 0.02, 0));
  g.add(box(0.04, 0.04, 0.5, METAL, 0, 0.02, 0));
  return g;
}

// A simple low-poly humanoid. Returns group with arm pivots for light animation.
export function makeHuman({ skin = 0xb08968, top = 0x3a4a5a, bottom = 0x2a2a30, hair = 0x2a1c12, height = 1.7 } = {}) {
  const g = new THREE.Group();
  const s = height / 1.7; // scale factor
  const skinM = mat(skin, { rough: 0.9 }), topM = mat(top), botM = mat(bottom), hairM = mat(hair);
  const legL = box(0.16 * s, 0.8 * s, 0.16 * s, botM, -0.12 * s, 0.4 * s, 0);
  const legR = box(0.16 * s, 0.8 * s, 0.16 * s, botM, 0.12 * s, 0.4 * s, 0);
  g.add(legL, legR);
  const torso = box(0.5 * s, 0.7 * s, 0.28 * s, topM, 0, 1.15 * s, 0);
  g.add(torso);
  // arms with shoulder pivots for animation
  const mkArm = (sx) => {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.32 * s, 1.45 * s, 0);
    const arm = box(0.13 * s, 0.62 * s, 0.13 * s, topM, 0, -0.31 * s, 0);
    pivot.add(arm); g.add(pivot); return pivot;
  };
  const armL = mkArm(-1), armR = mkArm(1);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17 * s, 14, 12), skinM);
  head.position.set(0, 1.68 * s, 0); head.castShadow = true; g.add(head);
  const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18 * s, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.6), hairM);
  hairMesh.position.set(0, 1.7 * s, 0); g.add(hairMesh);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.armL = armL; g.userData.armR = armR; g.userData.height = height;
  return g;
}

export function makePoliceOfficer() {
  const g = makeHuman({ skin: 0xc09a78, top: 0x1f2a40, bottom: 0x161c2a, hair: 0x1a1a1a, height: 1.82 });
  // cap
  const cap = new THREE.Group();
  cap.add(cyl(0.2, 0.2, 0.12, mat(0x10131c), 0, 0.06, 0));
  cap.add(box(0.4, 0.02, 0.18, mat(0x10131c), 0, 0.0, 0.18)); // brim
  cap.position.set(0, 1.84, 0); g.add(cap);
  // badge
  g.add(box(0.08, 0.08, 0.02, mat(0xd4af37, { metal: 0.8, rough: 0.3, emissive: 0x4a3a00, ei: 0.4 }), -0.14, 1.2, 0.15));
  return g;
}
