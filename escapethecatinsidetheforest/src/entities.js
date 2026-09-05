// Actor behaviors: player movement/collision, the Cat, animals, cultists, kid followers, drops.
var G = globalThis.G || (globalThis.G = {});

(function () {
  const C = () => G.CONFIG, U = G.U;

  // ---------- movement with solid collision (axis-separated so sliding works) ----------
  function collide(st, e, dx, dy) {
    const tryMove = (nx, ny) => {
      for (const s of G.nearbySolids(st, nx, ny)) {
        if (U.dist2(nx, ny, s.x, s.y) < (s.r + 10) * (s.r + 10)) return false;
      }
      const c = C();
      return nx > 8 && ny > 8 && nx < (c.MAP_W - 1) * c.TILE && ny < (c.MAP_H - 1) * c.TILE;
    };
    if (dx && tryMove(e.x + dx, e.y)) e.x += dx;
    if (dy && tryMove(e.x, e.y + dy)) e.y += dy;
  }
  G.collide = collide;

  // ---------- player ----------
  G.updatePlayer = function (st, dt, input) {
    const p = st.player, c = C();
    let sp = c.PLAYER_SPEED * (p.speedT > 0 ? 1.35 : 1);
    let mx = input.mx, my = input.my;
    const m = Math.hypot(mx, my);
    if (m > 1) { mx /= m; my /= m; }
    if (m > 0.08) {
      p.facing = Math.atan2(my, mx);
      p.moving = true;
      collide(st, p, mx * sp * dt, my * sp * dt);
      p.walk = (p.walk || 0) + dt * 8;
    } else p.moving = false;
    p.speedT = Math.max(0, p.speedT - dt);
    p.hurtT = Math.max(0, p.hurtT - dt);
    p.cd = Math.max(0, p.cd - dt);
    p.torchT = Math.max(0, p.torchT - dt);
    p.swingT = Math.max(0, (p.swingT || 0) - dt);
  };

  G.damagePlayer = function (st, hearts, srcx, srcy, label) {
    const p = st.player;
    if (p.hurtT > 0 || st.over) return;
    p.hearts -= hearts;
    p.hurtT = C().INVULN_T;
    const a = U.angleTo(srcx, srcy, p.x, p.y);
    G.collide(st, p, Math.cos(a) * 22, Math.sin(a) * 22);
    U.fx(st, p.x, p.y - 30, 'text', label || 'BONK!', '#ff8ab5');
    G.sfx && G.sfx('bonk');
    if (G.onHurt) G.onHurt(st);
    if (p.hearts <= 0) { p.hearts = 0; G.defeat(st); }
  };

  // ---------- flashlight helpers ----------
  G.flashParams = function (st) {
    const c = C(), p = st.player;
    let range = c.FLASH_RANGE, half = c.FLASH_HALF_ANGLE;
    if (st.gathering.active) range *= c.GATHERING_FLASH_BONUS;
    return { range, half, on: p.hasFlashlight && p.flashOn && p.flashCharge > 0 };
  };
  G.inBeam = function (st, x, y, pad) {
    const p = st.player, f = G.flashParams(st);
    if (!f.on) return false;
    const d = U.dist(p.x, p.y, x, y);
    if (d > f.range + (pad || 0)) return false;
    return Math.abs(U.angDiff(p.facing, U.angleTo(p.x, p.y, x, y))) < f.half;
  };

  // The Cat respects a lit campfire: it will not come close to your home fire
  // (level >= 2). This makes camp a safe spot before you own a flashlight.
  function catMove(st, cat, dx, dy) {
    const c = C();
    if (st.fire.level >= 2) {
      const safeR = 6.5 * c.TILE;
      const dOld = U.dist(cat.x, cat.y, st.fire.x, st.fire.y);
      const dNew = U.dist(cat.x + dx, cat.y + dy, st.fire.x, st.fire.y);
      if (dNew < safeR && dNew <= dOld) {
        // slide away from the fire instead of entering its glow
        const a = U.angleTo(st.fire.x, st.fire.y, cat.x, cat.y);
        cat.x += Math.cos(a) * Math.hypot(dx, dy);
        cat.y += Math.sin(a) * Math.hypot(dx, dy);
        return;
      }
    }
    cat.x += dx; cat.y += dy;
  }

  // ---------- the Cat (leprompt §8) ----------
  G.updateCat = function (st, dt) {
    const c = C(), cat = st.cat, p = st.player;
    cat.walk = (cat.walk || 0) + dt * 4;

    // Choose guard duty: nearest captured kid the player approaches
    let guardKid = null, best = c.CAT_GUARD_RANGE;
    for (const k of st.kids) {
      if (k.rescued) continue;
      const d = U.dist(p.x, p.y, k.x, k.y);
      if (d < best) { best = d; guardKid = k; }
    }
    if (guardKid) {
      if (cat.guardKid !== guardKid.id) cat.guardKid = guardKid.id;
      const gx = guardKid.x + 1.6 * c.TILE, gy = guardKid.y + 0.6 * c.TILE;
      // teleport (only while far from the player's view) to the guard spot
      if (U.dist(cat.x, cat.y, gx, gy) > 45 * c.TILE && U.dist(p.x, p.y, cat.x, cat.y) > 26 * c.TILE) {
        cat.x = gx; cat.y = gy;
      }
    } else if (cat.state === 'guard') {
      cat.state = 'prowl'; cat.wakeT = 0;
    }

    // beam exposure (the ONLY weakness — §8)
    if (cat.state !== 'shooed' && G.inBeam(st, cat.x, cat.y, 26)) {
      cat.beamT += dt;
      if (cat.beamT >= c.CAT_BEAM_T) G.shooCat(st);
    } else {
      cat.beamT = Math.max(0, cat.beamT - dt * 0.8);
    }

    // swat cooldown + BONK
    cat.swatT = Math.max(0, cat.swatT - dt);

    switch (cat.state) {
      case 'shooed': {
        cat.shooT -= dt;
        const a = U.angleTo(p.x, p.y, cat.x, cat.y); // march away from the player
        cat.dir = a;
        const sp = c.CAT_SPEED_STALK * 1.1;
        cat.x += Math.cos(a) * sp * dt; cat.y += Math.sin(a) * sp * dt;
        const c2 = C();
        cat.x = U.clamp(cat.x, 40, (c2.MAP_W - 1) * c2.TILE - 40);
        cat.y = U.clamp(cat.y, 40, (c2.MAP_H - 1) * c2.TILE - 40);
        if (cat.shooT <= 0) { cat.state = guardKid ? 'guard' : 'prowl'; cat.wakeT = 0; }
        break;
      }
      case 'guard': {
        const kid = st.kids.find(k => k.id === cat.guardKid);
        if (!kid) { cat.state = 'prowl'; break; }
        const gx = kid.x + 1.6 * c.TILE, gy = kid.y + 0.6 * c.TILE;
        const dToCage = U.dist(cat.x, cat.y, gx, gy);
        const playerNear = U.dist(p.x, p.y, kid.x, kid.y) < 5.5 * c.TILE;
        if (playerNear && !G.inBeam(st, cat.x, cat.y, 26)) cat.wakeT += dt; else cat.wakeT = Math.max(0, cat.wakeT - dt * 0.5);
        if (cat.wakeT > c.CAT_GUARD_WAKE) {
          // woke up: stalk the player, but leashed to the cage (§8)
          const d = U.dist(cat.x, cat.y, p.x, p.y);
          if (d > 26 && dToCage < c.CAT_LEASH) {
            cat.state = 'stalk';
          } else if (dToCage > c.CAT_LEASH) {
            const a = U.angleTo(cat.x, cat.y, gx, gy);
            cat.x += Math.cos(a) * c.CAT_SPEED_PROWL * dt; cat.y += Math.sin(a) * c.CAT_SPEED_PROWL * dt;
          } else {
            cat.state = 'stalk';
          }
        } else if (dToCage > 20) {
          const a = U.angleTo(cat.x, cat.y, gx, gy);
          cat.x += Math.cos(a) * c.CAT_SPEED_PROWL * dt; cat.y += Math.sin(a) * c.CAT_SPEED_PROWL * dt;
        }
        break;
      }
      case 'prowl': {
        const isNight = st.phase === 'night';
        const inForest = G.biomeAt(Math.floor(cat.x / c.TILE), Math.floor(cat.y / c.TILE)) === 'forest';
        if (isNight && inForest && !guardKid) {
          cat.state = 'asleep'; break;   // forest Cat sleeps at night (§3)
        }
        const d = U.dist(cat.x, cat.y, p.x, p.y);
        const playerInForest = G.biomeAt(Math.floor(p.x / c.TILE), Math.floor(p.y / c.TILE)) === 'forest';
        if (playerInForest && d < c.CAT_PROWL_RADIUS) { cat.state = 'stalk'; break; }
        cat.wanderT -= dt;
        if (cat.wanderT <= 0) {
          cat.wanderT = U.rand(G.U.rng(st.seed + st.day), 1.5, 3.5);
          const a = G.U.rng(st.seed + st.day * 7 + Math.floor(cat.wanderT * 100))() * Math.PI * 2;
          cat.wx = Math.cos(a); cat.wy = Math.sin(a);
        }
        catMove(st, cat, cat.wx * c.CAT_SPEED_PROWL * dt, cat.wy * c.CAT_SPEED_PROWL * dt);
        // drift back toward the forest if it wandered off
        const cbiome = G.biomeAt(Math.floor(cat.x / c.TILE), Math.floor(cat.y / c.TILE));
        if (cbiome !== 'forest' && cbiome !== 'camp') {
          const a = U.angleTo(cat.x, cat.y, c.CAMP.x * c.TILE, c.CAMP.y * c.TILE);
          catMove(st, cat, Math.cos(a) * c.CAT_SPEED_PROWL * dt, Math.sin(a) * c.CAT_SPEED_PROWL * dt);
        }
        break;
      }
      case 'stalk': {
        const d = U.dist(cat.x, cat.y, p.x, p.y);
        if (d > c.CAT_PROWL_RADIUS * 1.6) { cat.state = guardKid ? 'guard' : 'prowl'; cat.wakeT = 0; break; }
        const a = U.angleTo(cat.x, cat.y, p.x, p.y);
        cat.dir = a;
        catMove(st, cat, Math.cos(a) * c.CAT_SPEED_STALK * dt, Math.sin(a) * c.CAT_SPEED_STALK * dt);
        if (d < 40 && cat.swatT <= 0 && !G.inBeam(st, cat.x, cat.y, 26)) {
          cat.swatT = c.CAT_SWAT_CD;
          G.damagePlayer(st, c.CAT_SWAT_HEARTS, cat.x, cat.y, 'BONK!');
          cat.state = 'prowl'; cat.wakeT = 0; // mercy: goes back to prowling after a swat
          const away = U.angleTo(p.x, p.y, cat.x, cat.y);
          cat.wx = Math.cos(away); cat.wy = Math.sin(away);
        }
        break;
      }
      case 'asleep': {
        if (st.phase === 'day') { cat.state = 'prowl'; break; }
        break;
      }
    }
  };

  G.shooCat = function (st) {
    const c = C(), cat = st.cat;
    if (cat.state === 'shooed') return;
    cat.state = 'shooed'; cat.shooT = c.CAT_SHOO_T; cat.beamT = 0;
    st.stats.catsShooed++;
    U.fx(st, cat.x, cat.y - 60, 'text', 'NO LIGHT!', '#ffd76e');
    G.sfx && G.sfx('shoo');
    if (U.chance(U.rng(st.seed + st.day * 31 + st.stats.catsShooed), c.CAT_FUR_CHANCE)) {
      G.spawnDrop(st, cat.x, cat.y, 'fur', 1);
    }
  };

  // ---------- animals ----------
  function spawnAnimal(st, type, x, y) {
    const a = C().ANIMALS[type];
    st.animals.push({
      type, x, y, hp: a.hp, state: 'wander', dir: 0, t: 0, wanderT: 0,
      wx: 0, wy: 0, hitT: 0, slowT: 0, blindT: 0, atkT: 0, walk: Math.random() * 6, scamperT: 0, sx: 0, sy: 0,
    });
  }
  G.spawnAnimal = spawnAnimal;

  G.updateAnimals = function (st, dt) {
    const c = C(), p = st.player;
    const calm = st.calm;
    for (let i = st.animals.length - 1; i >= 0; i--) {
      const an = st.animals[i];
      if (!an) continue; // defeat may have cleared the list mid-loop
      const def = c.ANIMALS[an.type];
      an.t += dt; an.hitT = Math.max(0, an.hitT - dt);
      an.slowT = Math.max(0, an.slowT - dt); an.blindT = Math.max(0, an.blindT - dt);
      an.atkT = Math.max(0, an.atkT - dt);

      if (an.state === 'dizzy') {
        an.scamperT -= dt;
        if (an.scamperT <= 0) { st.animals.splice(i, 1); U.fx(st, an.x, an.y, 'poof'); }
        continue;
      }
      if (an.state === 'scamper') {
        const sp = def.speed * 1.6;
        an.x += an.sx * sp * dt; an.y += an.sy * sp * dt;
        an.walk += dt * 12;
        if (an.t > 2.5 || an.x < 20 || an.y < 20 || an.x > 6380 || an.y > 6380) { st.animals.splice(i, 1); }
        continue;
      }

      const d = U.dist(an.x, an.y, p.x, p.y);
      if (d > c.ANIMAL_DESPAWN) { st.animals.splice(i, 1); continue; }

      // aggro rules (calm factor shrinks range after the Gathering — §15)
      const isWolf = an.type === 'wolf' || an.type === 'alphaWolf';
      let aggroR = (isWolf && st.phase === 'night') ? c.ANIMAL_AGGRO_R * 2.4 : c.ANIMAL_AGGRO_R;
      if (an.type === 'bunny') aggroR = 0;
      if (an.type === 'hog' || an.type === 'emberHog') aggroR *= 0.7;
      aggroR *= calm;
      const fireDarkPanic = isWolf && st.phase === 'night' && st.fire.level < 1; // dark = bold wolves (§13)
      if (fireDarkPanic) aggroR = 40 * c.TILE;

      if (an.state === 'wander' && (d < aggroR || (an.type === 'wolf' && fireDarkPanic))) an.state = 'aggro';
      if (an.state === 'aggro' && d > aggroR * 2.2 && !fireDarkPanic) an.state = 'wander';

      if (an.state === 'aggro' && an.blindT <= 0) {
        const sp = def.speed * (an.slowT > 0 ? c.ICE_SLOW.f : 1);
        const a = U.angleTo(an.x, an.y, p.x, p.y);
        an.dir = a;
        // wolves circle a bit instead of beelining (nips, not mauls)
        let ax = Math.cos(a), ay = Math.sin(a);
        if (isWolf) { const w = Math.sin(an.t * 2.2) * 0.55; ax += -Math.sin(a) * w; ay += Math.cos(a) * w; }
        // a lit campfire keeps night wolves at the edge of its glow (§13)
        if (isWolf && st.phase === 'night' && st.fire.level >= 2) {
          const fr = 4.5 * c.TILE;
          const dFire = U.dist(an.x, an.y, st.fire.x, st.fire.y);
          if (dFire < fr) {
            const away = U.angleTo(st.fire.x, st.fire.y, an.x, an.y);
            ax += Math.cos(away) * 1.6; ay += Math.sin(away) * 1.6;
            const m = Math.hypot(ax, ay) || 1; ax /= m; ay /= m;
          }
        }
        collide(st, an, ax * sp * dt, ay * sp * dt);
        an.walk += dt * 9;
        if (d < def.r + 16 && an.atkT <= 0 && def.dmg > 0) {
          an.atkT = 1.5;
          G.damagePlayer(st, def.dmg, an.x, an.y, 'BONK!');
        }
      } else {
        an.wanderT -= dt;
        if (an.wanderT <= 0) {
          an.wanderT = 1 + Math.random() * 2.5;
          const a = Math.random() * Math.PI * 2;
          an.wx = Math.cos(a) * 0.4; an.wy = Math.sin(a) * 0.4;
          if (an.type === 'bunny' && d < 6 * c.TILE) { // hop away from the player
            const aa = U.angleTo(p.x, p.y, an.x, an.y);
            an.wx = Math.cos(aa) * 0.9; an.wy = Math.sin(aa) * 0.9;
          }
        }
        const sp = def.speed * 0.5 * (an.slowT > 0 ? c.ICE_SLOW.f : 1);
        collide(st, an, an.wx * sp * dt, an.wy * sp * dt);
        an.walk += dt * 5;
      }
    }
  };

  G.bonkAnimal = function (an, dmg, slow) {
    an.hp -= dmg;
    an.hitT = 0.25;
    if (slow) an.slowT = C().ICE_SLOW.t;
    if (an.hp <= 0) {
      an.state = 'scamper'; an.t = 0;
      const a = an.dir + Math.PI;
      an.sx = Math.cos(a); an.sy = Math.sin(a);
    }
  };

  // ---------- cultists (§9) ----------
  G.spawnCultists = function (st) {
    const c = C(), r = U.rng(st.seed + st.day * 101);
    const n = U.randi(r, c.CULT_COUNT[0], c.CULT_COUNT[1]);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r();
      st.cultists.push({
        x: st.fire.x + Math.cos(a) * 22 * c.TILE,
        y: st.fire.y + Math.sin(a) * 22 * c.TILE,
        state: 'sneak', beamT: 0, stealT: 0, dir: 0, walk: 0, flip: 0,
      });
    }
  };

  G.updateCultists = function (st, dt) {
    const c = C(), p = st.player;
    for (let i = st.cultists.length - 1; i >= 0; i--) {
      const cu = st.cultists[i];
      if (!cu) continue; // defeat may have cleared the list mid-loop
      cu.walk += dt * 7;
      if (G.inBeam(st, cu.x, cu.y, 12)) {
        cu.beamT += dt;
        if (cu.beamT >= c.CULT_BEAM_T) { G.scareCultist(st, cu); st.cultists.splice(i, 1); continue; }
      } else cu.beamT = Math.max(0, cu.beamT - dt);
      if (cu.state === 'sneak') {
        const a = U.angleTo(cu.x, cu.y, st.fire.x, st.fire.y);
        cu.dir = a;
        collide(st, cu, Math.cos(a) * c.CULT_SPEED * dt, Math.sin(a) * c.CULT_SPEED * dt);
        if (U.dist(cu.x, cu.y, st.fire.x, st.fire.y) < 60) cu.state = 'steal';
      } else if (cu.state === 'steal') {
        cu.stealT += dt;
        if (cu.stealT >= c.CULT_STEAL_S) {
          const inv = st.player.inv;
          if (inv.fuel > 0) { inv.fuel--; U.toast('A cultist snatched 1 Fuel!'); }
          if (inv.diamond > 0) { inv.diamond = Math.max(0, inv.diamond - 1); st.stats.diamonds = Math.max(0, st.stats.diamonds); U.toast('A cultist snatched 1 Diamond!'); }
          G.scareCultist(st, cu, true);
          st.cultists.splice(i, 1); continue;
        }
      }
    }
    if (st.phase === 'day') { for (const cu of st.cultists) U.fx(st, cu.x, cu.y, 'poof'); st.cultists.length = 0; }
  };

  G.scareCultist = function (st, cu, silent) {
    const c = C(), r = U.rng(st.seed + st.day * 7 + Math.floor(cu.x));
    if (!silent) U.fx(st, cu.x, cu.y - 30, 'text', 'EEK!', '#c9a7ff');
    if (U.chance(r, c.CULT_DROP.diamond)) G.spawnDrop(st, cu.x, cu.y, 'diamond', 1);
    else if (U.chance(r, c.CULT_DROP.scrap / (1 - c.CULT_DROP.diamond))) G.spawnDrop(st, cu.x, cu.y, 'scrap', 1);
    G.sfx && G.sfx('squeal');
  };

  // ---------- kid followers (§11) ----------
  G.updateKids = function (st, dt) {
    const c = C(), p = st.player;
    let idx = 0;
    for (const k of st.kids) {
      if (!k.rescued) continue;
      idx++;
      const tx = p.x - Math.cos(p.facing) * (36 * idx) - 10;
      const ty = p.y - Math.sin(p.facing) * (36 * idx) - 10 * idx * 0.2;
      const d = U.dist(k.x, k.y, tx, ty);
      if (d > 14) {
        const a = U.angleTo(k.x, k.y, tx, ty);
        const sp = Math.min(c.PLAYER_SPEED * 1.05, 40 + d * 2.2);
        k.x += Math.cos(a) * sp * dt; k.y += Math.sin(a) * sp * dt;
        k.walk = (k.walk || 0) + dt * 8;
      }
      k.bob += dt;
      // helper powers (animals only — never the Cat, §11)
      k.helpT -= dt;
      if (k.helpT <= 0) {
        k.helpT = c.KID_HELP[k.id];
        if (k.id === 'kraken') {
          const near = st.animals.filter(a => a.state !== 'scamper' && U.dist(a.x, a.y, p.x, p.y) < 4 * c.TILE);
          if (near.length) {
            st.splats.push({ x: p.x, y: p.y, kind: 'puddle', t: 0, life: 3 });
            for (const a of near) a.slowT = Math.max(a.slowT, 3);
          }
        } else if (k.id === 'squid') {
          const near = st.animals.filter(a => a.state !== 'scamper' && U.dist(a.x, a.y, p.x, p.y) < 3 * c.TILE);
          if (near.length) {
            st.splats.push({ x: p.x, y: p.y, kind: 'ink', t: 0, life: 3 });
            for (const a of near) a.blindT = Math.max(a.blindT, 3);
          }
        } else if (k.id === 'dino') {
          const near = st.animals.filter(a => a.state !== 'scamper' && U.dist(a.x, a.y, p.x, p.y) < 2.5 * c.TILE);
          if (near.length) {
            U.fx(st, p.x, p.y, 'text', 'STOMP!', '#9be564');
            G.sfx && G.sfx('stomp');
            for (const a of near) G.bonkAnimal(a, 1, false);
          }
        } else if (k.id === 'koala') {
          if (p.hearts < c.PLAYER_HEARTS - 0.49) {
            p.hearts = Math.min(c.PLAYER_HEARTS, p.hearts + 0.5);
            U.fx(st, p.x, p.y - 30, 'text', '+ leaf!', '#8ee6a8');
          } else k.helpT = 1;
        }
      }
    }
    for (let i = st.splats.length - 1; i >= 0; i--) { st.splats[i].t += dt; if (st.splats[i].t > st.splats[i].life) st.splats.splice(i, 1); }
  };

  // ---------- drops ----------
  G.spawnDrop = function (st, x, y, item, amt) {
    st.drops.push({ x: x + U.rand(U.rng(st.seed + st.drops.length), -10, 10), y: y + U.rand(U.rng(st.seed + st.drops.length + 1), -10, 10), item, amt, t: 0 });
  };

  G.updateDrops = function (st, dt) {
    const c = C(), p = st.player;
    for (let i = st.drops.length - 1; i >= 0; i--) {
      const d = st.drops[i];
      d.t += dt;
      if (d.t > 420) { st.drops.splice(i, 1); continue; }
      if (U.dist(d.x, d.y, p.x, p.y) < c.PICKUP_R) {
        if (d.item === 'diamond') st.stats.diamonds += d.amt;
        p.inv[d.item] = (p.inv[d.item] || 0) + d.amt;
        U.fx(st, d.x, d.y - 20, 'text', `+${d.amt} ${G.itemName(d.item)}`, '#fff2b0');
        G.sfx && G.sfx('pickup');
        st.drops.splice(i, 1);
      }
    }
  };

  G.itemName = function (id) {
    return ({ wood: 'Wood', scrap: 'Scrap', fur: 'Cat Fur', pelt: 'Pelt', diamond: 'Diamond', fuel: 'Fuel',
      battery: 'Battery', torch: 'Torch', morsel: 'Morsel', steak: 'Steak', csteak: 'Cooked Steak',
      bfoot: 'Bunny Foot', grape: 'Grapes', brew: 'Jungle Brew' })[id] || id;
  };
})();
