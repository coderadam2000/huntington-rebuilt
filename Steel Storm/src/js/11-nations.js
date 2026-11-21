// ============================================================
// NATIONS (3.0): the United States, Germany, the Soviet Union, the United Kingdom and Japan, each with its own tree of REAL
// vehicles (tier I = World War I, II = early WW2, III = mid WW2, IV = late WW2, V = the Cold War) and its own soldiers with real
// guns. The original Steel Storm vehicles stay as the "Coalition" (modern prototypes), so every save keeps what it owns.
// Strength still comes from the class/tier BALANCE table (12-balance.js); these rows give the looks, names and history.
// New vehicles are added after the old ones, so the network index (def.i) of every 2.x vehicle is unchanged.
// ============================================================
const NATIONS = {
    cx: { n: 'Coalition', short: 'CX', cols: ['#4b5563', '#9ca3af'], desc: 'The original Steel Storm tree: modern prototype tanks, jets and warships.' },
    us: { n: 'United States', short: 'USA', cols: ['#1d4ed8', '#dc2626'], desc: 'Shermans and Pershings, Mustangs and Sabres, Fletchers and the Iowa. Plenty of everything.' },
    de: { n: 'Germany', short: 'GER', cols: ['#111827', '#d4a017'], desc: 'Tigers and Panthers, the Stuka and the first jet fighter, U-boats and the Bismarck.' },
    su: { n: 'Soviet Union', short: 'USSR', cols: ['#b91c1c', '#facc15'], desc: 'The T-34 and the IS-2, the Sturmovik and the MiG, Katyushas and huge numbers.' },
    uk: { n: 'United Kingdom', short: 'UK', cols: ['#1e3a8a', '#ef4444'], desc: 'The first tank ever, the Spitfire and the Lancaster, the Dreadnought and the Centurion.' },
    jp: { n: 'Japan', short: 'JPN', cols: ['#f8fafc', '#dc2626'], desc: 'The Zero and the Yamato, nimble tanks and long-range submarines.' }
};
const NAT_IDS = Object.keys(NATIONS);
VEHS.forEach(v => { v.nat = 'cx'; });
// ---- the infantry line ----
LINES.i = { name: 'Infantry', tag: 'SOLDIERS', col: '#e0b25c' };
BRANCHES.i = [['rif', 'Riflemen'], ['smg', 'Assault'], ['mg', 'Machine gunners'], ['at', 'Anti-tank']];
Object.assign(CLS_NAME, { rif: 'Rifleman', smg: 'Assault', mg: 'Machine gunner', at: 'Anti-tank' });
// small arms: dmg per hit (a soldier has 100), rounds per minute, muzzle velocity, magazine, reload seconds, spread, auto?
const SA = (n, dmg, rpm, v, mag, reload, sprd, auto) => ({ n, k: 'bullet', dmg, rl: 60 / rpm, v, life: 1.8, g: 4, sprd, mag, reload, auto: !!auto, sa: 1 });
const GREN = (n, dmg) => ({ n: n || 'Grenades', k: 'bomb', dmg: dmg || 150, cnt: 2, rel: 26, rl: .9, v: 17, g: 13, life: 3.2, sp: 6.5, pierce: .3, lob: .35 });
const ATL = (n, dmg, v, cnt) => ({ n, k: 'rocket', dmg, cnt: cnt || 3, rel: 22, rl: 1.4, v, life: 4, g: 4, sp: 3, pierce: .75, at: 1 });
const ATR = (n, dmg, cnt) => ({ n, k: 'bullet', dmg, cnt: cnt || 5, rel: 14, rl: 1.6, v: 1000, life: 2, g: 2, sprd: .002, pierce: .7, at: 1 });
// nation uniforms (soldier models): uniform, trousers, helmet colour and shape
const UNIFORM = {
    cx: { c: [0x4b5563, 0x374151, 0x2b3038], helm: 'round' }, us: { c: [0x6b6a3e, 0x5c5a3a, 0x4f5638], helm: 'round' },
    de: { c: [0x5d6352, 0x4d5246, 0x4a4f46], helm: 'flare' }, su: { c: [0x8a7f55, 0x6e6544, 0x4f5d38], helm: 'round' },
    uk: { c: [0x7a6a44, 0x6a5a3a, 0x58603a], helm: 'brodie' }, jp: { c: [0x8a7a45, 0x7a6a3c, 0x6b6a3e], helm: 'round' }
};
const INF_SP = { rif: 5.2, smg: 5.6, mg: 4.6, at: 4.8 };
function IV(o) {
    const v = Object.assign({ ln: 'i', r: .55, cd: 4.2, el: 1.25, tt: 9, tn: 6, hp: 100, ar: 0, sp: INF_SP[o.cls], m: { inf: 1, nat: o.nat, cls: o.cls } }, o);
    v.w2 = v.w2 || GREN(o.gren); VEHS.push(v);
}
// a real vehicle row, shaped like an existing model (tpl) with changes (o.m) and the nation's paint
const TPL = id => VEHS.find(v => v.id === id).m;
const GDEF = { lt: [40, 1.5, 300], mt: [80, 2.4, 330], ht: [120, 3.2, 320], td: [140, 3.4, 380], spaa: [9, .12, 520], arty: [200, 7, 170] };
function RV(nat, ln, k, row) {
    const [cls, t, n, year, tpl, req, mo, desc, extra] = row, id = nat + '_' + ln + k, m = Object.assign(JSON.parse(JSON.stringify(TPL(tpl))), mo || {});
    const o = Object.assign({ id, t, cls, n, year, nat, req: req ? nat + '_' + ln + req : null, desc: desc + ' (' + year + ')', m }, extra || {});
    if (ln === 'g') { const g = GDEF[cls]; GV(Object.assign({ hp: 1, ar: 1, sp: 1, tt: cls === 'td' ? 1.6 : cls === 'ht' ? 1.8 : 2.4, dmg: g[0], rl: g[1], v: g[2], prox: cls === 'spaa' ? 5 : undefined }, o)); }
    else if (ln === 'a') {
        const base = { ftr: { minSp: 42, sp: 90, turn: 1.7, gd: 4, grl: .06 }, atk: { minSp: 38, sp: 75, turn: 1.3, gd: 3.5, grl: .08, rk: [4, 60], bm: [2, 180, 14] }, bmb: { minSp: 38, sp: 70, turn: 1, gd: 4, grl: .09, bm: [4, 220, 16] }, heli: { minSp: 0, sp: 55, turn: 1.4, gd: 4, grl: .08, ms: [4, 160] } }[cls];
        AV(Object.assign({ hp: 1, ar: 1 }, base, o));
    } else {
        const base = { pb: { tn: .8, dmg: 30, rl: 1.6, salvo: 1, v: 240 }, dd: { tn: .42, dmg: 80, rl: 2.8, salvo: 2, v: 270, tp: [2, 260] }, cl: { tn: .32, dmg: 110, rl: 3.2, salvo: 3, v: 290 }, bb: { tn: .26, dmg: 200, rl: 5, salvo: 3, v: 310 }, ss: { tn: .5, dmg: 30, rl: 2, salvo: 1, v: 240, tp: [4, 280], w2: null } }[cls];
        NV(Object.assign({ hp: 1, ar: 1, sp: 1 }, base, o));
    }
}
const C = (a, b) => ({ c: [a, b] });
// ---- the five nations' trees. Row: [class, tier, name, year, model template, required (index in this list), model changes, description, extra]
const ROSTER = {
    us: {
        g: [['lt', 1, 'M1917', 1918, 'g1a', null, { ...C(0x5b6b3a, 0x6f7d48), hull: [2.6, .9, 4.6], tur: [1.5, .9, 1.7], gun: [1.4, .1, 1], f: 'cup' }, 'American copy of the Renault FT: the first tank with a turret that turns all the way round'],
            ['lt', 2, 'M3 Stuart', 1941, 'g2a', 1, C(0x5b6b3a, 0x6f7d48), 'Fast, reliable light tank the British nicknamed "Honey"'],
            ['mt', 3, 'M4 Sherman', 1942, 'g1b', 2, { ...C(0x5b6b3a, 0x6f7d48), hull: [3.6, 1.45, 6], tur: [2.4, 1.05, 2.8] }, 'The most famous American tank: tough, simple, built by the tens of thousands'],
            ['td', 3, 'M10 Wolverine', 1942, 'g2c', 2, C(0x5b6b3a, 0x6f7d48), 'Open-topped tank destroyer with a 3-inch gun'],
            ['spaa', 3, 'M16 MGMC', 1943, 'g2f', 2, { ...C(0x5b6b3a, 0x6f7d48), f: 'wl', wh: 3, gun: [2, .07, 4] }, 'Half-track with four .50 calibre machine guns: the "meat chopper"'],
            ['arty', 4, 'M7 Priest', 1942, 'g3f', 3, C(0x5b6b3a, 0x6f7d48), 'Self-propelled 105 mm howitzer on a Sherman chassis'],
            ['ht', 4, 'M26 Pershing', 1945, 'g3b', 3, C(0x4f5d38, 0x6f7d48), 'Heavy tank with a 90 mm gun, built to match the Tiger'],
            ['td', 4, 'M18 Hellcat', 1943, 'g3c', 4, { ...C(0x5b6b3a, 0x6f7d48), hull: [3.2, 1, 6.4] }, 'The fastest tracked vehicle of the war'],
            ['mt', 5, 'M48 Patton', 1953, 'g3d', 7, C(0x4f5d38, 0x5b6b3a), 'Cold War main battle tank with a big rounded turret']],
        a: [['ftr', 1, 'SPAD S.XIII', 1918, 'a1a', null, { ...C(0xa8a070, 0x6b6a3e), f: 'low bi' }, 'Fast, sturdy biplane flown by the American aces of 1918'],
            ['ftr', 2, 'P-40 Warhawk', 1941, 'a2a', 1, C(0x6b6a3e, 0x9aa3ad), 'Shark-mouthed fighter of the Flying Tigers'],
            ['atk', 3, 'P-47 Thunderbolt', 1943, 'a2d', 2, C(0x8a929c, 0x5b6b3a), 'The "Jug": huge, rugged, rockets and bombs for tank busting'],
            ['ftr', 3, 'P-51D Mustang', 1944, 'a2a', 2, { ...C(0xb8c0c8, 0x1d4ed8), len: 9, f: 'low bubble long' }, 'Long-range escort fighter, one of the best of the war'],
            ['bmb', 3, 'B-25 Mitchell', 1941, 'a2c', 2, C(0x6b6a3e, 0x9aa3ad), 'Twin-engine bomber of the Doolittle Raid'],
            ['bmb', 4, 'B-17 Flying Fortress', 1943, 'a2c', 5, { ...C(0xb8c0c8, 0x6b6a3e), len: 16, span: 22, f: 'mid glassnose eng4' }, 'Four-engine heavy bomber bristling with guns'],
            ['ftr', 4, 'P-80 Shooting Star', 1945, 'a2b', 4, C(0xc8ced6, 0x1d4ed8), 'America\'s first operational jet fighter'],
            ['ftr', 5, 'F-86 Sabre', 1949, 'a3a', 7, C(0xc8ced6, 0x1d4ed8), 'Swept-wing jet that fought MiGs over Korea'],
            ['heli', 5, 'UH-1 Huey', 1959, 'a2e', 7, C(0x4f5638, 0x3f4630), 'The iconic helicopter of the Vietnam era, here with missiles']],
        n: [['pb', 1, 'Elco PT boat', 1918, 'n2d', null, C(0x55636e, 0x3f4a52), 'Plywood torpedo boat: tiny, fast and deadly'],
            ['dd', 2, 'Clemson-class', 1919, 'n2b', 1, { fun: 4 }, 'Four-stacker destroyer from the end of World War I'],
            ['ss', 3, 'Gato-class', 1941, 'n3f', 2, null, 'Long-range submarine that fought across the Pacific'],
            ['dd', 3, 'Fletcher-class', 1942, 'n3e', 2, null, 'The workhorse destroyer of the Pacific war'],
            ['cl', 4, 'Cleveland-class', 1942, 'n4d', 4, null, 'Light cruiser bristling with 6-inch guns'],
            ['bb', 5, 'Iowa-class', 1943, 'n5c', 5, null, 'The fastest battleships ever built, nine 16-inch guns']],
        i: [['rif', 1, 'Rifleman', 1942, SA('M1 Garand', 48, 160, 850, 8, 2.2, .004)], ['smg', 2, 'Assault', 1942, SA('Thompson M1A1', 22, 700, 285, 30, 2.4, .03, 1)],
            ['mg', 3, 'Machine gunner', 1942, SA('BAR M1918', 34, 550, 820, 20, 2.6, .018, 1)], ['at', 4, 'Anti-tank', 1943, SA('M1 Carbine', 30, 300, 600, 15, 2, .01), ATL('M1 Bazooka', 270, 85)]]
    },
    de: {
        g: [['mt', 1, 'A7V', 1918, 'g2e', null, { ...C(0x6b6a5a, 0x4a4a3a), hull: [3.2, 1.6, 7.2], tur: [1.6, .6, 1.6], gun: [1.6, .2, 1], f: 'exh' }, 'Germany\'s only tank of World War I: a steel box with 18 men inside'],
            ['lt', 2, 'Panzer II', 1937, 'g1a', 1, { ...C(0x5a5f63, 0x474c50), hull: [2.8, .9, 4.8] }, 'Light tank of the early Blitzkrieg'],
            ['mt', 2, 'Panzer III', 1939, 'g2b', 1, C(0x5a5f63, 0x474c50), 'Medium tank with a crew of five and a radio in every tank'],
            ['mt', 3, 'Panzer IV', 1942, 'g2b', 3, { ...C(0xb59a5a, 0x5f6b3a), gun: [5, .18, 1], f: 'sk cup mz bins exh' }, 'The backbone of the Panzer divisions, made all through the war'],
            ['ht', 3, 'Tiger I', 1942, 'g2e', 3, { ...C(0xb59a5a, 0x7a5a3a), hull: [4.6, 1.6, 6.6], tur: [3.4, 1.3, 3.6], gun: [5.2, .26, 1], f: 'cup mz exh bins' }, 'The feared heavy tank with the 88 mm gun'],
            ['spaa', 3, 'Wirbelwind', 1944, 'g3e', 3, C(0xb59a5a, 0x5f6b3a), 'Panzer IV with four 20 mm flak cannons in an open turret'],
            ['arty', 3, 'Wespe', 1943, 'g3f', 2, C(0xb59a5a, 0x5f6b3a), 'Light 105 mm self-propelled howitzer'],
            ['mt', 4, 'Panther', 1943, 'g4b', 4, { ...C(0xb59a5a, 0x5f6b3a), f: 'sk mz bins exh', ty: 'wedge' }, 'Sloped armour and a long 75 mm gun: one of the best tanks of the war'],
            ['ht', 4, 'Tiger II', 1944, 'g4a', 5, C(0xb59a5a, 0x5f6b3a), 'The King Tiger: the heaviest armour of any tank in the war'],
            ['td', 4, 'Jagdpanther', 1944, 'g4d', 8, C(0xb59a5a, 0x7a5a3a), 'Tank destroyer on the Panther chassis with an 88 mm gun'],
            ['mt', 5, 'Leopard 1', 1965, 'g5b', 8, C(0x4f5d38, 0x3a3f30), 'West Germany\'s fast Cold War main battle tank']],
        a: [['ftr', 1, 'Fokker Dr.I', 1917, 'a1a', null, { ...C(0xb91c1c, 0x7f1d1d), len: 6, span: 7, f: 'low tri' }, 'The Red Baron\'s triplane: slow but turns on a dime'],
            ['ftr', 2, 'Bf 109 E', 1939, 'a2a', 1, C(0x7d8a6e, 0x9aa7b5), 'The main German fighter of the Battle of Britain'],
            ['atk', 2, 'Ju 87 Stuka', 1937, 'a1b', 1, { ...C(0x5f6b3a, 0x9aa7b5), f: 'low framed gear belly' }, 'Dive bomber with a screaming siren'],
            ['ftr', 3, 'Fw 190 A', 1942, 'a2a', 2, C(0x7d8a6e, 0x9aa7b5), 'Rugged radial-engine fighter with heavy cannons'],
            ['bmb', 3, 'He 111', 1937, 'a2c', 3, C(0x5f6b3a, 0x9aa7b5), 'The glass-nosed medium bomber of the Blitz'],
            ['ftr', 4, 'Me 262', 1944, 'a2b', 4, { ...C(0x9aa7b5, 0x5f6b3a), f: 'mid tip side twin' }, 'The world\'s first operational jet fighter'],
            ['ftr', 5, 'F-104G Starfighter', 1960, 'a3c', 6, C(0xb8c0c8, 0x6b7280), 'West German Mach 2 fighter, a missile with a man in it']],
        n: [['pb', 1, 'V25 torpedo boat', 1914, 'n1b', null, null, 'Imperial German Navy torpedo boat of World War I'],
            ['ss', 2, 'U-boat Type VII', 1936, 'n2e', 1, null, 'The most common U-boat of the Battle of the Atlantic'],
            ['dd', 3, 'Z1 Leberecht Maass', 1937, 'n3a', 1, null, 'First of Germany\'s new destroyers'],
            ['cl', 4, 'Admiral Hipper', 1939, 'n3c', 3, null, 'Heavy cruiser of the Kriegsmarine'],
            ['bb', 4, 'Bismarck', 1940, 'n4b', 3, null, 'The legendary battleship that sank HMS Hood']],
        i: [['rif', 1, 'Rifleman', 1939, SA('Kar98k', 62, 55, 760, 5, 2.8, .002)], ['smg', 2, 'Assault', 1940, SA('MP 40', 20, 550, 400, 32, 2.4, .025, 1)],
            ['mg', 3, 'Machine gunner', 1942, SA('MG 42', 26, 1100, 740, 50, 4.5, .03, 1)], ['at', 4, 'Anti-tank', 1943, SA('Walther P38', 28, 220, 350, 8, 1.6, .012), ATL('Panzerschreck', 300, 105)]]
    },
    su: {
        g: [['lt', 1, 'MS-1', 1928, 'g1a', null, { ...C(0x4f5d38, 0x3f4a2c), hull: [2.6, .9, 4.4], tur: [1.5, .9, 1.6], gun: [1.3, .1, 1] }, 'The first Soviet-built tank, based on the Renault FT'],
            ['lt', 2, 'BT-7', 1935, 'g2a', 1, C(0x4f5d38, 0x3f4a2c), 'Very fast light tank that could run on wheels or tracks'],
            ['mt', 3, 'T-34', 1941, 'g4b', 2, { ...C(0x4f5d38, 0x3f4a2c), tur: [2.4, 1, 2.8], gun: [4.2, .19, 1], f: 'exh' }, 'Sloped armour, wide tracks: the tank that changed the war'],
            ['ht', 3, 'KV-1', 1940, 'g2e', 2, C(0x4f5d38, 0x3f4a2c), 'Heavy tank almost nothing could penetrate in 1941'],
            ['td', 3, 'SU-85', 1943, 'g2c', 3, C(0x4f5d38, 0x3f4a2c), 'T-34 chassis with an 85 mm gun in a fixed casemate'],
            ['spaa', 4, 'ZSU-37', 1945, 'g3e', 3, C(0x4f5d38, 0x3f4a2c), 'Self-propelled 37 mm anti-aircraft gun'],
            ['arty', 4, 'BM-13 Katyusha', 1941, 'g4f', 3, { ...C(0x4f5d38, 0x3f4a2c), f: 'wl', wh: 3 }, 'Truck-mounted rocket launcher: "Stalin\'s organ"'],
            ['mt', 4, 'T-34-85', 1944, 'g3d', 3, C(0x4f5d38, 0x3f4a2c), 'The T-34 with a bigger turret and an 85 mm gun'],
            ['ht', 4, 'IS-2', 1944, 'g3b', 4, { ...C(0x4f5d38, 0x3f4a2c), gun: [5.4, .3, 1] }, 'Heavy breakthrough tank with a massive 122 mm gun'],
            ['td', 4, 'SU-100', 1944, 'g3c', 5, C(0x4f5d38, 0x3f4a2c), 'Tank destroyer with a 100 mm gun'],
            ['mt', 5, 'T-55', 1958, 'g5b', 8, C(0x4f5d38, 0x3f4a2c), 'The most-produced tank in history']],
        a: [['ftr', 1, 'Polikarpov I-5', 1930, 'a1a', null, { ...C(0x5f6b3a, 0xb91c1c), f: 'low bi' }, 'Soviet biplane fighter of the early 1930s'],
            ['ftr', 2, 'Polikarpov I-16', 1934, 'a1a', 1, C(0x5f6b3a, 0x9aa7b5), 'Stubby, fast monoplane: the first with retractable gear'],
            ['atk', 3, 'Il-2 Sturmovik', 1941, 'a2d', 2, C(0x5f6b3a, 0x9aa7b5), 'Armoured ground attacker, the most-built military plane ever'],
            ['ftr', 3, 'Yak-9', 1942, 'a2a', 2, C(0x6b7280, 0x9aa7b5), 'Light and nimble fighter flown by many Soviet aces'],
            ['bmb', 3, 'Pe-2', 1941, 'a2c', 2, C(0x5f6b3a, 0x9aa7b5), 'Fast twin-engine dive bomber'],
            ['ftr', 4, 'MiG-15', 1949, 'a3a', 4, C(0xc8ced6, 0xb91c1c), 'Swept-wing jet that shocked the West over Korea'],
            ['ftr', 5, 'MiG-21', 1959, 'a3c', 6, C(0xc8ced6, 0xb91c1c), 'Delta-wing Mach 2 fighter flown by 50 countries'],
            ['heli', 5, 'Mi-24 Hind', 1972, 'a4f', 6, C(0x5f6b3a, 0x8a7f55), 'The flying tank: a gunship that carries troops']],
        n: [['pb', 1, 'G-5 torpedo boat', 1933, 'n2d', null, null, 'Fast aluminium torpedo boat'],
            ['dd', 2, 'Gnevny-class', 1938, 'n2b', 1, null, 'Destroyers of the Soviet fleet in World War II'],
            ['ss', 2, 'Shchuka-class', 1933, 'n2e', 1, null, 'Medium submarine, named the "pike"'],
            ['bb', 3, 'Gangut-class', 1914, 'n2c', 2, { k: 'bb', len: 46, w: 7.4, tur: [[14, 1.8, 3], [5, 1.8, 3], [-5, 1.8, 3], [-14, 1.8, 3]], br: [8, 2.6], fun: 2 }, 'Dreadnought battleship from the Tsar\'s navy'],
            ['cl', 4, 'Kirov-class', 1938, 'n3b', 2, null, 'Fast cruiser with 180 mm guns']],
        i: [['rif', 1, 'Rifleman', 1941, SA('Mosin-Nagant', 62, 50, 860, 5, 3, .002)], ['smg', 2, 'Assault', 1941, SA('PPSh-41', 16, 1000, 490, 71, 3.2, .035, 1)],
            ['mg', 3, 'Machine gunner', 1942, SA('DP-28', 30, 550, 840, 47, 3.8, .022, 1)], ['at', 4, 'Anti-tank', 1942, SA('TT-33 pistol', 28, 240, 420, 8, 1.6, .012), ATR('PTRS-41 anti-tank rifle', 95, 5)]]
    },
    uk: {
        g: [['mt', 1, 'Mark IV', 1917, 'g1b', null, { ...C(0x6b6a45, 0x55543a), hull: [3.6, 1.6, 7.6], tur: [1.2, .5, 1.2], gun: [1.8, .16, 1], ty: 'box', f: 'exh' }, 'The rhomboid tank of the Western Front: the first tanks in history'],
            ['lt', 2, 'Crusader', 1941, 'g2a', 1, C(0xc2ad74, 0x8a7a55), 'Fast cruiser tank of the desert war'],
            ['ht', 2, 'Matilda II', 1939, 'g2e', 1, C(0xc2ad74, 0x6b6a45), 'Slow infantry tank, "Queen of the Desert" in 1940'],
            ['mt', 3, 'Cromwell', 1944, 'g2b', 2, C(0x5b6b3a, 0x4f5638), 'The fastest British tank of the war'],
            ['ht', 3, 'Churchill', 1941, 'g3b', 3, { ...C(0x5b6b3a, 0x4f5638), hull: [4.2, 1.5, 7.6] }, 'Long, slow, very heavily armoured infantry tank'],
            ['td', 3, 'Achilles', 1944, 'g2c', 2, C(0x5b6b3a, 0x4f5638), 'Tank destroyer with the powerful 17-pounder'],
            ['spaa', 3, 'Crusader AA', 1943, 'g2f', 2, C(0x5b6b3a, 0x4f5638), 'Crusader with twin 20 mm Oerlikons'],
            ['arty', 4, 'Sexton', 1943, 'g3f', 4, C(0x5b6b3a, 0x4f5638), 'Self-propelled 25-pounder'],
            ['mt', 4, 'Comet', 1944, 'g3d', 4, C(0x5b6b3a, 0x4f5638), 'Fast cruiser tank with a 77 mm gun'],
            ['mt', 5, 'Centurion', 1945, 'g5b', 9, C(0x4f5638, 0x3f4630), 'One of the most successful tank designs ever'],
            ['ht', 5, 'Chieftain', 1966, 'g5c', 5, C(0x4f5638, 0x3f4630), 'Heavily armoured Cold War tank with a 120 mm gun']],
        a: [['ftr', 1, 'Sopwith Camel', 1917, 'a1a', null, { ...C(0x6b6a3e, 0xc2ad74), f: 'low bi' }, 'The biplane that shot down more aircraft than any other in WW1'],
            ['ftr', 2, 'Hawker Hurricane', 1937, 'a2a', 1, C(0x5f6b3a, 0x8a7a55), 'Fighter that downed most enemy planes in the Battle of Britain'],
            ['ftr', 3, 'Spitfire Mk IX', 1942, 'a2a', 2, { ...C(0x6b7280, 0x5f6b3a), len: 8.8 }, 'The elliptical-winged legend'],
            ['atk', 3, 'Hawker Typhoon', 1942, 'a2d', 2, C(0x6b7280, 0x5f6b3a), 'Rocket-firing tank buster of Normandy'],
            ['bmb', 4, 'Avro Lancaster', 1942, 'a2c', 4, { ...C(0x3f4630, 0x111827), len: 16, span: 22, f: 'mid glassnose twintail eng4' }, 'Four-engine heavy bomber of the Dambusters'],
            ['ftr', 4, 'Gloster Meteor', 1944, 'a2b', 3, { ...C(0xb8c0c8, 0x5f6b3a), f: 'mid tip side twin' }, 'The Allies\' first jet fighter'],
            ['ftr', 5, 'Hawker Hunter', 1954, 'a3a', 6, C(0x6b7280, 0x5f6b3a), 'Graceful transonic jet fighter'],
            ['bmb', 5, 'Avro Vulcan', 1956, 'a5c', 5, C(0xe2e8f0, 0x9aa3ad), 'Huge delta-wing V-bomber']],
        n: [['pb', 1, 'Coastal Motor Boat', 1916, 'n2d', null, null, 'Fast torpedo skimmer of World War I'],
            ['bb', 2, 'HMS Dreadnought', 1906, 'n2c', 1, { k: 'bb', len: 44, w: 7, tur: [[13, 1.8, 2], [3, 1.8, 2], [-7, 1.8, 2], [-14, 1.8, 2]], br: [7, 2.6], fun: 2 }, 'The battleship that made every other battleship obsolete'],
            ['dd', 2, 'V and W-class', 1917, 'n2b', 1, null, 'Destroyers from WW1 that served all through WW2'],
            ['ss', 3, 'T-class', 1938, 'n3f', 3, null, 'Ocean-going patrol submarine'],
            ['dd', 3, 'Tribal-class', 1938, 'n3a', 3, null, 'Big, heavily armed destroyers'],
            ['cl', 4, 'Town-class', 1937, 'n4d', 5, null, 'Light cruiser with four triple 6-inch turrets'],
            ['bb', 5, 'King George V-class', 1940, 'n4b', 2, null, 'Battleship that hunted down the Bismarck']],
        i: [['rif', 1, 'Rifleman', 1941, SA('Lee-Enfield No.4', 56, 90, 740, 10, 3, .003)], ['smg', 2, 'Assault', 1941, SA('Sten Mk II', 19, 550, 365, 32, 2.4, .03, 1)],
            ['mg', 3, 'Machine gunner', 1940, SA('Bren', 32, 500, 740, 30, 2.8, .014, 1)], ['at', 4, 'Anti-tank', 1943, SA('Webley revolver', 32, 160, 200, 6, 2.2, .012), ATL('PIAT', 260, 75)]]
    },
    jp: {
        g: [['lt', 1, 'Renault Ko-Gata', 1919, 'g1a', null, { ...C(0x7a7044, 0x5f5a36), hull: [2.6, .9, 4.6], tur: [1.5, .9, 1.7], gun: [1.3, .1, 1] }, 'Japan\'s first tanks, bought from France'],
            ['lt', 2, 'Type 95 Ha-Go', 1935, 'g2a', 1, C(0x7a7044, 0x5f6b3a), 'Light tank that fought from Manchuria to the Pacific islands'],
            ['mt', 2, 'Type 97 Chi-Ha', 1938, 'g1b', 1, C(0x7a7044, 0x5f6b3a), 'The most common Japanese medium tank'],
            ['mt', 3, 'Type 1 Chi-He', 1942, 'g2b', 3, C(0x7a7044, 0x5f6b3a), 'Improved medium tank with welded armour'],
            ['td', 3, 'Type 1 Ho-Ni', 1942, 'g2c', 3, C(0x7a7044, 0x5f6b3a), 'Tank destroyer with a 75 mm field gun'],
            ['spaa', 3, 'Type 98 Ta-Se', 1941, 'g2f', 2, C(0x7a7044, 0x5f6b3a), 'Light anti-aircraft tank with a 20 mm cannon'],
            ['arty', 4, 'Type 4 Ho-Ro', 1944, 'g3f', 4, C(0x7a7044, 0x5f6b3a), 'Self-propelled 150 mm howitzer'],
            ['mt', 4, 'Type 4 Chi-To', 1944, 'g3d', 4, C(0x7a7044, 0x5f6b3a), 'Japan\'s best tank of the war, with a 75 mm gun'],
            ['ht', 4, 'Type 5 Chi-Ri', 1945, 'g3b', 4, C(0x7a7044, 0x5f6b3a), 'The biggest Japanese tank, never used in battle'],
            ['mt', 5, 'Type 61', 1961, 'g5b', 8, C(0x4f5638, 0x3f4630), 'Japan\'s first post-war main battle tank']],
        a: [['ftr', 1, 'Nakajima Ko-4', 1923, 'a1a', null, { ...C(0x8a929c, 0xdc2626), f: 'low bi' }, 'Licence-built French fighter biplane'],
            ['ftr', 2, 'A6M2 Zero', 1940, 'a2a', 1, C(0xe2e0d0, 0x5f6b3a), 'The long-range, very nimble navy fighter'],
            ['atk', 2, 'Aichi D3A "Val"', 1940, 'a1b', 1, C(0x5f6b3a, 0xe2e0d0), 'Dive bomber of Pearl Harbor'],
            ['ftr', 3, 'Ki-84 Hayate', 1944, 'a2a', 2, C(0x5f6b3a, 0x9aa3ad), 'Fast, powerful army fighter'],
            ['bmb', 3, 'G4M "Betty"', 1941, 'a2c', 3, C(0x5f6b3a, 0x9aa3ad), 'Long-range twin-engine bomber'],
            ['ftr', 4, 'Nakajima Kikka', 1945, 'a2b', 4, { ...C(0x5f6b3a, 0x9aa3ad), f: 'mid tip side twin' }, 'Japan\'s first jet, inspired by the Me 262'],
            ['ftr', 5, 'F-86F Sabre', 1955, 'a3a', 6, C(0xc8ced6, 0xdc2626), 'Sabres flown by the Japan Air Self-Defense Force']],
        n: [['pb', 1, 'Shirakumo', 1902, 'n1b', null, null, 'Early torpedo boat destroyer'],
            ['dd', 2, 'Fubuki-class', 1928, 'n2b', 1, null, 'The "special type" destroyers that outgunned everyone'],
            ['ss', 3, 'I-400-class', 1944, 'n4e', 2, null, 'The largest submarines of the war'],
            ['cl', 3, 'Mogami-class', 1935, 'n3c', 2, null, 'Cruiser with five triple turrets'],
            ['bb', 4, 'Nagato-class', 1920, 'n4a', 2, null, 'The first battleship with 16-inch guns'],
            ['bb', 5, 'Yamato-class', 1941, 'n5c', 5, null, 'The largest battleship ever built: nine 18-inch guns']],
        i: [['rif', 1, 'Rifleman', 1941, SA('Arisaka Type 99', 60, 55, 730, 5, 3, .002)], ['smg', 2, 'Assault', 1942, SA('Type 100 SMG', 18, 800, 335, 30, 2.6, .03, 1)],
            ['mg', 3, 'Machine gunner', 1941, SA('Type 99 LMG', 31, 800, 715, 30, 2.8, .02, 1)], ['at', 4, 'Anti-tank', 1941, SA('Nambu pistol', 26, 220, 330, 8, 1.6, .012), ATR('Type 97 20 mm AT rifle', 90, 7)]]
    }
};
// the Coalition's soldiers (modern kit), so every nation, including the old tree, can fight on foot
ROSTER.cx = { i: [['rif', 1, 'Rifleman', 1990, SA('Battle rifle', 45, 300, 850, 20, 2.4, .006, 1)], ['smg', 2, 'Assault', 1990, SA('Carbine', 26, 700, 880, 30, 2.4, .02, 1)],
    ['mg', 3, 'Machine gunner', 1990, SA('Light machine gun', 28, 800, 900, 100, 5, .025, 1)], ['at', 4, 'Anti-tank', 1990, SA('Pistol', 30, 300, 400, 15, 1.6, .012), ATL('Rocket launcher', 290, 120)]] };
for (const nat of NAT_IDS) {
    const R = ROSTER[nat]; if (!R) continue;
    for (const ln of ['g', 'a', 'n']) if (R[ln]) R[ln].forEach((row, k) => RV(nat, ln, k + 1, row));
    if (R.i) R.i.forEach(([cls, t, n, year, w1, w3], k) => IV({ id: nat + '_i' + (k + 1), t, cls, n, nat, year, req: k ? nat + '_i' + k : null, w1, w3,
        desc: NATIONS[nat].n + ' ' + n.toLowerCase() + ' with the ' + w1.n + (w3 ? ' and the ' + w3.n : '') + '. Left mouse fire, G grenade' + (w3 ? ', F ' + w3.n : '') + ', R reload, Shift sprint, Space jump.' }));
}
