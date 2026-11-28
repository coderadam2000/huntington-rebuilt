// ===== iCalendar (.ics) reading and writing for the Calendar tab (2026-11-28).
// Reads what Google Calendar, iCloud and Outlook publish: events, all-day and multi-day events, time zones (TZID, UTC,
// floating), repeat rules (RRULE: DAILY/WEEKLY/MONTHLY/YEARLY with INTERVAL, COUNT, UNTIL, BYDAY, BYMONTHDAY, BYMONTH),
// RDATE, EXDATE, moved or changed single repeats (RECURRENCE-ID) and cancelled events.
// ICS.read(text, {from, to}) -> { name, events: [{ uid, id, title, date, end?, time?, endTime?, notes?, loc? }] }
//   with every repeat written out as its own event between the day numbers from..to (days since 1970), local time.
// ICS.parse(text) -> the raw VEVENTs (used by the importer to keep simple repeats as repeats).
// ICS.write(events, cats) -> .ics text for the launcher's own events.
var ICS = (function () {
  var WD = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dnum(y, m, d) { return Math.floor(Date.UTC(y, m, d) / 864e5); }      // m is 0-based; overflow is fine
  function dstr(n) { var d = new Date(n * 864e5); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function dow(n) { return (n + 4) % 7; }
  function ymd(n) { var d = new Date(n * 864e5); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() }; }

  // ---- lines ----
  function unesc(v) { return v.replace(/\\[nN]/g, '\n').replace(/\\([,;\\:])/g, '$1'); }
  function lines(text) {
    var out = [], ls = String(text || '').replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
    for (var i = 0; i < ls.length; i++) {
      var l = ls[i]; if (!l) continue;
      var k = 0, q = false; for (; k < l.length; k++) { var c = l[k]; if (c === '"') q = !q; else if ((c === ':') && !q) break; }
      var head = l.slice(0, k), val = l.slice(k + 1), parts = [], cur = '', inq = false;
      for (var j = 0; j < head.length; j++) { var ch = head[j]; if (ch === '"') inq = !inq; if (ch === ';' && !inq) { parts.push(cur); cur = ''; } else cur += ch; }
      parts.push(cur);
      var params = {}; for (j = 1; j < parts.length; j++) { var e = parts[j].indexOf('='); if (e > 0) params[parts[j].slice(0, e).toUpperCase()] = parts[j].slice(e + 1).replace(/^"|"$/g, ''); }
      out.push({ name: parts[0].toUpperCase(), params: params, val: val });
    }
    return out;
  }
  function parse(text) {
    var ls = lines(text), cal = { name: '', tz: '', events: [] }, ev = null, depth = 0;
    for (var i = 0; i < ls.length; i++) {
      var l = ls[i], n = l.name;
      if (n === 'BEGIN') { if (l.val.toUpperCase() === 'VEVENT' && !ev) { ev = { exdate: [], rdate: [] }; depth = 0; } else if (ev) depth++; continue; }
      if (n === 'END') { if (ev) { if (depth) depth--; else { cal.events.push(ev); ev = null; } } continue; }
      if (!ev) { if (n === 'X-WR-CALNAME') cal.name = unesc(l.val); else if (n === 'X-WR-TIMEZONE') cal.tz = l.val.trim(); continue; }
      if (depth) continue;      // inside a VALARM
      if (n === 'SUMMARY') ev.title = unesc(l.val);
      else if (n === 'DESCRIPTION') ev.notes = unesc(l.val);
      else if (n === 'LOCATION') ev.loc = unesc(l.val);
      else if (n === 'UID') ev.uid = l.val;
      else if (n === 'STATUS') ev.status = l.val.toUpperCase();
      else if (n === 'DTSTART' || n === 'DTEND' || n === 'RECURRENCE-ID') ev[n] = l;
      else if (n === 'DURATION') ev.dur = l.val;
      else if (n === 'RRULE') ev.rrule = l.val;
      else if (n === 'EXDATE' || n === 'RDATE') l.val.split(',').forEach(function (v) { ev[n.toLowerCase()].push({ params: l.params, val: v }); });
    }
    return cal;
  }

  // ---- times ----
  var WINTZ = { 'eastern standard time': 'America/New_York', 'central standard time': 'America/Chicago', 'mountain standard time': 'America/Denver',
    'pacific standard time': 'America/Los_Angeles', 'us mountain standard time': 'America/Phoenix', 'alaskan standard time': 'America/Anchorage',
    'hawaiian standard time': 'Pacific/Honolulu', 'gmt standard time': 'Europe/London', 'w. europe standard time': 'Europe/Berlin', 'utc': 'UTC' };
  var fmts = {};
  function zone(tz) {
    if (!tz) return null; tz = String(tz).replace(/^\/+/, '');
    if (WINTZ[tz.toLowerCase()]) tz = WINTZ[tz.toLowerCase()];
    if (fmts[tz] !== undefined) return fmts[tz] ? tz : null;
    try { fmts[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }); }
    catch (e) { fmts[tz] = null; }
    return fmts[tz] ? tz : null;
  }
  function offset(tz, ms) {      // tz's offset from UTC at that moment, in ms
    var p = {}; fmts[tz].formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = +x.value; });
    return Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
  }
  function wallToMs(n, sec, tz) {      // day n at sec seconds past midnight, wall clock in tz (null: this device's own time)
    if (!tz) { var t = ymd(n); return new Date(t.y, t.m, t.d, 0, 0, sec).getTime(); }
    var guess = n * 864e5 + sec * 1000, o1 = offset(tz, guess), u = guess - o1, o2 = offset(tz, u);
    return o2 === o1 ? u : guess - o2;
  }
  function msToWall(ms, tz) { if (!tz) { var d = new Date(ms); return { n: dnum(d.getFullYear(), d.getMonth(), d.getDate()), sec: d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() }; }
    var w = ms + offset(tz, ms); return { n: Math.floor(w / 864e5), sec: Math.floor((w % 864e5) / 1000) }; }
  // a DTSTART-like value -> { n: day in its own zone, sec, allDay, tz } (tz 'UTC', a zone name, or null = floating/local)
  function dt(val, params, defTz) {
    var m = /^(\d{4})(\d\d)(\d\d)(?:T(\d\d)(\d\d)(\d\d)?(Z)?)?/.exec(String(val || '').trim()); if (!m) return null;
    var r = { n: dnum(+m[1], +m[2] - 1, +m[3]), sec: 0, allDay: !m[4] || (params && params.VALUE === 'DATE'), tz: null };
    if (!r.allDay) { r.sec = +m[4] * 3600 + +m[5] * 60 + +(m[6] || 0); r.tz = m[7] ? 'UTC' : zone(params && params.TZID) || zone(defTz) || null; if (r.tz === 'UTC') zone('UTC'); }
    return r;
  }
  function durSec(s) {
    var m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(String(s || '').trim()); if (!m) return 0;
    return (m[1] === '-' ? -1 : 1) * (+(m[2] || 0) * 604800 + +(m[3] || 0) * 86400 + +(m[4] || 0) * 3600 + +(m[5] || 0) * 60 + +(m[6] || 0));
  }

  // ---- repeats: the days (in the event's own zone) an RRULE makes, from start s up to day `to` ----
  function rule(s) { var r = {}; String(s || '').split(';').forEach(function (p) { var k = p.indexOf('='); if (k > 0) r[p.slice(0, k).toUpperCase()] = p.slice(k + 1).toUpperCase(); }); return r; }
  function byday(v) { return v ? v.split(',').map(function (x) { var m = /^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/.exec(x.trim()); return m ? { n: m[1] ? +m[1] : 0, wd: WD.indexOf(m[2]) } : null; }).filter(Boolean) : null; }
  function nums(v) { return v ? v.split(',').map(Number).filter(function (x) { return x && isFinite(x); }) : null; }
  function inMonth(y, m, bd, bmd, dflt) {      // the days of month m (0-based) of year y picked by BYDAY / BYMONTHDAY, else day dflt
    var first = dnum(y, m, 1), len = dnum(y, m + 1, 1) - first, out = [];
    if (bd) bd.forEach(function (b) {
      var all = []; for (var i = 0; i < len; i++) if (dow(first + i) === b.wd) all.push(first + i);
      if (!b.n) out = out.concat(all); else { var pick = b.n > 0 ? all[b.n - 1] : all[all.length + b.n]; if (pick !== undefined) out.push(pick); }
    });
    else if (bmd) bmd.forEach(function (d) { var k = d > 0 ? d : len + d + 1; if (k >= 1 && k <= len) out.push(first + k - 1); });
    else if (dflt <= len) out.push(first + dflt - 1);
    return out.sort(function (a, b) { return a - b; });
  }
  function expand(start, rr, to, untilN) {
    var r = rule(rr), f = r.FREQ, iv = Math.max(1, +r.INTERVAL || 1), count = +r.COUNT || 0, bd = byday(r.BYDAY), bmd = nums(r.BYMONTHDAY), bm = nums(r.BYMONTH);
    var out = [], s = ymd(start), made = 0, guard = 0;
    var push = function (n) { if (n < start) return true; if ((untilN != null && n > untilN) || n > to || (count && made >= count) || out.length > 3000) return false; made++; out.push(n); return true; };
    if (f === 'DAILY') {
      for (var n = start; guard++ < 40000; n += iv) {
        var t = ymd(n); if ((bm && bm.indexOf(t.m + 1) < 0) || (bd && !bd.some(function (b) { return b.wd === dow(n); })) || (bmd && bmd.indexOf(t.d) < 0)) { if (n > to) break; continue; }
        if (!push(n)) break;
      }
    } else if (f === 'WEEKLY') {
      var wkst = WD.indexOf(r.WKST || 'MO'), w0 = start - ((dow(start) - wkst + 7) % 7), days = (bd ? bd.map(function (b) { return b.wd; }) : [dow(start)]).map(function (wd) { return (wd - wkst + 7) % 7; }).sort();
      outer: for (var w = w0; guard++ < 10000; w += 7 * iv) { for (var i = 0; i < days.length; i++) if (!push(w + days[i])) break outer; if (w > to) break; }
    } else if (f === 'MONTHLY') {
      outer2: for (var k = 0; guard++ < 5000; k += iv) { var mi = s.y * 12 + s.m + k, yy = Math.floor(mi / 12), mm = mi % 12; if (bm && bm.indexOf(mm + 1) < 0) continue;
        var ds = inMonth(yy, mm, bd, bmd, s.d); for (var j = 0; j < ds.length; j++) if (!push(ds[j])) break outer2; if (dnum(yy, mm, 1) > to) break; }
    } else if (f === 'YEARLY') {
      outer3: for (var yk = 0; guard++ < 500; yk += iv) { var y = s.y + yk, ms = bm ? bm.map(function (x) { return x - 1; }) : [s.m];
        for (var q = 0; q < ms.length; q++) { var d2 = inMonth(y, ms[q], bd, bmd, s.d); for (var z = 0; z < d2.length; z++) if (!push(d2[z])) break outer3; } if (dnum(y, 0, 1) > to) break; }
    } else out.push(start);
    return out;
  }

  // ---- the events, written out ----
  function read(text, win) {
    var cal = parse(text), from = win.from, to = win.to, out = [], moved = {};
    cal.events.forEach(function (e) { if (e.uid && e['RECURRENCE-ID']) { var r = dt(e['RECURRENCE-ID'].val, e['RECURRENCE-ID'].params, cal.tz); if (r) (moved[e.uid] = moved[e.uid] || {})[r.n] = 1; } });
    cal.events.forEach(function (e, idx) {
      if (!e.DTSTART || e.status === 'CANCELLED') return;
      var st = dt(e.DTSTART.val, e.DTSTART.params, cal.tz); if (!st) return;
      var en = e.DTEND ? dt(e.DTEND.val, e.DTEND.params, cal.tz) : null, dur;
      if (st.allDay) dur = en ? Math.max(1, en.n - st.n) * 86400 : (durSec(e.dur) || 86400);
      else dur = en && !en.allDay ? (wallToMs(en.n, en.sec, en.tz) - wallToMs(st.n, st.sec, st.tz)) / 1000 : durSec(e.dur);
      dur = Math.max(0, Math.min(dur, 366 * 86400));
      var days;
      if (e.rrule && !e['RECURRENCE-ID']) {
        var r = rule(e.rrule), un = null;
        if (r.UNTIL) { var u = dt(r.UNTIL, null, null); if (u) un = u.allDay || st.allDay ? u.n : msToWall(wallToMs(u.n, u.sec, u.tz || st.tz), st.tz).n; }
        days = expand(st.n, e.rrule, to + 1, un);
      } else days = [st.n];
      e.rdate.forEach(function (x) { var d = dt(x.val, x.params, cal.tz); if (d) days.push(d.n); });
      var skip = {}; e.exdate.forEach(function (x) { var d = dt(x.val, x.params, cal.tz); if (d) skip[d.allDay || st.allDay ? d.n : msToWall(wallToMs(d.n, d.sec, d.tz), st.tz).n] = 1; });
      var mv = !e['RECURRENCE-ID'] && e.uid && moved[e.uid] || {}, seen = {}, uid = e.uid || 'ev' + idx;
      days.forEach(function (n) {
        if (skip[n] || mv[n] || seen[n]) return; seen[n] = 1;
        var o = { uid: uid, title: e.title || '(no title)' };
        if (e.notes) o.notes = e.notes.slice(0, 2000); if (e.loc) o.loc = e.loc.slice(0, 300);
        if (st.allDay) { var span = Math.max(1, Math.round(dur / 86400)); o.date = dstr(n); if (span > 1) o.end = dstr(n + span - 1); if (n + span - 1 < from || n > to) return; }
        else {
          var a = wallToMs(n, st.sec, st.tz), b = a + dur * 1000, la = new Date(a), lb = new Date(Math.max(a, b - 1));
          var an = dnum(la.getFullYear(), la.getMonth(), la.getDate()), bn = dnum(lb.getFullYear(), lb.getMonth(), lb.getDate());
          if (bn < from || an > to) return;
          o.date = dstr(an); o.time = pad(la.getHours()) + ':' + pad(la.getMinutes());
          if (dur) { var le = new Date(b); o.endTime = pad(le.getHours()) + ':' + pad(le.getMinutes()); }
          if (bn > an) o.end = dstr(bn);
        }
        o.id = uid + '@' + o.date; out.push(o);
      });
    });
    return { name: cal.name, events: out };
  }

  // ---- writing ----
  function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function fold(l) { var out = []; while (l.length > 74) { out.push(l.slice(0, 74)); l = ' ' + l.slice(74); } out.push(l); return out.join('\r\n'); }
  function d8(s) { return s.replace(/-/g, ''); }
  function write(events, cats) {
    var now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''), L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Taco Games//Calendar//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Taco Games'];
    var RR = { daily: 'FREQ=DAILY', weekdays: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', weekly: 'FREQ=WEEKLY', biweekly: 'FREQ=WEEKLY;INTERVAL=2', monthly: 'FREQ=MONTHLY', yearly: 'FREQ=YEARLY' };
    events.forEach(function (e) {
      var c = (cats || []).filter(function (k) { return k.id === e.cat; })[0];
      L.push('BEGIN:VEVENT', 'UID:' + e.id + '@tacogames', 'DTSTAMP:' + now, 'SUMMARY:' + esc(e.title));
      if (e.time) {
        L.push('DTSTART:' + d8(e.date) + 'T' + e.time.replace(':', '') + '00');
        var endD = e.end || e.date, endT = e.endTime || e.time;
        if (e.endTime || e.end) L.push('DTEND:' + d8(endD) + 'T' + endT.replace(':', '') + '00'); else L.push('DURATION:PT1H');
      } else { L.push('DTSTART;VALUE=DATE:' + d8(e.date), 'DTEND;VALUE=DATE:' + dstr(Math.round(Date.UTC(+(e.end || e.date).slice(0, 4), +(e.end || e.date).slice(5, 7) - 1, +(e.end || e.date).slice(8, 10)) / 864e5) + 1).replace(/-/g, '')); }
      if (e.rep && RR[e.rep]) L.push('RRULE:' + RR[e.rep] + (e.until ? ';UNTIL=' + d8(e.until) + (e.time ? 'T235959' : '') : ''));
      (e.skip || []).forEach(function (s) { L.push(e.time ? 'EXDATE:' + d8(s) + 'T' + e.time.replace(':', '') + '00' : 'EXDATE;VALUE=DATE:' + d8(s)); });
      if (e.notes) L.push('DESCRIPTION:' + esc(e.notes));
      if (c) L.push('CATEGORIES:' + esc(c.name));
      L.push('END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }
  return { read: read, parse: parse, write: write, dt: dt, rule: rule, expand: expand, dnum: dnum, dstr: dstr };
})();
