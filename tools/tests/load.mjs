// How games are fetched when the launcher is NOT on localhost (the real case: jsfiddle/jsbin + the jsDelivr mirrors).
// The hub is served on a fake jsfiddle host and the CDN mirrors are faked from the working tree, so each mirror can be
// made slow, dead or healthy.   NODE_PATH=/opt/node22/lib/node_modules node tools/tests/load.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const HOST = 'https://fiddle.jshell.net/', REPO = 'coderadam2000/huntington-rebuilt', REL = 'r99', GAME = 'Tetris';
let failures = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); if (!ok) failures++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 15000, every = 150) { const t0 = Date.now(); for (;;) { try { const v = await fn(); if (v) return v; } catch {} if (Date.now() - t0 > ms) return null; await sleep(every); } }

const browser = await chromium.launch({ args: ['--no-sandbox'] });
// mode per mirror host: 'ok' | 'dead' (fails at once) | 'hang' (never answers) | a number (answers after that many ms)
async function hub(mirrors, loaderFile, { requireAccount, blockAccount = false, savedAccount = false } = {}) {
  const host = loaderFile === 'loader.html' ? 'https://coderadam2000.github.io/huntington-rebuilt/loader.html' : HOST;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(saved => {
    localStorage.setItem('hg_release', '999');
    localStorage.setItem('hgv:tour', '2');
    if (saved) {
      localStorage.setItem('hgv:key', 'x'.repeat(43));
      localStorage.setItem('hgv:name', 'Returning Player');
    }
  }, savedAccount);
  const page = await ctx.newPage(); page.reqs = []; page.errs = [];
  page.on('pageerror', e => page.errs.push(e.message));
  await page.route('**/*', async r => {
    const u = r.request().url();
    if (u === host) {
      let body = fs.readFileSync(path.join(ROOT, loaderFile || 'index.html'), 'utf8');
      if (!loaderFile) body = body.replace(/<head[^>]*>/i, m => m + `<script>window.HG_VERSION='${REL}';</script>`);
      if (requireAccount !== undefined) body = body.replace(/var HG_REQUIRE_GRAPEVINE = (?:true|false);/, `var HG_REQUIRE_GRAPEVINE = ${requireAccount};`);
      return r.fulfill({ contentType: 'text/html', body });
    }
    const m = /^https:\/\/([a-z]+)\.jsdelivr\.net\/gh\/([^@]+)@([^/]+)\/(.*)$/.exec(u);
    if (m) {
      const [, mirror, repo, ref, filePath] = m;
      if (repo !== REPO || ref !== (loaderFile ? 'main' : REL)) return r.abort();
      const mode = mirrors[mirror] ?? 'ok', file = decodeURIComponent(filePath.split('?')[0]);
      page.reqs.push(mirror + ':' + file);
      if (blockAccount && file === 'gv/account.js') return r.abort();
      if (mode === 'dead') return r.abort();
      if (mode === 'hang') return;                                   // never answered
      if (typeof mode === 'number') await sleep(mode);
      const f = path.join(ROOT, file);
      if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: 'no' });
      return r.fulfill({ contentType: /\.html$/.test(f) ? 'text/html' : /\.js$/.test(f) ? 'text/javascript' : /\.json$/.test(f) ? 'application/json' : 'image/jpeg', body: fs.readFileSync(f) });
    }
    return r.abort();                                                // nothing else exists in this test
  });
  await page.goto(host);
  await until(() => page.evaluate(() => typeof playNow === 'function' && document.querySelectorAll('.game').length > 5));
  return page;
}
const game = p => p.evaluate(d => GAMES.find(g => g.dir === d) && d, GAME);
const playing = p => until(() => p.evaluate(() => { try { return !!(current && current.html) && /<canvas|<body/i.test(current.html) && document.getElementById('frame').contentDocument.readyState === 'complete' && current.html.length; } catch (e) { return 0; } }));
const play = (p, d = GAME) => p.evaluate(d => playNow(GAMES.find(g => g.dir === d)), d);

