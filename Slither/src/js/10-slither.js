// ==========================================
// SLITHER: a big round arena of glowing orbs and hungry snakes. Eat to grow; if your head touches another snake's
// body you burst into orbs. Make the others crash into you.
//   Steer with the mouse (or a finger, or ←/→). Hold the mouse button, SPACE or ↑ to boost: faster, but it burns length.
//   Up to 22 bot snakes with their own names and styles; some feed, some hunt, some coil around their prey.
//   The ring around the arena is deadly. Skins unlock as your best length grows.
// World units: the arena is a circle of radius 3200 around (0,0).
// Save (synced, prefix taco): taco.slither.v1 = { best, kills, games, skin, name, topRank }
// ==========================================
const R = 3200, SEG = 9, BASE_V = 190, BOOST_V = 380;
const cv = document.getElementById('cv'), g = cv.getContext('2d'), ui = document.getElementById('ui');
const KEY = 'taco.slither.v1';
let SV = { best: 0, kills: 0, games: 0, skin: 0, name: '', topRank: 0 };
try { SV = Object.assign(SV, JSON.parse(localStorage.getItem(KEY) || '{}') || {}); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(SV)); } catch (e) {} };
const SKINS = [
    { c: ['#34d399', '#059669'], need: 0 }, { c: ['#22d3ee', '#0e7490'], need: 0 }, { c: ['#f472b6', '#be185d'], need: 0 }, { c: ['#facc15', '#a16207'], need: 200 },
    { c: ['#a78bfa', '#6d28d9', '#f0abfc'], need: 500 }, { c: ['#f87171', '#fbbf24', '#f87171', '#111827'], need: 1000 }, { c: ['#ffffff', '#ef4444'], need: 2000 },
    { c: ['#38bdf8', '#ffffff', '#38bdf8', '#1e3a8a'], need: 3500 }, { c: ['#22c55e', '#16a34a', '#facc15', '#16a34a'], need: 5000 }, { c: ['#f97316', '#fde047', '#ef4444', '#7c2d12', '#fde047'], need: 8000 }];
const BOT_NAMES = ['Noodle', 'Sir Hiss', 'Zigzag', 'Pretzel', 'Spaghetti', 'Mamba Jamba', 'Wiggles', 'Slinky', 'Danger Noodle', 'Ramen', 'Twisty', 'Boa Constructor', 'Sneky', 'Linguine',
    'Python 3', 'Kaa-boom', 'Shoelace', 'Hose', 'Cable', 'Rope-a-dope', 'Viper', 'Coily', 'Long Boi', 'Garter', 'Squiggle', 'Lasso'];
