// player.js — first-person controller: yaw/pitch look, collide-and-slide
// movement against AABB walls, stair/floor following, head-bob, flashlight.
import * as THREE from 'three';

const RADIUS = 0.34;
const EYE = 1.62;
const WALK = 2.6, RUN = 4.3;

export class Player {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    this.pos = new THREE.Vector3(0, 0, 10.5); // feet position; spawn in foyer
    this.yaw = 0;   // yaw 0 => camera looks toward -Z (north, into the house)
    this.pitch = 0;
    this.vel = new THREE.Vector3();
    this.bob = 0;
    this.frozen = false;
    this.lookSpeed = 0.0024;

    // Flashlight: a spotlight parented to the camera.
    this.flashlight = new THREE.SpotLight(0xfff1d8, 2.2, 18, Math.PI / 6, 0.45, 1.4);
    this.flashlight.position.set(0.2, -0.1, 0.2);
    this.flashTarget = new THREE.Object3D();
    camera.add(this.flashlight);
    camera.add(this.flashTarget);
    this.flashTarget.position.set(0, 0, -5);
    this.flashlight.target = this.flashTarget;
    this.flashOn = true;
  }

  enableShadows(on) {
    this.flashlight.castShadow = on;
    if (on) { this.flashlight.shadow.mapSize.set(1024, 1024); this.flashlight.shadow.camera.far = 18; this.flashlight.shadow.bias = -0.0005; }
  }

  toggleFlashlight() {
    this.flashOn = !this.flashOn;
    this.flashlight.intensity = this.flashOn ? 2.2 : 0;
  }

  applyLook(dx, dy) {
    this.yaw -= dx * this.lookSpeed;
    this.pitch -= dy * this.lookSpeed;
    this.pitch = Math.max(-1.4, Math.min(1.4, this.pitch));
  }

  // Push the player circle out of every solid AABB on the current floor.
  _collide() {
    const floor = this.pos.y > 1.7 ? 1 : 0;
    for (let iter = 0; iter < 2; iter++) {
      for (const c of this.world.colliders) {
        if (c.floor !== -1 && c.floor !== floor) continue;
        const cx = Math.max(c.minX, Math.min(this.pos.x, c.maxX));
        const cz = Math.max(c.minZ, Math.min(this.pos.z, c.maxZ));
        const dx = this.pos.x - cx, dz = this.pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 < RADIUS * RADIUS) {
          const d = Math.sqrt(d2) || 0.0001;
          // inside the box? push along smallest axis out
          if (this.pos.x > c.minX && this.pos.x < c.maxX && this.pos.z > c.minZ && this.pos.z < c.maxZ) {
            const toL = this.pos.x - c.minX, toR = c.maxX - this.pos.x;
            const toN = this.pos.z - c.minZ, toF = c.maxZ - this.pos.z;
            const m = Math.min(toL, toR, toN, toF);
            if (m === toL) this.pos.x = c.minX - RADIUS;
            else if (m === toR) this.pos.x = c.maxX + RADIUS;
            else if (m === toN) this.pos.z = c.minZ - RADIUS;
            else this.pos.z = c.maxZ + RADIUS;
          } else {
            this.pos.x = cx + (dx / d) * RADIUS;
            this.pos.z = cz + (dz / d) * RADIUS;
          }
        }
      }
    }
  }

  update(dt, input) {
    if (!this.frozen) {
      const speed = (input.run ? RUN : WALK);
      // movement relative to yaw
      const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
      // forward vector (yaw=PI -> -Z). moveZ=+forward, moveX=+right
      const fx = -sin, fz = -cos;
      const rx = cos, rz = -sin;
      const wishX = (fx * input.moveZ + rx * input.moveX);
      const wishZ = (fz * input.moveZ + rz * input.moveX);
      const wl = Math.hypot(wishX, wishZ) || 1;
      const tx = (wishX / Math.max(1, wl)) * speed;
      const tz = (wishZ / Math.max(1, wl)) * speed;
      const moving = (Math.abs(input.moveX) + Math.abs(input.moveZ)) > 0.05;
      // smooth accel
      this.vel.x += (tx - this.vel.x) * Math.min(1, dt * 12);
      this.vel.z += (tz - this.vel.z) * Math.min(1, dt * 12);
      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.z * dt;
      this._collide();
      // head bob
      if (moving) this.bob += dt * (input.run ? 12 : 8);
    }

    // settle onto floor height (stairs/landing)
    const fh = this.world.floorHeightAt(this.pos.x, this.pos.z, this.pos.y);
    this.pos.y += (fh - this.pos.y) * Math.min(1, dt * 14);

    const bobY = Math.sin(this.bob) * 0.045;
    this.camera.position.set(this.pos.x, this.pos.y + EYE + bobY, this.pos.z);
    this.camera.rotation.set(0, 0, 0, 'YXZ');
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  get floor() { return this.pos.y > 1.7 ? 1 : 0; }
}
