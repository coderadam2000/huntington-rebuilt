// ==========================================
// CHESS AND CHECKERS: the table. Pick a game and a bot in the lobby, or open a room and play a friend.
// Ranked: every finished game (against a bot or a friend) moves your rating (Elo) for that game. Bots have ratings too.
// Ranks by rating: Rookie, Contender, Veteran, Elite, Master, Grandmaster, Legendary, Unreal.
// Save (synced by the launcher, prefix hgmini_): hgmini_cc = { chess: { elo, peak, w, l, d, n }, checkers: {...}, mode, bot }
// ==========================================
const CC = { mode: 'chess', st: null, ids: [], sides: {}, over: false, res: null, sel: -1, moves: [], last: null, hist: [], flip: false, bot: 2, elo: {}, rated: false, promo: null, gid: '' };
const CC_RANKS = [[0, 'Rookie', '#a3a3a3'], [800, 'Contender', '#4ade80'], [1000, 'Veteran', '#38bdf8'], [1200, 'Elite', '#a78bfa'], [1400, 'Master', '#f472b6'], [1700, 'Grandmaster', '#fb923c'], [2000, 'Legendary', '#facc15'], [2300, 'Unreal', '#f43f5e']];
// the bots: their rating, and how hard they think (chess depth / checkers depth, randomness, chance of a careless move)
const CC_BOTS = [
    { n: 'Rookie bot', elo: 500, depth: 1, q: false, noise: 160, blunder: 0.35, ckDepth: 1 },
    { n: 'Contender bot', elo: 850, depth: 1, q: true, noise: 70, blunder: 0.15, ckDepth: 2 },
    { n: 'Veteran bot', elo: 1050, depth: 2, q: true, noise: 45, blunder: 0.07, ckDepth: 3 },
    { n: 'Elite bot', elo: 1250, depth: 2, q: true, noise: 20, blunder: 0.03, ckDepth: 4 },
    { n: 'Master bot', elo: 1500, depth: 3, q: true, noise: 12, blunder: 0.01, ckDepth: 6 },
    { n: 'Grandmaster bot', elo: 1800, depth: 3, q: true, noise: 4, blunder: 0, ckDepth: 7 },
    { n: 'Legendary bot', elo: 2100, depth: 4, q: true, noise: 2, blunder: 0, ckDepth: 8, ms: 2200 },
    { n: 'Unreal bot', elo: 2400, depth: 5, q: true, noise: 0, blunder: 0, ckDepth: 10, ms: 3200 }
];
function ccRank(elo) { let r = CC_RANKS[0]; for (const x of CC_RANKS) if (elo >= x[0]) r = x; return r; }
function ccRankHtml(elo) { const r = ccRank(elo); return `<span class="cc-rank" style="--rc:${r[2]}">${r[1]}</span>`; }
function ccSave() { let s = null; try { s = JSON.parse(mgLs('hgmini_cc') || 'null'); } catch (e) {} s = s && typeof s === 'object' ? s : {};
    for (const g of ['chess', 'checkers']) s[g] = Object.assign({ elo: 600, peak: 600, w: 0, l: 0, d: 0, n: 0 }, s[g] || {}); return s; }
function ccWrite(s) { mgLs('hgmini_cc', JSON.stringify(s)); }
// Elo: K = 40 for your first 20 games of a kind, 24 after. score 1 win, 0.5 draw, 0 loss.
function ccRate(game, oppElo, score) {
    const s = ccSave(), me = s[game], exp = 1 / (1 + Math.pow(10, (oppElo - me.elo) / 400)), K = me.n < 20 ? 40 : 24;
    const delta = Math.round(K * (score - exp));
    me.elo = Math.max(100, me.elo + delta); me.peak = Math.max(me.peak, me.elo); me.n++;
    if (score === 1) me.w++; else if (score === 0) me.l++; else me.d++;
    ccWrite(s); return { delta, elo: me.elo };
}
const isChess = () => CC.mode === 'chess';
const ENG = () => isChess() ? CH : CK;
// which side a player id is: chess 'w'/'b', checkers 'd'/'l'; who moves now
const ccTurnSide = () => isChess() ? (CC.st.w ? 'w' : 'b') : (CC.st.d ? 'd' : 'l');
const ccTurnId = () => CC.sides[ccTurnSide()];
const ccMySide = () => Object.keys(CC.sides).find(k => CC.sides[k] === MG.me);
// ---- the page ----
document.getElementById('app').innerHTML = `
  <div id="cc-wrap"><div id="cc-boardbox"><div id="cc-top" class="cc-pl"></div><div id="cc-board"></div><div id="cc-bot" class="cc-pl"></div></div>
  <div id="cc-side"><div id="cc-title"></div><div id="cc-status"></div>
    <div class="cc-btns"><button class="mg-btn sm" id="cc-flip">Flip board</button><button class="mg-btn sm" id="cc-resign">Resign</button></div>
    <div id="cc-moves"></div><div id="cc-me"></div></div></div>
  <div id="cc-promo" class="hidden"></div>`;
