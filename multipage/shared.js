/* shared.js — JobMeJob multipage helpers (site-wide)
   Version: 2026-01-27

   Goals:
   - Be safe to include on EVERY page (no assumptions).
   - Provide small, reusable helpers: nav transitions, dropdown behavior, modals, toasts, clipboard, API base resolution.
   - Fix CV Studio error: "setStudioMode is not defined" by exporting a global window.setStudioMode.

   No dependencies.
*/
(() => {
  "use strict";

  // Avoid double-init if a page loads shared.js twice.
  if (window.JobMeJobShared && window.JobMeJobShared.__loaded_v2) return;

  const VERSION = "2026-01-27";

  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function escapeHtml(s){
    const map = { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" };
    return String(s ?? "").replace(/[&<>"']/g, (c) => map[c] || c);
  }

  function safeLocalGet(key){
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function safeLocalSet(key, val){
    try { localStorage.setItem(key, val); } catch {}
  }
  function safeLocalRemove(key){
    try { localStorage.removeItem(key); } catch {}
  }

  function getQueryParam(name){
    try{
      const u = new URL(window.location.href);
      const v = u.searchParams.get(String(name || ""));
      return v == null ? "" : String(v);
    }catch(_){
      return "";
    }
  }

  function normalizeBaseUrl(u){
    return String(u || "").trim().replace(/\/+$/, "");
  }

  function resolveApiBase(fallback){
    // Debug override 1: query param
    // Example: ?api=http://localhost:8787
    const qp = normalizeBaseUrl(getQueryParam("api"));

    // Debug override 2: localStorage
    // localStorage.setItem("ja_api_base","http://localhost:8787")
    const apiOverride = normalizeBaseUrl(safeLocalGet("ja_api_base"));

    // Prefer base defined by auth.js/pages
    const apiFromWindow =
      (window.JobApplyAI && window.JobApplyAI.config && window.JobApplyAI.config.API_BASE)
        ? normalizeBaseUrl(window.JobApplyAI.config.API_BASE)
        : "";

    return qp || apiOverride || apiFromWindow || normalizeBaseUrl(fallback);
  }

  function prefersReducedMotion(){
    try{
      return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }catch(_){
      return false;
    }
  }

  function go(url){
    if(!url) return;
    const href = String(url);

    // If reduced motion, navigate immediately.
    if (prefersReducedMotion()){
      window.location.href = href;
      return;
    }

    try{ document.body.classList.add("leaving"); }catch(_){}
    setTimeout(() => { window.location.href = href; }, 160);
  }

  function wireNavTransitions(){
    if (wireNavTransitions.__wired) return;
    wireNavTransitions.__wired = true;

    document.addEventListener("click", (e) => {
      const a = e.target && e.target.closest ? e.target.closest("a[data-nav='1']") : null;
      if(!a) return;

      // Allow modified clicks (new tab etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const url = a.getAttribute("href");
      if(!url || url.startsWith("#")) return;

      // External links: do nothing
      if(/^https?:\/\//i.test(url)) return;

      // New tab explicitly
      if (a.getAttribute("target") === "_blank") return;

      e.preventDefault();
      go(url);
    });
  }

  function wireDetailsDropdowns(selector = "details.navDrop, details.studioDrop, details[data-dd='1']"){
    if (wireDetailsDropdowns.__wired) return;
    wireDetailsDropdowns.__wired = true;

    const closeAll = (except) => {
      $$(selector).forEach(d => { if(d !== except) d.open = false; });
    };

    document.addEventListener("click", (e) => {
      const openDrop = e.target && e.target.closest ? e.target.closest(selector) : null;

      if(openDrop){
        // If they clicked inside an open dropdown, close other dropdowns.
        closeAll(openDrop);

        // If they clicked a menu item (not the summary), close after click.
        const sum = openDrop.querySelector("summary");
        const clickedSummary = sum && (e.target === sum || (e.target && sum.contains(e.target)));

        if(!clickedSummary){
          const isItem = e.target && e.target.closest ? e.target.closest("a,button") : null;
          if(isItem) setTimeout(() => { openDrop.open = false; }, 0);
        }
        return;
      }

      // Click outside any dropdown: close all.
      closeAll(null);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAll(null);
    });
  }

  // Backwards compatible alias used by earlier pages
  function wireNavDropdowns(){
    return wireDetailsDropdowns("details.navDrop, details[data-dd='1']");
  }

  function showTopError(idOrMsg, maybeMsg){
    // Compatible:
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
    if (wireModalDismiss.__wired) return;
    wireModalDismiss.__wired = true;

    // Click on backdrop closes modal (only if click is directly on backdrop)
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

  // ------------------------------------------------------------
  // CV Studio helper (global) — fixes: "setStudioMode is not defined"
  // ------------------------------------------------------------
  function setStudioMode(mode, opts = {}){
    const m = String(mode || "tailor").trim().toLowerCase() || "tailor";
    const rootId = String(opts.rootId || "studioRoot");
    const root = $(rootId) || document.querySelector("[data-studio-root]");
    if(root) root.setAttribute("data-mode", m);

    // Persist so the studio can restore the last mode after refresh.
    safeLocalSet("jmj_cv_mode", m);

    // Toggle active state on elements that declare a mode.
    $$("[data-studio-mode]").forEach((el) => {
      const em = String(el.getAttribute("data-studio-mode") || "").trim().toLowerCase();
      const on = em === m;
      el.classList.toggle("active", on);
      try{ el.setAttribute("aria-selected", on ? "true" : "false"); }catch(_){}
    });

    // Notify page scripts (optional).
    try{
      window.dispatchEvent(new CustomEvent("jmj:studioMode", { detail: { mode: m } }));
    }catch(_){}

    return m;
  }

  // Expose globally so inline handlers / other scripts can call it.
  window.setStudioMode = setStudioMode;

  // Export (shared object)
  const api = {
    __loaded_v2: true,
    VERSION,

    $,
    $$,
    escapeHtml,

    safeLocalGet,
    safeLocalSet,
    safeLocalRemove,

    resolveApiBase,
    normalizeBaseUrl,

    go,
    wireNavTransitions,
    wireDetailsDropdowns,
    wireNavDropdowns, // backward compatibility

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
    hide,

    // CV Studio
    setStudioMode,
  };

  // Keep compatibility with existing pages.
  window.JobMeJobShared = Object.assign({}, window.JobMeJobShared || {}, api);

  // Optional alias (some pages prefer JobApplyAI.shared)
  window.JobApplyAI = window.JobApplyAI || {};
  window.JobApplyAI.shared = window.JobMeJobShared;

  // Auto-wire global behavior (safe no-ops if page doesn't use it)
  window.addEventListener("DOMContentLoaded", () => {
    wireNavTransitions();
    wireDetailsDropdowns();
    wireModalDismiss();
  });
})();
