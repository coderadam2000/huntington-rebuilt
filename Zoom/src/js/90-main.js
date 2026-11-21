// ==========================================
// ZOOM: start-up. The renderer, the loop, the lobby hook-up, and a debug handle for tests (window.__zoom).
// ==========================================
Z.scene = new THREE.Scene();
Z.cam = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.3, 1300);
Z.ren = new THREE.WebGLRenderer({ antialias: Z.save.opts.gfx > 0, powerPreference: 'high-performance' });
Z.ren.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(Z.ren.domElement); Z.ren.domElement.id = 'zm-gl';
function applyGfx() { Z.ren.setPixelRatio(Math.min(devicePixelRatio || 1, Z.save.opts.gfx > 0 ? 1.5 : 0.85)); Z.ren.setSize(innerWidth, innerHeight); }
function onResize() { Z.cam.aspect = innerWidth / innerHeight; UI.viewOff = -1; Z.cam.clearViewOffset(); Z.cam.updateProjectionMatrix(); applyGfx(); }
addEventListener('resize', onResize); applyGfx();

MG.init({
    id: 'zoom', title: 'Zoom', color: '#f97316', min: 1, max: 8, bots: 7, defBots: 3, solo: false,
    sub: 'Race your friends: open a room and share the code.',
    howto: 'The host picks the mode, track and speed below. Bots fill the empty spots.',
    onStart: (roster, seed) => onlineStart(roster, seed),
    onMsg: (from, d) => onNetMsg(from, d),
    onLeave: id => onlineLeave(id),
    onQuit: () => onlineQuit()
});
mgEl('mg-lobby').classList.add('hidden');
// the launcher opens a room or joins one straight away: go online first
const mgJoinHook = window.__hgJoin, mgHostHook = window.__hgHost;
window.__hgJoin = c => { showOnline(); return mgJoinHook(c); };
window.__hgHost = id => { showOnline(); return mgHostHook(id); };

let lastT = performance.now();
function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now; Z.t += dt;
    try {
        const p0 = performance.now();
        if (Z.state === 'race' || Z.state === 'results') { if (Z.state === 'race') raceTick(dt); else { psStep(Z.sparks, dt); camUpdate(dt); for (const K of Z.karts) kartVisual(K, dt); } }
        else showcaseTick(dt);
        if (Z.T && Z.T.boxes && Z.state !== 'race') for (const b of Z.T.boxes) b.m.rotation.y += dt;
        const p1 = performance.now(); Z.ren.render(Z.scene, Z.cam);
        Z.perf = { tick: p1 - p0, draw: performance.now() - p1, calls: Z.ren.info.render.calls };
    } catch (e) { console.error(e); if (!Z.errShown) { Z.errShown = true; toast('Something went wrong: ' + e.message); } }
}
showMenu();
requestAnimationFrame(frame);
// tests: window.__zoom.quick('meadow', 'race', 3) starts a solo race straight away
Z.quick = (track, mode, bots, cls) => { UI.pick = { mode: mode || 'race', cup: 0, track: track || 'meadow', cls: cls == null ? 1 : cls, bots: bots == null ? 3 : bots, items: true }; pickGo(); };
// tests: run the race simulation n steps without drawing
Z.sim = n => { for (let i = 0; i < n && Z.state === 'race'; i++) raceStep(1 / 60); };
Z.api = { botInit, TRACKS, ITEMS, BODIES, sampleTrack, trackProject, useItem, hitKart, endRace, startRace, showResults, MG };
