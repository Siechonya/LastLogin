/* ui.js — DOM 工具、md 渲染、toast、模态框、密码框、覆盖层卡片、图标 */
(function () {
  var UI = (globalThis.UI = {});

  /* ---------- DOM ---------- */
  UI.h = function (tag, attrs) {
    var el = document.createElement(tag);
    var kids = Array.prototype.slice.call(arguments, 2);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'on') { Object.keys(v).forEach(function (ev) { el.addEventListener(ev, v[ev]); }); }
        else if (k.indexOf('data') === 0 && typeof v === 'object') { Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; }); }
        else el.setAttribute(k, v);
      });
    }
    kids.forEach(function (kid) {
      if (kid == null || kid === false) return;
      el.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    });
    return el;
  };

  UI.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /* ---------- md 子集渲染 ---------- */
  function inline(s) {
    return UI.esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }
  UI.md = function (src) {
    if (src == null) return '';
    var lines = String(src).replace(/\r/g, '').split('\n');
    var out = [], list = null, code = false, buf = [];
    function flushList() { if (list) { out.push('</ul>'); list = null; } }
    function flushPara() { if (buf.length) { out.push('<p>' + buf.map(inline).join('<br>') + '</p>'); buf = []; } }
    lines.forEach(function (ln) {
      if (/^```/.test(ln.trim())) {
        if (code) { out.push('<pre>' + UI.esc(buf.join('\n')) + '</pre>'); buf = []; code = false; }
        else { flushList(); flushPara(); code = true; }
        return;
      }
      if (code) { buf.push(ln); return; }
      var t = ln.trim();
      if (!t) { flushList(); flushPara(); return; }
      var m;
      if ((m = t.match(/^(#{1,4})\s+(.*)$/))) {
        flushList(); flushPara();
        var lv = Math.min(m[1].length, 3);
        out.push('<h' + lv + '>' + inline(m[2]) + '</h' + lv + '>');
      } else if (/^(-{3,}|\*{3,})$/.test(t)) { flushList(); flushPara(); out.push('<hr>'); }
      else if ((m = t.match(/^>\s?(.*)$/))) {
        flushList(); flushPara(); out.push('<blockquote>' + inline(m[1]) + '</blockquote>');
      } else if ((m = t.match(/^[-*+]\s+(.*)$/))) {
        flushPara(); if (!list) { out.push('<ul>'); list = 1; } out.push('<li>' + inline(m[1]) + '</li>');
      } else { flushList(); buf.push(t); }
    });
    if (code && buf.length) out.push('<pre>' + UI.esc(buf.join('\n')) + '</pre>');
    flushList(); flushPara();
    return out.join('');
  };

  /* ---------- 图标 ---------- */
  var I = UI.ICONS = {};
  function svg(inner, vb) { return '<svg viewBox="' + (vb || '0 0 24 24') + '" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>'; }
  I.files = svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>');
  I.mail = svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>');
  I.chat = svg('<path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z"/><path d="M8 11h8M8 14h5"/>');
  I.photos = svg('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4 4 3 3-2 4 3"/>');
  I.browser = svg('<circle cx="12" cy="12" r="9"/><path d="m15 9-2.4 5.6L7 17l2.4-5.6z"/>');
  I.calendar = svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>');
  I.logs = svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3M13 15h4"/>');
  I.notes = svg('<path d="M5 3h9l5 5v13H5z"/><path d="M14 3v5h5M8 12h8M8 16h5"/>');
  I.investigate = svg('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M8 10.5h5M10.5 8v5"/>');
  I.recycle = svg('<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6"/>');
  I.star = '<svg viewBox="0 0 24 24"><path d="M12 1.5 14 10l8.5 2-8.5 2-2 8.5-2-8.5L1.5 12 10 10z" fill="currentColor"/></svg>';
  I.starO = svg('<path d="M12 2.5 13.9 10l7.6 2-7.6 2-1.9 7.5L10.1 14 2.5 12l7.6-2z"/>');
  I.lock = svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>');
  I.folder = svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>');
  I.file = svg('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>');
  I.zip = svg('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M11 6v2M11 10v2M11 14v3h2v-3z"/>');
  I.image = svg('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4 4 3 3-2 4 3"/>');
  I.search = svg('<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/>');
  I.send = svg('<path d="M4 12 20 4l-6 16-2.5-6.5z"/>');
  I.check = svg('<path d="m5 13 4 4L19 7"/>');
  I.chevR = svg('<path d="m10 6 6 6-6 6"/>');
  I.chevD = svg('<path d="m6 10 6 6 6-6"/>');
  I.close = svg('<path d="M6 6l12 12M18 6 6 18"/>');
  I.min = svg('<path d="M6 12h12"/>');
  I.max = svg('<rect x="6" y="6" width="12" height="12" rx="1.5"/>');
  I.eye = svg('<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.6"/>');

  UI.icon = function (name, cls) {
    var wrap = document.createElement('span');
    wrap.innerHTML = I[name] || I.file;
    var s = wrap.firstChild;
    if (cls) s.setAttribute('class', cls);
    return s;
  };

  /* ---------- toast ---------- */
  UI.toastRoot = function () {
    var r = document.getElementById('toasts');
    if (!r) { r = UI.h('div', { id: 'toasts' }); document.body.appendChild(r); }
    return r;
  };
  UI.toast = function (msg, opts) {
    opts = opts || {};
    var root = UI.toastRoot();
    var t = UI.h('div', { class: 'toast ' + (opts.type || '') });
    if (opts.title) t.appendChild(UI.h('div', { class: 'tt', text: opts.title }));
    t.appendChild(UI.h('div', { text: msg }));
    root.appendChild(t);
    setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 450);
    }, opts.ms || 3800);
    return t;
  };

  /* ---------- 模态框 ---------- */
  UI.modal = function (cfg) {
    var bg = UI.h('div', { class: 'modal-bg' });
    var box = UI.h('div', { class: 'modal' + (cfg.wide ? ' wide' : '') });
    if (cfg.title) box.appendChild(UI.h('h3', { text: cfg.title }));
    if (cfg.bodyNode) box.appendChild(cfg.bodyNode);
    else if (cfg.body != null) box.appendChild(UI.h('p', { html: /^<[a-z]/i.test(String(cfg.body).trim()) ? cfg.body : UI.esc(cfg.body) }));
    var acts = UI.h('div', { class: 'm-acts' });
    var api = {
      el: bg, box: box, acts: acts,
      close: function () { if (bg.parentNode) bg.parentNode.removeChild(bg); if (cfg.onClose) cfg.onClose(); }
    };
    (cfg.actions || [{ label: '好' }]).forEach(function (a) {
      var b = UI.h('button', { class: 'btn ' + (a.cls || ''), text: a.label, 'data-testid': a.testid || '' });
      b.addEventListener('click', function () {
        if (a.onClick) { if (a.onClick(api) === false) return; }
        if (a.keepOpen !== true) api.close();
      });
      acts.appendChild(b);
      if (a.primary) api.primaryBtn = b;
    });
    box.appendChild(acts);
    bg.appendChild(box);
    bg.addEventListener('mousedown', function (e) { if (e.target === bg && cfg.dismissable !== false) api.close(); });
    document.body.appendChild(bg);
    return api;
  };

  UI.confirm = function (cfg) {
    return new Promise(function (res) {
      var done = false;
      var m = UI.modal({
        title: cfg.title || '确认', body: cfg.body || '',
        onClose: function () { if (!done) res(false); },
        actions: [
          { label: cfg.cancelLabel || '取消', onClick: function () { done = true; res(false); } },
          { label: cfg.okLabel || '确定', cls: 'primary', testid: cfg.okTestid || '', onClick: function () { done = true; res(true); } }
        ]
      });
      if (m.primaryBtn) m.primaryBtn.focus();
    });
  };

  /* ---------- 密码框（锁） ---------- */
  UI.passwordModal = function (lockId) {
    return new Promise(function (res) {
      var lock = DB.locks[lockId];
      if (!lock) { res(false); return; }
      var errEl = UI.h('div', { class: 'm-err' });
      var input = UI.h('input', { type: 'password', placeholder: lock.placeholder || '密码', 'data-testid': 'pw-input-' + lockId });
      var hintLink = UI.h('button', { class: 'linkish', text: '想不出来？看提示', 'data-testid': 'pw-hint-' + lockId });
      var body = UI.h('div', {}, UI.h('p', { text: '「' + lock.label + '」已加密。' }), input, errEl, hintLink);
      var m = UI.modal({
        title: '需要密码', bodyNode: body,
        actions: [
          { label: '取消', onClick: function () { res(false); } },
          { label: '解锁', cls: 'primary', testid: 'pw-ok-' + lockId, keepOpen: true, onClick: function (api) { trySubmit(api); } }
        ],
        onClose: function () { res(false); }
      });
      var finished = false;
      function finish(ok) { if (finished) return; finished = true; res(ok); }
      function trySubmit(api) {
        var v = (input.value || '').trim();
        var ok = (lock.answers || []).some(function (a) { return String(a).toLowerCase() === v.toLowerCase(); });
        if (ok) {
          State.solveLock(lockId);
          finish(true);
          api.close();
          UI.toast('已解锁：' + lock.label, { type: 'sys' });
        } else {
          errEl.textContent = lock.wrong || '密码错误。';
          input.select();
        }
      }
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); trySubmit(m); } });
      hintLink.addEventListener('click', function () {
        finish(false); m.close();
        if (globalThis.Apps && Apps.investigate) Apps.investigate.openHint(lockId);
      });
      setTimeout(function () { input.focus(); }, 60);
    });
  };

  /* ---------- 覆盖层卡片序列（开场/结局） ---------- */
  UI.overlayCards = function (cards, cfg) {
    cfg = cfg || {};
    return new Promise(function (res) {
      var ov = document.getElementById('overlay');
      ov.classList.remove('hidden');
      ov.innerHTML = '';
      var idx = 0;
      var card, dots, btn, btnRow;

      function photoSrc(pid) {
        var p = DB.photoById ? DB.photoById[pid] : null;
        return p ? p.src : null;
      }
      function render() {
        var c = cards[idx];
        ov.innerHTML = '';
        card = UI.h('div', { class: 'ov-card' + (c.kind === 'letter' ? ' letter' : ''), 'data-testid': 'ov-card-' + idx });
        if (c.title) card.appendChild(UI.h('div', { class: 'ov-title', text: c.title }));
        if (c.kind === 'photo' && c.photo) {
          var src = photoSrc(c.photo);
          if (src) card.appendChild(UI.h('img', { class: 'ov-photo', src: src, alt: c.title || '' }));
        }
        card.appendChild(UI.h('div', { class: 'ov-body', text: c.body || '' }));

        btnRow = UI.h('div', { class: 'ov-nav' });
        dots = UI.h('div', { class: 'ov-dots' });
        cards.forEach(function (_, i) { dots.appendChild(UI.h('i', { class: i === idx ? 'on' : '' })); });
        btn = UI.h('button', { class: 'btn primary', text: idx === cards.length - 1 ? (cfg.lastLabel || '继续') : '继续', 'data-testid': 'ov-next' });
        btn.addEventListener('click', next);
        btnRow.appendChild(dots);
        btnRow.appendChild(btn);
        card.appendChild(btnRow);
        ov.appendChild(card);
        card.scrollTop = 0;
        btn.focus({ preventScroll: true });
      }
      function next() {
        idx++;
        if (idx >= cards.length) { ov.classList.add('hidden'); ov.innerHTML = ''; res(); return; }
        render();
      }
      ov.addEventListener('keydown', function (e) { if (e.key === 'Enter') next(); });
      render();
    });
  };

  /* ---------- 线索按钮 ---------- */
  UI.clueButton = function (clueId, onChange) {
    if (!clueId || !DB.clues[clueId]) return null;
    var done = State.hasClue(clueId);
    var b = UI.h('button', {
      class: 'clue-btn' + (done ? ' done' : ''),
      'data-testid': 'clue-btn-' + clueId,
      html: (done ? UI.ICONS.check : UI.ICONS.starO) + '<span>' + (done ? '已收藏线索' : '收藏为线索') + '</span>'
    });
    if (!done) {
      b.addEventListener('click', function () {
        if (State.addClue(clueId)) {
          var cl = DB.clues[clueId];
          b.classList.add('done');
          b.innerHTML = UI.ICONS.check + '<span>已收藏线索</span>';
          UI.toast(cl.title, { type: 'clue', title: '☆ 线索收藏 · ' + (DB.chains[cl.chain] ? DB.chains[cl.chain].name : '') });
          if (globalThis.Apps && Apps.investigate) Apps.investigate.refresh();
          if (onChange) onChange(clueId);
        }
      });
    }
    return b;
  };

  UI.fmtMinutes = function (ms) {
    var m = Math.max(0, Math.round((ms || 0) / 60000));
    return m < 60 ? m + ' 分钟' : Math.floor(m / 60) + ' 小时 ' + (m % 60) + ' 分';
  };
})();
