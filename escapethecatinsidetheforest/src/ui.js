// DOM UI: screens, HUD, panels, touch controls, banners. Browser-only.
var G = globalThis.G || (globalThis.G = {});

(function () {
  const C = () => G.CONFIG, U = G.U;
  const $ = (id) => document.getElementById(id);

  const ui = {
    overlayOpen: false,   // any modal open → sim paused
    playing: false,
  };
  G.ui = ui;

  // iPad Safari never fires a synthetic click if some touchstart listener
  // called preventDefault (the document joystick handler used to do that on
  // the whole #game tree). Bind touchend + click, and ignore the ghost click.
  G.onTap = function (el, fn) {
    if (!el) return;
    let last = 0;
    const run = (e) => {
      if (e && e.cancelable) e.preventDefault();
      const now = performance.now();
      if (now - last < 400) return;
      last = now;
      fn(e);
    };
    el.addEventListener('touchend', run, { passive: false });
    el.addEventListener('click', run);
  };

  // ------------------------------------------------------------------ audio (WebAudio synth, gentle)
  let AC = null;
  ui.muted = false;
  function ensureAudio() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
    if (AC && AC.state === 'suspended') AC.resume();
  }
  ui.ensureAudio = ensureAudio;
  ui.toggleMute = function () {
    ui.muted = !ui.muted;
    return ui.muted;
  };
  function tone(type, f0, f1, dur, vol) {
    if (!AC || ui.muted) return;
    try {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, AC.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), AC.currentTime + dur);
      g.gain.setValueAtTime(vol, AC.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + dur);
      o.connect(g).connect(AC.destination);
      o.start(); o.stop(AC.currentTime + dur + 0.02);
    } catch (e) {}
  }
  G.sfx = function (name) {
    if (!AC || ui.muted) return;
    const S = {
      click: () => tone('square', 700, 500, 0.06, 0.03),
      swing: () => tone('sine', 300, 150, 0.08, 0.04),
      bonk: () => tone('square', 180, 80, 0.12, 0.06),
      clang: () => tone('square', 900, 700, 0.15, 0.04),
      chop: () => tone('square', 140, 60, 0.12, 0.06),
      pickup: () => tone('sine', 500, 900, 0.09, 0.05),
      gem: () => { tone('sine', 800, 1400, 0.12, 0.05); setTimeout(() => tone('sine', 1200, 1800, 0.1, 0.04), 70); },
      chomp: () => tone('sine', 350, 120, 0.1, 0.06),
      fire: () => tone('sine', 200, 340, 0.2, 0.04),
      squeal: () => tone('sawtooth', 900, 1400, 0.14, 0.035),
      shoo: () => { tone('sawtooth', 300, 120, 0.25, 0.045); },
      stomp: () => tone('sine', 120, 50, 0.16, 0.07),
      happy: () => { tone('sine', 523, 659, 0.12, 0.05); setTimeout(() => tone('sine', 659, 784, 0.14, 0.05), 110); },
      chime: () => { tone('sine', 659, 659, 0.2, 0.045); setTimeout(() => tone('sine', 880, 880, 0.25, 0.045), 160); },
      cozy: () => { tone('sine', 523, 523, 0.15, 0.05); setTimeout(() => tone('sine', 659, 659, 0.15, 0.05), 120); setTimeout(() => tone('sine', 784, 784, 0.2, 0.05), 240); },
      craft: () => tone('square', 400, 600, 0.12, 0.035),
      trade: () => tone('sine', 600, 800, 0.1, 0.045),
      cook: () => tone('sine', 250, 300, 0.18, 0.04),
      snip: () => tone('square', 800, 900, 0.05, 0.035),
    };
    (S[name] || (() => {}))();
  };

  // ------------------------------------------------------------------ screens
  function hideScreens() {
    for (const id of ['splash', 'title', 'howto', 'panel', 'defeat', 'win', 'pausemenu'])
      $(id).classList.add('hidden');
  }

  ui.showSplash = function () {
    hideScreens();
    $('splash').classList.remove('hidden');
  };

  ui.showTitle = function () {
    hideScreens();
    ui.playing = false;
    $('hud').classList.add('hidden');
    $('title').classList.remove('hidden');
    const hasSave = (typeof localStorage !== 'undefined') && !!localStorage.getItem(G.SAVE_KEY);
    $('btnContinue').classList.toggle('hidden', !hasSave);
  };

  ui.startGame = function (st) {
    hideScreens();
    G.state = st;
    ui.playing = true;
    ui.overlayOpen = false;
    $('hud').classList.remove('hidden');
    buildHotbar();
    ui.updateHUD(st);
  };

  // ------------------------------------------------------------------ panels (pause the sim while open — kind to kids)
  function openPanel(html, onOpen) {
    const p = $('panel');
    p.innerHTML = `<div class="panelBox">${html}</div>`;
    p.classList.remove('hidden');
    ui.overlayOpen = true;
    if (G.state) G.state.paused = true;
    onOpen && onOpen();
  }
  ui.closePanel = function () {
    $('panel').classList.add('hidden');
    ui.overlayOpen = false;
    if (G.state) { G.state.paused = false; G.save(G.state); }
  };

  // ---- trader panel (§12)
  G.openTrade = function (kind) {
    const st = G.state, c = C(), p = st.player;
    let rows = '';
    function row(item, name, desc, icon, can, action) {
      return `<div class="trow"><div class="ticon">${icon}</div><div class="tinfo"><b>${name}</b><span>${desc}</span></div>
        <button class="tbtn" data-act="${item}" ${can ? '' : 'disabled'}>Trade!</button></div>`;
    }
    if (kind === 'feather') {
      rows += row('fuelFur', 'Fuel', '1 Cat Fur → 1 Fuel', '🧶', p.inv.fur >= c.PRICES.fuel.fur);
      rows += row('fuelDia', 'Fuel', `2 Diamonds → 1 Fuel`, '💎', p.inv.diamond >= c.PRICES.fuelDiamond.diamond);
    } else {
      rows += row('flashlight', 'Flashlight', `${c.PRICES.flashlight.pelt} Pelts — the Cat HATES it!`, '🔦', !p.hasFlashlight && p.inv.pelt >= c.PRICES.flashlight.pelt);
      rows += row('iceAxe', 'Ice Axe', `${c.PRICES.iceAxe.pelt} Pelts or ${c.PRICES.iceAxe.diamond} 💎 — chops fast, frosty bonks`, '🪓', p.weapon === 'hands' && (p.inv.pelt >= c.PRICES.iceAxe.pelt || p.inv.diamond >= c.PRICES.iceAxe.diamond));
      rows += row('strongAxe', 'Strong Axe', `${c.PRICES.strongAxe.pelt} Pelts — the biggest bonk`, '⚒️', p.weapon !== 'strong' && p.inv.pelt >= c.PRICES.strongAxe.pelt);
      rows += row('peltCoat', 'Pelt Coat', `${c.PRICES.peltCoat.pelt} Pelts — warm in the snow`, '🧥', !p.coat && p.inv.pelt >= c.PRICES.peltCoat.pelt);
      rows += row('battery', 'Battery', `1 Pelt or 1 💎 — +${c.BATTERY_CHARGE} flashlight power`, '🔋', p.inv.pelt >= 1 || p.inv.diamond >= 1);
    }
    openPanel(`
      <h2>${kind === 'feather' ? '🐦 Feather Trader' : '🦝 Pelt Trader'}</h2>
      <p class="hint">You have: 🧶 ${p.inv.fur} fur • 🟫 ${p.inv.pelt} pelts • 💎 ${p.inv.diamond} diamonds</p>
      ${rows}
      <button class="closeBtn" onclick="G.ui.closePanel()">Bye bye!</button>`);
    $('panel').querySelectorAll('.tbtn').forEach(b => G.onTap(b, () => {
      const act = b.dataset.act;
      if (act === 'fuelFur') G.trade(st, 'feather', 'fuel', 'fur');
      else if (act === 'fuelDia') G.trade(st, 'feather', 'fuelD', 'diamond');
      else G.trade(st, 'pelt', act, p.inv.pelt >= priceOf(act).pelt ? 'pelt' : 'diamond');
      G.openTrade(kind); // refresh
    }));
    function priceOf(it) { return c.PRICES[it] || { pelt: 1 }; }
  };

  // ---- distance board (§11) — arrows + meters, live
  G.openBoard = function () {
    const st = G.state, p = st.player;
    function rowsHtml() {
      return G.CONFIG.KIDS.map(k => {
        const kid = st.kids.find(x => x.id === k.id);
        const ang = U.angleTo(p.x, p.y, k.x * C().TILE, k.y * C().TILE);
        const deg = Math.round(ang * 180 / Math.PI + 90);
        const m = Math.round(U.dist(p.x, p.y, k.x * C().TILE, k.y * C().TILE) / C().TILE);
        const icon = { kraken: '🐙', squid: '🦑', dino: '🦖', koala: '🐨' }[k.id];
        return `<div class="brow"><span class="bicon">${icon}</span><b>${k.name}</b>
          <span class="barrow" style="transform:rotate(${deg}deg)">➤</span>
          <span class="bm">${kid.rescued ? 'SAFE!' : m + ' m'}</span></div>`;
      }).join('');
    }
    openPanel(`<h2>🪧 The Kids Board</h2><div id="boardRows">${rowsHtml()}</div>
      <button class="closeBtn" onclick="G.ui.closePanel()">Got it!</button>`);
    ui.boardTimer = setInterval(() => {
      const el = $('boardRows');
      if (!el || $('panel').classList.contains('hidden')) { clearInterval(ui.boardTimer); return; }
      el.innerHTML = rowsHtml();
    }, 500);
  };

  // ---- fire menu (§13)
  G.openFireMenu = function () {
    const st = G.state, p = st.player, c = C();
    const lvl = Math.floor(st.fire.level);
    openPanel(`
      <h2>🔥 Campfire — level ${lvl} of ${c.FIRE_MAX_LEVEL}</h2>
      <p class="firepips">${'▮'.repeat(lvl)}${'▯'.repeat(c.FIRE_MAX_LEVEL - lvl)}</p>
      <div class="trow"><div class="ticon">🪵</div><div class="tinfo"><b>Add Wood</b><span>+1 level (you have ${p.inv.wood})</span></div>
        <button class="tbtn" id="addWood" ${p.inv.wood > 0 && lvl < 6 ? '' : 'disabled'}>Add!</button></div>
      <div class="trow"><div class="ticon">🧴</div><div class="tinfo"><b>Add Fuel</b><span>+2 levels (you have ${p.inv.fuel})</span></div>
        <button class="tbtn" id="addFuel" ${p.inv.fuel > 0 && lvl < 6 ? '' : 'disabled'}>Add!</button></div>
      <p class="hint">A level ${c.COOK_FIRE_LEVEL}+ fire cooks steaks automatically. Level 6 = COZY! ❤️</p>
      <button class="closeBtn" onclick="G.ui.closePanel()">Done!</button>`);
    G.onTap($('addWood'), () => { G.addFuelToFire(st, 'wood') && G.openFireMenu(); });
    G.onTap($('addFuel'), () => { G.addFuelToFire(st, 'fuel') && G.openFireMenu(); });
  };

  // ---- craft panel (§13)
  G.openCraft = function () {
    const st = G.state, p = st.player, c = C();
    const icons = { torch: '🕯️', fuel: '🧴', lantern: '🏮', battery3: '🔋' };
    const rows = c.RECIPES.map(r => {
      const cost = Object.entries(r.cost).map(([k, v]) => `${v} ${G.itemName(k)}`).join(' + ');
      const can = Object.entries(r.cost).every(([k, v]) => (p.inv[k] || 0) >= v);
      let extra = '';
      if (r.out === 'lantern') extra = ` (you have ${p.lanterns}/${c.LANTERN_MAX})`;
      if (r.out === 'torch') extra = ` (you have ${p.inv.torch})`;
      return `<div class="trow"><div class="ticon">${icons[r.out]}</div><div class="tinfo"><b>${r.name}${extra}</b><span>${cost}</span></div>
        <button class="tbtn" data-craft="${r.id}" ${can ? '' : 'disabled'}>Craft!</button></div>`;
    }).join('');
    openPanel(`<h2>🛠️ Crafting</h2>
      <p class="hint">🪵 ${p.inv.wood} wood • ⚙️ ${p.inv.scrap} scrap</p>${rows}
      <div class="trow"><div class="ticon">🕯️</div><div class="tinfo"><b>Light a Torch</b><span>warm + bright for ${c.TORCH_T}s (you have ${p.inv.torch})</span></div>
        <button class="tbtn" id="useTorch" ${p.inv.torch > 0 && p.torchT <= 0 ? '' : 'disabled'}>Light!</button></div>
      <button class="closeBtn" onclick="G.ui.closePanel()">Done!</button>`);
    $('panel').querySelectorAll('[data-craft]').forEach(b => G.onTap(b, () => {
      if (G.craft(st, b.dataset.craft)) G.openCraft();
    }));
    G.onTap($('useTorch'), () => { G.useTorch(st); G.openCraft(); });
  };

  // ---- gathering confirm (§15)
  G.confirmGathering = function () {
    openPanel(`<h2>🏮 The Biggest Temple</h2>
      <p>Pour the 4 Jungle Brews into the fountain?</p>
      <p class="hint">Tonight is <b>The Great Gathering</b>: animals from every biome come to drink.
      Keep them off the fountain until dawn! Your flashlight and torches are extra strong there.
      No need to worry — the Cat never comes to the party.</p>
      <button class="bigbtn" id="pourBtn">Pour the brews!</button>
      <button class="closeBtn" onclick="G.ui.closePanel()">Not yet</button>`);
    G.onTap($('pourBtn'), () => {
      G.startGathering(G.state);
      ui.closePanel();
    });
  };

  // ------------------------------------------------------------------ banners & toasts
  let bannerT = null;
  G.banner = function (msg, color) {
    const el = $('banner');
    el.textContent = msg;
    el.style.color = color || '#fff';
    el.classList.add('show');
    clearTimeout(bannerT);
    bannerT = setTimeout(() => el.classList.remove('show'), 2600);
  };

  ui.updateToasts = function () {
    const el = $('toasts');
    for (const t of U.toasts) t.t += 1 / 30;
    U.toasts = U.toasts.filter(t => t.t < 2.6);
    el.innerHTML = U.toasts.map(t => `<div class="toast" style="opacity:${Math.min(1, 2.6 - t.t)}">${t.msg}</div>`).join('');
  };

  // ------------------------------------------------------------------ defeat & win (§7, §6)
  G.onDefeat = function (st, mode, cause) {
    const el = $('defeat');
    const story = mode === 'story';
    el.innerHTML = `
      <div class="panelBox">
        <div class="catface"><img src="assets/cat.png" alt="the Cat"></div>
        <p class="mustache">the Cat drew a moustache on you . . .</p>
        <h2>${story ? 'You got so sleepy! You woke up back at camp.' : "Let's try again from the start!"}</h2>
        ${story ? `<p class="hint">You dropped some snacks and diamonds in a backpack — go find it!</p>` : `<p class="hint">True Story Mode: everything starts over. Very Hard!</p>`}
        <button class="bigbtn" id="defOk">${story ? 'OK!' : 'Start over'}</button>
      </div>`;
    el.classList.remove('hidden');
    ui.overlayOpen = true;
    G.onTap($('defOk'), () => {
      el.classList.add('hidden');
      ui.overlayOpen = false;
      if (!story) {
        const fresh = G.newGame('true');
        ui.startGame(fresh);
      }
    });
    G.sfx('shoo');
  };

  G.onWin = function (st) {
    const el = $('win'), c = C();
    const kids = st.kids.filter(k => k.rescued).length;
    el.innerHTML = `
      <div class="panelBox">
        <h1>🎉 YOU ESCAPED! 🎉</h1>
        <div class="kite">🪁</div>
        <p>All ${kids} of the kids flew away with you on the giant kite-glider!</p>
        <div class="stats">
          <div>🌙 Nights survived: <b>${c.TOTAL_NIGHTS}</b></div>
          <div>🧒 Kids rescued: <b>${kids} / 4</b></div>
          <div>💎 Diamonds found: <b>${st.stats.diamonds}</b></div>
          <div>🔥 Coziest fire: <b>level ${st.stats.maxFire}</b></div>
          <div>🐱 Times the Cat was shooed: <b>${st.stats.catsShooed}</b></div>
          <div>🐾 Animals bonked: <b>${st.stats.animalsBonked}</b></div>
        </div>
        <button class="bigbtn" id="winOk">Play again</button>
      </div>`;
    el.classList.remove('hidden');
    ui.overlayOpen = true;
    G.onTap($('winOk'), () => {
      el.classList.add('hidden');
      ui.overlayOpen = false;
      ui.showTitle();
    });
    G.sfx('happy');
  };

  // soft pastel hurt flash (never dark red — §19)
  G.state && null;
  ui.hurtFlash = function () {
    const el = $('hurtflash');
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 220);
  };

  // ------------------------------------------------------------------ HUD
  const HOTBAR_ITEMS = [
    ['wood', '🪵'], ['scrap', '⚙️'], ['fur', '🧶'], ['pelt', '🟫'], ['diamond', '💎'],
    ['fuel', '🧴'], ['battery', '🔋'], ['torch', '🕯️'], ['brew', '🍾'],
    ['morsel', '🍗'], ['steak', '🥩'], ['csteak', '🍖'], ['bfoot', '🐇'], ['grape', '🍇'],
  ];
  const EDIBLE = new Set(['morsel', 'steak', 'csteak', 'bfoot', 'grape']);

  function buildHotbar() {
    const el = $('hotbar');
    el.innerHTML = HOTBAR_ITEMS.map(([id, icon]) =>
      `<div class="slot" data-item="${id}"><span class="sicon">${icon}</span><span class="scount" id="cnt-${id}">0</span></div>`
    ).join('');
    el.querySelectorAll('.slot').forEach(s => G.onTap(s, () => {
      const id = s.dataset.item;
      const st = G.state; if (!st || ui.overlayOpen) return;
      if (EDIBLE.has(id)) G.eat(st, id);
      else if (id === 'torch') G.useTorch(st);
    }));
  }

  ui.updateHUD = function (st) {
    const c = C(), p = st.player;
    let hearts = '';
    for (let i = 0; i < c.PLAYER_HEARTS; i++) {
      hearts += p.hearts >= i + 1 ? '<span class="h full">♥</span>' : p.hearts >= i + 0.5 ? '<span class="h half">♥</span>' : '<span class="h empty">♥</span>';
    }
    $('hearts').innerHTML = hearts;
    $('hungerbar').style.width = Math.max(0, p.hunger) + '%';
    $('daylabel').textContent = st.phase === 'day'
      ? `☀️ Day ${st.day}`
      : `🌙 Night ${st.night} of ${c.TOTAL_NIGHTS}`;
    const lvl = Math.floor(st.fire.level);
    $('firepips').innerHTML = '🔥 ' + '▮'.repeat(lvl) + '▯'.repeat(c.FIRE_MAX_LEVEL - lvl);
    for (const [id] of HOTBAR_ITEMS) {
      const el = $('cnt-' + id);
      if (el) el.textContent = p.inv[id] || 0;
    }
    $('btnLight').classList.toggle('active', p.flashOn);
    $('btnLight').classList.toggle('dim', !p.hasFlashlight);
    // compass widget (§11): arrows only
    const comp = $('compass');
    comp.innerHTML = c.KIDS.map(k => {
      const kid = st.kids.find(x => x.id === k.id);
      const ang = U.angleTo(p.x, p.y, k.x * c.TILE, k.y * c.TILE);
      const deg = Math.round(ang * 180 / Math.PI + 90);
      const icon = { kraken: '🐙', squid: '🦑', dino: '🦖', koala: '🐨' }[k.id];
      return `<span class="carrow ${kid.rescued ? 'done' : ''}" style="transform:rotate(${deg}deg)">${kid.rescued ? '✓' : icon + '➤'}</span>`;
    }).join('');
  };

  ui.updateBotConsole = function (st) {
    const el = $('botconsole');
    if (!el || el.classList.contains('hidden')) return;
    el.innerHTML = st.bot.log.slice(-14).map(l => `<div>${l.replace(/</g, '&lt;')}</div>`).join('');
    el.scrollTop = el.scrollHeight;
  };

  // ------------------------------------------------------------------ pause
  ui.showPause = function () {
    if (!ui.playing || ui.overlayOpen) return;
    $('pausemenu').classList.remove('hidden');
    ui.overlayOpen = true;
    if (G.state) { G.state.paused = true; G.save(G.state); }
  };
  ui.hidePause = function () {
    $('pausemenu').classList.add('hidden');
    ui.overlayOpen = false;
    if (G.state) G.state.paused = false;
  };
})();
