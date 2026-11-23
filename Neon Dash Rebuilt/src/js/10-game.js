const $ = id => document.getElementById(id);

/* ---------- Audio: tiny procedural synthwave ---------- */
const A = {
  c: null, m: false, step: 0, iv: 0,
  init() {
    try {
      if (!this.c) {
        this.c = new (window.AudioContext || window.webkitAudioContext)();
        this.g = this.c.createGain(); this.g.gain.value = .4; this.g.connect(this.c.destination);
      }
      if (this.c.state === 'suspended') this.c.resume();
    } catch (e) {}
    return !!this.c;
  },
  t(type, f1, f2, d, v = .15, dl = 0) {
    if (this.m || !this.init()) return;
    try {
      const c = this.c, n = c.currentTime + dl, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f1, n); o.frequency.exponentialRampToValueAtTime(f2, n + d);
      g.gain.setValueAtTime(v, n); g.gain.exponentialRampToValueAtTime(.001, n + d);
      o.connect(g); g.connect(this.g); o.start(n); o.stop(n + d + .02);
    } catch (e) {}
  },
  music(on) {
    clearInterval(this.iv); this.iv = 0;
    if (!on) return;
    const r = [36.7, 43.7, 32.7, 27.5], arp = [293.7, 349.2, 440, 523.3, 440, 349.2, 329.6, 293.7];
    this.iv = setInterval(() => {
      if (this.m || !this.c || this.c.state !== 'running') { this.step++; return; }
      const s = this.step++ % 64, b = r[s >> 4];
      this.t('sawtooth', s % 2 ? b * 2 : b, s % 2 ? b * 1.9 : b * .96, .12, .11);
      if (s % 2 === 0) this.t('triangle', arp[(s >> 1) % 8], arp[(s >> 1) % 8] * .99, .18, .06);
      if (s % 4 === 0) this.t('sine', 125, 38, .12, .25);
    }, 117);
  }
};

