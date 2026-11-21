// ==========================================
// ZOOM: karts and bikes. The model (built from the player's garage choices) and the arcade physics:
// gas/brake, steering, drifting with three mini-turbo levels, hops and ramp tricks, boosts, walls, drops, bumping.
// Heading h: forward is (-sin h, -cos h); a bigger h turns left. Models face -z.
// ==========================================
const GRAV = 30;
function decalTex(id, col) {
    return canvasTex(64, 128, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        if (id === 'stripes') { g.fillStyle = '#fff'; g.fillRect(18, 0, 9, h); g.fillRect(37, 0, 9, h); }
        else if (id === 'flames') { for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#facc15' : '#f97316'; g.beginPath(); g.moveTo(8 + k * 14, h); g.quadraticCurveTo(k * 14 - 4, 60, 15 + k * 14, 20 + k * 6); g.quadraticCurveTo(20 + k * 14, 70, 22 + k * 14, h); g.fill(); } }
        else if (id === 'stars') { g.fillStyle = '#fff'; g.font = '22px serif'; g.textAlign = 'center'; [[20, 30], [44, 60], [22, 92], [44, 118]].forEach(([x, y]) => g.fillText('★', x, y)); }
        else if (id === 'checker') { for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) if ((x + y) % 2) { g.fillStyle = '#111'; g.fillRect(x * 16, y * 16, 16, 16); } else { g.fillStyle = '#fff'; g.fillRect(x * 16, y * 16, 16, 16); } }
        else if (id === 'bolt') { g.fillStyle = '#fde047'; g.beginPath(); g.moveTo(38, 4); g.lineTo(14, 70); g.lineTo(30, 70); g.lineTo(22, 124); g.lineTo(50, 50); g.lineTo(34, 50); g.closePath(); g.fill(); }
    });
}
// the model. Returns { root (position+yaw), tilt (pitch/roll/spin), wheels[], mats[], ... }
function makeVehicle(b, name, nameCol) {
    const body = bodyById(b.body), wh = wheelById(b.wheel), paint = PAINTS[b.col] || PAINTS[0], suit = SUITS[b.suit] || SUITS[0];
    const root = new THREE.Group(), tilt = new THREE.Group(); root.add(tilt);
    const mats = [], M = (c, x) => { const m = lambert(c, x); mats.push(m); return m; };
    const mPaint = M(paint), mDark = M('#1f2937'), mSuit = M(suit), mSkin = M('#f2c9a0'), mMetal = M('#9ca3af'), mVisor = M('#0f172a'), mTire = M('#111111'), mRim = M(wh.rim, wh.glow ? { emissive: wh.rim, emissiveIntensity: 0.9 } : null);
    const box = (x, y, z, m, px, py, pz) => { const e = new THREE.Mesh(new THREE.BoxGeometry(x, y, z), m); e.position.set(px, py, pz); tilt.add(e); return e; };
    const wheels = [];
    const wheel = (px, pz, r, w) => {
        const g = new THREE.Group(), t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 14), mTire); t.rotation.z = Math.PI / 2; g.add(t);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.02, 10), mRim); rim.rotation.z = Math.PI / 2; g.add(rim);
        g.position.set(px, r, pz); tilt.add(g); wheels.push(g); return g;
    };
    let wr = wh.r, ww = wh.wd, seatZ = 0.25, seatY = 0.55, top = 0.7;
    if (body.type === 'kart') {
        const D = { sprint: [1.4, 0.32, 2.3], dart: [1.15, 0.3, 2.1], brick: [1.75, 0.55, 2.3], buggy: [1.45, 0.34, 2.2], comet: [1.35, 0.26, 2.7] }[body.id];
        const [W, H, L] = D, lift = wr * 0.9 + (body.id === 'buggy' ? 0.25 : 0);
        box(W, H, L, mPaint, 0, lift + H / 2, 0);
        box(W * 0.9, 0.2, 0.5, mDark, 0, lift + 0.12, -L / 2 - 0.15);                       // front bumper
        box(0.8, 0.4, 0.55, mMetal, 0, lift + H + 0.15, L / 2 - 0.35);                      // engine
        for (const s of [-1, 1]) { const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.5, 8), mMetal); ex.rotation.x = Math.PI / 2; ex.position.set(s * 0.25, lift + H + 0.05, L / 2 + 0.1); tilt.add(ex); }
        if (body.id === 'dart') { const n = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 8), mPaint); n.rotation.x = -Math.PI / 2; n.position.set(0, lift + H / 2, -L / 2 - 0.45); tilt.add(n); }
        if (body.id === 'sprint' || body.id === 'comet') { box(W * 0.95, 0.08, 0.45, mPaint, 0, lift + H + 0.75, L / 2 + 0.05); for (const s of [-1, 1]) box(0.08, 0.6, 0.3, mDark, s * W * 0.35, lift + H + 0.45, L / 2 + 0.05); }
        if (body.id === 'comet') { box(0.08, 0.7, 0.9, mPaint, 0, lift + H + 0.35, L / 2 - 0.1); }
        if (body.id === 'brick') { box(W * 0.95, 0.12, L * 0.5, mDark, 0, lift + H + 0.06, -L * 0.18); }
        if (body.id === 'buggy') { for (const s of [-1, 1]) { box(0.08, 1.0, 0.08, mDark, s * 0.6, lift + H + 0.5, 0.45); box(0.08, 1.0, 0.08, mDark, s * 0.6, lift + H + 0.5, -0.35); } box(1.28, 0.08, 0.88, mDark, 0, lift + H + 1.0, 0.05); }
        const dec = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.7, L * 0.55), new THREE.MeshLambertMaterial({ map: decalTex(b.decal), transparent: true, depthWrite: false }));
        dec.rotation.x = -Math.PI / 2; dec.position.set(0, lift + H + 0.011, -L * 0.18); tilt.add(dec); if (b.decal === 'none') dec.visible = false;
        const zf = -L / 2 + wr * 0.9, zb = L / 2 - wr * 0.9, xw = W / 2 + ww / 2 - 0.05;
        wheel(-xw, zf, wr, ww); wheel(xw, zf, wr, ww); wheel(-xw, zb, wr * 1.08, ww * 1.15); wheel(xw, zb, wr * 1.08, ww * 1.15);
        seatY = lift + H; seatZ = 0.25; top = seatY + 1.3;
        box(0.4, 0.06, 0.06, mDark, 0, seatY + 0.55, -0.3);                                 // steering wheel
    } else {
        const D = { scooter: [0.5, 1.7], sportbike: [0.45, 2.0], chopper: [0.5, 2.3] }[body.id], [W, L] = D, r = wr * 1.15;
        const zf = -L / 2 + r * 0.8 - (body.id === 'chopper' ? 0.3 : 0), zb = L / 2 - r * 0.8;
        wheel(0, zf, r, ww * 0.9); wheel(0, zb, r * (body.id === 'chopper' ? 1.15 : 1), ww * (body.id === 'chopper' ? 1.4 : 1));
        box(W, 0.36, L * 0.6, mPaint, 0, r + 0.35, 0.05);
        if (body.id === 'scooter') { box(W * 1.2, 0.08, 0.9, mDark, 0, r + 0.1, 0.15); box(W * 0.9, 0.9, 0.25, mPaint, 0, r + 0.6, zf + 0.4); }
        if (body.id === 'sportbike') { const n = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 6), mPaint); n.rotation.x = -Math.PI / 2; n.position.set(0, r + 0.55, zf + 0.25); tilt.add(n); box(0.35, 0.25, 0.08, mVisor, 0, r + 0.8, zf + 0.55); }
        if (body.id === 'chopper') { for (const s of [-1, 1]) { const f = box(0.06, 1.3, 0.06, mMetal, s * 0.15, r + 0.55, zf + 0.35); f.rotation.x = -0.5; } box(0.9, 0.06, 0.06, mMetal, 0, r + 1.25, zf + 0.75); box(0.6, 0.3, 0.5, mMetal, 0, r + 0.2, 0.15); }
        for (const s of [-1, 1]) box(0.3, 0.05, 0.05, mDark, s * 0.25, r + 0.85, zf + 0.6);
        seatY = r + 0.53; seatZ = 0.3; top = seatY + 1.4;
    }
    // driver
    const drv = new THREE.Group(); drv.position.set(0, seatY, seatZ); tilt.add(drv);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.7, 0.42), mSuit); torso.position.y = 0.38; drv.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), mSuit); head.position.y = 0.98; drv.add(head);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.2, 0.12), mVisor); visor.position.set(0, 0.98, -0.3); drv.add(visor);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.36, 0.62), M('#ffffff')); stripe.position.set(0, 1.18, 0); drv.add(stripe);
    for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.6), mSuit); arm.position.set(s * 0.32, 0.5, -0.32); drv.add(arm); }
    if (body.type === 'bike') { drv.rotation.x = -0.35; drv.position.z -= 0.1; }
    // blob shadow, boost flame, shield, ghost, balloons, name tag
    const sh = new THREE.Mesh(new THREE.CircleGeometry(1.2, 16), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.32, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.scale.set(body.type === 'bike' ? 0.6 : 1, 1.25, 1); root.add(sh);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.4, 8, 1, true), new THREE.MeshBasicMaterial({ color: '#60a5fa', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    flame.rotation.x = -Math.PI / 2; flame.position.set(0, body.type === 'kart' ? seatY + 0.05 : wr + 0.45, body.type === 'kart' ? 1.75 : 1.2); flame.visible = false; tilt.add(flame);
    const shield = new THREE.Mesh(new THREE.SphereGeometry(1.9, 18, 12), new THREE.MeshBasicMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.28, depthWrite: false })); shield.position.y = 0.9; shield.visible = false; root.add(shield);
    const balloons = []; const bg = new THREE.SphereGeometry(0.42, 12, 8);
    for (let k = 0; k < 3; k++) { const bm = new THREE.Mesh(bg, new THREE.MeshLambertMaterial({ color: paint, emissive: paint, emissiveIntensity: 0.3 })); bm.position.set((k - 1) * 0.55, top + 0.6 + (k === 1 ? 0.3 : 0), 0.8); bm.scale.y = 1.2; bm.visible = false; tilt.add(bm); balloons.push(bm); }
    let tag = null;
    if (name) {
        const tx = canvasTex(256, 64, (g, w, h) => { g.font = '800 30px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText(name, w / 2, h / 2); g.fillStyle = nameCol || '#fff'; g.fillText(name, w / 2, h / 2); });
        tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, depthWrite: false, transparent: true })); tag.scale.set(3.6, 0.9, 1); tag.position.y = top + 1.1; root.add(tag);
    }
    compactParts(tilt, new Set([flame, ...balloons, ...wheels]));
    return { root, tilt, wheels, wr, drv, mats, flame, shield, balloons, tag, shadow: sh, bike: body.type === 'bike', top };
}
// fewer draw calls: every fixed part of a vehicle that shares a material becomes one mesh
function compactParts(tilt, keep) {
    tilt.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(tilt.matrixWorld).invert(), groups = new Map(), drop = [];
    tilt.traverse(o => {
        if (!o.isMesh || keep.has(o) || [...keep].some(k => k !== o && k.getObjectById && k.getObjectById(o.id))) return;
        if (o.material.transparent) return;
        const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
        g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
        if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        (groups.get(o.material) || groups.set(o.material, []).get(o.material)).push(g); drop.push(o);
    });
    for (const o of drop) o.parent.remove(o);
    for (const [m, gs] of groups) {
        let n = 0; for (const g of gs) n += g.attributes.position.count;
        const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let k = 0;
        for (const g of gs) { pos.set(g.attributes.position.array, k * 3); nor.set(g.attributes.normal.array, k * 3); uv.set(g.attributes.uv.array, k * 2); k += g.attributes.position.count; g.dispose(); }
        const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); mg.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); mg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        tilt.add(new THREE.Mesh(mg, m));
    }
}
function setGhostLook(V, on) { for (const m of V.mats) { m.transparent = on; m.opacity = on ? 0.35 : 1; m.depthWrite = !on; } }

