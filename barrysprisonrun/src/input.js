// Barry's Prison Run — keyboard, mouse and touch input.
// Left thumb joystick = move. Right side drag = look. Big buttons: Jump, Use, Shoot.

var Input = {
  keys: {},
  moveX: 0, moveY: 0,
  turn: 0, pitchDelta: 0,
  sprint: false,
  jumpQueued: false,
  useQueued: false,
  shootHeld: false, shootQueued: false,
  touchMode: false
};

function initInput(canvas) {
  document.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); });

  var firstGesture = function () { unlockAudio(); };
  document.addEventListener('touchstart', firstGesture, { once: true });
  document.addEventListener('mousedown', firstGesture, { once: true });
  document.addEventListener('keydown', firstGesture, { once: true });

  window.addEventListener('keydown', function (e) {
    Input.keys[e.code] = true;
    if (e.code === 'Space') {
      Input.jumpQueued = true;
      if (World.player && World.player.hasBazooka) Input.shootQueued = true;
      e.preventDefault();
    }
    if (e.code === 'KeyE') Input.useQueued = true;
    if (e.code === 'KeyF' && World.player && World.player.hasBazooka) Input.shootQueued = true;
    if (e.code.indexOf('Arrow') === 0) e.preventDefault();
  });
  window.addEventListener('keyup', function (e) { Input.keys[e.code] = false; });
  window.addEventListener('blur', function () {
    Input.keys = {};
    Input.moveX = Input.moveY = 0;
    Input.shootHeld = false;
  });

  // mouse: drag to look, quick click = shoot
  var mouseDown = false, mouseMoved = 0, mouseX = 0, mouseY = 0, downTime = 0;
  canvas.addEventListener('mousedown', function (e) {
    mouseDown = true; mouseMoved = 0; mouseX = e.clientX; mouseY = e.clientY; downTime = Date.now();
  });
  window.addEventListener('mousemove', function (e) {
    if (!mouseDown) return;
    var dx = e.clientX - mouseX, dy = e.clientY - mouseY;
    mouseX = e.clientX; mouseY = e.clientY;
    mouseMoved += Math.abs(dx) + Math.abs(dy);
    Input.turn += dx * CONFIG.look.mouseTurn;
    Input.pitchDelta -= dy * CONFIG.look.pitchDrag;
  });
  window.addEventListener('mouseup', function () {
    if (mouseDown && mouseMoved < 6 && Date.now() - downTime < 300) {
      if (World.player && World.player.hasBazooka) Input.shootQueued = true;
      else Input.jumpQueued = true;
    }
    mouseDown = false;
  });

  // touch: floating joystick (left) + look drag (right)
  var stickEl = document.getElementById('stick');
  var knobEl = document.getElementById('stick-knob');
  var joyId = null, joyOX = 0, joyOY = 0, joyPlaced = false;
  var lookId = null, lookX = 0, lookY = 0;
  var JOY_R = 48;

  function setTouchMode() {
    if (Input.touchMode) return;
    Input.touchMode = true;
    var el = document.getElementById('touch-ui');
    if (el) el.classList.remove('hidden');
  }

  canvas.addEventListener('touchstart', function (e) {
    setTouchMode();
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.clientX < window.innerWidth * 0.45 && joyId === null) {
        joyId = t.identifier;
        joyOX = t.clientX; joyOY = t.clientY;
        joyPlaced = true;
        if (stickEl) {
          stickEl.style.left = joyOX + 'px';
          stickEl.style.top = joyOY + 'px';
          stickEl.classList.add('active');
        }
      } else if (lookId === null) {
        lookId = t.identifier;
        lookX = t.clientX; lookY = t.clientY;
      }
    }
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchmove', function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === joyId) {
        var dx = t.clientX - joyOX, dy = t.clientY - joyOY;
        var len = Math.hypot(dx, dy);
        if (len > JOY_R) { dx = dx / len * JOY_R; dy = dy / len * JOY_R; }
        Input.moveX = dx / JOY_R;
        Input.moveY = -dy / JOY_R;
        Input.sprint = Input.moveY > 0.92;
        if (knobEl) knobEl.style.transform = 'translate(-50%, -50%) translate(' + dx + 'px, ' + dy + 'px)';
      } else if (t.identifier === lookId) {
        Input.turn += (t.clientX - lookX) * CONFIG.look.dragTurn;
        Input.pitchDelta -= (t.clientY - lookY) * CONFIG.look.pitchDrag * 0.8;
        lookX = t.clientX; lookY = t.clientY;
      }
    }
    e.preventDefault();
  }, { passive: false });

  function touchEnd(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === joyId) {
        joyId = null;
        Input.moveX = Input.moveY = 0;
        Input.sprint = false;
        if (knobEl) knobEl.style.transform = 'translate(-50%, -50%)';
        if (stickEl) stickEl.classList.remove('active');
      } else if (t.identifier === lookId) {
        lookId = null;
      }
    }
  }
  canvas.addEventListener('touchend', touchEnd);
  canvas.addEventListener('touchcancel', touchEnd);

  function bindButton(id, onDown, onUp) {
    var el = document.getElementById(id);
    if (!el) return;
    var down = function (e) { setTouchMode(); onDown(); e.preventDefault(); };
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('mousedown', down);
    if (onUp) {
      el.addEventListener('touchend', onUp);
      el.addEventListener('touchcancel', onUp);
      el.addEventListener('mouseup', onUp);
      el.addEventListener('mouseleave', onUp);
    }
  }
  bindButton('btn-jump', function () { Input.jumpQueued = true; });
  bindButton('btn-use', function () { Input.useQueued = true; });
  bindButton('btn-shoot',
    function () { Input.shootHeld = true; Input.shootQueued = true; },
    function () { Input.shootHeld = false; });
}

function keyboardAxes() {
  var x = 0, y = 0;
  var k = Input.keys;
  if (k['KeyW'] || k['ArrowUp']) y += 1;
  if (k['KeyS'] || k['ArrowDown']) y -= 1;
  if (k['KeyA']) x -= 1;
  if (k['KeyD']) x += 1;
  if (k['ArrowLeft']) Input.turn -= 2.2 * 0.016;
  if (k['ArrowRight']) Input.turn += 2.2 * 0.016;
  if (y > 0) Input.sprint = true;
  return { x: x, y: y };
}

// consumed by Player each frame
function applyLook(dt) {
  var p = World.player;
  if (!p) return;
  p.dir += Input.turn;
  Input.turn = 0;
  p.pitch += Input.pitchDelta;
  Input.pitchDelta = 0;
  p.pitch = Math.max(-CONFIG.look.pitchMax, Math.min(CONFIG.look.pitchMax, p.pitch));
}

function playerJumpInput() {
  var p = World.player;
  if (!p) return;
  if (Input.jumpQueued) {
    Input.jumpQueued = false;
    p.jumpBuf = CONFIG.player.jumpBuffer;
  }
}
