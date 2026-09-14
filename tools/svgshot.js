/* tools/svgshot.js — 把 SVG 资产预览页截成 PNG，供人工视觉检查
 * 用法：node tools/svgshot.js */
'use strict';
const path = require('path');
const { launch, newPage, shot, sleep } = require('./browser');

(async () => {
  const browser = await launch();
  const page = await newPage(browser, 1360, 900);
  const url = 'file:///' + path.join(__dirname, 'svg-preview.html').replace(/\\/g, '/');
  await page.goto(url, { waitUntil: 'load' });
  await sleep(1200);
  const broken = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('img').forEach(im => {
      if (!im.naturalWidth || im.naturalWidth < 2) out.push(im.getAttribute('src'));
    });
    return out;
  });
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'svg-contact.png'), fullPage: true });
  console.log('截图: tools/screenshots/svg-contact.png');
  console.log(broken.length ? '加载失败的 SVG:\n  ' + broken.join('\n  ') : '全部 SVG 正常加载');
  await browser.close();
  process.exit(broken.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
