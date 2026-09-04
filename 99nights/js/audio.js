const Sfx = (() => {
  let ctx = null;
  let master = null;
  let muted = false;

  function unlock() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.16;
        master.connect(ctx.destination);
      } catch (e) {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function tone(f, dur, type = 'square', vol = 1, slide = 0, delay = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + dur);
    g.gain.setValueAtTime(vol * 0.5, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol = 1, freq = 1200, delay = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + delay;
    const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = vol * 0.5;
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t0);
  }

  const bank = {
    swing: () => noise(0.08, 0.4, 2400),
    chop: () => { tone(160, 0.09, 'square', 0.8, -60); noise(0.06, 0.5, 900); },
    treeFall: () => { tone(90, 0.35, 'sine', 1, -40); noise(0.3, 0.6, 500); },
    thwack: () => tone(190, 0.08, 'square', 0.6, -80),
    pickup: () => tone(660, 0.09, 'sine', 0.7, 240),
    coin: () => { tone(880, 0.07, 'square', 0.5); tone(1320, 0.12, 'square', 0.5, 0, 0.06); },
    gem: () => { tone(990, 0.1, 'sine', 0.6); tone(1480, 0.15, 'sine', 0.6, 0, 0.08); },
    eat: () => { tone(300, 0.08, 'sine', 0.8, 80); tone(360, 0.08, 'sine', 0.8, 80, 0.1); },
    hurt: () => { tone(200, 0.18, 'sawtooth', 0.9, -120); noise(0.1, 0.4, 700); },
    poof: () => noise(0.18, 0.5, 600),
    star: () => tone(1200, 0.12, 'sine', 0.5, 300),
    fire: () => { noise(0.25, 0.5, 400); tone(220, 0.2, 'sine', 0.5, 120); },
    upgrade: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', 0.5, 0, i * 0.09)),
    howl: () => tone(400, 0.7, 'sine', 0.7, -250),
    banner: () => { tone(392, 0.2, 'triangle', 0.7); tone(494, 0.3, 'triangle', 0.7, 0, 0.18); },
    boss: () => { tone(110, 0.6, 'sawtooth', 0.9, -30); tone(82, 0.9, 'sawtooth', 0.8, -20, 0.3); },
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'square', 0.55, 0, i * 0.12)),
    lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'triangle', 0.7, 0, i * 0.22)),
    rescue: () => [659, 784, 988].forEach((f, i) => tone(f, 0.15, 'sine', 0.6, 0, i * 0.08)),
    roar: () => { tone(82, 0.7, 'sawtooth', 1, -25); tone(55, 0.9, 'sawtooth', 0.9, -12, 0.1); noise(0.5, 0.7, 300); },
    croak: () => { tone(140, 0.22, 'sawtooth', 0.9, -60); tone(95, 0.28, 'square', 0.6, -30, 0.08); },
    shoot: () => tone(520, 0.06, 'square', 0.3, -200),
    parry: () => tone(1500, 0.08, 'sine', 0.5, 200),
  };

  return {
    unlock,
    sfx: (n) => { if (bank[n]) bank[n](); },
    toggle() { muted = !muted; return muted; },
  };
})();
