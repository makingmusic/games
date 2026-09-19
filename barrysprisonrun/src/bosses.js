// Barry's Prison Run — the two bosses: Chef Barry (cafeteria) and
// Ultra Super Robo Barry (the yard). Plus the shared fruit-bazooka logic.

var Bosses = {};

// ---------- fruit bazooka ----------

Bosses.aimAt = function () {
  // generous cone check against whichever boss is active (kid aim assist)
  var p = World.player;
  var targets = [];
  if (World.chef && World.chef.visible && World.chef.state !== 'defeated')
    targets.push({ x: World.chef.x, y: World.chef.y, h: 0.9, ent: World.chef, kind: 'chef' });
  if (World.robo && World.robo.visible && World.robo.state !== 'defeated' && World.robo.state !== 'intro')
    targets.push({ x: World.robo.x, y: World.robo.y, h: 1.6, ent: World.robo, kind: 'robo' });
  var best = null, bestA = CONFIG.bazooka.aimConeDeg * Math.PI / 180;
  for (var i = 0; i < targets.length; i++) {
    var t = targets[i];
    var dx = t.x - p.x, dy = t.y - p.y;
    var d = Math.hypot(dx, dy);
    if (d > CONFIG.bazooka.aimRange) continue;
    var ang = Math.atan2(dy, dx) - p.dir;
    while (ang > Math.PI) ang -= 2 * Math.PI;
    while (ang < -Math.PI) ang += 2 * Math.PI;
    if (Math.abs(ang) < bestA) { best = t; bestA = Math.abs(ang); }
  }
  return best;
};

Bosses.shoot = function () {
  var p = World.player;
  if (!p.hasBazooka || p.fireCd > 0) return;
  p.fireCd = CONFIG.bazooka.fireCooldown;
  p.shotAnim = CONFIG.bazooka.fireCooldown;
  Game.stats.fruit++;
  p.fruitIdx++;
  var kinds = ['apple', 'banana', 'melon'];
  var kind = kinds[p.fruitIdx % 3];
  var target = Bosses.aimAt();
  var dx, dy, dz, dist;
  if (target) {
    dx = target.x - p.x; dy = target.y - p.y;
    dist = Math.hypot(dx, dy);
    dz = target.h - 0.6;                       // aim at the belly. Always the belly.
  } else {
    dx = Math.cos(p.dir); dy = Math.sin(p.dir); dz = -0.08;
    dist = 12;
  }
  var d3 = Math.sqrt(dist * dist + dz * dz) || 1;
  var T = d3 / CONFIG.bazooka.speed;
  World.entities.push({
    kind: 'fruit', x: p.x + Math.cos(p.dir) * 0.45, y: p.y + Math.sin(p.dir) * 0.45,
    z: p.eyeZ - 0.12,
    vx: dx / T, vy: dy / T, vz: dz / T + 0.5 * 2.2 * T,   // arc that lands on target
    sprite: 'fruit_' + kind, splat: kind, scale: 0.3, spin: true,
    target: target ? target.ent : null, life: 2.2
  });
  sfx('shoot');
};

