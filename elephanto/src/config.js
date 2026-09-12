// Elephanto — shared constants. Plain script, no modules.

var FOV = 66 * Math.PI / 180;
var TAN_HALF_FOV = Math.tan(FOV / 2);

var PLAYER_SPEED = 3.3;      // cells per second inside the base
var OUTDOOR_SLOW = 0.5;      // speed multiplier while outside the base
var PLAYER_RADIUS = 0.22;
var PLAYER_MAX_HP = 100;
var REGEN_RATE = 6;          // hp per second, only while OUTSIDE the arena
var RESPAWN_DELAY = 1.5;     // seconds

var BOSS_LIVES = 3;
var BOSS_LIFE_HP = 120;      // hp of one boss life
var BOSS_DMG = 12;
var BOSS_SPEED = 2.3;

var PETE_HP = 120;
var PETE_DMG = 10;
var PETE_REST_TIME = 20;     // seconds Uncle Pete rests when downed

var MINION_HP = 50;
var MINION_DMG = 6;

var TUADO_LAVA_DMG = 15;
var TUADO_LAVA_MIN = 7;      // seconds between lava accidents (min/max)
var TUADO_LAVA_MAX = 12;

var GYM_BUFF_DMG = 1.25;     // permanent damage multiplier from training
var GYM_BUFF_HP = 25;        // permanent max-hp bonus from training

var MEDKIT_CHARGES = 3;
var MEDKIT_HEAL = 50;

var WEAPONS = {
  fists: { id: 'fists', name: 'Fists', dmg: 10, range: 1.7, rate: 0.40 },
  bat:   { id: 'bat',   name: 'Bat',   dmg: 18, range: 2.1, rate: 0.50 },
  pipe:  { id: 'pipe',  name: 'Pipe',  dmg: 26, range: 2.2, rate: 0.58 }
};
var WEAPON_ORDER = ['fists', 'bat', 'pipe'];

// Spawn points (world coords, cell centers).
var SPAWN_ENTRANCE = { x: 14.5, y: 16.3, dir: -Math.PI / 2 };
var STASH_POS = { x: 17.5, y: 4.0 };   // weapon stash crate (interactable)
var BENCH_POS = { x: 19.5, y: 12.0 };  // gym training bench (interactable)
var ARENA_DOOR = { x: 11.5, y: 8.5 };  // waypoint in/out of the arena