const PIECE = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };
function ccDraw() {
    const box = document.getElementById('cc-board'); if (!CC.st) return;
    const flip = CC.flip, b = CC.st.b, chkK = isChess() && CH.inCheck(CC.st) ? CH.kingSq(b, CC.st.w) : -1;
    const targets = CC.sel >= 0 ? CC.moves.filter(m => (isChess() ? m.f : m.path[0]) === CC.sel) : [];
    const tset = new Set(targets.map(m => isChess() ? m.t : m.path[m.path.length - 1]));
    const lastSq = CC.last ? (isChess() ? [CC.last.f, CC.last.t] : CC.last.path) : [];
    const mine = !CC.over && ccTurnId() === MG.me;
    const movable = new Set(mine ? CC.moves.map(m => isChess() ? m.f : m.path[0]) : []);
    let h = '';
    for (let i = 0; i < 64; i++) {
        const s = flip ? 63 - i : i, r = s >> 3, c = s & 7, dark = (r + c) % 2 === 1, p = b[s];
        let cls = 'cc-sq ' + (dark ? 'dk' : 'lt') + (isChess() ? '' : ' ck');
        if (lastSq.includes(s)) cls += ' last'; if (s === CC.sel) cls += ' sel'; if (s === chkK) cls += ' chk'; if (tset.has(s)) cls += p ? ' tgt cap' : ' tgt'; if (movable.has(s)) cls += ' can';
        let inner = '';
        if (p) {
            if (isChess()) inner = `<span class="pc ${chWhite(p) ? 'w' : 'b'}">${PIECE[p.toUpperCase()]}</span>`;
            else inner = `<span class="ckp ${ckSide(p)}${ckKing(p) ? ' king' : ''}">${ckKing(p) ? '♛' : ''}</span>`;
        }
        const lab = (c === (flip ? 7 : 0) ? `<i class="rk">${8 - r}</i>` : '') + (r === (flip ? 0 : 7) ? `<i class="fl">${'abcdefgh'[c]}</i>` : '');
        h += `<div class="${cls}" data-s="${s}">${inner}${lab}</div>`;
    }
    box.innerHTML = h;
    ccPlayers(); ccStatus(); ccMoveList();
}
function ccName(id) { const p = MG.player(id); return p ? p.name : '?'; }
function ccPlayers() {
    const sides = isChess() ? ['w', 'b'] : ['d', 'l'], bottom = CC.flip ? sides[1] : sides[0], top = CC.flip ? sides[0] : sides[1];
    const card = side => { const id = CC.sides[side], e = CC.elo[id], turn = !CC.over && ccTurnSide() === side;
        const dot = isChess() ? `<span class="cc-dot ${side}"></span>` : `<span class="cc-dot ck ${side}"></span>`;
        return `${dot}<b>${mgEsc(ccName(id))}</b>${e ? ` <span class="cc-elo">${e}</span> ${ccRankHtml(e)}` : ''}${turn ? '<span class="cc-turn">to move</span>' : ''}`; };
    document.getElementById('cc-top').innerHTML = card(top); document.getElementById('cc-bot').innerHTML = card(bottom);
}
function ccStatus() {
    const el = document.getElementById('cc-status');
    document.getElementById('cc-title').textContent = (isChess() ? 'Chess' : 'Checkers') + (CC.rated ? ' · ranked' : '');
    if (CC.over && CC.res) { el.innerHTML = `<b>${CC.res.win === 'draw' ? 'Draw' : mgEsc(ccName(CC.sides[CC.res.win])) + ' wins'}</b><br>${mgEsc(CC.res.why)}`; return; }
    const id = ccTurnId(), mine = id === MG.me;
    el.innerHTML = mine ? '<b>Your move</b>' + (isChess() && CH.inCheck(CC.st) ? ' <span class="cc-check">Check!</span>' : '') + (!isChess() && CC.moves[0] && CC.moves[0].caps.length ? '<br><small>You must jump.</small>' : '')
        : `${mgEsc(ccName(id))} is thinking...`;
}
function ccMoveList() {
    const el = document.getElementById('cc-moves'); let h = '';
    for (let i = 0; i < CC.hist.length; i += 2) h += `<div><i>${i / 2 + 1}.</i> ${mgEsc(CC.hist[i])} ${CC.hist[i + 1] ? mgEsc(CC.hist[i + 1]) : ''}</div>`;
    el.innerHTML = h; el.scrollTop = el.scrollHeight;
}
function ccMeBox() {
    const s = ccSave(), g = s[CC.mode], el = document.getElementById('cc-me');
    if (el) el.innerHTML = `<div class="cc-mlbl">Your ${isChess() ? 'chess' : 'checkers'} rating</div><div class="cc-mbig">${g.elo} ${ccRankHtml(g.elo)}</div><small>${g.w} won · ${g.l} lost · ${g.d} drawn · best ${g.peak}</small>`;
}
// ---- input ----
document.getElementById('cc-board').addEventListener('pointerdown', e => {
    const sq = e.target.closest('.cc-sq'); if (!sq || CC.over || ccTurnId() !== MG.me) return;
    const s = +sq.dataset.s;
    const pick = CC.moves.filter(m => (isChess() ? m.f : m.path[0]) === CC.sel && (isChess() ? m.t : m.path[m.path.length - 1]) === s);
    if (pick.length) {
        if (isChess() && pick.length > 1 && pick[0].p) { ccAskPromo(pick); return; }
        ccSend(pick[0]); return;
    }
    CC.sel = CC.moves.some(m => (isChess() ? m.f : m.path[0]) === s) ? s : -1; MGS.blip && MGS.blip(); ccDraw();
});
function ccAskPromo(opts) {
    const box = document.getElementById('cc-promo'), w = CC.st.w;
    box.innerHTML = '<div class="mg-sub">Promote to</div>' + ['Q', 'R', 'B', 'N'].map(q => `<button class="cc-pq" data-q="${q}"><span class="pc ${w ? 'w' : 'b'}">${PIECE[q]}</span></button>`).join('');
    box.classList.remove('hidden');
    box.onclick = e => { const b = e.target.closest('[data-q]'); if (!b) return; box.classList.add('hidden'); ccSend(opts.find(m => m.p === b.dataset.q)); };
}
function ccSend(m) { CC.sel = -1; MG.toHost({ k: 'mv', id: ENG().id(m), g: CC.gid }); }
document.getElementById('cc-flip').onclick = () => { CC.flip = !CC.flip; ccDraw(); };
document.getElementById('cc-resign').onclick = () => { if (CC.over || !ccMySide()) return; if (!confirm('Resign this game?')) return; MG.toHost({ k: 'resign', g: CC.gid }); };
addEventListener('keydown', e => { if (e.key === 'f' && CC.st && !e.target.closest('input')) { CC.flip = !CC.flip; ccDraw(); } });
// ---- the host runs the game ----
function ccHostMove(from, mid) {
    if (CC.over || from !== ccTurnId()) return;
    const m = CC.moves.find(x => ENG().id(x) === mid); if (!m) return;
    const san = isChess() ? CH.san(CC.st, m) : mid.replace(/(\d+)/g, n => ckName(+n)).replace(/-/g, m.caps.length ? 'x' : '-');
    const r = ENG().play(CC.st, m);
    const msg = { k: 'st', st: r.st, last: m, san, res: r.res, g: CC.gid };
    MG.toAll(msg); ccOnState(msg);
}
const ckName = s => { const r = s >> 3, c = s & 7; return String(r * 4 + (c >> 1) + 1); };      // the usual 1-32 numbering
function ccBotTurn() {
    if (!MG.isHost() || CC.over) return;
    const p = MG.player(ccTurnId()); if (!p || !p.bot) return;
    const lv = CC_BOTS[CC.bot], st = CC.st, g = CC.gid;
    setTimeout(() => { if (CC.gid !== g || CC.over) return; const m = ENG().botMove(st, lv); if (m) ccHostMove(p.id, ENG().id(m)); }, 350 + Math.random() * 400);
}
function ccOnState(m) {
    if (m.g !== CC.gid) return;
    CC.st = m.st; CC.last = m.last; if (m.san) CC.hist.push(m.san);
    CC.moves = m.res ? [] : ENG().legal(CC.st); CC.sel = -1;
    if (m.res) ccFinish(m.res);
    if (MGS.blip) MGS.blip();
    ccDraw(); ccBotTurn();
}
function ccFinish(res) {
    if (CC.over) return; CC.over = true; CC.res = res;
    const mySide = ccMySide(); let line = '';
    if (CC.rated && mySide) {      // each player rates their own game
        const oppId = Object.values(CC.sides).find(id => id !== MG.me), opp = CC.elo[oppId] || 600;
        const score = res.win === 'draw' ? 0.5 : res.win === mySide ? 1 : 0;
        const r = ccRate(CC.mode, opp, score);
        line = `<p class="mg-sub">Your ${isChess() ? 'chess' : 'checkers'} rating: <b>${r.elo}</b> (${r.delta >= 0 ? '+' : ''}${r.delta}) ${ccRankHtml(r.elo)}</p>`;
        try { const p = window.parent; if (p && p !== window && p.feedNow) setTimeout(() => p.feedNow(), 500); } catch (e) {}
    }
    ccMeBox();
    if (MG.isHost()) setTimeout(() => {
        const head = res.win === 'draw' ? 'Draw!' : mgEsc(ccName(CC.sides[res.win])) + ' wins!';
        MG.end(`<h1>${head}</h1><p class="mg-sub">${mgEsc(res.why)}</p><div id="cc-endrate"></div>`);
    }, 1600);
    CC.endLine = line;
}
// ---- lobby extras: which game, which bot, your ratings ----
function ccLobbyExtras() {
    const card = document.querySelector('#mg-lobby .mg-card'); if (!card || document.getElementById('cc-pick')) return;
    const s = ccSave(); CC.mode = s.mode === 'checkers' ? 'checkers' : 'chess'; CC.bot = Math.max(0, Math.min(7, s.bot | 0 || 2));
    const d = document.createElement('div'); d.id = 'cc-pick';
    d.innerHTML = `<div class="mg-row cc-modes"><button class="mg-btn" data-mode="chess">♞ Chess</button><button class="mg-btn" data-mode="checkers">⛂ Checkers</button></div>
      <div class="mg-row"><label>Bot <select id="cc-botsel">${CC_BOTS.map((b, i) => `<option value="${i}">${b.n} (${b.elo})</option>`).join('')}</select></label></div>
      <div id="cc-myrate" class="mg-sub"></div>`;
    card.insertBefore(d, card.querySelector('.mg-row'));
    const paint = () => { d.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === CC.mode));
        const s2 = ccSave(); document.getElementById('cc-myrate').innerHTML = `Your ratings: chess <b>${s2.chess.elo}</b> ${ccRankHtml(s2.chess.elo)} · checkers <b>${s2.checkers.elo}</b> ${ccRankHtml(s2.checkers.elo)}<br><small>Every finished game is ranked. Bot ratings are estimates.</small>`; };
    d.onclick = e => { const b = e.target.closest('[data-mode]'); if (!b) return; CC.mode = b.dataset.mode; const s2 = ccSave(); s2.mode = CC.mode; ccWrite(s2); paint(); };
    const sel = document.getElementById('cc-botsel'); sel.value = CC.bot;
    sel.onchange = () => { CC.bot = +sel.value; const s2 = ccSave(); s2.bot = CC.bot; ccWrite(s2); };
    sel.onkeydown = e => e.stopPropagation();
    paint();
}
MG.init({
    id: 'mg-chess', title: 'Chess and Checkers', color: '#d4a373', min: 2, max: 2, bots: 1, defBots: 1,
    sub: 'Two classic board games. Play a bot or a friend; every game moves your rating.',
    howto: 'Click a piece, then where it goes. Ranks: Rookie, Contender, Veteran, Elite, Master, Grandmaster, Legendary, Unreal. Press <b>F</b> to flip the board.',
    onStart(roster, seed) {
        CC.over = false; CC.res = null; CC.hist = []; CC.last = null; CC.sel = -1; CC.endLine = '';
        document.getElementById('cc-promo').classList.add('hidden');
        if (MG.isHost()) {
            const order = Math.random() < 0.5 ? [0, 1] : [1, 0], ids = [roster[order[0]].id, roster[order[1]].id];
            const sides = CC.mode === 'chess' ? { w: ids[0], b: ids[1] } : { d: ids[0], l: ids[1] };
            const elo = {}; const mine = ccSave()[CC.mode].elo;
            for (const r of roster) elo[r.id] = r.bot ? CC_BOTS[CC.bot].elo : r.id === MG.me ? mine : 0;
            const m = { k: 'start', mode: CC.mode, sides, elo, bot: CC.bot, g: String(seed || Date.now()) };
            MG.toAll(m); ccStart(m);
        }
    },
    onMsg(from, m) {
        if (m.k === 'start') ccStart(m);
        else if (m.k === 'st') ccOnState(m);
        else if (m.k === 'elo') { if (MG.isHost() && m.g === CC.gid) { CC.elo[from] = Math.max(100, Math.min(4000, m.v | 0)); MG.toAll({ k: 'elos', elo: CC.elo, g: CC.gid }); ccDraw(); } }
        else if (m.k === 'elos') { if (m.g === CC.gid) { CC.elo = m.elo; ccDraw(); } }
        else if (m.k === 'mv' && MG.isHost() && m.g === CC.gid) ccHostMove(from, m.id);
        else if (m.k === 'resign' && MG.isHost() && m.g === CC.gid && !CC.over) {
            const side = Object.keys(CC.sides).find(k => CC.sides[k] === from); if (!side) return;
            const win = Object.keys(CC.sides).find(k => k !== side);
            const msg = { k: 'st', st: CC.st, last: CC.last, res: { win, why: ccName(from) + ' resigned' }, g: CC.gid }; MG.toAll(msg); ccOnState(msg);
        }
    },
    onLeave(id) {
        if (!CC.over && MG.isHost() && Object.values(CC.sides).includes(id)) {
            const side = Object.keys(CC.sides).find(k => CC.sides[k] === id), win = Object.keys(CC.sides).find(k => k !== side);
            const msg = { k: 'st', st: CC.st, last: CC.last, res: { win, why: 'Your opponent left' }, g: CC.gid }; MG.toAll(msg); ccOnState(msg);
        }
    },
    onEnd() { setTimeout(() => { const el = document.getElementById('cc-endrate'); if (el && CC.endLine) el.innerHTML = CC.endLine; }, 0); }
});
function ccStart(m) {
    CC.mode = m.mode; CC.sides = m.sides; CC.elo = m.elo || {}; CC.bot = m.bot; CC.gid = m.g;
    CC.over = false; CC.res = null; CC.hist = []; CC.last = null; CC.sel = -1;
    CC.st = ENG().fresh(); CC.moves = ENG().legal(CC.st);
    CC.rated = !!ccMySide();
    const my = ccMySide(); CC.flip = my === 'b' || my === 'l';
    if (my && !MG.isHost()) { CC.elo[MG.me] = ccSave()[CC.mode].elo; MG.toHost({ k: 'elo', v: CC.elo[MG.me], g: CC.gid }); }
    ccMeBox(); ccDraw(); ccBotTurn();
}
ccLobbyExtras();
window.__cc = { CC, CH, CK, CC_BOTS, ccRank, ccSave, ccRate, state: () => ({ mode: CC.mode, over: CC.over, res: CC.res, turn: CC.st && ccTurnSide(), me: ccMySide(), moves: CC.moves.length, hist: CC.hist.slice() }),
    move: id => ccSend(CC.moves.find(m => ENG().id(m) === id)), ids: () => CC.moves.map(m => ENG().id(m)) };
