# Escape the Cat Inside the Forest

A cozy-but-spooky top-down survival adventure designed by a 7-year-old.
Explore the forest, keep the campfire big and cozy, shoo the Cat with your
flashlight, rescue Kraken Kid, Squid Kid, Dino Kid and Koala Kid — and survive
**85 nights** to fly home on a giant kite-glider.

Built for kids under 10: no blood, no bosses, no jump scares, no death —
animals get dizzy and scamper away, and the player just "gets so sleepy."

## Run it

No build step, no dependencies, works offline:

- Double-click `index.html` (works from `file://`), or
- Serve the folder: `python3 -m http.server` → http://localhost:8000

Best on iPad Safari (landscape). Add to Home Screen for fullscreen-ish play.

## Controls

| Action | Touch | Keyboard |
|---|---|---|
| Move | floating joystick (left half of the screen) | WASD / arrows |
| Bonk! (attack / chop) | hold the big red button | hold Space |
| Flashlight | tap the torch button (toggle) | F |
| Grab (pick / interact / free a kid) | hold the green hand | hold E |
| Yum (eat best food) | smiley button | 1 |
| Light a torch | tap 🕯️ in the hotbar or craft panel | 2 |
| Craft panel | 🛠️ button | C |
| Pause | ⏸️ button | Esc |
| Mute | 🔊 button | M |

Tap food in the hotbar to eat it directly.

## How to play (30 seconds)

1. Chop trees, keep the campfire at level 3+ (wood = +1 level, fuel = +2, max 6 = COZY!).
2. Eat grapes from bushes, morsels from bunnies, steaks from hogs and bears.
3. Bonk wolves at night. The campfire light keeps them shy.
4. Trade with the Pelt Trader: pelts → flashlight, axes, coat.
5. The Cat guards the kids. Shine the flashlight on it for ~1.5 s — it covers
   its head and marches away (it may drop fur). Then snip the cage 3 times.
6. Collect 4 Jungle Brews from the small jungle temples and pour them into the
   Biggest Temple: The Great Gathering — one fun wave night, no boss, and the
   forest gets calmer forever after.
7. Survive to the dawn after Night 85. You win!

## Modes

- **Story Mode** (default, under-10 friendly): if you get so sleepy, you wake
  up at camp the next morning. You drop half your food and a quarter of your
  diamonds in a backpack you can go pick back up. Kids stay rescued.
- **True Story Mode (Very Hard!)**: the designer's original rule — restart the
  whole run from Day 1.

The game auto-saves at every dawn, on pause and when you switch tabs.

## Developer / debug modes

- `index.html?fast=1` — 10× time scale for testing.
- `index.html?bot=1` — an auto-player plays the game (log panel on the right).
- `index.html?catdebug=1` — teleport the Cat in front of you and preview each
  pose (sleep / prowl / stalk / shooed).

## Tests

```
node test/smoke.js     # world-gen + mechanics + save/load invariants
node test/runbot.js 3  # the 85-night balance proof below
```

## Balance proof (leprompt §20)

Command: `node test/runbot.js 3 12345` — three Story-Mode bot runs.
The bot camps, chops wood, keeps fire ≥ 3, shoos the Cat, raids the Diamond
Grove weekly, trades pelts, and rescues all 4 kids. Requirement: 3/3 survive
past Night 85.

