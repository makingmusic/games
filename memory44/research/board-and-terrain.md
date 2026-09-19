# memory44 research — board geometry and terrain system

Functional summary of the reference game's board and terrain rules, distilled in our
own words from the printed rulebook and the publisher's official FAQ. Nothing here
reproduces the original rule prose.

## Board geometry

- The board is a hex grid, **13 hexes wide by 9 hexes deep** (117 hexes). Confirmed by
  the rulebook ("13 hexes wide by 9 hexes deep") and by secondary sources.
- Hex rows are offset (flat-top hexes); each player sits at one of the 9-hex-deep
  short edges, so the armies face each other across the 13-column width.
- Two dotted lines divide the board into **three sections**:
  - **Left flank**: 4 columns
  - **Center**: 5 columns
  - **Right flank**: 4 columns
  - Because of the hex offset, the dividing lines slice through some border hexes;
    a hex the line cuts through counts as belonging to **both** the flank and the
    center. Units on such a hex can be ordered by cards for either section.
- Section cards reference these sections (e.g. "order 2 units on the left flank"),
  which is why the split matters mechanically.

### Coordinate convention

The printed board has no coordinates; the convention used by the publisher's online
scenario editor and the fan community is:

- **Columns lettered left to right**: A through M (from each player's own left, so
  column A is the left flank's outermost column from the Allied point of view when
  reading official scenario maps).
- **Rows numbered 1-9**, running from one baseline to the other.
- Example references seen in scenario discussions: G5 (center), K4, L2 (right flank).

For an original implementation, any consistent convention works; a sensible mirror is
columns `A`-`M` and rows `1`-`9`, with row 1 on the Axis (top) edge, matching how the
community transcribes setups.

## The two board faces

The base board is double-sided:

- **Countryside side** — plain green open terrain. Every non-beach scenario starts
  from this face; all features come from terrain tiles laid on top.
- **Beach-landing side** — one edge is sea: two full ocean rows, then a surf/shore row
  that is *treated as ocean* for movement and retreat, then a band of beach (sand)
  hexes, with open countryside inland. Units forced to retreat off the first three
  rows take losses instead (they cannot retreat into the sea).

## Terrain tile types (base game)

Unless noted, "dice reduction" means the *attacker* rolls fewer battle dice when
firing at a unit on that terrain. Artillery fire is not reduced by terrain.

| Terrain | Movement | Line of sight | Combat effect |
|---------|----------|---------------|---------------|
| Forest | Unit entering must stop; cannot battle the turn it enters | Blocks | Attacking in: infantry −1 die, armor −2 dice; artillery unaffected |
| Hedgerow | Must stop on entry AND must start the turn adjacent to enter; leaving costs a full move (stop on the first hex out); cannot battle the turn it enters | Blocks | Attacking in: infantry −1, armor −2; artillery unaffected |
| Hill | No movement restriction | Blocks sight of units at lower level; contiguous hills at the same height do not block each other | Attacking uphill: infantry or armor −1 die; hill-to-hill at same height: no penalty |
| Town / Village | Unit entering must stop; cannot battle the turn it enters | Blocks | Attacking in: infantry −1, armor −2; armor attacking **out** of a town: −2 dice; artillery unaffected |
| River / Waterway | Impassable to everything except at bridges | Does not block; units may fire across | — |
| Bridge (over river) | Treats the river hex as open ground | Does not block (unless a scenario says so) | No effect |
| Ocean | Max 1 hex of movement per turn while in water; no retreating into the sea | Does not block | Unit in the water cannot battle |
| Beach | Any unit that moves onto sand may move at most 2 hexes that turn (even armor) | Does not block | No combat restrictions; Taking Ground / overrun still allowed |

### Scenario-defined terrain variants seen in the base scenarios

- **Cliffs / sea bluffs**: hills directly behind a beach. Climbing from the beach costs
  a unit's whole 2-hex move (infantry only — armor cannot climb from the sand);
  approached from inland they are ordinary hills.
- **Impassable hills/mountains**: some scenarios declare hill hexes uncrossable
  (Montélimar's northern hills, St. Vith's ridge, Saverne's mountains, where artillery
  also may not fire over them).
- **Wide river**: at Arnhem the river is declared too wide for infantry to fire across.

## Obstacles (markers placed on hexes)

Protection from an obstacle does **not** stack with the terrain underneath — only the
single best defensive modifier applies.

| Obstacle | Movement | Line of sight | Combat effect |
|----------|----------|---------------|---------------|
| Bunker (fixed) | Impassable to armor and artillery; infantry may enter and still battle | Blocks | Attacking in: infantry −1, armor −2; artillery unaffected; occupant may ignore the first retreat flag rolled against it each attack. Artillery placed in a bunker at setup can never leave and takes a hit for each flag it cannot retreat. Scenarios can restrict bunkers to one side ("only the Axis may claim bunkers") |
| Hedgehog (steel anti-tank obstacle) | Impassable to armor and artillery; infantry pass freely | Does **not** block (per official FAQ) | No dice effect; infantry in the hex may ignore the first flag rolled against it |
| Sandbags (removable) | No movement effect | Does **not** block (per official FAQ) | If the hex's terrain gives no protection, attackers roll −1 die (infantry or armor); regardless, the occupant may ignore the first flag each attack. Removed from the board the moment the occupying unit leaves, retreats, or is destroyed |
| Barbed wire (removable) | Unit entering must stop | Does **not** block (per official FAQ) | A unit in wire battles out at −1 die; infantry may remove the wire instead of battling; armor clears it automatically and may still battle |

Special markers also exist: **victory-medal tokens** placed on map objectives, and
**special-forces badges** pinned to units. Base-game special unit types:

- **Special-forces infantry** (Commandos, Rangers, elite grenadiers, paratroopers):
  may move 2 hexes and still battle (regular infantry must choose between moving 1 and
  battling, or moving 2 without battling).
- **Elite armor**: 4 tank figures instead of 3 (harder to destroy).
- **Resistance infantry**: 3 figures instead of 4; may enter protective terrain and
  still battle that turn; may retreat 1-3 hexes per flag (slipping away through known
  country).

## Quick reference: unit baseline (for terrain effects to bite against)

- Infantry: 4 figures; move 1 and battle, or move 2 without battling; battles 3/2/1
  dice at range 1/2/3.
- Armor: 3 figures; moves up to 3 and battles; always 3 dice (3/3/3); after a
  successful close assault it may take ground and overrun (battle a second time).
- Artillery: 2 figures; moves 1 **or** battles; battles 3/3/2/2/1/1 out to range 6;
  ignores line of sight and terrain dice reductions.
