let canvas = null;
let ctx = null;
let lightC = null;
let lctx = null;
let last = 0;
let dpr = 1;

function resize() {
  dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  lightC.width = window.innerWidth;
  lightC.height = window.innerHeight;
}

function newGame() {
  G = makeState();
  World.build();
  UI.reset();
  G.cam.x = Utils.clamp(G.player.x - window.innerWidth / 2, 0, Math.max(0, CFG.W - window.innerWidth));
  G.cam.y = Utils.clamp(G.player.y - window.innerHeight / 2, 0, Math.max(0, CFG.H - window.innerHeight));
  UI.banner('Day 1 ☀️', 'Four kids are lost — press B to find them!');
}

function mouseWorld() {
  return { x: G.cam.x + Input.mouse.x, y: G.cam.y + Input.mouse.y };
}

function darkness() {
  if (G.phase === 'night') return Math.min(0.82, 0.82 * (G.phaseT / 7));
  return G.phaseT < 7 ? 0.82 * (1 - G.phaseT / 7) : 0;
}

function lose(reason) {
  if (G.over) return;
  G.over = true;
  G.won = false;
  G.loseReason = reason;
  G.overT = 0;
  Sfx.sfx('lose');
  Effects.shake(10);
}

function faint(reason) {
  if (G.over) return;
  const p = G.player;
  p.x = CFG.CAMP.x;
  p.y = CFG.CAMP.y + 130;
  p.hp = p.maxHp;
  p.hunger = Math.max(p.hunger, 60);
  p.iframes = 3;
  p.poisonT = 0;
  p.kbx = 0; p.kby = 0;
  G.projectiles = [];
  for (const m of G.monsters) {
    if (m.dead || m.boss || m.guard) continue;
    const d = Utils.dist(m.x, m.y, p.x, p.y);
    if (d < 700) {
      const a = Utils.ang(CFG.CAMP.x, CFG.CAMP.y, m.x, m.y);
      m.x = Utils.clamp(m.x + Math.cos(a) * 500, 80, CFG.W - 80);
      m.y = Utils.clamp(m.y + Math.sin(a) * 500, 80, CFG.H - 80);
    }
  }
  for (const c of G.cultists) {
    const d = Utils.dist(c.x, c.y, p.x, p.y);
    if (d < 700) c.dead = true;
  }
  G.cultists = G.cultists.filter((c) => !c.dead);
  G.fire.fuel = Math.max(G.fire.fuel, 40);
  Sfx.sfx('lose');
  Effects.shake(6);
  if (reason === 'starve') {
    addInv('food', 1);
    UI.banner('You got dizzy... but the fire kept you safe!', 'Have a snack on us! Press F to eat.');
  } else {
    UI.banner('Ouch! You fainted... but woke up at camp!', 'The campfire keeps you safe. Try again!');
  }
}

function spawnDeer() {
  const p = G.player;
  const a = Utils.rand(0, TAU);
  const x = Utils.clamp(p.x + Math.cos(a) * 430, 200, CFG.W - 200);
  const y = Utils.clamp(p.y + Math.sin(a) * 430, 200, CFG.H - 200);
  G.deer = Monsters.spawn('deer', x, y, { boss: true, provoked: true, mode: 'intro', mt: 0 });
  UI.banner('THE DEER HAS COME 🦌', 'Defeat it to save the kids forever!');
  Sfx.sfx('boss');
  Effects.shake(12);
  for (const kid of G.kids) {
    if (kid.rescued && !kid.home) kid.fleeHome = true;
  }
}

function onDeerDefeated() {
  G.deer = null;
  G.winPending = 2.2;
  UI.banner('THE DEER IS DEFEATED! 🎉', 'All the kids are safe!');
}

const HINTS = [
  [2, 'Move with WASD or arrow keys!'],
  [10, 'Chop trees with SPACE or click 🪓'],
  [26, 'Press E near bushes to pick berries 🍒'],
  [45, 'Press F to eat when hungry 🍗'],
  [70, 'Press B anytime — the kids board shows the way! 🪧'],
  [110, 'Feed the campfire wood with E 🔥'],
  [150, 'Upgrade the fire with U for a bigger safe zone!'],
];

