// Barry's Prison Run — game state machine, checkpoints, saving, transitions.

var Game = {
  state: 'title',        // title | howto | playing | mode | end
  stage: 1,
  time: 0,
  cp: null,              // last checkpoint {stage,id,x,y,z,dir}
  stats: null,
  bannerT: 0,
  toastT: 0, toastMsg: '',
  hintT: 0, hintMsg: '',
  poofT: 0, zapT: 0, shakeT: 0, starsT: 0,
  aimTarget: false,
  useTarget: null,
  warp: null
};

// ---------- the next-goal system (always tell the player what to do) ----------

Game.goal = null;   // { text, x, y, z, ent }

Game.setGoal = function (text, x, y, z, ent) {
  if (!text) { Game.goal = null; UI.objective(null); return; }
  Game.goal = { text: text, x: x, y: y, z: z === undefined ? 0.6 : z, ent: ent || null };
  UI.objective(text);
};

// live position of the current goal (bosses move around)
Game.goalPos = function () {
  var g = Game.goal;
  if (!g) return null;
  if (g.ent) {
    if (g.ent.defeated || g.ent.state === 'defeated') { return null; }
    return { x: g.ent.x, y: g.ent.y, z: (g.ent.z || 0) + 0.9 };
  }
  return { x: g.x, y: g.y, z: g.z };
};

Game.newGame = function () {
  Game.stage = 1;
  Game.cp = null;
  Game.stats = { fruit: 0, splats: 0, caught: 0, snacks: 0, cones: 0, buttons: 0, pickups: 0, time: 0 };
  Stages.load(1);
  Game.state = 'playing';
  Game.save();
};

Game.loadStage = function (n, opts) {
  Game.stage = n;
  Stages.load(n, opts);
  if (Game.state !== 'playing') Game.state = 'playing';
  UI.showShoot(World.player.hasBazooka);
  Game.save();
};

Game.reachCheckpoint = function (id, x, y, dir, z) {
  Game.cp = { stage: Game.stage, id: id, x: x, y: y, z: z, dir: dir };
  sfx('check');
  Game.toast('Checkpoint!');
  Game.save();
};

Game.spikePoof = function () {
  var p = World.player;
  p.vz = 0; p.vx = 0; p.vy = 0; p.dizzy = 0.5;
  Game.poofT = CONFIG.spike.poofTime;
  Game.stats.caught++;    // counted as an "ouch", shown honestly at the end
  sfx('poof');
  Game.toast('Oof! Spikes! Back to the checkpoint.');
};

Game.respawn = function () {
  var cp = Game.cp;
  if (cp && cp.stage === Game.stage) {
    Player.init({ x: cp.x, y: cp.y, z: cp.z, dir: cp.dir, hasBazooka: World.player.hasBazooka });
  } else {
    Stages.load(Game.stage);
  }
};

Game.zapOut = function () {
  if (Game.zapT > 0) return;
  Game.zapT = 1.1;
  sfx('zap');
  Game.toast('ZAP!');
};

Game.theEnd = function () {
  Game.state = 'end';
  sfx('win');
  Mini.startEnd();
  Game.clearSave();
};

// ---------- save ----------

Game.saveData = function () {
  return {
    stage: Game.stage,
    cp: Game.cp,
    stats: Game.stats,
    bazooka: World.player ? World.player.hasBazooka : false
  };
};

Game.save = function () {
  if (Game.state !== 'playing' && Game.state !== 'mode') return;
  try {
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(Game.saveData()));
  } catch (e) { /* private mode etc. */ }
};

Game.hasSave = function () {
  try { return !!localStorage.getItem(CONFIG.saveKey); } catch (e) { return false; }
};

Game.clearSave = function () {
  try { localStorage.removeItem(CONFIG.saveKey); } catch (e) {}
};

