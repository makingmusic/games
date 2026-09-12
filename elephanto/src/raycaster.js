// Elephanto — Wolfenstein-style raycasting renderer on a 2D canvas.
// No WebGL: fast and dependable on mobile Safari.

var Raycaster = { zbuf: null, wallTex: null, wallTexReady: false, sky: null, dust: null, flashCache: {} };

// Optional wall texture: loads async; if it fails, walls keep the
// procedural brushed-metal shading below, unchanged.
Raycaster.loadWallTexture = function () {
  if (typeof Image === 'undefined') return;
  var img = new Image();
  img.onload = function () { Raycaster.wallTex = img; Raycaster.wallTexReady = true; };
  img.onerror = function () { Raycaster.wallTexReady = false; };
  img.src = 'assets/wall-metal.png';
};

// ---------- area identity ----------

// Wall color multipliers, keyed by the floor char on the ray's side of the
// wall, so each room reads differently: arena = dark menacing warm metal,
// gym = cool blue-gray, stash = warm, hall = neutral, 'o' = base exterior.
var AREA_TINTS = {
  '.': [1.0, 1.0, 1.04],
  'A': [1.05, 0.62, 0.52],
  'g': [0.72, 0.88, 1.18],
  's': [1.12, 0.95, 0.68],
  'o': [0.9, 0.95, 1.05]
};
function wallAreaTint(ch) { return AREA_TINTS[ch] || AREA_TINTS['.']; }

// Ceiling/floor gradient pairs + fog density per area the PLAYER stands in.
var AREA_AMBIENCE = {
  '.': { ceil: ['#191b1f', '#33363c'], floor: ['#3a3d42', '#232528'], fog: 0.055 },
  'A': { ceil: ['#221016', '#402020'], floor: ['#452a2c', '#221213'], fog: 0.075 },
  'g': { ceil: ['#141e28', '#26394c'], floor: ['#2e3c4a', '#1a232d'], fog: 0.055 },
  's': { ceil: ['#241d12', '#403420'], floor: ['#423a28', '#231e12'], fog: 0.05 }
};
function areaAmbience(ch) { return AREA_AMBIENCE[ch] || AREA_AMBIENCE['.']; }

// Wayfinding sign posts (procedural plates from sprites.js).
var SIGNS = [
  { x: 10.3, y: 9.5, sprite: 'signArena' },  // left of the arena door
  { x: 19.7, y: 9.5, sprite: 'signStash' },  // right of the stash door
  { x: 16.4, y: 9.6, sprite: 'signGym' }     // left of the gym door
];

// ---------- small decor caches ----------

function skyDecor() {
  if (!Raycaster.sky) {
    var stars = [], clouds = [], i;
    for (i = 0; i < 22; i++) {
      stars.push({ x: Math.random(), y: Math.random() * 0.38,
                   tw: 1.5 + Math.random() * 2.5, ph: Math.random() * 6.28 });
    }
    for (i = 0; i < 4; i++) {
      clouds.push({ x: Math.random(), y: 0.08 + Math.random() * 0.2,
                    w: 0.14 + Math.random() * 0.16, h: 0.035 + Math.random() * 0.025,
                    sp: 0.004 + Math.random() * 0.006 });
    }
    Raycaster.sky = { stars: stars, clouds: clouds };
  }
  return Raycaster.sky;
}

function dustMotes() {
  if (!Raycaster.dust) {
    Raycaster.dust = [];
    for (var i = 0; i < 20; i++) {
      Raycaster.dust.push({ x: 8.5 + Math.random() * 13, y: 9.5 + Math.random() * 5,
                            ph: Math.random() * 6.28, sp: 0.3 + Math.random() * 0.5 });
    }
  }
  return Raycaster.dust;
}

// Red-tinted copy of a sprite, cached per sprite version (PNG swaps bump it).
Raycaster.flashSprite = function (key) {
  var ver = (typeof SPRITES_VER !== 'undefined' && SPRITES_VER[key]) || 0;
  var ck = key + ':' + ver;
  if (!Raycaster.flashCache[ck]) {
    var src = SPRITES[key];
    var c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    var g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(255,70,50,.6)';
    g.fillRect(0, 0, c.width, c.height);
    Raycaster.flashCache[ck] = c;
  }
  return Raycaster.flashCache[ck];
};

// ---------- main render ----------

