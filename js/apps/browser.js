/* apps/browser.js — Arc 浏览器（历史/书签/网页快照） */
(function () {
  var Apps = (globalThis.Apps = globalThis.Apps || {});
  var win = null, view = 'history', curPage = null, highlightHist = null;

  function ensure() {
    if (win && WM.get('browser')) { render(); WM.focus(WM.get('browser')); return; }
    var content = UI.h('div', { class: 'pane' });
    var side = UI.h('div', { class: 'pane-side', 'data-testid': 'br-side' });
    var main = UI.h('div', { class: 'pane-main', style: { display: 'flex', flexDirection: 'column', overflow: 'hidden' } });
    content.appendChild(side); content.appendChild(main);
    win = WM.open({
      appId: 'browser', title: 'Arc 浏览器', icon: 'browser', width: 980, height: 640, content: content,
      onClose: function () { win = null; }
    });
    win._side = side; win._main = main;
    render();
  }

  function sideItem(key, label, cnt) {
    var it = UI.h('div', { class: 'side-item' + (view === key && !curPage ? ' on' : ''), 'data-testid': 'br-' + key },
      UI.icon(key === 'bookmarks' ? 'star' : (key === 'pages' ? 'browser' : 'logs')),
      UI.h('span', { text: label }), UI.h('span', { class: 'cnt', text: String(cnt) }));
    it.addEventListener('click', function () { view = key; curPage = null; render(); });
    return it;
  }

  function renderSide() {
    var s = win._side; s.innerHTML = '';
    s.appendChild(UI.h('div', { class: 'side-group', text: 'Arc' }));
    s.appendChild(sideItem('history', '历史记录', DB.browser.history.length));
    s.appendChild(sideItem('bookmarks', '书签', DB.browser.bookmarks.length));
    s.appendChild(sideItem('pages', '网页快照', DB.browser.pages.length));
    s.appendChild(UI.h('div', { class: 'side-group', text: '说明' }));
    s.appendChild(UI.h('div', { style: { padding: '4px 14px', fontSize: '11.5px', color: 'var(--tx3)', lineHeight: '1.7' }, text: '这台电脑已离线 91 天。能打开的只有她留下的快照与记录。' }));
  }

  function clueMini(clueId, onDone) {
    if (!clueId || !DB.clues[clueId]) return null;
    var done = State.hasClue(clueId);
    var b = UI.h('button', { class: 'mini-btn' + (done ? ' done' : ''), 'data-testid': 'clue-btn-' + clueId, text: done ? '✓ 已收藏' : '☆ 收藏线索' });
    if (!done) b.addEventListener('click', function (e) {
      e.stopPropagation();
      if (State.addClue(clueId)) {
        b.classList.add('done'); b.textContent = '✓ 已收藏';
        var cl = DB.clues[clueId];
        UI.toast(cl.title, { type: 'clue', title: '☆ 线索收藏 · ' + (DB.chains[cl.chain] ? DB.chains[cl.chain].name : '') });
        if (Apps.investigate) Apps.investigate.refresh();
        if (onDone) onDone();
      }
    });
    return b;
  }

  function renderList() {
    var main = win._main; main.innerHTML = '';
    var bar = UI.h('div', { class: 'browser-bar' },
      UI.h('button', { class: 'btn', style: { padding: '4px 10px' }, text: '‹ 返回', 'data-testid': 'br-back', on: { click: function () { curPage = null; render(); } } }),
      UI.h('div', { class: 'url-box', text: 'arc://history' }),
      UI.h('span', { class: 'snap-badge', text: '离线快照' }));
    main.appendChild(bar);
    var body = UI.h('div', { style: { flex: '1', overflow: 'auto' } });
    main.appendChild(body);

    if (view === 'history') {
      var groups = {};
      DB.browser.history.slice().sort(function (a, b) { return String(b.ts).localeCompare(String(a.ts)); }).forEach(function (h) {
        var d = String(h.ts).slice(0, 10);
        (groups[d] = groups[d] || []).push(h);
      });
      Object.keys(groups).sort().reverse().forEach(function (d) {
        body.appendChild(UI.h('div', { class: 'hist-group', text: d + (d === '2026-06-09' ? ' · 六月' : '') }));
        groups[d].forEach(function (h) {
          var row = UI.h('div', { class: 'hist-item' + (h.clue ? ' clueable' : '') + (highlightHist === h.id ? ' on' : ''), 'data-testid': 'hist-' + h.id, style: highlightHist === h.id ? { background: 'rgba(232,180,90,.14)' } : {} },
            UI.h('span', { class: 'ht', text: String(h.ts).slice(11, 16) }),
            UI.h('div', { style: { flex: '1', minWidth: '0' } },
              UI.h('div', { class: 'htitle', text: h.title || h.url }),
              UI.h('div', { class: 'hurl', text: h.url || '' })),
            UI.h('div', { class: 'hist-tools' }, clueMini(h.clue, function () { render(); })));
          row.addEventListener('click', function () {
            if (h.page && DB.get(h.page)) { curPage = h.page; render(); }
            else UI.toast('这个页面没有留下快照。', { type: 'sys', ms: 2200 });
          });
          body.appendChild(row);
        });
      });
    } else if (view === 'bookmarks') {
      DB.browser.bookmarks.forEach(function (b) {
        var row = UI.h('div', { class: 'hist-item', 'data-testid': 'bm-' + b.id },
          UI.h('span', { class: 'ht', text: '★' }),
          UI.h('div', { style: { flex: '1', minWidth: '0' } },
            UI.h('div', { class: 'htitle', text: b.title }),
            UI.h('div', { class: 'hurl', text: b.url || '' })));
        row.addEventListener('click', function () {
          if (b.page && DB.get(b.page)) { curPage = b.page; render(); }
          else UI.toast('书签指向的页面没有快照。', { type: 'sys', ms: 2200 });
        });
        body.appendChild(row);
      });
    } else {
      DB.browser.pages.forEach(function (p) {
        var row = UI.h('div', { class: 'hist-item', 'data-testid': 'page-' + p.id },
          UI.h('span', { class: 'ht', text: String(p.date || '').slice(5, 10) }),
          UI.h('div', { style: { flex: '1', minWidth: '0' } },
            UI.h('div', { class: 'htitle', text: p.title }),
            UI.h('div', { class: 'hurl', text: (p.site || '') + ' · ' + (p.url || '') })),
          UI.h('div', { class: 'hist-tools' }, clueMini(p.clue, function () { render(); })));
        row.addEventListener('click', function () { curPage = p.id; render(); });
        body.appendChild(row);
      });
    }
  }

  function renderPage() {
    var p = DB.get(curPage);
    var main = win._main; main.innerHTML = '';
    if (!p) { renderList(); return; }
    State.markSeen(p.id);
    main.appendChild(UI.h('div', { class: 'browser-bar' },
      UI.h('button', { class: 'btn', style: { padding: '4px 10px' }, text: '‹ 返回', 'data-testid': 'br-back', on: { click: function () { curPage = null; render(); } } }),
      UI.h('div', { class: 'url-box', text: p.url || '', title: p.url || '' }),
      UI.h('span', { class: 'snap-badge', text: '网页快照' })));
    var scroller = UI.h('div', { style: { flex: '1', overflow: 'auto' } });
    var pv = UI.h('div', { class: 'page-view', 'data-testid': 'pageview-' + p.id });
    pv.appendChild(UI.h('div', { class: 'page-site', text: p.site || '' }));
    pv.appendChild(UI.h('div', { class: 'page-title', text: p.title || '' }));
    pv.appendChild(UI.h('div', { class: 'page-date', text: '快照时间：' + (p.date || '') + (p.external ? ' · 失踪之后的外部报道' : '') }));
    if (p.banner) pv.appendChild(UI.h('div', { class: 'mail-banner', text: p.banner }));
    var cb = UI.clueButton(p.clue, function () { render(); });
    if (cb) pv.appendChild(UI.h('div', { style: { marginBottom: '14px' } }, cb));
    pv.appendChild(UI.h('div', { class: 'md', html: UI.md(p.body) }));
    scroller.appendChild(pv);
    main.appendChild(scroller);
  }

  function render() {
    if (!win) return;
    renderSide();
    if (curPage) renderPage(); else renderList();
  }

  Apps.browser = {
    open: function () { ensure(); },
    openPage: function (id) { curPage = id; view = 'pages'; ensure(); render(); },
    openRef: function (id) {
      var it = DB.get(id);
      if (!it) return;
      if (it._kind === 'page') Apps.browser.openPage(id);
      else if (it._kind === 'hist') {
        view = 'history'; curPage = null; highlightHist = id;
        if (it.page && DB.get(it.page)) { /* 保留在列表，让玩家自己点 */ }
        ensure(); render();
        setTimeout(function () {
          var el = win && win._main.querySelector('[data-testid="hist-' + id + '"]');
          if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 80);
      } else if (it._kind === 'bookmark') { view = 'bookmarks'; curPage = null; ensure(); render(); }
    }
  };
})();
