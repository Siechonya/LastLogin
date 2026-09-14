/* db.js — 数据合并与索引（浏览器 / Node 验证器共用 globalThis.LL 数据） */
(function () {
  var LL = globalThis.LL || {};
  var DB = (globalThis.DB = {});

  DB.meta = LL.meta || {};
  DB.characters = LL.characters || {};
  DB.locks = LL.locks || {};
  DB.clues = LL.clues || {};
  DB.chains = LL.chains || {};
  DB.hints = LL.hints || [];
  DB.deduction = LL.deduction || { questions: [] };
  DB.intro = LL.intro || { cards: [] };
  DB.ending = LL.ending || { epilogue: [], ranks: {} };

  DB.files = (LL.filesWork || []).concat(LL.filesWork2 || []).concat(LL.filesMissing || []);
  DB.emails = (LL.emails || []).concat(LL.emails2 || []);
  DB.chats = (LL.chatsA || []).concat(LL.chatsB || []).concat(LL.chatsC || []).concat(LL.chatsD || []).concat(LL.chats || []);
  DB.photos = LL.photos || [];
  DB.browser = LL.browser || { pages: [], history: [], bookmarks: [] };
  DB.calendar = LL.calendar || [];
  DB.syslogs = LL.syslogs || [];
  DB.notes = LL.notes || [];

  /* ---- id 索引 ---- */
  DB.byId = {};
  function reg(item, kind, extra) {
    if (!item || !item.id) return;
    DB.byId[item.id] = Object.assign({ _kind: kind }, item, extra || {});
  }
  DB.files.forEach(function (f) { reg(f, 'file'); });
  DB.emails.forEach(function (m) { reg(m, 'email'); });
  DB.photos.forEach(function (p) { reg(p, 'photo'); });
  DB.browser.pages.forEach(function (p) { reg(p, 'page'); });
  DB.browser.history.forEach(function (h) { reg(h, 'hist'); });
  DB.browser.bookmarks.forEach(function (b) { reg(b, 'bookmark'); });
  DB.calendar.forEach(function (c) { reg(c, 'cal'); });
  DB.syslogs.forEach(function (l) { reg(l, 'log'); });
  DB.notes.forEach(function (n) { reg(n, 'note'); });
  DB.chats.forEach(function (conv) {
    reg(conv, 'conv');
    (conv.messages || []).forEach(function (msg) {
      if (msg && msg.id) DB.byId[msg.id] = Object.assign({ _kind: 'msg', _conv: conv.id }, msg);
    });
  });
  DB.get = function (id) { return DB.byId[id] || null; };

  /* ---- 文件夹树（由 path 推导） ---- */
  function node(name, path) {
    return { name: name, path: path, folders: {}, files: [], _order: [] };
  }
  var root = node('', '/');
  DB.root = root;
  DB.fileNodes = {};

  function splitPath(p) {
    var parts = String(p || '').split('/').filter(function (s) { return s !== ''; });
    return parts;
  }
  DB.files.forEach(function (f) {
    var parts = splitPath(f.path);
    if (!parts.length) return;
    var fname = parts.pop();
    var cur = root, acc = '';
    parts.forEach(function (seg) {
      acc += '/' + seg;
      if (!cur.folders[seg]) { cur.folders[seg] = node(seg, acc); cur._order.push(seg); }
      cur = cur.folders[seg];
    });
    f._name = fname;
    f._dir = parts.length ? '/' + parts.join('/') : '/';
    cur.files.push(f);
    DB.fileNodes[f.id] = f;
  });

  /* 锁 → 文件夹路径 */
  DB.lockedFolders = {};
  Object.keys(DB.locks).forEach(function (lid) {
    var lk = DB.locks[lid];
    if (lk.kind === 'folder') DB.lockedFolders[lk.target] = lid;
  });
  DB.folderLockId = function (path) { return DB.lockedFolders[path] || null; };

  /* ---- 会话/消息辅助 ---- */
  DB.convById = {};
  DB.chats.forEach(function (c) { DB.convById[c.id] = c; });
  DB.msgById = function (id) { var x = DB.byId[id]; return x && x._kind === 'msg' ? x : null; };

  /* ---- 照片辅助 ---- */
  DB.photoById = {};
  DB.photos.forEach(function (p) { DB.photoById[p.id] = p; });

  /* ---- 线索来源反查：clue id → 载体条目 ---- */
  DB.clueSource = {};
  Object.keys(DB.clues).forEach(function (cid) {
    var src = DB.clues[cid].source;
    DB.clueSource[cid] = DB.byId[src] ? src : null;
  });

  /* ---- 内容规模统计（调试/结算用） ---- */
  DB.counts = {
    files: DB.files.length, emails: DB.emails.length,
    messages: DB.chats.reduce(function (n, c) { return n + (c.messages || []).length; }, 0),
    photos: DB.photos.length, pages: DB.browser.pages.length,
    history: DB.browser.history.length, calendar: DB.calendar.length,
    syslogs: DB.syslogs.length, notes: DB.notes.length
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = DB;
})();
