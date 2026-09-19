# Signal & Steel — command-card battle (research-aligned)

**Status: draft aligned to `research/`, not yet approved to implement.** Recorded 06 September 2026. Rules authority is the research notes, not the previous plan and not a third-party rulebook.

This plan makes the digital game **mechanically as close as possible** to the system documented in `research/`: same board, turn, units, dice math, terrain catalog, 60-card deck (counts and functions), and the 16 base scenarios’ parameters (hands, medals, first player, force mix, special rules, tactical character).

**Expression stays original.** We do not ship the source game’s name, logos, card wording, booklet prose, art, or hex-by-hex setup maps. Artwork is generated here with **Grok Imagine** (`image_gen` / `image_edit`) as original pieces — never traced from the source game. Card titles/text, UI copy, and maps are independently authored. Historical battle names and dates are facts.

Research files (do not re-derive numbers from memory):

- `research/mechanics.md`
- `research/command-cards.md`
- `research/dice-and-combat.md`
- `research/board-and-terrain.md`
- `research/base-scenarios.md`
- `research/scenario-design-patterns.md`
- `research/components-inventory.md`
- `research/visual-style.md`

Where two notes disagree, prefer the more specific one (`board-and-terrain.md` for terrain/FAQ, `command-cards.md` for deck functions). Noted conflict: `components-inventory.md` says Pincer Move is 2+2; `command-cards.md` says 1 left + 1 right. **Use 1+1** (rules file).

Expansions (`research/expansions.md`) are **out of v1**. Keep the engine data-driven so later terrain, nations, and board sizes can land without a rewrite.

---

## Product

Two players. One 13×9 hex board. Three sections. Shared 60-card command deck. Play one card, announce orders, move, battle, draw. First to the scenario medal target wins.

Modes (keep the existing shell):

- Pass-and-play on one iPad, laptop, or phone (hand hidden behind Pass device / Reveal).
- Online room: create / join; server authoritative; opponent hand never leaves the server.

**Screens:** iPad landscape and a large monitor are first-class — full 13×9 visible, no pinch required. iPhone is the same layout with pinch-zoom and sideways pan.

**Not in v1:** AI, accounts, persistence, spectators, Overlord two-board, Breakthrough, nation packs, air units.

---

## What was wrong in the previous draft

The earlier plan invented a cousin system. Research requires these corrections:

- Infantry is **move 1 and battle, or move 2 and not battle** — not move 2 and battle. Special-forces infantry is the unit that may move 2 and still battle.
- Artillery is hit **only by grenades** (1/6 per die), not by infantry symbols.
- **Assault** orders **all** units in a section, not 3. Probe = 2, Attack = 3, Recon = 1 plus draw-2-keep-1.
- Turn is **play → announce all orders → move every ordered unit → battle every ordered unit → draw**. Not move-and-battle interleaved as the main sequence. Take-ground / overrun finish inside that unit’s battle before the next unit battles.
- If an ordered unit battles while adjacent to an enemy, it **must close-assault** that adjacent enemy (cannot fire past it).
- Terrain dice are **−1 infantry / −2 armor** into cover, not “max 2 dice”. Artillery ignores LOS **and** terrain dice reductions. Reductions **do not stack**; take the single best.
- Forest / town / hedgerow: unit **cannot battle the turn it enters**.
- LOS is blocked by blocking terrain **and by units**. Edge-on LOS is blocked only if **both** adjacent hexes obstruct.
- Exact 40+20 deck with the tactic list below, not a renamed subset.
- All **16** standard scenarios, not a 5-map original pack. Maps are original; parameters match research.

---

## Rules (implement exactly)

`src/game.js` stays DOM-free. `applyAction` is a pure function of `(state, action, actorSide)`. No `Math.random` inside it. Tests lock these numbers.

### Board

