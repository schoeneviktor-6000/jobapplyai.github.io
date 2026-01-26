/* shared.js - Shared UI helpers (navigation, modals, small utilities)
   Plain JS file (NO <script> tags)
*/
(() => {
  "use strict";

  // -----------------------------
  // Basic helpers
  // -----------------------------
  function $(id) { return document.getElementById(id); }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function go(url) {
    try { document.body.classList.add("leaving"); } catch {}
    setTimeout(() => { window.location.href = url; }, 180);
  }

  // -----------------------------
  // Smooth internal navigation (guarded)
  // -----------------------------
  let __navTransitionsWired = false;

  function wireNavTransitions() {
    if (__navTransitionsWired) return;
    __navTransitionsWired = true;

    // Remove "leaving" class when user returns via bfcache
    window.addEventListener("pageshow", () => {
      try { document.body.classList.remove("leaving"); } catch {}
    });

    document.addEventListener("click", (e) => {
      // Respect new-tab / download / non-left clicks
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const a = e.target.closest("a[data-nav='1']");
      if (!a) return;

      const href = a.getAttribute("href") || "";
      if (!href || href.startsWith("#")) return;

      // If explicitly opening in new tab, don't intercept
      const target = (a.getAttribute("target") || "").toLowerCase();
      if (target === "_blank") return;

      // External links: don't intercept
      if (/^https?:\/\//i.test(href)) return;

      e.preventDefault();

      // If a details dropdown is open, close it before leaving
      closeAllNavDrops();

      go(href);
    });
  }

  // -----------------------------
  // Top error + badge + modal helpers
  // -----------------------------
  function showTopError(id, msg) {
    const el = $(id || "errorTop");
    if (!el) return;
    if (!msg) {
      el.style.display = "none";
      el.textContent = "";
      return;
    }
    el.style.display = "block";
    el.textContent = String(msg);
  }

  function setBadge(id, cls, text) {
    const el = $(id);
    if (!el) return;
    el.className = "badge" + (cls ? (" " + cls) : "");
    el.textContent = String(text == null ? "" : text);
  }

  function showModal(id) {
    const el = $(id);
    if (!el) return;
    el.style.display = "flex";
    try { document.body.classList.add("modalOpen"); } catch {}
  }

  function hideModal(id) {
    const el = $(id);
    if (!el) return;
    el.style.display = "none";
    try {
      const anyOpen = Array.from(document.querySelectorAll(".modalBackdrop"))
        .some(m => window.getComputedStyle(m).display !== "none");
      if (!anyOpen) document.body.classList.remove("modalOpen");
    } catch (_) {
      try { document.body.classList.remove("modalOpen"); } catch {}
    }
  }

  // -----------------------------
  // API base resolver (kept as-is, but more defensive)
  // -----------------------------
  function resolveApiBase(fallback) {
    const ls = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
    const apiOverride = (ls("ja_api_base") || "").trim().replace(/\/+$/, "");
    const apiFromWindow =
      (window.JobApplyAI && window.JobApplyAI.config && window.JobApplyAI.config.API_BASE)
        ? String(window.JobApplyAI.config.API_BASE).trim().replace(/\/+$/, "")
        : "";
    return apiOverride || apiFromWindow || (fallback || "");
  }

  // -----------------------------
  // Nav: active-link highlighting
  // -----------------------------
  function currentPageName() {
    const p = String(window.location.pathname || "");
    let last = p.split("/").pop() || "";
    if (!last) last = "index.html";
    // GitHub Pages often serves index.html implicitly
    if (last.endsWith("/")) last = "index.html";
    return last.toLowerCase();
  }

  function pageNameFromHref(href) {
    if (!href) return "";
    if (href.startsWith("#")) return "";
    if (/^https?:\/\//i.test(href)) return ""; // external
    try {
      const u = new URL(href, window.location.href);
      let last = u.pathname.split("/").pop() || "";
      if (!last) last = "index.html";
      return last.toLowerCase();
    } catch {
      // basic fallback for weird relative links
      const clean = href.split("#")[0].split("?")[0];
      let last = clean.split("/").pop() || "";
      if (!last) last = "index.html";
      return last.toLowerCase();
    }
  }

  function setActiveNav() {
    const cur = currentPageName();

    // We only toggle on nav pills/links to avoid messing with other anchors
    const links = Array.from(document.querySelectorAll(".nav a.pill[href], .navlinks a.pill[href]"));
    if (!links.length) return;

    for (const a of links) {
      const href = a.getAttribute("href") || "";
      const page = pageNameFromHref(href);

      // Treat "/" and "index.html" as same
      const isHome = (cur === "index.html") && (page === "index.html" || page === "");
      const isExact = page && page === cur;

      if (isHome || isExact) a.classList.add("active");
      else a.classList.remove("active");
    }
  }

  // -----------------------------
  // Nav dropdown: close on outside click + Esc
  // Works with: <details class="navDrop"> ... </details>
  // -----------------------------
  let __navDropWired = false;

  function closeAllNavDrops() {
    try {
      const drops = Array.from(document.querySelectorAll("details.navDrop[open]"));
      for (const d of drops) d.open = false;
    } catch {}
  }

  function wireNavDropdownDismiss() {
    if (__navDropWired) return;
    __navDropWired = true;

    // Click outside closes any open dropdown
    document.addEventListener("click", (e) => {
      const openDrops = Array.from(document.querySelectorAll("details.navDrop[open]"));
      if (!openDrops.length) return;

      for (const d of openDrops) {
        if (!d.contains(e.target)) d.open = false;
      }
    });

    // Esc closes dropdown(s)
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      closeAllNavDrops();
    });

    // Clicking a link inside the dropdown closes it (navigation may happen anyway)
    document.addEventListener("click", (e) => {
      const a = e.target.closest("details.navDrop a[href]");
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (!href || href.startsWith("#")) return;
      closeAllNavDrops();
    });
  }

  // -----------------------------
  // Nav auth state (optional, non-breaking)
  // - Hides Sign In when session exists
  // - Shows Account dropdown when session exists
  // - Sets email label if element exists
  // IDs supported (any that exist will be used):
  //   - navSignIn
  //   - navAccount (details) OR any details.navDrop
  //   - navUserEmail (span/small)
  //   - navLogout / btnLogout
  // -----------------------------
  async function initNavAuth() {
    const elSignIn = $("navSignIn");
    const elLogout = $("navLogout") || $("btnLogout");
    const elEmail = $("navUserEmail") || $("navEmail");
    const elAccount = $("navAccount") || document.querySelector("details.navDrop");

    // If auth.js isn't loaded yet, don't blow up — just keep UI as-is.
    const hasAuth =
      window.JobApplyAI &&
      window.JobApplyAI.auth &&
      typeof window.JobApplyAI.auth.getSession === "function";

    if (!hasAuth) return null;

    const session = await window.JobApplyAI.auth.getSession();
    const email = session && session.user && session.user.email ? String(session.user.email) : "";
    const signedIn = !!email;

    if (elEmail) elEmail.textContent = signedIn ? email : "";

    // If you have the new dropdown, we prefer it over a standalone logout button
    if (signedIn) {
      if (elSignIn) elSignIn.style.display = "none";
      if (elAccount) elAccount.style.display = "";
      if (elLogout) elLogout.style.display = ""; // some pages still use a standalone logout button
    } else {
      if (elSignIn) elSignIn.style.display = "";
      if (elAccount) elAccount.style.display = "none";
      if (elLogout) elLogout.style.display = "none";
    }

    return session;
  }

  // -----------------------------
  // Auto-init (safe + guarded)
  // This helps pages that forgot to call wireNavTransitions().
  // -----------------------------
  document.addEventListener("DOMContentLoaded", () => {
    try { wireNavTransitions(); } catch {}
    try { wireNavDropdownDismiss(); } catch {}
    try { setActiveNav(); } catch {}
    // async, no await needed
    try { initNavAuth(); } catch {}
  });

  // -----------------------------
  // Export
  // -----------------------------
  window.JobMeJobShared = {
    $,
    escapeHtml,
    go,
    wireNavTransitions,
    showTopError,
    setBadge,
    showModal,
    hideModal,
    resolveApiBase,

    // new exports
    setActiveNav,
    wireNavDropdownDismiss,
    closeAllNavDrops,
    initNavAuth
  };
})();
