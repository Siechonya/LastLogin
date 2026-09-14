/* tools/wordcount.js — 内容体量统计（交付报告用）
 * 用法：node tools/wordcount.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ctx = { console, JSON, Date, Math, Object, Array, String, Number, RegExp, Promise };
ctx.globalThis = ctx;
vm.createContext(ctx);
['00_meta.js', '11_files_work.js', '12_files_work2.js', '13_files_missing.js', '20_emails.js', '21_emails2.js', '30_chats_a.js', '30_chats_b.js', '30_chats_c.js', '30_chats_d.js', '40_photos.js', '50_browser.js', '60_misc.js'].forEach(f => {
  const p = path.join(ROOT, 'js', 'data', f);
  if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f });
});
const LL = ctx.LL || {};
LL.filesWork = (LL.filesWork || []).concat(LL.filesWork2 || []).concat(LL.filesMissing || []);
LL.emails = (LL.emails || []).concat(LL.emails2 || []);
LL.chats = (LL.chatsA || []).concat(LL.chatsB || []).concat(LL.chatsC || []).concat(LL.chatsD || []).concat(LL.chats || []);
function cn(s) { return (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length; }
function sum(arr, f) { return arr.reduce((n, x) => n + cn(f(x)), 0); }

const rows = [];
rows.push(['文件', sum(LL.filesWork || [], f => f.body), (LL.filesWork || []).length]);
rows.push(['邮件', sum(LL.emails || [], m => m.subject + m.body), (LL.emails || []).length]);
rows.push(['聊天', sum(LL.chats || [], c => (c.messages || []).map(m => m.text).join('')), (LL.chats || []).reduce((n, c) => n + (c.messages || []).length, 0)]);
rows.push(['照片说明', sum(LL.photos || [], p => p.title + p.caption + p.story), (LL.photos || []).length]);
rows.push(['网页快照', sum((LL.browser || {}).pages || [], p => p.title + p.body), ((LL.browser || {}).pages || []).length]);
rows.push(['历史记录', sum((LL.browser || {}).history || [], h => h.title), ((LL.browser || {}).history || []).length]);
rows.push(['日历/日志/备忘', sum(LL.calendar || [], c => c.title + c.note) + sum(LL.syslogs || [], l => l.text) + sum(LL.notes || [], n => n.title + n.body), (LL.calendar || []).length + (LL.syslogs || []).length + (LL.notes || []).length]);
rows.push(['开场/结局/提示/线索', cn(JSON.stringify(LL.intro || {})) + cn(JSON.stringify(LL.ending || {})) + cn(JSON.stringify(LL.hints || [])) + cn(JSON.stringify(LL.clues || {})), 0]);

let total = 0, items = 0;
console.log('内容体量（汉字数）');
rows.forEach(([k, v, n]) => { total += v; items += n; console.log('  ' + k.padEnd(14, '　') + String(v).padStart(6) + ' 字' + (n ? '（' + n + ' 条）' : '')); });
console.log('  ' + '合计'.padEnd(14, '　') + String(total).padStart(6) + ' 字 / ' + items + ' 条');
