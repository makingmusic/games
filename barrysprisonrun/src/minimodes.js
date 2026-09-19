// Barry's Prison Run — stage 8 set pieces: the police car drive, the
// helicopter flight, and THE END screen. Drawn on the same canvas.

var Mini = { mode: null };

// ---------- police car ----------

Mini.startCar = function () {
  Game.state = 'mode';
  Game.setGoal(null);
  UI.hideAll();
  sfx('pickup');
  Game.banner('DRIVE!');
  var cones = [];
  for (var i = 0; i < 26; i++) {
    cones.push({
      d: 14 + i * 5.5 + Math.random() * 2,
      x: (Math.random() * 1.7 - 0.85)
    });
  }
  Mini.mode = {
    kind: 'car', t: 0, dist: 0, px: 0, speed: CONFIG.car.speed,
    cones: cones, bonkT: 0, wobble: 0, radioT: 2
  };
  Game.hint('Steer with the stick or A/D — dodge the cones!');
};

Mini.updateCar = function (m, dt) {
  m.t += dt;
  m.dist += m.speed * dt;
  var steer = (Input.moveX || 0) + (Input.keys['KeyA'] ? -1 : 0) + (Input.keys['KeyD'] ? 1 : 0);
  m.px = Math.max(-0.92, Math.min(0.92, m.px + steer * CONFIG.car.steer * dt));
  m.wobble = Math.sin(m.t * 9) * 0.02 + (m.bonkT > 0 ? Math.sin(m.t * 40) * 0.05 : 0);
  if (m.bonkT > 0) m.bonkT -= dt;

  // cone bonks
  for (var i = 0; i < m.cones.length; i++) {
    var c = m.cones[i];
    if (!c.hit && c.d - m.dist < 0.4 && Math.abs(c.x - m.px) < 0.22) {
      c.hit = true;
      m.bonkT = 0.8;
      m.speed *= CONFIG.car.coneBonkSlow;
      if (m.speed < 4) m.speed = 4;
      Game.stats.cones++;
      sfx('bonk');
      Game.shake(0.3);
    }
  }
  m.speed += dt * 0.35;
  if (m.speed > CONFIG.car.speed * 1.4) m.speed = CONFIG.car.speed * 1.4;

  // Barry on the radio, naturally
  m.radioT -= dt;
  if (m.radioT <= 0) {
    m.radioT = 4 + Math.random() * 3;
    sfx('hoy', 0.08);
  }

  if (m.t > CONFIG.car.duration) {
    Mini.mode = null;
    Game.loadStage(9);
  }
};

