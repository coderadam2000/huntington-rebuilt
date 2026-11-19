function glThumb(g) {
  return BUNDLE ? (BUNDLE.files['img:' + g.img] || '') : (local ? '' : MIRRORS[0] || '') + 'hub/' + g.img + '.jpg';
}
function focusGame() {
  if (!current || !document.getElementById('game-error').hidden || (!local && !current.html)) return;
  var active = document.activeElement;
  if (active && /INPUT|TEXTAREA|SELECT/.test(active.tagName)) return;
  try { frame.contentWindow.focus(); } catch (_) {}
}
window.HG_gameReady = focusGame;
frame.addEventListener('load', focusGame);
document.getElementById('gl-retry').onclick = function () { window.HG_retryGame(); };
document.getElementById('gl-back').onclick = function () { closePlayer(); };
