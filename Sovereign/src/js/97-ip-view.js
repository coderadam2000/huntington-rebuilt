// ==========================================
// SOVEREIGN INTERPLANETARY: the solar system on screen. Its own scene, drawn with the globe's renderer while
// Interplanetary is open (the globe sleeps). Planets get painted textures, orbit lines, rings in their ruler's
// colour; fleets fly between worlds; labels follow the planets. Drag to turn, wheel to zoom, click to select.
// Distances are squashed (12 x AU^0.55) so Mercury and Eris both fit on one screen.
// ==========================================
const IPV = { on: false, sel: -1, cam: { yaw: 0.6, pitch: 0.75, dist: 120, tx: 0, tz: 0, ty: 0 }, frac: 0 };
const ipD = a => 12 * Math.pow(a, 0.55);
function ipScreenPos(i, m) { const d = IP_WORLDS[i], w = IPG.worlds[i], a = w.ang0 + TAU * (m / 12) / d.per, r = ipD(d.a); return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r); }
function ipTex(d) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d'), rnd = makeRng(d.id.length * 977 + d.a * 100);
    const [c0, c1, c2] = d.col; g.fillStyle = c0; g.fillRect(0, 0, 256, 128);
    if (d.style === 'bands') { for (let y = 0; y < 128; y += 3) { g.fillStyle = [c0, c1, c2][Math.floor((Math.sin(y * 0.21) + Math.sin(y * 0.07 + 1) + 2) / 4 * 3) % 3]; g.globalAlpha = 0.55; g.fillRect(0, y, 256, 3 + rnd() * 2); } g.globalAlpha = 1; if (d.id === 'jupiter') { g.fillStyle = '#b5523b'; g.beginPath(); g.ellipse(170, 80, 16, 8, 0, 0, TAU); g.fill(); } }
    else if (d.style === 'cloud') { for (let k = 0; k < 140; k++) { g.fillStyle = rnd() < 0.5 ? c1 : c2; g.globalAlpha = 0.25; g.beginPath(); g.ellipse(rnd() * 256, rnd() * 128, 20 + rnd() * 40, 4 + rnd() * 6, 0, 0, TAU); g.fill(); } }
    else if (d.style === 'earth') { g.fillStyle = '#1e56b8'; g.fillRect(0, 0, 256, 128); for (let k = 0; k < 26; k++) { g.fillStyle = rnd() < 0.7 ? '#3d8b3d' : '#b49a62'; g.beginPath(); g.ellipse(rnd() * 256, 20 + rnd() * 88, 8 + rnd() * 26, 6 + rnd() * 16, rnd() * 3, 0, TAU); g.fill(); } g.fillStyle = '#f4f8ff'; g.fillRect(0, 0, 256, 9); g.fillRect(0, 119, 256, 9); g.globalAlpha = 0.35; for (let k = 0; k < 40; k++) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(rnd() * 256, rnd() * 128, 10 + rnd() * 20, 2 + rnd() * 4, 0, 0, TAU); g.fill(); } g.globalAlpha = 1; }
    else { for (let k = 0; k < (d.style === 'ice' ? 60 : 110); k++) { g.fillStyle = rnd() < 0.5 ? c1 : c2; g.globalAlpha = 0.35 + rnd() * 0.3; g.beginPath(); g.arc(rnd() * 256, rnd() * 128, 1 + rnd() * (d.style === 'ice' ? 14 : 7), 0, TAU); g.fill(); } g.globalAlpha = 1; if (d.id === 'pluto') { g.fillStyle = '#f7eee2'; g.beginPath(); g.arc(130, 70, 18, 0, TAU); g.arc(150, 70, 18, 0, TAU); g.fill(); } if (d.id === 'mars') { g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 6); g.fillRect(0, 123, 256, 5); } }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
