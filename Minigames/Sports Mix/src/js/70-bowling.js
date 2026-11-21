// ==========================================
// BOWLING: 10 frames, real scoring (strikes, spares, 10th-frame bonus balls), up to 4 players taking turns.
// Left / right to stand, SPACE to start the aim (the arrow swings), SPACE to lock it, SPACE again to lock the power.
// Hold left or right while the ball rolls to hook it. Pins knock each other over (circle physics); gutters are gutters.
// Lane 1.06 m wide, 18.3 m to the head pin; drawn top-down, foul line at the bottom.
// ==========================================
SPORTS.bowling = {
    n: 'Bowling', ic: '🎳', sub: '10 frames, up to 4', desc: 'Pick your spot, lock the angle and the power, hook it with left or right as it rolls. Real scoring with strikes and spares.',
    max: 4, turns: true, W: 6, H: 22, bg: '#111827', keys: '←/→ move · SPACE aim, SPACE angle, SPACE power · hold ←/→ while rolling to hook',
    LW: 1.06, LX: 2.47, PY: 2.2, BR: .109, PR: .06,
    pins0() { const P = [], s = .305; let k = 0; for (let r = 0; r < 4; r++) for (let c = 0; c <= r; c++) P.push({ x: this.LX + this.LW / 2 + (c - r / 2) * s, y: this.PY - r * s * .866, vx: 0, vy: 0, up: 1 }); return P; },
    init(P, o) { return { n: P.length, cur: 0, fr: P.map(() => []), frame: 0, roll: 0, ph: 'pos', bx: this.LX + this.LW / 2, aim: 0, pow: 0, osc: 0, ball: null, pins: this.pins0(), settle: 0, diff: o.diff, wait: .8, standing: 10 }; },
    step(st, dt, inp) {
        if (st.wait > 0) { st.wait -= dt; return; }
        const I = inp[st.cur] || blankIn(), C = this;
        if (st.ph === 'pos') { st.bx = clamp(st.bx + (I.r - I.l) * dt * .8, C.LX + .15, C.LX + C.LW - .15); if (I.ap) { st.ph = 'aim'; st.osc = 0; } }
        else if (st.ph === 'aim') { st.osc += dt * 2.2; st.aim = Math.sin(st.osc) * .09; if (I.ap) { st.ph = 'pow'; st.osc = 0; } }
        else if (st.ph === 'pow') { st.osc += dt * 1.8; st.pow = (1 - Math.cos(st.osc)) / 2; if (I.ap) { const v = 6 + st.pow * 4.5; st.ball = { x: st.bx, y: 20.5, vx: Math.sin(st.aim) * v, vy: -Math.cos(st.aim) * v, gut: false }; st.ph = 'roll'; st.settle = 0; ev(st, 'blip'); } }
        else if (st.ph === 'roll') {
            const b = st.ball;
            if (b && !b.gut) { b.vx += (I.r - I.l) * dt * .55 * (b.y < 12 ? 1.3 : .6); if (b.x < C.LX + C.BR || b.x > C.LX + C.LW - C.BR) { b.gut = true; b.x = b.x < C.LX + .5 ? C.LX - .09 : C.LX + C.LW + .09; b.vx = 0; ev(st, 'blip', 'Gutter!'); } }
            const sub = 4, h = dt / sub;
            for (let s = 0; s < sub; s++) {
                if (b) { b.x += b.vx * h; b.y += b.vy * h; }
                for (const p of st.pins) { if (!p.on && p.on !== undefined) continue; p.x += p.vx * h; p.y += p.vy * h; const f = Math.exp(-3 * h); p.vx *= f; p.vy *= f; }
                if (b && !b.gut) for (const p of st.pins) this.collide(b, p, C.BR + C.PR, 7.3, 1.5, st);
                for (let a = 0; a < 10; a++) for (let c = a + 1; c < 10; c++) this.collide(st.pins[a], st.pins[c], C.PR * 2, 1.5, 1.5, st);
            }
            for (const p of st.pins) { if (p.up && (hyp(p.vx, p.vy) > .25 || p.hit)) { p.up = 0; } if (p.x < C.LX - .05 || p.x > C.LX + C.LW + .05) p.up = 0; }
            if (b && b.y < -.6) st.ball = null;
            st.settle += dt;
            if ((!st.ball || st.settle > 6) && st.pins.every(p => hyp(p.vx, p.vy) < .05) || st.settle > 7) this.scoreRoll(st);
        }
    },
    collide(a, b, R, ma, mb, st) {
        const dx = b.x - a.x, dy = b.y - a.y, d = hyp(dx, dy); if (d >= R || d === 0) return;
        const nx = dx / d, ny = dy / d, o = R - d; a.x -= nx * o * mb / (ma + mb); a.y -= ny * o * mb / (ma + mb); b.x += nx * o * ma / (ma + mb); b.y += ny * o * ma / (ma + mb);
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (rv > 0) return;
        const j = -(1 + .6) * rv / (1 / ma + 1 / mb); a.vx -= j * nx / ma; a.vy -= j * ny / ma; b.vx += j * nx / mb; b.vy += j * ny / mb;
        if (b.up !== undefined) b.hit = 1; if (a.up !== undefined) a.hit = 1; if (st && Math.abs(rv) > 1) ev(st, 'hit');
    },
    scoreRoll(st) {
        const down = st.pins.filter(p => !p.up && !p.gone).length, F = st.fr[st.cur][st.frame] = st.fr[st.cur][st.frame] || [];
        F.push(down); st.pins.forEach(p => { if (!p.up) p.gone = 1; });
        const tenth = st.frame === 9, first = F.length === 1;
        let next = false;
        if (!tenth) { if (F[0] === 10) { ev(st, 'score', 'STRIKE!'); next = true; } else if (F.length === 2) { if (F[0] + F[1] === 10) ev(st, 'score', 'Spare!'); next = true; } }
        else {
            if (F[0] === 10 && F.length === 1) ev(st, 'score', 'STRIKE!');
            const tot = F.reduce((a, b) => a + b, 0);
            if (F.length === 3 || (F.length === 2 && F[0] + F[1] < 10)) next = true;
            if (F.length === 2 && F[0] + F[1] === 10 && F[0] !== 10) ev(st, 'score', 'Spare!');
            if (F.length >= 1 && (F.length === 1 ? F[0] === 10 : F.length === 2 && (F[0] === 10 ? F[1] === 10 : F[0] + F[1] === 10))) { st.pins = this.pins0(); }
        }
        st.ball = null; st.ph = 'pos'; st.bx = this.LX + this.LW / 2; st.wait = 1.1;
        if (next) { st.pins = this.pins0(); st.cur++; if (st.cur >= st.n) { st.cur = 0; st.frame++; } }
        else { st.pins = st.pins.map(p => p.gone && !(tenth && st.pins.every(q => q.gone)) ? Object.assign(p, { x: -10, y: -10, vx: 0, vy: 0 }) : Object.assign(p, { vx: 0, vy: 0, hit: 0 })); }
        st.pins.forEach(p => { p.hit = 0; });
    },
    total(rolls) {      // standard scoring from a list of frames
        const r = []; rolls.forEach(f => r.push(...f)); let s = 0, i = 0; const out = [];
        for (let f = 0; f < 10 && i < r.length; f++) {
            if (r[i] === 10) { if (r[i + 2] === undefined) break; s += 10 + r[i + 1] + r[i + 2]; i++; }
            else if (r[i + 1] === undefined) break; else if (r[i] + r[i + 1] === 10) { if (r[i + 2] === undefined) break; s += 10 + r[i + 2]; i += 2; } else { s += r[i] + r[i + 1]; i += 2; }
            out.push(s);
        }
        return out;
    },
    bot(st, i, dt) {
        const I = blankIn(); if (st.cur !== i) return I; const skill = [.55, .78, .93][st.diff];
        st.bot = st.bot || {}; const B = st.bot;
        if (st.ph === 'pos') { B.spot = B.spot ?? this.LX + this.LW / 2 + .12 + rnd(-.1, .1) * (1 - skill); if (Math.abs(st.bx - B.spot) > .02) I[B.spot > st.bx ? 'r' : 'l'] = 1; else I.a = 1; }
        else if (st.ph === 'aim') { if (Math.abs(st.aim + .012) < .02 * (1.3 - skill) && st.osc > .5) I.a = 1; }
        else if (st.ph === 'pow') { if (st.pow > .72 + rnd(-.1, .1) && st.osc > .3) I.a = 1; }
        else if (st.ph === 'roll' && st.ball && st.ball.y < 13 && st.ball.x > this.LX + this.LW / 2 + .02) I.l = Math.random() < skill ? 1 : 0;
        if (st.ph !== 'pos') B.spot = null;
        return I;
    },
    draw(g, st) {
        const C = this; g.fillStyle = '#1f2937'; g.fillRect(0, 0, 6, 22);
        g.fillStyle = '#374151'; g.fillRect(C.LX - .2, 0, .18, 21); g.fillRect(C.LX + C.LW + .02, 0, .18, 21);
        const gr = g.createLinearGradient(C.LX, 0, C.LX + C.LW, 0); gr.addColorStop(0, '#d9a066'); gr.addColorStop(.5, '#e8b77c'); gr.addColorStop(1, '#d9a066'); g.fillStyle = gr; g.fillRect(C.LX, 0, C.LW, 21);
        for (let x = C.LX; x < C.LX + C.LW; x += .027 * 4) line(g, x, 0, x, 21, 'rgba(120,70,30,.12)', .006);
        line(g, C.LX, 20.2, C.LX + C.LW, 20.2, '#7f1d1d', .03);
        for (let k = 0; k < 7; k++) { const x = C.LX + C.LW * (k + 1) / 8, y = 15; g.fillStyle = '#7c2d12'; g.beginPath(); g.moveTo(x, y - .12); g.lineTo(x + .03, y); g.lineTo(x - .03, y); g.fill(); }
        for (const p of st.pins) { if (p.x < 0) continue; if (p.up) { shadow(g, p.x, p.y, C.PR, .3); circ(g, p.x, p.y, C.PR, '#f8fafc', '#dc2626', .012); } else { g.save(); g.translate(p.x, p.y); g.rotate(Math.atan2(p.vy || .1, p.vx || .1)); g.fillStyle = 'rgba(248,250,252,.85)'; g.fillRect(-.19, -.05, .38, .1); g.restore(); } }
        const b = st.ball, bx = b ? b.x : st.bx, by = b ? b.y : 20.5;
        shadow(g, bx, by, C.BR, .35); circ(g, bx, by, C.BR, colOf(st.cur), '#111', .015);
        if (st.ph === 'aim' || st.ph === 'pow') { line(g, st.bx, 20.4, st.bx + Math.sin(st.aim) * 4, 20.4 - Math.cos(st.aim) * 4, 'rgba(253,224,71,.9)', .04); }
        if (st.ph === 'pow') { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(4.3, 14, .35, 6); g.fillStyle = st.pow > .8 ? '#ef4444' : '#22c55e'; g.fillRect(4.3, 20 - 6 * st.pow, .35, 6 * st.pow); }
        g.font = 'bold .55px system-ui'; g.textAlign = 'center'; g.fillStyle = '#fff';
        if (st.ph !== 'roll') g.fillText(nameOf(st.cur) + ': ' + { pos: '←/→ to stand, SPACE to aim', aim: 'SPACE to lock the angle', pow: 'SPACE to lock the power' }[st.ph], 3, 21.6);
    },
    hud(st) {
        const rows = SM.P.map((p, i) => { const fr = st.fr[i] || [], tot = this.total(fr); const cell = f => { const F = fr[f]; if (!F) return ''; return F.map((v, k) => v === 10 && (f === 9 || k === 0) ? 'X' : k > 0 && f < 9 && F[k - 1] + v === 10 ? '/' : k === 1 && f === 9 && F[0] !== 10 && F[0] + v === 10 ? '/' : v === 0 ? '-' : v).join(' '); };
            return `<tr class="${i === st.cur ? 'cur' : ''}"><th style="color:${p.col}">${esc(nameOf(i))}</th>${Array.from({ length: 10 }, (_, f) => `<td><small>${cell(f)}</small><b>${tot[f] ?? ''}</b></td>`).join('')}</tr>`; }).join('');
        return `<table class="sm-score">${rows}</table>`;
    },
    over(st) {
        if (st.frame < 10) return null;
        const t = SM.P.map((p, i) => { const a = this.total(st.fr[i] || []); return a[a.length - 1] || 0; }), best = Math.max(...t), w = t.filter(x => x === best).length > 1 ? -1 : t.indexOf(best);
        return { win: w, text: SM.P.map((p, i) => esc(nameOf(i)) + ' ' + t[i]).join(' · '), best: { bowling: t } };
    }
};
