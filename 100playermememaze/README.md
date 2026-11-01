# 100-Player Meme Maze

A first-person 3D maze game for an 8 year old. You + 99 NPC helpers (100 players!)
inside a giant maze with cheese, stone, brick and grass walls mixed up like a
crazy sandwich. A giant silent meme cat — standing on two paws, holding its nuts
(acorns), mouth wide open — hunts everyone. Cross lava on helper-built plank
bridges, find the hidden button to switch off the laser gates, then grab the
MASSIVE golden trophy towering over the maze to win. Win sounds: "oh ma ga!"
Dying sounds: "pum pum pum". No timer, no score, unlimited respawns, new maze
every round.

- Audience: kids ~7-9. Funny-scary, forgiving, big readable UI.
- Design record: `docs/spec.md` (the game director's verbatim instructions)
- Build prompt: `docs/leprompt.md`
- Status: **built — playable locally, not yet published** (no landing-page card)

## Play

Open `index.html` in a browser (or serve the folder). Works with:

- **Keyboard** — WASD / arrows to move, mouse to look (click to capture the pointer)
- **iPad / touch** — left thumb anywhere on the left of the screen to move,
  drag on the right to look around

## Tech notes

- Three.js **r128** vendored at `js/vendor/three.min.js` (pinned, project-local,
  no CDN at runtime — follows the repo's dependency rule: materially needed for
  the 3D, kept local and exact-version).
- Everything else is dependency-free vanilla JS, no build step:
  `utils / textures / maze / world / player / npc / cat / audio / ui / game`.
- All sounds are synthesized (WebAudio) or spoken (SpeechSynthesis) — no audio files.
- Every texture is procedurally drawn to canvas (cheese, stone, brick, grass, lava, wood, fur…).

## Files

- `index.html` — page, HUD, title/win screens, touch controls
- `js/maze.js` — maze generation: crazy-sandwich walls, lava pools, laser gates, hidden button, planks
- `js/world.js` — 3D world: merged textured walls, lava, bridges, lasers, button, the MASSIVE trophy
- `js/npc.js` — the 99 blocky helpers: Roblox-style beacons through walls, bridge crew, button scouts
- `js/cat.js` — the giant surprised cat: hunts you and the helpers, pupils track the player
- `js/player.js` — first-person controller (keyboard + mouse + touch)
- `js/game.js` — rules, rounds, deaths, winning