const rnd = (a, b) => a + Math.random() * (b - a);
// ---- the world ----
const W = { snakes: [], orbs: [], t: 0, me: null, on: false, cam: { x: 0, y: 0, z: 1 }, steer: { x: 1, y: 0 }, boost: false, keys: {}, killer: '', rank: 0, kills: 0 };
window.__slither = W;
function mkSnake(name, x, y, skin, bot) {
    const a = rnd(0, Math.PI * 2), pts = []; for (let i = 0; i < 18; i++) pts.push({ x: x - Math.cos(a) * i * SEG, y: y - Math.sin(a) * i * SEG });
    return { name, pts, a, ta: a, mass: 20, skin, bot, dead: false, boost: false, mode: 'feed', target: null, think: 0, kills: 0, id: Math.random() };
}
const lenOf = s => Math.floor(10 + s.mass * .9);           // the number of body points
const widthOf = s => 9 + Math.sqrt(s.mass) * 1.1;          // body radius
function addOrb(x, y, v, c) { W.orbs.push({ x, y, v: v || rnd(1, 2.4), c: c || `hsl(${rnd(0, 360)},90%,62%)`, r: 0, ph: rnd(0, 6) }); }
function spawnBot() {
    let x, y; for (let k = 0; k < 20; k++) { const a = rnd(0, 6.28), d = rnd(300, R - 300); x = Math.cos(a) * d; y = Math.sin(a) * d; if (!W.me || Math.hypot(x - W.me.pts[0].x, y - W.me.pts[0].y) > 700) break; }
    const s = mkSnake(BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)], x, y, Math.floor(Math.random() * SKINS.length), true);
    s.mass = rnd(10, Math.random() < .2 ? 600 : 160); s.aggr = Math.random(); W.snakes.push(s);
}
function newGame() {
    W.snakes = []; W.orbs = []; W.t = 0; W.kills = 0; W.killer = '';
    for (let i = 0; i < 1400; i++) { const a = rnd(0, 6.28), d = Math.sqrt(Math.random()) * (R - 40); addOrb(Math.cos(a) * d, Math.sin(a) * d); }
    W.me = mkSnake(SV.name || 'You', rnd(-300, 300), rnd(-300, 300), SV.skin, false); W.snakes.push(W.me);
    for (let i = 0; i < 22; i++) spawnBot();
    W.on = true; SV.games++; save(); hud();
}
// ---- the spatial grid for bodies and orbs ----
const CELL = 120; let grid = new Map();
const key = (x, y) => (Math.floor(x / CELL) + 1000) * 4096 + (Math.floor(y / CELL) + 1000);
function buildGrid() {
    grid = new Map();
    for (const s of W.snakes) { if (s.dead) continue; const w = widthOf(s); for (let i = 3; i < s.pts.length; i += 2) { const p = s.pts[i], k = key(p.x, p.y); let a = grid.get(k); if (!a) grid.set(k, a = []); a.push([p.x, p.y, w, s]); } }
}
function bodyHit(x, y, r, self) {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const a = grid.get((cx + dx + 1000) * 4096 + (cy + dy + 1000)); if (!a) continue; for (const [px, py, w, s] of a) if (s !== self && (px - x) * (px - x) + (py - y) * (py - y) < (w + r) * (w + r)) return s; }
    return null;
}
// ---- bots think ----
function botThink(s, dt) {
    s.think -= dt; const h = s.pts[0];
    if (s.think <= 0) {
        s.think = rnd(.15, .35);
        // danger ahead: look along three rays and turn away from what is there
        const w = widthOf(s), look = 60 + w * 4;
        const free = da => { for (let d = 20; d < look; d += 20) { const x = h.x + Math.cos(s.a + da) * d, y = h.y + Math.sin(s.a + da) * d; if (bodyHit(x, y, w, s) || x * x + y * y > (R - 60) * (R - 60)) return false; } return true; };
        if (!free(0)) { const l = free(-.7), r = free(.7); s.ta = s.a + (l && !r ? -1.2 : r && !l ? 1.2 : (Math.random() < .5 ? -1.6 : 1.6)); s.boost = false; s.avoid = .4; return; }
        // hunt: cut in front of a smaller snake's head
        const me = W.me;
        if (s.aggr > .55 && s.mass > 60) {
            let prey = null, pd = 700; for (const o of W.snakes) { if (o === s || o.dead || o.mass > s.mass * 1.4) continue; const d = Math.hypot(o.pts[0].x - h.x, o.pts[0].y - h.y); if (d < pd && (o === me ? Math.random() < .8 : true)) { pd = d; prey = o; } }
            if (prey) { const p = prey.pts[0], lead = 140; const tx = p.x + Math.cos(prey.a) * lead, ty = p.y + Math.sin(prey.a) * lead; s.ta = Math.atan2(ty - h.y, tx - h.x); s.boost = pd < 300 && s.mass > 80 && Math.random() < .6; return; }
        }
        // feed: the richest orb nearby
        let best = null, bv = 0;
        for (const o of W.orbs) { const d2 = (o.x - h.x) ** 2 + (o.y - h.y) ** 2; if (d2 > 160000) continue; const v = o.v / (Math.sqrt(d2) + 30); if (v > bv) { bv = v; best = o; } }
        if (best) s.ta = Math.atan2(best.y - h.y, best.x - h.x); else if (Math.random() < .3) s.ta = s.a + rnd(-1, 1);
        if (h.x * h.x + h.y * h.y > (R - 400) ** 2) s.ta = Math.atan2(-h.y, -h.x);
        s.boost = false;
    }
}
// ---- one step ----
function step(dt) {
    W.t += dt;
    buildGrid();
    for (const s of W.snakes) {
        if (s.dead) continue;
        if (s.bot) botThink(s, dt);
        else if (!s.dead) { const k = W.keys; if (k.ArrowLeft || k.KeyA) s.ta = s.a - 2; else if (k.ArrowRight || k.KeyD) s.ta = s.a + 2; else s.ta = Math.atan2(W.steer.y, W.steer.x); s.boost = W.boost || k.Space || k.ArrowUp || k.KeyW; }
        // turn toward the wanted angle; bigger snakes turn slower
        let d = s.ta - s.a; d = Math.atan2(Math.sin(d), Math.cos(d));
        const turn = (4.4 - Math.min(2.2, Math.sqrt(s.mass) * .06)) * dt; s.a += Math.max(-turn, Math.min(turn, d));
        const boosting = s.boost && s.mass > 12, v = boosting ? BOOST_V : BASE_V;
        if (boosting) { s.mass -= dt * (2 + s.mass * .012); if (Math.random() < dt * 8) { const t = s.pts[s.pts.length - 1]; addOrb(t.x, t.y, .9, SKINS[s.skin].c[0]); } }
        const h = s.pts[0], nx = h.x + Math.cos(s.a) * v * dt, ny = h.y + Math.sin(s.a) * v * dt;
        s.pts.unshift({ x: nx, y: ny });
        // the body follows: keep points SEG apart, as many as the mass allows
        const want = lenOf(s); let acc = 0, out = [s.pts[0]];
        for (let i = 1; i < s.pts.length && out.length < want; i++) { const a = out[out.length - 1], b = s.pts[i], dd = Math.hypot(b.x - a.x, b.y - a.y); if (dd >= SEG) { const k = SEG / dd; out.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }); i--; if (out.length > 4000) break; } }
        while (out.length < want && out.length < s.pts.length) out.push(s.pts[out.length]);
        s.pts = out;
        // eat
        const w = widthOf(s), rr = (w + 18) * (w + 18);
        for (const o of W.orbs) if (!o.eaten) { const dx = o.x - nx, dy = o.y - ny; if (dx * dx + dy * dy < rr) { o.eaten = 1; s.mass += o.v; } }
        // crash: the wall, or someone else's body
        if (nx * nx + ny * ny > R * R) { kill(s, null); continue; }
        const hit = bodyHit(nx, ny, w * .7, s); if (hit) kill(s, hit);
    }
    W.orbs = W.orbs.filter(o => !o.eaten);
    if (W.orbs.length > 4000) W.orbs.splice(0, W.orbs.length - 4000);      // the oldest go first (deaths keep adding)
    while (W.orbs.length < 1300) { const a = rnd(0, 6.28), d = Math.sqrt(Math.random()) * (R - 40); addOrb(Math.cos(a) * d, Math.sin(a) * d); }
    W.snakes = W.snakes.filter(s => !s.dead || s === W.me);
    while (W.snakes.filter(s => s.bot).length < 22) spawnBot();
    if (W.me && !W.me.dead) { const h = W.me.pts[0]; W.cam.x += (h.x - W.cam.x) * Math.min(1, dt * 8); W.cam.y += (h.y - W.cam.y) * Math.min(1, dt * 8); const z = 1 / (1 + Math.sqrt(W.me.mass) * .018); W.cam.z += (z - W.cam.z) * dt * 2; }
}
function kill(s, by) {
    if (s.dead) return; s.dead = true;
    // burst into orbs worth most of the mass, along the body
    const n = Math.min(s.pts.length, 200), each = s.mass * .8 / n;
    for (let i = 0; i < n; i++) { const p = s.pts[Math.floor(i * s.pts.length / n)]; addOrb(p.x + rnd(-8, 8), p.y + rnd(-8, 8), Math.max(1, each), SKINS[s.skin].c[i % SKINS[s.skin].c.length]); }
    if (by) by.kills++;
    if (by === W.me) { W.kills++; SV.kills++; tone(880, .18, 'triangle', 1320); }
    if (s === W.me) {
        W.on = false; W.killer = by ? by.name : 'the edge of the arena';
        const len = Math.floor(s.mass * 10); SV.best = Math.max(SV.best, len); if (W.rank) SV.topRank = SV.topRank ? Math.min(SV.topRank, W.rank) : W.rank; save();
        tone(300, .6, 'sawtooth', 60); setTimeout(showOver, 1200);
    }
}
// ---- sound ----
let AC = null;
function tone(f, len, type, f2) { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const o = AC.createOscillator(), v = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, AC.currentTime); if (f2) o.frequency.exponentialRampToValueAtTime(f2, AC.currentTime + len); v.gain.setValueAtTime(.05, AC.currentTime); v.gain.exponentialRampToValueAtTime(.0005, AC.currentTime + len); o.connect(v); v.connect(AC.destination); o.start(); o.stop(AC.currentTime + len); } catch (e) {} }
// ---- drawing ----
function fit() { const d = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * d; cv.height = innerHeight * d; }
addEventListener('resize', fit); fit();
function draw() {
    const w = cv.width, h = cv.height, z = W.cam.z * (cv.width / 1400) * 1.15;
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#0b0f17'; g.fillRect(0, 0, w, h);
    g.setTransform(z, 0, 0, z, w / 2 - W.cam.x * z, h / 2 - W.cam.y * z);
    const vx0 = W.cam.x - w / 2 / z, vx1 = W.cam.x + w / 2 / z, vy0 = W.cam.y - h / 2 / z, vy1 = W.cam.y + h / 2 / z;
    // hex floor
    g.strokeStyle = 'rgba(56,189,248,.06)'; g.lineWidth = 2;
    const hs = 60, hh = hs * Math.sqrt(3);
    for (let y = Math.floor(vy0 / hh) * hh - hh; y < vy1 + hh; y += hh) for (let x = Math.floor(vx0 / (hs * 3)) * hs * 3 - hs * 3; x < vx1 + hs * 3; x += hs * 3) {
        for (const [ox, oy] of [[0, 0], [hs * 1.5, hh / 2]]) { g.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; g.lineTo(x + ox + Math.cos(a) * hs, y + oy + Math.sin(a) * hs); } g.closePath(); g.stroke(); }
    }
    // the deadly ring
    g.lineWidth = 40; g.strokeStyle = 'rgba(239,68,68,.25)'; g.beginPath(); g.arc(0, 0, R + 20, 0, 7); g.stroke(); g.lineWidth = 6; g.strokeStyle = '#ef4444'; g.beginPath(); g.arc(0, 0, R, 0, 7); g.stroke();
    // orbs
    for (const o of W.orbs) { if (o.x < vx0 - 20 || o.x > vx1 + 20 || o.y < vy0 - 20 || o.y > vy1 + 20) continue; const r = 3 + o.v * 2.2 + Math.sin(W.t * 4 + o.ph) * .8; g.globalAlpha = .35; g.fillStyle = o.c; g.beginPath(); g.arc(o.x, o.y, r * 2.2, 0, 7); g.fill(); g.globalAlpha = 1; g.beginPath(); g.arc(o.x, o.y, r, 0, 7); g.fill(); }
    // snakes: tail to head, biggest last so it reads on top
    const vis = W.snakes.filter(s => !s.dead).sort((a, b) => a.mass - b.mass);
    for (const s of vis) {
        const wd = widthOf(s), cols = SKINS[s.skin].c, P = s.pts;
        if (s.boost && s.mass > 12) { g.globalAlpha = .25; g.fillStyle = cols[0]; for (let i = P.length - 1; i >= 0; i -= 3) { const p = P[i]; g.beginPath(); g.arc(p.x, p.y, wd * 1.6, 0, 7); g.fill(); } g.globalAlpha = 1; }
        for (let i = P.length - 1; i >= 0; i--) {
            const p = P[i]; if (p.x < vx0 - 40 || p.x > vx1 + 40 || p.y < vy0 - 40 || p.y > vy1 + 40) continue;
            g.fillStyle = cols[Math.floor(i / 4) % cols.length]; g.beginPath(); g.arc(p.x, p.y, wd, 0, 7); g.fill();
            if (i % 2 === 0) { g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.arc(p.x - wd * .25, p.y - wd * .25, wd * .45, 0, 7); g.fill(); }
        }
        const hd = P[0], ca = Math.cos(s.a), sa = Math.sin(s.a);
        for (const side of [-1, 1]) { const ex = hd.x + ca * wd * .35 - sa * wd * .5 * side, ey = hd.y + sa * wd * .35 + ca * wd * .5 * side; g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, ey, wd * .38, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(ex + ca * wd * .14, ey + sa * wd * .14, wd * .2, 0, 7); g.fill(); }
        g.font = `bold ${Math.max(14, 13 / W.cam.z)}px system-ui, sans-serif`; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText(s.name, hd.x, hd.y - wd - 14);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    // minimap
    const mr = 70 * (w / 1400) * 1.2, mx = w - mr - 16, my = h - mr - 16;
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(mx, my, mr, 0, 7); g.fill(); g.strokeStyle = 'rgba(239,68,68,.6)'; g.lineWidth = 2; g.stroke();
    for (const s of W.snakes) if (!s.dead) { const p = s.pts[0]; g.fillStyle = s === W.me ? '#fff' : 'rgba(148,163,184,.7)'; g.beginPath(); g.arc(mx + p.x / R * mr, my + p.y / R * mr, s === W.me ? 4 : 1.6 + Math.sqrt(s.mass) * .08, 0, 7); g.fill(); }
}
// ---- the screens ----
function hud() {
    ui.innerHTML = '<div id="lb"></div><div id="hud"></div>';
}
function paintHud() {
    if (!W.me || !$('#lb')) return;
    const top = W.snakes.filter(s => !s.dead).sort((a, b) => b.mass - a.mass), rank = top.indexOf(W.me) + 1; if (rank) W.rank = rank;
    $('#lb').innerHTML = '<b>Leaderboard</b>' + top.slice(0, 10).map((s, i) => `<div class="${s === W.me ? 'me' : ''}"><span>${i + 1}. ${esc(s.name)}</span><span>${Math.floor(s.mass * 10)}</span></div>`).join('') + (rank > 10 ? `<div class="me"><span>${rank}. ${esc(W.me.name)}</span><span>${Math.floor(W.me.mass * 10)}</span></div>` : '');
    $('#hud').innerHTML = `Length <b>${Math.floor(W.me.mass * 10)}</b> · kills ${W.kills} · rank ${rank || '-'} of ${top.length}`;
}
const $ = s => document.querySelector(s), esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function skinsHtml() { return '<div class="sl-skins">' + SKINS.map((s, i) => `<div class="sl-skin ${SV.skin === i ? 'on' : ''} ${SV.best >= s.need ? '' : 'lock'}" data-i="${i}" title="${SV.best >= s.need ? 'Use this skin' : 'Reach a length of ' + s.need}" style="background:conic-gradient(${s.c.concat(s.c[0]).join(',')})"></div>`).join('') + '</div>'; }
function showMenu() {
    ui.innerHTML = `<div class="sl-panel"><h1>Slither</h1><div class="sl-small">Eat orbs. Grow long. Make them crash into you.</div>
      <input id="sl-name" maxlength="16" placeholder="Your name" value="${esc(SV.name || mgName())}">${skinsHtml()}
      <button class="sl-btn" id="sl-play">Play</button>
      <div class="sl-small">Mouse to steer · hold the mouse button or SPACE to boost (it burns length)<br>Best length <b>${SV.best}</b> · total kills <b>${SV.kills}</b>${SV.topRank ? ' · best rank #' + SV.topRank : ''}</div></div>`;
    wireMenu();
}
function showOver() {
    const len = W.me ? Math.floor(W.me.mass * 10) : 0;
    ui.innerHTML = `<div class="sl-panel"><h1 style="font-size:40px">Popped!</h1><p>Hit by <b>${esc(W.killer)}</b></p><p style="font-size:30px;margin:6px 0"><b>${len}</b> long</p><p class="sl-small">${W.kills} kill${W.kills === 1 ? '' : 's'} · best rank this game #${W.rank || '-'} · best ever ${SV.best}</p>${skinsHtml()}<button class="sl-btn" id="sl-play">Play again</button></div>`;
    wireMenu();
}
function wireMenu() {
    ui.querySelectorAll('.sl-skin').forEach(el => el.onclick = () => { const i = +el.dataset.i; if (SV.best < SKINS[i].need) return; SV.skin = i; save(); ui.querySelectorAll('.sl-skin').forEach(e => e.classList.toggle('on', +e.dataset.i === i)); });
    const n = $('#sl-name'); if (n) n.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') play(); };
    $('#sl-play').onclick = play;
}
function play() { const n = $('#sl-name'); if (n) SV.name = n.value.trim().slice(0, 16) || 'You'; save(); newGame(); }
function mgName() { try { const L = window.parent && window.parent.HGGrapevine, me = L && L.me(); if (me) return me.name; } catch (e) {} return ''; }
// ---- input ----
cv.addEventListener('pointermove', e => { W.steer = { x: e.clientX - innerWidth / 2, y: e.clientY - innerHeight / 2 }; });
cv.addEventListener('pointerdown', e => { W.steer = { x: e.clientX - innerWidth / 2, y: e.clientY - innerHeight / 2 }; if (e.pointerType === 'mouse') W.boost = true; else W.touchT = performance.now(); });
addEventListener('pointerup', () => { W.boost = false; });
addEventListener('keydown', e => { W.keys[e.code] = true; if (e.code === 'Space') e.preventDefault(); if ((e.code === 'Enter' || e.code === 'Space') && !W.on && $('#sl-play')) play(); });
addEventListener('keyup', e => { W.keys[e.code] = false; });
// ---- loop ----
let last = performance.now(), hudT = 0;
function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (W.me) step(dt);
    draw();
    if (W.on && (hudT -= dt) <= 0) { hudT = .3; paintHud(); }
}
// the menu sits over a game of bots
W.me = null; (function demo() { W.snakes = []; W.orbs = []; for (let i = 0; i < 900; i++) { const a = rnd(0, 6.28), d = Math.sqrt(Math.random()) * (R - 40); addOrb(Math.cos(a) * d, Math.sin(a) * d); } for (let i = 0; i < 14; i++) spawnBot(); W.cam.z = .8; })();
const demoStep = () => { if (W.me) return; step(1 / 60); };
setInterval(demoStep, 1000 / 60);
showMenu(); requestAnimationFrame(frame);
// tests
W.step = step; W.newGame = newGame; W.kill = kill; W.save = () => SV;
