// 100-Player Meme Maze — 99 NPC helpers: Roblox-style blocky crew with beacon outlines
'use strict';

const NPC_BUBBLES = ['A secret button!', 'What is THIS?!', 'A button!!', 'Look what I found!'];

function makeBubbleSprite() {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.bubble('Hi!'), transparent: true, depthTest: false, depthWrite: false }));
  sprite.scale.set(4.6, 2.0, 1);
  sprite.renderOrder = 1000;
  sprite.visible = false;
  return sprite;
}

class NPC {
  constructor(scene, maze, spawnPos) {
    this.maze = maze;
    this.pos = spawnPos.clone();
    this.cell = { x: worldToCellX(this.pos.x), z: worldToCellZ(this.pos.z) };
    this.path = [];
    this.pause = Math.random() * 2;
    this.speed = 3.3 + Math.random() * 1.5;
    this.laneX = (Math.random() - .5) * 1.6;
    this.laneZ = (Math.random() - .5) * 1.6;
    this.job = null;       // {cell, lava?, type:'bridge'|'button'}
    this.arrived = false;
    this.planks = 0;
    this.dead = false;

    // colors — classic blocky noob
    const shirt = new THREE.Color().setHSL(Math.random(), 0.75, 0.55);
    const pants = new THREE.Color().setHSL(Math.random(), 0.6, 0.38);
    const yellow = [0.97, 0.83, 0.24];

    const parts = [];
    // legs
    parts.push({ g: boxPart(0.34, 0.72, 0.34, -0.19, 0.36, 0), c: [pants.r, pants.g, pants.b] });
    parts.push({ g: boxPart(0.34, 0.72, 0.34, 0.19, 0.36, 0), c: [pants.r, pants.g, pants.b] });
    // torso
    parts.push({ g: boxPart(0.82, 0.72, 0.42, 0, 1.08, 0), c: [shirt.r, shirt.g, shirt.b] });
    // arms
    parts.push({ g: boxPart(0.26, 0.68, 0.30, -0.55, 1.1, 0), c: yellow });
    parts.push({ g: boxPart(0.26, 0.68, 0.30, 0.55, 1.1, 0), c: yellow });
    // head
    parts.push({ g: boxPart(0.66, 0.66, 0.66, 0, 1.77, 0), c: yellow });

    this.group = new THREE.Group();
    const geo = mergeGeoms(parts);

    this.body = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }));
    this.body.castShadow = true;
    this.group.add(this.body);

    // beacon outline — visible THROUGH walls
    const bright = shirt.clone().lerp(new THREE.Color(1, 1, 1), 0.45);
    this.outline = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: bright, transparent: true, opacity: 0.32, depthTest: false, depthWrite: false, fog: false,
    }));
    this.outline.scale.setScalar(1.13);
    this.outline.renderOrder = 999;
    this.group.add(this.outline);

    // face
    if (!NPC._faceMat) NPC._faceMat = new THREE.MeshBasicMaterial({ map: Tex.face() });
    if (!NPC._faceGeo) NPC._faceGeo = new THREE.PlaneGeometry(0.6, 0.6);
    const face = new THREE.Mesh(NPC._faceGeo, NPC._faceMat);
    face.position.set(0, 1.77, 0.34);
    this.group.add(face);

    // carried plank on the shoulder
    if (!NPC._plankGeo) NPC._plankGeo = new THREE.BoxGeometry(1.5, 0.12, 0.4);
    if (!NPC._plankMat) NPC._plankMat = new THREE.MeshStandardMaterial({ map: Tex.wood(Math.random), roughness: 0.85 });
    this.plankMesh = new THREE.Mesh(NPC._plankGeo, NPC._plankMat);
    this.plankMesh.position.set(0.35, 2.25, 0);
    this.plankMesh.rotation.z = 0.5;
    this.plankMesh.visible = false;
    this.group.add(this.plankMesh);

    this.group.position.copy(this.pos);
    scene.add(this.group);
  }

  setPath(path) { this.path = path || []; this.arrived = false; }

  update(dt, ctx) {
    const { catPos, manager } = ctx;
    // flee from the cat!
    const catDx = this.pos.x - catPos.x, catDz = this.pos.z - catPos.z;
    const catDist = Math.hypot(catDx, catDz);
    if (catDist < 22 && this.cell) {
      this._fleeTimer = (this._fleeTimer || 0) - dt;
      if (this._fleeTimer <= 0) {
        this._fleeTimer = 0.45;
        let best = null, bestD = -1;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = this.cell.x + dx, nz = this.cell.z + dz;
          const c = this.maze.cells[nz] && this.maze.cells[nz][nx];
          if (!c || c.wall || (c.lava && !c.bridge)) continue;
          const d = Math.hypot(cellToWorldX(nx) - catPos.x, cellToWorldZ(nz) - catPos.z);
          if (d > bestD) { bestD = d; best = { x: nx, z: nz }; }
        }
        if (best) this.setPath([best]);
        this.job = null;
      }
    } else if (this.pause > 0) {
      this.pause -= dt;
      this.wiggle(dt);
      return;
    }

    if (!this.path.length) {
      // choose next goal: bridge job > button scout > wander
      if (this.job) {
        if (!this.arrived) {
          const p = findPath(this.maze, this.cell, this.job.cell);
          if (p && p.length) { this.setPath(p); return; }
          if (p) { this.arrived = true; } // already there
          else this.job = null; // unreachable
        } else if (this.job.type === 'bridge') {
          // hold the build spot — hammer time! (safety: if we're not actually there, re-path)
          if (this.cell.x !== this.job.cell.x || this.cell.z !== this.job.cell.z) {
            this.arrived = false;
            this.path = [];
          } else {
            this.wiggle(dt);
            return;
          }
        }
      }
      if (!this.job && manager && manager.nextScout === this) {
        manager.nextScout = null;
        const adj = manager.buttonApproachCell;
        if (adj) {
          const p = findPath(this.maze, this.cell, adj);
          if (p && p.length) {
            this.job = { cell: adj, type: 'button' };
            this.setPath(p);
            return;
          }
        }
      }
      // wander to a random nearby floor cell
      for (let tries = 0; tries < 6; tries++) {
        const tx = clamp(this.cell.x + Math.floor((Math.random() - .5) * 16), 1, this.maze.W - 2);
        const tz = clamp(this.cell.z + Math.floor((Math.random() - .5) * 16), 1, this.maze.H - 2);
        const c = this.maze.cells[tz][tx];
        if (c.wall || (c.lava && !c.bridge)) continue;
        const p = findPath(this.maze, this.cell, { x: tx, z: tz });
        if (p && p.length) { this.setPath(p); break; }
      }
      this.pause = 0.4 + Math.random() * 1.6;
      this.wiggle(dt);
      return;
    }

    // follow path
    const wp = this.path[0];
    const tx = cellToWorldX(wp.x) + (this.path.length > 1 ? this.laneX : this.laneX * 0.4);
    const tz = cellToWorldZ(wp.z) + (this.path.length > 1 ? this.laneZ : this.laneZ * 0.4);
    const dx = tx - this.pos.x, dz = tz - this.pos.z;
    const d = Math.hypot(dx, dz);
    const mission = this.job && this.job.type === 'bridge' && !this.arrived ? 1.55 : 1; // crew runs to build sites
    const step = this.speed * mission * (catDist < 22 ? 1.45 : 1) * dt;
    if (d < Math.max(0.35, step)) {
      this.pos.set(tx, 0, tz);
      this.cell = { x: wp.x, z: wp.z };
      this.path.shift();
      if (!this.path.length) {
        this.arrived = true;
        if (this.job && this.job.type === 'button') {
          manager.bubble(this, NPC_BUBBLES[Math.floor(Math.random() * NPC_BUBBLES.length)]);
          this.pause = 2.6; this.job = null;
        } else if (this.job && this.job.type === 'bridge') {
          this.pause = 0.2;
        } else {
          this.pause = 0.4 + Math.random() * 1.8;
        }
      }
    } else {
      this.pos.x += dx / d * step;
      this.pos.z += dz / d * step;
      this._faceYaw = Math.atan2(dx, dz);
    }

    // plank pickups
    if (this.planks < 5 && manager.world) {
      for (const p of manager.world.plankPickups) {
        if (!p.active) continue;
        if (Math.hypot(p.mesh.position.x - this.pos.x, p.mesh.position.z - this.pos.z) < 1.1) {
          manager.world.takePlank(p);
          this.planks++;
          this.plankMesh.visible = true;
          break;
        }
      }
    }
  }

  wiggle(dt) {
    this._t = (this._t || Math.random() * 9) + dt;
    this.group.rotation.z = Math.sin(this._t * 2.2) * 0.03;
  }

  sync(dt, elapsed) {
    this.group.position.set(this.pos.x, 0, this.pos.z);
    if (this._faceYaw !== undefined) {
      let cur = this.group.rotation.y;
      let diff = this._faceYaw - cur;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.group.rotation.y = cur + diff * Math.min(1, dt * 10);
    }
    this.wiggle(dt);
    // beacon pulse
    this.outline.material.opacity = 0.26 + 0.12 * Math.sin(elapsed * 3 + this.pos.x);
    this.plankMesh.visible = this.planks > 0;
  }
}