Mini.drawCar = function (ctx, W, H) {
  var m = Mini.mode;
  var hor = H * 0.44;

  // sky
  var g = ctx.createLinearGradient(0, 0, 0, hor);
  g.addColorStop(0, '#79b7ea'); g.addColorStop(1, '#d8ecf8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, hor);
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath(); ctx.arc(W * 0.8, hor * 0.4, H * 0.06, 0, 7); ctx.fill();

  // ground
  ctx.fillStyle = '#8fce87';
  ctx.fillRect(0, hor, W, H - hor);

  // road with perspective dashes
  var rw = W * 0.16;
  ctx.fillStyle = '#6e7681';
  ctx.beginPath();
  ctx.moveTo(W / 2 - rw, hor);
  ctx.lineTo(W / 2 + rw, hor);
  ctx.lineTo(W * 1.35, H);
  ctx.lineTo(-W * 0.35, H);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#e8ecf4';
  for (var i = 0; i < 9; i++) {
    var dd = ((m.dist * 0.35 + i * 3.4) % 30);
    var k = dd / 30;
    var y = hor + (H - hor) * k * k;
    var sw = W * 0.012 + k * W * 0.02;
    ctx.globalAlpha = 0.4 + k * 0.6;
    ctx.fillRect(W / 2 - sw / 2, y, sw, k * H * 0.06);
  }
  ctx.globalAlpha = 1;

  // cones
  for (i = 0; i < m.cones.length; i++) {
    var c = m.cones[i];
    var rel = c.d - m.dist;
    if (rel < 0.3 || rel > 30 || c.hit) continue;
    var ck = 1 - rel / 30;
    var cy = hor + (H - hor) * ck * ck;
    var cx = W / 2 + (c.x * 0.5 + m.px * 0.5) * (W * 0.5) * (0.1 + ck * 0.9);
    var cs = Math.max(6, ck * H * 0.16);
    var img = SPRITES.cone;
    ctx.drawImage(img, cx - cs / 2, cy - cs, cs, cs);
  }

  // hood + wheel
  ctx.fillStyle = '#eef1f5';
  ctx.beginPath();
  ctx.moveTo(W * 0.28, H);
  ctx.quadraticCurveTo(W * 0.5, H - H * 0.16 - m.wobble * H, W * 0.72, H);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2d3f66';
  ctx.fillRect(W * 0.30, H - H * 0.055, W * 0.4, H * 0.02);
  // light bar reflection
  ctx.fillStyle = 'rgba(229,73,58,.8)';
  ctx.fillRect(W * 0.44, H - H * 0.13, W * 0.05, H * 0.02);
  ctx.fillStyle = 'rgba(77,125,240,.8)';
  ctx.fillRect(W * 0.51, H - H * 0.13, W * 0.05, H * 0.02);

  if (m.bonkT > 0) {
    ctx.fillStyle = 'rgba(255,220,150,' + (m.bonkT * 0.4) + ')';
    ctx.fillRect(0, 0, W, H);
  }
  // distance bar
  var done = Math.min(1, m.t / CONFIG.car.duration);
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.fillRect(W / 2 - W * 0.2, 14, W * 0.4, 8);
  ctx.fillStyle = '#5da641';
  ctx.fillRect(W / 2 - W * 0.2, 14, W * 0.4 * done, 8);
};

// ---------- helicopter ----------

Mini.startHeli = function () {
  Game.state = 'mode';
  Game.setGoal(null);
  UI.hideAll();
  sfx('pickup');
  Game.banner('FLY!');
  var buildings = [];
  for (var i = 0; i < 40; i++) {
    buildings.push({ x: i * 90 + Math.random() * 40, w: 50 + Math.random() * 50, h: 60 + Math.random() * 130 });
  }
  Mini.mode = { kind: 'heli', t: 0, dist: 0, buildings: buildings, bob: 0 };
  Game.hint('Hold forward and enjoy the ride — you earned it!');
};

Mini.updateHeli = function (m, dt) {
  m.t += dt;
  var fwd = (Input.moveY || 0) + (Input.keys['KeyW'] ? 1 : 0);
  m.dist += (6 + fwd * 6) * dt;
  m.bob = Math.sin(m.t * 2.2) * 4;
  if (Math.floor(m.t * 4) % 2 === 0 && !m._rotor) { m._rotor = true; sfx('heli', 0.03); }
  if (Math.floor(m.t * 4) % 2 === 1) m._rotor = false;
  if (m.t > CONFIG.heli.duration) {
    Mini.mode = null;
    Game.theEnd();
  }
};

Mini.drawHeli = function (ctx, W, H) {
  var m = Mini.mode;
  var sunK = Math.min(1, m.t / CONFIG.heli.duration);
  // evening sky deepening
  var g = ctx.createLinearGradient(0, 0, 0, H);
  var top = mixHex('#79b7ea', '#31427c', sunK);
  var bot = mixHex('#d8ecf8', '#e2905c', sunK);
  g.addColorStop(0, top); g.addColorStop(1, bot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // setting sun
  ctx.fillStyle = '#ffdf8a';
  ctx.beginPath();
  ctx.arc(W * 0.5, H * (0.62 + sunK * 0.18), H * 0.09, 0, 7);
  ctx.fill();

  // parallax skyline (two layers)
  for (var layer = 0; layer < 2; layer++) {
    var speed = layer === 0 ? 0.35 : 0.7;
    var col = layer === 0 ? mixHex('#9db0cc', '#3d4a75', sunK) : mixHex('#6a7d9c', '#2b365e', sunK);
    ctx.fillStyle = col;
    var base = H * (layer === 0 ? 0.78 : 0.92) + m.bob * (layer + 1) * 0.4;
    for (var i = 0; i < m.buildings.length; i++) {
      var b = m.buildings[i];
      var bx = ((b.x - m.dist * speed * 22) % 3600 + 3600) % 3600 - 200;
      if (bx < -150 || bx > W + 150) continue;
      var bh = b.h * (layer === 0 ? 1 : 0.7);
      ctx.fillRect(bx, base - bh, b.w, bh);
      // windows
      ctx.fillStyle = 'rgba(255,230,150,.5)';
      for (var wy = base - bh + 8; wy < base - 8; wy += 14) {
        for (var wx = bx + 6; wx < bx + b.w - 8; wx += 12) {
          if ((wx + wy + i) % 3 === 0) ctx.fillRect(wx, wy, 5, 7);
        }
      }
      ctx.fillStyle = col;
    }
  }

  // tiny Barry on a rooftop, shaking his fist as you fly away
  var barryX = W * 0.22 - ((m.dist * 2) % (W * 2));
  if (barryX > -60 && barryX < W + 60 && sunK < 0.6) {
    var img = SPRITES.barry_angry;
    var s = H * 0.09;
    ctx.drawImage(img, barryX, H * 0.62 + m.bob - s, s, s * 1.3);
    ctx.font = 'bold ' + (s * 0.35) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.lineWidth = 3;
    ctx.strokeText('HOY!!!', barryX + s / 2, H * 0.56 + m.bob);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('HOY!!!', barryX + s / 2, H * 0.56 + m.bob);
  }

  // cockpit frame
  ctx.strokeStyle = '#37424f'; ctx.lineWidth = W * 0.02;
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.quadraticCurveTo(W * 0.06, H * 0.42, W * 0.3, H * 0.22 + m.bob);
  ctx.lineTo(W * 0.7, H * 0.22 + m.bob);
  ctx.quadraticCurveTo(W * 0.94, H * 0.42, W, H);
  ctx.stroke();
  ctx.fillStyle = '#3d6bd0';
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.quadraticCurveTo(W * 0.06, H * 0.42, W * 0.3, H * 0.22 + m.bob);
  ctx.lineTo(W * 0.34, H * 0.2 + m.bob);
  ctx.lineTo(W * 0.34, H);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(W, H);
  ctx.quadraticCurveTo(W * 0.94, H * 0.42, W * 0.7, H * 0.22 + m.bob);
  ctx.lineTo(W * 0.66, H * 0.2 + m.bob);
  ctx.lineTo(W * 0.66, H);
  ctx.closePath(); ctx.fill();

  // spinning rotor blur on top
  ctx.fillStyle = 'rgba(55,66,79,.55)';
  var rotor = Math.sin(m.t * 40) * W * 0.3;
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.16 + m.bob, W * 0.3 + Math.abs(rotor) * 0.3, H * 0.008, 0, 0, 7);
  ctx.fill();

  // instruments
  ctx.fillStyle = '#2c313c';
  ctx.fillRect(W * 0.4, H * 0.86, W * 0.2, H * 0.1);
  ctx.fillStyle = '#8fe08a';
  ctx.font = (H * 0.03) + 'px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ALT  HAPPY', W / 2, H * 0.915);

  var done = Math.min(1, m.t / CONFIG.heli.duration);
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.fillRect(W / 2 - W * 0.2, 14, W * 0.4, 8);
  ctx.fillStyle = '#f6d44d';
  ctx.fillRect(W / 2 - W * 0.2, 14, W * 0.4 * done, 8);
};

