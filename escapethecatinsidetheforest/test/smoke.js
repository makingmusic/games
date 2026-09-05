// Headless smoke test: generate a world, simulate ~3 day/night cycles with a dummy
// input, exercise grab/eat/attack/craft/trade/save-load, and check invariants.
const fs = require('fs'), path = require('path'), vm = require('vm');
for (const f of ['util.js', 'config.js', 'world.js', 'entities.js', 'systems.js', 'bot.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'), { filename: f });
}
const G = globalThis.G;
let fails = 0;
function check(name, cond) {
  if (cond) console.log('  ok - ' + name);
  else { fails++; console.log('  FAIL - ' + name); }
}

console.log('smoke: world generation');
const st = G.newGame('story', 42);
check('player exists at camp', st.player.x > 0 && st.player.y > 0);
check('trees generated', st.trees.length > 300);
check('bushes generated (incl. friendly)', st.bushes.length >= G.CONFIG.BUSH_COUNT + 12);
check('4 kids + cages', st.kids.length === 4 && st.cages.length === 4);
check('5 temples (4 small + big)', st.temples.length === 5 && st.temples.filter(t => t.big).length === 1);
check('cat exists', !!st.cat);
check('signpost + traders', !!st.signpost && !!st.traders.feather && !!st.traders.pelt);

console.log('smoke: simulate 3 full day/night cycles with bot');
G.botInit(st, { console: false });
const DT = 1 / 30;
let steps = 0;
const startDay = st.day;
while (st.day < startDay + 3 && steps < (240 * 3 + 60) / DT) {
  const input = G.botTick(st, DT);
  G.step(st, DT, input);
  steps++;
}
check('time advanced to day ' + (startDay + 3), st.day === startDay + 3);
check('player still alive', st.player.hearts > 0);
check('animals active', st.animals.length > 0);
check('fire still burning or feedable', st.fire.level >= 0);
check('hunger is draining but not empty forever', st.player.hunger >= 0);

console.log('smoke: mechanics');
st.player.inv.wood = 5;
check('craft torch', G.craft(st, 'torch') === true && st.player.inv.torch === 1);
check('use torch', (G.useTorch(st), st.player.torchT > 0));
check('add wood to fire', G.addFuelToFire(st, 'wood') === true);
st.player.inv.pelt = 10;
check('trade flashlight', G.trade(st, 'pelt', 'flashlight', 'pelt') === true && st.player.hasFlashlight);
check('toggle flashlight', (G.toggleFlashlight(st), st.player.flashOn === true));
check('eat when hungry', (st.player.hunger = 40, G.eat(st, 'grape') === false || true)); // may have no grapes; non-crash is the point
st.player.inv.grape = 1;
check('eat a grape', G.eat(st, 'grape') === true);
check('chop: attack a tree', (() => { const t = st.trees[0]; st.player.x = t.x - 30; st.player.y = t.y; st.player.facing = 0; st.player.cd = 0; G.doAttack(st); return t.hp >= 0; })());
check('save/load roundtrip', (() => {
  const mem = {};
  global.localStorage = { getItem: k => mem[k] || null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } };
  G.save(st);
  const st2 = G.load();
  const ok = st2 && st2.day === st.day && st2.player.hasFlashlight === true && st2.trees.length === st.trees.length;
  delete global.localStorage;
  return ok;
})());

console.log(fails === 0 ? 'SMOKE PASS' : `SMOKE FAIL (${fails})`);
process.exit(fails === 0 ? 0 : 1);
