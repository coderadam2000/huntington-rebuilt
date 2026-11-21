// ==========================================
// ZOOM: a race. The series (a Grand Prix is 4 races; everything else is 1), the grid, the countdown (hit the gas
// on "2" for a rocket start), the fixed-step loop, standings, mode rules, results, rewards, and the time-trial ghost.
// Save (synced by the launcher, prefix hgmini_): hgmini_zoom = { coins, owned, build, cups, best, stats, opts }.
// Ghosts are big, so they stay on this computer: zoomghost_<track>.
// ==========================================
const SAVE_KEY = 'hgmini_zoom';
function defSave() {
    return { v: 1, coins: 0, owned: { body: ['sprint', 'scooter'], wheel: ['std'], decal: ['none'], paint: [0, 1, 2, 3, 4, 5] },
        build: { body: 'sprint', wheel: 'std', col: 0, suit: 0, decal: 'none' }, cups: {}, best: {}, stats: { races: 0, wins: 0, podiums: 0, coins: 0, trophies: 0, gold: 0 },
        opts: { cls: 1, bots: 7, auto: false, gfx: 1, cam: 0, items: true } };
}
function loadSave() {
    let s = null; try { s = JSON.parse(mgLs(SAVE_KEY) || 'null'); } catch (e) {}
    const d = defSave(); if (!s || typeof s !== 'object') return d;
    for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
    for (const k of Object.keys(d.owned)) if (!Array.isArray(s.owned[k])) s.owned[k] = d.owned[k];
    for (const k of Object.keys(d.stats)) if (typeof s.stats[k] !== 'number') s.stats[k] = 0;
    s.opts = Object.assign(d.opts, s.opts || {}); s.build = Object.assign(d.build, s.build || {});
    return s;
}
Z.save = loadSave();
function writeSave() { mgLs(SAVE_KEY, JSON.stringify(Z.save)); }
const cupKey = (c, cls) => CUPS[c].id + ':' + cls;
function cupUnlocked(c) { if (c === 0) return true; return Object.keys(Z.save.cups).some(k => k.startsWith(CUPS[c - 1].id + ':') && Z.save.cups[k] > 0); }

// ---- the series ----
// cfg: { mode, tracks: [ids], cls, items, roster: [{ id, name, col, build, bot, skill, spd }], online, seed }
function startSeries(cfg) {
    Z.series = { cfg, ri: 0, pts: {}, rows: [] };
    for (const r of cfg.roster) Z.series.pts[r.id] = 0;
    startRace(0);
}
function soloRoster(mode, nBots, cls) {
    const rnd = mgRng((Math.random() * 1e9) | 0), me = { id: 0, name: mgMyName(), col: '#ffffff', build: Object.assign({}, Z.save.build), bot: false };
    const out = [me];
    if (mode !== 'tt') for (let k = 0; k < nBots; k++) out.push(makeBotEntry(100 + k, k, rnd, cls));
    return out;
}
function makeBotEntry(id, k, rnd, cls) {
    const b = BODIES[Math.floor(rnd() * BODIES.length)], w = WHEELS[Math.floor(rnd() * WHEELS.length)];
    const build = { body: b.id, wheel: w.id, col: Math.floor(rnd() * PAINTS.length), suit: Math.floor(rnd() * SUITS.length), decal: DECALS[Math.floor(rnd() * DECALS.length)].id };
    return { id, name: BOT_NAMES[k % BOT_NAMES.length], col: PAINTS[build.col], build, bot: true, skill: clamp(0.3 + cls * 0.25 + rnd() * 0.3 + (k < 2 ? 0.1 : 0), 0.2, 1), spd: 0.975 + rnd() * 0.04 };
}

