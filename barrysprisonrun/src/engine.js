// Barry's Prison Run — Wolfenstein-style raycaster extended with variable
// floor/ceiling heights: platforms, stairs, ledges, pits, vents, slides.
// Flat-shaded cartoon look; Canvas 2D at 60fps on iPad Safari.

var Ray = {
  COL: 3, cols: 0,
  zbuf: null,
  occN: null, occD: null, occY0: null, occY1: null,
  MAXOCC: 6,
  FOVK: 0.66,
  // per-column scratch
  _oN: 0, _oA: [0, 0, 0, 0], _oB: [0, 0, 0, 0],
  _occN: 0, _col: 0
};

var PALETTES = [
  { ceil: ['#dfe6ee', '#aab8ca'], floor: ['#c4cedd', '#7e8ba0'], wall: [225, 232, 241], wain: [104, 120, 150], riser: [244, 172, 74], fog: 0.04 },   // 0 cell block
  { ceil: ['#e9dfcd', '#b5a88f'], floor: ['#d6c9ae', '#948769'], wall: [233, 220, 196], wain: [150, 106, 70], riser: [244, 172, 74], fog: 0.045 },  // 1 corridor
  { ceil: ['#5c646f', '#41474f'], floor: ['#5a626d', '#3c424a'], wall: [126, 136, 150], wain: [88, 96, 108], riser: [200, 140, 60], fog: 0.075 }, // 2 vent (steel duct)
  { ceil: ['#9db0cc', '#5f7391'], floor: ['#7c8ea9', '#48586f'], wall: [156, 172, 196], wain: [70, 84, 108], riser: [244, 172, 74], fog: 0.055 },   // 3 pit
  { ceil: ['#e2dcee', '#a89fca'], floor: ['#cec6e8', '#8d84b1'], wall: [226, 220, 238], wain: [120, 110, 160], riser: [244, 172, 74], fog: 0.04 },  // 4 stairwell
  { ceil: ['#dcefe2', '#a3c9af'], floor: ['#cfe4d6', '#8fb79c'], wall: [223, 240, 229], wain: [70, 130, 92], riser: [244, 172, 74], fog: 0.04 },    // 5 cafeteria
  { ceil: ['#f0e3cf', '#cbb590'], floor: ['#e0d0b4', '#a08a63'], wall: [240, 226, 200], wain: [160, 84, 60], riser: [244, 172, 74], fog: 0.04 },    // 6 chase hall
  { ceil: ['#bcd8f0', '#8fb4dc'], floor: ['#b9c2c9', '#7d868d'], wall: [205, 214, 222], wain: [110, 120, 130], riser: [244, 172, 74], fog: 0.035 }, // 7 yard
  { ceil: ['#cfe4f5', '#9cc3e5'], floor: ['#a8b0bc', '#6e7681'], wall: [190, 198, 208], wain: [100, 108, 120], riser: [244, 172, 74], fog: 0.03 }    // 8 street
];

function palette(x, y) {
  var cx = Math.floor(x), cy = Math.floor(y);
  if (!inMap(cx, cy)) return PALETTES[0];
  return PALETTES[World.area[idx(cx, cy)]] || PALETTES[0];
}

Ray.setup = function (W) {
  Ray.COL = Math.max(2, Math.round(W / 900));
  var cols = Math.ceil(W / Ray.COL);
  if (Ray.cols !== cols || !Ray.zbuf) {
    Ray.cols = cols;
    Ray.zbuf = new Float32Array(cols);
    Ray.occN = new Uint8Array(cols);
    Ray.occD = new Float32Array(cols * Ray.MAXOCC);
    Ray.occY0 = new Float32Array(cols * Ray.MAXOCC);
    Ray.occY1 = new Float32Array(cols * Ray.MAXOCC);
  }
};

function mixHex(h0, h1, k) {
  var a = parseInt(h0.slice(1), 16), b = parseInt(h1.slice(1), 16);
  var r = ((a >> 16) & 255) * k + ((b >> 16) & 255) * (1 - k);
  var g = ((a >> 8) & 255) * k + ((b >> 8) & 255) * (1 - k);
  var c = (a & 255) * k + (b & 255) * (1 - k);
  return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (c | 0) + ')';
}

// ---------- main render ----------

