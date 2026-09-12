# Elephanto — Asset Generation Prompt File

Give this whole file to an asset-generation agent (or copy one prompt block at a time into an image model such as DALL·E, Grok Imagine, or Kimi image gen).

## How to use

1. Generate each asset below using its **ready-to-copy prompt**.
2. Save the result with the exact **filename** listed into `elephanto/assets/`.
3. Tell the coding agent "the real assets are in `elephanto/assets/`" — the game's sprites live in `elephanto/src/sprites.js` (currently procedural placeholders on 96×96 canvases) and can be rewired to load these PNGs with a procedural fallback.

## Global style guide (apply to EVERY asset)

- **Style**: flat 2D cartoon game sprite, bold clean shapes, thick dark outlines, bright saturated colors, kid-friendly, slight video-game charm. No realism, no gradients except where specified, no text except where specified.
- **Format**: PNG with **transparent background** (alpha channel). No background scenery, no shadow on the ground.
- **Render size**: generate at **512×512 px** (or 1024×1024 if the model supports it); the game downscales to **96×96 px** sprites, so keep shapes big and simple — fine detail will be lost.
- **Framing**: the character/object must fill ~85% of the canvas, centered, with a small transparent margin on all sides.
- **Orientation**: characters face **straight forward, full body, standing** (they are billboards in a first-person raycaster — always seen head-on).
- **Consistency**: all characters must look like they belong to the same cartoon universe.

---

## Asset list

### 1. `coffee-man.png` — BAD GUY BOSS
- Theme colors: coffee brown robe `#6b4423`, dark brown belt `#503014`, tan skin `#a9744f`, cream cup-hat `#f0e6d2`, **yellow staff `#ffd23a`**.
```
Flat 2D cartoon game sprite, full body, front-facing, transparent background.
A grumpy cartoon villain called Coffee Man: a stout man in a coffee-brown robe
with a dark brown belt, wearing a white coffee cup as a hat with a handle and a
wisp of steam. Angry eyebrows, frowning face, tan skin. He holds a tall bright
YELLOW wooden staff with a round knob on top in one hand, planted on the ground.
Bold outlines, bright flat colors, kid-friendly video game style. The character
fills most of the frame, centered, standing straight.
```

### 2. `tea-girl.png` — BAD GUY BOSS
- Theme colors: tea-green dress `#3f8f4f`, darker green hair `#2e6b3a`, skin `#f2c9a0`, **yellow staff `#ffd23a`**, yellow bun pin.
```
Flat 2D cartoon game sprite, full body, front-facing, transparent background.
A smug cartoon villainess called Tea Girl: a girl in a triangular tea-green
dress, with dark green hair tied in a bun held by a small yellow pin. Angry
eyebrows but a smug smile, light skin. She holds a tall bright YELLOW wooden
staff with a round knob on top in one hand, planted on the ground. Bold
outlines, bright flat colors, kid-friendly video game style. Centered, standing
straight, fills most of the frame.
```

### 3. `uncle-pete.png` — GOOD GUY ALLY (gives quests)
- Theme colors: blue overalls `#3a6ea5`, dark blue straps `#2b5580`, white beard `#f4f4f4`, red cap `#c0392b`, skin `#f2c9a0`.
```
Flat 2D cartoon game sprite, full body, front-facing, transparent background.
A friendly chubby old man called Uncle Pete: big blue overalls with dark blue
straps, a round belly, a fluffy white beard, a kind smiling face, and a bright
red baseball cap. Light skin, gentle eyes, pink nose. He looks helpful and
warm, like a friendly grandpa mechanic. Bold outlines, bright flat colors,
kid-friendly video game style. Centered, standing straight, fills most of the frame.
```

### 4. `tuado.png` — GOOD GUY CAT (clumsy, throws lava by accident)
- Theme colors: orange body `#e8912d` / `#f2a541`, pink nose `#d97b8c`, white whiskers.
```
Flat 2D cartoon game sprite, front-facing, transparent background.
A cute chubby orange cartoon cat called Tuado: round body, big innocent eyes,
pointy ears, curly tail, tiny pink triangle nose, thin white whiskers. He looks
sweet but slightly nervous/clumsy, as if he is about to drop something. Bold
outlines, bright flat colors, kid-friendly video game style. Centered, fills
most of the frame.
```

### 5. `minion.png` — BAD GUY MINION
- Theme colors: dark gray robe `#3a3f4a`, hood `#2c3038`, shadowed face `#23262d`, glowing red eyes `#e74c3c`.
```
Flat 2D cartoon game sprite, full body, front-facing, transparent background.
A spooky cartoon henchman: a small figure in a dark gray hooded robe, face
completely hidden in shadow inside the hood, with two glowing red eyes. Slightly
hunched, mischievous but still kid-friendly, not scary-realistic. Bold outlines,
flat colors, video game style. Centered, fills most of the frame.
```

### 6. `bat.png` — WEAPON (Protector's bat)
- Theme colors: wood brown `#8a5a2b`, dark grip `#5e3a17`.
```
Flat 2D cartoon game sprite, transparent background.
A classic wooden baseball bat, drawn diagonally (handle bottom-right, barrel
top-left), warm brown wood with a darker taped grip. Bold outline, flat colors,
kid-friendly video game style. The bat fills most of the frame diagonally.
```