function handleKeys() {
  if (Input.pressed('pause')) {
    if (G.ui.open) UI.closeOverlay();
    else if (!G.over) UI.toggle('pause');
  }
  if (G.over) {
    if (Input.pressed('confirm') || Input.pressed('restart')) newGame();
    return;
  }
  if (Input.pressed('inv')) UI.toggle('inventory');
  if (Input.pressed('board')) UI.toggle('board');
  if (Input.pressed('mute')) {
    const m = Sfx.toggle();
    UI.toast(m ? 'Sound off 🔇' : 'Sound on 🔊');
  }
  if (G.ui.open === 'trade') {
    ['num1', 'num2', 'num3', 'num4', 'num5'].forEach((k, i) => {
      if (Input.pressed(k)) NPCs.buy(G.ui.tradeShop, i);
    });
    if (Input.pressed('confirm')) UI.closeOverlay();
  } else if (G.ui.open === 'pause') {
    if (Input.pressed('restart') || Input.pressed('confirm')) newGame();
  } else if (G.ui.open) {
    if (Input.pressed('confirm')) UI.closeOverlay();
  } else {
    if (Input.pressed('interact')) NPCs.tryInteract();
    if (Input.pressed('eat')) Player.tryEat();
    if (Input.pressed('upgrade')) {
      if (Utils.dist(G.player.x, G.player.y, CFG.CAMP.x, CFG.CAMP.y) < 145) World.tryUpgradeFire();
      else UI.toast('Stand next to the fire to upgrade 🔥');
    }
  }
}

function update(dt) {
  UI.update(dt);
  Effects.update(dt);
  handleKeys();
  if (G.over) {
    G.overT += dt;
    if (Input.mouse.clicked) UI.click(Input.mouse.x, Input.mouse.y);
    return;
  }
  if (G.ui.open) {
    if (Input.mouse.clicked) UI.click(Input.mouse.x, Input.mouse.y);
    return;
  }
  G.t += dt;
  G.phaseT += dt;
  if (G.phase === 'day' && G.phaseT >= CFG.DAY_LEN) {
    G.phase = 'night';
    G.phaseT = 0;
    UI.banner('Night ' + G.day + ' 🌙', World.fireLit() ? 'Stay in the light!' : 'Your fire is OUT!');
    Cultists.onNightfall();
    if (G.salesman) {
      Effects.poof(G.salesman.x, G.salesman.y, '#cfd8dc', 8);
      G.salesman = null;
      UI.toast('The Salesman packed up for the night.');
    }
  } else if (G.phase === 'night' && G.phaseT >= CFG.NIGHT_LEN) {
    Monsters.dawnSweep();
    Cultists.dawnSweep();
    if (G.day >= CFG.MAX_DAY && G.kids.some((k) => !k.rescued)) {
      lose('forest');
      return;
    }
    G.day++;
    G.phase = 'day';
    G.phaseT = 0;
    World.onNewDay();
    NPCs.onNewDay();
    UI.banner('Day ' + G.day + ' ☀️', G.day >= 95 ? 'Night 99 is coming — hurry!!' : '');
  }
  G.player.hunger -= CFG.HUNGER.drain * dt;
  if (G.player.hunger <= 0) {
    if (CFG.KID_MODE) {
      G.player.hunger = 1;
      G.player.hp -= dt * 0.25;
      if (Math.random() < dt * 0.5) Effects.text(G.player.x, G.player.y - 36, 'Hungry...', '#ffcc80', 14);
      if (G.player.hp <= 0) {
        G.player.hp = 1;
        faint('starve');
        return;
      }
    } else {
      G.player.hunger = 0;
      lose('starve');
      return;
    }
  }
  World.updateFire(dt);
  World.update(dt);
  Player.update(dt);
  Monsters.update(dt);
  Cultists.update(dt);
  Projectiles.update(dt);
  NPCs.update(dt);
  Monsters.director(dt);
  Cultists.director(dt);
  if (G.deerCountdown > 0) {
    G.deerCountdown -= dt;
    if (G.deerCountdown <= 0) spawnDeer();
  }
  if (G.winPending > 0) {
    G.winPending -= dt;
    if (G.winPending <= 0) {
      G.over = true;
      G.won = true;
      G.overT = 0;
      Sfx.sfx('win');
    }
  }
  const k = 1 - Math.exp(-6 * dt);
  G.cam.x = Utils.clamp(Utils.lerp(G.cam.x, G.player.x - window.innerWidth / 2, k), 0, Math.max(0, CFG.W - window.innerWidth));
  G.cam.y = Utils.clamp(Utils.lerp(G.cam.y, G.player.y - window.innerHeight / 2, k), 0, Math.max(0, CFG.H - window.innerHeight));
  G.ui.warnT -= dt;
  if (G.player.hunger < 25 && G.ui.warnT <= 0) {
    G.ui.warnT = 8;
    UI.toast("You're hungry! Press F to eat 🍗");
  }
  G.ui.fireWarnT -= dt;
  if (G.phase === 'night' && World.fireLit() && G.fire.fuel < 20 && G.ui.fireWarnT <= 0) {
    G.ui.fireWarnT = 8;
    UI.toast('The fire is low — feed it wood! 🪵');
  }
  for (const h of HINTS) {
    if (G.t > h[0] && !G.ui.hintsDone[h[0]]) {
      G.ui.hintsDone[h[0]] = 1;
      UI.toast(h[1], 5);
    }
  }
}

