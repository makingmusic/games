// Elephanto — entity factories and world construction. Pure data, no DOM.

function makeBoss(id, name, sprite, x, y, tall) {
  return {
    kind: 'boss', id: id, name: name, sprite: sprite,
    x: x, y: y, postX: x, postY: y, dir: Math.PI / 2,
    hp: BOSS_LIFE_HP, maxHp: BOSS_LIFE_HP, lives: BOSS_LIVES,
    attackCd: 0, flash: 0, scale: 0.85, tall: tall || 1, spin: false
  };
}

function makeMinion(x, y, inArena) {
  return {
    kind: 'minion', name: 'Bad-guy minion', sprite: 'minion',
    x: x, y: y, postX: x, postY: y, dir: 0,
    hp: MINION_HP, maxHp: MINION_HP, lives: 1,
    inArena: !!inArena,
    attackCd: 0, flash: 0, wanderT: 0, wx: x, wy: y, scale: 0.62
  };
}

function createWorld(role) {
  var isProtector = role === 'protector';
  return {
    role: role,
    time: 0,
    player: {
      kind: 'player',
      x: SPAWN_ENTRANCE.x, y: SPAWN_ENTRANCE.y, dir: SPAWN_ENTRANCE.dir,
      hp: PLAYER_MAX_HP, maxHp: PLAYER_MAX_HP,
      role: role,
      weapon: isProtector ? 'bat' : 'fists',
      owned: isProtector ? ['fists', 'bat'] : ['fists'],
      medkit: isProtector ? MEDKIT_CHARGES : 0,
      dmgMult: 1,
      gymTrained: false,
      deaths: 0,
      dead: false, respawnT: 0,
      attackCd: 0, attackAnim: 0, flash: 0, hitMarkerT: 0,
      flashFrom: null, // bearing of the last hit, for the directional vignette
      hintT: 0
    },
    coffee: makeBoss('coffee', 'Coffee Man', 'coffeeMan', 10.5, 5.0, 1.3),
    tea: makeBoss('tea', 'Tea Girl', 'teaGirl', 13.5, 5.0),
    pete: {
      kind: 'pete', name: 'Uncle Pete', sprite: 'pete',
      x: 12.5, y: 13.0, dir: 0,
      hp: PETE_HP, maxHp: PETE_HP,
      resting: false, restT: 0,
      attackCd: 0, flash: 0, scale: 0.8
    },
    tuado: {
      kind: 'tuado', name: 'Tuado', sprite: 'tuado',
      x: 15.0, y: 11.5, dir: 0,
      hp: 999, // Tuado is never targeted; he's just clumsy
      wanderT: 0, wx: 15.0, wy: 11.5,
      lavaT: 6 + Math.random() * 4, warnT: 0, telegraph: false,
      scale: 0.32
    },
    minions: [
      makeMinion(12.0, 5.5, true),   // arena guard
      makeMinion(9.5, 12.5, false)   // hall wanderer
    ],
    pickups: [
      { x: 19.5, y: 5.5, weapon: 'bat', taken: false },
      { x: 10.0, y: 12.0, weapon: 'pipe', taken: false }
    ],
    lava: [],      // flying lava blobs from Tuado
    effects: [],   // short-lived splashes
    messages: [],  // {text, t} toasts for the UI
    questIndex: 0,
    showLookHint: true, // how-to-turn hint, hidden after the player first turns
    arenaHintShown: false // one-time "fight here, step out to heal" hint
  };
}