Bosses.updateProjectiles = function (dt) {
  var p = World.player;
  var es = World.entities;
  for (var i = 0; i < es.length; i++) {
    var e = es[i];
    if (e.dead) continue;

    if (e.kind === 'fruit') {
      e.x += e.vx * dt; e.y += e.vy * dt;
      e.z += e.vz * dt; e.vz -= 2.2 * dt;
      e.life -= dt;
      var hitBoss = false;
      if (e.target && !e.target.dead) {
        var bd = Math.hypot(e.x - e.target.x, e.y - e.target.y);
        var closing = ((e.x - e.target.x) * e.vx + (e.y - e.target.y) * e.vy) < 0;
        if (bd < 0.8 && closing) {
          if (e.target === World.chef) Bosses.chefHit();
          else if (e.target === World.robo) Bosses.roboHit();
          hitBoss = true;
        }
      }
      if (hitBoss || e.life <= 0 || e.z <= openFloorAt(e.x, e.y) - 0.05) {
        e.dead = true;
        Bosses.splat(e.x, e.y, Math.max(0, e.z), e.splat, hitBoss);
      }
      continue;
    }

    if (e.kind === 'meatloaf') {
      e.x += e.vx * dt; e.y += e.vy * dt;
      e.life -= dt;
      var md = Math.hypot(e.x - p.x, e.y - p.y);
      if (md < CONFIG.chefBarry.meatloafRadius && p.z < 0.5 && p.spin <= 0) {
        Player.knock(e.x - e.vx, e.y - e.vy, 0.9);
        Bosses.splat(p.x, p.y, 0.2, 'cream', true);
        e.dead = true;
      } else if (e.life <= 0 || blockedAt(e.x, e.y, 0.2, false)) {
        e.dead = true;
        Bosses.splat(e.x, e.y, 0.15, 'cream', false);
      }
      continue;
    }

    if (e.kind === 'pie') {
      e.t += dt;
      var k = e.t / e.air;
      e.x = e.x0 + (e.x1 - e.x0) * k;
      e.y = e.y0 + (e.y1 - e.y0) * k;
      e.z = 0.3 + Math.sin(k * Math.PI) * 2.2;
      e.life -= dt;
      if (k >= 1) {
        e.dead = true;
        var pd = Math.hypot(e.x - p.x, e.y - p.y);
        if (pd < CONFIG.chefBarry.pieRadius && p.z < 0.6 && p.spin <= 0) {
          Player.knock(e.x, e.y, 1.1);
          Game.toast('SPLAT!');
        }
        Bosses.splat(e.x, e.y, 0.15, 'cream', true);
        sfx('splat');
      }
      continue;
    }

    if (e.kind === 'tennis') {
      e.x += e.vx * dt; e.y += e.vy * dt;
      e.life -= dt;
      var td = Math.hypot(e.x - p.x, e.y - p.y);
      if (td < 0.5 && Math.abs(e.z - p.z - 0.4) < 0.9 && p.spin <= 0) {
        Player.knock(e.x - e.vx * 0.1, e.y - e.vy * 0.1, 0.9);
        e.dead = true;
      } else if (e.life <= 0 || blockedAt(e.x, e.y, e.z, true)) {
        e.dead = true;
      }
      continue;
    }

    if (e.kind === 'ring') {
      if (e.startDelay > 0) { e.startDelay -= dt; continue; }
      e.r += e.speed * dt;
      e.scale = e.r * 1.5;   // the decal grows with the ring
      if (e.r > CONFIG.roboBarry.shockwaveMaxR) { e.dead = true; continue; }
      var rd = Math.hypot(p.x - e.x, p.y - e.y);
      if (Math.abs(rd - e.r) < 0.55 && p.z <= CONFIG.roboBarry.shockHurtH && p.spin <= 0 && !e.hit) {
        e.hit = true;   // one bonk per ring
        Player.knock(e.x, e.y, 1.15);
        Game.toast('JUMP the rings!');
      }
      continue;
    }

    if (e.kind === 'fx') {
      e.t -= dt;
      e.alpha = Math.max(0, Math.min(1, e.t * 2.2));
      e.scale = e.scale0 * (1 + (e.grow || 0) * (1 - e.t / e.t0));
      if (e.t <= 0) e.dead = true;
      continue;
    }

    if (e.kind === 'marker') {
      e.t -= dt;
      if (e.t <= 0) e.dead = true;
      continue;
    }
  }
  // prune
  for (i = es.length - 1; i >= 0; i--) if (es[i].dead) es.splice(i, 1);
};

Bosses.splat = function (x, y, z, kind, hit) {
  var colors = { apple: 'red', banana: 'yellow', melon: 'green', cream: 'cream' };
  World.entities.push({
    kind: 'fx', x: x, y: y, z: z,
    sprite: 'splat_' + (colors[kind] || 'red'),
    scale0: 0.55, scale: 0.55, grow: 0.5, t: 0.55, t0: 0.55, alpha: 1
  });
  sfx(hit ? 'bosshit' : 'splat', hit ? 0.12 : 0.09);
};

// ---------- Chef Barry ----------

Bosses.startChef = function (x, y, facing) {
  World.chef = {
    x: x, y: y, z: 0, visible: true,
    hp: CONFIG.chefBarry.hp, phase: 1,
    state: 'intro', t: 1.6, throwT: 2, windup: 0,
    flash: 0, say: { text: '', t: 0 }, hoyT: 2,
    dir: facing || 0, frame: 'idle0', dizzy: 0, animT: 0,
    tag: 'CHEF BARRY', defeated: false
  };
};

