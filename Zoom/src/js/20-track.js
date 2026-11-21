// ==========================================
// ZOOM: a track, built from its points: the sampled centre line (for physics, bots and items) and the 3D world
// (road, curbs, walls or drops, shoulders, item boxes, boost pads, ramps, coins, scenery, sky).
// ==========================================
const Z = { scene: null, cam: null, ren: null, T: null, karts: [], me: null, fx: [], t: 0, state: 'menu', paused: false };
window.__zoom = Z;

function canvasTex(w, h, draw, rep) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    return t;
}
const TEX = {};
function roadTex(th) {
    return canvasTex(128, 256, (g, w, h) => {
        g.fillStyle = th.road; g.fillRect(0, 0, w, h);
        const rnd = mgRng(7);
        for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${0.03 + rnd() * 0.05})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
        g.fillStyle = th.line; g.globalAlpha = 0.85; g.fillRect(w / 2 - 2, 0, 4, h * 0.5); g.globalAlpha = 0.5;
        g.fillRect(3, 0, 3, h); g.fillRect(w - 6, 0, 3, h); g.globalAlpha = 1;
    }, true);
}
function curbTex(th) { return canvasTex(16, 64, (g, w, h) => { g.fillStyle = th.curb[0]; g.fillRect(0, 0, w, h / 2); g.fillStyle = th.curb[1]; g.fillRect(0, h / 2, w, h / 2); }, true); }
function checkerTex(n) { return canvasTex(128, 32, (g, w, h) => { const s = w / n; for (let x = 0; x < n; x++) for (let y = 0; y < h / s; y++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * s, y * s, s, s); } }, true); }
function boxTex() {
    return canvasTex(64, 64, (g, w, h) => {
        const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#f472b6'); gr.addColorStop(0.5, '#facc15'); gr.addColorStop(1, '#22d3ee');
        g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(4, 4, w - 8, h - 8);
        g.fillStyle = '#fff'; g.font = '900 44px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeStyle = '#7c3aed'; g.lineWidth = 4; g.strokeText('?', w / 2, h / 2 + 2); g.fillText('?', w / 2, h / 2 + 2);
    });
}
function padTex() {
    return canvasTex(64, 128, (g, w, h) => {
        g.fillStyle = 'rgba(255,140,0,.25)'; g.fillRect(0, 0, w, h);
        for (let k = 0; k < 3; k++) { const y = 18 + k * 40; g.fillStyle = k === 1 ? '#fde047' : '#fb923c'; g.beginPath(); g.moveTo(6, y + 24); g.lineTo(w / 2, y); g.lineTo(w - 6, y + 24); g.lineTo(w - 6, y + 34); g.lineTo(w / 2, y + 12); g.lineTo(6, y + 34); g.fill(); }
    }, true);
}
function dotTex() { return canvasTex(32, 32, (g, w) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }); }