// ---- one race ----
function clearWorld() {
    if (Z.world) { Z.scene.remove(Z.world); Z.world.traverse(o => { if (o.geometry) o.geometry.dispose(); }); Z.world = null; }
    for (const K of Z.karts) Z.scene.remove(K.V.root);
    for (const f of Z.fx) if (f.m) Z.scene.remove(f.m);
    if (Z.ghostK) { Z.scene.remove(Z.ghostK.V.root); Z.ghostK = null; }
    Z.karts = []; Z.fx = []; Z.booms = {}; Z.me = null;
}
function startRace(ri) {
    const S = Z.series, cfg = S.cfg; S.ri = ri;
    clearWorld();
    const def = trackById(cfg.tracks[ri]);
    Z.T = sampleTrack(def);
    Z.world = buildWorld(Z.T, Z.save.opts.gfx === 0); Z.scene.add(Z.world);
    const mode = cfg.mode, endless = mode === 'ko' || mode === 'coins' || mode === 'balloon';
    Z.race = { mode, cls: cfg.cls, laps: endless ? 99 : def.laps, items: cfg.items !== false && mode !== 'tt', clock: -3.6, go: false, ended: false, cdShown: 4, startBoost: 0, startEarly: false,
        koNext: 25, timeLimit: mode === 'coins' ? 120 : mode === 'balloon' ? 180 : 0, finishedAt: 0, ghostRec: [], online: !!cfg.online, host: !cfg.online || MG.isHost(), endT: 0 };
    // the grid: race 1 humans at the back; later races, the points leaders start at the back
    let order = cfg.roster.slice();
    if (ri === 0) { const rnd = mgRng(cfg.seed + 1); order.sort((a, b) => (a.bot - b.bot) || rnd() - 0.5); order.reverse(); }
    else order.sort((a, b) => S.pts[a.id] - S.pts[b.id] || a.id - b.id);
    const rnd = mgRng(cfg.seed + ri * 7 + 3);
    order.forEach((r, slot) => {
        const ctl = r.id === (cfg.online ? MG.me : 0) ? 'me' : r.bot ? (Z.race.host ? 'bot' : 'net') : 'net';
        const K = makeKart({ id: r.id, name: r.name, col: r.bot ? '#e5e7eb' : '#fde047', build: r.build, ctl, isBot: !!r.bot, botSpd: r.spd || 1 });
        if (ctl === 'bot') botInit(K, r.skill || 0.5, rnd);
        kartPlace(Z.T, K, slot); K.lapBack = true; K.lapStart = 0;
        if (mode === 'tt') { K.item = 'nitro3'; K.uses = 3; }
        Z.karts.push(K); if (ctl === 'me') Z.me = K;
    });
    if (!Z.me) Z.me = Z.karts[0];
    if (mode === 'tt') loadGhost(def.id);
    // particles
    if (!Z.sparks) { Z.sparks = makePS(500, 0.45, true); Z.dust = makePS(400, 0.9, false); Z.scene.add(Z.sparks.p); Z.scene.add(Z.dust.p); }
    Z.state = 'race'; Z.paused = false; Z.acc = 0;
    camSnap();
    hudShow(true); hudTrack(def);
    banner(def.name, CUPS[def.cup].ic + ' ' + MODES[mode].n + (cfg.mode === 'gp' ? ' · Race ' + (ri + 1) + ' of 4' : ''), 2.6);
    musicStart(def.theme);
}
// fixed-step update
function raceTick(dt) {
    const R = Z.race;
    if (Z.paused) return;
    // knocked out playing alone: the rest of the match plays out at 4x
    const fast = !Z.online && Z.me && Z.me.out && !R.ended ? 4 : 1;
    Z.acc = Math.min(0.1 * fast, (Z.acc || 0) + dt * fast);
    while (Z.acc >= 1 / 60) { Z.acc -= 1 / 60; raceStep(1 / 60); }
    for (const K of Z.karts) { if (K.ctl === 'net') netSmooth(K, dt); kartVisual(K, dt); }
    if (Z.ghostK) ghostPlay();
    psStep(Z.sparks, dt); psStep(Z.dust, dt);
    if (Z.T.weather) weatherStep(dt);
    for (const g of Z.T.spin || []) g.rotation.y += dt * 0.2;
    camUpdate(dt); hudUpdate(dt); engineSound();
}
function raceStep(dt) {
    const R = Z.race, me = Z.me;
    R.clock += dt;
    // countdown
    if (!R.go) {
        const left = -R.clock, n = Math.ceil(left);
        if (n !== R.cdShown && n <= 3 && n >= 1) { R.cdShown = n; countdown(String(n)); sfx('beep'); }
        if (me && me.input.gas > 0 && !R.gasAt) R.gasAt = left;
        if (me && me.input.gas <= 0) R.gasAt = 0;
        if (R.clock >= 0) {
            R.go = true; countdown('GO!'); sfx('go');
            if (me && R.gasAt) { if (R.gasAt > 1.05 && R.gasAt < 2.1) { me.boost = 1.3; toast('Rocket start!'); } else if (R.gasAt >= 2.6) { me.spin = 0.8; toast('Too early: stalled!'); } }
            for (const K of Z.karts) if (K.ctl === 'bot' && K.ai.rnd() < K.ai.skill * 0.7) K.boost = 1.0;
        }
    }
    readInput(me);
    for (const K of Z.karts) {
        if (K.ctl === 'net') continue;
        if (K.ctl === 'bot') botThink(K, dt);
        const ip = K.input.item; if (ip && !K.prevItem) useItem(K); K.prevItem = ip;
        kartStep(K, dt);
    }
    if (R.host) botRubber();
    collideKarts(dt);
    fxStep(dt);
    boxesAndCoins(dt);
    standings();
    if (R.go) modeRules(dt);
    if (R.mode === 'tt' && R.go && !me.finished && (R.recT = (R.recT || 0) + dt) >= 0.1) { R.recT = 0; R.ghostRec.push([Math.round(me.x * 10), Math.round(me.y * 10), Math.round(me.z * 10), Math.round(me.h * 100)]); }
    netTick(dt);
}
// lap crossings
function onLap(K) {
    const R = Z.race, t = R.clock * 1000;
    if (K.lap >= 1 && R.go) { K.lapT.push(t - (K.lapStart || 0)); K.lapStart = t; }
    if (!R.go) return;
    K.lap++;
    if (R.mode === 'ko' || R.mode === 'coins' || R.mode === 'balloon') { if (K.ctl === 'me') sfx('lap'); return; }
    if (K.lap > R.laps) { kartFinish(K, t); return; }
    if (K === Z.me) { if (K.lap === R.laps) { banner('FINAL LAP', '', 1.6); sfx('final'); } else { banner('Lap ' + K.lap + ' / ' + R.laps, '', 1.2); sfx('lap'); } }
}
function kartFinish(K, t) {
    if (K.finished) return;
    K.finished = true; K.finT = t;
    if (K.ctl === 'bot' || K.ctl === 'me') { const pl = K.place; netEvent({ k: 'fin', id: K.id, t, pl }); }
    if (K === Z.me) {
        sfx(K.place <= 3 ? 'win' : 'done');
        banner(K.place === 1 ? 'YOU WIN!' : ordinal(K.place) + ' place', fmtTime(t), 3);
        if (Z.race.mode === 'tt') ttFinish(t);
    }
}
function onFinMsg(o) { const K = Z.karts.find(k => k.id === o.id); if (K && !K.finished) { K.finished = true; K.finT = o.t; } }
// places: finished by time, then the rest by how far round they are; knocked-out karts last (latest out first)
function standings() {
    const R = Z.race, ks = Z.karts.slice();
    const score = K => R.mode === 'coins' ? K.coins * 1e6 + K.prog : R.mode === 'balloon' ? K.balloons * 1e7 + K.hits * 1e5 + K.prog : K.prog;
    ks.sort((a, b) => (a.out - b.out) || (a.out && b.out ? b.outT - a.outT : 0) || (b.finished - a.finished) || (a.finished && b.finished ? a.finT - b.finT : score(b) - score(a)));
    ks.forEach((K, i) => K.place = i + 1);
}
// knockouts, timers, the end
function modeRules(dt) {
    const R = Z.race, alive = Z.karts.filter(k => !k.out);
    if (R.ended) { R.endT += dt; return; }
    if (!R.host) return;                     // the host decides how a match ends; guests follow
    if (R.mode === 'ko') {
        R.koNext -= dt;
        if (R.koNext <= 0 && alive.length > 1) { R.koNext = alive.length > 4 ? 25 : 20; const last = alive.reduce((a, b) => a.place > b.place ? a : b); netEvent({ k: 'ko', id: last.id }); }
        if (alive.length <= 1) return endRace();
    } else if (R.mode === 'balloon') {
        if (alive.length <= 1 || R.clock >= R.timeLimit) return endRace();
    } else if (R.mode === 'coins') {
        if (R.clock >= R.timeLimit) return endRace();
    } else {
        const humans = Z.karts.filter(k => !k.isBot), allIn = humans.every(k => k.finished || k.gone);
        if (allIn) { if (!R.finishedAt) R.finishedAt = R.clock; if (R.clock - R.finishedAt > (Z.karts.every(k => k.finished) ? 0.5 : 2.5)) return endRace(); }
        else if (humans.some(k => k.finished)) { if (!R.firstIn) R.firstIn = R.clock; if (R.clock - R.firstIn > 45) return endRace(); }
    }
}
function onKoMsg(o) { const K = Z.karts.find(k => k.id === o.id); if (!K || K.out) return; K.out = true; K.outT = Z.race.clock; toast(K.name + ' is knocked out!'); if (K === Z.me) { sfx('lose'); banner('KNOCKED OUT', ordinal(Z.karts.filter(k => !k.out).length + 1) + ' place', 2.5); } else sfx('ko'); }
// the host ends it: give everyone not finished an estimated time, make the rows, tell everybody
function endRace() {
    const R = Z.race; if (R.ended) return; R.ended = true;
    const T = Z.T, t = R.clock * 1000;
    if (R.mode === 'race' || R.mode === 'gp' || R.mode === 'tt') for (const K of Z.karts) if (!K.finished) { const left = Math.max(0, (R.laps * T.N - K.prog) * T.step); K.finished = true; K.finT = t + left / Math.max(12, K.S.top * 0.85) * 1000; K.est = true; }
    standings();
    const rows = Z.karts.slice().sort((a, b) => a.place - b.place).map(K => ({ id: K.id, name: K.name, bot: K.isBot, place: K.place, t: Math.round(K.finT), est: !!K.est, coins: K.coins, bal: K.balloons, hits: K.hits, best: K.lapT.length ? Math.round(Math.min(...K.lapT)) : 0, body: K.build.body }));
    netEvent({ k: 'end', rows });
}
function onEndMsg(o) {
    const R = Z.race; R.ended = true; R.go = false; Z.state = 'results';
    const S = Z.series, cfg = S.cfg;
    if (cfg.mode === 'gp') o.rows.forEach(r => { r.pts = GP_POINTS[r.place - 1] || 0; S.pts[r.id] = (S.pts[r.id] || 0) + r.pts; });
    S.rows.push(o.rows);
    const me = o.rows.find(r => r.id === Z.me.id);
    const reward = me ? giveRewards(me, cfg, o.rows.length) : 0;
    musicStop();
    setTimeout(() => showResults(o.rows, reward), 1200);
}
function giveRewards(me, cfg, n) {
    const s = Z.save, mult = [1, 1.5, 2][cfg.cls] || 1;
    let gain = Math.min(30, Z.me.coinsGot);
    if (cfg.mode !== 'tt' && n > 1) gain += Math.round(([20, 15, 12, 10, 8, 6, 4, 2][me.place - 1] || 0) * mult);
    s.coins += gain; s.stats.coins += gain; s.stats.races++;
    if (me.place === 1 && n > 1) s.stats.wins++;
    if (me.place <= 3 && n > 1) s.stats.podiums++;
    const tid = cfg.tracks[Z.series.ri];
    if ((cfg.mode === 'race' || cfg.mode === 'gp' || cfg.mode === 'tt') && !me.est) {
        const b = s.best[tid] = s.best[tid] || {};
        if (!b.race || me.t < b.race) b.race = me.t;
        if (me.best && (!b.lap || me.best < b.lap)) b.lap = me.best;
    }
    writeSave(); return gain;
}
// after the last GP race: the trophy
function gpTrophy() {
    const S = Z.series, cfg = S.cfg, tot = cfg.roster.map(r => ({ r, p: S.pts[r.id] || 0 })).sort((a, b) => b.p - a.p);
    const myId = Z.me.id, place = tot.findIndex(x => x.r.id === myId) + 1;
    let bonus = 0;
    if (place <= 3) {
        const c = TRACKS.find(t => t.id === cfg.tracks[0]).cup, k = cupKey(c, cfg.cls), was = Z.save.cups[k] || 0, got = 4 - place;
        if (got > was) Z.save.cups[k] = got;
        Z.save.stats.trophies++; if (place === 1) Z.save.stats.gold++;
        bonus = [0, 150, 90, 50][place] * ([1, 1.5, 2][cfg.cls] || 1); Z.save.coins += bonus; writeSave();
    }
    return { tot, place, bonus };
}

