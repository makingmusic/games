# memory44 — Core Rules Mechanics (Research Notes)

Functional summary of the core mechanics of the classic WWII hex-and-card wargame
that memory44 is inspired by. All prose is original; no rules text is reproduced.
This document covers the base game only (expansion material is noted separately).

## Board and Sections

- The battlefield is a hex grid of 13 columns by 9 rows (i.e. 13 wide, 9 deep).
- Two dashed lines divide the board into three **sections**, from each player's point of view:
  - Left flank: 4 columns
  - Center: 5 columns
  - Right flank: 4 columns
- Hexes on the boundary lines straddle two sections; a unit on such a hex may be
  ordered by a card of either adjacent section.
- The board is double-sided (open countryside / beach landing).

## Turn Structure

Each player's turn follows five fixed steps:

1. **Play one command card** from hand.
2. **Order**: announce all units that will be ordered, within the limits of the card.
   Only ordered units may move, battle, or take a special action this turn.
3. **Move**: move ordered units one at a time; each unit moves at most once per turn,
   and its movement must be fully completed before the next unit moves.
   An ordered unit is never forced to move.
4. **Battle**: battle with ordered units one at a time; each unit battles at most once
   per turn, and each battle (including any follow-up actions such as taking ground or
   an overrun combat) is fully resolved before the next unit battles.
   An ordered unit is never forced to battle.
5. **Draw one command card** to replenish the hand (the Recon 1 card modifies this to
   "draw 2, keep 1").

Hand size is set by the scenario briefing and typically differs per side (about 4–6 cards).
Normally only one card is played per turn; the sole base-game exception is the Ambush
card, which is played during the opponent's turn.

## Unit Types and Movement

| Unit      | Standard figures | Movement                                                | Battle dice by range |
|-----------|------------------|---------------------------------------------------------|----------------------|
| Infantry  | 4                | Up to 1 hex and battle, **or** up to 2 hexes and no battle | 3-2-1 (ranges 1-3) |
| Armor     | 3                | Up to 3 hexes and battle                                | 3-3-3 (ranges 1-3)   |
| Artillery | 2                | Up to 1 hex **or** battle (never both)                  | 3-3-2-2-1-1 (ranges 1-6) |

General movement rules:

- Figures of a unit always stay together and move as a group.
- No stacking: a unit may not move onto or through a hex occupied by any other unit
  (friend or foe).
- Losing figures never reduces a unit's movement or battle strength — a 1-figure unit
  fights at full effectiveness.

## Special Forces (base game badges)

- **Special Forces infantry**: badge token; may move up to 2 hexes and still battle.
- **French Resistance**: 3-figure infantry; may battle even after entering terrain that
  normally forbids battling on the turn of entry; may retreat 1–3 hexes per flag.
- **Elite Armor**: armor units that start with 4 tank figures instead of 3.

## Combat Sequence

1. Choose one ordered unit and a target.
2. Check **range** (hex distance) and **line of sight** (not required for artillery).
3. Apply **terrain effects** (dice reductions and battle restrictions).
4. Roll the number of battle dice for the unit type at that range, modified by terrain.
5. Resolve hits, then retreats (flags). Remove 1 figure per hit; a unit reduced to its
   last figure and hit again is eliminated and yields a medal.

### Close assault vs. fire

- Attacking an **adjacent** enemy is a **close assault** (range 1).
- Attacking an enemy more than 1 hex away is **firing**.
- A unit adjacent to an enemy that chooses to battle **must** close-assault that adjacent
  enemy; it may not fire past it at a more distant target.

### Line of sight

- Required for infantry and armor; **artillery always ignores line of sight** (and also
  ignores terrain battle-dice protections — see below).
- Draw an imaginary line between the centers of the two hexes. It is blocked if it
  crosses any part of a hex containing a blocking terrain feature or any unit.
- If the line runs exactly along a hex edge, it is blocked only if the hexes on **both**
  sides of that edge segment contain obstructions.

### Terrain effects (core set)

The base game uses: hills, forests, hedgerows, towns & villages, rivers (impassable
except at bridges), bridges, beaches, oceans, plus obstacles (sandbags, wire,
hedgehogs, bunkers). Dice modifiers are per attacking unit type against a target
inside the terrain.

