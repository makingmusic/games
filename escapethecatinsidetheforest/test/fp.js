// Headless test for the first-person conversion: FP movement input, raycasting,
// and projection. Rendering itself is browser-only and verified manually.
const fs = require('fs'), path = require('path'), vm = require('vm');
for (const f of ['util.js', 'config.js', 'world.js', 'entities.js', 'systems.js', 'bot.js', 'fp.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'), { filename: f });
}
const G = globalThis.G, C = G.CONFIG, U = G.U;
let fails = 0;
function check(name, cond) {
  if (cond) console.log('  ok - ' + name);
  else { fails++; console.log('  FAIL - ' + name); }
}

console.log('fp: first-person movement');
const st = G.newGame('story', 42);
const p = st.player;
p.facing = 0; // looking east (+x)
const x0 = p.x, y0 = p.y;
for (let i = 0; i < 30; i++) G.step(st, 1 / 30, { fwd: 1, turn: 0 });
check('walks forward along facing', p.x > x0 + 50 && Math.abs(p.y - y0) < 1);
for (let i = 0; i < 30; i++) G.step(st, 1 / 30, { fwd: 0, turn: 1 });
check('turn input rotates facing without moving', Math.abs(p.y - y0) < 1 && p.facing > 2 && p.facing < 4.5);
const f0 = p.facing;
const wx = p.x, wy = p.y;
for (let i = 0; i < 30; i++) G.step(st, 1 / 30, { fwd: 1, turn: 0 });
const dxw = p.x - wx, dyw = p.y - wy, dw = Math.hypot(dxw, dyw);
check('walks along the new facing', dw > 50 && Math.abs(dxw / dw - Math.cos(f0)) < 0.05 && Math.abs(dyw / dw - Math.sin(f0)) < 0.05);
check('facing not overwritten by movement', Math.abs(U.angDiff(f0, p.facing)) < 0.01);
// backwards
const bx = p.x;
p.facing = 0;
for (let i = 0; i < 30; i++) G.step(st, 1 / 30, { fwd: -1, turn: 0 });
check('can walk backwards', p.x < bx - 30);
// legacy mx/my still works (bot + old tests rely on it)
const lx = p.x, ly = p.y;
p.facing = 1.23;
G.step(st, 1 / 30, { mx: 1, my: 0 });
check('legacy mx/my movement intact', p.x > lx && Math.abs(p.facing - 0) < 0.01);

console.log('fp: raycast');
const st2 = G.newGame('story', 7);
const tree = st2.trees[0];
// stand 3 tiles west of a tree, look straight at it
const px = tree.x - 3 * C.TILE, py = tree.y;
const hit = G.fpCast(st2, px, py, 0, C.FP_VIEW_DIST);
check('ray hits the tree', hit.solid === tree);
check('hit distance is sane', Math.abs(hit.dist - (3 * C.TILE - tree.r - 6)) < 2);
// looking away hits nothing within view dist (or the far map edge)
const away = G.fpCast(st2, px, py, Math.PI, 4 * C.TILE);
check('no hit looking away at short range', !away.solid);
// map edge is a wall
const edge = G.fpCast(st2, px, py, Math.PI, C.FP_VIEW_DIST * 3);
check('map edge stops the ray', edge.edge === true && edge.dist < px);
// ray-circle helper
check('rayCircle basic', G.fpRayCircle(0, 0, 1, 0, 10, 0, 2) === 8);
check('rayCircle miss', G.fpRayCircle(0, 0, 1, 0, 10, 5, 2) === Infinity);
check('rayCircle behind', G.fpRayCircle(0, 0, 1, 0, -10, 0, 2) === Infinity);

console.log('fp: projection');
const vw = 800, focal = (vw / 2) / Math.tan(C.FP_FOV / 2);
const pr = G.fpProject(px, py, 0, tree.x, tree.y, vw, focal, C.FP_VIEW_DIST);
check('point straight ahead projects to center', pr && Math.abs(pr.sx - vw / 2) < 1);
const behind = G.fpProject(px, py, Math.PI, tree.x, tree.y, vw, focal, C.FP_VIEW_DIST);
check('point behind has no valid screen spot or is offscreen', !behind || behind.sx < -vw || behind.sx > 2 * vw);
const left = G.fpProject(px, py, 0, px + 96, py - 96, vw, focal, C.FP_VIEW_DIST);
check('point to the left projects left of center', left && left.sx < vw / 2);
const right = G.fpProject(px, py, 0, px + 96, py + 96, vw, focal, C.FP_VIEW_DIST);
check('point to the right projects right of center', right && right.sx > vw / 2);

console.log('fp: gameplay still works through the step loop');
const st3 = G.newGame('story', 99);
G.botInit(st3, { console: false });
let steps = 0;
while (st3.day < 2 && steps < 30000) { const inp = G.botTick(st3, 1 / 30); G.step(st3, 1 / 30, inp); steps++; }
check('bot survives to day 2', st3.day === 2 && st3.player.hearts > 0);

console.log(fails === 0 ? 'FP PASS' : `FP FAIL (${fails})`);
process.exit(fails === 0 ? 0 : 1);
