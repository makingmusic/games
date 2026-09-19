// Barry's Prison Run — every tunable number in one place (per leprompt.md §1.6).

var CONFIG = {
  version: '1.0.0',
  saveKey: 'bpr_save_v1',

  player: {
    radius: 0.28,
    walkSpeed: 2.6,        // tiles/s
    sprintSpeed: 3.7,       // held move = sprint (kid rule: always available)
    ventSpeed: 1.15,        // crawling through vents
    slideSpeed: 5.6,        // vent slide forced forward speed
    accel: 14,
    eyeHeight: 0.62,        // eye above feet, in tiles
    ventEye: 0.34,          // lowered eye while crawling
    jumpVel: 2.55,          // initial jump speed
    gravity: 5.2,
    stepUp: 0.4,            // auto-step for stairs & small ledges
    coyote: 0.18,           // s of grace after leaving a ledge
    jumpBuffer: 0.15,       // s a jump press stays queued
    zLerp: 10,              // camera height smoothing
    knockback: 3.2,         // push from hits
    dizzyTime: 0.9          // slow after being bonked
  },

  look: {
    dragTurn: 0.0062,       // rad per px of drag (touch)
    mouseTurn: 0.0042,      // rad per px (mouse)
    pitchMax: 0.16,         // fraction of screen height
    pitchDrag: 0.00035
  },

  barry: {
    chaseSpeed: 2.9,        // slightly faster than walk, slower than sprint
    catchRadius: 0.8,
    catchToss: 4.5,         // how far you get tossed back
    hoyEveryMin: 2.2,       // s — he is never quiet for long
    hoyEveryMax: 4.0,
    hoyEarshot: 20          // tiles
  },

  bazooka: {
    fireCooldown: 0.34,
    speed: 9.0,
    aimConeDeg: 14,         // generous kid aim assist
    aimRange: 26
  },

  chefBarry: {
    hp: 12,
    hitsPerPhase: 4,
    throwEvery: [1.65, 1.3, 1.0],   // s per phase
    meatloafSpeed: 2.3,
    meatloafRadius: 0.5,
    pieAirtime: 1.15,
    pieRadius: 0.75
  },

  roboBarry: {
    hp: 15,
    hitsPerPhase: 5,
    walkSpeed: 0.55,
    stompTelegraph: 0.85,   // s of rising before the slam
    shockwaveSpeed: 3.4,
    shockwaveMaxR: 11,
    shockwaveHurtH: 0.22,   // jump above this to be safe
    targetLitTime: 4.6,     // weak spot glows after each stomp
    volleySpeed: 3.8,
    volleyCount: 3
  },

  spike: { poofTime: 0.9 },

  car: {
    speed: 9.5,
    steer: 1.9,
    coneBonkSlow: 0.55,     // speed multiplier after a bonk
    duration: 34            // s of driving
  },

  heli: { duration: 30 },

  ladder: { climbSpeed: 1.5 },

  checkpointAutosave: true,

  fog: { indoor: 0.05, outdoor: 0.03 },

  bannerTime: 2.6
};
