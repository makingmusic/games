const FP = (() => {
  const CH = 66;
  const FAR = 1500;
  const FOV = 1.25;
  const MAX_K = 11;
  let groundC = null, gctx = null, gimg = null, GW = 0, GH = 0;
  const tileCache = new Map();
  const rgbCache = {};
  let cam = null;
  let ctxRef = null;
  let vwRef = 0, vhRef = 0;

  function ensureGround(vw, vh) {
    const gw = Math.max(120, Math.min(360, Math.round(vw / 4)));
    const gh = Math.max(90, Math.min(230, Math.round(vh / 4)));
    if (gw !== GW || gh !== GH) {
      GW = gw; GH = gh;
      groundC = document.createElement('canvas');
      groundC.width = gw; groundC.height = gh;
      gctx = groundC.getContext('2d');
      gimg = gctx.createImageData(gw, gh);
      tileCache.clear();
    }
  }

  function biomeRGB(b, i) {
    const key = b + i;
    if (!rgbCache[key]) {
      const hex = World.BIOMES[b].shades[i];
      const n = parseInt(hex.slice(1), 16);
      rgbCache[key] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    return rgbCache[key];
  }

  function tileColor(ix, iy) {
    const key = ix * 64 + iy;
    let c = tileCache.get(key);
    if (!c) {
      c = biomeRGB(World.tileBiome(ix, iy), (Utils.hash2(ix, iy) * 4) | 0);
      if (tileCache.size > 6000) tileCache.clear();
      tileCache.set(key, c);
    }
    return c;
  }

  function projectPt(wx, wy, h) {
    const dx = wx - cam.px, dy = wy - cam.py;
    const F = dx * cam.cyP + dy * cam.syP;
    if (F < 16) return null;
    const zc = F * cam.cph + (h - CH) * cam.sph;
    if (zc < 24) return null;
    const Rr = -dx * cam.syP + dy * cam.cyP;
    const sx = cam.cx + cam.focal * Rr / zc;
    const sy = cam.cy - cam.focal * (-(cam.sph * F + (CH - h) * cam.cph)) / zc;
    return { F, zc, sx, sy, k: Math.min(cam.focal / zc, MAX_K), bearing: Math.atan2(Rr, F) };
  }

  function project(wx, wy, h) {
    if (!cam) return null;
    const pr = projectPt(wx, wy, h || 0);
    if (!pr) return null;
    const on = pr.sx > -vwRef * 0.1 && pr.sx < vwRef * 1.1 && pr.F < FAR;
    return { on, sx: pr.sx, sy: pr.sy, k: pr.k, F: pr.F, bearing: pr.bearing };
  }

  function pushB(list, ent, draw, off, h, wHalf, maxF, bias) {
    off = off || 0;
    const pr = projectPt(ent.x, ent.y + off, h || 0);
    if (!pr || pr.F > (maxF || FAR)) return null;
    const wh = (wHalf || 80) * pr.k + 60;
    if (pr.sx < -wh || pr.sx > vwRef + wh) return null;
    list.push({
      F: pr.F + (bias || 0),
      f() {
        ctxRef.save();
        ctxRef.translate(pr.sx, pr.sy);
        ctxRef.scale(pr.k, pr.k);
        ctxRef.translate(-ent.x, -(ent.y + off));
        draw(ctxRef, ent);
        ctxRef.restore();
      },
    });
    return pr;
  }

  function mix(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }

  function rgbStr(c) {
    return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
  }

  function drawSky(ctx, hy, dk, yaw) {
    const vw = vwRef, vh = vhRef;
    if (hy > 0) {
      const top = mix([110, 180, 230], [6, 9, 24], dk);
      let hor = mix([190, 225, 245], [18, 26, 54], dk);
      const dusk = Math.max(0, 1 - Math.abs(dk - 0.4) / 0.4);
      hor = mix(hor, [255, 150, 90], dusk * 0.45);
      const g = ctx.createLinearGradient(0, 0, 0, Math.max(hy, 2));
      g.addColorStop(0, rgbStr(top));
      g.addColorStop(1, rgbStr(hor));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, vw, Math.min(hy + 2, vh));
      if (dk > 0.3 && hy > 40) {
        for (let i = 0; i < 90; i++) {
          const rel = Utils.angDiff(yaw, Utils.hash2(i, 3) * TAU);
          if (Math.abs(rel) > 0.75) continue;
          const x = vw / 2 + rel * cam.focal * 0.9;
          const y = hy * (0.08 + 0.82 * Utils.hash2(i, 7));
          const tw = 0.5 + Math.sin(G.t * 2 + i * 2.7) * 0.5;
          ctx.globalAlpha = Utils.clamp((dk - 0.3) * 2, 0, 1) * (0.35 + tw * 0.6);
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(x, y, 0.8 + Utils.hash2(i, 11) * 1.3, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      const sunA = Utils.clamp(1 - dk * 2, 0, 1);
      if (sunA > 0.02) drawDisc(ctx, 2.35, hy - vh * 0.3, 26, '#fff59c', sunA, yaw, true);
      const moonA = Utils.clamp((dk - 0.2) * 2.2, 0, 1);
      if (moonA > 0.02) drawDisc(ctx, 2.35 + Math.PI, hy - vh * 0.34, 20, '#e8eaf6', moonA, yaw, false);
    }
  }

  function drawDisc(ctx, az, y, r, color, alpha, yaw, glow) {
    const rel = Utils.angDiff(yaw, az);
    if (Math.abs(rel) > 1) return;
    const x = vwRef / 2 + rel * cam.focal * 0.9;
    ctx.globalAlpha = alpha;
    if (glow) {
      const g = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 3);
      g.addColorStop(0, 'rgba(255,249,196,0.5)');
      g.addColorStop(1, 'rgba(255,249,196,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 3, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawGround(ctx, hy, yaw, pitch) {
    ensureGround(vwRef, vhRef);
    const data = gimg.data;
    data.fill(0);
    const p = G.player;
    const cyP = cam.cyP, syP = cam.syP, cph = cam.cph, sph = cam.sph;
    const sx4 = vwRef / GW, sy4 = vhRef / GH;
    const pond = G.props.pond;
    const startRow = Math.max(0, Math.floor(hy / sy4));
    for (let py = startRow; py < GH; py++) {
      const v = (cam.cy - (py + 0.5) * sy4) / cam.focal;
      const den = sph + v * cph;
      if (den >= -1e-4) continue;
      const t = -CH / den;
      if (t > FAR * 2.2) continue;
      let o = py * GW * 4;
      for (let px = 0; px < GW; px++, o += 4) {
        const u = ((px + 0.5) * sx4 - cam.cx) / cam.focal;
        const wx = p.x + t * (cyP * cph - u * syP);
        const wy = p.y + t * (syP * cph + u * cyP);
        let r, g, b;
        const ex = (wx - pond.x) / pond.rx, ey = (wy - pond.y) / pond.ry;
        const e = ex * ex + ey * ey;
        if (e < 1) {
          if (e < 0.6) { r = 46; g = 136; b = 170; }
          else { r = 29; g = 94; b = 122; }
        } else {
          const c = tileColor(Math.floor(wx / World.TILE), Math.floor(wy / World.TILE));
          r = c[0]; g = c[1]; b = c[2];
          const dx = wx - CFG.CAMP.x, dy = wy - CFG.CAMP.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 36100) {
            const f = (1 - Math.sqrt(d2) / 190) * 0.8;
            r += (169 - r) * f; g += (124 - g) * f; b += (80 - b) * f;
          }
        }
        data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
      }
    }
    gctx.putImageData(gimg, 0, 0);
    ctx.imageSmoothingEnabled = true;
    const dy0 = Math.max(0, Math.min(startRow * sy4, vhRef - 2));
    ctx.drawImage(groundC, 0, startRow, GW, GH - startRow, 0, dy0, vwRef, vhRef - dy0);
  }

  function drawFog(ctx, hy, dk) {
    const b = World.biomeAt(G.player.x, G.player.y);
    const base = biomeRGB(b, 1);
    const fog = mix(base, [16, 22, 44], 0.25 + dk * 0.55);
    const g = ctx.createLinearGradient(0, hy - 24, 0, hy + 130);
    g.addColorStop(0, 'rgba(' + (fog[0] | 0) + ',' + (fog[1] | 0) + ',' + (fog[2] | 0) + ',0)');
    g.addColorStop(0.22, 'rgba(' + (fog[0] | 0) + ',' + (fog[1] | 0) + ',' + (fog[2] | 0) + ',0.55)');
    g.addColorStop(1, 'rgba(' + (fog[0] | 0) + ',' + (fog[1] | 0) + ',' + (fog[2] | 0) + ',0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, Math.max(0, hy - 24), vwRef, 160);
  }

  function drawBadgeLocal(ctx, name, face, emo) {
    Utils.font(ctx, 13);
    const tw = ctx.measureText(name).width;
    const w = tw + 66, h = 30, x = -w / 2;
    ctx.fillStyle = 'rgba(14,17,25,0.8)';
    ctx.beginPath();
    ctx.roundRect(x, 0, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    Utils.font(ctx, 22);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(face, x + 20, h / 2 + 1);
    Utils.font(ctx, 13);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.fillText(name, x + 36, h / 2 + 1);
    Utils.font(ctx, 16);
    ctx.textAlign = 'center';
    ctx.fillText(emo, x + w - 15, h / 2 + 1);
  }

  function monEmotion(m) {
    if (m.fleeing) return '💨';
    if (m.mode === 'dizzy') return '😵';
    if (m.mode === 'tele' || m.mode === 'charge' || m.mode === 'dive' || m.mode === 'lunge' || m.mode === 'roar' || m.mode === 'shock' || m.tele > 0) return '😡';
    if (m.provoked || m.kind === 'bat') return '😠';
    return '🙂';
  }

  function drawBadges(ctx, badges) {
    for (const bd of badges) {
      const pr = projectPt(bd.x, bd.y, bd.h);
      if (!pr || pr.F > 950) continue;
      ctx.save();
      ctx.translate(Utils.clamp(pr.sx, 70, vwRef - 70), pr.sy);
      drawBadgeLocal(ctx, bd.name, bd.face, bd.emo);
      if (bd.hp < bd.maxHp && !bd.flee) {
        const w = 56;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-w / 2, 34, w, 6);
        ctx.fillStyle = '#7ed37e';
        ctx.fillRect(-w / 2, 34, w * Math.max(0, bd.hp / bd.maxHp), 6);
      }
      ctx.restore();
    }
  }

  function collectSprites(list, badges) {
    const p = G.player;
    for (const t of G.trees) {
      if (t.dead) pushB(list, t, World.drawTree, 3, 0, 55, 1100);
      else pushB(list, t, World.drawTree, 3, 0, 100, FAR);
    }
    for (const b of G.bushes) pushB(list, b, World.drawBush, 6, 0, 40, 800);
    for (const c of G.caves) {
      pushB(list, c, World.drawCave, 34, 0, 120, 950, 3);
      const kid = G.kids.find((k) => k.id === c.kidId);
      if (kid && !kid.rescued) pushB(list, kid, NPCs.drawKid, 12, 0, 40, 950, 1);
      const anchor = { x: c.cage.x, y: c.cage.y };
      pushB(list, anchor, () => World.drawCage(ctxRef, c, true), 14, 0, 40, 950, -3);
    }
    pushB(list, G.props.tent, World.drawTent, 34, 0, 120, 900);
    pushB(list, G.props.board, World.drawBoard, 30, 0, 130, 900);
    for (const l of G.props.logs) {
      const pr = projectPt(l.x, l.y, 0);
      if (!pr || pr.F > 700) continue;
      const a = l.a;
      const e1 = projectPt(l.x - Math.cos(a) * 26, l.y - Math.sin(a) * 26, 0);
      const e2 = projectPt(l.x + Math.cos(a) * 26, l.y + Math.sin(a) * 26, 0);
      if (!e1 || !e2) continue;
      list.push({
        F: pr.F,
        f() {
          ctxRef.strokeStyle = '#6d4c33';
          ctxRef.lineWidth = Utils.clamp(9 * pr.k, 2, 34);
          ctxRef.lineCap = 'round';
          ctxRef.beginPath();
          ctxRef.moveTo(e1.sx, e1.sy);
          ctxRef.lineTo(e2.sx, e2.sy);
          ctxRef.stroke();
          ctxRef.strokeStyle = '#8a6a45';
          ctxRef.lineWidth = Utils.clamp(4 * pr.k, 1, 14);
          ctxRef.stroke();
        },
      });
    }
    const stalls = [
      [G.props.featherTrader, '🪶', '#8d6e63', '#d7ccc8'],
      [G.props.peltTrader, '🐾', '#6d4c33', '#a1887f'],
    ];
    for (const [s, em, c1, c2] of stalls) pushB(list, s, (ctx, e) => World.drawStall(ctx, e, em, c1, c2), 26, 0, 90, 900);
    if (G.salesman) pushB(list, G.salesman, (ctx, e) => World.drawStall(ctx, e, '💼', '#455a64', '#cfd8dc'), 26, 0, 90, 900);
    pushB(list, { x: CFG.CAMP.x, y: CFG.CAMP.y }, () => World.drawFire(ctxRef), 4, 0, 80, 1200);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      const sx = CFG.CAMP.x + Math.cos(a) * 46, sy = CFG.CAMP.y + Math.sin(a) * 46;
      const pr = projectPt(sx, sy, 0);
      if (!pr || pr.F > 400) continue;
      list.push({
        F: pr.F,
        f() {
          ctxRef.fillStyle = '#8d8d8d';
          ctxRef.beginPath();
          ctxRef.ellipse(pr.sx, pr.sy, Utils.clamp(5 * pr.k, 1.5, 18), Utils.clamp(2 * pr.k, 1, 7), 0, 0, TAU);
          ctxRef.fill();
        },
      });
    }
    for (const m of G.monsters) {
      if (m.dead) continue;
      const K = m.k;
      let off = K.r * 0.85, h = 0, top = K.r * 2.6 + 14, wh = K.r + 30;
      if (K.fly) { h = 40 + Math.sin(m.animT * 3) * 5; top += 40; }
      if (m.kind === 'deer') { off = 44; top = 130; wh = 130; }
      if (m.kind === 'snake') { off = 10; top = 60; wh = 30; }
      if (m.kind === 'bat') { off = K.r * 0.95; h = 46 + Math.sin(m.animT * 3.2) * 5; top = 120; wh = 60; }
      const pr = pushB(list, m, Monsters.drawOne, off, h, wh);
      if (pr && pr.F < 950) badges.push({ x: m.x, y: m.y + off, h: h + top, name: MNAMES[m.kind] || m.kind, face: K.emoji, emo: monEmotion(m), hp: m.hp, maxHp: m.maxHp, flee: m.fleeing });
    }
    for (const c of G.cultists) {
      if (c.dead) continue;
      const pr = pushB(list, c, Cultists.drawOne, c.r * 0.9, 0, 40);
      if (pr && pr.F < 950) badges.push({ x: c.x, y: c.y + c.r * 0.9, h: c.r * 2.9 + 8, name: Cultists.CNAMES[c.type] || 'Cultist', face: Cultists.CFACES[c.type] || '😈', emo: c.mode === 'wind' ? '😡' : (c.provoked ? '😠' : '🙂'), hp: c.hp, maxHp: c.maxHp, flee: false });
    }
    for (const kid of G.kids) {
      if (!kid.rescued) continue;
      pushB(list, kid, NPCs.drawKid, 12, 0, 40, 800);
    }
    if (G.salesman) pushB(list, G.salesman, (ctx, e) => NPCs.drawTrader(ctx, e.x, e.y, '🎩', 'Salesman — Day 20 only', Utils.dist(p.x, p.y, e.x, e.y) < 160), 14, 0, 60, 800);
    const ft = G.props.featherTrader;
    pushB(list, { x: ft.x, y: ft.y + 20 }, (ctx, e) => NPCs.drawTrader(ctx, e.x, e.y, '🧢', 'Feather Trader', Utils.dist(p.x, p.y, e.x, e.y) < 160), 14, 0, 60, 800);
    const pt = G.props.peltTrader;
    pushB(list, { x: pt.x, y: pt.y + 20 }, (ctx, e) => NPCs.drawTrader(ctx, e.x, e.y, '🎩', 'Pelt Trader — powers!', Utils.dist(p.x, p.y, e.x, e.y) < 160), 14, 0, 60, 800);
  }

  function collectPickups(list) {
    const ems = { wood: '🪵', food: '🍒', coin: '🪙', gem: '💎', feather: '🪶', pelt: '🐾' };
    for (const pk of G.pickups) {
      if (pk.dead) continue;
      const h = 10 + Math.sin(G.t * 3 + pk.bob) * 3;
      const pr = projectPt(pk.x, pk.y, h);
      if (!pr || pr.F > 600) continue;
      list.push({
        F: pr.F,
        f() {
          ctxRef.globalAlpha = 0.25;
          ctxRef.fillStyle = '#000';
          ctxRef.beginPath();
          const gp = projectPt(pk.x, pk.y, 0);
          if (gp) {
            ctxRef.ellipse(gp.sx, gp.sy, Utils.clamp(8 * pr.k, 1.5, 20), Utils.clamp(3 * pr.k, 1, 7), 0, 0, TAU);
            ctxRef.fill();
          }
          ctxRef.globalAlpha = 1;
          Utils.font(ctxRef, Utils.clamp(20 * pr.k, 8, 42));
          ctxRef.textAlign = 'center';
          ctxRef.textBaseline = 'middle';
          ctxRef.fillText(ems[pk.kind], pr.sx, pr.sy);
        },
      });
    }
  }

  function collectProjectiles(list) {
    for (const pr2 of G.projectiles) {
      if (pr2.dead) continue;
      const pr = projectPt(pr2.x, pr2.y, 18);
      if (!pr || pr.F > 900) continue;
      list.push({
        F: pr.F,
        f() {
          const rel = pr2.ang - cam.yaw;
          const len = Utils.clamp(15 * pr.k, 3, 26);
          ctxRef.save();
          ctxRef.translate(pr.sx, pr.sy);
          ctxRef.rotate(rel);
          if (pr2.kind === 'spirit' || pr2.kind === 'star') {
            ctxRef.fillStyle = pr2.kind === 'star' ? 'rgba(255,213,79,0.4)' : 'rgba(176,124,224,0.35)';
            ctxRef.beginPath();
            ctxRef.arc(0, 0, len, 0, TAU);
            ctxRef.fill();
            ctxRef.fillStyle = pr2.color;
            ctxRef.beginPath();
            ctxRef.arc(0, 0, len * 0.45, 0, TAU);
            ctxRef.fill();
          } else {
            ctxRef.strokeStyle = pr2.color;
            ctxRef.lineWidth = Utils.clamp(3 * pr.k, 1.5, 7);
            ctxRef.lineCap = 'round';
            ctxRef.beginPath();
            ctxRef.moveTo(-len, 0);
            ctxRef.lineTo(len, 0);
            ctxRef.stroke();
          }
          ctxRef.restore();
        },
      });
    }
  }

  function drawStarMini(ctx, x, y, s, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU - Math.PI / 2;
      const a2 = a + TAU / 10;
      ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
      ctx.lineTo(Math.cos(a2) * s * 0.45, Math.sin(a2) * s * 0.45);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function collectParticles(list) {
    for (const p of G.particles) {
      const lift = Math.max(-2, -p.vy * p.t);
      const gy = p.y - p.vy * p.t;
      const pr = projectPt(p.x, gy, lift);
      if (!pr || pr.F > 900) continue;
      const fade = 1 - p.t / p.dur;
      const size = Utils.clamp(p.size * pr.k, 1.5, 34);
      list.push({
        F: pr.F,
        f() {
          ctxRef.globalAlpha = fade;
          if (p.type === 'poof') {
            ctxRef.globalAlpha = fade * 0.7;
            ctxRef.fillStyle = p.color;
            ctxRef.beginPath();
            ctxRef.arc(pr.sx, pr.sy, size * (1 + (1 - fade) * 1.5), 0, TAU);
            ctxRef.fill();
          } else if (p.type === 'star') {
            ctxRef.fillStyle = '#ffd54f';
            drawStarMini(ctxRef, pr.sx, pr.sy, size, p.rot);
          } else if (p.type === 'spark') {
            ctxRef.fillStyle = p.color;
            ctxRef.beginPath();
            ctxRef.arc(pr.sx, pr.sy, size, 0, TAU);
            ctxRef.fill();
          } else if (p.type === 'leaf') {
            ctxRef.fillStyle = p.color;
            ctxRef.save();
            ctxRef.translate(pr.sx, pr.sy);
            ctxRef.rotate(p.rot);
            ctxRef.fillRect(-size, -size * 0.5, size * 2, size);
            ctxRef.restore();
          } else if (p.type === 'heart') {
            Utils.font(ctxRef, Utils.clamp(14 * pr.k, 8, 26));
            ctxRef.textAlign = 'center';
            ctxRef.textBaseline = 'middle';
            ctxRef.fillText('❤️', pr.sx, pr.sy);
          } else if (p.type === 'bubble') {
            ctxRef.globalAlpha = fade * 0.7;
            ctxRef.fillStyle = '#8ee68e';
            ctxRef.beginPath();
            ctxRef.arc(pr.sx, pr.sy, size, 0, TAU);
            ctxRef.fill();
          } else if (p.type === 'ember') {
            ctxRef.fillStyle = '#ffb74d';
            ctxRef.beginPath();
            ctxRef.arc(pr.sx, pr.sy, size, 0, TAU);
            ctxRef.fill();
          } else if (p.type === 'ring') {
            const R = p.size + (1 - fade) * 70;
            const rx = Utils.clamp(R * pr.k, 4, Math.max(vwRef, vhRef));
            const gp = projectPt(p.x, gy, 0);
            if (gp) {
              ctxRef.strokeStyle = p.color;
              ctxRef.lineWidth = Utils.clamp(3 * pr.k, 1, 6);
              ctxRef.beginPath();
              ctxRef.ellipse(gp.sx, gp.sy, rx, Math.max(2, rx * Utils.clamp(CH / pr.F, 0.08, 0.6)), 0, 0, TAU);
              ctxRef.stroke();
            }
          }
          ctxRef.globalAlpha = 1;
        },
      });
    }
    for (const t of G.texts) {
      const lift = t.t * 26 + 8;
      const pr = projectPt(t.x, t.y + t.t * 26, lift);
      if (!pr || pr.F > 700) continue;
      const fade = Math.min(1, (1 - t.t / t.dur) * 2);
      list.push({
        F: pr.F,
        f() {
          ctxRef.globalAlpha = fade;
          Utils.font(ctxRef, Utils.clamp(t.size * pr.k, 9, 28));
          ctxRef.textAlign = 'center';
          ctxRef.textBaseline = 'middle';
          ctxRef.fillStyle = 'rgba(0,0,0,0.5)';
          ctxRef.fillText(t.str, pr.sx + 1, pr.sy + 1);
          ctxRef.fillStyle = t.color;
          ctxRef.fillText(t.str, pr.sx, pr.sy);
          ctxRef.globalAlpha = 1;
        },
      });
    }
  }

  function drawViewmodel(ctx, p) {
    const vw = vwRef, vh = vhRef;
    const bobX = p.moving ? Math.sin(p.animT * 11) * 12 : 0;
    const bobY = p.moving ? Math.abs(Math.cos(p.animT * 11)) * 9 : 0;
    const prog = p.swingT > 0 ? 1 - p.swingT / 0.2 : 1;
    const chop = p.swingT > 0 ? Math.sin(Math.min(1, prog * 1.3) * Math.PI) : 0;
    ctx.save();
    ctx.translate(vw * 0.74 + bobX, vh + 46 + bobY);
    ctx.rotate(-0.5 - chop * 1.4);
    if (p.iframes > 0 && Math.floor(p.animT * 16) % 2 === 0) ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#8a6a45';
    ctx.beginPath();
    ctx.roundRect(-13, -330, 26, 340, 12);
    ctx.fill();
    ctx.strokeStyle = '#6d4c33';
    ctx.lineWidth = 4;
    ctx.stroke();
    const sharp = G.sharpAxe;
    ctx.fillStyle = sharp ? '#cfd8dc' : '#9e9e9e';
    ctx.beginPath();
    ctx.moveTo(-10, -300);
    ctx.lineTo(-52, -352);
    ctx.lineTo(34, -366);
    ctx.lineTo(18, -288);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6d4c33';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#f5c396';
    ctx.beginPath();
    ctx.arc(0, -58, 24, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#c89b6e';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  function drawCrosshair(ctx) {
    const cx = vwRef / 2, cy = vhRef / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 11, cy); ctx.lineTo(cx - 4, cy);
    ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 11, cy);
    ctx.moveTo(cx, cy - 11); ctx.lineTo(cx, cy - 4);
    ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + 11);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(cx, cy, 1.6, 0, TAU);
    ctx.fill();
  }

  function punchS(lc, sx, sy, r) {
    if (r <= 0) return;
    const grad = lc.createRadialGradient(sx, sy, r * 0.2, sx, sy, r);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.85)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    lc.fillStyle = grad;
    lc.beginPath();
    lc.arc(sx, sy, r, 0, TAU);
    lc.fill();
  }

  function drawDarkness(ctx, dk) {
    const vw = vwRef, vh = vhRef;
    const lctx = Game.lctx, lightC = Game.lightC;
    if (dk <= 0.03) return;
    lctx.clearRect(0, 0, vw, vh);
    lctx.fillStyle = 'rgba(8,10,26,' + dk + ')';
    lctx.fillRect(0, 0, vw, vh);
    lctx.globalCompositeOperation = 'destination-out';
    const fp = projectPt(CFG.CAMP.x, CFG.CAMP.y - 10, 0);
    if (fp && fp.F < 2400) punchS(lctx, fp.sx, fp.sy, Math.min(lightRadius() * fp.k, Math.max(vw, vh) * 1.2));
    let pr = 130;
    if (G.torch) pr += 90;
    if (G.lantern) pr += 130;
    punchS(lctx, vw / 2, vh * 0.62, pr * 1.75);
    lctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(lightC, 0, 0);
    if (World.fireLit() && fp && fp.F < 2400) {
      const glow = ctx.createRadialGradient(fp.sx, fp.sy, 10, fp.sx, fp.sy, lightRadius() * fp.k * 0.9);
      glow.addColorStop(0, 'rgba(255,170,60,' + 0.2 * dk + ')');
      glow.addColorStop(1, 'rgba(255,170,60,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(fp.sx, fp.sy, lightRadius() * fp.k * 0.9, 0, TAU);
      ctx.fill();
    }
  }

  function render(ctx, vw, vh) {
    ctxRef = ctx;
    vwRef = vw; vhRef = vh;
    const p = G.player;
    let yaw = p.face;
    let pitch = Utils.clamp(G.pitch || 0, -0.5, 0.5);
    if (G.shake > 0.05) {
      yaw += (Math.random() - 0.5) * G.shake * 0.002;
      pitch += (Math.random() - 0.5) * G.shake * 0.002;
    }
    const focal = (vw / 2) / Math.tan(FOV / 2);
    const bob = p.moving ? Math.abs(Math.cos(p.animT * 11)) * 5 : 0;
    const cy = vh / 2 + bob;
    let hy = cy + focal * Math.tan(pitch);
    cam = {
      px: p.x, py: p.y, yaw, pitch,
      cx: vw / 2, cy, focal,
      cyP: Math.cos(yaw), syP: Math.sin(yaw),
      cph: Math.cos(pitch), sph: Math.sin(pitch),
    };
    const dk = Game.darkness();
    ctx.save();
    window.__FP = true;
    drawSky(ctx, hy, dk, yaw);
    drawGround(ctx, hy, yaw, pitch);
    drawFog(ctx, hy, dk);
    const list = [];
    const badges = [];
    collectSprites(list, badges);
    collectPickups(list);
    collectProjectiles(list);
    collectParticles(list);
    list.sort((a, b) => b.F - a.F);
    for (const s of list) s.f();
    drawBadges(ctx, badges);
    drawViewmodel(ctx, p);
    drawCrosshair(ctx);
    window.__FP = false;
    ctx.restore();
    drawDarkness(ctx, dk);
    if (p.iframes > 1.5) {
      const g = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.3, vw / 2, vh / 2, vh * 0.75);
      g.addColorStop(0, 'rgba(255,50,50,0)');
      g.addColorStop(1, 'rgba(255,50,50,0.35)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, vw, vh);
    }
    World.drawAmbient(ctx, dk);
  }

  return { render, project };
})();
