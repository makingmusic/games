// First-person renderer: raycast walls (trees + map edge) and billboard sprites.
// The simulation stays purely 2D top-down; this file only draws what the player
// sees through their own eyes. Core math (fpCast, fpProject) is DOM-free and
// unit-tested in test/fp.js.
var G = globalThis.G || (globalThis.G = {});

(function () {
  const C = () => G.CONFIG, U = G.U;

  const EYE_H = 40;          // eye height above ground in world px (a kid)
  const COL_W = 2;           // raycast column width in css px

  // ---------------------------------------------------------------- raycast (pure)
  // Smallest positive t where ray o+t*d hits circle c, or Infinity.
  function rayCircle(ox, oy, dx, dy, cx, cy, r) {
    const lx = cx - ox, ly = cy - oy;
    const tca = lx * dx + ly * dy;
    if (tca < 0) return Infinity;
    const d2 = lx * lx + ly * ly - tca * tca;
    const r2 = r * r;
    if (d2 > r2) return Infinity;
    const thc = Math.sqrt(r2 - d2);
    const t = tca - thc;
    return t > 0 ? t : Infinity;
  }
  G.fpRayCircle = rayCircle;

  // Cast one ray through the solid grid (trees are the walls of the forest).
  // Returns { dist, solid|null, edge:bool }.
  G.fpCast = function (st, px, py, ang, maxDist) {
    const c = C(), cell = c.TILE * 4;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    // map border walls
    let edgeT = Infinity;
    if (dx > 1e-9) edgeT = Math.min(edgeT, ((c.MAP_W - 1) * c.TILE - px) / dx);
    if (dx < -1e-9) edgeT = Math.min(edgeT, (8 - px) / dx);
    if (dy > 1e-9) edgeT = Math.min(edgeT, ((c.MAP_H - 1) * c.TILE - py) / dy);
    if (dy < -1e-9) edgeT = Math.min(edgeT, (8 - py) / dy);

    let cx = Math.floor(px / cell), cy = Math.floor(py / cell);
    const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1;
    const tDeltaX = Math.abs(dx) > 1e-9 ? Math.abs(cell / dx) : Infinity;
    const tDeltaY = Math.abs(dy) > 1e-9 ? Math.abs(cell / dy) : Infinity;
    let tMaxX = Math.abs(dx) > 1e-9 ? ((dx > 0 ? (cx + 1) * cell - px : px - cx * cell) / Math.abs(dx)) : Infinity;
    let tMaxY = Math.abs(dy) > 1e-9 ? ((dy > 0 ? (cy + 1) * cell - py : py - cy * cell) / Math.abs(dy)) : Infinity;

    let bestT = Math.min(maxDist, edgeT), best = null;
    for (let guard = 0; guard < 64; guard++) {
      const g = st.solidGrid[cx + ',' + cy];
      if (g) for (const s of g) {
        if (s.kind !== 'tree') continue;
        const t = rayCircle(px, py, dx, dy, s.x, s.y, s.r + 6); // canopy reads wider than the trunk
        if (t < bestT) { bestT = t; best = s; }
      }
      const tNext = Math.min(tMaxX, tMaxY);
      if (best && bestT <= tNext) break;      // hit inside this cell: nothing nearer can win
      if (tNext > bestT || tNext > maxDist) break;
      if (tMaxX < tMaxY) { tMaxX += tDeltaX; cx += stepX; }
      else { tMaxY += tDeltaY; cy += stepY; }
    }
    if (best) return { dist: bestT, solid: best, edge: false };
    if (edgeT <= maxDist) return { dist: edgeT, solid: null, edge: true };
    return { dist: maxDist, solid: null, edge: false };
  };

  // Project a world point to screen. Returns null when behind/too far, else
  // { sx, dist, scale } where scale = px on screen per world px.
  G.fpProject = function (px, py, facing, x, y, vw, focal, maxDist) {
    const dx = x - px, dy = y - py;
    const dist = Math.hypot(dx, dy);
    if (dist < 2 || dist > maxDist) return null;
    const rel = U.angDiff(facing, Math.atan2(dy, dx));
    if (Math.abs(rel) > Math.PI / 2 + 0.2) return null; // behind the eye
    const sx = vw / 2 + Math.tan(rel) * focal;
    return { sx, dist, rel, scale: focal / dist };
  };

  // ---------------------------------------------------------------- rendering (browser)
  let B = null;          // baked sprites (lazy)
  let zbuf = null;       // per-column wall depth
  let dark = null, darkCtx = null;

  const TREE_CANOPY = { oak: [61, 148, 80], pine: [47, 122, 77], jungle: [45, 138, 78] };
  const TRUNK = [107, 79, 55];
  const EDGE_COL = [30, 45, 34];

  function shade(rgb, f) {
    return `rgb(${Math.min(255, rgb[0] * f) | 0},${Math.min(255, rgb[1] * f) | 0},${Math.min(255, rgb[2] * f) | 0})`;
  }
  function hexRgb(hex) {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  }

  G.fpRender = function (ctx, st, vw, vh) {
    const c = C(), p = st.player, t = st.time || 0;
    if (!B && typeof document !== 'undefined' && G.bakeSprites) B = G.bakeSprites();
    const fov = c.FP_FOV, focal = (vw / 2) / Math.tan(fov / 2);
    const maxDist = c.FP_VIEW_DIST;
    const bob = p.moving ? Math.sin((p.walk || 0) * 2) * 3 : 0;
    const horizon = vh * 0.52 + bob;
    const night = G.nightAlpha ? G.nightAlpha(st) : 0;
    const dayLight = 1 - night * 0.75;

    // ---- sky ----
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    if (night > 0.5) { sky.addColorStop(0, '#0c1026'); sky.addColorStop(1, '#232a4d'); }
    else { sky.addColorStop(0, '#7ec8ee'); sky.addColorStop(1, '#cfeef7'); }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, vw, horizon + 1);
    // stars at night (deterministic)
    if (night > 0.25) {
      ctx.fillStyle = `rgba(255,255,255,${0.8 * night})`;
      for (let i = 0; i < 70; i++) {
        const hx = ((i * 733) % 997) / 997 * vw;
        const hy = ((i * 389) % 541) / 541 * horizon * 0.85;
        if (((i * 61) % 10) / 10 < night) ctx.fillRect(hx, hy, 2, 2);
      }
    }
    // sun / moon on fixed world bearings so you can tell east from west
    drawOrb(ctx, st, vw, focal, maxDist, horizon, 0.9, '#ffd76e', 26, 1 - night);   // sun, east-ish
    drawOrb(ctx, st, vw, focal, maxDist, horizon, 2.6, '#e8ecf4', 18, night);       // moon

    // ---- floor ----
    const biome = G.biomeAt(Math.floor(p.x / c.TILE), Math.floor(p.y / c.TILE));
    const pal = (G.TILE_COLORS && G.TILE_COLORS[biome]) || ['#69b04f'];
    const fg = hexRgb(pal[0]);
    const fl = ctx.createLinearGradient(0, horizon, 0, vh);
    fl.addColorStop(0, shade(fg, 0.55 * dayLight + 0.1));
    fl.addColorStop(1, shade(fg, 1.05 * dayLight + 0.08));
    ctx.fillStyle = fl;
    ctx.fillRect(0, horizon, vw, vh - horizon);

    // ---- walls ----
    const n = Math.ceil(vw / COL_W);
    if (!zbuf || zbuf.length < n) zbuf = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const camX = ((i + 0.5) / n) * 2 - 1;
      const ang = p.facing + Math.atan(camX * Math.tan(fov / 2));
      const hit = G.fpCast(st, p.x, p.y, ang, maxDist);
      const dist = Math.max(1, hit.dist * Math.cos(ang - p.facing)); // fisheye fix
      zbuf[i] = hit.solid || hit.edge ? dist : Infinity;
      if (!hit.solid && !hit.edge) continue;
      const hWorld = hit.edge ? c.FP_TREE_H * 1.4 : c.FP_TREE_H;
      const hPx = Math.min(vh * 4, hWorld * focal / dist);
      const yBot = horizon + EYE_H * focal / dist;   // ground line at this distance
      const yTop = yBot - hPx;
      const fog = U.clamp(1.15 - dist / maxDist, 0.25, 1) * dayLight;
      const canopy = hit.edge ? EDGE_COL : (TREE_CANOPY[hit.solid.tkind] || TREE_CANOPY.oak);
      const x = i * COL_W;
      ctx.fillStyle = shade(canopy, fog);
      ctx.fillRect(x, yTop, COL_W + 0.5, yBot - yTop);
      // trunk at the bottom of the tree
      ctx.fillStyle = shade(TRUNK, fog * 0.9);
      ctx.fillRect(x, yBot - (yBot - yTop) * 0.16, COL_W + 0.5, (yBot - yTop) * 0.16);
      // snow cap on pines
      if (hit.solid && hit.solid.tkind === 'pine') {
        ctx.fillStyle = shade([238, 245, 250], fog);
        ctx.fillRect(x, yTop, COL_W + 0.5, (yBot - yTop) * 0.08);
      }
    }

    // ---- billboards, far to near ----
    const items = [];
    const push = (x, y, spr, opt) => {
      const pr = G.fpProject(p.x, p.y, p.facing, x, y, vw, focal, maxDist);
      if (!pr || Math.abs(pr.rel) > fov / 2 + 0.4) return;
      items.push(Object.assign({ spr, x, y }, pr, opt));
    };
    for (const b of st.bushes) push(b.x, b.y, b.ripe ? B.bushRipe : B.bushBare);
    for (const s of st.scrapPiles) if (!s.taken) push(s.x, s.y, B.scrap);
    for (const d of st.groveDiamonds) push(d.x, d.y, B.diamond, { bob: 3 });
    for (const d of st.drops) push(d.x, d.y, B.drop[d.item] || B.drop.wood, { bob: 4 });
    if (st.backpack) push(st.backpack.x, st.backpack.y, B.backpack);
    for (const tp of st.temples) push(tp.x, tp.y, tp.big ? B.templeBig : B.temple);
    for (const cage of st.cages) {
      const kid = st.kids.find(k => k.id === cage.kid);
      if (!kid.rescued) push(cage.x, cage.y, B.cage[cage.kid]);
    }
    for (const k of st.kids) if (k.rescued) push(k.x, k.y, B.kid[k.id], { bob: 2 });
    push(st.signpost.x, st.signpost.y, B.signpost);
    push(st.traders.feather.x, st.traders.feather.y, B.traderFeather);
    push(st.traders.pelt.x, st.traders.pelt.y, B.traderPelt);
    for (const a of st.animals) push(a.x, a.y, B.animal[a.type], { actor: a });
    for (const cu of st.cultists) push(cu.x, cu.y, B.cultist);
    push(st.cat.x, st.cat.y, catSprite(st), { cat: true });
    // fires are animated: drawn with a callback instead of a baked sprite
    push(st.fire.x, st.fire.y, null, { fire: st.fire.level, camp: true });
    for (const kf of st.kidFires) push(kf.x, kf.y, null, { fire: kf.level });
    items.sort((a, b) => b.dist - a.dist);

    for (const it of items) {
      // occluded by a tree wall? sample the depth buffer across the sprite
      const wPx = (it.spr ? it.spr.w : 46) * it.scale;
      const c0 = U.clamp(Math.floor((it.sx - wPx / 2) / COL_W), 0, n - 1);
      const c1 = U.clamp(Math.floor((it.sx + wPx / 2) / COL_W), 0, n - 1);
      let vis = 0, tot = 0;
      for (let ci = c0; ci <= c1; ci += Math.max(1, Math.floor((c1 - c0) / 4))) { tot++; if (zbuf[ci] > it.dist * 0.92) vis++; }
      if (tot > 0 && vis / tot < 0.34) continue;
      const lift = (it.bob ? Math.abs(Math.sin(t * 4 + it.x)) * it.bob : 0) + (it.cat ? 14 : 0);
      const yBot = horizon + (EYE_H - lift) * it.scale;
      if (it.fire !== undefined) {
        const s = it.scale * (0.6 + Math.max(0, it.fire) / 6);
        ctx.save();
        ctx.translate(it.sx, yBot);
        ctx.scale(s, s);
        ctx.translate(0, -8);
        G.drawFireShape(ctx, 0, 0, it.fire, t, it.camp);
        ctx.restore();
        continue;
      }
      const hPx = it.spr.h * it.scale;
      ctx.drawImage(it.spr.cv, it.sx - wPx / 2, yBot - hPx, wPx, hPx);
      // a touch of night dimming on far sprites
      if (night > 0.05) {
        const dim = night * U.clamp(it.dist / (maxDist * 0.5), 0, 0.75);
        if (dim > 0.04) {
          ctx.fillStyle = `rgba(14,16,44,${dim})`;
          ctx.fillRect(it.sx - wPx / 2, yBot - hPx, wPx, hPx);
        }
      }
      if (it.cat) drawCatMood(ctx, st, it, yBot - hPx);
    }

    // ---- floating fx texts / poofs ----
    for (const f of st.fx) {
      const pr = G.fpProject(p.x, p.y, p.facing, f.x, f.y, vw, focal, maxDist);
      if (!pr || Math.abs(pr.rel) > fov / 2 + 0.2) continue;
      const a = 1 - f.t / f.life;
      const sy = horizon + (EYE_H - 46) * pr.scale - f.t * 20;
      if (f.kind === 'text') {
        ctx.globalAlpha = a;
        ctx.font = `bold ${U.clamp(14 * pr.scale, 10, 30)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 3;
        ctx.strokeText(f.text, pr.sx, sy);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, pr.sx, sy);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = f.kind === 'poof' ? `rgba(240,240,255,${a * 0.8})` : `rgba(255,224,102,${a})`;
        ctx.beginPath(); ctx.arc(pr.sx, sy, (f.kind === 'poof' ? 6 + f.t * 40 : 8) * Math.min(2, pr.scale), 0, 7); ctx.fill();
      }
    }

    drawDarknessFP(ctx, st, vw, vh, focal, maxDist, night);
    drawViewmodel(ctx, st, vw, vh, t);

    // crosshair
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath(); ctx.arc(vw / 2, vh * 0.52 + bob, 2.5, 0, 7); ctx.fill();
  };

  function drawOrb(ctx, st, vw, focal, maxDist, horizon, bearing, color, r, alpha) {
    if (alpha < 0.15) return;
    const p = st.player;
    const rel = U.angDiff(p.facing, bearing);
    if (Math.abs(rel) > C().FP_FOV / 2 + 0.2) return;
    const sx = vw / 2 + Math.tan(rel) * focal;
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(sx, horizon * 0.35, r, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function catSprite(st) {
    const cat = st.cat;
    const dbg = G.catDebug;
    let state = cat.state, beamT = cat.beamT || 0;
    if (dbg) {
      if (dbg.beam) beamT = 1;
      if (dbg.stateOverride && dbg.stateOverride !== 'off' && dbg.stateOverride !== 'guardWake') state = dbg.stateOverride;
      if (dbg && dbg.stateOverride === 'guardWake') state = 'guard';
    }
    const asleep = state === 'asleep' || (state === 'guard' && (cat.wakeT || 0) <= 0);
    const covering = state === 'shooed' || beamT > 0.15;
    const img = covering && G.catShooImg ? G.catShooImg : asleep && G.catSleepImg ? G.catSleepImg : G.catImg;
    if (img) return { cv: img, w: C().CAT_SIZE.w, h: C().CAT_SIZE.h };
    return covering ? B.catFallbackShoo : asleep ? B.catFallbackSleep : B.catFallback;
  }

  function drawCatMood(ctx, st, it, yTop) {
    const cat = st.cat, t = st.time || 0;
    const s = Math.min(2.2, it.scale);
    ctx.textAlign = 'center';
    if (cat.state === 'stalk') {
      ctx.font = `bold ${26 * s}px sans-serif`;
      ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 3;
      ctx.strokeText('!', it.sx, yTop - 8);
      ctx.fillStyle = '#ff5f5f';
      ctx.fillText('!', it.sx, yTop - 8);
    } else if (cat.state === 'asleep' || (cat.state === 'guard' && (cat.wakeT || 0) <= 0)) {
      ctx.font = `bold ${18 * s}px sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.fillText('Z z z', it.sx + Math.sin(t * 0.8) * 6, yTop - 6 - (t * 8 % 14));
    } else if ((cat.beamT || 0) > 0.15 && cat.state !== 'shooed') {
      ctx.font = `bold ${18 * s}px sans-serif`;
      ctx.fillStyle = '#ffd76e';
      ctx.fillText('✨', it.sx, yTop - 8);
    }
  }

  // Night: the world goes dark except your little glow, your flashlight beam,
  // and warm lights you can actually see (fires, trader lanterns, temples).
  function drawDarknessFP(ctx, st, vw, vh, focal, maxDist, night) {
    const c = C(), p = st.player;
    if (night <= 0.02) {
      const g = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.5, vw / 2, vh / 2, Math.max(vw, vh) * 0.8);
      g.addColorStop(0, 'rgba(20,30,20,0)'); g.addColorStop(1, 'rgba(20,30,20,.18)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh);
      return;
    }
    if (!dark) { dark = document.createElement('canvas'); darkCtx = dark.getContext('2d'); }
    if (dark.width !== vw || dark.height !== vh) { dark.width = vw; dark.height = vh; }
    const d = darkCtx;
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.clearRect(0, 0, vw, vh);
    d.fillStyle = `rgba(14,16,44,${night})`;
    d.fillRect(0, 0, vw, vh);
    d.globalCompositeOperation = 'destination-out';
    const lb = 1 + p.lanterns * c.LANTERN_BONUS;
    const f = G.flashParams(st);
    // your own little glow (never blind), bigger with a torch
    const glowR = (p.torchT > 0 ? 0.62 : 0.34) * lb;
    let g = d.createRadialGradient(vw / 2, vh / 2, 10, vw / 2, vh / 2, Math.min(vw, vh) * glowR);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = g; d.beginPath(); d.arc(vw / 2, vh / 2, Math.min(vw, vh) * glowR, 0, 7); d.fill();
    // flashlight: a bright cone straight ahead
    if (f.on) {
      const R = Math.min(vw, vh) * 0.95;
      g = d.createRadialGradient(vw / 2, vh / 2, 20, vw / 2, vh / 2, R);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,.95)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g; d.beginPath(); d.arc(vw / 2, vh / 2, R, 0, 7); d.fill();
    }
    // visible warm lights punch holes where they appear on screen
    const holeAt = (x, y, rWorld) => {
      const pr = G.fpProject(p.x, p.y, p.facing, x, y, vw, focal, maxDist);
      if (!pr || Math.abs(pr.rel) > c.FP_FOV / 2 + 0.3) return;
      const r = U.clamp(rWorld * pr.scale, 10, vh);
      const sy = vh / 2;
      const gg = d.createRadialGradient(pr.sx, sy, r * 0.2, pr.sx, sy, r);
      gg.addColorStop(0, 'rgba(0,0,0,.9)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = gg; d.beginPath(); d.arc(pr.sx, sy, r, 0, 7); d.fill();
    };
    if (st.fire.level > 0) holeAt(st.fire.x, st.fire.y, c.FIRE_LIGHT_R * st.fire.level * lb + 20);
    for (const kf of st.kidFires) holeAt(kf.x, kf.y, c.FIRE_LIGHT_R * 2.4);
    holeAt(st.traders.feather.x, st.traders.feather.y, 70);
    holeAt(st.traders.pelt.x, st.traders.pelt.y, 70);
    for (const tp of st.temples) holeAt(tp.x, tp.y, tp.big ? 110 : 80);
    if (st.gathering.active) { const big = st.temples.find(x => x.big); if (big) holeAt(big.x, big.y, 180); }
    d.globalCompositeOperation = 'source-over';
    ctx.drawImage(dark, 0, 0);
  }

  // Your hands/weapon at the bottom of the screen, swinging on Bonk.
  function drawViewmodel(ctx, st, vw, vh, t) {
    const p = st.player;
    const swing = p.swingT > 0 ? Math.sin((1 - p.swingT / 0.22) * Math.PI) : 0;
    const bobX = p.moving ? Math.sin(p.walk || 0) * 5 : 0;
    const bobY = p.moving ? Math.abs(Math.cos(p.walk || 0)) * 4 : 0;
    const bx = vw * 0.68 + bobX + swing * -vw * 0.18;
    const by = vh + 30 + bobY - swing * vh * 0.22;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(-0.5 - swing * 0.9);
    if (p.weapon === 'hands') {
      ctx.fillStyle = '#ffd1a8';
      ctx.beginPath(); ctx.arc(0, -30, 17, 0, 7); ctx.fill(); // fist
      ctx.fillStyle = '#ff8c69';
      ctx.fillRect(-14, -26, 28, 60); // sleeve
    } else {
      ctx.fillStyle = '#8a6239';
      ctx.fillRect(-5, -110, 12, 150); // handle
      ctx.fillStyle = p.weapon === 'ice' ? '#9fe3ff' : '#c9d6df';
      ctx.beginPath(); ctx.moveTo(-22, -128); ctx.lineTo(26, -110); ctx.lineTo(-22, -88); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd1a8';
      ctx.beginPath(); ctx.arc(1, -32, 13, 0, 7); ctx.fill(); // gripping hand
    }
    ctx.restore();
    // torch glow at the edge of the screen
    if (p.torchT > 0) {
      const g = ctx.createRadialGradient(vw * 0.2, vh * 0.9, 10, vw * 0.2, vh * 0.9, vh * 0.5);
      g.addColorStop(0, 'rgba(255,180,80,.28)'); g.addColorStop(1, 'rgba(255,180,80,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh);
      ctx.save();
      ctx.translate(vw * 0.16, vh + 20 + bobY);
      ctx.fillStyle = '#6b4f37'; ctx.fillRect(-4, -120, 9, 130);
      ctx.fillStyle = '#ffb347';
      ctx.beginPath(); ctx.ellipse(0, -130, 9, 16 + Math.sin(t * 9) * 3, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd76e';
      ctx.beginPath(); ctx.ellipse(0, -126, 5, 9 + Math.sin(t * 11) * 2, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
    // flashlight body peeking in when it's on
    const f = G.flashParams(st);
    if (f.on) {
      ctx.save();
      ctx.translate(vw * 0.9, vh + 16 + bobY);
      ctx.rotate(0.5);
      ctx.fillStyle = '#4a5560'; ctx.fillRect(-11, -70, 22, 90);
      ctx.fillStyle = '#ffd76e'; ctx.fillRect(-13, -78, 26, 12);
      ctx.restore();
    }
  }
})();
