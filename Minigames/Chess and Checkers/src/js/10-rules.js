const KNIGHT = [[1,2],[1,-2],[-1,2],[-1,-2],[2,1],[2,-1],[-2,1],[-2,-1]];
const DIAG = [[1,1],[1,-1],[-1,1],[-1,-1]];
const AXES = [[1,0],[-1,0],[0,-1],[0,1]];
const KING = DIAG.concat(AXES);
const at = (x, y) => x >= 0 && x < 8 && y >= 0 && y < 8 ? y * 8 + x : -1;
const direction = (square, dx, dy) => at(square % 8 + dx, (square >> 3) + dy);
const occupancy = (board, square) => square < 0 ? null : board[square];
function boardStart(game) {
    let board = Array(64).fill(0);
    if (game === 'chess') {
        const home = [4, 2, 3, 5, 6, 3, 2, 4];
        for (let x = 0; x < 8; x++) {
            board[x] = -home[x]; board[x + 8] = -1;
            board[x + 48] = 1; board[x + 56] = home[x];
        }
    } else board = board.map((_, i) => ((i % 8 + (i >> 3)) % 2) ? (i < 24 ? -1 : i >= 40 ? 1 : 0) : 0);
    return { game, board, turn: game === 'chess' ? 1 : -1, rights: 15, ep: -1, chain: -1, quiet: 0, ply: 0 };
}
function attacked(board, square, by) {
    if (square < 0) return true;
    if ([-1, 1].some(dx => occupancy(board, direction(square, dx, by)) === by)) return true;
    if (KNIGHT.some(([dx, dy]) => occupancy(board, direction(square, dx, dy)) === 2 * by)) return true;
    if (KING.some(([dx, dy]) => occupancy(board, direction(square, dx, dy)) === 6 * by)) return true;
    return KING.some(([dx, dy], i) => {
        for (let step = 1; step < 8; step++) {
            const target = occupancy(board, direction(square, dx * step, dy * step));
            if (target === null) break;
            if (target) return target === 5 * by || target === (i < 4 ? 3 : 4) * by;
        }
        return false;
    });
}
function applyBoard(state, move) {
    const board = state.board.slice(), side = state.turn, piece = board[move.from];
    const next = { ...state, board, turn: -side, ply: state.ply + 1, ep: -1, chain: -1, quiet: !board[move.to] && move.take == null ? state.quiet + 1 : 0 };
    board[move.from] = 0;
    board[move.to] = move.promotion ? side * move.promotion : piece;
    if (move.take != null) board[move.take] = 0;
    if (state.game === 'chess') {
        if (Math.abs(piece) === 1) {
            next.quiet = 0;
            if (Math.abs(move.to - move.from) === 16) next.ep = (move.to + move.from) / 2;
        }
        if (Math.abs(piece) === 6) {
            next.rights &= side === 1 ? 12 : 3;
            if (move.rook != null) {
                board[(move.from + move.to) / 2] = board[move.rook]; board[move.rook] = 0;
            }
        }
        for (const [corner, bit] of [[63,1],[56,2],[7,4],[0,8]]) if (corner === move.from || corner === move.to) next.rights &= ~bit;
    } else if (move.take != null && !move.promotion && draughtMoves(next, move.to, side).some(m => m.take != null)) {
        next.chain = move.to; next.turn = side;
    }
    return next;
}
function chessMoves(state) {
    const { board, turn: side } = state;
    const result = [];
    for (let from = 0; from < 64; from++) {
        const piece = board[from] * side;
        if (piece <= 0) continue;
        const add = (to, special = {}) => {
            if (piece === 1 && (to < 8 || to >= 56)) [5, 4, 3, 2].forEach(promotion => result.push({ from, to, ...special, promotion }));
            else result.push({ from, to, ...special });
        };
        if (piece === 1) {
            const one = direction(from, 0, -side), two = direction(from, 0, -2 * side);
            if (occupancy(board, one) === 0) {
                add(one);
                if (from >> 3 === (side === 1 ? 6 : 1) && occupancy(board, two) === 0) add(two);
            }
            for (const dx of [-1, 1]) {
                const to = direction(from, dx, -side);
                if (to < 0) continue;
                if (board[to] * side < 0 && Math.abs(board[to]) !== 6) add(to);
                else if (to === state.ep) add(to, { take: to + 8 * side });
            }
            continue;
        }
        const dirs = piece === 2 ? KNIGHT : piece === 3 ? DIAG : piece === 4 ? AXES : KING;
        const distance = piece === 2 || piece === 6 ? 1 : 7;
        for (const [dx, dy] of dirs) for (let n = 1; n <= distance; n++) {
            const to = direction(from, dx * n, dy * n);
            if (to < 0 || board[to] * side > 0 || Math.abs(board[to]) === 6) break;
            add(to);
            if (board[to]) break;
        }
        const home = side === 1 ? 60 : 4;
        if (piece === 6 && from === home && !attacked(board, home, -side)) {
            for (const [dir, bit] of [[1, 1], [-1, 2]]) {
                const rook = home + (dir === 1 ? 3 : -4);
                if (!(state.rights & (bit * (side === 1 ? 1 : 4))) || board[rook] !== 4 * side) continue;
                if (board[home + dir] || board[home + dir * 2] || (dir < 0 && board[home - 3])) continue;
                if (!attacked(board, home + dir, -side)) add(home + dir * 2, { rook });
            }
        }
    }
    return result.filter(move => {
        const { board } = applyBoard(state, move);
        return !attacked(board, board.indexOf(6 * side), -side);
    });
}
function draughtMoves(state, from, side) {
    const result = [], piece = state.board[from];
    if (piece * side <= 0) return result;
    for (const [dx, dy] of DIAG) {
        if (Math.abs(piece) === 1 && dy !== -side) continue;
        const near = direction(from, dx, dy), far = direction(from, dx * 2, dy * 2);
        if (near < 0) continue;
        let to = near, take;
        if (state.board[near]) {
            if (state.board[near] * side > 0 || occupancy(state.board, far) !== 0) continue;
            to = far; take = near;
        }
        result.push({ from, to, take, promotion: Math.abs(piece) === 1 && to >> 3 === (side === 1 ? 0 : 7) ? 2 : undefined });
    }
    return result;
}
function legalBoard(state) {
    if (state.game === 'chess') return chessMoves(state);
    const moves = state.chain >= 0 ? draughtMoves(state, state.chain, state.turn) :
        state.board.flatMap((_, i) => draughtMoves(state, i, state.turn));
    const captures = moves.filter(m => m.take != null);
    return state.chain >= 0 || captures.length ? captures : moves;
}
function positionKey(state) {
    const ep = state.ep >= 0 && chessMoves(state).some(move => move.to === state.ep && move.take != null) ? state.ep : -1;
    return [state.board.join(','), state.turn, state.rights, ep, state.chain].join('|');
}
function boardResult(state, count) {
    if (!legalBoard(state).length) {
        const checked = attacked(state.board, state.board.indexOf(6 * state.turn), -state.turn);
        return state.game === 'chess' && !checked ? { win: 0, reason: 'Stalemate' } :
            { win: -state.turn, reason: state.game === 'chess' ? 'Checkmate' : 'No legal moves' };
    }
    if (count >= 3 || state.quiet >= (state.game === 'chess' ? 100 : 80)) return { win: 0, reason: 'Draw' };
    if (state.game === 'chess') {
        const minors = state.board.filter(p => p && Math.abs(p) !== 6);
        if (!minors.length || minors.length === 1 && Math.abs(minors[0]) <= 3 && Math.abs(minors[0]) >= 2) return { win: 0, reason: 'Insufficient material' };
    }
    return null;
}