// ---- time trial ghost ----
function ttFinish(t) {
    const id = Z.series.cfg.tracks[0], old = loadGhostData(id);
    if (!old || t < old.t) { try { localStorage.setItem('zoomghost_' + id, JSON.stringify({ t, f: Z.race.ghostRec, b: Z.save.build })); } catch (e) {} toast('New best! Ghost saved.'); }
}
function loadGhostData(id) { try { const g = JSON.parse(localStorage.getItem('zoomghost_' + id) || 'null'); return g && Array.isArray(g.f) ? g : null; } catch (e) { return null; } }
function loadGhost(id) {
    const g = loadGhostData(id); if (!g || !g.f.length) return;
    const V = makeVehicle(g.b || Z.save.build, 'Ghost ' + fmtTime(g.t), '#a5f3fc'); setGhostLook(V, true); Z.scene.add(V.root);
    Z.ghostK = { V, f: g.f };
}
function ghostPlay() {
    const G = Z.ghostK, R = Z.race; if (!R.go) { G.V.root.visible = false; return; }
    const ft = R.clock / 0.1, i = Math.floor(ft), u = ft - i, a = G.f[Math.min(i, G.f.length - 1)], b = G.f[Math.min(i + 1, G.f.length - 1)];
    G.V.root.visible = i < G.f.length;
    G.V.root.position.set(lerp(a[0], b[0], u) / 10, lerp(a[1], b[1], u) / 10, lerp(a[2], b[2], u) / 10);
    G.V.root.rotation.y = a[3] / 100 + angDiff(a[3] / 100, b[3] / 100) * u;
}

