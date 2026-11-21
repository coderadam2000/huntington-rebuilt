// ==========================================
// SOCCER and HOCKEY: one engine. Each side has a player (you or a bot) and a goalkeeper bot. Move with the arrows,
// get on the ball to dribble, hold SPACE to charge a shot and let go to shoot. Shift sprints.
// Soccer: 3 minutes or first to 3. Hockey: puck on ice (slides far, bounces off the boards), goals with nets.
// ==========================================
function fieldSport(C) {
    return {
        n: C.n, ic: C.ic, sub: C.sub, desc: C.desc, max: 2, W: C.W, H: C.H, bg: C.bg,
        keys: 'Arrows / WASD move · Shift sprint · hold SPACE to charge, release to shoot',
        init(P, o) {
            const st = { t: C.time, sc: [0, 0], pl: [], ball: { x: C.W / 2, y: C.H / 2, vx: 0, vy: 0 }, kick: 0, wait: 1.5, diff: o.diff, last: -1, gold: false };
            for (let s = 0; s < 2; s++) {
                st.pl.push({ s, x: s ? C.W * .62 : C.W * .38, y: C.H / 2, vx: 0, vy: 0, f: s ? Math.PI : 0, ch: 0, cd: 0, gk: false });
                st.pl.push({ s, x: s ? C.W - C.gx - 1.2 : C.gx + 1.2, y: C.H / 2, vx: 0, vy: 0, f: s ? Math.PI : 0, ch: 0, cd: 0, gk: true });
            }
            return st;
        },
        reset(st, toSide) { const b = st.ball; b.x = C.W / 2; b.y = C.H / 2; b.vx = b.vy = 0; st.pl.forEach((p, i) => { p.x = p.gk ? (p.s ? C.W - C.gx - 1.2 : C.gx + 1.2) : p.s ? C.W * (toSide === 1 ? .53 : .62) : C.W * (toSide === 0 ? .47 : .38); p.y = C.H / 2; p.vx = p.vy = 0; p.ch = 0; }); st.wait = 1.2; },
        step(st, dt, inp) {
            const b = st.ball;
            if (st.wait > 0) { st.wait -= dt; if (st.wait <= 0) ev(st, 'go'); return; }
            st.t -= dt;
            st.pl.forEach((p, k) => {
                const i = p.s, I = p.gk ? gkIn(st, p) : inp[i] || blankIn();
                let mx = I.r - I.l, my = I.d - I.u; const ml = hyp(mx, my); if (ml) { mx /= ml; my /= ml; p.f = Math.atan2(my, mx); }
                const top = (p.gk ? C.sp * (C.gks || .8) : C.sp) * (I.b && !p.gk ? 1.35 : 1) * (p.ch > 0 ? .75 : 1);
                p.vx += (mx * top - p.vx) * Math.min(1, dt * C.acc); p.vy += (my * top - p.vy) * Math.min(1, dt * C.acc);
                p.x = clamp(p.x + p.vx * dt, 1, C.W - 1); p.y = clamp(p.y + p.vy * dt, 1, C.H - 1);
                if (p.gk) { const lo = C.H / 2 - C.gw / 2 - 1, hi = C.H / 2 + C.gw / 2 + 1; p.y = clamp(p.y, lo, hi); p.x = p.s ? clamp(p.x, C.W - C.gx - 9, C.W - C.gx - .6) : clamp(p.x, C.gx + .6, C.gx + 9); }
                p.cd -= dt;
                const d = hyp(b.x - p.x, b.y - p.y);
                // charge and shoot
                if (I.a && !p.gk) p.ch = Math.min(1, p.ch + dt * 1.3);
                const release = (!I.a && p.ch > 0) || (p.gk && d < C.pr + C.br + .4 && p.cd <= 0);
                if (release) {
                    if (d < C.pr + C.br + 1.1 && p.cd <= 0) {
                        const pow = p.gk ? .75 : p.ch, gx2 = p.s ? C.gx : C.W - C.gx, ga = angTo(p.x, p.y, gx2, C.H / 2), hitA = angTo(p.x, p.y, b.x, b.y), off = Math.atan2(Math.sin(ga - hitA), Math.cos(ga - hitA));      // the ball goes where you strike it
                        const a = p.gk ? angTo(p.x, p.y, C.W / 2, C.H / 2 + rnd(-8, 8)) : Math.abs(off) < .75 ? hitA + off * .75 : (p.x < 4 || p.x > C.W - 4 || p.y < 4 || p.y > C.H - 4) ? angTo(p.x, p.y, C.W / 2 + (p.s ? -8 : 8), C.H / 2) : hitA;      // aim help: a shot roughly at goal bends toward it
                        const sp = C.ks + C.kp * pow; b.vx = Math.cos(a) * sp + p.vx * .3; b.vy = Math.sin(a) * sp + p.vy * .3;
                        p.cd = .3; st.last = p.s; ev(st, 'hit');
                    }
                    p.ch = 0;
                }
                // dribble: the ball sticks a little in front of whoever runs onto it
                else if (d < C.pr + C.br + .5 && p.cd <= 0 && !p.gk) {
                    const tx = p.x + Math.cos(p.f) * (C.pr + C.br + .2), ty = p.y + Math.sin(p.f) * (C.pr + C.br + .2);
                    b.vx += ((tx - b.x) * 12 + p.vx - b.vx) * Math.min(1, dt * C.grip); b.vy += ((ty - b.y) * 12 + p.vy - b.vy) * Math.min(1, dt * C.grip); st.last = p.s;
                }
                // bodies push the ball away
                if (d < C.pr + C.br) { const nx = (b.x - p.x) / (d || 1), ny = (b.y - p.y) / (d || 1); b.x = p.x + nx * (C.pr + C.br); b.y = p.y + ny * (C.pr + C.br); const vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= vn * nx * 1.6; b.vy -= vn * ny * 1.6; } }
            });
            // players bump each other
            for (let a = 0; a < 4; a++) for (let c = a + 1; c < 4; c++) { const A = st.pl[a], B = st.pl[c], d = hyp(A.x - B.x, A.y - B.y); if (d < C.pr * 2 && d > 0) { const o = (C.pr * 2 - d) / 2, nx = (A.x - B.x) / d, ny = (A.y - B.y) / d; A.x += nx * o; A.y += ny * o; B.x -= nx * o; B.y -= ny * o; } }
            // the ball
            const f = Math.exp(-C.fric * dt), px = b.x; b.vx *= f; b.vy *= f; b.x += b.vx * dt; b.y += b.vy * dt;
            const inMouth = b.y > C.H / 2 - C.gw / 2 && b.y < C.H / 2 + C.gw / 2;
            if (b.y < C.br) { b.y = C.br; b.vy = Math.abs(b.vy) * C.bnc; } if (b.y > C.H - C.br) { b.y = C.H - C.br; b.vy = -Math.abs(b.vy) * C.bnc; }
            for (const side of [0, 1]) {      // a goal: the ball crosses the goal line, inside the mouth, from the front
                const gx = side ? C.W - C.gx : C.gx, inF = side ? px <= gx && b.x > gx : px >= gx && b.x < gx, back = side ? px > gx && b.x <= gx : px < gx && b.x >= gx;
                if (inF && inMouth) { const sc = 1 - side; st.sc[sc]++; ev(st, 'score', 'GOAL! ' + nameOf(sc)); this.reset(st, side); if (st.gold) st.t = -1; return; }
                if (back && inMouth) { b.x = side ? gx + .05 : gx - .05; b.vx = -b.vx * .4; }      // the back of the net
            }
            if (C.boards) { if (b.x < C.br) { b.x = C.br; b.vx = Math.abs(b.vx) * C.bnc; } if (b.x > C.W - C.br) { b.x = C.W - C.br; b.vx = -Math.abs(b.vx) * C.bnc; } }
            else if (b.x < 0 || b.x > C.W) { ev(st, 'whistle', 'Out!'); const s = b.x < 0 ? 0 : 1; this.reset(st, s); }
            // a puck / ball pinned on the boards with both players on it: whistle, face-off
            const s0 = st.pl[0], s1 = st.pl[2], pinned = (b.x < 3 || b.x > C.W - 3 || b.y < 3 || b.y > C.H - 3) && hyp(s0.x - b.x, s0.y - b.y) < 3 && hyp(s1.x - b.x, s1.y - b.y) < 3;
            st.stuck = pinned ? (st.stuck || 0) + dt : Math.max(0, (st.stuck || 0) - dt);
            if (st.stuck > 3.5) { st.stuck = 0; ev(st, 'whistle', C.boards ? 'Face-off' : 'Drop ball'); this.reset(st, -1); return; }
            if (st.gold) st.gt = (st.gt || 0) + dt;
            if (st.t <= 0 && st.sc[0] === st.sc[1] && !st.gold) { st.gold = true; st.t = 9999; ev(st, 'whistle', 'Golden goal: next goal wins!'); }
        },
        bot(st, i, dt) {
            const p = st.pl.find(q => q.s === i && !q.gk), b = st.ball, gx = i ? C.gx : C.W - C.gx, gy = C.H / 2, I = blankIn();
            const toGoal = angTo(b.x, b.y, gx, gy), tx = b.x - Math.cos(toGoal) * (C.pr + C.br + .6), ty = b.y - Math.sin(toGoal) * (C.pr + C.br + .6);
            const d = hyp(b.x - p.x, b.y - p.y), wall = b.x < 4 || b.x > C.W - 4 || b.y < 4 || b.y > C.H - 4;      // by the boards: just get to it and clear it
            const behind = wall ? d < C.pr + C.br + .8 : hyp(p.x - tx, p.y - ty) < 1.2;
            const aimX = wall ? b.x : behind ? gx : tx, aimY = wall ? b.y : behind ? gy : ty, err = [.5, .25, .1][st.diff];
            const dx = aimX - p.x + rnd(-err, err) * 6, dy = aimY - p.y + rnd(-err, err) * 6;
            if (Math.abs(dx) > .5) I[dx > 0 ? 'r' : 'l'] = 1; if (Math.abs(dy) > .5) I[dy > 0 ? 'd' : 'u'] = 1;
            I.b = d > 8 ? 1 : 0;
            p.bc = (p.bc || 0) - dt;
            const near = hyp(b.x - gx, b.y - gy);
            const lined = Math.abs(Math.atan2(Math.sin(toGoal - angTo(p.x, p.y, b.x, b.y)), Math.cos(toGoal - angTo(p.x, p.y, b.x, b.y)))) < .7;
            if ((behind || lined) && d < C.pr + C.br + 1) { if (p.ch < (wall ? .35 : near < C.W * .35 ? .7 : .3) + rnd(0, .2)) I.a = 1; }
            else if (p.ch > 0 && d < C.pr + C.br + 1) I.a = 0; else if (p.ch > 0 && d < C.pr + C.br + 3) I.a = 1;      // far from the ball: let the charge go
            return I;
        },
        draw(g, st) {
            C.drawField(g);
            const b = st.ball;
            st.pl.forEach(p => { person(g, p.x, p.y, C.pr, p.gk ? shade(colOf(p.s)) : colOf(p.s), p.f, p.gk ? '' : nameOf(p.s)); if (C.stick) line(g, p.x + Math.cos(p.f) * C.pr * .6, p.y + Math.sin(p.f) * C.pr * .6, p.x + Math.cos(p.f + .4) * C.pr * 2.1, p.y + Math.sin(p.f + .4) * C.pr * 2.1, '#7c5a3a', .25);
                if (p.ch > 0) { g.beginPath(); g.arc(p.x, p.y, C.pr * 1.5, -Math.PI / 2, -Math.PI / 2 + TAU * p.ch); g.strokeStyle = '#fde047'; g.lineWidth = .3; g.stroke(); } });
            shadow(g, b.x, b.y, C.br, .35); circ(g, b.x, b.y, C.br, C.ballCol, '#111', C.br * .25);
            if (st.wait > 0 && st.t === C.time) { g.font = 'bold 4px system-ui'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText('Kick off', C.W / 2, C.H * .3); }
        },
        hud(st) { const t = Math.max(0, Math.ceil(st.t)); return `<span style="color:${colOf(0)}">${esc(nameOf(0))}</span><b>${st.sc[0]} - ${st.sc[1]}</b><span style="color:${colOf(1)}">${esc(nameOf(1))}</span><em>${st.gold ? 'GOLDEN GOAL' : Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0')}</em>`; },
        over(st) { if (st.gold && st.gt > 90) return { win: -1, text: st.sc[0] + ' - ' + st.sc[1] + ' (no golden goal)' }; const w = st.sc[0] >= C.to ? 0 : st.sc[1] >= C.to ? 1 : st.t <= 0 && st.sc[0] !== st.sc[1] ? (st.sc[0] > st.sc[1] ? 0 : 1) : null; return w === null ? null : { win: w, text: st.sc[0] + ' - ' + st.sc[1] }; }
    };
    function gkIn(st, p) {
        const b = st.ball, gx = p.s ? C.W - C.gx : C.gx, I = blankIn(), dang = (p.s ? b.vx > 2 : b.vx < -2) && Math.abs(b.x - gx) < C.W * .45;
        const ty = clamp(dang ? b.y + b.vy * (Math.abs(b.x - gx) / Math.max(5, Math.abs(b.vx))) : b.y, C.H / 2 - C.gw / 2, C.H / 2 + C.gw / 2) + (st.diff === 0 ? Math.sin(st.t * 2) * 2 : 0);
        const tx = Math.abs(b.x - gx) < 8 && Math.abs(b.y - C.H / 2) < C.gw ? b.x : gx + (p.s ? -1.5 : 1.5);
        if (ty > p.y + .3) I.d = 1; else if (ty < p.y - .3) I.u = 1; if (tx > p.x + .3) I.r = 1; else if (tx < p.x - .3) I.l = 1; return I;
    }
}
function shade(c) { return c + 'aa'; }
SPORTS.soccer = fieldSport({
    n: 'Soccer', ic: '⚽', sub: '1v1 + keepers', desc: 'Dribble past them and score. First to 3, or the most goals in 3 minutes (a tie goes to a golden goal).',
    W: 105, H: 68, gx: 2, gw: 14, gks: .55, time: 180, to: 3, sp: 15, acc: 7, pr: 1.5, br: .9, ks: 18, kp: 34, fric: .9, bnc: .6, grip: 9, bg: '#14532d', ballCol: '#f8fafc',
    drawField(g) {
        for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#3f8f3a' : '#479e41'; g.fillRect(i * 10.5, 0, 10.5, 68); }
        g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = .35; g.strokeRect(2, 0, 101, 68); line(g, 52.5, 0, 52.5, 68, 'rgba(255,255,255,.85)', .35);
        g.beginPath(); g.arc(52.5, 34, 9.15, 0, TAU); g.stroke(); g.strokeRect(2, 13.85, 16.5, 40.3); g.strokeRect(86.5, 13.85, 16.5, 40.3);
        g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(0, 27, 2, 14); g.fillRect(103, 27, 2, 14);
    }
});
SPORTS.hockey = fieldSport({
    n: 'Hockey', ic: '🏒', sub: 'Ice, puck, boards', desc: 'The puck slides forever and bounces off the boards. Skate, pass yourself off the walls, and beat the goalie. First to 3 or 3 minutes.',
    W: 60, H: 30, gx: 5, gw: 5.5, gks: .4, time: 180, to: 3, sp: 14, acc: 2.6, pr: .9, br: .45, ks: 16, kp: 30, fric: .22, bnc: .85, grip: 6, boards: true, stick: true, bg: '#0f172a', ballCol: '#111827',
    drawField(g) {
        g.fillStyle = '#e8f4fb'; g.beginPath(); g.roundRect(0, 0, 60, 30, 7); g.fill(); g.strokeStyle = '#fde047'; g.lineWidth = .4; g.stroke();
        line(g, 30, 0, 30, 30, '#dc2626', .4); line(g, 20, 0, 20, 30, '#2563eb', .35); line(g, 40, 0, 40, 30, '#2563eb', .35); line(g, 5, 2, 5, 28, '#dc2626', .15); line(g, 55, 2, 55, 28, '#dc2626', .15);
        g.beginPath(); g.arc(30, 15, 4.5, 0, TAU); g.strokeStyle = '#2563eb'; g.lineWidth = .15; g.stroke();
        for (const x of [5, 55]) { g.fillStyle = 'rgba(96,165,250,.35)'; g.beginPath(); g.arc(x, 15, 2, x < 30 ? -Math.PI / 2 : Math.PI / 2, x < 30 ? Math.PI / 2 : Math.PI * 1.5); g.fill(); g.strokeStyle = '#dc2626'; g.lineWidth = .2; g.strokeRect(x < 30 ? x - 1.2 : x, 13, 1.2, 4); }
    }
});