- 13 columns × 9 rows, 117 hexes, odd-r offset, **flat-top** hexes. Players sit on the short (9-hex) edges, facing across the 13-column width.
- Coordinates: columns `A`–`M` left to right from the Allies’ left (seat `ochre` by default on the bottom edge); rows `1`–`9` with row 1 on the top (defender / Axis) edge. Internally `q = 0..12`, `r = 0..8` with `r = 0` = row 9 if we store bottom-up — pick one mapping, document it in `src/board.js`, and use A–M / 1–9 in scenario files and the UI.
- Sections: **Left 4 columns, Center 5, Right 4**. Boundary hexes the divider cuts through belong to **both** adjacent sections and may be ordered by either section’s cards.
- Two **board faces** as scenario data, not two art files only:
  - **Countryside:** all open except overlay tiles.
  - **Beach:** two ocean rows + one surf row treated as ocean + a beach band + inland open. Retreat into ocean is illegal (figure loss instead).

### Turn (five steps)

1. Play one command card (exception: Ambush, played during the opponent’s close assault).
2. **Order:** announce every unit that card will order. Only those units may act. A unit is never forced to move or battle.
3. **Move:** ordered units one at a time; each moves at most once; finish one unit’s move before the next.
4. **Battle:** ordered units one at a time; each battles at most once; finish hits, flags, take-ground, and at most one armor overrun before the next unit battles.
5. Draw one card, except Recon: draw 2, keep 1, discard the other.

Hand size and first player come from the scenario. One card per turn except Ambush.

### Units

Figures stay together on one hex. No stacking. Hits remove figures; a 1-figure unit still moves and battles at full printed strength.

| Type | Figures | Movement | Dice at range 1–6 |
| --- | --- | --- | --- |
| Infantry | 4 | 1 hex and battle, **or** 2 hexes and no battle | 3 / 2 / 1 / — |
| Armor | 3 | up to 3 hexes and battle | 3 / 3 / 3 / — |
| Artillery | 2 | 1 hex **or** battle, never both | 3 / 3 / 2 / 2 / 1 / 1 |

Cannot enter or pass through occupied hexes (friend or foe).

**Badges** (scenario tags, not new types):

- `special-forces` infantry: may move 2 and still battle.
- `resistance` infantry: 3 figures; may battle the turn they enter terrain that normally forbids it; may retreat 1, 2, or 3 hexes **per flag**.
- `elite-armor`: 4 figures.

Box supply is a soft cap for scenario design (42 / 24 / 6 figures per army) but the engine should not hard-fail over it.

### Dice

Eight dice in the box; a roll uses as many as the attack needs (max 4 in the physical game is a component limit — digitally roll the exact number the rules ask for, including +1 from cards).

Each die, six faces:

| Face | Copies | Normal combat |
| --- | --- | --- |
| Infantry | 2 | hit infantry |
| Armor | 1 | hit armor |
| Grenade | 1 | hit any type |
| Star | 1 | miss, unless a card says otherwise |
| Flag | 1 | retreat 1 hex (after hits) |

Per-die hit chance: infantry 50%, armor 33.3%, artillery 16.7%.

Stars score only on **Air Power**, **Their Finest Hour**, and **Medics & Mechanics** (and any later card that says so).

`applyAction` requires `rolls: number[]` (values 1–6 mapped to faces in `src/content/dice.js`). Online: server fills rolls with `randomInt(1, 7)` and **strips client rolls**. Local: `crypto.getRandomValues`. Tests: canned rolls.

### Combat

1. Pick ordered unit and target.
2. Range (hex distance) and LOS (infantry and armor only). Artillery skips LOS.
3. If the attacker is adjacent to **any** enemy and chooses to battle, the target **must** be an adjacent enemy (close assault). Cannot fire past a neighbour.
4. Apply terrain / obstacle dice (single best reduction; artillery ignores).
5. Roll.
6. Hits, then flags.
7. Take ground / overrun if eligible.

**LOS:** line between hex centres. Blocked if it crosses a blocking-terrain hex or **any unit**. If the line lies on a hex edge, blocked only when **both** hexes of that edge obstruct.

**Flags:** after hits, 1 hex retreat per flag toward the unit’s own baseline. Retreats ignore terrain movement costs/stops, but cannot enter occupied, impassable, off-board, or ocean. Each incomplete retreat hex = 1 figure lost. Some obstacles ignore the **first** flag of a battle; **Air Power and Barrage** flags cannot be ignored.

