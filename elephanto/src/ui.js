// Elephanto — HUD and overlay updates. Reads game state, writes the DOM.

var UI = {};

UI.init = function () {
  UI.el = {
    hud: document.getElementById('hud'),
    healthBar: document.getElementById('health-bar'),
    healthNum: document.getElementById('health-num'),
    quest: document.getElementById('quest'),
    role: document.getElementById('hud-role'),
    weapon: document.getElementById('hud-weapon'),
    medkit: document.getElementById('hud-medkit'),
    deaths: document.getElementById('hud-deaths'),
    toast: document.getElementById('toast'),
    lookHint: document.getElementById('look-hint'),
    objective: document.getElementById('objective'),
    guideArrow: document.getElementById('guide-arrow'),
    lavaArrow: document.getElementById('lava-arrow'),
    controlsChip: document.getElementById('controls-chip'),
    healthWrap: document.getElementById('health-wrap'),
    bossCoffee: document.getElementById('boss-coffee'),
    bossTea: document.getElementById('boss-tea'),
    deathOverlay: document.getElementById('death-overlay'),
    winOverlay: document.getElementById('win-overlay'),
    winStats: document.getElementById('win-stats'),
    btnHeal: document.getElementById('btn-heal')
  };
};

UI.onGameStart = function (role) {
  document.getElementById('menu-overlay').classList.add('hidden');
  UI.el.hud.classList.remove('hidden');
  UI.el.role.textContent = role === 'protector' ? '🛡️ Protector' : '🧒 Kid';
  // Kid has no medkit: hide the heal button entirely (also guarded in game.js)
  if (role !== 'protector') {
    UI.el.btnHeal.classList.add('hidden');
    UI.el.medkit.classList.add('hidden');
  }
};

UI.showWin = function (statsText) {
  UI.el.winStats.textContent = statsText;
  UI.el.winOverlay.classList.remove('hidden');
};

function updateBossPanel(el, boss) {
  var livesEl = el.querySelector('.lives');
  var hpEl = el.querySelector('.boss-hp div');
  var hearts = '';
  for (var i = 0; i < BOSS_LIVES; i++) hearts += i < boss.lives ? '❤' : '🖤';
  livesEl.textContent = hearts;
  hpEl.style.width = boss.lives > 0 ? Math.round(100 * boss.hp / boss.maxHp) + '%' : '0%';
  el.classList.toggle('defeated', boss.lives <= 0);
}

UI.update = function () {
  if (!World) return;
  var p = World.player;
  var el = UI.el;

  el.healthBar.style.width = Math.max(0, Math.round(100 * p.hp / p.maxHp)) + '%';
  el.healthNum.textContent = Math.ceil(p.hp) + ' / ' + p.maxHp;
  el.healthWrap.classList.toggle('low', p.hp / p.maxHp < 0.3);

  // persistent objective line (distinct from Uncle Pete's quest text)
  el.objective.textContent = Game.objectiveText();

  // wayfinding arrow: toward the arena when outside it, toward the nearest
  // live boss when inside (so a boss can never be "lost" in the arena)
  var ga = Game.state === 'playing' && !p.dead ? guideAngle() : null;
  if (ga === null && Game.state === 'playing' && !p.dead) ga = bossAngle();
  if (ga !== null) {
    el.guideArrow.classList.remove('hidden');
    el.guideArrow.style.transform =
      'translateX(-50%) rotate(' + (ga * 180 / Math.PI - 90) + 'deg)';
  } else {
    el.guideArrow.classList.add('hidden');
  }

  // lava threat arrow: points at the nearest inbound lava blob
  var la = Game.state === 'playing' && !p.dead ? lavaThreatAngle() : null;
  if (la !== null) {
    el.lavaArrow.classList.remove('hidden');
    el.lavaArrow.style.transform =
      'translateX(-50%) rotate(' + (la * 180 / Math.PI - 90) + 'deg)';
  } else {
    el.lavaArrow.classList.add('hidden');
  }

  el.quest.textContent = Game.currentQuestText();
  el.weapon.textContent = '🥊 ' + WEAPONS[p.weapon].name;
  el.deaths.textContent = '💀 ' + p.deaths;
  if (p.role === 'protector') el.medkit.textContent = '🩹 x' + p.medkit;

  updateBossPanel(el.bossCoffee, World.coffee);
  updateBossPanel(el.bossTea, World.tea);

  // toast: show the newest message
  var m = World.messages[World.messages.length - 1];
  if (m) {
    el.toast.textContent = m.text;
    el.toast.classList.remove('hidden');
  } else {
    el.toast.classList.add('hidden');
  }

  // how-to-turn hint: shown until the player turns for the first time
  if (World.showLookHint) {
    el.lookHint.textContent = (typeof Input !== 'undefined' && Input.touchMode)
      ? '🕹️ Left stick to MOVE · drag the right side of the screen (or hold ↺ ↻) to LOOK around'
      : '⌨️ SPACE or CLICK to ATTACK · WASD to MOVE · drag the mouse or hold Q/E to TURN';
    el.lookHint.classList.remove('hidden');
  } else {
    el.lookHint.classList.add('hidden');
  }

  // persistent desktop control chip (touch has labeled on-screen buttons)
  el.controlsChip.classList.toggle('hidden',
    typeof Input !== 'undefined' && Input.touchMode);

  el.deathOverlay.classList.toggle('hidden', !p.dead);
};
