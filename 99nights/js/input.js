const Input = (() => {
  const held = new Set();
  const pressed = new Set();
  const map = {
    up: ['KeyW', 'ArrowUp'],
    down: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    attack: ['Space'],
    interact: ['KeyE'],
    eat: ['KeyF'],
    upgrade: ['KeyU'],
    inv: ['KeyI'],
    board: ['KeyB'],
    pause: ['Escape'],
    mute: ['KeyM'],
    confirm: ['Enter', 'NumpadEnter'],
    restart: ['KeyR'],
    num1: ['Digit1'],
    num2: ['Digit2'],
    num3: ['Digit3'],
    num4: ['Digit4'],
    num5: ['Digit5'],
  };
  const mouse = { x: 0, y: 0, down: false, clicked: false, lastMoveT: -99999 };

  let touchSeen = false;
  const STICK_R = 60;
  const stick = { id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
  const btnHolds = {};
  const taps = {};

  function actionOf(code) {
    for (const a in map) if (map[a].includes(code)) return a;
    return null;
  }

  function press(a) {
    pressed.add(a);
    held.add(a);
  }

  function release(a) {
    held.delete(a);
  }

  function buttons() {
    const vw = window.innerWidth, vh = window.innerHeight;
    return [
      { act: 'attack', x: vw - 74, y: vh - 156, r: 42, label: 'ATK', size: 20 },
      { act: 'interact', x: vw - 168, y: vh - 100, r: 30, label: 'E', size: 20 },
      { act: 'eat', x: vw - 168, y: vh - 188, r: 30, label: 'F', size: 20 },
      { act: 'upgrade', x: vw - 252, y: vh - 100, r: 26, label: 'U', size: 18 },
      { act: '__pause', x: vw - 42, y: 108, r: 22, label: 'II', size: 15 },
      { act: '__board', x: vw - 100, y: 108, r: 22, label: 'B', size: 16 },
      { act: '__inv', x: vw - 158, y: 108, r: 22, label: 'I', size: 16 },
    ];
  }

  function special(act) {
    if (act === '__pause') UI.toggle('pause');
    else if (act === '__board') UI.toggle('board');
    else if (act === '__inv') UI.toggle('inventory');
  }

  function tpos(t, canvas) {
    const r = canvas.getBoundingClientRect();
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }

  function stickVec() {
    if (stick.id === null) return { x: 0, y: 0 };
    let x = stick.dx / STICK_R, y = stick.dy / STICK_R;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y };
  }

  function init(canvas) {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      const a = actionOf(e.code);
      if (a) {
        if (!e.repeat) pressed.add(a);
        held.add(a);
      }
      Sfx.unlock();
    });
    window.addEventListener('keyup', (e) => {
      const a = actionOf(e.code);
      if (a) held.delete(a);
    });
    window.addEventListener('blur', () => held.clear());
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.lastMoveT = performance.now();
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        mouse.down = true;
        mouse.clicked = true;
      }
      Sfx.unlock();
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) mouse.down = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    const onStart = (e) => {
      e.preventDefault();
      touchSeen = true;
      Sfx.unlock();
      const vw = window.innerWidth;
      for (const t of e.changedTouches) {
        const pos = tpos(t, canvas);
        let onBtn = false;
        for (const b of buttons()) {
          if (Utils.dist(pos.x, pos.y, b.x, b.y) < b.r + 10) {
            onBtn = true;
            if (b.act.indexOf('__') === 0) special(b.act);
            else {
              press(b.act);
              btnHolds[t.identifier] = b.act;
            }
            break;
          }
        }
        if (onBtn) continue;
        if (pos.x < vw * 0.5 && stick.id === null) {
          stick.id = t.identifier;
          stick.ox = pos.x;
          stick.oy = pos.y;
          stick.dx = 0;
          stick.dy = 0;
        } else {
          taps[t.identifier] = { x: pos.x, y: pos.y, t: performance.now(), moved: 0 };
        }
      }
    };
    const onMove = (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === stick.id) {
          const pos = tpos(t, canvas);
          stick.dx = pos.x - stick.ox;
          stick.dy = pos.y - stick.oy;
          const l = Math.hypot(stick.dx, stick.dy);
          if (l > STICK_R) {
            stick.dx = (stick.dx / l) * STICK_R;
            stick.dy = (stick.dy / l) * STICK_R;
          }
        } else if (taps[t.identifier]) {
          const pos = tpos(t, canvas);
          const tp = taps[t.identifier];
          tp.moved = Math.max(tp.moved, Utils.dist(pos.x, pos.y, tp.x, tp.y));
        }
      }
    };
    const onEnd = (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === stick.id) {
          stick.id = null;
          stick.dx = 0;
          stick.dy = 0;
        }
        if (btnHolds[t.identifier]) {
          release(btnHolds[t.identifier]);
          delete btnHolds[t.identifier];
        }
        const tp = taps[t.identifier];
        if (tp) {
          delete taps[t.identifier];
          if (performance.now() - tp.t < 350 && tp.moved < 14) UI.click(tp.x, tp.y);
        }
      }
    };
    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd, { passive: false });
    canvas.addEventListener('touchcancel', onEnd, { passive: false });
  }

  function drawTouch(ctx) {
    if (!touchSeen || !G || G.over || G.ui.open) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    if (stick.id !== null) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(stick.ox, stick.oy, STICK_R, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#f4a938';
      ctx.beginPath();
      ctx.arc(stick.ox + stick.dx, stick.oy + stick.dy, 26, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(110, vh - 150, STICK_R, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (const b of buttons()) {
      const heldDown = b.act.indexOf('__') !== 0 && held.has(b.act);
      ctx.globalAlpha = heldDown ? 0.85 : 0.45;
      ctx.fillStyle = heldDown ? '#f4a938' : '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      Utils.font(ctx, b.size);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#1b2432';
      ctx.fillText(b.label, b.x, b.y + 1);
    }
  }

  return {
    init,
    mouse,
    pressed: (a) => pressed.has(a),
    down: (a) => held.has(a),
    endFrame: () => pressed.clear(),
    clearPressed: () => pressed.clear(),
    press,
    release,
    stick: stickVec,
    drawTouch,
    get touchSeen() { return touchSeen; },
  };
})();
