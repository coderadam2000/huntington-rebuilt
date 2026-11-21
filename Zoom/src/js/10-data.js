// ==========================================
// ZOOM: the data. Tracks (12, in 3 cups), vehicles (karts and bikes), wheels, paint, items, modes.
// Units: metres and seconds. Track points are [x, z, height]; the road is a closed Catmull-Rom curve through them.
// ==========================================
import * as THREE from 'three';
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
function zEl(id) { return document.getElementById(id); }
function zEsc(s) { return mgEsc(s); }
function fmtTime(ms) { if (!(ms >= 0) || !isFinite(ms)) return '--:--.--'; const m = Math.floor(ms / 60000), s = (ms % 60000) / 1000; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); }
function ordinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

// a wobbly ring of points: n points, radius r +- wob, height y0 + amp*cos(angle * k + ph)
function ringPts(n, r, wob, y0, amp, k, ph, seed) {
    const rnd = mgRng(seed), out = [];
    for (let i = 0; i < n; i++) { const a = -i / n * TAU, rr = r + (rnd() * 2 - 1) * wob; out.push([Math.cos(a) * rr * 1.25, Math.sin(a) * rr, y0 + amp * Math.cos(a * k + ph)]); }
    return out;
}
// a figure eight that crosses itself on a bridge: the two passes through the middle are 2*h apart
function eightPts(n, a, b, h) {
    const out = [];
    for (let i = 0; i < n; i++) { const t = i / n * TAU; out.push([a * Math.sin(t), b * Math.sin(2 * t), h * Math.cos(t) + h]); }
    return out;
}

