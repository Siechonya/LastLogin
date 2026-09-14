/* core/main.js — 启动入口 */
(function () {
  /* 测试/调试挂钩 */
  globalThis.__TEST__ = {
    get DB() { return globalThis.DB; },
    get State() { return globalThis.State; },
    get Apps() { return globalThis.Apps; },
    get Search() { return globalThis.Search; },
    get WM() { return globalThis.WM; },
    get Boot() { return globalThis.Boot; },
    get Ending() { return globalThis.Ending; },
    get UI() { return globalThis.UI; },
    errors: []
  };

  window.addEventListener('error', function (e) {
    try { __TEST__.errors.push(String(e.message || e.error)); } catch (_) {}
    console.error('[game error]', e.message, e.filename, e.lineno);
  });
  window.addEventListener('unhandledrejection', function (e) {
    try { __TEST__.errors.push('promise: ' + String(e.reason)); } catch (_) {}
    console.error('[unhandled rejection]', e.reason);
  });

  function boot() {
    try {
      Boot.start();
    } catch (err) {
      console.error(err);
      var ov = document.getElementById('overlay');
      if (ov) {
        ov.classList.remove('hidden');
        ov.innerHTML = '';
        var c = document.createElement('div');
        c.className = 'ov-card';
        c.innerHTML = '<div class="ov-title">启动失败</div><div class="ov-body">游戏数据或脚本加载出错：\n' +
          String(err && err.message ? err.message : err).replace(/</g, '&lt;') +
          '\n\n请确认 js/data/ 下的内容文件齐全，或用浏览器控制台查看详情。</div>';
        ov.appendChild(c);
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
