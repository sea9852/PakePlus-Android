/* calendar.js —— 日历视图：月网格 + 选中日期 + 当天打卡记录 */
(function () {
  'use strict';

  var App = (window.App = window.App || {});
  var D = App.DateUtil;

  var Calendar = {
    view: { year: 0, month: 0 },
    selectedKey: '',
    animating: false,
    el: {},
    ready: false,
    pressTimer: null,

    init: function () {
      var $ = function (id) { return document.getElementById(id); };

      var today = new Date();
      this.view = { year: today.getFullYear(), month: today.getMonth() };
      this.selectedKey = D.todayKey();

      this.el = {
        year: $('calYear'),
        month: $('calMonth'),
        grid: $('calGrid'),
        body: $('calGrid').parentElement,
        dayLabel: $('calDayLabel'),
        daySub: $('calDaySub'),
        list: $('recordList'),
        empty: $('recordEmpty'),
        count: $('rcCount'),
        tip: $('recordTip'),
        stat: $('calStat'),
        todayBtn: $('todayBtn'),
        detail: $('calDetail')
      };

      this.bind();
      this.render();
      this.ready = true;

      var self = this;
      App.Store.onChange(function () { self.onDataChanged(); });
    },

    bind: function () {
      var self = this;

      this.el.grid.addEventListener('click', function (e) {
        var cell = e.target.closest('.cal-cell');
        if (!cell) return;
        self.selectDate(cell.getAttribute('data-key'));
      });

      this.el.todayBtn.addEventListener('click', function () {
        self.goToday();
      });

      // 统计行点击 → 进入全部记录页
      if (this.el.stat) {
        this.el.stat.addEventListener('click', function () {
          App.Pager.go(2);
        });
      }

      this.bindPress();

      document.getElementById('delCancel').addEventListener('click', function () {
        App.Sheet.close('del');
      });

      document.getElementById('delOk').addEventListener('click', function () {
        self.confirmDelete();
      });
    },

    /* ---------- 渲染 ---------- */

    render: function () {
      this.el.year.textContent = this.view.year;
      this.el.month.textContent = D.pad2(this.view.month + 1);

      var cells = D.monthMatrix(this.view.year, this.view.month);
      var counts = App.Store.countsInMonth(this.view.year, this.view.month);
      var selKey = this.selectedKey;
      var html = '';

      for (var i = 0; i < cells.length; i++) {
        var c = cells[i];
        var n = counts[c.key] || 0;
        var cls = 'cal-cell';
        if (!c.inMonth) cls += ' out';
        if (c.isToday) cls += ' today';
        if (c.key === selKey) cls += ' sel';
        if (n > 0) cls += ' has';

        html += '<button type="button" class="' + cls + '" data-key="' + c.key + '">' +
          '<span class="num">' + c.day + '</span>' +
          '<span class="marks">' + marksFor(n) + '</span>' +
          '</button>';
      }

      this.el.grid.innerHTML = html;
      this.renderDetail();
    },

    renderDetail: function () {
      var key = this.selectedKey;
      var records = App.Store.listByDate(key);
      var n = records.length;

      this.el.dayLabel.textContent = D.dayLabel(key);

      var rel = D.relativeLabel(key);
      this.el.daySub.textContent = rel;

      this.renderMonthStat();

      if (n === 0) {
        this.el.count.textContent = '';
        this.el.list.innerHTML = '';
        this.el.list.hidden = true;
        this.el.empty.classList.add('show');
        this.el.tip.hidden = true;
        return;
      }

      this.el.count.textContent = '共 ' + n + ' 次';
      this.el.empty.classList.remove('show');
      this.el.list.hidden = false;
      this.el.tip.hidden = false;

      var html = '';
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        var note = r.note
          ? '<span class="rec-note">' + escapeHtml(r.note) + '</span>'
          : '<span class="rec-note is-empty">—</span>';
        html += '<li data-id="' + r.id + '">' +
          '<span class="rec-time">' + D.timeLabel(r.t) + '</span>' +
          '<span class="rec-axis"><i class="node"></i></span>' +
          note +
          '</li>';
      }
      this.el.list.innerHTML = html;
    },

    renderMonthStat: function () {
      var counts = App.Store.countsInMonth(this.view.year, this.view.month);
      var days = 0;
      var total = 0;
      for (var k in counts) {
        days++;
        total += counts[k];
      }
      if (!this.el.stat) return;
      this.el.stat.textContent = days
        ? this.view.year + ' 年 ' + (this.view.month + 1) + ' 月 · 打卡 ' +
          days + ' 天 · 共 ' + total + ' 次　›'
        : this.view.year + ' 年 ' + (this.view.month + 1) + ' 月 · 本月还没有打卡';
    },

    /* ---------- 选中与翻月 ---------- */
    selectDate: function (key, opts) {
      if (!key) return;
      this.selectedKey = key;

      var d = D.fromKey(key);
      if (d.getFullYear() !== this.view.year || d.getMonth() !== this.view.month) {
        this.view = { year: d.getFullYear(), month: d.getMonth() };
        this.render();
      } else {
        this.syncSelection();
      }

      if (opts && opts.fromPunch) {
        this.el.detail.scrollTop = 0;
      }
    },

    /** 仅更新选中态，避免整格重绘的闪烁 */
    syncSelection: function () {
      var cells = this.el.grid.children;
      for (var i = 0; i < cells.length; i++) {
        cells[i].classList.toggle('sel', cells[i].getAttribute('data-key') === this.selectedKey);
      }
      this.renderDetail();
    },

    /** 切到目标月后的默认选中：优先该月第一个有记录的日子，否则今天（若在本月）或 1 号 */
    autoSelectInMonth: function () {
      var y = this.view.year;
      var m = this.view.month;
      var counts = App.Store.countsInMonth(y, m);
      var keys = Object.keys(counts).sort();

      if (keys.length) {
        this.selectedKey = keys[0];
        return;
      }

      var tKey = D.todayKey();
      var td = D.fromKey(tKey);
      this.selectedKey = (td.getFullYear() === y && td.getMonth() === m)
        ? tKey
        : y + '-' + D.pad2(m + 1) + '-01';
    },

    /**
     * 动画切到「指定的」年月（不是相对移动）。
     * dir 只决定动画方向：1 = 从右进，-1 = 从左进。
     * keepSelection = true 时保留当前选中日期，不自动改选。
     */
    animateToMonth: function (year, month, dir, keepSelection) {
      var g = this.el.grid;
      var self = this;
      var token = this.animToken = (this.animToken || 0) + 1;

      clearTimeout(this.animTimer);
      clearTimeout(this.animEndTimer);

      // 动画进行中又来一次：直接落位，避免动画排队导致月份错乱
      if (this.animating) {
        this.animating = false;
        this.view = { year: year, month: month };
        if (!keepSelection) this.autoSelectInMonth();
        this.render();
        g.style.transition = '';
        g.style.transform = '';
        g.style.opacity = '';
        return;
      }

      this.animating = true;
      g.style.transition = 'transform .15s ease-out, opacity .15s ease-out';
      g.style.transform = 'translateX(' + (-dir * 26) + '%)';
      g.style.opacity = '0.15';

      this.animTimer = setTimeout(function () {
        if (token !== self.animToken) return;

        self.view = { year: year, month: month };
        if (!keepSelection) self.autoSelectInMonth();
        self.render();

        g.style.transition = 'none';
        g.style.transform = 'translateX(' + (dir * 26) + '%)';
        g.style.opacity = '0.15';
        void g.offsetWidth;

        g.style.transition = 'transform .24s cubic-bezier(.25,.9,.25,1), opacity .24s ease';
        g.style.transform = 'translateX(0)';
        g.style.opacity = '1';

        self.animEndTimer = setTimeout(function () {
          if (token !== self.animToken) return;
          self.animating = false;
          g.style.transition = '';
          g.style.transform = '';
        }, 260);
      }, 150);
    },

    /** 相对切月（手势触发） */
    swipeMonth: function (dir) {
      if (this.animating) return;
      var y = this.view.year;
      var m = this.view.month + dir;
      if (m < 0) { m = 11; y -= 1; }
      if (m > 11) { m = 0; y += 1; }
      this.animateToMonth(y, m, dir, false);
    },

    dragMonth: function (dx) {
      if (this.animating) return;
      var g = this.el.grid;
      g.style.transition = 'none';
      g.style.transform = 'translateX(' + (dx * 0.34) + 'px)';
      g.style.opacity = String(1 - Math.min(Math.abs(dx) / 1100, 0.22));
    },

    resetMonthDrag: function () {
      var g = this.el.grid;
      g.style.transition = 'transform .26s cubic-bezier(.25,.9,.25,1), opacity .2s ease';
      g.style.transform = 'translateX(0)';
      g.style.opacity = '1';
      var self = this;
      setTimeout(function () {
        if (!self.animating) {
          g.style.transition = '';
          g.style.transform = '';
        }
      }, 280);
    },

    goToday: function () {
      var key = D.todayKey();
      var d = D.fromKey(key);
      var target = d.getFullYear() * 12 + d.getMonth();
      var current = this.view.year * 12 + this.view.month;

      this.selectedKey = key;
      this.el.detail.scrollTop = 0;

      if (target === current) {
        this.syncSelection();
      } else {
        this.animateToMonth(d.getFullYear(), d.getMonth(), target > current ? 1 : -1, true);
      }

      if (navigator.vibrate) {
        try { navigator.vibrate(10); } catch (e) {}
      }
    },

    /* ---------- 长按删除 ---------- */

    bindPress: function () {
      var self = this;
      var listEl = this.el.list;

      function start(li) {
        if (!li) return;
        self.clearPress();
        li.classList.add('pressing');
        self.pressTimer = setTimeout(function () {
          self.pressTimer = null;
          li.classList.remove('pressing');
          self.askDelete(li.getAttribute('data-id'));
        }, 560);
      }

      function stop(li) {
        self.clearPress();
        if (li) li.classList.remove('pressing');
      }

      listEl.addEventListener('touchstart', function (e) {
        start(e.target.closest('li[data-id]'));
      }, { passive: true });

      listEl.addEventListener('touchmove', function (e) {
        stop(e.target.closest('li[data-id]'));
      }, { passive: true });

      listEl.addEventListener('touchend', function (e) {
        stop(e.target.closest('li[data-id]'));
      }, { passive: true });

      listEl.addEventListener('touchcancel', function (e) {
        stop(e.target.closest('li[data-id]'));
      }, { passive: true });

      listEl.addEventListener('mousedown', function (e) {
        start(e.target.closest('li[data-id]'));
      });

      listEl.addEventListener('mouseup', function (e) {
        stop(e.target.closest('li[data-id]'));
      });

      listEl.addEventListener('mouseleave', function (e) {
        stop(e.target.closest('li[data-id]'));
      });
    },

    clearPress: function () {
      if (this.pressTimer) {
        clearTimeout(this.pressTimer);
        this.pressTimer = null;
      }
    },

    askDelete: function (id) {
      if (!id) return;
      var rec = App.Store.findById(id);
      if (!rec) return;

      this.pendingDeleteId = id;
      document.getElementById('delDesc').textContent =
        D.timeLabel(rec.t) + ' · ' + (rec.note || '未填写备注');
      App.Sheet.open('del');

      if (navigator.vibrate) {
        try { navigator.vibrate(14); } catch (e) {}
      }
    },

    confirmDelete: function () {
      var id = this.pendingDeleteId;
      this.pendingDeleteId = null;
      App.Sheet.close('del');

      if (!id) return;
      var ok = App.Store.remove(id);
      App.Toast(ok ? '已删除' : '删除失败');
    },

    /* ---------- 数据变更联动 ---------- */

    onDataChanged: function () {
      if (!this.ready) return;
      this.renderDetail();
      this.refreshDots();

      // 新增/删除后可能有新的打卡日，刷新次数标记
      var cells = this.el.grid.children;
      var counts = App.Store.countsInMonth(this.view.year, this.view.month);
      for (var i = 0; i < cells.length; i++) {
        var k = cells[i].getAttribute('data-key');
        var n = counts[k] || 0;
        cells[i].classList.toggle('has', n > 0);
        var marks = cells[i].querySelector('.marks');
        if (marks) marks.innerHTML = marksFor(n);
      }
    },

    refreshDots: function () {
      // 保留接口：数据变更后如需重绘整格可在此扩展
    }
  };

  /** 打卡次数可视化：1 次一个点、2 次两个点、3 次及以上一段短条 */
  function marksFor(n) {
    if (!n) return '';
    if (n === 1) return '<i></i>';
    if (n === 2) return '<i></i><i></i>';
    return '<i class="bar"></i>';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  App.Calendar = Calendar;
})();