### 7. `pipe.png` — WEAPON (metal pipe)
- Theme colors: steel gray `#9aa2ad`, shiny highlight `#c9d1da`.
```
Flat 2D cartoon game sprite, transparent background.
A cartoon steel pipe weapon, drawn diagonally (bottom-right to top-left),
metallic gray with a lighter shiny band at one end. Bold outline, flat colors,
kid-friendly video game style. Fills most of the frame diagonally.
```

### 8. `staff-yellow.png` — WEAPON (bad guys' staff, also a pickup)
- Theme color: yellow `#ffd23a` with lighter knob `#ffe680`.
```
Flat 2D cartoon game sprite, transparent background.
A tall bright yellow wooden staff with a round pale-yellow knob on top, drawn
vertically, slight diagonal tilt allowed. Bold outline, flat colors,
kid-friendly video game style. Fills most of the frame.
```

### 9. `crate-stash.png` — WEAPON STASH (near the arena)
- Theme colors: wood `#8a6a3a`, dark trim `#5e4520`, text color `#ffe9a8`.
```
Flat 2D cartoon game sprite, front view, transparent background.
A wooden supply crate with dark cross planks on the front, with a baseball bat
and a metal pipe sticking out of the top. The word "STASH" written in bold
yellow letters on the front. Bold outlines, flat colors, kid-friendly video
game style. Centered, fills most of the frame.
```

### 10. `gym-bench.png` — GYM TRAINING BENCH
- Theme colors: gray pad `#6a7078`, dark legs `#4a4f55`, steel bar `#c9d1da`, dark plates `#3a3f4a`.
```
Flat 2D cartoon game sprite, front-side view, transparent background.
A cartoon gym bench-press station: a gray padded bench with dark legs and a
steel barbell racked above it with big round dark weight plates on both ends.
Bold outlines, flat colors, kid-friendly video game style. Centered, fills
most of the frame.
```

### 11. `lava-blob.png` — TUADO'S LAVA PROJECTILE
- Theme colors: core `#ff6b1a`, mid `#ff9f1c`, hot center `#fff3b0`.
```
Flat 2D cartoon game sprite, transparent background.
A single round glowing blob of cartoon lava: bright orange with a pale
yellow-hot center and a soft glowing rim, a few tiny drips. Simple, bold,
kid-friendly video game style. Centered, circular, fills most of the frame.
```

### 12. `lava-splash.png` — LAVA IMPACT SPLASH
- Theme colors: orange `#ff9f1c`, yellow `#ffd23a`.
```
Flat 2D cartoon game sprite, transparent background.
A cartoon lava splash ring: an orange circular splat seen from the front with
droplets flying outward, bright yellow-orange highlights. Simple, bold,
kid-friendly video game style. Centered, fills most of the frame.
```

---

## Optional extras (nice-to-have)

- `logo.png` — 1024×512, transparent, the word "ELEPHANTO" in chunky playful cartoon lettering, metallic gray letters with orange lava accents. Used on the start screen.
- `wall-metal.png` — 256×256 **seamless tileable** brushed-metal wall texture, gray `#8a939e` base with subtle vertical sheen stripes, to retexture the raycast walls.
- `icon-180.png` — 180×180 Apple touch icon (Tuado's face or the logo on metal background), for the iPad/iPhone home-screen bookmark.

## Notes for the coding agent

- Sprite keys in `src/sprites.js`: `coffeeMan`, `teaGirl`, `pete`, `tuado`, `minion`, `bat`, `pipe`, `staff`, `crate`, `bench`, `lava`, `splash`.
- Mapping: `coffee-man.png→coffeeMan`, `tea-girl.png→teaGirl`, `uncle-pete.png→pete`, `tuado.png→tuado`, `minion.png→minion`, `bat.png→bat`, `pipe.png→pipe`, `staff-yellow.png→staff`, `crate-stash.png→crate`, `gym-bench.png→bench`, `lava-blob.png→lava`, `lava-splash.png→splash`.
- **Loader: implemented** in `src/sprites.js` (`loadSpritePNGs`, called by `initSprites`). Behaviour:
  - All sprites start as procedural 96×96 placeholder art; the game starts immediately.
  - Each mapped PNG is loaded async from `assets/<file>.png` via plain same-origin `new Image()`; on load it replaces the placeholder on that sprite's canvas (the raycaster draws from the canvases every frame, so the swap appears automatically).
  - Before drawing, the PNG is **alpha-trimmed** (transparent-margin bounding box) and re-drawn **contain-fit, centered**, so every billboard gets consistent scale/centring regardless of how the model framed it.
  - A light color-sync pass is applied via `ctx.filter = 'saturate(1.05) contrast(1.05)'` where supported (feature-detected, skipped otherwise).
  - If a file is missing or fails to load (404, file:// restrictions, tainted canvas), the error is swallowed and the procedural art stays — the game works identically with zero PNGs present.

