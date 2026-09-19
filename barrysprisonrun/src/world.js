// Barry's Prison Run — world/map container + cell helpers.
// Every stage builds one World: grids of floor/ceiling heights, cell types,
// props, ladders, animated platforms, triggers and entities.

var T_NORMAL = 0, T_VENT = 1, T_SPIKE = 2, T_LADDER = 3, T_SLIDE = 4;

var World = {
  w: 0, h: 0,
  floor: null, ceil: null, solid: null, ctype: null, area: null, outdoor: null,
  props: [], entities: [], triggers: [], platforms: [], ladders: {},
  barry: null, name: '', sky: null,
  // per-stage hooks
  update: null, useTargets: [], slide: null, gate: null
};

function worldNew(w, h, name) {
  World.w = w; World.h = h;
  var n = w * h;
  World.floor = new Float32Array(n);
  World.ceil = new Float32Array(n);      // 0 = no ceiling (sky)
  World.solid = new Uint8Array(n);
  World.ctype = new Uint8Array(n);
  World.area = new Uint8Array(n);
  World.outdoor = new Uint8Array(n);
  World.props = []; World.entities = []; World.triggers = [];
  World.platforms = []; World.ladders = {};
  World.barry = null; World.name = name || '';
  World.update = null; World.useTargets = []; World.slide = null; World.gate = null;
}

function idx(x, y) { return y * World.w + x; }
function inMap(x, y) { return x >= 0 && y >= 0 && x < World.w && y < World.h; }

function cellFloor(x, y) {
  // animated platforms override their cells
  for (var i = 0; i < World.platforms.length; i++) {
    var p = World.platforms[i];
    if (!p.active) continue;
    for (var j = 0; j < p.cells.length; j++) {
      if (p.cells[j] === idx(x, y)) return p.h;
    }
  }
  return World.floor[idx(x, y)];
}

// feet height at a point. Ground = the HIGHEST surface under the player
// circle (so standing at a ledge edge keeps you on the ledge until you are
// fully off it — classic max-floor ground rule).
function floorAt(x, y) {
  var r = 0.24;
  var fx = -1e9;
  var xs = [x - r, x + r], ys = [y - r, y + r];
  for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
    var cx = Math.floor(xs[i]), cy = Math.floor(ys[j]);
    if (!inMap(cx, cy)) return 1e9;
    var h = cellFloor(cx, cy);
    if (World.solid[idx(cx, cy)]) {
      // solid cells support you at their top (counter/bar height)
      var top = World.ceil[idx(cx, cy)] > 0 ? World.ceil[idx(cx, cy)] : World.floor[idx(cx, cy)];
      if (top > fx) fx = top;
      continue;
    }
    if (h > fx) fx = h;
  }
  return fx;
}

function ceilAt(x, y) {
  var cx = Math.floor(x), cy = Math.floor(y);
  if (!inMap(cx, cy)) return 1e9;
  var c = World.ceil[idx(cx, cy)];
  return c <= 0 ? 20 : c;   // 0 = open sky
}

// floor height for small flying things (fruit): solids don't count as ground
function openFloorAt(x, y) {
  var r = 0.12;
  var fx = 1e9;
  var xs = [x - r, x + r], ys = [y - r, y + r];
  for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
    var cx = Math.floor(xs[i]), cy = Math.floor(ys[j]);
    if (!inMap(cx, cy)) return -100;
    var k = idx(cx, cy);
    if (World.solid[k]) return -100;
    var h = cellFloor(cx, cy);
    if (h < fx) fx = h;
  }
  return fx;
}

function typeAt(x, y) {
  var cx = Math.floor(x), cy = Math.floor(y);
  if (!inMap(cx, cy)) return T_NORMAL;
  return World.ctype[idx(cx, cy)];
}

function isOutdoorCell(x, y) {
  if (!inMap(x, y)) return true;
  return World.outdoor[idx(x, y)] === 1;
}

// Can the player (feet at z, radius r) occupy (x,y)?  airborne = jumping over stuff
function blockedAt(x, y, z, airborne) {
  var r = CONFIG.player.radius;
  var xs = [x - r, x + r], ys = [y - r, y + r];
  for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
    var cx = Math.floor(xs[i]), cy = Math.floor(ys[j]);
    if (!inMap(cx, cy)) return true;
    var k = idx(cx, cy);
    if (World.solid[k]) {
      var top = World.ceil[k] > 0 ? World.ceil[k] : World.floor[k];
      if (z >= top - 0.06) continue;         // standing on top of it
      if (!airborne) return true;
      if (top > z + 0.25) return true;
      continue;
    }
    var f = cellFloor(cx, cy);
    var c = World.ceil[k];
    if (c > 0 && c - Math.max(f, z) < 0.42 && World.ctype[k] !== T_VENT) return true;
    if (World.ctype[k] === T_VENT && c > 0 && c - Math.max(f, z) < 0.3) return true;
    if (airborne) {
      if (f > z + 0.3) return true;    // still rising into a ledge
    } else {
      if (f - z > CONFIG.player.stepUp) return true;
    }
  }
  return false;
}