Bosses.chefHit = function () {
  var c = World.chef;
  if (!c || c.state === 'defeated' || c.state === 'intro') return;
  c.hp--;
  c.flash = 0.18;
  c.say = { text: 'HOY!', t: 0.7 };
  sfx('hoy', 0.14);
  Game.stats.splats++;
  UI.bossBar('CHEF BARRY', c.hp, CONFIG.chefBarry.hp);
  if (c.hp <= 0) {
    c.state = 'defeated'; c.defeated = true; c.frame = 'dizzy'; c.dizzy = 999;
    c.say = { text: 'yum…', t: 2 };
    UI.bossBar(null);
    sfx('yum'); sfx('fanfare');
    Game.toast('Chef Barry is all fruited!');
    Bosses.onChefDefeated();
    return;
  }
  if (c.hp % CONFIG.chefBarry.hitsPerPhase === 0) {
    c.phase++;
    c.state = 'phase';
    c.t = 1.3;
    sfx('whistle');
    c.say = { text: 'HOY HOY!!', t: 1.2 };
  }
};

Bosses.updateChef = function (dt, now) {
  var c = World.chef;
  if (!c || !c.visible) return;
  var p = World.player;
  if (c.flash > 0) c.flash -= dt;
  if (c.say.t > 0) c.say.t -= dt;

  // Chef Barry is still Barry: HOY on schedule
  c.hoyT -= dt;
  if (c.hoyT <= 0 && c.state !== 'defeated') {
    c.hoyT = CONFIG.barry.hoyEveryMin + Math.random() * 1.6;
    c.say = { text: 'HOY!', t: 0.9 };
    sfx('hoy', 0.13);
  }
  c.dir = Math.atan2(p.y - c.y, p.x - c.x);

  if (c.state === 'intro') {
    c.t -= dt;
    c.frame = 'idle0';
    if (c.t <= 0) {
      c.state = 'fight';
      UI.bossBar('CHEF BARRY', c.hp, CONFIG.chefBarry.hp);
    }
    return;
  }
  if (c.state === 'phase') {
    c.t -= dt;
    c.frame = (now * 3 % 2 < 1) ? 'idle0' : 'idle1';   // re-arranges his hat
    if (c.t <= 0) c.state = 'fight';
    return;
  }
  if (c.state === 'fight') {
    c.throwT -= dt;
    if (c.throwT < 0.42) c.frame = 'throw';            // windup: arm up
    else c.frame = (now * 1.5 % 2 < 1) ? 'idle0' : 'idle1';
    if (c.throwT <= 0) {
      c.throwT = CONFIG.chefBarry.throwEvery[Math.min(c.phase, 3) - 1];
      var roll = Math.random();
      if (roll < 0.55) {
        // meatloaf skidding along the floor toward you
        var dx = p.x - c.x, dy = p.y - c.y;
        var d = Math.hypot(dx, dy) || 1;
        World.entities.push({
          kind: 'meatloaf', x: c.x + dx / d * 0.8, y: c.y + dy / d * 0.8, z: 0.12,
          vx: dx / d * CONFIG.chefBarry.meatloafSpeed, vy: dy / d * CONFIG.chefBarry.meatloafSpeed,
          sprite: 'meatloaf', scale: 0.34, life: 4
        });
        sfx('slide');
      } else {
        // pie lobbed at where you are standing (marker shows the landing spot)
        var air = CONFIG.chefBarry.pieAirtime;
        World.entities.push({
          kind: 'marker', x: p.x, y: p.y, z: 0, flat: 'marker', sprite: 'pie', scale: 1.5, t: air
        });
        World.entities.push({
          kind: 'pie', x0: c.x, y0: c.y, x1: p.x, y1: p.y,
          x: c.x, y: c.y, z: 0.4, t: 0, air: air,
          sprite: 'pie', scale: 0.4, spin: true
        });
        sfx('wobble');
      }
    }
  }
};

Bosses.addChefSprites = function (add, now) {
  var c = World.chef;
  add(c.x, c.y, 'chef_' + c.frame, 0.86, {
    z: c.z, tall: 1.5, ent: c, flash: c.flash > 0 ? 1 : 0
  });
};

