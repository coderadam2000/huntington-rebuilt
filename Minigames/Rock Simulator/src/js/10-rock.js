// ==========================================
// ROCK SIMULATOR: you are a rock.
//   Regular: first person, from a rock's height, in a quiet clearing by a pond. You cannot move. You can look around
//   (drag, arrow keys, or a finger). Nothing else happens. That is the point.
//   Realistic: a completely black screen. Rocks do not have eyes.
// Time spent as a rock is saved (hgmini_rock = { total, best, sessions, reg, real }); a few quiet milestones show up.
// ==========================================
import * as THREE from 'three';
const RK = { mode: '', t0: 0, yaw: -0.4, pitch: 0.05, keys: {}, drag: null, last: 0, saidMove: 0, ms: 0, renderer: null, scene: null, cam: null, quietT: 0, shown: {} };
window.__rock = RK;
const $ = id => document.getElementById(id);
function rkSave() { let s = null; try { s = JSON.parse(localStorage.getItem('hgmini_rock') || 'null'); } catch (e) {} return Object.assign({ total: 0, best: 0, sessions: 0, reg: 0, real: 0 }, s && typeof s === 'object' ? s : {}); }
function rkWrite(s) { try { localStorage.setItem('hgmini_rock', JSON.stringify(s)); } catch (e) {} }
const fmt = sec => { sec = Math.floor(sec); const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60; return h ? `${h}h ${m}m` : m ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`; };
const MILESTONES = [[60, 'You feel very rock-like.'], [180, 'An ant walked past. You did not react. Good.'], [300, 'A bird considered landing on you.'], [600, 'Moss is thinking about growing on you.'],
    [900, 'You have achieved total stillness.'], [1800, 'A geologist would be proud.'], [3600, 'One hour. You are basically a boulder now.'], [7200, 'Mountains respect you.']];

document.getElementById('app').innerHTML = `<canvas id="rk-cv"></canvas>
  <div id="rk-menu"><div class="rk-card"><div style="font-size:54px">🪨</div><h1>ROCK SIMULATOR</h1><div class="rk-tag">Be a rock. That's it. That's the game.</div>
    <div class="rk-modes"><button class="rk-mode" id="rk-reg"><b>🌄 Regular</b><span>First person. Look around a peaceful clearing. You cannot move. You are a rock.</span></button>
    <button class="rk-mode black" id="rk-real"><b>⬛ Realistic</b><span>A completely black screen. Rocks do not have eyes. The true rock experience.</span></button></div>
    <div class="rk-stats" id="rk-stats"></div></div></div>
  <button id="rk-leave" class="rk-hidden">⟵ Stop being a rock</button><div id="rk-hint" class="rk-hidden"></div><div id="rk-toast"></div><div id="rk-time" class="rk-hidden"></div>`;

function paintStats() {
    const s = rkSave();
    $('rk-stats').innerHTML = s.sessions ? `Total time as a rock: <b>${fmt(s.total)}</b> · longest stretch: <b>${fmt(s.best)}</b><br>${s.sessions} time${s.sessions === 1 ? '' : 's'} a rock (${fmt(s.reg)} with eyes, ${fmt(s.real)} without)` : 'You have never been a rock. Yet.';
}
paintStats();

// ---- the world (built once, the first time you look) ----
function rnd(a, b) { return a + Math.random() * (b - a); }
function noiseH(x, z) { return Math.sin(x * .05) * Math.cos(z * .045) * 1.6 + Math.sin(x * .13 + 1.3) * Math.sin(z * .11) * .5; }
function build() {
    const R = RK.renderer = new THREE.WebGLRenderer({ canvas: $('rk-cv'), antialias: true });
    R.setPixelRatio(Math.min(2, devicePixelRatio || 1)); R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05; R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
    const S = RK.scene = new THREE.Scene();
    S.fog = new THREE.Fog(0xbfd8ea, 40, 220);
    const cam = RK.cam = new THREE.PerspectiveCamera(70, 1, .05, 600); cam.position.set(0, .44, 0);
    // sky: a gradient dome and a soft sun
    const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: { top: { value: new THREE.Color(0x3f7fd0) }, mid: { value: new THREE.Color(0x9cc6ec) }, bot: { value: new THREE.Color(0xe8eef0) } },
        vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
        fragmentShader: 'uniform vec3 top, mid, bot; varying vec3 vp; void main(){ float h = vp.y; vec3 c = h > .1 ? mix(mid, top, smoothstep(.1,.7,h)) : mix(bot, mid, smoothstep(-.05,.1,h)); gl_FragColor = vec4(c,1.); }' }));
    S.add(sky);
    const sunDir = new THREE.Vector3(-.5, .55, -.65).normalize();
    const sunSpr = new THREE.Mesh(new THREE.CircleGeometry(14, 32), new THREE.MeshBasicMaterial({ color: 0xfff6d8, fog: false }));
    sunSpr.position.copy(sunDir.clone().multiplyScalar(380)); sunSpr.lookAt(0, 0, 0); S.add(sunSpr);
    S.add(new THREE.HemisphereLight(0xcfe6ff, 0x5a7340, .75));
    const sun = new THREE.DirectionalLight(0xfff1d6, 2.1); sun.position.copy(sunDir.clone().multiplyScalar(60)); sun.castShadow = true;
    Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 140 }); sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0005; S.add(sun);
    // ground: gentle hills, a dip for the pond
    const gg = new THREE.PlaneGeometry(500, 500, 160, 160); gg.rotateX(-Math.PI / 2);
    const pos = gg.attributes.position, col = [];
    const pondC = new THREE.Vector2(9, -12);
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z);
        let y = r < 6 ? 0 : noiseH(x, z) * Math.min(1, (r - 6) / 20) + Math.max(0, r - 90) * .12;
        const pd = Math.hypot(x - pondC.x, z - pondC.y); if (pd < 9) y -= (1 - pd / 9) * 1.4;
        pos.setY(i, y);
        const g = .5 + Math.sin(x * .7) * Math.cos(z * .6) * .06 + rnd(-.04, .04);
        col.push(.26 * g + .05, .52 * g + .1, .18 * g);
    }
    gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); gg.computeVertexNormals();
    const ground = new THREE.Mesh(gg, new THREE.MeshLambertMaterial({ vertexColors: true })); ground.receiveShadow = true; S.add(ground);
    const groundY = (x, z) => { const r = Math.hypot(x, z); let y = r < 6 ? 0 : noiseH(x, z) * Math.min(1, (r - 6) / 20) + Math.max(0, r - 90) * .12; const pd = Math.hypot(x - pondC.x, z - pondC.y); if (pd < 9) y -= (1 - pd / 9) * 1.4; return y; };
    // the pond
    const water = new THREE.Mesh(new THREE.CircleGeometry(8.2, 48), new THREE.MeshPhongMaterial({ color: 0x3b7ea1, shininess: 120, specular: 0xffffff, transparent: true, opacity: .88 }));
    water.rotation.x = -Math.PI / 2; water.position.set(pondC.x, -.35, pondC.y); S.add(water);
    // grass: thousands of still blades, thicker close to you
    const blade = new THREE.PlaneGeometry(.05, .32, 1, 3); blade.translate(0, .16, 0);
    const bp = blade.attributes.position; for (let i = 0; i < bp.count; i++) { const y = bp.getY(i); bp.setX(i, bp.getX(i) * (1 - y / .34)); }
    const N = 14000, grass = new THREE.InstancedMesh(blade, new THREE.MeshLambertMaterial({ color: 0x7fbf4a, emissive: 0x1d3a12, side: THREE.DoubleSide }), N);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
    for (let i = 0; i < N; i++) {
        const r = Math.pow(Math.random(), 1.5) * 34 + 2.2, a = Math.random() * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (Math.hypot(x - pondC.x, z - pondC.y) < 8.6) { i--; continue; }
        e.set(rnd(-.25, .25), rnd(0, Math.PI), rnd(-.25, .25)); q.setFromEuler(e); const h = rnd(.45, 1.1) * Math.min(1, .5 + r / 12); sc.set(1, h, 1); p.set(x, groundY(x, z), z);
        m.compose(p, q, sc); grass.setMatrixAt(i, m); c.setHSL(.24 + rnd(-.03, .04), .55, .42 + rnd(-.06, .08)); grass.setColorAt(i, c);
    }
    S.add(grass);
    // flowers
    const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(.035, 6, 4), new THREE.MeshLambertMaterial(), 500);
    for (let i = 0; i < 500; i++) { const r = rnd(1.2, 30), a = rnd(0, 6.283), x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.hypot(x - pondC.x, z - pondC.y) < 8.6) { i--; continue; } m.makeTranslation(x, groundY(x, z) + rnd(.18, .34), z); fl.setMatrixAt(i, m); fl.setColorAt(i, c.set([0xffffff, 0xfacc15, 0xf472b6, 0xa78bfa][i % 4])); }
    S.add(fl);
    // trees: low-poly pines and round oaks
    const trunkM = new THREE.MeshLambertMaterial({ color: 0x6b4a2f }), pineM = new THREE.MeshLambertMaterial({ color: 0x2f5d34, flatShading: true }), oakM = new THREE.MeshLambertMaterial({ color: 0x4f8a3a, flatShading: true });
    for (let i = 0; i < 70; i++) {
        const r = rnd(14, 120), a = rnd(0, 6.283), x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.hypot(x - pondC.x, z - pondC.y) < 12) continue;
        const t = new THREE.Group(), s = rnd(.8, 1.6), y = groundY(x, z);
        const tr = new THREE.Mesh(new THREE.CylinderGeometry(.18 * s, .28 * s, 2.4 * s, 7), trunkM); tr.position.y = 1.2 * s; tr.castShadow = true; t.add(tr);
        if (i % 3) { for (let k = 0; k < 3; k++) { const cn = new THREE.Mesh(new THREE.ConeGeometry((2 - k * .5) * s, 2.6 * s, 8), pineM); cn.position.y = (2.4 + k * 1.3) * s; cn.castShadow = true; t.add(cn); } }
        else { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2 * s, 1), oakM); b.position.y = 3.6 * s; b.castShadow = true; t.add(b); }
        t.position.set(x, y, z); t.rotation.y = rnd(0, 6.283); S.add(t);
    }
    // other rocks (friends)
    const rockM = new THREE.MeshStandardMaterial({ color: 0x8d8a85, roughness: .95, flatShading: true });
    const rockGeo = (rad, det) => { const g = new THREE.IcosahedronGeometry(rad, det), a = g.attributes.position; for (let i = 0; i < a.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(a, i); v.multiplyScalar(1 + Math.sin(v.x * 9.1) * .08 + Math.cos(v.z * 7.3 + v.y * 5) * .08); v.y *= .7; a.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals(); return g; };
    for (let i = 0; i < 26; i++) { const r = rnd(1.5, 26), a = rnd(0, 6.283), x = Math.cos(a) * r, z = Math.sin(a) * r, s = rnd(.15, .9); const k = new THREE.Mesh(rockGeo(s, 1), rockM); k.position.set(x, groundY(x, z) + s * .25, z); k.rotation.set(rnd(0, 1), rnd(0, 6), 0); k.castShadow = k.receiveShadow = true; S.add(k); }
    // you: the top of your own rock, there when you look down
    const me = new THREE.Mesh(rockGeo(.42, 2), new THREE.MeshStandardMaterial({ color: 0x9b958c, roughness: 1, flatShading: true })); me.position.set(0, -.08, .05); me.receiveShadow = true; S.add(me);
    // mountains far away
    const mtM = new THREE.MeshLambertMaterial({ color: 0x7d93a8, flatShading: true });
    for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283 + rnd(-.1, .1), r = rnd(230, 290), h = rnd(30, 70); const mt = new THREE.Mesh(new THREE.ConeGeometry(rnd(40, 70), h, 6), mtM); mt.position.set(Math.cos(a) * r, h / 2 - 4, Math.sin(a) * r); S.add(mt); }
    // clouds: soft blobs, standing still (it is a very calm day)
    const cM = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x9aa7b5, flatShading: true, fog: false });
    for (let i = 0; i < 14; i++) { const g = new THREE.Group(), a = rnd(0, 6.283), r = rnd(120, 260); for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(rnd(6, 11), 1), cM); b.position.set(k * 9 - 18, rnd(-2, 3), rnd(-4, 4)); b.scale.y = .55; g.add(b); } g.position.set(Math.cos(a) * r, rnd(55, 90), Math.sin(a) * r); g.lookAt(0, g.position.y, 0); S.add(g); }
    addEventListener('resize', fit); fit();
}
function fit() { if (!RK.renderer) return; RK.renderer.setSize(innerWidth, innerHeight, false); RK.cam.aspect = innerWidth / innerHeight; RK.cam.updateProjectionMatrix(); }

// ---- being a rock ----
function hint(t, ms) { const h = $('rk-hint'); h.textContent = t; h.classList.remove('rk-hidden'); h.style.opacity = 1; clearTimeout(RK.ht); RK.ht = setTimeout(() => { h.style.opacity = 0; }, ms || 3500); }
function toast(t) { const e = $('rk-toast'); e.textContent = t; e.style.opacity = 1; clearTimeout(RK.tt); RK.tt = setTimeout(() => { e.style.opacity = 0; }, 4500); }
function wake() { document.body.classList.remove('rk-quiet'); RK.quietT = performance.now(); }
function start(mode) {
    RK.mode = mode; RK.t0 = performance.now(); RK.last = RK.t0; RK.shown = {}; RK.saved = 0;
    $('rk-menu').classList.add('hidden'); $('rk-leave').classList.remove('rk-hidden');
    document.body.classList.toggle('rk-black', mode === 'real');
    $('rk-time').classList.toggle('rk-hidden', mode === 'real');
    if (mode === 'reg') { if (!RK.renderer) build(); RK.yaw = -0.4; RK.pitch = .05; hint('Drag (or use the arrow keys) to look around. You cannot move. You are a rock.', 5000); }
    else hint('You are a rock. Press Esc (or move the mouse and press the button) to stop.', 3500);
    wake();
}
function leave() {
    if (!RK.mode) return;
    const sec = (performance.now() - RK.t0) / 1000, s = rkSave();
    s.total += sec; s.best = Math.max(s.best, sec); s.sessions++; s[RK.mode] = (s[RK.mode] || 0) + sec; rkWrite(s);
    RK.mode = ''; document.body.classList.remove('rk-black'); $('rk-menu').classList.remove('hidden'); $('rk-leave').classList.add('rk-hidden'); $('rk-time').classList.add('rk-hidden'); $('rk-hint').classList.add('rk-hidden');
    $('rk-toast').style.opacity = 0; paintStats();
}
addEventListener('pagehide', leave);      // closing the game from the launcher still counts your time
$('rk-reg').onclick = () => start('reg'); $('rk-real').onclick = () => start('real'); $('rk-leave').onclick = leave;
addEventListener('keydown', e => {
    if (!RK.mode) return; wake();
    if (e.key === 'Escape') { leave(); return; }
    RK.keys[e.key] = true;
    if (/^[wasdWASD ]$/.test(e.key) && performance.now() - RK.saidMove > 4000) { RK.saidMove = performance.now(); hint(['Rocks do not move.', 'You try to move. You are a rock. Nothing happens.', 'Still a rock.', 'Rocks cannot jump either.'][Math.floor(Math.random() * 4)], 2500); }
});
addEventListener('keyup', e => { RK.keys[e.key] = false; });
const cv = $('rk-cv');
cv.addEventListener('pointerdown', e => { if (RK.mode !== 'reg') return; RK.drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', e => { if (!RK.drag) return; RK.yaw += (e.clientX - RK.drag.x) * .004; RK.pitch = Math.max(-1.35, Math.min(1.35, RK.pitch + (e.clientY - RK.drag.y) * .004)); RK.drag = { x: e.clientX, y: e.clientY }; });
cv.addEventListener('pointerup', () => { RK.drag = null; });
addEventListener('pointermove', () => { if (RK.mode) wake(); });

function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - (RK.last || now)) / 1000); RK.last = now;
    if (!RK.mode) return;
    const sec = (now - RK.t0) / 1000;
    if (now - RK.quietT > 4000) document.body.classList.add('rk-quiet');
    for (const [t, msg] of MILESTONES) if (sec >= t && !RK.shown[t]) { RK.shown[t] = 1; if (RK.mode === 'reg') toast(msg); }
    if (RK.mode !== 'reg') return;
    $('rk-time').textContent = 'a rock for ' + fmt(sec);
    const k = RK.keys, sp = 1.4 * dt;
    if (k.ArrowLeft) RK.yaw -= sp; if (k.ArrowRight) RK.yaw += sp; if (k.ArrowUp) RK.pitch = Math.min(1.35, RK.pitch + sp); if (k.ArrowDown) RK.pitch = Math.max(-1.35, RK.pitch - sp);
    RK.cam.rotation.set(0, 0, 0); RK.cam.rotation.order = 'YXZ'; RK.cam.rotation.y = -RK.yaw; RK.cam.rotation.x = RK.pitch;
    RK.renderer.render(RK.scene, RK.cam);
}
requestAnimationFrame(loop);
// tests
RK.start = start; RK.leave = leave; RK.save = rkSave;
