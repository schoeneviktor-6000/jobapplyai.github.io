"use strict";

(() => {
  const S = window.JobMeJobShared || null;
  const APP = window.JobMeJob || window.JobApplyAI || {};
  const auth = APP.auth || null;
  const API_BASE = String((APP.config && APP.config.API_BASE) || (S && S.resolveApiBase ? S.resolveApiBase("https://jobmejob.schoene-viktor.workers.dev") : "https://jobmejob.schoene-viktor.workers.dev")).replace(/\/+$/, "");
  const FETCH_TIMEOUT_MS = 35000;
  const OCR_STATUS_TIMEOUT_MS = 60000;
  const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;
  const OCR_FAST_POLL_MS = 3500;
  const OCR_SLOW_POLL_MS = 15000;
  const OCR_SOFT_WAIT_MS = 3 * 60 * 1000;
  const OCR_HARD_WAIT_MS = 15 * 60 * 1000;

  let session = null;
  let state = null;
  let ocrPollTimer = null;
  let ocrPollInFlight = false;
  let ocrPollTicks = 0;

  function $(id){ return document.getElementById(id); }

  function setText(id, text){
    const el = $(id);
    if (el) el.textContent = String(text || "");
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

  function setProgress(show, pct, text, hint){
    const wrap = $("cvProgressWrap");
    const fill = $("cvProgressFill");
    if (wrap) wrap.style.display = show ? "block" : "none";
    if (fill) fill.style.width = Math.max(0, Math.min(100, Number(pct) || 0)) + "%";
    setText("cvProgressText", text || "");
    setText("cvProgressHint", hint || "");
  }

  function showRetryOcr(show){
    const btn = $("retryOcrBtn");
    if (btn) btn.style.display = show ? "inline-flex" : "none";
  }

  function setContinueState(enabled){
    const btn = $("continueBtn");
    if (!btn) return;
    btn.setAttribute("aria-disabled", enabled ? "false" : "true");
    btn.classList.toggle("ghost", !enabled);
    btn.classList.toggle("primary", !!enabled);
    btn.textContent = enabled ? "Go to step 2" : "Upload PDF first";
    if (!enabled){
      btn.addEventListener("click", preventDisabledContinue);
    }else{
      btn.removeEventListener("click", preventDisabledContinue);
    }
  }

  function setFlowStepState(id, state){
    const el = $(id);
    if (!el) return;
    const value = String(state || "").trim().toLowerCase();
    el.classList.toggle("isActive", value === "active");
    el.classList.toggle("isDone", value === "done");
  }

  function renderUploadFlow(hasCv){
    if (hasCv){
      setFlowStepState("uploadFlowStepUpload", "done");
      setFlowStepState("uploadFlowStepTailor", "active");
      setFlowStepState("uploadFlowStepExport", "");
      setText("subLine", "Base CV ready. Next: add one job post.");
      return;
    }
    setFlowStepState("uploadFlowStepUpload", "active");
    setFlowStepState("uploadFlowStepTailor", "");
    setFlowStepState("uploadFlowStepExport", "");
    setText("subLine", "Upload one PDF. Then tailor one CV for one job.");
  }

  function preventDisabledContinue(e){
    const btn = $("continueBtn");
    if (!btn) return;
    if (btn.getAttribute("aria-disabled") === "true"){
      e.preventDefault();
      showTopError("Upload your CV first. The mobile CV Studio comes next.");
    }
  }

  function stopOcrPolling(){
    if (ocrPollTimer){
      clearInterval(ocrPollTimer);
      ocrPollTimer = null;
    }
  }

  function stopOcrPollingAndCleanup(){
    stopOcrPolling();
    ocrPollInFlight = false;
    ocrPollTicks = 0;
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

  function ensureSessionToken(){
    const token = String(session && session.access_token ? session.access_token : "").trim();
    if (!token) throw new Error("Your session expired. Please sign in again.");
    return token;
  }

  async function apiGet(path, timeoutMs){
    const token = ensureSessionToken();
    const res = await fetchWithTimeout(API_BASE + path, {
      method: "GET",
      headers: { Authorization: "Bearer " + token }
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
    const token = ensureSessionToken();
    const res = await fetchWithTimeout(API_BASE + path, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
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
    const token = ensureSessionToken();
    const res = await fetchWithTimeout(API_BASE + path, {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      body: formData
    }, timeoutMs || UPLOAD_TIMEOUT_MS);
    const text = await res.text().catch(() => "");
    let json = null;
    try{ json = text ? JSON.parse(text) : null; }catch(_){ json = { raw:text }; }
    if (!res.ok){
      const detail = String(json?.error || json?.message || json?.details || text || "").trim();
      throw new Error(path + " failed: " + res.status + (detail ? (" — " + detail) : ""));
    }
    return json;
  }

  function isPdfFile(file){
    const name = String(file?.name || "").trim().toLowerCase();
    const type = String(file?.type || "").trim().toLowerCase();
    return name.endsWith(".pdf") || type === "application/pdf";
  }

  function storedCvSupportsPdf(cv){
    const mime = String(cv?.cv_mime || "").trim().toLowerCase();
    const fileLabel = String(cv?.cv_filename || cv?.cv_path || "").trim().toLowerCase();
    return mime === "application/pdf" || fileLabel.endsWith(".pdf");
  }

  async function loadCvStatusAndUpdateUx(opts){
    const suppressPolling = !!(opts && opts.suppressPolling);
    try{
      const res = await apiGet("/me/cv", OCR_STATUS_TIMEOUT_MS);
      const cv = res && res.cv ? res.cv : null;

      if (cv && cv.cv_path){
        const fileLabel = String(cv.cv_filename || cv.cv_path || "").trim();
        const isPdf = storedCvSupportsPdf(cv);
        const ocrStatus = String(cv.cv_ocr_status || "").trim().toLowerCase();

        setText("cvHint", "Uploaded: " + fileLabel);
        setContinueState(true);
        renderUploadFlow(true);
        showRetryOcr(false);

        if (ocrStatus === "done"){
          stopOcrPollingAndCleanup();
          setBadge("cvStatusBadge", "good", "OCR done");
          setText("ocrHint", "OCR done.");
          setProgress(false, 100, "", "");
          return;
        }

        if (ocrStatus === "processing"){
          setBadge("cvStatusBadge", "warn", "OCR running…");
          setText("ocrHint", "OCR is running…");
          setProgress(true, 65, "OCR in progress…", "We will update automatically.");
          if (isPdf && !suppressPolling) startOcrPolling({ startedAt: Date.now() });
          return;
        }

        if (ocrStatus === "failed"){
          stopOcrPollingAndCleanup();
          setBadge("cvStatusBadge", "bad", "OCR failed");
          setText("ocrHint", "OCR failed: " + String(cv.cv_ocr_error || ""));
          setProgress(false, 0, "", "");
          if (isPdf) showRetryOcr(true);
          return;
        }

        stopOcrPollingAndCleanup();
        setBadge("cvStatusBadge", "good", "Uploaded");
        setProgress(false, 0, "", "");
        if (isPdf){
          setText("ocrHint", "OCR not started.");
          showRetryOcr(true);
        }else{
          setText("ocrHint", "PDF required for OCR.");
        }
        return;
      }

      stopOcrPollingAndCleanup();
      setBadge("cvStatusBadge", "warn", "No CV");
      setText("cvHint", "No CV uploaded yet.");
      setText("ocrHint", "");
      setProgress(false, 0, "", "");
      setContinueState(false);
      renderUploadFlow(false);
      showRetryOcr(false);
    }catch(e){
      stopOcrPollingAndCleanup();
      setBadge("cvStatusBadge", "warn", "Unknown");
      setText("cvHint", "Could not load CV status.");
      setText("ocrHint", "");
      setProgress(false, 0, "", "");
      setContinueState(false);
      renderUploadFlow(false);
      showRetryOcr(false);
      showTopError(e?.message || String(e));
    }
  }

  function startOcrPolling(opts){
    const startedAt = (typeof opts?.startedAt === "number" && Number.isFinite(opts.startedAt)) ? opts.startedAt : Date.now();
    let slowMode = false;

    stopOcrPollingAndCleanup();

    async function tick(){
      if (ocrPollInFlight) return;
      ocrPollInFlight = true;
      ocrPollTicks += 1;

      const elapsed = Date.now() - startedAt;
      const pct = Math.min(95, 55 + Math.floor((elapsed / OCR_HARD_WAIT_MS) * 40));

      try{
        if (ocrPollTicks % 2 === 1){
          try{ await apiGet("/me/cv/ocr/status", OCR_STATUS_TIMEOUT_MS); }catch(_){}
        }
        await loadCvStatusAndUpdateUx({ suppressPolling:true });
        const currentHint = String($("ocrHint")?.textContent || "").toLowerCase();
        if (currentHint.includes("ocr done") || currentHint.includes("ocr failed")){
          return;
        }

        if (elapsed > OCR_SOFT_WAIT_MS){
          showRetryOcr(true);
          setText("ocrHint", "OCR is taking longer than usual.");
        }

        setProgress(true, pct, "OCR in progress…", "We will update automatically.");

        if (!slowMode && elapsed > OCR_SOFT_WAIT_MS){
          slowMode = true;
          stopOcrPolling();
          ocrPollTimer = setInterval(tick, OCR_SLOW_POLL_MS);
        }

        if (elapsed > OCR_HARD_WAIT_MS){
          stopOcrPollingAndCleanup();
          showRetryOcr(true);
          setBadge("cvStatusBadge", "warn", "OCR delayed");
          setProgress(false, 0, "", "");
          setText("ocrHint", "OCR is still processing.");
        }
      }catch(e){
        setBadge("cvStatusBadge", "warn", "Checking…");
        setProgress(true, pct, "Checking OCR status…", "Mobile networks can be flaky. We will keep trying.");
        if (ocrPollTicks === 1 || (ocrPollTicks % 8 === 0)){
          showTopError(e?.message || String(e));
        }
      }finally{
        ocrPollInFlight = false;
      }
    }

    tick();
    ocrPollTimer = setInterval(tick, OCR_FAST_POLL_MS);
  }

  async function uploadCvThenAutoOcr(file){
    stopOcrPollingAndCleanup();
    clearTopError();
    showRetryOcr(false);

    if (!isPdfFile(file)){
      throw new Error("Please upload a PDF version of your CV for the mobile flow.");
    }

    const maxSizeMb = 9;
    if (file && Number(file.size) > maxSizeMb * 1024 * 1024){
      throw new Error("File too large (" + Math.round(file.size / 1024 / 1024) + "MB). Please upload a file under " + maxSizeMb + "MB.");
    }

    setBadge("cvStatusBadge", "warn", "Uploading…");
    setProgress(true, 18, "Uploading your CV…", "Do not close this tab.");

    const formData = new FormData();
    formData.append("cv", file);
    await apiPostForm("/me/cv", formData, UPLOAD_TIMEOUT_MS);

    if (auth && typeof auth.syncStateToLocalStorage === "function"){
      try{ state = await auth.syncStateToLocalStorage(session); }catch(_){}
    }

    await loadCvStatusAndUpdateUx();

    setBadge("cvStatusBadge", "warn", "Starting OCR…");
    setProgress(true, 40, "Starting OCR…", "We are extracting text from your PDF.");

    try{
      await apiPostJson("/me/cv/ocr", {}, OCR_STATUS_TIMEOUT_MS);
    }catch(e){
      showTopError(e?.message || String(e));
      showRetryOcr(true);
    }

    setBadge("cvStatusBadge", "warn", "OCR running…");
    setProgress(true, 55, "OCR in progress…", "We will update automatically.");
    setText("ocrHint", "OCR is running…");
    window.location.replace("./cv-mobile.html");
  }

  async function handleCvFileSelected(){
    try{
      const input = $("cvFile");
      const file = input && input.files && input.files[0] ? input.files[0] : null;
      if (!file) return;
      try{ input.value = ""; }catch(_){}
      await uploadCvThenAutoOcr(file);
    }catch(e){
      setBadge("cvStatusBadge", "bad", "Upload failed");
      setProgress(false, 0, "", "");
      showTopError(e?.message || String(e));
    }
  }

  async function handleRetryOcr(){
    clearTopError();
    const btn = $("retryOcrBtn");
    if (btn) btn.disabled = true;

    try{
      const res = await apiGet("/me/cv", OCR_STATUS_TIMEOUT_MS);
      const cv = res && res.cv ? res.cv : null;
      const fileLabel = String(cv && (cv.cv_filename || cv.cv_path) ? (cv.cv_filename || cv.cv_path) : "").trim();
      const isPdf = storedCvSupportsPdf(cv);
      if (!fileLabel) throw new Error("No CV found. Please upload a PDF first.");
      if (!isPdf){
        throw new Error("Please upload a PDF version of your CV to run OCR.");
      }

      setBadge("cvStatusBadge", "warn", "Starting OCR…");
      setProgress(true, 40, "Starting OCR…", "We are extracting text from your PDF.");
      setText("ocrHint", "Starting OCR…");
      showRetryOcr(false);

      await apiPostJson("/me/cv/ocr", {}, OCR_STATUS_TIMEOUT_MS);

      setBadge("cvStatusBadge", "warn", "OCR running…");
      setProgress(true, 55, "OCR in progress…", "We will update automatically.");
      setText("ocrHint", "OCR is running…");
      startOcrPolling({ startedAt: Date.now() });
    }catch(e){
      showRetryOcr(true);
      setBadge("cvStatusBadge", "bad", "OCR error");
      setProgress(false, 0, "", "");
      showTopError(e?.message || String(e));
    }finally{
      if (btn) btn.disabled = false;
    }
  }

  function wireCvDropzone(){
    const dz = $("cvDropzone");
    const input = $("cvFile");
    const browse = $("browseCvBtn");

    if (browse && input){
      browse.addEventListener("click", (e) => {
        e.preventDefault();
        try{ input.click(); }catch(_){}
      });
    }

    if (!dz) return;

    const openPicker = (e) => {
      try{
        if (e && e.target && e.target.closest && e.target.closest("button")) return;
      }catch(_){}
      if (input){
        try{ input.click(); }catch(_){}
      }
    };

    dz.addEventListener("click", openPicker);
    dz.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " "){
        e.preventDefault();
        openPicker(e);
      }
    });
    dz.addEventListener("dragover", (e) => {
      e.preventDefault();
      dz.classList.add("dragOver");
    });
    dz.addEventListener("dragleave", () => {
      dz.classList.remove("dragOver");
    });
    dz.addEventListener("drop", async (e) => {
      e.preventDefault();
      dz.classList.remove("dragOver");
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0] ? e.dataTransfer.files[0] : null;
      if (!file) return;
      try{
        await uploadCvThenAutoOcr(file);
      }catch(err){
        setBadge("cvStatusBadge", "bad", "Upload failed");
        setProgress(false, 0, "", "");
        showTopError(err?.message || String(err));
      }
    });
  }

  async function boot(){
    clearTopError();
    setContinueState(false);
    renderUploadFlow(false);
    setBadge("cvStatusBadge", "warn", "Checking…");
    setText("subLine", "Checking account…");

    if (!auth || typeof auth.getSession !== "function"){
      showTopError("auth.js did not load correctly.");
      setBadge("cvStatusBadge", "bad", "Error");
      return;
    }

    session = await auth.getSession();
    if (!session || !session.user || !session.user.email){
      try{ auth.rememberPostAuthRedirect?.(window.location.pathname + window.location.search + window.location.hash); }catch(_){}
      window.location.replace("./signup.html?entry=cv-studio");
      return;
    }

    setText("subLine", "Signed in as " + String(session.user.email || "").trim().toLowerCase() + ".");

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

    wireCvDropzone();
    $("cvFile")?.addEventListener("change", handleCvFileSelected);
    $("retryOcrBtn")?.addEventListener("click", handleRetryOcr);

    await loadCvStatusAndUpdateUx();
  }

  window.addEventListener("load", () => {
    boot().catch((e) => {
      showTopError(e?.message || String(e));
      setBadge("cvStatusBadge", "bad", "Error");
    });
  });
})();
