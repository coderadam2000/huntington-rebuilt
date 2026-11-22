// ==========================================
// DESIGN ANYTHING 3D: a studio of 16 objects, each a model built from its options (every slider, colour, material,
// pattern and part rebuilds it live): car, sneaker, house, robot, cake, spaceship, guitar, burger, planet, castle,
// tree, sword, character, furniture, mug and trophy. Orbit with the mouse (drag turns, wheel zooms, right-drag or
// SHIFT-drag pans), pick lighting and a floor, Randomize, undo, save to My 3D designs, snapshot a PNG.
// The 2D poster editor (10-design.js) is still there: the "2D Posters" button.
// Save (synced, prefix taco): taco.design3d.v1 = { designs: [{ id, name, obj, p, env, img, at }] }
// ==========================================
import * as THREE from 'three';
const K3 = 'taco.design3d.v1';
let ST3 = { designs: [] };
try { ST3 = Object.assign(ST3, JSON.parse(localStorage.getItem(K3) || '{}') || {}); } catch (e) {}
const save3 = () => { try { localStorage.setItem(K3, JSON.stringify(ST3)); return true; } catch (e) { alert('Out of room on this device: delete an old 3D design first.'); return false; } };
// ---- materials, patterns, text ----
const FINISH = ['Matte', 'Satin', 'Glossy', 'Metallic', 'Chrome', 'Glow', 'Glass', 'Pearl', 'Velvet', 'Rubber'];
const PATTERNS = ['None', 'Stripes', 'Dots', 'Checker', 'Camo', 'Stars', 'Hearts', 'Flames', 'Zigzag', 'Plaid', 'Galaxy', 'Wood', 'Marble', 'Brick', 'Scales'];
const MATS = new Map(), TEX = new Map();
function patternTex(kind, c1, c2) {
    const key = kind + c1 + c2; if (TEX.has(key)) return TEX.get(key);
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d'); g.fillStyle = c1; g.fillRect(0, 0, 256, 256); g.fillStyle = c2; g.strokeStyle = c2;
    let s = 7; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
    if (kind === 'Stripes') for (let x = -256; x < 512; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 32, 0); g.lineTo(x + 288, 256); g.lineTo(x + 256, 256); g.fill(); }
    else if (kind === 'Dots') for (let y = 16; y < 256; y += 42) for (let x = (y / 42 % 2) * 21 + 16; x < 256; x += 42) { g.beginPath(); g.arc(x, y, 10, 0, 7); g.fill(); }
    else if (kind === 'Checker') for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2) g.fillRect(x * 32, y * 32, 32, 32);
    else if (kind === 'Camo') for (let i = 0; i < 40; i++) { g.globalAlpha = .55 + R() * .45; g.fillStyle = i % 3 ? c2 : '#3f3f2a'; g.beginPath(); g.ellipse(R() * 256, R() * 256, 20 + R() * 40, 12 + R() * 26, R() * 3, 0, 7); g.fill(); }
    else if (kind === 'Stars' || kind === 'Hearts') { g.font = '34px serif'; g.textAlign = 'center'; for (let y = 30; y < 256; y += 60) for (let x = (y / 60 % 2) * 30 + 30; x < 256; x += 60) g.fillText(kind === 'Stars' ? '★' : '♥', x, y + 12); }
    else if (kind === 'Flames') for (let i = 0; i < 9; i++) { const x = i * 32; g.beginPath(); g.moveTo(x - 10, 256); g.quadraticCurveTo(x + 30, 140, x + 8, 40 + R() * 40); g.quadraticCurveTo(x + 40, 150, x + 34, 256); g.fill(); }
    else if (kind === 'Zigzag') { g.lineWidth = 14; for (let y = 20; y < 256; y += 48) { g.beginPath(); for (let x = 0; x <= 256; x += 32) g.lineTo(x, y + (x / 32 % 2 ? 18 : -18)); g.stroke(); } }
    else if (kind === 'Plaid') { g.globalAlpha = .5; for (let k = 0; k < 256; k += 64) { g.fillRect(k, 0, 22, 256); g.fillRect(0, k, 256, 22); } g.globalAlpha = .8; g.lineWidth = 3; for (let k = 40; k < 256; k += 64) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 256); g.moveTo(0, k); g.lineTo(256, k); g.stroke(); } }
    else if (kind === 'Galaxy') { const gr = g.createRadialGradient(128, 128, 10, 128, 128, 180); gr.addColorStop(0, c2); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); g.fillStyle = '#fff'; for (let i = 0; i < 140; i++) { g.globalAlpha = R(); g.fillRect(R() * 256, R() * 256, 2, 2); } }
    else if (kind === 'Wood') { g.lineWidth = 3; for (let y = 0; y < 256; y += 9) { g.globalAlpha = .25 + R() * .3; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(80, y + R() * 12, 170, y - R() * 12, 256, y); g.stroke(); } }
    else if (kind === 'Marble') { g.lineWidth = 2; for (let i = 0; i < 16; i++) { g.globalAlpha = .2 + R() * .5; g.beginPath(); let x = R() * 256, y = 0; g.moveTo(x, y); while (y < 256) { x += (R() - .5) * 30; y += 12; g.lineTo(x, y); } g.stroke(); } }
    else if (kind === 'Brick') { for (let y = 0; y < 256; y += 32) for (let x = (y / 32 % 2) * 32; x < 288; x += 64) { g.fillRect(x - 64 + 3, y + 3, 58, 26); } }
    else if (kind === 'Scales') { g.lineWidth = 3; for (let y = 0; y < 280; y += 24) for (let x = (y / 24 % 2) * 16; x < 280; x += 32) { g.beginPath(); g.arc(x, y, 16, 0, Math.PI); g.stroke(); } }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; TEX.set(key, t); return t;
}
function M(color, finish, pattern, color2, scale) {
    finish = finish || 'Satin'; pattern = pattern || 'None'; const key = [color, finish, pattern, color2, scale].join('|'); if (MATS.has(key)) return MATS.get(key);
    const o = { color: pattern === 'None' ? color : '#ffffff', roughness: .5, metalness: 0 };
    if (pattern !== 'None') { o.map = patternTex(pattern, color, color2 || '#ffffff'); if (scale) { o.map = o.map.clone(); o.map.repeat.set(scale, scale); o.map.needsUpdate = true; } }
    let m;
    if (finish === 'Matte') m = new THREE.MeshStandardMaterial(Object.assign(o, { roughness: .95 }));
    else if (finish === 'Glossy') m = new THREE.MeshPhysicalMaterial(Object.assign(o, { roughness: .25, clearcoat: 1, clearcoatRoughness: .05 }));
    else if (finish === 'Metallic') m = new THREE.MeshPhysicalMaterial(Object.assign(o, { roughness: .35, metalness: .75, clearcoat: .6 }));
    else if (finish === 'Chrome') m = new THREE.MeshStandardMaterial(Object.assign(o, { roughness: .06, metalness: 1 }));
    else if (finish === 'Glow') m = new THREE.MeshStandardMaterial(Object.assign(o, { emissive: color, emissiveIntensity: 1.4, roughness: .4 }));
    else if (finish === 'Glass') m = new THREE.MeshPhysicalMaterial(Object.assign(o, { roughness: .05, transmission: .85, thickness: .5, transparent: true, opacity: .55 }));
    else if (finish === 'Pearl') m = new THREE.MeshPhysicalMaterial(Object.assign(o, { roughness: .3, iridescence: 1, iridescenceIOR: 1.6, clearcoat: 1 }));
    else if (finish === 'Velvet') m = new THREE.MeshPhysicalMaterial(Object.assign(o, { roughness: .9, sheen: 1, sheenColor: new THREE.Color(color).offsetHSL(0, 0, .25), sheenRoughness: .5 }));
    else if (finish === 'Rubber') m = new THREE.MeshStandardMaterial(Object.assign(o, { roughness: 1, color: pattern === 'None' ? new THREE.Color(color).multiplyScalar(.85) : '#ffffff' }));
    else m = new THREE.MeshStandardMaterial(o);
    MATS.set(key, m); return m;
}
const glowM = c => M(c, 'Glow'), glassM = c => M(c || '#9fd3ff', 'Glass');
function textTex(text, bg, fg, w, h, font) {
    const cv = document.createElement('canvas'); cv.width = w || 512; cv.height = h || 128; const g = cv.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = fg; g.font = font || `bold ${cv.height * .55}px Arial Black, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cv.width / 2, cv.height / 2 + 2);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// ---- little builders ----
const G = () => new THREE.Group();
function put(parent, mesh, x, y, z, rx, ry, rz, s) { mesh.position.set(x || 0, y || 0, z || 0); mesh.rotation.set(rx || 0, ry || 0, rz || 0); if (s) Array.isArray(s) ? mesh.scale.set(...s) : mesh.scale.setScalar(s); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh; }
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (rt, rb, h, m, seg) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 28), m);
const sph = (r, m, ws, hs) => new THREE.Mesh(new THREE.SphereGeometry(r, ws || 28, hs || 18), m);
const cone = (r, h, m, seg) => new THREE.Mesh(new THREE.ConeGeometry(r, h, seg || 24), m);
const tor = (r, t, m, arc) => new THREE.Mesh(new THREE.TorusGeometry(r, t, 12, 36, arc || Math.PI * 2), m);
const cap = (r, l, m) => new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 14), m);
function extrude(pts, depth, m, bevel) { const sh = new THREE.Shape(); pts.forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y)); const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: !!bevel, bevelThickness: bevel || 0, bevelSize: bevel || 0, bevelSegments: 4, steps: 1, curveSegments: 18 }); geo.translate(0, 0, -depth / 2); return new THREE.Mesh(geo, m); }
function lathe(pts, m, seg) { return new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg || 40), m); }
function shapeMesh(sh, depth, m, bevel) { const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: !!bevel, bevelThickness: bevel || 0, bevelSize: bevel || 0, bevelSegments: 4, curveSegments: 24 }); geo.translate(0, 0, -depth / 2); return new THREE.Mesh(geo, m); }
const rnd = (a, b) => a + Math.random() * (b - a);
// option helpers: [key, label, kind, default, ...]   kind: n (min,max,step) c (colour) s (choices) b (on/off) t (text)
const n = (k, l, d, a, b, st) => [k, l, 'n', d, a, b, st || (b - a > 20 ? 1 : .01)], c = (k, l, d) => [k, l, 'c', d], s = (k, l, d, ch) => [k, l, 's', d, ch], b = (k, l, d) => [k, l, 'b', d], t = (k, l, d) => [k, l, 't', d];
const fin = (k, l, d) => s(k, l, d, FINISH), pat = (k, l, d) => s(k, l, d || 'None', PATTERNS);
// ==========================================
// THE OBJECTS: groups of options, and a build(p) that returns a THREE.Group sitting on y = 0
// ==========================================
const OBJ = {};
OBJ.car = { n: 'Car', ic: '🏎️', groups: {
    Shape: [s('style', 'Body', 'Sports', ['Sports', 'Sedan', 'SUV', 'Pickup', 'Van', 'Race car', 'Hatchback', 'Muscle']), n('len', 'Length', 4.3, 3, 6), n('wid', 'Width', 1.9, 1.4, 2.6), n('hgt', 'Height', 1, .6, 1.8), n('ride', 'Ride height', .12, 0, .8)],
    Paint: [c('col', 'Paint', '#e11d48'), fin('fin', 'Finish', 'Glossy'), s('tone', 'Two-tone', 'Stripes', ['None', 'Roof', 'Stripes', 'Lower half']), c('col2', 'Second colour', '#ffffff'), pat('pat', 'Wrap pattern'), c('patc', 'Pattern colour', '#111827'), c('glass', 'Window tint', '#1e293b')],
    Wheels: [n('wr', 'Wheel size', .38, .25, .7), n('tw', 'Tyre width', .26, .15, .5), n('spk', 'Spokes', 5, 3, 12, 1), c('rim', 'Rim colour', '#d4d4d8'), fin('rimf', 'Rim finish', 'Chrome'), c('tyre', 'Tyre colour', '#18181b'), b('wl', 'White walls', false)],
    Extras: [s('wing', 'Spoiler', 'Wing', ['None', 'Lip', 'Wing', 'Huge wing']), s('roof', 'Roof', 'None', ['None', 'Rack', 'Light bar', 'Sunroof', 'Surfboard']), n('exh', 'Exhausts', 2, 0, 4, 1), c('lights', 'Headlights', '#fef9c3'), b('glow', 'Underglow', true), c('glowc', 'Underglow colour', '#22d3ee'), t('plate', 'Plate', 'TACO 1'), b('num', 'Race number', false), n('racen', 'Number', 7, 0, 99, 1)] },
    build(p) {
        const g = G(), L = p.len, W = p.wid, H = p.hgt, r = p.wr, base = r * .75 + p.ride, k = L / 4.3;
        const prof = { Sports: [[-2.15, 0], [2.15, 0], [2.2, .32], [1.6, .42], [.7, .52], [-1.3, .55], [-2.15, .48]], Sedan: [[-2.15, 0], [2.15, 0], [2.18, .4], [1.4, .5], [-1.6, .55], [-2.15, .5]], SUV: [[-2.1, 0], [2.1, 0], [2.15, .55], [1.5, .65], [-2.1, .68]], Pickup: [[-2.2, 0], [2.2, 0], [2.22, .55], [1.5, .62], [-2.2, .62]], Van: [[-2.15, 0], [2.15, 0], [2.18, .5], [1.6, .55], [-2.15, .55]], 'Race car': [[-2.2, 0], [2.3, 0], [2.4, .12], [1, .3], [-1.8, .38], [-2.2, .3]], Hatchback: [[-1.9, 0], [1.9, 0], [1.95, .42], [1.2, .5], [-1.9, .55]], Muscle: [[-2.25, 0], [2.25, 0], [2.3, .5], [1.2, .55], [-1.8, .6], [-2.25, .58]] }[p.style];
        const cabin = { Sports: [[1, 0], [.1, .38], [-.9, .4], [-1.7, 0]], Sedan: [[1.1, 0], [.4, .45], [-.8, .45], [-1.5, 0]], SUV: [[1.3, 0], [.9, .55], [-2, .55], [-2.05, 0]], Pickup: [[1.3, 0], [.9, .55], [-.3, .55], [-.35, 0]], Van: [[1.6, 0], [1.1, .75], [-2.1, .75], [-2.12, 0]], 'Race car': [[.3, 0], [0, .22], [-.5, .22], [-.7, 0]], Hatchback: [[1, 0], [.4, .5], [-1.6, .45], [-1.85, 0]], Muscle: [[.9, 0], [.2, .42], [-.9, .42], [-1.5, 0]] }[p.style];
        const sc = ([x, y]) => [x * k, y * H / .55 * .55];
        const paint = M(p.col, p.fin, p.pat, p.patc, 2), paint2 = M(p.col2, p.fin);
        const BW = W - p.tw * 1.3, body = put(g, extrude(prof.map(sc), BW, p.tone === 'Lower half' ? paint2 : paint, .06), 0, base, 0);
        if (p.tone === 'Lower half') put(g, extrude(prof.map(([x, y]) => sc([x, Math.max(y, .26)])), BW + .02, paint, .05), 0, base, 0);
        const beltY = base + Math.max(...prof.map(q => q[1])) * H * .9;
        put(g, extrude(cabin.map(sc), BW - .2, glassM(p.glass), .04), 0, beltY - .02, 0);
        const top = Math.max(...cabin.map(q => q[1])) * H, roofX = (cabin[1][0] + cabin[2][0]) / 2 * k, roofL = Math.abs(cabin[1][0] - cabin[2][0]) * k;
        put(g, box(roofL + .05, .05, BW - .16, p.tone === 'Roof' ? paint2 : paint), roofX, beltY + top + .01, 0);
        if (p.style === 'Pickup') { put(g, box(1.7 * k, .05, W - .1, M('#27272a', 'Rubber')), -1.3 * k, beltY - .1, 0); }
        if (p.tone === 'Stripes') for (const z of [-.13, .13]) put(g, box(L * .98, .02, .12, paint2), 0, beltY + .015, z);
        // wheels
        const tyre = M(p.tyre, 'Rubber'), rim = M(p.rim, p.rimf);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
            const w = G(); put(g, w, sx * L * .31, r, sz * (W / 2 - p.tw / 2));
            put(w, cyl(r, r, p.tw, tyre, 32), 0, 0, 0, Math.PI / 2); put(w, cyl(r * .66, r * .66, p.tw + .02, rim, 24), 0, 0, 0, Math.PI / 2);
            if (p.wl) put(w, tor(r * .82, r * .06, M('#ffffff', 'Rubber')), 0, 0, sz * (p.tw / 2 + .005));
            for (let i = 0; i < p.spk; i++) put(w, box(r * .12, r * 1.2, .03, rim), 0, 0, sz * (p.tw / 2 + .02), 0, 0, i / p.spk * Math.PI * 2);
            put(w, cyl(r * .14, r * .14, p.tw + .06, M('#71717a', 'Metallic')), 0, 0, 0, Math.PI / 2);
        }
        // lights, spoiler, roof, exhausts, plate, number
        const front = Math.max(...prof.map(q => q[0])) * k, back = Math.min(...prof.map(q => q[0])) * k;
        for (const z of [-1, 1]) { put(g, box(.06, .1, .32, glowM(p.lights)), front + .03, base + .32 * H, z * (W / 2 - .3)); put(g, box(.06, .08, .3, glowM('#ef4444')), back - .03, base + .38 * H, z * (W / 2 - .3)); }
        if (p.wing !== 'None') { const big = p.wing === 'Huge wing', hgt = p.wing === 'Lip' ? .02 : big ? .45 : .22, wy = base + Math.max(...prof.filter(q => q[0] < 0).map(q => q[1])) * H;
            if (p.wing !== 'Lip') for (const z of [-.5, .5]) put(g, box(.06, hgt, .05, paint2), back * .9, wy + hgt / 2, z * W * .6);
            put(g, box(big ? .55 : .35, .05, W * (big ? 1.05 : .9), paint2), back * .9, wy + hgt + .02, 0, 0, 0, -.08); }
        const ry = beltY + top + .05;
        if (p.roof === 'Rack') { for (const z of [-.35, .35]) put(g, box(roofL * .9, .04, .04, M('#18181b', 'Metallic')), roofX, ry + .06, z * W); for (let i = -1; i <= 1; i++) put(g, box(.04, .04, W * .75, M('#18181b', 'Metallic')), roofX + i * roofL * .3, ry + .08, 0); }
        if (p.roof === 'Light bar') put(g, box(.12, .1, W * .8, glowM('#fde68a')), roofX + roofL * .35, ry + .07, 0);
        if (p.roof === 'Sunroof') put(g, box(roofL * .5, .02, W * .5, glassM('#0f172a')), roofX, ry, 0);
        if (p.roof === 'Surfboard') put(g, sph(.5, M('#38bdf8', 'Glossy', 'Stripes', '#ffffff'), 24, 12), roofX, ry + .1, 0, 0, 0, 0, [3.2, .08, .7]);
        for (let i = 0; i < p.exh; i++) put(g, cyl(.05, .05, .25, M('#a1a1aa', 'Chrome')), back - .05, base + .1, (i - (p.exh - 1) / 2) * .16, 0, 0, Math.PI / 2);
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(.52, .13), new THREE.MeshStandardMaterial({ map: textTex(p.plate || ' ', '#fde68a', '#1e3a8a') })); put(g, pl, back - .075, base + .2, 0, 0, -Math.PI / 2);
        if (p.num) for (const z of [-1, 1]) { const d = new THREE.Mesh(new THREE.CircleGeometry(.24, 32), new THREE.MeshStandardMaterial({ map: textTex(String(p.racen), '#ffffff', '#111827', 256, 256), transparent: true })); put(g, d, .1, base + .3 * H, z * (W / 2 + .01), 0, z > 0 ? 0 : Math.PI); }
        if (p.glow) { const u = new THREE.Mesh(new THREE.PlaneGeometry(L * .85, W * .8), new THREE.MeshBasicMaterial({ color: p.glowc, transparent: true, opacity: .55 })); put(g, u, 0, .02, 0, -Math.PI / 2); const pt = new THREE.PointLight(p.glowc, 3, 3); pt.position.set(0, .15, 0); g.add(pt); }
        return g;
    } };
OBJ.sneaker = { n: 'Sneaker', ic: '👟', groups: {
    Shape: [s('cut', 'Cut', 'Low top', ['Low top', 'Mid top', 'High top', 'Slip-on', 'Runner']), n('sole', 'Sole height', .28, .15, 1), n('len', 'Length', 2.8, 2.2, 3.6), n('wide', 'Width', 1.05, .8, 1.4), s('toe', 'Toe', 'Round', ['Round', 'Pointy', 'Chunky'])],
    Colours: [c('up', 'Upper', '#f8fafc'), fin('upf', 'Upper material', 'Satin'), pat('pat', 'Upper pattern'), c('patc', 'Pattern colour', '#ef4444'), c('toec', 'Toe cap', '#e5e7eb'), c('heel', 'Heel', '#ef4444'), c('soleC', 'Sole', '#ffffff'), fin('solef', 'Sole material', 'Rubber'), c('out', 'Outsole', '#d6d3d1')],
    Details: [n('stripes', 'Side stripes', 1, 0, 5, 1), s('stripe', 'Stripe style', 'Wave', ['Wave', 'Lightning', 'Star', 'Slanted']), c('stc', 'Stripe colour', '#111827'), c('lace', 'Laces', '#111827'), n('laces', 'Lace rows', 5, 0, 8, 1), c('tongue', 'Tongue', '#ef4444'), b('gsole', 'Glow sole', false), c('gsc', 'Glow colour', '#22d3ee'), b('air', 'Air bubble', true), b('tag', 'Heel tag', true), t('tagt', 'Tag text', 'TACO')] },
    build(p) {
        const g = G(), L = p.len, W = p.wide, sh = p.sole, hi = { 'Low top': .95, 'Mid top': 1.3, 'High top': 1.75, 'Slip-on': .8, Runner: .9 }[p.cut];
        const toeY = p.toe === 'Chunky' ? .6 : .45, tip = p.toe === 'Pointy' ? .25 : .05;
        const up = M(p.up, p.upf, p.pat, p.patc, 1.5);
        const prof = [[-L / 2, 0], [L / 2 - tip, 0], [L / 2, .1], [L / 2 - .15, toeY], [L * .1, .62], [-L * .1, hi * .85], [-L * .28, hi], [-L / 2 + .05, hi * .95], [-L / 2 - .02, .3]];
        const upper = put(g, extrude(prof, W * .82, up, .1), 0, sh, 0);
        put(g, extrude([[L * .18, 0], [L / 2 - tip, 0], [L / 2, .1], [L / 2 - .15, toeY + .02], [L * .2, .5]], W * .86, M(p.toec, p.upf), .08), 0, sh, 0);
        put(g, extrude([[-L / 2 - .02, 0], [-L * .3, 0], [-L * .32, hi * .7], [-L / 2 + .02, hi * .9]], W * .86, M(p.heel, p.upf), .09), 0, sh, 0);
        // sole: a rounded footprint, glowing if you like
        const fp = new THREE.Shape(); fp.absellipse(0, 0, L / 2 + .12, W / 2 + .08, 0, Math.PI * 2);
        const sole = put(g, shapeMesh(fp, sh, p.gsole ? glowM(p.gsc) : M(p.soleC, p.solef), .04), 0, sh / 2, 0, Math.PI / 2, 0, 0);
        put(g, shapeMesh(fp, .06, M(p.out, 'Rubber')), 0, .03, 0, Math.PI / 2);
        if (p.air) put(g, cap(sh * .3, .5, glassM('#bae6fd')), -L * .28, sh * .55, W / 2 + .05, 0, 0, Math.PI / 2);
        // stripes on both sides
        for (const z of [-1, 1]) for (let i = 0; i < p.stripes; i++) {
            const x0 = -L * .05 + i * .18, sm = M(p.stc, 'Satin');
            let pts = p.stripe === 'Slanted' ? [[x0, .1], [x0 + .1, .1], [x0 + .38, .62], [x0 + .28, .62]] : p.stripe === 'Lightning' ? [[x0, .1], [x0 + .25, .35], [x0 + .12, .37], [x0 + .38, .62], [x0 + .1, .32], [x0 + .22, .3]] : null;
            if (p.stripe === 'Wave') pts = Array.from({ length: 9 }, (_, j) => [-L * .3 + j * L * .07, .2 + i * .1 + Math.sin(j) * .05]).concat(Array.from({ length: 9 }, (_, j) => [-L * .3 + (8 - j) * L * .07, .26 + i * .1 + Math.sin(8 - j) * .05]));
            if (p.stripe === 'Star') { if (i) continue; pts = Array.from({ length: 10 }, (_, j) => { const a = j / 10 * Math.PI * 2 - Math.PI / 2, rr = j % 2 ? .1 : .24; return [Math.cos(a) * rr, .4 + Math.sin(a) * rr]; }); }
            put(g, extrude(pts, .02, sm), 0, sh, z * (W * .41 + .1));
        }
        for (let i = 0; i < p.laces; i++) { const lx = L * .08 - i * .16, ly = sh + .62 + Math.max(0, -lx) * (hi - .62) / (L * .35) + .1; put(g, box(.05, .04, W * .62, M(p.lace, 'Satin')), lx, ly, 0, 0, 0, -.35); }
        put(g, box(.5, .06, W * .5, M(p.tongue, p.upf)), -L * .2, sh + hi + .02, 0, 0, 0, .25);
        if (p.tag) { const tg = new THREE.Mesh(new THREE.PlaneGeometry(.45, .14), new THREE.MeshStandardMaterial({ map: textTex(p.tagt || ' ', p.heel, '#ffffff') })); put(g, tg, -L / 2 - .13, sh + hi * .7, 0, 0, -Math.PI / 2); }
        g.scale.setScalar(.8); return g;
    } };
OBJ.house = { n: 'House', ic: '🏡', groups: {
    Shape: [n('floors', 'Floors', 2, 1, 5, 1), n('w', 'Width', 5, 3, 9), n('d', 'Depth', 4, 3, 7), s('roof', 'Roof', 'Gable', ['Gable', 'Hip', 'Flat', 'Dome', 'A-frame', 'Barn', 'Pagoda'])],
    Walls: [c('wall', 'Walls', '#fde68a'), s('wallp', 'Wall style', 'Paint', ['Paint', 'Brick', 'Wood', 'Stone', 'Stripes']), c('trim', 'Trim', '#ffffff'), c('roofc', 'Roof', '#b91c1c'), fin('rooff', 'Roof finish', 'Matte')],
    Windows: [n('win', 'Windows per floor', 3, 0, 6, 1), c('winc', 'Glass', '#7dd3fc'), b('lit', 'Lights on', true), c('litc', 'Light colour', '#fde68a'), c('door', 'Door', '#7c2d12'), s('doors', 'Door style', 'Arched', ['Plain', 'Arched', 'Double', 'Round'])],
    Yard: [b('chim', 'Chimney', true), b('garage', 'Garage', true), b('porch', 'Porch', true), b('balc', 'Balcony', false), b('solar', 'Solar panels', false), b('fence', 'Fence', true), c('fencec', 'Fence', '#ffffff'), n('trees', 'Trees', 3, 0, 8, 1), c('lawn', 'Lawn', '#65a30d'), b('pool', 'Pool', false), b('mail', 'Mailbox', true)] },
    build(p) {
        const g = G(), W = p.w, D = p.d, fh = 1.4, H = p.floors * fh;
        const wp = { Paint: 'None', Brick: 'Brick', Wood: 'Wood', Stone: 'Marble', Stripes: 'Stripes' }[p.wallp], wall = M(p.wall, 'Matte', wp, p.wallp === 'Brick' ? '#9a3412' : p.wallp === 'Stone' ? '#78716c' : p.trim, 2);
        put(g, new THREE.Mesh(new THREE.CylinderGeometry(Math.max(W, D) * 1.1, Math.max(W, D) * 1.15, .1, 48), M(p.lawn, 'Matte')), 0, .05, 0);
        put(g, box(W, H, D, wall), 0, H / 2 + .1, 0);
        for (let f = 1; f < p.floors; f++) put(g, box(W + .06, .08, D + .06, M(p.trim, 'Satin')), 0, .1 + f * fh, 0);
        const rm = M(p.roofc, p.rooff), top = H + .1;
        if (p.roof === 'Gable' || p.roof === 'A-frame' || p.roof === 'Barn') { const rh = p.roof === 'A-frame' ? W * .9 : W * .4, pts = p.roof === 'Barn' ? [[-W / 2 - .2, 0], [-W * .38, rh * .7], [0, rh], [W * .38, rh * .7], [W / 2 + .2, 0]] : [[-W / 2 - .2, 0], [0, rh], [W / 2 + .2, 0]]; put(g, extrude(pts, D + .3, rm), 0, top, 0); put(g, extrude(pts.map(([x, y]) => [x * .9, y * .9]), D + .02, wall), 0, top, 0); }
        else if (p.roof === 'Hip') put(g, cone(Math.hypot(W, D) / 2 + .2, W * .4, rm, 4), 0, top + W * .2, 0, 0, Math.PI / 4, 0, [W / Math.hypot(W, D) * 1.45, 1, D / Math.hypot(W, D) * 1.45]);
        else if (p.roof === 'Flat') { put(g, box(W + .2, .2, D + .2, rm), 0, top + .1, 0); }
        else if (p.roof === 'Dome') put(g, new THREE.Mesh(new THREE.SphereGeometry(Math.min(W, D) / 2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), rm), 0, top, 0);
        else if (p.roof === 'Pagoda') for (let i = 0; i < 3; i++) put(g, cone((W / 2 + .5) * (1 - i * .25), .7, rm, 4), 0, top + .35 + i * .6, 0, 0, Math.PI / 4, 0, [1, 1, D / W]);
        // windows on the front and back
        const glass = p.lit ? M(p.litc, 'Glow') : M(p.winc, 'Glossy'), frame = M(p.trim, 'Satin');
        for (let f = 0; f < p.floors; f++) for (let i = 0; i < p.win; i++) for (const z of [-1, 1]) {
            const x = -W / 2 + (i + .5) * W / p.win; if (f === 0 && z > 0 && Math.abs(x) < .55) continue;
            put(g, box(.62, .72, .05, frame), x, .1 + f * fh + .8, z * (D / 2 + .01)); put(g, box(.5, .6, .06, glass), x, .1 + f * fh + .8, z * (D / 2 + .015));
        }
        const dm = M(p.door, 'Satin');
        if (p.doors === 'Round') put(g, cyl(.45, .45, .08, dm, 32), 0, .65, D / 2 + .03, Math.PI / 2);
        else { const dw = p.doors === 'Double' ? 1.1 : .7; put(g, box(dw, 1.1, .08, dm), 0, .65, D / 2 + .03); if (p.doors === 'Arched') put(g, new THREE.Mesh(new THREE.CylinderGeometry(dw / 2, dw / 2, .08, 24, 1, false, -Math.PI / 2, Math.PI), dm), 0, 1.2, D / 2 + .03, Math.PI / 2); put(g, sph(.04, M('#facc15', 'Chrome')), dw / 2 - .12, .65, D / 2 + .09); }
        if (p.chim) put(g, box(.5, 1.4, .5, M('#9a3412', 'Matte', 'Brick', '#7c2d12', 1)), W * .28, top + .6, -D * .15);
        if (p.garage) { put(g, box(2.6, 1.5, D * .8, wall), W / 2 + 1.3, .85, -D * .1); put(g, box(2.1, 1.1, .06, M(p.trim, 'Satin', 'Stripes', '#d4d4d8', 1)), W / 2 + 1.3, .65, D * .3 + .02); put(g, box(2.8, .12, D * .85, rm), W / 2 + 1.3, 1.65, -D * .1); }
        if (p.porch) { put(g, box(W * .6, .12, 1.2, M('#a16207', 'Matte', 'Wood', '#78350f')), 0, .16, D / 2 + .6); put(g, box(W * .62, .1, 1.3, rm), 0, 1.6, D / 2 + .65); for (const x of [-1, 1]) put(g, cyl(.06, .06, 1.45, frame), x * W * .28, .88, D / 2 + 1.15); }
        if (p.balc && p.floors > 1) { put(g, box(W * .5, .1, .9, frame), 0, .1 + fh + .05, D / 2 + .45); for (let i = 0; i < 9; i++) put(g, box(.04, .5, .04, frame), -W * .24 + i * W * .06, .1 + fh + .35, D / 2 + .88); }
        if (p.solar) for (let i = 0; i < 3; i++) put(g, box(.9, .05, .6, M('#1e3a8a', 'Glossy', 'Checker', '#334155', 4)), -W * .3 + i * W * .3, top + (p.roof === 'Flat' ? .25 : W * .2), D * .2, p.roof === 'Flat' ? 0 : -.5);
        if (p.fence) { const R2 = Math.max(W, D) * 1.05, fm = M(p.fencec, 'Satin'); for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2; if (Math.abs(a - Math.PI / 2) < .18) continue; put(g, box(.08, .6, .04, fm), Math.cos(a) * R2, .4, Math.sin(a) * R2, 0, -a); } put(g, tor(R2, .025, fm), 0, .55, 0, Math.PI / 2); }
        for (let i = 0; i < p.trees; i++) { const a = i / Math.max(1, p.trees) * Math.PI * 2 + .5, rr = Math.max(W, D) * .85, x = Math.cos(a) * rr, z = Math.sin(a) * rr; put(g, cyl(.1, .14, 1, M('#78350f', 'Matte')), x, .6, z); put(g, sph(.6, M('#15803d', 'Matte'), 10, 8), x, 1.4, z); }
        if (p.pool) put(g, box(2.2, .06, 1.4, M('#38bdf8', 'Glossy')), -W * .55, .12, D * .75);
        if (p.mail) { put(g, cyl(.04, .04, .8, M('#52525b', 'Metallic')), W * .35, .5, D / 2 + 2.2); put(g, box(.3, .22, .45, M('#2563eb', 'Glossy')), W * .35, .95, D / 2 + 2.2); }
        g.scale.setScalar(.42); return g;
    } };
OBJ.robot = { n: 'Robot', ic: '🤖', groups: {
    Body: [s('head', 'Head', 'Box', ['Box', 'Dome', 'Can', 'TV', 'Skull', 'Star']), s('torso', 'Torso', 'Barrel', ['Barrel', 'Box', 'Egg', 'Hero']), n('h', 'Height', 1, .7, 1.5), n('bulk', 'Bulk', 1, .7, 1.5)],
    Limbs: [s('arms', 'Arms', 'Claws', ['Claws', 'Hands', 'Cannons', 'Drills', 'None']), s('legs', 'Legs', 'Legs', ['Legs', 'Wheels', 'Treads', 'Hover', 'Spider']), n('armL', 'Arm length', 1, .6, 1.6)],
    Look: [c('c1', 'Main colour', '#94a3b8'), c('c2', 'Second colour', '#2563eb'), c('c3', 'Accent', '#f59e0b'), fin('f', 'Finish', 'Metallic'), pat('pat', 'Pattern'), c('patc', 'Pattern colour', '#1e293b')],
    Face: [n('eyes', 'Eyes', 2, 1, 5, 1), s('eyest', 'Eye style', 'Round', ['Round', 'Visor', 'Square', 'Hearts']), c('eyec', 'Eye glow', '#22d3ee'), s('ant', 'Antenna', 'One', ['None', 'One', 'Two', 'Dish', 'Propeller']), b('chest', 'Chest light', true), c('chestc', 'Chest light', '#ef4444'), b('jet', 'Jetpack', false), b('cape', 'Cape', false)] },
    build(p) {
        const g = G(), k = p.h, bk = p.bulk, m1 = M(p.c1, p.f, p.pat, p.patc, 2), m2 = M(p.c2, p.f), m3 = M(p.c3, p.f), eye = glowM(p.eyec);
        let hip = { Legs: 1.1, Wheels: .55, Treads: .55, Hover: .9, Spider: .9 }[p.legs] * k;
        if (p.legs === 'Legs') for (const x of [-1, 1]) { put(g, cyl(.13 * bk, .15 * bk, .6 * k, m2), x * .25 * bk, hip - .3 * k, 0); put(g, sph(.15 * bk, m3), x * .25 * bk, hip - .62 * k, 0); put(g, cyl(.12 * bk, .14 * bk, .4 * k, m2), x * .25 * bk, hip - .85 * k, 0); put(g, box(.3 * bk, .14, .45 * bk, m1), x * .25 * bk, .07, .07); }
        if (p.legs === 'Wheels') for (const x of [-1, 1]) put(g, cyl(.28, .28, .2, M('#18181b', 'Rubber')), x * .45 * bk, .28, 0, 0, 0, Math.PI / 2);
        if (p.legs === 'Treads') for (const x of [-1, 1]) { put(g, cap(.24, .7, M('#27272a', 'Rubber', 'Stripes', '#52525b', 3)), x * .45 * bk, .26, 0, Math.PI / 2); }
        if (p.legs === 'Hover') { put(g, cyl(.35 * bk, .2, .25, m2), 0, hip - .25, 0); put(g, cone(.25, .6, glowM(p.eyec), 20), 0, hip - .7, 0, Math.PI); }
        if (p.legs === 'Spider') for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const l = G(); put(g, l, Math.cos(a) * .3, hip - .1, Math.sin(a) * .3, 0, -a); put(l, cyl(.05, .05, .7, m2), .3, .15, 0, 0, 0, -1.1); put(l, cyl(.04, .03, .9, m2), .65, -.35, 0, 0, 0, .35); }
        const th = .75 * k, ty = hip + th / 2;
        const torso = { Barrel: () => cyl(.38 * bk, .34 * bk, th, m1), Box: () => box(.75 * bk, th, .5 * bk, m1), Egg: () => sph(.42 * bk, m1), Hero: () => extrude([[-.45, th / 2], [.45, th / 2], [.25, -th / 2], [-.25, -th / 2]].map(([x, y]) => [x * bk, y]), .45 * bk, m1, .05) }[p.torso]();
        put(g, torso, 0, ty, 0, 0, 0, 0, p.torso === 'Egg' ? [1, th / .84, .8] : null);
        if (p.chest) put(g, cyl(.1, .1, .05, glowM(p.chestc)), 0, ty + .05, .27 * bk + (p.torso === 'Box' ? 0 : .08), Math.PI / 2);
        const sy = ty + th / 2 - .1;
        if (p.arms !== 'None') for (const x of [-1, 1]) {
            const a = G(); put(g, a, x * (.48 * bk), sy, 0, 0, 0, x * .15); put(a, sph(.12 * bk, m3), 0, 0, 0); const L = .5 * p.armL;
            put(a, cyl(.07 * bk, .07 * bk, L, m2), 0, -L / 2, 0); put(a, sph(.09 * bk, m3), 0, -L, 0); put(a, cyl(.07 * bk, .06 * bk, L, m2), 0, -L * 1.5, .05);
            const hy = -L * 2;
            if (p.arms === 'Claws') for (const z of [-1, 1]) put(a, box(.04, .2, .06, m3), 0, hy, z * .06, z * .4);
            if (p.arms === 'Hands') put(a, sph(.1 * bk, m1), 0, hy, 0);
            if (p.arms === 'Cannons') { put(a, cyl(.09, .09, .35, m1), 0, hy, .1, Math.PI / 2); put(a, cyl(.05, .05, .02, glowM(p.eyec)), 0, hy, .28, Math.PI / 2); }
            if (p.arms === 'Drills') put(a, cone(.1, .35, M('#a1a1aa', 'Chrome'), 8), 0, hy - .1, 0, Math.PI);
        }
        const hy = ty + th / 2 + .3 * k, head = { Box: () => box(.55, .45, .45, m1), Dome: () => sph(.3, m1), Can: () => cyl(.26, .26, .45, m1), TV: () => box(.65, .5, .35, m2), Skull: () => sph(.3, m1, 16, 10), Star: () => extrude(Array.from({ length: 10 }, (_, j) => { const a2 = j / 10 * Math.PI * 2 + Math.PI / 2, r2 = j % 2 ? .16 : .36; return [Math.cos(a2) * r2, Math.sin(a2) * r2]; }), .3, m1, .03) }[p.head]();
        put(g, cyl(.08, .1, .15, m2), 0, ty + th / 2 + .05, 0); put(g, head, 0, hy, 0, 0, 0, 0, p.head === 'Skull' ? [1, 1.1, 1] : null);
        const fz = { Box: .23, Dome: .27, Can: .27, TV: .18, Skull: .27, Star: .17 }[p.head];
        if (p.eyest === 'Visor') put(g, box(.44, .1, .05, eye), 0, hy + .03, fz);
        else for (let i = 0; i < p.eyes; i++) { const x = (i - (p.eyes - 1) / 2) * .13; const e = p.eyest === 'Square' ? box(.09, .09, .04, eye) : p.eyest === 'Hearts' ? extrude([[0, -.05], [.06, .01], [.04, .05], [0, .03], [-.04, .05], [-.06, .01]], .03, eye) : sph(.05, eye); put(g, e, x, hy + .04, fz); }
        put(g, box(.2, .03, .03, m3), 0, hy - .1, fz);
        const top = hy + .27;
        if (p.ant === 'One' || p.ant === 'Two') for (const x of p.ant === 'One' ? [0] : [-.14, .14]) { put(g, cyl(.015, .015, .3, m3), x, top + .12, 0); put(g, sph(.05, glowM(p.c3)), x, top + .29, 0); }
        if (p.ant === 'Dish') { put(g, cyl(.02, .02, .15, m3), 0, top + .05, 0); put(g, new THREE.Mesh(new THREE.SphereGeometry(.18, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.5), m3), 0, top + .3, 0, Math.PI); }
        if (p.ant === 'Propeller') { put(g, cyl(.02, .02, .15, m3), 0, top + .05, 0); put(g, box(.8, .02, .07, m2), 0, top + .13, 0, 0, .5); }
        if (p.jet) { for (const x of [-.15, .15]) { put(g, cyl(.11, .11, .5, m2), x, ty + .05, -.35); put(g, cone(.09, .3, glowM('#fb923c'), 16), x, ty - .35, -.35, Math.PI); } }
        if (p.cape) put(g, box(.8 * bk, th * 1.4, .03, M(p.c2, 'Velvet')), 0, ty - .15, -.3, .15);
        return g;
    } };
OBJ.cake = { n: 'Cake', ic: '🎂', groups: {
    Tiers: [n('tiers', 'Tiers', 3, 1, 5, 1), n('size', 'Bottom size', 1.4, .8, 2), n('th', 'Tier height', .6, .3, 1), s('shape', 'Shape', 'Round', ['Round', 'Square', 'Heart', 'Hexagon', 'Star']), s('style', 'Frosting', 'Drip', ['Smooth', 'Drip', 'Ruffles', 'Naked', 'Polka'])],
    Colours: [c('f1', 'Bottom tier', '#fbcfe8'), c('f2', 'Middle tiers', '#f9a8d4'), c('f3', 'Top tier', '#f472b6'), c('drip', 'Drip / ruffle', '#7c2d12'), fin('ff', 'Frosting finish', 'Satin'), c('plate', 'Plate', '#f8fafc'), fin('pf', 'Plate finish', 'Glossy')],
    Toppings: [n('spr', 'Sprinkles', 60, 0, 300, 1), b('rain', 'Rainbow sprinkles', true), n('berries', 'Strawberries', 6, 0, 14, 1), n('cand', 'Candles', 5, 0, 12, 1), c('candc', 'Candle colour', '#60a5fa'), b('lit', 'Lit candles', true), s('topper', 'Topper', 'Star', ['None', 'Star', 'Heart', 'Cherry', 'Crown', 'Number']), t('num', 'Number', '10'), b('stand', 'Cake stand', true)] },
    build(p) {
        const g = G(); let y = 0;
        if (p.stand) { put(g, cyl(p.size * .7 + .3, p.size * .7 + .35, .06, M(p.plate, p.pf), 48), 0, .7, 0); put(g, cyl(.12, .3, .67, M(p.plate, p.pf)), 0, .335, 0); y = .73; } else { put(g, cyl(p.size * .7 + .3, p.size * .7 + .3, .05, M(p.plate, p.pf), 48), 0, .025, 0); y = .05; }
        const seg = { Round: 48, Square: 4, Hexagon: 6, Heart: 48, Star: 48 }[p.shape];
        const R = rr => { if (p.shape === 'Heart') { const sh = new THREE.Shape(); sh.moveTo(0, -rr); sh.bezierCurveTo(rr * 1.4, -rr * .1, rr * .9, rr * 1.1, 0, rr * .45); sh.bezierCurveTo(-rr * .9, rr * 1.1, -rr * 1.4, -rr * .1, 0, -rr); return sh; } if (p.shape === 'Star') { const sh = new THREE.Shape(); for (let j = 0; j < 10; j++) { const a = j / 10 * Math.PI * 2 + Math.PI / 2, r2 = j % 2 ? rr * .6 : rr * 1.05; j ? sh.lineTo(Math.cos(a) * r2, Math.sin(a) * r2) : sh.moveTo(Math.cos(a) * r2, Math.sin(a) * r2); } return sh; } return null; };
        let topR = 0;
        for (let i = 0; i < p.tiers; i++) {
            const rr = p.size * .5 * (1 - i * (.55 / Math.max(1, p.tiers))), col = i === 0 ? p.f1 : i === p.tiers - 1 ? p.f3 : p.f2, fm = M(col, p.ff, p.style === 'Polka' ? 'Dots' : 'None', '#ffffff', 3);
            const naked = p.style === 'Naked', sh = R(rr);
            const tier = sh ? shapeMesh(sh, p.th, naked ? M('#d6a05c', 'Matte', 'Stripes', col, 6) : fm, .03) : cyl(rr, rr, p.th, naked ? M('#d6a05c', 'Matte', 'Stripes', col, 6) : fm, seg);
            put(g, tier, 0, y + p.th / 2, 0, sh ? -Math.PI / 2 : 0, seg === 4 ? Math.PI / 4 : 0);
            if (p.style === 'Drip') for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2, l = .1 + (k * 7 % 5) * .05; put(g, cap(.045, l, M(p.drip, 'Glossy')), Math.cos(a) * rr * .98, y + p.th - l / 2, Math.sin(a) * rr * .98); }
            if (p.style === 'Drip' || p.style === 'Ruffles') put(g, tor(rr * .97, p.style === 'Ruffles' ? .07 : .05, M(p.drip, p.style === 'Ruffles' ? 'Satin' : 'Glossy')), 0, y + p.th, 0, Math.PI / 2);
            if (p.style === 'Ruffles') for (let k = 0; k < 3; k++) put(g, tor(rr * 1.01, .05, M(col, 'Satin')), 0, y + .1 + k * p.th * .3, 0, Math.PI / 2);
            y += p.th; topR = rr;
        }
        // sprinkles and fruit on the top
        const pal = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ffffff'];
        for (let i = 0; i < p.spr; i++) { const a = i * 2.39996, rr = Math.sqrt(i / Math.max(1, p.spr)) * topR * .85; put(g, cap(.012, .04, M(p.rain ? pal[i % 6] : '#ffffff', 'Glossy')), Math.cos(a) * rr, y + .015, Math.sin(a) * rr, Math.PI / 2, 0, a); }
        for (let i = 0; i < p.berries; i++) { const a = i / p.berries * Math.PI * 2; put(g, cone(.08, .16, M('#dc2626', 'Glossy'), 12), Math.cos(a) * topR * .78, y + .08, Math.sin(a) * topR * .78, Math.PI); }
        for (let i = 0; i < p.cand; i++) { const a = i / p.cand * Math.PI * 2 + .3, rr = topR * .5; put(g, cyl(.025, .025, .3, M(p.candc, 'Satin', 'Stripes', '#ffffff', 2)), Math.cos(a) * rr, y + .15, Math.sin(a) * rr); if (p.lit) { put(g, sph(.035, glowM('#fbbf24')), Math.cos(a) * rr, y + .34, Math.sin(a) * rr, 0, 0, 0, [1, 1.7, 1]); } }
        const tm = M('#facc15', 'Metallic');
        if (p.topper === 'Star') put(g, extrude(Array.from({ length: 10 }, (_, j) => { const a = j / 10 * Math.PI * 2 + Math.PI / 2, r2 = j % 2 ? .07 : .17; return [Math.cos(a) * r2, Math.sin(a) * r2]; }), .04, tm), 0, y + .35, 0);
        if (p.topper === 'Heart') put(g, extrude([[0, -.15], [.15, .02], [.1, .12], [0, .07], [-.1, .12], [-.15, .02]], .05, M('#e11d48', 'Glossy'), .02), 0, y + .3, 0);
        if (p.topper === 'Cherry') { put(g, sph(.1, M('#b91c1c', 'Glossy')), 0, y + .1, 0); put(g, cyl(.01, .01, .2, M('#166534', 'Matte')), .03, y + .25, 0, 0, 0, -.3); }
        if (p.topper === 'Crown') { put(g, cyl(.14, .14, .12, tm, 16), 0, y + .08, 0); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; put(g, cone(.04, .1, tm, 6), Math.cos(a) * .14, y + .19, Math.sin(a) * .14); } }
        if (p.topper === 'Number') { const pl = new THREE.Mesh(new THREE.PlaneGeometry(.5, .35), new THREE.MeshStandardMaterial({ map: textTex(p.num || '1', 'rgba(0,0,0,0)', '#facc15', 256, 180), transparent: true, side: THREE.DoubleSide })); put(g, pl, 0, y + .25, 0); }
        return g;
    } };
OBJ.ship = { n: 'Spaceship', ic: '🚀', groups: {
    Hull: [s('type', 'Type', 'Rocket', ['Rocket', 'Saucer', 'Fighter', 'Shuttle']), n('len', 'Length', 3, 1.5, 5), n('rad', 'Thickness', .45, .25, .9), s('nose', 'Nose', 'Cone', ['Cone', 'Round', 'Needle', 'Flat'])],
    Colours: [c('c1', 'Hull', '#f8fafc'), c('c2', 'Trim', '#dc2626'), fin('f', 'Finish', 'Glossy'), pat('pat', 'Hull pattern'), c('patc', 'Pattern colour', '#1e40af'), c('win', 'Windows', '#60a5fa')],
    Parts: [n('fins', 'Fins', 4, 0, 8, 1), n('fs', 'Fin size', 1, .4, 2), n('boost', 'Side boosters', 2, 0, 6, 1), n('wins', 'Windows', 3, 0, 8, 1), b('stripe', 'Stripe', true), t('decal', 'Name', 'TACO-1')],
    Engine: [c('flame', 'Flame colour', '#f97316'), n('fl', 'Flame length', 1.2, 0, 3), b('smoke', 'Smoke ring', false), b('launch', 'Launch pad', true)] },
    build(p) {
        const g = G(), L = p.len, R = p.rad, m1 = M(p.c1, p.f, p.pat, p.patc, 2), m2 = M(p.c2, p.f), fl = glowM(p.flame);
        let y0 = p.launch ? .3 : 0; if (p.launch) { put(g, cyl(R * 3.5, R * 3.8, .3, M('#52525b', 'Matte', 'Checker', '#3f3f46', 6), 8), 0, .15, 0); for (const x of [-1, 1]) put(g, box(.15, L * .9, .15, M('#a1a1aa', 'Metallic', 'Zigzag', '#facc15', 4)), x * R * 2.4, .3 + L * .45, 0); }
        if (p.type === 'Saucer') {
            const ss = G(); put(g, ss, 0, y0 + L * .4 + .4, 0);
            put(ss, sph(L * .45, m1), 0, 0, 0, 0, 0, 0, [1, .22, 1]); put(ss, new THREE.Mesh(new THREE.SphereGeometry(L * .17, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), glassM(p.win)), 0, L * .06, 0);
            put(ss, tor(L * .4, .04, m2), 0, 0, 0, Math.PI / 2); for (let i = 0; i < Math.max(p.wins, 1) * 2; i++) { const a = i / (Math.max(p.wins, 1) * 2) * Math.PI * 2; put(ss, sph(.06, glowM(p.win)), Math.cos(a) * L * .4, -.02, Math.sin(a) * L * .4); }
            if (p.fl > 0) put(ss, cone(L * .2, p.fl, new THREE.MeshBasicMaterial({ color: p.flame, transparent: true, opacity: .35 }), 24), 0, -p.fl / 2 - .1, 0, Math.PI);
            return g;
        }
        const body = G(); put(g, body, 0, y0 + (p.fl > 0 ? p.fl * .3 : 0), 0);
        if (p.type === 'Fighter') body.rotation.x = 0;
        put(body, cyl(R, R * .95, L, m1, 32), 0, L / 2 + .2, 0);
        const ny = L + .2, nm = p.nose === 'Needle' ? cone(R * .5, L * .5, m2) : p.nose === 'Round' ? new THREE.Mesh(new THREE.SphereGeometry(R, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), m2) : p.nose === 'Flat' ? cyl(R * .7, R, R * .4, m2) : cone(R, L * .35, m2);
        put(body, nm, 0, ny + (p.nose === 'Round' ? 0 : p.nose === 'Flat' ? R * .2 : p.nose === 'Needle' ? L * .25 : L * .175), 0);
        put(body, cyl(R * .7, R * .9, .25, M('#3f3f46', 'Metallic')), 0, .1, 0);
        if (p.fl > 0) { put(body, cone(R * .7, p.fl, fl, 20), 0, -p.fl / 2, 0, Math.PI); put(body, cone(R * .4, p.fl * .6, glowM('#fef08a'), 16), 0, -p.fl * .3, 0, Math.PI); }
        if (p.smoke) put(g, tor(R * 3, R * .8, M('#e5e7eb', 'Matte')), 0, .3, 0, Math.PI / 2);
        if (p.stripe) put(body, cyl(R * 1.01, R * 1.01, .18, m2, 32), 0, L * .7, 0);
        for (let i = 0; i < p.wins; i++) { const a = i * .9 - (p.wins - 1) * .45; put(body, cyl(R * .2, R * .2, .05, glassM(p.win)), Math.sin(a) * R, L * .82 - (i % 2) * .2, Math.cos(a) * R, Math.PI / 2, 0, 0).lookAt(Math.sin(a) * 9, L * .82, Math.cos(a) * 9); }
        for (let i = 0; i < p.fins; i++) { const a = i / p.fins * Math.PI * 2, f = extrude([[0, 0], [.7 * p.fs, -.25], [.7 * p.fs, .25], [0, 1 * p.fs]], .05, m2); put(body, f, Math.sin(a) * R, .3, Math.cos(a) * R, 0, a - Math.PI / 2); }
        for (let i = 0; i < p.boost; i++) { const a = i / p.boost * Math.PI * 2 + .4, bx = Math.sin(a) * R * 1.6, bz = Math.cos(a) * R * 1.6; put(body, cyl(R * .35, R * .35, L * .45, m1, 20), bx, L * .25, bz); put(body, cone(R * .35, L * .12, m2, 20), bx, L * .53, bz); if (p.fl > 0) put(body, cone(R * .28, p.fl * .6, fl, 16), bx, -p.fl * .3 + .02, bz, Math.PI); }
        if (p.type === 'Fighter' || p.type === 'Shuttle') for (const s2 of [-1, 1]) put(body, extrude([[0, 0], [L * .55, 0], [L * .2, L * .5]], .06, m1, .02), s2 * R * .2, L * .1 + .2, 0, 0, s2 > 0 ? 0 : Math.PI, Math.PI / 2 * 0);
        const d = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.005, R * 1.005, .3, 32, 1, true, -.7, 1.4), new THREE.MeshStandardMaterial({ map: textTex(p.decal || ' ', p.c1, p.c2, 512, 96), transparent: true })); put(body, d, 0, L * .5, 0);
        g.scale.setScalar(.7); return g;
    } };
OBJ.guitar = { n: 'Guitar', ic: '🎸', groups: {
    Body: [s('shape', 'Body shape', 'Classic', ['Classic', 'Single cut', 'Flying V', 'Star', 'Round', 'Explorer']), n('size', 'Body size', 1, .75, 1.3), c('col', 'Body colour', '#dc2626'), fin('f', 'Finish', 'Glossy'), pat('pat', 'Body pattern', 'Flames'), c('patc', 'Pattern colour', '#facc15'), b('acoustic', 'Sound hole (acoustic)', false)],
    Neck: [n('neck', 'Neck length', 1, .7, 1.4), n('frets', 'Frets', 20, 12, 24, 1), c('neckc', 'Neck wood', '#a16207'), c('board', 'Fretboard', '#3f1d0b'), s('inlay', 'Inlays', 'Dots', ['None', 'Dots', 'Blocks', 'Stars']), c('head', 'Headstock', '#111827')],
    Hardware: [n('strings', 'Strings', 6, 4, 12, 1), n('pick', 'Pickups', 2, 0, 3, 1), c('pg', 'Pickguard', '#f8fafc'), b('pgo', 'Pickguard', true), n('knobs', 'Knobs', 3, 0, 5, 1), fin('hw', 'Hardware', 'Chrome'), b('strap', 'Strap', true), c('strapc', 'Strap', '#1e293b'), pat('strapp', 'Strap pattern', 'Zigzag')] },
    build(p) {
        const g = G(), S = p.size, bm = M(p.col, p.f, p.pat, p.patc, 1.2), hw = M('#e4e4e7', p.hw);
        const sh = new THREE.Shape(), B = S * .6;
        if (p.shape === 'Classic' || p.shape === 'Single cut') { sh.moveTo(0, -B * 1.2); sh.bezierCurveTo(B * 1.25, -B * 1.2, B * 1.2, -B * .1, B * .7, B * .15); sh.bezierCurveTo(B * .95, B * .5, B * .9, B * 1.05, p.shape === 'Single cut' ? B * .25 : B * .45, B * 1.1); sh.lineTo(-B * .45, B * 1.1); sh.bezierCurveTo(-B * .9, B * 1.05, -B * .95, B * .5, -B * .7, B * .15); sh.bezierCurveTo(-B * 1.2, -B * .1, -B * 1.25, -B * 1.2, 0, -B * 1.2); }
        else if (p.shape === 'Flying V') { sh.moveTo(-.1, B * .9); sh.lineTo(-B * .9, -B * 1.4); sh.lineTo(-B * .45, -B * 1.4); sh.lineTo(0, -B * .1); sh.lineTo(B * .45, -B * 1.4); sh.lineTo(B * .9, -B * 1.4); sh.lineTo(.1, B * .9); }
        else if (p.shape === 'Star') for (let j = 0; j < 10; j++) { const a = j / 10 * Math.PI * 2 + Math.PI / 2, r = j % 2 ? B * .45 : B * 1.15; j ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r - B * .2) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r - B * .2); }
        else if (p.shape === 'Round') sh.absellipse(0, -B * .1, B * 1.05, B * 1.15, 0, Math.PI * 2);
        else { sh.moveTo(-B * .2, B * 1.1); sh.lineTo(B * .9, B * .5); sh.lineTo(B * .6, -B * .2); sh.lineTo(B * 1.1, -B * 1.2); sh.lineTo(-B * .8, -B * .9); sh.lineTo(-B * .6, B * .4); }
        if (p.acoustic) { const h = new THREE.Path(); h.absellipse(0, B * .35, B * .28, B * .28, 0, Math.PI * 2, true); sh.holes.push(h); }
        const body = G(); put(g, body, 0, 0, 0);
        put(body, shapeMesh(sh, p.acoustic ? .4 : .18, bm, .03), 0, 0, 0);
        if (p.acoustic) put(body, cyl(B * .28, B * .28, .38, M('#1c0a00', 'Matte')), 0, B * .35, 0, Math.PI / 2);
        if (p.pgo && !p.acoustic) put(body, extrude([[-B * .1, B * .9], [B * .6, B * .2], [B * .5, -B * .5], [-B * .05, -B * .3]], .01, M(p.pg, 'Glossy')), 0, 0, .1);
        const NL = 2.1 * p.neck, nz = .1;
        put(body, box(.22, NL, .1, M(p.neckc, 'Satin', 'Wood', '#713f12', 1)), 0, B * .9 + NL / 2, 0);
        put(body, box(.2, NL, .02, M(p.board, 'Matte')), 0, B * .9 + NL / 2, .06);
        for (let i = 1; i <= p.frets; i++) { const y = B * .9 + NL - NL * (1 - Math.pow(.5, i / 12)) * 1.3; if (y < B * .9) break; put(body, box(.2, .008, .025, hw), 0, y, .07); if (p.inlay !== 'None' && [3, 5, 7, 9, 12, 15, 17, 19, 21].includes(i)) { const im = M('#f8fafc', 'Pearl'); put(body, p.inlay === 'Blocks' ? box(.12, .04, .01, im) : p.inlay === 'Stars' ? extrude(Array.from({ length: 10 }, (_, j) => { const a = j / 10 * Math.PI * 2, r = j % 2 ? .012 : .03; return [Math.cos(a) * r, Math.sin(a) * r]; }), .005, im) : cyl(.02, .02, .01, im, 12), 0, y + .03, .075, p.inlay === 'Dots' ? Math.PI / 2 : 0); } }
        const hy = B * .9 + NL; put(body, extrude([[-.13, 0], [.13, 0], [.2, .45], [-.05, .55], [-.15, .3]], .07, M(p.head, 'Glossy')), 0, hy, 0);
        for (let i = 0; i < p.strings; i++) { const x = (i - (p.strings - 1) / 2) * (.16 / p.strings); put(body, cyl(.003, .003, hy - B * .7, hw, 4), x, (hy + B * .7) / 2 - B * .7 + B * .35, .1); put(body, cyl(.015, .015, .08, hw, 8), (i % 2 ? .17 : -.17), hy + .1 + Math.floor(i / 2) * .12, 0, 0, 0, Math.PI / 2); }
        put(body, box(.25, .06, .04, hw), 0, -B * .35, .1);
        for (let i = 0; i < p.pick; i++) put(body, box(.26, .09, .03, M('#111827', 'Satin')), 0, B * .55 - i * .25, .1);
        for (let i = 0; i < p.knobs; i++) put(body, cyl(.04, .04, .05, hw, 16), B * .45 + (i % 2) * .1, -B * .6 + i * .12, .1, Math.PI / 2);
        if (p.strap) { const st = new THREE.Mesh(new THREE.TorusGeometry(B * 1.6, .03, 6, 40, Math.PI * 1.1), M(p.strapc, 'Velvet', p.strapp, '#64748b', 8)); put(body, st, 0, B * .5, -.15, 0, 0, Math.PI * -.05); }
        g.rotation.z = -.35; const w = G(); put(w, g, 0, 1.7, 0); return w;
    } };
OBJ.burger = { n: 'Burger', ic: '🍔', groups: {
    Buns: [c('bun', 'Bun', '#d97706'), s('bunT', 'Bun type', 'Sesame', ['Sesame', 'Plain', 'Brioche', 'Pretzel', 'Charcoal', 'Rainbow']), n('size', 'Size', 1, .7, 1.4)],
    Stack: [n('patties', 'Patties', 2, 1, 6, 1), s('patty', 'Patty', 'Beef', ['Beef', 'Chicken', 'Veggie', 'Fish']), n('cheese', 'Cheese slices', 2, 0, 6, 1), c('cheesec', 'Cheese', '#fbbf24'), b('lettuce', 'Lettuce', true), n('tom', 'Tomato slices', 2, 0, 4, 1), b('onion', 'Onion rings', true), n('pick', 'Pickles', 3, 0, 8, 1), n('bacon', 'Bacon strips', 2, 0, 5, 1), b('egg', 'Fried egg', false)],
    Extras: [c('sauce', 'Sauce', '#dc2626'), n('drip', 'Sauce drips', 6, 0, 14, 1), b('flag', 'Toothpick flag', true), c('flagc', 'Flag', '#22c55e'), b('fries', 'Fries', true), b('plate', 'Plate', true), c('platec', 'Plate', '#ffffff')] },
    build(p) {
        const g = G(), S = p.size, R = .9 * S; let y = 0;
        if (p.plate) { put(g, cyl(R * 1.8, R * 1.7, .06, M(p.platec, 'Glossy'), 48), 0, .03, 0); y = .06; }
        const bunCol = { Sesame: p.bun, Plain: p.bun, Brioche: '#c2410c', Pretzel: '#78350f', Charcoal: '#27272a', Rainbow: p.bun }[p.bunT], bm = M(bunCol, p.bunT === 'Brioche' ? 'Glossy' : 'Satin', p.bunT === 'Rainbow' ? 'Stripes' : 'None', '#a855f7', 2);
        put(g, cyl(R, R * .95, .3 * S, bm, 40), 0, y + .15 * S, 0); y += .3 * S;
        const layer = (mesh, h) => { put(g, mesh, 0, y + h / 2, 0); y += h; };
        const pc = { Beef: '#5b2c0f', Chicken: '#d97706', Veggie: '#4d7c0f', Fish: '#fcd34d' }[p.patty];
        for (let i = 0; i < p.patties; i++) {
            layer(cyl(R * 1.05, R * 1.05, .22 * S, M(pc, 'Matte', p.patty === 'Beef' ? 'Camo' : 'None', '#3b1d0b', 3), 40), .22 * S);
            if (i < p.cheese) { const ch = box(R * 1.9, .04, R * 1.9, M(p.cheesec, 'Glossy')); put(g, ch, 0, y + .02, 0, 0, i * .5); y += .04; for (let k = 0; k < 4; k++) { const a = i * .5 + k * Math.PI / 2 + Math.PI / 4; put(g, cone(.12, .25, M(p.cheesec, 'Glossy'), 4), Math.cos(a) * R * 1.25, y - .12, Math.sin(a) * R * 1.25, Math.PI); } }
        }
        for (let i = p.patties; i < p.cheese; i++) { put(g, box(R * 1.9, .04, R * 1.9, M(p.cheesec, 'Glossy')), 0, y + .02, 0, 0, i * .5); y += .04; }
        for (let i = 0; i < p.bacon; i++) { const bc = G(); put(g, bc, 0, y + .03, 0, 0, i * .7); for (let k = 0; k < 8; k++) put(bc, box(.22, .04, .22, M(k % 2 ? '#b91c1c' : '#fca5a5', 'Satin')), -R + k * .26, Math.sin(k) * .03, 0); y += .05; }
        if (p.egg) { layer(cyl(R * 1.1, R * 1.1, .04, M('#ffffff', 'Glossy'), 30), .04); put(g, sph(.25 * S, M('#f59e0b', 'Glossy')), .1, y, 0, 0, 0, 0, [1, .4, 1]); }
        for (let i = 0; i < p.tom; i++) { layer(cyl(R * .9, R * .9, .07, M('#dc2626', 'Glossy'), 30), .07); }
        if (p.onion) { for (let i = 0; i < 3; i++) put(g, tor(R * (.35 + i * .2), .03, M('#f5f3ff', 'Glossy')), 0, y + .03, 0, Math.PI / 2); y += .06; }
        for (let i = 0; i < p.pick; i++) { const a = i / Math.max(1, p.pick) * Math.PI * 2; put(g, cyl(.16, .16, .03, M('#65a30d', 'Glossy', 'Dots', '#a3e635', 4), 18), Math.cos(a) * R * .55, y + .02, Math.sin(a) * R * .55); } if (p.pick) y += .04;
        if (p.lettuce) { const geo = new THREE.CylinderGeometry(R * 1.2, R * 1.25, .08, 48, 1); const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), a = Math.atan2(z, x); pos.setY(i, pos.getY(i) + Math.sin(a * 12) * .05); } geo.computeVertexNormals(); layer(new THREE.Mesh(geo, M('#4ade80', 'Glossy')), .08); }
        for (let i = 0; i < p.drip; i++) { const a = i / Math.max(1, p.drip) * Math.PI * 2, l = .12 + (i % 3) * .07; put(g, cap(.04, l, M(p.sauce, 'Glossy')), Math.cos(a) * R * 1.02, y - l / 2, Math.sin(a) * R * 1.02); }
        put(g, new THREE.Mesh(new THREE.SphereGeometry(R, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), bm), 0, y, 0, 0, 0, 0, [1, .75 * S, 1]);
        if (p.bunT === 'Sesame') for (let i = 0; i < 40; i++) { const a = i * 2.4, rr = Math.sqrt(i / 40) * R * .85, hy = Math.sqrt(Math.max(0, 1 - (rr / R) ** 2)) * R * .75 * S; put(g, sph(.025, M('#fef3c7', 'Satin'), 8, 6), Math.cos(a) * rr, y + hy, Math.sin(a) * rr, 0, a, 0, [1.6, .6, 1]); }
        if (p.bunT === 'Pretzel') for (let i = 0; i < 4; i++) put(g, box(R * 1.3, .02, .04, M('#fef3c7', 'Matte')), 0, y + R * .74 * S, (i - 1.5) * .25, 0, .4);
        const top = y + R * .75 * S;
        if (p.flag) { put(g, cyl(.015, .015, 1, M('#d6a05c', 'Matte')), 0, top + .1, 0); const fl = new THREE.Mesh(new THREE.PlaneGeometry(.4, .25), M(p.flagc, 'Satin', 'Checker', '#ffffff', 2)); fl.material.side = THREE.DoubleSide; put(g, fl, .2, top + .45, 0); }
        if (p.fries) { const fx = R * 1.5; put(g, cyl(.35, .28, .5, M('#dc2626', 'Glossy'), 4), fx, .31, -R, 0, Math.PI / 4); for (let i = 0; i < 14; i++) put(g, box(.05, .55, .05, M('#fcd34d', 'Satin')), fx + (i % 4 - 1.5) * .1, .65, -R + (Math.floor(i / 4) - 1.5) * .08, (i % 3 - 1) * .15, 0, (i % 5 - 2) * .1); }
        return g;
    } };
OBJ.planet = { n: 'Planet', ic: '🪐', groups: {
    World: [n('r', 'Size', 1.2, .6, 2), c('sea', 'Oceans', '#1d4ed8'), c('land', 'Land', '#16a34a'), c('land2', 'Highlands', '#a16207'), n('landAmt', 'Land amount', .45, 0, 1), n('seed', 'World seed', 7, 1, 99, 1), b('ice', 'Ice caps', true), b('lava', 'Lava world', false), n('spin', 'Axis tilt', .4, 0, 1.4)],
    Sky: [n('clouds', 'Clouds', .5, 0, 1), c('cloudc', 'Cloud colour', '#ffffff'), b('atmo', 'Atmosphere glow', true), c('atmoc', 'Glow colour', '#60a5fa')],
    Rings: [b('rings', 'Rings', true), c('ringc', 'Ring colour', '#fcd34d'), c('ringc2', 'Ring colour 2', '#a16207'), n('ringw', 'Ring width', 1, .3, 2.5), n('ringt', 'Ring tilt', .45, 0, 1.4)],
    Moons: [n('moons', 'Moons', 2, 0, 6, 1), c('moonc', 'Moon colour', '#d4d4d8'), b('sat', 'Space station', false)] },
    build(p) {
        const g = G(), R = p.r, cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const x = cv.getContext('2d'), img = x.createImageData(512, 256);
        const col = h => { const v = parseInt(h.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }, sea = col(p.lava ? '#7f1d1d' : p.sea), ld = col(p.lava ? '#1c1917' : p.land), hl = col(p.lava ? '#f97316' : p.land2);
        const sd = p.seed * 13.7, nz = (a, b2, c2) => Math.sin(a * 3.1 + sd) * Math.cos(b2 * 2.7 - sd * .5) + Math.sin(c2 * 4.3 + a * 1.7 + sd) * .6 + Math.sin(a * 7.9 - c2 * 6.1) * .3 + Math.cos(b2 * 9.3 + c2 * 8.7 + sd) * .2;
        for (let py = 0; py < 256; py++) for (let px = 0; px < 512; px++) { const lat = (py / 256 - .5) * Math.PI, lon = px / 512 * Math.PI * 2, X = Math.cos(lat) * Math.cos(lon), Y = Math.sin(lat), Z = Math.cos(lat) * Math.sin(lon), h = nz(X, Y, Z) / 2.1 + .5, isLand = h > 1 - p.landAmt * .8 - .1; let c3 = isLand ? (h > 1.02 - p.landAmt * .4 ? hl : ld) : sea;
            if (p.ice && Math.abs(Y) > .85) c3 = [240, 248, 255]; const o = (py * 512 + px) * 4; const sh = isLand ? 1 : .85 + h * .2; img.data[o] = c3[0] * sh; img.data[o + 1] = c3[1] * sh; img.data[o + 2] = c3[2] * sh; img.data[o + 3] = 255; }
        x.putImageData(img, 0, 0); const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
        const pl = G(); put(g, pl, 0, R + .3, 0, 0, 0, p.spin);
        put(pl, sph(R, new THREE.MeshStandardMaterial({ map: tx, roughness: .8, emissive: p.lava ? '#ff4500' : '#000000', emissiveMap: p.lava ? tx : null, emissiveIntensity: p.lava ? .6 : 0 }), 64, 32));
        if (p.clouds > 0) { const cc = document.createElement('canvas'); cc.width = 512; cc.height = 256; const y2 = cc.getContext('2d'); y2.fillStyle = p.cloudc; for (let i = 0; i < 260 * p.clouds; i++) { y2.globalAlpha = .25 + Math.random() * .4; y2.beginPath(); y2.ellipse(Math.random() * 512, 30 + Math.random() * 196, 10 + Math.random() * 40, 4 + Math.random() * 8, 0, 0, 7); y2.fill(); } const ct = new THREE.CanvasTexture(cc); put(pl, sph(R * 1.02, new THREE.MeshStandardMaterial({ map: ct, transparent: true, depthWrite: false }), 48, 24)); }
        if (p.atmo) put(pl, sph(R * 1.12, new THREE.MeshBasicMaterial({ color: p.atmoc, transparent: true, opacity: .18, side: THREE.BackSide, depthWrite: false }), 48, 24));
        if (p.rings) { const rc = document.createElement('canvas'); rc.width = 256; rc.height = 4; const r2 = rc.getContext('2d'); for (let i = 0; i < 256; i++) { r2.fillStyle = i % 17 < 9 ? p.ringc : p.ringc2; r2.globalAlpha = .4 + Math.sin(i * .3) * .3 + .2; r2.fillRect(i, 0, 1, 4); } const rt = new THREE.CanvasTexture(rc); const geo = new THREE.RingGeometry(R * 1.3, R * (1.4 + p.ringw), 96, 1); const pos = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < pos.count; i++) { const d = Math.hypot(pos.getX(i), pos.getY(i)); uv.setXY(i, (d - R * 1.3) / (R * (.1 + p.ringw)), .5); } const ring = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: rt, transparent: true, side: THREE.DoubleSide, depthWrite: false })); put(g, ring, 0, R + .3, 0, Math.PI / 2 - p.ringt); }
        for (let i = 0; i < p.moons; i++) { const a = i / p.moons * Math.PI * 2 + .5, d = R * (2 + i * .45); put(g, sph(R * (.12 + (i % 3) * .05), M(p.moonc, 'Matte', 'Dots', '#a1a1aa', 3), 24, 12), Math.cos(a) * d, R + .3 + Math.sin(a * 2) * .3, Math.sin(a) * d); }
        if (p.sat) { const st = G(); put(g, st, R * 1.8, R * 1.4 + .3, 0); put(st, cyl(.06, .06, .5, M('#e5e7eb', 'Metallic')), 0, 0, 0, 0, 0, Math.PI / 2); for (const s2 of [-1, 1]) put(st, box(.4, .01, .2, M('#1e3a8a', 'Glossy', 'Checker', '#334155', 4)), s2 * .45, 0, 0); }
        return g;
    } };
OBJ.castle = { n: 'Castle', ic: '🏰', groups: {
    Layout: [n('towers', 'Towers', 4, 3, 8, 1), n('size', 'Size', 3, 2, 5), n('th', 'Tower height', 2.6, 1.5, 4.5), n('wh', 'Wall height', 1.4, .8, 2.5), b('keep', 'Central keep', true), n('kh', 'Keep height', 3.4, 2, 6)],
    Stone: [c('stone', 'Stone', '#a8a29e'), s('stonep', 'Stone style', 'Brick', ['Brick', 'Smooth', 'Marble', 'Scales']), c('roof', 'Roofs', '#1d4ed8'), fin('rooff', 'Roof finish', 'Glossy'), s('roofs', 'Roof style', 'Cone', ['Cone', 'Onion', 'Flat battlements', 'Spire'])],
    Details: [b('flags', 'Flags', true), c('flagc', 'Flags', '#dc2626'), b('gate', 'Gate', true), c('gatec', 'Gate', '#78350f'), b('moat', 'Moat', true), c('water', 'Water', '#0ea5e9'), b('bridge', 'Drawbridge', true), b('windows', 'Glowing windows', true), c('winc', 'Window light', '#fde68a')] },
    build(p) {
        const g = G(), S = p.size, N = p.towers, sm = M(p.stone, 'Matte', p.stonep === 'Smooth' ? 'None' : p.stonep, '#78716c', 3), rm = M(p.roof, p.rooff);
        if (p.moat) { put(g, new THREE.Mesh(new THREE.RingGeometry(S * 1.25, S * 1.65, 64), M(p.water, 'Glossy')), 0, .02, 0, -Math.PI / 2); put(g, cyl(S * 2, S * 2.05, .02, M('#65a30d', 'Matte'), 64), 0, 0, 0); }
        const pts = Array.from({ length: N }, (_, i) => { const a = i / N * Math.PI * 2 + Math.PI / N; return [Math.cos(a) * S, Math.sin(a) * S, a]; });
        pts.forEach(([x, z], i) => { const [x2, z2] = pts[(i + 1) % N], L = Math.hypot(x2 - x, z2 - z), mx = (x + x2) / 2, mz = (z + z2) / 2, ang = -Math.atan2(z2 - z, x2 - x);
            put(g, box(L, p.wh, .35, sm), mx, p.wh / 2, mz, 0, ang); for (let k = 0; k < Math.floor(L / .35); k += 2) put(g, box(.2, .2, .4, sm), mx + Math.cos(-ang) * (k * .35 - L / 2 + .2), p.wh + .1, mz + Math.sin(-ang) * (k * .35 - L / 2 + .2), 0, ang); });
        for (const [x, z] of pts) {
            put(g, cyl(.45, .5, p.th, sm, 20), x, p.th / 2, z);
            const ty = p.th;
            if (p.roofs === 'Cone') put(g, cone(.6, 1.2, rm, 20), x, ty + .6, z);
            else if (p.roofs === 'Spire') put(g, cone(.45, 2, rm, 8), x, ty + 1, z);
            else if (p.roofs === 'Onion') { put(g, sph(.5, rm, 20, 14), x, ty + .4, z, 0, 0, 0, [1, 1.1, 1]); put(g, cone(.2, .6, rm, 12), x, ty + .95, z); }
            else for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; put(g, box(.15, .2, .15, sm), x + Math.cos(a) * .45, ty + .1, z + Math.sin(a) * .45); }
            if (p.flags) { const top = ty + (p.roofs === 'Spire' ? 2 : p.roofs === 'Flat battlements' ? .2 : 1.2); put(g, cyl(.015, .015, .6, M('#52525b', 'Metallic')), x, top + .3, z); const fl = new THREE.Mesh(new THREE.PlaneGeometry(.35, .22), M(p.flagc, 'Satin')); fl.material.side = THREE.DoubleSide; put(g, fl, x + .18, top + .5, z); }
            if (p.windows) for (let k = 0; k < 2; k++) put(g, box(.1, .22, .1, glowM(p.winc)), x * (1 + .5 / S), .8 + k * .9, z * (1 + .5 / S));
        }
        if (p.keep) { put(g, box(S * .8, p.kh, S * .8, sm), 0, p.kh / 2, 0); put(g, cone(S * .62, 1.5, rm, 4), 0, p.kh + .75, 0, 0, Math.PI / 4); if (p.windows) for (let k = 0; k < 3; k++) for (const s2 of [-1, 1]) put(g, box(.18, .3, .05, glowM(p.winc)), s2 * S * .2, 1 + k * .9, S * .41); if (p.flags) { put(g, cyl(.02, .02, 1, M('#52525b', 'Metallic')), 0, p.kh + 2, 0); const fl = new THREE.Mesh(new THREE.PlaneGeometry(.6, .35), M(p.flagc, 'Satin', 'Stars', '#facc15', 1)); fl.material.side = THREE.DoubleSide; put(g, fl, .3, p.kh + 2.3, 0); } }
        const gz = Math.cos(Math.PI / N) * S + .2;
        if (p.gate) { put(g, box(.9, 1.1, .1, M(p.gatec, 'Matte', 'Wood', '#451a03', 1)), 0, .55, gz); put(g, new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .1, 20, 1, false, -Math.PI / 2, Math.PI), M(p.gatec, 'Matte')), 0, 1.1, gz, Math.PI / 2); }
        if (p.bridge && p.moat) put(g, box(.9, .06, S * .55, M('#92400e', 'Matte', 'Wood', '#451a03', 2)), 0, .06, gz + S * .27);
        g.scale.setScalar(.55); return g;
    } };
OBJ.tree = { n: 'Tree & plant', ic: '🌳', groups: {
    Kind: [s('kind', 'Kind', 'Oak', ['Oak', 'Pine', 'Palm', 'Blossom', 'Willow', 'Cactus', 'Mushroom', 'Bonsai', 'Crystal']), s('season', 'Season', 'Summer', ['Spring', 'Summer', 'Autumn', 'Winter']), n('seed', 'Shape seed', 4, 1, 50, 1)],
    Size: [n('h', 'Height', 3, 1, 6), n('trunk', 'Trunk thickness', .25, .08, .6), n('crown', 'Crown size', 1.3, .5, 2.5), n('dens', 'Leaf density', 14, 4, 40, 1)],
    Colours: [c('bark', 'Bark', '#78350f'), c('leaf', 'Leaves', '#16a34a'), fin('lf', 'Leaf finish', 'Matte'), b('fruit', 'Fruit / flowers', true), c('fruitc', 'Fruit colour', '#dc2626'), n('fruitN', 'How many', 12, 0, 40, 1)],
    Ground: [s('base', 'Base', 'Grass', ['Grass', 'Pot', 'Rock', 'Island', 'None']), c('potc', 'Pot colour', '#c2410c'), pat('potp', 'Pot pattern', 'Zigzag'), b('swing', 'Tire swing', false), b('house', 'Birdhouse', false)] },
    build(p) {
        const g = G(); let s2 = p.seed * 97; const R = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647;
        const leafCol = { Spring: p.kind === 'Blossom' ? '#f9a8d4' : '#4ade80', Summer: p.leaf, Autumn: ['#ea580c', '#f59e0b', '#b91c1c'], Winter: '#e2e8f0' }[p.season], lc = i => Array.isArray(leafCol) ? leafCol[i % 3] : leafCol;
        const bark = M(p.bark, 'Matte', 'Wood', '#451a03', 1); let by = 0;
        if (p.base === 'Grass') put(g, cyl(1.4, 1.5, .12, M('#65a30d', 'Matte'), 32), 0, .06, 0), by = .12;
        if (p.base === 'Pot') { put(g, cyl(.6, .45, .8, M(p.potc, 'Glossy', p.potp, '#fde68a', 2), 28), 0, .4, 0); put(g, cyl(.56, .56, .05, M('#3f1d0b', 'Matte')), 0, .78, 0); by = .8; }
        if (p.base === 'Rock') { put(g, sph(.9, M('#78716c', 'Matte', 'Marble', '#57534e', 1), 10, 8), 0, .2, 0, 0, 0, 0, [1.2, .5, 1]); by = .5; }
        if (p.base === 'Island') { put(g, cone(1.3, 1.6, M('#78350f', 'Matte'), 9), 0, .3, 0, Math.PI); put(g, cyl(1.3, 1.3, .15, M('#65a30d', 'Matte'), 9), 0, 1.15, 0); by = 1.22; }
        const H = p.h * (p.kind === 'Bonsai' ? .45 : 1), T = p.trunk;
        if (p.kind === 'Cactus') { const cm = M(p.season === 'Winter' ? '#86efac' : '#15803d', 'Satin', 'Stripes', '#166534', 3); put(g, cap(T * 1.6, H * .7, cm), 0, by + H * .45, 0); for (const sd of [-1, 1]) { put(g, cap(T, H * .2, cm), sd * T * 2.6, by + H * .55, 0); put(g, cyl(T * .8, T * .8, T * 2.4, cm), sd * T * 1.6, by + H * .4, 0, 0, 0, Math.PI / 2); } if (p.fruit) put(g, sph(T * .7, M(p.fruitc, 'Satin'), 12, 8), 0, by + H * .82 + T * 1.6, 0); return g; }
        if (p.kind === 'Mushroom') { put(g, cyl(T * 1.2, T * 1.6, H * .6, M('#f5f5f4', 'Satin')), 0, by + H * .3, 0); put(g, new THREE.Mesh(new THREE.SphereGeometry(p.crown, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M(p.fruitc, 'Glossy', 'Dots', '#ffffff', 2)), 0, by + H * .6 - .05, 0, 0, 0, 0, [1, .6, 1]); return g; }
        const lean = (R() - .5) * .2;
        if (p.kind === 'Palm') { for (let i = 0; i < 8; i++) put(g, cyl(T * (1 - i * .06), T * (1.05 - i * .06), H / 8, bark, 10), Math.sin(i * .2) * i * .05, by + H / 16 + i * H / 8, 0, 0, 0, -i * .03); const tx = Math.sin(1.4) * 7 * .05;
            for (let i = 0; i < p.dens / 2; i++) { const a = i / (p.dens / 2) * Math.PI * 2, lf = new THREE.Mesh(new THREE.ConeGeometry(.25, p.crown * 1.4, 4), M(lc(i), p.lf)); put(g, lf, tx + Math.cos(a) * p.crown * .55, by + H - .1, Math.sin(a) * p.crown * .55, 0, -a, Math.PI / 2 + .5, [1, 1, .15]); }
            if (p.fruit) for (let i = 0; i < 4; i++) put(g, sph(.12, M('#78350f', 'Satin'), 12, 8), tx + Math.cos(i * 1.6) * .18, by + H - .25, Math.sin(i * 1.6) * .18); return g; }
        if (p.kind === 'Crystal') { for (let i = 0; i < p.dens / 2; i++) { const a = R() * Math.PI * 2, hh = H * (.3 + R() * .7); put(g, cone(.15 + R() * .25, hh, M(lc(i), 'Glass'), 6), Math.cos(a) * R() * .6, by + hh / 2, Math.sin(a) * R() * .6, (R() - .5) * .5, 0, (R() - .5) * .5); } return g; }
        put(g, cyl(T * .7, T, H * (p.kind === 'Pine' ? .4 : .62), bark, 12), 0, by + H * (p.kind === 'Pine' ? .2 : .31), 0, 0, 0, lean);
        if (p.kind === 'Pine') { for (let i = 0; i < 5; i++) { const r = p.crown * (1 - i * .17), y = by + H * .25 + i * H * .15; put(g, cone(r, H * .3, M(lc(i), p.lf), 12), 0, y + H * .15, 0); if (p.season === 'Winter') put(g, cone(r * .6, H * .14, M('#ffffff', 'Matte'), 12), 0, y + H * .26, 0); } }
        else {
            const cy = by + H * .66, cr = p.crown * (p.kind === 'Bonsai' ? .7 : 1);
            if (p.kind === 'Willow') { put(g, sph(cr * .8, M(lc(0), p.lf), 14, 10), 0, cy, 0, 0, 0, 0, [1, .6, 1]); for (let i = 0; i < p.dens * 2; i++) { const a = R() * Math.PI * 2, rr = cr * (.5 + R() * .5); put(g, box(.04, H * .5, .04, M(lc(i), p.lf)), Math.cos(a) * rr, cy - H * .2, Math.sin(a) * rr); } }
            else for (let i = 0; i < p.dens; i++) { const a = R() * Math.PI * 2, rr = R() * cr * .8, yy = (R() - .3) * cr * .7; put(g, new THREE.Mesh(new THREE.IcosahedronGeometry(cr * (.35 + R() * .3), 0), M(lc(i), p.lf)), Math.cos(a) * rr, cy + yy, Math.sin(a) * rr, R(), R(), R()); }
            if (p.season === 'Winter') put(g, sph(cr * .7, M('#ffffff', 'Matte'), 12, 8), 0, cy + cr * .45, 0, 0, 0, 0, [1.2, .35, 1.2]);
            if (p.fruit) for (let i = 0; i < p.fruitN; i++) { const a = R() * Math.PI * 2, el = (R() - .4) * 1.2, rr = cr * .95; put(g, sph(p.kind === 'Blossom' ? .07 : .1, M(p.kind === 'Blossom' ? '#ffffff' : p.fruitc, 'Glossy'), 10, 8), Math.cos(a) * Math.cos(el) * rr, cy + Math.sin(el) * rr * .8, Math.sin(a) * Math.cos(el) * rr); }
            if (p.swing) { put(g, cyl(.01, .01, H * .45, M('#a8a29e', 'Matte')), cr * .6, by + H * .42, 0); put(g, tor(.25, .08, M('#18181b', 'Rubber')), cr * .6, by + H * .2, 0); }
            if (p.house) { put(g, box(.3, .35, .3, M('#f59e0b', 'Satin')), 0, by + H * .5, T + .15); put(g, cone(.3, .25, M('#b91c1c', 'Satin'), 4), 0, by + H * .5 + .3, T + .15, 0, Math.PI / 4); put(g, cyl(.05, .05, .02, M('#111827', 'Matte')), 0, by + H * .5, T + .31, Math.PI / 2); }
        }
        return g;
    } };
OBJ.sword = { n: 'Sword', ic: '⚔️', groups: {
    Blade: [s('blade', 'Blade', 'Straight', ['Straight', 'Curved', 'Wavy', 'Broad', 'Axe', 'Scythe', 'Spear']), n('len', 'Length', 2.4, 1.2, 3.5), n('wid', 'Width', .22, .1, .5), c('bc', 'Blade colour', '#e5e7eb'), fin('bf', 'Blade finish', 'Chrome'), pat('bp', 'Blade pattern'), c('bpc', 'Pattern colour', '#60a5fa'), b('glow', 'Glowing edge', true), c('glowc', 'Glow colour', '#38bdf8')],
    Hilt: [s('guard', 'Guard', 'Wings', ['Bar', 'Wings', 'Ring', 'Claws', 'None']), c('gc', 'Guard colour', '#facc15'), fin('gf', 'Guard finish', 'Metallic'), n('grip', 'Grip length', .55, .3, 1.2), c('wrap', 'Grip wrap', '#7f1d1d'), pat('wp', 'Wrap pattern', 'Zigzag'), s('pommel', 'Pommel', 'Gem', ['Ball', 'Gem', 'Skull', 'Ring', 'Spike']), c('gem', 'Gem colour', '#a855f7')],
    Display: [s('pose', 'Display', 'Standing', ['Standing', 'Stuck in a stone', 'On a stand', 'Floating']), b('runes', 'Runes', true), c('runec', 'Rune glow', '#22d3ee')] },
    build(p) {
        const g = G(), L = p.len, W = p.wid, bm = M(p.bc, p.bf, p.bp, p.bpc, 1);
        let base = { Standing: .3, 'Stuck in a stone': .35, 'On a stand': .5, Floating: .9 }[p.pose];
        if (p.pose === 'Stuck in a stone') { put(g, new THREE.Mesh(new THREE.DodecahedronGeometry(.7, 0), M('#78716c', 'Matte', 'Marble', '#57534e', 1)), 0, .35, 0, 0, 0, 0, [1.2, .7, 1]); base = -L * .25 + .55; }
        if (p.pose === 'On a stand') { put(g, box(1.2, .1, .6, M('#451a03', 'Glossy', 'Wood', '#78350f')), 0, .05, 0); put(g, box(.08, .5, .08, M('#451a03', 'Glossy')), 0, .3, 0); }
        const s = G(); put(g, s, 0, base, 0);
        let pts;
        if (p.blade === 'Straight') pts = [[-W / 2, 0], [W / 2, 0], [W / 2, L * .85], [0, L], [-W / 2, L * .85]];
        else if (p.blade === 'Broad') pts = [[-W * .8, 0], [W * .8, 0], [W, L * .6], [0, L], [-W, L * .6]];
        else if (p.blade === 'Curved') pts = Array.from({ length: 12 }, (_, i) => [W / 2 + Math.sin(i / 11 * 1.4) * L * .15, i / 11 * L]).concat(Array.from({ length: 12 }, (_, i) => [-W / 2 + Math.sin((11 - i) / 11 * 1.4) * L * .15 * (1 + (11 - i) / 40), (11 - i) / 11 * L * .96]));
        else if (p.blade === 'Wavy') pts = Array.from({ length: 16 }, (_, i) => [W / 2 + Math.sin(i * 1.2) * W * .25, i / 15 * L * .9]).concat([[0, L]], Array.from({ length: 16 }, (_, i) => [-W / 2 + Math.sin((15 - i) * 1.2) * W * .25, (15 - i) / 15 * L * .9]));
        else if (p.blade === 'Axe') pts = [[-.05, 0], [.05, 0], [.05, L * .7], [W * 3, L * .62], [W * 3.4, L * .9], [.05, L * .95], [0, L], [-.05, L]];
        else if (p.blade === 'Scythe') pts = [[-.05, 0], [.05, 0], [.05, L * .9], [-L * .5, L * .78], [-L * .55, L * .7], [-.05, L * .85]];
        else pts = [[-.04, 0], [.04, 0], [.04, L * .75], [W, L * .8], [0, L], [-W, L * .8], [-.04, L * .75]];
        put(s, extrude(pts, .05, bm, .015), 0, 0, 0);
        if (p.glow) put(s, extrude(pts.map(([x, y]) => [x * 1.06, y]), .02, new THREE.MeshBasicMaterial({ color: p.glowc, transparent: true, opacity: .35 })), 0, 0, 0);
        if (p.runes) for (let i = 0; i < 5; i++) put(s, box(.04, .08, .07, glowM(p.runec)), 0, L * .15 + i * L * .12, 0, 0, 0, i % 2 ? .4 : -.4);
        const gm = M(p.gc, p.gf);
        if (p.guard === 'Bar') put(s, box(W * 4, .1, .14, gm), 0, -.02, 0);
        if (p.guard === 'Wings') for (const x of [-1, 1]) put(s, extrude([[0, 0], [x * W * 2.4, .25], [x * W * 2.6, .05], [x * .1, -.1]], .1, gm, .02), 0, -.05, 0);
        if (p.guard === 'Ring') put(s, tor(W * 1.2, .05, gm), 0, 0, 0);
        if (p.guard === 'Claws') for (const x of [-1, 1]) put(s, cone(.07, .5, gm, 8), x * W * 1.2, .1, 0, 0, 0, -x * .8);
        put(s, cyl(.06, .06, p.grip, M(p.wrap, 'Velvet', p.wp, '#facc15', 4), 16), 0, -p.grip / 2 - .06, 0);
        const py = -p.grip - .1;
        if (p.pommel === 'Ball') put(s, sph(.09, gm), 0, py, 0);
        if (p.pommel === 'Gem') { put(s, cyl(.08, .08, .06, gm, 16), 0, py + .02, 0); put(s, new THREE.Mesh(new THREE.OctahedronGeometry(.1, 0), M(p.gem, 'Glass')), 0, py - .08, 0); put(s, sph(.05, glowM(p.gem)), 0, py - .08, 0); }
        if (p.pommel === 'Skull') put(s, sph(.11, M('#f5f5f4', 'Satin'), 14, 10), 0, py - .04, 0, 0, 0, 0, [1, 1.1, .9]);
        if (p.pommel === 'Ring') put(s, tor(.09, .025, gm), 0, py - .06, 0);
        if (p.pommel === 'Spike') put(s, cone(.06, .25, gm, 8), 0, py - .1, 0, Math.PI);
        if (p.pose === 'Floating') { put(g, cyl(.6, .7, .08, glowM(p.glowc), 32), 0, .04, 0); }
        return g;
    } };
OBJ.char = { n: 'Character', ic: '🧑', groups: {
    Body: [c('skin', 'Skin', '#f1c27d'), n('h', 'Height', 1, .7, 1.3), n('w', 'Build', 1, .7, 1.4), n('head', 'Head size', 1, .8, 1.5), s('expr', 'Face', 'Smile', ['Smile', 'Grin', 'Surprised', 'Cool', 'Sleepy', 'Angry'])],
    Hair: [s('hair', 'Hair', 'Spiky', ['None', 'Short', 'Spiky', 'Long', 'Bun', 'Afro', 'Mohawk', 'Pigtails']), c('hairc', 'Hair colour', '#3f2a14'), c('eyes', 'Eyes', '#1e3a8a')],
    Clothes: [c('shirt', 'Top', '#2563eb'), pat('shirtp', 'Top pattern', 'Stripes'), c('shirtp2', 'Pattern colour', '#ffffff'), s('top', 'Top style', 'T-shirt', ['T-shirt', 'Hoodie', 'Suit', 'Armour', 'Dress']), c('pants', 'Bottoms', '#1f2937'), c('shoes', 'Shoes', '#ef4444')],
    Gear: [s('hat', 'Hat', 'Cap', ['None', 'Cap', 'Top hat', 'Crown', 'Beanie', 'Wizard', 'Cowboy', 'Halo', 'Headphones']), c('hatc', 'Hat colour', '#dc2626'), b('glasses', 'Glasses', false), b('cape', 'Cape', false), c('capec', 'Cape', '#7c3aed'), b('bag', 'Backpack', true), c('bagc', 'Backpack', '#f59e0b'), s('hold', 'Holding', 'Nothing', ['Nothing', 'Taco', 'Balloon', 'Sword', 'Book', 'Ice cream'])] },
    build(p) {
        const g = G(), k = p.h, w = p.w, sk = M(p.skin, 'Satin'), top = M(p.shirt, p.top === 'Armour' ? 'Metallic' : 'Satin', p.shirtp, p.shirtp2, 2), pm = M(p.pants, 'Satin');
        const legH = .7 * k, torsoH = .75 * k;
        for (const x of [-1, 1]) { put(g, cap(.11 * w, legH - .2, pm), x * .15 * w, legH / 2 + .08, 0); put(g, box(.2 * w, .12, .32, M(p.shoes, 'Glossy')), x * .15 * w, .06, .05); }
        if (p.top === 'Dress') put(g, cone(.5 * w, legH + .1, top, 24), 0, legH * .65 + .1, 0);
        const ty = legH + torsoH / 2;
        put(g, cap(.3 * w, torsoH - .3, top), 0, ty, 0, 0, 0, 0, [1, 1, .75]);
        if (p.top === 'Suit') { put(g, box(.12, torsoH * .7, .02, M('#ffffff', 'Satin')), 0, ty + .05, .23); put(g, box(.06, torsoH * .5, .02, M('#dc2626', 'Satin')), 0, ty + .02, .245); }
        if (p.top === 'Hoodie') put(g, tor(.2, .07, top), 0, ty + torsoH / 2, -.08, Math.PI / 2 + .4);
        for (const x of [-1, 1]) { const a = G(); put(g, a, x * .38 * w, ty + torsoH * .35, 0, 0, 0, x * .15); put(a, cap(.08 * w, torsoH * .55, top), 0, -torsoH * .3, 0); put(a, sph(.09, sk), 0, -torsoH * .62, 0); }
        const hr = .3 * p.head, hy = ty + torsoH / 2 + hr * .9;
        put(g, sph(hr, sk, 32, 20), 0, hy, 0);
        const ey = hy + hr * .1, ez = hr * .9;
        for (const x of [-1, 1]) { if (p.expr === 'Sleepy') put(g, box(hr * .25, .015, .02, M('#111827', 'Matte')), x * hr * .35, ey, ez); else { put(g, sph(hr * .16, M('#ffffff', 'Glossy'), 16, 12), x * hr * .35, ey, ez - .02, 0, 0, 0, [1, p.expr === 'Surprised' ? 1.3 : 1, .5]); put(g, sph(hr * .09, M(p.eyes, 'Glossy'), 12, 10), x * hr * .35, ey, ez + .03, 0, 0, 0, [1, 1, .5]); } if (p.expr === 'Angry') put(g, box(hr * .3, .02, .02, M('#111827', 'Matte')), x * hr * .35, ey + hr * .25, ez, 0, 0, x * .4); }
        const mm = M('#7f1d1d', 'Satin');
        if (p.expr === 'Smile' || p.expr === 'Cool') put(g, tor(hr * .22, .015, mm, Math.PI), 0, hy - hr * .3, ez - .03, 0, 0, Math.PI);
        if (p.expr === 'Grin') put(g, new THREE.Mesh(new THREE.CircleGeometry(hr * .28, 24, Math.PI, Math.PI), M('#ffffff', 'Satin')), 0, hy - hr * .22, ez + .02);
        if (p.expr === 'Surprised') put(g, tor(hr * .1, .02, mm), 0, hy - hr * .35, ez);
        if (p.expr === 'Angry' || p.expr === 'Sleepy') put(g, box(hr * .3, .02, .02, mm), 0, hy - hr * .35, ez);
        if (p.expr === 'Cool' || p.glasses) for (const x of [-1, 1]) put(g, p.expr === 'Cool' ? box(hr * .38, hr * .2, .03, M('#111827', 'Glossy')) : tor(hr * .17, .015, M('#111827', 'Metallic')), x * hr * .35, ey, ez + .05);
        const hc = M(p.hairc, 'Satin');
        if (p.hair === 'Short') put(g, new THREE.Mesh(new THREE.SphereGeometry(hr * 1.05, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.3), hc), 0, hy, -.02);
        if (p.hair === 'Spiky') for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; put(g, cone(hr * .25, hr * .7, hc, 8), Math.cos(a) * hr * .5, hy + hr * .75, Math.sin(a) * hr * .5 - .05, Math.sin(a) * .6, 0, -Math.cos(a) * .6); }
        if (p.hair === 'Long') { put(g, new THREE.Mesh(new THREE.SphereGeometry(hr * 1.07, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), hc), 0, hy, -.02); put(g, box(hr * 2, hr * 1.8, hr * .5, hc), 0, hy - hr * .7, -hr * .6); }
        if (p.hair === 'Bun') { put(g, new THREE.Mesh(new THREE.SphereGeometry(hr * 1.05, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.3), hc), 0, hy, -.02); put(g, sph(hr * .4, hc), 0, hy + hr * 1.05, -hr * .2); }
        if (p.hair === 'Afro') put(g, sph(hr * 1.5, M(p.hairc, 'Velvet'), 20, 14), 0, hy + hr * .35, -hr * .2);
        if (p.hair === 'Mohawk') for (let i = 0; i < 6; i++) put(g, cone(hr * .15, hr * .6, hc, 6), 0, hy + hr * .95 - Math.abs(i - 2.5) * .03, hr * .5 - i * hr * .25);
        if (p.hair === 'Pigtails') for (const x of [-1, 1]) put(g, cap(hr * .2, hr * .8, hc), x * hr * 1.1, hy - hr * .2, -hr * .1, 0, 0, x * .3);
        const hm = M(p.hatc, 'Satin'), ht = hy + hr * .8;
        if (p.hat === 'Cap') { put(g, new THREE.Mesh(new THREE.SphereGeometry(hr * 1.08, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), hm), 0, hy + hr * .05, 0); put(g, box(hr * 1.2, .03, hr * .9, hm), 0, hy + hr * .15, hr * .9); }
        if (p.hat === 'Top hat') { put(g, cyl(hr * 1.3, hr * 1.3, .04, hm), 0, ht, 0); put(g, cyl(hr * .75, hr * .75, hr * 1.4, hm), 0, ht + hr * .7, 0); }
        if (p.hat === 'Crown') { put(g, cyl(hr * .8, hr * .8, hr * .45, M('#facc15', 'Metallic'), 20), 0, ht + hr * .1, 0); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; put(g, cone(hr * .14, hr * .35, M('#facc15', 'Metallic'), 6), Math.cos(a) * hr * .75, ht + hr * .48, Math.sin(a) * hr * .75); } }
        if (p.hat === 'Beanie') { put(g, new THREE.Mesh(new THREE.SphereGeometry(hr * 1.08, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M(p.hatc, 'Velvet', 'Stripes', '#ffffff', 3)), 0, hy + hr * .1, 0); put(g, sph(hr * .25, M('#ffffff', 'Velvet')), 0, ht + hr * .4, 0); }
        if (p.hat === 'Wizard') { put(g, cyl(hr * 1.5, hr * 1.5, .03, hm), 0, ht, 0); put(g, cone(hr * .8, hr * 2.4, M(p.hatc, 'Velvet', 'Stars', '#facc15', 2), 20), 0, ht + hr * 1.2, 0, -.2); }
        if (p.hat === 'Cowboy') { put(g, cyl(hr * 1.7, hr * 1.7, .04, M('#92400e', 'Matte')), 0, ht, 0); put(g, cyl(hr * .7, hr * .85, hr * .7, M('#92400e', 'Matte')), 0, ht + hr * .35, 0); }
        if (p.hat === 'Halo') put(g, tor(hr * .7, .03, glowM('#fde68a')), 0, ht + hr * .5, 0, Math.PI / 2);
        if (p.hat === 'Headphones') { put(g, tor(hr * 1.05, .04, hm, Math.PI), 0, hy, 0); for (const x of [-1, 1]) put(g, cyl(hr * .3, hr * .3, .12, hm), x * hr * 1.05, hy, 0, 0, 0, Math.PI / 2); }
        if (p.cape) put(g, box(.65 * w, torsoH + legH * .6, .03, M(p.capec, 'Velvet')), 0, ty - .15, -.25, .15);
        if (p.bag) put(g, box(.45 * w, .5, .22, M(p.bagc, 'Satin')), 0, ty, -.3);
        const hx = .42 * w, hyy = ty - torsoH * .35;
        if (p.hold === 'Taco') put(g, new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .08, 24, 1, false, 0, Math.PI), M('#fbbf24', 'Satin')), hx, hyy + .1, .15, 0, 0, Math.PI / 2);
        if (p.hold === 'Balloon') { put(g, cyl(.005, .005, 1.2, M('#ffffff', 'Matte')), hx, hyy + .6, 0); put(g, sph(.3, M('#ef4444', 'Glossy')), hx, hyy + 1.4, 0, 0, 0, 0, [1, 1.2, 1]); }
        if (p.hold === 'Sword') put(g, box(.05, 1, .02, M('#e5e7eb', 'Chrome')), hx, hyy + .5, .1);
        if (p.hold === 'Book') put(g, box(.3, .4, .08, M('#7c3aed', 'Satin')), hx, hyy + .1, .15);
        if (p.hold === 'Ice cream') { put(g, cone(.1, .3, M('#d97706', 'Matte', 'Checker', '#b45309', 4), 12), hx, hyy + .05, .1, Math.PI); put(g, sph(.12, M('#f9a8d4', 'Satin')), hx, hyy + .25, .1); }
        g.scale.setScalar(1.3); return g;
    } };
OBJ.furn = { n: 'Furniture', ic: '🛋️', groups: {
    Kind: [s('kind', 'Piece', 'Armchair', ['Chair', 'Armchair', 'Sofa', 'Stool', 'Table', 'Bed', 'Throne', 'Beanbag']), n('w', 'Width', 1, .6, 2), n('h', 'Seat height', 1, .6, 1.4), n('back', 'Back height', 1, 0, 2)],
    Wood: [c('wood', 'Frame', '#92400e'), fin('wf', 'Frame finish', 'Glossy'), s('legs', 'Legs', 'Tapered', ['Straight', 'Tapered', 'Round', 'Hairpin', 'None']), n('nlegs', 'Leg count', 4, 3, 6, 1)],
    Fabric: [c('fab', 'Fabric', '#0d9488'), fin('ff', 'Fabric finish', 'Velvet'), pat('fp', 'Fabric pattern', 'Plaid'), c('fp2', 'Pattern colour', '#f59e0b'), n('cush', 'Cushions', 2, 0, 5, 1), c('cushc', 'Cushion colour', '#fde68a'), b('btn', 'Buttoned back', true), b('rug', 'Rug', true), c('rugc', 'Rug', '#7c2d12')] },
    build(p) {
        const g = G(), W = p.w * (p.kind === 'Sofa' ? 2 : p.kind === 'Bed' ? 1.6 : 1), D = p.kind === 'Bed' ? 2.2 : p.kind === 'Table' ? 1 : .9, sy = .45 * p.h, wm = M(p.wood, p.wf, p.wf === 'Chrome' || p.wf === 'Metallic' ? 'None' : 'Wood', '#451a03', 1), fm = M(p.fab, p.ff, p.fp, p.fp2, 2);
        if (p.rug) put(g, cyl(Math.max(W, D) * .9, Math.max(W, D) * .9, .02, M(p.rugc, 'Velvet', 'Zigzag', '#fde68a', 2), 40), 0, .01, 0);
        if (p.kind === 'Beanbag') { put(g, sph(.7 * p.w, fm, 24, 16), 0, .45, 0, 0, 0, 0, [1, .65, 1]); put(g, sph(.5 * p.w, fm, 20, 12), 0, .7, -.3, 0, 0, 0, [1, .9, .6]); return g; }
        if (p.legs !== 'None') for (let i = 0; i < p.nlegs; i++) { const a = i / p.nlegs * Math.PI * 2 + Math.PI / p.nlegs, x = Math.cos(a) * W * .45 / Math.cos(Math.PI / 4) * .7, z = Math.sin(a) * D * .45 / Math.cos(Math.PI / 4) * .7, lh = p.kind === 'Table' ? .75 * p.h : sy - .1;
            put(g, p.legs === 'Hairpin' ? tor(.06, .012, M('#18181b', 'Metallic'), Math.PI) : p.legs === 'Round' ? cyl(.05, .05, lh, wm, 12) : p.legs === 'Tapered' ? cyl(.05, .025, lh, wm, 12) : box(.07, lh, .07, wm), x, lh / 2, z, 0, 0, p.legs === 'Hairpin' ? Math.PI / 2 : 0, p.legs === 'Hairpin' ? [1, lh * 8, 1] : null); }
        if (p.kind === 'Table') { put(g, box(W * 1.2, .06, D, wm), 0, .75 * p.h + .03, 0); put(g, cyl(.08, .1, .25, M(p.fab, 'Glossy')), 0, .75 * p.h + .18, 0); put(g, sph(.12, M('#dc2626', 'Glossy')), .1, .75 * p.h + .12, .2); return g; }
        const seatH = p.kind === 'Stool' ? .08 : .18, arms = p.kind === 'Armchair' || p.kind === 'Sofa' || p.kind === 'Throne';
        put(g, box(W, .1, D, wm), 0, sy - .05, 0);
        put(g, box(W * .96, seatH, D * .92, fm), 0, sy + seatH / 2, .02);
        if (p.kind !== 'Stool' && p.back > 0) { const bh = (p.kind === 'Throne' ? 1.6 : p.kind === 'Bed' ? .6 : .8) * p.back; put(g, box(W, bh, .18, p.kind === 'Bed' ? wm : fm), 0, sy + seatH + bh / 2, -D / 2 + .09);
            if (p.btn) for (let i = 0; i < 6; i++) put(g, sph(.025, M(p.fab, 'Glossy'), 8, 6), (i % 3 - 1) * W * .3, sy + seatH + bh * (Math.floor(i / 3) ? .7 : .35), -D / 2 + .19);
            if (p.kind === 'Throne') { put(g, cone(.12, .3, M('#facc15', 'Metallic'), 8), 0, sy + seatH + bh + .15, -D / 2 + .09); for (const x of [-1, 1]) put(g, sph(.1, M('#facc15', 'Metallic')), x * W / 2, sy + seatH + bh, -D / 2 + .09); } }
        if (arms) for (const x of [-1, 1]) put(g, box(.18, .45, D, fm), x * (W / 2 - .09), sy + .3, 0);
        if (p.kind === 'Bed') { put(g, box(W * .95, .25, D * .9, M('#f8fafc', 'Velvet')), 0, sy + seatH + .12, .05); put(g, box(W * .96, .1, D * .6, fm), 0, sy + seatH + .27, .3); }
        for (let i = 0; i < p.cush; i++) put(g, box(.38, .32, .12, M(p.cushc, 'Velvet', i % 2 ? 'Dots' : 'None', '#ffffff', 2)), (i - (p.cush - 1) / 2) * Math.min(.42, W / p.cush), sy + seatH + .2, -D / 2 + .3, -.2, 0, (i % 2 - .5) * .2);
        return g;
    } };
OBJ.mug = { n: 'Mug & cup', ic: '☕', groups: {
    Shape: [s('shape', 'Shape', 'Mug', ['Mug', 'Tall', 'Espresso', 'Tumbler', 'Teacup', 'Goblet', 'Barrel']), n('size', 'Size', 1, .6, 1.5), s('handle', 'Handle', 'Round', ['Round', 'Square', 'Heart', 'Double', 'None'])],
    Look: [c('col', 'Colour', '#f472b6'), fin('f', 'Finish', 'Glossy'), pat('pat', 'Pattern', 'Hearts'), c('patc', 'Pattern colour', '#ffffff'), c('inside', 'Inside', '#ffffff'), t('text', 'Words', 'BEST TACO'), c('textc', 'Words colour', '#be185d')],
    Drink: [s('drink', 'Drink', 'Cocoa', ['None', 'Coffee', 'Tea', 'Cocoa', 'Juice', 'Potion']), b('cream', 'Whipped cream', true), b('marsh', 'Marshmallows', true), b('steam', 'Steam', true), b('saucer', 'Saucer', true), b('straw', 'Straw', false)] },
    build(p) {
        const g = G(), S = p.size, h = { Mug: 1, Tall: 1.5, Espresso: .55, Tumbler: 1.4, Teacup: .6, Goblet: .7, Barrel: 1 }[p.shape] * S, r = { Mug: .5, Tall: .45, Espresso: .35, Tumbler: .42, Teacup: .6, Goblet: .55, Barrel: .55 }[p.shape] * S;
        const mat = M(p.col, p.f, p.pat, p.patc, 2); let y0 = 0;
        if (p.saucer) { put(g, lathe([[0, 0], [r * 1.6, .02], [r * 1.75, .1], [r * 1.7, .12], [r * 1.5, .05], [0, .04]], M(p.col, p.f)), 0, 0, 0); y0 = .05; }
        let prof;
        if (p.shape === 'Teacup') prof = [[0, 0], [r * .5, 0], [r * .55, .05], [r * .95, h * .7], [r, h], [r * .93, h], [r * .88, h * .7], [r * .5, .08], [0, .08]];
        else if (p.shape === 'Goblet') { put(g, lathe([[0, 0], [r * .7, 0], [r * .7, .05], [r * .1, .1], [r * .08, .6 * S], [0, .6 * S]], M(p.col, p.f)), 0, y0, 0); y0 += .6 * S; prof = [[0, 0], [r * .2, 0], [r * .9, h * .5], [r, h], [r * .93, h], [r * .83, h * .5], [r * .15, .06], [0, .06]]; }
        else if (p.shape === 'Barrel') prof = [[0, 0], [r * .85, 0], [r, h * .5], [r * .85, h], [r * .78, h], [r * .92, h * .5], [r * .78, .08], [0, .08]];
        else if (p.shape === 'Tumbler') prof = [[0, 0], [r * .8, 0], [r, h], [r * .93, h], [r * .74, .08], [0, .08]];
        else prof = [[0, 0], [r, 0], [r, h], [r * .92, h], [r * .92, .08], [0, .08]];
        put(g, lathe(prof, mat, 48), 0, y0, 0);
        put(g, cyl(r * .9, r * .9, .02, M(p.inside, 'Glossy'), 40), 0, y0 + .09, 0);
        if (p.shape === 'Barrel') for (const yy of [.15, .85]) put(g, tor(r * .88, .025, M('#52525b', 'Metallic')), 0, y0 + h * yy, 0, Math.PI / 2);
        const hm = M(p.col, p.f), hx = r + .05;
        if (p.handle === 'Round' || p.handle === 'Double') for (const sd of p.handle === 'Double' ? [-1, 1] : [1]) put(g, tor(h * .25, .05 * S, hm, Math.PI * 1.2), sd * hx, y0 + h * .5, 0, 0, sd > 0 ? 0 : Math.PI, -Math.PI * .6);
        if (p.handle === 'Square') { put(g, box(.3 * S, .06, .08, hm), hx + .1, y0 + h * .78, 0); put(g, box(.3 * S, .06, .08, hm), hx + .1, y0 + h * .25, 0); put(g, box(.06, h * .58, .08, hm), hx + .25 * S, y0 + h * .51, 0); }
        if (p.handle === 'Heart') put(g, extrude([[0, -.2], [.25, .05], [.18, .2], [0, .1], [-.18, .2], [-.25, .05]].map(([x, y]) => [x * S, y * S]), .07, hm), hx + .12 * S, y0 + h * .5, 0, 0, 0, -Math.PI / 2);
        if (p.text) { const tt = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, h * .28, 40, 1, true, -.9, 1.8), new THREE.MeshStandardMaterial({ map: textTex(p.text, 'rgba(0,0,0,0)', p.textc, 512, 128), transparent: true })); if (p.shape === 'Mug' || p.shape === 'Tall' || p.shape === 'Espresso') put(g, tt, 0, y0 + h * .5, 0); }
        const dc = { Coffee: '#3b1d0b', Tea: '#b45309', Cocoa: '#5b2c0f', Juice: '#f97316', Potion: '#a855f7' }[p.drink];
        if (dc) { const top = y0 + h * .88, dr = r * (p.shape === 'Tumbler' || p.shape === 'Goblet' || p.shape === 'Teacup' ? .92 : .9); put(g, cyl(dr, dr, .02, p.drink === 'Potion' ? glowM(dc) : M(dc, 'Glossy'), 40), 0, top, 0);
            if (p.cream) { put(g, sph(dr * .8, M('#fffbeb', 'Satin'), 20, 12), 0, top + .05, 0, 0, 0, 0, [1, .6, 1]); put(g, cone(dr * .5, .25, M('#fffbeb', 'Satin'), 12), 0, top + .3, 0); }
            if (p.marsh) for (let i = 0; i < 6; i++) put(g, cyl(.06, .06, .07, M('#fdf2f8', 'Satin'), 12), Math.cos(i) * dr * .5, top + (p.cream ? .25 : .04), Math.sin(i * 1.3) * dr * .5, i, 0, i * .5);
            if (p.steam) for (let i = 0; i < 3; i++) put(g, tor(.12, .02, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .35 }), Math.PI), (i - 1) * .15, top + .5 + i * .12, 0, 0, 0, i % 2 ? .3 : -.3);
            if (p.straw) put(g, cyl(.025, .025, h * .9, M('#ef4444', 'Glossy', 'Stripes', '#ffffff', 3), 10), r * .4, top + .1, 0, 0, 0, -.25); }
        return g;
    } };
OBJ.trophy = { n: 'Trophy', ic: '🏆', groups: {
    Shape: [s('cup', 'Top', 'Cup', ['Cup', 'Star', 'Ball', 'Globe', 'Lightning', 'Taco']), n('h', 'Height', 1.6, 1, 3), n('tiers', 'Base tiers', 2, 1, 4, 1), s('handles', 'Handles', 'Loops', ['None', 'Loops', 'Wings', 'Flames'])],
    Material: [s('metal', 'Metal', 'Gold', ['Gold', 'Silver', 'Bronze', 'Rose gold', 'Platinum', 'Custom']), c('custom', 'Custom colour', '#22d3ee'), fin('f', 'Finish', 'Metallic'), c('base', 'Base', '#1c1917'), pat('bp', 'Base pattern', 'Marble'), c('bpc', 'Base pattern colour', '#78716c')],
    Plaque: [t('text', 'Engraving', 'CHAMPION'), t('sub', 'Second line', '2026'), c('plaque', 'Plaque', '#facc15'), b('gems', 'Gems', true), c('gemc', 'Gem colour', '#ef4444'), b('ribbon', 'Ribbon', true), c('ribc', 'Ribbon', '#2563eb')] },
    build(p) {
        const g = G(), mc = { Gold: '#facc15', Silver: '#e5e7eb', Bronze: '#b45309', 'Rose gold': '#fb7185', Platinum: '#cbd5e1', Custom: p.custom }[p.metal], mm = M(mc, p.f), bm = M(p.base, 'Glossy', p.bp, p.bpc, 1);
        let y = 0; for (let i = 0; i < p.tiers; i++) { const w = 1.3 - i * .25, h = .3; put(g, box(w, h, w, bm), 0, y + h / 2, 0); y += h; }
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(.9, .26), new THREE.MeshStandardMaterial({ map: (() => { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 148; const x = cv.getContext('2d'); x.fillStyle = p.plaque; x.fillRect(0, 0, 512, 148); x.fillStyle = '#1c1917'; x.textAlign = 'center'; x.font = 'bold 56px Georgia'; x.fillText(p.text || '', 256, 66); x.font = '40px Georgia'; x.fillText(p.sub || '', 256, 118); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })(), metalness: .6, roughness: .3 }));
        put(g, pl, 0, .15, .651);
        put(g, cyl(.25, .3, .1, mm), 0, y + .05, 0); put(g, cyl(.06, .1, p.h * .35, mm, 16), 0, y + .1 + p.h * .175, 0); put(g, sph(.12, mm), 0, y + .1 + p.h * .35, 0);
        const ty = y + .1 + p.h * .4, ch = p.h * .6;
        if (p.cup === 'Cup') put(g, lathe([[0, 0], [.15, 0], [.45, ch * .45], [.55, ch], [.5, ch], [.42, ch * .5], [.1, .05], [0, .05]], mm, 48), 0, ty, 0);
        if (p.cup === 'Star') put(g, extrude(Array.from({ length: 10 }, (_, j) => { const a = j / 10 * Math.PI * 2 + Math.PI / 2, r = j % 2 ? .22 : .55; return [Math.cos(a) * r, Math.sin(a) * r]; }), .12, mm, .03), 0, ty + .5, 0);
        if (p.cup === 'Ball') put(g, sph(.42, M(mc, p.f, 'Checker', '#111827', 3)), 0, ty + .4, 0);
        if (p.cup === 'Globe') { put(g, sph(.42, M('#2563eb', 'Glossy', 'Camo', '#16a34a', 1)), 0, ty + .45, 0); put(g, tor(.5, .03, mm), 0, ty + .45, 0, 0, Math.PI / 2, .3); }
        if (p.cup === 'Lightning') put(g, extrude([[-.1, 0], [.25, .45], [.05, .45], [.3, 1], [-.25, .35], [-.02, .35], [-.25, 0]], .12, mm, .02), 0, ty, 0);
        if (p.cup === 'Taco') { put(g, new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .25, 32, 1, false, 0, Math.PI), mm), 0, ty + .5, 0, 0, 0, Math.PI / 2); for (let i = 0; i < 5; i++) put(g, sph(.08, M(['#16a34a', '#dc2626', '#facc15'][i % 3], 'Glossy')), (i - 2) * .08, ty + .55, 0); }
        if (p.cup === 'Cup') { const hy = ty + ch * .65; if (p.handles === 'Loops') for (const s2 of [-1, 1]) put(g, tor(.2, .035, mm, Math.PI * 1.2), s2 * .55, hy, 0, 0, s2 > 0 ? 0 : Math.PI, -Math.PI * .6); if (p.handles === 'Wings') for (const s2 of [-1, 1]) put(g, extrude([[0, 0], [s2 * .5, .3], [s2 * .45, .05], [s2 * .3, -.1]], .04, mm, .01), s2 * .45, hy - .1, 0); if (p.handles === 'Flames') for (const s2 of [-1, 1]) put(g, cone(.1, .4, glowM('#f97316'), 10), s2 * .6, hy, 0, 0, 0, -s2 * .6); }
        if (p.gems) for (let i = 0; i < 4; i++) put(g, new THREE.Mesh(new THREE.OctahedronGeometry(.07, 0), M(p.gemc, 'Glass')), (i - 1.5) * .25, .45, .6);
        if (p.ribbon) { put(g, tor(.2, .04, M(p.ribc, 'Satin')), 0, y + .1 + p.h * .2, 0, Math.PI / 2); put(g, box(.08, .4, .02, M(p.ribc, 'Satin')), .1, y + p.h * .1, .2, 0, 0, .2); put(g, box(.08, .4, .02, M(p.ribc, 'Satin')), -.1, y + p.h * .1, .2, 0, 0, -.2); }
        g.scale.setScalar(1.2); return g;
    } };
// ==========================================
// THE STUDIO
// ==========================================
const S3 = { obj: 'car', p: {}, env: { light: 'Studio', floor: 'Disc', bg: '#1e1b2e', spin: true, shadow: true }, hist: [], fut: [], name: '', curId: null };
window.__d3 = S3;
const defaults3 = id => { const o = {}; for (const gr of Object.values(OBJ[id].groups)) for (const [k, , , d] of gr) o[k] = d; return o; };
const root = document.getElementById('s3');
root.innerHTML = `<div class="t3"><h1>✨ Design Anything 3D</h1><input id="d3-name" placeholder="Name your design"><button class="b3" id="d3-undo">↶ Undo</button><button class="b3" id="d3-redo">↷ Redo</button><button class="b3" id="d3-rand">🎲 Randomize</button><button class="b3" id="d3-reset">Reset</button><span class="sp"></span><button class="b3" id="d3-shot">📸 Snapshot</button><button class="b3" id="d3-gal">📁 My 3D designs</button><button class="b3 on" id="d3-save">💾 Save</button><button class="b3" id="d3-2d">🖼️ 2D Posters</button></div>
  <div class="cat"><h3>Objects</h3><div class="objs" id="d3-objs"></div><h3>Tips</h3><p style="color:#9d96c7;line-height:1.6">Drag to turn, wheel to zoom, right-drag (or SHIFT) to move the camera. Every option on the right rebuilds the model live.</p></div>
  <div class="view" id="d3-view3"><canvas id="d3-cv"></canvas><div class="hint" id="d3-hint"></div><div class="vbar"><select id="d3-light">${['Studio', 'Sunset', 'Night', 'Neon', 'Daylight', 'Spooky'].map(l => `<option>${l}</option>`).join('')}</select><select id="d3-floor">${['Disc', 'Grid', 'Grass', 'Wood', 'Water', 'None'].map(l => `<option>${l}</option>`).join('')}</select><input type="color" id="d3-bg" title="Background" style="width:40px;height:30px;border:0;background:none"><button class="b3" id="d3-spin">⟳ Spin</button><button class="b3" id="d3-fit">⌖ Fit</button></div></div>
  <div class="opt" id="d3-opt"></div>`;
const $3 = id => document.getElementById(id);
// renderer, scene, camera, lights
const view3 = $3('d3-view3'), cv3 = $3('d3-cv');
const R3 = new THREE.WebGLRenderer({ canvas: cv3, antialias: true, preserveDrawingBuffer: true }); R3.setPixelRatio(Math.min(2, devicePixelRatio || 1)); R3.shadowMap.enabled = true; R3.shadowMap.type = THREE.PCFSoftShadowMap; R3.toneMapping = THREE.ACESFilmicToneMapping; R3.outputColorSpace = THREE.SRGBColorSpace;
const sc3 = new THREE.Scene(), cam3 = new THREE.PerspectiveCamera(38, 1, .05, 200);
const pm = new THREE.PMREMGenerator(R3);
function envMap(top, bot) { const s = new THREE.Scene(), m = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { a: { value: new THREE.Color(top) }, b: { value: new THREE.Color(bot) } }, vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }', fragmentShader: 'uniform vec3 a,b; varying vec3 p; void main(){ float h = smoothstep(-.3,.8,p.y); vec3 c = mix(b,a,h) + vec3(1.)*pow(max(0.,dot(p,normalize(vec3(.4,.6,.5)))),40.)*2.; gl_FragColor = vec4(c,1.); }' })); s.add(m); return pm.fromScene(s).texture; }
const hemi3 = new THREE.HemisphereLight(0xffffff, 0x333344, .6), key3 = new THREE.DirectionalLight(0xffffff, 2.2), rim3 = new THREE.DirectionalLight(0x99bbff, 1);
key3.position.set(4, 7, 5); key3.castShadow = true; key3.shadow.mapSize.set(2048, 2048); Object.assign(key3.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: .5, far: 30 }); key3.shadow.bias = -.0004; key3.shadow.radius = 4;
rim3.position.set(-5, 3, -4); sc3.add(hemi3, key3, rim3);
const floorG = G(); sc3.add(floorG);
const LIGHTS = { Studio: { hemi: [0xffffff, 0x404050, .7], key: [0xffffff, 2.2], rim: [0x99bbff, 1], env: ['#f0f0ff', '#303040'] }, Sunset: { hemi: [0xffc48a, 0x402020, .6], key: [0xff9a4d, 2.4], rim: [0x8b5cf6, 1.4], env: ['#ffb070', '#3b1f3a'] },
    Night: { hemi: [0x5566aa, 0x101020, .35], key: [0xaabbff, 1.1], rim: [0x22d3ee, 1.6], env: ['#283a6a', '#05060c'] }, Neon: { hemi: [0xff66cc, 0x110022, .45], key: [0xff3fa4, 1.6], rim: [0x22d3ee, 2.4], env: ['#ff4fb5', '#0b0320'] },
    Daylight: { hemi: [0xbfe3ff, 0x6b8e4e, .9], key: [0xfff6e0, 2.8], rim: [0xffffff, .5], env: ['#9fd3ff', '#6b8e4e'] }, Spooky: { hemi: [0x66ff99, 0x100010, .35], key: [0x9b5cff, 1.4], rim: [0x66ff66, 1.6], env: ['#3a5a3a', '#0a0010'] } };
const ENVS = {};
function applyEnv() {
    const L = LIGHTS[S3.env.light]; hemi3.color.setHex(L.hemi[0]); hemi3.groundColor.setHex(L.hemi[1]); hemi3.intensity = L.hemi[2]; key3.color.setHex(L.key[0]); key3.intensity = L.key[1]; rim3.color.setHex(L.rim[0]); rim3.intensity = L.rim[1];
    sc3.environment = ENVS[S3.env.light] || (ENVS[S3.env.light] = envMap(...L.env)); sc3.background = new THREE.Color(S3.env.bg);
    floorG.clear(); const f = S3.env.floor;
    if (f !== 'None') { const fm = { Disc: M('#3a3550', 'Satin'), Grid: M('#1f1b33', 'Matte', 'Checker', '#2c2747', 10), Grass: M('#3f7d2a', 'Matte', 'Camo', '#4f9a35', 6), Wood: M('#8a5a33', 'Satin', 'Wood', '#5b3a1f', 4), Water: M('#1e6fa8', 'Glossy', 'Zigzag', '#2a86c4', 8) }[f];
        const fl = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.2, .1, 64), fm); fl.position.y = -.05; fl.receiveShadow = true; floorG.add(fl); }
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: .35 })); sh.rotation.x = -Math.PI / 2; sh.position.y = .002; sh.receiveShadow = true; floorG.add(sh);
    $3('d3-light').value = S3.env.light; $3('d3-floor').value = S3.env.floor; $3('d3-bg').value = S3.env.bg; $3('d3-spin').classList.toggle('on', S3.env.spin);
}
// the model
let model = null, cam = { th: .7, ph: 1.15, d: 7, tx: 0, ty: 1, tz: 0 };
function disposeTree(o) { o.traverse(x => { if (x.geometry) x.geometry.dispose(); if (x.material && !Array.from(MATS.values()).includes(x.material)) { if (x.material.map && !Array.from(TEX.values()).includes(x.material.map)) x.material.map.dispose(); x.material.dispose && x.material.dispose(); } }); }
function rebuild(fit) {
    if (model) { sc3.remove(model); disposeTree(model); }
    try { model = OBJ[S3.obj].build(S3.p); } catch (e) { console.error(e); model = G(); }
    model.traverse(x => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
    const holder = G(); holder.add(model); model = holder; sc3.add(model);
    const bb = new THREE.Box3().setFromObject(model), sz = bb.getSize(new THREE.Vector3()), mn = bb.min.y;
    if (mn < -.001 || mn > .2) model.position.y -= mn;
    if (fit) { const r = Math.max(sz.x, sz.y, sz.z); cam.d = r * 1.9 + 1.5; cam.ty = sz.y * .45; cam.tx = cam.tz = 0; }
    $3('d3-hint').textContent = OBJ[S3.obj].n + ' · ' + Object.keys(S3.p).length + ' options';
}
function size3() { const w = view3.clientWidth, h = view3.clientHeight; R3.setSize(w, h, false); cam3.aspect = w / Math.max(1, h); cam3.updateProjectionMatrix(); }
new ResizeObserver(size3).observe(view3);
// camera: orbit / zoom / pan
let drag3 = null;
cv3.addEventListener('pointerdown', e => { drag3 = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey }; cv3.setPointerCapture(e.pointerId); S3.env.spinPaused = true; });
cv3.addEventListener('pointermove', e => { if (!drag3) return; const dx = e.clientX - drag3.x, dy = e.clientY - drag3.y; drag3.x = e.clientX; drag3.y = e.clientY;
    if (drag3.pan) { const k = cam.d * .0015; cam.tx -= (Math.cos(cam.th) * dx) * k; cam.tz += (Math.sin(cam.th) * dx) * k; cam.ty += dy * k; } else { cam.th -= dx * .008; cam.ph = Math.max(.15, Math.min(1.55, cam.ph - dy * .006)); } });
addEventListener('pointerup', () => { drag3 = null; setTimeout(() => { S3.env.spinPaused = false; }, 1500); });
cv3.addEventListener('contextmenu', e => e.preventDefault());
cv3.addEventListener('wheel', e => { e.preventDefault(); cam.d = Math.max(1.2, Math.min(40, cam.d * (e.deltaY > 0 ? 1.1 : .9))); }, { passive: false });
// the object list
function paintObjs() { $3('d3-objs').innerHTML = Object.entries(OBJ).map(([id, o]) => `<button class="obj ${S3.obj === id ? 'on' : ''}" data-o="${id}"><b>${o.ic}</b>${o.n}</button>`).join(''); $3('d3-objs').querySelectorAll('[data-o]').forEach(b => b.onclick = () => pick(b.dataset.o)); }
function pick(id, p) { S3.obj = id; S3.p = Object.assign(defaults3(id), p || {}); S3.hist = []; S3.fut = []; if (!p) S3.curId = null; paintObjs(); paintOpts(); rebuild(true); paintUndo(); }
// the options panel, built from the object's groups
const esc3 = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
function paintOpts() {
    const o = OBJ[S3.obj], P = S3.p; let h = `<h3>${o.ic} ${o.n}</h3>`;
    Object.entries(o.groups).forEach(([gn, list], gi) => {
        h += `<details ${gi < 2 ? 'open' : ''}><summary>${gn}</summary>`;
        for (const [k, l, kind, , a, b2, st] of list) {
            if (kind === 'n') h += `<label class="r">${l}<input type="range" data-k="${k}" min="${a}" max="${b2}" step="${st}" value="${P[k]}"><output>${+(+P[k]).toFixed(st >= 1 ? 0 : 2)}</output></label>`;
            else if (kind === 'c') h += `<label class="r">${l}<input type="color" data-k="${k}" value="${P[k]}"><span></span></label>`;
            else if (kind === 'b') h += `<label class="r sel">${l}<div class="chips"><button data-k="${k}" data-v="1" class="${P[k] ? 'on' : ''}">On</button><button data-k="${k}" data-v="0" class="${P[k] ? '' : 'on'}">Off</button></div></label>`;
            else if (kind === 't') h += `<label class="r sel">${l}<input type="text" data-k="${k}" maxlength="18" value="${esc3(P[k])}"></label>`;
            else h += a.length <= 6 ? `<label class="r sel">${l}<div class="chips">${a.map(v => `<button data-k="${k}" data-v="${esc3(v)}" class="${P[k] === v ? 'on' : ''}">${v}</button>`).join('')}</div></label>` : `<label class="r sel">${l}<select data-k="${k}">${a.map(v => `<option ${P[k] === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`;
        }
        h += '</details>';
    });
    $3('d3-opt').innerHTML = h;
    const box = $3('d3-opt'), kindOf = k => { for (const gr of Object.values(o.groups)) for (const row of gr) if (row[0] === k) return row[2]; };
    box.querySelectorAll('input[type=range]').forEach(el => { el.onpointerdown = () => push(); el.oninput = () => { S3.p[el.dataset.k] = +el.value; el.nextElementSibling.textContent = +(+el.value).toFixed(+el.step >= 1 ? 0 : 2); live(); }; });
    box.querySelectorAll('input[type=color]').forEach(el => { el.onfocus = () => push(); el.oninput = () => { S3.p[el.dataset.k] = el.value; live(); }; });
    box.querySelectorAll('input[type=text]').forEach(el => { el.onfocus = () => push(); el.oninput = () => { S3.p[el.dataset.k] = el.value; live(); }; el.onkeydown = e => e.stopPropagation(); });
    box.querySelectorAll('select').forEach(el => { el.onchange = () => { push(); S3.p[el.dataset.k] = el.value; rebuild(); }; });
    box.querySelectorAll('.chips button').forEach(el => { el.onclick = () => { push(); const k = el.dataset.k; S3.p[k] = kindOf(k) === 'b' ? el.dataset.v === '1' : el.dataset.v; rebuild(); el.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === el)); }; });
}
let liveT = 0; function live() { cancelAnimationFrame(liveT); liveT = requestAnimationFrame(() => rebuild()); }
function push() { S3.hist.push(JSON.stringify(S3.p)); if (S3.hist.length > 80) S3.hist.shift(); S3.fut = []; paintUndo(); }
function paintUndo() { $3('d3-undo').disabled = !S3.hist.length; $3('d3-redo').disabled = !S3.fut.length; }
$3('d3-undo').onclick = () => { if (!S3.hist.length) return; S3.fut.push(JSON.stringify(S3.p)); S3.p = JSON.parse(S3.hist.pop()); paintOpts(); rebuild(); paintUndo(); };
$3('d3-redo').onclick = () => { if (!S3.fut.length) return; S3.hist.push(JSON.stringify(S3.p)); S3.p = JSON.parse(S3.fut.pop()); paintOpts(); rebuild(); paintUndo(); };
$3('d3-reset').onclick = () => { push(); S3.p = defaults3(S3.obj); paintOpts(); rebuild(true); };
function randomize() {
    push(); const o = OBJ[S3.obj], h0 = Math.random();
    for (const gr of Object.values(o.groups)) for (const [k, , kind, d, a, b2, st] of gr) {
        if (kind === 'n') S3.p[k] = +(Math.round(rnd(a, b2) / st) * st).toFixed(st >= 1 ? 0 : 2);
        else if (kind === 'c') S3.p[k] = '#' + new THREE.Color().setHSL((h0 + Math.random() * .5) % 1, .45 + Math.random() * .5, .35 + Math.random() * .4).getHexString();
        else if (kind === 'b') S3.p[k] = Math.random() < .6;
        else if (kind === 's') S3.p[k] = a[Math.floor(Math.random() * a.length)] === 'None' && Math.random() < .5 ? a[1] : a[Math.floor(Math.random() * a.length)];
    }
    paintOpts(); rebuild(true);
}
$3('d3-rand').onclick = randomize;
addEventListener('keydown', e => { if (root.classList.contains('hidden') || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return; if (/^(Delete|Backspace|Arrow\w+|\[|\])$/.test(e.key)) { e.stopImmediatePropagation(); return; } const mod = e.ctrlKey || e.metaKey; if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.stopImmediatePropagation(); (e.shiftKey ? $3('d3-redo') : $3('d3-undo')).click(); } if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); e.stopImmediatePropagation(); $3('d3-redo').click(); } if (e.key === 'r' && !mod) randomize(); }, true);
// environment bar
$3('d3-light').onchange = e => { S3.env.light = e.target.value; applyEnv(); };
$3('d3-floor').onchange = e => { S3.env.floor = e.target.value; applyEnv(); };
$3('d3-bg').oninput = e => { S3.env.bg = e.target.value; applyEnv(); };
$3('d3-spin').onclick = () => { S3.env.spin = !S3.env.spin; applyEnv(); };
$3('d3-fit').onclick = () => rebuild(true);
// snapshot, save, gallery
function snapshot(w) { R3.render(sc3, cam3); const c = document.createElement('canvas'), k = (w || cv3.width) / cv3.width; c.width = cv3.width * k; c.height = cv3.height * k; c.getContext('2d').drawImage(cv3, 0, 0, c.width, c.height); return c.toDataURL(w ? 'image/jpeg' : 'image/png', .8); }
$3('d3-shot').onclick = () => { const a = document.createElement('a'); a.href = snapshot(); a.download = (($3('d3-name').value || OBJ[S3.obj].n).replace(/[^\w-]+/g, '_')) + '.png'; document.body.appendChild(a); a.click(); a.remove(); };
$3('d3-save').onclick = () => { const rec = { id: S3.curId || Date.now(), name: $3('d3-name').value || ('My ' + OBJ[S3.obj].n.toLowerCase()), obj: S3.obj, p: clone3(S3.p), env: clone3(S3.env), img: snapshot(260), at: Date.now() }; const i = ST3.designs.findIndex(d => d.id === rec.id); if (i >= 0) ST3.designs[i] = rec; else ST3.designs.unshift(rec); S3.curId = rec.id; if (save3()) { const b = $3('d3-save'); b.textContent = '✓ Saved'; setTimeout(() => { b.textContent = '💾 Save'; }, 1200); } };
const clone3 = o => JSON.parse(JSON.stringify(o));
$3('d3-gal').onclick = () => { const v = $3('d3-view3'), old = v.querySelector('.gal'); if (old) { old.remove(); return; } const d = document.createElement('div'); d.className = 'gal';
    d.innerHTML = `<h2 style="margin-top:0">My 3D designs (${ST3.designs.length}) <button class="b3" style="float:right" id="d3-galx">Close</button></h2>${ST3.designs.length ? '' : '<p>Nothing saved yet: press Save.</p>'}<div class="g">${ST3.designs.map((r, i) => `<div class="it" data-i="${i}"><img src="${r.img}"><b>${esc3(r.name)}</b><br><small>${OBJ[r.obj] ? OBJ[r.obj].n : ''} · ${new Date(r.at).toLocaleDateString()}</small><br><a href="#" data-del="${i}" style="color:#f87171">delete</a></div>`).join('')}</div>`;
    v.appendChild(d); $3('d3-galx').onclick = () => d.remove();
    d.querySelectorAll('[data-i]').forEach(el => el.onclick = e => { if (e.target.dataset.del) { e.preventDefault(); ST3.designs.splice(+e.target.dataset.del, 1); save3(); d.remove(); $3('d3-gal').click(); return; } const r = ST3.designs[+el.dataset.i]; S3.env = Object.assign(S3.env, r.env); applyEnv(); pick(r.obj, r.p); S3.curId = r.id; $3('d3-name').value = r.name; d.remove(); }); };
