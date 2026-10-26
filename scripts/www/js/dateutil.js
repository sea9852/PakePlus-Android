/* dateutil.js —— 日期工具，全部使用设备本地时区 */
(function () {
  'use strict';

  var App = (window.App = window.App || {});

  var WEEK_CN = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

  function pad2(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  /** Date -> 'YYYY-MM-DD'（本地时区，绝不使用 toISOString，避免 UTC 偏移） */
  function keyOf(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  /** 'YYYY-MM-DD' -> 本地 Date（当天 00:00） */
  function fromKey(key) {
    var p = key.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function todayKey() {
    return keyOf(new Date());
  }

  /** 时间戳 -> 'HH:mm' */
  function timeLabel(ts) {
    var d = new Date(ts);
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  /** 时间戳 -> '2026年10月26日 14:01 星期一' */
  function fullLabel(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' +
      pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ' ' + WEEK_CN[d.getDay()];
  }

  /** 'YYYY-MM-DD' -> '10月26日 星期一' */
  function dayLabel(key) {
    var d = fromKey(key);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + WEEK_CN[d.getDay()];
  }

  /** 'YYYY-MM-DD' -> '10月26日' */
  function shortLabel(key) {
    var d = fromKey(key);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  /**
   * 生成固定 42 格（6 行 × 7 列）的月视图数据，首列为周日。
   * 固定 6 行是为了切换月份时网格高度不跳动。
   */
  function monthMatrix(year, month) {
    var first = new Date(year, month, 1);
    var offset = first.getDay(); // 0 = 周日
    var tKey = todayKey();
    var cells = [];

    for (var i = 0; i < 42; i++) {
      var d = new Date(year, month, 1 - offset + i);
      var k = keyOf(d);
      cells.push({
        date: d,
        key: k,
        day: d.getDate(),
        inMonth: d.getMonth() === month && d.getFullYear() === year,
        isToday: k === tKey
      });
    }
    return cells;
  }

  /** 相对今天的口语化描述，用于日历顶部副标题 */
  function relativeLabel(key) {
    var t = new Date();
    t.setHours(0, 0, 0, 0);
    var d = fromKey(key);
    var diff = Math.round((d - t) / 86400000);
    if (diff === 0) return '今天';
    if (diff === -1) return '昨天';
    if (diff === 1) return '明天';
    if (diff === -2) return '前天';
    return '';
  }

  App.DateUtil = {
    WEEK_CN: WEEK_CN,
    pad2: pad2,
    keyOf: keyOf,
    fromKey: fromKey,
    todayKey: todayKey,
    timeLabel: timeLabel,
    fullLabel: fullLabel,
    dayLabel: dayLabel,
    shortLabel: shortLabel,
    monthMatrix: monthMatrix,
    relativeLabel: relativeLabel
  };
})();
