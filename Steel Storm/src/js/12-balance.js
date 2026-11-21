// ============================================================
// BALANCE (moved out of 10-data.js in 3.0 so 11-nations.js can add its vehicles first): class/tier stats, battle ratings, modules.
// ============================================================
// The numbers above give each vehicle its looks and character; its strength comes from here.
// BALANCE: one row per class, one column per tier (index = tier I..V): hit points, armour, top speed and the main weapon's damage per
// second. Every tier is a clear step up (about +30% hp and dps, more armour). The class rows give each branch its job:
//   light tanks fast scouts (thin armour), medium tanks all-rounders, heavy tanks tough and slow, tank destroyers the hardest-hitting
//   guns, anti-air shreds aircraft, artillery hits from far away; fighters win air fights, attackers kill tanks, bombers delete ground
//   targets, helicopters hover and fire guided missiles; patrol boats are quick, destroyers/cruisers/battleships scale up guns and
//   hit points, submarines ambush with torpedoes.
const INF_ROLE = { rif: 'Long-range rifle: few, deadly shots', smg: 'Close quarters: a hail of bullets', mg: 'Holds ground: a long belt of fire', at: 'Kills tanks with a launcher or anti-tank rifle' };
const BALANCE = {
    lt:   { hp: [0, 220, 300, 400, 520, 680],   ar: [0, 8, 14, 24, 36, 50],    sp: [0, 17, 18.5, 20, 21.5, 23],  dps: [0, 24, 31, 40, 52, 68] },
    mt:   { hp: [0, 320, 420, 550, 720, 940],   ar: [0, 20, 34, 50, 70, 95],   sp: [0, 12, 13.5, 15, 16.5, 18],  dps: [0, 24, 31, 41, 54, 70] },
    ht:   { hp: [0, 0, 560, 760, 1020, 1360],   ar: [0, 0, 55, 82, 118, 160],  sp: [0, 0, 9.5, 9.5, 9.5, 10],    dps: [0, 0, 28, 37, 49, 64] },
    td:   { hp: [0, 0, 380, 500, 660, 860],     ar: [0, 0, 45, 60, 85, 110],   sp: [0, 0, 11, 11, 11.5, 12],     dps: [0, 0, 36, 48, 64, 84] },
    spaa: { hp: [0, 0, 300, 400, 520, 680],     ar: [0, 0, 10, 22, 36, 50],    sp: [0, 0, 16, 16, 16.5, 17],     dps: [0, 0, 80, 120, 180, 250] },
    arty: { hp: [0, 0, 0, 460, 600, 780],       ar: [0, 0, 0, 22, 32, 42],     sp: [0, 0, 0, 12, 13, 14],        dps: [0, 0, 0, 32, 40, 50] },
    ftr:  { hp: [0, 170, 220, 290, 380, 500],   ar: [0, 0, 1, 3, 8, 12],       sp: [0, 82, 100, 125, 155, 172],  dps: [0, 67, 95, 135, 190, 250] },
    atk:  { hp: [0, 210, 330, 460, 620, 800],   ar: [0, 3, 10, 18, 24, 30],    sp: [0, 70, 80, 105, 135, 150],   dps: [0, 44, 70, 110, 160, 210] },
    bmb:  { hp: [0, 0, 380, 560, 800, 1050],    ar: [0, 0, 8, 14, 20, 26],     sp: [0, 0, 68, 98, 120, 132],     dps: [0, 0, 44, 80, 110, 135] },
    heli: { hp: [0, 0, 360, 520, 690, 880],     ar: [0, 0, 6, 14, 20, 28],     sp: [0, 0, 52, 58, 64, 70],       dps: [0, 0, 50, 95, 145, 200] },
    pb:   { hp: [0, 420, 560, 720, 900, 1100],  ar: [0, 12, 18, 24, 32, 40],   sp: [0, 13, 16, 19, 20, 21],      dps: [0, 19, 26, 33, 42, 52] },
    dd:   { hp: [0, 0, 900, 1200, 1600, 2150],  ar: [0, 0, 30, 42, 56, 72],    sp: [0, 0, 13.5, 15, 16, 17],     dps: [0, 0, 57, 75, 96, 125] },
    cl:   { hp: [0, 0, 0, 1600, 2350, 3200],    ar: [0, 0, 0, 62, 86, 112],    sp: [0, 0, 0, 10.5, 12, 12.5],    dps: [0, 0, 0, 95, 128, 165] },
    bb:   { hp: [0, 0, 1000, 1900, 3000, 4400], ar: [0, 0, 48, 75, 110, 160],  sp: [0, 0, 6.5, 7.5, 8, 8],       dps: [0, 0, 34, 70, 120, 150] },
    ss:   { hp: [0, 0, 450, 620, 840, 1100],    ar: [0, 0, 8, 14, 20, 28],     sp: [0, 0, 12, 13, 14, 15],       dps: [0, 0, 15, 19, 22, 40] }
};
// per-shot damage of the special weapons by tier (rockets, bombs, guided missiles, torpedoes); bombers carry heavier bombs
const ORD = { rocket: [0, 45, 55, 68, 82, 100], bomb: [0, 160, 200, 250, 310, 380], atgm: [0, 140, 160, 185, 215, 250], aam: [0, 90, 100, 110, 125, 140],
    sam: [0, 140, 155, 170, 185, 200], ashm: [0, 250, 280, 310, 350, 390], torp: [0, 220, 270, 320, 380, 450] };
