// 100-Player Meme Maze — procedural canvas textures (cheese, stone, brick, grass, lava, wood…)
'use strict';

function makeTex(draw, size, repeatX, repeatY, srgb) {
  const c = document.createElement('canvas');
  c.width = c.height = size || 256;
  const ctx = c.getContext('2d');
  draw(ctx, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeatX) t.repeat.set(repeatX, repeatY || repeatX);
  if (srgb !== false) t.encoding = THREE.sRGBEncoding;
  t.anisotropy = 4;
  return t;
}

function noiseBlotch(ctx, w, h, n, colors, rMin, rMax, rand) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
    ctx.beginPath();
    ctx.ellipse(rand() * w, rand() * h, rMin + rand() * (rMax - rMin), rMin + rand() * (rMax - rMin), rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
}

const Tex = {
  cheese(rand) {
    return makeTex((ctx, w, h) => {
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, 0, w, h);
      noiseBlotch(ctx, w, h, 26, ['#fbc02d', '#fdd860'], 12, 34, rand);
      // cheese holes with rims
      for (let i = 0; i < 10; i++) {
        const x = rand() * w, y = rand() * h, r = 10 + rand() * 22;
        ctx.fillStyle = '#e8a51e'; ctx.beginPath(); ctx.ellipse(x + 2, y + 3, r, r * .82, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c98a12'; ctx.beginPath(); ctx.ellipse(x, y, r * .92, r * .74, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#a86f0a'; ctx.beginPath(); ctx.ellipse(x, y + r * .18, r * .6, r * .45, 0, 0, Math.PI * 2); ctx.fill();
      }
    });
  },

  stone(rand) {
    return makeTex((ctx, w, h) => {
      ctx.fillStyle = '#6f7479'; ctx.fillRect(0, 0, w, h);
      const rows = 4, bw = w / 3;
      for (let r = 0; r < rows; r++) {
        const off = (r % 2) * bw / 2;
        for (let c = -1; c < 4; c++) {
          const x = c * bw + off + 4, y = r * (h / rows) + 4;
          const g = 145 + Math.floor(rand() * 30);
          ctx.fillStyle = `rgb(${g},${g + 4},${g + 9})`;
          ctx.fillRect(x, y, bw - 8, h / rows - 8);
          ctx.fillStyle = 'rgba(255,255,255,.18)';
          ctx.fillRect(x, y, bw - 8, 5);
          ctx.fillStyle = 'rgba(0,0,0,.16)';
          ctx.fillRect(x, y + h / rows - 13, bw - 8, 5);
        }
      }
      noiseBlotch(ctx, w, h, 18, ['rgba(0,0,0,.10)', 'rgba(255,255,255,.08)'], 6, 18, rand);
    });
  },

  brick(rand) {
    return makeTex((ctx, w, h) => {
      ctx.fillStyle = '#c9bfae'; ctx.fillRect(0, 0, w, h);
      const rows = 6, bh = h / rows, bw = w / 3;
      for (let r = 0; r < rows; r++) {
        const off = (r % 2) * bw / 2;
        for (let c = -1; c < 4; c++) {
          const x = c * bw + off + 3, y = r * bh + 3;
          const v = Math.floor(rand() * 26);
          ctx.fillStyle = `rgb(${185 + v},${86 + v * .5 | 0},${62 + v * .4 | 0})`;
          ctx.fillRect(x, y, bw - 6, bh - 6);
          ctx.fillStyle = 'rgba(0,0,0,.15)';
          ctx.fillRect(x, y + bh - 10, bw - 6, 4);
        }
      }
    });
  },

  grass(rand) {
    return makeTex((ctx, w, h) => {
      ctx.fillStyle = '#4f9d3f'; ctx.fillRect(0, 0, w, h);
      noiseBlotch(ctx, w, h, 40, ['#46923a', '#58a848', '#408836'], 10, 30, rand);
      for (let i = 0; i < 260; i++) {
        const x = rand() * w, y = rand() * h, len = 5 + rand() * 9;
        ctx.strokeStyle = rand() < .5 ? '#3e7d33' : '#6bbd54';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rand() - .5) * 4, y - len); ctx.stroke();
      }
      for (let i = 0; i < 8; i++) { // tiny flowers
        const x = rand() * w, y = rand() * h;
        ctx.fillStyle = rand() < .5 ? '#fff6d8' : '#ffd1e8';
        ctx.beginPath(); ctx.arc(x, y, 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffcf3f'; ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
      }
    });
  },

  ground(rand) {
    return makeTex((ctx, w, h) => {
      ctx.fillStyle = '#9c8f7a'; ctx.fillRect(0, 0, w, h);
      const s = 64;
      for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) {
        const v = Math.floor(rand() * 20);
        ctx.fillStyle = `rgb(${158 + v},${148 + v},${126 + v})`;
        ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
      }
      noiseBlotch(ctx, w, h, 30, ['rgba(0,0,0,.07)', 'rgba(255,255,255,.06)'], 5, 16, rand);
    }, 256, 40, 40);
  },

  lava(rand) {
    return makeTex((ctx, w, h) => {
      ctx.fillStyle = '#ff5a1f'; ctx.fillRect(0, 0, w, h);
      noiseBlotch(ctx, w, h, 22, ['#e03e0f', '#c22f08'], 18, 44, rand);
      // glowing veins
      ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let i = 0; i < 14; i++) {
        ctx.strokeStyle = rand() < .5 ? '#ffd23f' : '#ffec8a';
        ctx.beginPath();
        let x = rand() * w, y = rand() * h;
        ctx.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (rand() - .5) * 90; y += (rand() - .5) * 90; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      noiseBlotch(ctx, w, h, 10, ['#ffe08a'], 3, 9, rand);
    });
  },

  wood(rand) {
    return makeTex((ctx, w, h) => {
      ctx.fillStyle = '#b07a3f'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 22; i++) {
        ctx.strokeStyle = rand() < .5 ? '#8a5a28' : '#c08b4d';
        ctx.lineWidth = 1 + rand() * 3;
        const y = rand() * h;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(w * .3, y + 6, w * .6, y - 6, w, y + 2); ctx.stroke();
      }
      ctx.strokeStyle = '#7c4e20'; ctx.lineWidth = 10;
      ctx.strokeRect(0, 0, w, h);
    });
  },

  fur(rand) {
    return makeTex((ctx, w, h) => {
      ctx.fillStyle = '#f59a2b'; ctx.fillRect(0, 0, w, h);
      noiseBlotch(ctx, w, h, 20, ['#eda21f', '#fba63a'], 12, 34, rand);
      ctx.lineWidth = 14; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        ctx.strokeStyle = 'rgba(196,110,20,.85)';
        const y = 20 + i * 38 + rand() * 8;
        ctx.beginPath(); ctx.moveTo(0, y);
        ctx.bezierCurveTo(w * .3, y - 16, w * .7, y + 16, w, y); ctx.stroke();
      }
    });
  },

  face() { // classic smiley on yellow — Roblox style
    return makeTex((ctx, w, h) => {
      ctx.fillStyle = '#f7d33c'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#231f20';
      ctx.beginPath(); ctx.ellipse(w * .34, h * .40, 9, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(w * .66, h * .40, 9, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.strokeStyle = '#231f20';
      ctx.beginPath(); ctx.arc(w * .5, h * .52, w * .22, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke();
    });
  },

  laserBeam() {
    return makeTex((ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(255,40,40,0)');
      g.addColorStop(0.5, 'rgba(255,90,90,1)');
      g.addColorStop(1, 'rgba(255,40,40,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,220,220,.9)'; ctx.fillRect(w * .42, 0, w * .16, h);
    }, 64, 1, 1, false);
  },

  glow(color) {
    return makeTex((ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, color);
      g.addColorStop(0.4, color.replace('1)', '0.45)'));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }, 128, 1, 1, false);
  },

  star() {
    return makeTex((ctx, w, h) => {
      ctx.translate(w / 2, h / 2);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4, r = i % 2 ? w * .12 : w * .48;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
    }, 64, 1, 1, false);
  },

  bubble(text) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 224;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(255,255,255,.96)';
    ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 10;
    const r = 40;
    ctx.beginPath();
    ctx.moveTo(24 + r, 20); ctx.lineTo(488 - r, 20); ctx.quadraticCurveTo(488, 20, 488, 20 + r);
    ctx.lineTo(488, 150 - r); ctx.quadraticCurveTo(488, 150, 488 - r, 150);
    ctx.lineTo(290, 150); ctx.lineTo(256, 204); ctx.lineTo(240, 150);
    ctx.lineTo(24 + r, 150); ctx.quadraticCurveTo(24, 150, 24, 150 - r);
    ctx.lineTo(24, 20 + r); ctx.quadraticCurveTo(24, 20, 24 + r, 20);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1b1b1b';
    ctx.font = 'bold 52px "Comic Sans MS","Chalkboard SE",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 84, 430);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    return t;
  },
};
