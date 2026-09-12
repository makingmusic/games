// Elephanto — game state and rules.
// Kept DOM-free on purpose: rendering lives in raycaster.js, HUD in ui.js.
// Rules implemented here:
//  - damage is ONLY possible inside the arena (for everyone)
//  - the player regenerates health ONLY outside the arena
//  - Coffee Man & Tea Girl have 3 lives each, with linked health:
//    when one is downed, the other loses the same percent of health
//  - walking outside the base is slow
//  - death -> respawn at the base entrance after ~1.5s

var QUESTS = [
  'Uncle Pete: Grab a weapon from the STASH room near the arena!',
  'Uncle Pete: Train your muscles in the GYM once!',
  'Uncle Pete: Take one LIFE from Coffee Man or Tea Girl!'
];
var QUEST_DONE_TEXT = 'Uncle Pete: Take ALL their lives! You can do it! 💪';

var ARENA_CENTER = { x: 11.5, y: 5.0 }; // guide arrow target

var Game = { state: 'menu', time: 0 }; // 'menu' | 'playing' | 'won'
var World = null;

// ---------- small helpers ----------

function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }

function angleDiff(a, b) {
  var d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function msg(text) {
  World.messages.push({ text: text, t: 3 });
}

function playSfx(name) { if (typeof sfx === 'function') sfx(name); }

// Axis-separated movement with wall collision (radius keeps us off corners).
function moveEntity(e, vx, vy, radius, dt) {
  var nx = e.x + vx * dt;
  if (!isWallXY(nx + Math.sign(vx) * radius, e.y - radius) &&
      !isWallXY(nx + Math.sign(vx) * radius, e.y + radius)) e.x = nx;
  var ny = e.y + vy * dt;
  if (!isWallXY(e.x - radius, ny + Math.sign(vy) * radius) &&
      !isWallXY(e.x + radius, ny + Math.sign(vy) * radius)) e.y = ny;
}

function clampToArena(e) {
  e.x = Math.max(ARENA.x0 + 0.3, Math.min(ARENA.x1 - 0.3, e.x));
  e.y = Math.max(ARENA.y0 + 0.3, Math.min(ARENA.y1 - 0.3, e.y));
}

// Move toward a target, routing through the arena door when needed.
function moveToward(e, tx, ty, speed, dt, stayInArena) {
  var txInArena = isArenaXY(tx, ty);
  var eInArena = isArenaXY(e.x, e.y);
  if (txInArena !== eInArena && Math.abs(e.y - ARENA_DOOR.y) > 0.1) {
    // need to pass through the arena door first
    if (Math.abs(e.x - ARENA_DOOR.x) > 0.4 || Math.abs(e.y - ARENA_DOOR.y) > 1.2) {
      tx = ARENA_DOOR.x; ty = ARENA_DOOR.y;
    }
  }
  var a = angleTo(e.x, e.y, tx, ty);
  e.dir = a;
  moveEntity(e, Math.cos(a) * speed, Math.sin(a) * speed, 0.25, dt);
  if (stayInArena) clampToArena(e);
}

function lineOfSight(ax, ay, bx, by) {
  var d = dist(ax, ay, bx, by);
  var steps = Math.max(1, Math.ceil(d / 0.2));
  for (var i = 1; i < steps; i++) {
    var t = i / steps;
    if (isWallXY(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

// ---------- game setup ----------

Game.newGame = function (role) {
  World = createWorld(role);
  Game.state = 'playing';
  Game.time = 0;
  msg('Welcome to the evil base, ' + (role === 'protector' ? 'Protector' : 'Kid') + '!');
};

Game.currentQuestText = function () {
  if (World.questIndex < QUESTS.length) return QUESTS[World.questIndex];
  return QUEST_DONE_TEXT;
};

// Persistent HUD objective line (separate from Uncle Pete's quests).
Game.objectiveText = function () {
  if (Game.state === 'won') return '🏆 Base cleared! You win!';
  var c = World.coffee.lives, t = World.tea.lives;
  if ((c <= 0 || t <= 0) && (c > 0 || t > 0)) return '🎯 One boss is down — finish the other!';
  if (isArenaXY(World.player.x, World.player.y)) {
    return '⚔️ FIGHT! Step out of the arena anytime to heal';
  }
  return '🎯 OBJECTIVE: Take all 3 lives from BOTH Coffee Man & Tea Girl — in the ARENA';
};

// Bearing from the player's view to the arena, for the HUD guide arrow.
// Returns radians relative to the view direction (0 = straight ahead),
// or null when the player is inside the arena (arrow hidden).
function guideAngle() {
  var p = World.player;
  if (isArenaXY(p.x, p.y)) return null;
  return angleDiff(angleTo(p.x, p.y, ARENA_CENTER.x, ARENA_CENTER.y), p.dir);
}

function completeQuest() {
  playSfx('quest');
  msg('✅ Quest complete!');
  World.questIndex++;
}

// ---------- combat rules ----------

// Arena-only melee. Returns true if a hit landed.
function meleeAttack(attacker, weapon, targets, dmgMult) {
  if (!isArenaXY(attacker.x, attacker.y)) return false; // fighting only in the arena
  var best = null, bestD = weapon.range;
  for (var i = 0; i < targets.length; i++) {
    var t = targets[i];
    var d = dist(attacker.x, attacker.y, t.x, t.y);
    if (d > bestD) continue;
    if (Math.abs(angleDiff(angleTo(attacker.x, attacker.y, t.x, t.y), attacker.dir)) > 0.6) continue;
    if (!isArenaXY(t.x, t.y)) continue; // target must also be in the arena
    best = t; bestD = d;
  }
  if (best) {
    damageBadGuy(best, weapon.dmg * (dmgMult || 1));
    return true;
  }
  return false;
}

function liveBadGuys() {
  var list = [];
  if (World.coffee.lives > 0) list.push(World.coffee);
  if (World.tea.lives > 0) list.push(World.tea);
  for (var i = 0; i < World.minions.length; i++) {
    if (World.minions[i].hp > 0) list.push(World.minions[i]);
  }
  return list;
}

function damageBadGuy(e, dmg) {
  if (e.kind === 'boss') damageBoss(e, dmg, false);
  else {
    e.hp -= dmg; e.flash = 0.15;
    if (e.hp <= 0) msg('A bad-guy minion is down!');
  }
}

// Boss damage with the LINKED HEALTH rule:
// when one boss is downed, the other loses the same percent of health
// (a down = a whole life, so the other loses a whole life too).
function damageBoss(boss, dmg, viaLink) {
  if (boss.lives <= 0) return;
  boss.hp -= dmg;
  boss.flash = 0.15;
  if (boss.hp > 0) return;

  boss.lives--;
  boss.hp = boss.lives > 0 ? boss.maxHp : 0;
  playSfx('down');
  if (boss.lives > 0) msg(boss.name + ' lost a life! ' + boss.lives + ' left!');
  else msg('💀 ' + boss.name + ' is DEFEATED!');

  if (World.questIndex === 2) completeQuest();

  if (!viaLink) {
    var other = boss.id === 'coffee' ? World.tea : World.coffee;
    if (other.lives > 0) {
      msg('🔗 Linked health! ' + other.name + ' loses the same!');
      damageBoss(other, other.maxHp, true);
    }
  }
  checkWin();
}

function damagePlayer(dmg, why) {
  var p = World.player;
  if (p.dead || Game.state !== 'playing') return;
  p.hp -= dmg;
  p.flash = 0.4;
  playSfx('hurt');
  if (p.hp <= 0) {
    p.hp = 0;
    p.dead = true;
    p.respawnT = RESPAWN_DELAY;
    p.deaths++;
    msg(why || 'You got bonked!');
  }
}

function checkWin() {
  if (World.coffee.lives <= 0 && World.tea.lives <= 0 && Game.state === 'playing') {
    Game.state = 'won';
    playSfx('win');
    if (typeof UI !== 'undefined' && UI.showWin) {
      var secs = Math.floor(Game.time);
      UI.showWin('Time: ' + Math.floor(secs / 60) + 'm ' + (secs % 60) + 's · Deaths: ' + World.player.deaths);
    }
  }
}

// ---------- player actions (called by input/main) ----------

Game.doAttack = function () {
  var p = World.player;
  if (!p || p.dead || Game.state !== 'playing') return;
  if (p.attackCd > 0) return;
  var w = WEAPONS[p.weapon];
  p.attackCd = w.rate;
  p.attackAnim = 0.28;
  playSfx('swing');
  var hit = meleeAttack(p, w, liveBadGuys(), p.dmgMult);
  if (hit) {
    p.hitMarkerT = 0.15;
    playSfx('hit');
  } else if (!isArenaXY(p.x, p.y) && p.hintT <= 0) {
    msg('⚠️ Fighting only allowed in the arena!');
    p.hintT = 1;
  }
};

Game.doInteract = function () {
  var p = World.player;
  if (!p || p.dead || Game.state !== 'playing') return;

  if (dist(p.x, p.y, STASH_POS.x, STASH_POS.y) < 1.9) {
    // weapon stash: tap to cycle/select a weapon
    var idx = WEAPON_ORDER.indexOf(p.weapon);
    var next = WEAPON_ORDER[(idx + 1) % WEAPON_ORDER.length];
    p.weapon = next;
    if (p.owned.indexOf(next) < 0) p.owned.push(next);
    msg('🧰 Stash: equipped ' + WEAPONS[next].name + '!');
    playSfx('pickup');
    if (World.questIndex === 0) completeQuest();
    return;
  }

  if (dist(p.x, p.y, BENCH_POS.x, BENCH_POS.y) < 1.9) {
    // gym: train muscles once for a permanent buff
    if (!p.gymTrained) {
      p.gymTrained = true;
      p.dmgMult *= GYM_BUFF_DMG;
      p.maxHp += GYM_BUFF_HP;
      p.hp = p.maxHp;
      msg('💪 Muscles trained! +' + GYM_BUFF_HP + ' max HP, stronger hits!');
      playSfx('quest');
      if (World.questIndex === 1) completeQuest();
    } else {
      msg('You already trained. Those muscles are huge!');
    }
    return;
  }

  msg('Nothing to use here. Try the stash or the gym bench!');
};

Game.doHeal = function () {
  var p = World.player;
  if (!p || p.dead || Game.state !== 'playing') return;
  if (p.role !== 'protector') {
    msg('Only the Protector carries a medkit!');
    return;
  }
  if (p.medkit <= 0) {
    msg('Medkit is empty! It refills when you respawn.');
    return;
  }
  // aiming at a close ally? heal them, otherwise heal self
  var allies = [World.pete, World.tuado];
  for (var i = 0; i < allies.length; i++) {
    var a = allies[i];
    if (a.resting) continue;
    if (dist(p.x, p.y, a.x, a.y) < 2.8 &&
        Math.abs(angleDiff(angleTo(p.x, p.y, a.x, a.y), p.dir)) < 0.7) {
      p.medkit--;
      a.hp = Math.min(a.maxHp, a.hp + MEDKIT_HEAL);
      msg('🩹 Healed ' + a.name + '!');
      playSfx('heal');
      return;
    }
  }
  p.medkit--;
  p.hp = Math.min(p.maxHp, p.hp + MEDKIT_HEAL);
  msg('🩹 Healed yourself!');
  playSfx('heal');
};

// ---------- per-frame update ----------

Game.update = function (dt) {
  if (!World || Game.state === 'menu') return;
  Game.time += dt;

  var p = World.player;

  // message timers
  for (var i = World.messages.length - 1; i >= 0; i--) {
    World.messages[i].t -= dt;
    if (World.messages[i].t <= 0) World.messages.splice(i, 1);
  }

  if (p.flash > 0) p.flash -= dt;
  if (p.hitMarkerT > 0) p.hitMarkerT -= dt;
  if (p.hintT > 0) p.hintT -= dt;
  if (p.attackCd > 0) p.attackCd -= dt;
  if (p.attackAnim > 0) p.attackAnim -= dt;

  // --- death / respawn ---
  if (p.dead) {
    p.respawnT -= dt;
    if (p.respawnT <= 0) {
      p.dead = false;
      p.hp = p.maxHp;
      p.medkit = p.role === 'protector' ? MEDKIT_CHARGES : 0;
      p.x = SPAWN_ENTRANCE.x; p.y = SPAWN_ENTRANCE.y; p.dir = SPAWN_ENTRANCE.dir;
      msg('Back at the entrance. Go get them!');
    }
    return; // no movement/actions while dead
  }

  // --- look / turn ---
  var turn = Input.turn + keyboardTurn(dt) + Input.turnHeld * 2.6 * dt;
  Input.turn = 0;
  if (turn !== 0) World.showLookHint = false; // player found the look controls
  p.dir += turn;

  // --- move (slow outside the base) ---
  var ka = keyboardAxes();
  var mx = ka.x + Input.moveX, my = ka.y + Input.moveY;
  var len = Math.hypot(mx, my);
  if (len > 1) { mx /= len; my /= len; }
  if (len > 0.01) {
    var speed = PLAYER_SPEED * (isOutdoorXY(p.x, p.y) ? OUTDOOR_SLOW : 1);
    var vx = (Math.cos(p.dir) * my - Math.sin(p.dir) * mx) * speed;
    var vy = (Math.sin(p.dir) * my + Math.cos(p.dir) * mx) * speed;
    moveEntity(p, vx, vy, PLAYER_RADIUS, dt);
  }

  // --- health regen: only OUTSIDE the arena ---
  if (!isArenaXY(p.x, p.y) && p.hp < p.maxHp) {
    p.hp = Math.min(p.maxHp, p.hp + REGEN_RATE * dt);
  }

  // first time stepping into the arena: explain the loop
  if (isArenaXY(p.x, p.y) && !World.arenaHintShown) {
    World.arenaHintShown = true;
    msg('⚔️ Fight here! Step out of the arena anytime to heal.');
  }

  // --- actions ---
  if ((Input.attackHeld || Input.attackQueued) && p.attackCd <= 0) Game.doAttack();
  Input.attackQueued = false;
  if (Input.interactQueued) { Game.doInteract(); Input.interactQueued = false; }
  if (Input.healQueued) { Game.doHeal(); Input.healQueued = false; }

  // --- ground pickups: walk over a weapon to grab it ---
  for (i = 0; i < World.pickups.length; i++) {
    var pk = World.pickups[i];
    if (!pk.taken && dist(p.x, p.y, pk.x, pk.y) < 0.55) {
      pk.taken = true;
      if (p.owned.indexOf(pk.weapon) < 0) p.owned.push(pk.weapon);
      p.weapon = pk.weapon;
      msg('Picked up a ' + WEAPONS[pk.weapon].name + '!');
      playSfx('pickup');
      if (World.questIndex === 0) completeQuest();
    }
  }

  updateBoss(World.coffee, dt);
  updateBoss(World.tea, dt);
  updatePete(dt);
  updateTuado(dt);
  for (i = 0; i < World.minions.length; i++) updateMinion(World.minions[i], dt);
  updateLava(dt);

  // effects timers
  for (i = World.effects.length - 1; i >= 0; i--) {
    World.effects[i].t -= dt;
    if (World.effects[i].t <= 0) World.effects.splice(i, 1);
  }
};

// ---------- NPC behaviour ----------

function updateBoss(b, dt) {
  if (b.lives <= 0) return;
  if (b.flash > 0) b.flash -= dt;
  if (b.attackCd > 0) b.attackCd -= dt;

  var p = World.player;
  var playerInArena = !p.dead && isArenaXY(p.x, p.y);
  var peteInArena = !World.pete.resting && isArenaXY(World.pete.x, World.pete.y);

  if (!playerInArena && !peteInArena) {
    // nobody to fight: stroll back to post
    if (dist(b.x, b.y, b.postX, b.postY) > 0.4) moveToward(b, b.postX, b.postY, BOSS_SPEED * 0.5, dt, true);
    return;
  }

  // pick nearest target that is inside the arena
  var target = null;
  if (playerInArena) target = p;
  if (peteInArena && (!target || dist(b.x, b.y, World.pete.x, World.pete.y) < dist(b.x, b.y, p.x, p.y))) {
    target = World.pete;
  }
  var d = dist(b.x, b.y, target.x, target.y);
  if (d > 1.4) {
    moveToward(b, target.x, target.y, BOSS_SPEED, dt, true);
  } else if (b.attackCd <= 0) {
    // staff whack — only lands because everyone here is inside the arena
    b.attackCd = 1.0;
    b.dir = angleTo(b.x, b.y, target.x, target.y);
    if (target === p) damagePlayer(BOSS_DMG, 'Whacked by ' + b.name + "'s yellow staff!");
    else { target.hp -= BOSS_DMG; target.flash = 0.2; }
    playSfx('swing');
  }
}

function updatePete(dt) {
  var pete = World.pete;
  if (pete.flash > 0) pete.flash -= dt;
  if (pete.attackCd > 0) pete.attackCd -= dt;

  if (pete.resting) {
    pete.restT -= dt;
    if (pete.restT <= 0) {
      pete.resting = false;
      pete.hp = pete.maxHp;
      pete.x = World.player.x + 0.8; pete.y = World.player.y + 0.8;
      msg('Uncle Pete is back on his feet!');
    }
    return;
  }

  if (pete.hp <= 0) {
    pete.resting = true;
    pete.restT = PETE_REST_TIME;
    msg('Uncle Pete needs a rest… he\'ll be back!');
    return;
  }

  // slow regen while outside the arena, like the player
  if (!isArenaXY(pete.x, pete.y) && pete.hp < pete.maxHp) {
    pete.hp = Math.min(pete.maxHp, pete.hp + 3 * dt);
  }

  var p = World.player;

  // fight bad guys in the arena when the player is fighting there
  if (!p.dead && isArenaXY(p.x, p.y)) {
    var best = null, bestD = 1e9;
    var bads = liveBadGuys();
    for (var i = 0; i < bads.length; i++) {
      if (!isArenaXY(bads[i].x, bads[i].y)) continue;
      var d = dist(pete.x, pete.y, bads[i].x, bads[i].y);
      if (d < bestD) { best = bads[i]; bestD = d; }
    }
    if (best) {
      if (bestD > 1.5) {
        moveToward(pete, best.x, best.y, 2.6, dt, false);
      } else if (pete.attackCd <= 0) {
        pete.attackCd = 0.9;
        pete.dir = angleTo(pete.x, pete.y, best.x, best.y);
        damageBadGuy(best, PETE_DMG);
        playSfx('hit');
      }
      return;
    }
  }

  // otherwise follow the player around
  var dp = dist(pete.x, pete.y, p.x, p.y);
  if (dp > 2.2) moveToward(pete, p.x, p.y, 2.6, dt, false);
  else if (dp > 0.1) pete.dir = angleTo(pete.x, pete.y, p.x, p.y);
}

function updateTuado(dt) {
  var t = World.tuado;

  // wander around the base hall
  t.wanderT -= dt;
  if (t.wanderT <= 0) {
    t.wanderT = 3 + Math.random() * 4;
    // pick a random walkable spot in the hall (cols 8-21, rows 9-14)
    for (var tries = 0; tries < 10; tries++) {
      var wx = 8.5 + Math.random() * 13;
      var wy = 9.5 + Math.random() * 5;
      if (!isWallXY(wx, wy) && !isOutdoorXY(wx, wy)) { t.wx = wx; t.wy = wy; break; }
    }
  }
  if (dist(t.x, t.y, t.wx, t.wy) > 0.4) moveToward(t, t.wx, t.wy, 1.4, dt, false);

  // clumsy lava accident: warning meow, then a lob toward the player
  var p = World.player;
  if (t.warnT > 0) {
    t.warnT -= dt;
    if (t.warnT <= 0 && !p.dead && Game.state === 'playing') {
      World.lava.push({ x: t.x, y: t.y, sx: t.x, sy: t.y, tx: p.x, ty: p.y, t: 0 });
      playSfx('lava');
    }
  } else {
    t.lavaT -= dt;
    if (t.lavaT <= 0) {
      t.lavaT = TUADO_LAVA_MIN + Math.random() * (TUADO_LAVA_MAX - TUADO_LAVA_MIN);
      t.warnT = 0.8;
      msg('🐱 Tuado: MEEEOOW!! (oops — lava incoming!)');
      playSfx('meow');
    }
  }
}

function updateMinion(m, dt) {
  if (m.hp <= 0) return;
  if (m.flash > 0) m.flash -= dt;
  if (m.attackCd > 0) m.attackCd -= dt;

  var p = World.player;
  var playerInArena = !p.dead && isArenaXY(p.x, p.y);

  if (m.inArena && playerInArena) {
    // arena guard: fight the player inside the arena
    var d = dist(m.x, m.y, p.x, p.y);
    if (d > 1.3) {
      moveToward(m, p.x, p.y, 2.0, dt, true);
    } else if (m.attackCd <= 0) {
      m.attackCd = 1.1;
      m.dir = angleTo(m.x, m.y, p.x, p.y);
      damagePlayer(MINION_DMG, 'Bonked by a minion!');
    }
    return;
  }

  if (m.inArena) {
    if (dist(m.x, m.y, m.postX, m.postY) > 0.4) moveToward(m, m.postX, m.postY, 1.2, dt, true);
    return;
  }

  // hall wanderer: stroll around, menacing but harmless outside the arena
  m.wanderT -= dt;
  if (m.wanderT <= 0) {
    m.wanderT = 4 + Math.random() * 4;
    for (var tries = 0; tries < 10; tries++) {
      var wx = 8.5 + Math.random() * 13;
      var wy = 9.5 + Math.random() * 5;
      if (!isWallXY(wx, wy) && !isOutdoorXY(wx, wy)) { m.wx = wx; m.wy = wy; break; }
    }
  }
  if (dist(m.x, m.y, m.wx, m.wy) > 0.4) moveToward(m, m.wx, m.wy, 1.1, dt, false);
}

function updateLava(dt) {
  var p = World.player;
  for (var i = World.lava.length - 1; i >= 0; i--) {
    var l = World.lava[i];
    l.t += dt / 0.9; // ~0.9s flight time
    if (l.t >= 1) {
      World.lava.splice(i, 1);
      World.effects.push({ x: l.tx, y: l.ty, sprite: 'splash', t: 0.5, scale: 0.8 });
      // the splash is an accident, so it can hurt anywhere — even outside the arena
      if (!p.dead && dist(p.x, p.y, l.tx, l.ty) < 1.3) {
        damagePlayer(TUADO_LAVA_DMG, 'Splat! Tuado\'s lava got you!');
      }
    } else {
      l.x = l.sx + (l.tx - l.sx) * l.t;
      l.y = l.sy + (l.ty - l.sy) * l.t;
    }
  }
}