const ORD_CLS = { bmb: 1.15, atk: .9 };
const RL_K = [1, 1, .96, .92, .88, .84];         // main weapon reload by tier (higher tiers reload a little faster)
// two vehicles of one class and tier trade strengths (multipliers on the BALANCE row); no vehicle is strictly worse than its sibling
const CHAR = {
    g2a: { ar: .75, sp: 1.05 }, g2b: { ar: 1.05 }, g3c: { sp: .95, dps: 1.05 }, g4a: { hp: 1.1, sp: .9 }, g4b: { sp: 1.15, ar: .9 }, g4c: { sp: 1.1, hp: .9 },
    g4d: { hp: 1.1, ar: 1.1, sp: .95 }, g5b: { ar: 1.1 }, g5d: { hp: .85, ar: .6, sp: 1.6, dps: 1.05 },
    a2a: { sp: .95, hp: .95, dps: 1.05 }, a2b: { sp: 1.1, hp: 1.05, ar: 1.3 }, a3a: { hp: 1.1, ar: 1.2 }, a3c: { sp: 1.2, hp: .9, dps: 1.1 },
    a4a: { hp: 1.1, ar: 1.2 }, a4c: { sp: .95, ar: .8, dps: 1.05 }, a5a: { hp: 1.05 }, a5b: { ar: 1.15, hp: .95 },
    a3d: { dps: 1.15, sp: .95 }, a4b: { hp: 1.1, ar: .9 }, a4d: { sp: 1.05, dps: 1.1 },
    n1a: { sp: 1.1, hp: .95 }, n1b: { hp: 1.1, ar: 1.15, sp: .9 }, n2a: { hp: 1.1, ar: 1.2, dps: 1.1 }, n2d: { hp: .85, ar: .6, sp: 1.4, dps: .85 },
    n3a: { dps: 1.1, ar: 1.05 }, n3e: { sp: 1.05 }, n3b: { sp: 1.05 }, n3c: { hp: 1.1, ar: 1.1, sp: .85 }, n3d: { sp: 1.2, ar: .6 },
    n4a: { sp: 1.05, hp: .92 }, n4b: { hp: 1.1, ar: 1.15, sp: .9 }
};
const ROLE = { lt: 'Fast scout: spots and flanks, thin armour', mt: 'All-rounder: good gun, armour and speed', ht: 'Tough and slow: soaks up hits up front',
    td: 'Hardest-hitting gun on land, weak turret traverse', spaa: 'Shreds aircraft, weak against tanks', arty: 'Long-range shells over hills, weak up close',
    ftr: 'Wins air fights: fast, agile, strong guns', atk: 'Tank killer: rockets and bombs, sturdy', bmb: 'Deletes ground targets with heavy bombs',
    heli: 'Hovers behind cover and fires guided missiles', pb: 'Quick and cheap: harass and torpedo', dd: 'Fast warship with torpedoes',
    cl: 'More guns and armour than a destroyer', bb: 'The biggest guns and the most hit points at sea', ss: 'Dives to hide, ambushes with torpedoes' };
