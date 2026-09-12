// Elephanto — headless render-simulation tests (run: node test/headless.js).
// Loads the DOM-free game modules, fakes just enough canvas to run the real
// raycaster render pass, and asserts what would actually appear on screen.
// Written to catch the "boss not visible from the arena door" regression:
// spawn geometry, sprite-key resolution, frustum/z-buffer visibility.

const fs = require('fs');
const SRC = __dirname + '/../src/';

let failures = 0;
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name);
  if (!cond) failures++;
}

// ---------- fake DOM ----------
function fakeGradient() { return { addColorStop: function () {} }; }
function fakeDrawCtx() {
  const t = { createRadialGradient: fakeGradient, createLinearGradient: fakeGradient };
  return new Proxy(t, { get: (o, p) => (p in o ? o[p] : function () {}), set: () => true });
}
global.document = {
  createElement: function () {
    return { width: 0, height: 0, getContext: fakeDrawCtx };
  }
};

(0, eval)(['config.js', 'map.js', 'sprites.js', 'entities.js', 'input.js', 'game.js', 'raycaster.js']
  .map(f => fs.readFileSync(SRC + f, 'utf8')).join('\n'));

// Identifiable stand-in canvases per sprite key (initSprites is browser-only).
const SPRITE_KEYS = ['coffeeMan', 'teaGirl', 'pete', 'tuado', 'minion', 'bat', 'pipe',
  'staff', 'crate', 'bench', 'lava', 'splash', 'signArena', 'signGym', 'signStash', 'mote'];
SPRITE_KEYS.forEach(k => { SPRITES[k] = { key: k, width: 512, height: 512, getContext: fakeDrawCtx }; });

const W = 800, H = 500;
function recordingCtx(drawn) {
  return {
    createLinearGradient: fakeGradient, createRadialGradient: fakeGradient,
    fillRect() {}, fillText() {}, strokeText() {}, ellipse() {}, beginPath() {},
    arc() {}, fill() {}, stroke() {}, save() {}, restore() {}, translate() {},
    rotate() {}, scale() {}, clearRect() {}, strokeRect() {},
    drawImage(img) { drawn[img.key] = (drawn[img.key] || 0) + 1; },
    set fillStyle(v) {}, set strokeStyle(v) {}, set font(v) {}, set textAlign(v) {},
    set lineWidth(v) {}, set globalAlpha(v) {}, get globalAlpha() { return 1; },
    set imageSmoothingEnabled(v) {}, set filter(v) {}, get filter() { return 'none'; }
  };
}

function renderFrom(x, y, dir) {
  World.player.x = x; World.player.y = y; World.player.dir = dir;
  const drawn = {};
  Raycaster.render(recordingCtx(drawn), W, H);
  return drawn;
}

// ---------- spawn geometry ----------
Game.newGame('kid');
Game.state = 'playing';
check('Coffee Man spawns on a walkable arena cell',
  !isWallXY(World.coffee.x, World.coffee.y) && isArenaXY(World.coffee.x, World.coffee.y));
check('Tea Girl spawns on a walkable arena cell',
  !isWallXY(World.tea.x, World.tea.y) && isArenaXY(World.tea.x, World.tea.y));
check('arena door is two cells wide and walkable',
  !isWallXY(11.5, 8.5) && !isWallXY(12.5, 8.5));

// ---------- sprite key resolution for every entity ----------
const entitySprites = [World.coffee.sprite, World.tea.sprite, World.pete.sprite,
  World.tuado.sprite].concat(World.minions.map(m => m.sprite));
check('every entity sprite key resolves to a defined sprite',
  entitySprites.every(k => SPRITES[k] !== undefined));
check('every pickup weapon key resolves', World.pickups.every(pk => SPRITES[pk.weapon] !== undefined));

// ---------- THE regression test: both bosses visible from the arena door ----------
let d = renderFrom(ARENA_DOOR.x, 9.4, -Math.PI / 2); // doorway approach, facing arena center
check('Coffee Man renders from the arena door', (d.coffeeMan || 0) > 0);
check('Tea Girl renders from the arena door', (d.teaGirl || 0) > 0);

