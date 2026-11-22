// ==========================================
// TIC-TAC-TOE: three in a row. Against a friend or the bot (who is good, not perfect).
//   Classic: one 3x3 board, best of five rounds (first to 3).
//   Ultimate (2026-11-21): nine small boards in a big one. Where you play inside a small board sends your opponent to
//   the matching small board; win a small board to claim that square of the big one; three big squares in a row wins.
//   Sent to a board that is already won or full = play anywhere. Best of three (first to 2).
// The host picks the mode in the lobby (saved as hgmini_t3mode); every state message carries it.
// ==========================================
const T3 = { mode: 'classic', b: Array(9).fill(-1), big: Array(9).fill(-1), next: -1, last: -1, turn: 0, ids: [0, 0], over: false, line: null, wins: [0, 0], round: 0, first: 0 };
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const T3_MODES = { classic: { n: 'Classic', need: 3, rounds: 5 }, ultimate: { n: 'Ultimate', need: 2, rounds: 3 } };
document.getElementById('app').innerHTML = '<div class="mg-hud"><span id="t3-a"></span><span id="t3-t"></span><span id="t3-b"></span></div><div id="t3"></div>';
const box = document.getElementById('t3');
const ult = () => T3.mode === 'ultimate';
function layout() {
    box.className = ult() ? 'ult' : '';
    box.innerHTML = ult()
        ? Array.from({ length: 9 }, (_, B) => `<div class="t3B" data-b="${B}">${Array.from({ length: 9 }, (_, c) => `<button class="t3c" data-i="${B * 9 + c}"></button>`).join('')}<div class="t3W"></div></div>`).join('')
        : Array.from({ length: 9 }, (_, i) => `<button class="t3c" data-i="${i}"></button>`).join('');
    box.dataset.mode = T3.mode;
}
const winner = b => { for (const l of LINES) if (b[l[0]] >= 0 && b[l[0]] < 2 && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return l; return null; };
// ---- classic bot: minimax
function mmT(b, who, me) {
    const w = winner(b); if (w) return [b[w[0]] === me ? 10 : -10, -1];
    const free = b.map((v, i) => v < 0 ? i : -1).filter(i => i >= 0); if (!free.length) return [0, -1];
    let best = who === me ? -99 : 99, bi = free[0];
    for (const i of free) { b[i] = who; const v = mmT(b, 1 - who, me)[0] * 0.9; b[i] = -1; if (who === me ? v > best : v < best) { best = v; bi = i; } }
    return [best, bi];
}
// ---- ultimate rules (pure: used by the host, the bot and the tests)
const sub = (b, B) => b.slice(B * 9, B * 9 + 9);
function uLegal(s) {
    const out = [], open = B => s.big[B] < 0;
    const boards = s.next >= 0 && open(s.next) ? [s.next] : [0, 1, 2, 3, 4, 5, 6, 7, 8].filter(open);
    for (const B of boards) for (let c = 0; c < 9; c++) if (s.b[B * 9 + c] < 0) out.push(B * 9 + c);
    return out;
}
function uPlay(s, i, side) {      // returns a new state
    const b = s.b.slice(), big = s.big.slice(), B = Math.floor(i / 9), c = i % 9;
    b[i] = side;
    if (big[B] < 0) { const sb = sub(b, B); if (winner(sb)) big[B] = side; else if (sb.every(v => v >= 0)) big[B] = 2; }
    return { b, big, next: big[c] < 0 ? c : -1, last: i };
}
const uDone = s => !!winner(s.big) || s.big.every(v => v >= 0) || !uLegal(s).length;
// ---- ultimate bot: two moves deep with a board heuristic, plus a little randomness so it is beatable
function uLineScore(cells, me) {
    let v = 0;
    for (const l of LINES) {
        let m = 0, o = 0, dead = false;
        for (const k of l) { const x = cells[k]; if (x === me) m++; else if (x === 1 - me) o++; else if (x === 2) dead = true; }
        if (dead || (m && o)) continue;
        v += m === 2 ? 6 : m === 1 ? 1 : 0; v -= o === 2 ? 6 : o === 1 ? 1 : 0;
    }
    return v;
}
function uEval(s, me) {
    const w = winner(s.big); if (w) return s.big[w[0]] === me ? 10000 : -10000;
    if (s.big.every(v => v >= 0)) return 0;
    let v = uLineScore(s.big, me) * 30;
    for (let B = 0; B < 9; B++) {
        if (s.big[B] === me) v += B === 4 ? 40 : 25; else if (s.big[B] === 1 - me) v -= B === 4 ? 40 : 25;
        else if (s.big[B] < 0) v += uLineScore(sub(s.b, B), me) * (B === 4 ? 1.5 : 1);
    }
    return v;
}
function uBot(side) {
    const s0 = { b: T3.b, big: T3.big, next: T3.next }, moves = uLegal(s0);
    if (!moves.length) return -1;
    if (Math.random() < 0.08) return moves[Math.floor(Math.random() * moves.length)];
    let best = -Infinity, pick = moves[0];
    for (const m of moves) {
        const s1 = uPlay(s0, m, side); let v;
        if (uDone(s1)) v = uEval(s1, side);
        else {
            let worst = Infinity; const rep = uLegal(s1);
            for (const r of rep) { const e = uEval(uPlay(s1, r, 1 - side), side); if (e < worst) worst = e; if (worst <= -10000) break; }
            v = worst - (s1.next < 0 ? 15 : 0);      // sending them to "anywhere" is a gift
        }
        v += Math.random() * 4;
        if (v > best) { best = v; pick = m; }
    }
    return pick;
}
function botPick(side) {
    if (ult()) return uBot(side);
    const free = T3.b.map((v, i) => v < 0 ? i : -1).filter(i => i >= 0); if (Math.random() < 0.18) return free[Math.floor(Math.random() * free.length)]; return mmT(T3.b.slice(), side, side)[1];
}
// ---- the host runs the match
const stMsg = () => ({ k: 'st', mode: T3.mode, b: T3.b, big: T3.big, next: T3.next, last: T3.last, turn: T3.turn, line: T3.line, over: T3.over, wins: T3.wins, round: T3.round });
function hostMove(from, i) {
    if (T3.over) return; const side = T3.ids.indexOf(from); if (side !== T3.turn || !(i >= 0)) return;
    let line, full;
    if (ult()) {
        if (uLegal(T3).indexOf(i) < 0) return;
        Object.assign(T3, uPlay(T3, i, side));
        line = winner(T3.big); full = !line && uDone(T3);
    } else {
        if (T3.b[i] >= 0) return;
        T3.b[i] = side; T3.last = i; line = winner(T3.b); full = T3.b.every(v => v >= 0);
    }
    T3.line = line; T3.over = !!line || full;
    if (line) T3.wins[side]++; if (!T3.over) T3.turn = 1 - T3.turn;
    const m = stMsg(); MG.toAll(m); onState(m);
    if (T3.over) setTimeout(() => {
        const M = T3_MODES[T3.mode], done = T3.wins[0] >= M.need || T3.wins[1] >= M.need || T3.round >= M.rounds;
        if (done) { const a = MG.player(T3.ids[0]), b = MG.player(T3.ids[1]), w = T3.wins[0] === T3.wins[1] ? null : T3.wins[0] > T3.wins[1] ? a : b;
            MG.end(`<h1>${w ? mgEsc(w.name) + ' wins!' : 'A draw'}</h1><div class="mg-sub">${M.n} Tic-Tac-Toe</div><div class="mg-res-row"><span>✕ ${mgEsc(a.name)}</span><b>${T3.wins[0]}</b></div><div class="mg-res-row"><span>◯ ${mgEsc(b.name)}</span><b>${T3.wins[1]}</b></div>`); }
        else newRound();
    }, ult() ? 2200 : 1400);
    else botTurn();
}
function newRound() {
    T3.round++; T3.b = Array(ult() ? 81 : 9).fill(-1); T3.big = Array(9).fill(-1); T3.next = -1; T3.last = -1;
    T3.first = 1 - T3.first; T3.turn = T3.first; T3.over = false; T3.line = null;
    const m = stMsg(); MG.toAll(m); onState(m); botTurn();
}
function botTurn() { const p = MG.player(T3.ids[T3.turn]); if (p && p.bot && !T3.over) setTimeout(() => hostMove(p.id, botPick(T3.turn)), (ult() ? 550 : 450) + Math.random() * 400); }
// ---- drawing
const mark = v => v === 0 ? '✕' : v === 1 ? '◯' : '';
function onState(m) {
    const was = T3.mode, prevLast = T3.last;
    Object.assign(T3, { mode: m.mode || 'classic', b: m.b, big: m.big || Array(9).fill(-1), next: m.next == null ? -1 : m.next, last: m.last == null ? -1 : m.last, turn: m.turn, line: m.line, over: m.over, wins: m.wins, round: m.round });
    if (was !== T3.mode || box.querySelectorAll('.t3c').length !== T3.b.length) layout();
    const mine = T3.ids[T3.turn] === MG.me && !T3.over, legal = ult() && mine ? new Set(uLegal(T3)) : null;
    box.querySelectorAll('.t3c').forEach((el, i) => {
        const v = m.b[i]; el.textContent = mark(v);
        el.className = 't3c' + (v >= 0 ? ' p' + v : '') + (!ult() && m.line && m.line.includes(i) ? ' win' : '') + (i === T3.last ? ' last' : '') + (legal && legal.has(i) ? ' ok' : '');
    });
    if (ult()) box.querySelectorAll('.t3B').forEach((el, B) => {
        const g = T3.big[B], live = !T3.over && g < 0 && (T3.next < 0 || T3.next === B);
        el.className = 't3B' + (g === 0 || g === 1 ? ' won p' + g : g === 2 ? ' tie' : '') + (live ? ' live' + (mine ? ' mine' : '') : '') + (m.line && m.line.includes(B) ? ' win' : '');
        el.querySelector('.t3W').textContent = g === 0 || g === 1 ? mark(g) : '';
    });
    const a = MG.player(T3.ids[0]), b = MG.player(T3.ids[1]), t = MG.player(T3.ids[T3.turn]), M = T3_MODES[T3.mode];
    document.getElementById('t3-a').textContent = '✕ ' + (a ? a.name : '') + ' · ' + m.wins[0]; document.getElementById('t3-b').textContent = '◯ ' + (b ? b.name : '') + ' · ' + m.wins[1];
    const where = ult() && !m.over ? (T3.next >= 0 ? ' · play in the lit board' : ' · play anywhere') : '';
    document.getElementById('t3-t').textContent = m.over ? (m.line ? 'Round to ' + (MG.player(T3.ids[ult() ? T3.big[m.line[0]] : m.b[m.line[0]]]) || {}).name : 'Draw round')
        : (ult() ? 'Ultimate · ' : '') + 'Round ' + m.round + ' of ' + M.rounds + ' · ' + (T3.ids[T3.turn] === MG.me ? 'your turn' : (t ? t.name + '’s turn' : '')) + (T3.ids[T3.turn] === MG.me ? where : '');
    if (T3.last !== prevLast || m.line) MGS.blip();
    if (m.line) (T3.ids[ult() ? T3.big[m.line[0]] : m.b[m.line[0]]] === MG.me ? MGS.win : MGS.lose)();
}
box.addEventListener('click', e => { const c = e.target.closest('.t3c'); if (c && T3.ids[T3.turn] === MG.me && !T3.over) MG.toHost({ k: 'mv', i: +c.dataset.i }); });
// ---- lobby: Classic or Ultimate (the host's choice is the one that is played)
function t3LobbyExtras() {
    const card = document.querySelector('#mg-lobby .mg-card'); if (!card || document.getElementById('t3-pick')) return;
    T3.mode = mgLs('hgmini_t3mode') === 'ultimate' ? 'ultimate' : 'classic';
    const d = document.createElement('div'); d.id = 't3-pick'; d.className = 'mg-row';
    d.innerHTML = '<button class="mg-btn" data-mode="classic">#&#xFE0F;&#x20E3; Classic</button><button class="mg-btn" data-mode="ultimate">&#x1F532; Ultimate</button><div class="mg-sub" id="t3-mdesc"></div>';
    card.insertBefore(d, card.querySelector('.mg-row'));
    const paint = () => {
        d.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === T3.mode));
        document.getElementById('t3-mdesc').innerHTML = T3.mode === 'ultimate'
            ? '<b>Ultimate:</b> nine boards in one. The square you pick sends your opponent to that board. Win small boards to take big squares; three big squares in a row wins. First to 2 games.'
            : '<b>Classic:</b> one board, three in a row. First to 3 rounds.';
    };
    d.onclick = e => { const b = e.target.closest('[data-mode]'); if (!b) return; T3.mode = b.dataset.mode; mgLs('hgmini_t3mode', T3.mode); paint(); };
    paint();
}
MG.init({
    id: 'mg-tictactoe', title: 'Tic-Tac-Toe', color: '#2dd4bf', min: 2, max: 2, bots: 1, defBots: 1,
    sub: 'Three in a row, or the Ultimate version: nine boards in one.', howto: 'Click a square on your turn. Pick <b>Classic</b> or <b>Ultimate</b> below (the host’s pick is played). Rounds alternate who starts.',
    onStart(roster) { T3.ids = [roster[0].id, roster[1].id]; T3.wins = [0, 0]; T3.round = 0; T3.first = Math.random() < 0.5 ? 1 : 0; if (MG.isHost()) { T3.mode = mgLs('hgmini_t3mode') === 'ultimate' ? 'ultimate' : 'classic'; layout(); newRound(); } },
    onMsg(from, m) { if (m.k === 'mv' && MG.isHost()) hostMove(from, m.i); else if (m.k === 'st' && !MG.isHost()) onState(m); },
    onLeave() { if (!T3.over && MG.isHost()) { T3.over = true; MG.end('<h1>Your opponent left</h1>'); } }
});
t3LobbyExtras(); layout();
// tests: window.__t3.sim(n) plays n bot-vs-bot ultimate games with the rules above and returns the results
window.__t3 = { T3, me: () => MG.me, uLegal, uPlay, uDone, uBot, winner, state: () => ({ mode: T3.mode, over: T3.over, round: T3.round, wins: T3.wins.slice(), next: T3.next, big: T3.big.slice(), n: T3.b.filter(v => v >= 0).length }) };
