/* shared.js — JobMeJob multipage helpers (site-wide)
   Version: 2026-01-27 (v3)

   Safe to include on every page.
   Includes:
   - nav transitions (nice page feel)
   - details dropdown auto-close (Account dropdown etc.)
   - modal open/close + ESC + backdrop click
   - toast notifications
   - clipboard copy helper
   - API_BASE resolver
   - (optional) global setStudioMode (only defined if missing)
*/
(() => {
  "use strict";

  // Avoid double-init
  if (window.JobMeJobShared && window.JobMeJobShared.__loaded_v3) return;

  const VERSION = "2026-01-27-v3";

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

  function isLocalDebugHost(){
    try{
      const host = String(window.location.hostname || "").trim().toLowerCase();
      const protocol = String(window.location.protocol || "").trim().toLowerCase();
      return (
        protocol === "file:" ||
        host === "localhost" ||
        host.endsWith(".localhost") ||
        host === "0.0.0.0" ||
        host === "::1" ||
        host === "[::1]" ||
        /^127(?:\.\d{1,3}){3}$/.test(host)
      );
    }catch(_){
      return false;
    }
  }

  function prefersReducedMotion(){
    try{
      return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }catch(_){
      return false;
    }
  }

  function normalizeBaseUrl(u){
    return String(u || "").trim().replace(/\/+$/, "");
  }

  function resolveApiBase(fallback){
    // Production pages must ignore client-controlled API overrides.
    const allowDebugOverride = isLocalDebugHost();
    let qp = "";
    if (allowDebugOverride){
      try{
        const u = new URL(window.location.href);
        qp = normalizeBaseUrl(u.searchParams.get("api") || "");
      }catch(_){}
    }

    const apiOverride = allowDebugOverride
      ? normalizeBaseUrl(safeLocalGet("jm_api_base") || safeLocalGet("ja_api_base"))
      : "";

    // Base set by auth.js/pages
    const appConfig =
      (window.JobMeJob && window.JobMeJob.config)
        ? window.JobMeJob.config
        : ((window.JobApplyAI && window.JobApplyAI.config) ? window.JobApplyAI.config : null);
    const apiFromWindow =
      (appConfig && appConfig.API_BASE)
        ? normalizeBaseUrl(appConfig.API_BASE)
        : "";

    return qp || apiOverride || apiFromWindow || normalizeBaseUrl(fallback);
  }

  function go(url){
    if(!url) return;
    const href = String(url);

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

      // allow new tab clicks
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const url = a.getAttribute("href");
      if(!url || url.startsWith("#")) return;

      // external links: normal behavior
      if(/^https?:\/\//i.test(url)) return;

      // explicit new tab
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
        closeAll(openDrop);

        // If clicked a menu item (not summary), close after click.
        const sum = openDrop.querySelector("summary");
        const clickedSummary = sum && (e.target === sum || (e.target && sum.contains(e.target)));
        if(!clickedSummary){
          const isItem = e.target && e.target.closest ? e.target.closest("a,button") : null;
          if(isItem) setTimeout(() => { openDrop.open = false; }, 0);
        }
        return;
      }
      closeAll(null);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAll(null);
    });
  }

  // Backwards alias (some pages call this)
  function wireNavDropdowns(){
    return wireDetailsDropdowns("details.navDrop, details[data-dd='1']");
  }

  function showTopError(idOrMsg, maybeMsg){
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

  function getAppAuth(){
    try{
      return (window.JobMeJob && window.JobMeJob.auth)
        ? window.JobMeJob.auth
        : ((window.JobApplyAI && window.JobApplyAI.auth) ? window.JobApplyAI.auth : null);
    }catch(_){
      return null;
    }
  }

  function safeParseJson(raw){
    try{
      return raw ? JSON.parse(raw) : null;
    }catch(_){
      return null;
    }
  }

  function toNumberOrNull(value){
    if (value === null || typeof value === "undefined" || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function firstNumber(){
    for (const value of arguments){
      const n = toNumberOrNull(value);
      if (n !== null) return n;
    }
    return null;
  }

  function trimLower(value){
    return String(value || "").trim().toLowerCase();
  }

  function readCachedState(){
    try{
      const auth = getAppAuth();
      if (auth && typeof auth.getCachedState === "function"){
        const cached = auth.getCachedState();
        if (cached && typeof cached === "object") return cached;
      }
    }catch(_){}

    const parsed = safeParseJson(safeLocalGet("jm_state_json"));
    return parsed && typeof parsed === "object" ? parsed : null;
  }

  function readCachedCvAccess(){
    const parsed = safeParseJson(safeLocalGet("jm_cv_access_cache_v1"));
    return parsed && typeof parsed === "object" ? parsed : null;
  }

  function planLabelFromId(planId){
    const pid = trimLower(planId);
    if (!pid || pid === "free") return "Free";
    if (pid === "cv_starter") return "Starter";
    if (pid === "cv_plus") return "Plus";
    if (pid === "cv_unlimited") return "Unlimited";
    if (pid === "starter") return "Starter";
    if (pid === "pro") return "Pro";
    if (pid === "max") return "Max";
    return pid.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function buildAccountPlanInfo(state){
    const cvPlanId = trimLower(
      state?.cv_plan_id ||
      state?.cv_studio_plan_id ||
      state?.cvstudio_plan_id ||
      state?.entitlements?.cv_plan_id ||
      state?.entitlements?.cv_studio_plan_id ||
      ""
    );
    const jobsPlanId = trimLower(state?.plan_id || "");
    const cvPaid = !!(
      state?.cv_paid === true ||
      state?.cv_studio_paid === true ||
      state?.entitlements?.cv_paid === true ||
      state?.entitlements?.cv_studio_paid === true ||
      !!cvPlanId
    );

    if (cvPaid){
      const cvLabel = planLabelFromId(cvPlanId) || "Paid";
      return {
        shortLabel: cvLabel,
        detail: `CV Studio ${cvLabel}`,
        jobsPlanLabel: jobsPlanId && jobsPlanId !== "free" ? ("Jobs plan: " + planLabelFromId(jobsPlanId)) : "",
        paid: true
      };
    }

    return {
      shortLabel: "Free",
      detail: "CV Studio Free",
      jobsPlanLabel: jobsPlanId && jobsPlanId !== "free" ? ("Jobs plan: " + planLabelFromId(jobsPlanId)) : "",
      paid: false
    };
  }

  function buildAccountUsageInfo(state){
    const cvPlanId = trimLower(
      state?.cv_plan_id ||
      state?.cv_studio_plan_id ||
      state?.cvstudio_plan_id ||
      state?.entitlements?.cv_plan_id ||
      state?.entitlements?.cv_studio_plan_id ||
      ""
    );
    const cvPaid = !!(
      state?.cv_paid === true ||
      state?.cv_studio_paid === true ||
      state?.entitlements?.cv_paid === true ||
      state?.entitlements?.cv_studio_paid === true ||
      !!cvPlanId
    );

    const limit = firstNumber(
      state?.cv_quota_limit,
      state?.entitlements?.cv_quota_limit,
      state?.cv_free_limit,
      state?.entitlements?.cv_free_limit
    );
    const used = firstNumber(
      state?.cv_quota_used,
      state?.entitlements?.cv_quota_used,
      state?.cv_free_used,
      state?.entitlements?.cv_free_used
    );

    if (cvPaid && limit === 0){
      return { label: "Unlimited CVs", detail: "No monthly cap on CV tailoring" };
    }
    if (limit !== null && used !== null){
      const remaining = Math.max(0, limit - used);
      if (cvPaid){
        return {
          label: `${remaining} CVs left`,
          detail: `${used} of ${limit} used this billing cycle`
        };
      }
      return {
        label: `${remaining} free CVs left`,
        detail: `${used} of ${limit} used`
      };
    }

    const cached = readCachedCvAccess();
    const cachedLimit = firstNumber(cached?.limit);
    const cachedUsed = firstNumber(cached?.used);
    if (cachedLimit !== null && cachedUsed !== null){
      const remaining = Math.max(0, cachedLimit - cachedUsed);
      return {
        label: cached?.paid ? `${remaining} CVs left` : `${remaining} free CVs left`,
        detail: `${cachedUsed} of ${cachedLimit} used`
      };
    }

    return {
      label: cvPaid ? "Usage syncing" : "5 free CVs available",
      detail: cvPaid ? "Usage updates after each tailored CV" : "Upgrade only when CV Studio becomes routine"
    };
  }

  function ensureAccountNavStyles(){
    if (document.getElementById("jmSharedNavStyles")) return;
    const style = document.createElement("style");
    style.id = "jmSharedNavStyles";
    style.textContent = `
details.navDrop,
details[data-dd="1"]{
  position:relative;
  display:inline-flex;
}
details.navDrop > summary,
details[data-dd="1"] > summary{
  list-style:none;
}
details.navDrop > summary::-webkit-details-marker,
details[data-dd="1"] > summary::-webkit-details-marker{
  display:none;
}
.jmNavTrigger{
  display:inline-flex;
  align-items:center;
  gap:8px;
  min-height:42px;
  padding:0 14px;
  border-radius:999px;
  border:1px solid rgba(17,19,24,.12);
  background:#fff;
  color:inherit;
  font-weight:850;
  font-size:13px;
  white-space:nowrap;
  cursor:pointer;
}
.jmNavTrigger:hover{
  background:rgba(17,19,24,.04);
}
details.navDrop[open] > .jmNavTrigger,
details[data-dd="1"][open] > .jmNavTrigger{
  border-color:rgba(34,197,94,.40);
  background:rgba(34,197,94,.12);
}
.navMenu{
  position:absolute;
  top:calc(100% + 10px);
  right:0;
  width:min(300px, calc(100vw - 24px));
  padding:8px;
  border-radius:16px;
  border:1px solid rgba(17,19,24,.14);
  background:#fff;
  -webkit-backdrop-filter:saturate(1.05) blur(10px);
  backdrop-filter:saturate(1.05) blur(10px);
  box-shadow:0 14px 30px rgba(17,19,24,.12);
  display:flex;
  flex-direction:column;
  gap:6px;
  z-index:60;
}
details.navDrop:not([open]) .navMenu,
details[data-dd="1"]:not([open]) .navMenu{
  display:none;
}
.jmAccountCard{
  padding:12px;
  border-radius:12px;
  border:1px solid rgba(17,19,24,.08);
  background:rgba(17,19,24,.02);
  display:grid;
  gap:8px;
}
.jmAccountTop{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
}
.jmAccountTitle{
  font-size:15px;
  font-weight:900;
  letter-spacing:-.02em;
}
.jmAccountEmail{
  font-size:13px;
  color:rgba(17,19,24,.64);
  word-break:break-word;
}
.jmAccountMetaRow{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
}
.jmNavMetaPill{
  display:inline-flex;
  align-items:center;
  min-height:26px;
  padding:0 8px;
  border-radius:999px;
  border:1px solid rgba(17,19,24,.10);
  background:#fff;
  font-size:11px;
  font-weight:850;
  white-space:nowrap;
}
.jmNavMetaPill.good{
  border-color:rgba(34,197,94,.30);
  background:rgba(34,197,94,.12);
  color:#0a4a22;
}
.jmAccountHint{
  font-size:12px;
  color:rgba(17,19,24,.48);
  line-height:1.35;
}
.menuLabel{
  font-size:12px;
  font-weight:950;
  letter-spacing:.03em;
  text-transform:uppercase;
  color:rgba(17,19,24,.55);
  padding:2px 4px 0;
}
.menuSep{
  height:1px;
  background:rgba(17,19,24,.10);
  margin:4px 0;
}
.jmNavItem{
  width:100%;
  display:flex;
  align-items:center;
  min-height:38px;
  padding:8px 10px;
  border-radius:10px;
  border:0;
  background:transparent;
  color:inherit;
  font-weight:800;
  font-size:13px;
  text-align:left;
}
.jmNavItem:hover{
  background:rgba(17,19,24,.05);
}
.jmNavDanger{
  color:#8b1d42;
}
.jmNavDanger:hover{
  background:rgba(216,27,96,.08);
}
@media (max-width: 860px){
  .navMenu{
    width:min(360px, calc(100vw - 20px));
    right:-8px;
  }
}
`;
    document.head.appendChild(style);
  }

  async function hydrateAccountNav(opts = {}){
    ensureAccountNavStyles();

    const navAccount = $("navAccount");
    const navSignIn = $("navSignIn");
    const navStartFree = $("navStartFree");
    const navLogout = $("navLogout");
    const hasNav = !!(navAccount || navSignIn || navStartFree || navLogout);
    if (!hasNav) return null;

    const auth = getAppAuth();
    let session = opts.session || null;
    let state = opts.state || null;
    const shouldFetchState = opts.fetchState === true || String(document.body?.dataset?.navFetchState || "") === "1";

    if (!session && auth && typeof auth.getSession === "function"){
      try { session = await auth.getSession(); } catch (_) { session = null; }
    }
    if (!state){
      state = readCachedState();
    }
    if (!state && shouldFetchState && session && auth && typeof auth.syncStateToLocalStorage === "function"){
      try { state = await auth.syncStateToLocalStorage(session); } catch (_) { state = null; }
    }

    const email = String(session?.user?.email || state?.email || safeLocalGet("jm_user_email") || "").trim().toLowerCase();
    const signedIn = !!(session && session.user && email);

    if (navAccount) navAccount.style.display = signedIn ? "" : "none";
    if (navSignIn) navSignIn.style.display = signedIn ? "none" : "";
    if (navStartFree) navStartFree.style.display = signedIn ? "none" : "";

    if (!signedIn) return { signedIn:false, session:null, state:null };

    const handle = (email.split("@")[0] || "Account").trim();
    const shortHandle = handle.length > 16 ? (handle.slice(0, 16) + "...") : handle;
    const planInfo = buildAccountPlanInfo(state || {});
    const usageInfo = buildAccountUsageInfo(state || {});

    if ($("navAccountLabel")) $("navAccountLabel").textContent = shortHandle || "Account";
    if ($("navAccountTitle")) $("navAccountTitle").textContent = planInfo.detail || "Your account";
    if ($("navAccountEmail")) $("navAccountEmail").textContent = email;
    if ($("navPlanPill")){
      $("navPlanPill").textContent = planInfo.shortLabel || "Free";
      $("navPlanPill").classList.toggle("good", !!planInfo.paid);
    }
    if ($("navPlanMeta")) $("navPlanMeta").textContent = planInfo.jobsPlanLabel || planInfo.detail || "CV Studio account";
    if ($("navUsagePill")){
      $("navUsagePill").textContent = usageInfo.label || "Usage syncing";
      $("navUsagePill").classList.toggle("good", !!planInfo.paid);
    }
    if ($("navUsageMeta")) $("navUsageMeta").textContent = usageInfo.detail || "Usage updates after each tailored CV";

    if (navLogout && navLogout.dataset.jmLogoutWired !== "1"){
      navLogout.dataset.jmLogoutWired = "1";
      navLogout.addEventListener("click", async () => {
        try{
          if (navAccount) navAccount.open = false;
          if (auth && typeof auth.logout === "function"){
            await auth.logout("./index.html");
            return;
          }
        }catch(_){}
        window.location.href = "./index.html";
      });
    }

    const navActivity = $("navActivity");
    if (navActivity && !document.getElementById("activityModal") && !document.getElementById("activityWrap") && !document.getElementById("activityFilters")){
      navActivity.style.display = "none";
    }

    return { signedIn:true, session, state, email };
  }

  // ------------------------------------------------------------
  // CV Studio helper (global): setStudioMode
  // Only define if missing to avoid overriding cv.html's own implementation.
  // ------------------------------------------------------------
  function defaultSetStudioMode(mode, opts = {}){
    const m = String(mode || "tailor").trim().toLowerCase() || "tailor";
    const rootId = String(opts.rootId || "studioRoot");
    const root = $(rootId) || document.querySelector("[data-studio-root]");
    if(root) root.setAttribute("data-mode", m);

    safeLocalSet("jmj_cv_mode", m);

    $$("[data-studio-mode]").forEach((el) => {
      const em = String(el.getAttribute("data-studio-mode") || "").trim().toLowerCase();
      const on = em === m;
      el.classList.toggle("active", on);
      try{ el.setAttribute("aria-selected", on ? "true" : "false"); }catch(_){}
    });

    try{
      window.dispatchEvent(new CustomEvent("jmj:studioMode", { detail: { mode: m } }));
    }catch(_){}

    return m;
  }

  if (typeof window.setStudioMode !== "function"){
    window.setStudioMode = defaultSetStudioMode;
  }

  // Export shared API (merge with existing)
  const api = {
    __loaded_v3: true,
    VERSION,

    $,
    $$,
    escapeHtml,

    safeLocalGet,
    safeLocalSet,
    isLocalDebugHost,

    normalizeBaseUrl,
    resolveApiBase,

    go,
    wireNavTransitions,
    wireDetailsDropdowns,
    wireNavDropdowns,
    hydrateAccountNav,

    showTopError,
    setBadge,

    showModal,
    hideModal,
    wireModalDismiss,

    toast,
    copyToClipboard,

    setStudioMode: window.setStudioMode
  };

  window.JobMeJobShared = Object.assign({}, window.JobMeJobShared || {}, api);

  // JobMeJob is primary; keep JobApplyAI as a legacy alias.
  const app = window.JobMeJob || window.JobApplyAI || {};
  window.JobMeJob = app;
  window.JobApplyAI = app;
  app.shared = window.JobMeJobShared;

  // Auto-wire global behaviors
  window.addEventListener("DOMContentLoaded", () => {
    wireNavTransitions();
    wireDetailsDropdowns();
    wireModalDismiss();
    hydrateAccountNav().catch(() => {});
  });
})();
