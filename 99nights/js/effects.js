const Effects = (() => {
  function push(p) {
    if (G.particles.length < 420) G.particles.push(p);
  }

  function poof(x, y, color = '#cfd8dc', n = 8) {
    for (let i = 0; i < n; i++) {
      const a = Utils.rand(0, TAU);
      push({ type: 'poof', x: x + Utils.rand(-8, 8), y: y + Utils.rand(-8, 8), vx: Math.cos(a) * Utils.rand(20, 70), vy: Math.sin(a) * Utils.rand(20, 70) - 20, t: 0, dur: Utils.rand(0.35, 0.6), size: Utils.rand(8, 16), color });
    }
  }

  function stars(x, y, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = Utils.rand(0, TAU);
      push({ type: 'star', x, y, vx: Math.cos(a) * Utils.rand(40, 130), vy: Math.sin(a) * Utils.rand(40, 130) - 60, t: 0, dur: Utils.rand(0.5, 0.9), size: Utils.rand(5, 10), rot: Utils.rand(0, TAU) });
    }
    Sfx.sfx('star');
  }

  function hit(x, y) {
    for (let i = 0; i < 6; i++) {
      const a = Utils.rand(0, TAU);
      push({ type: 'spark', x, y, vx: Math.cos(a) * Utils.rand(80, 200), vy: Math.sin(a) * Utils.rand(80, 200), t: 0, dur: 0.25, size: Utils.rand(2, 4), color: '#fff59d' });
    }
  }

  function leaf(x, y, color = '#66bb6a') {
    for (let i = 0; i < 6; i++) {
      push({ type: 'leaf', x: x + Utils.rand(-12, 12), y: y + Utils.rand(-16, 4), vx: Utils.rand(-40, 40), vy: Utils.rand(-10, 40), t: 0, dur: Utils.rand(0.5, 0.9), size: Utils.rand(3, 6), rot: Utils.rand(0, TAU), color });
    }
  }

  function heart(x, y) {
    push({ type: 'heart', x, y, vx: 0, vy: -40, t: 0, dur: 0.9, size: 14 });
  }

  function bubble(x, y) {
    push({ type: 'bubble', x: x + Utils.rand(-8, 8), y, vx: 0, vy: Utils.rand(-45, -25), t: 0, dur: Utils.rand(0.5, 0.9), size: Utils.rand(3, 6) });
  }

  function ring(x, y, color = '#ffffff') {
    push({ type: 'ring', x, y, vx: 0, vy: 0, t: 0, dur: 0.6, size: 10, color });
  }

  function ember(x, y) {
    push({ type: 'ember', x: x + Utils.rand(-10, 10), y, vx: Utils.rand(-12, 12), vy: Utils.rand(-70, -40), t: 0, dur: Utils.rand(0.6, 1.1), size: Utils.rand(2, 4) });
  }

  function text(x, y, str, color = '#ffffff', size = 16) {
    if (G.texts.length > 40) G.texts.shift();
    G.texts.push({ x, y, str, color, size, t: 0, dur: 1.1 });
  }

  function shake(a) {
    G.shake = Math.max(G.shake, a);
  }

  function update(dt) {
    for (const p of G.particles) {
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'star') p.rot += dt * 8;
      if (p.type === 'leaf') { p.rot += dt * 5; p.vy += 60 * dt; }
    }
    G.particles = G.particles.filter((p) => p.t < p.dur);
    for (const t of G.texts) {
      t.t += dt;
      t.y -= 26 * dt;
    }
    G.texts = G.texts.filter((t) => t.t < t.dur);
    G.shake *= Math.exp(-6 * dt);
    if (G.shake < 0.05) G.shake = 0;
  }

  function drawStarPath(ctx, x, y, s, rot) {
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

  function draw(ctx) {
    for (const p of G.particles) {
      const k = 1 - p.t / p.dur;
      if (p.type === 'poof') {
        ctx.globalAlpha = k * 0.7;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + (1 - k) * 1.5), 0, TAU);
        ctx.fill();
      } else if (p.type === 'star') {
        ctx.globalAlpha = k;
        ctx.fillStyle = '#ffd54f';
        drawStarPath(ctx, p.x, p.y, p.size, p.rot);
      } else if (p.type === 'spark') {
        ctx.globalAlpha = k;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
      } else if (p.type === 'leaf') {
        ctx.globalAlpha = k;
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
        ctx.restore();
      } else if (p.type === 'heart') {
        ctx.globalAlpha = k;
        Utils.font(ctx, p.size);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❤️', p.x, p.y);
      } else if (p.type === 'bubble') {
        ctx.globalAlpha = k * 0.7;
        ctx.fillStyle = '#8ee68e';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
      } else if (p.type === 'ring') {
        ctx.globalAlpha = k;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + (1 - k) * 70, 0, TAU);
        ctx.stroke();
      } else if (p.type === 'ember') {
        ctx.globalAlpha = k;
        ctx.fillStyle = '#ffb74d';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    for (const t of G.texts) {
      const k = 1 - t.t / t.dur;
      ctx.globalAlpha = Math.min(1, k * 2);
      Utils.font(ctx, t.size);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillText(t.str, t.x + 1, t.y + 1);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  return { poof, stars, hit, leaf, heart, bubble, ring, ember, text, shake, update, draw };
})();
