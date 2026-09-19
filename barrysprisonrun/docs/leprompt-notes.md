# Build notes — decisions made while building (per leprompt.md §12)

The design in `../leprompt.md` is the source of truth; these are engine and
level-implementation decisions taken where the spec left room.

## Engine

- Extended Elephanto's Wolfenstein-style raycaster with **per-cell floor and
  ceiling heights**. Faces drawn during the DDA: solid walls, risers (floor
  rises = platform sides, drawn in disc orange with ring stripes), ledges
  (floor drops), and soffits (ceiling steps). Per-cell floor/ceiling
  perspective bands are filled per column; ambient gradients prefill behind
  everything. Flat-shaded cartoon look — no textures to load.
- **Occlusion intervals** (up to 4 open spans per column) track what remains
  visible; near faces are recorded per column so billboards clip vertically
  against them (Barry visible above a ledge he is standing behind, hidden
  below the one he is under).
- **Ground rule**: ground height = the MAX floor under the player circle, so
  you stay on a ledge until fully off it (an early min-corner version let you
  sink under geometry at edges — fixed after testing). Solid cells support
  you at their top height, which means counters are standable.
- Fruit projectiles ignore wall collision (cartoon fruit flies its arc);
  they die on target hits, life expiry, or open-floor contact.

## Levels

- Stage 2 discs: originally 1-wide discs with 1-gaps; headless testing showed
  sprint jumps overshoot any 1-tile target for a 7-year-old. Redesigned as a
  **contiguous cascade bridge** (6 pairs rising staggered) with falls off the
  SIDES onto the spikes (the dictated beat: "if you fall then you touch
  spikes"). One small gap remains before the landing ledge — it is skippable
  at walking speed thanks to edge forgiveness, and jumping it is the lesson.
- Stage 4 Barry follows authored waypoints on his own floor route with two
  block points (stair base, under the circles). He cannot reach stairs or
  wall circles by construction — there is no path, not just a rule.
- Stage 5 counter has a gap (x12–14) so Chef Barry's meatloaf skids through;
  pies arc over everything. Hiding behind the counter sides blocks meatloaf —
  intentional safe spot.
- Stage 8 car / helicopter / THE END are bespoke canvas modes (pseudo-3D road,
  parallax skyline cockpit) rather than raycaster maps — more reliable and
  reads better for short set pieces.
- Ladder exit at the top pushes you 0.8 tiles toward your facing so you land
  on the platform (stages 1 and 9 tuned for this).

## Testing

- Headless Chromium (playwright-core, pinned 1.58.0, project-local) driven
  suite: 27 checks — rendering pixel-stats per stage, movement, ladder,
  button/bridge/poof/respawn, chase, both bosses end-to-end, zap transition,
  car, heli, END screen, slide, save/continue, sprites, mute, zero page
  errors. Notes table in `../README.md`.

## Kid-safety implementation notes

- No health anywhere: boss hits and catches are knockbacks + dizzy stars;
  spikes are a pastel poof back to the last checkpoint; catch = GOTCHA toss
  with a gentle camera spin. No fail states beyond a few seconds.
- All audio is synthesized WebAudio (no files); nothing sudden or loud; mute
  persists in localStorage.
