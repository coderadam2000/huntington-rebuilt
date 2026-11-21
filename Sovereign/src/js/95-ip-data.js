// ==========================================
// SOVEREIGN INTERPLANETARY (1.7): the data. Unlocked by winning any victory in the base game.
// You lead a planet or dwarf planet in the year 2187 instead of a country. Worlds orbit the Sun for real (their
// distance apart changes, so do fleet travel times); each has people, an economy built from what it can mine and
// make, research, a navy, and relations with every other world.
// Resources: cr credits (money), met metals, ene energy, vol volatiles (water, ice, gases), fd food, sci science.
// ==========================================
const IP_YEAR0 = 2187;
const TAU = Math.PI * 2;
// a: orbit size (AU), per: orbital period (years), r: drawn size, col: colours for the procedural texture
// pop: millions, base output per month, cap: population room, def: starting defences, ships: starting fleet
const IP_WORLDS = [
  { id: 'mercury', name: 'Mercury', kind: 'Planet', a: 0.39, per: 0.24, r: 1.0, col: ['#8c8178', '#b5aa9b', '#5d554c'], style: 'rock',
    pop: 180, cap: 400, out: { met: 9, ene: 12, vol: 0.5, fd: 1 }, def: 14, ships: [3, 0, 0], gov: 'The Solar Concession', ruler: 'Director Ines Adeyemi',
    blurb: 'Sun-baked mining domes along the terminator line. More solar power than anyone can use, and metals to sell.' },
  { id: 'venus', name: 'Venus', kind: 'Planet', a: 0.72, per: 0.62, r: 1.7, col: ['#e8c77a', '#f4dfa5', '#c79b4a'], style: 'cloud',
    pop: 620, cap: 1100, out: { met: 3, ene: 8, vol: 4, fd: 4 }, def: 22, ships: [4, 1, 0], gov: 'Aphrodite Cloud Republic', ruler: 'Consul Mara Velasquez',
    blurb: 'Floating cities in the cool upper clouds. Rich in chemistry, short of metals, proud and independent.' },
  { id: 'earth', name: 'Earth', kind: 'Planet', a: 1.0, per: 1.0, r: 1.8, col: ['#2d6cdf', '#3fa34d', '#e8f1ff'], style: 'earth',
    pop: 9800, cap: 11000, out: { met: 6, ene: 8, vol: 6, fd: 14 }, def: 60, ships: [10, 4, 1], gov: 'United Earth Directorate', ruler: 'Secretary-General Amaru Quispe',
    blurb: 'The cradle: most of humanity, the biggest economy and the biggest navy, but old, crowded and slow to change.' },
  { id: 'mars', name: 'Mars', kind: 'Planet', a: 1.52, per: 1.88, r: 1.3, col: ['#c1440e', '#e27b58', '#8a2c0a'], style: 'rock',
    pop: 1400, cap: 2200, out: { met: 8, ene: 5, vol: 3, fd: 5 }, def: 34, ships: [6, 2, 0], gov: 'Free Martian Congress', ruler: 'Chancellor Yusuf Brandt',
    blurb: 'Half-terraformed and hungry for more. Busy shipyards, a restless young population, and an eye on Earth.' },
  { id: 'ceres', name: 'Ceres', kind: 'Dwarf planet', a: 2.77, per: 4.6, r: 0.7, col: ['#77736e', '#9a958e', '#55524e'], style: 'rock',
    pop: 160, cap: 350, out: { met: 12, ene: 2, vol: 4, fd: 1 }, def: 12, ships: [3, 0, 0], gov: 'Belt Miners\' Union', ruler: 'Steward Kofi Mensah',
    blurb: 'Capital of the asteroid belt. Ore and ice for the whole system, and rough miners who answer to nobody.' },
  { id: 'jupiter', name: 'Jupiter', kind: 'Planet', a: 5.2, per: 11.9, r: 3.6, col: ['#d8b48a', '#a9744a', '#efe0c8'], style: 'bands',
    pop: 900, cap: 1600, out: { met: 4, ene: 10, vol: 10, fd: 3 }, def: 30, ships: [5, 2, 0], gov: 'Galilean League', ruler: 'Archon Selene Okafor',
    blurb: 'The league of Europa, Ganymede and Callisto. Oceans of water, helium-3 fusion fuel, and a big appetite.' },
  { id: 'saturn', name: 'Saturn', kind: 'Planet', a: 9.58, per: 29.5, r: 3.1, col: ['#e3d19c', '#c9a865', '#f5ecd0'], style: 'bands', rings: true,
    pop: 520, cap: 1000, out: { met: 3, ene: 7, vol: 11, fd: 3 }, def: 24, ships: [4, 1, 0], gov: 'Titan Commonwealth', ruler: 'Premier Ravi Nakamura',
    blurb: 'Methane lakes on Titan fuel the outer system. Wealthy traders, careful diplomats.' },
  { id: 'uranus', name: 'Uranus', kind: 'Planet', a: 19.2, per: 84, r: 2.3, col: ['#9fe3e6', '#c9f2f3', '#7cc6cc'], style: 'ice', rings: true,
    pop: 90, cap: 300, out: { met: 2, ene: 4, vol: 9, fd: 1 }, def: 10, ships: [2, 0, 0], gov: 'Miranda Collective', ruler: 'Speaker Ada Lindqvist',
    blurb: 'A tiny scientific collective on tipped-over moons. Brilliant labs, almost no army.' },
  { id: 'neptune', name: 'Neptune', kind: 'Planet', a: 30.1, per: 165, r: 2.2, col: ['#3f5fd8', '#6a87f0', '#2b45a8'], style: 'ice',
    pop: 110, cap: 320, out: { met: 2, ene: 4, vol: 10, fd: 1 }, def: 12, ships: [2, 1, 0], gov: 'Triton Watch', ruler: 'Warden Lucia Ferraz',
    blurb: 'Guardians of the system\'s edge on frozen Triton. Few people, fierce pride, deep-space warships.' },
  { id: 'pluto', name: 'Pluto', kind: 'Dwarf planet', a: 39.5, per: 248, r: 0.6, col: ['#d9c3a8', '#b48f6e', '#f2e6d8'], style: 'ice',
    pop: 24, cap: 120, out: { met: 1, ene: 2, vol: 5, fd: 0.5 }, def: 6, ships: [1, 0, 0], gov: 'Tombaugh Station', ruler: 'Administrator Hiro Sato',
    blurb: 'A research station turned tiny nation. The heart-shaped glacier is its pride.' },
  { id: 'haumea', name: 'Haumea', kind: 'Dwarf planet', a: 43.1, per: 283, r: 0.5, col: ['#e9eef5', '#c7d0dc', '#ffffff'], style: 'ice',
    pop: 9, cap: 80, out: { met: 1, ene: 1, vol: 4, fd: 0.3 }, def: 4, ships: [1, 0, 0], gov: 'Haumea Free Port', ruler: 'Captain Noa Kealoha',
    blurb: 'A spinning egg of ice, a free port for smugglers and dreamers.' },
  { id: 'makemake', name: 'Makemake', kind: 'Dwarf planet', a: 45.8, per: 306, r: 0.5, col: ['#c98a5e', '#e0b08a', '#a06a44'], style: 'rock',
    pop: 7, cap: 70, out: { met: 2, ene: 1, vol: 3, fd: 0.3 }, def: 4, ships: [1, 0, 0], gov: 'Makemake Outpost', ruler: 'Overseer Tama Rangi',
    blurb: 'A red, lonely outpost. Cheap to keep, easy to forget, hard to take.' },
  { id: 'eris', name: 'Eris', kind: 'Dwarf planet', a: 67.7, per: 559, r: 0.6, col: ['#f1f1f1', '#d6d6d6', '#bdbdbd'], style: 'ice',
    pop: 12, cap: 90, out: { met: 2, ene: 1, vol: 4, fd: 0.3 }, def: 6, ships: [1, 0, 0], gov: 'Discordia Holdfast', ruler: 'Matriarch Eris Vane',
    blurb: 'The farthest world anyone lives on. Strange, stubborn, and always looking for a quarrel.' }
];
// ships: [frigates, cruisers, dreadnoughts]
const IP_SHIPS = [
  { id: 'frig', n: 'Frigate', cost: { cr: 40, met: 20 }, pow: 1, upk: 1, ic: '🛸' },
  { id: 'crui', n: 'Cruiser', cost: { cr: 110, met: 60, ene: 10 }, pow: 3.4, upk: 3, ic: '🚀' },
  { id: 'drea', n: 'Dreadnought', cost: { cr: 300, met: 160, ene: 40 }, pow: 10, upk: 8, ic: '🛰️', tech: 'dread' }
];
// buildings: each world can have several of each; cost scales with how many you already have
const IP_BUILD = [
  { id: 'mine', n: 'Mining station', ic: '⛏️', cost: { cr: 80, ene: 10 }, fx: { met: 3 }, d: '+3 metals a month' },
  { id: 'fusion', n: 'Fusion plant', ic: '⚛️', cost: { cr: 100, met: 30 }, fx: { ene: 4 }, d: '+4 energy a month (needs volatiles: 1 a month)', use: { vol: 1 } },
  { id: 'harvest', n: 'Ice harvester', ic: '🧊', cost: { cr: 70, met: 15 }, fx: { vol: 3 }, d: '+3 volatiles a month' },
  { id: 'farm', n: 'Hydroponic farm', ic: '🌱', cost: { cr: 60, ene: 10 }, fx: { fd: 3 }, d: '+3 food a month (uses 1 energy)', use: { ene: 1 } },
  { id: 'dome', n: 'Habitat dome', ic: '🏙️', cost: { cr: 150, met: 50 }, fx: { cap: 0.18 }, d: 'Room for 18% more people' },
  { id: 'lab', n: 'Research lab', ic: '🔬', cost: { cr: 120, ene: 20 }, fx: { sci: 3 }, d: '+3 science a month' },
  { id: 'yard', n: 'Shipyard', ic: '🏗️', cost: { cr: 160, met: 60 }, fx: { yard: 1 }, d: 'Build one more ship at a time, ships 10% cheaper' },
  { id: 'grid', n: 'Defence grid', ic: '🛡️', cost: { cr: 130, met: 40, ene: 20 }, fx: { def: 12 }, d: '+12 defence against invasion' },
  { id: 'port', n: 'Trade port', ic: '🏦', cost: { cr: 140, met: 30 }, fx: { trade: 0.12 }, d: '+12% income from trade deals' },
  { id: 'terra', n: 'Terraformer', ic: '🌍', cost: { cr: 400, met: 120, ene: 80 }, fx: { cap: 0.35, happy: 6 }, d: 'Huge project: +35% room and happier people', only: ['venus', 'mars', 'mercury', 'ceres'] }
];
// technology: 5 branches. fx: travel (faster fleets), pow (ship power %), out (all output %), sci, happy, def, cap, unlock
const IP_TECH_BR = ['Propulsion', 'Industry', 'Life', 'Weapons', 'Society'];
const IP_TECH = [];
function IPT(b, id, n, cost, needs, fx, d) { IP_TECH.push({ b, id, n, cost, needs, fx, d }); }
IPT(0, 'ion', 'Ion drives', 60, [], { travel: 0.15 }, 'Fleets travel 15% faster.');
IPT(0, 'fusiond', 'Fusion drives', 140, ['ion'], { travel: 0.25 }, 'Fleets travel 25% faster.');
IPT(0, 'torch', 'Torch ships', 280, ['fusiond', 'mag'], { travel: 0.3, pow: 0.1 }, 'Fleets travel 30% faster and hit harder.');
IPT(0, 'gate', 'Lagrange gates', 420, ['torch'], { travel: 0.4, trade: 0.15 }, 'Shortcuts through the system: much faster fleets and trade.');
IPT(1, 'auto', 'Autonomous mining', 60, [], { out: 0.08 }, '+8% to everything you produce.');
IPT(1, 'orbital', 'Orbital foundries', 150, ['auto'], { out: 0.1, ship: 0.1 }, '+10% output, ships 10% cheaper.');
IPT(1, 'nano', 'Nanofactories', 300, ['orbital'], { out: 0.15 }, '+15% output.');
IPT(1, 'dyson', 'Dyson swarm', 600, ['nano', 'gate'], { ene: 40, out: 0.1, unlock: 'swarm' }, 'Wrap the Sun in collectors. A wonder of the system.');
IPT(2, 'hydro', 'Closed-loop farms', 50, [], { fd: 0.2 }, '+20% food.');
IPT(2, 'gene', 'Space-adapted genes', 140, ['hydro'], { cap: 0.12, happy: 3 }, 'People thrive in low gravity: +12% room.');
IPT(2, 'arcol', 'Arcologies', 260, ['gene'], { cap: 0.2, happy: 4 }, 'Cities in a single building: +20% room.');
IPT(2, 'ark', 'Generation ark', 650, ['arcol', 'gate'], { unlock: 'ark' }, 'Lets you build the ark to the stars: the science victory.');
IPT(3, 'rail', 'Railguns', 70, [], { pow: 0.12 }, 'Ships hit 12% harder.');
IPT(3, 'mag', 'Magnetic shields', 130, ['rail'], { pow: 0.1, def: 10 }, '+10% ship power and +10 home defence.');
IPT(3, 'dread', 'Dreadnoughts', 220, ['mag'], { unlock: 'drea' }, 'Huge battleships, ten frigates in one hull.');
IPT(3, 'lance', 'Particle lances', 380, ['dread'], { pow: 0.25 }, 'Ships hit 25% harder.');
IPT(4, 'media', 'Solar media', 50, [], { happy: 3 }, 'Entertainment beamed system-wide: people are happier.');
IPT(4, 'envoy', 'Envoy corps', 110, ['media'], { rel: 1, trade: 0.1 }, 'Better relations with everyone, +10% trade.');
IPT(4, 'charter', 'Solar charter', 240, ['envoy'], { rel: 2, happy: 3 }, 'A shared law for the system: relations improve faster.');
IPT(4, 'mind', 'Shared mind', 420, ['charter'], { sci: 0.3, happy: 5 }, '+30% science and calmer people.');
const IP_VICTORIES = [
  { id: 'hegemony', n: 'Solar Hegemony', d: 'Rule 7 of the 13 worlds' },
  { id: 'wealth', n: 'Richest World', d: 'Have the biggest economy for 3 years in a row' },
  { id: 'federation', n: 'Solar Federation', d: 'Be allied with 6 other worlds at once' },
  { id: 'stars', n: 'To the Stars', d: 'Research the Generation ark and launch it (5,000 credits)' },
  { id: 'swarm', n: 'Master of the Sun', d: 'Research the Dyson swarm and own the most ships in the system' }
];
// events: { t: title, d: text, w: weight test(world), o: [[label, fx]] }. fx keys: res deltas, happy, stab, pop%, rel {who:'all'|'rand'}
const IP_EVENTS = [
  { id: 'flare', t: 'Solar flare!', d: 'A huge flare is heading our way. We can shut the grids down early, or ride it out and hope.', o: [['Shut down early (-20 energy, safe)', { ene: -20 }], ['Ride it out (50%: nothing, or -2 stability and a damaged defence grid)', { gamble: 0.5, fail: { stab: -6, def: -8 } }]] },
  { id: 'comet', t: 'A comet full of ice', d: 'A comet will pass close by. Catching it costs ships\' time but would fill our tanks for years.', o: [['Catch it (-40 credits, +60 volatiles)', { cr: -40, vol: 60 }], ['Let it pass', {}]] },
  { id: 'strike', t: 'Dock workers strike', d: 'Shipyard workers want better pay and fewer shifts.', o: [['Pay them (-60 credits, +4 happiness)', { cr: -60, happy: 4 }], ['Refuse (-6 stability)', { stab: -6 }]] },
  { id: 'signal', t: 'A strange signal', d: 'Our deep-space array has picked up a repeating signal from beyond the heliopause.', o: [['Fund a study (-50 credits, +60 science)', { cr: -50, sci: 60 }], ['Share it with everyone (+5 relations with all)', { relAll: 5 }]] },
  { id: 'plague', t: 'Dome fever', d: 'A fast-spreading illness in the habitat domes.', o: [['Quarantine (-40 food, -1% people)', { fd: -40, pop: -0.01 }], ['Rush a cure (-80 credits, -3 happiness)', { cr: -80, happy: -3 }]] },
  { id: 'boom', t: 'A mining boom', d: 'Prospectors found a rich vein nearby.', o: [['Tax it (+120 credits, -2 happiness)', { cr: 120, happy: -2 }], ['Let miners keep it (+40 metals, +3 happiness)', { met: 40, happy: 3 }]] },
  { id: 'refugees', t: 'Refugees arrive', d: 'Ships full of families fleeing a failing station ask to land.', o: [['Welcome them (+2% people, -30 food, +4 relations with all)', { pop: 0.02, fd: -30, relAll: 4 }], ['Turn them away (-3 happiness)', { happy: -3 }]] },
  { id: 'ai', t: 'Rogue AI scare', d: 'A logistics AI is acting strangely. Nobody is sure what it wants.', o: [['Shut it down (-10% output this month)', { outHit: 0.1 }], ['Let researchers talk to it (50%: +100 science, or -8 stability)', { gamble: 0.5, win: { sci: 100 }, fail: { stab: -8 } }]] },
  { id: 'festival', t: 'Founders\' festival', d: 'The anniversary of our first landing. People expect a party.', o: [['Throw a big one (-50 credits, +6 happiness)', { cr: -50, happy: 6 }], ['Keep it small (+1 happiness)', { happy: 1 }]] },
  { id: 'pirates', t: 'Pirates in the lanes', d: 'Raiders are hitting our freighters.', o: [['Hunt them (-1 frigate, +4 stability)', { ship0: -1, stab: 4 }], ['Pay them off (-70 credits)', { cr: -70 }]] },
  { id: 'scandal', t: 'Bribery scandal', d: 'Your trade minister took money from a foreign world.', o: [['Fire and prosecute (-1 relation with a world, +3 stability)', { stab: 3, relRand: -15 }], ['Cover it up (50%: nothing, or -10 happiness)', { gamble: 0.5, fail: { happy: -10 } }]] },
  { id: 'impact', t: 'Asteroid on a collision course', d: 'A rock the size of a city will hit a populated area in months.', o: [['Send the fleet to push it (-1 cruiser, saved)', { ship1: -1 }], ['Evacuate (-3% people, -6 stability)', { pop: -0.03, stab: -6 }]] }
];
