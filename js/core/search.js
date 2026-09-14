/* search.js — 全局搜索（锁内容在解锁前不可见，保证谜题公平） */
(function () {
  var Search = (globalThis.Search = {});
  var index = [];

  function lockedFile(f) {
    if (!f || !f.path) return false;
    var lid = null;
    Object.keys(DB.locks).forEach(function (k) {
      var lk = DB.locks[k];
      if (lk.kind === 'folder' && f.path.indexOf(lk.target + '/') === 0) lid = k;
    });
    return lid ? !State.lockSolved(lid) : false;
  }
  function lockedPhoto(p) { return p.album === 'hidden06' && !State.lockSolved('L2'); }
  function lockedZip(f) { return f.id === 'file:dl-starfall' && !State.lockSolved('L3'); }

  function add(app, id, title, text) {
    index.push({ app: app, id: id, title: title || '', text: text || '' });
  }

  Search.build = function () {
    index = [];
    DB.files.forEach(function (f) {
      if (lockedFile(f)) return;
      var body = (f.kind === 'text' || f.kind === 'md') && !lockedZip(f) ? (f.body || '') : '';
      add('files', f.id, f._name || f.path, body);
    });
    DB.emails.forEach(function (m) {
      add('mail', m.id, (m.subject || '') + ' · ' + ((m.from && m.from.name) || ''), m.body || '');
    });
    DB.chats.forEach(function (c) {
      (c.messages || []).forEach(function (msg) {
        if (msg.type === 'recalled' || msg.type === 'sys') return;
        add('chat', msg.id, c.name + ' 的对话', msg.text || '');
      });
    });
    DB.photos.forEach(function (p) {
      if (lockedPhoto(p)) return;
      add('photos', p.id, p.title || '', (p.caption || '') + '\n' + (p.story || ''));
    });
    DB.browser.pages.forEach(function (pg) { add('browser', pg.id, pg.title || '', pg.body || ''); });
    DB.browser.history.forEach(function (hst) { add('browser', hst.id, hst.title || '', hst.url || ''); });
    DB.calendar.forEach(function (c) { add('calendar', c.id, c.title || '', c.note || ''); });
    DB.syslogs.forEach(function (l) { add('logs', l.id, '[' + l.type + '] ' + l.ts, l.text || ''); });
    DB.notes.forEach(function (n) { add('notes', n.id, n.title || '', n.body || ''); });
  };

  var APP_LABEL = { files: '文件', mail: '邮件', chat: '聊天', photos: '照片', browser: '浏览', calendar: '日历', logs: '系统日志', notes: '备忘录' };
  Search.appLabel = function (a) { return APP_LABEL[a] || a; };

  function snippet(text, q, firstTerm) {
    var t = String(text || '').replace(/\s+/g, ' ');
    var i = t.toLowerCase().indexOf(firstTerm);
    if (i < 0) i = 0;
    var s = Math.max(0, i - 26);
    var seg = (s > 0 ? '…' : '') + t.slice(s, s + 92) + (s + 92 < t.length ? '…' : '');
    var esc = UI.esc(seg);
    try {
      var re = new RegExp('(' + q.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'gi');
      esc = esc.replace(re, '<mark>$1</mark>');
    } catch (e) { /* 忽略 */ }
    return esc;
  }

  Search.query = function (raw, limit) {
    var q = String(raw || '').trim().toLowerCase();
    if (!q) return [];
    var terms = q.split(/\s+/).filter(Boolean);
    var out = [];
    for (var i = 0; i < index.length && out.length < (limit || 12) * 3; i++) {
      var it = index[i];
      var hayT = it.title.toLowerCase(), hayX = it.text.toLowerCase();
      var all = terms.every(function (w) { return hayT.indexOf(w) >= 0 || hayX.indexOf(w) >= 0; });
      if (!all) continue;
      var pos = hayX.indexOf(terms[0]);
      var score = (hayT.indexOf(terms[0]) >= 0 ? 0 : 1000) + (pos < 0 ? 500 : Math.min(pos, 500));
      out.push({ app: it.app, id: it.id, title: it.title, score: score, snip: snippet(it.text, terms, terms[0]) });
    }
    out.sort(function (a, b) { return a.score - b.score; });
    return out.slice(0, limit || 12);
  };

  /* 重建（解锁后调用，使新可见内容进入索引） */
  Search.rebuild = function () { Search.build(); };

  Search.open = function (r) {
    var A = globalThis.Apps || {};
    switch (r.app) {
      case 'files': return A.files && A.files.openFile(r.id);
      case 'mail': return A.mail && A.mail.open(r.id);
      case 'chat': return A.chat && A.chat.openMsg(r.id);
      case 'photos': return A.photos && A.photos.open(r.id);
      case 'browser': return A.browser && A.browser.openRef(r.id);
      case 'calendar': return A.calendar && A.calendar.openRef(r.id);
      case 'logs': return A.logs && A.logs.openRef(r.id);
      case 'notes': return A.notes && A.notes.openRef(r.id);
      default: UI.toast('无法打开该结果', { type: 'sys' });
    }
  };

  /* ---- 搜索框交互 ---- */
  Search.init = function () {
    var input = document.getElementById('global-search');
    var panel = document.getElementById('search-results');
    if (!input || !panel) return;

    function close() { panel.classList.add('hidden'); panel.innerHTML = ''; }
    function run() {
      var q = input.value.trim();
      if (!q) { close(); return; }
      var rs = Search.query(q, 10);
      panel.innerHTML = '';
      if (!rs.length) {
        panel.appendChild(UI.h('div', { class: 'sr-empty', text: '没有找到与「' + q + '」有关的内容。（有些内容需要解锁后才会出现在搜索里）' }));
      } else {
        rs.forEach(function (r) {
          var item = UI.h('div', { class: 'sr-item', 'data-testid': 'sr-' + r.id });
          item.appendChild(UI.h('div', { class: 'sr-title', html: UI.esc(r.title).replace(new RegExp('(' + q.split(/\s+/).map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'gi'), '<b>$1</b>') }));
          item.appendChild(UI.h('div', { class: 'sr-meta', text: Search.appLabel(r.app) }));
          if (r.snip) item.appendChild(UI.h('div', { class: 'sr-snip', html: r.snip }));
          item.addEventListener('click', function () { close(); input.blur(); Search.open(r); });
          panel.appendChild(item);
        });
      }
      panel.classList.remove('hidden');
    }
    input.addEventListener('input', function () { clearTimeout(input._t); input._t = setTimeout(run, 160); });
    input.addEventListener('focus', function () { if (input.value.trim()) run(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var first = panel.querySelector('.sr-item');
        if (first && !panel.classList.contains('hidden')) { first.click(); input.value = ''; close(); }
        else run();
      } else if (e.key === 'Escape') { close(); input.blur(); }
    });
    document.addEventListener('pointerdown', function (e) {
      if (!panel.classList.contains('hidden') && !e.target.closest('.search-wrap')) close();
    });
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); input.focus(); input.select(); }
    });
  };
})();
