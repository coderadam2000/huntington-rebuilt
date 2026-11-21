// ==========================================
// ZOOM: sound, all made on the fly (no files): an engine that follows your speed, effects, and a little
// looping tune per theme. M (the lobby's sound button) mutes everything.
// ==========================================
const AU = { ac: null, eng: null, mus: null, musT: 0, step: 0 };
function auCtx() {
    if (MGS.muted) return null;
    try { AU.ac = AU.ac || new (window.AudioContext || window.webkitAudioContext)(); if (AU.ac.state === 'suspended') AU.ac.resume(); } catch (e) { return null; }
    if (!AU.master) { AU.master = AU.ac.createGain(); AU.master.gain.value = 0.7; AU.master.connect(AU.ac.destination); }
    return AU.ac;
}
function tone(f, len, type, vol, f2, delay) {
    const a = auCtx(); if (!a) return; const t0 = a.currentTime + (delay || 0);
    const o = a.createOscillator(), g = a.createGain(); o.type = type || 'square'; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + len);
    g.gain.setValueAtTime(vol || 0.05, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + len); o.connect(g); g.connect(AU.master); o.start(t0); o.stop(t0 + len + 0.03);
}
function noise(len, vol, hp, delay) {
    const a = auCtx(); if (!a) return; const t0 = a.currentTime + (delay || 0);
    const n = Math.floor(a.sampleRate * len), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = buf; f.type = hp ? 'highpass' : 'lowpass'; f.frequency.value = hp || 900; g.gain.value = vol || 0.1;
    s.connect(f); f.connect(g); g.connect(AU.master); s.start(t0);
}
function sfx(n) {
    switch (n) {
        case 'ui': tone(700, 0.05, 'triangle', 0.04); break;
        case 'beep': tone(520, 0.22, 'square', 0.06); break;
        case 'go': tone(1040, 0.5, 'square', 0.07); break;
        case 'box': tone(880, 0.08, 'triangle', 0.05); tone(1320, 0.1, 'triangle', 0.05, 0, 0.06); break;
        case 'item': tone(1200, 0.12, 'triangle', 0.06); break;
        case 'use': tone(500, 0.1, 'square', 0.04, 900); break;
        case 'throw': noise(0.18, 0.08, 1500); break;
        case 'coin': tone(988, 0.06, 'square', 0.04); tone(1319, 0.12, 'square', 0.04, 0, 0.05); break;
        case 'boost': noise(0.5, 0.12, 400); tone(220, 0.45, 'sawtooth', 0.05, 660); break;
        case 'spark1': tone(900, 0.06, 'triangle', 0.035); break;
        case 'spark2': tone(1100, 0.06, 'triangle', 0.035); break;
        case 'spark3': tone(1400, 0.08, 'triangle', 0.04); break;
        case 'trick': tone(700, 0.15, 'triangle', 0.05, 1400); break;
        case 'land': noise(0.12, 0.06); break;
        case 'bonk': noise(0.15, 0.12); tone(110, 0.12, 'square', 0.06, 60); break;
        case 'bump': tone(160, 0.1, 'square', 0.05, 90); break;
        case 'hit': tone(400, 0.4, 'sawtooth', 0.06, 80); break;
        case 'boom': noise(0.7, 0.25); tone(90, 0.6, 'sawtooth', 0.08, 30); break;
        case 'shield': tone(1500, 0.2, 'sine', 0.06, 600); break;
        case 'storm': noise(0.9, 0.2, 200); tone(60, 0.8, 'sawtooth', 0.07, 40); break;
        case 'splat': noise(0.3, 0.12); tone(300, 0.2, 'sine', 0.06, 100); break;
        case 'fall': tone(600, 0.8, 'sine', 0.05, 120); break;
        case 'lap': tone(784, 0.12, 'triangle', 0.06); tone(1046, 0.18, 'triangle', 0.06, 0, 0.1); break;
        case 'final': [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.14, 'square', 0.05, 0, i * 0.09)); break;
        case 'win': [523, 659, 784, 1046, 1319].forEach((f, i) => tone(f, 0.22, 'triangle', 0.07, 0, i * 0.11)); break;
        case 'done': [523, 659, 784].forEach((f, i) => tone(f, 0.2, 'triangle', 0.06, 0, i * 0.12)); break;
        case 'lose': [392, 330, 262].forEach((f, i) => tone(f, 0.25, 'triangle', 0.06, 0, i * 0.14)); break;
        case 'ko': tone(300, 0.3, 'square', 0.05, 120); break;
        case 'buy': [784, 1046, 1568].forEach((f, i) => tone(f, 0.12, 'square', 0.05, 0, i * 0.07)); break;
        case 'no': tone(180, 0.2, 'square', 0.05, 120); break;
    }
}
// the engine: two detuned saws through a low-pass, pitched by speed
function engineSound() {
    const K = Z.me, a = (Z.state === 'race' && !Z.paused && K) ? auCtx() : null;
    if (!a) { if (AU.eng) { AU.eng.g.gain.setTargetAtTime(0, AU.ac.currentTime, 0.05); } return; }
    if (!AU.eng) {
        const o1 = a.createOscillator(), o2 = a.createOscillator(), f = a.createBiquadFilter(), g = a.createGain();
        o1.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 600; g.gain.value = 0;
        o1.connect(f); o2.connect(f); f.connect(g); g.connect(AU.master); o1.start(); o2.start(); AU.eng = { o1, o2, f, g };
    }
    const r = clamp(Math.abs(K.sp) / K.S.top, 0, 1.4), base = (K.V.bike ? 70 : 52) + r * (K.V.bike ? 150 : 120) + (K.boost > 0 ? 30 : 0), t = a.currentTime;
    AU.eng.o1.frequency.setTargetAtTime(base, t, 0.05); AU.eng.o2.frequency.setTargetAtTime(base * 0.502, t, 0.05);
    AU.eng.f.frequency.setTargetAtTime(380 + r * 900, t, 0.08);
    AU.eng.g.gain.setTargetAtTime(K.out || K.finished ? 0.012 : 0.028 + r * 0.025, t, 0.08);
}
// music: a bass line and an arpeggio, scheduled a little ahead
const MUSIC = {
    meadow: [132, [0, 4, 7, 12], [0, 5, 7, 4]], beach: [120, [0, 4, 7, 9], [0, 9, 5, 7]], pine: [126, [0, 3, 7, 10], [0, 8, 3, 5]], city: [140, [0, 3, 7, 10], [0, 0, 8, 7]],
    desert: [128, [0, 1, 5, 7], [0, 5, 1, 0]], snow: [118, [0, 4, 7, 11], [0, 9, 4, 7]], factory: [146, [0, 3, 6, 10], [0, 0, 3, 6]], reef: [112, [0, 2, 7, 9], [0, 4, 9, 7]],
    volcano: [150, [0, 3, 7, 8], [0, 8, 5, 3]], sky: [124, [0, 4, 7, 14], [0, 5, 9, 7]], haunted: [116, [0, 3, 6, 9], [0, 1, 6, 3]], space: [138, [0, 7, 12, 15], [0, 3, 10, 7]]
};
function musicStart(theme) {
    musicStop(); const m = MUSIC[theme] || MUSIC.meadow; AU.step = 0; const a = auCtx(); if (!a) return;
    const spb = 60 / m[0] / 2, root = 110 * Math.pow(2, ((theme.length * 3) % 7) / 12);
    AU.next = a.currentTime + 0.1;
    AU.mus = setInterval(() => {
        const a2 = auCtx(); if (!a2 || Z.paused) return;
        while (AU.next < a2.currentTime + 0.25) {
            const s = AU.step++, bar = Math.floor(s / 8) % 4, chord = m[2][bar], dl = AU.next - a2.currentTime;
            if (s % 2 === 0) tone(root / 2 * Math.pow(2, chord / 12), spb * 1.6, 'triangle', 0.035, 0, dl);
            tone(root * 2 * Math.pow(2, (chord + m[1][s % 4]) / 12), spb * 0.9, 'square', 0.012, 0, dl);
            if (s % 4 === 2) noise(0.05, 0.03, 5000, dl);
            AU.next += spb;
        }
    }, 90);
}
function musicStop() { clearInterval(AU.mus); AU.mus = null; }
