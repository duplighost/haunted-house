// dialogue.js — two distinct channels:
//   thought()  -> the PLAYER's inner monologue (glitchy, italic, cyan, "from you")
//   speech()   -> what an NPC says (named, plain, warmer)
// Also a thin WebAudio layer for whispers/stings so the effect "comes from you".
export class Dialogue {
  constructor() {
    this.elThought = document.getElementById('thought');
    this.elSpeech = document.getElementById('speech');
    this._thoughtUntil = 0;
    this._speechUntil = 0;
    this.audio = null;
  }

  initAudio() {
    try {
      this.audio = new (window.AudioContext || window.webkitAudioContext)();
      // low ambient drone bed
      const o = this.audio.createOscillator(), g = this.audio.createGain();
      o.type = 'sine'; o.frequency.value = 42;
      g.gain.value = 0.04; o.connect(g); g.connect(this.audio.destination); o.start();
      this.drone = { o, g };
    } catch (e) { /* audio optional */ }
  }
  resumeAudio() { this.audio?.resume?.(); }

  // a breathy whisper sting that accompanies the player's thoughts
  _whisper() {
    if (!this.audio) return;
    const t = this.audio.currentTime;
    const noise = this.audio.createBufferSource();
    const buf = this.audio.createBuffer(1, this.audio.sampleRate * 0.9, this.audio.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    noise.buffer = buf;
    const bp = this.audio.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 4;
    const g = this.audio.createGain(); g.gain.setValueAtTime(0.0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.1); g.gain.linearRampToValueAtTime(0, t + 0.9);
    noise.connect(bp); bp.connect(g); g.connect(this.audio.destination); noise.start(t);
  }

  // a soft, non-jumpscare stinger for NPC notice
  _murmur() {
    if (!this.audio) return;
    const t = this.audio.currentTime;
    const o = this.audio.createOscillator(), g = this.audio.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.5);
    g.gain.setValueAtTime(0.0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.05); g.gain.linearRampToValueAtTime(0, t + 0.6);
    o.connect(g); g.connect(this.audio.destination); o.start(t); o.stop(t + 0.65);
  }

  thought(text, dur = 3.0) {
    this.elThought.textContent = text;
    this.elThought.classList.remove('show'); void this.elThought.offsetWidth;
    this.elThought.classList.add('show');
    this._whisper();
    this._thoughtUntil = performance.now() + dur * 1000;
  }

  speech(who, text, dur = 2.6) {
    this.elSpeech.innerHTML = `<span class="who">${who}</span>${text}`;
    this.elSpeech.classList.add('show');
    this._murmur();
    this._speechUntil = performance.now() + dur * 1000;
  }

  update() {
    const now = performance.now();
    if (now > this._thoughtUntil) this.elThought.classList.remove('show');
    if (now > this._speechUntil) this.elSpeech.classList.remove('show');
  }
}
