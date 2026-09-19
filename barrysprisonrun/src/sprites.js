// Barry's Prison Run — all art is procedural (canvas-drawn at boot, zero image files).
// Barry's dictated look, faithfully: fat policeman, big bare belly with belly-button
// line, triangle head with a hat perched on top, three upper teeth always sticking out.

var SPRITES = {};

function mkCanvas(w, h) {
  var c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c: c, g: c.getContext('2d') };
}

// ---------- shared bits ----------

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function tri(g, x1, y1, x2, y2, x3, y3, r) {
  // rounded triangle path
  var pts = [[x1, y1], [x2, y2], [x3, y3]];
  g.beginPath();
  for (var i = 0; i < 3; i++) {
    var p = pts[i], q = pts[(i + 1) % 3], o = pts[(i + 2) % 3];
    var v1x = o[0] - p[0], v1y = o[1] - p[1];
    var v2x = q[0] - p[0], v2y = q[1] - p[1];
    var l1 = Math.hypot(v1x, v1y) || 1, l2 = Math.hypot(v2x, v2y) || 1;
    var ax = p[0] + v1x / l1 * (r || 0), ay = p[1] + v1y / l1 * (r || 0);
    var bx = p[0] + v2x / l2 * (r || 0), by = p[1] + v2y / l2 * (r || 0);
    if (i === 0) g.moveTo(ax, ay); else g.lineTo(ax, ay);
    g.quadraticCurveTo(p[0], p[1], bx, by);
  }
  g.closePath();
}

var SKIN = '#f2c396', SKIN_D = '#dda878';
var NAVY = '#2d3f66', NAVY_D = '#22304e';
var BELT = '#3a2c22';

// Barry head: standing triangle + hat + 3 teeth. cx = center, baseY, size scale.
function drawBarryHead(g, cx, baseY, s, hat) {
  g.save();
  g.translate(cx, baseY);
  g.scale(s, s);
  // head triangle: base 64 wide at y=0, apex at y=-52
  g.fillStyle = SKIN;
  tri(g, -32, 0, 32, 0, 0, -54, 9);
  g.fill();
  g.strokeStyle = SKIN_D; g.lineWidth = 2.5; g.stroke();
  // ears
  g.fillStyle = SKIN;
  g.beginPath(); g.arc(-31, -14, 5, 0, 7); g.arc(31, -14, 5, 0, 7); g.fill();
  // eyes (angry) + brows
  g.fillStyle = '#222';
  g.beginPath(); g.arc(-10, -22, 3.4, 0, 7); g.arc(10, -22, 3.4, 0, 7); g.fill();
  g.strokeStyle = '#222'; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-17, -30); g.lineTo(-5, -27); g.moveTo(17, -30); g.lineTo(5, -27); g.stroke();
  // mouth line + THREE upper teeth sticking out
  g.strokeStyle = '#7a3f37'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(-13, -10); g.quadraticCurveTo(0, -5, 13, -10); g.stroke();
  g.fillStyle = '#fff'; g.strokeStyle = '#d8d8d8'; g.lineWidth = 1.5;
  for (var t = -1; t <= 1; t++) {
    rr(g, t * 8 - 3.4, -10, 6.8, 10, 2);
    g.fill(); g.stroke();
  }
  // hat perched on the apex
  if (hat === 'chef') {
    g.fillStyle = '#fff'; g.strokeStyle = '#cfcfcf'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(0, -64, 17, 7, 0, 0, 7); g.fill(); g.stroke();
    g.beginPath();
    g.arc(-10, -74, 9, 0, 7); g.arc(0, -80, 10, 0, 7); g.arc(10, -74, 9, 0, 7);
    g.fill(); g.stroke();
    g.fillStyle = '#fff';
    rr(g, -13, -68, 26, 8, 3); g.fill(); g.stroke();
  } else {
    // police hat: brim + dome + badge, tilted on the tip
    g.save();
    g.translate(0, -52);
    g.rotate(-0.08);
    g.fillStyle = NAVY_D;
    g.beginPath(); g.ellipse(0, -6, 24, 6.5, 0, 0, 7); g.fill();
    g.fillStyle = NAVY;
    g.beginPath(); g.moveTo(-17, -6); g.quadraticCurveTo(0, -26, 17, -6); g.closePath(); g.fill();
    g.fillStyle = '#f6d44d';
    g.beginPath(); g.arc(0, -12, 4.5, 0, 7); g.fill();
    g.fillStyle = '#fff';
    g.fillRect(-17, -8, 34, 3);
    g.restore();
  }
  g.restore();
}

