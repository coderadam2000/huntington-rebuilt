// ==========================================
// SPORTS MIX: the shared engine. Eight sports, each an object in SPORTS with:
//   n, ic, max (players), turns (turn-based?), W, H (world size, drawn to fit the screen),
//   init(players, opts) -> st (plain data: it is sent over the network), step(st, dt, inp, P) (host only),
//   bot(st, i, dt) -> input, draw(g, st, P) (world units), hud(st, P) -> html, over(st) -> null | { win, text }.
// An input is { u, d, l, r, a, b } (held) plus ua, ...: pressed this step. The host (or the solo screen) runs the
// sport; guests send their keys and draw the host's state. Save (synced, prefix hgmini_): hgmini_sports.
// ==========================================
const SPORTS = {};
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, rnd = (a, b) => a + Math.random() * (b - a);
const hyp = Math.hypot, angTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
const SM = { sport: null, id: '', st: null, P: [], me: 0, host: true, inp: {}, prev: {}, acc: 0, sendT: 0, net: false, over: false, opts: {}, evSeen: 0, last: null, t: 0, keys: {} };
window.__sports = SM;
function smSave() { let s = null; try { s = JSON.parse(mgLs('hgmini_sports') || 'null'); } catch (e) {} s = s && typeof s === 'object' ? s : {}; s.w = s.w || {}; s.p = s.p || {}; s.best = s.best || {}; return s; }
function smWrite(s) { mgLs('hgmini_sports', JSON.stringify(s)); }
// ---- the page ----
document.getElementById('app').innerHTML = `<canvas id="sm-cv"></canvas><div id="sm-hud" class="hidden"></div><div id="sm-msg" class="hidden"></div>
  <div id="sm-menu"><div class="mg-card sm-card"><div class="mg-kicker">Huntington Games</div><h1>Sports Mix</h1><p class="mg-sub">Eight sports. Play a bot, or open a room and play your friends.</p>
  <div id="sm-grid"></div><div class="mg-row"><button class="mg-btn" id="sm-online">🌐 Play friends online</button></div><div id="sm-recs" class="mg-sub"></div></div></div>
  <div id="sm-pick" class="hidden"><div class="mg-card sm-card"><h2 id="sm-pt"></h2><p class="mg-sub" id="sm-pd"></p><div id="sm-po"></div><div class="mg-row"><button class="mg-btn big" id="sm-go">Play ▶</button><button class="mg-btn" id="sm-back">Back</button></div><div class="sm-keys" id="sm-pk"></div></div></div>`;
