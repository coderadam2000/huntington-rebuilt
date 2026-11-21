// ==========================================
// CHESS: full rules (castling, en passant, promotion, check, mate, stalemate, 50-move rule, threefold repetition,
// insufficient material) and a bot (alpha-beta with quiescence, piece-square tables, iterative deepening).
// Board: 64 squares, index = row * 8 + col, row 0 is rank 8 (the top as white sees it). '' = empty,
// 'PNBRQK' white, 'pnbrqk' black. A move: { f, t, p (promotion letter, white case), c (captured), ep, cs ('K'/'Q') }.
// ==========================================
const CH = {};
CH.START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
CH.fresh = function () {
    const b = [];
    for (const ch of CH.START.replace(/\//g, '')) { if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) b.push(''); else b.push(ch); }
    return { b, w: true, cr: 'KQkq', ep: -1, half: 0, full: 1, reps: {} };
};
const chWhite = p => p !== '' && p === p.toUpperCase();
const chOwn = (p, w) => p !== '' && chWhite(p) === w;
const chRC = s => [s >> 3, s & 7];
CH.key = st => st.b.map(p => p || '.').join('') + (st.w ? 'w' : 'b') + st.cr + st.ep;
const N_D = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const K_D = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const B_D = [[-1, -1], [-1, 1], [1, -1], [1, 1]], R_D = [[-1, 0], [1, 0], [0, -1], [0, 1]];
// is square s attacked by the side `byW`?
CH.attacked = function (b, s, byW) {
    const [r, c] = chRC(s);
    const pr = byW ? r + 1 : r - 1, P = byW ? 'P' : 'p';       // a white pawn attacks upward (towards row 0)
    for (const dc of [-1, 1]) { const cc = c + dc; if (pr >= 0 && pr < 8 && cc >= 0 && cc < 8 && b[pr * 8 + cc] === P) return true; }
    const Nn = byW ? 'N' : 'n', Kk = byW ? 'K' : 'k';
    for (const [dr, dc] of N_D) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === Nn) return true; }
    for (const [dr, dc] of K_D) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === Kk) return true; }
    const Bb = byW ? 'B' : 'b', Rr = byW ? 'R' : 'r', Qq = byW ? 'Q' : 'q';
    for (const [dirs, A] of [[B_D, Bb], [R_D, Rr]]) for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) { const p = b[rr * 8 + cc]; if (p) { if (p === A || p === Qq) return true; break; } rr += dr; cc += dc; }
    }
    return false;
};
CH.kingSq = (b, w) => b.indexOf(w ? 'K' : 'k');
CH.inCheck = st => CH.attacked(st.b, CH.kingSq(st.b, st.w), !st.w);
// every move that follows how the pieces move (may leave your own king in check)
CH.pseudo = function (st, capsOnly) {
    const b = st.b, w = st.w, out = [];
    const add = (f, t, extra) => { const m = { f, t, c: b[t] }; if (extra) Object.assign(m, extra); out.push(m); };
    for (let s = 0; s < 64; s++) {
        const p = b[s]; if (!chOwn(p, w)) continue;
        const [r, c] = chRC(s), u = p.toUpperCase();
        if (u === 'P') {
            const dr = w ? -1 : 1, last = w ? 0 : 7, home = w ? 6 : 1, r1 = r + dr;
            const push = (t, ex) => { if (r1 === last) for (const q of 'QRBN') add(s, t, Object.assign({ p: q }, ex)); else add(s, t, ex); };
            if (!capsOnly && r1 >= 0 && r1 < 8 && !b[r1 * 8 + c]) {
                push(r1 * 8 + c);
                if (r === home && !b[(r + 2 * dr) * 8 + c]) add(s, (r + 2 * dr) * 8 + c, { dbl: 1 });
            }
            for (const dc of [-1, 1]) {
                const cc = c + dc; if (cc < 0 || cc > 7 || r1 < 0 || r1 > 7) continue;
                const t = r1 * 8 + cc;
                if (b[t] && !chOwn(b[t], w)) push(t);
                else if (t === st.ep) add(s, t, { ep: 1, c: w ? 'p' : 'P' });
            }
        } else if (u === 'N' || u === 'K') {
            for (const [dr, dc] of (u === 'N' ? N_D : K_D)) {
                const rr = r + dr, cc = c + dc; if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
                const t = rr * 8 + cc; if (chOwn(b[t], w)) continue; if (capsOnly && !b[t]) continue; add(s, t);
            }
            if (u === 'K' && !capsOnly) {      // castling: rights kept, squares between empty, not out of / through / into check
                const row = w ? 7 : 0, K = w ? 'K' : 'k', Q = w ? 'Q' : 'q';
                if (s === row * 8 + 4 && !CH.attacked(b, s, !w)) {
                    if (st.cr.includes(K) && !b[row * 8 + 5] && !b[row * 8 + 6] && b[row * 8 + 7] === (w ? 'R' : 'r') && !CH.attacked(b, row * 8 + 5, !w) && !CH.attacked(b, row * 8 + 6, !w)) add(s, row * 8 + 6, { cs: 'K' });
                    if (st.cr.includes(Q) && !b[row * 8 + 3] && !b[row * 8 + 2] && !b[row * 8 + 1] && b[row * 8] === (w ? 'R' : 'r') && !CH.attacked(b, row * 8 + 3, !w) && !CH.attacked(b, row * 8 + 2, !w)) add(s, row * 8 + 2, { cs: 'Q' });
                }
            }
        } else {
            const dirs = u === 'B' ? B_D : u === 'R' ? R_D : B_D.concat(R_D);
            for (const [dr, dc] of dirs) {
                let rr = r + dr, cc = c + dc;
                while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
                    const t = rr * 8 + cc;
                    if (b[t]) { if (!chOwn(b[t], w)) add(s, t); break; }
                    if (!capsOnly) add(s, t);
                    rr += dr; cc += dc;
                }
            }
        }
    }
    return out;
};
// the position after a move (a new state; the old one is untouched)
CH.make = function (st, m) {
    const b = st.b.slice(), p = b[m.f], w = st.w;
    b[m.t] = m.p ? (w ? m.p : m.p.toLowerCase()) : p; b[m.f] = '';
    if (m.ep) b[m.t + (w ? 8 : -8)] = '';
    if (m.cs) { const row = w ? 7 : 0; if (m.cs === 'K') { b[row * 8 + 5] = b[row * 8 + 7]; b[row * 8 + 7] = ''; } else { b[row * 8 + 3] = b[row * 8]; b[row * 8] = ''; } }
    let cr = st.cr;
    if (p === 'K') cr = cr.replace(/[KQ]/g, ''); if (p === 'k') cr = cr.replace(/[kq]/g, '');
    for (const [sq, ch] of [[63, 'K'], [56, 'Q'], [7, 'k'], [0, 'q']]) if (m.f === sq || m.t === sq) cr = cr.replace(ch, '');
    const up = p.toUpperCase();
    return { b, w: !w, cr, ep: m.dbl ? (m.f + m.t) >> 1 : -1, half: up === 'P' || m.c ? 0 : st.half + 1, full: st.full + (w ? 0 : 1), reps: st.reps };
};
CH.legal = function (st, capsOnly) {
    const out = [];
    for (const m of CH.pseudo(st, capsOnly)) { const n = CH.make(st, m); if (!CH.attacked(n.b, CH.kingSq(n.b, st.w), !st.w)) out.push(m); }
    return out;
};
function chInsufficient(b) {
    const left = b.filter(p => p && p.toUpperCase() !== 'K');
    if (!left.length) return true;
    if (left.length === 1 && /[NBnb]/.test(left[0])) return true;
    return false;
}
// play a move in a real game (keeps the repetition count). Returns the new state and its result if the game ended.
CH.play = function (st, m) {
    const n = CH.make(st, m); n.reps = Object.assign({}, st.reps);
    const k = CH.key(n); n.reps[k] = (n.reps[k] || 0) + 1;
    const moves = CH.legal(n), chk = CH.inCheck(n);
    let res = null;
    if (!moves.length) res = chk ? { win: st.w ? 'w' : 'b', why: 'Checkmate' } : { win: 'draw', why: 'Stalemate' };
    else if (n.half >= 100) res = { win: 'draw', why: 'Fifty moves with no capture or pawn move' };
    else if (n.reps[k] >= 3) res = { win: 'draw', why: 'The same position three times' };
    else if (chInsufficient(n.b)) res = { win: 'draw', why: 'Not enough pieces left to checkmate' };
    return { st: n, res, check: chk };
};
// algebraic name of a move, for the move list (e.g. Nf3, exd5, O-O, e8=Q+)
CH.san = function (st, m) {
    const file = s => 'abcdefgh'[s & 7], sq = s => file(s) + (8 - (s >> 3));
    if (m.cs) return m.cs === 'K' ? 'O-O' : 'O-O-O';
    const p = st.b[m.f].toUpperCase();
    let s = p === 'P' ? (m.c ? file(m.f) + 'x' : '') : p;
    if (p !== 'P') {
        const twins = CH.legal(st).filter(o => o.t === m.t && o.f !== m.f && st.b[o.f] === st.b[m.f]);
        if (twins.length) s += twins.some(o => (o.f & 7) === (m.f & 7)) ? (twins.some(o => (o.f >> 3) === (m.f >> 3)) ? sq(m.f) : String(8 - (m.f >> 3))) : file(m.f);
        if (m.c) s += 'x';
    }
    s += sq(m.t) + (m.p ? '=' + m.p : '');
    const r = CH.play(st, m); if (r.res && r.res.why === 'Checkmate') s += '#'; else if (r.check) s += '+';
    return s;
};
// ---- the bot ----
const CH_VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
// piece-square tables (white's view, row 0 = rank 8)
const CH_PST = {
    P: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    N: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    B: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    R: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    Q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    K: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
    KE: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50]
};
// score from the side to move's point of view
CH.eval = function (st) {
    const b = st.b; let s = 0, mat = 0;
    for (let i = 0; i < 64; i++) { const p = b[i]; if (p && p.toUpperCase() !== 'K' && p.toUpperCase() !== 'P') mat += CH_VAL[p.toUpperCase()]; }
    const endgame = mat <= 1600;
    for (let i = 0; i < 64; i++) {
        const p = b[i]; if (!p) continue;
        const u = p.toUpperCase(), wt = p === u, idx = wt ? i : (7 - (i >> 3)) * 8 + (i & 7);
        const v = CH_VAL[u] + (u === 'K' && endgame ? CH_PST.KE : CH_PST[u])[idx];
        s += wt ? v : -v;
    }
    return st.w ? s : -s;
};
const CH_MVV = m => (m.c ? CH_VAL[m.c.toUpperCase()] * 10 - CH_VAL[(m.pc || 'P').toUpperCase()] : 0) + (m.p ? 800 : 0);
function chOrder(st, ms) { for (const m of ms) m.pc = st.b[m.f]; return ms.sort((a, b) => CH_MVV(b) - CH_MVV(a)); }
function chQuiet(st, a, beta, ctx, d) {
    ctx.n++;
    const sp = CH.eval(st);
    if (sp >= beta) return sp; if (sp > a) a = sp;
    if (d > 6) return sp;
    for (const m of chOrder(st, CH.legal(st, true))) {
        const v = -chQuiet(CH.make(st, m), -beta, -a, ctx, d + 1);
        if (v >= beta) return v; if (v > a) a = v;
    }
    return a;
}
function chSearch(st, depth, a, beta, ctx, ply) {
    if (ctx.stop || (ctx.n & 1023) === 0 && performance.now() > ctx.until) { ctx.stop = true; return 0; }
    ctx.n++;
    const ms = CH.legal(st);
    if (!ms.length) return CH.inCheck(st) ? -100000 + ply : 0;
    if (st.half >= 100) return 0;
    if (depth <= 0) return ctx.q ? chQuiet(st, a, beta, ctx, 0) : CH.eval(st);
    let best = -Infinity;
    for (const m of chOrder(st, ms)) {
        const v = -chSearch(CH.make(st, m), depth - 1, -beta, -a, ctx, ply + 1);
        if (v > best) best = v; if (v > a) a = v; if (a >= beta) break;
    }
    return best;
}
// level: { depth, q (quiescence), noise (centipawns of randomness), blunder (chance of a random move), ms (time cap) }
CH.botMove = function (st, lv) {
    const ms = CH.legal(st); if (!ms.length) return null;
    if (Math.random() < lv.blunder) return ms[Math.floor(Math.random() * ms.length)];
    const ctx = { n: 0, until: performance.now() + (lv.ms || 1500), stop: false, q: lv.q };
    let bestM = ms[0], scored = null;
    for (let d = 1; d <= lv.depth; d++) {          // iterative deepening: keep the last depth that finished
        const res = [];
        for (const m of chOrder(st, ms.slice())) { const v = -chSearch(CH.make(st, m), d - 1, -Infinity, Infinity, ctx, 1); if (ctx.stop) break; res.push([m, v]); }
        if (ctx.stop && d > 1) break;
        scored = res;
        if (ctx.stop) break;
    }
    if (scored && scored.length) {
        const noisy = scored.map(([m, v]) => [m, v + (Math.random() * 2 - 1) * lv.noise]);
        noisy.sort((x, y) => y[1] - x[1]); bestM = noisy[0][0];
    }
    return bestM;
};
// a move id that survives the network: from-to-promotion
CH.id = m => m.f + '-' + m.t + (m.p || '');
