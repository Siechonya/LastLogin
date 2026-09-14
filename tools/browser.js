/* tools/browser.js — puppeteer 公共封装：启动浏览器、收集错误、截图 */
'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const SHOT_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR, { recursive: true });

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
].filter(Boolean);

function findBrowser() {
  for (const p of CANDIDATES) if (fs.existsSync(p)) return p;
  throw new Error('找不到 Chrome/Edge，可设 CHROME_PATH 环境变量');
}

async function launch(opts) {
  const browser = await puppeteer.launch(Object.assign({
    executablePath: findBrowser(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900', '--force-device-scale-factor=1', '--hide-scrollbars']
  }, opts || {}));
  return browser;
}

async function newPage(browser, width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width: width || 1440, height: height || 900 });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => {
    const t = m.type();
    if (t === 'error' || t === 'warning') {
      const txt = m.text();
      if (/favicon|Failed to load resource.*404/i.test(txt)) return;
      errors.push(t + ': ' + txt);
    }
  });
  page.on('requestfailed', r => {
    const u = r.url();
    if (/favicon/.test(u)) return;
    errors.push('requestfailed: ' + u + ' ' + (r.failure() && r.failure().errorText));
  });
  page.errors = errors;
  return page;
}

async function shot(page, name) {
  const fp = path.join(SHOT_DIR, name + '.png');
  await page.screenshot({ path: fp });
  return fp;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function click(page, selector, opts) {
  await page.waitForSelector(selector, Object.assign({ visible: true, timeout: 8000 }, opts || {}));
  await page.click(selector);
}
async function type(page, selector, text) {
  await page.waitForSelector(selector, { visible: true, timeout: 8000 });
  await page.click(selector, { clickCount: 3 });
  await page.type(selector, text, { delay: 12 });
}
async function textOf(page, selector) {
  const el = await page.$(selector);
  return el ? (await page.evaluate(e => e.textContent, el)) : null;
}

module.exports = { launch, newPage, shot, sleep, click, type, textOf, SHOT_DIR };
