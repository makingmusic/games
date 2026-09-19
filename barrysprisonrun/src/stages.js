// Barry's Prison Run — the eight stages of the great escape.
// Each builder carves a World grid, places props/ladders/triggers and sets
// the player spawn. Height in tiles; see leprompt.md §5-6.

var Stages = {};

Stages.INFO = {
  1: 'Stage 1 — The Jail Cell',
  2: 'Stage 2 — The Button & the Spike Pit',
  3: 'Stage 3 — The Vent Drop',
  4: 'Stage 4 — Run Away From Barry!',
  5: 'Stage 5 — The Cafeteria',
  6: 'Stage 6 — The Vent Slide',
  7: 'Stage 7 — Ultra Super Robo Barry!',
  8: 'Stage 8 — The Great Escape',
  9: 'The Helipad'
};

function baseMap(w, h) {
  worldNew(w, h, '');
  wall(0, 0, w - 1, h - 1, 0);
}

function ventCell(x, y, f) {
  cell(x, y, { solid: 0, floor: f, ceil: f + 0.55, type: T_VENT, area: 2 });
}

// ---------------------------------------------------------------- stage 1

Stages[1] = function () {
  baseMap(12, 10);
  room(1, 1, 10, 8, 2.4, 0);

  // the jail cell (bottom-left), barred from the block by a low wall
  wall(6, 5, 6, 8, 0);
  for (var y = 5; y <= 8; y++) cell(6, y, { ceil: 1.15 });

  // circle thingies along the cell's top wall, at bunk-bed height
  circles(1, 6, 1, 0, 5, 1.15, 0);
  // gap above the bars into the block, then the vent with a turn
  cell(6, 6, { solid: 0, floor: 1.15, ceil: 1.7 });
  ventCell(7, 6, 1.15);
  ventCell(8, 6, 1.15);
  ventCell(8, 5, 1.15);
  ventCell(8, 4, 1.15);

  // bunk + its ladder
  addProp(1.35, 7.6, 'bunk', 0.75, { block: 0.55, tall: 1.9 });
  addLadder(2, 7, 0, 1.2);

  addProp(7.5, 6.5, 'grilleopen', 0.62, { z: 1.15, tall: 0.62 });

  addCheckpoint('s1', 3, 7, Math.PI, 0);

  addTrigger(5, 5, 1.2, function () {
    Game.hint('Walk the circle thingies — do not look down!');
    Game.setGoal('Follow the circles to the vent!', 7.5, 6.5, 1.5);
  }, true);
  addTrigger(7, 6, 1.2, function () { Game.hint('Into the vent! You duck down automatically — just keep walking.'); }, true);

  addTrigger(8, 4, 1.1, function () { Game.loadStage(2); }, true);

  Game.setGoal('Climb the bunk bed ladder!', 2.5, 7.5, 1.0);
  Game.hint('You are in jail! The green arrow and beacon show your next goal.');
  return { x: 4.7, y: 7.5, dir: Math.PI };
};

// ---------------------------------------------------------------- stage 2

