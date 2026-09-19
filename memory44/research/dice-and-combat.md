# memory44 — Battle Dice and Combat Math (Research Notes)

Dice system of the classic hex-and-card WWII wargame that memory44 is inspired by.
All probabilities computed here from the verified face distribution; prose is original.

## The Dice

- The base game contains **8 battle dice**; each player rolls with 4 at a time.
- Custom six-sided dice. The six faces:

| Face              | Copies per die | Chance | Meaning |
|-------------------|---------------:|-------:|---------|
| Infantry symbol   | 2              | 2/6 (33.3%) | Hit on **infantry** targets |
| Armor symbol (tank) | 1            | 1/6 (16.7%) | Hit on **armor** targets |
| Grenade           | 1              | 1/6 (16.7%) | Hit on **any** target (infantry, armor, or artillery) |
| Star              | 1              | 1/6 (16.7%) | Miss in normal combat; counts as a hit/effect only on certain tactic cards (Air Power, Their Finest Hour, Medics & Mechanics) and special expansion rules |
| Flag              | 1              | 1/6 (16.7%) | No damage; forces the target unit to **retreat** 1 hex per flag toward its own board edge |

## Hit Chance per Die, by Target Type

| Target    | Faces that hit      | Per-die hit chance |
|-----------|---------------------|-------------------:|
| Infantry  | Infantry ×2, Grenade | 3/6 = **50.0%** |
| Armor     | Armor ×1, Grenade    | 2/6 = **33.3%** |
| Artillery | Grenade only         | 1/6 = **16.7%** |

This asymmetry is the core balance lever: infantry is fragile, artillery is durable
but slow and short-ranged, armor is in between with high mobility.

## Dice Rolled per Unit Type, by Range

Range = hex distance to the target. Range 1 (adjacent) is a "close assault".

| Range | Infantry | Armor | Artillery |
|------:|---------:|------:|----------:|
| 1     | 3        | 3     | 3 |
| 2     | 2        | 3     | 3 |
| 3     | 1        | 3     | 2 |
| 4     | —        | —     | 2 |
| 5     | —        | —     | 1 |
| 6     | —        | —     | 1 |

- Infantry wants to be adjacent (3 → 1 dice falloff); armor rolls a flat 3 dice out to
  range 3; artillery reaches range 6 and ignores line of sight and terrain protection.
- Terrain modifiers subtract dice from the attacker's roll (e.g. firing into a forest:
  −1 die for infantry, −2 for armor). Reductions never stack; only the single largest
  applicable reduction counts. (Artillery ignores these reductions entirely.)
- Certain tactic cards add dice (Close Assault, Firefight, Armor Assault in close
  assault, Their Finest Hour: +1 die each).

## Resolution Order Within One Battle

1. Roll the modified number of dice.
2. Score **hits** (matching symbols + grenades; stars only where a card says so).
   Remove 1 figure per hit. Eliminating the last figure scores a medal.
3. Then resolve **flags**: for each flag, the target must retreat 1 hex toward its own
   edge. Terrain never speeds or slows a retreat, but the path may not cross occupied
   hexes, impassable terrain, or the board edge/sea. **Each retreat hex that cannot be
   completed costs 1 figure** — cornered units bleed.
4. Terrain/obstacle protection may let the defender ignore the first flag of a battle
   (sandbags, hedgehogs for infantry, own bunkers); Air Power and Barrage overrule all
   flag-ignoring protection.
5. If the attacker was infantry or armor in close assault and the hex is now empty, it
   may take ground; armor may additionally conduct one overrun combat.

## Computed Probabilities (base faces, no terrain)

Per attack, P = at least one hit; E = expected hits.

### Full 3-dice roll (close assault / armor at any range / artillery at range 1-2)

| Target    | P(≥1 hit) | E(hits) | P(≥2 hits) | P(3 hits) |
|-----------|----------:|--------:|-----------:|----------:|
| Infantry  | 1 − (1/2)³ = **87.5%**  | 1.50 | 50.0% | 12.5% |
| Armor     | 1 − (2/3)³ = **70.4%**  | 1.00 | 25.9% | 3.7% |
| Artillery | 1 − (5/6)³ = **42.1%**  | 0.50 | 7.4%  | 0.46% |

One-shot kill chances with 3 dice (need hits ≥ figures):
- Full 4-figure infantry: **impossible** with 3 dice (max 3 hits) — it takes at least
  two attacks (or extra dice from cards) to wipe a fresh infantry unit.
- Full 3-figure armor: (1/3)³ = **3.7%**.
- Full 2-figure artillery: C(3,2)·(1/6)²·(5/6) + (1/6)³ = **7.4%**.

### Terrain-reduced rolls (common cases)

| Dice | vs Infantry P(≥1 hit) | vs Armor P(≥1 hit) | vs Artillery P(≥1 hit) |
|-----:|----------------------:|-------------------:|-----------------------:|
| 3    | 87.5% | 70.4% | 42.1% |
| 2    | 75.0% | 55.6% | 30.6% |
| 1    | 50.0% | 33.3% | 16.7% |

Expected hits per roll: `dice × per-die chance` (e.g. 2 dice vs armor: 0.667).

### Flags (retreat pressure)

- P(at least one flag) with n dice = 1 − (5/6)ⁿ:
  - 3 dice: **42.1%**
  - 2 dice: **30.6%**
  - 1 die: **16.7%**
- A unit that cannot complete a retreat loses 1 figure per unfinished hex, so flags
  function as extra damage against units pinned against board edges, oceans, friendly
  units, or impassable terrain.

## Design Notes for memory44

- One die face distribution (2/1/1/1/1) keeps combat to a single roll with no
  to-hit/damage split — fast to resolve and server-friendly.
- Infantry dominance at close range (3 dice at 50% per die) plus the move-2-no-battle
  rule creates the central tempo decision: approach slowly and fight, or dash and be
  defenseless for a turn.
- Artillery's invulnerability to terrain reduction and LOS makes it a positional
  counter to dug-in defenders; its 16.7% per-die fragility-tax on being hit keeps it
  rare and valuable (only 2 figures).
- The flag system doubles as a positioning mechanic (pushing enemies off objectives or
  into kill pockets), not just damage variance.
