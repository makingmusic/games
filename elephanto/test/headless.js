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

console.log(failures === 0 ? '\nALL HEADLESS RENDER TESTS PASSED' : '\n' + failures + ' FAILURES');
process.exit(failures ? 1 : 0);
