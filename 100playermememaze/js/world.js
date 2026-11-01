// 100-Player Meme Maze — builds the 3D world: walls, lava, bridges, planks, lasers, button, trophy
'use strict';

function buildWorld(scene, maze) {
  const rand = maze.rand;
  const world = { maze, lasersOn: true };
  const C = CFG.CELL;

  // ---------- ground ----------
  const groundMat = new THREE.MeshStandardMaterial({ map: Tex.ground(rand), roughness: 0.95 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ---------- crazy-sandwich walls ----------
  const wallMats = [
    new THREE.MeshStandardMaterial({ map: Tex.cheese(rand), roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ map: Tex.stone(rand), roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ map: Tex.brick(rand), roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ map: Tex.grass(rand), roughness: 0.95 }),
  ];
  const buckets = [[], [], [], []];
  const inBounds = (x, z) => x >= 0 && z >= 0 && x < maze.W && z < maze.H;
  for (let z = 0; z < maze.H; z++) {
    for (let x = 0; x < maze.W; x++) {
      const c = maze.cells[z][x];
      if (!c.wall) continue;
      let touchesFloor = false;
      for (let dz = -1; dz <= 1 && !touchesFloor; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (inBounds(x + dx, z + dz) && !maze.cells[z + dz][x + dx].wall) { touchesFloor = true; break; }
      }
      if (!touchesFloor) continue;
      const wx = cellToWorldX(x), wz = cellToWorldZ(z);
      buckets[Math.floor(rand() * 4)].push({ g: boxPart(C, CFG.WALL_H, C, wx, CFG.WALL_H / 2, wz) });
    }
  }
  buckets.forEach((parts, i) => {
    if (!parts.length) return;
    const mesh = new THREE.Mesh(mergeGeoms(parts), wallMats[i]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  });

  // ---------- start pad ----------
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(4.4, 4.6, 0.22, 28),
    new THREE.MeshStandardMaterial({ color: 0xcfc6b8, roughness: 0.9 })
  );
  pad.position.set(cellToWorldX(maze.start.x), 0.11, cellToWorldZ(maze.start.z));
  pad.receiveShadow = true;
  scene.add(pad);

  // ---------- lava pools ----------
  world.lavaTex = Tex.lava(rand);
  const lavaMat = new THREE.MeshBasicMaterial({ map: world.lavaTex });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x3a2a24, roughness: 1 });
  const lavaTop = [], rockRim = [];
  world.lavaCells = maze.lavaCells;
  world.bridges = new Map(); // key "x,z" -> {planks:[], built, progress, group}
  const lavaGlowMat = new THREE.SpriteMaterial({ map: Tex.glow('rgba(255,140,40,1)'), transparent: true, opacity: 0.55, depthWrite: false });
  for (const c of maze.lavaCells) {
    const wx = cellToWorldX(c.cx), wz = cellToWorldZ(c.cz);
    lavaTop.push({ g: boxPart(C - 0.7, 0.34, C - 0.7, wx, 0.42, wz) });
    rockRim.push({ g: boxPart(C + 0.15, 0.5, C + 0.15, wx, 0.25, wz) });
    const glow = new THREE.Sprite(lavaGlowMat);
    glow.scale.set(9, 5, 1);
    glow.position.set(wx, 2.2, wz);
    scene.add(glow);
    // plank bridge (hidden until helpers build it)
    const horiz = !maze.cells[c.cz][c.cx - 1].wall || !maze.cells[c.cz][c.cx + 1].wall; // travel along x
    const group = new THREE.Group();
    const planks = [];
    for (let i = 0; i < CFG.PLANKS_PER_BRIDGE; i++) {
      const along = (i - (CFG.PLANKS_PER_BRIDGE - 1) / 2) * (C - 1.2) / CFG.PLANKS_PER_BRIDGE;
      const p = new THREE.Mesh(
        new THREE.BoxGeometry(horiz ? 1.05 : 5.7, 0.18, horiz ? 5.7 : 1.05),
        worldBridgePlankMat()
      );
      p.position.set(horiz ? along : 0, 0.8, horiz ? 0 : along);
      p.rotation.y = (rand() - .5) * 0.12;
      p.castShadow = true;
      p.visible = false;
      group.add(p);
      planks.push({ mesh: p, shownAt: 0 });
    }
    group.position.set(wx, 0, wz);
    scene.add(group);
    world.bridges.set(c.cz * maze.W + c.cx, { planks, built: false, progress: 0, cell: c });
    c.bridge = false;
  }
  if (lavaTop.length) {
    const lavaMesh = new THREE.Mesh(mergeGeoms(lavaTop), lavaMat);
    scene.add(lavaMesh);
    const rockMesh = new THREE.Mesh(mergeGeoms(rockRim), rockMat);
    rockMesh.receiveShadow = true;
    scene.add(rockMesh);
  }

  // bridge planks material shared per bridge (fresh each call so tint varies slightly)
  function worldBridgePlankMat() {
    if (!world._plankMat) world._plankMat = new THREE.MeshStandardMaterial({ map: Tex.wood(rand), roughness: 0.85 });
    return world._plankMat;
  }

  // build a bit more of the bridge (progress 0..1); marks cell walkable when done
  world.buildBridge = function (cell, progress) {
    const b = world.bridges.get(cell.cz * maze.W + cell.cx);
    if (!b || b.built) return;
    b.progress = clamp(progress, 0, 1);
    const show = Math.ceil(b.progress * b.planks.length);
    for (let i = 0; i < b.planks.length; i++) {
      const pl = b.planks[i];
      if (i < show && !pl.mesh.visible) { pl.mesh.visible = true; pl.shownAt = performance.now(); }
    }
    if (b.progress >= 1) { b.built = true; cell.bridge = true; }
  };

  // ---------- plank pickups ----------
  const plankGeo = new THREE.BoxGeometry(1.7, 0.14, 0.55);
  world.plankPickups = [];
  world.spawnPlank = spawnPlank;
  function spawnPlank(cx, cz) {
    const m = new THREE.Mesh(plankGeo, worldBridgePlankMat());
    m.position.set(cellToWorldX(cx) + (rand() - .5) * 3.2, 0.12, cellToWorldZ(cz) + (rand() - .5) * 3.2);
    m.rotation.y = rand() * Math.PI;
    scene.add(m);
    const p = { mesh: m, active: true, cx, cz };
    world.plankPickups.push(p);
    return p;
  }
  for (const s of maze.plankSpawns) spawnPlank(s.cx, s.cz);
  world.takePlank = function (p) { p.active = false; p.mesh.visible = false; };

  // ---------- laser gates ----------
  const postMat = new THREE.MeshStandardMaterial({ color: 0x57606a, roughness: 0.5, metalness: 0.55 });
  const beamTex = Tex.laserBeam();
  world.beams = [];
  for (const c of maze.laserGates) {
    const wx = cellToWorldX(c.cx), wz = cellToWorldZ(c.cz);
    const horiz = !maze.cells[c.cz][c.cx - 1].wall || !maze.cells[c.cz][c.cx + 1].wall; // travel along x
    const group = new THREE.Group();
    group.position.set(wx, 0, wz);
    if (!horiz) group.rotation.y = Math.PI / 2;
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.42, 3.6, 0.42), postMat);
      post.position.set(side * (C / 2 - 0.45), 1.8, 0);
      post.castShadow = true;
      group.add(post);
      const tip = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff2222, emissiveIntensity: 1.6 })
      );
      tip.position.set(side * (C / 2 - 0.45), 3.3, 0);
      group.add(tip);
      c._tips = c._tips || []; c._tips.push(tip);
    }
    const beam = new THREE.Mesh(
      new THREE.PlaneGeometry(C - 0.9, 3.1),
      new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    beam.position.y = 1.65;
    group.add(beam);
    scene.add(group);
    world.beams.push({ cell: c, beam });
  }
  world.setLasersOff = function () {
    world.lasersOn = false;
    for (const c of maze.laserGates) if (c._tips) for (const t of c._tips) {
      t.material = t.material.clone();
      t.material.emissive.set(0x22cc44);
      t.material.color.set(0x002200);
    }
  };

  // ---------- hidden button ----------
  const bc = maze.button.cell, dir = maze.button.dir;
  const btnGroup = new THREE.Group();
  btnGroup.position.set(
    cellToWorldX(bc.cx) + dir[0] * (C / 2 - 0.02),
    1.35,
    cellToWorldZ(bc.cz) + dir[1] * (C / 2 - 0.02)
  );
  btnGroup.rotation.y = Math.atan2(-dir[0], -dir[1]);
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 1.15, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x494f57, roughness: 0.6, metalness: 0.4 })
  );
  plate.position.z = 0.09;
  btnGroup.add(plate);
  const btnMat = new THREE.MeshStandardMaterial({ color: 0xaa1111, emissive: 0xff3333, emissiveIntensity: 0.8, roughness: 0.4 });
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.24, 20), btnMat);
  btn.rotation.x = Math.PI / 2;
  btn.position.z = 0.26;
  btnGroup.add(btn);
  scene.add(btnGroup);
  world.buttonPos = new THREE.Vector3(btnGroup.position.x, 1.2, btnGroup.position.z);
  world.buttonPressed = false;
  world.pressButton = function () {
    world.buttonPressed = true;
    btn.position.z = 0.15;
    btnMat.emissiveIntensity = 0.05;
    btnMat.color.set(0x551111);
  };

  // ---------- the MASSIVE trophy ----------
  const t = maze.trophy;
  const twx = cellToWorldX(t.x), twz = cellToWorldZ(t.z);
  world.trophyPos = new THREE.Vector3(twx, 0, twz);
  const trophyGroup = new THREE.Group();
  trophyGroup.position.set(twx, 0, twz);
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffcf3f, metalness: 0.92, roughness: 0.22,
    emissive: 0x8a5c00, emissiveIntensity: 0.5,
  });
  const profile = [
    [1.7, 0], [1.7, 0.4], [0.6, 0.62], [0.42, 1.7], [1.55, 2.5], [1.8, 3.1], [1.45, 3.7], [1.3, 3.8],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const cup = new THREE.Mesh(new THREE.LatheGeometry(profile, 36), goldMat);
  cup.scale.setScalar(3.1);
  cup.castShadow = true;
  trophyGroup.add(cup);
  for (const side of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.16, 12, 28), goldMat);
    handle.position.set(side * 1.75, 9.4, 0);
    handle.rotation.y = Math.PI / 2;
    handle.scale.setScalar(2.6);
    handle.castShadow = true;
    trophyGroup.add(handle);
  }
  // light beam to the sky — visible over the whole maze
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 2.3, 70, 18, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })
  );
  beam.position.y = 35;
  trophyGroup.add(beam);
  // sparkles
  const sparkGeo = new THREE.BufferGeometry();
  const sp = [];
  for (let i = 0; i < 40; i++) {
    const a = rand() * Math.PI * 2, r = 2 + rand() * 4.5, y = 1 + rand() * 13;
    sp.push(Math.cos(a) * r, y, Math.sin(a) * r);
  }
  sparkGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const sparkles = new THREE.Points(sparkGeo, new THREE.PointsMaterial({
    map: Tex.star(), size: 1.15, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  trophyGroup.add(sparkles);
  scene.add(trophyGroup);
  world.trophyGroup = trophyGroup;

  // ---------- helpers ----------
  world.isSolid = function (cx, cz) {
    if (cx < 0 || cz < 0 || cx >= maze.W || cz >= maze.H) return true;
    const c = maze.cells[cz][cx];
    return c.wall || (c.lava && !c.bridge);
  };

  const clock = new THREE.Clock();
  world.update = function (elapsed) {
    // lava flow
    world.lavaTex.offset.x = (elapsed * 0.045) % 1;
    world.lavaTex.offset.y = (elapsed * 0.02) % 1;
    // laser pulse
    const pulse = world.lasersOn ? 0.7 + 0.3 * Math.sin(elapsed * 9) : 0;
    for (const b of world.beams) b.beam.material.opacity = pulse;
    if (world.lasersOn) {
      for (const c of maze.laserGates) if (c._tips) for (const tp of c._tips) tp.material.emissiveIntensity = 1.2 + Math.sin(elapsed * 9) * 0.7;
    }
    // button blink until pressed
    if (!world.buttonPressed) btnMat.emissiveIntensity = 0.55 + 0.45 * Math.sin(elapsed * 5);
    // plank pickup bob
    for (const p of world.plankPickups) if (p.active) p.mesh.rotation.y += 0.004;
    // bridge plank drop-in pop
    const now = performance.now();
    for (const b of world.bridges.values()) {
      for (const pl of b.planks) {
        if (!pl.mesh.visible) continue;
        const age = (now - pl.shownAt) / 240;
        if (age < 1) { pl.mesh.position.y = 0.8 + (1 - age) * 1.4; pl.mesh.rotation.z = (1 - age) * 0.25; }
        else { pl.mesh.position.y = 0.8; pl.mesh.rotation.z = 0; }
      }
    }
    // trophy spin + sparkles
    trophyGroup.rotation.y = elapsed * 0.5;
    sparkles.rotation.y = -elapsed * 0.8;
    sparkles.position.y = Math.sin(elapsed * 1.4) * 0.5;
  };

  return world;
}
