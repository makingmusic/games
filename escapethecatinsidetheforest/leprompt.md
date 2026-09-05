# Build: "Escape the Cat Inside the Forest" — complete prompt for a coding agent

You are building a complete, playable, HTML5 survival-adventure game designed by a 7-year-old.
This file is the single source of truth. Follow every section. Where numbers are given they are
suggested defaults — keep them in one `CONFIG` object at the top of the code so they are tunable,
but do not change the design.

## 0. Mission

A cozy-but-spooky top-down survival game. The player is lost in a forest guarded by a mischievous
monster called **the Cat**. Explore biomes, keep the campfire burning, chase away wolves and bears,
rescue 4 captured kids, trade with forest traders, and **survive 85 nights** to escape the forest.

## 1. Non-negotiable requirements

1. **HTML-based, no build step.** Runs by opening `index.html` (or via any static server). No npm,
   bundler, or framework required. Vanilla JS + Canvas 2D. No external CDN calls — must work offline.
2. **iPad-first touch controls** (see §17) AND keyboard controls for desktop testing.
3. **No final boss.** The biggest-temple event is a wave-survival celebration night, not a boss
   (see §15). The Cat can never be defeated — only shooed away with the flashlight.
4. **Suitable for children under 10.** Follow the content rules in §19 exactly.
5. **A player must be able to survive 85 nights.** The game is balanced and verified for this
   (see §20). Reaching the dawn after Night 85 is the win condition.
6. All numbers, speeds, and drop rates live in one `CONFIG` object with comments.

## 2. Tech & platform

- Single-page app: `index.html` + `game.js` (+ `style.css` if desired) + `assets/` folder.
- Canvas 2D, `requestAnimationFrame`, target 60fps on iPad (Safari, iOS 15+).
- Fullscreen canvas that resizes to any orientation; landscape recommended (show a friendly
  "rotate your iPad" hint in portrait, but still playable).
- Persistence via `localStorage`, auto-save at every dawn and on visibility change.
- No network, no analytics, no ads, no accounts, no data collection.

## 3. The Cat (villain) — visual reference

- **Look at `docs/cat.png` first.** That image is the authoritative design of the Cat, drawn by
  the game's 7-year-old designer. Reproduce its look faithfully in-game.
- The original file is ~2MB. Create an optimized in-game sprite from it (downscale to 128–256px,
  palette-quantized PNG in `assets/`, ideally under 100KB total). Keep the original untouched in `docs/`.
- The Cat is big (about 2×3 tiles), fluffy, dramatic but silly — spooky like a Halloween costume,
  never horror. When the flashlight hits it, it covers its head with both paws and marches away
  in comic dismay.
- The Cat **guards each captured Kid** and also roams the forest biome. In the forest biome the
  Cat sleeps at night and **wakes up and prowls during the day** (daytime danger = the Cat;
  nighttime danger = wolves/cultists — this twist is intentional, keep it).

## 4. World & biomes

One large tile map (suggested 200×200 tiles, 32px tiles) split into regions:

| Biome | Placement | Features |
|---|---|---|
| Forest (start) | Center | Player camp + fire, signpost board, both traders nearby, war hogs, bears, many trees (wood), the Cat prowls by day |
| Snow | North | Cold (need fire level ≥3 nearby or a Pelt Coat), snow hares, some wolves, 1 Kid |
| Lava | South | Hot rocks, scrap piles, ember hogs (tough war hogs), rare diamonds, 1 Kid |
| Jungle | East | Jungle temples with Jungle Brew, dense brush, wolves + alpha wolves, 1 Kid, many grape bushes |
| Diamond Grove | hidden clearing, west | Sparkling area where diamonds spawn daily (guarded by alpha wolves) |