/* ---------- Game world (also the title-screen backdrop) ---------- */
const cv = $('cv'), x = cv.getContext('2d');
let W, H, gy, px, sz = 34, mode = 'splash', off = 0, best = 0, G;
try { best = +localStorage.getItem('taco.ndr.best') || 0; } catch (e) {}
const CAT = {
  color: [
    { id: 'cyan', n: 'NEON CYAN', p: 0, e: '#00f3ff', c: '#ff007f' }, { id: 'inferno', n: 'INFERNO', p: 40, e: '#ff7a00', c: '#ffd000' },
    { id: 'toxic', n: 'TOXIC', p: 60, e: '#39ff14', c: '#0b5a1c' }, { id: 'ghost', n: 'GHOST', p: 80, e: '#e8f0ff', c: '#9d00ff' },
    { id: 'gold', n: 'GOLD RUSH', p: 120, e: '#ffd000', c: '#ffffff' }, { id: 'custom', n: 'CUSTOM PICKER', p: 200, e: '#ff00ff', c: '#00ffcc' },
    { id: 'rgb', n: 'RGB CYCLE', p: 250, e: '#fff', c: '#fff' }],
  shape: [{ id: 'square', n: 'SQUARE', p: 0 }, { id: 'circle', n: 'ORB', p: 50 }, { id: 'diamond', n: 'DIAMOND', p: 70 }, { id: 'hex', n: 'HEXAGON', p: 90 }, { id: 'tri', n: 'DELTA', p: 120 }],
  code: [{ id: 'none', n: 'SOLID CORE', p: 0, t: '', ic: '\u25A0' }, { id: 'bin', n: 'BINARY', p: 40, t: '01', ic: '01' }, { id: 'hash', n: 'HASH', p: 50, t: '#', ic: '#' },
    { id: 'tag', n: 'HTML TAG', p: 70, t: '</>', ic: '</>' }, { id: 'brace', n: 'BRACES', p: 70, t: '{}', ic: '{}' }, { id: 'lam', n: 'LAMBDA', p: 90, t: '\u03BB', ic: '\u03BB' }],
  trail: [{ id: 'none', n: 'NO TRAIL', p: 0, ic: '\u2014' }, { id: 'pixel', n: 'PIXELS', p: 30, ic: '\u25AA\u25AA' }, { id: 'plasma', n: 'PLASMA', p: 60, ic: '\u25CF' }, { id: 'spark', n: 'SPARKLE', p: 90, ic: '\u2726' }]
};
let SV = { coins: 0, own: ['color:cyan', 'shape:square', 'code:none', 'trail:none'], eq: { color: 'cyan', shape: 'square', code: 'none', trail: 'none' }, cu: { e: '#ff00ff', c: '#00ffcc' } };
try { const j = JSON.parse(localStorage.getItem('taco.ndr.save')); if (j) { SV.coins = j.coins || 0; if (j.own) Object.assign(SV, j); } } catch (e) {}
function save() { try { localStorage.setItem('taco.ndr.save', JSON.stringify(SV)); } catch (e) {} }
function skin(t, q) {
  q = q || SV.eq;
  const k = CAT.color.find(z => z.id === q.color) || CAT.color[0]; let e = k.e, c = k.c;
  if (k.id === 'custom') { e = SV.cu.e; c = SV.cu.c; }
  if (k.id === 'rgb') { const h = ((t || 0) * 140) % 360; e = 'hsl(' + h + ',100%,60%)'; c = 'hsl(' + ((h + 180) % 360) + ',100%,60%)'; }
  return { e, c, s: q.shape, g: (CAT.code.find(z => z.id === q.code) || CAT.code[0]).t, tr: q.trail };
}
function shape(c, s, r) {
  c.beginPath();
  if (s === 'circle') c.arc(0, 0, r, 0, 7);
  else if (s === 'diamond') { c.moveTo(0, -r * 1.25); c.lineTo(r * 1.25, 0); c.lineTo(0, r * 1.25); c.lineTo(-r * 1.25, 0); c.closePath(); }
  else if (s === 'hex') { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15); } c.closePath(); }
  else if (s === 'tri') { c.moveTo(0, -r * 1.2); c.lineTo(r * 1.15, r); c.lineTo(-r * 1.15, r); c.closePath(); }
  else c.rect(-r, -r, r * 2, r * 2);
}
function drawSkin(c, k, r, glow) {
  c.shadowBlur = glow; c.shadowColor = k.e; c.fillStyle = '#071324'; c.strokeStyle = k.e; c.lineWidth = 2.6;
  shape(c, k.s, r); c.fill(); c.stroke();
  c.fillStyle = k.c; c.shadowColor = k.c;
  if (k.g) { c.save(); c.rotate(-(k.rot || 0)); c.font = '900 ' + Math.round(r * .95) + 'px Orbitron,monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(k.g, 0, 1); c.restore(); }
  else { shape(c, k.s, r * .44); c.fill(); }
}
function drawTrail(t) {
  const k = skin(t); if (k.tr === 'none' || !G.hist) return;
  x.save(); x.shadowBlur = 10; x.shadowColor = k.e;
  G.hist.forEach((yy, i) => {
    const xx = px + sz / 2 - (i + 1) * 11, y = gy - yy - sz / 2, f = 1 - i / 14; x.globalAlpha = .55 * f; x.fillStyle = k.e;
    if (k.tr === 'pixel') x.fillRect(xx - 3, y - 3 + (i % 2 ? 5 : -5), 6, 6);
    else if (k.tr === 'plasma') { x.beginPath(); x.arc(xx, y, sz * .42 * f, 0, 7); x.fill(); }
    else if (i % 2 === 0) { x.fillStyle = i % 4 ? '#fff' : k.c; x.fillRect(xx + Math.sin(t * 20 + i) * 6 - 2, y + Math.cos(t * 17 + i) * 9 - 2, 4, 4); }
  });
  x.restore();
}
function rs() {
  const d = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; x.setTransform(d, 0, 0, d, 0, 0);
  gy = H * .76; px = Math.min(W * .2, 200);
}
const stars = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random() * .5, p: Math.random() * 6 }));
let cw = 0;
const city = Array.from({ length: 36 }, () => { const w = 30 + Math.random() * 60, o = { x: cw, w, h: 30 + Math.random() * 110, c: Math.random() < .5 ? '#00f3ff' : '#ff007f' }; cw += w + 4; return o; });
function reset() { G = { y: 0, vy: 0, j: 0, rot: 0, dash: 0, meter: 100, sp: 430, dist: 0, score: 0, bonus: 0, coins: 0, hist: [], obs: [], orbs: [], spawn: 700, ps: [], shake: 0, dead: false, lt: '', why: '' }; }
function spark(n, c) {
  for (let i = 0; i < n; i++) G.ps.push({ x: px + sz / 2, y: gy - Math.max(G.y, 0) - (c === '#ff1e42' ? sz / 2 : 0), vx: -60 - Math.random() * 220 + (c === '#ff1e42' ? 260 : 0), vy: -60 - Math.random() * 260, l: .6 + Math.random() * .5, c });
}
function setMode(m) { mode = m; document.body.dataset.m = m; }
function jump() {
  if (mode !== 'play' || G.dead || G.j >= 2) return;
  G.vy = G.j ? 780 : 860; G.j++; spark(8, '#00f3ff'); A.t('square', 380, 820, .12, .09);
}
function dash() {
  if (mode !== 'play' || G.dead || G.dash > 0 || G.meter < 40) return;
  G.meter -= 40; G.dash = .38; A.t('sawtooth', 200, 1400, .3, .15);
}
function die(why) {
  G.dead = true; G.why = why; G.shake = .4; spark(40, '#ff1e42'); A.t('sawtooth', 300, 30, .6, .2);
  best = Math.max(best, G.score); try { localStorage.setItem('taco.ndr.best', best); } catch (e) {}
  submit();
  setTimeout(() => {
    if (mode === 'play' && G.dead) {
      $('oWhy').textContent = G.why; $('oScore').textContent = String(G.score).padStart(6, '0'); $('oBest').textContent = 'BEST ' + String(best).padStart(6, '0') + '  |  +' + G.coins + ' COINS';
      const r = myRank(); $('oRank').textContent = r ? 'LEADERBOARD RANK #' + r + ' OF ' + ROWS.length : '';
      $('over').classList.add('on');
    }
  }, 650);
}