// Barry body. opts: frame ('idle0','idle1','walk0','walk1','angry','dizzy','throw'),
// hat ('police'|'chef'), apron (chef)
function drawBarry(g, W, H, opts) {
  var o = opts || {};
  var frame = o.frame || 'idle0';
  var hat = o.hat || 'police';
  var walk = frame === 'walk0' || frame === 'walk1';
  var legPhase = frame === 'walk0' ? 1 : -1;
  var breathe = frame === 'idle1' ? 1 : 0;
  var angry = frame === 'angry';
  var dizzy = frame === 'dizzy';
  var throwing = frame === 'throw';
  var cx = W / 2;
  var groundY = H - 6;

  g.save();
  if (dizzy) {
    // sitting on the ground, slouched
    groundY = H - 4;
  }

  // legs + shoes
  g.fillStyle = NAVY_D;
  if (dizzy) {
    rr(g, cx - 30, groundY - 16, 24, 14, 6); g.fill();
    rr(g, cx + 6, groundY - 16, 24, 14, 6); g.fill();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.ellipse(cx - 18, groundY - 2, 15, 6, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(cx + 18, groundY - 2, 15, 6, 0, 0, 7); g.fill();
  } else {
    var l1 = walk ? legPhase * 8 : 0, l2 = -l1;
    g.fillStyle = NAVY_D;
    rr(g, cx - 26 + l1, groundY - 34, 17, 30, 7); g.fill();
    rr(g, cx + 9 + l2, groundY - 34, 17, 30, 7); g.fill();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.ellipse(cx - 17 + l1 * 1.2, groundY - 3, 13, 5.5, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(cx + 17 + l2 * 1.2, groundY - 3, 13, 5.5, 0, 0, 7); g.fill();
  }

  // ---- the famous belly ----
  var bodyY = dizzy ? groundY - 44 : groundY - 58;
  var bRx = 46 + breathe, bRy = 50 + breathe;
  g.fillStyle = SKIN;
  g.beginPath(); g.ellipse(cx, bodyY, bRx, bRy, 0, 0, 7); g.fill();
  g.strokeStyle = SKIN_D; g.lineWidth = 2.5; g.stroke();

  // tight police shirt riding up: covers only the top of the belly
  g.save();
  g.beginPath(); g.ellipse(cx, bodyY, bRx + 2, bRy + 2, 0, 0, 7); g.clip();
  g.fillStyle = NAVY;
  var shirtBottom = bodyY + 6 + breathe;
  rr(g, cx - bRx - 4, bodyY - bRy - 10, (bRx + 4) * 2, shirtBottom - (bodyY - bRy - 10), 20);
  g.fill();
  // shirt hem wavy line (it is struggling)
  g.strokeStyle = NAVY_D; g.lineWidth = 3;
  g.beginPath();
  for (var sx = -bRx; sx <= bRx; sx += 8) {
    g.lineTo(cx + sx, shirtBottom + (sx / 8 % 2 === 0 ? 4 : 0));
  }
  g.stroke();
  if (hat === 'chef') {
    // apron strings high on the chest; apron itself is tied ABOVE the belly
    g.strokeStyle = '#ddd'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(cx - 20, bodyY - 20); g.lineTo(cx - 26, shirtBottom - 4); g.stroke();
    g.beginPath(); g.moveTo(cx + 20, bodyY - 20); g.lineTo(cx + 26, shirtBottom - 4); g.stroke();
  }
  g.restore();

  // BELLY BUTTON — the whole bare belly shows, with the line
  g.strokeStyle = SKIN_D; g.lineWidth = 3; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx, bodyY + 18); g.lineTo(cx, bodyY + 28); g.stroke();
  g.beginPath(); g.arc(cx, bodyY + 18, 2.4, 0, 7); g.fillStyle = SKIN_D; g.fill();
  // belly shading arc so it reads round
  g.strokeStyle = 'rgba(210,150,100,.5)'; g.lineWidth = 4;
  g.beginPath(); g.arc(cx, bodyY - 4, bRx - 12, 0.5, 1.1); g.stroke();
  g.beginPath(); g.arc(cx, bodyY - 4, bRx - 12, Math.PI - 1.1, Math.PI - 0.5); g.stroke();

  // belt under the belly
  if (!dizzy) {
    g.fillStyle = BELT;
    rr(g, cx - bRx - 1, bodyY + bRy - 14, (bRx + 1) * 2, 13, 6); g.fill();
    g.fillStyle = '#f6d44d';
    rr(g, cx - 8, bodyY + bRy - 13, 16, 11, 3); g.fill();
  }

  // arms
  g.strokeStyle = SKIN; g.lineWidth = 13; g.lineCap = 'round';
  var shY = bodyY - 24;
  if (angry) {
    // both fists up
    g.beginPath(); g.moveTo(cx - bRx + 6, shY); g.lineTo(cx - bRx - 14, shY - 34); g.stroke();
    g.beginPath(); g.moveTo(cx + bRx - 6, shY); g.lineTo(cx + bRx + 14, shY - 34); g.stroke();
    g.fillStyle = SKIN;
    g.beginPath(); g.arc(cx - bRx - 14, shY - 38, 9, 0, 7); g.fill();
    g.beginPath(); g.arc(cx + bRx + 14, shY - 38, 9, 0, 7); g.fill();
  } else if (throwing) {
    g.beginPath(); g.moveTo(cx - bRx + 6, shY); g.lineTo(cx - bRx - 6, shY - 36); g.stroke();
    g.beginPath(); g.moveTo(cx + bRx - 6, shY); g.lineTo(cx + bRx + 10, shY + 18); g.stroke();
    g.fillStyle = SKIN;
    g.beginPath(); g.arc(cx - bRx - 6, shY - 40, 9, 0, 7); g.fill();
  } else {
    var sw = walk ? legPhase * 10 : 0;
    g.beginPath(); g.moveTo(cx - bRx + 6, shY); g.lineTo(cx - bRx - 8 - sw * 0.4, shY + 26 + sw); g.stroke();
    g.beginPath(); g.moveTo(cx + bRx - 6, shY); g.lineTo(cx + bRx + 8 + sw * 0.4, shY + 26 - sw); g.stroke();
  }

  // head
  var headBaseY = bodyY - bRy - 2;
  if (dizzy) {
    drawBarryHead(g, cx, headBaseY + 8, 0.9, hat);
    // swirl eyes over the face
    g.strokeStyle = '#444'; g.lineWidth = 2;
    for (var e = -1; e <= 1; e += 2) {
      g.beginPath();
      for (var a = 0; a < 12; a++) {
        var ang = a * 0.55, rad = 1.5 + a * 0.5;
        g.lineTo(cx + e * 10 + Math.cos(ang) * rad, headBaseY - 13 + Math.sin(ang) * rad);
      }
      g.stroke();
    }
  } else {
    drawBarryHead(g, cx, headBaseY, 1, hat);
  }
  g.restore();
}

// ---------- other sprites ----------

function drawFruit(g, kind) {
  if (kind === 'apple') {
    g.fillStyle = '#e5493a';
    g.beginPath(); g.arc(28, 32, 20, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.beginPath(); g.arc(21, 25, 6, 0, 7); g.fill();
    g.strokeStyle = '#7a4a22'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(28, 12); g.quadraticCurveTo(30, 6, 34, 4); g.stroke();
    g.fillStyle = '#5da641';
    g.beginPath(); g.ellipse(36, 10, 8, 4, -0.5, 0, 7); g.fill();
  } else if (kind === 'banana') {
    g.strokeStyle = '#f5cf3d'; g.lineWidth = 13; g.lineCap = 'round';
    g.beginPath(); g.arc(28, 14, 22, 0.45, 2.3); g.stroke();
    g.strokeStyle = '#d9b52d'; g.lineWidth = 3;
    g.beginPath(); g.arc(28, 14, 15.5, 0.55, 2.2); g.stroke();
    g.fillStyle = '#7a4a22';
    g.fillRect(6, 26, 5, 5);
  } else {
    g.fillStyle = '#4f9f3c';
    g.beginPath(); g.arc(28, 30, 21, 0, 7); g.fill();
    g.strokeStyle = '#3a7d2b'; g.lineWidth = 3;
    for (var i = 0; i < 4; i++) {
      g.beginPath(); g.ellipse(28, 30, 20 - i * 5, 20, 0, -1.2, 1.2); g.stroke();
    }
  }
}

function drawSplat(g, col, seed) {
  g.fillStyle = col;
  g.beginPath();
  var pts = 9;
  for (var i = 0; i <= pts; i++) {
    var a = i / pts * Math.PI * 2;
    var r = 16 + Math.sin(a * 3 + seed) * 6 + (i % 2) * 4;
    g.lineTo(28 + Math.cos(a) * r, 28 + Math.sin(a) * r * 0.8);
  }
  g.closePath(); g.fill();
  g.fillStyle = col;
  g.beginPath(); g.arc(6, 10, 4, 0, 7); g.arc(50, 12, 3, 0, 7); g.arc(48, 46, 4, 0, 7); g.arc(8, 44, 3, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.4)';
  g.beginPath(); g.arc(22, 22, 5, 0, 7); g.fill();
}

function drawRobo(g, W, H, back) {
  var cx = W / 2;
  // legs
  g.fillStyle = '#8a94a6';
  rr(g, cx - 52, H - 66, 34, 58, 10); g.fill();
  rr(g, cx + 18, H - 66, 34, 58, 10); g.fill();
  g.fillStyle = '#6a7383';
  g.fillRect(cx - 52, H - 30, 34, 10); g.fillRect(cx + 18, H - 30, 34, 10);
  // body
  g.fillStyle = '#9aa6ba';
  rr(g, cx - 78, H - 208, 156, 150, 26); g.fill();
  g.strokeStyle = '#6a7383'; g.lineWidth = 4;
  rr(g, cx - 78, H - 208, 156, 150, 26); g.stroke();
  // arms
  g.fillStyle = '#8a94a6';
  rr(g, cx - 108, H - 196, 30, 108, 12); g.fill();
  rr(g, cx + 78, H - 196, 30, 108, 12); g.fill();
  g.fillStyle = '#6a7383';
  g.beginPath(); g.arc(cx - 93, H - 84, 17, 0, 7); g.fill();
  g.beginPath(); g.arc(cx + 93, H - 84, 17, 0, 7); g.fill();
  // rivets
  g.fillStyle = '#6a7383';
  for (var i = 0; i < 5; i++) {
    g.beginPath(); g.arc(cx - 62 + i * 31, H - 190, 3, 0, 7); g.fill();
  }
  if (!back) {
    // chest plate + dials + a target ring drawn behind by the fight code
    g.fillStyle = '#7f8ca0';
    rr(g, cx - 40, H - 190, 80, 64, 14); g.fill();
    g.fillStyle = '#f6d44d';
    g.beginPath(); g.arc(cx - 16, H - 158, 9, 0, 7); g.fill();
    g.fillStyle = '#e5493a';
    g.beginPath(); g.arc(cx + 12, H - 158, 7, 0, 7); g.fill();
    g.fillStyle = '#5da641';
    g.beginPath(); g.arc(cx - 16, H - 176, 5, 0, 7); g.fill();
  } else {
    // back: big hatch
    g.fillStyle = '#7f8ca0';
    rr(g, cx - 46, H - 190, 92, 88, 14); g.fill();
    g.strokeStyle = '#6a7383'; g.lineWidth = 4;
    rr(g, cx - 34, H - 178, 68, 64, 10); g.stroke();
  }
  // neck + glass dome with Barry inside (his head fills the dome, hat and all)
  g.fillStyle = '#6a7383';
  rr(g, cx - 18, H - 228, 36, 24, 8); g.fill();
  g.fillStyle = 'rgba(200,230,255,.55)';
  g.beginPath(); g.arc(cx, H - 258, 44, 0, 7); g.fill();
  g.strokeStyle = '#b9c8dd'; g.lineWidth = 5;
  g.beginPath(); g.arc(cx, H - 258, 44, 0, 7); g.stroke();
  g.save();
  g.beginPath(); g.arc(cx, H - 258, 42, 0, 7); g.clip();
  drawBarryHead(g, cx, H - 232, 0.92, 'police');
  g.restore();
  // shine on dome
  g.fillStyle = 'rgba(255,255,255,.5)';
  g.beginPath(); g.ellipse(cx - 16, H - 276, 12, 6, -0.6, 0, 7); g.fill();
}

function drawCar(g, W, H) {
  var cx = W / 2;
  g.fillStyle = '#eef1f5';
  rr(g, 14, H - 52, W - 28, 30, 10); g.fill();
  rr(g, 44, H - 76, W - 88, 30, 12); g.fill();
  g.fillStyle = '#2d3f66';
  g.fillRect(30, H - 50, W - 60, 8);
  g.fillStyle = 'rgba(160,200,240,.9)';
  rr(g, 54, H - 72, 34, 22, 6); g.fill();
  rr(g, W - 88, H - 72, 34, 22, 6); g.fill();
  // star badge on door
  g.fillStyle = '#f6d44d';
  g.beginPath();
  for (var i = 0; i < 5; i++) {
    var a = -Math.PI / 2 + i * Math.PI * 2 / 5;
    var a2 = a + Math.PI / 5;
    g.lineTo(cx + Math.cos(a) * 11, H - 36 + Math.sin(a) * 11);
    g.lineTo(cx + Math.cos(a2) * 5, H - 36 + Math.sin(a2) * 5);
  }
  g.closePath(); g.fill();
  // light bar
  g.fillStyle = '#37424f';
  rr(g, cx - 26, H - 84, 52, 10, 4); g.fill();
  g.fillStyle = '#e5493a';
  rr(g, cx - 24, H - 82, 22, 7, 3); g.fill();
  g.fillStyle = '#4d7df0';
  rr(g, cx + 2, H - 82, 22, 7, 3); g.fill();
  // wheels
  g.fillStyle = '#1c1c1c';
  g.beginPath(); g.arc(42, H - 20, 13, 0, 7); g.arc(W - 42, H - 20, 13, 0, 7); g.fill();
  g.fillStyle = '#8a94a6';
  g.beginPath(); g.arc(42, H - 20, 5, 0, 7); g.arc(W - 42, H - 20, 5, 0, 7); g.fill();
}

function drawHeli(g, W, H) {
  var cx = W / 2;
  // tail
  g.fillStyle = '#3d6bd0';
  g.beginPath();
  g.moveTo(cx - 6, H - 86); g.lineTo(cx - 96, H - 96); g.lineTo(cx - 96, H - 84); g.lineTo(cx - 6, H - 70);
  g.closePath(); g.fill();
  g.fillStyle = '#3d6bd0';
  rr(g, cx - 8, H - 78, 18, 30, 6); g.fill();
  // body
  g.fillStyle = '#4d7df0';
  g.beginPath(); g.ellipse(cx + 4, H - 62, 58, 34, 0, 0, 7); g.fill();
  // window
  g.fillStyle = 'rgba(190,225,255,.95)';
  g.beginPath(); g.ellipse(cx + 34, H - 68, 22, 16, 0, 0, 7); g.fill();
  // skids
  g.strokeStyle = '#37424f'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx - 40, H - 26); g.lineTo(cx + 48, H - 26); g.stroke();
  g.beginPath(); g.moveTo(cx - 30, H - 34); g.lineTo(cx - 34, H - 26); g.moveTo(cx + 38, H - 34); g.lineTo(cx + 42, H - 26); g.stroke();
  // top mast + rotor blur
  g.fillStyle = '#37424f';
  g.fillRect(cx + 2, H - 102, 5, 14);
  g.fillStyle = 'rgba(60,70,85,.55)';
  g.beginPath(); g.ellipse(cx + 4, H - 102, 74, 5, 0, 0, 7); g.fill();
  // side police badge
  g.fillStyle = '#f6d44d';
  g.beginPath(); g.arc(cx - 14, H - 66, 8, 0, 7); g.fill();
}

function drawSpike(g, W, H) {
  // cartoon grey cones — rounded, friendly, no scary edges
  var cs = [[W * 0.25, 4], [W * 0.5, 0], [W * 0.75, 6]];
  for (var i = 0; i < cs.length; i++) {
    var bx = cs[i][0], lift = cs[i][1];
    g.fillStyle = i % 2 ? '#aab4c2' : '#98a3b3';
    tri(g, bx - 14, H - 2, bx + 14, H - 2, bx, 8 + lift, 6);
    g.fill();
    g.strokeStyle = '#7c8798'; g.lineWidth = 2; g.stroke();
  }
}

function drawBunk(g, W, H) {
  // metal frame + two mattresses
  g.strokeStyle = '#6a7383'; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath();
  g.moveTo(10, H - 6); g.lineTo(10, 12); g.moveTo(W - 10, H - 6); g.lineTo(W - 10, 12);
  g.moveTo(10, H - 6); g.lineTo(W - 10, H - 6);
  g.moveTo(10, H * 0.52); g.lineTo(W - 10, H * 0.52);
  g.stroke();
  // ladder side
  g.lineWidth = 4;
  for (var i = 1; i < 5; i++) {
    var y = H - 6 - (H - 18) * i / 5;
    g.beginPath(); g.moveTo(W - 10, y); g.lineTo(W - 26, y - 3); g.stroke();
  }
  g.fillStyle = '#5da641';
  rr(g, 16, H * 0.52 + 4, W - 32, 14, 6); g.fill();
  rr(g, 16, 14, W - 32, 14, 6); g.fill();
  g.fillStyle = '#7ac162';
  rr(g, 16, H * 0.52 + 4, W - 32, 6, 4); g.fill();
  rr(g, 16, 14, W - 32, 6, 4); g.fill();
  // pillow
  g.fillStyle = '#fff';
  rr(g, 22, 10, 30, 12, 5); g.fill();
  rr(g, 22, H * 0.52, 30, 12, 5); g.fill();
}

function drawTable(g, W, H) {
  g.fillStyle = '#b0b7c4';
  rr(g, 6, H - 26, W - 12, 10, 4); g.fill();
  g.fillStyle = '#8a94a6';
  g.fillRect(18, H - 16, 8, 16); g.fillRect(W - 26, H - 16, 8, 16);
  // trays with food blobs
  g.fillStyle = '#e8ecf4';
  for (var i = 0; i < 4; i++) rr(g, 20 + i * (W / 4.4), H - 32, 26, 8, 3), g.fill();
  g.fillStyle = '#e5493a'; g.beginPath(); g.arc(30, H - 32, 4, 0, 7); g.fill();
  g.fillStyle = '#f5cf3d'; g.beginPath(); g.arc(30 + W / 4.4, H - 32, 4, 0, 7); g.fill();
  g.fillStyle = '#5da641'; g.beginPath(); g.arc(30 + 2 * W / 4.4, H - 32, 4, 0, 7); g.fill();
}

function drawButton(g, pressed) {
  g.fillStyle = '#5b6472';
  rr(g, 10, 14, 36, 36, 8); g.fill();
  g.fillStyle = pressed ? '#5da641' : '#e5493a';
  g.beginPath(); g.arc(28, 30, pressed ? 10 : 13, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.45)';
  g.beginPath(); g.arc(24, 26, 4, 0, 7); g.fill();
}

function drawFlag(g, W, H, wave) {
  g.strokeStyle = '#6a7383'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(14, H - 4); g.lineTo(14, 8); g.stroke();
  g.fillStyle = '#f5cf3d';
  g.beginPath();
  g.moveTo(16, 8);
  g.quadraticCurveTo(30 + wave * 4, 12 + wave * 3, 44, 10);
  g.lineTo(44, 26);
  g.quadraticCurveTo(30 + wave * 4, 28 + wave * 3, 16, 24);
  g.closePath(); g.fill();
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(31, 17, 5, 0, 7); g.fill();
}

function drawTargetGlow(g) {
  var rg = g.createRadialGradient(32, 32, 4, 32, 32, 30);
  rg.addColorStop(0, 'rgba(255,240,150,.95)');
  rg.addColorStop(0.6, 'rgba(255,210,60,.65)');
  rg.addColorStop(1, 'rgba(255,200,40,0)');
  g.fillStyle = rg;
  g.beginPath(); g.arc(32, 32, 30, 0, 7); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 3;
  g.beginPath(); g.arc(32, 32, 12, 0, 7); g.stroke();
}

// the "go here!" waypoint: a big friendly bouncing chevron pointing down
function drawGoalBeacon(g) {
  g.fillStyle = '#5da641';
  g.strokeStyle = '#fff'; g.lineWidth = 5; g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(32, 62);
  g.lineTo(10, 26); g.lineTo(24, 26);
  g.lineTo(24, 4);  g.lineTo(40, 4);  g.lineTo(40, 26);
  g.lineTo(54, 26);
  g.closePath();
  g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.35)';
  g.fillRect(26, 8, 4, 14);
  g.fillRect(33, 8, 3, 14);
}

