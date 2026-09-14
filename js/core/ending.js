/* core/ending.js — starfall.zip、信件、发送、尾声与评价 */
(function () {
  var Ending = (globalThis.Ending = {});
  var E = function () { return DB.ending || {}; };

  Ending.openStarfall = function (f) {
    var content = UI.h('div', { class: 'pane-main', style: { overflow: 'auto' } });
    var d = UI.h('div', { class: 'detail' });
    d.appendChild(UI.h('div', { class: 'detail-head' },
      UI.h('div', { class: 'detail-title', text: 'starfall.zip' }),
      UI.h('div', { class: 'detail-meta' },
        UI.h('span', { text: '/下载/starfall.zip' }),
        UI.h('span', { text: '1.2 GB' }),
        UI.h('span', { text: '修改：' + (f && f.date ? f.date : '2026-06-08') }),
        UI.h('span', { style: { color: 'var(--green)' }, text: '已解锁' }))));
    d.appendChild(UI.h('div', { class: 'md', html: UI.md(f && f.body ? f.body : '（压缩包内容清单）') }));

    var acts = UI.h('div', { style: { marginTop: '22px', display: 'flex', gap: '12px', flexWrap: 'wrap' } });
    if (!State.data.starfall.sent) {
      acts.appendChild(UI.h('button', { class: 'btn', text: '打开「给知秋的信」', 'data-testid': 'open-letter', on: { click: function () { Ending.playLetter(); } } }));
      acts.appendChild(UI.h('button', { class: 'btn primary', text: '把证据发给苏晴', 'data-testid': 'send-evidence', on: { click: function () { Ending.send(); } } }));
    } else {
      acts.appendChild(UI.h('span', { style: { color: 'var(--green)', fontSize: '13px' }, text: '✓ 证据已在 2026-09-10 发送给苏晴。' }));
      acts.appendChild(UI.h('button', { class: 'btn', text: '重读信件', on: { click: function () { Ending.playLetter(); } } }));
      acts.appendChild(UI.h('button', { class: 'btn', text: '再看一次结局', on: { click: function () { Ending.playEpilogue(true); } } }));
    }
    d.appendChild(acts);
    content.appendChild(d);
    WM.open({ appId: 'starfall', title: '星陨 · starfall.zip', icon: 'zip', width: 760, height: 600, content: content, cls: 'letter-win' });
  };

  Ending.playLetter = function () {
    var e = E();
    return UI.overlayCards([
      { kind: 'letter', title: e.letterTitle || '给知秋的信', body: e.letter || '' }
    ], { lastLabel: '把信合上' });
  };

  Ending.send = function () {
    var e = E();
    UI.confirm({
      title: e.sendPrompt || '发送证据？',
      body: '收件人：苏晴 suqing@xchenweekly.com\n附件：starfall.zip（1.2 GB）\n\n一旦发出，这台电脑里的东西就不再只属于你们两个人。\n王秀兰、郑楠、林晚——所有人的名字都会出现在纸面上。\n\n这也正是她想要的。',
      okLabel: e.sendConfirm || '发送', okTestid: 'send-ok'
    }).then(function (ok) {
      if (!ok) return;
      var m = UI.modal({ title: '正在发送', bodyNode: UI.h('div', { class: 'send-anim', 'data-testid': 'send-anim' }), actions: [], dismissable: false });
      var box = m.box.querySelector('.send-anim');
      var lines = e.sendingLines || ['发送中…'];
      var i = 0;
      (function step() {
        if (i < lines.length) {
          box.textContent += (i ? '\n' : '') + lines[i++];
          setTimeout(step, 850);
        } else {
          setTimeout(function () {
            m.close();
            State.data.starfall.sent = true;
            State.data.ended = true;
            State.data.rank = State.computeRank();
            State.save();
            if (globalThis.Progress) Progress.sync();
            Ending.playEpilogue(false);
          }, 900);
        }
      })();
    });
  };

  Ending.playEpilogue = function (replay) {
    var e = E();
    return UI.overlayCards(e.epilogue || [], { lastLabel: '……' }).then(function () {
      Ending.showRank(replay);
    });
  };

  Ending.showRank = function (replay) {
    var e = E();
    var rank = State.data.rank || State.computeRank();
    var r = (e.ranks && e.ranks[rank]) || { title: '评价 ' + rank, body: '' };
    var cur = State.describe(State.data);
    var ov = document.getElementById('overlay');
    ov.innerHTML = '';
    ov.classList.remove('hidden');
    var card = UI.h('div', { class: 'ov-card', style: { textAlign: 'center' }, 'data-testid': 'rank-card' });
    card.appendChild(UI.h('div', { class: 'ov-title', text: '调查结束' }));
    card.appendChild(UI.h('div', { class: 'rank-badge', text: rank }));
    card.appendChild(UI.h('div', { style: { fontSize: '16px', color: 'var(--amber)', marginTop: '6px' }, text: r.title.replace(/^评价\s*\S+\s*·\s*/, '') }));
    card.appendChild(UI.h('div', { class: 'ov-body', style: { textAlign: 'left', marginTop: '16px' }, text: r.body }));
    card.appendChild(UI.h('div', { class: 'stat-grid', style: { marginTop: '20px' } },
      UI.h('div', { class: 'stat-card' }, UI.h('div', { class: 'v', text: cur.clues + '/17' }), UI.h('div', { class: 'k', text: '关键线索' })),
      UI.h('div', { class: 'stat-card' }, UI.h('div', { class: 'v', text: String(cur.hints) }), UI.h('div', { class: 'k', text: '提示使用' })),
      UI.h('div', { class: 'stat-card' }, UI.h('div', { class: 'v', text: UI.fmtMinutes(State.data.playMs) }), UI.h('div', { class: 'k', text: '游玩时长' }))
    ));
    var achGot = (DB.achievements || []).filter(function (a) { return State.data.ach.indexOf(a.id) >= 0; });
    card.appendChild(UI.h('div', { style: { marginTop: '16px', fontSize: '12px', color: 'var(--tx2)', lineHeight: '1.9', textAlign: 'left', whiteSpace: 'pre-wrap' },
      text: '成就 ' + State.data.ach.length + '/' + (DB.achievements || []).length + '：' + (achGot.length ? achGot.map(function (a) { return a.title; }).join('、') : '（无）') +
        '\n章节 ' + State.data.chaptersDone.length + '/' + (DB.chapters || []).length + ' · 关联发现 ' + State.data.insights.length + '/' + (DB.insights || []).length + ' · 时间线 ' + (DB.timeline || []).filter(function (t) { return Progress.needMet(t.need); }).length + '/' + (DB.timeline || []).length }));
    var nav = UI.h('div', { class: 'ov-nav', style: { justifyContent: 'center' } });
    nav.appendChild(UI.h('button', { class: 'btn', text: (E().freeRoam || '继续浏览'), 'data-testid': 'rank-freeroam', on: { click: function () { ov.classList.add('hidden'); ov.innerHTML = ''; } } }));
    nav.appendChild(UI.h('button', { class: 'btn primary', text: E().restart || '重新开始', 'data-testid': 'rank-restart', on: { click: function () { SystemUI.restart(); } } }));
    card.appendChild(nav);
    if (!replay) {
      card.appendChild(UI.h('div', { style: { marginTop: '18px', fontSize: '11.5px', color: 'var(--tx3)' }, text: '《最后一次登录》· 完 · 所有内容均为虚构' }));
    }
    ov.appendChild(card);
  };
})();
