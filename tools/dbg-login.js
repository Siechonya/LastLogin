/* tools/dbg-login.js — 临时调试：真实点击提交按钮是否触发 submit */
'use strict';
const { launch, newPage, sleep } = require('./browser');
(async () => {
  const b = await launch();
  const p = await newPage(b, 1280, 800);
  p.on('pageerror', e => console.log('PAGEERROR', String(e.message).slice(0, 400)));
  await p.goto('http://127.0.0.1:8765/index.html', { waitUntil: 'load' });
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'load' });
  await sleep(400);
  const n = await p.evaluate(() => LL.intro.cards.length);
  for (let i = 0; i < n; i++) { await p.click('[data-testid="ov-next"]'); await sleep(250); }
  await p.waitForSelector('#lock:not(.hidden)', { timeout: 20000 });
  await p.evaluate(() => {
    window.__submits = 0; window.__clicks = 0;
    document.getElementById('lock-form').addEventListener('submit', () => { window.__submits++; });
    document.querySelector('[data-testid="lock-submit"]').addEventListener('click', () => { window.__clicks++; });
  });
  await p.type('#lock-pass', '0812');
  await p.click('[data-testid="lock-submit"]');
  await sleep(1200);
  console.log('clicks/submits:', await p.evaluate(() => [window.__clicks, window.__submits]));
  console.log('loggedIn:', await p.evaluate(() => State.data.loggedIn));
  console.log('desktop hidden?', await p.evaluate(() => document.getElementById('desktop').classList.contains('hidden')));
  console.log('overlay hidden?', await p.evaluate(() => document.getElementById('overlay').classList.contains('hidden')));
  const box = await p.evaluate(() => {
    const el = document.querySelector('[data-testid="lock-submit"]');
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return { rect: [r.x, r.y, r.width, r.height], topEl: top ? (top.tagName + '.' + top.className + '#' + top.id) : null };
  });
  console.log('button hit-test:', JSON.stringify(box));
  await b.close();
})().catch(e => { console.error('SCRIPT ERR', e.message); process.exit(1); });