**Take ground:** after a close assault that empties the hex, infantry may enter it. Artillery never takes ground. Armor may enter and then claim **one** overrun battle this turn (must close-assault if still adjacent to an enemy, else may fire). After a successful overrun it may take ground again, and must not battle a third time.

No general battle-back. Ambush is the only base-game reaction.

### Terrain and obstacles

Authority: `research/board-and-terrain.md`. Artillery fire is never reduced and needs no LOS.

| Feature | Movement | LOS | Combat |
| --- | --- | --- | --- |
| Forest | Stop on enter; **no battle that turn** | Blocks | vs occupant: inf −1, armor −2 |
| Hedgerow | Must **start adjacent** to enter; stop on enter; **no battle that turn**; leaving: full move, stop on first hex out | Blocks | vs occupant: inf −1, armor −2 |
| Hill | None | Blocks lower-level sight; contiguous same-height hills do not block each other | Attacking **uphill**: inf or armor −1; same-height hill-to-hill: no penalty |
| Town | Stop on enter; **no battle that turn** | Blocks | vs occupant: inf −1, armor −2; armor battling **out** of town: −2 |
| River | Impassable except at a bridge | Does not block; fire across allowed unless a scenario forbids it | — |
| Bridge | River hex treated as open | Does not block | None |
| Ocean | Max 1 hex per turn in water; cannot retreat into ocean | Does not block | Unit in ocean **cannot battle** |
| Beach | Any unit that moves onto sand this turn is capped at **2 hexes** (even armor) | Does not block | Take ground / overrun still allowed |
| Bunker | Impassable to armor and artillery; infantry may enter and still battle | Blocks | vs occupant: inf −1, armor −2, **only if the occupant is the bunker’s original owner**; owner ignores first flag; artillery set up in a bunker never leaves and takes a hit per unspent flag; 360° fire (no facing). Scenarios may restrict who may occupy. |
| Hedgehog | Impassable to armor and artillery; infantry enter freely | Does **not** block | No dice modifier; infantry occupant ignores first flag |
| Sandbags | None. **Removed** if the occupant leaves, retreats, or is destroyed | Does **not** block | Ignore first flag always. If the hex terrain gives **no** dice protection, attackers (inf/armor) roll −1 |
| Wire | Enter and stop | Does **not** block | Occupant battles out at −1. Infantry may **remove wire instead of battling**. Armor **clears wire on enter and may still battle** |

Obstacle + terrain: **one** dice reduction, the best. Scenario extras (cliffs/bluffs, impassable hills, wide river) live on the scenario object, not the global table.

### Victory

Scenario `medals` target, commonly 4–6. First to target wins immediately.

- 1 medal per enemy unit eliminated (last figure removed).
- Objective hexes: `temporary` (while occupied) or `permanent` (kept if you leave or die).
- Scenario extras: instant-win occupation, exit-off-board medals, double-value units, deck-exhaustion clock.

Recommend **match play** in the UI (play twice, swap sides, add medals) because the research scenarios are historically asymmetric on purpose.

---

## Command deck (60 cards, exact counts)

Original **titles and body text**. Functions and copies match `research/command-cards.md`. Code ids are stable (`section-assault-left`, `tactic-finest-hour`, …). UI shows our names.

### Section cards (40)

| Research family | Orders | Left | Center | Right | Total |
| --- | --- | ---: | ---: | ---: | ---: |
| Assault | **All** units in that section | 2 | 2 | 2 | 6 |
| Probe | 2 units in that section | 4 | 5 | 4 | 13 |
| Attack | 3 units in that section | 3 | 4 | 3 | 10 |
| Recon | 1 unit in that section; end of turn draw 2 keep 1 (replaces the normal draw) | 2 | 2 | 2 | 6 |

Multi-section (5):

| Research name | Count | Function |
| --- | ---: | --- |
| General Advance | 1 | Up to 2 units in **each** section (max 6) |
| Pincer Move | 1 | 1 unit left **and** 1 unit right |
| Recon in Force | 3 | 1 unit in each section |