function drawGrille(g, W, H) {
  g.fillStyle = '#4d5462';
  rr(g, 4, 4, W - 8, H - 8, 8); g.fill();
  g.fillStyle = '#2c313c';
  for (var i = 0; i < 5; i++) rr(g, 12, 12 + i * 11, W - 24, 6, 3), g.fill();
}

// a big vent cover swung open on a hinge — reads instantly as "vent entrance"
function drawGrilleOpen(g, W, H) {
  // dark duct opening behind
  g.fillStyle = '#23272e';
  rr(g, 8, 10, W - 16, H - 20, 10); g.fill();
  // metal frame
  g.strokeStyle = '#8d99ab'; g.lineWidth = 7;
  rr(g, 8, 10, W - 16, H - 20, 10); g.stroke();
  // slats inside the duct so it reads as a duct, not a shadow
  g.strokeStyle = '#4a5361'; g.lineWidth = 5; g.lineCap = 'round';
  for (var i = 1; i <= 4; i++) {
    var y = 10 + (H - 20) * i / 5;
    g.beginPath(); g.moveTo(16, y); g.lineTo(W - 16, y); g.stroke();
  }
  // the open flap (hinged at the left, swung outward)
  g.save();
  g.translate(10, H / 2);
  g.rotate(-0.5);
  g.fillStyle = '#a7b3c4';
  rr(g, 0, -H * 0.34, 10, H * 0.62, 5); g.fill();
  g.strokeStyle = '#7d8899'; g.lineWidth = 3;
  rr(g, 0, -H * 0.34, 10, H * 0.62, 5); g.stroke();
  g.restore();
  // corner screws
  g.fillStyle = '#d7dee8';
  g.beginPath();
  g.arc(16, 18, 3, 0, 7); g.arc(W - 16, 18, 3, 0, 7);
  g.arc(16, H - 18, 3, 0, 7); g.arc(W - 16, H - 18, 3, 0, 7);
  g.fill();
}

