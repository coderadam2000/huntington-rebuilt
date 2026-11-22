// Grapevine 2, part two (2026-11-22): the bits of the redesign CSS cannot do alone. Laid into gv/app.html by
// tools/gv-redesign.js, after the app's own scripts. It only ADDS elements (class gv2-*) and data attributes; it never
// moves, renames or removes anything the app or the launcher reaches for, and every piece fails quietly on its own.
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function hue(n) { var h = 0; n = String(n || ''); for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) | 0; return Math.abs(h) % 360; }
  function initial(n) { n = String(n || '').replace(/^[#@\s]+/, ''); return (n.charAt(0) || '?').toUpperCase(); }
  function avatar(name, cls) {
    var a = document.createElement('span'); a.className = 'gv2-av' + (cls ? ' ' + cls : '');
    a.style.setProperty('--h', hue(name)); a.textContent = initial(name); a.setAttribute('aria-hidden', 'true');
    return a;
  }
  // a picture from the Profile shop wins over the letter
  function wearPicture(a, from) {
    var pic = from && from.querySelector('.pfp');
    if (!pic || a.dataset.pic === pic.outerHTML) return;
    a.dataset.pic = pic.outerHTML; a.textContent = ''; a.classList.add('pic');
    var c = pic.cloneNode(true); c.removeAttribute('style'); a.appendChild(c);
  }
  function safe(fn) { return function () { try { fn.apply(this, arguments); } catch (e) {} }; }

  // ---- an avatar beside every run of messages --------------------------------
  var decorateRow = safe(function (row) {
    if (!row || !row.classList || !row.classList.contains('msg') || row.classList.contains('self')) return;
    var who = row.querySelector(':scope > .who'); if (!who) return;
    var a = row.querySelector(':scope > .gv2-av');
    if (!a) {
      a = avatar(who.dataset.name || who.textContent, 'msgav');
      a.addEventListener('click', function () { who.click(); });
      row.insertBefore(a, row.firstChild);
    }
    wearPicture(a, who);
  });
  var log = $('#log');
  if (log) {
    [].forEach.call(log.querySelectorAll('.msg'), decorateRow);
    new MutationObserver(safe(function (muts) {
      var seen = new Set();
      muts.forEach(function (m) {
        var t = m.target.nodeType === 1 ? m.target : m.target.parentElement;
        var row = t && (t.classList.contains('msg') ? t : t.closest && t.closest('.msg'));
        if (row) seen.add(row);
        [].forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1 && n.classList.contains('msg')) seen.add(n); });
      });
      seen.forEach(decorateRow);
    })).observe(log, { childList: true, subtree: true });
  }

  // ---- the members panel gets faces too ---------------------------------------
  var memlist = $('#memlist');
  if (memlist) new MutationObserver(safe(function () {
    [].forEach.call(memlist.querySelectorAll('.mitem'), function (it) {
      if (it.querySelector('.gv2-av')) return;
      var nm = it.querySelector('.nm'); if (!nm) return;
      var a = avatar(nm.textContent, 'memav'), dot = it.querySelector('.dot');
      if (dot && dot.classList.contains('live')) a.classList.add('live');
      wearPicture(a, nm);
      it.insertBefore(a, it.firstChild);
    });
  })).observe(memlist, { childList: true });

  // ---- the open chat's tile, and you in the corner -------------------------------
  var title = $('#ctitle'), hdr = $('header'), mename = $('#mename'), me = $('#me');
  var paintTitle = safe(function () {
    var t = (title.textContent || '').trim();
    hdr.dataset.gv2 = !t || t === 'Start' ? 'start' : t.charAt(0) === '#' ? 'room' : 'dm';
    hdr.style.setProperty('--h', hue(t)); title.dataset.ini = initial(t);
  });
  if (title && hdr) { paintTitle(); new MutationObserver(paintTitle).observe(title, { childList: true, characterData: true, subtree: true }); }
  var paintMe = safe(function () {
    var n = (mename.textContent || '').trim(); me.style.setProperty('--h', hue(n)); me.dataset.ini = initial(n); if (greet) greet();   // (greet is defined below; the first call skips it)
  });
  if (mename && me) { paintMe(); new MutationObserver(paintMe).observe(mename, { childList: true, characterData: true, subtree: true }); }

  // ---- a hello on the start page ------------------------------------------------
  var greet = safe(function () {
    var sh = $('#start .sh'); if (!sh) return;
    var g = $('#gv2-greet');
    if (!g) { g = document.createElement('div'); g.id = 'gv2-greet'; sh.parentNode.insertBefore(g, sh); }
    var h = new Date().getHours(), part = h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    var n = mename ? (mename.textContent || '').trim() : '';
    g.textContent = ''; g.appendChild(document.createTextNode(part + (n ? ', ' : '')));
    if (n) { var b = document.createElement('b'); b.textContent = n; g.appendChild(b); }
    g.appendChild(document.createTextNode(' 👋'));
  });
  greet(); setInterval(greet, 600000);

  // ---- the sign-in screen: what Grapevine is, beside the card --------------------
  safe(function () {
    var join = $('#join'), gate = join && $('.gate', join); if (!gate || $('.gv2-hero', join)) return;
    var hero = document.createElement('div'); hero.className = 'gv2-hero';
    hero.innerHTML = '<div class="gv2-logo">🍇</div><h1>Grapevine</h1>' +
      '<p>The chat behind Taco Games. Talk to your friends, find a party and show off what you earned.</p>' +
      '<ul><li><i>💬</i><span><b>Rooms, DMs and private groups</b>Walk into a public room or start your own.</span></li>' +
      '<li><i>⚡</i><span><b>Straight between browsers</b>Messages take the direct path when they can.</span></li>' +
      '<li><i>🎮</i><span><b>Made for game time</b>Party invites, titles and pictures from your games.</span></li></ul>';
    join.insertBefore(hero, gate);
  })();
})();