// themes: sky colours, fog, ground, road look, what grows by the road
const THEMES = {
    meadow:  { sky: ['#5fb4ff', '#d8f0ff'], fog: '#cde9ff', fogN: 140, fogF: 520, ground: '#5dbb4a', shoulder: '#4fa83f', skirt: '#7a5a3a', road: '#5a5f6b', line: '#f8fafc', curb: ['#ef4444', '#f8fafc'], wall: '#f8fafc', sun: 1.0, scen: ['tree', 'bush', 'flower', 'rock'] },
    beach:   { sky: ['#38bdf8', '#fef3c7'], fog: '#e0f2fe', fogN: 150, fogF: 560, ground: '#f4d58d', shoulder: '#ead08a', skirt: '#c9a96a', road: '#6b6b70', line: '#fde68a', curb: ['#f97316', '#f8fafc'], wall: '#38bdf8', water: '#0ea5e9', sun: 1.05, scen: ['palm', 'umbrella', 'rock', 'bush'] },
    pine:    { sky: ['#7dd3fc', '#ecfeff'], fog: '#d1fae5', fogN: 110, fogF: 460, ground: '#3f8f46', shoulder: '#3a7d3e', skirt: '#6b4f33', road: '#4b5160', line: '#f8fafc', curb: ['#facc15', '#1f2937'], wall: '#a16207', sun: 0.95, scen: ['pine', 'pine', 'rock', 'log'] },
    city:    { sky: ['#0b1030', '#3b2a6b'], fog: '#1e1b4b', fogN: 90, fogF: 420, ground: '#1f2433', shoulder: '#2a3042', skirt: '#272b3a', road: '#2b2f3c', line: '#fde047', curb: ['#e879f9', '#22d3ee'], wall: '#22d3ee', neon: true, night: true, sun: 0.45, scen: ['building', 'building', 'lamp'] },
    desert:  { sky: ['#f59e0b', '#fde68a'], fog: '#fcd9a0', fogN: 140, fogF: 520, ground: '#d9a066', shoulder: '#cf9358', skirt: '#a8673a', road: '#6b5b4b', line: '#fff7ed', curb: ['#b91c1c', '#fff7ed'], wall: '#92400e', sun: 1.1, scen: ['cactus', 'mesa', 'rock', 'cactus'] },
    snow:    { sky: ['#93c5fd', '#f1f5f9'], fog: '#e2e8f0', fogN: 100, fogF: 430, ground: '#f1f5f9', shoulder: '#e2e8f0', skirt: '#cbd5e1', road: '#5b6676', line: '#e0f2fe', curb: ['#2563eb', '#f8fafc'], wall: '#93c5fd', ice: true, sun: 1.0, scen: ['snowpine', 'snowpine', 'icerock', 'snowman'], snow: true },
    factory: { sky: ['#475569', '#cbd5e1'], fog: '#94a3b8', fogN: 90, fogF: 400, ground: '#4b5563', shoulder: '#6b7280', skirt: '#374151', road: '#30343c', line: '#facc15', curb: ['#facc15', '#111827'], wall: '#f59e0b', sun: 0.8, scen: ['gear', 'stack', 'crate', 'pipe'] },
    reef:    { sky: ['#0369a1', '#22d3ee'], fog: '#0e7490', fogN: 50, fogF: 300, ground: '#e9d5a1', shoulder: '#dcc58e', skirt: '#b49b68', road: '#3f6f7f', line: '#a5f3fc', curb: ['#f472b6', '#fef9c3'], wall: '#f472b6', sun: 0.8, scen: ['coral', 'kelp', 'coral', 'shell'], bubbles: true },
    volcano: { sky: ['#1c0a0a', '#7c2d12'], fog: '#431407', fogN: 90, fogF: 430, ground: '#ff5a1f', lava: true, shoulder: '#3b2f2f', skirt: '#2a1f1f', road: '#2f2a2a', line: '#fb923c', curb: ['#dc2626', '#1c1917'], wall: '#dc2626', night: true, sun: 0.6, scen: ['darkrock', 'darkrock', 'ember'], embers: true },
    sky:     { sky: ['#60a5fa', '#fdf2f8'], fog: '#fce7f3', fogN: 160, fogF: 600, ground: null, shoulder: '#86efac', skirt: '#a16207', road: '#e5e7eb', line: '#f472b6', curb: ['#f472b6', '#f8fafc'], wall: '#f9a8d4', sun: 1.1, scen: ['cloud', 'island', 'cloud'] },
    haunted: { sky: ['#1e0b3a', '#4c1d95'], fog: '#2e1065', fogN: 70, fogF: 360, ground: '#2d2a3e', shoulder: '#3b3550', skirt: '#2a2338', road: '#3a3448', line: '#a3e635', curb: ['#f97316', '#1e1b4b'], wall: '#7c3aed', night: true, bridge: true, sun: 0.5, scen: ['deadtree', 'grave', 'pumpkin', 'deadtree'] },
    space:   { sky: ['#020617', '#1e1b4b'], fog: '#0f0a2a', fogN: 200, fogF: 700, ground: null, shoulder: '#312e81', skirt: null, road: '#1e1b4b', line: '#f0abfc', curb: ['#22d3ee', '#e879f9'], wall: '#22d3ee', neon: true, night: true, sun: 0.7, scen: ['asteroid', 'planet', 'asteroid'], stars: true }
};

