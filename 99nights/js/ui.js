const UI = (() => {
  const buttons = [];
  let confetti = [];
  const REASONS = {
    hurt: { emoji: '💔', title: 'Too many bonks!', tip: 'Eat berries, keep your distance, and fight near your campfire light.' },
    starve: { emoji: '🍽️', title: 'Out of snacks!', tip: 'Pick berries every day — meals near the fire fill you up more!' },
    forest: { emoji: '🌲', title: 'The forest kept them forever...', tip: 'Rescue all four kids before Night 99 ends.' },
  };
  const ICONS = { wood: '🪵', food: '🍒', feather: '🪶', feathers: '🪶', coins: '🪙', coin: '🪙', gems: '💎', gem: '💎', pelt: '🐾' };

  function reset() {
    confetti = [];
    buttons.length = 0;
  }

  function toast(msg, dur = 3.5) {
    G.ui.toasts.push({ msg, t: 0, dur });
    if (G.ui.toasts.length > 4) G.ui.toasts.shift();
  }

  function banner(title, sub = '', dur = 3) {
    G.ui.banners[0] = { title, sub, t: 0, dur };
  }

  function toggle(name) {
    G.ui.open = G.ui.open === name ? null : name;
    Input.clearPressed();
  }

  function closeOverlay() {
    G.ui.open = null;
  }

  function openTrade(shop) {
    G.ui.open = 'trade';
    G.ui.tradeShop = shop;
    Input.clearPressed();
  }

  function anyOverlay() {
    return !!G.ui.open;
  }

  function update(dt) {
    for (const t of G.ui.toasts) t.t += dt;
    G.ui.toasts = G.ui.toasts.filter((t) => t.t < t.dur);
    if (G.ui.banners[0]) {
      G.ui.banners[0].t += dt;
      if (G.ui.banners[0].t > G.ui.banners[0].dur) G.ui.banners.length = 0;
    }
    if (G.over && G.won) {
      if (confetti.length < 220) {
        for (let i = 0; i < 2; i++) {
          confetti.push({
            x: Utils.rand(0, Game.vw), y: -12,
            vx: Utils.rand(-30, 30), vy: Utils.rand(70, 160),
            c: Utils.choice(['#ffd54f', '#ff8a65', '#81c784', '#64b5f6', '#ba68c8']),
            rot: Utils.rand(0, TAU), vr: Utils.rand(-5, 5),
          });
        }
      }
      for (const c of confetti) {
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.rot += c.vr * dt;
      }
      confetti = confetti.filter((c) => c.y < Game.vh + 20);
    }
  }

  function act(id) {
    if (id === 'resume' || id === 'close') closeOverlay();
    else if (id === 'restart' || id === 'again') Game.newGame();
    else if (id === 'mute') {
      const m = Sfx.toggle();
      toast(m ? 'Sound off 🔇' : 'Sound on 🔊');
    } else if (id.indexOf('buy:') === 0) {
      const parts = id.split(':');
      NPCs.buy(parts[1], +parts[2]);
    }
  }

  function click(mx, my) {
    for (let i = buttons.length - 1; i >= 0; i--) {
      const b = buttons[i];
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        if (b.enabled) act(b.id);
        return true;
      }
    }
    return false;
  }

  function button(ctx, id, x, y, w, h, label, enabled = true, size = 20) {
    buttons.push({ id, x, y, w, h, enabled });
    ctx.fillStyle = enabled ? '#f4a938' : '#4a5468';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = enabled ? '#c47f1e' : '#39415226';
    ctx.lineWidth = 2;
    ctx.stroke();
    Utils.font(ctx, size);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = enabled ? '#2b1c0d' : '#aab4c8';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  }

  function panel(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(24,28,40,0.97)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 18);
    ctx.fill();
    ctx.strokeStyle = '#f4a938';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function heartPath(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.35);
    ctx.bezierCurveTo(x - s * 1.1, y - s * 0.5, x - s * 0.55, y - s * 1.15, x, y - s * 0.5);
    ctx.bezierCurveTo(x + s * 0.55, y - s * 1.15, x + s * 1.1, y - s * 0.5, x, y + s * 0.35);
    ctx.closePath();
  }

  function drawHeart(ctx, x, y, s, f) {
    heartPath(ctx, x, y, s);
    ctx.fillStyle = '#2a2f3e';
    ctx.fill();
    if (f > 0) {
      ctx.save();
      heartPath(ctx, x, y, s);
      ctx.clip();
      ctx.fillStyle = '#ef4056';
      ctx.fillRect(x - s * 1.2, y - s * 1.3, s * 2.4 * f, s * 2.8);
      ctx.restore();
    }
    heartPath(ctx, x, y, s);
    ctx.strokeStyle = '#0e1119';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function arrow(ctx, x, y, a, s, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = color || '#ffd54f';
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(-s * 0.7, s * 0.75);
    ctx.lineTo(0, s * 0.35);
    ctx.lineTo(s * 0.7, s * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawHUD(ctx, vw, vh) {
    for (let i = 0; i < G.player.maxHp; i++) {
      drawHeart(ctx, 36 + i * 36, 34, 13, Utils.clamp(G.player.hp - i, 0, 1));
    }
    const lowH = G.player.hunger < 25;
    ctx.globalAlpha = lowH ? 0.6 + Math.sin(G.t * 6) * 0.4 : 1;
    Utils.font(ctx, 22);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🍗', 38, 72);
    ctx.fillStyle = 'rgba(14,17,25,0.8)';
    ctx.beginPath();
    ctx.roundRect(58, 62, 210, 20, 10);
    ctx.fill();
    ctx.fillStyle = '#ff9800';
    ctx.beginPath();
    ctx.roundRect(60, 64, Math.max(2, 206 * (G.player.hunger / 100)), 16, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(58, 62, 210, 20, 10);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const night = G.phase === 'night';
    ctx.fillStyle = 'rgba(14,17,25,0.8)';
    ctx.beginPath();
    ctx.roundRect(vw / 2 - 105, 12, 210, 46, 14);
    ctx.fill();
    if (G.day >= 95) {
      ctx.strokeStyle = Math.sin(G.t * 6) > 0 ? '#ff5252' : '#ffab91';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(vw / 2 - 105, 12, 210, 46, 14);
      ctx.stroke();
    }
    Utils.font(ctx, 22);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe082';
    ctx.fillText((night ? '🌙 Night ' : '☀️ Day ') + G.day, vw / 2, 32);
    const len = night ? CFG.NIGHT_LEN : CFG.DAY_LEN;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.roundRect(vw / 2 - 88, 46, 176, 6, 3);
    ctx.fill();
    ctx.fillStyle = night ? '#7986cb' : '#ffd54f';
    ctx.beginPath();
    ctx.roundRect(vw / 2 - 88, 46, Math.max(2, 176 * Utils.clamp(G.phaseT / len, 0, 1)), 6, 3);
    ctx.fill();
    if (G.day >= 95) {
      Utils.font(ctx, 13);
      ctx.fillStyle = '#ff8a80';
      ctx.fillText((CFG.MAX_DAY - G.day + 1) + ' nights left to save the kids!', vw / 2, 76);
    }

    const chips = [['🪵', G.inv.wood], ['🍒', G.inv.food], ['🪶', G.inv.feathers], ['🐾', G.inv.pelt || 0], ['🪙', G.inv.coins], ['💎', G.inv.gems]];
    chips.forEach((ch, i) => {
      const x = vw - 24 - (chips.length - i) * 92;
      ctx.fillStyle = 'rgba(14,17,25,0.8)';
      ctx.beginPath();
      ctx.roundRect(x, 16, 86, 38, 12);
      ctx.fill();
      Utils.font(ctx, 20);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(ch[0], x + 12, 36);
      Utils.font(ctx, 19);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.fillText(String(ch[1]), x + 74, 36);
    });

    const f = G.fire;
    ctx.textAlign = 'left';
    Utils.font(ctx, 24);
    ctx.fillText(f.fuel > 0 ? '🔥' : '🌑', 34, vh - 56);
    Utils.font(ctx, 17);
    ctx.fillStyle = '#ffe082';
    ctx.fillText('Lv ' + f.level + (f.level >= 6 ? ' 👑' : ''), 64, vh - 80);
    ctx.fillStyle = 'rgba(14,17,25,0.8)';
    ctx.beginPath();
    ctx.roundRect(64, vh - 64, 170, 14, 7);
    ctx.fill();
    const fuelK = f.fuel / World.fireMax();
    if (f.fuel > 0) {
      ctx.fillStyle = fuelK > 0.4 ? '#ff9800' : Math.sin(G.t * 8) > 0 ? '#ff5252' : '#ff8a80';
      ctx.beginPath();
      ctx.roundRect(66, vh - 62, Math.max(3, 166 * Utils.clamp(fuelK, 0.02, 1)), 10, 5);
      ctx.fill();
    } else {
      Utils.font(ctx, 13);
      ctx.fillStyle = '#ff8a80';
      ctx.fillText('OUT — feed it wood!', 70, vh - 57);
    }

    const prompt = NPCs.currentPrompt();
    if (prompt) {
      Utils.font(ctx, 20);
      const w = ctx.measureText(prompt).width + 44;
      ctx.fillStyle = 'rgba(14,17,25,0.85)';
      ctx.beginPath();
      ctx.roundRect(vw / 2 - w / 2, vh - 58, w, 42, 14);
      ctx.fill();
      ctx.strokeStyle = 'rgba(244,169,56,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffe082';
      ctx.textAlign = 'center';
      ctx.fillText(prompt, vw / 2, vh - 36);
    }

    if (G.deer && !G.deer.dead) {
      const w = 460;
      ctx.fillStyle = 'rgba(14,17,25,0.85)';
      ctx.beginPath();
      ctx.roundRect(vw / 2 - w / 2, 88, w, 26, 10);
      ctx.fill();
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.roundRect(vw / 2 - w / 2 + 3, 91, Math.max(3, (w - 6) * Utils.clamp(G.deer.hp / G.deer.maxHp, 0, 1)), 20, 8);
      ctx.fill();
      Utils.font(ctx, 15);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText('🦌 THE DEER', vw / 2, 101);
      const sx = G.deer.x - G.cam.x, sy = G.deer.y - G.cam.y;
      if (sx < 30 || sx > vw - 30 || sy < 30 || sy > vh - 30) {
        const cx = Utils.clamp(sx, 50, vw - 50), cy = Utils.clamp(sy, 60, vh - 60);
        const a = Utils.ang(vw / 2, vh / 2, sx, sy);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(a);
        ctx.fillStyle = '#e53935';
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(-8, -14);
        ctx.lineTo(-8, 14);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        Utils.font(ctx, 20);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🦌', cx - Math.cos(a) * 36, cy - Math.sin(a) * 36);
      }
    }

    let danger = false;
    for (const m of G.monsters) {
      if (!m.dead && !m.fleeing && Utils.dist(m.x, m.y, G.player.x, G.player.y) < 260) { danger = true; break; }
    }
    if (!danger) {
      for (const c of G.cultists) {
        if (!c.dead && Utils.dist(c.x, c.y, G.player.x, G.player.y) < 300) { danger = true; break; }
      }
    }
    if (danger) {
      const a = 0.2 + Math.sin(G.t * 6) * 0.1;
      ctx.strokeStyle = 'rgba(229,57,53,' + a.toFixed(3) + ')';
      ctx.lineWidth = 26;
      ctx.strokeRect(0, 0, vw, vh);
    }
  }

  function drawToasts(ctx, vw) {
    let y = G.deer && !G.deer.dead ? 130 : 92;
    for (const t of G.ui.toasts) {
      const k = Math.min(1, t.t / 0.2) * Math.min(1, (t.dur - t.t) / 0.4);
      ctx.globalAlpha = Utils.clamp(k, 0, 1);
      Utils.font(ctx, 17);
      const w = ctx.measureText(t.msg).width + 36;
      ctx.fillStyle = 'rgba(14,17,25,0.85)';
      ctx.beginPath();
      ctx.roundRect(vw / 2 - w / 2, y, w, 34, 12);
      ctx.fill();
      ctx.fillStyle = '#e8eaf6';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.msg, vw / 2, y + 18);
      y += 42;
    }
    ctx.globalAlpha = 1;
  }

  function drawBanner(ctx, vw, vh) {
    const b = G.ui.banners[0];
    if (!b) return;
    const k = Math.min(1, b.t / 0.25) * Math.min(1, Math.max(0, b.dur - b.t) / 0.5);
    ctx.globalAlpha = Utils.clamp(k, 0, 1);
    Utils.font(ctx, 46);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(b.title, vw / 2 + 2, vh * 0.3 + 2);
    ctx.fillStyle = '#ffd54f';
    ctx.fillText(b.title, vw / 2, vh * 0.3);
    if (b.sub) {
      Utils.font(ctx, 22);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(b.sub, vw / 2 + 2, vh * 0.3 + 40);
      ctx.fillStyle = '#e8eaf6';
      ctx.fillText(b.sub, vw / 2, vh * 0.3 + 38);
    }
    ctx.globalAlpha = 1;
  }

  function drawPause(ctx, vw, vh) {
    panel(ctx, vw / 2 - 290, vh / 2 - 220, 580, 440);
    Utils.font(ctx, 34);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe082';
    ctx.fillText('⏸ Paused', vw / 2, vh / 2 - 170);
    const lines = [
      'Move — WASD / Arrow keys',
      'Chop & attack — SPACE or click',
      'Interact — E  ·  Eat — F',
      'Upgrade fire — U (stand at fire)',
      'Kids board — B  ·  Backpack — I',
      'Mute — M',
    ];
    Utils.font(ctx, 19);
    ctx.fillStyle = '#cfd8dc';
    lines.forEach((l, i) => ctx.fillText(l, vw / 2, vh / 2 - 115 + i * 32));
    button(ctx, 'resume', vw / 2 - 195, vh / 2 + 100, 175, 46, 'Resume (Esc)');
    button(ctx, 'restart', vw / 2 + 20, vh / 2 + 100, 175, 46, 'Restart');
    button(ctx, 'mute', vw / 2 - 87, vh / 2 + 158, 175, 46, 'Mute (M)');
  }

  function drawInventory(ctx, vw, vh) {
    panel(ctx, vw / 2 - 330, vh / 2 - 230, 660, 460);
    Utils.font(ctx, 30);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe082';
    ctx.fillText('🎒 Backpack', vw / 2, vh / 2 - 185);
    const items = [['🪵', 'Wood', G.inv.wood], ['🍒', 'Food', G.inv.food], ['🪶', 'Feathers', G.inv.feathers], ['🐾', 'Pelts', G.inv.pelt || 0], ['🪙', 'Coins', G.inv.coins], ['💎', 'Gems', G.inv.gems]];
    items.forEach((it, i) => {
      const x = vw / 2 - 312 + i * 104;
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.beginPath();
      ctx.roundRect(x, vh / 2 - 140, 96, 96, 12);
      ctx.fill();
      Utils.font(ctx, 34);
      ctx.fillText(it[0], x + 48, vh / 2 - 105);
      Utils.font(ctx, 24);
      ctx.fillStyle = '#fff';
      ctx.fillText(String(it[2]), x + 48, vh / 2 - 62);
    });
    const tips = [
      'Chop trees for wood 🪵 — feed the campfire at night!',
      'Owls drop feathers 🪶 — trade them at the forest stall!',
      'Cultists drop coins & gems — upgrade your fire 🔥',
      'Rescue all 4 kids, then beat the Deer to win! 🦌',
    ];
    Utils.font(ctx, 18);
    ctx.fillStyle = '#9fa8ba';
    tips.forEach((t2, i) => ctx.fillText(t2, vw / 2, vh / 2 + 6 + i * 30));
    button(ctx, 'close', vw / 2 - 90, vh / 2 + 140, 180, 46, 'Close (I)');
  }

  function drawBoardPanel(ctx, vw, vh) {
    panel(ctx, vw / 2 - 350, vh / 2 - 260, 700, 520);
    Utils.font(ctx, 30);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe082';
    ctx.fillText('🪧 Missing Kids Board', vw / 2, vh / 2 - 215);
    const p = G.player;
    G.kids.forEach((kid, i) => {
      const y = vh / 2 - 165 + i * 82;
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.roundRect(vw / 2 - 325, y - 32, 650, 68, 12);
      ctx.fill();
      Utils.font(ctx, 34);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(kid.emoji, vw / 2 - 305, y);
      Utils.font(ctx, 23);
      ctx.fillStyle = '#fff';
      ctx.fillText(kid.name, vw / 2 - 250, y);
      if (kid.home) {
        ctx.fillStyle = '#a5d6a7';
        Utils.font(ctx, 21);
        ctx.textAlign = 'right';
        ctx.fillText('✅ Safe by the fire!', vw / 2 + 305, y);
      } else if (kid.rescued) {
        ctx.fillStyle = '#ffe082';
        Utils.font(ctx, 21);
        ctx.textAlign = 'right';
        ctx.fillText('✅ Following you home!', vw / 2 + 305, y);
      } else {
        const cave = G.caves.find((c) => c.kidId === kid.id);
        const a = Utils.ang(p.x, p.y, cave.x, cave.y);
        arrow(ctx, vw / 2 + 130, y, a, 20);
        Utils.font(ctx, 24);
        ctx.fillStyle = '#ffd54f';
        ctx.textAlign = 'left';
        ctx.fillText(Utils.meters(Utils.dist(p.x, p.y, cave.x, cave.y)) + ' m', vw / 2 + 170, y);
        Utils.font(ctx, 16);
        ctx.fillStyle = '#9fa8ba';
        ctx.textAlign = 'right';
        ctx.fillText(kid.biome.toUpperCase(), vw / 2 + 305, y);
      }
    });
    Utils.font(ctx, 16);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9fa8ba';
    ctx.fillText('Arrows point from where you stand. Walk to the cage and press E to rescue!', vw / 2, vh / 2 + 185);
    button(ctx, 'close', vw / 2 - 90, vh / 2 + 140, 180, 46, 'Close (B)');
  }

  function drawTrade(ctx, vw, vh) {
    const shop = NPCs.SHOPS[G.ui.tradeShop];
    if (!shop) {
      closeOverlay();
      return;
    }
    const h = 170 + shop.items.length * 78 + 100;
    panel(ctx, vw / 2 - 350, vh / 2 - h / 2, 700, h);
    Utils.font(ctx, 26);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe082';
    ctx.fillText(shop.title, vw / 2, vh / 2 - h / 2 + 46);
    Utils.font(ctx, 18);
    ctx.fillStyle = '#cfd8dc';
    ctx.fillText(`You have:   🪵 ${G.inv.wood}    🍒 ${G.inv.food}    🪶 ${G.inv.feathers}    🐾 ${G.inv.pelt || 0}    🪙 ${G.inv.coins}    💎 ${G.inv.gems}`, vw / 2, vh / 2 - h / 2 + 82);
    shop.items.forEach((item, i) => {
      const y = vh / 2 - h / 2 + 130 + i * 78;
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.beginPath();
      ctx.roundRect(vw / 2 - 325, y, 650, 64, 12);
      ctx.fill();
      Utils.font(ctx, 21);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText((i + 1) + '.  ' + item.label, vw / 2 - 305, y + 32);
      const cost = Object.entries(item.cost).map(([k, n]) => (ICONS[k] || k) + ' ×' + n).join('   ');
      Utils.font(ctx, 18);
      ctx.fillStyle = '#ffd54f';
      ctx.fillText(cost, vw / 2 - 305, y + 14);
      ctx.textBaseline = 'alphabetic';
      const owned = item.once && G[item.once];
      const afford = Object.entries(item.cost).every(([k, n]) => (G.inv[k] || 0) >= n);
      button(ctx, 'buy:' + G.ui.tradeShop + ':' + i, vw / 2 + 185, y + 11, 120, 42, owned ? 'OWNED' : 'Buy', !owned && afford, 19);
    });
    Utils.font(ctx, 15);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9fa8ba';
    ctx.fillText('Press 1–' + shop.items.length + ' to buy  ·  Esc closes', vw / 2, vh / 2 + h / 2 - 28);
  }

  function drawVictory(ctx, vw, vh) {
    const t = G.overT;
    const sky = ctx.createLinearGradient(0, 0, 0, vh);
    sky.addColorStop(0, '#141a33');
    sky.addColorStop(0.6, '#2a2350');
    sky.addColorStop(1, '#3a2a50');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, vw, vh);
    for (let i = 0; i < 70; i++) {
      const x = Utils.hash2(i, 1) * vw, y = Utils.hash2(i, 2) * vh * 0.7;
      ctx.globalAlpha = 0.3 + Math.sin(t * 2 + i) * 0.25;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const mg = ctx.createRadialGradient(vw * 0.82, vh * 0.16, 10, vw * 0.82, vh * 0.16, 90);
    mg.addColorStop(0, 'rgba(255,249,196,0.5)');
    mg.addColorStop(1, 'rgba(255,249,196,0)');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(vw * 0.82, vh * 0.16, 90, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff9c4';
    ctx.beginPath();
    ctx.arc(vw * 0.82, vh * 0.16, 34, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1d3b24';
    ctx.beginPath();
    ctx.ellipse(vw / 2, vh * 1.08, vw * 0.8, vh * 0.42, 0, 0, TAU);
    ctx.fill();
    const fx = vw / 2, fy = vh * 0.62;
    const fg = ctx.createRadialGradient(fx, fy, 10, fx, fy, 280);
    fg.addColorStop(0, 'rgba(255,213,79,0.55)');
    fg.addColorStop(1, 'rgba(255,213,79,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(fx, fy, 280, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(0.4);
    ctx.fillStyle = '#5d4027';
    ctx.fillRect(-34, -6, 68, 12);
    ctx.rotate(-0.8);
    ctx.fillRect(-34, -6, 68, 12);
    ctx.restore();
    const flick = Math.sin(t * 9) * 0.12;
    for (let i = 0; i < 3; i++) {
      const k = 1 - i * 0.25;
      ctx.fillStyle = i === 2 ? '#fff3c0' : '#ffd54f';
      ctx.globalAlpha = 0.95 - i * 0.1;
      ctx.beginPath();
      ctx.moveTo(fx - 26 * k, fy - 4);
      ctx.quadraticCurveTo(fx - 20 * k + flick * 8, fy - 60 * k, fx + flick * 10, fy - 95 * k);
      ctx.quadraticCurveTo(fx + 20 * k + flick * 8, fy - 60 * k, fx + 26 * k, fy - 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    G.kids.forEach((kid, i) => {
      const a = t * 0.5 + (i / 4) * TAU;
      const kx = fx + Math.cos(a) * 175;
      const ky = fy + 26 + Math.sin(a) * 58 - Math.abs(Math.sin(t * 5 + i)) * 16;
      Utils.font(ctx, 42);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(kid.emoji, kx, ky);
    });
    Utils.font(ctx, 44);
    ctx.fillText('🧒', fx - 120, fy - 20);
    Utils.font(ctx, 30);
    ctx.fillText('🪓', fx - 84, fy - 44);
    for (const c of confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.c;
      ctx.fillRect(-5, -3, 10, 6);
      ctx.restore();
    }
    Utils.font(ctx, 48);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText('🏆 YOU SAVED EVERYONE!', vw / 2 + 2, vh * 0.24 + 2);
    ctx.fillStyle = '#ffd54f';
    ctx.fillText('🏆 YOU SAVED EVERYONE!', vw / 2, vh * 0.24);
    Utils.font(ctx, 22);
    ctx.fillStyle = '#e8eaf6';
    ctx.fillText('All four kids are safe by the fire — and the Deer is gone for good!', vw / 2, vh * 0.24 + 44);
    Utils.font(ctx, 18);
    ctx.fillStyle = '#b8c4d8';
    ctx.fillText(`Days: ${G.day}  ·  Monsters scared off: ${G.stats.defeated}  ·  Trees chopped: ${G.stats.chopped}`, vw / 2, vh * 0.24 + 78);
    button(ctx, 'again', vw / 2 - 130, vh - 96, 260, 52, 'Play again (Enter)', true, 22);
  }

  function drawDefeat(ctx, vw, vh) {
    ctx.fillStyle = 'rgba(8,10,16,0.88)';
    ctx.fillRect(0, 0, vw, vh);
    panel(ctx, vw / 2 - 290, vh / 2 - 200, 580, 400);
    const r = REASONS[G.loseReason] || REASONS.hurt;
    Utils.font(ctx, 60);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(r.emoji, vw / 2, vh / 2 - 140);
    Utils.font(ctx, 36);
    ctx.fillStyle = '#ff8a80';
    ctx.fillText(r.title, vw / 2, vh / 2 - 78);
    Utils.font(ctx, 19);
    ctx.fillStyle = '#cfd8dc';
    ctx.fillText(r.tip, vw / 2, vh / 2 - 30);
    Utils.font(ctx, 17);
    ctx.fillStyle = '#9fa8ba';
    ctx.fillText(`You survived to Day ${G.day}  ·  Kids rescued: ${G.stats.rescued}/4`, vw / 2, vh / 2 + 8);
    button(ctx, 'again', vw / 2 - 130, vh / 2 + 60, 260, 52, 'Try again (Enter)', true, 22);
  }

  function draw(ctx) {
    buttons.length = 0;
    const vw = Game.vw, vh = Game.vh;
    if (G.over) {
      if (G.won) drawVictory(ctx, vw, vh);
      else drawDefeat(ctx, vw, vh);
      return;
    }
    drawHUD(ctx, vw, vh);
    if (G.ui.open) {
      ctx.fillStyle = 'rgba(6,8,16,0.6)';
      ctx.fillRect(0, 0, vw, vh);
      if (G.ui.open === 'pause') drawPause(ctx, vw, vh);
      else if (G.ui.open === 'inventory') drawInventory(ctx, vw, vh);
      else if (G.ui.open === 'board') drawBoardPanel(ctx, vw, vh);
      else if (G.ui.open === 'trade') drawTrade(ctx, vw, vh);
    }
    drawToasts(ctx, vw);
    drawBanner(ctx, vw, vh);
    Input.drawTouch(ctx);
  }

  return { reset, toast, banner, toggle, closeOverlay, openTrade, anyOverlay, update, click, draw };
})();
