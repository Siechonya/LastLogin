/* tools/dbg-apps.js — 临时调试：打开应用为何不出现窗口 */
'use strict';
const { launch, newPage, sleep } = require('./browser');
(async () => {
  const b = await launch();
  const p = await newPage(b, 1280, 800);
  p.on('pageerror', e => console.log('PAGEERROR:', String(e.message).slice(0, 500)));
  await p.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'load' });
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'load' });
  await sleep(400);
  const n = await p.evaluate(() => LL.intro.cards.length);
  for (let i = 0; i < n; i++) { await p.click('[data-testid="ov-next"]'); await sleep(250); }
  await p.waitForSelector('#lock:not(.hidden)', { timeout: 20000 });
  await sleep(3200);
  await p.type('#lock-pass', '0812');
  await p.click('[data-testid="lock-submit"]');
  await p.waitForFunction(() => { const d = document.getElementById('desktop'); return d && !d.classList.contains('hidden'); }, { timeout: 15000 });
  await sleep(1500);
  console.log('icons present:', await p.evaluate(() => document.querySelectorAll('.icon').length));
  const r = await p.evaluate(() => {
    try { Apps.files.open(); return 'ok:' + WM.all().length; }
    catch (e) { return 'THROW: ' + String((e && e.stack) || e).slice(0, 600); }
  });
  console.log('direct Apps.files.open():', r);
  await sleep(400);
  console.log('win-files in DOM:', await p.evaluate(() => !!document.querySelector('[data-testid="win-files"]')));
  console.log('ALL ERRORS:');
  p.errors.forEach(e => console.log('  -', e.slice(0, 300)));
  await b.close();
})().catch(e => { console.error('SCRIPT ERR', e.message); process.exit(1); });
