# Build: "Barry's Prison Run" — complete prompt for a coding agent

You are building a complete, playable, first-person HTML5 action-adventure game designed
by a 7-year-old. This file is the single source of truth. Follow every section. Where numbers
are given they are suggested defaults — keep them all in one `CONFIG` object at the top of the
code so they are tunable, but do not change the design.

## 0. Mission

You are a prisoner inside a silly cartoon prison guarded by **Barry**, a fat policeman who
shouts "HOY!". Escape in one linear adventure: climb out of your jail cell, platform across
wall circles, crawl through vents, outrun Barry, grab a **Fruit Bazooka** in the cafeteria,
splat **Chef Barry**, slide down a giant vent, defeat **Ultra Super Robo Barry** in the yard,
then teleport outside, drive away in a police car, climb a ladder, and fly off in a
helicopter. That is the whole game — one great escape, start to finish.

Target playtime: **20–30 minutes** for a 7-year-old, with checkpoints so failure never costs
more than a few seconds.

## 1. Non-negotiable requirements

1. **First-person** (dictated). Build on the raycaster approach already proven in this repo
   (`elephanto/src/raycaster.js` is the reference — vanilla JS, Wolfenstein-style). Extend it
   with jumping, ladder climbing, wall-ledge walking and a slide. No frameworks, no CDNs,
   no build step — must work fully offline from a static folder.
2. **Static folder** per repo convention (`HOSTING.md`): `index.html` entry point, all paths
   relative, servable from any sub-path.
3. **iPad-first touch controls** (§10) AND keyboard/mouse for desktop.
4. **Suitable for a 7-year-old.** Follow the content rules in §11 exactly.
5. **Falling on spikes never loses progress** — you restart at the last checkpoint (§7).
6. All numbers, speeds, timings live in one `CONFIG` object with comments.
7. Progress saved to `localStorage`; a force-quit mid-game resumes at the last checkpoint.

## 2. Tech & platform

- `index.html` + `src/*.js` (plain `<script>` tags) + `style.css` + `assets/` folder.
- Canvas 2D software renderer (raycaster), `requestAnimationFrame`, target 60fps on iPad
  Safari (iOS 15+). Landscape recommended; show a friendly "rotate your iPad" hint in
  portrait but stay playable.
- WebAudio synth sounds only (no audio files needed): Barry's "HOY!", footsteps, splats,
  vent clangs, helicopter. Unlock on first tap; mute button on screen at all times.
- No network, no analytics, no ads, no accounts, no data collection.

## 3. Barry — the villain (design is dictated; follow exactly)

One villain, **three forms**:

| Form | Appears in | Same body, plus |
|---|---|---|
| **Officer Barry** | the chase (Stage 4) | police uniform & hat |
| **Chef Barry** | cafeteria boss (Stage 5) | chef hat + apron over the uniform |
| **Robo Barry** | final boss (Stage 7) | his head sticks out of the top of a giant robot |

Body rules for ALL forms (these are dictated details, all must be clearly readable in-game):

- **Fat policeman** with a big round belly. His tight police shirt rides up so **the whole
  belly area shows, with the belly-button line visible** (a small vertical line/dot on the
  bare belly). Do not tone this down — it is the designer's signature detail.
- **Head is a standing triangle** (flat base, pointy top) with a **police hat perched on
  top** of the point. (Chef form swaps to a chef hat; Robo form keeps the police hat.)
- **Three big upper teeth always stick out of his mouth.**
- **"HOY!"**: whenever Barry walks, stands still, or chases, he randomly says "HOY!" —
  a silly honking sound plus a comic speech bubble. He is never silent for more than
  ~4 seconds while on screen. HOY is always funny, never loud or scary (§11).
- Movement: comical waddle-run, belly bouncing. He **cannot climb stairs and cannot reach
  the wall circles** — when you escape upward he stands below, jumping angrily, waving his
  fists, HOY-ing.

## 4. The player & the Fruit Bazooka

- First-person view. Before the cafeteria you have no weapon — gameplay is climbing,
  jumping and running.
- **Fruit Bazooka** (found on the cafeteria counter, Stage 5): a big cartoon shoulder
  launcher that shoots **fruit** — apples, bananas, watermelons (rotating randomly), with a
  satisfying **SPLAT!** on impact. It must always clearly read as food, never as a weapon.
- **Infinite ammo** (or instantly refreshing) — never a dead end, never ammo management.
- **Big aim assist**: shots hit anything in a generous cone in front of the crosshair.
  A 7-year-old pointing roughly at a boss must hit.

## 5. Level flow (one linear escape, 8 stages)

