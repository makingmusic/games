// Renderer: procedural cartoon sprites + night darkness. DOM-free math, draws on a 2D ctx.
var G = globalThis.G || (globalThis.G = {});

(function () {
  const C = () => G.CONFIG, U = G.U;
  let dark = null, darkCtx = null;

  const TILE_COLORS = {
    forest: ['#69b04f', '#61a849', '#71b655'],
    jungle: ['#3f9e4d', '#389345', '#46a755'],
    snow: ['#e6eef5', '#dfe9f2', '#edf3f8'],
    lava: ['#5a4a45', '#52433f', '#61515b'],
    grove: ['#8fd08a', '#86c880', '#97d894'],
    camp: ['#c2915f', '#b98a5e', '#c9975f'],
    edge: '#2f4436',
  };

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---------------------------------------------------------------- ground
  G.drawGround = function (ctx, st, cam, vw, vh) {
    const c = C(), T = c.TILE;
    const x0 = Math.floor((cam.x - vw / 2) / T) - 1, x1 = Math.ceil((cam.x + vw / 2) / T) + 1;
    const y0 = Math.floor((cam.y - vh / 2) / T) - 1, y1 = Math.ceil((cam.y + vh / 2) / T) + 1;
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const b = G.tileAt(st, tx, ty);
      const pal = TILE_COLORS[b] || TILE_COLORS.forest;
      const sh = st.tileShade[((ty + 6000) % c.MAP_H) * c.MAP_W + ((tx + 6000) % c.MAP_W)] || 0;
      ctx.fillStyle = pal[Math.floor(sh * pal.length) % pal.length];
      ctx.fillRect(tx * T, ty * T, T + 1, T + 1);
    }
    // decorations
    for (const d of st.deco) {
      if (Math.abs(d.x - cam.x) > vw / 2 + 40 || Math.abs(d.y - cam.y) > vh / 2 + 40) continue;
      if (d.kind === 'lavarock') {
        ctx.fillStyle = '#2d2320';
        ctx.beginPath(); ctx.ellipse(d.x, d.y, 12 * d.s, 8 * d.s, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#ff7a3d';
        ctx.fillRect(d.x - 6 * d.s, d.y - 1, 12 * d.s, 2);
      } else if (d.kind === 'flower') {
        ctx.fillStyle = ['#ffd1dc', '#ffe9a8', '#cdb4f9'][Math.floor(d.x) % 3];
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(d.x + Math.cos(i * 1.57) * 3, d.y + Math.sin(i * 1.57) * 3, 2.4, 0, 7); ctx.fill(); }
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(d.x, d.y, 1.6, 0, 7); ctx.fill();
      }
    }
  };

  // ---------------------------------------------------------------- props
  G.drawProps = function (ctx, st, cam, vw, vh) {
    const c = C(), t = st.time || 0;
    const vis = (x, y, m) => Math.abs(x - cam.x) < vw / 2 + (m || 60) && Math.abs(y - cam.y) < vh / 2 + (m || 60);

    // scrap piles
    for (const s of st.scrapPiles) {
      if (!vis(s.x, s.y) || s.taken) continue;
      ctx.fillStyle = '#8d99a6';
      ctx.beginPath(); ctx.ellipse(s.x, s.y, 14, 9, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#b7c2cd';
      ctx.fillRect(s.x - 7, s.y - 6, 5, 4); ctx.fillRect(s.x + 2, s.y - 8, 6, 5);
      ctx.fillStyle = '#ffce54'; ctx.fillRect(s.x - 2, s.y - 2, 4, 4);
    }
    // grape bushes (§4)
    for (const b of st.bushes) {
      if (!vis(b.x, b.y)) continue;
      ctx.fillStyle = '#3e8e55';
      ctx.beginPath(); ctx.ellipse(b.x, b.y, 15, 11, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#357c4a';
      ctx.beginPath(); ctx.ellipse(b.x - 5, b.y - 4, 7, 5, 0, 0, 7); ctx.fill();
      if (b.ripe) {
        ctx.fillStyle = '#a06cd5';
        const pts = [[-8, -2], [-2, -6], [5, -3], [9, 2], [0, 3], [-5, 5]];
        for (const [dx, dy] of pts) { ctx.beginPath(); ctx.arc(b.x + dx, b.y + dy, 3, 0, 7); ctx.fill(); }
        if (Math.sin(t * 3 + b.id) > 0.7) { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(b.x + 9, b.y - 5, 1.8, 0, 7); ctx.fill(); }
      } else {
        ctx.fillStyle = '#cfe8c9';
        for (const [dx, dy] of [[-6, -2], [2, -4], [7, 2]]) { ctx.beginPath(); ctx.arc(b.x + dx, b.y + dy, 1.4, 0, 7); ctx.fill(); }
      }
    }
    // trees
    for (const tr of st.trees) {
      if (!vis(tr.x, tr.y, 80)) continue;
      const wob = Math.sin(t * 1.2 + tr.x) * 1.5;
      if (tr.tkind === 'pine') {
        ctx.fillStyle = '#6b4f37'; ctx.fillRect(tr.x - 3, tr.y - 8, 6, 16);
        ctx.fillStyle = '#2f7a4d';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(tr.x, tr.y - 44 + i * 12 + wob);
          ctx.lineTo(tr.x - 14 + i * 3, tr.y - 20 + i * 10);
          ctx.lineTo(tr.x + 14 - i * 3, tr.y - 20 + i * 10);
          ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = '#eef5fa';
        ctx.beginPath(); ctx.ellipse(tr.x, tr.y - 42 + wob, 8, 3, 0, 0, 7); ctx.fill();
      } else if (tr.tkind === 'jungle') {
        ctx.fillStyle = '#7a5230'; ctx.fillRect(tr.x - 3, tr.y - 14, 6, 22);
        ctx.fillStyle = '#2d8a4e';
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * Math.PI * 2 + 0.3;
          ctx.beginPath(); ctx.ellipse(tr.x + Math.cos(a) * 15, tr.y - 18 + Math.sin(a) * 7, 12, 5, a, 0, 7); ctx.fill();
        }
        ctx.fillStyle = '#c9a7ff'; ctx.beginPath(); ctx.arc(tr.x, tr.y - 20, 3, 0, 7); ctx.fill();
      } else {
        ctx.fillStyle = '#7a5230'; ctx.fillRect(tr.x - 4, tr.y - 10, 8, 18);
        ctx.fillStyle = '#3d9450';
        ctx.beginPath(); ctx.arc(tr.x - 9 + wob, tr.y - 22, 14, 0, 7); ctx.arc(tr.x + 9 + wob, tr.y - 22, 14, 0, 7); ctx.arc(tr.x + wob, tr.y - 34, 15, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.14)';
        ctx.beginPath(); ctx.arc(tr.x - 5 + wob, tr.y - 30, 6, 0, 7); ctx.fill();
      }
      if (tr.hp > 0 && tr.hp < 5) { ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('chop…', tr.x, tr.y - 48); }
    }
    // temples
    for (const tp of st.temples) {
      if (!vis(tp.x, tp.y, 100)) continue;
      const s = tp.big ? 1.6 : 1;
      ctx.fillStyle = '#9aa2ab';
      rr(ctx, tp.x - 34 * s, tp.y - 26 * s, 68 * s, 46 * s, 6); ctx.fill();
      ctx.fillStyle = '#848d98';
      rr(ctx, tp.x - 26 * s, tp.y - 40 * s, 52 * s, 20 * s, 5); ctx.fill();
      ctx.fillStyle = '#767f8a';
      for (let i = 0; i < 3; i++) ctx.fillRect(tp.x - 20 * s + i * 15 * s, tp.y + 4 * s, 10 * s, 12 * s);
      if (tp.big) {
        // fountain
        ctx.fillStyle = '#bfe8ff';
        ctx.beginPath(); ctx.ellipse(tp.x, tp.y - 2, 20, 12, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#7fd4ff';
        ctx.beginPath(); ctx.ellipse(tp.x + Math.sin(t * 2) * 3, tp.y - 4, 10, 6, 0, 0, 7); ctx.fill();
        if (st.gathering.active) {
          ctx.strokeStyle = '#7be0a2'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(tp.x, tp.y - 10, 26 + Math.sin(t * 3) * 4, 0, 7); ctx.stroke();
        }
      } else if (!tp.looted) {
        const glow = 0.6 + Math.sin(t * 3) * 0.3;
        ctx.fillStyle = `rgba(123,224,162,${glow})`;
        rr(ctx, tp.x - 5, tp.y - 14, 10, 16, 3); ctx.fill();
        ctx.fillStyle = '#3f7d5c'; ctx.fillRect(tp.x - 2, tp.y - 18, 4, 4);
      }
    }
    // kid cages + kids inside (§11)
    for (const cage of st.cages) {
      if (!vis(cage.x, cage.y)) continue;
      const kid = st.kids.find(k => k.id === cage.kid);
      if (!kid.rescued) {
        G.drawKid(ctx, cage.x, cage.y - 6, kid.id, t, false);
        ctx.strokeStyle = '#c9a15f'; ctx.lineWidth = 3;
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(cage.x + i * 8, cage.y - 26); ctx.lineTo(cage.x + i * 8, cage.y + 14); ctx.stroke(); }
        ctx.strokeStyle = '#a8813f';
        ctx.strokeRect(cage.x - 20, cage.y - 26, 40, 40);
        if (cage.taps > 0) { ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('snip! ' + cage.taps + '/3', cage.x, cage.y - 34); }
      }
    }
    // old campfires at kid spots
    for (const kf of st.kidFires) {
      if (!vis(kf.x, kf.y)) continue;
      drawFire(ctx, kf.x, kf.y, kf.level, t, false);
    }
    // signpost board
    if (vis(st.signpost.x, st.signpost.y)) {
      const sp = st.signpost;
      ctx.fillStyle = '#8a6239'; ctx.fillRect(sp.x - 3, sp.y - 26, 6, 34);
      ctx.fillStyle = '#a97c4f'; rr(ctx, sp.x - 30, sp.y - 44, 60, 26, 4); ctx.fill();
      ctx.fillStyle = '#5d4326'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('KIDS', sp.x, sp.y - 33); ctx.fillText('→ ←', sp.x, sp.y - 23);
    }
    // traders (§12)
    drawFeatherTrader(ctx, st.traders.feather.x, st.traders.feather.y, t);
    drawPeltTrader(ctx, st.traders.pelt.x, st.traders.pelt.y, t);
    // the campfire (§13)
    drawFire(ctx, st.fire.x, st.fire.y, st.fire.level, t, true);
    if (Math.floor(st.fire.level) >= C().FIRE_MAX_LEVEL) {
      ctx.fillStyle = '#ffb347'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('COZY!', st.fire.x, st.fire.y - 58 + Math.sin(t * 2) * 3);
    }
    // grove diamonds
    for (const d of st.groveDiamonds) {
      if (!vis(d.x, d.y)) continue;
      const s = 1 + Math.sin(t * 4 + d.x) * 0.15;
      ctx.fillStyle = '#7fe3ff';
      ctx.beginPath(); ctx.moveTo(d.x, d.y - 8 * s); ctx.lineTo(d.x + 6 * s, d.y); ctx.lineTo(d.x, d.y + 8 * s); ctx.lineTo(d.x - 6 * s, d.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(d.x - 1, d.y - 3, 1.5, 0, 7); ctx.fill();
    }
    // drops
    for (const d of st.drops) {
      if (!vis(d.x, d.y)) continue;
      const bob = Math.sin(t * 5 + d.x) * 3;
      const col = ({ wood: '#a97c4f', scrap: '#b7c2cd', fur: '#ff9f43', pelt: '#d8a860', diamond: '#7fe3ff', morsel: '#f0c060', steak: '#e07a5f', csteak: '#a0522d', bfoot: '#ffd1dc', grape: '#a06cd5', brew: '#7be0a2', fuel: '#ffce54', battery: '#8ee6a8', torch: '#ffb347' })[d.item] || '#fff';
      ctx.fillStyle = col;
      rr(ctx, d.x - 7, d.y - 7 + bob, 14, 14, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.arc(d.x - 2, d.y - 3 + bob, 2, 0, 7); ctx.fill();
    }
    // story-mode dropped backpack (§7)
    if (st.backpack && vis(st.backpack.x, st.backpack.y)) {
      const bp = st.backpack;
      ctx.fillStyle = '#c0392b'; rr(ctx, bp.x - 14, bp.y - 12, 28, 24, 7); ctx.fill();
      ctx.fillStyle = '#8e2b20'; rr(ctx, bp.x - 8, bp.y - 20, 16, 12, 4); ctx.fill();
      ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('your stuff!', bp.x, bp.y - 26 + Math.sin(t * 3) * 2);
    }
  };

  function drawFire(ctx, x, y, level, t, isCamp) {
    ctx.fillStyle = '#7d8590';
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 16, y + Math.sin(a) * 10, 4, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#6b4f37';
    ctx.fillRect(x - 10, y + 2, 20, 5);
    const lv = Math.max(0, level);
    if (lv > 0.05) {
      const h = 8 + lv * 7 + Math.sin(t * 8) * 2;
      ctx.fillStyle = '#ff9f43';
      ctx.beginPath(); ctx.moveTo(x - 9, y); ctx.quadraticCurveTo(x - 6, y - h * 0.7, x + Math.sin(t * 6) * 3, y - h);
      ctx.quadraticCurveTo(x + 7, y - h * 0.6, x + 9, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd76e';
      ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.quadraticCurveTo(x - 3, y - h * 0.45, x + Math.sin(t * 9) * 2, y - h * 0.6);
      ctx.quadraticCurveTo(x + 4, y - h * 0.35, x + 5, y); ctx.closePath(); ctx.fill();
      if (isCamp) {
        ctx.fillStyle = 'rgba(255,180,80,.25)';
        ctx.beginPath(); ctx.arc(x, y, 26 + lv * 4, 0, 7); ctx.fill();
      }
    }
  }

  function drawFeatherTrader(ctx, x, y, t) {
    const bob = Math.sin(t * 2) * 2;
    ctx.fillStyle = '#a97c4f'; ctx.fillRect(x - 24, y + 6, 48, 22); // stall
    ctx.fillStyle = '#8a6239'; ctx.fillRect(x - 24, y + 6, 48, 4);
    ctx.fillStyle = '#ffe08a'; // bird
    ctx.beginPath(); ctx.ellipse(x, y - 8 + bob, 13, 15, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#f5a623'; ctx.beginPath(); ctx.moveTo(x + 10, y - 12 + bob); ctx.lineTo(x + 20, y - 8 + bob); ctx.lineTo(x + 10, y - 5 + bob); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff6b81'; ctx.beginPath(); ctx.arc(x + 6, y - 14 + bob, 2, 0, 7); ctx.fill();
    ctx.fillStyle = '#7be0a2'; // feather crest
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x - 4 + i * 4, y - 24 + bob - i, 3, 8, 0.4, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#4a90d9'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('fur → fuel', x, y + 22);
  }

  function drawPeltTrader(ctx, x, y, t) {
    const bob = Math.sin(t * 2.3) * 2;
    ctx.fillStyle = '#a97c4f'; ctx.fillRect(x - 24, y + 6, 48, 22);
    ctx.fillStyle = '#9b9b9b'; // raccoon
    ctx.beginPath(); ctx.ellipse(x, y - 8 + bob, 14, 15, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#333'; // vest (§12 raccoon in a vest)
    ctx.fillRect(x - 12, y - 14 + bob, 7, 14); ctx.fillRect(x + 5, y - 14 + bob, 7, 14);
    ctx.fillStyle = '#9b9b9b'; ctx.beginPath(); ctx.arc(x, y - 20 + bob, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#3d3d3d'; // mask
    ctx.beginPath(); ctx.ellipse(x - 4, y - 21 + bob, 3.4, 2.6, 0, 0, 7); ctx.ellipse(x + 4, y - 21 + bob, 3.4, 2.6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 4, y - 21 + bob, 1.2, 0, 7); ctx.arc(x + 4, y - 21 + bob, 1.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#3d3d3d'; ctx.beginPath(); ctx.arc(x - 8, y - 27 + bob, 4, 0, 7); ctx.arc(x + 8, y - 27 + bob, 4, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x - 18, y - 4 + bob, 6, 10, 0.7, 0, 7); ctx.ellipse(x + 18, y - 4 + bob, 6, 10, -0.7, 0, 7); ctx.fill(); // tail stripes-ish
    ctx.fillStyle = '#e07a5f'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('pelts → gear', x, y + 22);
  }

  // ---------------------------------------------------------------- actors
  G.drawKid = function (ctx, x, y, id, t, walking) {
    const bob = walking ? Math.abs(Math.sin(t * 8)) * 3 : Math.sin(t * 2) * 1.5;
    const col = { kraken: '#4a90d9', squid: '#a06cd5', dino: '#7bc950', koala: '#b8b8c0' }[id];
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, y - bob, 11, 13, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - 18 - bob, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - 3, y - 19 - bob, 2.6, 0, 7); ctx.arc(x + 3, y - 19 - bob, 2.6, 0, 7); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(x - 3, y - 19 - bob, 1.2, 0, 7); ctx.arc(x + 3, y - 19 - bob, 1.2, 0, 7); ctx.fill();
    if (id === 'kraken') { ctx.fillStyle = '#3d7cc9'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(x - 8 + i * 5.4, y + 10, 2.6, 6, 0.3, 0, 7); ctx.fill(); } }
    if (id === 'squid') { ctx.fillStyle = '#8a4fd0'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - 6 + i * 6, y - 26 - bob); ctx.lineTo(x - 3 + i * 6, y - 34 - bob); ctx.lineTo(x + i * 6, y - 26 - bob); ctx.closePath(); ctx.fill(); } }
    if (id === 'dino') { ctx.fillStyle = '#5da83e'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - 6 + i * 6, y - 8 - bob); ctx.lineTo(x - 3 + i * 6, y - 16 - bob); ctx.lineTo(x + i * 6, y - 8 - bob); ctx.closePath(); ctx.fill(); } }
    if (id === 'koala') { ctx.fillStyle = '#c9c9d2'; ctx.beginPath(); ctx.arc(x - 8, y - 25 - bob, 5, 0, 7); ctx.arc(x + 8, y - 25 - bob, 5, 0, 7); ctx.fill(); }
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x, y - 16 - bob, 2.6, 0.2, Math.PI - 0.2); ctx.stroke(); // smile
  };

  G.drawPlayer = function (ctx, st) {
    const c = C(), p = st.player, t = st.time || 0;
    const walking = Math.hypot(p.vx || 0, (p.lastMx || 0)) > 0;
    const bob = (p.moving ? Math.abs(Math.sin(p.walk || 0)) * 3 : 0);
    ctx.save();
    if (p.hurtT > 0.6) ctx.globalAlpha = 0.55;
    // flashlight beam wedge (visible day and night)
    const f = G.flashParams(st);
    if (f.on) {
      const grad = ctx.createRadialGradient(p.x, p.y, 8, p.x, p.y, f.range);
      grad.addColorStop(0, 'rgba(255,244,180,.5)');
      grad.addColorStop(1, 'rgba(255,244,180,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, f.range, p.facing - f.half, p.facing + f.half); ctx.closePath(); ctx.fill();
    }
    // torch
    if (p.torchT > 0) {
      ctx.fillStyle = '#6b4f37'; ctx.fillRect(p.x + 14, p.y - 34, 4, 18);
      ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.ellipse(p.x + 16, p.y - 38, 5, 8 + Math.sin(t * 9) * 2, 0, 0, 7); ctx.fill();
    }
    // body
    ctx.fillStyle = p.coat ? '#d8a860' : '#ff8c69'; // pelt coat changes color
    ctx.beginPath(); ctx.ellipse(p.x, p.y - bob, 12, 14, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd1a8'; ctx.beginPath(); ctx.arc(p.x, p.y - 20 - bob, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#5d4326'; ctx.beginPath(); ctx.arc(p.x, p.y - 23 - bob, 9, Math.PI, Math.PI * 2); ctx.fill(); // hair
    ctx.fillRect(p.x - 9, p.y - 24 - bob, 18, 4);
    ctx.fillStyle = '#222';
    const ex = Math.cos(p.facing) * 3, ey = Math.sin(p.facing) * 1.5;
    ctx.beginPath(); ctx.arc(p.x - 3 + ex, p.y - 20 - bob + ey, 1.3, 0, 7); ctx.arc(p.x + 3 + ex, p.y - 20 - bob + ey, 1.3, 0, 7); ctx.fill();
    // weapon (swings on bonk)
    const swing = p.swingT > 0 ? (1 - p.swingT / 0.22) : 0;
    p.swingT = Math.max(0, (p.swingT || 0) - (1 / 60));
    const wa = p.facing + (swing > 0 ? Math.sin(swing * Math.PI) * 1.6 - 0.8 : -0.5);
    const wx = p.x + Math.cos(wa) * 16, wy = p.y - 8 + Math.sin(wa) * 16;
    ctx.save(); ctx.translate(wx, wy); ctx.rotate(wa);
    if (p.weapon === 'hands') { ctx.fillStyle = '#ffd1a8'; ctx.beginPath(); ctx.arc(4, 0, 4.5, 0, 7); ctx.fill(); }
    else {
      ctx.fillStyle = '#8a6239'; ctx.fillRect(-6, -2, 14, 4);
      ctx.fillStyle = p.weapon === 'ice' ? '#9fe3ff' : '#c9d6df';
      ctx.beginPath(); ctx.moveTo(8, -8); ctx.lineTo(16, 0); ctx.lineTo(8, 8); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.restore();
  };

  G.drawAnimals = function (ctx, st) {
    const t = st.time || 0;
    for (const a of st.animals) {
      const def = C().ANIMALS[a.type];
      const flip = Math.cos(a.dir) < 0 ? -1 : 1;
      const bob = a.state === 'scamper' ? Math.abs(Math.sin(a.walk)) * 5 : Math.abs(Math.sin(a.walk || 0)) * 2;
      ctx.save();
      ctx.translate(a.x, a.y);
      if (a.hitT > 0) { ctx.globalAlpha = 0.7; }
      const S = def.r / 15;
      ctx.scale(flip * S, S);
      const draw = ({
        bunny: drawBunny, hog: drawHog, wolf: drawWolf, bear: drawBear,
        alphaWolf: drawAlphaWolf, alphaBear: drawAlphaBear, emberHog: drawEmberHog,
      })[a.type];
      draw(ctx, bob, a, t);
      if (a.blindT > 0) { ctx.fillStyle = '#5d4a8a'; ctx.beginPath(); ctx.ellipse(0, -26, 8, 6, 0, 0, 7); ctx.fill(); }
      if (a.slowT > 0) { ctx.strokeStyle = 'rgba(120,200,255,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 18, 12, 0, 0, 7); ctx.stroke(); }
      ctx.restore();
      if (a.state === 'scamper' || a.state === 'dizzy') {
        ctx.fillStyle = '#ffe066';
        for (let i = 0; i < 3; i++) {
          const aa = t * 5 + i * 2.1;
          star(ctx, a.x + Math.cos(aa) * 16, a.y - 22 + Math.sin(aa) * 6, 4);
        }
      }
      if (a.gatheringGuest && a.state === 'aggro') {
        ctx.fillStyle = '#7be0a2'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('party!', a.x, a.y - 30);
      }
    }
  };

  function star(ctx, x, y, s) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
      const a2 = a + Math.PI / 5;
      ctx.lineTo(x + Math.cos(a2) * s * 0.45, y + Math.sin(a2) * s * 0.45);
    }
    ctx.closePath(); ctx.fill();
  }

  function baseQuad(ctx, bodyCol, bob) {
    ctx.fillStyle = bodyCol;
    ctx.beginPath(); ctx.ellipse(0, -10 - bob, 13, 9, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(10, -14 - bob, 6, 0, 7); ctx.fill();
  }
  function eyes(ctx, bob) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(11, -16 - bob, 2, 0, 7); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(12, -16 - bob, 1, 0, 7); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(7, -11 - bob, 1.4, 0, 7); ctx.fill(); // nose
  }
  function drawBunny(ctx, bob) {
    ctx.fillStyle = '#f5f5f5';
    ctx.beginPath(); ctx.ellipse(0, -8 - bob, 9, 7, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(6, -13 - bob, 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#f5f5f5';
    ctx.beginPath(); ctx.ellipse(4, -24 - bob, 2, 7, 0.2, 0, 7); ctx.ellipse(8, -24 - bob, 2, 7, 0.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffb3c1'; ctx.beginPath(); ctx.arc(6.5, -24 - bob, 1.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(8, -14 - bob, 1.1, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-7, -8 - bob, 3, 0.5, 2.5); ctx.fill(); // tail
  }
  function drawHog(ctx, bob) { hogBase(ctx, bob, '#b0704d', '#8d5a3d'); }
  function drawEmberHog(ctx, bob) { hogBase(ctx, bob, '#d95f43', '#a83e2e'); }
  function hogBase(ctx, bob, col, dark) {
    baseQuad(ctx, col, bob);
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(14, -11 - bob, 2.6, 0, 7); ctx.fill(); // snout
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(10, -18 - bob); ctx.lineTo(14, -23 - bob); ctx.stroke(); // tusk
    eyes(ctx, bob);
    ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(-2, -4, 3, 0, 7); ctx.arc(6, -4, 3, 0, 7); ctx.fill();
  }
  function drawWolf(ctx, bob, a, t) { wolfBase(ctx, bob, '#9aa2ab', '#7d8590', false); }
  function drawAlphaWolf(ctx, bob, a, t) { wolfBase(ctx, bob, '#5d6670', '#454e58', true); }
  function wolfBase(ctx, bob, col, dark, alpha) {
    baseQuad(ctx, col, bob);
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.moveTo(6, -20 - bob); ctx.lineTo(8, -27 - bob); ctx.lineTo(11, -20 - bob); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(12, -20 - bob); ctx.lineTo(15, -26 - bob); ctx.lineTo(16, -19 - bob); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(-13, -13 - bob, 4, 0, 7); ctx.fill(); // tail
    eyes(ctx, bob);
    if (alpha) { ctx.fillStyle = '#e05f5f'; ctx.beginPath(); ctx.ellipse(2, -16 - bob, 5, 2, 0, 0, 7); ctx.fill(); } // bandana
  }
  function drawBear(ctx, bob) { bearBase(ctx, bob, '#8d6341', 1, false); }
  function drawAlphaBear(ctx, bob) { bearBase(ctx, bob, '#6e4a2f', 1.15, true); }
  function bearBase(ctx, bob, col, s, alpha) {
    ctx.save(); ctx.scale(s, s);
    baseQuad(ctx, col, bob);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(11, -16 - bob, 7.5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(8, -23 - bob, 3, 0, 7); ctx.arc(15, -23 - bob, 3, 0, 7); ctx.fill(); // ears
    ctx.fillStyle = '#d8b48f'; ctx.beginPath(); ctx.arc(15, -13 - bob, 3, 0, 7); ctx.fill(); // muzzle
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(16, -13 - bob, 1.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(9, -18 - bob, 1.4, 0, 7); ctx.arc(14, -18 - bob, 1.4, 0, 7); ctx.fill();
    if (alpha) { ctx.fillStyle = '#e8e3d8'; ctx.beginPath(); ctx.ellipse(1, -8 - bob, 6, 7, 0, 0, 7); ctx.fill(); } // big chest
    ctx.restore();
  }

  G.drawCultists = function (ctx, st) {
    const t = st.time || 0;
    for (const cu of st.cultists) {
      const bob = Math.abs(Math.sin(cu.walk)) * 3;
      ctx.save(); ctx.translate(cu.x, cu.y);
      const flip = Math.cos(cu.dir) < 0 ? -1 : 1; ctx.scale(flip, 1);
      ctx.fillStyle = '#3d3d3d';
      ctx.beginPath(); ctx.ellipse(0, -9 - bob, 9, 11, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#1f1f1f'; // black vest (§9)
      ctx.fillRect(-7, -16 - bob, 4, 10); ctx.fillRect(3, -16 - bob, 4, 10);
      ctx.fillStyle = '#d8cfc4';
      ctx.beginPath(); ctx.arc(3, -20 - bob, 5.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#3d3d3d'; // cat-ear hood
      ctx.beginPath(); ctx.moveTo(-1, -25 - bob); ctx.lineTo(1, -31 - bob); ctx.lineTo(4, -25 - bob); ctx.closePath();
      ctx.moveTo(5, -25 - bob); ctx.lineTo(8, -30 - bob); ctx.lineTo(9, -24 - bob); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(4, -20 - bob, 1.2, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffd76e'; // candle
      ctx.fillRect(10, -18 - bob, 3, 6);
      ctx.fillStyle = `rgba(255,215,110,${0.5 + Math.sin(t * 10) * 0.3})`;
      ctx.beginPath(); ctx.arc(11.5, -20 - bob, 3, 0, 7); ctx.fill();
      ctx.restore();
      if (cu.state === 'steal') { ctx.fillStyle = '#c9a7ff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('hehe!', cu.x, cu.y - 34); }
    }
  };

  G.drawCat = function (ctx, st) {
    const c = C(), cat = st.cat, t = st.time || 0;
    const size = c.CAT_SIZE;
    const bob = cat.state === 'shooed' ? Math.abs(Math.sin(cat.walk * 1.4)) * 6 : Math.abs(Math.sin(cat.walk)) * 2;
    ctx.save();
    ctx.translate(cat.x, cat.y);
    const flip = cat.state === 'shooed' ? (Math.cos(cat.dir) < 0 ? -1 : 1) : (Math.cos(cat.dir) < 0 ? -1 : 1);
    ctx.scale(flip, 1);
    if (G.catImg) {
      const w = size.w, h = size.h;
      ctx.drawImage(G.catImg, -w / 2, -h + 18 - bob, w, h);
    } else {
      // fallback cartoon cat (if the image can't load)
      ctx.fillStyle = '#4a4a55';
      ctx.beginPath(); ctx.ellipse(0, -h * 0.35 - bob, w * 0.42, h * 0.34, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -h * 0.78 - bob, w * 0.3, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-w * 0.28, -h * 0.95 - bob); ctx.lineTo(-w * 0.2, -h * 1.15 - bob); ctx.lineTo(-w * 0.08, -h * 0.98 - bob); ctx.closePath();
      ctx.moveTo(w * 0.28, -h * 0.95 - bob); ctx.lineTo(w * 0.2, -h * 1.15 - bob); ctx.lineTo(w * 0.08, -h * 0.98 - bob); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd76e';
      ctx.beginPath(); ctx.arc(-7, -h * 0.8 - bob, 4, 0, 7); ctx.arc(7, -h * 0.8 - bob, 4, 0, 7); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(-7, -h * 0.8 - bob, 1.8, 0, 7); ctx.arc(7, -h * 0.8 - bob, 1.8, 0, 7); ctx.fill();
    }
    // state overlays
    if (cat.state === 'shooed') {
      // paws over head + sweat drops (§3/§8)
      ctx.fillStyle = '#3d3d47';
      ctx.beginPath(); ctx.arc(-16, -size.h * 0.92 - bob, 12, 0, 7); ctx.arc(16, -size.h * 0.92 - bob, 12, 0, 7); ctx.fill();
      ctx.fillStyle = '#9adcff';
      for (let i = 0; i < 2; i++) {
        const dx = (i ? 1 : -1) * (28 + Math.sin(t * 8 + i) * 4);
        ctx.beginPath(); ctx.ellipse(dx, -size.h * 0.6 - bob + Math.cos(t * 8 + i) * 4, 3, 5, 0, 0, 7); ctx.fill();
      }
    } else if (cat.state === 'asleep' || (cat.state === 'guard' && cat.wakeT <= 0)) {
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.7 + i * 0.33) % 1;
        ctx.globalAlpha = 1 - ph;
        ctx.fillText('Z', 20 + ph * 18, -size.h - 10 - ph * 22);
      }
      ctx.globalAlpha = 1;
    } else if (cat.state === 'stalk') {
      ctx.fillStyle = '#ff5f5f'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('!', 0, -size.h - 12 - bob);
    }
    if (cat.beamT > 0.15 && cat.state !== 'shooed') {
      ctx.fillStyle = '#ffd76e'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('>.<', 0, -size.h - 8);
    }
    ctx.restore();
  };

  G.drawFx = function (ctx, st) {
    const t = st.time || 0;
    for (const s of st.splats) {
      const a = 1 - s.t / s.life;
      ctx.fillStyle = s.kind === 'puddle' ? `rgba(120,190,255,${a * 0.5})` : `rgba(80,60,120,${a * 0.5})`;
      ctx.beginPath(); ctx.ellipse(s.x, s.y + 8, 40, 18, 0, 0, 7); ctx.fill();
    }
    for (const f of st.fx) {
      const a = 1 - f.t / f.life;
      if (f.kind === 'text') {
        ctx.globalAlpha = a;
        ctx.fillStyle = f.color; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 3;
        ctx.strokeText(f.text, f.x, f.y); ctx.fillText(f.text, f.x, f.y);
        ctx.globalAlpha = 1;
      } else if (f.kind === 'stars') {
        ctx.fillStyle = `rgba(255,224,102,${a})`;
        for (let i = 0; i < 4; i++) star(ctx, f.x + Math.cos(i * 1.57 + f.t * 6) * 14, f.y + Math.sin(i * 1.57 + f.t * 6) * 8, 4);
      } else if (f.kind === 'poof') {
        ctx.fillStyle = `rgba(240,240,255,${a * 0.8})`;
        ctx.beginPath(); ctx.arc(f.x, f.y, 6 + f.t * 40, 0, 7); ctx.fill();
      }
    }
  };

  // ---------------------------------------------------------------- darkness (§5)
  function nightAlpha(st) {
    const c = C();
    if (st.phase === 'day') {
      // gentle dusk fade at the very end of the day
      const into = st.t / c.DAY_LEN;
      if (into > 0.94) return (into - 0.94) / 0.06 * 0.4;
      return 0;
    }
    const n = st.t / c.NIGHT_LEN;
    const rampIn = Math.min(1, n / 0.12), rampOut = Math.min(1, (1 - n) / 0.12);
    return c.NIGHT_DARK_MAX * Math.min(rampIn, rampOut);
  }

  G.drawDarkness = function (ctx, st, cam, vw, vh) {
    const c = C(), p = st.player;
    const a = nightAlpha(st);
    // vignette even in day (soft, never hides gameplay)
    if (a <= 0.01) {
      const g = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.45, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
      g.addColorStop(0, 'rgba(20,30,20,0)'); g.addColorStop(1, 'rgba(20,30,20,.22)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh);
      return;
    }
    if (!dark) { dark = document.createElement('canvas'); darkCtx = dark.getContext('2d'); }
    if (dark.width !== vw || dark.height !== vh) { dark.width = vw; dark.height = vh; }
    const d = darkCtx;
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.clearRect(0, 0, vw, vh);
    d.fillStyle = `rgba(14,16,44,${a})`;
    d.fillRect(0, 0, vw, vh);
    d.globalCompositeOperation = 'destination-out';
    const ox = vw / 2 - cam.x, oy = vh / 2 - cam.y;
    function hole(x, y, r, soft) {
      const g = d.createRadialGradient(x + ox, y + oy, r * 0.2, x + ox, y + oy, r);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g;
      d.beginPath(); d.arc(x + ox, y + oy, r, 0, 7); d.fill();
    }
    const lb = 1 + p.lanterns * c.LANTERN_BONUS;
    // campfire light radius grows with fire level (§13)
    if (st.fire.level > 0) hole(st.fire.x, st.fire.y, c.FIRE_LIGHT_R * st.fire.level * lb + 20);
    for (const kf of st.kidFires) hole(kf.x, kf.y, c.FIRE_LIGHT_R * 2.4);
    if (p.torchT > 0) hole(p.x, p.y, c.TORCH_LIGHT_R * lb);
    // small player glow so you are never blind
    hole(p.x, p.y, 60 * lb);
    // flashlight cone
    const f = G.flashParams(st);
    if (f.on) {
      const g = d.createRadialGradient(p.x + ox, p.y + oy, 20, p.x + ox, p.y + oy, f.range);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.8, 'rgba(0,0,0,.95)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g;
      d.beginPath(); d.moveTo(p.x + ox, p.y + oy);
      d.arc(p.x + ox, p.y + oy, f.range, p.facing - f.half, p.facing + f.half); d.closePath(); d.fill();
    }
    // trader + temple lanterns (§5)
    hole(st.traders.feather.x, st.traders.feather.y, 70);
    hole(st.traders.pelt.x, st.traders.pelt.y, 70);
    for (const tp of st.temples) hole(tp.x, tp.y, tp.big ? 110 : 80);
    // glowing lava rocks
    for (const dk of st.deco) if (dk.kind === 'lavarock' && Math.abs(dk.x - cam.x) < vw / 2 + 40 && Math.abs(dk.y - cam.y) < vh / 2 + 40) hole(dk.x, dk.y, 34 * dk.s);
    // gathering fountain glow
    if (st.gathering.active) { const big = st.temples.find(x => x.big); if (big) hole(big.x, big.y, 180); }
    d.globalCompositeOperation = 'source-over';
    ctx.drawImage(dark, 0, 0);
  };
})();