function drawYumSign(g, W, H) {
  g.fillStyle = '#a97c50';
  rr(g, 4, 10, W - 8, H - 20, 10); g.fill();
  g.strokeStyle = '#8a6238'; g.lineWidth = 4;
  rr(g, 4, 10, W - 8, H - 20, 10); g.stroke();
  g.fillStyle = '#ffe9a8';
  g.font = 'bold 30px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('YUM!', W / 2, H / 2);
}

function drawLadder(g, W, H) {
  g.strokeStyle = '#8a6244'; g.lineWidth = 9; g.lineCap = 'round';
  g.beginPath();
  g.moveTo(14, H - 4); g.lineTo(14, 4);
  g.moveTo(W - 14, H - 4); g.lineTo(W - 14, 4);
  g.stroke();
  g.strokeStyle = '#a97c50'; g.lineWidth = 7;
  for (var y = 14; y < H - 8; y += 18) {
    g.beginPath(); g.moveTo(14, y); g.lineTo(W - 14, y); g.stroke();
  }
}

function drawBazooka(g, W, H) {
  g.save();
  g.translate(W / 2, H / 2);
  g.rotate(-0.5);
  g.fillStyle = '#5d8f4a';
  rr(g, -12, -40, 24, 80, 11); g.fill();
  g.fillStyle = '#4a733b';
  rr(g, -14, -8, 28, 24, 8); g.fill();
  g.fillStyle = '#3c5f30';
  g.beginPath(); g.ellipse(0, -40, 12, 5, 0, 0, 7); g.fill();
  g.fillStyle = '#f6d44d';
  g.fillRect(-12, -18, 24, 6);
  g.fillStyle = '#e5493a';
  g.beginPath(); g.arc(0, 14, 5, 0, 7); g.fill();
  g.restore();
  // a fruit peeking out of the muzzle
  g.drawImage(SPRITES.fruit_apple, W / 2 - 13, 2, 26, 26);
}

