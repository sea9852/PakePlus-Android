/* punch.js —— 首页：大圆按钮打卡 + 今日记录 */
(function () {
  'use strict';

  var App = (window.App = window.App || {});
  var D = App.DateUtil;

  var MAX_PREVIEW = 3;

  var Punch = {
    el: {},
    pendingAt: 0,
    ready: false,
    tipTimer: null,

    init: function () {
      var $ = function (id) { return document.getElementById(id); };

      this.el = {
        week: $('todayWeek'),
        date: $('todayDate'),
        btn: $('punchBtn'),
        hint: $('punchHint'),
        list: $('miniList'),
        empty: $('miniEmpty'),
        viewAll: $('viewAllBtn'),
        tip: $('swipeTip')
      };

      this.renderHeader();
      this.bind();
      this.ready = true;
      this.refresh();
      this.scheduleTipFade();

      var self = this;
      App.Store.onChange(function () { self.refresh(); });
    },

    renderHeader: function () {
      var d = new Date();
      this.el.week.textContent = D.WEEK_CN[d.getDay()];
      this.el.date.textContent = (d.getMonth() + 1) + '月' + d.getDate() + '日';
    },

    bind: function () {
      var self = this;

      this.el.btn.addEventListener('click', function () {
        self.openNote();
      });

      this.el.viewAll.addEventListener('click', function () {
        App.Pager.go(1);
        App.Calendar.selectDate(D.todayKey(), { fromPunch: true });
      });

      document.getElementById('noteCancel').addEventListener('click', function () {
        App.Sheet.close('note');
      });

      document.getElementById('noteSave').addEventListener('click', function () {
        self.save();
      });

      var input = document.getElementById('noteInput');
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          self.save();
        }
      });
    },

    /* ---------- 打卡流程 ---------- */

    openNote: function () {
      this.pendingAt = Date.now();
      var input = document.getElementById('noteInput');
      input.value = '';
      document.getElementById('noteTime').textContent = D.fullLabel(this.pendingAt);
      App.Sheet.open('note');

      setTimeout(function () {
        try { input.focus(); } catch (e) {}
      }, 340);
    },

    save: function () {
      var input = document.getElementById('noteInput');
      var res = App.Store.add(input.value, this.pendingAt);

      App.Sheet.close('note');

      if (!res.ok) {
        App.Toast('保存失败，请检查存储空间');
        return;
      }

      this.playFeedback();
      App.Toast('已打卡 · ' + D.timeLabel(res.record.t));
      this.highlightNew(res.record.id);
    },

    playFeedback: function () {
      var btn = this.el.btn;
      btn.classList.remove('rippling');
      void btn.offsetWidth;
      btn.classList.add('rippling');
      setTimeout(function () { btn.classList.remove('rippling'); }, 600);

      if (navigator.vibrate) {
        try { navigator.vibrate(18); } catch (e) {}
      }
    },

    highlightNew: function (id) {
      var rows = this.el.list.querySelectorAll('li');
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].getAttribute('data-id') === id) {
          var row = rows[i];
          row.style.transition = 'background .3s';
          row.style.background = 'rgba(18,183,106,.1)';
          setTimeout(function () { row.style.background = 'transparent'; }, 620);
        }
      }
    },

    /* ---------- 渲染 ---------- */

    refresh: function () {
      if (!this.ready) return;

      var todayKey = D.todayKey();
      var records = App.Store.listByDate(todayKey);
      var n = records.length;

      // 顶部提示
      if (n === 0) {
        this.el.hint.innerHTML = '今天还没有打卡';
      } else if (n === 1) {
        this.el.hint.innerHTML = '今天已打卡 <b>1</b> 次 · <b>' + D.timeLabel(records[0].t) + '</b>';
      } else {
        this.el.hint.innerHTML = '今天已打卡 <b>' + n + '</b> 次';
      }

      // 今日列表
      var html = '';
      var show = records.slice(0, MAX_PREVIEW);
      for (var i = 0; i < show.length; i++) {
        var r = show[i];
        var noteHtml = r.note
          ? '<span class="mini-note">' + escapeHtml(r.note) + '</span>'
          : '<span class="mini-note is-empty">未填写备注</span>';
        html += '<li data-id="' + r.id + '">' +
          '<span class="mini-time">' + D.timeLabel(r.t) + '</span>' +
          noteHtml +
          '</li>';
      }
      this.el.list.innerHTML = html;

      if (n === 0) {
        this.el.list.hidden = true;
        this.el.empty.hidden = false;
        this.el.viewAll.hidden = true;
      } else {
        this.el.list.hidden = false;
        this.el.empty.hidden = true;
        if (n > MAX_PREVIEW) {
          this.el.viewAll.textContent = '查看全部 ' + n + ' 条';
          this.el.viewAll.hidden = false;
        } else {
          this.el.viewAll.hidden = true;
        }
      }
    },

    /* ---------- 滑动提示 ---------- */

    scheduleTipFade: function () {
      var seen = false;
      try { seen = window.localStorage.getItem('punch.tipSeen') === '1'; } catch (e) {}
      if (seen) {
        this.el.tip.classList.add('hide');
        return;
      }
      var self = this;
      this.tipTimer = setTimeout(function () {
        self.el.tip.classList.add('hide');
      }, 7000);
    },

    markTipSeen: function () {
      try { window.localStorage.setItem('punch.tipSeen', '1'); } catch (e) {}
      clearTimeout(this.tipTimer);
      this.el.tip.classList.add('hide');
    }
  };

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  App.Punch = Punch;
  App.escapeHtml = escapeHtml;
})();
