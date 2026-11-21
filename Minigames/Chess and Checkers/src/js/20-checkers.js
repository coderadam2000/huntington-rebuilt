// ==========================================
// CHECKERS (American / English draughts): 8x8, dark squares only. Dark ('d') moves first. Men move one square
// diagonally forward, kings one square any diagonal. Jumps are compulsory, a jump that can go on must go on, and a man
// that reaches the far row becomes a king (that ends the move). Lose all your pieces, or have no move, and you lose.
// Draw: 40 moves each with no jump and no man moving.
// Board: 64 squares (row 0 at the top), '' empty, 'd'/'D' dark man/king, 'l'/'L' light man/king.
// A move: { path: [from, ..., to], caps: [captured squares], k (becomes a king) }
// ==========================================
const CK = {};
CK.fresh = function () {
    const b = Array(64).fill('');
    for (let s = 0; s < 64; s++) { const r = s >> 3, c = s & 7; if ((r + c) % 2 === 1) { if (r < 3) b[s] = 'l'; else if (r > 4) b[s] = 'd'; } }
    return { b, d: true, quiet: 0 };
};
const ckSide = p => p ? (p.toLowerCase() === 'd' ? 'd' : 'l') : '';
const ckKing = p => p === 'D' || p === 'L';
function ckDirs(p) { if (ckKing(p)) return [[-1, -1], [-1, 1], [1, -1], [1, 1]]; return ckSide(p) === 'd' ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]]; }
// all jump sequences from s (a man that gets crowned stops there)
function ckJumps(b, s, p, path, caps, out) {
    const [r, c] = [s >> 3, s & 7]; let more = false;
    for (const [dr, dc] of ckDirs(p)) {
        const mr = r + dr, mc = c + dc, tr = r + 2 * dr, tc = c + 2 * dc;
        if (tr < 0 || tr > 7 || tc < 0 || tc > 7) continue;
        const mid = mr * 8 + mc, t = tr * 8 + tc;
        if (!b[mid] || ckSide(b[mid]) === ckSide(p) || b[t] || caps.includes(mid)) continue;
        more = true;
        const crown = !ckKing(p) && (tr === 0 || tr === 7);
        const nb = b.slice(); nb[t] = p; nb[s] = '';
        if (crown) out.push({ path: path.concat(t), caps: caps.concat(mid), k: 1 });
        else ckJumps(nb, t, p, path.concat(t), caps.concat(mid), out);
    }
    if (!more && caps.length) out.push({ path, caps, k: 0 });
}
CK.legal = function (st) {
    const b = st.b, me = st.d ? 'd' : 'l', jumps = [], steps = [];
    for (let s = 0; s < 64; s++) {
        const p = b[s]; if (ckSide(p) !== me) continue;
        ckJumps(b, s, p, [s], [], jumps);
        if (jumps.length) continue;
        const r = s >> 3, c = s & 7;
        for (const [dr, dc] of ckDirs(p)) {
            const rr = r + dr, cc = c + dc; if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
            const t = rr * 8 + cc; if (!b[t]) steps.push({ path: [s, t], caps: [], k: !ckKing(p) && (rr === 0 || rr === 7) ? 1 : 0 });
        }
    }
    return jumps.length ? jumps : steps;
};
CK.make = function (st, m) {
    const b = st.b.slice(), f = m.path[0], t = m.path[m.path.length - 1], p = b[f];
    b[f] = ''; for (const c of m.caps) b[c] = '';
    b[t] = m.k ? p.toUpperCase() : p;
    return { b, d: !st.d, quiet: m.caps.length || !ckKing(p) ? 0 : st.quiet + 1 };
};
CK.play = function (st, m) {
    const n = CK.make(st, m), moves = CK.legal(n);
    let res = null;
    if (!moves.length) res = { win: st.d ? 'd' : 'l', why: n.b.some(p => ckSide(p) === (n.d ? 'd' : 'l')) ? 'No moves left' : 'Every piece taken' };
    else if (n.quiet >= 80) res = { win: 'draw', why: '40 moves each with no jump' };
    return { st: n, res };
};
CK.id = m => m.path.join('-');
// ---- the bot ----
CK.eval = function (st) {
    let s = 0;
    for (let i = 0; i < 64; i++) {
        const p = st.b[i]; if (!p) continue;
        const r = i >> 3, c = i & 7, dark = ckSide(p) === 'd';
        let v = ckKing(p) ? 165 : 100;
        if (!ckKing(p)) v += (dark ? 7 - r : r) * 3;                  // men like to move up
        if (c >= 2 && c <= 5 && r >= 2 && r <= 5) v += 6;             // the centre
        if (!ckKing(p) && (dark ? r === 7 : r === 0)) v += 8;         // the back row guards against kings
        s += dark ? v : -v;
    }
    return st.d ? s : -s;
};
function ckSearch(st, depth, a, beta, ctx, ply) {
    if (ctx.stop || (ctx.n & 1023) === 0 && performance.now() > ctx.until) { ctx.stop = true; return 0; }
    ctx.n++;
    const ms = CK.legal(st);
    if (!ms.length) return -100000 + ply;
    if (st.quiet >= 80) return 0;
    if (depth <= 0 && !ms[0].caps.length) return CK.eval(st);      // jumps are forced: always look one further
    if (depth < -6) return CK.eval(st);
    let best = -Infinity;
    for (const m of ms.sort((x, y) => y.caps.length - x.caps.length)) {
        const v = -ckSearch(CK.make(st, m), depth - 1, -beta, -a, ctx, ply + 1);
        if (v > best) best = v; if (v > a) a = v; if (a >= beta) break;
    }
    return best;
}
CK.botMove = function (st, lv) {
    const ms = CK.legal(st); if (!ms.length) return null;
    if (ms.length === 1) return ms[0];
    if (Math.random() < lv.blunder) return ms[Math.floor(Math.random() * ms.length)];
    const ctx = { n: 0, until: performance.now() + (lv.ms || 1500), stop: false };
    let scored = null;
    for (let d = 1; d <= lv.ckDepth; d++) {
        const res = [];
        for (const m of ms) { const v = -ckSearch(CK.make(st, m), d - 1, -Infinity, Infinity, ctx, 1); if (ctx.stop) break; res.push([m, v]); }
        if (ctx.stop && d > 1) break;
        scored = res; if (ctx.stop) break;
    }
    if (!scored || !scored.length) return ms[0];
    return scored.map(([m, v]) => [m, v + (Math.random() * 2 - 1) * lv.noise * 0.5]).sort((x, y) => y[1] - x[1])[0][0];
};