```
=== Balance proof: 3 Story-Mode bot runs (survive 85 nights) ===

--- RUN 1 (seed 12345) — WIN in 13391ms ---
  day reached: 86, phase: day, defeats: 15, kids: 4/4
  hearts: 5.0, hunger: 76, weapon: strong, coat: true
  stats: {"catsShooed":2,"animalsBonked":558,"diamonds":132,"maxFire":6,"bonks":2506}
  log (every 10 nights):
    [Day 1 night] Night 1/85 — hearts 5.0, hunger 89, fire 5.9, wood 7, pelts 0, food 7, kids 0/4, flash none, defeats 0
    [Day 2 night] Night 2/85 — hearts 5.0, hunger 87, fire 5.7, wood 7, pelts 0, food 3, kids 0/4, flash none, defeats 0
    [Day 3 night] Night 3/85 — hearts 5.0, hunger 71, fire 3.0, wood 7, pelts 0, food 0, kids 0/4, flash none, defeats 0
    [Day 10 night] Night 10/85 — hearts 5.0, hunger 14, fire 3.9, wood 1, pelts 0, food 0, kids 0/4, flash none, defeats 0
    [Day 20 night] Night 20/85 — hearts 5.0, hunger 86, fire 5.9, wood 7, pelts 1, food 11, kids 4/4, flash 100, ice, defeats 7
    [Day 30 night] Night 30/85 — hearts 5.0, hunger 95, fire 6.0, wood 7, pelts 7, food 7, kids 4/4, flash 100, strong, defeats 8
    [Day 40 night] Night 40/85 — hearts 5.0, hunger 91, fire 5.9, wood 7, pelts 19, food 14, kids 4/4, flash 100, strong, defeats 11
    [Day 50 night] Night 50/85 — hearts 5.0, hunger 92, fire 5.8, wood 10, pelts 35, food 20, kids 4/4, flash 100, strong, defeats 12
    [Day 60 night] Night 60/85 — hearts 5.0, hunger 93, fire 5.8, wood 10, pelts 50, food 16, kids 4/4, flash 100, strong, defeats 14
    [Day 70 night] Night 70/85 — hearts 5.0, hunger 70, fire 6.0, wood 7, pelts 63, food 27, kids 4/4, flash 100, strong, defeats 15
    [Day 80 night] Night 80/85 — hearts 5.0, hunger 94, fire 5.9, wood 7, pelts 82, food 41, kids 4/4, flash 100, strong, defeats 15

--- RUN 2 (seed 20264) — WIN in 13638ms ---
  day reached: 86, phase: day, defeats: 9, kids: 4/4
  hearts: 5.0, hunger: 94, weapon: strong, coat: true
  stats: {"catsShooed":2,"animalsBonked":594,"diamonds":62,"maxFire":6,"bonks":2576}
  log (every 10 nights):
    [Day 1 night] Night 1/85 — hearts 5.0, hunger 89, fire 6.0, wood 7, pelts 0, food 7, kids 0/4, flash none, defeats 0
    [Day 2 night] Night 2/85 — hearts 5.0, hunger 87, fire 5.8, wood 10, pelts 0, food 5, kids 0/4, flash none, defeats 0
    [Day 3 night] Night 3/85 — hearts 3.1, hunger 86, fire 6.0, wood 7, pelts 0, food 7, kids 0/4, flash none, defeats 0
    [Day 10 night] Night 10/85 — hearts 0.9, hunger 79, fire 5.7, wood 10, pelts 2, food 7, kids 0/4, flash none, defeats 0
    [Day 20 night] Night 20/85 — hearts 5.0, hunger 76, fire 5.9, wood 7, pelts 1, food 5, kids 4/4, flash 100, strong, defeats 3
    [Day 30 night] Night 30/85 — hearts 5.0, hunger 85, fire 1.4, wood 10, pelts 26, food 7, kids 4/4, flash 100, strong, defeats 3
    [Day 40 night] Night 40/85 — hearts 5.0, hunger 79, fire 5.9, wood 7, pelts 54, food 34, kids 4/4, flash 100, strong, defeats 3
    [Day 50 night] Night 50/85 — hearts 5.0, hunger 84, fire 5.7, wood 10, pelts 67, food 32, kids 4/4, flash 100, strong, defeats 4
    [Day 60 night] Night 60/85 — hearts 5.0, hunger 77, fire 5.8, wood 10, pelts 79, food 35, kids 4/4, flash 100, strong, defeats 5
    [Day 70 night] Night 70/85 — hearts 4.0, hunger 75, fire 5.8, wood 7, pelts 93, food 38, kids 4/4, flash 100, strong, defeats 6
    [Day 80 night] Night 80/85 — hearts 5.0, hunger 88, fire 5.7, wood 10, pelts 109, food 10, kids 4/4, flash 100, strong, defeats 9

--- RUN 3 (seed 28183) — WIN in 13340ms ---
  day reached: 86, phase: day, defeats: 18, kids: 4/4
  hearts: 5.0, hunger: 94, weapon: strong, coat: true
  stats: {"catsShooed":8,"animalsBonked":511,"diamonds":90,"maxFire":6,"bonks":2428}
  log (every 10 nights):
    [Day 1 night] Night 1/85 — hearts 5.0, hunger 89, fire 6.0, wood 7, pelts 0, food 7, kids 0/4, flash none, defeats 0
    [Day 2 night] Night 2/85 — hearts 4.5, hunger 87, fire 5.9, wood 7, pelts 0, food 6, kids 0/4, flash none, defeats 0
    [Day 3 night] Night 3/85 — hearts 5.0, hunger 71, fire 3.8, wood 7, pelts 0, food 3, kids 0/4, flash none, defeats 0
    [Day 10 night] Night 10/85 — hearts 5.0, hunger 83, fire 5.0, wood 7, pelts 1, food 3, kids 0/4, flash none, defeats 2
    [Day 20 night] Night 20/85 — hearts 5.0, hunger 83, fire 0.0, wood 19, pelts 3, food 1, kids 3/4, flash 100, ice, defeats 13
    [Day 30 night] Night 30/85 — hearts 4.8, hunger 79, fire 5.8, wood 10, pelts 4, food 9, kids 4/4, flash 100, ice, defeats 15
    [Day 40 night] Night 40/85 — hearts 3.0, hunger 98, fire 5.8, wood 7, pelts 26, food 19, kids 4/4, flash 100, strong, defeats 15
    [Day 50 night] Night 50/85 — hearts 5.0, hunger 93, fire 5.7, wood 10, pelts 40, food 32, kids 4/4, flash 100, strong, defeats 15
    [Day 60 night] Night 60/85 — hearts 5.0, hunger 99, fire 6.0, wood 7, pelts 59, food 29, kids 4/4, flash 100, strong, defeats 16
    [Day 70 night] Night 70/85 — hearts 5.0, hunger 93, fire 5.9, wood 7, pelts 69, food 40, kids 4/4, flash 100, strong, defeats 16
    [Day 80 night] Night 80/85 — hearts 5.0, hunger 87, fire 5.7, wood 10, pelts 89, food 65, kids 4/4, flash 100, strong, defeats 16

=== RESULT: 3/3 bots survived past Night 85 ===
```

