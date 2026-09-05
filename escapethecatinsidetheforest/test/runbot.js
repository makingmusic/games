// Headless bot run (leprompt §20): 3 Story-Mode games through Night 85.
// Usage: node test/runbot.js [nRuns] [seedBase]
const fs = require('fs'), path = require('path'), vm = require('vm');

for (const f of ['util.js', 'config.js', 'world.js', 'entities.js', 'systems.js', 'bot.js']) {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'), { filename: f });
}
const G = globalThis.G;

const nRuns = parseInt(process.argv[2] || '3', 10);
const seedBase = parseInt(process.argv[3] || '12345', 10);
const DT = 1 / 30;

function runGame(seed) {
  const st = G.newGame('story', seed);
  G.botInit(st, { console: false });
  let steps = 0, maxSteps = Math.ceil((240 * 96 + 600) / DT); // headroom past Night 85 for a defeat-retry
  while (!st.over && steps < maxSteps) {
    const input = G.botTick(st, DT);
    G.step(st, DT, input);
    steps++;
  }
  return st;
}

let wins = 0;
console.log(`=== Balance proof: ${nRuns} Story-Mode bot runs (survive 85 nights) ===\n`);
for (let i = 0; i < nRuns; i++) {
  const seed = seedBase + i * 7919;
  const t0 = Date.now();
  const st = runGame(seed);
  const ms = Date.now() - t0;
  const kids = st.kids.filter(k => k.rescued).length;
  const win = st.won === true;
  if (win) wins++;
  console.log(`--- RUN ${i + 1} (seed ${seed}) — ${win ? 'WIN' : 'LOSS'} in ${ms}ms ---`);
  console.log(`  day reached: ${st.day}, phase: ${st.phase}, defeats: ${st.defeatCount}, kids: ${kids}/4`);
  console.log(`  hearts: ${st.player.hearts.toFixed(1)}, hunger: ${st.player.hunger.toFixed(0)}, weapon: ${st.player.weapon}, coat: ${st.player.coat}`);
  console.log(`  stats: ${JSON.stringify(st.stats)}`);
  if (!win) {
    console.log(`  last 12 log lines:`);
    for (const l of st.bot.log.slice(-12)) console.log('    ' + l);
  }
  console.log(`  log (every 10 nights):`);
  for (const l of st.bot.log.filter(l => /Night \d+\/85/.test(l))) console.log('    ' + l);
  console.log('');
}
console.log(`=== RESULT: ${wins}/${nRuns} bots survived past Night 85 ===`);
process.exit(wins === nRuns ? 0 : 1);