Raycaster.render = function (ctx, W, H) {
  var p = World.player;
  var now = Game.time || 0;

  // column width: scale with resolution so per-frame cost stays flat
  var COL = Math.max(2, Math.round(W / 640));
  var cols = Math.ceil(W / COL);
  if (!Raycaster.zbuf || Raycaster.zbuf.length !== cols) Raycaster.zbuf = new Float32Array(cols);
  var zbuf = Raycaster.zbuf;

  // ---- ceiling & floor (per-area palettes) ----
  var outdoor = isOutdoorXY(p.x, p.y);
  var amb = areaAmbience(mapChar(p.x, p.y));
  var fogK = outdoor ? 0.035 : amb.fog;
  var grad = ctx.createLinearGradient(0, 0, 0, H / 2);
  if (outdoor) {
    grad.addColorStop(0, '#33457a'); grad.addColorStop(0.7, '#7a5a80'); grad.addColorStop(1, '#d98a52'); // dusk sky
  } else {
    grad.addColorStop(0, amb.ceil[0]); grad.addColorStop(1, amb.ceil[1]);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H / 2);

  if (outdoor) {
    // dusk stars + slow drifting clouds
    var sky = skyDecor();
    var i, st;
    for (i = 0; i < sky.stars.length; i++) {
      st = sky.stars[i];
      ctx.fillStyle = 'rgba(255,255,240,' + (0.35 + 0.3 * Math.sin(now * st.tw + st.ph)) + ')';
      ctx.fillRect(st.x * W, st.y * H, 2.5, 2.5);
    }
    ctx.fillStyle = 'rgba(240,220,230,.16)';
    for (i = 0; i < sky.clouds.length; i++) {
      var cl = sky.clouds[i];
      var cx = ((cl.x + now * cl.sp) % 1.2 - 0.1) * W;
      ctx.beginPath();
      ctx.ellipse(cx, cl.y * H, cl.w * W, cl.h * H, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  grad = ctx.createLinearGradient(0, H / 2, 0, H);
  if (outdoor) {
    grad.addColorStop(0, '#4a7a3a'); grad.addColorStop(1, '#2e4a26'); // grass
  } else {
    grad.addColorStop(0, amb.floor[0]); grad.addColorStop(1, amb.floor[1]);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, H / 2, W, H / 2);

  // ---- walls (DDA) ----
  ctx.imageSmoothingEnabled = false; // crisp texture slices on wall columns
  var dirX = Math.cos(p.dir), dirY = Math.sin(p.dir);
  var planeX = -dirY * TAN_HALF_FOV, planeY = dirX * TAN_HALF_FOV;

  for (var c = 0; c < cols; c++) {
    var cameraX = 2 * c / cols - 1;
    var rayX = dirX + planeX * cameraX;
    var rayY = dirY + planeY * cameraX;

    var mapX = Math.floor(p.x), mapY = Math.floor(p.y);
    var dDistX = Math.abs(1 / (rayX || 1e-9));
    var dDistY = Math.abs(1 / (rayY || 1e-9));
    var stepX, stepY, sideX, sideY;

    if (rayX < 0) { stepX = -1; sideX = (p.x - mapX) * dDistX; }
    else          { stepX = 1;  sideX = (mapX + 1 - p.x) * dDistX; }
    if (rayY < 0) { stepY = -1; sideY = (p.y - mapY) * dDistY; }
    else          { stepY = 1;  sideY = (mapY + 1 - p.y) * dDistY; }

    var side = 0, hit = false, guard = 0;
    while (!hit && guard++ < 64) {
      if (sideX < sideY) { sideX += dDistX; mapX += stepX; side = 0; }
      else               { sideY += dDistY; mapY += stepY; side = 1; }
      if (mapChar(mapX, mapY) === '#') hit = true;
    }

    var perp = side === 0 ? sideX - dDistX : sideY - dDistY;
    if (perp < 0.01) perp = 0.01;
    zbuf[c] = perp;

    var lineH = Math.min(H * 4, H / perp);
    var y0 = (H - lineH) / 2;

    // brushed-metal wall shading: gray base, side shade, sheen stripes, area tint
    var wallX = side === 0 ? p.y + perp * rayY : p.x + perp * rayX;
    wallX -= Math.floor(wallX);
    var light = side === 1 ? 0.72 : 1.0;                     // E/W walls darker
    var stripe = (wallX * 6) % 1;
    if (stripe < 0.14) light *= 1.45;                        // sheen stripe
    else if (stripe < 0.22) light *= 0.8;                    // groove
    var fog = Math.max(0.25, 1 - perp * fogK);               // per-area distance fog
    var v = Math.floor((side === 1 ? 118 : 148) * light * fog);
    if (v > 235) v = 235;
    var tint = wallAreaTint(mapChar(side === 0 ? mapX - stepX : mapX,
                                    side === 1 ? mapY - stepY : mapY));
    ctx.fillStyle = 'rgb(' + Math.min(255, Math.floor(v * tint[0])) + ',' +
                           Math.min(255, Math.floor((v + 4) * tint[1])) + ',' +
                           Math.min(255, Math.floor((v + 10) * tint[2])) + ')';
    ctx.fillRect(c * COL, y0, COL, lineH);

    // real metal texture blended over the procedural shading
    // (side shade, sheen stripes, area tint and fog stay in charge)
    if (Raycaster.wallTexReady) {
      var tex = Raycaster.wallTex;
      var texX = Math.floor(wallX * tex.width) % tex.width;
      ctx.globalAlpha = (outdoor ? 0.4 : 0.55) * fog;
      ctx.drawImage(tex, texX, 0, 1, tex.height, c * COL, y0, COL, lineH);
      ctx.globalAlpha = 1;
    }
  }

  // ---- sprites (billboards) ----
  ctx.imageSmoothingEnabled = true; // smooth upscale for character art
  var list = Raycaster.collectSprites(now);
  list.sort(function (a, b) { return b.d - a.d; }); // far to near

  for (var i = 0; i < list.length; i++) {
    var s = list[i];
    var relX = s.x - p.x, relY = s.y - p.y;
    var invDet = 1 / (planeX * dirY - dirX * planeY);
    var tx = invDet * (dirY * relX - dirX * relY);
    var ty = invDet * (-planeY * relX + planeX * relY);
    if (ty <= 0.05) continue; // behind the camera

    var screenX = (cols / 2) * (1 + tx / ty);     // in columns
    var size = Math.abs(H / ty) * s.scale;        // in pixels
    var halfC = (size / COL) / 2;                 // half-width in columns
    var drawY = (H - size) / 2 + (1 - s.scale) * (H / ty) * 0.5; // feet on the floor
    var startC = Math.max(0, Math.floor(screenX - halfC));
    var endC = Math.min(cols - 1, Math.ceil(screenX + halfC));
    var centerC = Math.max(0, Math.min(cols - 1, Math.round(screenX)));
    var visible = zbuf[centerC] > ty;
    var img = (s.ent && s.ent.flash > 0) ? Raycaster.flashSprite(s.sprite) : SPRITES[s.sprite];
    var alpha = s.alpha === undefined ? 1 : s.alpha;

    // soft ground shadow so characters don't float
    if (s.ent && visible) {
      ctx.fillStyle = 'rgba(0,0,0,.32)';
      ctx.beginPath();
      ctx.ellipse(screenX * COL, drawY + size * 0.98,
                  size * 0.34, Math.max(3, size * 0.055), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = alpha;
    for (var stripeC = startC; stripeC <= endC; stripeC++) {
      if (zbuf[stripeC] <= ty) continue; // hidden behind a wall
      var srcX = Math.floor(((stripeC - (screenX - halfC)) / (halfC * 2)) * img.width);
      if (srcX < 0 || srcX >= img.width) continue;
      ctx.drawImage(img, srcX, 0, 1, img.height,
        stripeC * COL, drawY, COL + 1, size);
    }
    ctx.globalAlpha = 1;

    // boss overhead tag: name + remaining lives
    if (s.ent && s.ent.kind === 'boss' && visible) {
      var hearts = '';
      for (var h = 0; h < s.ent.lives; h++) hearts += '❤';
      var tag = s.ent.name.toUpperCase() + ' ' + hearts;
      var fontSize = Math.max(12, Math.min(24, size * 0.09));
      ctx.font = 'bold ' + fontSize + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,.85)';
      ctx.lineWidth = 3;
      ctx.strokeText(tag, screenX * COL, drawY - fontSize * 0.6);
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText(tag, screenX * COL, drawY - fontSize * 0.6);
    }
  }

  Raycaster.drawWeaponView(ctx, W, H);
  Raycaster.drawCrosshair(ctx, W, H);

  // arena atmosphere: subtle menacing pulse while inside
  if (isArenaXY(p.x, p.y) && Game.state === 'playing') {
    var pulse = 0.045 + 0.03 * Math.sin(now * 3.5);
    ctx.fillStyle = 'rgba(255,70,25,' + pulse + ')';
    ctx.fillRect(0, 0, W, H);
  }

  // hurt flash
  if (p.flash > 0) {
    ctx.fillStyle = 'rgba(200,30,30,' + Math.min(0.45, p.flash) + ')';
    ctx.fillRect(0, 0, W, H);
  }
};

Raycaster.collectSprites = function (now) {
  var p = World.player;
  var list = [];
  function add(x, y, sprite, scale, alpha, ent) {
    list.push({ x: x, y: y, sprite: sprite, scale: scale, alpha: alpha, ent: ent || null,
                d: (x - p.x) * (x - p.x) + (y - p.y) * (y - p.y) });
  }

  // interactables
  add(STASH_POS.x, STASH_POS.y, 'crate', 0.55);
  add(BENCH_POS.x, BENCH_POS.y, 'bench', 0.55);

  // wayfinding signs
  for (var i = 0; i < SIGNS.length; i++) add(SIGNS[i].x, SIGNS[i].y, SIGNS[i].sprite, 0.45);

  // ground weapons
  for (i = 0; i < World.pickups.length; i++) {
    var pk = World.pickups[i];
    if (!pk.taken) add(pk.x, pk.y, pk.weapon, 0.3);
  }

  // characters (pass the entity for shadows / hit flash / boss tags)
  if (World.coffee.lives > 0) add(World.coffee.x, World.coffee.y, 'coffeeMan', World.coffee.scale, 1, World.coffee);
  if (World.tea.lives > 0) add(World.tea.x, World.tea.y, 'teaGirl', World.tea.scale, 1, World.tea);
  if (!World.pete.resting) add(World.pete.x, World.pete.y, 'pete', World.pete.scale, 1, World.pete);
  add(World.tuado.x, World.tuado.y, 'tuado', World.tuado.scale, 1, World.tuado);
  for (i = 0; i < World.minions.length; i++) {
    var m = World.minions[i];
    if (m.hp > 0) add(m.x, m.y, 'minion', m.scale, 1, m);
  }

  // lava blobs in flight (arc: rise then fall)
  for (i = 0; i < World.lava.length; i++) {
    var l = World.lava[i];
    add(l.x, l.y, 'lava', 0.2 + 0.18 * Math.sin(l.t * Math.PI));
  }

  // splash effects (fade out)
  for (i = 0; i < World.effects.length; i++) {
    var e = World.effects[i];
    add(e.x, e.y, e.sprite, e.scale * (1.6 - e.t), Math.max(0, e.t * 2));
  }

  // ambient dust motes drifting indoors
  if (!isOutdoorXY(p.x, p.y)) {
    var motes = dustMotes();
    for (i = 0; i < motes.length; i++) {
      var mo = motes[i];
      add(mo.x + Math.sin(now * mo.sp + mo.ph) * 0.4,
          mo.y + Math.cos(now * mo.sp * 0.7 + mo.ph) * 0.4,
          'mote', 0.05 + 0.025 * Math.sin(now + mo.ph), 0.3);
    }
  }

  return list;
};

// Held weapon, drawn as a simple vector shape with a swing animation.
Raycaster.drawWeaponView = function (ctx, W, H) {
  var p = World.player;
  if (p.dead) return;
  var k = Math.max(0.7, W / 1100); // shapes were authored for ~1100px backing
  var swing = p.attackAnim > 0 ? Math.sin((0.28 - p.attackAnim) / 0.28 * Math.PI) : 0;
  var cx = W * 0.72, cy = H + 10 * k - swing * H * 0.18;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(k, k);
  ctx.rotate(-0.5 - swing * 0.9);
  if (p.weapon === 'bat') {
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-14, -170, 28, 170, 12) : ctx.rect(-14, -170, 28, 170); ctx.fill();
    ctx.fillStyle = '#5e3a17';
    ctx.fillRect(-9, -30, 18, 34);
  } else if (p.weapon === 'pipe') {
    ctx.fillStyle = '#9aa2ad';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-10, -180, 20, 180, 9) : ctx.rect(-10, -180, 20, 180); ctx.fill();
    ctx.fillStyle = '#c9d1da';
    ctx.fillRect(-10, -180, 20, 16);
  } else {
    // fists: two knuckles coming up from the bottom
    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath(); ctx.arc(0, -60 - swing * 30, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e0b088';
    ctx.beginPath(); ctx.arc(-8, -68 - swing * 30, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8, -68 - swing * 30, 7, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
};

Raycaster.drawCrosshair = function (ctx, W, H) {
  var p = World.player;
  var s = Math.max(2, W / 500);
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.fillRect(W / 2 - s / 2, H / 2 - s / 2, s, s);
  if (p.hitMarkerT > 0) {
    var m = s * 2.5;
    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth = Math.max(2, s / 1.5);
    ctx.beginPath();
    ctx.moveTo(W / 2 - m, H / 2 - m); ctx.lineTo(W / 2 + m, H / 2 + m);
    ctx.moveTo(W / 2 + m, H / 2 - m); ctx.lineTo(W / 2 - m, H / 2 + m);
    ctx.stroke();
  }
};