Game.continueGame = function () {
  var d = null;
  try { d = JSON.parse(localStorage.getItem(CONFIG.saveKey)); } catch (e) {}
  if (!d) { Game.newGame(); return; }
  Game.stats = d.stats || Game.stats;
  Game.stage = d.stage || 1;
  if (d.cp && d.cp.stage === Game.stage) {
    Stages.load(Game.stage, { keepBazooka: d.bazooka });
    Player.init({
      x: d.cp.x, y: d.cp.y, z: d.cp.z, dir: d.cp.dir,
      hasBazooka: !!(d.bazooka || (d.cp.id === 's5b'))
    });
    Game.cp = d.cp;
    Game.banner(Stages.INFO[Game.stage] || '');
    UI.stageChip(Stages.INFO[Game.stage] || '');
  } else {
    Stages.load(Game.stage, { keepBazooka: d.bazooka });
  }
  Game.state = 'playing';
  UI.showShoot(World.player.hasBazooka);
};

// ---------- ui feedback helpers ----------

Game.banner = function (msg) { Game.bannerT = CONFIG.bannerTime; Game.bannerMsg = msg; UI.banner(msg); };
Game.toast = function (msg) { Game.toastT = 2.2; Game.toastMsg = msg; UI.toast(msg); };
Game.hint = function (msg) { Game.hintT = 4.5; Game.hintMsg = msg; UI.hint(msg); };
Game.shake = function (t) { Game.shakeT = Math.max(Game.shakeT, t); };
Game.stars = function (t) { Game.starsT = Math.max(Game.starsT, t); };

// ---------- per-frame ----------

Game.update = function (dt) {
  Game.time += dt;
  if (Game.bannerT > 0) Game.bannerT -= dt;
  if (Game.toastT > 0) Game.toastT -= dt;
  if (Game.hintT > 0) Game.hintT -= dt;
  if (Game.shakeT > 0) Game.shakeT -= dt;
  if (Game.starsT > 0) Game.starsT -= dt;

  if (Game.state === 'mode') {
    if (Mini.mode) {
      if (Mini.mode.kind === 'car') Mini.updateCar(Mini.mode, dt);
      else if (Mini.mode.kind === 'heli') Mini.updateHeli(Mini.mode, dt);
    }
    if (Mini.mode && Mini.mode.kind === 'end') Mini.updateEnd(Mini.mode, dt);
    return;
  }
  if (Game.state === 'end') {
    if (Mini.mode) Mini.updateEnd(Mini.mode, dt);
    return;
  }
  if (Game.state !== 'playing') return;

  Game.stats.time += dt;

  // zap teleport transition
  if (Game.zapT > 0) {
    Game.zapT -= dt;
    if (Game.zapT <= 0) {
      Game.loadStage(8);
      return;
    }
    return;   // frozen mid-sparkle
  }

  // spike poof freeze, then respawn
  if (Game.poofT > 0) {
    Game.poofT -= dt;
    if (Game.poofT <= 0) Game.respawn();
    return;
  }

  playerJumpInput();
  applyLook(dt);
  Player.update(dt);

  // crawling indicator: ducking into a vent is automatic — show it clearly
  var ventNow = typeAt(World.player.x, World.player.y) === T_VENT && World.player.onGround;
  if (ventNow !== Game._crawling) {
    Game._crawling = ventNow;
    UI.crawl(ventNow);
  }
  if (World.platformsTick) World.platformsTick(dt);
  if (World.update) World.update(dt, Game.time, (World.stageTime = (World.stageTime || 0) + dt));
  Barry.update(dt, Game.time);
  Bosses.update(dt, Game.time);

  // auto-tilt the camera down a touch when near a drop (kindness)
  var p = World.player;
  if (!p.climb && p.onGround) {
    var fAhead = floorAt(p.x + Math.cos(p.dir) * 0.9, p.y + Math.sin(p.dir) * 0.9);
    var target = (fAhead < p.z - 0.7) ? 0.1 : 0;
    p.pitch += (target - p.pitch) * Math.min(1, dt * 3);
  }

  // use prompt
  UI.useHint(Game.useTarget);

  // checkpoint autosave on tab hide
  if (!Game._visHooked) {
    Game._visHooked = true;
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) Game.save();
    });
  }
};
