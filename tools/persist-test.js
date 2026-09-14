/* tools/persist-test.js — 存档持久化测试：刷新/重开后进度是否保留（file:// 与 http 双协议）
 * 用法：node tools/persist-test.js */
'use strict';
const path = require('path');
const { launch, newPage, sleep, click } = require('./browser');

const BASES = [
  'file:///' + path.join(__dirname, '..', 'index.html').replace(/\\/g, '/'),
  'http://127.0.0.1:8765/index.html'
];

async function runOnce(BASE) {
  const browser = await launch();
  const page = await newPage(browser, 1280, 800);
  const fails = [];
  const must = async (name, fn) => {
    try { await fn(); console.log('  ✓ ' + name); }
    catch (e) { fails.push(name + ': ' + e.message); console.log('  ✗ ' + name + ': ' + e.message); }
  };
  console.log('协议: ' + BASE.slice(0, 30) + (BASE.length > 30 ? '…' : ''));

  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'load' });
  await sleep(400);

  await must('开场→登录', async () => {
    const n = await page.evaluate(() => LL.intro.cards.length);
    for (let i = 0; i < n; i++) { await page.click('[data-testid="ov-next"]'); await sleep(220); }
    await page.waitForSelector('#lock:not(.hidden)', { timeout: 20000 });
    await sleep(3200);
    await page.type('#lock-pass', '0812');
    await page.click('[data-testid="lock-submit"]');
    await page.waitForFunction(() => { const d = document.getElementById('desktop'); return d && !d.classList.contains('hidden'); }, { timeout: 15000 });
    await sleep(800);
  });

  await must('localStorage 可用', async () => {
    const ok = await page.evaluate(() => State.storageOK);
    if (!ok) throw new Error('storageOK=false');
  });

  await must('UI 收藏一条线索（触发自动存档）', async () => {
    await page.evaluate(() => Apps.notes.openRef('note:note-scheduled-msg'));
    await sleep(600);
    await page.click('[data-testid="clue-btn-CL-M3"]');
    await sleep(600);
    const has = await page.evaluate(() => State.hasClue('CL-M3'));
    if (!has) throw new Error('收藏失败');
    const raw = await page.evaluate(() => localStorage.getItem('lastlogin.v1.autosave'));
    if (!raw || raw.indexOf('CL-M3') < 0) throw new Error('autosave 中未见 CL-M3');
  });

  await must('刷新后直接进桌面且进度保留', async () => {
    await page.reload({ waitUntil: 'load' });
    await sleep(900);
    const st = await page.evaluate(() => ({
      desktop: !document.getElementById('desktop').classList.contains('hidden'),
      lock: !document.getElementById('lock').classList.contains('hidden'),
      clue: State.hasClue('CL-M3'),
      logged: State.data.loggedIn
    }));
    if (!st.desktop) throw new Error('刷新后未直接进桌面（lock=' + st.lock + '）');
    if (!st.clue) throw new Error('刷新后线索丢失');
    if (!st.logged) throw new Error('刷新后登录态丢失');
  });

  await must('手动槽位保存→清自动档→读槽恢复', async () => {
    await page.click('[data-testid="start-btn"]'); await sleep(300);
    await page.click('[data-testid="sm-save"]'); await sleep(600);
    await page.click('[data-testid="slot-save-2"]'); await sleep(500);
    const slot = await page.evaluate(() => !!State.slotInfo(2));
    if (!slot) throw new Error('槽位2未写入');
    await page.evaluate(() => { WM.all().forEach(w => WM.close(w)); localStorage.removeItem('lastlogin.v1.autosave'); });
    await page.reload({ waitUntil: 'load' });
    await sleep(700);
    const fresh = await page.evaluate(() => ({ clue: State.hasClue('CL-M3'), logged: State.data.loggedIn }));
    if (fresh.clue) throw new Error('清自动档后应回到新档');
    const loaded = await page.evaluate(() => State.slotLoad(2));
    if (!loaded) throw new Error('slotLoad 失败');
    const after = await page.evaluate(() => State.hasClue('CL-M3'));
    if (!after) throw new Error('读槽后线索未恢复');
  });

  await must('导出存档可用', async () => {
    const json = await page.evaluate(() => State.exportJSON());
    if (!json || json.indexOf('CL-M3') < 0) throw new Error('导出内容缺线索');
  });

  await browser.close();
  return fails;
}

(async () => {
  let all = 0;
  for (const b of BASES) {
    const f = await runOnce(b);
    all += f.length;
    if (f.length) f.forEach(x => console.log('    - ' + x));
  }
  console.log(all === 0 ? '\n存档持久化：双协议全部通过' : '\n存档持久化：失败 ' + all + ' 项');
  process.exit(all ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
