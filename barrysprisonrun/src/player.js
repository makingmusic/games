// Barry's Prison Run — first-person player controller: walk, sprint, jump,
// gravity, ladders, vents, slide, climb, knockbacks, triggers.

var Player = {};

Player.init = function (spawn) {
  World.player = {
    x: spawn.x, y: spawn.y, z: spawn.z || 0, vz: 0,
    dir: spawn.dir || 0, pitch: 0,
    vx: 0, vy: 0,
    eyeZ: (spawn.z || 0) + CONFIG.player.eyeHeight,
    onGround: true, coyote: 0, jumpBuf: 0,
    climb: null, slideDir: null,
    hasBazooka: spawn.hasBazooka || false,
    shotAnim: 0, fireCd: 0, fruitIdx: 0,
    dizzy: 0, knockT: 0, knockX: 0, knockY: 0, spin: 0,
    moving: false, stepT: 0
  };
};

Player.update = function (dt) {
  var p = World.player;
  var C = CONFIG.player;

  // spin camera after a gotcha toss
  if (p.spin > 0) {
    p.spin -= dt * 2.4;
    p.dir += dt * 9;
  }
  if (p.dizzy > 0) p.dizzy -= dt;
  if (p.shotAnim > 0) p.shotAnim -= dt;
  if (p.fireCd > 0) p.fireCd -= dt;

  var vent = typeAt(p.x, p.y) === T_VENT;
  var inSlide = World.slide && World.slide.active;
  var speed = inSlide ? CONFIG.player.slideSpeed :
              (vent ? CONFIG.player.ventSpeed :
                (Input.sprint ? C.sprintSpeed : C.walkSpeed));
  if (p.dizzy > 0) speed *= 0.55;
  if (p.climb) speed = 0;

  // ---- desired movement ----
  var mx = 0, my = 0;
  if (!p.climb && !inSlide) {
    mx = Input.moveX; my = Input.moveY;
    var kb = keyboardAxes();
    mx += kb.x; my += kb.y;
    var len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
  } else if (inSlide) {
    mx = Input.moveX * 0.35 + (keyboardAxes().x) * 0.35;
  }

  var dirX = Math.cos(p.dir), dirY = Math.sin(p.dir);
  var wx = 0, wy = 0;
  if (inSlide) {
    wx = Math.cos(World.slide.dir); wy = Math.sin(World.slide.dir);
  } else if (!p.climb) {
    wx = dirX * my - dirY * mx;
    wy = dirY * my + dirX * mx;
  }
  var tvx = wx * speed, tvy = wy * speed;
  var acc = C.accel * dt;
  p.vx += (tvx - p.vx) * Math.min(1, acc);
  p.vy += (tvy - p.vy) * Math.min(1, acc);
  if (p.knockT > 0) {
    p.knockT -= dt;
    p.vx += p.knockX * dt * 6;
    p.vy += p.knockY * dt * 6;
  }

  // ---- ladder climb ----
  if (p.climb) {
    var lad = p.climb.lad;
    p.x += (p.climb.x - p.x) * Math.min(1, dt * 10);
    p.y += (p.climb.y - p.y) * Math.min(1, dt * 10);
    var up = Input.moveY + (Input.keys['KeyW'] ? 1 : 0) - (Input.keys['KeyS'] ? 1 : 0);
    p.z += up * CONFIG.ladder.climbSpeed * dt;
    p.vz = 0;
    p.stepT += dt;
    if (p.stepT > 0.3) { p.stepT = 0; sfx('climb'); }
    if (p.jumpBuf > 0) {
      p.jumpBuf = 0; p.climb = null;
      p.vz = C.jumpVel * 0.7; p.onGround = false;
      p.x -= Math.cos(p.dir) * 0.1; p.y -= Math.sin(p.dir) * 0.1;
    } else if (p.z >= lad.top - 0.02) {
      p.z = lad.top; p.climb = null; p.onGround = true;
      p.x += Math.cos(p.dir) * 0.8; p.y += Math.sin(p.dir) * 0.8;
      sfx('land');
    } else if (up < 0 && p.z <= lad.base + 0.03) {
      p.z = lad.base; p.climb = null; p.onGround = true;
    }
    p.eyeZ = p.z + C.eyeHeight;
    Player.checkTriggers();
    Player.checkUse();
    return;
  }

  // ---- horizontal move with collision ----
  var airborne = !p.onGround;
  var nx = p.x + p.vx * dt;
  if (!blockedAt(nx, p.y, p.z, airborne)) p.x = nx; else p.vx *= 0.2;
  var ny = p.y + p.vy * dt;
  if (!blockedAt(p.x, ny, p.z, airborne)) p.y = ny; else p.vy *= 0.2;

  // blocking props (furniture)
  for (var i = 0; i < World.props.length; i++) {
    var pr = World.props[i];
    if (!pr.block) continue;
    var ddx = p.x - pr.x, ddy = p.y - pr.y;
    var d2 = ddx * ddx + ddy * ddy;
    var rr2 = pr.block + CONFIG.player.radius;
    if (d2 < rr2 * rr2 && d2 > 0.0001 && Math.abs(p.z - (pr.z || 0)) < 1.2) {
      var dd = Math.sqrt(d2);
      p.x = pr.x + ddx / dd * rr2;
      p.y = pr.y + ddy / dd * rr2;
    }
  }

  // ---- vertical ----
  var F = floorAt(p.x, p.y);
  p.jumpBuf -= dt; p.coyote -= dt;

  if (inSlide) {
    p.z = F; p.vz = 0; p.onGround = true;
  } else if (p.onGround) {
    if (F > p.z - 0.65 && F < p.z + C.stepUp) {
      p.z = F;                          // smooth stairs & small steps
    } else if (F < p.z - 0.65) {
      p.onGround = false; p.coyote = C.coyote; p.vz = 0;  // walked off a ledge
    }
    if (p.jumpBuf > 0) {
      p.jumpBuf = 0; p.vz = C.jumpVel; p.onGround = false;
      sfx('jump');
    }
  }
  if (!p.onGround) {
    p.vz -= C.gravity * dt;
    p.z += p.vz * dt;
    var F2 = floorAt(p.x, p.y);
    if (p.vz <= 0 && p.z <= F2) {
      p.z = F2; p.vz = 0; p.onGround = true;
      sfx('land');
    }
  }

  // spikes: cartoon poof back to checkpoint
  var ct = typeAt(p.x, p.y);
  if ((ct === T_SPIKE || (World.ctype[idx(Math.floor(p.x), Math.floor(p.y))] === T_SPIKE)) && p.z <= cellFloor(Math.floor(p.x), Math.floor(p.y)) + 0.05) {
    Game.spikePoof();
    return;
  }

  // eye smoothing (+ lowered in vents)
  var eyeTarget = p.z + (vent && p.onGround ? C.ventEye : C.eyeHeight);
  p.eyeZ += (eyeTarget - p.eyeZ) * Math.min(1, dt * C.zLerp);

  // footsteps
  p.moving = Math.hypot(p.vx, p.vy) > 0.4;
  if (p.moving && p.onGround) {
    p.stepT += dt;
    if (p.stepT > (vent ? 0.5 : 0.34)) { p.stepT = 0; sfx('step'); }
  }

  Player.checkTriggers();
  Player.checkUse();
};

