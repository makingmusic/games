const CFG = {
  W: 3600,
  H: 3600,
  DAY_LEN: 150,
  NIGHT_LEN: 85,
  MAX_DAY: 99,
  CAMP: { x: 1800, y: 1800 },
  PLAYER: {
    r: 16, speed: 230, hearts: 5, iframes: 1.2,
    swingCd: 0.42, swingRange: 76, swingArc: 1.2, dmg: 1,
    swingCdSharp: 0.34, swingRangeSharp: 88, dmgSharp: 2,
  },
  HUNGER: { max: 100, drain: 0.4, food: 26, foodCooked: 44, regenEvery: 42 },
  TREE: { hp: 3, wood: 3, woodSharp: 4, regrowDays: 2 },
  FIRE: {
    feed: 25, drainDay: 0.5, drainNight: 1.1, baseMax: 100, maxPerLvl: 15, gemValue: 15,
    costs: { 2: { w: 12, c: 10 }, 3: { w: 18, c: 18 }, 4: { w: 24, c: 26 }, 5: { w: 32, c: 36 }, 6: { w: 40, c: 50 } },
  },
};

let G = null;

function makeState() {
  return {
    t: 0, day: 1, phase: 'day', phaseT: 0,
    paused: false, over: false, won: false, loseReason: '', overT: 0, winPending: 0,
    deerCountdown: 0,
    inv: { wood: 4, food: 2, feathers: 0, coins: 0, gems: 0 },
    sharpAxe: false, lantern: false,
    fire: { level: 1, fuel: 70, wasOut: false, emberAcc: 0 },
    player: {
      x: CFG.CAMP.x, y: CFG.CAMP.y + 130, r: CFG.PLAYER.r,
      hp: CFG.PLAYER.hearts, maxHp: CFG.PLAYER.hearts,
      hunger: CFG.HUNGER.max, face: -Math.PI / 2,
      swingT: 0, swingCd: 0, iframes: 0, poisonT: 0, poisonTick: 0,
      regenT: 0, animT: 0, moving: false, kbx: 0, kby: 0,
      trail: [], trailT: 0,
    },
    kids: [
      { id: 'dino', name: 'Dino Kid', emoji: '🦖', color: '#7ec97e', biome: 'lava' },
      { id: 'koala', name: 'Koala Kid', emoji: '🐨', color: '#b8c4d0', biome: 'snow' },
      { id: 'squid', name: 'Squid Kid', emoji: '🦑', color: '#f0b27a', biome: 'forest' },
      { id: 'kraken', name: 'Kraken Kid', emoji: '🐙', color: '#e0a3c0', biome: 'jungle' },
    ].map((k) => ({ ...k, rescued: false, home: false, fleeHome: false, order: 0, x: 0, y: 0, bob: Math.random() * 9, fx: 1 })),
    trees: [], bushes: [], pickups: [], monsters: [], cultists: [], projectiles: [],
    particles: [], texts: [],
    caves: [], props: {},
    deer: null,
    raids: { scheduled: [] },
    ui: { open: null, tradeShop: null, toasts: [], banners: [], hintsDone: {}, warnT: 0, fireWarnT: 0 },
    stats: { chopped: 0, defeated: 0, coinsEarned: 0, rescued: 0, order: 0 },
    cam: { x: 0, y: 0 }, shake: 0,
    salesman: null,
  };
}

function addInv(kind, n) {
  G.inv[kind] = (G.inv[kind] || 0) + n;
  if (kind === 'coins' && n > 0) G.stats.coinsEarned += n;
}

function safeRadius() {
  return World.fireLit() ? 170 + G.fire.level * 55 : 0;
}

function lightRadius() {
  return World.fireLit() ? 230 + G.fire.level * 85 : 0;
}