// ... and from just inside the door
d = renderFrom(12.0, 8.2, -Math.PI / 2);
check('Coffee Man renders from just inside the arena', (d.coffeeMan || 0) > 0);
check('Tea Girl renders from just inside the arena', (d.teaGirl || 0) > 0);

// ... and facing each boss directly inside the arena
d = renderFrom(10.5, 7.5, -Math.PI / 2); // face Coffee Man head-on
check('Coffee Man renders when faced head-on', (d.coffeeMan || 0) > 0);
d = renderFrom(13.5, 7.5, -Math.PI / 2); // face Tea Girl head-on
check('Tea Girl renders when faced head-on', (d.teaGirl || 0) > 0);

// ---------- bosses stay findable during a fight (soak) ----------
Game.newGame('kid');
Game.state = 'playing';
World.player.x = 12.0; World.player.y = 6.5; World.player.dir = -Math.PI / 2;
let finite = true, inArena = true;
for (let t = 0; t < 600; t++) { // 30 simulated seconds of boss chase/attack AI
  Game.update(0.05);
  [World.coffee, World.tea].forEach(b => {
    if (!isFinite(b.x) || !isFinite(b.y)) finite = false;
    if (b.lives > 0 && !isArenaXY(b.x, b.y)) inArena = false;
  });
}
check('boss positions stay finite over 30s of combat', finite);
check('bosses never leave the arena', inArena);

// ---------- bossAngle (in-arena guide arrow target) ----------
Game.newGame('kid');
World.player.x = 12.0; World.player.y = 7.5; World.player.dir = -Math.PI / 2;
const ba = bossAngle();
check('bossAngle returns a finite bearing with bosses alive', typeof ba === 'number' && isFinite(ba));
check('bosses ahead => |bearing| small', Math.abs(ba) < Math.PI / 2);
World.coffee.lives = 0; World.tea.lives = 0;
check('bossAngle null when both bosses defeated', bossAngle() === null);

// ---------- crosshair target preview ----------
Game.newGame('kid');
World.player.x = 12.0; World.player.y = 6.5; World.player.dir = -Math.PI / 2;
World.coffee.x = 12.0; World.coffee.y = 5.2; // in range, ahead, both in arena
World.minions[0].x = 9.5; World.minions[0].y = 3.5; // move arena guard out of the way
check('crosshair finds target in range in arena',
  findMeleeTarget(World.player, WEAPONS.fists, liveBadGuys()) === World.coffee);
World.player.x = 14.5; World.player.y = 14.5; // outside arena
check('crosshair finds no target outside arena',
  findMeleeTarget(World.player, WEAPONS.fists, liveBadGuys()) === null);
World.player.x = 12.0; World.player.y = 6.5; // back in arena
World.coffee.y = 4.0; // out of fists range (2.5 tiles)
World.minions[0].hp = 0; // and no minion in range
check('crosshair finds no target out of range',
  findMeleeTarget(World.player, WEAPONS.fists, liveBadGuys()) === null);

// ---------- PNG swap transform regression (the invisible-bodies bug) ----------
// makeSprite scales the context 512/96 for the procedural art. applyPNG draws
// in device pixels — if that transform is still active, the PNG lands ~5.3x
// magnified, ~94% off-canvas, and the sprite goes blank. Track the effective
// (transform-applied) destination rect through the REAL makeSprite+applyPNG.
(function () {
  var m = [1, 0, 0, 1, 0, 0]; // tracked 2D transform
  var drawCalls = [];
  var ctxTarget = {
    scale: function (a, b) { m = [m[0] * a, m[1] * b, m[2] * a, m[3] * b, m[4], m[5]]; },
    setTransform: function (a, b, c, d, e, f) { m = [a, b, c, d, e, f]; },
    createRadialGradient: fakeGradient, createLinearGradient: fakeGradient,
    getImageData: function () { throw new Error('tainted'); }, // force skip-trim path
    drawImage: function () {
      if (arguments.length === 9) {
        var a = arguments;
        drawCalls.push({ ex: a[5] * m[0], ey: a[6] * m[3], ew: a[7] * m[0], eh: a[8] * m[3] });
      }
    }
  };
  var ctxProxy = new Proxy(ctxTarget, {
    get: function (o, p) { return p in o ? o[p] : function () {}; },
    set: function () { return true; }
  });
  var canvas = { key: 'coffeeMan', width: 0, height: 0, getContext: function () { return ctxProxy; } };
  var oldCreate = global.document.createElement;
  global.document.createElement = function () { return canvas; };

  SPRITES.coffeeMan = null;
  var c = makeSprite(drawCoffeeMan); // real placeholder draw, leaves transform
  SPRITES.coffeeMan = c;
  applyPNG('coffeeMan', { naturalWidth: 512, naturalHeight: 512 });

  global.document.createElement = oldCreate;
  check('applyPNG drew the PNG', drawCalls.length === 1);
  if (drawCalls.length === 1) {
    var r = drawCalls[0];
    check('PNG dest rect fits inside the 512px canvas (transform reset)',
      r.ex >= -1 && r.ey >= -1 && r.ex + r.ew <= 513 && r.ey + r.eh <= 513);
  }
})();