Player.checkTriggers = function () {
  var p = World.player;
  for (var i = 0; i < World.triggers.length; i++) {
    var t = World.triggers[i];
    if (t.done) continue;
    var dx = p.x - t.x, dy = p.y - t.y;
    if (dx * dx + dy * dy < t.r * t.r) {
      if (t.once) t.done = true;
      t.fn();
    }
  }
};

// nearest usable thing in front
Player.findUse = function () {
  var p = World.player;
  var best = null, bd = 1.35;
  for (var i = 0; i < World.useTargets.length; i++) {
    var u = World.useTargets[i];
    if (u.used || u.hidden) continue;
    var dx = u.x - p.x, dy = u.y - p.y;
    var d = Math.hypot(dx, dy);
    if (d < bd && Math.abs((u.z || 0) - p.z) < 1.6) {
      var ang = Math.atan2(dy, dx) - p.dir;
      while (ang > Math.PI) ang -= 2 * Math.PI;
      while (ang < -Math.PI) ang += 2 * Math.PI;
      if (Math.abs(ang) < 1.5 || d < 0.7) { best = u; bd = d; }
    }
  }
  // ladders too: the player's own cell first, then the cell ahead
  if (!best) {
    var ownKey = Math.floor(p.x) + ',' + Math.floor(p.y);
    var dirX = Math.cos(p.dir), dirY = Math.sin(p.dir);
    var fx = p.x + dirX * 0.7, fy = p.y + dirY * 0.7;
    var frontKey = Math.floor(fx) + ',' + Math.floor(fy);
    var lad = World.ladders[ownKey] || World.ladders[frontKey];
    if (lad && World.ctype[idx(lad.x, lad.y)] === T_LADDER) {
      best = { kind: 'ladder', x: lad.x + 0.5, y: lad.y + 0.5, z: 0, ladder: lad, label: 'Climb' };
    }
  }
  return best;
};

Player.checkUse = function () {
  var u = Player.findUse();
  Game.useTarget = u;
  if (Input.useQueued) {
    Input.useQueued = false;
    if (u) {
      if (u.kind === 'ladder') {
        var p = World.player;
        p.climb = { x: u.ladder.x + 0.5, y: u.ladder.y + 0.5, lad: u.ladder };
        p.z = Math.max(p.z, u.ladder.base + 0.04);
        p.vz = 0; p.vx = p.vy = 0;
      } else if (u.fn) {
        u.fn(u);
      }
    }
  }
};

// comic knockback from boss attacks / cones
Player.knock = function (fromX, fromY, power) {
  var p = World.player;
  var dx = p.x - fromX, dy = p.y - fromY;
  var d = Math.hypot(dx, dy) || 1;
  p.knockX = dx / d * (power || 1) * CONFIG.player.knockback;
  p.knockY = dy / d * (power || 1) * CONFIG.player.knockback;
  p.knockT = 0.35;
  p.dizzy = CONFIG.player.dizzyTime;
  sfx('bonk');
  Game.stars(0.8);
};

// Barry caught you: spin + gentle toss, no progress lost
Player.gotcha = function (fromX, fromY) {
  var p = World.player;
  if (p.spin > 0 || p.dizzy > 0.4) return;
  Player.knock(fromX, fromY, 1.2);
  p.spin = 0.8;
  p.dizzy = 1.0;
  sfx('gotcha');
  Game.toast('GOTCHA! HOY!');
  Game.stats.caught++;
};