Center is heavier on purpose (13 vs 11 per flank). One shared deck for both players.

### Tactic cards (20)

| Research name | Count | Function to implement |
| --- | ---: | --- |
| Air Power | 1 | Strike a cluster of up to 4 contiguous enemy-occupied hexes. Historically air-dominant side (scenario flag, usually Allies) rolls **2** dice per hex, the other **1**. Terrain gives no protection. Unit symbols, grenades, **and stars** hit. Flags cannot be ignored. |
| Ambush | 1 | Reaction when opponent declares a close assault on your unit: you battle first at full strength; they proceed only if they survive and have not retreated. Draw a replacement at the end of **that** (opponent’s) turn. |
| Armor Assault | 2 | Order up to 4 armor; those in close assault roll +1 die. Fallback: no armor → order any 1 unit. |
| Artillery Bombard | 1 | Order all your artillery; each either moves up to 3 (no battle) or stays and fires **twice**. Fallback: no artillery → any 1 unit. |
| Barrage | 1 | 4 dice on any 1 enemy unit, ignore range, LOS, and terrain. Hits on that unit’s own symbol or grenade only. Flags cannot be ignored. |
| Behind Enemy Lines | 1 | 1 infantry: move up to 3, battle, then move up to 3 again, ignoring terrain **movement** restrictions (battle effects still apply). Fallback: no infantry → any 1 unit. |
| Close Assault | 1 | Order every infantry and/or armor already adjacent to an enemy; +1 die; they may not move first. Infantry may still take ground; armor may still overrun. |
| Counter-Attack | 2 | Replay the opponent’s just-played command card. Left/right section cards **mirror** to the opposite flank for you. Infantry Assault is countered in the **same** section they chose. Cannot counter a Counter-Attack (if that comes up, treat as no-op / play as any-1 if we need a ruling — specify in tests: Counter-Attack of Counter-Attack is illegal). |
| Dig-In | 1 | Up to 4 infantry: place sandbags on their hexes. Fallback: no infantry → any 1 unit. |
| Direct from HQ | 2 | Order any 4 units anywhere. |
| Firefight | 1 | Up to 4 units **not** adjacent to an enemy; may not move; each battles with +1 die. |
| Infantry Assault | 2 | All infantry in **one** section; each may move up to 3 (no battle) or 2 and still battle. Fallback: no infantry → any 1 unit. |
| Medics & Mechanics | 1 | 1 damaged unit; roll 1 die per card in hand **including this card**; each of that unit’s symbol or a star restores 1 figure (cap at printed max). If at least 1 figure is restored, the unit may then move and battle normally. |
| Move Out! | 2 | Up to 4 infantry, normal move and battle. Fallback: no infantry → any 1 unit. |
| Their Finest Hour | 1 | Roll 1 die per card in hand including this card; each unit symbol orders one matching unit; each star orders any 1 unit; all ordered units battle with +1 die. Then **reshuffle discard into the deck**. |

Fallbacks, Ambush timing, Counter-Attack mirroring, and Finest Hour reshuffle need dedicated tests.

Suggested original tactic titles (final copy can change; ids stay): Air Strike, Ambush, Armor Push, Gun Line, Barrage, Deep Patrol, Close Assault, Counter Order, Dig In, Headquarters, Firefight, Infantry Push, Repair Party, Move Out, Finest Hour.

---

## Scenarios (16 standard)

Do **not** transcribe official setup maps. For each battle, write an original 13×9 layout from:

1. Public-domain historical geography (canal, beach, town, ridge).
2. The tactical character in `research/base-scenarios.md` (what the fight is about).
3. The checklist in `research/scenario-design-patterns.md` (shallow deployment, no empty section, 1–2 special rules).

Keep historical **titles, dates, sides, board face, card hands, first player, medal targets, force mixes, and special rules** from the research table. Each file gets a design note in `docs/scenarios/` citing historical sources — not the source game.

Skip the two-board Omaha Overlord bonus in v1 (needs a second board and 8-player rules).