| # | Stage | What happens | Checkpoint |
|---|---|---|---|
| 1 | The Jail Cell | wake up, climb bunk-bed ladder, walk the wall circles, enter vent | cell floor |
| 2 | The Button & Spike Pit | press button → platforms open, platform over spikes, second vent | button |
| 3 | The Vent Drop | crawl out and fall down outside the cell | landing |
| 4 | Run Away From Barry! | chase: stairs, wall circles above Barry, escape vent | chase start |
| 5 | The Cafeteria | grab Fruit Bazooka, boss: Chef Barry | bazooka pickup |
| 6 | The Vent Slide | slide down the giant vent, exit the prison into the yard | slide start |
| 7 | The Yard: Ultra Super Robo Barry | final boss fight | fight start |
| 8 | The Great Escape | teleport out, drive police car, climb ladder, fly helicopter, THE END | each beat |

Stage transitions show a short cheerful banner ("Stage 4 — Run away from Barry!").

## 6. Stage details

**Stage 1 — The Jail Cell.** You wake on the bunk bed of a small cell. Tutorial prompts
(icons + one short line): look around, walk, jump. Climb the **bunk-bed ladder** up to the
**circle thingies** — round disc platforms studding the cell wall; walk across them (they
wobble gently, they never dump you). Reach the **vent**, crawl in, **turn a corner** inside,
and drop into…

**Stage 2 — The Button & Spike Pit.** A shaft room. A big glowing red **button** on the
wall: press it (walk into it) and **hidden platforms fold out** across a pit of **spikes**
(cartoon grey cones — see §7). Platform across; the circles wobble slightly to keep it
exciting but edge-forgiveness is huge (§7). Reach the **second vent**.

**Stage 3 — The Vent Drop.** Crawl through, then the floor opens: you **fall down and land
outside the prison cell** (into the cell block corridor). A distant "HOY!" — Barry has
spotted you.

**Stage 4 — Run Away From Barry!** The signature chase. Officer Barry waddle-runs after
you HOY-ing. Route: straight corridor → **stairs** (climb them; Barry **bounces off the
bottom step**, stuck, jumping and shaking his fist) → balcony → **wall circles** that
**turn a corner above Barry's head** (he runs underneath, unable to reach up) → escape
**vent**. Barry runs slightly faster than your walk but slightly slower than your sprint,
so you must keep moving but are never doomed. If Barry catches you (§7 catch rule) you are
tossed back a few meters — no game over, no lost progress beyond the corner.

**Stage 5 — The Cafeteria.** Big bright room, long tables. **Grab the Fruit Bazooka** from
the counter (glowing pickup). **Boss: Chef Barry** — behind the counter, chef hat on,
throwing food at you: meatloaf slices that skid along the floor and pies in slow lobbed
arcs (all telegraphed, all dodgeable at a walk). Shoot fruit at him. **12 hits**, 3 phases
(4 hits each, throws get slightly faster; phase change = he blows a cartoony steam whistle
and re-arranges his hat). On defeat he sits down dizzy, covered in fruit, a "YUM!" sign
pops, and the counter slides open to…

**Stage 6 — The Vent Slide.** A huge diagonal vent-shaft **slide** — a fast, joyful,
automatic ride with gentle steering left/right to catch fruit snacks for points. Exit at
the bottom **outside the prison** — the prison yard.

**Stage 7 — The Yard: Ultra Super Robo Barry.** Final boss. A **giant robot** stomps in;
Barry's triangle head + police hat stick out of a glass dome on top. Attacks (all slow and
telegraphed): **stomp** (rings of shockwave ripple along the ground — jump them) and
**slow big tennis-ball volleys** (sidestep). Weak spot: a **glowing fruit-sized target
light** — chest in phase 1, back in phase 2, dome in phase 3 (5 hits each, 15 total; the
target only lights up for a few seconds after each stomp, so the loop is: dodge stomp →
target glows → shoot fruit). On defeat: sparks + confetti, the robot tips over gently,
Barry bounces out covered in fruit and sits down dizzy, HOY-ing sadly.

**Stage 8 — The Great Escape** (dictated beat-for-beat, keep all of it):

1. **"ZAP!" — you teleport outside** the prison wall (a fun sparkle-poof, one button tap).
2. **Grab a police car** and **drive away**: short auto-forward drive, steer left/right
   between traffic cones; hitting a cone is a gentle bonk-bounce, never a fail.
3. Stop at a helipad. **Climb a ladder** (hold forward).
4. **Board the helicopter** and fly: a short, happy flight — hold forward, the city scrolls
   below, the sun sets.
5. **THE END**: "YOU ESCAPED BARRY'S PRISON!" + stats (fruit fired, times caught, time
   played) + confetti + **Play again**.

## 7. Falling, spikes & checkpoints (the kindness rules)

- **Spikes are cartoon cones.** Touching them = a soft "oof!" poof of stars, a gentle
  pastel flash, and you pop back to the **last checkpoint** — never death, never blood,
  never scary sounds.
- **Checkpoints** at each stage start + mid-stage points (table in §5). Auto-save there.
- **Barry catching you**: he grabs you, spins you once, and tosses you back a few meters
  with a "GOTCHA! HOY!" — screen does a gentle spin, no health loss, no fail state.
- **Platforming forgiveness**: generous landing boxes, coyote time (~0.2s), slight
  edge-snap, look-down camera tilt when standing near a drop. Jumps are short and floaty.