// tracks: w = road width, off = shoulder (slow ground) each side, edge 'wall' (barriers), 'fall' (fall off), 'lava'.
// boxes/pads/ramps/coins are fractions of a lap; pads and ramps can sit to one side (lat, -1..1 of half the width).
const TRACKS = [
    { id: 'meadow', name: 'Meadow Loop', cup: 0, theme: 'meadow', w: 18, off: 6, edge: 'wall', laps: 3,
      pts: [[0, 0, 0], [130, 0, 0], [205, -40, 1], [225, -140, 3], [165, -220, 4], [65, -200, 3], [10, -255, 1], [-90, -240, 0], [-150, -160, 0], [-120, -60, 0]],
      boxes: [0.2, 0.55, 0.82], pads: [[0.08, 0], [0.45, -0.5], [0.7, 0.5]], ramps: [], coins: [0.12, 0.33, 0.62, 0.9] },
    { id: 'beach', name: 'Sandy Shores', cup: 0, theme: 'beach', w: 17, off: 7, edge: 'wall', laps: 3,
      pts: [[0, 0, 0], [150, 10, 0], [265, -30, 1], [305, -130, 2], [245, -205, 1], [135, -175, 0], [65, -235, 0], [-60, -265, 1], [-175, -205, 2], [-185, -95, 1], [-100, -30, 0]],
      boxes: [0.18, 0.5, 0.78], pads: [[0.3, 0], [0.62, 0.4]], ramps: [[0.36, 0]], coins: [0.1, 0.42, 0.7, 0.88] },
    { id: 'pine', name: 'Pine Ridge', cup: 0, theme: 'pine', w: 16, off: 6, edge: 'wall', laps: 3,
      pts: [[0, 0, 0], [100, 0, 4], [185, -50, 12], [205, -150, 18], [125, -215, 15], [40, -175, 9], [-40, -230, 5], [-135, -190, 1], [-165, -85, -1], [-95, -20, 0]],
      boxes: [0.15, 0.48, 0.8], pads: [[0.1, 0], [0.6, -0.4]], ramps: [[0.55, 0]], coins: [0.25, 0.4, 0.72, 0.92] },
    { id: 'city', name: 'Neon Avenue', cup: 0, theme: 'city', w: 16, off: 3, edge: 'wall', laps: 3,
      pts: [[0, 0, 0], [160, 0, 0], [182, -22, 0], [182, -140, 0], [160, -162, 0], [62, -162, 0], [40, -184, 0], [40, -262, 0], [18, -284, 0], [-122, -284, 0], [-144, -262, 0], [-144, -22, 0], [-122, 0, 0]],
      boxes: [0.14, 0.44, 0.74], pads: [[0.05, 0], [0.3, 0.5], [0.58, -0.5], [0.85, 0]], ramps: [], coins: [0.22, 0.52, 0.66, 0.94] },
    { id: 'dunes', name: 'Dune Canyon', cup: 1, theme: 'desert', w: 17, off: 7, edge: 'wall', laps: 2,
      pts: [[0, 0, 0], [140, 0, 0], [225, -60, 3], [205, -165, 7], [105, -185, 7], [65, -265, 3], [165, -335, 0], [60, -410, 1], [-85, -370, 3], [-125, -255, 7], [-60, -150, 7], [-145, -80, 3], [-90, 5, 0]],
      boxes: [0.13, 0.4, 0.66, 0.88], pads: [[0.06, 0], [0.5, 0.5]], ramps: [[0.27, 0], [0.58, 0], [0.8, 0]], coins: [0.2, 0.35, 0.62, 0.95] },
    { id: 'frost', name: 'Frostbite Pass', cup: 1, theme: 'snow', w: 16, off: 6, edge: 'wall', laps: 3,
      pts: [[0, 0, 0], [130, -10, 3], [215, -80, 8], [195, -180, 13], [100, -235, 13], [0, -200, 9], [-60, -285, 6], [-165, -265, 4], [-205, -160, 2], [-150, -60, 0]],
      boxes: [0.16, 0.47, 0.77], pads: [[0.08, 0], [0.38, 0.4], [0.68, -0.4]], ramps: [[0.58, 0]], coins: [0.27, 0.5, 0.86] },
    { id: 'factory', name: 'Clockwork Factory', cup: 1, theme: 'factory', w: 15, off: 3, edge: 'wall', laps: 3,
      pts: [[0, 0, 0], [120, 0, 0], [152, -30, 0], [120, -62, 0], [20, -62, 0], [-12, -92, 0], [20, -124, 0], [160, -124, 0], [192, -154, 0], [160, -186, 0], [-62, -186, 0], [-94, -154, 0], [-94, -32, 0], [-62, 0, 0]],
      boxes: [0.12, 0.4, 0.62, 0.86], pads: [[0.06, 0], [0.24, 0], [0.48, 0], [0.7, 0.4], [0.92, -0.4]], ramps: [[0.78, 0]], coins: [0.18, 0.34, 0.55, 0.8] },
    { id: 'reef', name: 'Coral Reef Run', cup: 1, theme: 'reef', w: 17, off: 6, edge: 'wall', laps: 3,
      pts: [[0, 0, 0], [110, 20, -2], [210, -10, -6], [252, -100, -8], [205, -190, -6], [100, -205, -2], [30, -140, 0], [-40, -200, -3], [-140, -225, -6], [-205, -140, -4], [-165, -50, -2], [-80, -10, 0]],
      boxes: [0.15, 0.45, 0.75], pads: [[0.3, 0], [0.55, -0.4], [0.85, 0.4]], ramps: [[0.5, 0]], coins: [0.08, 0.38, 0.66, 0.92] },
    { id: 'volcano', name: 'Volcano Rim', cup: 2, theme: 'volcano', w: 16, off: 3, edge: 'lava', laps: 3,
      pts: ringPts(14, 165, 28, 14, 14, 1, Math.PI, 9),
      boxes: [0.14, 0.42, 0.7, 0.9], pads: [[0.06, 0], [0.55, 0.4], [0.8, -0.4]], ramps: [[0.35, 0], [0.62, 0]], coins: [0.22, 0.5, 0.76] },
    { id: 'skygarden', name: 'Sky Garden', cup: 2, theme: 'sky', w: 15, off: 2, edge: 'fall', laps: 3,
      pts: [[0, 0, 20], [120, -10, 22], [205, -80, 26], [165, -170, 31], [62, -160, 28], [0, -232, 24], [-110, -212, 20], [-165, -120, 18], [-125, -40, 18]],
      boxes: [0.15, 0.45, 0.75], pads: [[0.08, 0], [0.38, 0], [0.62, 0.4]], ramps: [[0.27, 0], [0.86, 0]], coins: [0.2, 0.52, 0.7, 0.95] },
    { id: 'haunted', name: 'Haunted Hollow', cup: 2, theme: 'haunted', w: 16, off: 4, edge: 'wall', laps: 3,
      pts: eightPts(18, 210, 115, 5),
      boxes: [0.12, 0.38, 0.62, 0.88], pads: [[0.0, 0], [0.5, 0], [0.25, 0.4], [0.75, -0.4]], ramps: [], coins: [0.18, 0.32, 0.68, 0.82] },
    { id: 'starlight', name: 'Starlight Circuit', cup: 2, theme: 'space', w: 15, off: 2, edge: 'fall', laps: 2,
      pts: [[0, 0, 0], [150, 0, 6], [250, -60, 14], [262, -180, 22], [150, -242, 26], [40, -200, 20], [-20, -112, 12], [-120, -92, 8], [-222, -152, 10], [-262, -262, 16], [-150, -332, 18], [-40, -322, 12], [40, -382, 6], [-60, -442, 2], [-262, -422, 0], [-335, -300, 0], [-305, -120, 0], [-200, -20, 0], [-90, 30, 0]],
      boxes: [0.1, 0.3, 0.5, 0.7, 0.9], pads: [[0.05, 0], [0.2, 0.4], [0.42, -0.4], [0.64, 0], [0.82, 0.4]], ramps: [[0.36, 0], [0.75, 0]], coins: [0.15, 0.4, 0.6, 0.86] }
];
const CUPS = [
    { id: 'sprout', name: 'Sprout Cup', ic: '🌱', col: '#4ade80' },
    { id: 'blaze', name: 'Blaze Cup', ic: '🔥', col: '#fb923c' },
    { id: 'comet', name: 'Comet Cup', ic: '☄️', col: '#a78bfa' }
];
const trackById = id => TRACKS.find(t => t.id === id) || TRACKS[0];
const cupTracks = c => TRACKS.filter(t => t.cup === c);

