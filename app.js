/* ============================================================
   MD 阅读器 — 交互逻辑
   - 系统文件选择器读取 .md / .html
   - Markdown 用本地 marked 渲染；HTML 用沙箱 iframe 预览
   - 明暗主题切换并持久化
   - 注册 service worker 支持离线
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 元素引用 ---------- */
  const body = document.body;
  const openBtn = document.getElementById("openBtn");
  const themeBtn = document.getElementById("themeBtn");
  const themeIcon = document.getElementById("themeIcon");
  const fileInput = document.getElementById("fileInput");
  const emptyState = document.getElementById("empty");
  const content = document.getElementById("content");
  const htmlView = document.getElementById("htmlView");
  const metaTheme = document.getElementById("metaTheme");

  /* ---------- Markdown 解析配置 ---------- */
  if (window.marked) {
    marked.setOptions({ gfm: true, breaks: false });
  }

  /* ---------- 主题 ---------- */
  const THEME_KEY = "mdreader-theme";

  function applyTheme(theme) {
    body.setAttribute("data-theme", theme);
    themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
    metaTheme.setAttribute("content", theme === "dark" ? "#1e2024" : "#ffffff");
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  }

  function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    if (saved === "dark" || saved === "light") {
      applyTheme(saved);
    } else {
      const prefersDark = window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyTheme(prefersDark ? "dark" : "light");
    }
  }

  themeBtn.addEventListener("click", function () {
    const next = body.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
  });

  /* ---------- 视图切换 ---------- */
  function showMarkdown(html) {
    htmlView.hidden = true;
    htmlView.removeAttribute("srcdoc");
    content.innerHTML = html;
    content.hidden = false;
    emptyState.hidden = true;
    window.scrollTo(0, 0);
  }

  function showHtml(htmlText) {
    content.hidden = true;
    content.innerHTML = "";
    htmlView.srcdoc = htmlText;
    htmlView.hidden = false;
    emptyState.hidden = true;
    window.scrollTo(0, 0);
  }

  function showEmpty() {
    content.hidden = true;
    content.innerHTML = "";
    htmlView.hidden = true;
    htmlView.removeAttribute("srcdoc");
    emptyState.hidden = false;
  }

  /* ---------- 打开文件 ---------- */
  openBtn.addEventListener("click", function () {
    fileInput.click();
  });

  fileInput.addEventListener("change", function (e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    const isHtml = name.endsWith(".html") || name.endsWith(".htm");
    const isMd = name.endsWith(".md") || name.endsWith(".markdown");

    file.text().then(function (text) {
      if (isHtml) {
        showHtml(text);
      } else if (isMd) {
        const html = window.marked ? marked.parse(text) : escapeText(text);
        showMarkdown(html);
      } else {
        // 兜底：按扩展名无法判断时，尝试当作 Markdown
        const html = window.marked ? marked.parse(text) : escapeText(text);
        showMarkdown(html);
      }
    }).catch(function (err) {
      showEmpty();
      alert("读取文件失败：" + (err && err.message ? err.message : err));
    });

    // 允许重复选择同一文件
    fileInput.value = "";
  });

  /* 无 marked 时的纯文本兜底 */
  function escapeText(t) {
    const pre = document.createElement("pre");
    pre.textContent = t;
    return pre.innerHTML;
  }

  /* ---------- 启动 ---------- */
  initTheme();

  /* ---------- Service Worker（离线支持） ---------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();
