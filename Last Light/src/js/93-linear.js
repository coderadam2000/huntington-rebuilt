// ==========================================
// 1.7: LINEAR RUN. Unlocks once you have beaten the main game (The Gloom). Every main-game level (worlds 1-4) in order, on
// one clock. You can only play the level you are on: there is no going back to an earlier level until the one in front of
// you is beaten, and beating it moves the run on. Leave any time: the run (where you are, its clock, its falls) is kept in
// the save and Continue picks it up at the start of that level. The clock counts every attempt, falls included.
// Records: SAVE.d.linear = { at, t, cur, falls, runs, best, bestFalls, splits: [], bestSplits: [] }  (seconds; only adds)
// ==========================================
const LIN_LEVELS = () => LEVELS.filter(l => l.world <= 4);
function linBeatGame() { const L = LIN_LEVELS(), last = L[L.length - 1]; return !!(last && SAVE.d.levels[last.id] && SAVE.d.levels[last.id].best != null); }
function linSave() {
    const d = SAVE.d.linear = SAVE.d.linear && typeof SAVE.d.linear === 'object' ? SAVE.d.linear : {};
    d.at = Math.max(0, Math.min(LIN_LEVELS().length - 1, d.at | 0)); d.t = +d.t || 0; d.cur = +d.cur || 0; d.falls = d.falls | 0; d.runs = d.runs | 0;
    if (!Array.isArray(d.splits)) d.splits = [];
    return d;
}
const linInRun = () => { const d = SAVE.d.linear; return !!(d && (d.at > 0 || d.t > 0 || d.cur > 0)); };
const linIdx = () => LEVELS.indexOf(LIN_LEVELS()[linSave().at]);
function linStart() {
    if (!linBeatGame()) { G.toast('Beat The Gloom to unlock the LINEAR Run'); return; }
    linSave(); G.run = null; G.trial = null; G.linear = true;
    fadeTo(() => G.start(linIdx()));
}
function linBanner() {
    const d = linSave(), N = LIN_LEVELS().length, def = LIN_LEVELS()[d.at];
    UI.banner('LINEAR · ' + (d.at + 1) + ' / ' + N, def.name, 'Run clock ' + fmtTime(d.t + d.cur) + (d.falls ? ' · ' + d.falls + ' fall' + (d.falls === 1 ? '' : 's') : ''));
}
// time spent on an attempt that did not finish (a fall, a restart, leaving) still counts
function linBank() { if (!G.linear || !G.L || G.done) return; const d = linSave(); d.cur += G.time || 0; G.time = 0; SAVE.write(); }
function linLeave() {
    linBank(); G.linear = false; G.state = 'title'; Input.clear();
    $('#hud').classList.add('hidden'); $('#touch').classList.add('hidden'); UI.show('title'); titleStats();
}
function linNewRun() { const d = linSave(); d.at = 0; d.t = 0; d.cur = 0; d.falls = 0; d.splits = []; SAVE.write(); }
// G.finish() calls this once the level's normal records are saved
function linFinish(g) {
    const d = linSave(), N = LIN_LEVELS().length, lvT = d.cur + g.time, def = g.L.def;
    d.splits[d.at] = +lvT.toFixed(2); d.t += lvT; d.cur = 0; d.falls += g.stats.deaths || 0;
    const last = d.at >= N - 1;
    let newBest = false, runT = d.t, runF = d.falls;
    if (last) {
        newBest = d.best == null || runT < d.best;
        if (newBest) { d.best = +runT.toFixed(2); d.bestFalls = runF; d.bestSplits = d.splits.slice(); }
        d.runs++; d.at = 0; d.t = 0; d.falls = 0; d.splits = [];
    } else d.at++;
    SAVE.write();
    const pb = d.bestSplits && d.bestSplits[last ? N - 1 : d.at - 1];
    setTimeout(() => {
        if (!G.linear) return;
        g.state = 'done';
        const rows = [['Level', def.id + ' · ' + def.name], ['Level time', fmtTime(lvT) + (pb != null && !newBest ? ' <small style="opacity:.7">(best run: ' + fmtTime(pb) + ')</small>' : '')],
            ['Run clock', fmtTime(runT) + (newBest ? '<span class="new">NEW BEST</span>' : '')], ['Falls this run', runF],
            ['Levels done', (last ? N : d.at) + ' / ' + N]];
        if (last && d.best != null) rows.push(['Best LINEAR run', fmtTime(d.best) + ' · ' + (d.bestFalls | 0) + ' falls']);
        $('#d-title').textContent = last ? 'LINEAR Run complete!' : 'LINEAR: level cleared';
        $('#d-rows').innerHTML = rows.map(([a, b]) => `<div class="drow"><span>${a}</span><b>${b}</b></div>`).join('');
        $('#d-unlock').textContent = last ? (newBest ? 'A new best run! It goes on the LINEAR leaderboard.' : 'Run again to beat your best.') : 'Next up: ' + LIN_LEVELS()[d.at].name + '. No going back until it is beaten.';
        $('#d-retry').classList.add('hidden');
        $('#d-next').classList.remove('hidden'); $('#d-next').textContent = last ? 'Start a new run' : 'Next level';
        $('#d-map').textContent = 'Main menu';
        $('#hud').classList.add('hidden');
        UI.show('done');
    }, 1500);
}
// ---- wiring: the buttons that lead out of a level know about the run ----
(function () {
    const wrap = (id, fn) => { const el = $(id); if (!el) return; const prev = el.onclick; el.onclick = (e) => { if (G.linear) { Sound.play('click'); fn(e); } else if (prev) prev.call(el, e); }; };
    wrap('d-next', () => fadeTo(() => G.start(linIdx())));
    wrap('d-map', () => linLeave());
    wrap('dd-map', () => linLeave());
    wrap('p-map', () => linLeave());
    wrap('dd-restart', () => { linBank(); fadeTo(() => G.start(linIdx())); });
    wrap('p-restart', () => { linBank(); fadeTo(() => G.start(linIdx())); });
    // the results screen's buttons go back to normal for every other mode
    const showDone = UI.show.bind(UI);
    UI.show = function (s) { if (s === 'done' && !G.linear) { $('#d-retry').classList.remove('hidden'); $('#d-map').textContent = 'Level map'; } return showDone(s); };
    const retry = UI.retry.bind(UI);
    UI.retry = function () { if (G.linear && G.state === 'dead') { linBank(); fadeTo(() => G.start(linIdx())); return; } return retry(); };
    const died = UI.died.bind(UI);
    UI.died = function () { const r = died(); if (G.linear) { $('#dd-cause').textContent += '  LINEAR Run: level ' + (linSave().at + 1) + ', run clock ' + fmtTime(linSave().t + linSave().cur + (G.time || 0)) + '.'; $('#dd-map').textContent = 'Main menu'; } else $('#dd-map').textContent = 'Level map'; return r; };
    // any other way into a level (the map, trials, One Life, multiplayer) ends LINEAR mode (the run itself is kept)
    const pause = UI.pause.bind(UI);
    UI.pause = function (...a) { const r = pause(...a); $('#p-map').textContent = G.linear ? 'Main menu (run is kept)' : 'Level map'; return r; };
    const map = UI.map.bind(UI);
    UI.map = function (...a) { if (G.linear) linBank(); G.linear = false; return map(...a); };
    for (const id of ['t-onelife', 't-mp', 't-train']) { const el = $(id); if (el) el.addEventListener('click', () => { G.linear = false; }, true); }
    const lb = $('t-linear');
    if (lb) lb.onclick = () => { Sound.init(); Sound.play('click'); linStart(); };
    const nr = $('t-linear-new');
    if (nr) nr.onclick = (e) => { e.stopPropagation(); Sound.play('click'); if (nr.dataset.sure) { delete nr.dataset.sure; linNewRun(); titleStats(); G.toast('New LINEAR run: back to level 1'); } else { nr.dataset.sure = '1'; nr.textContent = 'Sure? Tap again'; setTimeout(() => { delete nr.dataset.sure; titleStats(); }, 3000); } };
})();
// the title button: locked, a fresh run, or where your run is
function linTitle() {
    const b = $('t-linear'), sub = $('t-linear-sub'), nr = $('t-linear-new'); if (!b || !sub) return;
    const open = linBeatGame(); b.classList.toggle('locked', !open);
    if (!open) { sub.textContent = 'Beat The Gloom to unlock'; if (nr) nr.classList.add('hidden'); return; }
    const d = linSave(), N = LIN_LEVELS().length;
    if (linInRun()) { sub.textContent = 'Continue: level ' + (d.at + 1) + ' / ' + N + ' · ' + fmtTime(d.t + d.cur); if (nr) { nr.classList.remove('hidden'); if (!nr.dataset.sure) nr.textContent = 'New run'; } }
    else { sub.textContent = d.best != null ? 'Best run ' + fmtTime(d.best) + ' · go again' : 'Every level in order, one clock'; if (nr) nr.classList.add('hidden'); }
}
// the line under Play: the next level the story has for you
function homeWhere() {
    const el = $('t-where'); if (!el) return;
    let i = LEVELS.findIndex((l, k) => !SAVE.d.levels[l.id] && UI.unlocked(k) && l.world <= 5);
    el.textContent = i < 0 ? (Object.keys(SAVE.d.levels).length ? 'Every level cleared. Try Trials or a LINEAR Run!' : '') : (i === 0 && !Object.keys(SAVE.d.levels).length ? 'Start your journey: ' : 'Next: ') + LEVELS[i].id + ' · ' + LEVELS[i].name;
}
(function () { const ts = titleStats; titleStats = function () { ts(); try { linTitle(); homeWhere(); } catch (e) {} }; })();
titleStats();
window.__lumi.linear = { start: linStart, leave: linLeave, save: () => linSave(), beat: linBeatGame, newRun: linNewRun, levels: () => LIN_LEVELS().map(l => l.id), get on() { return !!G.linear; } };