class NPCManager {
  constructor(scene, maze, world) {
    this.scene = scene;
    this.maze = maze;
    this.world = world;
    this.npcs = [];
    this.bubbles = [];
    this.poofs = [];
    this.nextScout = null;
    this.scoutTimer = 6;
    this.bridgeJobs = new Map(); // lavaKey -> {cell, npcs:Set}
    this.bridgeCooldown = new Map(); // lavaKey -> elapsed-until (spot was unreachable)
    this.buttonApproachCell = this.buttonNeighborCell();
    this.elapsed = 0;

    // spawn the crew around the start plaza
    for (let i = 0; i < CFG.N_NPCS; i++) {
      const a = (i / CFG.N_NPCS) * Math.PI * 2 + Math.random() * 0.3;
      const r = 1.5 + Math.random() * 7;
      const p = new THREE.Vector3(
        cellToWorldX(maze.start.x) + Math.cos(a) * r, 0,
        cellToWorldZ(maze.start.z) + Math.sin(a) * r
      );
      this.npcs.push(new NPC(scene, maze, p));
    }
    for (let i = 0; i < 6; i++) this.bubbles.push(makeBubbleSprite());
    // poof pool
    const poofMat = new THREE.SpriteMaterial({ map: Tex.glow('rgba(255,255,255,1)'), transparent: true, opacity: 0, depthWrite: false });
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Sprite(poofMat.clone());
      s.visible = false;
      scene.add(s);
      this.poofs.push({ sprite: s, t: 1 });
    }
  }

  buttonNeighborCell() {
    const b = this.maze.button.cell;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = this.maze.cells[b.cz + dz][b.cx + dx];
      if (!c.wall && !c.lava && !c.laser) return { x: b.cx + dx, z: b.cz + dz };
    }
    return { x: b.cx, z: b.cz };
  }

  bubble(npc, text) {
    let free = this.bubbles.find(b => !b.visible);
    if (!free) free = this.bubbles[0];
    free.material.map = Tex.bubble(text);
    free.material.needsUpdate = true;
    free.position.set(npc.pos.x, 3.2, npc.pos.z);
    free.visible = true;
    free.userData.until = this.elapsed + 2.6;
    free.userData.follow = npc;
  }

  poof(pos) {
    const p = this.poofs.find(p => !p.sprite.visible) || this.poofs[0];
    p.sprite.position.set(pos.x, 1.2, pos.z);
    p.sprite.visible = true;
    p.t = 0;
  }

  killNPC(npc) {
    this.poof(npc.pos);
    npc.planks = 0;
    npc.job = null;
    npc.path = [];
    npc.pause = 1;
    const a = Math.random() * Math.PI * 2;
    npc.pos.set(
      cellToWorldX(this.maze.start.x) + Math.cos(a) * (2 + Math.random() * 5), 0,
      cellToWorldZ(this.maze.start.z) + Math.sin(a) * (2 + Math.random() * 5)
    );
    npc.cell = { x: worldToCellX(npc.pos.x), z: worldToCellZ(npc.pos.z) };
  }

  tryCatchByCat(catPos, radius) {
    let caught = 0;
    for (const n of this.npcs) {
      if (Math.hypot(n.pos.x - catPos.x, n.pos.z - catPos.z) < radius) { this.killNPC(n); caught++; }
    }
    return caught;
  }

  // send the crew to build a bridge over this lava cell
  assignBridge(lavaCell, playerCell) {
    const key = lavaCell.cz * this.maze.W + lavaCell.cx;
    if (this.bridgeJobs.has(key)) return;
    const cd = this.bridgeCooldown.get(key);
    if (cd && this.elapsed < cd) return;
    // pick a build spot: a floor neighbor of the lava REACHABLE from the player's side
    let pc = playerCell;
    if (!pc || pc.x < 0 || pc.z < 0 || pc.x >= this.maze.W || pc.z >= this.maze.H || this.maze.cells[pc.z][pc.x].wall) pc = this.maze.start;
    const pd = bfsDist(this.maze.cells, pc);
    let spot = null, spotD = 1e9;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = this.maze.cells[lavaCell.cz + dz][lavaCell.cx + dx];
      if (c.wall || c.lava) continue;
      const d = pd[c.cz] && pd[c.cz][c.cx];
      if (d !== undefined && d >= 0 && d < spotD) { spot = { x: c.cx, z: c.cz }; spotD = d; }
    }
    if (!spot) return;
    const job = { cell: spot, lava: lavaCell, npcs: new Set() };
    this.bridgeJobs.set(key, job);
    // nearest free helpers
    const cands = this.npcs
      .filter(n => !n.job)
      .sort((a, b) => Math.hypot(a.pos.x - cellToWorldX(spot.x), a.pos.z - cellToWorldZ(spot.z)) -
                      Math.hypot(b.pos.x - cellToWorldX(spot.x), b.pos.z - cellToWorldZ(spot.z)))
      .slice(0, 6);
    for (const n of cands) {
      n.job = { cell: spot, lava: lavaCell, type: 'bridge' };
      n.arrived = false;
      n.path = [];      // cancel any wander path in progress
      n.pause = 0;
      job.npcs.add(n);
    }
    job.createdAt = this.elapsed;
  }

  update(dt, playerPos, catPos, playerPlanks, onPlayerPlankUsed) {
    this.elapsed += dt;

    // scouts head to the button occasionally (they never say "press it!")
    this.scoutTimer -= dt;
    if (this.scoutTimer <= 0 && !this.nextScout) {
      this.scoutTimer = 14 + Math.random() * 10;
      const free = this.npcs.filter(n => !n.job);
      if (free.length) this.nextScout = free[Math.floor(Math.random() * free.length)];
    }

    const ctx = { catPos, manager: this };
    for (const n of this.npcs) n.update(dt, ctx);

    // bridge building: any helper holding the build spot builds it
    for (const [key, job] of this.bridgeJobs) {
      const crew = [...job.npcs].filter(n => n.job && n.job.type === 'bridge' && n.job.lava === job.lava);
      if (!crew.length) {
        // nobody kept the job: if this happened instantly the spot was unreachable — cool down so we don't churn
        if (this.elapsed - job.createdAt < 1.5) this.bridgeCooldown.set(key, this.elapsed + 8);
        this.bridgeJobs.delete(key);
        continue;
      }
      const arrived = crew.filter(n => n.arrived && n.cell.x === job.cell.x && n.cell.z === job.cell.z).length;
      const b = this.world.bridges.get(key);
      if (b && !b.built) {
        // the whole team is on it: waiting players see planks drop even before the crew arrives
        const playerNear = Math.hypot(cellToWorldX(job.lava.cx) - playerPos.x, cellToWorldZ(job.lava.cz) - playerPos.z) < CFG.CELL * 1.6;
        const trickle = playerNear && (this.elapsed - job.createdAt) > 2 ? 0.22 : 0;
        const rate = trickle + (arrived > 0 ? 0.3 + 0.3 * arrived : 0);
        if (rate > 0) {
          const before = b.progress;
          this.world.buildBridge(job.lava, before + dt * rate);
          // consume planks as the bridge grows: helpers' first, then the player's
          const shown = Math.ceil(b.progress * CFG.PLANKS_PER_BRIDGE);
          if (shown > Math.ceil(before * CFG.PLANKS_PER_BRIDGE)) {
            let used = false;
            for (const n of crew) if (n.planks > 0) { n.planks--; used = true; break; }
            if (!used && playerPlanks.count > 0) { playerPlanks.count--; used = true; if (onPlayerPlankUsed) onPlayerPlankUsed(); }
          }
          if (b.built) for (const n of crew) if (n.job && n.job.type === 'bridge') { n.job = null; n.pause = 0.5; }
        }
      }
    }

    // bubbles
    for (const b of this.bubbles) {
      if (!b.visible) continue;
      if (this.elapsed > b.userData.until) { b.visible = false; continue; }
      const f = b.userData.follow;
      if (f) b.position.set(f.pos.x, 3.3, f.pos.z);
    }
    // poofs
    for (const p of this.poofs) {
      if (!p.sprite.visible) continue;
      p.t += dt * 2.4;
      if (p.t >= 1) { p.sprite.visible = false; continue; }
      const s = 1.5 + p.t * 4.5;
      p.sprite.scale.set(s, s, 1);
      p.sprite.position.y = 1.2 + p.t * 1.6;
      p.sprite.material.opacity = 0.9 * (1 - p.t);
    }

    for (const n of this.npcs) n.sync(dt, this.elapsed);
  }
}
