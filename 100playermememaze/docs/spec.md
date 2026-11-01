# 100-Player Meme Maze — Game Spec

**Status:** ✅ Instructions complete — build prompt written (`docs/leprompt.md`), game built. This file stays as the record of the director's original instructions.

**Audience:** An 8 year old.

## Raw instructions (verbatim, in order received)

> In 100-player Meme Maze I want to make it first person but it has to be 3D. In 100-player Meme Maze it's a maze but the hard part is there's a giant 3D cat which is holding its nuts, standing on two paws, and making its surprised expression. Its surprise expression is like opening its mouth wide open. And there are going to be some obstacles, like lava, and you could get some planks which you can use to build a way to go over the lava. There are going to be lasers and there's going to be a hidden button somewhere. Press it to turn off the lasers and then you could do it.
>
> The giant cat is like, the maze walls are super high and it's higher than the player. It's like 10 inches higher than the player so the player cannot see. The cat is that high. The cat, if you touch it, you get killed and you restart. Very, at the very very big name. *(Correction: "very very big name" → "at the very big meme.")*
>
> The cat walks around and hunts you. At the end of the maze there's going to be this massive trophy, even higher than the maze, and you earn it. The 100-player part means that there are many people. It's like multiplayer, where over 100 players could play at the same time and work with each other.
>
> If the friend touches the cat, only the friend restarts. The remaining 99 players are all NPCs. I win the game only when the player grabs the trophy, and once they have grabbed the trophy they can always go back and start playing the game again to win the trophy again.
>
> The walls are like cheese, stone, bricks, grass. They could be anything like those. If the player who is playing the game touches the lava or laser, they die and they have to start the game again. The cat remains quiet and does not make sounds. The 100 players help the player to build bridges across the lava.
>
> The player can see the outline of the people through the walls and their skin is a beacon (from Roblox). The zones can be mixed up like a crazy sandwich. The helpers tell you what it is but they don't tell you to press it.
>
> No other bg music is playing.
>
> Yes, the cat also hunts the helpers. And when the helpers die, they go back and respawn at the beginning. The player can also respawn — as many times. The planks are lying on the ground. When I reach the lava then the helpers build the bridge to help me. No timer, no score. You could play it with an iPad or with a keyboard. When the player dies it makes a sound like pum pum pum.
>
> When the player wins, it makes a sound like oh ma ga.

## Structured spec so far

### Camera & world
- First-person perspective, full 3D.
- The level is a maze.
- **Maze walls are super high** — taller than the player (kid-scale: about 10 inches above the player's head). The player cannot see over the walls.
- **Wall materials: cheese, stone, bricks, grass... "anything like those."** Fun, varied materials.
- **Materials are MIXED UP like a crazy sandwich** 🥪 — not separate zones, a jumble of different wall types everywhere.

### The Giant Cat (the hard part)
- A giant 3D cat lives in the maze.
- Posed standing upright on two paws.
- Holding its nuts.
- Surprised expression: mouth wide open.
- **Height: as tall as the walls** — its head towers above the maze, so you can see the cat over the walls even though you can't see anything else.
- **Touching the cat = killed, restart** (from the beginning of the maze).
- **The giant cat IS "the very big meme"** — it's the meme centerpiece of the whole game.
- **Behavior: walks around the maze and hunts you.** It roams, it finds you, it comes for you. Run and hide!
- **It hunts the helpers too!** The cat doesn't just chase YOU — it chases the NPC crew as well.
- **Silent:** the cat makes NO sounds. Quiet cat. Extra sneaky. 🤫

### Obstacles & items
- **Lava** — hazard on the maze floor; crossing it requires building. **Touching lava = death, restart the game.**
- **Planks** — collectible item, **lying on the ground** around the maze. Used to build a path/bridge over lava.
- **Bridge building is AUTOMATIC:** when the player reaches the lava, the helpers come and build the bridge for you. 🔨
- **Lasers** — hazard, active by default. **Touching a laser = death, restart the game.**
- **Hidden button** — hidden somewhere in the maze. Pressing it turns off the lasers, "and then you could do it" (presumably: the way to win becomes possible).
  - **NPC helpers tell you WHAT it is** — they explain the button — **but they never tell you to press it.** Figuring out to press it is YOUR job. 🕵️

### Players (the "100-player" part)
- **100 players total in the maze: 1 real player (YOU) + 99 NPC players.**
- The 99 NPCs are computer players — no online server needed, it's a single-player game that FEELS like a big multiplayer match.
- Everyone works together, co-op style.
- **Individual restarts:** if a player touches the cat, only THAT player restarts. Everyone else keeps playing.
- **Death & respawn:** dead helpers respawn at the beginning. The player respawns too — **as many times as needed (unlimited).** Nobody is ever out for good.
- **The 99 NPCs help the player build bridges across the lava.** They're your bridge-building crew! 🔨
- **Beacon outlines (like Roblox):** you can SEE the other players THROUGH the walls — their glowing outlines/skin shine through like beacons, so you always know where your crew is.

### Audio
- **The cat is completely silent** — no sounds at all. 🤫
- **No background music.** The game is quiet.
- **Player death sound: "pum pum pum."** 💀🔊
- **Win sound: "oh ma ga"** (a surprised "OH MA GA!" — matches the surprised meme cat). 🏆🔊

### Rules
- **No timer, no score.** Just play, explore, survive, win.
- **Unlimited respawns** — everyone respawns at the beginning, as many times as it takes.

### Controls
- Playable two ways: **iPad (touch controls)** or **keyboard** on a computer.

### Win condition
- **At the end of the maze: a MASSIVE trophy** — even taller than the maze itself, so you can see it towering above the walls from far away (like a beacon showing where the goal is).
- **YOU win when YOU (the real player) grab the trophy.**
- **Replayable forever:** after winning, you can always start a new round and go win the trophy again.

## Open questions (awaiting more instructions)

1. What do the player and the helpers look like — Roblox-style blocky people?
2. What kind of nuts is the cat holding — little round acorns or chestnuts? 🌰
3. Anything extra — a title screen, picking your color, a win dance?
