// ===================== 2.3: auto respawn + idle animations =====================

// Auto respawn (a toggle next to Music, remembered on this device and account): dying puts you straight back at the start
// of the level, with the roast as a toast instead of the death screen. One Life still shows its LIFE LOST screen.
const AUTORESPAWN_KEY = 'spikes100_autorespawn';
let autoRespawn = (() => { try { return localStorage.getItem(AUTORESPAWN_KEY) === 'on'; } catch (e) { return false; } })();
const AUTORESPAWN_DELAY = 550;      // ms: long enough to see the burst of particles
function autoRespawnLabel() { return '↻ Auto respawn: ' + (autoRespawn ? 'on' : 'off'); }
function autoRespawnToggle() {
    autoRespawn = !autoRespawn;
    try { localStorage.setItem(AUTORESPAWN_KEY, autoRespawn ? 'on' : 'off'); } catch (e) {}
    document.querySelectorAll('.autoRespawnBtn').forEach(b => { b.textContent = autoRespawnLabel(); });
    showToast(autoRespawn ? 'Auto respawn on: you go straight back to the start when you die' : 'Auto respawn off');
}
// called by triggerDeath(): true = it is handling this death (no death screen)
function autoRespawnDeath(roast, token) {
    if (!autoRespawn || (playMode === 'campaign' && isOneLife)) return false;
    showToast(roast);
    setTimeout(() => { if (gameState === 'DEAD' && token === deathToken) retryLevel(); }, AUTORESPAWN_DELAY);
    return true;
}
(function () {
    const mk = () => { const b = document.createElement('button'); b.className = 'btn-small btn-grey autoRespawnBtn'; b.textContent = autoRespawnLabel();
        b.onclick = e => { e.stopPropagation(); autoRespawnToggle(); }; return b; };
    const rows = document.querySelectorAll('#startScreen .menu-row'), row = rows[rows.length - 1]; if (row) row.appendChild(mk());
    const pr = document.querySelectorAll('#pauseScreen .menu-row'), prow = pr[pr.length - 1]; if (prow) prow.appendChild(mk());
})();

// Idle animations: stand still for a few seconds and the cube gets bored. It blinks, looks around, stretches, hops,
// and in the end falls asleep (Zzz). Any key wakes it up. Only looks: nothing here touches the physics.
const IDLE = { since: 0, seed: 0, wasIdle: false };
const IDLE_AFTER = 5000, IDLE_SLEEP = 24000;      // ms standing still before the show starts / before it dozes off
function idleTrack(now) {
    const still = gameState === 'PLAYING' && player.grounded && !keys.left && !keys.right && !keys.jump && Math.abs(player.vx) < 0.05;
    if (!still) { IDLE.since = now; IDLE.wasIdle = false; return 0; }
    const t = now - IDLE.since;
    if (t >= IDLE_AFTER && !IDLE.wasIdle) { IDLE.wasIdle = true; IDLE.seed = Math.floor(Math.random() * 4); }
    return t;
}
// what the cube looks like right now: { sx, sy, eyeX, eyeY, eyesShut, zzz }
function idlePose(now) {
    const t = idleTrack(now), pose = { sx: 1, sy: 1, eyeX: null, eyeY: 0, eyesShut: false, zzz: 0, hop: 0 };
    // a blink every ~3.2s as soon as you stop, even before the show
    if (t > 1200 && (t % 3200) < 140) pose.eyesShut = true;
    if (t < IDLE_AFTER) return pose;
    if (t >= IDLE_SLEEP) {           // asleep: eyes shut, slow breathing, Zzz drifting up
        const b = Math.sin((t - IDLE_SLEEP) / 700);
        pose.eyesShut = true; pose.sy = 1 + 0.05 * b; pose.sx = 1 - 0.03 * b; pose.zzz = t - IDLE_SLEEP;
        return pose;
    }
    // one bit of the routine every 4s, starting with a random one
    const step = Math.floor((t - IDLE_AFTER) / 4000), u = ((t - IDLE_AFTER) % 4000) / 4000, kind = (step + IDLE.seed) % 4;
    if (kind === 0) {                // look left, then right
        pose.eyeX = u < 0.45 ? -5 : u < 0.9 ? 5 : 0;
    } else if (kind === 1) {         // big stretch: tall and thin, then squash back
        const k = Math.sin(Math.min(1, u / 0.7) * Math.PI);
        pose.sy = 1 + 0.28 * k; pose.sx = 1 - 0.16 * k; pose.eyeY = -2 * k;
        if (u > 0.3 && u < 0.6) pose.eyesShut = true;
    } else if (kind === 2) {         // two little hops (drawn only)
        const h = u < 0.5 ? Math.sin(u / 0.5 * Math.PI) : u < 0.8 ? Math.sin((u - 0.5) / 0.3 * Math.PI) * 0.6 : 0;
        pose.hop = 9 * h; pose.sy = 1 + 0.08 * h; pose.sx = 1 - 0.06 * h;
    } else {                         // look up at the sky and tap a foot (wiggle)
        pose.eyeY = -3; pose.sx = 1 + 0.03 * Math.sin(u * Math.PI * 12);
    }
    return pose;
}
// draw the idle cube (called by draw() instead of the plain one while the player stands on the ground)
function drawIdlePlayer(g, pose) {
    const grav = player.grav, w = player.w * pose.sx, h = player.h * pose.sy;
    const x = player.x + (player.w - w) / 2;
    const hop = pose.hop * (grav > 0 ? -1 : 1);
    const y = (grav > 0 ? player.y + player.h - h : player.y) + hop;
    g.fillStyle = '#38bdf8'; g.shadowColor = '#38bdf8'; g.shadowBlur = 15;
    g.fillRect(x, y, w, h); g.shadowBlur = 0;
    const ex = pose.eyeX === null ? 0 : pose.eyeX, ey = (grav > 0 ? y + 4 : y + h - 8) + pose.eyeY * (grav > 0 ? 1 : -1);
    g.fillStyle = '#fff';
    if (pose.eyesShut) { g.fillRect(x + 4 + ex, ey + 2, 5, 1.5); g.fillRect(x + w - 9 + ex, ey + 2, 5, 1.5); }
    else { g.fillRect(x + 4 + ex, ey, 4, 4); g.fillRect(x + w - 8 + ex, ey, 4, 4); }
    if (pose.zzz) {
        g.font = 'bold 12px sans-serif'; g.textAlign = 'left';
        for (let i = 0; i < 3; i++) {
            const p = ((pose.zzz / 1800) + i / 3) % 1;
            g.globalAlpha = Math.sin(p * Math.PI);
            g.fillStyle = '#e0f2fe';
            g.fillText('z', x + w + 2 + p * 14, (grav > 0 ? y - 2 - p * 26 : y + h + 12 + p * 26));
        }
        g.globalAlpha = 1;
    }
}
