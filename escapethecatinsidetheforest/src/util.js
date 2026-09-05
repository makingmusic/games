// Shared helpers: seeded RNG, math, small utilities. DOM-free (Node-safe).
var G = globalThis.G || (globalThis.G = {});

G.U = {
  clamp: (v, a, b) => v < a ? a : v > b ? b : v,
  lerp: (a, b, t) => a + (b - a) * t,
  dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
  dist2: (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; },
  angleTo: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
  angDiff: (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; },
  // Deterministic seeded RNG (mulberry32) — the whole world is reproducible from a seed.
  rng: function (seed) {
    let s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  rand: (r, a, b) => a + r() * (b - a),
  randi: (r, a, b) => Math.floor(a + r() * (b - a + 1)),
  pick: (r, arr) => arr[Math.floor(r() * arr.length)],
  chance: (r, p) => r() < p,
  // Floating text / effect pool shared by sim + renderer.
  fx: function (st, x, y, kind, text, color) {
    st.fx.push({ x, y, kind: kind || 'text', text: text || '', color: color || '#fff', t: 0, life: kind === 'text' ? 1.1 : 0.6, vy: -30 });
    if (st.fx.length > 80) st.fx.shift();
  },
  toasts: [],
  toast: function (msg) { G.U.toasts.push({ msg, t: 0 }); if (G.U.toasts.length > 4) G.U.toasts.shift(); },
};