Stages[2] = function () {
  baseMap(21, 13);
  room(1, 1, 19, 11, 2.6, 0);

  // entry ledge (west), the spike pit (middle), landing ledge (east)
  for (var x = 1; x <= 3; x++) cell(x, 6, { floor: 1.1 });
  // a walkable bridge of discs opens up across the pit — pairs pop up in a
  // cascade; you can still fall off the sides onto the spikes (dictated!)
  var discPairs = [[4, 6], [7, 8], [9, 10], [11, 12], [13, 14], [15, 15]];
  var discCells = {};
  for (var d = 0; d < discPairs.length; d++) {
    for (x = discPairs[d][0]; x <= discPairs[d][1]; x++) discCells[x + ',6'] = true;
  }
  for (x = 4; x <= 16; x++) for (var y = 3; y <= 9; y++) {
    var isDisc = y === 6 && discCells[x + ',6'];
    cell(x, y, { floor: -0.7, area: 3, type: isDisc ? T_NORMAL : T_SPIKE });
  }
  cell(17, 6, { floor: 0.9 }); cell(18, 6, { floor: 0.9 });

  // spikes everywhere in the pit (not on the discs)
  for (x = 4; x <= 16; x++) for (y = 3; y <= 9; y++) {
    if (!(y === 6 && discCells[x + ',6']) && (x + y) % 2 === 0) {
      addProp(x + 0.5, y + 0.5, 'spikes', 0.5, { z: -0.7 });
    }
  }

  // the button (north wall of the ledge)
  var btn = addProp(2.5, 5.45, 'button0', 0.55, { z: 1.1 });
  World.useTargets.push({
    x: 2.5, y: 5.8, z: 1.1, label: 'Press',
    fn: function (u) {
      if (u.used) return;
      u.used = true;
      btn.pressed = true;
      btn.sprite = 'button1';
      sfx('button');
      Game.toast('The platforms opened up!');
      Game.stats.buttons++;
      // disc pairs rise out of the pit in a cascade
      for (var i = 0; i < discPairs.length; i++) {
        var cells = [];
        for (x = discPairs[i][0]; x <= discPairs[i][1]; x++) cells.push(idx(x, 6));
        World.platforms.push({
          cells: cells, h: -0.7, from: -0.7, to: 0.9,
          t: 0, dur: 0.7, delay: i * 0.25, active: true, done: false
        });
      }
      addCheckpoint('s2mid', 2, 6, 0, 1.1);
      Game.setGoal('Cross the discs to the far ledge!', 18.3, 6.5, 1.3);
      Game.hint('Walk the discs! Do not step off — spikey surprise down there.');
    }
  });

  // second vent (east) + the drop shaft to the cell block
  ventCell(19, 6, 0.9);
  ventCell(19, 5, 0.9);
  ventCell(19, 4, 0.9);
  cell(19, 3, { solid: 0, floor: -3.2, area: 3 });
  cell(18, 3, { solid: 0, floor: -3.2, area: 3 });

  // walk off the end of the vent: you drop down outside the prison cell
  addProp(18.6, 4.4, 'grilleopen', 0.62, { z: 0.9, tall: 0.62 });
  addTrigger(19, 3, 1.3, function () { Game.loadStage(3, { falling: true }); }, true);

  addCheckpoint('s2', 2, 6, 0, 1.1);
  Game.setGoal('Press the big red button!', 2.5, 5.7, 1.35);
  Game.hint('Whoa — spikes! Follow the green arrow.');
  return { x: 1.6, y: 6.5, dir: 0, z: 1.1 };
};

// ---------------------------------------------------------------- stage 3

Stages[3] = function () {
  baseMap(14, 10);
  room(1, 1, 12, 8, 2.1, 0);

  // barred alcoves with bunks (decor)
  wall(1, 1, 1, 3, 0); for (var y = 1; y <= 3; y++) cell(1, y, { ceil: 1.1 });
  wall(4, 0, 4, 3, 0); // (outside room, ignored)
  addProp(2.6, 2.4, 'bunk', 0.7, { block: 0.5, tall: 1.8 });
  wall(10, 1, 10, 3, 0); for (y = 1; y <= 3; y++) cell(10, y, { ceil: 1.1 });
  addProp(11.4, 2.4, 'bunk', 0.7, { block: 0.5, tall: 1.8 });

  addCheckpoint('s3', 7, 7, -Math.PI / 2, 0);
  addTrigger(7, 2, 1.2, function () { Game.loadStage(4); }, true);

  World.update = function (dt, now, t) {
    if (t > 1.2 && !World._hoyed) {
      World._hoyed = true;
      sfx('hoy', 0.06);
      Game.toast('You hear a distant HOY… Barry knows!');
    }
  };
  Game.setGoal('Run down the corridor!', 7.5, 2.2, 0.5);
  Game.hint('You fell out of the prison cell! Quick — down the corridor!');
  return { x: 7.5, y: 7.5, dir: -Math.PI / 2, z: 3, falling: true };
};

// ---------------------------------------------------------------- stage 4