/* ---------- Shared leaderboard (db capability; offline-safe) ---------- */
// World leaderboard: the launcher's Grapevine board 'ndr:best' (the launcher's feed also sends taco.ndr.best).
// Outside the launcher, or before the server lists the board, it says so and keeps the local best.
let DB = null, ROWS = [], ME = null, myName = '', sent = 0, busy = false;
const BOARD = 'ndr:best';
try { myName = localStorage.getItem('taco.ndr.name') || ''; } catch (e) {}
function acct() { try { const L = window.parent && window.parent.HGGrapevine; return L && L.me && L.me() && L.eco ? L : null; } catch (e) { return null; } }
function boardListed(L) { try { const c = L.eco.catalog(); return !!(c && c.boards && c.boards[BOARD]); } catch (e) { return false; } }
function myRank() { return ME && ME.pos ? ME.pos : null; }
function stat() {
  const r = myRank();
  $('stat').innerHTML = 'YOUR HIGH SCORE <b>' + String(best).padStart(6, '0') + '</b><br>' +
    (r ? 'WORLD RANK <b>#' + r + '</b>' : DB ? (best ? 'RANK: SYNCING...' : 'RANK: PLAY A RUN TO GET RANKED') : acct() ? 'RANK: WORLD BOARD OPENS SOON' : 'RANK: WORLD BOARD OFFLINE');
}
function submit(force) {
  if (!DB) { if (acct()) net(); return; }
  if (best <= 0 || best >= 1e6) return;
  if (!force && (best <= sent || (ME && ME.s >= best))) return;
  sent = best; DB.eco.lbSubmit(BOARD, best);
  setTimeout(net, 1200);
}
function net() {
  const L = acct(); DB = L && boardListed(L) ? L : null;
  if (!DB) { stat(); return; }
  if (busy) return; busy = true;
  DB.eco.lbGet(BOARD).then(m => {
    busy = false;
    ROWS = (m && m.rows || []).map(r => ({ me: !!r.me, pos: r.pos, score: +r.s || 0, name: String(r.n || 'PLAYER').slice(0, 16) }));
    ME = m && m.me ? { pos: m.me.pos, s: +m.me.s || 0 } : null;
    submit(); stat(); if ($('lb').classList.contains('on')) lbRender();
  }, () => { busy = false; });
  stat();
}
function lbRow(rk, r, me) {
  const d = document.createElement('div'); d.className = 'lr' + (me ? ' me' : '');
  const a = document.createElement('i'), n = document.createElement('span'), s = document.createElement('b');
  a.textContent = '#' + rk; n.textContent = r.name + (me ? ' (YOU)' : ''); s.textContent = String(r.score).padStart(6, '0');
  d.append(a, n, s); return d;
}
function lbRender() {
  const l = $('lbList'); l.innerHTML = '';
  $('nm').value = myName; $('nm').closest('.ctl').style.display = DB ? 'none' : '';
  if (!DB) { $('lbSt').textContent = (acct() ? 'THE WORLD BOARD OPENS SOON.' : 'WORLD BOARD OFFLINE. PLAY IN THE TACO GAMES LAUNCHER WHILE SIGNED IN TO COMPETE.') + ' YOUR BEST: ' + String(best).padStart(6, '0'); return; }
  const r = myRank();
  $('lbSt').textContent = ROWS.length ? (r ? 'YOU ARE RANK #' + r : 'PLAY A RUN TO GET RANKED') : 'NO SCORES YET. BE THE FIRST!';
  ROWS.slice(0, 10).forEach(o => l.appendChild(lbRow(o.pos, o, o.me)));
  if (r && r > 10 && ME) { const g = document.createElement('div'); g.className = 'lr g'; g.textContent = '...'; l.appendChild(g); l.appendChild(lbRow(r, { name: String((DB.me() || {}).name || 'PLAYER').slice(0, 16), score: ME.s }, true)); }
}

