// ==========================================
// ZOOM: bots. Each follows the road a little to one side (its lane drifts over time and swerves toward item
// boxes and around hazards), slows for sharp corners, drifts the long ones for mini-turbos, and uses items
// sensibly (attacks when someone is in front, drops traps when someone is behind, saves nitros for straights).
// skill 0..1 (from the speed class and the bot itself) decides how clean its line is and how quick it reacts.
// ==========================================
function botInit(K, skill, rnd) {
    K.ai = { skill, lane: (rnd() * 2 - 1) * 0.5, laneT: 0, itemT: 1 + rnd() * 2, dHold: 0, wob: rnd() * TAU, rnd };
}
function botThink(K, dt) {
    const T = Z.T, A = K.ai, inp = K.input, R = Z.race;
    if (K.out) { inp.gas = 0; inp.steer = 0; inp.drift = false; return; }
    A.laneT -= dt;
    if (A.laneT <= 0) { A.laneT = 2 + A.rnd() * 3; A.lane = clamp(A.lane + (A.rnd() * 2 - 1) * 0.5, -0.65, 0.65); }
    // look ahead along the road
    const look = 7 + Math.max(0, K.sp) * (0.42 + 0.2 * A.skill), ai = K.ti + look / T.step;
    let lane = A.lane * T.hw;
    // swerve toward an item box when empty-handed, around traps always
    const fwd = ((K.ti + 25 / T.step) | 0) % T.N;
    if (!K.item && K.roll <= 0) for (const b of T.boxes) { const di = ((b.i - K.ti) % T.N + T.N) % T.N; if (di > 2 && di < 40 / T.step && b.t <= 0) { const p = trackProject(T, b.x, b.y, b.z, b.i); lane = lerp(lane, p.lat, 0.6 * A.skill + 0.2); break; } }
    for (const f of Z.fx) if ((f.kind === 'oil' || f.kind === 'mine') && f.by !== K.id) { const di = ((f.ti - K.ti) % T.N + T.N) % T.N; if (di > 0 && di < 30 / T.step) { const p = trackProject(T, f.x, f.y, f.z, f.ti); if (Math.abs(p.lat - lane) < 3.2) lane = p.lat + (p.lat > 0 ? -4.5 : 4.5) * A.skill; } }
    // corners: hug the inside a little
    const c = T.curv[fwd]; lane = clamp(lane - clamp(c * 40, -1, 1) * T.hw * 0.35 * A.skill, -T.hw * 0.8, T.hw * 0.8);
    const tp = trackPoint(T, ai, lane);
    const want = Math.atan2(-(tp.x - K.x), -(tp.z - K.z)), err = angDiff(K.h, want) + Math.sin(Z.t * 0.7 + A.wob) * 0.04 * (1 - A.skill);
    let steer = clamp(err * (2.4 + A.skill), -1, 1);
    if (K.ink > 0) steer = clamp(steer + Math.sin(Z.t * 3 + A.wob) * 0.6, -1, 1);
    // how sharp is the road ahead?
    let turn = 0; const n = Math.round(Math.max(10, K.sp * 1.3) / T.step);
    for (let k = 2; k < n; k += 3) turn += T.curv[((K.ti | 0) + k) % T.N] * 3 * T.step;
    const sharp = Math.abs(turn);
    let gas = 1;
    if (sharp > 1.35 && K.sp > K.S.top * 0.7) gas = A.skill > 0.9 ? 0.3 : 0;
    if (sharp > 1.9 && K.sp > K.S.top * 0.6) gas = -0.4;
    if (Math.abs(err) > 1.3 && K.sp > 8) gas = 0.2;
    // drifting: on long corners
    if (K.drift === 0) { if (sharp > 0.7 && K.sp > 14 && A.skill > 0.45 && Math.abs(steer) > 0.3) { A.dHold = 0.6 + sharp * 0.8; inp.drift = true; } else inp.drift = false; }
    else { A.dHold -= dt; if (A.dHold <= 0 || sharp < 0.2 || (K.dLevel >= 2 && A.skill < 0.8 && sharp < 0.5)) inp.drift = false; steer = clamp(steer * 1.2, -1, 1); }
    // reversing out of a wall
    if (K.stuckT === undefined) K.stuckT = 0;
    if (R.go && K.sp < 2 && !kartStunned(K)) K.stuckT += dt; else K.stuckT = Math.max(0, K.stuckT - dt);
    if (K.stuckT > 1.2) { gas = -1; steer = -steer; if (K.stuckT > 2.2) K.stuckT = 0; }
    inp.gas = gas; inp.steer = steer; inp.back = false;
    // items
    inp.item = false;
    if ((K.item || K.golden > 0) && R.go) {
        A.itemT -= dt;
        if (A.itemT <= 0) {
            const id = K.golden > 0 ? 'golden' : K.item, ahead = kartAhead(K), behind = Z.karts.find(o => o !== K && !o.out && o.place === K.place + 1);
            const dA = ahead ? Math.hypot(ahead.x - K.x, ahead.z - K.z) : 1e9, dB = behind ? Math.hypot(behind.x - K.x, behind.z - K.z) : 1e9;
            let use = false;
            if (id === 'nitro' || id === 'nitro3' || id === 'golden') use = sharp < 0.5 && !K.off ? true : K.off;
            else if (id === 'bumper') { if (ahead && dA < 35 && Math.abs(angDiff(K.h, Math.atan2(-(ahead.x - K.x), -(ahead.z - K.z)))) < 0.25) use = true; else if (behind && dB < 15) { use = true; inp.back = true; } }
            else if (id === 'seeker' || id === 'magnet') use = !!ahead;
            else if (id === 'bomb') use = ahead && dA < 30;
            else if (id === 'oil' || id === 'mine') use = (behind && dB < 25) || A.rnd() < 0.15;
            else if (id === 'storm' || id === 'ink') use = K.place > 1;
            else use = true;
            if (A.rnd() < 0.05) use = true;             // nobody holds forever
            if (use) { inp.item = true; A.itemT = id === 'golden' ? 0.7 : 0.8 + A.rnd() * 1.5 * (1.4 - A.skill); }
            else A.itemT = 0.3;
        }
    }
}
// catch-up: bots well behind the humans speed up a bit, bots far ahead ease off (keeps races close)
function botRubber() {
    const R = Z.race, hum = Z.karts.filter(k => !k.isBot), N = Z.T.N;
    if (!hum.length) return;
    const ref = Math.max(...hum.map(k => k.prog));
    for (const K of Z.karts) if (K.isBot) {
        const gap = (K.prog - ref) * Z.T.step, cls = CLASSES[R.cls].ai;
        K.aiMul = cls * (K.botSpd || 1) * (gap < -150 ? 1.09 : gap < -60 ? 1.04 : gap > 160 ? 0.93 : gap > 70 ? 0.97 : 1);
    }
}