// speed classes: how fast everyone goes and how sharp the bots are
const CLASSES = [
    { n: 'Chill', sub: '50cc', spd: 0.82, ai: 0.86 },
    { n: 'Fast', sub: '100cc', spd: 1.0, ai: 0.95 },
    { n: 'Zoom', sub: '150cc', spd: 1.17, ai: 1.0 }
];

// vehicles. Stats 1..6: spd top speed, acc acceleration, wgt weight, hnd handling, grp grip (and off-road), mt mini-turbo
const BODIES = [
    { id: 'sprint', name: 'Sprint', type: 'kart', cost: 0, st: { spd: 3, acc: 3, wgt: 3, hnd: 3, grp: 3, mt: 3 }, d: 'The all-rounder.' },
    { id: 'dart', name: 'Dart', type: 'kart', cost: 150, st: { spd: 2, acc: 5, wgt: 1, hnd: 4, grp: 3, mt: 4 }, d: 'Light and quick off the line.' },
    { id: 'brick', name: 'Brick', type: 'kart', cost: 300, st: { spd: 4, acc: 1, wgt: 6, hnd: 2, grp: 3, mt: 2 }, d: 'Heavy: shoves everyone else around.' },
    { id: 'buggy', name: 'Dune Buggy', type: 'kart', cost: 400, st: { spd: 3, acc: 3, wgt: 3, hnd: 3, grp: 6, mt: 3 }, d: 'Barely slows down off the road.' },
    { id: 'comet', name: 'Comet', type: 'kart', cost: 600, st: { spd: 6, acc: 2, wgt: 4, hnd: 2, grp: 2, mt: 2 }, d: 'The fastest kart, if you can steer it.' },
    { id: 'scooter', name: 'Scooter', type: 'bike', cost: 0, st: { spd: 2, acc: 5, wgt: 1, hnd: 5, grp: 3, mt: 3 }, d: 'Zippy bike that turns on a coin.' },
    { id: 'sportbike', name: 'Sport Bike', type: 'bike', cost: 450, st: { spd: 4, acc: 3, wgt: 2, hnd: 4, grp: 3, mt: 5 }, d: 'Tight drifts and huge mini-turbos.' },
    { id: 'chopper', name: 'Chopper', type: 'bike', cost: 650, st: { spd: 5, acc: 2, wgt: 5, hnd: 2, grp: 3, mt: 3 }, d: 'A heavy cruiser with a big top speed.' }
];
const WHEELS = [
    { id: 'std', name: 'Standard', cost: 0, r: 0.36, wd: 0.32, rim: '#cbd5e1', st: {} },
    { id: 'slick', name: 'Slicks', cost: 200, r: 0.34, wd: 0.42, rim: '#facc15', st: { spd: 1, grp: -1 } },
    { id: 'roller', name: 'Rollers', cost: 150, r: 0.27, wd: 0.28, rim: '#f472b6', st: { spd: -1, acc: 1, hnd: 1, mt: 1 } },
    { id: 'rally', name: 'Rally', cost: 300, r: 0.38, wd: 0.32, rim: '#fb923c', st: { hnd: 1, grp: 1, mt: -1 } },
    { id: 'monster', name: 'Monster', cost: 350, r: 0.5, wd: 0.42, rim: '#4ade80', st: { acc: -1, wgt: 1, grp: 2 } },
    { id: 'neon', name: 'Neon Rings', cost: 500, r: 0.36, wd: 0.3, rim: '#22d3ee', glow: true, st: { acc: 1, mt: 1 } }
];
const PAINTS = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f8fafc', '#1f2937', '#a3e635', '#d4a373'];
const PAINT_COST = [0, 0, 0, 0, 0, 0, 50, 50, 50, 80, 80, 120];
const SUITS = ['#2563eb', '#dc2626', '#16a34a', '#f59e0b', '#7c3aed', '#0f172a', '#f8fafc', '#db2777'];
const DECALS = [
    { id: 'none', name: 'Plain', cost: 0 }, { id: 'stripes', name: 'Racing stripes', cost: 60 }, { id: 'flames', name: 'Flames', cost: 120 },
    { id: 'stars', name: 'Stars', cost: 100 }, { id: 'checker', name: 'Checkers', cost: 90 }, { id: 'bolt', name: 'Lightning', cost: 150 }
];
const bodyById = id => BODIES.find(b => b.id === id) || BODIES[0];
const wheelById = id => WHEELS.find(w => w.id === id) || WHEELS[0];
// a build's stats (1..6 each) and the numbers the physics uses
function buildStats(b) {
    const body = bodyById(b.body), wh = wheelById(b.wheel), s = {};
    for (const k of ['spd', 'acc', 'wgt', 'hnd', 'grp', 'mt']) s[k] = clamp(body.st[k] + (wh.st[k] || 0), 1, 6);
    return s;
}
function physStats(b, cls) {
    const s = buildStats(b), bike = bodyById(b.body).type === 'bike', c = CLASSES[cls] || CLASSES[1];
    return {
        bike, top: 26 * c.spd * (0.9 + 0.035 * s.spd), acc: (10 + 2.6 * s.acc) * (0.75 + 0.25 * c.spd), wgt: 0.7 + 0.15 * s.wgt,
        turn: (1.55 + 0.17 * s.hnd) * (bike ? 1.08 : 1), grip: 7 + s.grp, off: 0.42 + 0.08 * s.grp, mt: 0.75 + 0.1 * s.mt, raw: s
    };
}

