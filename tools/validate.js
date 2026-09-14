/* tools/validate.js — 《最后一次登录》内容一致性自动验证
 * 用法：node tools/validate.js
 * 依据：docs/STORY_BIBLE.md §9 一致性硬规则、docs/CONTENT_SPEC.md §5 交叉引用规则
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const DATA_FILES = ['00_meta.js', '11_files_work.js', '12_files_work2.js', '13_files_missing.js', '20_emails.js', '21_emails2.js', '30_chats_a.js', '30_chats_b.js', '30_chats_c.js', '30_chats_d.js', '30_chats_e.js', '40_photos.js', '50_browser.js', '60_misc.js'];

let pass = 0, fail = 0, warn = 0;
const failures = [], warnings = [];
const C = { r: '\x1b[31m', g: '\x1b[32m', y: '\x1b[33m', c: '\x1b[36m', d: '\x1b[2m', x: '\x1b[0m' };

function section(name) { console.log('\n' + C.c + '== ' + name + ' ==' + C.x); }
function ok(msg) { pass++; console.log('  ' + C.g + '✓' + C.x + ' ' + msg); }
function bad(msg) { fail++; failures.push(msg); console.log('  ' + C.r + '✗ ' + msg + C.x); }
function meh(msg) { warn++; warnings.push(msg); console.log('  ' + C.y + '! ' + msg + C.x); }
function check(cond, msg, soft) { if (cond) ok(msg); else if (soft) meh(msg); else bad(msg); }

/* ---------- 加载数据（与浏览器同一套文件） ---------- */
const ctx = { console: console, JSON: JSON, Date: Date, Math: Math, Object: Object, Array: Array, String: String, Number: Number, RegExp: RegExp, Promise: Promise };
ctx.globalThis = ctx;
vm.createContext(ctx);
const missingFiles = [];
DATA_FILES.forEach(function (f) {
  const p = path.join(ROOT, 'js', 'data', f);
  if (!fs.existsSync(p)) { missingFiles.push(f); return; }
  try { vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f }); }
  catch (e) { bad('数据文件语法错误 ' + f + ': ' + e.message); }
});
try { vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'core', 'db.js'), 'utf8'), ctx, { filename: 'db.js' }); }
catch (e) { bad('db.js 执行失败: ' + e.message); }

const LL = ctx.LL || {};
const DB = ctx.DB || {};

section('0. 数据文件装载');
if (missingFiles.length) bad('缺失数据文件: ' + missingFiles.join(', '));
else ok('8 个数据文件全部存在并成功执行');

const files = DB.files || [], emails = DB.emails || [], chats = DB.chats || [], photos = DB.photos || [];
const browser = DB.browser || { pages: [], history: [], bookmarks: [] };
const calendar = DB.calendar || [], syslogs = DB.syslogs || [], notes = DB.notes || [];
const clues = DB.clues || {}, locks = DB.locks || {}, hints = DB.hints || [], ded = DB.deduction || { questions: [] };

section('1. 内容规模（SPEC §4 槽位数）');
check(files.length >= 27, '文件条目 ' + files.length + ' / 期望 ≥27');
check(emails.length === 22, '邮件 ' + emails.length + ' / 期望 22');
check(chats.length === 7, '会话 ' + chats.length + ' / 期望 7');
check(photos.length === 15, '照片 ' + photos.length + ' / 期望 15');
check(browser.pages.length === 8, '网页快照 ' + browser.pages.length + ' / 期望 8');
check(browser.history.length >= 22, '历史记录 ' + browser.history.length + ' / 期望 ≥22');
check(calendar.length === 16, '日历 ' + calendar.length + ' / 期望 16');
check(syslogs.length >= 26, '系统日志 ' + syslogs.length + ' / 期望 ≥26');
check(notes.length === 6, '备忘录 ' + notes.length + ' / 期望 6');
const msgTotal = chats.reduce((n, c) => n + (c.messages || []).length, 0);
check(msgTotal >= 180, '聊天消息总数 ' + msgTotal + ' / 期望 ≥180');

