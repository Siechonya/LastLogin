/* apps/files.js — 文件管理器 + 文本查看器 + 加密压缩包 */
(function () {
  var Apps = (globalThis.Apps = globalThis.Apps || {});

  function kindIcon(f) {
    if (f.kind === 'zip') return 'zip';
    if (f.kind === 'photo' || f.kind === 'image') return 'image';
    return 'file';
  }

  /* ---------- 文本查看窗口 ---------- */
  function openViewer(f) {
    State.markSeen(f.id);
    var content = UI.h('div', { class: 'pane-main', style: { overflow: 'auto' } });
    var detail = UI.h('div', { class: 'detail' });
    var head = UI.h('div', { class: 'detail-head' },
      UI.h('div', { class: 'detail-title', text: f._name || f.path }),
      UI.h('div', { class: 'detail-meta' },
        UI.h('span', { text: f.path }),
        UI.h('span', { text: '修改：' + (f.date || '') }),
        f.size ? UI.h('span', { text: f.size }) : null,
        f.deleted ? UI.h('span', { style: { color: 'var(--red)' }, text: '（已从回收站恢复查看）' }) : null
      )
    );
    var clueBtn = UI.clueButton(f.clue);
    if (clueBtn) head.appendChild(clueBtn);
    detail.appendChild(head);
    var bodyEl = f.kind === 'md'
      ? UI.h('div', { class: 'md', html: UI.md(f.body) })
      : UI.h('div', { class: 'plain' + (/\.(txt|log)$/i.test(f.path) ? ' mono' : ''), text: f.body || '（空文件）' });
    bodyEl.style.fontSize = '13.8px';
    detail.appendChild(bodyEl);
    content.appendChild(detail);

    WM.open({
      appId: 'viewer:' + f.id, title: f._name || '文件', icon: kindIcon(f),
      width: 720, height: 540, content: content
    });
  }

  /* ---------- 压缩包 ---------- */
  function openZip(f) {
    var lock = DB.locks[f.lock];
    if (lock && lock.gate === 'deduction' && !State.deductionSolved()) {
      var m = UI.modal({
        title: '无法打开', bodyNode: UI.h('div', {},
          UI.h('p', { text: 'starfall.zip 用了她不常用的加密方式，密码提示只有一行：\n\n「给看得懂的人。」\n\n也许该先把她的遭遇理清楚——调查手册里的「结案」还空着。' }),
          UI.h('button', { class: 'linkish', text: '打开调查手册', on: { click: function () { m.close(); Apps.investigate.open('deduction'); } } })
        ),
        actions: [{ label: '知道了' }]
      });
      return;
    }
    if (f.lock && !State.lockSolved(f.lock)) {
      UI.passwordModal(f.lock).then(function (ok) {
        if (!ok) return;
        Search.rebuild();
        if (f.id === 'file:dl-starfall') { State.data.starfall.unlocked = true; State.save(); Ending.openStarfall(f); }
        else openViewer(f);
      });
      return;
    }
    if (f.id === 'file:dl-starfall') { Ending.openStarfall(f); return; }
    openViewer(f);
  }

  /* ---------- 打开任意文件 ---------- */
  function openFile(id) {
    var f = DB.get(id);
    if (!f || f._kind !== 'file') { UI.toast('找不到该文件', { type: 'sys' }); return; }
    if (isInLockedFolder(f) || (f.lock && f.lock !== 'L3' && !State.lockSolved(f.lock))) {
      var lid = folderLockOf(f) || f.lock;
      UI.passwordModal(lid).then(function (ok) { if (ok) { Search.rebuild(); openFile(id); } });
      return;
    }
    if (f.kind === 'zip') { openZip(f); return; }
    if (f.kind === 'photo' || f.kind === 'image') { Apps.photos.open(f.id); return; }
    if (f.kind === 'binary') { UI.modal({ title: f._name, body: '这台电脑上没有能打开它的程序。', actions: [{ label: '好' }] }); return; }
    openViewer(f);
  }

  function folderLockOf(f) {
    var lid = null;
    Object.keys(DB.locks).forEach(function (k) {
      var lk = DB.locks[k];
      if (lk.kind === 'folder' && f.path && f.path.indexOf(lk.target + '/') === 0) lid = k;
    });
    return lid;
  }
  function isInLockedFolder(f) {
    var lid = folderLockOf(f);
    return lid ? !State.lockSolved(lid) : false;
  }

  /* ---------- 主窗口 ---------- */
  var win = null, curPath = '/';

  function ensureOpen(path) {
    if (path) curPath = path;
    if (win && WM.get('files')) { render(); WM.focus(WM.get('files')); return WM.get('files'); }
    var content = UI.h('div', { class: 'pane' });
    var side = UI.h('div', { class: 'pane-side', 'data-testid': 'files-tree' });
    var main = UI.h('div', { style: { flex: '1', display: 'flex', flexDirection: 'column', overflow: 'hidden' } });
    var crumb = UI.h('div', { class: 'crumb', 'data-testid': 'files-crumb' });
    var list = UI.h('div', { class: 'filelist', 'data-testid': 'files-list' });
    main.appendChild(crumb); main.appendChild(list);
    content.appendChild(side); content.appendChild(main);
    win = WM.open({
      appId: 'files', title: '文件管理器', icon: 'files', width: 860, height: 560, content: content,
      onClose: function () { win = null; }
    });
    win._side = side; win._crumb = crumb; win._list = list;
    render();
    return win;
  }

  function nodeAt(path) {
    if (!path || path === '/') return DB.root;
    var parts = path.split('/').filter(Boolean);
    var cur = DB.root;
    for (var i = 0; i < parts.length; i++) {
      if (!cur.folders[parts[i]]) return null;
      cur = cur.folders[parts[i]];
    }
    return cur;
  }

  function lockOfFolder(path) { return DB.folderLockId ? DB.folderLockId(path) : null; }

  function renderTree() {
    var side = win._side;
    side.innerHTML = '';
    side.appendChild(UI.h('div', { class: 'side-group', text: '这台电脑' }));
    function walk(node, depth) {
      Object.keys(node.folders).forEach(function (name) {
        var child = node.folders[name];
        var lid = lockOfFolder(child.path);
        var locked = lid && !State.lockSolved(lid);
        var row = UI.h('div', {
          class: 'tree-node' + (child.path === curPath ? ' on' : ''),
          style: { paddingLeft: (10 + depth * 14) + 'px' },
          'data-testid': 'tree-' + child.path
        },
          UI.icon(locked ? 'lock' : 'folder'),
          UI.h('span', { text: name }),
          locked ? UI.h('span', { class: 'tree-lock', text: '加密' }) : null
        );
        row.style.color = locked ? 'var(--amber)' : '';
        row.addEventListener('click', function () {
          if (locked) {
            UI.passwordModal(lid).then(function (ok) { if (ok) { Search.rebuild(); curPath = child.path; render(); } });
          } else { curPath = child.path; render(); }
        });
        side.appendChild(row);
        if (!locked) walk(child, depth + 1);
      });
    }
    walk(DB.root, 0);
  }

  function renderList() {
    var node = nodeAt(curPath);
    win._crumb.innerHTML = '';
    win._crumb.appendChild(UI.h('span', { text: '位置：' }));
    win._crumb.appendChild(UI.h('b', { text: curPath === '/' ? '这台电脑' : curPath }));
    var list = win._list;
    list.innerHTML = '';
    if (!node) { list.appendChild(UI.h('div', { class: 'empty-hint', text: '空文件夹' })); return; }
    list.appendChild(UI.h('div', { class: 'fhead' }, UI.h('span', { text: '名称' }), UI.h('span', { text: '大小' }), UI.h('span', { text: '修改日期' })));

    if (curPath !== '/') {
      var up = UI.h('div', { class: 'frow', 'data-testid': 'row-up' },
        UI.h('div', { class: 'fname' }, UI.icon('folder'), UI.h('span', { text: '..' })),
        UI.h('div', { class: 'fmeta' }), UI.h('div', { class: 'fmeta' }));
      up.addEventListener('click', function () {
        var parts = curPath.split('/').filter(Boolean); parts.pop();
        curPath = parts.length ? '/' + parts.join('/') : '/';
        render();
      });
      list.appendChild(up);
    }

    Object.keys(node.folders).forEach(function (name) {
      var child = node.folders[name];
      var lid = lockOfFolder(child.path);
      var locked = lid && !State.lockSolved(lid);
      var row = UI.h('div', { class: 'frow', 'data-testid': 'row-' + child.path },
        UI.h('div', { class: 'fname' }, UI.icon(locked ? 'lock' : 'folder'), UI.h('span', { text: name }), locked ? UI.h('span', { class: 'lockico', text: '加密' }) : null),
        UI.h('div', { class: 'fmeta', text: '文件夹' }),
        UI.h('div', { class: 'fmeta', text: '' }));
      row.addEventListener('click', function () {
        if (locked) UI.passwordModal(lid).then(function (ok) { if (ok) { Search.rebuild(); curPath = child.path; render(); } });
        else { curPath = child.path; render(); }
      });
      list.appendChild(row);
    });

    node.files.slice().sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); }).forEach(function (f) {
      var row = UI.h('div', { class: 'frow', 'data-testid': 'row-' + f.id },
        UI.h('div', { class: 'fname' }, UI.icon(kindIcon(f)), UI.h('span', { text: f._name }), f.lock ? UI.h('span', { class: 'lockico', text: '🔒' }) : null),
        UI.h('div', { class: 'fmeta', text: f.size || '' }),
        UI.h('div', { class: 'fmeta', text: f.date || '' }));
      row.addEventListener('click', function () { openFile(f.id); });
      list.appendChild(row);
    });

    if (!Object.keys(node.folders).length && !node.files.length) {
      list.appendChild(UI.h('div', { class: 'empty-hint', text: curPath === '/回收站' ? '回收站是空的。' : '这个文件夹是空的。' }));
    }
  }

  function render() { if (win) { renderTree(); renderList(); } }

  Apps.files = {
    open: function (path) { ensureOpen(path || '/'); },
    openPath: function (p) { ensureOpen(p); },
    openFile: function (id) {
      var f = DB.get(id);
      if (!f) return;
      var dir = f.path.split('/').filter(Boolean); dir.pop();
      var p = dir.length ? '/' + dir.join('/') : '/';
      var lid = lockOfFolder(p);
      if (lid && !State.lockSolved(lid)) {
        UI.passwordModal(lid).then(function (ok) { if (ok) { Search.rebuild(); curPath = p; ensureOpen(p); openFile(id); } });
        return;
      }
      curPath = p;
      ensureOpen(p);
      openFile(id);
    },
    refresh: render
  };
})();
