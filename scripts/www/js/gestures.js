/* gestures.js —— 统一手势分发：横向翻页 / 日历翻月 / 纵向滚动互不打架 */
(function () {
  'use strict';

  var App = (window.App = window.App || {});

  var LOCK = 8;          // 轴向锁定阈值
  var PAGE_MIN = 44;     // 翻页最小位移
  var PAGE_V = 0.42;     // 翻页最小速度 px/ms
  var MONTH_MIN = 44;    // 翻月最小位移

  var st = {
    active: false,
    sx: 0,
    sy: 0,
    st: 0,
    mode: null,     // null | 'pager' | 'month' | 'scroll'
    fromMonth: false,
    dx: 0,
    pointer: null
  };

  var suppressClick = false;

  function now() {
    return Date.now();
  }

  function isSheetOpen() {
    return document.body.classList.contains('sheet-open');
  }

  function begin(x, y, target) {
    if (isSheetOpen()) return;

    st.active = true;
    st.sx = x;
    st.sy = y;
    st.st = now();
    st.dx = 0;
    st.mode = null;

    // 只有在日历页、且手指落在月网格内，才可能是「翻月」手势
    st.fromMonth = App.Pager.idx === 1 &&
      !!(target && target.closest && target.closest('.cal-body'));
  }

  function move(x, y, evt) {
    if (!st.active) return;

    var dx = x - st.sx;
    var dy = y - st.sy;

    if (!st.mode) {
      if (Math.abs(dx) < LOCK && Math.abs(dy) < LOCK) return;

      if (Math.abs(dx) > Math.abs(dy) * 1.15) {
        st.mode = st.fromMonth ? 'month' : 'pager';
      } else {
        st.mode = 'scroll';
      }
    }

    if (st.mode === 'scroll') return;

    if (evt && evt.cancelable) evt.preventDefault();
    st.dx = dx;

    if (st.mode === 'pager') {
      App.Pager.drag(dx);
    } else {
      App.Calendar.dragMonth(dx);
    }
  }

  function end(x) {
    if (!st.active) return;
    st.active = false;

    var dx = typeof x === 'number' ? x - st.sx : st.dx;
    var dt = Math.max(now() - st.st, 1);
    var v = dx / dt;
    var mode = st.mode;
    st.mode = null;

    if (mode === 'pager') {
      var w = App.Pager.width || 320;
      if (dx < 0 && (dx < -PAGE_MIN || v < -PAGE_V) && Math.abs(dx) > Math.abs(w * 0.16)) {
        App.Pager.next();
      } else if (dx > 0 && (dx > PAGE_MIN || v > PAGE_V) && Math.abs(dx) > Math.abs(w * 0.16)) {
        App.Pager.prev();
      } else {
        App.Pager.settle();
      }
      if (Math.abs(dx) > 10) suppressClick = true;
    } else if (mode === 'month') {
      if (dx <= -MONTH_MIN) {
        App.Calendar.swipeMonth(1);
      } else if (dx >= MONTH_MIN) {
        App.Calendar.swipeMonth(-1);
      } else {
        App.Calendar.resetMonthDrag();
      }
      if (Math.abs(dx) > 10) suppressClick = true;
    }
  }

  function cancel() {
    if (!st.active) return;
    st.active = false;
    if (st.mode === 'pager') App.Pager.settle();
    if (st.mode === 'month') App.Calendar.resetMonthDrag();
    st.mode = null;
  }

  function onTouchStart(e) {
    if (e.touches.length !== 1) return;
    var t = e.touches[0];
    begin(t.clientX, t.clientY, e.target);
  }

  function onTouchMove(e) {
    if (e.touches.length !== 1) return;
    var t = e.touches[0];
    move(t.clientX, t.clientY, e);
  }

  function onTouchEnd(e) {
    var t = e.changedTouches && e.changedTouches[0];
    end(t ? t.clientX : undefined);
  }

  /* --- 桌面鼠标拖动（本地预览用） --- */
  function onMouseDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest('input, textarea')) return;
    st.pointer = true;
    begin(e.clientX, e.clientY, e.target);
  }

  function onMouseMove(e) {
    if (!st.pointer) return;
    move(e.clientX, e.clientY, null);
  }

  function onMouseUp(e) {
    if (!st.pointer) return;
    st.pointer = false;
    end(e.clientX);
  }

  function onClickCapture(e) {
    if (!suppressClick) return;
    suppressClick = false;
    e.stopPropagation();
    e.preventDefault();
  }

  App.Gestures = {
    init: function (root) {
      root.addEventListener('touchstart', onTouchStart, { passive: true });
      root.addEventListener('touchmove', onTouchMove, { passive: false });
      root.addEventListener('touchend', onTouchEnd, { passive: true });
      root.addEventListener('touchcancel', cancel, { passive: true });

      root.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      document.addEventListener('click', onClickCapture, true);
    }
  };
})();
