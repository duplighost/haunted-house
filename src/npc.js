// npc.js — the four residents. Each loiters within a small zone (no real
// pathfinding) doing one of two things: a looping ACTIVITY, or a slow PATROL,
// and speaks unsettling-but-actually-reasonable lines when you get close.
//
// In hindsight these are simply a frightened family confronting an intruder.
import * as THREE from 'three';
import { makeHuman } from './furniture.js';

export class NPC {
  constructor(scene, opts) {
    this.scene = scene;
    this.name = opts.name;
    this.mode = opts.mode;          // 'activity' | 'patrol'
    this.zone = opts.zone;          // {minX,maxX,minZ,maxZ}
    this.floorY = opts.floorY || 0;
    this.lines = opts.lines;
    this.activity = opts.activity;  // 'dishes' | 'train' | 'pace' | 'read'
    this.group = makeHuman(opts.look);
    this.group.position.set(opts.x, this.floorY, opts.z);
    this.group.rotation.y = opts.ry || 0;
    scene.add(this.group);

    this.t = Math.random() * 10;
    this.cool = 0;            // speech cooldown
    this.lineIdx = (Math.random() * this.lines.length) | 0;
    // patrol target
    this.target = new THREE.Vector3(opts.x, this.floorY, opts.z);
    this._pickTarget();
  }

  _pickTarget() {
    const z = this.zone;
    this.target.set(
      z.minX + Math.random() * (z.maxX - z.minX),
      this.floorY,
      z.minZ + Math.random() * (z.maxZ - z.minZ)
    );
  }

  update(dt, player, dialogue) {
    this.t += dt;
    const u = this.group.userData;

    if (this.mode === 'patrol') {
      const g = this.group.position;
      const dx = this.target.x - g.x, dz = this.target.z - g.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.3) { if (Math.random() < 0.5) this._pickTarget(); }
      else {
        const sp = 0.7 * dt;
        g.x += (dx / d) * sp; g.z += (dz / d) * sp;
        const wantYaw = Math.atan2(dx, dz);
        // smooth turn
        let diff = wantYaw - this.group.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
        this.group.rotation.y += diff * Math.min(1, dt * 4);
        // leg swing
        const sw = Math.sin(this.t * 6) * 0.4;
        u.armL.rotation.x = sw; u.armR.rotation.x = -sw;
      }
    } else {
      // activity animations
      if (this.activity === 'dishes') {
        u.armR.rotation.x = -1.1 + Math.sin(this.t * 5) * 0.25;
        u.armL.rotation.x = -1.0;
      } else if (this.activity === 'train') {
        // kneeling-ish: keep arms low, gentle reach
        u.armR.rotation.x = -1.3 + Math.sin(this.t * 3) * 0.3;
      } else if (this.activity === 'read') {
        u.armL.rotation.x = -1.2; u.armR.rotation.x = -1.2;
        this.group.rotation.y += Math.sin(this.t * 0.5) * 0.002;
      } else if (this.activity === 'pace') {
        u.armL.rotation.x = Math.sin(this.t * 2) * 0.2;
      }
    }

    // turn head/body toward player when close, and speak
    this.cool -= dt;
    const dpx = player.pos.x - this.group.position.x;
    const dpz = player.pos.z - this.group.position.z;
    const pd = Math.hypot(dpx, dpz);
    const sameFloor = Math.abs(this.floorY - player.pos.y) < 1.5;

    if (sameFloor && pd < 5.5) {
      // glance toward intruder
      const wantYaw = Math.atan2(dpx, dpz);
      let diff = wantYaw - this.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
      this.group.rotation.y += diff * Math.min(1, dt * 2.5);

      if (this.cool <= 0 && pd < 4.2) {
        dialogue.speech(this.name, this.lines[this.lineIdx % this.lines.length]);
        this.lineIdx++;
        this.cool = 6 + Math.random() * 3;
      }
    }
  }
}

export function createResidents(scene) {
  const npcs = [];
  // WOMAN — kitchen, washing dishes
  npcs.push(new NPC(scene, {
    name: 'The Woman', mode: 'activity', activity: 'dishes',
    look: { skin: 0xc99b73, top: 0x6a3a4a, bottom: 0x2a2a30, hair: 0x3a2418, height: 1.66 },
    x: 11.4, z: 11.6, ry: Math.PI, floorY: 0,
    zone: { minX: 10.5, maxX: 12.5, minZ: 10.5, maxZ: 12.5 },
    lines: [
      'The dishes are never done. You learn to stop noticing.',
      'You shouldn’t have come in here.',
      'I keep the water running so I don’t hear the rest of the house.',
      'Does he know you’re here? My husband. He always knows.',
    ],
  }));
  // MAN — living room, pacing / standing by fire
  npcs.push(new NPC(scene, {
    name: 'The Man', mode: 'patrol',
    look: { skin: 0xb07a54, top: 0x33414d, bottom: 0x20242c, hair: 0x241810, height: 1.8 },
    x: -9, z: 7.5, floorY: 0,
    zone: { minX: -12.5, maxX: -6, minZ: 5.5, maxZ: 11.5 },
    lines: [
      'Who are you? Who let you in?',
      'This is my house. You don’t belong here.',
      'I’ve been watching you since the front step.',
      'Leave. While the lights are still off.',
    ],
  }));
  // BOY — upstairs bedroom, playing with train
  npcs.push(new NPC(scene, {
    name: 'The Boy', mode: 'activity', activity: 'train',
    look: { skin: 0xd0a87e, top: 0x3a5a3a, bottom: 0x2a3040, hair: 0x1c140c, height: 1.25 },
    x: -8.5, z: -5.4, floorY: 3.4, ry: 0,
    zone: { minX: -10, maxX: -7, minZ: -7, maxZ: -4.5 },
    lines: [
      'Round and round. It never gets to leave either.',
      'Are you the one mommy told me about?',
      'You’re not supposed to be upstairs.',
      'If you find the last room, don’t go in. Everyone goes in.',
    ],
  }));
  // GIRL — upstairs landing / hallway, walking slowly
  npcs.push(new NPC(scene, {
    name: 'The Girl', mode: 'patrol',
    look: { skin: 0xd6b189, top: 0x5a3a5a, bottom: 0x3a3a44, hair: 0x2a1c10, height: 1.3 },
    x: 0, z: -4, floorY: 3.4,
    zone: { minX: -2.5, maxX: 2.5, minZ: -10, maxZ: -3 },
    lines: [
      'Why are you in our house?',
      'I can see you even when the lights are off.',
      'The hallway is longer at night. Did you notice?',
      'You’re almost there. They’re almost here.',
    ],
  }));
  return npcs;
}
