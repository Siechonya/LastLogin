/* tools/md2pdf.js — 把 markdown 文档排成可打印 PDF（Edge 无头打印，零外部依赖）
 * 用法：node tools/md2pdf.js <input.md> <output.pdf> [封面标题]
 * 例：  node tools/md2pdf.js docs/WALKTHROUGH.md docs/WALKTHROUGH.pdf "最后一次登录 · 通关攻略" */
'use strict';
const fs = require('fs');
const path = require('path');
const { launch, newPage } = require('./browser');

const [inMd, outPdf, coverTitle] = process.argv.slice(2);
if (!inMd || !outPdf) { console.error('用法: node tools/md2pdf.js <input.md> <output.pdf> [封面标题]'); process.exit(2); }

/* ---------- 极简 markdown 渲染（含表格） ---------- */
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function inline(s) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}
function isTableSep(line) { return /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.indexOf('-') >= 0; }
function splitRow(line) {
  let t = line.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|')) t = t.slice(0, -1);
  return t.split('|').map(c => c.trim());
}

function render(src) {
  const lines = String(src).replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0, list = null, code = false, buf = [];
  const flushList = () => { if (list) { out.push('</' + list + '>'); list = null; } };
  const flushPara = () => { if (buf.length) { out.push('<p>' + buf.map(inline).join('<br>') + '</p>'); buf = []; } };

  while (i < lines.length) {
    const ln = lines[i];
    const t = ln.trim();

    if (/^```/.test(t)) {
      if (code) { out.push('<pre>' + esc(buf.join('\n')) + '</pre>'); buf = []; code = false; }
      else { flushList(); flushPara(); code = true; }
      i++; continue;
    }
    if (code) { buf.push(ln); i++; continue; }

    if (!t) { flushList(); flushPara(); i++; continue; }

    let m;
    if ((m = t.match(/^(#{1,4})\s+(.*)$/))) {
      flushList(); flushPara();
      const lv = m[1].length;
      out.push('<h' + lv + '>' + inline(m[2]) + '</h' + lv + '>');
    } else if (/^(-{3,}|\*{3,})$/.test(t)) {
      flushList(); flushPara(); out.push('<hr>');
    } else if ((m = t.match(/^>\s?(.*)$/))) {
      flushList(); flushPara();
      const q = [m[1]];
      while (i + 1 < lines.length && /^>/.test(lines[i + 1].trim())) { i++; q.push(lines[i].trim().replace(/^>\s?/, '')); }
      out.push('<blockquote>' + q.map(inline).join('<br>') + '</blockquote>');
    } else if (t.startsWith('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      flushList(); flushPara();
      const head = splitRow(t); i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(splitRow(lines[i])); i++; }
      out.push('<table><thead><tr>' + head.map(c => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>' +
        rows.map(r => '<tr>' + r.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>');
      continue;
    } else if ((m = t.match(/^[-*+]\s+(.*)$/))) {
      flushPara(); if (list !== 'ul') { flushList(); out.push('<ul>'); list = 'ul'; }
      out.push('<li>' + inline(m[1]) + '</li>');
    } else if ((m = t.match(/^(\d+)[.)]\s+(.*)$/))) {
      flushPara(); if (list !== 'ol') { flushList(); out.push('<ol>'); list = 'ol'; }
      out.push('<li>' + inline(m[2]) + '</li>');
    } else {
      flushList(); buf.push(t);
    }
    i++;
  }
  if (code && buf.length) out.push('<pre>' + esc(buf.join('\n')) + '</pre>');
  flushList(); flushPara();
  return out.join('\n');
}

const mdSrc = fs.readFileSync(path.resolve(inMd), 'utf8');
const title = coverTitle || path.basename(inMd, '.md');
const today = new Date().toISOString().slice(0, 10);

const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm 16mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; font-size: 10.5pt; line-height: 1.75; color: #23272e; margin: 0; }
  .cover { page-break-after: always; padding-top: 34mm; text-align: center; }
  .cover .kicker { letter-spacing: .35em; color: #9a6b1f; font-size: 10pt; }
  .cover h1 { font-size: 26pt; margin: 10mm 0 6mm; color: #171a20; letter-spacing: .06em; }
  .cover .warn { display: inline-block; margin-top: 8mm; padding: 5mm 9mm; border: 1.2pt solid #b3402f; color: #b3402f; border-radius: 3mm; font-size: 11pt; line-height: 1.9; }
  .cover .meta { margin-top: 14mm; color: #6b7280; font-size: 9.5pt; }
  h1 { font-size: 17pt; color: #171a20; border-bottom: 1.6pt solid #d9a441; padding-bottom: 2mm; margin: 9mm 0 4mm; page-break-after: avoid; }
  h2 { font-size: 13.5pt; color: #7a5410; margin: 7mm 0 3mm; page-break-after: avoid; }
  h3 { font-size: 11.5pt; color: #374151; margin: 5mm 0 2mm; page-break-after: avoid; }
  p { margin: 2.4mm 0; text-align: justify; }
  ul, ol { margin: 2.4mm 0; padding-left: 7mm; }
  li { margin: 1.2mm 0; }
  code { font-family: Consolas, "JetBrains Mono", monospace; font-size: 9.5pt; background: #f3efe4; border: .4pt solid #e2d8bd; border-radius: 1.4mm; padding: .3mm 1.4mm; color: #7a5410; }
  pre { background: #f7f5ef; border: .5pt solid #ddd5c0; border-radius: 2mm; padding: 3mm 4mm; font-family: Consolas, monospace; font-size: 9pt; line-height: 1.6; white-space: pre-wrap; page-break-inside: avoid; }
  blockquote { margin: 3mm 0; padding: 2.5mm 5mm; border-left: 1.4pt solid #d9a441; background: #fbf7ec; color: #5b5344; border-radius: 0 2mm 2mm 0; }
  table { border-collapse: collapse; width: 100%; margin: 3mm 0; font-size: 9.5pt; page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  th { background: #f0e7d2; color: #5d4708; text-align: left; }
  th, td { border: .5pt solid #cfc6ad; padding: 1.8mm 2.6mm; vertical-align: top; }
  hr { border: none; border-top: .6pt solid #d8d2c2; margin: 6mm 0; }
  strong { color: #171a20; }
  a { color: #7a5410; text-decoration: none; }
  .foot { margin-top: 10mm; color: #9ca3af; font-size: 8.5pt; text-align: center; }
</style></head><body>
<div class="cover">
  <div class="kicker">THE LAST LOGIN · SPOILER GUIDE</div>
  <h1>${esc(title)}</h1>
  <div class="warn">剧透警告<br>本文件包含全部真相、密码与答案。<br>未通关前请勿阅读。</div>
  <div class="meta">《最后一次登录》单机叙事解谜游戏 · 生成日期 ${today}<br>仓库内源文件：docs/WALKTHROUGH.md</div>
</div>
${render(mdSrc)}
<div class="foot">《最后一次登录》· 所有人物、公司、案件与网页均为虚构</div>
</body></html>`;

(async () => {
  const browser = await launch();
  const page = await newPage(browser, 1000, 1400);
  await page.setContent(html, { waitUntil: 'load' });
  const out = path.resolve(outPdf);
  if (process.env.MD2PDF_HTML) {
    const htmlOut = out.replace(/\.pdf$/i, '.html');
    fs.writeFileSync(htmlOut, html, 'utf8');
    console.log('HTML 副产物: ' + htmlOut);
  }
  await page.pdf({
    path: out,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: '<div style="font-size:8px;color:#9ca3af;width:100%;text-align:center;font-family:Consolas,monospace;">《最后一次登录》攻略 · 第 <span class="pageNumber"></span> / <span class="totalPages"></span> 页</div>',
    margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' }
  });
  await browser.close();
  const st = fs.statSync(out);
  console.log('PDF 已生成: ' + out + ' (' + (st.size / 1024).toFixed(1) + ' KB)');
})().catch(e => { console.error(e); process.exit(1); });
