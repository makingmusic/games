const MKIND = {
  owl: { hp: 4, r: 22, spd: 150, color: '#f4f6fb', belly: '#ffffff', emoji: '🦉', fly: true, aggro: 430, touch: 1, loot: 'owl' },
  bat: { hp: 2, r: 24, spd: 205, color: '#c45cc8', belly: '#e0b4f0', emoji: '🦇', fly: true, aggro: 9999, touch: 1, loot: 'bat' },
  ram: { hp: 5, r: 26, spd: 120, color: '#c9a06b', belly: '#e0c39a', emoji: '🐏', horns: true, aggro: 360, touch: 1, loot: 'ram' },
  cat: { hp: 4, r: 22, spd: 150, color: '#33333f', belly: '#4a4a5a', emoji: '🐈', aggro: 430, touch: 1, loot: 'cat' },
  wolf: { hp: 4, r: 22, spd: 175, color: '#8a97a6', belly: '#aab6c4', emoji: '🐺', aggro: 340, touch: 1, loot: 'wolf' },
  alphawolf: { hp: 7, r: 29, spd: 185, color: '#66788c', belly: '#8fa2b6', emoji: '🐺', aggro: 400, touch: 1, loot: 'alpha' },
  bear: { hp: 8, r: 33, spd: 95, color: '#7a5230', belly: '#96683f', emoji: '🐻', aggro: 300, touch: 1, loot: 'bear' },
  fox: { hp: 3, r: 20, spd: 235, color: '#e8ecf2', belly: '#f8fafc', emoji: '🦊', aggro: 0, touch: 1, loot: 'none' },
  mammoth: { hp: 20, r: 58, spd: 60, color: '#8d7b68', belly: '#a5968a', emoji: '🦣', tusks: true, aggro: 220, touch: 2, loot: 'mammoth' },
  lavamammoth: { hp: 26, r: 60, spd: 72, color: '#c25b2e', belly: '#e0763e', emoji: '🦣', tusks: true, ember: true, aggro: 240, touch: 2, loot: 'lava' },
  jaguar: { hp: 5, r: 26, spd: 175, color: '#e8a33d', belly: '#f6c96b', emoji: '🐆', aggro: 280, touch: 1, loot: 'jaguar' },
  snake: { hp: 3, r: 18, spd: 118, color: '#57a05c', belly: '#8ccf8f', emoji: '🐍', aggro: 320, touch: 0, loot: 'snake' },
  frogK: { hp: 10, r: 30, spd: 240, color: '#4a90d9', belly: '#74b3e8', emoji: '🐸', frog: true, crown: true, aggro: 280, touch: 1, loot: 'frogK', split: ['frogP'] },
  frogP: { hp: 6, r: 24, spd: 250, color: '#9b59b6', belly: '#b87fd4', emoji: '🐸', frog: true, aggro: 9999, touch: 1, loot: 'frog', split: ['frogB', 'frogB'] },
  frogB: { hp: 4, r: 18, spd: 260, color: '#5dade2', belly: '#85c8ef', emoji: '🐸', frog: true, aggro: 9999, touch: 1, loot: 'frog' },
  frogO: { hp: 2, r: 13, spd: 270, color: '#f39c12', belly: '#f8c471', emoji: '🐸', frog: true, aggro: 9999, touch: 1, loot: 'frogO' },
  deer: { hp: 25, r: 56, spd: 140, color: '#4a3628', belly: '#5f4835', emoji: '🦌', boss: true, aggro: 9999, touch: 1, loot: 'deer' },
};

const MNAMES = {
  owl: 'Owl', bat: 'Bat', ram: 'Ram', cat: 'Cat', wolf: 'Wolf', alphawolf: 'Alpha Wolf',
  bear: 'Bear', fox: 'Fox', mammoth: 'Mammoth', lavamammoth: 'Lava Mammoth', jaguar: 'Jaguar',
  snake: 'Snake', frogK: 'Frog King', frogP: 'Purple Frog', frogB: 'Blue Frog', frogO: 'Baby Frog',
  deer: 'THE DEER',
};

