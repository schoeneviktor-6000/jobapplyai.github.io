/* shared.js — JobMeJob multipage helpers (site-wide)
   Version: 2026-04-10 (v5)

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
  if (window.JobMeJobShared && window.JobMeJobShared.__loaded_v5) return;

  const VERSION = "2026-04-10-v5";

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

  function getI18n(){
    try{
      return window.JobMeJobI18n || null;
    }catch(_){
      return null;
    }
  }

  function tt(key, vars = {}, fallback = ""){
    try{
      const i18n = getI18n();
      if (i18n && typeof i18n.t === "function"){
        return i18n.t(key, vars, fallback || key);
      }
    }catch(_){}
    return fallback || key;
  }

  function getAppLinks(){
    try{
      const app = window.JobMeJob || window.JobApplyAI || {};
      const links = app && app.config && app.config.LINKS && typeof app.config.LINKS === "object"
        ? app.config.LINKS
        : {};
      return Object.assign({}, links);
    }catch(_){
      return {};
    }
  }

  function getChromeExtensionUrl(){
    const links = getAppLinks();
    return String(links.CHROME_EXTENSION_URL || "").trim();
  }

  function getChromeExtensionNotifyUrl(){
    const links = getAppLinks();
    return String(links.CHROME_EXTENSION_NOTIFY_URL || "").trim();
  }

  function hydrateExtensionLinks(root = document){
    const configuredExtensionUrl = getChromeExtensionUrl();
    const notifyUrl = getChromeExtensionNotifyUrl();
    const targets = $$("[data-extension-link]", root);
    if(!targets.length) return { ready: !!configuredExtensionUrl, url: configuredExtensionUrl };

    let resolvedGlobalUrl = configuredExtensionUrl;

    targets.forEach((el) => {
      const isAnchor = String(el.tagName || "").toLowerCase() === "a";
      const inlineHref = isAnchor ? String(el.getAttribute("href") || "").trim() : "";
      const inlineExtensionUrl = /chromewebstore\.google\.com\/detail\//i.test(inlineHref) ? inlineHref : "";
      const extensionUrl = configuredExtensionUrl || inlineExtensionUrl;
      if (!resolvedGlobalUrl && extensionUrl) resolvedGlobalUrl = extensionUrl;
      const fallback = String(el.getAttribute("data-extension-fallback") || notifyUrl || "./cv-studio#manual").trim();
      const labelEl = el.querySelector("[data-extension-label]");
      const readyLabel = String(el.getAttribute("data-extension-ready-label") || "").trim();
      const disabledLabel = String(el.getAttribute("data-extension-disabled-label") || "").trim();

      el.dataset.extensionReady = extensionUrl ? "1" : "0";
      el.classList.toggle("isExtensionUnavailable", !extensionUrl);
      if(!extensionUrl) el.setAttribute("aria-disabled", "true");
      else el.removeAttribute("aria-disabled");

      if(isAnchor){
        el.setAttribute("href", extensionUrl || fallback);
        if(extensionUrl){
          el.setAttribute("target", "_blank");
          el.setAttribute("rel", "noopener noreferrer");
        }else{
          el.removeAttribute("target");
          el.removeAttribute("rel");
        }
      }

      if(labelEl){
        if(extensionUrl && readyLabel) labelEl.textContent = readyLabel;
        if(!extensionUrl && disabledLabel) labelEl.textContent = disabledLabel;
      }else{
        if(extensionUrl && readyLabel) el.textContent = readyLabel;
        if(!extensionUrl && disabledLabel) el.textContent = disabledLabel;
      }
    });

    $$("[data-extension-copy='url']", root).forEach((el) => {
      el.textContent = resolvedGlobalUrl || "Chrome Web Store";
    });

    return { ready: !!resolvedGlobalUrl, url: resolvedGlobalUrl, notifyUrl };
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

  function parseBooleanish(value){
    const v = trimLower(value);
    if (!v) return null;
    if (v === "1" || v === "true" || v === "yes" || v === "on" || v === "mobile") return true;
    if (v === "0" || v === "false" || v === "no" || v === "off" || v === "desktop") return false;
    return null;
  }

  function getCurrentUrl(){
    try{
      return new URL(window.location.href);
    }catch(_){
      return null;
    }
  }

  function basenamePath(pathname){
    const raw = String(pathname || "").trim();
    if (!raw) return "";
    const clean = raw.split("?")[0].split("#")[0].replace(/\/+$/, "");
    const parts = clean.split("/");
    return trimLower(parts[parts.length - 1] || "");
  }

  function readQueryBool(name){
    try{
      const u = getCurrentUrl();
      if (!u) return null;
      return parseBooleanish(u.searchParams.get(name));
    }catch(_){
      return null;
    }
  }

  function isMobileCvFlowEnabled(){
    const fromQuery = readQueryBool("cv_mobile_flow");
    if (fromQuery !== null) return fromQuery;
    const fromStorage = parseBooleanish(safeLocalGet("jm_cv_mobile_flow_enabled"));
    if (fromStorage !== null) return fromStorage;
    return true;
  }

  function readMobileCvDeviceOverride(){
    const fromQuery = readQueryBool("cv_mobile");
    if (fromQuery !== null) return fromQuery;
    return parseBooleanish(safeLocalGet("jm_cv_mobile_override"));
  }

  function isNarrowViewport(maxWidth = 820){
    try{
      if (window.matchMedia && window.matchMedia(`(max-width: ${Number(maxWidth) || 820}px)`).matches){
        return true;
      }
    }catch(_){}

    try{
      const width = Number(window.innerWidth || document.documentElement?.clientWidth || 0);
      return Number.isFinite(width) && width > 0 && width <= maxWidth;
    }catch(_){
      return false;
    }
  }

  function hasCoarsePointer(){
    try{
      if (window.matchMedia && (window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(any-pointer: coarse)").matches)){
        return true;
      }
    }catch(_){}
    return false;
  }

  function hasTouchSupport(){
    try{
      if ("ontouchstart" in window) return true;
    }catch(_){}
    try{
      if (Number(navigator?.maxTouchPoints || 0) > 0) return true;
    }catch(_){}
    try{
      if (Number(navigator?.msMaxTouchPoints || 0) > 0) return true;
    }catch(_){}
    return false;
  }

  function isMobileCvDevice(){
    const override = readMobileCvDeviceOverride();
    if (override !== null) return override;
    return isNarrowViewport(820) && (hasCoarsePointer() || hasTouchSupport());
  }

  function getMobileCvFlowPaths(){
    return {
      upload: "./cv-mobile-upload.html",
      studio: "./cv-mobile.html"
    };
  }

  function isMobileCvFlowPage(pathname = window.location.pathname){
    const page = basenamePath(pathname);
    return page === "cv-mobile-upload.html" || page === "cv-mobile.html";
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

  function hasUploadedCv(state){
    if (!state || typeof state !== "object") return false;
    if (state.cv_uploaded === true || state.cv_uploaded === 1) return true;
    return trimLower(state.cv_uploaded) === "true";
  }

  function resolveMobileCvPath(opts = {}){
    const paths = getMobileCvFlowPaths();
    const prefer = trimLower(opts.prefer || "");
    if (prefer === "upload") return paths.upload;
    if (prefer === "studio") return paths.studio;
    return hasUploadedCv(opts.state || readCachedState()) ? paths.studio : paths.upload;
  }

  async function enforceMobileCvFlow(opts = {}){
    const enabled = opts.enabled === true || (opts.enabled !== false && isMobileCvFlowEnabled());
    if (!enabled){
      return { redirected:false, reason:"disabled", session:opts.session || null, state:opts.state || null, target:"" };
    }
    if (!isMobileCvDevice()){
      return { redirected:false, reason:"desktop", session:opts.session || null, state:opts.state || null, target:"" };
    }
    if (isMobileCvFlowPage()){
      return { redirected:false, reason:"already-mobile-flow", session:opts.session || null, state:opts.state || null, target:"" };
    }

    const auth = getAppAuth();
    let session = opts.session || null;
    let state = opts.state || readCachedState();

    if (!session && auth && typeof auth.getSession === "function"){
      try{ session = await auth.getSession(); }catch(_){ session = null; }
    }

    const signedIn = !!(session && session.user && session.user.email);
    if (opts.signedInOnly !== false && !signedIn){
      return { redirected:false, reason:"signed-out", session, state, target:"" };
    }

    if (!state && signedIn && auth && typeof auth.syncStateToLocalStorage === "function" && opts.fetchState !== false){
      try{ state = await auth.syncStateToLocalStorage(session); }catch(_){ state = null; }
    }

    const target = resolveMobileCvPath({ state, prefer: opts.prefer || "" });
    const currentPage = basenamePath(window.location.pathname);
    const targetPage = basenamePath(new URL(target, window.location.href).pathname);
    if (!targetPage || currentPage === targetPage){
      return { redirected:false, reason:"already-target", session, state, target };
    }

    if (opts.replace === false){
      window.location.href = target;
    }else{
      window.location.replace(target);
    }
    return { redirected:true, reason:"redirected", session, state, target };
  }

  async function handleBodyMobileCvRedirect(){
    const mode = trimLower(document.body?.dataset?.mobileCvRedirect || "");
    if (!mode) return { redirected:false, reason:"no-body-opt-in", target:"" };
    return enforceMobileCvFlow({
      signedInOnly: mode !== "guest",
      fetchState: true,
      replace: true
    });
  }

  function planLabelFromId(planId){
    const pid = trimLower(planId);
    if (!pid || pid === "free") return tt("common.plans.free", {}, "Free");
    if (pid === "cv_starter") return tt("common.plans.starter", {}, "Starter");
    if (pid === "cv_plus") return tt("common.plans.plus", {}, "Plus");
    if (pid === "cv_unlimited") return "Unlimited";
    if (pid === "starter") return tt("common.plans.starter", {}, "Starter");
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
    const cvPaid = !!(
      state?.cv_paid === true ||
      state?.cv_studio_paid === true ||
      state?.entitlements?.cv_paid === true ||
      state?.entitlements?.cv_studio_paid === true ||
      !!cvPlanId
    );

    if (cvPaid){
      const cvLabel = planLabelFromId(cvPlanId) || tt("common.plans.paid", {}, "Paid");
      return {
        shortLabel: cvLabel,
        detail: tt("common.account.cvStudioPlan", { plan: cvLabel }, `CV Studio ${cvLabel}`),
        paid: true
      };
    }

    return {
      shortLabel: tt("common.plans.free", {}, "Free"),
      detail: tt("common.account.freePlan", {}, "CV Studio Free"),
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
      return {
        label: tt("common.account.unlimited", {}, "Unlimited CVs"),
        detail: tt("common.account.noMonthlyCap", {}, "No monthly cap on CV tailoring")
      };
    }
    if (limit !== null && used !== null){
      const remaining = Math.max(0, limit - used);
      if (cvPaid){
        return {
          label: tt("common.account.cvsLeft", { count: remaining }, `${remaining} CVs left`),
          detail: tt("common.account.usedThisCycle", { used, limit }, `${used} of ${limit} used this billing cycle`)
        };
      }
      return {
        label: tt("common.account.freeCvsLeft", { count: remaining }, `${remaining} free CVs left`),
        detail: tt("common.account.usedGeneric", { used, limit }, `${used} of ${limit} used`)
      };
    }

    const cached = readCachedCvAccess();
    const cachedLimit = firstNumber(cached?.limit);
    const cachedUsed = firstNumber(cached?.used);
    if (cachedLimit !== null && cachedUsed !== null){
      const remaining = Math.max(0, cachedLimit - cachedUsed);
      return {
        label: cached?.paid
          ? tt("common.account.cvsLeft", { count: remaining }, `${remaining} CVs left`)
          : tt("common.account.freeCvsLeft", { count: remaining }, `${remaining} free CVs left`),
        detail: tt("common.account.usedGeneric", { used: cachedUsed, limit: cachedLimit }, `${cachedUsed} of ${cachedLimit} used`)
      };
    }

    return {
      label: cvPaid
        ? tt("common.account.usageSyncing", {}, "Usage syncing")
        : tt("common.account.freeUsage", {}, "5 free CVs available"),
      detail: cvPaid
        ? tt("common.account.usageUpdates", {}, "Usage updates after each tailored CV")
        : tt("common.account.upgradeRoutine", {}, "Upgrade only when CV Studio becomes routine")
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
  background:rgba(255,255,255,.92);
  color:inherit;
  font-weight:850;
  font-size:13px;
  white-space:nowrap;
  cursor:pointer;
  transition:border-color .15s ease, background .15s ease, box-shadow .15s ease, transform .15s ease;
}
.jmNavTrigger:hover{
  background:#fff;
  border-color:rgba(17,19,24,.18);
  transform:translateY(-1px);
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
  width:min(340px, calc(100vw - 24px));
  padding:12px;
  border-radius:20px;
  border:1px solid rgba(17,19,24,.12);
  background:rgba(255,255,255,.98);
  -webkit-backdrop-filter:saturate(1.1) blur(18px);
  backdrop-filter:saturate(1.1) blur(18px);
  box-shadow:0 22px 56px rgba(17,19,24,.16), 0 8px 22px rgba(17,19,24,.08);
  display:flex;
  flex-direction:column;
  gap:8px;
  z-index:60;
}
details.navDrop:not([open]) .navMenu,
details[data-dd="1"]:not([open]) .navMenu{
  display:none;
}
.jmAccountCard{
  padding:14px;
  border-radius:16px;
  border:1px solid rgba(17,19,24,.08);
  background:linear-gradient(180deg, rgba(255,255,255,.96), rgba(17,19,24,.03));
  display:grid;
  gap:10px;
}
.jmAccountTop{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:8px;
  flex-wrap:wrap;
}
.jmAccountTitle{
  font-size:16px;
  font-weight:900;
  letter-spacing:-.02em;
  line-height:1.1;
}
.jmAccountEmail{
  font-size:12px;
  line-height:1.45;
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
  min-height:28px;
  padding:0 10px;
  border-radius:999px;
  border:1px solid rgba(17,19,24,.10);
  background:#fff;
  font-size:11px;
  font-weight:850;
  white-space:nowrap;
  letter-spacing:.01em;
}
.jmNavMetaPill.good{
  border-color:rgba(34,197,94,.30);
  background:rgba(34,197,94,.12);
  color:#0a4a22;
}
.jmAccountHint{
  font-size:12px;
  color:rgba(17,19,24,.48);
  line-height:1.45;
}
.menuLabel{
  font-size:12px;
  font-weight:950;
  letter-spacing:.03em;
  text-transform:uppercase;
  color:rgba(17,19,24,.55);
  padding:6px 4px 2px;
}
.menuSep{
  height:1px;
  background:rgba(17,19,24,.10);
  margin:6px 2px;
}
.jmNavItem{
  width:100%;
  display:flex;
  align-items:center;
  justify-content:flex-start;
  gap:10px;
  min-height:42px;
  padding:10px 12px;
  border-radius:12px;
  border:1px solid transparent;
  background:transparent;
  color:inherit;
  font-weight:800;
  font-size:13px;
  text-align:left;
  line-height:1.25;
  transition:background .15s ease, border-color .15s ease, transform .15s ease;
}
.jmNavItem:hover{
  background:rgba(17,19,24,.045);
  border-color:rgba(17,19,24,.08);
  transform:translateY(-1px);
}
.jmNavDanger{
  color:#8b1d42;
}
.jmNavDanger:hover{
  background:rgba(216,27,96,.08);
  border-color:rgba(216,27,96,.10);
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

  function ensureExtensionGuideStyles(){
    if (document.getElementById("jmSharedExtensionGuideStyles")) return;
    const style = document.createElement("style");
    style.id = "jmSharedExtensionGuideStyles";
    style.textContent = `
.jmExtGuideTag{
  display:inline-flex;
  align-items:center;
  min-height:28px;
  padding:0 10px;
  border-radius:999px;
  border:1px solid rgba(34,197,94,.28);
  background:rgba(34,197,94,.12);
  color:#0a4a22;
  font-size:11px;
  font-weight:900;
  letter-spacing:.02em;
  text-transform:uppercase;
}
.jmExtGuideHeader{
  align-items:center;
}
.jmExtGuideTitleWrap{
  display:flex;
  align-items:center;
  gap:12px;
  min-width:0;
}
.jmExtGuideChromeBadge{
  flex:0 0 auto;
  width:48px;
  height:48px;
  border-radius:16px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border:1px solid rgba(17,19,24,.08);
  background:linear-gradient(160deg, rgba(255,255,255,.98), rgba(17,19,24,.05));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.78);
}
.jmExtGuideChromeBadge svg{
  width:30px;
  height:30px;
  display:block;
}
.jmExtGuideSub{
  margin-top:6px;
  color:rgba(17,19,24,.68);
  line-height:1.45;
  max-width:42ch;
}
.jmExtGuideBody{
  padding:16px 14px 18px;
}
.jmExtGuideHero{
  display:grid;
  gap:12px;
  align-items:stretch;
}
.jmExtGuideIntro,
.jmExtGuideMiniCard{
  padding:16px;
  border-radius:20px;
  border:1px solid rgba(17,19,24,.08);
}
.jmExtGuideIntro{
  background:linear-gradient(145deg, rgba(17,19,24,.04), rgba(255,255,255,.96));
}
.jmExtGuideHeadline{
  margin:14px 0 0;
  font-size:24px;
  line-height:1.08;
  font-weight:950;
  letter-spacing:-.03em;
  color:#111318;
}
.jmExtGuideBoards{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  margin-top:16px;
}
.jmExtGuideBoard{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:8px 11px;
  border-radius:999px;
  border:1px solid rgba(17,19,24,.08);
  background:rgba(255,255,255,.92);
  color:rgba(17,19,24,.74);
  font-size:12px;
  font-weight:850;
}
.jmExtGuideBoardDot{
  width:7px;
  height:7px;
  border-radius:999px;
  background:linear-gradient(135deg, #4285f4, #34a853);
}
.jmExtGuideMiniCard{
  background:linear-gradient(145deg, rgba(226,247,232,.92), rgba(255,255,255,.98));
  border-color:rgba(34,197,94,.18);
}
.jmExtGuideMiniEyebrow{
  font-size:11px;
  font-weight:900;
  letter-spacing:.08em;
  text-transform:uppercase;
  color:#0d5a2b;
}
.jmExtGuideMiniChips{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  margin-top:12px;
}
.jmExtGuideMiniChip{
  display:inline-flex;
  align-items:center;
  padding:8px 10px;
  border-radius:12px;
  border:1px solid rgba(17,19,24,.08);
  background:rgba(255,255,255,.92);
  color:rgba(17,19,24,.8);
  font-size:12px;
  font-weight:850;
}
.jmExtGuideMiniMeta{
  display:flex;
  align-items:flex-start;
  gap:8px;
  margin-top:12px;
  color:rgba(17,19,24,.72);
  font-size:12px;
  line-height:1.45;
}
.jmExtGuideMiniMetaIco,
.jmExtGuideBenefitIco,
.jmExtGuideNoteIco,
.jmExtGuideStepIco{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  flex:0 0 auto;
}
.jmExtGuideMiniMetaIco{
  width:20px;
  height:20px;
  border-radius:8px;
  background:rgba(34,197,94,.16);
  color:#0a5a2a;
}
.jmExtGuideMiniMetaIco svg,
.jmExtGuideBenefitIco svg,
.jmExtGuideNoteIco svg,
.jmExtGuideStepIco svg,
.jmExtGuideActionIco svg{
  width:100%;
  height:100%;
  display:block;
}
.jmExtGuideGrid{
  display:grid;
  gap:10px;
  margin-top:14px;
}
.jmExtGuideStep{
  padding:15px;
  border-radius:18px;
  border:1px solid rgba(17,19,24,.10);
  background:linear-gradient(155deg, rgba(17,19,24,.04), rgba(255,255,255,.96));
  display:flex;
  flex-direction:column;
  gap:10px;
}
.jmExtGuideStepTop{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
}
.jmExtGuideStepIco{
  width:38px;
  height:38px;
  border-radius:12px;
  background:rgba(255,255,255,.92);
  border:1px solid rgba(17,19,24,.08);
  color:#111318;
}
.jmExtGuideStepNo{
  color:rgba(17,19,24,.5);
  font-size:11px;
  font-weight:900;
  letter-spacing:.08em;
  text-transform:uppercase;
}
.jmExtGuideStep strong{
  display:block;
  font-size:15px;
  font-weight:950;
  letter-spacing:-.02em;
}
.jmExtGuideStep p{
  margin:0;
  font-size:13px;
  line-height:1.45;
  color:rgba(17,19,24,.68);
}
.jmExtGuideBenefits{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  margin-top:14px;
}
.jmExtGuideBenefit{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:9px 12px;
  border-radius:999px;
  border:1px solid rgba(17,19,24,.08);
  background:rgba(17,19,24,.04);
  color:rgba(17,19,24,.82);
  font-size:12px;
  font-weight:850;
}
.jmExtGuideBenefitIco{
  width:18px;
  height:18px;
  color:#0f6b32;
}
.jmExtGuideNote{
  margin-top:14px;
  padding:14px;
  border-radius:16px;
  border:1px solid rgba(17,19,24,.10);
  background:linear-gradient(145deg, rgba(255,255,255,.98), rgba(17,19,24,.03));
  display:grid;
  grid-template-columns:auto 1fr;
  gap:12px;
  align-items:flex-start;
}
.jmExtGuideNoteIco{
  width:36px;
  height:36px;
  border-radius:12px;
  background:rgba(17,19,24,.05);
  color:#111318;
}
.jmExtGuideNote strong{
  display:block;
  font-size:13px;
  font-weight:900;
  color:#111318;
}
.jmExtGuideNote span{
  display:block;
  margin-top:4px;
  color:rgba(17,19,24,.72);
  font-size:13px;
  line-height:1.5;
}
.jmExtGuideActionIco{
  width:18px;
  height:18px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  flex:0 0 auto;
}
@media (min-width: 720px){
  .jmExtGuideHero{
    grid-template-columns:minmax(0, 1.35fr) minmax(260px, .95fr);
  }
  .jmExtGuideGrid{
    grid-template-columns:repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 640px){
  .jmExtGuideHeader{
    align-items:flex-start;
  }
  .jmExtGuideTitleWrap{
    align-items:flex-start;
  }
  .jmExtGuideChromeBadge{
    width:42px;
    height:42px;
    border-radius:14px;
  }
  .jmExtGuideHeadline{
    font-size:21px;
  }
  .jmExtGuideNote{
    grid-template-columns:1fr;
  }
}
`;
    document.head.appendChild(style);
  }

  function ensureExtensionGuideModal(){
    ensureExtensionGuideStyles();
    let modal = $("extensionGuideModal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.className = "modalBackdrop";
    modal.id = "extensionGuideModal";
    modal.style.display = "none";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "extensionGuideTitle");
    const chromeIcon = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 12h9.35A9.47 9.47 0 0 0 7.43 3.77Z" fill="#EA4335"></path>
        <path d="M12 12 7.43 3.77A9.48 9.48 0 0 0 2.53 12c0 1.29.26 2.52.73 3.64Z" fill="#FBBC05"></path>
        <path d="M12 12 3.26 15.64A9.48 9.48 0 0 0 21.35 12Z" fill="#34A853"></path>
        <circle cx="12" cy="12" r="4.15" fill="#4285F4"></circle>
        <circle cx="12" cy="12" r="1.95" fill="#DCE7FF"></circle>
      </svg>
    `;
    const browserIcon = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="3"></rect>
        <path d="M4 9h16"></path>
        <path d="M8 7h.01"></path>
        <path d="M11 7h.01"></path>
      </svg>
    `;
    const studioIcon = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M14 3H8a2 2 0 0 0-2 2v14l4-2 4 2 4-2V7Z"></path>
        <path d="M9 9h6"></path>
        <path d="M9 13h5"></path>
      </svg>
    `;
    const checkIcon = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5"></path>
      </svg>
    `;
    const pasteIcon = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9 4h6"></path>
        <path d="M9 2h6v4H9z"></path>
        <rect x="5" y="5" width="14" height="17" rx="2"></rect>
        <path d="M8.5 11h7"></path>
        <path d="M8.5 15h5"></path>
      </svg>
    `;
    const openIcon = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M14 5h5v5"></path>
        <path d="M10 14 19 5"></path>
        <path d="M19 13v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"></path>
      </svg>
    `;
    modal.innerHTML = `
      <div class="modalCard" style="max-width:760px">
        <div class="modalHeader jmExtGuideHeader">
          <div style="min-width:0">
            <div class="jmExtGuideTitleWrap">
              <span class="jmExtGuideChromeBadge" aria-hidden="true">${chromeIcon}</span>
              <div style="min-width:0">
                <div class="modalTitle" id="extensionGuideTitle">Chrome extension</div>
                <div class="small jmExtGuideSub">Import the job post fast. The real tailoring still happens in CV Studio.</div>
              </div>
            </div>
          </div>
          <button class="btn small" type="button" data-close-modal>Close</button>
        </div>
        <div class="modalScroll jmExtGuideBody">
          <div class="jmExtGuideHero">
            <div class="jmExtGuideIntro">
              <span class="jmExtGuideTag">Support tool</span>
              <div class="jmExtGuideHeadline">From job page to CV Studio in one click</div>
              <div class="jmExtGuideBoards" aria-label="Supported job sites">
                <span class="jmExtGuideBoard"><span class="jmExtGuideBoardDot" aria-hidden="true"></span>LinkedIn</span>
                <span class="jmExtGuideBoard"><span class="jmExtGuideBoardDot" aria-hidden="true"></span>Greenhouse</span>
                <span class="jmExtGuideBoard"><span class="jmExtGuideBoardDot" aria-hidden="true"></span>Lever</span>
                <span class="jmExtGuideBoard"><span class="jmExtGuideBoardDot" aria-hidden="true"></span>Indeed</span>
                <span class="jmExtGuideBoard"><span class="jmExtGuideBoardDot" aria-hidden="true"></span>Workday</span>
                <span class="jmExtGuideBoard"><span class="jmExtGuideBoardDot" aria-hidden="true"></span>Career page</span>
              </div>
            </div>

            <div class="jmExtGuideMiniCard">
              <div class="jmExtGuideMiniEyebrow">What gets imported</div>
              <div class="jmExtGuideMiniChips" aria-label="Imported job fields">
                <span class="jmExtGuideMiniChip">Job title</span>
                <span class="jmExtGuideMiniChip">Company</span>
                <span class="jmExtGuideMiniChip">Description</span>
              </div>
              <div class="jmExtGuideMiniMeta">
                <span class="jmExtGuideMiniMetaIco" aria-hidden="true">${checkIcon}</span>
                <span>Same jobmejob account. No extra side-panel login.</span>
              </div>
            </div>
          </div>

          <div class="jmExtGuideGrid" aria-label="How the Chrome extension works">
            <div class="jmExtGuideStep">
              <div class="jmExtGuideStepTop">
                <span class="jmExtGuideStepIco" aria-hidden="true">${browserIcon}</span>
                <span class="jmExtGuideStepNo">Step 1</span>
              </div>
              <strong>Open the role page</strong>
              <p>Find the job post in Chrome and keep the original page open.</p>
            </div>
            <div class="jmExtGuideStep">
              <div class="jmExtGuideStepTop">
                <span class="jmExtGuideStepIco" aria-hidden="true">${chromeIcon}</span>
                <span class="jmExtGuideStepNo">Step 2</span>
              </div>
              <strong>Capture with the extension</strong>
              <p>Click once to pull the title, company, and description into jobmejob.</p>
            </div>
            <div class="jmExtGuideStep">
              <div class="jmExtGuideStepTop">
                <span class="jmExtGuideStepIco" aria-hidden="true">${studioIcon}</span>
                <span class="jmExtGuideStepNo">Step 3</span>
              </div>
              <strong>Finish inside CV Studio</strong>
              <p>Tailor, review ATS gaps, edit the draft, and export the PDF.</p>
            </div>
          </div>

          <div class="jmExtGuideBenefits" aria-label="What you can do in CV Studio">
            <span class="jmExtGuideBenefit"><span class="jmExtGuideBenefitIco" aria-hidden="true">${checkIcon}</span>ATS gaps</span>
            <span class="jmExtGuideBenefit"><span class="jmExtGuideBenefitIco" aria-hidden="true">${checkIcon}</span>Edit content</span>
            <span class="jmExtGuideBenefit"><span class="jmExtGuideBenefitIco" aria-hidden="true">${checkIcon}</span>PDF export</span>
          </div>

          <div class="jmExtGuideNote">
            <span class="jmExtGuideNoteIco" aria-hidden="true">${pasteIcon}</span>
            <div>
              <strong>Manual paste still works.</strong>
              <span>If a page is blocked or messy, paste the job description into CV Studio and keep moving.</span>
            </div>
          </div>
        </div>
        <div class="modalActions">
          <a class="btn ghost" href="/cv?entry=chooser" data-nav="1"><span class="btnLabel"><span class="jmExtGuideActionIco" aria-hidden="true">${openIcon}</span>Open CV Studio</span></a>
          <button class="btn" type="button" data-close-modal>Close</button>
          <a class="btn primary" data-extension-link data-extension-disabled-label="Add to Chrome" data-extension-ready-label="Add to Chrome" href="https://chromewebstore.google.com/detail/jibmnlonajhoaanhoblhiciddggiohba?utm_source=item-share-cb"><span class="btnLabel"><span class="jmExtGuideActionIco" aria-hidden="true">${chromeIcon}</span><span data-extension-label>Add to Chrome</span></span></a>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    hydrateExtensionLinks(modal);
    return modal;
  }

  function openExtensionGuideModal(triggerEl){
    try{
      const navDrop = triggerEl && triggerEl.closest
        ? triggerEl.closest("details.navDrop, details[data-dd='1']")
        : null;
      if (navDrop) navDrop.open = false;
    }catch(_){}

    const modal = ensureExtensionGuideModal();
    hydrateExtensionLinks(modal);
    showModal("extensionGuideModal");
  }

  function wireExtensionGuideTriggers(){
    if (wireExtensionGuideTriggers.__wired) return;
    wireExtensionGuideTriggers.__wired = true;

    document.addEventListener("click", (e) => {
      const trigger = e.target && e.target.closest ? e.target.closest("[data-extension-modal-open]") : null;
      if (!trigger) return;
      e.preventDefault();
      openExtensionGuideModal(trigger);
    });
  }

  function buildBillingSettingsHref(navAccount){
    try{
      const profileLink = navAccount?.querySelector("a.jmNavItem[href*='profile.html'], a.jmNavItem[href*='profile#'], a.jmNavItem[href*='profile?'], a.jmNavItem[href$='profile']");
      const rawHref = String(profileLink?.getAttribute("href") || "/profile").trim() || "/profile";
      const url = new URL(rawHref, window.location.href);
      url.hash = "billingBox";
      return `${url.pathname}${url.search}${url.hash}`;
    }catch(_){
      return "/profile#billingBox";
    }
  }

  function getBillingPortalFallback(navAccount){
    const links = getAppLinks();
    const directPortal = String(links.CV_STUDIO_PORTAL_URL || "").trim();
    return directPortal || buildBillingSettingsHref(navAccount);
  }

  async function openBillingPortalFromNav(navAccount, triggerEl){
    const fallback = getBillingPortalFallback(navAccount);
    const auth = getAppAuth();
    let session = null;
    try{
      session = auth && typeof auth.getSession === "function"
        ? await auth.getSession()
        : null;
    }catch(_){
      session = null;
    }

    const token = String(session?.access_token || "").trim();
    const apiBase = resolveApiBase("https://jobmejob.schoene-viktor.workers.dev");
    if (!token || !apiBase){
      go(fallback);
      return;
    }

    let shouldFallback = false;
    if (triggerEl) triggerEl.disabled = true;

    try{
      const res = await fetch(`${apiBase}/me/billing/portal`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "content-type": "application/json"
        },
        body: "{}"
      });

      const text = await res.text().catch(() => "");
      let data = null;
      try{ data = text ? JSON.parse(text) : null; }catch(_){ data = null; }

      if (res.ok && data?.url){
        if (navAccount) navAccount.open = false;
        window.location.href = String(data.url);
        return;
      }

      shouldFallback = true;
      toast(
        (data && (data.error || data.message)) ? String(data.error || data.message) : "Billing portal unavailable right now.",
        { kind:"warn", title:"Billing" }
      );
    }catch(_){
      shouldFallback = true;
      toast("Billing portal unavailable right now.", { kind:"warn", title:"Billing" });
    }finally{
      if (triggerEl) triggerEl.disabled = false;
      if (navAccount) navAccount.open = false;
    }

    if (shouldFallback){
      go(fallback);
    }
  }

  function ensureAccountBillingNav(navAccount){
    const menu = navAccount?.querySelector(".navMenu");
    if (!menu) return;

    const pricingLink = menu.querySelector("a.jmNavItem[href*='plan.html'], a.jmNavItem[href*='plan#'], a.jmNavItem[href$='plan']");
    const profileLink = menu.querySelector("a.jmNavItem[href*='profile.html'], a.jmNavItem[href*='profile#'], a.jmNavItem[href*='profile?'], a.jmNavItem[href$='profile']");
    let billingButton = menu.querySelector("[data-jm-nav='subscription-billing']");

    if (!billingButton){
      billingButton = document.createElement("a");
      billingButton.className = "jmNavItem";
      billingButton.setAttribute("data-nav", "1");
      billingButton.setAttribute("href", buildBillingSettingsHref(navAccount));
      billingButton.setAttribute("role", "menuitem");
      billingButton.setAttribute("data-jm-nav", "subscription-billing");
      billingButton.textContent = tt("common.nav.manageBilling", {}, "Manage billing");

      if (profileLink && profileLink.nextSibling){
        menu.insertBefore(billingButton, profileLink.nextSibling);
      } else if (pricingLink){
        menu.insertBefore(billingButton, pricingLink);
      } else {
        menu.appendChild(billingButton);
      }
    }

    if (String(billingButton.tagName || "").toLowerCase() === "a"){
      billingButton.setAttribute("href", buildBillingSettingsHref(navAccount));
    }

    if (billingButton.dataset.jmPortalWired !== "1"){
      billingButton.dataset.jmPortalWired = "1";
      billingButton.addEventListener("click", (e) => {
        e.preventDefault();
        openBillingPortalFromNav(navAccount, billingButton).catch(() => {
          go(getBillingPortalFallback(navAccount));
        });
      });
    }

    if (pricingLink){
      pricingLink.textContent = tt("common.nav.plansAndPricing", {}, "Plans & pricing");
    }
  }

  function pruneDeprecatedNavLinks(root = document){
    const scope = root && typeof root.querySelectorAll === "function" ? root : document;
    if (!scope || typeof scope.querySelectorAll !== "function") return;

    scope.querySelectorAll(
      ".navlinks a[href*='dashboard.html'], .navlinks a[href*='jobs.html'], .topActions a[href*='dashboard.html'], .topActions a[href*='jobs.html'], .navMenu a.jmNavItem[href*='dashboard.html'], .navMenu a.jmNavItem[href*='jobs.html']"
    ).forEach((link) => {
      try{ link.remove(); }catch(_){}
    });
  }

  function pruneAccountPrimaryNav(navAccount){
    pruneDeprecatedNavLinks(navAccount);
  }

  function ensureAccountExtensionNav(navAccount){
    const menu = navAccount?.querySelector(".navMenu");
    if (!menu) return;

    const cvLink = menu.querySelector("a.jmNavItem[href*='cv.html'], a.jmNavItem[href*='cv?'], a.jmNavItem[href$='cv']");
    const profileLink = menu.querySelector("a.jmNavItem[href*='profile.html'], a.jmNavItem[href*='profile#'], a.jmNavItem[href*='profile?'], a.jmNavItem[href$='profile']");
    let extensionButton = menu.querySelector("[data-jm-nav='chrome-extension']");

    if (!extensionButton){
      extensionButton = document.createElement("button");
      extensionButton.type = "button";
      extensionButton.className = "jmNavItem";
      extensionButton.setAttribute("role", "menuitem");
      extensionButton.setAttribute("data-jm-nav", "chrome-extension");
      extensionButton.setAttribute("data-extension-modal-open", "1");
      extensionButton.textContent = "Chrome extension";

      const anchor = cvLink || profileLink;
      if (anchor && anchor.nextSibling){
        menu.insertBefore(extensionButton, anchor.nextSibling);
      } else if (profileLink){
        menu.insertBefore(extensionButton, profileLink);
      } else {
        menu.appendChild(extensionButton);
      }
    }
  }

  function normalizeCvStudioNavLinks(root = document){
    const scope = root && typeof root.querySelectorAll === "function" ? root : document;
    if (!scope || typeof scope.querySelectorAll !== "function") return;

    scope.querySelectorAll(".navlinks a[href*='cv.html'], .navlinks a[href*='cv?'], .navlinks a[href$='cv'], .topActions a.pill[href*='cv.html'], .topActions a.pill[href*='cv?'], .topActions a.pill[href$='cv'], .navMenu a.jmNavItem[href*='cv.html'], .navMenu a.jmNavItem[href*='cv?'], .navMenu a.jmNavItem[href$='cv']").forEach((link) => {
      try{
        const href = String(link.getAttribute("href") || "");
        if (!href || /[?&]job_id=/.test(href) || /[?&]entry=chooser/.test(href)) return;
        link.setAttribute("href", href.startsWith("/") ? "/cv?entry=chooser" : "./cv?entry=chooser");
      }catch(_){}
    });
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
    pruneDeprecatedNavLinks(document);
    normalizeCvStudioNavLinks(document);

    if (!signedIn) return { signedIn:false, session:null, state:null };

    if (navAccount){
      pruneAccountPrimaryNav(navAccount);
      ensureAccountBillingNav(navAccount);
      ensureAccountExtensionNav(navAccount);
    }

    const handle = (email.split("@")[0] || "Account").trim();
    const shortHandle = handle.length > 16 ? (handle.slice(0, 16) + "...") : handle;
    const planInfo = buildAccountPlanInfo(state || {});
    const usageInfo = buildAccountUsageInfo(state || {});

    if ($("navAccountLabel")) $("navAccountLabel").textContent = shortHandle || tt("common.nav.account", {}, "Account");
    if ($("navAccountTitle")) $("navAccountTitle").textContent = tt("common.nav.yourAccount", {}, "Your account");
    if ($("navAccountEmail")) $("navAccountEmail").textContent = email;
    if ($("navPlanPill")){
      $("navPlanPill").textContent = planInfo.shortLabel || tt("common.plans.free", {}, "Free");
      $("navPlanPill").classList.toggle("good", !!planInfo.paid);
    }
    if ($("navPlanMeta")) $("navPlanMeta").textContent = planInfo.detail || tt("common.account.cvStudioPlan", { plan: tt("common.plans.free", {}, "Free") }, "CV Studio account");
    if ($("navUsagePill")){
      $("navUsagePill").textContent = usageInfo.label || tt("common.account.usageSyncing", {}, "Usage syncing");
      $("navUsagePill").classList.toggle("good", !!planInfo.paid);
    }
    if ($("navUsageMeta")) $("navUsageMeta").textContent = usageInfo.detail || tt("common.account.usageUpdates", {}, "Usage updates after each tailored CV");

    if (navLogout && navLogout.dataset.jmLogoutWired !== "1"){
      navLogout.dataset.jmLogoutWired = "1";
      navLogout.addEventListener("click", async () => {
        try{
          if (navAccount) navAccount.open = false;
          if (auth && typeof auth.logout === "function"){
            await auth.logout("./");
            return;
          }
        }catch(_){}
        window.location.href = "./";
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

  try{ normalizeCvStudioNavLinks(document); }catch(_){}

  // Export shared API (merge with existing)
  const api = {
    __loaded_v5: true,
    VERSION,

    $,
    $$,
    escapeHtml,

    safeLocalGet,
    safeLocalSet,
    isLocalDebugHost,
    isMobileCvFlowEnabled,
    isMobileCvDevice,
    getMobileCvFlowPaths,
    resolveMobileCvPath,
    enforceMobileCvFlow,

    normalizeBaseUrl,
    resolveApiBase,
    getAppLinks,
    getChromeExtensionUrl,
    getChromeExtensionNotifyUrl,
    hydrateExtensionLinks,
    openExtensionGuideModal,

    go,
    wireNavTransitions,
    wireDetailsDropdowns,
    wireNavDropdowns,
    wireExtensionGuideTriggers,
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
  window.addEventListener("DOMContentLoaded", async () => {
    try{
      const i18n = getI18n();
      if (i18n && typeof i18n.ready === "function"){
        await i18n.ready();
        if (typeof i18n.applyTranslations === "function") i18n.applyTranslations(document);
        if (typeof i18n.applyLocalizedPricing === "function") i18n.applyLocalizedPricing(document);
        if (typeof i18n.hydrateLocaleSwitchers === "function") i18n.hydrateLocaleSwitchers(document);
      }
    }catch(_){}
    try{
      const redirect = await handleBodyMobileCvRedirect();
      if (redirect && redirect.redirected) return;
    }catch(_){}
    wireNavTransitions();
    wireDetailsDropdowns();
    wireExtensionGuideTriggers();
    wireModalDismiss();
    hydrateExtensionLinks();
    hydrateAccountNav().catch(() => {});
  });
})();