- Bosses can never kill you: getting hit by food/tennis balls knocks you back with stars
  and costs a few seconds (boss health does NOT reset). A 7-year-old cannot soft-lock.

## 8. Touch & input (iPad)

- Left thumb: floating virtual joystick (appears where the thumb lands) = move.
- Right side of screen: **drag to look/turn** (horizontal turn; slight vertical tilt).
- Buttons (≥64px, right side): **Jump** (big), **Shoot** (appears with the bazooka),
  **Use/Climb** (context: press button, enter vent, climb ladder). Multi-touch must work
  (move + look + jump simultaneously).
- `touch-action: none`, `user-scalable=no`, no double-tap zoom, no long-press callout,
  honor safe-area insets. Audio unlocks on first tap.
- Desktop: WASD/arrows move, mouse look (pointer lock optional), Space = jump,
  click/Space = shoot, E = use/climb.

## 9. Screens & copy

- **Title:** BARRY'S PRISON RUN — buttons: Play / Continue (if save) / How to Play.
- **How to Play:** 4 picture cards (Climb, Run from Barry!, Fruit Bazooka, Escape!) with
  one short sentence each.
- Stage banners per §5, checkpoint toast "Checkpoint!", catch toast "GOTCHA! HOY!",
  win screen per §6 Stage 8.
- All copy: short sentences, simple words, cheerful. No scary vocabulary anywhere.

## 10. Kid-safety content rules (hard rules)

- No blood, no gore, no injuries, no one dies — ever. Hits = stars, splats, "OOF!", "SPLAT!".
- "Shooting" is only ever fruit from the Fruit Bazooka; impacts are fruit splats.
- No jump scares, no sudden loud audio, no red damage flashes (soft pastel only), no fail
  screens that scold. Barry is a lovable bumbler, never menacing.
- No external links, no chat, no purchases, nothing collected.

## 11. Save system

- Auto-save at every checkpoint and on tab hide. Save: current stage + checkpoint, bazooka
  owned, stats. "Continue" resumes exactly there. Corrupt/missing save → fresh start with
  a friendly message, never a crash.

## 12. Project structure (create exactly this)

```
barrysprisonrun/
  index.html          # canvas + UI overlay + touch controls
  style.css
  src/                # plain <script> files: config.js, raycaster.js (from elephanto, extended),
                      # player.js, barry.js, stages.js, bosses.js, input.js, sound.js, ui.js, main.js
  assets/             # icons; everything else drawn in code / WebAudio synth
  README.md           # how to run, controls, CONFIG tuning guide, playtest notes per stage
  docs/original_specs.md  # the designer's original dictation (do not modify)
  docs/leprompt-notes.md  # any design decisions made during build
```

(If this `leprompt.md` lives in the game folder, keep it alongside `docs/` — it stays the
source of truth.)

## 13. Testing & acceptance checklist (verify before finishing)

- [ ] Opens from `index.html` via any static server, no console errors, works offline.
- [ ] `?stage=N` URL parameter warps to any stage for testing (document in README).
- [ ] Playtest each of the 8 stages start-to-finish on desktop AND one mobile browser;
      record notes per stage in README.
- [ ] Barry matches §3 in every form: belly + belly-button line visible, triangle head,
      hat on top, three upper teeth out, HOY! while walking/standing/chasing.
- [ ] Spikes → checkpoint works everywhere; catch → toss-back, never game over.
- [ ] Stairs block Barry; wall circles pass over him; he can't reach them.
- [ ] Fruit Bazooka: cafeteria pickup, infinite ammo, generous aim, splat feedback.
- [ ] Chef Barry 12-hit / 3-phase fight; Robo Barry 15-hit / 3-phase fight; neither can
      soft-lock or kill the player.
- [ ] Ending includes ALL dictated beats: teleport → police car drive → ladder →
      helicopter → THE END + stats.
- [ ] Touch controls: multi-touch, no zoom/scroll hijack, buttons ≥64px, mute button.
- [ ] Save/continue works after force-quitting mid-stage.
- [ ] Every §10 content rule holds across all animation frames and sounds.

## 14. Interpretation notes (dictation → spec decisions; correct the spec, not the code, if wrong)

| Designer said | Built as |
|---|---|
| "circle thingies on the wall which you could walk on" | round disc platforms studding walls |
| "his shirt shows the line of his belly button, the whole area" | shirt rides up; whole bare belly + belly-button line visible |
| "ultra super robot" | boss name "Ultra Super Robo Barry" |
| "teleport outside… grab a police car… helicopter… final game… done" | Stage 8 sequence ending in THE END screen |

("Another vent" and "three upper teeth coming out of his mouth" were confirmed by the
designer's parent and corrected in `docs/original_specs.md` itself.)

## 15. Out of scope

Multiplayer, accounts, servers, ads, purchases, weapons other than the Fruit Bazooka,
levels beyond the dictated escape, any change to `docs/original_specs.md`.