function drawMeatloaf(g) {
  g.fillStyle = '#9c6242';
  rr(g, 6, 18, 44, 26, 12); g.fill();
  g.fillStyle = '#7a4a30';
  g.beginPath(); g.ellipse(28, 18, 22, 7, 0, 0, 7); g.fill();
  g.strokeStyle = '#d64545'; g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(14, 32); g.quadraticCurveTo(28, 26, 42, 32); g.stroke();
}

function drawPie(g) {
  g.fillStyle = '#c9ced9';
  g.beginPath(); g.ellipse(28, 34, 22, 10, 0, 0, 7); g.fill();
  g.fillStyle = '#fdf6e3';
  g.beginPath(); g.arc(28, 26, 18, Math.PI, 0); g.fill();
  g.fillStyle = '#e5493a';
  g.beginPath(); g.arc(28, 14, 5, 0, 7); g.fill();
}

function drawTennis(g) {
  g.fillStyle = '#cbe54e';
  g.beginPath(); g.arc(28, 28, 20, 0, 7); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 3;
  g.beginPath(); g.arc(28, 20, 16, 0.3, 2.8); g.stroke();
  g.beginPath(); g.arc(28, 36, 16, Math.PI + 0.3, Math.PI + 2.8); g.stroke();
}

function drawCone(g) {
  g.fillStyle = '#f08c2e';
  tri(g, 20, 52, 44, 52, 32, 6, 5); g.fill();
  g.fillStyle = '#fff';
  rr(g, 24, 26, 16, 8, 3); g.fill();
  g.fillStyle = '#f08c2e';
  rr(g, 14, 50, 36, 8, 4); g.fill();
}

