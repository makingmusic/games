// 100-Player Meme Maze — main game: rounds, rules, deaths, winning
'use strict';

const Game = {
  state: 'title', // title | playing | dead | won

  boot() {
    const canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 600);
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    UI.init(
      () => { this.state = 'playing'; UI.hint('Find the hidden button to turn off the lasers! 🕵️', 7); this.lockPointer(); },
      () => { this.newRound(); this.state = 'playing'; this.lockPointer(); }
    );

    this.playerPlanks = { count: 0 };
    this.clock = new THREE.Clock();
    this.newRound();

    const loop = () => {
      requestAnimationFrame(loop);
      this.tick();
    };
    loop();
  },

  lockPointer() {
    if (UI.isTouch) return;
    const canvas = document.getElementById('game');
    try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* needs a click first — fine */ }
  },

  setupSky() {
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xbfe0f5, 38, 155);
    scene.background = new THREE.Color(0xbfe0f5);

    // gradient dome
    const geo = new THREE.SphereGeometry(420, 20, 14);
    const colors = [];
    const pos = geo.attributes.position;
    const top = new THREE.Color(0x4da3ff), bottom = new THREE.Color(0xeaf7ff);
    for (let i = 0; i < pos.count; i++) {
      const t = clamp(pos.getY(i) / 420, -0.2, 1);
      const c = bottom.clone().lerp(top, clamp(t * 1.4, 0, 1));
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const dome = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
    scene.add(dome);

    scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x9a8a6a, 0.6));
    const sun = new THREE.DirectionalLight(0xfff1d6, 1.15);
    sun.position.set(75, 100, 45);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -120; sun.shadow.camera.right = 120;
    sun.shadow.camera.top = 120; sun.shadow.camera.bottom = -120;
    sun.shadow.camera.near = 10; sun.shadow.camera.far = 300;
    sun.shadow.bias = -0.0006;
    scene.add(sun);
    return scene;
  },

  newRound() {
    // fresh maze every round — win the trophy again and again!
    this.scene = this.setupSky();
    this.maze = generateMaze((Date.now() ^ (Math.random() * 0xffff)) & 0xffffffff);
    this.world = buildWorld(this.scene, this.maze);

    if (!this.player) this.player = new Player(this.camera, this.maze);
    this.player.maze = this.maze;
    this.player.world = this.world;
    this.player.respawn();

    this.npcManager = new NPCManager(this.scene, this.maze, this.world);
    this.cat = new Cat(this.scene, this.maze, this.maze.start);

    this.playerPlanks.count = 0;
    this.plankRespawnTimer = 4;
    this.elapsed = 0;
  },

  killPlayer() {
    if (this.state !== 'playing') return;
    this.state = 'dead';
    Sound.pum();
    UI.deathFlash();
    UI.hint('PUM PUM PUM… back to the start! 💀', 3);
    setTimeout(() => {
      if (this.state !== 'dead') return;
      this.player.respawn();
      this.state = 'playing';
    }, 1200);
  },

  win() {
    if (this.state !== 'playing') return;
    this.state = 'won';
    Sound.ohMaGa();
    if (document.exitPointerLock) document.exitPointerLock();
    UI.hint('', 0);
    UI.showWin();
  },

  tick() {
    const dt = clamp(this.clock.getDelta(), 0, 0.05);
    this.elapsed += dt;

    if (this.state === 'playing' || this.state === 'dead') {
      if (this.state === 'playing') {
        this.player.update(dt, UI);
        UI.setPlanks(this.playerPlanks.count);
      } else {
        this.player.update(dt * 0.001, UI); // frozen camera during the flash
      }
      this.npcManager.update(dt, this.player.pos, this.cat.pos, this.playerPlanks, null);
      this.cat.update(dt, this.player.pos, this.npcManager, { onCatchPlayer: () => this.killPlayer() });
      this.world.update(this.elapsed);

      if (this.state === 'playing') this.checkRules(dt);
    } else {
      // title / win screens: the world keeps living behind them
      this.player.update(dt * 0.001, UI);
      this.npcManager.update(dt, this.player.pos, this.cat.pos, this.playerPlanks, null);
      this.cat.update(dt, this.player.pos, this.npcManager, { onCatchPlayer: () => {} });
      this.world.update(this.elapsed);
    }

    this.renderer.render(this.scene, this.camera);
  },

  checkRules(dt) {
    const p = this.player;
    const cell = this.maze.cells[p.cell.z] && this.maze.cells[p.cell.z][p.cell.x];
    if (!cell) return;

    // laser gates
    if (this.world.lasersOn && cell.laser) { this.killPlayer(); return; }
    // lava (safety — collision should block it)
    if (cell.lava && !cell.bridge) { this.killPlayer(); return; }

    // plank pickups
    for (const pk of this.world.plankPickups) {
      if (!pk.active) continue;
      if (Math.hypot(pk.mesh.position.x - p.pos.x, pk.mesh.position.z - p.pos.z) < 1.25) {
        this.world.takePlank(pk);
        this.playerPlanks.count++;
      }
    }
    // trickle-respawn planks so the crew never runs out
    this.plankRespawnTimer -= dt;
    if (this.plankRespawnTimer <= 0) {
      this.plankRespawnTimer = 5;
      const active = this.world.plankPickups.filter(x => x.active).length;
      if (active < CFG.PLANKS_ON_GROUND * 0.8) {
        for (let tries = 0; tries < 12; tries++) {
          const x = 1 + Math.floor(Math.random() * (this.maze.W - 2));
          const z = 1 + Math.floor(Math.random() * (this.maze.H - 2));
          const c = this.maze.cells[z][x];
          if (!c.wall && !c.lava && !c.laser && !c.button && !c.plaza) { this.world.spawnPlank(x, z); break; }
        }
      }
    }

    // hidden button
    if (!this.world.buttonPressed && p.pos.distanceTo(this.world.buttonPos) < 2.1) {
      this.world.pressButton();
      this.world.setLasersOff();
      UI.hint('The button!! Lasers are OFF! Run to the trophy! 🏆', 8);
    }

    // bridge trigger: helpers come build when you reach the lava
    for (const lava of this.maze.lavaCells) {
      if (lava.bridge) continue;
      const d = Math.hypot(cellToWorldX(lava.cx) - p.pos.x, cellToWorldZ(lava.cz) - p.pos.z);
      if (d < CFG.CELL * 1.5) this.npcManager.assignBridge(lava, p.cell);
    }

    // grab the trophy = WIN
    if (p.pos.distanceTo(this.world.trophyPos) < 3.6) this.win();
  },
};

window.addEventListener('load', () => {
  document.getElementById('loading').style.display = 'none';
  Game.boot();
});