// ---- a racer ----
// ctl: 'me' (this keyboard), 'bot' (run here), 'net' (someone else's screen moves it)
function makeKart(o) {
    const K = Object.assign({
        id: 0, name: '', col: '#fff', build: null, ctl: 'bot', x: 0, y: 0, z: 0, h: 0, vx: 0, vz: 0, vy: 0, sp: 0, air: false, ti: 0, prog: 0, lap: 1, cp: 0, maxProg: 0,
        lat: 0, off: false, drift: 0, dCharge: 0, dLevel: 0, hop: 0, boost: 0, boostLv: 0, spin: 0, flip: 0, zap: 0, shield: 0, ghost: 0, rocket: 0, magnet: 0, golden: 0, ink: 0,
        item: null, uses: 0, roll: 0, rollItem: null, coins: 0, coinsGot: 0, balloons: 3, out: false, finished: false, finT: 0, lapT: [], lapStart: 0, fall: 0, safeI: 0,
        trick: 0, trickOk: 0, wrong: 0, inv: 0, place: 1, input: { gas: 0, steer: 0, drift: false, item: false, back: false }, prevDrift: false, prevItem: false,
        net: null, hits: 0
    }, o);
    K.S = physStats(K.build, Z.race ? Z.race.cls : 1);
    K.V = makeVehicle(K.build, K.ctl === 'me' ? null : K.name, K.col);
    Z.scene.add(K.V.root);
    return K;
}
function kartPlace(T, K, slot) {
    // grid: two columns, 7 m per row, behind the line
    const row = Math.floor(slot / 2), side = slot % 2 ? 1 : -1, i = -(5 + row * 3.6) / T.step * 2;
    const p = trackPoint(T, (i + T.N) % T.N, side * T.hw * 0.4);
    Object.assign(K, { x: p.x, y: p.y, z: p.z, h: p.h, vx: 0, vz: 0, vy: 0, sp: 0, ti: Math.floor((i + T.N) % T.N), lap: 1, cp: 0, prog: 0, safeI: Math.floor((i + T.N) % T.N) });
    K.prog = -(T.N - ((i + T.N) % T.N)); K.maxProg = K.prog;
}
const kFwd = K => [-Math.sin(K.h), -Math.cos(K.h)];
function kartStunned(K) { return K.spin > 0 || K.flip > 0 || K.fall > 0 || K.out; }
// one physics step for a kart this screen runs
function kartStep(K, dt) {
    const T = Z.T, S = K.S, inp = K.input, R = Z.race;
    if (K.out) { K.sp *= 0.95; inp.gas = 0; }
    const stun = kartStunned(K);
    let gas = stun || !R.go ? 0 : inp.gas, steer = stun || !R.go ? 0 : inp.steer;
    if (K.finished && K.ctl === 'me') { gas = 0.6; }
    // timers
    for (const k of ['boost', 'spin', 'flip', 'zap', 'shield', 'ghost', 'magnet', 'golden', 'ink', 'inv', 'trickOk']) if (K[k] > 0) K[k] = Math.max(0, K[k] - dt);
    if (K.rocket > 0) { K.rocket -= dt; if (K.rocket <= 0) { K.rocket = 0; K.inv = 1; } }
    if (K.roll > 0) { K.roll -= dt; if (K.roll <= 0) { K.item = K.rollItem; K.uses = ITEMS[K.item].uses || 1; K.rollItem = null; if (K.ctl === 'me') sfx('item'); } }
    // the top speed this frame
    const coinMul = 1 + Math.min(10, K.coins) * 0.006;
    let top = S.top * coinMul * (K.ctl === 'bot' ? K.aiMul || 1 : 1);
    if (K.off && K.boost <= 0 && K.rocket <= 0) top *= S.off;
    if (K.zap > 0) top *= 0.72;
    if (K.magnet > 0) top *= 1.18;
    if (K.boost > 0) top *= 1.32;
    // rocket run: the track drives you
    if (K.rocket > 0) {
        const ahead = trackPoint(T, K.ti + 14, clamp(K.lat, -T.hw * 0.4, T.hw * 0.4));
        const want = Math.atan2(-(ahead.x - K.x), -(ahead.z - K.z)); K.h += angDiff(K.h, want) * Math.min(1, dt * 6);
        K.sp = lerp(K.sp, S.top * 1.65, dt * 3); gas = 0; steer = 0;
    }
    // speed
    if (K.rocket <= 0) {
        if (gas > 0) {
            if (K.sp < top) K.sp += S.acc * (K.boost > 0 ? 2.2 : 1) * Math.max(0.12, 1 - Math.max(0, K.sp) / top) * gas * dt + (K.sp < 0 ? 18 * dt : 0);
            else K.sp = Math.max(top, K.sp - 9 * dt);
        } else if (gas < 0) {
            if (K.sp > 0.5) K.sp -= 32 * dt; else K.sp = Math.max(-9, K.sp - 12 * dt);
        } else { const f = (K.air ? 1 : 7) * dt; K.sp = Math.abs(K.sp) <= f ? 0 : K.sp - Math.sign(K.sp) * f; if (K.sp > top) K.sp = Math.max(top, K.sp - 9 * dt); }
        if (K.boost > 0 && K.sp < top * 0.9) K.sp = Math.min(top, K.sp + 40 * dt);
        if (K.spin > 0 || K.flip > 0) K.sp *= Math.pow(0.15, dt);
    }
    // drifting: press drift while turning above 11 m/s; the longer you hold it the bigger the mini-turbo
    const dPress = inp.drift && !K.prevDrift; K.prevDrift = inp.drift;
    if (dPress && !K.air && !stun && R.go) { K.hop = 0.18; if (!K.air) { K.vy = 4.2; K.air = true; K.hopAir = true; } }
    if (dPress && K.air && K.trick > 0 && !K.trickOk) { K.trickOk = 3; K.trickSpin = 1; if (K.ctl === 'me') sfx('trick'); }
    if (inp.drift && K.drift === 0 && !stun && K.sp > 11 && Math.abs(steer) > 0.25 && K.rocket <= 0) { K.drift = Math.sign(steer); K.dCharge = 0; K.dLevel = 0; }
    if (K.drift !== 0 && (!inp.drift || K.sp < 8 || stun)) {
        if (!stun && K.dLevel > 0 && K.sp >= 8) { K.boostLv = K.dLevel; K.boost = Math.max(K.boost, [0, 0.75, 1.25, 1.9][K.dLevel] * (0.85 + 0.15 * S.mt)); if (K.ctl === 'me') sfx('boost'); }
        K.drift = 0; K.dCharge = 0; K.dLevel = 0;
    }
    if (K.drift !== 0 && !K.air) {
        const into = steer * K.drift;               // +1 = steering into the drift
        K.dCharge += dt * S.mt * (0.7 + 0.5 * Math.max(0, into));
        const lv = K.dCharge > 2.9 ? 3 : K.dCharge > 1.8 ? 2 : K.dCharge > 0.85 ? 1 : 0;
        if (lv > K.dLevel && K.ctl === 'me') sfx('spark' + lv); K.dLevel = lv;
    }
    // steering
    const vel = Math.max(0, Math.abs(K.sp)), resp = clamp(vel / 9, 0, 1) * (1 - 0.22 * clamp((vel - 22) / 18, 0, 1));
    let yaw;
    if (K.drift !== 0) yaw = K.drift * (0.62 + 0.42 * steer * K.drift) * S.turn * (S.bike ? 1.18 : 1.08) * resp;
    else yaw = steer * S.turn * resp * (K.sp < 0 ? -1 : 1);
    if (K.air) yaw *= 0.45;
    if (K.spin > 0) yaw = 0;
    K.h += yaw * dt;
    // velocity: the kart slides when its grip can't keep up (drift, ice, air)
    const [fx, fz] = kFwd(K);
    let grip = K.drift !== 0 ? 4.2 : S.grip * (T.th.ice ? 0.45 : 1); if (K.air) grip = 0.6; if (K.rocket > 0) grip = 20;
    const g = 1 - Math.exp(-grip * dt);
    K.vx = lerp(K.vx, fx * K.sp, g); K.vz = lerp(K.vz, fz * K.sp, g);
    // magnet: pull toward the racer in front
    if (K.magnet > 0 && K.magT) { const dx = K.magT.x - K.x, dz = K.magT.z - K.z, d = Math.hypot(dx, dz); if (d > 3 && d < 120) { K.vx += dx / d * 10 * dt; K.vz += dz / d * 10 * dt; K.h += angDiff(K.h, Math.atan2(-dx, -dz)) * dt * 1.5; } }
    K.x += K.vx * dt; K.z += K.vz * dt;
    // where on the track
    const P = trackProject(T, K.x, K.y, K.z, K.ti);
    const prevTi = K.ti; K.ti = P.i; K.lat = P.lat;
    const lim = T.hw + T.off;
    K.off = Math.abs(P.lat) > T.hw + 0.9;
    // edges: walls push back, drops and lava take you out
    if (T.edge === 'wall' && K.fall <= 0) {
        const r = 0.95;
        if (Math.abs(P.lat) > lim - r) {
            const s = Math.sign(P.lat), push = Math.abs(P.lat) - (lim - r);
            K.x -= P.rx * s * push; K.z -= P.rz * s * push;
            const vn = K.vx * P.rx * s + K.vz * P.rz * s;
            if (vn > 0) { K.vx -= P.rx * s * vn * 1.4; K.vz -= P.rz * s * vn * 1.4; K.sp *= Math.max(0.55, 1 - vn * 0.04); if (vn > 6 && K.ctl === 'me') { sfx('bonk'); shake(0.25); } if (vn > 4) puff(K.x + P.rx * s, K.y + 0.6, K.z + P.rz * s, '#fde68a', 6); }
        }
    } else if (K.fall <= 0 && Math.abs(P.lat) > lim + 0.6 && K.rocket <= 0) {
        K.fall = T.edge === 'lava' ? 1.1 : 1.6; K.drift = 0; K.air = true; if (K.ctl === 'me') sfx('fall');
        if (T.edge === 'lava') puff(K.x, K.y, K.z, '#fb923c', 20);
    }
    // height
    const gy = P.y;
    if (K.fall > 0) {
        K.vy -= GRAV * dt; K.y += K.vy * dt; K.fall -= dt;
        if (K.fall <= 0) respawn(K);
    } else {
        // ramps launch you
        if (!K.air && T.ramps.length) for (const rp of T.ramps) {
            const di = ((rp.i - K.ti) % T.N + T.N) % T.N;
            if (di > T.N - 3 || di < 0.6) { if (Math.abs(K.lat - rp.lat) < rp.w / 2 + 0.5 && K.sp > 8 && K.rampT !== rp) { K.air = true; K.vy = 6.5 + 0.2 * K.sp; K.trick = 0.7; K.rampT = rp; K.hopAir = false; } }
            else if (K.rampT === rp && di > 6 && di < T.N - 6) K.rampT = null;
        }
        if (K.air) {
            K.vy -= GRAV * dt; K.y += K.vy * dt;
            if (K.trick > 0) K.trick -= dt;
            if (K.y <= gy) { K.y = gy; K.air = false; K.vy = 0;
                if (K.trickOk > 0) { K.boost = Math.max(K.boost, 0.9); K.trickOk = 0; if (K.ctl === 'me') sfx('boost'); }
                if (!K.hopAir && K.ctl === 'me') sfx('land');
                K.hopAir = false; K.trick = 0; }
        } else {
            const ny = K.y + (K.vy - GRAV * dt) * dt;
            if (ny > gy + 0.25 && K.sp > 14) { K.air = true; K.hopAir = true; K.vy -= GRAV * dt; K.y = ny; }
            else { K.vy = (gy - K.y) / dt; K.y = gy; if (K.vy > 12) K.vy = 12; }
        }
        if (!K.off && !K.air && Math.abs(P.lat) < T.hw * 0.8) K.safeI = Math.floor(K.ti);
    }
    // boost pads
    for (const pd of T.pads) { const di = Math.abs(((pd.i - K.ti) % T.N + T.N + T.N / 2) % T.N - T.N / 2); if (di < 1.6 && Math.abs(K.lat - pd.lat) < 2.4 && !K.air) { if (K.boost < 0.5 && K.ctl === 'me') sfx('boost'); K.boost = Math.max(K.boost, 1.3); } }
    // laps: you have to pass three checkpoints, then the line
    lapLogic(K, prevTi);
    // wrong way
    const along = K.vx * P.tx + K.vz * P.tz;
    if (along < -4 && !stun) K.wrong += dt; else K.wrong = Math.max(0, K.wrong - dt * 2);
}
function lapLogic(K, prevTi) {
    const T = Z.T, N = T.N, q = Math.floor(K.ti / N * 4);
    if (q === K.cp + 1) K.cp = q;
    const crossed = prevTi > N * 0.8 && K.ti < N * 0.2;
    const back = prevTi < N * 0.2 && K.ti > N * 0.8;
    if (crossed && K.cp >= 3) { K.cp = 0; onLap(K); }
    else if (crossed && K.lapBack) { K.lapBack = false; }
    if (back) K.lapBack = true;
    K.prog = (K.lap - 1) * N + K.ti + (K.lapBack ? -N : 0);
    if (K.prog > K.maxProg) K.maxProg = K.prog;
}
function respawn(K) {
    const T = Z.T, i = (K.safeI - 4 + T.N) % T.N, p = trackPoint(T, i, 0);
    Object.assign(K, { x: p.x, y: p.y + 2.5, z: p.z, h: p.h, vx: 0, vz: 0, vy: 0, sp: 4, air: true, ti: i, fall: 0, drift: 0, inv: 1.6, hopAir: true });
    K.falls = (K.falls || 0) + 1;
    K.lapBack = false;
    if (Z.race.mode === 'balloon') loseBalloon(K, null);
}
// bumping into each other: only karts this screen runs get moved; heavier karts move less
function collideKarts(dt) {
    const ks = Z.karts;
    for (const A of ks) {
        if (A.ctl === 'net' || A.out || A.fall > 0) continue;
        for (const B of ks) {
            if (A === B || B.out || B.fall > 0 || A.ghost > 0 || B.ghost > 0) continue;
            const dx = A.x - B.x, dz = A.z - B.z, dy = A.y - B.y, d = Math.hypot(dx, dz);
            if (d > 1.9 || d < 1e-4 || Math.abs(dy) > 1.6) continue;
            const nx = dx / d, nz = dz / d, ov = 1.9 - d, share = B.S.wgt / (A.S.wgt + B.S.wgt);
            A.x += nx * ov * share; A.z += nz * ov * share;
            const rel = (B.vx - A.vx) * nx + (B.vz - A.vz) * nz;
            if (rel > 0) { A.vx += nx * rel * share * 1.2; A.vz += nz * rel * share * 1.2; }
            if (B.rocket > 0 && A.rocket <= 0) hitKart(A, 'flip', B.id);
            if (A.ctl === 'me' && rel > 4) sfx('bump');
        }
    }
}
// the model follows the state
function kartVisual(K, dt) {
    const V = K.V;
    V.root.position.set(K.x, K.y, K.z); V.root.rotation.y = K.h;
    const T = Z.T;
    // tilt: lean into turns (bikes lean a lot), nose up/down with the road, spins and flips
    const st = K.ctl === 'net' ? (K.netSteer || 0) : K.input.steer;
    const leanT = (V.bike ? -0.42 : -0.06) * (K.drift !== 0 ? K.drift * 1.3 : st) * clamp(Math.abs(K.sp) / 15, 0, 1);
    V.tilt.rotation.z = lerp(V.tilt.rotation.z, leanT, Math.min(1, dt * 8));
    const a = Math.floor(K.ti) % T.N, b = (a + 2) % T.N, slope = Math.atan2(T.py[b] - T.py[a], 2 * T.step);
    const pitch = K.air ? clamp(K.vy * 0.02, -0.3, 0.3) : slope;
    V.tilt.rotation.x = lerp(V.tilt.rotation.x, pitch + (K.boost > 0 && V.bike ? 0.12 : 0), Math.min(1, dt * 6));
    let spinY = 0;
    if (K.spin > 0) spinY = (1.2 - K.spin) * 14;
    if (K.drift !== 0) spinY = K.drift * 0.38;
    if (K.trickSpin > 0) { K.trickSpin = Math.max(0, K.trickSpin - dt * 2.4); spinY += (1 - K.trickSpin) * TAU; }
    V.tilt.rotation.y = lerp(V.tilt.rotation.y, spinY, K.spin > 0 || K.trickSpin > 0 ? 1 : Math.min(1, dt * 10));
    if (K.flip > 0) V.tilt.rotation.x = (1.5 - K.flip) * 4.2;
    V.tilt.position.y = K.flip > 0 ? Math.sin((1.5 - K.flip) / 1.5 * Math.PI) * 2.2 : 0;
    const sc = K.zap > 0 ? 0.62 : 1; V.tilt.scale.setScalar(lerp(V.tilt.scale.x, sc, Math.min(1, dt * 6)));
    for (const w of V.wheels) w.rotation.x -= K.sp * dt / V.wr;
    V.flame.visible = K.boost > 0 || K.rocket > 0;
    if (V.flame.visible) { V.flame.material.color.set(K.rocket > 0 ? '#f97316' : K.boostLv === 3 ? '#c084fc' : '#60a5fa'); V.flame.scale.set(1, 0.8 + Math.random() * 0.6, 1); }
    V.shield.visible = K.shield > 0; if (K.shield > 0) V.shield.material.opacity = K.shield < 2 ? 0.12 + 0.16 * (Math.sin(Z.t * 20) > 0) : 0.28;
    const gh = K.ghost > 0 || (K.inv > 0 && Math.sin(Z.t * 30) > 0);
    if (gh !== V.ghosted) { setGhostLook(V, gh); V.ghosted = gh; }
    V.root.visible = !(K.out && Z.race.mode !== 'race');
    V.shadow.visible = !K.air && K.fall <= 0;
    if (Z.race.mode === 'balloon') V.balloons.forEach((m, k) => { m.visible = k < K.balloons; m.position.y = V.top + 0.6 + (k === 1 ? 0.3 : 0) + Math.sin(Z.t * 3 + k) * 0.08; });
    // sparks while drifting, dust off-road, flame trail
    if (K.drift !== 0 && !K.air && K.dLevel > 0 && Math.random() < 0.7) {
        const c = ['#fff', '#60a5fa', '#fb923c', '#c084fc'][K.dLevel], [fx, fz] = kFwd(K);
        for (const s of [-1, 1]) spark(K.x - fx * 1.1 + Math.cos(K.h) * 0.7 * s, K.y + 0.15, K.z - fz * 1.1 - Math.sin(K.h) * 0.7 * s, c);
    }
    if (K.off && !K.air && Math.abs(K.sp) > 6 && Math.random() < 0.4) puff(K.x, K.y + 0.3, K.z, Z.T.th.shoulder, 1);
}
