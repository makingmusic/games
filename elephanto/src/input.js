// Elephanto — keyboard, mouse and touch input.
// Touch: left virtual joystick moves, dragging the right half of the screen
// looks around, on-screen buttons attack / interact / heal.

var Input = {
  keys: {},
  moveX: 0, moveY: 0,     // joystick axes, -1..1 (moveY > 0 = forward)
  turn: 0,                // accumulated look delta in radians, consumed per frame
  turnHeld: 0,            // -1/0/1 while an on-screen turn arrow is held
  attackHeld: false,
  attackQueued: false,
  interactQueued: false,
  healQueued: false,
  touchMode: false
};

function initInput(canvas) {
  // ---- global gesture/scroll prevention (iOS) ----
  document.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); });

  var firstGesture = function () { if (typeof unlockAudio === 'function') unlockAudio(); };
  document.addEventListener('touchstart', firstGesture, { once: true });
  document.addEventListener('mousedown', firstGesture, { once: true });
  document.addEventListener('keydown', firstGesture, { once: true });

  // ---- keyboard ----
  window.addEventListener('keydown', function (e) {
    Input.keys[e.code] = true;
    if (e.code === 'Space') { Input.attackHeld = true; Input.attackQueued = true; e.preventDefault(); }
    if (e.code === 'KeyE') Input.interactQueued = true;
    if (e.code === 'KeyH') Input.healQueued = true;
    if (e.code.indexOf('Arrow') === 0) e.preventDefault();
  });
  window.addEventListener('keyup', function (e) {
    Input.keys[e.code] = false;
    if (e.code === 'Space') Input.attackHeld = false;
  });
  window.addEventListener('blur', function () {
    Input.keys = {};
    Input.attackHeld = false;
    Input.turnHeld = 0;
    Input.moveX = Input.moveY = 0;
  });

  // ---- mouse: drag to look, quick click to attack ----
  var mouseDown = false, mouseMoved = 0, mouseX = 0, downTime = 0;
  canvas.addEventListener('mousedown', function (e) {
    mouseDown = true; mouseMoved = 0; mouseX = e.clientX; downTime = Date.now();
  });
  window.addEventListener('mousemove', function (e) {
    if (!mouseDown) return;
    var dx = e.clientX - mouseX;
    mouseX = e.clientX;
    mouseMoved += Math.abs(dx);
    Input.turn += dx * 0.0045;
  });
  window.addEventListener('mouseup', function () {
    if (mouseDown && mouseMoved < 6 && Date.now() - downTime < 300) Input.attackQueued = true;
    mouseDown = false;
  });

  // ---- touch: joystick (left) + look drag (right) ----
  var stickEl = document.getElementById('stick');
  var knobEl = document.getElementById('stick-knob');
  var joyId = null, joyOX = 0, joyOY = 0;
  var lookId = null, lookX = 0;
  var JOY_R = 48;

  function setTouchMode() {
    if (Input.touchMode) return;
    Input.touchMode = true;
    document.getElementById('touch-ui').classList.remove('hidden');
  }

  canvas.addEventListener('touchstart', function (e) {
    setTouchMode();
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.clientX < window.innerWidth * 0.45 && joyId === null) {
        joyId = t.identifier;
        var r = stickEl.getBoundingClientRect();
        joyOX = r.left + r.width / 2; joyOY = r.top + r.height / 2;
      } else if (lookId === null) {
        lookId = t.identifier;
        lookX = t.clientX;
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
        knobEl.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
      } else if (t.identifier === lookId) {
        Input.turn += (t.clientX - lookX) * 0.007;
        lookX = t.clientX;
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
        knobEl.style.transform = 'translate(-50%, -50%)';
      } else if (t.identifier === lookId) {
        lookId = null;
      }
    }
  }
  canvas.addEventListener('touchend', touchEnd);
  canvas.addEventListener('touchcancel', touchEnd);

  // ---- on-screen buttons ----
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
  bindButton('btn-attack',
    function () { Input.attackHeld = true; Input.attackQueued = true; },
    function () { Input.attackHeld = false; });
  bindButton('btn-interact', function () { Input.interactQueued = true; });
  bindButton('btn-heal', function () { Input.healQueued = true; });
  bindButton('btn-turn-left',
    function () { Input.turnHeld = -1; },
    function () { if (Input.turnHeld < 0) Input.turnHeld = 0; });
  bindButton('btn-turn-right',
    function () { Input.turnHeld = 1; },
    function () { if (Input.turnHeld > 0) Input.turnHeld = 0; });
}

// Keyboard movement axes, read by the game each frame.
function keyboardAxes() {
  var x = 0, y = 0;
  var k = Input.keys;
  if (k['KeyW'] || k['ArrowUp']) y += 1;
  if (k['KeyS'] || k['ArrowDown']) y -= 1;
  if (k['KeyA'] || k['ArrowLeft']) x -= 1;
  if (k['KeyD'] || k['ArrowRight']) x += 1;
  return { x: x, y: y };
}

// Q/E turn. E also fires "interact" on keydown (see above), so a quick tap
// uses an object while holding E turns right.
function keyboardTurn(dt) {
  var t = 0;
  if (Input.keys['KeyQ']) t -= 1;
  if (Input.keys['KeyE']) t += 1;
  return t * 2.6 * dt;
}
