// ==========================================
// SOVEREIGN INTERPLANETARY: the simulation. One tick = one month.
// Every world runs the same economy. A world conquered by another keeps its own economy but sends most of its
// surplus to its ruler, and may rebel when unhappy. The AI rulers build, research, trade, make friends and wars.
// State (saved as sov.ip.save): IPG = { month, me, worlds[], fleets[], rel[][], pacts[], wars[], log[], vic, ... }
// ==========================================
let IPG = null;
const IP_RES = ['cr', 'met', 'ene', 'vol', 'fd', 'sci'];
const IP_RN = { cr: 'Credits', met: 'Metals', ene: 'Energy', vol: 'Volatiles', fd: 'Food', sci: 'Science' };
const IP_RI = { cr: '💰', met: '⛓️', ene: '⚡', vol: '💧', fd: '🌾', sci: '🔬' };
const IP_COLS = ['#f59e0b', '#facc15', '#3b82f6', '#ef4444', '#94a3b8', '#d97706', '#eab308', '#22d3ee', '#6366f1', '#f472b6', '#e2e8f0', '#f97316', '#a3a3a3'];
const IP_PERS = { mercury: 'trader', venus: 'trader', earth: 'balanced', mars: 'warlike', ceres: 'trader', jupiter: 'warlike', saturn: 'trader', uranus: 'scholar', neptune: 'warlike', pluto: 'scholar', haumea: 'trader', makemake: 'turtle', eris: 'warlike' };
const ipRng = () => IPG.rnd();
function ipMonthName(m) { const y = IP_YEAR0 + Math.floor(m / 12); return MONTHS[m % 12] + ' ' + y; }
function ipW(i) { return IPG.worlds[i]; }
const ipRuler = w => w.owner;                                 // who rules a world (its own index when free)
const ipRealm = r => IPG.worlds.filter(w => w.owner === r);   // every world ruled by r
const ipAlive = r => IPG.worlds[r].owner === r;              // a nation lives while it rules its own home
function ipRel(a, b) { return a === b ? 100 : IPG.rel[a][b]; }
function ipAddRel(a, b, d) { if (a === b) return; IPG.rel[a][b] = clamp(IPG.rel[a][b] + d, -100, 100); IPG.rel[b][a] = clamp(IPG.rel[b][a] + d, -100, 100); }
function ipPact(a, b, type) { return IPG.pacts.some(p => p.type === type && ((p.a === a && p.b === b) || (p.a === b && p.b === a))); }
function ipAtWar(a, b) { return IPG.wars.some(w => (w.a === a && w.b === b) || (w.a === b && w.b === a)); }
function ipAllies(a) { return IPG.pacts.filter(p => p.type === 'ally' && (p.a === a || p.b === a)).map(p => p.a === a ? p.b : p.a).filter(ipAlive); }
function ipTechDone(r, id) { return ipW(r).tech.done.includes(id); }
function ipTechSum(r, key) { let s = 0; for (const t of IP_TECH) if (t.fx[key] && ipTechDone(r, t.id)) s += t.fx[key]; return s; }
function ipLog(text, who) { IPG.log.unshift({ m: IPG.month, t: text, who: who == null ? -1 : who }); if (IPG.log.length > 80) IPG.log.length = 80; if (window.IPV && IPV.onLog) IPV.onLog(text, who); }