// ---------- building helpers ----------

function fillRectCells(x0, y0, x1, y1, fn) {
  for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
    if (!inMap(x, y)) continue;
    fn(x, y, idx(x, y));
  }
}

function room(x0, y0, x1, y1, ceilH, areaId) {
  fillRectCells(x0, y0, x1, y1, function (x, y, k) {
    World.solid[k] = 0;
    World.ceil[k] = ceilH;
    if (areaId !== undefined) World.area[k] = areaId;
  });
}

function wall(x0, y0, x1, y1, areaId) {
  fillRectCells(x0, y0, x1, y1, function (x, y, k) {
    World.solid[k] = 1;
    World.floor[k] = 0;
    if (areaId !== undefined) World.area[k] = areaId;
  });
}

// after layout: solid cells with ceil 0 adopt min floor / max ceil of open
// neighbours so faces line up. Explicit ceils (counters, bars) are kept.
function settleWalls() {
  var floors = new Float32Array(World.w * World.h);
  var ceils = new Float32Array(World.w * World.h);
  floors.set(World.floor); ceils.set(World.ceil);
  for (var y = 0; y < World.h; y++) for (var x = 0; x < World.w; x++) {
    var k = idx(x, y);
    if (!World.solid[k]) continue;
    var f = 1e9, c = 0;
    for (var d = 0; d < 4; d++) {
      var nx = x + [1, -1, 0, 0][d], ny = y + [0, 0, 1, -1][d];
      if (!inMap(nx, ny)) continue;
      var i = idx(nx, ny);
      if (World.solid[i]) continue;
      if (World.floor[i] < f) f = World.floor[i];
      if (World.ceil[i] > c) c = World.ceil[i];
    }
    if (f === 1e9) f = 0;
    if (World.ceil[k] === 0) ceils[k] = c === 0 ? 2.3 : c;
    floors[k] = f;
  }
  World.floor = floors; World.ceil = ceils;
}

// set a cell
function cell(x, y, opts) {
  if (!inMap(x, y)) return;
  var k = idx(x, y);
  if (opts.solid !== undefined) World.solid[k] = opts.solid;
  if (opts.floor !== undefined) World.floor[k] = opts.floor;
  if (opts.ceil !== undefined) World.ceil[k] = opts.ceil;
  if (opts.type !== undefined) World.ctype[k] = opts.type;
  if (opts.area !== undefined) World.area[k] = opts.area;
  if (opts.outdoor !== undefined) World.outdoor[k] = opts.outdoor;
}

// wall circles: run of platform cells against a wall at height h.
// The orange riser faces with ring stripes sell the "disc" look — no decals.
function circles(x0, y0, dx, dy, count, h, areaId) {
  for (var i = 0; i < count; i++) {
    var x = x0 + dx * i, y = y0 + dy * i;
    cell(x, y, { floor: h, type: T_NORMAL, area: areaId });
  }
}

// stairs: cells rising by step each, heading (dx,dy)
function stairs(x0, y0, dx, dy, count, step, areaId) {
  for (var i = 0; i < count; i++) {
    var x = x0 + dx * i, y = y0 + dy * i;
    cell(x, y, { floor: step * (i + 1), type: T_NORMAL, area: areaId });
    // stairs are 2 wide for kid feet
    var wx = x + (dx !== 0 ? 0 : 1), wy = y + (dy !== 0 ? 0 : 1);
    if (inMap(wx, wy) && !World.solid[idx(wx, wy)]) {
      cell(wx, wy, { floor: step * (i + 1), type: T_NORMAL, area: areaId });
    }
  }
  return step * count;
}

function addLadder(x, y, base, top) {
  cell(x, y, { floor: base, type: T_LADDER });
  World.ladders[x + ',' + y] = { x: x, y: y, base: base, top: top };
  World.props.push({ x: x + 0.5, y: y + 0.5, z: base, sprite: 'ladder', scale: 1, tall: top - base + 0.2 });
}

function addTrigger(x, y, r, fn, once) {
  World.triggers.push({ x: x + 0.5, y: y + 0.5, r: r || 0.9, fn: fn, once: !!once, done: false });
}

function addCheckpoint(id, x, y, dir, z) {
  World.props.push({ x: x + 0.5, y: y + 0.5, z: z || 0, sprite: 'flag0', scale: 0.5, anim: 'flag', checkpoint: id });
  addTrigger(x, y, 1.1, function () { Game.reachCheckpoint(id, x + 0.5, y + 0.5, dir, z || 0); }, true);
}

function addProp(x, y, sprite, scale, opts) {
  var p = { x: x, y: y, z: (opts && opts.z) || 0, sprite: sprite, scale: scale };
  if (opts) {
    if (opts.block) { p.block = opts.block; }
    if (opts.flat) p.flat = true;
    if (opts.tall) p.tall = opts.tall;
    if (opts.anim) p.anim = opts.anim;
  }
  World.props.push(p);
  return p;
}
