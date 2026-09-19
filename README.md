# games

A workspace for small games. Each game lives in its own subfolder.

```
games/
  <game-name>/
    docs/       # specs and coding-agent prompts
```

## Games

- **99nights** — "99 Nights": a forest rescue survival game. Original spec in `99nights/docs/original_specs.md`, build prompt in `99nights/docs/leprompt.md`.
- **escapethecatinsidetheforest** — "Escape the Cat Inside the Forest": shoo the Cat with a flashlight, free 4 kids, survive 85 nights. Spec in `escapethecatinsidetheforest/docs/`, build prompt in `escapethecatinsidetheforest/leprompt.md`.
- **elephanto** — "Elephanto": a first-person arena brawler in the evil metal base. Design notes in `elephanto/docs/`.
- **memory44** — "Signal & Steel": an original two-player hex tactics game with pass-and-play and temporary online rooms. Product notes are in `memory44/docs/`. **Work in progress — not published.**

## Play online

Published to GitHub Pages from `main`. The landing page is the inventory:
it lists every published game with the date it was last published.

- Landing page: https://makingmusic.github.io/games/
- 99 Nights: https://makingmusic.github.io/games/99nights/
- Escape the Cat Inside the Forest: https://makingmusic.github.io/games/escapethecatinsidetheforest/
- Elephanto: https://makingmusic.github.io/games/elephanto/

Only games with a card on the landing page (`index.html`) are put on the
site; everything else in the repo stays unpublished. See
[HOSTING.md](HOSTING.md) for how to publish a new game.

## Publishing

See [HOSTING.md](HOSTING.md) — GitHub Pages, Cloudflare Pages, and app
stores, same process for every game.