const CV = document.getElementById('sm-cv'), G = CV.getContext('2d');
function resize() { CV.width = innerWidth * Math.min(2, devicePixelRatio || 1); CV.height = innerHeight * Math.min(2, devicePixelRatio || 1); }
addEventListener('resize', resize); resize();
const $ = id => document.getElementById(id);
function show(id, on) { $(id).classList.toggle('hidden', !on); }
// ---- the menu ----
function paintMenu() {
    const s = smSave();
    $('sm-grid').innerHTML = Object.keys(SPORTS).map(k => { const S = SPORTS[k]; return `<button class="sm-sport" data-s="${k}"><span>${S.ic}</span><b>${S.n}</b><small>${S.sub}</small>${s.w[k] ? `<em>${s.w[k]} win${s.w[k] > 1 ? 's' : ''}</em>` : ''}</button>`; }).join('');
    const tot = Object.values(s.w).reduce((a, b) => a + b, 0), played = Object.values(s.p).reduce((a, b) => a + b, 0);
    $('sm-recs').textContent = played ? `${played} games played, ${tot} won${s.best.bowling ? ' · best bowling ' + s.best.bowling : ''}${s.best.mini ? ' · best mini golf ' + s.best.mini : ''}` : '';
}
$('sm-grid').onclick = e => { const b = e.target.closest('[data-s]'); if (b) pick(b.dataset.s); };
function pick(k) {
    SM.id = k; const S = SPORTS[k];
    $('sm-pt').textContent = S.ic + ' ' + S.n; $('sm-pd').textContent = S.desc; $('sm-pk').innerHTML = S.keys;
    SM.opts = Object.assign({}, S.defOpts || {}, { diff: SM.opts.diff || 1 });
    paintOpts(); show('sm-menu', false); show('sm-pick', true); MGS.blip();
}
function paintOpts() {
    const S = SPORTS[SM.id], o = SM.opts;
    let h = `<div class="mg-row"><span class="sm-lab">Bot</span>${['Easy', 'Normal', 'Pro'].map((n, i) => `<button class="mg-btn sm ${o.diff === i ? 'on' : ''}" data-o="diff" data-v="${i}">${n}</button>`).join('')}</div>`;
    for (const [key, lab, vals] of S.optList || []) h += `<div class="mg-row"><span class="sm-lab">${lab}</span>${vals.map(([v, n]) => `<button class="mg-btn sm ${o[key] === v ? 'on' : ''}" data-o="${key}" data-v="${v}">${n}</button>`).join('')}</div>`;
    if (S.turns) h += `<div class="mg-row"><span class="sm-lab">Bots</span>${[0, 1, 2, 3].map(n => `<button class="mg-btn sm ${(o.bots ?? 1) === n ? 'on' : ''}" data-o="bots" data-v="${n}">${n}</button>`).join('')}</div>`;
    $('sm-po').innerHTML = h;
}
$('sm-po').onclick = e => { const b = e.target.closest('[data-o]'); if (!b) return; const v = b.dataset.v; SM.opts[b.dataset.o] = isNaN(+v) ? v : +v; paintOpts(); MGS.blip(); };
$('sm-back').onclick = () => { show('sm-pick', false); show('sm-menu', true); };
$('sm-go').onclick = () => startSolo();
$('sm-online').onclick = () => { show('sm-menu', false); MG.cfg.title = 'Sports Mix'; mgShowLobby(); roomPanel(); };
function startSolo() {
    const S = SPORTS[SM.id], me = { id: 0, name: mgMyName(), col: '#38bdf8', bot: false }, P = [me];
    const nb = S.turns ? (SM.opts.bots ?? 1) : S.max - 1;
    for (let i = 0; i < nb; i++) P.push({ id: 100 + i, name: MG_BOTS[i] + ' (bot)', col: ['#f472b6', '#facc15', '#4ade80'][i % 3], bot: true });
    SM.net = false; SM.host = true; SM.me = 0; begin(SM.id, P, SM.opts);
}
// ---- a game ----
function begin(id, P, opts) {
    SM.id = id; SM.sport = SPORTS[id]; SM.P = P; SM.opts = opts; SM.over = false; SM.acc = 0; SM.inp = {}; SM.prev = {}; SM.evSeen = 0;
    SM.st = SM.sport.init(P, opts); if (!SM.st.ev) { SM.st.ev = []; SM.st.evN = 0; } SM.st.msg = SM.st.msg || '';
    show('sm-menu', false); show('sm-pick', false); show('sm-hud', true); mgHideLobby(); $('mg-res').classList.add('hidden');
    SM.playing = true; MGS.go();
}
function blankIn() { return { u: 0, d: 0, l: 0, r: 0, a: 0, b: 0 }; }
function keyIn() { const k = SM.keys; return { u: k.ArrowUp || k.KeyW ? 1 : 0, d: k.ArrowDown || k.KeyS ? 1 : 0, l: k.ArrowLeft || k.KeyA ? 1 : 0, r: k.ArrowRight || k.KeyD ? 1 : 0, a: k.Space || k.Enter ? 1 : 0, b: k.ShiftLeft || k.ShiftRight || k.KeyX ? 1 : 0 }; }
// events (sounds, flashes) the sport raises; they travel with the state so guests hear them too
function ev(st, name, text) { if (!st.ev) { st.ev = []; st.evN = 0; } st.evN++; st.ev.push([st.evN, name, text || '']); if (st.ev.length > 8) st.ev.shift(); }
function playEvents(st) {
    for (const [n, name, text] of st.ev) { if (n <= SM.evSeen) continue; SM.evSeen = n; SFX(name); if (text) flashMsg(text); }
}
function SFX(n) {
    const t = (f, l, ty, v, f2) => MGS.tone ? MGS.tone(f, l, ty, v, f2) : 0;
    if (n === 'hit') MGS.hit(); else if (n === 'score') MGS.win(); else if (n === 'lose') MGS.lose(); else if (n === 'go') MGS.go(); else if (n === 'whistle') { MGS.go(); } else MGS.blip();
}
let msgT = 0;
function flashMsg(t) { const m = $('sm-msg'); m.textContent = t; m.classList.remove('hidden'); m.style.animation = 'none'; void m.offsetWidth; m.style.animation = ''; clearTimeout(msgT); msgT = setTimeout(() => m.classList.add('hidden'), 1600); }
// ---- the loop ----
let lastT = performance.now();
function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; SM.t += dt;
    if (SM.playing && SM.st) {
        if (SM.host) {
            SM.acc += dt;
            while (SM.acc >= 1 / 60) {
                SM.acc -= 1 / 60;
                SM.P.forEach((p, i) => {
                    let x = p.bot ? SM.sport.bot(SM.st, i, 1 / 60) || blankIn() : p.id === SM.me ? keyIn() : (SM.inp[p.id] || blankIn());
                    const pv = SM.prev[i] || blankIn(); for (const k of ['u', 'd', 'l', 'r', 'a', 'b']) x[k + 'p'] = x[k] && !pv[k] ? 1 : 0; SM.prev[i] = x; SM.cur = SM.cur || []; SM.cur[i] = x;
                });
                SM.sport.step(SM.st, 1 / 60, SM.cur, SM.P);
                const o = SM.sport.over(SM.st); if (o && !SM.over) { SM.over = true; finish(o); break; }
            }
            if (SM.net && MG.net && (SM.sendT -= dt) <= 0) { SM.sendT = 1 / 20; MG.toAll({ k: 'st', st: SM.st }, true); }
        } else if (MG.net && (SM.sendT -= dt) <= 0) { SM.sendT = 1 / 25; const k = keyIn(); MG.send('host', { k: 'in', i: [k.u, k.d, k.l, k.r, k.a, k.b] }, true); }
        playEvents(SM.st);
    }
    draw();
}
function draw() {
    const w = CV.width, h = CV.height; G.setTransform(1, 0, 0, 1, 0, 0);
    const S = SM.sport && SM.st ? SM.sport : null;
    if (!S) { const gr = G.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1e1b4b'); gr.addColorStop(1, '#0b0f1a'); G.fillStyle = gr; G.fillRect(0, 0, w, h); return; }
    G.fillStyle = S.bg || '#0b1a12'; G.fillRect(0, 0, w, h);
    const pad = 0.06, sc = Math.min(w * (1 - pad * 2) / S.W, h * (1 - pad * 2 - .08) / S.H), ox = (w - S.W * sc) / 2, oy = (h - S.H * sc) / 2 + h * .03;
    G.setTransform(sc, 0, 0, sc, ox, oy); SM.sc = sc;
    S.draw(G, SM.st, SM.P);
    G.setTransform(1, 0, 0, 1, 0, 0);
    const hud = S.hud(SM.st, SM.P); if (hud !== SM.lastHud) { SM.lastHud = hud; $('sm-hud').innerHTML = hud; }
}
// drawing helpers (world units)
function circ(g, x, y, r, fill, stroke, lw) { g.beginPath(); g.arc(x, y, r, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.lineWidth = lw || r * .2; g.strokeStyle = stroke; g.stroke(); } }
function shadow(g, x, y, r, a) { g.fillStyle = `rgba(0,0,0,${a || .25})`; g.beginPath(); g.ellipse(x + r * .25, y + r * .35, r, r * .6, 0, 0, TAU); g.fill(); }
function person(g, x, y, r, col, face, label, carry) {
    shadow(g, x, y, r, .3); circ(g, x, y, r, col, 'rgba(0,0,0,.45)', r * .18);
    circ(g, x + Math.cos(face) * r * .55, y + Math.sin(face) * r * .55, r * .32, '#f1c27d');
    if (label) { g.font = `bold ${r * 1.1}px system-ui`; g.textAlign = 'center'; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = r * .25; g.strokeText(label, x, y - r * 1.7); g.fillText(label, x, y - r * 1.7); }
}
function line(g, x1, y1, x2, y2, col, lw) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokeStyle = col; g.lineWidth = lw; g.stroke(); }
function nameOf(i) { const p = SM.P[i]; return p ? p.name.replace(' (bot)', '') : '?'; }
function colOf(i) { const p = SM.P[i]; return p ? p.col : '#fff'; }
// ---- the end of a game ----
function finish(o) {
    if (SM.net && MG.net) MG.toAll({ k: 'fin', o, st: SM.st });
    showEnd(o);
}
function showEnd(o) {
    SM.playing = false;
    const me = SM.P.findIndex(p => p.id === SM.me), won = o.win === me, s = smSave();
    s.p[SM.id] = (s.p[SM.id] || 0) + 1; if (won) s.w[SM.id] = (s.w[SM.id] || 0) + 1;
    if (o.best) for (const k in o.best) if (o.best[k][me] != null) { const v = o.best[k][me], lowWins = k === 'mini' || k === 'golf'; if (s.best[k] == null || (lowWins ? v < s.best[k] : v > s.best[k])) s.best[k] = v; }
    smWrite(s);
    (won ? MGS.win : o.win < 0 ? MGS.blip : MGS.lose)();
    const host = !SM.net || MG.isHost();
    const r = $('mg-res'); r.classList.remove('hidden');
    r.innerHTML = `<div class="mg-card"><div class="mg-kicker">${SPORTS[SM.id].ic} ${SPORTS[SM.id].n}</div><h1>${o.win < 0 ? 'Draw' : won ? 'You win!' : esc(nameOf(o.win)) + ' wins'}</h1><p class="mg-sub">${o.text || ''}</p>
      <div class="mg-row">${host ? '<button class="mg-btn big" id="sm-again">Play again</button>' : '<span class="mg-sub">Waiting for the host...</span>'}<button class="mg-btn" id="sm-menu-b">${SM.net ? 'Leave' : 'Menu'}</button></div></div>`;
    if ($('sm-again')) $('sm-again').onclick = () => { r.classList.add('hidden'); if (SM.net) { const st = { k: 'go', id: SM.id, P: SM.P, opts: SM.opts }; MG.toAll(st); begin(SM.id, SM.P, SM.opts); } else startSolo(); };
    $('sm-menu-b').onclick = () => { r.classList.add('hidden'); if (SM.net) mgLeave(); else toMenu(); };
}
function toMenu() { SM.playing = false; SM.st = null; SM.sport = null; show('sm-hud', false); show('sm-msg', false); show('sm-pick', false); show('sm-menu', true); mgHideLobby(); paintMenu(); }
const esc = s => mgEsc(s);
// ---- keys ----
addEventListener('keydown', e => {
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT')) return;
    SM.keys[e.code] = true;
    if (SM.playing && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (SM.playing && !SM.net && e.code === 'Escape' && !e.repeat) { toMenu(); }
});
addEventListener('keyup', e => { SM.keys[e.code] = false; });
addEventListener('blur', () => { SM.keys = {}; });
// touch: a stick on the left, two buttons on the right
(() => {
    const T = document.createElement('div'); T.id = 'sm-touch'; T.innerHTML = '<div id="sm-stick"><i></i></div><button data-k="Space">A</button><button data-k="ShiftLeft">B</button>'; document.body.appendChild(T);
    if (!('ontouchstart' in window)) T.classList.add('hidden');
    const st = $('sm-stick'), knob = st.firstChild;
    const set = (dx, dy) => { SM.keys.ArrowLeft = dx < -.3; SM.keys.ArrowRight = dx > .3; SM.keys.ArrowUp = dy < -.3; SM.keys.ArrowDown = dy > .3; knob.style.transform = `translate(${dx * 30}px,${dy * 30}px)`; };
    const mv = e => { const r = st.getBoundingClientRect(), p = e.touches ? e.touches[0] : e; set(clamp((p.clientX - r.left - r.width / 2) / 40, -1, 1), clamp((p.clientY - r.top - r.height / 2) / 40, -1, 1)); e.preventDefault(); };
    st.addEventListener('touchstart', mv, { passive: false }); st.addEventListener('touchmove', mv, { passive: false }); st.addEventListener('touchend', () => set(0, 0));
    T.querySelectorAll('button').forEach(b => { b.addEventListener('touchstart', e => { SM.keys[b.dataset.k] = true; e.preventDefault(); }, { passive: false }); b.addEventListener('touchend', () => { SM.keys[b.dataset.k] = false; }); });
})();
// ---- online ----
function roomPanel() {
    let d = $('sm-room'); const R = $('mg-room');
    if (!d) {
        d = document.createElement('div'); d.id = 'sm-room'; R.insertBefore(d, $('mg-hostrow'));
        const back = document.createElement('button'); back.className = 'mg-btn'; back.textContent = '← Sports menu'; back.style.marginTop = '8px';
        back.onclick = () => { if (MG.net) mgLeave(); else toMenu(); }; $('mg-lobby').querySelector('.mg-card').appendChild(back);
        d.addEventListener('change', e => { if (e.target.id === 'sm-rs') { SM.id = e.target.value; MG.toAll({ k: 'sport', id: SM.id }); paintRoom(); } });
        setInterval(() => { if (MG.net && MG.isHost() && !MG.started) MG.toAll({ k: 'sport', id: SM.id }); }, 3000);
        setInterval(() => { if (!$('mg-lobby').classList.contains('hidden') && !d.contains(document.activeElement)) paintRoom(); }, 700);      // host / guest can change after the room opens
    }
    if (!SM.id) SM.id = 'soccer';
    paintRoom();
}
function paintRoom() {
    const d = $('sm-room'); if (!d) return; const S = SPORTS[SM.id], key = SM.id + (MG.isHost() && !MG.solo);
    if (d._k === key) return; d._k = key;
    d.innerHTML = MG.isHost() && !MG.solo ? `<label>Sport <select id="sm-rs">${Object.keys(SPORTS).map(k => `<option value="${k}" ${k === SM.id ? 'selected' : ''}>${SPORTS[k].ic} ${SPORTS[k].n}</option>`).join('')}</select></label><div class="mg-sub">${S.turns ? 'Up to 4 players take turns.' : '2 players: the first two in the room play, bots fill in.'}</div>`
        : `<div class="mg-sub">The host picked: <b>${S.ic} ${S.n}</b></div>`;
}
function onlineStart(roster, seed) {
    SM.net = true; SM.me = MG.me; SM.host = MG.isHost();
    if (!SM.host) { SM.playing = false; return; }
    const S = SPORTS[SM.id], humans = roster.filter(r => !r.bot), bots = roster.filter(r => r.bot);
    let P = humans.slice(0, S.max).concat(bots).slice(0, S.turns ? S.max : 2);
    while (P.length < (S.turns ? 1 : 2)) P.push({ id: 150 + P.length, name: MG_BOTS[P.length] + ' (bot)', bot: true });
    P = P.map((p, i) => ({ id: p.id, name: p.name, col: mgCol(i), bot: !!p.bot }));
    const opts = Object.assign({}, S.defOpts || {}, { diff: 1 });
    MG.toAll({ k: 'go', id: SM.id, P, opts }); begin(SM.id, P, opts);
}
function onNet(from, m) {
    if (!m || typeof m !== 'object') return;
    if (m.k === 'in' && SM.host && Array.isArray(m.i)) { const [u, d, l, r, a, b] = m.i.map(v => v ? 1 : 0); SM.inp[from] = { u, d, l, r, a, b }; return; }
    if (SM.host) return;
    if (m.k === 'sport' && SPORTS[m.id]) { SM.id = m.id; paintRoom(); }
    else if (m.k === 'go' && SPORTS[m.id]) { begin(m.id, m.P, m.opts); SM.host = false; }
    else if (m.k === 'st' && m.st && SM.sport) { SM.st = m.st; }
    else if (m.k === 'fin' && SM.sport) { if (m.st) SM.st = m.st; playEvents(SM.st); showEnd(m.o); }
}
MG.init({ id: 'sports', title: 'Sports Mix', color: '#22c55e', min: 1, max: 4, bots: 3, defBots: 1, solo: false, sub: 'Play your friends online.', howto: 'The host picks the sport below and starts. Bots fill empty seats.',
    onStart: onlineStart, onMsg: onNet, onLeave: () => {}, onQuit: () => toMenu() });
mgHideLobby();
window.__hgJoin = (h => c => { $('sm-online').click(); return h(c); })(window.__hgJoin);
setTimeout(() => { paintMenu(); requestAnimationFrame(frame); }, 0);
// tests: run n host steps at once (window.__sports.sim), and start a game directly (window.__sports.start)
SM.sim = n => {
    for (let k = 0; k < n && SM.playing && !SM.over; k++) {
        SM.P.forEach((p, i) => { const x = p.bot ? SM.sport.bot(SM.st, i, 1 / 60) || blankIn() : blankIn(); const pv = SM.prev[i] || blankIn(); for (const q of ['u', 'd', 'l', 'r', 'a', 'b']) x[q + 'p'] = x[q] && !pv[q] ? 1 : 0; SM.prev[i] = x; SM.cur = SM.cur || []; SM.cur[i] = x; });
        SM.sport.step(SM.st, 1 / 60, SM.cur, SM.P);
        const o = SM.sport.over(SM.st); if (o) { SM.over = true; SM.result = o; finish(o); }
    }
    return SM.over;
};
SM.start = (id, P, opts) => { SM.net = false; SM.host = true; SM.me = -1; begin(id, P, Object.assign({ diff: 1 }, SPORTS[id].defOpts || {}, opts || {})); };