const Monsters = (() => {
  const CHARGE = {
    ram: { cd: 2.6, tele: 0.8, spd: 470, dur: 1.05, dizzy: 1.2, trig: 380, dmg: 2 },
    mammoth: { cd: 4, tele: 1.0, spd: 320, dur: 1.3, dizzy: 1.8, trig: 320, dmg: 2 },
    lavamammoth: { cd: 3.6, tele: 0.9, spd: 355, dur: 1.3, dizzy: 1.6, trig: 340, dmg: 2 },
    jaguar: { cd: 2.5, tele: 0.5, spd: 460, dur: 0.45, dizzy: 0.9, trig: 220, dmg: 1 },
  };
  let dirT = 0;

  const BAT_FRAMES = {};
  const BAT_SEQ = ['flap0', 'flap1', 'flap2', 'flap1'];
  for (const n of ['idle', 'flap0', 'flap1', 'flap2']) {
    const im = new Image();
    im.src = 'assets/bat/' + n + '.png';
    BAT_FRAMES[n] = im;
  }

  function batImage(m) {
    const spd = m.fleeing ? 18 : 11;
    const im = BAT_FRAMES[BAT_SEQ[Math.floor(m.animT * spd) % 4]];
    if (im && im.complete && im.naturalWidth > 0) return im;
    return null;
  }

  function emotionOf(m) {
    if (m.fleeing) return '💨';
    if (m.mode === 'dizzy') return '😵';
    if (m.mode === 'tele' || m.mode === 'charge' || m.mode === 'dive' || m.mode === 'lunge' || m.mode === 'roar' || m.mode === 'shock' || m.tele > 0) return '😡';
    if (m.provoked || m.kind === 'bat') return '😠';
    return '🙂';
  }

  function drawBadge(ctx, y, name, face, emo) {
    Utils.font(ctx, 13);
    const tw = ctx.measureText(name).width;
    const w = tw + 66;
    const h = 30;
    const x = -w / 2;
    ctx.fillStyle = 'rgba(14,17,25,0.8)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    Utils.font(ctx, 22);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(face, x + 20, y + h / 2 + 1);
    Utils.font(ctx, 13);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.fillText(name, x + 36, y + h / 2 + 1);
    Utils.font(ctx, 16);
    ctx.textAlign = 'center';
    ctx.fillText(emo, x + w - 15, y + h / 2 + 1);
  }

  function spawn(kind, x, y, opts = {}) {
    const K = MKIND[kind];
    const m = Object.assign({
      kind, k: K, x, y,
      hp: K.hp, maxHp: K.hp, r: K.r,
      fleeAt: K.boss ? 0 : Math.max(1, Math.ceil(K.hp * 0.3)),
      mode: 'wander', mt: 0, tele: 0, cd: Utils.rand(0.5, 1.5),
      animT: Utils.rand(0, 9), touchCd: 0, hurtT: 0, kbx: 0, kby: 0,
      fleeing: false, fleeT: 0, dir: 1, provoked: false,
      orbitA: Utils.rand(0, TAU), orbitDir: Math.random() < 0.5 ? -1 : 1,
      anchor: { x, y }, guard: null, boss: !!K.boss,
      tx: x, ty: y, wT: 0, jt: 0, ja: 0,
      segs: [], segT: 0, holding: [], escapeA: 0,
      swoopCd: Utils.rand(1.5, 3), restT: 0.6, castCd: 3,
    }, opts);
    G.monsters.push(m);
    return m;
  }

  function count(kind) {
    return G.monsters.filter((m) => m.kind === kind && !m.dead && !m.fleeing).length;
  }

  function dropLoot(m) {
    const L = m.k.loot;
    const drop = (kind, n) => World.dropPickup(m.x, m.y, kind, n);
    if (L === 'owl') { drop('feather', Utils.randi(2, 3)); if (Math.random() < 0.3) drop('coin', 2); }
    else if (L === 'bat') { if (Math.random() < 0.25) drop('coin', 1); }
    else if (L === 'wolf') { if (Math.random() < 0.35) drop('coin', 1); }
    else if (L === 'alpha') { drop('coin', 3); if (Math.random() < 0.35) drop('gem', 1); }
    else if (L === 'ram' || L === 'cat') { if (Math.random() < 0.4) drop('coin', 2); }
    else if (L === 'bear') drop('coin', 3);
    else if (L === 'mammoth') { drop('coin', 2); if (Math.random() < 0.55) drop('gem', 1); }
    else if (L === 'lava') { drop('gem', 1); drop('coin', 3); }
    else if (L === 'jaguar') drop('coin', 2);
    else if (L === 'snake') { if (Math.random() < 0.3) drop('coin', 1); }
    else if (L === 'frogK') { drop('coin', 4); drop('gem', 1); }
    else if (L === 'frog') drop('coin', 2);
    else if (L === 'frogO') { drop('coin', 1); if (Math.random() < 0.2) drop('gem', 1); }
    else if (L === 'none') { if (Math.random() < 0.2) drop('pelt', 1); }
    const peltChance = { wolf: 0.25, alpha: 0.5, bear: 0.4, cat: 0.25, ram: 0.25, jaguar: 0.3, mammoth: 0.6, lava: 0.7 }[L];
    if (peltChance && Math.random() < peltChance) drop('pelt', (L === 'mammoth' || L === 'lava') ? 2 : 1);
  }

  function startFlee(m) {
    m.fleeing = true;
    m.fleeT = 0;
    dropLoot(m);
    G.stats.defeated++;
    Effects.stars(m.x, m.y, 8);
    Effects.text(m.x, m.y - m.r - 20, 'Ran away!', '#b9f6ca', 15);
    Sfx.sfx('poof');
  }

  function splitFrog(m) {
    m.dead = true;
    dropLoot(m);
    G.stats.defeated++;
    Effects.poof(m.x, m.y, '#a5d6a7', 12);
    Effects.stars(m.x, m.y, 10);
    Effects.ring(m.x, m.y, '#9b59b6');
    Effects.shake(m.kind === 'frogK' ? 7 : 3);
    Sfx.sfx(m.kind === 'frogK' ? 'roar' : 'poof');
    (m.split || []).forEach((k, i) => {
      const c = spawn(k, m.x + Math.cos(i * 2.1) * 36, m.y + Math.sin(i * 2.1) * 36, { anchor: m.anchor, provoked: true, mode: 'rest', mt: 0, restT: 0.3 });
      if (m.kind === 'frogP' && k === 'frogB') c.split = i === 0 ? ['frogO', 'frogO'] : ['frogO'];
    });
    if (m.kind === 'frogK') UI.toast('The Frog King splits! 🐸');
  }

  function hurt(m, dmg, ang) {
    if (m.dead) return;
    m.hp -= dmg;
    m.hurtT = 0.18;
    m.provoked = true;
    m.kbx += Math.cos(ang) * 230;
    m.kby += Math.sin(ang) * 230;
    Sfx.sfx('thwack');
    Effects.text(m.x, m.y - m.r - 8, '-' + dmg, '#ffd54f', 16);
    Effects.hit(m.x, m.y);
    if (m.hidden) m.hidden = false;
    if (m.kind === 'deer') {
      if (m.hp <= 0) {
        m.dead = true;
        Effects.stars(m.x, m.y, 26);
        Effects.poof(m.x, m.y, '#b07ce0', 18);
        Effects.shake(14);
        Game.onDeerDefeated();
      } else if (!m.enraged && m.hp <= m.maxHp * 0.5) {
        m.enraged = true;
        UI.toast('The Deer is furious! 😤');
        Effects.shake(8);
        Sfx.sfx('roar');
      }
      return;
    }
    if (m.fleeing) return;
    if (m.k.frog) {
      if (m.hp <= m.fleeAt) splitFrog(m);
      return;
    }
    if (m.kind === 'fox') {
      for (const pk of m.holding) { pk.held = false; pk.holder = null; }
      m.holding = [];
      startFlee(m);
      return;
    }
    if (m.hp <= m.fleeAt) startFlee(m);
  }

  function moveToward(m, tx, ty, spd, dt) {
    const a = Utils.ang(m.x, m.y, tx, ty);
    m.dir = Math.cos(a) >= 0 ? 1 : -1;
    let nx = m.x + Math.cos(a) * spd * dt;
    let ny = m.y + Math.sin(a) * spd * dt;
    const sr = safeRadius();
    if (sr > 0 && !m.boss && Utils.dist(nx, ny, CFG.CAMP.x, CFG.CAMP.y) < sr + m.r * 0.4) {
      nx = m.x;
      ny = m.y;
    }
    if (!m.k.fly) {
      const c = World.collide(nx, ny, m.r * 0.7);
      nx = c.x;
      ny = c.y;
    }
    m.x = Utils.clamp(nx, 40, CFG.W - 40);
    m.y = Utils.clamp(ny, 40, CFG.H - 40);
  }

  function touchDamage(m, mult = 1) {
    if (m.touchCd > 0 || m.fleeing || m.hidden) return;
    const p = G.player;
    if (Utils.dist(m.x, m.y, p.x, p.y) < m.r + p.r + 3) {
      Player.hurt((m.k.touch || 1) * mult, m.x, m.y);
      m.touchCd = 1.1;
    }
  }

  function wander(m, dt) {
    let ax = m.anchor.x, ay = m.anchor.y;
    if (G.phase === 'night' && !World.fireLit() && !m.guard) { ax = CFG.CAMP.x + 140; ay = CFG.CAMP.y + 140; }
    m.wT -= dt;
    if (m.wT <= 0) {
      m.tx = ax + Utils.rand(-280, 280);
      m.ty = ay + Utils.rand(-280, 280);
      m.wT = Utils.rand(2, 4.5);
    }
    if (Utils.dist(m.x, m.y, m.tx, m.ty) > 20) moveToward(m, m.tx, m.ty, m.k.spd * 0.55, dt);
  }

  function actCharger(m, dt, dp, aggro) {
    const k = m.kind, C = CHARGE[k];
    if (m.hidden) {
      if (dp < 280) {
        m.hidden = false;
        m.provoked = true;
        Effects.poof(m.x, m.y, '#a5d6a7', 8);
        UI.toast('A jaguar leaps out! 🐆');
      } else return;
    }
    if (m.mode === 'wander') {
      if (aggro && m.cd <= 0 && dp < C.trig) {
        m.mode = 'tele';
        m.mt = 0;
      } else wander(m, dt);
      touchDamage(m);
    } else if (m.mode === 'tele') {
      m.tele = 0.15;
      if (m.mt < C.tele - 0.25) m.ca = Utils.ang(m.x, m.y, G.player.x, G.player.y);
      if (m.mt >= C.tele) {
        m.mode = 'charge';
        m.mt = 0;
        m.hitDone = false;
      }
    } else if (m.mode === 'charge') {
      m.x += Math.cos(m.ca) * C.spd * dt;
      m.y += Math.sin(m.ca) * C.spd * dt;
      m.dir = Math.cos(m.ca) >= 0 ? 1 : -1;
      if (!m.hitDone && dp < m.r + 24) {
        Player.hurt(C.dmg, m.x, m.y);
        m.hitDone = true;
      }
      if (k === 'ram') {
        for (const t of G.trees) {
          if (t.dead) continue;
          if (Utils.dist(m.x, m.y, t.x, t.y) < 40) {
            t.hp--;
            t.hitT = 0.3;
            Effects.leaf(t.x, t.y - 28 * t.s);
            if (t.hp <= 0) {
              t.dead = true;
              t.regrowDay = G.day + 2;
              Effects.poof(t.x, t.y - 20, '#a5d6a7', 8);
              World.dropPickup(t.x, t.y, 'wood', 2);
            }
            m.mode = 'dizzy';
            m.mt = 0;
            Effects.shake(6);
            break;
          }
        }
      }
      if (m.mode === 'charge' && m.mt >= C.dur) {
        m.mode = 'dizzy';
        m.mt = 0;
      }
    } else {
      if (m.mt >= C.dizzy) {
        m.mode = 'wander';
        m.cd = C.cd;
      }
      touchDamage(m);
    }
  }

  function actWolf(m, dt, dp, aggro) {
    if (m.kind === 'alphawolf' && aggro && !m.howled) {
      m.howled = true;
      UI.toast('The alpha wolf howls! 🐺');
      Sfx.sfx('howl');
      Effects.ring(m.x, m.y, '#b0bec5');
    }
    if (!aggro) { wander(m, dt); return; }
    if (m.guard && Utils.dist(m.x, m.y, m.anchor.x, m.anchor.y) > 560) {
      moveToward(m, m.anchor.x, m.anchor.y, m.k.spd, dt);
      return;
    }
    if (m.mode === 'lunge') {
      m.x += Math.cos(m.ca) * 400 * dt;
      m.y += Math.sin(m.ca) * 400 * dt;
      m.dir = Math.cos(m.ca) >= 0 ? 1 : -1;
      if (m.mt > 0.32) { m.mode = 'wander'; m.cd = 1.9; }
      touchDamage(m);
      return;
    }
    m.orbitA += dt * 1.6 * m.orbitDir;
    moveToward(m, G.player.x + Math.cos(m.orbitA) * 125, G.player.y + Math.sin(m.orbitA) * 125, m.k.spd, dt);
    if (m.cd <= 0 && dp < 200) {
      m.mode = 'lunge';
      m.mt = 0;
      m.ca = Utils.ang(m.x, m.y, G.player.x, G.player.y);
    }
    touchDamage(m);
  }

  function actBear(m, dt, dp, aggro) {
    if (!aggro) { wander(m, dt); return; }
    if (m.guard && dp > 500 && Utils.dist(m.x, m.y, m.anchor.x, m.anchor.y) > 600) {
      moveToward(m, m.anchor.x, m.anchor.y, m.k.spd, dt);
      return;
    }
    if (m.mode === 'swipe') {
      if (m.mt > 0.5) {
        if (Utils.dist(m.x, m.y, G.player.x, G.player.y) < 78) Player.hurt(1, m.x, m.y);
        m.mode = 'wander';
        m.cd = 1.8;
      }
      return;
    }
    moveToward(m, G.player.x, G.player.y, m.k.spd, dt);
    if (dp < 62 && m.cd <= 0) {
      m.mode = 'swipe';
      m.mt = 0;
    }
    touchDamage(m);
  }

  function actOwl(m, dt, dp, aggro) {
    if (m.mode === 'dive') {
      m.x += Math.cos(m.da) * 430 * dt;
      m.y += Math.sin(m.da) * 430 * dt;
      m.dir = Math.cos(m.da) >= 0 ? 1 : -1;
      touchDamage(m);
      if (m.mt > 0.55) { m.mode = 'wander'; m.swoopCd = 3.2; }
      return;
    }
    if (m.mode === 'tele') {
      if (m.mt > 0.55) {
        m.mode = 'dive';
        m.mt = 0;
        m.da = Utils.ang(m.x, m.y, G.player.x, G.player.y);
      }
      return;
    }
    if (aggro) {
      m.orbitA += dt * 1.3;
      moveToward(m, G.player.x + Math.cos(m.orbitA) * 155, G.player.y + Math.sin(m.orbitA) * 155, 170, dt);
      m.swoopCd -= dt;
      if (m.swoopCd <= 0 && dp < 430) { m.mode = 'tele'; m.mt = 0; }
      touchDamage(m);
    } else wander(m, dt);
  }

  function actBat(m, dt, dp) {
    m.jt -= dt;
    if (m.jt <= 0) { m.ja = Utils.rand(0, TAU); m.jt = Utils.rand(0.2, 0.45); }
    let ax = Math.cos(m.ja), ay = Math.sin(m.ja);
    if (dp < 420) {
      const a = Utils.ang(m.x, m.y, G.player.x, G.player.y);
      ax += Math.cos(a) * 1.7;
      ay += Math.sin(a) * 1.7;
    }
    m.x = Utils.clamp(m.x + ax * m.k.spd * dt, 40, CFG.W - 40);
    m.y = Utils.clamp(m.y + ay * m.k.spd * dt, 40, CFG.H - 40);
    m.dir = ax >= 0 ? 1 : -1;
    touchDamage(m);
  }

  function actCat(m, dt, dp) {
    const facingAway = Math.cos(G.player.face - Utils.ang(G.player.x, G.player.y, m.x, m.y)) < 0.25;
    const brave = G.phase === 'night';
    const sneaking = dp < 430 && (facingAway || dp < 110 || (brave && dp < 260));
    if (sneaking) {
      const spd = facingAway || brave ? (brave ? 165 : 125) : 40;
      moveToward(m, G.player.x, G.player.y, spd, dt);
      if (dp < 42 && m.cd <= 0) {
        Player.hurt(1, m.x, m.y);
        m.cd = 1.6;
      }
    } else if (dp < 430) {
      const a = Utils.ang(G.player.x, G.player.y, m.x, m.y);
      moveToward(m, m.x + Math.cos(a) * 60, m.y + Math.sin(a) * 60, 22, dt);
    } else wander(m, dt);
  }

  function actFox(m, dt, dp) {
    if (m.holding.length) {
      moveToward(m, m.x + Math.cos(m.escapeA) * 200, m.y + Math.sin(m.escapeA) * 200, 250, dt);
      for (const pk of m.holding) { pk.x = m.x; pk.y = m.y - 8; }
      if (dp > 950) {
        for (const pk of m.holding) pk.dead = true;
        m.holding = [];
        m.dead = true;
        UI.toast('An arctic fox made off with your loot! 🦊');
      }
      return;
    }
    let target = null, td = 650;
    for (const pk of G.pickups) {
      if (pk.dead || pk.held || pk.kind === 'feather') continue;
      const d = Utils.dist(m.x, m.y, pk.x, pk.y);
      if (d < td) { td = d; target = pk; }
    }
    if (target) {
      moveToward(m, target.x, target.y, m.k.spd, dt);
      if (td < 28) {
        target.held = true;
        target.holder = m;
        m.holding.push(target);
        m.escapeA = Utils.ang(G.player.x, G.player.y, m.x, m.y);
        Effects.text(m.x, m.y - 24, 'Mine! 🦊', '#ffcdd2', 14);
      }
    } else wander(m, dt);
  }

  function actSnake(m, dt, dp, aggro) {
    m.segT += dt;
    if (m.segT > 0.05) {
      m.segT = 0;
      m.segs.unshift({ x: m.x, y: m.y });
      if (m.segs.length > 7) m.segs.pop();
    }
    if (dp > 40) {
      if (aggro) {
        const a = Utils.ang(m.x, m.y, G.player.x, G.player.y) + Math.sin(m.animT * 5) * 0.8;
        moveToward(m, m.x + Math.cos(a) * 80, m.y + Math.sin(a) * 80, m.k.spd, dt);
      } else wander(m, dt);
    }
    if (dp < 44 && m.cd <= 0) {
      Player.hurt(1, m.x, m.y);
      G.player.poisonT = Math.max(G.player.poisonT, 3);
      Effects.text(G.player.x, G.player.y - 34, 'Poisoned!', '#8ee68e', 14);
      m.cd = 2.2;
    }
  }

  function actFrog(m, dt, dp, aggro) {
    if (m.mode === 'leap') {
      m.x += Math.cos(m.la) * m.k.spd * dt;
      m.y += Math.sin(m.la) * m.k.spd * dt;
      m.dir = Math.cos(m.la) >= 0 ? 1 : -1;
      touchDamage(m);
      if (m.mt > 0.42) {
        m.mode = 'rest';
        m.mt = 0;
        m.restT = Utils.rand(0.45, 0.85);
        Effects.poof(m.x, m.y, '#a5d6a7', 6);
        Effects.ring(m.x, m.y, '#7ed37e');
        if (m.kind === 'frogK') Effects.shake(5);
      }
      return;
    }
    if (m.mode === 'squash') {
      if (m.mt > 0.22) {
        m.mode = 'leap';
        m.mt = 0;
        const home = Utils.dist(m.x, m.y, m.anchor.x, m.anchor.y) > 620;
        m.la = Utils.ang(m.x, m.y, home ? m.anchor.x : G.player.x, home ? m.anchor.y : G.player.y);
      }
      return;
    }
    if (m.mt > m.restT && (aggro || Utils.dist(m.x, m.y, m.anchor.x, m.anchor.y) > 500)) {
      m.mode = 'squash';
      m.mt = 0;
      Sfx.sfx('croak');
      Effects.ring(m.x, m.y, '#ce93d8');
    }
  }

  function actDeer(m, dt, dp) {
    const p = G.player;
    if (Math.random() < dt * 2) Effects.bubble(m.x + Utils.rand(-30, 30), m.y - Utils.rand(0, 40));
    if (m.mode === 'intro') {
      if (m.mt > 1.6) { m.mode = 'stalk'; m.mt = 0; }
      return;
    }
    if (m.mode === 'tele') {
      m.tele = 0.2;
      const dur = m.enraged ? 0.65 : 0.9;
      if (m.mt < dur - 0.3) m.ca = Utils.ang(m.x, m.y, p.x, p.y);
      if (m.mt >= dur) { m.mode = 'charge'; m.mt = 0; m.hitDone = false; Effects.shake(8); Sfx.sfx('roar'); }
      return;
    }
    if (m.mode === 'charge') {
      const spd = m.enraged ? 640 : 540;
      m.x += Math.cos(m.ca) * spd * dt;
      m.y += Math.sin(m.ca) * spd * dt;
      m.x = Utils.clamp(m.x, 60, CFG.W - 60);
      m.y = Utils.clamp(m.y, 60, CFG.H - 60);
      m.dir = Math.cos(m.ca) >= 0 ? 1 : -1;
      if (Math.random() < dt * 22) Effects.ember(m.x + Utils.rand(-20, 20), m.y - 10);
      if (!m.hitDone && dp < m.r + 26) {
        Player.hurt(2, m.x, m.y);
        m.hitDone = true;
      }
      if (m.mt > 0.85) { m.mode = 'dizzy'; m.mt = 0; }
      return;
    }
    if (m.mode === 'roar') {
      if (m.mt >= 0.7) {
        m.mode = 'shock';
        m.mt = 0;
        m.shockR = 0;
        m.shockHit = false;
        Sfx.sfx('roar');
        Effects.shake(10);
        Effects.ring(m.x, m.y, '#ff1744');
        if (!m.roared) { m.roared = true; UI.toast('The Deer ROARS! Run from the ring!'); }
      } else if (Math.random() < dt * 8) {
        Effects.poof(m.x + Utils.rand(-40, 40), m.y - Utils.rand(0, 50), '#5d4037', 3);
      }
      return;
    }
    if (m.mode === 'shock') {
      m.shockR = (m.shockR || 0) + dt * 380;
      const ddp = Utils.dist(m.x, m.y, p.x, p.y);
      if (!m.shockHit && Math.abs(ddp - m.shockR) < 28) {
        Player.hurt(1, m.x, m.y);
        m.shockHit = true;
      }
      if (Math.random() < dt * 10) Effects.ember(m.x + Utils.rand(-40, 40), m.y + Utils.rand(-30, 10));
      if (m.shockR > 320) { m.mode = 'stalk'; m.mt = 0; m.shockR = 0; }
      return;
    }
    if (m.mode === 'dizzy') {
      if (m.mt > 0.5) { m.mode = 'stalk'; m.mt = 0; }
      touchDamage(m);
      return;
    }
    if (m.mode === 'cast') {
      if (m.mt > 0.45) {
        if (m.castType === 'fan') {
          const n = m.enraged ? 7 : 5;
          const base = Utils.ang(m.x, m.y, p.x, p.y);
          for (let i = 0; i < n; i++) {
            Projectiles.spawn(m.x, m.y - 30, base + (i - (n - 1) / 2) * 0.22, 'spirit', 'deer');
          }
          Sfx.sfx('shoot');
        } else {
          const alive = G.cultists.filter((c) => !c.dead).length;
          const want = Math.min(3, 4 - alive);
          for (let i = 0; i < want; i++) {
            const a = Utils.rand(0, TAU);
            const cx = Utils.clamp(m.x + Math.cos(a) * 130, 80, CFG.W - 80);
            const cy = Utils.clamp(m.y + Math.sin(a) * 130, 80, CFG.H - 80);
            Cultists.spawn(Math.random() < 0.25 ? 'deerElite' : 'deer', cx, cy, { targetFire: false });
            Effects.poof(cx, cy, '#b07ce0', 8);
          }
        }
        m.castCd = 6;
        m.mode = 'stalk';
        m.mt = 0;
      }
      return;
    }
    moveToward(m, p.x, p.y, m.enraged ? 185 : 140, dt);
    touchDamage(m);
    if (m.castCd > 0) m.castCd -= dt;
    if (m.roarCd === undefined) m.roarCd = 5;
    m.roarCd -= dt;
    if (m.roarCd <= 0 && dp > 120) {
      m.mode = 'roar';
      m.mt = 0;
      m.roarCd = m.enraged ? 5 : 8;
      return;
    }
    if (m.mt > 1.2) {
      m.mt = 0;
      if (m.castCd <= 0) {
        m.castType = Math.random() < 0.5 ? 'fan' : 'summon';
        m.mode = 'cast';
        m.mt = 0;
      } else if (dp > 300) {
        m.mode = 'tele';
        m.mt = 0;
      }
    }
  }

  function update(dt) {
    const p = G.player;
    for (const m of G.monsters) {
      if (m.dead) continue;
      m.animT += dt;
      m.mt += dt;
      if (m.hurtT > 0) m.hurtT -= dt;
      if (m.touchCd > 0) m.touchCd -= dt;
      if (m.cd > 0) m.cd -= dt;
      if (m.tele > 0) m.tele -= dt;
      m.x += m.kbx * dt;
      m.y += m.kby * dt;
      m.kbx *= Math.exp(-6 * dt);
      m.kby *= Math.exp(-6 * dt);
      const dp = Utils.dist(m.x, m.y, p.x, p.y);
      if (!m.boss && !m.guard && !m.k.frog && !m.fleeing && dp > 1500) {
        m.dead = true;
        continue;
      }
      if (m.fleeing) {
        const a = Utils.ang(p.x, p.y, m.x, m.y);
        moveToward(m, m.x + Math.cos(a) * 100, m.y + Math.sin(a) * 100, m.k.spd * 1.5, dt);
        m.fleeT += dt;
        if (m.fleeT > 3.5 || dp > 700) {
          m.dead = true;
          Effects.poof(m.x, m.y, '#cfd8dc', 5);
        }
        continue;
      }
      const nightBoost = G.phase === 'night' ? 1.15 : 1;
      const fireOutBoost = G.phase === 'night' && !World.fireLit() ? 2.4 : 1;
      const aggro = m.provoked || dp < m.k.aggro * nightBoost * fireOutBoost;
      if (aggro && !m.growled && !m.fleeing) {
        m.growled = true;
        if (dp < 800) Sfx.sfx(m.kind === 'snake' ? 'hiss' : (m.kind === 'bat' || m.kind === 'owl' ? 'screech' : 'growl'));
      }
      switch (m.kind) {
        case 'owl': actOwl(m, dt, dp, aggro); break;
        case 'bat': actBat(m, dt, dp); break;
        case 'ram': case 'mammoth': case 'lavamammoth': case 'jaguar': actCharger(m, dt, dp, aggro); break;
        case 'cat': actCat(m, dt, dp); break;
        case 'wolf': case 'alphawolf': actWolf(m, dt, dp, aggro); break;
        case 'bear': actBear(m, dt, dp, aggro); break;
        case 'fox': actFox(m, dt, dp); break;
        case 'snake': actSnake(m, dt, dp, aggro); break;
        case 'frogK': case 'frogP': case 'frogB': case 'frogO': actFrog(m, dt, dp, aggro); break;
        case 'deer': actDeer(m, dt, dp); break;
      }
      if (!m.dead && !m.guard) {
        const kept = World.keepOut(m.x, m.y, m.r * 0.4);
        m.x = kept.x;
        m.y = kept.y;
      }
    }
    G.monsters = G.monsters.filter((m) => !m.dead);
  }

  function spawnRing(plan, biome) {
    const p = G.player;
    for (let att = 0; att < 10; att++) {
      const a = Utils.rand(0, TAU);
      const d = Utils.rand(760, 1000);
      const x = Utils.clamp(p.x + Math.cos(a) * d, 80, CFG.W - 80);
      const y = Utils.clamp(p.y + Math.sin(a) * d, 80, CFG.H - 80);
      if (World.biomeAt(x, y) !== biome) continue;
      if (plan === 'wolfPack') {
        const n = Utils.randi(3, 5);
        if (G.day >= 8 && Math.random() < 0.45) spawn('alphawolf', x, y, { anchor: { x, y } });
        for (let i = 0; i < n; i++) spawn('wolf', x + Utils.rand(-60, 60), y + Utils.rand(-60, 60), { anchor: { x, y } });
      } else if (plan === 'batGroup') {
        for (let i = 0; i < 3; i++) spawn('bat', x + Utils.rand(-90, 90), y + Utils.rand(-90, 90), { anchor: { x, y } });
      } else {
        spawn(plan, x, y, { anchor: { x, y } });
      }
      return;
    }
  }

  function director(dt) {
    dirT += dt;
    if (dirT < 2.8) return;
    dirT = 0;
    const p = G.player;
    const biome = World.biomeAt(p.x, p.y);
    const night = G.phase === 'night';
    const wild = G.monsters.filter((m) => !m.dead && !m.fleeing && !m.guard && !m.boss && !m.k.frog);
    if (wild.length >= 22) return;
    if (Math.random() > 0.6) return;
    const plans = [];
    if (biome === 'forest') {
      if (count('owl') < 3) plans.push('owl');
      if (night && count('bat') < 6) plans.push('batGroup');
      if (count('ram') < 2) plans.push('ram');
    } else if (biome === 'snow') {
      if (night && count('wolf') < 5) plans.push('wolfPack');
      if (night && count('fox') < 2) plans.push('fox');
      if (count('mammoth') < 1 && Math.random() < 0.4) plans.push('mammoth');
    } else if (biome === 'lava') {
      if (night && count('bat') < 6) plans.push('batGroup');
      if (count('lavamammoth') < 1 && Math.random() < 0.4) plans.push('lavamammoth');
    } else {
      if (count('ram') < 2) plans.push('ram');
      if (count('cat') < 3) plans.push('cat');
      if (count('jaguar') < 2 && Math.random() < 0.5) plans.push('jaguar');
      if (count('snake') < 3) plans.push('snake');
    }
    if (night && !World.fireLit() && count('wolf') < 8) plans.push('wolfPack');
    if (!plans.length) return;
    spawnRing(Utils.choice(plans), biome);
  }

  function dawnSweep() {
    for (const m of G.monsters) {
      if (m.kind === 'bat' && !m.guard) {
        m.dead = true;
        Effects.poof(m.x, m.y, '#ce93d8', 5);
      }
    }
  }

  function drawSnake(ctx, m) {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 16, 6, 0, 0, TAU);
    ctx.fill();
    for (let i = m.segs.length - 1; i >= 0; i--) {
      const s = m.segs[i];
      const rr = m.r * (1 - i * 0.1);
      ctx.fillStyle = i % 2 ? m.k.color : Utils.shade(m.k.color, -0.12);
      ctx.beginPath();
      ctx.arc(s.x - m.x, s.y - m.y, rr, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = m.k.color;
    ctx.beginPath();
    ctx.arc(0, 0, m.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = Utils.shade(m.k.color, -0.3);
    ctx.lineWidth = 3;
    ctx.stroke();
    Utils.font(ctx, 14);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐍', 0, 0);
    if (Math.sin(m.animT * 4) > 0.6) {
      ctx.strokeStyle = '#e53935';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(m.dir * 10, -4);
      ctx.lineTo(m.dir * 20, -6);
      ctx.stroke();
    }
    if (m.hurtT > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, m.r, 0, TAU);
      ctx.fill();
    }
    if (m.hp < m.maxHp && !m.fleeing) {
      const w = m.r * 1.6;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-w / 2, -m.r - 14, w, 6);
      ctx.fillStyle = '#7ed37e';
      ctx.fillRect(-w / 2, -m.r - 14, w * Math.max(0, m.hp / m.maxHp), 6);
    }
    drawBadge(ctx, -m.r - 48, MNAMES.snake, '🐍', emotionOf(m));
    ctx.restore();
  }

  function drawDeer(ctx, m) {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 44, 62, 18, 0, 0, TAU);
    ctx.fill();
    const step = Math.sin(m.animT * 7) * 8;
    ctx.strokeStyle = '#33241a';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-34, 10); ctx.lineTo(-38 + step * 0.4, 46);
    ctx.moveTo(-14, 12); ctx.lineTo(-10 - step * 0.4, 46);
    ctx.moveTo(14, 12); ctx.lineTo(10 + step * 0.4, 46);
    ctx.moveTo(34, 10); ctx.lineTo(38 - step * 0.4, 46);
    ctx.stroke();
    ctx.fillStyle = m.k.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 56, 34, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#2e2118';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = m.k.belly;
    ctx.beginPath();
    ctx.ellipse(0, 12, 34, 16, 0, 0, TAU);
    ctx.fill();
    const hx = m.dir * 40, hy = -44;
    ctx.fillStyle = m.k.color;
    ctx.beginPath();
    ctx.ellipse(hx, hy, 18, 16, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#d7ccc8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(hx - 8, hy - 12); ctx.lineTo(hx - 16, hy - 34); ctx.moveTo(hx - 13, hy - 24); ctx.lineTo(hx - 24, hy - 30);
    ctx.moveTo(hx + 8, hy - 12); ctx.lineTo(hx + 16, hy - 34); ctx.moveTo(hx + 13, hy - 24); ctx.lineTo(hx + 24, hy - 30);
    ctx.stroke();
    Utils.font(ctx, 26);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🦌', hx, hy + 2);
    if (m.tele > 0 || m.mode === 'tele' || m.enraged) {
      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.arc(hx - 8, hy - 4, 4.5, 0, TAU);
      ctx.arc(hx + 8, hy - 4, 4.5, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(hx - 8, hy - 4, 9, 0, TAU);
      ctx.arc(hx + 8, hy - 4, 9, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (m.hurtT > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 56, 34, 0, 0, TAU);
      ctx.fill();
    }
    if (m.enraged) {
      ctx.strokeStyle = 'rgba(255,23,68,' + (0.45 + Math.sin(m.animT * 6) * 0.2) + ')';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(0, 10, 68 + Math.sin(m.animT * 6) * 4, 44, 0, 0, TAU);
      ctx.stroke();
    }
    if (m.mode === 'roar') {
      ctx.strokeStyle = 'rgba(255,23,68,' + (0.5 + Math.sin(m.animT * 20) * 0.3) + ')';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, -10, 60 + m.mt * 40, 0, TAU);
      ctx.stroke();
    }
    if (m.mode === 'shock' && m.shockR > 0) {
      ctx.strokeStyle = 'rgba(255,82,82,0.9)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, 0, m.shockR, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,213,79,0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, m.shockR, 0, TAU);
      ctx.stroke();
    }
    drawBadge(ctx, -104, MNAMES.deer, '🦌', emotionOf(m));
    ctx.restore();
  }

  function drawMon(ctx, m) {
    const K = m.k;
    ctx.save();
    ctx.translate(m.x, m.y);
    const baseAlpha = m.hidden ? 0.28 : 1;
    ctx.globalAlpha = baseAlpha;
    if (m.tele > 0 || (m.mode === 'tele' && m.mt > 0) || m.mode === 'squash') ctx.translate(Utils.rand(-2, 2), Utils.rand(-2, 2));
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, K.r * 0.85, K.r * 0.9, K.r * 0.3, 0, 0, TAU);
    ctx.fill();
    const flee = m.fleeing;
    const step = Math.sin(m.animT * (flee ? 26 : 9));
    if (!K.fly && !K.frog) {
      ctx.strokeStyle = Utils.shade(K.color, -0.35);
      ctx.lineWidth = Math.max(4, K.r * 0.22);
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (flee) {
        ctx.moveTo(-K.r * 0.6, K.r * 0.4); ctx.lineTo(-K.r * 0.6 + step * 6, K.r * 0.8);
        ctx.moveTo(-K.r * 0.25, K.r * 0.5); ctx.lineTo(-K.r * 0.25 - step * 6, K.r * 0.85);
        ctx.moveTo(K.r * 0.25, K.r * 0.5); ctx.lineTo(K.r * 0.25 + step * 6, K.r * 0.85);
        ctx.moveTo(K.r * 0.6, K.r * 0.4); ctx.lineTo(K.r * 0.6 - step * 6, K.r * 0.8);
      } else {
        ctx.moveTo(-K.r * 0.3, K.r * 0.5); ctx.lineTo(-K.r * 0.3 + step * K.r * 0.18, K.r * 0.92);
        ctx.moveTo(K.r * 0.3, K.r * 0.5); ctx.lineTo(K.r * 0.3 - step * K.r * 0.18, K.r * 0.92);
      }
      ctx.stroke();
    }
    ctx.rotate(flee ? (m.dir >= 0 ? 0.3 : -0.3) : 0);
    ctx.translate(0, K.fly ? Math.sin(m.animT * 3) * 5 : 0);
    if (K.fly) {
      const flap = Math.sin(m.animT * 16) * 0.6;
      ctx.fillStyle = Utils.shade(K.color, -0.15);
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * K.r * 0.7, -K.r * 0.15);
        ctx.rotate(s * (0.5 + flap));
        ctx.beginPath();
        ctx.ellipse(0, 0, K.r * 0.75, K.r * 0.34, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.fillStyle = K.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, K.r, K.r * 0.82, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = Utils.shade(K.color, -0.3);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = K.belly;
    ctx.beginPath();
    ctx.ellipse(0, K.r * 0.18, K.r * 0.55, K.r * 0.38, 0, 0, TAU);
    ctx.fill();
    if (K.horns) {
      ctx.strokeStyle = '#efe0c8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-K.r * 0.45, -K.r * 0.6); ctx.quadraticCurveTo(-K.r * 0.95, -K.r * 1.05, -K.r * 0.6, -K.r * 1.35);
      ctx.moveTo(K.r * 0.45, -K.r * 0.6); ctx.quadraticCurveTo(K.r * 0.95, -K.r * 1.05, K.r * 0.6, -K.r * 1.35);
      ctx.stroke();
    }
    if (K.tusks) {
      ctx.strokeStyle = '#fff8e1';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-K.r * 0.5, K.r * 0.1); ctx.quadraticCurveTo(-K.r * 0.85, -K.r * 0.35, -K.r * 0.45, -K.r * 0.6);
      ctx.moveTo(K.r * 0.5, K.r * 0.1); ctx.quadraticCurveTo(K.r * 0.85, -K.r * 0.35, K.r * 0.45, -K.r * 0.6);
      ctx.stroke();
    }
    if (K.ember) {
      ctx.fillStyle = '#ffab40';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(Math.cos(i * 1.7 + m.animT) * K.r * 0.5, Math.sin(i * 2.3) * K.r * 0.4, 4, 0, TAU);
        ctx.fill();
      }
    }
    Utils.font(ctx, Math.round(K.r * 0.95));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(K.emoji, 0, -K.r * 0.2);
    if (K.crown) {
      Utils.font(ctx, Math.round(K.r * 0.55));
      ctx.fillText('👑', 0, -K.r * 0.95);
    }
    if (m.kind === 'wolf' || m.kind === 'alphawolf' || m.kind === 'bear' || m.kind === 'cat' || m.kind === 'jaguar' || m.kind === 'fox' || m.kind === 'bat') {
      ctx.fillStyle = '#fff';
      const fy = K.r * 0.3, fx = K.r * 0.22, fs = Math.max(3, K.r * 0.11);
      ctx.beginPath();
      ctx.moveTo(-fx - fs, fy); ctx.lineTo(-fx + fs, fy); ctx.lineTo(-fx, fy + fs * 1.7);
      ctx.moveTo(fx - fs, fy); ctx.lineTo(fx + fs, fy); ctx.lineTo(fx, fy + fs * 1.7);
      ctx.fill();
    }
    if (G.phase === 'night' && m.provoked && !flee) {
      const ex = K.r * 0.28, ey = -K.r * 0.55, er = Math.max(2.5, K.r * 0.09);
      ctx.globalAlpha = 0.35 * baseAlpha;
      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.arc(-ex, ey, er * 2.2, 0, TAU);
      ctx.arc(ex, ey, er * 2.2, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = baseAlpha;
      ctx.beginPath();
      ctx.arc(-ex, ey, er, 0, TAU);
      ctx.arc(ex, ey, er, 0, TAU);
      ctx.fill();
    }
    if (m.tele > 0 || m.mode === 'tele' || m.mode === 'squash') {
      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.arc(-K.r * 0.3, -K.r * 0.35, K.r * 0.16, 0, TAU);
      ctx.arc(K.r * 0.3, -K.r * 0.35, K.r * 0.16, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(-K.r * 0.3, -K.r * 0.35, K.r * 0.34, 0, TAU);
      ctx.arc(K.r * 0.3, -K.r * 0.35, K.r * 0.34, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = baseAlpha;
    }
    if (m.hurtT > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 0, K.r, K.r * 0.82, 0, 0, TAU);
      ctx.fill();
    }
    if (!K.boss && m.hp < m.maxHp && !flee) {
      const w = K.r * 1.6;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-w / 2, -K.r - 16, w, 6);
      ctx.fillStyle = '#7ed37e';
      ctx.fillRect(-w / 2, -K.r - 16, w * Math.max(0, m.hp / m.maxHp), 6);
    }
    ctx.globalAlpha = baseAlpha;
    drawBadge(ctx, -K.r - 48, MNAMES[m.kind] || m.kind, K.emoji, emotionOf(m));
    ctx.restore();
  }

  function drawBatFallback(ctx, m, K) {
    const r = K.r;
    const flap = Math.sin(m.animT * 14);
    ctx.strokeStyle = Utils.shade(K.color, -0.28);
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.18, r * 0.32);
    ctx.lineTo(-r * 0.22, r * 0.98);
    ctx.moveTo(r * 0.18, r * 0.32);
    ctx.lineTo(r * 0.22, r * 0.98);
    ctx.stroke();
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-r * 0.22, r * 0.98);
    ctx.lineTo(-r * 0.34, r * 1.05);
    ctx.moveTo(r * 0.22, r * 0.98);
    ctx.lineTo(r * 0.34, r * 1.05);
    ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(s * r * 0.12, -r * 0.12);
      ctx.rotate(s * (0.18 + flap * 0.5));
      ctx.fillStyle = K.belly;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(s * r * 0.45, -r * 0.9 - flap * r * 0.18);
      ctx.lineTo(s * r * 1.75, -r * 0.1);
      ctx.lineTo(s * r * 1.5, r * 0.6);
      ctx.lineTo(s * r * 0.65, r * 1.0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = Utils.shade(K.color, -0.22);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(s * r * 0.45, -r * 0.9 - flap * r * 0.18);
      ctx.moveTo(0, 0);
      ctx.lineTo(s * r * 1.75, -r * 0.1);
      ctx.moveTo(0, 0);
      ctx.lineTo(s * r * 1.5, r * 0.6);
      ctx.moveTo(0, 0);
      ctx.lineTo(s * r * 0.65, r * 1.0);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = K.color;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.1, r * 0.4, r * 0.58, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = Utils.shade(K.color, -0.28);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.42, r * 0.48, r * 0.4, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.fillStyle = Utils.shade(K.color, -0.05);
      ctx.beginPath();
      ctx.moveTo(s * r * 0.06, -r * 0.68);
      ctx.lineTo(s * r * 0.36, -r * 1.22);
      ctx.lineTo(s * r * 0.44, -r * 0.52);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = Utils.shade(K.color, -0.38);
      ctx.beginPath();
      ctx.moveTo(s * r * 0.12, -r * 0.66);
      ctx.lineTo(s * r * 0.3, -r * 1.05);
      ctx.lineTo(s * r * 0.34, -r * 0.55);
      ctx.closePath();
      ctx.fill();
    }
    for (const s of [-1, 1]) {
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.beginPath();
      ctx.arc(s * r * 0.16, -r * 0.46, r * 0.22, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s * r * 0.16, -r * 0.46, r * 0.155, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = Utils.shade(K.color, -0.18);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.26, r * 0.13, r * 0.09, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1a0814';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.06, r * 0.15, r * 0.17, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-r * 0.08, -r * 0.14);
    ctx.lineTo(-r * 0.03, r * 0.05);
    ctx.lineTo(-r * 0.12, -r * 0.1);
    ctx.moveTo(r * 0.08, -r * 0.14);
    ctx.lineTo(r * 0.03, r * 0.05);
    ctx.lineTo(r * 0.12, -r * 0.1);
    ctx.fill();
  }

  function drawBat(ctx, m) {
    const K = m.k;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, K.r * 0.95, K.r * 1.1, K.r * 0.32, 0, 0, TAU);
    ctx.fill();
    const bob = Math.sin(m.animT * 3.2) * 6;
    ctx.translate(0, bob - 8);
    if (m.hurtT > 0) ctx.translate(Utils.rand(-2, 2), Utils.rand(-2, 2));
    const img = batImage(m);
    const dw = K.r * 5.2;
    const dh = img ? dw * (img.naturalHeight / img.naturalWidth) : K.r * 3.6;
    const foot = img ? dh * 0.80 : K.r * 1.08;
    ctx.save();
    if (m.dir < 0) ctx.scale(-1, 1);
    if (m.fleeing) ctx.rotate(0.22);
    if (img) {
      ctx.imageSmoothingEnabled = true;
      if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, -dw / 2, -foot, dw, dh);
      if (m.hurtT > 0) {
        ctx.globalAlpha = 0.5;
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(img, -dw / 2, -foot, dw, dh);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
    } else {
      drawBatFallback(ctx, m, K);
    }
    ctx.restore();
    if (m.hp < m.maxHp && !m.fleeing) {
      const w = K.r * 1.7;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-w / 2, -foot - 8, w, 6);
      ctx.fillStyle = '#7ed37e';
      ctx.fillRect(-w / 2, -foot - 8, w * Math.max(0, m.hp / m.maxHp), 6);
    }
    drawBadge(ctx, -foot - 40, MNAMES.bat, '🦇', emotionOf(m));
    ctx.restore();
  }

  function drawOne(ctx, m) {
    if (m.kind === 'snake') drawSnake(ctx, m);
    else if (m.kind === 'deer') drawDeer(ctx, m);
    else if (m.kind === 'bat') drawBat(ctx, m);
    else drawMon(ctx, m);
  }

  function draw(ctx) {
    for (const m of G.monsters) {
      if (m.dead) continue;
      if (m.x < G.cam.x - 150 || m.x > G.cam.x + Game.vw + 150 || m.y < G.cam.y - 150 || m.y > G.cam.y + Game.vh + 150) continue;
      drawOne(ctx, m);
    }
  }

  return { spawn, update, draw, drawOne, hurt, director, dawnSweep };
})();
