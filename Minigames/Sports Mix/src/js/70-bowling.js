// ==========================================
// BOWLING (overhauled 2026-11-21): 10 frames, real scoring (strikes, spares, 10th-frame bonus balls), up to 4 players.
// Seen from behind the bowler in perspective; the camera chases the ball down the lane to the pins.
//   Before you throw: LEFT / RIGHT to pick where you stand, UP / DOWN to set your hook (the dashed line shows the start
//   of your line). SPACE starts the aim (the arrow swings), SPACE locks it, SPACE locks the power.
//   The ball skids straight through the oil (the first 12 m) and then breaks toward the pocket: more hook, more break;
//   a faster ball breaks later. Pins wobble and can stay up, knocked pins fly into others (and off the side walls).
// Lane units are metres: x across (0 = left edge, 1.06 wide), d down the lane (0 = foul line, head pin at 18.29).
// Pins are numbered 1-10 the usual way (1 the head pin, 7 back left, 10 back right): pins[i] is pin i+1.
// The state is plain data (it travels to the other players); the camera is local to each screen.
// ==========================================
const BW = { LW: 1.06, HEAD: 18.29, OIL: 12.2, PIT: 19.55, BR: .109, PR: .061, ROW: .264, SP: .305, GUT: .23, KICK: .36, CAMH: 1.25, F: 9, HZ: 2.05 };
const BW_CAM = { d: -2.2, x: 0 };
SPORTS.bowling = {
    n: 'Bowling', ic: '🎳', sub: '10 frames, up to 4', desc: 'Stand, set your hook, lock the angle and the power. The ball skids through the oil and breaks into the pocket. Real pin action, real scoring.',
    max: 4, turns: true, W: 16, H: 9, bg: '#0a0a12', keys: '←/→ where you stand · ↑/↓ hook · SPACE aim, SPACE angle, SPACE power',
    pins0() {
        const P = [];
        for (let r = 0; r < 4; r++) for (let c = 0; c <= r; c++) P.push({ x: BW.LW / 2 + (c - r / 2) * BW.SP, d: BW.HEAD + r * BW.ROW, vx: 0, vd: 0, st: 0, tilt: 0, wob: 0, wt: 0, fx: 0, gone: 0 });
        return P;
    },
    init(P, o) {
        return { n: P.length, cur: 0, fr: P.map(() => []), frame: 0, ph: 'pos', bx: BW.LW / 2 + .2, aim: 0, pow: 0, osc: 0, spin: P.map(() => .5), ball: null,
            pins: this.pins0(), t: 0, diff: o.diff, wait: .8, sweep: 0, hitT: 0, streak: P.map(() => 0), call: '', upBefore: 10, rack: 0, next: 0, rollT: 0 };
    },
    // the ball on its own (no pins): where a throw goes. Used by the dashed guide, the bot and the roll itself.
    launch(bx, aim, pow, spin) { const v = 6.6 + pow * 3.2; return { x: bx, d: 0, vx: Math.sin(aim) * v, vd: Math.cos(aim) * v, spin, gut: 0, rot: 0 }; },
    ballStep(b, h) {
        if (!b.gut) {
            // skid through the oil, then the spin bites; a faster ball has less time to break
            const dry = b.d < BW.OIL ? .1 : Math.min(1, .35 + (b.d - BW.OIL) * .55);
            b.vx += -b.spin * 1.45 * dry * h * (8 / Math.max(5, b.vd));
            b.vd -= .09 * h;
        }
        b.x += b.vx * h; b.d += b.vd * h; b.rot += b.vd * h / BW.BR;
        if (!b.gut && b.d < BW.HEAD - .2 && (b.x < 0 || b.x > BW.LW)) { b.gut = b.x < 0 ? -1 : 1; b.x = b.gut < 0 ? -BW.GUT / 2 : BW.LW + BW.GUT / 2; b.vx = 0; }
        if (b.d >= BW.HEAD - .2) {      // on the pin deck: the kickbacks keep it in
            const lo = -BW.KICK + BW.BR, hi = BW.LW + BW.KICK - BW.BR;
            if (b.x < lo) { b.x = lo; b.vx = Math.abs(b.vx) * .4; } else if (b.x > hi) { b.x = hi; b.vx = -Math.abs(b.vx) * .4; }
        }
    },
    predict(bx, aim, pow, spin, toD) { const b = this.launch(bx, aim, pow, spin), pts = []; for (let i = 0; i < 600 && b.d < toD; i++) { this.ballStep(b, 1 / 120); if (i % 6 === 0) pts.push([b.x, b.d]); if (b.gut) break; } return { x: b.x, gut: b.gut, pts }; },
    step(st, dt, inp) {
        st.t += dt; st.hitT -= dt;
        if (st.sweep > 0) { this.sweepStep(st, dt); return; }
        if (st.wait > 0) { st.wait -= dt; return; }
        const I = inp[st.cur] || blankIn();
        if (st.ph === 'pos') {
            st.bx = clamp(st.bx + (I.r - I.l) * dt * .55, .12, BW.LW - .12);
            if (I.up) st.spin[st.cur] = clamp(st.spin[st.cur] + .25, -1, 1); if (I.dp) st.spin[st.cur] = clamp(st.spin[st.cur] - .25, -1, 1);
            if (I.ap) { st.ph = 'aim'; st.osc = 0; ev(st, 'blip'); }
        } else if (st.ph === 'aim') { st.osc += dt * 1.7; st.aim = Math.sin(st.osc) * .052; if (I.ap) { st.ph = 'pow'; st.osc = 0; ev(st, 'blip'); } }
        else if (st.ph === 'pow') {
            st.osc += dt * 1.9; st.pow = (1 - Math.cos(st.osc)) / 2;
            if (I.ap) { st.ball = this.launch(st.bx, st.aim, st.pow, st.spin[st.cur]); st.ph = 'roll'; st.rollT = 0; st.call = ''; ev(st, 'go'); }
        } else if (st.ph === 'roll') this.roll(st, dt);
    },
    roll(st, dt) {
        const b = st.ball, sub = 6, h = dt / sub;
        st.rollT += dt;
        for (let s = 0; s < sub; s++) {
            if (b) {
                const was = b.gut; this.ballStep(b, h);
                if (b.gut && !was) ev(st, 'lose', 'Gutter ball');
                if (!b.gut) for (const p of st.pins) if (!p.gone) this.hit(b, p, BW.BR + (p.st === 2 ? .085 : BW.PR), 7.2, 1.55, st);
            }
            for (const p of st.pins) {
                if (p.gone || (p.st === 0 && !p.vx && !p.vd)) continue;
                p.x += p.vx * h; p.d += p.vd * h; const f = Math.exp((p.st === 2 ? -2.4 : -6) * h); p.vx *= f; p.vd *= f;
                // the kickbacks (side walls of the deck) send pins back in; the pit swallows them
                const lo = -BW.KICK + .07, hi = BW.LW + BW.KICK - .07;
                if (p.x < lo) { p.x = lo; p.vx = Math.abs(p.vx) * .55; } else if (p.x > hi) { p.x = hi; p.vx = -Math.abs(p.vx) * .55; }
                if (p.d > BW.PIT) { p.gone = 1; p.st = 2; }
                if (p.d < BW.HEAD - .9 && p.st === 2) { p.gone = 1; }      // slid off the deck into a gutter
            }
            for (let a = 0; a < 10; a++) for (let c = a + 1; c < 10; c++) {
                const A = st.pins[a], C = st.pins[c]; if (A.gone || C.gone) continue;
                this.hit(A, C, (A.st === 2 ? .085 : BW.PR) + (C.st === 2 ? .085 : BW.PR), A.st === 2 ? 1.2 : 1.55, C.st === 2 ? 1.2 : 1.55, st);
            }
        }
        for (const p of st.pins) {
            if (p.st === 1) { p.wt -= dt; if (p.wt <= 0) { if (Math.random() < p.wob) this.fall(p); else { p.st = 0; p.wob = 0; p.vx = p.vd = 0; } } }
            if (p.st === 2 && p.tilt < 1) p.tilt = Math.min(1, p.tilt + dt * 4.5);
        }
        if (b && (b.d > BW.PIT + .3 || b.vd < .2)) st.ball = null;
        const moving = st.pins.some(p => !p.gone && (p.st === 1 || hyp(p.vx, p.vd) > .04));
        if ((!st.ball && !moving && st.rollT > 1) || st.rollT > 8) this.scoreRoll(st);
    },
    fall(p) { p.st = 2; p.wob = 0; p.fx = p.vx >= 0 ? 1 : -1; p.fd = Math.abs(p.vd) > Math.abs(p.vx) ? 1 : 0; },
    hit(a, b, R, ma, mb, st) {
        const dx = b.x - a.x, dd = b.d - a.d, dist = hyp(dx, dd); if (dist >= R || dist === 0) return;
        let nx = dx / dist, nd = dd / dist; const o = R - dist;
        // pins are not billiard balls: they tumble, so a pin-on-pin knock goes off a little to one side or the other
        if (a.st !== undefined && b.st !== undefined) { const r = (Math.random() - .5) * .5, c = Math.cos(r), sn = Math.sin(r); [nx, nd] = [nx * c - nd * sn, nx * sn + nd * c]; } a.x -= nx * o * mb / (ma + mb); a.d -= nd * o * mb / (ma + mb); b.x += nx * o * ma / (ma + mb); b.d += nd * o * ma / (ma + mb);
        const rv = (b.vx - a.vx) * nx + (b.vd - a.vd) * nd; if (rv > 0) return;
        const j = -(1 + .55) * rv / (1 / ma + 1 / mb);
        if (a.vx !== undefined) { a.vx -= j * nx / ma; a.vd -= j * nd / ma; } b.vx += j * nx / mb; b.vd += j * nd / mb;
        // a hard knock topples a pin; a light one sets it wobbling (it may stay up)
        for (const [p, m] of [[a, ma], [b, mb]]) if (p.st !== undefined && p.st < 2) {
            const imp = j / m;
            if (imp > .55) this.fall(p); else if (imp > .12) { if (p.st === 0) { p.st = 1; p.wt = .55; } p.wob = Math.min(.95, p.wob + (imp - .12) * 1.6); }
        }
        if (st && st.hitT <= 0 && Math.abs(rv) > .6) { st.hitT = .09; ev(st, 'hit'); }
    },
    standing(st) { return st.pins.map((p, i) => !p.gone && p.st !== 2 ? i : -1).filter(i => i >= 0); },
    // a split: the head pin is down and what stands is in groups with a gap between them
    isSplit(idx) {
        if (idx.length < 2 || idx.includes(0)) return false;
        const COL = [0, -1, 1, -2, 0, 2, -3, -1, 1, 3], cols = [...new Set(idx.map(i => COL[i]))].sort((a, b) => a - b);
        for (let k = 1; k < cols.length; k++) if (cols[k] - cols[k - 1] > 2) return true;
        return false;
    },
    scoreRoll(st) {
        // a pin that wobbled and stopped is standing; everything else that moved is down
        for (const p of st.pins) if (p.st === 1) { p.st = 0; p.vx = p.vd = 0; }
        const up = this.standing(st), F = st.fr[st.cur][st.frame] = st.fr[st.cur][st.frame] || [];
        const fresh = st.upBefore === 10, down = Math.max(0, st.upBefore - up.length);
        F.push(down);
        const strike = fresh && down === 10, spare = !fresh && up.length === 0;
        if (strike) st.streak[st.cur]++; else if (fresh) st.streak[st.cur] = 0;
        const k = st.streak[st.cur];
        const call = strike ? (k >= 4 ? k + ' strikes in a row!' : k === 3 ? 'TURKEY!' : k === 2 ? 'Double!' : 'STRIKE!') : spare ? 'Spare!'
            : fresh && this.isSplit(up) ? 'Split! ' + up.map(i => i + 1).join('-') : fresh ? down + (down === 1 ? ' pin' : ' pins') : down ? down + ' more' : 'Missed';
        ev(st, strike || spare ? 'score' : down ? 'blip' : 'lose', call); st.call = call;
        const next = st.frame < 9 ? strike || F.length === 2 : F.length === 3 || (F.length === 2 && F[0] + F[1] < 10);
        st.rack = next || up.length === 0 ? 1 : 0;      // a fresh rack: a new frame, or the 10th frame's bonus balls
        st.ball = null; st.sweep = 1.3; st.next = next ? 1 : 0;
    },
    // the pinsetter: lift what stands, sweep the deadwood, put the rack back (or a fresh one)
    sweepStep(st, dt) {
        const was = st.sweep; st.sweep -= dt;
        if (was > .65 && st.sweep <= .65) {
            if (st.rack) st.pins = this.pins0();
            else st.pins = st.pins.map(p => p.gone || p.st === 2 ? Object.assign(p, { gone: 1, st: 2, vx: 0, vd: 0 }) : Object.assign(p, { vx: 0, vd: 0, st: 0, wob: 0, tilt: 0 }));
            st.upBefore = this.standing(st).length;
        }
        if (st.sweep <= 0) {
            st.sweep = 0; st.ph = 'pos'; st.bx = clamp(st.bx, .12, BW.LW - .12); st.wait = .3; st.bot = null;
            if (st.next) { st.cur++; if (st.cur >= st.n) { st.cur = 0; st.frame++; } st.bx = BW.LW / 2 + .2; }
            st.next = 0;
        }
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
    // ---- the bot: plans a line with the same ball physics, then times its SPACE presses (better bots, tighter timing)
    bot(st, i) {
        const I = blankIn(); if (st.cur !== i || st.sweep > 0 || st.wait > 0) return I;
        const sk = [{ noise: .14, tol: .007, ptol: .12, spin: .5 }, { noise: .075, tol: .004, ptol: .06, spin: .75 }, { noise: .038, tol: .0022, ptol: .03, spin: 1 }][st.diff] || { noise: .05, tol: .004, ptol: .05, spin: .75 };
        st.bot = st.bot || {}; const B = st.bot;
        if (!B.plan) {
            const up = this.standing(st), full = up.length === 10 || up.length === 0;
            let tx, spin, bx;
            if (full) { spin = sk.spin; bx = BW.LW / 2 + .14 + spin * .14; tx = BW.LW / 2 + .065; }      // the 1-3 pocket, curving in
            else { spin = 0; const xs = up.map(k => st.pins[k].x); tx = (Math.min(...xs) + Math.max(...xs)) / 2; bx = clamp(BW.LW - tx, .2, BW.LW - .2); }      // spares: straight, cross-lane
            tx += (Math.random() * 2 - 1) * sk.noise;
            const pow = .62;
            let lo = -.052, hi = .052;      // bisect the angle that reaches tx at the head pin
            for (let k = 0; k < 22; k++) { const m = (lo + hi) / 2, r = this.predict(bx, m, pow, spin, BW.HEAD); if ((r.gut ? (r.gut < 0 ? -1 : 2) : r.x) < tx) lo = m; else hi = m; }
            B.plan = { bx, spin, aim: (lo + hi) / 2, pow };
        }
        const P = B.plan;
        if (st.ph === 'pos') {
            if (Math.abs(st.spin[i] - P.spin) > .01) { B.tog = !B.tog; if (B.tog) I[P.spin > st.spin[i] ? 'u' : 'd'] = 1; }
            else if (Math.abs(st.bx - P.bx) > .015) I[P.bx > st.bx ? 'r' : 'l'] = 1;
            else { B.tog = !B.tog; if (B.tog) I.a = 1; }
        } else if (st.ph === 'aim') { if (st.osc > .4 && Math.abs(st.aim - P.aim) < sk.tol) I.a = 1; }
        else if (st.ph === 'pow') { if (st.osc > .3 && Math.abs(st.pow - P.pow) < sk.ptol) I.a = 1; }
        return I;
    },
    // ---- drawing: a perspective view from behind the foul line; world units are a 16 x 9 screen
    proj(x, d, z) { const dep = Math.max(.25, d - BW_CAM.d); return [8 + (x - BW.LW / 2 - BW_CAM.x) * BW.F / dep, BW.HZ + (BW.CAMH - z) * BW.F / dep, BW.F / dep]; },
    quad(g, x1, x2, d1, d2, fill) { const a = this.proj(x1, d1, 0), b = this.proj(x2, d1, 0), c = this.proj(x2, d2, 0), e = this.proj(x1, d2, 0); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(e[0], e[1]); g.closePath(); g.fillStyle = fill; g.fill(); },
    pinShape(g, x, y, s, tilt, fx, fd, ghost) {
        const H = .381 * s, W = .121 * s;
        g.save(); g.translate(x, y);
        if (tilt > 0) { if (fd) g.scale(1, 1 - .75 * tilt); else g.rotate(fx * tilt * Math.PI / 2); }
        g.globalAlpha = ghost ? .35 : 1;
        g.beginPath();
        g.moveTo(-W * .32, 0);
        g.bezierCurveTo(-W * .62, -H * .2, -W * .55, -H * .42, -W * .2, -H * .6);
        g.bezierCurveTo(-W * .14, -H * .7, -W * .3, -H * .86, -W * .2, -H * .95);
        g.bezierCurveTo(-W * .1, -H * 1.02, W * .1, -H * 1.02, W * .2, -H * .95);
        g.bezierCurveTo(W * .3, -H * .86, W * .14, -H * .7, W * .2, -H * .6);
        g.bezierCurveTo(W * .55, -H * .42, W * .62, -H * .2, W * .32, 0);
        g.closePath();
        const gr = g.createLinearGradient(-W * .5, 0, W * .5, 0); gr.addColorStop(0, '#cbd5e1'); gr.addColorStop(.35, '#ffffff'); gr.addColorStop(1, '#94a3b8');
        g.fillStyle = gr; g.fill(); g.lineWidth = Math.max(.004, W * .04); g.strokeStyle = 'rgba(0,0,0,.35)'; g.stroke();
        g.fillStyle = '#dc2626'; g.fillRect(-W * .19, -H * .7, W * .38, H * .035); g.fillRect(-W * .17, -H * .65, W * .34, H * .035);
        g.restore(); g.globalAlpha = 1;
    },
    draw(g, st) {
        const C = this, b = st.ball;
        // the camera: behind the foul line, then chasing the ball, then on the pins
        let td = -2.2, tx = 0;
        if (st.ph === 'roll') { td = b ? clamp(b.d - 3.4, -2.2, 14.6) : 14.6; tx = b ? (b.x - BW.LW / 2) * .4 : 0; }
        else if (st.sweep > 0) { td = 14.6; }
        BW_CAM.d += (td - BW_CAM.d) * (td < BW_CAM.d ? .08 : .12); BW_CAM.x += (tx - BW_CAM.x) * .08;
        // the room: dark walls, the masking unit over the pins, the approach
        const sky = g.createLinearGradient(0, 0, 0, 9); sky.addColorStop(0, '#120a24'); sky.addColorStop(.3, '#1e1033'); sky.addColorStop(1, '#0a0a12'); g.fillStyle = sky; g.fillRect(-1, -1, 18, 11);
        const dn = BW_CAM.d + .4, far = BW.PIT + .6;
        C.quad(g, -2.2, BW.LW + 2.2, dn, far, '#141021');
        C.quad(g, -BW.KICK - .25, -BW.GUT, dn, far, '#24183a'); C.quad(g, BW.LW + BW.GUT, BW.LW + BW.KICK + .25, dn, far, '#24183a');      // the capping between lanes
        // gutters, then the lane
        C.quad(g, -BW.GUT, 0, dn, BW.HEAD - .2, '#2b2f3a'); C.quad(g, BW.LW, BW.LW + BW.GUT, dn, BW.HEAD - .2, '#2b2f3a');
        C.quad(g, -BW.KICK, BW.LW + BW.KICK, BW.HEAD - .2, BW.PIT, '#c48a52');      // the pin deck
        const L0 = C.proj(0, dn, 0), L1 = C.proj(0, BW.HEAD - .2, 0), lane = g.createLinearGradient(0, L0[1], 0, L1[1]);
        lane.addColorStop(0, '#e9b97f'); lane.addColorStop(.5, '#dca46a'); lane.addColorStop(1, '#cf9558');
        C.quad(g, 0, BW.LW, Math.max(dn, -2.2), BW.HEAD - .2, lane);
        if (dn < -.1) C.quad(g, -.05, BW.LW + .05, dn, 0, '#b37a45');      // the approach
        // the oil: a sheen over the first 12 m
        C.quad(g, .08, BW.LW - .08, Math.max(dn, 0), BW.OIL, 'rgba(255,255,255,.07)');
        // boards, the foul line, the dots and the arrows
        g.lineWidth = .006;
        for (let k = 1; k < 39; k += 3) { const x = k * BW.LW / 39, a = C.proj(x, Math.max(dn, -2.2), 0), e = C.proj(x, BW.HEAD - .2, 0); g.strokeStyle = 'rgba(110,60,20,.16)'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(e[0], e[1]); g.stroke(); }
        if (dn < 0) { const a = C.proj(0, 0, 0), e = C.proj(BW.LW, 0, 0); line(g, a[0], a[1], e[0], e[1], '#7f1d1d', Math.max(.02, .03 * a[2])); }
        for (let k = 1; k <= 7; k++) {
            const x = BW.LW * (k * 5) / 39, d = 3.66 + (3 - Math.abs(k - 4)) * .3;
            if (d < dn) continue; const p = C.proj(x, d, 0), q = C.proj(x, d + .3, 0), s = .03 * p[2];
            g.fillStyle = '#6b2a10'; g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(p[0] + s, p[1]); g.lineTo(p[0] - s, p[1]); g.fill();
        }
        // the pit and the curtain, the sign above
        C.quad(g, -BW.KICK, BW.LW + BW.KICK, BW.PIT, far, '#05050a');
        const top = C.proj(0, far, .75), cl = C.proj(-BW.KICK - .25, far, .75), cr = C.proj(BW.LW + BW.KICK + .25, far, .75), bot0 = C.proj(0, far, 0);
        g.fillStyle = '#0d0b1a'; g.fillRect(cl[0], top[1], cr[0] - cl[0], bot0[1] - top[1]);
        g.fillStyle = '#1b1035'; g.fillRect(cl[0], -1, cr[0] - cl[0], top[1] + 1);
        g.font = `900 ${Math.max(.18, top[2] * .28)}px system-ui`; g.textAlign = 'center'; g.fillStyle = '#f472b6'; g.shadowColor = '#f472b6'; g.shadowBlur = .2;
        g.fillText('TACO LANES', 8 - BW_CAM.x * top[2], top[1] - top[2] * .12); g.shadowBlur = 0;
        // the guide: where the ball starts out (only before the throw, and only the first stretch)
        if (st.ph === 'pos' || st.ph === 'aim') {
            const pr = C.predict(st.bx, st.ph === 'aim' ? st.aim : 0, .55, st.spin[st.cur], 5.5);
            g.setLineDash([.08, .08]); g.beginPath(); pr.pts.forEach((q, k) => { const p = C.proj(q[0], q[1], .005); k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.strokeStyle = 'rgba(253,224,71,.85)'; g.lineWidth = .035; g.stroke(); g.setLineDash([]);
        }
        // pins and the ball, far to near
        const things = [];
        st.pins.forEach((p, i) => { if (!p.gone || (st.sweep > .65 && p.st === 2 && p.d < BW.PIT)) things.push({ d: p.d, p, i }); });
        const bd = b ? b.d : 0; if (b || st.ph === 'pos' || st.ph === 'aim' || st.ph === 'pow') things.push({ d: bd, ball: 1 });
        things.sort((a, c) => c.d - a.d);
        for (const t of things) {
            if (t.ball) {
                const x = b ? b.x : st.bx, d = b ? b.d : 0, p = C.proj(x, d, BW.BR), r = BW.BR * p[2], s0 = C.proj(x, d, 0);
                if (d < BW_CAM.d + .3) continue;
                g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(s0[0], s0[1], r * 1.05, r * .3, 0, 0, TAU); g.fill();
                const gr = g.createRadialGradient(p[0] - r * .35, p[1] - r * .4, r * .1, p[0], p[1], r); gr.addColorStop(0, '#fff'); gr.addColorStop(.25, colOf(st.cur)); gr.addColorStop(1, '#0b1020');
                circ(g, p[0], p[1], r, gr);
                const ang = b ? b.rot : 0; for (let k = 0; k < 3; k++) { const a = ang * .3 + k * .5; circ(g, p[0] + Math.sin(a) * r * .35 + k * r * .12 - r * .1, p[1] - r * .25 + Math.cos(a) * r * .1, r * .09, 'rgba(0,0,0,.6)'); }
            } else {
                const p = t.p, s = C.proj(p.x, p.d, 0); if (p.d < BW_CAM.d + .3) continue;
                const wob = p.st === 1 ? Math.sin(st.t * 28 + t.i) * .12 * (.4 + p.wob) : 0;
                g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(s[0], s[1], .07 * s[2], .02 * s[2], 0, 0, TAU); g.fill();
                if (p.st === 1) { g.save(); g.translate(s[0], s[1]); g.rotate(wob); C.pinShape(g, 0, 0, s[2], 0, 0, 0); g.restore(); }
                else C.pinShape(g, s[0], s[1], s[2], p.st === 2 ? p.tilt : 0, p.fx || 1, p.fd || 0, st.sweep > 0 && st.sweep < .9 && p.st === 2);
            }
        }
        // the pinsetter sweep bar
        if (st.sweep > 0) { const k = st.sweep > .65 ? (1.3 - st.sweep) / .65 : st.sweep / .65, d = BW.PIT - k * 1.5, a = C.proj(-BW.KICK, d, .15), e = C.proj(BW.LW + BW.KICK, d, .15); g.fillStyle = 'rgba(30,27,46,.92)'; g.fillRect(a[0], a[1] - .05 * a[2], e[0] - a[0], .12 * a[2]); }
        C.overlay(g, st);
    },
    // screen furniture: the rack diagram, hook, aim and power meters, what to press
    overlay(g, st) {
        const up = new Set(this.standing(st)), ox = 14.2, oy = 1.15, sp = .34;
        g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.roundRect(ox - .95, oy - .9, 1.9, 1.5, .15); g.fill();
        for (let r = 0; r < 4; r++) for (let c = 0; c <= r; c++) { const i = r * (r + 1) / 2 + c, x = ox + (c - r / 2) * sp, y = oy + .45 - r * sp * .87; circ(g, x, y, .12, up.has(i) ? '#f8fafc' : 'rgba(255,255,255,.12)', up.has(i) ? '#dc2626' : null, .03); }
        g.font = 'bold .2px system-ui'; g.textAlign = 'center'; g.fillStyle = '#cbd5e1'; g.fillText('Frame ' + Math.min(10, st.frame + 1) + ' of 10', ox, oy + .82);
        // hook meter
        const hx = 1.6, hy = 7.75, sp2 = st.spin[st.cur] || 0;
        g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.roundRect(hx - 1.2, hy - .5, 2.4, .95, .15); g.fill();
        g.font = 'bold .22px system-ui'; g.fillStyle = '#e2e8f0'; g.fillText('HOOK ' + (sp2 === 0 ? 'straight' : (sp2 > 0 ? '◀ ' : '▶ ') + Math.abs(sp2) * 4), hx, hy - .2);
        g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(hx - 1, hy + .02, 2, .14); g.fillStyle = '#facc15'; g.fillRect(hx, hy + .02, -sp2 * 1, .14);
        g.font = '.17px system-ui'; g.fillStyle = '#94a3b8'; g.fillText('↑/↓ to change', hx, hy + .37);
        // power meter
        if (st.ph === 'pow') { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(15, 3.2, .38, 4.2); g.fillStyle = st.pow > .85 ? '#ef4444' : st.pow > .45 ? '#22c55e' : '#38bdf8'; g.fillRect(15, 7.4 - 4.2 * st.pow, .38, 4.2 * st.pow); g.font = 'bold .2px system-ui'; g.fillStyle = '#fff'; g.fillText('POWER', 15.19, 3.05); }
        const tip = st.sweep > 0 ? '' : st.ph === 'roll' ? '' : nameOf(st.cur) + ': ' + { pos: '←/→ stand · ↑/↓ hook · SPACE to aim', aim: 'SPACE to lock the angle', pow: 'SPACE to lock the power' }[st.ph];
        if (tip) { g.font = 'bold .3px system-ui'; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,.7)'; g.lineWidth = .06; g.strokeText(tip, 8, 8.75); g.fillText(tip, 8, 8.75); }
        if (st.call && (st.sweep > 0 || st.wait > 0)) { g.font = '900 .6px system-ui'; g.fillStyle = /STRIKE|TURKEY|Double|row/.test(st.call) ? '#facc15' : /Spare/.test(st.call) ? '#4ade80' : '#e2e8f0'; g.strokeStyle = 'rgba(0,0,0,.8)'; g.lineWidth = .1; g.strokeText(st.call, 8, 3.6); g.fillText(st.call, 8, 3.6); }
    },
    hud(st) {
        const mk = (F, f) => {
            const v = n => n === 0 ? '-' : n;
            if (f < 9) return F[0] === 10 ? 'X' : v(F[0]) + (F.length > 1 ? ' ' + (F[0] + F[1] === 10 ? '/' : v(F[1])) : '');
            const o = []; for (let k = 0; k < F.length; k++) {
                const freshBall = k === 0 || (k === 1 && F[0] === 10) || (k === 2 && (F[1] === 10 || (F[0] !== 10 && F[0] + F[1] === 10)));
                o.push(freshBall ? (F[k] === 10 ? 'X' : v(F[k])) : F[k - 1] + F[k] === 10 ? '/' : v(F[k]));
            }
            return o.join(' ');
        };
        const rows = SM.P.map((p, i) => { const fr = st.fr[i] || [], tot = this.total(fr);
            return `<tr class="${i === st.cur ? 'cur' : ''}"><th style="color:${p.col}">${esc(nameOf(i))}</th>${Array.from({ length: 10 }, (_, f) => `<td><small>${fr[f] ? mk(fr[f], f) : ''}</small><b>${tot[f] ?? ''}</b></td>`).join('')}</tr>`; }).join('');
        return `<table class="sm-score">${rows}</table>`;
    },
    over(st) {
        if (st.frame < 10) return null;
        const t = SM.P.map((p, i) => { const a = this.total(st.fr[i] || []); return a[a.length - 1] || 0; }), best = Math.max(...t), w = t.filter(x => x === best).length > 1 ? -1 : t.indexOf(best);
        return { win: w, text: SM.P.map((p, i) => esc(nameOf(i)) + ' ' + t[i]).join(' · '), best: { bowling: t } };
    }
};
