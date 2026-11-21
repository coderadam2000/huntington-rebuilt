// ==========================================
// SOVEREIGN INTERPLANETARY: the screens. Pick a world, then run it from the top bar (time, resources, mood),
// the tool buttons (Economy, Build, Research, Navy, Diplomacy, Goals) and the panel of the selected world.
// Saved in sov.ip.save every year and when you leave. Unlocked once you win any victory in the base game
// (sov.ipUnlocked, also set from the Hall of Leaders and from saves that already hold a victory).
// ==========================================
const IPU = { rate: [0, 0.5, 1, 2], speed: 1, saveT: 0 };
function ipModal(html, wide) { UI.modal(html); $('#modal-box').classList.toggle('wide', !!wide); }
window.IPU = IPU;
function ipUnlocked() {
    if (Store.get('ipUnlocked', false)) return true;
    const hall = Store.get('hall', []); if (hall.some(h => /^Victory/.test(h.ending || ''))) { Store.set('ipUnlocked', true); return true; }
    return false;
}
const ipFmt = v => Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.abs(v) >= 100 ? Math.round(v) + '' : (Math.round(v * 10) / 10) + '';
const ipPopFmt = p => p >= 1000 ? (p / 1000).toFixed(2) + ' billion' : Math.round(p) + ' million';
const ipCostHtml = c => Object.entries(c).map(([k, v]) => `${IP_RI[k]}${v}`).join(' ');
function ipEl() {
    let s = $('#ipgame'); if (s) return s;
    s = document.createElement('div'); s.id = 'ipgame'; s.className = 'screen';
    s.innerHTML = `<div id="ip-top" class="panel"></div>
      <div id="ip-tools"><button class="btn small" data-ip="econ">💰 Economy</button><button class="btn small" data-ip="build">🏗️ Build</button><button class="btn small" data-ip="tech">🔬 Research</button><button class="btn small" data-ip="navy">🚀 Navy</button><button class="btn small" data-ip="diplo">🤝 Diplomacy</button><button class="btn small" data-ip="goals">🏆 Goals</button><button class="btn small" data-ip="help">❔ How to play</button><button class="btn small" data-ip="menu">☰ Menu</button></div>
      <div id="ip-panel" class="panel hidden"></div>
      <div id="ip-log" class="panel"></div>
      <div id="ip-notes"></div>`;
    document.body.appendChild(s);
    s.addEventListener('click', e => {
        const b = e.target.closest('[data-ip]'); if (!b) return;
        const a = b.dataset.ip, i = +b.dataset.i;
        if (a === 'econ') IPU.econ(); if (a === 'build') IPU.build(IPU.mineSel()); if (a === 'tech') IPU.tech(); if (a === 'navy') IPU.navy(); if (a === 'diplo') IPU.diplo(); if (a === 'goals') IPU.goals(); if (a === 'help') IPU.help(); if (a === 'menu') IPU.menu();
        if (a === 'speed') IPU.setSpeed(i); if (a === 'close') IPU.select(-1);
        if (a === 'buildat') IPU.build(i); if (a === 'sendfrom') IPU.navy(i, -1); if (a === 'attack') IPU.navy(IPU.mineSel(), i); if (a === 'talk') IPU.talk(i);
        if (a === 'note') IPU.note(i); if (a === 'focus') IPV.focus(i);
    });
    return s;
}
IPU.mineSel = () => IPV.sel >= 0 && IPG.worlds[IPV.sel].owner === IPG.me ? IPV.sel : IPG.me;
// ---- open: locked, pick a world, or continue ----
IPU.open = function () {
    if (!ipUnlocked()) { ipModal(`<h2>🪐 Sovereign Interplanetary 🔒</h2><p class="sub" style="font-size:14px">Lead a planet or dwarf planet in the year ${IP_YEAR0}: build, research, trade and fight across the solar system.</p><p style="font-size:14px">Unlocks when you <b>win any victory</b> in the base game (Economic Superpower, Peacemaker, Science, Long Reign...). Check the goals in your game menu.</p><div class="actions"><button class="btn small gold" data-act="close-modal">OK</button></div>`); return; }
    const sv = Store.get('ip.save', null);
    ipModal(`<h2>🪐 Sovereign Interplanetary</h2><p class="sub" style="font-size:14px">The year is ${IP_YEAR0}. Humanity lives on thirteen worlds, and each one answers to itself. Pick yours.</p>
      ${sv ? `<div class="actions" style="justify-content:flex-start"><button class="btn small gold" id="ip-cont">Continue: ${esc(IP_WORLDS[sv.me].name)}, ${ipMonthName(sv.month)}</button></div>` : ''}
      <div class="ip-pick">${IP_WORLDS.map((d, i) => { const diff = d.pop > 5000 ? 'Easy' : d.pop > 400 ? 'Medium' : d.pop > 60 ? 'Hard' : 'Very hard';
        return `<button class="ip-card" data-w="${i}"><b><i style="background:${IP_COLS[i]}"></i>${esc(d.name)}</b><small>${esc(d.kind)} · ${esc(d.gov)} · ${ipPopFmt(d.pop)} · <span class="d-${diff.split(' ').join('')}">${diff}</span></small><span>${esc(d.blurb)}</span></button>`; }).join('')}</div>
      <div class="actions"><button class="btn small" data-act="close-modal">Back</button></div>`, true);
    if ($('#ip-cont')) $('#ip-cont').onclick = () => { UI.closeModal(); IPU.load(sv); };
    $$('.ip-card').forEach(b => b.onclick = () => { const i = +b.dataset.w; UI.closeModal(); ipNew(i, (Math.random() * 1e9) | 0); IPU.enter(); IPU.welcome(); });
};
IPU.load = function (sv) {
    try { IPG = sv; Object.defineProperty(IPG, 'rnd', { value: makeRng((sv.seed || 1) + sv.month * 7919), enumerable: false, writable: true }); IPG.notes = IPG.notes || []; IPU.enter(); }
    catch (e) { console.error(e); toast('That save could not be loaded.'); }
};
IPU.save = () => { if (IPG && !IPG.over) Store.set('ip.save', IPG); };
IPU.enter = function () {
    ipEl(); UI.closeModal(); UI.show('ipgame'); Globe.camera.clearViewOffset(); IPV.show(true); IPV.sel = -1; IPV.focusI = null; IPV.cam.tx = IPV.cam.tz = 0; IPV.cam.dist = 140;
    IPU.speed = 1; IPU.refresh(); IPU.select(IPG.me, true);
};
IPU.exit = function () { IPU.save(); IPV.show(false); $('#ip-panel').classList.add('hidden'); IPG = null; UI.show('title'); };
IPU.welcome = function () {
    const d = IP_WORLDS[IPG.me];
    ipModal(`<h2>Welcome, leader of ${esc(d.name)}</h2><p style="font-size:14px">${esc(d.blurb)}</p>
      <p style="font-size:14px">Time runs on its own: <b>Space</b> pauses, <b>1 2 3</b> set the speed. Keep your people <b>fed</b> (🌾), <b>powered</b> (⚡) and <b>supplied</b> (💧), grow your economy, research new technology, and deal with the other twelve worlds: trade, alliances, or war.</p>
      <p style="font-size:14px">Win by ruling 7 worlds, having the richest economy for 3 years, allying with 6 worlds, launching an ark to the stars, or mastering the Sun.</p>
      <div class="actions"><button class="btn small gold" data-act="close-modal">Begin</button></div>`);
};
// ---- the clock ----
IPU.setSpeed = s => { IPU.speed = s; IPU.paintTop(); };
IPU.tick = function (dt) {
    if (!IPG || IPG.over) return;
    if (Tutor.offerOpen) Tutor.hideOffer();
    if (!$('#modal').classList.contains('hidden')) return;           // time stops while a window is open
    if (IPG.notes.length && !IPU.noteShown) { IPU.noteShown = true; IPU.paintNotes(); }
    IPV.frac += dt * IPU.rate[IPU.speed] / 2;
    if (IPV.frac >= 1) {
        IPV.frac -= 1; ipMonth(); IPU.refresh();
        if (IPG.month % 12 === 0) IPU.save();
        if (IPG.pendingEvent && !IPG.over) { const ev = IP_EVENTS.find(e => e.id === IPG.pendingEvent); IPG.pendingEvent = null; IPU.event(ev); }
    }
};
// ---- top bar, log, notes ----
IPU.refresh = function () { if (!IPG) return; IPU.paintTop(); IPU.paintLog(); IPU.paintNotes(); if (IPV.sel >= 0) IPU.paintPanel(); };
IPU.paintTop = function () {
    const me = IPG.me, w = ipW(me), d = IP_WORLDS[me], F = ipFlows(w), net = {};
    for (const k of IP_RES) net[k] = (F.f[k] || 0) - (F.need[k] || 0);
    for (const o of ipRealm(me)) if (o.i !== me) for (const k of ['cr', 'met', 'ene', 'vol']) net[k] += Math.max(0, o.res[k] - 40) * 0.6 > 0 ? 0 : 0;
    const res = IP_RES.map(k => `<span class="ip-r" title="${IP_RN[k]}: ${ipFmt(w.res[k])} (${net[k] >= 0 ? '+' : ''}${ipFmt(net[k])} a month)">${IP_RI[k]} <b>${k === 'sci' ? (w.tech.cur ? Math.floor(w.tech.prog) + '/' + IP_TECH.find(t => t.id === w.tech.cur).cost : '<span class=\"bad\">pick!</span>') : ipFmt(w.res[k])}</b><em class="${net[k] < 0 ? 'neg' : ''}">${net[k] >= 0 ? '+' : ''}${ipFmt(net[k])}</em></span>`).join('');
    $('#ip-top').innerHTML = `<span class="ip-me"><i style="background:${IP_COLS[me]}"></i><b>${esc(d.name)}</b><small>${esc(d.gov)}</small></span>
      <span class="ip-date">${ipMonthName(IPG.month)}</span>
      <span class="ip-speed">${['⏸', '▶', '▶▶', '▶▶▶'].map((s, i) => `<button class="${IPU.speed === i ? 'on' : ''}" data-ip="speed" data-i="${i}" title="${['Pause (Space)', 'Slow (1)', 'Normal (2)', 'Fast (3)'][i]}">${s}</button>`).join('')}</span>
      ${res}<span class="ip-r" title="People">👥 <b>${ipPopFmt(w.pop)}</b></span><span class="ip-r" title="Happiness">😊 <b class="${w.happy < 35 ? 'bad' : ''}">${Math.round(w.happy)}</b></span><span class="ip-r" title="Stability">🏛️ <b class="${w.stab < 25 ? 'bad' : ''}">${Math.round(w.stab)}</b></span>`;
};
IPU.paintLog = function () { $('#ip-log').innerHTML = IPG.log.slice(0, 6).map(l => `<div><small>${ipMonthName(l.m)}</small> ${esc(l.t)}</div>`).join(''); };
IPU.logChanged = () => { if (IPV.on) IPU.paintLog(); };
IPU.paintNotes = function () {
    const box = $('#ip-notes'); if (!box || !IPG) return;
    box.innerHTML = IPG.notes.map((n, k) => `<button class="btn small gold" data-ip="note" data-i="${k}">📨 ${esc(IP_WORLDS[n.from].name)}: ${{ trade: 'trade deal?', ally: 'alliance?', peace: 'peace?', demand: 'demands tribute!' }[n.kind]}</button>`).join('');
    if (!IPG.notes.length) IPU.noteShown = false;
};
IPU.note = function (k) {
    const n = IPG.notes[k]; if (!n) return; const who = IP_WORLDS[n.from].name;
    const text = { trade: `${who} offers a trade deal: both worlds earn more credits every month.`, ally: `${who} proposes an alliance: you defend each other in every war.`, peace: `${who} asks for peace.`, demand: `${who} demands a quarter of your credits. Refuse, and they may attack.` }[n.kind];
    ipModal(`<h2>📨 From ${esc(who)}</h2><p style="font-size:14px">${text}</p><p class="sub">Relations: ${Math.round(ipRel(IPG.me, n.from))}</p><div class="actions"><button class="btn small" id="ip-no">Refuse</button><button class="btn small gold" id="ip-yes">Accept</button></div>`);
    $('#ip-yes').onclick = () => { ipAnswer(n, true); UI.closeModal(); IPU.refresh(); };
    $('#ip-no').onclick = () => { ipAnswer(n, false); UI.closeModal(); IPU.refresh(); };
};
// ---- selecting a world ----
IPU.select = function (i, focus) { IPV.sel = i; if (i >= 0 && focus) IPV.focus(i); IPU.paintPanel(); };
IPU.paintPanel = function () {
    const p = $('#ip-panel'), i = IPV.sel; if (i < 0 || !IPG) { p.classList.add('hidden'); return; }
    const w = ipW(i), d = IP_WORLDS[i], me = IPG.me, mine = w.owner === me, ru = w.owner, F = ipFlows(w);
    const relBar = r => `<span class="ip-rel"><i style="width:${Math.abs(r) / 2}%;${r < 0 ? 'right:50%;background:#ef4444' : 'left:50%;background:#22c55e'}"></i></span> ${Math.round(r)}`;
    const deals = ru !== me ? ['trade', 'nap', 'ally'].filter(t => ipPact(me, ru, t)).map(t => ({ trade: 'Trade', nap: 'Non-aggression', ally: 'Allied' })[t]).join(', ') : '';
    const war = ru !== me && ipAtWar(me, ru);
    p.innerHTML = `<div class="ph"><h2><i class="ip-dot" style="background:${IP_COLS[ru]}"></i>${esc(d.name)}</h2><button class="icon" data-ip="close">✕</button></div>
      <div class="sub">${esc(d.kind)} · ${ru === i ? esc(d.gov) : 'Ruled by ' + esc(IP_WORLDS[ru].name)}${i === me ? ' · <b>your home</b>' : ''}</div>
      <p class="ip-blurb">${esc(d.blurb)}</p>
      <div class="ip-grid"><span>People</span><b>${ipPopFmt(w.pop)} / ${ipPopFmt(w.capM || w.cap)}</b><span>Economy</span><b>${ipFmt(w.gdp)}</b><span>Happiness</span><b>${Math.round(w.happy)}</b><span>Stability</span><b>${Math.round(w.stab)}</b>
        <span>Defence</span><b>${Math.round(w.def)} / ${Math.round(w.defMax || w.def)}</b><span>Ships here</span><b>${IP_SHIPS.map((s, k) => w.ships[k] ? s.ic + w.ships[k] : '').join(' ') || 'none'}</b>
        <span>Fleet power</span><b>${ipFmt(ipPower(ru, w.ships))}</b><span>From Sun</span><b>${d.a} AU</b>${i !== me ? `<span>Travel from home</span><b>${ipTravel(me, me, i)} months</b>` : ''}</div>
      ${mine ? `<div class="ip-grid">${['met', 'ene', 'vol', 'fd'].map(k => `<span>${IP_RI[k]} ${IP_RN[k]}</span><b class="${F.f[k] < (F.need[k] || 0) ? 'bad' : ''}">${ipFmt(F.f[k])} made / ${ipFmt(F.need[k] || 0)} used</b>`).join('')}</div>
        <div class="ip-bld">${IP_BUILD.filter(b => w.bld[b.id]).map(b => `<span title="${esc(b.n)}">${b.ic}${w.bld[b.id]}</span>`).join('') || '<span class="sub">No buildings yet</span>'}</div>
        ${w.q.length ? `<div class="sub">Building: ${w.q.map(q => (q.kind === 'ship' ? IP_SHIPS.find(s => s.id === q.id).n : IP_BUILD.find(b => b.id === q.id).n) + ' (' + q.left + ' mo)').join(', ')}</div>` : ''}
        <div class="actions"><button class="btn small gold" data-ip="buildat" data-i="${i}">🏗️ Build here</button><button class="btn small" data-ip="sendfrom" data-i="${i}">🚀 Send ships</button></div>`
      : `${ipAlive(ru) ? `<div class="ip-grid"><span>Relations</span><b>${relBar(ipRel(me, ru))}</b><span>Deals</span><b>${war ? '<span class="bad">AT WAR</span>' : deals || 'none'}</b><span>Their navy</span><b>${ipFmt(ipNavy(ru))}</b><span>Your navy</span><b>${ipFmt(ipNavy(me))}</b></div>` : ''}
        <div class="actions">${ipAlive(ru) ? `<button class="btn small gold" data-ip="talk" data-i="${ru}">🤝 Talk to ${esc(IP_WORLDS[ru].name)}</button>` : ''}${war ? `<button class="btn small" data-ip="attack" data-i="${i}">⚔️ Attack ${esc(d.name)}</button>` : ''}</div>`}
      ${IPG.fleets.filter(f => f.to === i).map(f => `<div class="sub">${f.owner === me ? '🚀 Your' : '⚠️ ' + esc(IP_WORLDS[f.owner].name)} fleet (${ipFmt(ipPower(f.owner, f.ships))} power) arrives ${ipMonthName(f.arr)}${f.mission === 'attack' ? ' to attack' : ''}</div>`).join('')}`;
    p.classList.remove('hidden');
};
// ---- economy ----
IPU.econ = function () {
    const w = ipW(IPG.me), F = ipFlows(w);
    ipModal(`<h2>💰 Economy of ${esc(w.name || IP_WORLDS[IPG.me].name)}</h2>
      <div class="ip-sl"><label>Tax rate <b id="ip-taxv">${Math.round(w.tax * 100)}%</b></label><input type="range" id="ip-tax" min="10" max="50" value="${Math.round(w.tax * 100)}"><small>Higher taxes bring in more credits and make people less happy.</small></div>
      <h3>Spending (what your taxes pay for)</h3>
      ${[['ind', 'Industry', 'More of everything you make'], ['sci', 'Science', 'Faster research'], ['mil', 'Military', 'Defences repair faster, steadier government'], ['wel', 'Welfare', 'Happier people']].map(([k, n, s]) => `<div class="ip-sl"><label>${n} <b id="ip-b-${k}v">${w.bud[k]}%</b></label><input type="range" min="0" max="70" value="${w.bud[k]}" data-b="${k}"><small>${s}</small></div>`).join('')}
      <div class="ip-grid" id="ip-econ-sum"></div>
      <h3>Market</h3><div class="sub">Sell what you have too much of, buy what you are short of (buying costs twice as much).</div>
      <div class="ip-mkt">${Object.keys(IP_PRICE).map(k => `<div><span>${IP_RI[k]} ${IP_RN[k]} <small>(${ipFmt(w.res[k])})</small></span><button class="btn small" data-mk="${k}" data-s="1">Sell 50 (+${Math.round(50 * IP_PRICE[k])} 💰)</button><button class="btn small" data-mk="${k}" data-s="0">Buy 20 (-${Math.round(40 * IP_PRICE[k])} 💰)</button></div>`).join('')}</div><div id="ip-mktmsg" class="sub"></div>
      <div class="actions"><button class="btn small gold" data-act="close-modal">Done</button></div>`);
    $$('[data-mk]').forEach(b => b.onclick = () => { const sell = b.dataset.s === '1', msg = ipMarket(b.dataset.mk, sell ? 50 : 20, sell); IPU.econ(); $('#ip-mktmsg').textContent = msg; IPU.paintTop(); });
    const sum = () => { const F = ipFlows(w); $('#ip-econ-sum').innerHTML = `<span>Economy</span><b>${ipFmt(F.gdp)}</b><span>Taxes</span><b>+${ipFmt(F.tax)}</b><span>Trade deals</span><b>+${ipFmt(F.trade)}</b><span>Fleet upkeep</span><b>-${ipFmt(F.upk)}</b><span>Credits a month</span><b class="${F.f.cr < 0 ? 'bad' : ''}">${F.f.cr >= 0 ? '+' : ''}${ipFmt(F.f.cr)}</b><span>Science a month</span><b>+${ipFmt(F.f.sci)}</b>`; };
    sum();
    $('#ip-tax').oninput = e => { w.tax = e.target.value / 100; $('#ip-taxv').textContent = e.target.value + '%'; sum(); IPU.paintTop(); };
    $$('[data-b]').forEach(el => el.oninput = () => {
        const k = el.dataset.b, v = +el.value, others = ['ind', 'sci', 'mil', 'wel'].filter(x => x !== k), rest = 100 - v, cur = others.reduce((a, x) => a + w.bud[x], 0) || 1;
        w.bud[k] = v; others.forEach(x => w.bud[x] = Math.round(w.bud[x] / cur * rest)); const fix = 100 - ['ind', 'sci', 'mil', 'wel'].reduce((a, x) => a + w.bud[x], 0); w.bud[others[0]] += fix;
        for (const x of ['ind', 'sci', 'mil', 'wel']) { $('#ip-b-' + x + 'v').textContent = w.bud[x] + '%'; const s = $(`[data-b="${x}"]`); if (s !== el) s.value = w.bud[x]; }
        sum(); IPU.paintTop();
    });
};
// ---- building ----
IPU.build = function (i) {
    const w = ipW(i), paint = () => {
        const row = (kind, x, n, extra) => { const c = ipCostOf(w, kind, x.id), ok = ipCanPay(w, c); return `<button class="ip-brow${ok ? '' : ' no'}" data-k="${kind}" data-id="${x.id}"><span>${x.ic}</span><b>${esc(x.n)}${n ? ` <small>×${n}</small>` : ''}</b><small>${esc(extra)}</small><em>${ipCostHtml(c)}</em></button>`; };
        $('#ip-blist').innerHTML = `<h3>Buildings</h3>${IP_BUILD.filter(b => !b.only || b.only.includes(w.id)).map(b => row('bld', b, w.bld[b.id] || 0, b.d)).join('')}
          <h3>Warships</h3>${IP_SHIPS.filter(s => !s.tech || ipTechDone(w.owner, s.tech)).map(s => row('ship', s, w.ships[IP_SHIPS.indexOf(s)], `Power ${s.pow} · upkeep ${s.upk / 2}/mo`)).join('')}
          <div class="sub">Being built (${1 + (w.bld.yard || 0)} at a time): ${w.q.map(q => (q.kind === 'ship' ? IP_SHIPS.find(s => s.id === q.id).n : IP_BUILD.find(b => b.id === q.id).n) + ' ' + q.left + ' mo').join(', ') || 'nothing'}</div>`;
    };
    ipModal(`<h2>🏗️ Build on ${esc(IP_WORLDS[i].name)}</h2><div class="sub">Credits come from your treasury; metals, energy and volatiles from this world. You have ${IP_RES.slice(0, 4).map(k => IP_RI[k] + ipFmt(k === 'cr' ? ipW(w.owner).res.cr : w.res[k])).join(' ')}</div><div id="ip-blist"></div><div id="ip-bmsg" class="sub"></div><div class="actions"><button class="btn small gold" data-act="close-modal">Done</button></div>`, true);
    paint();
    $('#ip-blist').onclick = e => { const b = e.target.closest('.ip-brow'); if (!b) return; const err = ipQueue(w, b.dataset.k, b.dataset.id); $('#ip-bmsg').textContent = err || 'Added to the build list.'; paint(); IPU.refresh(); };
};
// ---- research ----
IPU.tech = function () {
    const me = IPG.me, w = ipW(me), T = w.tech, sci = ipFlows(w).f.sci;
    const cell = t => { const done = T.done.includes(t.id), can = t.needs.every(n => T.done.includes(n)), cur = T.cur === t.id; return `<button class="ip-tech${done ? ' done' : cur ? ' cur' : can ? '' : ' lock'}" data-t="${t.id}" ${done || !can ? 'disabled' : ''}><b>${esc(t.n)}</b><small>${esc(t.d)}</small><em>${done ? '✓ done' : cur ? Math.round(T.prog) + ' / ' + t.cost : t.cost + ' 🔬 · ~' + Math.ceil(t.cost / Math.max(0.5, sci)) + ' mo'}</em></button>`; };
    ipModal(`<h2>🔬 Research</h2><div class="sub">Science: +${ipFmt(sci)} a month. Raise the Science budget or build labs to go faster. ${T.cur ? 'Now: <b>' + esc(IP_TECH.find(t => t.id === T.cur).n) + '</b>' : '<b class="bad">Pick something to research!</b>'}</div>
      <div class="ip-tree">${IP_TECH_BR.map((b, k) => `<div><h3>${b}</h3>${IP_TECH.filter(t => t.b === k).map(cell).join('')}</div>`).join('')}</div><div class="actions"><button class="btn small gold" data-act="close-modal">Done</button></div>`, true);
    $$('.ip-tech[data-t]').forEach(b => b.onclick = () => { if (T.cur !== b.dataset.t) { T.cur = b.dataset.t; T.prog = Math.min(T.prog, 0); } IPU.tech(); IPU.paintTop(); });
};
IPU.techDone = t => { toast('🔬 ' + t.n + ' researched!', 3500); if (!ipW(IPG.me).tech.cur) setTimeout(() => toast('Pick your next research (🔬 Research).', 3000), 3600); };
// ---- navy: send fleets ----
IPU.navy = function (from, to) {
    const me = IPG.me, mine = ipRealm(me).filter(w => w.ships.some(x => x > 0) || w.i === me);
    from = from != null && from >= 0 ? from : (mine[0] || ipW(me)).i;
    const targets = IPG.worlds.filter(w => w.i !== from);
    ipModal(`<h2>🚀 Navy</h2><div class="sub">Total fleet power ${ipFmt(ipNavy(me))}. Ships cost upkeep every month.</div>
      <div class="ip-navy"><label>From <select id="ip-from">${ipRealm(me).map(w => `<option value="${w.i}" ${w.i === from ? 'selected' : ''}>${esc(IP_WORLDS[w.i].name)} (${IP_SHIPS.map((s, k) => s.ic + w.ships[k]).join(' ')})</option>`).join('')}</select></label>
      <label>To <select id="ip-to">${targets.map(w => `<option value="${w.i}" ${w.i === to ? 'selected' : ''}>${esc(IP_WORLDS[w.i].name)}${w.owner === me ? ' (yours)' : ipAtWar(me, w.owner) ? ' (enemy)' : ''}</option>`).join('')}</select></label>
      ${IP_SHIPS.map((s, k) => `<label>${s.ic} ${s.n}s <input type="number" min="0" value="0" data-sh="${k}"></label>`).join('')}
      <div id="ip-navinfo" class="sub"></div></div>
      <div class="actions"><button class="btn small" data-act="close-modal">Close</button><button class="btn small gold" id="ip-go">Send</button></div>
      <h3>Fleets in space</h3><div class="sub">${IPG.fleets.filter(f => f.owner === me || ipW(f.to).owner === me).map(f => `${f.owner === me ? '🚀' : '⚠️ ' + esc(IP_WORLDS[f.owner].name)} → ${esc(IP_WORLDS[f.to].name)}, ${ipFmt(ipPower(f.owner, f.ships))} power, arrives ${ipMonthName(f.arr)}`).join('<br>') || 'none'}</div>`);
    const info = () => {
        const f = +$('#ip-from').value, t = +$('#ip-to').value, W = ipW(f), T = ipW(t);
        $$('[data-sh]').forEach(el => el.max = W.ships[+el.dataset.sh]);
        const ships = $$('[data-sh]').map(el => clamp(+el.value | 0, 0, W.ships[+el.dataset.sh])), pw = ipPower(me, ships), war = ipAtWar(me, T.owner), defP = ipPower(T.owner, T.ships) + T.def * 0.5;
        $('#ip-navinfo').innerHTML = `Travel time: <b>${ipTravel(me, f, t)} months</b>. ` + (T.owner === me ? 'Moving ships between your worlds.' : war ? `Attack! Your power ${ipFmt(pw)} against about ${ipFmt(defP)} (fleet + defences). You need clearly more to win.` : ipPact(me, T.owner, 'ally') ? 'Your ally: the ships will guard it.' : '<span class="bad">You are not at war with them: declare war first (Diplomacy) to attack.</span>');
        return { f, t, ships, war, T };
    };
    $('#ip-from').onchange = () => IPU.navy(+$('#ip-from').value, +$('#ip-to').value);
    $('#ip-to').onchange = info; $$('[data-sh]').forEach(el => el.oninput = info);
    if (to < 0 || to == null) { } info();
    $('#ip-go').onclick = () => { const r = info(); const err = ipSend(r.f, r.t, r.ships, r.T.owner === me || ipPact(me, r.T.owner, 'ally') ? 'move' : 'attack'); if (err) { $('#ip-navinfo').innerHTML = '<span class="bad">' + esc(err) + '</span>'; return; } UI.closeModal(); toast('Fleet launched.'); IPU.refresh(); };
};
// ---- diplomacy ----
IPU.diplo = function () {
    const me = IPG.me;
    ipModal(`<h2>🤝 Diplomacy</h2><div class="sub">Gifts and trade warm relations. Wars, demands and cancelled deals chill them. Allies defend each other.</div>
      <table class="ip-dtab"><tr><th>World</th><th>Relations</th><th>Deals</th><th>Navy</th><th></th></tr>${IPG.worlds.filter(w => w.owner === w.i && w.i !== me).map(w => { const r = ipRel(me, w.i), war = ipAtWar(me, w.i);
        return `<tr><td><i class="ip-dot" style="background:${IP_COLS[w.i]}"></i>${esc(IP_WORLDS[w.i].name)} <small>${ipRealm(w.i).length > 1 ? '+' + (ipRealm(w.i).length - 1) : ''}</small></td><td class="${r < -20 ? 'bad' : r > 30 ? 'good' : ''}">${Math.round(r)}</td><td>${war ? '<b class="bad">WAR</b>' : ['trade', 'nap', 'ally'].filter(t => ipPact(me, w.i, t)).map(t => ({ trade: '💱', nap: '🕊️', ally: '🤝' })[t]).join(' ') || '—'}</td><td>${ipFmt(ipNavy(w.i))}</td><td><button class="btn small" data-talk="${w.i}">Talk</button></td></tr>`; }).join('')}</table>
      <div class="actions"><button class="btn small gold" data-act="close-modal">Done</button></div>`);
    $$('[data-talk]').forEach(b => b.onclick = () => IPU.talk(+b.dataset.talk));
};
IPU.talk = function (t) {
    const me = IPG.me, war = ipAtWar(me, t), n = IP_WORLDS[t].name;
    ipModal(`<h2>🤝 ${esc(n)}</h2><div class="sub">${esc(IP_WORLDS[t].ruler)} · relations ${Math.round(ipRel(me, t))} · their navy ${ipFmt(ipNavy(t))}, yours ${ipFmt(ipNavy(me))}</div>
      <div class="ip-acts">${war ? `<button class="btn small gold" data-a="peace">🕊️ Offer peace</button>` : `<button class="btn small" data-a="gift">🎁 Send a gift (60 💰)</button><button class="btn small" data-a="trade" ${ipPact(me, t, 'trade') ? 'disabled' : ''}>💱 Trade deal</button><button class="btn small" data-a="nap" ${ipPact(me, t, 'nap') ? 'disabled' : ''}>🕊️ Non-aggression pact</button><button class="btn small" data-a="ally" ${ipPact(me, t, 'ally') ? 'disabled' : ''}>🤝 Alliance</button><button class="btn small" data-a="tribute">💸 Demand tribute</button>${['trade', 'nap', 'ally'].some(x => ipPact(me, t, x)) ? '<button class="btn small" data-a="cancel">✂️ Cancel deals</button>' : ''}<button class="btn small bad" data-a="war">⚔️ Declare war</button>`}</div>
      <div id="ip-talkmsg" class="sub"></div><div class="actions"><button class="btn small gold" data-act="close-modal">Done</button></div>`);
    $$('.ip-acts [data-a]').forEach(b => b.onclick = () => {
        const a = b.dataset.a;
        const go = () => { const msg = ipAct(t, a); IPU.refresh(); if (a === 'war') { UI.closeModal(); toast('⚔️ War with ' + n + '! Send your navy to attack (🚀 Navy).', 4000); return; } IPU.talk(t); $('#ip-talkmsg').textContent = msg; };
        if (a === 'war') UI.confirm('Declare war on ' + n + '?', 'Every deal with them ends, and their allies may join in.', 'Declare war', go); else go();
    });
};
// ---- goals ----
IPU.goals = function () {
    const me = IPG.me, V = IPG.vic, prog = {
        hegemony: ipRealm(me).length + ' / 7 worlds', wealth: IPG.wealthRun + ' / 36 months richest', federation: ipAllies(me).length + ' / 6 allies',
        stars: ipTechDone(me, 'ark') ? (IPG.ark ? 'launched!' : 'ready to launch') : 'needs the Generation ark', swarm: ipTechDone(me, 'dyson') ? 'navy rank ' + (1 + IPG.worlds.filter(w => w.owner === w.i && ipNavy(w.i) > ipNavy(me)).length) : 'needs the Dyson swarm'
    };
    ipModal(`<h2>🏆 Goals</h2><div class="ip-goals">${IP_VICTORIES.map(v => `<div class="${V[v.id] ? 'won' : ''}"><b>${V[v.id] ? '🏆 ' : ''}${esc(v.n)}</b><small>${esc(v.d)}</small><em>${V[v.id] ? 'Won ' + ipMonthName(V[v.id]) : prog[v.id]}</em></div>`).join('')}</div>
      ${ipTechDone(me, 'ark') && !IPG.ark ? '<div class="actions"><button class="btn small gold" id="ip-ark">🚀 Launch the ark (5,000 💰)</button></div><div id="ip-arkmsg" class="sub"></div>' : ''}
      <div class="actions"><button class="btn small gold" data-act="close-modal">Done</button></div>`);
    if ($('#ip-ark')) $('#ip-ark').onclick = () => { const e = ipLaunchArk(); if (e) $('#ip-arkmsg').textContent = e; else IPU.goals(); };
};
IPU.victory = function (id) {
    const v = IP_VICTORIES.find(x => x.id === id); IPU.save();
    setTimeout(() => ipModal(`<h2>🏆 Victory: ${esc(v.n)}</h2><p style="font-size:15px">${esc(v.d)}. The whole solar system will remember ${esc(IP_WORLDS[IPG.me].name)}.</p><div class="actions"><button class="btn small" id="ip-retire">Retire in triumph</button><button class="btn small gold" data-act="close-modal">Keep playing</button></div>`), 50);
    setTimeout(() => { if ($('#ip-retire')) $('#ip-retire').onclick = () => { ipEnd('victory', 'Victory: ' + v.n, v.d); }; }, 80);
    try { const h = Store.get('hall', []); h.unshift({ country: IP_WORLDS[IPG.me].name + ' (Interplanetary)', flag: '', leader: 'Leader of ' + IP_WORLDS[IPG.me].name, years: (IPG.month / 12).toFixed(1), ending: 'Interplanetary victory: ' + v.n, score: Math.round(ipRealmGdp(IPG.me) * 10), date: ipMonthName(IPG.month), at: Date.now() }); Store.set('hall', h.slice(0, 50)); } catch (e) {}
};
IPU.ended = function () {
    const o = IPG.over; try { localStorage.removeItem('sov.ip.save'); } catch (e) {}
    ipModal(`<h2>${o.kind === 'victory' ? '🏆' : '💀'} ${esc(o.head)}</h2><p style="font-size:15px">${esc(o.text)}</p><p class="sub">${esc(IP_WORLDS[IPG.me].name)}, ${ipMonthName(IPG.month)} · ${(IPG.month / 12).toFixed(1)} years in charge</p><div class="actions"><button class="btn small gold" id="ip-endok">Back to the title</button></div>`);
    $('#ip-endok').onclick = () => { UI.closeModal(); IPU.exit(); };
};
// ---- events ----
IPU.event = function (ev) {
    ipModal(`<h2>${esc(ev.t)}</h2><p style="font-size:14px">${esc(ev.d)}</p><div class="actions ip-evo">${ev.o.map((o, k) => `<button class="btn small ${k ? '' : 'gold'}" data-o="${k}">${esc(o[0])}</button>`).join('')}</div>`);
    $$('.ip-evo [data-o]').forEach(b => b.onclick = () => { ipEventFx(Object.assign({}, ev.o[+b.dataset.o][1])); UI.closeModal(); IPU.refresh(); });
};
// ---- help and menu ----
IPU.help = function () {
    ipModal(`<h2>❔ How to play Interplanetary</h2><div style="font-size:14px;line-height:1.5">
      <p><b>Time</b> runs by itself (Space pauses, 1 2 3 change speed). Each tick is a month.</p>
      <p><b>Your world</b> needs 🌾 food, ⚡ energy and 💧 volatiles every month. Shortages make people unhappy and shrink your population. Build farms, fusion plants and harvesters to keep up, and domes when you run out of room.</p>
      <p><b>Money:</b> taxes on your economy, plus trade deals. Ships cost upkeep. Set taxes and spending in 💰 Economy.</p>
      <p><b>Research</b> (🔬) makes everything better: faster fleets, stronger ships, more room, happier people.</p>
      <p><b>Other worlds</b> have their own plans. Trade with friends, ally with good friends, and when someone is weak and hostile... declare war and send your navy. Taking a world's home topples its government. Conquered worlds pay you but may rebel if unhappy.</p>
      <p><b>Planets move.</b> Travel time depends on where the worlds are in their orbits right now.</p>
      <p><b>Lose</b> if your home is conquered, or if your people stay furious (stability under 8) for three months.</p>
      <p><b>Mouse:</b> drag to turn the view, wheel to zoom, click a world to select it, double-click to fly to it.</p></div>
      <div class="actions"><button class="btn small gold" data-act="close-modal">Got it</button></div>`);
};
IPU.menu = function () {
    ipModal(`<h2>☰ Interplanetary</h2><div class="actions" style="flex-direction:column;align-items:stretch"><button class="btn small gold" data-act="close-modal">Back to the game</button><button class="btn small" id="ip-sv">Save now</button><button class="btn small" id="ip-quit">Save and quit to title</button></div>`);
    $('#ip-sv').onclick = () => { IPU.save(); toast('Saved.'); UI.closeModal(); };
    $('#ip-quit').onclick = () => { UI.closeModal(); IPU.exit(); };
};
addEventListener('keydown', e => {
    if (!IPV.on || !IPG) return;
    const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
    if (!$('#modal').classList.contains('hidden')) { if (e.code === 'Escape') { UI.closeModal(); e.stopImmediatePropagation(); } return; }
    if (e.code === 'Space') { IPU.setSpeed(IPU.speed ? 0 : IPU.last || 2); if (IPU.speed) IPU.last = IPU.speed; e.preventDefault(); e.stopImmediatePropagation(); }
    else if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') { IPU.setSpeed(+e.code.slice(5)); IPU.last = IPU.speed; e.stopImmediatePropagation(); }
    else if (e.code === 'Escape') { IPU.select(-1); e.stopImmediatePropagation(); }
}, true);
addEventListener('beforeunload', () => { if (IPV.on) IPU.save(); });