// switching to the 2D poster editor and back
$3('d3-2d').onclick = () => { root.classList.add('hidden'); dispatchEvent(new Event('resize')); };
(function add3dButton() { const top = document.getElementById('top'); if (!top || document.getElementById('t-3d')) return; const b = document.createElement('button'); b.className = 'tb main'; b.id = 't-3d'; b.textContent = '🧊 3D Objects'; b.onclick = () => root.classList.remove('hidden'); top.insertBefore(b, top.children[1]); })();
// the loop
let lastT = performance.now();
function loop3(now) {
    requestAnimationFrame(loop3); const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
    if (root.classList.contains('hidden')) return;
    if (S3.env.spin && !S3.env.spinPaused && model) model.rotation.y += dt * .35;
    cam3.position.set(cam.tx + Math.sin(cam.th) * Math.sin(cam.ph) * cam.d, cam.ty + Math.cos(cam.ph) * cam.d, cam.tz + Math.cos(cam.th) * Math.sin(cam.ph) * cam.d); cam3.lookAt(cam.tx, cam.ty, cam.tz);
    R3.render(sc3, cam3);
}
size3(); applyEnv(); paintObjs(); pick('car'); requestAnimationFrame(loop3);
// tests
Object.assign(S3, { OBJ, pick, rebuild, randomize, defaults3, snapshot, store: () => ST3 }); Object.defineProperty(S3, 'model', { get: () => model });
