const Player = (() => {
  function update(dt) {
    const p = G.player;
    p.animT += dt;
    if (p.swingCd > 0) p.swingCd -= dt;
    if (p.swingT > 0) p.swingT -= dt;
    if (p.iframes > 0) p.iframes -= dt;

    let mx = 0, my = 0;
    if (Input.down('up')) my -= 1;
    if (Input.down('down')) my += 1;
    if (Input.down('left')) mx -= 1;
    if (Input.down('right')) mx += 1;
    p.moving = !!(mx || my);
    if (p.moving) {
      const l = Math.hypot(mx, my);
      mx /= l; my /= l;
      const spd = CFG.PLAYER.speed * (G.boots ? 1.15 : 1);
      p.x += mx * spd * dt;
      p.y += my * spd * dt;
    }
    const mouseRecent = performance.now() - Input.mouse.lastMoveT < 2500;
    if (mouseRecent) {
      const mw = Game.mouseWorld();
      p.face = Utils.ang(p.x, p.y, mw.x, mw.y);
    } else if (p.moving) {
      p.face = Math.atan2(my, mx);
    }

    p.x += p.kbx * dt;
    p.y += p.kby * dt;
    p.kbx *= Math.exp(-6 * dt);
    p.kby *= Math.exp(-6 * dt);

    const c = World.collide(p.x, p.y, p.r);
    p.x = c.x;
    p.y = c.y;

    if ((Input.down('attack') || Input.mouse.down) && p.swingCd <= 0) attackNow();

    if (p.poisonT > 0) {
      p.poisonT -= dt;
      p.poisonTick += dt;
      if (Math.random() < dt * 3) Effects.bubble(p.x, p.y - 22);
      if (p.poisonTick >= 0.9) {
        p.poisonTick = 0;
        if (p.hp > 1) {
          p.hp -= 0.5;
          Effects.text(p.x, p.y - 36, 'poison', '#8ee68e', 14);
        }
      }
    }

    if (p.hunger > (CFG.KID_MODE ? 30 : 60) && p.hp < p.maxHp) {
      p.regenT += dt;
      if (p.regenT >= CFG.HUNGER.regenEvery) {
        p.regenT = 0;
        p.hp = Math.min(p.maxHp, Math.floor(p.hp) + 1);
        Effects.heart(p.x, p.y - 30);
      }
    } else {
      p.regenT = 0;
    }

    for (const pk of G.pickups) {
      if (pk.held) continue;
      const d = Utils.dist(p.x, p.y, pk.x, pk.y);
      if (d < 120) {
        const a = Utils.ang(pk.x, pk.y, p.x, p.y);
        const sp = Utils.clamp((120 - d) * 6, 80, 420);
        pk.x += Math.cos(a) * sp * dt;
        pk.y += Math.sin(a) * sp * dt;
      }
      if (d < 28) {
        pk.dead = true;
        addInv(pk.kind, 1);
        Sfx.sfx(pk.kind === 'coin' ? 'coin' : pk.kind === 'gem' ? 'gem' : 'pickup');
        const em = { wood: '🪵', food: '🍒', coin: '🪙', gem: '💎', feather: '🪶', pelt: '🐾' }[pk.kind];
        Effects.text(p.x, p.y - 32, '+1 ' + em, '#ffffff', 15);
      }
    }

    p.trailT += dt;
    if (p.trailT > 0.06) {
      p.trailT = 0;
      p.trail.unshift({ x: p.x, y: p.y });
      if (p.trail.length > 260) p.trail.pop();
    }
  }

  function attackNow() {
    const p = G.player;
    const sharp = G.sharpAxe;
    const range = sharp ? CFG.PLAYER.swingRangeSharp : CFG.PLAYER.swingRange;
    const dmg = sharp ? CFG.PLAYER.dmgSharp : CFG.PLAYER.dmg;
    p.swingCd = sharp ? CFG.PLAYER.swingCdSharp : CFG.PLAYER.swingCd;
    p.swingT = 0.2;
    Sfx.sfx('swing');

    let bestTree = null, bd = 1e9;
    for (const t of G.trees) {
      if (t.dead || t.grow < 0.5) continue;
      const d = Utils.dist(p.x, p.y, t.x, t.y);
      if (d < 62 + 14 * t.s && Math.abs(Utils.angDiff(p.face, Utils.ang(p.x, p.y, t.x, t.y))) < 1.3 && d < bd) {
        bd = d;
        bestTree = t;
      }
    }
    if (bestTree) {
      const t = bestTree;
      t.hp--;
      t.hitT = 0.3;
      Effects.leaf(t.x, t.y - 30 * t.s);
      Sfx.sfx('chop');
      if (t.hp <= 0) {
        t.dead = true;
        t.regrowDay = G.day + CFG.TREE.regrowDays;
        Sfx.sfx('treeFall');
        Effects.poof(t.x, t.y - 20, '#a5d6a7', 10);
        World.dropPickup(t.x, t.y, 'wood', sharp ? CFG.TREE.woodSharp : CFG.TREE.wood);
        G.stats.chopped++;
      }
    }

    for (const m of G.monsters) {
      if (m.dead || m.fleeing || m.hidden) continue;
      const d = Utils.dist(p.x, p.y, m.x, m.y);
      if (d < m.r + range && Math.abs(Utils.angDiff(p.face, Utils.ang(p.x, p.y, m.x, m.y))) < CFG.PLAYER.swingArc) {
        Monsters.hurt(m, dmg, p.face);
      }
    }
    for (const c of G.cultists) {
      if (c.dead) continue;
      const d = Utils.dist(p.x, p.y, c.x, c.y);
      if (d < c.r + range && Math.abs(Utils.angDiff(p.face, Utils.ang(p.x, p.y, c.x, c.y))) < CFG.PLAYER.swingArc) {
        Cultists.hurt(c, dmg, p.face);
      }
    }
    for (const pr of G.projectiles) {
      if (pr.dead) continue;
      const d = Utils.dist(p.x, p.y, pr.x, pr.y);
      if (d < range + 12 && Math.abs(Utils.angDiff(p.face, Utils.ang(p.x, p.y, pr.x, pr.y))) < CFG.PLAYER.swingArc) {
        pr.dead = true;
        Effects.stars(pr.x, pr.y, 4);
        Sfx.sfx('parry');
        Effects.text(pr.x, pr.y - 10, 'PARRY!', '#b3e5fc', 14);
      }
    }
  }

  function hurt(n, sx, sy) {
    const p = G.player;
    if (p.iframes > 0 || G.over) return;
    p.hp -= n;
    p.iframes = CFG.PLAYER.iframes;
    Effects.shake(8);
    Sfx.sfx('hurt');
    Effects.hit(p.x, p.y);
    Effects.text(p.x, p.y - 40, 'Ouch!', '#ff8a80', 18);
    const a = Utils.ang(sx, sy, p.x, p.y);
    p.kbx += Math.cos(a) * 260;
    p.kby += Math.sin(a) * 260;
    if (p.hp <= 0) {
      p.hp = 0;
      if (CFG.KID_MODE) Game.faint('hurt');
      else Game.lose('hurt');
    }
  }

  function tryEat() {
    const p = G.player;
    if (G.inv.food <= 0) {
      UI.toast('No food! Pick berries 🍒 or trade 🪶');
      return;
    }
    G.inv.food--;
    const cooked = World.fireLit() && Utils.dist(p.x, p.y, CFG.CAMP.x, CFG.CAMP.y) < lightRadius();
    p.hunger = Math.min(CFG.HUNGER.max, p.hunger + (cooked ? CFG.HUNGER.foodCooked : CFG.HUNGER.food));
    Sfx.sfx('eat');
    Effects.heart(p.x, p.y - 26);
    Effects.text(p.x, p.y - 44, cooked ? 'Yum! Cooked! +' + CFG.HUNGER.foodCooked : '+' + CFG.HUNGER.food, '#ffcc80', 16);
  }

  function draw(ctx) {
    const p = G.player;
    ctx.save();
    if (p.iframes > 0 && Math.floor(p.animT * 16) % 2 === 0) ctx.globalAlpha = 0.4;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 14, 15, 6, 0, 0, TAU);
    ctx.fill();
    const step = Math.sin(p.animT * 12) * (p.moving ? 4 : 0);
    ctx.strokeStyle = '#31445c';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x - 6, p.y + 6); ctx.lineTo(p.x - 6 + step, p.y + 15);
    ctx.moveTo(p.x + 6, p.y + 6); ctx.lineTo(p.x + 6 - step, p.y + 15);
    ctx.stroke();
    ctx.fillStyle = '#2e86ab';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 15, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#1b5e7d';
    ctx.lineWidth = 3;
    ctx.stroke();
    if (p.poisonT > 0) {
      ctx.fillStyle = 'rgba(120,220,120,0.3)';
      ctx.beginPath();
      ctx.arc(p.x, p.y - 4, 20, 0, TAU);
      ctx.fill();
    }
    const sharp = G.sharpAxe;
    const prog = p.swingT > 0 ? 1 - p.swingT / 0.2 : 1;
    const a = p.face + (p.swingT > 0 ? Utils.lerp(-1.2, 0.7, prog) : 0.45);
    ctx.save();
    ctx.translate(p.x, p.y - 4);
    ctx.rotate(a);
    ctx.fillStyle = '#8a6a45';
    ctx.fillRect(6, -2.5, 22, 5);
    ctx.fillStyle = sharp ? '#cfd8dc' : '#9e9e9e';
    ctx.beginPath();
    ctx.moveTo(26, -10);
    ctx.lineTo(35, -2);
    ctx.lineTo(26, 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6d4c33';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.arc(p.x + 2, p.y - 14, 11, 0, TAU);
    ctx.fill();
    Utils.font(ctx, 22);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧒', p.x, p.y - 15);
    ctx.restore();
  }

  return { update, draw, hurt, tryEat, attackNow };
})();
