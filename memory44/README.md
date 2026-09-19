# Signal & Steel

Signal & Steel is an original two-player, turn-based hex tactics prototype. The
repository folder is named `memory44`, but that name is not used as the game's
public identity.

The current vertical slice is a command-card hex battle:

- 13×9 board, three sections, researched unit/dice/terrain tables;
- a 60-card command deck with original names and text;
- Pegasus Bridge as the first playable scenario;
- pass-and-play on one screen, or a server-authoritative room for two browsers;
- a DOM-free engine shared by browser and server, with server-side dice;
- iPad and desktop show the full board; a phone pans and pinches.

## Run it

Requires the Node version in `.nvmrc`. There are currently no third-party
runtime dependencies.

```sh
npm run dev
```

Open `http://localhost:4173`. To test room play, open the address in a second
browser or device that can reach the development machine, create a room in one,
and join its code in the other. The server prints a same-network address when it
starts; both players can open that address when they are on the same Wi-Fi.

For players on different networks, run this same Node process on any small host
that provides a public HTTPS address and share that address. Only one running
process is needed. Because the state is in memory, the host must not spread one
match across multiple instances.

```sh
npm test
npm run check
```

## Prototype limits

- Rooms live only in server memory and disappear when it restarts.
- There are no accounts, matchmaking, spectators, persistence, or reconnect
  credentials yet.
- GitHub Pages can host pass-and-play mode, but online rooms require the Node
  server or a future hosted equivalent.
- Fifteen further base scenarios and more Imagine art are still landing.

Read [the research notes](research/README.md),
[the product brief](docs/product-brief.md),
[the architecture](docs/architecture.md), and
[the content boundaries](docs/content-boundaries.md) before expanding the game.

## Independence notice

Signal & Steel is an independent original project. It is not affiliated with,
endorsed by, or licensed by Days of Wonder, Asmodee, Richard Borg, or any other
board-game publisher or designer.
