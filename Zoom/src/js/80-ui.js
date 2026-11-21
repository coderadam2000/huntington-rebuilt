// ==========================================
// ZOOM: menus, the garage, the setup screens, the HUD, results, pause, and the keyboard / touch controls.
// ==========================================
const UI = {};
document.getElementById('app').innerHTML = `
<div id="zm-hud" class="hidden">
  <div id="zm-tl"><div id="zm-lap">LAP 1/3</div><div id="zm-time">0:00.00</div><div id="zm-info"></div></div>
  <div id="zm-place"><b>1</b><i>st</i><small>/8</small></div>
  <div id="zm-bl"><div id="zm-item"><span id="zm-itemic"></span><em id="zm-uses"></em></div><div id="zm-coins">💰 <b>0</b></div></div>
  <div id="zm-br"><canvas id="zm-map" width="180" height="180"></canvas><div id="zm-spd"><b>0</b> km/h</div></div>
  <div id="zm-wrong" class="hidden">WRONG WAY</div>
  <div id="zm-banner" class="hidden"><b></b><small></small></div>
  <div id="zm-cd" class="hidden"></div>
  <div id="zm-toasts"></div>
  <div id="zm-ink" class="hidden"></div>
  <div id="zm-flash"></div>
  <div id="zm-hint">W / ↑ gas · A D / ← → steer · S / ↓ brake · SPACE drift (hold) · E item (hold S to throw back) · Q look back · C camera · P pause</div>
  <div id="zm-touch" class="hidden"><button data-k="left">◀</button><button data-k="right">▶</button><button data-k="down" class="r">⏬</button><button data-k="drift" class="r">DRIFT</button><button data-k="item" class="r">ITEM</button></div>
</div>
<div id="zm-menu" class="zm-screen hidden">
  <div class="zm-logo">ZOOM<span>kart &amp; bike racing</span></div>
  <div class="zm-wallet">💰 <b id="zm-wal">0</b> coins</div>
  <div class="zm-grid" id="zm-modes"></div>
  <div class="zm-row"><button class="zm-btn wide" data-go="online">🌐 Race friends online</button></div>
  <div class="zm-row"><button class="zm-btn" data-go="garage">🔧 Garage</button><button class="zm-btn" data-go="records">📊 Records</button><button class="zm-btn" data-go="howto">❔ How to play</button><button class="zm-btn" data-go="opts">⚙️ Options</button></div>
</div>
<div id="zm-pick" class="zm-screen hidden"></div>
<div id="zm-garage" class="zm-screen side hidden"></div>
<div id="zm-records" class="zm-screen hidden"></div>
<div id="zm-howto" class="zm-screen hidden"></div>
<div id="zm-opts" class="zm-screen hidden"></div>
<div id="zm-res" class="zm-screen hidden"></div>
<div id="zm-pause" class="zm-screen hidden"><h2>Paused</h2><div class="zm-row"><button class="zm-btn big" id="zm-resume">Resume (P)</button><button class="zm-btn" id="zm-restart">Restart race</button><button class="zm-btn" id="zm-quit">Quit to menu</button></div></div>
<div id="zm-wait" class="zm-screen hidden"><h2 id="zm-waitt">Starting...</h2></div>`;
const SCREENS = ['zm-menu', 'zm-pick', 'zm-garage', 'zm-records', 'zm-howto', 'zm-opts', 'zm-res', 'zm-pause', 'zm-wait'];
function uiHideAll() { for (const s of SCREENS) zEl(s).classList.add('hidden'); }
function uiShow(id) { uiHideAll(); zEl(id).classList.remove('hidden'); sfx('ui'); }
function uiWait(t) { uiShow('zm-wait'); zEl('zm-waitt').textContent = t; }
function stars(n, max) { let s = ''; for (let i = 0; i < max; i++) s += `<i class="${i < n ? 'on' : ''}"></i>`; return s; }
const TROPHY = ['', '🥉', '🥈', '🥇'];