Stages[4] = function () {
  baseMap(12, 46);
  room(1, 1, 10, 44, 2.5, 6);

  // narrow run corridor (x4..6) from the start room up to the open hall
  wall(1, 22, 3, 42, 6);
  wall(7, 22, 10, 42, 6);
  // start room stays wide (y 38..44)

  // open hall y16..21 full width; stairs on the east side going up north
  stairs(8, 20, 0, -1, 6, 0.25, 4);
  // balcony at the top of the stairs
  for (var x = 7; x <= 9; x++) for (var y = 12; y <= 14; y++) cell(x, y, { floor: 1.5 });

  // circle thingies heading west above the hall, then turning north
  circles(6, 12, -1, 0, 5, 1.5, 6);   // cells (6..2, 12)
  circles(2, 11, 0, -1, 2, 1.5, 6);   // turn: (2,11),(2,10)

  // escape vent at the end of the circles
  ventCell(2, 9, 1.5);
  ventCell(2, 8, 1.5);
  addProp(2.5, 9.5, 'grilleopen', 0.62, { z: 1.5, tall: 0.62 });
  addTrigger(2, 8, 1.1, function () { Game.loadStage(5); }, true);

  // Officer Barry: he chases along his own floor route (west side, under the
  // circles — he can NEVER reach the stairs or the wall circles)
  Barry.spawn([
    { x: 4, y: 42 }, { x: 4, y: 23 },
    { x: 7.5, y: 21.4, block: true, reroute: 3.0 },
    { x: 1.5, y: 16 }, { x: 1.5, y: 8 }, { x: 2, y: 6.5 }
  ]);
  World.barry.state = 'idle';

  addCheckpoint('s4', 4, 40, -Math.PI / 2, 0);
  addCheckpoint('s4b', 8, 13, Math.PI, 1.5);
  addTrigger(5, 20, 1.6, function () {
    Game.setGoal('Up the stairs — Barry cannot climb!', 8.5, 14.8, 1.7);
  }, true);
  addTrigger(8, 13, 1.5, function () {
    Game.setGoal('Take the circles above Barry to the vent!', 2.4, 8.6, 2.0);
  }, true);

  World.update = function (dt, now, t) {
    var p = World.player;
    if (World.barry.state === 'idle' && p.y < 40) {
      World.barry.state = 'chase';
      Game.banner('RUN! Barry is coming!');
      sfx('hoy', 0.18);
    }
  };
  Game.setGoal('RUN! Get to the stairs at the end of the hall!', 8.5, 17.5, 0.5);
  Game.hint('BARRY! Sprint — push the stick all the way!');
  return { x: 4.5, y: 42.5, dir: -Math.PI / 2 };
};

// ---------------------------------------------------------------- stage 5

Stages[5] = function () {
  baseMap(26, 18);
  room(1, 1, 24, 16, 2.0, 5);

  // tables
  var rows = [12, 9, 6];
  for (var r = 0; r < rows.length; r++) {
    for (var x = 4; x <= 20; x += 5) addProp(x + 0.5, rows[r] + 0.5, 'table', 1.1, { block: 0.85 });
  }

  // kitchen counter (low solid wall you can see over) with a gap in the middle
  wall(8, 3, 11, 3, 5);
  wall(15, 3, 19, 3, 5);
  for (x = 8; x <= 11; x++) cell(x, 3, { ceil: 1.1 });
  for (x = 15; x <= 19; x++) cell(x, 3, { ceil: 1.1 });

  // the FRUIT BAZOOKA on the counter
  var bk = addProp(9.5, 3.5, 'bazooka', 0.7, { z: 1.1 });
  bk.bob = true;
  World.useTargets.push({
    x: 9.5, y: 4.2, z: 1.1, label: 'Grab',
    fn: function (u) {
      if (u.used) return;
      u.used = true;
      bk.hidden = true;
      World.player.hasBazooka = true;
      sfx('pickup');
      Game.stats.pickups++;
      UI.showShoot(true);
      Game.toast('FRUIT BAZOOKA! Splish-splash!');
      addCheckpoint('s5b', 9, 5, Math.PI, 0);
      Game.hint('Aim anywhere near Chef Barry and SHOOT fruit!');
      setTimeout(function () {
        Bosses.startChef(13.2, 1.8, Math.PI / 2);
        Game.setGoal('SHOOT fruit at Chef Barry!', 0, 0, 0, World.chef);
        Game.banner('CHEF BARRY!');
      }, 700);
    }
  });

  Bosses.onChefDefeated = function () {
    sfx('check');
    Game.toast('The kitchen door opened!');
    Game.setGoal('Into the kitchen vent — the big slide!', 13.5, 1.9, 0.8);
    addProp(13.5, 2.6, 'yumsign', 0.55, { z: 0 });
    addProp(13.5, 2.1, 'grilleopen', 0.62, { z: 0, tall: 0.62 });
    World.useTargets.push({
      x: 13.5, y: 2, z: 0, label: 'Slide',
      fn: function () { Game.loadStage(6); }
    });
    addTrigger(13, 1, 1.3, function () { Game.loadStage(6); }, true);
  };

  addCheckpoint('s5', 13, 15, -Math.PI / 2, 0);
  Game.setGoal('Grab the glowing Fruit Bazooka on the counter!', 9.5, 4.0, 1.5);
  Game.hint('The cafeteria! Follow the green arrow.');
  return { x: 13.5, y: 15.3, dir: -Math.PI / 2 };
};

