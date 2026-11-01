// 100-Player Meme Maze — the giant meme cat: silent hunter, mouth wide open, holding its nuts
'use strict';

class Cat {
  constructor(scene, maze, playerStartCell) {
    this.maze = maze;
    this.speed = CFG.CAT_SPEED;
    this.path = [];
    this.repathTimer = 0;
    this.target = null;
    this.elapsed = 0;
    this.faceYaw = 0;

    // spawn far away from the player
    const d = bfsDist(maze.cells, playerStartCell, true);
    let best = null, bestD = -1;
    for (let z = 1; z < maze.H - 1; z++) for (let x = 1; x < maze.W - 1; x++) {
      const c = maze.cells[z][x];
      if (!c.wall && !c.lava && d[z][x] > bestD) { bestD = d[z][x]; best = c; }
    }
    this.cell = { x: best.cx, z: best.cz };
    this.pos = new THREE.Vector3(cellToWorldX(best.cx), 0, cellToWorldZ(best.cz));

    this.group = this.buildModel(scene);
    scene.add(this.group);
  }

  buildModel() {
    const g = new THREE.Group();
    const furMat = new THREE.MeshStandardMaterial({ map: Tex.fur(Math.random), roughness: 0.9 });
    const creamMat = new THREE.MeshStandardMaterial({ color: 0xffe8c4, roughness: 0.9 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x2b2016, roughness: 0.6 });
    const pinkMat = new THREE.MeshStandardMaterial({ color: 0xff8aa0, roughness: 0.7 });
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x6b1512, roughness: 0.9 });

    const add = (geo, mat, x, y, z, rx, ry, rz) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.rotation.set(rx || 0, ry || 0, rz || 0);
      m.castShadow = true;
      g.add(m);
      return m;
    };

    // legs (standing on two paws)
    add(new THREE.BoxGeometry(0.95, 2.7, 0.95), furMat, -0.62, 1.35, 0);
    add(new THREE.BoxGeometry(0.95, 2.7, 0.95), furMat, 0.62, 1.35, 0);
    add(new THREE.BoxGeometry(1.05, 0.4, 1.5), creamMat, -0.62, 0.2, 0.1);
    add(new THREE.BoxGeometry(1.05, 0.4, 1.5), creamMat, 0.62, 0.2, 0.1);

    // body
    add(new THREE.BoxGeometry(2.35, 2.5, 1.5), furMat, 0, 3.9, 0);
    add(new THREE.BoxGeometry(1.5, 1.85, 0.12), creamMat, 0, 3.75, 0.78); // belly
    // puffed surprised tail
    add(new THREE.SphereGeometry(0.55, 10, 8), furMat, 0, 4.9, -0.95);

    // arms bent inward, holding the nuts
    add(new THREE.BoxGeometry(0.55, 1.35, 0.55), furMat, -1.35, 4.5, 0.15, 0, 0, 0.55);
    add(new THREE.BoxGeometry(0.55, 1.35, 0.55), furMat, 1.35, 4.5, 0.15, 0, 0, -0.55);
    this.pawL = add(new THREE.SphereGeometry(0.34, 10, 8), creamMat, -0.62, 4.0, 0.85);
    this.pawR = add(new THREE.SphereGeometry(0.34, 10, 8), creamMat, 0.62, 4.0, 0.85);

    // the nuts: two acorns
    const acorn = (x) => {
      add(new THREE.SphereGeometry(0.52, 12, 10), new THREE.MeshStandardMaterial({ color: 0xc89b62, roughness: 0.8 }), x, 4.35, 1.15);
      const cap = new THREE.SphereGeometry(0.56, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      add(cap, new THREE.MeshStandardMaterial({ color: 0x7a4a22, roughness: 0.85 }), x, 4.5, 1.15);
      add(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 6), darkMat, x, 4.95, 1.15);
    };
    acorn(-0.62); acorn(0.62);

    // head — big, above the walls
    add(new THREE.BoxGeometry(2.3, 1.95, 2.05), furMat, 0, 6.15, 0);
    // ears
    add(new THREE.ConeGeometry(0.55, 0.9, 4), furMat, -0.75, 7.5, 0, 0, Math.PI / 4);
    add(new THREE.ConeGeometry(0.55, 0.9, 4), furMat, 0.75, 7.5, 0, 0, Math.PI / 4);
    add(new THREE.ConeGeometry(0.3, 0.5, 4), pinkMat, -0.75, 7.45, 0.12, 0, Math.PI / 4);
    add(new THREE.ConeGeometry(0.3, 0.5, 4), pinkMat, 0.75, 7.45, 0.12, 0, Math.PI / 4);

    // HUGE surprised eyes — pupils track the player
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.3 });
    this.pupils = [];
    for (const side of [-1, 1]) {
      add(new THREE.SphereGeometry(0.46, 14, 12), eyeMat, side * 0.63, 6.5, 0.95);
      const pupil = add(new THREE.SphereGeometry(0.2, 10, 8), pupilMat, side * 0.63, 6.5, 1.32);
      this.pupils.push(pupil);
      // raised shocked eyebrows
      add(new THREE.BoxGeometry(0.5, 0.12, 0.12), darkMat, side * 0.63, 7.05, 1.0, 0, 0, side * -0.5);
    }

    // muzzle + nose
    add(new THREE.BoxGeometry(1.1, 0.55, 0.35), creamMat, 0, 5.75, 1.02);
    add(new THREE.BoxGeometry(0.3, 0.22, 0.2), pinkMat, 0, 5.95, 1.2);

    // MOUTH WIDE OPEN (the surprised meme face)
    add(new THREE.BoxGeometry(1.35, 0.95, 0.8), mouthMat, 0, 5.45, 0.72);           // inner mouth
    add(new THREE.BoxGeometry(0.85, 0.22, 0.9), pinkMat, 0, 5.3, 0.85, 0.5);        // tongue
    add(new THREE.BoxGeometry(1.5, 0.5, 1.0), furMat, 0, 5.0, 0.7, 0.38);           // dropped jaw

    // whiskers
    const whiskMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      add(new THREE.CylinderGeometry(0.025, 0.025, 1.1, 4), whiskMat, side * 1.05, 5.85 + i * 0.16, 0.95, 0, 0, Math.PI / 2 + side * (0.15 - i * 0.05));
    }

    g.position.copy(this.pos);
    return g;
  }

  update(dt, playerPos, npcManager, callbacks) {
    this.elapsed += dt;
    const { onCatchPlayer } = callbacks;

    // retarget + repath
    this.repathTimer -= dt;
    if (this.repathTimer <= 0) {
      this.repathTimer = 1.1;
      let target = null;
      // hunt the player 70% of the time, else the nearest helper
      if (Math.random() < 0.7) target = { x: worldToCellX(playerPos.x), z: worldToCellZ(playerPos.z) };
      else {
        let best = null, bd = 1e9;
        for (const n of npcManager.npcs) {
          const d = Math.hypot(n.pos.x - this.pos.x, n.pos.z - this.pos.z);
          if (d < bd) { bd = d; best = n; }
        }
        if (best) target = { x: worldToCellX(best.pos.x), z: worldToCellZ(best.pos.z) };
      }
      this.target = target;
      const p = findPath(this.maze, this.cell, target, true); // cat walks over lava
      if (p) this.path = p;
    }

    // follow the path
    if (this.path.length) {
      const wp = this.path[0];
      const tx = cellToWorldX(wp.x), tz = cellToWorldZ(wp.z);
      const dx = tx - this.pos.x, dz = tz - this.pos.z;
      const d = Math.hypot(dx, dz);
      const step = this.speed * dt;
      if (d < Math.max(0.6, step)) {
        this.pos.set(tx, 0, tz);
        this.cell = { x: wp.x, z: wp.z };
        this.path.shift();
      } else {
        this.pos.x += dx / d * step;
        this.pos.z += dz / d * step;
        this.faceYaw = Math.atan2(dx, dz);
      }
    }

    // catches
    npcManager.tryCatchByCat(this.pos, CFG.CAT_CATCH_NPC);
    if (playerPos && Math.hypot(playerPos.x - this.pos.x, playerPos.z - this.pos.z) < CFG.CAT_CATCH_PLAYER) onCatchPlayer();

    // animation: waddle bob, surprised tremble
    const moving = this.path.length > 0;
    this.group.position.set(this.pos.x, moving ? Math.abs(Math.sin(this.elapsed * 6.5)) * 0.22 : 0, this.pos.z);
    this.group.rotation.z = Math.sin(this.elapsed * 3.2) * 0.045;
    let diff = this.faceYaw - this.group.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.group.rotation.y += diff * Math.min(1, dt * 6);
    // trembling paws (it is SO surprised)
    const tr = Math.sin(this.elapsed * 14) * 0.06;
    this.pawL.position.y = 4.0 + tr;
    this.pawR.position.y = 4.0 - tr;
    // pupils track the player
    const pdx = playerPos.x - this.pos.x, pdz = playerPos.z - this.pos.z;
    const pd = Math.hypot(pdx, pdz);
    if (pd < 50) {
      const lx = clamp((pdx * Math.cos(-this.group.rotation.y) - pdz * Math.sin(-this.group.rotation.y)) / pd, -1, 1);
      this.pupils[0].position.x = -0.63 + lx * 0.14;
      this.pupils[1].position.x = 0.63 + lx * 0.14;
    }
  }
}