Ray.render = function (ctx, W, H, now) {
  Ray.setup(W);
  var p = World.player;
  var cols = Ray.cols, COL = Ray.COL;
  var horizon = H * (0.5 + (p.pitch || 0));
  var eyeZ = p.eyeZ;
  Ray._H = H; Ray._horizon = horizon; Ray._eyeZ = eyeZ;

  var pal = palette(p.x, p.y);
  var outdoor = isOutdoorCell(Math.floor(p.x), Math.floor(p.y));
  var fogK = outdoor ? CONFIG.fog.outdoor : pal.fog;

  var grad = ctx.createLinearGradient(0, 0, 0, Math.max(2, horizon + 2));
  if (outdoor) {
    grad.addColorStop(0, '#79b7ea'); grad.addColorStop(0.75, '#a8d4f0'); grad.addColorStop(1, '#d8ecf8');
  } else {
    grad.addColorStop(0, pal.ceil[0]); grad.addColorStop(1, pal.ceil[1]);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, Math.max(2, horizon + 2));
  if (outdoor) Ray.drawSun(ctx, W, horizon, now);

  grad = ctx.createLinearGradient(0, horizon - 2, 0, H);
  grad.addColorStop(0, pal.floor[0]); grad.addColorStop(1, pal.floor[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, horizon - 2 < 0 ? 0 : horizon - 2, W, H);

  var dirX = Math.cos(p.dir), dirY = Math.sin(p.dir);
  var planeX = -dirY * Ray.FOVK, planeY = dirX * Ray.FOVK;

  for (var c = 0; c < cols; c++) {
    var cameraX = 2 * c / cols - 1;
    var rayX = dirX + planeX * cameraX;
    var rayY = dirY + planeY * cameraX;

    var mapX = Math.floor(p.x), mapY = Math.floor(p.y);
    var dDX = Math.abs(1 / (rayX || 1e-9)), dDY = Math.abs(1 / (rayY || 1e-9));
    var stepX, stepY, sideX, sideY;
    if (rayX < 0) { stepX = -1; sideX = (p.x - mapX) * dDX; }
    else          { stepX = 1;  sideX = (mapX + 1 - p.x) * dDX; }
    if (rayY < 0) { stepY = -1; sideY = (p.y - mapY) * dDY; }
    else          { stepY = 1;  sideY = (mapY + 1 - p.y) * dDY; }

    var k0 = idx(mapX, mapY);
    var segF = World.solid[k0] ? 0 : World.floor[k0];
    var segC = World.solid[k0] ? 1.4 : (World.ceil[k0] > 0 ? World.ceil[k0] : 90);
    var segA = World.area[k0];
    var dEnter = 0.06;
    Ray._oN = 1; Ray._oA[0] = 0; Ray._oB[0] = H;
    Ray._col = c; Ray._occN = 0;
    var side = 0, guard = 0, done = false;

    while (!done && guard++ < 90) {
      var dBoundary;
      if (sideX < sideY) { dBoundary = sideX; sideX += dDX; mapX += stepX; side = 0; }
      else               { dBoundary = sideY; sideY += dDY; mapY += stepY; side = 1; }
      if (dBoundary > 40) break;
      if (!inMap(mapX, mapY)) break;
      var d = Math.max(0.08, dBoundary);
      var kk = idx(mapX, mapY);
      var nF = World.floor[kk];
      var nC = World.ceil[kk] > 0 ? World.ceil[kk] : 90;
      var nA = World.area[kk];

      if (nA !== segA) {
        Ray.band(ctx, segF, dEnter, d, segA, fogK, false);
        Ray.band(ctx, segC, dEnter, d, segA, fogK, true);
        segA = nA;
      }

      if (World.solid[kk]) {
        Ray.band(ctx, segF, dEnter, d, segA, fogK, false);
        Ray.band(ctx, segC, dEnter, d, segA, fogK, true);
        var wallX = side === 0 ? p.y + d * rayY : p.x + d * rayX;
        wallX -= Math.floor(wallX);
        var wTop = World.ceil[kk] > 0 ? Math.min(segC, World.ceil[kk]) : segC;
        Ray.face(ctx, d, wTop, segF, side, wallX, segA, fogK, 'wall', true);
        Ray.zbuf[c] = d;
        done = true;
        break;
      }

      Ray.band(ctx, segF, dEnter, d, segA, fogK, false);
      Ray.band(ctx, segC, dEnter, d, segA, fogK, true);

      if (nF > segF + 0.01) {
        Ray.face(ctx, d, nF, segF, side, 0, segA, fogK, 'riser', true);
        segF = nF;
      } else if (nF < segF - 0.01) {
        Ray.face(ctx, d, segF, nF, side, 0, segA, fogK, 'ledge', true);
        segF = nF;
      }
      if (Math.abs(nC - segC) > 0.01) {
        if (nC < 50 && segC < 50) {
          Ray.face(ctx, d, Math.max(segC, nC), Math.min(segC, nC), side, 0, segA, fogK, 'soffit', false);
        }
        segC = nC;
      }
      dEnter = d;
    }

    if (!done) {
      Ray.band(ctx, segF, dEnter, 40, segA, fogK, false);
      Ray.zbuf[c] = 40;
    }
    Ray.occN[c] = Ray._occN;
  }

  // ---- sprites ----
  ctx.imageSmoothingEnabled = true;
  var list = Ray.collectSprites(now);
  list.sort(function (a, b) { return b.d2 - a.d2; });
  for (var i = 0; i < list.length; i++) {
    Ray.drawSprite(ctx, W, H, list[i], now, dirX, dirY, planeX, planeY);
  }

  Ray.drawWeapon(ctx, W, H, now);
  Ray.drawCrosshair(ctx, W, H);
  Ray.drawGoalArrow(ctx, W, H, now);
};

// y of height h at distance d on screen
Ray.yAt = function (h, d) {
  return Ray._horizon + (Ray._eyeZ - h) * Ray._H / d;
};

// friendly arrow pointing toward the current goal when it is not ahead of you
Ray.drawGoalArrow = function (ctx, W, H, now) {
  if (!World.player || !Game.goalPos) return;
  var gp = Game.goalPos();
  if (!gp) return;
  var p = World.player;
  var dx = gp.x - p.x, dy = gp.y - p.y;
  var dist = Math.hypot(dx, dy);
  if (dist < 1.8) return;
  var ang = Math.atan2(dy, dx) - p.dir;
  while (ang > Math.PI) ang -= 2 * Math.PI;
  while (ang < -Math.PI) ang += 2 * Math.PI;
  if (Math.abs(ang) < 0.4) return;   // goal is roughly ahead — beacon is visible

  var r = Math.min(W, H) * 0.3;
  var ax = W / 2 + Math.sin(ang) * r * 1.35;
  var ay = H / 2 + Math.max(-0.35, Math.min(0.35, -Math.cos(ang) * 0.5 + 0.25)) * r * 0.5;
  var s = Math.min(W, H) * 0.055;

  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(ang + Math.sin(now * 6) * 0.08);
  ctx.globalAlpha = 0.8 + 0.2 * Math.sin(now * 6);
  ctx.fillStyle = '#5da641';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(2, s * 0.16);
  ctx.beginPath();
  ctx.moveTo(s, 0);
  ctx.lineTo(-s * 0.7, -s * 0.75);
  ctx.lineTo(-s * 0.25, 0);
  ctx.lineTo(-s * 0.7, s * 0.75);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
};

Ray.drawSun = function (ctx, W, horizon, now) {
  ctx.fillStyle = 'rgba(255,244,200,.9)';
  ctx.beginPath();
  ctx.arc(W * 0.78, horizon * 0.34, Math.min(W, horizon) * 0.07, 0, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,250,220,.25)';
  ctx.beginPath();
  ctx.arc(W * 0.78, horizon * 0.34, Math.min(W, horizon) * 0.12, 0, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (var i = 0; i < 2; i++) {
    var cx = ((0.2 + i * 0.45 + now * 0.004 * (i + 1)) % 1.2) * W - W * 0.1;
    var cy = horizon * (0.22 + i * 0.2);
    ctx.beginPath();
    ctx.ellipse(cx, cy, W * 0.055, horizon * 0.05, 0, 0, 7);
    ctx.ellipse(cx + W * 0.04, cy - horizon * 0.022, W * 0.038, horizon * 0.04, 0, 0, 7);
    ctx.fill();
  }
};

// floor/ceiling band of the cell we are leaving
Ray.band = function (ctx, h, d1, d2, areaId, fogK, isCeil) {
  if (isCeil && (h > 50 || h <= Ray._eyeZ + 0.03)) return;
  if (!isCeil && h >= Ray._eyeZ - 0.03) return;
  var y1 = Ray.yAt(h, d1), y2 = Ray.yAt(h, d2);
  var top = Math.max(0, Math.min(y1, y2)), bot = Math.min(Ray._H, Math.max(y1, y2));
  if (bot - top < 0.5) return;
  var pal = PALETTES[areaId] || PALETTES[0];
  var shade = Math.max(0.4, 1 - (d1 + d2) * 0.5 * fogK * 1.7);
  ctx.fillStyle = isCeil ? mixHex(pal.ceil[0], pal.ceil[1], shade)
                         : mixHex(pal.floor[0], pal.floor[1], shade);
  var x = Ray._col * Ray.COL;
  for (var i = 0; i < Ray._oN; i++) {
    var a = Math.max(top, Ray._oA[i]), b = Math.min(bot, Ray._oB[i]);
    if (b - a > 0.4) ctx.fillRect(x, a, Ray.COL + 1, b - a);
  }
};

// vertical face between hTop..hBot at distance d
Ray.face = function (ctx, d, hTop, hBot, side, wallX, areaId, fogK, kind, occ) {
  if (hBot >= hTop) return;
  var y0 = Math.max(0, Ray.yAt(hTop, d));
  var y1 = Math.min(Ray._H, Ray.yAt(hBot, d));
  if (y1 - y0 < 0.5) return;
  var pal = PALETTES[areaId] || PALETTES[0];
  var shade = Math.max(0.35, 1 - d * fogK * 1.5);
  if (side === 1) shade *= 0.82;
  var r, g, b;
  if (kind === 'wall') {
    var stripe = (wallX * 6) % 1;
    var sheen = stripe < 0.12 ? 1.26 : (stripe < 0.2 ? 0.82 : 1);
    r = pal.wall[0] * shade * sheen; g = pal.wall[1] * shade * sheen; b = pal.wall[2] * shade * sheen;
  } else if (kind === 'riser') {
    var ring = ((wallX || 0) * 4) % 1;
    var rs = ring < 0.5 ? 1 : 0.85;
    r = pal.riser[0] * shade * rs; g = pal.riser[1] * shade * rs; b = pal.riser[2] * shade * rs;
  } else if (kind === 'ledge') {
    r = pal.wain[0] * shade * 0.7; g = pal.wain[1] * shade * 0.7; b = pal.wain[2] * shade * 0.7;
  } else {
    r = pal.wall[0] * shade * 0.6; g = pal.wall[1] * shade * 0.6; b = pal.wall[2] * shade * 0.6;
  }
  var x = Ray._col * Ray.COL;
  ctx.fillStyle = 'rgb(' + Math.min(255, r | 0) + ',' + Math.min(255, g | 0) + ',' + Math.min(255, b | 0) + ')';
  var drawnTop = 1e9, drawnBot = -1e9, i;
  for (i = 0; i < Ray._oN; i++) {
    var a = Math.max(y0, Ray._oA[i]), bb = Math.min(y1, Ray._oB[i]);
    if (bb - a > 0.4) {
      ctx.fillRect(x, a, Ray.COL + 1, bb - a);
      if (a < drawnTop) drawnTop = a;
      if (bb > drawnBot) drawnBot = bb;
    }
  }
  // painted lower band on tall walls — reads as a prison wall
  if (kind === 'wall' && (y1 - y0) > Ray._H * 0.12) {
    var wy = y0 + (y1 - y0) * 0.62;
    ctx.fillStyle = 'rgb(' + Math.min(255, pal.wain[0] * shade | 0) + ',' +
                    Math.min(255, pal.wain[1] * shade | 0) + ',' +
                    Math.min(255, pal.wain[2] * shade | 0) + ')';
    for (i = 0; i < Ray._oN; i++) {
      var wa = Math.max(wy, Ray._oA[i]), wb = Math.min(y1, Ray._oB[i]);
      if (wb - wa > 0.4) {
        ctx.fillRect(x, wa, Ray.COL + 1, wb - wa);
        if (wa < drawnTop) drawnTop = wa;
      }
    }
  }

  // subtract [y0,y1] from open intervals
  var nN = 0;
  for (i = 0; i < Ray._oN && nN < 4; i++) {
    if (y1 <= Ray._oA[i] || y0 >= Ray._oB[i]) {
      Ray._oA[nN] = Ray._oA[i]; Ray._oB[nN] = Ray._oB[i]; nN++;
      continue;
    }
    if (Ray._oA[i] < y0 - 0.4) { Ray._oA[nN] = Ray._oA[i]; Ray._oB[nN] = y0; nN++; }
    if (Ray._oB[i] > y1 + 0.4 && nN < 4) { Ray._oA[nN] = y1; Ray._oB[nN] = Ray._oB[i]; nN++; }
  }
  Ray._oN = nN;

  if (occ && Ray._occN < Ray.MAXOCC && drawnBot - drawnTop > 0.4) {
    var oi = Ray._col * Ray.MAXOCC + Ray._occN;
    Ray.occD[oi] = d;
    Ray.occY0[oi] = drawnTop;
    Ray.occY1[oi] = drawnBot;
    Ray._occN++;
  }
};

// ---------- sprites ----------

Ray.collectSprites = function (now) {
  var p = World.player;
  var list = [];
  function add(x, y, sprite, scale, opts) {
    opts = opts || {};
    list.push({
      x: x, y: y, sprite: sprite, scale: scale,
      z: opts.z || 0, tall: opts.tall || 1, ent: opts.ent || null,
      alpha: opts.alpha === undefined ? 1 : opts.alpha,
      flat: opts.flat || null, flash: opts.flash, spin: opts.spin, d2: (x - p.x) * (x - p.x) + (y - p.y) * (y - p.y)
    });
  }

  for (var i = 0; i < World.props.length; i++) {
    var pr = World.props[i];
    var key = pr.sprite;
    if (pr.anim === 'flag') key = (now * 2 % 2 < 1) ? 'flag0' : 'flag1';
    if (pr.pressed) key = 'button1';
    if (pr.hidden) continue;
    add(pr.x, pr.y, key, pr.scale, { z: pr.z, tall: pr.tall, flat: pr.flat, ent: pr });
  }

  for (i = 0; i < World.entities.length; i++) {
    var e = World.entities[i];
    if (e.dead) continue;
    add(e.x, e.y, e.sprite, e.scale, {
      z: e.z, tall: e.tall, ent: e, alpha: e.alpha, flash: e.flash, spin: e.spin
    });
  }

  if (World.barry && World.barry.visible) Barry.addSprites(add, now);
  if (World.chef && World.chef.visible) Bosses.addChefSprites(add, now);
  if (World.robo && World.robo.visible) Bosses.addRoboSprites(add, now);

  // the bouncing "go here!" beacon on the current goal
  var gp = typeof Game !== 'undefined' && Game.goalPos ? Game.goalPos() : null;
  if (gp && Game.state === 'playing') {
    add(gp.x, gp.y, 'goalbeacon', 0.42, {
      z: gp.z + 0.45 + Math.sin(now * 3) * 0.16,
      alpha: 0.75 + 0.25 * Math.sin(now * 5)
    });
  }

  return list;
};

var _blkA = [0, 0, 0, 0, 0, 0], _blkB = [0, 0, 0, 0, 0, 0];

Ray.drawSprite = function (ctx, W, H, s, now, dirX, dirY, planeX, planeY) {
  var p = World.player;
  var relX = s.x - p.x, relY = s.y - p.y;
  var invDet = 1 / (planeX * dirY - dirX * planeY);
  var tx = invDet * (dirY * relX - dirX * relY);
  var ty = invDet * (-planeY * relX + planeX * relY);
  if (ty <= 0.08) return;
  var COL = Ray.COL, cols = Ray.cols;
  var screenX = (cols / 2) * (1 + tx / ty);
  var size = Math.abs(H / ty) * s.scale;

  // ---- flat ground decals: shadows, rings, markers ----
  if (s.flat) {
    var gy = Ray.yAt(s.z + 0.01, ty);
    var cx = screenX * COL;
    if (gy > -50 && gy < H + 50 && Ray.zbuf[Math.max(0, Math.min(cols - 1, Math.round(screenX)))] > ty) {
      if (s.flat === 'shadow') {
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        ctx.beginPath();
        ctx.ellipse(cx, gy, size * 0.5, Math.max(2, size * 0.16), 0, 0, 7);
        ctx.fill();
      } else if (s.flat === 'ring') {
        ctx.strokeStyle = s.color || 'rgba(244,172,74,.9)';
        ctx.lineWidth = Math.max(2, size * 0.08);
        ctx.beginPath();
        ctx.ellipse(cx, gy, size * 0.5, Math.max(2, size * 0.2), 0, 0, 7);
        ctx.stroke();
      } else if (s.flat === 'marker') {
        var pu = 0.3 + 0.25 * Math.sin(now * 8);
        ctx.fillStyle = 'rgba(60,40,20,' + pu + ')';
        ctx.beginPath();
        ctx.ellipse(cx, gy, size * 0.5, Math.max(2, size * 0.2), 0, 0, 7);
        ctx.fill();
      } else if (s.flat === 'shock') {
        var kk = 0.35 + 0.3 * Math.sin(now * 20);
        ctx.strokeStyle = 'rgba(255,170,60,' + kk + ')';
        ctx.lineWidth = Math.max(3, size * 0.1);
        ctx.beginPath();
        ctx.ellipse(cx, gy, size * 0.55, Math.max(3, size * 0.22), 0, 0, 7);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,230,150,' + kk * 0.8 + ')';
        ctx.lineWidth = Math.max(2, size * 0.05);
        ctx.beginPath();
        ctx.ellipse(cx, gy, size * 0.38, Math.max(2, size * 0.15), 0, 0, 7);
        ctx.stroke();
      }
    }
    return;
  }

  var st = s.scale * (s.tall || 1);
  var hsize = st * H / ty;
  var drawY = Ray._horizon + (Ray._eyeZ - (s.z + st)) * H / ty;
  var halfC = (size / COL) / 2;
  var startC = Math.max(0, Math.floor(screenX - halfC));
  var endC = Math.min(cols - 1, Math.ceil(screenX + halfC));
  var img = s.flash > 0 ? flashSprite(s.sprite) : SPRITES[s.sprite];
  if (!img) return;

  // soft shadow on the ground under billboards
  var gy2 = Ray.yAt(s.z + 0.01, ty);
  if (gy2 < H + 60 && gy2 > Ray._horizon - 10) {
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.beginPath();
    ctx.ellipse(screenX * COL, gy2, size * 0.38, Math.max(2, size * 0.1), 0, 0, 7);
    ctx.fill();
  }

  ctx.globalAlpha = s.alpha;
  var spin = s.spin ? Math.cos(now * 10) : 1;

  for (var c2 = startC; c2 <= endC; c2++) {
    if (Ray.zbuf[c2] <= ty) continue;
    var u = (c2 - (screenX - halfC)) / (halfC * 2);
    if (s.spin) {
      u = 0.5 + (u - 0.5) * Math.abs(spin);
      if (spin < 0) u = 1 - u;
    }
    var srcX = Math.floor(u * img.width);
    if (srcX < 0 || srcX >= img.width) continue;

    // vertical clipping vs nearer faces
    var n = Ray.occN[c2], nblk = 0, i;
    for (i = 0; i < n; i++) {
      var oi = c2 * Ray.MAXOCC + i;
      if (Ray.occD[oi] < ty) {
        _blkA[nblk] = Math.max(drawY, Ray.occY0[oi]);
        _blkB[nblk] = Math.min(drawY + hsize, Ray.occY1[oi]);
        if (_blkB[nblk] - _blkA[nblk] > 0.5) nblk++;
      }
    }
    // draw slices between blocked ranges
    var y = drawY;
    for (i = 0; i <= nblk; i++) {
      var nextBlock = i < nblk ? _blkA[i] : drawY + hsize;
      var segTop = Math.max(0, y), segBot = Math.min(H, nextBlock);
      if (segBot - segTop > 0.5) {
        var sy = (segTop - drawY) / hsize * img.height;
        var sh = (segBot - segTop) / hsize * img.height;
        ctx.drawImage(img, srcX, sy, 1, sh, c2 * COL, segTop, COL + 1, segBot - segTop);
      }
      if (i < nblk) y = Math.max(y, _blkB[i]);
    }
  }
  ctx.globalAlpha = 1;

  // speech bubbles / tags above characters
  if (s.ent && s.ent.say && s.ent.say.t > 0) {
    var bx = screenX * COL, by = drawY - 12;
    var fs = Math.max(16, Math.min(42, size * 0.3));
    ctx.font = 'bold ' + fs + 'px sans-serif';
    var tw = ctx.measureText(s.ent.say.text).width;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(40,50,70,.9)';
    ctx.lineWidth = 3;
    rr(ctx, bx - tw / 2 - 10, by - fs - 10, tw + 20, fs + 16, 10);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx - 7, by + 5); ctx.lineTo(bx + 7, by + 5); ctx.lineTo(bx, by + 15);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e5493a';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s.ent.say.text, bx, by - fs / 2 - 2);
  }
  if (s.ent && s.ent.tag && Ray.zbuf[Math.max(0, Math.min(cols - 1, Math.round(screenX)))] > ty) {
    var tx2 = screenX * COL;
    var fs2 = Math.max(13, Math.min(26, size * 0.14));
    ctx.font = 'bold ' + fs2 + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,.85)';
    ctx.lineWidth = 4;
    ctx.strokeText(s.ent.tag, tx2, drawY - fs2 - 6);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(s.ent.tag, tx2, drawY - fs2 - 6);
  }
  // dizzy stars
  if (s.ent && s.ent.dizzy && s.ent.dizzy > 0) {
    var sx = screenX * COL;
    for (var st2 = 0; st2 < 3; st2++) {
      var a = now * 4 + st2 * 2.1;
      ctx.fillStyle = '#f6d44d';
      ctx.font = (Math.max(14, size * 0.16)) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('★', sx + Math.cos(a) * size * 0.3, drawY - 8 + Math.sin(a) * size * 0.08);
    }
  }
};