// ---- camera ----
const CAM = { x: 0, y: 0, z: 0, lx: 0, ly: 0, lz: 0, fov: 70 };
function camSnap() { const K = Z.me; if (!K) return; const [fx, fz] = kFwd(K); CAM.x = K.x - fx * 7; CAM.y = K.y + 3; CAM.z = K.z - fz * 7; CAM.lx = K.x; CAM.ly = K.y + 1; CAM.lz = K.z; }
function camUpdate(dt) {
    const K = Z.me, c = Z.cam; if (!K) return;
    const mode = Z.save.opts.cam, back = Z.keys && Z.keys.back, [fx, fz] = kFwd(K);
    const dist = [6.6, 9.5, 0.2][mode], hgt = [2.7, 4.2, 1.15][mode];
    let dx = -fx, dz = -fz;
    if (K.drift !== 0 && mode !== 2) { const a = K.drift * 0.28; const cx = Math.cos(a), sx = Math.sin(a); [dx, dz] = [dx * cx - dz * sx, dx * sx + dz * cx]; }
    if (back) { dx = -dx; dz = -dz; }
    const tx = K.x + dx * dist, ty = K.y + hgt + (K.flip > 0 ? 1 : 0), tz = K.z + dz * dist;
    const k = mode === 2 ? 1 : 1 - Math.exp(-dt * (back ? 30 : 9));
    CAM.x = lerp(CAM.x, tx, k); CAM.z = lerp(CAM.z, tz, k); CAM.y = lerp(CAM.y, ty, mode === 2 ? 1 : 1 - Math.exp(-dt * 6));
    const lk = mode === 2 ? 20 : 4, lx = K.x - dx * lk, lz = K.z - dz * lk, ly = K.y + (mode === 2 ? 1.0 : 1.2);
    const kl = 1 - Math.exp(-dt * 14); CAM.lx = lerp(CAM.lx, lx, kl); CAM.ly = lerp(CAM.ly, ly, kl); CAM.lz = lerp(CAM.lz, lz, kl);
    // keep the camera above the road when it is on a slope
    if (Z.T) { const P = trackProject(Z.T, CAM.x, CAM.y, CAM.z, K.ti); if (Math.abs(P.lat) < Z.T.hw + Z.T.off + 2 && CAM.y < P.y + 1) CAM.y = P.y + 1; }
    let sx = 0, sy = 0; if (Z.shake > 0) { Z.shake = Math.max(0, Z.shake - dt * 1.6); sx = (Math.random() - 0.5) * Z.shake; sy = (Math.random() - 0.5) * Z.shake; }
    c.position.set(CAM.x + sx, CAM.y + sy, CAM.z);
    c.lookAt(CAM.lx, CAM.ly, CAM.lz);
    const fovT = 68 + clamp(Math.abs(K.sp) / K.S.top, 0, 1.4) * 8 + (K.boost > 0 || K.rocket > 0 ? 9 : 0);
    CAM.fov = lerp(CAM.fov, fovT, 1 - Math.exp(-dt * 4)); if (Math.abs(c.fov - CAM.fov) > 0.05) { c.fov = CAM.fov; c.updateProjectionMatrix(); }
    if (Z.T.sky) Z.T.sky.position.copy(c.position);
    if (Z.T.stars) Z.T.stars.position.copy(c.position);
}
function weatherStep(dt) {
    const W = Z.T.weather, p = W.pts.geometry.attributes.position, a = p.array, c = Z.cam.position;
    for (let i = 0; i < a.length; i += 3) {
        a[i + 1] += W.dir * dt * (0.6 + (i % 7) * 0.1); a[i] += Math.sin(Z.t + i) * dt * 0.6;
        let rx = a[i] - c.x, rz = a[i + 2] - c.z, ry = a[i + 1] - c.y;
        if (rx > 60) a[i] -= 120; else if (rx < -60) a[i] += 120; if (rz > 60) a[i + 2] -= 120; else if (rz < -60) a[i + 2] += 120;
        if (ry < -10) a[i + 1] += 45; else if (ry > 35) a[i + 1] -= 45;
    }
    p.needsUpdate = true;
}
