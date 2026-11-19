const SPACE_BODIES = [
  ['Mercury', '#bb9d8e'], ['Venus', '#e2b476'], ['Earth', '#68aff2'], ['Mars', '#d4795a'],
  ['Ceres', '#a6a9b7'], ['Jupiter', '#d8a581'], ['Saturn', '#e3c495'], ['Uranus', '#78d5d3'],
  ['Neptune', '#6e8bde'], ['Pluto', '#d3aca0'], ['Haumea', '#a6bdc8'], ['Makemake', '#ca907c'], ['Eris', '#d6d8e5']
];
const SPACE_NEUTRAL = -1;
const SPACE_PLAYER = 0;
const SPACE_WIN = 8;
const SPACE_SIDES = ['Your faction', 'Inner Alliance', 'Outer Union'];
let spaceState, spaceSelected;

function spaceUnlocked() {
  return Store.get('interplanetaryUnlocked', false) || Store.get('hall', []).some(entry => String(entry.ending).startsWith('Victory:'));
}

function newSpaceGame(index) {
  const bodies = SPACE_BODIES.map((_, i) => ({ side: SPACE_NEUTRAL, fleet: 2 + i % 3, industry: 1 }));
  const homes = [index, ...[2, 10, 6].filter(i => i !== index).slice(0, 2)];
  homes.forEach((i, side) => { bodies[i] = { side, fleet: side === SPACE_PLAYER ? 10 : 7, industry: 2 }; });
  return { bodies, turn: 1, credits: 9, range: 1, orders: 2, result: '', message: 'Develop industry or send a fleet to a neighboring world.' };
}

function spaceShips(attacker, defender) {
  if (attacker.side === defender.side) return Math.max(0, attacker.fleet - 1);
  return Math.min(Math.max(0, attacker.fleet - 1), defender.fleet + 2);
}

function spaceMove(state, from, to) {
  const attacker = state.bodies[from], defender = state.bodies[to];
  const ships = spaceShips(attacker, defender);
  if (!ships) return;
  attacker.fleet -= ships;
  if (attacker.side === defender.side) defender.fleet += ships;
  else if (ships > defender.fleet) {
    defender.fleet = ships - defender.fleet;
    defender.side = attacker.side;
  } else defender.fleet -= ships;
}

function spaceResult(state) {
  const held = state.bodies.filter(body => body.side === SPACE_PLAYER).length;
  if (held >= SPACE_WIN) return 'Victory · You control the solar system';
  if (!held) return 'Defeat · Your last world was captured';
  if (state.bodies.some(body => body.side > 0 && state.bodies.filter(x => x.side === body.side).length >= SPACE_WIN)) return 'Defeat · A rival formed a solar majority';
  return '';
}

function spaceAdvance(state) {
  state.turn++;
  state.orders = 2;
  state.bodies.forEach(body => {
    if (body.side !== SPACE_NEUTRAL) body.fleet = Math.min(30, body.fleet + body.industry);
    if (body.side === SPACE_PLAYER) state.credits += body.industry;
  });
  const moves = [];
  for (const side of [1, 2]) {
    const choices = [];
    state.bodies.forEach((a, i) => {
      if (a.side !== side) return;
      for (const j of [i - 1, i + 1]) {
        const target = state.bodies[j];
        if (target && target.side !== side && a.fleet - 2 > target.fleet) choices.push([i, j, target.fleet]);
      }
    });
    choices.sort((a, b) => a[2] - b[2]);
    if (!choices.length) continue;
    const [from, to] = choices[0];
    spaceMove(state, from, to);
    moves.push(SPACE_SIDES[side] + ' took ' + SPACE_BODIES[to][0] + '.');
  }
  state.message = moves.join(' ') || 'Industry produced fleets. Your credits and orders have refreshed.';
}

function openInterplanetary() {
  if (!spaceUnlocked()) return;
  spaceState = Store.get('interplanetary', null);
  if (!spaceState || !Array.isArray(spaceState.bodies) || spaceState.bodies.length !== SPACE_BODIES.length) return spaceSetup();
  spaceSelected = spaceState.bodies.findIndex(b => b.side === SPACE_PLAYER);
  spacePaint();
}

