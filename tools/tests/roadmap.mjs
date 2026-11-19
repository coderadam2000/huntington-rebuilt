import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const local = 'http://localhost:8090/';
const root = new URL('../../', import.meta.url).pathname;
const three = path.join(process.env.HG_TOOLS || '/tmp/hg-tools', 'cdn/package');
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let failures = 0;

async function friendRoom(host, guest) {
  const pages = [host, guest], names = ['Host', 'Guest'];
  for (const [id, page] of pages.entries()) {
    await page.exposeFunction('sendRoomFrame', async (type, to, message) => {
      if (type === 'join') {
        setTimeout(() => host.evaluate(peer => window.testRoomEvent('join', peer), { id: 1, name: names[1], state: 'connected' }).catch(() => {}), 15);
      } else if (type === 'send') {
        const peer = pages[1 - id];
        await peer.evaluate(({ from, payload }) => window.testRoomEvent('message', { id: from }, payload), { from: id, payload: message }).catch(() => {});
      }
    });
    await page.addInitScript(id => {
      window.HGNet = { create() {
        const callbacks = {}, peers = [];
        window.testRoomEvent = (type, ...args) => {
          if (type === 'join') peers.push(args[0]);
          callbacks[type]?.(...args);
        };
        return { on: (type, fn) => { callbacks[type] = fn; }, peers: () => peers,
          host: async () => ({ code: '123456' }),
          join: async () => { await window.sendRoomFrame('join'); return { code: '123456', id }; },
          send: (to, frame) => { window.sendRoomFrame('send', to, frame); },
          close() {} };
      } };
    }, id);
  }
  await host.reload();
  await guest.goto(host.url());
  await host.locator('#mg-host').click();
  await guest.locator('#mg-code').fill('123456');
  await guest.locator('#mg-join').click();
  await host.locator('#mg-people').getByText('Guest', { exact: true }).waitFor();
  await host.locator('#mg-bots').selectOption('0');
  await host.locator('#mg-start').click();
}

async function test(name, file, check, seed = {}) {
  if (process.argv.length > 2 && !process.argv.slice(2).some(prefix => name.startsWith(prefix))) return;
  const context = await browser.newContext({ viewport: { width: 780, height: 660 } });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await page.addInitScript(values => {
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem('hgv:tour', '2');
    localStorage.setItem('lumi_tutOffer', '1');
  }, seed);
  await page.context().route('**/*', route => {
    const url = route.request().url();
    let src;
    if (url === local + 'latest.json') return route.fulfill({ json: { release: 80, nextUpdate: '2026-12-01' } });
    if (url.startsWith(local)) src = path.join(root, decodeURIComponent(new URL(url).pathname));
    else if (url.includes('three@0.160.0/')) src = path.join(three, url.split('three@0.160.0/')[1]);
    else return route.abort();
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg' }[path.extname(src)] || 'application/octet-stream';
    try { return route.fulfill({ contentType: type, body: readFileSync(src) }); }
    catch (_) { return route.fulfill({ status: 404, body: 'Missing fixture' }); }
  });
  try {
    await page.goto(local + file);
    await check(page);
    assert.deepEqual(errors, []);
    console.log('PASS  ' + name);
  } catch (err) {
    failures++;
    console.error('FAIL  ' + name + '\n' + err.stack);
  } finally { await context.close(); }
}