// ---------- Ultra Super Robo Barry ----------

Bosses.startRobo = function (x, y) {
  World.robo = {
    x: x, y: y, z: 0, visible: true,
    hp: CONFIG.roboBarry.hp, phase: 1,
    state: 'intro', t: 2.4,
    cycleT: 2.2, mode: 'walk',
    backFacing: false, targetLit: 0, litPhaseSpot: [1.15, 1.15, 2.9], // chest, back, dome heights
    flash: 0, tilt: 0, say: { text: '', t: 0 }, hoyT: 1.5,
    tag: 'ROBO BARRY', defeated: false, defeatedT: 0, shakeT: 0
  };
};

Bosses.roboHit = function () {
  var r = World.robo;
  if (!r || r.defeated || r.targetLit <= 0) return;   // only counts when the target glows
  r.hp--;
  r.flash = 0.2;
  r.say = { text: 'HOY!', t: 0.8 };
  sfx('hoy', 0.15);
  Game.stats.splats++;
  UI.bossBar('ULTRA SUPER ROBO BARRY', r.hp, CONFIG.roboBarry.hp);
  if (r.hp <= 0) {
    r.defeated = true; r.state = 'defeated'; r.defeatedT = 0;
    UI.bossBar(null);
    Game.toast('The robot tips over!');
    sfx('stomp'); sfx('fanfare');
    return;
  }
  if (r.hp % CONFIG.roboBarry.hitsPerPhase === 0) {
    r.phase++;
    r.cycleT = Math.max(1.1, r.cycleT - 0.45);
    r.say = { text: 'HOY HOY HOY!!', t: 1.4 };
    sfx('whistle');
    Game.toast('The robot is getting angrier!');
  }
};

Bosses.updateRobo = function (dt, now) {
  var r = World.robo;
  if (!r || !r.visible) return;
  var p = World.player;
  var C = CONFIG.roboBarry;
  if (r.flash > 0) r.flash -= dt;
  if (r.say.t > 0) r.say.t -= dt;

  r.hoyT -= dt;
  if (r.hoyT <= 0 && !r.defeated) {
    r.hoyT = CONFIG.barry.hoyEveryMin + Math.random() * 1.8;
    r.say = { text: 'HOY!', t: 0.9 };
    sfx('hoy', 0.12);
  }

  if (r.state === 'defeated') {
    r.defeatedT += dt;
    r.tilt = Math.min(1.15, r.tilt + dt * 0.5);
    if (r.defeatedT > 1 && !r.popped) {
      r.popped = true;
      World.props.push({ x: r.x, y: r.y + 1.2, z: 0, sprite: 'barry_dizzy', scale: 0.7, tall: 1.5 });
      Game.toast('Barry is all dizzy!');
      sfx('win');
    }
    if (r.defeatedT > 2.4 && !r.opened) {
      r.opened = true;
      Bosses.onRoboDefeated();
    }
    return;
  }

  if (r.state === 'intro') {
    r.t -= dt;
    if (r.t <= 0) {
      r.state = 'walk';
      UI.bossBar('ULTRA SUPER ROBO BARRY', r.hp, C.hp);
    }
    return;
  }

  var dx = p.x - r.x, dy = p.y - r.y;
  var dist = Math.hypot(dx, dy) || 1;

  if (r.targetLit > 0) {
    r.targetLit -= dt;
    if (r.targetLit <= 0 && r.phase === 2) r.backFacing = false;
  }

  if (r.state === 'walk') {
    r.backFacing = false;
    if (dist > 5.5) {
      r.x += dx / dist * C.walkSpeed * dt;
      r.y += dy / dist * C.walkSpeed * dt;
      if (Math.floor(now * 2) % 2 === 0 && !r.stepNoise) { r.stepNoise = true; sfx('stomp', 0.03); }
    } else r.stepNoise = false;
    r.cycleT -= dt;
    if (r.cycleT <= 0) {
      if (Math.random() < 0.6 || p.z < 0.15) {
        r.state = 'telegraph';
        r.t = C.stompTelegraph;
        r.say = { text: 'HOY…!', t: 0.8 };
      } else {
        r.state = 'volley';
        r.t = 0.5;
        r.thrown = 0;
      }
    }
    return;
  }

  if (r.state === 'telegraph') {
    r.t -= dt;
    if (r.t <= 0) {
      r.state = 'walk';
      r.cycleT = Math.max(1.2, 2.4 - r.phase * 0.4);
      sfx('stomp', 0.2);
      Game.shake(0.5);
      for (var i = 0; i < 2; i++) {
        World.entities.push({
          kind: 'ring', x: r.x, y: r.y, z: 0, r: 0.6 + i * 0.05,
          speed: C.shockwaveSpeed, flat: 'shock', sprite: 'ring', scale: 1,
          startDelay: i * 0.5
        });
      }
      // the weak spot lights up after every stomp
      r.targetLit = C.targetLitTime;
      if (r.phase === 2) r.backFacing = true;   // he taunts with his back
    }
    return;
  }

  if (r.state === 'volley') {
    r.t -= dt;
    if (r.t <= 0) {
      r.thrown = (r.thrown || 0) + 1;
      var spread = (r.thrown - 2) * 0.25;
      var a = Math.atan2(dy, dx) + spread;
      World.entities.push({
        kind: 'tennis', x: r.x + Math.cos(a) * 1.2, y: r.y + Math.sin(a) * 1.2, z: 1.1,
        vx: Math.cos(a) * C.volleySpeed, vy: Math.sin(a) * C.volleySpeed,
        sprite: 'tennis', scale: 0.4, spin: true, life: 4
      });
      sfx('tennis');
      if (r.thrown >= CONFIG.roboBarry.volleyCount) {
        r.state = 'walk';
        r.cycleT = Math.max(1.2, 2.4 - r.phase * 0.4);
        r.targetLit = Math.max(r.targetLit, 2.2);   // also lights up after a volley
      } else {
        r.t = 0.28;
      }
    }
    return;
  }

  // bump: don't let the player stand inside the robot
  if (dist < 1.7) {
    Player.knock(r.x, r.y, 0.8);
  }
};

