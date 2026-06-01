// input.js — unified input for desktop (WASD + mouse look) and mobile (dual sticks).
// Exposes per-frame movement intent and accumulated look deltas.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

    // movement intent, range -1..1
    this.moveX = 0; // strafe (+right)
    this.moveZ = 0; // forward (+forward)
    this.run = false;

    // look deltas accumulated since last consume()
    this.lookDX = 0;
    this.lookDY = 0;

    this.interactPressed = false;
    this.flashlightToggled = false;
    this.locked = false;
    this.enabled = false;

    this.keys = {};
    this._initKeyboard();
    this._initMouse();
    if (this.isTouch) this._initTouch();
  }

  _initKeyboard() {
    addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyF') this.flashlightToggled = true;
      if (e.code === 'KeyE' || e.code === 'Space') this.interactPressed = true;
    });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
  }

  _initMouse() {
    this.canvas.addEventListener('click', () => {
      if (this.enabled && !this.isTouch && !this.locked) this.canvas.requestPointerLock?.();
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
    });
    document.addEventListener('mousemove', (e) => {
      if (this.locked) { this.lookDX += e.movementX; this.lookDY += e.movementY; }
    });
  }

  _initTouch() {
    const stickL = document.getElementById('stickL');
    const stickR = document.getElementById('stickR');
    this.touchL = null; // {id, ox, oy}
    this.touchR = null;

    const place = (el, x, y) => { el.style.left = x + 'px'; el.style.top = y + 'px'; el.classList.add('active'); };
    const nub = (el, dx, dy) => {
      const n = el.firstElementChild;
      n.style.transform = `translate(${dx}px, ${dy}px)`;
    };

    const onStart = (e) => {
      if (!this.enabled) return;
      for (const t of e.changedTouches) {
        const leftHalf = t.clientX < innerWidth / 2;
        if (leftHalf && !this.touchL) {
          this.touchL = { id: t.identifier, ox: t.clientX, oy: t.clientY };
          place(stickL, t.clientX, t.clientY);
        } else if (!leftHalf && !this.touchR) {
          this.touchR = { id: t.identifier, ox: t.clientX, oy: t.clientY };
          place(stickR, t.clientX, t.clientY);
        }
      }
      e.preventDefault();
    };
    const onMove = (e) => {
      for (const t of e.changedTouches) {
        if (this.touchL && t.identifier === this.touchL.id) {
          let dx = t.clientX - this.touchL.ox, dy = t.clientY - this.touchL.oy;
          const r = 55, len = Math.hypot(dx, dy);
          if (len > r) { dx *= r / len; dy *= r / len; }
          nub(stickL, dx, dy);
          this.moveX = dx / r; this.moveZ = -dy / r;
        } else if (this.touchR && t.identifier === this.touchR.id) {
          const dx = t.clientX - this.touchR.ox, dy = t.clientY - this.touchR.oy;
          this.lookDX += dx * 0.9; this.lookDY += dy * 0.9;
          this.touchR.ox = t.clientX; this.touchR.oy = t.clientY; // relative drag
          nub(stickR, 0, 0);
        }
      }
      e.preventDefault();
    };
    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        if (this.touchL && t.identifier === this.touchL.id) {
          this.touchL = null; this.moveX = 0; this.moveZ = 0;
          stickL.classList.remove('active'); nub(stickL, 0, 0);
        } else if (this.touchR && t.identifier === this.touchR.id) {
          this.touchR = null; stickR.classList.remove('active');
        }
      }
    };
    const opts = { passive: false };
    addEventListener('touchstart', onStart, opts);
    addEventListener('touchmove', onMove, opts);
    addEventListener('touchend', onEnd, opts);
    addEventListener('touchcancel', onEnd, opts);
  }

  // Read keyboard movement (call before consuming move values)
  _pollKeyboard() {
    if (this.isTouch) return;
    let x = 0, z = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) z += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) z -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1;
    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    this.moveX = x; this.moveZ = z;
    this.run = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
  }

  // Consume look deltas (returns and resets)
  consumeLook() {
    this._pollKeyboard();
    const d = { dx: this.lookDX, dy: this.lookDY };
    this.lookDX = 0; this.lookDY = 0;
    return d;
  }

  consumeInteract() { const v = this.interactPressed; this.interactPressed = false; return v; }
  consumeFlashlight() { const v = this.flashlightToggled; this.flashlightToggled = false; return v; }
}
