// Boot, game loop, input (touch + keyboard), save wiring, ?fast & ?bot modes. Browser-only.
var G = globalThis.G || (globalThis.G = {});

(function () {
  if (typeof document === 'undefined') return; // headless (Node) builds stop here

  const C = () => G.CONFIG, U = G.U;
  const $ = (id) => document.getElementById(id);

  // ------------------------------------------------------------------ canvas
  const cv = $('cv'), ctx = cv.getContext('2d');
  let vw = 0, vh = 0, dpr = 1;
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    vw = window.innerWidth; vh = window.innerHeight;
    cv.width = vw * dpr; cv.height = vh * dpr;
    cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
    document.documentElement.style.setProperty('--safe-b', (window.visualViewport ? 0 : 0) + 'px');
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 250));
  resize();

  // ------------------------------------------------------------------ params (used by early blocks below)
  const params = new URLSearchParams(location.search);

  // ------------------------------------------------------------------ cat sprites (§3): the designer's plush Cat, cut out of the studio photo
  (function loadCat() {
    function load(src, assign) {
      const img = new Image();
      img.onload = () => assign(img);
      img.onerror = () => assign(null);
      img.src = src;
    }
    load('assets/cat.png', (img) => {
      G.catImg = img;
      const t = $('titleCat');
      if (t && img) t.classList.remove('hidden');
    });
    load('assets/cat-sleep.png', (img) => { G.catSleepImg = img; });
    load('assets/cat-shoo.png', (img) => { G.catShooImg = img; });
  })();

  // ------------------------------------------------------------------ ?catdebug=1 — preview the Cat's poses next to the player
  if (params.get('catdebug') === '1') {
    (function buildCatDebug() {
      const panel = document.createElement('div');
      panel.id = 'catdebug';
      panel.innerHTML = '<b>🐱 Cat poses</b>' +
        '<div class="cdRow"><button data-em="off">Free</button><button data-em="asleep">Sleep</button>' +
        '<button data-em="prowl">Prowl</button><button data-em="stalk">Stalk</button>' +
        '<button data-em="guardWake">Grumpy</button><button data-em="shooed">Shooed</button>' +
        '<button id="cdBeam">Beam ✨</button></div>';
      document.body.appendChild(panel);
      panel.querySelectorAll('[data-em]').forEach(b => G.onTap(b, () => {
        const em = b.dataset.em;
        G.catDebug = em === 'off' ? null : { stateOverride: em };
        if (G.state && em !== 'off') {
          const p = G.state.player, T = G.CONFIG.TILE;
          G.state.cat.x = p.x + Math.cos(p.facing) * 3 * T;
          G.state.cat.y = p.y + Math.sin(p.facing) * 3 * T;
          G.state.cat.state = em === 'guardWake' ? 'guard' : em;
          G.state.cat.shooT = 999;
        }
      }));
      G.onTap(panel.querySelector('#cdBeam'), () => {
        G.catDebug = G.catDebug || { stateOverride: 'off' };
        G.catDebug.beam = !G.catDebug.beam;
      });
    })();
  }

  // ------------------------------------------------------------------ input state
  const keys = new Set();
  const input = { mx: 0, my: 0, attack: false, light: false, grab: false, eat: false };
  let attackHeld = false, grabHeld = false, grabTimer = 0, lightQueued = false, eatQueued = false;
  const touch = { joyId: null, jx: 0, jy: 0, vx: 0, vy: 0 };

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    G.ui.ensureAudio && G.ui.ensureAudio();
    const k = e.key.toLowerCase();
    keys.add(k);
    if (k === 'f') lightQueued = true;
    if (k === '1') eatQueued = true;
    if (k === '2' && G.state) { G.state.paused || G.useTorch(G.state); }
    if (k === 'c' && G.state && !G.ui.overlayOpen) G.openCraft();
    if (k === 'm') toggleMute();
    if (k === 'escape') {
      if (!$('pausemenu').classList.contains('hidden')) G.ui.hidePause();
      else G.ui.showPause();
    }
    if (k === ' ' || k === 'arrowup' || k === 'arrowdown' || k === 'arrowleft' || k === 'arrowright') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  // ---- touch: floating joystick on the left half (walk/turn), drag right half to look (§17)
  const joyEl = $('joystick'), knobEl = $('knob');
  const look = { id: null, lx: 0 };
  function joyStart(x, y, id) {
    touch.joyId = id; touch.jx = x; touch.jy = y; touch.vx = 0; touch.vy = 0;
    joyEl.style.left = (x - 60) + 'px'; joyEl.style.top = (y - 60) + 'px';
    joyEl.classList.add('show');
  }
  function joyMove(x, y) {
    let dx = x - touch.jx, dy = y - touch.jy;
    const m = Math.hypot(dx, dy);
    if (m > 52) { dx = dx / m * 52; dy = dy / m * 52; }
    knobEl.style.transform = `translate(${dx}px,${dy}px)`;
    touch.vx = dx / 52; touch.vy = dy / 52;
  }
  function joyEnd() {
    touch.joyId = null; touch.vx = 0; touch.vy = 0;
    joyEl.classList.remove('show');
    knobEl.style.transform = 'translate(0,0)';
  }
  function lookStart(x, id) { look.id = id; look.lx = x; }
  function lookMove(x) {
    if (G.state && playTouchOk()) G.state.player.facing += (x - look.lx) * 0.0075;
    look.lx = x;
  }
  function lookEnd() { look.id = null; }
  function uiTarget(el) {
    return !!(el && el.closest && el.closest('button, a, input, .slot, .screen, .panelBox, #hotbar, #catdebug'));
  }
  function playTouchOk() {
    return !!(G.ui && G.ui.playing && !G.ui.overlayOpen && G.state && !G.state.paused);
  }
  document.addEventListener('touchstart', (e) => {
    G.ui.ensureAudio && G.ui.ensureAudio();   // unlock audio on first tap (§17)
    // Never preventDefault on menus — iOS Safari then swallows the click.
    if (uiTarget(e.target) || !playTouchOk()) return;
    for (const t of e.changedTouches || []) {
      if (t.clientX < vw * 0.55 && touch.joyId === null) {
        joyStart(t.clientX, t.clientY, t.identifier);
        e.preventDefault();
      } else if (t.clientX >= vw * 0.55 && look.id === null) {
        lookStart(t.clientX, t.identifier);
        e.preventDefault();
      }
    }
  }, { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault()); // iOS pinch
  document.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches || []) {
      if (t.identifier === touch.joyId) joyMove(t.clientX, t.clientY);
      else if (t.identifier === look.id) lookMove(t.clientX);
    }
    if (touch.joyId !== null || look.id !== null) e.preventDefault();
  }, { passive: false });
  document.addEventListener('touchend', (e) => {
    for (const t of e.changedTouches || []) {
      if (t.identifier === touch.joyId) joyEnd();
      else if (t.identifier === look.id) lookEnd();
    }
  });
  document.addEventListener('touchcancel', () => { joyEnd(); lookEnd(); });
  // mouse fallback for desktop: drag on the canvas to look around
  let mouseLook = false, mouseLx = 0;
  window.addEventListener('mousedown', (e) => {
    if (!playTouchOk() || uiTarget(e.target)) return;
    mouseLook = true; mouseLx = e.clientX;
  });
  window.addEventListener('mousemove', (e) => {
    if (!mouseLook) return;
    if (G.state && playTouchOk()) G.state.player.facing += (e.clientX - mouseLx) * 0.0075;
    mouseLx = e.clientX;
  });
  window.addEventListener('mouseup', () => { mouseLook = false; });

  // ---- action buttons: hold-to-repeat for Bonk/Grab, tap for Light/Yum
  function bindHold(el, set) {
    const on = (e) => { e.preventDefault(); set(true); };
    const off = (e) => { e.preventDefault(); set(false); };
    el.addEventListener('touchstart', on, { passive: false });
    el.addEventListener('touchend', off); el.addEventListener('touchcancel', off);
    el.addEventListener('mousedown', on); el.addEventListener('mouseup', off); el.addEventListener('mouseleave', off);
  }
  function bindTap(el, fn) {
    el.addEventListener('touchstart', (e) => { e.preventDefault(); fn(); }, { passive: false });
    el.addEventListener('mousedown', (e) => { e.preventDefault(); fn(); });
  }
  bindHold($('btnBonk'), (v) => attackHeld = v);
  bindHold($('btnGrab'), (v) => grabHeld = v);
  bindTap($('btnLight'), () => lightQueued = true);
  bindTap($('btnYum'), () => eatQueued = true);
  bindTap($('btnCraft'), () => G.state && !G.ui.overlayOpen && G.openCraft());
  bindTap($('btnPause'), () => G.ui.showPause());
  bindTap($('btnMute'), () => toggleMute());
  // keyboard equivalents
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === ' ') attackHeld = true;
    if (k === 'e') grabHeld = true;
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    if (k === ' ') attackHeld = false;
    if (k === 'e') grabHeld = false;
  });

  function toggleMute() {
    const m = G.ui.toggleMute();
    $('btnMute').textContent = m ? '🔇' : '🔊';
  }

  function gatherInput(dt) {
    // first-person controls: W/S (or joystick Y) walk, A/D/arrows (or joystick X) turn
    let fwd = 0, turn = 0;
    if (keys.has('w') || keys.has('arrowup')) fwd += 1;
    if (keys.has('s') || keys.has('arrowdown')) fwd -= 1;
    if (keys.has('a') || keys.has('arrowleft')) turn -= 1;
    if (keys.has('d') || keys.has('arrowright')) turn += 1;
    if (touch.joyId !== null) { fwd += -touch.vy; turn += touch.vx; }
    const st = G.state;
    // hold-to-swing: a new bonk fires as soon as the cooldown allows
    const canSwing = st && st.player.cd <= 0.05;
    input.attack = attackHeld && canSwing;
    grabTimer -= dt;
    if (grabHeld && grabTimer <= 0) { input.grab = true; grabTimer = 0.45; }
    else input.grab = false;
    input.light = lightQueued; lightQueued = false;
    input.eat = eatQueued; eatQueued = false;
    input.fwd = U.clamp(fwd, -1, 1); input.turn = U.clamp(turn, -1, 1);
    delete input.mx; delete input.my;
    return input;
  }

  const FAST = params.get('fast') === '1';
  const BOT = params.get('bot') === '1';
  const timeScale = FAST ? 10 : 1;

  // ------------------------------------------------------------------ save hooks
  G.hooks = {
    onDawn: (st) => { if (BOT) G.ui.updateBotConsole(st); },
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state && G.ui.playing) G.save(G.state); });
  window.addEventListener('beforeunload', () => { if (G.state && G.ui.playing) G.save(G.state); });

  // ------------------------------------------------------------------ screens wiring (touchend + click — iPad Safari)
  G.onTap($('splash'), () => {
    try { localStorage.setItem('etcif_splash_seen', '1'); } catch (e) {}
    G.ui.showTitle();
  });
  G.onTap($('btnStory'), () => startNew('story'));
  G.onTap($('btnTrue'), () => startNew('true'));
  G.onTap($('btnContinue'), () => {
    const st = G.load();
    if (st) G.ui.startGame(st); else startNew('story');
  });
  G.onTap($('btnHow'), () => {
    $('howto').classList.remove('hidden');
  });
  G.onTap($('howClose'), () => $('howto').classList.add('hidden'));
  G.onTap($('btnResume'), () => G.ui.hidePause());
  G.onTap($('btnPauseHow'), () => { $('howto').classList.remove('hidden'); });
  G.onTap($('btnQuit'), () => {
    if (G.state) G.save(G.state);
    G.ui.hidePause();
    G.state = null;
    G.ui.showTitle();
  });

  function startNew(mode) {
    const st = G.newGame(mode);
    if (BOT) { G.botInit(st, { console: true }); $('botconsole').classList.remove('hidden'); }
    // look at the campfire when the adventure starts
    st.player.facing = Math.atan2(st.fire.y - st.player.y, st.fire.x - st.player.x);
    G.ui.startGame(st);
    G.banner(mode === 'true' ? 'True Story Mode — Very Hard! Good luck!' : 'Stay brave! Survive 85 nights!', '#ffe9a8');
  }

  // ------------------------------------------------------------------ loop
  let last = performance.now();
  let hudT = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    let dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const st = G.state;
    if (!st || !G.ui.playing) { return; }

    if (!G.ui.overlayOpen && !st.paused) {
      let rem = dt * timeScale;
      let guard = 0;
      while (rem > 0 && guard++ < 40) {
        const h = Math.min(rem, 1 / 30);
        const inp = gatherInput(h);
        if (BOT) {
          Object.assign(inp, G.botTick(st, h));
          delete inp.fwd; delete inp.turn; // the bot drives with legacy mx/my
        }
        G.step(st, h, inp);
        rem -= h;
      }
    }

    render(st);
    hudT += dt;
    if (hudT > 0.15) { hudT = 0; G.ui.updateHUD(st); G.ui.updateToasts(); if (BOT) G.ui.updateBotConsole(st); }
  }

  function render(st) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    G.fpRender(ctx, st, vw, vh);
  }

  // ------------------------------------------------------------------ boot
  let seen = false;
  try { seen = !!localStorage.getItem('etcif_splash_seen'); } catch (e) {}
  // hurt hook: pastel flash on damage (§19)
  const oldDamage = G.damagePlayer;
  G.damagePlayer = function (st2, h, sx, sy, label) {
    const wasPlaying = G.ui && G.ui.playing;
    oldDamage(st2, h, sx, sy, label);
    if (wasPlaying) G.ui.hurtFlash();
  };

  if (seen) G.ui.showTitle(); else G.ui.showSplash();
  requestAnimationFrame(frame);
})();
