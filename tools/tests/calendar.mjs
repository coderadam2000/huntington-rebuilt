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

check('no script errors', errs, []);
await page.screenshot({ path: process.env.CAL_SHOT || '/dev/null' }).catch(() => {});
await browser.close(); srv.close();
console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
process.exit(fails ? 1 : 0);
