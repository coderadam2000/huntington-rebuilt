// Calendar UI and cloud-save protocol with two isolated devices and an in-memory relay.
import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const origin = 'http://localhost:8090';
const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
const entry = read('index.html');
const app = read('launcher/runtime.html');
const accounts = new Map();
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const serverPub = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex');
const signature = message => sign(null, Buffer.from(message), privateKey).toString('hex');
const hash = value => createHash('sha256').update(value).digest('hex');

// Replace the transport at the script boundary. Account sign-in, storage, and sync use the built launcher code.
function connect(peer) {
  const listeners = {};
  const conn = {
    peer, pid: 'calendar-test-device', open: true,
    on(type, fn) { listeners[type] = fn; },
    close() { this.open = false; },
    async send(frame) {
      const reply = await window.calendarTestRelay(frame);
      if (reply && this.open) listeners.data(reply);
    }
  };
  queueMicrotask(async () => {
    listeners.open();
    listeners.data(await window.calendarTestRelay({ type: 'challenge' }));
  });
  return conn;
}
const accountScript = read('gv/account.js').replace('// Grapevine - core.', 'GVLink.connect = ' + connect.toString() + ';\n// Grapevine - core.');

async function device(browser, options = {}) {
  const page = await browser.newPage({ locale: 'en-US', timezoneId: 'America/New_York', ...options });
  page.setDefaultTimeout(5000);
  await page.clock.install({ time: new Date('2026-01-31T18:00:00Z') });
  await page.addInitScript(() => {
    window.HG_GV_CONFIG = { archives: ['calendar-test'], pinned: {} };
    localStorage.setItem('hgv:tour', '2');
  });
  let userId = '';
  await page.exposeFunction('calendarTestRelay', frame => {
    if (frame.type === 'challenge') return { type: 'challenge', nonce: 'test', serverPub, sig: signature('gv-challenge|test|calendar-test-device') };
    if (frame.type === 'hello') {
      userId = frame.userId;
      if (!accounts.has(userId)) accounts.set(userId, new Map());
      return {
        type: 'welcome', userId, displayName: 'Calendar Test', serverPub,
        sig: signature('gv-welcome|' + frame.cnonce + '|calendar-test-device|' + userId)
      };
    }
    const saves = accounts.get(userId);
    if (frame.type === 'savesList') return { type: 'saves', items: Array.from(saves.values()) };
    if (frame.type === 'savesGet') return { type: 'savesData', items: frame.keys.map(k => saves.get(k)).filter(Boolean) };
    if (frame.type === 'savesPut') {
      for (const { k, v, at } of frame.items) saves.set(k, { k, v, at, h: hash(v) });
      return { type: 'ok', op: 'savesPut', stored: frame.items.length };
    }
    return null;
  });
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url === origin + '/index.html') return route.fulfill({ contentType: 'text/html', body: entry });
    if (url === origin + '/launcher/runtime.html') return route.fulfill({ contentType: 'text/html', body: app });
    if (url === origin + '/gv/account.js') return route.fulfill({ contentType: 'application/javascript', body: accountScript });
    return route.abort();
  });
  await page.goto(origin + '/index.html');
  return page;
}

async function sync(page) {
  await page.evaluate(() => HGGrapevine.sync.run());
}

async function signIn(page, key) {
  await page.waitForFunction(() => window.HGGrapevine);
  await page.evaluate(key => HGGrapevine.signIn(key), key);
  await sync(page);
}

async function addEvent(page, title, time) {
  await page.locator('#cal-add').click();
  await page.locator('#cal-title').fill(title);
  await page.locator('#cal-time').fill(time);
  await page.getByRole('button', { name: 'Save event' }).click();
  await page.locator('#cal-dialog').waitFor({ state: 'hidden' });
}

const browser = await chromium.launch({ executablePath: process.env.RIG_CHROME || undefined });
try {
  const a = await device(browser);
  await a.evaluate(() => localStorage.setItem('calendarEvents', JSON.stringify({
    '2026-01-31': [{ id: 'old', title: 'Existing birthday', type: 'Birthday' }]
  })));
  await a.getByRole('button', { name: 'Calendar', exact: true }).click();
  assert.match(await a.locator('#cal-events').innerText(), /Existing birthday\s+All day · Birthday/);
  await a.getByRole('button', { name: 'Next month' }).click();
  assert.equal(await a.locator('#cal-month').innerText(), 'February 2026');
  await a.getByRole('button', { name: 'Today', exact: true }).click();
  await addEvent(a, 'Morning meeting', '09:15');
  assert.match(await a.locator('#cal-events').innerText(), /Morning meeting\s+9:15 AM/);
  console.log('PASS  local events, date navigation at month end, and timed entries');

  const key = 'test-calendar-account-recovery-key-2026';
  await signIn(a, key);
  await a.getByRole('button', { name: 'Import local events' }).click();
  await sync(a);
  const b = await device(browser, { viewport: { width: 375, height: 760 }, timezoneId: 'America/Los_Angeles' });
  await b.getByRole('button', { name: 'Calendar', exact: true }).click();
  await signIn(b, key);
  assert.match(await b.locator('#cal-events').innerText(), /Existing birthday[\s\S]*Morning meeting\s+9:15 AM/);
  await b.evaluate(() => {
    const uid = HGGrapevine.me().userId;
    localStorage.setItem('gv:set:' + uid, JSON.stringify({ base: 'light', flavor: 'ocean', accent: '#17634a' }));
    applyGvTheme();
  });
  assert.equal(await b.locator('#cal-add').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(23, 99, 74)');
  assert.equal(await b.locator('#cal-dialog').evaluate(el => getComputedStyle(el).colorScheme), 'light');
  assert.ok(await b.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  console.log('PASS  second device gets legacy and timed entries, with its chosen theme on mobile');

  await addEvent(a, 'From device A', '10:00');
  await sync(a);
  await addEvent(b, 'From device B', '11:00');
  await sync(b);
  await sync(a);
  assert.match(await a.locator('#cal-events').innerText(), /From device A[\s\S]*From device B/);
  await b.locator('#cal-events').getByRole('button', { name: /Morning meeting/ }).click();
  await b.locator('#cal-time').fill('08:30');
  await b.getByRole('button', { name: 'Save event' }).click();
  await sync(b);
  await sync(a);
  assert.match(await a.locator('#cal-events').innerText(), /Morning meeting\s+8:30 AM/);
  await b.locator('#cal-events').getByRole('button', { name: /Morning meeting/ }).click();
  await b.getByRole('button', { name: 'Delete', exact: true }).click();
  await sync(b);
  await addEvent(a, 'From stale device', '12:00');
  await sync(a);
  assert.doesNotMatch(await a.locator('#cal-events').innerText(), /Morning meeting/);
  await sync(b);
  assert.match(await b.locator('#cal-events').innerText(), /From stale device/);
  console.log('PASS  concurrent additions, time edits, and deletions sync across devices');

  assert.equal((await b.evaluate(() => HGGrapevine.signOut())).saved, true);
  assert.doesNotMatch(await b.locator('#cal-events').innerText(), /Existing birthday|From device/);
  await signIn(b, 'different-calendar-account-recovery-key');
  assert.equal(await b.locator('#cal-events').innerText(), 'No events scheduled.');
  console.log('PASS  account calendars are isolated after sign-out');
} finally {
  await browser.close();
}
