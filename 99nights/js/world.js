const World = (() => {
  const TILE = 120;
  const BIOMES = {
    forest: { shades: ['#3a8547', '#43974f', '#357b41', '#46a054'], leaf: '#2e7d32' },
    snow: { shades: ['#d8e3ee', '#e6eff6', '#cfdcea', '#eaf2f8'], leaf: '#ffffff' },
    lava: { shades: ['#54261e', '#602e26', '#4e231c', '#66332a'], leaf: '#7a3324' },
    jungle: { shades: ['#2a923e', '#35aa49', '#268739', '#3bb54f'], leaf: '#1e7a34' },
  };

  function biomeAt(x, y) {
    const dx = x - CFG.CAMP.x, dy = y - CFG.CAMP.y;
    if (Math.hypot(dx, dy) < 720) return 'forest';
    if (dx < 0 && dy < 0) return 'snow';
    if (dx >= 0 && dy < 0) return 'lava';
    if (dx < 0 && dy >= 0) return 'jungle';
    return 'forest';
  }

  function tileBiome(ix, iy) {
    const wx = ix * TILE, wy = iy * TILE;
    const ox = (Utils.hash2(ix, iy) - 0.5) * 280;
    const oy = (Utils.hash2(iy + 7, ix + 3) - 0.5) * 280;
    return biomeAt(wx + ox, wy + oy);
  }

  function build() {
    G.trees = []; G.bushes = []; G.caves = []; G.pickups = [];
    G.monsters = []; G.cultists = []; G.projectiles = []; G.particles = []; G.texts = [];

    const caveDefs = [
      { x: 560, y: 560, biome: 'snow', kidId: 'koala', guards: CFG.KID_MODE ? ['wolf', 'wolf'] : ['wolf', 'wolf', 'wolf', 'wolf'] },
      { x: 3040, y: 560, biome: 'lava', kidId: 'dino', guards: CFG.KID_MODE ? ['bear'] : ['bear', 'bear'] },
      { x: 560, y: 3040, biome: 'jungle', kidId: 'kraken', guards: CFG.KID_MODE ? ['bear'] : ['bear', 'bear'] },
      { x: 3040, y: 3040, biome: 'forest', kidId: 'squid', guards: CFG.KID_MODE ? ['wolf', 'wolf'] : ['wolf', 'wolf', 'wolf'] },
    ];
    for (const cd of caveDefs) {
      const cave = { x: cd.x, y: cd.y, biome: cd.biome, kidId: cd.kidId, cage: { x: cd.x + 105, y: cd.y + 40 } };
      cave.guards = cd.guards.map((k, i) => {
        const a = (i / cd.guards.length) * TAU;
        return Monsters.spawn(k, cd.x + Math.cos(a) * 125, cd.y + Math.sin(a) * 125, { guard: cave, anchor: { x: cd.x, y: cd.y } });
      });
      G.caves.push(cave);
    }

    G.props.board = { x: CFG.CAMP.x, y: CFG.CAMP.y - 135 };
    G.props.tent = { x: CFG.CAMP.x - 155, y: CFG.CAMP.y + 25 };
    G.props.logs = [
      { x: CFG.CAMP.x - 70, y: CFG.CAMP.y + 72, a: 0.4 },
      { x: CFG.CAMP.x + 80, y: CFG.CAMP.y + 60, a: -0.5 },
      { x: CFG.CAMP.x + 5, y: CFG.CAMP.y + 98, a: 0.1 },
      { x: CFG.CAMP.x - 45, y: CFG.CAMP.y - 82, a: 1.2 },
    ];
    G.props.featherTrader = { x: 2330, y: 2080 };
    G.props.pond = { x: 980, y: 2620, rx: 155, ry: 100 };
    Monsters.spawn('frogK', G.props.pond.x + 70, G.props.pond.y - 50, { anchor: { x: G.props.pond.x, y: G.props.pond.y } });

    const blocked = (x, y) => {
      if (Utils.dist(x, y, CFG.CAMP.x, CFG.CAMP.y) < 215) return true;
      for (const c of G.caves) if (Utils.dist(x, y, c.x, c.y) < 195) return true;
      if (Utils.dist(x, y, G.props.pond.x, G.props.pond.y) < 210) return true;
      if (Utils.dist(x, y, G.props.featherTrader.x, G.props.featherTrader.y) < 115) return true;
      if (Utils.dist(x, y, G.props.board.x, G.props.board.y) < 65) return true;
      if (Utils.dist(x, y, G.props.tent.x, G.props.tent.y) < 115) return true;
      return false;
    };

    let tries = 0;
    while (G.trees.length < 520 && tries < 12000) {
      tries++;
      const x = Utils.rand(60, CFG.W - 60), y = Utils.rand(60, CFG.H - 60);
      if (blocked(x, y)) continue;
      let ok = true;
      for (const t of G.trees) if (Utils.dist(x, y, t.x, t.y) < 68) { ok = false; break; }
      if (!ok) continue;
      G.trees.push({ x, y, biome: biomeAt(x, y), hp: CFG.TREE.hp, maxHp: CFG.TREE.hp, s: Utils.rand(0.85, 1.3), dead: false, regrowDay: 0, grow: 1, hitT: 0 });
    }

    tries = 0;
    let placed = 0;
    while (placed < 120 && tries < 8000) {
      tries++;
      let x, y;
      if (placed < 14) {
        const a = Utils.rand(0, TAU), d = Utils.rand(300, 650);
        x = CFG.CAMP.x + Math.cos(a) * d;
        y = CFG.CAMP.y + Math.sin(a) * d;
      } else {
        x = Utils.rand(60, CFG.W - 60);
        y = Utils.rand(60, CFG.H - 60);
      }
      if (x < 60 || y < 60 || x > CFG.W - 60 || y > CFG.H - 60) continue;
      if (blocked(x, y)) continue;
      let ok = true;
      for (const t of G.trees) if (Utils.dist(x, y, t.x, t.y) < 55) { ok = false; break; }
      if (!ok) continue;
      G.bushes.push({ x, y, berries: 2, next: 0, s: Utils.rand(0.9, 1.2) });
      placed++;
    }

    for (const kid of G.kids) {
      const cave = G.caves.find((c) => c.kidId === kid.id);
      kid.x = cave.cage.x;
      kid.y = cave.cage.y;
    }
  }

  function fireMax() {
    return CFG.FIRE.baseMax + (G.fire.level - 1) * CFG.FIRE.maxPerLvl;
  }

  function fireLit() {
    return G.fire.fuel > 0;
  }

  function updateFire(dt) {
    const f = G.fire;
    const drain = G.phase === 'night' ? CFG.FIRE.drainNight : CFG.FIRE.drainDay;
    const wasLit = fireLit();
    f.fuel = Math.max(0, f.fuel - drain * dt);
    if (wasLit && !fireLit()) {
      UI.toast('The fire went out! Monsters get brave... 🌑');
      Effects.poof(CFG.CAMP.x, CFG.CAMP.y - 10, '#9e9e9e', 10);
    }
    if (fireLit()) {
      f.emberAcc += dt * (2 + f.level * 1.5);
      while (f.emberAcc > 1) {
        f.emberAcc -= 1;
        Effects.ember(CFG.CAMP.x, CFG.CAMP.y - 14);
      }
    }
  }

  function feedFire() {
    if (!G.inv.wood) {
      UI.toast('No wood! Chop trees 🪵 (SPACE or click)');
      return;
    }
    G.inv.wood--;
    G.fire.fuel = Math.min(fireMax(), G.fire.fuel + CFG.FIRE.feed);
    Sfx.sfx('fire');
    Effects.text(CFG.CAMP.x, CFG.CAMP.y - 50, '+fuel 🔥', '#ffcc80', 18);
  }

  function tryUpgradeFire() {
    const f = G.fire;
    if (f.level >= 6) {
      UI.toast('The fire is at MAX glory! 🔥👑');
      return;
    }
    const cost = CFG.FIRE.costs[f.level + 1];
    while (G.inv.coins < cost.c && G.inv.gems > 0) {
      G.inv.gems--;
      G.inv.coins += CFG.FIRE.gemValue;
    }
    if (G.inv.wood >= cost.w && G.inv.coins >= cost.c) {
      G.inv.wood -= cost.w;
      G.inv.coins -= cost.c;
      f.level++;
      f.fuel = fireMax();
      Sfx.sfx('upgrade');
      Effects.stars(CFG.CAMP.x, CFG.CAMP.y - 20, 16);
      Effects.ring(CFG.CAMP.x, CFG.CAMP.y, '#ffcc80');
      UI.banner('Campfire Level ' + f.level + '! 🔥', f.level === 6 ? 'MAX GLORY — golden glow!' : 'Bigger light, bigger safe zone!');
    } else {
      const needW = Math.max(0, cost.w - G.inv.wood);
      const needC = Math.max(0, cost.c - G.inv.coins);
      UI.toast(`Need ${needW ? needW + ' more wood 🪵 ' : ''}${needC ? needC + ' more coins 🪙' : ''}`);
    }
  }

  function dropPickup(x, y, kind, n) {
    for (let i = 0; i < n; i++) {
      if (G.pickups.length > 120) G.pickups.shift();
      G.pickups.push({ x, y, vx: Utils.rand(-70, 70), vy: Utils.rand(-70, 70), kind, t: 0, bob: Utils.rand(0, 9), held: false, holder: null, dead: false });
    }
  }

  function update(dt) {
    for (const t of G.trees) {
      if (t.hitT > 0) t.hitT -= dt;
      if (!t.dead && t.grow < 1) t.grow = Math.min(1, t.grow + dt / 22);
    }
    for (const b of G.bushes) {
      if (b.berries < 2 && G.t > b.next) {
        b.berries++;
        b.next = G.t + (CFG.KID_MODE ? 40 : 75);
      }
    }
    for (const p of G.pickups) {
      p.t += dt;
      if (!p.held) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= Math.exp(-4 * dt);
        p.vy *= Math.exp(-4 * dt);
      }
    }
    G.pickups = G.pickups.filter((p) => !p.dead && p.t < 90);
  }

  function onNewDay() {
    for (const t of G.trees) {
      if (t.dead && G.day >= t.regrowDay) {
        t.dead = false;
        t.hp = t.maxHp;
        t.grow = 0.05;
      }
    }
  }

  function collide(px, py, r) {
    let x = px, y = py;
    const push = (ox, oy, orr) => {
      const d = Utils.dist(x, y, ox, oy);
      if (d < orr + r && d > 0.01) {
        const a = Utils.ang(ox, oy, x, y);
        x = ox + Math.cos(a) * (orr + r);
        y = oy + Math.sin(a) * (orr + r);
      }
    };
    for (const t of G.trees) {
      if (t.dead || t.grow < 0.3) continue;
      push(t.x, t.y - 4, 13 * t.s);
    }
    for (const c of G.caves) push(c.x, c.y, 56);
    push(G.props.board.x, G.props.board.y, 15);
    push(G.props.tent.x, G.props.tent.y, 58);
    push(G.props.featherTrader.x, G.props.featherTrader.y, 26);
    push(CFG.CAMP.x, CFG.CAMP.y, 24);
    x = Utils.clamp(x, 30, CFG.W - 30);
    y = Utils.clamp(y, 30, CFG.H - 30);
    return { x, y };
  }

  function vis(x, y, m) {
    const c = G.cam;
    return x > c.x - m && x < c.x + Game.vw + m && y > c.y - m && y < c.y + Game.vh + m;
  }

  function drawGround(ctx) {
    const c = G.cam;
    const x0 = Math.max(0, Math.floor(c.x / TILE) - 1);
    const y0 = Math.max(0, Math.floor(c.y / TILE) - 1);
    const x1 = Math.min(CFG.W / TILE, Math.ceil((c.x + Game.vw) / TILE) + 1);
    const y1 = Math.min(CFG.H / TILE, Math.ceil((c.y + Game.vh) / TILE) + 1);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iy = y0; iy <= y1; iy++) {
        const b = tileBiome(ix, iy);
        const h = Utils.hash2(ix, iy);
        ctx.fillStyle = BIOMES[b].shades[(h * 4) | 0];
        ctx.fillRect(ix * TILE, iy * TILE, TILE + 1, TILE + 1);
        decor(ctx, ix, iy, b);
      }
    }
    const g = ctx.createRadialGradient(CFG.CAMP.x, CFG.CAMP.y, 30, CFG.CAMP.x, CFG.CAMP.y, 190);
    g.addColorStop(0, '#a97c50');
    g.addColorStop(1, 'rgba(169,124,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(CFG.CAMP.x, CFG.CAMP.y, 190, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#8d8d8d';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      ctx.beginPath();
      ctx.arc(CFG.CAMP.x + Math.cos(a) * 46, CFG.CAMP.y + Math.sin(a) * 46, 5, 0, TAU);
      ctx.fill();
    }
  }

  function decor(ctx, ix, iy, b) {
    for (let k = 0; k < 2; k++) {
      const h1 = Utils.hash2(ix * 3 + k, iy * 5 + k);
      const h2 = Utils.hash2(ix * 7 + k * 2, iy * 11 + k);
      const r = Utils.hash2(ix + k * 13, iy + k * 17);
      const x = ix * TILE + h1 * TILE;
      const y = iy * TILE + h2 * TILE;
      if (b === 'forest') {
        if (r < 0.3) {
          ctx.strokeStyle = '#2e6e3a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y); ctx.lineTo(x - 3, y - 7);
          ctx.moveTo(x, y); ctx.lineTo(x, y - 9);
          ctx.moveTo(x, y); ctx.lineTo(x + 3, y - 7);
          ctx.stroke();
        } else if (r < 0.42) {
          ctx.fillStyle = r < 0.36 ? '#f8bbd0' : '#fff9c4';
          ctx.beginPath();
          ctx.arc(x, y, 3.5, 0, TAU);
          ctx.fill();
        }
      } else if (b === 'snow') {
        if (r < 0.3) {
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.beginPath();
          ctx.arc(x, y, 2.2, 0, TAU);
          ctx.fill();
        } else if (r < 0.4) {
          ctx.fillStyle = '#b7c4d2';
          ctx.beginPath();
          ctx.ellipse(x, y, 6, 4, h1 * 3, 0, TAU);
          ctx.fill();
        }
      } else if (b === 'lava') {
        if (r < 0.22) {
          ctx.strokeStyle = '#2e0f0a';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 18 * (h1 - 0.5), y + 14 * (h2 - 0.5));
          ctx.stroke();
        } else if (r < 0.32) {
          ctx.fillStyle = 'rgba(255,112,67,0.5)';
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, TAU);
          ctx.fill();
        }
      } else {
        if (r < 0.28) {
          ctx.fillStyle = '#1e7a34';
          for (let j = -1; j <= 1; j++) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(j * 0.5);
            ctx.beginPath();
            ctx.ellipse(0, -6, 3, 8, 0, 0, TAU);
            ctx.fill();
            ctx.restore();
          }
        } else if (r < 0.38) {
          ctx.fillStyle = '#57c769';
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(h1 * 3);
          ctx.beginPath();
          ctx.ellipse(0, 0, 9, 4, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }

  function drawTree(ctx, t) {
    if (!vis(t.x, t.y, 100)) return;
    const wob = t.hitT > 0 ? Math.sin(t.hitT * 50) * 3 : 0;
    const x = t.x + wob, y = t.y;
    if (t.dead) {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(x, y + 2, 14 * t.s, 5 * t.s, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#8a6a45';
      ctx.beginPath();
      ctx.ellipse(x, y, 11 * t.s, 8 * t.s, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#6d5236';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, 6 * t.s, 4 * t.s, 0, 0, TAU);
      ctx.stroke();
      return;
    }
    const s = t.s * (0.3 + 0.7 * t.grow);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(x, y + 3, 22 * s, 8 * s, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#7a5a3a';
    ctx.fillRect(x - 4 * s, y - 16 * s, 8 * s, 18 * s);
    if (t.biome === 'snow') {
      for (let i = 0; i < 3; i++) {
        const w = 32 * s * (1 - i * 0.26);
        const yy = y - 12 * s - i * 17 * s;
        ctx.fillStyle = ['#2e5e46', '#356b4f', '#3d7a58'][i];
        ctx.beginPath();
        ctx.moveTo(x - w, yy);
        ctx.lineTo(x + w, yy);
        ctx.lineTo(x, yy - 24 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#eef4fa';
        ctx.beginPath();
        ctx.moveTo(x - w * 0.55, yy - 12 * s);
        ctx.lineTo(x + w * 0.55, yy - 12 * s);
        ctx.lineTo(x, yy - 22 * s);
        ctx.closePath();
        ctx.fill();
      }
    } else if (t.biome === 'lava') {
      ctx.strokeStyle = '#3a2318';
      ctx.lineWidth = 5 * s;
      ctx.beginPath();
      ctx.moveTo(x, y - 12 * s); ctx.lineTo(x - 12 * s, y - 34 * s);
      ctx.moveTo(x, y - 16 * s); ctx.lineTo(x + 12 * s, y - 38 * s);
      ctx.moveTo(x, y - 14 * s); ctx.lineTo(x, y - 44 * s);
      ctx.stroke();
      ctx.fillStyle = '#ff7043';
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x + Math.cos(i * 2.1 + t.x) * 10 * s, y - 30 * s - i * 8 * s, 3 * s, 0, TAU);
        ctx.fill();
      }
    } else if (t.biome === 'jungle') {
      ctx.fillStyle = '#1e7a34';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        ctx.save();
        ctx.translate(x, y - 34 * s);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(0, -12 * s, 7 * s, 16 * s, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#57c769';
      ctx.beginPath();
      ctx.arc(x, y - 34 * s, 7 * s, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = '#2e7d32';
      ctx.beginPath();
      ctx.arc(x - 12 * s, y - 26 * s, 14 * s, 0, TAU);
      ctx.arc(x + 12 * s, y - 26 * s, 14 * s, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#43a047';
      ctx.beginPath();
      ctx.arc(x, y - 36 * s, 16 * s, 0, TAU);
      ctx.fill();
    }
    if (t.hp < t.maxHp) {
      ctx.strokeStyle = '#4e342e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 3 * s, y - 14 * s);
      ctx.lineTo(x + 2 * s, y - 8 * s);
      ctx.stroke();
    }
  }

  function drawBush(ctx, b) {
    if (!vis(b.x, b.y, 60)) return;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y + 6, 18 * b.s, 6 * b.s, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.arc(b.x - 9 * b.s, b.y, 11 * b.s, 0, TAU);
    ctx.arc(b.x + 9 * b.s, b.y, 11 * b.s, 0, TAU);
    ctx.arc(b.x, b.y - 6 * b.s, 12 * b.s, 0, TAU);
    ctx.fill();
    for (let i = 0; i < b.berries; i++) {
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.arc(b.x + (i - 0.5) * 12 * b.s, b.y - 8 * b.s + (i % 2) * 7, 4 * b.s, 0, TAU);
      ctx.fill();
    }
  }

  function drawCave(ctx, c) {
    if (!vis(c.x, c.y, 220)) return;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + 34, 70, 22, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#7d848c';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 58, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#697077';
    ctx.beginPath();
    ctx.arc(c.x - 30, c.y + 6, 18, 0, TAU);
    ctx.arc(c.x + 32, c.y + 8, 15, 0, TAU);
    ctx.arc(c.x, c.y - 44, 14, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1a1d24';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + 8, 26, 22, 0, 0, TAU);
    ctx.fill();
    const kid = G.kids.find((k) => k.id === c.kidId);
    ctx.save();
    ctx.translate(c.x - 40, c.y - 58);
    ctx.rotate(-0.1);
    drawSign(ctx, kid && kid.rescued ? '' : '?', 22);
    ctx.restore();
    drawCage(ctx, c, false);
  }

  function drawSign(ctx, txt, s) {
    ctx.fillStyle = '#8a6a45';
    ctx.fillRect(-3, 0, 6, 18);
    ctx.fillStyle = '#a98a63';
    ctx.beginPath();
    ctx.roundRect(-s, -14, s * 2, 16, 4);
    ctx.fill();
    ctx.strokeStyle = '#6d5236';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (txt) {
      Utils.font(ctx, 16);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#4e342e';
      ctx.fillText(txt, 0, -6);
    }
  }

  function drawCage(ctx, c, front) {
    const cx = c.cage.x, cy = c.cage.y;
    if (!vis(cx, cy, 90)) return;
    const kid = G.kids.find((k) => k.id === c.kidId);
    ctx.save();
    ctx.translate(cx, cy);
    if (kid && kid.rescued) ctx.rotate(0.12);
    ctx.fillStyle = '#6d4c33';
    ctx.beginPath();
    ctx.roundRect(-30, -14, 60, 6, 3);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-30, 26, 60, 6, 3);
    ctx.fill();
    ctx.fillRect(-30, -14, 6, 46);
    ctx.fillRect(24, -14, 6, 46);
    if (front) {
      ctx.fillStyle = 'rgba(109,76,51,0.85)';
      for (let i = -1; i <= 1; i++) ctx.fillRect(i * 12 - 2, -14, 4, 46);
    }
    ctx.restore();
  }

  function drawBoard(ctx) {
    const b = G.props.board;
    if (!vis(b.x, b.y, 120)) return;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y + 30, 34, 9, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#6d4c33';
    ctx.fillRect(b.x - 5, b.y, 10, 30);
    ctx.fillStyle = '#a98a63';
    ctx.beginPath();
    ctx.roundRect(b.x - 62, b.y - 92, 124, 96, 8);
    ctx.fill();
    ctx.strokeStyle = '#6d4c33';
    ctx.lineWidth = 3;
    ctx.stroke();
    Utils.font(ctx, 15);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#4e342e';
    ctx.fillText('LOST KIDS', b.x, b.y - 76);
    const p = G.player;
    G.kids.forEach((kid, i) => {
      const yy = b.y - 55 + i * 20;
      Utils.font(ctx, 13);
      ctx.textAlign = 'left';
      ctx.fillText(kid.emoji, b.x - 52, yy);
      if (kid.rescued) {
        ctx.fillStyle = '#2e7d32';
        Utils.font(ctx, 14);
        ctx.fillText('✓ SAFE', b.x - 30, yy);
      } else {
        const cave = G.caves.find((cv) => cv.kidId === kid.id);
        const a = Utils.ang(b.x, b.y, cave.x, cave.y) + Math.PI / 2;
        ctx.save();
        ctx.translate(b.x + 44, yy);
        ctx.rotate(a);
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(-6, 6);
        ctx.lineTo(6, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#4e342e';
        Utils.font(ctx, 11);
        ctx.textAlign = 'right';
        ctx.fillText(Utils.meters(Utils.dist(p.x, p.y, cave.x, cave.y)) + 'm', b.x + 56, yy);
      }
    });
  }

  function drawFire(ctx) {
    const x = CFG.CAMP.x, y = CFG.CAMP.y;
    if (!vis(x, y, 200)) return;
    const f = G.fire;
    ctx.fillStyle = '#5d4027';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.5);
    ctx.fillRect(-20, -4, 40, 8);
    ctx.rotate(-1);
    ctx.fillRect(-20, -4, 40, 8);
    ctx.restore();
    if (fireLit()) {
      const flick = Math.sin(G.t * 9) * 0.12 + Math.sin(G.t * 23) * 0.06;
      const fuelK = 0.45 + 0.55 * Math.min(1, f.fuel / 40);
      const h = (30 + f.level * 8) * fuelK;
      const c1 = f.level >= 6 ? '#ffd54f' : '#ff9800';
      const c2 = f.level >= 6 ? '#fff3c0' : '#ffcc80';
      const glow = ctx.createRadialGradient(x, y - 10, 5, x, y - 10, 70 + f.level * 10);
      glow.addColorStop(0, 'rgba(255,170,60,0.35)');
      glow.addColorStop(1, 'rgba(255,170,60,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y - 10, 70 + f.level * 10, 0, TAU);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const k = 1 - i * 0.28;
        const fx = x + flick * (i + 1) * 3;
        ctx.fillStyle = i === 2 ? c2 : c1;
        ctx.globalAlpha = 0.9 - i * 0.15;
        ctx.beginPath();
        ctx.moveTo(fx - 14 * k, y - 2);
        ctx.quadraticCurveTo(fx - 10 * k, y - h * 0.55 * k, fx, y - h * k);
        ctx.quadraticCurveTo(fx + 10 * k, y - h * 0.55 * k, fx + 14 * k, y - 2);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = '#555';
      ctx.beginPath();
      ctx.arc(x, y - 8, 6, 0, TAU);
      ctx.fill();
    }
  }

  function drawTent(ctx) {
    const t = G.props.tent;
    if (!vis(t.x, t.y, 150)) return;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(t.x, t.y + 34, 60, 14, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(t.x - 58, t.y + 34);
    ctx.lineTo(t.x, t.y - 52);
    ctx.lineTo(t.x + 58, t.y + 34);
    ctx.closePath();
    ctx.fillStyle = '#c0392b';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(t.x - 20, t.y + 34);
    ctx.lineTo(t.x, t.y - 52);
    ctx.lineTo(t.x + 20, t.y + 34);
    ctx.closePath();
    ctx.fillStyle = '#7b241c';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(t.x - 58, t.y + 34);
    ctx.lineTo(t.x - 30, t.y + 34);
    ctx.lineTo(t.x - 8, t.y - 30);
    ctx.lineTo(t.x, t.y - 52);
    ctx.closePath();
    ctx.fillStyle = '#e74c3c';
    ctx.fill();
  }

  function drawStall(ctx, s, emblem, c1, c2) {
    if (!vis(s.x, s.y, 130)) return;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + 26, 46, 10, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#6d4c33';
    ctx.fillRect(s.x - 38, s.y - 30, 7, 56);
    ctx.fillRect(s.x + 31, s.y - 30, 7, 56);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 ? c1 : c2;
      ctx.fillRect(s.x - 46 + i * 19, s.y - 42, 19, 14);
    }
    ctx.fillStyle = '#8a6a45';
    ctx.beginPath();
    ctx.roundRect(s.x - 40, s.y - 6, 80, 10, 3);
    ctx.fill();
    Utils.font(ctx, 20);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emblem, s.x, s.y - 26);
  }

  function drawPond(ctx) {
    const p = G.props.pond;
    if (!vis(p.x, p.y, 260)) return;
    ctx.fillStyle = '#1d5e7a';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2e88aa';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx * 0.8, p.ry * 0.78, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    const rp = (G.t % 3) / 3;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx * (0.3 + rp * 0.5), p.ry * (0.3 + rp * 0.5), 0, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#43a047';
    [[-60, -20], [40, 30], [10, -40]].forEach(([ox, oy]) => {
      ctx.beginPath();
      ctx.ellipse(p.x + ox, p.y + oy, 14, 9, 0.5, 0, TAU);
      ctx.fill();
    });
  }

  function drawProps(ctx) {
    drawPond(ctx);
    for (const t of G.trees) drawTree(ctx, t);
    for (const b of G.bushes) drawBush(ctx, b);
    for (const c of G.caves) drawCave(ctx, c);
    drawTent(ctx);
    for (const l of G.props.logs) {
      if (!vis(l.x, l.y, 60)) continue;
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.a);
      ctx.fillStyle = '#6d4c33';
      ctx.beginPath();
      ctx.roundRect(-26, -8, 52, 16, 8);
      ctx.fill();
      ctx.strokeStyle = '#4e342e';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    drawBoard(ctx);
    drawStall(ctx, G.props.featherTrader, '🪶', '#8d6e63', '#d7ccc8');
    if (G.salesman) drawStall(ctx, G.salesman, '💼', '#455a64', '#cfd8dc');
    drawFire(ctx);
  }

  function drawCageFronts(ctx) {
    for (const c of G.caves) drawCage(ctx, c, true);
  }

  function drawAmbient(ctx, dk) {
    const b = biomeAt(G.player.x, G.player.y);
    const vw = Game.vw, vh = Game.vh;
    if (b === 'snow') {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 70; i++) {
        const sx = (Utils.hash2(i, 3) * vw + G.t * (14 + Utils.hash2(i, 5) * 20)) % vw;
        const sy = (Utils.hash2(i, 7) * vh + G.t * (34 + Utils.hash2(i, 9) * 36)) % vh;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.4 + Utils.hash2(i, 11) * 1.6, 0, TAU);
        ctx.fill();
      }
    } else if (b === 'lava') {
      ctx.fillStyle = 'rgba(255,140,60,0.5)';
      for (let i = 0; i < 26; i++) {
        const sx = (Utils.hash2(i, 13) * vw + Math.sin(G.t + i) * 16) % vw;
        const sy = vh - ((G.t * (26 + Utils.hash2(i, 15) * 30) + Utils.hash2(i, 17) * vh) % vh);
        ctx.beginPath();
        ctx.arc(sx, sy, 1.2 + Utils.hash2(i, 19) * 1.8, 0, TAU);
        ctx.fill();
      }
    } else if (b === 'forest' && dk > 0.3) {
      for (let i = 0; i < 14; i++) {
        const sx = (Utils.hash2(i, 21) * vw + Math.sin(G.t * 0.7 + i * 2) * 30) % vw;
        const sy = Utils.hash2(i, 23) * vh + Math.cos(G.t * 0.9 + i) * 18;
        ctx.globalAlpha = 0.4 + Math.sin(G.t * 3 + i) * 0.3;
        ctx.fillStyle = '#c6ff8c';
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (b === 'jungle') {
      ctx.fillStyle = 'rgba(120,220,120,0.4)';
      for (let i = 0; i < 16; i++) {
        const sx = (Utils.hash2(i, 25) * vw + Math.sin(G.t * 0.5 + i) * 24 + G.t * 8) % vw;
        const sy = (Utils.hash2(i, 27) * vh + G.t * 22) % vh;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(G.t + i);
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 2, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  return { biomeAt, build, update, onNewDay, drawGround, drawProps, drawCageFronts, drawAmbient, collide, fireLit, fireMax, updateFire, feedFire, tryUpgradeFire, dropPickup };
})();