// ---------- weapon view + crosshair ----------

Ray.drawWeapon = function (ctx, W, H, now) {
  var p = World.player;
  if (Game.state !== 'playing' && Game.state !== 'mode') return;
  var k = Math.max(0.7, W / 1100);
  var bob = Math.sin(now * 8) * (p.moving ? 6 : 1.5) * k;

  if (p.hasBazooka) {
    var recoil = p.shotAnim > 0 ? Math.sin((0.34 - p.shotAnim) / 0.34 * Math.PI) : 0;
    ctx.save();
    ctx.translate(W * 0.66, H + 14 * k + bob + recoil * 26 * k);
    ctx.scale(k, k);
    ctx.rotate(-0.42 + recoil * 0.14);
    // tube
    ctx.fillStyle = '#5d8f4a';
    rr(ctx, -34, -220, 68, 230, 26); ctx.fill();
    ctx.fillStyle = '#4a733b';
    rr(ctx, -34, -60, 68, 70, 18); ctx.fill();
    ctx.fillStyle = '#3c5f30';
    ctx.beginPath(); ctx.ellipse(0, -218, 34, 12, 0, 0, 7); ctx.fill();
    // muzzle fruit
    var kinds = ['fruit_apple', 'fruit_banana', 'fruit_melon'];
    var fk = kinds[(p.fruitIdx || 0) % 3];
    ctx.save();
    ctx.translate(0, -214);
    ctx.scale(0.5, 0.5);
    ctx.drawImage(SPRITES[fk], -28, -28);
    ctx.restore();
    // stripe + star
    ctx.fillStyle = '#f6d44d';
    ctx.fillRect(-34, -120, 68, 10);
    ctx.restore();
  } else {
    ctx.fillStyle = '#f2c9a0';
    ctx.save();
    ctx.translate(W * 0.72, H + 8 * k + bob);
    ctx.scale(k, k);
    ctx.beginPath(); ctx.arc(0, -58, 27, 0, 7); ctx.fill();
    ctx.fillStyle = '#e0b088';
    ctx.beginPath(); ctx.arc(-8, -66, 7, 0, 7); ctx.arc(8, -66, 7, 0, 7); ctx.fill();
    ctx.restore();
  }
};

Ray.drawCrosshair = function (ctx, W, H) {
  var s = Math.max(3, W / 480);
  var on = Game.aimTarget;
  ctx.strokeStyle = on ? '#5da641' : 'rgba(255,255,255,.85)';
  ctx.lineWidth = Math.max(2, s / 1.6);
  var m = on ? s * 3.4 : s * 2.2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - m, H / 2); ctx.lineTo(W / 2 - s * 0.7, H / 2);
  ctx.moveTo(W / 2 + s * 0.7, H / 2); ctx.lineTo(W / 2 + m, H / 2);
  ctx.moveTo(W / 2, H / 2 - m); ctx.lineTo(W / 2, H / 2 - s * 0.7);
  ctx.moveTo(W / 2, H / 2 + s * 0.7); ctx.lineTo(W / 2, H / 2 + m);
  ctx.stroke();
  if (on) {
    ctx.fillStyle = '#5da641';
    ctx.beginPath(); ctx.arc(W / 2, H / 2, s * 0.8, 0, 7); ctx.fill();
  }
};
