/* ==========================================================================
 * 论文核心图件 Viewer + PDF.js 内置研究总结阅读器
 *
 * 图件切换双动效（参考开源实现：掘金《实现一个碎片化过渡效果的轮播图》的
 * "瓦片 background-position 拼接 + 交错 transform"方案，零依赖 DOM 实现）：
 *  1) 普通滑动：点击舞台上方/下方的模糊边缘 → 图片条平滑滑动一张
 *  2) 瓦片飘散-聚集：点击右侧调度线的节点 → 当前图碎裂为细密瓦片飘散，
 *     目标图以细密瓦片从四方聚拢拼合
 * ========================================================================== */
(function () {
  "use strict";

  /* ---------------- 图件数据（顺序以论文正文出现顺序为准） ---------------- */
  var FIGURES = {
    paper2: [
      {
        src: "assets/paper-figs/paper2/study-area.jpg",
        name: "研究区与样本概况",
        desc: "十联版式整合耕地空间分布、NEC/GWC 两分区范围与样点分布，并附分区值统计、5 g/kg 分箱的样本数-均值-标准差趋势；独创“外环样本占比 + 内饼耕地面积占比”的同心环设计，一图承载研究区、分区与全部样本统计三层信息。"
      },
      {
        src: "assets/paper-figs/paper2/pred-gs.jpg",
        name: "全局建模（GS）预测图",
        desc: "GS 策略下 30 m SOC 预测分布；图缘内嵌经/纬度分组的像元均值折线，直观暴露全局建模在两个异质区之间的折中伪影；辅以预测区间像元占比与“渔网随机抽样 vs 训练标签”的分布密度对照，用于检验全图值域保真度。"
      },
      {
        src: "assets/paper-figs/paper2/pred-ls.jpg",
        name: "分区建模（LS）预测图",
        desc: "与 GS 版式完全一致的对照设计，便于逐像元对读：LS 下东北区均值偏高、大西部区偏低，空间纹理更连续、值域分布更贴近实测标签——两图并读即构成 LS/GS 策略优劣最直观的证据链。"
      },
      {
        src: "assets/paper-figs/paper2/feature-hot.jpg",
        name: "典型地貌特征响应热图",
        desc: "从全域 DEM 到三类典型地貌大样方、再逐级放大至 25×25 像元窗口的三级嵌套定位设计；下部以四卷积核响应强度热图，定量呈现“平原大感受野、山地响应回落、河谷中尺度最优”的感受野-地貌关系，是分支自注意力机制可解释性的核心证据。"
      }
    ],
    paper3: [
      {
        src: "assets/paper-figs/paper3/study-area.jpg",
        name: "研究区与气候分区",
        desc: "整合全国耕地分布、CR/WHR/AR 三气候区像元占比、各区 DEM 与像元分布关系及分区内样点空间分布；右侧以“SOC-DEM-区间占比”三元汇总呈现 4,777 个样点构成，以气候分区为建模分异提供天然的空间梯度框架。"
      },
      {
        src: "assets/paper-figs/paper3/pred-map.jpg",
        name: "全国预测空间格局",
        desc: "30 m SOC 预测分布 + 全国像元区间占比 + 各 SOC 区间内三气候区构成占比的三联设计；清晰呈现“北高南低台阶式纬向梯度、东西差约 4.3 倍的经向梯度”，以及 ≥20 g/kg 高值像元几乎全部集中于寒区黑土带的区域专属性。"
      },
      {
        src: "assets/paper-figs/paper3/cv-shap.jpg",
        name: "CV–SHAP 联合分析矩阵",
        desc: "三气候区 × 三典型农业利用组合 × 11 个空间本底变量的 CV 与 SHAP 相对变化双列矩阵（以 0 为气候区基线）；用“变异收窄 ≠ 归因下降”的双指标对照，直接支撑条件子空间与信息重组的核心论点，是全文方法论辨识度最高的图件。"
      },
      {
        src: "assets/paper-figs/paper3/history.jpg",
        name: "历史产品对比",
        desc: "地形底图 + 三气候区典型耕地放大对比（以虚线联动实地照片锚定位置）+ 1431 个固定验证样本上的核密度散点三段式布局；同步展示 30 m 产品在田块尺度细节、连续梯度保持与精度（R² 0.7142 vs 0.515/0.255）三方面对 90 m 与 250 m 产品的全面超越。"
      }
    ]
  };

  var TILE_COLS = 10;   // 瓦片列数（细密碎块）
  var TILE_ROWS = 7;    // 瓦片行数
  var SLIVER = 44;      // 上/下模糊边缘高度（px）

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- 图件 Viewer ---------------- */
  function initViewer(root) {
    var paper = root.dataset.paper;
    var figs = FIGURES[paper];
    if (!figs || !figs.length) return;

    var stage = root.querySelector(".fig-stage");
    var rail = root.querySelector(".fig-rail");
    var descTitle = root.querySelector(".fig-desc-title");
    var descText = root.querySelector(".fig-desc-text");
    var descIndex = root.querySelector(".fig-desc-index");

    var index = 0;
    var animating = false;

    /* 构建纵向图片条 */
    var strip = document.createElement("div");
    strip.className = "fig-strip";
    figs.forEach(function (f) {
      var item = document.createElement("div");
      item.className = "fig-item";
      var img = document.createElement("img");
      img.src = f.src;
      img.alt = f.name;
      img.loading = "lazy";
      img.draggable = false;
      item.appendChild(img);
      strip.appendChild(item);
    });
    stage.appendChild(strip);

    /* 构建调度线节点 */
    var dots = [];
    figs.forEach(function (f, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "rail-dot";
      dot.setAttribute("aria-label", f.name);
      dot.style.top = (figs.length === 1 ? 50 : (i / (figs.length - 1)) * 100) + "%";
      dot.addEventListener("click", function () {
        if (i !== index) tileTransition(i);
      });
      rail.appendChild(dot);
      dots.push(dot);
    });

    /* 状态同步：节点高亮 + 文字描述 */
    function syncPanel() {
      dots.forEach(function (d, i) { d.classList.toggle("active", i === index); });
      var f = figs[index];
      descTitle.textContent = f.name;
      descText.textContent = f.desc;
      descIndex.textContent = "图 " + (index + 1) + " / " + figs.length;
    }

    /* 舞台定位：图片条纵向平移，使当前图占据主视区，
       相邻图在上下 SLIVER 区域露出边缘（强模糊示意） */
    function place(instant) {
      strip.style.transition = instant || reduceMotion ? "none" : "";
      strip.style.transform = "translateY(" + (-index * 100) + "%)";
      if (instant || reduceMotion) {
        void strip.offsetWidth;
        strip.style.transition = "";
      }
      Array.prototype.forEach.call(strip.children, function (item, i) {
        item.classList.toggle("is-main", i === index);
      });
      syncPanel();
    }

    /* 普通滑动（点击上/下模糊边缘） */
    function slideTo(i) {
      if (animating || i < 0 || i >= figs.length || i === index) return;
      animating = true;
      index = i;
      place(false);
      setTimeout(function () { animating = false; }, 500);
    }

    stage.addEventListener("click", function (e) {
      var rect = stage.getBoundingClientRect();
      var y = e.clientY - rect.top;
      if (y < SLIVER) slideTo(index - 1);
      else if (y > rect.height - SLIVER) slideTo(index + 1);
    });

    /* 瓦片飘散-聚集切换（点击调度线节点）
       参考：掘金《实现一个碎片化过渡效果的轮播图》——瓦片以
       background-position 截取原图局部，交错 transform 完成碎裂与拼合 */
    function buildTiles(fig, stageRect) {
      var overlay = document.createElement("div");
      overlay.className = "fig-tiles";
      /* 按 object-fit: contain 的实际显示区域铺瓦片，
         保证瓦片画面与原图显示完全重合（无尺寸跳变） */
      var mainW = stageRect.width;
      var mainH = stageRect.height - 2 * SLIVER;
      var ratio = fig.naturalW / fig.naturalH;
      var dw = Math.min(mainW, mainH * ratio);
      var dh = Math.min(mainH, mainW / ratio);
      var offX = (mainW - dw) / 2;
      var offY = SLIVER + (mainH - dh) / 2;
      var tw = dw / TILE_COLS;
      var th = dh / TILE_ROWS;
      for (var r = 0; r < TILE_ROWS; r++) {
        for (var c = 0; c < TILE_COLS; c++) {
          var t = document.createElement("i");
          t.className = "fig-tile";
          t.style.left = (offX + c * tw) + "px";
          t.style.top = (offY + r * th) + "px";
          t.style.width = Math.ceil(tw) + "px";
          t.style.height = Math.ceil(th) + "px";
          t.style.backgroundImage = "url(" + fig.src + ")";
          t.style.backgroundSize = dw + "px " + dh + "px";
          t.style.backgroundPosition = (-c * tw) + "px " + (-r * th) + "px";
          overlay.appendChild(t);
        }
      }
      return overlay;
    }

    function randomScatter() {
      var dx = (Math.random() - 0.5) * 260;
      var dy = (Math.random() - 0.5) * 320;
      var rot = (Math.random() - 0.5) * 90;
      var sc = 0.4 + Math.random() * 0.5;
      return "translate(" + dx.toFixed(0) + "px," + dy.toFixed(0) + "px) rotate(" +
        rot.toFixed(0) + "deg) scale(" + sc.toFixed(2) + ")";
    }

    /* 取第 i 张图的对象（附带自然尺寸，供瓦片 contain 对齐） */
    function figWithSize(i) {
      var img = strip.children[i].querySelector("img");
      return {
        src: figs[i].src,
        naturalW: img.naturalWidth,
        naturalH: img.naturalHeight
      };
    }

    function tileTransition(target) {
      if (animating || target === index) return;
      if (reduceMotion) { index = target; place(true); return; }
      var curFig = figWithSize(index);
      var tgtFig = figWithSize(target);
      /* 图片尚未加载完成时降级为直接切换，避免空白瓦片 */
      if (!curFig.naturalW || !tgtFig.naturalW) {
        index = target;
        place(true);
        return;
      }
      animating = true;

      var rect = stage.getBoundingClientRect();

      /* 阶段一：当前图瓦片化后飘散消散 */
      var scatterOverlay = buildTiles(curFig, rect);
      stage.appendChild(scatterOverlay);
      var scatterTiles = scatterOverlay.children;
      Array.prototype.forEach.call(scatterTiles, function (t, i) {
        t.style.transition = "transform 0.5s cubic-bezier(.22,.61,.36,1), opacity 0.5s ease";
        t.style.transitionDelay = (i % TILE_COLS) * 8 + "ms";
      });
      // 强制回流后触发飘散
      void scatterOverlay.offsetWidth;
      Array.prototype.forEach.call(scatterTiles, function (t, i) {
        t.style.transform = randomScatter();
        t.style.opacity = "0";
      });

      /* 阶段二：目标图瓦片自四方聚拢拼合 */
      setTimeout(function () {
        // 直接将图片条置于目标位（藏于瓦片之下）
        index = target;
        place(true);

        var gatherOverlay = buildTiles(tgtFig, rect);
        stage.appendChild(gatherOverlay);
        var gatherTiles = gatherOverlay.children;
        Array.prototype.forEach.call(gatherTiles, function (t, i) {
          t.style.transform = randomScatter();
          t.style.opacity = "0";
          t.style.transition = "transform 0.55s cubic-bezier(.22,.61,.36,1), opacity 0.55s ease";
          t.style.transitionDelay = (i % TILE_COLS) * 8 + "ms";
        });
        void gatherOverlay.offsetWidth;
        Array.prototype.forEach.call(gatherTiles, function (t) {
          t.style.transform = "none";
          t.style.opacity = "1";
        });

        setTimeout(function () {
          scatterOverlay.remove();
          gatherOverlay.remove();
          animating = false;
        }, 750);
      }, 480);
    }

    place(true);
  }

  Array.prototype.forEach.call(document.querySelectorAll(".fig-viewer"), initViewer);

  /* ==========================================================================
     PDF.js 内置阅读器（网页内弹窗渲染研究总结 PDF）
     ========================================================================== */
  var PDFJS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
  var PDFJS_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  var pdfLibPromise = null;
  var modal = null;

  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve();
    if (pdfLibPromise) return pdfLibPromise;
    pdfLibPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = PDFJS_URL;
      s.onload = function () {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        resolve();
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return pdfLibPromise;
  }

  function buildModal() {
    if (modal) return modal;
    modal = document.createElement("div");
    modal.className = "pdf-modal";
    modal.innerHTML =
      '<div class="pdf-backdrop"></div>' +
      '<div class="pdf-panel glass-card">' +
      '  <div class="pdf-header">' +
      '    <h3 class="pdf-title">研究总结</h3>' +
      '    <button type="button" class="pdf-close" aria-label="关闭阅读器">' +
      '      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
      '    </button>' +
      '  </div>' +
      '  <div class="pdf-body"><div class="pdf-canvas-wrap"><canvas class="pdf-canvas"></canvas><div class="pdf-shield" aria-hidden="true"></div></div></div>' +
      '  <div class="pdf-footer">' +
      '    <button type="button" class="pdf-nav-btn" data-dir="-1" aria-label="上一页">' +
      '      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>' +
      '    </button>' +
      '    <span class="pdf-page-ind">1 / 1</span>' +
      '    <button type="button" class="pdf-nav-btn" data-dir="1" aria-label="下一页">' +
      '      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>' +
      '    </button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(modal);

    modal.querySelector(".pdf-backdrop").addEventListener("click", closePdf);
    modal.querySelector(".pdf-close").addEventListener("click", closePdf);
    /* PDF 渲染区（含透明拦截层）禁用右键菜单，避免“另存为”等简单获取 PDF 的途径；
       事件委托绑定在 .pdf-body 上，body 内容每次重建后依然生效 */
    modal.querySelector(".pdf-body").addEventListener("contextmenu", function (e) {
      e.preventDefault();
    });
    modal.querySelectorAll(".pdf-nav-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        renderPage(currentPdf, pageNum + Number(b.dataset.dir));
      });
    });
    return modal;
  }

  var currentPdf = null;   // { doc, pages }
  var pageNum = 1;

  function renderPage(pdf, n) {
    if (!pdf || n < 1 || n > pdf.pages) return;
    pageNum = n;
    pdf.doc.getPage(n).then(function (page) {
      var canvas = modal.querySelector(".pdf-canvas");
      var body = modal.querySelector(".pdf-body");
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var scale = (body.clientWidth - 32) / page.getViewport({ scale: 1 }).width;
      var viewport = page.getViewport({ scale: scale * dpr });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = "100%";
      page.render({ canvasContext: canvas.getContext("2d"), viewport: viewport });
      modal.querySelector(".pdf-page-ind").textContent = n + " / " + pdf.pages;
    });
  }

  function openPdf(url) {
    var m = buildModal();
    m.classList.add("open");
    document.body.style.overflow = "hidden";
    var body = m.querySelector(".pdf-body");

    /* file:// 协议下 XHR 无法读取本地 PDF（unique origin 限制），
       降级为浏览器原生查看器（iframe 嵌入弹窗内）；
       http(s) 环境（如 GitHub Pages）仍用 PDF.js 渲染 */
    if (location.protocol === "file:") {
      m.classList.add("native-viewer");
      body.innerHTML = '<iframe class="pdf-frame" src="' + url + '" title="研究总结 PDF"></iframe>';
      return;
    }

    m.classList.remove("native-viewer");
    body.innerHTML = '<div class="pdf-canvas-wrap"><canvas class="pdf-canvas"></canvas><div class="pdf-shield" aria-hidden="true"></div></div>';
    m.querySelector(".pdf-page-ind").textContent = "加载中...";

    loadPdfJs().then(function () {
      return window.pdfjsLib.getDocument(url).promise;
    }).then(function (doc) {
      currentPdf = { doc: doc, pages: doc.numPages };
      renderPage(currentPdf, 1);
    }).catch(function () {
      body.innerHTML = '<p class="pdf-error">PDF 加载失败：请检查网络（PDF.js 由 CDN 提供）或稍后重试。</p>';
    });
  }

  function closePdf() {
    if (!modal) return;
    modal.classList.remove("open");
    document.body.style.overflow = "";
    currentPdf = null;
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closePdf();
    if (!modal || !modal.classList.contains("open") || !currentPdf) return;
    if (e.key === "ArrowLeft") renderPage(currentPdf, pageNum - 1);
    if (e.key === "ArrowRight") renderPage(currentPdf, pageNum + 1);
  });

  document.querySelectorAll(".pdf-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      openPdf(btn.dataset.pdf);
    });
  });
})();
