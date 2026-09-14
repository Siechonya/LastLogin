/* apps/logs.js — 系统日志查看器 */
(function () {
  var Apps = (globalThis.Apps = globalThis.Apps || {});
  var win = null, filterType = 'all', filterText = '', highlight = null;
  var TYPES = ['all', 'auth', 'usb', 'task', 'net', 'power', 'cal', 'sys'];
  var TYPE_LABEL = { all: '全部', auth: '登录', usb: 'USB', task: '计划任务', net: '网络', power: '电源', cal: '日历', sys: '系统' };

  function ensure() {
    if (win && WM.get('logs')) { render(); WM.focus(WM.get('logs')); return; }
    var content = UI.h('div', { style: { flex: '1', display: 'flex', flexDirection: 'column', overflow: 'hidden' } });
    win = WM.open({
      appId: 'logs', title: '系统日志', icon: 'logs', width: 900, height: 600, content: content,
      onClose: function () { win = null; }
    });
    win._main = content;
    render();
  }

  function rows() {
    return DB.syslogs.filter(function (l) {
      if (filterType !== 'all' && l.type !== filterType) return false;
      if (filterText && (l.text + ' ' + l.ts + ' ' + l.type).toLowerCase().indexOf(filterText.toLowerCase()) < 0) return false;
      return true;
    }).sort(function (a, b) { return String(a.ts).localeCompare(String(b.ts)); });
  }

  function render() {
    if (!win) return;
    var root = win._main; root.innerHTML = '';
    var bar = UI.h('div', { class: 'log-toolbar' });
    TYPES.forEach(function (t) {
      var b = UI.h('button', { class: 'log-filter' + (filterType === t ? ' on' : ''), text: TYPE_LABEL[t] || t, 'data-testid': 'logf-' + t });
      b.addEventListener('click', function () { filterType = t; render(); });
      bar.appendChild(b);
    });
    var inp = UI.h('input', { type: 'text', placeholder: '过滤日志…', value: filterText, 'data-testid': 'log-filter-input', style: { marginLeft: 'auto', background: '#0a0f1c', border: '1px solid var(--line)', borderRadius: '7px', padding: '5px 11px', fontSize: '12px', width: '170px', outline: 'none' } });
    inp.addEventListener('input', function () { filterText = inp.value; renderList(); });
    bar.appendChild(inp);
    root.appendChild(bar);

    var list = UI.h('div', { class: 'log-list', 'data-testid': 'log-list' });
    root.appendChild(list);
    win._list = list;
    renderList();
  }

  function renderList() {
    var list = win && win._list; if (!list) return;
    list.innerHTML = '';
    var rs = rows();
    if (!rs.length) { list.appendChild(UI.h('div', { class: 'empty-hint', text: '没有匹配的日志。' })); return; }
    rs.forEach(function (l) {
      var row = UI.h('div', { class: 'log-row' + (l.clue ? ' clueable' : ''), 'data-testid': 'log-' + l.id, style: highlight === l.id ? { background: 'rgba(232,180,90,.16)' } : {} },
        UI.h('span', { class: 'lts', text: l.ts }),
        UI.h('span', { class: 'ltype ' + l.type, text: TYPE_LABEL[l.type] || l.type }),
        UI.h('span', { class: 'ltxt', text: l.text }));
      if (l.clue) {
        var done = State.hasClue(l.clue);
        var b = UI.h('button', { class: 'mini-btn' + (done ? ' done' : ''), 'data-testid': 'clue-btn-' + l.clue, text: done ? '✓ 已收藏' : '☆ 收藏线索', style: { flex: 'none' } });
        if (!done) b.addEventListener('click', function () {
          if (State.addClue(l.clue)) {
            b.classList.add('done'); b.textContent = '✓ 已收藏';
            var cl = DB.clues[l.clue];
            UI.toast(cl.title, { type: 'clue', title: '☆ 线索收藏 · ' + (DB.chains[cl.chain] ? DB.chains[cl.chain].name : '') });
            if (Apps.investigate) Apps.investigate.refresh();
          }
        });
        row.appendChild(UI.h('span', { class: 'log-tools' }, b));
      }
      list.appendChild(row);
    });
    if (highlight) {
      setTimeout(function () {
        var el = list.querySelector('[data-testid="log-' + highlight + '"]');
        if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 60);
    }
  }

  Apps.logs = {
    open: function () { ensure(); },
    openRef: function (id) {
      filterType = 'all'; filterText = ''; highlight = id;
      ensure(); render();
    }
  };
})();