try {
  await test('Launcher clock, schedule, ratings and combined playtime chart', 'index.html', async page => {
    assert.equal(await page.locator('#boot,#gload').count(), 0);
    assert.ok(await page.locator('#hub-clock').textContent());
    assert.match(await page.locator('#hub-update').innerText(), /2026/);
    await page.setViewportSize({width: 320, height: 620});
    assert.ok(await page.locator('#topbar').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
    await page.evaluate(async () => {
      const day = '2026-11-18';
      showTab('act');
      await loadGV().catch(() => {});
      ACT.data = { today: day, since: day, online: 3, perDay: [{d:day,players:3,minutes:150,peak:2}], week: [], month: [], playingNow: [] };
      actPaint();
    });
    assert.match(await page.locator('[aria-label="Hours played per day"]').textContent(), /2.5 hours across all players/);
    await page.evaluate(() => playNow(GAMES.find(g => g.dir === 'Tetris')));
    await page.getByRole('button', { name: 'Like game', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Like game', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => localStorage.getItem('hgq:rate:Tetris')), 'like');
    assert.equal(await page.locator('#gload').count(), 0);
  });

  await test('Last Light unlock, independent LINEAR progress and backward gate', 'Last%20Light/index.html', async page => {
    await page.waitForFunction(() => window.__lumi);
    await page.waitForFunction(() => document.getElementById('t-linear').disabled);
    await page.evaluate(() => {
      const { LEVELS, SAVE } = window.__lumi;
      for (const level of LEVELS.filter(item => item.world <= 4)) SAVE.d.levels[level.id] = { best: 9, moths: [] };
      SAVE.write();
    });
    await page.reload();
    await page.waitForFunction(() => !document.getElementById('t-linear').disabled);
    await page.evaluate(() => document.getElementById('t-linear').click());
    await page.waitForFunction(() => __lumi.G.state === 'play' && __lumi.G.linear);
    await page.evaluate(() => { __lumi.G.time = 4; __lumi.G.finish(); });
    await page.waitForSelector('#d-next');
    assert.equal(await page.locator('#d-prev').isVisible(), false);
    await page.locator('#d-next').click();
    await page.waitForFunction(() => __lumi.G.state === 'play' && __lumi.G.idx === 1);
    await page.evaluate(() => { __lumi.G.time = 5; __lumi.G.finish(); });
    await page.locator('#d-prev').waitFor();
    assert.deepEqual(await page.evaluate(() => [__lumi.SAVE.d.levels['1-1'].best, __lumi.SAVE.d.linear['1-1']]), [9,4]);
  });

  await test('Sovereign loads Interplanetary and saves a captured planet', 'Sovereign/index.html', async page => {
    await page.waitForFunction(() => window.__sov?.ready);
    await page.locator('#title .menu button').filter({hasText: 'Sovereign Interplanetary'}).click();
    await page.getByRole('button', {name:'Earth',exact:true}).click();
    await page.getByRole('button', {name:'Send fleet to Mars',exact:true}).click();
    assert.match(await page.locator('#modal-box').textContent(), /2 \/ 8 worlds/);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('sov.interplanetary')).bodies[3].side), 0);
  }, {'sov.interplanetaryUnlocked':true,'sov.tutOffer':1,'sov.seen15':true});

  await test('Spikes keeps the death tally consistent and auto-respawns', '50%20Levels%20Of%20Spikes%201.2/index.html', async page => {
    await page.locator('#autoRespawn').check();
    await page.evaluate(() => { __spikes.goto(51); __spikes.player().y = 1800; });
    await page.waitForSelector('#deathScreen:not(.hidden)');
    assert.equal(await page.locator('#deathTally').innerText(), await page.locator('#deathDisplay').innerText());
    await page.waitForFunction(() => __spikes.info().gameState === 'PLAYING');
    assert.equal(await page.evaluate(() => __spikes.info().totalDeaths), 1);
  });

  await test('Blocky flash clears without pausing or resuming', 'Blocky%20Shooter%20V2/index.html', async page => {
    await page.waitForFunction(() => window.__blocky && typeof window.screenFlash === 'undefined');
    const initial = await page.evaluate(() => {
      __blocky.start();
      __blocky.flash.screenFlash('rgba(255,255,255,1)');
      return getComputedStyle(document.getElementById('screen-flash')).backgroundColor;
    });
    const alpha = Number(/, ([\d.]+)\)$/.exec(initial)?.[1]);
    assert.ok(alpha > 0 && alpha < 0.18, initial);
    await page.waitForFunction(() => Number(getComputedStyle(document.getElementById('screen-flash')).opacity) === 0);
    const lost = await page.evaluate(() => {
      const renderer = __blocky.state.renderer;
      if (!renderer.getContext().getExtension('WEBGL_lose_context')) return false;
      renderer.forceContextLoss();
      return true;
    });
    if (lost) {
      await page.waitForFunction(() => __blocky.state.renderer.domElement.style.visibility === 'hidden');
      await page.evaluate(() => __blocky.state.renderer.forceContextRestore());
      await page.waitForFunction(() => !__blocky.state.renderer.domElement.style.visibility);
      assert.equal(await page.evaluate(() => __blocky.state.currentGameState), 'playing');
    }
  });

  await test('Element Lab registers the new simulation goals', 'Element%20Lab/index.html', async page => {
    await page.waitForFunction(() => window.__elementlab);
    const ids = await page.evaluate(() => __elementlab.challenges().map(x => x.id));
    for (const id of ['popcorn','cheese','moss','pump','notgate','aquarium']) assert.ok(ids.includes(id));
  });

  await test('Steel Storm duel has two seats, three knockouts and camera switching', 'Steel%20Storm/index.html', async page => {
    await page.waitForFunction(() => window.__steelstorm);
    const cfg = await page.evaluate(() => __steelstorm.startMatch({mode:'duel',map:'ridge',veh:'troop-1'}));
    assert.deepEqual([cfg.players.length,cfg.bots.length,cfg.limit.kills], [1,1,3]);
    await page.keyboard.press('v');
    assert.equal(await page.evaluate(() => __steelstorm.cam.view),1);
    assert.equal(await page.evaluate(() => __steelstorm.me.def.w1.n), 'M1 Garand');
    await page.evaluate(() => __steelstorm.kill(__steelstorm.ents().find(e => e.bot).id));
    assert.equal(await page.evaluate(() => __steelstorm.kills[0]),1);
  });

  await test('Chess legal opening and bot reply, plus Checkers pieces', 'Minigames/Chess%20and%20Checkers/index.html', async page => {
    const counts = await page.evaluate(() => {
      const {boardStart,legalBoard,applyBoard} = __boardgames;
      const chess = boardStart('chess');
      const tally = (state,n) => n ? legalBoard(state).reduce((sum, m) => sum+tally(applyBoard(state,m),n-1),0) : 1;
      return [tally(chess,3),legalBoard(boardStart('checkers')).length];
    });
    assert.deepEqual(counts,[8902,7]);
    await page.locator('#mg-solo').click();
    await page.getByRole('button', {name:'e2 light pawn',exact:true}).click();
    await page.getByRole('button', {name:'e4 empty',exact:true}).click();
    await page.waitForFunction(() => __boardgames.match.state.ply === 2);
  });

  await test('Sports Mix opens all nine activities including both golf styles', 'Sports%20Mix/index.html', async page => {
    assert.equal(await page.locator('#sports button').count(), 9);
    await page.getByRole('button', {name:'Bowling', exact:true}).click();
    await page.getByRole('button', {name:'Roll', exact:true}).click();
    await page.waitForFunction(() => __sportsMix.attempts === 1);
    assert.ok(await page.evaluate(() => __sportsMix.score > 0));
  });

  await test('Zoom offers 12 tracks and drives a 3D bike', 'Minigames/Zoom/index.html', async page => {
    await page.waitForFunction(() => window.__zoomGame);
    assert.equal(await page.locator('#zoom-track optgroup').count(),3);
    assert.equal(await page.locator('#zoom-track option').count(),12);
    await page.locator('#zoom-ride').selectOption('4');
    await page.locator('#mg-solo').click();
    await page.keyboard.down('w');
    await page.waitForFunction(() => __zoomGame.state?.drivers[0].dist > 4);
    await page.keyboard.up('w');
    assert.equal(await page.evaluate(() => __zoomGame.state.drivers[0].ride),4);
  });

  await test('Friend chess receives and validates moves through the lobby', 'Minigames/Chess%20and%20Checkers/index.html', async page => {
    const friend = await page.context().newPage();
    await friendRoom(page, friend);
    await page.getByRole('button', {name:'e2 light pawn',exact:true}).click();
    await page.getByRole('button', {name:'e4 empty',exact:true}).click();
    await friend.getByRole('button', {name:'e7 dark pawn',exact:true}).click();
    await friend.getByRole('button', {name:'e5 empty',exact:true}).click();
    await page.waitForFunction(() => __boardgames.match?.state.ply === 2);
    await friend.close();
  });

  await test('Friend race sends driving controls and receives the host state', 'Minigames/Zoom/index.html', async page => {
    const friend = await page.context().newPage();
    await friendRoom(page, friend);
    await friend.waitForFunction(() => __zoomGame.state?.drivers.length === 2);
    await friend.keyboard.down('w');
    await page.waitForFunction(() => __zoomGame.state?.drivers[1].dist > 4);
    await friend.keyboard.up('w');
    await friend.close();
  });
} finally { await browser.close(); }
process.exitCode = failures ? 1 : 0;
