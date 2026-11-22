// ==========================================
// BATTLESHIP: hide five ships on a 10 x 10 sea, then take turns firing. Sink all five of theirs first.
// Fleet: Carrier 5, Battleship 4, Cruiser 3, Submarine 3, Destroyer 2. Ships may touch but not overlap.
// Placement: Shuffle, or click a ship to pick it up and click where it goes (R or right-click turns it).
// Online: the host keeps both fleets (a guest sends theirs when it presses Ready), checks every shot and tells everyone
// only what both players may know: the shots, hit or miss, and the ships that have sunk.
// Bots: Easy (mostly random), Normal (hunts, then follows its hits), Hard (a probability map of where ships can be).
// Save (synced, prefix hgmini_): hgmini_bs = { w, l, shots, hits, bot, best (fewest shots to win) }
// ==========================================
const N = 10, FLEET = [['Carrier', 5], ['Battleship', 4], ['Cruiser', 3], ['Submarine', 3], ['Destroyer', 2]];
const BOTS = ['Easy', 'Normal', 'Hard'];
const BS = { ids: [0, 0], phase: 'idle', fleets: [null, null], ready: [false, false], shots: [[], []], sunk: [[], []], turn: 0, over: false, mine: null, botDelay: 650, hold: -1, horiz: true, hover: null, bot: 1, last: null, gid: 0 };
const $ = id => document.getElementById(id);
function bsSave() { let s = null; try { s = JSON.parse(mgLs('hgmini_bs') || 'null'); } catch (e) {} return Object.assign({ w: 0, l: 0, shots: 0, hits: 0, bot: 1, best: 0 }, s && typeof s === 'object' ? s : {}); }
function bsWrite(s) { mgLs('hgmini_bs', JSON.stringify(s)); }
const cellsOf = s => Array.from({ length: s.len }, (_, k) => s.h ? [s.x + k, s.y] : [s.x, s.y + k]);
const fits = (ships, s, skip) => cellsOf(s).every(([x, y]) => x >= 0 && y >= 0 && x < N && y < N) && !ships.some((o, i) => i !== skip && o && cellsOf(o).some(([a, b]) => cellsOf(s).some(([c, d]) => a === c && b === d)));
function randomFleet() {
    for (let tries = 0; tries < 200; tries++) {
        const ships = []; let ok = true;
        for (const [n, len] of FLEET) {
            let s = null;
            for (let k = 0; k < 300 && !s; k++) { const h = Math.random() < .5, c = { n, len, h, x: Math.floor(Math.random() * (h ? N - len + 1 : N)), y: Math.floor(Math.random() * (h ? N : N - len + 1)) }; if (fits(ships, c)) s = c; }
            if (!s) { ok = false; break; } ships.push(s);
        }
        if (ok) return ships;
    }
    return null;
}
function validFleet(ships) {
    if (!Array.isArray(ships) || ships.length !== FLEET.length) return false;
    return ships.every((s, i) => s && s.len === FLEET[i][1] && Number.isInteger(s.x) && Number.isInteger(s.y) && fits(ships, { n: FLEET[i][0], len: s.len, h: !!s.h, x: s.x, y: s.y }, i));
}
// ---- the page ----
document.getElementById('app').innerHTML = `<div class="mg-hud"><span id="bs-a"></span><span id="bs-t"></span><span id="bs-b"></span></div>
  <div id="bs-wrap"><div class="bs-side"><h3 id="bs-lh">Your fleet</h3><div class="bs-board" id="bs-me"></div><div class="bs-tools" id="bs-tools">
      <button class="mg-btn sm" id="bs-shuf">🔀 Shuffle</button><button class="mg-btn sm" id="bs-rot">↻ Turn (R)</button><button class="mg-btn big" id="bs-ready">Ready ⚓</button></div>
      <div class="bs-fleet" id="bs-myfleet"></div></div>
    <div class="bs-side"><h3 id="bs-rh">Enemy waters</h3><div class="bs-board enemy" id="bs-them"></div><div class="bs-fleet" id="bs-theirfleet"></div></div></div>`;
