/* apps/mail.js — 云邮客户端 */
(function () {
  var Apps = (globalThis.Apps = globalThis.Apps || {});
  var FOLDERS = [
    { id: 'inbox', name: '收件箱', icon: 'mail' },
    { id: 'sent', name: '发件箱', icon: 'send' },
    { id: 'draft', name: '草稿箱', icon: 'notes' },
    { id: 'trash', name: '已删除', icon: 'recycle' }
  ];
  var win = null, curFolder = 'inbox', curMail = null;

  function mails(folder) {
    return DB.emails.filter(function (m) { return m.folder === folder; })
      .sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
  }

  function ensure() {
    if (win && WM.get('mail')) { render(); WM.focus(WM.get('mail')); return; }
    var content = UI.h('div', { class: 'pane' });
    var side = UI.h('div', { class: 'pane-side', 'data-testid': 'mail-folders' });
    var list = UI.h('div', { class: 'pane-list', 'data-testid': 'mail-list' });
    var main = UI.h('div', { class: 'pane-main', 'data-testid': 'mail-main' });
    content.appendChild(side); content.appendChild(list); content.appendChild(main);
    win = WM.open({
      appId: 'mail', title: '云邮 · linwan@yunmail.com', icon: 'mail', width: 940, height: 600, content: content,
      onClose: function () { win = null; }
    });
    win._side = side; win._list = list; win._main = main;
    render();
  }

  function render() {
    if (!win) return;
    /* 文件夹 */
    var side = win._side; side.innerHTML = '';
    side.appendChild(UI.h('div', { class: 'side-group', text: '云邮' }));
    FOLDERS.forEach(function (fo) {
      var ms = mails(fo.id);
      var unread = ms.filter(function (m) { return !State.seen(m.id); }).length;
      var it = UI.h('div', { class: 'side-item' + (curFolder === fo.id ? ' on' : ''), 'data-testid': 'folder-' + fo.id },
        UI.icon(fo.icon), UI.h('span', { text: fo.name }),
        UI.h('span', { class: 'cnt', text: unread ? (unread + ' 新') : String(ms.length) }));
      it.addEventListener('click', function () { curFolder = fo.id; curMail = null; render(); });
      side.appendChild(it);
    });

    /* 列表 */
    var list = win._list; list.innerHTML = '';
    var ms = mails(curFolder);
    if (!ms.length) list.appendChild(UI.h('div', { class: 'empty-hint', text: '这里空空如也。' }));
    ms.forEach(function (m) {
      var who = m.folder === 'inbox' || m.folder === 'trash' ? ((m.from && m.from.name) || '未知') : ((m.to && m.to[0] && m.to[0].name) || '');
      var it = UI.h('div', { class: 'list-item' + (curMail === m.id ? ' on' : ''), 'data-testid': 'mail-' + m.id },
        UI.h('div', { class: 'li-title' },
          !State.seen(m.id) ? UI.h('span', { class: 'dot', text: '●' }) : null,
          UI.h('span', { text: m.subject || '（无主题）' })),
        UI.h('div', { class: 'li-sub', text: who + ' · ' + (m.date || '') }));
      it.addEventListener('click', function () { curMail = m.id; State.markSeen(m.id); render(); });
      list.appendChild(it);
    });

    /* 正文 */
    var main = win._main; main.innerHTML = '';
    var m = curMail ? DB.get(curMail) : null;
    if (!m) {
      main.appendChild(UI.h('div', { class: 'empty-hint', html: '林晚的邮箱。<br>她走之后，没有人再动过它。' }));
      return;
    }
    var d = UI.h('div', { class: 'detail' });
    var head = UI.h('div', { class: 'mail-head' },
      UI.h('div', { class: 'mail-subject', text: m.subject || '（无主题）' }),
      UI.h('div', { class: 'mail-who', html:
        '<b>发件人</b> ' + UI.esc((m.from && m.from.name) || '') + ' &lt;' + UI.esc((m.from && m.from.email) || '') + '&gt;<br>' +
        '<b>收件人</b> ' + UI.esc((m.to || []).map(function (t) { return t.name + ' <' + t.email + '>'; }).join('；')) +
        ((m.cc && m.cc.length) ? '<br><b>抄送</b> ' + UI.esc(m.cc.map(function (t) { return t.name; }).join('；')) : '') }),
      UI.h('div', { class: 'mail-date', text: (m.date || '') + (m.external ? ' · 外部时间' : '') })
    );
    var clueBtn = UI.clueButton(m.clue);
    if (clueBtn) head.appendChild(clueBtn);
    d.appendChild(head);
    if (m.folder === 'trash') d.appendChild(UI.h('div', { class: 'mail-banner', text: '这封邮件被她删除过——但删除并不等于消失。' }));
    if (m.folder === 'draft') d.appendChild(UI.h('div', { class: 'mail-banner', text: '草稿：写了，但没有发出去。' }));
    d.appendChild(UI.h('div', { class: 'mail-body', text: m.body || '' }));
    main.appendChild(d);
  }

  Apps.mail = {
    open: function (id) {
      if (id && String(id).indexOf('email:') === 0) Apps.mail.openMail(id);
      else ensure();
    },
    openMail: function (id) {
      var m = DB.get(id); if (!m) return;
      curFolder = m.folder || 'inbox'; curMail = id;
      State.markSeen(id);
      ensure(); render();
    }
  };
  Apps.mail.openRef = Apps.mail.openMail;
})();
