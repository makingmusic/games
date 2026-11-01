// 100-Player Meme Maze — first-person player: keyboard + mouse look + iPad touch
'use strict';

class Player {
  constructor(camera, maze) {
    this.camera = camera;
    this.maze = maze;
    this.world = null; // set by game
    this.pos = new THREE.Vector3(cellToWorldX(maze.start.x), 0, cellToWorldZ(maze.start.z));
    this.yaw = Math.PI * 0.75; // face into the maze
    this.pitch = 0;
    this.keys = {};
    this.bob = 0;

    window.addEventListener('keydown', e => { this.keys[e.code] = true; if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault(); });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    document.addEventListener('mousemove', e => {
      if (document.pointerLockElement) {
        this.yaw -= e.movementX * 0.0024;
        this.pitch = clamp(this.pitch - e.movementY * 0.0022, -1.25, 1.25);
      }
    });
  }

  respawn() {
    this.pos.set(cellToWorldX(this.maze.start.x), 0, cellToWorldZ(this.maze.start.z));
    this.yaw = Math.PI * 0.75;
    this.pitch = 0;
  }

  get cell() { return { x: worldToCellX(this.pos.x), z: worldToCellZ(this.pos.z) }; }

  update(dt, ui) {
    // keyboard
    let ix = 0, iz = 0;
    if (this.keys.KeyW || this.keys.ArrowUp) iz -= 1;
    if (this.keys.KeyS || this.keys.ArrowDown) iz += 1;
    if (this.keys.KeyA || this.keys.ArrowLeft) ix -= 1;
    if (this.keys.KeyD || this.keys.ArrowRight) ix += 1;
    // touch stick
    const st = ui.getMove();
    ix += st.x; iz += st.y;
    // touch look
    const lk = ui.consumeLook();
    this.yaw -= lk.dx * 0.006;
    this.pitch = clamp(this.pitch - lk.dy * 0.005, -1.25, 1.25);

    const len = Math.hypot(ix, iz);
    let moving = false;
    if (len > 0.08) {
      moving = true;
      ix /= Math.max(1, len); iz /= Math.max(1, len);
      // camera basis: forward F = (-sin(yaw), -cos(yaw)), right R = (cos(yaw), -sin(yaw))
      const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
      const vx = (ix * cos + iz * sin) * CFG.PLAYER_SPEED * dt;
      const vz = (-ix * sin + iz * cos) * CFG.PLAYER_SPEED * dt;
      this.moveWithCollision(vx, vz);
      this.bob += dt * 9;
    }
    const bobY = moving ? Math.sin(this.bob) * 0.055 : 0;
    this.camera.position.set(this.pos.x, CFG.EYE + bobY, this.pos.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  moveWithCollision(vx, vz) {
    const r = CFG.PLAYER_R, C = CFG.CELL;
    const tryAxis = (nx, nz) => {
      // check the 4 corners of the player circle against solid cells
      for (const [ox, oz] of [[r, r], [r, -r], [-r, r], [-r, -r]]) {
        const cx = worldToCellX(nx + ox), cz = worldToCellZ(nz + oz);
        if (this.world.isSolid(cx, cz)) {
          const minX = cellToWorldX(cx) - C / 2, maxX = cellToWorldX(cx) + C / 2;
          const minZ = cellToWorldZ(cz) - C / 2, maxZ = cellToWorldZ(cz) + C / 2;
          if (nx + r > minX && nx - r < maxX && nz + r > minZ && nz - r < maxZ) return false;
        }
      }
      return true;
    };
    const nx = this.pos.x + vx;
    if (tryAxis(nx, this.pos.z)) this.pos.x = nx;
    const nz = this.pos.z + vz;
    if (tryAxis(this.pos.x, nz)) this.pos.z = nz;
  }
}
