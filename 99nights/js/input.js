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

  function actionOf(code) {
    for (const a in map) if (map[a].includes(code)) return a;
    return null;
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
  }

  return {
    init,
    mouse,
    pressed: (a) => pressed.has(a),
    down: (a) => held.has(a),
    endFrame: () => pressed.clear(),
    clearPressed: () => pressed.clear(),
  };
})();
