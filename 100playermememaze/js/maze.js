// 100-Player Meme Maze — maze generation: crazy-sandwich walls, lava, lasers, hidden button, trophy
'use strict';

// cell flags: wall, lava, laser, plaza, button
function generateMaze(seed) {
  const rand = mulberry32(seed);
  const W = CFG.MAZE_W, H = CFG.MAZE_H;
  const cells = [];
  for (let z = 0; z < H; z++) {
    cells.push([]);
    for (let x = 0; x < W; x++) cells[z].push({ wall: true, lava: false, laser: false, plaza: false, button: false, cx: x, cz: z });
  }
  // recursive backtracker on odd cells
  const stack = [[1, 1]];
  cells[1][1].wall = false;
  while (stack.length) {
    const [x, z] = stack[stack.length - 1];
    const dirs = shuffle([[2, 0], [-2, 0], [0, 2], [0, -2]], rand);
    let moved = false;
    for (const [dx, dz] of dirs) {
      const nx = x + dx, nz = z + dz;
      if (nx > 0 && nz > 0 && nx < W - 1 && nz < H - 1 && cells[nz][nx].wall) {
        cells[z + dz / 2][x + dx / 2].wall = false;
        cells[nz][nx].wall = false;
        stack.push([nx, nz]);
        moved = true;
        break;
      }
    }
    if (!moved) stack.pop();
  }
  // a few loops so 100 players don't jam
  let loops = 12;
  while (loops > 0) {
    const x = 1 + Math.floor(rand() * (W - 2)), z = 1 + Math.floor(rand() * (H - 2));
    const c = cells[z][x];
    if (c.wall) {
      const hOpen = !cells[z][x - 1].wall && !cells[z][x + 1].wall;
      const vOpen = !cells[z - 1][x].wall && !cells[z + 1][x].wall;
      if (hOpen !== vOpen) { c.wall = false; loops--; }
    }
  }
  // plazas: start (top-left) & trophy (bottom-right)
  const plaza = (px, pz) => {
    for (let z = pz; z < pz + 3; z++) for (let x = px; x < px + 3; x++) {
      cells[z][x].wall = false; cells[z][x].plaza = true;
    }
  };
  plaza(1, 1);
  plaza(W - 4, H - 4);
  const start = { x: 2, z: 2 };
  const trophy = { x: W - 3, z: H - 3 };

  const floors = [];
  for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) if (!cells[z][x].wall) floors.push(cells[z][x]);
  const distStart = bfsDist(cells, start);
  const distTrophy = bfsDist(cells, trophy);

  const degree = (c) => [[1, 0], [-1, 0], [0, 1], [0, -1]].reduce((n, [dx, dz]) => n + (!cells[c.cz + dz][c.cx + dx].wall ? 1 : 0), 0);
  const nearPlaza = (c) => Math.abs(c.cx - trophy.x) <= 4 && Math.abs(c.cz - trophy.z) <= 4 || Math.abs(c.cx - start.x) <= 4 && Math.abs(c.cz - start.z) <= 4;

  // lava pools on corridor cells, spaced apart, not near plazas
  const lavaCells = [];
  const candidates = floors.filter(c => !c.plaza && degree(c) === 2 && distStart[c.cz][c.cx] > 6 && !nearPlaza(c));
  shuffle(candidates, rand);
  for (const c of candidates) {
    if (lavaCells.length >= CFG.LAVA_POOLS) break;
    if (lavaCells.every(l => Math.abs(l.cx - c.cx) + Math.abs(l.cz - c.cz) >= 5)) {
      c.lava = true; lavaCells.push(c);
    }
  }

  // laser gates: every entrance to the trophy plaza + a few random corridors
  const laserGates = [];
  for (let z = H - 5; z <= H - 3; z++) for (let x = W - 5; x <= W - 3; x++) {
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (nx > 0 && nz > 0 && nx < W - 1 && nz < H - 1 && !cells[nz][nx].wall && !cells[nz][nx].plaza && !cells[nz][nx].lava && !cells[nz][nx].laser) {
        cells[nz][nx].laser = true; laserGates.push(cells[nz][nx]);
      }
    }
  }
  const laserCand = candidates.filter(c => !c.lava && !c.laser && distStart[c.cz][c.cx] > 8);
  shuffle(laserCand, rand);
  for (const c of laserCand) {
    if (laserGates.length >= laserGates.filter(g => !nearPlaza(g)).length + CFG.EXTRA_LASERS) break;
    if (laserGates.every(l => Math.abs(l.cx - c.cx) + Math.abs(l.cz - c.cz) >= 6)) { c.laser = true; laserGates.push(c); }
  }

  // hidden button in a far dead-end
  const maxDist = Math.max(...floors.map(c => distTrophy[c.cz][c.cx]));
  const deadEnds = floors.filter(c => !c.plaza && !c.lava && !c.laser && degree(c) === 1 && distTrophy[c.cz][c.cx] > maxDist * 0.35 && distStart[c.cz][c.cx] > 6);
  const buttonCell = deadEnds.length ? deadEnds[Math.floor(rand() * deadEnds.length)] : candidates[0];
  buttonCell.button = true;
  // which wall does it sit on: opposite the single opening
  let buttonDir = [1, 0];
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (!cells[buttonCell.cz + dz][buttonCell.cx + dx].wall) { buttonDir = [-dx, -dz]; break; }
  }

  // plank spawns
  const plankSpawns = [];
  const spawnCand = floors.filter(c => !c.plaza && !c.lava && !c.laser && !c.button);
  shuffle(spawnCand, rand);
  for (let i = 0; i < Math.min(CFG.PLANKS_ON_GROUND, spawnCand.length); i++) {
    const c = spawnCand[i];
    plankSpawns.push({
      cx: c.cx, cz: c.cz,
      ox: (rand() - .5) * 3.4, oz: (rand() - .5) * 3.4,
      rot: rand() * Math.PI,
    });
  }

  return { W, H, cells, start, trophy, button: { cell: buttonCell, dir: buttonDir }, lavaCells, laserGates, plankSpawns, rand };
}

