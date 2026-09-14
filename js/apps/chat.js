/* apps/chat.js — 纸鹤（聊天） */
(function () {
  var Apps = (globalThis.Apps = globalThis.Apps || {});
  var win = null, curConv = null;

  function lastMsg(c) {
    var ms = c.messages || [];
    for (var i = ms.length - 1; i >= 0; i--) if (ms[i].type !== 'sys') return ms[i];
    return ms[ms.length - 1] || null;
  }
  function avatarOf(c) { return 'assets/avatars/' + (c.avatar || 'ava-work') + '.svg'; }

  function ensure() {
    if (win && WM.get('chat')) { render(); WM.focus(WM.get('chat')); return; }
    var content = UI.h('div', { class: 'pane' });
    var list = UI.h('div', { class: 'pane-list', 'data-testid': 'chat-list' });
    var main = UI.h('div', { class: 'chat-main', 'data-testid': 'chat-main' });
    content.appendChild(list); content.appendChild(main);
    win = WM.open({
      appId: 'chat', title: '纸鹤', icon: 'chat', width: 920, height: 620, content: content,
      onClose: function () { win = null; }
    });
    win._list = list; win._main = main;
    if (!curConv && DB.chats.length) curConv = DB.chats[0].id;
    render();
  }

  function renderList() {
    var list = win._list; list.innerHTML = '';
    DB.chats.slice().sort(function (a, b) {
      var la = lastMsg(a), lb = lastMsg(b);
      return String(lb && lb.ts || '').localeCompare(String(la && la.ts || ''));
    }).forEach(function (c) {
      var lm = lastMsg(c);
      var it = UI.h('div', { class: 'list-item' + (curConv === c.id ? ' on' : ''), 'data-testid': 'conv-' + c.id, style: { display: 'flex', gap: '10px', alignItems: 'center' } },
        UI.h('img', { src: avatarOf(c), style: { width: '36px', height: '36px', borderRadius: '50%', flex: 'none', background: '#0e1526' }, alt: '' }),
        UI.h('div', { style: { flex: '1', minWidth: '0' } },
          UI.h('div', { class: 'li-title', text: c.name }),
          UI.h('div', { class: 'li-sub', text: lm ? ((lm.from === 'me' ? '我：' : '') + String(lm.text || '').slice(0, 22)) : '' })),
        UI.h('div', { class: 'li-sub', style: { flex: 'none', fontFamily: 'var(--mono)', fontSize: '10.5px' }, text: lm ? String(lm.ts || '').slice(5, 10) : '' }));
      it.addEventListener('click', function () { curConv = c.id; render(); });
      list.appendChild(it);
    });
  }

  function renderMain(scrollToMsg) {
    var main = win._main; main.innerHTML = '';
    var c = DB.convById[curConv];
    if (!c) { main.appendChild(UI.h('div', { class: 'empty-hint', text: '选择左侧的一个对话。' })); return; }
    var lm = lastMsg(c);
    main.appendChild(UI.h('div', { class: 'chat-head' },
      UI.h('img', { src: avatarOf(c), alt: '' }),
      UI.h('div', {},
        UI.h('div', { class: 'nm', text: c.name }),
        UI.h('div', { class: 'st', text: '最后消息：' + (lm ? lm.ts : '—') + ' · 这是林晚的账号，你只是读者' }))
    ));
    var box = UI.h('div', { class: 'chat-msgs', 'data-testid': 'chat-msgs' });
    var lastDay = '';
    (c.messages || []).forEach(function (m) {
      var day = String(m.ts || '').slice(0, 10);
      if (day && day !== lastDay) { box.appendChild(UI.h('div', { class: 'chat-day', text: day })); lastDay = day; }
      var cls = 'msg ' + (m.from === 'me' ? 'me' : (m.from === 'sys' ? 'sys' : 'them'));
      if (m.type === 'recalled') cls += ' recalled';
      if (m.clue) cls += ' clueable';
      var el = UI.h('div', { class: cls, 'data-testid': 'msg-' + m.id });
      if (m.from !== 'sys') el.appendChild(UI.h('img', { class: 'm-ava', src: m.from === 'me' ? 'assets/avatars/ava-linwan.svg' : avatarOf(c), alt: '' }));
      var b = UI.h('div', { class: 'bubble' });
      if (m.type === 'image' && m.photo) {
        var p = DB.photoById[m.photo];
        if (p && !(p.album === 'hidden06' && !State.lockSolved('L2'))) {
          var img = UI.h('img', { class: 'ph-embed', src: p.src, alt: p.title || '', title: '点击查看' });
          img.addEventListener('click', function () { Apps.photos.open(m.photo); });
          b.appendChild(img);
          if (m.text && m.text !== '[图片]') b.appendChild(UI.h('div', { style: { marginTop: '5px' }, text: m.text }));
        } else {
          b.appendChild(UI.h('div', { text: '[图片]' + (m.text && m.text !== '[图片]' ? ' ' + m.text : '') }));
        }
      } else {
        b.appendChild(UI.h('span', { text: m.text || '' }));
      }
      b.appendChild(UI.h('div', { class: 'ts', text: String(m.ts || '').slice(5) }));
      if (m.clue) {
        var tools = UI.h('div', { class: 'msg-tools' });
        var done = State.hasClue(m.clue);
        var tb = UI.h('button', { class: done ? 'done' : '', 'data-testid': 'clue-btn-' + m.clue, text: done ? '✓ 已收藏线索' : '☆ 收藏为线索' });
        if (!done) tb.addEventListener('click', function () {
          if (State.addClue(m.clue)) {
            tb.classList.add('done'); tb.textContent = '✓ 已收藏线索';
            var cl = DB.clues[m.clue];
            UI.toast(cl.title, { type: 'clue', title: '☆ 线索收藏 · ' + (DB.chains[cl.chain] ? DB.chains[cl.chain].name : '') });
            if (Apps.investigate) Apps.investigate.refresh();
          }
        });
        tools.appendChild(tb);
        b.appendChild(tools);
      }
      el.appendChild(b);
      box.appendChild(el);
    });
    main.appendChild(box);
    main.appendChild(UI.h('div', { class: 'chat-input' }, UI.icon('chat'), UI.h('span', { text: '账号已离线 91 天 —— 无法发送消息' })));
    if (scrollToMsg) {
      setTimeout(function () {
        var t = box.querySelector('[data-testid="msg-' + scrollToMsg + '"]');
        if (t) {
          t.scrollIntoView({ block: 'center', behavior: 'smooth' });
          t.style.transition = 'none'; t.style.background = 'rgba(232,180,90,.18)';
          setTimeout(function () { t.style.transition = 'background 1.2s'; t.style.background = ''; }, 60);
        }
        box.scrollTop = box.scrollHeight;
      }, 60);
    } else {
      box.scrollTop = box.scrollHeight;
    }
  }

  function render(scrollToMsg) { if (win) { renderList(); renderMain(scrollToMsg); } }

  Apps.chat = {
    open: function (convId) { if (convId) curConv = convId; ensure(); },
    openMsg: function (msgId) {
      var m = DB.msgById(msgId);
      if (!m) return;
      curConv = m._conv;
      ensure();
      render(msgId);
    },
    openRef: function (id) {
      if (DB.convById[id]) Apps.chat.open(id);
      else Apps.chat.openMsg(id);
    }
  };
})();
