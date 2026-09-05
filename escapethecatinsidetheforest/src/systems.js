// Game systems: main step, day/night, fire/hunger, combat, interactions, trading,
// crafting, spawning, events (cultists, The Great Gathering), defeat/win, save/load.
var G = globalThis.G || (globalThis.G = {});

(function () {
  const C = () => G.CONFIG, U = G.U;

  G.newGame = function (mode, seed) {
    seed = seed === undefined ? ((Math.random() * 1e9) | 0) : seed;
    const st = G.generateWorld(seed);
    st.mode = mode;
    return st;
  };

  // ------------------------------------------------------------------ main step
  // input: { mx, my, attack, light, grab, eat } — booleans are "held"; edges detected here.
  G.step = function (st, dt, input) {
    if (st.over || st.paused) return;
    const c = C(), p = st.player;
    st.time = (st.time || 0) + dt;

    G.updatePlayer(st, dt, input);
    edge(st, input, 'light', () => G.toggleFlashlight(st));
    // attack is level-triggered: holding Bonk swings as soon as the cooldown allows
    // (an edge-triggered swing could deadlock when the button is held through the cooldown)
    if (input.attack && st.player.cd <= 0.05) G.doAttack(st);
    edge(st, input, 'grab', () => G.doGrab(st));
    edge(st, input, 'eat', () => G.eatBest(st));

    G.updateCat(st, dt);
    G.updateAnimals(st, dt);
    G.updateCultists(st, dt);
    G.updateKids(st, dt);
    G.updateDrops(st, dt);
    G.updateFireHunger(st, dt);
    G.updateGathering(st, dt);
    G.updateSpawning(st, dt);
    G.updateTime(st, dt);

    for (let i = st.fx.length - 1; i >= 0; i--) { const f = st.fx[i]; f.t += dt; f.y += f.vy * dt; if (f.t > f.life) st.fx.splice(i, 1); }
  };

  function edge(st, input, key, fn) {
    const k = '_prev' + key;
    if (input[key] && !st[k]) fn();
    st[k] = !!input[key];
  }

  // ------------------------------------------------------------------ time / day-night
  G.updateTime = function (st, dt) {
    const c = C();
    st.t += dt;
    const len = st.phase === 'day' ? c.DAY_LEN : c.NIGHT_LEN;
    if (st.t >= len) {
      st.t = 0;
      if (st.phase === 'day') {
        st.phase = 'night';
        st.night = st.day;
        G.onDusk(st);
      } else {
        st.phase = 'day';
        G.onDawn(st);
        st.day++;
      }
    }
  };

  G.onDawn = function (st) {
    const c = C();
    st.stats.maxFire = Math.max(st.stats.maxFire, Math.floor(st.fire.level));
    const n = st.night;
    if (st.gathering.active) G.endGathering(st);
    st.cultists.length = 0;
    // dawn banner (exact copy per leprompt §18.4)
    G.banner && G.banner(`Night ${n} of ${c.TOTAL_NIGHTS} — ${c.TOTAL_NIGHTS - n} to go!`);
    G.sfx && G.sfx('chime');
    // daily respawns: grove diamonds, bush/scrap regrowth, temple brews re-lootable over time
    const r = U.rng(st.seed + st.day * 977);
    const nD = U.randi(r, c.GROVE_DIAMONDS[0], c.GROVE_DIAMONDS[1]);
    for (let i = 0; i < nD; i++) {
      const a = r() * Math.PI * 2, d = U.rand(r, 1, c.GROVE.r - 2) * c.TILE;
      st.groveDiamonds.push({ x: c.GROVE.x * c.TILE + Math.cos(a) * d, y: c.GROVE.y * c.TILE + Math.sin(a) * d });
    }
    for (const b of st.bushes) if (!b.ripe) { b.regrow -= 1; if (b.regrow <= 0) b.ripe = true; }
    for (const s of st.scrapPiles) if (s.taken) { s.regrow -= 1; if (s.regrow <= 0) s.taken = false; }
    for (const t of st.temples) if (t.looted && !t.big) { t.regrow -= 1; if (t.regrow <= 0) t.looted = false; }
    if (st.onDawn) st.onDawn(st);
    if (G.hooks && G.hooks.onDawn) G.hooks.onDawn(st);
    G.save(st);
    if (n >= c.TOTAL_NIGHTS) G.winGame(st);
  };

  G.onDusk = function (st) {
    const c = C();
    // cultist scheduling (§9): night >= 6, 25% chance, never two in a row
    const canCult = st.night >= c.CULT_FIRST_NIGHT && st.night - 1 !== st.lastCultNight;
    if (canCult && U.chance(U.rng(st.seed + st.night * 13), c.CULT_CHANCE)) {
      st.cultistTonight = true; st.lastCultNight = st.night;
      G.spawnCultists(st);
      setTimeoutFreeToast(st, 'You hear tiny footsteps… cultists tonight!');
      G.banner && G.banner('You hear tiny footsteps… cultists tonight!', '#c9a7ff');
    } else st.cultistTonight = false;
    if (st.onDusk) st.onDusk(st);
    if (G.hooks && G.hooks.onDusk) G.hooks.onDusk(st);
  };

  function setTimeoutFreeToast(st, msg) { U.toast(msg); }

  // ------------------------------------------------------------------ fire + hunger + cold (§7, §13, §4)
  G.updateFireHunger = function (st, dt) {
    const c = C(), p = st.player;
    // fire burns down; tutorial kindness nights 1-3 in Story Mode (§13)
    const tutorialFire = st.mode === 'story' && st.night <= c.FIRE_TUTORIAL_MIN && st.night >= 1 && st.phase === 'night';
    if (st.fire.level > 0 && !tutorialFire) st.fire.level = Math.max(0, st.fire.level - dt / c.FIRE_BURN_T);
    st.stats.maxFire = Math.max(st.stats.maxFire, Math.floor(st.fire.level + 0.001));
    if (Math.floor(st.fire.level) === c.FIRE_MAX_LEVEL && !st.cozyShown) {
      st.cozyShown = true;
      U.fx(st, st.fire.x, st.fire.y - 70, 'text', c.COZY_BADGE, '#ffb347');
      U.toast('COZY! Your fire is amazing!');
      G.sfx && G.sfx('cozy');
    }
    if (st.fire.level < 6) st.cozyShown = false;

    // hunger
    p.hunger = Math.max(0, p.hunger - c.HUNGER_DRAIN * dt);
    if (p.hunger <= 0) {
      p.hearts -= c.STARVE_DPS * dt;
      if (p.hearts <= 0) { p.hearts = 0; G.defeat(st, 'too hungry'); }
    }
    // heal near fire
    const dFire = U.dist(p.x, p.y, st.fire.x, st.fire.y);
    const nearFireLvl = Math.floor(st.fire.level);
    if (nearFireLvl >= 2 && dFire < 4.2 * c.TILE) p.hearts = Math.min(c.PLAYER_HEARTS, p.hearts + c.FIRE_HEAL * dt * (0.5 + nearFireLvl * 0.25));

    // auto-cook steaks near a good fire (§16)
    if (nearFireLvl >= c.COOK_FIRE_LEVEL && dFire < 3.5 * c.TILE && p.inv.steak > 0) {
      p.cookT += dt;
      if (p.cookT >= c.COOK_T) { p.cookT = 0; p.inv.steak--; p.inv.csteak++; U.toast('Sizzle! 1 Cooked Steak'); G.sfx && G.sfx('cook'); }
    } else p.cookT = 0;

    // cold in the snow biome (§4): fire >= 3 nearby or Pelt Coat protects
    const biome = G.biomeAt(Math.floor(p.x / c.TILE), Math.floor(p.y / c.TILE));
    let warm = p.coat;
    if (!warm && nearFireLvl >= c.COLD_FIRE_LEVEL && dFire < 4.2 * c.TILE) warm = true;
    if (!warm) for (const kf of st.kidFires) if (U.dist(p.x, p.y, kf.x, kf.y) < 4 * c.TILE) warm = true;
    if (!warm && p.torchT > 0) warm = true;
    if (biome === 'snow' && !warm) {
      p.cold += dt;
      if (p.cold > c.COLD_WARN_T) {
        p.hearts -= c.COLD_DPS * dt;
        if (!p.coldWarned) { p.coldWarned = true; U.toast('Brrr! You are so cold! Get warm!'); }
        if (p.hearts <= 0) { p.hearts = 0; G.defeat(st, 'too cold'); }
      }
    } else { p.cold = 0; p.coldWarned = false; }

    // torch burns
    if (p.torchT > 0) {
      p.torchT -= dt;
      if (p.torchT <= 0 && p.inv.torch > 0) { /* torch item consumed at use time */ }
    }

    // flashlight drain + auto battery + sunny crank recharge (never stays dead forever)
    if (p.flashOn && p.hasFlashlight) {
      p.flashCharge -= c.FLASH_DRAIN * dt;
      if (p.flashCharge <= 0) {
        if (p.inv.battery > 0) { p.inv.battery--; p.flashCharge = c.BATTERY_CHARGE; U.toast('Battery used! Flashlight brighter!'); }
        else { p.flashCharge = 0; p.flashOn = false; U.toast('The flashlight ran out of power! It recharges in the sun.'); }
      }
    } else if (p.hasFlashlight && p.flashCharge < c.FLASH_CHARGE_MAX && st.phase === 'day') {
      p.flashCharge = Math.min(c.FLASH_CHARGE_MAX, p.flashCharge + c.FLASH_DAY_RECHARGE * dt);
    }
  };

  G.addFuelToFire = function (st, kind) {
    const c = C(), p = st.player;
    if (kind === 'wood' && p.inv.wood > 0 && st.fire.level < c.FIRE_MAX_LEVEL) {
      p.inv.wood--; st.fire.level = Math.min(c.FIRE_MAX_LEVEL, st.fire.level + c.FIRE_WOOD_LEVELS);
      U.fx(st, st.fire.x, st.fire.y - 50, 'text', '+ fire!', '#ffb347'); G.sfx && G.sfx('fire'); return true;
    }
    if (kind === 'fuel' && p.inv.fuel > 0 && st.fire.level < c.FIRE_MAX_LEVEL) {
      p.inv.fuel--; st.fire.level = Math.min(c.FIRE_MAX_LEVEL, st.fire.level + c.FIRE_FUEL_LEVELS);
      U.fx(st, st.fire.x, st.fire.y - 50, 'text', '+ BIG fire!', '#ff8c42'); G.sfx && G.sfx('fire'); return true;
    }
    return false;
  };

  // ------------------------------------------------------------------ flashlight toggle
  G.toggleFlashlight = function (st) {
    const p = st.player;
    if (!p.hasFlashlight) { U.toast('You need a flashlight! Trade pelts with the Pelt Trader.'); return; }
    p.flashOn = !p.flashOn;
    if (p.flashOn && p.flashCharge <= 0 && p.inv.battery > 0) { p.inv.battery--; p.flashCharge = C().BATTERY_CHARGE; }
    G.sfx && G.sfx('click');
  };

  // ------------------------------------------------------------------ attack / bonk (§14)
  G.doAttack = function (st) {
    const c = C(), p = st.player;
    if (p.cd > 0.05) return;
    p.cd = c.ATTACK_CD[p.weapon];
    p.swingT = 0.22;
    const range = c.ATTACK_RANGE[p.weapon], dmg = c.ATTACK_DMG[p.weapon];
    const slow = p.weapon === 'ice';
    st.stats.bonks++;
    G.sfx && G.sfx('swing');
    let hit = false;

    // nearest animal in the swing arc
    let best = null, bestD = range;
    for (const a of st.animals) {
      if (a.state === 'scamper' || a.state === 'dizzy') continue;
      const d = U.dist(p.x, p.y, a.x, a.y);
      if (d < bestD && Math.abs(U.angDiff(p.facing, U.angleTo(p.x, p.y, a.x, a.y))) < 1.1) { best = a; bestD = d; }
    }
    if (best) {
      const wasAlive = best.hp > 0;
      G.bonkAnimal(best, dmg, slow);
      U.fx(st, best.x, best.y - 20, 'stars');
      G.sfx && G.sfx('bonk');
      st.stats.animalsBonked++;
      hit = true;
      if (wasAlive && best.hp <= 0) G.rollDrops(st, best.type, best.x, best.y);
      return;
    }
    // cultists: one bonk scatters them (§9)
    for (let i = st.cultists.length - 1; i >= 0; i--) {
      const cu = st.cultists[i];
      if (U.dist(p.x, p.y, cu.x, cu.y) < range + 12 && Math.abs(U.angDiff(p.facing, U.angleTo(p.x, p.y, cu.x, cu.y))) < 1.2) {
        G.scareCultist(st, cu);
        U.fx(st, cu.x, cu.y - 24, 'text', 'POOF!', '#c9a7ff');
        st.cultists.splice(i, 1);
        hit = true;
        return;
      }
    }
    // the Cat: axes do nothing but CLANG! (§8)
    if (U.dist(p.x, p.y, st.cat.x, st.cat.y) < range + 40 && Math.abs(U.angDiff(p.facing, U.angleTo(p.x, p.y, st.cat.x, st.cat.y))) < 1.2) {
      U.fx(st, st.cat.x, st.cat.y - 50, 'text', 'CLANG!', '#ffd76e');
      G.sfx && G.sfx('clang');
      return;
    }
    // trees: chop (faster with better axes)
    if (!hit) {
      let tree = null, td = range + 14;
      for (const s of G.nearbySolids(st, p.x, p.y)) {
        if (s.kind !== 'tree') continue;
        const d = U.dist(p.x, p.y, s.x, s.y);
        if (d < td && Math.abs(U.angDiff(p.facing, U.angleTo(p.x, p.y, s.x, s.y))) < 1.3) { tree = s; td = d; }
      }
      if (tree) {
        if (tree.hp < 0) tree.hp = c.TREE_HP[p.weapon];
        tree.hp--;
        U.fx(st, tree.x, tree.y - 40, 'text', 'chop!', '#d9b38c');
        G.sfx && G.sfx('chop');
        if (tree.hp <= 0) {
          G.removeSolid(st, tree);
          const i = st.trees.indexOf(tree); if (i >= 0) st.trees.splice(i, 1);
          st.chopped = st.chopped || []; st.chopped.push(tree.idx);
          G.spawnDrop(st, tree.x, tree.y, 'wood', c.TREE_WOOD);
          U.fx(st, tree.x, tree.y, 'poof');
        }
      }
    }
  };

  G.rollDrops = function (st, type, x, y) {
    const c = C(), drops = c.DROP_CHANCE[type] || {};
    const r = U.rng(st.seed + st.day * 3 + st.stats.animalsBonked * 17);
    for (const [item, ch] of Object.entries(drops)) {
      const amt = ch >= 1 ? Math.floor(ch) : 0;
      const frac = ch % 1;
      let total = amt + (U.chance(r, frac) ? 1 : 0);
      if (item === 'pelt') { /* lucky pelt (§12): "if you kill a thing and you're lucky" */ }
      if (total > 0) G.spawnDrop(st, x, y, item, total);
    }
  };

  // ------------------------------------------------------------------ grab / interact
  G.doGrab = function (st) {
    const c = C(), p = st.player;
    const near = (x, y, r) => U.dist(p.x, p.y, x, y) < (r || c.GRAB_R);

    // grape bushes (before other camp interactions: food comes first!)
    for (const b of st.bushes) {
      if (b.ripe && near(b.x, b.y, 40)) {
        b.ripe = false; b.regrow = c.BUSH_REGROW;
        const got = Math.min(2, 10 - p.inv.grape); // a bunch = 2 grapes (§16 stack of 10)
        p.inv.grape += got;
        U.fx(st, b.x, b.y - 24, 'text', `+${got} Grapes`, '#d5a6ff'); G.sfx && G.sfx('pickup'); return;
      }
    }
    // dropped backpack (Story Mode defeat)
    if (st.backpack && near(st.backpack.x, st.backpack.y, 44)) {
      for (const [k, v] of Object.entries(st.backpack.items)) p.inv[k] = (p.inv[k] || 0) + v;
      U.toast('You found your dropped backpack!');
      st.backpack = null; G.sfx && G.sfx('pickup'); return;
    }
    // scrap piles
    for (const s of st.scrapPiles) {
      if (!s.taken && near(s.x, s.y, 40)) {
        s.taken = true; s.regrow = c.SCRAP_RESPAWN;
        p.inv.scrap += 2;
        U.fx(st, s.x, s.y - 24, 'text', '+2 Scrap', '#c9d6df'); G.sfx && G.sfx('pickup'); return;
      }
    }
    // grove diamonds
    for (let i = st.groveDiamonds.length - 1; i >= 0; i--) {
      const d = st.groveDiamonds[i];
      if (near(d.x, d.y, 36)) {
        st.groveDiamonds.splice(i, 1);
        p.inv.diamond++; st.stats.diamonds++;
        U.fx(st, d.x, d.y - 20, 'text', '+1 Diamond', '#9be5ff'); G.sfx && G.sfx('gem'); return;
      }
    }
    // temples
    for (const t of st.temples) {
      if (near(t.x, t.y, t.big ? 70 : 54)) {
        if (t.big) { G.bigTemplePrompt(st); return; }
        if (!t.looted) {
          t.looted = true; t.regrow = 10;
          p.inv.brew++;
          U.toast('You found a bottle of Jungle Brew!');
          U.fx(st, t.x, t.y - 40, 'text', 'Jungle Brew!', '#7be0a2'); G.sfx && G.sfx('gem'); return;
        }
      }
    }
    // kid cages (§11): snip 3 times once the Cat is away
    for (const cage of st.cages) {
      const kid = st.kids.find(k => k.id === cage.kid);
      if (kid.rescued || !near(cage.x, cage.y, 52)) continue;
      const catGuarding = st.cat.guardKid === kid.id && st.cat.state !== 'shooed' && U.dist(st.cat.x, st.cat.y, cage.x, cage.y) < 5 * c.TILE;
      if (catGuarding) { U.toast('The Cat is watching! Shine your flashlight to shoo it!'); return; }
      cage.taps++;
      U.fx(st, cage.x, cage.y - 30, 'text', 'snip!', '#ffe9a8');
      G.sfx && G.sfx('snip');
      if (cage.taps >= c.CAGE_TAPS) {
        kid.rescued = true;
        U.toast(`${kid.name} is free! They will help you fight animals!`);
        U.fx(st, cage.x, cage.y - 46, 'text', 'FREEDOM!', '#9be564');
        G.sfx && G.sfx('happy');
        G.banner && G.banner(`${kid.name} is free!`, '#9be564');
      }
      return;
    }
    // signpost board
    if (near(st.signpost.x, st.signpost.y, 46)) { G.openBoard && G.openBoard(); return; }
    // fire menu (only when you actually have something to burn)
    if (near(st.fire.x, st.fire.y, 46)) {
      if (p.inv.wood > 0 || p.inv.fuel > 0) { G.openFireMenu && G.openFireMenu(); return; }
      U.toast('The fire wants wood! Chop some trees!'); return;
    }
    // traders
    if (near(st.traders.feather.x, st.traders.feather.y, 46)) { G.openTrade && G.openTrade('feather'); return; }
    if (near(st.traders.pelt.x, st.traders.pelt.y, 46)) { G.openTrade && G.openTrade('pelt'); return; }
    U.toast('Nothing to grab here.');
  };

  G.bigTemplePrompt = function (st) {
    const c = C();
    if (st.gathering.done) { U.toast('The fountain sparkles happily. The forest is calm.'); return; }
    if (st.gathering.active) { U.toast('The Great Gathering has begun! Guard the fountain!'); return; }
    if (st.player.inv.brew >= c.GATHERING.BREWS_NEEDED) G.confirmGathering && G.confirmGathering();
    else U.toast(`The Biggest Temple wants ${c.GATHERING.BREWS_NEEDED} Jungle Brews (you have ${st.player.inv.brew}). Find the small jungle temples!`);
  };

  // ------------------------------------------------------------------ The Great Gathering (§15) — wave night, NO boss
  G.startGathering = function (st) {
    const c = C(), p = st.player;
    p.inv.brew -= c.GATHERING.BREWS_NEEDED;
    st.gathering.active = true;
    st.gathering.poured = true;
    st.gathering.fountain = c.GATHERING.FOUNTAIN_HP;
    st.gathering.waveT = 2;
    const big = st.temples.find(t => t.big);
    st.gathering.x = big.x; st.gathering.y = big.y;
    // the party starts that night (or right away if already night)
    if (st.phase === 'day') {
      U.toast('You poured the brew! Come back at dusk — the Great Gathering begins tonight!');
      st.gathering.night = st.day;
    } else {
      st.gathering.night = st.night;
    }
    G.banner && G.banner('The Great Gathering is coming!', '#7be0a2');
  };

  G.updateGathering = function (st, dt) {
    const c = C(), p = st.player;
    if (!st.gathering.active || st.gathering.done) return;
    // begins at dusk of the poured night
    if (st.phase === 'day') return;
    if (st.night !== st.gathering.night) return;
    const g = st.gathering, big = st.temples.find(t => t.big);
    // §15: "no Cat" — the Cat never comes to the party
    if (st.cat.state !== 'shooed') { st.cat.state = 'shooed'; st.cat.shooT = c.NIGHT_LEN - st.t + 2; }
    g.waveT -= dt;
    if (g.waveT <= 0) {
      g.waveT = c.GATHERING.WAVE_INTERVAL;
      const r = U.rng(st.seed + st.day * 53 + g.fountain);
      const n = U.randi(r, c.GATHERING.WAVE_SIZE[0], c.GATHERING.WAVE_SIZE[1]);
      const types = ['wolf', 'hog', 'bear', 'bunny'];
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, d = U.rand(r, 12, 16) * c.TILE;
        const t = U.pick(r, types);
        G.spawnAnimal(st, t, big.x + Math.cos(a) * d, big.y + Math.sin(a) * d);
        const an = st.animals[st.animals.length - 1];
        an.state = 'aggro'; an.gatheringGuest = true;
      }
    }
    // guests sip the fountain (gentle objective — hold the steps until dawn)
    for (const a of st.animals) {
      if (!a.gatheringGuest || a.state === 'scamper' || a.state === 'dizzy') continue;
      const d = U.dist(a.x, a.y, big.x, big.y);
      if (d < 2.2 * c.TILE) {
        g.fountain -= c.GATHERING.SIP_DPS * dt;
        a.sipT = (a.sipT || 0) + dt;
      }
    }
    if (g.fountain <= 0) { g.fountain = 0; }
  };

  G.endGathering = function (st) {
    const c = C(), g = st.gathering;
    g.active = false;
    for (let i = st.animals.length - 1; i >= 0; i--) if (st.animals[i].gatheringGuest) { U.fx(st, st.animals[i].x, st.animals[i].y, 'poof'); st.animals.splice(i, 1); }
    if (g.fountain > 0) {
      g.done = true;
      st.calm = c.CALM_FACTOR;
      st.player.inv.diamond += 5; st.stats.diamonds += 5;
      U.toast('The animals drank the sleepy brew and are calm forever! +5 Diamonds!');
      G.banner && G.banner('Forest Friend! All animals are calmer now.', '#7be0a2');
      G.sfx && G.sfx('happy');
    } else {
      U.toast('The animals had a big party and drank it all! Gather 4 more brews to try again.');
      g.poured = false;
    }
  };

  // ------------------------------------------------------------------ spawning (§20 ramp)
  G.updateSpawning = function (st, dt) {
    const c = C(), p = st.player;
    st.spawnT = (st.spawnT || 0) + dt;
    if (st.spawnT < 1.2) return;
    st.spawnT = 0;
    const r = U.rng(st.seed + st.day * 29 + Math.floor(st.time / 4));
    const px = p.x, py = p.y;

    function count(type) { let n = 0; for (const a of st.animals) if (a.type === type) n++; return n; }
    function biomeCounts() {
      const bc = {};
      for (const a of st.animals) {
        const b = G.biomeAt(Math.floor(a.x / c.TILE), Math.floor(a.y / c.TILE));
        bc[b] = bc[b] || {}; bc[b][a.type] = (bc[b][a.type] || 0) + 1;
      }
      return bc;
    }
    function spotFor(biome, minDist) {
      for (let tries = 0; tries < 14; tries++) {
        const a = r() * Math.PI * 2, d = U.rand(r, c.ANIMAL_SPAWN_MIN, c.ANIMAL_SPAWN_MIN + 12 * c.TILE);
        const x = px + Math.cos(a) * d, y = py + Math.sin(a) * d;
        if (x < 3 * c.TILE || y < 3 * c.TILE || x > (c.MAP_W - 3) * c.TILE || y > (c.MAP_H - 3) * c.TILE) continue;
        if (G.biomeAt(Math.floor(x / c.TILE), Math.floor(y / c.TILE)) !== biome) continue;
        if (minDist && U.dist(x, y, c.CAMP.x * c.TILE, c.CAMP.y * c.TILE) < minDist) continue;
        return { x, y };
      }
      return null;
    }

    const bc = biomeCounts();
    const isNight = st.phase === 'night';
    const safeCamp = isNight && st.night <= c.WOLF_CAMP_SAFE_NIGHTS ? c.WOLF_CAMP_SAFE_R : 0;

    const jobs = [];
    // bunnies (day & night, harmless)
    for (const b of ['forest', 'snow']) jobs.push({ type: 'bunny', biome: b, cap: c.ANIMALS.bunny.caps[b] * st.calm, any: true });
    // war hogs: forest day mostly
    jobs.push({ type: 'hog', biome: 'forest', cap: c.ANIMALS.hog.caps.forest * st.calm, any: !isNight ? true : (r() < 0.3) });
    // bears
    jobs.push({ type: 'bear', biome: r() < 0.5 ? 'forest' : 'snow', cap: c.ANIMALS.bear.caps[r() < 0.5 ? 'forest' : 'snow'] * st.calm, any: r() < 0.5 });
    // wolves: night everywhere (cap ramps with night, §20)
    const wolfCap = Math.min(c.WOLF_NIGHT_CAP.base + st.night * c.WOLF_NIGHT_CAP.perNight, c.WOLF_NIGHT_CAP.max) * st.calm;
    if (isNight) for (const b of ['forest', 'snow', 'jungle']) jobs.push({ type: 'wolf', biome: b, cap: wolfCap / 3, any: true });
    // alpha wolves (jungle + grove, after night 12; jungle only at night)
    if (st.night >= c.ALPHA_WOLF_NIGHT) {
      jobs.push({ type: 'alphaWolf', biome: 'jungle', cap: c.ANIMALS.alphaWolf.caps.jungle * st.calm, any: isNight });
      jobs.push({ type: 'alphaWolf', biome: 'grove', cap: c.ANIMALS.alphaWolf.caps.grove * st.calm, any: true });
    }
    // alpha bears (snow + lava, after night 25)
    if (st.night >= c.ALPHA_BEAR_NIGHT) {
      jobs.push({ type: 'alphaBear', biome: r() < 0.5 ? 'snow' : 'lava', cap: 1 * st.calm, any: r() < 0.4 });
    }
    // ember hogs: lava
    jobs.push({ type: 'emberHog', biome: 'lava', cap: c.ANIMALS.emberHog.caps.lava * st.calm, any: !isNight ? true : r() < 0.4 });

    for (const j of jobs) {
      if (!j.any) continue;
      const have = (bc[j.biome] && bc[j.biome][j.type]) || 0;
      if (have >= j.cap) continue;
      const spot = spotFor(j.biome, j.type === 'wolf' ? safeCamp : 0);
      if (spot) { G.spawnAnimal(st, j.type, spot.x, spot.y); bc[j.biome] = bc[j.biome] || {}; bc[j.biome][j.type] = have + 1; }
    }
  };

  // ------------------------------------------------------------------ eating (§16)
  G.eatBest = function (st) {
    const p = st.player, F = C().FOOD;
    const order = p.hunger < 35 ? ['grape', 'morsel', 'bfoot', 'steak', 'csteak'] : ['grape', 'morsel', 'bfoot', 'csteak', 'steak'];
    for (const id of order) {
      if ((p.inv[id] || 0) > 0) { G.eat(st, id); return; }
    }
    U.toast('No food! Pick grapes from bushes or bonk some animals.');
  };

  G.eat = function (st, id) {
    const c = C(), p = st.player, f = c.FOOD[id];
    if (!f || (p.inv[id] || 0) <= 0) return false;
    if (p.hunger > 96 && !f.hearts) { U.toast('You are too full!'); return false; }
    p.inv[id]--;
    p.hunger = Math.min(c.HUNGER_MAX, p.hunger + f.hunger);
    if (f.hearts) p.hearts = Math.min(c.PLAYER_HEARTS, p.hearts + f.hearts);
    if (f.speedT) p.speedT = f.speedT;
    U.fx(st, p.x, p.y - 30, 'text', 'yum!', '#ffd1dc');
    G.sfx && G.sfx('chomp');
    return true;
  };

  // ------------------------------------------------------------------ crafting (§13)
  G.craft = function (st, id) {
    const c = C(), p = st.player;
    const rec = c.RECIPES.find(r => r.id === id);
    if (!rec) return false;
    for (const [k, v] of Object.entries(rec.cost)) if ((p.inv[k] || 0) < v) { U.toast('Not enough materials!'); return false; }
    for (const [k, v] of Object.entries(rec.cost)) p.inv[k] -= v;
    if (rec.out === 'torch') p.inv.torch++;
    if (rec.out === 'fuel') p.inv.fuel++;
    if (rec.out === 'lantern') { if (p.lanterns >= c.LANTERN_MAX) { U.toast('Lanterns maxed out!'); refund(); return false; } p.lanterns++; }
    if (rec.out === 'battery3') p.inv.battery += 3;
    function refund() { for (const [k, v] of Object.entries(rec.cost)) p.inv[k] += v; }
    U.toast(`Crafted: ${rec.name}!`);
    G.sfx && G.sfx('craft');
    return true;
  };

  G.useTorch = function (st) {
    const c = C(), p = st.player;
    if (p.inv.torch <= 0) { U.toast('Craft torches from wood!'); return; }
    if (p.torchT > 0) { U.toast('A torch is already burning!'); return; }
    p.inv.torch--; p.torchT = c.TORCH_T;
    U.toast('Torch lit! Warm and bright.');
    G.sfx && G.sfx('fire');
  };

  // ------------------------------------------------------------------ trading (§12)
  // cur: 'pelt' | 'diamond' at the Pelt Trader; 'fur' | 'diamond' at the Feather Trader
  G.trade = function (st, trader, item, cur) {
    const c = C(), p = st.player, P = c.PRICES;
    function pay(cost) {
      for (const [k, v] of Object.entries(cost)) if ((p.inv[k] || 0) < v) return false;
      for (const [k, v] of Object.entries(cost)) p.inv[k] -= v;
      return true;
    }
    if (trader === 'feather') {
      if (item === 'fuel' && cur !== 'diamond' && pay({ fur: P.fuel.fur })) { p.inv.fuel++; U.toast('Traded Cat Fur for Fuel!'); G.sfx && G.sfx('trade'); return true; }
      if (item === 'fuelD' || (item === 'fuel' && cur === 'diamond')) {
        if (pay({ diamond: P.fuelDiamond.diamond })) { p.inv.fuel++; U.toast('Traded Diamonds for Fuel!'); G.sfx && G.sfx('trade'); return true; }
      }
    } else {
      const price = P[item];
      if (!price) return false;
      cur = cur || 'pelt';
      const cost = {};
      cost[cur] = price[cur];
      const owned = (item === 'flashlight' && p.hasFlashlight) ||
        (item === 'iceAxe' && p.weapon !== 'hands') ||
        (item === 'strongAxe' && p.weapon === 'strong') ||
        (item === 'peltCoat' && p.coat);
      if (owned) { U.toast('You already have that!'); return false; }
      if (pay(cost)) {
        if (item === 'flashlight') { p.hasFlashlight = true; p.flashCharge = c.FLASH_CHARGE_MAX; U.toast('You got a FLASHLIGHT! The Cat hates it!'); }
        if (item === 'iceAxe') { p.weapon = 'ice'; U.toast('You got the ICE AXE! Chops trees super fast!'); }
        if (item === 'strongAxe') { p.weapon = 'strong'; U.toast('You got the STRONG AXE! Bonk!'); }
        if (item === 'peltCoat') { p.coat = true; U.toast('Pelt Coat on! Toasty warm in the snow!'); }
        if (item === 'battery') { p.inv.battery++; U.toast('1 Battery! Flashlight power up!'); }
        G.sfx && G.sfx('happy');
        return true;
      }
    }
    U.toast('Not enough pelts or furs! Bonk more animals!');
    return false;
  };

  // ------------------------------------------------------------------ defeat & win (§7, §6)
  G.defeat = function (st, cause) {
    if (st.over) return;
    const c = C(), p = st.player;
    st.defeatCount++;
    if (st.mode === 'true') {
      st.over = true;
      G.onDefeat && G.onDefeat(st, 'true', cause);
      G.clearSave && G.clearSave();
    } else {
      // Story Mode: wake at camp next morning, drop some loot in a backpack (§7)
      const foods = ['morsel', 'steak', 'csteak', 'bfoot', 'grape'];
      const lost = {};
      for (const f of foods) {
        const n = Math.floor((p.inv[f] || 0) * c.STORY_FOOD_LOSS);
        if (n > 0) { p.inv[f] -= n; lost[f] = n; }
      }
      const dLost = Math.floor((p.inv.diamond || 0) * c.STORY_DIAMOND_LOSS);
      if (dLost > 0) { p.inv.diamond -= dLost; lost.diamond = dLost; st.stats.diamonds = Math.max(0, st.stats.diamonds - dLost); }
      if (Object.keys(lost).length) st.backpack = { x: p.x, y: p.y, items: lost };
      p.hearts = Math.ceil(c.PLAYER_HEARTS / 2);
      p.hunger = Math.max(p.hunger, 55);
      p.x = (c.CAMP.x - 1) * c.TILE; p.y = (c.CAMP.y + 2) * c.TILE;
      p.cold = 0; p.hurtT = 2; p.flashOn = false;
      st.animals.length = 0; st.cultists.length = 0;
      // the Cat got bored and wandered off — no camping on the defeated player (§19)
      st.cat.state = 'shooed'; st.cat.shooT = 45;
      const awayA = U.angleTo(c.CAMP.x * c.TILE, c.CAMP.y * c.TILE, st.cat.x, st.cat.y) || 0.7;
      st.cat.x = U.clamp(c.CAMP.x * c.TILE + Math.cos(awayA) * 30 * c.TILE, 200, (c.MAP_W - 2) * c.TILE);
      st.cat.y = U.clamp(c.CAMP.y * c.TILE + Math.sin(awayA) * 30 * c.TILE, 200, (c.MAP_H - 2) * c.TILE);
      // skip to next morning
      st.phase = 'day'; st.t = 2; st.day = st.night + 1; st.time = 0;
      G.onDefeat && G.onDefeat(st, 'story', cause);
      G.save(st);
    }
  };

  G.winGame = function (st) {
    st.over = true; st.won = true;
    G.onWin && G.onWin(st);
    G.clearSave && G.clearSave();
  };

  // ------------------------------------------------------------------ save / load (§21)
  G.SAVE_KEY = 'etcif_save_v1';

  G.serialize = function (st) {
    const p = st.player;
    const damagedTrees = {};
    for (const t of st.trees) if (t.hp >= 0 && t.hp < 5 && t.hp > 0) damagedTrees[t.idx] = t.hp;
    return {
      v: 1, seed: st.seed, mode: st.mode, day: st.day, phase: st.phase, t: st.t, night: st.night,
      player: {
        x: p.x, y: p.y, hearts: p.hearts, hunger: p.hunger, weapon: p.weapon,
        hasFlashlight: p.hasFlashlight, flashOn: p.flashOn, flashCharge: p.flashCharge,
        coat: p.coat, lanterns: p.lanterns, torchT: p.torchT, inv: p.inv,
      },
      fire: st.fire.level, kids: st.kids.map(k => k.rescued),
      bushes: st.bushes.map(b => ({ ripe: b.ripe, regrow: b.regrow })),
      scrap: st.scrapPiles.map(s => ({ taken: s.taken, regrow: s.regrow })),
      temples: st.temples.map(t => ({ looted: t.looted, regrow: t.regrow })),
      chopped: st.chopped || [], damagedTrees,
      gathering: { poured: st.gathering.poured, done: st.gathering.done, night: st.gathering.night },
      calm: st.calm, stats: st.stats, lastCultNight: st.lastCultNight,
      groveDiamonds: st.groveDiamonds, backpack: st.backpack, defeatCount: st.defeatCount,
      cat: { x: st.cat.x, y: st.cat.y, state: st.cat.state },
    };
  };

  G.save = function (st) {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.setItem(G.SAVE_KEY, JSON.stringify(G.serialize(st))); } catch (e) { /* private mode etc. */ }
  };

  G.clearSave = function () {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.removeItem(G.SAVE_KEY); } catch (e) {}
  };

  G.load = function () {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(G.SAVE_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d || d.v !== 1) return null;
      const st = G.generateWorld(d.seed);
      st.mode = d.mode; st.day = d.day; st.phase = d.phase; st.t = d.t; st.night = d.night;
      Object.assign(st.player, d.player);
      st.fire.level = d.fire;
      d.kids.forEach((r, i) => { if (r) { st.kids[i].rescued = true; const cage = st.cages.find(cg => cg.kid === st.kids[i].id); if (cage) cage.taps = 3; } });
      d.bushes.forEach((b, i) => { if (st.bushes[i]) { st.bushes[i].ripe = b.ripe; st.bushes[i].regrow = b.regrow; } });
      d.scrap.forEach((s, i) => { if (st.scrapPiles[i]) { st.scrapPiles[i].taken = s.taken; st.scrapPiles[i].regrow = s.regrow; } });
      d.temples.forEach((t, i) => { if (st.temples[i]) { st.temples[i].looted = t.looted; st.temples[i].regrow = t.regrow; } });
      // remove chopped trees
      const chopped = new Set(d.chopped || []);
      st.trees = st.trees.filter(t => {
        if (chopped.has(t.idx)) { G.removeSolid(st, t); return false; }
        if (d.damagedTrees[t.idx] !== undefined) t.hp = d.damagedTrees[t.idx];
        return true;
      });
      Object.assign(st.gathering, d.gathering);
      st.calm = d.calm; Object.assign(st.stats, d.stats);
      st.lastCultNight = d.lastCultNight;
      st.groveDiamonds = d.groveDiamonds || [];
      st.backpack = d.backpack; st.defeatCount = d.defeatCount || 0;
      if (d.cat && st.cat) Object.assign(st.cat, d.cat);
      return st;
    } catch (e) { return null; }
  };
})();