Reading the numbers: a moderately skilled path through the game (the bot's)
rescues all four kids by around day 10–20, keeps fire/food healthy, and
absorbs the occasional Story-Mode setback (9–18 "got so sleepy" mornings over
85 nights, roughly one every 5–9 days). A human child playing more
cautiously (staying near camp at night) will see fewer.

## Tuning

Every gameplay number lives in `src/config.js` (`G.CONFIG`) with comments
pointing at the spec section (leprompt.md). Change numbers there and re-run
`node test/runbot.js 3` to re-verify the 85-night balance.

## Project layout

```
index.html       entry point + screens + touch controls
style.css        kid-friendly UI
src/config.js    ALL tunable numbers (spec-referenced comments)
src/util.js      seeded RNG + helpers
src/world.js     world generation (biomes, camp, kids, temples, grove)
src/entities.js  player, the Cat, animals, cultists, kids, drops
src/systems.js   step loop, day/night, fire/hunger, combat, trading,
                 crafting, events, defeat/win, save/load
src/bot.js       auto-player used for the balance proof
src/sprites.js   procedural cartoon rendering + night darkness
src/ui.js        HUD, panels, banners, audio synth
src/main.js      boot, game loop, input (touch + keyboard), ?fast/?bot
assets/cat.png         the Cat (idle / scare pose), the designer's plush, cut out
assets/cat-sleep.png   sleeping pose (same plush)
assets/cat-shoo.png    covering-head pose (flashlight)
docs/            the designer's original spec + drawing (do not modify)
```
