// main.js — bootstrap, game loop, monologue triggers, and the start/ending glue.
import * as THREE from 'three';
import { World, UPPER } from './world.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { Dialogue } from './dialogue.js';
import { createResidents } from './npc.js';
import { Ending } from './ending.js';

const canvas = document.getElementById('game');
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const lowEnd = isTouch; // disable shadows / cap pixel ratio on mobile

const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowEnd, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, lowEnd ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = !lowEnd;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070a);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 120);
scene.add(camera);

const world = new World(scene);
const player = new Player(camera, world);
player.enableShadows(!lowEnd);
const input = new Input(canvas);
const dialogue = new Dialogue();
const npcs = createResidents(scene);
const ending = new Ending(scene, world, player, dialogue);

// ---- Player monologue triggers (one-shot zones along the route) ----------
// These sell the "Resident Evil narrator" effect — eerie now, mundane later.
const monologues = [
  { x: 0, z: 9, r: 3.0, floor: 0, text: 'Unlocked. Of course it was. Houses like this always feel… occupied.' },
  { x: -9, z: 8, r: 3.0, floor: 0, text: 'Someone lives here. The fire’s still warm. So why is it so dark?' },
  { x: 9.5, z: 9, r: 3.0, floor: 0, text: 'A woman at the sink. She hasn’t turned around. She knows I’m here.' },
  { x: 0, z: 1, r: 2.4, floor: 0, text: 'These stairs. The whole house leans toward the top floor.' },
  { x: 0, z: -4, r: 2.6, floor: 1, text: 'Upstairs the air is wrong. Colder. Like the house is holding its breath.' },
  { x: -8.5, z: -6, r: 2.6, floor: 1, text: 'A child. Playing alone in the dark. He won’t look up at me.' },
  { x: 0, z: -9, r: 2.4, floor: 1, text: 'This hallway. It’s too long for a house. The far door is open.' },
  { x: 0, z: -13, r: 2.4, floor: 1, text: 'Something’s in that last room. Pale. Waiting. I have to see it.' },
];
let monoIdx = 0;
function checkMonologue() {
  for (const m of monologues) {
    if (m.done) continue;
    if (player.floor !== m.floor) continue;
    const d = Math.hypot(player.pos.x - m.x, player.pos.z - m.z);
    if (d < m.r) { m.done = true; dialogue.thought(m.text, 3.4); break; }
  }
}

// ---- Goal detection ------------------------------------------------------
function checkGoal() {
  if (player.floor === 1 && player.pos.z < -17.2 && Math.abs(player.pos.x) < 7) {
    ending.start();
  }
}

// ---- Start / UI ----------------------------------------------------------
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startbtn');
const hint = document.getElementById('controlhint');
hint.innerHTML = isTouch
  ? 'LEFT thumb — move &nbsp;•&nbsp; RIGHT thumb — look &nbsp;•&nbsp; TORCH button toggles light'
  : 'WASD — move &nbsp;•&nbsp; MOUSE — look &nbsp;•&nbsp; SHIFT — hurry &nbsp;•&nbsp; F — flashlight';

let started = false;
function startGame() {
  if (started) return; started = true;
  input.enabled = true;
  dialogue.initAudio(); dialogue.resumeAudio();
  overlay.style.opacity = '0';
  setTimeout(() => { overlay.style.display = 'none'; }, 1000);
  if (isTouch) { document.getElementById('touch').style.display = 'block'; document.getElementById('flashbtn').style.display = 'flex'; }
  else { canvas.requestPointerLock?.(); }
  setTimeout(() => dialogue.thought('I shouldn’t be here. But the door was open…', 3.4), 900);
}
startBtn.addEventListener('click', startGame);
canvas.addEventListener('click', () => { if (!started) startGame(); });

// assets are procedural, so we're ready immediately
startBtn.disabled = false; startBtn.textContent = isTouch ? 'TAP TO ENTER' : 'CLICK TO ENTER';

document.getElementById('flashbtn').addEventListener('click', () => player.toggleFlashlight());
document.getElementById('againbtn').addEventListener('click', () => location.reload());

// crosshair "hot" near the strange object
const crosshair = document.getElementById('crosshair');

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---- Loop ----------------------------------------------------------------
let last = performance.now();
let elapsed = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; elapsed += dt;

  if (started) {
    const look = input.consumeLook();
    if (!player.frozen) player.applyLook(look.dx, look.dy);
    if (input.consumeFlashlight()) player.toggleFlashlight();

    player.update(dt, input);
    world.update(elapsed, dt);
    for (const n of npcs) n.update(dt, player, dialogue);
    dialogue.update();

    if (!ending.active) { checkMonologue(); checkGoal(); }
    ending.update(dt);

    // crosshair heat when looking toward the goal room from the hall
    const towardGoal = player.floor === 1 && player.pos.z < -8;
    crosshair.classList.toggle('hot', towardGoal && !ending.active);

    // subtle flashlight flicker for atmosphere
    if (player.flashOn && !ending.active) {
      player.flashlight.intensity = player.flashBase + Math.sin(elapsed * 30) * 1.0 + (Math.random() < 0.01 ? -10 : 0);
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Debug/testing hook (harmless in normal play): lets an automated harness or the
// dev console inspect and drive the game.
window.__game = { scene, camera, renderer, world, player, npcs, ending, dialogue, input,
  startGame, teleport(x, z, y = 0) { player.pos.set(x, y, z); }, monologues };
