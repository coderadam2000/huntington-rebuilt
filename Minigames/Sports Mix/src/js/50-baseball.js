// ==========================================
// BASEBALL: 3 innings (extra innings on a tie). Batting: move the bat left / right to line it up with the pitch and
// press SPACE to swing as the ball reaches the plate: perfect timing goes far. Pitching: left / right picks the spot
// (inside, middle, outside), up = fastball, down = changeup, Shift = curveball, then SPACE throws.
// Balls, strikes (a foul is a strike until 2), walks, outs, runners advance on hits.
// ==========================================
SPORTS.baseball = {
    n: 'Baseball', ic: '⚾', sub: '3 innings', desc: 'Bat and pitch for three innings. Time your swing as the ball crosses the plate; when pitching, mix fastballs, changeups and curves.',
    max: 2, W: 60, H: 52, bg: '#14532d', keys: 'Batting: ←/→ line up the bat, SPACE swing · Pitching: ←/→ spot, ↑ fastball, ↓ changeup, Shift curve, SPACE pitch',
    PL: { x: 30, y: 45 }, MD: { x: 30, y: 31 },
    init(P, o) { return { inn: 1, top: true, outs: 0, b: 0, s: 0, base: [0, 0, 0], runs: [0, 0], line: [[], []], diff: o.diff, ph: 'ready', pitch: null, bat: 0, spot: 0, kind: 0, hitA: null, wait: 1, msg: '', t: 0, ready: 0 }; },
    batting(st) { return st.top ? 0 : 1; },      // player 0 bats in the top of each inning
    step(st, dt, inp) {
        st.t += dt; if (st.wait > 0) { st.wait -= dt; return; }
        const bi = this.batting(st), pi = 1 - bi, Ib = inp[bi] || blankIn(), Ip = inp[pi] || blankIn();
        // the bat slides across the plate
        st.bat = clamp(st.bat + (Ib.r - Ib.l) * dt * 2.2, -1, 1);
        if (st.ph === 'ready') {
            if (Ip.lp) st.spot = Math.max(-1, st.spot - 1); if (Ip.rp) st.spot = Math.min(1, st.spot + 1);
            if (Ip.up) st.kind = 0; if (Ip.dp) st.kind = 1; if (Ip.bp) st.kind = 2;
            st.ready += dt;
            if (Ip.ap && st.ready > .4) {
                const K = [{ sp: 1.05, br: 0 }, { sp: 1.55, br: 0 }, { sp: 1.35, br: .9 }][st.kind];
                st.pitch = { t: 0, dur: K.sp * (1 - st.diff * .05), x0: st.spot * .7 + rnd(-.25, .25), br: K.br * (Math.random() < .5 ? 1 : -1), zone: Math.abs(st.spot) < 1 || Math.random() < .5 }; st.ph = 'pitch'; ev(st, 'blip');
            }
        } else if (st.ph === 'pitch') {
            const p = st.pitch; p.t += dt; const u = p.t / p.dur;
            p.x = p.x0 + p.br * u * u * .6;
            if (Ib.ap && !p.sw) { p.sw = 1; p.err = p.t - p.dur; p.miss = Math.abs(st.bat - p.x); this.swing(st); return; }
            if (u >= 1.12) { if (Math.abs(p.x) > 1.05 || !p.zone && Math.abs(p.x) > .8) this.ball(st); else this.strike(st, 'Strike!'); }
        } else if (st.ph === 'fly') {
            const h = st.hitA; h.t += dt; if (h.t >= h.dur) { this.resolve(st); }
        }
    },
    swing(st) {
        const p = st.pitch, e = Math.abs(p.err), m = p.miss, q = (1 - clamp(e / .16, 0, 1)) * (1 - clamp(m / .55, 0, 1));
        ev(st, 'hit');
        if (q <= .05) { this.strike(st, 'Swing and a miss!'); return; }
        if (q < .3) { if (st.s < 2) st.s++; ev(st, 'blip', 'Foul ball'); st.ph = 'ready'; st.ready = 0; st.pitch = null; st.wait = .7; return; }
        // contact: the better it is, the further and the harder to catch
        const r = Math.random(), res = q > .85 && r < .55 ? 4 : q > .65 && r < .45 ? (r < .15 ? 3 : 2) : q > .45 && r < .7 ? 1 : 0;
        const ang = clamp(p.err * -9 + rnd(-.3, .3), -.75, .75) - Math.PI / 2, dist = res === 4 ? 70 : res === 3 ? 44 : res === 2 ? 36 : res === 1 ? 24 : rnd(14, 30);
        st.hitA = { t: 0, dur: res === 4 ? 1.8 : 1.2, ang, dist, res, fly: res === 0 && Math.random() < .5 }; st.ph = 'fly';
    },
    resolve(st) {
        const h = st.hitA, bi = this.batting(st);
        if (h.res === 0) { st.outs++; ev(st, 'lose', h.fly ? 'Caught! Out' : 'Grounded out'); }
        else {
            let runs = 0; const b = st.base;
            for (let k = 0; k < h.res; k++) { runs += b[2]; b[2] = b[1]; b[1] = b[0]; b[0] = k === 0 ? 1 : 0; }
            if (h.res === 4) { runs += b[0] + b[1] + b[2]; b[0] = b[1] = b[2] = 0; runs += 0; }
            st.runs[bi] += runs; ev(st, 'score', ['', 'Single!', 'Double!', 'Triple!', 'HOME RUN!'][h.res] + (runs ? ' +' + runs : ''));
        }
        this.nextBatter(st);
    },
    strike(st, why) { st.s++; if (st.s >= 3) { st.outs++; ev(st, 'lose', 'Strike three! Out'); this.nextBatter(st); } else { ev(st, 'blip', why); this.again(st); } },
    ball(st) { st.b++; if (st.b >= 4) { ev(st, 'blip', 'Ball four: walk'); const b = st.base; if (b[0]) { if (b[1]) { if (b[2]) st.runs[this.batting(st)]++; b[2] = 1; } b[1] = 1; } b[0] = 1; this.nextBatter(st); } else { ev(st, 'blip', 'Ball'); this.again(st); } },
    again(st) { st.ph = 'ready'; st.ready = 0; st.pitch = null; st.wait = .6; },
    nextBatter(st) {
        st.b = st.s = 0; st.pitch = null; st.hitA = null; st.ph = 'ready'; st.ready = 0; st.wait = .9;
        if (st.outs >= 3) {
            st.outs = 0; st.base = [0, 0, 0];
            if (st.top) st.top = false; else { st.top = true; st.inn++; }
            ev(st, 'whistle', (st.top ? 'Top' : 'Bottom') + ' of inning ' + st.inn); st.wait = 1.5;
        }
    },
    bot(st, i, dt) {
        const I = blankIn(), skill = [.45, .7, .9][st.diff];
        if (this.batting(st) === i) {
            const p = st.pitch; if (!p) return I;
            const u = p.t / p.dur, px = p.x0 + p.br * .6;
            if (Math.abs(st.bat - px) > .1) I[px > st.bat ? 'r' : 'l'] = 1;
            p.bw = p.bw ?? (p.zone || Math.random() < .25 ? p.dur + rnd(-.12, .12) * (1.2 - skill) : 99);
            if (p.t >= p.bw && !p.sw) I.a = 1;
        } else if (st.ph === 'ready') {
            st.bt = (st.bt || 0) + dt; if (st.bt > .8) { st.bt = 0; const k = Math.floor(Math.random() * 3); if (k === 1) I.d = 1; else if (k === 2) I.b = 1; else I.u = 1; I.a = 1; }
            else if (st.bt < .1) { const r = Math.random(); if (r < .3) I.l = 1; else if (r < .6) I.r = 1; }
        }
        return I;
    },
    draw(g, st) {
        const C = this; g.fillStyle = '#2f7d32'; g.fillRect(0, 0, 60, 52);
        g.fillStyle = '#b07a46'; g.beginPath(); g.moveTo(C.PL.x, C.PL.y + 2); g.lineTo(C.PL.x + 14, C.PL.y - 12); g.lineTo(C.PL.x, C.PL.y - 26); g.lineTo(C.PL.x - 14, C.PL.y - 12); g.closePath(); g.fill();
        g.fillStyle = '#3f9442'; g.beginPath(); g.moveTo(C.PL.x, C.PL.y - 4); g.lineTo(C.PL.x + 9.5, C.PL.y - 12); g.lineTo(C.PL.x, C.PL.y - 21); g.lineTo(C.PL.x - 9.5, C.PL.y - 12); g.closePath(); g.fill();
        line(g, C.PL.x, C.PL.y, 2, C.PL.y - 28, '#fff', .2); line(g, C.PL.x, C.PL.y, 58, C.PL.y - 28, '#fff', .2);
        circ(g, C.MD.x, C.MD.y, 1.6, '#b07a46');
        const B = [[C.PL.x + 12, C.PL.y - 12], [C.PL.x, C.PL.y - 24], [C.PL.x - 12, C.PL.y - 12]];
        B.forEach(([x, y], k) => { g.fillStyle = st.base[k] ? '#fde047' : '#f8fafc'; g.fillRect(x - .8, y - .8, 1.6, 1.6); if (st.base[k]) person(g, x + 1.4, y, .8, colOf(this.batting(st)), 0); });
        g.fillStyle = '#f8fafc'; g.beginPath(); g.moveTo(C.PL.x - .8, C.PL.y - .8); g.lineTo(C.PL.x + .8, C.PL.y - .8); g.lineTo(C.PL.x + .8, C.PL.y); g.lineTo(C.PL.x, C.PL.y + .8); g.lineTo(C.PL.x - .8, C.PL.y); g.fill();
        const bi = this.batting(st), pi = 1 - bi;
        person(g, C.MD.x, C.MD.y - .5, 1, colOf(pi), Math.PI / 2, nameOf(pi));
        person(g, C.PL.x - 2, C.PL.y, 1, colOf(bi), 0, nameOf(bi));
        // the bat, in front of the plate
        const bx = C.PL.x + st.bat * 2.2; line(g, bx - 1.6, C.PL.y - 1.4, bx + 1.6, C.PL.y - 1.4, '#a16207', .45);
        // the strike zone strip: where the bat is vs where the ball comes
        g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(C.PL.x - 2.4, C.PL.y - 1.9, 4.8, 1);
        if (st.ph === 'ready') { const sx = C.PL.x + st.spot * 1.6; g.strokeStyle = '#fde047'; g.lineWidth = .15; g.strokeRect(sx - .5, C.PL.y - 1.9, 1, 1); }
        const p = st.pitch;
        if (p) { const u = Math.min(1.12, p.t / p.dur), x = lerp(C.MD.x, C.PL.x + p.x * 2.2, u), y = lerp(C.MD.y, C.PL.y - 1.4, u); shadow(g, x, y, .35, .3); circ(g, x, y - .4, .45, '#f8fafc', '#dc2626', .08); }
        const h = st.hitA;
        if (h) { const u = h.t / h.dur, d = h.dist * u, x = C.PL.x + Math.cos(h.ang) * d * .6, y = C.PL.y + Math.sin(h.ang) * d * .6, z = Math.sin(u * Math.PI) * (h.res === 4 ? 8 : 3); shadow(g, x, y, .35, .3); circ(g, x, y - z, .5 + z * .06, '#f8fafc', '#dc2626', .08); }
        if (st.ph === 'ready' && pi === SM.P.findIndex(q => q.id === SM.me)) { g.font = 'bold 1.6px system-ui'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(['Fastball', 'Changeup', 'Curveball'][st.kind] + ' · ' + ['inside', 'middle', 'outside'][st.spot + 1] + ' · SPACE to pitch', 30, 50.6); }
    },
    hud(st) { const dots = (n, m, c) => Array.from({ length: m }, (_, k) => `<i class="dot${k < n ? ' on' : ''}" style="--c:${c}"></i>`).join('');
        return `<span style="color:${colOf(0)}">${esc(nameOf(0))}</span><b>${st.runs[0]} - ${st.runs[1]}</b><span style="color:${colOf(1)}">${esc(nameOf(1))}</span><em>${st.top ? '▲' : '▼'} ${st.inn} · B ${dots(st.b, 4, '#4ade80')} S ${dots(st.s, 3, '#facc15')} O ${dots(st.outs, 3, '#f87171')}</em>`; },
    over(st) {
        const [a, b] = st.runs;
        if (st.inn >= 3 && !st.top && b > a && st.ph !== 'fly') return { win: 1, text: a + ' - ' + b };      // walk-off / home team ahead
        if (st.inn > 3 && st.top && st.outs === 0 && st.ph === 'ready' && a !== b) return { win: a > b ? 0 : 1, text: a + ' - ' + b + (st.inn > 4 ? ' (extra innings)' : '') };
        return null;
    }
};
