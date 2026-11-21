// ==========================================
// TENNIS: you at the bottom, them at the top. Your player swings by itself when the ball comes into reach: hold
// left / right while it swings to aim, hold SPACE for a hard flat shot (riskier), Shift for a lob. SPACE serves.
// Real scoring: 15, 30, 40, deuce, advantage; first to 3 games wins (2 games ahead not needed).
// Court 10.97 x 23.77 m, net in the middle; the ball has height, bounces, can hit the net or land out.
// ==========================================
SPORTS.tennis = {
    n: 'Tennis', ic: '🎾', sub: 'First to 3 games', desc: 'Move into the ball and your player swings on its own. Aim with left and right as you hit, SPACE for power, Shift for a lob. Real 15-30-40 scoring, first to 3 games.',
    max: 2, W: 17, H: 31, bg: '#1e3a5f', keys: 'Arrows / WASD move · hold ←/→ while hitting to aim · SPACE power shot / serve · Shift lob',
    CW: 10.97, CL: 23.77, X0: 3, Y0: 3.6,
    init(P, o) { const st = { pl: [{ x: 8.5, y: 26.5 }, { x: 8.5, y: 4.5 }], ball: null, pts: [0, 0], gm: [0, 0], srv: 0, diff: o.diff, msg: '', wait: 1, last: -1, bounces: 0, side: 0 }; this.place(st); return st; },
    place(st) { const s = st.srv, n = st.pts[0] + st.pts[1]; st.pl[0] = { x: 8.5 + (n % 2 ? -2 : 2) * (s === 0 ? 1 : -1), y: 27.2 }; st.pl[1] = { x: 8.5 + (n % 2 ? 2 : -2) * (s === 1 ? 1 : -1), y: 3.8 }; st.ball = null; st.serving = true; },
    toss(st) { const s = st.srv, p = st.pl[s]; st.ball = { x: p.x, y: p.y + (s ? 1 : -1) * .3, z: 2.6, vx: 0, vy: 0, vz: 0 }; st.serving = false; st.last = -1; st.bounces = 0; this.hit(st, s, (Math.random() - .5) * .3, 0, true); },
    hit(st, i, aim, mode, serve) {      // send the ball toward the other half; aim -1..1 across, mode 0 normal, 1 power, 2 lob
        const b = st.ball, toY = i === 0 ? this.Y0 + (serve ? this.CL / 2 - 3.2 : rnd(1.5, 6)) : this.Y0 + (serve ? this.CL / 2 + 3.2 : this.CL - rnd(1.5, 6));
        const midX = this.X0 + this.CW / 2, toX = serve ? midX + (b.x > midX ? -1 : 1) * rnd(.6, 2.6) : midX + aim * this.CW * .42 + rnd(-.6, .6);
        const dist = hyp(toX - b.x, toY - b.y), T = mode === 1 ? dist / 26 : mode === 2 ? dist / 11 : dist / 18, err = mode === 1 ? 1.4 : .5;
        b.vx = (toX + rnd(-err, err) - b.x) / T; b.vy = (toY + rnd(-err, err) * (mode === 1 ? 1.5 : 1) - b.y) / T; b.vz = (0 - b.z + 9.8 * T * T / 2) / T; b.spin = mode;
        st.last = i; st.bounces = 0; ev(st, 'hit');
    },
    point(st, w, why) {
        st.pts[w]++; const [a, b] = st.pts; ev(st, w === 0 ? 'score' : 'lose', why);
        if ((a >= 4 || b >= 4) && Math.abs(a - b) >= 2) { st.gm[w]++; st.pts = [0, 0]; st.srv = 1 - st.srv; ev(st, 'score', 'Game ' + nameOf(w)); }
        st.wait = 1.2; this.place(st);
    },
    step(st, dt, inp) {
        if (st.wait > 0) { st.wait -= dt; return; }
        const C = this;
        st.pl.forEach((p, i) => { const I = inp[i] || blankIn(); let mx = I.r - I.l, my = I.d - I.u; const ml = hyp(mx, my) || 1; const sp = 6.5; if (!st.serving || i !== st.srv) { p.x = clamp(p.x + mx / ml * sp * dt, .5, 16.5); p.y = clamp(p.y + my / ml * sp * dt, i ? .5 : 16.6, i ? 14.4 : 30.5); } p.I = I; });
        if (st.serving) { const I = inp[st.srv] || blankIn(); if (I.ap) this.toss(st); return; }
        const b = st.ball; if (!b) return;
        b.vz -= 9.8 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
        const netY = C.Y0 + C.CL / 2;
        if ((b.py - netY) * (b.y - netY) < 0 && b.z < .95) { this.point(st, 1 - st.last, 'Into the net'); return; }
        b.py = b.y;
        if (b.z <= 0) {
            b.z = 0; b.vz = -b.vz * .62; b.vx *= .85; b.vy *= .85; st.bounces++;
            const inX = b.x >= C.X0 - .1 && b.x <= C.X0 + C.CW + .1, inY = b.y >= C.Y0 - .1 && b.y <= C.Y0 + C.CL + .1, rightHalf = st.last === 0 ? b.y < netY : b.y > netY;
            if (st.bounces === 1 && (!inX || !inY || !rightHalf)) { this.point(st, 1 - st.last, 'Out!'); return; }
            if (st.bounces >= 2) { this.point(st, st.last, 'Winner!'); return; }
        }
        // swings: the player not last to hit, ball on their side, in reach and low enough
        const i = 1 - st.last, p = st.pl[i], I = p.I || blankIn(), mySide = i === 0 ? b.y > netY : b.y < netY;
        if (mySide && b.z < 2.6 && hyp(b.x - p.x, b.y - p.y) < 1.5 && (st.bounces === 1 || Math.abs(b.y - netY) < 6)) {
            const aim = (I.r - I.l) * (i === 0 ? 1 : -1) * .9 + (b.x - p.x) * .25, mode = I.a ? 1 : I.b ? 2 : 0;
            this.hit(st, i, clamp(aim, -1, 1), mode, false);
        }
        if (b.y < -4 || b.y > 35) { this.point(st, st.bounces ? st.last : 1 - st.last, st.bounces ? 'Winner!' : 'Out!'); }
    },
    bot(st, i, dt) {
        const p = st.pl[i], b = st.ball, I = blankIn(), skill = [.55, .8, 1][st.diff];
        if (st.serving) { if (st.srv === i) { p.tt = (p.tt || 0) + dt; if (p.tt > .9) { I.a = 1; p.tt = 0; } } return I; }
        let tx = 8.5, ty = i ? 3 : 28;
        if (b && st.last !== i) {      // run to where the ball will be after it bounces
            const T = (b.vz + Math.sqrt(Math.max(0, b.vz * b.vz + 2 * 9.8 * b.z))) / 9.8, bx = b.x + b.vx * T, by = b.y + b.vy * T, k = st.bounces ? 0 : .35;
            tx = bx + b.vx * k * .85 + rnd(-1, 1) * (1 - skill) * 2; ty = clamp(by + b.vy * k * .85, i ? .5 : 17, i ? 14 : 30.5);
        }
        const dx = tx - p.x, dy = ty - p.y; if (Math.abs(dx) > .25) I[dx > 0 ? 'r' : 'l'] = 1; if (Math.abs(dy) > .25) I[dy > 0 ? 'd' : 'u'] = 1;
        if (b && hyp(b.x - p.x, b.y - p.y) < 2.5) { const r = Math.random(); if (r < .3) I.l = 1; else if (r < .6) I.r = 1; if (Math.random() < .12 * skill) I.a = 1; else if (Math.random() < .05) I.b = 1; }
        return I;
    },
    draw(g, st) {
        const C = this; g.fillStyle = '#2563a8'; g.fillRect(0, 0, 17, 31); g.fillStyle = '#3b82c4'; g.fillRect(C.X0, C.Y0, C.CW, C.CL);
        g.strokeStyle = '#fff'; g.lineWidth = .08; g.strokeRect(C.X0, C.Y0, C.CW, C.CL);
        const sx = C.X0 + 1.37, sw = C.CW - 2.74, ny = C.Y0 + C.CL / 2; line(g, sx, C.Y0, sx, C.Y0 + C.CL, '#fff', .07); line(g, sx + sw, C.Y0, sx + sw, C.Y0 + C.CL, '#fff', .07);
        line(g, sx, ny - 6.4, sx + sw, ny - 6.4, '#fff', .07); line(g, sx, ny + 6.4, sx + sw, ny + 6.4, '#fff', .07); line(g, C.X0 + C.CW / 2, ny - 6.4, C.X0 + C.CW / 2, ny + 6.4, '#fff', .07);
        st.pl.forEach((p, i) => { if (i === 1) person(g, p.x, p.y, .5, colOf(i), Math.PI / 2, nameOf(i)); });
        line(g, C.X0 - .9, ny, C.X0 + C.CW + .9, ny, '#e5e7eb', .14); for (let x = C.X0 - .9; x < C.X0 + C.CW + .9; x += .5) line(g, x, ny - .12, x, ny + .12, 'rgba(255,255,255,.5)', .03);
        st.pl.forEach((p, i) => { if (i === 0) person(g, p.x, p.y, .5, colOf(i), -Math.PI / 2, nameOf(i)); });
        const b = st.ball;
        if (b) { shadow(g, b.x, b.y, .15, .35); circ(g, b.x, b.y - b.z * .6, .17 + b.z * .02, '#d9f99d', '#65a30d', .03); }
        else if (st.serving) { const p = st.pl[st.srv]; circ(g, p.x + .5, p.y, .17, '#d9f99d', '#65a30d', .03); g.font = 'bold .8px system-ui'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(st.srv === SM.P.findIndex(q => q.id === SM.me) ? 'SPACE to serve' : nameOf(st.srv) + ' to serve', 8.5, 15.5 + (st.srv ? -1.5 : 2.2)); }
    },
    callPts(st) { const [a, b] = st.pts, N = ['0', '15', '30', '40']; if (a >= 3 && b >= 3) return a === b ? 'Deuce' : 'Advantage ' + nameOf(a > b ? 0 : 1); return N[Math.min(a, 3)] + ' - ' + N[Math.min(b, 3)]; },
    hud(st) { return `<span style="color:${colOf(0)}">${esc(nameOf(0))}</span><b>${st.gm[0]} - ${st.gm[1]}</b><span style="color:${colOf(1)}">${esc(nameOf(1))}</span><em>${this.callPts(st)}</em>`; },
    over(st) { for (const i of [0, 1]) if (st.gm[i] >= 3) return { win: i, text: 'Games ' + st.gm[0] + ' - ' + st.gm[1] }; return null; }
};
