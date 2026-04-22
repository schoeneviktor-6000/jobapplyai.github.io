"use strict";

const S = window.JobMeJobShared || null;
const APP_CONFIG = window.JobMeJob?.config || window.JobApplyAI?.config || null;
const APP_AUTH = window.JobMeJob?.auth || window.JobApplyAI?.auth || null;
function getAppAuth(){
  return APP_AUTH || window.JobMeJob?.auth || window.JobApplyAI?.auth || null;
}
if (S && S.wireNavTransitions) { try { S.wireNavTransitions(); } catch {} }


const API_BASE = (APP_CONFIG && APP_CONFIG.API_BASE)
  || (S && S.resolveApiBase ? S.resolveApiBase("https://jobmejob.schoene-viktor.workers.dev") : "https://jobmejob.schoene-viktor.workers.dev");
const SUPABASE_URL = (APP_CONFIG && APP_CONFIG.SUPABASE_URL) || "https://awlzvhcnjegfhjedswko.supabase.co";
const SUPABASE_ANON_KEY = (APP_CONFIG && APP_CONFIG.SUPABASE_ANON_KEY) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3bHp2aGNuamVnZmhqZWRzd2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NTE2OTgsImV4cCI6MjA4MjIyNzY5OH0.-UmHiVi0_g9tKDkr6ldfROeBrOk8hm18YVPRfnb8luY";

const AI_CACHE_KEY="jm_ai_titles_cache_v1";
const AI_CACHE_KEY_OLD="ja_ai_titles_cache_v1";
const GMAIL_VERIFY_RESULT_KEY="jm_gmail_verify_result_v1";
const GMAIL_VERIFY_PENDING_KEY="jm_gmail_verify_pending";
const GMAIL_VERIFY_SCOPE="openid email profile https://www.googleapis.com/auth/gmail.send";
const LINKS = (APP_CONFIG && APP_CONFIG.LINKS) ? APP_CONFIG.LINKS : {};
const SUPPORT_EMAIL = "team@jobmejob.com";
const BILLING_PORTAL_LINK = String(LINKS.CV_STUDIO_PORTAL_URL || "").trim();
const PLAN_PAGE_URL = "./plan.html#cv-pricing";
const CV_STUDIO_CHOOSER_URL = "/cv?entry=chooser";
const CV_REALITY_CHECK_CACHE_KEY = "jm_cv_reality_check_v1";
const ENABLE_MATCHED_JOBS_ASSISTS = false;
const CV_PLAN_META = Object.freeze({
  free: { label:"Free", quota:"5 free CVs" },
  cv_starter: { label:"Starter", quota:"10 CVs / month" },
  cv_plus: { label:"Plus", quota:"50 CVs / month" },
  cv_unlimited: { label:"Unlimited", quota:"Unlimited CVs" }
});

let supabaseClient=null;
let session=null;
let state=null;

let ocrPollTimer=null;

let aiResult=null;
let aiSelectedTitles=new Set();
let aiGeneratedOnce=false;
let aiAppliedOnce=false;
let aiAppliedTitles=[];
let jobTitlesTouched=false;
let locationsTouched=false;
let jobsPrefetchInFlight=false;
let cvLocationHint=[];


let lastCvMeta=null;
let shouldFocusPostUploadCard=false;
let realityCheckResult=null;
let realityCheckKey="";
let realityCheckInFlight=false;

let backendAiTitles=[];
let aiAutoStarted=false;
let gmailVerifyInFlight=false;

function $(id){return document.getElementById(id);}
function setText(id,t){const el=$(id);if(el) el.textContent=t;}
function setHtml(id,h){const el=$(id);if(el) el.innerHTML=h;}
function showTopError(msg){
  if (S && S.showTopError) return S.showTopError("errorTop", msg);
  const el=$("errorTop"); if(!el) return; el.style.display="block"; el.textContent=String(msg||"");
}
function clearTopError(){
  if (S && S.showTopError) return S.showTopError("errorTop", "");
  const el=$("errorTop"); if(!el) return; el.style.display="none"; el.textContent="";
}