function spaceSetup() {
  UI.modal('<h2>Sovereign Interplanetary</h2><p>Choose a home world. Take control of eight worlds before either rival faction does.</p>' +
    '<div class="space-grid">' + SPACE_BODIES.map(([name, color], i) => '<button class="btn" style="--planet:' + color + '" data-space-home="' + i + '">' + name + '</button>').join('') +
    '</div><div class="actions"><button class="btn" data-act="close-modal">Back to title</button></div>');
  $$('[data-space-home]').forEach(button => { button.onclick = () => {
    spaceSelected = Number(button.dataset.spaceHome);
    spaceState = newSpaceGame(spaceSelected);
    Store.set('interplanetary', spaceState);
    spacePaint();
  }; });
}

function spacePaint() {
  const s = spaceState;
  const selected = s.bodies[spaceSelected], owned = s.bodies.filter(body => body.side === SPACE_PLAYER).length;
  UI.modal('<h2>Sovereign Interplanetary</h2><p>Turn ' + s.turn + ' · ' + s.credits + ' credits · ' + s.orders + ' orders · ' + owned + ' / ' + SPACE_WIN + ' worlds</p>' +
    '<div class="space-grid">' + SPACE_BODIES.map(([name, color], i) => {
      const b = s.bodies[i];
      return '<button class="btn' + (i === spaceSelected ? ' gold' : '') + '" style="--planet:' + color + '" data-space-world="' + i + '" aria-pressed="' + (i === spaceSelected) + '">' + name +
        '<small>' + (SPACE_SIDES[b.side] || 'Neutral') + ' · ' + b.fleet + ' ships</small></button>';
    }).join('') + '</div><p role="status">' + esc(s.result || s.message) + '</p>' +
    (!s.result && selected ? '<div id="space-orders"><div class="actions">' +
      '<button class="btn" data-space-action="develop"' + (selected.side !== SPACE_PLAYER || s.credits < 4 || selected.industry >= 5 || !s.orders ? ' disabled' : '') + '>Develop · 4 credits</button>' +
      '<button class="btn" data-space-action="research"' + (s.range >= 2 || s.credits < 8 || !s.orders ? ' disabled' : '') + '>Research range · 8 credits</button>' +
      '<button class="btn gold" data-space-action="advance">End turn</button></div><div class="actions">' +
      s.bodies.map((body, i) => selected.side === SPACE_PLAYER && i !== spaceSelected && Math.abs(i - spaceSelected) <= s.range && s.orders && spaceShips(selected, body) ?
        '<button class="btn" data-space-ship="' + i + '">' + (body.side === SPACE_PLAYER ? 'Reinforce ' : 'Send fleet to ') + SPACE_BODIES[i][0] + '</button>' : '').join('') +
      '</div></div>' : '') +
    '<div class="actions"><button class="btn" data-act="close-modal">Back to title</button>' +
    (s.result ? '<button class="btn gold" id="space-restart">New solar campaign</button>' : '') + '</div>');
  $$('[data-space-world]').forEach(button => { button.onclick = () => { spaceSelected = Number(button.dataset.spaceWorld); spacePaint(); }; });
  $$('[data-space-ship]').forEach(button => { button.onclick = () => {
    const to = Number(button.dataset.spaceShip);
    spaceMove(s, spaceSelected, to);
    s.orders--;
    s.message = 'Fleet sent to ' + SPACE_BODIES[to][0] + '.';
    spaceSave();
  }; });
  $$('[data-space-action]').forEach(button => { button.onclick = () => {
    if (button.dataset.spaceAction === 'develop') {
      s.credits -= 4; s.orders--; selected.industry++;
      s.message = SPACE_BODIES[spaceSelected][0] + ' grew to industry level ' + selected.industry + '.';
    } else if (button.dataset.spaceAction === 'research') {
      s.credits -= 8; s.orders--; s.range = 2; s.message = 'Fleets can now travel up to two worlds along the route.';
    } else spaceAdvance(s);
    spaceSave();
  }; });
  const restart = $('#space-restart');
  if (restart) restart.onclick = spaceSetup;
}

function spaceSave() {
  spaceState.result = spaceResult(spaceState);
  Store.set('interplanetary', spaceState);
  spacePaint();
}
