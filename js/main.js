/* ==========================================================================
 * 个人主页交互脚本（多页版本）
 *  - 移动端菜单开合 / 入场动画
 *  - 联系表单：网页端直接收集并投递到指定邮箱 guojin020201@163.com
 *
 *  【发信原理】纯静态页面无法直接 SMTP 发信，接入免费表单代收服务
 *  Web3Forms（https://web3forms.com）：
 *    1. 用你的邮箱 guojin020201@163.com 在 web3forms.com 免费注册；
 *    2. 将收到的 Access Key 填入下方 WEB3FORMS_ACCESS_KEY；
 *    3. 此后访客在网页提交表单，内容会直接投递到你的邮箱，
 *       访客无需打开邮件客户端、无需任何重复操作。
 *  未填 Access Key 时自动回退为 mailto 方式（唤起本机邮件客户端）。
 * ========================================================================== */
(function () {
  "use strict";

  /* ---------------- 配置 ---------------- */
  var RECIPIENT_EMAIL = "guojin020201@163.com"; // 指定收件邮箱
  var WEB3FORMS_ACCESS_KEY = "73ab6e8b-5091-4f3b-8f1d-ab286e12982c";                // ← 在此填入 Web3Forms 的 Access Key 后即启用网页直发

  /* ---------------- 元素引用 ---------------- */
  var mobileMenuBtn = document.getElementById("mobile-menu-btn");
  var mobileNav = document.getElementById("mobile-nav");
  var iconMenu = document.getElementById("icon-menu");
  var iconClose = document.getElementById("icon-close");

  /* ---------------- 年份 ---------------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------------- 移动端菜单 ---------------- */
  if (mobileMenuBtn && mobileNav) {
    function setMenu(open) {
      mobileNav.classList.toggle("open", open);
      iconMenu.classList.toggle("hidden", open);
      iconClose.classList.toggle("hidden", !open);
      mobileMenuBtn.setAttribute("aria-expanded", String(open));
      mobileMenuBtn.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
      document.body.style.overflow = open ? "hidden" : "";
    }

    mobileMenuBtn.addEventListener("click", function () {
      setMenu(!mobileNav.classList.contains("open"));
    });

    mobileNav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth >= 1024) setMenu(false);
    });
  }

  /* ---------------- 入场动画 ---------------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  /* ---------------- 跨页锚点精确重定位 ----------------
     浏览器原生锚点滚动发生在字体加载前，字体替换会导致布局收缩、
     目标卡片位置偏移；通过多重触发（load / 字体就绪 / 延迟重试）
     反复对齐，最终将目标卡片顶部稳定在 dock 栏下方 8px 处。
     注意：须置于表单段的提前 return 之前，保证所有页面都能执行 */
  if (location.hash) {
    var anchorTarget = document.getElementById(location.hash.slice(1));
    if (anchorTarget) {
      var alignAnchor = function () {
        var header = document.getElementById("site-header");
        var offset = (header ? header.offsetHeight : 56) + 8;
        var top = anchorTarget.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo(0, top);
      };
      window.addEventListener("load", function () {
        setTimeout(alignAnchor, 150);
        setTimeout(alignAnchor, 600);
      });
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { setTimeout(alignAnchor, 50); });
      }
    }
  }

  /* ==========================================================================
     联系表单：校验 → 打包 → 投递至 RECIPIENT_EMAIL
     ========================================================================== */
  var form = document.getElementById("contact-form");
  if (!form) return;

  var statusEl = document.getElementById("cf-status");
  var submitBtn = document.getElementById("cf-submit");
  var moreContact = document.getElementById("cf-more-contact");
  var extraFields = document.getElementById("cf-extra-fields");

  /* 「同时留下电话或微信」勾选框：控制额外字段的展开与收起 */
  function syncExtraFields(show) {
    if (show) {
      extraFields.classList.remove("hidden");
    } else {
      extraFields.classList.add("hidden");
      ["cf-phone", "cf-wechat"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
          el.value = "";
          setError(id, "");
        }
      });
    }
  }

  if (moreContact && extraFields) {
    moreContact.addEventListener("change", function () {
      syncExtraFields(moreContact.checked);
    });
    /* 表单重置（发送成功 / mailto 回退）后 checkbox 恢复未勾选，同步收起字段 */
    form.addEventListener("reset", function () {
      syncExtraFields(false);
    });
  }

  function setStatus(type, text) {
    statusEl.className = "form-status show " + type;
    statusEl.textContent = text;
  }

  function clearStatus() {
    statusEl.className = "form-status";
    statusEl.textContent = "";
  }

  function setError(fieldId, message) {
    var input = document.getElementById(fieldId);
    var field = input.closest(".form-field");
    field.classList.toggle("invalid", Boolean(message));
    field.querySelector(".form-error").textContent = message || "";
  }

  function validate(formData) {
    var ok = true;
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.name.trim()) {
      setError("cf-name", "请输入您的姓名");
      ok = false;
    } else {
      setError("cf-name", "");
    }

    /* 联系方式三选一以上：邮箱、电话、微信至少填写一项；邮箱填写时需为有效格式 */
    var email = formData.email.trim();
    var phone = formData.phone.trim();
    var wechat = formData.wechat.trim();

    if (!email && !phone && !wechat) {
      setError("cf-email", "请至少填写邮箱、电话或微信中的一项");
      ok = false;
    } else if (email && !emailRe.test(email)) {
      setError("cf-email", "请输入有效的邮箱地址");
      ok = false;
    } else {
      setError("cf-email", "");
    }

    if (!formData.message.trim()) {
      setError("cf-message", "请输入留言内容");
      ok = false;
    } else {
      setError("cf-message", "");
    }

    return ok;
  }

  function setSending(sending) {
    submitBtn.disabled = sending;
    submitBtn.textContent = sending ? "发送中..." : "发送消息";
    submitBtn.style.opacity = sending ? "0.7" : "";
    submitBtn.style.cursor = sending ? "not-allowed" : "";
  }

  // 回退方案：打包内容路由到系统邮件客户端（mailto 协议）
  function mailtoFallback(formData) {
    var subject = "【主页联系表单】来自 " + formData.name + " 的留言";
    var lines = ["姓名：" + formData.name];
    if (formData.email.trim()) lines.push("邮箱：" + formData.email.trim());
    if (formData.phone.trim()) lines.push("电话：" + formData.phone.trim());
    if (formData.wechat.trim()) lines.push("微信：" + formData.wechat.trim());
    lines.push("", "留言内容：", formData.message, "", "—— 发送自个人主页联系表单");
    var body = lines.join("\n");

    window.location.href = "mailto:" + RECIPIENT_EMAIL +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);

    setStatus("info", "已为您打开邮件客户端并填入内容，确认后即可发送至 " + RECIPIENT_EMAIL + "。");
    form.reset();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearStatus();

    var formData = {
      name: form.elements["name"].value,
      email: form.elements["email"].value,
      phone: form.elements["phone"] ? form.elements["phone"].value : "",
      wechat: form.elements["wechat"] ? form.elements["wechat"].value : "",
      message: form.elements["message"].value
    };

    if (!validate(formData)) return;

    // 未配置 Access Key：回退到 mailto 方式
    if (!WEB3FORMS_ACCESS_KEY) {
      mailtoFallback(formData);
      return;
    }

    // 网页端直发：表单内容由 Web3Forms 代收并投递到指定邮箱
    // 邮箱、电话、微信按实际填写情况组装，任一或多项均可
    var payload = {
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: "【主页联系表单】来自 " + formData.name + " 的留言",
      from_name: "个人主页联系表单",
      姓名: formData.name,
      留言内容: formData.message
    };
    if (formData.email.trim()) {
      payload.replyto = formData.email.trim();
      payload.联系邮箱 = formData.email.trim();
    }
    if (formData.phone.trim()) payload.联系电话 = formData.phone.trim();
    if (formData.wechat.trim()) payload.微信号 = formData.wechat.trim();

    setSending(true);
    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.success) {
          setStatus("success", "留言已成功发送至 " + RECIPIENT_EMAIL + "，感谢您的来信！");
          form.reset();
        } else {
          mailtoFallback(formData);
        }
      })
      .catch(function () {
        mailtoFallback(formData);
      })
      .finally(function () {
        setSending(false);
      });
  });

  // 输入时清除对应错误提示
  ["cf-name", "cf-email", "cf-message", "cf-phone", "cf-wechat"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", function () { setError(id, ""); });
  });
})();