Bosses.addRoboSprites = function (add, now) {
  var r = World.robo;
  var shake = r.state === 'telegraph' ? Math.sin(now * 30) * 0.06 : 0;
  var rise = r.state === 'telegraph' ? 0.25 : 0;
  add(r.x + shake, r.y, r.backFacing ? 'robo_back' : 'robo_front', 1.35, {
    z: r.z + rise, tall: 2.5, ent: r, flash: r.flash > 0 ? 1 : 0
  });
  // the glowing weak spot
  if (r.targetLit > 0 && !r.defeated) {
    var h = r.phase === 1 ? 1.15 : (r.phase === 2 ? 1.15 : 2.55);
    var off = r.phase === 2 ? -0.45 : 0.45;
    var p = World.player;
    var ang = Math.atan2(r.y - p.y, r.x - p.x);
    add(r.x + Math.cos(ang) * off, r.y + Math.sin(ang) * off, 'targetglow', 0.5, {
      z: h, alpha: 0.85 + 0.15 * Math.sin(now * 10), spin: false
    });
  }
  if (r.defeated) {
    // sparks + confetti while tipped
    if (Math.random() < 0.15) {
      World.entities.push({
        kind: 'fx', x: r.x + (Math.random() - 0.5), y: r.y + (Math.random() - 0.5),
        z: 0.3 + Math.random() * 1.5, sprite: 'targetglow', scale0: 0.2, scale: 0.2,
        t: 0.4, t0: 0.4, alpha: 1
      });
    }
  }
};

Bosses.update = function (dt, now) {
  Bosses.updateChef(dt, now);
  Bosses.updateRobo(dt, now);
  Bosses.updateProjectiles(dt);

  // aim state for the crosshair
  var t = null;
  var p = World.player;
  if (p && p.hasBazooka) {
    var a = Bosses.aimAt();
    t = !!(a && ((a.kind === 'robo' && World.robo.targetLit > 0) || a.kind === 'chef'));
  }
  Game.aimTarget = t;

  // shooting input
  if (Input.shootQueued) {
    Input.shootQueued = false;
    Bosses.shoot();
  } else if (Input.shootHeld && p && p.hasBazooka) {
    Bosses.shoot();
  }
};
