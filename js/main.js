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

  /* ==========================================================================
     联系表单：校验 → 打包 → 投递至 RECIPIENT_EMAIL
     ========================================================================== */
  var form = document.getElementById("contact-form");
  if (!form) return;

  var statusEl = document.getElementById("cf-status");
  var submitBtn = document.getElementById("cf-submit");

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

    if (!formData.email.trim()) {
      setError("cf-email", "请输入邮箱地址");
      ok = false;
    } else if (!emailRe.test(formData.email.trim())) {
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
    var body = [
      "姓名：" + formData.name,
      "邮箱：" + formData.email,
      "",
      "留言内容：",
      formData.message,
      "",
      "—— 发送自个人主页联系表单"
    ].join("\n");

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
      message: form.elements["message"].value
    };

    if (!validate(formData)) return;

    // 未配置 Access Key：回退到 mailto 方式
    if (!WEB3FORMS_ACCESS_KEY) {
      mailtoFallback(formData);
      return;
    }

    // 网页端直发：表单内容由 Web3Forms 代收并投递到指定邮箱
    setSending(true);
    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: "【主页联系表单】来自 " + formData.name + " 的留言",
        from_name: "个人主页联系表单",
        replyto: formData.email,
        姓名: formData.name,
        联系邮箱: formData.email,
        留言内容: formData.message
      })
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
  ["cf-name", "cf-email", "cf-message"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", function () { setError(id, ""); });
  });
})();
