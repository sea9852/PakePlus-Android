/* app.js —— 事件总线 / 弹层 / 轻提示 / 启动装配 */
(function () {
  'use strict';

  var App = (window.App = window.App || {});

  /* ================= 事件总线 ================= */
  var handlers = Object.create(null);

  App.Bus = {
    on: function (evt, fn) {
      (handlers[evt] || (handlers[evt] = [])).push(fn);
    },
    emit: function (evt, payload) {
      var list = handlers[evt];
      if (!list) return;
      for (var i = 0; i < list.length; i++) {
        try { list[i](payload); } catch (e) { console.error(e); }
      }
    }
  };

  /* ================= 底部面板 ================= */
  var SHEETS = {
    note: { sheet: 'noteSheet', mask: 'noteMask' },
    del: { sheet: 'delSheet', mask: 'delMask' }
  };

  var openCount = 0;

  App.Sheet = {
    open: function (name) {
      var cfg = SHEETS[name];
      if (!cfg) return;

      var mask = document.getElementById(cfg.mask);
      var sheet = document.getElementById(cfg.sheet);
      if (!mask || !sheet) return;

      mask.classList.add('show');
      sheet.classList.add('show');
      document.body.classList.add('sheet-open');
      openCount++;
    },

    close: function (name) {
      var cfg = SHEETS[name];
      if (!cfg) return;

      var mask = document.getElementById(cfg.mask);
      var sheet = document.getElementById(cfg.sheet);
      if (!mask || !sheet) return;

      mask.classList.remove('show');
      sheet.classList.remove('show');
      sheet.style.bottom = '';

      openCount = Math.max(0, openCount - 1);
      if (openCount === 0) {
        document.body.classList.remove('sheet-open');
        var input = document.getElementById('noteInput');
        if (input) input.blur();
      }
    },

    closeAll: function () {
      for (var k in SHEETS) this.close(k);
    }
  };

  /* ================= 轻提示 ================= */
  var toastEl = null;
  var toastTimer = null;

  App.Toast = function (text) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text;
    // 强制重排以重启动画
    void toastEl.offsetWidth;
    toastEl.classList.add('show');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 1600);
  };

  /* ================= 启动 ================= */
  function boot() {
    App.Store.init();

    var pagerEl = document.getElementById('pager');
    App.Pager.init(pagerEl, document.getElementById('dots'));
    App.Gestures.init(document.getElementById('app'));

    App.Punch.init();
    App.Calendar.init();
    App.Records.init();

    // 页面切换联动
    App.Bus.on('page:change', function (idx) {
      if (idx === 1) {
        App.Punch.markTipSeen();
        if (App.Calendar && App.Calendar.el.detail) {
          App.Calendar.el.detail.scrollTop = 0;
        }
      }
    });

    // 点击遮罩关闭
    ['noteMask', 'delMask'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', function () {
        var name = id === 'noteMask' ? 'note' : 'del';
        App.Sheet.close(name);
      });
    });

    // 键盘弹起时把面板顶上去（iOS 等不自动 resize 的环境）
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', function () {
        var sheet = document.getElementById('noteSheet');
        if (!sheet) return;
        var offset = window.innerHeight - window.visualViewport.height -
          window.visualViewport.offsetTop;
        sheet.style.bottom = offset > 24 ? offset + 'px' : '';
      });
    }

    // 避免双击缩放
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
