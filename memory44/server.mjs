import { randomInt, randomUUID } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import { GameRuleError, applyAction, createGame, viewFor } from "./src/game.js";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number.parseInt(process.env.PORT ?? "4173", 10);
const HOST = process.env.HOST ?? "0.0.0.0";
const ROOM_LIFETIME_MS = 6 * 60 * 60 * 1000;
const rooms = new Map();

const MIME_TYPES = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
});

const CODE_WORDS = Object.freeze([
  "EMBER", "FALCON", "MAPLE", "RADIO", "RIVER", "STEEL", "THUNDER", "VALLEY",
]);

function sendJson(response, status, value) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(value));
}

function makeRoomCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const word = CODE_WORDS[randomInt(CODE_WORDS.length)];
    const code = `${word}-${randomInt(100, 1000)}`;
    if (!rooms.has(code)) return code;
  }
  return randomUUID().slice(0, 8).toUpperCase();
}

function publicRoom(room, side) {
  return {
    code: room.code,
    scenarioId: room.state.scenarioId,
    connectedSides: [...room.players.values()],
    state: side ? viewFor(room.state, side) : viewFor(room.state, room.state.activeSide),
  };
}

function broadcast(room) {
  for (const stream of room.streams) {
    const payload = `event: state\ndata: ${JSON.stringify(publicRoom(room, stream.side))}\n\n`;
    stream.response.write(payload);
  }
}

function fillRandomness(room, side, action) {
  const cleaned = { ...action };
  delete cleaned.rolls;
  delete cleaned.reshuffleOrder;
  let attempt = cleaned;
  for (let n = 0; n < 4; n += 1) {
    try {
      return applyAction(room.state, attempt, side);
    } catch (error) {
      if (error instanceof GameRuleError && error.code === "ROLLS_REQUIRED") {
        attempt = {
          ...attempt,
          rolls: Array.from({ length: error.rollsNeeded }, () => randomInt(1, 7)),
        };
        continue;
      }
      if (error instanceof GameRuleError && error.code === "RESHUFFLE_REQUIRED") {
        const pile = [...room.state.deck, ...room.state.discard];
        for (let i = pile.length - 1; i > 0; i -= 1) {
          const j = randomInt(i + 1);
          [pile[i], pile[j]] = [pile[j], pile[i]];
        }
        attempt = { ...attempt, reshuffleOrder: pile };
        continue;
      }
      throw error;
    }
  }
  throw new GameRuleError("The server could not attach dice to that action.", "ROLLS_REQUIRED");
}

function findSeat(room, token) {
  return room.players.get(token) ?? null;
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 16_384) throw new GameRuleError("Request is too large.", "REQUEST_TOO_LARGE");
  }
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    throw new GameRuleError("Request body must be valid JSON.", "INVALID_JSON");
  }
}

function requireRoom(code) {
  const room = rooms.get(code);
  if (!room) throw new GameRuleError("That room does not exist or has expired.", "ROOM_NOT_FOUND");
  room.lastTouched = Date.now();
  return room;
}

function serveEvents(request, response, room, token) {
  const side = findSeat(room, token);
  if (!side) throw new GameRuleError("That seat is not valid for this room.", "INVALID_SEAT");

  response.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
  });
  const stream = { response, side };
  response.write(`event: state\ndata: ${JSON.stringify(publicRoom(room, side))}\n\n`);
  room.streams.add(stream);

  const keepAlive = setInterval(() => response.write(": keepalive\n\n"), 20_000);
  request.on("close", () => {
    clearInterval(keepAlive);
    room.streams.delete(stream);
  });
}

function safeStaticPath(pathname) {
  const requested = pathname === "/" ? "index.html" : decodeURIComponent(pathname).slice(1);
  const candidate = normalize(join(ROOT, requested));
  return candidate.startsWith(ROOT) ? candidate : null;
}

function serveStatic(pathname, response) {
  const filePath = safeStaticPath(pathname);
  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    sendJson(response, 404, { error: "Not found." });
    return;
  }

  response.writeHead(200, {
    "content-type": MIME_TYPES[extname(filePath)] ?? "application/octet-stream",
    "cache-control": filePath.endsWith("index.html") ? "no-cache" : "public, max-age=60",
  });
  createReadStream(filePath).pipe(response);
}

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { ok: true, rooms: rooms.size });
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/rooms") {
    const body = await readJson(request).catch(() => ({}));
    const code = makeRoomCode();
    const token = randomUUID();
    const room = {
      code,
      state: createGame(body.scenarioId ?? "pegasus-bridge"),
      players: new Map([[token, "ochre"]]),
      streams: new Set(),
      lastTouched: Date.now(),
    };
    rooms.set(code, room);
    sendJson(response, 201, { ...publicRoom(room, "ochre"), token, side: "ochre" });
    return true;
  }

  const joinMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9-]+)\/join$/);
  if (request.method === "POST" && joinMatch) {
    const room = requireRoom(joinMatch[1]);
    if ([...room.players.values()].includes("teal")) {
      throw new GameRuleError("That room already has two players.", "ROOM_FULL");
    }
    const token = randomUUID();
    room.players.set(token, "teal");
    broadcast(room);
    sendJson(response, 200, { ...publicRoom(room, "teal"), token, side: "teal" });
    return true;
  }

  const eventMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9-]+)\/events$/);
  if (request.method === "GET" && eventMatch) {
    const room = requireRoom(eventMatch[1]);
    serveEvents(request, response, room, url.searchParams.get("token"));
    return true;
  }

  const actionMatch = url.pathname.match(/^\/api\/rooms\/([A-Z0-9-]+)\/actions$/);
  if (request.method === "POST" && actionMatch) {
    const room = requireRoom(actionMatch[1]);
    const body = await readJson(request);
    const side = findSeat(room, body.token);
    if (!side) throw new GameRuleError("That seat is not valid for this room.", "INVALID_SEAT");

    const action = body.action ?? {};
    room.state = fillRandomness(room, side, action);
    broadcast(room);
    sendJson(response, 200, publicRoom(room, side));
    return true;
  }

  return false;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      const handled = await handleApi(request, response, url);
      if (!handled) sendJson(response, 404, { error: "Unknown API route." });
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      sendJson(response, 405, { error: "Method not allowed." });
      return;
    }
    serveStatic(url.pathname, response);
  } catch (error) {
    const expected = error instanceof GameRuleError;
    sendJson(response, expected ? 400 : 500, {
      error: expected ? error.message : "The room server hit an unexpected error.",
      code: expected ? error.code : "SERVER_ERROR",
    });
    if (!expected) console.error(error);
  }
});

const cleanup = setInterval(() => {
  const cutoff = Date.now() - ROOM_LIFETIME_MS;
  for (const [code, room] of rooms) {
    if (room.lastTouched < cutoff) {
      for (const stream of room.streams) stream.end();
      rooms.delete(code);
    }
  }
}, 15 * 60 * 1000);
cleanup.unref();

server.listen(PORT, HOST, () => {
  console.log(`Signal & Steel is ready at http://localhost:${PORT}`);
  const lanAddresses = Object.values(networkInterfaces())
    .flat()
    .filter((address) => address?.family === "IPv4" && !address.internal)
    .map((address) => `http://${address.address}:${PORT}`);
  for (const address of lanAddresses) console.log(`Same-network players can open ${address}`);
});

function shutdown() {
  clearInterval(cleanup);
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
