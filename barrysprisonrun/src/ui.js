// Barry's Prison Run — DOM overlay UI: title, how-to, HUD, banners, buttons.

var UI = {};

UI.el = function (id) { return document.getElementById(id); };

UI.init = function () {
  UI.el('btn-play').addEventListener('click', function () { sfx('tap'); Game.newGame(); UI.hideScreens(); });
  UI.el('btn-continue').addEventListener('click', function () { sfx('tap'); Game.continueGame(); UI.hideScreens(); });
  UI.el('btn-howto').addEventListener('click', function () { sfx('tap'); UI.showHowto(); });
  UI.el('btn-howto-back').addEventListener('click', function () { sfx('tap'); UI.hideHowto(); });
  UI.el('btn-again').addEventListener('click', function () { sfx('tap'); UI.el('end').classList.add('hidden'); Game.newGame(); });
  UI.el('mute').addEventListener('click', function () {
    var m = toggleMute();
    UI.el('mute').textContent = m ? '🔇' : '🔊';
  });
  UI.el('mute').textContent = muted ? '🔇' : '🔊';

  if (!Game.hasSave()) UI.el('btn-continue').classList.add('hidden');

  // title art: Barry himself, drawn big
  var c = UI.el('title-art');
  var g = c.getContext('2d');
  g.fillStyle = '#22304e';
  g.beginPath(); g.arc(75, 88, 70, 0, 7); g.fill();
  g.save();
  g.translate(4, 10);
  g.scale(0.95, 0.95);
  drawBarry(g, 150, 195, { frame: 'angry', hat: 'police' });
  g.restore();
};

UI.hideScreens = function () {
  UI.el('title').classList.add('hidden');
  UI.el('howto').classList.add('hidden');
  UI.el('hud').classList.remove('hidden');
  if (!Input.touchMode) UI.el('controls-chip').classList.remove('hidden');
};

UI.showHowto = function () {
  UI.el('howto').classList.remove('hidden');
};
UI.hideHowto = function () {
  UI.el('howto').classList.add('hidden');
};

UI.hideAll = function () {
  UI.el('banner').classList.add('hidden');
  UI.el('hint').classList.add('hidden');
};

UI.banner = function (msg) {
  var el = UI.el('banner');
  if (!msg) { el.classList.add('hidden'); return; }
  el.textContent = msg;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'bannerPop 2.6s ease forwards';
  clearTimeout(el._t);
  el._t = setTimeout(function () { el.classList.add('hidden'); }, CONFIG.bannerTime * 1000);
};

UI.toast = function (msg) {
  var el = UI.el('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(function () { el.classList.add('hidden'); }, 2200);
};

UI.hint = function (msg) {
  var el = UI.el('hint');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(function () { el.classList.add('hidden'); }, 4600);
};

UI.stageChip = function (name) {
  UI.el('stage-chip').textContent = name;
};

UI.bossBar = function (name, hp, max) {
  var wrap = UI.el('bossbar');
  if (!name) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');
  UI.el('boss-name').textContent = name;
  var icons = '';
  for (var i = 0; i < hp; i++) icons += '●';
  UI.el('boss-hp').textContent = icons;
  UI.el('boss-hp').style.color = '#5da641';
  var k = hp / max;
  UI.el('boss-hp').style.color = k > 0.6 ? '#5da641' : (k > 0.3 ? '#f5cf3d' : '#e5493a');
};

UI.showShoot = function (on) {
  var el = UI.el('btn-shoot');
  if (el) el.classList.toggle('hidden', !on);
};

UI.useHint = function (u) {
  var el = UI.el('use-hint');
  if (u && u.label) {
    el.textContent = (Input.touchMode ? '' : '[E] ') + u.label;
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
};

UI.crawl = function (on) {
  var el = UI.el('crawl-chip');
  if (el) el.classList.toggle('hidden', !on);
};

UI.objective = function (text) {
  var el = UI.el('objective');
  if (!el) return;
  if (!text) { el.classList.add('hidden'); return; }
  el.textContent = '🎯 ' + text;
  el.classList.remove('hidden');
};

UI.showEnd = function () {
  var el = UI.el('end');
  el.classList.remove('hidden');
  var s = Game.stats;
  var mins = Math.floor(s.time / 60), secs = Math.floor(s.time % 60);
  UI.el('end-stats').innerHTML =
    'Fruit fired: <b>' + s.fruit + '</b><br>' +
    'Fruit splats on Barrys: <b>' + s.splats + '</b><br>' +
    'Times caught or spiked: <b>' + s.caught + '</b><br>' +
    'Slide snacks grabbed: <b>' + s.snacks + '</b><br>' +
    'Cones bonked: <b>' + s.cones + '</b><br>' +
    'Escape time: <b>' + mins + 'm ' + secs + 's</b>';
};