section('2. id 唯一性与引用完整性');
const allItems = [];
files.forEach(f => allItems.push(['file', f]));
emails.forEach(m => allItems.push(['email', m]));
photos.forEach(p => allItems.push(['photo', p]));
browser.pages.forEach(p => allItems.push(['page', p]));
browser.history.forEach(h => allItems.push(['hist', h]));
browser.bookmarks.forEach(b => allItems.push(['bm', b]));
calendar.forEach(c => allItems.push(['cal', c]));
syslogs.forEach(l => allItems.push(['log', l]));
notes.forEach(n => allItems.push(['note', n]));
chats.forEach(c => { allItems.push(['conv', c]); (c.messages || []).forEach(m => allItems.push(['msg', m])); });
const seenIds = new Map();
let dup = 0;
allItems.forEach(([k, it]) => {
  if (!it || !it.id) { bad(k + ' 条目缺少 id'); dup++; return; }
  if (seenIds.has(it.id)) { bad('id 重复: ' + it.id); dup++; }
  seenIds.set(it.id, k);
});
check(dup === 0, '全部 ' + allItems.length + ' 个条目 id 唯一');
const byId = id => seenIds.has(id) ? { id: id, kind: seenIds.get(id) } : null;

/* clue 载体 */
const CLUE_IDS = Object.keys(clues);
check(CLUE_IDS.length === 17, '关键线索数量 ' + CLUE_IDS.length + ' / 期望 17');
const carriers = new Map();
allItems.forEach(([k, it]) => { if (it.clue) carriers.set(it.clue, it.id); });
CLUE_IDS.forEach(cid => {
  const src = clues[cid].source;
  const carrier = carriers.get(cid);
  if (!carrier) bad('线索 ' + cid + ' 没有任何载体（clue 字段未被使用）');
  else if (carrier !== src) bad('线索 ' + cid + ' 载体不一致: clues.source=' + src + ' 实际=' + carrier);
  else if (!byId(src)) bad('线索 ' + cid + ' 的 source 不存在: ' + src);
});
check(carriers.size === CLUE_IDS.length, 'clue 字段只用于 17 个合法线索（实际出现 ' + carriers.size + ' 种）');
[...carriers.keys()].forEach(c => { if (!clues[c]) bad('非法 clue id 被引用: ' + c); });

/* 照片资产存在 */
let missAsset = 0;
photos.forEach(p => {
  if (!p.src || !fs.existsSync(path.join(ROOT, p.src))) { bad('照片资产缺失: ' + p.id + ' → ' + p.src); missAsset++; }
});
check(missAsset === 0, '全部照片 SVG 资产存在于磁盘');
/* 聊天内嵌照片引用 */
let badRef = 0;
chats.forEach(c => (c.messages || []).forEach(m => {
  if (m.photo && !byId(m.photo)) { bad('聊天 ' + c.id + ' 消息 ' + m.id + ' 引用了不存在的照片 ' + m.photo); badRef++; }
}));
check(badRef === 0, '聊天内嵌照片引用全部有效');
/* 历史/书签 → 页面引用 */
let badPage = 0;
browser.history.concat(browser.bookmarks).forEach(h => {
  if (h.page && !byId(h.page)) { bad('浏览记录 ' + h.id + ' 引用不存在的页面 ' + h.page); badPage++; }
});
check(badPage === 0, '历史/书签的页面引用全部有效');
/* intro/ending 引用 */
((LL.intro || {}).cards || []).forEach((c, i) => { if (c.photo && !byId(c.photo)) bad('intro 卡片' + i + ' 引用不存在照片 ' + c.photo); });
(((LL.ending || {}).epilogue) || []).forEach((c, i) => { if (c.photo && !byId(c.photo)) bad('ending 卡片' + i + ' 引用不存在照片 ' + c.photo); });