// ---- the menu, with a car parked on a track behind it ----
function showMenu() {
    Z.state = 'menu'; hudShow(false);
    zEl('zm-wal').textContent = Z.save.coins;
    zEl('zm-modes').innerHTML = ['gp', 'race', 'tt', 'ko', 'coins', 'balloon'].map(m => `<button class="zm-mode" data-mode="${m}"><span>${MODES[m].ic}</span><b>${MODES[m].n}</b><small>${MODES[m].d}</small></button>`).join('');
    uiShow('zm-menu');
    if (!Z.show || Z.showFor !== 'menu') showcase('menu');
}
function showcase(why) {
    clearWorld(); Z.showFor = why;
    const def = why === 'garage' ? TRACKS[0] : TRACKS[(Math.random() * TRACKS.length) | 0];
    Z.T = sampleTrack(def); Z.world = buildWorld(Z.T, true); Z.scene.add(Z.world);
    Z.race = { mode: 'race', cls: 1, go: false, clock: 0 };
    showcaseCar();
}
function showcaseCar() {
    if (Z.show) Z.scene.remove(Z.show.root);
    const V = Z.show = makeVehicle(Z.save.build, null), p = trackPoint(Z.T, Z.T.idx(0.025), 0); V.root.position.set(p.x, p.y, p.z); V.root.rotation.y = p.h; Z.scene.add(V.root);
    Z.showP = p;
}
function showcaseTick(dt) {
    const p = Z.showP; if (!p) return;
    const g = Z.state === 'garage', a = Z.t * (g ? 0.35 : 0.12) + 0.8, r = g ? 5.6 : 9, c = Z.cam;
    c.position.set(p.x + Math.sin(a) * r, p.y + (g ? 2.1 : 3.2), p.z + Math.cos(a) * r);
    c.lookAt(p.x, p.y + 0.7, p.z); if (c.fov !== 60) { c.fov = 60; c.updateProjectionMatrix(); }
    // in the garage the panel is on the right: slide the picture so the car sits in the open space on the left
    const off = g && innerWidth > 760 ? Math.round(innerWidth * 0.22) : 0;
    if (off !== UI.viewOff) { UI.viewOff = off; if (off) c.setViewOffset(innerWidth, innerHeight, off, 0, innerWidth, innerHeight); else c.clearViewOffset(); }
    if (Z.T.sky) Z.T.sky.position.copy(c.position);
    if (Z.T.stars) Z.T.stars.position.copy(c.position);
    if (Z.T.weather) weatherStep(dt);
    if (Z.show) for (const w of Z.show.wheels) w.rotation.x -= dt * 2;
}
zEl('zm-menu').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.mode) return showPick(b.dataset.mode);
    const go = b.dataset.go;
    if (go === 'online') return showOnline();
    if (go === 'garage') return showGarage('body');
    if (go === 'records') return showRecords();
    if (go === 'howto') return showHowto();
    if (go === 'opts') return showOpts();
});

