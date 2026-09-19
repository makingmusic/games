# memory44 — Command Card Inventory (Research Notes)

Complete base-game command card deck for the WWII hex-and-card game memory44 is
inspired by. Counts verified against multiple published sources; all functional
descriptions are original paraphrases — no printed card text is reproduced.

## Deck Totals

- **60 command cards** total in the base game:
  - **40 Section cards** (order units in specific board sections)
  - **20 Tactic cards** (special actions / attack enhancements, any section)
- The full game box actually contains 70 cards: the 60 command cards plus 10
  reference/summary cards that are not part of the deck.

## Section Cards (40)

Four per-section card families, plus three multi-section card types:

| Card family   | Orders issued                          | Left flank | Center | Right flank | Total |
|---------------|----------------------------------------|-----------:|-------:|------------:|------:|
| Assault       | **All** units in the named section     | 2          | 2      | 2           | 6     |
| Probe         | 2 units in the named section           | 4          | 5      | 4           | 13    |
| Attack        | 3 units in the named section           | 3          | 4      | 3           | 10    |
| Recon 1       | 1 unit in the named section; at the end of the turn draw 2 command cards and keep 1 | 2 | 2 | 2 | 6 |
| **Subtotal**  |                                        | **11**     | **13** | **11**      | **35** |

Multi-section cards (5):

| Card            | Count | Function |
|-----------------|------:|----------|
| General Advance | 1     | Order 2 units in each of the three sections (up to 6 units total). |
| Pincer Move     | 1     | Order 1 unit on the left flank and 1 unit on the right flank. |
| Recon in Force  | 3     | Order 1 unit in each of the three sections (3 units total). |

Section card total: 35 + 5 = **40**.

Design-relevant note: the center section deliberately has more cards (13 vs 11 per
flank) — the extra weight comes from Probe (5 in center, 4 per flank) and Attack
(4 in center, 3 per flank). Card counting matters competitively: playing a card
removes it from the shared deck for both sides.

## Tactic Cards (20 cards, 15 types)

| Card                | Count | Functional description (original wording) |
|---------------------|------:|--------------------------------------------|
| Air Power           | 1     | Calls an air strike on a cluster of up to 4 contiguous enemy-occupied hexes; the two sides roll different numbers of dice per target (the historically air-dominant side rolls 2, the other 1); terrain gives no protection, and unit symbols, grenades, **and stars** all score hits; flags force retreats that cannot be ignored. |
| Ambush              | 1     | Reaction card played when the opponent declares a close assault against your unit: your unit attacks first at full strength, and the enemy attack happens only if it survives and stays in place; you draw a replacement card at the end of that turn. |
| Armor Assault       | 2     | Order up to 4 armor units; any of them fighting in close assault rolls 1 extra die (fallback: if you have no armor, order any 1 unit). |
| Artillery Bombard   | 1     | Order all your artillery units; each may either move up to 3 hexes (without battling) or stay put and fire twice (fallback: if you have no artillery, order any 1 unit). |
| Barrage             | 1     | A long-range strike on any 1 enemy unit regardless of range or line of sight: roll 4 dice ignoring terrain, hitting only on the unit's own symbol or a grenade; flags force retreats that cannot be ignored. |
| Behind Enemy Lines  | 1     | Order 1 infantry unit; it may move up to 3 hexes, battle, then move up to 3 hexes again, ignoring terrain movement restrictions (terrain battle effects still apply) (fallback: if you have no infantry, order any 1 unit). |
| Close Assault       | 1     | Order every infantry and/or armor unit of yours that is already adjacent to an enemy; those units battle with 1 extra die but may not move first (infantry may still take ground, armor may still overrun). |
| Counter-Attack      | 2     | Replay the command card your opponent just played; left-flank and right-flank cards mirror to the opposite flank for you, while an Infantry Assault is countered in the same section your opponent used. |
| Dig-In              | 1     | Order up to 4 infantry units to entrench: place a sandbag fortification marker on each of their hexes (fallback: if you have no infantry, order any 1 unit). |
| Direct from HQ      | 2     | Order any 4 units of your choice anywhere on the battlefield. |
| Firefight           | 1     | Order up to 4 units that are not adjacent to any enemy; they may not move but each battles with 1 extra die. |
| Infantry Assault    | 2     | Order all infantry units in one section; each may move up to 3 hexes (no battle) or 2 hexes and still battle (fallback: if you have no infantry, order any 1 unit). |
| Medics & Mechanics  | 1     | Order 1 damaged unit and roll 1 die per command card in your hand (including this card); each die showing the unit's symbol or a star restores 1 lost figure (never above its starting strength), and if at least 1 figure is restored the unit may also move and battle normally. |
| Move Out!           | 2     | Order up to 4 infantry units, which move and battle under the normal rules (fallback: if you have no infantry, order any 1 unit). |
| Their Finest Hour   | 1     | Roll 1 die per command card in your hand (including this card); each rolled unit symbol orders one matching unit, each star orders any 1 unit, and all ordered units battle with 1 extra die; afterwards reshuffle the discard pile back into the deck. |

Tactic card total: 10 single-copy cards + 5 double-copy cards = **20**.

## Rules Interactions Worth Modeling

- Maximum 1 card played per turn, except Ambush (played on the opponent's turn).
- Section cards on boundary-straddling hexes may be used from either adjacent section.
- Air Power and Barrage are the only base-game effects where flags cannot be ignored
  by terrain/obstacle protection.
- In the base game the star symbol is a miss **except** on Air Power, Their Finest
  Hour, and Medics & Mechanics (where stars have positive effects).
- An empty deck is not an issue in practice because Their Finest Hour reshuffles the
  discards; scenario special rules can further modify cards (out of base scope).