// ---------- build all ----------

function initSprites() {
  var m;

  // Barry: officer frames
  var frames = ['idle0', 'idle1', 'walk0', 'walk1', 'angry', 'dizzy'];
  for (var i = 0; i < frames.length; i++) {
    m = mkCanvas(150, 195);
    drawBarry(m.g, 150, 195, { frame: frames[i], hat: 'police' });
    SPRITES['barry_' + frames[i]] = m.c;
  }
  // Barry: chef frames
  var cframes = ['idle0', 'idle1', 'throw', 'dizzy'];
  for (i = 0; i < cframes.length; i++) {
    m = mkCanvas(150, 195);
    drawBarry(m.g, 150, 195, { frame: cframes[i], hat: 'chef' });
    SPRITES['chef_' + cframes[i]] = m.c;
  }

  // Robo Barry (front + back)
  m = mkCanvas(230, 360); drawRobo(m.g, 230, 360, false); SPRITES.robo_front = m.c;
  m = mkCanvas(230, 360); drawRobo(m.g, 230, 360, true); SPRITES.robo_back = m.c;

  // fruit + splats
  var kinds = ['apple', 'banana', 'melon'];
  for (i = 0; i < kinds.length; i++) {
    m = mkCanvas(56, 56); drawFruit(m.g, kinds[i]); SPRITES['fruit_' + kinds[i]] = m.c;
  }
  var splatCols = { red: '#e5493a', yellow: '#f5cf3d', green: '#5da641', cream: '#fdf6e3' };
  for (var sc in splatCols) {
    m = mkCanvas(56, 56); drawSplat(m.g, splatCols[sc], sc.length); SPRITES['splat_' + sc] = m.c;
  }

  m = mkCanvas(56, 50); drawMeatloaf(m.g); SPRITES.meatloaf = m.c;
  m = mkCanvas(56, 46); drawPie(m.g); SPRITES.pie = m.c;
  m = mkCanvas(56, 56); drawTennis(m.g); SPRITES.tennis = m.c;
  m = mkCanvas(60, 62); drawCone(m.g); SPRITES.cone = m.c;
  m = mkCanvas(200, 100); drawCar(m.g, 200, 100); SPRITES.car = m.c;
  m = mkCanvas(240, 150); drawHeli(m.g, 240, 150); SPRITES.heli = m.c;
  m = mkCanvas(84, 60); drawSpike(m.g, 84, 60); SPRITES.spikes = m.c;
  m = mkCanvas(180, 190); drawBunk(m.g, 180, 190); SPRITES.bunk = m.c;
  m = mkCanvas(230, 60); drawTable(m.g, 230, 60); SPRITES.table = m.c;
  m = mkCanvas(56, 56); drawButton(m.g, false); SPRITES.button0 = m.c;
  m = mkCanvas(56, 56); drawButton(m.g, true); SPRITES.button1 = m.c;
  m = mkCanvas(48, 44); drawFlag(m.g, 48, 44, 0); SPRITES.flag0 = m.c;
  m = mkCanvas(48, 44); drawFlag(m.g, 48, 44, 1); SPRITES.flag1 = m.c;
  m = mkCanvas(64, 64); drawTargetGlow(m.g); SPRITES.targetglow = m.c;
  m = mkCanvas(70, 84); drawGrille(m.g, 70, 84); SPRITES.grille = m.c;
  m = mkCanvas(120, 60); drawYumSign(m.g, 120, 60); SPRITES.yumsign = m.c;
  m = mkCanvas(54, 170); drawLadder(m.g, 54, 170); SPRITES.ladder = m.c;
  m = mkCanvas(64, 90); drawBazooka(m.g, 64, 90); SPRITES.bazooka = m.c;
  m = mkCanvas(110, 100); drawGrilleOpen(m.g, 110, 100); SPRITES.grilleopen = m.c;
  m = mkCanvas(64, 66); drawGoalBeacon(m.g); SPRITES.goalbeacon = m.c;

  SPRITES._flashCache = {};
}

// white "hit flash" copy of a sprite, cached
function flashSprite(key) {
  var cache = SPRITES._flashCache;
  if (cache[key]) return cache[key];
  var src = SPRITES[key];
  var c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  var g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(255,255,255,.75)';
  g.fillRect(0, 0, c.width, c.height);
  cache[key] = c;
  return c;
}