| # | Id | Title | Face | Cards (Allies / Axis) | First | Medals | Specials to code |
| --- | --- | --- | --- | --- | --- | ---: | --- |
| 1 | `pegasus-bridge` | Pegasus Bridge | Country | Allies 2→4 / Axis 6 | Allies | 4 | Axis hand ramps 2→4 over first two turns; two bridges are **temporary** Allied medals; infantry only |
| 2 | `sainte-mere-eglise` | Sainte-Mère-Église | Country | 4 / 5 | Allies | 4 | Airborne drop of 4 infantry figures before Allied turn 1: each figure that lands off-board or on occupied is lost (no medal); empty hex is promoted to a full unit. Digital: RNG onto a scenario drop-zone set |
| 3 | `sword-beach` | Sword Beach | Beach | 4 / 5 | Allies | 5 | Inland towns temporary Allied medals; some Allied infantry `special-forces`; bunkers Axis-only |
| 4 | `pointe-du-hoc` | Pointe-du-Hoc | Beach | 4 / 6 | Allies | 4 | All Allied infantry Rangers (`special-forces`); beach-adjacent hills are **cliffs** (climb from beach costs the full 2-hex infantry move; armor cannot climb from sand; inland face is a normal hill); Axis-only bunkers; far forest is a **permanent** Allied medal |
| 5 | `omaha-beach` | Omaha Beach | Beach | 5 / 4 | Axis | 6 | Three inland towns temporary Allied medals; hedgehogs + wire on sand; cliffs as Pointe-du-Hoc; Axis bunkers; two **permanent** sandbags (sea wall) that are never removed and protect **Allies only**; one Ranger unit |
| 6 | `mont-mouchet` | Mont Mouchet | Country | 4 / 5 | Allies | 4 | All Allies `resistance`; Axis armor `elite-armor`; each eliminated elite armor = **2 medals** for Allies |
| 7 | `vassieux` | Vassieux, Vercors | Country | 4 / 4 | Axis | 4 | All Allies `resistance`; if the deck empties before Allies reach medals, **Axis wins** |
| 8 | `operation-cobra` | Operation Cobra | Country | 4 / 5 | Allies | 5 | Two named towns temporary Allied medals; dense hedgerows; one Axis elite armor |
| 9 | `mortain` | Operation Lüttich | Country | 5 / 6 | Axis | 4 | Town temporary **Axis** medal; Axis special-forces + elite armor; climb hill from low ground costs a 2-hex move; while Allies hold Hill 317, they may play Recon cards as an air strike in that section (2 dice per targeted hex) |
| 10 | `toulon` | Toulon | Country | 4 / 6 | Allies | 6 | Allies also win if they occupy all 3 city hexes at end of turn; Commando + Ranger |
| 11 | `paris` | Liberation of Paris | Country | 4 / 6 | Allies | 5 | Axis-side town hexes are **permanent** Allied medals |
| 12 | `montelimar` | Montélimar | Country | 5 / 5 | Axis | 6 | Two towns temporary Axis medals; one temporary Allied medal if **any** Allied unit is adjacent to the river (one medal, not per hex); some Axis infantry 3 figures; some hills impassable; Axis elite grenadiers |
| 13 | `arnhem-bridge` | Arnhem Bridge | Country | 6 / 6 | Axis | 5 | Bridge enter/leave only via two marked end hexes; infantry may **not** fire across the river; Allies elite airborne + artillery, sandbagged; Axis larger, partly trapped on far bank |
| 14 | `arracourt` | Arracourt | Country | 4 / 6 | Axis | 6 | Armor-heavy, ridges, no extra objectives |
| 15 | `st-vith` | St. Vith | Country | 5 / 4 | Axis | 6 | Impassable back-edge ridge; all Axis armor elite |
| 16 | `saverne-gap` | Saverne Gap | Country | 4 / 6 | Allies | 5 | Hills impassable and artillery may not fire over them; Allies also win if they occupy 2 of 3 town hexes at end of their turn |

Scenario object (sketch):

```js
{
  id, title, date, briefing, boardFace, medals,
  allies: { hand, label, firstRamp?: { from, to, turns } },
  axis: { hand, label },
  firstPlayer, airDominant: "allies" | "axis",
  tiles, obstacles, units, objectives, specials, dropZone?,
}
```