// ---- the centre line ----
function sampleTrack(def) {
    const pts = def.pts.map(p => new THREE.Vector3(p[0], p[2] || 0, p[1]));
    const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
    const len = curve.getLength(), N = Math.max(240, Math.round(len / 2)), step = len / N;
    const px = new Float32Array(N), py = new Float32Array(N), pz = new Float32Array(N), tx = new Float32Array(N), tz = new Float32Array(N);
    const v = new THREE.Vector3();
    for (let i = 0; i < N; i++) { curve.getPointAt(i / N, v); px[i] = v.x; py[i] = v.y; pz[i] = v.z; }
    for (let i = 0; i < N; i++) { const j = (i + 1) % N, k = (i - 1 + N) % N; let dx = px[j] - px[k], dz = pz[j] - pz[k]; const l = Math.hypot(dx, dz) || 1; tx[i] = dx / l; tz[i] = dz / l; }
    let minY = 1e9, maxY = -1e9, x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (let i = 0; i < N; i++) { minY = Math.min(minY, py[i]); maxY = Math.max(maxY, py[i]); x0 = Math.min(x0, px[i]); x1 = Math.max(x1, px[i]); z0 = Math.min(z0, pz[i]); z1 = Math.max(z1, pz[i]); }
    const T = { def, th: THEMES[def.theme], N, len, step, px, py, pz, tx, tz, hw: def.w / 2, off: def.off, edge: def.edge, minY, maxY, box: [x0, x1, z0, z1], laps: def.laps };
    T.idx = f => ((Math.round(f * N) % N) + N) % N;
    // curvature: heading change per metre around each sample (bots use it to brake and drift)
    T.curv = new Float32Array(N);
    for (let i = 0; i < N; i++) { const j = (i + 3) % N, k = (i - 3 + N) % N; T.curv[i] = angDiff(Math.atan2(tx[k], tz[k]), Math.atan2(tx[j], tz[j])) / (6 * step); }
    T.ground = T.th.ground ? minY - (T.th.lava ? 3.5 : 0.35) : null;
    return T;
}
// where a point is on the track: P.i (float index), lat (+ = right), y (road height), tangent/right at that spot
const PROJ = { i: 0, j: 0, lat: 0, y: 0, tx: 0, tz: 1, rx: 0, rz: 0, d: 0 };
function trackProject(T, x, y, z, hint) {
    const N = T.N, px = T.px, py = T.py, pz = T.pz;
    let best = -1, bd = 1e18;
    const score = i => { const dx = x - px[i], dz = z - pz[i], dy = y - py[i]; return dx * dx + dz * dz + (dy > 4 || dy < -4 ? dy * dy * 6 : 0); };
    if (hint >= 0) for (let k = -12; k <= 26; k++) { const i = ((hint | 0) + k + N) % N, d = score(i); if (d < bd) { bd = d; best = i; } }
    const far = T.hw + T.off + 10;
    if (best < 0 || bd > far * far) { for (let i = 0; i < N; i++) { const d = score(i); if (d < bd) { bd = d; best = i; } } }
    // refine on the segment before or after the nearest sample
    let a = best, b = (best + 1) % N;
    const ux = px[b] - px[a], uz = pz[b] - pz[a], ul = ux * ux + uz * uz || 1;
    let u = ((x - px[a]) * ux + (z - pz[a]) * uz) / ul;
    if (u < 0) { b = a; a = (a - 1 + N) % N; const vx = px[b] - px[a], vz = pz[b] - pz[a]; u = ((x - px[a]) * vx + (z - pz[a]) * vz) / (vx * vx + vz * vz || 1); }
    u = clamp(u, 0, 1);
    const cx = lerp(px[a], px[b], u), cz = lerp(pz[a], pz[b], u);
    let ttx = lerp(T.tx[a], T.tx[b], u), ttz = lerp(T.tz[a], T.tz[b], u); const tl = Math.hypot(ttx, ttz) || 1; ttx /= tl; ttz /= tl;
    PROJ.i = a + u; PROJ.j = a; PROJ.tx = ttx; PROJ.tz = ttz; PROJ.rx = -ttz; PROJ.rz = ttx;
    PROJ.lat = (x - cx) * PROJ.rx + (z - cz) * PROJ.rz; PROJ.y = lerp(py[a], py[b], u); PROJ.d = Math.hypot(x - cx, z - cz);
    return PROJ;
}
// a point on the track at index i (float) and lateral offset lat
function trackPoint(T, i, lat, out) {
    const N = T.N; i = ((i % N) + N) % N; const a = Math.floor(i) % N, b = (a + 1) % N, u = i - Math.floor(i);
    const tx = lerp(T.tx[a], T.tx[b], u), tz = lerp(T.tz[a], T.tz[b], u), l = Math.hypot(tx, tz) || 1;
    out = out || {}; out.x = lerp(T.px[a], T.px[b], u) + (-tz / l) * lat; out.z = lerp(T.pz[a], T.pz[b], u) + (tx / l) * lat; out.y = lerp(T.py[a], T.py[b], u);
    out.h = Math.atan2(-tx / l, -tz / l); return out;
}
// heading (yaw) that faces along the track at sample i: forward = (-sin h, -cos h)
const trackYaw = (T, i) => { const a = ((Math.round(i) % T.N) + T.N) % T.N; return Math.atan2(-T.tx[a], -T.tz[a]); };

