// Elephanto — procedural character & item art.
// Every sprite is drawn on a 96x96 offscreen canvas at boot; no image files.

var SPRITES = {};
var SPRITES_VER = {}; // bumped by applyPNG so derived (tinted) caches refresh
var SPRITE_SIZE = 512; // sprite canvas resolution (draw fns use a 96x96 grid)

function makeSprite(drawFn) {
  var c = document.createElement('canvas');
  c.width = SPRITE_SIZE; c.height = SPRITE_SIZE;
  var g = c.getContext('2d');
  g.scale(SPRITE_SIZE / 96, SPRITE_SIZE / 96); // procedural art drawn on a 96 grid
  drawFn(g);
  // The transform persists on the context — reset it, or the PNG swap in
  // applyPNG (which draws in device pixels) would be scaled 5.3x off-canvas.
  g.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}

function circle(g, x, y, r, color) {
  g.fillStyle = color;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
}
function rrect(g, x, y, w, h, r, color) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.fill();
}
function staff(g, x1, y1, x2, y2) {
  g.strokeStyle = '#ffd23a'; g.lineWidth = 7; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  circle(g, x1, y1, 6, '#ffe680'); // knob on top
}
function eyes(g, x, y, gap, angry) {
  circle(g, x - gap, y, 5, '#fff');
  circle(g, x + gap, y, 5, '#fff');
  circle(g, x - gap, y + 1, 2.5, '#20242c');
  circle(g, x + gap, y + 1, 2.5, '#20242c');
  if (angry) {
    g.strokeStyle = '#20242c'; g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x - gap - 6, y - 8); g.lineTo(x - gap + 4, y - 4);
    g.moveTo(x + gap + 6, y - 8); g.lineTo(x + gap - 4, y - 4);
    g.stroke();
  }
}

