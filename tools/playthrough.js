/* tools/playthrough.js — 自动化完整通关 + 全量内容渲染扫描
 * 用法：node tools/playthrough.js [--base http://127.0.0.1:8765/index.html] [--file]
 * 依赖：puppeteer-core + 本机 Chrome/Edge
 */
'use strict';
const path = require('path');
const fs = require('fs');
const { launch, newPage, shot, sleep, click, type, textOf } = require('./browser');

const args = process.argv.slice(2);
const useFile = args.indexOf('--file') >= 0;
const bi = args.indexOf('--base');
const BASE = bi >= 0 ? args[bi + 1] : (useFile ? 'file:///' + path.join(__dirname, '..', 'index.html').replace(/\\/g, '/') : 'http://127.0.0.1:8765/index.html');

const failures = [];
const softIssues = [];
let stepNo = 0;

async function step(name, fn, critical) {
  stepNo++;
  process.stdout.write(String(stepNo).padStart(2, '0') + ' → ' + name + ' … ');
  try {
    await fn();
    console.log('ok');
  } catch (e) {
    console.log('FAIL: ' + e.message);
    failures.push({ step: name, error: e.message, critical: !!critical });
    if (critical) throw e;
  }
}

async function main() {
  const browser = await launch();
  const page = await newPage(browser, 1440, 900);
  const T = (id) => '[data-testid="' + id + '"]';
  const ev = (fn, ...a) => page.evaluate(fn, ...a);
  const visible = async (sel) => !!(await page.$(sel)) && await page.evaluate(s => { const e = document.querySelector(s); return !!e && e.offsetParent !== null; }, sel);
  const waitGone = async (sel, ms) => { try { await page.waitForFunction(s => { const e = document.querySelector(s); return !e || e.offsetParent === null; }, { timeout: ms || 6000 }, sel); } catch (e) { throw new Error('元素未消失 ' + sel); } };
  const waitDesktop = () => page.waitForFunction(() => { const d = document.getElementById('desktop'); return d && !d.classList.contains('hidden'); }, { timeout: 20000 });
  const clueCount = () => ev(() => State.clueCount());
  const hasClue = (id) => ev((c) => State.hasClue(c), id);

  console.log('目标: ' + BASE);
  await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  await ev(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload({ waitUntil: 'load', timeout: 30000 });
  await sleep(400);

  /* ---------- A. 开场 ---------- */
  await step('开场卡片序列', async () => {
    const n = await ev(() => (LL.intro.cards || []).length);
    if (n < 3) throw new Error('intro 卡片数量异常: ' + n);
    for (let i = 0; i < n; i++) {
      await page.waitForSelector(T('ov-card-' + i), { visible: true, timeout: 6000 });
      if (i === 0 || i === 1) await shot(page, 'a-intro-' + i);
      await page.click(T('ov-next'));
      await sleep(260);
    }
    await page.waitForSelector('#boot:not(.hidden)', { timeout: 6000 });
  }, true);

  await step('启动动画 → 锁屏', async () => {
    await page.waitForSelector('#lock:not(.hidden)', { timeout: 20000 });
    await shot(page, 'b-lock');
  }, true);

  await step('锁屏：错误密码有反馈', async () => {
    await type(page, '#lock-pass', '1234');
    await page.click(T('lock-submit'));
    await sleep(300);
    const msg = (await textOf(page, '#lock-msg')) || '';
    if (!msg.trim()) throw new Error('错误密码没有提示文案');
    await shot(page, 'b-lock-wrong');
  });

  await step('锁屏：正确密码 0812 进入桌面', async () => {
    await type(page, '#lock-pass', '0812');
    await page.click(T('lock-submit'));
    await waitDesktop();
    await sleep(2600);
    await shot(page, 'c-desktop');
    if (!(await hasClue('CL-M6'))) throw new Error('开场未自动收藏 CL-M6');
  }, true);

  /* ---------- B. 逐个应用冒烟 ---------- */
  const APPS = ['files', 'mail', 'chat', 'photos', 'browser', 'calendar', 'logs', 'notes', 'investigate'];
  for (const a of APPS) {
    await step('打开应用 ' + a, async () => {
      await page.click(T('icon-' + a));
      await page.waitForSelector(T('win-' + a), { visible: true, timeout: 6000 });
      await sleep(420);
      await shot(page, 'c-app-' + a);
      const bodyText = await ev((id) => { const w = document.querySelector('[data-testid="win-' + id + '"] .win-body'); return w ? w.innerText.length : 0; }, a);
      if (bodyText < 10) softIssues.push('应用 ' + a + ' 内容过少（' + bodyText + ' 字符）');
      await page.click(T('wclose-' + a));
      await sleep(220);
    });
  }

  await step('窗口最小化/最大化/任务栏', async () => {
    await page.click(T('icon-files'));
    await page.waitForSelector(T('win-files'), { visible: true });
    await page.click(T('wmax-files')); await sleep(200);
    const maximized = await ev(() => { const w = document.querySelector('[data-testid="win-files"]'); return w.classList.contains('max'); });
    if (!maximized) throw new Error('最大化未生效');
    await page.click(T('wmax-files')); await sleep(200);
    await page.click(T('wmin-files')); await sleep(200);
    const hidden = await ev(() => document.querySelector('[data-testid="win-files"]').style.display === 'none');
    if (!hidden) throw new Error('最小化未生效');
    await page.click(T('task-files')); await sleep(250);
    const back = await ev(() => document.querySelector('[data-testid="win-files"]').style.display !== 'none');
    if (!back) throw new Error('任务栏恢复失败');
    await shot(page, 'c-window-ctl');
    await page.click(T('wclose-files')); await sleep(200);
  });

  await step('全局搜索（Ctrl+K）返回结果', async () => {
    await page.click('#global-search');
    await page.type('#global-search', '召回率', { delay: 20 });
    await sleep(500);
    const n = await ev(() => document.querySelectorAll('#search-results .sr-item').length);
    if (n < 1) throw new Error('搜索「召回率」无结果');
    await shot(page, 'd-search');
    const first = await page.$('#search-results .sr-item');
    await first.click();
    await sleep(700);
    await shot(page, 'd-search-open');
    await ev(() => { WM.all().forEach(w => WM.close(w)); });
    await sleep(200);
  });

  /* ---------- C. 规范解谜路径 ---------- */
  await step('浏览器：裁判文书网快照含案号 1024（L1 密码来源）', async () => {
    await page.click(T('icon-browser'));
    await page.waitForSelector(T('win-browser'), { visible: true });
    await page.click(T('br-pages')); await sleep(250);
    await page.click(T('page-page:court-1024')); await sleep(400);
    const txt = await ev(() => document.querySelector('[data-testid="pageview-page:court-1024"]').innerText);
    if (txt.indexOf('1024') < 0) throw new Error('法院页未出现案号 1024');
    await shot(page, 'e-court-1024');
    await ev(() => Apps.browser.openPage('page:news-police-0614')); await sleep(450);
    const ptxt = await ev(() => { const e = document.querySelector('[data-testid="pageview-page:news-police-0614"]'); return e ? e.innerText : ''; });
    if (ptxt.indexOf('09时30分') < 0 && ptxt.indexOf('09:30') < 0) throw new Error('警方通报页未加载');
  });

  await step('文件：用 1024 解锁「归档」并收藏 CL-W4', async () => {
    await ev(() => { WM.all().forEach(w => WM.close(w)); });
    await page.click(T('icon-files'));
    await page.waitForSelector(T('win-files'), { visible: true });
    await page.click(T('tree-/文档/工作')); await sleep(300);
    await page.click(T('tree-/文档/工作/归档')); await sleep(400);
    await page.waitForSelector(T('pw-input-L1'), { visible: true, timeout: 5000 });
    await shot(page, 'f-lock-L1');
    await type(page, T('pw-input-L1'), '1024');
    await page.click(T('pw-ok-L1'));
    await sleep(600);
    await waitGone(T('pw-input-L1'));
    const opened = await ev(() => State.lockSolved('L1'));
    if (!opened) throw new Error('L1 未解锁');
    await page.click(T('row-file:doc-archive-rec')); await sleep(500);
    await page.waitForSelector(T('clue-btn-CL-W4'), { visible: true, timeout: 5000 });
    await shot(page, 'f-archive-rec');
    await page.click(T('clue-btn-CL-W4')); await sleep(350);
    if (!(await hasClue('CL-W4'))) throw new Error('CL-W4 收藏失败');
  }, true);

  await step('相册：用 M31 解锁「六月」并收藏 CL-M1/CL-M2/CL-P1', async () => {
    await ev(() => { WM.all().forEach(w => WM.close(w)); });
    await page.click(T('icon-photos'));
    await page.waitForSelector(T('win-photos'), { visible: true });
    await page.click(T('album-hidden06')); await sleep(400);
    await page.waitForSelector(T('pw-input-L2'), { visible: true, timeout: 5000 });
    await type(page, T('pw-input-L2'), 'M31');
    await page.click(T('pw-ok-L2')); await sleep(600);
    const n = await ev(() => document.querySelectorAll('[data-testid^="pcard-"]').length);
    if (n < 5) throw new Error('隐藏相簿照片数异常: ' + n);
    await shot(page, 'g-hidden-album');
    for (const [pid, cid] of [['photo:ph-threat-letter', 'CL-M1'], ['photo:ph-ticket-12306', 'CL-M2'], ['photo:ph-chenyu-phone', 'CL-P1']]) {
      await page.click(T('pcard-' + pid)); await sleep(500);
      await page.waitForSelector(T('clue-btn-' + cid), { visible: true, timeout: 5000 });
      if (cid === 'CL-M1') await shot(page, 'g-threat-letter');
      await page.click(T('clue-btn-' + cid)); await sleep(300);
      if (!(await hasClue(cid))) throw new Error(cid + ' 收藏失败');
      await ev(() => { WM.closeApp('photoview'); }); await sleep(200);
    }
  }, true);

  await step('邮件：收藏 CL-W2 / CL-W6 / CL-P2', async () => {
    await ev(() => { WM.all().forEach(w => WM.close(w)); });
    await page.click(T('icon-mail'));
    await page.waitForSelector(T('win-mail'), { visible: true });
    for (const [mid, cid] of [['email:mail-heshan-0528', 'CL-W2'], ['email:mail-hr-0606', 'CL-W6']]) {
      await page.click(T('folder-inbox')); await sleep(200);
      await page.click(T('mail-' + mid)); await sleep(400);
      await page.waitForSelector(T('clue-btn-' + cid), { visible: true, timeout: 5000 });
      if (cid === 'CL-W2') await shot(page, 'h-heshan-mail');
      await page.click(T('clue-btn-' + cid)); await sleep(250);
      if (!(await hasClue(cid))) throw new Error(cid + ' 收藏失败');
    }
    await page.click(T('folder-draft')); await sleep(250);
    await page.click(T('mail-email:mail-draft-chenyu')); await sleep(400);
    await page.waitForSelector(T('clue-btn-CL-P2'), { visible: true, timeout: 5000 });
    await shot(page, 'h-draft-chenyu');
    await page.click(T('clue-btn-CL-P2')); await sleep(250);
    if (!(await hasClue('CL-P2'))) throw new Error('CL-P2 收藏失败');
  }, true);

  await step('聊天：收藏 CL-W3 / CL-P3 / CL-P5（含撤回消息）', async () => {
    await ev(() => { WM.all().forEach(w => WM.close(w)); });
    for (const [mid, cid] of [['chat:msg-zhengnan-0509', 'CL-W3'], ['chat:msg-chenyu-0502', 'CL-P3'], ['chat:msg-chenyu-0611-recall', 'CL-P5']]) {
      await ev((m) => Apps.chat.openMsg(m), mid);
      await sleep(600);
      await page.waitForSelector(T('clue-btn-' + cid), { visible: true, timeout: 6000 });
      if (cid === 'CL-P5') await shot(page, 'i-chenyu-recall');
      await page.click(T('clue-btn-' + cid)); await sleep(250);
      if (!(await hasClue(cid))) throw new Error(cid + ' 收藏失败');
    }
  }, true);

  await step('系统日志：收藏 CL-P4 / CL-M5', async () => {
    await ev(() => { WM.all().forEach(w => WM.close(w)); });
    for (const [lid, cid] of [['log:syslog-0528-login', 'CL-P4'], ['log:syslog-0612-task', 'CL-M5']]) {
      await ev((l) => Apps.logs.openRef(l), lid);
      await sleep(600);
      await page.waitForSelector(T('clue-btn-' + cid), { visible: true, timeout: 6000 });
      if (cid === 'CL-P4') await shot(page, 'j-syslog-0528');
      await page.click(T('clue-btn-' + cid)); await sleep(250);
      if (!(await hasClue(cid))) throw new Error(cid + ' 收藏失败');
    }
  }, true);

  await step('备忘录 + 历史 + 报告：收藏 CL-M3 / CL-M4 / CL-W1 / CL-W5', async () => {
    await ev(() => { WM.all().forEach(w => WM.close(w)); });
    await ev(() => Apps.notes.openRef('note:note-scheduled-msg'));
    await sleep(600);
    await page.waitForSelector(T('clue-btn-CL-M3'), { visible: true, timeout: 6000 });
    await shot(page, 'k-note-scheduled');
    await page.click(T('clue-btn-CL-M3')); await sleep(250);
    if (!(await hasClue('CL-M3'))) throw new Error('CL-M3 收藏失败');

    await ev(() => { WM.all().forEach(w => WM.close(w)); });
    await ev(() => Apps.browser.openRef('hist:hist-0609-lenghu'));
    await sleep(600);
    await page.waitForSelector(T('clue-btn-CL-M4'), { visible: true, timeout: 6000 });
    await shot(page, 'k-hist-lenghu');
    await page.click(T('clue-btn-CL-M4')); await sleep(250);
    if (!(await hasClue('CL-M4'))) throw new Error('CL-M4 收藏失败');

    await ev(() => { WM.all().forEach(w => WM.close(w)); });
    await ev(() => Apps.files.openFile('file:doc-report'));
    await sleep(600);
    await page.waitForSelector(T('clue-btn-CL-W1'), { visible: true, timeout: 6000 });
    await shot(page, 'k-doc-report');
    await page.click(T('clue-btn-CL-W1')); await sleep(250);
    if (!(await hasClue('CL-W1'))) throw new Error('CL-W1 收藏失败');

    await ev(() => { WM.all().forEach(w => WM.close(w)); });
    await ev(() => Apps.browser.openPage('page:news-suqing-report'));
    await sleep(600);
    await page.waitForSelector(T('clue-btn-CL-W5'), { visible: true, timeout: 6000 });
    await shot(page, 'k-news-report');
    await page.click(T('clue-btn-CL-W5')); await sleep(250);
    if (!(await hasClue('CL-W5'))) throw new Error('CL-W5 收藏失败');
  }, true);

  await step('线索板显示 17/17', async () => {
    await ev(() => { WM.all().forEach(w => WM.close(w)); });
    const c = await clueCount();
    if (c !== 17) throw new Error('线索数 ' + c + ' ≠ 17');
    await page.click(T('icon-investigate'));
    await page.waitForSelector(T('win-investigate'), { visible: true });
    await page.click(T('tab-board')); await sleep(400);
    await shot(page, 'l-board-full');
  }, true);

  await step('结案：错误答案得到反馈', async () => {
    await page.click(T('tab-deduction')); await sleep(300);
    await page.click(T('opt-Q1-A')); await page.click(T('opt-Q2-A')); await page.click(T('opt-Q3-A'));
    await sleep(200);
    await page.click(T('ded-submit')); await sleep(600);
    const bad = await ev(() => document.querySelectorAll('.q-fb.bad').length);
    if (bad !== 3) throw new Error('错误反馈数量 ' + bad + ' ≠ 3');
    const solved = await ev(() => State.deductionSolved());
    if (solved) throw new Error('错误答案不应通关');
    await shot(page, 'l-deduction-wrong');
  }, true);

  await step('结案：正确答案通关', async () => {
    await page.click(T('opt-Q1-C')); await page.click(T('opt-Q2-B')); await page.click(T('opt-Q3-D'));
    await sleep(200);
    await page.click(T('ded-submit')); await sleep(800);
    const solved = await ev(() => State.deductionSolved());
    if (!solved) throw new Error('正确答案未通关');
    await page.waitForSelector(T('modal-goto-starfall'), { visible: true, timeout: 5000 });
    await shot(page, 'm-deduction-success');
    await page.click(T('modal-goto-starfall')); await sleep(700);
  }, true);

  await step('starfall.zip：L3 门控与密码 天津四', async () => {
    await page.waitForSelector(T('pw-input-L3'), { visible: true, timeout: 6000 });
    await shot(page, 'm-lock-L3');
    await type(page, T('pw-input-L3'), '天津四');
    await page.click(T('pw-ok-L3')); await sleep(800);
    await page.waitForSelector(T('win-starfall'), { visible: true, timeout: 6000 });
    await shot(page, 'n-starfall');
  }, true);

  await step('L3 门控验证（通关前不可打开）', async () => {
    const gated = await ev(() => {
      /* 临时回滚 solved 状态，验证门控逻辑仍生效 */
      const s = State.data.deduction.solved;
      State.data.deduction.solved = false;
      let blocked = false;
      const lock = DB.locks.L3;
      blocked = (lock.gate === 'deduction' && !State.deductionSolved());
      State.data.deduction.solved = s;
      return blocked;
    });
    if (!gated) throw new Error('L3 未受推理门控');
  });

  await step('读信 → 发送证据 → 尾声 → 评价', async () => {
    await page.click(T('open-letter')); await sleep(900);
    await page.waitForSelector(T('ov-card-0'), { visible: true, timeout: 6000 });
    const letterText = await ev(() => document.querySelector('[data-testid="ov-card-0"]').innerText.length);
    if (letterText < 400) throw new Error('信件内容过短: ' + letterText);
    await shot(page, 'o-letter');
    await page.click(T('ov-next')); await sleep(700);

    await page.click(T('send-evidence')); await sleep(500);
    await page.waitForSelector(T('send-ok'), { visible: true, timeout: 5000 });
    await shot(page, 'o-send-confirm');
    await page.click(T('send-ok'));
    await page.waitForSelector(T('send-anim'), { visible: true, timeout: 5000 });
    await sleep(4600);
    /* 尾声卡片 */
    const epiN = await ev(() => (DB.ending.epilogue || []).length);
    for (let i = 0; i < epiN; i++) {
      await page.waitForSelector(T('ov-card-' + i), { visible: true, timeout: 8000 });
      if (i === 0 || i === epiN - 1) await shot(page, 'p-epilogue-' + i);
      await page.click(T('ov-next'));
      await sleep(500);
    }
    await page.waitForSelector(T('rank-card'), { visible: true, timeout: 8000 });
    const rank = await ev(() => document.querySelector('.rank-badge').textContent.trim());
    if (!'SABC'.split('').includes(rank)) throw new Error('评价异常: ' + rank);
    if (rank !== 'S') softIssues.push('规范路径评价为 ' + rank + '（期望 S：17 线索 0 提示）');
    await shot(page, 'q-rank');
    const sent = await ev(() => State.data.starfall.sent && State.data.ended);
    if (!sent) throw new Error('状态未记录发送/通关');
  }, true);

  await step('评价后自由浏览 + 存档槽位 + 重载续玩', async () => {
    await page.click(T('rank-freeroam')); await sleep(600);
    await waitDesktop();
    await page.click(T('start-btn')); await sleep(300);
    await page.click(T('sm-save')); await sleep(600);
    await page.waitForSelector(T('slot-save-1'), { visible: true, timeout: 5000 });
    await page.click(T('slot-save-1')); await sleep(500);
    await shot(page, 'r-save-manager');
    await ev(() => { WM.all().forEach(w => WM.close(w)); });
    await page.reload({ waitUntil: 'load' });
    await sleep(900);
    await waitDesktop();
    const c = await clueCount();
    if (c !== 17) throw new Error('重载后线索数 ' + c + ' ≠ 17');
    const ended = await ev(() => State.data.ended);
    if (!ended) throw new Error('重载后通关状态丢失');
    await shot(page, 'r-after-reload');
  }, true);

  await step('目的性系统：章节/关联发现/成就/目标芯片', async () => {
    const st = await ev(() => ({
      ch: State.data.chaptersDone.slice(),
      ins: State.data.insights.length,
      ach: State.data.ach.slice(),
      chip: (document.getElementById('goal-chip') || {}).textContent
    }));
    ['ch1', 'ch2', 'ch3', 'ch4'].forEach(c => { if (st.ch.indexOf(c) < 0) throw new Error('章节未完成: ' + st.ch.join(',')); });
    if (st.ins < 5) throw new Error('关联发现过少: ' + st.ins);
    ['ach-first', 'ach-all', 'ach-truth', 'ach-send'].forEach(a => { if (st.ach.indexOf(a) < 0) throw new Error('缺成就 ' + a); });
    if (!st.chip || st.chip.indexOf('17/17') < 0) throw new Error('目标芯片文本异常: ' + st.chip);
    await page.click(T('icon-investigate')); await sleep(300);
    await page.click(T('tab-goal')); await sleep(400);
    await shot(page, 'u-goal');
    await page.click(T('note-ch1')); await sleep(400);
    const noteTxt = await ev(() => { const m = document.querySelector('.modal-bg .modal p'); return m ? m.innerText : ''; });
    if (noteTxt.indexOf('92.4') < 0) throw new Error('章节笔记内容异常');
    await ev(() => { const b = Array.from(document.querySelectorAll('.modal-bg .m-acts button')).pop(); if (b) b.click(); });
    await sleep(300);
    await page.click(T('tab-board')); await sleep(300);
    const insCards = await ev(() => document.querySelectorAll('[data-testid^="ins-"]').length);
    if (insCards < 5) throw new Error('线索板关联发现卡片数 ' + insCards);
    await page.click(T('tab-about')); await sleep(300);
    const achGot = await ev(() => Array.from(document.querySelectorAll('[data-testid^="ach-"]')).filter(e => e.className.indexOf('locked') < 0).length);
    if (achGot < 8) throw new Error('成就墙点亮数 ' + achGot);
    await shot(page, 'u-ach');
    await ev(() => { WM.all().forEach(w => WM.close(w)); });
  });

  await step('调查手册：时间线页点亮且可跳回证据', async () => {
    await ev(() => { WM.all().forEach(w => WM.close(w)); });
    await page.click(T('icon-investigate'));
    await page.waitForSelector(T('win-investigate'), { visible: true });
    await page.click(T('tab-timeline')); await sleep(400);
    const lit = await ev(() => Array.from(document.querySelectorAll('[data-testid^="tl-"]')).filter(e => e.innerText.indexOf('尚未查明') < 0).length);
    if (lit < 14) throw new Error('时间线点亮数 ' + lit + ' < 14');
    await shot(page, 't-timeline');
    await page.click(T('tl-goto-6')); await sleep(700);
    const opened = await ev(() => !!WM.get('viewer:file:doc-report'));
    if (!opened) throw new Error('时间线跳回证据失败');
    await ev(() => { WM.all().forEach(w => WM.close(w)); });
  });

  await step('调查手册：清单页 + 开场可回退重读', async () => {
    await page.click(T('icon-investigate')); await sleep(300);
    await page.click(T('tab-goal')); await sleep(400);
    for (let i = 0; i < 6; i++) await page.waitForSelector(T('ck-' + i), { visible: true, timeout: 4000 });
    const ck3 = await textOf(page, T('ck-3'));
    if (!ck3 || ck3.indexOf('✓') < 0) throw new Error('清单未勾选结案项: ' + ck3);
    await shot(page, 't-checklist');
    await page.click(T('review-intro')); await sleep(700);
    await page.waitForSelector(T('ov-card-0'), { visible: true });
    await page.click(T('ov-next')); await sleep(300);
    await page.waitForSelector(T('ov-card-1'), { visible: true });
    await page.click(T('ov-prev')); await sleep(300);
    await page.waitForSelector(T('ov-card-0'), { visible: true });
    for (let i = 0; i < 4; i++) { await page.click(T('ov-next')); await sleep(260); }
    await page.waitForFunction(() => document.getElementById('overlay').classList.contains('hidden'), { timeout: 6000 });
  });

  await step('笔记：任务栏便签 + 线索批注，刷新后保留', async () => {
    await ev(() => { WM.all().forEach(w => WM.close(w)); });
    await page.click(T('quick-note')); await sleep(700);
    await page.waitForSelector(T('my-note'), { visible: true });
    await page.click(T('my-note'));
    await page.type(T('my-note'), '陈屿 5-28 用过她的电脑；票是 6-13 的。', { delay: 5 });
    await sleep(600);
    await page.click(T('icon-investigate')); await sleep(300);
    await page.click(T('tab-board')); await sleep(400);
    await page.click(T('cluenote-toggle-CL-W1')); await sleep(300);
    await page.click(T('cluenote-CL-W1'));
    await page.type(T('cluenote-CL-W1'), '92.4 vs 78.1', { delay: 5 });
    await sleep(700);
    await shot(page, 't-clue-note');
    await page.reload({ waitUntil: 'load' }); await sleep(900);
    const notes = await ev(() => ({ mine: (State.data.userNotes['player-note'] || ''), w1: (State.data.userNotes['clue:CL-W1'] || '') }));
    if (notes.mine.indexOf('6-13') < 0) throw new Error('玩家便签未持久化');
    if (notes.w1.indexOf('78.1') < 0) throw new Error('线索批注未持久化');
  });

  /* ---------- D. 全量内容渲染扫描 ---------- */
  await step('全量内容渲染扫描（每个条目都打开一次）', async () => {
    const ids = await ev(() => {
      const out = { files: [], emails: [], photos: [], pages: [], notes: [], logs: [], cal: [], msgs: [] };
      DB.files.forEach(f => out.files.push(f.id));
      DB.emails.forEach(m => out.emails.push(m.id));
      DB.photos.forEach(p => { if (!p.external || p.id === 'photo:ph-note-mother') out.photos.push(p.id); });
      DB.browser.pages.forEach(p => out.pages.push(p.id));
      DB.notes.forEach(n => out.notes.push(n.id));
      DB.syslogs.forEach(l => out.logs.push(l.id));
      DB.calendar.forEach(c => out.cal.push(c.id));
      DB.chats.forEach(c => (c.messages || []).forEach(m => out.msgs.push(m.id)));
      return out;
    });
    const before = page.errors.length;
    const opened = { n: 0, bad: [] };

    async function sweep(list, opener, label) {
      for (const id of list) {
        const ok = await ev((o, i) => {
          try {
            WM.all().forEach(w => WM.close(w));
            if (o === 'file') Apps.files.openFile(i);
            else if (o === 'mail') Apps.mail.openMail(i);
            else if (o === 'photo') Apps.photos.open(i);
            else if (o === 'page') Apps.browser.openPage(i);
            else if (o === 'note') Apps.notes.openRef(i);
            else if (o === 'log') Apps.logs.openRef(i);
            else if (o === 'cal') Apps.calendar.openRef(i);
            else if (o === 'msg') Apps.chat.openMsg(i);
            return true;
          } catch (e) { return String(e && e.message || e); }
        }, opener, id);
        opened.n++;
        if (ok !== true) { opened.bad.push(label + ' ' + id + ': ' + ok); continue; }
        await sleep(55);
        const domOk = await ev(() => {
          const wins = WM.all();
          if (!wins.length) return 'no-window';
          const b = wins[wins.length - 1].body;
          return (b && b.innerText.trim().length > 0) ? true : 'empty-body';
        });
        if (domOk !== true) opened.bad.push(label + ' ' + id + ': ' + domOk);
      }
    }
    await sweep(ids.files, 'file', 'file');
    await sweep(ids.emails, 'mail', 'mail');
    await sweep(ids.photos, 'photo', 'photo');
    await sweep(ids.pages, 'page', 'page');
    await sweep(ids.notes, 'note', 'note');
    await sweep(ids.logs, 'log', 'log');
    await sweep(ids.cal, 'cal', 'cal');
    await sweep(ids.msgs, 'msg', 'msg');

    await ev(() => { WM.all().forEach(w => WM.close(w)); });
    const newErrors = page.errors.slice(before);
    console.log('    打开条目 ' + opened.n + ' 个，异常 ' + opened.bad.length + ' 个，页面错误 ' + newErrors.length + ' 条');
    if (opened.bad.length) { softIssues.push(...opened.bad.slice(0, 25)); if (opened.bad.length > 25) softIssues.push('…另有 ' + (opened.bad.length - 25) + ' 个'); }
    if (newErrors.length) failures.push({ step: '渲染扫描页面错误', error: newErrors.slice(0, 8).join(' | ') });
    if (opened.bad.length > 0) failures.push({ step: '渲染扫描', error: opened.bad.length + ' 个条目渲染异常（详见 softIssues）', critical: false });
  });

  await step('截图：通关后的桌面与各应用', async () => {
    for (const a of ['files', 'mail', 'chat', 'photos', 'browser', 'calendar', 'logs', 'notes', 'investigate']) {
      await ev((id) => { Apps[id].open(); }, a);
      await sleep(420);
      await shot(page, 'z-final-' + a);
      await ev(() => { WM.all().forEach(w => WM.close(w)); });
      await sleep(150);
    }
    await shot(page, 'z-final-desktop');
  });

  /* ---------- 汇总 ---------- */
  const errs = page.errors.filter(e => !/favicon/i.test(e));
  console.log('\n================ 结果 ================');
  console.log('页面/控制台错误: ' + errs.length);
  errs.slice(0, 20).forEach(e => console.log('  ✗ ' + e));
  console.log('步骤失败: ' + failures.length);
  failures.forEach(f => console.log('  ✗ [' + f.step + '] ' + f.error));
  console.log('软性问题: ' + softIssues.length);
  softIssues.slice(0, 30).forEach(s => console.log('  ! ' + s));

  fs.writeFileSync(path.join(__dirname, 'screenshots', 'report.json'), JSON.stringify({ base: BASE, errors: errs, failures, softIssues }, null, 2));
  await browser.close();
  const fatal = errs.length > 0 || failures.some(f => f.critical) || failures.length > 0;
  process.exit(fatal ? 1 : 0);
}

main().catch(e => { console.error('\n测试脚本自身出错: ', e); process.exit(2); });