// ---------------------------------------------------------------- stage 6

Stages[6] = function () {
  baseMap(8, 46);
  room(1, 1, 6, 44, 1.9, 2);

  // entry ledge
  for (var x = 2; x <= 5; x++) cell(x, 43, { floor: 0 });

  // the big slide: floor ramps down north
  for (var y = 41; y >= 5; y--) {
    var f = -0.28 * Math.floor((42.5 - y) / 2.6);
    for (x = 2; x <= 5; x++) cell(x, y, { floor: Math.round(f * 100) / 100, type: T_SLIDE });
  }
  var bottom = World.floor[idx(3, 5)];

  // snacks along the slide
  for (y = 40; y >= 7; y -= 3) {
    var sx = 2.5 + (Math.round(y / 3) % 2) * 2;
    World.entities.push({
      kind: 'snack', x: sx, y: y, z: World.floor[idx(Math.floor(sx), y)] + 0.35,
      sprite: 'fruit_' + ['apple', 'banana', 'melon'][y % 3], scale: 0.28, spin: true
    });
  }

  World.slide = { active: false, dir: -Math.PI / 2, entered: false };

  addCheckpoint('s6', 3, 43, -Math.PI / 2, 0);

  World.update = function (dt, now) {
    var p = World.player;
    var ty = typeAt(p.x, p.y);
    if (!World.slide.entered && ty === T_SLIDE) {
      World.slide.entered = true;
      World.slide.active = true;
      Game.banner('WHEEEE!');
      Game.setGoal('WHEEE! Steer and grab the fruit snacks!', 3.5, 7.5, -3.2);
      sfx('slide');
      Game.hint('Steer left and right — grab the fruit snacks!');
    }
    // snack pickup
    for (var i = 0; i < World.entities.length; i++) {
      var s = World.entities[i];
      if (s.kind === 'snack' && !s.dead) {
        if (Math.hypot(s.x - p.x, s.y - p.y) < 0.75 && Math.abs(s.z - p.z) < 1.4) {
          s.dead = true;
          Game.stats.snacks++;
          sfx('pickup', 0.06);
          Bosses.splat(s.x, s.y, s.z, 'apple', false);
        }
      }
    }
    for (i = World.entities.length - 1; i >= 0; i--) if (World.entities[i].dead) World.entities.splice(i, 1);
    if (p.y < 6.5) {
      World.slide.active = false;
      Game.loadStage(7);
    }
  };
  Game.setGoal('Walk into the big slide!', 3.5, 41.5, 0.6);
  Game.hint('A giant vent slide! Walk in…');
  return { x: 3.5, y: 43.5, dir: -Math.PI / 2, z: 0, keepBazooka: true };
};

// ---------------------------------------------------------------- stage 7

Stages[7] = function () {
  baseMap(26, 22);
  room(1, 1, 24, 20, 0, 7);
  fillRectCells(1, 1, 24, 20, function (x, y, k) { World.outdoor[k] = 1; });

  addCheckpoint('s7', 12, 18, -Math.PI / 2, 0);

  // a couple of yard props
  addProp(4.5, 16.5, 'cone', 0.5, { block: 0.3 });
  addProp(21.5, 16.5, 'cone', 0.5, { block: 0.3 });
  addProp(4.5, 5.5, 'cone', 0.5, { block: 0.3 });
  addProp(21.5, 5.5, 'cone', 0.5, { block: 0.3 });

  var started = false;
  World.update = function (dt, now) {
    if (!started && World.player.y < 14) {
      started = true;
      Bosses.startRobo(13, 4);
      Game.setGoal('SHOOT the glowing spot after each stomp!', 0, 0, 0, World.robo);
      Game.banner('ULTRA SUPER ROBO BARRY!');
      sfx('stomp', 0.2);
      Game.hint('Jump the stomp rings, then SHOOT the glowing target!');
    }
  };

  Bosses.onRoboDefeated = function () {
    var glow = addProp(13, 1.6, 'targetglow', 0.7, { z: 1.2 });
    glow.bob = true;
    Game.setGoal('The gate is glowing — go ZAP outside!', 13, 1.8, 1.4);
    World.useTargets.push({
      x: 13, y: 1.8, z: 0, label: 'ZAP!',
      fn: function () { Game.zapOut(); }
    });
    addTrigger(13, 1, 1.4, function () { Game.zapOut(); }, true);
    Game.toast('The gate is glowing — ZAP outside!');
  };

  Game.setGoal('Walk into the yard…', 13, 14, 0.5);
  Game.hint('The prison yard… it is too quiet. HOY?');
  return { x: 13.5, y: 18.5, dir: -Math.PI / 2, keepBazooka: true };
};

