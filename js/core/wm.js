/* wm.js — 窗口管理：拖拽/缩放/最小化/最大化/关闭/任务栏 */
(function () {
  var WM = (globalThis.WM = {});
  var wins = [];
  var zTop = 100;
  var cascade = 0;
  var seq = 0;
  var host = null, taskHost = null;

  WM.init = function () {
    host = document.getElementById('windows');
    taskHost = document.getElementById('task-buttons');
  };

  function area() {
    return { w: host.clientWidth || window.innerWidth, h: host.clientHeight || (window.innerHeight - 48) };
  }

  WM.open = function (cfg) {
    if (cfg.singleton !== false) {
      var exist = WM.get(cfg.appId);
      if (exist) {
        WM.restore(exist);
        WM.focus(exist);
        if (exist.reopen) exist.reopen(cfg.payload);
        return exist;
      }
    }
    var id = 'w' + (++seq);
    var a = area();
    var w = Math.min(cfg.width || 760, a.w - 20);
    var h = Math.min(cfg.height || 520, a.h - 20);
    var off = (cascade++ % 7) * 28;
    var x = Math.max(6, Math.min((a.w - w) / 2 + off, a.w - w - 6));
    var y = Math.max(6, Math.min((a.h - h) / 2.6 + off, a.h - h - 6));

    var el = UI.h('div', { class: 'win' + (cfg.cls ? ' ' + cfg.cls : ''), 'data-testid': 'win-' + cfg.appId, 'data-win': id });
    el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.width = w + 'px'; el.style.height = h + 'px';

    var titlebar = UI.h('div', { class: 'win-titlebar', 'data-testid': 'wt-' + cfg.appId });
    if (cfg.icon) titlebar.appendChild(UI.icon(cfg.icon));
    titlebar.appendChild(UI.h('div', { class: 'win-title', text: cfg.title || '' }));
    var bMin = UI.h('button', { class: 'win-ctl', title: '最小化', html: UI.ICONS.min, 'data-testid': 'wmin-' + cfg.appId });
    var bMax = UI.h('button', { class: 'win-ctl', title: '最大化', html: UI.ICONS.max, 'data-testid': 'wmax-' + cfg.appId });
    var bClose = UI.h('button', { class: 'win-ctl close', title: '关闭', html: UI.ICONS.close, 'data-testid': 'wclose-' + cfg.appId });
    titlebar.appendChild(bMin); titlebar.appendChild(bMax); titlebar.appendChild(bClose);

    var body = UI.h('div', { class: 'win-body' });
    if (cfg.content) body.appendChild(cfg.content);
    var grip = UI.h('div', { class: 'win-resize' });

    el.appendChild(titlebar); el.appendChild(body); el.appendChild(grip);
    host.appendChild(el);

    var win = {
      id: id, appId: cfg.appId, el: el, body: body, titlebar: titlebar,
      title: cfg.title, icon: cfg.icon, minimized: false, maximized: false,
      prevRect: null, onClose: cfg.onClose || null, reopen: cfg.reopen || null,
      taskBtn: null
    };
    wins.push(win);

    /* 拖拽 */
    titlebar.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.win-ctl')) return;
      WM.focus(win);
      if (win.maximized) return;
      var sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop;
      titlebar.setPointerCapture(e.pointerId);
      function mv(ev) {
        var a2 = area();
        var nx = Math.max(-el.offsetWidth + 90, Math.min(ox + ev.clientX - sx, a2.w - 90));
        var ny = Math.max(0, Math.min(oy + ev.clientY - sy, a2.h - 34));
        el.style.left = nx + 'px'; el.style.top = ny + 'px';
      }
      function up(ev) {
        titlebar.releasePointerCapture(e.pointerId);
        titlebar.removeEventListener('pointermove', mv);
        titlebar.removeEventListener('pointerup', up);
      }
      titlebar.addEventListener('pointermove', mv);
      titlebar.addEventListener('pointerup', up);
    });
    titlebar.addEventListener('dblclick', function (e) { if (!e.target.closest('.win-ctl')) WM.toggleMax(win); });

    /* 缩放 */
    grip.addEventListener('pointerdown', function (e) {
      e.stopPropagation();
      WM.focus(win);
      var sx = e.clientX, sy = e.clientY, ow = el.offsetWidth, oh = el.offsetHeight;
      grip.setPointerCapture(e.pointerId);
      function mv(ev) {
        var a2 = area();
        el.style.width = Math.max(340, Math.min(ow + ev.clientX - sx, a2.w - el.offsetLeft)) + 'px';
        el.style.height = Math.max(220, Math.min(oh + ev.clientY - sy, a2.h - el.offsetTop)) + 'px';
      }
      function up() {
        grip.removeEventListener('pointermove', mv);
        grip.removeEventListener('pointerup', up);
      }
      grip.addEventListener('pointermove', mv);
      grip.addEventListener('pointerup', up);
    });

    bMin.addEventListener('click', function () { WM.minimize(win); });
    bMax.addEventListener('click', function () { WM.toggleMax(win); });
    bClose.addEventListener('click', function () { WM.close(win); });
    el.addEventListener('pointerdown', function () { WM.focus(win); }, true);

    WM.makeTaskButton(win);
    WM.focus(win);
    return win;
  };

  WM.makeTaskButton = function (win) {
    var b = UI.h('button', { class: 'task-btn active', 'data-testid': 'task-' + win.appId });
    if (win.icon) b.appendChild(UI.icon(win.icon));
    b.appendChild(UI.h('span', { text: win.title }));
    b.addEventListener('click', function () {
      if (win.minimized) { WM.restore(win); WM.focus(win); }
      else if (WM.top() === win) WM.minimize(win);
      else WM.focus(win);
    });
    win.taskBtn = b;
    taskHost.appendChild(b);
  };

  WM.focus = function (win) {
    wins.forEach(function (w) { w.el.classList.remove('focused'); if (w.taskBtn) w.taskBtn.classList.remove('active'); });
    win.el.style.zIndex = ++zTop;
    win.el.classList.add('focused');
    if (win.taskBtn) { win.taskBtn.classList.add('active'); win.taskBtn.classList.remove('min'); }
  };
  WM.top = function () {
    var t = null, z = -1;
    wins.forEach(function (w) { if (!w.minimized) { var zz = parseInt(w.el.style.zIndex || 0, 10); if (zz > z) { z = zz; t = w; } } });
    return t;
  };
  WM.minimize = function (win) {
    win.minimized = true;
    win.el.style.display = 'none';
    if (win.taskBtn) { win.taskBtn.classList.remove('active'); win.taskBtn.classList.add('min'); }
  };
  WM.restore = function (win) {
    win.minimized = false;
    win.el.style.display = '';
  };
  WM.toggleMax = function (win) {
    var a = area();
    if (!win.maximized) {
      win.prevRect = { l: win.el.style.left, t: win.el.style.top, w: win.el.style.width, h: win.el.style.height };
      win.el.style.left = '0px'; win.el.style.top = '0px';
      win.el.style.width = a.w + 'px'; win.el.style.height = a.h + 'px';
      win.el.classList.add('max'); win.maximized = true;
    } else {
      var r = win.prevRect || { l: '40px', t: '40px', w: '760px', h: '520px' };
      win.el.style.left = r.l; win.el.style.top = r.t; win.el.style.width = r.w; win.el.style.height = r.h;
      win.el.classList.remove('max'); win.maximized = false;
    }
  };
  WM.close = function (win) {
    if (win.onClose) { try { win.onClose(); } catch (e) { console.error(e); } }
    if (win.el.parentNode) win.el.parentNode.removeChild(win.el);
    if (win.taskBtn && win.taskBtn.parentNode) win.taskBtn.parentNode.removeChild(win.taskBtn);
    wins = wins.filter(function (w) { return w !== win; });
  };
  WM.closeApp = function (appId) {
    var w = WM.get(appId); if (w) WM.close(w);
  };
  WM.get = function (appId) {
    for (var i = 0; i < wins.length; i++) if (wins[i].appId === appId) return wins[i];
    return null;
  };
  WM.all = function () { return wins.slice(); };
  WM.setTitle = function (win, t) {
    win.title = t;
    var el = win.titlebar.querySelector('.win-title'); if (el) el.textContent = t;
    if (win.taskBtn) { var s = win.taskBtn.querySelector('span'); if (s) s.textContent = t; }
  };

  window.addEventListener('resize', function () {
    var a = area();
    wins.forEach(function (w) {
      if (w.maximized) { w.el.style.width = a.w + 'px'; w.el.style.height = a.h + 'px'; return; }
      w.el.style.left = Math.max(0, Math.min(w.el.offsetLeft, a.w - 90)) + 'px';
      w.el.style.top = Math.max(0, Math.min(w.el.offsetTop, a.h - 34)) + 'px';
      w.el.style.width = Math.min(w.el.offsetWidth, a.w - w.el.offsetLeft) + 'px';
      w.el.style.height = Math.min(w.el.offsetHeight, a.h - w.el.offsetTop) + 'px';
    });
  });
})();