section('3. 锁 / 密码 / 答案一致性');
const lockExpect = {
  L0: { kind: 'login', answers: ['0812'] },
  L1: { kind: 'folder', target: '/文档/工作/归档', answers: ['1024'] },
  L2: { kind: 'album', target: 'hidden06', answers: ['m31'] },
  L3: { kind: 'zip', target: 'file:dl-starfall', answers: ['天津四', 'deneb'], gate: 'deduction' }
};
Object.keys(lockExpect).forEach(lid => {
  const L = locks[lid], E = lockExpect[lid];
  if (!L) { bad('缺少锁 ' + lid); return; }
  check(L.kind === E.kind, lid + ' kind=' + L.kind);
  if (E.target) check(L.target === E.target, lid + ' target=' + L.target);
  if (E.gate) check(L.gate === E.gate, lid + ' gate=' + L.gate);
  const ans = (L.answers || []).map(a => String(a).toLowerCase());
  E.answers.forEach(a => check(ans.indexOf(String(a).toLowerCase()) >= 0, lid + ' 接受密码「' + a + '」'));
});
/* 锁目标存在 */
const folderPaths = new Set();
files.forEach(f => { const parts = String(f.path || '').split('/').filter(Boolean); parts.pop(); let acc = ''; parts.forEach(p => { acc += '/' + p; folderPaths.add(acc); }); });
check(folderPaths.has('/文档/工作/归档'), 'L1 目标文件夹 /文档/工作/归档 存在（由文件路径推导）');
check(photos.some(p => p.album === 'hidden06'), 'L2 隐藏相簿 hidden06 有照片');
check(photos.filter(p => p.album === 'hidden06').length === 5, 'hidden06 照片数 = 5（实际 ' + photos.filter(p => p.album === 'hidden06').length + '）');
check(byId('file:dl-starfall'), 'L3 目标 starfall.zip 存在');
const archFiles = files.filter(f => String(f.path).indexOf('/文档/工作/归档/') === 0);
check(archFiles.length === 4, '归档文件夹内 4 个文件（实际 ' + archFiles.length + '）');
archFiles.forEach(f => check(f.lock === 'L1', '归档文件 ' + f.id + ' 标记 lock=L1'));

/* 推理答案 */
const expectAns = { Q1: 'C', Q2: 'B', Q3: 'D' };
(ded.questions || []).forEach(q => {
  check(expectAns[q.id] === q.correct, q.id + ' 正确答案=' + q.correct + '（期望 ' + expectAns[q.id] + '）');
  check((q.options || []).length === 5, q.id + ' 有 5 个选项');
  (q.options || []).forEach(o => { if (o.id !== q.correct) check(!!(q.wrongFeedback && q.wrongFeedback[o.id]), q.id + ' 选项 ' + o.id + ' 有错误反馈'); });
});
/* 每个正确答案 ≥2 枚线索支撑 */
const support = { Q1: ['CL-M1', 'CL-M2', 'CL-M3', 'CL-M5'], Q2: ['CL-P1', 'CL-P2', 'CL-P3', 'CL-P4', 'CL-P5'], Q3: ['CL-M4', 'CL-M2'] };
Object.keys(support).forEach(q => check(support[q].filter(c => clues[c]).length >= 2, q + ' 的支撑线索齐备'));

section('4. 日期与时间线一致性（Bible §3/§9）');
const CUT = '2026-06-11 23:47';
function tsOf(it) { return String(it.date || it.ts || '').slice(0, 16); }
let late = 0;
function checkNotLate(kind, it) {
  if (it.external) return;
  const t = tsOf(it);
  if (!t) return;
  if (t > CUT) {
    /* 允许：玩家开机日志、结局明信片、警方通报等 external 标记；其余视为违规 */
    bad(kind + ' ' + it.id + ' 日期 ' + t + ' 晚于最后登录 ' + CUT + '，且未标记 external');
    late++;
  }
}
files.forEach(f => checkNotLate('文件', f));
emails.forEach(m => checkNotLate('邮件', m));
photos.forEach(p => checkNotLate('照片', p));
browser.pages.forEach(p => checkNotLate('网页', p));
browser.history.forEach(h => checkNotLate('历史', h));
calendar.forEach(c => { if (!c.external && String(c.date) > '2026-09-10') { bad('日历 ' + c.id + ' 日期 ' + c.date + ' 晚于故事开始日 2026-09-10'); late++; } });
notes.forEach(n => checkNotLate('备忘录', n));
syslogs.forEach(l => { if (l.id !== 'log:syslog-0910-boot' && !l.external && String(l.ts).slice(0, 16) > '2026-06-12 03:00') { bad('日志 ' + l.id + ' 时间异常: ' + l.ts); late++; } });
chats.forEach(c => (c.messages || []).forEach(m => { if (String(m.ts) > '2026-06-12 11:00') { bad('聊天消息 ' + m.id + ' 时间过晚: ' + m.ts); late++; } }));
check(late === 0, '所有内容日期不晚于失踪节点（external 除外）');