// BFS distance field (walls block; lava blocks unless walkLava)
function bfsDist(cells, from, walkLava) {
  const W = cells[0].length, H = cells.length;
  const d = [];
  for (let z = 0; z < H; z++) d.push(new Array(W).fill(-1));
  const q = [[from.x, from.z]];
  d[from.z][from.x] = 0;
  let head = 0;
  while (head < q.length) {
    const [x, z] = q[head++];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (nx >= 0 && nz >= 0 && nx < W && nz < H && d[nz][nx] === -1) {
        const c = cells[nz][nx];
        if (!c.wall && (walkLava || !c.lava)) { d[nz][nx] = d[z][x] + 1; q.push([nx, nz]); }
      }
    }
  }
  return d;
}

// BFS path from cell to cell (grid coords), returns [{x,z},...] excluding start, or null
function findPath(maze, from, to, walkLava) {
  if (!maze || from.x === to.x && from.z === to.z) return [];
  const cells = maze.cells, W = maze.W, H = maze.H;
  const prev = new Map();
  const key = (x, z) => z * W + x;
  const q = [[from.x, from.z]];
  prev.set(key(from.x, from.z), null);
  let head = 0, found = false;
  while (head < q.length && !found) {
    const [x, z] = q[head++];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
      const c = cells[nz][nx];
      if (c.wall || prev.has(key(nx, nz))) continue;
      if (!walkLava && c.lava && !c.bridge) continue;
      prev.set(key(nx, nz), [x, z]);
      if (nx === to.x && nz === to.z) { found = true; break; }
      q.push([nx, nz]);
    }
  }
  if (!prev.has(key(to.x, to.z))) return null;
  const path = [];
  let cur = [to.x, to.z];
  while (cur) { path.push({ x: cur[0], z: cur[1] }); cur = prev.get(key(cur[0], cur[1])); }
  path.reverse();
  path.shift();
  return path;
}