function upd(dt) {
  if (mode !== 'play') { off += 330 * dt; return; }
  for (let i = G.ps.length - 1; i >= 0; i--) { const p = G.ps[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.l -= dt * 2; if (p.l <= 0) G.ps.splice(i, 1); }
  G.shake = Math.max(0, G.shake - dt);
  if (G.dead) return;
  const d = G.dash > 0; G.sp = Math.min(950, 430 + G.dist * .012);
  const sp = G.sp * (d ? 1.9 : 1);
  G.dist += sp * dt; off += sp * dt; G.score = Math.floor(G.dist / 10) + G.bonus;
  G.hist.unshift(G.y); if (G.hist.length > 14) G.hist.pop();
  if (d) G.dash -= dt; else G.meter = Math.min(100, G.meter + 20 * dt);
  const cx = px + sz / 2, pv = G.vy;
  const over = G.obs.some(o => o.t === 'gap' && cx > o.x + 6 && cx < o.x + o.w - 6);
  if (d) G.vy = 0; else G.vy -= 2500 * dt;
  G.y += G.vy * dt;
  if (G.y <= 0 && !over && G.vy <= 0) { if (pv < -300) spark(6, '#ff007f'); G.y = 0; G.vy = 0; G.j = 0; }
  if (G.y < -90) { die('FELL INTO THE VOID'); return; }
  const q = Math.PI / 2;
  if (G.y > 0) G.rot += 7 * dt; else G.rot += (Math.ceil(G.rot / q) * q - G.rot) * Math.min(1, dt * 18);
  for (const o of G.obs) o.x -= sp * dt;
  for (const o of G.orbs) o.x -= sp * dt;
  G.obs = G.obs.filter(o => o.x + o.w > -60); G.orbs = G.orbs.filter(o => o.x > -40 && !o.got);
  const bot = gy - G.y - 4, l = px + 5, r = px + sz - 5;
  if (!d) for (const o of G.obs) {
    if (o.t === 'spike' && r > o.x + 8 && l < o.x + o.w - 8 && bot > gy - o.h * .8) { die('LASER SPIKE'); return; }
    if (o.t === 'gate' && r > o.x && l < o.x + o.w) { die('ENERGY GATE: USE PHASE DASH'); return; }
  }
  for (const o of G.orbs) if (Math.hypot(o.x - cx, (gy - o.y) - (gy - G.y - sz / 2)) < 30) { o.got = 1; G.bonus += 50; G.coins++; SV.coins++; save(); spark(8, '#ffd000'); A.t('triangle', 880, 1760, .1, .12); }
  G.spawn -= sp * dt;
  if (G.spawn <= 0) {
    const rr = Math.random(), X = W + 60; let w;
    if (rr < .4) { const n = 1 + (Math.random() < .4) + (G.dist > 6000 && Math.random() < .3); w = n * 34; G.obs.push({ t: 'spike', x: X, w, h: 42 }); }
    else if (rr < .62) { w = 130 + Math.random() * 60; G.obs.push({ t: 'gap', x: X, w }); }
    else if (rr < .8 && G.lt !== 'gate') { w = 16; G.obs.push({ t: 'gate', x: X, w }); }
    else { for (let i = 0; i < 5; i++) G.orbs.push({ x: X + i * 46, y: 40 + Math.sin(i / 4 * Math.PI) * 110 }); w = 230; }
    G.lt = w === 16 ? 'gate' : 'x'; G.spawn = w + G.sp * (.85 + Math.random() * .5) + 80;
  }
}

function draw(t) {
  x.save();
  if (G.shake > 0) x.translate((Math.random() - .5) * 12, (Math.random() - .5) * 12);
  let g = x.createLinearGradient(0, 0, 0, gy);
  g.addColorStop(0, '#040109'); g.addColorStop(.6, '#120326'); g.addColorStop(1, '#2b0645');
  x.fillStyle = g; x.fillRect(-20, -20, W + 40, gy + 20);
  for (const s of stars) { x.fillStyle = `rgba(224,247,255,${.3 + .7 * Math.abs(Math.sin(t * 2 + s.p))})`; x.fillRect(s.x * W, s.y * H, 2, 2); }
  const R = Math.min(W, H) * .17, sx = W * .5, sy = gy - R * .25;
  x.save(); x.beginPath(); x.arc(sx, sy, R, 0, 7); x.clip();
  g = x.createLinearGradient(0, sy - R, 0, sy + R); g.addColorStop(0, '#ffd000'); g.addColorStop(.45, '#ff2a85'); g.addColorStop(1, '#7a00cc');
  x.fillStyle = g; x.fillRect(sx - R, sy - R, 2 * R, 2 * R);
  x.fillStyle = '#18042e'; for (let i = 0; i < 6; i++) x.fillRect(sx - R, sy + R * (.08 + i * .14), 2 * R, 2 + i * 1.6);
  x.restore();
  const ox = -(off * .08 % cw);
  for (let k = 0; k < 2; k++) for (const b of city) {
    const bx = ox + k * cw + b.x; if (bx > W || bx + b.w < 0) continue;
    x.fillStyle = '#070212'; x.fillRect(bx, gy - b.h, b.w, b.h);
    x.globalAlpha = .45; x.strokeStyle = b.c; x.lineWidth = 1; x.strokeRect(bx, gy - b.h, b.w, b.h); x.globalAlpha = 1;
  }
  g = x.createLinearGradient(0, gy, 0, H); g.addColorStop(0, '#0c021c'); g.addColorStop(1, '#04010a');
  x.fillStyle = g; x.fillRect(-20, gy, W + 40, H - gy + 20);
  x.lineWidth = 1.2;
  for (let i = -30; i <= 30; i++) {
    const b = W / 2 + i * 80 - (off % 80);
    x.strokeStyle = 'rgba(255,0,127,.32)'; x.beginPath(); x.moveTo(W / 2 + (b - W / 2) * .1, gy); x.lineTo(W / 2 + (b - W / 2) * 3, H); x.stroke();
  }
  for (let k = 1; k <= 7; k++) { const y = gy + (H - gy) * Math.pow(k / 7, 1.9); x.strokeStyle = `rgba(255,0,127,${.15 + k * .07})`; x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
  x.save(); x.strokeStyle = '#ff007f'; x.lineWidth = 2.5; x.shadowBlur = 18; x.shadowColor = '#ff007f'; x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke(); x.restore();

  if (mode === 'play') {
    for (const o of G.obs) {
      if (o.t === 'gap') {
        x.fillStyle = '#05010a'; x.fillRect(o.x, gy - 1, o.w, H - gy + 20);
        x.save(); x.strokeStyle = '#9d00ff'; x.shadowBlur = 16; x.shadowColor = '#9d00ff'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(o.x, gy); x.lineTo(o.x, H); x.moveTo(o.x + o.w, gy); x.lineTo(o.x + o.w, H); x.stroke(); x.restore();
      } else if (o.t === 'spike') {
        x.save(); x.fillStyle = '#ff1e42'; x.strokeStyle = '#ffd1d9'; x.lineWidth = 1.5; x.shadowBlur = 16; x.shadowColor = '#f04';
        for (let i = 0; i < o.w / 34; i++) { const bx = o.x + i * 34; x.beginPath(); x.moveTo(bx + 2, gy); x.lineTo(bx + 17, gy - o.h); x.lineTo(bx + 32, gy); x.closePath(); x.fill(); x.stroke(); }
        x.restore();
      } else {
        x.save(); x.globalAlpha = .65 + .35 * Math.sin(t * 12); x.fillStyle = '#ff007f'; x.shadowBlur = 24; x.shadowColor = '#ff007f';
        x.fillRect(o.x, -20, o.w, gy + 20); x.globalAlpha = 1; x.fillStyle = '#fff'; x.font = '700 11px Orbitron,sans-serif'; x.textAlign = 'center'; x.fillText('DASH', o.x + o.w / 2, gy - 230); x.restore();
      }
    }
    for (const o of G.orbs) { x.save(); x.fillStyle = '#ffd000'; x.shadowBlur = 14; x.shadowColor = '#ffd000'; x.beginPath(); x.arc(o.x, gy - o.y, 9, 0, 7); x.fill(); x.shadowBlur = 0; x.strokeStyle = '#a07000'; x.lineWidth = 2; x.beginPath(); x.arc(o.x, gy - o.y, 5, 0, 7); x.stroke(); x.restore(); }
    if (G.dash > 0) { x.strokeStyle = 'rgba(0,243,255,.45)'; x.lineWidth = 2; for (let i = 0; i < 16; i++) { const yy = Math.random() * gy, xx = Math.random() * W; x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx - 140, yy); x.stroke(); } }
    if (!G.dead) {
      drawTrail(t); x.save(); x.translate(px + sz / 2, gy - G.y - sz / 2);
      if (G.dash > 0) for (let i = 5; i > 0; i--) { x.globalAlpha = .5 - i * .08; x.fillStyle = skin(t).e; x.fillRect(-sz / 2 - i * 20, -sz / 2, sz, sz); }
      x.globalAlpha = 1; x.rotate(G.rot); drawSkin(x, G.dash > 0 ? Object.assign({}, skin(t), { e: '#fff', rot: G.rot }) : Object.assign(skin(t), { rot: G.rot }), sz / 2, 22);
      x.restore();
    }
    for (const p of G.ps) { x.globalAlpha = Math.max(0, p.l); x.fillStyle = p.c; x.fillRect(p.x, p.y, 4, 4); }
    x.globalAlpha = 1;
    x.fillStyle = '#fff'; x.font = '700 20px Orbitron,sans-serif'; x.textAlign = 'left'; x.shadowBlur = 0;
    x.fillText('SCORE ' + String(G.score).padStart(6, '0'), 20, 38);
    x.fillStyle = '#7ff'; x.font = '600 11px Orbitron,sans-serif'; x.fillText('BEST ' + String(Math.max(best, G.score)).padStart(6, '0'), 20, 58);
    x.strokeStyle = 'rgba(0,243,255,.6)'; x.lineWidth = 1.5; x.strokeRect(20, 74, 160, 10);
    x.fillStyle = G.meter >= 40 ? '#00f3ff' : '#ff007f'; x.fillRect(22, 76, 156 * G.meter / 100, 6);
    x.fillStyle = '#aab'; x.font = '600 9px Orbitron,sans-serif'; x.fillText('PHASE DASH [SHIFT]', 20, 100);
    x.fillStyle = '#ffd000'; x.font = '700 12px Orbitron,sans-serif'; x.fillText('COINS ' + SV.coins + '  (+' + G.coins + ' THIS RUN)', 20, 120);
  }
  x.restore();
}

let last = performance.now();
function loop(n) { const dt = Math.min((n - last) / 1000, .05); last = n; upd(dt); draw(n / 1000); if ($('shop').classList.contains('on')) prev(n / 1000); requestAnimationFrame(loop); }

/* ---------- Flow controller ---------- */
const screens = ['splash', 'title', 'load'];
function scr(id) { screens.forEach(k => $(k).classList.toggle('on', k === id)); }
function flash() { const f = $('flash'); f.classList.remove('f'); void f.offsetWidth; f.classList.add('f'); }
let tm = 0;

function intro() {
  clearTimeout(tm); A.music(false); setMode('splash'); reset(); scr('splash');
  $('over').classList.remove('on');
  const s = $('splash'); s.classList.remove('go'); void s.offsetWidth; s.classList.add('go');
  A.t('sawtooth', 48, 110, .9, .2); [.45, .62, .78, 1.35].forEach((o, i) => A.t(i % 2 ? 'sawtooth' : 'square', 920 + i * 320, 180, .09, .1, o));
  tm = setTimeout(title, 3600);
}
function title() {
  clearTimeout(tm); reset(); $('over').classList.remove('on');
  setMode('idle'); scr('title'); flash(); stat();
  A.t('sine', 155, 37, .7, .5); A.t('sawtooth', 146.8, 146.8, 1.2, .12); A.music(true);
}
function start() {
  if (mode !== 'idle' || $('how').classList.contains('on') || $('shop').classList.contains('on') || $('lb').classList.contains('on')) return;
  setMode('load'); A.t('triangle', 587, 880, .14, .16); A.t('sawtooth', 110, 980, .85, .25); flash(); scr('load');
  const b = $('ldb'); b.classList.remove('r'); void b.offsetWidth; b.classList.add('r');
  clearTimeout(tm); tm = setTimeout(play, 2000);
}
function play() { if (mode !== 'load') return; reset(); scr(null); setMode('play'); }
function retry() { reset(); $('over').classList.remove('on'); A.t('triangle', 587, 880, .14, .16); }

$('skip').onclick = () => { A.init(); title(); };
$('bStart').onclick = () => { A.init(); start(); };
$('bHow').onclick = () => { A.t('triangle', 587, 880, .14, .16); $('how').classList.add('on'); };
$('bGot').onclick = $('how').onclick = e => { if (e.target === $('how') || e.target === $('bGot')) $('how').classList.remove('on'); };
$('bLb').onclick = () => { A.init(); A.t('triangle', 587, 880, .14, .16); lbRender(); $('lb').classList.add('on'); net(); };
$('bLbX').onclick = () => $('lb').classList.remove('on');
$('nm').oninput = () => { myName = $('nm').value.trim().toUpperCase().slice(0, 12); try { localStorage.setItem('taco.ndr.name', myName); } catch (e) {} };
$('nm').onchange = () => {};
$('bRe').onclick = intro;
$('bBack').onclick = () => { clearTimeout(tm); setMode('idle'); scr('title'); };
$('bRetry').onclick = retry;
$('bMenu').onclick = title;
$('dashbtn').addEventListener('pointerdown', e => { e.preventDefault(); dash(); });
cv.addEventListener('pointerdown', () => { A.init(); jump(); });
$('snd').onclick = () => { A.init(); A.m = !A.m; $('snd').textContent = 'SOUND: ' + (A.m ? 'OFF' : 'ON'); };

let tab = 'color';
function prev(t) { const c = $('pv').getContext('2d'); c.clearRect(0, 0, 120, 120); c.save(); c.translate(60, 60); c.rotate(t * 1.2); drawSkin(c, Object.assign(skin(t), { rot: t * 1.2 }), 24, 22); c.restore(); }
function shopRender() {
  $('shCoins').textContent = 'COINS: ' + SV.coins;
  document.querySelectorAll('.tb').forEach(b => b.classList.toggle('sel', b.dataset.t === tab));
  const g = $('shGrid'); g.innerHTML = '';
  CAT[tab].forEach(it => {
    const key = tab + ':' + it.id, own = SV.own.includes(key), eq = SV.eq[tab] === it.id;
    const d = document.createElement('div'); d.className = 'sk' + (eq ? ' eq' : '');
    let pv;
    if (tab === 'trail') { pv = document.createElement('div'); pv.className = 'sw'; pv.textContent = it.ic; }
    else { pv = document.createElement('canvas'); pv.width = pv.height = 56; const cx = pv.getContext('2d'); cx.translate(28, 28); drawSkin(cx, Object.assign(skin(0, Object.assign({}, SV.eq, { [tab]: it.id })), { rot: 0 }), 13, 10); }
    const n = document.createElement('b'); n.textContent = it.n;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn';
    b.textContent = eq ? 'EQUIPPED' : own ? 'EQUIP' : 'BUY ' + it.p + ' COINS';
    b.onclick = () => {
      if (own) A.t('triangle', 587, 880, .14, .16);
      else if (SV.coins >= it.p) { SV.coins -= it.p; SV.own.push(key); A.t('triangle', 880, 1760, .2, .15); }
      else { A.t('square', 200, 90, .2, .1); b.textContent = 'NEED ' + (it.p - SV.coins) + ' MORE'; return; }
      SV.eq[tab] = it.id; save(); shopRender();
    };
    d.append(pv, n, b); g.appendChild(d);
  });
  $('shCus').style.display = tab === 'color' && SV.own.includes('color:custom') ? 'flex' : 'none';
  $('cE').value = SV.cu.e; $('cC').value = SV.cu.c;
}
document.querySelectorAll('.tb').forEach(b => b.onclick = () => { tab = b.dataset.t; shopRender(); });
['cE', 'cC'].forEach(id => $(id).oninput = () => { SV.cu = { e: $('cE').value, c: $('cC').value }; save(); });
$('bShop').onclick = () => { A.init(); A.t('triangle', 587, 880, .14, .16); shopRender(); $('shop').classList.add('on'); };
$('bShopX').onclick = () => $('shop').classList.remove('on');
addEventListener('keydown', e => {
  if (e.repeat) return;
  if (e.target === $('nm')) { if (e.code === 'Enter' || e.code === 'Escape') { $('nm').blur(); if (e.code === 'Escape') $('lb').classList.remove('on'); } return; }
  const c = e.code; A.init();
  if (mode === 'play') {
    if ($('over').classList.contains('on')) {
      if (c === 'Space' || c === 'Enter') { e.preventDefault(); retry(); } else if (c === 'Escape') title();
      return;
    }
    if (c === 'Space' || c === 'ArrowUp' || c === 'KeyW') { e.preventDefault(); jump(); }
    else if (c.startsWith('Shift') || c === 'KeyD') dash();
    else if (c === 'Escape') title();
    return;
  }
  if (c === 'Escape') { if ($('lb').classList.contains('on')) $('lb').classList.remove('on'); else if ($('shop').classList.contains('on')) $('shop').classList.remove('on'); else if ($('how').classList.contains('on')) $('how').classList.remove('on'); else if (mode === 'splash') title(); }
  if (c === 'Enter' && mode === 'idle') start();
});
addEventListener('resize', rs);
rs(); reset(); stat(); requestAnimationFrame(loop); intro(); net();
