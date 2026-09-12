# Elephanto 🐘

A first-person browser game set in an evil metal base. Coffee Man and Tea Girl
are waiting in the arena — take all **3 lives** from **both** of them to win.
Fighting only works inside the arena; step out to slowly regenerate health.
Uncle Pete fights by your side and gives little quests; Tuado the cat means
well but keeps accidentally lobbing lava at you.

No build step, no dependencies — plain HTML/CSS/JS with a raycasting renderer.
Works on desktop and iPad/iPhone touchscreens.

## Play

Serve the folder (or open `index.html` directly):

```
python3 -m http.server        # from the repo root
# then open http://localhost:8000/elephanto/
```

Pick a role at the start:

- **Kid** — bare fists. Grab weapons off the ground or from the stash room.
- **Protector** — starts with a **bat** and a **medkit** (heals you, Uncle Pete
  and Tuado; refills when you respawn).

**What to do** (also shown on the start screen and in the HUD objective line):
Coffee Man and Tea Girl wait in the arena — take all 3 lives from both of
them. A golden **➤ arrow** under the objective bar always points toward the
arena when you're outside it, and floor signs mark the ARENA, GYM and STASH
doors. First-time hints appear as you play (how to turn, what the arena is
for).

## Controls

| Action  | Desktop                    | Touch                          |
|---------|----------------------------|--------------------------------|
| Move    | WASD / arrow keys (A/D strafe) | left virtual joystick      |
| Look/turn | mouse drag or Q / E      | drag right half, or hold ↺ / ↻ turn buttons |
| Attack  | click / space (hold ok)    | 👊 button                      |
| Use     | E (stash, gym bench)       | ✋ button                      |
| Heal    | H (Protector only)         | 🩹 button (Protector only)     |

A how-to-turn hint banner appears in-game until you turn for the first time.

## Tips

- The **weapon stash** (near the arena) cycles your weapon each time you use it.
- The **gym** gives a one-time permanent muscle buff (+max HP, +damage).
- Coffee Man and Tea Girl have **linked health** — downing one hurts the other.
- Walking **outside the base** is slow, but lava accidents can happen anywhere.

## Art assets

**Real art integrated.** All sprites use the AI-generated PNGs in `assets/`
(12 September 2026), loaded at boot by `src/sprites.js` (`loadSpritePNGs`):
alpha-trimmed, contain-fit onto the 96×96 sprite canvases, with light
saturate/contrast normalization. The procedural drawings remain in the code
as an automatic fallback — delete any PNG and its placeholder instantly
takes over; the game is fully playable with zero PNGs.

The extra assets are wired in too: `logo.png` heads the start screen
(falls back to the text title if missing), `icon-180.png` is the favicon
and Apple touch icon, and `wall-metal.png` is blended subtly over the
raycaster's procedural metal walls (procedural shading takes over if the
file is absent).

Sprite files (wired, auto-swap over placeholders):

```
assets/coffee-man.png      → coffeeMan
assets/tea-girl.png        → teaGirl
assets/uncle-pete.png      → pete
assets/tuado.png           → tuado
assets/minion.png          → minion
assets/bat.png             → bat
assets/pipe.png            → pipe
assets/staff-yellow.png    → staff
assets/crate-stash.png     → crate
assets/gym-bench.png       → bench
assets/lava-blob.png       → lava
assets/lava-splash.png     → splash
```

Optional extras (files exist, **not wired yet**):

```
assets/logo.png            1024×512 start-screen wordmark
assets/wall-metal.png      256×256 seamless wall tile
assets/icon-180.png        180×180 Apple touch icon (Tuado)
```

Serve over HTTP (not `file://`) so the canvas loader is not tainted. Prompts
and the original mapping live in `docs/asset-prompts.md`.

## Files

- `index.html`, `style.css` — page, HUD, touch UI
- `src/config.js` — tuning constants
- `src/map.js` — the base layout (ASCII grid)
- `src/sprites.js` — cartoon art: procedural placeholders + PNG loader (see below)
- `src/sound.js` — tiny WebAudio beeps
- `src/entities.js` — world/character data
- `src/input.js` — keyboard, mouse, touch
- `src/game.js` — rules: arena-only combat, linked boss health, quests, respawn
- `src/raycaster.js` — first-person renderer
- `src/ui.js` — HUD and overlays
- `src/main.js` — boot + game loop