- 1 more Kid is held deep in the forest biome itself (total 4 Kids, one per far spot; the Cat
  sleeps beside each captured Kid during that biome's "off" time).
- Map edges wrap? No — clamp with friendly "deep brambles" that bounce the player back.
- **Grape bushes:** purple-berry bushes scattered across the map (mostly Forest and Jungle).
  Tap Grab to pick a Grape bunch; the bush keeps its leaves and regrows in ~2 in-game days
  (sparkle when ready). A handful of bushes also grow near the traders and each Kid cage,
  so food is never far. Bunnies sometimes nibble bushes (cute, harmless).

## 5. Camera & vision ("only what my eyes see")

- Camera follows the player; the map is NOT visible all at once (no minimap of terrain).
- At night, darkness covers everything except: light radius of the campfire, the player's
  flashlight cone, lanterns at temples/traders, and glowing lava biome rocks.
- Daytime has soft shadow at screen edges only. No full-map reveal ever.

## 6. Day/night cycle & the 85-night arc

- One day = 150s daylight + 90s night (tunable). Day counter increments at dawn.
- Night 1 starts after a short tutorial Day 1 (tool tips, meet traders, chop wood).
- Difficulty ramps gently (see §20).
- **Win:** survive to the dawn after Night 85 → ending cutscene: the kids help build a giant
  kite-glider, everyone flies out of the forest, stats screen (nights survived, kids rescued,
  diamonds, biggest fire level). If any Kid was left behind, show them waving happily from the
  kite anyway — no child is left behind in a sad way.

## 7. Health, hunger, and defeat

- Two bars: **Hearts (health)** and **Yummies (hunger)**. Big, cartoonish, always visible.
- Hunger drains slowly; at empty, health drains slowly (never instantly).
- Eating restores hunger (§16). Standing near a lit fire slowly heals hearts.
- **Two modes chosen on the title screen:**
  - **Story Mode (default, under-10 friendly):** on defeat, you wake up at your camp the next
    morning. You drop half your carried food and 25% of diamonds (recoverable from a dropped
    backpack marked on screen). Kids stay rescued, day counter keeps going.
  - **True Story Mode (the designer's original rule):** on defeat, restart the whole run —
    Day 1, all items lost, kids captured again. Clearly labelled "Very Hard!".
- Defeat is never shown as death: the screen goes softly dark, the Cat draws a moustache on you,
  text: "You got so sleepy! You woke up back at camp." (or "Let's try again from the start!" in True Story Mode).

## 8. The Cat — behavior

- States: **asleep**, **prowling**, **stalking the player**, **shooed (covering head, walking away)**,
  **guarding a Kid**.
- If the Cat reaches the player and no flashlight: it swats/bonks — player is knocked back and
  loses 1 heart with a big cartoony "BONK!". It never "kills"; 0 hearts triggers defeat (§7).
- **Only weakness: the flashlight.** Shine the beam on the Cat for ~1.5s → it covers its head with
  its paws and stomps away for a long while (it cannot be fought any other way — axes do nothing
  except a "CLANG!" star effect).
- When shooed, there is a 40% chance it **drops Cat Fur**.
- In the forest biome it sleeps at night (cute ZZZ's) and prowls by day. While guarding a Kid it
  dozes next to the cage; approach wakes it after 3 seconds unless you keep the flashlight on it.
- The Cat is NOT a boss, has no health bar, and can never be permanently defeated.

## 9. Cat cultists

- On some nights (first possible no earlier than Night 6, then ~25% chance, never two nights in
  a row), a **Cultist Night** happens: 2–4 cultists in black vests sneak toward the campfire to
  steal fuel and diamonds.
- The flashlight beam makes them squeal and flee. One axe bonk scatters them (they flip
  backwards, hat flies off). Scared-off cultists drop scrap or a diamond.
- A warning appears at dusk: "You hear tiny footsteps… cultists tonight!"

## 10. Animals (all cartoon-safe, §19)

| Animal | Where | Behaviour | Drops |
|---|---|---|---|
| Bunny | Forest, Snow | harmless, hops away | Morsel; lucky drop: Bunny Foot |
| War Hog | Forest | charges, easy to bonk | Steak; lucky: Pelt |
| Wolf | everywhere, at night | circles and nips | lucky: Pelt |
| Bear | Forest, Snow | slow, tanky, big bonk | Steak ×2; lucky: Pelt |
| Alpha Wolf | Jungle, Diamond Grove | faster, more hearts | Pelt (always) + lucky diamond |
| Alpha Bear | Snow, Lava | biggest normal enemy | Pelt ×2 + Steaks |
| Ember Hog | Lava | like War Hog but tougher | Steak; lucky: Scrap |

- "Defeated" animals see stars, wobble, and scamper away off-screen (they respawn elsewhere later).
  No blood, no bodies.
- Rescued Kids help fight animals (§11) but never fight the Cat.

## 11. The four Kids & the distance board

- **Kraken Kid** (Snow), **Squid Kid** (Lava), **Dino Kid** (Jungle), **Koala Kid** (deep Forest).
- Each is in a bamboo cage guarded by the sleeping Cat. Freeing = keep the flashlight on the Cat
  until it shuffles off, then tap the cage 3 times ("snip snip snip!").
- Each rescued Kid follows you and gives a helper power vs. animals only:
  - Kraken Kid: splashes water, slows animals in a puddle.
  - Squid Kid: sprays ink, blinds animals for 3s.
  - Dino Kid: stomps, bonks all nearby animals for 1 damage.
  - Koala Kid: throws eucalyptus leaves, heals you ½ heart (cooldown).
- **Distance board:** at camp there is a big wooden signpost board showing, for each Kid,
  an arrow direction + distance in meters (1 tile = 1 m), live-updating ("Kraken Kid ← 84 m").
  Also available as a small on-screen compass widget (arrows only, no map).

## 12. Traders & economy

- **Feather Trader** (a bird wearing feathers, at camp): trades **Cat Fur → Fuel** (fuel can
  charge both the flashlight and the fire).
- **Pelt Trader** (a raccoon in a vest, near camp): trades **Pelts → gear**: Ice Axe, Strong Axe,
  Flashlight, batteries, Pelt Coat (warmth), Backpack (carry more).
- Both also accept **Diamonds** at a worse rate. Diamonds spawn daily in the Diamond Grove.
- Price examples (tunable): Flashlight = 2 pelts; Ice Axe = 3 pelts or 2 diamonds;
  Strong Axe = 6 pelts; Pelt Coat = 4 pelts; 1 fuel = 1 cat fur.

## 13. Fire, wood, scrap, crafting

- **Campfire levels 1–6.** Adding 1 wood = +1 level (max 6). Fire slowly burns down toward 0.
  Level sets light radius, heal speed, and cooking speed. Level 6 shows a proud "COZY!" badge
  (achievement: reach fire level 6).
- If the fire hits 0 at night, the dark is dangerous: wolves approach the player directly.
  (In Story Mode the fire never goes fully out on its own during Night 1–3 — tutorial kindness.)
- **Wood** from chopping trees (faster with axes). **Scrap** from lava biome piles, cultists,
  and lucky ember hog drops.
- Simple crafting menu (icons, no reading required): Wood ×2 → Torch (carried light, 60s);
  Wood ×3 → Firelog bundle; Scrap ×2 + Wood → Lantern upgrade; Scrap ×1 → 3 battery heads.

## 14. Weapons & flashlight

- **Hands** (start): bonk small animals, chop trees slowly.
- **Ice Axe** (Pelt Trader): chop fast; hits leave a frost sparkle that slows animals 1s.
- **Strong Axe** (Pelt Trader): big arc swing; can bonk alpha bears; trees fall in one chop.
- **Flashlight** (Pelt Trader): toggle on/off; cone in facing direction; runs on Fuel/batteries;
  the ONLY way to deal with the Cat and cultists. Starts with full charge; idle drain is slow.
- Attack input is one big button; no aiming skill required — swing/spray hits the nearest threat
  in front of the player.

## 15. Jungle temples & the Biggest Temple (NO boss)

- 4 small **jungle temples** (Jungle biome) each hold one **Jungle Brew** bottle (glowing green,
  labelled with a skull-free smiley leaf icon — "sleepy jungle juice").
- Bring all 4 bottles to the **Biggest Temple** in the jungle's heart to trigger
  **The Great Gathering**: one special night where animals from every biome gather at the temple —
  a wave-survival night (you + any rescued Kids hold the temple steps until dawn; the flashlight
  and torches are extra strong here). **There is no boss, no Cat, and nothing unique to fight —
  just many normal animals, then dawn.**
- Reward: the brew is poured into the temple fountain → all animals are 25% calmer for the rest
  of the run, plus a diamond cache and the "Forest Friend" badge.

## 16. Food

- **Morsel** (bunnies): +25% hunger. **Steak** (hogs/bears): +50%, cook on fire ×2 speed at
  fire level ≥3 → +75%. **Bunny Foot** (lucky): +15% hunger + brief speed hop.
- **Grapes** (grape bushes, free to pick): +20% hunger and +¼ heart. Bunches stack up to 10.
  Ripe bushes sparkle; empty bushes show tiny green dots until they regrow.
- Eat by tapping the food in the hotbar. Raw steak is fine to eat (no sickness mechanic — under-10s).

## 17. Touch & input (iPad)

- Left thumb: floating virtual joystick (appears where the thumb lands). Right side: 4 big
  round buttons — **Bonk!** (attack), **Light** (flashlight), **Grab** (interact/pick up/free kid),
  **Yum** (eat best food). Buttons ≥ 64px, spaced for small hands.
- Multi-touch: moving and bonking simultaneously must work.
- `touch-action: none`, `user-scalable=no`, prevent double-tap zoom/long-press callout,
  honor safe-area insets. Audio unlocked on first tap (WebAudio; gentle: plops, crackle,
  purr-growl, wind, happy night- survived chime; mute button on screen).
- Desktop: WASD/arrows move, Space = Bonk, F = Light, E = Grab, 1–3 = eat. Show controls on
  the title screen for both input types.

## 18. Screens & copy (use this exact text)

1. **First-join splash** (before title, tap to continue):
   "This game is based on the true story. Some details have been changed."
2. **Title:** ESCAPE THE CAT INSIDE THE FOREST — buttons: Story Mode / True Story Mode / How to Play.
3. **How to Play:** 4 picture cards (Fire, Flashlight, Kids, 85 Nights) with one short sentence each.
4. **Dawn banner** each morning: "Night 12 of 85 — 73 to go!"
5. **Win screen** (after Night 85): kite-glider scene + stats + "Play again".
6. All copy: short sentences, simple words, no scary vocabulary.

## 19. Kid-safety content rules (hard rules)

- No blood, no gore, no bones, no bodies. Hits = stars, leaves, "BONK!", "POOF!".
- No one "dies" — animals get dizzy and scamper; the player "gets so sleepy"; the Cat is shooed.
- No jump scares, no sudden loud audio, no dark-red damage flashes (soft pastel flash instead).
- No timers that punish crying-level hard: hunger pauses on the How-to-Play and pause screens.
- No external links, no chat, no purchases.

## 20. Balance & the 85-night proof (required)

- Gentle ramp: Nights 1–3 wolves stay far from camp; Cat is slow and easily shooed; Night 6+
  cultist nights possible (max 25%, never back-to-back); alpha animals only after Night 12;
  alpha bears only after Night 25; animal density caps listed in CONFIG.
- The player must be able, with moderate skill, to survive all 85 nights in Story Mode while
  rescuing all 4 Kids. Prove it:
  1. Implement `?fast=1` (10× time scale) for testing.
  2. Implement `?bot=1`: a simple auto-player that camps, chops wood, keeps fire ≥3, shoops the
     Cat daily, raids the Diamond Grove weekly, and rescues kids — logs its run to an on-screen
     console (nights survived, cause of each defeat).
  3. Run the bot 3× through Night 85 in Story Mode and paste the logs into `README.md`
     under "Balance proof". Tune CONFIG until 3/3 bots finish.
- Estimate honest numbers: 85 nights ≈ 5–6 hours of play with saving — this is intended.

## 21. Save system

- Auto-save at every dawn, on pause, and on tab hide. Save: day count, position, inventory,
  fire level, kids rescued, traders' stock, world seed, mode. "Continue" button on title screen.
- Corrupt/missing save → fresh start with a friendly message, never a crash.

## 22. Project structure (create exactly this)

```
escapethecatinsidetheforest/
  index.html          # canvas + UI overlay + touch controls
  game.js             # all game code (may split into src/*.js if cleaner, loaded via plain <script> tags)
  style.css           # optional
  assets/cat.png      # OPTIMIZED sprite derived from docs/cat.png (small, quantized)
  assets/...          # other sprites (drawn in code or tiny PNGs), sounds as WebAudio synth
  README.md           # how to run, controls, Balance proof (§20), tuning guide for CONFIG
  docs/cat.png        # original reference (do not modify)
  docs/original_specs.md  # the designer's original dictation (do not modify)
```

## 23. Acceptance checklist (verify before finishing)

- [ ] Opens from `index.html` with no console errors; works from `file://` and offline.
- [ ] Plays on iPad Safari: joystick + 4 buttons, multi-touch, no zoom/scroll hijacking.
- [ ] First splash shows the exact line from §18.1.
- [ ] Cat sprite clearly resembles `docs/cat.png`; flashlight → covers head → walks away.
- [ ] Cat cannot be fought or killed; no boss anywhere; Biggest Temple = wave night, no boss.
- [ ] 4 kids rescuable; signpost board shows live arrow + meters; kids follow & help vs animals.
- [ ] Fire levels 1–6 with wood; level 6 shows "COZY!".
- [ ] Fur→Fuel (Feather Trader), Pelts→weapons/flashlight/coat (Pelt Trader), diamonds work.
- [ ] Hunger/health bars, foods per §16 (incl. grape bushes: pickable, regrow ~2 days), both defeat modes per §7 behave exactly as written.
- [ ] Night 85 dawn → win cutscene + stats; save/continue works after force-quitting.
- [ ] Bot balance proof in README: 3/3 Story-Mode bots survive past Night 85.
- [ ] Every item in §19 content rules holds everywhere (check all animation frames).

## 24. Out of scope

Multiplayer, accounts, servers, ads, purchases, bosses of any kind, gore, jump scares,
permadeath in the default mode, and any change to the two files in `docs/`.
