import { parseHex } from "../board.js";

function hex(code, extra = {}) {
  return { ...parseHex(code), ...extra };
}

function infantry(id, side, code, tags = []) {
  return { id, side, type: "infantry", ...parseHex(code), tags };
}

const riverRow = 3;
const riverTiles = [];
for (let q = 0; q < 13; q += 1) {
  if (q === 3 || q === 9) riverTiles.push({ q, r: riverRow, terrain: "bridge" });
  else riverTiles.push({ q, r: riverRow, terrain: "river" });
}

export const pegasusBridge = Object.freeze({
  id: "pegasus-bridge",
  title: "Pegasus Bridge",
  date: "06 June 1944",
  briefing: "Before dawn, glider infantry must seize two canal bridges and hold them. The garrison is surprised and begins with a thin handful of orders.",
  boardFace: "countryside",
  medals: 4,
  airDominant: "ochre",
  firstPlayer: "ochre",
  ochre: Object.freeze({ label: "British airborne", hand: 6 }),
  teal: Object.freeze({ label: "Caen canal garrison", hand: 2, handRampTo: 4 }),
  tiles: Object.freeze([
    ...riverTiles,
    { ...hex("B2"), terrain: "forest" },
    { ...hex("C2"), terrain: "town" },
    { ...hex("F2"), terrain: "town" },
    { ...hex("H2"), terrain: "town" },
    { ...hex("K2"), terrain: "town" },
    { ...hex("L2"), terrain: "forest" },
    { ...hex("A3"), terrain: "forest" },
    { ...hex("M3"), terrain: "forest" },
    { ...hex("F5"), terrain: "forest" },
    { ...hex("H5"), terrain: "forest" },
  ]),
  obstacles: Object.freeze([]),
  objectives: Object.freeze([
    { ...hex("D4"), kind: "temporary", scorer: "ochre", label: "Canal bridge" },
    { ...hex("J4"), kind: "temporary", scorer: "ochre", label: "Orne bridge" },
  ]),
  units: Object.freeze([
    infantry("t1", "teal", "B2"),
    infantry("t2", "teal", "C2"),
    infantry("t3", "teal", "F2"),
    infantry("t4", "teal", "H2"),
    infantry("t5", "teal", "K2"),
    infantry("t6", "teal", "M2"),
    infantry("o1", "ochre", "B8"),
    infantry("o2", "ochre", "C9"),
    infantry("o3", "ochre", "D8"),
    infantry("o4", "ochre", "F8"),
    infantry("o5", "ochre", "G9"),
    infantry("o6", "ochre", "H8"),
    infantry("o7", "ochre", "J8"),
    infantry("o8", "ochre", "K9"),
    infantry("o9", "ochre", "L8"),
  ]),
  specials: Object.freeze({ handRamp: Object.freeze({ side: "teal", target: 4 }) }),
});