function mkBoard(el) {
    let h = '<div class="bs-lbl"></div>'; for (let x = 0; x < N; x++) h += `<div class="bs-lbl">${x + 1}</div>`;
    for (let y = 0; y < N; y++) { h += `<div class="bs-lbl">${'ABCDEFGHIJ'[y]}</div>`; for (let x = 0; x < N; x++) h += `<button class="bs-c" data-x="${x}" data-y="${y}"></button>`; }
    el.innerHTML = '<div class="bs-grid">' + h + '</div><div class="bs-ships"></div>';
}
mkBoard($('bs-me')); mkBoard($('bs-them'));
const me = () => BS.ids.indexOf(MG.me), opp = () => 1 - me();
const cell = (el, x, y) => el.querySelector(`.bs-c[data-x="${x}"][data-y="${y}"]`);
function shipDiv(s, cls) { return `<div class="bs-ship ${cls || ''} ${s.h ? 'h' : 'v'}" style="--x:${s.x};--y:${s.y};--l:${s.len}"><i></i></div>`; }
function draw() {
    const my = me(), meB = $('bs-me'), them = $('bs-them'), placing = BS.phase === 'place' && !BS.ready[my];
    // your sea: your ships, and where they have fired
    let ships = (BS.mine || []).map((s, i) => i === BS.hold ? '' : shipDiv(s, (BS.sunk[my] || []).some(z => z.n === s.n) ? 'sunk' : '')).join('');
    if (placing && BS.hold >= 0 && BS.hover) { const g = Object.assign({}, BS.mine[BS.hold], { x: BS.hover[0], y: BS.hover[1], h: BS.horiz }); ships += shipDiv(g, 'ghost' + (fits(BS.mine, g, BS.hold) ? '' : ' bad')); }
    meB.querySelector('.bs-ships').innerHTML = ships;
    meB.querySelectorAll('.bs-c').forEach(c => { c.className = 'bs-c'; c.textContent = ''; });
    for (const [x, y, hit] of BS.shots[1 - my] || []) { const c = cell(meB, x, y); c.classList.add(hit ? 'hit' : 'miss'); }
    // their sea: your shots, their sunk ships
    them.querySelector('.bs-ships').innerHTML = (BS.sunk[1 - my] || []).map(s => shipDiv(s, 'sunk')).join('');
    them.querySelectorAll('.bs-c').forEach(c => { c.className = 'bs-c'; });
    for (const [x, y, hit] of BS.shots[my] || []) cell(them, x, y).classList.add(hit ? 'hit' : 'miss');
    if (BS.last) { const el = BS.last.by === my ? them : meB, c = cell(el, BS.last.x, BS.last.y); if (c) c.classList.add('last'); }
    const myTurn = BS.phase === 'battle' && !BS.over && BS.turn === my;
    them.classList.toggle('live', myTurn); meB.classList.toggle('placing', placing);
    $('bs-tools').classList.toggle('hidden', BS.phase !== 'place');
    $('bs-ready').disabled = BS.ready[my]; $('bs-shuf').disabled = $('bs-rot').disabled = BS.ready[my];
    $('bs-ready').textContent = BS.ready[my] ? 'Waiting for ' + nm(BS.ids[1 - my]) + '...' : 'Ready ⚓';
    // fleets left
    const left = (i, el) => { const sunk = BS.sunk[i] || []; $(el).innerHTML = FLEET.map(([n, len]) => `<span class="${sunk.some(s => s.n === n) ? 'gone' : ''}">${n} <b>${'▮'.repeat(len)}</b></span>`).join(''); };
    left(my, 'bs-myfleet'); left(1 - my, 'bs-theirfleet');
    const hits = i => (BS.shots[i] || []).filter(s => s[2]).length;
    $('bs-a').textContent = '⚓ ' + nm(BS.ids[my]) + ' · ' + hits(my) + ' hits';
    $('bs-b').textContent = '🎯 ' + nm(BS.ids[1 - my]) + ' · ' + hits(1 - my) + ' hits';
    $('bs-t').textContent = BS.phase === 'place' ? (BS.ready[my] ? 'Waiting for your opponent to place' : 'Place your fleet, then press Ready') : BS.over ? 'Game over' : myTurn ? 'Your turn: fire on the enemy' : nm(BS.ids[BS.turn]) + ' is aiming...';
    $('bs-lh').textContent = BS.phase === 'place' ? 'Your fleet: place your ships' : 'Your fleet';
}
const nm = id => { const p = MG.player(id); return p ? p.name.replace(' (bot)', '') : '?'; };
// ---- placing ----
$('bs-shuf').onclick = () => { BS.mine = randomFleet(); BS.hold = -1; MGS.blip(); draw(); };
$('bs-rot').onclick = () => rotate();
function rotate() {
    if (BS.phase !== 'place' || BS.ready[me()]) return;
    if (BS.hold >= 0) { BS.horiz = !BS.horiz; draw(); return; }
    // nothing held: turn the last ship you touched in place, if it fits
    const i = BS.touched ?? -1; if (i < 0) return; const s = BS.mine[i], t = Object.assign({}, s, { h: !s.h });
    if (fits(BS.mine, t, i)) { BS.mine[i] = t; MGS.blip(); draw(); }
}
$('bs-me').addEventListener('click', e => {
    if (BS.phase !== 'place' || BS.ready[me()]) return;
    const c = e.target.closest('.bs-c'); if (!c) return; const x = +c.dataset.x, y = +c.dataset.y;
    if (BS.hold >= 0) { const s = Object.assign({}, BS.mine[BS.hold], { x, y, h: BS.horiz }); if (fits(BS.mine, s, BS.hold)) { BS.mine[BS.hold] = s; BS.touched = BS.hold; BS.hold = -1; MGS.blip(); } draw(); return; }
    const i = BS.mine.findIndex(s => cellsOf(s).some(([a, b]) => a === x && b === y));
    if (i >= 0) { BS.hold = i; BS.touched = i; BS.horiz = BS.mine[i].h; const k = cellsOf(BS.mine[i]).findIndex(([a, b]) => a === x && b === y); BS.grab = k; BS.hover = [BS.mine[i].x, BS.mine[i].y]; MGS.blip(); draw(); }
});
$('bs-me').addEventListener('pointermove', e => {
    if (BS.hold < 0) return; const c = e.target.closest('.bs-c'); if (!c) return;
    const k = BS.grab || 0, x = +c.dataset.x - (BS.horiz ? k : 0), y = +c.dataset.y - (BS.horiz ? 0 : k);
    if (!BS.hover || BS.hover[0] !== x || BS.hover[1] !== y) { BS.hover = [x, y]; draw(); }
});
$('bs-me').addEventListener('contextmenu', e => { if (BS.phase === 'place') { e.preventDefault(); rotate(); } });
addEventListener('keydown', e => { if ((e.key === 'r' || e.key === 'R') && BS.phase === 'place') rotate(); if (e.key === 'Escape' && BS.hold >= 0) { BS.hold = -1; draw(); } });
$('bs-ready').onclick = () => {
    if (BS.hold >= 0) { BS.hold = -1; }
    if (!validFleet(BS.mine)) return;
    BS.ready[me()] = true; draw(); MGS.go();
    MG.toHost({ k: 'fleet', ships: BS.mine.map(s => ({ n: s.n, len: s.len, h: s.h, x: s.x, y: s.y })), g: BS.gid });
};
// ---- firing ----
$('bs-them').addEventListener('click', e => {
    const c = e.target.closest('.bs-c'); if (!c || BS.phase !== 'battle' || BS.over || BS.turn !== me()) return;
    const x = +c.dataset.x, y = +c.dataset.y; if ((BS.shots[me()] || []).some(s => s[0] === x && s[1] === y)) return;
    MG.toHost({ k: 'fire', x, y, g: BS.gid });
});
// ---- the host runs the game ----
function hostFleet(from, ships) {
    const i = BS.ids.indexOf(from); if (i < 0 || BS.phase !== 'place' || !validFleet(ships)) return;
    BS.fleets[i] = ships.map((s, k) => ({ n: FLEET[k][0], len: FLEET[k][1], h: !!s.h, x: s.x, y: s.y })); BS.ready[i] = true;
    if (BS.fleets[0] && BS.fleets[1]) { BS.phase = 'battle'; broadcast(); botTurn(); } else broadcast();
}
function hostFire(i, x, y) {
    if (BS.phase !== 'battle' || BS.over || BS.turn !== i || !(x >= 0 && x < N && y >= 0 && y < N)) return;
    if (BS.shots[i].some(s => s[0] === x && s[1] === y)) return;
    const fleet = BS.fleets[1 - i], ship = fleet.find(s => cellsOf(s).some(([a, b]) => a === x && b === y)), hit = ship ? 1 : 0;
    BS.shots[i].push([x, y, hit]); BS.last = { by: i, x, y, hit, sunk: '' };
    if (ship && cellsOf(ship).every(([a, b]) => BS.shots[i].some(s => s[0] === a && s[1] === b))) { BS.sunk[1 - i].push(ship); BS.last.sunk = ship.n; }
    if (BS.sunk[1 - i].length === FLEET.length) { BS.over = true; broadcast(); setTimeout(() => finish(i), 1400); return; }
    if (!hit) BS.turn = 1 - i;      // a hit fires again
    broadcast(); botTurn();
}
function broadcast() {
    const m = { k: 'st', g: BS.gid, phase: BS.phase, ready: BS.ready, shots: BS.shots, sunk: BS.sunk, turn: BS.turn, over: BS.over, last: BS.last };
    MG.toAll(m); onState(m);
}
function finish(w) {
    const a = BS.ids[w], acc = i => { const s = BS.shots[i].length, h = BS.shots[i].filter(z => z[2]).length; return s ? Math.round(h / s * 100) + '%' : '-'; };
    MG.end(`<h1>${mgEsc(nm(a))} wins!</h1><div class="mg-sub">All five ships sunk in ${BS.shots[w].length} shots</div>` +
        [0, 1].map(i => `<div class="mg-res-row"><span>${i === w ? '🏆' : '⚓'} ${mgEsc(nm(BS.ids[i]))}</span><b>${BS.sunk[1 - i].length} sunk · ${acc(i)} accuracy</b></div>`).join(''));
}
function onState(m) {
    if (m.g !== BS.gid) return;
    const prevLast = BS.last;
    Object.assign(BS, { phase: m.phase, ready: m.ready, shots: m.shots, sunk: m.sunk, turn: m.turn, over: m.over, last: m.last });
    if (m.last && (!prevLast || prevLast.x !== m.last.x || prevLast.y !== m.last.y || prevLast.by !== m.last.by)) {
        if (m.last.sunk) { (m.last.by === me() ? MGS.win : MGS.lose)(); flash((m.last.by === me() ? 'You sank their ' : 'They sank your ') + m.last.sunk + '!'); }
        else if (m.last.hit) { MGS.hit(); flash(m.last.by === me() ? 'Hit! Fire again.' : 'You were hit!'); } else MGS.blip();
    }
    if (m.over && !BS.saved) { BS.saved = true; record(); }
    draw();
}
function record() {
    const s = bsSave(), i = me(), won = BS.sunk[1 - i].length === FLEET.length;
    if (won) { s.w++; if (!s.best || BS.shots[i].length < s.best) s.best = BS.shots[i].length; } else s.l++;
    s.shots += BS.shots[i].length; s.hits += BS.shots[i].filter(z => z[2]).length; bsWrite(s);
}
let flashT = 0;
function flash(t) { let f = $('bs-flash'); if (!f) { f = document.createElement('div'); f.id = 'bs-flash'; document.body.appendChild(f); } f.textContent = t; f.classList.remove('hidden'); f.style.animation = 'none'; void f.offsetWidth; f.style.animation = ''; clearTimeout(flashT); flashT = setTimeout(() => f.classList.add('hidden'), 1500); }
// ---- bots ----
function botTurn() {
    if (BS.phase !== 'battle' || BS.over) return; const p = MG.player(BS.ids[BS.turn]); if (!p || !p.bot) return;
    const i = BS.turn, g = BS.gid;
    setTimeout(() => { if (BS.gid !== g || BS.turn !== i || BS.over) return; const [x, y] = botAim(i); hostFire(i, x, y); }, BS.botDelay + Math.random() * BS.botDelay * .8);
}
function botAim(i) {
    const shots = BS.shots[i], tried = new Set(shots.map(s => s[0] + ',' + s[1])), free = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!tried.has(x + ',' + y)) free.push([x, y]);
    const sunkCells = new Set(BS.sunk[1 - i].flatMap(s => cellsOf(s).map(c => c[0] + ',' + c[1])));
    const open = shots.filter(s => s[2] && !sunkCells.has(s[0] + ',' + s[1]));      // hits on ships still afloat
    const lvl = BS.bot, pick = a => a[Math.floor(Math.random() * a.length)];
    if (lvl === 0 && (Math.random() < .55 || !open.length)) return pick(free);
    if (lvl <= 1) {
        if (open.length) {      // follow the hits: along the line if two line up, else any neighbour
            const nb = []; for (const [x, y] of open) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < N && b < N && !tried.has(a + ',' + b)) nb.push([a, b, open.some(o => o[0] === x - dx && o[1] === y - dy) ? 3 : 1]); }
            if (nb.length) { const best = Math.max(...nb.map(n => n[2])); return pick(nb.filter(n => n[2] === best)); }
        }
        const par = free.filter(([x, y]) => (x + y) % 2 === 0); return pick(par.length ? par : free);
    }
    // Hard: count every way each ship still afloat could lie, given the misses, the sunk ships and the open hits
    const heat = Array(N * N).fill(0), miss = new Set(shots.filter(s => !s[2]).map(s => s[0] + ',' + s[1])), openSet = new Set(open.map(o => o[0] + ',' + o[1]));
    const afloat = FLEET.filter(([n]) => !BS.sunk[1 - i].some(s => s.n === n));
    for (const [, len] of afloat) for (const h of [true, false]) for (let y = 0; y < (h ? N : N - len + 1); y++) for (let x = 0; x < (h ? N - len + 1 : N); x++) {
        const cs = cellsOf({ x, y, len, h }); if (cs.some(([a, b]) => miss.has(a + ',' + b) || sunkCells.has(a + ',' + b))) continue;
        const covers = cs.filter(([a, b]) => openSet.has(a + ',' + b)).length; if (open.length && !covers) { continue; }
        const w = open.length ? Math.pow(20, covers) : 1;
        for (const [a, b] of cs) if (!tried.has(a + ',' + b)) heat[b * N + a] += w;
    }
    const minLen = Math.min(...afloat.map(f => f[1]));      // hunting: only every minLen-th square can hide the smallest ship
    let best = -1, out = []; for (const [x, y] of free) { const v = heat[y * N + x] * (open.length || (x + y) % minLen === 0 ? 1 : .35) + Math.random() * .01; if (v > best) { best = v; out = [[x, y]]; } }
    return out[0] || pick(free);
}
// ---- lobby extras: the bot's level, your record ----
function bsLobbyExtras() {
    const card = document.querySelector('#mg-lobby .mg-card'); if (!card || $('bs-pick')) return;
    const s = bsSave(); BS.bot = Math.max(0, Math.min(2, s.bot | 0));
    const d = document.createElement('div'); d.id = 'bs-pick';
    d.innerHTML = `<div class="mg-row"><label>Bot <select id="bs-botsel">${BOTS.map((b, i) => `<option value="${i}">${b}</option>`).join('')}</select></label></div><div class="mg-sub" id="bs-rec"></div>`;
    card.insertBefore(d, card.querySelector('.mg-row'));
    const sel = $('bs-botsel'); sel.value = BS.bot; sel.onchange = () => { BS.bot = +sel.value; const s2 = bsSave(); s2.bot = BS.bot; bsWrite(s2); };
    sel.onkeydown = e => e.stopPropagation();
    const r = bsSave(); $('bs-rec').innerHTML = r.w + r.l ? `Your record: <b>${r.w}</b> won, <b>${r.l}</b> lost · accuracy ${r.shots ? Math.round(r.hits / r.shots * 100) : 0}%${r.best ? ' · best win in ' + r.best + ' shots' : ''}` : '';
}
MG.init({
    id: 'mg-battleship', title: 'Battleship', color: '#38bdf8', min: 2, max: 2, bots: 1, defBots: 1,
    sub: 'Hide your fleet. Find theirs. Sink all five.', howto: 'Place your ships (Shuffle, or click a ship and click where it goes; <b>R</b> turns it), press Ready, then click the enemy sea to fire. A hit fires again.',
    onStart(roster, seed) {
        BS.gid = seed || Date.now(); BS.ids = [roster[0].id, roster[1].id]; BS.phase = 'place'; BS.fleets = [null, null]; BS.ready = [false, false]; BS.shots = [[], []]; BS.sunk = [[], []]; BS.over = false; BS.last = null; BS.saved = false;
        BS.turn = (seed || 0) % 2; BS.mine = randomFleet(); BS.hold = -1; BS.touched = -1;
        if (MG.isHost()) roster.forEach((r, i) => { if (r.bot) { BS.fleets[i] = randomFleet(); BS.ready[i] = true; } });
        draw(); if (MG.isHost()) broadcast();
    },
    onMsg(from, m) {
        if (m.k === 'st' && !MG.isHost()) onState(m);
        else if (m.k === 'fleet' && MG.isHost() && m.g === BS.gid) hostFleet(from, m.ships);
        else if (m.k === 'fire' && MG.isHost() && m.g === BS.gid) hostFire(BS.ids.indexOf(from), m.x | 0, m.y | 0);
    },
    onLeave() { if (!BS.over && MG.isHost() && BS.phase !== 'idle') { BS.over = true; MG.end('<h1>Your opponent left</h1>'); } }
});
bsLobbyExtras();
// tests: window.__bs (state, the bot's aim, and the rules)
window.__bs = { BS, me: () => MG.me, randomFleet, validFleet, botAim, cellsOf, fits, hostFire: (i, x, y) => hostFire(i, x, y), ready: () => $('bs-ready').click() };
