// 100-Player Meme Maze — the only two sounds in this quiet game: "pum pum pum" and "oh ma ga"
'use strict';

const Sound = {
  ctx: null,

  unlock() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* no audio */ }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  // player death: three low thumps
  pum() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const t = t0 + i * 0.17;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.16);
      gain.gain.setValueAtTime(0.55, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    }
  },

  // winning: "oh ma ga!" (+ tiny sparkle arpeggio underneath)
  ohMaGa() {
    try {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance('Oh ma ga!');
        u.pitch = 1.8;
        u.rate = 0.95;
        u.volume = 1;
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
      }
    } catch (e) { /* speech unavailable */ }
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + 0.05;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const t = t0 + i * 0.11;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  },
};