// ---- setting up a race ----
function trackCard(t, sel) {
    const b = Z.save.best[t.id] || {};
    return `<button class="zm-track${sel ? ' sel' : ''}" data-track="${t.id}"><canvas data-map="${t.id}" width="120" height="80"></canvas><b>${t.name}</b><small>${CUPS[t.cup].ic} ${CUPS[t.cup].name}${b.race ? ' · best ' + fmtTime(b.race) : ''}</small></button>`;
}
function drawMaps(root) {
    root.querySelectorAll('canvas[data-map]').forEach(cv => {
        const T = UI.maps[cv.dataset.map] || (UI.maps[cv.dataset.map] = sampleTrack(trackById(cv.dataset.map)));
        drawTrackShape(cv.getContext('2d'), T, cv.width, cv.height, 6, THEMES[T.def.theme].curb[0], 4);
    });
}
UI.maps = {};
function mapXf(T, w, h, pad) { const [x0, x1, z0, z1] = T.box, s = Math.min((w - pad * 2) / (x1 - x0), (h - pad * 2) / (z1 - z0)); return { s, ox: (w - (x1 - x0) * s) / 2 - x0 * s, oz: (h - (z1 - z0) * s) / 2 - z0 * s }; }
function drawTrackShape(g, T, w, h, pad, col, lw) {
    const X = mapXf(T, w, h, pad); g.clearRect(0, 0, w, h);
    g.lineJoin = 'round'; g.lineCap = 'round';
    for (const [c, l] of [['rgba(0,0,0,.55)', lw + 3], [col, lw]]) { g.strokeStyle = c; g.lineWidth = l; g.beginPath(); for (let i = 0; i <= T.N; i += 2) { const k = i % T.N, x = T.px[k] * X.s + X.ox, y = T.pz[k] * X.s + X.oz; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.stroke(); }
    g.fillStyle = '#fff'; g.fillRect(T.px[0] * X.s + X.ox - 2, T.pz[0] * X.s + X.oz - 2, 4, 4);
    return X;
}
function showPick(mode) {
    const o = Z.save.opts; UI.pick = { mode, cup: UI.pick && UI.pick.cup || 0, track: UI.pick && UI.pick.track || 'meadow', cls: o.cls, bots: o.bots, items: o.items };
    paintPick(); uiShow('zm-pick');
}
function paintPick() {
    const P = UI.pick, m = MODES[P.mode], el = zEl('zm-pick');
    const cls = P.mode === 'tt' ? '' : `<div class="zm-row"><span class="zm-lab">Speed</span>${CLASSES.map((c, i) => `<button class="zm-chip${P.cls === i ? ' sel' : ''}" data-cls="${i}">${c.n} <small>${c.sub}</small></button>`).join('')}</div>`;
    let body;
    if (P.mode === 'gp') body = `<div class="zm-cups">${CUPS.map((c, i) => { const ok = cupUnlocked(i), tr = Z.save.cups[cupKey(i, P.cls)] || 0;
        return `<button class="zm-cup${P.cup === i ? ' sel' : ''}${ok ? '' : ' locked'}" data-cup="${i}" ${ok ? '' : 'disabled'} style="--c:${c.col}"><span>${c.ic}</span><b>${c.name}</b><small>${ok ? cupTracks(i).map(t => t.name).join(' · ') : '🔒 Win a trophy in the ' + CUPS[i - 1].name + ' first'}</small><em>${tr ? TROPHY[tr] + ' best at this speed' : ''}</em></button>`; }).join('')}</div>`;
    else body = `<div class="zm-tracks">${TRACKS.map(t => trackCard(t, P.track === t.id)).join('')}</div>`;
    const extra = P.mode === 'tt' ? '' : `<div class="zm-row"><span class="zm-lab">Bots</span><select id="zm-bots">${[1, 2, 3, 4, 5, 6, 7].map(n => `<option ${n === P.bots ? 'selected' : ''}>${n}</option>`).join('')}</select>
        ${P.mode !== 'balloon' ? `<label class="zm-check"><input type="checkbox" id="zm-items" ${P.items ? 'checked' : ''}> Items</label>` : ''}</div>`;
    el.innerHTML = `<h2>${m.ic} ${m.n}</h2><p class="zm-sub">${m.d}</p>${cls}${body}${extra}
      <div class="zm-row"><button class="zm-btn big" id="zm-go">Start ▶</button><button class="zm-btn" id="zm-back">Back</button></div>`;
    drawMaps(el);
}
zEl('zm-pick').addEventListener('click', e => {
    const b = e.target.closest('button'), P = UI.pick; if (!b) return;
    if (b.dataset.cls) { P.cls = +b.dataset.cls; Z.save.opts.cls = P.cls; writeSave(); paintPick(); sfx('ui'); return; }
    if (b.dataset.cup) { P.cup = +b.dataset.cup; paintPick(); sfx('ui'); return; }
    if (b.dataset.track) { if (P.track === b.dataset.track && e.detail === 2) return pickGo(); P.track = b.dataset.track; paintPick(); sfx('ui'); return; }
    if (b.id === 'zm-back') return showMenu();
    if (b.id === 'zm-go') return pickGo();
});
zEl('zm-pick').addEventListener('change', e => {
    const P = UI.pick;
    if (e.target.id === 'zm-bots') { P.bots = +e.target.value; Z.save.opts.bots = P.bots; writeSave(); }
    if (e.target.id === 'zm-items') { P.items = e.target.checked; Z.save.opts.items = P.items; writeSave(); }
});
function pickGo() {
    const P = UI.pick; if (P.mode === 'gp' && !cupUnlocked(P.cup)) return;
    uiHideAll(); Z.online = false; Z.show && Z.scene.remove(Z.show.root); Z.show = null; Z.showFor = null;
    const tracks = P.mode === 'gp' ? cupTracks(P.cup).map(t => t.id) : [P.track];
    startSeries({ mode: P.mode, tracks, cls: P.mode === 'tt' ? 2 : P.cls, items: P.mode === 'balloon' ? true : P.items, roster: soloRoster(P.mode, P.bots, P.cls), online: false, seed: (Math.random() * 1e9) | 0 });
}

// ---- the garage ----
function showGarage(tab) {
    UI.gtab = tab; Z.state = 'garage';
    if (Z.showFor !== 'garage') showcase('garage');
    paintGarage(); uiShow('zm-garage');
}
function owned(kind, id) { return Z.save.owned[kind].includes(id); }
function paintGarage() {
    const s = Z.save, b = s.build, tab = UI.gtab, st = buildStats(b);
    const tabs = [['body', 'Vehicle'], ['wheel', 'Wheels'], ['paint', 'Paint'], ['suit', 'Driver'], ['decal', 'Decal']];
    let list = '';
    const item = (kind, id, name, cost, sel, sub, sw) => { const own = kind === 'suit' || owned(kind, id); return `<button class="zm-part${sel ? ' sel' : ''}${own ? '' : ' buy'}" data-kind="${kind}" data-id="${id}">${sw ? `<i class="sw" style="background:${sw}"></i>` : ''}<b>${name}</b><small>${sub || ''}</small><em>${own ? (sel ? 'Equipped' : '') : '💰 ' + cost}</em></button>`; };
    if (tab === 'body') list = BODIES.map(x => item('body', x.id, (x.type === 'bike' ? '🏍️ ' : '🏎️ ') + x.name, x.cost, b.body === x.id, x.d)).join('');
    if (tab === 'wheel') list = WHEELS.map(x => item('wheel', x.id, x.name, x.cost, b.wheel === x.id, Object.entries(x.st).map(([k, v]) => (v > 0 ? '+' : '') + v + ' ' + STATN[k]).join(', ') || 'No changes', x.rim)).join('');
    if (tab === 'paint') list = PAINTS.map((c, i) => item('paint', i, 'Paint ' + (i + 1), PAINT_COST[i], b.col === i, '', c)).join('');
    if (tab === 'suit') list = SUITS.map((c, i) => item('suit', i, 'Suit ' + (i + 1), 0, b.suit === i, '', c)).join('');
    if (tab === 'decal') list = DECALS.map(x => item('decal', x.id, x.name, x.cost, b.decal === x.id)).join('');
    zEl('zm-garage').innerHTML = `<h2>🔧 Garage</h2><div class="zm-wallet">💰 <b>${s.coins}</b> coins <small>(win races and grab coins to earn more)</small></div>
      <div class="zm-tabs">${tabs.map(([k, n]) => `<button class="zm-chip${tab === k ? ' sel' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>
      <div class="zm-parts">${list}</div>
      <div class="zm-stats">${Object.keys(STATN).map(k => `<div><span>${STATN[k]}</span><div class="bar">${stars(st[k], 6)}</div></div>`).join('')}</div>
      <div class="zm-row"><button class="zm-btn big" id="zm-gdone">Done</button></div>`;
}
const STATN = { spd: 'Speed', acc: 'Acceleration', wgt: 'Weight', hnd: 'Handling', grp: 'Grip', mt: 'Mini-turbo' };
zEl('zm-garage').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.tab) { UI.gtab = b.dataset.tab; paintGarage(); sfx('ui'); return; }
    if (b.id === 'zm-gdone') return showMenu();
    const kind = b.dataset.kind; if (!kind) return;
    const s = Z.save, id = kind === 'paint' || kind === 'suit' ? +b.dataset.id : b.dataset.id;
    if (kind !== 'suit' && !owned(kind, id)) {
        const cost = kind === 'body' ? bodyById(id).cost : kind === 'wheel' ? wheelById(id).cost : kind === 'paint' ? PAINT_COST[id] : DECALS.find(d => d.id === id).cost;
        if (s.coins < cost) { sfx('no'); b.classList.add('shake'); setTimeout(() => b.classList.remove('shake'), 400); return; }
        s.coins -= cost; s.owned[kind].push(id); sfx('buy');
    } else sfx('ui');
    if (kind === 'body') s.build.body = id; if (kind === 'wheel') s.build.wheel = id; if (kind === 'paint') s.build.col = id; if (kind === 'suit') s.build.suit = id; if (kind === 'decal') s.build.decal = id;
    writeSave(); showcaseCar(); paintGarage();
});

// ---- records, how to play, options ----
function showRecords() {
    const s = Z.save, st = s.stats;
    zEl('zm-records').innerHTML = `<h2>📊 Records</h2>
      <div class="zm-statrow"><div><b>${st.races}</b>races</div><div><b>${st.wins}</b>wins</div><div><b>${st.podiums}</b>podiums</div><div><b>${st.trophies}</b>trophies</div><div><b>${st.gold}</b>gold cups</div><div><b>${st.coins}</b>coins earned</div></div>
      <div class="zm-cupgrid">${CUPS.map((c, i) => `<div><b>${c.ic} ${c.name}</b>${CLASSES.map((k, j) => `<span>${k.n}: ${TROPHY[s.cups[cupKey(i, j)] || 0] || '—'}</span>`).join('')}</div>`).join('')}</div>
      <table class="zm-tab"><tr><th>Track</th><th>Best race</th><th>Best lap</th></tr>${TRACKS.map(t => { const b = s.best[t.id] || {}; return `<tr><td>${t.name}</td><td>${b.race ? fmtTime(b.race) : '—'}</td><td>${b.lap ? fmtTime(b.lap) : '—'}</td></tr>`; }).join('')}</table>
      <div class="zm-row"><button class="zm-btn big" data-back>Back</button></div>`;
    uiShow('zm-records');
}
function showHowto() {
    zEl('zm-howto').innerHTML = `<h2>❔ How to play</h2><div class="zm-how">
      <p><b>Drive:</b> W or ↑ for gas, S or ↓ to brake and reverse, A D or ← → to steer.</p>
      <p><b>Drift:</b> hold SPACE (or Shift) while you turn. Sparks go <span style="color:#60a5fa">blue</span>, then <span style="color:#fb923c">orange</span>, then <span style="color:#c084fc">purple</span>: let go for a mini-turbo. Bigger sparks, bigger boost.</p>
      <p><b>Rocket start:</b> press gas right as the "2" shows. Too early and you stall.</p>
      <p><b>Ramps:</b> tap SPACE in the air off a ramp for a trick and a boost when you land.</p>
      <p><b>Items:</b> drive through ? boxes, press E to use. Hold S when you throw to throw backwards. Racers at the back get the best items.</p>
      <p><b>Coins:</b> every coin (up to 10) makes you a bit faster. Getting hit drops some. Coins you collect go to your wallet for the garage.</p>
      <p><b>Look back:</b> hold Q. <b>Camera:</b> C. <b>Pause:</b> P or Esc.</p>
      <div class="zm-items">${ITEM_IDS.map(id => `<div><span>${ITEMS[id].ic}</span><b>${ITEMS[id].n}</b><small>${ITEMS[id].d}</small></div>`).join('')}</div></div>
      <div class="zm-row"><button class="zm-btn big" data-back>Back</button></div>`;
    uiShow('zm-howto');
}
function showOpts() {
    const o = Z.save.opts;
    zEl('zm-opts').innerHTML = `<h2>⚙️ Options</h2>
      <div class="zm-row"><span class="zm-lab">Graphics</span><button class="zm-chip${o.gfx === 0 ? ' sel' : ''}" data-o="gfx" data-v="0">Fast</button><button class="zm-chip${o.gfx === 1 ? ' sel' : ''}" data-o="gfx" data-v="1">Pretty</button></div>
      <div class="zm-row"><span class="zm-lab">Camera</span>${['Close', 'Far', 'Bumper'].map((n, i) => `<button class="zm-chip${o.cam === i ? ' sel' : ''}" data-o="cam" data-v="${i}">${n}</button>`).join('')}</div>
      <div class="zm-row"><span class="zm-lab">Auto gas</span><button class="zm-chip${!o.auto ? ' sel' : ''}" data-o="auto" data-v="0">Off</button><button class="zm-chip${o.auto ? ' sel' : ''}" data-o="auto" data-v="1">On (you only steer)</button></div>
      <div class="zm-row"><button class="zm-btn big" data-back>Back</button></div>`;
    uiShow('zm-opts');
}
zEl('zm-opts').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !b.dataset.o) return;
    const o = Z.save.opts, k = b.dataset.o, v = +b.dataset.v; o[k] = k === 'auto' ? !!v : v; writeSave();
    if (k === 'gfx') applyGfx();
    showOpts();
});
for (const id of ['zm-records', 'zm-howto', 'zm-opts']) zEl(id).addEventListener('click', e => { if (e.target.closest('[data-back]')) showMenu(); });

// ---- online: the shared lobby, plus the race setup for the host ----
function showOnline() {
    uiHideAll(); Z.state = 'lobby';
    const lob = zEl('mg-lobby'); lob.classList.remove('hidden');
    if (!zEl('zm-roomset')) {
        const d = document.createElement('div'); d.id = 'zm-roomset'; zEl('mg-room').insertBefore(d, zEl('mg-hostrow'));
        const back = document.createElement('button'); back.className = 'mg-btn'; back.id = 'zm-lobback'; back.textContent = '← Zoom menu';
        back.onclick = () => { if (MG.net) mgLeave(); else onlineQuit(); };
        lob.querySelector('.mg-card').appendChild(back);
        d.addEventListener('change', e => { const t = e.target, R = Z.room; if (t.id === 'zr-mode') R.mode = t.value; if (t.id === 'zr-track') R.track = t.value; if (t.id === 'zr-cup') R.cup = +t.value; if (t.id === 'zr-cls') R.cls = +t.value; if (t.id === 'zr-items') R.items = t.checked; paintRoom(); roomBroadcast(); });
        setInterval(() => { if (MG.net && MG.isHost() && !MG.started) roomBroadcast(); paintRoom(); }, 2500);
    }
    paintRoom();
}
function paintRoom() {
    const d = zEl('zm-roomset'); if (!d) return;
    const R = Z.room, host = MG.isHost() && !MG.solo;
    if (!host) { d.innerHTML = UI.roomSum ? `<div class="zm-roomsum">${UI.roomSum}</div>` : ''; return; }
    if (d.contains(document.activeElement)) return;
    d.innerHTML = `<div class="zm-roomrow"><label>Mode <select id="zr-mode">${Object.keys(MODES).filter(m => m !== 'tt').map(m => `<option value="${m}" ${R.mode === m ? 'selected' : ''}>${MODES[m].n}</option>`).join('')}</select></label>
      ${R.mode === 'gp' ? `<label>Cup <select id="zr-cup">${CUPS.map((c, i) => `<option value="${i}" ${R.cup === i ? 'selected' : ''}>${c.ic} ${c.name}</option>`).join('')}</select></label>`
        : `<label>Track <select id="zr-track">${TRACKS.map(t => `<option value="${t.id}" ${R.track === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select></label>`}
      <label>Speed <select id="zr-cls">${CLASSES.map((c, i) => `<option value="${i}" ${R.cls === i ? 'selected' : ''}>${c.n}</option>`).join('')}</select></label>
      <label><input type="checkbox" id="zr-items" ${R.items ? 'checked' : ''}> Items</label></div>`;
}
function roomText(R) { return `${MODES[R.mode].ic} ${MODES[R.mode].n} · ${R.mode === 'gp' ? CUPS[R.cup].name : trackById(R.track).name} · ${CLASSES[R.cls].n}${R.items ? '' : ' · no items'}`; }
function roomBroadcast() { if (MG.net && MG.isHost()) MG.toAll({ k: 'cfg', mode: Z.room.mode, track: Z.room.track, cup: Z.room.cup, cls: Z.room.cls, items: Z.room.items }); }
function roomSummary(o) { const R = { mode: MODES[o.mode] ? o.mode : 'race', track: trackById(o.track).id, cup: clamp(o.cup | 0, 0, 2), cls: clamp(o.cls | 0, 0, 2), items: !!o.items }; UI.roomSum = 'The host picked: ' + zEsc(roomText(R)); paintRoom(); }

// ---- results ----
function showResults(rows, reward) {
    const S = Z.series, cfg = S.cfg, mode = cfg.mode, gp = mode === 'gp', last = !gp || S.ri >= cfg.tracks.length - 1;
    const host = !cfg.online || MG.isHost(), me = Z.me.id;
    const col = r => mode === 'coins' ? `💰 ${r.coins}` : mode === 'balloon' ? `🎈 ${r.bal} · ${r.hits} hits` : mode === 'ko' ? (r.place === 1 ? 'Last one driving' : 'Out') : (r.est ? '~' : '') + fmtTime(r.t);
    const tbl = rows.map(r => `<div class="zm-rrow${r.id === me ? ' me' : ''}"><span class="pl">${ordinal(r.place)}</span><span class="nm">${zEsc(r.name)}${r.bot ? ' <small>bot</small>' : ''}</span><span>${col(r)}</span>${r.best && mode !== 'ko' && mode !== 'coins' && mode !== 'balloon' ? `<small>lap ${fmtTime(r.best)}</small>` : '<small></small>'}${gp ? `<b>+${r.pts} · ${S.pts[r.id]}</b>` : ''}</div>`).join('');
    let btns = '';
    if (host) {
        if (gp && !last) btns = `<button class="zm-btn big" id="zr-next">Next race ▶</button>`;
        else if (gp) btns = `<button class="zm-btn big" id="zr-trophy">See the trophy 🏆</button>`;
        else btns = cfg.online ? `<button class="zm-btn big" id="zr-again">Race again</button><button class="zm-btn" id="zr-room">Back to room</button>` : `<button class="zm-btn big" id="zr-again">Race again</button><button class="zm-btn" id="zr-change">Change track</button>`;
    } else btns = `<span class="zm-sub">Waiting for the host...</span>`;
    btns += cfg.online ? `<button class="zm-btn" id="zr-leave">Leave</button>` : `<button class="zm-btn" id="zr-menu">Menu</button>`;
    zEl('zm-res').innerHTML = `<h2>${trackById(cfg.tracks[S.ri]).name}${gp ? ` <small>race ${S.ri + 1} of 4</small>` : ''}</h2><div class="zm-rtab">${tbl}</div>
      <div class="zm-reward">+${reward} coins · wallet 💰 ${Z.save.coins}</div><div class="zm-row">${btns}</div>`;
    uiShow('zm-res'); hudShow(false);
}
zEl('zm-res').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const S = Z.series, cfg = S && S.cfg;
    if (b.id === 'zr-next') { if (cfg.online) netEvent({ k: 'next', ri: S.ri + 1 }); else { uiHideAll(); startRace(S.ri + 1); } }
    if (b.id === 'zr-trophy') showTrophy();
    if (b.id === 'zr-again') { if (cfg.online) { const c = Object.assign({}, cfg, { seed: (Math.random() * 1e9) | 0 }); netEvent({ k: 'go', cfg: c }); } else { uiHideAll(); startSeries(Object.assign({}, cfg, { seed: (Math.random() * 1e9) | 0, roster: cfg.mode === 'gp' ? cfg.roster : cfg.roster })); } }
    if (b.id === 'zr-change') { clearWorld(); Z.showFor = null; showPick(cfg.mode); showcase('menu'); }
    if (b.id === 'zr-room') onlineToRoom();
    if (b.id === 'zr-menu') { clearWorld(); Z.showFor = null; showMenu(); }
    if (b.id === 'zr-leave') mgLeave();
});
function showTrophy() {
    const r = gpTrophy(), cfg = Z.series.cfg, me = Z.me.id;
    zEl('zm-res').innerHTML = `<h2>${CUPS[trackById(cfg.tracks[0]).cup].ic} ${CUPS[trackById(cfg.tracks[0]).cup].name} · ${CLASSES[cfg.cls].n}</h2>
      <div class="zm-trophy">${r.place <= 3 ? TROPHY[4 - r.place] : '🏁'}</div><h3>${r.place <= 3 ? ['', 'Gold! You won the cup!', 'Silver trophy!', 'Bronze trophy!'][r.place] : ordinal(r.place) + ' overall: top 3 gets a trophy'}</h3>
      <div class="zm-rtab">${r.tot.map((x, i) => `<div class="zm-rrow${x.r.id === me ? ' me' : ''}"><span class="pl">${ordinal(i + 1)}</span><span class="nm">${zEsc(x.r.name)}</span><b>${x.p} pts</b></div>`).join('')}</div>
      ${r.bonus ? `<div class="zm-reward">Trophy bonus +${r.bonus} coins</div>` : ''}
      <div class="zm-row">${cfg.online ? (MG.isHost() ? '<button class="zm-btn big" id="zr-room">Back to room</button>' : '') + '<button class="zm-btn" id="zr-leave">Leave</button>' : '<button class="zm-btn big" id="zr-menu">Menu</button>'}</div>`;
    sfx(r.place <= 3 ? 'win' : 'done');
}

// ---- pause (playing alone only) ----
function pauseToggle(on) {
    if (Z.online || Z.state !== 'race') return;
    Z.paused = on === undefined ? !Z.paused : on;
    zEl('zm-pause').classList.toggle('hidden', !Z.paused);
    if (Z.paused) musicStop(); else musicStart(Z.T.def.theme);
}
zEl('zm-resume').onclick = () => pauseToggle(false);
zEl('zm-restart').onclick = () => { pauseToggle(false); startRace(Z.series.ri); };
zEl('zm-quit').onclick = () => { pauseToggle(false); clearWorld(); Z.showFor = null; showMenu(); };

// ---- the HUD ----
function hudShow(on) { zEl('zm-hud').classList.toggle('hidden', !on); if (on) { zEl('zm-hint').style.opacity = 1; UI.hintT = 9; } }
function hudTrack(def) {
    const cv = zEl('zm-map'), T = Z.T, off = UI.mapBg = document.createElement('canvas'); off.width = cv.width; off.height = cv.height;
    UI.mapX = drawTrackShape(off.getContext('2d'), T, off.width, off.height, 10, 'rgba(255,255,255,.85)', 5);
    UI.touch = UI.touch || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
    zEl('zm-touch').classList.toggle('hidden', !UI.touch);
}
function hudUpdate(dt) {
    const R = Z.race, K = Z.me, T = Z.T; if (!K) return;
    UI.hintT -= dt; if (UI.hintT < 0) zEl('zm-hint').style.opacity = Math.max(0, 1 + UI.hintT);
    const tm = Math.max(0, R.clock * 1000);
    if (R.mode === 'ko') { zEl('zm-lap').textContent = '💥 ' + Z.karts.filter(k => !k.out).length + ' left'; zEl('zm-info').textContent = R.go && !R.ended ? 'Next knockout ' + Math.max(0, Math.ceil(R.koNext)) + 's' : ''; }
    else if (R.mode === 'coins' || R.mode === 'balloon') { zEl('zm-lap').textContent = R.mode === 'coins' ? '💰 Coin Rush' : '🎈 ' + K.balloons + ' balloons'; zEl('zm-info').textContent = Math.max(0, Math.ceil(R.timeLimit - Math.max(0, R.clock))) + 's left'; }
    else { zEl('zm-lap').textContent = 'LAP ' + clamp(K.lap, 1, R.laps) + '/' + R.laps; const bl = K.lapT.length ? Math.min(...K.lapT) : 0; zEl('zm-info').textContent = bl ? 'Best lap ' + fmtTime(bl) : ''; }
    zEl('zm-time').textContent = fmtTime(K.finished ? K.finT : tm);
    const pl = zEl('zm-place'); pl.querySelector('b').textContent = K.place; pl.querySelector('i').textContent = ordinal(K.place).replace(/\d+/, ''); pl.querySelector('small').textContent = '/' + Z.karts.filter(k => !k.gone).length;
    pl.dataset.p = K.place <= 3 ? K.place : 0;
    zEl('zm-coins').querySelector('b').textContent = R.mode === 'coins' ? K.coins : Math.min(K.coins, 99);
    zEl('zm-spd').querySelector('b').textContent = Math.round(Math.abs(K.sp) * 3.6);
    // item slot (rolls while you wait)
    const ic = zEl('zm-itemic'), us = zEl('zm-uses');
    if (K.golden > 0) { ic.textContent = '✨'; us.textContent = K.golden.toFixed(0) + 's'; }
    else if (K.roll > 0) { ic.textContent = ITEMS[ITEM_IDS[Math.floor(Z.t * 14) % ITEM_IDS.length]].ic; us.textContent = ''; }
    else { ic.textContent = K.item ? ITEMS[K.item].ic : ''; us.textContent = K.item && K.uses > 1 ? '×' + K.uses : ''; }
    zEl('zm-item').classList.toggle('full', !!K.item || K.golden > 0);
    zEl('zm-wrong').classList.toggle('hidden', !(K.wrong > 1.2 && R.go && !K.finished));
    zEl('zm-ink').classList.toggle('hidden', !(K.ink > 0)); if (K.ink > 0) zEl('zm-ink').style.opacity = Math.min(1, K.ink / 1.5);
    // minimap
    const cv = zEl('zm-map'), g = cv.getContext('2d'), X = UI.mapX; g.clearRect(0, 0, cv.width, cv.height); g.drawImage(UI.mapBg, 0, 0);
    for (const k of Z.karts.slice().sort((a, b) => (a === K) - (b === K))) { if (k.gone || (k.out && R.mode !== 'race')) continue; const x = k.x * X.s + X.ox, y = k.z * X.s + X.oz; g.fillStyle = PAINTS[k.build.col]; g.strokeStyle = k === K ? '#fff' : '#000'; g.lineWidth = k === K ? 2.5 : 1.5; g.beginPath(); g.arc(x, y, k === K ? 6 : 4.5, 0, TAU); g.fill(); g.stroke(); }
    if (Z.ghostK && Z.ghostK.V.root.visible) { const p = Z.ghostK.V.root.position; g.fillStyle = 'rgba(165,243,252,.8)'; g.beginPath(); g.arc(p.x * X.s + X.ox, p.z * X.s + X.oz, 4, 0, TAU); g.fill(); }
    if (UI.banT > 0) { UI.banT -= dt; if (UI.banT <= 0) zEl('zm-banner').classList.add('hidden'); }
    if (UI.cdT > 0) { UI.cdT -= dt; if (UI.cdT <= 0) zEl('zm-cd').classList.add('hidden'); }
}
function banner(t, sub, secs) { const b = zEl('zm-banner'); b.querySelector('b').textContent = t; b.querySelector('small').textContent = sub || ''; b.classList.remove('hidden'); b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; UI.banT = secs || 2; }
function countdown(t) { const c = zEl('zm-cd'); c.textContent = t; c.classList.remove('hidden'); c.dataset.go = t === 'GO!' ? 1 : 0; c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; UI.cdT = t === 'GO!' ? 0.9 : 1.1; }
function toast(t) { const d = document.createElement('div'); d.textContent = t; zEl('zm-toasts').appendChild(d); setTimeout(() => d.remove(), 2200); while (zEl('zm-toasts').children.length > 4) zEl('zm-toasts').firstChild.remove(); }
function flash(c) { const f = zEl('zm-flash'); f.style.background = c; f.style.transition = 'none'; f.style.opacity = 0.75; void f.offsetWidth; f.style.transition = 'opacity .5s'; f.style.opacity = 0; }
function inkSplat() { const d = zEl('zm-ink'); d.innerHTML = Array.from({ length: 7 }, () => `<i style="left:${10 + Math.random() * 70}%;top:${10 + Math.random() * 60}%;width:${120 + Math.random() * 160}px;height:${110 + Math.random() * 150}px"></i>`).join(''); }

// ---- controls ----
Z.keys = { up: false, down: false, left: false, right: false, drift: false, item: false, back: false };
const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'drift', ShiftLeft: 'drift', ShiftRight: 'drift', KeyE: 'item', KeyX: 'item', KeyK: 'item', KeyQ: 'back' };
addEventListener('keydown', e => {
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    const k = KEYMAP[e.code];
    if (Z.state === 'race') {
        if (k) { Z.keys[k] = true; e.preventDefault(); }
        if (!e.repeat && (e.code === 'KeyP' || (e.code === 'Escape' && !Z.online))) { e.preventDefault(); pauseToggle(); }
        if (!e.repeat && e.code === 'KeyC') { Z.save.opts.cam = (Z.save.opts.cam + 1) % 3; writeSave(); toast(['Close camera', 'Far camera', 'Bumper camera'][Z.save.opts.cam]); }
    } else if (e.code === 'Escape' && !e.repeat && ['zm-pick', 'zm-garage', 'zm-records', 'zm-howto', 'zm-opts'].some(s => !zEl(s).classList.contains('hidden'))) showMenu();
    else if ((e.code === 'Enter' || e.code === 'Space') && !e.repeat && !zEl('zm-pick').classList.contains('hidden') && !(t && t.tagName === 'BUTTON')) { e.preventDefault(); pickGo(); }
});
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) Z.keys[k] = false; });
addEventListener('blur', () => { for (const k in Z.keys) Z.keys[k] = false; });
zEl('zm-touch').addEventListener('pointerdown', e => { const b = e.target.closest('button'); if (b) { Z.keys[b.dataset.k] = true; e.preventDefault(); } });
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) zEl('zm-touch').addEventListener(ev, e => { const b = e.target.closest('button'); if (b) Z.keys[b.dataset.k] = false; });
function readInput(K) {
    if (!K || K.ctl !== 'me') return;
    const k = Z.keys, auto = Z.save.opts.auto || UI.touch;
    K.input.gas = k.down ? -1 : (k.up || auto) ? 1 : 0;
    K.input.steer = (k.left ? 1 : 0) - (k.right ? 1 : 0);
    K.input.drift = k.drift; K.input.item = k.item; K.input.back = k.down;
}
