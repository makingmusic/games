// Barry's Prison Run — boot + main loop + screen effects (poof, zap, stars, shake).

(function () {
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
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
  initInput(canvas);
  UI.init();

  // ?stage=N warp for testing
  var m = location.search.match(/stage=(\d+)/);
  if (m) {
    Game.stats = { fruit: 0, splats: 0, caught: 0, snacks: 0, cones: 0, buttons: 0, pickups: 0, time: 0 };
    var n = Math.max(1, Math.min(9, parseInt(m[1], 10)));
    if (n >= 5) { /* stages 5+ need the bazooka to make sense */ }
    Game.stage = n;
    Stages.load(n);
    if (n >= 5 && n <= 7) World.player.hasBazooka = true;
    Game.state = 'playing';
    UI.hideScreens();
  }

  function drawEffects(W, H, now) {
    // pastel dizzy stars
    if (Game.starsT > 0) {
      ctx.fillStyle = 'rgba(255,235,160,' + (Game.starsT * 0.35) + ')';
      for (var i = 0; i < 6; i++) {
        var a = now * 5 + i * 1.05;
        ctx.font = (H * 0.045) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('★', W / 2 + Math.cos(a) * W * 0.08, H * 0.42 + Math.sin(a) * H * 0.07);
      }
    }
    // spike poof: soft pastel flash + swirl
    if (Game.poofT > 0) {
      var k = Game.poofT / CONFIG.spike.poofTime;
      ctx.fillStyle = 'rgba(255,220,200,' + (k * 0.5) + ')';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,' + k + ')';
      ctx.lineWidth = 6;
      for (i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, (1 - k) * W * 0.35 + i * 22, 0, 7);
        ctx.stroke();
      }
    }
    // ZAP teleport: white sparkles
    if (Game.zapT > 0) {
      var zk = Math.abs(Math.sin(Game.zapT * 22));
      ctx.fillStyle = 'rgba(255,255,255,' + (zk * 0.8) + ')';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#f6d44d';
      for (var z = 0; z < 24; z++) {
        var zx = (z * 97 + Game.time * 400 * (z % 3 + 1)) % W;
        var zy = (z * 173 + Game.time * 300) % H;
        ctx.fillRect(zx, zy, 5, 5);
      }
    }
    // gentle vignette so it feels cozy, not scary
    var vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(20,25,40,.28)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  var last = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    if (!last) last = ts;
    var dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    var now = ts / 1000;

    Game.update(dt);

    var W = canvas.width, H = canvas.height;
    ctx.save();
    if (Game.shakeT > 0) {
      ctx.translate((Math.random() - 0.5) * Game.shakeT * 22, (Math.random() - 0.5) * Game.shakeT * 22);
    }

    if (Game.state === 'mode' && Mini.mode) {
      if (Mini.mode.kind === 'car') Mini.drawCar(ctx, W, H);
      else if (Mini.mode.kind === 'heli') Mini.drawHeli(ctx, W, H);
      else if (Mini.mode.kind === 'end') Mini.drawEnd(ctx, W, H);
    } else if (Game.state === 'end' && Mini.mode) {
      Mini.drawEnd(ctx, W, H);
    } else if (Game.state === 'playing') {
      Ray.render(ctx, W, H, now);
    } else {
      // title backdrop
      ctx.fillStyle = '#1d3a2a';
      ctx.fillRect(0, 0, W, H);
      if (!World.player) {
        // stripes for the title backdrop
        ctx.fillStyle = 'rgba(255,255,255,.04)';
        for (var s = 0; s < 6; s++) ctx.fillRect(s * W / 6, 0, W / 12, H);
      }
    }

    drawEffects(W, H, now);
    ctx.restore();
  }
  requestAnimationFrame(frame);
})();
