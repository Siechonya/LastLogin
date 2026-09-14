/* core/progress.js — 目的性与奖励引擎：章节目标 / 关联发现 / 成就
 * 在关键动作（收藏线索、解锁、结案、发送、写笔记）后调用 Progress.sync()，
 * 计算新解锁项并以非阻塞 toast 反馈；章节笔记由玩家在「目标」页主动阅读。 */
(function () {
  var P = (globalThis.Progress = {});

  P.needMet = function (need) {
    if (!need) return true;
    if (need === 'ended') return !!State.data.ended;
    if (need === 'deduction') return State.deductionSolved();
    if (need === 'unlocked') return !!State.data.starfall.unlocked;
    if (need === 'sent') return !!State.data.starfall.sent;
    if (need.indexOf('CL-') === 0) return State.hasClue(need);
    if (need.indexOf('lock:') === 0) return State.lockSolved(need.slice(5));
    return State.seen(need);
  };

  P.currentChapter = function () {
    var cs = DB.chapters || [];
    for (var i = 0; i < cs.length; i++) if (State.data.chaptersDone.indexOf(cs[i].id) < 0) return cs[i];
    return null;
  };

  function achState() {
    var d = State.data;
    var chainsFull = ['work', 'personal', 'missing'].some(function (ck) {
      var ids = Object.keys(DB.clues).filter(function (k) { return DB.clues[k].chain === ck; });
      return ids.length && ids.every(function (k) { return State.hasClue(k); });
    });
    var tlFull = (DB.timeline || []).length > 0 && (DB.timeline || []).every(function (t) { return P.needMet(t.need); });
    var wroteNote = Object.keys(d.userNotes || {}).some(function (k) { return String(d.userNotes[k] || '').trim(); });
    var solved = State.deductionSolved();
    var mins = ((Date.now() - d.playStart) + (d.playMs || 0)) / 60000;
    return {
      'ach-first': State.clueCount() >= 1,
      'ach-ghost': State.hasClue('CL-P4'),
      'ach-recall': State.hasClue('CL-P5'),
      'ach-chain': chainsFull,
      'ach-all': State.clueCount() >= Object.keys(DB.clues).length,
      'ach-timeline': tlFull,
      'ach-scribe': wroteNote,
      'ach-truth': solved,
      'ach-clean': solved && (d.hintUses || 0) === 0,
      'ach-perfect': solved && (d.hintUses || 0) === 0 && State.clueCount() >= Object.keys(DB.clues).length,
      'ach-swift': !!d.ended && mins <= 40,
      'ach-send': !!d.starfall.sent
    };
  }
  P.achState = achState;

  P.sync = function () {
    if (!State || !State.data) return;
    var d = State.data;
    var fired = 0;

    (DB.insights || []).forEach(function (ins) {
      if (d.insights.indexOf(ins.id) >= 0) return;
      if ((ins.need || []).every(P.needMet)) {
        d.insights.push(ins.id); fired++;
        UI.toast(ins.title + '：' + ins.text, { type: 'clue', title: '✦ 关联发现（线索板可见）', ms: 6500 });
      }
    });

    (DB.chapters || []).forEach(function (ch) {
      if (d.chaptersDone.indexOf(ch.id) >= 0) return;
      if ((ch.objectives || []).every(function (o) { return P.needMet(o.need); })) {
        d.chaptersDone.push(ch.id); fired++;
        UI.toast(ch.title + ' 完成。去「调查手册 → 目标」读她写下的笔记。', { type: 'clue', title: '✓ 章节完成', ms: 7000 });
      }
    });

    var A = achState();
    (DB.achievements || []).forEach(function (a) {
      if (d.ach.indexOf(a.id) >= 0) return;
      if (A[a.id]) { d.ach.push(a.id); fired++; UI.toast(a.title + ' — ' + a.desc, { type: 'clue', title: '★ 成就达成', ms: 5200 }); }
    });

    if (fired) State.save();
    if (globalThis.Apps && Apps.investigate && Apps.investigate.refreshChip) Apps.investigate.refreshChip();
  };
})();