IPV.dot = function () { if (this._dot) return this._dot; const c = document.createElement('canvas'); c.width = c.height = 16; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.arc(8, 8, 7, 0, TAU); g.fill(); return this._dot = new THREE.CanvasTexture(c); };
IPV.init = function () {
    if (this.scene) return;
    const S = this.scene = new THREE.Scene(); S.background = new THREE.Color('#02030a');
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 6000);
    S.add(new THREE.AmbientLight(0xffffff, 0.22));
    const sunL = new THREE.PointLight(0xfff2d6, 2.4, 0, 0); S.add(sunL);
    // the Sun and its glow
    const sun = new THREE.Mesh(new THREE.SphereGeometry(3.2, 32, 20), new THREE.MeshBasicMaterial({ color: '#ffd27a' })); S.add(sun);
    const gc = document.createElement('canvas'); gc.width = gc.height = 128; const gg = gc.getContext('2d'), gr = gg.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,230,160,1)'); gr.addColorStop(0.25, 'rgba(255,180,80,.55)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, 128, 128);
    const glowT = new THREE.CanvasTexture(gc);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); glow.scale.set(22, 22, 1); S.add(glow);
    // stars
    { const n = 2500, p = new Float32Array(n * 3), r = makeRng(4); for (let k = 0; k < n; k++) { const a = r() * TAU, b = Math.acos(r() * 2 - 1); p.set([Math.sin(b) * Math.cos(a) * 3000, Math.cos(b) * 3000, Math.sin(b) * Math.sin(a) * 3000], k * 3); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); S.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#cbd5e1', size: 1.6, sizeAttenuation: false }))); }
    // asteroid belt and Kuiper belt
    const belt = (n, a0, a1, h, col, size, seed) => { const p = new Float32Array(n * 3), r = makeRng(seed); for (let k = 0; k < n; k++) { const a = r() * TAU, rr = ipD(a0 + r() * (a1 - a0)); p.set([Math.cos(a) * rr, (r() - 0.5) * h, Math.sin(a) * rr], k * 3); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color: col, size, sizeAttenuation: false, transparent: true, opacity: 0.75, map: IPV.dot(), alphaTest: 0.1 })); S.add(m); return m; };
    this.belt = belt(1800, 2.2, 3.3, 1.6, '#a8a29e', 2.2, 7); this.kuiper = belt(2600, 32, 55, 8, '#93c5fd', 2.2, 8);
    // planets
    this.P = IP_WORLDS.map((d, i) => {
        const g = new THREE.Group(); S.add(g);
        const m = new THREE.Mesh(new THREE.SphereGeometry(d.r * 0.9, 32, 20), new THREE.MeshLambertMaterial({ map: ipTex(d) })); m.userData.i = i; g.add(m);
        if (d.rings) { const rg = new THREE.Mesh(new THREE.RingGeometry(d.r * 1.25, d.r * (d.id === 'saturn' ? 2.2 : 1.6), 48), new THREE.MeshBasicMaterial({ color: d.id === 'saturn' ? '#e8d7a8' : '#a5d8dd', side: THREE.DoubleSide, transparent: true, opacity: 0.55 })); rg.rotation.x = Math.PI / 2 - (d.id === 'uranus' ? 1.4 : 0.45); g.add(rg); }
        const own = new THREE.Mesh(new THREE.TorusGeometry(d.r * 1.2 + 0.45, 0.05 + d.r * 0.03, 6, 48), new THREE.MeshBasicMaterial({ color: '#fff' })); own.rotation.x = Math.PI / 2; g.add(own);
        const sel = new THREE.Mesh(new THREE.TorusGeometry(d.r * 1.45 + 0.8, 0.04 + d.r * 0.02, 6, 48), new THREE.MeshBasicMaterial({ color: '#fde68a', transparent: true, opacity: 0.9 })); sel.rotation.x = Math.PI / 2; sel.visible = false; g.add(sel);
        // orbit line
        const pts = []; for (let k = 0; k <= 128; k++) { const a = k / 128 * TAU; pts.push(new THREE.Vector3(Math.cos(a) * ipD(d.a), 0, Math.sin(a) * ipD(d.a))); }
        const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#334155', transparent: true, opacity: 0.6 })); S.add(orbit);
        return { g, m, own, sel, orbit };
    });
    this.fleetGeo = new THREE.ConeGeometry(0.55, 1.6, 6); this.fleetGeo.rotateX(Math.PI / 2);
    this.fleets = new Map(); this.booms = [];
    this.pathMat = new THREE.LineDashedMaterial({ color: '#fde68a', dashSize: 1.2, gapSize: 0.8, transparent: true, opacity: 0.7 });
    this.lab = document.createElement('div'); this.lab.id = 'ip-labels'; document.body.appendChild(this.lab);
    this.labels = IP_WORLDS.map((d, i) => { const e = document.createElement('div'); e.className = 'ip-lab'; e.dataset.i = i; this.lab.appendChild(e); return e; });
    this.lab.addEventListener('click', e => { const l = e.target.closest('.ip-lab'); if (l) IPU.select(+l.dataset.i, true); });
    // input layer above the globe
    const L = this.layer = document.createElement('div'); L.id = 'ip-input'; document.body.appendChild(L);
    let drag = null;
    L.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; L.setPointerCapture(e.pointerId); });
    L.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY; this.cam.yaw -= dx * 0.005; this.cam.pitch = clamp(this.cam.pitch + dy * 0.004, 0.08, 1.45); });
    L.addEventListener('pointerup', e => { if (drag && drag.moved < 6) this.pick(e.clientX, e.clientY); drag = null; });
    L.addEventListener('wheel', e => { e.preventDefault(); this.cam.dist = clamp(this.cam.dist * Math.pow(1.0015, e.deltaY * (e.deltaMode ? 30 : 1)), 6, 900); }, { passive: false });
    L.addEventListener('dblclick', () => { if (this.sel >= 0) this.focus(this.sel); });
};
IPV.pick = function (x, y) {
    const r = new THREE.Raycaster(), v = new THREE.Vector2(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); r.setFromCamera(v, this.camera);
    const hit = r.intersectObjects(this.P.map(p => p.m))[0];
    if (hit) IPU.select(hit.object.userData.i, false);
    else { // clicks near a planet count too (small worlds are tiny when zoomed out)
        let best = -1, bd = 28; this.P.forEach((p, i) => { const s = p.g.position.clone().project(this.camera), sx = (s.x + 1) / 2 * innerWidth, sy = (1 - s.y) / 2 * innerHeight, d = Math.hypot(sx - x, sy - y); if (s.z < 1 && d < bd) { bd = d; best = i; } });
        IPU.select(best, false);
    }
};
IPV.focus = function (i) { this.focusI = i; const d = IP_WORLDS[i]; this.cam.dist = clamp(d.r * 14 + 10, 14, 80); };
IPV.show = function (on) {
    this.init(); this.on = on;
    this.layer.style.display = on ? 'block' : 'none'; this.lab.style.display = on ? 'block' : 'none';
    const R = Globe.renderer;
    if (on) { this.oldCS = R.outputColorSpace; R.outputColorSpace = THREE.SRGBColorSpace; } else if (this.oldCS) { R.outputColorSpace = this.oldCS; Globe.dirty = true; }
};
IPV.frame = function (dt, t) {
    if (!IPG) return;
    const m = IPG.month + this.frac, C = this.cam;
    this.P.forEach((p, i) => {
        const pos = ipScreenPos(i, m); p.g.position.copy(pos); p.m.rotation.y += dt * 0.3;
        const w = IPG.worlds[i]; p.own.material.color.set(IP_COLS[w.owner]); p.own.visible = true; p.own.scale.setScalar(w.owner === IPG.me ? 1.15 : 1);
        p.sel.visible = this.sel === i; if (p.sel.visible) p.sel.rotation.z += dt;
    });
    // fleets: straight lines from where they left to where the target will be
    const seen = new Set();
    for (const f of IPG.fleets) {
        seen.add(f.id); let o = this.fleets.get(f.id);
        if (!o) { const mesh = new THREE.Mesh(this.fleetGeo, new THREE.MeshBasicMaterial({ color: IP_COLS[f.owner] })); this.scene.add(mesh); const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), this.pathMat); line.visible = f.owner === IPG.me || IPG.worlds[f.to].owner === IPG.me; this.scene.add(line); o = { mesh, line }; this.fleets.set(f.id, o); }
        const a = ipScreenPos(f.from, f.dep), b = ipScreenPos(f.to, f.arr), u = clamp((m - f.dep) / Math.max(1, f.arr - f.dep), 0, 1);
        const p = a.clone().lerp(b, u); p.y = Math.sin(u * Math.PI) * 4 + 1; o.mesh.position.copy(p); o.mesh.lookAt(b.x, 1, b.z);
        o.line.geometry.setFromPoints([p, new THREE.Vector3(b.x, 1, b.z)]); o.line.computeLineDistances();
    }
    for (const [id, o] of this.fleets) if (!seen.has(id)) { this.scene.remove(o.mesh); this.scene.remove(o.line); o.line.geometry.dispose(); this.fleets.delete(id); }
    // battle flashes
    for (const b of this.booms) { b.t += dt; b.s.scale.setScalar(4 + b.t * 30); b.s.material.opacity = Math.max(0, 1 - b.t * 1.2); b.s.position.copy(this.P[b.i].g.position); }
    this.booms = this.booms.filter(b => { if (b.t > 1) { this.scene.remove(b.s); return false; } return true; });
    // camera: follow the focused planet
    if (this.focusI != null) { const p = this.P[this.focusI].g.position; C.tx = lerp(C.tx, p.x, Math.min(1, dt * 4)); C.tz = lerp(C.tz, p.z, Math.min(1, dt * 4)); }
    const cam = this.camera, cp = Math.cos(C.pitch);
    cam.position.set(C.tx + Math.cos(C.yaw) * cp * C.dist, Math.sin(C.pitch) * C.dist, C.tz + Math.sin(C.yaw) * cp * C.dist); cam.lookAt(C.tx, 0, C.tz);
    const R = Globe.renderer, sz = R.getSize(new THREE.Vector2()); if (Math.abs(cam.aspect - sz.x / sz.y) > 1e-3) { cam.aspect = sz.x / sz.y; cam.updateProjectionMatrix(); }
    R.render(this.scene, cam);
    // labels
    const v = new THREE.Vector3();
    this.labels.forEach((e, i) => {
        const w = IPG.worlds[i], d = IP_WORLDS[i]; v.copy(this.P[i].g.position); v.y += d.r * 0.9 + 1.2; v.project(cam);
        const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1; e.style.display = vis ? 'block' : 'none'; if (!vis) return;
        e.style.transform = `translate(${(v.x + 1) / 2 * innerWidth}px, ${(1 - v.y) / 2 * innerHeight}px) translate(-50%, -100%)`;
        const html = `<i style="background:${IP_COLS[w.owner]}"></i>${esc(d.name)}${w.owner !== i ? `<small> (${esc(IP_WORLDS[w.owner].name)})</small>` : ''}${i === IPG.me ? ' ★' : ''}`;
        if (e._h !== html) { e.innerHTML = html; e._h = html; }
        e.classList.toggle('sel', this.sel === i); e.classList.toggle('mine', w.owner === IPG.me);
    });
};
IPV.battle = function (i, taken) {
    if (!this.scene) return;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ color: taken ? '#f97316' : '#e2e8f0', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); this.scene.add(s); this.booms.push({ s, i, t: 0 });
};
IPV.onLog = (t, who) => { if (window.IPU) IPU.logChanged(); };
IPV.techDone = t => { if (window.IPU) IPU.techDone(t); };
IPV.victory = id => { if (window.IPU) IPU.victory(id); };
IPV.ended = () => { if (window.IPU) IPU.ended(); };
window.IPV = IPV;
