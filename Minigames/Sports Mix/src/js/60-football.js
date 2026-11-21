// ==========================================
// AMERICAN FOOTBALL: 3-on-3. On offense you are the quarterback: SPACE snaps, then run with the arrows or press SPACE
// again to throw to the receiver nearest where you point (hold an arrow). Shift sprints. On defense you control the
// linebacker: catch the ball carrier to tackle. 4 downs to gain 10 yards; touchdown = 7. Each side gets 4 drives.
// Field 100 yards plus end zones; the offense of side 0 drives to the right, side 1 to the left.
// ==========================================
SPORTS.football = {
    n: 'Football', ic: '🏈', sub: 'American, 3-on-3', desc: 'Quarterback on offense, linebacker on defense. Snap, scramble, throw to an open receiver, and score touchdowns. Four drives each.',
    max: 2, W: 120, H: 53, bg: '#14532d', keys: 'Offense: SPACE snap, arrows run, SPACE throw toward where you point · Defense: arrows chase, tackle the runner · Shift sprint',
    init(P, o) { const st = { off: 0, drives: [0, 0], sc: [0, 0], down: 1, los: 25, first: 35, ph: 'pre', diff: o.diff, t: 0, pl: [], ball: null, car: -1, wait: 1 }; this.setup(st); return st; },
    dirOf(st) { return st.off === 0 ? 1 : -1; },
    X(st, yd) { return 10 + (st.off === 0 ? yd : 100 - yd); },      // yards from the offense's own goal line -> x
    setup(st) {
        const d = this.dirOf(st), x = this.X(st, st.los), o = st.off;
        st.pl = [
            { s: o, r: 'qb', x: x - d * 6, y: 26.5 }, { s: o, r: 'wr', x: x - d * .5, y: 9 }, { s: o, r: 'wr', x: x - d * .5, y: 44 },
            { s: 1 - o, r: 'lb', x: x + d * 6, y: 26.5 }, { s: 1 - o, r: 'cb', x: x + d * 4, y: 11 }, { s: 1 - o, r: 'cb', x: x + d * 4, y: 42 }
        ];
        st.pl.forEach(p => { p.vx = p.vy = 0; p.rt = Math.random() < .5 ? 1 : 2; });
        st.ball = { x: st.pl[0].x, y: st.pl[0].y, fly: null }; st.car = 0; st.ph = 'pre'; st.t = 0; st.wait = .8;
    },
    endPlay(st, x, why) {
        const d = this.dirOf(st), yd = st.off === 0 ? x - 10 : 110 - x;
        if (yd >= 100) { st.sc[st.off] += 7; ev(st, 'score', 'TOUCHDOWN ' + nameOf(st.off) + '!'); return this.turnover(st, true); }
        st.los = clamp(Math.round(yd), 1, 99);
        if (st.los >= st.first) { st.down = 1; st.first = Math.min(100, st.los + 10); ev(st, 'whistle', (why || 'Tackled') + ' · First down!'); }
        else if (st.down >= 4) { ev(st, 'lose', 'Turnover on downs'); return this.turnover(st, false); }
        else { st.down++; ev(st, 'blip', why || 'Tackled'); }
        this.setup(st);
    },
    turnover(st, scored, yd) {
        st.drives[st.off]++; st.off = 1 - st.off; st.down = 1; st.los = scored ? 25 : clamp(100 - (yd || st.los), 5, 80); st.first = st.los + 10; this.setup(st); st.wait = 1.5;
    },
    step(st, dt, inp) {
        if (st.wait > 0) { st.wait -= dt; return; }
        const d = this.dirOf(st), o = st.off, B = st.ball, qb = st.pl[0];
        if (st.ph === 'pre') { if ((inp[o] || {}).ap) { st.ph = 'live'; st.t = 0; ev(st, 'whistle', 'Hike!'); } return; }
        st.t += dt;
        st.pl.forEach((p, k) => {
            let I = blankIn();
            if (k === 0) I = inp[o] || I; else if (k === 3) I = inp[1 - o] || I;
            let mx, my;
            if (k === 0 || k === 3) { mx = I.r - I.l; my = I.d - I.u; if (k === 0 && st.car === 0 && (mx || my)) { p.ax = mx; p.ay = my; } }
            else { const g = this.ai(st, p, k); mx = g[0]; my = g[1]; }
            const ml = hyp(mx, my) || 1, blocked = k === 3 && st.car === 0 && st.t < 2.2, sp = (p.r === 'wr' ? 9.5 : p.r === 'cb' ? 9.2 : 8.6) * (I.b ? 1.25 : 1) * (k === st.car ? .95 : 1) * (blocked ? .3 : 1);      // the offensive line holds the rush for a couple of seconds
            const ox = p.x, oy = p.y; p.x = clamp(p.x + mx / ml * sp * dt, 0, 120); p.y = clamp(p.y + my / ml * sp * dt, .5, 52.5); p.vx = (p.x - ox) / dt; p.vy = (p.y - oy) / dt;
        });
        // a pass in the air
        if (B.fly) {
            const F = B.fly; F.t += dt; const u = Math.min(1, F.t / F.dur); B.x = lerp(F.x0, F.x1, u); B.y = lerp(F.y0, F.y1, u); B.z = Math.sin(u * Math.PI) * F.h;
            if (u >= 1) {
                B.fly = null; let best = null, bd = 3, dbest = null, dd0 = 1.3;      // receivers reach 3 m for the ball; a defender has to be right on it to pick it off
                for (const [k, p] of st.pl.entries()) { if (k === 0) continue; const dd = hyp(p.x - B.x, p.y - B.y); if (p.s === o && dd < bd) { bd = dd; best = k; } if (p.s !== o && dd < dd0) { dd0 = dd; dbest = k; } }
                if (dbest !== null && (best === null || dd0 < bd * .6)) best = dbest;
                if (best === null) { ev(st, 'blip', 'Incomplete'); return this.endPlay(st, this.X(st, st.los), 'Incomplete'); }
                if (st.pl[best].s !== o) { ev(st, 'lose', 'INTERCEPTED!'); const x = st.pl[best].x; return this.turnover(st, false, o === 0 ? x - 10 : 110 - x); }
                st.car = best; ev(st, 'hit', 'Caught!');
            }
            return;
        }
        const car = st.pl[st.car]; B.x = car.x; B.y = car.y; B.z = 0;
        // throw
        const I = inp[o] || blankIn();
        if (st.car === 0 && I.ap && st.t > .3) {
            const ax = qb.ax || d, ay = qb.ay || 0, a = Math.atan2(ay, ax);
            let best = null, bs = 1e9; for (const k of [1, 2]) { const p = st.pl[k], ang = Math.abs(Math.atan2(p.y - qb.y, p.x - qb.x) - a), s = Math.min(ang, TAU - ang); if (s < bs) { bs = s; best = p; } }
            const D = hyp(best.x - qb.x, best.y - qb.y), T = .35 + D / 30, lx = clamp(best.x + (best.vx || d * 9) * T * .8, 1, 119), ly = clamp(best.y + (best.vy || 0) * T * .6, 3, 50);      // lead the receiver, but keep it on the field
            B.fly = { x0: qb.x, y0: qb.y, x1: lx + rnd(-1.5, 1.5), y1: ly + rnd(-1.5, 1.5), t: 0, dur: T, h: 2 + D * .08 }; st.car = -1; ev(st, 'blip'); return;
        }
        // tackles and the touchdown
        for (const [k, p] of st.pl.entries()) if (p.s !== o && hyp(p.x - car.x, p.y - car.y) < 1.4) { if (st.car === 0 && car.x * d < this.X(st, st.los) * d) ev(st, 'lose', 'SACKED!'); return this.endPlay(st, car.x, 'Tackled'); }
        const yd = o === 0 ? car.x - 10 : 110 - car.x; if (yd >= 100) return this.endPlay(st, car.x);
        if (car.y <= .6 || car.y >= 52.4) return this.endPlay(st, car.x, 'Out of bounds');
        if (st.t > 12) return this.endPlay(st, car.x, 'Whistle');
    },
    // receivers run routes, defenders cover them or rush; the linebacker (bot) chases the carrier
    ai(st, p, k) {
        const d = this.dirOf(st), car = st.pl[st.car] || st.pl[0], B = st.ball, skill = [.75, .9, 1][st.diff];
        if (p.r === 'wr') {
            if (st.car === k) return [d, 0];
            if (B.fly) return [B.fly.x1 - p.x, B.fly.y1 - p.y];
            const t = st.t; if (p.rt === 1) return t < 1.6 ? [d, 0] : [d * .3, (p.y < 26.5 ? 1 : -1)]; return t < 1.2 ? [d, 0] : t < 2.4 ? [d * .2, (p.y < 26.5 ? -1 : 1) * .6] : [d, 0];
        }
        if (p.r === 'cb') { const m = st.pl[k === 4 ? 1 : 2]; const tx = B.fly ? B.fly.x1 : st.car > 0 ? car.x : m.x + d * 1.5, ty = B.fly ? B.fly.y1 : st.car > 0 ? car.y : m.y; return [(tx - p.x) * skill, ty - p.y]; }
        return [car.x - p.x, car.y - p.y];
    },
    bot(st, i, dt) {
        const I = blankIn(), o = st.off, d = this.dirOf(st);
        if (i === o) {
            if (st.ph === 'pre') { st.bt = (st.bt || 0) + dt; if (st.bt > .8) { st.bt = 0; I.a = 1; } return I; }
            const qb = st.pl[0];
            if (st.car === 0) {
                const sep = r => Math.min(...[4, 5, 3].map(c => hyp(st.pl[c].x - r.x, st.pl[c].y - r.y))), rs = [1, 2].map(k => st.pl[k]).filter(r => (r.x - qb.x) * d > 2).sort((a, b) => sep(b) - sep(a));
                const open = rs.find(r => sep(r) > 3) || (st.t > 1.7 ? rs[0] : null);      // the most open receiver; after a moment, the best one even if covered
                const press = hyp(st.pl[3].x - qb.x, st.pl[3].y - qb.y) < 4;
                if (open && st.t > .9) { I[open.y < qb.y ? 'u' : 'd'] = 1; I[d > 0 ? 'r' : 'l'] = 1; I.a = st.t > 1.1 ? 1 : 0; }
                else if (press || st.t > 3.5) { I[d > 0 ? 'r' : 'l'] = 1; I[qb.y < st.pl[3].y ? 'u' : 'd'] = 1; I.b = 1; }
                else I[d > 0 ? 'l' : 'r'] = st.t < .6 ? 1 : 0;
            }
        } else {
            const lb = st.pl[3], car = st.pl[st.car] || st.pl[0], skill = [.6, .85, 1][st.diff];
            const tx = st.ball.fly ? st.ball.fly.x1 : car.x, ty = st.ball.fly ? st.ball.fly.y1 : car.y;
            if (Math.abs(tx - lb.x) > .4) I[tx > lb.x ? 'r' : 'l'] = 1; if (Math.abs(ty - lb.y) > .4) I[ty > lb.y ? 'd' : 'u'] = 1; I.b = Math.random() < skill ? 1 : 0;
        }
        return I;
    },
    draw(g, st) {
        for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#3f8f3a' : '#479e41'; g.fillRect(i * 10, 0, 10, 53); }
        g.fillStyle = 'rgba(59,130,246,.45)'; g.fillRect(0, 0, 10, 53); g.fillStyle = 'rgba(239,68,68,.45)'; g.fillRect(110, 0, 10, 53);
        g.font = 'bold 2.4px system-ui'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.55)';
        for (let yd = 10; yd < 100; yd += 10) { line(g, 10 + yd, 0, 10 + yd, 53, 'rgba(255,255,255,.7)', .2); g.fillText(String(yd <= 50 ? yd : 100 - yd), 10 + yd, 6); g.fillText(String(yd <= 50 ? yd : 100 - yd), 10 + yd, 49); }
        line(g, 10, 0, 10, 53, '#fff', .3); line(g, 110, 0, 110, 53, '#fff', .3);
        line(g, this.X(st, st.los), 0, this.X(st, st.los), 53, '#60a5fa', .35); line(g, this.X(st, Math.min(100, st.first)), 0, this.X(st, Math.min(100, st.first)), 53, '#fde047', .35);
        st.pl.forEach((p, k) => person(g, p.x, p.y, .9, colOf(p.s), p.s === st.off ? (this.dirOf(st) > 0 ? 0 : Math.PI) : (this.dirOf(st) > 0 ? Math.PI : 0), k === 0 || k === 3 ? nameOf(p.s) : ''));
        const B = st.ball; if (B) { shadow(g, B.x, B.y, .4, .3); g.save(); g.translate(B.x, B.y - (B.z || 0) * .5); g.rotate(SM.t * (B.fly ? 10 : 0)); g.fillStyle = '#8b4513'; g.beginPath(); g.ellipse(0, 0, .65, .4, 0, 0, TAU); g.fill(); g.restore(); }
        if (st.ph === 'pre') { g.font = 'bold 2.6px system-ui'; g.fillStyle = '#fff'; g.fillText(nameOf(st.off) + ': SPACE to snap', 60, 27); }
    },
    hud(st) { const D = ['', '1st', '2nd', '3rd', '4th'][st.down]; return `<span style="color:${colOf(0)}">${esc(nameOf(0))}</span><b>${st.sc[0]} - ${st.sc[1]}</b><span style="color:${colOf(1)}">${esc(nameOf(1))}</span><em>${D} & ${Math.max(1, st.first - st.los)} · ball on ${st.los <= 50 ? 'own ' + st.los : 'their ' + (100 - st.los)} · drive ${Math.min(4, st.drives[st.off] + 1)}/4 ${esc(nameOf(st.off))}</em>`; },
    over(st) { if (st.drives[0] >= 4 && st.drives[1] >= 4) { const [a, b] = st.sc; return { win: a > b ? 0 : b > a ? 1 : -1, text: a + ' - ' + b }; } return null; }
};