/* 关键时间点 */
function expectTime(id, prefix, label) {
  const it = DB.byId ? DB.byId[id] : null;
  const t = it ? String(it.ts || it.date || '') : '';
  check(t.indexOf(prefix) === 0, label + ': ' + id + ' = ' + t + '（期望 ' + prefix + '）');
}
expectTime('log:syslog-0528-login', '2026-05-28 22:14', '异常登录');
expectTime('log:syslog-0611-login', '2026-06-11 23:47', '最后一次登录');
expectTime('log:syslog-0612-task', '2026-06-12 02:15', '计划任务执行');
expectTime('hist:hist-0609-lenghu', '2026-06-09', '冷湖天气查询');
expectTime('photo:ph-chenyu-phone', '2026-06-04 21:37', '偷拍照片');
expectTime('photo:ph-river-0611', '2026-06-11 22:03', '江边最后一张');
expectTime('note:note-scheduled-msg', '2026-06-10', '定时消息文案');
expectTime('chat:msg-chenyu-0611-recall', '2026-06-1', '陈屿撤回消息');
const calOvertime = calendar.find(c => c.id === 'cal:cal-0528' || /0528/.test(c.id));
check(calOvertime && String(calOvertime.date).indexOf('2026-05-28') === 0, '5-28 加班日历存在（与异常登录互证）');
check(calOvertime && /19:00/.test(String(calOvertime.time) + String(calOvertime.note || '')) && /23:30/.test(String(calOvertime.time) + String(calOvertime.note || '')), '5-28 加班时段 19:00–23:30 可见');
const calDunhuang = calendar.find(c => /敦煌/.test(String(c.title)));
check(calDunhuang && calDunhuang.deleted === true, '被删除的「出差·敦煌」日历存在且标记 deleted');

/* 聊天时间升序 */
let unsorted = 0;
chats.forEach(c => {
  const ts = (c.messages || []).map(m => String(m.ts));
  for (let i = 1; i < ts.length; i++) if (ts[i] < ts[i - 1]) { bad('会话 ' + c.id + ' 消息时间非升序：' + ts[i - 1] + ' → ' + ts[i]); unsorted++; break; }
});
check(unsorted === 0, '全部会话消息按时间升序');