// ---- the 3D world ----
function ribbon(T, fa, fb, mat, vLen, close) {
    const N = T.N, pos = new Float32Array((N + 1) * 2 * 3), uv = new Float32Array((N + 1) * 2 * 2), idx = [];
    const A = {}, B = {}; let dist = 0, lx = 0, lz = 0;
    for (let k = 0; k <= N; k++) {
        const i = k % N; fa(i, A); fb(i, B);
        if (k > 0) dist += Math.hypot(T.px[i] - lx, T.pz[i] - lz); lx = T.px[i]; lz = T.pz[i];
        pos.set([A.x, A.y, A.z, B.x, B.y, B.z], k * 6); uv.set([0, dist / vLen, 1, dist / vLen], k * 4);
        if (k < N) { const o = k * 2; idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); return m;
}
function edgeAt(T, i, lat, dy, o) { o.x = T.px[i] - T.tz[i] * lat; o.z = T.pz[i] + T.tx[i] * lat; o.y = T.py[i] + dy; return o; }
function lambert(col, extra) { return new THREE.MeshLambertMaterial(Object.assign({ color: col }, extra || {})); }

function buildWorld(T, low) {
    const th = T.th, G = new THREE.Group(), hw = T.hw, ow = hw + T.off;
    // sky dome and fog
    const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: { top: { value: new THREE.Color(th.sky[0]) }, bot: { value: new THREE.Color(th.sky[1]) } },
        vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying vec3 vp; void main(){ float h = clamp(vp.y*1.4+0.25,0.0,1.0); gl_FragColor = vec4(mix(bot, top, h),1.0); }' });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(950, 24, 12), skyMat); sky.renderOrder = -1; sky.frustumCulled = false; G.add(sky); T.sky = sky;
    Z.scene.fog = new THREE.Fog(th.fog, th.fogN, th.fogF);
    const hemi = new THREE.HemisphereLight(th.sky[1], th.ground || th.skirt || '#222', 0.95 * th.sun); G.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.25 * th.sun); sun.position.set(120, 260, 80); G.add(sun);
    // road, curbs, shoulders, walls/skirts
    const A = {}, B = {};
    const roadMat = lambert('#ffffff', { map: roadTex(th), side: th.neon && !th.ground ? THREE.DoubleSide : THREE.FrontSide });
    G.add(ribbon(T, (i, o) => edgeAt(T, i, -hw, 0, o), (i, o) => edgeAt(T, i, hw, 0, o), roadMat, 16));
    const curbMat = lambert('#ffffff', { map: curbTex(th), emissive: th.neon ? '#ffffff' : '#000000', emissiveMap: th.neon ? curbTex(th) : null, emissiveIntensity: th.neon ? 0.7 : 0 });
    for (const s of [-1, 1]) {
        G.add(ribbon(T, (i, o) => edgeAt(T, i, s * hw, 0.03, o), (i, o) => edgeAt(T, i, s * (hw + 0.9), 0.03, o), curbMat, 4));
        const shMat = lambert(th.shoulder, { side: THREE.DoubleSide });
        G.add(ribbon(T, (i, o) => edgeAt(T, i, s * (hw + 0.9), -0.04, o), (i, o) => edgeAt(T, i, s * ow, -0.06, o), shMat, 8));
        if (T.edge === 'wall') {
            const wm = th.neon ? new THREE.MeshBasicMaterial({ color: th.wall, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }) : lambert(th.wall, { side: THREE.DoubleSide });
            G.add(ribbon(T, (i, o) => edgeAt(T, i, s * ow, -0.1, o), (i, o) => edgeAt(T, i, s * ow, 1.1, o), wm, 4));
            if (!th.neon) G.add(ribbon(T, (i, o) => edgeAt(T, i, s * ow, 1.1, o), (i, o) => edgeAt(T, i, s * (ow + 0.4), 1.1, o), lambert('#e5e7eb', { side: THREE.DoubleSide }), 4));
        } else if (th.neon) {
            G.add(ribbon(T, (i, o) => edgeAt(T, i, s * ow, -0.05, o), (i, o) => edgeAt(T, i, s * ow, 0.35, o), new THREE.MeshBasicMaterial({ color: th.wall, side: THREE.DoubleSide }), 4));
        }
        // skirts: the earth under a raised road (none on bridge themes, where pillars hold the road up)
        if (th.skirt && !th.bridge) {
            const down = T.ground != null ? (i => T.ground - 0.6) : (i => T.py[i] - 7);
            G.add(ribbon(T, (i, o) => edgeAt(T, i, s * (ow + (T.edge === 'wall' ? 0.4 : 0)), -0.06, o), (i, o) => { edgeAt(T, i, s * (ow + 3), 0, o); o.y = down(i); return o; }, lambert(th.skirt, { side: THREE.DoubleSide }), 8));
        }
    }
    if (th.skirt && !th.bridge && T.ground == null) G.add(ribbon(T, (i, o) => { edgeAt(T, i, -ow - 3, 0, o); o.y = T.py[i] - 7; return o; }, (i, o) => { edgeAt(T, i, ow + 3, 0, o); o.y = T.py[i] - 7; return o; }, lambert(th.skirt, { side: THREE.DoubleSide }), 8));
    // ground, water, lava
    const cx = (T.box[0] + T.box[1]) / 2, cz = (T.box[2] + T.box[3]) / 2, rad = Math.hypot(T.box[1] - T.box[0], T.box[3] - T.box[2]) / 2 + 70;
    if (T.ground != null) {
        if (th.lava) {
            const lm = new THREE.MeshBasicMaterial({ color: th.ground }); const lava = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), lm); lava.rotation.x = -Math.PI / 2; lava.position.set(cx, T.ground, cz); G.add(lava); T.lava = lava;
            const cone = new THREE.Mesh(new THREE.ConeGeometry(70, 90, 18, 1, true), lambert('#3b2525')); cone.position.set(cx, T.ground + 40, cz); G.add(cone);
            const glow = new THREE.Mesh(new THREE.CircleGeometry(16, 16), new THREE.MeshBasicMaterial({ color: '#ffb020' })); glow.rotation.x = -Math.PI / 2; glow.position.set(cx, T.ground + 84, cz); G.add(glow);
        } else {
            const gm = lambert(th.ground);
            const gnd = th.water ? new THREE.Mesh(new THREE.CircleGeometry(rad, 48), gm) : new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), gm);
            gnd.rotation.x = -Math.PI / 2; gnd.position.set(cx, T.ground, cz); G.add(gnd);
            if (th.water) { const w = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshLambertMaterial({ color: th.water, transparent: true, opacity: 0.92 })); w.rotation.x = -Math.PI / 2; w.position.set(cx, T.ground - 0.25, cz); G.add(w); T.water = w; }
        }
    }
    // bridge pillars
    if (th.bridge && T.ground != null) {
        const list = []; for (let i = 0; i < T.N; i += 7) if (T.py[i] - T.ground > 2) list.push(i);
        const pg = new THREE.CylinderGeometry(0.8, 1.1, 1, 8), pm = lambert(th.skirt || '#444'), im = new THREE.InstancedMesh(pg, pm, list.length * 2), m4 = new THREE.Matrix4();
        list.forEach((i, k) => { const h = T.py[i] - T.ground; for (const s of [-1, 1]) { m4.compose(new THREE.Vector3(T.px[i] - T.tz[i] * s * hw * 0.7, T.ground + h / 2, T.pz[i] + T.tx[i] * s * hw * 0.7), new THREE.Quaternion(), new THREE.Vector3(1, h, 1)); im.setMatrixAt(k * 2 + (s > 0), m4); } });
        G.add(im);
        // the deck under a raised road
        G.add(ribbon(T, (i, o) => edgeAt(T, i, -ow, -0.5, o), (i, o) => edgeAt(T, i, ow, -0.5, o), lambert(th.skirt, { side: THREE.DoubleSide }), 8));
    }
    // finish line and arch
    {
        const i = 0, fl = new THREE.Mesh(new THREE.PlaneGeometry(T.def.w, 2.4), new THREE.MeshLambertMaterial({ map: checkerTex(16) }));
        fl.rotation.x = -Math.PI / 2; fl.rotation.z = trackYaw(T, 0); fl.position.set(T.px[0], T.py[0] + 0.04, T.pz[0]); G.add(fl);
        const arch = new THREE.Group(), pm = lambert('#e5e7eb');
        for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.8, 7, 0.8), pm); p.position.set(s * (ow + 0.6), 3.5, 0); arch.add(p); }
        const ban = new THREE.Mesh(new THREE.BoxGeometry(2 * ow + 2, 1.6, 0.5), new THREE.MeshLambertMaterial({ map: checkerTex(24) })); ban.position.y = 7; arch.add(ban);
        arch.position.set(T.px[0], T.py[0], T.pz[0]); arch.rotation.y = trackYaw(T, 0); G.add(arch);
    }
    // boost pads
    TEX.pad = TEX.pad || padTex(); T.pads = [];
    for (const [f, l] of T.def.pads) {
        const i = T.idx(f), lat = l * hw * 0.6, p = trackPoint(T, i, lat), m = new THREE.Mesh(new THREE.PlaneGeometry(4, 6), new THREE.MeshBasicMaterial({ map: TEX.pad, transparent: true, depthWrite: false }));
        m.rotation.order = 'YXZ'; m.rotation.y = p.h; m.rotation.x = -Math.PI / 2; m.position.set(p.x, p.y + 0.06, p.z); G.add(m); T.pads.push({ i, lat });
    }
    // ramps (a launch strip across the middle of the road)
    T.ramps = [];
    for (const [f, l] of T.def.ramps) {
        const i = T.idx(f), lat = l * hw * 0.5, p = trackPoint(T, i, lat), w = Math.min(T.def.w - 4, 11);
        const g = new THREE.Group(), wedge = new THREE.Mesh(new THREE.BoxGeometry(w, 0.25, 5), lambert('#f59e0b')); wedge.rotation.x = 0.16; wedge.position.y = 0.4; g.add(wedge);
        const st = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 1), lambert('#111827')); st.position.set(0, 0.8, -2.4); st.rotation.x = 0.16; g.add(st);
        g.position.set(p.x, p.y, p.z); g.rotation.y = p.h; G.add(g); T.ramps.push({ i, lat, w });
    }
    // item boxes
    TEX.box = TEX.box || boxTex(); T.boxes = [];
    const bg = new THREE.BoxGeometry(1.6, 1.6, 1.6), bm = new THREE.MeshBasicMaterial({ map: TEX.box, transparent: true, opacity: 0.9 });
    for (const f of T.def.boxes) {
        const i = T.idx(f);
        for (const l of [-0.6, -0.2, 0.2, 0.6]) { const p = trackPoint(T, i, l * hw); const m = new THREE.Mesh(bg, bm); m.position.set(p.x, p.y + 1.3, p.z); G.add(m); T.boxes.push({ x: p.x, y: p.y + 1.3, z: p.z, i, m, t: 0 }); }
    }
    // coins: short lines of 5
    T.coins = [];
    const cg = new THREE.CylinderGeometry(0.55, 0.55, 0.14, 14), cm = lambert('#facc15', { emissive: '#a16207', emissiveIntensity: 0.6 });
    const nC = T.def.coins.length * 5, ci = new THREE.InstancedMesh(cg, cm, nC); let ck = 0;
    T.def.coins.forEach((f, g) => { const lat = [-0.45, 0, 0.45][g % 3] * hw; for (let k = 0; k < 5; k++) { const p = trackPoint(T, T.idx(f) + k * 3, lat); T.coins.push({ x: p.x, y: p.y + 1, z: p.z, k: ck++, t: 0 }); } });
    T.coinMesh = ci; G.add(ci);
    // scenery
    buildScenery(T, G, low);
    // weather (snow, bubbles, embers) and stars
    if (th.snow || th.bubbles || th.embers) {
        const n = low ? 220 : 520, pos = new Float32Array(n * 3), rnd = mgRng(3);
        for (let k = 0; k < n; k++) pos.set([rnd() * 120 - 60, rnd() * 50, rnd() * 120 - 60], k * 3);
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const col = th.snow ? '#ffffff' : th.bubbles ? '#bae6fd' : '#fb923c';
        const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: col, size: th.snow ? 0.35 : 0.3, map: TEX.dot = TEX.dot || dotTex(), transparent: true, depthWrite: false, blending: th.embers ? THREE.AdditiveBlending : THREE.NormalBlending }));
        pts.frustumCulled = false; G.add(pts); T.weather = { pts, dir: th.snow ? -3 : th.bubbles ? 2 : 3 };
    }
    if (th.stars) {
        const n = 1400, pos = new Float32Array(n * 3), rnd = mgRng(5);
        for (let k = 0; k < n; k++) { const a = rnd() * TAU, b = Math.acos(rnd() * 2 - 1), r = 800; pos.set([Math.sin(b) * Math.cos(a) * r, Math.cos(b) * r, Math.sin(b) * Math.sin(a) * r], k * 3); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const s = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, fog: false })); s.frustumCulled = false; G.add(s); T.stars = s;
    }
    return G;
}
// distance from a point to the road (coarse; for placing scenery)
function nearRoad(T, x, z) { let b = 1e18; for (let i = 0; i < T.N; i += 3) { const dx = x - T.px[i], dz = z - T.pz[i], d = dx * dx + dz * dz; if (d < b) b = d; } return Math.sqrt(b); }
// scenery kinds: parts [geometry, colour, offset y, emissive?] and a scale range
const SCEN = (() => {
    const cyl = (r1, r2, h, s) => new THREE.CylinderGeometry(r1, r2, h, s || 7), cone = (r, h, s) => new THREE.ConeGeometry(r, h, s || 7), ball = (r, d) => new THREE.IcosahedronGeometry(r, d || 1), box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
    return {
        tree: { parts: [[cyl(0.35, 0.5, 3), '#7c4a2a', 1.5], [ball(2.4, 1), '#2f9e44', 4.4]], s: [0.8, 1.6] },
        bush: { parts: [[ball(1.2, 1), '#3c9a3a', 0.6]], s: [0.7, 1.4] },
        flower: { parts: [[ball(0.35, 0), '#f472b6', 0.3]], s: [0.7, 1.3], cols: ['#f472b6', '#facc15', '#f8fafc', '#a78bfa'] },
        rock: { parts: [[ball(1.4, 0), '#8b8f98', 0.5]], s: [0.6, 2] },
        palm: { parts: [[cyl(0.25, 0.4, 7), '#a0703c', 3.5], [cone(3, 1.2, 6), '#16a34a', 7.2]], s: [0.8, 1.3] },
        umbrella: { parts: [[cyl(0.06, 0.06, 2.6), '#f8fafc', 1.3], [cone(1.8, 0.7, 8), '#ef4444', 2.7]], s: [0.9, 1.1], cols: ['#ef4444', '#f59e0b', '#3b82f6', '#ec4899'] },
        pine: { parts: [[cyl(0.3, 0.4, 2), '#6b4423', 1], [cone(2.2, 5, 7), '#1f6f3a', 4.2], [cone(1.5, 3.4, 7), '#24804a', 6.4]], s: [0.8, 1.7] },
        log: { parts: [[box(4, 0.8, 0.8), '#7c4a2a', 0.4]], s: [0.8, 1.2] },
        building: { parts: [[box(10, 1, 10), '#1e293b', 0.5]], s: [1, 1], tall: true },
        lamp: { parts: [[cyl(0.12, 0.15, 6), '#94a3b8', 3], [ball(0.5, 1), '#fde68a', 6.2, true]], s: [1, 1], near: true },
        cactus: { parts: [[cyl(0.5, 0.6, 4.5), '#3f8f3a', 2.25], [box(1.8, 0.5, 0.5), '#3f8f3a', 2.6]], s: [0.7, 1.4] },
        mesa: { parts: [[cyl(9, 12, 14, 8), '#b45309', 7]], s: [0.6, 1.8], far: true },
        snowpine: { parts: [[cyl(0.3, 0.4, 2), '#6b4423', 1], [cone(2.2, 5, 7), '#1f5f3a', 4.2], [cone(1.3, 2.4, 7), '#f8fafc', 6.2]], s: [0.8, 1.7] },
        icerock: { parts: [[ball(1.5, 0), '#bfdbfe', 0.6]], s: [0.6, 1.8] },
        snowman: { parts: [[ball(1, 1), '#ffffff', 0.9], [ball(0.65, 1), '#ffffff', 2.2], [cone(0.15, 0.6, 5), '#f97316', 2.3]], s: [0.9, 1.2] },
        gear: { parts: [[cyl(5, 5, 1.2, 12), '#9ca3af', 5]], s: [0.6, 1.4], spin: true },
        stack: { parts: [[cyl(2, 2.6, 26, 10), '#78716c', 13], [cyl(2.1, 2.1, 1.5, 10), '#ef4444', 24]], s: [0.7, 1.2], far: true },
        crate: { parts: [[box(2.2, 2.2, 2.2), '#b7791f', 1.1]], s: [0.8, 1.3] },
        pipe: { parts: [[cyl(0.9, 0.9, 14, 10), '#64748b', 0.9]], s: [1, 1], lay: true },
        coral: { parts: [[cyl(0.4, 0.8, 3, 6), '#f472b6', 1.5], [ball(1.1, 1), '#fb7185', 3]], s: [0.7, 1.6], cols: ['#f472b6', '#fb923c', '#a78bfa', '#facc15'] },
        kelp: { parts: [[cyl(0.15, 0.3, 9, 5), '#16a34a', 4.5]], s: [0.7, 1.4] },
        shell: { parts: [[cone(0.9, 1.2, 9), '#fde68a', 0.6]], s: [0.7, 1.3] },
        darkrock: { parts: [[ball(2.2, 0), '#292524', 1]], s: [0.6, 2.2] },
        ember: { parts: [[ball(0.6, 0), '#f97316', 0.3, true]], s: [0.6, 1.4] },
        cloud: { parts: [[ball(5, 1), '#ffffff', 0, 'soft'], [ball(3.6, 1), '#ffffff', 1.2, 'soft']], s: [0.8, 2.4], air: true },
        island: { parts: [[cone(9, 14, 8).rotateX(Math.PI), '#a16207', -7], [cyl(9, 9, 1.2, 8), '#4ade80', 0.6], [ball(2.4, 1), '#22c55e', 3.5]], s: [0.6, 1.4], air: true, flip: true },
        deadtree: { parts: [[cyl(0.3, 0.5, 6, 5), '#3f3a4a', 3], [box(3, 0.3, 0.3), '#3f3a4a', 4.5]], s: [0.8, 1.5] },
        grave: { parts: [[box(1.2, 1.6, 0.35), '#6b7280', 0.8]], s: [0.8, 1.2] },
        pumpkin: { parts: [[ball(0.8, 1), '#f97316', 0.6, true]], s: [0.7, 1.5] },
        asteroid: { parts: [[ball(3, 0), '#6b7280', 0]], s: [0.5, 3], air: true },
        planet: { parts: [[ball(40, 2), '#a78bfa', 0]], s: [0.6, 1.6], air: true, far: true, cols: ['#a78bfa', '#fb923c', '#38bdf8', '#f472b6'] }
    };
})();
function buildScenery(T, G, low) {
    const th = T.th, rnd = mgRng(T.N * 13 + 7), kinds = th.scen, per = low ? 26 : 60;
    const cx = (T.box[0] + T.box[1]) / 2, cz = (T.box[2] + T.box[3]) / 2, sx = (T.box[1] - T.box[0]) / 2 + 90, sz = (T.box[3] - T.box[2]) / 2 + 90;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
    const clear = T.hw + T.off + 4;
    T.spin = [];
    for (const kind of new Set(kinds)) {
        const K = SCEN[kind], want = per * kinds.filter(k => k === kind).length * (K.far ? 0.25 : K.tall ? 1.3 : 1), spots = [];
        for (let tries = 0; spots.length < want && tries < want * 14; tries++) {
            let x, z, y;
            if (K.near) { const i = Math.floor(rnd() * T.N), s = rnd() < 0.5 ? -1 : 1, p = trackPoint(T, i, s * (T.hw + T.off + 2.5)); x = p.x; z = p.z; y = T.ground != null ? T.ground : p.y; }
            else { x = cx + (rnd() * 2 - 1) * (K.far ? sx * 2 : sx); z = cz + (rnd() * 2 - 1) * (K.far ? sz * 2 : sz); const d = nearRoad(T, x, z); if (d < clear + (K.tall ? 6 : 0) || (K.far && d < 120)) continue; if (K.tall && d > 70) continue; y = T.ground != null ? T.ground : 0; }
            if (K.air) { const nr = nearRoad(T, x, z); y = T.minY + (K.far ? 60 + rnd() * 200 : (rnd() * 2 - 1) * 30 - (nr < 40 ? 25 : 0)); }
            spots.push([x, y, z, K.s[0] + rnd() * (K.s[1] - K.s[0]), rnd() * TAU, K.tall ? 10 + rnd() * 40 : 1, Math.floor(rnd() * 4)]);
        }
        K.parts.forEach(([geo, c, oy, glow], pi) => {
            const mat = glow === 'soft' ? lambert(c, { emissive: '#ffffff', emissiveIntensity: 0.55 }) : glow ? new THREE.MeshBasicMaterial({ color: c }) : lambert(K.cols ? '#ffffff' : c, kind === 'building' ? { emissive: '#000000' } : null);
            const im = new THREE.InstancedMesh(geo, mat, spots.length);
            spots.forEach(([x, y, z, s, r, tall, ci], k) => {
                e.set(K.lay ? Math.PI / 2 : 0, r, 0); q.setFromEuler(e);
                if (K.tall) { sc.set(1 + (ci % 2) * 0.4, tall, 1 + ((ci >> 1) % 2) * 0.4); v.set(x, y + tall / 2, z); }
                else { sc.set(s, s, s); v.set(x, y + oy * s, z); }
                m4.compose(v, q, sc); im.setMatrixAt(k, m4);
                if (K.cols) im.setColorAt(k, col.set(K.cols[ci % K.cols.length]));
                if (kind === 'building') im.setColorAt(k, col.set(['#1e293b', '#312e81', '#3b0764', '#0f766e'][ci]));
            });
            if (kind === 'building') { mat.map = windowTex(); mat.emissiveMap = mat.map; mat.emissive.set('#ffffff'); mat.emissiveIntensity = 0.55; }
            G.add(im); if (K.spin) T.spin.push(im);
        });
    }
}
function windowTex() { return TEX.win = TEX.win || canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#334155'; g.fillRect(0, 0, w, h); const rnd = mgRng(11); for (let y = 4; y < h; y += 10) for (let x = 4; x < w; x += 10) { g.fillStyle = rnd() < 0.55 ? (rnd() < 0.5 ? '#fde68a' : '#a5f3fc') : '#1e293b'; g.fillRect(x, y, 6, 6); } }); }
