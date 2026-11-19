// LINEAR uses the story levels with independent checkpoints and best times.
const baseLevels = () => LEVELS.filter(level => level.world <= 4);
const baseFinished = () => baseLevels().every(level => SAVE.d.levels[level.id]?.best != null);
const linearFrontier = () => baseLevels().findIndex(level => SAVE.d.linear[level.id] == null);
const linearCount = () => baseLevels().filter(level => SAVE.d.linear[level.id] != null).length;

function startLinear() {
    if (!baseFinished()) return;
    const next = linearFrontier();
    G.run = null;
    G.trial = null;
    G.linear = true;
    fadeTo(() => G.start(next < 0 ? 0 : next));
}

function leaveLinear() {
    G.linear = false;
    G.state = 'title';
    Input.clear();
    $('#hud').classList.add('hidden');
    UI.show('title');
    titleStats();
}

function finishLinear(game) {
    const level = game.L.def;
    const best = SAVE.d.linear[level.id];
    const time = Math.round(game.time * 100) / 100;
    SAVE.d.linear[level.id] = best == null ? time : Math.min(time, best);
    SAVE.write();
    const runLevel = game.levelKey;
    setTimeout(() => {
        if (!game.linear || game.levelKey !== runLevel) return;
        game.state = 'done';
        const next = baseLevels()[game.idx + 1];
        $('#d-title').textContent = next ? 'LINEAR level cleared' : 'LINEAR Run complete';
        $('#d-rows').innerHTML = '<div class="drow"><span>Time</span><b>' + fmtTime(time) + '</b></div><div class="drow"><span>Falls</span><b>' + game.stats.deaths + '</b></div>';
        $('#d-unlock').textContent = linearCount() + ' of ' + baseLevels().length + ' levels cleared';
        $('#d-retry').textContent = 'Play again';
        $('#d-prev').classList.toggle('hidden', game.idx <= 0);
        $('#d-next').classList.toggle('hidden', !next);
        $('#d-next').textContent = next ? 'Next level' : '';
        $('#d-map').textContent = 'Main menu';
        $('#hud').classList.add('hidden');
        UI.show('done');
    }, 1500);
}