section('5. 人名一致性（Bible §1 canonical）');
const FORBIDDEN_VARIANTS = ['陈宇', '陈裕', '陈禹', '苏情', '苏青', '周明元', '周明苑', '何姗', '何珊珊', '郑南', '王秀莲', '叶知邱', '林晩', '晩风', '慧语科技', '汇语', '启帆科技', '冷胡', '冷湖镇'];
function allText() {
  const chunks = [];
  files.forEach(f => chunks.push([f.id, (f.body || '') + ' ' + (f.path || '')]));
  emails.forEach(m => chunks.push([m.id, (m.subject || '') + ' ' + (m.body || '') + ' ' + ((m.from || {}).name || '')]));
  chats.forEach(c => { chunks.push([c.id, c.name || '']); (c.messages || []).forEach(m => chunks.push([m.id, m.text || ''])); });
  photos.forEach(p => chunks.push([p.id, (p.title || '') + ' ' + (p.caption || '') + ' ' + (p.story || '')]));
  browser.pages.forEach(p => chunks.push([p.id, (p.title || '') + ' ' + (p.body || '')]));
  browser.history.forEach(h => chunks.push([h.id, (h.title || '') + ' ' + (h.url || '')]));
  calendar.forEach(c => chunks.push([c.id, (c.title || '') + ' ' + (c.note || '')]));
  syslogs.forEach(l => chunks.push([l.id, l.text || '']));
  notes.forEach(n => chunks.push([n.id, (n.title || '') + ' ' + (n.body || '')]));
  return chunks;
}
const texts = allText();
let variants = 0;
FORBIDDEN_VARIANTS.forEach(v => {
  texts.forEach(([id, t]) => {
    if (t.indexOf(v) >= 0) { bad('出现非 canonical 名称「' + v + '」于 ' + id); variants++; }
  });
});
check(variants === 0, '无非 canonical 人名/机构名变体');
/* canonical 名字确实出现 */
['林晚', '陈屿', '苏晴', '周明远', '何珊', '郑楠', '王秀兰', '叶知秋'].forEach(n => {
  check(texts.some(([, t]) => t.indexOf(n) >= 0), 'canonical 名字「' + n + '」在内容中出现');
});
/* 猫的一致性：6-08 之后不得出现猫在身边 */
const catLate = texts.filter(([id, t]) => /栗子/.test(t) && /(趴在|抱着|在脚边|蹭我)/.test(t)).map(([id]) => id);
check(catLate.length === 0, '猫「栗子」无失踪期在身边的描写' + (catLate.length ? '：' + catLate.join(',') : ''), true);

section('6. 关键数字一致性（Bible §9.5）');
function textOf(id) { const it = (DB.byId || {})[id]; if (!it) return ''; return JSON.stringify(it); }
check(/92\.4/.test(textOf('file:doc-report')), '发布版报告含 92.4%');
check(/0\.781|78\.1/.test(textOf('file:doc-rawlog')), '原始日志含 78.1%/0.781');
check(/92\.4/.test(textOf('page:huiyu-pr')), '官网 PR 含 92.4%');
check(/\(2026\)鄂01民初1024号|（2026）鄂01民初1024号/.test(textOf('page:court-1024')), '法院页含案号 (2026)鄂01民初1024号');
check(/1024/.test(textOf('file:doc-diary-0518')) === false, '日记 0518 不直接写出案号（只说「那个案号」）');
check(/300,000|30万|叁拾万/.test(textOf('photo:ph-receipt-qifan')), '启帆凭条金额 30 万');
check(/1\.2\s?GB|1\.2G/i.test(textOf('log:syslog-0608-usb')), 'USB 写入 1.2GB');
check(/23:52/.test(textOf('note:note-scheduled-msg')), '定时消息文案含 23:52');
check(/00:40|0时40/.test(textOf('page:news-police-0614')), '警方通报含 00:40（或公文写法 0时40分）');
check(/09:30|9时30/.test(textOf('page:news-police-0614')), '警方通报含 09:30（或公文写法 09时30分）');
check(/2026-06-13|06-13|6月13/.test(textOf('photo:ph-ticket-12306')), '候补车票日期 6-13（晚于失踪日）');
check(/天津四/.test(textOf('photo:ph-perseid-2019')), '2019 流星雨照片提到天津四（L3 密码来源）');
check(/M31|仙女座/.test(textOf('photo:ph-m31-2019')), 'M31 照片提到 M31/仙女座（L2 密码来源）');
check(/英仙座/.test(textOf('file:doc-staratlas')) && /8月12|08-12|8-12/.test(textOf('file:doc-staratlas')), '星图笔记含英仙座与 8-12（L0 密码来源）');
const zq = chats.find(c => c.peer === 'yezhiqiu' || /知秋/.test(c.name || ''));
check(!!zq, '存在与叶知秋（玩家）的会话');
if (zq) {
  const all = (zq.messages || []).map(m => m.text || '').join(' ');
  check(/M31|仙女座/.test(all), '知秋会话含 M31/仙女座（L2 来源）');
  check(/天津四/.test(all), '知秋会话含天津四（L3 来源）');
  check(/等我消息/.test(all), '知秋会话含 6-09「等我消息」');
}
const sq = chats.find(c => /苏晴/.test(c.name || ''));
check(sq && /纸鹤飞的时候/.test((sq.messages || []).map(m => m.text || '').join(' ')), '苏晴会话含暗号「纸鹤飞的时候」');

