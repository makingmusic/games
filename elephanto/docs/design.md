# Elephanto — Design Notes

This file records all game inputs, one by one, exactly as given. New inputs get appended here as they arrive.

## Inputs so far (batch 1)

### Characters
- **Coffee Man** — a bad guy.
- **Tea Girl** — a bad guy.
- **Uncle Pete** — a character (role TBD).
- **Tuado** — a cat. Tuado is a good guy, but he accidentally knocks the player with lava.
- **The Player** — a good guy, controlled by the person playing.

### Setting: the Evil Base
- The game takes place in an **evil base**.
- The base has **bad guys** and a **gym** where you can train your muscles.
- The base's color, sheen, and texture are **metal**.
- If you go **outside the base**, your walking speed becomes **slow**.

### The Arena
- There is an **arena** inside the evil base where all fighting takes place.
- Fighting happens **only inside the arena** — nowhere else.
- The arena is **only the size of one room** — it does not fill the whole base. The base is much bigger than the arena.
- Players can **exit the arena to regain health**, then come back and continue fighting.

### Combat / Health rules
- Coffee Man and Tea Girl are the bad guys.
- The bad guys fight with **staffs** in their hands (batch 5). The staff is **yellow-colored** (batch 6).
- They each have **three lives**.
- If one of them gets downed, the **other loses the same percent of health**.

### Platform
- Must be playable on **iPad and iPhone** (touch controls).
- Must work on **touchscreen** (batch 2 — explicit confirmation).

### Weapon system (batch 7)
- Good guys and bad guys fight each other with weapons carried in their hands — or even with their **fists**.
- The weapon system is **very simple**:
  - Weapons can be **grabbed off the ground** while walking over/near them.
  - Weapons can also be **selected from the weapon stash**, which is **near the arena** where fights happen.
- There is **no concept of hunger or energy** in this game.
- There is **no concept of rescuing** — the player just has to **survive on their own** (batch 8).

### Perspective
- The game is **first-person** (batch 3).

### Roles (batch 4)
There will be two roles:
1. **The Kids**
2. **The Protector**
   - Has a **bat** to whack people.
   - Has a **medkit** to recover other people and itself.
- If a player dies, they **respawn almost immediately**.

## Final decisions (from Q&A)
- **Player role**: chosen at game start — Kid or Protector.
- **Uncle Pete**: a good guy who helps you fight; he also gives **Uncle Pete quests**.
- **Win condition**: defeat both bad guys (take all 3 lives from Coffee Man and Tea Girl).
- **Art**: user wants AI-generated character images; placeholder/procedural art will be used until final art is provided.

## Remaining notes
- Inputs are complete; ready to build.
- Tech: static HTML/JS/CSS game (matching the other games in this repo), first-person, touch controls for iPad/iPhone.
