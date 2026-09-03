# Build: "99 Nights" — a forest rescue survival game

You are a coding agent. Build the game described below, in this folder (`99nights/`), from scratch. Work through the milestones in order and keep the game runnable at every milestone.

## What we're building

A top-down 2D rescue-and-survival game set in a haunted forest. The Deer has kidnapped four children and hidden them in caves across four biomes. The player chops trees, keeps a campfire burning, manages hunger, fights the Deer's cultists and wild monsters, rescues all four kids, then defeats the Deer in a final boss fight.

**Audience:** playable by a very smart 8-year-old. Spooky-cute tone, big readable UI, forgiving difficulty, no blood (poofs of smoke, stars, and running away instead).

## Platform & tech constraints (strict)

- Pure **HTML5 Canvas + vanilla JavaScript**. No frameworks, no build step, no npm, no external assets or CDNs.
- The game runs by opening `index.html` in a desktop browser.
- Structure the code as separate JS modules loaded via plain `<script>` tags (or ES modules) so it stays readable: e.g. `game.js`, `world.js`, `player.js`, `monsters.js`, `ui.js`.
- Keyboard + mouse controls now, but keep input handling abstracted so touch controls can be added later. (Future, out of scope: iPad/iPhone app via Capacitor, public hosting.)
- No saved-game requirement for v1, but day counter, inventory, and rescued-kids state should live in one plain state object so saving is easy to add later.

## Controls

- Move: WASD / arrow keys
- Attack / chop: Space or left-click (swing axe toward facing direction)
- Interact (pick up, talk, rescue, trade, feed fire): E
- Inventory / board: I and B toggles; Esc pauses
- HUD must be large and readable for a kid

## World

- One big top-down map. The player's **camp with the campfire is at the center**, in the **forest biome**.
- Four biomes, all present in v1, arranged as quadrants around the center: **forest** (center/default), **snow**, **lava**, **jungle**. Each biome has its own ground color, trees, and monsters.
- **One cave per biome, one kid hidden in each cave.** Caves are deep in their biome. Cave guards: **wolves** in some caves, **bears** in the others (mix them up).
- Trees are scattered everywhere and can be chopped for wood.

## The missing-children board

- A board at camp lists the four missing kids: **dino kid, koala kid, squid kid, kraken kid**.
- Next to each name it shows a live direction and distance, like "50 m that way", with an arrow pointing relative to the player. Updates as the player moves. A rescued kid's entry gets a big check mark.

## Player systems

- **Health** (hearts). Hits from monsters, cultists, and poison reduce it. Zero = game over.
- **Hunger** drains slowly all day and all night. Eat food to refill. Zero = game over (starvation).
- Food sources: berries/fruit bushes in the world, meat from... nothing violent — keep it to forage + trader food + cooking at the campfire.
- Inventory: wood, food, feathers, coins, gems.

## Campfire (the heart of the game)

- The campfire has a **level, 1 through 6**, and a fuel meter.
- **Feed it wood** to keep it burning through the night. If it goes out at night, monsters come close to camp.
- **Upgrading the fire** costs wood plus **coins/gems** (the loot cultists drop). Higher level = bigger light, bigger monster-safe radius around camp, warmer and cheerier. Level 6 is max glory — biggest safe zone, golden glow.

## Day / night and the 99 nights