// ---------------------------------------------------------------- stage 8 (street + car)

Stages[8] = function () {
  baseMap(22, 12);
  room(1, 1, 20, 10, 0, 8);
  fillRectCells(1, 1, 20, 10, function (x, y, k) { World.outdoor[k] = 1; });
  // the prison wall looms behind you (south)
  wall(1, 10, 20, 10, 8);
  for (var x = 1; x <= 20; x++) cell(x, 10, { ceil: 3 });

  addProp(11.5, 5.5, 'car', 1.15, { block: 0.8 });
  addProp(4.5, 3.5, 'cone', 0.5, { block: 0.3 });
  addProp(17.5, 3.5, 'cone', 0.5, { block: 0.3 });

  addCheckpoint('s8', 11, 8.5, -Math.PI / 2, 0);
  World.useTargets.push({
    x: 11.5, y: 5.5, z: 0, label: 'Drive',
    fn: function () { Mini.startCar(); }
  });

  Game.setGoal('Get in the police car!', 11.5, 5.7, 0.7);
  Game.hint('You are OUTSIDE! Grab the police car!');
  return { x: 11.5, y: 9.2, dir: -Math.PI / 2, keepBazooka: true };
};

// ---------------------------------------------------------------- stage 9 (helipad)

Stages[9] = function () {
  baseMap(12, 12);
  room(1, 1, 10, 10, 0, 8);
  fillRectCells(1, 1, 10, 10, function (x, y, k) { World.outdoor[k] = 1; });

  // rooftop deck on posts, with a ladder up
  wall(3, 6, 3, 8, 8);
  wall(7, 6, 7, 8, 8);
  for (var x = 4; x <= 6; x++) for (var y = 6; y <= 8; y++) cell(x, y, { floor: 2.6 });
  addLadder(5, 9, 0, 2.65);

  addProp(5.5, 7, 'heli', 1.35, { z: 2.6, block: 0.9 });
  World.useTargets.push({
    x: 5.5, y: 7, z: 2.6, label: 'Fly',
    fn: function () { Mini.startHeli(); }
  });

  addCheckpoint('s9', 5, 10, -Math.PI / 2, 0);
  addTrigger(5, 8, 0.8, function () {
    Game.setGoal('Board the helicopter!', 5.5, 7.0, 3.3);
  }, true);
  Game.setGoal('Climb the ladder to the helicopter!', 5.5, 9.3, 0.9);
  Game.hint('Up the ladder — the helicopter is waiting!');
  return { x: 5.5, y: 10.5, dir: -Math.PI / 2, keepBazooka: true };
};

// ---------------------------------------------------------------- loader

Stages.load = function (n, opts) {
  opts = opts || {};
  var def = Stages[n];
  if (!def) { Game.theEnd(); return; }
  Game.setGoal(null);   // each stage sets its own first goal
  var spawn = def();
  settleWalls();

  // animated platforms tick
  World.platformsTick = function (dt) {
    for (var i = 0; i < World.platforms.length; i++) {
      var pl = World.platforms[i];
      if (!pl.active || pl.done) continue;
      if (pl.delay > 0) { pl.delay -= dt; continue; }
      pl.t += dt;
      var k = Math.min(1, pl.t / pl.dur);
      pl.h = pl.from + (pl.to - pl.from) * k;
      if (k >= 1) {
        pl.done = true;
        if (pl.ringProp) pl.ringProp.hidden = false;
        sfx('wobble', 0.05);
      }
    }
  };

  var p = World.player;
  Player.init({
    x: spawn.x, y: spawn.y, dir: spawn.dir, z: spawn.z || 0,
    hasBazooka: !!spawn.keepBazooka || (opts.keepBazooka && p && p.hasBazooka)
  });
  if (spawn.falling) { World.player.onGround = false; World.player.vz = -1; }
  World.stageTime = 0;

  Game.banner(Stages.INFO[n] || '');
  Game.stage = n;
  UI.stageChip(Stages.INFO[n] || '');
  return spawn;
};
