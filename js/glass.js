/* ==========================================================================
 * 液态玻璃卡片交互（全局）
 *  实现参考的开源方案：
 *  1. 玻璃质感：iOS 26 Liquid Glass 图层逻辑（低透明白底 + 背景模糊 +
 *     双内阴影模拟透镜厚度 + 顶部镜面高光，见 style.css 对应区块）
 *  2. 光标聚光灯：radial-gradient 跟随光标（参考 Aceternity UI
 *     "Card Spotlight" 组件的 CSS 变量驱动方案）
 *  3. 边缘光晕：mask-composite 描边环（参考 Aceternity UI 边框流光方案）
 *  4. 3D 倾斜：vanilla-tilt 式透视变换，光标一侧边缘下沉
 * ========================================================================== */
(function () {
  "use strict";

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return; // 减弱动态效果时跳过交互增强，仅保留静态玻璃样式
  }

  var GLASS_CARDS = ".overview-card, a.pub-card, .project-card, .contact-card, .contact-form-card, .research-card, .showcase, .skill-slide, .meeting-card, .awards-card, .work-card";
  var TILT_CARDS = ".overview-card, a.pub-card"; // 可点击卡片：倾斜 + 边缘光晕
  var TILT_MAX = 7; // 最大倾斜角度（度）

  var cards = document.querySelectorAll(GLASS_CARDS);
  var tiltCards = document.querySelectorAll(TILT_CARDS);

  // 可点击卡片注入边缘光晕环
  tiltCards.forEach(function (card) {
    var ring = document.createElement("i");
    ring.className = "glass-ring";
    card.appendChild(ring);
  });

  function setPointer(card, e) {
    var rect = card.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    card.style.setProperty("--mx", x.toFixed(1) + "px");
    card.style.setProperty("--my", y.toFixed(1) + "px");
    card.style.setProperty("--px", (x / rect.width).toFixed(4));
    card.style.setProperty("--py", (y / rect.height).toFixed(4));
  }

  cards.forEach(function (card) {
    card.classList.add("glass-card");

    card.addEventListener("pointermove", function (e) {
      setPointer(card, e);

      // 可点击卡片：3D 倾斜，光标一侧边缘下沉
      if (card.matches(TILT_CARDS) && e.pointerType !== "touch") {
        var px = parseFloat(card.style.getPropertyValue("--px")) || 0.5;
        var py = parseFloat(card.style.getPropertyValue("--py")) || 0.5;
        var rotY = (px - 0.5) * 2 * TILT_MAX;  // 光标在右 → 右缘下沉
        var rotX = (0.5 - py) * 2 * TILT_MAX;  // 光标在上 → 上缘下沉
        card.style.transform =
          "perspective(900px) rotateX(" + rotX.toFixed(2) + "deg) rotateY(" + rotY.toFixed(2) + "deg)";
      }
    });

    card.addEventListener("pointerleave", function () {
      if (card.matches(TILT_CARDS)) {
        card.style.transform = "";
      }
    });
  });
})();