function drawCoffeeMan(g) {
  staff(g, 76, 26, 84, 92);                    // yellow staff
  rrect(g, 22, 40, 48, 54, 12, '#5e35a0');     // purple robe
  rrect(g, 22, 62, 48, 8, 4, '#3f2268');       // belt
  circle(g, 46, 28, 17, '#a9744f');            // head
  rrect(g, 33, 2, 26, 14, 4, '#23262d');       // black coffee-cup hat
  g.strokeStyle = '#23262d'; g.lineWidth = 4;  // cup handle
  g.beginPath(); g.arc(61, 9, 5, -1.2, 1.2); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; // steam
  g.beginPath(); g.moveTo(42, -2); g.quadraticCurveTo(44, -6, 46, -2); g.stroke();
  eyes(g, 46, 26, 7, true);                    // angry eyes
  g.strokeStyle = '#3a2312'; g.lineWidth = 3;  // frown
  g.beginPath(); g.arc(46, 40, 6, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
}

function drawTeaGirl(g) {
  staff(g, 18, 26, 10, 92);                    // yellow staff
  g.fillStyle = '#3f8f4f';                     // tea-green dress
  g.beginPath();
  g.moveTo(56, 42); g.lineTo(76, 94); g.lineTo(36, 94); g.closePath(); g.fill();
  circle(g, 56, 30, 16, '#f2c9a0');            // head
  g.fillStyle = '#2e6b3a';                     // green hair
  g.beginPath(); g.arc(56, 24, 16, Math.PI, 0); g.fill();
  circle(g, 56, 8, 7, '#2e6b3a');              // bun
  circle(g, 56, 8, 3, '#ffd23a');              // bun pin
  rrect(g, 38, 22, 36, 17, 8, '#2e6b3a');      // green bandit mask
  eyes(g, 56, 30, 7, true);
  g.strokeStyle = '#8a4b2a'; g.lineWidth = 3;  // smug smile
  g.beginPath(); g.arc(56, 36, 6, 0.25, Math.PI - 0.25); g.stroke();
}

function drawPete(g) {
  rrect(g, 20, 42, 56, 52, 14, '#3a6ea5');     // big blue overalls
  rrect(g, 30, 42, 10, 26, 4, '#2b5580');      // straps
  rrect(g, 56, 42, 10, 26, 4, '#2b5580');
  circle(g, 48, 26, 18, '#f2c9a0');            // head
  g.fillStyle = '#f4f4f4';                     // white beard
  g.beginPath(); g.arc(48, 34, 14, 0.1, Math.PI - 0.1); g.fill();
  rrect(g, 32, 4, 32, 10, 5, '#c0392b');       // red cap
  circle(g, 48, 5, 4, '#e74c3c');
  eyes(g, 48, 24, 8, false);
  circle(g, 48, 30, 3, '#e8a58a');             // nose
}

function drawTuado(g) {
  g.strokeStyle = '#e8912d'; g.lineWidth = 7; g.lineCap = 'round'; // tail
  g.beginPath(); g.moveTo(76, 72); g.quadraticCurveTo(92, 66, 88, 48); g.stroke();
  g.fillStyle = '#e8912d';                     // body
  g.beginPath(); g.ellipse(48, 68, 26, 20, 0, 0, Math.PI * 2); g.fill();
  circle(g, 44, 40, 17, '#f2a541');            // head
  g.fillStyle = '#f2a541';                     // ears
  g.beginPath(); g.moveTo(30, 32); g.lineTo(26, 14); g.lineTo(42, 24); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(58, 32); g.lineTo(62, 14); g.lineTo(46, 24); g.closePath(); g.fill();
  circle(g, 38, 38, 4, '#20242c');             // eyes
  circle(g, 52, 38, 4, '#20242c');
  g.fillStyle = '#d97b8c';                     // nose + mouth
  g.beginPath(); g.moveTo(45, 45); g.lineTo(41, 45); g.lineTo(43, 48); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.5; // whiskers
  g.beginPath();
  g.moveTo(24, 42); g.lineTo(36, 44); g.moveTo(24, 48); g.lineTo(36, 47);
  g.moveTo(62, 42); g.lineTo(52, 44); g.moveTo(62, 48); g.lineTo(52, 47);
  g.stroke();
}

function drawMinion(g) {
  rrect(g, 26, 36, 44, 58, 10, '#3a3f4a');     // dark robe
  g.fillStyle = '#2c3038';                     // hood
  g.beginPath(); g.arc(48, 30, 17, Math.PI * 0.9, Math.PI * 2.1); g.fill();
  circle(g, 48, 32, 13, '#23262d');            // shadowed face
  circle(g, 42, 31, 3, '#e74c3c');             // glowing red eyes
  circle(g, 54, 31, 3, '#e74c3c');
}

function drawBat(g) {
  g.save();
  g.translate(48, 52); g.rotate(-0.7);
  rrect(g, -7, -34, 14, 62, 7, '#8a5a2b');
  rrect(g, -5, 24, 10, 16, 4, '#5e3a17');      // grip
  g.restore();
}

function drawPipe(g) {
  g.save();
  g.translate(48, 52); g.rotate(-0.7);
  rrect(g, -6, -36, 12, 72, 5, '#9aa2ad');
  rrect(g, -6, -36, 12, 10, 5, '#c9d1da');     // shiny end
  g.restore();
}

function drawStaff(g) {
  staff(g, 52, 10, 42, 92);                    // tall yellow staff, knob on top
}

function drawCrate(g) {
  rrect(g, 12, 40, 72, 50, 6, '#8a6a3a');      // wooden crate
  g.strokeStyle = '#5e4520'; g.lineWidth = 4;
  g.strokeRect(14, 42, 68, 46);
  g.beginPath(); g.moveTo(14, 42); g.lineTo(82, 88); g.moveTo(82, 42); g.lineTo(14, 88); g.stroke();
  drawBat(g); drawPipe(g);                     // weapons sticking out
  g.fillStyle = '#ffe9a8'; g.font = 'bold 13px sans-serif';
  g.textAlign = 'center'; g.fillText('STASH', 48, 68);
}

function drawBench(g) {
  rrect(g, 16, 56, 64, 10, 4, '#6a7078');      // bench pad
  rrect(g, 22, 66, 8, 22, 3, '#4a4f55');       // legs
  rrect(g, 66, 66, 8, 22, 3, '#4a4f55');
  g.strokeStyle = '#c9d1da'; g.lineWidth = 5;  // barbell
  g.beginPath(); g.moveTo(10, 26); g.lineTo(86, 26); g.stroke();
  circle(g, 12, 26, 12, '#3a3f4a');
  circle(g, 84, 26, 12, '#3a3f4a');
  circle(g, 20, 26, 8, '#555c66');
  circle(g, 76, 26, 8, '#555c66');
}

function drawLava(g) {
  var grad = g.createRadialGradient(48, 48, 4, 48, 48, 30);
  grad.addColorStop(0, '#fff3b0');
  grad.addColorStop(0.4, '#ff9f1c');
  grad.addColorStop(1, 'rgba(200,40,0,0)');
  g.fillStyle = grad;
  g.beginPath(); g.arc(48, 48, 30, 0, Math.PI * 2); g.fill();
  circle(g, 48, 48, 13, '#ff6b1a');
}

function drawSplash(g) {
  g.strokeStyle = 'rgba(255,120,20,.9)'; g.lineWidth = 8;
  g.beginPath(); g.arc(48, 60, 30, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = 'rgba(255,220,120,.8)'; g.lineWidth = 3;
  g.beginPath(); g.arc(48, 60, 18, 0, Math.PI * 2); g.stroke();
  circle(g, 30, 40, 5, '#ff9f1c');
  circle(g, 66, 36, 4, '#ff9f1c');
  circle(g, 52, 28, 3, '#ffd23a');
}

// Wayfinding signs: cartoon metal plate on posts, colored label.
function signPlate(g, text, color) {
  rrect(g, 21, 62, 7, 30, 3, '#555c66');       // posts
  rrect(g, 68, 62, 7, 30, 3, '#555c66');
  rrect(g, 6, 22, 84, 42, 9, '#33373d');       // metal plate
  g.strokeStyle = '#8a939e'; g.lineWidth = 3;
  g.strokeRect(10, 26, 76, 34);
  g.fillStyle = color;
  g.font = 'bold 20px sans-serif';
  g.textAlign = 'center';
  g.fillText(text, 48, 50);
  g.fillStyle = 'rgba(255,255,255,.15)';       // top sheen
  g.fillRect(10, 26, 76, 6);
}

function drawSignArena(g) { signPlate(g, 'ARENA ⚔', '#ff7043'); }
function drawSignGym(g)   { signPlate(g, 'GYM 💪', '#64b5f6'); }
function drawSignStash(g) { signPlate(g, 'STASH', '#ffd23a'); }

function drawMote(g) {
  var grad = g.createRadialGradient(48, 48, 2, 48, 48, 22);
  grad.addColorStop(0, 'rgba(255,255,255,.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.beginPath(); g.arc(48, 48, 22, 0, Math.PI * 2); g.fill();
}

function initSprites() {
  SPRITES.coffeeMan = makeSprite(drawCoffeeMan);
  SPRITES.teaGirl = makeSprite(drawTeaGirl);
  SPRITES.pete = makeSprite(drawPete);
  SPRITES.tuado = makeSprite(drawTuado);
  SPRITES.minion = makeSprite(drawMinion);
  SPRITES.bat = makeSprite(drawBat);
  SPRITES.pipe = makeSprite(drawPipe);
  SPRITES.staff = makeSprite(drawStaff);
  SPRITES.crate = makeSprite(drawCrate);
  SPRITES.bench = makeSprite(drawBench);
  SPRITES.lava = makeSprite(drawLava);
  SPRITES.splash = makeSprite(drawSplash);
  SPRITES.signArena = makeSprite(drawSignArena);
  SPRITES.signGym = makeSprite(drawSignGym);
  SPRITES.signStash = makeSprite(drawSignStash);
  SPRITES.mote = makeSprite(drawMote);
  loadSpritePNGs();
}

// ---------- PNG loader with procedural fallback ----------
// Every sprite above starts as procedural art. If a matching PNG exists in
// assets/, it is swapped in asynchronously as soon as it loads; if it is
// missing or fails (404, file:// restrictions), the placeholder stays and
// the game is unaffected.

var SPRITE_FILES = {
  coffeeMan: 'coffee-man.png',
  teaGirl: 'tea-girl.png',
  pete: 'uncle-pete.png',
  tuado: 'tuado.png',
  minion: 'minion.png',
  bat: 'bat.png',
  pipe: 'pipe.png',
  staff: 'staff-yellow.png',
  crate: 'crate-stash.png',
  bench: 'gym-bench.png',
  lava: 'lava-blob.png',
  splash: 'lava-splash.png'
};

// Pure helper (unit-testable): contain-fit a source rect into a dest rect.
function fitRect(srcW, srcH, dstW, dstH) {
  var scale = Math.min(dstW / srcW, dstH / srcH);
  var w = srcW * scale, h = srcH * scale;
  return { x: (dstW - w) / 2, y: (dstH - h) / 2, w: w, h: h };
}

// Alpha bounding box of a canvas, or null if fully transparent.
function alphaBounds(canvas) {
  var g = canvas.getContext('2d');
  var data = g.getImageData(0, 0, canvas.width, canvas.height).data;
  var minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
  for (var y = 0; y < canvas.height; y++) {
    for (var x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// Draw a loaded PNG into a sprite canvas: alpha-trim, then contain-fit
// centered, with a light saturation/contrast normalization (feature-detected)
// so off-palette generations still match the game's flat cartoon look.
function applyPNG(spriteKey, img) {
  var target = SPRITES[spriteKey];
  if (!target || !img.naturalWidth) return;
  var g = target.getContext('2d');
  // placeholder drawing leaves a scaled transform on this context — reset it
  if (g.setTransform) g.setTransform(1, 0, 0, 1, 0, 0);

  var sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  try {
    var tmp = document.createElement('canvas');
    tmp.width = sw; tmp.height = sh;
    tmp.getContext('2d').drawImage(img, 0, 0);
    var box = alphaBounds(tmp);
    if (box && box.w > 4 && box.h > 4) { sx = box.x; sy = box.y; sw = box.w; sh = box.h; }
  } catch (e) {
    // canvas tainted (e.g. some file:// setups) — skip the trim, draw as-is
  }

  var fit = fitRect(sw, sh, target.width, target.height);
  g.clearRect(0, 0, target.width, target.height);
  try {
    g.filter = 'saturate(1.05) contrast(1.05)';
    if (typeof g.filter !== 'string' || g.filter.indexOf('saturate') < 0) g.filter = 'none';
  } catch (e) { /* ctx.filter unsupported — draw without normalization */ }
  g.drawImage(img, sx, sy, sw, sh, fit.x, fit.y, fit.w, fit.h);
  try { g.filter = 'none'; } catch (e) { /* ignore */ }
  SPRITES_VER[spriteKey] = (SPRITES_VER[spriteKey] || 0) + 1;
}

function loadSpritePNGs() {
  if (typeof Image === 'undefined' || typeof document === 'undefined') return;
  Object.keys(SPRITE_FILES).forEach(function (key) {
    var img = new Image();
    img.onload = function () { applyPNG(key, img); };
    img.onerror = function () { /* keep the procedural placeholder */ };
    img.src = 'assets/' + SPRITE_FILES[key];
  });
}
