// ending.js — the payoff. When the player enters the far room the "haunting"
// collapses into mundane reality: the shape is just a draped dress form, every
// light snaps on, the view is wrenched back to the door, and an officer who was
// called by the terrified family walks in and arrests the intruder (you).
import * as THREE from 'three';
import { makePoliceOfficer } from './furniture.js';

export class Ending {
  constructor(scene, world, player, dialogue) {
    this.scene = scene; this.world = world; this.player = player; this.dialogue = dialogue;
    this.active = false; this.done = false;
    this.phase = 0; this.t = 0;
    this.cop = null;
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.player.frozen = true;
    this.phase = 1; this.t = 0;
    document.getElementById('crosshair').style.opacity = '0';
    document.getElementById('flashbtn').style.display = 'none';
  }

  _spawnCop() {
    this.cop = makePoliceOfficer();
    // arrives at the goal-room doorway (z=-17), walks toward the player
    this.cop.position.set(0, 3.4, -16.8);
    this.cop.rotation.y = 0; // faces -Z (north), toward the player deeper in the room
    this.scene.add(this.cop);
    // a hard flashlight-style torch from the officer
    const torch = new THREE.SpotLight(0xcfe0ff, 3.0, 14, Math.PI / 7, 0.5, 1.2);
    torch.position.set(0, 1.7, 0.2);
    const tgt = new THREE.Object3D(); tgt.position.set(0, 1.4, 6); this.cop.add(tgt); this.cop.add(torch);
    torch.target = tgt;
  }

  update(dt) {
    if (!this.active || this.done) return;
    this.t += dt;
    const P = this.player, D = this.dialogue;

    switch (this.phase) {
      case 1: // beat on the shrouded shape in the dark
        if (this.t < 0.05) D.thought('There… in the corner. Something’s standing there.', 2.4);
        if (this.t > 2.2) { this.phase = 2; this.t = 0; }
        break;

      case 2: // LIGHTS ON — the reveal of mundanity
        this.world.blazeAllLights();
        document.getElementById('vignette').style.background =
          'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.25) 90%)';
        P.flashlight.intensity = 0;
        D.thought('…It’s a bedsheet. Over an old dress form. That’s all it ever was.', 3.0);
        this.phase = 3; this.t = 0;
        break;

      case 3: // a pause, then the dread of footsteps behind
        if (this.t > 1.6) {
          D.thought('Footsteps. Behind me. The front of the house.', 2.4);
          this._spawnCop();
          this.phase = 4; this.t = 0; this._startYaw = P.yaw;
        }
        break;

      case 4: { // force the view 180° back toward the door
        const dur = 1.8;
        const k = Math.min(1, this.t / dur);
        const ease = k < 0.5 ? 2*k*k : 1 - Math.pow(-2*k+2,2)/2;
        // turn to face +Z (the door / the officer) => yaw PI; choose nearest direction
        let target = Math.PI;
        let from = this._startYaw;
        let diff = target - from; while (diff > Math.PI) diff -= Math.PI*2; while (diff < -Math.PI) diff += Math.PI*2;
        P.yaw = from + diff * ease;
        P.pitch = P.pitch * (1 - ease);
        if (k >= 1) { this.phase = 5; this.t = 0; }
        break;
      }

      case 5: { // officer advances from the door toward the player
        const c = this.cop; const stopZ = P.pos.z + 1.4;
        if (c.position.z > stopZ) {
          c.position.z -= dt * 1.8;
          const sw = Math.sin(this.t * 7) * 0.5;
          c.userData.armL.rotation.x = sw; c.userData.armR.rotation.x = -sw;
        } else {
          c.userData.armL.rotation.x = 0; c.userData.armR.rotation.x = 0;
          if (!this._spoke) { this._spoke = true; D.speech('Officer', 'Police! Hands behind your back. You’re under arrest.', 3.2); this.t = 0; }
          if (this._spoke && this.t > 1.6) { this.phase = 6; this.t = 0; }
        }
        // keep facing the door precisely
        P.yaw += (Math.PI - P.yaw) * Math.min(1, dt * 6);
        break;
      }

      case 6: { // handcuffs: cuff overlay + drop view, fade to black
        if (!this._cuffed) {
          this._cuffed = true;
          // hands coming up into view (simple bars across lower screen)
          D.thought('No— I was only looking. I only wanted to see inside…', 3.0);
        }
        // shove the camera down slightly as cuffs go on
        P.pitch += (0.5 - P.pitch) * Math.min(1, dt * 3);
        if (this.t > 2.2) {
          document.getElementById('fade').classList.add('on');
          if (this.t > 3.4) { this.phase = 7; this.t = 0; }
        }
        break;
      }

      case 7: // end screen
        this._showEnd();
        this.done = true;
        break;
    }
  }

  _showEnd() {
    const es = document.getElementById('endscreen');
    document.getElementById('endtitle').textContent = 'ARRESTED';
    document.getElementById('endtext').innerHTML =
      'There was never a haunting.<br><br>' +
      'A family heard someone moving through their dark house and called for help. ' +
      'Every fearful word, every glance, every plea to leave — it was only people, ' +
      'frightened of the stranger in their home.<br><br>' +
      'That stranger was you.';
    es.style.display = 'flex';
    requestAnimationFrame(() => { es.style.opacity = '1'; });
  }
}