try {
  console.log('=== Grapevine sign-in setting ===');
  let page = await hub({}, null, { requireAccount: false, blockAccount: true });
  await page.locator('.game[data-dir="Tetris"]').click({ timeout: 5000 });
  check('a new visitor can open Tetris with the account download blocked', !!(await playing(page)));
  await page.context().close();

  page = await hub({}, null, { requireAccount: false, savedAccount: true });
  await page.waitForFunction(() => window.HGGrapevine?.me() && !window.HGGrapevine.online());
  await page.locator('.game[data-dir="Tetris"]').click({ timeout: 5000 });
  check('a returning player can open Tetris while Grapevine is offline', !!(await page.waitForFunction(() => !!current?.html, null, { timeout: 5000 })));
  await page.context().close();

  page = await hub({}, null, { requireAccount: true, blockAccount: true });
  check('re-enabling the requirement shows the sign-in gate on startup', await page.locator('#gate').isVisible());
  await page.context().close();

  console.log('=== Both loaders fetch index.html from the rebuilt repository ===');
  for (const loaderFile of ['loader.html', 'deliverables/loader-to-paste.txt']) {
    const page = await hub({ cdn: 'dead' }, loaderFile);
    check(`${loaderFile} boots from the next mirror on main`, !!(await game(page)) && page.reqs.includes('fastly:index.html'), page.errs.slice(0, 2).join(' | '));
    await play(page);
    check('Tetris opens with a valid launcher token', !!(await until(() => page.evaluate(() => document.getElementById('frame').contentWindow.HG_OK === 1))) && page.reqs.includes('fastly:Tetris/index.html'));
    await page.context().close();
  }

  console.log('=== 1. a healthy network: load, then the saved copy ===');
  let P = await hub({});
  check('the hub runs on the fake jsfiddle host', !!(await game(P)), P.errs.slice(0, 2).join(' | '));
  let t0 = Date.now(); await play(P);
  check('the game loads', !!(await playing(P)), `${Date.now() - t0} ms`);
  await P.evaluate(() => closePlayer()); await sleep(300);
  const before = P.reqs.filter(r => r.endsWith(GAME + '/index.html')).length;
  await play(P); await playing(P);
  check('a second open uses the saved copy (no download)', P.reqs.filter(r => r.endsWith(GAME + '/index.html')).length === before, `${before} request(s)`);
  await P.evaluate(() => closePlayer());

  console.log('\n=== 2. a copy saved from an older release is never run ===');
  await P.evaluate(d => idbPut('game:' + d + '/index.html', { text: '<html><body>OLD RELEASE COPY</body></html>', rel: 'r98', sha: null }).then(() => { delete MEM['game:' + d + '/index.html']; }), GAME);
  await play(P); await playing(P);
  check('the new release is fetched instead', await P.evaluate(() => !/OLD RELEASE COPY/.test(current.html)));
  await P.context().close();

  console.log('\n=== 3. the first mirror hangs: the next one is raced after 3.5 s ===');
  P = await hub({ cdn: 'hang' });
  t0 = Date.now(); await play(P);
  const ok3 = await playing(P), took = Date.now() - t0;
  check('the game still loads', !!ok3, `${took} ms`);
  check('...in a few seconds, not after a 25 s timeout', took < 9000, `${took} ms`);
  await P.evaluate(() => closePlayer());
  const pics = await until(() => P.evaluate(() => { const h = document.querySelector('#ghero .gh-img'); return h && /url\(/.test(h.style.backgroundImage) ? h.style.backgroundImage : null; }), 9000);
  check('the banner and tiles get their pictures from the next mirror too', !!pics && !/\/\/cdn\.jsdelivr/.test(pics), String(pics).slice(0, 80));
  await P.evaluate(() => closePlayer());
  t0 = Date.now(); await P.evaluate(() => { PRE = {}; MEM = {}; return idbDo('readwrite', s => s.clear()); }); await play(P, 'Imposter');
  await until(() => P.evaluate(() => !!(current && current.html)));
  check('the mirror that answered is tried first from then on', Date.now() - t0 < 2500, `${Date.now() - t0} ms`);
  await P.context().close();

  console.log('\n=== 4. no mirror answers: an error with a way out, then it works again ===');
  const net = { cdn: 'dead', fastly: 'dead', gcore: 'dead', testingcf: 'dead' };
  P = await hub(net);
  await play(P);
  const err = await until(() => P.evaluate(() => { const e = document.querySelector('#gload .gl-err'); return e && !e.hidden ? e.innerText : null; }), 25000);
  check('the loading screen says it could not load, with a Try again button', /Could not load/.test(err || '') && /Try again/.test(err || ''), (err || '').replace(/\s+/g, ' ').slice(0, 120));
  net.cdn = 'ok';
  await P.evaluate(() => document.getElementById('gl-retry').click());      // (the sign-in gate covers the page in this bare test)
  check('Try again loads it once the network is back', !!(await playing(P)));
  check('...and the error is gone', await P.evaluate(() => document.querySelector('#gload .gl-err').hidden));
  await P.context().close();

  console.log('\n=== 5. resting on a card starts the download ===');
  P = await hub({ cdn: 300 });
  const n0 = P.reqs.filter(r => r.endsWith('Imposter/index.html')).length;
  await P.evaluate(() => document.querySelector('.game[data-dir="Imposter"]').dispatchEvent(new PointerEvent('pointerenter')));      // (the gate covers the page here, so no real hover)
  check('hovering a card fetches the game', !!(await until(() => P.reqs.filter(r => r.endsWith('Imposter/index.html')).length > n0, 4000)));
  await play(P, 'Imposter'); await until(() => P.evaluate(() => !!(current && current.html)));
  check('...and opening it does not download it twice', P.reqs.filter(r => r.endsWith('Imposter/index.html')).length === n0 + 1, String(P.reqs.filter(r => r.endsWith('Imposter/index.html')).length - n0));
  check('no page errors', P.errs.length === 0, P.errs.slice(0, 2).join(' | '));
} catch (e) { console.log('ERROR', e && e.stack || e); failures++; }
await browser.close();
console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