section('7. 提示分级不泄底（Bible §7）');
const GLOBAL_T1 = ['自导自演', '假失踪', '伪造失踪', '内鬼', '出卖', '背叛', '冷湖', '青海', '天津四', 'deneb', 'Deneb', 'M31', 'm31', '仙女座', '1024', '0812', '灭口', '陈屿'];
const GLOBAL_T2 = ['自导自演', '假失踪', '伪造失踪', '内鬼', '出卖', '背叛', '冷湖', '青海', '天津四', 'deneb', 'Deneb'];
hints.forEach(g => {
  if (!g.tiers || g.tiers.length !== 3) { bad('提示组 ' + g.id + ' 不是 3 级'); return; }
  const sw = g.spoilWords || [];
  [[1, GLOBAL_T1], [2, GLOBAL_T2], [3, []]].forEach(([t, globals]) => {
    const txt = g.tiers[t - 1] || '';
    const forbid = globals.concat(t === 3 ? [] : sw);
    forbid.forEach(w => { if (txt.indexOf(w) >= 0) bad('提示 ' + g.id + ' 第' + t + '级泄底：含「' + w + '」'); });
  });
});
check(true, '提示分级检查执行完毕（' + hints.length + ' 组）');
const hintTargets = hints.map(h => h.target);
['L0', 'L1', 'L2', 'L3', 'Q1', 'Q2', 'Q3', 'chain-work', 'chain-personal', 'chain-missing'].forEach(t => check(hintTargets.indexOf(t) >= 0, '存在提示组 target=' + t));

section('8. 可达性（无循环依赖，攻略路径成立）');
/* 每个锁的密码来源必须在不依赖该锁的内容里 */
const LOCK_SOURCES = {
  L1: ['page:court-1024', 'file:doc-diary-0518'],
  L2: ['photo:ph-m31-2019', 'note:note-zhiqiu'],
  L3: ['photo:ph-perseid-2019', 'note:note-zhiqiu']
};
Object.keys(LOCK_SOURCES).forEach(lid => {
  LOCK_SOURCES[lid].forEach(src => {
    const it = (DB.byId || {})[src];
    if (!it) { bad(lid + ' 的密码来源不存在: ' + src); return; }
    const insideL1 = it.path && String(it.path).indexOf('/文档/工作/归档/') === 0;
    const insideL2 = it.album === 'hidden06';
    const selfLock = (it.lock === lid) || (lid === 'L1' && insideL1) || (lid === 'L2' && insideL2);
    check(!selfLock, lid + ' 的密码来源 ' + src + ' 不在该锁内部（无循环）');
  });
});
/* L0 来源在 intro（无锁） */
check(/流星雨/.test(JSON.stringify(LL.intro || {})), 'L0 密码提示出现在开场（intro）');
/* 推理所需线索均可在 L3 之前获得 */
const needForDeduction = ['CL-M1', 'CL-M2', 'CL-M3', 'CL-M5', 'CL-P1', 'CL-P2', 'CL-P3', 'CL-P4', 'CL-P5', 'CL-M4'];
needForDeduction.forEach(cid => {
  const src = clues[cid] && clues[cid].source;
  const it = src ? (DB.byId || {})[src] : null;
  if (!it) { bad('推理必需线索 ' + cid + ' 载体缺失'); return; }
  const requiresL3 = it.lock === 'L3' || (it.path && String(it.path).indexOf('starfall') >= 0);
  check(!requiresL3, '线索 ' + cid + ' 不依赖 L3（推理→L3 顺序成立）');
});
/* 全部 17 线索载体存在且可在 UI 打开 */
CLUE_IDS.forEach(cid => {
  const app = clues[cid].sourceApp;
  check(['files', 'mail', 'chat', 'photos', 'browser', 'logs', 'notes'].indexOf(app) >= 0, '线索 ' + cid + ' 的 sourceApp 合法（' + app + '）');
});

