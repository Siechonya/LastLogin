/* state.js — 游戏状态与存档（localStorage，自动+手动槽位，导入导出） */
(function () {
  var KEY_AUTO = 'lastlogin.v1.autosave';
  var KEY_SLOT = function (n) { return 'lastlogin.v1.slot.' + n; };
  var S = (globalThis.State = {});

  S.storageOK = true;
  S.data = null;

  function fresh() {
    return {
      v: 1,
      introDone: false,
      loggedIn: false,
      clues: [],            // 已收藏线索 id
      locks: {},            // lockId -> true
      hints: {},            // hintId -> 已读到的 tier（1..3）
      hintUses: 0,
      seen: {},             // 已读条目 id -> true
      deduction: { answers: {}, solved: false, attempts: 0, lastWrong: {} },
      starfall: { unlocked: false, sent: false },
      ended: false,
      rank: null,
      userNotes: {},        // 玩家便签 id -> 文本
      playStart: Date.now(),
      playMs: 0
    };
  }

  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { S.storageOK = false; return null; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, val); return true; }
    catch (e) { S.storageOK = false; return false; }
  }
  function del(key) { try { localStorage.removeItem(key); } catch (e) { S.storageOK = false; } }

  S.init = function () {
    var raw = read(KEY_AUTO);
    if (raw) {
      try {
        var d = JSON.parse(raw);
        if (d && d.v === 1) { S.data = Object.assign(fresh(), d); return true; }
      } catch (e) { /* 损坏则新开 */ }
    }
    S.data = fresh();
    return false;
  };

  var timer = null;
  S.save = function () {
    if (!S.data) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () {
      timer = null;
      S.data.playMs = Date.now() - S.data.playStart + (S.data.playMs || 0);
      S.data.playStart = Date.now();
      write(KEY_AUTO, JSON.stringify(S.data));
    }, 250);
  };
  S.saveNow = function () {
    if (!S.data) return;
    S.data.playMs = Date.now() - S.data.playStart + (S.data.playMs || 0);
    S.data.playStart = Date.now();
    write(KEY_AUTO, JSON.stringify(S.data));
  };

  S.reset = function () {
    del(KEY_AUTO);
    S.data = fresh();
    S.save();
  };

  /* ---- 线索 ---- */
  S.hasClue = function (id) { return S.data.clues.indexOf(id) >= 0; };
  S.addClue = function (id) {
    if (!id || S.hasClue(id)) return false;
    if (!DB.clues[id]) return false;
    S.data.clues.push(id);
    S.save();
    return true;
  };
  S.clueCount = function () { return S.data.clues.length; };

  /* ---- 锁 ---- */
  S.lockSolved = function (id) { return !!S.data.locks[id]; };
  S.solveLock = function (id) { S.data.locks[id] = true; S.save(); };

  /* ---- 提示 ---- */
  S.hintTier = function (hid) { return S.data.hints[hid] || 0; };
  S.readHint = function (hid, tier) {
    var cur = S.hintTier(hid);
    if (tier > cur) { S.data.hints[hid] = tier; S.data.hintUses++; }
    S.save();
  };

  /* ---- 已读 ---- */
  S.markSeen = function (id) { if (id && !S.data.seen[id]) { S.data.seen[id] = true; S.save(); } };
  S.seen = function (id) { return !!S.data.seen[id]; };

  /* ---- 推理 ---- */
  S.setAnswer = function (qid, opt) { S.data.deduction.answers[qid] = opt; S.save(); };
  S.deductionSolved = function () { return !!S.data.deduction.solved; };

  /* ---- 便签 ---- */
  S.setUserNote = function (id, text) { S.data.userNotes[id] = text; S.save(); };

  /* ---- 评价 ---- */
  S.computeRank = function () {
    var c = S.clueCount(), h = S.data.hintUses;
    if (c >= 16 && h <= 2) return 'S';
    if (c >= 13 && h <= 5) return 'A';
    if (c >= 9) return 'B';
    return 'C';
  };

  /* ---- 手动槽位 ---- */
  S.slotInfo = function (n) {
    var raw = read(KEY_SLOT(n));
    if (!raw) return null;
    try { var d = JSON.parse(raw); return d; } catch (e) { return null; }
  };
  S.slotSave = function (n) { S.saveNow(); var raw = read(KEY_AUTO); if (raw) write(KEY_SLOT(n), raw); };
  S.slotLoad = function (n) {
    var raw = read(KEY_SLOT(n));
    if (!raw) return false;
    try {
      var d = JSON.parse(raw);
      if (!d || d.v !== 1) return false;
      S.data = Object.assign(fresh(), d);
      S.data.playStart = Date.now();
      S.save();
      return true;
    } catch (e) { return false; }
  };
  S.slotDelete = function (n) { del(KEY_SLOT(n)); };

  S.exportJSON = function () { S.saveNow(); return read(KEY_AUTO) || JSON.stringify(S.data); };
  S.importJSON = function (str) {
    try {
      var d = JSON.parse(str);
      if (!d || d.v !== 1) return false;
      S.data = Object.assign(fresh(), d);
      S.data.playStart = Date.now();
      S.save();
      return true;
    } catch (e) { return false; }
  };

  S.describe = function (d) {
    if (!d) return null;
    var mins = Math.round((d.playMs || 0) / 60000);
    return {
      clues: (d.clues || []).length,
      hints: d.hintUses || 0,
      solved: !!(d.deduction && d.deduction.solved),
      ended: !!d.ended,
      minutes: mins,
      when: d._savedAt || null
    };
  };
})();