function ordKind(w) { return w.k === 'missile' ? (w.air ? (w.n === 'SAM' ? 'sam' : 'aam') : w.sea ? 'ashm' : 'atgm') : w.k === 'torp' ? 'torp' : w.k; }
VEHS.forEach(v => {
    if (v.ln === 'i') { v.role = INF_ROLE[v.cls]; v.pw = 1; return; }      // soldiers carry real guns with their own numbers
    const B = BALANCE[v.cls], t = v.t, c = CHAR[v.id] || {}, w = v.w1, k = n => c[n] || 1;
    const sp0 = v.sp; v.hp = Math.round(B.hp[t] * k('hp')); v.ar = Math.round(B.ar[t] * k('ar')); v.sp = Math.round(B.sp[t] * k('sp') * 10) / 10;
    if (v.minSp) v.minSp = Math.round(v.minSp * v.sp / sp0);
    w.rl = Math.round(w.rl * RL_K[t] * 1000) / 1000;
    const dmg = B.dps[t] * k('dps') * w.rl / (w.nn || 1); w.dmg = w.k === 'bullet' ? Math.round(dmg * 10) / 10 : Math.round(dmg);
    if (w.k !== 'bullet') w.sp = Math.max(w.sp || 0, w.arty ? 6 + w.dmg / 45 : v.ln === 'n' && w.k === 'shell' ? 5 + w.dmg / 28 : 2 + w.dmg / 35);       // blast radius follows the calibre
    for (const s of ['w2', 'w3']) { const x = v[s], o = x && x.cnt && ORD[ordKind(x)]; if (o) x.dmg = Math.round(o[t] * (x.k === 'bomb' ? ORD_CLS[v.cls] || 1 : 1)); }
    v.role = ROLE[v.cls]; v.pw = k('hp') * k('dps') * Math.sqrt(k('ar') * k('sp'));
});
const BR_ADJ = { lt: 0, mt: 0, ht: .3, td: .2, spaa: -.2, arty: 0, ftr: 0, atk: -.1, bmb: .1, heli: 0, pb: -.2, dd: 0, cl: .2, bb: .4, ss: .1 };
const VBY = {};
function calcDps(v) { let dps = 0; for (const k of ['w1', 'w2', 'w3']) { const w = v[k]; if (w) dps += w.dmg * (w.nn || 1) / Math.max(0.04, w.rl) * (w.sp ? 1.6 : 1); } return dps; }
VEHS.forEach((v, i) => {
    v.i = i; VBY[v.id] = v;
    const idx = VEHS.filter(o => o.ln === v.ln && o.t === v.t).indexOf(v);
    const cheap = v.ln === 'i' ? .35 : 1;      // soldiers cost about a third of a vehicle of the same tier
    v.rp = v.t === 1 ? 0 : Math.round(RP_COST[v.t] * cheap * (1 + idx * 0.04) / 10) * 10;
    v.cost = v.t === 1 ? 0 : Math.round(CR_COST[v.t] * cheap * (1 + idx * 0.04) / 50) * 50;
    v.br = Math.round((v.t + (BR_ADJ[v.cls] || 0) + clamp((v.pw - 1) * 1.5, -.2, .3)) * 10) / 10;      // battle rating follows strength
    v.maxDps = calcDps(v);      // top damage per second, used by the host to sanity-check hits
});
const TIER_ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
const MAX_TIER = 5;
// ---------- modules: 5 per vehicle, researched with RP once you own the vehicle, installed automatically ----------
const MOD_DEFS = {
    g: [['eng', 'Engine', '+15% top speed, quicker turns'], ['arm', 'Armour kit', '+25% armour, +8% hit points (skirts + plates)'], ['gun', 'Gun upgrade', '+12% main weapon damage'], ['ammo', 'AP ammunition', 'Main weapon ignores 30% more armour'], ['stab', 'Stabiliser', 'Turret +25% faster, 60% tighter spread']],
    a: [['eng', 'Engine', '+10% top speed, +8% turn rate'], ['arm', 'Armour plates', '+12% hit points, +4 armour'], ['gun', 'Gun pods', '+15% gun damage'], ['ord', 'Ordnance racks', '+50% rockets / bombs / missiles'], ['cm', 'Countermeasures', 'Flares (F) that decoy missiles']],
    i: [['eng', 'Fitness', '+12% running speed'], ['arm', 'Body armour', '+8% hit points'], ['gun', 'Hot loads', '+12% damage per shot'], ['ammo', 'Armour-piercing rounds', 'Shots ignore 30% more armour'], ['stab', 'Marksmanship', 'Much tighter spread']],
    n: [['eng', 'Turbines', '+12% top speed'], ['arm', 'Belt armour', '+20% armour, +8% hit points'], ['gun', 'Fire control', '-12% main gun reload'], ['ammo', 'AP shells', 'Main guns ignore 30% more armour'], ['radar', 'Radar', '+25% turret speed, spots dived submarines']]
};
const MODS = [], MODBY = {};
const MOD_FRAC = [.25, .3, .35, .25, .3];
VEHS.forEach(v => MOD_DEFS[v.ln].forEach(([k, n, desc], bit) => {
    const m = { id: v.id + '.' + k, v: v.id, k, n, desc, bit, rp: Math.round((v.rp || 250) * MOD_FRAC[bit] / 10) * 10 };
    MODS.push(m); MODBY[m.id] = m; (v.mods = v.mods || []).push(m);
}));
// a vehicle definition with modules applied (cached). def.i / def.id stay the base vehicle's so the network and saves keep working.
const DEFC = {};
function vdef(id, mask) {
    const b = typeof id === 'number' ? VEHS[id] : VBY[id]; if (!b) return VBY.g1a;
    mask = mask | 0; if (!mask) return b;
    const key = b.id + '|' + mask; if (DEFC[key]) return DEFC[key];
    const d = Object.assign({}, b), has = k => { const m = b.mods.find(x => x.k === k); return m && (mask & (1 << m.bit)); };
    for (const s of ['w1', 'w2', 'w3']) if (b[s]) d[s] = Object.assign({}, b[s]);
    d.mask = mask; d.base = b;
    if (has('eng')) { const k = b.ln === 'g' ? 1.15 : b.ln === 'a' ? 1.1 : 1.12; d.sp *= k; if (d.tn) d.tn *= 1.1; if (d.turn) d.turn *= 1.08; }
    if (has('arm')) { if (b.ln === 'a') { d.hp = Math.round(d.hp * 1.12); d.ar += 4; } else { d.ar = Math.round(d.ar * (b.ln === 'g' ? 1.25 : 1.2)); d.hp = Math.round(d.hp * 1.08); } d.kit = true; }
    if (has('gun')) { if (b.ln === 'n') d.w1.rl *= .88; else d.w1.dmg = Math.round(d.w1.dmg * (b.ln === 'a' ? 1.15 : 1.12) * 10) / 10; }
    if (has('ammo')) d.w1.pierce = (d.w1.pierce || 0) + .3;
    if (has('stab')) { d.tt *= 1.25; d.w1.spread = (d.w1.spread || .004) * .4; if (d.w1.sprd) d.w1.sprd *= .5; d.stab = true; }
    if (has('ord')) for (const s of ['w2', 'w3']) if (d[s] && d[s].cnt) d[s].cnt = Math.ceil(d[s].cnt * 1.5);
    if (has('cm')) d.flares = true;
    if (has('radar')) { d.tt *= 1.25; d.radar = true; }
    d.maxDps = calcDps(d);
    return DEFC[key] = d;
}
function modMask(id) { const v = VBY[id]; if (!v || !save) return 0; let m = 0; for (const x of v.mods) if (save.mods[x.id]) m |= 1 << x.bit; return m; }
const popc = m => { let n = 0; while (m) { n += m & 1; m >>= 1; } return n; };
function brOf(d) { return Math.round(((d.base || d).br + popc(d.mask || 0) * .1) * 10) / 10; }
function vStats(v) {
    const w = v.w1, s = [['Class', CLS_NAME[v.cls] || ''], ['Battle rating', brOf(v).toFixed(1)], ['Hit points', v.hp], ['Armor', v.ar], ['Top speed', Math.round(v.sp * 3.6) + ' km/h']];
    s.push([w.n, w.dmg + (w.nn > 1 ? ' x' + w.nn : '') + ' dmg']);
    if (w.k === 'bullet') s.push(['Rate of fire', Math.round(1 / w.rl) + '/s']); else s.push(['Reload', (w.rl).toFixed(1) + ' s']);
    for (const k of ['w2', 'w3']) { const x = v[k]; if (x && x.cnt) s.push([x.n, x.cnt + ' x ' + x.dmg]); else if (x && v.ln !== 'g') s.push([x.n, x.dmg + ' dmg']); }
    return s;
}
// ---------- research / purchase rules (vehicle ids and module ids "veh.key" share the same RP pool) ----------
function isResearched(id) { return MODBY[id] ? !!save.mods[id] : !!save.researched[id]; }
function isOwned(id) { return !!save.owned[id]; }
function canResearch(id) {
    const md = MODBY[id]; if (md) return !save.mods[id] && isOwned(md.v);
    const v = VBY[id]; return !!v && !isResearched(id) && (!v.req || isResearched(v.req));
}
function rpNeed(id) { return MODBY[id] ? MODBY[id].rp : VBY[id].rp; }
function rpOf(id) { return save.rp[id] || 0; }
function finishResearch(id) {
    if (MODBY[id]) { save.mods[id] = true; delete save.rp[id]; return MODBY[id].n + ' installed on ' + VBY[MODBY[id].v].n + '!'; }
    save.researched[id] = true; delete save.rp[id]; return VBY[id].n + ' researched! Buy it with credits.';
}
function addRp(n) {      // match RP go to what is being researched, leftovers to free RP
    n = Math.round(n); if (n <= 0) return;
    const id = save.target;
    if (id && canResearch(id)) {
        const need = rpNeed(id) - rpOf(id), put = Math.min(need, n);
        save.rp[id] = rpOf(id) + put; n -= put;
        if (rpOf(id) >= rpNeed(id)) { toast(finishResearch(id)); save.target = null; }
    }
    save.freeRp += n;
}
function setTarget(id) { if (!canResearch(id)) return false; save.target = id; writeSave(); return true; }
function spendFreeRp(id) {
    if (!canResearch(id)) return false; const need = rpNeed(id) - rpOf(id), put = Math.min(need, save.freeRp);
    if (put <= 0) return false; save.freeRp -= put; save.rp[id] = rpOf(id) + put;
    if (rpOf(id) >= rpNeed(id)) { finishResearch(id); if (save.target === id) save.target = null; }
    writeSave(); return true;
}
function buyVeh(id) {
    const v = VBY[id]; if (!v || !isResearched(id) || isOwned(id) || save.credits < v.cost) return false;
    save.credits -= v.cost; save.owned[id] = true; if (save.lineup.length < 5) save.lineup.push(id); writeSave(); return true;
}
function lineupToggle(id) {
    const i = save.lineup.indexOf(id);
    if (i >= 0) { if (save.lineup.length > 1) save.lineup.splice(i, 1); }
    else if (isOwned(id) && save.lineup.length < 5) save.lineup.push(id);
    else return false;
    save.sel = clamp(save.sel, 0, save.lineup.length - 1); writeSave(); return true;
}
function lineupBr() { return Math.max(1, ...save.lineup.map(id => VBY[id] ? brOf(vdef(id, modMask(id))) : 1)); }
