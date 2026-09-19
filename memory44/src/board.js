export const COLS = 13;
export const ROWS = 9;

export const SECTIONS = Object.freeze(["left", "center", "right"]);

const ODD_R_EVEN = Object.freeze([
  [1, 0], [-1, 0], [0, -1], [-1, -1], [0, 1], [-1, 1],
]);
const ODD_R_ODD = Object.freeze([
  [1, 0], [-1, 0], [1, -1], [0, -1], [1, 1], [0, 1],
]);

export function tileKey(q, r) {
  return `${q},${r}`;
}

export function parseHex(code) {
  const letter = code[0];
  const q = letter.charCodeAt(0) - 65;
  const r = Number.parseInt(code.slice(1), 10) - 1;
  if (!isOnBoard(q, r)) throw new Error(`Hex ${code} is off the board.`);
  return { q, r };
}

export function hexName(q, r) {
  return `${String.fromCharCode(65 + q)}${r + 1}`;
}

export function isOnBoard(q, r) {
  return Number.isInteger(q) && Number.isInteger(r)
    && q >= 0 && q < COLS && r >= 0 && r < ROWS;
}

export function toCube(q, r) {
  const x = q - (r - (r & 1)) / 2;
  const z = r;
  const y = -x - z;
  return { x, y, z };
}

export function fromCube(x, y, z) {
  const r = z;
  const q = x + (r - (r & 1)) / 2;
  return { q, r };
}

export function hexDistance(a, b) {
  const ac = toCube(a.q, a.r);
  const bc = toCube(b.q, b.r);
  return Math.max(Math.abs(ac.x - bc.x), Math.abs(ac.y - bc.y), Math.abs(ac.z - bc.z));
}

export function neighbours(q, r) {
  const dirs = r & 1 ? ODD_R_ODD : ODD_R_EVEN;
  return dirs
    .map(([dq, dr]) => ({ q: q + dq, r: r + dr }))
    .filter(({ q: nq, r: nr }) => isOnBoard(nq, nr));
}

export function sectionsAt(q) {
  const sections = [];
  if (q <= 4) sections.push("left");
  if (q >= 3 && q <= 9) sections.push("center");
  if (q >= 8) sections.push("right");
  return sections;
}

export function inSection(q, section) {
  return sectionsAt(q).includes(section);
}

function cubeLerp(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

function cubeRound(cube) {
  let rx = Math.round(cube.x);
  let ry = Math.round(cube.y);
  let rz = Math.round(cube.z);
  const dx = Math.abs(rx - cube.x);
  const dy = Math.abs(ry - cube.y);
  const dz = Math.abs(rz - cube.z);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;
  return { x: rx, y: ry, z: rz };
}

function nudge(cube, sign) {
  const e = 1e-6 * sign;
  return { x: cube.x + e, y: cube.y + e, z: cube.z - 2 * e };
}

function hexLine(a, b, sign) {
  const n = hexDistance(a, b);
  if (n === 0) return [{ q: a.q, r: a.r }];
  const ac = nudge(toCube(a.q, a.r), sign);
  const bc = nudge(toCube(b.q, b.r), sign);
  const hexes = [];
  for (let i = 0; i <= n; i += 1) {
    const rounded = cubeRound(cubeLerp(ac, bc, i / n));
    const hex = fromCube(rounded.x, rounded.y, rounded.z);
    hexes.push({ q: hex.q, r: hex.r });
  }
  return hexes;
}

export function interveningLosHexes(a, b) {
  const n = hexDistance(a, b);
  const groups = [];
  for (let i = 1; i < n; i += 1) groups.push(new Map());

  for (const sign of [1, -1]) {
    const line = hexLine(a, b, sign);
    for (let i = 1; i < n; i += 1) {
      const hex = line[i];
      groups[i - 1].set(tileKey(hex.q, hex.r), hex);
    }
  }

  return groups.map((group) => [...group.values()]);
}

export function isElevatedTerrain(terrain) {
  return terrain === "hill" || terrain === "cliff";
}

export function terrainAt(state, q, r) {
  return state.tiles[tileKey(q, r)] ?? state.boardFaceDefaults?.[tileKey(q, r)] ?? "open";
}

export function obstacleAt(state, q, r) {
  return state.obstacles.find((item) => item.q === q && item.r === r) ?? null;
}

export function hexBlocksLos(state, q, r, observer, target) {
  const terrain = terrainAt(state, q, r);
  const obstacle = obstacleAt(state, q, r);
  if (terrain === "forest" || terrain === "hedgerow" || terrain === "town") return true;
  if (obstacle?.type === "bunker") return true;
  if (isElevatedTerrain(terrain)) {
    const observerHill = isElevatedTerrain(terrainAt(state, observer.q, observer.r));
    const targetHill = isElevatedTerrain(terrainAt(state, target.q, target.r));
    if (observerHill && targetHill) return false;
    return true;
  }
  const unit = state.units.find((candidate) => candidate.q === q && candidate.r === r);
  return Boolean(unit);
}

export function hasLineOfSight(state, from, to) {
  if (from.q === to.q && from.r === to.r) return false;
  const groups = interveningLosHexes(from, to);
  for (const group of groups) {
    if (group.length === 0) continue;
    if (group.length === 1) {
      if (hexBlocksLos(state, group[0].q, group[0].r, from, to)) return false;
      continue;
    }
    const bothBlock = group.every((hex) => hexBlocksLos(state, hex.q, hex.r, from, to));
    if (bothBlock) return false;
  }
  return true;
}

export function allTiles() {
  const tiles = [];
  for (let r = 0; r < ROWS; r += 1) {
    for (let q = 0; q < COLS; q += 1) {
      tiles.push({ q, r });
    }
  }
  return tiles;
}

export function beachFaceDefaults() {
  const tiles = {};
  for (let q = 0; q < COLS; q += 1) {
    tiles[tileKey(q, 6)] = "beach";
    tiles[tileKey(q, 7)] = "ocean";
    tiles[tileKey(q, 8)] = "ocean";
  }
  return tiles;
}
