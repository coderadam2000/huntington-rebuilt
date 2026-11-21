// 5.7: the white screen. Something could leave the picture stuck bright or white until you paused and came back.
// renderGuard() runs every frame just before drawing and puts back anything that would keep it that way:
//  - a camera, view or player motion that has gone NaN/Infinity (nothing draws, so the whole screen is the fog colour):
//    back to the last good spot, motion and shake zeroed
//  - scene light / exposure / lightning values that are not numbers or have run away
//  - the screen-flash overlay stuck showing (a flash never lasts longer than 0.6s)
//  - a lost WebGL context: the post-processing targets are rebuilt when the browser gives it back
//  - coming back to the tab or window: the same full redraw a pause and resume used to give
const RG = { pos: new V3(0, EYE_STAND, 0), quat: new THREE.Quaternion(), feet: 0, ok: false, flashOn: 0, flashT: 0, fixes: {}, lost: false };
const rgFin = (v) => Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
function rgFix(k) { RG.fixes[k] = (RG.fixes[k] || 0) + 1; }
function renderGuard(delta) {
    const q = camera.quaternion;
    const camOk = rgFin(camera.position) && Number.isFinite(q.x + q.y + q.z + q.w) && Number.isFinite(feetY);
    if (camOk && rgFin(velocity) && rgFin(push) && rgFin(camOffset) && Number.isFinite(shake) && Number.isFinite(headBob)) {
        RG.pos.copy(camera.position); RG.quat.copy(q); RG.feet = feetY; RG.ok = true;
    } else {
        rgFix('motion');
        if (RG.ok) { camera.position.copy(RG.pos); q.copy(RG.quat); feetY = RG.feet; }
        else { camera.position.set(spawnPt ? spawnPt.x : 0, EYE_STAND, spawnPt ? spawnPt.z : 0); q.identity(); feetY = 0; }
        if (!Number.isFinite(q.x + q.y + q.z + q.w) || q.lengthSq() < 1e-6) q.identity();
        velocity.set(0, 0, 0); push.set(0, 0, 0); camOffset.set(0, 0, 0); shake = 0; headBob = 0;
    }
    if (!Number.isFinite(camera.fov) || camera.fov < 5 || camera.fov > 140 || !Number.isFinite(fovNow)) {
        rgFix('fov'); camera.fov = fovNow = settings.fov; camera.updateProjectionMatrix();
    }
    if (!Number.isFinite(lightningFlash)) { rgFix('lightning'); lightningFlash = 0; }
    const hemiMax = theme.hemiInt * (Q.env ? 1 : 2.1) * 2;
    if (!Number.isFinite(hemi.intensity) || hemi.intensity > hemiMax + 0.01) { rgFix('hemi'); hemi.intensity = theme.hemiInt * (Q.env ? 1 : 2.1); }
    if (!Number.isFinite(renderer.toneMappingExposure) || renderer.toneMappingExposure > theme.exposure * 3) { rgFix('exposure'); renderer.toneMappingExposure = theme.exposure; }
    // the flash overlay: a flash fades in 0.35s; if it is still up after 0.6s it is stuck
    // (checked 4 times a second: reading the shown opacity costs a style pass)
    // real time, not game time: a slow frame rate must not keep a stuck flash up any longer
    const now = performance.now();
    if (now - RG.flashT >= 250) {
        RG.flashT = now;
        if (+getComputedStyle(ui.flash).opacity <= 0.02) RG.flashOn = 0;
        else if (!RG.flashOn) RG.flashOn = now;
        else if (now - RG.flashOn > 600) { rgFix('flash'); clearScreenFlash(); RG.flashOn = 0; }
    }
}
function rgRedraw() {      // what pausing and resuming did: a fresh drawing buffer and fresh post-processing targets
    if (!renderer) return;
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) setupPost();
    clearScreenFlash();
}
function rgWatchContext(canvas) {
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); RG.lost = true; rgFix('ctxlost'); });
    canvas.addEventListener('webglcontextrestored', () => { RG.lost = false; rgRedraw(); });
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) rgRedraw(); else clearScreenFlash(); });
window.addEventListener('focus', () => { if (currentGameState === 'playing') rgRedraw(); });
