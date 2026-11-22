// ==========================================
// EDIBLE LIGHT BULB CLICKER: bake light bulbs you can eat. Click the bulb, buy things that bake for you, buy upgrades.
//   12 producers (cost x1.15 each), tiered upgrades for each (x2 at 1, 5, 25, 50, 100, 150 owned), click upgrades,
//   flavour upgrades (+% everything), golden bulbs (Frenzy x7, Lucky, Click Storm), 40+ achievements (each one
//   raises the lemonade and its bonus), and Rewiring: start over for Filaments (+2% each, forever).
//   Away from the game you keep half your rate for up to 8 hours.
// Save (synced, prefix taco): taco.bulb.v1, every 10 s and on close.
// ==========================================
const $ = id => document.getElementById(id);
const KEY = 'taco.bulb.v1';
const B = [
    ['hand', 'Snacking Hand', '🤚', 15, .1, 'Reaches over and bakes a bulb, every now and then.'], ['lamp', 'Desk Lamp Oven', '💡', 100, 1, 'A tiny oven shaped like a lamp. Or the other way round.'],
    ['farm', 'Filament Farm', '🌾', 1100, 8, 'Grows tungsten wheat for crunchy filaments.'], ['glass', 'Glassblower', '🫧', 12000, 47, 'Blows sugar glass into perfect bulb shells.'],
    ['mill', 'Watt Mill', '⚙️', 130000, 260, 'Grinds watts into fine flour.'], ['socket', 'Socket Mine', '⛏️', 1.4e6, 1400, 'Deep veins of raw, uncooked sockets.'],
    ['plant', 'Snack Power Plant', '🏭', 2e7, 7800, 'Turns electricity directly into snacks.'], ['neon', 'Neon Factory', '🌈', 3.3e8, 44000, 'Bulbs in every flavour of the rainbow.'],
    ['lab', 'Lightning Lab', '⚡', 5.1e9, 260000, 'Bakes a bulb in every bolt.'], ['sun', 'Sun Kitchen', '☀️', 7.5e10, 1.6e6, 'A small star, used as an oven.'],
    ['forge', 'Star Forge', '🌟', 1e12, 1e7, 'Whole constellations, glazed.'], ['brain', 'Bright Idea Engine', '🧠', 1.4e13, 6.5e7, 'Every good idea pops a bulb. Delicious ones.']];
const TIERS = [1, 5, 25, 50, 100, 150], TIER_COST = [10, 50, 500, 5e4, 5e6, 5e8];
const FLAVOURS = [['🍋', 'Lemon zest filaments', 1e5, 1], ['🍫', 'Chocolate-dipped glass', 1e7, 2], ['🍓', 'Strawberry LEDs', 1e9, 3], ['🍯', 'Honey-glazed tungsten', 1e11, 4], ['🧂', 'Sea-salt sockets', 1e13, 5], ['🌶️', 'Spicy halogen', 1e15, 6]];
const CLICKS = [['👆', 'Reinforced finger', 100, 'Clicking is twice as good.'], ['✌️', 'Two-finger technique', 500, 'Clicking is twice as good again.'], ['🖐️', 'Five-finger feast', 1e4, 'Clicking gains +1% of your bulbs per second.'], ['🤲', 'Both hands', 1e6, 'Clicking gains +2% more of your bulbs per second.'], ['🦾', 'Robot arm', 1e8, 'Clicking gains +3% more of your bulbs per second.']];
const NEWS = ['Local man eats light bulb, reports feeling "illuminated".', 'Scientists confirm: edible light bulbs are 40% more glowing than inedible ones.', 'Lamp sales drop as people just eat the bulbs instead.',
    'Dentists warn against biting bulbs that are still on.', 'A bulb was baked so bright it was seen from space.', 'New study: a bulb a day keeps the dark away.', 'Filament farmers protest: "we are not just wire people".',
    'Electric company baffled as power bills are paid in snacks.', 'Breaking: bulb tastes like "warm lemonade and a good idea".', 'The moon files a complaint about the competition.', 'Area kid asks for a bulb for dinner. Gets one.',
    'Moths everywhere report the best year ever.', 'Glassblowers union demands more sugar.', 'Experts recommend eating the bulb before the bulb eats you. Unclear what that means.'];
