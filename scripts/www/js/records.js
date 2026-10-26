/* records.js —— 全部记录页：按月分组倒序，一眼看清哪天打了、打了几次 */
(function () {
  'use strict';

  var App = (window.App = window.App || {});
  var D = App.DateUtil;

  var MAX_TIMES = 4; // 一行最多展示几个时间点，超出用省略号

  var Records = {
    el: {},
    ready: false,

    init: function () {
      var $ = function (id) { return document.getElementById(id); };

      this.el = {
        sub: $('recSub'),
        scroll: $('recScroll'),
        groups: $('recGroups'),
        empty: $('recAllEmpty'),
        todayBtn: $('recTodayBtn')
      };

      this.bind();
      this.ready = true;
      this.render();

      var self = this;
      App.Store.onChange(function () { self.render(); });
    },

    bind: function () {
      var self = this;

      this.el.groups.addEventListener('click', function (e) {
        var row = e.target.closest('.rg-row');
        if (!row) return;
        self.jumpTo(row.getAttribute('data-key'));
      });

      this.el.todayBtn.addEventListener('click', function () {
        self.jumpTo(D.todayKey());
      });
    },

    /** 跳到日历页并选中该日 */
    jumpTo: function (key) {
      if (!key) return;
      App.Pager.go(1);
      App.Calendar.selectDate(key, { fromPunch: true });
    },

    render: function () {
      if (!this.ready) return;

      var groups = buildGroups();
      var totalDays = 0;
      var totalCount = 0;
      var i;

      for (i = 0; i < groups.length; i++) {
        totalDays += groups[i].days.length;
        totalCount += groups[i].total;
      }

      this.el.sub.textContent = totalDays
        ? '共 ' + totalDays + ' 天 · ' + totalCount + ' 次'
        : '还没有记录';

      if (!groups.length) {
        this.el.empty.classList.add('show');
        this.el.groups.innerHTML = '';
        return;
      }
      this.el.empty.classList.remove('show');

      var html = '';
      for (i = 0; i < groups.length; i++) {
        var grp = groups[i];
        html += '<div class="rg">' +
          '<div class="rg-head"><b>' + grp.year + ' 年 ' + grp.month + ' 月</b>' +
          '<span>' + grp.days.length + ' 天 · ' + grp.total + ' 次</span></div>' +
          '<div class="rg-body">';

        for (var j = 0; j < grp.days.length; j++) {
          var day = grp.days[j];
          html += '<button type="button" class="rg-row" data-key="' + day.key + '">' +
            '<span class="rg-day">' +
            '<span class="rg-num">' + day.dayNum + '</span>' +
            '<span class="rg-wd">' + day.weekday + '</span>' +
            '</span>' +
            '<span class="rg-times">' + day.times + '</span>' +
            '<span class="rg-count' + (day.count > 1 ? ' hot' : '') + '">' +
            day.count + ' 次</span>' +
            '</button>';
        }

        html += '</div></div>';
      }

      this.el.groups.innerHTML = html;
    }
  };

  /** 按月份归组，月份与日期均为倒序（最近的在前） */
  function buildGroups() {
    var days = App.Store.groupedByDate();
    var groups = [];
    var cur = null;

    for (var i = 0; i < days.length; i++) {
      var item = days[i];
      var parsed = D.fromKey(item.key);
      var ym = item.key.slice(0, 7);

      if (!cur || cur.ym !== ym) {
        cur = {
          ym: ym,
          year: parsed.getFullYear(),
          month: parsed.getMonth() + 1,
          days: [],
          total: 0
        };
        groups.push(cur);
      }

      var times = item.times;
      var shown = [];
      for (var k = 0; k < times.length && k < MAX_TIMES; k++) {
        shown.push(D.timeLabel(times[k]));
      }
      var timeText = shown.join(' · ');
      if (times.length > MAX_TIMES) timeText += ' …';

      cur.days.push({
        key: item.key,
        dayNum: parsed.getDate(),
        weekday: D.WEEK_CN[parsed.getDay()].replace('星期', '周'),
        times: timeText,
        count: item.count
      });
      cur.total += item.count;
    }

    return groups;
  }

  App.Records = Records;
})();
