// Barry's Prison Run — Officer Barry: the chaser. He waddle-runs along his own
// path, cannot climb stairs or reach the wall circles, and HOYs constantly.

var Barry = {};

Barry.spawn = function (path, opts) {
  opts = opts || {};
  World.barry = {
    x: path[0].x + 0.5, y: path[0].y + 0.5, z: 0,
    dir: 0, visible: true, active: false,
    state: 'idle',            // idle | chase | blocked | reroute | dizzy | gone
    path: path, pathI: 0,
    speed: CONFIG.barry.chaseSpeed,
    animT: 0, frame: 'idle0',
    say: { text: '', t: 0 }, hoyT: 1,
    blockT: 0, rerouteT: 0, bounceT: 0, tag: null,
    catchCd: 0
  };
};

Barry.update = function (dt, now) {
  var b = World.barry;
  if (!b || !b.visible) return;
  var p = World.player;
  var distP = Math.hypot(p.x - b.x, p.y - b.y);

  // ---- the HOY schedule: walking, standing, chasing — always HOY ----
  b.hoyT -= dt;
  if (b.hoyT <= 0 && b.state !== 'gone') {
    b.hoyT = CONFIG.barry.hoyEveryMin + Math.random() * (CONFIG.barry.hoyEveryMax - CONFIG.barry.hoyEveryMin);
    if (b.state === 'blocked') b.hoyT *= 0.5;   // extra HOY when angry
    var vol = distP > CONFIG.barry.hoyEarshot ? 0 : Math.max(0.05, 0.17 * (1 - distP / CONFIG.barry.hoyEarshot));
    var shout = b.state === 'blocked' ? 'HOY!!' : 'HOY!';
    b.say = { text: shout, t: 0.95 };
    if (vol > 0) sfx('hoy', vol);
  }
  if (b.say.t > 0) b.say.t -= dt;
  if (b.catchCd > 0) b.catchCd -= dt;

  // ground height under Barry
  b.z = floorAt(b.x, b.y);
  if (b.z > 1e8) b.z = 0;

  if (b.state === 'idle' || b.state === 'gone') {
    b.frame = (now * 1.2 % 2 < 1) ? 'idle0' : 'idle1';
    return;
  }

  if (b.state === 'chase') {
    // follow waypoints toward the player's escape route
    var wp = b.path[b.pathI];
    if (!wp) { b.state = 'idle'; return; }
    var tx = wp.x + 0.5, ty = wp.y + 0.5;
    var dx = tx - b.x, dy = ty - b.y;
    var d = Math.hypot(dx, dy);
    if (d < 0.3) {
      if (wp.block) {
        // reached a spot he cannot pass (stairs / circles): stand and rage
        b.state = 'blocked';
        b.rerouteT = wp.reroute || 3.2;
        b.say = { text: 'HOY!!!', t: 1 };
        sfx('hoy', 0.16);
        return;
      }
      b.pathI++;
    } else {
      b.dir = Math.atan2(dy, dx);
      b.x += (dx / d) * b.speed * dt;
      b.y += (dy / d) * b.speed * dt;
      b.animT += dt;
      b.frame = (b.animT * 4 % 2 < 1) ? 'walk0' : 'walk1';
    }

    // catch!
    if (distP < CONFIG.barry.catchRadius && Math.abs(p.z - b.z) < 0.55 &&
        b.catchCd <= 0 && p.spin <= 0) {
      Player.gotcha(b.x, b.y);
      b.catchCd = 2.0;
      b.say = { text: 'GOTCHA!', t: 1 };
    }
    return;
  }

  if (b.state === 'blocked') {
    // jumping angry fist-waving at the bottom of the stairs / under the circles
    b.bounceT += dt;
    b.frame = 'angry';
    b.dir = Math.atan2(p.y - b.y, p.x - b.x);
    b.rerouteT -= dt;
    if (b.rerouteT <= 0) {
      // he takes his own lower route and reappears further along
      b.state = 'reroute';
    }
    return;
  }

  if (b.state === 'reroute') {
    // fast waddle along the floor route under the player's circles
    var wp2 = b.path[b.pathI + 1];
    if (!wp2) { b.state = 'idle'; return; }
    var tx2 = wp2.x + 0.5, ty2 = wp2.y + 0.5;
    var dx2 = tx2 - b.x, dy2 = ty2 - b.y;
    var d2 = Math.hypot(dx2, dy2);
    if (d2 < 0.3) {
      b.pathI++;
      b.state = 'chase';
      return;
    }
    b.dir = Math.atan2(dy2, dx2);
    b.x += (dx2 / d2) * b.speed * 1.35 * dt;
    b.y += (dy2 / d2) * b.speed * 1.35 * dt;
    b.animT += dt;
    b.frame = (b.animT * 5 % 2 < 1) ? 'walk0' : 'walk1';
    if (distP < CONFIG.barry.catchRadius && Math.abs(p.z - b.z) < 0.55 && b.catchCd <= 0 && p.spin <= 0) {
      Player.gotcha(b.x, b.y);
      b.catchCd = 2.0;
    }
    return;
  }

  if (b.state === 'dizzy') {
    b.frame = 'dizzy';
    return;
  }
};

Barry.addSprites = function (add, now) {
  var b = World.barry;
  var zBounce = b.state === 'blocked' ? Math.abs(Math.sin(b.bounceT * 7)) * 0.22 : 0;
  add(b.x, b.y, 'barry_' + b.frame, 0.86, { z: b.z + zBounce, tall: 1.5, ent: b });
};