// items. w = how likely in [front, middle, back] of the pack. A box rolls one of these.
const ITEMS = {
    nitro:   { n: 'Nitro', ic: '💨', w: [4, 4, 3], d: 'A burst of speed.' },
    nitro3:  { n: 'Triple Nitro', ic: '💨', w: [0, 2, 4], uses: 3, d: 'Three bursts of speed.' },
    bumper:  { n: 'Bumper Ball', ic: '🟢', w: [5, 3, 1], d: 'Rolls straight and bounces off walls. Hold back to throw it behind you.' },
    seeker:  { n: 'Seeker Orb', ic: '🔴', w: [1, 4, 3], d: 'Chases down the racer in front of you.' },
    oil:     { n: 'Oil Slick', ic: '🛢️', w: [5, 2, 0], d: 'Drop it: whoever drives through spins out.' },
    mine:    { n: 'Spike Mine', ic: '✴️', w: [3, 2, 1], d: 'Drop it: it blows up whoever touches it.' },
    shield:  { n: 'Bubble Shield', ic: '🛡️', w: [3, 2, 1], d: 'Blocks the next hit for 12 seconds.' },
    coins:   { n: 'Coin Bag', ic: '💰', w: [3, 2, 1], d: 'Five coins: each coin makes you a little faster.' },
    bomb:    { n: 'Big Bomb', ic: '💣', w: [1, 3, 2], d: 'Lob it ahead: it blows up anyone close.' },
    magnet:  { n: 'Magnet', ic: '🧲', w: [0, 2, 3], d: 'Pulls you up to the racer in front.' },
    ghost:   { n: 'Ghost', ic: '👻', w: [1, 2, 2], d: 'Go see-through: nothing can touch you for 5 seconds.' },
    ink:     { n: 'Ink Splat', ic: '🦑', w: [0, 2, 2], d: 'Splats ink over everyone ahead of you.' },
    storm:   { n: 'Thunder Storm', ic: '⛈️', w: [0, 1, 3], d: 'Lightning shrinks and slows everyone ahead of you.' },
    golden:  { n: 'Golden Nitro', ic: '✨', w: [0, 1, 3], d: 'Unlimited nitro for 6 seconds: keep pressing.' },
    rocket:  { n: 'Rocket Run', ic: '🚀', w: [0, 0, 3], d: 'Become a rocket: fly along the track for 5 seconds, knocking racers aside.' }
};
const ITEM_IDS = Object.keys(ITEMS);
function rollItem(rnd, place, n, mode) {
    const f = n > 1 ? (place - 1) / (n - 1) : 0, b = f < 0.25 ? 0 : f < 0.67 ? 1 : 2;
    let tot = 0; const pool = [];
    for (const id of ITEM_IDS) {
        let w = ITEMS[id].w[b];
        if (mode === 'balloon' && (id === 'rocket' || id === 'magnet' || id === 'coins')) w = 0;
        if (mode === 'coins' && id === 'coins') w *= 2;
        if (w > 0) { pool.push([id, w]); tot += w; }
    }
    let r = rnd() * tot; for (const [id, w] of pool) { if ((r -= w) <= 0) return id; } return 'nitro';
}

// modes
const MODES = {
    gp:      { n: 'Grand Prix', ic: '🏆', d: 'Four races, one cup. Points for every finish: most points wins the trophy.' },
    race:    { n: 'Quick Race', ic: '🏁', d: 'One race on any track.' },
    tt:      { n: 'Time Trial', ic: '⏱️', d: 'Just you and the clock (and your best-lap ghost). Three nitros, no items.' },
    ko:      { n: 'Knockout', ic: '💥', d: 'Every 25 seconds the racer in last place is knocked out. Last one driving wins.' },
    coins:   { n: 'Coin Rush', ic: '💰', d: 'Two minutes: grab the most coins. Get hit and you drop some.' },
    balloon: { n: 'Balloon Battle', ic: '🎈', d: 'Three balloons each. Items pop them. Keep yours longest.' }
};
const GP_POINTS = [15, 12, 10, 8, 7, 6, 5, 4];
const BOT_NAMES = ['Byte', 'Pixel', 'Turbo', 'Glitch', 'Echo', 'Nova', 'Bolt', 'Rusty', 'Sprocket', 'Zippy', 'Comet', 'Blaze'];
