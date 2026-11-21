// ==========================================
// BASKETBALL: 1-on-1 on a half court, first to 11 (2 and 3 pointers). Hold SPACE to shoot: the meter climbs and falls,
// let go in the green. A defender in your face makes it harder; right under the hoop you dunk. Without the ball,
// SPACE swipes for a steal (Shift sprints). After a basket the other player checks the ball at the top of the key.
// ==========================================
SPORTS.basketball = {
    n: 'Basketball', ic: '🏀', sub: '1-on-1, first to 11', desc: 'Half court, one on one. Drive, shoot from the green part of the meter, block and steal. Threes count 3. First to 11.',
    max: 2, W: 28, H: 15, bg: '#1c1917', keys: 'Arrows / WASD move · hold SPACE to shoot, release in the green · SPACE without the ball to steal · Shift sprint',
    HX: 1.6, HY: 7.5,
    init(P, o) { return { pl: [0, 1].map(s => ({ s, x: 18, y: s ? 4 : 11, f: Math.PI, sh: -1, cd: 0 })), ball: { h: 0, x: 18, y: 11, z: 1, fly: null }, sc: [0, 0], t: 0, diff: o.diff, check: 0, wait: 1, sm: 0 }; },
    step(st, dt, inp) {
        const B = st.ball, H = this;
        if (st.wait > 0) { st.wait -= dt; return; }
        st.t += dt;
        if (B.fly) {
            const F = B.fly; F.t += dt; const u = Math.min(1, F.t / F.dur);
            B.x = lerp(F.x0, H.HX + .4, u); B.y = lerp(F.y0, H.HY, u); B.z = lerp(2, 3.05, u) + Math.sin(u * Math.PI) * F.arc;
            if (u >= 1) {
                B.fly = null;
                if (F.made) { st.sc[F.by] += F.pts; ev(st, 'score', (F.dunk ? 'DUNK! ' : F.pts === 3 ? 'THREE! ' : 'Bucket! ') + nameOf(F.by)); this.checkBall(st, 1 - F.by); }
                else { ev(st, 'hit', 'Off the rim'); B.h = -1; B.x = H.HX + rnd(1.5, 5); B.y = H.HY + rnd(-4, 4); B.z = 0; B.vx = rnd(-1, 1); B.vy = rnd(-1, 1); }
            }
            return;
        }
        st.pl.forEach((p, i) => {
            const I = inp[i] || blankIn(); let mx = I.r - I.l, my = I.d - I.u; const ml = hyp(mx, my);
            const has = B.h === i, shooting = p.sh >= 0;
            if (ml && !shooting) { mx /= ml; my /= ml; p.f = Math.atan2(my, mx); const sp = (has ? 7.5 : 8.5) * (I.b ? 1.3 : 1); p.x = clamp(p.x + mx * sp * dt, .8, 27.2); p.y = clamp(p.y + my * sp * dt, .8, 14.2); }
            p.cd -= dt;
            if (has) {
                if (I.a) { if (p.sh < 0) p.sh = 0; p.sh += dt; }
                else if (p.sh >= 0) { this.shoot(st, p, i); p.sh = -1; }
                B.x = p.x + Math.cos(p.f) * .55; B.y = p.y + Math.sin(p.f) * .55; B.z = .6 + Math.abs(Math.sin(st.t * 8)) * .5;
            } else {
                p.sh = -1;
                const o = st.pl[1 - i];
                if (I.ap && B.h === 1 - i && p.cd <= 0 && hyp(o.x - p.x, o.y - p.y) < 1.6) { p.cd = 1; if (Math.random() < .3) { B.h = i; ev(st, 'hit', 'Stolen!'); st.check = 0; } }
            }
        });
        // a loose ball: whoever gets to it first
        if (B.h < 0) { B.x += (B.vx || 0) * dt; B.y += (B.vy || 0) * dt; for (const [i, p] of st.pl.entries()) if (hyp(B.x - p.x, B.y - p.y) < .9) { B.h = i; ev(st, 'blip'); break; } }
        // bodies
        const a = st.pl[0], b = st.pl[1], d = hyp(a.x - b.x, a.y - b.y); if (d < 1.1 && d > 0) { const o = (1.1 - d) / 2, nx = (a.x - b.x) / d, ny = (a.y - b.y) / d; a.x += nx * o; a.y += ny * o; b.x -= nx * o; b.y -= ny * o; }
    },
    meter(sh) { const c = sh % 1.6; return c < .8 ? c / .8 : 2 - c / .8; },      // up and down
    shoot(st, p, i) {
        const B = st.ball, D = hyp(p.x - this.HX, p.y - this.HY), m = this.meter(p.sh), o = st.pl[1 - i];
        const dunk = D < 2.2, three = D > 6.75 && !dunk;
        const timing = 1 - clamp(Math.abs(m - .82) / .3, 0, 1), base = dunk ? .92 : clamp(.9 - D * .055, .25, .85);
        const cont = hyp(o.x - p.x, o.y - p.y) < 1.6 && hyp(o.x - this.HX, o.y - this.HY) < D ? .55 : 1;
        const made = Math.random() < (dunk ? base * cont * 1.05 : base * (.35 + .65 * timing) * cont);
        B.h = -2; B.fly = { x0: B.x, y0: B.y, t: 0, dur: dunk ? .35 : .6 + D * .04, arc: dunk ? .2 : 1.5 + D * .12, made, by: i, pts: three ? 3 : 2, dunk };
        ev(st, 'blip');
    },
    checkBall(st, to) { const B = st.ball; B.h = to; const p = st.pl[to], o = st.pl[1 - to]; p.x = 17; p.y = 7.5; p.f = Math.PI; o.x = 13; o.y = 7.5; o.f = 0; st.wait = .8; },
    bot(st, i, dt) {
        const p = st.pl[i], o = st.pl[1 - i], B = st.ball, I = blankIn(), H = this, D = hyp(p.x - H.HX, p.y - H.HY), skill = [.5, .75, .95][st.diff];
        const go = (x, y) => { const dx = x - p.x, dy = y - p.y; if (Math.abs(dx) > .3) I[dx > 0 ? 'r' : 'l'] = 1; if (Math.abs(dy) > .3) I[dy > 0 ? 'd' : 'u'] = 1; };
        if (B.fly) return I;
        if (B.h === i) {
            const open = hyp(o.x - p.x, o.y - p.y) > 2.2, want = p.want || (p.want = Math.random() < .35 ? 7.2 : 1.2);
            if (p.sh >= 0) { const m = H.meter(p.sh); I.a = !(p.sh > .5 && Math.abs(m - .82) < .12 * (1.2 - skill) + rnd(0, .05)) ? 1 : 0; if (p.sh > 1.6) I.a = 0; return I; }
            p.gt = open ? 0 : (p.gt || 0) + dt;      // guarded too long: take the contested shot, or drive to the rim
            if ((D < want + .5 && open) || D < 1.8 || (open && D < 7.5 && Math.random() < dt * .4) || (p.gt > 1.6 && D < 8 && Math.random() < dt * 2)) { I.a = 1; p.want = 0; p.gt = 0; return I; }
            if (p.gt > .9) { p.want = 1.2; go(H.HX + .8, H.HY + (p.y < H.HY ? -1.5 : 1.5)); return I; }
            go(H.HX + want * .9, H.HY + Math.sin(st.t * 1.3 + i) * 4);
        } else if (B.h === 1 - i) {      // defend: between the ball and the hoop, try for steals
            go(lerp(o.x, H.HX, .25), lerp(o.y, H.HY, .25)); if (hyp(o.x - p.x, o.y - p.y) < 1.4 && Math.random() < dt * 2 * skill) I.a = 1;
        } else go(B.x, B.y);
        return I;
    },
    draw(g, st) {
        g.fillStyle = '#c8864b'; g.fillRect(0, 0, 28, 15); for (let i = 0; i < 28; i += 1.2) { g.fillStyle = i % 2.4 < 1.2 ? 'rgba(0,0,0,.04)' : 'rgba(255,255,255,.03)'; g.fillRect(i, 0, 1.2, 15); }
        g.strokeStyle = '#fff'; g.lineWidth = .08; g.strokeRect(0, 0, 28, 15);
        g.fillStyle = 'rgba(220,38,38,.55)'; g.fillRect(0, 5.05, 5.8, 4.9); g.strokeRect(0, 5.05, 5.8, 4.9);
        g.beginPath(); g.arc(5.8, 7.5, 1.8, -Math.PI / 2, Math.PI / 2); g.stroke();
        g.beginPath(); g.moveTo(0, .9); g.lineTo(1.6, .9); g.arc(this.HX, this.HY, 6.75, -Math.asin(6.6 / 6.75), Math.asin(6.6 / 6.75)); g.lineTo(0, 14.1); g.stroke();
        line(g, 28, 0, 28, 15, '#fff', .15); g.beginPath(); g.arc(28, 7.5, 1.8, Math.PI / 2, Math.PI * 1.5); g.stroke();
        line(g, .5, 6.6, .5, 8.4, '#e5e7eb', .2); circ(g, this.HX, this.HY, .45, null, '#f97316', .1);
        const B = st.ball;
        st.pl.forEach((p, i) => { person(g, p.x, p.y, .55, colOf(i), p.f, nameOf(i)); if (p.sh >= 0) { const m = this.meter(p.sh); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(p.x + .8, p.y - 1, .3, 2); g.fillStyle = '#22c55e'; g.fillRect(p.x + .8, p.y + 1 - 2 * .94, .3, 2 * .24); g.fillStyle = '#fde047'; g.fillRect(p.x + .75, p.y + 1 - 2 * m - .05, .4, .1); } });
        if (B.h !== -2) shadow(g, B.x, B.y, .25, .3);
        circ(g, B.x, B.y - (B.z || 0) * .35, .28 + (B.z || 0) * .05, '#ea580c', '#7c2d12', .05);
    },
    hud(st) { return `<span style="color:${colOf(0)}">${esc(nameOf(0))}</span><b>${st.sc[0]} - ${st.sc[1]}</b><span style="color:${colOf(1)}">${esc(nameOf(1))}</span><em>first to 11</em>`; },
    over(st) { for (const i of [0, 1]) if (st.sc[i] >= 11) return { win: i, text: st.sc[0] + ' - ' + st.sc[1] }; return null; }
};