| Terrain / obstacle | Movement | Attacker dice modifier | Other effects |
|---|---|---|---|
| Hill | None | −1 die (infantry and armor) when attacking **from below** | Blocks LOS, except between contiguous hills at the same height |
| Forest | Unit entering must stop; may not battle the turn it enters | −1 (infantry) / −2 (armor) against occupants | Blocks LOS |
| Hedgerow | Unit entering must stop and may not battle that turn; to enter or take ground a unit must pause on an adjacent hex first | −1 (infantry) / −2 (armor) against occupants | Blocks LOS |
| Town / village | Unit entering must stop and may not battle that turn | −1 (infantry) / −2 (armor) against occupants; armor inside battles **out** at −2 dice | Blocks LOS |
| River | Impassable except at bridges | — | Does not block LOS |
| Bridge | None | None | Does not block LOS |
| Beach | Max 2 hexes of movement onto beaches | None | Taking ground and overruns still possible; does not block LOS |
| Ocean | Max 1 hex; units in the ocean cannot battle or retreat into ocean | — | Does not block LOS |
| Sandbags | None (removed if the occupant voluntarily leaves) | −1 die (infantry and armor) against the occupant | Occupant may ignore the first flag each battle; does not block LOS |
| Wire | Unit entering must stop | Infantry inside battles **out** at −1 die | Infantry may remove the wire instead of battling; armor removes wire it enters and may still battle; does not block LOS |
| Hedgehogs (steel obstacles) | Impassable to armor and artillery; infantry may enter and battle | None | Infantry inside may ignore 1 flag; does not block LOS |
| Bunker | Impassable to armor and artillery; infantry may enter and battle | −1 (infantry) / −2 (armor), but **only protects the original owner's units** | Original owner's units inside may ignore 1 flag; artillery inside may not retreat and takes losses instead; 360° field of fire; blocks LOS |

Notes:

- When an obstacle sits on a terrain hex, only the **single best** dice reduction applies
  (reductions do not stack).
- Artillery ignores line of sight and ignores terrain dice protections when firing.
- Expansion sets add many more terrain types (roads, marshes, mountains, jungles, etc.);
  the memory44 design only needs the core set above.

## Hits, Flags, and Retreats

- Each battle-die symbol matching the target's type scores 1 hit; grenades hit any unit
  type (see `dice-and-combat.md` for the full face table).
- Each hit removes 1 figure. When the last figure of a unit is removed, the attacker
  scores a **victory medal**.
- After all hits are resolved, each **flag** rolled forces the target to **retreat**:
  move 1 hex per flag directly toward its own board edge.
- Retreats ignore terrain movement restrictions, but a unit may not retreat onto or
  through occupied hexes, impassable terrain, or off the board/into the sea. For each
  retreat hex a unit cannot complete, it loses 1 figure instead.
- Some terrain/obstacles (sandbags, bunkers for their owner, hedgehogs for infantry)
  let the occupant ignore the first flag rolled against it in each battle.

## Taking Ground and Armor Overrun

- After a successful **close assault** (target eliminated or forced to retreat), the
  attacking **infantry** unit may advance into the vacated hex ("take ground").
- **Artillery** may never take ground.
- **Armor** may take ground and then claim an **armor overrun**: after moving into the
  vacated hex, it battles a second time. If adjacent to an enemy, the overrun battle must
  be a close assault; otherwise it may fire at a distant target. An armor unit may make
  only **one** overrun combat per turn, but may take ground again after a successful
  overrun (i.e. advance into the newly vacated hex without battling a third time).

## Battle-Back

- The base game has **no general battle-back rule**: defenders do not automatically
  return fire.
- The **Ambush** tactic card is the exception: played when the opponent declares a close
  assault against your unit, your unit rolls its full attack first; the attacker only
  proceeds if it survives and has not retreated.
- (Expansion nation rules, e.g. a British "battle back with 1 die at 1-figure strength"
  ability, exist but are outside the base game.)

## Medals and Victory

- A scenario sets a **medal target** (commonly 4–6).
- 1 medal is scored for each enemy unit completely eliminated.
- Scenarios may also award medals for capturing and holding marked objective hexes or
  for exiting units off designated board-edge hexes.
- The first player to reach the medal target wins immediately.

## Scenario Structure

- The base game ships with a scenario booklet (over a dozen battles set around the
  summer 1944 campaign in Normandy, beginning with the landings of 06 June 1944).
- Each scenario defines: board setup (terrain, units, obstacles), starting hand sizes,
  who moves first, the medal target, and any special rules.
- Scenarios are asymmetric: hand sizes and force mixes differ by side.
