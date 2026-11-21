// ==========================================
// GOLF, two ways (pick in the options): MINI GOLF, 9 holes with walls, bumpers and a windmill; REGULAR GOLF, 6 holes
// with fairway, rough, sand, water, trees and wind, and four clubs. Players take turns, lowest total wins.
// Left / right aims, up / down picks the club (regular golf), SPACE starts the swing, SPACE again sets the power.
// Water costs a stroke (the ball comes back); a hole stops at 8 strokes (mini) or 10 (regular).
// ==========================================
const MINI = [      // world 40 x 26. walls: [x1,y1,x2,y2]; bump: [x,y,r]; mill: [x,y] (a turning blade)
    { par: 2, tee: [6, 13], cup: [34, 13], walls: [] },
    { par: 2, tee: [6, 6], cup: [34, 20], walls: [[20, 0, 20, 17]] },
    { par: 3, tee: [6, 20], cup: [34, 20], walls: [[14, 8, 14, 26], [26, 0, 26, 18]] },
    { par: 2, tee: [6, 13], cup: [34, 13], walls: [], bump: [[20, 13, 2.2], [27, 8, 1.6], [27, 18, 1.6]] },
    { par: 3, tee: [5, 5], cup: [35, 21], walls: [[12, 0, 12, 18], [20, 8, 20, 26], [28, 0, 28, 18]] },
    { par: 2, tee: [6, 13], cup: [34, 13], walls: [[18, 0, 18, 9], [18, 17, 18, 26]], mill: [18, 13] },
    { par: 3, tee: [20, 22], cup: [20, 4], walls: [[8, 13, 32, 13]], bump: [[4, 13, 1.5], [36, 13, 1.5]] },
    { par: 2, tee: [6, 20], cup: [34, 6], walls: [[0, 9, 26, 9], [14, 17, 40, 17]] },
    { par: 3, tee: [6, 13], cup: [36, 13], walls: [[14, 4, 14, 22], [24, 0, 24, 9], [24, 17, 24, 26]], bump: [[30, 13, 1.8]], mill: [19, 13] }
];
// regular golf: world 300 x 130 metres (scaled), features [kind, x, y, rx, ry]: fair (fairway ellipse), sand, water, green, tree
const LINKS = [
    { par: 4, tee: [20, 65], cup: [262, 60], f: [['fair', 140, 65, 125, 28], ['sand', 210, 92, 12, 8], ['water', 120, 25, 22, 12], ['green', 262, 60, 16, 13], ['tree', 80, 100, 7], ['tree', 180, 30, 8]] },
    { par: 3, tee: [30, 70], cup: [190, 60], f: [['water', 110, 65, 30, 50], ['green', 190, 60, 16, 14], ['sand', 210, 75, 8, 6], ['sand', 172, 44, 8, 6]] },
    { par: 5, tee: [15, 110], cup: [282, 22], f: [['fair', 90, 95, 75, 22], ['fair', 200, 45, 90, 22], ['water', 150, 80, 18, 18], ['sand', 255, 35, 10, 7], ['green', 282, 22, 14, 12], ['tree', 130, 40, 9], ['tree', 60, 60, 8], ['tree', 230, 95, 9]] },
    { par: 4, tee: [20, 20], cup: [250, 100], f: [['fair', 120, 55, 110, 25], ['sand', 160, 80, 12, 7], ['sand', 230, 80, 9, 6], ['green', 250, 100, 15, 13], ['tree', 200, 40, 10], ['water', 90, 105, 30, 12]] },
    { par: 3, tee: [40, 65], cup: [210, 65], f: [['fair', 150, 65, 45, 18], ['sand', 195, 50, 9, 6], ['sand', 195, 80, 9, 6], ['green', 210, 65, 15, 12], ['water', 230, 65, 6, 40]] },
    { par: 4, tee: [20, 65], cup: [270, 65], f: [['fair', 150, 65, 130, 24], ['water', 160, 65, 14, 30], ['tree', 220, 40, 8], ['tree', 220, 92, 8], ['sand', 255, 50, 8, 6], ['green', 270, 65, 15, 13]] }
];
const CLUBS = [{ n: 'Driver', d: 230 }, { n: '5 iron', d: 165 }, { n: 'Wedge', d: 95 }, { n: 'Putter', d: 30 }];
SPORTS.golf = {
    n: 'Golf', ic: '⛳', sub: 'Mini golf or the real thing', desc: 'Mini golf: 9 holes with walls, bumpers and windmills. Regular golf: 6 holes with fairways, sand, water, trees, wind and four clubs. Lowest score wins.',
    max: 4, turns: true, keys: '←/→ aim · ↑/↓ club (regular golf) · SPACE swing, SPACE power', defOpts: { mode: 'mini' }, optList: [['mode', 'Course', [['mini', 'Mini golf'], ['links', 'Regular golf']]]],
    get W() { return SM.st && SM.st.mode === 'links' ? 300 : 40; }, get H() { return SM.st && SM.st.mode === 'links' ? 130 : 26; }, bg: '#0f2a18',
    init(P, o) { const st = { mode: o.mode || 'mini', n: P.length, hole: 0, cur: 0, strokes: P.map(() => []), diff: o.diff, ph: 'aim', ang: 0, pow: 0, osc: 0, club: 0, ball: null, pos: [], done: [], wind: [0, 0], wait: .8, mill: 0 }; this.startHole(st); return st; },
    holes(st) { return st.mode === 'links' ? LINKS : MINI; },
    startHole(st) {
        const H = this.holes(st)[st.hole]; st.pos = SM.P.map(() => ({ x: H.tee[0], y: H.tee[1], lie: 'tee' })); st.done = SM.P.map(() => false); st.strokes.forEach(s => s[st.hole] = 0);
        st.cur = 0; st.ph = 'aim'; st.ball = null; st.wind = st.mode === 'links' ? [rnd(-1, 1) * 6, rnd(-1, 1) * 4] : [0, 0]; this.aimAt(st); st.wait = 1;
        ev(st, 'whistle', 'Hole ' + (st.hole + 1) + ' · par ' + H.par);
    },
    aimAt(st) { const H = this.holes(st)[st.hole], p = st.pos[st.cur]; st.ang = angTo(p.x, p.y, H.cup[0], H.cup[1]); st.club = st.mode === 'links' ? this.pickClub(st) : 3; },
    pickClub(st) { const H = this.holes(st)[st.hole], p = st.pos[st.cur], D = hyp(H.cup[0] - p.x, H.cup[1] - p.y); if (p.lie === 'green' || D < 25) return 3; return D > 180 ? 0 : D > 110 ? 1 : 2; },
    lieAt(st, x, y) {
        const H = this.holes(st)[st.hole]; let lie = 'rough';
        for (const f of H.f || []) { const [k, fx, fy, rx, ry] = f; const inside = k === 'tree' ? hyp(x - fx, y - fy) < rx : ((x - fx) / rx) ** 2 + ((y - fy) / ry) ** 2 < 1; if (inside && k !== 'tree') lie = k; }
        if (x < 0 || x > 300 || y < 0 || y > 130) lie = 'out';
        return lie;
    },
    step(st, dt, inp) {
        st.mill += dt;
        if (st.wait > 0) { st.wait -= dt; return; }
        const I = inp[st.cur] || blankIn(), H = this.holes(st)[st.hole], links = st.mode === 'links';
        if (st.ph === 'aim') {
            st.ang += (I.r - I.l) * dt * (links && st.club < 3 ? .5 : 1.1);
            if (links) { if (I.up) st.club = Math.max(0, st.club - 1); if (I.dp) st.club = Math.min(3, st.club + 1); }
            if (I.ap) { st.ph = 'pow'; st.osc = 0; }
        } else if (st.ph === 'pow') {
            st.osc += dt * 1.6; st.pow = (1 - Math.cos(st.osc)) / 2;
            if (I.ap) this.shoot(st);
        } else if (st.ph === 'roll') this.roll(st, dt);
    },
    shoot(st) {
        const p = st.pos[st.cur], links = st.mode === 'links'; st.strokes[st.cur][st.hole]++; ev(st, 'hit');
        if (!links) { const v = 4 + st.pow * 26; st.ball = { x: p.x, y: p.y, vx: Math.cos(st.ang) * v, vy: Math.sin(st.ang) * v, z: 0, vz: 0, air: false }; }
        else {
            const C = CLUBS[st.club], lieK = { tee: 1, fair: 1, green: 1, rough: .8, sand: .55 }[p.lie] || .8, D = C.d * st.pow * lieK * (st.club === 3 ? 1 : rnd(.94, 1.04));
            if (st.club === 3) { const v = 3 + st.pow * 26; st.ball = { x: p.x, y: p.y, vx: Math.cos(st.ang) * v, vy: Math.sin(st.ang) * v, z: 0, vz: 0, air: false }; }
            else { const T = 1.2 + D / 120, wx = st.wind[0] * T * .6, wy = st.wind[1] * T * .6, a = st.ang + rnd(-1, 1) * (st.pow > .92 ? .08 : .02); st.ball = { x: p.x, y: p.y, fx: p.x + Math.cos(a) * D + wx, fy: p.y + Math.sin(a) * D + wy, t: 0, T, air: true, x0: p.x, y0: p.y, roll: D * .12 }; }
        }
        st.ph = 'roll';
    },
    roll(st, dt) {
        const b = st.ball, H = this.holes(st)[st.hole], links = st.mode === 'links';
        if (b.air) {      // regular golf: a flight, then a short roll
            b.t += dt; const u = Math.min(1, b.t / b.T); b.x = lerp(b.x0, b.fx, u); b.y = lerp(b.y0, b.fy, u); b.z = Math.sin(u * Math.PI) * (12 + b.T * 6);
            if (u >= 1) { const lie = this.lieAt(st, b.x, b.y), a = Math.atan2(b.fy - b.y0, b.fx - b.x0), k = lie === 'fair' || lie === 'green' ? 1 : lie === 'rough' ? .4 : 0; b.air = false; b.z = 0; b.vx = Math.cos(a) * b.roll * k; b.vy = Math.sin(a) * b.roll * k; for (const f of H.f) if (f[0] === 'tree' && hyp(b.x - f[1], b.y - f[2]) < f[3]) { b.vx *= -.2; b.vy *= -.2; ev(st, 'hit', 'Off the trees!'); } }
            return;
        }
        const lie = links ? this.lieAt(st, b.x, b.y) : 'mini', fr = { mini: 1.1, green: .9, fair: 2.2, rough: 4, sand: 8, tee: 2.2, water: 9, out: 9 }[lie] || 2;
        const sub = 3, h = dt / sub;
        for (let s = 0; s < sub; s++) {
            b.x += b.vx * h; b.y += b.vy * h; const f = Math.exp(-fr * h); b.vx *= f; b.vy *= f;
            if (!links) this.miniCollide(st, b);
            const d = hyp(b.x - H.cup[0], b.y - H.cup[1]), sp = hyp(b.vx, b.vy);
            if (d < (links ? 1.2 : .55) && sp < (links ? 9 : 11)) { this.holed(st); return; }
        }
        if (hyp(b.vx, b.vy) < .25) this.stopped(st);
    },
    miniCollide(st, b) {
        const H = this.holes(st)[st.hole], R = .35, walls = H.walls.concat([[0, 0, 40, 0], [40, 0, 40, 26], [40, 26, 0, 26], [0, 26, 0, 0]]);
        if (H.mill) { const a = st.mill * 1.6; walls.push([H.mill[0] + Math.cos(a) * 4, H.mill[1] + Math.sin(a) * 4, H.mill[0] - Math.cos(a) * 4, H.mill[1] - Math.sin(a) * 4]); }
        for (const [x1, y1, x2, y2] of walls) {
            const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy, t = clamp(((b.x - x1) * dx + (b.y - y1) * dy) / L2, 0, 1), px = x1 + dx * t, py = y1 + dy * t, d = hyp(b.x - px, b.y - py);
            if (d < R) { const nx = (b.x - px) / (d || 1), ny = (b.y - py) / (d || 1), vn = b.vx * nx + b.vy * ny; b.x = px + nx * R; b.y = py + ny * R; if (vn < 0) { b.vx -= 1.85 * vn * nx; b.vy -= 1.85 * vn * ny; if (vn < -3) ev(st, 'blip'); } }
        }
        for (const [x, y, r] of H.bump || []) { const d = hyp(b.x - x, b.y - y); if (d < r + R) { const nx = (b.x - x) / d, ny = (b.y - y) / d, vn = b.vx * nx + b.vy * ny; b.x = x + nx * (r + R); b.y = y + ny * (r + R); if (vn < 0) { b.vx -= 2.3 * vn * nx; b.vy -= 2.3 * vn * ny; ev(st, 'hit'); } } }
    },
    holed(st) {
        const H = this.holes(st)[st.hole], n = st.strokes[st.cur][st.hole], d = n - H.par;
        ev(st, 'score', n === 1 ? 'HOLE IN ONE!' : d <= -2 ? 'Eagle!' : d === -1 ? 'Birdie!' : d === 0 ? 'Par' : d === 1 ? 'Bogey' : '+' + d);
        st.done[st.cur] = true; st.pos[st.cur] = { x: H.cup[0], y: H.cup[1], lie: 'cup' }; st.ball = null; this.next(st);
    },
    stopped(st) {
        const b = st.ball, links = st.mode === 'links', p = st.pos[st.cur]; let lie = links ? this.lieAt(st, b.x, b.y) : 'mini';
        if (lie === 'water' || lie === 'out') { st.strokes[st.cur][st.hole]++; ev(st, 'lose', lie === 'water' ? 'Splash! +1 stroke' : 'Out of bounds! +1'); }
        else st.pos[st.cur] = { x: b.x, y: b.y, lie: links ? lie : 'mini' };
        const max = links ? 10 : 8; if (st.strokes[st.cur][st.hole] >= max) { st.done[st.cur] = true; ev(st, 'blip', 'Picked up'); }
        st.ball = null; this.next(st);
    },
    next(st) {
        // whoever is furthest from the cup and not done goes next
        const H = this.holes(st)[st.hole]; let best = -1, bd = -1;
        st.pos.forEach((p, i) => { if (st.done[i]) return; const d = hyp(p.x - H.cup[0], p.y - H.cup[1]); if (d > bd) { bd = d; best = i; } });
        st.wait = .9;
        if (best < 0) { st.hole++; if (st.hole < this.holes(st).length) this.startHole(st); return; }
        st.cur = best; st.ph = 'aim'; this.aimAt(st);
    },
    bot(st, i, dt) {
        const I = blankIn(); if (st.cur !== i || st.wait > 0) return I;
        const H = this.holes(st)[st.hole], p = st.pos[i], skill = [.6, .8, .95][st.diff], links = st.mode === 'links';
        st.bt = st.bt || {}; const B = st.bt;
        if (st.ph === 'aim') {
            if (B.key !== st.hole * 100 + st.strokes[i][st.hole]) { B.key = st.hole * 100 + st.strokes[i][st.hole]; B.t = 0; B.tgt = this.botAim(st, p, H) + rnd(-1, 1) * .08 * (1.1 - skill); B.pw = this.botPow(st, p, H) * rnd(1 - .12 * (1.1 - skill), 1 + .12 * (1.1 - skill)); }
            const d = Math.atan2(Math.sin(B.tgt - st.ang), Math.cos(B.tgt - st.ang)); if (Math.abs(d) > .02) I[d > 0 ? 'r' : 'l'] = 1; else if ((B.t += dt) > .4) I.a = 1;
        } else if (st.ph === 'pow') { if (st.pow >= clamp(B.pw, .05, .98) && st.osc < Math.PI) I.a = 1; }
        return I;
    },
    botAim(st, p, H) {
        if (st.mode === 'links') return angTo(p.x, p.y, H.cup[0] - st.wind[0] * .5, H.cup[1] - st.wind[1] * .5);
        // mini golf: aim straight if nothing is in the way, otherwise at a point beside the first wall (a gap) or off a wall
        const direct = angTo(p.x, p.y, H.cup[0], H.cup[1]); if (!H.walls.some(w => this.cross(p, { x: H.cup[0], y: H.cup[1] }, w))) return direct;
        const gaps = []; for (let x = 2; x < 40; x += 2) for (let y = 2; y < 26; y += 2) { const q = { x, y }; if (!H.walls.some(w => this.cross(p, q, w)) && !H.walls.some(w => this.cross(q, { x: H.cup[0], y: H.cup[1] }, w))) gaps.push(q); }
        if (gaps.length) { gaps.sort((a, b) => (hyp(a.x - p.x, a.y - p.y) + hyp(a.x - H.cup[0], a.y - H.cup[1])) - (hyp(b.x - p.x, b.y - p.y) + hyp(b.x - H.cup[0], b.y - H.cup[1]))); p.via = gaps[0]; return angTo(p.x, p.y, gaps[0].x, gaps[0].y); }
        p.via = null; return direct + rnd(-.6, .6);
    },
    botPow(st, p, H) {
        if (st.mode === 'links') { if (st.club === 3) return clamp((hyp(H.cup[0] - p.x, H.cup[1] - p.y) * .9 * 1.12 - 3) / 26, .04, 1); return clamp(hyp(H.cup[0] - p.x, H.cup[1] - p.y) / CLUBS[st.club].d, .2, .95); }
        const D = p.via ? hyp(p.via.x - p.x, p.via.y - p.y) + hyp(H.cup[0] - p.via.x, H.cup[1] - p.via.y) * .8 : hyp(H.cup[0] - p.x, H.cup[1] - p.y);
        return clamp((D * 1.1 * 1.12 - 4) / 26, .03, 1);      // the ball rolls v / friction: aim a little past the cup
    },
    cross(a, b, w) { const [x1, y1, x2, y2] = w, d = (b.x - a.x) * (y2 - y1) - (b.y - a.y) * (x2 - x1); if (Math.abs(d) < 1e-6) return false; const t = ((x1 - a.x) * (y2 - y1) - (y1 - a.y) * (x2 - x1)) / d, u = ((x1 - a.x) * (b.y - a.y) - (y1 - a.y) * (b.x - a.x)) / d; return t > 0 && t < 1 && u > -0.05 && u < 1.05; },
    draw(g, st) {
        const H = this.holes(st)[st.hole], links = st.mode === 'links';
        if (!H) return;
        if (!links) {
            g.fillStyle = '#16a34a'; g.fillRect(0, 0, 40, 26); for (let i = 0; i < 40; i += 2) { g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(i, 0, 1, 26); }
            g.strokeStyle = '#92400e'; g.lineWidth = .6; g.strokeRect(0, 0, 40, 26);
            for (const [x1, y1, x2, y2] of H.walls) line(g, x1, y1, x2, y2, '#a16207', .6);
            for (const [x, y, r] of H.bump || []) { circ(g, x, y, r, '#f472b6', '#9d174d', .25); }
            if (H.mill) { const a = st.mill * 1.6; circ(g, H.mill[0], H.mill[1], 1.2, '#7c2d12'); line(g, H.mill[0] + Math.cos(a) * 4, H.mill[1] + Math.sin(a) * 4, H.mill[0] - Math.cos(a) * 4, H.mill[1] - Math.sin(a) * 4, '#f8fafc', .5); }
        } else {
            g.fillStyle = '#3f7d34'; g.fillRect(0, 0, 300, 130);
            const order = ['fair', 'water', 'sand', 'green', 'tree'];
            for (const k of order) for (const f of H.f.filter(x => x[0] === k)) { const [, x, y, rx, ry] = f;
                if (k === 'tree') { shadow(g, x, y, rx, .3); circ(g, x, y, rx, '#14532d', '#052e16', .8); circ(g, x - rx * .3, y - rx * .3, rx * .45, '#166534'); continue; }
                g.fillStyle = { fair: '#5cb85c', water: '#3b82f6', sand: '#e8d49a', green: '#86efac' }[k]; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); }
            g.fillStyle = '#a3e635'; g.fillRect(H.tee[0] - 3, H.tee[1] - 2, 6, 4);
        }
        circ(g, H.cup[0], H.cup[1], links ? 1.1 : .55, '#111');
        line(g, H.cup[0], H.cup[1], H.cup[0], H.cup[1] - (links ? 9 : 3), '#e5e7eb', links ? .4 : .12); g.fillStyle = '#ef4444'; g.beginPath(); g.moveTo(H.cup[0], H.cup[1] - (links ? 9 : 3)); g.lineTo(H.cup[0] + (links ? 5 : 1.6), H.cup[1] - (links ? 7.5 : 2.5)); g.lineTo(H.cup[0], H.cup[1] - (links ? 6 : 2)); g.fill();
        const R = links ? 1 : .35;
        st.pos.forEach((p, i) => { if (st.done[i] || (st.ball && i === st.cur)) return; shadow(g, p.x, p.y, R, .3); circ(g, p.x, p.y, R, colOf(i), '#fff', R * .25); });
        const b = st.ball; if (b) { shadow(g, b.x, b.y, R, .3); circ(g, b.x, b.y - (b.z || 0) * .3, R + (b.z || 0) * .02, colOf(st.cur), '#fff', R * .25); }
        if (st.ph === 'aim' || st.ph === 'pow') {
            const p = st.pos[st.cur], L = links ? (st.club === 3 ? 25 : CLUBS[st.club].d * .6) : 8;
            g.setLineDash([R * 1.2, R]); line(g, p.x, p.y, p.x + Math.cos(st.ang) * L, p.y + Math.sin(st.ang) * L, 'rgba(255,255,255,.85)', R * .4); g.setLineDash([]);
            if (st.ph === 'pow') { const x = links ? 280 : 37.5, y = links ? 20 : 4, h = links ? 90 : 18, w = links ? 6 : 1.2; g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x, y, w, h); g.fillStyle = st.pow > .9 ? '#ef4444' : '#22c55e'; g.fillRect(x, y + h * (1 - st.pow), w, h * st.pow); }
        }
        if (links) { g.font = 'bold 5px system-ui'; g.textAlign = 'left'; g.fillStyle = '#fff'; g.fillText('Wind ' + Math.round(hyp(...st.wind)) + ' ' + ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'][((Math.round(Math.atan2(st.wind[1], st.wind[0]) / (Math.PI / 4)) % 8) + 8) % 8] + '   ' + CLUBS[st.club].n + (st.pos[st.cur] ? ' · ' + st.pos[st.cur].lie : ''), 6, 124); }
    },
    hud(st) {
        const Hs = this.holes(st); if (!Hs[st.hole] && st.hole < Hs.length) return '';
        const tot = i => st.strokes[i].reduce((a, b) => a + (b || 0), 0), par = Hs.slice(0, st.hole + 1).reduce((a, h) => a + h.par, 0);
        return `<em>${st.mode === 'links' ? 'Regular golf' : 'Mini golf'} · hole ${Math.min(st.hole + 1, Hs.length)}/${Hs.length} · par ${(Hs[st.hole] || Hs[Hs.length - 1]).par}</em>` + SM.P.map((p, i) => `<span class="${i === st.cur ? 'cur' : ''}" style="color:${p.col}">${esc(nameOf(i))} <b>${tot(i)}</b></span>`).join('');
    },
    over(st) {
        if (st.hole < this.holes(st).length) return null;
        const t = SM.P.map((p, i) => st.strokes[i].reduce((a, b) => a + (b || 0), 0)), best = Math.min(...t), w = t.filter(x => x === best).length > 1 ? -1 : t.indexOf(best), par = this.holes(st).reduce((a, h) => a + h.par, 0);
        return { win: SM.P.length === 1 ? 0 : w, text: SM.P.map((p, i) => esc(nameOf(i)) + ' ' + t[i] + ' (' + (t[i] - par >= 0 ? '+' : '') + (t[i] - par) + ')').join(' · '), best: { [st.mode === 'links' ? 'golf' : 'mini']: t } };
    }
};
