// 100-Player Meme Maze — shared config, math and geometry helpers
'use strict';

const CFG = {
  MAZE_W: 27,            // odd number of cells per side
  MAZE_H: 27,
  CELL: 6,               // world units per maze cell
  WALL_H: 4,             // super high walls — you can't see over them
  EYE: 1.7,              // player eye height
  PLAYER_R: 0.55,        // player collision radius
  PLAYER_SPEED: 5.2,
  N_NPCS: 99,            // + you = 100 players!
  CAT_SPEED: 4.55,
  CAT_CATCH_PLAYER: 2.4,
  CAT_CATCH_NPC: 1.9,
  CAT_HEIGHT: 7.3,       // taller than the walls — head bobs above the maze
  PLANKS_ON_GROUND: 40,
  LAVA_POOLS: 9,
  EXTRA_LASERS: 4,
  PLANKS_PER_BRIDGE: 5,
};

// ---------- random ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ---------- grid <-> world ----------
// grid[z][x]; maze centered on the origin
function cellToWorldX(cx) { return (cx - (CFG.MAZE_W - 1) / 2) * CFG.CELL; }
function cellToWorldZ(cz) { return (cz - (CFG.MAZE_H - 1) / 2) * CFG.CELL; }
function worldToCellX(x) { return Math.round(x / CFG.CELL + (CFG.MAZE_W - 1) / 2); }
function worldToCellZ(z) { return Math.round(z / CFG.CELL + (CFG.MAZE_H - 1) / 2); }

// ---------- geometry helpers ----------
// transformed box ready for merging
function boxPart(w, h, d, x, y, z, ry, rx, rz) {
  const g = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler(rx || 0, ry || 0, rz || 0, 'XYZ');
  q.setFromEuler(e);
  m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
  g.applyMatrix4(m);
  return g;
}
function cylPart(rt, rb, h, seg, x, y, z, ry, rx, rz) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0, 'XYZ'));
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
  g.applyMatrix4(m);
  return g;
}
function sphPart(r, seg, x, y, z) {
  const g = new THREE.SphereGeometry(r, seg, Math.max(8, seg - 4));
  g.applyMatrix4(new THREE.Matrix4().makeTranslation(x, y, z));
  return g;
}

// merge geometries; parts = [{g, c:[r,g,b]?, uvScale?}] — adds vertex colors when any c given
function mergeGeoms(parts) {
  const useColor = parts.some(p => p.c);
  const pos = [], nor = [], uv = [], col = [], idx = [];
  let off = 0;
  for (const p of parts) {
    const g = p.g;
    const pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv;
    for (let i = 0; i < pa.count; i++) {
      pos.push(pa.getX(i), pa.getY(i), pa.getZ(i));
      nor.push(na.getX(i), na.getY(i), na.getZ(i));
      if (ua) uv.push(ua.getX(i), ua.getY(i)); else uv.push(0, 0);
      if (useColor) {
        const c = p.c || [1, 1, 1];
        col.push(c[0], c[1], c[2]);
      }
    }
    if (g.index) {
      for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off);
    } else {
      for (let i = 0; i < pa.count; i++) idx.push(i + off);
    }
    off += pa.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (useColor) out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.setIndex(idx);
  return out;
}
