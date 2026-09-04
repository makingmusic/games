const NPCs = (() => {
  const SHOPS = {
    feather: {
      title: '🪶 Feather Trader',
      items: [
        { label: '10 coins', cost: { feathers: 5 }, give: { coins: 10 } },
        { label: '1 shiny gem 💎', cost: { feathers: 12 }, give: { gems: 1 } },
        { label: '3 trail snacks 🍒', cost: { feathers: 8 }, give: { food: 3 } },
      ],
    },
    salesman: {
      title: '💼 Salesman — here TODAY only!',
      items: [
        { label: 'Snack pack (5 food) 🍒', cost: { coins: 12 }, give: { food: 5 } },
        { label: 'Sharp Axe — double damage! 🪓', cost: { coins: 30 }, once: 'sharpAxe' },
        { label: 'Lantern — brighter nights 🏮', cost: { coins: 25 }, once: 'lantern' },
        { label: '3 shiny gems 💎', cost: { coins: 35 }, give: { gems: 3 } },
      ],
    },
    pelt: {
      title: '🐾 Pelt Trader — powers for pelts!',
      items: [
        { label: 'Flashlight — see farther at night 🔦', cost: { pelt: 3 }, once: 'torch' },
        { label: 'Warm Blanket — hunger drains slower 🧣', cost: { pelt: 3 }, once: 'blanket' },
        { label: 'Swift Boots — run 15% faster 🥾', cost: { pelt: 4 }, once: 'boots' },
        { label: 'Star Whistle — kids attack faster ⭐', cost: { pelt: 4 }, once: 'whistle' },
        { label: 'Heart Locket — +1 max heart ❤️', cost: { pelt: 5 }, power: 'heart' },
      ],
    },
  };

  function kidById(id) {
    return G.kids.find((k) => k.id === id);
  }

  function slot(i) {
    const a = (i / 4) * TAU + 0.8;
    return { x: CFG.CAMP.x + Math.cos(a) * 92, y: CFG.CAMP.y + Math.sin(a) * 92 };
  }

  function homeSlot(kid) {
    return slot(G.kids.indexOf(kid));
  }

  function canAfford(cost) {
    for (const k in cost) if ((G.inv[k] || 0) < cost[k]) return false;
    return true;
  }

  function pay(cost) {
    for (const k in cost) G.inv[k] -= cost[k];
  }

  const POWER_MSGS = {
    torch: 'Flashlight got! You see farther at night! 🔦',
    blanket: 'Warm Blanket got! Hunger drains slower! 🧣',
    boots: 'Swift Boots got! You run faster! 🥾',
    whistle: 'Star Whistle got! Kids attack faster! ⭐',
  };

  function buy(shopId, idx) {
    const shop = SHOPS[shopId];
    if (!shop || !shop.items[idx]) return;
    const item = shop.items[idx];
    if (item.once && G[item.once]) {
      UI.toast('You already have it!');
      return;
    }
    if (!canAfford(item.cost)) {
      UI.toast("Can't afford that yet! Hunt furry animals for pelts 🐾");
      return;
    }
    pay(item.cost);
    if (item.once) {
      G[item.once] = true;
      UI.toast(POWER_MSGS[item.once] || (item.once === 'sharpAxe' ? 'Sharp Axe got! Double damage! 🪓' : 'Lantern got! Brighter nights! 🏮'));
    }
    if (item.power === 'heart') {
      G.player.maxHp++;
      G.player.hp = G.player.maxHp;
      UI.toast('Heart Locket! +1 max heart! ❤️');
      Effects.heart(G.player.x, G.player.y - 30);
    }
    if (item.give) for (const k in item.give) addInv(k, item.give[k]);
    Sfx.sfx('coin');
    Effects.text(G.player.x, G.player.y - 40, 'Sold!', '#ffd54f', 18);
  }

  function rescue(kid, cave) {
    kid.rescued = true;
    kid.order = ++G.stats.order;
    kid.x = cave.cage.x;
    kid.y = cave.cage.y + 10;
    G.stats.rescued++;
    Effects.stars(cave.cage.x, cave.cage.y, 14);
    Sfx.sfx('rescue');
    UI.banner('You rescued ' + kid.name + '!', kid.name + ' joins your team and throws stars!');
    if (G.kids.every((k) => k.rescued)) {
      G.deerCountdown = 2;
      UI.toast('You hear giant hooves... 🦌');
    }
  }

  function tryInteract() {
    const p = G.player;
    for (const cave of G.caves) {
      const kid = kidById(cave.kidId);
      if (!kid.rescued && Utils.dist(p.x, p.y, cave.cage.x, cave.cage.y) < 85) {
        if (cave.guards.every((g) => g.dead || g.fleeing)) rescue(kid, cave);
        else UI.toast('Defeat the guards first! ⚔️');
        return true;
      }
    }
    if (G.salesman && Utils.dist(p.x, p.y, G.salesman.x, G.salesman.y) < 100) {
      UI.openTrade('salesman');
      return true;
    }
    if (Utils.dist(p.x, p.y, G.props.featherTrader.x, G.props.featherTrader.y) < 100) {
      UI.openTrade('feather');
      return true;
    }
    if (Utils.dist(p.x, p.y, G.props.peltTrader.x, G.props.peltTrader.y) < 100) {
      UI.openTrade('pelt');
      return true;
    }
    if (Utils.dist(p.x, p.y, CFG.CAMP.x, CFG.CAMP.y) < 115) {
      World.feedFire();
      return true;
    }
    for (const b of G.bushes) {
      if (b.berries > 0 && Utils.dist(p.x, p.y, b.x, b.y) < 58) {
        b.berries--;
        addInv('food', 1);
        Sfx.sfx('pickup');
        Effects.leaf(b.x, b.y - 12, '#e8607a');
        Effects.text(b.x, b.y - 26, '+1 🍒', '#f8bbd0', 16);
        if (b.berries === 0) b.next = G.t + (CFG.KID_MODE ? 40 : 75);
        return true;
      }
    }
    return false;
  }

  function currentPrompt() {
    const p = G.player;
    for (const cave of G.caves) {
      const kid = kidById(cave.kidId);
      if (!kid.rescued && Utils.dist(p.x, p.y, cave.cage.x, cave.cage.y) < 110) {
        if (!cave.guards.every((g) => g.dead || g.fleeing)) return 'Defeat the guards to save ' + kid.name + '!';
        return CFG.KID_MODE ? 'Walk up to free ' + kid.name + '! (auto!)' : 'Press E — Rescue ' + kid.name + '!';
      }
    }
    if (G.salesman && Utils.dist(p.x, p.y, G.salesman.x, G.salesman.y) < 110) return 'Press E — Shop the Salesman 💼';
    if (Utils.dist(p.x, p.y, G.props.featherTrader.x, G.props.featherTrader.y) < 110) return 'Press E — Trade feathers 🪶';
    if (Utils.dist(p.x, p.y, G.props.peltTrader.x, G.props.peltTrader.y) < 110) return 'Press E — Trade pelts for powers 🐾';
    if (Utils.dist(p.x, p.y, CFG.CAMP.x, CFG.CAMP.y) < 125) {
      return 'E — Feed fire 🪵 (' + G.inv.wood + ')   ·   U — Upgrade 🔥 Lv' + G.fire.level;
    }
    if (Utils.dist(p.x, p.y, G.props.board.x, G.props.board.y) < 120) return 'Press B — Missing kids board 🪧';
    for (const b of G.bushes) {
      if (b.berries > 0 && Utils.dist(p.x, p.y, b.x, b.y) < 70) return CFG.KID_MODE ? 'Yum — cherries auto-pick!' : 'Press E — Pick berries';
    }
    return null;
  }

  const HUG_LINES = [
    'hug attack!',
    'you are brave!',
    'thank you!',
    'best rescuer!',
  ];

  function sticker(id, msg) {
    G.stats.stickers = G.stats.stickers || {};
    if (G.stats.stickers[id]) return;
    G.stats.stickers[id] = true;
    UI.toast('Sticker earned: ' + msg);
    Effects.stars(G.player.x, G.player.y - 20, 12);
    Sfx.sfx('star');
  }

  function celebrateHome(kid) {
    kid.home = true;
    UI.toast(kid.name + ' is safe at camp!');
    Effects.stars(kid.x, kid.y, 14);
    Effects.ring(CFG.CAMP.x, CFG.CAMP.y, '#ffd54f');
    for (let i = 0; i < 3; i++) Effects.heart(kid.x + Utils.rand(-20, 20), kid.y - 26);
    Sfx.sfx('upgrade');
    if (G.kids.every((k) => k.home)) {
      UI.banner('All kids are home!', 'Now defeat the Deer to win!');
    }
    sticker('home_' + kid.id, kid.name + ' brought home!');
  }

  function autoPickBerries(dt) {
    const p = G.player;
    for (const b of G.bushes) {
      if (b.berries <= 0) continue;
      if (Utils.dist(p.x, p.y, b.x, b.y) < 72) {
        b.autoT = (b.autoT || 0) + dt;
        if (b.autoT > 0.22) {
          b.autoT = 0;
          b.berries--;
          addInv('food', 1);
          Sfx.sfx('pickup');
          Effects.leaf(b.x, b.y - 12, '#e8607a');
          Effects.text(b.x, b.y - 26, '+1 cherry', '#f8bbd0', 16);
          sticker('berries', 'First snack picked!');
          if (b.berries === 0) b.next = G.t + (CFG.KID_MODE ? 40 : 75);
        }
      } else {
        b.autoT = 0;
      }
    }
  }

  function autoRescue() {
    if (!CFG.KID_MODE) return;
    const p = G.player;
    for (const cave of G.caves) {
      const kid = kidById(cave.kidId);
      if (!kid || kid.rescued) continue;
      if (!cave.guards.every((g) => g.dead || g.fleeing)) continue;
      if (Utils.dist(p.x, p.y, cave.cage.x, cave.cage.y) < 95) {
        rescue(kid, cave);
        Effects.text(cave.cage.x, cave.cage.y - 40, 'Freed!', '#a5d6a7', 18);
      }
    }
  }

  function hugAura(dt) {
    if (!CFG.KID_MODE) return;
    const p = G.player;
    G.hugCd = Math.max(0, (G.hugCd || 0) - dt);
    if (G.hugCd > 0 || p.hp >= p.maxHp) return;
    const near = G.kids.find((k) => k.rescued && Utils.dist(p.x, p.y, k.x, k.y) < 95);
    if (near) {
      G.hugCd = 15;
      p.hp = Math.min(p.maxHp, p.hp + 1);
      Effects.heart(p.x, p.y - 30);
      Effects.heart(near.x, near.y - 30);
      Effects.text(p.x, p.y - 48, near.name + ': ' + Utils.choice(HUG_LINES), '#f8bbd0', 15);
      Sfx.sfx('eat');
      sticker('hug', 'First hug!');
    }
  }

  function checkStickers() {
    if (G.stats.chopped >= 1) sticker('chop', 'First tree chopped!');
    if (G.stats.coinsEarned >= 1) sticker('coins', 'First coins found!');
    if ((G.inv.pelt || 0) >= 1) sticker('pelt', 'Lucky pelt! Trade it for powers!');
    if (G.torch || G.boots || G.blanket || G.whistle) sticker('power', 'First power earned!');
    if (G.stats.rescued >= 1) sticker('rescue', 'First kid rescued!');
    if (G.stats.rescued >= 4) sticker('heroes', 'All 4 kids rescued!');
    if (G.fire.level >= 2) sticker('fire2', 'Campfire Level 2!');
  }
  function kidCombat(dt) {
    for (const kid of G.kids) {
      if (!kid.rescued) continue;
      kid.atkCd = Math.max(0, (kid.atkCd || 0) - dt);
      if (kid.atkCd > 0) continue;
      const range = kid.home ? 430 : 380;
      let best = null, bd = range;
      for (const m of G.monsters) {
        if (m.dead || m.fleeing || m.hidden) continue;
        const d = Utils.dist(kid.x, kid.y, m.x, m.y);
        if (d < bd) { bd = d; best = { kind: 'm', ref: m }; }
      }
      if (!best) {
        for (const c of G.cultists) {
          if (c.dead) continue;
          const d = Utils.dist(kid.x, kid.y, c.x, c.y);
          if (d < bd) { bd = d; best = { kind: 'c', ref: c }; }
        }
      }
      if (best) {
        const t = best.ref;
        Projectiles.spawn(kid.x, kid.y - 12, Utils.ang(kid.x, kid.y, t.x, t.y), 'star', 'kid');
        Sfx.sfx('shoot');
        Effects.stars(kid.x, kid.y - 20, 3);
        kid.atkCd = (kid.home ? 1.4 : 1.1) * (G.whistle ? 0.7 : 1);
        sticker('team', kid.name + ' fights with you!');
      }
    }
  }

  function onNewDay() {
    if (G.day === 20 && !G.salesman) {
      G.salesman = { x: CFG.CAMP.x + 165, y: CFG.CAMP.y - 55 };
      UI.banner('The Salesman is here! 💼', 'Day 20 only — press E near him to shop');
      Effects.ring(G.salesman.x, G.salesman.y, '#ffe082');
    }
  }

  function update(dt) {
    const p = G.player;
    autoPickBerries(dt);
    autoRescue();
    hugAura(dt);
    kidCombat(dt);
    checkStickers();
    if (G.salesman && G.phase === 'night') {
      Effects.poof(G.salesman.x, G.salesman.y, '#cfd8dc', 8);
      G.salesman = null;
      UI.toast('The Salesman packed up for the night.');
    }
    const chain = G.kids.filter((k) => k.rescued && !k.home).sort((a, b) => a.order - b.order);
    let prev = { x: p.x, y: p.y };
    for (const kid of chain) {
      if (kid.fleeHome) {
        const s = homeSlot(kid);
        const d = Utils.dist(kid.x, kid.y, s.x, s.y);
        if (d < 24) {
          kid.fleeHome = false;
          celebrateHome(kid);
        } else {
          const a = Utils.ang(kid.x, kid.y, s.x, s.y);
          kid.x += Math.cos(a) * 280 * dt;
          kid.y += Math.sin(a) * 280 * dt;
          kid.fx = Math.cos(a) >= 0 ? 1 : -1;
        }
      } else {
        const d = Utils.dist(kid.x, kid.y, prev.x, prev.y);
        if (d > 40) {
          const a = Utils.ang(kid.x, kid.y, prev.x, prev.y);
          const spd = Utils.clamp((d - 36) * 8, 0, 300);
          kid.x += Math.cos(a) * spd * dt;
          kid.y += Math.sin(a) * spd * dt;
          kid.fx = Math.cos(a) >= 0 ? 1 : -1;
        }
        if (Utils.dist(kid.x, kid.y, CFG.CAMP.x, CFG.CAMP.y) < 240) {
          celebrateHome(kid);
        }
      }
      prev = kid;
    }
    for (const kid of G.kids) {
      kid.bob += dt;
      if (kid.home) {
        const s = homeSlot(kid);
        kid.x = s.x + Math.sin(kid.bob * 0.7 + kid.order) * 14;
        kid.y = s.y + Math.cos(kid.bob * 0.5 + kid.order) * 10;
        if (Math.random() < dt * 0.15) Effects.heart(kid.x, kid.y - 26);
      }
    }
  }

  function drawKid(ctx, kid) {
    ctx.save();
    ctx.translate(kid.x, kid.y);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 12, 11, 4, 0, 0, TAU);
    ctx.fill();
    let bounce = 0, tilt = 0;
    if (kid.home) {
      bounce = Math.abs(Math.sin(kid.bob * 4)) * -6;
      tilt = Math.sin(kid.bob * 4) * 0.18;
    } else if (kid.rescued) {
      bounce = Math.abs(Math.sin(kid.bob * 7)) * -3;
    } else {
      tilt = Math.sin(kid.bob * 2) * 0.06;
    }
    ctx.rotate(tilt);
    ctx.translate(0, bounce);
    ctx.scale(kid.fx || 1, 1);
    ctx.strokeStyle = Utils.shade(kid.color, -0.4);
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, 5); ctx.lineTo(-4, 11);
    ctx.moveTo(4, 5); ctx.lineTo(4, 11);
    ctx.stroke();
    ctx.fillStyle = kid.color;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = Utils.shade(kid.color, -0.3);
    ctx.lineWidth = 2;
    ctx.stroke();
    Utils.font(ctx, 14);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(kid.emoji, 0, -1);
    if (!kid.rescued) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(6, -26, 16, 13, 4);
      ctx.fill();
      Utils.font(ctx, 10);
      ctx.fillStyle = '#c0392b';
      ctx.fillText('!', 14, -20);
    } else {
      Utils.font(ctx, 11);
      ctx.fillText('⭐', 12, -18);
    }
    ctx.restore();
  }

  function drawTrader(ctx, x, y, hat, label, near) {
    ctx.save();
    ctx.translate(x, y - 14);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 28, 13, 5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.roundRect(-11, -4, 22, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#f5c396';
    ctx.beginPath();
    ctx.arc(0, -12, 9, 0, TAU);
    ctx.fill();
    Utils.font(ctx, 13);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hat, 0, -13);
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.arc(-3, -10, 1.2, 0, TAU);
    ctx.arc(3, -10, 1.2, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -8, 2.6, 0.2, Math.PI - 0.2);
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    if (near) {
      ctx.fillStyle = 'rgba(20,24,34,0.85)';
      ctx.beginPath();
      ctx.roundRect(-52, -52, 104, 22, 8);
      ctx.fill();
      Utils.font(ctx, 13);
      ctx.fillStyle = '#ffe082';
      ctx.fillText(label, 0, -41);
    }
    ctx.restore();
  }

  function pushEnts(ents, ctx) {
    const p = G.player;
    for (const kid of G.kids) {
      ents.push({ y: kid.y, f: () => drawKid(ctx, kid) });
    }
    if (G.salesman) {
      const s = G.salesman;
      ents.push({ y: s.y, f: () => drawTrader(ctx, s.x, s.y, '🎩', 'Salesman — Day 20 only', Utils.dist(p.x, p.y, s.x, s.y) < 160) });
    }
    const ft = G.props.featherTrader;
    ents.push({ y: ft.y + 20, f: () => drawTrader(ctx, ft.x, ft.y + 20, '🧢', 'Feather Trader', Utils.dist(p.x, p.y, ft.x, ft.y) < 160) });
    const pt = G.props.peltTrader;
    ents.push({ y: pt.y + 20, f: () => drawTrader(ctx, pt.x, pt.y + 20, '🎩', 'Pelt Trader — powers!', Utils.dist(p.x, p.y, pt.x, pt.y) < 160) });
  }

  return { SHOPS, update, pushEnts, tryInteract, currentPrompt, onNewDay, buy, kidById };
})();