const S0 = () => ({ v: 1, bulbs: 0, total: 0, allTime: 0, clicks: 0, clickMade: 0, owned: {}, ups: [], achs: [], fil: 0, rewires: 0, golden: 0, start: Date.now(), last: Date.now(), amt: 1 });
let S = S0();
try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') S = Object.assign(S0(), s); } catch (e) {}
const save = () => { S.last = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
window.__bulb = { get S() { return S; }, set S(v) { S = v; } };
// ---- numbers ----
const NAMES = ['', ' thousand', ' million', ' billion', ' trillion', ' quadrillion', ' quintillion', ' sextillion', ' septillion', ' octillion', ' nonillion', ' decillion'];
function fmt(n, dec) {
    if (!isFinite(n)) return '∞'; if (n < 1000) return dec && n < 100 ? (Math.round(n * 10) / 10).toLocaleString() : Math.floor(n).toLocaleString();
    const k = Math.min(NAMES.length - 1, Math.floor(Math.log10(n) / 3)); return (n / Math.pow(1000, k)).toFixed(3).replace(/\.?0+$/, '') + NAMES[k];
}
// ---- the economy ----
const own = id => S.owned[id] || 0;
const has = u => S.ups.includes(u);
const costOf = (b, n) => { const base = b[3]; let c = 0, k = own(b[0]); for (let i = 0; i < n; i++) c += Math.ceil(base * Math.pow(1.15, k + i)); return c; };
function allUpgrades() {
    const L = [];
    for (const b of B) TIERS.forEach((t, i) => L.push({ id: b[0] + i, ic: b[2], n: b[1] + ' ' + ['II', 'III', 'IV', 'V', 'VI', 'VII'][i], cost: b[3] * TIER_COST[i], need: () => own(b[0]) >= t, d: `${b[1]}s are twice as good.`, q: 'Unlocks at ' + t + ' owned.' }));
    CLICKS.forEach((c, i) => L.push({ id: 'click' + i, ic: c[0], n: c[1], cost: c[2], need: () => S.clickMade >= c[2] / 10 || S.clicks >= 25 * (i + 1), d: c[3] }));
    FLAVOURS.forEach((f, i) => L.push({ id: 'fl' + i, ic: f[0], n: f[1], cost: f[2], need: () => S.allTime >= f[2] / 4, d: 'Everything bakes ' + (f[3] * 5) + '% more.' }));
    L.push({ id: 'lucky', ic: '🍀', n: 'Lucky socket', cost: 7.7e5, need: () => S.golden >= 7, d: 'Golden bulbs show up twice as often and last twice as long.' });
    L.push({ id: 'lemon', ic: '🥤', n: 'Lemonade straw', cost: 1e6, need: () => S.achs.length >= 10, d: 'The lemonade (from achievements) helps twice as much.' });
    return L;
}
const UPS = allUpgrades();
function mult() {
    let m = 1;
    FLAVOURS.forEach((f, i) => { if (has('fl' + i)) m *= 1 + f[3] * .05; });
    m *= 1 + S.fil * .02;
    m *= 1 + S.achs.length * .01 * (has('lemon') ? 2 : 1);
    if (buff('frenzy')) m *= 7;
    return m;
}
function rateOf(b) { let r = b[4]; TIERS.forEach((t, i) => { if (has(b[0] + i)) r *= 2; }); return r; }
function bps() { let r = 0; for (const b of B) r += rateOf(b) * own(b[0]); return r * mult(); }
function perClick() {
    let c = 1; if (has('click0')) c *= 2; if (has('click1')) c *= 2;
    let pct = 0; if (has('click2')) pct += .01; if (has('click3')) pct += .02; if (has('click4')) pct += .03;
    c = c * mult() + bps() * pct;
    if (buff('storm')) c *= 777;
    return c;
}
function earn(n) { S.bulbs += n; S.total += n; S.allTime += n; }
// ---- buffs and golden bulbs ----
const BUFFS = {};
const buff = k => BUFFS[k] && BUFFS[k] > performance.now();
let goldenT = performance.now() + 60000 + Math.random() * 90000;
function spawnGolden() {
    const el = document.createElement('div'); el.id = 'golden'; el.textContent = '💡'; el.style.filter = 'drop-shadow(0 0 16px #fde047) hue-rotate(-10deg) saturate(3)';
    el.style.left = (10 + Math.random() * 75) + 'vw'; el.style.top = (12 + Math.random() * 70) + 'vh'; document.body.appendChild(el);
    const life = setTimeout(() => el.remove(), (has('lucky') ? 26 : 13) * 1000);
    el.onclick = () => {
        clearTimeout(life); el.remove(); S.golden++; const r = Math.random(), dur = has('lucky') ? 2 : 1;
        if (r < .45) { BUFFS.frenzy = performance.now() + 77000 * dur; toast('⚡ Frenzy! Everything bakes x7 for ' + 77 * dur + ' s'); }
        else if (r < .85) { const g = Math.min(S.bulbs * .15, bps() / mult() * 900 * Math.max(1, mult())) + 13; earn(g); toast('🍀 Lucky! +' + fmt(g) + ' bulbs'); }
        else { BUFFS.storm = performance.now() + 13000 * dur; toast('🌩️ Click storm! Clicks are x777 for ' + 13 * dur + ' s'); }
        sfx(880, .3, 'triangle', 1760); checkAchs(); paintAll();
    };
}
// ---- achievements ----
const ACHS = [];
[1, 100, 1e3, 1e5, 1e6, 1e8, 1e9, 1e11, 1e12, 1e14, 1e15, 1e18].forEach((n, i) => ACHS.push({ id: 'bake' + i, ic: '💡', n: 'Bake ' + fmt(n) + (n === 1 ? ' bulb' : ' bulbs'), t: () => S.allTime >= n }));
[1, 10, 100, 1e3, 1e4].forEach((n, i) => ACHS.push({ id: 'cl' + i, ic: '👆', n: 'Click ' + fmt(n) + ' times', t: () => S.clicks >= n }));
[1, 10, 100, 1e4, 1e6].forEach((n, i) => ACHS.push({ id: 'bps' + i, ic: '⏱️', n: fmt(n) + (n === 1 ? ' bulb' : ' bulbs') + ' per second', t: () => bps() >= n }));
B.forEach(b => { ACHS.push({ id: 'b1' + b[0], ic: b[2], n: 'Own a ' + b[1], t: () => own(b[0]) >= 1 }); ACHS.push({ id: 'b50' + b[0], ic: b[2], n: '50 of ' + b[1] + 's', t: () => own(b[0]) >= 50 }); });
ACHS.push({ id: 'gold1', ic: '🌟', n: 'Catch a golden bulb', t: () => S.golden >= 1 }, { id: 'gold7', ic: '🌟', n: 'Catch 7 golden bulbs', t: () => S.golden >= 7 }, { id: 'gold77', ic: '🌟', n: 'Catch 77 golden bulbs', t: () => S.golden >= 77 });
ACHS.push({ id: 'rew1', ic: '🔌', n: 'Rewire once', t: () => S.rewires >= 1 }, { id: 'rew5', ic: '🔌', n: 'Rewire 5 times', t: () => S.rewires >= 5 }, { id: 'up10', ic: '📦', n: 'Buy 10 upgrades', t: () => S.ups.length >= 10 }, { id: 'up40', ic: '📦', n: 'Buy 40 upgrades', t: () => S.ups.length >= 40 });
function checkAchs() { for (const a of ACHS) if (!S.achs.includes(a.id) && a.t()) { S.achs.push(a.id); toast('🏆 Achievement: ' + a.n); sfx(660, .25, 'triangle', 990); } }
// ---- sound ----
let AC = null;
function sfx(f, len, type, f2) { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const o = AC.createOscillator(), g = AC.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, AC.currentTime); if (f2) o.frequency.exponentialRampToValueAtTime(f2, AC.currentTime + len); g.gain.setValueAtTime(.05, AC.currentTime); g.gain.exponentialRampToValueAtTime(.0005, AC.currentTime + len); o.connect(g); g.connect(AC.destination); o.start(); o.stop(AC.currentTime + len); } catch (e) {} }
// ---- the page ----
const BULB_SVG = `<svg id="bulb" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="gl" cx="45%" cy="35%" r="65%"><stop offset="0" stop-color="#fffbe6"/><stop offset=".45" stop-color="#fde047"/><stop offset="1" stop-color="#f59e0b"/></radialGradient>
  <linearGradient id="cap" x1="0" x2="1"><stop offset="0" stop-color="#a8a29e"/><stop offset=".5" stop-color="#e7e5e4"/><stop offset="1" stop-color="#78716c"/></linearGradient></defs>
  <path d="M100 8 C45 8 14 50 14 96 C14 132 36 152 52 170 C62 182 66 192 66 204 L134 204 C134 192 138 182 148 170 C164 152 186 132 186 96 C186 50 155 8 100 8 Z" fill="url(#gl)" stroke="#b45309" stroke-width="4"/>
  <path d="M80 172 C84 146 92 138 100 152 C108 138 116 146 120 172" fill="none" stroke="#b45309" stroke-width="5" stroke-linecap="round"/>
  <path d="M48 70 C56 44 74 32 92 30" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".7"/>
  <circle cx="74" cy="78" r="7" fill="#7c2d12"/><circle cx="126" cy="78" r="7" fill="#7c2d12"/><path d="M86 94 Q100 106 114 94" stroke="#7c2d12" stroke-width="5" fill="none" stroke-linecap="round"/>
  <rect x="62" y="204" width="76" height="40" rx="8" fill="url(#cap)" stroke="#57534e" stroke-width="3"/><path d="M62 216 H138 M62 228 H138" stroke="#57534e" stroke-width="3"/><path d="M84 244 H116 L108 256 H92 Z" fill="#57534e"/>
  <circle cx="150" cy="60" r="5" fill="#fef3c7"/><circle cx="40" cy="140" r="4" fill="#fef3c7"/></svg>`;
