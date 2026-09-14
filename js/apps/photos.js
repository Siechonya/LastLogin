/* apps/photos.js — 相册（含隐藏相簿 L2） */
(function () {
  var Apps = (globalThis.Apps = globalThis.Apps || {});
  var win = null, curAlbum = 'default';

  function albumPhotos(al) {
    return DB.photos.filter(function (p) { return (p.album || 'default') === al && !p.external; })
      .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
  }
  function hiddenCount() { return DB.photos.filter(function (p) { return p.album === 'hidden06'; }).length; }

  function ensure() {
    if (win && WM.get('photos')) { render(); WM.focus(WM.get('photos')); return; }
    var content = UI.h('div', { class: 'pane' });
    var side = UI.h('div', { class: 'pane-side', 'data-testid': 'photo-albums' });
    var main = UI.h('div', { class: 'pane-main', 'data-testid': 'photo-grid', style: { overflow: 'auto' } });
    content.appendChild(side); content.appendChild(main);
    win = WM.open({
      appId: 'photos', title: '相册', icon: 'photos', width: 920, height: 620, content: content,
      onClose: function () { win = null; }
    });
    win._side = side; win._main = main;
    render();
  }

  function render() {
    if (!win) return;
    var side = win._side; side.innerHTML = '';
    side.appendChild(UI.h('div', { class: 'side-group', text: '相簿' }));
    var a1 = UI.h('div', { class: 'side-item' + (curAlbum === 'default' ? ' on' : ''), 'data-testid': 'album-default' },
      UI.icon('photos'), UI.h('span', { text: '全部照片' }), UI.h('span', { class: 'cnt', text: String(albumPhotos('default').length) }));
    a1.addEventListener('click', function () { curAlbum = 'default'; render(); });
    side.appendChild(a1);

    var locked = !State.lockSolved('L2');
    var a2 = UI.h('div', { class: 'side-item' + (curAlbum === 'hidden06' ? ' on' : ''), 'data-testid': 'album-hidden06', style: locked ? { color: 'var(--amber)' } : {} },
      UI.icon(locked ? 'lock' : 'photos'), UI.h('span', { text: '六月' }), UI.h('span', { class: 'cnt', text: locked ? '加密' : String(hiddenCount()) }));
    a2.addEventListener('click', function () {
      if (!State.lockSolved('L2')) {
        UI.passwordModal('L2').then(function (ok) { if (ok) { Search.rebuild(); curAlbum = 'hidden06'; render(); } });
      } else { curAlbum = 'hidden06'; render(); }
    });
    side.appendChild(a2);

    var main = win._main; main.innerHTML = '';
    if (curAlbum === 'hidden06' && !State.lockSolved('L2')) {
      main.appendChild(UI.h('div', { class: 'empty-hint', html: '「六月」相簿已加密。<br>密码是你们之间的「第一次」。' }));
      return;
    }
    var grid = UI.h('div', { class: 'photo-grid' });
    var ps = albumPhotos(curAlbum);
    if (!ps.length) grid.appendChild(UI.h('div', { class: 'empty-hint', text: '没有照片。' }));
    ps.forEach(function (p) {
      var card = UI.h('div', { class: 'photo-card', 'data-testid': 'pcard-' + p.id },
        UI.h('img', { src: p.src, alt: p.title || '', loading: 'lazy' }),
        UI.h('div', { class: 'pc-t' },
          UI.h('div', { text: p.title || '未命名' }),
          UI.h('div', { text: String(p.date || '').slice(0, 10) + (p.clue && State.hasClue(p.clue) ? ' · ☆' : '') })));
      card.addEventListener('click', function () { openViewer(p); });
      grid.appendChild(card);
    });
    main.appendChild(grid);
  }

  function openViewer(p) {
    State.markSeen(p.id);
    var content = UI.h('div', { class: 'photo-view' });
    content.appendChild(UI.h('div', { class: 'pv-img' }, UI.h('img', { src: p.src, alt: p.title || '', 'data-testid': 'pimg-' + p.id })));
    var info = UI.h('div', { class: 'pv-info' });
    var head = UI.h('div', {},
      UI.h('div', { class: 'pv-title', text: p.title || '未命名' }),
      p.caption ? UI.h('div', { class: 'pv-caption', text: p.caption }) : null);
    var cb = UI.clueButton(p.clue, function () { render(); });
    if (cb) head.appendChild(cb);
    info.appendChild(head);
    if (p.story) info.appendChild(UI.h('div', { class: 'pv-story', text: p.story }));
    if (p.exif) {
      var ex = p.exif;
      info.appendChild(UI.h('div', { class: 'exif', 'data-testid': 'exif-' + p.id, html:
        '<b>拍摄时间</b> ' + UI.esc(p.date || '') + '<br>' +
        '<b>设备</b> ' + UI.esc(ex.device || '未知') + ' <b>模式</b> ' + UI.esc(ex.mode || '—') + '<br>' +
        '<b>GPS</b> ' + UI.esc(ex.gps || '无') + (ex.note ? '<br><b>备注</b> ' + UI.esc(ex.note) : '') }));
    }
    content.appendChild(info);
    WM.open({ appId: 'photoview', title: p.title || '照片', icon: 'image', width: 860, height: 640, content: content });
  }

  Apps.photos = {
    open: function (id) {
      if (id && DB.photoById[id]) {
        var p = DB.photoById[id];
        if (p.album === 'hidden06' && !State.lockSolved('L2')) {
          ensure();
          UI.passwordModal('L2').then(function (ok) { if (ok) { Search.rebuild(); curAlbum = 'hidden06'; render(); openViewer(p); } });
          return;
        }
        ensure();
        openViewer(p);
        return;
      }
      ensure();
    },
    openRef: function (id) { Apps.photos.open(id); },
    refresh: render
  };
})();
