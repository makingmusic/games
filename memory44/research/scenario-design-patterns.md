# memory44 research — scenario design patterns

How the reference game's official scenarios are put together, synthesized from the
16 base-game scenarios (see `base-scenarios.md`), the publisher's wider scenario
database and designer commentary. The goal: a working recipe book for designing
**original** memory44 scenarios. All patterns are described functionally.

## 1. Victory conditions: medals and objectives

- **Medal target is 4-6 for a standard board** (base game: 4×5, 5×5, 6×5). Big-board
  formats scale this up (8 medals on the two-board bonus scenario).
- Rough calibration: the medal target is about **half of the defender's unit count**,
  so the attacker must destroy roughly half the defending force, and the defender wins
  by inflicting the same toll first. Lower targets (4) make short, sharp, luck-sensitive
  battles; 5-6 is the standard fare.
- Base medals come from destroying enemy units. Layer **objective medals** on top to
  create direction and history:
  - *Temporary hold*: medal counts only while your unit sits on the hex (towns,
    bridges). Encourages attack-and-hold and counterattack play. Most common form.
  - *Permanent capture*: medal is banked forever once taken (Paris outskirts,
    Pointe-du-Hoc forest). Encourages raid-and-move-on play.
  - *Instant victory*: occupy N of M hexes of a key location at end of turn (Toulon:
    all 3 city hexes; Saverne: 2 of 3). Creates a do-or-die focal point.
  - *Exit medals*: a unit that leaves the board through the enemy edge scores
    (breakthrough flavor).
  - *Asymmetric scoring*: one side's premium units are worth double (elite armor at
    Mont Mouchet = 2 medals each), forcing the owner to protect them and the opponent
    to hunt them.
  - *Clocks*: if the draw deck is exhausted before the attacker wins, the defender
    wins (Vassieux). Prevents turtling by the side that would otherwise just hide.

## 2. Force composition

- Typical unit counts per side in the base game: **8-14 units**. Extremes: 6 (small
  Axis force at Pegasus Bridge, Sword) up to ~13-14 (Omaha Allies: 10 infantry + 3
  armor; St. Vith Axis: 10+4+1).
- Infantry dominates most scenarios (often 60-80% of units). Armor appears in
  11 of 16 scenarios; artillery is deliberately rare (0-2 units per side) because it
  is strong at range.
- The box's physical figure supply is a soft constraint: 42 infantry / 24 armor /
  6 artillery figures per side — i.e. at most ~10 full-strength infantry units, 8 armor
  units, or 3 artillery units per army.
- Special-unit seasoning, used sparingly (1-2 units per scenario or one homogeneous
  elite army): special-forces infantry (move 2 + battle), elite armor (4 figures),
  Resistance (3 figures, terrain tricks, slippery retreats). Arnhem shows the extreme:
  *all* Allied units are elite airborne.

## 3. Card hands, first move, and asymmetry

Balance is handled through four knobs, usually in combination:

1. **Hand size**: 4-6 cards is normal. The pegasus extreme (2 vs 6, ramping to 4)
  models total surprise. The stronger board-side usually holds *fewer* cards
  (St. Vith: defender 4 vs attacker 5; Omaha: landing force 4 vs defender 5).
2. **First move**: given to the side that needs tempo — usually the historical
   attacker, but Omaha and St. Vith give it to the historically attacking side even
   though that side is the *defender on the medals math*, which keeps pressure on.
3. **Terrain**: defenders get protective terrain (forests, towns, sandbags, bunkers)
   on their half; attackers get numbers or mobility.
4. **Objectives**: medal objectives are usually placed where the *attacker* must go,
   so the defender profits passively from attacker casualties while the attacker must
   take ground to score.

The rulebook itself recommends **match play**: play every scenario twice, swapping
sides, and add both games' medals — an explicit admission that individual scenarios
are intentionally *not* 50/50 (published battle-report win rates range from ~34% to
~81% Allied wins across the base set). Deliberate asymmetry is a feature: scenarios
model history, and the match format restores fairness. For an original design, either
adopt the same match-play convention or playtest toward a 45-55% band.

## 4. How setup is specified

