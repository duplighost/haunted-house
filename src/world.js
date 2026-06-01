// world.js — builds the mansion: shell, two floors, staircase, interior walls
// (with doorway gaps), furnished rooms, and the lighting rig.
//
// Coordinate convention:  +X east, -X west, +Z south (entrance), -Z north (deep).
// Ground floor feet y = 0.  Upper floor feet y = UPPER (3.4).
// The two-storey section is the north half (z < -2); south rooms are single-storey.
import * as THREE from 'three';
import * as F from './furniture.js';

export const UPPER = 3.4;
const WALL_H = 3.2;          // per-storey wall height
const T = 0.2;               // wall thickness
const BOUND = { minX: -13.6, maxX: 13.6, minZ: -19.6, maxZ: 13.6 };

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];     // {minX,maxX,minZ,maxZ,floor}  floor: 0,1,or -1(all)
    this.roomLights = [];    // PointLights toggled ON at the ending
    this.triggers = [];      // {minX,maxX,minZ,maxZ,floor,fn,once,fired,id}
    this.mats = this._materials();
    this._build();
  }

  _materials() {
    return {
      floorWood: new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.9 }),
      floorTile: new THREE.MeshStandardMaterial({ color: 0x3a3a3c, roughness: 0.7 }),
      wall: new THREE.MeshStandardMaterial({ color: 0x534a3c, roughness: 0.95 }),
      wallPaper: new THREE.MeshStandardMaterial({ color: 0x4a4034, roughness: 1 }),
      ceiling: new THREE.MeshStandardMaterial({ color: 0x1a1712, roughness: 1 }),
      exterior: new THREE.MeshStandardMaterial({ color: 0x14130f, roughness: 1, side: THREE.DoubleSide }),
    };
  }

  // ---- low-level builders -------------------------------------------------
  _wall(x1, z1, x2, z2, floor, h = WALL_H, baseY = null) {
    const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
    const minZ = Math.min(z1, z2), maxZ = Math.max(z1, z2);
    const w = Math.max(maxX - minX, T), d = Math.max(maxZ - minZ, T);
    const by = baseY ?? (floor === 1 ? UPPER : 0);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.mats.wall);
    mesh.position.set((minX + maxX) / 2, by + h / 2, (minZ + maxZ) / 2);
    mesh.castShadow = true; mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.colliders.push({ minX: (minX+maxX)/2 - w/2, maxX: (minX+maxX)/2 + w/2,
                          minZ: (minZ+maxZ)/2 - d/2, maxZ: (minZ+maxZ)/2 + d/2, floor });
    return mesh;
  }
  // wall with a centered doorway gap along its run
  _wallGap(x1, z1, x2, z2, floor, gapCenter, gapW = 1.5, h = WALL_H) {
    const horizontal = Math.abs(x2 - x1) > Math.abs(z2 - z1);
    if (horizontal) {
      const g0 = gapCenter - gapW / 2, g1 = gapCenter + gapW / 2;
      this._wall(x1, z1, g0, z2, floor, h);
      this._wall(g1, z1, x2, z2, floor, h);
      this._doorTrim(g0, g1, (z1+z2)/2, floor, true, h);
    } else {
      const g0 = gapCenter - gapW / 2, g1 = gapCenter + gapW / 2;
      this._wall(x1, z1, x2, g0, floor, h);
      this._wall(x1, g1, x2, z2, floor, h);
      this._doorTrim(g0, g1, (x1+x2)/2, floor, false, h);
    }
  }
  _doorTrim(a0, a1, fixed, floor, horizontal, h) {
    const by = floor === 1 ? UPPER : 0;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? (a1-a0+0.2) : 0.25, 0.25, horizontal ? 0.25 : (a1-a0+0.2)), this.mats.wallPaper);
    lintel.position.set(horizontal ? (a0+a1)/2 : fixed, by + 2.1, horizontal ? fixed : (a0+a1)/2);
    this.scene.add(lintel);
  }
  _slab(minX, maxX, minZ, maxZ, y, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(maxX - minX, 0.2, maxZ - minZ), material);
    mesh.position.set((minX + maxX) / 2, y - 0.1, (minZ + maxZ) / 2);
    mesh.receiveShadow = true; this.scene.add(mesh); return mesh;
  }
  _place(obj, x, y, z, ry = 0) { obj.position.set(x, y, z); obj.rotation.y = ry; this.scene.add(obj); return obj; }

  _roomLight(x, y, z, color = 0xffd9a0, intensity = 1.0, dist = 11) {
    const l = new THREE.PointLight(color, 0, dist, 2);
    l.position.set(x, y, z); l.userData.onIntensity = intensity;
    this.scene.add(l); this.roomLights.push(l);
    return l;
  }
  addCollider(c) { this.colliders.push(c); }
  addTrigger(t) { t.fired = false; this.triggers.push(t); }

  // ---- the build ----------------------------------------------------------
  _build() {
    const M = this.mats;

    // Floors
    this._slab(BOUND.minX, BOUND.maxX, BOUND.minZ, BOUND.maxZ, 0, M.floorWood);          // ground
    this._slab(5, 13.6, 4, 13.6, 0.01, M.floorTile);                                     // kitchen tile
    this._slab(BOUND.minX, BOUND.maxX, -19.6, -2, UPPER, M.floorWood);                   // upper slab (north)

    // Ceilings — the central hall (x[-5,5], z[-2,6]) is left OPEN as a
    // double-height grand stair, so the ground ceiling wraps around it.
    this._slab(BOUND.minX, -5, -2, 13.6, WALL_H, M.ceiling);        // west wing
    this._slab(5, BOUND.maxX, -2, 13.6, WALL_H, M.ceiling);         // east wing
    this._slab(-5, 5, 6, 13.6, WALL_H, M.ceiling);                  // foyer (south of hall)
    this._slab(-5, 5, -2, 6, UPPER + WALL_H, M.ceiling);            // tall ceiling over the open hall
    this._slab(BOUND.minX, BOUND.maxX, -19.6, -2, UPPER + WALL_H, M.ceiling); // upper ceiling

    this._buildShell();
    this._buildStairs();
    this._buildGroundInterior();
    this._buildUpperInterior();
    this._furnish();
    this._lighting();
  }

  _buildShell() {
    // Exterior walls span both storeys on the north, single on the south.
    // South wall (entrance side) — solid; the player has already broken in.
    this._wall(BOUND.minX, BOUND.maxZ, BOUND.maxX, BOUND.maxZ, -1, WALL_H);
    // North wall (tall)
    this._wall(BOUND.minX, BOUND.minZ, BOUND.maxX, BOUND.minZ, -1, UPPER + WALL_H);
    // East & west walls
    this._wall(BOUND.maxX, BOUND.minZ, BOUND.maxX, BOUND.maxZ, -1, UPPER + WALL_H);
    this._wall(BOUND.minX, BOUND.minZ, BOUND.minX, BOUND.maxZ, -1, UPPER + WALL_H);

    // a faint front door on the inside of the south wall (visual)
    const door = F.makePainting(1.1, 2.1, 0x140f0a);
    this._place(door, 0, 1.1, BOUND.maxZ - 0.11);

    // exterior windows (moonlight slits) along several walls
    for (const [x, z, ry] of [[-13.4, 9, Math.PI/2], [-13.4, 2, Math.PI/2], [13.4, 9, -Math.PI/2],
                              [13.4, -4, -Math.PI/2], [-8, -19.4, 0], [8, -19.4, 0],
                              [-13.4, -14, Math.PI/2], [13.4, -14, -Math.PI/2]]) {
      const w = F.makeWindow(); this._place(w, x, 1.7, z, ry);
      if (z < -2) { const w2 = F.makeWindow(); this._place(w2, x, UPPER + 1.7, z, ry); }
    }
  }

  _buildStairs() {
    // Straight stair in the central hall, rising north (z: 4 -> -2) to UPPER.
    const steps = 14, run = 6 / steps, rise = UPPER / steps;
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x36281c, roughness: 0.9 });
    for (let i = 0; i < steps; i++) {
      const z = 4 - i * run - run / 2;
      const m = new THREE.Mesh(new THREE.BoxGeometry(3.2, rise + 0.04, run + 0.02), stepMat);
      m.position.set(0, (i + 0.5) * rise, z); m.castShadow = m.receiveShadow = true;
      this.scene.add(m);
    }
    // side rails (visual + collider so you don't walk off the sides)
    this.colliders.push({ minX: -1.8, maxX: -1.5, minZ: -2, maxZ: 4, floor: 0 });
    this.colliders.push({ minX: 1.5, maxX: 1.8, minZ: -2, maxZ: 4, floor: 0 });
    const rail = new THREE.MeshStandardMaterial({ color: 0x2a1f15 });
    for (const sx of [-1.65, 1.65]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 6.2), rail);
      r.position.set(sx, UPPER / 2 + 0.5, 1); r.rotation.x = -Math.atan2(UPPER, 6);
      this.scene.add(r);
    }
    // upper-floor edge railing at z=-2 (the drop), gap at stair mouth x[-1.6,1.6]
    this._wall(BOUND.minX, -2, -1.6, -2, 1, 1.0);
    this._wall(1.6, -2, BOUND.maxX, -2, 1, 1.0);
  }

  _buildGroundInterior() {
    // Foyer / living / kitchen / dining / library partitions (floor 0).
    // Living room (west): wall x=-5 from z=0..13.6 with door gap at z=10
    this._wallGap(-5, 0, -5, 13.6, 0, 9.5, 1.8);
    // Foyer south sub-wall separating foyer from central hall is open (grand hall)
    // Kitchen/dining (east): wall x=5 from z=-6..13.6 with door gaps
    this._wallGap(5, -6, 5, 13.6, 0, 8, 1.8);           // into kitchen
    // kitchen | dining divider at z=4, east side, gap
    this._wallGap(5, 4, 13.6, 4, 0, 10, 1.6);
    // Library (west) divider at z=0 (x -13.6..-5), gap
    this._wallGap(-13.6, 0, -5, 0, 0, -9, 1.6);
    // Back wall closing central hall area to north storage at z=-2 west & east of stair handled by upper edge.
    // Behind-stair partition so you funnel up the stairs (walls x=-5 and x=5 from z=-2..-6)
    this._wallGap(-5, -6, -5, -2, 0, -4, 1.6); // west of hall -> library back / passage
    this._wallGap(5, -6, 5, -2, 0, -4, 1.6);
    // north storage divider z=-12 across full width, central gap to reach... (dead storage)
    this._wallGap(-13.6, -12, 13.6, -12, 0, 0, 1.8);
  }

  _buildUpperInterior() {
    // Landing x[-6,6] z[-6,-2].  Bedrooms flank it; long hallway runs north to goal.
    // Boy's room (west): x[-13.6,-6], z[-12,-2]. wall at x=-6 z[-12,-2] gap at z=-4
    this._wallGap(-6, -12, -6, -2, 1, -4, 1.8);
    // Girl's room (east): x[6,13.6], z[-12,-2]. wall x=6 gap at z=-4
    this._wallGap(6, -12, 6, -2, 1, -4, 1.8);
    // long hallway: solid walls at x=-3 and x=3 from the landing (z=-6) north to
    // the goal-room door (z=-17), funneling the player toward the far room.
    this._wall(-3, -17, -3, -6, 1);
    this._wall(3, -17, 3, -6, 1);
    // close bedroom north sides at z=-12
    this._wall(-13.6, -12, -6, -12, 1);
    this._wall(6, -12, 13.6, -12, 1);
    // side rooms beside hallway (z[-17,-12]) walls
    this._wall(-13.6, -17, -3, -17, 1);
    this._wall(3, -17, 13.6, -17, 1);
    // GOAL ROOM: x[-8,8], z[-19.6,-17]. door gap at z=-17 x center 0
    this._wallGap(-8, -17, 8, -17, 1, 0, 1.8);
    this._wall(-8, -19.6, -8, -17, 1);
    this._wall(8, -19.6, 8, -17, 1);
  }

  _furnish() {
    const P = (o, x, y, z, r) => this._place(o, x, y, z, r);

    // ---------- LIVING ROOM (west, ground) — the Man ----------
    P(F.makeRug(3.4, 2.4, 0x4a2424), -9, 0, 8);
    P(F.makeSofa(), -9, 0, 9.6, Math.PI);
    P(F.makeArmchair(), -11.5, 0, 7.5, Math.PI / 2 + 0.3);
    P(F.makeCoffeeTable(), -9, 0, 8);
    P(F.makeTV(), -9, 0, 5.6, 0);
    P(F.makeFireplace(), -13.2, 0, 3, Math.PI / 2);
    P(F.makeBookshelf(), -6.2, 0, 12.2, Math.PI);
    P(F.makeFloorLamp(), -12.3, 0, 9.8);
    P(F.makePainting(1.0, 0.8, 0x223428), -9, 1.8, 13.4);

    // ---------- KITCHEN (east, ground) — the Woman ----------
    P(F.makeKitchenCounter(), 11.5, 0, 12.2, Math.PI);
    P(F.makeFridge(), 6.2, 0, 12.6, 0);
    P(F.makeStove(), 8.5, 0, 12.7, 0);
    P(F.makeKitchenCounter(), 13.0, 0, 8, -Math.PI / 2);
    P(F.makeDiningTable(), 9.5, 0, 6.5); // small breakfast table reuse

    // ---------- DINING ROOM (east, ground) ----------
    P(F.makeDiningTable(), 9.5, 0, 0);
    P(F.makeChandelier(), 9.5, 2.8, 0);
    P(F.makeRug(3.2, 2.2, 0x33402a), 9.5, 0, 0);
    P(F.makePainting(1.2, 0.9, 0x2a2438), 13.4, 1.8, 0, -Math.PI / 2);

    // ---------- LIBRARY / STUDY (west, ground) ----------
    P(F.makeBookshelf(), -12.4, 0, -3, Math.PI / 2);
    P(F.makeBookshelf(), -12.4, 0, -6, Math.PI / 2);
    P(F.makeDesk(), -9, 0, -8, 0);
    P(F.makeArmchair(), -7, 0, -3, -Math.PI / 2);
    P(F.makeFloorLamp(), -11.8, 0, -9);

    // ---------- FOYER ----------
    P(F.makeRug(2.6, 2.6, 0x3a2a3a), 0, 0, 9);
    P(F.makePainting(0.8, 1.0, 0x202830), -4.6, 1.8, 7, Math.PI / 2);
    P(F.makePainting(0.8, 1.0, 0x202830), 4.6, 1.8, 7, -Math.PI / 2);

    // ---------- UPPER: BOY'S ROOM (west) — the Boy + train ----------
    P(F.makeBed(true), -11.5, UPPER, -10, Math.PI / 2);
    P(F.makeDresser(), -12.6, UPPER, -4, Math.PI / 2);
    this.trainSet = P(F.makeTrainSet(), -8.5, UPPER, -6.5);
    P(F.makePainting(0.7, 0.7, 0x2a3a4a), -9, UPPER + 1.7, -11.8);

    // ---------- UPPER: GIRL'S ROOM (east) ----------
    P(F.makeBed(true), 11.5, UPPER, -10, -Math.PI / 2);
    P(F.makeDresser(), 12.6, UPPER, -4, -Math.PI / 2);
    P(F.makeNightstand(), 9.5, UPPER, -11);
    P(F.makePainting(0.7, 0.7, 0x4a2a3a), 9, UPPER + 1.7, -11.8);

    // ---------- UPPER: LANDING + HALLWAY decor ----------
    P(F.makePainting(0.8, 1.1, 0x1c2228), -2.9, UPPER + 1.7, -11, Math.PI / 2);
    P(F.makePainting(0.8, 1.1, 0x281c22), 2.9, UPPER + 1.7, -13, -Math.PI / 2);
    P(F.makeFloorLamp(), -5, UPPER, -3);

    // ---------- GOAL ROOM: the strange shrouded shape ----------
    this.shroud = P(F.makeShroudedFigure(), 0, UPPER, -18.6);
    // a lone swaying pendant light over it (off until reveal of mundanity)
    P(F.makeDresser(), -6, UPPER, -18.8, 0);
    P(F.makeDresser(), 6, UPPER, -18.8, 0);
    P(F.makePainting(1.4, 1.0, 0x161616), 0, UPPER + 1.9, -19.5); // dark frame behind it
  }

  _lighting() {
    // Very dark base. Most rooms unlit until the ending flips every switch.
    this.ambient = new THREE.AmbientLight(0x223040, 0.18);
    this.scene.add(this.ambient);
    // cold moonlight from "outside"
    this.moon = new THREE.DirectionalLight(0x6c84a8, 0.25);
    this.moon.position.set(-18, 22, 14); this.scene.add(this.moon);
    this.scene.fog = new THREE.FogExp2(0x05070a, 0.045);

    // Registered room lights (start OFF; ending turns them on)
    this._roomLight(-9, 2.7, 8, 0xffd9a0, 1.1);      // living
    this._roomLight(9.5, 2.7, 10, 0xfff0d0, 1.0);    // kitchen
    this._roomLight(9.5, 2.7, 0, 0xffcf95, 1.0);     // dining (chandelier mirror)
    this._roomLight(-9, 2.7, -6, 0xffd9a0, 0.9);     // library
    this._roomLight(0, 2.7, 8, 0xffe6c0, 0.8);       // foyer
    this._roomLight(0, 6.0, 1, 0xbfcfe0, 0.7);       // grand hall high
    this._roomLight(-9.5, UPPER + 2.7, -7, 0xffd9a0, 1.0);  // boy room
    this._roomLight(9.5, UPPER + 2.7, -7, 0xffd9a0, 1.0);   // girl room
    this._roomLight(0, UPPER + 2.7, -4, 0xffe6c0, 0.9);     // landing
    this._roomLight(0, UPPER + 2.7, -11, 0xffe6c0, 0.8);    // hallway
    this._roomLight(0, UPPER + 2.7, -18.5, 0xfff2d6, 1.4);  // GOAL room (bright reveal)
  }

  // Floor height under a position, given the player's current eye-floor.
  floorHeightAt(x, z, currentY) {
    // staircase ramp
    if (x > -1.6 && x < 1.6 && z > -2 && z < 4) {
      const t = Math.min(1, Math.max(0, (4 - z) / 6));
      return t * UPPER;
    }
    // two-storey north region: both ground(0) and upper exist
    if (z < -2) return (currentY > UPPER * 0.5) ? UPPER : 0;
    return 0;
  }

  // Animate ambient props (fire embers, train, lamp flicker).
  update(t, dt) {
    if (this.trainSet) {
      const u = this.trainSet.userData;
      u.angle = (u.angle || 0) + dt * 0.8;
      u.train.position.set(Math.cos(u.angle) * u.r, 0, Math.sin(u.angle) * u.r);
      u.train.rotation.y = -u.angle + Math.PI / 2;
    }
  }

  // Turn every light in the house ON (the ending).
  blazeAllLights() {
    this.ambient.intensity = 0.85;
    this.ambient.color.setHex(0xf2ead8);
    this.moon.intensity = 0.3;
    for (const l of this.roomLights) l.intensity = l.userData.onIntensity;
    this.scene.fog.density = 0.012;
  }
}
