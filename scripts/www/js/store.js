/* store.js —— 本地数据层：localStorage 存储 + 内存索引，无任何网络请求 */
(function () {
  'use strict';

  var App = (window.App = window.App || {});
  var D = App.DateUtil;

  var STORAGE_KEY = 'punch.records.v1';

  /** @type {Array<{id:string,date:string,t:number,note:string|null,c:number}>} 按时间升序 */
  var list = [];
  /** @type {Object<string, Array>} dateKey -> records，按时间升序 */
  var index = Object.create(null);

  var listeners = [];

  function uid() {
    return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function rebuildIndex() {
    index = Object.create(null);
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (!index[r.date]) index[r.date] = [];
      index[r.date].push(r);
    }
  }

  function isRecord(r) {
    return r && typeof r === 'object' &&
      typeof r.date === 'string' && r.date.length === 10 &&
      typeof r.t === 'number' && isFinite(r.t);
  }

  function load() {
    var raw = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }

    var parsed = [];
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        parsed = [];
      }
    }
    if (!Array.isArray(parsed)) parsed = [];

    list = parsed.filter(isRecord).map(function (r) {
      return {
        id: r.id || uid(),
        date: r.date,
        t: r.t,
        note: typeof r.note === 'string' && r.note.trim() ? r.note : null,
        c: typeof r.c === 'number' ? r.c : r.t
      };
    });

    list.sort(function (a, b) { return a.t - b.t; });
    rebuildIndex();
  }

  function persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      // 隐私模式或存储配额不足
      console.warn('[store] 写入本地存储失败：', e);
      return false;
    }
  }

  function notify() {
    for (var i = 0; i < listeners.length; i++) {
      try {
        listeners[i]();
      } catch (e) {
        console.error(e);
      }
    }
  }

  /** 新增一条打卡记录 */
  function add(note, at) {
    var ts = typeof at === 'number' ? at : Date.now();
    var d = new Date(ts);
    var record = {
      id: uid(),
      date: D.keyOf(d),
      t: ts,
      note: (note || '').trim() || null,
      c: Date.now()
    };

    list.push(record);
    list.sort(function (a, b) { return a.t - b.t; });
    rebuildIndex();
    var ok = persist();
    if (ok) notify();
    return { record: record, ok: ok };
  }

  /** 删除一条记录 */
  function remove(id) {
    var next = [];
    var removed = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        removed = true;
      } else {
        next.push(list[i]);
      }
    }
    if (!removed) return false;
    list = next;
    rebuildIndex();
    var ok = persist();
    if (ok) notify();
    return ok;
  }

  /** 某天的全部记录（升序） */
  function listByDate(dateKey) {
    return (index[dateKey] || []).slice();
  }

  /** 某天打卡次数 */
  function countByDate(dateKey) {
    return (index[dateKey] || []).length;
  }

  /** 按 id 查找单条记录 */
  function findById(id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  /** 某月每天的打卡次数：{'2026-10-26': 2, ...} */
  function countsInMonth(year, month) {
    var result = Object.create(null);
    var prefix = year + '-' + D.pad2(month + 1) + '-';
    for (var k in index) {
      if (k.indexOf(prefix) === 0) {
        result[k] = index[k].length;
      }
    }
    return result;
  }

  /** 按日期分组的全部记录，日期倒序（最新在前），供「全部记录」页使用 */
  function groupedByDate() {
    var arr = [];
    for (var k in index) {
      var rows = index[k];
      var times = [];
      for (var i = 0; i < rows.length; i++) times.push(rows[i].t);
      arr.push({ key: k, count: rows.length, times: times });
    }
    arr.sort(function (a, b) {
      return a.key < b.key ? 1 : (a.key > b.key ? -1 : 0);
    });
    return arr;
  }

  /** 有记录的日期总数 */
  function totalDays() {
    return Object.keys(index).length;
  }

  /** 有记录的总条数 */
  function totalCount() {
    return list.length;
  }

  /** 导出备份字符串（供未来扩展，不联网） */
  function exportJSON() {
    return JSON.stringify({ v: 1, exportedAt: Date.now(), records: list }, null, 2);
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  App.Store = {
    init: load,
    add: add,
    remove: remove,
    listByDate: listByDate,
    countByDate: countByDate,
    findById: findById,
    countsInMonth: countsInMonth,
    groupedByDate: groupedByDate,
    totalDays: totalDays,
    totalCount: totalCount,
    exportJSON: exportJSON,
    onChange: onChange
  };
})();
