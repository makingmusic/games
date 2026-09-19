# Signal & Steel project rules

- `memory44` is the name of this game
- Keep the core rules in `src/game.js` deterministic and independent of the DOM so the server can validate every action.
- Treat the server as authoritative for network matches. Never trust a client-supplied game state or player side.
- Maintain a dependency-free Node/browser baseline unless a dependency materially improves the product. Any dependency must be project-local and pinned to an exact version.
- Run `npm run check` before handing off changes.
- Write human-facing dates as `DD Month` or `DD Month YYYY`. ISO dates are permitted only where a machine-readable convention requires them.
