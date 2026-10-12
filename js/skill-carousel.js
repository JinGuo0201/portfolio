/* ==========================================================================
 * 技能轮播（中心模式）
 *  - 无硬性首尾：环形排列，任意方向无限循环
 *  - 当前技能以标准矩形居中，左右邻页被视口平直裁切，
 *     视口内恒定只呈现三张卡片（左邻 / 当前 / 右邻）
 *  - 无自动播放：仅通过技能按钮或左右箭头切换
 *  - 非相邻跳转：所有卡片一次性连续滑过，中间技能快速掠过不停顿
 *  - 偏移量按环形归一化（模卡数取等价位置），多次点击不会漂移出视口
 *  - 技能按钮与轮播双向同步
 * ========================================================================== */
(function () {
  "use strict";

  var track = document.getElementById("skill-track");
  if (!track) return;

  var badges = Array.prototype.slice.call(document.querySelectorAll(".skill-badge"));

  var slides = Array.prototype.slice.call(track.children);
  var count = slides.length;
  var HALF = Math.floor(count / 2);
  var featured = 0;          // 当前居中技能在逻辑顺序中的下标
  var animTime = 0.45;       // 单次滑动动画时长（秒）
  var lock = false;          // 动画期间节流锁
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 每张卡片的环形偏移（卡位数），始终保持在 [-HALF, HALF] 区间内 */
  var offsets = slides.map(function (s, i) {
    return i <= HALF ? i : i - count;
  });

  /* 将任意偏移归一化到等价的 [-HALF, HALF] 区间（模卡数，视觉位置不变） */
  function normalize(d) {
    d = ((d % count) + count) % count;
    if (d > HALF) d -= count;
    return d;
  }

  function metrics() {
    var w = slides[0].offsetWidth;
    var gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--slide-gap")) || 24;
    return { step: w + gap };
  }

  /* 按偏移摆放全部页面 */
  function render(animate) {
    var step = metrics().step;
    slides.forEach(function (s, i) {
      var d = offsets[i];
      if (!animate || reduceMotion) s.style.transition = "none";
      else s.style.transition = "";
      s.style.setProperty("--dx", (d * step).toFixed(1) + "px");
      /* 居中卡位获得交互资格（聚光灯 + 边缘受压倾斜） */
      s.classList.toggle("is-featured", d === 0);
      if (!animate || reduceMotion) {
        void s.offsetWidth;
        s.style.transition = "";
      }
    });
    syncBadges();
  }

  /* 轮播 → 按钮同步 */
  function syncBadges() {
    var current = slides[featured].dataset.skill;
    badges.forEach(function (b) {
      b.classList.toggle("active", b.textContent.trim() === current);
    });
  }

  /* dir: +1 下一张 / -1 上一张；k: 本次转动的卡位数 */
  function move(dir, k) {
    if (lock) return;
    lock = true;
    featured = ((featured + dir * k) % count + count) % count;
    var step = metrics().step;

    slides.forEach(function (s, i) {
      var linear = offsets[i] - dir * k;   // 未归一化的线性目标
      var wrapped = Math.abs(linear) > HALF;
      var d = wrapped ? normalize(linear) : linear;
      offsets[i] = d;
      s.style.transform = "";             // 清除可能残留的倾斜内联变换，交回类定位

      if (!wrapped) {
        // 正常卡片：连续滑动
        s.style.transition = reduceMotion ? "none" : "";
        s.style.setProperty("--dx", (d * step).toFixed(1) + "px");
      } else if (Math.abs(d) <= 1) {
        // 回绕后落入可见卡位：先瞬移到运动方向后方的藏位，再顺势滑入
        // （前进从右滑入，后退从左滑入，与整体滚动方向一致）
        var pre = d + (dir > 0 ? count : -count);
        s.style.transition = "none";
        s.style.setProperty("--dx", (pre * step).toFixed(1) + "px");
        void s.offsetWidth;
        s.style.transition = reduceMotion ? "none" : "";
        s.style.setProperty("--dx", (d * step).toFixed(1) + "px");
      } else {
        // 回绕后仍在藏位：两端均在视口外，直接瞬移，不产生横扫闪卡
        s.style.transition = "none";
        s.style.setProperty("--dx", (d * step).toFixed(1) + "px");
        void s.offsetWidth;
        s.style.transition = "";
      }
      s.classList.toggle("is-featured", d === 0);
    });

    syncBadges();
    setTimeout(function () {
      lock = false;
    }, animTime * 1000);
  }

  /* 按钮 → 轮播：单向滚动，无论目标远近都沿"下一张"方向连转至对应页 */
  badges.forEach(function (badge) {
    badge.addEventListener("click", function () {
      var name = badge.textContent.trim();
      var idx = slides.findIndex(function (s) { return s.dataset.skill === name; });
      if (idx === -1) return;
      var forward = ((idx - featured) % count + count) % count;
      if (forward === 0) return;
      move(1, forward);
    });
  });

  window.addEventListener("resize", function () {
    render(false);
  });

  /* ---------------- 居中卡的交互动画：聚光灯高光 + 边缘受压倾斜 ---------------- */
  slides.forEach(function (s, i) {
    // 注入边缘光晕环（仅在居中卡上显示，见 CSS）
    var ring = document.createElement("i");
    ring.className = "glass-ring";
    s.appendChild(ring);

    // 点击左侧邻卡 → 整体右滑一张，它到中间；点击右侧邻卡 → 整体左滑一张
    s.addEventListener("click", function () {
      var d = offsets[i];
      if (d === -1) {
        move(-1, 1);
      } else if (d === 1) {
        move(1, 1);
      }
    });

    s.addEventListener("pointermove", function (e) {
      // 聚光灯坐标跟随（作用于 ::before 高光层）
      var rect = s.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      s.style.setProperty("--mx", x.toFixed(1) + "px");
      s.style.setProperty("--my", y.toFixed(1) + "px");

      if (!s.classList.contains("is-featured")) return;
      if (e.pointerType === "touch" || reduceMotion || lock) return;

      // 边缘受压：光标一侧边缘下沉（perspective 旋转）
      var px = x / rect.width;
      var py = y / rect.height;
      var rotY = (px - 0.5) * 14;
      var rotX = (0.5 - py) * 14;
      var dx = parseFloat(s.style.getPropertyValue("--dx")) || 0;
      s.style.transition = "transform 0.18s ease-out";
      s.style.transform =
        "translate(calc(-50% + " + dx + "px), -50%) " +
        "perspective(900px) rotateX(" + rotX.toFixed(2) + "deg) rotateY(" + rotY.toFixed(2) + "deg)";
    });

    s.addEventListener("pointerleave", function () {
      // 移出后交回类定位，倾斜缓慢回正
      s.style.transition = "";
      s.style.transform = "";
    });
  });

  render(false);
})();
