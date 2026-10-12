/* ==========================================================================
 * 粒子星空背景
 *  - 白色小星点缓慢漂移，近距离星点之间以细线相连
 *  - 光标移动时吸引附近星点，细线随之被拉扯变形
 *  - 遵循系统"减弱动态效果"偏好：静态渲染，不做动画
 * ========================================================================== */
(function () {
  "use strict";

  var canvas = document.createElement("canvas");
  canvas.id = "starfield";
  document.body.insertBefore(canvas, document.body.firstChild);
  var ctx = canvas.getContext("2d");

  var particles = [];
  var mouse = { x: null, y: null };
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var LINK_DIST = 110;        // 星点连线距离阈值
  var MOUSE_DIST = 160;       // 光标吸引半径
  var MAX_SPEED = 0.55;       // 漂移速度上限

  function resize() {
    canvas.width = window.innerWidth * DPR;
    canvas.height = window.innerHeight * DPR;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    initParticles();
  }

  function initParticles() {
    var count = Math.min(140, Math.round((window.innerWidth * window.innerHeight) / 14000));
    particles = [];
    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: 0.8 + Math.random() * 1.1
      });
    }
  }

  function step() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var i, j, p, dx, dy, dist;

    // 更新星点位置：漂移 + 光标吸引
    for (i = 0; i < particles.length; i++) {
      p = particles[i];

      if (mouse.x !== null) {
        dx = mouse.x - p.x;
        dy = mouse.y - p.y;
        dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_DIST && dist > 0.001) {
          var pull = 0.045 * (1 - dist / MOUSE_DIST); // 越近吸引力越强
          p.vx += (dx / dist) * pull;
          p.vy += (dy / dist) * pull;
        }
      }

      // 限速，保持缓慢漂移的观感
      var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > MAX_SPEED) {
        p.vx = (p.vx / speed) * MAX_SPEED;
        p.vy = (p.vy / speed) * MAX_SPEED;
      }

      p.x += p.vx;
      p.y += p.vy;

      // 边界反弹
      if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); }
      if (p.x > w) { p.x = w; p.vx = -Math.abs(p.vx); }
      if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy); }
      if (p.y > h) { p.y = h; p.vy = -Math.abs(p.vy); }
    }

    // 绘制连线
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 0.6;
    for (i = 0; i < particles.length; i++) {
      for (j = i + 1; j < particles.length; j++) {
        dx = particles[i].x - particles[j].x;
        dy = particles[i].y - particles[j].y;
        dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DIST) {
          ctx.strokeStyle = "rgba(255,255,255," + (0.32 * (1 - dist / LINK_DIST)).toFixed(3) + ")";
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    // 光标与附近星点之间的牵引线（拉扯效果）
    if (mouse.x !== null) {
      for (i = 0; i < particles.length; i++) {
        p = particles[i];
        dx = mouse.x - p.x;
        dy = mouse.y - p.y;
        dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_DIST) {
          ctx.strokeStyle = "rgba(255,255,255," + (0.22 * (1 - dist / MOUSE_DIST)).toFixed(3) + ")";
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
    }

    // 绘制星点
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (i = 0; i < particles.length; i++) {
      p = particles[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop() {
    step();
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener("pointerleave", function () {
    mouse.x = null;
    mouse.y = null;
  });
  document.addEventListener("mouseleave", function () {
    mouse.x = null;
    mouse.y = null;
  });

  resize();

  // 减弱动态效果：只静态绘制一帧
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    step();
  } else {
    loop();
  }
})();
