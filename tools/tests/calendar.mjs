// The Calendar tab's .ics reader, linked calendars, and .ics import/export (launcher/calendar/). No rig needed.
//   NODE_PATH=/opt/node22/lib/node_modules node tools/tests/calendar.mjs      (on a Mac: NODE_PATH=/tmp/hg-tools/node_modules)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const ROOT = process.env.HG_ROOT || new URL('../../', import.meta.url).pathname;
const ICS_TEXT = `BEGIN:VCALENDAR
VERSION:2.0
X-WR-CALNAME:Test Cal
X-WR-TIMEZONE:America/New_York
BEGIN:VEVENT
UID:a1
DTSTART;VALUE=DATE:20261205
DTEND;VALUE=DATE:20261206
SUMMARY:All day one
END:VEVENT
BEGIN:VEVENT
UID:a2
DTSTART;VALUE=DATE:20261210
DTEND;VALUE=DATE:20261213
SUMMARY:Ski trip
END:VEVENT
BEGIN:VEVENT
UID:a3
DTSTART:20261207T150000Z
DTEND:20261207T160000Z
SUMMARY:UTC call
END:VEVENT
BEGIN:VEVENT
UID:a4
DTSTART;TZID=America/Los_Angeles:20261208T090000
DTEND;TZID=America/Los_Angeles:20261208T100000
SUMMARY:West coast\\, meeting
DESCRIPTION:line one\\nline two
LOCATION:Room 5
BEGIN:VALARM
TRIGGER:-PT10M
DESCRIPTION:ALARM-SHOULD-NOT-LEAK
END:VALARM
END:VEVENT
BEGIN:VEVENT
UID:a5
DTSTART;TZID=America/New_York:20261207T080000
DTEND;TZID=America/New_York:20261207T090000
RRULE:FREQ=WEEKLY;BYDAY=MO,WE;COUNT=4
EXDATE;TZID=America/New_York:20261209T080000
SUMMARY:Swim
END:VEVENT
BEGIN:VEVENT
UID:a5
RECURRENCE-ID;TZID=America/New_York:20261214T080000
DTSTART;TZID=America/New_York:20261215T100000
DTEND;TZID=America/New_York:20261215T110000
SUMMARY:Swim (moved)
END:VEVENT
BEGIN:VEVENT
UID:a6
DTSTART;VALUE=DATE:20261208
RRULE:FREQ=MONTHLY;BYDAY=2TU;UNTIL=20270301
SUMMARY:Club
END:VEVENT
BEGIN:VEVENT
UID:a7
DTSTART;VALUE=DATE:20261220
SUMMARY:Cancelled thing
STATUS:CANCELLED
END:VEVENT
BEGIN:VEVENT
UID:a8
DTSTART;VALUE=DATE:20260315
RRULE:FREQ=YEARLY
SUMMARY:Mom bday
END:VEVENT
BEGIN:VEVENT
UID:a9
DTSTART:20261230T200000
DURATION:PT90M
SUMMARY:A very long title that is folded across
  two lines
END:VEVENT
BEGIN:VEVENT
UID:a10
DTSTART;VALUE=DATE:20261201
RRULE:FREQ=WEEKLY
SUMMARY:Weekly simple
END:VEVENT
END:VCALENDAR
`.replace(/\n/g, '\r\n');

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/test.ics') { r.writeHead(200, { 'content-type': 'text/calendar' }); return r.end(ICS_TEXT); }
  if (u === '/notcal.ics') { r.writeHead(200, { 'content-type': 'text/plain' }); return r.end('hello'); }
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, '127.0.0.1');
await new Promise(ok => srv.on('listening', ok));
const base = 'http://127.0.0.1:' + srv.address().port;

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await browser.newContext({ timezoneId: 'America/New_York', viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
await page.goto(base + '/index.html'); await page.waitForFunction(() => window.__cal && window.ICS, null, { timeout: 20000 });

let fails = 0;
const check = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n   got  ' + JSON.stringify(got) + '\n   want ' + JSON.stringify(want))); };

// 1. the reader
const r1 = await page.evaluate(text => {
  const n = ICS.dnum(2026, 10, 28), r = ICS.read(text, { from: n - 400, to: n + 730 }), by = t => r.events.filter(e => e.title === t);
  const pick = e => [e.date, e.end || '', e.time || '', e.endTime || ''].join('|');
  return {
    name: r.name, a1: by('All day one').map(pick), a2: by('Ski trip').map(pick), a3: by('UTC call').map(pick),
    a4: by('West coast, meeting').map(e => pick(e) + '|' + e.loc + '|' + e.notes), alarm: r.events.some(e => /ALARM/.test(e.notes || '')),
    a5: r.events.filter(e => /^Swim/.test(e.title)).map(e => e.title + '|' + pick(e)).sort(),
    a6: by('Club').map(e => e.date), a7: by('Cancelled thing').length, a8: by('Mom bday').map(e => e.date), a9: r.events.filter(e => e.uid === 'a9').map(e => e.title + '|' + pick(e))
  };
}, ICS_TEXT);
check('calendar name', r1.name, 'Test Cal');
check('all-day', r1.a1, ['2026-12-05|||']);
check('multi-day all-day (DTEND exclusive)', r1.a2, ['2026-12-10|2026-12-12||']);
check('UTC time to local', r1.a3, ['2026-12-07||10:00|11:00']);
check('TZID time to local, escapes, location', r1.a4, ['2026-12-08||12:00|13:00|Room 5|line one\nline two']);
check('alarm text not read as the event', r1.alarm, false);
check('weekly BYDAY+COUNT, EXDATE, moved repeat', r1.a5, ['Swim (moved)|2026-12-15||10:00|11:00', 'Swim|2026-12-07||08:00|09:00', 'Swim|2026-12-16||08:00|09:00']);
check('monthly 2nd Tuesday until', r1.a6, ['2026-12-08', '2027-01-12', '2027-02-09']);
check('cancelled skipped', r1.a7, 0);
check('yearly', r1.a8, ['2026-03-15', '2027-03-15', '2028-03-15']);
check('folded line, floating time, DURATION', r1.a9, ['A very long title that is folded across two lines|2026-12-30||20:00|21:30']);

// 2. linking a calendar the browser can read straight away (same origin here)
const r2 = await page.evaluate(async url => {
  document.getElementById('tab-cal').click();
  const C = window.__cal; C.S.links = [{ id: 'kt', url, name: 'Test', color: '#22d3ee' }];
  await C.refreshLinks(true);
  C.ui.cur = '2026-12-01'; C.setView('month');
  const chips = [...document.querySelectorAll('#cal-main .cal-ev')].filter(c => /^Lkt:/.test(c.dataset.ev));
  const swim = chips.find(c => c.textContent.includes('Swim'));
  swim.click(); const dlg = document.querySelector('.cal-ov .cal-dlg'), ro = !!dlg && /read-only/.test(dlg.textContent) && !dlg.querySelector('#ce-title');
  dlg.querySelector('[data-copy]').click();
  const copied = C.S.events.some(e => e.title === 'Swim' && e.date === '2026-12-07' && e.time === '08:00');
  const side = [...document.querySelectorAll('#cal-side .cal-cat')].some(c => c.dataset.cat === 'link:kt');
  document.querySelector('#cal-side [data-cat="link:kt"]').click();
  const hidden = ![...document.querySelectorAll('#cal-main .cal-ev')].some(c => /^Lkt:/.test(c.dataset.ev));
  document.querySelector('#cal-side [data-cat="link:kt"]').click();
  const cache = JSON.parse(localStorage.getItem('hgcal:links') || '{}').kt, synced = JSON.parse(localStorage.getItem('hgq:calendar'));
  return { chips: chips.length, drag: chips.some(c => c.draggable), ro, copied, side, hidden, cached: !!(cache && cache.text && cache.at), notInSave: !JSON.stringify(synced).includes('BEGIN:VCALENDAR'), linkSaved: synced.links.length };
}, base + '/test.ics');
check('linked events show in the month', r2.chips > 8, true);
check('linked events cannot be dragged', r2.drag, false);
check('linked event opens read-only', r2.ro, true);
check('copy to my events', r2.copied, true);
check('linked calendar listed at the side', r2.side, true);
check('hiding a linked calendar', r2.hidden, true);
check('copy kept on this device only', [r2.cached, r2.notInSave, r2.linkSaved], [true, true, 1]);

// 3. through the server: no server support -> a clear message; with it -> works; a page that is not a calendar -> refused
const r3 = await page.evaluate(async ({ text, base }) => {
  const C = window.__cal, L0 = window.HGGrapevine, st = id => C.lcache()[id] || {};
  C.S.links = [{ id: 'kg', url: 'https://calendar.google.com/calendar/ical/x/private-y/basic.ics', name: 'G', color: '#60a5fa' }];
  window.HGGrapevine = Object.assign({}, L0 || {}, { cal: { can: () => false, ics: () => Promise.reject(new Error('server')) } });
  await C.refreshLinks(true); const waiting = st('kg').err;
  let asked = '';
  window.HGGrapevine.cal = { can: () => true, ics: u => { asked = u; return Promise.resolve({ type: 'calIcs', ok: true, text }); } };
  await C.refreshLinks(true); const viaServer = [st('kg').err, !!st('kg').text, asked];
  C.S.links.push({ id: 'kn', url: base + '/notcal.ics', name: 'N', color: '#f87171' });
  await C.refreshLinks('kn'); const notCal = st('kn').err;
  window.HGGrapevine = L0;
  return { waiting, viaServer, notCal, url: [C.linkUrl('webcal://p01-caldav.icloud.com/published/2/abc'), C.linkUrl('hello'), C.linkUrl('http://x.com/a.ics')] };
}, { text: ICS_TEXT, base });
check('no server support yet: says so', r3.waiting, 'Waiting for the Grapevine update that fetches linked calendars.');
check('fetched through the server', r3.viaServer, ['', true, 'https://calendar.google.com/calendar/ical/x/private-y/basic.ics']);
check('a link that is not a calendar', r3.notCal, 'That link is not a calendar link.');
check('links: webcal becomes https, junk refused', r3.url, ['https://p01-caldav.icloud.com/published/2/abc', '', '']);

// 4. importing a .ics file, and exporting ours
const r4 = await page.evaluate(text => {
  const C = window.__cal; C.S.events = [];
  const n = C.importIcs(text), ev = C.S.events, w = ev.find(e => e.title === 'Weekly simple'), y = ev.filter(e => e.title === 'Mom bday');
  const again = C.importIcs(text);
  C.S.events.push({ id: 'x1', title: 'Gym, upstairs', date: '2026-12-02', time: '07:30', endTime: '08:15', rep: 'weekly', skip: ['2026-12-09'], cat: 'other', notes: 'bring\nshoes' });
  const out = ICS.write(C.S.events, C.S.cats), back = ICS.read(out, { from: ICS.dnum(2026, 11, 1), to: ICS.dnum(2026, 11, 31) }).events.filter(e => e.title === 'Gym, upstairs');
  return { n: n > 5, again, weekly: w && [w.rep, w.date, w.cat], yearly: y.length && y[0].rep, swim: ev.filter(e => /^Swim/.test(e.title)).length, cat: C.S.cats.some(c => c.id === 'imp'),
    back: back.map(e => e.date + ' ' + e.time + '-' + e.endTime), notes: back[0] && back[0].notes, long: out.split('\r\n').every(l => l.length <= 75) };
}, ICS_TEXT);
check('import brings events in', r4.n, true);
check('import twice adds nothing', r4.again, 0);
check('a simple weekly repeat stays a repeat', r4.weekly, ['weekly', '2026-12-01', 'imp']);
check('a yearly repeat stays a repeat', r4.yearly, 'yearly');
check('a repeat with changes is written out day by day', r4.swim, 3);
check('"Imported" category made', r4.cat, true);
check('export reads back (repeat, skip, time)', r4.back, ['2026-12-02 07:30-08:15', '2026-12-16 07:30-08:15', '2026-12-23 07:30-08:15', '2026-12-30 07:30-08:15']);
check('export keeps notes and folds long lines', [r4.notes, r4.long], ['bring\nshoes', true]);

// 5. the settings box for linked calendars
const r5 = await page.evaluate(async () => {
  const C = window.__cal; C.S.links = []; C.settings();
  const o = document.querySelector('.cal-ov'); o.querySelector('#cs-lurl').value = location.origin.replace('http:', 'https:') + '/x.ics';
  o.querySelector('#cs-ladd').click(); await new Promise(r => setTimeout(r, 50));
  const rows = o.querySelectorAll('.cal-lrow').length, name = C.S.links[0] && C.S.links[0].name;
  C.close(); return { rows, name, help: true };
});
check('settings: link added from the box', [r5.rows, r5.name], [1, 'Linked calendar']);

// 6. Google / Apple features: custom repeats, this/following/all, quick add, reminders, the hour grid, sharing
const r6 = await page.evaluate(() => {
  const C = window.__cal, days = (e, a, b) => { const out = []; for (let n = ICS.dnum(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8)); ; n++) { const d = ICS.dstr(n); if (d > b) break; if (C.startsOn(e, d)) out.push(d); } return out; };
  const bi = { id: 't-bi', title: 'Bi', date: '2026-11-30', rep: 'custom', rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE', count: 5, cat: 'other' };
  const lastFr = { id: 't-lf', title: 'LF', date: '2026-11-27', rep: 'custom', rrule: 'FREQ=MONTHLY;BYDAY=-1FR', cat: 'other' };
  C.S.events = [];
  const w1 = { id: 't-w1', title: 'Gym', date: '2026-12-01', time: '07:00', endTime: '08:00', rep: 'weekly', cat: 'other' }; C.S.events.push(w1);
  const one = C.applyScope(w1, '2026-12-08', { time: '09:00', endTime: '10:00', rep: 'weekly' }, 'one');
  const w2 = { id: 't-w2', title: 'Piano', date: '2026-12-01', rep: 'weekly', count: 6, cat: 'other' }; C.S.events.push(w2);
  const nx = C.applyScope(w2, '2026-12-15', { title: 'Piano (new teacher)' }, 'next');
  const w3 = { id: 't-w3', title: 'Art', date: '2026-12-01', rep: 'weekly', until: '2026-12-29', cat: 'other' }; C.S.events.push(w3);
  C.applyScope(w3, '2026-12-08', { date: '2026-12-09' }, 'all');
  const qs = ['Math test fri 3pm', "Sam's party Dec 5 at 7:30pm", 'Club every tuesday 3-4pm', 'trip jan 3 - jan 7', 'essay due tomorrow', 'dentist 12/10 at 9:15am'].map(t => {
    const q = C.parseQuick(t, '2026-11-28'); return [q.title, q.date, q.end || '', q.time || '', q.endTime || '', q.rep || '', q.cat || ''].join('|'); });
  const ics = ICS.write([Object.assign({ loc: 'Room 5', rem: [10], url: 'https://x.test/a', time: '16:00', endTime: '17:00' }, bi)], C.S.cats), back = ICS.read(ics, { from: ICS.dnum(2026, 10, 1), to: ICS.dnum(2027, 5, 1) }).events;
  return { bi: days(bi, '2026-11-01', '2027-01-31'), lf: days(lastFr, '2026-12-01', '2027-02-28'), text: C.repText(bi),
    one: [w1.skip, one.date, one.time, one.rep, C.startsOn(w1, '2026-12-08'), C.startsOn(w1, '2026-12-15')],
    next: [w2.until, w2.count, nx.date, nx.count, nx.title, days(w2, '2026-12-01', '2027-03-01').length + days(nx, '2026-12-01', '2027-03-01').length],
    all: [w3.date, w3.until], qs,
    ics: [/RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=5/.test(ics), /LOCATION:Room 5/.test(ics), /TRIGGER:-PT10M/.test(ics), back.length, back[0] && back[0].rem, back[0] && back[0].url],
    gcal: /dates=20261204T150000\/20261204T160000/.test(C.gcalUrl({ title: 'x', date: '2026-12-04', time: '15:00', endTime: '16:00', rep: 'none' })) };
});
check('custom: every 2 weeks on Mon+Wed, 5 times', r6.bi, ['2026-11-30', '2026-12-02', '2026-12-14', '2026-12-16', '2026-12-28']);
check('custom: last Friday of the month', r6.lf, ['2026-12-25', '2027-01-29', '2027-02-26']);
check('custom: said in words', r6.text, 'Every 2 weeks on Mon, Wed, 5 times');
check('change just this one', r6.one, [['2026-12-08'], '2026-12-08', '09:00', 'none', false, true]);
check('change this and following (count splits)', r6.next, ['2026-12-14', 2, '2026-12-15', 4, 'Piano (new teacher)', 6]);
check('change all (moves the series)', r6.all, ['2026-12-02', '2026-12-30']);
check('quick add understands plain words', r6.qs, ['Math test|2026-12-04||15:00|16:00||test', "Sam's party|2026-12-05||19:30|20:30||", 'Club|2026-12-01||15:00|16:00|weekly|meet',
  'trip|2027-01-03|2027-01-07||||', 'essay due|2026-11-29|||||hw', 'dentist|2026-12-10||09:15|10:15||']);
check('export: custom rule, count, place, link, reminder; reads back', r6.ics, [true, true, true, 5, [10], 'https://x.test/a']);
check('add to Google Calendar link', r6.gcal, true);

const r8 = await page.evaluate(async (text) => {
  const C = window.__cal; C.S.events = []; C.importIcs(text);
  const club = C.S.events.find(e => e.title === 'Club');
  // reminders: an event 5 minutes from now with a 10-minute reminder rings once
  const d = new Date(Date.now() + 5 * 60e3), p = n => String(n).padStart(2, '0'), day = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  localStorage.removeItem('hgcal:fired');
  C.S.events.push({ id: 'ring1', title: 'Bus', date: day, time: p(d.getHours()) + ':' + p(d.getMinutes()), rep: 'none', rem: [10], cat: 'other' });
  localStorage.setItem('hgq:calendar', JSON.stringify(C.S));
  C.remTick(); const a = document.querySelectorAll('.cal-ring').length; C.remTick(); const b = document.querySelectorAll('.cal-ring').length;
  document.querySelectorAll('.cal-ring').forEach(x => x.remove());
  return { club: club && [club.rep, club.rrule, club.until], rings: [a, b] };
}, ICS_TEXT);
check('import keeps "2nd Tuesday" as a repeat', r8.club, ['custom', 'FREQ=MONTHLY;BYDAY=2TU', '2027-03-01']);
check('a reminder rings once', r8.rings, [1, 1]);

// the hour grid and the editor, by hand
await page.evaluate(() => { const C = window.__cal; const bt = document.getElementById('boot'); if (bt) bt.remove(); if (typeof showTab === 'function') showTab('cal'); C.S.events = [{ id: 'g1', title: 'Lab', date: '2026-12-02', time: '13:00', endTime: '14:00', rep: 'none', cat: 'other' }, { id: 'g2', title: 'Lunch', date: '2026-12-02', time: '13:30', endTime: '14:30', rep: 'none', cat: 'other' }]; C.ui.cur = '2026-12-02'; C.setView('day'); });
const lay = await page.evaluate(() => [...document.querySelectorAll('#view-cal .cal-tev')].map(e => e.style.width));
check('day view: two at once sit side by side', lay, ['calc(50% - 3px)', 'calc(50% - 3px)']);
const box = await page.evaluate(() => { const c = document.querySelector('#view-cal .cal-tg-col'), b = document.getElementById('cal-tgb'); b.scrollIntoView({ block: 'center' }); b.scrollTop = 9 * 48; const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, top: r.top }; });
await page.mouse.move(box.x, box.top + 10 * 48 + 2); await page.mouse.down(); await page.mouse.move(box.x, box.top + 11 * 48, { steps: 4 }); await page.mouse.move(box.x, box.top + 11.5 * 48, { steps: 4 }); await page.mouse.up();
const made = await page.evaluate(() => { const o = document.querySelector('.cal-ov'); return o ? [o.querySelector('#ce-date').value, o.querySelector('#ce-time').value, o.querySelector('#ce-etime').value] : null; });
check('day view: drag in an empty spot makes an event there', made, ['2026-12-02', '10:00', '11:30']);
const ed = await page.evaluate(async () => {
  const o = document.querySelector('.cal-ov'), $ = s => o.querySelector(s), fire = (el, t) => el.dispatchEvent(new Event(t, { bubbles: true }));
  $('#ce-title').value = 'Tutoring'; $('#ce-rep').value = 'custom'; fire($('#ce-rep'), 'change');
  $('#cr-f').value = 'WEEKLY'; fire($('#cr-f'), 'change'); o.querySelector('[data-wd="MO"]').click(); o.querySelector('[data-wd="TH"]').click();
  $('#ce-ends').value = 'count'; fire($('#ce-ends'), 'change'); $('#ce-count').value = '4'; fire($('#ce-count'), 'input');
  $('#ce-loc').value = 'Library'; const txt = $('#ce-rtxt').textContent;
  $('#ce-addrem').value = '15'; fire($('#ce-addrem'), 'change'); o.querySelectorAll('.cal-sw')[3].click(); $('[data-ok]').click();
  const e = window.__cal.S.events.find(x => x.title === 'Tutoring');
  return [txt, e && e.rrule, e && e.count, e && e.loc, e && e.rem && e.rem.indexOf(15) >= 0, !!(e && e.color)];
});
check('editor: custom repeat, ends after, place, reminder, colour', ed, ['Every week on Mon, Thu, 4 times', 'FREQ=WEEKLY;BYDAY=MO,TH', 4, 'Library', true, true]);
const mv = await page.evaluate(() => { const C = window.__cal; C.ui.cur = '2026-12-02'; C.setView('day'); const el = [...document.querySelectorAll('#view-cal .cal-tev')].find(x => x.textContent.indexOf('Lab') >= 0), r = el.getBoundingClientRect(); return { x: r.left + 10, y: r.top + 10 }; });
await page.mouse.move(mv.x, mv.y); await page.mouse.down(); await page.mouse.move(mv.x, mv.y + 24, { steps: 3 }); await page.mouse.move(mv.x, mv.y + 48, { steps: 3 }); await page.mouse.up();
const moved = await page.evaluate(() => { const e = window.__cal.S.events.find(x => x.id === 'g1'); return [e.time, e.endTime]; });
check('day view: drag an event an hour later', moved, ['14:00', '15:00']);
await page.evaluate(() => { const C = window.__cal; C.setView('week'); C.setView('month'); });

check('no script errors', errs, []);
await page.screenshot({ path: process.env.CAL_SHOT || '/dev/null' }).catch(() => {});
await browser.close(); srv.close();
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
