// ============================================================================
// ESCAPE THE CAT INSIDE THE FOREST — CONFIG
// Every tunable number lives here (see leprompt.md §1.6). Values are the
// balance defaults proven by test/runbot.js (see README "Balance proof").
// ============================================================================
var G = globalThis.G || (globalThis.G = {});

G.CONFIG = {
  // ---- World (leprompt.md §4) ----
  MAP_W: 200,              // map width in tiles  (1 tile = 1 m for the signpost)
  MAP_H: 200,              // map height in tiles
  TILE: 32,                // tile size in px
  SNOW_Y: 45,              // tiles above this line are Snow biome (north)
  LAVA_Y: 155,             // tiles below this line are Lava biome (south)
  JUNGLE_X: 150,           // tiles right of this (and not snow/lava) are Jungle
  GROVE: { x: 25, y: 100, r: 14 },  // Diamond Grove clearing (west)
  CAMP: { x: 100, y: 100 },         // player camp / fire / signpost (tiles)

  // ---- Day/night cycle (§6) ----
  DAY_LEN: 150,            // seconds of daylight
  NIGHT_LEN: 90,           // seconds of night
  TOTAL_NIGHTS: 85,        // survive to the dawn after Night 85 to win

  // ---- Player (§7, §14) ----
  PLAYER_SPEED: 138,       // px/s (~4.3 tiles/s — always faster than the Cat)
  PLAYER_HEARTS: 5,        // max hearts
  HUNGER_MAX: 100,
  HUNGER_DRAIN: 0.34,      // per second (~one full cycle from full to empty)
  STARVE_DPS: 0.125,       // hearts per second while hunger is empty (slow, kind)
  FIRE_HEAL: 0.10,         // hearts per second near a lit fire (level >= 2)
  INVULN_T: 1.0,           // seconds of mercy invulnerability after a hit
  ATTACK_CD: { hands: 0.5, ice: 0.42, strong: 0.6 },   // seconds between bonks
  ATTACK_DMG: { hands: 1, ice: 1, strong: 2 },         // bonk damage
  ATTACK_RANGE: { hands: 44, ice: 48, strong: 58 },    // px arc reach
  ICE_SLOW: { t: 1.0, f: 0.5 },                        // ice axe: slow animals 1 s to 50%

  // ---- Flashlight (§8, §14) — the Cat's ONLY weakness ----
  FLASH_RANGE: 150,        // beam length in px (~4.7 tiles)
  FLASH_HALF_ANGLE: 0.62,  // radians (~35° half-angle cone)
  FLASH_DRAIN: 1.7,        // charge per second while on
  FLASH_CHARGE_MAX: 100,
  FLASH_DAY_RECHARGE: 1.2, // crank charger: recharges per second in daylight while off (never bricked)
  BATTERY_CHARGE: 30,      // each battery item restores this much
  CAT_BEAM_T: 1.5,         // seconds of beam on the Cat to shoo it (§8)
  CULT_BEAM_T: 0.8,        // seconds of beam on a cultist to scare it (§9)
  GATHERING_FLASH_BONUS: 1.5, // beam range multiplier during The Great Gathering

  // ---- The Cat (§3, §8) ----
  CAT_SIZE: { w: 64, h: 88 },        // about 2x3 tiles
  CAT_SPEED_PROWL: 62,     // px/s while prowling
  CAT_SPEED_STALK: 96,     // px/s while stalking (player is 138 — always escapable)
  CAT_PROWL_RADIUS: 9 * 32,// starts caring about the player within this range (day)
  CAT_SWAT_HEARTS: 1,      // BONK! damage
  CAT_SWAT_CD: 4.0,        // seconds between swats (mercy cooldown)
  CAT_SHOO_T: 25,          // seconds the Cat stays shooed (paws on head, marching away)
  CAT_FUR_CHANCE: 0.4,     // chance to drop Cat Fur when shooed (§8)
  CAT_GUARD_RANGE: 28 * 32,// player within this of a captured kid: Cat guards it (§8)
  CAT_GUARD_WAKE: 3.0,     // guarding Cat wakes after player is close this long (§8)
  CAT_LEASH: 10 * 32,      // guarding Cat will not chase beyond this of the cage

  // ---- Cultists (§9) ----
  CULT_FIRST_NIGHT: 6,     // earliest possible cultist night
  CULT_CHANCE: 0.25,       // chance per night (never two nights in a row)
  CULT_COUNT: [2, 4],      // min..max cultists
  CULT_SPEED: 66,          // px/s sneak speed
  CULT_STEAL_S: 3.0,       // seconds at the fire to steal loot
  CULT_DROP: { scrap: 0.6, diamond: 0.4 },  // drops when scared off

  // ---- Animals (§10) — hp in bonk-damage units, dmg in hearts ----
  ANIMALS: {
    bunny:      { hp: 1, dmg: 0,    speed: 84,  r: 12, caps: { forest: 10, snow: 6 } },
    hog:        { hp: 2, dmg: 0.5,  speed: 104, r: 16, caps: { forest: 5 } },
    wolf:       { hp: 2, dmg: 0.5,  speed: 112, r: 15, caps: { forest: 5, snow: 3, jungle: 4 } },
    bear:       { hp: 3, dmg: 0.5,  speed: 72,  r: 20, caps: { forest: 2, snow: 1 } },
    alphaWolf:  { hp: 2, dmg: 1,    speed: 118, r: 17, caps: { jungle: 2, grove: 2 } },
    alphaBear:  { hp: 4, dmg: 1,    speed: 84,  r: 24, caps: { snow: 1, lava: 1 } },
    emberHog:   { hp: 3, dmg: 1,    speed: 110, r: 17, caps: { lava: 4 } },
  },
  WOLF_NIGHT_CAP: { base: 3, perNight: 0.09, max: 8 }, // extra wolves at night ramp
  WOLF_CAMP_SAFE_NIGHTS: 3,     // nights 1-3: wolves never spawn near camp (§20)
  WOLF_CAMP_SAFE_R: 30 * 32,
  ALPHA_WOLF_NIGHT: 12,         // alpha wolves appear only after this night (§20)
  ALPHA_BEAR_NIGHT: 25,         // alpha bears appear only after this night (§20)
  ANIMAL_AGGRO_R: 5 * 32,       // animals notice the player within this (wolves: night)
  ANIMAL_DESPAWN: 62 * 32,      // animals despawn farther than this from the player
  ANIMAL_SPAWN_MIN: 17 * 32,    // animals spawn at least this far from the player (off-screen)
  SCAMPER_T: 2.2,               // dizzy-scamper time before poof (§10/§19)
  CALM_FACTOR: 0.75,            // animal aggro/caps multiplier after the Gathering (§15)

  // ---- Drops (§10, §12) ----
  DROP_CHANCE: {
    bunny:    { morsel: 1.0, bfoot: 0.25 },
    hog:      { steak: 1.0, pelt: 0.25 },
    wolf:     { pelt: 0.3 },
    bear:     { steak: 2.0, pelt: 0.3 },
    alphaWolf:{ pelt: 1.0, diamond: 0.2 },
    alphaBear:{ pelt: 2.0, steak: 2.0 },
    emberHog: { steak: 1.0, scrap: 0.3 },
  },

  // ---- Kids (§11) ----
  KIDS: [
    { id: 'kraken', name: 'Kraken Kid', x: 100, y: 14,  biome: 'snow' },
    { id: 'squid',  name: 'Squid Kid',  x: 100, y: 186, biome: 'lava' },
    { id: 'dino',   name: 'Dino Kid',   x: 186, y: 100, biome: 'jungle' },
    { id: 'koala',  name: 'Koala Kid',  x: 55,  y: 145, biome: 'forest' },
  ],
  CAGE_TAPS: 3,             // taps to snip open a cage (§11)
  KID_HELP: {               // helper cooldowns in seconds (§11)
    kraken: 6,   // puddle: slows nearby animals
    squid: 8,    // ink: blinds nearby animals 3 s
    dino: 5,     // stomp: 1 damage to nearby animals
    koala: 12,   // leaf: heals the player half a heart
  },

  // ---- Fire (§13) ----
  FIRE_MAX_LEVEL: 6,
  FIRE_BURN_T: 55,          // one level burns away every 55 s
  FIRE_WOOD_LEVELS: 1,      // each wood adds this many levels
  FIRE_FUEL_LEVELS: 2,      // each fuel adds this many levels
  FIRE_LIGHT_R: 34,         // light radius per level in px
  FIRE_TUTORIAL_MIN: 3,     // nights 1-3 in Story Mode: fire never dies on its own (§13)
  COOK_T: 10,               // seconds to cook one steak near fire level >= 3 (§16)
  COOK_FIRE_LEVEL: 3,
  COZY_BADGE: 'COZY!',      // shown at fire level 6 (§13/§18)

  // ---- Trading (§12) — prices: pelts / diamonds ----
  PRICES: {
    flashlight: { pelt: 2, diamond: 2 },
    iceAxe:     { pelt: 3, diamond: 2 },
    strongAxe:  { pelt: 6, diamond: 5 },
    peltCoat:   { pelt: 4, diamond: 3 },
    battery:    { pelt: 1, diamond: 1 },
    fuel:       { fur: 1 },        // Feather Trader: 1 Cat Fur = 1 Fuel
    fuelDiamond:{ diamond: 2 },    // Feather Trader diamond price (worse rate)
  },

  // ---- Crafting (§13) ----
  RECIPES: [
    { id: 'torch',    name: 'Torch',          cost: { wood: 2 },  out: 'torch' },
    { id: 'firelog',  name: 'Firelog Bundle', cost: { wood: 3 },  out: 'fuel' },
    { id: 'lantern',  name: 'Lantern Upgrade',cost: { scrap: 2, wood: 1 }, out: 'lantern' },
    { id: 'batteries',name: '3 Battery Heads',cost: { scrap: 1 }, out: 'battery3' },
  ],
  TORCH_T: 60,              // torch burns 60 s (§13)
  TORCH_LIGHT_R: 110,       // torch light radius
  LANTERN_BONUS: 0.3,       // each lantern upgrade: +30% light radii (stacks to 3)
  LANTERN_MAX: 3,

  // ---- Food (§16) — hunger restore %, hearts, extras ----
  FOOD: {
    morsel: { hunger: 25 },
    steak:  { hunger: 50 },
    csteak: { hunger: 75 },
    bfoot:  { hunger: 15, speedT: 4 },
    grape:  { hunger: 20, hearts: 0.25 },
  },

  // ---- Snow cold (§4) ----
  COLD_WARN_T: 12,          // shivering warning seconds before damage
  COLD_DPS: 0.09,           // hearts per second while freezing (slow and kind)
  COLD_FIRE_LEVEL: 3,       // a fire of this level within range keeps you warm

  // ---- World resources ----
  TREE_HP: { hands: 5, ice: 2, strong: 1 },  // hits to chop a tree per weapon
  TREE_WOOD: 3,             // wood per tree
  TREE_DENSITY: { forest: 0.085, jungle: 0.05, snow: 0.03, lava: 0 },
  BUSH_REGROW: 2,           // grape bush regrows in this many days (leprompt: ~2)
  BUSH_COUNT: 46,           // grape bushes in the world (forest + jungle weighted)
  BUSH_CAMP_RING: 8,        // guaranteed bushes in a ring around camp (reliable food)
  SCRAP_RESPAWN: 6,         // scrap piles come back after this many days
  GROVE_DIAMONDS: [2, 3],   // diamonds spawned in the grove at every dawn

  // ---- The Great Gathering (§15) — wave night at the Biggest Temple, NO boss ----
  GATHERING: {
    BREWS_NEEDED: 4,
    FOUNTAIN_HP: 100,
    SIP_DPS: 1,             // each animal at the fountain drinks this per second
    WAVE_INTERVAL: 6,       // seconds between animal waves
    WAVE_SIZE: [1, 2],
  },

  // ---- Story vs True Story defeat rules (§7) ----
  STORY_FOOD_LOSS: 0.5,     // drop half of carried food
  STORY_DIAMOND_LOSS: 0.25, // drop a quarter of diamonds

  // ---- Misc ----
  PICKUP_R: 30,             // auto-pickup radius for drops
  GRAB_R: 52,               // interact radius for Grab
  NIGHT_DARK_MAX: 0.87,     // max darkness alpha at night
  BOT_LOG_EVERY: 10,        // bot logs a status line every N nights
};
