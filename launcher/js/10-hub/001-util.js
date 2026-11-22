// ---- small shared helpers (used by the pieces after this one) -------------------------------------------------------
// hubShown(): the launcher page itself is on screen (tab showing, no game over it). A timer that only repaints the hub, or
// asks the server for something only the hub shows, skips its work otherwise and registers with hubWake(f) to run as soon
// as the hub is back (tab shown again, game closed).
// Save names from before the Taco Games rename (2026-11-21). An old save is copied to its new name when it is found (at
// start, and after every cloud sync, which can bring one down from a device that never ran the new code); the old copy is
// left alone as a backup. The games do the same for their own keys, for when they run without the launcher.
var HG_RENAMED_KEYS = { huntingtonTetrisSurge1: 'tacoTetrisSurge1', huntingtonTetrisMute: 'tacoTetrisMute',
  'huntington.blockyshooter.run.v1': 'taco.blockyshooter.run.v1', 'huntington.blockyshooter.challenges.v1': 'taco.blockyshooter.challenges.v1' };
function hgRenameKeys() {
  for (var o in HG_RENAMED_KEYS) try { var v = localStorage.getItem(o); if (v !== null && localStorage.getItem(HG_RENAMED_KEYS[o]) === null) localStorage.setItem(HG_RENAMED_KEYS[o], v); } catch (e) {}
}
hgRenameKeys();
(function hook() { var L = window.HGGrapevine; if (!L || !L.on) return setTimeout(hook, 1000); L.on('sync', function (m) { if (m && m.state === 'ok') hgRenameKeys(); }); })();
function hubShown() { return !document.hidden && !document.documentElement.classList.contains('playing'); }
var HUB_WAKE = [];
function hubWake(f) { HUB_WAKE.push(f); }
(function () {
  var was = hubShown();
  function check() { var now = hubShown(); if (now && !was) HUB_WAKE.forEach(function (f) { try { f(); } catch (e) {} }); was = now; }
  document.addEventListener('visibilitychange', check);
  new MutationObserver(check).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
})();
// setHtml(el, html): write innerHTML only when it changed, so a repaint timer does not re-parse the same markup, reload its
// pictures or drop hover/focus every few seconds. Only for elements whose markup is always written through setHtml.
function setHtml(el, html) { if (el && el.hgHtml !== html) { el.hgHtml = html; el.innerHTML = html; } }
// hgTime(ms): a date and time in Eastern time, the launcher's one clock (2026-11-17), e.g. "Nov 17, 3:05 PM ET"
function hgTime(t) { try { return new Date(t).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' ET'; } catch (e) { return new Date(t).toLocaleString(); } }

// ---- staff names (2026-11-20): admins' names are always blue and the owner's always yellow, wherever the launcher shows
// a name. The list is the owner's; a server-granted admin wearing the ADMIN / OWNER tag counts too. Nobody can turn it off.
var HG_OWNER = 'adaboy', HG_ADMINS = ['bobertodaroberto', 'alexander tomato', 'billybobjonethethirds', 'levybowls', 'clover'];
function hgRole(name, cs) {
  var n = String(name || '').trim().toLowerCase(), t = (cs && cs.tg) || [];
  if (n === HG_OWNER || t.indexOf('owner') >= 0) return 'owner';
  if (HG_ADMINS.indexOf(n) >= 0 || t.indexOf('admin') >= 0) return 'admin';
  return '';
}
function hgEscN(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
// shown = what to print (a nickname), name = the account name the role belongs to
function hgNameHtml(name, shown, cs) { var r = hgRole(name, cs), t = hgEscN(shown == null ? name : shown); return r ? '<span class="un-' + r + '">' + t + '</span>' : t; }
var HG_ROLE_COL = { owner: '#fbbf24', admin: '#60a5fa' };
