/* shared.js - tiny helpers shared across JobMeJob multipage site
   - Safe to include on every page
   - No dependencies
*/
(() => {
  "use strict";

  // Avoid double-init if a page loads shared.js twice by accident.
  if (window.JobMeJobShared && window.JobMeJobShared.__loaded) return;

  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function escapeHtml(s){
    const map = { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" };
    return String(s ?? "").replace(/[&<>"']/g, (c) => map[c] || c);
  }

  function safeLocalGet(key){
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function resolveApiBase(fallback){
    // Allow override during debugging:
    // localStorage.setItem("ja_api_base","http://localhost:8787")
    const apiOverride = (safeLocalGet("ja_api_base") || "").trim().replace(/\/+$/, "");

    // Allow pages/auth.js to set a base
    const apiFromWindow =
      (window.JobApplyAI && window.JobApplyAI.config && window.JobApplyAI.config.API_BASE)
        ? String(window.JobApplyAI.config.API_BASE).trim().replace(/\/+$/, "")
        : "";

    return apiOverride || apiFromWindow || (String(fallback || "").trim());
  }

  function go(url){
    if(!url) return;
    try{
      document.body.classList.add("leaving");
    }catch(_){}
    // Small delay so the fade applies.
    setTimeout(() => { window.location.href = url; }, 160);
  }

  function wireNavTransitions(){
    if (wireNavTransitions.__wired) return;
    wireNavTransitions.__wired = true;

    document.addEventListener("click", (e) => {
      const a = e.target && e.target.closest ? e.target.closest("a[data-nav='1']") : null;
      if(!a) return;

      const url = a.getAttribute("href");
      if(!url || url.startsWith("#")) return;

      // Let real external links behave normally
      if(/^https?:\/\//i.test(url)) return;

      // Allow force-new-tab
      if (a.getAttribute("target") === "_blank") return;

      e.preventDefault();
      go(url);
    });
  }

  function wireNavDropdowns(){
    // Close nav dropdowns when clicking outside / navigating inside.
    if (wireNavDropdowns.__wired) return;
    wireNavDropdowns.__wired = true;

    const closeAll = (except) => {
      $$(".navDrop").forEach(d => { if(d !== except) d.open = false; });
    };

    document.addEventListener("click", (e) => {
      const openDrop = e.target && e.target.closest ? e.target.closest("details.navDrop") : null;
      if(openDrop){
        // Click inside: if they clicked a menu item (not the summary), close after click.
        const sum = openDrop.querySelector("summary");
        const clickedSummary = sum && (e.target === sum || (e.target && sum.contains(e.target)));
        if(!clickedSummary){
          const isItem = e.target && e.target.closest ? e.target.closest("a,button") : null;
          if(isItem) setTimeout(() => { openDrop.open = false; }, 0);
        }
        closeAll(openDrop);
        return;
      }

      // Click outside any dropdown
      closeAll(null);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAll(null);
    });
  }

  function showTopError(idOrMsg, maybeMsg){
    // Backwards compatible:
    // showTopError("errorTop", "msg") OR showTopError("msg")
    let id = "errorTop";
    let msg = idOrMsg;

    if (typeof maybeMsg !== "undefined"){
      id = String(idOrMsg || "errorTop");
      msg = maybeMsg;
    }

    const el = $(id);
    if(!el) return;

    const m = String(msg ?? "");
    if(!m){
      el.style.display = "none";
      el.textContent = "";
      return;
    }
    el.style.display = "block";
    el.textContent = m;
  }

  function setBadge(id, cls, text){
    const el = $(id);
    if(!el) return;
    el.className = "badge" + (cls ? (" " + cls) : "");
    el.textContent = String(text ?? "");
  }

  function showModal(id){
    const el = $(id);
    if(!el) return;
    el.style.display = "flex";
    try{ document.body.classList.add("modalOpen"); }catch(_){}
  }

  function hideModal(id){
    const el = $(id);
    if(!el) return;
    el.style.display = "none";
    try{
      const anyOpen = $$(".modalBackdrop").some(m => window.getComputedStyle(m).display !== "none");
      if(!anyOpen) document.body.classList.remove("modalOpen");
    }catch(_){
      try{ document.body.classList.remove("modalOpen"); }catch(__){}
    }
  }

  function wireModalDismiss(){
    // Click on backdrop closes modal (only if click is directly on backdrop)
    if (wireModalDismiss.__wired) return;
    wireModalDismiss.__wired = true;

    document.addEventListener("click", (e) => {
      const backdrop = e.target && e.target.classList && e.target.classList.contains("modalBackdrop")
        ? e.target
        : null;
      if(!backdrop) return;
      if (e.target !== backdrop) return;

      const id = backdrop.getAttribute("id");
      if(id) hideModal(id);
    });

    // [data-close-modal] closes the nearest modalBackdrop
    document.addEventListener("click", (e) => {
      const btn = e.target && e.target.closest ? e.target.closest("[data-close-modal]") : null;
      if(!btn) return;
      const m = btn.closest(".modalBackdrop");
      if(m && m.id) hideModal(m.id);
    });

    // ESC closes the latest-open modal
    document.addEventListener("keydown", (e) => {
      if(e.key !== "Escape") return;
      const open = $$(".modalBackdrop").filter(m => window.getComputedStyle(m).display !== "none");
      const last = open[open.length - 1];
      if(last && last.id) hideModal(last.id);
    });
  }

  function ensureToastWrap(){
    let wrap = document.querySelector(".toastWrap");
    if(wrap) return wrap;
    wrap = document.createElement("div");
    wrap.className = "toastWrap";
    wrap.setAttribute("aria-live","polite");
    document.body.appendChild(wrap);
    return wrap;
  }

  function toast(message, opts = {}){
    const wrap = ensureToastWrap();
    const el = document.createElement("div");
    const kind = String(opts.kind || "").trim(); // good | warn | bad | ""
    el.className = "toast" + (kind ? (" " + kind) : "");
    const title = opts.title ? `<div class="t">${escapeHtml(opts.title)}</div>` : "";
    el.innerHTML = title + `<div>${escapeHtml(message || "")}</div>`;
    wrap.appendChild(el);

    const ms = Number.isFinite(opts.ms) ? Number(opts.ms) : 2600;
    setTimeout(() => {
      try { el.style.opacity = "0"; el.style.transform = "translateY(6px)"; } catch(_){}
      setTimeout(() => { try { el.remove(); } catch(_){ } }, 220);
    }, ms);
  }

  async function copyToClipboard(text){
    const t = String(text ?? "");
    if(!t) return false;
    try{
      await navigator.clipboard.writeText(t);
      return true;
    }catch(_){
      // Fallback (older browsers)
      try{
        const ta = document.createElement("textarea");
        ta.value = t;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.top = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        ta.remove();
        return !!ok;
      }catch(__){
        return false;
      }
    }
  }

  // Small convenience setters (safe if element not present)
  function setText(id, text){
    const el = $(id);
    if(!el) return;
    el.textContent = String(text ?? "");
  }
  function setHtml(id, html){
    const el = $(id);
    if(!el) return;
    el.innerHTML = String(html ?? "");
  }
  function show(id){
    const el = $(id);
    if(!el) return;
    el.style.display = "";
  }
  function hide(id){
    const el = $(id);
    if(!el) return;
    el.style.display = "none";
  }

  // Export
  const api = {
    __loaded: true,
    $,
    $$,
    escapeHtml,
    resolveApiBase,

    go,
    wireNavTransitions,
    wireNavDropdowns,

    showTopError,
    setBadge,

    showModal,
    hideModal,
    wireModalDismiss,

    toast,
    copyToClipboard,

    setText,
    setHtml,
    show,
    hide
  };

  // Keep compatibility with existing pages.
  window.JobMeJobShared = Object.assign({}, window.JobMeJobShared || {}, api);

  // Optional alias (some pages prefer JobApplyAI.shared)
  window.JobApplyAI = window.JobApplyAI || {};
  window.JobApplyAI.shared = window.JobMeJobShared;

  // Auto-wire global behavior (safe no-ops if page doesn't use it)
  window.addEventListener("DOMContentLoaded", () => {
    wireNavTransitions();
    wireNavDropdowns();
    wireModalDismiss();
  });
})();
