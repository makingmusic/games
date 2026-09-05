// Bot auto-player (leprompt §20.2): camps, chops wood, keeps fire >= 3, shoos the Cat
// daily, raids the Diamond Grove, rescues kids, trades pelts — and logs its run.
// Uses the same G.step() as the real game; UI-level actions (eat/trade/fuel) call the
// same functions the buttons call.
var G = globalThis.G || (globalThis.G = {});

(function () {
  const C = () => G.CONFIG, U = G.U;

  G.setFlash = function (st, on) {
    const p = st.player;
    if (on && !p.hasFlashlight) return;
    if (p.flashOn !== on) G.toggleFlashlight(st);
  };

  G.botInit = function (st, opts) {
    st.bot = {
      plan: 'home', phase: 'go', target: null, wp: null, detourT: 0, detour: null,
      stuckT: 0, lastX: st.player.x, lastY: st.player.y, checkT: 0,
      grabCd: 0, log: [], opts: opts || {}, rescueOrder: ['squid', 'dino', 'koala', 'kraken'],
      tradedToday: -1, groveDay: -1, bonkT: 0,
    };
  };

  function log(st, msg) {
    const line = `[Day ${st.day} ${st.phase}] ${msg}`;
    st.bot.log.push(line);
    if (st.bot.opts.console && typeof console !== 'undefined') console.log(line);
  }
  G.botLog = log;

  function camp(st) { const c = C(); return { x: c.CAMP.x * c.TILE, y: (c.CAMP.y + 1.5) * c.TILE }; }
  function distTo(a, b) { return U.dist(a.x, a.y, b.x, b.y); }

  function moveToward(st, from, to) {
    const b = st.bot, dx = to.x - from.x, dy = to.y - from.y;
    let mx = dx, my = dy;
    const m = Math.hypot(mx, my) || 1;
    if (b.detourT > 0) {
      // perpendicular nudges to slide around trees
      const px = -dy / m, py = dx / m;
      mx = dx / m + px * 1.2 * b.detourSide; my = dy / m + py * 1.2 * b.detourSide;
    } else { mx /= m; my /= m; }
    const mm = Math.hypot(mx, my) || 1;
    return { mx: mx / mm, my: my / mm };
  }

  G.botTick = function (st, dt) {
    const input = rawTick(st, dt);
    if (st.bot) { st.bot.prevMx = input.mx; st.bot.prevMy = input.my; }
    return input;
  };

  function rawTick(st, dt) {
    const c = C(), p = st.player, b = st.bot;
    if (!b) G.botInit(st);
    const input = { mx: 0, my: 0, attack: false, light: false, grab: false, eat: false };
    b.grabCd = Math.max(0, b.grabCd - dt);
    b.detourT = Math.max(0, b.detourT - dt);
    b.bonkT = Math.max(0, b.bonkT - dt);

    // ---- stuck detection → short detour (uses last tick's *desired* movement)
    b.checkT += dt;
    if (b.checkT > 0.7) {
      const moved = U.dist(p.x, p.y, b.lastX, b.lastY);
      const wantsMove = Math.abs(b.prevMx || 0) > 0.05 || Math.abs(b.prevMy || 0) > 0.05;
      if (moved < 16 && wantsMove) {
        b.stuckT += 0.7;
        if (b.stuckT > 0.9) { b.detourT = 0.8; b.detourSide = Math.random() < 0.5 ? 1 : -1; b.stuckT = 0; }
      } else b.stuckT = 0;
      b.lastX = p.x; b.lastY = p.y; b.checkT = 0;
    }

    // ---- nightly status log
    if (st.phase === 'night' && st.t < 0.5 && !b.loggedNight) {
      b.loggedNight = true;
      if (st.night % c.BOT_LOG_EVERY === 0 || st.night <= 3) {
        log(st, `Night ${st.night}/85 — hearts ${p.hearts.toFixed(1)}, hunger ${p.hunger.toFixed(0)}, ` +
          `fire ${st.fire.level.toFixed(1)}, wood ${p.inv.wood}, pelts ${p.inv.pelt}, food ` +
          `${p.inv.grape + p.inv.morsel + p.inv.steak + p.inv.csteak}, kids ${st.kids.filter(k => k.rescued).length}/4, ` +
          `flash ${(p.hasFlashlight ? p.flashCharge.toFixed(0) : 'none')}${p.weapon !== 'hands' ? ', ' + p.weapon : ''}, defeats ${st.defeatCount}`);
      }
    }
    if (st.phase === 'day') b.loggedNight = false;

    // ---- survival basics first: keep the tummy happy, bank supper for the night
    if (p.hunger < 70) {
      const order = ['grape', 'morsel', 'bfoot', 'steak', 'csteak'];
      for (const f of order) if (p.inv[f] > 0) { G.eat(st, f); break; }
    }
    // keep the fire fed while at camp
    if (distTo(p, st.fire) < 3 * c.TILE) {
      if (st.fire.level < 3 && p.inv.wood > 0) G.addFuelToFire(st, 'wood');
      else if (st.fire.level < 2 && p.inv.fuel > 0) G.addFuelToFire(st, 'fuel');
    }

    // ---- JUST HIT? swing back at the nearest animal right away — never get chewed
    if (p.hurtT > 0.35) {
      let attacker = null, ad = 4 * c.TILE;
      for (const an of st.animals) {
        if (an.state === 'scamper' || an.state === 'dizzy' || an.type === 'bunny') continue;
        const d = distTo(an, p);
        if (d < ad) { ad = d; attacker = an; }
      }
      if (attacker) {
        const a = U.angleTo(p.x, p.y, attacker.x, attacker.y);
        input.mx = Math.cos(a); input.my = Math.sin(a);
        if (ad < c.ATTACK_RANGE[p.weapon] - 6 && p.cd <= 0.05) input.attack = true;
        return input;
      }
    }

    // ---- Cat interrupt: shoos the Cat daily (§20). No flashlight yet? back away!
    const cat = st.cat;
    const catThreat = cat.state === 'stalk' || (cat.state === 'prowl' && distTo(cat, p) < 8 * c.TILE);
    if (catThreat && cat.state !== 'shooed') {
      const a = U.angleTo(p.x, p.y, cat.x, cat.y);
      if (!p.hasFlashlight) {
        // run away toward camp until geared up
        const h = camp(st), ah = U.angleTo(p.x, p.y, h.x, h.y);
        input.mx = Math.cos(ah); input.my = Math.sin(ah);
        return input;
      }
      input.mx = Math.cos(a); input.my = Math.sin(a);
      G.setFlash(st, true);
      return input;
    }
    // save power when nothing needs the light
    if (!catThreat && !st.cultists.length && p.flashOn && b.plan !== 'rescue') G.setFlash(st, false);

    // ---- opportunistic hunting when the pantry is empty (bunnies & hogs are slow)
    const totalFood = p.inv.grape + p.inv.morsel + p.inv.steak + p.inv.csteak + p.inv.bfoot;
    if (totalFood < 4 && st.phase === 'day' && b.plan !== 'rescue') {
      let prey = null, pd = 9 * c.TILE;
      for (const an of st.animals) {
        if (an.state === 'scamper' || an.state === 'dizzy') continue;
        if (an.type !== 'bunny' && an.type !== 'hog') continue;
        const d = distTo(an, p);
        if (d < pd) { pd = d; prey = an; }
      }
      if (prey) {
        const a = U.angleTo(p.x, p.y, prey.x, prey.y);
        input.mx = Math.cos(a); input.my = Math.sin(a);
        if (pd < c.ATTACK_RANGE[p.weapon] - 6 && p.cd <= 0.05) input.attack = true;
        return input;
      }
    }

    // ---- cultists at night: beam them
    if (st.cultists.length) {
      let cu = null, bd = 9 * c.TILE;
      for (const x of st.cultists) { const d = distTo(x, p); if (d < bd) { bd = d; cu = x; } }
      if (cu) {
        const a = U.angleTo(p.x, p.y, cu.x, cu.y);
        input.mx = Math.cos(a); input.my = Math.sin(a);
        G.setFlash(st, true);
        if (bd < c.ATTACK_RANGE[p.weapon] + 8) input.attack = true;
        return input;
      }
    }

    // ---- fight animals that are close (night wolves, grove guards)
    let hostile = null, hd = 3.2 * c.TILE;
    for (const an of st.animals) {
      if (an.state === 'scamper' || an.state === 'dizzy' || an.type === 'bunny') continue;
      if (an.state === 'aggro' || distTo(an, p) < 2.2 * c.TILE) {
        const d = distTo(an, p);
        if (d < hd) { hd = d; hostile = an; }
      }
    }
    if (hostile) {
      const a = U.angleTo(p.x, p.y, hostile.x, hostile.y);
      // badly hurt? run home to heal by the fire instead of gambling on the fight
      const h = camp(st);
      if (p.hearts < 1.6 && distTo(p, h) < 30 * c.TILE && hostile.type !== 'bunny') {
        const ah = U.angleTo(p.x, p.y, h.x, h.y);
        input.mx = Math.cos(ah); input.my = Math.sin(ah);
        return input;
      }
      input.mx = Math.cos(a); input.my = Math.sin(a);
      if (hd < c.ATTACK_RANGE[p.weapon] - 6 && p.cd <= 0.05) input.attack = true;
      if (p.cd > 0.05) { input.mx = 0; input.my = 0; input.attack = false; }
      return input;
    }

    // ---- pick up nearby loot (drops from hunts and chopping)
    if (st.drops.length && b.plan !== 'rescue' && b.plan !== 'grove') {
      let dr = null, dd = 4.5 * c.TILE;
      for (const d of st.drops) { const ds = distTo(d, p); if (ds < dd) { dd = ds; dr = d; } }
      if (dr) { const mv = moveToward(st, p, dr); input.mx = mv.mx; input.my = mv.my; return input; }
    }

    // ---- night: go home and guard the fire
    const home = camp(st);
    if (st.phase === 'night') {
      const d = distTo(p, home);
      if (d > 2.2 * c.TILE) { const mv = moveToward(st, p, home); input.mx = mv.mx; input.my = mv.my; return input; }
      G.setFlash(st, false);
      return input; // stand by the fire, heal, fight what comes
    }

    // ================= DAY PLANS =================
    const timeLeft = c.DAY_LEN - st.t;
    const speed = c.PLAYER_SPEED;
    const canReach = (dest, margin) => distTo(p, dest) / speed + (margin || 30) + distTo(dest, home) / speed < timeLeft;

    if (b.plan === 'home' || !b.plan) {
      // choose a plan
      const kidsLeft = st.kids.filter(k => !k.rescued);
      const foodCount = p.inv.grape + p.inv.morsel + p.inv.steak + p.inv.csteak;
      if (distTo(p, home) > 3 * c.TILE && !b.wp) { const mv = moveToward(st, p, home); input.mx = mv.mx; input.my = mv.my; return input; }

      // 0. SUPPER RULE: before dusk, bank food no matter what else is planned
      const foodNow = p.inv.grape + p.inv.morsel + p.inv.steak + p.inv.csteak;
      if (timeLeft < 55 && foodNow < 3) {
        let bush = null, bd = 1e9;
        for (const bu of st.bushes) if (bu.ripe) { const d = distTo(bu, p); if (d < bd) { bd = d; bush = bu; } }
        if (bush && bd < 110 * c.TILE) { b.plan = 'grape'; b.phase = 'go'; b.target = bush; b.grapeGoal = 4; return input; }
        const mv = moveToward(st, p, home); input.mx = mv.mx; input.my = mv.my; return input; // head home early
      }

      // 1. trade for the flashlight, then axe/coat (§20 bot)
      const pt = st.traders.pelt;
      const wantTrade = (!p.hasFlashlight && p.inv.pelt >= c.PRICES.flashlight.pelt) ||
        (p.hasFlashlight && p.weapon === 'hands' && p.inv.pelt >= c.PRICES.iceAxe.pelt) ||
        (p.weapon === 'hands' && p.inv.pelt >= c.PRICES.iceAxe.pelt + c.PRICES.flashlight.pelt) ||
        (p.weapon === 'ice' && !p.coat && p.inv.pelt >= c.PRICES.peltCoat.pelt) ||
        (p.weapon === 'ice' && p.coat && p.inv.pelt >= c.PRICES.strongAxe.pelt);
      if (wantTrade && b.tradedToday !== st.day && canReach(pt)) { b.plan = 'trade'; b.phase = 'go'; b.wp = { x: pt.x, y: pt.y + 44 }; return input; }

      // 1b. snack run first when the pantry is low — hungry bots make mistakes
      if (foodCount < 4) {
        let bush = null, bd = 1e9;
        for (const bu of st.bushes) if (bu.ripe) { const d = distTo(bu, home); if (d < bd) { bd = d; bush = bu; } }
        if (bush && bd < 110 * c.TILE) { b.plan = 'grape'; b.phase = 'go'; b.target = bush; b.grapeGoal = 8; return input; }
        // no ripe bush in reach? go bonk some dinner instead
        let prey = null, pd = 1e9;
        for (const an of st.animals) {
          if (an.state === 'scamper' || an.state === 'dizzy') continue;
          if (an.type !== 'bunny' && an.type !== 'hog') continue;
          const d = distTo(an, p);
          if (d < pd) { pd = d; prey = an; }
        }
        if (prey) { b.plan = 'hunt'; b.phase = 'go'; b.target = prey; return input; }
      }

      // 2. rescue a kid once geared up (flashlight + some charge or fuel)
      if (p.hasFlashlight && kidsLeft.length && (p.flashCharge > 55 || p.inv.battery > 0 || p.inv.fuel > 0)) {
        // charge flashlight from fuel/batteries before a trip if very low
        if (p.flashCharge < 25) {
          if (p.inv.battery > 0) { p.inv.battery--; p.flashCharge = Math.min(c.FLASH_CHARGE_MAX, p.flashCharge + c.BATTERY_CHARGE); }
          else if (p.inv.fuel > 0) { p.inv.fuel--; p.flashCharge = c.FLASH_CHARGE_MAX; log(st, 'Poured fuel into the flashlight.'); }
        }
        const id = b.rescueOrder.find(id => { const k = st.kids.find(k => k.id === id); return k && !k.rescued; });
        const k = st.kids.find(k => k.id === id);
        // forest/jungle/lava kids first need no coat; snow kid waits for a coat or warm kid-fire
        if (k && canReach({ x: k.x, y: k.y }, 60)) {
          b.plan = 'rescue'; b.phase = 'go'; b.target = k;
          log(st, `Trip started: rescue ${k.name} (${(distTo(p, k) / c.TILE) | 0} m away).`);
          return input;
        }
      }

      // 3. wood run (keep 8+ wood; search near camp first, then wider)
      if (p.inv.wood < 8) {
        let tree = null, td = 60 * c.TILE;
        for (const t of st.trees) { const d = distTo(t, home); if (d < td) { td = d; tree = t; } }
        if (tree) { b.plan = 'wood'; b.phase = 'go'; b.target = tree; return input; }
      }

      // 5. diamond grove roughly weekly (§20), once armed
      const grove = { x: c.GROVE.x * c.TILE, y: c.GROVE.y * c.TILE };
      if (p.hasFlashlight && p.weapon !== 'hands' && st.day - b.groveDay >= 8 && canReach(grove, 60)) {
        b.plan = 'grove'; b.phase = 'go'; b.groveDay = st.day; log(st, 'Diamond Grove raid!'); return input;
      }

      // otherwise idle at camp: top up fire to 6, then stand around
      if (st.fire.level < 6 && p.inv.wood > 0) G.addFuelToFire(st, 'wood');
      return input;
    }

    // ---- execute current plan ----
    if (b.plan === 'trade') {
      const pt = { x: st.traders.pelt.x, y: st.traders.pelt.y + 44 };
      if (distTo(p, pt) > 40) { const mv = moveToward(st, p, pt); input.mx = mv.mx; input.my = mv.my; return input; }
      if (!p.hasFlashlight) G.trade(st, 'pelt', 'flashlight');
      else if (p.weapon === 'hands') G.trade(st, 'pelt', 'iceAxe');
      else if (!p.coat) G.trade(st, 'pelt', 'peltCoat');
      else if (p.weapon === 'ice') G.trade(st, 'pelt', 'strongAxe');
      b.tradedToday = st.day; b.plan = 'home'; b.wp = null;
      return input;
    }
    // drop spare cat fur at the Feather Trader whenever passing by (fur → fuel, §12)
    if (p.inv.fur > 0 && distTo(p, st.traders.feather) < 44) {
      while (p.inv.fur > 0) G.trade(st, 'feather', 'fuel', 'fur');
    }

    if (b.plan === 'wood') {
      let tree = b.target;
      if (!tree || st.trees.indexOf(tree) < 0) {
        // collect the logs that popped out, then pick the next tree
        const drop = st.drops.filter(d => d.item === 'wood' && distTo(d, p) < 6 * c.TILE)[0];
        if (drop) { const mv = moveToward(st, p, drop); input.mx = mv.mx; input.my = mv.my; return input; }
        if (p.inv.wood >= 8) { b.plan = 'home'; return input; }
        tree = null; let td = 60 * c.TILE;
        for (const t of st.trees) { const d = distTo(t, home); if (d < td) { td = d; tree = t; } }
        b.target = tree;
        if (!tree) { b.plan = 'home'; return input; }
      }
      const d = distTo(p, tree);
      if (d > 40) { const mv = moveToward(st, p, tree); input.mx = mv.mx; input.my = mv.my; return input; }
      const a = U.angleTo(p.x, p.y, tree.x, tree.y);
      input.mx = Math.cos(a); input.my = Math.sin(a);
      if (p.cd <= 0.05) input.attack = true;
      return input;
    }

    if (b.plan === 'hunt') {
      const prey = b.target;
      if (!prey || st.animals.indexOf(prey) < 0 || prey.state === 'scamper' || prey.state === 'dizzy') {
        const foodNow2 = p.inv.grape + p.inv.morsel + p.inv.steak + p.inv.csteak;
        b.plan = foodNow2 >= 4 ? 'home' : 'hunt';
        if (b.plan === 'hunt') {
          let np = null, npd = 1e9;
          for (const an of st.animals) {
            if (an.state === 'scamper' || an.state === 'dizzy') continue;
            if (an.type !== 'bunny' && an.type !== 'hog') continue;
            const d = distTo(an, p);
            if (d < npd) { npd = d; np = an; }
          }
          b.target = np;
          if (!np) b.plan = 'home';
        }
        return input;
      }
      const d = distTo(p, prey);
      if (d > 30) { const mv = moveToward(st, p, prey); input.mx = mv.mx; input.my = mv.my; return input; }
      const a = U.angleTo(p.x, p.y, prey.x, prey.y);
      input.mx = Math.cos(a); input.my = Math.sin(a);
      if (d < c.ATTACK_RANGE[p.weapon] - 6 && p.cd <= 0.05) input.attack = true;
      return input;
    }

    if (b.plan === 'grape') {
      const foodNow = p.inv.grape + p.inv.morsel + p.inv.steak + p.inv.csteak;
      if (foodNow >= (b.grapeGoal || 6)) { b.plan = 'home'; return input; }
      let bush = b.target;
      if (!bush || !bush.ripe) {
        bush = null; let bd = 1e9;
        for (const bu of st.bushes) if (bu.ripe) { const d = distTo(bu, p); if (d < bd) { bd = d; bush = bu; } }
        b.target = bush;
      }
      if (!bush) { b.plan = 'home'; return input; }
      if (distTo(p, bush) > 26) { const mv = moveToward(st, p, bush); input.mx = mv.mx; input.my = mv.my; return input; }
      if (b.grabCd <= 0) { input.grab = true; b.grabCd = 0.5; }
      return input;
    }

    if (b.plan === 'grove') {
      const grove = { x: c.GROVE.x * c.TILE, y: c.GROVE.y * c.TILE };
      const here = distTo(p, grove) < c.GROVE.r * c.TILE * 0.8;
      if (!here && b.phase === 'go') { const mv = moveToward(st, p, grove); input.mx = mv.mx; input.my = mv.my; return input; }
      b.phase = 'loot';
      let dia = null, dd = 8 * c.TILE;
      for (const d of st.groveDiamonds) { const ds = distTo(d, p); if (ds < dd) { dd = ds; dia = d; } }
      if (dia) {
        if (dd > 26) { const mv = moveToward(st, p, dia); input.mx = mv.mx; input.my = mv.my; return input; }
        if (b.grabCd <= 0) { input.grab = true; b.grabCd = 0.4; }
        return input;
      }
      log(st, `Grove done. Diamonds: ${p.inv.diamond}.`);
      b.plan = 'home'; b.phase = 'go'; return input;
    }

    if (b.plan === 'rescue') {
      const k = b.target;
      if (!k || k.rescued) { b.plan = 'home'; b.phase = 'go'; return input; }
      const cage = st.cages.find(cg => cg.kid === k.id);
      // shoo the guard Cat first (the ONLY way — §8)
      const catHere = st.cat.guardKid === k.id && st.cat.state !== 'shooed';
      if (catHere && st.cat.state !== 'shooed' && distTo(st.cat, cage) < 6 * c.TILE) {
        b.phase = 'shoo';
        const catP = { x: st.cat.x, y: st.cat.y };
        const d = distTo(p, catP);
        if (d > 4.4 * c.TILE) { const mv = moveToward(st, p, catP); input.mx = mv.mx; input.my = mv.my; return input; }
        const a = U.angleTo(p.x, p.y, st.cat.x, st.cat.y);
        input.mx = Math.cos(a); input.my = Math.sin(a);
        G.setFlash(st, true);
        return input;
      }
      // cage taps
      if (distTo(p, cage) > 40) { G.setFlash(st, false); const mv = moveToward(st, p, cage); input.mx = mv.mx; input.my = mv.my; return input; }
      if (b.grabCd <= 0 && cage.taps < c.CAGE_TAPS) { input.grab = true; b.grabCd = 0.5; return input; }
      if (cage.taps >= c.CAGE_TAPS) {
        log(st, `${k.name} rescued! (${st.kids.filter(x => x.rescued).length}/4)`);
        b.plan = 'home'; b.phase = 'go'; b.wp = null;
      }
      return input;
    }

    return input;
  };
})();
