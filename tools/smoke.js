/* tools/smoke.js — 冒烟测试：协议加载 + 开场 + 登录 + 桌面 + 各应用可开
 * 用法：node tools/smoke.js [--file]   （--file 用 file:// 协议，默认 http://127.0.0.1:8765） */
'use strict';
const path = require('path');
const { launch, newPage, shot, sleep, click, type } = require('./browser');

const useFile = process.argv.indexOf('--file') >= 0;
const BASE = useFile
  ? 'file:///' + path.join(__dirname, '..', 'index.html').replace(/\\/g, '/')
  : 'http://127.0.0.1:8765/index.html';

(async () => {
  const browser = await launch();
  const page = await newPage(browser, 1280, 800);
  const fails = [];
  console.log('冒烟测试: ' + BASE);
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'load' });
  await sleep(500);

  async function must(name, fn) {
    try { await fn(); console.log('  ✓ ' + name); }
    catch (e) { fails.push(name + ': ' + e.message); console.log('  ✗ ' + name + ': ' + e.message); }
  }

  await must('数据装载（8 个文件）', async () => {
    const c = await page.evaluate(() => ({ files: DB.files.length, emails: DB.emails.length, chats: DB.chats.length, photos: DB.photos.length, logs: DB.syslogs.length }));
    console.log('    ' + JSON.stringify(c));
    if (!c.files || !c.emails || !c.chats) throw new Error('内容数据为空');
  });
  await must('开场卡片', async () => {
    await page.waitForSelector('[data-testid="ov-card-0"]', { visible: true, timeout: 8000 });
    await shot(page, 'smoke-intro');
    const n = await page.evaluate(() => LL.intro.cards.length);
    for (let i = 0; i < n; i++) { await page.click('[data-testid="ov-next"]'); await sleep(240); }
  });
  await must('启动动画→锁屏', async () => {
    await page.waitForSelector('#lock:not(.hidden)', { timeout: 20000 });
    await shot(page, 'smoke-lock');
  });
  await must('密码 0812 登录', async () => {
    await type(page, '#lock-pass', '0812');
    await page.click('[data-testid="lock-submit"]');
    await page.waitForFunction(() => { const d = document.getElementById('desktop'); return d && !d.classList.contains('hidden'); }, { timeout: 15000 });
    await sleep(2500);
    await shot(page, 'smoke-desktop');
  });
  for (const a of ['files', 'mail', 'chat', 'photos', 'browser', 'calendar', 'logs', 'notes', 'investigate']) {
    await must('应用 ' + a, async () => {
      await page.click('[data-testid="icon-' + a + '"]');
      await page.waitForSelector('[data-testid="win-' + a + '"]', { visible: true, timeout: 6000 });
      await sleep(380);
      await shot(page, 'smoke-' + a);
      await page.click('[data-testid="wclose-' + a + '"]');
      await sleep(180);
    });
  }
  await must('无页面错误', async () => {
    const errs = page.errors.filter(e => !/favicon/i.test(e));
    if (errs.length) throw new Error(errs.slice(0, 5).join(' | '));
  });

  console.log('\n' + (fails.length ? '失败 ' + fails.length + ' 项' : '全部通过') + '（截图见 tools/screenshots/smoke-*.png）');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
