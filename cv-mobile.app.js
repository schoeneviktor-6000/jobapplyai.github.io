"use strict";

(() => {
  const S = window.JobMeJobShared || null;
  const APP = window.JobMeJob || window.JobApplyAI || {};
  const auth = APP.auth || null;
  const API_BASE = String((APP.config && APP.config.API_BASE) || (S && S.resolveApiBase ? S.resolveApiBase("https://jobmejob.schoene-viktor.workers.dev") : "https://jobmejob.schoene-viktor.workers.dev")).replace(/\/+$/, "");
  const TAILOR_ENDPOINTS = ["/me/cv/tailor_from_text", "/me/cv/tailor-from-text", "/me/cv/tailor_text"];
  const JOB_IMAGE_OCR_ENDPOINTS = ["/me/jobs/ocr-image", "/me/jobs/ocr_image"];
  const FETCH_TIMEOUT_MS = 35000;
  const LONG_TIMEOUT_MS = 120000;
  const OCR_STATUS_TIMEOUT_MS = 60000;
  const CV_POLL_MS = 5000;
  const TOKEN_REFRESH_SKEW_SEC = 90;
  const PDF_FONT_THEME = "serif";
  const CONTACT_STYLE_THEMES = Object.freeze({
    plain: {
      kind: "plain",
      pdf: { phone:"", email:"", location:"", linkedin:"", portfolio:"" }
    },
    classic: {
      kind: "symbol",
      pdf: { phone:"tel", email:"mail", location:"loc", linkedin:"in", portfolio:"web" }
    },
    tags: {
      kind: "tag",
      pdf: { phone:"tel", email:"mail", location:"loc", linkedin:"in", portfolio:"web" }
    }
  });

  let session = null;
  let state = null;
  let cvReady = false;
  let cvPollTimer = null;
  let cvOcrAutoStartAttempted = false;
  let cvOcrStartInFlight = false;
  let generateInFlight = false;
  let screenshotInFlight = false;
  let pdfInFlight = false;
  let currentCvText = "";
  let baseGeneratedText = "";
  let currentCvDoc = null;
  let currentLang = "en";
  let currentJobMeta = { title:"", company:"", applyUrl:"" };
  let keywordUniverse = [];
  let usedKeywords = [];
  let missingKeywords = [];
  let selectedKeywords = new Set();
  let jobInputSource = "paste";
  let jobInputCollapsed = false;
  let generateModalTimer = null;

  function $(id){ return document.getElementById(id); }

  function escapeHtml(value){
    if (S && typeof S.escapeHtml === "function") return S.escapeHtml(value);
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;" }[c] || c));
  }

  function setText(id, text){
    const el = $(id);
    if (el) el.textContent = String(text || "");
  }

  function setHtml(id, html){
    const el = $(id);
    if (el) el.innerHTML = html;
  }

  function setScreenshotExtractionState(stateName, message){
    const state = String(stateName || "").trim().toLowerCase();
    const box = $("shotExtractionBox");
    const progress = $("shotProgress");
    const browseBtn = $("browseScreenshotBtn");
    const input = $("jobShotFile");

    setText("shotStatusHint", message || (state === "loading" ? "Reading screenshot…" : "PNG, JPG, or WEBP work best."));

    if (box){
      box.classList.toggle("isLoading", state === "loading");
      box.classList.toggle("isReady", state === "ready");
      box.classList.toggle("isError", state === "error");
      box.setAttribute("aria-busy", state === "loading" ? "true" : "false");
    }
    if (progress) progress.style.display = state === "loading" ? "block" : "none";
    if (browseBtn){
      browseBtn.disabled = state === "loading";
      browseBtn.textContent = state === "loading" ? "Working…" : "Use screenshot";
    }
    if (input) input.disabled = state === "loading";
  }

  function setBadge(id, cls, text){
    if (S && typeof S.setBadge === "function"){
      S.setBadge(id, cls, text);
      return;
    }
    const el = $(id);
    if (!el) return;
    el.className = "badge" + (cls ? (" " + cls) : "");
    el.textContent = String(text || "");
  }

  function showTopError(message){
    if (S && typeof S.showTopError === "function"){
      S.showTopError("errorTop", message);
      return;
    }
    const el = $("errorTop");
    if (!el) return;
    if (!message){
      el.style.display = "none";
      el.textContent = "";
      return;
    }
    el.style.display = "block";
    el.textContent = String(message);
  }

  function clearTopError(){
    showTopError("");
  }

  async function fetchWithTimeout(url, options, timeoutMs){
    const ms = Number(timeoutMs) || FETCH_TIMEOUT_MS;
    if (typeof AbortController === "undefined"){
      return await fetch(url, options || {});
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => { try{ ctrl.abort("timeout"); }catch(_){} }, ms);
    try{
      return await fetch(url, { ...(options || {}), signal: ctrl.signal });
    }finally{
      clearTimeout(timer);
    }
  }

  async function getSessionFresh(forceRefresh){
    const fallbackSession = session || null;
    try{
      if (!auth || typeof auth.getSession !== "function"){
        return fallbackSession;
      }

      let nextSession = await auth.getSession();
      const expiresAt = Number(nextSession && nextSession.expires_at ? nextSession.expires_at : 0);
      const now = Math.floor(Date.now() / 1000);
      const needsRefresh = !!forceRefresh || (expiresAt && (expiresAt - now) <= TOKEN_REFRESH_SKEW_SEC);

      if (needsRefresh){
        const sb = auth.supabaseClient;
        if (sb && sb.auth && typeof sb.auth.refreshSession === "function"){
          const refreshed = await sb.auth.refreshSession();
          if (refreshed && refreshed.data && refreshed.data.session){
            nextSession = refreshed.data.session;
          }
        }
      }

      if (nextSession && nextSession.access_token){
        session = nextSession;
        try{ sessionStorage.setItem("sb_access_token", nextSession.access_token); }catch(_){}
        return nextSession;
      }
      session = null;
      return null;
    }catch(_){}
    return fallbackSession;
  }

  async function authFetch(path, options, timeoutMs){
    const s1 = await getSessionFresh(false);
    const token1 = String(s1 && s1.access_token ? s1.access_token : "").trim();
    if (!token1) throw new Error("Your session expired. Please sign in again.");

    const requestOptions = { ...(options || {}) };
    let headers = new Headers(requestOptions.headers || {});
    headers.set("Authorization", "Bearer " + token1);

    let res = await fetchWithTimeout(API_BASE + path, {
      ...requestOptions,
      headers
    }, timeoutMs);

    if (res.status === 401){
      const s2 = await getSessionFresh(true);
      const token2 = String(s2 && s2.access_token ? s2.access_token : "").trim();
      if (token2 && token2 !== token1){
        headers = new Headers(requestOptions.headers || {});
        headers.set("Authorization", "Bearer " + token2);
        res = await fetchWithTimeout(API_BASE + path, {
          ...requestOptions,
          headers
        }, timeoutMs);
      }
    }

    return res;
  }

  async function apiGet(path, timeoutMs){
    const res = await authFetch(path, {
      method: "GET"
    }, timeoutMs);
    const text = await res.text().catch(() => "");
    let json = null;
    try{ json = text ? JSON.parse(text) : null; }catch(_){ json = { raw:text }; }
    if (!res.ok){
      const detail = String(json?.error || json?.message || json?.details || text || "").trim();
      throw new Error(path + " failed: " + res.status + (detail ? (" — " + detail) : ""));
    }
    return json;
  }

  async function apiPostJson(path, body, timeoutMs){
    const res = await authFetch(path, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body || {})
    }, timeoutMs);
    const text = await res.text().catch(() => "");
    let json = null;
    try{ json = text ? JSON.parse(text) : null; }catch(_){ json = { raw:text }; }
    if (!res.ok){
      const detail = String(json?.error || json?.message || json?.details || text || "").trim();
      throw new Error(path + " failed: " + res.status + (detail ? (" — " + detail) : ""));
    }
    return json;
  }

  async function apiPostForm(path, formData, timeoutMs){
    const res = await authFetch(path, {
      method: "POST",
      body: formData
    }, timeoutMs);
    const text = await res.text().catch(() => "");
    let json = null;
    try{ json = text ? JSON.parse(text) : null; }catch(_){ json = { raw:text }; }
    if (!res.ok){
      const detail = String(json?.error || json?.message || json?.details || text || "").trim();
      throw new Error(path + " failed: " + res.status + (detail ? (" — " + detail) : ""));
    }
    return json;
  }

  function normalizeForMatch(value){
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\u0000/g, " ")
      .replace(/\s+/g, " ")
      .toLowerCase()
      .trim();
  }

  function slugify(value){
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80);
  }

  function showModalById(id){
    if (S && typeof S.showModal === "function"){
      S.showModal(id);
      return;
    }
    const modal = $(id);
    if (!modal) return;
    modal.style.display = "flex";
    try{ document.body.classList.add("modalOpen"); }catch(_){}
  }

  function hideModalById(id){
    if (S && typeof S.hideModal === "function"){
      S.hideModal(id);
      return;
    }
    const modal = $(id);
    if (!modal) return;
    modal.style.display = "none";
    try{ document.body.classList.remove("modalOpen"); }catch(_){}
  }

  function shortText(value, max = 220){
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text || text.length <= max) return text;
    return text.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
  }

  function blurActiveTextEntry(){
    const active = document.activeElement;
    if (!active || typeof active.blur !== "function") return;
    const tag = String(active.tagName || "").toLowerCase();
    if (tag !== "textarea" && tag !== "input") return;
    try{ active.blur(); }catch(_){}
  }

  function isActionButtonUsable(el){
    if (!el || typeof el.getBoundingClientRect !== "function") return false;
    if (el.disabled) return false;
    const style = window.getComputedStyle(el);
    if (!style || style.display === "none" || style.visibility === "hidden" || style.pointerEvents === "none") return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function touchPointWithinElement(point, el){
    if (!point || !el || typeof el.getBoundingClientRect !== "function") return false;
    const rect = el.getBoundingClientRect();
    return point.clientX >= rect.left && point.clientX <= rect.right && point.clientY >= rect.top && point.clientY <= rect.bottom;
  }

  function primaryTouchPoint(event){
    if (event && event.touches && event.touches[0]) return event.touches[0];
    if (event && event.changedTouches && event.changedTouches[0]) return event.changedTouches[0];
    if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) return event;
    return null;
  }

  function rescuePrimaryTapFromFocusedTextarea(event){
    const active = document.activeElement;
    if (!active || active !== $("jobDesc")) return;
    const target = event && event.target;
    if (target && target.closest && target.closest("#generateBtn, #regenerateBtn, #applyKeywordsBtn, #downloadPdfBtn")) return;
    const point = primaryTouchPoint(event);
    if (!point) return;
    const candidates = ["generateBtn", "regenerateBtn", "applyKeywordsBtn", "downloadPdfBtn"]
      .map((id) => $(id))
      .filter(isActionButtonUsable);
    const matched = candidates.find((el) => touchPointWithinElement(point, el));
    if (!matched) return;
    try{ event.preventDefault(); }catch(_){}
    try{ event.stopPropagation(); }catch(_){}
    blurActiveTextEntry();
    setTimeout(() => {
      try{ matched.click(); }catch(_){}
    }, 0);
  }

  function getJobInputSourceLabel(){
    if (jobInputSource === "screenshot") return "Screenshot upload";
    if (jobInputSource === "mixed") return "Screenshot + pasted edits";
    return "Pasted description";
  }

  function refreshJobSummaryCard(){
    const desc = String($("jobDesc")?.value || "").trim();
    const meta = readJobMeta();
    const summaryTitle = meta.title && meta.company
      ? (meta.title + " at " + meta.company)
      : (meta.title || meta.company || "Job description attached");
    const words = desc ? desc.split(/\s+/).filter(Boolean).length : 0;

    setText("jobSummaryHeading", summaryTitle);
    setText(
      "jobSummaryHint",
      currentCvText.trim()
        ? "This is the job post behind the current preview."
        : "This will be used for the next preview."
    );
    setBadge("jobSummaryBadge", currentCvText.trim() ? "good" : "warn", currentCvText.trim() ? "Preview ready" : "Draft");
    setText("jobSummarySource", getJobInputSourceLabel());
    setText("jobSummaryMeta", desc ? `${desc.length.toLocaleString()} characters${words ? ` · ${words.toLocaleString()} words` : ""}` : "0 characters");
    setText("jobSummaryText", desc ? shortText(desc, 280) : "No job description added yet.");
  }

  function setJobInputCollapsed(collapsed, opts){
    const shouldCollapse = !!collapsed && !!String($("jobDesc")?.value || "").trim();
    const jobInputCard = $("jobInputCard");
    const jobSummaryCard = $("jobSummaryCard");

    jobInputCollapsed = shouldCollapse;
    if (jobInputCard) jobInputCard.style.display = shouldCollapse ? "none" : "";
    if (jobSummaryCard) jobSummaryCard.style.display = shouldCollapse ? "" : "none";
    if (shouldCollapse) refreshJobSummaryCard();

    if (opts && opts.scroll){
      const target = shouldCollapse ? ($("previewCard") || jobSummaryCard) : jobInputCard;
      try{ target?.scrollIntoView({ behavior:"smooth", block:"start" }); }catch(_){}
    }
  }

  function setFlowStepState(id, state){
    const el = $(id);
    if (!el) return;
    const value = String(state || "").trim().toLowerCase();
    el.classList.toggle("isActive", value === "active");
    el.classList.toggle("isDone", value === "done");
    el.classList.toggle("isReady", value === "ready");
  }

  function renderFlowState(){
    const hasPreview = !!currentCvText.trim();
    if (!hasPreview){
      setFlowStepState("flowStepInput", "active");
      setFlowStepState("flowStepPreview", "");
      setFlowStepState("flowStepExport", "");
      setText("subLine", "Add the job post, build the preview, then export the PDF.");
      return;
    }

    setFlowStepState("flowStepInput", "done");
    if (missingKeywords.length){
      setFlowStepState("flowStepPreview", "active");
      setFlowStepState("flowStepExport", "ready");
      setText("subLine", "Preview ready. Pick the terms you want, then export.");
      return;
    }

    setFlowStepState("flowStepPreview", "done");
    setFlowStepState("flowStepExport", "active");
    setText("subLine", "Preview ready. Export the PDF when you are happy.");
  }

  function clearGenerateModalTimer(){
    if (!generateModalTimer) return;
    clearInterval(generateModalTimer);
    generateModalTimer = null;
  }

  function setGenerateBusyState(isBusy){
    const busy = !!isBusy;
    const descLen = String($("jobDesc")?.value || "").trim().length;
    const canGenerate = cvReady && !screenshotInFlight && descLen >= 80;
    const generateBtn = $("generateBtn");
    const regenerateBtn = $("regenerateBtn");
    const downloadBtn = $("downloadPdfBtn");
    const previewCard = $("previewCard");

    if (generateBtn){
      generateBtn.disabled = busy || !canGenerate;
      generateBtn.textContent = busy ? "Building…" : "Build preview";
    }
    if (regenerateBtn){
      regenerateBtn.disabled = busy || !canGenerate;
      regenerateBtn.textContent = busy ? "Rebuilding…" : "Rebuild preview";
    }
    if (downloadBtn){
      downloadBtn.disabled = busy || pdfInFlight || !currentCvText.trim();
    }
    if (previewCard){
      previewCard.setAttribute("aria-busy", busy ? "true" : "false");
    }
  }

  function setGenerateModalSteps(activeIndex, doneCount){
    const steps = Array.from(document.querySelectorAll("#generateSteps [data-step]"));
    steps.forEach((step, index) => {
      step.classList.toggle("isDone", index < doneCount);
      step.classList.toggle("isActive", index === activeIndex && index >= doneCount);
    });

    const hints = [
      "Starting from the CV already saved on your account.",
      "Matching your experience against the job requirements now.",
      "Building the tailored preview and ATS keyword coverage."
    ];
    const hint = doneCount >= 3
      ? "Your preview is ready below. Review it, choose keywords, and export when you are happy."
      : (hints[Math.max(0, Math.min(activeIndex, hints.length - 1))] || hints[0]);
    setText("generateModalHint", hint);
  }

  function openGenerateModal(){
    clearGenerateModalTimer();
    setText("generateModalTitle", "Generating your preview");
    setText("generateModalSubtitle", "We are matching your CV to the job post and building the draft.");
    setGenerateModalSteps(0, 0);
    $("generateSpinner")?.classList.remove("isDone");
    $("generateModal")?.setAttribute("aria-busy", "true");
    showModalById("generateModal");

    let activeIndex = 0;
    generateModalTimer = setInterval(() => {
      activeIndex = Math.min(2, activeIndex + 1);
      setGenerateModalSteps(activeIndex, activeIndex);
    }, 1150);
  }

  function markGenerateModalDone(){
    clearGenerateModalTimer();
    $("generateSpinner")?.classList.add("isDone");
    $("generateModal")?.setAttribute("aria-busy", "false");
    setText("generateModalTitle", "Preview ready");
    setText("generateModalSubtitle", "Your tailored CV is ready to review and export.");
    setGenerateModalSteps(2, 3);
  }

  function closeGenerateModal(){
    clearGenerateModalTimer();
    $("generateModal")?.setAttribute("aria-busy", "false");
    hideModalById("generateModal");
  }

  function storedCvSupportsPdf(cv){
    const mime = String(cv?.cv_mime || "").trim().toLowerCase();
    const fileLabel = String(cv?.cv_filename || cv?.cv_path || "").trim().toLowerCase();
    return mime === "application/pdf" || fileLabel.endsWith(".pdf");
  }

  function storedCvHasOcrText(cv){
    if (!cv || typeof cv !== "object") return false;
    if (cv.cv_has_ocr_text === true || cv.cv_has_ocr_text === 1) return true;
    if (String(cv.cv_has_ocr_text || "").trim().toLowerCase() === "true") return true;
    const chars = Number(cv.cv_ocr_text_chars || 0);
    return Number.isFinite(chars) && chars > 40;
  }

  function deepCopy(value){
    if (value == null) return value;
    try{
      return JSON.parse(JSON.stringify(value));
    }catch(_){
      return value;
    }
  }

  function joinNonEmpty(arr, sep){
    return (arr || []).map((value) => String(value || "").trim()).filter(Boolean).join(sep);
  }

  function asStringArr(arr, max = 999){
    if (!Array.isArray(arr)) return [];
    return arr.map((value) => String(value || "").trim()).filter(Boolean).slice(0, max);
  }

  function isLikelyGerman(lang){
    return String(lang || "").trim().toLowerCase().startsWith("de");
  }

  function normalizeContactStyle(raw){
    const key = String(raw || "").trim().toLowerCase();
    return CONTACT_STYLE_THEMES[key] ? key : "plain";
  }

  function normalizeCvFontTheme(raw){
    return String(raw || "").trim().toLowerCase() === "sans" ? "sans" : "serif";
  }

  function buildCustomSectionKey(id){
    const clean = String(id || "").trim();
    return clean ? ("custom:" + clean) : "";
  }

  function normalizeCustomSection(section, index = 0){
    const raw = (section && typeof section === "object") ? section : {};
    const id = String(raw.id || ("section_" + (index + 1))).trim() || ("section_" + (index + 1));
    const title = String(raw.title || "").trim();
    const styleRaw = String(raw.style || "").trim().toLowerCase();
    const style = styleRaw === "bullets" ? "bullets" : "paragraph";
    const items = (Array.isArray(raw.items) ? raw.items : [])
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    return { id, title, style, items };
  }

  function ensureDocCustomSections(doc){
    if (!doc || typeof doc !== "object") return [];
    const raw = Array.isArray(doc.custom_sections) ? doc.custom_sections : [];
    doc.custom_sections = raw.map((section, index) => normalizeCustomSection(section, index));
    return doc.custom_sections;
  }

  function ensureDocHeader(doc){
    if (!doc || typeof doc !== "object") return { show_role:true, contact_style:"plain" };
    doc.contact = (doc.contact && typeof doc.contact === "object") ? doc.contact : {};
    const fallbacks = {
      phone: doc.phone,
      email: doc.email,
      location: doc.location,
      linkedin: doc.linkedin,
      portfolio: doc.portfolio || doc.website || doc.url
    };
    ["phone", "email", "location", "linkedin", "portfolio"].forEach((field) => {
      const raw = doc.contact[field] != null && String(doc.contact[field]).trim()
        ? doc.contact[field]
        : fallbacks[field];
      doc.contact[field] = String(raw || "").trim();
    });
    doc.header = (doc.header && typeof doc.header === "object") ? doc.header : {};
    doc.header.show_role = doc.header.show_role !== false;
    doc.header.contact_style = normalizeContactStyle(doc.header.contact_style);
    return doc.header;
  }

  function getHeaderRole(doc, fallback = ""){
    const header = ensureDocHeader(doc);
    if (header.show_role === false) return "";
    return String(doc?.target_role || fallback || "").trim();
  }

  function getContactTheme(style){
    return CONTACT_STYLE_THEMES[normalizeContactStyle(style)] || CONTACT_STYLE_THEMES.plain;
  }

  function formatHeaderContactLine(entries, doc, mode = "plain"){
    const contactStyle = ensureDocHeader(doc).contact_style;
    if (mode === "plain"){
      return entries.map(([, value]) => String(value || "").trim()).filter(Boolean).join(" · ");
    }
    const theme = getContactTheme(contactStyle);
    return entries.map(([field, value]) => {
      const text = String(value || "").trim();
      if (!text) return "";
      const label = String(theme.pdf?.[field] || "").trim();
      return label ? (label + " " + text) : text;
    }).filter(Boolean).join(" · ");
  }

  function cvLabels(lang){
    return isLikelyGerman(lang) ? {
      summary: "Profil",
      experience: "Berufserfahrung",
      education: "Ausbildung",
      achievements: "Erfolge",
      skills: "Kompetenzen",
      courses: "Kurse",
      interests: "Interessen",
      languages: "Sprachen"
    } : {
      summary: "Profile",
      experience: "Work experience",
      education: "Education",
      achievements: "Key achievements",
      skills: "Skills",
      courses: "Courses",
      interests: "Interests",
      languages: "Languages"
    };
  }

  function hasExperienceEntryContent(entry){
    if (!entry || typeof entry !== "object") return false;
    return !!(
      String(entry.title || "").trim() ||
      String(entry.company || "").trim() ||
      String(entry.location || "").trim() ||
      String(entry.start || "").trim() ||
      String(entry.end || "").trim() ||
      asStringArr(entry.bullets, 20).length
    );
  }

  function hasEducationEntryContent(entry){
    if (!entry || typeof entry !== "object") return false;
    return !!(
      String(entry.degree || "").trim() ||
      String(entry.field || "").trim() ||
      String(entry.school || "").trim() ||
      String(entry.location || "").trim() ||
      String(entry.start || "").trim() ||
      String(entry.end || "").trim() ||
      asStringArr(entry.bullets, 20).length
    );
  }

  function getCvSectionEntries(doc, lang){
    const labels = cvLabels(lang);
    const summary = asStringArr(doc?.summary, 8);
    const experience = (Array.isArray(doc?.experience) ? doc.experience : []).filter(hasExperienceEntryContent);
    const education = (Array.isArray(doc?.education) ? doc.education : []).filter(hasEducationEntryContent);
    const achievements = asStringArr(doc?.key_achievements, 10);
    const skills = doc?.skills || {};
    const skillGroups = Array.isArray(skills?.groups) ? skills.groups : [];
    const additionalSkills = Array.isArray(skills?.additional)
      ? asStringArr(skills.additional, 24)
      : String(skills?.additional || "").trim()
        ? [String(skills.additional).trim()]
        : [];
    const courses = asStringArr(doc?.courses, 12);
    const interests = asStringArr(doc?.interests, 12);
    const languages = asStringArr(doc?.languages, 12);

    const skillLines = [];
    skillGroups.forEach((group) => {
      const label = String(group?.label || "").trim();
      const items = asStringArr(group?.items, 30);
      if (!items.length) return;
      skillLines.push(label ? (label + ": " + items.join(", ")) : items.join(", "));
    });
    if (additionalSkills.length) skillLines.push(additionalSkills.join(", "));

    const customSections = ensureDocCustomSections(doc).map((section) => ({
      key: buildCustomSectionKey(section.id),
      title: String(section.title || "").trim() || "Custom section",
      kind: section.style === "bullets" ? "bullets" : "paragraph",
      hasContent: Array.isArray(section.items) && section.items.length > 0,
      paragraphs: section.style === "bullets" ? [] : section.items,
      items: section.style === "bullets" ? section.items : []
    }));

    return [
      {
        key: "summary",
        title: labels.summary,
        kind: "paragraph",
        hasContent: summary.length > 0,
        paragraphs: summary.length ? [summary.join(" ")] : []
      },
      {
        key: "experience",
        title: labels.experience,
        kind: "experience",
        hasContent: experience.length > 0,
        items: experience
      },
      {
        key: "education",
        title: labels.education,
        kind: "education",
        hasContent: education.length > 0,
        items: education
      },
      {
        key: "achievements",
        title: labels.achievements,
        kind: "bullets",
        hasContent: achievements.length > 0,
        items: achievements
      },
      {
        key: "skills",
        title: labels.skills,
        kind: "lines",
        hasContent: skillLines.length > 0,
        items: skillLines
      },
      {
        key: "courses",
        title: labels.courses,
        kind: "paragraph",
        hasContent: courses.length > 0,
        paragraphs: courses.length ? [courses.join(" · ")] : []
      },
      {
        key: "interests",
        title: labels.interests,
        kind: "paragraph",
        hasContent: interests.length > 0,
        paragraphs: interests.length ? [interests.join(" · ")] : []
      },
      {
        key: "languages",
        title: labels.languages,
        kind: "paragraph",
        hasContent: languages.length > 0,
        paragraphs: languages.length ? [languages.join(" · ")] : []
      },
      ...customSections
    ];
  }

  function getOrderedCvSections(doc, lang){
    return getCvSectionEntries(doc || {}, lang || currentLang)
      .filter((section) => section && section.hasContent);
  }

  function cvDocToPlainText(doc, lang){
    const lines = [];
    ensureDocHeader(doc);
    const name = String(doc?.name || "").trim();
    const role = getHeaderRole(doc);
    const contact = doc?.contact || {};
    const contactLine = formatHeaderContactLine([
      ["phone", contact.phone],
      ["email", contact.email],
      ["linkedin", contact.linkedin],
      ["portfolio", contact.portfolio],
      ["location", contact.location]
    ], doc, "plain");

    if (name) lines.push(name);
    if (role) lines.push(role);
    if (contactLine) lines.push(contactLine);
    if (lines.length) lines.push("");

    getOrderedCvSections(doc, lang).forEach((section) => {
      lines.push(String(section.title || "").toUpperCase());
      if (section.kind === "paragraph"){
        (section.paragraphs || []).forEach((paragraph) => lines.push(paragraph));
      }else if (section.kind === "experience"){
        (section.items || []).forEach((entry) => {
          const title = String(entry?.title || "").trim();
          const sub = joinNonEmpty([entry?.company, entry?.location], ", ");
          const meta = joinNonEmpty([entry?.start, entry?.end], " – ");
          if (title) lines.push(title);
          if (sub) lines.push(sub);
          if (meta) lines.push(meta);
          asStringArr(entry?.bullets, 12).forEach((bullet) => lines.push("- " + bullet));
          lines.push("");
        });
      }else if (section.kind === "education"){
        (section.items || []).forEach((entry) => {
          const title = joinNonEmpty([entry?.degree, entry?.field], " · ");
          const sub = joinNonEmpty([entry?.school, entry?.location], ", ");
          const meta = joinNonEmpty([entry?.start, entry?.end], " – ");
          if (title) lines.push(title);
          if (sub) lines.push(sub);
          if (meta) lines.push(meta);
          asStringArr(entry?.bullets, 8).forEach((bullet) => lines.push("- " + bullet));
          lines.push("");
        });
      }else if (section.kind === "bullets"){
        (section.items || []).forEach((entry) => lines.push("- " + entry));
      }else if (section.kind === "lines"){
        (section.items || []).forEach((entry) => lines.push(entry));
      }
      lines.push("");
    });

    return lines.join("\n").trim() + "\n";
  }

  function ensureDocSkills(doc){
    if (!doc || typeof doc !== "object") return { groups:[], additional:[] };
    doc.skills = (doc.skills && typeof doc.skills === "object") ? doc.skills : {};
    doc.skills.groups = Array.isArray(doc.skills.groups)
      ? doc.skills.groups.map((group) => ({
          label: String(group?.label || "").trim(),
          items: asStringArr(group?.items, 50)
        }))
      : [];
    if (Array.isArray(doc.skills.additional)){
      doc.skills.additional = asStringArr(doc.skills.additional, 120);
    }else{
      const text = String(doc.skills.additional || "").trim();
      doc.skills.additional = text ? [text] : [];
    }
    return doc.skills;
  }

  function appendKeywordsToCvDoc(doc, keywords){
    const copy = deepCopy(doc);
    if (!copy || typeof copy !== "object") return null;
    const additions = (Array.isArray(keywords) ? keywords : [])
      .map((keyword) => String(keyword || "").trim())
      .filter(Boolean);
    if (!additions.length) return copy;

    const normalizedDocText = normalizeForMatch(cvDocToPlainText(copy, currentLang || "en"));
    const filtered = additions.filter((keyword) => !normalizedDocText.includes(normalizeForMatch(keyword)));
    if (!filtered.length) return copy;

    const skills = ensureDocSkills(copy);
    const existing = [];
    (skills.groups || []).forEach((group) => {
      asStringArr(group?.items, 80).forEach((item) => existing.push(item));
    });
    asStringArr(skills.additional, 120).forEach((item) => existing.push(item));

    const seen = new Set(existing.map((item) => normalizeForMatch(item)));
    filtered.forEach((keyword) => {
      const normalized = normalizeForMatch(keyword);
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      skills.additional.push(keyword);
    });
    return copy;
  }

  function normText(value){
    return String(value || "")
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .trim();
  }

  function detectManualTextEdits(){
    if (!currentCvDoc) return false;
    const docText = cvDocToPlainText(currentCvDoc, currentLang);
    return normText(docText) !== normText(currentCvText);
  }

  function stopCvPolling(){
    if (cvPollTimer){
      clearInterval(cvPollTimer);
      cvPollTimer = null;
    }
  }

  function looksLikeSectionHeading(line){
    const text = String(line || "").trim();
    if (!text || text.length > 42) return false;
    return /^[A-Z][A-Z0-9 &/()+.,-]{2,}$/.test(text);
  }

  function mergeCommaLine(existingLine, additions){
    const parts = String(existingLine || "").split(",").map((item) => String(item || "").trim()).filter(Boolean);
    const seen = new Set(parts.map((item) => normalizeForMatch(item)));
    additions.forEach((kw) => {
      const norm = normalizeForMatch(kw);
      if (!norm || seen.has(norm)) return;
      seen.add(norm);
      parts.push(String(kw));
    });
    return parts.join(", ");
  }

  function insertKeywordsIntoText(text, keywords){
    const base = String(text || "").replace(/\r\n/g, "\n");
    const additions = (Array.isArray(keywords) ? keywords : []).map((kw) => String(kw || "").trim()).filter(Boolean);
    if (!additions.length) return base;

    const normalizedText = normalizeForMatch(base);
    const filtered = additions.filter((kw) => !normalizedText.includes(normalizeForMatch(kw)));
    if (!filtered.length) return base;

    const lines = base.split("\n");
    const skillHeadingIdx = lines.findIndex((line) => /^(skills|core skills|technical skills|technologies|tools)$/i.test(String(line || "").trim()));

    if (skillHeadingIdx >= 0){
      let insertAt = skillHeadingIdx + 1;
      while (insertAt < lines.length && !String(lines[insertAt] || "").trim()){
        insertAt += 1;
      }

      const candidate = String(lines[insertAt] || "").trim();
      if (candidate && !looksLikeSectionHeading(candidate) && !/^[\-\u2022]/.test(candidate) && candidate.length < 180){
        lines[insertAt] = mergeCommaLine(candidate, filtered);
      }else{
        lines.splice(insertAt, 0, "Additional: " + filtered.join(", "));
      }
      return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
    }

    const trimmed = base.trim();
    const block = "SKILLS\n" + filtered.join(", ");
    return (trimmed ? (trimmed + "\n\n" + block) : block).trim() + "\n";
  }

  function recomputeCoverage(){
    const text = normalizeForMatch(currentCvText);
    const nextUsed = [];
    const nextMissing = [];

    keywordUniverse.forEach((kw) => {
      const raw = String(kw || "").trim();
      if (!raw) return;
      if (text.includes(normalizeForMatch(raw))) nextUsed.push(raw);
      else nextMissing.push(raw);
    });

    usedKeywords = nextUsed;
    missingKeywords = nextMissing;
    selectedKeywords.forEach((kw) => {
      if (!missingKeywords.some((item) => normalizeForMatch(item) === normalizeForMatch(kw))){
        selectedKeywords.delete(kw);
      }
    });
  }

  function renderPreview(){
    const previewCard = $("previewCard");
    const downloadBar = $("downloadBar");
    if (!currentCvText.trim()){
      if (previewCard) previewCard.style.display = "none";
      if (downloadBar) downloadBar.style.display = "none";
      setJobInputCollapsed(false, { scroll:false });
      renderFlowState();
      return;
    }

    if (previewCard) previewCard.style.display = "";
    if (downloadBar) downloadBar.style.display = "";
    if (jobInputCollapsed) refreshJobSummaryCard();

    const manual = detectManualTextEdits();
    setText("previewText", currentCvText.trim());
    setBadge("previewBadge", manual ? "warn" : "good", manual ? "Edited" : "Ready");
    if (manual){
      setText("previewHint", "Edited text will export with the simpler PDF layout.");
      renderFlowState();
      return;
    }
    setText("previewHint", missingKeywords.length
      ? "Review the draft, then close the gaps below."
      : "Preview looks ready to export.");
    renderFlowState();
  }

  function renderKeywordChips(targetId, items, kind){
    const wrap = $(targetId);
    if (!wrap) return;
    wrap.innerHTML = "";
    const list = Array.isArray(items) ? items : [];
    if (!list.length){
      wrap.innerHTML = `<div class="small">${kind === "missing" ? "No missing keywords left." : "Nothing covered yet."}</div>`;
      return;
    }

    list.forEach((kw) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = kind === "missing" ? "keywordChip isMissing" : "keywordChip used";
      btn.innerHTML = kind === "missing"
        ? `<span class="mark" aria-hidden="true">+</span><span>${escapeHtml(kw)}</span>`
        : `<span class="mark" aria-hidden="true">✓</span><span>${escapeHtml(kw)}</span>`;
      if (kind === "missing"){
        btn.classList.toggle("selected", selectedKeywords.has(kw));
        btn.addEventListener("click", () => {
          if (selectedKeywords.has(kw)) selectedKeywords.delete(kw);
          else selectedKeywords.add(kw);
          renderKeywords();
        });
      }else{
        btn.disabled = true;
      }
      wrap.appendChild(btn);
    });
  }

  function renderKeywords(){
    const keywordsCard = $("keywordsCard");
    if (!currentCvText.trim()){
      if (keywordsCard) keywordsCard.style.display = "none";
      renderFlowState();
      return;
    }
    if (keywordsCard) keywordsCard.style.display = "";

    setText("keywordSummary", missingKeywords.length
      ? (missingKeywords.length === 1 ? "1 term left to review." : `${missingKeywords.length} terms left to review.`)
      : "All current ATS terms are covered.");
    setBadge("usedBadge", "good", "Covered: " + usedKeywords.length);
    setBadge("missingBadge", missingKeywords.length ? "warn" : "good", "Missing: " + missingKeywords.length);
    setBadge("atsBadge", missingKeywords.length ? "warn" : "good", missingKeywords.length ? "Review" : "Ready");
    renderKeywordChips("missingKeywordChips", missingKeywords, "missing");
    renderKeywordChips("usedKeywordChips", usedKeywords, "used");
    renderFlowState();

    const applyBtn = $("applyKeywordsBtn");
    const clearBtn = $("clearKeywordsBtn");
    if (applyBtn) applyBtn.disabled = selectedKeywords.size === 0;
    if (clearBtn) clearBtn.disabled = selectedKeywords.size === 0;
  }

  function syncEditorFromCurrent(){
    const el = $("editorText");
    if (el) el.value = currentCvText;
  }

  function updateGenerateButton(){
    setGenerateBusyState(generateInFlight);
  }

  async function pollCvReadyTick(){
    try{
      if (cvReady) return;
      try{ await apiGet("/me/cv/ocr/status", OCR_STATUS_TIMEOUT_MS); }catch(_){}
      await refreshCvReadyState({ suppressPolling:true });
    }catch(_){}
  }

  function ensureCvPolling(){
    if (cvPollTimer) return;
    cvPollTimer = setInterval(() => { void pollCvReadyTick(); }, CV_POLL_MS);
  }

  async function startExistingCvOcr(){
    if (cvOcrStartInFlight) return;
    cvOcrStartInFlight = true;
    cvOcrAutoStartAttempted = true;
    try{
      await apiPostJson("/me/cv/ocr", {}, OCR_STATUS_TIMEOUT_MS);
      setBadge("cvReadyBadge", "warn", "Preparing CV…");
      setText("cvReadyHint", "Starting OCR for your uploaded PDF. You can enter the job description now.");
      ensureCvPolling();
    }catch(err){
      showTopError(err?.message || String(err));
      setBadge("cvReadyBadge", "bad", "OCR needed");
      setText("cvReadyHint", "We could not start OCR for your uploaded CV. Please go back and upload a PDF again.");
    }finally{
      cvOcrStartInFlight = false;
      updateGenerateButton();
    }
  }

  async function refreshCvReadyState(opts){
    const suppressPolling = !!(opts && opts.suppressPolling);
    const res = await apiGet("/me/cv", OCR_STATUS_TIMEOUT_MS);
    const cv = res && res.cv ? res.cv : null;

    if (!cv || !cv.cv_path){
      stopCvPolling();
      window.location.replace("./cv-mobile-upload.html");
      return;
    }

    const fileLabel = String(cv.cv_filename || cv.cv_path || "").trim();
    const isPdf = storedCvSupportsPdf(cv);
    const hasOcrText = storedCvHasOcrText(cv);
    const ocrStatus = String(cv.cv_ocr_status || "").trim().toLowerCase();

    if (hasOcrText || (ocrStatus === "done" && isPdf)){
      cvReady = true;
      stopCvPolling();
      setBadge("cvReadyBadge", "good", "CV ready");
      setText("cvReadyHint", hasOcrText && ocrStatus !== "done"
        ? "Base CV text is already available. Paste the job post or use a screenshot, then generate the preview."
        : "Base CV ready. Paste the job post or use a screenshot, then generate the preview.");
      updateGenerateButton();
      return;
    }

    cvReady = false;
    if (ocrStatus === "processing"){
      setBadge("cvReadyBadge", "warn", "Preparing CV…");
      setText("cvReadyHint", "Your CV is still being prepared. You can enter the job description now, and generate as soon as OCR finishes.");
      if (!suppressPolling) ensureCvPolling();
      updateGenerateButton();
      return;
    }

    if (ocrStatus === "failed"){
      stopCvPolling();
      setBadge("cvReadyBadge", "bad", "OCR failed");
      setText("cvReadyHint", "OCR failed for your uploaded PDF. Go back one step and retry OCR before generating.");
      updateGenerateButton();
      return;
    }

    if (!isPdf){
      stopCvPolling();
      setBadge("cvReadyBadge", "bad", "PDF needed");
      setText("cvReadyHint", "Your uploaded CV is not a PDF. Upload a PDF on the previous step to continue on mobile.");
      updateGenerateButton();
      return;
    }

    if (!cvOcrAutoStartAttempted && !suppressPolling){
      setBadge("cvReadyBadge", "warn", "Preparing CV…");
      setText("cvReadyHint", "We found your uploaded PDF and are starting OCR now.");
      updateGenerateButton();
      void startExistingCvOcr();
      return;
    }

    setBadge("cvReadyBadge", "warn", "Preparing CV…");
    setText("cvReadyHint", "We need OCR text from your PDF before we can tailor on mobile.");
    if (!suppressPolling) ensureCvPolling();
    updateGenerateButton();
  }

  function readJobMeta(){
    currentJobMeta = {
      title: String($("jobTitle")?.value || "").trim(),
      company: String($("jobCompany")?.value || "").trim(),
      applyUrl: String($("jobApplyUrl")?.value || "").trim()
    };
    return currentJobMeta;
  }

  async function extractScreenshotToTextarea(file){
    screenshotInFlight = true;
    updateGenerateButton();
    setText("shotFileHint", file ? ("Selected: " + String(file.name || "Screenshot")) : "No screenshot selected yet.");
    setScreenshotExtractionState("loading", "Extracting text from screenshot…");

    try{
      const formData = new FormData();
      formData.append("image", file);
      formData.append("language_hint", "auto");

      let res = null;
      let lastErr = null;
      for (const endpoint of JOB_IMAGE_OCR_ENDPOINTS){
        try{
          res = await apiPostForm(endpoint, formData, LONG_TIMEOUT_MS);
          break;
        }catch(err){
          lastErr = err;
          if (!/failed:\s*404\b/.test(String(err?.message || ""))) throw err;
        }
      }
      if (!res){
        throw lastErr || new Error("Screenshot OCR is not available yet.");
      }

      const extracted = String(res.text || "").trim();
      if (!extracted){
        throw new Error("We could not extract text from that screenshot.");
      }

      const textarea = $("jobDesc");
      const current = String(textarea?.value || "").trim();
      if (textarea){
        textarea.value = current ? (current + "\n\n" + extracted).trim() : extracted;
      }
      jobInputSource = current ? "mixed" : "screenshot";
      setScreenshotExtractionState("ready", "Text extracted. Review it below.");
      setText("jobDescHint", "Screenshot text inserted. Clean it up if needed.");
      if (jobInputCollapsed) refreshJobSummaryCard();
      updateGenerateButton();
      setTimeout(() => {
        try{ $("generateBtn")?.scrollIntoView({ behavior:"smooth", block:"center" }); }catch(_){}
      }, 60);
    }finally{
      screenshotInFlight = false;
      updateGenerateButton();
    }
  }

  function keywordUniverseFrom(result){
    const used = Array.isArray(result?.ats_keywords_used) ? result.ats_keywords_used : [];
    const missing = Array.isArray(result?.ats_keywords_missing) ? result.ats_keywords_missing : [];
    return Array.from(new Set([...(used || []), ...(missing || [])].map((kw) => String(kw || "").trim()).filter(Boolean)));
  }

  async function generatePreview(){
    clearTopError();
    if (!cvReady){
      showTopError("Your base CV is not ready yet. Wait for OCR to finish first.");
      return;
    }

    const desc = String($("jobDesc")?.value || "").trim();
    if (desc.length < 80){
      showTopError("Please use a longer job description before generating the preview.");
      return;
    }

    generateInFlight = true;
    updateGenerateButton();
    setBadge("previewBadge", "warn", "Generating…");
    setText("previewHint", "Building the draft and ATS coverage…");
    openGenerateModal();

    try{
      const meta = readJobMeta();
      const payload = {
        template: "professional",
        strength: "balanced",
        job_title: meta.title,
        company_name: meta.company,
        apply_url: meta.applyUrl,
        language_hint: "auto",
        job_description: desc
      };

      let res = null;
      let lastErr = null;
      for (const endpoint of TAILOR_ENDPOINTS){
        try{
          res = await apiPostJson(endpoint, payload, LONG_TIMEOUT_MS);
          break;
        }catch(err){
          lastErr = err;
          if (!/failed:\s*404\b/.test(String(err?.message || "")) && !/failed:\s*405\b/.test(String(err?.message || ""))){
            throw err;
          }
        }
      }
      if (!res){
        throw lastErr || new Error("Tailoring from pasted job descriptions is not available yet.");
      }
      if (res.ok !== true){
        throw new Error(res.error || "Could not generate the tailored CV preview.");
      }

      const result = res.result || {};
      currentLang = String(result.language || payload.language_hint || "en").trim() || "en";
      currentCvDoc = result.cv_doc ? deepCopy(result.cv_doc) : null;
      if (currentCvDoc) ensureDocHeader(currentCvDoc);

      currentCvText = currentCvDoc
        ? cvDocToPlainText(currentCvDoc, currentLang).trim()
        : String(result.cv_text || "").trim();
      if (!currentCvText){
        throw new Error("The tailored CV response did not include preview text.");
      }

      baseGeneratedText = currentCvText;
      readJobMeta();
      keywordUniverse = keywordUniverseFrom(result);
      selectedKeywords = new Set();
      recomputeCoverage();

      renderPreview();
      renderKeywords();
      syncEditorFromCurrent();
      setJobInputCollapsed(true, { scroll:false });
      markGenerateModalDone();
      setTimeout(() => {
        closeGenerateModal();
        try{ $("previewCard")?.scrollIntoView({ behavior:"smooth", block:"start" }); }catch(_){}
      }, 420);
    }catch(err){
      closeGenerateModal();
      setBadge("previewBadge", "bad", "Failed");
      showTopError(err?.message || String(err));
    }finally{
      generateInFlight = false;
      updateGenerateButton();
    }
  }

  function applySelectedKeywords(){
    clearTopError();
    if (!selectedKeywords.size) return;
    const additions = [...selectedKeywords];
    let nextText = "";
    if (currentCvDoc && !detectManualTextEdits()){
      const nextDoc = appendKeywordsToCvDoc(currentCvDoc, additions);
      if (nextDoc){
        currentCvDoc = nextDoc;
        ensureDocHeader(currentCvDoc);
        nextText = cvDocToPlainText(currentCvDoc, currentLang).trim();
      }
    }
    if (!nextText){
      nextText = insertKeywordsIntoText(currentCvText, additions);
    }
    if (nextText === currentCvText){
      showTopError("Those selected keywords already look covered in the current draft.");
      selectedKeywords.clear();
      renderKeywords();
      return;
    }
    currentCvText = nextText;
    recomputeCoverage();
    selectedKeywords.clear();
    renderPreview();
    renderKeywords();
    syncEditorFromCurrent();
  }

  function toggleEditor(show){
    const box = $("editorBox");
    if (!box) return;
    box.style.display = show ? "block" : "none";
    if (show) syncEditorFromCurrent();
  }

  function saveEditorChanges(){
    const textarea = $("editorText");
    if (!textarea) return;
    currentCvText = String(textarea.value || "").trim();
    recomputeCoverage();
    renderPreview();
    renderKeywords();
    toggleEditor(false);
  }

  function normalizePdfText(text){
    return String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\u00a0/g, " ")
      .replace(/[\u2018\u2019\u201a\u201b]/g, "'")
      .replace(/[\u201c\u201d\u201e]/g, "\"")
      .replace(/[\u2013\u2014\u2212]/g, "-")
      .replace(/\u2026/g, "...")
      .replace(/[\u2022\u25cf\u25e6]/g, "-");
  }

  function canPdfEncode(font, text){
    try{
      font.encodeText(String(text || ""));
      return true;
    }catch(_){
      return false;
    }
  }

  function sanitizePdfTextForFont(font, text){
    let out = normalizePdfText(text);
    if (canPdfEncode(font, out)) return out;
    try{
      out = out.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    }catch(_){}
    if (canPdfEncode(font, out)) return out;
    out = out.replace(/[^\x20-\x7e\xa0-\xff\n]/g, "");
    if (canPdfEncode(font, out)) return out;
    return out.split("").map((ch) => canPdfEncode(font, ch) ? ch : "?").join("");
  }

  function splitPdfLongToken(font, size, token, maxWidth){
    const clean = sanitizePdfTextForFont(font, token);
    if (!clean) return [""];
    const parts = [];
    let chunk = "";
    for (const ch of clean){
      const next = chunk + ch;
      if (chunk && font.widthOfTextAtSize(next, size) > maxWidth){
        parts.push(chunk);
        chunk = ch;
      }else{
        chunk = next;
      }
    }
    if (chunk) parts.push(chunk);
    return parts.length ? parts : [clean];
  }

  function wrapPdfText(font, size, text, maxWidth){
    const clean = sanitizePdfTextForFont(font, text);
    const paragraphs = clean.split("\n");
    const lines = [];

    paragraphs.forEach((para, index) => {
      const trimmed = para.trim();
      if (!trimmed){
        if (index < paragraphs.length - 1) lines.push("");
        return;
      }

      const words = trimmed.split(/\s+/);
      let line = "";
      const flush = () => {
        if (line){
          lines.push(line);
          line = "";
        }
      };

      words.forEach((word) => {
        if (!word) return;
        if (font.widthOfTextAtSize(word, size) > maxWidth){
          flush();
          splitPdfLongToken(font, size, word, maxWidth).forEach((part) => {
            if (part) lines.push(part);
          });
          return;
        }
        const candidate = line ? (line + " " + word) : word;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth){
          line = candidate;
        }else{
          flush();
          line = word;
        }
      });

      flush();
      if (index < paragraphs.length - 1) lines.push("");
    });

    return lines.length ? lines : [""];
  }

  function measurePdfTextBlock(font, size, text, maxWidth, lineHeight){
    const resolvedLineHeight = Number(lineHeight || (size * 1.35));
    const lines = wrapPdfText(font, size, text, maxWidth);
    return {
      lines,
      lineHeight: resolvedLineHeight,
      height: Math.max(resolvedLineHeight, lines.length * resolvedLineHeight)
    };
  }

  function drawPdfTextLinesAt(page, lines, opts){
    const font = opts.font;
    const size = Number(opts.size || 10);
    const x = Number(opts.x || 0);
    const topY = Number(opts.topY || 0);
    const lineHeight = Number(opts.lineHeight || (size * 1.35));
    const maxWidth = Number(opts.maxWidth || 0);
    const align = String(opts.align || "left");
    const color = opts.color;

    lines.forEach((line, index) => {
      if (!line) return;
      const textWidth = font.widthOfTextAtSize(line, size);
      const drawX = (align === "right" && maxWidth)
        ? (x + Math.max(0, maxWidth - textWidth))
        : x;
      page.drawText(line, {
        x: drawX,
        y: topY - size - (index * lineHeight),
        size,
        font,
        color
      });
    });
  }

  function createPdfComposer(pdfDoc){
    const composer = {
      pageWidth: 595.28,
      pageHeight: 841.89,
      margins: { top:42, right:42, bottom:42, left:42 },
      page: null,
      y: 0,
      addPage(){
        this.page = pdfDoc.addPage([this.pageWidth, this.pageHeight]);
        this.y = this.pageHeight - this.margins.top;
        return this.page;
      },
      ensure(spaceNeeded){
        if (this.y - spaceNeeded < this.margins.bottom){
          this.addPage();
        }
      }
    };
    composer.addPage();
    return composer;
  }

  async function embedPdfFontSet(pdfDoc, StandardFonts, rgb, theme = PDF_FONT_THEME){
    const family = normalizeCvFontTheme(theme) === "sans"
      ? {
          regular: StandardFonts.Helvetica,
          bold: StandardFonts.HelveticaBold,
          italic: StandardFonts.HelveticaOblique
        }
      : {
          regular: StandardFonts.TimesRoman,
          bold: StandardFonts.TimesRomanBold,
          italic: StandardFonts.TimesRomanItalic
        };
    return {
      regular: await pdfDoc.embedFont(family.regular),
      bold: await pdfDoc.embedFont(family.bold),
      italic: await pdfDoc.embedFont(family.italic),
      base: rgb(17 / 255, 19 / 255, 24 / 255),
      muted: rgb(97 / 255, 104 / 255, 114 / 255),
      rule: rgb(76 / 255, 82 / 255, 92 / 255)
    };
  }

  function drawPdfWrappedText(composer, text, opts){
    const font = opts.font;
    const size = Number(opts.size || 10);
    const x = Number(opts.x || composer.margins.left);
    const color = opts.color;
    const lineHeight = Number(opts.lineHeight || (size * 1.35));
    const maxWidth = Number(opts.maxWidth || (composer.pageWidth - composer.margins.right - x));
    const afterGap = Number(opts.afterGap || 0);
    const lines = wrapPdfText(font, size, text, maxWidth);
    const heightNeeded = Math.max(lineHeight, lines.length * lineHeight);

    composer.ensure(Math.min(heightNeeded, composer.pageHeight - composer.margins.top - composer.margins.bottom));
    lines.forEach((line) => {
      if (composer.y - lineHeight < composer.margins.bottom){
        composer.addPage();
      }
      if (line){
        const textWidth = font.widthOfTextAtSize(line, size);
        const drawX = String(opts.align || "left") === "right"
          ? (x + Math.max(0, maxWidth - textWidth))
          : x;
        composer.page.drawText(line, {
          x: drawX,
          y: composer.y - size,
          size,
          font,
          color
        });
      }
      composer.y -= lineHeight;
    });
    composer.y -= afterGap;
    return lines;
  }

  function drawPdfCenteredTextBlock(composer, text, opts){
    const font = opts.font;
    const size = Number(opts.size || 10);
    const x = Number(opts.x || composer.margins.left);
    const maxWidth = Number(opts.maxWidth || (composer.pageWidth - composer.margins.left - composer.margins.right));
    const lineHeight = Number(opts.lineHeight || (size * 1.35));
    const afterGap = Number(opts.afterGap || 0);
    const color = opts.color;
    const block = measurePdfTextBlock(font, size, text, maxWidth, lineHeight);

    composer.ensure(block.height);
    const topY = composer.y;
    block.lines.forEach((line, index) => {
      if (!line) return;
      const textWidth = font.widthOfTextAtSize(line, size);
      composer.page.drawText(line, {
        x: x + Math.max(0, (maxWidth - textWidth) / 2),
        y: topY - size - (index * lineHeight),
        size,
        font,
        color
      });
    });
    composer.y = topY - block.height - afterGap;
    return block.lines;
  }

  function drawPdfSectionTitle(composer, fonts, title, spaceNeeded = 28){
    const label = sanitizePdfTextForFont(fonts.bold, String(title || ""));
    composer.ensure(Math.max(28, Number(spaceNeeded) || 28));
    composer.page.drawText(label, {
      x: composer.margins.left,
      y: composer.y - 10,
      size: 12.2,
      font: fonts.bold,
      color: fonts.base
    });
    composer.y -= 14;
    composer.page.drawLine({
      start: { x: composer.margins.left, y: composer.y },
      end: { x: composer.pageWidth - composer.margins.right, y: composer.y },
      thickness: 0.8,
      color: fonts.rule
    });
    composer.y -= 10;
  }

  function estimatePdfSectionLeadSpace(section, fonts, composer){
    if (!section || !fonts || !composer) return 52;
    const width = composer.pageWidth - composer.margins.left - composer.margins.right;
    const firstParagraph = Array.isArray(section.paragraphs) ? String(section.paragraphs[0] || "").trim() : "";
    const firstItem = Array.isArray(section.items) ? section.items[0] : null;

    if (section.kind === "experience" || section.kind === "education"){
      const entryTitle = section.kind === "education"
        ? joinNonEmpty([firstItem?.degree, firstItem?.field], " · ")
        : String(firstItem?.title || "").trim();
      const entryMeta = section.kind === "education"
        ? joinNonEmpty([firstItem?.school, firstItem?.location], ", ")
        : joinNonEmpty([firstItem?.company, firstItem?.location], ", ");
      const firstBullet = asStringArr(firstItem?.bullets, 1)[0] || "";
      const leftWidth = Math.max(180, width - 120);
      let estimate = 40;
      if (entryTitle){
        estimate += measurePdfTextBlock(fonts.bold, 11.2, entryTitle, leftWidth, 13.8).height;
      }
      if (entryMeta){
        estimate += measurePdfTextBlock(fonts.italic, 9.6, entryMeta, leftWidth, 11.8).height;
      }
      if (firstBullet){
        estimate += Math.min(24, measurePdfTextBlock(fonts.regular, 10, firstBullet, Math.max(140, width - 17), 13.6).height);
      }
      return Math.max(62, Math.min(120, estimate));
    }

    if (section.kind === "bullets"){
      const firstBullet = String(firstItem || "").trim();
      if (!firstBullet) return 54;
      return Math.max(52, Math.min(96, 34 + measurePdfTextBlock(fonts.regular, 10, firstBullet, Math.max(140, width - 17), 13.6).height));
    }

    if (section.kind === "lines"){
      const firstLine = String(firstItem || "").trim();
      if (!firstLine) return 48;
      return Math.max(48, Math.min(86, 30 + measurePdfTextBlock(fonts.regular, 9.9, firstLine, width, 13).height));
    }

    if (firstParagraph){
      return Math.max(48, Math.min(90, 30 + measurePdfTextBlock(fonts.regular, 10.3, firstParagraph, width, 13.9).height));
    }
    return 50;
  }

  function parsePlainTextCvLayout(title, text){
    const rawLines = String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => String(line || "").replace(/\s+$/g, ""));

    while (rawLines.length && !String(rawLines[0] || "").trim()) rawLines.shift();
    while (rawLines.length && !String(rawLines[rawLines.length - 1] || "").trim()) rawLines.pop();

    const headingIndex = rawLines.findIndex((line) => looksLikeSectionHeading(line));
    const headerLines = (headingIndex > 0 ? rawLines.slice(0, headingIndex) : [])
      .map((line) => String(line || "").trim())
      .filter(Boolean);
    const bodyLines = headingIndex > 0 ? rawLines.slice(headingIndex) : rawLines.slice();

    return {
      title: String(title || "").trim(),
      headerLines,
      bodyLines
    };
  }

  function drawPlainTextPdfHeader(composer, fonts, title, text){
    const layout = parsePlainTextCvLayout(title, text);
    const headerLines = layout.headerLines;
    const fallbackTitle = layout.title || "Curriculum Vitae";

    if (headerLines.length){
      const name = headerLines[0] || fallbackTitle;
      const role = headerLines[1] || "";
      const contactLines = headerLines.slice(2).filter(Boolean);

      drawPdfCenteredTextBlock(composer, name, {
        font: fonts.bold,
        size: 22,
        lineHeight: 25,
        color: fonts.base,
        x: composer.margins.left,
        maxWidth: composer.pageWidth - composer.margins.left - composer.margins.right,
        afterGap: role ? 2 : 6
      });
      if (role){
        drawPdfCenteredTextBlock(composer, role, {
          font: fonts.regular,
          size: 10.6,
          lineHeight: 13,
          color: fonts.muted,
          x: composer.margins.left,
          maxWidth: composer.pageWidth - composer.margins.left - composer.margins.right,
          afterGap: contactLines.length ? 2 : 8
        });
      }
      contactLines.forEach((line, index) => {
        drawPdfCenteredTextBlock(composer, line, {
          font: fonts.regular,
          size: 9.3,
          lineHeight: 11.3,
          color: fonts.muted,
          x: composer.margins.left,
          maxWidth: composer.pageWidth - composer.margins.left - composer.margins.right,
          afterGap: index === contactLines.length - 1 ? 8 : 2
        });
      });
    }else{
      drawPdfCenteredTextBlock(composer, fallbackTitle, {
        font: fonts.bold,
        size: 20,
        lineHeight: 24,
        color: fonts.base,
        x: composer.margins.left,
        maxWidth: composer.pageWidth - composer.margins.left - composer.margins.right,
        afterGap: 10
      });
    }

    return layout.bodyLines;
  }

  function nextMeaningfulPlainTextLine(lines, startIndex){
    for (let idx = Number(startIndex) || 0; idx < (Array.isArray(lines) ? lines.length : 0); idx += 1){
      const line = String(lines[idx] || "").trim();
      if (line) return line;
    }
    return "";
  }

  function drawPlainTextPdfBody(composer, fonts, lines){
    const bodyLines = Array.isArray(lines) ? lines : [];
    const width = composer.pageWidth - composer.margins.left - composer.margins.right;

    bodyLines.forEach((rawLine, index) => {
      const line = String(rawLine || "").trim();
      if (!line){
        composer.y -= 6;
        return;
      }

      if (looksLikeSectionHeading(line)){
        const nextLine = nextMeaningfulPlainTextLine(bodyLines, index + 1);
        let leadSpace = 54;
        if (nextLine && !looksLikeSectionHeading(nextLine)){
          const plainNext = nextLine.replace(/^[\-\u2022]\s+/, "");
          const nextHeight = measurePdfTextBlock(fonts.regular, 10.1, plainNext, width, 13.6).height;
          leadSpace = Math.max(54, Math.min(92, 34 + nextHeight));
        }
        drawPdfSectionTitle(composer, fonts, line, leadSpace);
        return;
      }

      if (/^[\-\u2022]\s+/.test(line)){
        drawPdfBullet(composer, fonts, line.replace(/^[\-\u2022]\s+/, ""));
        return;
      }

      drawPdfWrappedText(composer, line, {
        font: fonts.regular,
        size: 10.1,
        lineHeight: 13.6,
        color: fonts.base,
        afterGap: 2
      });
    });
  }

  function drawPdfBullet(composer, fonts, bulletText){
    const bulletX = composer.margins.left + 5.5;
    const textX = composer.margins.left + 17;
    const size = 10;
    const lineHeight = 13.6;
    const maxWidth = composer.pageWidth - composer.margins.right - textX;
    const block = measurePdfTextBlock(fonts.regular, size, bulletText, maxWidth, lineHeight);

    composer.ensure(Math.max(16, block.height + 2));
    const topY = composer.y;
    composer.page.drawCircle({
      x: bulletX,
      y: topY - (lineHeight * 0.5) + 0.4,
      size: 1.75,
      color: fonts.base
    });
    drawPdfTextLinesAt(composer.page, block.lines, {
      x: textX,
      topY,
      size,
      font: fonts.regular,
      color: fonts.base,
      lineHeight,
      maxWidth
    });
    composer.y = topY - block.height - 1;
  }

  function drawPdfExperienceItem(composer, fonts, itemData){
    const title = String(itemData?.title || "").trim();
    const sub = joinNonEmpty([itemData?.company, itemData?.location], ", ");
    const meta = joinNonEmpty([itemData?.start, itemData?.end], " – ");
    const bullets = asStringArr(itemData?.bullets, 20);

    const totalWidth = composer.pageWidth - composer.margins.left - composer.margins.right;
    const metaGap = meta ? 18 : 0;
    const metaMinWidth = meta ? 96 : 0;
    const metaMaxWidth = meta ? 140 : 0;
    let metaWidth = 0;
    let metaBlock = null;

    if (meta){
      const cleanMeta = sanitizePdfTextForFont(fonts.italic, meta);
      metaWidth = Math.min(metaMaxWidth, Math.max(metaMinWidth, fonts.italic.widthOfTextAtSize(cleanMeta, 9.4) + 2));
      metaBlock = measurePdfTextBlock(fonts.italic, 9.4, meta, metaWidth, 11.8);
    }

    const leftWidth = Math.max(180, totalWidth - metaWidth - metaGap);
    const titleBlock = title ? measurePdfTextBlock(fonts.bold, 11.2, title, leftWidth, 13.8) : null;
    const subBlock = sub ? measurePdfTextBlock(fonts.italic, 9.6, sub, leftWidth, 11.8) : null;
    const leftHeight = (titleBlock ? titleBlock.height : 0) + (subBlock ? subBlock.height : 0);
    const rowHeight = Math.max(leftHeight || 0, metaBlock ? metaBlock.height : 0, 13.8);

    composer.ensure(Math.max(32, rowHeight + 2));
    const topY = composer.y;
    if (titleBlock){
      drawPdfTextLinesAt(composer.page, titleBlock.lines, {
        x: composer.margins.left,
        topY,
        size: 11.2,
        font: fonts.bold,
        color: fonts.base,
        lineHeight: titleBlock.lineHeight,
        maxWidth: leftWidth
      });
    }
    if (subBlock){
      drawPdfTextLinesAt(composer.page, subBlock.lines, {
        x: composer.margins.left,
        topY: topY - (titleBlock ? titleBlock.height : 0),
        size: 9.6,
        font: fonts.italic,
        color: fonts.muted,
        lineHeight: subBlock.lineHeight,
        maxWidth: leftWidth
      });
    }
    if (metaBlock){
      drawPdfTextLinesAt(composer.page, metaBlock.lines, {
        x: composer.pageWidth - composer.margins.right - metaWidth,
        topY,
        size: 9.4,
        font: fonts.italic,
        color: fonts.muted,
        lineHeight: metaBlock.lineHeight,
        maxWidth: metaWidth,
        align: "right"
      });
    }

    composer.y = topY - rowHeight - 3;
    bullets.forEach((bullet) => drawPdfBullet(composer, fonts, bullet));
    composer.y -= 5;
  }

  async function buildStructuredPdfBytes(cvDoc, lang, jobTitle){
    const PDFLib = window.PDFLib;
    if (!PDFLib) throw new Error("pdf-lib is not loaded.");
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const fonts = await embedPdfFontSet(pdfDoc, StandardFonts, rgb, PDF_FONT_THEME);
    const composer = createPdfComposer(pdfDoc);
    ensureDocHeader(cvDoc);
    const name = String(cvDoc?.name || "YOUR NAME").trim();
    const role = getHeaderRole(cvDoc, jobTitle || "Curriculum Vitae");
    const contact = cvDoc?.contact || {};
    const contactLine = formatHeaderContactLine([
      ["phone", contact.phone],
      ["email", contact.email],
      ["location", contact.location]
    ], cvDoc, "pdf");
    const contactLine2 = formatHeaderContactLine([
      ["linkedin", contact.linkedin],
      ["portfolio", contact.portfolio]
    ], cvDoc, "pdf");

    pdfDoc.setTitle(sanitizePdfTextForFont(fonts.bold, buildFilename().replace(/\.pdf$/i, "")));
    pdfDoc.setProducer("jobmejob");
    pdfDoc.setCreator("jobmejob");

    drawPdfCenteredTextBlock(composer, name, {
      font: fonts.bold,
      size: 22,
      lineHeight: 25,
      color: fonts.base,
      x: composer.margins.left,
      maxWidth: composer.pageWidth - composer.margins.left - composer.margins.right,
      afterGap: 2
    });
    if (role){
      drawPdfCenteredTextBlock(composer, role, {
        font: fonts.regular,
        size: 10.6,
        lineHeight: 13,
        color: fonts.muted,
        x: composer.margins.left,
        maxWidth: composer.pageWidth - composer.margins.left - composer.margins.right,
        afterGap: 2
      });
    }
    if (contactLine){
      drawPdfCenteredTextBlock(composer, contactLine, {
        font: fonts.regular,
        size: 9.3,
        lineHeight: 11.3,
        color: fonts.muted,
        x: composer.margins.left,
        maxWidth: composer.pageWidth - composer.margins.left - composer.margins.right,
        afterGap: 2
      });
    }
    if (contactLine2){
      drawPdfCenteredTextBlock(composer, contactLine2, {
        font: fonts.regular,
        size: 9.3,
        lineHeight: 11.3,
        color: fonts.muted,
        x: composer.margins.left,
        maxWidth: composer.pageWidth - composer.margins.left - composer.margins.right,
        afterGap: 8
      });
    }else{
      composer.y -= 6;
    }

    getOrderedCvSections(cvDoc, lang).forEach((section) => {
      drawPdfSectionTitle(composer, fonts, section.title, estimatePdfSectionLeadSpace(section, fonts, composer));
      if (section.kind === "paragraph"){
        (section.paragraphs || []).forEach((text) => {
          drawPdfWrappedText(composer, text, {
            font: fonts.regular,
            size: 10.3,
            lineHeight: 13.9,
            color: fonts.base,
            afterGap: 4
          });
        });
      }else if (section.kind === "experience"){
        (section.items || []).forEach((entry) => drawPdfExperienceItem(composer, fonts, entry));
      }else if (section.kind === "education"){
        (section.items || []).forEach((entry) => {
          drawPdfExperienceItem(composer, fonts, {
            title: joinNonEmpty([entry?.degree, entry?.field], " · "),
            company: entry?.school,
            location: entry?.location,
            start: entry?.start,
            end: entry?.end,
            bullets: entry?.bullets
          });
        });
      }else if (section.kind === "bullets"){
        (section.items || []).forEach((entry) => drawPdfBullet(composer, fonts, entry));
        composer.y -= 4;
      }else if (section.kind === "lines"){
        (section.items || []).forEach((entry) => {
          drawPdfWrappedText(composer, entry, {
            font: fonts.regular,
            size: 9.9,
            lineHeight: 13,
            color: fonts.base
          });
        });
        composer.y -= 4;
      }
    });

    return pdfDoc.save();
  }

  async function buildPlainTextPdfBytes(title, text){
    const PDFLib = window.PDFLib;
    if (!PDFLib) throw new Error("pdf-lib is not loaded.");
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const fonts = await embedPdfFontSet(pdfDoc, StandardFonts, rgb, PDF_FONT_THEME);
    const composer = createPdfComposer(pdfDoc);

    pdfDoc.setTitle(sanitizePdfTextForFont(fonts.bold, buildFilename().replace(/\.pdf$/i, "")));
    pdfDoc.setProducer("jobmejob");
    pdfDoc.setCreator("jobmejob");

    const bodyLines = drawPlainTextPdfHeader(composer, fonts, title, text);
    drawPlainTextPdfBody(composer, fonts, bodyLines);

    return pdfDoc.save();
  }

  function isTouchPrimaryDevice(){
    try{
      if (S && typeof S.isMobileCvDevice === "function" && S.isMobileCvDevice()) return true;
    }catch(_){}
    try{
      if (window.matchMedia && (window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(any-pointer: coarse)").matches)) return true;
    }catch(_){}
    try{
      if (Number(navigator?.maxTouchPoints || 0) > 0) return true;
    }catch(_){}
    return false;
  }

  function openPdfExportTarget(filename){
    if (!isTouchPrimaryDevice()) return null;
    try{
      const target = window.open("", "_blank");
      if (!target) return null;
      const safeTitle = escapeHtml(filename || "Tailored CV.pdf");
      target.document.write(
        "<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
        "<title>" + safeTitle + "</title>" +
        "<style>" +
        "html,body{margin:0;padding:0;background:#f4f7f3;color:#111318;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;}" +
        "body{display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;}" +
        ".card{max-width:420px;border:1px solid rgba(17,19,24,.1);background:#fff;border-radius:20px;padding:22px;box-shadow:0 18px 44px rgba(17,19,24,.10);}" +
        ".eyebrow{font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#0b7a35;margin-bottom:10px;}" +
        "h1{margin:0 0 8px;font-size:24px;line-height:1.1;}" +
        "p{margin:0;color:rgba(17,19,24,.72);line-height:1.5;font-size:15px;}" +
        "</style></head><body><div class=\"card\"><div class=\"eyebrow\">jobmejob</div><h1>Preparing your PDF</h1><p>This tab will open the exported CV as soon as it is ready. From there you can save or share the PDF.</p></div></body></html>"
      );
      target.document.close();
      return target;
    }catch(_){
      return null;
    }
  }

  function setPdfExportTargetError(target, message){
    if (!target || target.closed) return;
    try{
      target.document.title = "PDF export failed";
      target.document.body.innerHTML =
        "<div style=\"max-width:420px;margin:0 auto;padding:24px;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;color:#111318;\">" +
        "<div style=\"font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#b42318;margin-bottom:10px;\">jobmejob</div>" +
        "<h1 style=\"margin:0 0 8px;font-size:24px;line-height:1.1;\">We could not prepare the PDF</h1>" +
        "<p style=\"margin:0;line-height:1.5;color:rgba(17,19,24,.72);\">" + escapeHtml(message || "Please go back and try again.") + "</p>" +
        "</div>";
    }catch(_){}
  }

  function downloadBlobFile(blob, filename, opts){
    const target = opts && opts.targetWindow ? opts.targetWindow : null;
    const url = URL.createObjectURL(blob);
    if (target && !target.closed){
      try{
        target.location.replace(url);
        setTimeout(() => {
          try{ URL.revokeObjectURL(url); }catch(_){}
        }, 60000);
        return "preview";
      }catch(_){}
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try{ a.remove(); }catch(_){}
      try{ URL.revokeObjectURL(url); }catch(_){}
    }, 60000);
    return "download";
  }

  function buildFilename(){
    const name = String(currentCvDoc?.name || "").trim();
    const role = String(currentJobMeta.title || currentCvDoc?.target_role || "Tailored CV").trim();
    const company = String(currentJobMeta.company || "").trim();
    const base = [name, role, company]
      .filter(Boolean)
      .join(" - ")
      .replace(/[\\/:*?"<>|]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Tailored CV";
    return base + ".pdf";
  }

  async function downloadPdf(){
    clearTopError();
    if (!currentCvText.trim()){
      showTopError("Generate the preview first.");
      return;
    }
    pdfInFlight = true;
    updateGenerateButton();
    const btn = $("downloadPdfBtn");
    const old = btn ? btn.textContent : "";
    const filename = buildFilename();
    const exportTarget = openPdfExportTarget(filename);
    if (btn) btn.textContent = "Preparing PDF…";
    try{
      const exportTitle = String(currentJobMeta.title || currentCvDoc?.target_role || "Tailored CV").trim() || "Tailored CV";
      const useTextExport = !currentCvDoc || detectManualTextEdits();
      const bytes = useTextExport
        ? await buildPlainTextPdfBytes(exportTitle, currentCvText)
        : await buildStructuredPdfBytes(currentCvDoc, currentLang, exportTitle);
      const mode = downloadBlobFile(new Blob([bytes], { type:"application/pdf" }), filename, { targetWindow: exportTarget });
      if (mode === "preview"){
        try{
          S?.toast?.("PDF opened in a new tab. Save or share it from there.", { kind:"good", title:"PDF ready" });
        }catch(_){}
      }
    }catch(err){
      setPdfExportTargetError(exportTarget, err?.message || String(err));
      showTopError(err?.message || String(err));
    }finally{
      if (btn) btn.textContent = old || "Download PDF";
      pdfInFlight = false;
      updateGenerateButton();
    }
  }

  function wireEvents(){
    const bindPrimaryActionBlur = (id) => {
      const el = $(id);
      if (!el) return;
      const blur = () => { blurActiveTextEntry(); };
      el.addEventListener("pointerdown", blur, { capture:true });
      el.addEventListener("touchstart", blur, { capture:true, passive:true });
    };

    ["generateBtn", "regenerateBtn", "applyKeywordsBtn", "downloadPdfBtn"].forEach(bindPrimaryActionBlur);
    document.addEventListener("touchstart", rescuePrimaryTapFromFocusedTextarea, { capture:true, passive:false });
    document.addEventListener("pointerdown", rescuePrimaryTapFromFocusedTextarea, { capture:true });

    $("jobDesc")?.addEventListener("input", () => {
      const desc = String($("jobDesc")?.value || "").trim();
      if (!desc){
        jobInputSource = "paste";
      }else if (jobInputSource === "screenshot" || jobInputSource === "mixed"){
        jobInputSource = "mixed";
      }else{
        jobInputSource = "paste";
      }
      updateGenerateButton();
      if (jobInputCollapsed) refreshJobSummaryCard();
    });
    $("jobTitle")?.addEventListener("input", () => {
      readJobMeta();
      if (jobInputCollapsed) refreshJobSummaryCard();
    });
    $("jobCompany")?.addEventListener("input", () => {
      readJobMeta();
      if (jobInputCollapsed) refreshJobSummaryCard();
    });
    $("jobApplyUrl")?.addEventListener("input", () => {
      readJobMeta();
      if (jobInputCollapsed) refreshJobSummaryCard();
    });

    $("browseScreenshotBtn")?.addEventListener("click", () => {
      try{ $("jobShotFile")?.click(); }catch(_){}
    });
    $("jobShotFile")?.addEventListener("change", async () => {
      clearTopError();
      const input = $("jobShotFile");
      const file = input && input.files && input.files[0] ? input.files[0] : null;
      if (!file) return;
      try{ if (input) input.value = ""; }catch(_){}
      try{
        await extractScreenshotToTextarea(file);
      }catch(err){
        setScreenshotExtractionState("error", "Could not extract text from that screenshot.");
        showTopError(err?.message || String(err));
      }
    });

    $("generateBtn")?.addEventListener("click", () => { void generatePreview(); });
    $("regenerateBtn")?.addEventListener("click", () => { void generatePreview(); });
    $("editJobInputBtn")?.addEventListener("click", () => {
      setJobInputCollapsed(false, { scroll:true });
      try{ $("jobDesc")?.focus({ preventScroll:true }); }catch(_){
        try{ $("jobDesc")?.focus(); }catch(__){}
      }
    });
    $("applyKeywordsBtn")?.addEventListener("click", applySelectedKeywords);
    $("clearKeywordsBtn")?.addEventListener("click", () => {
      selectedKeywords.clear();
      renderKeywords();
    });
    $("toggleEditBtn")?.addEventListener("click", () => {
      const box = $("editorBox");
      toggleEditor(!(box && box.style.display === "block"));
    });
    $("saveEditBtn")?.addEventListener("click", saveEditorChanges);
    $("cancelEditBtn")?.addEventListener("click", () => toggleEditor(false));
    $("downloadPdfBtn")?.addEventListener("click", () => { void downloadPdf(); });
    $("generateModalCloseBtn")?.addEventListener("click", closeGenerateModal);
    $("generateModal")?.addEventListener("click", (event) => {
      if (event.target === $("generateModal")) closeGenerateModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const modal = $("generateModal");
      if (!modal || window.getComputedStyle(modal).display === "none") return;
      closeGenerateModal();
    });
  }

  async function boot(){
    clearTopError();
    setBadge("cvReadyBadge", "warn", "Checking CV…");
    setText("cvReadyHint", "Checking your uploaded CV…");
    updateGenerateButton();

    if (!auth || typeof auth.getSession !== "function"){
      showTopError("auth.js did not load correctly.");
      return;
    }

    session = await getSessionFresh(false);
    if (!session || !session.user || !session.user.email){
      try{ auth.rememberPostAuthRedirect?.(window.location.pathname + window.location.search + window.location.hash); }catch(_){}
      window.location.replace("./signup.html?entry=cv-studio");
      return;
    }

    try{
      await auth.requireAuthAndCustomer?.({ redirectTo: "./signup.html?entry=cv-studio" });
    }catch(_){}

    try{
      state = await auth.syncStateToLocalStorage?.(session);
    }catch(_){
      state = null;
    }

    try{
      await S?.hydrateAccountNav?.({ session, state });
    }catch(_){}

    wireEvents();
    setJobInputCollapsed(false, { scroll:false });
    renderFlowState();
    await refreshCvReadyState();
  }

  window.addEventListener("load", () => {
    boot().catch((err) => {
      showTopError(err?.message || String(err));
      setBadge("cvReadyBadge", "bad", "Error");
    });
  });
})();