- **Board face first**: countryside or beach side.
- **Terrain tiles next**, placed per a map: rivers/waterways, then towns, then
  forests/hills/hedgerows, then fixed features (bridges, bunkers), then removable
  obstacles (sandbags, wire, hedgehogs).
- **Units last**, one figure per occupied hex as placeholders, then filled out to
  strength; special-units badges and objective medals placed per the scenario rules.
- **Deployment zones are shallow**: units occupy roughly the first 2-4 rows from each
  baseline; the middle rows start empty (except for dropped/airborne forces or
  objective towns). Beach scenarios pack the attacker's first 1-3 rows (water + sand)
  and give the defender a fortified line on the bluff/town row.
- **Section distribution is deliberate**: designers leave one flank weak or empty to
  create dead card draws and maneuver decisions (fan reviewers consistently flag
  scenarios with an empty section as flawed — the card system punishes empty sectors).
- Attacker/defender is expressed by position, not label: the attacker starts far from
  the objectives, with more units/cards; the defender starts on the objectives behind
  protective terrain.

## 5. Common special-rule patterns (keep the count low)

The designer's own published advice to scenario authors: **playtest more than once,
never count solo play as a playtest, and add very few special rules** — reuse existing
mechanisms rather than inventing new ones. The recurring official patterns:

- **Night attack / surprise**: modeled with card-hand asymmetry (defender starts with
  2 cards, ramps up) rather than a visibility rule in the base game; later official
  material adds a visibility chart where range shrinks at night and dice rolls can
  change visibility. Functional take: night = attacker gets tempo, defender gets
  fewer orders.
- **Airborne drop**: figures are scattered onto random hexes by a physical drop;
  figures landing off-board or on occupied hexes are lost. Landing zones are empty
  mid-board areas; the scattered deployment is the whole scenario. Variants drop whole
  units at chosen drop points with a scatter roll.
- **Amphibious landing**: ocean rows (1-hex moves, no battling, no retreating into the
  sea) → beach (2-hex move cap) → bluff line (climbing costs the full move, armor
  stuck) → fortified objective line. The attacker's whole army arrives turn 1 in the
  water; the defender is outnumbered but perfectly positioned.
- **Resistance / partisans**: 3-figure units that ignore the "can't battle after
  entering terrain" rule and retreat up to 3 hexes per flag. Always paired with a
  compensating mechanism (double-value enemy units, or a deck-exhaustion clock) so the
  guerrillas can't just evaporate and stall.
- **Air power as terrain reward**: holding a specific hex (Hill 317) converts weak
  recon cards into air-strike attacks — i.e., an observer-post objective that pays out
  in tempo rather than medals.
- **Weather/frozen rivers** (expansion-era pattern): rivers declared frozen become
  crossable with a risk (roll when crossing/battling on the ice; a bad roll cracks it
  and costs figures). Functionally: convert impassable terrain into risky terrain.
- **Elite concentrations**: one or two 4-figure armor or move-2 infantry units as the
  historical spearhead; sometimes balanced by making them double-medal targets.
- **Restricted terrain**: impassable hills/mountains to wall off a flank (Saverne,
  St. Vith), wide rivers that block infantry fire (Arnhem), single crossing points
  with marked entry/exit hexes (bridges).

## 6. A checklist for an original scenario

1. Pick a historical (or invented) engagement with one clear tactical story: a bridge,
   a hill, a town, a beach.
2. Choose board face; sketch terrain so the story is legible (one dominant feature,
   not five).
3. Place the defender on the objective with protective terrain; give the attacker
   ~25-50% more units and a route problem to solve.
4. Set medals ≈ half the defender's unit count (4-6); add 1-3 objective medals only if
   they sharpen the story.
5. Set card hands (4-6) and first move to tilt against the terrain advantage; consider
   a surprise ramp (2→4) for ambush openings.
6. Add **at most 1-2** special rules, reusing the stock patterns above.
7. Playtest both sides against real opponents; expect to tune card counts by ±1 and
   medal targets by ±1. Publish with a recommended match-play (swap sides, total
   medals) note if the scenario is intentionally historical-asymmetric.
