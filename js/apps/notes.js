/* apps/notes.js — 备忘录（她的笔记 + 玩家便签） */
(function () {
  var Apps = (globalThis.Apps = globalThis.Apps || {});
  var win = null, cur = null;
  var MINE = 'player-note';

  function ensure() {
    if (win && WM.get('notes')) { render(); WM.focus(WM.get('notes')); return; }
    var content = UI.h('div', { class: 'pane' });
    var side = UI.h('div', { class: 'pane-side', 'data-testid': 'notes-side' });
    var main = UI.h('div', { class: 'pane-main', 'data-testid': 'notes-main' });
    content.appendChild(side); content.appendChild(main);
    win = WM.open({
      appId: 'notes', title: '备忘录', icon: 'notes', width: 860, height: 580, content: content,
      onClose: function () { win = null; }
    });
    win._side = side; win._main = main;
    if (!cur) cur = DB.notes.length ? DB.notes[0].id : MINE;
    render();
  }

  function render() {
    if (!win) return;
    var side = win._side; side.innerHTML = '';
    side.appendChild(UI.h('div', { class: 'side-group', text: '她的备忘录' }));
    DB.notes.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); }).forEach(function (n) {
      var it = UI.h('div', { class: 'side-item' + (cur === n.id ? ' on' : ''), 'data-testid': 'note-' + n.id },
        UI.icon('notes'), UI.h('span', { text: n.title }), UI.h('span', { class: 'cnt', text: String(n.date).slice(5) }));
      it.addEventListener('click', function () { cur = n.id; render(); });
      side.appendChild(it);
    });
    side.appendChild(UI.h('div', { class: 'side-group', text: '你的' }));
    var mine = UI.h('div', { class: 'side-item' + (cur === MINE ? ' on' : ''), 'data-testid': 'note-mine' },
      UI.icon('starO'), UI.h('span', { text: '我的调查便签' }));
    mine.addEventListener('click', function () { cur = MINE; render(); });
    side.appendChild(mine);

    var main = win._main; main.innerHTML = '';
    if (cur === MINE) {
      var ta = UI.h('textarea', { class: 'user-note', placeholder: '把你自己的推理写在这里（自动保存在本机存档中）…', 'data-testid': 'my-note' });
      ta.value = State.data.userNotes[MINE] || '';
      ta.addEventListener('input', function () { State.setUserNote(MINE, ta.value); });
      main.appendChild(ta);
      return;
    }
    var n = DB.get(cur);
    if (!n) { main.appendChild(UI.h('div', { class: 'empty-hint', text: '选择左侧的一条备忘录。' })); return; }
    State.markSeen(n.id);
    var d = UI.h('div', { class: 'detail' });
    var head = UI.h('div', { class: 'detail-head' },
      UI.h('div', { class: 'detail-title', text: n.title }),
      UI.h('div', { class: 'detail-meta' }, UI.h('span', { text: n.date || '' }), n.deleted ? UI.h('span', { style: { color: 'var(--red)' }, text: '已从回收站恢复' }) : null));
    var cb = UI.clueButton(n.clue);
    if (cb) head.appendChild(cb);
    d.appendChild(head);
    d.appendChild(UI.h('div', { class: 'note-body', text: n.body || '' }));
    main.appendChild(d);
  }

  Apps.notes = {
    open: function () { ensure(); },
    openRef: function (id) {
      if (id === MINE) { cur = MINE; ensure(); return; }
      var n = DB.get(id);
      if (n) { cur = id; ensure(); render(); } else ensure();
    }
  };
})();
