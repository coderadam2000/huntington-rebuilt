// ===== The Calendar tab (2026-11-28). Everything for it lives in launcher/calendar/ (this file + calendar.css).
// Saved in localStorage 'hgq:calendar' (the hgq: prefix makes Grapevine sync it between devices). The old stand-alone
// calendar.html kept its events in 'calendarEvents': those are brought in once, and that key is left alone.
var CAL = (function () {
  var KEY = 'hgq:calendar', OLD = 'calendarEvents';
  var COLORS = ['#60a5fa', '#a78bfa', '#f87171', '#34d399', '#fbbf24', '#fb923c', '#f472b6', '#22d3ee', '#a3e635', '#e879f9', '#94a3b8', '#facc15'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var REPS = { none: 'Does not repeat', daily: 'Every day', weekdays: 'Every weekday (Mon-Fri)', weekly: 'Every week', biweekly: 'Every 2 weeks', monthly: 'Every month', yearly: 'Every year' };
  function defaults() {
    return { v: 1, events: [], cats: [
      { id: 'hw', name: 'Homework', color: '#60a5fa' }, { id: 'test', name: 'Test / Quiz', color: '#fb923c' },
      { id: 'due', name: 'Due date', color: '#f87171' }, { id: 'meet', name: 'Meeting', color: '#a78bfa' },
      { id: 'bday', name: 'Birthday', color: '#fbbf24' }, { id: 'hol', name: 'Holiday', color: '#34d399' },
      { id: 'other', name: 'Other', color: '#94a3b8' }],
      set: { weekStart: 0, weekends: true, weekNums: false, h24: false, holidays: true, compact: false, view: 'month', hidden: [] } };
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
  function span(e) { return e.end && e.end > e.date ? num(e.end) - num(e.date) : 0; }
  function on(day) {   // [{e, start, first}] for everything showing on day, sorted
    var out = [], hid = S.set.hidden, q = ui.q.toLowerCase();
    S.events.forEach(function (e) {
      if (hid.indexOf(e.cat) >= 0) return;
      if (q && (e.title + ' ' + (e.notes || '')).toLowerCase().indexOf(q) < 0) return;
      for (var k = 0, sp = span(e); k <= sp; k++) { var st = str(num(day) - k); if (startsOn(e, st)) { out.push({ e: e, start: st, first: k === 0 }); break; } }
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
    var e = o.e, c = cat(e.cat), t = e.time && o.first ? '<em class="t">' + fmtT(e.time) + '</em>' : '';
    return '<div class="cal-ev' + (isDone(e, o.start) ? ' done' : '') + (o.first ? '' : ' cont') + '" style="--c:' + c.color + '"' + (e.link ? '' : ' draggable="true"') + ' data-ev="' + esc(e.id) + '" data-st="' + o.start + '" title="' + esc(e.title + (e.time ? ' · ' + fmtT(e.time) + (e.endTime ? '-' + fmtT(e.endTime) : '') : '') + ' · ' + c.name + (e.loc ? '\n' + e.loc : '') + (e.notes ? '\n' + e.notes : '')) + '">' +
      (withTime === false ? '' : t) + '<span>' + esc(e.title) + '</span></div>';
  }
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
          '<div class="cal-dn"><b>' + +day.slice(8) + '</b></div>' + (hol ? '<div class="cal-hol" title="' + esc(hol) + '">' + esc(hol) + '</div>' : '') +
          evs.slice(0, max).map(function (o) { return chip(o, day); }).join('') +
          (evs.length > max ? '<div class="cal-more" data-more="' + day + '">+' + (evs.length - max) + ' more</div>' : '') + '</div>';
      }
    }
    return h + '</div>';
  }
  function viewWeek() {
    var c = cols(), w = num(weekStartOf(ui.cur)), t = todayS(), h = '<div class="cal-week" style="grid-template-columns:repeat(' + c.length + ', minmax(0, 1fr))">';
    for (var i = 0; i < 7; i++) {
      var day = str(w + i); if (c.indexOf(dow(day)) < 0) continue;
      var hol = holOf(day);
      h += '<div class="cal-wcol' + (day === t ? ' today' : '') + '" data-day="' + day + '"><h4>' + DOW[dow(day)] + '<b>' + +day.slice(8) + '</b></h4>' + (hol ? '<div class="cal-hol">' + esc(hol) + '</div>' : '') +
        on(day).map(function (o) { var e = o.e; return chip(o, day, false).replace('<span>', '<em class="t">' + (e.time ? fmtT(e.time) + (e.endTime ? ' - ' + fmtT(e.endTime) : '') : 'All day') + '</em><span>'); }).join('') + '</div>';
    }
    return h + '</div>';
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
    if (v === 'week') { var a = weekStartOf(ui.cur), b = str(num(a) + 6); return nice(a, { month: 'short', day: 'numeric' }) + ' - ' + nice(b, { month: 'short', day: 'numeric', year: 'numeric' }); }
    if (v === 'agenda') return ui.q ? 'Search' : 'From ' + nice(ui.cur, { month: 'short', day: 'numeric', year: 'numeric' });
    return MONTHS[m] + ' ' + y;
  }
  function side() {
    var t = num(todayS()), h = '', pins = [], up = [], saveQ = ui.q; ui.q = '';
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
  function render() {
    var box = document.getElementById('view-cal'); if (!box) return;
    if (!S) load();
    if (!ui.cur) ui.cur = todayS();
    var v = S.set.view, views = { month: viewMonth, week: viewWeek, agenda: viewAgenda, year: viewYear };
    var focus = document.activeElement && document.activeElement.id === 'cal-q';
    if (!box.querySelector('.cal-head')) box.innerHTML =
      '<div class="cal-head"><div><h2>Calendar</h2><div class="rdesc">Homework, tests, birthdays, anything. Saved on this device, and synced to your Grapevine account when you are signed in.</div></div></div>' +
      '<div class="cal-bar"><button class="cal-btn ico" data-cal="prev" title="Back (&larr;)">&#8249;</button><div class="cal-title" id="cal-title"></div><button class="cal-btn ico" data-cal="next" title="Forward (&rarr;)">&#8250;</button>' +
      '<button class="cal-btn" data-cal="today">Today</button><div class="cal-seg" id="cal-seg">' + ['month', 'week', 'agenda', 'year'].map(function (k) { return '<button data-view="' + k + '">' + k[0].toUpperCase() + k.slice(1) + '</button>'; }).join('') + '</div>' +
      '<span class="cal-sp"></span><input class="cal-search" id="cal-q" placeholder="Search events  /" autocomplete="off"><button class="cal-btn ico" data-cal="settings" title="Settings">&#9881;</button><button class="cal-btn pri" data-cal="new">+ New event</button></div>' +
      '<div class="cal-wrap"><div class="cal-main" id="cal-main"></div><div id="cal-side"></div></div>';
    document.getElementById('cal-title').textContent = title();
    [].forEach.call(box.querySelectorAll('#cal-seg button'), function (b) { b.className = b.dataset.view === v ? 'on' : ''; });
    var main = document.getElementById('cal-main');
    main.className = 'cal-main' + (S.set.compact ? ' cal-compact' : '');
    main.innerHTML = (views[v] || viewMonth)();
    document.getElementById('cal-side').innerHTML = side();
    if (focus) document.getElementById('cal-q').focus();
  }
  function move(dir) {
    var v = S.set.view, y = +ui.cur.slice(0, 4), m = +ui.cur.slice(5, 7) - 1;
    if (v === 'month') { var nd = new Date(y, m + dir, 1); ui.cur = ds(nd.getFullYear(), nd.getMonth(), 1); }
    else if (v === 'year') ui.cur = (y + dir) + '-01-01';
    else ui.cur = str(num(ui.cur) + dir * (v === 'week' ? 7 : 30));
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

  function editor(id, day, st) {
    var e = id ? evById(id) : null, isNew = !e;
    if (!e) e = { title: '', date: day || ui.cur || todayS(), cat: (S.cats.filter(function (c) { return S.set.hidden.indexOf(c.id) < 0; })[0] || S.cats[0]).id, rep: 'none' };
    var rep = e.rep && e.rep !== 'none';
    var o = dlg('<div class="cal-dh"><div><b>' + (isNew ? 'New event' : 'Edit event') + '</b>' + (!isNew && rep && st ? '<div class="rdesc">This one: ' + nice(st, { weekday: 'long', month: 'short', day: 'numeric' }) + '</div>' : '') + '</div><button class="cal-x" data-x>&times;</button></div>' +
      '<form class="cal-db" id="cal-form">' +
      '<label class="cal-f">Title<input id="ce-title" required maxlength="120" placeholder="Math test, Sam\'s birthday..." value="' + esc(e.title) + '"></label>' +
      '<div class="cal-row2"><label class="cal-f">Date<input type="date" id="ce-date" required value="' + e.date + '"></label><label class="cal-f">Ends (for more than one day)<input type="date" id="ce-end" value="' + (e.end || '') + '"></label></div>' +
      '<label class="cal-chk"><input type="checkbox" id="ce-allday"' + (e.time ? '' : ' checked') + '> All day</label>' +
      '<div class="cal-row2" id="ce-times"' + (e.time ? '' : ' hidden') + '><label class="cal-f">Starts<input type="time" id="ce-time" value="' + (e.time || '') + '"></label><label class="cal-f">Ends<input type="time" id="ce-etime" value="' + (e.endTime || '') + '"></label></div>' +
      '<div class="cal-row2"><label class="cal-f">Category<select id="ce-cat">' + S.cats.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === e.cat ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></label>' +
      '<label class="cal-f">Repeats<select id="ce-rep">' + Object.keys(REPS).map(function (k) { return '<option value="' + k + '"' + ((e.rep || 'none') === k ? ' selected' : '') + '>' + REPS[k] + '</option>'; }).join('') + '</select></label></div>' +
      '<label class="cal-f" id="ce-untilw"' + (rep ? '' : ' hidden') + '>Stop repeating after (optional)<input type="date" id="ce-until" value="' + (e.until || '') + '"></label>' +
      '<label class="cal-f">Notes<textarea id="ce-notes" maxlength="2000" placeholder="Pages, room, what to bring...">' + esc(e.notes || '') + '</textarea></label>' +
      '<label class="cal-chk"><input type="checkbox" id="ce-pin"' + (e.pin ? ' checked' : '') + '> Show a countdown to it at the side</label>' +
      (isNew ? '' : '<label class="cal-chk"><input type="checkbox" id="ce-done"' + (isDone(e, st || e.date) ? ' checked' : '') + '> Done' + (rep ? ' (this one)' : '') + '</label>') +
      '<button type="submit" hidden></button></form>' +
      '<div class="cal-df">' + (isNew ? '' : '<button class="cal-btn dng" data-del>' + (rep ? 'Delete all' : 'Delete') + '</button>' + (rep && st ? '<button class="cal-btn dng" data-del1>Delete this one</button>' : '') + '<button class="cal-btn" data-dup>Duplicate</button>') +
      '<span class="cal-sp"></span><button class="cal-btn" data-x>Cancel</button><button class="cal-btn pri" data-ok>' + (isNew ? 'Add' : 'Save') + '</button></div>', true);
    var $ = function (s) { return o.querySelector(s); };
    $('#ce-allday').onchange = function () { $('#ce-times').hidden = this.checked; };
    $('#ce-rep').onchange = function () { $('#ce-untilw').hidden = this.value === 'none'; };
    function commit(asNew) {
      var t = $('#ce-title').value.trim(), d = $('#ce-date').value;
      if (!t) { $('#ce-title').focus(); return; } if (!d) { $('#ce-date').focus(); return; }
      var undo = snapshot(), x = asNew || isNew ? { id: uid() } : e, end = $('#ce-end').value, allDay = $('#ce-allday').checked;
      x.title = t; x.date = d; x.end = end && end > d ? end : undefined;
      x.time = allDay ? undefined : $('#ce-time').value || undefined; x.endTime = x.time ? $('#ce-etime').value || undefined : undefined;
      x.cat = $('#ce-cat').value; x.rep = $('#ce-rep').value; x.until = x.rep !== 'none' && $('#ce-until').value ? $('#ce-until').value : undefined;
      x.notes = $('#ce-notes').value.trim() || undefined; x.pin = $('#ce-pin').checked || undefined;
      if (asNew) { x.done = undefined; x.skip = undefined; }
      else if ($('#ce-done')) { var k = st || x.date, dn = (x.done || []).filter(function (q) { return q !== k; }); if ($('#ce-done').checked) dn.push(k); x.done = dn.length ? dn : undefined; }
      if (asNew || isNew) S.events.push(x);
      save(); close(); ui.cur = S.set.view === 'month' && x.date.slice(0, 7) !== ui.cur.slice(0, 7) ? x.date.slice(0, 8) + '01' : ui.cur; render();
      toast(asNew ? 'Copied.' : isNew ? 'Added "' + t + '".' : 'Saved.', undo);
    }
    $('#cal-form').onsubmit = function (ev) { ev.preventDefault(); commit(false); };
    $('[data-ok]').onclick = function () { commit(false); };
    [].forEach.call(o.querySelectorAll('[data-x]'), function (b) { b.onclick = close; });
    if (!isNew) {
      $('[data-del]').onclick = function () { var undo = snapshot(); S.events = S.events.filter(function (q) { return q !== e; }); save(); close(); render(); toast('Deleted "' + e.title + '".', undo); };
      if ($('[data-del1]')) $('[data-del1]').onclick = function () { var undo = snapshot(); e.skip = (e.skip || []).concat([st]); save(); close(); render(); toast('Deleted that one.', undo); };
      $('[data-dup]').onclick = function () { commit(true); };
    }
    setTimeout(function () { var i = $('#ce-title'); if (i) { i.focus(); i.select(); } }, 30);
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
    var t = num(todayS()), raw = ICS.parse(text), got = ICS.read(text, { from: t - 400, to: t + 730 }), byUid = {}, fancy = {}, simple = {}, have = {}, n = 0;
    got.events.forEach(function (e) { (byUid[e.uid] = byUid[e.uid] || []).push(e); });
    raw.events.forEach(function (v) {
      if (!v.uid || !v.rrule) return;
      if (v['RECURRENCE-ID'] || v.exdate.length || v.rdate.length) { fancy[v.uid] = 1; return; }
      var r = ICS.rule(v.rrule), keys = Object.keys(r).filter(function (k) { return k !== 'FREQ' && k !== 'INTERVAL' && k !== 'UNTIL' && k !== 'WKST' && k !== 'BYDAY'; }), iv = +r.INTERVAL || 1, k = null;
      if (!keys.length) {
        if (r.FREQ === 'DAILY' && iv === 1 && !r.BYDAY) k = 'daily';
        else if (r.FREQ === 'WEEKLY' && r.BYDAY === 'MO,TU,WE,TH,FR' && iv === 1) k = 'weekdays';
        else if (r.FREQ === 'WEEKLY' && (!r.BYDAY || r.BYDAY.indexOf(',') < 0)) k = iv === 1 ? 'weekly' : iv === 2 ? 'biweekly' : null;
        else if (r.FREQ === 'MONTHLY' && iv === 1 && !r.BYDAY) k = 'monthly';
        else if (r.FREQ === 'YEARLY' && iv === 1 && !r.BYDAY) k = 'yearly';
      }
      if (k) { var u = r.UNTIL ? ICS.dt(r.UNTIL) : null; simple[v.uid] = { rep: k, until: u ? ICS.dstr(u.n) : undefined }; }
    });
    var ic = S.cats.filter(function (c) { return c.id === 'imp'; })[0];
    if (!ic) S.cats.push({ id: 'imp', name: 'Imported', color: '#22d3ee' });
    S.events.forEach(function (e) { have[e.id] = 1; });
    Object.keys(byUid).forEach(function (u) {
      var list = byUid[u], rp = simple[u] && !fancy[u] ? simple[u] : null;
      (rp ? list.slice(0, 1) : list).forEach(function (e) {
        var id = 'ics:' + (rp ? u : e.id); if (have[id] || n >= 1500) return; have[id] = 1; n++;
        S.events.push({ id: id, title: String(e.title).slice(0, 120), date: e.date, end: e.end, time: e.time, endTime: e.endTime, cat: 'imp', rep: rp ? rp.rep : 'none',
          until: rp ? rp.until : undefined, notes: [e.loc, e.notes].filter(Boolean).join('\n').slice(0, 2000) || undefined });
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
      (e.notes ? '<div><div class="cal-sec">Notes</div><div style="white-space:pre-wrap;font-size:13px;max-height:220px;overflow:auto">' + esc(e.notes) + '</div></div>' : '') + '</div>' +
      '<div class="cal-df"><button class="cal-btn" data-copy title="Make your own copy you can change">Copy to my events</button><span class="cal-sp"></span><button class="cal-btn pri" data-x>Close</button></div>');
    [].forEach.call(o.querySelectorAll('[data-x]'), function (b) { b.onclick = close; });
    o.querySelector('[data-copy]').onclick = function () {
      var undo = snapshot();
      S.events.push({ id: uid(), title: e.title, date: e.date, end: e.end, time: e.time, endTime: e.endTime, cat: (S.cats.filter(function (c) { return c.id === 'other'; })[0] || S.cats[S.cats.length - 1]).id, rep: 'none', notes: [e.loc, e.notes].filter(Boolean).join('\n').slice(0, 2000) || undefined });
      save(); close(); render(); toast('Copied to your events.', undo);
    };
  }
  function settings() {
    var st = S.set, cats = JSON.parse(JSON.stringify(S.cats));
    var o = dlg('<div class="cal-dh"><b>Calendar settings</b><button class="cal-x" data-x>&times;</button></div><div class="cal-db">' +
      '<div class="cal-sec">Layout</div>' +
      '<div class="cal-row2"><label class="cal-f">Week starts on<select id="cs-ws"><option value="0">Sunday</option><option value="1"' + (st.weekStart === 1 ? ' selected' : '') + '>Monday</option></select></label>' +
      '<label class="cal-f">Opens in<select id="cs-view">' + ['month', 'week', 'agenda', 'year'].map(function (k) { return '<option' + (st.view === k ? ' selected' : '') + '>' + k + '</option>'; }).join('') + '</select></label></div>' +
      '<label class="cal-chk"><input type="checkbox" id="cs-we"' + (st.weekends ? ' checked' : '') + '> Show weekends</label>' +
      '<label class="cal-chk"><input type="checkbox" id="cs-wn"' + (st.weekNums ? ' checked' : '') + '> Show week numbers</label>' +
      '<label class="cal-chk"><input type="checkbox" id="cs-cp"' + (st.compact ? ' checked' : '') + '> Compact days</label>' +
      '<label class="cal-chk"><input type="checkbox" id="cs-24"' + (st.h24 ? ' checked' : '') + '> 24-hour time</label>' +
      '<label class="cal-chk"><input type="checkbox" id="cs-hol"' + (st.holidays ? ' checked' : '') + '> Show holidays</label>' +
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
      save(); close(); render(); toast('Settings saved.');
    };
  }

  // ---- input ----
  function shown() { var v = document.getElementById('view-cal'); return v && !v.hidden; }
  document.addEventListener('click', function (e) {
    if (!shown() || !e.target.closest) return;
    if (ov && ov.contains(e.target)) { var c0 = e.target.closest('.cal-ev'); if (c0) openEv(c0.dataset.ev, c0.dataset.st); return; }
    var b = e.target.closest('[data-cal],[data-view],[data-ev],[data-more],[data-cat],[data-month],[data-day]'); if (!b || !document.getElementById('view-cal').contains(b)) return;
    var d = b.dataset;
    if (d.cal === 'prev') move(-1); else if (d.cal === 'next') move(1);
    else if (d.cal === 'today') { ui.cur = todayS(); render(); }
    else if (d.cal === 'new') editor(null, S.set.view === 'month' && ui.cur.slice(0, 7) !== todayS().slice(0, 7) ? ui.cur : todayS());
    else if (d.cal === 'settings') settings();
    else if (d.view) setView(d.view);
    else if (d.ev) openEv(d.ev, d.st);
    else if (d.more) dayList(d.more);
    else if (d.cat) { var h = S.set.hidden, i = h.indexOf(d.cat); if (i >= 0) h.splice(i, 1); else h.push(d.cat); save(); render(); }
    else if (d.month) { ui.cur = d.month; setView('month'); }
    else if (d.day) editor(null, d.day);
  });
  document.addEventListener('input', function (e) {
    if (e.target.id !== 'cal-q') return;
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
    if (k === 'arrowleft') move(-1); else if (k === 'arrowright') move(1);
    else if (k === 't') { ui.cur = todayS(); render(); } else if (k === 'n') editor(null, todayS());
    else if (k === 'm') setView('month'); else if (k === 'w') setView('week'); else if (k === 'a') setView('agenda'); else if (k === 'y') setView('year');
    else if (k === '/') document.getElementById('cal-q').focus();
    else done = false;
    if (done) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  // drag an event onto another day: moves it (a repeating one moves the whole series by the same number of days)
  document.addEventListener('dragstart', function (e) { var c = e.target.closest && e.target.closest('#view-cal .cal-ev'); if (!c) return; ui.drag = { id: c.dataset.ev, st: c.dataset.st }; e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', c.dataset.ev); } catch (x) {} });
  document.addEventListener('dragover', function (e) { if (!ui.drag) return; var d = e.target.closest && e.target.closest('#view-cal [data-day]'); [].forEach.call(document.querySelectorAll('#view-cal .drop'), function (x) { if (x !== d) x.classList.remove('drop'); }); if (d) { e.preventDefault(); d.classList.add('drop'); } });
  document.addEventListener('dragend', function () { ui.drag = null; [].forEach.call(document.querySelectorAll('#view-cal .drop'), function (x) { x.classList.remove('drop'); }); });
  document.addEventListener('drop', function (e) {
    var d = ui.drag && e.target.closest && e.target.closest('#view-cal [data-day]'); if (!d) return; e.preventDefault();
    var ev = evById(ui.drag.id), shift = num(d.dataset.day) - num(ui.drag.st); ui.drag = null; d.classList.remove('drop');
    if (!ev || !shift) return;
    var undo = snapshot(), mv = function (s) { return s ? str(num(s) + shift) : s; };
    ev.date = mv(ev.date); ev.end = mv(ev.end); ev.until = mv(ev.until);
    if (ev.done) ev.done = ev.done.map(mv); if (ev.skip) ev.skip = ev.skip.map(mv);
    save(); render(); toast('Moved "' + ev.title + '" to ' + nice(d.dataset.day) + (ev.rep && ev.rep !== 'none' ? ' (whole series)' : '') + '.', undo);
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
    var tab = document.getElementById('tab-cal'); if (tab) tab.addEventListener('click', function () { showTab('cal'); });
  })();
  return { get S() { return S; }, load: load, relink: relink, refreshLinks: refreshLinks, importIcs: importIcs, lcache: lcache, get LIDX() { return LIDX; }, linkUrl: linkUrl, render: render, on: on, holidays: holidays, editor: editor, settings: settings, close: close, setView: setView, move: move, ui: ui };
})();
window.__cal = CAL;