- Days counter counts up toward 99. Days are relatively safe: forage, chop, explore, trade. Nights are dangerous: monsters roam and cultists raid.
- **Win condition:** rescue all four kids, then defeat the **Deer boss** (rescuing the fourth kid triggers the Deer's appearance for the final fight). Victory = all kids safe at the fire + Deer defeated.
- **Lose conditions:** health hits zero, or hunger hits zero. Also, if night 99 ends with kids still missing, the forest keeps them forever — game over.

## Monsters

All monsters are **bigger than the player**. They **stand on two legs** while idling/patrolling, and **flee on four legs** when low on health. Some telegraph a charge attack by flashing **big red eyes** before rushing.

| Monster | Where | Behavior |
|---|---|---|
| **Deer** | Final boss | Kidnapped all the kids. Big, menacing, fights at the end near the last cave. Deer-masked cultists are its servants. |
| **Owl** (white) | Forest | Flying harasser. **Drops feathers** when defeated. Feathers are a pickup resource — see Feather Trader. |
| **Bat** (purple) | Forest/lava | Fast, erratic, weak, comes in small groups at night. |
| **Ram** | Forest/jungle | Telegraphs with red eyes, then charges hard into the player. |
| **Cat** (black) | Jungle | Sneaky stalker; has its own cultists and the Frog King as backup. |
| **Wolf / Bear** | Cave guards | Wolves fast in packs; bears slow and heavy. |
| **Alpha wolf, arctic fox, mammoth** | Snow | Alpha wolf leads wolf packs, arctic fox darts in and steals dropped loot, mammoth is a huge avoid-at-all-costs wall. |
| **Lava mammoth** | Lava | Molten mammoth, toughest regular monster in the game. |
| **Jaguar, snake** | Jungle | Jaguar pounces from hiding; snake slithers and poisonous bite (short poison). |

## Cultists ("every monster has its own cultists")

The Deer's servants, and small factions loyal to each monster. Kid-spooky, not gory. They raid at night, especially later days.

- **Deer cultists:** wear creepy deer masks, carry **crossbows**. An elite **red-coated** variant is tougher and shoots faster.
- **Cat cultists:** black vests, **poisonous spears** (hit applies brief damage-over-time).
- **Owl cultists:** feather-dart throwers.
- Other factions (bat, ram, etc.) reuse these archetypes with themed colors.
- **All cultists drop coins or gems** when defeated — this is the currency for **upgrading the campfire**.

## Mini-boss: the Frog King

Backs up the cat cultists in the jungle. When damaged enough it **splits, and the splits split, until everything is dead**:

1. One **blue frog** (big, king with a crown)
2. → becomes one **purple frog**
3. → becomes **two blue frogs**
4. → each becomes small **orange frogs** (three total), which are defeated for good.

## NPCs / traders

- **Salesman:** appears at camp **on day 20 only**, gone at the end of the day. Sells food, tools, and upgrade materials for coins/gems.
- **Feather Trader:** a small stall in the forest. **Owls drop feathers; the player picks them up and trades them here** for coins/gems (e.g. 5 feathers = 10 coins).

## Rescue mechanics

- Enter a cave, defeat its guards, reach the kid, press E to rescue.
- **Rescued kids follow the player in a line** (cute trailing behavior) back to camp, then hang out by the fire cheering. They are safe there permanently.
- Rescuing the fourth kid triggers the **Deer boss fight**. Beat the Deer to win. Victory screen with all four kids dancing around a level-6-able campfire.

## Art & feel

- **All art is code-drawn**: colorful shapes, simple shading, emoji faces for characters (🦌 🦉 🦇 🐏 🐈 🐺 🐻 🐸 kids: 🦖 🐨 🦑 🐙, player: 🧒 with an axe). No image files.
- Day/night lighting: warm light radius around the campfire and player at night; biomes tinted (snow pale blue, lava deep red, jungle saturated green).
- Big readable fonts, hearts and drumstick icons for health/hunger, gentle screen shake on hits, poof/star effects instead of death animations.

## Build in this order (keep it runnable at each step)

1. **Core loop:** canvas render loop, player movement + collision, camera follow, HUD (health, hunger, day counter), pause. Walkable forest world with trees.
2. **Survival:** day/night cycle, hunger drain, food pickups, campfire with fuel + light radius, wood chopping, inventory.
3. **Monsters & combat:** wolf/bat/owl/ram with the stand/flee/red-eye-charge behaviors, player axe attack, health damage, coins/gems drops.
4. **Cultists:** night raids, deer/cat/owl cultist factions, poison, crossbow shots; campfire upgrades costing wood + coins/gems (levels 1–6).
5. **Rescue:** caves in all four biomes, guards, kids, follow-to-camp behavior, the live missing-children board at camp.
6. **Bosses & traders:** Frog King splitting fight, Deer final boss triggered by fourth rescue, Salesman (day 20), Feather Trader, win/lose screens.
7. **Polish:** biome theming for snow/lava/jungle + their monsters, lighting, effects, sounds via WebAudio (optional, simple), balance pass so a smart 8-year-old can win.

## Definition of done

- Opens and runs in a browser by double-clicking `index.html`, no console errors.
- Full loop playable: chop → survive nights → keep hunger up → rescue all 4 kids → beat the Deer → victory screen; all lose conditions work.
- All listed monsters, cultists, both bosses, both traders, all four biomes, and the board are in and functional.
- HUD and text are large and readable; monsters are visibly bigger than the player.

## Design assumptions (made to fill gaps — reasonable to adjust)

- Feather Trader pricing, Salesman stock, owl-cultist darts, Frog King in the jungle, and "fourth rescue triggers the Deer" were not fully specified; implemented as described above.
- "Craft something and grind it" is interpreted as: chop wood, craft/upgrade tools and the campfire, and grind coins/gems from cultists across the days.
- No saving in v1; state is kept in one object to make saving trivial later.
