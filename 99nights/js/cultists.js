const CTYPES = {
  deer: { hp: 4, r: 15, robe: '#7a6242', trim: '#5d4a32', mask: 'deer', range: 300, cd: 1.7, bolt: 'bolt', spd: 95, loot: 'deer' },
  deerElite: { hp: 8, r: 17, robe: '#a03328', trim: '#7c2620', mask: 'deer', range: 330, cd: 1.05, bolt: 'bolt2', spd: 115, loot: 'elite' },
  cat: { hp: 4, r: 15, robe: '#262833', trim: '#171821', mask: 'cat', range: 46, spear: true, spd: 135, loot: 'cat' },
  owl: { hp: 3, r: 14, robe: '#c8c4b0', trim: '#a9a58f', mask: 'owl', range: 260, cd: 2.2, bolt: 'dart', spd: 105, loot: 'owlc' },
  batC: { hp: 3, r: 14, robe: '#6f4fa8', trim: '#583f88', mask: 'owl', range: 240, cd: 2.4, bolt: 'dart', spd: 115, loot: 'owlc' },
  ramC: { hp: 5, r: 16, robe: '#9a7550', trim: '#7d5f40', mask: 'cat', range: 50, spear: true, spd: 125, loot: 'owlc' },
};

const Projectiles = (() => {
  const PDEFS = {
    bolt: { spd: 260, dmg: 1, color: '#d9b98a', fire: 6 },
    bolt2: { spd: 280, dmg: 1, color: '#ff7043', fire: 9 },
    dart: { spd: 260, dmg: 1, color: '#f5f0e0', fire: 4 },
    spear: { spd: 200, dmg: 1, color: '#8bc34a', poison: 3, fire: 0 },
    spirit: { spd: 220, dmg: 1, color: '#b07ce0', fire: 0 },
  };

  function spawn(x, y, ang, kind, from) {
    const d = PDEFS[kind];
    G.projectiles.push({
      x, y, ang,
      vx: Math.cos(ang) * d.spd,
      vy: Math.sin(ang) * d.spd,
      kind, from,
      dmg: d.dmg, poison: d.poison || 0, fire: d.fire,
      color: d.color,
      t: 0, life: 2.8, dead: false,
    });
  }

  function update(dt) {
    const p = G.player;
    let doused = false;
    for (const pr of G.projectiles) {
      if (pr.dead) continue;
      pr.t += dt;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      if (pr.t > pr.life) { pr.dead = true; continue; }
      if (Utils.dist(pr.x, pr.y, p.x, p.y) < 15) {
        Player.hurt(pr.dmg, pr.x, pr.y);
        if (pr.poison) p.poisonT = Math.max(p.poisonT, pr.poison);
        pr.dead = true;
        Effects.hit(pr.x, pr.y);
        continue;
      }
      if (pr.from === 'cultist' && World.fireLit() && Utils.dist(pr.x, pr.y, CFG.CAMP.x, CFG.CAMP.y - 10) < 42) {
        G.fire.fuel = Math.max(0, G.fire.fuel - pr.fire);
        Effects.poof(pr.x, pr.y, '#adb5bd', 5);
        pr.dead = true;
        doused = true;
      }
    }
    if (doused && G.t - (G.lastDouseToast || -99) > 6) {
      G.lastDouseToast = G.t;
      UI.toast('The cultists are dousing your fire! 💧');
    }
    G.projectiles = G.projectiles.filter((pr) => !pr.dead);
  }

  function draw(ctx) {
    for (const pr of G.projectiles) {
      ctx.save();
      ctx.translate(pr.x, pr.y);
      ctx.rotate(pr.ang);
      if (pr.kind === 'spirit') {
        ctx.fillStyle = 'rgba(176,124,224,0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, TAU);
        ctx.fill();
        ctx.fillStyle = pr.color;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, TAU);
        ctx.fill();
      } else {
        ctx.strokeStyle = pr.color;
        ctx.lineWidth = pr.kind === 'spear' ? 5 : 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(8, 0);
        ctx.stroke();
        if (pr.kind === 'dart') {
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.moveTo(-8, 0); ctx.lineTo(-13, -3); ctx.lineTo(-13, 3);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  return { spawn, update, draw };
})();

const Cultists = (() => {
  function spawn(type, x, y, opts = {}) {
    const K = CTYPES[type];
    const c = Object.assign({
      type, k: K, x, y,
      hp: K.hp, maxHp: K.hp, r: K.r,
      mode: 'march', mt: 0, animT: Utils.rand(0, 9), hurtT: 0,
      kbx: 0, kby: 0, shootCd: Utils.rand(0.6, 1.6), throwCd: Utils.rand(2, 4),
      strafe: Utils.rand(0, TAU), targetFire: true, dead: false, provoked: false,
      dir: 1, touchCd: 0,
    }, opts);
    G.cultists.push(c);
    return c;
  }

  function dropLoot(c) {
    const L = c.k.loot;
    const drop = (kind, n) => World.dropPickup(c.x, c.y, kind, n);
    if (L === 'deer') {
      World.dropPickup(c.x, c.y, 'coin', Utils.randi(2, 3));
      if (Math.random() < 0.15) World.dropPickup(c.x, c.y, 'gem', 1);
    } else if (L === 'elite') {
      drop('coin', Utils.randi(5, 7));
      if (Math.random() < 0.4) drop('gem', 1);
    } else if (L === 'cat') {
      drop('coin', 2);
      if (Math.random() < 0.2) drop('gem', 1);
    } else {
      drop('coin', Utils.randi(1, 2));
      if (Math.random() < 0.1) drop('gem', 1);
    }
  }

  function hurt(c, dmg, ang) {
    if (c.dead) return;
    c.hp -= dmg;
    c.hurtT = 0.18;
    c.provoked = true;
    c.kbx += Math.cos(ang) * 250;
    c.kby += Math.sin(ang) * 250;
    Sfx.sfx('thwack');
    Effects.text(c.x, c.y - c.r - 8, '-' + dmg, '#ffd54f', 16);
    Effects.hit(c.x, c.y);
    if (c.hp <= 0) {
      c.dead = true;
      dropLoot(c);
      G.stats.defeated++;
      Effects.stars(c.x, c.y, 8);
      Effects.poof(c.x, c.y, '#c5b39a', 8);
      Sfx.sfx('poof');
    }
  }

  function moveC(c, tx, ty, spd, dt) {
    const a = Utils.ang(c.x, c.y, tx, ty);
    c.dir = Math.cos(a) >= 0 ? 1 : -1;
    let nx = c.x + Math.cos(a) * spd * dt;
    let ny = c.y + Math.sin(a) * spd * dt;
    const sr = safeRadius();
    if (sr > 0 && Utils.dist(nx, ny, CFG.CAMP.x, CFG.CAMP.y) < sr + c.r) {
      nx = c.x;
      ny = c.y;
    }
    const col = World.collide(nx, ny, c.r * 0.7);
    c.x = Utils.clamp(col.x, 40, CFG.W - 40);
    c.y = Utils.clamp(col.y, 40, CFG.H - 40);
  }

  function update(dt) {
    const p = G.player;
    for (const c of G.cultists) {
      if (c.dead) continue;
      c.animT += dt;
      c.mt += dt;
      if (c.hurtT > 0) c.hurtT -= dt;
      if (c.touchCd > 0) c.touchCd -= dt;
      c.x += c.kbx * dt;
      c.y += c.kby * dt;
      c.kbx *= Math.exp(-6 * dt);
      c.kby *= Math.exp(-6 * dt);
      const dp = Utils.dist(c.x, c.y, p.x, p.y);
      const dc = Utils.dist(c.x, c.y, CFG.CAMP.x, CFG.CAMP.y);
      const engagePlayer = dp < 460 || !c.targetFire || c.provoked;

      if (c.k.spear) {
        if (c.mode === 'wind') {
          if (c.mt > 0.35) {
            if (Utils.dist(c.x, c.y, p.x, p.y) < 82) {
              Player.hurt(1, c.x, c.y);
              p.poisonT = Math.max(p.poisonT, 3);
              Effects.text(p.x, p.y - 36, 'Poisoned!', '#8ee68e', 14);
            }
            c.mode = 'fight';
            c.mt = 0;
            c.shootCd = 2;
          }
          continue;
        }
        if (dp < 70 && c.shootCd <= 0) {
          c.mode = 'wind';
          c.mt = 0;
          continue;
        }
        if (dp > 150 && c.throwCd <= 0 && dp < 420) {
          c.throwCd = 5;
          Projectiles.spawn(c.x, c.y - 8, Utils.ang(c.x, c.y, p.x, p.y) + Utils.rand(-0.05, 0.05), 'spear', 'cultist');
          Sfx.sfx('shoot');
        } else {
          moveC(c, p.x, p.y, c.k.spd, dt);
        }
        c.shootCd -= dt;
        c.throwCd -= dt;
        if (dp < 30 && c.touchCd <= 0) {
          Player.hurt(1, c.x, c.y);
          c.touchCd = 1.2;
        }
        continue;
      }

      const tx = engagePlayer ? p.x : CFG.CAMP.x;
      const ty = engagePlayer ? p.y : CFG.CAMP.y;
      const dT = Utils.dist(c.x, c.y, tx, ty);
      if (!engagePlayer) {
        if (dc > 480) {
          moveC(c, CFG.CAMP.x, CFG.CAMP.y, c.k.spd, dt);
        } else {
          c.shootCd -= dt;
          if (c.shootCd <= 0) {
            c.shootCd = c.k.cd;
            Projectiles.spawn(c.x, c.y - 8, Utils.ang(c.x, c.y, CFG.CAMP.x, CFG.CAMP.y - 10) + Utils.rand(-0.06, 0.06), c.k.bolt, 'cultist');
            Sfx.sfx('shoot');
          }
        }
      } else {
        if (dp < 95) {
          const a = Utils.ang(p.x, p.y, c.x, c.y);
          moveC(c, c.x + Math.cos(a) * 60, c.y + Math.sin(a) * 60, c.k.spd * 0.9, dt);
        } else if (dp > c.k.range + 50) {
          moveC(c, p.x, p.y, c.k.spd, dt);
        } else {
          c.strafe += dt * 1.4;
          moveC(c, c.x + Math.cos(c.strafe) * 30, c.y + Math.sin(c.strafe) * 30, 40, dt);
        }
        c.shootCd -= dt;
        if (c.shootCd <= 0 && dp < c.k.range + 90) {
          c.shootCd = c.k.cd;
          Projectiles.spawn(c.x, c.y - 8, Utils.ang(c.x, c.y, p.x, p.y) + Utils.rand(-0.06, 0.06), c.k.bolt, 'cultist');
          Sfx.sfx('shoot');
        }
        if (dp < 30 && c.touchCd <= 0) {
          Player.hurt(1, c.x, c.y);
          c.touchCd = 1.2;
        }
      }
    }
    G.cultists = G.cultists.filter((c) => !c.dead);
  }

  function onNightfall() {
    const day = G.day;
    let waves = 0, size = 2;
    if (CFG.KID_MODE) {
      if (day >= 40) { waves = 2; size = 3; }
      else if (day >= 20) { waves = 2; size = 2; }
      else if (day >= 12) { waves = 1; size = 2; }
      else if (day >= 8) { waves = 1; size = 2; }
    } else if (day >= 40) { waves = 3; size = day > 60 ? 5 : 4; }
    else if (day >= 20) { waves = 2; size = 4; }
    else if (day >= 12) { waves = 2; size = 3; }
    else if (day >= 6) { waves = 1; size = 3; }
    else if (day >= 3) { waves = 1; size = 2; }
    G.raids.scheduled = [];
    for (let i = 0; i < waves; i++) {
      G.raids.scheduled.push({ at: Utils.rand(0.12, 0.85) * CFG.NIGHT_LEN, size, wave: i });
    }
  }

  function startRaid(size, wave) {
    const a = Utils.rand(0, TAU);
    const bx = Utils.clamp(CFG.CAMP.x + Math.cos(a) * 880, 100, CFG.W - 100);
    const by = Utils.clamp(CFG.CAMP.y + Math.sin(a) * 880, 100, CFG.H - 100);
    const biome = World.biomeAt(G.player.x, G.player.y);
    const extra = biome === 'jungle' ? 'cat' : biome === 'forest' ? 'owl' : biome === 'snow' ? 'ramC' : 'batC';
    for (let i = 0; i < size; i++) {
      let type = 'deer';
      if (i === 1 && Math.random() < 0.35) type = extra;
      if (i === 0 && wave > 0 && G.day >= 15) type = 'deerElite';
      spawn(type, bx + Utils.rand(-70, 70), by + Utils.rand(-70, 70), { targetFire: true });
    }
    UI.toast('Cultists are raiding your camp! 🕯️');
    Effects.ring(CFG.CAMP.x, CFG.CAMP.y, '#ffab91');
  }

  function director(dt) {
    if (G.phase !== 'night') return;
    for (let i = G.raids.scheduled.length - 1; i >= 0; i--) {
      const r = G.raids.scheduled[i];
      if (G.phaseT >= r.at) {
        G.raids.scheduled.splice(i, 1);
        startRaid(r.size, r.wave);
      }
    }
  }

  function dawnSweep() {
    for (const c of G.cultists) {
      c.dead = true;
      Effects.poof(c.x, c.y, '#c5b39a', 6);
    }
  }

  function drawCultist(ctx, c) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, c.r * 0.95, c.r * 0.8, c.r * 0.28, 0, 0, TAU);
    ctx.fill();
    const bob = Math.sin(c.animT * 8) * 2;
    ctx.translate(0, bob);
    ctx.fillStyle = c.k.robe;
    ctx.beginPath();
    ctx.moveTo(-c.r * 0.85, c.r);
    ctx.quadraticCurveTo(-c.r * 0.7, -c.r * 0.3, 0, -c.r * 0.55);
    ctx.quadraticCurveTo(c.r * 0.7, -c.r * 0.3, c.r * 0.85, c.r);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = c.k.trim;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = c.k.trim;
    ctx.beginPath();
    ctx.arc(0, -c.r * 0.45, c.r * 0.48, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#181820';
    ctx.beginPath();
    ctx.arc(0, -c.r * 0.42, c.r * 0.34, 0, TAU);
    ctx.fill();
    ctx.fillStyle = c.type === 'deerElite' ? '#ff5252' : '#ffe082';
    ctx.beginPath();
    ctx.arc(-c.r * 0.13, -c.r * 0.45, 1.8, 0, TAU);
    ctx.arc(c.r * 0.13, -c.r * 0.45, 1.8, 0, TAU);
    ctx.fill();
    if (c.k.mask === 'deer') {
      ctx.strokeStyle = '#d7ccc8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-c.r * 0.3, -c.r * 0.75); ctx.lineTo(-c.r * 0.42, -c.r * 1.25);
      ctx.moveTo(-c.r * 0.36, -c.r * 1.0); ctx.lineTo(-c.r * 0.6, -c.r * 1.15);
      ctx.moveTo(c.r * 0.3, -c.r * 0.75); ctx.lineTo(c.r * 0.42, -c.r * 1.25);
      ctx.moveTo(c.r * 0.36, -c.r * 1.0); ctx.lineTo(c.r * 0.6, -c.r * 1.15);
      ctx.stroke();
    } else if (c.k.mask === 'cat') {
      ctx.fillStyle = c.k.trim;
      ctx.beginPath();
      ctx.moveTo(-c.r * 0.38, -c.r * 0.7); ctx.lineTo(-c.r * 0.28, -c.r * 1.1); ctx.lineTo(-c.r * 0.1, -c.r * 0.78);
      ctx.moveTo(c.r * 0.38, -c.r * 0.7); ctx.lineTo(c.r * 0.28, -c.r * 1.1); ctx.lineTo(c.r * 0.1, -c.r * 0.78);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = '#efeadd';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -c.r * 0.5, c.r * 0.45, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
    }
    if (c.k.spear) {
      ctx.strokeStyle = '#9e7d4a';
      ctx.lineWidth = 3;
      const ext = c.mode === 'wind' ? 14 : 0;
      ctx.beginPath();
      ctx.moveTo(c.dir * (c.r * 0.5 - ext), 0);
      ctx.lineTo(c.dir * (c.r + 16 + ext * 2), -4);
      ctx.stroke();
      ctx.fillStyle = '#8bc34a';
      ctx.beginPath();
      ctx.arc(c.dir * (c.r + 16 + ext * 2), -4, 3.5, 0, TAU);
      ctx.fill();
    } else {
      ctx.save();
      ctx.translate(c.dir * c.r * 0.8, -2);
      ctx.strokeStyle = '#6d4c33';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-6, 0); ctx.lineTo(10, 0);
      ctx.moveTo(6, -6); ctx.lineTo(6, 6);
      ctx.stroke();
      ctx.strokeStyle = '#4e342e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, 0); ctx.lineTo(14, -4);
      ctx.stroke();
      ctx.restore();
    }
    if (c.hurtT > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 0, c.r * 0.9, c.r, 0, 0, TAU);
      ctx.fill();
    }
    if (c.hp < c.maxHp) {
      const w = c.r * 1.7;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-w / 2, -c.r - 20, w, 5);
      ctx.fillStyle = '#7ed37e';
      ctx.fillRect(-w / 2, -c.r - 20, w * Math.max(0, c.hp / c.maxHp), 5);
    }
    ctx.restore();
  }

  function draw(ctx) {
    for (const c of G.cultists) {
      if (c.dead) continue;
      if (c.x < G.cam.x - 100 || c.x > G.cam.x + Game.vw + 100 || c.y < G.cam.y - 100 || c.y > G.cam.y + Game.vh + 100) continue;
      drawCultist(ctx, c);
    }
  }

  return { spawn, update, draw, drawOne: drawCultist, hurt, onNightfall, director, dawnSweep };
})();
