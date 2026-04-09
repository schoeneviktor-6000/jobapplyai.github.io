/* shared.js — JobMeJob multipage helpers (site-wide)
   Version: 2026-04-10 (v4)

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
  if (window.JobMeJobShared && window.JobMeJobShared.__loaded_v4) return;

  const VERSION = "2026-04-10-v4";

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
    const extensionUrl = getChromeExtensionUrl();
    const notifyUrl = getChromeExtensionNotifyUrl();
    const targets = $$("[data-extension-link]", root);
    if(!targets.length) return { ready: !!extensionUrl, url: extensionUrl };

    targets.forEach((el) => {
      const fallback = String(el.getAttribute("data-extension-fallback") || notifyUrl || "./cv-studio.html#manual").trim();
      const isAnchor = String(el.tagName || "").toLowerCase() === "a";
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
      el.textContent = extensionUrl || "Chrome Web Store";
    });

    return { ready: !!extensionUrl, url: extensionUrl, notifyUrl };
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
.jmExtGuideLead{
  margin:14px 0 0;
  color:rgba(17,19,24,.72);
  line-height:1.55;
  font-size:14px;
}
.jmExtGuideGrid{
  display:grid;
  gap:10px;
  margin-top:16px;
}
.jmExtGuideStep{
  padding:14px;
  border-radius:16px;
  border:1px solid rgba(17,19,24,.10);
  background:rgba(17,19,24,.03);
}
.jmExtGuideStep strong{
  display:block;
  margin-bottom:4px;
  font-size:13px;
  font-weight:950;
  letter-spacing:-.01em;
}
.jmExtGuideStep span{
  display:block;
  font-size:13px;
  line-height:1.5;
  color:rgba(17,19,24,.68);
}
.jmExtGuideNote{
  margin-top:14px;
  padding:12px 14px;
  border-radius:14px;
  border:1px solid rgba(17,19,24,.10);
  background:rgba(255,255,255,.92);
  color:rgba(17,19,24,.72);
  font-size:13px;
  line-height:1.5;
}
@media (min-width: 720px){
  .jmExtGuideGrid{
    grid-template-columns:repeat(3, minmax(0, 1fr));
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
    modal.innerHTML = `
      <div class="modalCard" style="max-width:720px">
        <div class="modalHeader">
          <div style="min-width:0">
            <div class="modalTitle" id="extensionGuideTitle">Chrome extension</div>
            <div class="small" style="margin-top:6px">A helper for importing the job page faster, not the main product itself.</div>
          </div>
          <button class="btn small" type="button" data-close-modal>Close</button>
        </div>
        <div class="modalScroll">
          <span class="jmExtGuideTag">Support tool</span>
          <p class="jmExtGuideLead">Use the extension when you find a role on LinkedIn, Greenhouse, Lever, Indeed, Workday, or a company career page. It sends the job into CV Studio, where you still tailor the CV, review keywords, improve ATS coverage, edit the content, and export the PDF.</p>

          <div class="jmExtGuideGrid" aria-label="How the Chrome extension works">
            <div class="jmExtGuideStep">
              <strong>1. Open the job post</strong>
              <span>Go to the job page you want to apply to on the open web.</span>
            </div>
            <div class="jmExtGuideStep">
              <strong>2. Import it with Chrome</strong>
              <span>Click the extension to pull the title, company, and description into jobmejob.</span>
            </div>
            <div class="jmExtGuideStep">
              <strong>3. Finish inside CV Studio</strong>
              <span>Tailor the CV, check missing keywords, adjust bullets or sections, and export the final PDF.</span>
            </div>
          </div>

          <div class="jmExtGuideNote">Manual paste stays available anytime, so the extension remains a convenience layer on top of the core CV Studio workflow.</div>
        </div>
        <div class="modalActions">
          <a class="btn ghost" href="./cv.html" data-nav="1">Open CV Studio</a>
          <button class="btn" type="button" data-close-modal>Close</button>
          <a class="btn primary" data-extension-link data-extension-disabled-label="Get extension updates" data-extension-ready-label="Add to Chrome" href="./cv-studio.html#manual"><span class="btnLabel"><span data-extension-label>Add to Chrome</span></span></a>
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
      const profileLink = navAccount?.querySelector("a.jmNavItem[href*='profile.html']");
      const rawHref = String(profileLink?.getAttribute("href") || "./profile.html").trim() || "./profile.html";
      const url = new URL(rawHref, window.location.href);
      url.hash = "billingBox";
      return `${url.pathname}${url.search}${url.hash}`;
    }catch(_){
      return "./profile.html#billingBox";
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

    const pricingLink = menu.querySelector("a.jmNavItem[href*='plan.html']");
    const profileLink = menu.querySelector("a.jmNavItem[href*='profile.html']");
    let billingButton = menu.querySelector("[data-jm-nav='subscription-billing']");

    if (!billingButton){
      billingButton = document.createElement("a");
      billingButton.className = "jmNavItem";
      billingButton.setAttribute("data-nav", "1");
      billingButton.setAttribute("href", buildBillingSettingsHref(navAccount));
      billingButton.setAttribute("role", "menuitem");
      billingButton.setAttribute("data-jm-nav", "subscription-billing");
      billingButton.textContent = "Manage billing";

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
      pricingLink.textContent = "Plans & pricing";
    }
  }

  function ensureAccountExtensionNav(navAccount){
    const menu = navAccount?.querySelector(".navMenu");
    if (!menu) return;

    const cvLink = menu.querySelector("a.jmNavItem[href*='cv.html']");
    const jobsLink = menu.querySelector("a.jmNavItem[href*='jobs.html']");
    const profileLink = menu.querySelector("a.jmNavItem[href*='profile.html']");
    let extensionButton = menu.querySelector("[data-jm-nav='chrome-extension']");

    if (!extensionButton){
      extensionButton = document.createElement("button");
      extensionButton.type = "button";
      extensionButton.className = "jmNavItem";
      extensionButton.setAttribute("role", "menuitem");
      extensionButton.setAttribute("data-jm-nav", "chrome-extension");
      extensionButton.setAttribute("data-extension-modal-open", "1");
      extensionButton.textContent = "Chrome extension";

      const anchor = jobsLink || cvLink || profileLink;
      if (anchor && anchor.nextSibling){
        menu.insertBefore(extensionButton, anchor.nextSibling);
      } else if (profileLink){
        menu.insertBefore(extensionButton, profileLink);
      } else {
        menu.appendChild(extensionButton);
      }
    }
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

    if (navAccount){
      ensureAccountBillingNav(navAccount);
      ensureAccountExtensionNav(navAccount);
    }

    const handle = (email.split("@")[0] || "Account").trim();
    const shortHandle = handle.length > 16 ? (handle.slice(0, 16) + "...") : handle;
    const planInfo = buildAccountPlanInfo(state || {});
    const usageInfo = buildAccountUsageInfo(state || {});

    if ($("navAccountLabel")) $("navAccountLabel").textContent = shortHandle || "Account";
    if ($("navAccountTitle")) $("navAccountTitle").textContent = "Your account";
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
    __loaded_v4: true,
    VERSION,

    $,
    $$,
    escapeHtml,

    safeLocalGet,
    safeLocalSet,
    isLocalDebugHost,

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
  window.addEventListener("DOMContentLoaded", () => {
    wireNavTransitions();
    wireDetailsDropdowns();
    wireExtensionGuideTriggers();
    wireModalDismiss();
    hydrateExtensionLinks();
    hydrateAccountNav().catch(() => {});
  });
})();
