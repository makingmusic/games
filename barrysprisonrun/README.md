# Barry's Prison Run

A first-person escape adventure designed by a 7-year-old: climb out of your
jail cell, platform across the circle thingies, outrun Officer Barry (he HOYs),
grab the Fruit Bazooka, splat Chef Barry, ride the vent slide, defeat Ultra
Super Robo Barry, then teleport out, drive a police car, climb a ladder, and
fly away in a helicopter. One great escape, ~20–30 minutes, checkpoints all
the way — nobody ever gets hurt, it is fruit all the way down.

Design source of truth: `leprompt.md`. Original dictation: `docs/original_specs.md`.

## Run

Static folder — serve it over HTTP (like the other games in this repo):

```
cd <repo root>
python3 -m http.server
# open http://localhost:8000/barrysprisonrun/
```

No build step, no dependencies, no network calls. Works offline from any
static host (GitHub Pages / Cloudflare Pages — see `../HOSTING.md`).

## Controls

**iPad / touch** (primary): left thumb = floating joystick (push all the way =
sprint), right side drag = look around, big buttons = JUMP / USE / SHOOT
(shoot appears with the bazooka). Multi-touch works.

**Desktop**: WASD or arrows move, drag mouse = look, SPACE = jump (or shoot
once you have the bazooka), E = use/climb, F = shoot.

**Ladders**: press USE/Climb once and you climb up automatically — hold back
to climb down, JUMP to hop off.

**Vents**: no crouch button — you duck automatically when you walk in (a
"CRAWLING…" chip shows while you are in a duct).

## Stages & testing

- `?stage=N` (N = 1..9) warps straight to any stage for testing.
  8 = the street/car, 9 = the helipad. Stages 5–9 auto-give the bazooka when
  warped into.
- Stage list: 1 jail cell · 2 button & spike pit · 3 vent drop ·
  4 the chase · 5 cafeteria (Chef Barry) · 6 vent slide ·
  7 yard (Ultra Super Robo Barry) · 8 street + police car · 9 helipad +
  helicopter → THE END.

### Playtest notes (headless-verified per stage, build 1.0.0)

| Stage | Verified |
|---|---|
| 1 | Movement, bunk-ladder climb to the wall circles (z 0→1.15), vent trigger |
| 2 | Button press → 6 disc pairs rise in a cascade (all reach h 0.9); full bridge walk x2.5→19.7; side-fall onto spikes → poof → respawn at checkpoint; gap jump; vent → drop shaft |
| 3 | Falling spawn, distant HOY toast, exit trigger |
| 4 | Barry activates, chases (waypoints), catches + GOTCHA toss; stairs block him (block point → reroute under the circles) |
| 5 | Bazooka pickup → Chef Barry spawns; 12 aimed fruit hits → defeated (3 phases); kitchen slide opens |
| 6 | Slide activates, forced ride at 5.6 t/s, snack pickups, yard exit |
| 7 | Robo intro, stomp → shockwave rings (jumpable), volley, glowing target phases (chest/back/dome), 15 hits → tips over, Barry pops out dizzy, gate ZAP → stage 8 |
| 8 | Car mode: drives, steering, cone bonks, arrival → stage 9 |
| 9 | Ladder to the pad, helicopter mode → THE END screen with stats |
| all | Rendering sanity per stage (pixel stats), zero console/page errors, save/continue, mute persistence, touch mode |

## Tuning

Everything lives in `src/config.js` (`CONFIG`): player speeds/jump/gravity/
step-up, Barry's chase speed + HOY cadence, bazooka cone + cooldown, both
bosses' HP/phases/attacks, slide/car/heli timings. The spec's kindness rules
(coyote time, jump buffer, step-up, generous aim cone) are all CONFIG values —
tune, don't remove.

## Code map

```
index.html      shell + HUD + touch UI + screens
style.css       kid-friendly styling
src/config.js   all tunables
src/world.js    map container, floor/ceiling grids, cell helpers, builders
src/engine.js   raycaster with variable floor/ceiling heights (risers, ledges,
                soffits, per-cell floor/ceiling bands), occluder-clipped
                billboard sprites, ground decals, weapon view
src/player.js   walk/sprint/jump/gravity, ladders, vents, slides, knockbacks
src/barry.js    Officer Barry: waypoint chase, stairs/circles blocking, HOY!
src/bosses.js   fruit bazooka + projectiles, Chef Barry, Ultra Super Robo Barry
src/minimodes.js police-car drive, helicopter flight, THE END screen
src/stages.js   the 8 stages (+helipad) built with grid helpers
src/game.js     state machine, checkpoints, saves, banners, effects
src/ui.js       DOM overlays
src/main.js     boot, loop, screen effects
assets/icon.svg favicon/app icon
docs/           original spec + build notes
```

Barry's look is dictated and protected: fat policeman, bare belly with the
belly-button line showing, triangle head with the hat on top, three upper
teeth always out, and HOY! on a random schedule whenever he walks, stands or
chases (never longer than ~4s of silence). All three forms (officer / chef /
robo dome) share the body.
