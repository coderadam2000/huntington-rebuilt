const BOT_RATING = [700, 1100, 1500];
const MODE_NAMES = { chess: 'Chess', checkers: 'Checkers' };
const CHESS_SYMBOLS = ['','♟','♞','♝','♜','♛','♚'];
const CHESS_NAMES = ['', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
const RANKS = ['Rookie','Contender','Veteran','Elite','Master','Grandmaster','Legendary','Unreal'];
const RECORD_KEY = 'hgmini_board_ratings';
const $board = id => document.getElementById(id);
let match, selected = -1, botTimer, recorded;

function recordFor(mode) {
    let data;
    try { data = JSON.parse(localStorage.getItem(RECORD_KEY) || '{}'); } catch (_) { data = {}; }
    return { data, entry: Object.assign({ elo: 1000, wins: 0, games: 0 }, data?.[mode]) };
}
function paintRecord() {
    const { entry } = recordFor($board('board-mode').value);
    const rank = RANKS[Math.max(0, Math.min(7, Math.floor((entry.elo - 1000) / 150)))];
    $board('board-records').textContent = rank + ' · ' + entry.elo + ' local Elo · ' + entry.wins + ' wins';
}
function saveResult() {
    if (recorded || !match?.result) return;
    recorded = true;
    const { data, entry } = recordFor(match.state.game);
    const win = match.result.win === mySide(), tie = !match.result.win;
    entry.games++;
    if (win) entry.wins++;
    if (MG.roster.some(person => person.bot)) {
        const expected = 1 / (1 + Math.pow(10, (BOT_RATING[match.difficulty] - entry.elo) / 400));
        entry.elo = Math.max(100, Math.round(entry.elo + 28 * ((tie ? 0.5 : win ? 1 : 0) - expected)));
    }
    try { localStorage.setItem(RECORD_KEY, JSON.stringify({ ...data, [match.state.game]: entry })); } catch (_) {}
    paintRecord();
}
function playerFor(side) { return MG.roster[side === 1 ? 0 : 1]; }
function mySide() { return playerFor(1)?.id === MG.me ? 1 : -1; }
const coordinate = i => 'abcdefgh'[i % 8] + (8 - (i >> 3));
function boardPaint() {
    if (!match) return;
    const { state, result } = match, chess = state.game === 'chess';
    const candidates = state.turn === mySide() && !result ? legalBoard(state) : [];
    if (state.chain >= 0 && candidates.length) selected = state.chain;
    const legal = new Set(candidates.filter(m => m.from === selected).map(m => m.to));
    const grid = $board('board'), nodes = document.createDocumentFragment();
    for (let cell = 0; cell < 64; cell++) {
        const i = mySide() === -1 ? 63 - cell : cell, p = state.board[i], tile = document.createElement('button');
        const kind = chess ? CHESS_NAMES[Math.abs(p)] : Math.abs(p) === 2 ? 'king' : 'piece';
        tile.type = 'button';
        tile.className = 'square' + ((i % 8 + (i >> 3)) % 2 ? ' dark' : '') + (p > 0 ? ' white' : '') +
            (i === selected ? ' selected' : '') + (legal.has(i) ? ' target' : '');
        tile.textContent = chess ? CHESS_SYMBOLS[Math.abs(p)] : p ? Math.abs(p) === 2 ? '◉' : '●' : '';
        tile.setAttribute('aria-label', coordinate(i) + (p ? ' ' + (p > 0 ? 'light ' : 'dark ') + kind : ' empty'));
        tile.onclick = () => {
            const move = candidates.find(m => m.from === selected && m.to === i &&
                (!m.promotion || !chess || m.promotion === Number($board('piece').value)));
            if (move) MG.toHost({ kind: 'move', ...move, ply: state.ply });
            else { selected = candidates.some(m => m.from === i) ? i : -1; boardPaint(); }
        };
        nodes.appendChild(tile);
    }
    grid.replaceChildren(nodes);
    $board('game-name').textContent = MODE_NAMES[state.game];
    $board('promotion').hidden = !chess;
    const opponent = playerFor(-mySide());
    const check = chess && attacked(state.board, state.board.indexOf(6 * state.turn), -state.turn);
    $board('game-status').textContent = result ? result.reason + (result.win ? ' · ' + playerFor(result.win)?.name + ' wins' : '') :
        (state.turn === mySide() ? 'Your turn' : playerFor(state.turn)?.name + ' to move') +
        (check ? ' · Check' : state.chain >= 0 ? ' · Continue capturing' : '') +
        (opponent?.bot ? ' · Bot Elo ' + BOT_RATING[match.difficulty] : '');
}
function evaluation(state) {
    const weights = state.game === 'chess' ? [0, 100, 315, 335, 510, 935, 0] : [0, 100, 178];
    return state.board.reduce((sum, piece, i) => {
        if (!piece) return sum;
        const side = Math.sign(piece), center = 7 - Math.abs(3.5 - i % 8) - Math.abs(3.5 - (i >> 3));
        return sum + side * (weights[Math.abs(piece)] + center * 2);
    }, 0);
}
function searchPosition(state, depth, alpha, beta) {
    if (!depth) return evaluation(state);
    const moves = legalBoard(state);
    if (!moves.length) {
        const checked = state.game === 'checkers' || attacked(state.board, state.board.indexOf(state.turn * 6), -state.turn);
        return checked ? -state.turn * (10000 + depth) : 0;
    }
    let best = state.turn * -Infinity;
    for (const move of moves) {
        const score = searchPosition(applyBoard(state, move), depth - 1, alpha, beta);
        if (state.turn > 0) { best = Math.max(best, score); alpha = Math.max(alpha, best); }
        else { best = Math.min(best, score); beta = Math.min(beta, best); }
        if (alpha >= beta) break;
    }
    return best;
}
function scheduleBot() {
    clearTimeout(botTimer);
    if (!MG.isHost() || !match || match.result || !playerFor(match.state.turn)?.bot) return;
    botTimer = setTimeout(() => {
        const { state, difficulty } = match;
        const moves = legalBoard(state);
        let best, score = -Infinity;
        for (const move of moves) {
            const next = applyBoard(state, move);
            const value = searchPosition(next, difficulty, -Infinity, Infinity) * state.turn + Math.random() * (difficulty ? 12 : 250);
            if (value > score) { score = value; best = move; }
        }
        if (best) commitMove(best);
    }, 300);
}
function commitMove(move) {
    match.state = applyBoard(match.state, move);
    const key = positionKey(match.state), count = (match.positions.get(key) || 0) + 1;
    match.positions.set(key, count);
    match.result = boardResult(match.state, count);
    broadcastBoard();
}
function broadcastBoard() {
    MG.toAll({ kind: 'board', state: match.state, difficulty: match.difficulty, result: match.result });
    selected = -1;
    boardPaint(); saveResult(); scheduleBot();
    if (match.result) {
        const result = match.result;
        botTimer = setTimeout(() => {
            const winner = result.win && playerFor(result.win);
            MG.end('<h2>' + (winner ? mgEsc(winner.name) + ' wins' : 'Draw') + '</h2><p>' + result.reason + '</p>');
        }, 800);
    }
}
MG.init({
    id: 'Minigames/Chess and Checkers', title: 'Chess and Checkers', max: 2, min: 2, bots: 1, defBots: 1, color: '#70dbc0',
    sub: 'Play with a friend or practice against a bot.',
    onStart() {
        selected = -1;
        recorded = false;
        $board('match').hidden = false;
        $board('board').replaceChildren();
        $board('game-status').textContent = 'Waiting for the board…';
        if (MG.isHost()) {
            const state = boardStart($board('board-mode').value);
            match = { state, difficulty: Number($board('bot-level').value), result: null, positions: new Map([[positionKey(state), 1]]) };
            broadcastBoard();
        }
    },
    onMsg(peer, m) {
        if (!m) return;
        if (!MG.isHost() && peer === 0 && m.kind === 'board') {
            match = { state: m.state, difficulty: m.difficulty, result: m.result };
            selected = -1;
            boardPaint(); saveResult();
        } else if (MG.isHost() && match && !match.result && m.kind === 'move' &&
            m.ply === match.state.ply && peer === playerFor(match.state.turn)?.id) {
            const move = legalBoard(match.state).find(x => x.from === m.from && x.to === m.to && x.promotion === m.promotion);
            if (move) commitMove(move);
        }
    },
    onEnd() { clearTimeout(botTimer); $board('match').hidden = true; match = null; },
    onQuit() { clearTimeout(botTimer); $board('match').hidden = true; match = null; },
    onLeave() { clearTimeout(botTimer); match = null; MG.end('<h2>Opponent left</h2>'); }
});
const prefs = document.createElement('div');
prefs.id = 'board-prefs';
prefs.innerHTML = '<label>Game <select id="board-mode"><option value="chess">Chess</option><option value="checkers">Checkers</option></select></label>' +
    '<label>Bot Elo <select id="bot-level"><option value="0">700</option><option value="1" selected>1100</option><option value="2">1500</option></select></label>';
const record = document.createElement('p');
record.id = 'board-records';
$board('mg-lobby').querySelector('.mg-sub').after(prefs, record);
$board('board-mode').onchange = paintRecord;
$board('leave').onclick = () => MG.leave();
paintRecord();
window.__boardgames = { boardStart, legalBoard, applyBoard, boardResult, get match() { return match; } };
