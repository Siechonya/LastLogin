/* apps/investigate.js — 调查手册：线索板 / 渐进提示 / 结案推理 / 进度 */
(function () {
  var Apps = (globalThis.Apps = globalThis.Apps || {});
  var win = null, curTab = 'board', expandedHint = null;
  var TABS = [
    { id: 'board', label: '线索板' },
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
        } else {
          card.appendChild(UI.h('div', { class: 'cs', text: '继续翻这台电脑。她一定留下了什么。' }));
        }
        block.appendChild(card);
      });
      pane.appendChild(block);
    });
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