function punch(lc, wx, wy, r, shx, shy) {
  if (r <= 0) return;
  const sx = wx - G.cam.x + shx, sy = wy - G.cam.y + shy;
  const grad = lc.createRadialGradient(sx, sy, r * 0.2, sx, sy, r);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.85)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  lc.fillStyle = grad;
  lc.beginPath();
  lc.arc(sx, sy, r, 0, TAU);
  lc.fill();
}

function render() {
  const vw = window.innerWidth, vh = window.innerHeight;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0b0d14';
  ctx.fillRect(0, 0, vw, vh);
  if (G.over) {
    UI.draw(ctx);
    return;
  }
  const shx = (Math.random() - 0.5) * G.shake;
  const shy = (Math.random() - 0.5) * G.shake;
  ctx.save();
  ctx.translate(-Math.round(G.cam.x) + shx, -Math.round(G.cam.y) + shy);
  World.drawGround(ctx);
  World.drawProps(ctx);
  const ems = { wood: '🪵', food: '🍒', coin: '🪙', gem: '💎', feather: '🪶' };
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const pk of G.pickups) {
    const bob = Math.sin(G.t * 3 + pk.bob) * 3;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(pk.x, pk.y + 9, 8, 3, 0, 0, TAU);
    ctx.fill();
    Utils.font(ctx, 20);
    ctx.fillText(ems[pk.kind], pk.x, pk.y + bob);
  }
  const ents = [];
  ents.push({ y: G.player.y, f: () => Player.draw(ctx) });
  for (const m of G.monsters) {
    if (m.dead) continue;
    ents.push({ y: m.y, f: () => Monsters.drawOne(ctx, m) });
  }
  for (const c of G.cultists) {
    if (c.dead) continue;
    ents.push({ y: c.y, f: () => Cultists.drawOne(ctx, c) });
  }
  NPCs.pushEnts(ents, ctx);
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) e.f();
  Projectiles.draw(ctx);
  Effects.draw(ctx);
  World.drawCageFronts(ctx);
  ctx.restore();
  const dk = darkness();
  if (dk > 0.03) {
    lctx.clearRect(0, 0, vw, vh);
    lctx.fillStyle = 'rgba(8,10,26,' + dk + ')';
    lctx.fillRect(0, 0, vw, vh);
    lctx.globalCompositeOperation = 'destination-out';
    punch(lctx, CFG.CAMP.x, CFG.CAMP.y - 10, lightRadius(), shx, shy);
    punch(lctx, G.player.x, G.player.y, G.lantern ? 260 : 130, shx, shy);
    lctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(lightC, 0, 0);
    if (World.fireLit()) {
      const fx = CFG.CAMP.x - G.cam.x + shx, fy = CFG.CAMP.y - G.cam.y + shy;
      const glow = ctx.createRadialGradient(fx, fy - 10, 10, fx, fy - 10, lightRadius() * 0.9);
      glow.addColorStop(0, 'rgba(255,170,60,' + 0.18 * dk + ')');
      glow.addColorStop(1, 'rgba(255,170,60,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(fx, fy - 10, lightRadius() * 0.9, 0, TAU);
      ctx.fill();
    }
  }
  World.drawAmbient(ctx, dk);
  UI.draw(ctx);
}

function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
  last = t;
  update(dt);
  render();
  Input.endFrame();
  requestAnimationFrame(loop);
}

function boot() {
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');
  lightC = document.createElement('canvas');
  lctx = lightC.getContext('2d');
  window.addEventListener('resize', resize);
  resize();
  Input.init(canvas);
  newGame();
  requestAnimationFrame(loop);
}

const Game = {
  get canvas() { return canvas; },
  get vw() { return window.innerWidth; },
  get vh() { return window.innerHeight; },
  boot,
  newGame,
  update,
  render,
  lose,
  faint,
  spawnDeer,
  onDeerDefeated,
  darkness,
  mouseWorld,
};

Game.boot();
