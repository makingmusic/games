# Architecture

## Shape

```text
browser UI  ── action intent ──> authoritative host
    │                                │
    └──── rendered state <───────────┘

authoritative host = local browser in pass-and-play mode
                   = Node room server in online mode
```

`src/game.js` is the shared rules boundary. It contains serialisable state,
legal-action discovery, and action validation, and has no DOM or server imports.
Both local mode and the server call the same `applyAction` function.

`server.mjs` serves the client and exposes a deliberately small API:

- `POST /api/rooms` creates a room and assigns the Ochre seat.
- `POST /api/rooms/:code/join` assigns the Teal seat.
- `GET /api/rooms/:code/events?token=...` streams state with server-sent events.
- `POST /api/rooms/:code/actions` validates a seat token and applies one action.

The server accepts action intent only. It never accepts replacement state from
a client. Rooms are memory-only and expire after inactivity, which is suitable
for the prototype but not production.

## Next production boundary

Before public internet deployment:

- place the room process behind HTTPS;
- use a durable room host so exactly one process owns each match;
- rate-limit room creation and invalid actions;
- replace bearer tokens in query strings with reconnectable, short-lived seat
  credentials transported safely;
- add schema validation, telemetry without personal data, and load tests; and
- version the action protocol for forwards-compatible clients.