function escapeHtml(s){
const v=String(s??"");
return v.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

function setBadge(id,kind,text){
  if (S && S.setBadge) return S.setBadge(id, kind, text);
  const el=$(id);
  if(!el) return;
  el.className="badge"+(kind?(" "+kind):"");
  el.textContent=String(text??"");
}

function go(url){
  if (S && S.go) return S.go(url);
  setTimeout(()=>{window.location.href=url;},180);
}

function closeMatchedJobsPanel(){
  try{
    const prefsToggle=$("prefsToggle");
    if(prefsToggle) prefsToggle.open=false;
  }catch(_){}
}

function isEmail(s){
const v=String(s||"").trim();
return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

const LS = {
userEmail: ["jm_user_email","ja_user_email"],
customerId: ["jm_customer_id","ja_customer_id"],
profileDone: ["jm_profile_complete","ja_profile_complete"],
plan: ["jm_plan","ja_plan"],
workplace: ["jobmejob_workplace","jobapplyai_workplace"]
};

function normalizePlanId(value){
const raw=String(value||"").trim().toLowerCase();
if(!raw) return "";
if(raw==="starter"||raw==="cv_starter") return "cv_starter";
if(raw==="plus"||raw==="cv_plus") return "cv_plus";
if(raw==="unlimited"||raw==="cv_unlimited") return "cv_unlimited";
if(raw==="free") return "free";
return raw;
}

function planIdFromState(st){
const directCandidates=[
  st?.cv_plan_id,
  st?.cv_studio_plan_id,
  st?.cvstudio_plan_id,
  st?.entitlements?.cv_plan_id,
  st?.entitlements?.cv_studio_plan_id
];
for(const candidate of directCandidates){
  const pid=normalizePlanId(candidate);
  if(pid) return pid;
}

const fallback=String(st?.plan_id || "").trim().toLowerCase();
if(fallback==="cv_starter" || fallback==="cv_plus" || fallback==="cv_unlimited" || fallback==="free"){
  return fallback;
}
return "";
}

function planLabelFromId(planId){
const pid=normalizePlanId(planId) || "free";
return (CV_PLAN_META[pid] && CV_PLAN_META[pid].label) || "Paid";
}

function quotaLabelFromPlanId(planId){
const pid=normalizePlanId(planId) || "free";
return (CV_PLAN_META[pid] && CV_PLAN_META[pid].quota) || "Monthly CV plan";
}

function storedCvPlanId(){
const raw=String(lsGetFirst(LS.plan) || "").trim().toLowerCase();
if(raw==="cv_starter" || raw==="cv_plus" || raw==="cv_unlimited" || raw==="free"){
  return raw;
}
return "";
}

function firstNumber(){
for(let i=0;i<arguments.length;i+=1){
  const value=arguments[i];
  if(value===null || value===undefined || value==="") continue;
  const n=Number(value);
  if(Number.isFinite(n)) return n;
}
return null;
}

function formatCurrencyMinor(amountMinor, currency){
const amount=Number(amountMinor);
const code=String(currency||"EUR").trim().toUpperCase() || "EUR";
if(!Number.isFinite(amount)) return "—";
try{
  return new Intl.NumberFormat(undefined, { style:"currency", currency:code }).format(amount / 100);
}catch(_){
  return (amount / 100).toFixed(2) + " " + code;
}
}

function formatDateShort(value){
try{
  if(!value) return "—";
  const d=new Date(value);
  if(!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year:"numeric", month:"short", day:"numeric" });
}catch(_){
  return "—";
}
}

function supportFallback(subject, body){
const params=new URLSearchParams();
params.set("subject", String(subject || "jobmejob support"));
if(body) params.set("body", String(body));
return "mailto:" + SUPPORT_EMAIL + "?" + params.toString();
}

function lsGetFirst(keys){
for(const k of keys){
const v=localStorage.getItem(k);
if(v !== null && v !== undefined && v !== "") return v;
}
return null;
}
function lsSetAll(keys, value){
const key = Array.isArray(keys) && keys.length ? keys[0] : "";
if(!key) return;
try{ localStorage.setItem(key, value); }catch(_){}
}
function lsRemoveAll(keys){
for(const k of keys){
try{ localStorage.removeItem(k); }catch(_){}
}
}

function resetLocalStateForNewUser(currentEmail){
const last=(lsGetFirst(LS.userEmail)||"").trim().toLowerCase();
const now=(currentEmail||"").trim().toLowerCase();
if(!now) return;
if(last && last!==now){
Object.keys(localStorage).forEach(k=>{
if(k.startsWith("ja_") || k.startsWith("jobapplyai_") || k.startsWith("jm_") || k.startsWith("jobmejob_") || k.startsWith("sb-")){
localStorage.removeItem(k);
}
});
try{sessionStorage.removeItem("sb_access_token");}catch{}
}
lsSetAll(LS.userEmail, now);
}

const FETCH_TIMEOUT_MS = 35000;
const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes for mobile uploads
const OCR_STATUS_TIMEOUT_MS = 60000; // 60s


function toNetworkError(path, e){
  const msg = (e && e.message) ? String(e.message) : String(e||"");
  // Browsers often throw a TypeError with message "Failed to fetch" for CORS / blocked / offline.
  if(String(msg).toLowerCase().includes("failed to fetch") || String(msg).toLowerCase().includes("network")){
    return new Error(
      path + " failed: network error (Failed to fetch). " +
      "This is usually caused by CORS (API must handle OPTIONS + Access-Control-Allow-Origin), " +
      "a blocker/Private DNS blocking workers.dev, or a flaky connection."
    );
  }
  return new Error(path + " failed: " + msg);
}

async function fetchWithTimeout(url, options, timeoutMs){
  const ms = Number(timeoutMs) || FETCH_TIMEOUT_MS;

  // Older browsers: no AbortController support
  if(typeof AbortController === "undefined"){
    return await fetch(url, options||{});
  }

  const ctrl = new AbortController();
  const t = setTimeout(()=>{ try{ ctrl.abort("timeout"); }catch{} }, ms);
  try{
    return await fetch(url, { ...(options||{}), signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function toErrorMessage(path, res, json, text){
  const detail = (json && (json.error || json.details || json.message))
    ? (json.error || json.details || json.message)
    : "";
  const body = String(detail || text || "").trim();
  const clipped = body ? body.slice(0, 300) : "";
  return path + " failed: " + res.status + (clipped ? (" — " + clipped) : "");
}

async function apiGet(path){
  let res;
  try{
    res=await fetchWithTimeout(API_BASE+path,{
      method:"GET",
      headers:{Authorization:"Bearer "+session.access_token},
      cache:"no-store"
    }, (path==="/me/cv/ocr/status" ? OCR_STATUS_TIMEOUT_MS : FETCH_TIMEOUT_MS));
  }catch(e){
    throw toNetworkError(path, e);
  }
  const text=await res.text().catch(()=> "");
  let json=null;
  try{json=JSON.parse(text);}catch{json={raw:text};}
  if(!res.ok) throw new Error(toErrorMessage(path, res, json, text));
  return json;
}

async function apiPostJson(path,body){
  let res;
  try{
    res=await fetchWithTimeout(API_BASE+path,{
      method:"POST",
      headers:{Authorization:"Bearer "+session.access_token,"content-type":"application/json"},
      body:JSON.stringify(body||{})
    });
  }catch(e){
    throw toNetworkError(path, e);
  }
  const text=await res.text().catch(()=> "");
  let json=null;
  try{json=JSON.parse(text);}catch{json={raw:text};}
  if(!res.ok) throw new Error(toErrorMessage(path, res, json, text));
  return json;
}

async function saveAiTitlesToBackend(titles){
  try{
    const clean = Array.isArray(titles)
      ? titles.map(t=>String(t||"").trim()).filter(Boolean).slice(0, 30)
      : [];
    if(!clean.length) return { ok:false, saved:0 };

    // Persist AI titles so Dashboard can reliably use "AI titles only"
    const resp = await apiPostJson("/me/ai-titles/save", { ai_titles: clean });
    return resp || { ok:true, saved: clean.length };
  }catch(e){
    // Non-blocking: AI suggestions should still show even if persistence fails
    return { ok:false, error: e && e.message ? e.message : String(e) };
  }
}


async function apiPostForm(path,formData){
  let res;
  try{
    res=await fetchWithTimeout(API_BASE+path,{
      method:"POST",
      headers:{Authorization:"Bearer "+session.access_token},
      body:formData
    }, (path==="/me/cv" ? UPLOAD_TIMEOUT_MS : FETCH_TIMEOUT_MS));
  }catch(e){
    throw toNetworkError(path, e);
  }
  const text=await res.text().catch(()=> "");
  let json=null;
  try{json=JSON.parse(text);}catch{json={raw:text};}
  if(!res.ok) throw new Error(toErrorMessage(path, res, json, text));
  return json;
}

async function ensureCustomer(email, accessToken){
const headers={"content-type":"application/json"};
if(accessToken) headers.Authorization="Bearer "+accessToken;
const res=await fetch(API_BASE+"/customers/upsert",{method:"POST",headers,body:JSON.stringify({email})});
const text=await res.text().catch(()=> "");
if(!res.ok) throw new Error("customers/upsert failed: "+res.status+" "+text);
const data=JSON.parse(text);
if(data && data.customer_id) lsSetAll(LS.customerId, data.customer_id);
return data;
}

function parseCsv(s,limit){
return String(s||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,limit||30);
}


function lsSafeGet(k){
  try{ return localStorage.getItem(k); }catch(_){ return null; }
}
function lsSafeSet(k, v){
  try{ localStorage.setItem(k, String(v)); }catch(_){}
}

function ssSafeGet(k){
  try{ return sessionStorage.getItem(k); }catch(_){ return null; }
}

function ssSafeSet(k, v){
  try{ sessionStorage.setItem(k, String(v)); }catch(_){}
}

function ssSafeRemove(k){
  try{ sessionStorage.removeItem(k); }catch(_){}
}

function toast(kind, title, message){
  try{
    if(S && typeof S.toast === "function"){
      S.toast(String(message || ""), { kind: kind || "good", title: title || "" });
    }
  }catch(_){}
}

function billingBadgeInfo(summary, paid){
  const status=String(summary?.subscription?.status || "").trim().toLowerCase();
  const cancelAtPeriodEnd=summary?.subscription?.cancel_at_period_end === true;

  if(status==="active"){
    return cancelAtPeriodEnd
      ? { kind:"warn", label:"Cancelling" }
      : { kind:"good", label:"Active" };
  }
  if(status==="trialing") return { kind:"good", label:"Trial" };
  if(status==="past_due") return { kind:"warn", label:"Past due" };
  if(status==="unpaid") return { kind:"bad", label:"Unpaid" };
  if(status==="canceled") return { kind:"bad", label:"Canceled" };
  if(paid) return { kind:"good", label:"Paid" };
  return { kind:"warn", label:"Free" };
}

function renderBillingInvoices(invoices){
  const section=$("billingInvoicesSection");
  const list=$("billingInvoicesList");
  if(!section || !list) return;

  const rows=Array.isArray(invoices) ? invoices.slice(0,4) : [];
  if(!rows.length){
    section.style.display="none";
    list.innerHTML="";
    return;
  }

  section.style.display="grid";
  list.innerHTML=rows.map((invoice)=>{
    const invoiceId=String(invoice?.number || invoice?.id || "Invoice").trim();
    const createdLabel=formatDateShort(invoice?.paid_at || invoice?.created_at || invoice?.period_end || invoice?.period_start);
    const amountLabel=formatCurrencyMinor(firstNumber(invoice?.amount_paid, invoice?.amount_due, 0), invoice?.currency || "EUR");
    const statusLabel=String(invoice?.status || "open").trim().replace(/_/g, " ");
    const href=String(invoice?.invoice_pdf || invoice?.hosted_invoice_url || "").trim();
    const actionLabel=invoice?.invoice_pdf ? "Download PDF" : "Open";

    return (
      '<div class="invoiceItem">'
        + '<div class="invoiceCopy">'
          + '<div class="invoiceTitle">' + escapeHtml(invoiceId) + '</div>'
          + '<div class="invoiceMeta">' + escapeHtml(amountLabel) + ' • ' + escapeHtml(createdLabel) + ' • ' + escapeHtml(statusLabel) + '</div>'
        + '</div>'
        + (
          href
            ? ('<a class="btn small invoiceAction" href="' + escapeHtml(href) + '" target="_blank" rel="noopener">')
                + escapeHtml(actionLabel)
              + '</a>'
            : '<span class="badge">' + escapeHtml(statusLabel) + '</span>'
        )
      + '</div>'
    );
  }).join("");
}

function renderBillingSummary(summary){
  const planId=normalizePlanId(
    summary?.subscription?.plan_id ||
    summary?.cv_plan_id ||
    planIdFromState(state) ||
    storedCvPlanId() ||
    "free"
  ) || "free";
  const paid=!!(summary?.cv_paid === true || (planId && planId !== "free"));
  const limit=firstNumber(summary?.cv_quota_limit, state?.cv_quota_limit, state?.entitlements?.cv_quota_limit);
  const used=firstNumber(summary?.cv_quota_used, state?.cv_quota_used, state?.entitlements?.cv_quota_used, paid ? 0 : state?.cv_free_used, paid ? 0 : state?.entitlements?.cv_free_used);
  const remaining=(limit !== null && used !== null) ? Math.max(0, limit - used) : null;
  const invoices=Array.isArray(summary?.invoices) ? summary.invoices : [];
  const portalEnabled=summary?.billing?.portal_enabled === true || !!BILLING_PORTAL_LINK;
  const badge=billingBadgeInfo(summary, paid);
  const subscription=summary?.subscription || null;
  const renewsAt=subscription?.current_period_end || null;
  const cancelsAt=subscription?.cancel_at || (subscription?.cancel_at_period_end ? renewsAt : null);

  setBadge("billingStatusBadge", badge.kind, badge.label);
  setText("billingPlanValue", paid ? planLabelFromId(planId) : "Free");
  setText(
    "billingUsageValue",
    limit === 0
      ? "Unlimited"
      : (remaining !== null ? (String(remaining) + " left") : quotaLabelFromPlanId(planId))
  );
  setText(
    "billingCycleValue",
    subscription?.cancel_at_period_end && cancelsAt
      ? ("Ends " + formatDateShort(cancelsAt))
      : (subscription?.status === "trialing" && subscription?.trial_end)
        ? ("Trial until " + formatDateShort(subscription.trial_end))
        : renewsAt
          ? ("Renews " + formatDateShort(renewsAt))
          : (paid ? "Paid plan" : "Free plan")
  );
  setText("billingInvoiceValue", invoices.length ? (String(invoices.length) + " recent") : (paid ? "None yet" : "—"));
  renderBillingInvoices(invoices);

  const usageText = limit === 0
    ? "Unlimited."
    : (remaining !== null && used !== null)
      ? (String(used) + " of " + String(limit) + " used.")
      : quotaLabelFromPlanId(planId) + ".";

  let summaryText = paid
    ? (planLabelFromId(planId) + ". " + usageText)
    : "Free plan.";

  if(subscription?.cancel_at_period_end && cancelsAt){
    summaryText = planLabelFromId(planId) + " until " + formatDateShort(cancelsAt) + ".";
  } else if(subscription?.status === "past_due"){
    summaryText = "Payment issue. Open billing.";
  } else if(subscription?.status === "unpaid"){
    summaryText = "Billing issue. Open billing.";
  } else if(summary?.provider_error){
    summaryText += " Stripe details are delayed.";
  }

  setText("billingSummaryText", summaryText);
  setText(
    "billingFooterHint",
    portalEnabled
      ? "Open Stripe to manage plan and invoices."
      : "Billing help is available by email."
  );

  const manageBtn=$("billingManageBtn");
  if(manageBtn){
    manageBtn.textContent=portalEnabled ? "Manage billing" : "Billing help";
  }

  const plansBtn=$("billingPlansBtn");
  if(plansBtn){
    plansBtn.textContent=paid ? "Change plan" : "View plans";
    plansBtn.setAttribute("href", PLAN_PAGE_URL);
  }
}

async function refreshBillingSummary(){
  setBadge("billingStatusBadge","warn","Checking...");
  setText("billingPlanValue","—");
  setText("billingUsageValue","—");
  setText("billingCycleValue","—");
  setText("billingInvoiceValue","—");
  try{
    const summary=await apiGet("/me/billing/summary");
    renderBillingSummary(summary || {});
  }catch(e){
    renderBillingSummary({
      billing: { portal_enabled: !!BILLING_PORTAL_LINK },
      cv_paid: !!(planIdFromState(state) && planIdFromState(state) !== "free"),
      cv_plan_id: planIdFromState(state),
      cv_quota_limit: state?.cv_quota_limit,
      cv_quota_used: state?.cv_quota_used,
      provider_error: e && e.message ? e.message : String(e || "")
    });
  }
}

async function openBillingPortal(){
  const btn=$("billingManageBtn");
  if(btn) btn.disabled=true;

  const fallbackTarget = BILLING_PORTAL_LINK || supportFallback(
    "CV Studio billing support",
    "Hi jobmejob team,\n\nI need help with my CV Studio subscription, cancellation, or invoices.\n\nThanks."
  );

  try{
    const data=await apiPostJson("/me/billing/portal",{});
    if(data && data.url){
      window.location.href=data.url;
      return;
    }
  }catch(e){
    toast("warn","Billing", e?.message || "Billing portal unavailable right now.");
  }finally{
    if(btn) btn.disabled=false;
  }

  window.location.href=fallbackTarget;
}

function readJsonStorage(key){
  try{
    const raw = lsSafeGet(key);
    if(!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  }catch(_){
    return null;
  }
}

function writeJsonStorage(key, value){
  try{ lsSafeSet(key, JSON.stringify(value || {})); }catch(_){}
}

function clearGmailVerifyPending(){
  ssSafeRemove(GMAIL_VERIFY_PENDING_KEY);
}

function hasGmailVerifyMarker(){
  try{
    const url = new URL(window.location.href);
    return url.searchParams.get("gmail_verify") === "1";
  }catch(_){
    return false;
  }
}

function clearGmailVerifyMarker(){
  try{
    const url = new URL(window.location.href);
    if(url.searchParams.get("gmail_verify") !== "1") return;
    url.searchParams.delete("gmail_verify");
    const next = url.pathname + (url.search ? url.search : "") + (url.hash ? url.hash : "");
    window.history.replaceState({}, document.title, next);
  }catch(_){}
}

function buildGmailVerifyRedirectUrl(){
  const url = new URL(window.location.href);
  url.searchParams.set("gmail_verify", "1");
  return url.toString();
}

function rememberGoogleProviderTokens(){
  try{
    const auth = getAppAuth();
    if(auth?.cacheGoogleProviderTokens && session){
      auth.cacheGoogleProviderTokens(session);
    }
  }catch(_){}
}

function getCachedGoogleProviderToken(){
  try{
    if(session && typeof session.provider_token === "string" && session.provider_token.trim()){
      return session.provider_token.trim();
    }
  }catch(_){}
  try{
    const auth = getAppAuth();
    if(auth?.getCachedGoogleProviderToken){
      const token = String(auth.getCachedGoogleProviderToken() || "").trim();
      if(token) return token;
    }
  }catch(_){}
  return String(ssSafeGet("jm_google_provider_token") || "").trim();
}

function getGmailVerifyProofForCurrentUser(){
  const proof = readJsonStorage(GMAIL_VERIFY_RESULT_KEY);
  const email = String(session?.user?.email || "").trim().toLowerCase();
  if(!proof || !email) return null;
  if(String(proof.email || "").trim().toLowerCase() !== email) return null;
  return proof;
}

function setGmailVerifyUi(mode, info){
  const badge = $("gmailStatusBadge");
  const hint = $("gmailHint");
  const metaEl = $("gmailMeta");
  const verifyBtn = $("gmailVerifyBtn");
  const sendAgainBtn = $("gmailSendAgainBtn");
  if(!badge || !hint || !metaEl || !verifyBtn || !sendAgainBtn) return;

  const details = info && typeof info === "object" ? info : {};
  const badgeKind = details.badgeKind || "";
  const badgeText = details.badgeText || "Not checked";
  const hintText = details.hint || "Connect Gmail and send a test email to yourself.";
  const metaText = details.meta || "";

  setBadge("gmailStatusBadge", badgeKind, badgeText);
  hint.textContent = hintText;
  metaEl.textContent = metaText;
  metaEl.style.display = metaText ? "block" : "none";

  verifyBtn.disabled = !!details.verifyDisabled;
  verifyBtn.textContent = details.verifyLabel || "Connect Gmail & send test";

  sendAgainBtn.style.display = details.showSendAgain ? "inline-flex" : "none";
  sendAgainBtn.disabled = !!details.sendAgainDisabled;

  if(mode === "checking"){
    verifyBtn.className = "btn";
  } else {
    verifyBtn.className = "btn primary";
  }
}

function refreshGmailVerifyUi(){
  const proof = getGmailVerifyProofForCurrentUser();
  const token = getCachedGoogleProviderToken();

  if(gmailVerifyInFlight){
    setGmailVerifyUi("checking", {
      badgeKind: "warn",
      badgeText: "Checking…",
      hint: "Sending a Gmail test message now. Please keep this tab open.",
      verifyLabel: "Working…",
      verifyDisabled: true,
      showSendAgain: false
    });
    return;
  }

  if(proof){
    const when = fmtWhen(proof.sent_at);
    const msgId = String(proof.message_id || "—");
    setGmailVerifyUi("verified", {
      badgeKind: "good",
      badgeText: "Verified",
      hint: "A test email was sent successfully. Check your inbox and Gmail Sent folder to confirm delivery.",
      meta: "Sent to " + String(proof.email || "—") + " at " + when + " · message " + msgId,
      verifyLabel: "Reconnect Gmail",
      showSendAgain: true,
      sendAgainDisabled: !token
    });
    return;
  }

  if(token){
    setGmailVerifyUi("ready", {
      badgeKind: "warn",
      badgeText: "Ready",
      hint: "Google access is available for this tab. Send a test email to confirm Gmail delivery.",
      verifyLabel: "Send Gmail test",
      showSendAgain: false
    });
    return;
  }

  setGmailVerifyUi("idle", {
    badgeKind: "warn",
    badgeText: "Not checked",
    hint: "Connect Gmail and send a test email to yourself. This confirms Gmail delivery end-to-end before you rely on it.",
    verifyLabel: "Connect Gmail & send test",
    showSendAgain: false
  });
}

function buildGmailMimeMessage(toEmail){
  const sentAt = new Date();
  const stamp = sentAt.toLocaleString();
  return [
    "To: " + toEmail,
    "Subject: jobmejob Gmail sending check",
    "Content-Type: text/plain; charset=UTF-8",
    "MIME-Version: 1.0",
    "",
    "This is a Gmail sending test from jobmejob.",
    "Time: " + stamp,
    "",
    "If this email reached your inbox and appears in Gmail Sent, your Gmail send path is working end-to-end."
  ].join("\r\n");
}

function base64UrlEncodeUtf8(text){
  const bytes = new TextEncoder().encode(String(text || ""));
  let binary = "";
  const chunkSize = 0x8000;
  for(let i = 0; i < bytes.length; i += chunkSize){
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function gmailErrorMessage(res, payload, text){
  const googleMessage =
    (payload && payload.error && payload.error.message)
      ? String(payload.error.message)
      : String(text || "").trim();

  if(res.status === 401){
    return "Google access expired. Reconnect Gmail and try again.";
  }
  if(res.status === 403){
    return "Google denied Gmail send access. Reconnect Gmail and approve the Gmail permission.";
  }
  return googleMessage || ("HTTP " + res.status);
}

async function sendGmailTestEmail(providerToken, recipientEmail){
  const raw = base64UrlEncodeUtf8(buildGmailMimeMessage(recipientEmail));
  let res;
  try{
    res = await fetchWithTimeout("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + providerToken,
        "content-type": "application/json"
      },
      body: JSON.stringify({ raw })
    }, 45000);
  }catch(e){
    throw new Error("Gmail send failed: network error. Please retry.");
  }

  const text = await res.text().catch(()=> "");
  let payload = null;
  try{ payload = JSON.parse(text); }catch(_){ payload = null; }

  if(!res.ok){
    throw new Error("Gmail send failed: " + gmailErrorMessage(res, payload, text));
  }

  return payload && typeof payload === "object" ? payload : {};
}

async function runGmailVerification(){
  const email = String(session?.user?.email || "").trim().toLowerCase();
  const token = getCachedGoogleProviderToken();
  if(!email) throw new Error("Signed-in email is missing.");
  if(!token) throw new Error("Google access token is missing. Reconnect Gmail and try again.");

  gmailVerifyInFlight = true;
  refreshGmailVerifyUi();

  try{
    const result = await sendGmailTestEmail(token, email);
    writeJsonStorage(GMAIL_VERIFY_RESULT_KEY, {
      email,
      sent_at: new Date().toISOString(),
      message_id: result.id || null,
      thread_id: result.threadId || null,
      provider: "google",
      via: "gmail_api_browser"
    });
    clearGmailVerifyPending();
    clearGmailVerifyMarker();
    refreshGmailVerifyUi();
    toast("good", "Gmail verified", "Test email sent to " + email + ".");
    return result;
  } catch (e){
    clearGmailVerifyPending();
    clearGmailVerifyMarker();
    try{ localStorage.removeItem(GMAIL_VERIFY_RESULT_KEY); }catch(_){}
    refreshGmailVerifyUi();
    throw e;
  } finally {
    gmailVerifyInFlight = false;
    refreshGmailVerifyUi();
  }
}

async function startGmailOAuthFlow(){
  const auth = getAppAuth();
  if(!auth || typeof auth.loginWithGoogle !== "function"){
    throw new Error("Google auth helper is unavailable.");
  }
  try{
    auth.rememberPostAuthRedirect?.(buildGmailVerifyRedirectUrl());
  }catch(_){}

  ssSafeSet(GMAIL_VERIFY_PENDING_KEY, "1");
  setGmailVerifyUi("checking", {
    badgeKind: "warn",
    badgeText: "Redirecting…",
    hint: "Redirecting to Google so you can approve Gmail send access.",
    verifyLabel: "Redirecting…",
    verifyDisabled: true
  });

  await auth.loginWithGoogle({
    redirectTo: window.location.origin + "/",
    scopes: GMAIL_VERIFY_SCOPE,
    queryParams: {
      prompt: "consent",
      include_granted_scopes: "true"
    }
  });
}

async function handleGmailVerifyClick(){
  clearTopError();
  const proof = getGmailVerifyProofForCurrentUser();
  if(proof){
    await startGmailOAuthFlow();
    return;
  }

  if(getCachedGoogleProviderToken()){
    await runGmailVerification();
    return;
  }

  await startGmailOAuthFlow();
}

async function handleGmailSendAgainClick(){
  clearTopError();
  if(getCachedGoogleProviderToken()){
    await runGmailVerification();
    return;
  }
  await startGmailOAuthFlow();
}

async function maybeFinishPendingGmailVerify(){
  rememberGoogleProviderTokens();
  if(!hasGmailVerifyMarker() && ssSafeGet(GMAIL_VERIFY_PENDING_KEY) !== "1"){
    refreshGmailVerifyUi();
    return;
  }

  if(!getCachedGoogleProviderToken()){
    clearGmailVerifyPending();
    clearGmailVerifyMarker();
    setGmailVerifyUi("failed", {
      badgeKind: "bad",
      badgeText: "Token missing",
      hint: "Google returned without a Gmail access token. Reconnect Gmail and approve the Gmail permission.",
      verifyLabel: "Reconnect Gmail",
      showSendAgain: false
    });
    return;
  }

  try{
    await runGmailVerification();
  }catch(e){
    showTopError(e?.message || String(e));
  }
}

function maybeAutofillJobTitlesFromAi(titles){
  try{
    if(jobTitlesTouched) return false;
    const el = $("jobTitles");
    if(!el) return false;

    const current = parseCsv(el.value, 30);
    if(current.length) return false;

    const clean = Array.isArray(titles) ? titles.map(t=>String(t||"").trim()).filter(Boolean) : [];
    const pick = clean.slice(0, 6);
    if(!pick.length) return false;

    el.value = pick.join(", ");

    aiAppliedOnce = true;
    aiAppliedTitles = pick.slice(0, 12);
    renderAiAppliedChips(aiAppliedTitles);

    markPrefsDirty();
scheduleAutoSave();
    return true;
  }catch(_){
    return false;
  }
}


function setJobsPrefetchUI(state, info){
  const badge=$("jobsPrefetchBadge");
  const row=$("jobsPrefetchRow");
  const textEl=$("jobsPrefetchText");
  if(!badge || !row || !textEl) return;

  const s=String(state||"").toLowerCase();

  if(s==="running"){
    badge.style.display="inline-flex";
    badge.className="badge warn";
    badge.textContent="Fetching jobs…";
    row.style.display="flex";
    textEl.textContent = (info && info.text) ? String(info.text) : "Fetching matched jobs in the background…";
    return;
  }

  if(s==="ready"){
    const n = info && Number.isFinite(info.count) ? Number(info.count) : null;
    if(n !== null && n > 0){
      badge.style.display="inline-flex";
      badge.className="badge good";
      badge.textContent = n + " jobs ready";
    }else{
      // No new jobs added → don't clutter UI
      badge.style.display="none";
    }
    row.style.display="none";
    return;
  }

  if(s==="pending"){
    badge.style.display="inline-flex";
    badge.className="badge warn";
    badge.textContent="Jobs pending";
    row.style.display="none";
    return;
  }

  // idle
  badge.style.display="none";
  row.style.display="none";
}

function renderClickChips(hostId, items, onClick){
  const host=$(hostId);
  if(!host) return;
  host.innerHTML="";
  const clean = Array.isArray(items) ? items.map(x=>String(x||"").trim()).filter(Boolean) : [];
  if(!clean.length) return;

  const wrap=document.createElement("div");
  wrap.className="chips";
  clean.forEach((label, idx)=>{
    const chip=document.createElement("div");
    chip.className="chip quick";
    chip.style.animationDelay = (idx * 35) + "ms";
    chip.textContent=label;
    chip.addEventListener("click", ()=>{
      try{ onClick && onClick(label); }catch(_){}
    });
    wrap.appendChild(chip);
  });
  host.appendChild(wrap);
}

const CITY_ALIASES = [
  { name:"Berlin", aliases:["berlin"] },
  { name:"Hamburg", aliases:["hamburg"] },
  { name:"München", aliases:["münchen","munchen","munich"] },
  { name:"Köln", aliases:["köln","koeln","cologne"] },
  { name:"Frankfurt", aliases:["frankfurt","frankfurt am main"] },
  { name:"Stuttgart", aliases:["stuttgart"] },
  { name:"Düsseldorf", aliases:["düsseldorf","dusseldorf"] },
  { name:"Leipzig", aliases:["leipzig"] },
  { name:"Dresden", aliases:["dresden"] },
  { name:"Nürnberg", aliases:["nürnberg","nurnberg","nuernberg","nuremberg"] },
  { name:"Hannover", aliases:["hannover"] },
  { name:"Bremen", aliases:["bremen"] },
  { name:"Dortmund", aliases:["dortmund"] },
  { name:"Essen", aliases:["essen"] },
  { name:"Bonn", aliases:["bonn"] },
  { name:"Mannheim", aliases:["mannheim"] },
  { name:"Karlsruhe", aliases:["karlsruhe"] },
  { name:"Freiburg", aliases:["freiburg"] },
  { name:"Heidelberg", aliases:["heidelberg"] }
];

function normalizeLocationString(s){
  let v = String(s||"").trim();
  if(!v) return "";
  v = v.replace(/\s+/g," ");
  v = v.split("|")[0].trim();
  v = v.split("·")[0].trim();
  // Remove trailing country tokens
  v = v.replace(/,\s*(germany|deutschland|de)\s*$/i, "");
  // Keep first segment (city)
  const first = v.split(",")[0].trim();
  return first;
}

function findCitiesInText(s){
  const t = String(s||"").toLowerCase();
  const out = [];
  for(const c of CITY_ALIASES){
    if(out.includes(c.name)) continue;
    for(const a of c.aliases){
      if(t.includes(a)){
        out.push(c.name);
        break;
      }
    }
  }
  return out;
}

function deriveLocationHintsFromAiResult(r){
  const out = [];

  try{
    const rawCandidates = [];

    // Common keys (best-effort, backend may change)
    if(r){
      if(Array.isArray(r.locations)) rawCandidates.push(...r.locations);
      if(typeof r.location === "string") rawCandidates.push(r.location);
      if(typeof r.city === "string") rawCandidates.push(r.city);
      if(typeof r.current_location === "string") rawCandidates.push(r.current_location);
      if(typeof r.base_location === "string") rawCandidates.push(r.base_location);

      if(r.contact){
        if(typeof r.contact.location === "string") rawCandidates.push(r.contact.location);
        if(typeof r.contact.city === "string") rawCandidates.push(r.contact.city);
      }
      if(r.profile){
        if(typeof r.profile.location === "string") rawCandidates.push(r.profile.location);
        if(typeof r.profile.city === "string") rawCandidates.push(r.profile.city);
      }

      if(typeof r.summary === "string") rawCandidates.push(r.summary);
    }

    // Normalize location-like strings and scan for cities
    for(const cand of rawCandidates){
      const norm = normalizeLocationString(cand);
      const cities = findCitiesInText(norm);
      if(cities.length){
        out.push(...cities);
        continue;
      }

      // If norm looks like a city (single word, capitalized), use it cautiously
      if(norm && norm.length <= 32 && /^[A-Za-zÀ-ž\-\s]+$/.test(norm)){
        out.push(norm);
      }
    }

    // De-dup, keep first 3
    const uniq = [];
    for(const x of out){
      const v = String(x||"").trim();
      if(!v) continue;
      if(uniq.map(z=>z.toLowerCase()).includes(v.toLowerCase())) continue;
      uniq.push(v);
      if(uniq.length >= 3) break;
    }
    return uniq;
  }catch(_){
    return [];
  }
}

function setLocationSuggestionUI(list){
  const wrap=$("locSuggestWrap");
  const btn=$("useCvLocationBtn");
  if(!wrap) return;

  const cities = Array.isArray(list) ? list.map(x=>String(x||"").trim()).filter(Boolean) : [];
  cvLocationHint = cities.slice(0,3);

  if(!cities.length){
    wrap.style.display="none";
    if(btn) btn.style.display="none";
    return;
  }

  wrap.style.display="block";
  renderClickChips("locSuggestChips", cities, (label)=>{
    applyLocation(label, { source:"cv", append:false });
  });

  if(btn){
    btn.style.display="inline-flex";
    btn.onclick = (e)=>{
      e.preventDefault();
      applyLocation(cities[0], { source:"cv", append:false });
    };
  }
}

function applyLocation(label, opts){
  opts = opts || {};
  const el=$("locations");
  if(!el) return;

  const val = String(label||"").trim();
  if(!val) return;

  const current = parseCsv(el.value, 20);

  let next = [];
  if(opts.append){
    next = [...new Set([...current, val])].slice(0, 20);
  }else{
    next = [val, ...current.filter(x=>x.toLowerCase() !== val.toLowerCase())].slice(0, 20);
  }

  el.value = next.join(", ");
  locationsTouched = true;

  try{ if(opts && opts.source === "cv"){ const b=$("useCvLocationBtn"); if(b) b.style.display = "none"; } }catch(_){ }

  markPrefsDirty();
scheduleAutoSave();
}

async function maybePrefetchJobs(aiTitles, reason){
  if(!ENABLE_MATCHED_JOBS_ASSISTS) return;
  const titles = Array.isArray(aiTitles) ? aiTitles.map(t=>String(t||"").trim()).filter(Boolean) : [];
  if(!titles.length) return;

  if(jobsPrefetchInFlight) return;
  jobsPrefetchInFlight = true;

  try{
    // Rate limit (avoid spamming the worker)
    const now = Date.now();
    const last = Number(lsSafeGet("jm_jobs_prefetch_ts") || "0");
    const minMs = 6 * 60 * 60 * 1000; // 6h
    if(last && (now - last) < minMs) return;

    if(!session || !session.access_token) return;

    setJobsPrefetchUI("running", { text: "Fetching matched jobs based on your CV… (background)" });

    const fetch_mode = (state && state.profile_complete) ? "profile" : "ai_only";

    const resp = await apiPostJson("/me/jobs/fetch", {
      include_ai_titles: true,
      ai_titles: titles.slice(0, 12),
      fetch_mode,
      reason: String(reason || "profile_autofetch")
    });

    // Only set the rate-limit timestamp when the request actually happened
    lsSafeSet("jm_jobs_prefetch_ts", String(now));

    const added = (resp && typeof resp.jobs_added === "number") ? resp.jobs_added : 0;

    setJobsPrefetchUI("ready", { count: Number(added) });

    if(added > 0){
      toast("good", "Jobs ready", "Fetched " + added + " matched jobs in the background.");
    }
  }catch(_){
    // keep UI calm (do not scare the user)
    setJobsPrefetchUI("pending");
  }finally{
    jobsPrefetchInFlight = false;
  }
}


function wireCvDropzone(){
  const dz = $("cvDropzone");
  const input = $("cvFile");
  const browse = $("browseCvBtn");

  if(browse && input){
    browse.addEventListener("click", (e)=>{
      e.preventDefault();
      try{ input.click(); }catch(_){}
    });
  }

  if(!dz) return;

  const openPicker = (e)=>{
    try{
      if(e && e.target && e.target.closest && e.target.closest("button")) return;
    }catch(_){}
    if(input){ try{ input.click(); }catch(_){ } }
  };

  dz.addEventListener("click", openPicker);
  dz.addEventListener("keydown", (e)=>{
    if(e.key === "Enter" || e.key === " "){
      e.preventDefault();
      openPicker(e);
    }
  });

  dz.addEventListener("dragover", (e)=>{
    e.preventDefault();
    dz.classList.add("dragOver");
  });
  dz.addEventListener("dragleave", ()=>{
    dz.classList.remove("dragOver");
  });
  dz.addEventListener("drop", async (e)=>{
    e.preventDefault();
    dz.classList.remove("dragOver");
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0] ? e.dataTransfer.files[0] : null;
    if(!file) return;

    try{
      jobTitlesTouched=false;
      aiAppliedTitles=[];
      renderAiAppliedChips(aiAppliedTitles);
      await uploadCvThenAutoOcr(file);
    }catch(err){
      setBadge("cvStatusBadge","bad","Upload failed");
      setProgress(false, 0, "", "");
      showTopError(err?.message || String(err));
    }
  });
}

async function maybeAutoGenerateAiTitles(reason){
  if(!ENABLE_MATCHED_JOBS_ASSISTS) return;
  try{
    if(aiAutoStarted) return;
    if(!lastCvMeta) return;

    // If suggestions already exist in UI, just prefetch jobs and stop.
    if(aiGeneratedOnce && aiResult && Array.isArray(aiResult.titles) && aiResult.titles.length){
      aiAutoStarted = true;
      try{ await maybePrefetchJobs(aiResult.titles, reason || "already"); }catch(_){ }
      return;
    }

    // Try cache first (fast)
    if(tryLoadCachedAiSuggestions()){
      aiAutoStarted = true;
      const t = (aiResult && Array.isArray(aiResult.titles)) ? aiResult.titles : [];
      if(t.length) await maybePrefetchJobs(t, reason || "cache");
      return;
    }

    // Cooldown per CV (avoid regenerating on every refresh)
    const key = cvMetaKey(lastCvMeta);
    const lastKey = lsSafeGet("jm_ai_autogen_cvkey") || "";
    const lastAt = Number(lsSafeGet("jm_ai_autogen_at") || "0");
    const minMs = 24 * 60 * 60 * 1000; // 24h

    if(lastKey === key && lastAt && (Date.now() - lastAt) < minMs){
      // Already tried recently; allow manual button.
      return;
    }

    lsSafeSet("jm_ai_autogen_cvkey", key);
    lsSafeSet("jm_ai_autogen_at", String(Date.now()));

    aiAutoStarted = true;

    setBadge("aiStatusBadge","warn","Auto…");
    setText("aiHint","Generating roles…");

    const titles = await handleAiGenerate({ force:false, background:true });
    const t = Array.isArray(titles) ? titles : ((aiResult && Array.isArray(aiResult.titles)) ? aiResult.titles : []);

    if(t.length){
      await maybePrefetchJobs(t, reason || "autogen");
    }else{
      // allow manual retry
      aiAutoStarted = false;
      setBadge("aiStatusBadge","warn","Manual");
      setText("aiHint","Auto-run missed. Click Generate roles.");
    }
  }catch(_){
    aiAutoStarted = false;
  }
}


function isPdfFile(file){
const name=String(file?.name||"").toLowerCase();
const type=String(file?.type||"").toLowerCase();
return name.endsWith(".pdf") || type==="application/pdf";
}

function setProgress(show, pct, text, hint){
$("cvProgressWrap").style.display = show ? "block" : "none";
$("cvProgressFill").style.width = Math.max(0, Math.min(100, Number(pct)||0)) + "%";
setText("cvProgressText", text || "");
setText("cvProgressHint", hint || "");
}

function stopOcrPolling(){
if(ocrPollTimer){clearInterval(ocrPollTimer);ocrPollTimer=null;}
}

// OCR polling configuration
const OCR_FAST_POLL_MS = 3500;
const OCR_SLOW_POLL_MS = 15000;
const OCR_SOFT_WAIT_MS = 3 * 60 * 1000;   // after this: show retry + slow polling
const OCR_HARD_WAIT_MS = 15 * 60 * 1000;  // after this: stop auto polling (user can retry manually)

let ocrPollInFlight=false;
let ocrPollTicks=0;

function showRetryOcr(show){
  const b=$("retryOcrBtn");
  if(!b) return;
  b.style.display = show ? "inline-flex" : "none";
}

function unlockAiWhileOcrRunning(){
  setBadge("aiStatusBadge","warn","OCR running…");
  $("aiGenerateBtn").disabled=false;
  $("aiApplyBtn").disabled=true;
  $("aiRegenerateLink").style.display="none";
  setText("aiHint","OCR is still running. You can wait or try now.");
}

function unlockAiFallback(msg){
  setBadge("aiStatusBadge","warn","Try anyway");
  $("aiGenerateBtn").disabled=false;
  $("aiApplyBtn").disabled=true;
  $("aiRegenerateLink").style.display="none";
  setText("aiHint", msg || "Try again now, or upload a PDF and retry OCR.");
}

function stopOcrPollingAndCleanup(){
  stopOcrPolling();
  ocrPollInFlight=false;
  ocrPollTicks=0;
}

function startOcrPolling(opts){
  opts = opts || {};
  const startedAt = (typeof opts.startedAt === "number" && Number.isFinite(opts.startedAt)) ? opts.startedAt : Date.now();
  let pollMs = OCR_FAST_POLL_MS;
  let slowMode = false;

  stopOcrPollingAndCleanup();

  async function tick(){
    if(ocrPollInFlight) return;
    ocrPollInFlight=true;
    ocrPollTicks++;

    const elapsed = Date.now() - startedAt;
    const pct = Math.min(95, 55 + Math.floor((elapsed / OCR_HARD_WAIT_MS) * 40));

    try{
      // Refresh onboarding status occasionally (avoid spamming)
      if(ocrPollTicks % 4 === 1){
        try{ await refreshState(); }catch(_){}
      }

      // Important: /me/cv/ocr/status "finalizes" OCR by fetching Vision output from GCS and storing text in DB.
      // Without calling it, cv_ocr_status can stay stuck on "processing" forever.
      if(ocrPollTicks % 2 === 1){
        try{ await apiGet("/me/cv/ocr/status"); }catch(_){ /* ignore transient errors; we will retry */ }
      }

      const res = await apiGet("/me/cv");
      const cv = res && res.cv ? res.cv : null;
      const s = String(cv?.cv_ocr_status||"").toLowerCase();

      if(s==="done"){
        stopOcrPollingAndCleanup();
        showRetryOcr(false);
        setProgress(false, 100, "", "");
        setBadge("cvStatusBadge","good","OCR done");
        setText("ocrHint","OCR done.");
        lastCvMeta=cvMetaFromCv(cv);
        unlockAiReady();
        tryLoadCachedAiSuggestions();
        maybeAutoGenerateAiTitles("ocr_done");
        return;
      }

      if(s==="failed"){
        stopOcrPollingAndCleanup();
        showRetryOcr(true);
        setProgress(false, 0, "", "");
        setBadge("cvStatusBadge","bad","OCR failed");
        setText("ocrHint","OCR failed: "+(cv?.cv_ocr_error||""));
        unlockAiFallback("OCR failed. Retry OCR or try roles anyway.");
        return;
      }

      // processing / idle / unknown
      if(elapsed > OCR_SOFT_WAIT_MS){
        showRetryOcr(true);
        setText("ocrHint","OCR is taking longer than usual.");
      }else{
        showRetryOcr(false);
        setText("ocrHint","OCR is running…");
      }

      setBadge("cvStatusBadge","warn","OCR running…");
      setProgress(true, pct, "OCR in progress…", "We will update automatically.");

      // Allow trying AI even while OCR runs
      unlockAiWhileOcrRunning();

      if(!slowMode && elapsed > OCR_SOFT_WAIT_MS){
        slowMode = true;
        // switch to slower polling
        if(ocrPollTimer){ clearInterval(ocrPollTimer); }
        ocrPollTimer = setInterval(tick, OCR_SLOW_POLL_MS);
      }

      if(elapsed > OCR_HARD_WAIT_MS){
        stopOcrPollingAndCleanup();
        showRetryOcr(true);
        setBadge("cvStatusBadge","warn","OCR delayed");
        setProgress(false, 0, "", "");
        setText("ocrHint","OCR is still processing.");
        unlockAiFallback("OCR is delayed. Retry OCR or try roles anyway.");
      }

    }catch(e){
      // Network/CORS flakiness: keep trying; do not hard-fail the UI.
      setBadge("cvStatusBadge","warn","Checking…");
      setProgress(true, pct, "Checking OCR status…", "If you are on mobile, this can fail due to network/CORS. We'll keep trying.");
      // Avoid spamming the top error box every tick.
      if(ocrPollTicks === 1 || (ocrPollTicks % 8 === 0)){
        showTopError(e.message||String(e));
      }
      if(elapsed > OCR_SOFT_WAIT_MS) showRetryOcr(true);
      unlockAiWhileOcrRunning();
    }finally{
      ocrPollInFlight=false;
    }
  }

  tick();
  ocrPollTimer = setInterval(tick, pollMs);
}


function markStep1DoneVisual(isDone){
const card=$("step1Card");
if(!card) return;
card.classList.toggle("stepDone", !!isDone);
}

function lockAi(msg){
setBadge("aiStatusBadge","warn","Locked");
$("aiGenerateBtn").disabled=true;
$("aiApplyBtn").disabled=true;
$("aiRegenerateLink").style.display="none";
aiResult=null;
aiSelectedTitles=new Set();
$("aiTitlesWrap").style.display="none";
setText("aiHint", msg || "Upload a CV first.");
aiGeneratedOnce=false;
aiAppliedOnce=false;
}

function unlockAiReady(){
setBadge("aiStatusBadge","good","Ready");
$("aiGenerateBtn").disabled=false;
$("aiApplyBtn").disabled=true;
$("aiRegenerateLink").style.display="none";
setText("aiHint","Ready to generate roles.");
aiGeneratedOnce=false;
aiAppliedOnce=false;
}

function renderChips(containerId, items, selectedSet){
const wrap=$(containerId);
wrap.style.display="block";
wrap.innerHTML="";
const chips=document.createElement("div");
chips.className="chips";
items.forEach((t, idx)=>{
const chip=document.createElement("div");
chip.className="chip"+(selectedSet && selectedSet.has(t) ? " selected" : "");
chip.style.animationDelay = (idx * 45) + "ms";
chip.textContent=t;
chip.addEventListener("click",()=>{
if(!selectedSet) return;
if(selectedSet.has(t)) selectedSet.delete(t); else selectedSet.add(t);
renderChips(containerId, items, selectedSet);
$("aiApplyBtn").disabled = selectedSet.size===0;
});
chips.appendChild(chip);
});
wrap.appendChild(chips);
}

function renderAiAppliedChips(titles){
const wrap=$("aiAppliedWrap");
const chipsHost=$("aiAppliedChips");
if(!wrap || !chipsHost) return;
if(!titles || !titles.length || jobTitlesTouched){
wrap.style.display="none";
chipsHost.innerHTML="";
return;
}
wrap.style.display="block";
chipsHost.innerHTML="";
const chips=document.createElement("div");
chips.className="chips";
titles.forEach((t, idx)=>{
const chip=document.createElement("div");
chip.className="chip aiTag";
chip.style.animationDelay = (idx * 35) + "ms";
chip.textContent=t;
chips.appendChild(chip);
});
chipsHost.appendChild(chips);
}

function setOnboardingUI(st){
const signed=!!(session && session.user && session.user.email);
setBadge("signedInBadge",signed?"good":"warn",signed?"Signed in":"Not signed in");
setText("kSigned",signed?"Yes":"No");
const customerId=st && st.customer_id ? String(st.customer_id) : (lsGetFirst(LS.customerId)||"");
setText("kCustomerId",customerId||"—");
const profOk=!!(st && st.profile_complete);
setText("kProfile",profOk?"Yes":"No");
$("kProfile").className="kpiVal "+(profOk?"ok":"bad");
const cvPlanId=planIdFromState(st) || "free";
const paidPlan=!!(cvPlanId && cvPlanId!=="free");
setText("kPlan",paidPlan?planLabelFromId(cvPlanId):"Free");
$("kPlan").className="kpiVal "+(paidPlan?"ok":"warn");
const cvOk=!!(st && st.cv_uploaded);
setText("kCv",cvOk?"Yes":"No");
$("kCv").className="kpiVal "+(cvOk?"ok":"warn");
const ocr=String(st && st.cv_ocr_status ? st.cv_ocr_status : "").toLowerCase();
if(ocr==="done"){
setText("kOcr","done");
$("kOcr").className="kpiVal ok";
}else if(ocr==="processing"){
setText("kOcr","processing");
$("kOcr").className="kpiVal warn";
}else if(ocr==="failed"){
setText("kOcr","failed");
$("kOcr").className="kpiVal bad";
}else{
setText("kOcr","idle");
$("kOcr").className="kpiVal warn";
}
// Next action (keep it simple): CV Studio is the core flow.
// If something is missing, we guide the user by scrolling to the right section.
const cvOk2 = !!(st && st.cv_uploaded);
const profOk2 = !!(st && st.profile_complete);

// Keep "Open CV Studio" gated behind CV upload (tailoring needs a base CV).
try{
  const openBtn = $("openCvBtn");
  if(openBtn){
    openBtn.disabled = !cvOk2;
    openBtn.textContent = cvOk2 ? "Tailor this CV to a job" : "Upload CV first";
  }
}catch(_){}

if(!cvOk2){
try{ $("continueBtn")?.classList.add("primary"); }catch(_){}
setText("continueBtn","Upload CV to start");
setText("continueHint","Upload a CV first.");
}else if(!profOk2){
try{ $("continueBtn")?.classList.remove("primary"); }catch(_){}
setText("continueBtn","Tailor this CV to a job");
setText("continueHint","Tailor this CV in CV Studio now. Match jobs stays optional.");
}else{
try{ $("continueBtn")?.classList.remove("primary"); }catch(_){}
setText("continueBtn","Tailor this CV to a job");
setText("continueHint","Tailor this CV in CV Studio now. Match jobs stays optional.");
}
}

async function refreshState(){
state=await apiGet("/me/state");
setOnboardingUI(state);
}

async function loadProfileIntoForm(){
try{
const prof=await apiGet("/me/profile");
const p=prof && prof.profile ? prof.profile : null;
if(!p) return;
const desired=Array.isArray(p.desired_titles)?p.desired_titles:[];
const industries=Array.isArray(p.industries)?p.industries:[];
const locations=Array.isArray(p.locations)?p.locations:[];
const countries=Array.isArray(p.countries_allowed)?p.countries_allowed:[];
const radius=p.radius_km;
$("jobTitles").value=desired.join(", ");
$("industries").value=industries.join(", ");
$("locations").value=locations.join(", ");
locationsTouched = locations.length ? true : false;
try{ if(locations.length){ setLocationSuggestionUI([]); } }catch(_){}

if(countries[0]) $("country").value=String(countries[0]);
if(radius!==null && radius!==undefined) $("radiusKm").value=String(radius);
setBadge("saveStatusBadge","good","Loaded");
}catch{}
}

function getAiCache(){
try{
let raw=localStorage.getItem(AI_CACHE_KEY);
if(!raw) raw=localStorage.getItem(AI_CACHE_KEY_OLD);
if(!raw) return null;
const v=JSON.parse(raw);
if(!v || typeof v !== "object") return null;
return v;
}catch{
return null;
}
}

function setAiCache(payload){
try{
  localStorage.setItem(AI_CACHE_KEY, JSON.stringify(payload));
}catch{}
}

function clearAiCache(){
try{localStorage.removeItem(AI_CACHE_KEY);}catch{}
try{localStorage.removeItem(AI_CACHE_KEY_OLD);}catch{}
}

function cvMetaFromCv(cv){
return {
cv_path: String(cv?.cv_path || ""),
cv_filename: String(cv?.cv_filename || ""),
cv_uploaded_at: String(cv?.cv_uploaded_at || ""),
cv_ocr_status: String(cv?.cv_ocr_status || ""),
cv_ocr_updated_at: String(cv?.cv_ocr_updated_at || ""),
cv_text_status: String(cv?.cv_text_status || "")
};
}

function cvMetaKey(meta){
return [
meta.cv_path,
meta.cv_filename,
meta.cv_uploaded_at,
meta.cv_ocr_status,
meta.cv_ocr_updated_at,
meta.cv_text_status
].join("|");
}

function storedCvHasReadyText(cv){
if(!cv || typeof cv !== "object") return false;
if(cv.cv_has_ready_text === true || cv.cv_has_text === true || cv.cv_has_ocr_text === true) return true;
const chars=Number(cv.cv_text_chars || cv.cv_ocr_text_chars || 0);
if(Number.isFinite(chars) && chars > 40) return true;
return String(cv.cv_ocr_status || "").trim().toLowerCase() === "done";
}

function storedCvIsPdf(cv){
const mime=String(cv?.cv_mime || "").trim().toLowerCase();
const label=String(cv?.cv_filename || cv?.cv_path || "").trim().toLowerCase();
return mime === "application/pdf" || label.endsWith(".pdf");
}

function maybeFocusPostUploadCard(){
if(!shouldFocusPostUploadCard) return;
const card=$("postUploadCard");
if(!card || card.style.display === "none") return;
shouldFocusPostUploadCard=false;
setTimeout(()=>{
  try{
    card.scrollIntoView({ behavior:"smooth", block:"center" });
  }catch(_){}
}, 80);
}

function getRealityCheckCache(){
  try{
    const raw=lsSafeGet(CV_REALITY_CHECK_CACHE_KEY);
    if(!raw) return null;
    const parsed=JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  }catch(_){
    return null;
  }
}

function writeRealityCheckCache(meta, result){
  try{
    const payload={
      cvMetaKey: cvMetaKey(meta),
      result,
      saved_at: new Date().toISOString()
    };
    lsSafeSet(CV_REALITY_CHECK_CACHE_KEY, JSON.stringify(payload));
  }catch(_){}
}

function readRealityCheckCache(meta){
  const cache=getRealityCheckCache();
  const key=cvMetaKey(meta);
  if(!cache || cache.cvMetaKey !== key || !cache.result) return null;
  return cache.result;
}

function buildRealityCheckFallback(cv){
  const ready=storedCvHasReadyText(cv);
  const isPdf=storedCvIsPdf(cv);
  const ocrStatus=String(cv?.cv_ocr_status || "").trim().toLowerCase();
  return {
    headline: "Your CV is not ready for most job applications yet",
    ats_readiness_score: ready ? 44 : 41,
    machine_readability: ready ? (isPdf ? "Low" : "Medium") : "Low",
    bridge: "These issues significantly reduce your chances if you apply as-is. The fastest way to fix this is to tailor your CV to a specific job.",
    findings: [
      {
        title: "Missing job-specific keywords",
        example: ready ? "The current CV stays broad instead of matching one target job." : "The CV still needs a readable text baseline before it can be checked properly.",
        impact: "ATS filters rank generic CVs lower because the language is not aligned to one specific role."
      },
      {
        title: "Weak impact in bullet points",
        example: "Several lines likely describe duties more than results or measurable outcomes.",
        impact: "Recruiters see responsibilities, but not clear proof of performance or business value."
      },
      {
        title: "Formatting reduces ATS readability",
        example: ocrStatus === "processing" ? "The file is still being processed, so machine readability is not stable yet." : "The CV is not yet optimized for clean ATS parsing at scale.",
        impact: "Parsing systems and recruiters can miss keywords, dates, or scope when the document is not structured for fast scanning."
      }
    ]
  };
}

function normalizeRealityCheckResult(raw, cv){
  const fallback=buildRealityCheckFallback(cv);
  const score=Math.max(35, Math.min(55, Math.round(Number(raw && raw.ats_readiness_score ? raw.ats_readiness_score : fallback.ats_readiness_score))));
  const readabilityRaw=String(raw && raw.machine_readability ? raw.machine_readability : fallback.machine_readability).trim().toLowerCase();
  const readability=readabilityRaw === "high" ? "High" : readabilityRaw === "medium" ? "Medium" : "Low";
  const headlineRaw=String(raw && raw.headline ? raw.headline : fallback.headline).trim();
  const headline=headlineRaw === "Your CV is currently not optimized for ATS systems"
    ? headlineRaw
    : "Your CV is not ready for most job applications yet";
  const findingsRaw=Array.isArray(raw && raw.findings) ? raw.findings : [];
  const findings=findingsRaw.map((item)=>({
    title:String(item && item.title ? item.title : "").trim(),
    example:String(item && item.example ? item.example : "").trim(),
    impact:String(item && item.impact ? item.impact : "").trim()
  })).filter((item)=>item.title && item.example && item.impact).slice(0,3);

  while(findings.length < 3){
    const fallbackItem=fallback.findings[findings.length] || fallback.findings[0];
    findings.push({ ...fallbackItem });
  }

  return {
    headline,
    ats_readiness_score: score,
    machine_readability: readability,
    bridge: "These issues significantly reduce your chances if you apply as-is. The fastest way to fix this is to tailor your CV to a specific job.",
    findings: findings.slice(0,3)
  };
}

function renderRealityCheckFindings(findings){
  const host=$("postUploadFindings");
  if(!host) return;
  const items=Array.isArray(findings) ? findings : [];
  host.innerHTML=items.map((item)=>(
    '<div class="realityFinding">'
      + '<div class="realityFindingTitle">' + escapeHtml(item.title || "") + '</div>'
      + '<div class="realityFindingExample"><strong>Example:</strong> ' + escapeHtml(item.example || "") + '</div>'
      + '<div class="realityFindingImpact"><strong>Why it hurts:</strong> ' + escapeHtml(item.impact || "") + '</div>'
    + '</div>'
  )).join("");
}

function renderRealityCheckPending(cv){
  const card=$("postUploadCard");
  if(!card) return;
  const ready=storedCvHasReadyText(cv);
  const ocrStatus=String(cv?.cv_ocr_status || "").trim().toLowerCase();
  card.style.display="";
  setBadge("postUploadBadge", ready ? "warn" : "warn", ready ? "Analyzing" : (ocrStatus === "failed" ? "Needs OCR" : "Preparing"));
  setText("postUploadTitle", ready ? "Your current CV should not be sent yet." : "Your CV was uploaded. The reality check is still loading.");
  setText("postUploadBody", ready
    ? "We are scoring the baseline first. This is the version recruiters and ATS systems would see before you tailor it."
    : "We need readable CV text before the full AI reality check can load. Either way, do not apply with this version as-is.");
  const scores=$("postUploadScores");
  if(scores) scores.style.display="none";
  renderRealityCheckFindings([]);
  setText("postUploadBridge", "These issues significantly reduce your chances if you apply as-is. The fastest way to fix this is to tailor your CV to a specific job.");
  setText("postUploadSecondary", "One next step: move into CV Studio and tailor this CV to a specific job.");
}

function renderRealityCheckResult(result){
  const card=$("postUploadCard");
  if(!card) return;
  const normalized=result && typeof result === "object" ? result : buildRealityCheckFallback(lastCvMeta || {});
  card.style.display="";
  setBadge("postUploadBadge", "bad", "Not ready");
  setText("postUploadTitle", normalized.headline || "Your CV is not ready for most job applications yet");
  setText("postUploadBody", "This is your untailored baseline. If you apply with this version, ATS filters and recruiters will see these weaknesses first.");
  const scores=$("postUploadScores");
  if(scores) scores.style.display="";
  setText("postUploadScoreValue", String(normalized.ats_readiness_score || 44) + "/100");
  setText("postUploadReadabilityValue", String(normalized.machine_readability || "Low"));
  setText("postUploadScoreMeta", "Baseline before tailoring to a specific job.");
  setText("postUploadReadabilityMeta", String(normalized.machine_readability || "Low") === "Low"
    ? "Low means ATS systems may miss information or rank the CV lower."
    : "This score reflects how reliably ATS systems can parse the document today.");
  renderRealityCheckFindings(normalized.findings);
  setText("postUploadBridge", normalized.bridge || "These issues significantly reduce your chances if you apply as-is. The fastest way to fix this is to tailor your CV to a specific job.");
  setText("postUploadSecondary", "The fastest fix is to tailor this CV to one real job now.");
}

async function loadRealityCheckForCv(cv){
  if(!cv || !cv.cv_path) return;
  const meta=cvMetaFromCv(cv);
  const key=cvMetaKey(meta);
  if(!storedCvHasReadyText(cv)){
    realityCheckResult=null;
    realityCheckKey=key;
    realityCheckInFlight=false;
    renderRealityCheckPending(cv);
    maybeFocusPostUploadCard();
    return;
  }

  const cached=readRealityCheckCache(meta);
  if(cached){
    realityCheckResult=normalizeRealityCheckResult(cached, cv);
    realityCheckKey=key;
    renderRealityCheckResult(realityCheckResult);
    maybeFocusPostUploadCard();
    return;
  }

  if(realityCheckInFlight && realityCheckKey === key) return;

  realityCheckKey=key;
  realityCheckInFlight=true;
  renderRealityCheckPending(cv);

  try{
    const resp=await apiPostJson("/me/ai/cv-reality-check",{});
    const normalized=normalizeRealityCheckResult(resp && resp.result ? resp.result : null, cv);
    realityCheckResult=normalized;
    writeRealityCheckCache(meta, normalized);
    renderRealityCheckResult(normalized);
  }catch(_){
    const fallback=buildRealityCheckFallback(cv);
    realityCheckResult=fallback;
    renderRealityCheckResult(fallback);
  }finally{
    realityCheckInFlight=false;
    maybeFocusPostUploadCard();
  }
}

function syncPostUploadCard(cv){
const card=$("postUploadCard");
if(!card) return;

if(!cv || !cv.cv_path){
  card.style.display="none";
  realityCheckResult=null;
  realityCheckKey="";
  realityCheckInFlight=false;
  return;
}

card.style.display="";
renderRealityCheckPending(cv);
loadRealityCheckForCv(cv).catch(()=>{});
}

function applyAiUiFromTitles(titles){
  const clean = Array.isArray(titles)
    ? titles.map(x=>String(x).trim()).filter(Boolean).slice(0,30)
    : [];
  if(!clean.length) return false;

  aiResult = { titles: clean };

  // Default selection: top 6 (less overwhelming)
  const defaultPick = clean.slice(0, 6);
  aiSelectedTitles = new Set(defaultPick.length ? defaultPick : clean.slice(0, 3));
  aiGeneratedOnce = true;

  // Persist for other pages (Jobs toggle: "AI titles only")
  try{
    localStorage.setItem("jm_ai_titles_server", JSON.stringify(clean));
  }catch(_){}

  setBadge("aiStatusBadge","good","Ready");
  setText("aiHint","Saved. Select any roles you want to keep.");
  setHtml("aiTitlesWrap","<div class='small'><strong>Suggested titles</strong> (click to select)</div>");
  renderChips("aiTitlesWrap", clean, aiSelectedTitles);

  $("aiApplyBtn").disabled = aiSelectedTitles.size===0;
  $("aiGenerateBtn").disabled = true;
  $("aiRegenerateLink").style.display = "inline";

  // Best practice: prefill job titles if the user hasn't typed anything yet.
  maybeAutofillJobTitlesFromAi(clean);

  return true;
}

function tryLoadCachedAiSuggestions(){
const cache=getAiCache();
if(!cache || !lastCvMeta) return false;
const currentKey=cvMetaKey(lastCvMeta);
if(cache.cvMetaKey !== currentKey) return false;
if(!Array.isArray(cache.titles) || !cache.titles.length) return false;
return applyAiUiFromTitles(cache.titles);
}

async function loadCvStatusAndUpdateUx(){
  try{
    const res=await apiGet("/me/cv");
    const cv=res && res.cv ? res.cv : null;

    syncPostUploadCard(cv);

    if(cv && cv.cv_path){
      lastCvMeta=cvMetaFromCv(cv);

      const fileLabel = cv.cv_filename || cv.cv_path;
      const fileLower = String(fileLabel||"").toLowerCase();
      const isPdf = fileLower.endsWith(".pdf");
      const ready=storedCvHasReadyText(cv);

      setText("cvHint","Uploaded: "+fileLabel);
      showRetryOcr(false);

      const s=String(cv.cv_ocr_status||"").toLowerCase();

      if(ready){
        stopOcrPollingAndCleanup();
        setBadge("cvStatusBadge","good",isPdf ? "OCR done" : "Ready");
        setText("ocrHint",isPdf ? "OCR done." : "CV text ready.");
        setProgress(false, 100, "", "");
        unlockAiReady();
        tryLoadCachedAiSuggestions();
        maybeAutoGenerateAiTitles("ocr_done");
        setText("subLine","Your base CV is uploaded, but it is not ready to send yet. Tailor it in CV Studio next.");
        markStep1DoneVisual(false);
        return;
      }

      if(s==="processing"){
        setBadge("cvStatusBadge","warn","OCR running…");
        setProgress(true, 65, "OCR in progress…", "We will update automatically.");
        setText("ocrHint","OCR is running…");
        if(isPdf){
          unlockAiWhileOcrRunning();
          startOcrPolling({ startedAt: Date.now() });
        }else{
          lockAi("Upload a PDF for OCR.");
        }
        setText("subLine","Your CV is uploaded. We are preparing the baseline check now, then the next step is CV tailoring.");
        markStep1DoneVisual(false);
        return;
      }

      if(s==="failed"){
        stopOcrPollingAndCleanup();
        setBadge("cvStatusBadge","bad","OCR failed");
        setProgress(false, 0, "", "");
        setText("ocrHint","OCR failed: "+(cv.cv_ocr_error||""));
        if(isPdf){
          showRetryOcr(true);
          unlockAiFallback("OCR failed. Retry OCR or try roles anyway.");
        }else{
          lockAi("OCR failed. Please upload a PDF.");
        }
        setText("subLine","Your CV is uploaded, but we still need readable text before the reality check and tailoring can work properly.");
        markStep1DoneVisual(false);
        return;
      }

      // idle / unknown
      stopOcrPollingAndCleanup();
      setBadge("cvStatusBadge","good","Uploaded");
      setProgress(false, 0, "", "");
      if(isPdf){
        setText("ocrHint","OCR not started.");
        showRetryOcr(true);
        unlockAiFallback("Retry OCR, or try roles anyway.");
      }else{
        setText("ocrHint","PDF required for OCR.");
        lockAi("Upload a PDF for OCR.");
      }
      setText("subLine","Your CV is uploaded. We still need the baseline check, then the next step is CV tailoring.");
      markStep1DoneVisual(false);
      return;
    }

    // No CV on backend
    lastCvMeta=null;
    syncPostUploadCard(null);
    stopOcrPollingAndCleanup();
    showRetryOcr(false);
    setBadge("cvStatusBadge","warn","No CV");
    setText("cvHint","No CV uploaded yet.");
    setText("ocrHint","");
    setProgress(false, 0, "", "");
    lockAi("Upload a CV first.");
    setText("subLine","Upload your base CV once. Then tailor it to a real job in CV Studio.");
    markStep1DoneVisual(false);
  }catch(e){
    lastCvMeta=null;
    syncPostUploadCard(null);
    stopOcrPollingAndCleanup();
    showRetryOcr(false);
    setBadge("cvStatusBadge","warn","Unknown");
    setText("cvHint","Could not load CV status.");
    setText("ocrHint","");
    setProgress(false, 0, "", "");
    lockAi("Upload a CV first.");
    showTopError(e.message||String(e));
    setText("subLine","We could not check your CV status right now.");
    markStep1DoneVisual(false);
  }
}

async function uploadCvThenAutoOcr(file){
  stopOcrPollingAndCleanup();
  clearTopError();
  showRetryOcr(false);
  lockAi("Working on your CV…");
  clearAiCache();

  // New CV = new titles. Reset background pipeline + cached AI titles.
  aiAutoStarted = false;
  backendAiTitles = [];
  try{ localStorage.removeItem("jm_ai_titles_server"); }catch(_){ }
  try{ localStorage.removeItem("ja_ai_titles_server"); }catch(_){ }

  // Basic size guard (many edge runtimes reject large uploads)
  const maxSizeMb = 9;
  if(file && Number(file.size) > maxSizeMb*1024*1024){
    throw new Error("File too large ("+Math.round(file.size/1024/1024)+"MB). Please upload a PDF under "+maxSizeMb+"MB.");
  }

  setBadge("cvStatusBadge","warn","Uploading…");
  setProgress(true, 18, "Uploading your CV…", "Do not close this tab.");

  const fd=new FormData();
  fd.append("cv",file);
  await apiPostForm("/me/cv",fd);

  await refreshState();
  closeMatchedJobsPanel();
  shouldFocusPostUploadCard=true;
  await loadCvStatusAndUpdateUx();

  if(!isPdfFile(file)){
    setProgress(false, 0, "", "");
    setText("ocrHint","Upload a PDF for OCR.");
    lockAi("Upload a PDF for OCR.");
    showRetryOcr(false);
    maybeFocusPostUploadCard();
    return;
  }

  setBadge("cvStatusBadge","warn","Starting OCR…");
  setProgress(true, 40, "Starting OCR…", "We are extracting text from your PDF.");

  try{
    await apiPostJson("/me/cv/ocr",{});
  }catch(e){
    // Non-fatal: user can retry OCR manually
    showTopError(e.message||String(e));
    showRetryOcr(true);
  }

  setBadge("cvStatusBadge","warn","OCR running…");
  setProgress(true, 55, "OCR in progress…", "We will update automatically.");
  setText("ocrHint","OCR is running…");
  unlockAiWhileOcrRunning();
  maybeFocusPostUploadCard();
  startOcrPolling({ startedAt: Date.now() });
}

async function handleCvFileSelected(){
try{
const input=$("cvFile");
const file=input && input.files && input.files[0] ? input.files[0] : null;
if(!file) return;
// Allow selecting the same file again (common issue on Android/Samsung browsers)
try{ if(input) input.value=""; }catch{}
jobTitlesTouched=false;
aiAppliedTitles=[];
renderAiAppliedChips(aiAppliedTitles);
await uploadCvThenAutoOcr(file);
}catch(e){
setBadge("cvStatusBadge","bad","Upload failed");
setProgress(false, 0, "", "");
showTopError(e.message||String(e));
}
}

async function handleRetryOcr(){
  clearTopError();
  const btn=$("retryOcrBtn");
  if(btn) btn.disabled=true;

  try{
    // Ensure a PDF CV exists on backend
    const res=await apiGet("/me/cv");
    const cv=res && res.cv ? res.cv : null;
    const fileLabel = cv && (cv.cv_filename || cv.cv_path) ? (cv.cv_filename || cv.cv_path) : "";
    if(!fileLabel) throw new Error("No CV found. Please upload a PDF first.");
    if(!String(fileLabel).toLowerCase().endsWith(".pdf")){
      throw new Error("Please upload a PDF version of your CV to run OCR.");
    }

    setBadge("cvStatusBadge","warn","Starting OCR…");
    setProgress(true, 40, "Starting OCR…", "We are extracting text from your PDF.");
    setText("ocrHint","Starting OCR…");
    showRetryOcr(false);

    await apiPostJson("/me/cv/ocr",{});

    setBadge("cvStatusBadge","warn","OCR running…");
    setProgress(true, 55, "OCR in progress…", "We will update automatically.");
    setText("ocrHint","OCR is running…");
    unlockAiWhileOcrRunning();

    startOcrPolling({ startedAt: Date.now() });
  }catch(e){
    showRetryOcr(true);
    setBadge("cvStatusBadge","bad","OCR error");
    setProgress(false, 0, "", "");
    showTopError(e.message||String(e));
    unlockAiFallback("Could not start OCR. Try roles anyway, or retry later.");
  }finally{
    if(btn) btn.disabled=false;
  }
}


async function handleAiGenerate({ force=false, background=false } = {}){
  if(!background) clearTopError();

  // If we already have suggestions, return them.
  if(!force && aiGeneratedOnce){
    const t = (aiResult && Array.isArray(aiResult.titles)) ? aiResult.titles : null;
    return t;
  }
  if(!force && tryLoadCachedAiSuggestions()){
    const t = (aiResult && Array.isArray(aiResult.titles)) ? aiResult.titles : null;
    return t;
  }

  $("aiGenerateBtn").disabled = true;
  $("aiApplyBtn").disabled = true;
  $("aiRegenerateLink").style.display = "none";
  aiSelectedTitles = new Set();
  aiResult = null;

  $("aiTitlesWrap").style.display = "none";
  $("aiAltWrap").style.display = "none";
  $("aiAltChips").innerHTML = "";
  $("aiSkillsWrap").style.display = "none";
  $("aiSkillsChips").innerHTML = "";

  setBadge("aiStatusBadge","warn","Generating…");
  setText("aiHint","Generating roles…");

  try{
    // Best-effort: if OCR has not finished yet, trigger it once before the AI call
    try{
      const cvRes = await apiGet("/me/cv");
      const cv = cvRes && cvRes.cv ? cvRes.cv : null;
      const fileLabel = cv && (cv.cv_filename || cv.cv_path) ? (cv.cv_filename || cv.cv_path) : "";
      const isPdf = String(fileLabel||"").toLowerCase().endsWith(".pdf");
      const sOcr = String(cv?.cv_ocr_status||"").toLowerCase();
      if(isPdf && sOcr !== "done"){
        try{ await apiPostJson("/me/cv/ocr",{}); }catch(_){}
      }
    }catch(_){}

    const res = await apiPostJson("/me/ai/profile-from-cv",{});
    const r = res && res.result ? res.result : null;
    if(!r) throw new Error("AI returned no result");

    // Best-effort: prefill location from CV (if available)
    try{
      const hints = deriveLocationHintsFromAiResult(r);
      setLocationSuggestionUI(hints);

      const locEl = $("locations");
      const cur = locEl ? parseCsv(locEl.value, 20) : [];
      if(!locationsTouched && (!cur || !cur.length) && Array.isArray(hints) && hints.length){
        // Prefill the first (most likely) city; user can edit anytime
        applyLocation(hints[0], { source:"cv", append:false });
      }
    }catch(_){}

    const titles = Array.isArray(r.job_titles)
      ? r.job_titles.map(x=>String(x).trim()).filter(Boolean)
      : [];

    if(!titles.length){
      setBadge("aiStatusBadge","warn","No titles");
      setText("aiHint","No roles yet. Try a PDF CV.");
      $("aiGenerateBtn").disabled = false;
      return null;
    }

    const coreSkills = (r.skills && Array.isArray(r.skills.core)) ? r.skills.core.map(x=>String(x).trim()).filter(Boolean) : [];
    const toolSkills = (r.skills && Array.isArray(r.skills.tools)) ? r.skills.tools.map(x=>String(x).trim()).filter(Boolean) : [];
    const supportingSkills = (r.skills && Array.isArray(r.skills.supporting)) ? r.skills.supporting.map(x=>String(x).trim()).filter(Boolean) : [];
    const primaryTitles = Array.isArray(r.primary_job_titles) ? r.primary_job_titles : [];
    const summaryText = String(r.summary||"").trim();
    const seniority = String(r.seniority||"unknown").trim();

    applyAiUiFromTitles(titles);

    // Persist the exact titles into backend (source of truth for Jobs/Dashboard)
    const saved = await saveAiTitlesToBackend(titles);
    if(saved && saved.ok){
      setText("aiHint","Saved. Select any roles you want to keep.");
    }

    try{
      localStorage.setItem("jm_ai_profile", JSON.stringify({
        created_at: new Date().toISOString(),
        job_titles: titles.slice(0,15),
        primary_job_titles: primaryTitles.slice(0,7),
        summary: summaryText,
        seniority: seniority,
        skills: {
          core: coreSkills.slice(0,12),
          supporting: supportingSkills.slice(0,10),
          tools: toolSkills.slice(0,10)
        }
      }));
    }catch(_){}

    {
      const chips=[];
      for(const s of coreSkills.slice(0,10)) chips.push(s);
      for(const s of toolSkills.slice(0,8)) chips.push(s);
      const uniq=[];
      const seen=new Set();
      for(const s of chips){
        const k=String(s).toLowerCase();
        if(!k || seen.has(k)) continue;
        seen.add(k);
        uniq.push(s);
      }
      if(uniq.length){
        $("aiSkillsWrap").style.display="block";
        $("aiSkillsChips").innerHTML = uniq.map(s=>'<span class="pill mini">'+escapeHtml(s)+'</span>').join("");
      }
    }

    try{
      const cs=await apiPostJson("/me/ai/cluster-suggestion",{});
      const cm=cs && cs.cluster_match ? cs.cluster_match : null;
      const altRaw = cm && Array.isArray(cm.alternative_titles)
        ? cm.alternative_titles.map(x=>String(x.title||"").trim()).filter(Boolean)
        : [];
      const titleSet = new Set(titles.map(t=>t.toLowerCase()));
      const altUniq=[];
      const seenAlt=new Set();
      for(const t of altRaw){
        const k=t.toLowerCase();
        if(!k || seenAlt.has(k)) continue;
        if(titleSet.has(k)) continue;
        seenAlt.add(k);
        altUniq.push(t);
      }
      if(altUniq.length){
        $("aiAltWrap").style.display="block";
        $("aiAltChips").innerHTML = altUniq.slice(0,6).map(t=>'<span class="pill mini">'+escapeHtml(t)+'</span>').join("");
      }
      try{
        localStorage.setItem("jm_ai_clusters", JSON.stringify({
          created_at: new Date().toISOString(),
          clusters: (cm && Array.isArray(cm.clusters)) ? cm.clusters.slice(0,3) : [],
          alternative_titles: altUniq.slice(0,10)
        }));
      }catch(_){}
    }catch(_){}

    if(lastCvMeta){
      setAiCache({ cvMetaKey: cvMetaKey(lastCvMeta), titles: titles.slice(0,30), created_at: new Date().toISOString() });
    }

    // Background job prefetch (best-effort)
    try{ await maybePrefetchJobs(titles, "ai_generate"); }catch(_){}

    return titles;
  }catch(e){
    setBadge("aiStatusBadge","bad","Failed");
    setText("aiHint","Generation failed. You can continue manually.");

    if(background){
      toast("warn","AI titles", e?.message || "Automatic generation failed. Tap Generate now to retry.");
    }else{
      showTopError(e.message||String(e));
    }

    $("aiGenerateBtn").disabled = false;
    return null;
  }
}

function handleAiRegenerate(){
aiGeneratedOnce=false;
handleAiGenerate({ force:true });
}

function handleAiApplyTitles(){
clearTopError();
if(!aiSelectedTitles || aiSelectedTitles.size===0){
showTopError("No titles selected.");
return;
}
const picked=[...aiSelectedTitles].slice(0,30);

const current=parseCsv($("jobTitles").value,30);
const remaining=current.filter(t => !picked.includes(t));
const merged=[...new Set([...picked, ...remaining])].slice(0,30);

$("jobTitles").value=merged.join(", ");

aiAppliedOnce=true;
aiAppliedTitles=picked.slice(0,12);
renderAiAppliedChips(aiAppliedTitles);

markPrefsDirty();
scheduleAutoSave();
setBadge("aiStatusBadge","good","Applied");
setText("aiHint","Job titles updated.");

try{
  const prefsToggle=$("prefsToggle");
  if(prefsToggle) prefsToggle.open=true;
}catch(_){}

markStep1DoneVisual(true);

const prefs=$("prefsCard");
if(prefs){
prefs.scrollIntoView({ behavior:"smooth", block:"start" });
}
}


/* -------------------------
   Preferences autosave
   - Step 2 is recommended. We store a local draft while the form is incomplete.
   - We only POST /me/profile when it has at least 1 desired title + 1 location.
   ------------------------- */

const PREFS_SIG_KEY = "jm_profile_pref_sig_v1";
const PREFS_DRAFT_KEY = "jm_profile_draft_v1";

let prefsDirty = false;
let prefsSaving = false;
let prefsSaveQueued = false;
let prefsAutoTimer = null;
let lastPrefsSig = "";

function readPrefsDraft(){
  try{
    const raw = lsSafeGet(PREFS_DRAFT_KEY);
    if(!raw) return null;
    const obj = JSON.parse(raw);
    if(!obj || typeof obj !== "object") return null;
    return obj;
  }catch(_){
    return null;
  }
}
function writePrefsDraft(obj){
  try{ lsSafeSet(PREFS_DRAFT_KEY, JSON.stringify(obj || {})); }catch(_){}
}
function clearPrefsDraft(){
  try{ localStorage.removeItem(PREFS_DRAFT_KEY); }catch(_){}
}
function prefsSignature(prefs){
  // Stable signature for "did anything change?"
  try{
    return JSON.stringify({
      desired_titles: prefs.desired_titles || [],
      industries: prefs.industries || [],
      locations: prefs.locations || [],
      countries_allowed: prefs.countries_allowed || [],
      radius_km: (prefs.radius_km === undefined ? null : prefs.radius_km)
    });
  }catch(_){
    return String(Date.now());
  }
}

function collectPrefsFromForm(){
  const userTitles = parseCsv($("jobTitles").value, 30);
  const aiTop = (aiAppliedTitles || []).map(x=>String(x||"").trim()).filter(Boolean);
  const desired_titles = [...new Set([...aiTop, ...userTitles])].slice(0, 30);

  const industries = parseCsv($("industries").value, 30);
  const locations = parseCsv($("locations").value, 20);

  const countries_allowed = [String($("country").value || "DE").trim()].filter(Boolean);

  let radius_km = $("radiusKm").value ? Number($("radiusKm").value) : null;
  if(!Number.isFinite(radius_km)) radius_km = null;

  return { desired_titles, industries, locations, countries_allowed, radius_km };
}

function collectDraftFromForm(){
  // Draft stores exactly what the user typed (even if incomplete).
  return {
    jobTitles: String($("jobTitles").value || ""),
    industries: String($("industries").value || ""),
    locations: String($("locations").value || ""),
    country: String($("country").value || "DE"),
    radiusKm: String($("radiusKm").value || "")
  };
}

function restoreDraftIfHelpful(){
  const d = readPrefsDraft();
  if(!d) return;

  // Only apply to empty fields (never overwrite backend-loaded values)
  try{
    if($("jobTitles") && !String($("jobTitles").value||"").trim() && d.jobTitles) $("jobTitles").value = d.jobTitles;
    if($("industries") && !String($("industries").value||"").trim() && d.industries) $("industries").value = d.industries;
    if($("locations") && !String($("locations").value||"").trim() && d.locations) $("locations").value = d.locations;
    if($("country") && d.country) $("country").value = d.country;
    if($("radiusKm") && !String($("radiusKm").value||"").trim() && d.radiusKm) $("radiusKm").value = d.radiusKm;
  }catch(_){}
}

function markPrefsDirty(){
  prefsDirty = true;
}

function scheduleAutoSave(){
  // Only autosave when we have a session
  if(!session || !session.access_token) return;

  if(prefsAutoTimer) clearTimeout(prefsAutoTimer);
  prefsAutoTimer = setTimeout(() => {
    savePreferences({ silent:true, allowDraft:true }).catch(()=>{});
  }, 850);
}

async function savePreferences(opts = {}){
  const silent = !!opts.silent;
  const allowDraft = (opts.allowDraft !== false);

  // If user hasn't changed anything, do nothing.
  if(!prefsDirty && !opts.force) return { ok:true, skipped:true };

  // Store a local draft immediately (so we never lose typed info)
  writePrefsDraft(collectDraftFromForm());

  const prefs = collectPrefsFromForm();
  const complete = !!(prefs.desired_titles.length && prefs.locations.length);

  if(!complete){
    if(!allowDraft){
      throw new Error("Please enter at least 1 desired job title and 1 location.");
    }
    // Step 2 is recommended, not blocking. Keep a calm status.
    setBadge("saveStatusBadge","warn","Draft");
    prefsDirty = false;
    return { ok:false, draft:true, complete:false };
  }

  if(!lastPrefsSig){
    lastPrefsSig = String(lsSafeGet(PREFS_SIG_KEY) || "");
  }
  const sig = prefsSignature(prefs);

  // Avoid duplicate saves if nothing changed
  if(sig === lastPrefsSig && !opts.force){
    setBadge("saveStatusBadge","good","Saved");
    prefsDirty = false;
    return { ok:true, skipped:true };
  }

  if(prefsSaving){
    prefsSaveQueued = true;
    return { ok:false, queued:true };
  }

  prefsSaving = true;
  setBadge("saveStatusBadge","warn","Saving…");

  const saveBtn = $("saveProfileBtn");
  if(saveBtn) saveBtn.disabled = true;

  try{
    await apiPostJson("/me/profile", prefs);
    await refreshState();

    lastPrefsSig = sig;
    lsSafeSet(PREFS_SIG_KEY, sig);

    // Saved server-side → clear draft
    clearPrefsDraft();

    setBadge("saveStatusBadge","good","Saved");
    lsSetAll(LS.profileDone, "true");
    prefsDirty = false;

    // Best-effort: once profile is saved, background fetch can be more accurate
    try{ maybePrefetchJobs(aiAppliedTitles, "profile_saved"); }catch(_){}

    return { ok:true };
  }catch(e){
    setBadge("saveStatusBadge","bad","Save failed");
    if(!silent) showTopError(e.message || String(e));
    else toast("warn","Save failed","We couldn't save preferences right now. We kept a draft and you can still continue.");
    prefsDirty = true; // keep dirty so we can retry
    return { ok:false, error: e };
  }finally{
    prefsSaving = false;
    if(saveBtn) saveBtn.disabled = false;

    if(prefsSaveQueued){
      prefsSaveQueued = false;
      setTimeout(() => { savePreferences({ silent:true, allowDraft:true, force:true }).catch(()=>{}); }, 80);
    }
  }
}

async function flushAutoSave(){
  if(prefsAutoTimer){ clearTimeout(prefsAutoTimer); prefsAutoTimer = null; }
  return savePreferences({ silent:true, allowDraft:true }).catch(()=>({ ok:false }));
}

async function handleSaveProfile(){
  clearTopError();
  try{
    await savePreferences({ silent:false, allowDraft:false, force:true });
  }catch(e){
    showTopError(e && e.message ? e.message : String(e));
  }
}

async function openCvStudioFromProfile(btn){
  const cvOk = !!(state && state.cv_uploaded);
  if(!cvOk){
    $("step1Card")?.scrollIntoView({ behavior:"smooth", block:"start" });
    toast("warn","Upload CV","Please upload your CV first.");
    return;
  }

  const label = btn ? String(btn.textContent || "").trim() : "";
  try{
    if(btn){
      btn.disabled = true;
      btn.textContent = "Opening CV Studio...";
    }
    await flushAutoSave();
  }catch(_){
    // keep calm; draft is still stored
  }finally{
    if(btn){
      btn.textContent = label || "Tailor this CV to a job";
      btn.disabled = false;
    }
  }

  go(CV_STUDIO_CHOOSER_URL);
}


/* -------------------------
   Activity log (modal)
   ------------------------- */

function showActivityError(msg){
  if (S && S.showTopError) return S.showTopError("activityError", msg);
  const el = $("activityError");
  if(!el) return;
  if(!msg){ el.style.display = "none"; el.textContent = ""; return; }
  el.style.display = "block";
  el.textContent = String(msg);
}

function showModal(id){
  if (S && S.showModal) return S.showModal(id);
  const el = $(id);
  if(!el) return;
  el.style.display = "flex";
  document.body.classList.add("modalOpen");
}
function hideModal(id){
  if (S && S.hideModal) return S.hideModal(id);
  const el = $(id);
  if(!el) return;
  el.style.display = "none";
  document.body.classList.remove("modalOpen");
}

function fmtWhen(ts){
  try{
    if(!ts) return "—";
    const d = new Date(ts);
    if(!Number.isFinite(d.getTime())) return String(ts);
    return d.toLocaleString();
  }catch(_){
    return String(ts || "—");
  }
}

function activityBadge(t){
  const x = String(t || "").toLowerCase();
  if(x === "applied" || x === "sent") return { cls:"good", label:"Applied" };
  if(x === "rejected") return { cls:"bad", label:"Rejected" };
  if(x === "skipped") return { cls:"warn", label:"Skipped" };
  if(x === "prioritized") return { cls:"prio", label:"Prioritized" };
  if(x === "queued" || x === "new") return { cls:"", label:"Queued" };
  return { cls:"", label: (t ? String(t) : "Event") };
}

function renderActivityList(items, kind){
  const arr = Array.isArray(items) ? items : [];
  if(!arr.length){
    return '<span class="badge warn">No activity yet</span>';
  }

  const html = arr.slice(0, 20).map((row) => {
    const evType = kind === "applications" ? String(row.status || "new") : String(row.event_type || "");
    const b = activityBadge(evType);

    const job = (row && row.job) ? row.job : {};
    const title = String(job.title || "Untitled");
    const company = String(job.company_name || job.company || "—");
    const loc = [job.city || "", job.region || ""].filter(Boolean).join(", ") || "—";
    const when = kind === "applications" ? (row.updated_at || row.created_at) : row.created_at;
    const link = job.apply_url ? String(job.apply_url) : "";

    const titleHtml = link
      ? ('<a href="' + escapeHtml(link) + '" target="_blank" rel="noopener">' + escapeHtml(title) + "</a>")
      : escapeHtml(title);

    let meta = "";
    try{
      if(kind !== "applications" && row.meta && typeof row.meta === "object"){
        if(row.meta.channel) meta = "via " + String(row.meta.channel);
        if(row.meta.reason_code) meta = meta ? (meta + " • reason: " + String(row.meta.reason_code)) : ("reason: " + String(row.meta.reason_code));
      }
    }catch(_){}

    return (
      '<div class="activityItem">'
        + '<div class="activityTop">'
          + '<div class="activityTitle">' + titleHtml + '</div>'
          + '<span class="badge ' + escapeHtml(b.cls) + '">' + escapeHtml(b.label) + '</span>'
        + '</div>'
        + '<div class="activityMeta">'
          + '<span>' + escapeHtml(company) + '</span>'
          + '<span>•</span>'
          + '<span>' + escapeHtml(loc) + '</span>'
          + '<span>•</span>'
          + '<span>' + escapeHtml(fmtWhen(when)) + '</span>'
          + (meta ? ('<span class="mono">• ' + escapeHtml(meta) + '</span>') : '')
        + '</div>'
      + '</div>'
    );
  }).join("");

  return '<div class="activityList">' + html + '</div>';
}

async function loadActivityLog(){
  showActivityError("");
  setHtml("activityWrap", '<div class="modalMonoBox">Loading…</div>');

  const token = session && session.access_token ? String(session.access_token) : "";
  if(!token){
    showActivityError("You are signed out. Please sign in again.");
    setHtml("activityWrap", "");
    return;
  }

  const et = String($("activityFilter")?.value || "").trim();
  const base = String(API_BASE || "").replace(/\/+$/, "");
  const headers = { Authorization: "Bearer " + token };

  // 1) Try timeline endpoint first
  try{
    let url = base + "/me/application-events?limit=20";
    if(et) url += "&event_type=" + encodeURIComponent(et);

    const res = await fetch(url, { method:"GET", headers });
    const text = await res.text().catch(() => "");
    let json = null;
    try{ json = JSON.parse(text); }catch{ json = { raw: text }; }

    if(!res.ok){
      const msg = (json && (json.error || json.message)) ? String(json.error || json.message) : (text || ("HTTP " + res.status));
      throw new Error(msg);
    }

    const items = Array.isArray(json?.data) ? json.data : [];
    setHtml("activityWrap", renderActivityList(items, "events"));
    return;
  }catch(_){
    // fallback below
  }

  // 2) Fallback: applications list
  try{
    const map = { queued:"new", prioritized:"new", applied:"applied", rejected:"rejected", skipped:"skipped", sent:"applied" };
    let url = base + "/me/applications?limit=20";
    if(et && map[et]) url += "&status=" + encodeURIComponent(map[et]);

    const res = await fetch(url, { method:"GET", headers });
    const text = await res.text().catch(() => "");
    let json = null;
    try{ json = JSON.parse(text); }catch{ json = { raw: text }; }

    if(!res.ok){
      const msg = (json && (json.error || json.message)) ? String(json.error || json.message) : (text || ("HTTP " + res.status));
      throw new Error(msg);
    }

    const items = Array.isArray(json?.data) ? json.data : [];
    setHtml("activityWrap", renderActivityList(items, "applications"));
  }catch(e){
    showActivityError(e?.message || String(e));
    setHtml("activityWrap", '<span class="badge bad">Activity failed</span>');
  }
}

function openActivityModal(){
  const dd = $("navAccount");
  if(dd) dd.open = false;
  showModal("activityModal");
  loadActivityLog().catch((e) => showActivityError(e?.message || String(e)));
}

function closeActivityModal(){
  hideModal("activityModal");
  showActivityError("");
}
async function boot(){
try{
clearTopError();
setText("subLine","Checking account…");
{
  const auth = getAppAuth();
  supabaseClient = auth?.supabaseClient || window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}



{
  const auth = getAppAuth();
  session = auth && typeof auth.getSession === "function"
    ? await auth.getSession()
    : null;
}
if(!session){
  const s=await supabaseClient.auth.getSession();
  session=s && s.data ? s.data.session : null;
}
if(!session || !session.user || !session.user.email){
window.location.replace("./signup.html");
return;
}

const email=String(session.user.email||"").trim().toLowerCase();
if(!isEmail(email)){
showTopError("Signed in, but email is missing/invalid.");
return;
}

resetLocalStateForNewUser(email);
try{sessionStorage.setItem("sb_access_token",session.access_token);}catch{}
setText("subLine","Signed in as "+email+".");
rememberGoogleProviderTokens();
refreshGmailVerifyUi();

await ensureCustomer(email, session.access_token);
await refreshState();
try{ window.JobMeJobShared?.hydrateAccountNav?.({ session, state }); }catch(_){}
await refreshBillingSummary();
await loadCvStatusAndUpdateUx();
await loadProfileIntoForm();
await maybeFinishPendingGmailVerify();
// Restore any local draft (only fills empty fields)
try{
  restoreDraftIfHelpful();
  const b = $("saveStatusBadge");
  const t = b ? String(b.textContent||"") : "";
  if(t !== "Loaded" && t !== "Saved"){
    const hasAny = !!(String($("jobTitles")?.value||"").trim() || String($("locations")?.value||"").trim());
    if(hasAny) setBadge("saveStatusBadge","warn","Draft");
  }
}catch(_){ }

// If backend already has AI titles (persisted), show them without forcing regeneration
try{
  const prof2 = await apiGet("/me/profile");
  const p2 = prof2 && prof2.profile ? prof2.profile : null;
  const backendAi = p2 && Array.isArray(p2.ai_titles) ? p2.ai_titles : [];
  if(Array.isArray(backendAi) && backendAi.length){
    backendAiTitles = backendAi.slice(0,30);

    // Prefer per-CV cache if available; otherwise show persisted titles
    if(!tryLoadCachedAiSuggestions()){
      applyAiUiFromTitles(backendAiTitles);
    }

    // Best-effort background prefetch (non-blocking)
    try{ maybePrefetchJobs(backendAiTitles, "boot_ai_titles"); }catch(_){}
  }
}catch(_){}


$("gmailVerifyBtn")?.addEventListener("click", async ()=>{
  try{
    await handleGmailVerifyClick();
  }catch(e){
    refreshGmailVerifyUi();
    showTopError(e?.message || String(e));
  }
});
$("gmailSendAgainBtn")?.addEventListener("click", async ()=>{
  try{
    await handleGmailSendAgainClick();
  }catch(e){
    refreshGmailVerifyUi();
    showTopError(e?.message || String(e));
  }
});
$("billingManageBtn")?.addEventListener("click", async ()=>{
  try{
    await openBillingPortal();
  }catch(e){
    toast("warn","Billing", e?.message || "Billing help is unavailable right now.");
  }
});

$("cvFile").addEventListener("change",handleCvFileSelected);

// Drag & drop + nice picker UI
wireCvDropzone();
$("retryOcrBtn").addEventListener("click",handleRetryOcr);

$("aiGenerateBtn").addEventListener("click",()=>handleAiGenerate({ force:false }));
$("aiRegenerateLink").addEventListener("click",handleAiRegenerate);
$("aiApplyBtn").addEventListener("click",handleAiApplyTitles);

$("jobTitles").addEventListener("input",()=>{
  jobTitlesTouched=true;
  renderAiAppliedChips(aiAppliedTitles);
  markPrefsDirty();
  scheduleAutoSave();
});

$("locations").addEventListener("input",()=>{
  locationsTouched=true;
  markPrefsDirty();
  scheduleAutoSave();
});

// Autosave: other preference fields
try{
  $("industries")?.addEventListener("input", ()=>{ markPrefsDirty(); scheduleAutoSave(); });
  $("country")?.addEventListener("change", ()=>{ markPrefsDirty(); scheduleAutoSave(); });
  $("radiusKm")?.addEventListener("input", ()=>{ markPrefsDirty(); scheduleAutoSave(); });
}catch(_){}


try{
  // Popular city quick picks (makes Step 2 fast)
  const popular = ["Berlin","Hamburg","München","Frankfurt","Köln","Stuttgart","Düsseldorf","Leipzig"];
  renderClickChips("locQuickChips", popular, (label)=>{
    applyLocation(label, { append:false });
  });
}catch(_){}

try{
  // Radius quick picks
  document.querySelectorAll("#radiusQuick .chip[data-radius]").forEach((chip)=>{
    chip.addEventListener("click", ()=>{
      const v = Number(chip.getAttribute("data-radius") || "");
      if(Number.isFinite(v)){
        $("radiusKm").value = String(v);
        markPrefsDirty();
scheduleAutoSave();
      }
    });
  });
}catch(_){}

const _saveBtn = $("saveProfileBtn");
if(_saveBtn){ _saveBtn.addEventListener("click", handleSaveProfile); }
$("continueBtn").addEventListener("click", ()=>openCvStudioFromProfile($("continueBtn")));
{
  const b = $("openCvBtn");
  if(b){
    b.addEventListener("click", ()=>openCvStudioFromProfile(b));
  }
}
$("postUploadPrimaryBtn")?.addEventListener("click", ()=>openCvStudioFromProfile($("postUploadPrimaryBtn")));
// Account dropdown actions
$("navActivity")?.addEventListener("click", openActivityModal);
$("activityCloseX")?.addEventListener("click", closeActivityModal);
$("activityClose")?.addEventListener("click", closeActivityModal);
$("activityModal")?.addEventListener("click", (e) => { if(e.target && e.target.id === "activityModal") closeActivityModal(); });
$("activityRefresh")?.addEventListener("click", () => loadActivityLog().catch(()=>{}));
$("activityFilter")?.addEventListener("change", () => loadActivityLog().catch(()=>{}));

}catch(e){
showTopError(e.message||String(e));
}
}

window.addEventListener("beforeunload",()=>{try{stopOcrPollingAndCleanup();}catch{}});
window.addEventListener("load",boot);
