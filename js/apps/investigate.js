/* apps/investigate.js — 调查手册：线索板 / 渐进提示 / 结案推理 / 进度 */
(function () {
  var Apps = (globalThis.Apps = globalThis.Apps || {});
  var win = null, curTab = 'board', expandedHint = null;
  var TABS = [
    { id: 'board', label: '线索板' },
    { id: 'timeline', label: '时间线' },
    { id: 'checklist', label: '清单' },
    { id: 'hints', label: '提示' },
    { id: 'deduction', label: '结案' },
    { id: 'about', label: '进度' }
  ];

  function ensure() {
    if (win && WM.get('investigate')) { render(); WM.focus(WM.get('investigate')); return; }
    var content = UI.h('div', { style: { flex: '1', display: 'flex', flexDirection: 'column', overflow: 'hidden' } });
    win = WM.open({
      appId: 'investigate', title: '调查手册', icon: 'investigate', width: 920, height: 640, content: content,
      onClose: function () { win = null; }
    });
    win._main = content;
    render();
  }

  /* ---------- 跳转到线索来源 ---------- */
  function gotoSource(clueId) {
    var cl = DB.clues[clueId];
    if (!cl) return;
    var src = cl.source;
    switch (cl.sourceApp) {
      case 'files': Apps.files.openFile(src); break;
      case 'mail': Apps.mail.openMail(src); break;
      case 'chat': Apps.chat.openMsg(src); break;
      case 'photos': Apps.photos.open(src); break;
      case 'browser': Apps.browser.openRef(src); break;
      case 'logs': Apps.logs.openRef(src); break;
      case 'notes': Apps.notes.openRef(src); break;
      default: UI.toast('来源：' + src, { type: 'sys' });
    }
  }

  /* ---------- 线索板 ---------- */
  function renderBoard(pane) {
    pane.appendChild(UI.h('p', { style: { fontSize: '12.5px', color: 'var(--tx3)', marginBottom: '16px' }, text: '收藏的线索会自动归类到三条线上。点击「查看来源」可以回到证据出现的地方。' }));
    ['work', 'personal', 'missing'].forEach(function (ck) {
      var chain = DB.chains[ck];
      var ids = Object.keys(DB.clues).filter(function (k) { return DB.clues[k].chain === ck; });
      var got = ids.filter(function (k) { return State.hasClue(k); }).length;
      var block = UI.h('div', { class: 'chain-block', 'data-testid': 'chain-' + ck });
      block.appendChild(UI.h('div', { class: 'chain-head' },
        UI.h('span', { class: 'chain-name', style: { color: chain.color }, text: chain.name }),
        UI.h('span', { class: 'chain-desc', text: chain.desc }),
        UI.h('span', { class: 'chain-prog', text: got + ' / ' + ids.length })));
      ids.forEach(function (cid) {
        var cl = DB.clues[cid];
        var has = State.hasClue(cid);
        var card = UI.h('div', { class: 'clue-card' + (has ? '' : ' locked'), 'data-testid': 'clue-' + cid });
        card.appendChild(UI.h('div', { class: 'ct' }, UI.h('span', { text: has ? '☆' : '？' }), UI.h('span', { text: has ? cl.title : '尚未发现的线索' })));
        if (has) {
          card.appendChild(UI.h('div', { class: 'cs', text: cl.summary }));
          card.appendChild(UI.h('div', { class: 'csrc' },
            UI.h('span', { text: '来源：' + cl.source }),
            UI.h('button', { class: 'goto-btn', text: '查看来源', 'data-testid': 'goto-' + cid, on: { click: function () { gotoSource(cid); } } })));
          /* 每条线索可挂自己的笔记 */
          var noteKey = 'clue:' + cid;
          var saved = State.data.userNotes[noteKey] || '';
          var ta = UI.h('textarea', {
            class: 'user-note', placeholder: '给这条线索写点你自己的批注…（自动保存）',
            'data-testid': 'cluenote-' + cid,
            style: { minHeight: '0', height: saved ? '74px' : '0', padding: saved ? '8px 12px' : '0 12px', border: '1px solid var(--line)', borderRadius: '8px', background: '#0a0f1c', marginTop: '8px', fontSize: '12.5px', transition: 'height .15s', overflow: 'auto' }
          });
          ta.value = saved;
          ta.addEventListener('input', function () {
            State.setUserNote(noteKey, ta.value);
            ta.style.height = '74px'; ta.style.padding = '8px 12px';
            toggle.textContent = saved || ta.value ? '收起笔记' : '＋ 我的笔记';
          });
          var toggle = UI.h('button', { class: 'goto-btn', style: { marginTop: '8px' }, text: saved ? '收起笔记' : '＋ 我的笔记', 'data-testid': 'cluenote-toggle-' + cid });
          toggle.addEventListener('click', function () {
            var open = ta.style.height !== '0px';
            ta.style.height = open ? '0' : '74px';
            ta.style.padding = open ? '0 12px' : '8px 12px';
            toggle.textContent = open ? '＋ 我的笔记' : '收起笔记';
            if (!open) ta.focus();
          });
          card.appendChild(ta);
          card.appendChild(UI.h('div', {}, toggle));
        } else {
          card.appendChild(UI.h('div', { class: 'cs', text: '继续翻这台电脑。她一定留下了什么。' }));
        }
        block.appendChild(card);
      });
      pane.appendChild(block);
    });
  }

  /* ---------- 时间线 ---------- */
  function needMet(need) {
    if (!need) return true;
    if (need === 'ended') return !!State.data.ended;
    if (need.indexOf('CL-') === 0) return State.hasClue(need);
    return State.seen(need);
  }
  function openItem(id) {
    if (!id) return;
    if (id.indexOf('CL-') === 0) { gotoSource(id); return; }
    if (id.indexOf('photo:') === 0) Apps.photos.open(id);
    else if (id.indexOf('page:') === 0) Apps.browser.openPage(id);
    else if (id.indexOf('file:') === 0) Apps.files.openFile(id);
    else if (id.indexOf('log:') === 0) Apps.logs.openRef(id);
    else if (id.indexOf('email:') === 0) Apps.mail.openMail(id);
    else if (id.indexOf('note:') === 0) Apps.notes.openRef(id);
  }

  function renderTimeline(pane) {
    var tl = DB.timeline || [];
    var got = tl.filter(function (t) { return needMet(t.need); }).length;
    pane.appendChild(UI.h('p', { style: { fontSize: '12.5px', color: 'var(--tx3)', marginBottom: '14px' }, text: '她这半年经历的事，会随你的探索逐条点亮（' + got + ' / ' + tl.length + '）。点一条已查明的，可以跳回证据出现的地方。没点亮的只给日期——剩下的你自己去翻。' }));
    var line = UI.h('div', { style: { borderLeft: '2px solid var(--line2)', marginLeft: '6px', paddingLeft: '18px' } });
    tl.forEach(function (t, i) {
      var on = needMet(t.need);
      var row = UI.h('div', { style: { marginBottom: '14px', opacity: on ? '1' : '.42' }, 'data-testid': 'tl-' + i });
      row.appendChild(UI.h('div', { style: { fontFamily: 'var(--mono)', fontSize: '11.5px', color: on ? 'var(--amber)' : 'var(--tx3)' }, text: t.date + (on ? '' : ' · 尚未查明') }));
      row.appendChild(UI.h('div', { style: { fontSize: '13.5px', color: on ? 'var(--tx)' : 'var(--tx3)', marginTop: '2px' }, text: on ? t.title : '？？？' }));
      if (on) {
        row.appendChild(UI.h('div', { style: { fontSize: '12.5px', color: 'var(--tx2)', marginTop: '3px', lineHeight: '1.7' }, text: t.detail }));
        if (t.need && t.need !== 'ended') {
          row.appendChild(UI.h('div', { style: { marginTop: '6px' } },
            UI.h('button', { class: 'goto-btn', text: '跳回证据', 'data-testid': 'tl-goto-' + i, on: { click: function () { openItem(t.need); } } })));
        }
      }
      line.appendChild(row);
    });
    pane.appendChild(line);
  }

  /* ---------- 清单 ---------- */
  function renderChecklist(pane) {
    var d = State.data;
    pane.appendChild(UI.h('p', { style: { fontSize: '12.5px', color: 'var(--tx3)', marginBottom: '14px' }, text: '调查进度清单。勾上的不用再管，没勾的按「下一步」的提示去找。所有提示都不剧透。' }));

    var items = [
      ['登录她的电脑', d.loggedIn === true || State.lockSolved('L0')],
      ['解锁「文档/工作/归档」', State.lockSolved('L1')],
      ['解锁隐藏相簿「六月」', State.lockSolved('L2')],
      ['结案：三个问题全部答对', State.deductionSolved()],
      ['打开 starfall.zip', !!d.starfall.unlocked],
      ['把证据发给苏晴', !!d.starfall.sent]
    ];
    var box = UI.h('div', { class: 'q-block' });
    box.appendChild(UI.h('div', { class: 'q-prompt', text: '主线步骤' }));
    items.forEach(function (it, i) {
      box.appendChild(UI.h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', padding: '5px 4px', fontSize: '13px', color: it[1] ? 'var(--green)' : 'var(--tx2)' }, 'data-testid': 'ck-' + i },
        UI.h('span', { style: { fontFamily: 'var(--mono)', width: '16px' }, text: it[1] ? '✓' : '·' }),
        UI.h('span', { style: it[1] ? { textDecoration: 'line-through', opacity: '.75' } : {} , text: it[0] })));
    });
    pane.appendChild(box);

    var cb = UI.h('div', { class: 'q-block' });
    cb.appendChild(UI.h('div', { class: 'q-prompt', text: '线索收集' }));
    ['work', 'personal', 'missing'].forEach(function (ck) {
      var ids = Object.keys(DB.clues).filter(function (k) { return DB.clues[k].chain === ck; });
      var got = ids.filter(function (k) { return State.hasClue(k); }).length;
      var bar = UI.h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', padding: '5px 4px', fontSize: '13px' } },
        UI.h('span', { style: { color: DB.chains[ck].color, width: '64px' }, text: DB.chains[ck].name }),
        UI.h('span', { style: { fontFamily: 'var(--mono)', color: 'var(--tx2)' }, text: got + ' / ' + ids.length }));
      var track = UI.h('div', { style: { flex: '1', height: '6px', background: 'rgba(255,255,255,.07)', borderRadius: '3px', overflow: 'hidden' } });
      track.appendChild(UI.h('div', { style: { width: Math.round(got / ids.length * 100) + '%', height: '100%', background: DB.chains[ck].color, opacity: '.8' } }));
      bar.appendChild(track);
      cb.appendChild(bar);
    });
    pane.appendChild(cb);

    /* 不剧透的下一步建议 */
    var tips = [];
    if (!State.lockSolved('L1')) tips.push('她的工作文档里有个上锁的「归档」文件夹。密码的来历，她写在了某篇日记里。');
    else if (!State.hasClue('CL-W4')) tips.push('「归档」里有一段录音转写，值得收藏。');
    if (!State.lockSolved('L2')) tips.push('相册里少了一个相簿。密码在你们的共同记忆里——问问「第一次」。');
    else if (!State.hasClue('CL-M2')) tips.push('「六月」相簿里有一张截图，日期和「失踪」对不上。');
    if (!State.deductionSolved()) {
      var c = State.clueCount();
      if (c < 9) tips.push('线索还不够。三条线都翻一翻：邮件的草稿箱、聊天的撤回痕迹、系统日志的深夜记录、回收站。');
      tips.push('把三条线的线索并排看一遍，再去「结案」页提交你的推理。');
    } else if (!d.starfall.unlocked) tips.push('下载目录里的 starfall.zip 现在认你的密码了——那颗星。');
    else if (!d.starfall.sent) tips.push('信读完了吗？她在等一个决定。');
    var tb = UI.h('div', { class: 'q-block' });
    tb.appendChild(UI.h('div', { class: 'q-prompt', text: '下一步' }));
    if (!tips.length) tips.push('都做完了。去「时间线」把她这半年拼完整，或重读那封信。');
    tips.forEach(function (t) { tb.appendChild(UI.h('div', { style: { fontSize: '13px', color: 'var(--tx2)', padding: '4px 4px', lineHeight: '1.7' }, text: '→ ' + t })); });
    pane.appendChild(tb);

    /* 剧情回顾 */
    var rb = UI.h('div', { class: 'q-block' });
    rb.appendChild(UI.h('div', { class: 'q-prompt', text: '剧情回顾' }));
    rb.appendChild(UI.h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } },
      UI.h('button', { class: 'btn', text: '重看开场（妈妈的信/字条/便利贴）', 'data-testid': 'review-intro', on: { click: function () { Boot.replayIntro(); } } }),
      State.data.starfall.unlocked ? UI.h('button', { class: 'btn', text: '重读给知秋的信', 'data-testid': 'review-letter', on: { click: function () { Ending.playLetter(); } } }) : null,
      State.data.ended ? UI.h('button', { class: 'btn', text: '重看尾声', 'data-testid': 'review-epilogue', on: { click: function () { Ending.playEpilogue(true); } } }) : null));
    pane.appendChild(rb);
  }

  /* ---------- 提示 ---------- */
  function hintGroup(target) {
    for (var i = 0; i < DB.hints.length; i++) if (DB.hints[i].target === target || DB.hints[i].id === target) return DB.hints[i];
    return null;
  }

  function tierBox(g, tier, onRead) {
    var read = State.hintTier(g.id);
    if (read >= tier) {
      return UI.h('div', { class: 'hint-tier', 'data-testid': 'hint-' + g.id + '-t' + tier },
        UI.h('span', { class: 'tno', text: '提示 ' + tier }), UI.h('span', { text: g.tiers[tier - 1] }));
    }
    if (read === tier - 1) {
      var wrap = UI.h('div', { class: 'hint-locked' });
      var b = UI.h('button', { class: 'btn', text: '查看提示 ' + tier + (tier === 3 ? '（剧透）' : ''), 'data-testid': 'hint-open-' + g.id + '-t' + tier });
      b.addEventListener('click', function () {
        function doRead() { State.readHint(g.id, tier); if (onRead) onRead(); }
        if (tier === 3) {
          UI.confirm({ title: '第三级提示', body: '这一级会直接说出结论或密码。\n使用提示会被记录，并影响最终评价。', okLabel: '我还是要看', okTestid: 'hint-spoil-ok' }).then(function (ok) { if (ok) doRead(); });
        } else doRead();
      });
      wrap.appendChild(b);
      if (tier === 3) wrap.appendChild(UI.h('span', { class: 'hint-warn', text: '含剧透' }));
      return wrap;
    }
    return UI.h('div', { class: 'hint-locked' }, UI.h('span', { style: { fontSize: '12px', color: 'var(--tx3)' }, text: '（先查看上一级提示）' }));
  }

  function renderHints(pane) {
    pane.appendChild(UI.h('p', { style: { fontSize: '12.5px', color: 'var(--tx3)', marginBottom: '16px' }, text: '提示按三级递进：第一级只给方向，第二级指向证据，第三级直接给出结论或密码。每次新查看一级都会记录一次「提示使用」，影响最终评价。' }));
    DB.hints.forEach(function (g) {
      var used = State.hintTier(g.id);
      var box = UI.h('div', { class: 'hint-group', 'data-testid': 'hintg-' + g.id });
      var head = UI.h('div', { class: 'hint-head' },
        UI.icon(used ? 'eye' : 'starO'),
        UI.h('span', { class: 'hl', text: g.label }),
        UI.h('span', { class: 'uses', text: used ? '已看 ' + used + ' 级' : '未使用' }));
      head.addEventListener('click', function () { expandedHint = expandedHint === g.id ? null : g.id; render(); });
      box.appendChild(head);
      if (expandedHint === g.id) {
        [1, 2, 3].forEach(function (t) { box.appendChild(tierBox(g, t, function () { render(); })); });
      }
      pane.appendChild(box);
    });
  }

  /* ---------- 结案推理 ---------- */
  function renderDeduction(pane) {
    var dq = DB.deduction;
    if (State.deductionSolved()) {
      pane.appendChild(UI.h('div', { class: 'q-block', style: { borderColor: 'rgba(121,209,164,.4)' } },
        UI.h('div', { class: 'q-prompt', style: { color: 'var(--green)' }, text: '✓ ' + dq.successTitle }),
        UI.h('p', { style: { fontSize: '13px', color: 'var(--tx2)', whiteSpace: 'pre-wrap', lineHeight: '1.9' }, text: dq.successBody }),
        UI.h('div', { class: 'ded-actions' },
          UI.h('button', { class: 'btn primary', text: '去打开 starfall.zip', 'data-testid': 'goto-starfall', on: { click: function () { Apps.files.openFile('file:dl-starfall'); } } }))));
      return;
    }
    pane.appendChild(UI.h('p', { style: { fontSize: '13px', color: 'var(--tx2)', marginBottom: '18px' }, text: dq.intro }));
    dq.questions.forEach(function (q) {
      var block = UI.h('div', { class: 'q-block', 'data-testid': 'q-' + q.id });
      block.appendChild(UI.h('div', { class: 'q-prompt', text: q.prompt }));
      q.options.forEach(function (o) {
        var sel = State.data.deduction.answers[q.id] === o.id;
        var row = UI.h('label', { class: 'q-opt' + (sel ? ' sel' : ''), 'data-testid': 'opt-' + q.id + '-' + o.id },
          UI.h('input', { type: 'radio', name: 'q-' + q.id, checked: sel ? 'checked' : null }),
          UI.h('span', { class: 'ol', text: o.id }),
          UI.h('span', { class: 'ot', text: o.text }));
        row.querySelector('input').addEventListener('change', function () { State.setAnswer(q.id, o.id); render(); });
        block.appendChild(row);
      });
      var fb = State.data.deduction.lastWrong && State.data.deduction.lastWrong[q.id];
      if (fb) block.appendChild(UI.h('div', { class: 'q-fb bad', text: fb }));
      pane.appendChild(block);
    });
    var acts = UI.h('div', { class: 'ded-actions' });
    var submit = UI.h('button', { class: 'btn primary', text: '提交推理', 'data-testid': 'ded-submit' });
    submit.addEventListener('click', function () { submitDeduction(pane); });
    acts.appendChild(submit);
    var hintBtn = UI.h('button', { class: 'btn', text: '卡住了？看提示', 'data-testid': 'ded-hint' });
    hintBtn.addEventListener('click', function () { curTab = 'hints'; render(); });
    acts.appendChild(hintBtn);
    acts.appendChild(UI.h('span', { style: { fontSize: '12px', color: 'var(--tx3)' }, text: '已尝试 ' + (State.data.deduction.attempts || 0) + ' 次' }));
    pane.appendChild(acts);
  }

  function submitDeduction(pane) {
    var dq = DB.deduction;
    var missing = dq.questions.filter(function (q) { return !State.data.deduction.answers[q.id]; });
    if (missing.length) { UI.toast('还有 ' + missing.length + ' 个问题没有作答。', { type: 'sys' }); return; }
    State.data.deduction.attempts++;
    var wrong = [];
    var lastWrong = {};
    dq.questions.forEach(function (q) {
      var a = State.data.deduction.answers[q.id];
      if (a !== q.correct) { wrong.push(q); lastWrong[q.id] = q.wrongFeedback[a] || '这个结论与证据矛盾。'; }
    });
    State.data.deduction.lastWrong = lastWrong;
    if (!wrong.length) {
      State.data.deduction.solved = true;
      State.data.deduction.lastWrong = {};
      State.save();
      render();
      UI.modal({
        wide: true, title: '✓ ' + dq.successTitle,
        bodyNode: UI.h('p', { style: { whiteSpace: 'pre-wrap', lineHeight: '1.9' }, text: dq.successBody }),
        actions: [
          { label: '稍后再说' },
          { label: '去打开 starfall.zip', cls: 'primary', testid: 'modal-goto-starfall', onClick: function () { Apps.files.openFile('file:dl-starfall'); } }
        ]
      });
      UI.toast('结案成立。下载目录里的 starfall.zip 现在可以打开了。', { type: 'clue', title: '☆ 推理成功', ms: 6000 });
    } else {
      State.save();
      render();
      var chainHint = wrong[0].id === 'Q1' ? '失踪线' : (wrong[0].id === 'Q2' ? '人际线' : '失踪线');
      UI.toast('有 ' + wrong.length + ' 项与证据矛盾。建议回到线索板看看「' + chainHint + '」。', { type: 'sys', ms: 5200 });
    }
  }

  /* ---------- 进度 ---------- */
  function renderAbout(pane) {
    var total = Object.keys(DB.clues).length;
    var cur = State.describe(State.data);
    pane.appendChild(UI.h('div', { class: 'stat-grid' },
      UI.h('div', { class: 'stat-card' }, UI.h('div', { class: 'v', text: cur.clues + '/' + total }), UI.h('div', { class: 'k', text: '关键线索' })),
      UI.h('div', { class: 'stat-card' }, UI.h('div', { class: 'v', text: String(cur.hints) }), UI.h('div', { class: 'k', text: '提示使用' })),
      UI.h('div', { class: 'stat-card' }, UI.h('div', { class: 'v', text: String(Object.keys(State.data.locks).length) + '/4' }), UI.h('div', { class: 'k', text: '已解锁' })),
      UI.h('div', { class: 'stat-card' }, UI.h('div', { class: 'v', text: cur.ended ? '已通关' : (cur.solved ? '已结案' : '调查中') }), UI.h('div', { class: 'k', text: '状态' }))
    ));
    var locks = UI.h('div', { style: { fontSize: '12.5px', color: 'var(--tx2)', lineHeight: '2' } });
    Object.keys(DB.locks).forEach(function (lid) {
      locks.appendChild(UI.h('div', { text: (State.lockSolved(lid) ? '✓ ' : '· ') + DB.locks[lid].label + (State.lockSolved(lid) ? '（已解锁）' : '（未解锁）') }));
    });
    pane.appendChild(locks);
    var acts = UI.h('div', { style: { display: 'flex', gap: '10px', marginTop: '20px' } });
    acts.appendChild(UI.h('button', { class: 'btn', text: '存档管理…', on: { click: function () { SystemUI.openSave(); } } }));
    acts.appendChild(UI.h('button', { class: 'btn', text: '导出存档', on: { click: function () { SystemUI.openSave(); } } }));
    pane.appendChild(acts);
    pane.appendChild(UI.h('p', { style: { marginTop: '22px', fontSize: '11.5px', color: 'var(--tx3)', lineHeight: '1.8' }, text: '评价规则：S＝线索≥16 且提示≤2；A＝线索≥13 且提示≤5；B＝线索≥9；C＝其余。评价只影响结算文字，不影响通关。\n\n本游戏所有人物、公司、案件与网页均为虚构。' }));
  }

  /* ---------- 渲染 ---------- */
  function render() {
    if (!win) return;
    var root = win._main; root.innerHTML = '';
    var tabs = UI.h('div', { class: 'inv-tabs' });
    TABS.forEach(function (t) {
      var b = UI.h('button', { class: 'inv-tab' + (curTab === t.id ? ' on' : ''), text: t.label, 'data-testid': 'tab-' + t.id });
      if (t.id === 'board') {
        var total = Object.keys(DB.clues).length;
        b.appendChild(UI.h('span', { style: { marginLeft: '6px', fontSize: '11px', color: 'var(--tx3)', fontFamily: 'var(--mono)' }, text: State.clueCount() + '/' + total }));
      }
      b.addEventListener('click', function () { curTab = t.id; render(); });
      tabs.appendChild(b);
    });
    root.appendChild(tabs);
    var pane = UI.h('div', { class: 'inv-pane', 'data-testid': 'inv-pane-' + curTab });
    root.appendChild(pane);
    if (curTab === 'board') renderBoard(pane);
    else if (curTab === 'timeline') renderTimeline(pane);
    else if (curTab === 'checklist') renderChecklist(pane);
    else if (curTab === 'hints') renderHints(pane);
    else if (curTab === 'deduction') renderDeduction(pane);
    else renderAbout(pane);
  }

  /* ---------- 提示弹窗（锁屏/密码框调用） ---------- */
  function hintModal(target) {
    var g = hintGroup(target);
    if (!g) { UI.modal({ title: '提示', body: '暂时没有关于这一步的提示。', actions: [{ label: '好' }] }); return; }
    var body = UI.h('div', {});
    function draw() {
      body.innerHTML = '';
      [1, 2, 3].forEach(function (t) { body.appendChild(tierBox(g, t, draw)); });
    }
    draw();
    UI.modal({ title: '提示 · ' + g.label, bodyNode: body, wide: true, actions: [{ label: '关闭' }] });
  }

  Apps.investigate = {
    open: function (tab) { if (tab) curTab = tab; ensure(); },
    refresh: function () { if (win) render(); },
    hintModal: hintModal,
    openHint: function (target) {
      expandedHint = (hintGroup(target) || {}).id || null;
      curTab = 'hints';
      ensure(); render();
    },
    gotoSource: gotoSource
  };
})();