// ---------- THE END ----------

Mini.startEnd = function () {
  Game.state = 'end';
  var parts = [];
  for (var i = 0; i < 140; i++) {
    parts.push({
      x: Math.random(), y: Math.random(), vy: 0.06 + Math.random() * 0.12,
      sway: Math.random() * 6.28, size: 4 + Math.random() * 7,
      col: ['#e5493a', '#f5cf3d', '#5da641', '#4d7df0', '#f6d44d'][i % 5]
    });
  }
  Mini.mode = { kind: 'end', t: 0, parts: parts };
  UI.showEnd();
};

Mini.updateEnd = function (m, dt) {
  m.t += dt;
  for (var i = 0; i < m.parts.length; i++) {
    var p = m.parts[i];
    p.y += p.vy * dt;
    if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); }
  }
};

Mini.drawEnd = function (ctx, W, H) {
  var m = Mini.mode;
  var g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2d3f66'); g.addColorStop(1, '#16211a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // Barry waving goodbye (dizzy sprite = sitting, close enough to a wave)
  var img = SPRITES.barry_dizzy;
  var s = H * 0.28;
  var bob = Math.sin(m.t * 2) * 6;
  ctx.drawImage(img, W * 0.5 - s * 0.5, H * 0.52 - s + bob, s, s * 1.3);

  for (var i = 0; i < m.parts.length; i++) {
    var p = m.parts[i];
    ctx.save();
    ctx.translate(p.x * W + Math.sin(m.t * 2 + p.sway) * 14, p.y * H);
    ctx.rotate(Math.sin(m.t * 3 + p.sway) * 2);
    ctx.fillStyle = p.col;
    ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    ctx.restore();
  }
};
