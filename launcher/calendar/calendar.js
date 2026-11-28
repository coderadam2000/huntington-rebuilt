// ===== The Calendar tab (2026-11-28). Everything for it lives in launcher/calendar/ (this file + calendar.css).
// Saved in localStorage 'hgq:calendar' (the hgq: prefix makes Grapevine sync it between devices). The old stand-alone
// calendar.html kept its events in 'calendarEvents': those are brought in once, and that key is left alone.
var CAL = (function () {
  var KEY = 'hgq:calendar', OLD = 'calendarEvents';
  var COLORS = ['#60a5fa', '#a78bfa', '#f87171', '#34d399', '#fbbf24', '#fb923c', '#f472b6', '#22d3ee', '#a3e635', '#e879f9', '#94a3b8', '#facc15'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var REPS = { none: 'Does not repeat', daily: 'Every day', weekdays: 'Every weekday (Mon-Fri)', weekly: 'Every week', biweekly: 'Every 2 weeks', monthly: 'Every month', yearly: 'Every year', custom: 'Custom...' };
  // the same repeats as iCalendar rules (what Google and Apple use), for the custom rule engine and for .ics files
  var RRS = { daily: 'FREQ=DAILY', weekdays: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', weekly: 'FREQ=WEEKLY', biweekly: 'FREQ=WEEKLY;INTERVAL=2', monthly: 'FREQ=MONTHLY', yearly: 'FREQ=YEARLY' };
  var VIEWS = ['day', 'week', 'month', 'agenda', 'year'], WDS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  var REMS = { 0: 'At the time', 5: '5 minutes before', 10: '10 minutes before', 15: '15 minutes before', 30: '30 minutes before', 60: '1 hour before', 120: '2 hours before', 1440: '1 day before', 2880: '2 days before', 10080: '1 week before' };
  function defaults() {
    return { v: 1, events: [], cats: [
      { id: 'hw', name: 'Homework', color: '#60a5fa' }, { id: 'test', name: 'Test / Quiz', color: '#fb923c' },
      { id: 'due', name: 'Due date', color: '#f87171' }, { id: 'meet', name: 'Meeting', color: '#a78bfa' },
      { id: 'bday', name: 'Birthday', color: '#fbbf24' }, { id: 'hol', name: 'Holiday', color: '#34d399' },
      { id: 'other', name: 'Other', color: '#94a3b8' }],
      set: { weekStart: 0, weekends: true, weekNums: false, h24: false, holidays: true, compact: false, view: 'month', hidden: [], dayStart: 7, evLen: 60, remind: -1, remindAllDay: -1 } };
  }
  var S, ui = { cur: null, q: '', drag: null };

  // ---- dates: 'YYYY-MM-DD' strings, and day numbers (days since 1970, UTC) for arithmetic ----
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ds(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
  function num(s) { return Math.round(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5); }
  function str(n) { var d = new Date(n * 864e5); return ds(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); }
  function dow(s) { return (num(s) + 4) % 7; }   // 1970-01-01 was a Thursday
  function todayS() { var d = new Date(); return ds(d.getFullYear(), d.getMonth(), d.getDate()); }
  function nice(s, opt) { return new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)).toLocaleDateString(undefined, opt || { weekday: 'short', month: 'short', day: 'numeric' }); }
  function rel(s) { var n = num(s) - num(todayS()); return n === 0 ? 'today' : n === 1 ? 'tomorrow' : n === -1 ? 'yesterday' : n > 0 ? 'in ' + n + ' days' : -n + ' days ago'; }
  function fmtT(t) { if (!t) return ''; if (S.set.h24) return t; var h = +t.slice(0, 2), m = t.slice(3, 5); return ((h + 11) % 12 + 1) + (m === '00' ? '' : ':' + m) + (h < 12 ? 'am' : 'pm'); }
  function isoWeek(s) { var n = num(s), d = (dow(s) + 6) % 7, th = n - d + 3, y = str(th).slice(0, 4); return 1 + Math.floor((th - num(y + '-01-01')) / 7); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  // ---- saving ----
  function load() {
    var d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!d || !d.events) {
      d = defaults();
      try {   // bring in the old calendar's events once
        var old = JSON.parse(localStorage.getItem(OLD) || 'null'), map = { Homework: 'hw', Meeting: 'meet', DueDate: 'due', Holiday: 'hol', Birthday: 'bday' };
        if (old) Object.keys(old).forEach(function (day) { (old[day] || []).forEach(function (e) { d.events.push({ id: 'o' + (e.id || uid()), title: String(e.title || 'Event'), date: day, cat: map[e.type] || 'other', rep: 'none' }); }); });
      } catch (e) {}
    }
    var def = defaults();
    d.set = Object.assign({}, def.set, d.set || {});
    if (!d.cats || !d.cats.length) d.cats = def.cats;
    S = d;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Could not save: storage is full.'); } }
  function cat(id) {
    if (/^link:/.test(id)) { var l = link(id.slice(5)); return { id: id, name: l ? l.name : 'Linked calendar', color: l ? l.color : '#94a3b8' }; }
    for (var i = 0; i < S.cats.length; i++) if (S.cats[i].id === id) return S.cats[i]; return S.cats[0] || { id: 'other', name: 'Other', color: '#94a3b8' }; }
  function evById(id) { for (var i = 0; i < S.events.length; i++) if (S.events[i].id === id) return S.events[i]; return null; }

  // ---- linked calendars (2026-11-28): a Google / Apple / Outlook calendar's private .ics link, shown read-only.
  // The links are in S.links (synced with the rest). What a link returned is kept on this device only, in 'hgcal:links'
  // (not a synced key: a big calendar would bloat the save), and read again every 15 minutes while the tab is open.
  // Browsers cannot read Google's or iCloud's links themselves (CORS): Grapevine fetches them (HGGrapevine.cal.ics),
  // once the server can (see SERVER_TODO.md, "Linked Google and Apple calendars").
  var LKEY = 'hgcal:links', LEVERY = 15 * 60e3, LC = null, LIDX = {}, LBY = {}, LMETA = {}, LBUSY = false, paintLinks = function () {};
  function lcache() { if (!LC) { try { LC = JSON.parse(localStorage.getItem(LKEY) || '{}') || {}; } catch (e) { LC = {}; } } return LC; }
  function lsave() { try { localStorage.setItem(LKEY, JSON.stringify(LC)); } catch (e) { toast('This device is out of space for linked calendars.'); } }
  function link(id) { var ls = (S && S.links) || []; for (var i = 0; i < ls.length; i++) if (ls[i].id === id) return ls[i]; return null; }
  function linkUrl(u) { u = String(u || '').trim(); if (/^webcals?:\/\//i.test(u)) u = 'https://' + u.replace(/^webcals?:\/\//i, ''); return /^https:\/\/[^\s\/]+\.[^\s\/]+\/\S+$/i.test(u) ? u : ''; }
  function linkName(u) { return /google\./i.test(u) ? 'Google Calendar' : /icloud\./i.test(u) ? 'Apple Calendar' : /outlook|office365|live\.com/i.test(u) ? 'Outlook Calendar' : 'Linked calendar'; }
  function relink() {   // the day index, from every linked calendar's last good copy
    LIDX = {}; LBY = {}; LMETA = {};
    var t = num(todayS()), win = { from: t - 400, to: t + 730 };
    (S.links || []).forEach(function (l) {
      var c = lcache()[l.id], m = LMETA[l.id] = { n: 0 }; if (!c || !c.text) return;
      var r; try { r = ICS.read(c.text, win); } catch (e) { m.bad = true; return; }
      m.n = r.events.length; m.name = r.name;
      r.events.forEach(function (e) {
        e.cat = 'link:' + l.id; e.link = l.id; e.id = 'L' + l.id + ':' + e.id; LBY[e.id] = e;
        for (var k = 0, sp = Math.min(span(e), 60); k <= sp; k++) { var d = str(num(e.date) + k); (LIDX[d] = LIDX[d] || []).push(e); }
      });
    });
  }
  function fetchIcs(url) {
    // straight from the browser first (works when the calendar's host allows it), then through Grapevine
    var direct = typeof fetch !== 'function' ? Promise.reject(new Error('no fetch')) : Promise.race([
      fetch(url, { cache: 'no-store', credentials: 'omit' }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.text(); }),
      new Promise(function (_, no) { setTimeout(function () { no(new Error('timeout')); }, 8000); })]);
    return direct.then(function (t) { if (!/BEGIN:VCALENDAR/i.test(t)) throw new Error('not a calendar'); return t; }).catch(function (e0) {
      if (e0 && /not a calendar|http 4/.test(e0.message)) throw e0;
      var L = window.HGGrapevine;
      if (!L || !L.cal || !L.cal.ics) throw new Error('server');
      return L.cal.ics(url).then(function (m) { if (!m || !m.ok) throw new Error((m && m.err) || 'server'); return String(m.text || ''); })
        .then(function (t) { if (!/BEGIN:VCALENDAR/i.test(t)) throw new Error('not a calendar'); return t; });
    });
  }
  function linkErr(m) {
    m = String(m || '');
    return m === 'server' ? 'Waiting for the Grapevine update that fetches linked calendars.' :
      /Not connected|did not answer/.test(m) ? 'Sign in to Grapevine to update linked calendars.' :
      m === 'too big' ? 'This calendar is too big (over 3 MB).' : m === 'not a calendar' ? 'That link is not a calendar link.' :
      /http 40[134]|http 410|gone|not-found/.test(m) ? 'This link no longer works. Copy it again from your calendar.' : 'Could not update: ' + m;
  }
  function refreshLinks(force) {   // force: true for every link, or one link's id; otherwise only links not tried in 15 minutes
    if (LBUSY || !S || !(S.links || []).length) return Promise.resolve();
    var now = Date.now(), due = S.links.filter(function (l) { var c = lcache()[l.id]; return force === true || force === l.id || !c || now - (c.tried || 0) > LEVERY; });
    if (!due.length) return Promise.resolve();
    LBUSY = true; paintLinks();
    return due.reduce(function (p, l) {
      return p.then(function () {
        var c = lcache()[l.id] = lcache()[l.id] || {}; c.tried = Date.now();
        return fetchIcs(l.url).then(function (t) { if (t.length > 3e6) throw new Error('too big'); c.text = t; c.at = Date.now(); c.err = ''; },
          function (e) { c.err = linkErr(e && e.message); });
      });
    }, Promise.resolve()).then(function () { LBUSY = false; lsave(); relink(); if (shown()) render(); paintLinks(); });
  }
  function ago(ms) { var m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago'; }
  function linkStatus(l) {
    var c = lcache()[l.id] || {}, m = LMETA[l.id] || {};
    if (LBUSY && !c.at && !c.err) return 'Loading...';
    if (c.err) return '&#9888;&#65039; ' + esc(c.err) + (c.at ? ' Showing the copy from ' + ago(c.at) + '.' : '');
    if (m.bad) return '&#9888;&#65039; Could not read this calendar.';
    return c.at ? '&#10003; ' + m.n + ' event' + (m.n === 1 ? '' : 's') + ' · updated ' + ago(c.at) : 'Not loaded yet.';
  }
  function openEv(id, st) { if (LBY[id]) viewer(LBY[id]); else editor(id, null, st); }

  // ---- when an event happens ----
  function startsOn(e, s) {   // does an occurrence of e start on day s?
    if (s < e.date || (e.until && s > e.until) || (e.skip && e.skip.indexOf(s) >= 0)) return false;
    var r = e.rep || 'none', diff = num(s) - num(e.date);
    if (r === 'none') return diff === 0;
    if (r === 'daily') return true;
    if (r === 'weekdays') { var w = dow(s); return w > 0 && w < 6; }
    if (r === 'weekly') return diff % 7 === 0;
    if (r === 'biweekly') return diff % 14 === 0;
    if (r === 'monthly') return s.slice(8) === e.date.slice(8);
    if (r === 'yearly') return s.slice(5) === e.date.slice(5);
    return false;
  }
  // custom rules (every 3 days, Mon+Wed every 2 weeks, the 2nd Tuesday, the last Friday...) and "after N times":
  // the days come from the same rule engine that reads Google's and Apple's files, worked out once per event and kept
  var RC = {};
  function ruleOf(e) { return e.rep === 'custom' ? e.rrule || 'FREQ=DAILY' : RRS[e.rep] || ''; }
  function occ(e, upTo) {   // the set of day numbers e starts on, up to at least day upTo
    var k = e.id + '|' + e.date + '|' + ruleOf(e) + '|' + (e.count || '') + '|' + (e.until || ''), c = RC[k];
    if (!c || c.to < upTo) {
      var to = Math.max(upTo + 400, num(todayS()) + 800), set = {};
      ICS.expand(num(e.date), ruleOf(e) + (e.count ? ';COUNT=' + e.count : ''), to, e.until ? num(e.until) : null).forEach(function (n) { set[n] = 1; });
      c = RC[k] = { to: to, set: set };
    }
    return c.set;
  }
  function startsOn2(e, s) {
    if (e.rep === 'custom' || (e.count && e.rep && e.rep !== 'none')) {
      if (s < e.date || (e.until && s > e.until) || (e.skip && e.skip.indexOf(s) >= 0)) return false;
      var n = num(s); return !!occ(e, n)[n];
    }
    return startsOn(e, s);
  }
  function countBefore(e, s) { var n = num(s), set = occ(e, n), c = 0; for (var k in set) if (+k < n) c++; return c; }
  function span(e) { return e.end && e.end > e.date ? num(e.end) - num(e.date) : 0; }
  function on(day) {   // [{e, start, first}] for everything showing on day, sorted
    var out = [], hid = S.set.hidden, q = ui.q.toLowerCase();
    S.events.forEach(function (e) {
      if (hid.indexOf(e.cat) >= 0) return;
      if (q && (e.title + ' ' + (e.notes || '') + ' ' + (e.loc || '')).toLowerCase().indexOf(q) < 0) return;
      for (var k = 0, sp = span(e); k <= sp; k++) { var st = str(num(day) - k); if (startsOn2(e, st)) { out.push({ e: e, start: st, first: k === 0 }); break; } }
    });
    (LIDX[day] || []).forEach(function (e) {
      if (!link(e.link) || hid.indexOf(e.cat) >= 0) return;
      if (q && (e.title + ' ' + (e.notes || '') + ' ' + (e.loc || '')).toLowerCase().indexOf(q) < 0) return;
      out.push({ e: e, start: e.date, first: e.date === day });
    });
    return out.sort(function (a, b) { var ta = a.e.time || '', tb = b.e.time || ''; return (span(b.e) - span(a.e)) || (ta < tb ? -1 : ta > tb ? 1 : 0) || (a.e.title < b.e.title ? -1 : 1); });
  }
  function isDone(e, st) { return !!(e.done && e.done.indexOf(st) >= 0); }

  // ---- holidays (US school year), worked out per year ----
  var HOL = {};
  function nth(y, m, wd, n) { var first = num(ds(y, m, 1)), d0 = (first + 4) % 7, d = first + ((wd - d0 + 7) % 7) + (n - 1) * 7; return str(d); }
  function lastWd(y, m, wd) { var last = num(ds(y, m + 1, 1)) - 1, dl = (last + 4) % 7; return str(last - ((dl - wd + 7) % 7)); }
  function easter(y) { var a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1; return ds(y, mo - 1, da); }
  function holidays(y) {
    if (HOL[y]) return HOL[y];
    var h = {}, add = function (d, n) { h[d] = h[d] ? h[d] + ' · ' + n : n; };
    add(ds(y, 0, 1), "New Year's Day"); add(nth(y, 0, 1, 3), 'MLK Day'); add(ds(y, 1, 14), "Valentine's Day"); add(nth(y, 1, 1, 3), "Presidents' Day");
    add(ds(y, 2, 17), "St. Patrick's Day"); add(easter(y), 'Easter'); add(nth(y, 4, 0, 2), "Mother's Day"); add(lastWd(y, 4, 1), 'Memorial Day');
    add(nth(y, 5, 0, 3), "Father's Day"); add(ds(y, 5, 19), 'Juneteenth'); add(ds(y, 6, 4), 'Independence Day'); add(nth(y, 8, 1, 1), 'Labor Day');
    add(nth(y, 9, 1, 2), "Indigenous Peoples' Day"); add(ds(y, 9, 31), 'Halloween'); add(ds(y, 10, 11), 'Veterans Day'); add(nth(y, 10, 4, 4), 'Thanksgiving');
    add(ds(y, 11, 24), 'Christmas Eve'); add(ds(y, 11, 25), 'Christmas'); add(ds(y, 11, 31), "New Year's Eve");
    return (HOL[y] = h);
  }
  function holOf(s) { return S.set.holidays ? holidays(+s.slice(0, 4))[s] || '' : ''; }

  // ---- drawing ----
  function chip(o, day, withTime) {
    var e = o.e, c = colorOf(e), t = e.time && o.first ? '<em class="t">' + fmtT(e.time) + '</em>' : '';
    return '<div class="cal-ev' + (isDone(e, o.start) ? ' done' : '') + (o.first ? '' : ' cont') + '" style="--c:' + c.color + '"' + (e.link ? '' : ' draggable="true"') + ' data-ev="' + esc(e.id) + '" data-st="' + o.start + '" title="' + esc(e.title + (e.time ? ' · ' + fmtT(e.time) + (e.endTime ? '-' + fmtT(e.endTime) : '') : '') + ' · ' + c.name + (e.loc ? '\n' + e.loc : '') + (e.notes ? '\n' + e.notes : '')) + '">' +
      (withTime === false ? '' : t) + '<span>' + esc(e.title) + '</span></div>';
  }
  function colorOf(e) { var c = cat(e.cat); return e.color ? { name: c.name, color: e.color, id: c.id } : c; }
  function cols() { var c = []; for (var i = 0; i < 7; i++) { var d = (S.set.weekStart + i) % 7; if (S.set.weekends || (d > 0 && d < 6)) c.push(d); } return c; }
  function gridCols(n) { return 'grid-template-columns:' + (S.set.weekNums ? '28px ' : '') + 'repeat(' + n + ', minmax(0, 1fr))'; }
  function weekStartOf(s) { return str(num(s) - ((dow(s) - S.set.weekStart + 7) % 7)); }

  function viewMonth() {
    var c = cols(), y = +ui.cur.slice(0, 4), m = +ui.cur.slice(5, 7) - 1, first = ds(y, m, 1), last = str(num(ds(y, m + 1, 1)) - 1), t = todayS();
    var h = '<div class="cal-dow" style="' + gridCols(c.length) + '">' + (S.set.weekNums ? '<span>wk</span>' : '') + c.map(function (d) { return '<span>' + DOW[d] + '</span>'; }).join('') + '</div>';
    h += '<div class="cal-grid" style="' + gridCols(c.length) + '">';
    var max = S.set.compact ? 2 : 3;
    for (var w = num(weekStartOf(first)); w <= num(last); w += 7) {
      if (S.set.weekNums) h += '<div class="cal-wn">' + isoWeek(str(w + ((1 - S.set.weekStart + 7) % 7))) + '</div>';
      for (var i = 0; i < 7; i++) {
        var day = str(w + i), wd = dow(day); if (c.indexOf(wd) < 0) continue;
        var evs = on(day), hol = holOf(day);
        h += '<div class="cal-day' + (day.slice(0, 7) !== first.slice(0, 7) ? ' out' : '') + (day === t ? ' today' : '') + (wd === 0 || wd === 6 ? ' wkend' : '') + '" data-day="' + day + '">' +
          '<div class="cal-dn"><b data-goday="' + day + '" title="Open this day">' + +day.slice(8) + '</b></div>' + (hol ? '<div class="cal-hol" title="' + esc(hol) + '">' + esc(hol) + '</div>' : '') +
          evs.slice(0, max).map(function (o) { return chip(o, day); }).join('') +
          (evs.length > max ? '<div class="cal-more" data-more="' + day + '">+' + (evs.length - max) + ' more</div>' : '') + '</div>';
      }
    }
    return h + '</div>';
  }
  // ---- day and week: an hour grid like Google's and Apple's. Drag in an empty spot to make an event, drag an event to move
  // it (to another time or day), drag its bottom edge to make it longer. All-day and multi-day events sit in the strip on top.
  function hh() { return S.set.compact ? 36 : 48; }
  function tm(t) { return t ? +t.slice(0, 2) * 60 + +t.slice(3, 5) : 0; }
  function mt(m) { m = Math.max(0, Math.min(1439, Math.round(m))); return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  function timed(e) { return !!e.time && !span(e); }
  function endMin(e) { var a = tm(e.time), b = e.endTime ? tm(e.endTime) : a + 60; return b > a ? Math.min(b, 1440) : b === a ? a + 30 : 1440; }
  function lay(list) {   // side by side when they overlap: [{o, a, b, col, of}]
    var it = list.map(function (o) { return { o: o, a: tm(o.e.time), b: endMin(o.e) }; }).sort(function (x, y) { return x.a - y.a || y.b - x.b; }), grp = [], colEnd = [], gEnd = -1;
    function flush() { grp.forEach(function (g) { g.of = colEnd.length; }); grp = []; colEnd = []; }
    it.forEach(function (x) {
      if (x.a >= gEnd) { flush(); gEnd = -1; }
      var c = 0; while (c < colEnd.length && colEnd[c] > x.a) c++;
      colEnd[c] = Math.max(x.b, x.a + 20); x.col = c; grp.push(x); gEnd = Math.max(gEnd, x.b, x.a + 20);
    });
    flush(); return it;
  }
  function viewGrid(days) {
    var t = todayS(), H = hh(), n = days.length, gc = 'grid-template-columns:52px repeat(' + n + ', minmax(0, 1fr))', now = new Date(), nm = now.getHours() * 60 + now.getMinutes();
    var h = '<div class="cal-tg" style="--hh:' + H + 'px"><div class="cal-tg-head" style="' + gc + '"><span class="cal-tg-tz">' + esc(tzName()) + '</span>' + days.map(function (day) {
      return '<div class="cal-tg-dh' + (day === t ? ' today' : '') + '" data-goday="' + day + '">' + DOW[dow(day)] + '<b>' + +day.slice(8) + '</b></div>'; }).join('') + '</div>';
    h += '<div class="cal-tg-all" style="' + gc + '"><span class="cal-tg-lab">all day</span>' + days.map(function (day) {
      var hol = holOf(day);
      return '<div class="cal-tg-ac" data-day="' + day + '">' + (hol ? '<div class="cal-hol">' + esc(hol) + '</div>' : '') + on(day).filter(function (o) { return !timed(o.e); }).map(function (o) { return chip(o, day); }).join('') + '</div>'; }).join('') + '</div>';
    h += '<div class="cal-tg-body" id="cal-tgb"><div class="cal-tg-in" style="' + gc + ';height:' + 24 * H + 'px"><div class="cal-tg-hours">';
    for (var k = 1; k < 24; k++) h += '<span style="top:' + k * H + 'px">' + fmtT(pad(k) + ':00') + '</span>';
    h += '</div>' + days.map(function (day) {
      return '<div class="cal-tg-col' + (day === t ? ' today' : '') + '" data-slot="' + day + '">' + lay(on(day).filter(function (o) { return timed(o.e); })).map(function (x) {
        var e = x.o.e, c = colorOf(e), top = x.a / 60 * H, ht = Math.max(H / 3, (x.b - x.a) / 60 * H - 2), w = 100 / x.of;
        return '<div class="cal-tev' + (isDone(e, x.o.start) ? ' done' : '') + (e.link ? ' ro' : '') + (ht < H * 0.7 ? ' short' : '') + '" data-ev="' + esc(e.id) + '" data-st="' + x.o.start + '" style="--c:' + c.color + ';top:' + top + 'px;height:' + ht + 'px;left:calc(' + x.col * w + '% + 1px);width:calc(' + w + '% - 3px)" title="' + esc(e.title + ' · ' + fmtT(e.time) + (e.endTime ? ' - ' + fmtT(e.endTime) : '') + (e.loc ? '\n' + e.loc : '')) + '">' +
          '<b>' + esc(e.title) + '</b><em>' + fmtT(e.time) + (e.endTime ? ' - ' + fmtT(e.endTime) : '') + (e.loc ? ' · ' + esc(e.loc) : '') + '</em>' + (e.link ? '' : '<i class="cal-tev-rs"></i>') + '</div>';
      }).join('') + (day === t ? '<div class="cal-now" style="top:' + nm / 60 * H + 'px"></div>' : '') + '</div>';
    }).join('') + '</div></div></div>';
    return h;
  }
  function tzName() { try { var p = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(new Date()).filter(function (x) { return x.type === 'timeZoneName'; })[0]; return p ? p.value : ''; } catch (e) { return ''; } }
  function viewWeek() { var c = cols(), w = num(weekStartOf(ui.cur)), d = []; for (var i = 0; i < 7; i++) if (c.indexOf(dow(str(w + i))) >= 0) d.push(str(w + i)); return viewGrid(d); }
  function viewDay() { return viewGrid([ui.cur]); }
  function scrollGrid(key) {   // the first time a range is shown: scroll to the start of the day (or to now, on today)
    var b = document.getElementById('cal-tgb'); if (!b) return;
    if (ui.gridKey === key && ui.gridTop != null) { b.scrollTop = ui.gridTop; return; }
    ui.gridKey = key; var d = new Date(), on2 = document.querySelector('#cal-tgb .cal-tg-col.today');
    b.scrollTop = Math.max(0, (on2 ? Math.min(d.getHours() - 1, 20) : S.set.dayStart) * hh());
  }
  function viewAgenda() {
    var start = ui.q ? num(todayS()) - 365 : num(ui.cur), end = start + (ui.q ? 730 : 60), t = todayS(), h = '';
    for (var n = start; n <= end; n++) {
      var day = str(n), evs = on(day), hol = holOf(day); if (!evs.length && !(hol && !ui.q)) continue;
      h += '<div class="cal-ag-day"><div class="cal-ag-date' + (day === t ? ' today' : '') + '"><b>' + nice(day, { weekday: 'long' }) + '</b>' + nice(day, { month: 'short', day: 'numeric', year: 'numeric' }) + '<br><span class="rdesc">' + rel(day) + '</span></div><div class="cal-ag-list">' +
        (hol && !ui.q ? '<div class="cal-hol">' + esc(hol) + '</div>' : '') +
        evs.map(function (o) { var e = o.e; return chip(o, day, false).replace('</div>', '<em>' + (e.time ? fmtT(e.time) + (e.endTime ? ' - ' + fmtT(e.endTime) : '') : 'All day') + ' · ' + esc(cat(e.cat).name) + '</em></div>'); }).join('') + '</div></div>';
    }
    return h || '<div class="cal-empty" style="text-align:center;padding:30px">' + (ui.q ? 'Nothing matches "' + esc(ui.q) + '".' : 'Nothing in the next 60 days. Press <b>N</b> to add something.') + '</div>';
  }
  function viewYear() {
    var y = +ui.cur.slice(0, 4), t = todayS(), h = '<div class="cal-year">';
    for (var m = 0; m < 12; m++) {
      var first = ds(y, m, 1), days = num(ds(y, m + 1, 1)) - num(first), lead = (dow(first) - S.set.weekStart + 7) % 7;
      h += '<div class="cal-ym" data-month="' + first + '"><h4>' + MONTHS[m] + '</h4><div class="cal-ym-g">';
      for (var i = 0; i < 7; i++) h += '<i>' + DOW[(S.set.weekStart + i) % 7][0] + '</i>';
      for (i = 0; i < lead; i++) h += '<i></i>';
      for (var d = 1; d <= days; d++) { var day = ds(y, m, d), n = on(day).length; h += '<i class="' + (day === t ? 'today' : n ? 'has' : '') + '"' + (n ? ' title="' + n + ' event' + (n > 1 ? 's' : '') + '"' : '') + '>' + d + '</i>'; }
      h += '</div></div>';
    }
    return h + '</div>';
  }
  function title() {
    var y = +ui.cur.slice(0, 4), m = +ui.cur.slice(5, 7) - 1, v = S.set.view;
    if (v === 'year') return '' + y;
    if (v === 'day') return nice(ui.cur, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    if (v === 'week') { var a = weekStartOf(ui.cur), b = str(num(a) + 6); return nice(a, { month: 'short', day: 'numeric' }) + ' - ' + nice(b, { month: 'short', day: 'numeric', year: 'numeric' }); }
    if (v === 'agenda') return ui.q ? 'Search' : 'From ' + nice(ui.cur, { month: 'short', day: 'numeric', year: 'numeric' });
    return MONTHS[m] + ' ' + y;
  }
  function side() {
    var t = num(todayS()), h = mini() + '<div class="cal-card"><input class="cal-search cal-qa" id="cal-qa" placeholder="Quick add: Math test fri 3pm" title="Type an event in plain words and press Enter (Q)" autocomplete="off"></div>', pins = [], up = [], saveQ = ui.q; ui.q = '';
    for (var n = t; n <= t + 365; n++) {
      var day = str(n), evs = on(day);
      evs.forEach(function (o) { if (!o.first) return; if (o.e.pin && !pins.some(function (p) { return p.o.e === o.e; })) pins.push({ o: o, day: day }); if (n <= t + 13 && !isDone(o.e, o.start)) up.push({ o: o, day: day }); });
    }
    ui.q = saveQ;
    pins.slice(0, 3).forEach(function (p) { var d = num(p.day) - t;
      h += '<div class="cal-pin" style="--c:' + cat(p.o.e.cat).color + '" data-ev="' + esc(p.o.e.id) + '" data-st="' + p.day + '"><b>' + (d === 0 ? 'Today!' : d + ' day' + (d > 1 ? 's' : '')) + '</b><span>' + (d ? 'until ' : '') + esc(p.o.e.title) + ' · ' + nice(p.day) + '</span></div>'; });
    h += '<div class="cal-card"><b>Coming up</b><div class="cal-up">' + (up.length ? up.slice(0, 10).map(function (u) {
      return '<div class="cal-up-row" data-ev="' + esc(u.o.e.id) + '" data-st="' + u.day + '"><i style="background:' + cat(u.o.e.cat).color + '"></i><span>' + esc(u.o.e.title) + '</span><em>' + rel(u.day) + '</em></div>'; }).join('') : '<div class="cal-empty">Nothing in the next two weeks.</div>') + '</div></div>';
    var counts = {}; S.events.forEach(function (e) { counts[e.cat] = (counts[e.cat] || 0) + 1; });
    h += '<div class="cal-card"><b>Categories <span class="rdesc" style="font-weight:400">· click to hide or show</span></b><div class="cal-cats">' + S.cats.map(function (c) {
      return '<div class="cal-cat' + (S.set.hidden.indexOf(c.id) >= 0 ? ' off' : '') + '" style="--c:' + c.color + '" data-cat="' + esc(c.id) + '"><i></i><span>' + esc(c.name) + '</span><em>' + (counts[c.id] || 0) + '</em></div>'; }).join('') +
      '</div>' + ((S.links || []).length ? '<div class="cal-sec" style="margin:10px 0 4px">Linked calendars</div><div class="cal-cats">' + S.links.map(function (l) {
        var c = lcache()[l.id] || {};
        return '<div class="cal-cat' + (S.set.hidden.indexOf('link:' + l.id) >= 0 ? ' off' : '') + '" style="--c:' + l.color + '" data-cat="link:' + esc(l.id) + '" title="' + esc(c.err || (c.at ? 'Updated ' + ago(c.at) : 'Not loaded yet')) + '"><i></i><span>' + esc(l.name) + '</span><em>' + (c.err ? '&#9888;&#65039;' : (LMETA[l.id] || {}).n || 0) + '</em></div>'; }).join('') + '</div>' : '') +
      '<button class="cal-btn" data-cal="settings" style="margin-top:10px;width:100%">Categories &amp; linked calendars</button></div>';
    h += '<div class="cal-card cal-keys"><b style="color:var(--text)">Keys</b><kbd>&larr;</kbd> <kbd>&rarr;</kbd> move · <kbd>T</kbd> today · <kbd>N</kbd> new event<br><kbd>M</kbd> month · <kbd>W</kbd> week · <kbd>A</kbd> agenda · <kbd>Y</kbd> year · <kbd>/</kbd> search<br>Drag an event to another day to move it.</div>';
    return h;
  }
  function mini() {   // the little month at the side, for jumping to a day
    var m0 = ui.mini || ui.cur.slice(0, 8) + '01', y = +m0.slice(0, 4), m = +m0.slice(5, 7) - 1, first = ds(y, m, 1), last = str(num(ds(y, m + 1, 1)) - 1), t = todayS(), sq = ui.q; ui.q = '';
    var h = '<div class="cal-card cal-mini"><div class="cal-mini-h"><button data-mini="-1" title="Previous month">&#8249;</button><b>' + MONTHS[m] + ' ' + y + '</b><button data-mini="1" title="Next month">&#8250;</button></div><div class="cal-mini-g">';
    for (var i = 0; i < 7; i++) h += '<span class="dw">' + DOW[(S.set.weekStart + i) % 7][0] + '</span>';
    var a = num(weekStartOf(first)), sel = S.set.view === 'week' ? weekStartOf(ui.cur) : null;
    for (var n = a; n < a + 42; n++) {
      var d = str(n); if (n > num(last) && (n - a) % 7 === 0) break;
      var inSel = sel ? n >= num(sel) && n < num(sel) + 7 : d === ui.cur && S.set.view === 'day';
      h += '<button data-goto="' + d + '" class="' + (d.slice(0, 7) !== first.slice(0, 7) ? 'out ' : '') + (d === t ? 'today ' : '') + (inSel ? 'sel ' : '') + (on(d).length ? 'has' : '') + '">' + +d.slice(8) + '</button>';
    }
    ui.q = sq; return h + '</div></div>';
  }

  // ---- quick add: "Math test fri 3pm", "Sam's party Dec 5 at 7:30pm", "Club every tuesday 3-4pm", "trip jan 3 - jan 7" ----
  var MON3 = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  function parseQuick(text, base) {
    var s0 = ' ' + text + ' ', t0 = base || todayS(), out = { date: null }, m;
    function cut(re) { var r = re.exec(s0); if (r) s0 = s0.slice(0, r.index) + ' ' + s0.slice(r.index + r[0].length); return r; }
    function h24(h, mi, ap) { h = +h; mi = +(mi || 0); ap = (ap || '').toLowerCase()[0]; if (ap === 'p' && h < 12) h += 12; if (ap === 'a' && h === 12) h = 0; if (!ap && h >= 1 && h <= 6) h += 12; return h < 24 && mi < 60 ? pad(h) + ':' + pad(mi) : null; }
    function md(mo, d, y) { var yy = y ? (+y < 100 ? 2000 + +y : +y) : +t0.slice(0, 4), r = ds(yy, mo, +d); if (!y && r < t0) r = ds(yy + 1, mo, +d); return +d >= 1 && +d <= 31 ? r : null; }
    function wdNext(w, strict) { var k = (w - dow(t0) + 7) % 7; if (strict && !k) k = 7; return str(num(t0) + k); }
    var WDRE = '(sun|mon|tue|wed|thu|fri|sat)[a-z]*\\.?';
    if ((m = cut(new RegExp('\\bevery\\s+(day|weekday|week|month|year|' + WDRE + ')\\b', 'i')))) {
      var w = m[1].toLowerCase(); if (m[2]) { out.rep = 'weekly'; out.date = wdNext(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(m[2].toLowerCase())); }
      else out.rep = { day: 'daily', weekday: 'weekdays', week: 'weekly', month: 'monthly', year: 'yearly' }[w];
    }
    var keep = s0;
    if ((m = cut(/\b(?:from\s+|at\s+)?(\d{1,2})(?::(\d\d))?\s*(am|pm|a|p)?\s*(?:-|–|to|until)\s*(\d{1,2})(?::(\d\d))?\s*(am|pm|a|p)?\b/i)) && (m[3] || m[6] || m[2] || m[5])) {
      var ap2 = m[6] || m[3], a = h24(m[1], m[2], m[3] || (m[6] && +m[1] <= +m[4] ? m[6] : '')), b = h24(m[4], m[5], ap2); if (a && b) { out.time = a; out.endTime = b; }
    } else if (m) s0 = keep;
    if (!out.time && (m = cut(/\b(?:at\s+)?(\d{1,2})(?::(\d\d))?\s*(am|pm|a\.m\.|p\.m\.)(?=\W)/i) || cut(/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/))) out.time = h24(m[1], m[2], m[3] || (+m[1] > 12 || /^0/.test(m[1]) ? 'h' : ''));
    if (!out.time && (m = cut(/\b(?:at\s+)?(noon|midday|midnight)\b/i))) out.time = /mid/i.test(m[1]) && /night/i.test(m[1]) ? '00:00' : '12:00';
    var dRe = '(?:(' + MON3.join('|') + ')[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?|(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(' + MON3.join('|') + ')[a-z]*(?:\\s+(\\d{4}))?|(\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{2,4}))?)';
    function dOf(r, o) { return r[o + 1] ? md(MON3.indexOf(r[o + 1].toLowerCase()), r[o + 2], r[o + 3]) : r[o + 4] ? md(MON3.indexOf(r[o + 5].toLowerCase()), r[o + 4], r[o + 6]) : md(+r[o + 7] - 1, r[o + 8], r[o + 9]); }
    if ((m = cut(new RegExp('\\b(?:from\\s+|on\\s+)?' + dRe + '\\s*(?:-|–|to|until|through)\\s*' + dRe + '\\b', 'i')))) { out.date = dOf(m, 0); out.end = dOf(m, 9); if (out.end && out.date && out.end < out.date) out.end = undefined; }
    else if ((m = cut(new RegExp('\\b(?:on\\s+|by\\s+)?' + dRe + '\\b', 'i')))) out.date = dOf(m, 0);
    else if ((m = cut(/\b(?:on\s+|by\s+)?(today|tonight|tomorrow|tmrw|tmr)\b/i))) { out.date = /^to(day|night)/i.test(m[1]) ? t0 : str(num(t0) + 1); if (/night/i.test(m[1]) && !out.time) out.time = '19:00'; }
    else if ((m = cut(/\bin\s+(\d{1,3})\s+(day|week|month)s?\b/i))) out.date = /day/i.test(m[2]) ? str(num(t0) + +m[1]) : /week/i.test(m[2]) ? str(num(t0) + 7 * m[1]) : (function () { var d = new Date(+t0.slice(0, 4), +t0.slice(5, 7) - 1 + +m[1], +t0.slice(8)); return ds(d.getFullYear(), d.getMonth(), d.getDate()); })();
    else if ((m = cut(new RegExp('\\b(?:on\\s+|by\\s+)?(next\\s+|this\\s+)?' + WDRE + '\\b', 'i')))) out.date = wdNext(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(m[2].toLowerCase()), !!m[1] && /next/i.test(m[1]));
    else if ((m = cut(/\bnext\s+week\b/i))) out.date = str(num(weekStartOf(t0)) + 7 + ((1 - S.set.weekStart + 7) % 7));
    if (out.time && !out.endTime) out.endTime = mt(Math.min(tm(out.time) + S.set.evLen, 1439));
    out.title = s0.replace(/\s+/g, ' ').replace(/^\s*(on|at|by|from|for)\s+/i, '').replace(/\s+(on|at|by|from|for|,|-)\s*$/i, '').trim();
    var low = out.title.toLowerCase(), has = function (id) { return S.cats.some(function (c) { return c.id === id; }) ? id : null; };
    out.cat = (/\b(test|quiz|exam|midterm|final)s?\b/.test(low) && has('test')) || (/\b(homework|hw|worksheet|essay|project)\b/.test(low) && has('hw')) || (/\bdue\b/.test(low) && has('due')) ||
      (/\b(birthday|bday|b-day)\b/.test(low) && has('bday')) || (/\b(meeting|meet|club|practice|call)\b/.test(low) && has('meet')) || null;
    if (!out.date) out.date = t0;
    return out;
  }
  function quickAdd(text) {
    var q = parseQuick(text); if (!q.title) { toast('Type what it is, like "Math test fri 3pm".'); return; }
    var undo = snapshot(), x = { id: uid(), title: q.title.slice(0, 120), date: q.date, end: q.end, time: q.time, endTime: q.endTime, rep: q.rep || 'none',
      cat: q.cat || (S.cats.filter(function (c) { return S.set.hidden.indexOf(c.id) < 0; })[0] || S.cats[0]).id };
    var dr = x.time ? S.set.remind : S.set.remindAllDay; if (dr >= 0) x.rem = [dr];
    S.events.push(x); save(); ui.cur = x.date; ui.mini = null; render();
    toast('Added "' + x.title + '": ' + nice(x.date) + (x.time ? ' at ' + fmtT(x.time) : '') + (isRep(x) ? ', ' + REPS[x.rep].toLowerCase() : '') + '.', undo);
  }

  // ---- reminders: a note on screen (on top of a game too) and, if allowed, a Chromebook / desktop notification ----
  // Which ones were shown is kept on this device ('hgcal:fired'), so each shows once even with two tabs or after a reload.
  var FKEY = 'hgcal:fired';
  function remTick() {
    var D; try { D = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (x) {} if (!D || !D.events) return;
    var now = Date.now(), t = num(todayS()), f; try { f = JSON.parse(localStorage.getItem(FKEY) || '{}') || {}; } catch (x) { f = {}; }
    var hit = [], dirty = false;
    D.events.forEach(function (e) {
      if (!e.rem || !e.rem.length) return;
      for (var n = t - 1; n <= t + 8; n++) {
        var day = str(n); if (!startsOn2(e, day)) continue;
        var tt = e.time || '09:00', at0 = new Date(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8), +tt.slice(0, 2), +tt.slice(3, 5)).getTime();
        e.rem.forEach(function (m) { var at = at0 - m * 60e3, k = e.id + '|' + day + '|' + m; if (now >= at && now - at < 30 * 60e3 && !f[k]) { f[k] = now; dirty = true; hit.push({ e: e, day: day, m: m }); } });
      }
    });
    Object.keys(f).forEach(function (k) { if (now - f[k] > 10 * 864e5) { delete f[k]; dirty = true; } });
    if (dirty) try { localStorage.setItem(FKEY, JSON.stringify(f)); } catch (x) {}
    hit.forEach(function (h) { ring(h.e, h.day); });
  }
  function ring(e, day) {
    var when = (day === todayS() ? 'Today' : rel(day).replace(/^./, function (c) { return c.toUpperCase(); })) + (e.time ? ' at ' + fmtT(e.time) : '') + (e.loc ? ' · ' + e.loc : '');
    try { if (window.Notification && Notification.permission === 'granted') new Notification(e.title, { body: when, tag: e.id + day }); } catch (x) {}
    var box = document.getElementById('cal-rings'); if (!box) { box = document.createElement('div'); box.id = 'cal-rings'; box.className = 'cal-rings'; document.body.appendChild(box); }
    var r = document.createElement('div'); r.className = 'cal-ring';
    r.innerHTML = '<span class="cal-ring-i">&#128276;</span><div><b>' + esc(e.title) + '</b><div class="rdesc">' + esc(when) + '</div></div><button data-o>Open</button><button data-k title="Dismiss">&times;</button>';
    r.querySelector('[data-k]').onclick = function () { r.remove(); };
    r.querySelector('[data-o]').onclick = function () { r.remove(); if (typeof current !== 'undefined' && current) return;   // a game is open: leave it running
      showTab('cal'); ui.cur = day; render(); editor(e.id, null, day); };
    box.appendChild(r);
  }
  setTimeout(remTick, 3000); setInterval(remTick, 20000);

  function render() {
    var box = document.getElementById('view-cal'); if (!box) return;
    if (!S) load();
    if (!ui.cur) ui.cur = todayS();
    var v = S.set.view, views = { day: viewDay, month: viewMonth, week: viewWeek, agenda: viewAgenda, year: viewYear };
    var focus = document.activeElement && document.activeElement.id === 'cal-q';
    if (!box.querySelector('.cal-head')) box.innerHTML =
      '<div class="cal-head"><div><h2>Calendar</h2><div class="rdesc">Homework, tests, birthdays, anything. Saved on this device, and synced to your Grapevine account when you are signed in.</div></div></div>' +
      '<div class="cal-bar"><button class="cal-btn ico" data-cal="prev" title="Back (&larr;)">&#8249;</button><div class="cal-title" id="cal-title"></div><button class="cal-btn ico" data-cal="next" title="Forward (&rarr;)">&#8250;</button>' +
      '<button class="cal-btn" data-cal="today">Today</button><div class="cal-seg" id="cal-seg">' + VIEWS.map(function (k) { return '<button data-view="' + k + '">' + k[0].toUpperCase() + k.slice(1) + '</button>'; }).join('') + '</div>' +
      '<span class="cal-sp"></span><input class="cal-search" id="cal-q" placeholder="Search events  /" autocomplete="off"><button class="cal-btn ico" data-cal="keys" title="Keyboard shortcuts (?)">?</button><button class="cal-btn ico" data-cal="settings" title="Settings">&#9881;</button><button class="cal-btn pri" data-cal="new">+ New event</button></div>' +
      '<div class="cal-wrap"><div class="cal-main" id="cal-main"></div><div id="cal-side"></div></div>';
    document.getElementById('cal-title').textContent = title();
    [].forEach.call(box.querySelectorAll('#cal-seg button'), function (b) { b.className = b.dataset.view === v ? 'on' : ''; });
    var main = document.getElementById('cal-main'), gb = document.getElementById('cal-tgb');
    if (gb) ui.gridTop = gb.scrollTop;
    main.className = 'cal-main' + (S.set.compact ? ' cal-compact' : '');
    main.innerHTML = (views[v] || viewMonth)();
    if (v === 'day' || v === 'week') scrollGrid(v + (v === 'day' ? ui.cur : weekStartOf(ui.cur))); else ui.gridKey = null;
    document.getElementById('cal-side').innerHTML = side();
    if (focus) document.getElementById('cal-q').focus();
  }
  function move(dir) {
    var v = S.set.view, y = +ui.cur.slice(0, 4), m = +ui.cur.slice(5, 7) - 1;
    if (v === 'month') { var nd = new Date(y, m + dir, 1); ui.cur = ds(nd.getFullYear(), nd.getMonth(), 1); }
    else if (v === 'year') ui.cur = (y + dir) + '-01-01';
    else ui.cur = str(num(ui.cur) + dir * (v === 'week' ? 7 : v === 'day' ? 1 : 30));
    ui.mini = null;
    render();
  }
  function setView(v) { S.set.view = v; save(); if (v === 'agenda' && !ui.q) ui.cur = todayS(); render(); }

  // ---- dialogs ----
  var ov = null;
  function dlg(html, wide) { close(); ov = document.createElement('div'); ov.className = 'cal-ov'; ov.innerHTML = '<div class="cal-dlg' + (wide ? ' wide' : '') + '">' + html + '</div>'; document.body.appendChild(ov); ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); }); return ov; }
  function close() { if (ov) { ov.remove(); ov = null; } }
  function toast(msg, undo) {
    var old = document.querySelector('.cal-toast'); if (old) old.remove();
    var t = document.createElement('div'); t.className = 'cal-toast'; t.innerHTML = esc(msg) + (undo ? '<button>Undo</button>' : '');
    if (undo) t.querySelector('button').onclick = function () { undo(); t.remove(); };
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, undo ? 6000 : 2500);
  }
  function snapshot() { var j = JSON.stringify(S.events); return function () { S.events = JSON.parse(j); save(); render(); }; }

  // ---- repeating events: change or delete just one, this and the ones after it, or all of them (as Google and Apple ask) ----
  function isRep(e) { return !!(e && e.rep && e.rep !== 'none'); }
  function shiftD(s, k) { return s ? str(num(s) + k) : s; }
  function askScope(verb, cb) {
    var o = dlg('<div class="cal-dh"><b>' + verb + ' a repeating event</b><button class="cal-x" data-x>&times;</button></div><div class="cal-db cal-scope">' +
      '<button class="cal-btn" data-sc="one">This event</button><button class="cal-btn" data-sc="next">This and following events</button><button class="cal-btn" data-sc="all">All events</button></div>' +
      '<div class="cal-df"><span class="cal-sp"></span><button class="cal-btn" data-x>Cancel</button></div>');
    [].forEach.call(o.querySelectorAll('[data-x]'), function (b) { b.onclick = function () { close(); render(); }; });
    [].forEach.call(o.querySelectorAll('[data-sc]'), function (b) { b.onclick = function () { close(); cb(b.dataset.sc); }; });
  }
  var RULEK = ['rep', 'rrule', 'count', 'until'];
  function applyScope(e, st, p, sc) {   // p: the new values, with dates for the occurrence that starts on st
    var x;
    if (!isRep(e)) sc = 'all';
    if (sc === 'next' && st === e.date) sc = 'all';
    if (sc === 'all') {
      var k = p.date ? num(p.date) - num(st) : 0, nd = shiftD(e.date, k);
      if ('end' in p) p.end = p.end ? shiftD(p.end, num(nd) - num(p.date || st)) : undefined; else e.end = shiftD(e.end, k);
      if (!('until' in p)) e.until = shiftD(e.until, k);
      if (k) { if (e.skip) e.skip = e.skip.map(function (q) { return shiftD(q, k); }); if (e.done) e.done = e.done.map(function (q) { return shiftD(q, k); }); }
      Object.keys(p).forEach(function (q) { e[q] = p[q]; }); e.date = nd; x = e;
    } else if (sc === 'one') {
      x = JSON.parse(JSON.stringify(e)); Object.keys(p).forEach(function (q) { if (RULEK.indexOf(q) < 0) x[q] = p[q]; });
      x.id = uid(); x.rep = 'none'; x.rrule = x.count = x.until = x.skip = undefined; x.date = p.date || st;
      if (!('end' in p) && e.end) x.end = shiftD(e.end, num(x.date) - num(e.date));
      x.done = isDone(e, st) ? [x.date] : undefined;
      e.skip = (e.skip || []).concat([st]); if (e.done) e.done = e.done.filter(function (q) { return q !== st; });
      S.events.push(x);
    } else {   // this and following: the series stops the day before, a new series carries on from here
      x = JSON.parse(JSON.stringify(e)); var before = e.count ? countBefore(e, st) : 0, k2 = p.date ? num(p.date) - num(st) : 0;
      if (!('end' in p) && e.end) x.end = shiftD(e.end, num(st) + k2 - num(e.date));
      x.skip = (e.skip || []).filter(function (q) { return q > st; }).map(function (q) { return shiftD(q, k2); });
      x.done = (e.done || []).filter(function (q) { return q >= st; }).map(function (q) { return shiftD(q, k2); });
      if (e.count && !('count' in p)) x.count = Math.max(1, e.count - before);
      Object.keys(p).forEach(function (q) { x[q] = p[q]; }); x.id = uid(); x.date = p.date || st;
      if (!x.skip.length) x.skip = undefined; if (!x.done.length) x.done = undefined;
      e.until = str(num(st) - 1); if (e.count) e.count = before || undefined;
      e.skip = (e.skip || []).filter(function (q) { return q < st; }); e.done = (e.done || []).filter(function (q) { return q < st; });
      if (!e.skip.length) e.skip = undefined; if (!e.done.length) e.done = undefined;
      S.events.push(x);
    }
    return x;
  }
  function change(e, st, p, msg) {   // st: the occurrence that was changed (a repeating event asks how far the change goes)
    function go(sc) { var undo = snapshot(); applyScope(e, st || e.date, p, sc); save(); render(); toast(msg || 'Saved.', undo); }
    if (isRep(e) && st) askScope('Change', go); else go('all');
  }
  function remove(e, st) {
    function go(sc) {
      var undo = snapshot();
      if (sc === 'one') e.skip = (e.skip || []).concat([st]);
      else if (sc === 'next' && st > e.date) { if (e.count) e.count = countBefore(e, st) || undefined; e.until = str(num(st) - 1); }
      else S.events = S.events.filter(function (q) { return q !== e; });
      save(); close(); render(); toast(sc === 'one' ? 'Deleted that one.' : sc === 'next' && st > e.date ? 'Deleted this and the ones after it.' : 'Deleted "' + e.title + '".', undo);
    }
    if (isRep(e) && st) askScope('Delete', go); else go('all');
  }

  // ---- repeat rules in words, and the custom rule builder ----
  var NTH = ['', 'first', 'second', 'third', 'fourth', 'fifth'], WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function nthOf(d) { return Math.ceil(+d.slice(8) / 7); }
  function isLastWk(d) { return +d.slice(8) + 7 > +str(num(ds(+d.slice(0, 4), +d.slice(5, 7), 1)) - 1).slice(8); }
  function repText(x) {
    if (!isRep(x)) return '';
    var t, r = x.rep === 'custom' ? ICS.rule(x.rrule) : null;
    if (!r) t = x.rep === 'weekly' ? 'Every week on ' + WDL[dow(x.date)] : x.rep === 'monthly' ? 'Every month on day ' + +x.date.slice(8) : x.rep === 'yearly' ? 'Every year on ' + nice(x.date, { month: 'long', day: 'numeric' }) : REPS[x.rep];
    else {
      var iv = +r.INTERVAL || 1, u = { DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month', YEARLY: 'year' }[r.FREQ] || 'day';
      t = 'Every ' + (iv > 1 ? iv + ' ' + u + 's' : u);
      if (r.FREQ === 'WEEKLY') t += ' on ' + (r.BYDAY ? r.BYDAY.split(',').map(function (w) { return DOW[WDS.indexOf(w)]; }).join(', ') : DOW[dow(x.date)]);
      if (r.FREQ === 'MONTHLY') { var m = /^(-?\d)(\w\w)$/.exec(r.BYDAY || ''); t += m ? ' on the ' + (m[1] === '-1' ? 'last' : NTH[+m[1]]) + ' ' + WDL[WDS.indexOf(m[2])] : ' on day ' + +x.date.slice(8); }
      if (r.FREQ === 'YEARLY') t += ' on ' + nice(x.date, { month: 'long', day: 'numeric' });
    }
    return t + (x.count ? ', ' + x.count + ' times' : '') + (x.until ? ', until ' + nice(x.until, { month: 'short', day: 'numeric', year: 'numeric' }) : '');
  }
  function remLabel(m, allDay) {
    if (!allDay) return REMS[m] || m + ' minutes before';
    return m === 0 ? 'On the day at 9am' : m === 1440 ? 'The day before at 9am' : m === 2880 ? '2 days before at 9am' : m === 10080 ? '1 week before at 9am' : (REMS[m] || m + ' min') .replace('At the time', 'At 9am') + ' (from 9am)';
  }
  function dl(text, name, type) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/calendar' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  function gcalUrl(e) {   // Google Calendar's own "add this event" page, filled in
    var d8 = function (s) { return s.replace(/-/g, ''); }, t6 = function (t) { return t.replace(':', '') + '00'; }, dates;
    if (e.time) { var a = tm(e.time), b = e.endTime ? tm(e.endTime) : a + 60; dates = d8(e.date) + 'T' + t6(e.time) + '/' + d8(e.end || (b > a ? e.date : str(num(e.date) + 1))) + 'T' + t6(mt(b % 1440)); }
    else dates = d8(e.date) + '/' + d8(str(num(e.end || e.date) + 1));
    var rr = e.rep === 'custom' ? e.rrule : RRS[e.rep];
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(e.title) + '&dates=' + dates +
      (e.notes || e.url ? '&details=' + encodeURIComponent([e.notes, e.url].filter(Boolean).join('\n')) : '') + (e.loc ? '&location=' + encodeURIComponent(e.loc) : '') +
      (isRep(e) && rr ? '&recur=' + encodeURIComponent('RRULE:' + rr + (e.count ? ';COUNT=' + e.count : '') + (e.until ? ';UNTIL=' + d8(e.until) : '')) : '');
  }

  function editor(id, day, st, pre) {
    var e = id ? evById(id) : null, isNew = !e;
    if (!e) {
      e = Object.assign({ title: '', date: day || ui.cur || todayS(), cat: (S.cats.filter(function (c) { return S.set.hidden.indexOf(c.id) < 0; })[0] || S.cats[0]).id, rep: 'none' }, pre || {});
      var dr = e.time ? S.set.remind : S.set.remindAllDay; if (!e.rem && dr >= 0) e.rem = [dr];
    }
    var rep = isRep(e), occ0 = !isNew && rep && st ? st : e.date, k0 = num(occ0) - num(e.date);
    var r0 = e.rep === 'custom' ? ICS.rule(e.rrule) : ICS.rule(RRS[e.rep] || 'FREQ=WEEKLY'), bd0 = (r0.BYDAY || '').split(',').filter(function (w) { return /^[A-Z]{2}$/.test(w); });
    var mm0 = /^-1/.test(r0.BYDAY || '') ? 'last' : /^\d\w\w$/.test(r0.BYDAY || '') ? 'nth' : 'day', rem = (e.rem || []).slice(), color = e.color || '';
    var ends = e.count ? 'count' : e.until ? 'until' : 'never';
    var o = dlg('<div class="cal-dh"><div><b>' + (isNew ? 'New event' : 'Edit event') + '</b>' + (!isNew && rep && st ? '<div class="rdesc">This one: ' + nice(st, { weekday: 'long', month: 'short', day: 'numeric' }) + '</div>' : '') + '</div><button class="cal-x" data-x>&times;</button></div>' +
      '<form class="cal-db" id="cal-form">' +
      '<label class="cal-f">Title<input id="ce-title" required maxlength="120" placeholder="Math test, Sam\'s birthday..." value="' + esc(e.title) + '"></label>' +
      '<div class="cal-row2"><label class="cal-f">Date<input type="date" id="ce-date" required value="' + occ0 + '"></label><label class="cal-f">Ends (for more than one day)<input type="date" id="ce-end" value="' + (e.end ? shiftD(e.end, k0) : '') + '"></label></div>' +
      '<label class="cal-chk"><input type="checkbox" id="ce-allday"' + (e.time ? '' : ' checked') + '> All day</label>' +
      '<div class="cal-row2" id="ce-times"' + (e.time ? '' : ' hidden') + '><label class="cal-f">Starts<input type="time" id="ce-time" value="' + (e.time || '') + '"></label><label class="cal-f">Ends<input type="time" id="ce-etime" value="' + (e.endTime || '') + '"></label></div>' +
      '<div class="cal-row2"><label class="cal-f">Category<select id="ce-cat">' + S.cats.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === e.cat ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></label>' +
      '<label class="cal-f">Repeats<select id="ce-rep">' + Object.keys(REPS).map(function (k) { return '<option value="' + k + '"' + ((e.rep || 'none') === k ? ' selected' : '') + '>' + REPS[k] + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="cal-cust" id="ce-cust" hidden><div class="cal-inl">Every <input type="number" id="cr-iv" min="1" max="99" value="' + (+r0.INTERVAL || 1) + '"> <select id="cr-f">' +
        [['DAILY', 'day(s)'], ['WEEKLY', 'week(s)'], ['MONTHLY', 'month(s)'], ['YEARLY', 'year(s)']].map(function (f) { return '<option value="' + f[0] + '"' + ((r0.FREQ || 'WEEKLY') === f[0] ? ' selected' : '') + '>' + f[1] + '</option>'; }).join('') + '</select></div>' +
        '<div class="cal-wds" id="cr-wd">' + DOW.map(function (d, i) { return '<button type="button" data-wd="' + WDS[i] + '">' + d[0] + '</button>'; }).join('') + '</div>' +
        '<select id="cr-mm"></select></div>' +
      '<div class="cal-inl" id="ce-endsw"' + (rep ? '' : ' hidden') + '>Ends <select id="ce-ends"><option value="never">Never</option><option value="until">On</option><option value="count">After</option></select>' +
        '<input type="date" id="ce-until" value="' + (e.until || '') + '"><span id="ce-cntw"><input type="number" id="ce-count" min="1" max="999" value="' + (e.count || 10) + '"> times</span></div>' +
      '<div class="rdesc" id="ce-rtxt"></div>' +
      '<div class="cal-row2"><label class="cal-f">Location<input id="ce-loc" maxlength="200" placeholder="Room 12, the gym, a Meet link..." value="' + esc(e.loc || '') + '"></label>' +
        '<label class="cal-f">Link<input id="ce-url" maxlength="500" placeholder="https://" value="' + esc(e.url || '') + '"></label></div>' +
      '<div class="cal-f">Colour<div class="cal-swatches" id="ce-col"></div></div>' +
      '<div class="cal-f">Reminders<div class="cal-rems" id="ce-rems"></div></div>' +
      '<label class="cal-f">Notes<textarea id="ce-notes" maxlength="2000" placeholder="Pages, room, what to bring...">' + esc(e.notes || '') + '</textarea></label>' +
      '<label class="cal-chk"><input type="checkbox" id="ce-pin"' + (e.pin ? ' checked' : '') + '> Show a countdown to it at the side</label>' +
      (isNew ? '' : '<label class="cal-chk"><input type="checkbox" id="ce-done"' + (isDone(e, st || e.date) ? ' checked' : '') + '> Done' + (rep ? ' (this one)' : '') + '</label>') +
      '<button type="submit" hidden></button></form>' +
      '<div class="cal-df">' + (isNew ? '' : '<button class="cal-btn dng" data-del>Delete</button><button class="cal-btn" data-dup>Duplicate</button>' +
        '<button class="cal-btn" data-ics1 title="Opens in Apple Calendar, Outlook and others">.ics</button><button class="cal-btn" data-gcal title="Add it to your Google Calendar">Google</button>') +
      '<span class="cal-sp"></span><button class="cal-btn" data-x>Cancel</button><button class="cal-btn pri" data-ok>' + (isNew ? 'Add' : 'Save') + '</button></div>', true);
    var $ = function (s) { return o.querySelector(s); };
    $('#ce-ends').value = ends;
    bd0.forEach(function (w) { var b = o.querySelector('[data-wd="' + w + '"]'); if (b) b.classList.add('on'); });
    function paintMm() {
      var d = $('#ce-date').value || occ0, wd = WDL[dow(d)], n = nthOf(d), opts = [['day', 'On day ' + +d.slice(8)]];
      if (n <= 4) opts.push(['nth', 'On the ' + NTH[n] + ' ' + wd]); if (isLastWk(d)) opts.push(['last', 'On the last ' + wd]);
      var cur = $('#cr-mm').value || mm0; $('#cr-mm').innerHTML = opts.map(function (q) { return '<option value="' + q[0] + '">' + q[1] + '</option>'; }).join('');
      $('#cr-mm').value = opts.some(function (q) { return q[0] === cur; }) ? cur : 'day';
    }
    function rrule() {   // the custom rule from the builder (without COUNT / UNTIL: those are kept apart)
      var f = $('#cr-f').value, iv = Math.max(1, Math.min(99, +$('#cr-iv').value || 1)), r = 'FREQ=' + f + (iv > 1 ? ';INTERVAL=' + iv : ''), d = $('#ce-date').value || occ0;
      if (f === 'WEEKLY') { var w = [].map.call(o.querySelectorAll('#cr-wd .on'), function (b) { return b.dataset.wd; }); if (!w.length) w = [WDS[dow(d)]]; r += ';BYDAY=' + w.join(','); }
      if (f === 'MONTHLY' && $('#cr-mm').value === 'nth') r += ';BYDAY=' + nthOf(d) + WDS[dow(d)];
      if (f === 'MONTHLY' && $('#cr-mm').value === 'last') r += ';BYDAY=-1' + WDS[dow(d)];
      return r;
    }
    function ruleVals() {
      var rp = $('#ce-rep').value, en = $('#ce-ends').value;
      return { rep: rp, rrule: rp === 'custom' ? rrule() : undefined, until: rp !== 'none' && en === 'until' && $('#ce-until').value ? $('#ce-until').value : undefined,
        count: rp !== 'none' && en === 'count' ? Math.max(1, Math.min(999, +$('#ce-count').value || 1)) : undefined };
    }
    function paintRep() {
      var rp = $('#ce-rep').value, f = $('#cr-f').value, en = $('#ce-ends').value;
      $('#ce-cust').hidden = rp !== 'custom'; $('#ce-endsw').hidden = rp === 'none';
      $('#cr-wd').hidden = f !== 'WEEKLY'; $('#cr-mm').hidden = f !== 'MONTHLY'; paintMm();
      $('#ce-until').hidden = en !== 'until'; $('#ce-cntw').hidden = en !== 'count';
      var v = ruleVals(); v.date = $('#ce-date').value || occ0; $('#ce-rtxt').textContent = repText(v);
    }
    function paintCol() {
      $('#ce-col').innerHTML = '<button type="button" class="cal-sw auto' + (color ? '' : ' on') + '" data-col="" title="Same as the category" style="background:' + cat($('#ce-cat').value).color + '"></button>' +
        COLORS.map(function (k) { return '<button type="button" class="cal-sw' + (k === color ? ' on' : '') + '" data-col="' + k + '" style="background:' + k + '"></button>'; }).join('');
    }
    function paintRem() {
      var ad = $('#ce-allday').checked;
      $('#ce-rems').innerHTML = rem.map(function (m, i) { return '<span class="cal-rem">&#128276; ' + esc(remLabel(m, ad)) + '<button type="button" data-rmrem="' + i + '" title="Remove">&times;</button></span>'; }).join('') +
        (rem.length < 5 ? '<select id="ce-addrem"><option value="">+ Add reminder</option>' + Object.keys(REMS).filter(function (m) { return rem.indexOf(+m) < 0; }).map(function (m) { return '<option value="' + m + '">' + esc(remLabel(+m, ad)) + '</option>'; }).join('') + '</select>' : '');
    }
    paintRep(); paintCol(); paintRem();
    $('#ce-allday').onchange = function () { $('#ce-times').hidden = this.checked; if (!this.checked && !$('#ce-time').value) { $('#ce-time').value = '09:00'; $('#ce-etime').value = mt(540 + S.set.evLen); } paintRem(); };
    $('#ce-time').onchange = function () { var a = tm(this.value), b = tm($('#ce-etime').value); if (this.value && (!$('#ce-etime').value || b <= a)) $('#ce-etime').value = mt(Math.min(a + S.set.evLen, 1439)); };
    ['#ce-rep', '#cr-f', '#cr-iv', '#cr-mm', '#ce-ends', '#ce-until', '#ce-count', '#ce-date'].forEach(function (q) { $(q).addEventListener('input', paintRep); $(q).addEventListener('change', paintRep); });
    $('#cr-wd').onclick = function (ev) { var b = ev.target.closest('[data-wd]'); if (b) { b.classList.toggle('on'); paintRep(); } };
    $('#ce-cat').onchange = paintCol;
    $('#ce-col').onclick = function (ev) { var b = ev.target.closest('[data-col]'); if (b) { color = b.dataset.col; paintCol(); } };
    $('#ce-rems').onclick = function (ev) { var b = ev.target.closest('[data-rmrem]'); if (b) { rem.splice(+b.dataset.rmrem, 1); paintRem(); } };
    $('#ce-rems').onchange = function (ev) { if (ev.target.id === 'ce-addrem' && ev.target.value !== '') { rem.push(+ev.target.value); rem.sort(function (a, b) { return a - b; }); paintRem(); } };
    function vals() {
      var d = $('#ce-date').value, end = $('#ce-end').value, allDay = $('#ce-allday').checked, time = allDay ? undefined : $('#ce-time').value || undefined, url = $('#ce-url').value.trim();
      var v = { title: $('#ce-title').value.trim(), date: d, end: end && end > d ? end : undefined, time: time, endTime: time ? $('#ce-etime').value || undefined : undefined, cat: $('#ce-cat').value,
        loc: $('#ce-loc').value.trim() || undefined, url: url ? (/^https?:\/\//i.test(url) ? url : 'https://' + url) : undefined, color: color || undefined, rem: rem.length ? rem.slice() : undefined,
        notes: $('#ce-notes').value.trim() || undefined, pin: $('#ce-pin').checked || undefined };
      var r = ruleVals(); Object.keys(r).forEach(function (k) { v[k] = r[k]; });
      return v;
    }
    function same(v) {   // did anything but "done" change?
      var cur = { title: e.title, date: occ0, end: e.end ? shiftD(e.end, k0) : undefined, time: e.time, endTime: e.endTime, cat: e.cat, loc: e.loc, url: e.url, color: e.color, rem: e.rem && e.rem.length ? e.rem : undefined,
        notes: e.notes, pin: e.pin, rep: e.rep || 'none', rrule: e.rep === 'custom' ? e.rrule : undefined, until: e.until, count: e.count };
      return Object.keys(v).every(function (k) { return JSON.stringify(v[k]) === JSON.stringify(cur[k]); });
    }
    function commit(asNew) {
      var v = vals();
      if (!v.title) { $('#ce-title').focus(); return; } if (!v.date) { $('#ce-date').focus(); return; }
      if (v.rep === 'custom' && !v.rrule) v.rep = 'none';
      if (asNew || isNew) {
        var undo = snapshot(), x = Object.assign({ id: uid() }, v); S.events.push(x); save(); close();
        ui.cur = x.date; render(); toast(asNew ? 'Copied.' : 'Added "' + v.title + '".', undo); return;
      }
      var dn = $('#ce-done') && $('#ce-done').checked, k = st || e.date, was = isDone(e, k);
      if (dn !== was) { var l = (e.done || []).filter(function (q) { return q !== k; }); if (dn) l.push(k); e.done = l.length ? l : undefined; }
      if (same(v)) { save(); close(); render(); toast('Saved.'); return; }
      close(); change(e, rep ? st || e.date : null, v, 'Saved.');
    }
    $('#cal-form').onsubmit = function (ev) { ev.preventDefault(); commit(false); };
    $('[data-ok]').onclick = function () { commit(false); };
    [].forEach.call(o.querySelectorAll('[data-x]'), function (b) { b.onclick = close; });
    if (!isNew) {
      $('[data-del]').onclick = function () { close(); remove(e, rep ? st || e.date : null); };
      $('[data-dup]').onclick = function () { commit(true); };
      $('[data-ics1]').onclick = function () { dl(ICS.write([e], S.cats), (e.title.replace(/[^\w\- ]+/g, '').trim() || 'event') + '.ics'); };
      $('[data-gcal]').onclick = function () { window.open(gcalUrl(e), '_blank', 'noopener'); };
    }
    setTimeout(function () { var i = $('#ce-title'); if (i && isNew) { i.focus(); i.select(); } }, 30);
  }
  function dayList(day) {
    var evs = on(day), hol = holOf(day);
    var o = dlg('<div class="cal-dh"><div><b>' + nice(day, { weekday: 'long', month: 'long', day: 'numeric' }) + '</b><div class="rdesc">' + rel(day) + (hol ? ' · ' + esc(hol) : '') + '</div></div><button class="cal-x" data-x>&times;</button></div>' +
      '<div class="cal-db"><div class="cal-ag-list">' + (evs.map(function (q) { return chip(q, day); }).join('') || '<div class="cal-empty">Nothing on this day.</div>') + '</div></div>' +
      '<div class="cal-df"><button class="cal-btn" data-x>Close</button><button class="cal-btn pri" data-add>+ Add on this day</button></div>');
    [].forEach.call(o.querySelectorAll('[data-x]'), function (b) { b.onclick = close; });
    o.querySelector('[data-add]').onclick = function () { editor(null, day); };
  }
  // a .ics file from Google / Apple / Outlook, copied in as your own events. Simple repeats stay repeats; anything
  // fancier (every 2nd Tuesday, moved or cancelled single repeats) is written out day by day for the next two years.
  function importIcs(text) {
    var t = num(todayS()), raw = ICS.parse(text), got = ICS.read(text, { from: t - 400, to: t + 730 }), byUid = {}, fancy = {}, rules = {}, have = {}, n = 0;
    got.events.forEach(function (e) { (byUid[e.uid] = byUid[e.uid] || []).push(e); });
    raw.events.forEach(function (v) { if (v.uid && v['RECURRENCE-ID']) fancy[v.uid] = 1; });
    raw.events.forEach(function (v) {
      if (!v.uid || !v.rrule || v['RECURRENCE-ID'] || fancy[v.uid] || v.rdate.length || !byUid[v.uid]) return;
      var r = ICS.rule(v.rrule), list = byUid[v.uid], first = list[0], last = list[list.length - 1], iv = +r.INTERVAL || 1, k = null;
      var plain = Object.keys(r).filter(function (q) { return ['FREQ', 'INTERVAL', 'UNTIL', 'WKST', 'BYDAY', 'COUNT'].indexOf(q) < 0; }).length === 0;
      if (plain) {
        if (r.FREQ === 'DAILY' && iv === 1 && !r.BYDAY) k = 'daily';
        else if (r.FREQ === 'WEEKLY' && r.BYDAY === 'MO,TU,WE,TH,FR' && iv === 1) k = 'weekdays';
        else if (r.FREQ === 'WEEKLY' && (!r.BYDAY || (r.BYDAY.indexOf(',') < 0 && WDS[dow(first.date)] === r.BYDAY))) k = iv === 1 ? 'weekly' : iv === 2 ? 'biweekly' : null;
        else if (r.FREQ === 'MONTHLY' && iv === 1 && !r.BYDAY) k = 'monthly';
        else if (r.FREQ === 'YEARLY' && iv === 1 && !r.BYDAY) k = 'yearly';
      }
      var until = r.UNTIL ? (ICS.dt(r.UNTIL) ? ICS.dstr(ICS.dt(r.UNTIL).n) : undefined) : undefined;
      if (r.COUNT) { if (num(last.date) > t + 700) return; until = last.date; }   // the window starts part-way in: a count becomes an end date
      var rr = k ? '' : v.rrule.split(';').filter(function (p) { return !/^(UNTIL|COUNT)=/i.test(p); }).join(';');
      // the repeats Google or Apple left out (EXDATE), found by comparing the rule's days with the days the file really has
      var tmp = { id: 'tmp', date: first.date, rep: k || 'custom', rrule: rr || undefined, until: last.date }, want = occ(tmp, num(last.date)), gotD = {}, skip = [];
      list.forEach(function (e) { gotD[num(e.date)] = 1; });
      Object.keys(want).forEach(function (d) { if (+d <= num(last.date) && !gotD[d]) skip.push(str(+d)); });
      if (list.some(function (e) { return !want[num(e.date)]; }) || skip.length > list.length / 3 + 2) return;   // the rule does not fit what the file has: copy it day by day
      rules[v.uid] = { rep: k || 'custom', rrule: rr || undefined, until: until, skip: skip.length ? skip.sort() : undefined };
    });
    if (!S.cats.some(function (c) { return c.id === 'imp'; })) S.cats.push({ id: 'imp', name: 'Imported', color: '#22d3ee' });
    S.events.forEach(function (e) { have[e.id] = 1; });
    Object.keys(byUid).forEach(function (u) {
      var list = byUid[u], rp = rules[u] || null;
      (rp ? list.slice(0, 1) : list).forEach(function (e) {
        var id = 'ics:' + (rp ? u : e.id); if (have[id] || n >= 1500) return; have[id] = 1; n++;
        S.events.push({ id: id, title: String(e.title).slice(0, 120), date: e.date, end: e.end, time: e.time, endTime: e.endTime, cat: 'imp', rep: rp ? rp.rep : 'none',
          rrule: rp ? rp.rrule : undefined, until: rp ? rp.until : undefined, skip: rp ? rp.skip : undefined,
          loc: e.loc, url: e.url, rem: e.rem, notes: e.notes ? String(e.notes).slice(0, 2000) : undefined });
      });
    });
    return n;
  }
  function viewer(e) {
    var l = link(e.link) || { name: 'Linked calendar', color: '#94a3b8' };
    var when = nice(e.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) + (e.end ? ' - ' + nice(e.end, { weekday: 'short', month: 'short', day: 'numeric' }) : '') +
      ' · ' + (e.time ? fmtT(e.time) + (e.endTime ? ' - ' + fmtT(e.endTime) : '') : 'All day');
    var o = dlg('<div class="cal-dh"><div><b>' + esc(e.title) + '</b><div class="rdesc"><span style="color:' + l.color + '">&#9679;</span> From ' + esc(l.name) + ' (read-only)</div></div><button class="cal-x" data-x>&times;</button></div>' +
      '<div class="cal-db"><div>' + esc(when) + '<div class="rdesc">' + rel(e.date) + '</div></div>' +
      (e.loc ? '<div><div class="cal-sec">Where</div>' + esc(e.loc) + '</div>' : '') +
      (e.url ? '<div><div class="cal-sec">Link</div><a href="' + esc(e.url) + '" target="_blank" rel="noopener">' + esc(e.url) + '</a></div>' : '') +
      (e.notes ? '<div><div class="cal-sec">Notes</div><div style="white-space:pre-wrap;font-size:13px;max-height:220px;overflow:auto">' + esc(e.notes) + '</div></div>' : '') + '</div>' +
      '<div class="cal-df"><button class="cal-btn" data-copy title="Make your own copy you can change">Copy to my events</button><span class="cal-sp"></span><button class="cal-btn pri" data-x>Close</button></div>');
    [].forEach.call(o.querySelectorAll('[data-x]'), function (b) { b.onclick = close; });
    o.querySelector('[data-copy]').onclick = function () {
      var undo = snapshot();
      S.events.push({ id: uid(), title: e.title, date: e.date, end: e.end, time: e.time, endTime: e.endTime, cat: (S.cats.filter(function (c) { return c.id === 'other'; })[0] || S.cats[S.cats.length - 1]).id, rep: 'none', loc: e.loc, url: e.url, notes: e.notes ? e.notes.slice(0, 2000) : undefined });
      save(); close(); render(); toast('Copied to your events.', undo);
    };
  }
  function settings() {
    var st = S.set, cats = JSON.parse(JSON.stringify(S.cats));
    var o = dlg('<div class="cal-dh"><b>Calendar settings</b><button class="cal-x" data-x>&times;</button></div><div class="cal-db">' +
      '<div class="cal-sec">Layout</div>' +
      '<div class="cal-row2"><label class="cal-f">Week starts on<select id="cs-ws"><option value="0">Sunday</option><option value="1"' + (st.weekStart === 1 ? ' selected' : '') + '>Monday</option></select></label>' +
      '<label class="cal-f">Opens in<select id="cs-view">' + VIEWS.map(function (k) { return '<option' + (st.view === k ? ' selected' : '') + '>' + k + '</option>'; }).join('') + '</select></label></div>' +
      '<label class="cal-chk"><input type="checkbox" id="cs-we"' + (st.weekends ? ' checked' : '') + '> Show weekends</label>' +
      '<label class="cal-chk"><input type="checkbox" id="cs-wn"' + (st.weekNums ? ' checked' : '') + '> Show week numbers</label>' +
      '<label class="cal-chk"><input type="checkbox" id="cs-cp"' + (st.compact ? ' checked' : '') + '> Compact days</label>' +
      '<label class="cal-chk"><input type="checkbox" id="cs-24"' + (st.h24 ? ' checked' : '') + '> 24-hour time</label>' +
      '<label class="cal-chk"><input type="checkbox" id="cs-hol"' + (st.holidays ? ' checked' : '') + '> Show holidays</label>' +
      '<div class="cal-row2"><label class="cal-f">Day and week start at<select id="cs-ds">' + [0, 5, 6, 7, 8, 9, 10, 12].map(function (k) { return '<option value="' + k + '"' + (st.dayStart === k ? ' selected' : '') + '>' + fmtT(pad(k) + ':00') + '</option>'; }).join('') + '</select></label>' +
      '<label class="cal-f">New events last<select id="cs-len">' + [15, 30, 45, 60, 90, 120].map(function (k) { return '<option value="' + k + '"' + (st.evLen === k ? ' selected' : '') + '>' + (k < 60 ? k + ' minutes' : k / 60 + ' hour' + (k > 60 ? 's' : '')) + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="cal-sec">Reminders</div>' +
      '<div class="cal-row2"><label class="cal-f">New events with a time<select id="cs-rem"><option value="-1">No reminder</option>' + Object.keys(REMS).map(function (m) { return '<option value="' + m + '"' + (st.remind === +m ? ' selected' : '') + '>' + REMS[m] + '</option>'; }).join('') + '</select></label>' +
      '<label class="cal-f">New all-day events<select id="cs-rema"><option value="-1">No reminder</option>' + [0, 1440, 2880, 10080].map(function (m) { return '<option value="' + m + '"' + (st.remindAllDay === m ? ' selected' : '') + '>' + remLabel(m, true) + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="rdesc">Reminders pop up while Taco Games is open (even during a game).' + (window.Notification ? ' <button class="cal-btn" id="cs-ntf" style="margin-left:6px">' + (Notification.permission === 'granted' ? 'Chromebook notifications are on' : 'Also show Chromebook notifications') + '</button>' : '') + '</div>' +
      '<div class="cal-sec">Categories</div><div id="cs-cats" style="display:flex;flex-direction:column;gap:8px"></div><button class="cal-btn" id="cs-add" style="align-self:flex-start">+ Add category</button>' +
      '<div class="cal-sec">Linked calendars</div><div class="rdesc">Show a Google or Apple calendar here. Its new events show up by themselves (it is checked every 15 minutes while this tab is open). They are read-only here: change them in Google or Apple. Changes in this box apply right away.</div>' +
      '<div id="cs-links" class="cal-links"></div>' +
      '<div style="display:flex;gap:8px"><input class="cal-search" id="cs-lurl" style="flex:1;width:auto" placeholder="Paste the calendar\'s private link (https:// or webcal://)" autocomplete="off"><button class="cal-btn" id="cs-ladd">Link</button></div>' +
      '<details class="cal-help"><summary>Where do I find the link?</summary>' +
      '<p><b>Google Calendar</b> (on a computer): open calendar.google.com → Settings (gear) → under "Settings for my calendars" click your calendar → "Integrate calendar" → copy <b>Secret address in iCal format</b>. School accounts sometimes have this turned off; a personal Gmail calendar works.</p>' +
      '<p><b>Apple Calendar</b>: on iPhone, Calendar → Calendars → the &#9432; next to a calendar → turn on <b>Public Calendar</b> → Share Link → Copy Link. On a Mac, right-click the calendar → Share Calendar → Public Calendar. On icloud.com, the share button next to the calendar.</p>' +
      '<p>Keep the link to yourself: anyone who has it can see that calendar.</p></details>' +
      '<div class="cal-sec">Your events (' + S.events.length + ')</div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="cal-btn" id="cs-ics" title="A file Google Calendar, Apple Calendar and Outlook can import">Export for Google / Apple (.ics)</button><button class="cal-btn" id="cs-exp" title="Everything, settings too, to bring back here later">Back up (.json)</button><button class="cal-btn" id="cs-imp" title="A .ics file from Google, Apple or Outlook, or a backup from here">Import file</button><button class="cal-btn dng" id="cs-clr">Delete every event</button><input type="file" id="cs-file" accept=".json,.ics,application/json,text/calendar" hidden></div>' +
      '</div><div class="cal-df"><button class="cal-btn" data-x>Cancel</button><button class="cal-btn pri" data-ok>Save</button></div>', true);
    var $ = function (s) { return o.querySelector(s); }, pick = -1;
    function paintCats() {
      $('#cs-cats').innerHTML = cats.map(function (c, i) {
        return '<div class="cal-catrow"><button class="cal-dot" data-pick="' + i + '" style="background:' + c.color + '" title="Colour"></button><input class="cal-search" style="width:100%" data-name="' + i + '" value="' + esc(c.name) + '" maxlength="30">' +
          '<button class="cal-btn dng ico" data-rm="' + i + '" title="Remove"' + (cats.length < 2 ? ' disabled' : '') + '>&times;</button></div>' +
          (pick === i ? '<div class="cal-swatches" style="margin-left:34px">' + COLORS.map(function (k) { return '<button class="cal-sw' + (k === c.color ? ' on' : '') + '" data-col="' + k + '" style="background:' + k + '"></button>'; }).join('') + '</div>' : '');
      }).join('');
    }
    paintCats();
    $('#cs-cats').addEventListener('input', function (e) { var i = e.target.dataset.name; if (i != null) cats[i].name = e.target.value; });
    $('#cs-cats').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.pick != null) { pick = pick === +b.dataset.pick ? -1 : +b.dataset.pick; paintCats(); }
      else if (b.dataset.col) { cats[pick].color = b.dataset.col; pick = -1; paintCats(); }
      else if (b.dataset.rm != null) { cats.splice(+b.dataset.rm, 1); pick = -1; paintCats(); }
    });
    $('#cs-add').onclick = function () { cats.push({ id: 'c' + uid(), name: 'New category', color: COLORS[cats.length % COLORS.length] }); pick = cats.length - 1; paintCats(); var i = o.querySelector('[data-name="' + (cats.length - 1) + '"]'); i.focus(); i.select(); };
    $('#cs-exp').onclick = function () {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }));
      a.download = 'calendar-' + todayS() + '.json'; document.body.appendChild(a); a.click(); a.remove();
    };
    $('#cs-ics').onclick = function () {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ICS.write(S.events, S.cats)], { type: 'text/calendar' }));
      a.download = 'taco-calendar-' + todayS() + '.ics'; document.body.appendChild(a); a.click(); a.remove();
    };
    paintLinks = function () {
      var box = o.querySelector('#cs-links'); if (!box || !document.body.contains(box)) { paintLinks = function () {}; return; }
      var foc = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.lname;
      box.innerHTML = (S.links || []).map(function (l) {
        return '<div class="cal-lrow"><div class="cal-catrow"><button class="cal-dot" data-lpick="' + esc(l.id) + '" style="background:' + l.color + '" title="Colour"></button><input class="cal-search" style="width:100%" data-lname="' + esc(l.id) + '" value="' + esc(l.name) + '" maxlength="30">' +
          '<span style="display:flex;gap:6px"><button class="cal-btn ico" data-lref="' + esc(l.id) + '" title="Update now"' + (LBUSY ? ' disabled' : '') + '>&#8635;</button><button class="cal-btn dng ico" data-lrm="' + esc(l.id) + '" title="Unlink">&times;</button></span></div>' +
          (lpick === l.id ? '<div class="cal-swatches" style="margin:6px 0 0 34px">' + COLORS.map(function (k) { return '<button class="cal-sw' + (k === l.color ? ' on' : '') + '" data-lcol="' + k + '" style="background:' + k + '"></button>'; }).join('') + '</div>' : '') +
          '<div class="cal-lst">' + linkStatus(l) + '</div></div>';
      }).join('') || '<div class="cal-empty">No linked calendars yet.</div>';
      if (foc) { var fi = box.querySelector('[data-lname="' + foc + '"]'); if (fi) { fi.focus(); fi.setSelectionRange(fi.value.length, fi.value.length); } }
    };
    var lpick = null;
    paintLinks();
    $('#cs-links').addEventListener('input', function (e) { var l = link(e.target.dataset.lname); if (l) { l.name = e.target.value.slice(0, 30) || 'Linked calendar'; save(); } });
    $('#cs-links').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; var d = b.dataset;
      if (d.lpick) { lpick = lpick === d.lpick ? null : d.lpick; paintLinks(); }
      else if (d.lcol) { var l = link(lpick); if (l) { l.color = d.lcol; save(); } lpick = null; paintLinks(); }
      else if (d.lref) refreshLinks(d.lref);
      else if (d.lrm) {
        var l2 = link(d.lrm); if (!l2 || !confirm('Unlink "' + l2.name + '"? Its events disappear from here (nothing changes in Google or Apple).')) return;
        S.links = S.links.filter(function (x) { return x !== l2; }); delete lcache()[l2.id]; lsave(); save(); relink(); paintLinks(); render();
      }
    });
    $('#cs-ladd').onclick = function () {
      var u = linkUrl($('#cs-lurl').value);
      if (!u) { toast('Paste the calendar\'s link: it starts with https:// or webcal://'); $('#cs-lurl').focus(); return; }
      if ((S.links || []).some(function (l) { return l.url === u; })) { toast('That calendar is already linked.'); return; }
      if ((S.links || []).length >= 8) { toast('Up to 8 linked calendars.'); return; }
      var l = { id: 'k' + uid(), url: u, name: linkName(u), color: COLORS[((S.links || []).length + 7) % COLORS.length] };
      S.links = (S.links || []).concat([l]); save(); $('#cs-lurl').value = ''; paintLinks(); refreshLinks(l.id);
    };
    $('#cs-lurl').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('#cs-ladd').click(); } });
    if ($('#cs-ntf')) $('#cs-ntf').onclick = function () {
      var b = this; if (Notification.permission === 'granted') { toast('They are on. To turn them off, use the site settings next to the address bar.'); return; }
      try { Notification.requestPermission().then(function (p) { b.textContent = p === 'granted' ? 'Chromebook notifications are on' : 'Notifications are blocked here'; }); } catch (x) { toast('This page cannot show notifications.'); }
    };
    $('#cs-imp').onclick = function () { $('#cs-file').click(); };
    $('#cs-file').onchange = function () {
      var f = this.files[0]; if (!f) return; var r = new FileReader();
      r.onload = function () {
        try {
          if (/BEGIN:VCALENDAR/i.test(r.result)) { var u0 = snapshot(), n0 = importIcs(r.result); save(); close(); render(); toast(n0 ? 'Brought in ' + n0 + ' event' + (n0 === 1 ? '' : 's') + ' (category "Imported").' : 'No new events in that file.', n0 ? u0 : null); return; }
          var d = JSON.parse(r.result), have = {}, n = 0, undo = snapshot();
          if (!d || !Array.isArray(d.events)) throw 0;
          S.events.forEach(function (e) { have[e.id] = 1; });
          (d.cats || []).forEach(function (c) { if (c && c.id && !S.cats.some(function (k) { return k.id === c.id; })) S.cats.push({ id: String(c.id), name: String(c.name || 'Imported'), color: String(c.color || '#94a3b8') }); });
          d.events.forEach(function (e) { if (e && e.id && e.title && /^\d{4}-\d\d-\d\d$/.test(e.date) && !have[e.id]) { S.events.push(e); n++; } });
          save(); close(); render(); toast('Brought in ' + n + ' event' + (n === 1 ? '' : 's') + '.', undo);
        } catch (e) { toast('That file is not a calendar export.'); }
      };
      r.readAsText(f);
    };
    $('#cs-clr').onclick = function () { if (!confirm('Delete all ' + S.events.length + ' events? You can undo right after.')) return; var undo = snapshot(); S.events = []; save(); close(); render(); toast('Every event deleted.', undo); };
    [].forEach.call(o.querySelectorAll('[data-x]'), function (b) { b.onclick = close; });
    $('[data-ok]').onclick = function () {
      cats.forEach(function (c) { c.name = c.name.trim() || 'Untitled'; });
      var ids = cats.map(function (c) { return c.id; });
      S.events.forEach(function (e) { if (ids.indexOf(e.cat) < 0) e.cat = ids[ids.length - 1]; });   // events of a removed category go to the last one
      S.cats = cats; st.hidden = st.hidden.filter(function (h) { return ids.indexOf(h) >= 0 || /^link:/.test(h); });
      st.weekStart = +$('#cs-ws').value; st.view = $('#cs-view').value; st.weekends = $('#cs-we').checked; st.weekNums = $('#cs-wn').checked;
      st.compact = $('#cs-cp').checked; st.h24 = $('#cs-24').checked; st.holidays = $('#cs-hol').checked;
      st.dayStart = +$('#cs-ds').value; st.evLen = +$('#cs-len').value; st.remind = +$('#cs-rem').value; st.remindAllDay = +$('#cs-rema').value; ui.gridKey = null;
      save(); close(); render(); toast('Settings saved.');
    };
  }

  // ---- input ----
  function shown() { var v = document.getElementById('view-cal'); return v && !v.hidden; }
  document.addEventListener('click', function (e) {
    if (!shown() || !e.target.closest) return;
    if (ov && ov.contains(e.target)) { var c0 = e.target.closest('.cal-ev'); if (c0) openEv(c0.dataset.ev, c0.dataset.st); return; }
    if (ui.noClick) { ui.noClick = false; return; }
    var b = e.target.closest('[data-cal],[data-view],[data-ev],[data-more],[data-cat],[data-month],[data-goday],[data-goto],[data-mini],[data-day]'); if (!b || !document.getElementById('view-cal').contains(b)) return;
    var d = b.dataset;
    if (d.cal === 'prev') move(-1); else if (d.cal === 'next') move(1);
    else if (d.cal === 'today') { ui.cur = todayS(); render(); }
    else if (d.cal === 'new') editor(null, S.set.view === 'month' && ui.cur.slice(0, 7) !== todayS().slice(0, 7) ? ui.cur : todayS());
    else if (d.cal === 'settings') settings();
    else if (d.cal === 'keys') keys();
    else if (d.goday) { ui.cur = d.goday; ui.mini = null; setView('day'); }
    else if (d.goto) { ui.cur = d.goto; ui.mini = null; if (S.set.view === 'agenda' || S.set.view === 'year') S.set.view = 'day'; render(); }
    else if (d.mini) { var m0 = ui.mini || ui.cur.slice(0, 8) + '01', nd = new Date(+m0.slice(0, 4), +m0.slice(5, 7) - 1 + +d.mini, 1); ui.mini = ds(nd.getFullYear(), nd.getMonth(), 1); render(); }
    else if (d.view) setView(d.view);
    else if (d.ev) openEv(d.ev, d.st);
    else if (d.more) dayList(d.more);
    else if (d.cat) { var h = S.set.hidden, i = h.indexOf(d.cat); if (i >= 0) h.splice(i, 1); else h.push(d.cat); save(); render(); }
    else if (d.month) { ui.cur = d.month; setView('month'); }
    else if (d.day) editor(null, d.day);
  });
  document.addEventListener('input', function (e) {
    if (e.target.id !== 'cal-q') return;   // (quick add is read on Enter)
    ui.q = e.target.value.trim();
    if (ui.q && S.set.view !== 'agenda') { ui.back = S.set.view; S.set.view = 'agenda'; }
    else if (!ui.q && ui.back) { S.set.view = ui.back; ui.back = null; }
    render();
  });
  document.addEventListener('keydown', function (e) {
    if (!shown()) return;
    if (e.key === 'Escape') { if (ov) { close(); e.preventDefault(); } else if (e.target.id === 'cal-q') { e.target.value = ''; e.target.dispatchEvent(new Event('input', { bubbles: true })); e.target.blur(); } return; }
    if (ov || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '') || e.target.isContentEditable) return;
    var k = e.key.toLowerCase(), done = true;
    if (k === 'arrowleft' || k === 'k' || k === 'p') move(-1); else if (k === 'arrowright' || k === 'j') move(1);
    else if (k === 't') { ui.cur = todayS(); ui.mini = null; render(); } else if (k === 'n' || k === 'c') editor(null, S.set.view === 'day' ? ui.cur : todayS());
    else if (k === 'd') setView('day'); else if (k === 'q') document.getElementById('cal-qa').focus();
    else if (k === 'g') goTo(); else if (k === '?') keys(); else if (k === 'r') { refreshLinks(true); toast('Checking linked calendars...'); }
    else if (k === 'm') setView('month'); else if (k === 'w') setView('week'); else if (k === 'a') setView('agenda'); else if (k === 'y') setView('year');
    else if (k === '/') document.getElementById('cal-q').focus();
    else done = false;
    if (done) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.target.id !== 'cal-qa' || e.key !== 'Enter') return;
    e.preventDefault(); var v = e.target.value.trim(); if (v) quickAdd(v);
  });
  function goTo() {
    var o = dlg('<div class="cal-dh"><b>Go to a date</b><button class="cal-x" data-x>&times;</button></div><form class="cal-db" id="cal-go"><input type="date" id="cg-d" value="' + ui.cur + '" required></form>' +
      '<div class="cal-df"><span class="cal-sp"></span><button class="cal-btn" data-x>Cancel</button><button class="cal-btn pri" data-ok>Go</button></div>');
    var go = function (ev) { if (ev) ev.preventDefault(); var v = o.querySelector('#cg-d').value; if (v) { close(); ui.cur = v; ui.mini = null; render(); } };
    o.querySelector('#cal-go').onsubmit = go; o.querySelector('[data-ok]').onclick = function () { go(); };
    [].forEach.call(o.querySelectorAll('[data-x]'), function (b) { b.onclick = close; }); setTimeout(function () { o.querySelector('#cg-d').focus(); }, 30);
  }
  function keys() {
    var K = [['C or N', 'New event'], ['Q', 'Quick add (type it in plain words)'], ['D W M A Y', 'Day, week, month, agenda, year'], ['&larr; &rarr;  or  K J', 'Back, forward'],
      ['T', 'Today'], ['G', 'Go to a date'], ['/', 'Search'], ['R', 'Check linked calendars now'], ['Esc', 'Close'], ['?', 'This list']];
    var o = dlg('<div class="cal-dh"><b>Keyboard shortcuts</b><button class="cal-x" data-x>&times;</button></div><div class="cal-db"><div class="cal-keys">' + K.map(function (k) { return '<kbd>' + k[0] + '</kbd><span>' + k[1] + '</span>'; }).join('') + '</div>' +
      '<div class="rdesc">In day and week: drag in an empty spot to add an event, drag an event to move it, drag its bottom edge to change when it ends. In month: drag an event to another day.</div></div>' +
      '<div class="cal-df"><span class="cal-sp"></span><button class="cal-btn pri" data-x>Close</button></div>');
    [].forEach.call(o.querySelectorAll('[data-x]'), function (b) { b.onclick = close; });
  }

  // the hour grid: drag to make, move or stretch (15-minute steps)
  function gridAt(x, y) {   // the day column and minute under the pointer
    var cs = document.querySelectorAll('#view-cal .cal-tg-col'), H = hh();
    for (var i = 0; i < cs.length; i++) { var r = cs[i].getBoundingClientRect(); if (x >= r.left && x < r.right) return { col: cs[i], day: cs[i].dataset.slot, min: Math.max(0, Math.min(1439, (y - r.top) / H * 60)) }; }
    return null;
  }
  function snap(m) { return Math.round(m / 15) * 15; }
  document.addEventListener('pointerdown', function (e) {
    if (!shown() || e.button !== 0 || ov || !e.target.closest) return;
    var col = e.target.closest('#view-cal .cal-tg-col'); if (!col) return;
    var ev = e.target.closest('.cal-tev'), at = gridAt(e.clientX, e.clientY); if (!at) return;
    if (ev) {
      var x = evById(ev.dataset.ev); if (!x) return;   // linked (read-only) events: a click opens them
      ui.g = { mode: e.target.classList.contains('cal-tev-rs') ? 'size' : 'move', el: ev, e: x, st: ev.dataset.st, y0: e.clientY, x0: e.clientX, a: tm(x.time), b: endMin(x), off: at.min - tm(x.time), moved: false };
    } else {
      var sel = document.createElement('div'); sel.className = 'cal-tsel'; col.appendChild(sel);
      ui.g = { mode: 'make', col: col, day: at.day, a0: Math.floor(at.min / 30) * 30, el: sel, y0: e.clientY, moved: false };
      paintSel(ui.g.a0, ui.g.a0 + S.set.evLen);
    }
    e.preventDefault();
  });
  function paintSel(a, b) { var H = hh(), g = ui.g; g.el.style.top = a / 60 * H + 'px'; g.el.style.height = Math.max(H / 4, (b - a) / 60 * H) + 'px'; g.el.textContent = fmtT(mt(a)) + ' - ' + fmtT(mt(b)); g.a = a; g.b = b; }
  document.addEventListener('pointermove', function (e) {
    var g = ui.g; if (!g) return;
    if (!g.moved && Math.abs(e.clientY - g.y0) < 5 && Math.abs(e.clientX - (g.x0 || e.clientX)) < 5) return;
    g.moved = true; var at = gridAt(e.clientX, e.clientY), H = hh();
    if (g.mode === 'make') { if (!at) return; var m = snap(at.min); if (m >= g.a0) paintSel(g.a0, Math.max(g.a0 + 15, m)); else paintSel(m, g.a0 + 30); }
    else if (g.mode === 'size') { var r = g.el.parentNode.getBoundingClientRect(), b = snap(Math.min(1440, (e.clientY - r.top) / H * 60)); g.nb = Math.max(g.a + 15, b); g.el.style.height = (g.nb - g.a) / 60 * H - 2 + 'px'; g.el.classList.add('drag'); }
    else if (at) { var d = g.b - g.a, na = Math.max(0, Math.min(1440 - Math.min(d, 15), snap(at.min - g.off))); g.na = na; g.nd = at.day; if (g.el.parentNode !== at.col) at.col.appendChild(g.el);
      g.el.style.top = na / 60 * H + 'px'; g.el.style.left = '1px'; g.el.style.width = 'calc(100% - 3px)'; g.el.classList.add('drag'); }
  });
  document.addEventListener('pointerup', function () {
    var g = ui.g; if (!g) return; ui.g = null;
    if (g.mode === 'make') { g.el.remove(); ui.noClick = true; setTimeout(function () { ui.noClick = false; }, 0);
      editor(null, g.day, null, { time: mt(g.a), endTime: mt(Math.min(g.b, 1439)) }); return; }
    if (!g.moved) return;   // a plain click: it opens the event
    ui.noClick = true; setTimeout(function () { ui.noClick = false; }, 0);
    var e = g.e, len = g.b - g.a;
    if (g.mode === 'size') change(e, isRep(e) ? g.st : null, { endTime: mt(Math.min(g.nb, 1439)) }, 'Now ends at ' + fmtT(mt(Math.min(g.nb, 1439))) + '.');
    else if (g.na != null) change(e, isRep(e) ? g.st : null, { date: g.nd, time: mt(g.na), endTime: mt(Math.min(g.na + len, 1439)) }, 'Moved "' + e.title + '" to ' + nice(g.nd) + ' at ' + fmtT(mt(g.na)) + '.');
    else render();
  });

  // drag an event onto another day: moves it (a repeating one moves the whole series by the same number of days)
  document.addEventListener('dragstart', function (e) { var c = e.target.closest && e.target.closest('#view-cal .cal-ev'); if (!c) return; ui.drag = { id: c.dataset.ev, st: c.dataset.st }; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', c.dataset.ev); } catch (x) {} });
  document.addEventListener('dragover', function (e) { if (!ui.drag) return; var d = e.target.closest && e.target.closest('#view-cal [data-day]'); [].forEach.call(document.querySelectorAll('#view-cal .drop'), function (x) { if (x !== d) x.classList.remove('drop'); }); if (d) { e.preventDefault(); d.classList.add('drop'); } });
  document.addEventListener('dragend', function () { ui.drag = null; [].forEach.call(document.querySelectorAll('#view-cal .drop'), function (x) { x.classList.remove('drop'); }); });
  document.addEventListener('drop', function (e) {
    var d = ui.drag && e.target.closest && e.target.closest('#view-cal [data-day]'); if (!d) return; e.preventDefault();
    var ev = evById(ui.drag.id), shift = num(d.dataset.day) - num(ui.drag.st); ui.dragSt = ui.drag.st; ui.drag = null; d.classList.remove('drop');
    if (!ev || !shift) return;
    change(ev, isRep(ev) ? ui.dragSt : null, { date: d.dataset.day }, 'Moved "' + ev.title + '" to ' + nice(d.dataset.day) + '.');
  });

  // the tab
  (function () {
    var st0 = showTab;
    showTab = function (which) {
      var r = st0.apply(this, arguments), v = document.getElementById('view-cal'), t = document.getElementById('tab-cal');
      if (!v || !t) return r;
      v.hidden = which !== 'cal'; t.className = 'tab' + (which === 'cal' ? ' on' : '');
      if (which === 'cal') { document.getElementById('view-games').hidden = true; load(); relink(); render(); refreshLinks(false); }
      else close();
      return r;
    };
    setInterval(function () { if (shown() && !document.hidden) refreshLinks(false); }, 60000);
    setInterval(function () { var n = document.querySelector('#view-cal .cal-now'), d = new Date(); if (n && shown()) n.style.top = (d.getHours() * 60 + d.getMinutes()) / 60 * hh() + 'px'; }, 30000);
    var tab = document.getElementById('tab-cal'); if (tab) tab.addEventListener('click', function () { showTab('cal'); });
  })();
  return { get S() { return S; }, parseQuick: parseQuick, quickAdd: quickAdd, applyScope: applyScope, startsOn: startsOn2, remTick: remTick, repText: repText, gcalUrl: gcalUrl, load: load, relink: relink, refreshLinks: refreshLinks, importIcs: importIcs, lcache: lcache, get LIDX() { return LIDX; }, linkUrl: linkUrl, render: render, on: on, holidays: holidays, editor: editor, settings: settings, close: close, setView: setView, move: move, ui: ui };
})();
window.__cal = CAL;
