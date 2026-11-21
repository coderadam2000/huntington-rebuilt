// ==========================================
// ZOOM: online. The shared minigame lobby (MG, HGNet) makes the room. Each screen drives its own kart and sends
// where it is 15 times a second to the host; the host drives the bots and sends everyone a snapshot of every kart.
// Items: whoever uses one sends a spawn message and every screen simulates it; a hit is decided by the screen
// that drives the kart that was hit. The host decides knockouts, the end of a race and the next race.
// ==========================================
Z.online = false; Z.seen = {}; Z.netT = 0;
const NET_GUEST_OK = { fx: 1, gone: 1, boom: 1, storm: 1, ink: 1, fin: 1 };
function netEvent(o) {
    o.eid = o.eid || ((Z.me ? Z.me.id : MG.me) + '.' + (Z.eidN = (Z.eidN || 0) + 1) + '.' + ((Math.random() * 1e6) | 0));
    Z.seen[o.eid] = 1;
    applyEvent(o);
    if (Z.online && MG.net) { if (MG.isHost()) MG.toAll(o); else MG.send('host', o); }
}
function applyEvent(o) {
    const inRace = Z.state === 'race' && Z.race;
    switch (o.k) {
        case 'fx': if (inRace) spawnFx(o); break;
        case 'gone': { const f = Z.fx.find(x => x.id === o.fid); if (f) killFx(f); break; }
        case 'boom': if (inRace) doBoom(o); break;
        case 'storm': if (inRace) doStorm(o); break;
        case 'ink': if (inRace) doInk(o); break;
        case 'fin': if (inRace) onFinMsg(o); break;
        case 'ko': if (inRace) onKoMsg(o); break;
        case 'end': if (Z.race && !Z.race.shownEnd) { Z.race.shownEnd = true; onEndMsg(o); } break;
        case 'go': uiHideAll(); startSeries(o.cfg); break;
        case 'next': uiHideAll(); startRace(o.ri); break;
        case 'left': { const K = Z.karts.find(k => k.id === o.id); if (K) { K.gone = true; K.out = true; K.outT = -1; K.V.root.visible = false; toast(K.name + ' left'); } break; }
        case 'room': if (!MG.isHost()) { clearWorld(); uiHideAll(); hudShow(false); Z.state = 'lobby'; mgShowLobby(); mgPaint(); } break;
    }
}
function onNetMsg(from, o) {
    if (!o || typeof o !== 'object' || typeof o.k !== 'string') return;
    const host = MG.isHost();
    if (o.k === 'st') { if (host && Z.state === 'race') { const K = Z.karts.find(k => k.id === from); if (K && K.ctl === 'net') netApply(K, o.s); } return; }
    if (o.k === 'S') { if (!host && Z.state === 'race' && Array.isArray(o.a)) for (const s of o.a) { const K = Z.karts.find(k => k.id === s[0]); if (K && K.ctl === 'net') netApply(K, s); } return; }
    if (o.k === 'build') { if (host && Z.pend) Z.pend.builds[from] = cleanBuild(o.b); return; }
    if (o.k === 'cfg') { if (!host) roomSummary(o); return; }
    if (host && !NET_GUEST_OK[o.k]) return;
    if (host && o.k === 'fin' && o.id !== from) return;
    if (!o.eid || Z.seen[o.eid]) return;
    Z.seen[o.eid] = 1;
    applyEvent(o);
    if (host) MG.toAll(o);
}
function cleanBuild(b) {
    b = b && typeof b === 'object' ? b : {};
    return { body: bodyById(b.body).id, wheel: wheelById(b.wheel).id, col: clamp(b.col | 0, 0, PAINTS.length - 1), suit: clamp(b.suit | 0, 0, SUITS.length - 1), decal: (DECALS.find(d => d.id === b.decal) || DECALS[0]).id };
}
// ---- kart state on the wire ----
const r2 = v => Math.round(v * 100) / 100;
function kartState(K) {
    const f = (K.drift ? 1 : 0) | (K.drift > 0 ? 2 : 0) | (K.dLevel << 2) | (K.boost > 0 ? 16 : 0) | (K.spin > 0 ? 32 : 0) | (K.flip > 0 ? 64 : 0) | (K.zap > 0 ? 128 : 0) |
        (K.shield > 0 ? 256 : 0) | (K.ghost > 0 ? 512 : 0) | (K.rocket > 0 ? 1024 : 0) | (K.out ? 2048 : 0) | (K.air ? 4096 : 0) | (K.inv > 0 ? 8192 : 0) | (K.boostLv === 3 ? 16384 : 0);
    return [K.id, r2(K.x), r2(K.y), r2(K.z), r2(K.h), r2(K.sp), r2(K.prog), K.lap, f, K.coins, K.balloons, r2(K.input.steer || 0), K.hits, r2(K.lat)];
}
function netApply(K, s) {
    if (!Array.isArray(s) || s.length < 14) return;
    const n = K.net || (K.net = {});
    n.x = +s[1]; n.y = +s[2]; n.z = +s[3]; n.h = +s[4]; n.sp = +s[5]; n.at = performance.now();
    if (!K.netInit) { K.x = n.x; K.y = n.y; K.z = n.z; K.h = n.h; K.netInit = true; }
    K.sp = n.sp; K.prog = +s[6]; K.lap = s[7] | 0; K.coins = s[9] | 0; K.balloons = s[10] | 0; K.netSteer = +s[11]; K.hits = s[12] | 0; K.lat = +s[13];
    K.ti = ((K.prog % Z.T.N) + Z.T.N) % Z.T.N;
    const f = s[8] | 0, was = K.netF || 0; K.netF = f;
    K.drift = f & 1 ? (f & 2 ? 1 : -1) : 0; K.dLevel = (f >> 2) & 3; K.boost = f & 16 ? 0.2 : 0; K.boostLv = f & 16384 ? 3 : 0;
    if (f & 32 && !(was & 32)) K.spin = 1.2; if (!(f & 32)) K.spin = 0;
    if (f & 64 && !(was & 64)) K.flip = 1.5; if (!(f & 64)) K.flip = 0;
    K.zap = f & 128 ? 1 : 0; K.shield = f & 256 ? 1 : 0; K.ghost = f & 512 ? 1 : 0; K.rocket = f & 1024 ? 1 : 0; K.air = !!(f & 4096); K.inv = f & 8192 ? 1 : 0;
    if (f & 2048 && !K.out) { K.out = true; K.outT = Z.race.clock; }
}
// draw someone else's kart smoothly between updates
function netSmooth(K, dt) {
    const n = K.net; if (!n) return;
    const age = Math.min(0.25, (performance.now() - n.at) / 1000), fx = -Math.sin(n.h), fz = -Math.cos(n.h);
    const tx = n.x + fx * n.sp * age, tz = n.z + fz * n.sp * age, ty = n.y;
    if (Math.hypot(tx - K.x, tz - K.z) > 18) { K.x = tx; K.z = tz; K.y = ty; }
    const k = 1 - Math.exp(-dt * 14); K.x = lerp(K.x, tx, k); K.z = lerp(K.z, tz, k); K.y = lerp(K.y, ty, k);
    K.h += angDiff(K.h, n.h) * k;
    if (K.spin > 0) K.spin = Math.max(0.01, K.spin - dt); if (K.flip > 0) K.flip = Math.max(0.01, K.flip - dt);
}
function netTick(dt) {
    if (!Z.online || !MG.net) return;
    Z.netT -= dt; if (Z.netT > 0) return; Z.netT = 1 / 15;
    if (MG.isHost()) MG.toAll({ k: 'S', a: Z.karts.filter(k => !k.gone).map(kartState) }, true);
    else if (Z.me) MG.send('host', { k: 'st', s: kartState(Z.me) }, true);
}
// ---- the room ----
// The host picks the mode, track or cup, speed and items in the lobby; on Start everyone sends their kart,
// then the host sends the full setup and the race begins on every screen.
Z.room = { mode: 'race', track: 'meadow', cup: 0, cls: 1, items: true };
function onlineStart(roster, seed) {
    Z.online = true; Z.seen = {};
    if (!MG.isHost()) { MG.send('host', { k: 'build', b: Z.save.build }); Z.state = 'wait'; uiWait('Starting...'); return; }
    Z.pend = { roster, seed, builds: { [MG.me]: cleanBuild(Z.save.build) }, t0: performance.now() };
    uiWait('Getting everyone\'s karts...');
    const iv = setInterval(() => {
        const P = Z.pend; if (!P) return clearInterval(iv);
        const humans = P.roster.filter(r => !r.bot), ready = humans.every(r => P.builds[r.id]);
        if (!ready && performance.now() - P.t0 < 3500) return;
        clearInterval(iv); Z.pend = null;
        const rm = Z.room, rnd = mgRng(P.seed);
        const tracks = rm.mode === 'gp' ? cupTracks(rm.cup).map(t => t.id) : [rm.track];
        const ros = P.roster.map((r, k) => r.bot ? Object.assign(makeBotEntry(r.id, k, rnd, rm.cls), { name: r.name.replace(' (bot)', '') }) : { id: r.id, name: r.name, col: r.col, build: P.builds[r.id] || cleanBuild(null), bot: false });
        netEvent({ k: 'go', cfg: { mode: rm.mode, tracks, cls: rm.cls, items: rm.items, roster: ros, online: true, seed: P.seed } });
    }, 200);
}
function onlineLeave(id) {
    if (Z.pend) { delete Z.pend.builds[id]; Z.pend.roster = Z.pend.roster.filter(r => r.id !== id); }
    if (Z.state === 'race' || Z.state === 'results') netEvent({ k: 'left', id });
}
function onlineQuit() {
    Z.online = false; Z.pend = null; clearWorld(); hudShow(false); musicStop(); uiHideAll();
    Z.state = 'menu'; mgEl('mg-lobby').classList.add('hidden'); showMenu();
}
// host: back to the room after a series (everyone goes back to the lobby)
function onlineToRoom() {
    netEvent({ k: 'room' });
    clearWorld(); hudShow(false); uiHideAll(); Z.state = 'lobby';
    MG.started = false; mgShowLobby(); mgLobbySend(true); mgAdvertise();
}
