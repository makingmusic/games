# Build: "100-Player Meme Maze" — a first-person 3D maze co-op game

You are a coding agent. Build the game described below, in this folder (`100playermememaze/`), from scratch. Work through the milestones in order and keep the game runnable at every milestone.

## What we're building

A first-person 3D maze game. You and 99 NPC helpers (100 players total!) are inside a giant maze with super-high walls made of cheese, stone, brick, and grass all mixed up like a crazy sandwich. A giant silent meme cat — standing on two paws, holding its nuts, mouth wide open in a surprised expression — hunts everyone. Cross lava with helper-built plank bridges, find the hidden button to turn off the laser gates, then reach the MASSIVE golden trophy that towers over the maze to win.

**Audience:** playable by an 8 year old. Funny-scary tone, big readable UI, forgiving difficulty (unlimited respawns, no timer, no score, no blood — poofs and restarts only).

## Source of truth

Every gameplay rule below comes from the game director's spoken instructions, recorded verbatim in `docs/spec.md`. Where the director left a detail open, these defaults were chosen: the players look like classic blocky Roblox-style people, the cat's nuts are two round acorns, and there is a title screen with a big PLAY button.

## Platform & tech constraints (strict)

- **Three.js r128 vendored at `js/vendor/three.min.js`** (pinned, project-local, no CDN at runtime). Everything else is vanilla JavaScript — no build step, no npm.
- The game runs by opening `index.html` in a desktop browser or **iPad Safari**.
- Code as separate JS modules loaded via plain `<script>` tags: `utils.js`, `textures.js`, `maze.js`, `world.js`, `player.js`, `npc.js`, `cat.js`, `audio.js`, `ui.js`, `game.js`.
- **Controls: keyboard (WASD/arrows + mouse look via pointer lock) AND iPad touch** (left thumbstick to move, right side drag to look). Keep input abstracted.
- Audio via WebAudio synthesis + SpeechSynthesis only — no audio files.
- Each round regenerates a fresh maze so the game can be re-won forever.

## Camera & world

- First-person, full 3D. Eye height ~1.7 units.
- Maze ~27×27 cells, cell size 6. **Walls are super high (~4 units) — the player cannot see over them.**
- Wall materials: **cheese, stone, brick, grass** — randomly mixed per wall segment (crazy sandwich), procedural canvas textures.
- A few open plazas: start plaza and trophy plaza. A handful of loops added to the perfect maze so 100 players don't jam.
- Warm directional sunlight with shadows, soft sky-blue fog, cheerful gradient sky. **The cat casts a giant shadow over the maze — you can see it coming.**

## The players (the "100-player" part)

- **100 players total: 1 real player (YOU) + 99 NPC helpers.** No online server — a single-player game that FEELS like a giant co-op match.
- NPC helpers look like classic blocky Roblox-style people (yellow smiley heads, random shirt/pants colors).
- **Beacon outlines (like Roblox):** every helper is visible THROUGH walls as a glowing outline of its own color, so you always know where your crew is.
- Helpers wander the maze. **When the player reaches a lava edge, nearby helpers run over and automatically build the plank bridge for you.**
- Helpers sometimes gather near the hidden button. **They tell you WHAT it is ("A secret button!") but they never tell you to press it.** Figuring that out is your job.
- Helpers pick up planks from the ground and carry them on their shoulder.

## The giant meme cat (the hard part)

- Giant 3D cat, **taller than the walls (~7 units)** so its shocked head bobs above the maze and is visible from far away.
- Standing upright on two paws, **holding two round acorns (its nuts)**, **surprised expression with its mouth wide open**, big eyes whose pupils track the player.
- **Walks around the maze and hunts** the player AND the helpers. Pathfinds through the maze, retargets often; helpers flee from it.
- **Completely silent.** No sounds from the cat, ever.
- **Touching the cat = death.** The person who touched it dies and restarts at the beginning. Only that person restarts — everyone else keeps playing.
- Cat walks over lava; it cannot be stopped, only outrun.

## Obstacles & items

- **Lava pools** fill some corridor cells: animated glowing lava. **Touching lava = death + restart.** Cross on plank bridges only.
- **Planks lie on the ground** around the maze. Player walks over them to collect (counter in HUD); helpers carry them too. Planks are consumed when a bridge is built. Plank pickups slowly respawn so the team never runs out.
- **Laser gates:** red glowing beams blocking corridors and EVERY entrance to the trophy plaza, so you cannot win while they are on. **Touching a laser = death + restart.**
- **Hidden button:** a small blinking red button hidden in a far dead-end. Walk into it to press. **Pressing it turns off all lasers forever** (beams fade out, emitters go dark).

## Death, respawn, winning

- **No timer, no score, unlimited respawns.** Death = quick red flash + "pum pum pum" sound, respawn at the start plaza. Helpers respawn there too.
- **YOU win when YOU grab the trophy** (walk into the trophy plaza center). Massive golden trophy, taller than the maze, slowly rotating with a light beam and sparkles — visible above the walls as a beacon from anywhere.
- Win: big **"OH MA GA!"** sound + confetti + PLAY AGAIN button that starts a fresh round with a brand-new maze.

## Audio

- The cat: silent. Background music: none. The game is quiet.
- Player death: **"pum pum pum"** (three low thumps, WebAudio).
- Winning: **"oh ma ga"** (SpeechSynthesis, playful pitch; synthesized arpeggio fallback).

## HUD & screens

- Title screen: game name, meme-cat vibe, big PLAY button. Works with touch and mouse.
- HUD: plank counter (big, readable), gentle hint text (e.g. "Find the hidden button to turn off the lasers!").
- Kid-readable big fonts everywhere; no reading-heavy UI.

## Milestones

1. Render a textured maze in first person with keyboard + touch controls, fog and sun shadows.
2. 99 beacon-outlined helpers wandering + start plaza.
3. Lava pools, plank pickups, helper-built bridges.
4. Laser gates + hidden button + "lasers off" state.
5. The giant meme cat hunting everyone; deaths, poofs, unlimited respawns.
6. The massive trophy, win flow ("oh ma ga"), play again with a new maze.
7. Title screen, HUD polish, iPad Safari pass.
