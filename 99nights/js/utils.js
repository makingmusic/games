const TAU = Math.PI * 2;

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
  };
}

const Utils = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
  ang: (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax),
  angDiff(a, b) {
    let d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  },
  rand: (a, b) => a + Math.random() * (b - a),
  randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  choice: (arr) => arr[Math.floor(Math.random() * arr.length)],
  hash2(x, y) {
    const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return h - Math.floor(h);
  },
  meters: (px) => Math.max(1, Math.round(px / 8 / 5) * 5),
  font(ctx, size, weight) {
    ctx.font = `${weight || 'bold'} ${size}px "Baloo 2","Comic Sans MS","Chalkboard SE",system-ui,sans-serif`;
  },
  shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (f >= 0) {
      r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f;
    } else {
      r *= 1 + f; g *= 1 + f; b *= 1 + f;
    }
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  },
};
