// Elephanto — boot and main loop.

(function () {
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  // Backing store tracks display size × devicePixelRatio (capped for mobile
  // perf) so walls and sprites render crisply on Retina iPads instead of
  // being CSS-stretched from a small canvas.
  var MAX_BACKING_W = 2000, MAX_BACKING_H = 1600;

  function resize() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var scale = Math.min(dpr, MAX_BACKING_W / window.innerWidth, MAX_BACKING_H / window.innerHeight);
    canvas.width = Math.max(320, Math.round(window.innerWidth * scale));
    canvas.height = Math.max(240, Math.round(window.innerHeight * scale));
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 100); });
  resize();

  initSprites();
  Raycaster.loadWallTexture();
  initInput(canvas);
  UI.init();

  // role select
  document.getElementById('role-kid').addEventListener('click', function () { start('kid'); });
  document.getElementById('role-protector').addEventListener('click', function () { start('protector'); });
  function start(role) {
    if (typeof unlockAudio === 'function') unlockAudio();
    Game.newGame(role);
    UI.onGameStart(role);
  }

  var last = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    if (!last) last = ts;
    var dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;

    if (Game.state === 'playing' || Game.state === 'won') {
      if (Game.state === 'playing') Game.update(dt);
      Raycaster.render(ctx, canvas.width, canvas.height);
      UI.update();
    } else {
      // menu backdrop: plain fill behind the overlay
      ctx.fillStyle = '#14161a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }
  requestAnimationFrame(frame);
})();