// ---- a new game ----
function ipNew(me, seed) {
    const rnd = makeRng(seed || (Math.random() * 1e9) | 0);
    IPG = { v: 1, seed, month: 0, me, rel: [], pacts: [], wars: [], log: [], fleets: [], fid: 1, vic: {}, wealthRun: 0, over: null, speed: 1, ark: false, notes: [] };
    Object.defineProperty(IPG, 'rnd', { value: rnd, enumerable: false, writable: true });
    IPG.worlds = IP_WORLDS.map((d, i) => ({
        i, id: d.id, name: d.name, owner: i, pop: d.pop, pop0: d.pop, cap: d.cap, res: { cr: 120 + d.pop * 0.02, met: 60, ene: 60, vol: 60, fd: 60, sci: 0 },
        bld: {}, ships: d.ships.slice(), def: d.def, happy: 60, stab: 62, tax: 0.25, bud: { ind: 30, sci: 20, mil: 25, wel: 25 }, tech: { done: [], cur: null, prog: 0 },
        q: [], last: {}, gdp: 0, ang0: rnd() * TAU, weary: 0, aiT: rnd() * 3 | 0, lowStab: 0
    }));
    const n = IP_WORLDS.length;
    for (let a = 0; a < n; a++) { IPG.rel[a] = []; for (let b = 0; b < n; b++) IPG.rel[a][b] = a === b ? 100 : Math.round((rnd() * 2 - 1) * 20); }
    // history: a few friendships and rivalries to start with
    const R = (a, b, v) => { const i = IP_WORLDS.findIndex(w => w.id === a), j = IP_WORLDS.findIndex(w => w.id === b); IPG.rel[i][j] = IPG.rel[j][i] = v; };
    R('earth', 'mars', -35); R('earth', 'venus', 25); R('mars', 'ceres', 30); R('jupiter', 'saturn', -25); R('saturn', 'uranus', 35); R('neptune', 'uranus', 20); R('pluto', 'eris', -30); R('jupiter', 'ceres', -20); R('mercury', 'venus', 30); R('earth', 'mercury', 20);
    const P = (a, b, type) => IPG.pacts.push({ a: IP_WORLDS.findIndex(w => w.id === a), b: IP_WORLDS.findIndex(w => w.id === b), type });
    P('earth', 'venus', 'trade'); P('mars', 'ceres', 'trade'); P('saturn', 'uranus', 'trade'); P('mercury', 'venus', 'trade'); P('saturn', 'uranus', 'nap');
    ipLog('The year is ' + IP_YEAR0 + '. You lead ' + IP_WORLDS[me].name + '.', me);
    for (const w of IPG.worlds) w.gdp = ipGdp(w);
    return IPG;
}
// ---- the economy of one world ----
function ipGdp(w) {
    const r = w.owner, happyF = 0.75 + w.happy / 200, out = 1 + ipTechSum(r, 'out') + (w.bud.ind - 25) / 150;
    return Math.pow(w.pop / 100, 0.75) * 10 * happyF * out;
}
function ipTradeIncome(w) {
    let s = 0; const r = w.owner; if (r !== w.i) return 0;
    for (const p of IPG.pacts) if (p.type === 'trade' && (p.a === r || p.b === r)) { const o = p.a === r ? p.b : p.a; if (!ipAlive(o) || ipAtWar(r, o)) continue; s += 0.06 * Math.min(w.gdp, ipW(o).gdp) + 2; }
    return s * (1 + ipTechSum(r, 'trade') + (w.bld.port || 0) * 0.12);
}
// what a world makes and needs in a month (also shown in the UI)
function ipFlows(w) {
    const d = IP_WORLDS[w.i], r = w.owner, sz = Math.sqrt(w.pop / w.pop0), outB = 1 + ipTechSum(r, 'out') + (w.bud.ind - 25) / 120;
    const f = { cr: 0, met: 0, ene: 0, vol: 0, fd: 0, sci: 0 }, need = { ene: 0, vol: 0, fd: 0 };
    for (const k of ['met', 'ene', 'vol', 'fd']) f[k] = d.out[k] * sz * outB;
    f.fd *= 1 + ipTechSum(r, 'fd'); f.ene += ipTechDone(r, 'dyson') && r === w.i ? 40 : 0;
    for (const b of IP_BUILD) { const n = w.bld[b.id] || 0; if (!n) continue; for (const k in b.fx) if (f[k] != null) f[k] += b.fx[k] * n * outB; if (b.use) for (const k in b.use) need[k] = (need[k] || 0) + b.use[k] * n; }
    need.fd += (w.pop / w.pop0) * d.out.fd * 0.88; need.ene += (w.pop / w.pop0) * d.out.ene * 0.5; need.vol += (w.pop / w.pop0) * d.out.vol * 0.35;
    const gdp = ipGdp(w), tax = gdp * w.tax, trade = ipTradeIncome(w);
    const upk = w.owner === w.i ? ipUpkeep(w.i) : 0;
    f.cr = tax * (1 - w.bud.sci / 100 - w.bud.wel / 100) + trade - upk;
    f.sci = ((w.bld.lab || 0) * 3 + tax * w.bud.sci / 100 * 0.8 + 1) * (1 + ipTechSum(r, 'sci'));
    return { f, need, gdp, tax, trade, upk };
}
function ipUpkeep(r) { let u = 0; for (const w of ipRealm(r)) u += w.ships[0] * IP_SHIPS[0].upk + w.ships[1] * IP_SHIPS[1].upk + w.ships[2] * IP_SHIPS[2].upk; for (const f of IPG.fleets) if (f.owner === r) u += f.ships[0] * 1 + f.ships[1] * 3 + f.ships[2] * 8; return u * 0.5; }
function ipMonthWorld(w) {
    const { f, need } = ipFlows(w), d = IP_WORLDS[w.i], R = w.res;
    let short = 0;
    for (const k of IP_RES) R[k] += f[k] - (need[k] || 0);
    for (const k of ['ene', 'vol', 'fd']) if (R[k] < 0) { R[k] = 0; short++; }
    if (R.cr < 0) { R.cr = 0; short++; w.stab -= 1; }
    // conquered: most of the surplus goes to the ruler
    if (w.owner !== w.i) { const ru = ipW(w.owner); for (const k of ['cr', 'met', 'ene', 'vol']) { const give = Math.max(0, R[k] - 40) * 0.6; R[k] -= give; ru.res[k] += give; } }
    // people
    const capM = w.cap * (1 + ipTechSum(w.owner, 'cap') + (w.bld.dome || 0) * 0.18 + (w.bld.terra || 0) * 0.35);
    const grow = R.fd > 0 && short === 0 ? 0.006 * (1 - w.pop / capM) * (w.happy / 60) : -0.004 * short;
    w.pop = Math.max(1, w.pop * (1 + grow)); w.capM = capM;
    // mood
    const war = IPG.wars.filter(x => x.a === w.owner || x.b === w.owner).length;
    const happyT = 52 + (w.bud.wel - 25) * 0.6 - (w.tax - 0.25) * 140 + ipTechSum(w.owner, 'happy') + (w.bld.terra || 0) * 6 - short * 8 - war * 4 - w.weary * 0.2 + (w.owner !== w.i ? -15 : 0) + (w.boost || 0);
    w.happy = clamp(w.happy + (happyT - w.happy) * 0.12, 0, 100); w.boost = (w.boost || 0) * 0.85;
    const stabT = 30 + w.happy * 0.55 - war * 4 + (w.bud.mil - 25) * 0.2;
    w.stab = clamp(w.stab + (stabT - w.stab) * 0.1, 0, 100);
    w.gdp = ipGdp(w); w.last = { f, need, short };
    // research (rulers only: conquered worlds add their science to their ruler's)
    if (w.owner === w.i) ipResearch(w, R.sci); else ipW(w.owner).res.sci += R.sci;
    R.sci = 0;
    // building queue
    const slots = 1 + (w.bld.yard || 0);
    for (const it of w.q.slice(0, slots)) { it.left--; if (it.left <= 0) ipFinish(w, it); }
    w.q = w.q.filter(it => it.left > 0);
    // home defences slowly repair, wear down in long wars
    const defMax = d.def + (w.bld.grid || 0) * 12 + ipTechSum(w.owner, 'def');
    w.defMax = defMax; w.def = Math.min(defMax, w.def + defMax * 0.04 * (w.bud.mil / 25));
    // rebellions
    if (w.owner !== w.i && w.stab < 22 && ipRng() < 0.08) { const old = w.owner; ipFree(w); ipLog('🔥 ' + w.name + ' rebels against ' + ipW(old).name + ' and is free again!', w.i); }
    if (w.i === IPG.me && w.owner === w.i) { w.lowStab = w.stab < 8 ? w.lowStab + 1 : 0; }
}
function ipResearch(w, sci) {
    const T = w.tech; if (!T.cur) return; T.prog += sci;
    const t = IP_TECH.find(x => x.id === T.cur);
    if (T.prog >= t.cost) { T.done.push(t.id); T.prog -= t.cost; T.cur = null; if (t.fx.rel) for (const o of IPG.worlds) if (o.i !== w.i) ipAddRel(w.i, o.i, 4 * t.fx.rel); if (w.i === IPG.me) { ipLog('🔬 Research done: ' + t.n + '. ' + t.d, w.i); if (window.IPV) IPV.techDone(t); } }
}
// ---- building ----
function ipCostOf(w, kind, id) {
    if (kind === 'ship') { const s = IP_SHIPS.find(x => x.id === id), m = (1 - 0.1 * Math.min(3, w.bld.yard || 0)) * (1 - ipTechSum(w.owner, 'ship')); const c = {}; for (const k in s.cost) c[k] = Math.round(s.cost[k] * m); return c; }
    const b = IP_BUILD.find(x => x.id === id), n = (w.bld[id] || 0) + w.q.filter(q => q.id === id).length, c = {};
    for (const k in b.cost) c[k] = Math.round(b.cost[k] * Math.pow(1.35, n)); return c;
}
function ipCanPay(w, cost) { const R = ipW(w.owner).res, L = w.res; for (const k in cost) if ((k === 'cr' ? R.cr : L[k] + (w.owner !== w.i ? 0 : 0)) < cost[k]) return false; return true; }
function ipPay(w, cost) { const R = ipW(w.owner).res; for (const k in cost) { if (k === 'cr') R.cr -= cost[k]; else w.res[k] -= cost[k]; } }
function ipQueue(w, kind, id) {
    if (kind === 'ship') { const s = IP_SHIPS.find(x => x.id === id); if (s.tech && !ipTechDone(w.owner, s.tech)) return 'Needs ' + IP_TECH.find(t => t.id === s.tech).n + '.'; }
    else { const b = IP_BUILD.find(x => x.id === id); if (b.only && !b.only.includes(w.id)) return 'Only on ' + b.only.join(', ') + '.'; }
    if (w.q.length >= 6) return 'The build list is full (6).';
    const cost = ipCostOf(w, kind, id); if (!ipCanPay(w, cost)) return 'Not enough: ' + Object.entries(cost).map(([k, v]) => IP_RI[k] + v).join(' ');
    ipPay(w, cost);
    w.q.push({ kind, id, left: kind === 'ship' ? { frig: 2, crui: 4, drea: 7 }[id] : id === 'terra' ? 12 : 3, tot: 0 }); w.q[w.q.length - 1].tot = w.q[w.q.length - 1].left;
    return '';
}
function ipFinish(w, it) {
    if (it.kind === 'ship') w.ships[IP_SHIPS.findIndex(s => s.id === it.id)]++;
    else { w.bld[it.id] = (w.bld[it.id] || 0) + 1; if (it.id === 'grid') w.def += 12; }
    if (w.owner === IPG.me) ipLog('🏗️ ' + w.name + ': ' + (it.kind === 'ship' ? IP_SHIPS.find(s => s.id === it.id).n : IP_BUILD.find(b => b.id === it.id).n) + ' finished.', w.i);
}
// ---- fleets and battles ----
// where a world is (AU, in the plane), month m
function ipPos(i, m) { const d = IP_WORLDS[i], w = IPG.worlds[i], a = w.ang0 + TAU * (m / 12) / d.per; return [Math.cos(a) * d.a, Math.sin(a) * d.a]; }
function ipDist(a, b, m) { const p = ipPos(a, m), q = ipPos(b, m); return Math.hypot(p[0] - q[0], p[1] - q[1]); }
function ipTravel(owner, a, b) { return Math.max(1, Math.round((1 + 1.6 * Math.sqrt(ipDist(a, b, IPG.month))) / (1 + ipTechSum(owner, 'travel')))); }
function ipPower(owner, ships) { return (ships[0] * IP_SHIPS[0].pow + ships[1] * IP_SHIPS[1].pow + ships[2] * IP_SHIPS[2].pow) * (1 + ipTechSum(owner, 'pow')); }
function ipNavy(r) { let s = 0; for (const w of ipRealm(r)) s += ipPower(r, w.ships); for (const f of IPG.fleets) if (f.owner === r) s += ipPower(r, f.ships); return s; }
function ipSend(from, to, ships, mission) {
    const w = ipW(from), r = w.owner;
    for (let k = 0; k < 3; k++) { ships[k] = clamp(ships[k] | 0, 0, w.ships[k]); }
    if (!ships.some(x => x > 0)) return 'Pick some ships.';
    if (mission === 'attack' && !ipAtWar(r, ipW(to).owner)) return 'You are not at war with ' + ipW(ipW(to).owner).name + '.';
    for (let k = 0; k < 3; k++) w.ships[k] -= ships[k];
    const t = ipTravel(r, from, to);
    IPG.fleets.push({ id: IPG.fid++, owner: r, ships, from, to, dep: IPG.month, arr: IPG.month + t, mission });
    return '';
}
function ipFleetsMonth() {
    for (const f of IPG.fleets.slice()) {
        if (IPG.month < f.arr) continue;
        IPG.fleets.splice(IPG.fleets.indexOf(f), 1);
        const w = ipW(f.to), defR = w.owner;
        if (!ipAlive(f.owner)) continue;
        if (defR === f.owner || ipPact(defR, f.owner, 'ally') && f.mission !== 'attack') { for (let k = 0; k < 3; k++) w.ships[k] += f.ships[k]; if (defR !== f.owner) ipLog('🛸 ' + ipW(f.owner).name + ' fleet arrives to guard ' + w.name + '.', f.owner); continue; }
        if (!ipAtWar(f.owner, defR)) { const home = ipW(f.from); const back = home.owner === f.owner ? home : ipW(f.owner); for (let k = 0; k < 3; k++) back.ships[k] += f.ships[k]; continue; }
        ipBattle(f, w);
    }
}
function ipBattle(f, w) {
    const A = f.owner, D = w.owner, att = ipPower(A, f.ships) * (0.85 + ipRng() * 0.3), dfl = ipPower(D, w.ships), dd = w.def * (1 + ipTechSum(D, 'def') / 50), def = (dfl + dd * 0.5) * (0.85 + ipRng() * 0.3);
    const ratio = att / Math.max(0.1, def);
    const lossA = clamp(0.6 / ratio, 0.05, 1), lossD = clamp(0.55 * ratio, 0.05, 1);
    for (let k = 0; k < 3; k++) { f.ships[k] = Math.max(0, Math.round(f.ships[k] * (1 - lossA))); w.ships[k] = Math.max(0, Math.floor(w.ships[k] * (1 - lossD))); }
    w.def = Math.max(0, w.def * (1 - lossD * 0.8));
    const an = ipW(A).name, dn = ipW(D).name;
    if (ratio > 1.15 && f.ships.some(x => x > 0)) {
        ipLog('⚔️ ' + an + ' wins the battle of ' + w.name + ' and takes it from ' + dn + '!', A);
        ipConquer(w, A); for (let k = 0; k < 3; k++) w.ships[k] += f.ships[k];
        ipW(A).weary = Math.max(0, ipW(A).weary - 5);
    } else {
        ipLog('⚔️ ' + dn + ' holds ' + w.name + ' against ' + an + '.', D);
        if (f.ships.some(x => x > 0)) { const home = ipW(f.owner); for (let k = 0; k < 3; k++) home.ships[k] += f.ships[k]; }
        ipW(A).weary += 8; ipW(D).weary += 3;
    }
    if (window.IPV) IPV.battle(w.i, ratio > 1.15);
}
function ipConquer(w, by) {
    const old = w.owner; w.owner = by; w.q = []; w.happy = Math.min(w.happy, 35); w.stab = 30;
    // a nation that loses its home falls: its other worlds go free, its fleets disband, its wars and pacts end
    if (old === w.i) {
        for (const o of IPG.worlds) if (o.owner === old && o.i !== w.i) ipFree(o);
        IPG.fleets = IPG.fleets.filter(f => f.owner !== old);
        IPG.wars = IPG.wars.filter(x => x.a !== old && x.b !== old); IPG.pacts = IPG.pacts.filter(p => p.a !== old && p.b !== old);
        ipLog('🏳️ The government of ' + w.name + ' has fallen.', old);
        if (old === IPG.me) ipEnd('defeat', 'Conquered', 'Your home world fell to ' + ipW(by).name + '.');
    }
}
function ipFree(w) { w.owner = w.i; w.stab = 45; w.happy = 55; w.q = []; IPG.wars = IPG.wars.filter(x => x.a !== w.i && x.b !== w.i); }
// ---- diplomacy ----
function ipDeclare(a, b) {
    if (ipAtWar(a, b)) return;
    IPG.pacts = IPG.pacts.filter(p => !((p.a === a && p.b === b) || (p.a === b && p.b === a)));
    IPG.wars.push({ a, b, since: IPG.month }); ipAddRel(a, b, -50);
    ipLog('💥 ' + ipW(a).name + ' declares war on ' + ipW(b).name + '!', a);
    for (const al of ipAllies(b)) if (al !== a && !ipAtWar(al, a) && !ipPact(al, a, 'ally')) { IPG.wars.push({ a: al, b: a, since: IPG.month }); ipAddRel(al, a, -30); ipLog('🤝 ' + ipW(al).name + ' joins the war to defend its ally ' + ipW(b).name + '.', al); }
    for (const o of IPG.worlds) if (o.owner === o.i && o.i !== a && o.i !== b) ipAddRel(o.i, a, ipRel(o.i, b) > 30 ? -10 : -3);
}
function ipPeace(a, b) { IPG.wars = IPG.wars.filter(x => !((x.a === a && x.b === b) || (x.a === b && x.b === a))); ipAddRel(a, b, 15); ipW(a).weary = Math.max(0, ipW(a).weary - 20); ipW(b).weary = Math.max(0, ipW(b).weary - 20); ipLog('🕊️ ' + ipW(a).name + ' and ' + ipW(b).name + ' make peace.', a); }
// will b agree to something a asks? (AI side)
function ipWould(b, a, what) {
    const r = ipRel(b, a), pb = ipNavy(b) + ipW(b).def, pa = ipNavy(a) + ipW(a).def, w = ipW(b);
    if (what === 'trade') return !ipAtWar(a, b) && r > -5;
    if (what === 'nap') return !ipAtWar(a, b) && r > 15;
    if (what === 'ally') return !ipAtWar(a, b) && r > 45 && IPG.wars.filter(x => x.a === a || x.b === a).length <= 1;
    if (what === 'peace') { const war = IPG.wars.find(x => (x.a === a && x.b === b) || (x.a === b && x.b === a)); return war && (IPG.month - war.since >= 4) && (w.weary > 15 || pa > pb * 1.2 || r > -40 + w.weary); }
    if (what === 'tribute') return pa > pb * 2.2 && r > -60;
    return false;
}
// the player's actions on another nation (returns a message)
function ipAct(t, what) {
    const me = IPG.me, M = ipW(me), T = ipW(t), n = T.name;
    if (!ipAlive(t)) return n + ' has no government to talk to.';
    if (what === 'gift') { if (M.res.cr < 60) return 'Needs 60 credits.'; M.res.cr -= 60; ipAddRel(me, t, 10 * (1 + ipTechSum(me, 'rel') * 0.3)); return 'Gift sent. ' + n + ' likes you more.'; }
    if (what === 'war') { ipDeclare(me, t); return ''; }
    if (what === 'peace') { if (ipWould(t, me, 'peace')) { ipPeace(me, t); return n + ' accepts peace.'; } ipAddRel(me, t, -2); return n + ' refuses peace for now.'; }
    if (what === 'tribute') { if (ipWould(t, me, 'tribute')) { const g = Math.round(T.res.cr * 0.3 + 20); T.res.cr -= g; M.res.cr += g; ipAddRel(me, t, -15); return n + ' pays you ' + g + ' credits, unhappily.'; } ipAddRel(me, t, -20); return n + ' refuses. They will remember this.'; }
    if (what === 'cancel') { IPG.pacts = IPG.pacts.filter(p => !((p.a === me && p.b === t) || (p.a === t && p.b === me))); ipAddRel(me, t, -15); return 'Every deal with ' + n + ' is cancelled.'; }
    if (ipPact(me, t, what)) return 'You already have that deal.';
    if (ipWould(t, me, what)) { IPG.pacts.push({ a: me, b: t, type: what }); ipAddRel(me, t, 5); ipLog('📜 ' + M.name + ' and ' + n + ' sign a ' + { trade: 'trade deal', nap: 'non-aggression pact', ally: 'alliance' }[what] + '.', me); return n + ' agrees!'; }
    ipAddRel(me, t, -1); return n + ' says no. (Relations need to be better.)';
}
// ---- the AI ----
function ipAI(w) {
    const r = w.i, pers = IP_PERS[w.id], R = w.res, atWar = IPG.wars.filter(x => x.a === r || x.b === r).map(x => x.a === r ? x.b : x.a);
    // budget and tax
    w.tax = pers === 'trader' ? 0.22 : pers === 'warlike' ? 0.3 : 0.26;
    w.bud = atWar.length ? { ind: 25, sci: 10, mil: 45, wel: 20 } : pers === 'scholar' ? { ind: 25, sci: 40, mil: 10, wel: 25 } : pers === 'warlike' ? { ind: 30, sci: 15, mil: 35, wel: 20 } : { ind: 35, sci: 20, mil: 20, wel: 25 };
    if (w.happy < 40) { w.tax -= 0.05; w.bud.wel += 10; w.bud.ind -= 10; }
    // research
    if (!w.tech.cur) { const fav = { warlike: 3, trader: 1, scholar: 2, turtle: 3, balanced: 1 }[pers]; const can = IP_TECH.filter(t => !w.tech.done.includes(t.id) && t.needs.every(n => w.tech.done.includes(n))).sort((a, b) => (a.b === fav ? 0 : 1) - (b.b === fav ? 0 : 1) || a.cost - b.cost); if (can[0]) w.tech.cur = can[0].id; }
    // build for every world it rules
    for (const o of ipRealm(r)) {
        if (o.q.length >= 2) continue;
        const L = o.last, nd = L.need || {}, ff = L.f || {};
        let pick = null;
        if ((ff.fd || 0) < (nd.fd || 0) * 1.05) pick = ['bld', 'farm'];
        else if ((ff.ene || 0) < (nd.ene || 0) * 1.05) pick = ['bld', o.res.vol > 30 ? 'fusion' : 'mine'];
        else if ((ff.vol || 0) < (nd.vol || 0) * 1.05) pick = ['bld', 'harvest'];
        else if (o.pop > (o.capM || o.cap) * 0.9) pick = ['bld', 'dome'];
        else if (atWar.length || (pers === 'warlike' && ipRng() < 0.5) || ipNavy(r) < 4) pick = ['ship', ipTechDone(r, 'dread') && R.cr > 400 ? 'drea' : R.cr > 160 ? 'crui' : 'frig'];
        else pick = ['bld', ['mine', 'lab', 'port', 'grid', 'yard', 'harvest'][Math.floor(ipRng() * 6)]];
        ipQueue(o, pick[0], pick[1]);
    }
    // diplomacy, every few months
    if ((IPG.month + w.aiT) % 3 !== 0) return;
    const others = IPG.worlds.filter(o => o.owner === o.i && o.i !== r);
    for (const o of others) {
        const rel = ipRel(r, o.i);
        if (ipAtWar(r, o.i)) { if (ipWould(r, o.i, 'peace') && ipWould(o.i, r, 'peace') && o.i !== IPG.me) ipPeace(r, o.i); else if (o.i === IPG.me && w.weary > 20 && ipRng() < 0.4) ipOffer(r, 'peace'); continue; }
        if (rel > 15 && !ipPact(r, o.i, 'trade') && ipRng() < 0.2) { if (o.i === IPG.me) ipOffer(r, 'trade'); else if (ipWould(o.i, r, 'trade')) { IPG.pacts.push({ a: r, b: o.i, type: 'trade' }); ipLog('📜 ' + w.name + ' and ' + o.name + ' sign a trade deal.', r); } }
        else if (rel > 55 && !ipPact(r, o.i, 'ally') && ipRng() < 0.12) { if (o.i === IPG.me) ipOffer(r, 'ally'); else if (ipWould(o.i, r, 'ally')) { IPG.pacts.push({ a: r, b: o.i, type: 'ally' }); ipLog('🤝 ' + w.name + ' and ' + o.name + ' form an alliance.', r); } }
        // war: a strong, hostile neighbour picks on someone weaker and not too far
        const need = pers === 'warlike' ? 1.4 : pers === 'balanced' ? 1.8 : 2.4, strong = ipNavy(r) > (ipNavy(o.i) + o.def * 0.35) * need;
        const hostile = rel < (pers === 'warlike' ? 5 : pers === 'balanced' ? -30 : -50);
        if (hostile && strong && !ipPact(r, o.i, 'nap') && !ipPact(r, o.i, 'ally') && atWar.length === 0 && IPG.month > 10 && ipDist(r, o.i, IPG.month) < 16 && ipRng() < (pers === 'warlike' ? 0.25 : 0.15)) { ipDeclare(r, o.i); return; }
        // tribute demands to the player
        if (o.i === IPG.me && pers === 'warlike' && ipWould(IPG.me, r, 'tribute') === false && ipNavy(r) > (ipNavy(o.i) + o.def) * 2.5 && rel < 0 && ipRng() < 0.1) ipOffer(r, 'demand');
    }
    // attack: send most of the home fleet at the weakest enemy world within reach
    if (atWar.length) {
        let best = null;
        for (const e of atWar) for (const t of ipRealm(e)) { const d = ipDist(r, t.i, IPG.month), def = ipPower(e, t.ships) + t.def * 0.5, s = def + d * 0.5; if (!best || s < best.s) best = { t, def, s }; }
        const myPow = ipPower(r, w.ships);
        if (best && myPow > best.def * 1.5 && !IPG.fleets.some(f => f.owner === r && f.to === best.t.i)) { const send = w.ships.map(x => Math.floor(x * 0.75)); ipSend(r, best.t.i, send, 'attack'); ipLog('🚀 ' + w.name + ' sends a fleet toward ' + best.t.name + '.', r); }
    }
}
// AI proposals to the player (answered in the UI)
function ipOffer(from, kind) { if (IPG.notes.some(n => n.from === from && n.kind === kind)) return; IPG.notes.push({ from, kind, m: IPG.month }); }
function ipAnswer(note, yes) {
    IPG.notes = IPG.notes.filter(n => n !== note); const me = IPG.me, f = note.from; if (!ipAlive(f)) return;
    if (note.kind === 'peace') { if (yes) ipPeace(me, f); else ipAddRel(me, f, -5); }
    else if (note.kind === 'demand') { if (yes) { const g = Math.round(ipW(me).res.cr * 0.25 + 20); ipW(me).res.cr -= g; ipW(f).res.cr += g; ipAddRel(me, f, 10); ipLog('💸 You pay ' + g + ' credits to ' + ipW(f).name + '.', me); } else { ipAddRel(me, f, -25); if (ipRng() < 0.5) ipDeclare(f, me); } }
    else if (yes) { IPG.pacts.push({ a: me, b: f, type: note.kind }); ipAddRel(me, f, 6); ipLog('📜 You sign a ' + { trade: 'trade deal', ally: 'alliance' }[note.kind] + ' with ' + ipW(f).name + '.', me); }
    else ipAddRel(me, f, -4);
}
// ---- events for the player ----
function ipEventFx(fx) {
    const w = ipW(IPG.me), R = w.res;
    if (fx.gamble) { const ok = ipRng() < fx.gamble; fx = ok ? (fx.win || {}) : (fx.fail || {}); ipLog(ok ? '🎲 It worked out.' : '🎲 It went badly.', IPG.me); }
    for (const k of IP_RES) if (fx[k]) R[k] = Math.max(0, R[k] + fx[k]);
    if (fx.happy) w.happy = clamp(w.happy + fx.happy, 0, 100); if (fx.stab) w.stab = clamp(w.stab + fx.stab, 0, 100); if (fx.def) w.def = Math.max(0, w.def + fx.def);
    if (fx.pop) w.pop *= 1 + fx.pop; if (fx.outHit) for (const k of ['met', 'ene', 'vol', 'fd']) R[k] *= 1 - fx.outHit;
    if (fx.ship0) w.ships[0] = Math.max(0, w.ships[0] + fx.ship0); if (fx.ship1) { if (w.ships[1] > 0) w.ships[1]--; else w.ships[0] = Math.max(0, w.ships[0] - 3); }
    if (fx.relAll) for (const o of IPG.worlds) if (o.i !== IPG.me) ipAddRel(IPG.me, o.i, fx.relAll);
    if (fx.relRand) { const o = IPG.worlds.filter(x => x.i !== IPG.me && ipAlive(x.i)); if (o.length) ipAddRel(IPG.me, o[Math.floor(ipRng() * o.length)].i, fx.relRand); }
}
// ---- one month for everyone ----
function ipMonth() {
    if (!IPG || IPG.over) return;
    IPG.month++;
    for (const w of IPG.worlds) ipMonthWorld(w);
    ipFleetsMonth();
    for (const w of IPG.worlds) if (w.owner === w.i && w.i !== IPG.me) ipAI(w);
    for (const w of IPG.worlds) w.weary = Math.max(0, w.weary - 0.5 + IPG.wars.filter(x => x.a === w.i || x.b === w.i).length * 1.2);
    // relations drift back toward neutral; allies and trade partners warm up
    const n = IPG.worlds.length;
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) { let d = -Math.sign(IPG.rel[a][b]) * 0.3; if (ipPact(a, b, 'trade')) d += 0.25; if (ipPact(a, b, 'ally')) d += 0.35; if (ipAtWar(a, b)) d -= 1; IPG.rel[a][b] = IPG.rel[b][a] = clamp(IPG.rel[a][b] + d, -100, 100); }
    // incidents: two worlds fall out (smuggling, a collision, a spy caught...)
    if (ipRng() < 0.3) { const al = IPG.worlds.filter(w => w.owner === w.i); if (al.length > 2) { const a = al[Math.floor(ipRng() * al.length)], b = al[Math.floor(ipRng() * al.length)]; if (a !== b && !ipPact(a.i, b.i, 'ally')) { ipAddRel(a.i, b.i, -(10 + ipRng() * 18)); if (a.i === IPG.me || b.i === IPG.me) ipLog('⚠️ ' + ['A freighter collision', 'A spy scandal', 'A smuggling bust', 'A border patrol shoot-out', 'An insult in a speech'][Math.floor(ipRng() * 5)] + ' sours relations between ' + a.name + ' and ' + b.name + '.', a.i); } } }
    ipVictories();
    const me = ipW(IPG.me);
    if (me.lowStab >= 3) ipEnd('defeat', 'Overthrown', 'Riots filled the domes and your government fell. Keep your people fed, housed and happy.');
    if (!IPG.over && ipRng() < 0.16) IPG.pendingEvent = IP_EVENTS[Math.floor(ipRng() * IP_EVENTS.length)].id;
}
function ipVictories() {
    const me = IPG.me, M = ipW(me), V = IPG.vic, done = id => { if (V[id]) return; V[id] = IPG.month; ipLog('🏆 VICTORY: ' + IP_VICTORIES.find(v => v.id === id).n + '!', me); if (window.IPV) IPV.victory(id); };
    if (ipRealm(me).length >= 7) done('hegemony');
    const top = IPG.worlds.filter(w => w.owner === w.i).every(w => w.i === me || ipRealmGdp(w.i) <= ipRealmGdp(me));
    IPG.wealthRun = top ? IPG.wealthRun + 1 : 0; if (IPG.wealthRun >= 36) done('wealth');
    if (ipAllies(me).length >= 6) done('federation');
    if (IPG.ark) done('stars');
    if (ipTechDone(me, 'dyson') && IPG.worlds.filter(w => w.owner === w.i).every(w => w.i === me || ipNavy(w.i) <= ipNavy(me))) done('swarm');
}
function ipRealmGdp(r) { return ipRealm(r).reduce((a, w) => a + w.gdp, 0); }
function ipEnd(kind, head, text) { if (IPG.over) return; IPG.over = { kind, head, text, m: IPG.month }; if (window.IPV) IPV.ended(); }
// the market: sell surplus for credits, buy what you lack (at twice the price)
const IP_PRICE = { met: 1.2, ene: 0.9, vol: 0.8, fd: 1.0 };
function ipMarket(k, qty, sell) {
    const w = ipW(IPG.me), p = IP_PRICE[k]; if (!p) return 'Cannot trade that.';
    if (sell) { const q = Math.min(qty, Math.floor(w.res[k])); if (q <= 0) return 'You have none to sell.'; w.res[k] -= q; w.res.cr += Math.round(q * p); return 'Sold ' + q + ' for ' + Math.round(q * p) + ' credits.'; }
    const cost = Math.round(qty * p * 2); if (w.res.cr < cost) return 'Needs ' + cost + ' credits.'; w.res.cr -= cost; w.res[k] += qty; return 'Bought ' + qty + ' for ' + cost + ' credits.';
}
function ipLaunchArk() { const M = ipW(IPG.me); if (!ipTechDone(IPG.me, 'ark')) return 'Research the Generation ark first.'; if (M.res.cr < 5000) return 'The ark costs 5,000 credits.'; M.res.cr -= 5000; IPG.ark = true; ipVictories(); return ''; }
