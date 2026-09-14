/* apps/calendar.js — 日历 */
(function () {
  var Apps = (globalThis.Apps = globalThis.Apps || {});
  var win = null, year = 2026, month = 6, showDeleted = true, selEvent = null;

  function eventsOn(dstr) {
    return DB.calendar.filter(function (c) { return String(c.date).slice(0, 10) === dstr && (showDeleted || !c.deleted); });
  }

  function ensure() {
    if (win && WM.get('calendar')) { render(); WM.focus(WM.get('calendar')); return; }
    var content = UI.h('div', { class: 'cal-wrap', 'data-testid': 'cal-wrap' });
    win = WM.open({
      appId: 'calendar', title: '日历', icon: 'calendar', width: 880, height: 620, content: content,
      onClose: function () { win = null; }
    });
    win._main = content;
    render();
  }

  function render() {
    if (!win) return;
    var root = win._main; root.innerHTML = '';
    var head = UI.h('div', { class: 'cal-head' });
    head.appendChild(UI.h('div', { class: 'm', text: year + ' 年 ' + month + ' 月' }));
    var nav = UI.h('div', { class: 'cal-nav' });
    var tog = UI.h('button', { class: 'btn', style: { padding: '4px 12px', fontSize: '12px' }, text: (showDeleted ? '隐藏' : '显示') + '已删除事件', 'data-testid': 'cal-tog' });
    tog.addEventListener('click', function () { showDeleted = !showDeleted; render(); });
    var prev = UI.h('button', { class: 'btn', style: { padding: '4px 12px' }, text: '‹' });
    prev.addEventListener('click', function () { month--; if (month < 1) { month = 12; year--; } render(); });
    var next = UI.h('button', { class: 'btn', style: { padding: '4px 12px' }, text: '›' });
    next.addEventListener('click', function () { month++; if (month > 12) { month = 1; year++; } render(); });
    nav.appendChild(tog); nav.appendChild(prev); nav.appendChild(next);
    head.appendChild(nav);
    root.appendChild(head);

    var grid = UI.h('div', { class: 'cal-grid' });
    ['一', '二', '三', '四', '五', '六', '日'].forEach(function (d) { grid.appendChild(UI.h('div', { class: 'cal-dow', text: d })); });
    var first = new Date(year, month - 1, 1);
    var lead = (first.getDay() + 6) % 7;
    var days = new Date(year, month, 0).getDate();
    for (var i = 0; i < lead; i++) grid.appendChild(UI.h('div', { class: 'cal-cell dim' }));
    for (var d = 1; d <= days; d++) {
      (function (day) {
        var dstr = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        var cell = UI.h('div', { class: 'cal-cell' + (dstr === '2026-09-10' ? ' today' : ''), 'data-testid': 'cal-' + dstr });
        cell.appendChild(UI.h('div', { class: 'dnum', text: String(day) }));
        eventsOn(dstr).forEach(function (ev) {
          var e = UI.h('div', { class: 'cal-ev' + (ev.deleted ? ' del' : '') + (/加班|约谈|合规/.test(ev.title) ? ' key' : ''), text: (ev.time ? ev.time + ' ' : '') + ev.title, 'data-testid': 'calev-' + ev.id });
          e.addEventListener('click', function (evt) { evt.stopPropagation(); selEvent = ev.id; renderDetail(root); });
          cell.appendChild(e);
        });
        grid.appendChild(cell);
      })(d);
    }
    root.appendChild(grid);
    var detail = UI.h('div', { 'data-testid': 'cal-detail' });
    root.appendChild(detail);
    renderDetail(root);
  }

  function renderDetail(root) {
    var host = root.querySelector('[data-testid="cal-detail"]');
    if (!host) return;
    host.innerHTML = '';
    var ev = selEvent ? DB.get(selEvent) : null;
    if (!ev) {
      host.appendChild(UI.h('div', { class: 'empty-hint', style: { padding: '18px' }, text: '点击日期上的事件查看详情。她把所有事都记在这里——包括那些她后来删掉的。' }));
      return;
    }
    var box = UI.h('div', { class: 'cal-detail' },
      UI.h('div', { class: 't', text: (ev.deleted ? '（已删除）' : '') + ev.title }),
      UI.h('div', { class: 'd', text: ev.date + (ev.time ? ' ' + ev.time : '') + (ev.recur ? ' · 每年重复' : '') }),
      ev.note ? UI.h('div', { class: 'n', text: ev.note }) : null,
      ev.deleted ? UI.h('div', { class: 'n', style: { color: 'var(--red)', marginTop: '8px' }, text: '这条事件在 2026-06-10 23:20 被删除（见系统日志）。删除本身也是一种记录。' }) : null
    );
    host.appendChild(box);
  }

  Apps.calendar = {
    open: function () { ensure(); },
    openRef: function (id) {
      var ev = DB.get(id);
      if (ev && ev.date) {
        year = parseInt(String(ev.date).slice(0, 4), 10);
        month = parseInt(String(ev.date).slice(5, 7), 10);
        selEvent = id; showDeleted = true;
        ensure(); render();
      } else ensure();
    }
  };
})();
