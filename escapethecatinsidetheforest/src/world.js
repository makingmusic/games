// World generation: tiles, biomes, trees, bushes, temples, camp. Deterministic from seed.
var G = globalThis.G || (globalThis.G = {});

(function () {
  const C = () => G.CONFIG, U = G.U;

  function biomeAt(tx, ty) {
    const c = C();
    if (U.dist(tx, ty, c.GROVE.x, c.GROVE.y) < c.GROVE.r) return 'grove';
    if (ty < c.SNOW_Y) return 'snow';
    if (ty > c.LAVA_Y) return 'lava';
    if (tx > c.JUNGLE_X) return 'jungle';
    return 'forest';
  }
  G.biomeAt = biomeAt;

  // A solid circle blocker (tree). Stored in a coarse spatial grid for speed.
  function addSolid(st, x, y, r, kind, extra) {
    const o = Object.assign({ x, y, r, kind }, extra || {});
    st.solids.push(o);
    const cell = C().TILE * 4;
    const key = Math.floor(x / cell) + ',' + Math.floor(y / cell);
    (st.solidGrid[key] = st.solidGrid[key] || []).push(o);
    return o;
  }
  G.removeSolid = function (st, s) {
    const i = st.solids.indexOf(s);
    if (i >= 0) st.solids.splice(i, 1);
    const cell = C().TILE * 4;
    const key = Math.floor(s.x / cell) + ',' + Math.floor(s.y / cell);
    const g = st.solidGrid[key];
    if (g) { const j = g.indexOf(s); if (j >= 0) g.splice(j, 1); }
  };
  G.nearbySolids = function (st, x, y) {
    const cell = C().TILE * 4, out = [];
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const g = st.solidGrid[(cx + i) + ',' + (cy + j)];
      if (g) out.push(...g);
    }
    return out;
  };

  function clearOfCamp(x, y) {
    const c = C().CAMP, T = C().TILE;
    return U.dist(x, y, c.x * T, c.y * T) > 7 * T; // keep camp open
  }

  G.generateWorld = function (seed) {
    const c = C(), T = c.TILE;
    const st = {
      seed,
      // time
      day: 1, phase: 'day', t: 0, night: 0, // night = number of the night currently/last in
      // terrain
      tiles: null, deco: [],
      solids: [], solidGrid: {},
      trees: [], bushes: [], scrapPiles: [], temples: [], cages: [],
      // actors
      player: null, cat: null, kids: [], animals: [], cultists: [], drops: [],
      fx: [], splats: [],
      fire: { x: c.CAMP.x * T, y: c.CAMP.y * T, level: 3 },
      signpost: { x: (c.CAMP.x + 2) * T, y: c.CAMP.y * T },
      traders: {
        feather: { x: (c.CAMP.x - 3) * T, y: (c.CAMP.y - 2) * T },
        pelt: { x: (c.CAMP.x + 3) * T, y: (c.CAMP.y - 2) * T },
      },
      // events
      cultistTonight: false, lastCultNight: -99,
      gathering: { poured: false, active: false, night: 0, fountain: 0, done: false, timer: 0, waveT: 0 },
      calm: 1, // becomes CALM_FACTOR after the Gathering reward
      backpack: null,
      // stats
      stats: { catsShooed: 0, animalsBonked: 0, diamonds: 0, maxFire: 3, bonks: 0 },
      mode: 'story',
      over: false, won: false,
      groveDiamonds: [],
      defeatCount: 0,
    };

    const r = U.rng(seed);

    // --- tiles (flat array of biome ids; also tile shade variation) ---
    st.tiles = new Array(c.MAP_W * c.MAP_H);
    st.tileShade = new Float32Array(c.MAP_W * c.MAP_H);
    for (let y = 0; y < c.MAP_H; y++) for (let x = 0; x < c.MAP_W; x++) {
      const i = y * c.MAP_W + x;
      st.tiles[i] = biomeAt(x, y);
      st.tileShade[i] = r();
    }
    // dirt patch at camp
    for (let y = c.CAMP.y - 4; y <= c.CAMP.y + 4; y++) for (let x = c.CAMP.x - 4; x <= c.CAMP.x + 4; x++) {
      if (U.dist(x, y, c.CAMP.x, c.CAMP.y) < 4.5) st.tiles[y * c.MAP_W + x] = 'camp';
    }

    // --- trees ---
    const densityRun = [['forest', c.TREE_DENSITY.forest], ['jungle', c.TREE_DENSITY.jungle], ['snow', c.TREE_DENSITY.snow]];
    for (const [b, dens] of densityRun) {
      for (let y = 2; y < c.MAP_H - 2; y++) for (let x = 2; x < c.MAP_W - 2; x++) {
        if (st.tiles[y * c.MAP_W + x] !== b) continue;
        if (!clearOfCamp(x, y)) continue;
        if (r() < dens) {
          const kind = b === 'snow' ? 'pine' : b === 'jungle' ? 'jungle' : 'oak';
          const px = (x + 0.5) * T + U.rand(r, -6, 6), py = (y + 0.5) * T + U.rand(r, -6, 6);
          const tree = addSolid(st, px, py, 12, 'tree', { hp: -1, tkind: kind, idx: st.trees.length });
          st.trees.push(tree);
        }
      }
    }

    // --- grape bushes (leprompt §4: mostly Forest + Jungle, plus near traders and kid cages) ---
    let placed = 0, guard = 0;
    const isFree = (px, py) => !G.nearbySolids(st, px, py).some(s => U.dist(px, py, s.x, s.y) < 40);
    while (placed < c.BUSH_COUNT && guard++ < 8000) {
      const x = U.randi(r, 3, c.MAP_W - 4), y = U.randi(r, 3, c.MAP_H - 4);
      const b = st.tiles[y * c.MAP_W + x];
      if (b !== 'forest' && b !== 'jungle' && b !== 'snow') continue;
      const px = (x + 0.5) * T, py = (y + 0.5) * T;
      if (!isFree(px, py)) continue;
      st.bushes.push({ x: px, y: py, ripe: true, regrow: 0, id: placed });
      placed++;
    }
    // guaranteed friendly bushes: near each trader and each kid cage (food is never far)
    const friendly = [st.traders.feather, st.traders.pelt, ...c.KIDS.map(k => ({ x: k.x * T, y: k.y * T }))];
    for (const f of friendly) {
      for (let n = 0; n < 2; n++) {
        const a = r() * Math.PI * 2, d = U.rand(r, 2.2, 3.6) * T;
        const px = f.x + Math.cos(a) * d, py = f.y + Math.sin(a) * d;
        st.bushes.push({ x: px, y: py, ripe: true, regrow: 0, id: placed++ });
      }
    }
    // a ring of bushes around camp so there is always a snack nearby (§4 "food is never far")
    for (let n = 0; n < c.BUSH_CAMP_RING; n++) {
      const a = (n / c.BUSH_CAMP_RING) * Math.PI * 2 + r() * 0.5, d = U.rand(r, 8, 14) * T;
      const px = c.CAMP.x * T + Math.cos(a) * d, py = c.CAMP.y * T + Math.sin(a) * d;
      st.bushes.push({ x: px, y: py, ripe: true, regrow: 0, id: placed++ });
    }

    // --- old campfire next to each kid cage (warmth + light at guard spots) ---
    st.kidFires = c.KIDS.map(k => ({ x: (k.x + 2) * T, y: (k.y + 1) * T, level: 3 }));

    // --- scrap piles (lava biome) ---
    for (let n = 0; n < 26; n++) {
      const x = U.randi(r, 4, c.MAP_W - 5), y = U.randi(r, c.LAVA_Y + 4, c.MAP_H - 5);
      st.scrapPiles.push({ x: (x + 0.5) * T, y: (y + 0.5) * T, taken: false, regrow: 0, id: n });
    }

    // --- jungle temples: 4 small + the Biggest Temple (§15) ---
    const templeSpots = [[158, 60], [178, 78], [162, 122], [186, 140]];
    for (const [x, y] of templeSpots) {
      const t = { x: (x + 0.5) * T, y: (y + 0.5) * T, big: false, looted: false, regrow: 0 };
      st.temples.push(t);
      addSolid(st, t.x, t.y, 30, 'temple', { t });
    }
    const big = { x: (172 + 0.5) * T, y: (100 + 0.5) * T, big: true, looted: false, regrow: 0 };
    st.temples.push(big);
    addSolid(st, big.x, big.y, 44, 'temple', { t: big });

    // --- kid cages (solid) ---
    for (const k of c.KIDS) {
      const cage = { x: k.x * T, y: k.y * T, kid: k.id, taps: 0 };
      st.cages.push(cage);
      addSolid(st, cage.x, cage.y, 20, 'cage', { cage });
      st.kids.push({
        id: k.id, name: k.name, x: k.x * T, y: k.y * T,
        rescued: false, helpT: 0, followIdx: 0, bob: r() * 6,
      });
    }

    // --- signpost board + fire + traders are decoration; fire is warm/solid-ish ---
    addSolid(st, st.fire.x, st.fire.y, 8, 'fire');

    // --- decorative lava rocks in lava biome (non-solid, glow at night) ---
    for (let n = 0; n < 90; n++) {
      const x = U.randi(r, 4, c.MAP_W - 5), y = U.randi(r, c.LAVA_Y + 3, c.MAP_H - 4);
      st.deco.push({ x: (x + 0.5) * T, y: (y + 0.5) * T, kind: 'lavarock', s: U.rand(r, 0.7, 1.4) });
    }
    // a few flowers in the forest for cheer
    for (let n = 0; n < 160; n++) {
      const x = U.randi(r, 4, c.MAP_W - 5), y = U.randi(r, 40, c.LAVA_Y - 4);
      if (st.tiles[y * c.MAP_W + x] === 'forest') st.deco.push({ x: (x + 0.5) * T, y: (y + 0.5) * T, kind: 'flower', s: 1 });
    }

    // --- the Cat starts guarding nothing, prowling the forest ---
    st.cat = {
      x: (c.CAMP.x + 20) * T, y: (c.CAMP.y + 6) * T,
      state: 'prowl', // prowl | stalk | asleep | guard | shooed
      beamT: 0, shooT: 0, swatT: 0, wakeT: 0, dir: 0,
      guardKid: null, wanderT: 0, wx: 0, wy: 0, walk: 0,
    };

    // --- player ---
    st.player = {
      x: (c.CAMP.x - 1) * T, y: (c.CAMP.y + 2) * T, vx: 0, vy: 0, facing: 0,
      hearts: c.PLAYER_HEARTS, hunger: c.HUNGER_MAX,
      weapon: 'hands', hasFlashlight: false, flashOn: false, flashCharge: 0,
      coat: false, lanterns: 0, torchT: 0, swingT: 0, cd: 0, hurtT: 0,
      cold: 0, coldWarned: false, speedT: 0, cookT: 0,
      inv: { wood: 4, scrap: 0, fur: 0, pelt: 0, diamond: 0, fuel: 0, battery: 0, torch: 0, morsel: 1, steak: 0, csteak: 0, bfoot: 0, grape: 0, brew: 0 },
    };

    return st;
  };

  G.tileAt = function (st, tx, ty) {
    const c = C();
    if (tx < 0 || ty < 0 || tx >= c.MAP_W || ty >= c.MAP_H) return 'edge';
    return st.tiles[ty * c.MAP_W + tx];
  };
})();
