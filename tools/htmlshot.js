/* tools/htmlshot.js — 把本地 HTML 截成全页 PNG（目检排版用）
 * 用法：node tools/htmlshot.js <file.html> <out.png> */
'use strict';
const path = require('path');
const { launch, newPage, sleep } = require('./browser');

const [inHtml, outPng] = process.argv.slice(2);
if (!inHtml || !outPng) { console.error('用法: node tools/htmlshot.js <file.html> <out.png>'); process.exit(2); }

(async () => {
  const browser = await launch();
  const page = await newPage(browser, 900, 1200);
  const url = 'file:///' + path.resolve(inHtml).replace(/\\/g, '/');
  await page.goto(url, { waitUntil: 'load' });
  await sleep(600);
  await page.screenshot({ path: path.resolve(outPng), fullPage: true });
  console.log('截图: ' + path.resolve(outPng));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