section('9. 内容质量护栏');
const PLACEHOLDER = ['TODO', 'TBD', 'lorem', 'Lorem', '占位', '待补充', '示例文本', 'placeholder', 'XXX内容'];
let ph = 0;
texts.forEach(([id, t]) => PLACEHOLDER.forEach(p => { if (t.indexOf(p) >= 0) { bad(id + ' 含占位文本「' + p + '」'); ph++; } }));
check(ph === 0, '无占位/待补充文本');
let empty = 0;
files.forEach(f => { if ((f.kind === 'text' || f.kind === 'md') && (!f.body || String(f.body).trim().length < 20)) { bad('文件 ' + f.id + ' 正文过短'); empty++; } });
emails.forEach(m => { if (!m.body || String(m.body).trim().length < 20) { if (m.id === 'email:mail-draft-zhiqiu') return; bad('邮件 ' + m.id + ' 正文过短'); empty++; } });
photos.forEach(p => { if (!p.story || String(p.story).length < 20) { bad('照片 ' + p.id + ' story 过短'); empty++; } });
browser.pages.forEach(p => { if (!p.body || String(p.body).length < 120) { bad('网页 ' + p.id + ' 正文过短'); empty++; } });
chats.forEach(c => (c.messages || []).forEach(m => { if (m.type === 'text' && (!m.text || !String(m.text).trim())) { bad('空消息 ' + m.id); empty++; } }));
check(empty === 0, '无空内容条目');
/* 每份文件/邮件必须有日期 */
let noDate = 0;
files.forEach(f => { if (!f.date) { bad('文件缺日期 ' + f.id); noDate++; } });
emails.forEach(m => { if (!m.date) { bad('邮件缺日期 ' + m.id); noDate++; } });
photos.forEach(p => { if (!p.date) { bad('照片缺日期 ' + p.id); noDate++; } });
check(noDate === 0, '全部条目带日期');

section('10. 伏笔先于揭示（Bible §4）');
function dateOf(id) { const it = (DB.byId || {})[id]; return it ? String(it.ts || it.date || '') : ''; }
check(dateOf('chat:msg-chenyu-0502') < dateOf('photo:ph-chenyu-phone'), 'F1-b 启帆伏笔(5-02) 早于 揭示照片(6-04)');
check(dateOf('photo:ph-chenyu-phone') <= dateOf('email:mail-draft-chenyu'), '偷拍(6-04) 不晚于 质问草稿(6-06)');
check(dateOf('log:syslog-0528-login') < dateOf('photo:ph-chenyu-phone'), '异常登录(5-28) 早于 偷拍(6-04)');
check(dateOf('note:note-scheduled-msg') < '2026-06-11 23:52', '定时消息文案(6-10) 早于 消息发出(6-11 23:52)');
check(dateOf('photo:ph-ticket-12306') < '2026-06-12', '车票截图(6-09) 早于失踪日');
check(/2026-06-13|06-13|6月13/.test(JSON.stringify((DB.byId || {})['photo:ph-ticket-12306'] || {})), '车票行程日期为 6-13（矛盾点成立）');
check(dateOf('photo:ph-threat-letter') >= '2026-06-07', '威胁信照片日期 = 6-07');
const recallMsgs = (chats.find(c => /陈屿/.test(c.name || '')) || { messages: [] }).messages.filter(m => m.type === 'recalled');
check(recallMsgs.length >= 1, '陈屿会话存在撤回消息（CL-P5）');

/* ---------- 汇总 ---------- */
console.log('\n' + C.d + '----------------------------------------' + C.x);
if (fail === 0) console.log(C.g + '全部通过：' + pass + ' 项检查，' + warn + ' 项提醒。' + C.x);
else {
  console.log(C.r + '失败 ' + fail + ' 项' + C.x + '（通过 ' + pass + '，提醒 ' + warn + '）：');
  failures.slice(0, 60).forEach(f => console.log('  - ' + f));
  if (failures.length > 60) console.log('  …另有 ' + (failures.length - 60) + ' 项');
}
process.exit(fail === 0 ? 0 : 1);