Ship order: **Pegasus Bridge first** (teaching), then Sainte-Mère-Église and one beach, then the rest. Lobby lists all 16 as they land. Engine must not special-case a scenario beyond data + named special hooks (`hand-ramp`, `air-drop`, `cliff`, `deck-clock`, `recon-as-air`, `bridge-ends`, `wide-river`, `impassable-hills`, `instant-occupy`, `double-medal-tag`, `permanent-sandbags-side`).

---

## Architecture

Keep: room server, SSE, seat tokens, `GameRuleError`, no runtime deps, `npm run check`.

### Dice purity

Same as before: rolls on the action, server-authored online.

### Hidden information

Seat-filtered payloads: your hand, opponent **count** only, full board, medals, discard count. Pass-and-play keeps both hands locally and gates with Pass / Reveal.

### Actions

`play-card`, `select-orders`, `move`, `battle`, `take-ground`, `skip-ground`, `overrun-battle`, `remove-wire`, `react-ambush`, `counter-attack`, `draw-keep` (Recon), `air-power-targets`, `barrage-target`, `finest-hour-assign`, `medics-target`, `end-turn-draw`, `resign`.

Phases: `play-card` → `select-orders` → `move` → `battle` → `draw` → opponent. Ambush inserts on the opponent’s battle declaration.

### Files

```
src/game.js                 # applyAction, phases
src/board.js                # hex math, sections, LOS
src/content/units.js
src/content/terrain.js
src/content/cards.js        # 60-card deck, original names
src/content/dice.js
src/scenarios/*.js          # 16 files
src/ui/main.js
src/ui/board.js             # pan/zoom, full-board default on iPad
src/ui/hand.js
src/ui/combat.js
server.mjs
test/game.test.js
test/cards.test.js
test/combat.test.js
test/scenarios.test.js
assets/…                    # Imagine-generated original art, slotted by manifest
docs/scenarios/*.md
```

### Room API

`POST /api/rooms` body `{ scenarioId }`. Server rolls. Seat-filtered state. Serve `assets/` (`png` / `webp`).

---

## Layout

iPad / desktop: entire 13×9 at a tappable hex size; card tray along the bottom (side rail on very wide screens). Section tints + dotted dividers.

iPhone: same layout, board overflows, pinch-zoom and sideways pan. No separate IA.

Flow: tap card → eligible units pulse → tap units to order → confirm → tap hexes to move (one unit at a time) → tap targets to battle → Advance / Hold if take-ground → draw.

Dice overlay with original faces; tap to skip settle.

44px chrome. `viewport-fit=cover`. Shell does not page-scroll; the board surface pans.

---

## Artwork (Grok Imagine)

Yes — this is a Grok Imagine job. Use `image_gen` to make each **base** piece, then `image_edit` to lock likeness across a set (second faction, damaged/spent, hover/pressed chrome). Load `game-asset-core` plus the specialist skill for the class (`game-tilesets`, `game-ui-icons`, `game-character-consistency`). Never use source-game screenshots, scans, or box art as references.

Engine still ships a **geometric fallback** so rules can be playtested if a generate pass is late. Wired art lives in `assets/` with `assets/manifest.json` (id → file → size → key colour).

### Style lock (reuse on every prompt)

Painted miniature-wargame table, slightly elevated top-down, gouache/oil illustration, muted period colours (olive drab, khaki, field grey, dusty sand). Quiet boards, readable tiles, toy-soldier monochrome armies. Original silhouettes and original insignia. No logos, no readable letters in the image (card titles and rules are HTML on top).

Differentiate from the research source: our own vehicle shapes, our own medal mark (not star-vs-cross), our own card frame, our own stencil wordmark.

### Production rules

