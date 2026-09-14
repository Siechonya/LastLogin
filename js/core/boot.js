/* boot.js — 开场、启动动画、锁屏、桌面、壁纸、图标、时钟、系统菜单 */
(function () {
  var Boot = (globalThis.Boot = {});
  var Sys = (globalThis.SystemUI = {});

  /* ================= 壁纸：星空 canvas ================= */
  var stars = [], twink = [], rafT = null;
  function lcg(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  function buildStars(w, h) {
    var rnd = lcg(20260812);
    stars = []; twink = [];
    var n = Math.round((w * h) / 5200);
    for (var i = 0; i < n; i++) {
      var s = { x: rnd() * w, y: rnd() * h, r: 0.35 + rnd() * 1.15, a: 0.18 + rnd() * 0.7, c: rnd() };
      stars.push(s);
      if (i % 9 === 0) twink.push({ s: s, ph: rnd() * Math.PI * 2, sp: 0.4 + rnd() * 1.1 });
    }
  }

  function drawSky(ctx, w, h, t) {
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0a0f1e'); g.addColorStop(0.55, '#0b1020'); g.addColorStop(1, '#0d1424');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    /* 银河带 */
    ctx.save();
    ctx.translate(w * 0.5, h * 0.5); ctx.rotate(-0.42); ctx.translate(-w * 0.5, -h * 0.5);
    var mg = ctx.createLinearGradient(0, h * 0.30, 0, h * 0.70);
    mg.addColorStop(0, 'rgba(120,150,220,0)');
    mg.addColorStop(0.5, 'rgba(140,165,225,0.075)');
    mg.addColorStop(1, 'rgba(120,150,220,0)');
    ctx.fillStyle = mg; ctx.fillRect(-w, h * 0.30, w * 3, h * 0.40);
    ctx.restore();

    /* 星星 */
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], a = s.a;
      ctx.beginPath();
      ctx.fillStyle = s.c > 0.93 ? 'rgba(232,196,140,' + a + ')' : (s.c > 0.86 ? 'rgba(170,210,235,' + a + ')' : 'rgba(226,234,250,' + a + ')');
      ctx.arc(s.x, s.y, s.r, 0, 6.284); ctx.fill();
    }
    /* 闪烁层 */
    for (var j = 0; j < twink.length; j++) {
      var o = twink[j];
      var aa = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.0011 * o.sp + o.ph));
      ctx.beginPath(); ctx.fillStyle = 'rgba(255,246,220,' + (aa * 0.85).toFixed(3) + ')';
      ctx.arc(o.s.x, o.s.y, o.s.r * 1.25, 0, 6.284); ctx.fill();
    }

    /* 夏季大三角（天津四最亮，琥珀色——伏笔） */
    function starAt(fx, fy, r, col, glow) {
      var x = w * fx, y = h * fy;
      if (glow) {
        var rg = ctx.createRadialGradient(x, y, 0, x, y, r * 9);
        rg.addColorStop(0, glow); rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, r * 9, 0, 6.284); ctx.fill();
      }
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.284); ctx.fill();
      return [x, y];
    }
    ctx.strokeStyle = 'rgba(150,175,220,0.16)'; ctx.lineWidth = 1;
    var p1 = starAt(0.76, 0.20, 2.3, 'rgba(255,232,190,0.95)', 'rgba(232,180,90,0.20)');
    var p2 = starAt(0.63, 0.34, 1.7, 'rgba(225,235,255,0.9)', null);
    var p3 = starAt(0.83, 0.42, 1.7, 'rgba(225,235,255,0.9)', null);
    ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]); ctx.closePath(); ctx.stroke();

    /* 暗角 */
    var vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
  }

  function paintWallpaper() {
    var cv = document.getElementById('wallpaper');
    if (!cv) return;
    var w = cv.clientWidth || window.innerWidth, h = cv.clientHeight || window.innerHeight;
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    buildStars(w, h);
    if (rafT) clearInterval(rafT);
    rafT = setInterval(function () {
      if (document.getElementById('desktop').classList.contains('hidden')) return;
      drawSky(ctx, w, h, Date.now());
    }, 140);
    drawSky(ctx, w, h, Date.now());
  }

  /* ================= 桌面图标 ================= */
  var APPS = [
    { id: 'files', label: '文件管理器', icon: 'files' },
    { id: 'mail', label: '云邮', icon: 'mail' },
    { id: 'chat', label: '纸鹤', icon: 'chat' },
    { id: 'photos', label: '相册', icon: 'photos' },
    { id: 'browser', label: 'Arc 浏览器', icon: 'browser' },
    { id: 'calendar', label: '日历', icon: 'calendar' },
    { id: 'logs', label: '系统日志', icon: 'logs' },
    { id: 'notes', label: '备忘录', icon: 'notes' },
    { id: 'investigate', label: '调查手册', icon: 'investigate' }
  ];

  function buildIcons() {
    var host = document.getElementById('icons');
    host.innerHTML = '';
    APPS.forEach(function (a) {
      var el = UI.h('div', { class: 'icon', 'data-testid': 'icon-' + a.id, title: a.label },
        UI.icon(a.icon), UI.h('span', { text: a.label }));
      el.style.color = a.id === 'investigate' ? '#e8b45a' : '#9fb4d8';
      el.addEventListener('click', function () { openApp(a.id); });
      host.appendChild(el);
    });
    /* 回收站 */
    var rb = UI.h('div', { class: 'icon', 'data-testid': 'icon-recycle', title: '回收站' }, UI.icon('recycle'), UI.h('span', { text: '回收站' }));
    rb.style.color = '#8fa3c4';
    rb.addEventListener('click', function () { Apps.files.openPath('/回收站'); });
    host.appendChild(rb);
    /* 桌面上的文件 */
    var desk = DB.root.folders['桌面'];
    if (desk) {
      desk.files.forEach(function (f) {
        var el = UI.h('div', { class: 'icon', 'data-testid': 'icon-' + f.id, title: f._name },
          UI.icon(f.kind === 'zip' ? 'zip' : 'file'), UI.h('span', { text: f._name }));
        el.style.color = '#c8d4ea';
        el.addEventListener('click', function () { Apps.files.openFile(f.id); });
        host.appendChild(el);
      });
    }
  }

  function openApp(id) {
    var A = globalThis.Apps || {};
    if (A[id] && A[id].open) A[id].open();
    else UI.toast('应用「' + id + '」还没准备好', { type: 'sys' });
  }
  Boot.openApp = openApp;

  /* ================= 时钟 ================= */
  function startClock() {
    var el = document.getElementById('clock-time');
    function tick() {
      var d = new Date();
      el.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }
    tick(); setInterval(tick, 15000);
  }

  /* ================= 系统菜单 ================= */
  Sys.init = function () {
    var btn = document.getElementById('start-btn');
    var menu = document.getElementById('start-menu');
    btn.addEventListener('click', function (e) { e.stopPropagation(); menu.classList.toggle('hidden'); });
    document.addEventListener('pointerdown', function (e) {
      if (!menu.classList.contains('hidden') && !e.target.closest('#start-menu') && !e.target.closest('#start-btn')) menu.classList.add('hidden');
    });
    menu.querySelector('[data-testid=sm-save]').addEventListener('click', function () { menu.classList.add('hidden'); Sys.openSave(); });
    menu.querySelector('[data-testid=sm-about]').addEventListener('click', function () { menu.classList.add('hidden'); Sys.about(); });
    menu.querySelector('[data-testid=sm-restart]').addEventListener('click', function () { menu.classList.add('hidden'); Sys.restart(); });
  };

  Sys.restart = function () {
    UI.confirm({ title: '重新开始', body: '将清空本机的全部进度（线索、解锁、提示、推理），回到收到包裹的那个傍晚。手动存档槽位不会被删除。', okLabel: '重新开始', okTestid: 'restart-ok' })
      .then(function (ok) { if (ok) { State.reset(); location.reload(); } });
  };

  Sys.about = function () {
    var c = DB.counts;
    UI.modal({
      wide: true, title: '关于本机 · ' + (DB.meta.osName || 'Aster OS') + ' ' + (DB.meta.osVersion || ''),
      bodyNode: UI.h('div', {},
        UI.h('p', { html: '用户：<b>' + UI.esc(DB.meta.user ? DB.meta.user.name : '') + '</b> · ' + UI.esc(DB.meta.email || '') + '<br>上次登录：' + UI.esc(DB.meta.lastLogin || '') + '<br>失踪备案：' + UI.esc(DB.meta.missingSince || '') }),
        UI.h('p', { style: { marginTop: '12px' }, html: '本机内容：文件 ' + c.files + ' · 邮件 ' + c.emails + ' · 聊天消息 ' + c.messages + ' · 照片 ' + c.photos + ' · 网页快照 ' + c.pages + ' · 历史记录 ' + c.history + ' · 日历 ' + c.calendar + ' · 日志 ' + c.syslogs + ' · 备忘录 ' + c.notes }),
        UI.h('p', { style: { marginTop: '12px', color: 'var(--tx3)', fontSize: '12.5px' }, text: '操作：单击桌面图标打开应用 · Ctrl+K 全局搜索 · 窗口可拖拽/缩放 · 进度自动保存在本浏览器。\n\n《最后一次登录》是一款单机叙事解谜游戏。所有人物、公司、案件、网页与聊天记录均为虚构，如有雷同纯属巧合。游戏运行时不联网、不调用任何模型。' })
      ),
      actions: [{ label: '关闭' }]
    });
  };

  Sys.openSave = function () {
    var content = UI.h('div', { style: { padding: '18px 22px', overflow: 'auto' } });
    function slotRow(n) {
      var info = State.slotInfo(n);
      var d = info ? State.describe(info) : null;
      var row = UI.h('div', { class: 'save-slot', 'data-testid': 'slot-' + n });
      row.appendChild(UI.h('div', { class: 'si', html: '<b>槽位 ' + n + '</b>' + (d ? ('线索 ' + d.clues + '/17 · 提示 ' + d.hints + ' 次 · ' + (d.ended ? '已通关' : (d.solved ? '已结案' : '调查中')) + ' · 游玩 ' + d.minutes + ' 分钟') : '（空）') }));
      var acts = UI.h('div', { class: 'acts' });
      var bSave = UI.h('button', { class: 'btn', text: '保存', 'data-testid': 'slot-save-' + n });
      bSave.addEventListener('click', function () { State.slotSave(n); UI.toast('已保存到槽位 ' + n, { type: 'sys' }); rerender(); });
      acts.appendChild(bSave);
      if (d) {
        var bLoad = UI.h('button', { class: 'btn', text: '读取', 'data-testid': 'slot-load-' + n });
        bLoad.addEventListener('click', function () {
          UI.confirm({ title: '读取存档', body: '当前未保存的进度将被槽位 ' + n + ' 覆盖。', okLabel: '读取' }).then(function (ok) {
            if (ok && State.slotLoad(n)) { location.reload(); }
          });
        });
        var bDel = UI.h('button', { class: 'btn', text: '删除' });
        bDel.addEventListener('click', function () { State.slotDelete(n); rerender(); });
        acts.appendChild(bLoad); acts.appendChild(bDel);
      }
      row.appendChild(acts);
      return row;
    }
    function rerender() {
      content.innerHTML = '';
      var cur = State.describe(State.data);
      content.appendChild(UI.h('div', { class: 'stat-grid' },
        UI.h('div', { class: 'stat-card' }, UI.h('div', { class: 'v', text: String(cur.clues) }), UI.h('div', { class: 'k', text: '线索 / 17' })),
        UI.h('div', { class: 'stat-card' }, UI.h('div', { class: 'v', text: String(cur.hints) }), UI.h('div', { class: 'k', text: '提示使用' })),
        UI.h('div', { class: 'stat-card' }, UI.h('div', { class: 'v', text: cur.ended ? '已通关' : (cur.solved ? '已结案' : '调查中') }), UI.h('div', { class: 'k', text: '进度' }))
      ));
      content.appendChild(UI.h('p', { style: { fontSize: '12.5px', color: 'var(--tx3)', marginBottom: '14px' }, text: '游戏会自动保存（当前浏览器本机）。你也可以用下面的槽位手动管理，或导出存档文件。' + (State.storageOK ? '' : ' ⚠ 当前浏览器禁用了本地存储，自动保存不可用，请用「导出存档」。') }));
      [1, 2, 3].forEach(function (n) { content.appendChild(slotRow(n)); });
      var row = UI.h('div', { style: { display: 'flex', gap: '10px', marginTop: '16px' } });
      var bExp = UI.h('button', { class: 'btn', text: '导出存档文件', 'data-testid': 'save-export' });
      bExp.addEventListener('click', function () {
        var blob = new Blob([State.exportJSON()], { type: 'application/json' });
        var a = UI.h('a', { href: URL.createObjectURL(blob), download: 'last-login-save.json' });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      });
      var bImp = UI.h('button', { class: 'btn', text: '导入存档文件' });
      var fin = UI.h('input', { type: 'file', accept: '.json,application/json', style: { display: 'none' } });
      fin.addEventListener('change', function () {
        var f = fin.files && fin.files[0]; if (!f) return;
        var rd = new FileReader();
        rd.onload = function () {
          if (State.importJSON(String(rd.result))) { UI.toast('存档已导入，即将重载', { type: 'sys' }); setTimeout(function () { location.reload(); }, 700); }
          else UI.toast('存档文件无法识别', { type: 'sys' });
        };
        rd.readAsText(f, 'utf-8');
      });
      bImp.addEventListener('click', function () { fin.click(); });
      row.appendChild(bExp); row.appendChild(bImp); row.appendChild(fin);
      content.appendChild(row);
    }
    rerender();
    WM.open({ appId: 'system', title: '存档管理', icon: 'files', width: 560, height: 520, content: content });
  };

  /* ================= 启动流程 ================= */
  function showDesktop(firstTime) {
    document.getElementById('lock').classList.add('hidden');
    document.getElementById('boot').classList.add('hidden');
    var d = document.getElementById('desktop');
    d.classList.remove('hidden');
    paintWallpaper();
    buildIcons();
    startClock();
    Search.rebuild();
    if (!State.storageOK) UI.toast('此浏览器禁用了本地存储：进度只保留在本次会话，请用「存档管理 → 导出存档」。', { type: 'sys', ms: 7000 });
    if (firstTime) {
      setTimeout(function () { UI.toast('上次登录：' + (DB.meta.lastLogin || '') + ' · 距今 91 天', { type: 'sys', ms: 5200 }); }, 700);
      if (DB.intro.firstClue && !State.hasClue(DB.intro.firstClue)) {
        setTimeout(function () {
          if (State.addClue(DB.intro.firstClue)) {
            var cl = DB.clues[DB.intro.firstClue];
            UI.toast(cl.title, { type: 'clue', title: '☆ 线索收藏 · ' + (DB.chains[cl.chain] ? DB.chains[cl.chain].name : ''), ms: 5200 });
          }
        }, 1800);
      }
    }
  }
  Boot.showDesktop = showDesktop;

  function bootAnim() {
    return new Promise(function (res) {
      var b = document.getElementById('boot');
      var lines = (DB.intro.bootLines || []).slice();
      var out = document.getElementById('boot-lines');
      b.classList.remove('hidden');
      out.textContent = '';
      var i = 0;
      (function step() {
        if (i < lines.length) {
          out.textContent += (i ? '\n' : '') + lines[i++];
          setTimeout(step, 420);
        } else setTimeout(res, 620);
      })();
    });
  }

  function showLock() {
    var lk = document.getElementById('lock');
    lk.classList.remove('hidden');
    var pass = document.getElementById('lock-pass');
    var msg = document.getElementById('lock-msg');
    var form = document.getElementById('lock-form');
    document.getElementById('lock-last').textContent = DB.meta.lastLogin || '';
    pass.value = ''; msg.textContent = '';
    setTimeout(function () { pass.focus(); }, 120);

    form.onsubmit = function (e) {
      e.preventDefault();
      var lock = DB.locks.L0;
      var v = pass.value.trim();
      var ok = (lock.answers || []).some(function (a) { return String(a).toLowerCase() === v.toLowerCase(); });
      if (ok) {
        State.solveLock('L0');
        State.data.loggedIn = true;
        State.save();
        lk.style.transition = 'opacity .5s'; lk.style.opacity = '0';
        setTimeout(function () { lk.classList.add('hidden'); lk.style.opacity = ''; showDesktop(true); }, 480);
      } else {
        msg.textContent = lock.wrong || '密码不正确。';
        pass.value = ''; pass.focus();
        lk.querySelector('.lock-card').animate(
          [{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
          { duration: 220 });
      }
    };
    document.getElementById('lock-hint').onclick = function () {
      var A = globalThis.Apps || {};
      if (A.investigate && A.investigate.hintModal) A.investigate.hintModal('L0');
      else UI.modal({ title: '提示', body: (DB.hints[0] && DB.hints[0].tiers[0]) || '想想流星雨。', actions: [{ label: '好' }] });
    };
  }

  Boot.start = function () {
    State.init();
    WM.init();
    Sys.init();
    Search.build();
    Search.init();

    if (State.data.loggedIn && State.data.introDone) { showDesktop(false); return; }

    UI.overlayCards(DB.intro.cards || [], { lastLabel: '按下电源键' }).then(function () {
      State.data.introDone = true;
      State.save();
      return bootAnim();
    }).then(function () {
      showLock();
    });
  };
})();
