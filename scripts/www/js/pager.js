/* pager.js —— 左右滑动分页容器（带边界阻尼与惯性判定） */
(function () {
  'use strict';

  var App = (window.App = window.App || {});

  var EASE = 'cubic-bezier(0.25, 0.9, 0.25, 1)';

  var Pager = {
    el: null,
    dots: [],
    idx: 0,
    count: 2,
    width: 0,
    dragging: false,
    locked: false,

    init: function (el, dotsEl) {
      this.el = el;
      this.pages = Array.prototype.slice.call(el.children);
      this.count = this.pages.length || 2;
      this.dots = dotsEl ? Array.prototype.slice.call(dotsEl.children) : [];

      // 页数由 DOM 决定，宽度按页数均分，避免手写百分比带来的累积误差
      this.el.style.width = (this.count * 100) + '%';
      for (var i = 0; i < this.count; i++) {
        this.pages[i].style.flex = '0 0 calc(100% / ' + this.count + ')';
        this.pages[i].style.width = 'calc(100% / ' + this.count + ')';
      }

      this.measure();
      this.apply(0, false);

      var self = this;
      window.addEventListener('resize', function () {
        self.measure();
        self.apply(0, false);
      });
      window.addEventListener('orientationchange', function () {
        setTimeout(function () {
          self.measure();
          self.apply(0, false);
        }, 220);
      });
    },

    measure: function () {
      this.width = this.el.parentElement ? this.el.parentElement.clientWidth : window.innerWidth;
    },

    _transform: function (px) {
      this.el.style.transform = 'translate3d(' + px + 'px, 0, 0)';
    },

    /** 手指拖动，dx 为相对起始点的位移（px） */
    drag: function (dx) {
      if (!this.width) this.measure();
      var d = dx;

      // 越界阻尼
      if ((this.idx === 0 && dx > 0) || (this.idx === this.count - 1 && dx < 0)) {
        d = dx * 0.26;
      }

      this.dragging = true;
      this.el.style.transition = 'none';
      this._transform(-this.idx * this.width + d);
    },

    /** 松手后回弹到当前页 */
    settle: function () {
      this.dragging = false;
      this.el.style.transition = 'transform 0.34s ' + EASE;
      this._transform(-this.idx * this.width);
    },

    /** 翻到指定页 */
    go: function (i) {
      var target = Math.max(0, Math.min(this.count - 1, i));
      var changed = target !== this.idx;
      this.idx = target;
      this.dragging = false;
      if (!this.width) this.measure();
      this.el.style.transition = 'transform 0.36s ' + EASE;
      this._transform(-this.idx * this.width);
      this._syncDots();
      if (changed) App.Bus.emit('page:change', this.idx);
    },

    next: function () { this.go(this.idx + 1); },
    prev: function () { this.go(this.idx - 1); },

    /** 布局变化后重新对齐，无动画 */
    apply: function (_unused, animate) {
      if (!this.width) this.measure();
      this.el.style.transition = animate ? 'transform 0.36s ' + EASE : 'none';
      this._transform(-this.idx * this.width);
      this._syncDots();
    },

    _syncDots: function () {
      for (var i = 0; i < this.dots.length; i++) {
        this.dots[i].classList.toggle('on', i === this.idx);
      }
    }
  };

  App.Pager = Pager;
})();