- **Tiles / boards:** seamless, even lighting, no landmark motif. After each fill tile, composite a real 2×2 and reject seam lines. Hex mask in-engine or a flat keyable field we clip.
- **Units:** isolated subject, flat single-colour keyable background, one pose per type. Generate Allied infantry first; **edit-chain** Axis infantry (palette + helmet/weapon only). Same for armor and artillery. Strength is drawn as figure count in-engine, not baked into the sprite.
- **Cards:** blank frames only — section (green family) and tactic (khaki family), plus one back. Section diagram and “ALL”/numeral are CSS/SVG, not pixels. Vignettes are optional later, edit-chained from one painterly scene so the set matches.
- **UI chrome:** generate normal first; hover/pressed via `image_edit` with a freeze-list (same geometry).
- **Dice / medals / badges:** chunky one-colour pictograms, legible at small size; same icon language on cards.
- Cap retries: ~2 discards per proven point; flag any leftover defect instead of looping.

### Asset list (v1)

- `board-countryside`, `board-beach` (13×9 readable grid; dotted section lines can be CSS overlays if the model garbles them)
- Tiles: forest, hill, town, hedgerow, river-straight, river-curve
- Overlays: bridge, bunker, sandbag, wire, hedgehog
- Units: infantry, armor, artillery × olive + blue-grey
- Card: section frame, tactic frame, back
- Dice faces: infantry, armor, grenade, star, flag
- Medal token; badges: special-forces, resistance, elite-armor
- Optional later: wordmark, briefing vignettes

### Art slice order

1. Style lock + one forest tile + 2×2 seam check (proves the look).
2. Remaining terrain fills and obstacles, same lock.
3. Allied infantry → edit-chain the other five unit sprites.
4. Dice faces + medal (icon set, one contract).
5. Card frames + back (no text).
6. Boards last (large, easy to over-decorate; keep empty so tiles pop).

---

## Implementation order

Do not start until you approve this draft.

1. **Engine core** — 13×9, sections, LOS, unit table, terrain table, combat with injected rolls, flags, take-ground, one overrun. Tests from `dice-and-combat.md` probabilities as sanity (expected hits), plus canned-roll cases. Debug “order any unit” for tests only.
2. **Cards** — full 60-card data, play/order/draw, every tactic including Ambush, Counter-Attack mirror, Finest Hour reshuffle, fallbacks. Tests per card kind.
3. **Server** — `scenarioId`, server rolls, hidden hands, asset MIME.
4. **Board UI** — iPad/desktop full board; iPhone pan/pinch; order → move → battle flow; pass-device gate.
5. **Pegasus Bridge** — first complete match, briefing, lobby picker (playable with placeholders).
6. **Imagine art** — style lock, tiles, units, dice, card frames; wire through the manifest. You review; we regenerate any piece that misses.
7. **Scenarios 2–5** (airborne + three beaches) with their special hooks.
8. **Scenarios 6–16**.
9. **Online two-browser** verification (no hand leak).
10. **Juice** — dice settle, retreat, hit flash, optional vibrate.

`npm run check` after every slice.

---

## Tests (minimum)

- Infantry 1+battle vs 2+no-battle; special-forces 2+battle; artillery move XOR battle.
- Hits by target type; artillery grenade-only; stars miss unless named cards.
- Adjacent-enemy must close-assault.
- LOS blocked by unit and by forest; edge-on both-sides rule.
- Forest no-battle-on-enter; hedgerow adjacent-to-enter and leave-stop; hill uphill −1; town armor-out −2; sandbag remove-on-leave; wire armor-clear; bunker owner-only; reductions do not stack.
- Retreat blocked → figure loss; ignore-first-flag; Air Power/Barrage override.
- Take ground infantry; artillery cannot; armor overrun once then optional second take-ground.
- Deck composition 40+20; Assault = all in section; Recon draw 2 keep 1.
- Counter-Attack mirrors flanks; Ambush interrupts; Finest Hour reshuffles.
- Seat A payload has no seat B card ids; client rolls ignored online.
- Each scenario loads, deals the researched hand sizes, and enforces its medal target and listed specials.

Browser before UI is called done: iPad landscape and desktop with **full board visible**; iPhone landscape with pinch and sideways pan. Play Pegasus Bridge through to a medal win, pass-and-play and a two-browser room.

---

## Approval

Not approved. Research is now in-tree; this draft is the implementation spec to accept, mark up, or replace. No build from this file until you say to proceed.
