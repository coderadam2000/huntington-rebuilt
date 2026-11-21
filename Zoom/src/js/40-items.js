// ==========================================
// ZOOM: items. Using them, the things they throw or drop (simulated on every screen from the same spawn message),
// hits (decided by the screen that runs the kart that was hit), item boxes, coins, particles.
// ==========================================
// ---- particles ----
function makePS(n, size, additive) {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({ size, vertexColors: true, map: TEX.dot = TEX.dot || dotTex(), transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    const p = new THREE.Points(g, m); p.frustumCulled = false;
    const P = { p, n, pos, col, vel: new Float32Array(n * 3), life: new Float32Array(n), k: 0, grav: additive ? -2 : 3 };
    for (let i = 0; i < n; i++) pos[i * 3 + 1] = -9999;
    return P;
}
const PCOL = new THREE.Color();
function psEmit(P, x, y, z, c, vx, vy, vz, life) {
    const i = P.k = (P.k + 1) % P.n; P.pos.set([x, y, z], i * 3); P.vel.set([vx, vy, vz], i * 3); P.life[i] = life; PCOL.set(c); P.col.set([PCOL.r, PCOL.g, PCOL.b], i * 3);
}
function psStep(P, dt) {
    for (let i = 0; i < P.n; i++) {
        if (P.life[i] <= 0) continue;
        P.life[i] -= dt; if (P.life[i] <= 0) { P.pos[i * 3 + 1] = -9999; continue; }
        P.pos[i * 3] += P.vel[i * 3] * dt; P.pos[i * 3 + 1] += P.vel[i * 3 + 1] * dt; P.pos[i * 3 + 2] += P.vel[i * 3 + 2] * dt; P.vel[i * 3 + 1] += P.grav * dt;
    }
    P.p.geometry.attributes.position.needsUpdate = true; P.p.geometry.attributes.color.needsUpdate = true;
}
function spark(x, y, z, c) { if (Z.sparks) psEmit(Z.sparks, x, y, z, c, (Math.random() - 0.5) * 4, 1 + Math.random() * 2.5, (Math.random() - 0.5) * 4, 0.25 + Math.random() * 0.2); }
function puff(x, y, z, c, n) { if (!Z.dust) return; for (let k = 0; k < n; k++) psEmit(Z.dust, x + (Math.random() - 0.5), y, z + (Math.random() - 0.5), c, (Math.random() - 0.5) * 5, 1 + Math.random() * 3, (Math.random() - 0.5) * 5, 0.5 + Math.random() * 0.5); }
function shake(a) { Z.shake = Math.max(Z.shake || 0, a); }

// ---- what the karts on this screen pick up ----
function localKarts() { return Z.karts.filter(k => k.ctl !== 'net'); }
function boxesAndCoins(dt) {
    const T = Z.T, R = Z.race;
    for (const b of T.boxes) {
        if (b.t > 0) { b.t -= dt; b.m.visible = b.t <= 0; if (b.t <= 0) b.m.scale.setScalar(0.2); continue; }
        b.m.rotation.y += dt * 1.6; b.m.rotation.x = Math.sin(Z.t * 1.3 + b.x) * 0.3; b.m.position.y = b.y + Math.sin(Z.t * 2 + b.z) * 0.15;
        if (b.m.scale.x < 1) b.m.scale.setScalar(Math.min(1, b.m.scale.x + dt * 3));
        if (R.mode === 'tt') { b.m.visible = false; continue; }
        for (const K of Z.karts) {
            if (K.out || K.fall > 0) continue;
            const dx = K.x - b.x, dz = K.z - b.z, dy = K.y + 0.8 - b.y;
            if (dx * dx + dz * dz < 4.4 && Math.abs(dy) < 2.2) {
                b.t = 2.6; b.m.visible = false; puff(b.x, b.y, b.z, '#f0abfc', 6);
                if (K.ctl !== 'net' && !K.item && K.roll <= 0 && !(K.golden > 0)) { K.roll = K.ctl === 'me' ? 1.0 : 0.6; K.rollItem = rollItem(Math.random, K.place, Z.karts.filter(k => !k.out).length, R.mode); if (K.ctl === 'me') sfx('box'); }
                break;
            }
        }
    }
    const m4 = Z.m4 || (Z.m4 = new THREE.Matrix4()), q = Z.q || (Z.q = new THREE.Quaternion()), e = Z.e || (Z.e = new THREE.Euler()), v = Z.v3 || (Z.v3 = new THREE.Vector3()), s = Z.s3 || (Z.s3 = new THREE.Vector3());
    for (const c of T.coins) {
        if (c.t > 0) { c.t -= dt; }
        else for (const K of Z.karts) {
            if (K.out || K.fall > 0) continue;
            const dx = K.x - c.x, dz = K.z - c.z; if (dx * dx + dz * dz < 3.6 && Math.abs(K.y + 0.7 - c.y) < 2) { c.t = R.mode === 'coins' ? 6 : 12; if (K.ctl !== 'net') gainCoins(K, 1); break; }
        }
        e.set(Math.PI / 2, 0, Z.t * 3 + c.k); q.setFromEuler(e); v.set(c.x, c.y + Math.sin(Z.t * 2 + c.k) * 0.15, c.z); s.setScalar(c.t > 0 ? 0.001 : 1); m4.compose(v, q, s); T.coinMesh.setMatrixAt(c.k, m4);
    }
    T.coinMesh.instanceMatrix.needsUpdate = true;
}
function gainCoins(K, n) {
    K.coins += n; K.coinsGot += n;
    if (K.ctl === 'me') sfx('coin');
}

// ---- using an item ----
function kartAhead(K) {
    let best = null;
    for (const o of Z.karts) if (o !== K && !o.out && !o.finished && o.place < K.place && (!best || o.place > best.place)) best = o;
    return best;
}
function useItem(K) {
    const R = Z.race;
    if (K.golden > 0) { K.boost = Math.max(K.boost, 1.0); K.boostLv = 0; if (K.ctl === 'me') sfx('boost'); return; }
    if (!K.item || K.roll > 0 || kartStunned(K) || !R.go) return;
    const id = K.item, back = K.input.back;
    K.uses--; if (K.uses <= 0) K.item = null;
    if (K.ctl === 'me') sfx('use');
    const [fx, fz] = kFwd(K);
    switch (id) {
        case 'nitro': case 'nitro3': K.boost = Math.max(K.boost, 1.25); K.boostLv = 0; if (K.ctl === 'me') sfx('boost'); break;
        case 'golden': K.golden = 6; K.boost = Math.max(K.boost, 1.0); break;
        case 'shield': K.shield = 12; break;
        case 'coins': gainCoins(K, 5); break;
        case 'ghost': K.ghost = 5; break;
        case 'rocket': K.rocket = 5; K.drift = 0; break;
        case 'magnet': K.magnet = 3.5; K.magT = kartAhead(K); K.boost = Math.max(K.boost, 0.5); break;
        case 'storm': netEvent({ k: 'storm', by: K.id, pl: K.place }); break;
        case 'ink': netEvent({ k: 'ink', by: K.id, pl: K.place }); break;
        default: {
            const o = { k: 'fx', id: K.id + ':' + (Z.fxN = (Z.fxN || 0) + 1), kind: id, by: K.id, x: K.x, y: K.y, z: K.z, ti: K.ti };
            if (id === 'oil' || id === 'mine') { o.x -= fx * 2.6; o.z -= fz * 2.6; }
            else if (id === 'bumper') { const s = back ? -38 : 46 + Math.max(0, K.sp); o.vx = fx * s; o.vz = fz * s; o.x += fx * (back ? -2.4 : 2.4); o.z += fz * (back ? -2.4 : 2.4); }
            else if (id === 'bomb') { const s = back ? -10 : 22 + Math.max(0, K.sp) * 0.6; o.vx = fx * s; o.vz = fz * s; o.vy = back ? 4 : 9; o.y += 1; }
            else if (id === 'seeker') { const t = kartAhead(K); o.tg = t ? t.id : -1; o.x += fx * 2.4; o.z += fz * 2.4; }
            netEvent(o);
        }
    }
}
// ---- things in the world ----
const FXGEO = {};
function fxMesh(kind) {
    const g = new THREE.Group();
    if (kind === 'bumper' || kind === 'seeker') {
        const c = kind === 'bumper' ? '#22c55e' : '#ef4444';
        g.add(new THREE.Mesh(FXGEO.ball = FXGEO.ball || new THREE.SphereGeometry(0.7, 14, 10), lambert(c, { emissive: c, emissiveIntensity: 0.35 })));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.12, 6, 18), lambert('#f8fafc')); ring.rotation.x = Math.PI / 2; g.add(ring);
    } else if (kind === 'bomb') {
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 10), lambert('#111827')));
        const f = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 6), lambert('#a16207')); f.position.y = 0.95; g.add(f);
        const sp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: '#fde047' })); sp.position.y = 1.25; g.add(sp);
    } else if (kind === 'oil') {
        const m = new THREE.Mesh(new THREE.CircleGeometry(2, 18), new THREE.MeshBasicMaterial({ color: '#111', transparent: true, opacity: 0.85, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.05; g.add(m);
        const s = new THREE.Mesh(new THREE.CircleGeometry(0.9, 12), new THREE.MeshBasicMaterial({ color: '#7c3aed', transparent: true, opacity: 0.5, depthWrite: false })); s.rotation.x = -Math.PI / 2; s.position.set(0.5, 0.06, 0.3); g.add(s);
    } else if (kind === 'mine') {
        g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 0), lambert('#dc2626', { emissive: '#7f1d1d', emissiveIntensity: 0.6 })));
        for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 5), lambert('#e5e7eb')); const a = k / 6 * TAU; s.position.set(Math.cos(a) * 0.75, 0, Math.sin(a) * 0.75); s.rotation.z = -Math.PI / 2; s.rotation.y = -a; g.add(s); }
        g.children[0].position.y = 0; g.position.y = 0.7;
    } else if (kind === 'boom') {
        g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: '#fb923c', transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending })));
    }
    Z.scene.add(g); return g;
}
function spawnFx(o) {
    if (Z.fx.some(f => f.id === o.id)) return;
    const f = Object.assign({ vx: 0, vy: 0, vz: 0, t: 0, life: { bumper: 9, seeker: 11, bomb: 2.4, oil: 50, mine: 50, boom: 0.5 }[o.kind] || 5, dead: false }, o);
    f.y0 = f.y; f.m = fxMesh(f.kind); f.m.position.set(f.x, f.y, f.z);
    if (f.kind !== 'boom' && f.by === (Z.me && Z.me.id)) sfx('throw');
    Z.fx.push(f);
}
function killFx(f) { f.dead = true; if (f.m) { Z.scene.remove(f.m); f.m = null; } }
function fxStep(dt) {
    const T = Z.T, lim = T.hw + T.off;
    for (const f of Z.fx) {
        if (f.dead) continue;
        f.t += dt; if (f.t > f.life) { if (f.kind === 'bomb') explode(f); killFx(f); continue; }
        if (f.kind === 'bumper') {
            f.x += f.vx * dt; f.z += f.vz * dt;
            const P = trackProject(T, f.x, f.y, f.z, f.ti); f.ti = P.i; f.y = P.y + 0.7;
            if (Math.abs(P.lat) > lim - 0.7) {
                if (T.edge !== 'wall') { if (Math.abs(P.lat) > lim + 0.5) { killFx(f); continue; } }
                else { const s = Math.sign(P.lat), vn = f.vx * P.rx * s + f.vz * P.rz * s; if (vn > 0) { f.vx -= 2 * vn * P.rx * s; f.vz -= 2 * vn * P.rz * s; } f.x -= P.rx * s * (Math.abs(P.lat) - lim + 0.7); f.z -= P.rz * s * (Math.abs(P.lat) - lim + 0.7); }
            }
        } else if (f.kind === 'seeker') {
            const tg = Z.karts.find(k => k.id === f.tg && !k.out);
            const close = tg && Math.hypot(tg.x - f.x, tg.z - f.z) < 22 && Math.abs(tg.y - f.y) < 4;
            if (close) { const dx = tg.x - f.x, dz = tg.z - f.z, dy = tg.y + 0.7 - f.y, d = Math.hypot(dx, dz, dy) || 1; f.x += dx / d * 48 * dt; f.z += dz / d * 48 * dt; f.y += dy / d * 48 * dt; }
            else { f.ti = (f.ti + 46 * dt / T.step) % T.N; const lat = tg ? clamp(tg.lat, -T.hw * 0.7, T.hw * 0.7) : 0, p = trackPoint(T, f.ti, lerp(f.lat || 0, lat, 0.5)); f.lat = lerp(f.lat || 0, lat, dt * 2); f.x = p.x; f.z = p.z; f.y = p.y + 1.2; }
            if (f.t % 0.06 < dt) puff(f.x, f.y, f.z, '#fca5a5', 1);
        } else if (f.kind === 'bomb') {
            f.vy -= GRAV * dt; f.x += f.vx * dt; f.z += f.vz * dt; f.y += f.vy * dt;
            const P = trackProject(T, f.x, f.y, f.z, f.ti); f.ti = P.i;
            if (f.y < P.y + 0.85 && Math.abs(P.lat) < lim + 0.5) { f.y = P.y + 0.85; f.vy = Math.abs(f.vy) * 0.3; f.vx *= 0.9; f.vz *= 0.9; }
            if (Math.abs(P.lat) > lim - 0.9 && T.edge === 'wall') { const s = Math.sign(P.lat); f.x -= P.rx * s * 0.6; f.z -= P.rz * s * 0.6; f.vx *= -0.3; f.vz *= -0.3; }
            const sc = 1 + Math.max(0, f.t - 1.6) * 0.5 * (Math.sin(f.t * 40) > 0); f.m.scale.setScalar(sc);
        } else if (f.kind === 'boom') {
            f.m.scale.setScalar(1 + f.t * 16); f.m.children[0].material.opacity = Math.max(0, 0.75 - f.t * 1.5); continue;
        }
        if (f.m) { f.m.position.set(f.x, f.y, f.z); if (f.kind === 'mine' || f.kind === 'bumper' || f.kind === 'seeker') f.m.rotation.y += dt * 4; }
        // hits on the karts this screen runs
        const r = { bumper: 1.5, seeker: 1.6, bomb: 1.6, oil: 2.0, mine: 1.6 }[f.kind] || 0;
        for (const K of localKarts()) {
            if (K.out || K.fall > 0) continue;
            if (K.id === f.by && f.t < (f.kind === 'oil' || f.kind === 'mine' ? 1.2 : 0.5)) continue;
            const dx = K.x - f.x, dz = K.z - f.z, dy = (K.y + 0.6) - f.y;
            if (dx * dx + dz * dz < r * r && Math.abs(dy) < 2.2) {
                if (f.kind === 'bomb' || f.kind === 'mine') { netEvent({ k: 'boom', fid: f.id, x: f.x, y: f.y, z: f.z, by: f.by }); break; }
                if (K.ghost > 0 || K.rocket > 0) { if (f.kind !== 'oil') { netEvent({ k: 'gone', fid: f.id }); } break; }
                hitKart(K, 'spin', f.by); netEvent({ k: 'gone', fid: f.id }); break;
            }
        }
    }
    Z.fx = Z.fx.filter(f => !f.dead);
}
function explode(f) { netEvent({ k: 'boom', fid: f.id, x: f.x, y: f.y, z: f.z, by: f.by }); }
// a blast: everyone this screen runs within 7.5 m is thrown
function doBoom(o) {
    const f = Z.fx.find(x => x.id === o.fid); if (f) killFx(f);
    if (Z.booms && Z.booms[o.fid]) return; (Z.booms = Z.booms || {})[o.fid] = 1;
    spawnFx({ id: 'b' + o.fid, kind: 'boom', x: o.x, y: o.y, z: o.z, by: o.by });
    puff(o.x, o.y, o.z, '#f97316', 24);
    if (Z.me && Math.hypot(Z.me.x - o.x, Z.me.z - o.z) < 40) { sfx('boom'); shake(0.6); }
    for (const K of localKarts()) if (Math.hypot(K.x - o.x, K.z - o.z) < 7.5 && Math.abs(K.y - o.y) < 4) hitKart(K, 'flip', o.by);
}
// a hit on a kart this screen runs
function hitKart(K, how, by) {
    if (K.out || K.ghost > 0 || K.rocket > 0 || K.inv > 0 || K.fall > 0) return false;
    if (K.spin > 0 || K.flip > 0) return false;
    if (K.shield > 0 && how !== 'ink') { K.shield = 0; puff(K.x, K.y + 1, K.z, '#7dd3fc', 14); if (K.ctl === 'me') sfx('shield'); return false; }
    if (how === 'spin') { K.spin = 1.2; K.sp *= 0.5; }
    else if (how === 'flip') { K.flip = 1.5; K.sp *= 0.3; K.vy = 0; }
    else if (how === 'zap') { K.zap = 3.6; K.spin = 0.6; K.sp *= 0.6; }
    K.drift = 0; K.dLevel = 0; K.boost = 0; K.inv = (how === 'flip' ? 1.5 : 1.2) + 0.8;
    const lose = Math.min(K.coins, Z.race.mode === 'coins' ? Math.max(2, Math.ceil(K.coins / 3)) : 3); K.coins -= lose;
    if (lose) for (let k = 0; k < lose; k++) puff(K.x, K.y + 1, K.z, '#facc15', 2);
    if (Z.race.mode === 'balloon') loseBalloon(K, by);
    if (K.ctl === 'me') { sfx(how === 'flip' ? 'boom' : 'hit'); shake(0.5); }
    const att = Z.karts.find(k => k.id === by); if (att && att !== K) { att.hits++; if (att.ctl === 'me') toast('Hit ' + K.name + '!'); }
    return true;
}
function loseBalloon(K, by) {
    if (K.balloons <= 0) return;
    K.balloons--; if (K.ctl === 'me') toast(K.balloons ? K.balloons + (K.balloons === 1 ? ' balloon' : ' balloons') + ' left' : 'Out of balloons!');
    if (K.balloons <= 0) { K.out = true; K.outT = Z.race.clock; }
}
// storm / ink from someone in place `pl`: hits the karts this screen runs that are ahead
function doStorm(o) {
    sfx('storm'); flash('#e0f2fe');
    for (const K of localKarts()) if (K.id !== o.by && K.place < o.pl) hitKart(K, 'zap', o.by);
}
function doInk(o) {
    for (const K of localKarts()) if (K.id !== o.by && K.place < o.pl && K.ghost <= 0 && K.rocket <= 0) { K.ink = 4.5; if (K.ctl === 'me') { sfx('splat'); inkSplat(); } }
}