// ---------- dest-rect sweep: every sprite type at several distances ----------
// Records real drawImage destination rects from the real render pass and
// asserts every sprite is drawn on-screen with a plausible size.
(function () {
  var W2 = 2000, H2 = 1389; // iPad-like backing store
  var calls = [];
  var ctx = recordingCtx({});
  ctx.drawImage = function (img, sx, sy, sw, sh, dx, dy, dw, dh) {
    calls.push({ key: img.key, dx: dx, dy: dy, dw: dw, dh: dh });
  };

  function single(spriteKey, worldFn, label, minH) {
    var dists = [1.5, 3, 6];
    for (var di = 0; di < dists.length; di++) {
      var dd = dists[di];
      Game.newGame('kid'); Game.state = 'playing';
      World.player.x = 12.0; World.player.y = 14.0; World.player.dir = -Math.PI / 2;
      worldFn(dd);
      calls.length = 0;
      Raycaster.render(ctx, W2, H2);
      var got = calls.filter(function (c) { return c.key === spriteKey; });
      check(label + ' visible at ' + dd + ' tiles (' +
            (got.length ? got[0].dh.toFixed(0) + 'px' : 'NOT DRAWN') + ')',
            got.length > 0 && got.every(function (c) {
              return isFinite(c.dx) && isFinite(c.dy) && isFinite(c.dw) && isFinite(c.dh) &&
                     c.dh > minH && c.dw > 0 &&
                     c.dx > -c.dw && c.dx < W2 && c.dy + c.dh > 0 && c.dy < H2;
            }));
    }
  }

  single('coffeeMan', function (dd) { World.coffee.x = 12.0; World.coffee.y = 14.0 - dd; }, 'Coffee Man', 20);
  single('teaGirl', function (dd) { World.tea.x = 12.0; World.tea.y = 14.0 - dd; }, 'Tea Girl', 20);
  single('pete', function (dd) { World.pete.x = 12.0; World.pete.y = 14.0 - dd; }, 'Uncle Pete', 20);
  single('tuado', function (dd) { World.tuado.x = 12.0; World.tuado.y = 14.0 - dd; }, 'Tuado', 20);
  single('minion', function (dd) { World.minions[0].x = 12.0; World.minions[0].y = 14.0 - dd; }, 'minion', 20);
  single('crate', function (dd) { STASH_POS.x = 12.0; STASH_POS.y = 14.0 - dd; }, 'stash crate', 15);
  single('bench', function (dd) { BENCH_POS.x = 12.0; BENCH_POS.y = 14.0 - dd; }, 'gym bench', 15);
  single('signArena', function (dd) { SIGNS[0].x = 12.0; SIGNS[0].y = 14.0 - dd; }, 'arena sign', 15);
  single('bat', function (dd) { World.pickups[0].x = 12.0; World.pickups[0].y = 14.0 - dd; }, 'bat pickup', 10);
  single('lava', function (dd) { World.lava.push({ x: 12.0, y: 14.0 - dd, z: 0.8, t: 0.45, trail: [] }); }, 'flying lava', 10);
})();

console.log(failures === 0 ? '\nALL HEADLESS RENDER TESTS PASSED' : '\n' + failures + ' FAILURES');
process.exit(failures ? 1 : 0);