$('app').innerHTML = `<div class="col" id="left"><div id="bank"></div><div id="buffs"></div><div id="bulbwrap"><div id="halo"></div>${BULB_SVG}</div><div id="juice"></div></div>
  <div class="col" id="mid"><div id="news"></div><div class="h">Upgrades</div><div id="upgrades"></div><div class="h">Stats</div><div id="stats"></div>
    <div class="h">Achievements <span id="achn"></span></div><div id="achs"></div><div style="padding:0 14px 20px"><button class="btn" id="rewire">🔌 Rewire...</button> <button class="btn" id="reset">Wipe save</button></div></div>
  <div class="col" id="right"><div class="h">Store</div><div id="buyamt"><button class="btn" data-a="1">x1</button><button class="btn" data-a="10">x10</button><button class="btn" data-a="100">x100</button></div><div id="store"></div></div>
  <div id="tip" class="hidden"></div><div id="toast"></div>`;
function toast(t) { const box = $('toast'); while (box.children.length >= 3) box.firstChild.remove(); const d = document.createElement('div'); d.className = 'tst'; d.textContent = t; $('toast').appendChild(d); setTimeout(() => d.remove(), 4000); }
// clicking the bulb
$('bulb').addEventListener('click', e => {
    const n = perClick(); earn(n); S.clicks++; S.clickMade += n; sfx(500 + Math.random() * 200, .07, 'triangle', 900);
    const wrap = $('bulbwrap'), r = wrap.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    const p = document.createElement('div'); p.className = 'pop'; p.textContent = '+' + fmt(n, 1); p.style.left = (x - 20) + 'px'; p.style.top = (y - 20) + 'px'; wrap.appendChild(p); setTimeout(() => p.remove(), 1000);
    for (let i = 0; i < 4; i++) { const c = document.createElement('div'); c.className = 'crumb'; c.style.left = x + 'px'; c.style.top = y + 'px'; wrap.appendChild(c); const a = Math.random() * 6.28, d = 40 + Math.random() * 50;
        c.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d + 60}px)`, opacity: 0 }], { duration: 700, easing: 'ease-out' }).onfinish = () => c.remove(); }
    paintBank();
});
// the store
document.querySelectorAll('#buyamt button').forEach(b => b.onclick = () => { S.amt = +b.dataset.a; paintStore(); });
function paintStore() {
    document.querySelectorAll('#buyamt button').forEach(b => b.classList.toggle('on', +b.dataset.a === S.amt));
    let h = '', shown = 0;
    B.forEach((b, i) => {
        const c = costOf(b, S.amt), can = S.bulbs >= c, seen = i === 0 || own(B[i - 1][0]) > 0 || S.allTime >= b[3] * .6 || own(b[0]) > 0;
        if (!seen && shown++ > 1) return;
        h += `<div class="bld ${can ? '' : 'no'} ${seen ? '' : 'hid'}" data-b="${i}"><div class="ic">${seen ? b[2] : '❔'}</div><div><b>${seen ? b[1] : '???'}</b><span class="cost ${can ? '' : 'no'}">💡 ${fmt(c)}</span><small>${seen ? fmt(rateOf(b) * mult(), 1) + ' per second each' : ''}</small></div><div class="n">${own(b[0]) || ''}</div></div>`;
    });
    $('store').innerHTML = h;
}
$('store').addEventListener('click', e => {
    const el = e.target.closest('.bld'); if (!el) return; const b = B[+el.dataset.b], c = costOf(b, S.amt);
    if (S.bulbs < c) { sfx(140, .12, 'square'); return; }
    S.bulbs -= c; S.owned[b[0]] = own(b[0]) + S.amt; sfx(700, .12, 'triangle', 1100); checkAchs(); paintAll();
});
function paintUps() {
    const L = UPS.filter(u => !has(u.id) && u.need()).sort((a, b) => a.cost - b.cost).slice(0, 28);
    $('upgrades').innerHTML = L.map(u => `<div class="up ${S.bulbs >= u.cost ? 'ok' : ''}" data-u="${u.id}">${u.ic}</div>`).join('') || '<span style="color:var(--dim);font-size:13px">Keep baking: new upgrades show up here.</span>';
}
$('upgrades').addEventListener('click', e => {
    const el = e.target.closest('.up'); if (!el) return; const u = UPS.find(x => x.id === el.dataset.u); if (!u || S.bulbs < u.cost) { sfx(140, .12, 'square'); return; }
    S.bulbs -= u.cost; S.ups.push(u.id); sfx(900, .25, 'triangle', 1500); hideTip(); checkAchs(); paintAll();
});
// tooltips
function showTip(e, html) { const t = $('tip'); t.innerHTML = html; t.classList.remove('hidden'); const x = Math.min(innerWidth - 320, e.clientX + 14), y = Math.min(innerHeight - t.offsetHeight - 10, e.clientY + 14); t.style.left = x + 'px'; t.style.top = y + 'px'; }
function hideTip() { $('tip').classList.add('hidden'); }
document.addEventListener('mousemove', e => {
    const u = e.target.closest && e.target.closest('.up'), b = e.target.closest && e.target.closest('.bld'), a = e.target.closest && e.target.closest('.ach');
    if (u) { const x = UPS.find(z => z.id === u.dataset.u); showTip(e, `<b>${x.n}</b><br>💡 ${fmt(x.cost)}<br>${x.d}`); }
    else if (b) { const x = B[+b.dataset.b]; showTip(e, `<b>${x[1]}</b> (${own(x[0])} owned)<br>Each bakes <b>${fmt(rateOf(x) * mult(), 1)}</b>/s; all together ${fmt(rateOf(x) * mult() * own(x[0]), 1)}/s<q>${x[5]}</q>`); }
    else if (a) { const x = ACHS.find(z => z.id === a.dataset.a); showTip(e, `<b>${x.n}</b><br>${S.achs.includes(x.id) ? 'Done! +1% bulbs' : 'Not yet'}`); }
    else hideTip();
});
function paintBank() { $('bank').innerHTML = fmt(S.bulbs) + ' bulbs<small>per second: ' + fmt(bps(), 1) + '</small>'; document.title = fmt(S.bulbs) + ' bulbs - Edible Light Bulb Clicker'; }
function paintStats() {
    $('stats').innerHTML = `Bulbs baked this wiring: <b>${fmt(S.total)}</b><br>All time: <b>${fmt(S.allTime)}</b><br>Per click: <b>${fmt(perClick(), 1)}</b> · clicks: <b>${fmt(S.clicks)}</b><br>Golden bulbs caught: <b>${S.golden}</b><br>Filaments: <b>${S.fil}</b> (+${S.fil * 2}%) · rewired ${S.rewires} times<br>Lemonade: <b>+${S.achs.length * (has('lemon') ? 2 : 1)}%</b> from achievements`;
    $('achs').innerHTML = ACHS.map(a => `<div class="ach ${S.achs.includes(a.id) ? 'got' : ''}" data-a="${a.id}">${a.ic}</div>`).join('');
    $('achn').textContent = S.achs.length + ' / ' + ACHS.length;
    $('juice').style.height = Math.min(45, S.achs.length / ACHS.length * 45) + '%';
    $('buffs').innerHTML = (buff('frenzy') ? `<span class="buff">⚡ Frenzy x7 · ${Math.ceil((BUFFS.frenzy - performance.now()) / 1000)}s</span>` : '') + (buff('storm') ? `<span class="buff">🌩️ Click storm · ${Math.ceil((BUFFS.storm - performance.now()) / 1000)}s</span>` : '');
    const fil = filamentsFor(); $('rewire').textContent = '🔌 Rewire' + (fil > 0 ? ' (+' + fil + ' filaments)' : '...');
}
function paintAll() { paintBank(); paintStore(); paintUps(); paintStats(); }
// rewiring: start over for filaments (one per trillion baked this wiring, cube-root scaled)
const filamentsFor = () => Math.floor(Math.cbrt(S.total / 1e12));
$('rewire').onclick = () => {
    const f = filamentsFor();
    modal(`<h2>🔌 Rewire?</h2><p>Start over with nothing but your achievements, filaments and all-time total.</p><p>You would get <b>${f}</b> filament${f === 1 ? '' : 's'} (each +2% bulbs forever). You get 1 for a trillion bulbs baked this wiring, 2 for 8 trillion, 3 for 27 trillion...</p>`,
        f > 0 ? [['Rewire', () => { S = Object.assign(S0(), { allTime: S.allTime, achs: S.achs, fil: S.fil + f, rewires: S.rewires + 1, golden: S.golden, clicks: S.clicks, start: S.start }); checkAchs(); save(); paintAll(); toast('🔌 Rewired! +' + f + ' filaments'); }], ['Not yet']] : [['Not yet']]);
};
$('reset').onclick = () => modal('<h2>Wipe your save?</h2><p>Everything goes: bulbs, buildings, achievements, filaments.</p>', [['Wipe it', () => { S = S0(); save(); paintAll(); }], ['Keep it']]);
function modal(html, btns) {
    const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = `<div class="box">${html}<div style="margin-top:14px">${btns.map((b, i) => `<button class="btn" data-i="${i}">${b[0]}</button>`).join(' ')}</div></div>`;
    document.body.appendChild(m); m.querySelectorAll('button').forEach(b => b.onclick = () => { m.remove(); const f = btns[+b.dataset.i][1]; if (f) f(); });
}
// ---- the loop ----
let last = performance.now(), paintT = 0, newsT = 0, saveT = 0, achT = 0;
function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(1, (now - last) / 1000); last = now;
    earn(bps() * dt);
    if (now > goldenT) { goldenT = now + (has('lucky') ? .5 : 1) * (70000 + Math.random() * 110000); if (!$('golden')) spawnGolden(); }
    if ((paintT -= dt) <= 0) { paintT = .25; paintBank(); }
    if ((achT -= dt) <= 0) { achT = 1; checkAchs(); paintStore(); paintUps(); paintStats(); }
    if ((newsT -= dt) <= 0) { newsT = 12; $('news').textContent = '📰 ' + NEWS[Math.floor(Math.random() * NEWS.length)]; }
    if ((saveT -= dt) <= 0) { saveT = 10; save(); }
}
// away: half your rate, up to 8 hours
(function offline() {
    const away = Math.min(8 * 3600, (Date.now() - (S.last || Date.now())) / 1000);
    if (away > 60) { const g = bps() / (buff('frenzy') ? 7 : 1) * away * .5; if (g > 0) { earn(g); setTimeout(() => modal(`<h2>Welcome back!</h2><p>While you were away (${Math.round(away / 60)} min) your bakers made <b>${fmt(g)}</b> bulbs.</p>`, [['Yum']]), 300); } }
})();
addEventListener('pagehide', save); addEventListener('beforeunload', save);
paintAll(); requestAnimationFrame(tick);
// tests
Object.assign(window.__bulb, { bps, perClick, costOf, B, UPS, ACHS, earn, mult, spawnGolden, paintAll, filamentsFor, save });
