var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

const SITEMAP_SITE_ORIGIN = "https://jobmejob.com";
const SITEMAP_LASTMOD = "2026-04-21";
const SITEMAP_LOCALES = ["en", "de", "es", "ko"];
const SITEMAP_LOCALIZED_PATHS = ["/", "/cv-studio", "/plan", "/signup"];

// jobmejob-worker.js
var jobmejob_worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/sitemap.xml" && request.method === "GET") {
      return handleSiteSitemapRequest();
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    try {
      if (url.pathname === "/" && request.method === "GET") {
        return json(
          request,
          {
            ok: true,
            service: "jobapplyai-api",
            routes: [
              "GET /health",
              "POST /customers/upsert",
              "POST /customer-profiles/upsert",
              "POST /customer-plans/upsert",
              "GET /billing/config",
              "POST /stripe/webhook",
              "GET /me/jobs/queue",
              "GET /me/jobs/description?job_id=<uuid>",
              "POST /me/jobs/ocr-image",
              "GET /me/applications/summary",
              "GET /me/profile",
              "POST /me/profile",
              "GET /me/plan",
              "POST /me/plan",
              "GET /me/billing/summary",
              "POST /me/billing/checkout",
              "POST /me/billing/confirm",
              "POST /me/billing/portal",
              "GET /me/cv",
              "POST /me/cv",
              "POST /me/cv/suggest-titles",
              "POST /me/cv/tailor",
              "POST /me/cv/tailor_from_text",
              "POST /me/cv/keyword_suggest",
              "POST /me/cv/keyword_insert",
              "GET /me/cv/tailored?job_ids=<uuid,uuid,...>",
              "POST /me/cv/ocr",
              "GET /me/cv/ocr/status",
              "GET /me/cv/ocr/text",
              "POST /fetch-jobs/manual",
              "POST /admin/fetch-jobs"
            ]
          },
          200
        );
      }
      if (url.pathname === "/health" && request.method === "GET") {
        return json(request, { ok: true, service: "jobapplyai-api" }, 200);
      }
      if ((url.pathname === "/customers/upsert" || url.pathname === "/api/customers/upsert") && request.method === "POST") {
        return await handleCustomerUpsertPublic(request, env);
      }
      if (url.pathname === "/customer-profiles/upsert" && request.method === "POST") {
        return await handleCustomerProfileUpsertPublic(request, env);
      }
      if (url.pathname === "/customer-plans/upsert" && request.method === "POST") {
        return await handleCustomerPlanUpsertPublic(request, env);
      }
      if ((url.pathname === "/billing/config" || url.pathname === "/api/billing/config") && request.method === "GET") {
        return await handleBillingConfigGet(request, env);
      }
      if ((url.pathname === "/stripe/webhook" || url.pathname === "/api/stripe/webhook") && request.method === "POST") {
        return await handleStripeWebhook(request, env);
      }
      if ((url.pathname === "/me/applications/summary" || url.pathname === "/api/me/applications/summary") && request.method === "GET") {
        return await handleMeApplicationsSummary(request, env);
      }
      if (url.pathname === "/me/jobs/queue" && request.method === "GET") {
        return await handleMeJobsQueue(request, env);
      }
      if ((url.pathname === "/me/jobs/description" || url.pathname === "/api/me/jobs/description") && request.method === "GET") {
        return await handleMeJobsDescription(request, env);
      }
      if ((url.pathname === "/me/jobs/ocr-image" || url.pathname === "/api/me/jobs/ocr-image" || url.pathname === "/me/jobs/ocr_image" || url.pathname === "/api/me/jobs/ocr_image") && request.method === "POST") {
        return await handleMeJobsOcrImage(request, env);
      }
      if ((url.pathname === "/me/jobs/fetch" || url.pathname === "/api/me/jobs/fetch") && request.method === "POST") {
        return await handleMeJobsFetch(request, env);
      }
      if ((url.pathname === "/me/ai-titles/save" || url.pathname === "/api/me/ai-titles/save") && request.method === "POST") {
        return await handleMeAiTitlesSave(request, env);
      }
      if ((url.pathname === "/me/jobs/fetch" || url.pathname === "/api/me/jobs/fetch") && request.method === "GET") {
        return json(request, { ok: false, error: "Method not allowed. Use POST." }, 405);
      }
      if (url.pathname === "/me/profile" && request.method === "GET") {
        return await handleMeProfileGet(request, env);
      }
      if (url.pathname === "/me/profile" && request.method === "POST") {
        return await handleMeProfileUpsert(request, env);
      }
      if (url.pathname === "/me/plan" && request.method === "GET") {
        return await handleMePlanGet(request, env);
      }
      if (url.pathname === "/me/state" && request.method === "GET") {
        return await handleMeStateGet(request, env);
      }
      if (url.pathname === "/me/plan" && request.method === "POST") {
        return await handleMePlanUpsert(request, env);
      }
      if ((url.pathname === "/me/billing/summary" || url.pathname === "/api/me/billing/summary") && request.method === "GET") {
        return await handleMeBillingSummary(request, env);
      }
      if ((url.pathname === "/me/billing/checkout" || url.pathname === "/api/me/billing/checkout") && request.method === "POST") {
        return await handleMeBillingCheckout(request, env);
      }
      if ((url.pathname === "/me/billing/confirm" || url.pathname === "/api/me/billing/confirm") && request.method === "POST") {
        return await handleMeBillingConfirm(request, env);
      }
      if ((url.pathname === "/me/billing/portal" || url.pathname === "/api/me/billing/portal") && request.method === "POST") {
        return await handleMeBillingPortal(request, env);
      }
      if (url.pathname === "/me/ai/profile-from-cv" && request.method === "POST") {
        return await handleMeAiProfileFromCv(request, env);
      }
      if (url.pathname === "/me/ai/cluster-suggestion" && request.method === "POST") {
        return await handleMeAiClusterSuggestion(request, env);
      }
      if (url.pathname === "/admin/role-cluster-suggestions/apply" && request.method === "POST") {
        return await handleAdminApplyRoleClusterSuggestion(request, env);
      }
      if (url.pathname === "/me/cv" && request.method === "POST") {
        return await handleMeCvUpload(request, env);
      }
      if (url.pathname === "/me/cv" && request.method === "GET") {
        return await handleMeCvGet(request, env);
      }
      if (url.pathname === "/me/cv/suggest-titles" && request.method === "POST") {
        return await handleMeCvSuggestTitles(request, env);
      }
      if ((url.pathname === "/me/cv/tailor" || url.pathname === "/api/me/cv/tailor") && request.method === "POST") {
        return await handleMeCvTailor(request, env);
      }
      if ((url.pathname === "/me/cv/tailor_from_text" || url.pathname === "/api/me/cv/tailor_from_text" || url.pathname === "/me/cv/tailor-from-text" || url.pathname === "/api/me/cv/tailor-from-text" || url.pathname === "/me/cv/tailor_text" || url.pathname === "/api/me/cv/tailor_text") && request.method === "POST") {
        return await handleMeCvTailorFromText(request, env);
      }
      if ((url.pathname === "/me/cv/keyword_suggest" || url.pathname === "/api/me/cv/keyword_suggest" || url.pathname === "/me/cv/keyword_recommend" || url.pathname === "/api/me/cv/keyword_recommend") && request.method === "POST") {
        return await handleMeCvKeywordSuggest(request, env);
      }
      if ((url.pathname === "/me/cv/keyword_polish" || url.pathname === "/api/me/cv/keyword_polish" || url.pathname === "/me/cv/keyword_boost" || url.pathname === "/api/me/cv/keyword_boost" || url.pathname === "/me/cv/keyword_inject" || url.pathname === "/api/me/cv/keyword_inject" || url.pathname === "/me/cv/keyword_insert" || url.pathname === "/api/me/cv/keyword_insert") && request.method === "POST") {
        return await handleMeCvKeywordInsert(request, env);
      }
      if ((url.pathname === "/me/cv/tailored" || url.pathname === "/api/me/cv/tailored") && request.method === "GET") {
        return await handleMeCvTailoredGet(request, env);
      }
      if (url.pathname === "/me/cv/ocr" && request.method === "POST") {
        return await handleMeCvOcrStart(request, env);
      }
      if (url.pathname === "/me/cv/ocr/status" && request.method === "GET") {
        return await handleMeCvOcrStatus(request, env);
      }
      if (url.pathname === "/me/cv/ocr" && request.method === "GET") {
        return await handleMeCvOcrStatus(request, env);
      }
      if (url.pathname === "/me/cv/ocr/text" && request.method === "GET") {
        return await handleMeCvOcrText(request, env);
      }
      if (url.pathname === "/me/applications" && request.method === "GET") {
        return await handleMeApplicationsList(request, env);
      }
      if (url.pathname === "/me/applications/skip" && request.method === "POST") {
        return await handleMeApplicationsSkip(request, env);
      }
      if (url.pathname === "/me/application-events" && request.method === "GET") {
        return await handleMeApplicationEventsList(request, env);
      }
      if (url.pathname === "/me/applications/unskip" && request.method === "POST") {
        return await handleMeApplicationsUnskip(request, env);
      }
      if (url.pathname === "/me/applications/prioritize" && request.method === "POST") {
        return await handleMeApplicationsPrioritize(request, env);
      }
      if (url.pathname === "/me/applications/unprioritize" && request.method === "POST") {
        return await handleMeApplicationsUnprioritize(request, env);
      }
      if (url.pathname === "/customers/search" && request.method === "GET") {
        return await handleCustomerSearch(request, url, env);
      }
      if (url.pathname === "/jobs/search" && request.method === "GET") {
        return await handleJobSearch(url, env, request);
      }
      if (request.method === "GET" && /^\/customers\/[0-9a-fA-F-]{36}\/jobs\/queue$/.test(url.pathname)) {
        return await handleCustomerJobQueue(request, url, env);
      }
      if (request.method === "GET" && /^\/customers\/[0-9a-fA-F-]{36}\/applications\/summary$/.test(url.pathname)) {
        return await handleCustomerApplicationsSummary(request, url, env);
      }
      if (request.method === "POST" && /^\/customers\/[0-9a-fA-F-]{36}\/fetch-jobs$/.test(url.pathname)) {
        return await handleFetchJobsForCustomer(request, url, env);
      }
      if ((url.pathname === "/fetch-jobs/manual" || url.pathname === "/admin/fetch-jobs") && request.method === "POST") {
        return await handleManualFetchJobs(request, env);
      }
      if (url.pathname === "/ingest/ba" && request.method === "POST") {
        return await handleIngestBA(request, env);
      }
      if (url.pathname.startsWith("/jobs/de/") && request.method === "GET") {
        return await handleDEJobDetails(url, env, request);
      }
      if (url.pathname === "/applications/mark" && request.method === "POST") {
        return await handleMarkApplication(request, env);
      }
      return json(request, { error: "Not found" }, 404);
    } catch (err) {
      const details = err && err.stack ? String(err.stack) : String(err);
      const message = err && typeof err.message === "string" && err.message.trim() ? err.message.trim() : details || "Unhandled error";
      return json(request, { error: message, details }, 500);
    }
  },
  async scheduled(event, env, ctx) {
    if ((env.CRON_ENABLED || "true").toLowerCase() !== "true") return;
    ctx.waitUntil(runNightlyCron(env));
  }
};

function escapeSitemapXml(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
__name(escapeSitemapXml, "escapeSitemapXml");
function buildSitemapUrl(locale, path) {
  const normalizedPath = path === "/" ? "/" : String(path || "/").replace(/\/+$/, "");
  return `${SITEMAP_SITE_ORIGIN}/${locale}${normalizedPath === "/" ? "/" : normalizedPath}`;
}
__name(buildSitemapUrl, "buildSitemapUrl");
function renderSitemapUrlEntry({ loc, alternates = [], changefreq, priority }) {
  const alternateLinks = alternates.map((item) => `    <xhtml:link rel="alternate" hreflang="${escapeSitemapXml(item.hreflang)}" href="${escapeSitemapXml(item.href)}" />`).join("\n");
  return [
    "  <url>",
    `    <loc>${escapeSitemapXml(loc)}</loc>`,
    `    <lastmod>${SITEMAP_LASTMOD}</lastmod>`,
    `    <changefreq>${escapeSitemapXml(changefreq)}</changefreq>`,
    `    <priority>${escapeSitemapXml(priority)}</priority>`,
    alternateLinks,
    "  </url>"
  ].filter(Boolean).join("\n");
}
__name(renderSitemapUrlEntry, "renderSitemapUrlEntry");
function buildSiteSitemapXml() {
  const localizedEntries = SITEMAP_LOCALIZED_PATHS.map((path) => {
    const alternates = SITEMAP_LOCALES.map((locale) => ({
      hreflang: locale,
      href: buildSitemapUrl(locale, path)
    }));
    alternates.push({ hreflang: "x-default", href: buildSitemapUrl("en", path) });
    return renderSitemapUrlEntry({
      loc: buildSitemapUrl("en", path),
      alternates,
      changefreq: path === "/signup" ? "monthly" : "weekly",
      priority: path === "/" ? "1.0" : path === "/signup" ? "0.5" : path === "/plan" ? "0.7" : "0.8"
    });
  });
  const privacyEntry = renderSitemapUrlEntry({
    loc: `${SITEMAP_SITE_ORIGIN}/privacy`,
    alternates: [
      { hreflang: "en", href: `${SITEMAP_SITE_ORIGIN}/privacy` },
      { hreflang: "x-default", href: `${SITEMAP_SITE_ORIGIN}/privacy` }
    ],
    changefreq: "monthly",
    priority: "0.6"
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...localizedEntries,
    privacyEntry,
    "</urlset>"
  ].join("\n");
}
__name(buildSiteSitemapXml, "buildSiteSitemapXml");
function handleSiteSitemapRequest() {
  return new Response(buildSiteSitemapXml(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate"
    }
  });
}
__name(handleSiteSitemapRequest, "handleSiteSitemapRequest");
function corsHeaders(request) {
  let origin = "";
  try {
    origin = request?.headers?.get("Origin") || "";
  } catch {
    origin = "";
  }
  const allowOrigin = origin || "*";
  let reqHeaders = "";
  try {
    reqHeaders = request?.headers?.get("Access-Control-Request-Headers") || "";
  } catch {
    reqHeaders = "";
  }
  const allowHeaders = reqHeaders || "Content-Type, Authorization, x-admin-token";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, PATCH, DELETE",
    "Access-Control-Allow-Headers": allowHeaders,
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin, Access-Control-Request-Headers"
  };
}
__name(corsHeaders, "corsHeaders");
function clampInt(val, min, max, fallback) {
  const n = Number.parseInt(String(val ?? ""), 10);
  if (Number.isNaN(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}
__name(clampInt, "clampInt");
function withCors(request, headers = {}) {
  try {
    return { ...headers, ...corsHeaders(request) };
  } catch {
    return { ...headers, "Access-Control-Allow-Origin": "*" };
  }
}
__name(withCors, "withCors");
function json(request, body, status = 200) {
  const headers = withCors(request, { "Content-Type": "application/json" });
  return new Response(JSON.stringify(body), { status, headers });
}
__name(json, "json");
function jsonResponse(body, status = 200, request = null) {
  const base = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization,content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  };
  const headers = request ? withCors(request, base) : base;
  return new Response(JSON.stringify(body), { status, headers });
}
__name(jsonResponse, "jsonResponse");
function mustEnv(env, name) {
  const v = (env[name] || "").trim();
  if (!v) throw new Error(`Missing env var/secret: ${name}`);
  return v;
}
__name(mustEnv, "mustEnv");
function extractVisionTextFromAsyncOutput(partJson) {
  try {
    const responses = partJson?.responses || [];
    let txt = "";
    for (const r of responses) {
      const t = r?.fullTextAnnotation?.text;
      if (t) txt += t + "\n";
    }
    return txt.trim();
  } catch (e) {
    return "";
  }
}
__name(extractVisionTextFromAsyncOutput, "extractVisionTextFromAsyncOutput");
function escapeForPostgrestLike(s) {
  return s.replace(/[()*]/g, "").replace(/%/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
}
__name(escapeForPostgrestLike, "escapeForPostgrestLike");
function normalizeTitle(title) {
  if (!title) return "";
  return title.toLowerCase().replace(/\(m\/w\/d\)/g, "").replace(/\(w\/m\/d\)/g, "").replace(/\(m\/f\/d\)/g, "").replace(/\[.*?\]/g, "").replace(/\s+/g, " ").trim().slice(0, 200);
}
__name(normalizeTitle, "normalizeTitle");
function clamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(Math.max(x, min), max);
}
__name(clamp, "clamp");
async function sha256Hex(input) {
  const data = new TextEncoder().encode(String(input ?? ""));
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
function normalizeCvStudioPlanId(planId) {
  const raw = String(planId || "").trim().toLowerCase();
  if (raw === "starter" || raw === "cv_starter") return "cv_starter";
  if (raw === "plus" || raw === "cv_plus") return "cv_plus";
  if (raw === "unlimited" || raw === "cv_unlimited") return "cv_unlimited";
  if (raw === "free") return "free";
  return null;
}
__name(normalizeCvStudioPlanId, "normalizeCvStudioPlanId");
var SITE_LOCALES = Object.freeze(["en", "de", "es", "ko"]);
var STRIPE_PRICE_CURRENCIES = Object.freeze(["USD", "EUR", "KRW"]);
function normalizeSiteLocale(locale) {
  const raw = String(locale || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.startsWith("de")) return "de";
  if (raw.startsWith("es")) return "es";
  if (raw.startsWith("ko")) return "ko";
  if (raw.startsWith("en")) return "en";
  return "";
}
__name(normalizeSiteLocale, "normalizeSiteLocale");
function localeCurrency(locale) {
  const normalized = normalizeSiteLocale(locale);
  if (normalized === "de" || normalized === "es") return "EUR";
  if (normalized === "ko") return "KRW";
  if (normalized === "en") return "USD";
  return "";
}
__name(localeCurrency, "localeCurrency");
function buildLocalizedSiteUrl(env, locale, path = "/plan", { search = "", hash = "" } = {}) {
  const normalizedLocale = normalizeSiteLocale(locale);
  const normalizedPath = String(path || "/plan").startsWith("/") ? String(path || "/plan") : `/${String(path || "plan").replace(/^\/+/, "")}`;
  const prefix = normalizedLocale && SITE_LOCALES.includes(normalizedLocale) ? `/${normalizedLocale}` : "";
  return `${getSiteOrigin(env)}${prefix}${normalizedPath}${search || ""}${hash || ""}`;
}
__name(buildLocalizedSiteUrl, "buildLocalizedSiteUrl");
function getAllStripePriceIdsForPlan(env, planId) {
  const pid = normalizeCvStudioPlanId(planId);
  if (!pid) return [];
  const prefix = pid === "cv_starter" ? "STRIPE_CV_STARTER_PRICE_ID" : pid === "cv_plus" ? "STRIPE_CV_PLUS_PRICE_ID" : "";
  if (!prefix) return [];
  const values = [
    String(env[prefix] || "").trim(),
    ...STRIPE_PRICE_CURRENCIES.map((currency) => String(env[`${prefix}_${currency}`] || "").trim())
  ].filter(Boolean);
  return Array.from(new Set(values));
}
__name(getAllStripePriceIdsForPlan, "getAllStripePriceIdsForPlan");
function getStripeBillingConfig(env) {
  const secret = String(env.STRIPE_SECRET_KEY || "").trim();
  const starterEnabled = getAllStripePriceIdsForPlan(env, "cv_starter").length > 0;
  const plusEnabled = getAllStripePriceIdsForPlan(env, "cv_plus").length > 0;
  const mode = secret.startsWith("sk_live_") ? "live" : secret.startsWith("sk_test_") ? "test" : "unknown";
  return {
    provider: "stripe",
    mode,
    stripe_enabled: !!secret,
    checkout_enabled: !!secret && (starterEnabled || plusEnabled),
    starter_enabled: !!secret && starterEnabled,
    plus_enabled: !!secret && plusEnabled,
    portal_enabled: !!secret,
    webhook_enabled: !!String(env.STRIPE_WEBHOOK_SECRET || "").trim()
  };
}
__name(getStripeBillingConfig, "getStripeBillingConfig");
function getSiteOrigin(env) {
  return String(env.SITE_ORIGIN || env.PUBLIC_SITE_ORIGIN || "https://jobmejob.com").trim().replace(/\/+$/, "");
}
__name(getSiteOrigin, "getSiteOrigin");
function getStripePriceIdForPlan(env, planId, locale = "") {
  const pid = normalizeCvStudioPlanId(planId);
  const currency = localeCurrency(locale);
  if (pid === "cv_starter") {
    const localized = currency ? String(env[`STRIPE_CV_STARTER_PRICE_ID_${currency}`] || "").trim() : "";
    return localized || String(env.STRIPE_CV_STARTER_PRICE_ID || "").trim();
  }
  if (pid === "cv_plus") {
    const localized = currency ? String(env[`STRIPE_CV_PLUS_PRICE_ID_${currency}`] || "").trim() : "";
    return localized || String(env.STRIPE_CV_PLUS_PRICE_ID || "").trim();
  }
  return "";
}
__name(getStripePriceIdForPlan, "getStripePriceIdForPlan");
async function stripeFetchJson(env, path, { method = "GET", body = null } = {}) {
  const secret = mustEnv(env, "STRIPE_SECRET_KEY");
  const res = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      ...body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}
    },
    body: body ? body.toString() : void 0
  });
  const text = await res.text().catch(() => "");
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = data?.error?.message || text || `Stripe error ${res.status}`;
    throw new Error(`Stripe error ${res.status}: ${msg}`);
  }
  return data;
}
__name(stripeFetchJson, "stripeFetchJson");
async function stripeFindCustomerByEmail(env, email) {
  const q = new URLSearchParams();
  q.set("email", String(email || "").trim().toLowerCase());
  q.set("limit", "1");
  const data = await stripeFetchJson(env, `/v1/customers?${q.toString()}`, { method: "GET" });
  return Array.isArray(data?.data) && data.data.length ? data.data[0] : null;
}
__name(stripeFindCustomerByEmail, "stripeFindCustomerByEmail");
async function stripeGetCustomer(env, stripeCustomerId) {
  if (!stripeCustomerId) return null;
  return await stripeFetchJson(env, `/v1/customers/${encodeURIComponent(String(stripeCustomerId))}`, { method: "GET" });
}
__name(stripeGetCustomer, "stripeGetCustomer");
async function stripeGetSubscription(env, subscriptionId) {
  if (!subscriptionId) return null;
  return await stripeFetchJson(env, `/v1/subscriptions/${encodeURIComponent(String(subscriptionId))}`, { method: "GET" });
}
__name(stripeGetSubscription, "stripeGetSubscription");
async function stripeGetCheckoutSession(env, sessionId, { expandSubscription = false } = {}) {
  if (!sessionId) return null;
  const q = new URLSearchParams();
  if (expandSubscription) q.append("expand[]", "subscription");
  const suffix = q.toString() ? `?${q.toString()}` : "";
  return await stripeFetchJson(
    env,
    `/v1/checkout/sessions/${encodeURIComponent(String(sessionId))}${suffix}`,
    { method: "GET" }
  );
}
__name(stripeGetCheckoutSession, "stripeGetCheckoutSession");
async function stripeEnsureCustomer(env, { email, customerId }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!looksLikeEmail(normalizedEmail)) throw new Error("Valid email is required for Stripe customer");
  const existing = await stripeFindCustomerByEmail(env, normalizedEmail);
  if (existing?.id) return existing;
  const body = new URLSearchParams();
  body.set("email", normalizedEmail);
  if (customerId) body.set("metadata[customer_id]", String(customerId));
  return await stripeFetchJson(env, "/v1/customers", { method: "POST", body });
}
__name(stripeEnsureCustomer, "stripeEnsureCustomer");
async function stripeCreateCheckoutSession(env, { email, customerId, planId, locale = "" }) {
  const normalizedPlanId = normalizeCvStudioPlanId(planId);
  const priceId = getStripePriceIdForPlan(env, normalizedPlanId, locale);
  if (!priceId) throw new Error("Stripe checkout is not configured for that plan");
  const stripeCustomer = await stripeEnsureCustomer(env, { email, customerId });
  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("customer", stripeCustomer.id);
  params.set("client_reference_id", String(customerId || ""));
  params.set(
    "success_url",
    buildLocalizedSiteUrl(env, locale, "/plan", {
      search: `?billing=success&plan=${encodeURIComponent(normalizedPlanId)}&session_id={CHECKOUT_SESSION_ID}`
    })
  );
  params.set(
    "cancel_url",
    buildLocalizedSiteUrl(env, locale, "/plan", {
      search: "?billing=cancelled",
      hash: "#cv-pricing"
    })
  );
  params.set("allow_promotion_codes", "true");
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("metadata[customer_id]", String(customerId || ""));
  params.set("metadata[plan_id]", normalizedPlanId);
  params.set("metadata[email]", String(email || ""));
  params.set("subscription_data[metadata][customer_id]", String(customerId || ""));
  params.set("subscription_data[metadata][plan_id]", normalizedPlanId);
  params.set("subscription_data[metadata][email]", String(email || ""));
  return await stripeFetchJson(env, "/v1/checkout/sessions", { method: "POST", body: params });
}
__name(stripeCreateCheckoutSession, "stripeCreateCheckoutSession");
async function stripeCreatePortalSession(env, { email, customerId, locale = "" }) {
  const stripeCustomer = await stripeEnsureCustomer(env, { email, customerId });
  const params = new URLSearchParams();
  params.set("customer", stripeCustomer.id);
  params.set("return_url", buildLocalizedSiteUrl(env, locale, "/plan", { hash: "#cv-pricing" }));
  const configurationId = String(env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID || "").trim();
  if (configurationId) params.set("configuration", configurationId);
  return await stripeFetchJson(env, "/v1/billing_portal/sessions", { method: "POST", body: params });
}
__name(stripeCreatePortalSession, "stripeCreatePortalSession");
async function stripeListSubscriptions(env, stripeCustomerId, { limit = 10 } = {}) {
  if (!stripeCustomerId) return [];
  const q = new URLSearchParams();
  q.set("customer", String(stripeCustomerId));
  q.set("status", "all");
  q.set("limit", String(clampInt(limit, 1, 25, 10)));
  q.append("expand[]", "data.items.data.price");
  const data = await stripeFetchJson(env, `/v1/subscriptions?${q.toString()}`, { method: "GET" });
  return Array.isArray(data?.data) ? data.data : [];
}
__name(stripeListSubscriptions, "stripeListSubscriptions");
async function stripeListInvoices(env, stripeCustomerId, { limit = 6 } = {}) {
  if (!stripeCustomerId) return [];
  const q = new URLSearchParams();
  q.set("customer", String(stripeCustomerId));
  q.set("limit", String(clampInt(limit, 1, 12, 6)));
  const data = await stripeFetchJson(env, `/v1/invoices?${q.toString()}`, { method: "GET" });
  return Array.isArray(data?.data) ? data.data : [];
}
__name(stripeListInvoices, "stripeListInvoices");
function stripeUnixToIso(value) {
  const ts = Number(value);
  if (!Number.isFinite(ts) || ts <= 0) return null;
  try {
    return new Date(ts * 1e3).toISOString();
  } catch {
    return null;
  }
}
__name(stripeUnixToIso, "stripeUnixToIso");
function stripeSubscriptionStatusRank(status) {
  const v = String(status || "").trim().toLowerCase();
  if (v === "active") return 0;
  if (v === "trialing") return 1;
  if (v === "past_due") return 2;
  if (v === "unpaid") return 3;
  if (v === "canceled") return 4;
  if (v === "incomplete") return 5;
  if (v === "incomplete_expired") return 6;
  return 9;
}
__name(stripeSubscriptionStatusRank, "stripeSubscriptionStatusRank");
function pickCurrentStripeSubscription(subscriptions) {
  const list = Array.isArray(subscriptions) ? subscriptions.filter(Boolean) : [];
  if (!list.length) return null;
  const sorted = list.slice().sort((a, b) => {
    const rankDiff = stripeSubscriptionStatusRank(a?.status) - stripeSubscriptionStatusRank(b?.status);
    if (rankDiff !== 0) return rankDiff;
    const periodA = Number(a?.current_period_end || a?.cancel_at || a?.created || 0);
    const periodB = Number(b?.current_period_end || b?.cancel_at || b?.created || 0);
    return periodB - periodA;
  });
  return sorted[0] || null;
}
__name(pickCurrentStripeSubscription, "pickCurrentStripeSubscription");
function summarizeStripeSubscription(env, subscription) {
  if (!subscription || typeof subscription !== "object") return null;
  const items = Array.isArray(subscription?.items?.data) ? subscription.items.data : [];
  const knownPriceIds = /* @__PURE__ */ new Set([
    ...getAllStripePriceIdsForPlan(env, "cv_starter"),
    ...getAllStripePriceIdsForPlan(env, "cv_plus")
  ]);
  const primaryItem = items.find((item) => knownPriceIds.has(String(item?.price?.id || "").trim())) || items[0] || null;
  const price = primaryItem?.price && typeof primaryItem.price === "object" ? primaryItem.price : null;
  const recurring = price?.recurring && typeof price.recurring === "object" ? price.recurring : null;
  return {
    id: String(subscription.id || "").trim() || null,
    status: String(subscription.status || "").trim().toLowerCase() || null,
    plan_id: resolveStripePlanIdFromSubscription(env, subscription),
    price_id: String(price?.id || "").trim() || null,
    currency: String(price?.currency || "").trim().toLowerCase() || null,
    unit_amount: Number.isFinite(Number(price?.unit_amount)) ? Number(price.unit_amount) : null,
    interval: String(recurring?.interval || "").trim().toLowerCase() || null,
    interval_count: Number.isFinite(Number(recurring?.interval_count)) ? Number(recurring.interval_count) : null,
    quantity: Number.isFinite(Number(primaryItem?.quantity)) ? Number(primaryItem.quantity) : null,
    cancel_at_period_end: subscription?.cancel_at_period_end === true,
    cancel_at: stripeUnixToIso(subscription?.cancel_at),
    canceled_at: stripeUnixToIso(subscription?.canceled_at),
    current_period_start: stripeUnixToIso(subscription?.current_period_start),
    current_period_end: stripeUnixToIso(subscription?.current_period_end),
    trial_start: stripeUnixToIso(subscription?.trial_start),
    trial_end: stripeUnixToIso(subscription?.trial_end),
    created_at: stripeUnixToIso(subscription?.created)
  };
}
__name(summarizeStripeSubscription, "summarizeStripeSubscription");
function summarizeStripeInvoice(invoice) {
  if (!invoice || typeof invoice !== "object") return null;
  const linePeriod = invoice?.lines?.data?.[0]?.period || null;
  return {
    id: String(invoice.id || "").trim() || null,
    number: String(invoice.number || "").trim() || null,
    status: String(invoice.status || "").trim().toLowerCase() || null,
    currency: String(invoice.currency || "").trim().toLowerCase() || null,
    amount_due: Number.isFinite(Number(invoice.amount_due)) ? Number(invoice.amount_due) : null,
    amount_paid: Number.isFinite(Number(invoice.amount_paid)) ? Number(invoice.amount_paid) : null,
    amount_remaining: Number.isFinite(Number(invoice.amount_remaining)) ? Number(invoice.amount_remaining) : null,
    hosted_invoice_url: String(invoice.hosted_invoice_url || "").trim() || null,
    invoice_pdf: String(invoice.invoice_pdf || "").trim() || null,
    created_at: stripeUnixToIso(invoice.created),
    due_date: stripeUnixToIso(invoice.due_date),
    paid_at: stripeUnixToIso(invoice?.status_transitions?.paid_at),
    period_start: stripeUnixToIso(invoice.period_start || linePeriod?.start),
    period_end: stripeUnixToIso(invoice.period_end || linePeriod?.end),
    subscription_id: String(invoice.subscription || "").trim() || null
  };
}
__name(summarizeStripeInvoice, "summarizeStripeInvoice");
function parseStripeSignatureHeader(headerValue) {
  const out = { timestamp: "", signatures: [] };
  for (const part of String(headerValue || "").split(",")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key === "t") out.timestamp = value;
    if (key === "v1" && value) out.signatures.push(value);
  }
  return out;
}
__name(parseStripeSignatureHeader, "parseStripeSignatureHeader");
function timingSafeEqualHex(a, b) {
  const aa = String(a || "");
  const bb = String(b || "");
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i += 1) diff |= aa.charCodeAt(i) ^ bb.charCodeAt(i);
  return diff === 0;
}
__name(timingSafeEqualHex, "timingSafeEqualHex");
async function hmacSha256Hex(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(secret || "")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(String(payload || "")));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha256Hex, "hmacSha256Hex");
async function verifyStripeWebhookSignature(env, payload, signatureHeader) {
  const secret = mustEnv(env, "STRIPE_WEBHOOK_SECRET");
  const parsed = parseStripeSignatureHeader(signatureHeader);
  if (!parsed.timestamp || !parsed.signatures.length) return false;
  const now = Math.floor(Date.now() / 1e3);
  const ts = Number(parsed.timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 300) return false;
  const expected = await hmacSha256Hex(secret, `${parsed.timestamp}.${payload}`);
  return parsed.signatures.some((sig) => timingSafeEqualHex(expected, sig));
}
__name(verifyStripeWebhookSignature, "verifyStripeWebhookSignature");
function getPublicBaseUrl(request, env) {
  const fromEnv = String(env.PUBLIC_API_BASE || "").trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  try {
    const u = new URL(request.url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}
__name(getPublicBaseUrl, "getPublicBaseUrl");
function buildTitleOrFilter(desiredTitles) {
  const titles = (desiredTitles || []).map((t) => String(t || "").trim()).filter(Boolean);
  if (!titles.length) return "";
  const parts = [];
  for (const raw of titles) {
    const rawSafe = escapeForPostgrestLike(raw);
    if (rawSafe) parts.push(`title.ilike.*${rawSafe}*`);
    const norm = normalizeTitle(raw);
    const normSafe = escapeForPostgrestLike(norm);
    if (normSafe) parts.push(`title_normalized.ilike.*${normSafe}*`);
  }
  if (!parts.length) return "";
  return `(${parts.join(",")})`;
}
__name(buildTitleOrFilter, "buildTitleOrFilter");
async function queryCandidateJobsByTitle(env, { desiredTitles, limit = 400 }) {
  const params = new URLSearchParams();
  params.set("select", "id,title,title_normalized,description_snippet,city,region,company_name,posted_at");
  params.set("status", "eq.active");
  params.set("limit", String(limit));
  const titleOr = buildTitleOrFilter(desiredTitles);
  if (titleOr) params.set("or", titleOr);
  const rows = await supabaseFetch(env, `/rest/v1/jobs_normalized?${params.toString()}`, { method: "GET" });
  return Array.isArray(rows) ? rows : [];
}
__name(queryCandidateJobsByTitle, "queryCandidateJobsByTitle");
async function queryJobsByExternalIds(env, { sourceId, externalIds, limit = 400 }) {
  const ids = Array.isArray(externalIds) ? externalIds.map((x) => String(x || "").trim()).filter(Boolean) : [];
  if (!ids.length) return [];
  const slice = ids.slice(0, limit);
  const params = new URLSearchParams();
  params.set("select", "id,title,title_normalized,description_snippet,city,region,company_name,posted_at,external_job_id");
  params.set("source_id", `eq.${sourceId}`);
  params.set("external_job_id", `in.(${slice.map((x) => `"${x.replace(/"/g, "")}"`).join(",")})`);
  params.set("limit", String(slice.length));
  const rows = await supabaseFetch(env, `/rest/v1/jobs_normalized?${params.toString()}`, { method: "GET" });
  return Array.isArray(rows) ? rows : [];
}
__name(queryJobsByExternalIds, "queryJobsByExternalIds");
function scoreJobAgainstTitles(job, desiredTitles, excludeTitles) {
  const title = String(job?.title || "").toLowerCase();
  const tnorm = String(job?.title_normalized || "").toLowerCase();
  const desc = String(job?.description_snippet || "").toLowerCase();
  const desired = (desiredTitles || []).map((x) => String(x || "").trim()).filter(Boolean);
  const excluded = (excludeTitles || []).map((x) => String(x || "").trim()).filter(Boolean);
  let score = 0;
  for (const ex of excluded) {
    const exL = ex.toLowerCase();
    if (!exL) continue;
    if (title.includes(exL) || tnorm.includes(exL) || desc.includes(exL)) score -= 50;
  }
  for (const d of desired) {
    const dL = d.toLowerCase();
    if (!dL) continue;
    if (title.includes(dL)) score += 20;
    if (tnorm.includes(dL)) score += 18;
    if (desc.includes(dL)) score += 6;
  }
  if (job?.company_name) score += 1;
  if (job?.posted_at) score += 1;
  return score;
}
__name(scoreJobAgainstTitles, "scoreJobAgainstTitles");
function pickTopJobsByLocationAndScore(rows, locations, desiredTitles, excludeTitles, limit = 200) {
  const locs = (locations || []).map((l) => String(l || "").trim().toLowerCase()).filter(Boolean);
  const scored = [];
  for (const r of rows || []) {
    const id = r?.id;
    if (!id) continue;
    const city = String(r.city || "").toLowerCase();
    const region = String(r.region || "").toLowerCase();
    let locationOk = true;
    if (locs.length) {
      locationOk = locs.some((loc) => loc && (city.includes(loc) || region.includes(loc)));
    }
    if (!locationOk) continue;
    const score = scoreJobAgainstTitles(r, desiredTitles, excludeTitles);
    scored.push({ id, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.id);
}
__name(pickTopJobsByLocationAndScore, "pickTopJobsByLocationAndScore");
async function writeFetchLog(env, { customerId, fetchedBy, totalJobsAdded, radiusKmUsed, matchLevel }) {
  try {
    await supabaseFetch(env, `/rest/v1/customer_fetch_logs`, {
      method: "POST",
      body: [
        {
          customer_id: customerId,
          fetched_by: fetchedBy,
          total_jobs_added: totalJobsAdded,
          radius_km_used: radiusKmUsed,
          match_level: matchLevel
        }
      ]
    });
  } catch (e) {
    await supabaseFetch(env, `/rest/v1/customer_fetch_logs`, {
      method: "POST",
      body: [{ customer_id: customerId, fetched_by: fetchedBy, total_jobs_added: totalJobsAdded }]
    });
  }
}
__name(writeFetchLog, "writeFetchLog");
async function baFetchJson(env, pathWithQuery) {
  const base = (env.BA_API_BASE || "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service").trim().replace(/\/$/, "");
  const url = `${base}${pathWithQuery.startsWith("/") ? "" : "/"}${pathWithQuery}`;
  const baKey = (env.BA_API_KEY || "jobboerse-jobsuche").trim();
  const headers = {
    accept: "application/json",
    "X-API-Key": baKey,
    // These are harmless for the API-key flow and can help avoid edge filtering.
    "Accept-Language": "de-de",
    "User-Agent": "Jobsuche/1070 CFNetwork/1220.1 Darwin/20.3.0"
  };
  const res = await fetch(url, { method: "GET", headers });
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`BA API request failed ${res.status} for ${pathWithQuery}: ${text.slice(0, 400)}`);
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`BA API returned non-JSON response for ${pathWithQuery}: ${text.slice(0, 400)}`);
  }
}
__name(baFetchJson, "baFetchJson");
async function baFetchWebsiteJobdetail(env, refnr) {
  const base = (env.BA_WEBSITE_BASE || "https://www.arbeitsagentur.de").trim().replace(/\/$/, "");
  const url = `${base}/jobsuche/jobdetail/${encodeURIComponent(refnr)}`;
  const headers = {
    "User-Agent": (env.BA_WEBSITE_USER_AGENT || "Mozilla/5.0 (compatible; JobApplyAI/1.0; +https://jobmejob.com)").trim(),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache"
  };
  const res = await fetch(url, { method: "GET", headers, redirect: "follow" });
  const html = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`BA website jobdetail failed ${res.status} for ${refnr}: ${html.slice(0, 200)}`);
  }
  const jsonText = extractNgStateJsonFromHtml(html);
  if (!jsonText) throw new Error("BA jobdetail page: ng-state JSON not found");
  let state = null;
  try {
    state = JSON.parse(jsonText);
  } catch {
    throw new Error("BA jobdetail page: ng-state JSON parse failed");
  }
  const jd = state && (state.jobdetail || state.jobDetails || state.jobdetails) ? state.jobdetail || state.jobDetails || state.jobdetails : null;
  const description = jd && (jd.stellenangebotsBeschreibung || jd.stellenangebotsBeschreibungText || jd.stellenbeschreibung || jd.stellenbeschreibungText) || "";
  const title = jd && (jd.stellenangebotsTitel || jd.titel || jd.stellenbezeichnung) || "";
  const modifiedAtRaw = jd && (jd.aenderungsdatum || jd.aenderungsdatumZeitpunkt || jd.modifikationsTimestamp || jd.modifikationsZeitpunkt) || null;
  let modifiedAt = null;
  if (modifiedAtRaw) {
    const d = new Date(modifiedAtRaw);
    if (!Number.isNaN(d.getTime())) {
      modifiedAt = d.toISOString();
    } else {
      const m = String(modifiedAtRaw).match(/^(\d{4}-\d{2}-\d{2})/);
      if (m) {
        const d2 = /* @__PURE__ */ new Date(m[1] + "T00:00:00Z");
        if (!Number.isNaN(d2.getTime())) modifiedAt = d2.toISOString();
      }
    }
  }
  return {
    url,
    source: "ba_website_ng_state",
    title,
    description,
    modified_at: modifiedAt
  };
}
__name(baFetchWebsiteJobdetail, "baFetchWebsiteJobdetail");
function extractNgStateJsonFromHtml(html) {
  if (!html) return "";
  const marker = '<script id="ng-state" type="application/json">';
  const idx = html.indexOf(marker);
  if (idx !== -1) {
    const start = idx + marker.length;
    const end = html.indexOf("<\/script>", start);
    if (end !== -1) return html.slice(start, end).trim();
  }
  const m = html.match(/<script[^>]*id=["']ng-state["'][^>]*>([\s\S]*?)<\/script>/i);
  if (m && m[1]) return m[1].trim();
  return "";
}
__name(extractNgStateJsonFromHtml, "extractNgStateJsonFromHtml");
function parseIsoToMs(v) {
  if (!v) return 0;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : 0;
}
__name(parseIsoToMs, "parseIsoToMs");
async function ensureBaJobDescriptionCached(env, jobRow, { ttlHours = 336 } = {}) {
  const job = jobRow;
  const now = Date.now();
  const ttlMs = Math.max(1, ttlHours) * 3600 * 1e3;
  const existing = String(job.description_full || "").trim();
  const fetchedAtMs = parseIsoToMs(job.description_full_fetched_at);
  if (existing && fetchedAtMs && now - fetchedAtMs < ttlMs) {
    return { status: "cached", from_cache: true, fetched: false, job };
  }
  const err = String(job.description_full_error || "").trim();
  const errAtMs = parseIsoToMs(job.description_full_error_at);
  const backoffMs = 24 * 3600 * 1e3;
  if (!existing && err && errAtMs && now - errAtMs < backoffMs) {
    return { status: "failed_recently", from_cache: true, fetched: false, job, error: err };
  }
  const refnr = String(job.external_job_id || "").trim();
  if (!refnr) {
    return { status: "failed", from_cache: false, fetched: false, job, error: "Job missing external_job_id" };
  }
  if (!isBaRefnr(refnr)) {
    return { status: existing ? "cached" : "not_supported", from_cache: Boolean(existing), fetched: false, job, error: existing ? null : "Not a BA refnr" };
  }
  try {
    const details = await baFetchWebsiteJobdetail(env, refnr);
    const desc = String(details.description || "").trim();
    if (!desc) throw new Error("BA jobdetail returned empty description");
    const hash = await sha256Hex(desc);
    const patch = {
      description_full: desc,
      description_full_source: details.source,
      description_full_hash: hash,
      description_full_fetched_at: (/* @__PURE__ */ new Date()).toISOString(),
      description_full_error: null,
      description_full_error_at: null
    };
    if (details.modified_at) {
      patch.source_modified_at = details.modified_at;
    }
    await supabaseFetch(env, `/rest/v1/jobs_normalized?id=eq.${encodeURIComponent(job.id)}`, {
      method: "PATCH",
      body: patch,
      headers: { Prefer: "return=minimal" }
    });
    return { status: "fetched", from_cache: false, fetched: true, job: { ...job, ...patch } };
  } catch (e) {
    const errMsg = String(e && e.message ? e.message : e).slice(0, 400);
    const patch = {
      description_full_error: errMsg,
      description_full_error_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    try {
      await supabaseFetch(env, `/rest/v1/jobs_normalized?id=eq.${encodeURIComponent(job.id)}`, {
        method: "PATCH",
        body: patch,
        headers: { Prefer: "return=minimal" }
      });
    } catch {
    }
    return { status: "failed", from_cache: false, fetched: false, job: { ...job, ...patch }, error: errMsg };
  }
}
__name(ensureBaJobDescriptionCached, "ensureBaJobDescriptionCached");
function isAdminAuthorized(request, env) {
  const adminToken = (env.WORKER_ADMIN_TOKEN || "").trim();
  if (!adminToken) return false;
  const incomingX = (request.headers.get("x-admin-token") || "").trim();
  if (incomingX && incomingX === adminToken) return true;
  const auth = (request.headers.get("Authorization") || "").trim();
  if (auth && auth === `Bearer ${adminToken}`) return true;
  return false;
}
__name(isAdminAuthorized, "isAdminAuthorized");
function looksLikeUuid(s) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s);
}
__name(looksLikeUuid, "looksLikeUuid");
function looksLikeEmail(s) {
  if (!s) return false;
  const v = String(s).trim();
  if (v.length < 5 || v.length > 200) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
__name(looksLikeEmail, "looksLikeEmail");
function normStringArray(v, { maxItems = 30, maxLen = 120 } = {}) {
  const arr = Array.isArray(v) ? v : [];
  const out = [];
  for (const item of arr) {
    const s = String(item || "").trim();
    if (!s) continue;
    out.push(s.slice(0, maxLen));
    if (out.length >= maxItems) break;
  }
  return out;
}
__name(normStringArray, "normStringArray");
function normRadiusKm(v) {
  if (v === null || v === void 0 || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  if (n > 500) return 500;
  return Math.round(n);
}
__name(normRadiusKm, "normRadiusKm");
async function supabaseFetch(env, path, { method = "GET", body = null, headers = {} } = {}) {
  const supabaseUrl = mustEnv(env, "SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = mustEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...headers
    },
    body: body ? JSON.stringify(body) : null
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase error ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}
__name(supabaseFetch, "supabaseFetch");
var ROLE_CLUSTER_CACHE = { data: null, expiresAt: 0 };
function normalizeToken(s) {
  return String(s || "").toLowerCase().replace(/[(){}\[\],.]/g, " ").replace(/\s+/g, " ").trim();
}
__name(normalizeToken, "normalizeToken");
function buildSkillBag(aiResult) {
  const core = (aiResult?.skills?.core || []).map(normalizeToken);
  const supporting = (aiResult?.skills?.supporting || []).map(normalizeToken);
  const tools = (aiResult?.skills?.tools || []).map(normalizeToken);
  const all = [...core, ...supporting, ...tools].filter(Boolean);
  const tokens = /* @__PURE__ */ new Set();
  const phrases = /* @__PURE__ */ new Set();
  for (const phrase of all) {
    phrases.add(phrase);
    for (const t of phrase.split(" ")) tokens.add(t);
  }
  return { phrases, tokens };
}
__name(buildSkillBag, "buildSkillBag");
function scoreCluster(cluster, skillBag) {
  const keywords = (cluster.skill_keywords || []).map(normalizeToken);
  const negatives = (cluster.negative_keywords || []).map(normalizeToken);
  let hit = 0;
  for (const kw of keywords) {
    if (!kw) continue;
    if (skillBag.phrases.has(kw) || skillBag.tokens.has(kw)) hit += 1;
  }
  let penalty = 0;
  for (const nk of negatives) {
    if (!nk) continue;
    if (skillBag.phrases.has(nk) || skillBag.tokens.has(nk)) penalty += 1;
  }
  const raw = hit - penalty;
  const denom = Math.max(6, Math.min(20, keywords.length));
  const score = Math.max(0, raw) / denom;
  return { score, hit, penalty };
}
__name(scoreCluster, "scoreCluster");
function suggestByRoleClusters(aiResult, clusters, opts = {}) {
  const minClusterScore = opts.minClusterScore ?? 0.2;
  const maxClusters = opts.maxClusters ?? 3;
  const maxAltTitles = opts.maxAltTitles ?? 5;
  const primaryTitles = new Set(
    (aiResult?.primary_job_titles || []).map((x) => normalizeToken(x?.title))
  );
  const skillBag = buildSkillBag(aiResult);
  const ranked = (clusters || []).map((c) => {
    const { score, hit, penalty } = scoreCluster(c, skillBag);
    return { id: c.id, label: c.label, score, hit, penalty, titles: c.titles || [] };
  }).filter((x) => x.score >= minClusterScore).sort((a, b) => b.score - a.score).slice(0, maxClusters);
  const altTitles = [];
  const seen = /* @__PURE__ */ new Set();
  for (const cl of ranked) {
    for (const t of cl.titles) {
      const nt = normalizeToken(t);
      if (!nt) continue;
      if (primaryTitles.has(nt)) continue;
      if (seen.has(nt)) continue;
      seen.add(nt);
      altTitles.push({ title: t, source_cluster: cl.id, score: cl.score });
      if (altTitles.length >= maxAltTitles) break;
    }
    if (altTitles.length >= maxAltTitles) break;
  }
  return { clusters: ranked, alternative_titles: altTitles };
}
__name(suggestByRoleClusters, "suggestByRoleClusters");
async function loadRoleClusters(env, ttlMs = 10 * 60 * 1e3) {
  const now = Date.now();
  if (ROLE_CLUSTER_CACHE.data && now < ROLE_CLUSTER_CACHE.expiresAt) return ROLE_CLUSTER_CACHE.data;
  const q = new URLSearchParams();
  q.set("select", "id,label,titles,skill_keywords,negative_keywords,is_active,version,updated_at");
  q.set("is_active", "eq.true");
  q.set("limit", "200");
  const rows = await supabaseFetch(env, `/rest/v1/role_clusters?${q.toString()}`, { method: "GET" });
  const clusters = (Array.isArray(rows) ? rows : []).map((r) => ({
    id: r.id,
    label: r.label,
    titles: Array.isArray(r.titles) ? r.titles : [],
    skill_keywords: Array.isArray(r.skill_keywords) ? r.skill_keywords : [],
    negative_keywords: Array.isArray(r.negative_keywords) ? r.negative_keywords : []
  }));
  ROLE_CLUSTER_CACHE.data = clusters;
  ROLE_CLUSTER_CACHE.expiresAt = now + ttlMs;
  return clusters;
}
__name(loadRoleClusters, "loadRoleClusters");
async function getSupabaseUserFromAuthHeader(request, env) {
  const auth = (request.headers.get("Authorization") || "").trim();
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  if (!token) return null;
  const supabaseUrl = mustEnv(env, "SUPABASE_URL").replace(/\/$/, "");
  const anonKey = mustEnv(env, "SUPABASE_ANON_KEY");
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) return null;
  return await res.json();
}
__name(getSupabaseUserFromAuthHeader, "getSupabaseUserFromAuthHeader");
async function getCustomerIdForSupabaseUserEmail(env, email) {
  const e = String(email || "").trim().toLowerCase();
  if (!looksLikeEmail(e)) return null;
  const qCust = new URLSearchParams();
  qCust.set("select", "id,email");
  qCust.set("email", `eq.${e}`);
  qCust.set("limit", "1");
  const customers = await supabaseFetch(env, `/rest/v1/customers?${qCust.toString()}`, { method: "GET" });
  if (!Array.isArray(customers) || customers.length === 0) return null;
  return customers[0].id;
}
__name(getCustomerIdForSupabaseUserEmail, "getCustomerIdForSupabaseUserEmail");
async function ensureCustomerBootstrap(env, email) {
  const e = String(email || "").trim().toLowerCase();
  if (!looksLikeEmail(e)) throw new Error("Invalid email for bootstrap");
  await supabaseFetch(env, `/rest/v1/customers?on_conflict=email`, {
    method: "POST",
    body: [{ email: e, full_name: null }],
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
  const qCust = new URLSearchParams();
  qCust.set("select", "id,email,created_at");
  qCust.set("email", `eq.${e}`);
  qCust.set("limit", "1");
  const customers = await supabaseFetch(env, `/rest/v1/customers?${qCust.toString()}`, { method: "GET" });
  if (!Array.isArray(customers) || customers.length === 0) throw new Error("Customer lookup failed after upsert");
  const customerId = customers[0].id;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await supabaseFetch(env, `/rest/v1/customer_profiles?on_conflict=customer_id`, {
    method: "POST",
    body: [{ customer_id: customerId, updated_at: now }],
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }
  });
  return { customerId };
}
__name(ensureCustomerBootstrap, "ensureCustomerBootstrap");
async function deleteCustomerPlanRecord(env, customerId) {
  if (!looksLikeUuid(customerId)) throw new Error("Valid customerId is required");
  await supabaseFetch(env, `/rest/v1/customer_plans?customer_id=eq.${encodeURIComponent(customerId)}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" }
  });
}
__name(deleteCustomerPlanRecord, "deleteCustomerPlanRecord");
async function enqueueJobsForCustomer(env, customerId, jobIds, appliedBy = "system", queuedMeta = null) {
  const ids = Array.isArray(jobIds) ? jobIds.filter(Boolean) : [];
  if (!ids.length) return 0;
  const qExisting = new URLSearchParams();
  qExisting.set("select", "job_id");
  qExisting.set("customer_id", `eq.${customerId}`);
  qExisting.set("job_id", `in.(${ids.map((id) => `"${String(id).trim()}"`).join(",")})`);
  qExisting.set("limit", String(ids.length));
  const existing = await supabaseFetch(env, `/rest/v1/applications?${qExisting.toString()}`, { method: "GET" });
  const existingSet = new Set((existing || []).map((r) => r.job_id));
  const newJobIds = ids.filter((id) => !existingSet.has(id));
  if (!newJobIds.length) return 0;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const rows = newJobIds.map((jobId) => ({
    customer_id: customerId,
    job_id: jobId,
    status: "new",
    applied_by: appliedBy,
    created_at: now,
    updated_at: now
  }));
  await supabaseFetch(env, `/rest/v1/applications?on_conflict=customer_id,job_id`, {
    method: "POST",
    body: rows,
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }
  });
  try {
    const evRows = newJobIds.map((jobId) => ({
      customer_id: customerId,
      job_id: jobId,
      event_type: "queued",
      actor: appliedBy || "system",
      meta: queuedMeta ?? null
    }));
    await supabaseFetch(env, `/rest/v1/application_events`, {
      method: "POST",
      body: evRows,
      headers: { Prefer: "return=minimal" }
    });
  } catch (e) {
  }
  return rows.length;
}
__name(enqueueJobsForCustomer, "enqueueJobsForCustomer");
async function getSourceId(env, name, country) {
  const q = new URLSearchParams();
  q.set("select", "id");
  q.set("name", `eq.${name}`);
  q.set("country", `eq.${country}`);
  const data = await supabaseFetch(env, `/rest/v1/sources?${q.toString()}`, { method: "GET" });
  if (!Array.isArray(data) || data.length === 0) throw new Error(`Source not found in DB: ${name} ${country}`);
  return data[0].id;
}
__name(getSourceId, "getSourceId");
async function upsertRawJobs(env, rows) {
  if (!rows.length) return 0;
  await supabaseFetch(env, `/rest/v1/raw_jobs?on_conflict=source_id,external_job_id`, {
    method: "POST",
    body: rows,
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
  return rows.length;
}
__name(upsertRawJobs, "upsertRawJobs");
async function upsertNormalizedJobs(env, rows) {
  if (!rows.length) return 0;
  await supabaseFetch(env, `/rest/v1/jobs_normalized?on_conflict=source_id,external_job_id`, {
    method: "POST",
    body: rows,
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
  return rows.length;
}
__name(upsertNormalizedJobs, "upsertNormalizedJobs");
async function ensureCvStudioImportSourceId(env) {
  const name = "CV Studio Import";
  const country = "GLOBAL";
  const q = new URLSearchParams();
  q.set("select", "id");
  q.set("name", `eq.${name}`);
  q.set("country", `eq.${country}`);
  q.set("limit", "1");
  const existing = await supabaseFetch(env, `/rest/v1/sources?${q.toString()}`, { method: "GET" });
  if (Array.isArray(existing) && existing.length && existing[0]?.id) return existing[0].id;
  try {
    await supabaseFetch(env, `/rest/v1/sources`, {
      method: "POST",
      body: [{
        name,
        country,
        api_type: "manual",
        auth_type: "none",
        base_url: "https://jobmejob.com/cv",
        enabled: true
      }],
      headers: { Prefer: "return=minimal" }
    });
  } catch (err) {
    const msg = String(err?.message || err || "");
    const duplicateLike = msg.includes("duplicate key") || msg.includes("23505");
    if (!duplicateLike) throw err;
  }
  const rows = await supabaseFetch(env, `/rest/v1/sources?${q.toString()}`, { method: "GET" });
  if (Array.isArray(rows) && rows.length && rows[0]?.id) return rows[0].id;
  throw new Error("Failed to resolve CV Studio import source");
}
__name(ensureCvStudioImportSourceId, "ensureCvStudioImportSourceId");
function normalizeImportedApplyUrl(v) {
  const raw = String(v || "").trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString().slice(0, 2048);
  } catch {
    return null;
  }
}
__name(normalizeImportedApplyUrl, "normalizeImportedApplyUrl");
async function ensureCvStudioImportedJob(env, customerId, {
  jobDescription,
  jobTitle,
  companyName,
  applyUrl,
  languageHint
} = {}) {
  const descText = String(jobDescription || "").trim();
  if (!descText) throw new Error("jobDescription is required");
  const sourceId = await ensureCvStudioImportSourceId(env);
  const title = String(jobTitle || "").trim() || "Imported job description";
  const company = String(companyName || "").trim() || null;
  const safeApplyUrl = normalizeImportedApplyUrl(applyUrl);
  const lang = String(languageHint || "auto").trim().toLowerCase();
  const descHash = await sha256Hex(descText);
  const compositeHash = await sha256Hex([title, company || "", safeApplyUrl || "", descHash].join("|"));
  const externalJobId = `cvstudio_${compositeHash.slice(0, 48)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await supabaseFetch(env, `/rest/v1/jobs_normalized?on_conflict=source_id,external_job_id`, {
    method: "POST",
    body: [{
      source_id: sourceId,
      external_job_id: externalJobId,
      title,
      title_normalized: normalizeTitle(title),
      company_name: company,
      country: lang === "de" ? "DE" : "GLOBAL",
      city: null,
      region: null,
      employment_type: null,
      seniority: null,
      description_snippet: descText.slice(0, 500) || null,
      description_full: descText,
      description_full_source: "cv_studio_import",
      description_full_hash: descHash,
      description_full_fetched_at: now,
      description_full_error: null,
      description_full_error_at: null,
      apply_url: safeApplyUrl,
      posted_at: now,
      fetched_at: now,
      status: "active"
    }],
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
  const qJob = new URLSearchParams();
  qJob.set("select", "id,title,company_name,apply_url,description_full_hash");
  qJob.set("source_id", `eq.${sourceId}`);
  qJob.set("external_job_id", `eq.${externalJobId}`);
  qJob.set("limit", "1");
  const jobRows = await supabaseFetch(env, `/rest/v1/jobs_normalized?${qJob.toString()}`, { method: "GET" });
  const job = Array.isArray(jobRows) && jobRows.length ? jobRows[0] : null;
  if (!job?.id) throw new Error("Failed to create imported CV Studio job");
  await supabaseFetch(env, `/rest/v1/applications?on_conflict=customer_id,job_id`, {
    method: "POST",
    body: [{
      customer_id: customerId,
      job_id: job.id,
      status: "shortlisted",
      notes: JSON.stringify({ source: "cv_studio_import", imported: true }),
      applied_by: "customer",
      updated_at: now
    }],
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
  return job;
}
__name(ensureCvStudioImportedJob, "ensureCvStudioImportedJob");
async function handleCustomerUpsertPublic(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  let requestedEmail = "";
  try {
    const body = await request.json();
    requestedEmail = String(body?.email || "").trim().toLowerCase();
  } catch {
  }
  if (requestedEmail && requestedEmail !== me.email) {
    return json(request, { error: "Email does not match authenticated user" }, 403);
  }
  return json(request, {
    ok: true,
    me: true,
    email: me.email,
    customer_id: me.customerId
  }, 200);
}
__name(handleCustomerUpsertPublic, "handleCustomerUpsertPublic");
function buildCustomerProfileRow(customerId, body) {
  const desired_titles = normStringArray(body?.desired_titles, { maxItems: 30, maxLen: 120 });
  const exclude_titles = normStringArray(body?.exclude_titles, { maxItems: 30, maxLen: 120 });
  const industries = normStringArray(body?.industries, { maxItems: 30, maxLen: 120 });
  const countries_allowed = normStringArray(body?.countries_allowed, { maxItems: 20, maxLen: 80 });
  const locations = normStringArray(body?.locations, { maxItems: 20, maxLen: 120 });
  const language_requirements = normStringArray(body?.language_requirements, { maxItems: 10, maxLen: 80 });
  const seniority = normStringArray(body?.seniority, { maxItems: 10, maxLen: 80 });
  const work_type = normStringArray(body?.work_type, { maxItems: 10, maxLen: 80 });
  const radius_km = normRadiusKm(body?.radius_km);
  const salary_min = body?.salary_min === null || body?.salary_min === void 0 || body?.salary_min === "" ? null : Number.isFinite(Number(body?.salary_min)) ? Math.max(0, Math.round(Number(body?.salary_min))) : null;
  return {
    customer_id: customerId,
    desired_titles,
    exclude_titles,
    industries,
    countries_allowed,
    locations,
    seniority,
    radius_km,
    salary_min,
    language_requirements: language_requirements.length ? language_requirements : null,
    work_type: work_type.length ? work_type : null,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
}
__name(buildCustomerProfileRow, "buildCustomerProfileRow");
async function writeCustomerProfile(request, env, customerId, body, { me = false, legacy = false } = {}) {
  const row = buildCustomerProfileRow(customerId, body);
  await supabaseFetch(env, `/rest/v1/customer_profiles?on_conflict=customer_id`, {
    method: "POST",
    body: [row],
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
  return json(request, {
    ok: true,
    ...me ? { me: true } : {},
    ...legacy ? { legacy: true } : {},
    customer_id: customerId
  }, 200);
}
__name(writeCustomerProfile, "writeCustomerProfile");
function parseRequestedPlanId(body) {
  const plan_id = (body?.plan_id || "").toString().trim().toLowerCase();
  const allowed = /* @__PURE__ */ new Set(["free", "starter", "pro", "max", "cv_starter", "cv_plus", "cv_unlimited"]);
  if (!allowed.has(plan_id)) {
    return { ok: false, plan_id: null, error: "Invalid plan_id", allowed: Array.from(allowed) };
  }
  return { ok: true, plan_id, allowed: Array.from(allowed) };
}
__name(parseRequestedPlanId, "parseRequestedPlanId");
async function writeSelfServicePlan(request, env, customerId, plan_id, { me = false, legacy = false } = {}) {
  if (plan_id !== "free") {
    return json(request, {
      error: "Paid plan changes must come from Stripe checkout or webhook sync",
      allowed: ["free"],
      checkout_path: "/me/billing/checkout"
    }, 403);
  }
  await deleteCustomerPlanRecord(env, customerId);
  return json(request, {
    ok: true,
    ...me ? { me: true } : {},
    ...legacy ? { legacy: true } : {},
    customer_id: customerId,
    plan_id
  }, 200);
}
__name(writeSelfServicePlan, "writeSelfServicePlan");
async function handleCustomerProfileUpsertPublic(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  let body = null;
  try {
    body = await request.json();
  } catch {
    return json(request, { error: "Invalid JSON body" }, 400);
  }
  return await writeCustomerProfile(request, env, me.customerId, body, { legacy: true });
}
__name(handleCustomerProfileUpsertPublic, "handleCustomerProfileUpsertPublic");
async function handleCustomerPlanUpsertPublic(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  let body = null;
  try {
    body = await request.json();
  } catch {
    return json(request, { error: "Invalid JSON body" }, 400);
  }
  const plan = parseRequestedPlanId(body);
  if (!plan.ok) {
    return json(request, { error: plan.error, allowed: plan.allowed }, 400);
  }
  return await writeSelfServicePlan(request, env, me.customerId, plan.plan_id, { legacy: true });
}
__name(handleCustomerPlanUpsertPublic, "handleCustomerPlanUpsertPublic");
async function handleBillingConfigGet(request, env) {
  const billing = getStripeBillingConfig(env);
  return json(request, { ok: true, billing }, 200);
}
__name(handleBillingConfigGet, "handleBillingConfigGet");
async function upsertCustomerPlanRecord(env, customerId, planId) {
  const normalizedPlanId = normalizeCvStudioPlanId(planId) || (String(planId || "").trim().toLowerCase() === "free" ? "free" : null);
  if (!looksLikeUuid(customerId)) throw new Error("Valid customerId is required");
  if (!normalizedPlanId) throw new Error("Unsupported planId");
  if (normalizedPlanId === "free") {
    await deleteCustomerPlanRecord(env, customerId);
    return "free";
  }
  await supabaseFetch(env, `/rest/v1/customer_plans?on_conflict=customer_id`, {
    method: "POST",
    body: [{
      customer_id: customerId,
      plan_id: normalizedPlanId,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }],
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
  return normalizedPlanId;
}
__name(upsertCustomerPlanRecord, "upsertCustomerPlanRecord");
function resolveStripePlanIdFromSubscription(env, subscription) {
  const metaPlanId = normalizeCvStudioPlanId(subscription?.metadata?.plan_id || "");
  if (metaPlanId) return metaPlanId;
  const items = Array.isArray(subscription?.items?.data) ? subscription.items.data : [];
  const starterPriceIds = new Set(getAllStripePriceIdsForPlan(env, "cv_starter"));
  const plusPriceIds = new Set(getAllStripePriceIdsForPlan(env, "cv_plus"));
  for (const item of items) {
    const priceId = String(item?.price?.id || "").trim();
    if (!priceId) continue;
    if (starterPriceIds.has(priceId)) return "cv_starter";
    if (plusPriceIds.has(priceId)) return "cv_plus";
  }
  return null;
}
__name(resolveStripePlanIdFromSubscription, "resolveStripePlanIdFromSubscription");
async function resolveStripeCustomerContext(env, stripeCustomerId, metadata = {}) {
  let customerId = looksLikeUuid(metadata?.customer_id) ? String(metadata.customer_id).trim() : "";
  let email = looksLikeEmail(metadata?.email || "") ? String(metadata.email).trim().toLowerCase() : "";
  if ((!customerId || !email) && stripeCustomerId) {
    const stripeCustomer = await stripeGetCustomer(env, stripeCustomerId);
    if (!customerId && looksLikeUuid(stripeCustomer?.metadata?.customer_id)) {
      customerId = String(stripeCustomer.metadata.customer_id).trim();
    }
    if (!email && looksLikeEmail(stripeCustomer?.email || "")) {
      email = String(stripeCustomer.email).trim().toLowerCase();
    }
  }
  if (!customerId && email) {
    customerId = await getCustomerIdForSupabaseUserEmail(env, email) || "";
  }
  if (!customerId && email) {
    const boot = await ensureCustomerBootstrap(env, email);
    customerId = boot.customerId;
  }
  return { customerId: customerId || null, email: email || null };
}
__name(resolveStripeCustomerContext, "resolveStripeCustomerContext");
async function syncStripeSubscriptionToCustomerPlan(env, subscription, { forceFree = false } = {}) {
  if (!subscription || typeof subscription !== "object") return null;
  const stripeCustomerId = String(subscription.customer || "").trim();
  const ctx = await resolveStripeCustomerContext(env, stripeCustomerId, subscription.metadata || {});
  if (!ctx.customerId) throw new Error("Could not resolve customer for Stripe subscription");
  const status = String(subscription.status || "").trim().toLowerCase();
  if (forceFree || ["canceled", "unpaid", "incomplete_expired"].includes(status)) {
    return await upsertCustomerPlanRecord(env, ctx.customerId, "free");
  }
  if (!["active", "trialing", "past_due"].includes(status)) {
    return null;
  }
  const planId = resolveStripePlanIdFromSubscription(env, subscription);
  if (!planId) throw new Error("Could not resolve CV Studio plan from Stripe subscription");
  return await upsertCustomerPlanRecord(env, ctx.customerId, planId);
}
__name(syncStripeSubscriptionToCustomerPlan, "syncStripeSubscriptionToCustomerPlan");
async function handleStripeWebhook(request, env) {
  const payload = await request.text();
  const signatureHeader = request.headers.get("Stripe-Signature") || "";
  if (!await verifyStripeWebhookSignature(env, payload, signatureHeader)) {
    return json(request, { error: "Invalid Stripe signature" }, 400);
  }
  let event = null;
  try {
    event = JSON.parse(payload);
  } catch {
    return json(request, { error: "Invalid Stripe webhook payload" }, 400);
  }
  try {
    const obj = event?.data?.object || null;
    const type = String(event?.type || "").trim();
    if (type === "customer.subscription.created" || type === "customer.subscription.updated") {
      await syncStripeSubscriptionToCustomerPlan(env, obj);
    } else if (type === "customer.subscription.deleted") {
      await syncStripeSubscriptionToCustomerPlan(env, obj, { forceFree: true });
    } else if (type === "invoice.paid" && obj?.subscription) {
      const subscription = await stripeGetSubscription(env, obj.subscription);
      await syncStripeSubscriptionToCustomerPlan(env, subscription);
    }
  } catch (err) {
    return json(request, { error: "Stripe webhook handler failed", details: String(err?.message || err || "") }, 500);
  }
  return json(request, { ok: true, received: true }, 200);
}
__name(handleStripeWebhook, "handleStripeWebhook");
async function requireMeCustomerId(request, env) {
  const auth = (request.headers.get("Authorization") || "").trim();
  if (!auth.startsWith("Bearer ")) {
    return { ok: false, res: json(request, { error: "Unauthorized: missing Authorization Bearer token" }, 401) };
  }
  const user = await getSupabaseUserFromAuthHeader(request, env);
  if (!user?.email) {
    return { ok: false, res: json(request, { error: "Unauthorized: invalid or expired token" }, 401) };
  }
  const email = String(user.email || "").trim().toLowerCase();
  let customerId = await getCustomerIdForSupabaseUserEmail(env, email);
  if (!customerId) {
    const boot = await ensureCustomerBootstrap(env, email);
    customerId = boot.customerId;
  }
  return { ok: true, customerId, email };
}
__name(requireMeCustomerId, "requireMeCustomerId");
async function handleMeProfileGet(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  const q = new URLSearchParams();
  q.set(
    "select",
    "customer_id,countries_allowed,locations,radius_km,desired_titles,exclude_titles,industries,seniority,work_type,salary_min,language_requirements,updated_at"
  );
  q.set("customer_id", `eq.${me.customerId}`);
  q.set("limit", "1");
  const rows = await supabaseFetch(env, `/rest/v1/customer_profiles?${q.toString()}`, { method: "GET" });
  const profile = Array.isArray(rows) && rows.length ? rows[0] : null;
  return json(request, { ok: true, me: true, customer_id: me.customerId, profile }, 200);
}
__name(handleMeProfileGet, "handleMeProfileGet");
async function handleMeProfileUpsert(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  let body = null;
  try {
    body = await request.json();
  } catch {
    return json(request, { error: "Invalid JSON body" }, 400);
  }
  return await writeCustomerProfile(request, env, me.customerId, body, { me: true });
}
__name(handleMeProfileUpsert, "handleMeProfileUpsert");
async function handleMePlanGet(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  const q = new URLSearchParams();
  q.set("select", "customer_id,plan_id,updated_at");
  q.set("customer_id", `eq.${me.customerId}`);
  q.set("limit", "1");
  const rows = await supabaseFetch(env, `/rest/v1/customer_plans?${q.toString()}`, { method: "GET" });
  const plan = Array.isArray(rows) && rows.length ? rows[0] : null;
  return json(request, { ok: true, me: true, customer_id: me.customerId, plan }, 200);
}
__name(handleMePlanGet, "handleMePlanGet");
async function handleMePlanUpsert(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  let body = null;
  try {
    body = await request.json();
  } catch {
    return json(request, { error: "Invalid JSON body" }, 400);
  }
  const plan = parseRequestedPlanId(body);
  if (!plan.ok) {
    return json(request, { error: plan.error, allowed: plan.allowed }, 400);
  }
  return await writeSelfServicePlan(request, env, me.customerId, plan.plan_id, { me: true });
}
__name(handleMePlanUpsert, "handleMePlanUpsert");
async function handleMeBillingSummary(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  const billing = getStripeBillingConfig(env);
  const plan = await getCustomerPlanRow(env, me.customerId);
  const cvAccess = await resolveCvStudioAccess(env, me.customerId, plan);
  const planId = plan?.plan_id ? String(plan.plan_id).trim().toLowerCase() : null;
  const response = {
    ok: true,
    me: true,
    provider: "stripe",
    billing,
    email: me.email,
    customer_id: me.customerId,
    stripe_customer_id: null,
    plan_id: planId,
    cv_paid: cvAccess.paid,
    cv_plan_id: cvAccess.planId,
    cv_quota_limit: cvAccess.limit,
    cv_quota_used: cvAccess.used,
    cv_quota_remaining: cvAccess.remaining,
    cv_quota_period_started_at: cvAccess.periodStartedAt,
    subscription: null,
    invoices: []
  };
  if (!billing.stripe_enabled) {
    return json(request, response, 200);
  }
  try {
    const stripeCustomer = await stripeFindCustomerByEmail(env, me.email);
    if (!stripeCustomer?.id) {
      return json(request, response, 200);
    }
    const subscriptions = await stripeListSubscriptions(env, stripeCustomer.id, { limit: 10 });
    const currentSubscription = pickCurrentStripeSubscription(subscriptions);
    const invoices = await stripeListInvoices(env, stripeCustomer.id, { limit: 6 });
    response.stripe_customer_id = String(stripeCustomer.id || "").trim() || null;
    response.subscription = summarizeStripeSubscription(env, currentSubscription);
    response.invoices = invoices.map((invoice) => summarizeStripeInvoice(invoice)).filter(Boolean);
    return json(request, response, 200);
  } catch (err) {
    response.provider_error = String(err?.message || err || "Stripe billing summary failed");
    return json(request, response, 200);
  }
}
__name(handleMeBillingSummary, "handleMeBillingSummary");
async function handleMeBillingCheckout(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  const billing = getStripeBillingConfig(env);
  if (!billing.checkout_enabled) {
    return json(request, { ok: false, error: "Stripe checkout is not configured yet." }, 501);
  }
  let body = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const planId = normalizeCvStudioPlanId(body?.plan_id || "");
  if (planId !== "cv_starter" && planId !== "cv_plus") {
    return json(request, { ok: false, error: "plan_id must be starter or plus" }, 400);
  }
  try {
    const session = await stripeCreateCheckoutSession(env, {
      email: me.email,
      customerId: me.customerId,
      planId,
      locale: body?.locale || ""
    });
    return json(request, { ok: true, provider: "stripe", plan_id: planId, url: session?.url || null, session_id: session?.id || null }, 200);
  } catch (err) {
    return json(request, { ok: false, error: String(err?.message || err || "Stripe checkout failed") }, 502);
  }
}
__name(handleMeBillingCheckout, "handleMeBillingCheckout");
async function handleMeBillingPortal(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  const billing = getStripeBillingConfig(env);
  if (!billing.portal_enabled) {
    return json(request, { ok: false, error: "Stripe billing portal is not configured yet." }, 501);
  }
  let body = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  try {
    const session = await stripeCreatePortalSession(env, {
      email: me.email,
      customerId: me.customerId,
      locale: body?.locale || ""
    });
    return json(request, { ok: true, provider: "stripe", url: session?.url || null }, 200);
  } catch (err) {
    return json(request, { ok: false, error: String(err?.message || err || "Stripe billing portal failed") }, 502);
  }
}
__name(handleMeBillingPortal, "handleMeBillingPortal");
async function handleMeBillingConfirm(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  let body = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const sessionId = String(body?.session_id || "").trim();
  if (!sessionId) {
    return json(request, { ok: false, error: "session_id is required" }, 400);
  }
  try {
    const checkout = await stripeGetCheckoutSession(env, sessionId, { expandSubscription: true });
    if (!checkout || typeof checkout !== "object") {
      return json(request, { ok: false, error: "Stripe checkout session not found" }, 404);
    }
    const checkoutStatus = String(checkout.status || "").trim().toLowerCase();
    const paymentStatus = String(checkout.payment_status || "").trim().toLowerCase();
    if (checkoutStatus !== "complete" || !["paid", "no_payment_required"].includes(paymentStatus)) {
      return json(request, {
        ok: false,
        error: "Stripe checkout is not complete yet",
        checkout_status: checkoutStatus || null,
        payment_status: paymentStatus || null
      }, 409);
    }
    const metadata = checkout.metadata && typeof checkout.metadata === "object" ? checkout.metadata : {};
    const checkoutCustomerId = String(
      checkout.client_reference_id || metadata.customer_id || ""
    ).trim();
    const checkoutEmail = String(
      checkout.customer_details?.email || checkout.customer_email || metadata.email || ""
    ).trim().toLowerCase();
    const matchesCustomer = checkoutCustomerId && checkoutCustomerId === String(me.customerId || "").trim();
    const matchesEmail = checkoutEmail && checkoutEmail === String(me.email || "").trim().toLowerCase();
    if (!matchesCustomer && !matchesEmail) {
      return json(request, { ok: false, error: "Checkout session does not belong to the signed-in customer" }, 403);
    }
    let subscription = checkout.subscription || null;
    if (typeof subscription === "string" && subscription.trim()) {
      subscription = await stripeGetSubscription(env, subscription.trim());
    }
    if (!subscription || typeof subscription !== "object") {
      return json(request, { ok: false, error: "Stripe subscription was not available for confirmation" }, 409);
    }
    const plan = await syncStripeSubscriptionToCustomerPlan(env, subscription);
    return json(request, {
      ok: true,
      provider: "stripe",
      session_id: sessionId,
      customer_id: me.customerId,
      email: me.email,
      plan_id: plan?.plan_id || resolveStripePlanIdFromSubscription(env, subscription) || null,
      subscription_id: String(subscription.id || "").trim() || null,
      subscription_status: String(subscription.status || "").trim().toLowerCase() || null
    }, 200);
  } catch (err) {
    return json(request, { ok: false, error: String(err?.message || err || "Stripe checkout confirmation failed") }, 502);
  }
}
__name(handleMeBillingConfirm, "handleMeBillingConfirm");
var CV_STUDIO_PLAN_LIMITS = Object.freeze({
  starter: 0,
  pro: 0,
  max: 0,
  cv_starter: 10,
  cv_plus: 50,
  cv_unlimited: 0
});
function getCvStudioPlanLimit(planId) {
  if (!planId) return null;
  return Object.prototype.hasOwnProperty.call(CV_STUDIO_PLAN_LIMITS, planId) ? CV_STUDIO_PLAN_LIMITS[planId] : null;
}
__name(getCvStudioPlanLimit, "getCvStudioPlanLimit");
async function listSuccessfulTailoredCvRows(env, customerId, { sinceIso = null, limit = 6 } = {}) {
  const params = new URLSearchParams();
  params.set("select", "id,created_at");
  params.set("customer_id", `eq.${customerId}`);
  params.set("status", "in.(ok,ready)");
  params.set("order", "created_at.desc");
  params.set("limit", String(Math.max(1, limit)));
  if (sinceIso) params.set("created_at", `gte.${sinceIso}`);
  const rows = await supabaseFetch(env, `/rest/v1/tailored_cvs?${params.toString()}`, { method: "GET" });
  return Array.isArray(rows) ? rows : [];
}
__name(listSuccessfulTailoredCvRows, "listSuccessfulTailoredCvRows");
async function getCustomerPlanRow(env, customerId) {
  const qPlan = new URLSearchParams();
  qPlan.set("select", "customer_id,plan_id,updated_at");
  qPlan.set("customer_id", `eq.${customerId}`);
  qPlan.set("limit", "1");
  const planRows = await supabaseFetch(env, `/rest/v1/customer_plans?${qPlan.toString()}`, { method: "GET" });
  return Array.isArray(planRows) && planRows.length ? planRows[0] : null;
}
__name(getCustomerPlanRow, "getCustomerPlanRow");
async function resolveCvStudioAccess(env, customerId, planRow = null) {
  const freeLimit = clampInt(env.CV_STUDIO_FREE_LIMIT || "5", 0, 1e3, 5);
  const planId = planRow?.plan_id ? String(planRow.plan_id).trim().toLowerCase() : null;
  const paidPlanLimit = getCvStudioPlanLimit(planId);
  const paid = paidPlanLimit !== null;
  const limit = paid ? paidPlanLimit : freeLimit;
  const periodStartedAt = paid ? planRow?.updated_at || null : null;
  const freeRows = await listSuccessfulTailoredCvRows(env, customerId, { limit: freeLimit + 1 });
  const freeUsed = freeRows.length;
  const freeRemaining = freeLimit > 0 ? Math.max(0, freeLimit - freeUsed) : null;
  const paidRows = paid ? await listSuccessfulTailoredCvRows(env, customerId, {
    sinceIso: periodStartedAt || null,
    limit: paidPlanLimit > 0 ? paidPlanLimit + 1 : 1
  }) : freeRows;
  const paidUsed = paidRows.length;
  const paidRemaining = paidPlanLimit > 0 ? Math.max(0, paidPlanLimit - paidUsed) : null;
  return {
    paid,
    planId,
    limit,
    used: paid ? paidUsed : freeUsed,
    remaining: paid ? paidRemaining : freeRemaining,
    periodStartedAt,
    freeLimit,
    freeUsed,
    freeRemaining
  };
}
__name(resolveCvStudioAccess, "resolveCvStudioAccess");
function buildCvQuotaExceededBody(access) {
  const paid = !!access?.paid;
  const limit = Number(access?.limit || 0);
  const error = paid && limit > 0 ? "You've reached your monthly CV Studio quota. Upgrade or wait for the next billing cycle to keep generating." : "You've used your 5 free CVs. Upgrade to a CV Studio plan to keep generating.";
  return {
    ok: false,
    error,
    code: "cv_quota_exceeded",
    upgrade_url: "https://jobmejob.com/plan.html#cv-pricing",
    cv_paid: paid,
    cv_plan_id: access?.planId || null,
    cv_quota_limit: access?.limit ?? null,
    cv_quota_used: access?.used ?? null,
    cv_quota_remaining: access?.remaining ?? null,
    cv_quota_period_started_at: access?.periodStartedAt || null,
    cv_free_limit: access?.freeLimit ?? null,
    cv_free_used: access?.freeUsed ?? null,
    cv_free_remaining: access?.freeRemaining ?? null,
    entitlements: {
      cv_paid: paid,
      cv_plan_id: access?.planId || null,
      cv_quota_limit: access?.limit ?? null,
      cv_quota_used: access?.used ?? null,
      cv_quota_remaining: access?.remaining ?? null,
      cv_quota_period_started_at: access?.periodStartedAt || null,
      cv_free_limit: access?.freeLimit ?? null,
      cv_free_used: access?.freeUsed ?? null,
      cv_free_remaining: access?.freeRemaining ?? null
    }
  };
}
__name(buildCvQuotaExceededBody, "buildCvQuotaExceededBody");
async function handleMeStateGet(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  const email = me.email;
  const customerId = me.customerId;
  const qProf = new URLSearchParams();
  qProf.set("select", "customer_id,desired_titles,locations,updated_at,cv_path,cv_ocr_status,cv_ocr_updated_at");
  qProf.set("customer_id", `eq.${customerId}`);
  qProf.set("limit", "1");
  const profRows = await supabaseFetch(env, `/rest/v1/customer_profiles?${qProf.toString()}`, { method: "GET" });
  const plan = await getCustomerPlanRow(env, customerId);
  const profile = Array.isArray(profRows) && profRows.length ? profRows[0] : null;
  const desiredTitles = Array.isArray(profile?.desired_titles) ? profile.desired_titles.filter(Boolean) : [];
  const locations = Array.isArray(profile?.locations) ? profile.locations.filter(Boolean) : [];
  const profileExists = !!profile;
  const profileComplete = desiredTitles.length > 0 && locations.length > 0;
  const planId = plan?.plan_id ? String(plan.plan_id).trim().toLowerCase() : null;
  const cvAccess = await resolveCvStudioAccess(env, customerId, plan);
  const cvUploaded = !!profile?.cv_path;
  const cvOcrStatus = profile?.cv_ocr_status ? String(profile.cv_ocr_status).trim().toLowerCase() : null;
  return json(request, {
    ok: true,
    me: true,
    email,
    customer_id: customerId,
    plan_id: planId,
    cv_paid: cvAccess.paid,
    cv_plan_id: cvAccess.planId,
    cv_quota_limit: cvAccess.limit,
    cv_quota_used: cvAccess.used,
    cv_quota_remaining: cvAccess.remaining,
    cv_quota_period_started_at: cvAccess.periodStartedAt,
    cv_free_limit: cvAccess.freeLimit,
    cv_free_used: cvAccess.freeUsed,
    cv_free_remaining: cvAccess.freeRemaining,
    entitlements: {
      cv_paid: cvAccess.paid,
      cv_plan_id: cvAccess.planId,
      cv_quota_limit: cvAccess.limit,
      cv_quota_used: cvAccess.used,
      cv_quota_remaining: cvAccess.remaining,
      cv_quota_period_started_at: cvAccess.periodStartedAt,
      cv_free_limit: cvAccess.freeLimit,
      cv_free_used: cvAccess.freeUsed,
      cv_free_remaining: cvAccess.freeRemaining
    },
    profile_exists: profileExists,
    profile_complete: profileComplete,
    profile_updated_at: profile?.updated_at || null,
    cv_uploaded: cvUploaded,
    cv_ocr_status: cvOcrStatus,
    cv_ocr_updated_at: profile?.cv_ocr_updated_at || null,
    plan_updated_at: plan?.updated_at || null
  }, 200);
}
__name(handleMeStateGet, "handleMeStateGet");
async function handleMeApplicationsSummary(request, env) {
  const user = await getSupabaseUserFromAuthHeader(request, env);
  if (!user?.email) return json(request, { error: "Unauthorized" }, 401);
  const customerId = await getCustomerIdForSupabaseUserEmail(env, user.email);
  if (!customerId) return json(request, { error: "Customer not found for auth user", email: String(user.email || "").toLowerCase() }, 404);
  const q = new URLSearchParams();
  q.set("select", "status");
  q.set("customer_id", `eq.${customerId}`);
  q.set("limit", "5000");
  const rows = await supabaseFetch(env, `/rest/v1/applications?${q.toString()}`, { method: "GET" });
  const counts = {};
  let total = 0;
  for (const r of rows || []) {
    const s = (r.status || "unknown").toString();
    counts[s] = (counts[s] || 0) + 1;
    total += 1;
  }
  return json(request, { ok: true, me: true, customer_id: customerId, total, counts }, 200);
}
__name(handleMeApplicationsSummary, "handleMeApplicationsSummary");
async function handleMeApplicationsSkip(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  let body = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  if (!body) return json(request, { error: "Invalid JSON body" }, 400);
  const job_id = String(body.job_id || "").trim();
  if (!looksLikeUuid(job_id)) return json(request, { error: "job_id must be a valid uuid" }, 400);
  const reason_code = String(body.reason_code || "").trim().toLowerCase();
  const allowed = /* @__PURE__ */ new Set(["not_relevant", "too_far", "wrong_industry", "salary_too_low", "already_applied", "other", ""]);
  if (!allowed.has(reason_code)) {
    return json(request, { error: "Invalid reason_code", allowed: Array.from(allowed).filter(Boolean) }, 400);
  }
  const reason_note_raw = String(body.reason_note || "").trim();
  const reason_note = reason_note_raw ? reason_note_raw.slice(0, 300) : null;
  const notesPayload = {
    reason_code: reason_code || null,
    reason_note
  };
  await supabaseFetch(env, `/rest/v1/applications?on_conflict=customer_id,job_id`, {
    method: "POST",
    body: [{
      customer_id: me.customerId,
      job_id,
      status: "skipped",
      notes: JSON.stringify(notesPayload),
      applied_by: "customer",
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }],
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
  await logApplicationEvent(env, {
    customerId: me.customerId,
    jobId: job_id,
    eventType: "skipped",
    actor: "customer",
    meta: notesPayload
  });
  return json(request, { ok: true, me: true, customer_id: me.customerId, job_id, status: "skipped" }, 200);
}
__name(handleMeApplicationsSkip, "handleMeApplicationsSkip");
async function handleMeApplicationsUnskip(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  let body = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  if (!body) return json(request, { error: "Invalid JSON body" }, 400);
  const job_id = String(body.job_id || "").trim();
  if (!looksLikeUuid(job_id)) return json(request, { error: "job_id must be a valid uuid" }, 400);
  await supabaseFetch(env, `/rest/v1/applications?on_conflict=customer_id,job_id`, {
    method: "POST",
    body: [{
      customer_id: me.customerId,
      job_id,
      status: "new",
      notes: null,
      applied_by: "customer",
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }],
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
  await logApplicationEvent(env, {
    customerId: me.customerId,
    jobId: job_id,
    eventType: "unskipped",
    actor: "customer",
    meta: null
  });
  return json(request, { ok: true, me: true, customer_id: me.customerId, job_id, status: "new" }, 200);
}
__name(handleMeApplicationsUnskip, "handleMeApplicationsUnskip");
async function handleMeApplicationEventsList(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  const url = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "30", 10) || 30, 1), 100);
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10) || 0, 0);
  const eventTypeRaw = String(url.searchParams.get("event_type") || "").trim().toLowerCase();
  const allowed = /* @__PURE__ */ new Set([
    "queued",
    "drafted",
    "reviewed",
    "sent",
    "replied",
    "applied",
    "rejected",
    "skipped",
    "unskipped",
    "prioritized",
    "unprioritized",
    ""
  ]);
  const eventType = allowed.has(eventTypeRaw) ? eventTypeRaw : "";
  const q = new URLSearchParams();
  q.set("select", "id,event_type,actor,meta,created_at,job_id");
  q.set("customer_id", `eq.${me.customerId}`);
  q.set("order", "created_at.desc");
  q.set("limit", String(limit));
  if (offset) q.set("offset", String(offset));
  if (eventType) q.set("event_type", `eq.${eventType}`);
  let rows;
  try {
    rows = await supabaseFetch(env, `/rest/v1/application_events?${q.toString()}`, { method: "GET" });
  } catch (e) {
    return json(request, { error: "Failed to load application_events", details: String(e) }, 502);
  }
  const events = Array.isArray(rows) ? rows : [];
  const jobIds = Array.from(new Set(events.map((r) => r.job_id).filter(Boolean)));
  let jobMap = /* @__PURE__ */ new Map();
  if (jobIds.length) {
    const qJobs = new URLSearchParams();
    qJobs.set("select", "id,title,company_name,country,city,region,apply_url,posted_at");
    qJobs.set("id", `in.(${jobIds.join(",")})`);
    qJobs.set("limit", String(jobIds.length));
    try {
      const jobs = await supabaseFetch(env, `/rest/v1/jobs_normalized?${qJobs.toString()}`, { method: "GET" });
      if (Array.isArray(jobs)) {
        jobMap = new Map(jobs.map((j) => [j.id, j]));
      }
    } catch (e) {
      jobMap = /* @__PURE__ */ new Map();
    }
  }
  const data = events.map((ev) => ({
    id: ev.id,
    event_type: ev.event_type,
    actor: ev.actor || null,
    meta: ev.meta ?? null,
    created_at: ev.created_at || null,
    job_id: ev.job_id || null,
    job: ev.job_id ? jobMap.get(ev.job_id) || null : null
  }));
  return json(request, {
    ok: true,
    me: true,
    customer_id: me.customerId,
    limit,
    offset,
    event_type: eventType || null,
    count: data.length,
    data
  }, 200);
}
__name(handleMeApplicationEventsList, "handleMeApplicationEventsList");
async function logApplicationEvent(env, { customerId, jobId, eventType, actor = null, meta = null }) {
  try {
    await supabaseFetch(env, `/rest/v1/application_events`, {
      method: "POST",
      body: [{
        customer_id: customerId,
        job_id: jobId,
        event_type: String(eventType || "").slice(0, 40),
        actor: actor ? String(actor).slice(0, 80) : null,
        meta: meta ?? null
      }]
    });
  } catch (e) {
  }
}
__name(logApplicationEvent, "logApplicationEvent");
async function handleMeApplicationsPrioritize(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  let body = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  if (!body) return json(request, { error: "Invalid JSON body" }, 400);
  const job_id = String(body.job_id || "").trim();
  if (!looksLikeUuid(job_id)) return json(request, { error: "job_id must be a valid uuid" }, 400);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await supabaseFetch(env, `/rest/v1/applications?on_conflict=customer_id,job_id`, {
    method: "POST",
    body: [{
      customer_id: me.customerId,
      job_id,
      priority: true,
      priority_at: now,
      applied_by: "customer",
      updated_at: now
    }],
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
  await logApplicationEvent(env, {
    customerId: me.customerId,
    jobId: job_id,
    eventType: "prioritized",
    actor: "customer",
    meta: null
  });
  return json(request, { ok: true, me: true, customer_id: me.customerId, job_id, priority: true }, 200);
}
__name(handleMeApplicationsPrioritize, "handleMeApplicationsPrioritize");
async function handleMeApplicationsUnprioritize(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  let body = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  if (!body) return json(request, { error: "Invalid JSON body" }, 400);
  const job_id = String(body.job_id || "").trim();
  if (!looksLikeUuid(job_id)) return json(request, { error: "job_id must be a valid uuid" }, 400);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await supabaseFetch(env, `/rest/v1/applications?on_conflict=customer_id,job_id`, {
    method: "POST",
    body: [{
      customer_id: me.customerId,
      job_id,
      priority: false,
      priority_at: null,
      applied_by: "customer",
      updated_at: now
    }],
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
  await logApplicationEvent(env, {
    customerId: me.customerId,
    jobId: job_id,
    eventType: "unprioritized",
    actor: "customer",
    meta: null
  });
  return json(request, { ok: true, me: true, customer_id: me.customerId, job_id, priority: false }, 200);
}
__name(handleMeApplicationsUnprioritize, "handleMeApplicationsUnprioritize");
var __gcpOauthTokenCache = { token: null, exp: 0 };
async function getGcpAccessTokenCached(env) {
  const now = Math.floor(Date.now() / 1e3);
  if (__gcpOauthTokenCache.token && now < __gcpOauthTokenCache.exp - 60) {
    return __gcpOauthTokenCache.token;
  }
  const token = await getGcpAccessToken(env);
  __gcpOauthTokenCache.token = token;
  __gcpOauthTokenCache.exp = now + 3300;
  return token;
}
__name(getGcpAccessTokenCached, "getGcpAccessTokenCached");
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
__name(sleep, "sleep");
function parseRetryAfterMs(res) {
  try {
    const ra = res?.headers?.get?.("retry-after");
    if (!ra) return null;
    const n = Number(ra);
    if (Number.isFinite(n) && n > 0) return Math.min(6e4, n * 1e3);
  } catch {
  }
  return null;
}
__name(parseRetryAfterMs, "parseRetryAfterMs");
function isRetriableStatus(status) {
  return status === 429 || status === 503 || status === 500 || status === 502 || status === 504;
}
__name(isRetriableStatus, "isRetriableStatus");
async function fetchJsonWithRetry(url, options, { label, retries = 2, baseDelayMs = 900, maxDelayMs = 8e3 } = {}) {
  let attempt = 0;
  while (true) {
    const res = await fetch(url, options);
    const txt = await res.text().catch(() => "");
    let data = null;
    try {
      data = txt ? JSON.parse(txt) : null;
    } catch {
      data = null;
    }
    if (res.ok) return { res, txt, data };
    if (isRetriableStatus(res.status) && attempt < retries) {
      const raMs = parseRetryAfterMs(res);
      const exp = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
      const jitter = Math.floor(Math.random() * 250);
      const delay = (raMs != null ? raMs : exp) + jitter;
      await sleep(delay);
      attempt += 1;
      continue;
    }
    const clipped = (txt || "").slice(0, 1200);
    throw new Error(`${label} ${res.status}: ${clipped}`);
  }
}
__name(fetchJsonWithRetry, "fetchJsonWithRetry");
function getVertexProjectId(env) {
  const v = String(env.GEMINI_VERTEX_PROJECT_ID || env.VERTEX_PROJECT_ID || env.GCP_PROJECT_ID || "").trim();
  if (v) return v;
  try {
    const raw = String(env.GCP_SA_KEY_JSON || "").trim();
    if (raw) {
      const sa = JSON.parse(raw);
      if (sa?.project_id) return String(sa.project_id);
    }
  } catch {
  }
  return "";
}
__name(getVertexProjectId, "getVertexProjectId");
function getVertexLocation(env) {
  let loc = String(env.GEMINI_VERTEX_LOCATION || env.VERTEX_LOCATION || env.GEMINI_LOCATION || "").trim();
  if (!loc) {
    const g = String(env.GCP_LOCATION || "").trim();
    if (g && g.includes("-")) loc = g;
  }
  if (!loc) loc = "us-central1";
  return loc;
}
__name(getVertexLocation, "getVertexLocation");
function getAiStudioKey(env) {
  return String(env.GEMINI_AI_STUDIO_API_KEY || env.GOOGLE_AI_API_KEY || env.GEMINI_API_KEY || "").trim();
}
__name(getAiStudioKey, "getAiStudioKey");
async function geminiGenerateJson(env, { model, promptText, temperature = 0.2, maxOutputTokens = 700 }) {
  const prefer = String(env.GEMINI_API_BASE || "").trim().toLowerCase();
  const payload = {
    contents: [{ role: "user", parts: [{ text: promptText }] }],
    generationConfig: { temperature, maxOutputTokens, responseMimeType: "application/json" }
  };
  async function callVertex() {
    const project = getVertexProjectId(env);
    const location = getVertexLocation(env);
    if (!project) {
      throw new Error("Vertex Gemini misconfigured: missing GEMINI_VERTEX_PROJECT_ID (or GCP_PROJECT_ID)");
    }
    if (!String(env.GCP_SA_KEY_JSON || "").trim()) {
      throw new Error("Vertex Gemini misconfigured: missing GCP_SA_KEY_JSON (service account key)");
    }
    const accessToken = await getGcpAccessTokenCached(env);
    const host = `${location}-aiplatform.googleapis.com`;
    const url = `https://${host}/v1/projects/${encodeURIComponent(project)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
    const { data } = await fetchJsonWithRetry(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      },
      { label: "Vertex Gemini error", retries: 2 }
    );
    return data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  }
  __name(callVertex, "callVertex");
  async function callAiStudioWithApiKey(apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const { data } = await fetchJsonWithRetry(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      },
      { label: "AI Studio Gemini error", retries: 1 }
    );
    return data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  }
  __name(callAiStudioWithApiKey, "callAiStudioWithApiKey");
  async function callAiStudioWithOauth() {
    if (!String(env.GCP_SA_KEY_JSON || "").trim()) {
      throw new Error("AI Studio OAuth misconfigured: missing GCP_SA_KEY_JSON");
    }
    const accessToken = await getGcpAccessTokenCached(env);
    const project = getVertexProjectId(env) || String(env.GCP_PROJECT_ID || "").trim();
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
    };
    if (project) headers["x-goog-user-project"] = project;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const { data } = await fetchJsonWithRetry(
      url,
      {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      },
      { label: "AI Studio Gemini error", retries: 1 }
    );
    return data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  }
  __name(callAiStudioWithOauth, "callAiStudioWithOauth");
  async function callAiStudio() {
    const apiKey = getAiStudioKey(env);
    if (apiKey) {
      try {
        return await callAiStudioWithApiKey(apiKey);
      } catch (e) {
        const msg = String(e?.message || e || "");
        if (msg.includes("API keys are not supported") || msg.includes("CREDENTIALS_MISSING") || msg.includes("UNAUTHENTICATED")) {
          if (String(env.GCP_SA_KEY_JSON || "").trim()) {
            return await callAiStudioWithOauth();
          }
        }
        throw e;
      }
    }
    if (String(env.GCP_SA_KEY_JSON || "").trim()) {
      return await callAiStudioWithOauth();
    }
    throw new Error("AI Studio Gemini misconfigured: set GEMINI_API_KEY (AI Studio key) or provide GCP_SA_KEY_JSON for OAuth");
  }
  __name(callAiStudio, "callAiStudio");
  if (prefer === "aistudio" || prefer === "generativelanguage") {
    try {
      return await callAiStudio();
    } catch (e) {
      const msg = String(e?.message || e || "");
      if (String(env.GCP_SA_KEY_JSON || "").trim() && (msg.includes("API keys are not supported") || msg.includes("UNAUTHENTICATED") || msg.includes("CREDENTIALS_MISSING"))) {
        try {
          return await callVertex();
        } catch (_) {
        }
      }
      throw e;
    }
  }
  if (prefer === "vertex" || prefer === "aiplatform") {
    return await callVertex();
  }
  try {
    return await callVertex();
  } catch (e1) {
    const msg1 = String(e1?.message || e1 || "");
    try {
      return await callAiStudio();
    } catch (e2) {
      const msg2 = String(e2?.message || e2 || "");
      throw new Error((msg1 + " || " + msg2).slice(0, 1200));
    }
  }
}
__name(geminiGenerateJson, "geminiGenerateJson");
function parseModelList(value, extraFallback = []) {
  const raw = Array.isArray(value) ? value : String(value || "").split(",");
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  function add(m) {
    const v = String(m || "").trim();
    if (!v) return;
    const k = v.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(v);
  }
  __name(add, "add");
  for (const m of raw) {
    add(m);
  }
  for (const m of Array.isArray(extraFallback) ? extraFallback : [extraFallback]) {
    add(m);
  }
  return out;
}
__name(parseModelList, "parseModelList");
async function geminiGenerateJsonWithModels(env, { models, promptText, temperature = 0.2, maxOutputTokens = 1400 }) {
  const list = parseModelList(models);
  if (!list.length) throw new Error("No Gemini models configured");
  const maxRetries429 = Number(env.GEMINI_RETRY_429 || 2);
  const baseDelayMs = Number(env.GEMINI_RETRY_BASE_MS || 650);
  const maxJsonRetries = Number(env.GEMINI_RETRY_JSON || 1);
  const jsonRetryMaxTokens = Number(env.GEMINI_JSON_RETRY_MAX_TOKENS || 12e3);
  function isRetryable429(err) {
    const msg = String(err && (err.message || err.details) || err || "");
    return /\b429\b/.test(msg) || /RESOURCE_EXHAUSTED/i.test(msg) || /rate\s*limit/i.test(msg);
  }
  __name(isRetryable429, "isRetryable429");
  async function sleep2(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
  __name(sleep2, "sleep");
  let lastErr = null;
  for (const model of list) {
    let tokens = Number(maxOutputTokens) || 1400;
    let jsonRetryCount = 0;
    for (let attempt = 0; attempt <= maxRetries429; attempt++) {
      try {
        const text = await geminiGenerateJson(env, { model, promptText, temperature, maxOutputTokens: tokens });
        const parsed = safeJsonParse(text);
        return { model, parsed, rawText: text };
      } catch (e) {
        lastErr = e;
        if (e && (e.code === "INCOMPLETE_JSON" || e.code === "EMPTY_OUTPUT") && jsonRetryCount < maxJsonRetries) {
          jsonRetryCount += 1;
          const bumped = Math.min(
            jsonRetryMaxTokens,
            Math.max(tokens + 1200, Math.floor(tokens * 1.35))
          );
          if (bumped > tokens) {
            tokens = bumped;
            continue;
          }
        }
        if (attempt < maxRetries429 && isRetryable429(e)) {
          const jitter = Math.floor(Math.random() * 250);
          const delay = baseDelayMs * Math.pow(2, attempt) + jitter;
          await sleep2(delay);
          continue;
        }
        break;
      }
    }
  }
  throw lastErr || new Error("Gemini generation failed");
}
__name(geminiGenerateJsonWithModels, "geminiGenerateJsonWithModels");
function stripJsonFences(s) {
  let t = String(s ?? "").trim();
  if (!t) return "";
  if (t.charCodeAt(0) === 65279) t = t.slice(1);
  if (t.startsWith("```")) {
    t = t.replace(/^```[a-zA-Z0-9_-]*\s*/i, "");
    t = t.replace(/\s*```\s*$/i, "");
  }
  t = t.replace(/^\s*(json|javascript)\s*\n/i, "");
  return t.trim();
}
__name(stripJsonFences, "stripJsonFences");
function _repairJsonCommon(text) {
  let t = String(text || "");
  t = t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  t = t.replace(/,\s*([}\]])/g, "$1");
  return t.trim();
}
__name(_repairJsonCommon, "_repairJsonCommon");
function _extractFirstJsonValue(text) {
  const s = String(text || "");
  let start = -1;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "{" || ch === "[") {
      start = i;
      break;
    }
  }
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let strCh = "";
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (ch === "\\") {
        esc = true;
        continue;
      }
      if (ch === strCh) {
        inStr = false;
        strCh = "";
        continue;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = true;
      strCh = ch;
      continue;
    }
    if (ch === "{" || ch === "[") depth += 1;
    else if (ch === "}" || ch === "]") {
      depth -= 1;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}
__name(_extractFirstJsonValue, "_extractFirstJsonValue");
function safeJsonParse(s) {
  const cleaned0 = stripJsonFences(s);
  const cleaned = _repairJsonCommon(cleaned0);
  if (!cleaned) {
    const e = new Error("Gemini returned empty output");
    e.code = "EMPTY_OUTPUT";
    throw e;
  }
  try {
    return JSON.parse(cleaned);
  } catch (err1) {
    const msg1 = String(err1?.message || "");
    const first = _extractFirstJsonValue(cleaned);
    if (first) {
      const cand = _repairJsonCommon(first);
      try {
        return JSON.parse(cand);
      } catch (err2) {
      }
    }
    const first2 = _extractFirstJsonValue(cleaned0);
    if (first2) {
      const cand2 = _repairJsonCommon(first2);
      try {
        return JSON.parse(cand2);
      } catch (_) {
      }
    }
    const e = new Error("Gemini returned non-JSON output. First 400 chars: " + cleaned0.slice(0, 400));
    const looksTruncated = /Unexpected end of JSON input/i.test(msg1) || /unterminated/i.test(msg1) || (cleaned0.includes("{") || cleaned0.includes("[")) && !(cleaned0.includes("}") || cleaned0.includes("]"));
    e.code = looksTruncated ? "INCOMPLETE_JSON" : "JSON_PARSE_FAILED";
    throw e;
  }
}
__name(safeJsonParse, "safeJsonParse");
function isBaRefnr(s) {
  const v = String(s || "").trim();
  return /^\d{4,}-\d{6,}-S$/i.test(v);
}
__name(isBaRefnr, "isBaRefnr");
function detectLanguageHint(jobText) {
  const t = String(jobText || "").toLowerCase();
  const deSignals = [
    "aufgaben",
    "anforderungen",
    "wir bieten",
    "ihr profil",
    "bewerbung",
    "stellenbeschreibung",
    "erforderliche unterlagen"
  ];
  let hits = 0;
  for (const w of deSignals) {
    if (t.includes(w)) hits += 1;
  }
  return hits >= 2 ? "de" : "en";
}
__name(detectLanguageHint, "detectLanguageHint");
function buildTailoredCvPrompt({ lang, job, jobDescription, cvTextSlice }) {
  const language = lang === "de" ? "de" : "en";
  const title = String(job?.title || "").trim();
  const company = String(job?.company_name || "").trim();
  const location = [job?.city, job?.region, job?.country].filter(Boolean).join(", ");
  const jd = String(jobDescription || "").trim().slice(0, 14e3);
  const cv = String(cvTextSlice || "").trim().slice(0, 14e3);
  const headingsDe = [
    "KONTAKT",
    "PROFIL",
    "KERNKOMPETENZEN",
    "BERUFSERFAHRUNG",
    "AUSBILDUNG",
    "ZERTIFIKATE",
    "SPRACHEN",
    "TOOLS & TECHNOLOGIEN",
    "SONSTIGES"
  ];
  const headingsEn = [
    "CONTACT",
    "PROFESSIONAL SUMMARY",
    "KEY SKILLS",
    "EXPERIENCE",
    "EDUCATION",
    "CERTIFICATIONS",
    "LANGUAGES",
    "TOOLS & TECHNOLOGIES",
    "ADDITIONAL"
  ];
  const headings = language === "de" ? headingsDe : headingsEn;
  return [
    "Return ONLY valid JSON. No markdown. No code fences. No commentary.",
    "",
    "Schema:",
    "{",
    '  "language": "de" | "en",',
    '  "cv_text": string,',
    '  "ats_keywords_used": string[],',
    '  "ats_keywords_missing": string[],',
    '  "confidence": number,',
    '  "warnings": string[]',
    "}",
    "",
    "Hard rules (must follow):",
    "- Use ONLY information that exists in CV_TEXT (below). Do NOT invent employers, job titles, dates, degrees, certifications, tools, achievements, or metrics.",
    "- You may rephrase and reorder content to better match the job ad, but factual content must come from CV_TEXT.",
    "- ATS-friendly format: plain text only. No tables. No columns. No emojis. No icons. No special formatting.",
    "- Headings must be on their own line. Use these headings (in this order, omit empty sections): " + JSON.stringify(headings),
    "- Bullet points must start with '- ' and must contain text (no empty bullets).",
    "- Keep it concise (roughly 500-900 words). Prefer a 1-page style.",
    "- For missing personal details (phone/address), use placeholders like [Phone].",
    "- ats_keywords_used and ats_keywords_missing must be lowercase, deduplicated, max 30 each, 1-4 words per item.",
    "- confidence must be between 0.50 and 0.95.",
    "- Output size limits (must follow):",
    "- summary: 3\u20136 bullets (max 6).",
    "- experience: max 5 bullets per role (prefer 3\u20135).",
    "- key_achievements: max 5 items.",
    "- skills.groups: max 6 groups; max 10 items per group.",
    "- skills.additional: max 15 items.",
    "- courses: max 10 items; interests max 6; languages max 6.",
    "",
    "Output language:",
    language === "de" ? "- Write the CV in German." : "- Write the CV in English.",
    "",
    "JOB AD (target role):",
    JSON.stringify({ title, company, location }),
    "",
    "JOB DESCRIPTION:",
    jd,
    "",
    "CV_TEXT (OCR raw text):",
    cv,
    "",
    "Now output JSON only."
  ].join("\n");
}
__name(buildTailoredCvPrompt, "buildTailoredCvPrompt");
function slimCvDocForPrompt(cvDoc) {
  if (!cvDoc || typeof cvDoc !== "object") return {};
  const contact = cvDoc.contact && typeof cvDoc.contact === "object" ? cvDoc.contact : {};
  const exp = Array.isArray(cvDoc.experience) ? cvDoc.experience : [];
  const edu = Array.isArray(cvDoc.education) ? cvDoc.education : [];
  const summary = Array.isArray(cvDoc.summary) ? cvDoc.summary : [];
  const ach = Array.isArray(cvDoc.key_achievements) ? cvDoc.key_achievements : [];
  const skills = cvDoc.skills && typeof cvDoc.skills === "object" ? cvDoc.skills : {};
  const groups = Array.isArray(skills.groups) ? skills.groups : [];
  const additional = Array.isArray(skills.additional) ? skills.additional : [];
  return {
    name: cvDoc.name || null,
    target_role: cvDoc.target_role || null,
    contact: {
      phone: contact.phone || null,
      email: contact.email || null,
      linkedin: contact.linkedin || null,
      portfolio: contact.portfolio || null,
      location: contact.location || null
    },
    summary: summary.slice(0, 8),
    experience: exp.slice(0, 12).map((e) => ({
      title: e?.title || null,
      company: e?.company || null,
      location: e?.location || null,
      start: e?.start || null,
      end: e?.end || null,
      bullets: Array.isArray(e?.bullets) ? e.bullets.slice(0, 10) : []
    })),
    education: edu.slice(0, 6).map((e) => ({
      degree: e?.degree || null,
      field: e?.field || null,
      school: e?.school || null,
      location: e?.location || null,
      start: e?.start || null,
      end: e?.end || null
    })),
    key_achievements: ach.slice(0, 10),
    skills: {
      groups: groups.slice(0, 6).map((g) => ({
        label: g?.label || null,
        items: Array.isArray(g?.items) ? g.items.slice(0, 20) : []
      })),
      additional: additional.slice(0, 30)
    },
    courses: Array.isArray(cvDoc.courses) ? cvDoc.courses.slice(0, 20) : [],
    interests: Array.isArray(cvDoc.interests) ? cvDoc.interests.slice(0, 12) : [],
    languages: Array.isArray(cvDoc.languages) ? cvDoc.languages.slice(0, 12) : []
  };
}
__name(slimCvDocForPrompt, "slimCvDocForPrompt");
function buildTailoredCvDocPrompt({ lang, template, strength, job, jobDescription, cvBaseDoc }) {
  const language = lang === "de" ? "de" : "en";
  const title = String(job?.title || "").trim();
  const company = String(job?.company_name || "").trim();
  const location = [job?.city, job?.region, job?.country].filter(Boolean).join(", ");
  const jd = String(jobDescription || "").trim().slice(0, 14e3);
  const base = JSON.stringify(slimCvDocForPrompt(cvBaseDoc || {})).slice(0, 2e4);
  const strengthKey = String(strength || "balanced").toLowerCase();
  const strengthOut = strengthKey === "light" || strengthKey === "strong" ? strengthKey : "balanced";
  const templateOut = String(template || "professional").toLowerCase() === "professional" ? "professional" : "professional";
  const strengthRules = strengthOut === "light" ? [
    "- LIGHT: Keep the original CV structure and wording as much as possible.",
    "- Only adjust the Summary, Skills ordering, and a few bullets so they directly match the job description.",
    "- Minimal rephrasing. No new claims."
  ] : strengthOut === "strong" ? [
    "- STRONG: Aggressively tailor phrasing and ordering to match the job description.",
    "- Rewrite the Summary and Experience bullets so they clearly map to the job requirements.",
    "- Integrate relevant job keywords (ATS) wherever they truthfully apply.",
    "- Still do NOT invent anything. Do not add tools, employers, degrees, or metrics that are not in CV_BASE_DOC."
  ] : [
    "- BALANCED: Tailor clearly, but keep the candidate's voice and factual content.",
    "- Rewrite Summary + reorder and refine Experience bullets to highlight relevant parts.",
    "- Integrate ATS keywords when they are truthful based on CV_BASE_DOC."
  ];
  return [
    "Return ONLY valid JSON. No markdown. No code fences. No commentary.",
    "",
    "Schema:",
    "{",
    '  "language": "de" | "en",',
    '  "template": "professional",',
    '  "strength": "light" | "balanced" | "strong",',
    '  "cv_doc": {',
    '    "name": string | null,',
    '    "target_role": string | null,',
    '    "contact": {"phone": string | null, "email": string | null, "linkedin": string | null, "portfolio": string | null, "location": string | null},',
    '    "summary": string[],',
    '    "experience": {"title": string | null, "company": string | null, "location": string | null, "start": string | null, "end": string | null, "bullets": string[]}[],',
    '    "education": {"degree": string | null, "field": string | null, "school": string | null, "location": string | null, "start": string | null, "end": string | null}[],',
    '    "key_achievements": string[],',
    '    "skills": {"groups": {"label": string | null, "items": string[]}[], "additional": string[]},',
    '    "courses": string[],',
    '    "interests": string[],',
    '    "languages": string[]',
    "  },",
    '  "ats_keywords_used": string[],',
    '  "ats_keywords_missing": string[],',
    '  "confidence": number,',
    '  "warnings": string[]',
    "}",
    "",
    "Hard rules (must follow):",
    "- Use ONLY information that exists in CV_BASE_DOC (below). Do NOT invent employers, job titles, dates, degrees, certifications, tools, achievements, or metrics.",
    "- You may rephrase and reorder content to better match the job ad, but factual content must come from CV_BASE_DOC.",
    "- Professional ATS-safe output: no tables, no columns, no emojis, no icons.",
    "- Keep wording clear and scannable. Use strong action verbs.",
    "- Ensure cv_doc is complete and consistent. Keep dates and companies where present.",
    "- If contact details are missing, use placeholders like [Phone], [Email].",
    "- Set template to '" + templateOut + "' and strength to '" + strengthOut + "'.",
    "- ats_keywords_used and ats_keywords_missing must be lowercase, deduplicated, max 30 each, 1-4 words per item.",
    "- confidence must be between 0.50 and 0.95.",
    "",
    "Tailoring strength:",
    ...strengthRules,
    "",
    "Output language:",
    language === "de" ? "- Write the CV in German." : "- Write the CV in English.",
    "",
    "JOB AD (target role):",
    JSON.stringify({ title, company, location }),
    "",
    "JOB DESCRIPTION:",
    jd,
    "",
    "CV_BASE_DOC (source of truth, do not invent):",
    base,
    "",
    "Now output JSON only."
  ].join("\n");
}
__name(buildTailoredCvDocPrompt, "buildTailoredCvDocPrompt");
function normalizeNewlines(s) {
  return String(s || "").replace(/\r\n?/g, "\n");
}
__name(normalizeNewlines, "normalizeNewlines");
function normalizeOcrTextHeuristic(text) {
  let s = normalizeNewlines(text);
  s = s.replace(/\u00a0/g, " ");
  s = s.replace(/([A-Za-zÄÖÜäöüß])\-\n([A-Za-zÄÖÜäöüß])/g, "$1$2");
  s = s.replace(/([^\n])\n([a-zäöüß])/g, "$1 $2");
  s = s.replace(/[ \t]{2,}/g, " ");
  return s.trim();
}
__name(normalizeOcrTextHeuristic, "normalizeOcrTextHeuristic");
function normalizeTailoredCvText(text, lang) {
  const headingsDe = /* @__PURE__ */ new Set([
    "KONTAKT",
    "PROFIL",
    "BERUFSERFAHRUNG",
    "AUSBILDUNG",
    "KENNTNISSE",
    "ZERTIFIKATE",
    "SPRACHEN",
    "PROJEKTE",
    "EHRENAMT",
    "INTERESSEN"
  ]);
  const headingsEn = /* @__PURE__ */ new Set([
    "CONTACT",
    "PROFESSIONAL SUMMARY",
    "WORK EXPERIENCE",
    "EDUCATION",
    "SKILLS",
    "CERTIFICATIONS",
    "LANGUAGES",
    "PROJECTS",
    "VOLUNTEERING",
    "INTERESTS"
  ]);
  const headingSet = lang === "de" ? headingsDe : headingsEn;
  const lines = normalizeNewlines(text).replace(/\u00a0/g, " ").split("\n");
  function isHeadingLine(t) {
    const u = t.replace(/:$/, "").trim().toUpperCase();
    if (headingSet.has(u)) return true;
    if (/^[A-ZÄÖÜẞ0-9 &/+\.\-]{3,60}$/.test(t) && t.length <= 45) return true;
    return false;
  }
  __name(isHeadingLine, "isHeadingLine");
  function isBulletMarkerOnly(t) {
    return /^[\-–—•·∙●▪◦]+$/.test(t);
  }
  __name(isBulletMarkerOnly, "isBulletMarkerOnly");
  function isBulletLine(t) {
    return /^[\-–—•·∙●▪◦]/.test(t);
  }
  __name(isBulletLine, "isBulletLine");
  function bulletContent(t) {
    return t.replace(/^[\-–—•·∙●▪◦]+\s*/, "").trim();
  }
  __name(bulletContent, "bulletContent");
  const out = [];
  let pendingBullet = false;
  for (let i = 0; i < lines.length; i++) {
    const t = String(lines[i] || "").trim();
    if (!t) {
      pendingBullet = false;
      if (out.length && out[out.length - 1] !== "") out.push("");
      continue;
    }
    if (isHeadingLine(t)) {
      pendingBullet = false;
      const u = t.replace(/:$/, "").trim().toUpperCase();
      out.push(u);
      continue;
    }
    if (isBulletMarkerOnly(t) || isBulletLine(t) && bulletContent(t) === "") {
      pendingBullet = true;
      continue;
    }
    if (isBulletLine(t)) {
      pendingBullet = false;
      const c = bulletContent(t);
      if (c) out.push("- " + c);
      continue;
    }
    if (pendingBullet && !isHeadingLine(t) && !isBulletLine(t)) {
      pendingBullet = false;
      out.push("- " + t);
      continue;
    }
    pendingBullet = false;
    out.push(t);
  }
  while (out.length && out[0] === "") out.shift();
  while (out.length && out[out.length - 1] === "") out.pop();
  const collapsed = [];
  let blankRun = 0;
  for (const line of out) {
    if (line === "") {
      blankRun += 1;
      if (blankRun <= 2) collapsed.push("");
    } else {
      blankRun = 0;
      collapsed.push(line);
    }
  }
  return collapsed.join("\n").trim();
}
__name(normalizeTailoredCvText, "normalizeTailoredCvText");
function buildCvCleanPrompt(lang, cvTextRaw) {
  const outLang = lang === "de" ? "German" : lang === "en" ? "English" : "German";
  const headings = lang === "de" ? ["KONTAKT", "PROFIL", "BERUFSERFAHRUNG", "AUSBILDUNG", "KENNTNISSE", "ZERTIFIKATE", "SPRACHEN", "PROJEKTE", "EHRENAMT", "INTERESSEN"] : ["CONTACT", "PROFESSIONAL SUMMARY", "WORK EXPERIENCE", "EDUCATION", "SKILLS", "CERTIFICATIONS", "LANGUAGES", "PROJECTS", "VOLUNTEERING", "INTERESTS"];
  return [
    "You are an expert CV editor. Your task: clean and restructure OCR'ed CV text into clear, ATS-friendly plain text.",
    `Output language: ${outLang}.`,
    "Hard rules:",
    "- Do not invent facts. Use only information present in CV_TEXT.",
    "- Fix obvious OCR artifacts (broken line breaks, hyphenation, duplicated spaces).",
    "- Remove stray bullet-only lines and ensure bullets are complete.",
    "- Use section headings (uppercase, on their own line) when possible:",
    ...headings.map((h) => `  - ${h}`),
    "- Use bullet points that start with '- ' and always include text (no empty bullets).",
    "Return ONLY valid JSON (no markdown):",
    '{"language":"de|en|mixed","cv_text":"...","warnings":["..."]}',
    "CV_TEXT:",
    cvTextRaw
  ].join("\n");
}
__name(buildCvCleanPrompt, "buildCvCleanPrompt");
async function ensureCvCleanText(env, customerId, prof, cvTextRaw, lang) {
  const version = "cv_clean_v1";
  const rawNorm = normalizeOcrTextHeuristic(cvTextRaw).slice(0, 14e3);
  const baseHash = await sha256Hex(rawNorm);
  const inputHash = await sha256Hex([version, lang || "", baseHash].join("|"));
  const cachedHash = String(prof?.cv_clean_hash || "").trim();
  const cachedText = String(prof?.cv_clean_text || "").trim();
  if (cachedHash && cachedHash === inputHash && cachedText.length >= 80) {
    return { cv_text: cachedText, from_cache: true, model: prof?.cv_clean_model || null, warnings: [] };
  }
  const model = String(env.GEMINI_CV_CLEAN_MODEL || env.GEMINI_CV_MODEL || "gemini-2.0-flash").trim();
  const prompt = buildCvCleanPrompt(lang, rawNorm);
  let parsed;
  try {
    parsed = await geminiGenerateJson(env, {
      model,
      promptText: prompt,
      temperature: 0.2,
      maxOutputTokens: 2500
    });
  } catch (e) {
    return { cv_text: rawNorm, from_cache: false, model, warnings: ["cv_clean_model_error"] };
  }
  const cvText = String(parsed?.cv_text || "").trim() || rawNorm;
  const cvTextNorm = normalizeTailoredCvText(cvText, lang);
  const warnings = Array.isArray(parsed?.warnings) ? parsed.warnings.slice(0, 20) : [];
  try {
    await supabaseFetch(env, `/rest/v1/customer_profiles?customer_id=eq.${customerId}`, {
      method: "PATCH",
      body: {
        cv_clean_text: cvTextNorm,
        cv_clean_hash: inputHash,
        cv_clean_model: model,
        cv_clean_updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  } catch (e) {
  }
  return { cv_text: cvTextNorm, from_cache: false, model, warnings };
}
__name(ensureCvCleanText, "ensureCvCleanText");
function buildCvStructuredPrompt(lang, cvTextClean) {
  const outLang = lang === "de" ? "German" : "English";
  return [
    "Return ONLY valid JSON. No markdown. No code fences. No commentary.",
    "You are an expert CV parser and editor.",
    "Task: convert ATS-friendly plain text CV into a clean, structured JSON document.",
    "Important: do NOT invent facts. Use ONLY information present in CV_TEXT.",
    `Output language: ${outLang}.`,
    "",
    "Schema (must match exactly; use null for unknown single values, [] for unknown lists):",
    "{",
    '  "language": "de" | "en" | "mixed",',
    '  "cv_doc": {',
    '    "name": string | null,',
    '    "target_role": string | null,',
    '    "contact": {',
    '      "phone": string | null,',
    '      "email": string | null,',
    '      "linkedin": string | null,',
    '      "portfolio": string | null,',
    '      "location": string | null',
    "    },",
    '    "summary": string[],',
    '    "experience": {',
    '      "title": string | null,',
    '      "company": string | null,',
    '      "location": string | null,',
    '      "start": string | null,',
    '      "end": string | null,',
    '      "bullets": string[]',
    "    }[],",
    '    "education": {',
    '      "degree": string | null,',
    '      "field": string | null,',
    '      "school": string | null,',
    '      "location": string | null,',
    '      "start": string | null,',
    '      "end": string | null',
    "    }[],",
    '    "key_achievements": string[],',
    '    "skills": {',
    '      "groups": {"label": string, "items": string[]}[],',
    '      "additional": string[]',
    "    },",
    '    "courses": string[],',
    '    "interests": string[],',
    '    "languages": string[]',
    "  },",
    '  "warnings": string[]',
    "}",
    "",
    "Rules:",
    "- Keep text concise.",
    "- summary: 2-5 bullets (if present in CV).",
    "- experience: preserve order if possible. bullets: 2-6 per role.",
    "- skills.groups: 1-4 groups max. items should be short (1-4 words).",
    "- If you cannot find a section, return an empty list for that section.",
    "",
    "CV_TEXT:",
    String(cvTextClean || "").slice(0, 14e3)
  ].join("\n");
}
__name(buildCvStructuredPrompt, "buildCvStructuredPrompt");
async function ensureCvStructured(env, customerId, prof, cvTextClean, lang) {
  const version = "cv_struct_v1";
  const base = String(cvTextClean || "").trim();
  const baseHash = await sha256Hex(base.slice(0, 14e3));
  const inputHash = await sha256Hex([version, lang || "", baseHash].join("|"));
  const cachedHash = String(prof?.cv_structured_hash || "").trim();
  const cachedJson = prof?.cv_structured_json || null;
  if (cachedHash && cachedHash === inputHash && cachedJson && typeof cachedJson === "object") {
    return { cv_doc: cachedJson?.cv_doc || cachedJson, from_cache: true, model: prof?.cv_structured_model || null, hash: inputHash, warnings: [] };
  }
  const prompt = buildCvStructuredPrompt(lang, base);
  const models = String(env.GEMINI_CV_STRUCT_MODELS || env.GEMINI_CV_STRUCT_MODEL || env.GEMINI_CV_FINAL_MODELS || env.GEMINI_CV_MODEL_QUALITY || env.GEMINI_CV_MODEL || "gemini-2.0-flash");
  let out;
  try {
    out = await geminiGenerateJsonWithModels(env, {
      models,
      promptText: prompt,
      temperature: 0.1,
      maxOutputTokens: 2200
    });
  } catch (e) {
    try {
      await supabaseFetch(env, `/rest/v1/customer_profiles?customer_id=eq.${customerId}`, {
        method: "PATCH",
        body: {
          cv_structured_error: String(e?.message || e),
          cv_structured_error_at: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    } catch (_) {
    }
    return { cv_doc: null, from_cache: false, model: null, hash: inputHash, warnings: ["cv_structured_model_error"] };
  }
  const parsed = out?.parsed || {};
  const cvDoc = parsed?.cv_doc || null;
  const warnings = Array.isArray(parsed?.warnings) ? parsed.warnings.slice(0, 20) : [];
  if (!cvDoc || typeof cvDoc !== "object") {
    return { cv_doc: null, from_cache: false, model: out?.model || null, hash: inputHash, warnings: warnings.concat(["cv_structured_invalid_output"]) };
  }
  try {
    await supabaseFetch(env, `/rest/v1/customer_profiles?customer_id=eq.${customerId}`, {
      method: "PATCH",
      body: {
        cv_structured_json: parsed,
        cv_structured_hash: inputHash,
        cv_structured_model: out?.model || null,
        cv_structured_updated_at: (/* @__PURE__ */ new Date()).toISOString(),
        cv_structured_error: null,
        cv_structured_error_at: null
      }
    });
  } catch (_) {
  }
  return { cv_doc: cvDoc, from_cache: false, model: out?.model || null, hash: inputHash, warnings };
}
__name(ensureCvStructured, "ensureCvStructured");
function renderCvTextFromDoc(cvDoc, lang) {
  const L = lang === "de" ? {
    summary: "PROFIL",
    experience: "BERUFSERFAHRUNG",
    education: "AUSBILDUNG",
    achievements: "ERFOLGE",
    skills: "KENNTNISSE",
    courses: "KURSE",
    interests: "INTERESSEN",
    languages: "SPRACHEN"
  } : {
    summary: "SUMMARY",
    experience: "EXPERIENCE",
    education: "EDUCATION",
    achievements: "KEY ACHIEVEMENTS",
    skills: "SKILLS",
    courses: "COURSES",
    interests: "INTERESTS",
    languages: "LANGUAGES"
  };
  const lines = [];
  const name = String(cvDoc?.name || "YOUR NAME").trim();
  const role = String(cvDoc?.target_role || "The role you are applying for").trim();
  const contact = cvDoc?.contact || {};
  const parts = [];
  if (contact.phone) parts.push(String(contact.phone).trim());
  if (contact.email) parts.push(String(contact.email).trim());
  if (contact.linkedin) parts.push(String(contact.linkedin).trim());
  if (contact.portfolio) parts.push(String(contact.portfolio).trim());
  if (contact.location) parts.push(String(contact.location).trim());
  lines.push(name);
  if (role) lines.push(role);
  if (parts.length) lines.push(parts.join(" \xB7 "));
  lines.push("");
  function addSection(title, fn) {
    const before = lines.length;
    fn();
    const after = lines.length;
    if (after > before) {
      if (lines[lines.length - 1] !== "") lines.push("");
    }
  }
  __name(addSection, "addSection");
  const summary = Array.isArray(cvDoc?.summary) ? cvDoc.summary.filter(Boolean) : [];
  if (summary.length) {
    lines.push(L.summary);
    for (const b of summary.slice(0, 8)) lines.push("- " + String(b).trim());
    lines.push("");
  }
  const exp = Array.isArray(cvDoc?.experience) ? cvDoc.experience : [];
  if (exp.length) {
    lines.push(L.experience);
    for (const e of exp) {
      const title = String(e?.title || "").trim();
      const company = String(e?.company || "").trim();
      const loc = String(e?.location || "").trim();
      const start = String(e?.start || "").trim();
      const end = String(e?.end || "").trim();
      const head = [title, company].filter(Boolean).join(" \u2014 ");
      if (head) lines.push(head);
      const meta = [start || null, end || null].filter(Boolean).join(" - ");
      const meta2 = [meta, loc].filter(Boolean).join(" | ");
      if (meta2) lines.push(meta2);
      const bullets = Array.isArray(e?.bullets) ? e.bullets : [];
      for (const b of bullets.slice(0, 10)) {
        const t = String(b || "").trim();
        if (t) lines.push("- " + t);
      }
      lines.push("");
    }
  }
  const edu = Array.isArray(cvDoc?.education) ? cvDoc.education : [];
  if (edu.length) {
    lines.push(L.education);
    for (const e of edu) {
      const degree = String(e?.degree || "").trim();
      const field = String(e?.field || "").trim();
      const school = String(e?.school || "").trim();
      const loc = String(e?.location || "").trim();
      const start = String(e?.start || "").trim();
      const end = String(e?.end || "").trim();
      const line1 = [degree, field].filter(Boolean).join(", ");
      if (line1) lines.push(line1);
      if (school) lines.push([school, loc].filter(Boolean).join(" \u2014 "));
      const meta = [start || null, end || null].filter(Boolean).join(" - ");
      if (meta) lines.push(meta);
      lines.push("");
    }
  }
  const ach = Array.isArray(cvDoc?.key_achievements) ? cvDoc.key_achievements.filter(Boolean) : [];
  if (ach.length) {
    lines.push(L.achievements);
    for (const a of ach.slice(0, 10)) lines.push("- " + String(a).trim());
    lines.push("");
  }
  const skills = cvDoc?.skills || {};
  const groups = Array.isArray(skills?.groups) ? skills.groups : [];
  const additional = Array.isArray(skills?.additional) ? skills.additional : [];
  if (groups.length || additional.length) {
    lines.push(L.skills);
    for (const g of groups.slice(0, 6)) {
      const label = String(g?.label || "").trim();
      const items = Array.isArray(g?.items) ? g.items.filter(Boolean) : [];
      if (!items.length) continue;
      const row = items.map((x) => String(x).trim()).filter(Boolean).join(", ");
      if (label) lines.push(label + ": " + row);
      else lines.push(row);
    }
    if (additional.length) {
      const row = additional.map((x) => String(x).trim()).filter(Boolean).join(", ");
      if (row) lines.push(row);
    }
    lines.push("");
  }
  const courses = Array.isArray(cvDoc?.courses) ? cvDoc.courses.filter(Boolean) : [];
  if (courses.length) {
    lines.push(L.courses);
    for (const c of courses.slice(0, 12)) lines.push("- " + String(c).trim());
    lines.push("");
  }
  const langs = Array.isArray(cvDoc?.languages) ? cvDoc.languages.filter(Boolean) : [];
  if (langs.length) {
    lines.push(L.languages);
    lines.push(langs.map((x) => String(x).trim()).filter(Boolean).join(", "));
    lines.push("");
  }
  const interests = Array.isArray(cvDoc?.interests) ? cvDoc.interests.filter(Boolean) : [];
  if (interests.length) {
    lines.push(L.interests);
    lines.push(interests.map((x) => String(x).trim()).filter(Boolean).join(", "));
    lines.push("");
  }
  return normalizeTailoredCvText(lines.join("\n"), lang);
}
__name(renderCvTextFromDoc, "renderCvTextFromDoc");
function buildClusterSuggestionPrompt({ roleClusters, aiCvOutput, cvTextSlice }) {
  const clustersSlim = (roleClusters || []).map((c) => ({
    id: c.id,
    label: c.label,
    titles: c.titles || [],
    skill_keywords: c.skill_keywords || [],
    negative_keywords: c.negative_keywords || []
  }));
  return [
    "Return ONLY valid JSON. No markdown. No code fences. No commentary.",
    "",
    "Schema:",
    "{",
    '  "decision": "use_existing_cluster" | "suggest_cluster_update" | "propose_new_cluster",',
    '  "selected_cluster_id": string | null,',
    '  "confidence": number,',
    '  "evidence": {',
    '    "cv_skills": string[],',
    '    "cv_titles": string[],',
    '    "matched_keywords": string[],',
    '    "missing_keywords": string[]',
    "  },",
    '  "cluster_update": {',
    '    "add_skill_keywords": string[],',
    '    "remove_skill_keywords": string[],',
    '    "add_titles": string[],',
    '    "remove_titles": string[],',
    '    "add_negative_keywords": string[],',
    '    "remove_negative_keywords": string[]',
    "  } | null,",
    '  "new_cluster_candidate": {',
    '    "id_suggestion": string,',
    '    "label": string,',
    '    "titles": string[],',
    '    "skill_keywords": string[],',
    '    "negative_keywords": string[],',
    '    "why_this_cluster": string,',
    '    "example_reason_skills": string[]',
    "  } | null,",
    '  "notes": {',
    '    "language": "de" | "en" | "mixed" | "unknown",',
    '    "warnings": string[]',
    "  }",
    "}",
    "",
    "Hard rules:",
    "- Output must be valid JSON matching schema exactly (no extra keys).",
    "- confidence must be 0.50\u20130.95.",
    "- All keywords/skills lowercased, deduplicated, concise (1\u20134 words).",
    "- Be conservative: prefer existing clusters unless clearly new.",
    "- selected_cluster_id must be one of the provided cluster ids when decision is use_existing_cluster or suggest_cluster_update.",
    "- cluster_update must be null unless decision is suggest_cluster_update.",
    "- new_cluster_candidate must be null unless decision is propose_new_cluster.",
    "- new_cluster_candidate titles max 6, skill_keywords max 18, negative_keywords max 8.",
    "",
    "ROLE CLUSTERS (active):",
    JSON.stringify(clustersSlim),
    "",
    "CV EXTRACTED DATA (from previous AI step):",
    JSON.stringify(aiCvOutput || {}),
    "",
    "RAW CV TEXT SLICE (optional):",
    String(cvTextSlice || "").slice(0, 6e3),
    "",
    "Now output JSON only."
  ].join("\n");
}
__name(buildClusterSuggestionPrompt, "buildClusterSuggestionPrompt");
async function insertRoleClusterSuggestion(env, row) {
  await supabaseFetch(env, `/rest/v1/role_cluster_suggestions`, {
    method: "POST",
    body: [row],
    headers: { Prefer: "return=minimal" }
  });
}
__name(insertRoleClusterSuggestion, "insertRoleClusterSuggestion");
async function handleMeAiProfileFromCv(request, env) {
  const auth = await requireMeCustomerId(request, env);
  if (!auth.ok) return auth.res;
  const customerId = auth.customerId;
  const q = new URLSearchParams();
  q.set("select", "cv_ocr_text,cv_text,countries_allowed,locations,desired_titles,exclude_titles,industries,seniority");
  q.set("customer_id", `eq.${customerId}`);
  q.set("limit", "1");
  const rows = await supabaseFetch(env, `/rest/v1/customer_profiles?${q.toString()}`, { method: "GET" });
  const prof = Array.isArray(rows) && rows.length ? rows[0] : null;
  const cvText = (prof?.cv_ocr_text || prof?.cv_text || "").toString().trim();
  if (!cvText) return json(request, { error: "No CV text found. Upload CV and run OCR first." }, 400);
  const cvSlice = cvText.slice(0, 12e3);
  const localeHint = {
    countries_allowed: Array.isArray(prof?.countries_allowed) ? prof.countries_allowed : [],
    locations: Array.isArray(prof?.locations) ? prof.locations : []
  };
  const prompt = [
    "Return ONLY valid JSON. No markdown. No code fences. No commentary.",
    "",
    "Schema:",
    "{",
    '  "primary_job_titles": {',
    '    "title": string,',
    '    "confidence": number,',
    '    "reason_skills": string[]',
    "  }[],",
    '  "alternative_job_titles": {',
    '    "title": string,',
    '    "confidence": number,',
    '    "reason_skills": string[]',
    "  }[],",
    '  "skills": {',
    '    "core": string[],',
    '    "supporting": string[],',
    '    "tools": string[]',
    "  },",
    '  "industries": string[],',
    '  "seniority": "junior" | "mid" | "senior" | "lead" | "unknown",',
    '  "summary": string',
    "}",
    "",
    "Rules:",
    "- primary_job_titles: 3\u20137 items",
    "- alternative_job_titles: 0\u20135 items, ONLY if there is strong skill overlap",
    "- confidence must be between 0.50 and 0.95",
    "- reason_skills must contain exactly 3 skills per title",
    "- skills.core: 6\u201312 items",
    "- skills.supporting: 4\u201310 items",
    "- skills.tools: 0\u201310 items",
    "- industries max 10 items",
    "- All skills must be lowercased, deduplicated, concise (1\u20134 words)",
    "- Do NOT invent experience, employers, education, or certifications",
    "- No seniority jumps (e.g. junior \u2192 lead)",
    "- Prefer German + English job titles if CV suggests Germany or German language",
    "- Use internationally common job titles where possible",
    "- If CV information is weak or unclear, return fewer items rather than guessing",
    "",
    "Context (may be empty):",
    JSON.stringify(localeHint),
    "",
    "CV TEXT:",
    cvSlice
  ].join("\n");
  const model = "gemini-2.0-flash-lite";
  const raw = await geminiGenerateJson(env, { model, promptText: prompt });
  const parsed = safeJsonParse(raw);
  const primary_job_titles = Array.isArray(parsed.primary_job_titles) ? parsed.primary_job_titles.slice(0, 7) : [];
  const alternative_job_titles = Array.isArray(parsed.alternative_job_titles) ? parsed.alternative_job_titles.slice(0, 5) : [];
  const core = Array.isArray(parsed?.skills?.core) ? parsed.skills.core.map((x) => String(x).trim()).filter(Boolean).slice(0, 12) : [];
  const supporting = Array.isArray(parsed?.skills?.supporting) ? parsed.skills.supporting.map((x) => String(x).trim()).filter(Boolean).slice(0, 10) : [];
  const tools = Array.isArray(parsed?.skills?.tools) ? parsed.skills.tools.map((x) => String(x).trim()).filter(Boolean).slice(0, 10) : [];
  const industries = Array.isArray(parsed.industries) ? parsed.industries.map((x) => String(x).trim()).filter(Boolean).slice(0, 10) : [];
  const seniority = ["junior", "mid", "senior", "lead", "unknown"].includes(String(parsed.seniority)) ? String(parsed.seniority) : "unknown";
  const summary = String(parsed.summary || "").trim().slice(0, 400);
  const job_titles = primary_job_titles.map((x) => String(x?.title || "").trim()).filter(Boolean).slice(0, 15);
  const excluded_titles = Array.isArray(parsed.excluded_titles) ? parsed.excluded_titles.map((x) => String(x).trim()).filter(Boolean).slice(0, 10) : [];
  const skills_flat = Array.from(new Set([...core, ...supporting, ...tools].map((s) => String(s).trim()).filter(Boolean))).slice(0, 40);
  return json(request, {
    ok: true,
    customer_id: customerId,
    result: {
      primary_job_titles,
      alternative_job_titles,
      skills: { core, supporting, tools },
      industries,
      seniority,
      summary,
      job_titles,
      excluded_titles,
      skills_flat
    }
  }, 200);
}
__name(handleMeAiProfileFromCv, "handleMeAiProfileFromCv");
async function handleMeAiClusterSuggestion(request, env) {
  const auth = await requireMeCustomerId(request, env);
  if (!auth.ok) return auth.res;
  const customerId = auth.customerId;
  const q = new URLSearchParams();
  q.set("select", "cv_ocr_text,cv_text,countries_allowed,locations");
  q.set("customer_id", `eq.${customerId}`);
  q.set("limit", "1");
  const rows = await supabaseFetch(env, `/rest/v1/customer_profiles?${q.toString()}`, { method: "GET" });
  const prof = Array.isArray(rows) && rows.length ? rows[0] : null;
  const cvText = (prof?.cv_ocr_text || prof?.cv_text || "").toString().trim();
  if (!cvText) return json(request, { error: "No CV text found. Upload CV and run OCR first." }, 400);
  const cvSlice = cvText.slice(0, 12e3);
  const localeHint = {
    countries_allowed: Array.isArray(prof?.countries_allowed) ? prof.countries_allowed : [],
    locations: Array.isArray(prof?.locations) ? prof.locations : []
  };
  const roleClusters = await loadRoleClusters(env);
  const extractionPrompt = [
    "Return ONLY valid JSON. No markdown. No code fences. No commentary.",
    "",
    "Schema:",
    "{",
    '  "primary_job_titles": {',
    '    "title": string,',
    '    "confidence": number,',
    '    "reason_skills": string[]',
    "  }[],",
    '  "alternative_job_titles": {',
    '    "title": string,',
    '    "confidence": number,',
    '    "reason_skills": string[]',
    "  }[],",
    '  "skills": {',
    '    "core": string[],',
    '    "supporting": string[],',
    '    "tools": string[]',
    "  },",
    '  "industries": string[],',
    '  "seniority": "junior" | "mid" | "senior" | "lead" | "unknown",',
    '  "summary": string',
    "}",
    "",
    "Rules:",
    "- primary_job_titles: 3\u20137 items",
    "- alternative_job_titles: 0\u20135 items, ONLY if there is strong skill overlap",
    "- confidence must be between 0.50 and 0.95",
    "- reason_skills must contain exactly 3 skills per title",
    "- skills.core: 6\u201312 items",
    "- skills.supporting: 4\u201310 items",
    "- skills.tools: 0\u201310 items",
    "- industries max 10 items",
    "- All skills must be lowercased, deduplicated, concise (1\u20134 words)",
    "- Do NOT invent experience, employers, education, or certifications",
    "- No seniority jumps (e.g. junior \u2192 lead)",
    "- Prefer German + English job titles if CV suggests Germany or German language",
    "- Use internationally common job titles where possible",
    "- If CV information is weak or unclear, return fewer items rather than guessing",
    "",
    "Context (may be empty):",
    JSON.stringify(localeHint),
    "",
    "CV TEXT:",
    cvSlice
  ].join("\n");
  const model = "gemini-2.0-flash-lite";
  const raw1 = await geminiGenerateJson(env, { model, promptText: extractionPrompt });
  const aiCvOutput = safeJsonParse(raw1);
  const derived = suggestByRoleClusters(aiCvOutput, roleClusters, { minClusterScore: 0.2, maxClusters: 3, maxAltTitles: 5 });
  const prompt2 = buildClusterSuggestionPrompt({ roleClusters, aiCvOutput, cvTextSlice: cvSlice });
  const raw2 = await geminiGenerateJson(env, { model, promptText: prompt2 });
  const suggestion = safeJsonParse(raw2);
  const source_hash = await sha256Hex(JSON.stringify({
    customerId,
    cvSlice: cvSlice.slice(0, 6e3),
    skills: aiCvOutput?.skills || null,
    primary: aiCvOutput?.primary_job_titles || null
  }));
  await insertRoleClusterSuggestion(env, {
    customer_id: customerId,
    source_hash,
    decision: suggestion.decision,
    selected_cluster_id: suggestion.selected_cluster_id || null,
    confidence: suggestion.confidence,
    evidence: suggestion.evidence || {},
    cluster_update: suggestion.cluster_update || null,
    new_cluster_candidate: suggestion.new_cluster_candidate || null,
    notes: suggestion.notes || {},
    applied: false,
    applied_at: null
  });
  return json(request, {
    ok: true,
    customer_id: customerId,
    ai_cv_output: aiCvOutput,
    cluster_match: derived,
    cluster_suggestion: suggestion
  }, 200);
}
__name(handleMeAiClusterSuggestion, "handleMeAiClusterSuggestion");
async function handleAdminApplyRoleClusterSuggestion(request, env) {
  if (!isAdminAuthorized(request, env)) return json(request, { error: "Unauthorized" }, 401);
  let body = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  if (!body) return json(request, { error: "Invalid JSON body" }, 400);
  const suggestionId = String(body.suggestion_id || "").trim();
  if (!looksLikeUuid(suggestionId)) return json(request, { error: "suggestion_id must be a uuid" }, 400);
  const apply = body.apply || {};
  const addTitles = Array.isArray(apply.add_titles) ? apply.add_titles.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 10) : [];
  const addSkills = Array.isArray(apply.add_skill_keywords) ? apply.add_skill_keywords.map((x) => String(x || "").trim().toLowerCase()).filter(Boolean).slice(0, 25) : [];
  const addNeg = Array.isArray(apply.add_negative_keywords) ? apply.add_negative_keywords.map((x) => String(x || "").trim().toLowerCase()).filter(Boolean).slice(0, 15) : [];
  const qSug = new URLSearchParams();
  qSug.set("select", "id,applied,selected_cluster_id");
  qSug.set("id", `eq.${suggestionId}`);
  qSug.set("limit", "1");
  const sugRows = await supabaseFetch(env, `/rest/v1/role_cluster_suggestions?${qSug.toString()}`, { method: "GET" });
  const sug = Array.isArray(sugRows) && sugRows.length ? sugRows[0] : null;
  if (!sug) return json(request, { error: "Suggestion not found" }, 404);
  if (sug.applied) return json(request, { error: "Suggestion already applied" }, 409);
  const clusterId = String(sug.selected_cluster_id || "").trim();
  if (!clusterId) return json(request, { error: "Suggestion has no selected_cluster_id" }, 400);
  const qCl = new URLSearchParams();
  qCl.set("select", "id,titles,skill_keywords,negative_keywords,version,is_active");
  qCl.set("id", `eq.${clusterId}`);
  qCl.set("limit", "1");
  const clRows = await supabaseFetch(env, `/rest/v1/role_clusters?${qCl.toString()}`, { method: "GET" });
  const cl = Array.isArray(clRows) && clRows.length ? clRows[0] : null;
  if (!cl) return json(request, { error: "Cluster not found", cluster_id: clusterId }, 404);
  const existingTitles = new Set((cl.titles || []).map((x) => String(x || "").trim()).filter(Boolean));
  const existingSkills = new Set((cl.skill_keywords || []).map((x) => String(x || "").trim().toLowerCase()).filter(Boolean));
  const existingNeg = new Set((cl.negative_keywords || []).map((x) => String(x || "").trim().toLowerCase()).filter(Boolean));
  for (const t of addTitles) existingTitles.add(t);
  for (const s of addSkills) existingSkills.add(s);
  for (const n of addNeg) existingNeg.add(n);
  const mergedTitles = Array.from(existingTitles).slice(0, 80);
  const mergedSkills = Array.from(existingSkills).slice(0, 160);
  const mergedNeg = Array.from(existingNeg).slice(0, 80);
  await supabaseFetch(env, `/rest/v1/role_clusters?id=eq.${encodeURIComponent(clusterId)}`, {
    method: "PATCH",
    body: {
      titles: mergedTitles,
      skill_keywords: mergedSkills,
      negative_keywords: mergedNeg,
      version: Number(cl.version || 1) + 1,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    },
    headers: { Prefer: "return=minimal" }
  });
  await supabaseFetch(env, `/rest/v1/role_cluster_suggestions?id=eq.${encodeURIComponent(suggestionId)}`, {
    method: "PATCH",
    body: {
      applied: true,
      applied_at: (/* @__PURE__ */ new Date()).toISOString()
    },
    headers: { Prefer: "return=minimal" }
  });
  if (typeof ROLE_CLUSTER_CACHE === "object" && ROLE_CLUSTER_CACHE) {
    ROLE_CLUSTER_CACHE.expiresAt = 0;
  }
  return json(request, {
    ok: true,
    applied: true,
    suggestion_id: suggestionId,
    cluster_id: clusterId,
    applied_additions: {
      add_titles: addTitles,
      add_skill_keywords: addSkills,
      add_negative_keywords: addNeg
    }
  }, 200);
}
__name(handleAdminApplyRoleClusterSuggestion, "handleAdminApplyRoleClusterSuggestion");
async function handleMeJobsQueue(request, env) {
  const user = await getSupabaseUserFromAuthHeader(request, env);
  if (!user?.email) return json(request, { error: "Unauthorized" }, 401);
  const customerId = await getCustomerIdForSupabaseUserEmail(env, user.email);
  if (!customerId) {
    return json(request, { error: "Customer not found for auth user", email: String(user.email || "").toLowerCase() }, 404);
  }
  const qApps = new URLSearchParams();
  qApps.set("select", "job_id,created_at,priority,priority_at");
  qApps.set("customer_id", `eq.${customerId}`);
  qApps.set("status", "eq.new");
  qApps.set("order", "priority.desc,priority_at.desc,created_at.desc");
  qApps.set("limit", "200");
  const apps = await supabaseFetch(env, `/rest/v1/applications?${qApps.toString()}`, { method: "GET" });
  const jobIds = (apps || []).map((a) => a.job_id).filter(Boolean);
  if (!jobIds.length) {
    return json(request, { ok: true, me: true, customer_id: customerId, count: 0, data: [] }, 200);
  }
  const qJobs = new URLSearchParams();
  qJobs.set(
    "select",
    "id,title,company_name,country,city,region,apply_url,posted_at,fetched_at,status,source_modified_at"
  );
  qJobs.set("id", `in.(${jobIds.join(",")})`);
  qJobs.set("limit", String(jobIds.length));
  const jobs = await supabaseFetch(env, `/rest/v1/jobs_normalized?${qJobs.toString()}`, { method: "GET" });
  const orderIndex = new Map(jobIds.map((id, idx) => [id, idx]));
  const sortedJobs = (jobs || []).slice().sort((a, b) => (orderIndex.get(a.id) ?? 999999) - (orderIndex.get(b.id) ?? 999999));
  const appMap = new Map((apps || []).map((a) => [a.job_id, a]));
  const withMeta = sortedJobs.map((j) => {
    const a = appMap.get(j.id) || {};
    return {
      ...j,
      _application: {
        priority: !!a.priority,
        priority_at: a.priority_at || null,
        created_at: a.created_at || null
      }
    };
  });
  return json(request, { ok: true, me: true, customer_id: customerId, count: withMeta.length, data: withMeta }, 200);
}
__name(handleMeJobsQueue, "handleMeJobsQueue");
async function handleMeJobsDescription(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  const url = new URL(request.url);
  const jobId = String(url.searchParams.get("job_id") || "").trim();
  if (!looksLikeUuid(jobId)) {
    return json(request, { error: "job_id (uuid) is required" }, 400);
  }
  const qApp = new URLSearchParams();
  qApp.set("select", "job_id,status");
  qApp.set("customer_id", `eq.${me.customerId}`);
  qApp.set("job_id", `eq.${jobId}`);
  qApp.set("limit", "1");
  const apps = await supabaseFetch(env, `/rest/v1/applications?${qApp.toString()}`, { method: "GET" });
  if (!Array.isArray(apps) || apps.length === 0) {
    return json(request, { error: "Job not found for this customer" }, 404);
  }
  const qJob = new URLSearchParams();
  qJob.set(
    "select",
    "id,source_id,external_job_id,title,company_name,country,city,region,apply_url,description_full,description_full_source,description_full_hash,description_full_fetched_at,description_full_error,description_full_error_at"
  );
  qJob.set("id", `eq.${jobId}`);
  qJob.set("limit", "1");
  const rows = await supabaseFetch(env, `/rest/v1/jobs_normalized?${qJob.toString()}`, { method: "GET" });
  if (!Array.isArray(rows) || rows.length === 0) {
    return json(request, { error: "Job not found" }, 404);
  }
  const job = rows[0];
  const ttlHours = clampInt(env.BA_JOBDETAIL_TTL_HOURS || "336", 1, 24 * 365, 336);
  const ensured = await ensureBaJobDescriptionCached(env, job, { ttlHours });
  return json(
    request,
    {
      ok: true,
      customer_id: me.customerId,
      status: ensured.status,
      from_cache: ensured.from_cache,
      fetched: ensured.fetched,
      error: ensured.error || null,
      job: ensured.job
    },
    200
  );
}
__name(handleMeJobsDescription, "handleMeJobsDescription");
async function handleMeJobsFetch(request, env) {
  const user = await getSupabaseUserFromAuthHeader(request, env).catch(() => null);
  if (!user) return json(request, { error: "Unauthorized" }, 401);
  const email = user && user.email ? String(user.email).toLowerCase() : "";
  if (!email) return json(request, { error: "Unauthorized (missing email)" }, 401);
  const qCust = new URLSearchParams();
  qCust.set("select", "id,email");
  qCust.set("email", `eq.${email}`);
  const resCust = await supabaseFetch(env, `/rest/v1/customers?${qCust.toString()}`, { method: "GET" });
  const custRows = Array.isArray(resCust) ? resCust : [];
  const cust = custRows.length ? custRows[0] : null;
  if (!cust || !cust.id) return json(request, { error: "Customer not found" }, 404);
  const customerId = cust.id;
  const cooldownMinutes = 10;
  const sinceIso = new Date(Date.now() - cooldownMinutes * 60 * 1e3).toISOString();
  try {
    const qRl = new URLSearchParams();
    qRl.set("select", "id,created_at");
    qRl.set("customer_id", `eq.${customerId}`);
    qRl.set("fetched_by", `eq.manual`);
    qRl.set("created_at", `gte.${sinceIso}`);
    qRl.set("order", "created_at.desc");
    qRl.set("limit", "1");
    const recent = await supabaseFetch(env, `/rest/v1/customer_fetch_logs?${qRl.toString()}`, { method: "GET" });
    if (Array.isArray(recent) && recent.length) {
      return json(request, {
        error: "Too many requests",
        message: "You can fetch again in a few minutes.",
        retry_after_seconds: cooldownMinutes * 60
      }, 429);
    }
  } catch (e) {
  }
  let body = {};
  try {
    body = await request.json();
  } catch (_) {
  }
  const fetchMode = String(body.fetch_mode || "").trim().toLowerCase();
  const includeAi = Boolean(body.include_ai_titles);
  const aiTitlesRaw = Array.isArray(body.ai_titles) ? body.ai_titles : [];
  const mode = fetchMode || (includeAi ? "profile_plus_ai" : "profile");
  const qProfile = new URLSearchParams();
  qProfile.set("select", "customer_id,desired_titles,locations,radius_km,countries_allowed,exclude_titles");
  qProfile.set("customer_id", `eq.${customerId}`);
  const resProfile = await supabaseFetch(env, `/rest/v1/customer_profiles?${qProfile.toString()}`, { method: "GET" });
  const profiles = Array.isArray(resProfile) ? resProfile : [];
  const p = Array.isArray(profiles) && profiles.length ? profiles[0] : null;
  const profileAiTitles = Array.isArray(p && p.ai_titles) ? p.ai_titles.map((t) => String(t || "").trim()).filter(Boolean) : [];
  if (!p) return json(request, { error: "Customer profile not found" }, 404);
  const desired = Array.isArray(p.desired_titles) ? p.desired_titles.filter(Boolean) : [];
  const locations = Array.isArray(p.locations) ? p.locations.filter(Boolean) : [];
  if (!desired.length) return json(request, { error: "Profile incomplete: add at least 1 desired title first." }, 400);
  if (!locations.length) return json(request, { error: "Profile incomplete: add at least 1 location first." }, 400);
  const maxQueueNew = clampInt(env.MAX_QUEUE_NEW || "50", 1, 500);
  const qCount = new URLSearchParams();
  qCount.set("select", "id");
  qCount.set("customer_id", `eq.${customerId}`);
  qCount.set("status", "eq.new");
  qCount.set("limit", String(maxQueueNew + 1));
  const resCount = await supabaseFetch(env, `/rest/v1/applications?${qCount.toString()}`, { method: "GET" });
  const rows = Array.isArray(resCount) ? resCount : [];
  const newCount = Array.isArray(rows) ? rows.length : 0;
  if (newCount >= maxQueueNew) {
    return json(request, {
      ok: true,
      skipped: true,
      reason: "queue_full",
      queue_new_count: newCount,
      max_queue_new: maxQueueNew,
      message: "You already have many jobs in your queue. Please review them first."
    }, 200);
  }
  const merged = [];
  const pushTitle = /* @__PURE__ */ __name((t) => {
    const s = String(t || "").trim();
    if (!s) return;
    if (merged.some((x) => x.toLowerCase() === s.toLowerCase())) return;
    merged.push(s);
  }, "pushTitle");
  desired.forEach(pushTitle);
  if (includeAi) aiTitlesRaw.forEach(pushTitle);
  const maxTitles = clampInt(env.MAX_FETCH_TITLES || "25", 5, 100);
  const overrideTitles = merged.slice(0, maxTitles);
  const result = await fetchJobsForCustomerCore(customerId, env, "manual", true, overrideTitles);
  const resCount2 = await supabaseFetch(env, `/rest/v1/applications?${qCount.toString()}`, { method: "GET" });
  const rows2 = Array.isArray(resCount2) ? resCount2 : [];
  const newCount2 = Array.isArray(rows2) ? rows2.length : 0;
  return json(request, {
    ok: true,
    fetched_by: "manual",
    include_ai_titles: includeAi,
    titles_used: overrideTitles,
    jobs_added: result.queued_count,
    used_radius: result.radius_km_used,
    match_level: result.match_level,
    queue_new_count: newCount2,
    details: result.details
  }, 200);
}
__name(handleMeJobsFetch, "handleMeJobsFetch");
async function handleMeAiTitlesSave(request, env) {
  const user = await getSupabaseUserFromAuthHeader(request, env).catch(() => null);
  if (!user) return json(request, { error: "Unauthorized" }, 401);
  const email = user && user.email ? String(user.email).toLowerCase() : "";
  if (!email) return json(request, { error: "Unauthorized (missing email)" }, 401);
  const qCust = new URLSearchParams();
  qCust.set("select", "id,email");
  qCust.set("email", `eq.${email}`);
  const resCust = await supabaseFetch(env, `/rest/v1/customers?${qCust.toString()}`, { method: "GET" });
  const custRows = Array.isArray(resCust) ? resCust : [];
  const cust = custRows.length ? custRows[0] : null;
  if (!cust || !cust.id) return json(request, { error: "Customer not found" }, 404);
  const customerId = cust.id;
  let body = {};
  try {
    body = await request.json();
  } catch (_) {
  }
  const titles = Array.isArray(body.ai_titles) ? body.ai_titles : [];
  const cleaned = [];
  const seen = /* @__PURE__ */ new Set();
  for (const t of titles) {
    const s = String(t || "").trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    cleaned.push(s);
  }
  if (!cleaned.length) return json(request, { error: "No ai_titles provided" }, 400);
  await supabaseFetch(env, `/rest/v1/customer_profiles`, {
    method: "POST",
    body: [{
      customer_id: customerId,
      ai_titles: cleaned,
      ai_titles_updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }],
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
  return json(request, { ok: true, customer_id: customerId, saved: cleaned.length }, 200);
}
__name(handleMeAiTitlesSave, "handleMeAiTitlesSave");
async function handleMeApplicationsList(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  const url = new URL(request.url);
  const limitRaw = url.searchParams.get("limit") || "30";
  const offsetRaw = url.searchParams.get("offset") || "0";
  const status = (url.searchParams.get("status") || "").trim().toLowerCase();
  const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 30, 1), 100);
  const offset = Math.max(parseInt(offsetRaw, 10) || 0, 0);
  const allowedStatuses = /* @__PURE__ */ new Set(["new", "applied", "shortlisted", "skipped", "rejected", "expired"]);
  const statusFilter = status && allowedStatuses.has(status) ? status : "";
  const q = new URLSearchParams();
  q.set(
    "select",
    [
      "id",
      "status",
      "notes",
      "applied_by",
      "application_channel",
      "from_email",
      "created_at",
      "updated_at",
      "job:jobs_normalized(id,title,company_name,country,city,region,apply_url,posted_at)"
    ].join(",")
  );
  q.set("customer_id", `eq.${me.customerId}`);
  q.set("order", "updated_at.desc");
  q.set("limit", String(limit));
  if (offset) q.set("offset", String(offset));
  if (statusFilter) q.set("status", `eq.${statusFilter}`);
  const rows = await supabaseFetch(env, `/rest/v1/applications?${q.toString()}`, { method: "GET" });
  const data = Array.isArray(rows) ? rows.map((r) => ({
    id: r.id,
    status: r.status || "unknown",
    notes: r.notes || null,
    applied_by: r.applied_by || null,
    application_channel: r.application_channel || null,
    from_email: r.from_email || null,
    created_at: r.created_at || null,
    updated_at: r.updated_at || null,
    job: r.job || null
  })) : [];
  return json(request, {
    ok: true,
    me: true,
    customer_id: me.customerId,
    limit,
    offset,
    status: statusFilter || null,
    count: data.length,
    data
  }, 200);
}
__name(handleMeApplicationsList, "handleMeApplicationsList");
function getCvBucket(env) {
  return String(env.CV_BUCKET || "cvs").trim() || "cvs";
}
__name(getCvBucket, "getCvBucket");
function getMaxCvBytes(env) {
  const n = Number(env.CV_MAX_BYTES || 5 * 1024 * 1024);
  return Number.isFinite(n) && n > 0 ? n : 5 * 1024 * 1024;
}
__name(getMaxCvBytes, "getMaxCvBytes");
function inferCvMimeFromName(name) {
  const n = String(name || "").toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".doc")) return "application/msword";
  if (n.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "";
}
__name(inferCvMimeFromName, "inferCvMimeFromName");
var ALLOWED_CV_MIME = /* @__PURE__ */ new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);
function safeFileName(name) {
  return String(name || "cv").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}
__name(safeFileName, "safeFileName");
function encodeStoragePath(path) {
  return encodeURIComponent(path).replace(/%2F/g, "/");
}
__name(encodeStoragePath, "encodeStoragePath");
async function uploadToSupabaseStorage(env, { bucket, path, file, contentType }) {
  const supabaseUrl = mustEnv(env, "SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = mustEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeStoragePath(path)}`;
  const buf = await file.arrayBuffer();
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": contentType || "application/octet-stream",
      "x-upsert": "true"
    },
    body: buf
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`Storage upload failed ${res.status}: ${text}`);
}
__name(uploadToSupabaseStorage, "uploadToSupabaseStorage");
async function handleMeCvUpload(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  const ct = (request.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("multipart/form-data")) {
    return json(request, { error: "Expected multipart/form-data" }, 400);
  }
  const fd = await request.formData();
  const file = fd.get("cv");
  if (!file || typeof file === "string") {
    return json(request, { error: "Missing file field 'cv'" }, 400);
  }
  const size = Number(file.size || 0);
  let mime = String(file.type || "").trim();
  const originalNameRaw = String(file.name || "");
  if (!mime) {
    const inferred = inferCvMimeFromName(originalNameRaw);
    if (inferred) mime = inferred;
  }
  const nameForCheck = originalNameRaw.toLowerCase();
  const extOk = nameForCheck.endsWith(".pdf") || nameForCheck.endsWith(".doc") || nameForCheck.endsWith(".docx");
  if (!ALLOWED_CV_MIME.has(mime) && !extOk) {
    return json(request, { error: "Unsupported file type. Use PDF/DOC/DOCX." }, 400);
  }
  if (!Number.isFinite(size) || size <= 0) {
    return json(request, { error: "Empty file" }, 400);
  }
  if (size > getMaxCvBytes(env)) {
    return json(request, { error: "File too large", max_bytes: getMaxCvBytes(env) }, 413);
  }
  const originalName = safeFileName(file.name);
  const ts = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const path = `${me.customerId}/${ts}-${originalName}`;
  await uploadToSupabaseStorage(env, { bucket: getCvBucket(env), path, file, contentType: mime });
  const payload = {
    customer_id: me.customerId,
    cv_path: path,
    cv_filename: originalName,
    cv_mime: mime,
    cv_size: size,
    cv_uploaded_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString(),
    cv_ocr_status: null,
    cv_ocr_operation: null,
    cv_ocr_error: null,
    cv_ocr_text: null,
    cv_ocr_updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  await supabaseFetch(env, `/rest/v1/customer_profiles?on_conflict=customer_id`, {
    method: "POST",
    body: [payload],
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
  return json(request, { ok: true, me: true, customer_id: me.customerId, ...payload }, 200);
}
__name(handleMeCvUpload, "handleMeCvUpload");
async function handleMeCvGet(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  const q = new URLSearchParams();
  q.set(
    "select",
    "cv_path,cv_filename,cv_mime,cv_size,cv_uploaded_at,cv_ocr_status,cv_ocr_operation,cv_ocr_error,cv_ocr_updated_at,cv_ocr_text"
  );
  q.set("customer_id", `eq.${me.customerId}`);
  q.set("limit", "1");
  const rows = await supabaseFetch(env, `/rest/v1/customer_profiles?${q.toString()}`, { method: "GET" });
  const row = Array.isArray(rows) && rows.length ? rows[0] : null;
  const ocrText = String(row?.cv_ocr_text || "").trim();
  const cv = row ? {
    ...row,
    cv_ocr_text: void 0,
    cv_has_ocr_text: ocrText.length > 40,
    cv_ocr_text_chars: ocrText.length
  } : null;
  return json(request, { ok: true, me: true, customer_id: me.customerId, cv }, 200);
}
__name(handleMeCvGet, "handleMeCvGet");
async function persistAiTitles(env, customerId, aiTitles) {
  const titles = Array.isArray(aiTitles) ? aiTitles.map((t) => String(t || "").trim()).filter(Boolean).slice(0, 50) : [];
  const payload = {
    customer_id: customerId,
    ai_titles: titles,
    ai_titles_updated_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    await supabaseFetch(env, `/rest/v1/customer_profiles?on_conflict=customer_id`, {
      method: "POST",
      body: [payload],
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
    });
  } catch (e) {
    console.log("persistAiTitles failed", String(e));
  }
  return titles;
}
__name(persistAiTitles, "persistAiTitles");
async function handleMeCvSuggestTitles(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  const q = new URLSearchParams();
  q.set("select", "cv_path,cv_filename,cv_mime,desired_titles,cv_ocr_text");
  q.set("customer_id", `eq.${me.customerId}`);
  q.set("limit", "1");
  const rows = await supabaseFetch(env, `/rest/v1/customer_profiles?${q.toString()}`, { method: "GET" });
  const row = Array.isArray(rows) && rows.length ? rows[0] : null;
  if (!row?.cv_path) {
    return json(request, { error: "No CV uploaded yet. Upload first via POST /me/cv." }, 400);
  }
  const limit = clamp(new URL(request.url).searchParams.get("limit") || 15, 1, 30);
  const ocrText = String(row.cv_ocr_text || "").trim();
  if (ocrText.length > 40) {
    const normalizedText2 = normalizeForMatch(ocrText);
    const baseTitles2 = getCommonTitleDictionary();
    const suggestions2 = scoreTitlesFromText(normalizedText2, baseTitles2, limit);
    await persistAiTitles(env, me.customerId, suggestions2);
    return json(
      request,
      {
        ok: true,
        me: true,
        customer_id: me.customerId,
        parsed: { chars: normalizedText2.length, has_text: normalizedText2.length > 40, source: "ocr" },
        suggestions: suggestions2
      },
      200
    );
  }
  const bucket = getCvBucket(env);
  const cvPath = String(row.cv_path);
  const cvMime = String(row.cv_mime || "");
  let bytes = null;
  try {
    bytes = await downloadFromSupabaseStorage(env, { bucket, path: cvPath });
  } catch (e) {
    return json(request, { error: "Failed to download CV from storage", details: String(e) }, 502);
  }
  const maxParseBytes = 2 * 1024 * 1024;
  if (bytes.byteLength > maxParseBytes) {
    return json(
      request,
      {
        error: "CV file is too large to parse for suggestions",
        max_parse_bytes: maxParseBytes,
        cv_size: bytes.byteLength
      },
      413
    );
  }
  let text = "";
  if (cvMime === "application/pdf" || cvPath.toLowerCase().endsWith(".pdf")) {
    text = extractTextFromPdfBytes(bytes);
  } else {
    text = " ";
  }
  const normalizedText = normalizeForMatch(text);
  const baseTitles = getCommonTitleDictionary();
  const suggestions = scoreTitlesFromText(normalizedText, baseTitles, limit);
  const desiredTitles = Array.isArray(row.desired_titles) ? row.desired_titles.map((t) => String(t || "").trim()).filter(Boolean) : [];
  const fallback = desiredTitles.slice(0, limit).map((t) => ({ title: t, confidence: 0.3, source: "profile" }));
  const out = suggestions.length ? suggestions : fallback;
  return json(
    request,
    {
      ok: true,
      me: true,
      customer_id: me.customerId,
      cv: { path: cvPath, filename: row.cv_filename || null, mime: cvMime || null, bytes: bytes.byteLength },
      parsed: { chars: normalizedText.length, has_text: normalizedText.length > 40, source: "naive_pdf" },
      suggestions: out
    },
    200
  );
}
__name(handleMeCvSuggestTitles, "handleMeCvSuggestTitles");
async function downloadFromSupabaseStorage(env, { bucket, path }) {
  const supabaseUrl = mustEnv(env, "SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = mustEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
  const url = `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeStoragePath(path)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Storage download failed ${res.status}: ${text}`);
  }
  return await res.arrayBuffer();
}
__name(downloadFromSupabaseStorage, "downloadFromSupabaseStorage");
function normalizeForMatch(s) {
  return String(s || "").replace(/\u0000/g, " ").replace(/\s+/g, " ").toLowerCase().trim();
}
__name(normalizeForMatch, "normalizeForMatch");
function extractTextFromPdfBytes(bytes) {
  try {
    const raw = new TextDecoder("latin1").decode(new Uint8Array(bytes));
    const parts = [];
    const reTj = /\(([^)]{1,200})\)\s*Tj/g;
    let m;
    while ((m = reTj.exec(raw)) !== null) {
      parts.push(unescapePdfString(m[1]));
      if (parts.length > 5e3) break;
    }
    const reTJ = /\[(.{1,2000}?)\]\s*TJ/g;
    let m2;
    while ((m2 = reTJ.exec(raw)) !== null) {
      const inside = m2[1];
      const reInner = /\(([^)]{1,200})\)/g;
      let im;
      while ((im = reInner.exec(inside)) !== null) {
        parts.push(unescapePdfString(im[1]));
        if (parts.length > 5e3) break;
      }
      if (parts.length > 5e3) break;
    }
    return parts.join(" ");
  } catch {
    return "";
  }
}
__name(extractTextFromPdfBytes, "extractTextFromPdfBytes");
function unescapePdfString(s) {
  return String(s || "").replace(/\\\(/g, "(").replace(/\\\)/g, ")").replace(/\\\\/g, "\\").replace(/\\n/g, " ").replace(/\\r/g, " ").replace(/\\t/g, " ").replace(/\\[0-7]{1,3}/g, " ");
}
__name(unescapePdfString, "unescapePdfString");
function getCommonTitleDictionary() {
  return [
    { title: "Business Analyst", kw: ["business analyst", "ba", "requirements", "stakeholder", "process", "analysis"] },
    { title: "Data Analyst", kw: ["data analyst", "sql", "excel", "power bi", "tableau", "dashboard", "reporting"] },
    { title: "Operations Manager", kw: ["operations", "operational", "process improvement", "kpi", "sop", "workflow"] },
    { title: "Project Manager", kw: ["project manager", "scrum", "agile", "jira", "timeline", "milestone"] },
    { title: "Product Manager", kw: ["product manager", "roadmap", "user research", "mvp", "feature", "prioritization"] },
    { title: "Account Manager", kw: ["account manager", "client", "portfolio", "renewal", "upsell", "relationship"] },
    { title: "Customer Support Specialist", kw: ["customer support", "customer service", "zendesk", "ticket", "csat", "nps"] },
    { title: "HR / Recruiter", kw: ["recruiter", "recruitment", "talent", "hiring", "interview"] },
    { title: "Receptionist / Front Desk", kw: ["reception", "front desk", "rezeption", "empfang", "guest"] },
    { title: "Office Manager", kw: ["office manager", "administration", "admin", "coordination", "calendar"] },
    { title: "Marketing Manager", kw: ["marketing", "campaign", "ads", "roas", "seo", "content"] },
    { title: "Sales Manager", kw: ["sales", "pipeline", "crm", "closing", "lead", "quota"] },
    { title: "Software Engineer", kw: ["software", "developer", "javascript", "typescript", "api", "backend", "frontend"] }
  ];
}
__name(getCommonTitleDictionary, "getCommonTitleDictionary");
function scoreTitlesFromText(text, dict, limit) {
  const out = [];
  if (!text || text.length < 30) return out;
  for (const item of dict) {
    const title = item.title;
    const kws = Array.isArray(item.kw) ? item.kw : [];
    let score = 0;
    for (const kw of kws) {
      const k = String(kw || "").toLowerCase().trim();
      if (!k) continue;
      if (text.includes(k)) score += 3;
      const tokens = k.split(/\s+/g).filter(Boolean);
      if (tokens.length >= 2) {
        let hit = 0;
        for (const t of tokens) {
          if (t.length >= 3 && text.includes(t)) hit += 1;
        }
        if (hit >= Math.ceil(tokens.length * 0.7)) score += 1;
      }
    }
    if (score > 0) {
      const confidence = Math.min(0.95, 0.15 + score / 20);
      out.push({ title, confidence: Number(confidence.toFixed(2)), source: "cv" });
    }
  }
  out.sort((a, b) => b.confidence - a.confidence);
  const seen = /* @__PURE__ */ new Set();
  const final = [];
  for (const s of out) {
    if (seen.has(s.title)) continue;
    seen.add(s.title);
    final.push(s);
    if (final.length >= limit) break;
  }
  return final;
}
__name(scoreTitlesFromText, "scoreTitlesFromText");
function getOcrMaxPdfBytes(env) {
  const n = Number(env.OCR_MAX_PDF_BYTES || 10 * 1024 * 1024);
  return Number.isFinite(n) && n > 0 ? n : 10 * 1024 * 1024;
}
__name(getOcrMaxPdfBytes, "getOcrMaxPdfBytes");
function getOcrMaxImageBytes(env) {
  const n = Number(env.OCR_MAX_IMAGE_BYTES || 8 * 1024 * 1024);
  return Number.isFinite(n) && n > 0 ? n : 8 * 1024 * 1024;
}
__name(getOcrMaxImageBytes, "getOcrMaxImageBytes");
function getGcsBucket(env) {
  return mustEnv(env, "GCP_GCS_BUCKET");
}
__name(getGcsBucket, "getGcsBucket");
function normPrefix(p) {
  const s = String(p || "").trim();
  if (!s) return "";
  return s.endsWith("/") ? s.slice(0, -1) : s;
}
__name(normPrefix, "normPrefix");
function base64UrlEncode(bytes) {
  let binary = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i += 1) binary += String.fromCharCode(arr[i]);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(base64UrlEncode, "base64UrlEncode");
function base64Encode(bytes) {
  let binary = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const chunkSize = 32768;
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.subarray(i, i + chunkSize);
    let piece = "";
    for (let j = 0; j < chunk.length; j += 1) {
      piece += String.fromCharCode(chunk[j]);
    }
    binary += piece;
  }
  return btoa(binary);
}
__name(base64Encode, "base64Encode");
function inferImageMimeFromName(name) {
  const n = String(name || "").toLowerCase();
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".heic")) return "image/heic";
  if (n.endsWith(".heif")) return "image/heif";
  return "";
}
__name(inferImageMimeFromName, "inferImageMimeFromName");
var ALLOWED_OCR_IMAGE_MIME = /* @__PURE__ */ new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif"
]);
function pemToArrayBuffer(pem) {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
__name(pemToArrayBuffer, "pemToArrayBuffer");
async function signJwtRS256(privateKeyPem, headerObj, payloadObj) {
  const enc = new TextEncoder();
  const header = base64UrlEncode(enc.encode(JSON.stringify(headerObj)));
  const payload = base64UrlEncode(enc.encode(JSON.stringify(payloadObj)));
  const data = `${header}.${payload}`;
  const keyBuf = pemToArrayBuffer(privateKeyPem);
  const cryptoKey = await crypto.subtle.importKey("pkcs8", keyBuf, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign({ name: "RSASSA-PKCS1-v1_5" }, cryptoKey, enc.encode(data));
  const sig = base64UrlEncode(new Uint8Array(sigBuf));
  return `${data}.${sig}`;
}
__name(signJwtRS256, "signJwtRS256");
async function getGcpAccessToken(env) {
  const saJson = JSON.parse(mustEnv(env, "GCP_SA_KEY_JSON"));
  const clientEmail = saJson.client_email;
  const privateKey = saJson.private_key;
  if (!clientEmail || !privateKey) throw new Error("GCP_SA_KEY_JSON missing client_email/private_key");
  const now = Math.floor(Date.now() / 1e3);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/generative-language https://www.googleapis.com/auth/generative-language.retriever",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };
  const assertion = await signJwtRS256(privateKey, header, payload);
  const form = new URLSearchParams();
  form.set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
  form.set("assertion", assertion);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString()
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GCP token error ${res.status}: ${text}`);
  const data = JSON.parse(text);
  if (!data.access_token) throw new Error(`GCP token missing access_token: ${text}`);
  return data.access_token;
}
__name(getGcpAccessToken, "getGcpAccessToken");
async function gcsUploadObject(env, accessToken, { bucket, objectName, bytes, contentType }) {
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(objectName)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType || "application/octet-stream"
    },
    body: bytes
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`GCS upload failed ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}
__name(gcsUploadObject, "gcsUploadObject");
async function gcsListObjectNames(env, accessToken, bucket, prefix, { maxResults = 200, pageToken = null } = {}) {
  const q = new URLSearchParams();
  q.set("prefix", prefix);
  q.set("maxResults", String(maxResults));
  q.set("fields", "items(name),nextPageToken");
  if (pageToken) q.set("pageToken", pageToken);
  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o?${q.toString()}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    }
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`GCS list failed ${res.status}: ${text.slice(0, 600)}`);
  }
  const data = text ? JSON.parse(text) : null;
  const items = Array.isArray(data?.items) ? data.items : [];
  const names = items.map((it) => String(it?.name || "")).filter(Boolean);
  return { names, nextPageToken: data?.nextPageToken || null };
}
__name(gcsListObjectNames, "gcsListObjectNames");
function parseVisionOutputRange(objectName) {
  const m = String(objectName || "").match(/output-(\d+)-to-(\d+)\.json$/);
  if (!m) return null;
  const start = Number(m[1]);
  const end = Number(m[2]);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return { start, end };
}
__name(parseVisionOutputRange, "parseVisionOutputRange");
async function gcsObjectExists(env, accessToken, bucket, objectName) {
  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectName)}?fields=name`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 404) return false;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GCS meta failed ${res.status}: ${body.slice(0, 600)}`);
  }
  return true;
}
__name(gcsObjectExists, "gcsObjectExists");
async function gcsProbeVisionOutputFiles(env, accessToken, bucket, outPrefix) {
  const MAX_JSON_FILES = 25;
  const prefix = String(outPrefix || "");
  const base = prefix.endsWith("/") ? prefix : prefix + "/";
  try {
    let pageToken = null;
    let all = [];
    for (let i = 0; i < 3; i++) {
      const r = await gcsListObjectNames(env, accessToken, bucket, base, { maxResults: 200, pageToken });
      all = all.concat(r.names || []);
      pageToken = r.nextPageToken;
      if (!pageToken) break;
      if (all.length >= 600) break;
    }
    const parsed = [];
    for (const name of all) {
      if (!name.startsWith(base)) continue;
      const pr = parseVisionOutputRange(name);
      if (!pr) continue;
      parsed.push({ name, start: pr.start, end: pr.end });
    }
    if (parsed.length) {
      parsed.sort((a, b) => a.start - b.start);
      const out = [];
      const seen = /* @__PURE__ */ new Set();
      for (const p of parsed) {
        if (seen.has(p.name)) continue;
        seen.add(p.name);
        out.push(p.name);
        if (out.length >= MAX_JSON_FILES) break;
      }
      return out;
    }
  } catch (e) {
  }
  const batchSize = 10;
  const maxChunks = 3;
  const names = [];
  let startPage = 1;
  for (let chunk = 0; chunk < maxChunks; chunk++) {
    const maxEnd = startPage + batchSize - 1;
    let foundEnd = null;
    for (let endPage = maxEnd; endPage >= startPage; endPage--) {
      const name = `${base}output-${startPage}-to-${endPage}.json`;
      let exists = false;
      try {
        exists = await gcsObjectExists(env, accessToken, bucket, name);
      } catch (err) {
        const msg = String(err?.message || err);
        if (msg.includes("403") || msg.toLowerCase().includes("forbidden")) {
          const json2 = await gcsTryDownloadJson(env, accessToken, bucket, name);
          exists = !!json2;
        } else {
          throw err;
        }
      }
      if (exists) {
        names.push(name);
        foundEnd = endPage;
        break;
      }
    }
    if (!foundEnd) break;
    if (names.length >= MAX_JSON_FILES) break;
    startPage = foundEnd + 1;
  }
  return names;
}
__name(gcsProbeVisionOutputFiles, "gcsProbeVisionOutputFiles");
async function gcsTryDownloadJson(env, accessToken, bucket, objectName) {
  const url = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectName)}?alt=media`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    }
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GCS get failed ${res.status}: ${body}`);
  }
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
__name(gcsTryDownloadJson, "gcsTryDownloadJson");
async function gcsDownloadObjectJson(env, accessToken, bucket, objectName) {
  const json2 = await gcsTryDownloadJson(env, accessToken, bucket, objectName);
  if (!json2) {
    throw new Error(`GCS JSON not found or not valid: gs://${bucket}/${objectName}`);
  }
  return json2;
}
__name(gcsDownloadObjectJson, "gcsDownloadObjectJson");
async function visionStartAsyncOcr(env, accessToken, { gcsInputUri, gcsOutputUri, mimeType }) {
  const location = (env.GCP_LOCATION || "eu").trim() || "eu";
  const endpoint = `https://${location}-vision.googleapis.com/v1/files:asyncBatchAnnotate`;
  const body = {
    requests: [
      {
        inputConfig: { gcsSource: { uri: gcsInputUri }, mimeType: mimeType || "application/pdf" },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        outputConfig: { gcsDestination: { uri: gcsOutputUri }, batchSize: 10 }
      }
    ]
  };
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`Vision start failed ${res.status}: ${text}`);
  const data = text ? JSON.parse(text) : null;
  if (!data?.name) throw new Error(`Vision response missing operation name: ${text}`);
  return data.name;
}
__name(visionStartAsyncOcr, "visionStartAsyncOcr");
async function visionGetOperation(env, accessToken, operationName) {
  const location = (env.GCP_LOCATION || "eu").trim() || "eu";
  const endpoint = `https://${location}-vision.googleapis.com/v1/${operationName}`;
  const res = await fetch(endpoint, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`Vision op get failed ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}
__name(visionGetOperation, "visionGetOperation");
async function visionExtractTextFromImage(env, accessToken, { bytes, mimeType, languageHints = [] } = {}) {
  const endpoint = "https://vision.googleapis.com/v1/images:annotate";
  const imageBytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || new ArrayBuffer(0));
  if (!imageBytes.length) throw new Error("Image file is empty");
  const body = {
    requests: [
      {
        image: { content: base64Encode(imageBytes) },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        imageContext: {
          languageHints: Array.isArray(languageHints) ? languageHints.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 6) : []
        }
      }
    ]
  };
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`Vision image OCR failed ${res.status}: ${text.slice(0, 1200)}`);
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  const response = Array.isArray(data?.responses) ? data.responses[0] : null;
  const err = response?.error;
  if (err && err.message) throw new Error(`Vision image OCR error: ${err.message}`);
  const extracted = String(
    response?.fullTextAnnotation?.text || response?.textAnnotations?.[0]?.description || ""
  ).replace(/\r/g, "").replace(/\u0000/g, " ").trim();
  return {
    text: extracted,
    pages: Array.isArray(response?.fullTextAnnotation?.pages) ? response.fullTextAnnotation.pages.length : null
  };
}
__name(visionExtractTextFromImage, "visionExtractTextFromImage");
async function setOcrState(env, customerId, patch) {
  const payload = {
    customer_id: customerId,
    ...patch,
    cv_ocr_updated_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  await supabaseFetch(env, `/rest/v1/customer_profiles?on_conflict=customer_id`, {
    method: "POST",
    body: [payload],
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
}
__name(setOcrState, "setOcrState");
async function setCustomerCvOcrResult(env, customerId, { status, operation, error, text }) {
  await setOcrState(env, customerId, {
    cv_ocr_status: status || null,
    cv_ocr_operation: operation || null,
    cv_ocr_error: error || null,
    cv_ocr_text: text || null
  });
}
__name(setCustomerCvOcrResult, "setCustomerCvOcrResult");
async function getCustomerCvRow(env, customerId) {
  const q = new URLSearchParams();
  q.set(
    "select",
    "customer_id,cv_path,cv_filename,cv_mime,cv_size,cv_uploaded_at,cv_ocr_status,cv_ocr_operation,cv_ocr_text,cv_ocr_error,cv_ocr_updated_at"
  );
  q.set("customer_id", `eq.${customerId}`);
  q.set("limit", "1");
  const rows = await supabaseFetch(env, `/rest/v1/customer_profiles?${q.toString()}`, { method: "GET" });
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}
__name(getCustomerCvRow, "getCustomerCvRow");
async function handleMeCvTailor(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const jobId = String(body.job_id || "").trim();
  const force = Boolean(body.force);
  let template = String(body.template || "professional").trim().toLowerCase();
  if (template !== "professional") template = "professional";
  let strength = "balanced";
  if (typeof body.strength === "number") {
    strength = body.strength <= 0 ? "light" : body.strength >= 2 ? "strong" : "balanced";
  } else if (typeof body.strength === "string") {
    const s = body.strength.trim().toLowerCase();
    if (s === "0") strength = "light";
    else if (s === "1") strength = "balanced";
    else if (s === "2") strength = "strong";
    else if (["light", "balanced", "strong"].includes(s)) strength = s;
  }
  if (!looksLikeUuid(jobId)) {
    return jsonResponse({ ok: false, error: "Invalid job_id" }, 400);
  }
  const appRows = await supabaseFetch(
    env,
    `/rest/v1/applications?select=id,job_id,customer_id&customer_id=eq.${me.customerId}&job_id=eq.${jobId}&limit=1`
  );
  if (!appRows || appRows.length === 0) {
    return jsonResponse({ ok: false, error: "Job not found for this customer" }, 404);
  }
  const jobRows = await supabaseFetch(
    env,
    `/rest/v1/jobs_normalized?select=id,title,company_name,country,city,region,external_job_id,apply_url,source_id,source_modified_at,description_snippet,description_full,description_full_source,description_full_hash,description_full_fetched_at,description_full_error,description_full_error_at&id=eq.${jobId}&limit=1`
  );
  const job = jobRows?.[0];
  if (!job) {
    return jsonResponse({ ok: false, error: "Job not found" }, 404);
  }
  const profRows = await supabaseFetch(
    env,
    `/rest/v1/customer_profiles?select=customer_id,language_requirements,cv_text,cv_text_source,cv_ocr_text,cv_ocr_status,cv_ocr_updated_at,cv_clean_text,cv_clean_hash,cv_clean_model,cv_clean_updated_at,cv_clean_error,cv_clean_error_at,cv_structured_json,cv_structured_hash,cv_structured_model,cv_structured_updated_at,cv_structured_error,cv_structured_error_at&customer_id=eq.${me.customerId}&limit=1`
  );
  const prof = profRows?.[0];
  if (!prof) {
    return jsonResponse({ ok: false, error: "Profile not found" }, 404);
  }
  const cvTextRaw = String(prof.cv_ocr_text || prof.cv_text || "").trim();
  if (!cvTextRaw) {
    return jsonResponse({ ok: false, error: "No CV text found. Upload a CV first." }, 400);
  }
  let lang = "en";
  let descText = (job.description_full || "").trim();
  let descHash = job.description_full_hash || null;
  const ensuredDesc = await ensureBaJobDescriptionCached(env, job, { ttlHours: Number(env.JOBDESC_TTL_HOURS || 336) });
  descText = String(ensuredDesc?.job?.description_full || descText || "").trim();
  descHash = ensuredDesc?.job?.description_full_hash || descHash || null;
  let descCacheStatus = ensuredDesc?.status || (descText ? "cached" : "missing");
  if (descText && !descHash) {
    try {
      descHash = await sha256Hex(descText);
      await supabaseFetch(env, `/rest/v1/jobs_normalized?id=eq.${encodeURIComponent(jobId)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: { description_full_hash: descHash }
      });
    } catch {
    }
  }
  const jobDescWarnings = [];
  if (!descText) {
    const provided = String(body.job_description || body.job_text || body.description || "").trim();
    const snippet = String(job.description_snippet || "").trim();
    if (provided) {
      descText = provided;
      descCacheStatus = "provided";
    } else if (snippet) {
      descText = snippet;
      descCacheStatus = "snippet";
      jobDescWarnings.push("Full job description was not available; using a short snippet.");
    } else {
      descText = [
        `Job title: ${String(job.title || "").trim()}`,
        job.company_name ? `Company: ${String(job.company_name).trim()}` : "",
        [job.city, job.region, job.country].filter(Boolean).length ? `Location: ${[job.city, job.region, job.country].filter(Boolean).join(", ")}` : "",
        job.apply_url ? `Apply URL: ${String(job.apply_url).trim()}` : ""
      ].filter(Boolean).join("\n");
      descCacheStatus = "minimal";
      jobDescWarnings.push("Full job description was not available; tailoring used only basic job info (title/company/location).");
    }
    if (descText && !descHash) {
      try {
        descHash = await sha256Hex(descText);
      } catch {
      }
    }
  }
  lang = detectLanguageHint(descText) || lang;
  try {
    const lrRaw = prof?.language_requirements;
    let lrText = "";
    if (Array.isArray(lrRaw)) {
      lrText = lrRaw.join(" ");
    } else if (typeof lrRaw === "string") {
      const s = lrRaw.trim();
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) lrText = parsed.join(" ");
        else lrText = String(parsed || "");
      } catch (_) {
        lrText = s;
      }
    } else if (lrRaw != null) {
      lrText = String(lrRaw);
    }
    const low = lrText.toLowerCase();
    const wantsDe = /(^|[^a-z])de([^a-z]|$)/.test(low) || low.includes("deutsch") || low.includes("german");
    const wantsEn = /(^|[^a-z])en([^a-z]|$)/.test(low) || low.includes("englisch") || low.includes("english");
    if (wantsDe && !wantsEn) lang = "de";
    else if (wantsEn && !wantsDe) lang = "en";
  } catch (_) {
  }
  const cleanRes = await ensureCvCleanText(env, me.customerId, prof, cvTextRaw, lang);
  const cvTextClean = String(cleanRes?.cv_text || "").trim();
  const cvCleanStatus = cleanRes?.from_cache ? "cached" : "generated";
  const cvCleanModel = cleanRes?.model || null;
  const cleanWarnings = Array.isArray(cleanRes?.warnings) ? cleanRes.warnings : [];
  const cvCleanHash = await sha256Hex(cvTextClean);
  let cvBaseDoc = null;
  let cvStructuredHash = null;
  let cvStructuredStatus = "none";
  let cvStructuredModel = null;
  try {
    const structRes = await ensureCvStructured(env, me.customerId, prof, cvTextClean, lang);
    cvBaseDoc = structRes?.cv_doc || null;
    cvStructuredHash = structRes?.hash || null;
    cvStructuredModel = structRes?.model || null;
    if (structRes?.from_cache) cvStructuredStatus = "cached";
    else if (cvBaseDoc) cvStructuredStatus = "generated";
    else cvStructuredStatus = "missing";
  } catch (e) {
    cvStructuredStatus = "error";
  }
  const baseHash = cvStructuredHash || cvCleanHash;
  const modelPrefForTailor = env.GEMINI_CV_TAILOR_MODELS || env.GEMINI_CV_FINAL_MODELS || env.GEMINI_CV_MODEL_QUALITY || (env.GEMINI_CV_MODEL ? `gemini-2.0-pro,${env.GEMINI_CV_MODEL}` : "gemini-2.0-pro,gemini-2.0-flash");
  const modelListForTailor = parseModelList(modelPrefForTailor);
  const primaryTailorModel = modelListForTailor[0] || "gemini-2.0-pro";
  const modelPrefForHash = modelListForTailor.join(",");
  const promptVersion = "cv_tailor_v3_structured_professional";
  const inputHash = await sha256Hex([
    promptVersion,
    lang,
    template,
    strength,
    descHash || "no_desc_hash",
    baseHash,
    modelPrefForHash || ""
  ].join("|"));
  const cacheRows = await supabaseFetch(
    env,
    `/rest/v1/tailored_cvs?select=id,status,input_hash,output_hash,language,model,prompt_version,template,strength,cv_text,cv_json,ats_keywords_used,ats_keywords_missing,confidence,warnings,error,updated_at,created_at&customer_id=eq.${me.customerId}&job_id=eq.${jobId}&input_hash=eq.${inputHash}&order=updated_at.desc&limit=1`
  );
  const cacheSeconds = Number(env.CV_TAILOR_CACHE_SECONDS || 3600);
  const cached = cacheRows?.[0];
  if (!force && cached && (cached.status === "ok" || cached.status === "ready") && cached.cv_text) {
    const cachedModel = String(cached.model || "").trim();
    const wantModel = String(primaryTailorModel || "").trim();
    const updatedAt = cached.updated_at ? Date.parse(cached.updated_at) : 0;
    const ageSec = updatedAt ? (Date.now() - updatedAt) / 1e3 : Infinity;
    if (ageSec <= cacheSeconds) {
      if (wantModel && cachedModel && cachedModel !== wantModel) {
      } else {
        const cachedCvDoc = cached?.cv_json && typeof cached.cv_json === "object" && cached.cv_json.cv_doc && typeof cached.cv_json.cv_doc === "object" ? cached.cv_json.cv_doc : null;
        return jsonResponse({
          ok: true,
          cached: true,
          cache_age_seconds: Math.round(ageSec),
          result: {
            job_id: jobId,
            template: cached.template || template,
            strength: cached.strength || strength,
            cv_text: cached.cv_text,
            cv_doc: cachedCvDoc,
            ats_keywords_used: cached.ats_keywords_used || [],
            ats_keywords_missing: cached.ats_keywords_missing || [],
            confidence: cached.confidence,
            warnings: cached.warnings || [],
            model: cached.model,
            prompt_version: cached.prompt_version,
            desc_cache_status: descCacheStatus,
            cv_clean_status: cvCleanStatus,
            cv_clean_model: cvCleanModel,
            cv_structured_status: cvStructuredStatus,
            cv_structured_model: cvStructuredModel
          }
        });
      }
    }
  }
  const currentPlan = await getCustomerPlanRow(env, me.customerId);
  const cvAccess = await resolveCvStudioAccess(env, me.customerId, currentPlan);
  if (cvAccess.limit > 0 && cvAccess.remaining <= 0) {
    return jsonResponse(buildCvQuotaExceededBody(cvAccess), 402, request);
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const modelPref = modelPrefForTailor;
  let recordId = cached?.id || null;
  if (recordId) {
    try {
      await supabaseFetch(env, `/rest/v1/tailored_cvs?id=eq.${encodeURIComponent(recordId)}`, {
        method: "PATCH",
        body: {
          status: "generating",
          language: lang,
          model: String(modelPref).split(",")[0].trim(),
          prompt_version: promptVersion,
          template,
          strength,
          error: null,
          updated_at: now
        }
      });
    } catch (_) {
    }
  } else {
    const insRows = await supabaseFetch(env, `/rest/v1/tailored_cvs?on_conflict=customer_id,job_id,input_hash`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: [
        {
          customer_id: me.customerId,
          job_id: jobId,
          status: "generating",
          input_hash: inputHash,
          language: lang,
          model: String(modelPref).split(",")[0].trim(),
          prompt_version: promptVersion,
          template,
          strength,
          updated_at: now,
          created_at: now
        }
      ]
    });
    recordId = insRows?.[0]?.id || null;
  }
  if (!recordId) {
    try {
      const existingRows = await supabaseFetch(
        env,
        `/rest/v1/tailored_cvs?select=id&customer_id=eq.${me.customerId}&job_id=eq.${jobId}&input_hash=eq.${inputHash}&limit=1`
      );
      recordId = existingRows?.[0]?.id || null;
    } catch (_) {
    }
  }
  try {
    let promptText = "";
    if (cvBaseDoc && typeof cvBaseDoc === "object") {
      promptText = buildTailoredCvDocPrompt({
        lang,
        template,
        strength,
        job,
        jobDescription: descText,
        cvBaseDoc
      });
    } else {
      const cvTextSlice = String(cvTextClean || "").slice(0, 12e3);
      promptText = buildTailoredCvPrompt({
        lang,
        job,
        jobDescription: descText,
        cvTextSlice
      });
    }
    const maxOut = Number(
      env.GEMINI_CV_TAILOR_MAX_OUTPUT_TOKENS || env.GEMINI_CV_MAX_OUTPUT_TOKENS || 5600
    );
    const gen = await geminiGenerateJsonWithModels(env, {
      models: modelPref,
      promptText,
      temperature: 0.15,
      maxOutputTokens: maxOut
    });
    const parsed = gen.parsed;
    const usedModel = gen.model;
    let outCvDoc = parsed?.cv_doc && typeof parsed.cv_doc === "object" ? parsed.cv_doc : null;
    let cvTextOut = "";
    if (outCvDoc) {
      if (!outCvDoc.name && cvBaseDoc?.name) outCvDoc.name = cvBaseDoc.name;
      if (!outCvDoc.contact && cvBaseDoc?.contact) outCvDoc.contact = cvBaseDoc.contact;
      if (!outCvDoc.target_role) outCvDoc.target_role = job.title || cvBaseDoc?.target_role || null;
      cvTextOut = renderCvTextFromDoc(outCvDoc, lang);
    } else if (typeof parsed?.cv_text === "string") {
      cvTextOut = normalizeTailoredCvText(parsed.cv_text, lang);
    }
    if (!cvTextOut || cvTextOut.length < 60) {
      throw new Error("Model returned an empty or too short CV");
    }
    const outputHash = await sha256Hex(cvTextOut);
    const warnSet = /* @__PURE__ */ new Set();
    const warnings = [];
    for (const w of [...Array.isArray(parsed?.warnings) ? parsed.warnings : [], ...cleanWarnings, ...jobDescWarnings]) {
      const ww = String(w || "").trim();
      if (!ww) continue;
      if (warnSet.has(ww)) continue;
      warnSet.add(ww);
      warnings.push(ww);
      if (warnings.length >= 25) break;
    }
    const rowPatch = {
      status: "ok",
      output_hash: outputHash,
      language: lang,
      model: usedModel,
      prompt_version: promptVersion,
      template,
      strength,
      cv_text: cvTextOut,
      cv_json: {
        ...parsed && typeof parsed === "object" ? parsed : {},
        template,
        strength,
        cv_doc: outCvDoc,
        meta: {
          cv_clean_status: cvCleanStatus,
          cv_clean_model: cvCleanModel,
          cv_structured_status: cvStructuredStatus,
          cv_structured_model: cvStructuredModel,
          desc_cache_status: descCacheStatus
        }
      },
      ats_keywords_used: Array.isArray(parsed?.ats_keywords_used) ? parsed.ats_keywords_used.slice(0, 250) : [],
      ats_keywords_missing: Array.isArray(parsed?.ats_keywords_missing) ? parsed.ats_keywords_missing.slice(0, 250) : [],
      confidence: typeof parsed?.confidence === "number" ? parsed.confidence : null,
      warnings: warnings.length ? warnings : null,
      error: null,
      updated_at: now
    };
    if (recordId) {
      await supabaseFetch(env, `/rest/v1/tailored_cvs?id=eq.${recordId}`, {
        method: "PATCH",
        body: rowPatch
      });
    } else {
      await supabaseFetch(
        env,
        `/rest/v1/tailored_cvs?customer_id=eq.${me.customerId}&job_id=eq.${jobId}&input_hash=eq.${inputHash}`,
        { method: "PATCH", body: rowPatch }
      );
    }
    return jsonResponse({
      ok: true,
      cached: false,
      result: {
        job_id: jobId,
        template,
        strength,
        cv_text: cvTextOut,
        cv_doc: outCvDoc,
        ats_keywords_used: rowPatch.ats_keywords_used,
        ats_keywords_missing: rowPatch.ats_keywords_missing,
        confidence: rowPatch.confidence,
        warnings,
        model: usedModel,
        prompt_version: promptVersion,
        desc_cache_status: descCacheStatus,
        cv_clean_status: cvCleanStatus,
        cv_clean_model: cvCleanModel,
        cv_structured_status: cvStructuredStatus,
        cv_structured_model: cvStructuredModel
      }
    });
  } catch (err) {
    const msg = String(err?.message || err || "CV tailoring failed");
    if (recordId) {
      await supabaseFetch(env, `/rest/v1/tailored_cvs?id=eq.${recordId}`, {
        method: "PATCH",
        body: { status: "error", error: msg, updated_at: now }
      });
    } else {
      try {
        await supabaseFetch(
          env,
          `/rest/v1/tailored_cvs?customer_id=eq.${me.customerId}&job_id=eq.${jobId}&input_hash=eq.${inputHash}`,
          { method: "PATCH", body: { status: "error", error: msg, updated_at: now } }
        );
      } catch (_) {
      }
    }
    return jsonResponse({ ok: false, error: msg }, 502);
  }
}
__name(handleMeCvTailor, "handleMeCvTailor");
async function handleMeCvTailorFromText(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const jobDescription = String(body.job_description || body.description || body.job_desc || "").trim();
  if (!jobDescription || jobDescription.length < 80) {
    return jsonResponse({ ok: false, error: "job_description is required (min 80 characters)." }, 400, request);
  }
  if (jobDescription.length > 6e4) {
    return jsonResponse({ ok: false, error: "job_description is too long (max 60000 characters)." }, 400, request);
  }
  try {
    const importedJob = await ensureCvStudioImportedJob(env, me.customerId, {
      jobDescription,
      jobTitle: body.job_title || body.title || "",
      companyName: body.company_name || body.company || "",
      applyUrl: body.apply_url || "",
      languageHint: body.language_hint || body.language || body.lang || "auto"
    });
    const forwardedBody = {
      job_id: importedJob.id,
      template: body.template,
      strength: body.strength,
      force: Boolean(body.force)
    };
    const forwarded = new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(forwardedBody)
    });
    return await handleMeCvTailor(forwarded, env);
  } catch (err) {
    return jsonResponse({
      ok: false,
      error: String(err?.message || err || "Failed to import pasted job description")
    }, 502, request);
  }
}
__name(handleMeCvTailorFromText, "handleMeCvTailorFromText");
async function handleMeJobsOcrImage(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  const ct = String(request.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("multipart/form-data")) {
    return jsonResponse({ ok: false, error: "Expected multipart/form-data" }, 400, request);
  }
  const fd = await request.formData();
  const file = fd.get("image") || fd.get("screenshot") || fd.get("file");
  if (!file || typeof file === "string") {
    return jsonResponse({ ok: false, error: "Missing image field ('image' or 'screenshot')." }, 400, request);
  }
  const size = Number(file.size || 0);
  if (!Number.isFinite(size) || size <= 0) {
    return jsonResponse({ ok: false, error: "Empty image file." }, 400, request);
  }
  if (size > getOcrMaxImageBytes(env)) {
    return jsonResponse({ ok: false, error: "Image file too large.", max_bytes: getOcrMaxImageBytes(env) }, 413, request);
  }
  let mime = String(file.type || "").trim().toLowerCase();
  if (!mime) mime = inferImageMimeFromName(file.name);
  if (!ALLOWED_OCR_IMAGE_MIME.has(mime)) {
    return jsonResponse({ ok: false, error: "Unsupported image type. Use PNG, JPG, or WEBP." }, 400, request);
  }
  try {
    const bytes = await file.arrayBuffer();
    const accessToken = await getGcpAccessTokenCached(env);
    const out = await visionExtractTextFromImage(env, accessToken, {
      bytes,
      mimeType: mime,
      languageHints: [
        String(fd.get("language_hint") || "").trim(),
        "en",
        "de"
      ]
    });
    const text = String(out?.text || "").trim();
    if (!text || text.length < 40) {
      return jsonResponse({
        ok: false,
        error: "We could not extract enough text from that screenshot. Try a clearer screenshot or paste the job description."
      }, 422, request);
    }
    return jsonResponse({
      ok: true,
      text,
      pages: out?.pages ?? null,
      mime,
      size,
      filename: safeFileName(file.name || "job-screenshot")
    }, 200, request);
  } catch (err) {
    return jsonResponse({
      ok: false,
      error: String(err?.message || err || "Failed to extract text from screenshot")
    }, 502, request);
  }
}
__name(handleMeJobsOcrImage, "handleMeJobsOcrImage");
function prettyKeywordForCv(keyword, lang) {
  const raw = String(keyword || "").trim();
  if (!raw) return "";
  const low = raw.toLowerCase();
  const map = {
    "sql": "SQL",
    "nosql": "NoSQL",
    "api": "API",
    "apis": "APIs",
    "rest": "REST",
    "graphql": "GraphQL",
    "aws": "AWS",
    "gcp": "GCP",
    "azure": "Azure",
    "sap": "SAP",
    "crm": "CRM",
    "erp": "ERP",
    "kpi": "KPI",
    "okrs": "OKRs",
    "okr": "OKR",
    "etl": "ETL",
    "ml": "ML",
    "ai": "AI",
    "ui": "UI",
    "ux": "UX",
    "seo": "SEO",
    "sem": "SEM",
    "ppc": "PPC",
    "jira": "Jira",
    "confluence": "Confluence",
    "scrum": "Scrum",
    "agile": "Agile",
    "kanban": "Kanban",
    "ci/cd": "CI/CD",
    "ci": "CI",
    "cd": "CD",
    "git": "Git",
    "github": "GitHub",
    "gitlab": "GitLab",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "power bi": "Power BI",
    "powerbi": "Power BI",
    "tableau": "Tableau",
    "excel": "Excel",
    "ms excel": "MS Excel",
    "microsoft excel": "Microsoft Excel",
    "python": "Python",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "node.js": "Node.js",
    "react": "React",
    "next.js": "Next.js",
    "c++": "C++",
    "c#": "C#",
    "java": "Java"
  };
  if (map[low]) return map[low];
  if (/[A-Z]/.test(raw) || /[0-9]/.test(raw) || /[\/+#&]/.test(raw)) return raw;
  if (lang === "de") {
    const parts2 = low.split(/\s+/g).filter(Boolean).slice(0, 6);
    const out2 = parts2.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
    return out2 || raw;
  }
  const stop = /* @__PURE__ */ new Set(["and", "or", "of", "to", "in", "for", "with", "on"]);
  const parts = low.split(/\s+/g).filter(Boolean).slice(0, 6);
  const out = parts.map((p, i) => {
    if (i > 0 && stop.has(p)) return p;
    return p.charAt(0).toUpperCase() + p.slice(1);
  }).join(" ");
  return out || raw;
}
__name(prettyKeywordForCv, "prettyKeywordForCv");
function isToolKeyword(keyword) {
  const k = String(keyword || "").toLowerCase().trim();
  if (!k) return false;
  const toolTokens = [
    "sql",
    "excel",
    "power bi",
    "tableau",
    "lookr",
    "looker",
    "sap",
    "workday",
    "jira",
    "confluence",
    "python",
    "r ",
    "r/",
    "aws",
    "azure",
    "gcp",
    "google cloud",
    "bigquery",
    "snowflake",
    "dbt",
    "airflow",
    "superset",
    "zendesk",
    "salesforce",
    "hubspot",
    "microsoft",
    "sharepoint",
    "figma",
    "notion",
    "slack",
    "github",
    "git",
    "docker",
    "kubernetes",
    "postgres",
    "mysql",
    "mariadb"
  ];
  for (const t of toolTokens) {
    const needle = t.trim();
    if (!needle) continue;
    if (needle.length <= 2) continue;
    if (k === needle) return true;
    if (k.includes(needle)) return true;
  }
  if (/^[A-Z0-9]{2,8}$/.test(String(keyword || "").trim())) return true;
  return false;
}
__name(isToolKeyword, "isToolKeyword");
function isAudienceKeyword(keyword) {
  const k = String(keyword || "").toLowerCase().trim();
  if (!k) return false;
  return /\b(stakeholder|stakeholders|leadership|executive|executives|client|clients|customer|customers|partner|partners|supplier|suppliers|vendor|vendors|investor|investors|user|users|founder|founders|manager|managers|team|teams|board|boards)\b/.test(k);
}
__name(isAudienceKeyword, "isAudienceKeyword");
function isProcessLikeKeyword(keyword) {
  const k = String(keyword || "").toLowerCase().trim();
  if (!k) return false;
  return /\b(requirements gathering|requirements analysis|process mapping|process improvement|forecasting|planning|governance|documentation|facilitation|storytelling|communication|workshop facilitation|change management|prioritization|prioritisation|collaboration|coordination|stakeholder management|data governance|scenario planning|demand planning|root cause analysis|financial modeling|financial modelling|cost modeling|cost modelling)\b/.test(k);
}
__name(isProcessLikeKeyword, "isProcessLikeKeyword");
function keywordRewriteStyle(keyword, lang) {
  const raw = String(keyword || "").trim();
  const low = raw.toLowerCase();
  const kwPretty = prettyKeywordForCv(raw, lang) || raw;
  const kwSentence = lang === "en" && !isToolKeyword(raw) && !/^[A-Z0-9]{2,8}$/.test(raw) ? low : kwPretty;
  if (isToolKeyword(raw)) {
    return {
      category: "tool",
      preferredClause: lang === "de" ? `unter Einsatz von ${kwPretty}` : `using ${kwPretty}`,
      promptLines: [
        "This keyword is a tool, technology, or hard-skill term.",
        "Integrate it into how the work was done, not as a loose ending or parenthetical.",
        `Good pattern: "${lang === "de" ? `unter Einsatz von ${kwPretty}` : `using ${kwPretty}`}".`
      ]
    };
  }
  if (isProcessLikeKeyword(raw)) {
    const preferredClause = lang === "de" ? /\b(management|governance|collaboration|coordination)\b/.test(low) ? `durch ${kwPretty}` : `f\xFCr ${kwPretty}` : /\b(management|governance|collaboration|coordination)\b/.test(low) ? `through ${kwSentence}` : `for ${kwSentence}`;
    return {
      category: "process",
      preferredClause,
      promptLines: [
        "This keyword describes a process, method, or capability.",
        "Integrate it into the main clause as part of how the work was done.",
        "If the bullet already has a result clause, place the keyword before that result clause when possible."
      ]
    };
  }
  if (isAudienceKeyword(raw)) {
    let preferredClause = lang === "de" ? `f\xFCr ${kwPretty}` : `for ${kwSentence}`;
    if (lang === "en" && /\bstakeholders?\b/.test(low)) preferredClause = "for key stakeholders";
    if (lang === "de" && /\bstakeholders?\b/.test(low)) preferredClause = "f\xFCr relevante Stakeholder";
    return {
      category: "audience",
      preferredClause,
      promptLines: [
        "This keyword refers to people, audiences, or stakeholder groups.",
        "Integrate it into who the work supported or collaborated with, ideally near the main action.",
        `Good pattern: "${preferredClause}". Bad pattern: a loose ending like "${lang === "de" ? "..., und relevante Stakeholder informiert." : "..., and informing key stakeholders."}".`
      ]
    };
  }
  return {
    category: "general",
    preferredClause: lang === "de" ? `mit Fokus auf ${kwPretty}` : `with a focus on ${kwSentence}`,
    promptLines: [
      "Integrate the keyword into the main clause, not as a trailing add-on or parenthetical.",
      "If the bullet has a result clause such as 'resulting in' or 'leading to', place the keyword before that clause when possible."
    ]
  };
}
__name(keywordRewriteStyle, "keywordRewriteStyle");
function escapeRegExp(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
__name(escapeRegExp, "escapeRegExp");
function normalizeBulletTextLine(text) {
  let out = String(text || "");
  out = out.replace(/^[\s\-–—•·∙●▪◦]+\s*/g, "");
  out = out.replace(/\s+/g, " ").trim();
  return out;
}
__name(normalizeBulletTextLine, "normalizeBulletTextLine");
function keywordRegexForReplace(keyword) {
  const k = String(keyword || "").trim();
  if (!k) return null;
  const simple = /^[A-Za-z0-9ÄÖÜäöüßẞ\s]+$/.test(k);
  const pattern = simple ? `\\b${escapeRegExp(k)}\\b` : escapeRegExp(k);
  try {
    return new RegExp(pattern, "ig");
  } catch {
    return null;
  }
}
__name(keywordRegexForReplace, "keywordRegexForReplace");
function replaceKeywordCaseInsensitive(text, keyword, replacement) {
  const re = keywordRegexForReplace(keyword);
  if (!re) return text;
  return String(text || "").replace(re, String(replacement || ""));
}
__name(replaceKeywordCaseInsensitive, "replaceKeywordCaseInsensitive");
function fixAwkwardByKeywordEnglish(text, keyword, keywordForSentence) {
  let out = String(text || "");
  const k = String(keyword || "").trim();
  if (!k) return out;
  const kEsc = escapeRegExp(k);
  try {
    const reTo = new RegExp(`\\s+by\\s+${kEsc}\\s+to\\s+`, "i");
    if (reTo.test(out)) {
      out = out.replace(reTo, `, including ${keywordForSentence}, to `);
    }
  } catch {
  }
  try {
    const re = new RegExp(`\\s+by\\s+${kEsc}\\b`, "i");
    if (re.test(out)) {
      out = out.replace(re, `, including ${keywordForSentence}`);
    }
  } catch {
  }
  out = out.replace(/,,+/g, ",");
  out = out.replace(/\s+,/g, ",");
  out = out.replace(/,\s+/g, ", ");
  out = out.replace(/\s+\./g, ".").trim();
  return out;
}
__name(fixAwkwardByKeywordEnglish, "fixAwkwardByKeywordEnglish");
function hasWeakTrailingKeywordClause(text, keyword) {
  const out = normalizeBulletTextLine(text).toLowerCase();
  const k = String(keyword || "").trim().toLowerCase();
  if (!out || !k || !out.includes(k)) return false;
  const idx = out.lastIndexOf(k);
  if (idx < 0) return false;
  if (out.length - idx > 72) return false;
  const left = out.slice(Math.max(0, idx - 44), idx);
  if (/\(\s*$/.test(left)) return true;
  if (/\b(and|including|with|covering|informing|supporting|briefing|updating|engaging|serving|plus)\s+(key\s+|senior\s+|relevant\s+|cross-functional\s+)?$/.test(left)) {
    return true;
  }
  if (!isToolKeyword(keyword) && /,\s*[^,]{0,26}$/.test(left)) return true;
  return false;
}
__name(hasWeakTrailingKeywordClause, "hasWeakTrailingKeywordClause");
function fixWeakKeywordTailEnglish(text, keyword, preferredClause) {
  let out = String(text || "");
  const k = String(keyword || "").trim().toLowerCase();
  const clause = String(preferredClause || "").trim();
  if (!out || !k || !clause) return out;
  if (isAudienceKeyword(keyword)) {
    try {
      const reResult = /^(.*?)(,\s*(?:resulting in|leading to|driving|delivering|creating)\b.*?)(?:\s+and\s+(?:informing|supporting|briefing|updating|engaging|serving)\s+[^.]+)\.?$/i;
      const match = out.match(reResult);
      if (match && String(match[0] || "").toLowerCase().includes(k)) {
        out = `${String(match[1] || "").trim()} ${clause}${String(match[2] || "").trim()}`;
      }
    } catch {
    }
  }
  try {
    const weakTailRe = /(?:,?\s*and\s+(?:informing|supporting|briefing|updating|engaging|serving)|,?\s*including)\s+[^.]+\.?$/i;
    const tailMatch = out.match(weakTailRe);
    if (tailMatch && String(tailMatch[0] || "").toLowerCase().includes(k)) {
      out = out.replace(weakTailRe, ` ${clause}.`);
    }
  } catch {
  }
  out = out.replace(/,,+/g, ",");
  out = out.replace(/\s+,/g, ",");
  out = out.replace(/,\s+/g, ", ");
  out = out.replace(/\s+\./g, ".").trim();
  if (out && !/[.!?]$/.test(out)) out += ".";
  return out;
}
__name(fixWeakKeywordTailEnglish, "fixWeakKeywordTailEnglish");
function ensureKeywordPresentNaturally(text, keyword, lang) {
  let out = normalizeBulletTextLine(text);
  const kLow = String(keyword || "").toLowerCase().trim();
  if (!out || !kLow || out.toLowerCase().includes(kLow)) return out;
  const style = keywordRewriteStyle(keyword, lang);
  const clause = String(style?.preferredClause || "").trim();
  if (!clause) return out;
  out = out.replace(/[.!?]\s*$/, "").trim();
  if (!out) return clause;
  try {
    const resultRe = /^(.*?)(,\s*(?:resulting in|leading to|driving|delivering|creating)\b.*)$/i;
    if (resultRe.test(out)) {
      return out.replace(resultRe, (_m, main, result) => {
        const lead = String(main || "").trim().replace(/[,\s]+$/, "");
        const joiner2 = /^(for|with|through)\b/i.test(clause) ? " " : ", ";
        return `${lead}${joiner2}${clause}${String(result || "")}`;
      }) + ".";
    }
  } catch {
  }
  const joiner = /[,;:]\s*$/.test(out) ? " " : ", ";
  return `${out}${joiner}${clause}.`;
}
__name(ensureKeywordPresentNaturally, "ensureKeywordPresentNaturally");
function postProcessKeywordSuggestBullet(text, keyword, lang) {
  let out = normalizeBulletTextLine(text);
  const kRaw = String(keyword || "").trim();
  if (!kRaw) return out;
  const kwPretty = prettyKeywordForCv(kRaw, lang);
  const style = keywordRewriteStyle(kRaw, lang);
  if (isToolKeyword(kRaw) || /^[A-Z0-9]{2,8}$/.test(kRaw.trim()) || lang === "de") {
    out = replaceKeywordCaseInsensitive(out, kRaw, kwPretty);
  }
  if (lang === "en") {
    const kwForSentence = isToolKeyword(kRaw) || /^[A-Z0-9]{2,8}$/.test(kRaw.trim()) ? kwPretty : kRaw.toLowerCase();
    out = fixAwkwardByKeywordEnglish(out, kRaw, kwForSentence);
    out = fixWeakKeywordTailEnglish(out, kRaw, style.preferredClause);
  }
  return out;
}
__name(postProcessKeywordSuggestBullet, "postProcessKeywordSuggestBullet");
function shouldPolishKeywordSuggestBullet(text, keyword, lang) {
  const out = String(text || "").trim();
  const k = String(keyword || "").trim();
  if (!out || !k) return false;
  const outLow = out.toLowerCase();
  const kLow = k.toLowerCase();
  const kwPrettyLow = prettyKeywordForCv(k, lang).toLowerCase();
  if (outLow.includes(`(${kLow})`) || outLow.includes(`(${kwPrettyLow})`)) return true;
  if (lang === "en") {
    try {
      const re = new RegExp(`\\bby\\s+${escapeRegExp(kLow)}\\b`, "i");
      if (re.test(outLow)) return true;
    } catch {
    }
  }
  if (hasWeakTrailingKeywordClause(out, k)) return true;
  if (out.length < 12) return true;
  return false;
}
__name(shouldPolishKeywordSuggestBullet, "shouldPolishKeywordSuggestBullet");
async function aiRewriteBulletWithKeyword(env, { models, lang, keyword, currentBullet, context }) {
  const promptText = buildKeywordInsertPrompt({
    mode: "rewrite",
    lang,
    keyword,
    currentBullet: String(currentBullet || "").slice(0, 520),
    note: "",
    context: context && typeof context === "object" ? context : {}
  });
  const gen = await geminiGenerateJsonWithModels(env, {
    models,
    promptText,
    temperature: 0.25,
    maxOutputTokens: 260
  });
  const parsed = gen?.parsed || {};
  let out = String(parsed.output || parsed.text || parsed.bullet || parsed.rewritten_bullet || "").trim();
  out = postProcessKeywordSuggestBullet(out, keyword, lang);
  const kLow = String(keyword || "").toLowerCase();
  if (out && kLow && !out.toLowerCase().includes(kLow)) {
    out = ensureKeywordPresentNaturally(out, keyword, lang);
  }
  if (out.length > 280) {
    out = out.slice(0, 280).trim();
    out = out.replace(/\s+\S*$/, "").trim();
  }
  return out;
}
__name(aiRewriteBulletWithKeyword, "aiRewriteBulletWithKeyword");
function buildKeywordInsertPrompt({ mode, lang, keyword, currentBullet, note, context }) {
  const language = lang === "de" ? "German" : "English";
  const ctx = context && typeof context === "object" ? context : {};
  const avoidRewrites = Array.isArray(ctx.avoid_rewrites) ? ctx.avoid_rewrites.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 8) : [];
  const variation = Number(ctx.variation || ctx.rewrite_attempt || 0) || 0;
  const ctxSlim = {
    role_title: String(ctx.role_title || "").trim(),
    company: String(ctx.company || "").trim(),
    job_title: String(ctx.job_title || "").trim(),
    job_company: String(ctx.job_company || "").trim(),
    variation: variation || null,
    require_distinct: !!ctx.require_distinct
  };
  const kwRaw = String(keyword || "").trim();
  const kw = prettyKeywordForCv(kwRaw, lang);
  const style = keywordRewriteStyle(kwRaw, lang);
  const hard = [
    "- Output must be ONE bullet text line (no leading dash).",
    `- Write the output in ${language}.`,
    "- Do NOT invent facts. No new tools, employers, dates, degrees, certifications, or metrics.",
    "- Do NOT add numbers unless they already exist in the input bullet or in the user note.",
    "- The keyword must appear in the output (case may be adjusted).",
    "- Keep it concise (ideally <= 180 characters).",
    "- Avoid generic filler like 'responsible for' when possible (use clear action verbs).",
    "- Integrate the keyword into the sentence naturally instead of tacking it onto the end.",
    "- If the bullet already contains a result clause like 'resulting in' or 'leading to', place the keyword before that result clause when possible.",
    "- Avoid parenthetical keyword add-ons unless absolutely necessary."
  ];
  if (mode === "rewrite") {
    hard.push("- REWRITE mode: keep meaning and facts identical to the input bullet; only rephrase to naturally include the keyword.");
    if (ctx.require_distinct || avoidRewrites.length || variation > 1) {
      hard.push("- Generate a materially different rewrite from the blocked alternatives below. Do NOT return the same sentence with only trivial punctuation or casing changes.");
      hard.push("- Change clause order, sentence rhythm, or integration point while preserving the same facts.");
    }
  } else {
    hard.push("- NEW mode: create the bullet ONLY from the user note. Do not add details beyond the note.");
  }
  return [
    "Return ONLY valid JSON. No markdown. No code fences. No commentary.",
    "",
    "Schema:",
    '{ "output": string }',
    "",
    "Hard rules:",
    ...hard,
    "",
    "Keyword integration guidance:",
    ...Array.isArray(style?.promptLines) && style.promptLines.length ? style.promptLines : ["Integrate the keyword into the main clause rather than as a loose ending."],
    "",
    "Context (tone only, not facts):",
    JSON.stringify(ctxSlim),
    "",
    ...avoidRewrites.length ? [
      "Blocked rewrites (must differ clearly from these):",
      JSON.stringify(avoidRewrites),
      ""
    ] : [],
    "MODE:",
    String(mode || "").toUpperCase(),
    "KEYWORD:",
    kw,
    "",
    "INPUT_BULLET:",
    String(currentBullet || "").trim(),
    "",
    "USER_NOTE:",
    String(note || "").trim(),
    "",
    "Now output JSON only."
  ].join("\n");
}
__name(buildKeywordInsertPrompt, "buildKeywordInsertPrompt");
function slimStringArray(arr, maxItems = 30, maxLen = 90) {
  if (!Array.isArray(arr)) return [];
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const item of arr) {
    const s = String(item || "").trim();
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s.length > maxLen ? s.slice(0, maxLen) : s);
    if (out.length >= maxItems) break;
  }
  return out;
}
__name(slimStringArray, "slimStringArray");
function tokenizeSimpleForScore(s) {
  const t = String(s || "").toLowerCase();
  return t.replace(/[^a-z0-9äöüß]+/g, " ").trim().split(/\s+/).filter(Boolean);
}
__name(tokenizeSimpleForScore, "tokenizeSimpleForScore");
function scoreForKeyword(text, keyword) {
  const a = tokenizeSimpleForScore(text);
  const k = tokenizeSimpleForScore(keyword);
  if (!a.length || !k.length) return 0;
  const set = new Set(a);
  let score = 0;
  for (const w of k) {
    if (set.has(w)) score += 2;
  }
  const kw = String(keyword || "").toLowerCase().trim();
  if (kw && String(text || "").toLowerCase().includes(kw)) score += 5;
  const len = String(text || "").length;
  if (len >= 40 && len <= 160) score += 1;
  return score;
}
__name(scoreForKeyword, "scoreForKeyword");
function buildKeywordSuggestPrompt({ lang, keyword, bulletCandidates, skillGroups, skillAdditional, context }) {
  const languageName = String(lang || "").toLowerCase().startsWith("de") ? "German" : "English";
  const kwRaw = String(keyword || "").trim();
  const kw = prettyKeywordForCv(kwRaw, lang);
  const style = keywordRewriteStyle(kwRaw, lang);
  const ctx = context && typeof context === "object" ? context : {};
  const ctxSlim = {
    target_language: String(ctx?.target_language || ctx?.lang || lang || "").trim(),
    job_title: String(ctx?.job?.title || ctx?.job_title || "").trim(),
    job_company: String(ctx?.job?.company_name || ctx?.job_company || "").trim()
  };
  const rules = [
    "Return ONLY valid JSON. No markdown. No code fences. No commentary.",
    `Write output in ${languageName}.`,
    "Do NOT invent facts.",
    "You may ONLY rewrite ONE provided bullet. Keep meaning, scope, and facts identical.",
    "If the keyword is a tool, software, certification, methodology, or hard skill, prefer placing it under Skills.",
    "If the keyword is a responsibility/process, prefer Experience only if it fits naturally without changing meaning.",
    "For Experience rewrites: use natural grammar. Avoid awkward patterns like 'by <keyword>' for noun phrases; prefer 'including/with/covering' or integrate as a clause.",
    "If the bullet already contains a result clause like 'resulting in' or 'leading to', place the keyword before that result clause when possible.",
    "Do NOT tack the keyword onto the end as a loose clause or parenthetical if a more natural integration is possible.",
    "The keyword must appear in the rewritten bullet OR the suggested skill item.",
    "If nothing fits well, choose Skills and suggest adding the keyword as a skill item."
  ];
  const schema = {
    target: "experience|skills",
    exp_index: "number|null",
    bullet_index: "number|null",
    rewritten_bullet: "string|null",
    skill_group: "string|null",
    skill_item: "string|null",
    reason: "string",
    confidence: "number (0..1)"
  };
  return [
    ...rules,
    "",
    "Schema (types):",
    JSON.stringify(schema),
    "",
    "Context:",
    JSON.stringify(ctxSlim),
    "",
    "Keyword integration guidance:",
    JSON.stringify(style?.promptLines || []),
    "",
    "KEYWORD:",
    kw,
    "",
    "Experience bullet candidates (pick at most one):",
    JSON.stringify(bulletCandidates || []),
    "",
    "Skills groups:",
    JSON.stringify(skillGroups || []),
    "",
    "Skills additional:",
    JSON.stringify(skillAdditional || []),
    "",
    "Now output JSON only."
  ].join("\n");
}
__name(buildKeywordSuggestPrompt, "buildKeywordSuggestPrompt");
function buildKeywordSuggestForceExperiencePrompt({ lang, keyword, bulletCandidates, context }) {
  const languageName = String(lang || "").toLowerCase().startsWith("de") ? "German" : "English";
  const kwRaw = String(keyword || "").trim();
  const kw = prettyKeywordForCv(kwRaw, lang);
  const style = keywordRewriteStyle(kwRaw, lang);
  const ctx = context && typeof context === "object" ? context : {};
  const ctxSlim = {
    target_language: String(ctx.target_language || ctx.lang || "").slice(0, 8),
    role_title: String(ctx.role_title || "").slice(0, 80),
    company: String(ctx.company || "").slice(0, 80),
    job_title: String(ctx.job_title || "").slice(0, 80),
    job_company: String(ctx.job_company || "").slice(0, 80)
  };
  return [
    `You are a CV writing assistant. You MUST recommend an EXPERIENCE bullet to rewrite (not Skills).`,
    `Your job: integrate the keyword truthfully into an existing bullet without adding new facts.`,
    `Language: ${languageName}.`,
    ``,
    `Keyword to add: "${kw}"`,
    ``,
    `Candidate bullets (choose ONE best):`,
    JSON.stringify(bulletCandidates || [], null, 2),
    ``,
    `Context (may help; do not invent new info):`,
    JSON.stringify(ctxSlim, null, 2),
    ``,
    `Rules:`,
    `- Keep the original meaning of the chosen bullet.`,
    `- Do NOT add new tools, numbers, achievements, employers, or responsibilities not already implied.`,
    `- Make it sound natural and ATS-friendly.`,
    `- Avoid awkward phrasing like "by <keyword>" for noun phrases. Prefer "including/with/covering" (EN) or "einschlie\xDFlich/mit" (DE).`,
    `- If the bullet already contains a result clause like "resulting in" or "leading to", place the keyword before that result clause when possible.`,
    `- Do NOT tack the keyword onto the end as a loose afterthought or parenthetical.`,
    ...Array.isArray(style?.promptLines) && style.promptLines.length ? style.promptLines.map((line) => `- ${line}`) : [],
    `- Output MUST be valid JSON only.`,
    ``,
    `Return JSON with keys exactly:`,
    `{`,
    `  "target": "experience",`,
    `  "exp_index": number,`,
    `  "bullet_index": number,`,
    `  "rewritten_bullet": string,`,
    `  "reason": string,`,
    `  "confidence": number`,
    `}`
  ].join("\n");
}
__name(buildKeywordSuggestForceExperiencePrompt, "buildKeywordSuggestForceExperiencePrompt");
async function handleMeCvKeywordSuggest(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const keyword = String(body.keyword || "").trim();
  if (!keyword || keyword.length < 2) {
    return jsonResponse({ ok: false, error: "keyword is required" }, 400);
  }
  let lang = String(body.language || body.lang || "").trim().toLowerCase();
  if (!lang || lang === "auto") {
    lang = String(body?.context?.target_language || body?.context?.lang || "").trim().toLowerCase();
  }
  if (!lang.startsWith("de")) lang = "en";
  if (lang.startsWith("de")) lang = "de";
  const cvDoc = body.cv_doc && typeof body.cv_doc === "object" ? body.cv_doc : body.cvDoc && typeof body.cvDoc === "object" ? body.cvDoc : body.cv && typeof body.cv === "object" ? body.cv : null;
  if (!cvDoc) {
    return jsonResponse({ ok: false, error: "cv_doc is required" }, 400);
  }
  const exp = Array.isArray(cvDoc.experience) ? cvDoc.experience : [];
  const rawCandidates = [];
  exp.forEach((e, exp_index) => {
    const title = String(e?.title || "").trim();
    const company = String(e?.company || "").trim();
    const role = [title, company].filter(Boolean).join(" \u2014 ").slice(0, 120);
    const bullets = Array.isArray(e?.bullets) ? e.bullets : [];
    bullets.forEach((b, bullet_index) => {
      const bullet = String(b || "").trim();
      if (!bullet) return;
      rawCandidates.push({
        exp_index,
        bullet_index,
        role,
        bullet: bullet.length > 260 ? bullet.slice(0, 260) : bullet
      });
    });
  });
  const scored = rawCandidates.map((c) => ({ ...c, __score: scoreForKeyword(`${c.role} ${c.bullet}`, keyword) })).sort((a, b) => (b.__score || 0) - (a.__score || 0));
  const bulletCandidates = scored.slice(0, 28).map(({ __score, ...rest }) => rest);
  const skills = cvDoc.skills && typeof cvDoc.skills === "object" ? cvDoc.skills : {};
  const groups = Array.isArray(skills.groups) ? skills.groups : [];
  const skillGroups = groups.slice(0, 12).map((g, idx) => ({
    group: `group:${idx}`,
    label: String(g?.label || "").trim().slice(0, 60),
    items: slimStringArray(g?.items, 18, 80)
  }));
  const skillAdditional = slimStringArray(skills.additional, 40, 80);
  const promptText = buildKeywordSuggestPrompt({
    lang,
    keyword,
    bulletCandidates,
    skillGroups,
    skillAdditional,
    context: body.context || {}
  });
  const models = env.GEMINI_CV_KEYWORD_MODELS || env.GEMINI_CV_FINAL_MODELS || env.GEMINI_CV_MODEL_QUALITY || (env.GEMINI_CV_MODEL ? `gemini-2.0-pro,${env.GEMINI_CV_MODEL}` : "gemini-2.0-pro,gemini-2.0-flash");
  try {
    const gen = await geminiGenerateJsonWithModels(env, {
      models,
      promptText,
      temperature: 0.2,
      maxOutputTokens: 320
    });
    const parsed = gen?.parsed || {};
    const target = String(parsed.target || parsed.where || parsed.section || "").toLowerCase();
    const exp_index = parsed.exp_index ?? parsed.expIdx ?? parsed.experience_index ?? null;
    const bullet_index = parsed.bullet_index ?? parsed.bulletIdx ?? null;
    const rewritten_bullet = parsed.rewritten_bullet || parsed.rewrite || parsed.bullet || parsed.text || null;
    const skill_group = parsed.skill_group || parsed.skillGroup || null;
    const skill_item = parsed.skill_item || parsed.skillItem || null;
    const reason = String(parsed.reason || parsed.rationale || "").trim();
    const confidenceRaw = parsed.confidence ?? parsed.confidence_score ?? null;
    const confidence = typeof confidenceRaw === "number" && confidenceRaw >= 0 && confidenceRaw <= 1 ? confidenceRaw : null;
    let reco = {
      target: target === "experience" ? "experience" : "skills",
      exp_index: typeof exp_index === "number" ? exp_index : null,
      bullet_index: typeof bullet_index === "number" ? bullet_index : null,
      rewritten_bullet: typeof rewritten_bullet === "string" ? rewritten_bullet.trim() : null,
      skill_group: typeof skill_group === "string" ? skill_group.trim() : null,
      skill_item: typeof skill_item === "string" ? skill_item.trim() : null,
      reason: reason || "",
      confidence
    };
    const kwPretty = prettyKeywordForCv(keyword, lang);
    const kwNeedle = String(keyword || "").toLowerCase();
    if (reco.target === "experience") {
      const okIdx = typeof reco.exp_index === "number" && typeof reco.bullet_index === "number" && rawCandidates.some((c) => c.exp_index === reco.exp_index && c.bullet_index === reco.bullet_index);
      if (!okIdx || !reco.rewritten_bullet) {
        reco.target = "skills";
      }
    }
    if (reco.target === "experience") {
      let out = String(reco.rewritten_bullet || "").trim();
      if (out && !out.toLowerCase().includes(kwNeedle)) {
        out = ensureKeywordPresentNaturally(out, keyword, lang);
      }
      reco.rewritten_bullet = out ? out.slice(0, 280) : null;
      reco.skill_group = null;
      reco.skill_item = null;
    } else {
      const group = String(reco.skill_group || "additional").trim();
      reco.skill_group = group === "additional" || group.startsWith("group:") ? group : "additional";
      reco.skill_item = String(reco.skill_item || kwPretty).trim().slice(0, 80) || kwPretty;
      if (!reco.skill_item.toLowerCase().includes(kwNeedle)) {
        reco.skill_item = kwPretty;
      }
      reco.exp_index = null;
      reco.bullet_index = null;
      reco.rewritten_bullet = null;
    }
    if (reco.target === "skills" && !isToolKeyword(keyword) && bulletCandidates.length) {
      try {
        const forcedPrompt = buildKeywordSuggestForceExperiencePrompt({
          lang,
          keyword,
          bulletCandidates: bulletCandidates.slice(0, 18),
          context: body.context || {}
        });
        const forcedGen = await geminiGenerateJsonWithModels(env, {
          models,
          promptText: forcedPrompt,
          temperature: 0.2,
          maxOutputTokens: 320
        });
        const fp = forcedGen?.parsed || {};
        const fExp = fp.exp_index ?? fp.expIdx ?? fp.experience_index ?? null;
        const fBul = fp.bullet_index ?? fp.bulletIdx ?? null;
        const fText = fp.rewritten_bullet || fp.rewrite || fp.bullet || fp.text || null;
        const okIdx = typeof fExp === "number" && typeof fBul === "number" && rawCandidates.some((c) => c.exp_index === fExp && c.bullet_index === fBul);
        if (okIdx && typeof fText === "string" && fText.trim()) {
          reco = {
            target: "experience",
            exp_index: fExp,
            bullet_index: fBul,
            rewritten_bullet: fText.trim().slice(0, 280),
            skill_group: null,
            skill_item: null,
            reason: String(fp.reason || fp.rationale || reco.reason || "").trim(),
            confidence: typeof fp.confidence === "number" && fp.confidence >= 0 && fp.confidence <= 1 ? fp.confidence : reco.confidence
          };
          const kwNeedle2 = String(keyword || "").toLowerCase();
          if (reco.rewritten_bullet && !reco.rewritten_bullet.toLowerCase().includes(kwNeedle2)) {
            reco.rewritten_bullet = ensureKeywordPresentNaturally(reco.rewritten_bullet, keyword, lang).slice(0, 280);
          }
        }
      } catch (_) {
      }
    }
    const keyword_pretty = kwPretty;
    if (reco.target === "experience" && typeof reco.rewritten_bullet === "string") {
      const original = rawCandidates.find((c) => c.exp_index === reco.exp_index && c.bullet_index === reco.bullet_index)?.bullet || "";
      let out = postProcessKeywordSuggestBullet(reco.rewritten_bullet, keyword, lang);
      if (shouldPolishKeywordSuggestBullet(out, keyword, lang) && original) {
        try {
          const polished = await aiRewriteBulletWithKeyword(env, {
            models,
            lang,
            keyword,
            currentBullet: original,
            context: body.context || {}
          });
          if (polished) out = polished;
        } catch (_) {
        }
        out = postProcessKeywordSuggestBullet(out, keyword, lang);
      }
      const kwNeedleFinal = String(keyword || "").toLowerCase();
      if (out && !out.toLowerCase().includes(kwNeedleFinal)) {
        out = ensureKeywordPresentNaturally(out, keyword, lang);
      }
      reco.rewritten_bullet = out ? out.slice(0, 280) : null;
      reco.skill_group = null;
      reco.skill_item = null;
    }
    return jsonResponse({
      ok: true,
      language: lang,
      keyword_pretty,
      recommendation: reco,
      model: gen?.model || null,
      prompt_version: "cv_keyword_suggest_v3"
    });
  } catch (e) {
    return jsonResponse({ ok: false, error: "AI suggest failed", details: String(e?.message || e) }, 500);
  }
}
__name(handleMeCvKeywordSuggest, "handleMeCvKeywordSuggest");
async function handleMeCvKeywordInsert(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const keyword = String(body.keyword || "").trim();
  if (!keyword || keyword.length < 2) {
    return jsonResponse({ ok: false, error: "keyword is required" }, 400);
  }
  if (keyword.length > 80) {
    return jsonResponse({ ok: false, error: "keyword is too long" }, 400);
  }
  const mode = String(body.mode || "").trim().toLowerCase();
  const currentBullet = String(body.current_bullet || body.bullet || "").trim();
  const note = String(body.note || "").trim();
  const ctx = body.context && typeof body.context === "object" ? body.context : {};
  if (mode !== "rewrite" && mode !== "new") {
    return jsonResponse({ ok: false, error: "mode must be 'rewrite' or 'new'" }, 400);
  }
  if (mode === "rewrite" && !currentBullet) {
    return jsonResponse({ ok: false, error: "current_bullet is required for rewrite mode" }, 400);
  }
  if (mode === "new" && note.length < 4) {
    return jsonResponse({ ok: false, error: "note is required for new mode" }, 400);
  }
  let lang = String(body.language || body.lang || "").trim().toLowerCase();
  if (lang !== "de" && lang !== "en") lang = "auto";
  const ctxTarget = String(ctx.target_language || "").trim().toLowerCase();
  if ((lang === "auto" || !lang) && (ctxTarget === "de" || ctxTarget === "en")) {
    lang = ctxTarget;
  }
  if (lang === "auto" || !lang) {
    const basis = (currentBullet || note || keyword).trim();
    lang = detectLanguageHint(basis) || "en";
  }
  const bulletIn = currentBullet.slice(0, 500);
  const noteIn = note.slice(0, 280);
  const promptText = buildKeywordInsertPrompt({
    mode,
    lang,
    keyword,
    currentBullet: bulletIn,
    note: noteIn,
    context: ctx
  });
  const models = env.GEMINI_CV_KEYWORD_MODELS || env.GEMINI_CV_FINAL_MODELS || env.GEMINI_CV_MODEL_QUALITY || (env.GEMINI_CV_MODEL ? `gemini-2.0-pro,${env.GEMINI_CV_MODEL}` : "gemini-2.0-pro,gemini-2.0-flash");
  try {
    const gen = await geminiGenerateJsonWithModels(env, {
      models,
      promptText,
      temperature: 0.35,
      maxOutputTokens: 240
    });
    const parsed = gen?.parsed || {};
    let out = String(parsed.output || parsed.text || parsed.bullet || parsed.rewritten_bullet || parsed.new_bullet || "").trim();
    out = out.replace(/^[\-–—•·∙●▪◦]+\s*/g, "").trim();
    out = out.replace(/\s+/g, " ").trim();
    out = postProcessKeywordSuggestBullet(out, keyword, lang);
    if (mode === "rewrite" && shouldPolishKeywordSuggestBullet(out, keyword, lang) && bulletIn) {
      try {
        const polished = await aiRewriteBulletWithKeyword(env, {
          models,
          lang,
          keyword,
          currentBullet: bulletIn,
          context: ctx
        });
        if (polished) out = polished;
      } catch (_) {
      }
      out = postProcessKeywordSuggestBullet(out, keyword, lang);
    }
    const kLow = keyword.toLowerCase();
    if (out && !out.toLowerCase().includes(kLow)) {
      out = ensureKeywordPresentNaturally(out, keyword, lang);
    }
    if (!out || out.length < 6) {
      throw new Error("Keyword insert model returned empty output");
    }
    if (out.length > 260) {
      out = out.slice(0, 260).trim();
      out = out.replace(/\s+\S*$/, "").trim();
    }
    if (lang === "en") {
      const k = keyword.toLowerCase().trim();
      if (k === "requirements gathering") {
        out = out.replace(/\b(via|through|by)\s+requirements gathering\b/i, "for requirements gathering");
        out = out.replace(/\b(via|through|by)\s+Requirements Gathering\b/g, "for requirements gathering");
      }
      if (k === "stakeholder management") {
        out = out.replace(/\b(via|through|by)\s+stakeholder management\b/i, "for stakeholder management");
        out = out.replace(/\b(via|through|by)\s+Stakeholder Management\b/g, "for stakeholder management");
      }
      if (k === "process mapping") {
        out = out.replace(/\b(via|through|by)\s+process mapping\b/i, "for process mapping");
        out = out.replace(/\b(via|through|by)\s+Process Mapping\b/g, "for process mapping");
      }
      if (k === "requirements analysis") {
        out = out.replace(/\b(via|through|by)\s+requirements analysis\b/i, "for requirements analysis");
        out = out.replace(/\b(via|through|by)\s+Requirements Analysis\b/g, "for requirements analysis");
      }
      if (k && k.length <= 50 && !/^(sql|api|aws|gcp|okr|kpi)\b/i.test(k)) {
        const kwPretty = prettyKeywordForCv(keyword, lang) || keyword;
        if (kwPretty && kwPretty.toLowerCase() !== k) {
          const esc = kwPretty.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          out = out.replace(new RegExp("\\b" + esc + "\\b", "g"), k);
        }
      }
    }
    out = postProcessKeywordSuggestBullet(out, keyword, lang);
    if (out && !out.toLowerCase().includes(kLow)) {
      out = ensureKeywordPresentNaturally(out, keyword, lang);
    }
    const resp = {
      ok: true,
      language: lang,
      model: gen.model || null,
      prompt_version: "cv_keyword_insert_v4"
    };
    if (mode === "new") {
      return jsonResponse({ ...resp, new_bullet: out });
    }
    return jsonResponse({ ...resp, rewritten_bullet: out });
  } catch (err) {
    const msg = String(err?.message || err || "Keyword insert failed");
    return jsonResponse({ ok: false, error: msg }, 502);
  }
}
__name(handleMeCvKeywordInsert, "handleMeCvKeywordInsert");
async function handleMeCvTailoredGet(request, env) {
  const auth = await requireMeCustomerId(request, env);
  if (!auth.ok) return auth.res;
  const customerId = auth.customerId;
  const url = new URL(request.url);
  const jobId = String(url.searchParams.get("job_id") || "").trim();
  const jobIdsCsv = String(url.searchParams.get("job_ids") || "").trim();
  let jobIds = [];
  if (jobId) {
    if (!looksLikeUuid(jobId)) {
      return json(request, { ok: false, error: "job_id must be a UUID" }, 400);
    }
    jobIds = [jobId];
  } else if (jobIdsCsv) {
    const parts = jobIdsCsv.split(",").map((s) => s.trim()).filter(Boolean);
    const uniq = [];
    const seen = /* @__PURE__ */ new Set();
    for (const p of parts) {
      if (!looksLikeUuid(p)) continue;
      if (seen.has(p)) continue;
      seen.add(p);
      uniq.push(p);
      if (uniq.length >= 50) break;
    }
    jobIds = uniq;
  } else {
    return json(request, { ok: true, me: true, customer_id: customerId, count: 0, data: [] }, 200);
  }
  const params = new URLSearchParams();
  params.set("select", "id,job_id,status,created_at,updated_at,model,language,confidence,ats_keywords_used,ats_keywords_missing,error,prompt_version");
  params.set("customer_id", `eq.${customerId}`);
  if (jobIds.length === 1) {
    params.set("job_id", `eq.${jobIds[0]}`);
    params.set("limit", "1");
  } else {
    const inList = jobIds.map((x) => `"${x}"`).join(",");
    params.set("job_id", `in.(${inList})`);
    params.set("limit", String(jobIds.length));
  }
  const rows = await supabaseFetch(env, `/rest/v1/tailored_cvs?${params.toString()}`, { method: "GET" });
  return json(request, { ok: true, me: true, customer_id: customerId, count: rows.length, data: rows }, 200);
}
__name(handleMeCvTailoredGet, "handleMeCvTailoredGet");
async function handleMeCvOcrStart(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  const row = await getCustomerCvRow(env, me.customerId);
  if (!row?.cv_path) return json(request, { error: "No CV uploaded yet. Upload first via POST /me/cv." }, 400);
  const cvMime = String(row.cv_mime || "").trim() || inferCvMimeFromName(row.cv_filename || row.cv_path || "");
  const cvPath = String(row.cv_path);
  if (!cvPath.toLowerCase().endsWith(".pdf") && cvMime !== "application/pdf") {
    return json(request, { error: "OCR Phase A supports PDF only. Please upload a PDF CV." }, 400);
  }
  const bucket = getCvBucket(env);
  const bytes = await downloadFromSupabaseStorage(env, { bucket, path: cvPath });
  if (bytes.byteLength > getOcrMaxPdfBytes(env)) {
    return json(request, { error: "PDF too large for OCR", max_bytes: getOcrMaxPdfBytes(env), size: bytes.byteLength }, 413);
  }
  const accessToken = await getGcpAccessToken(env);
  const gcsBucket = getGcsBucket(env);
  const inputPrefix = normPrefix(env.GCP_GCS_INPUT_PREFIX || "input");
  const outputPrefix = normPrefix(env.GCP_GCS_OUTPUT_PREFIX || "output");
  const ts = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const baseName = safeFileName(row.cv_filename || "cv.pdf");
  const gcsInputObject = `${inputPrefix}/${me.customerId}/${ts}-${baseName}`;
  const gcsOutputFolder = `${outputPrefix}/${me.customerId}/${ts}-${baseName.replace(/\.pdf$/i, "")}/`;
  await gcsUploadObject(env, accessToken, {
    bucket: gcsBucket,
    objectName: gcsInputObject,
    bytes,
    contentType: "application/pdf"
  });
  const gcsInputUri = `gs://${gcsBucket}/${gcsInputObject}`;
  const gcsOutputUri = `gs://${gcsBucket}/${gcsOutputFolder}`;
  const operationName = await visionStartAsyncOcr(env, accessToken, {
    gcsInputUri,
    gcsOutputUri,
    mimeType: "application/pdf"
  });
  await setOcrState(env, me.customerId, {
    cv_ocr_status: "processing",
    cv_ocr_operation: operationName,
    cv_ocr_error: null
  });
  return json(
    request,
    {
      ok: true,
      me: true,
      customer_id: me.customerId,
      status: "processing",
      operation: operationName,
      gcs: { input: gcsInputUri, output: gcsOutputUri }
    },
    200
  );
}
__name(handleMeCvOcrStart, "handleMeCvOcrStart");
async function handleMeCvOcrStatus(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  const url = new URL(request.url);
  const opParam = (url.searchParams.get("operation") || url.searchParams.get("op") || "").trim();
  const outParam = (url.searchParams.get("out") || url.searchParams.get("output") || "").trim();
  const projectId = mustEnv(env, "GCP_PROJECT_ID");
  const location = (env.GCP_LOCATION || "eu").trim() || "eu";
  const profile = await getCustomerCvRow(env, me.customerId);
  const cachedStatus = String(profile?.cv_ocr_status || "").toLowerCase();
  const cachedText = String(profile?.cv_ocr_text || "").trim();
  if (!opParam && !outParam && cachedStatus === "done" && cachedText) {
    return json(
      request,
      {
        ok: true,
        me: true,
        customer_id: me.customerId,
        status: "done",
        source: "db",
        text_length: cachedText.length,
        updated_at: profile?.cv_ocr_updated_at || null
      },
      200
    );
  }
  const opNameRaw = opParam || (profile?.cv_ocr_operation || "").trim();
  if (!opNameRaw) {
    return json(request, { ok: false, me: true, customer_id: me.customerId, status: "missing_operation" }, 400);
  }
  const opName = opNameRaw.startsWith("projects/") ? opNameRaw : `projects/${projectId}/locations/${location}/operations/${opNameRaw}`;
  const accessToken = await getGcpAccessToken(env);
  const op = await visionGetOperation(env, accessToken, opName);
  if (!op.done) {
    await setOcrState(env, me.customerId, { cv_ocr_status: "processing", cv_ocr_operation: opName, cv_ocr_error: null });
    return json(request, { ok: true, me: true, customer_id: me.customerId, status: "processing", operation: opName, done: false }, 200);
  }
  if (op.error) {
    await setCustomerCvOcrResult(env, me.customerId, {
      status: "failed",
      operation: opName,
      error: op.error?.message || JSON.stringify(op.error),
      text: null
    });
    return json(request, { ok: false, me: true, customer_id: me.customerId, status: "failed", operation: opName, error: op.error?.message || JSON.stringify(op.error) });
  }
  const outUriFromOp = op?.response?.responses?.[0]?.outputConfig?.gcsDestination?.uri || op?.response?.outputConfig?.gcsDestination?.uri || "";
  const outUri = outUriFromOp || outParam;
  if (!outUri) {
    await setCustomerCvOcrResult(env, me.customerId, { status: "failed", operation: opName, error: "OCR done but output URI missing", text: null });
    return json(request, { ok: false, me: true, customer_id: me.customerId, status: "failed", operation: opName, error: "OCR done but output URI missing" });
  }
  const m = outUri.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!m) {
    await setCustomerCvOcrResult(env, me.customerId, { status: "failed", operation: opName, error: `Invalid GCS output URI: ${outUri}`, text: null });
    return json(request, { ok: false, me: true, customer_id: me.customerId, status: "failed", operation: opName, error: `Invalid GCS output URI: ${outUri}` });
  }
  const outBucket = m[1];
  let outPrefix = m[2];
  if (!outPrefix.endsWith("/")) outPrefix += "/";
  const jsonObjects = await gcsProbeVisionOutputFiles(env, accessToken, outBucket, outPrefix);
  if (jsonObjects.length === 0) {
    await setCustomerCvOcrResult(env, me.customerId, {
      status: "failed",
      operation: opName,
      error: `No OCR JSON files could be read under ${outUri} (missing list permission or unexpected filenames)`,
      text: null
    });
    return json(request, { ok: false, me: true, customer_id: me.customerId, status: "failed", operation: opName, error: `No OCR JSON files could be read under ${outUri}` });
  }
  let fullText = "";
  for (const objName of jsonObjects) {
    const part = await gcsDownloadObjectJson(env, accessToken, outBucket, objName);
    const t = extractVisionTextFromAsyncOutput(part);
    if (t) fullText += t + "\n";
  }
  fullText = fullText.trim();
  await setCustomerCvOcrResult(env, me.customerId, { status: "done", operation: opName, error: null, text: fullText });
  return json(
    request,
    {
      ok: true,
      me: true,
      customer_id: me.customerId,
      status: "done",
      operation: opName,
      out: outUri,
      files: jsonObjects,
      text_length: fullText.length
    },
    200
  );
}
__name(handleMeCvOcrStatus, "handleMeCvOcrStatus");
async function handleMeCvOcrText(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  const profile = await getCustomerCvRow(env, me.customerId);
  const existing = String(profile?.cv_ocr_text || "").trim();
  if (existing) {
    return json(
      request,
      {
        ok: true,
        me: true,
        customer_id: me.customerId,
        status: profile?.cv_ocr_status || "done",
        source: "db",
        text: existing,
        text_length: existing.length,
        updated_at: profile?.cv_ocr_updated_at || null
      },
      200
    );
  }
  const url = new URL(request.url);
  const outParam = (url.searchParams.get("out") || url.searchParams.get("output") || "").trim();
  if (!outParam) {
    return json(request, { error: "Missing query param: out (gs://...)" }, 400);
  }
  const m = outParam.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!m) return json(request, { error: `Invalid out URI: ${outParam}` }, 400);
  const outBucket = m[1];
  let outPrefix = m[2];
  if (!outPrefix.endsWith("/")) outPrefix += "/";
  const accessToken = await getGcpAccessToken(env);
  const jsonObjects = await gcsProbeVisionOutputFiles(env, accessToken, outBucket, outPrefix);
  if (!jsonObjects.length) {
    return json(request, { error: "No OCR JSON files found/readable for out prefix", out: outParam }, 404);
  }
  let fullText = "";
  for (const objName of jsonObjects) {
    const part = await gcsDownloadObjectJson(env, accessToken, outBucket, objName);
    const t = extractVisionTextFromAsyncOutput(part);
    if (t) fullText += t + "\n";
  }
  fullText = fullText.trim();
  if (fullText) {
    await setCustomerCvOcrResult(env, me.customerId, {
      status: "done",
      operation: profile?.cv_ocr_operation || null,
      error: null,
      text: fullText
    });
  }
  return json(
    request,
    {
      ok: true,
      me: true,
      customer_id: me.customerId,
      source: "gcs",
      out: outParam,
      files: jsonObjects,
      text: fullText,
      text_length: fullText.length
    },
    200
  );
}
__name(handleMeCvOcrText, "handleMeCvOcrText");
async function runNightlyCron(env) {
  const startedAt = (/* @__PURE__ */ new Date()).toISOString();
  const q = new URLSearchParams();
  q.set("select", "customer_id");
  q.set("limit", "1000");
  const profiles = await supabaseFetch(env, `/rest/v1/customer_profiles?${q.toString()}`, { method: "GET" });
  const customerIds = Array.from(new Set((profiles || []).map((p) => p.customer_id).filter(Boolean)));
  const maxCustomers = parseInt(env.CRON_MAX_CUSTOMERS || "200", 10);
  const batch = customerIds.slice(0, maxCustomers);
  let attempted = 0;
  let fetched = 0;
  let skipped = 0;
  let failed = 0;
  for (const customerId of batch) {
    attempted += 1;
    try {
      const r = await fetchJobsForCustomerCore(customerId, env, "cron");
      if (r && r.skipped) skipped += 1;
      else fetched += 1;
    } catch (e) {
      failed += 1;
      console.log("CRON customer failed", customerId, String(e));
    }
  }
  console.log("CRON summary", { startedAt, attempted, fetched, skipped, failed });
}
__name(runNightlyCron, "runNightlyCron");
async function fetchJobsForCustomerCore(customerId, env, fetchedBy = "team", force = false, overrideDesiredTitles = null, options = null) {
  const todayUTC = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const todayStart = `${todayUTC}T00:00:00.000Z`;
  const todayCheck = new URLSearchParams();
  todayCheck.set("select", "id,created_at");
  todayCheck.set("customer_id", `eq.${customerId}`);
  todayCheck.set("created_at", `gte.${todayStart}`);
  todayCheck.set("limit", "1");
  const alreadyFetched = await supabaseFetch(env, `/rest/v1/customer_fetch_logs?${todayCheck.toString()}`, { method: "GET" });
  if (!force && Array.isArray(alreadyFetched) && alreadyFetched.length > 0) {
    return { ok: true, customer_id: customerId, message: "Jobs already fetched today", skipped: true };
  }
  const qProfile = new URLSearchParams();
  qProfile.set("select", "customer_id,desired_titles,exclude_titles,locations,radius_km,countries_allowed");
  qProfile.set("customer_id", `eq.${customerId}`);
  qProfile.set("limit", "1");
  const profiles = await supabaseFetch(env, `/rest/v1/customer_profiles?${qProfile.toString()}`, { method: "GET" });
  if (!Array.isArray(profiles) || profiles.length === 0) throw new Error("Customer profile not found");
  const p = profiles[0];
  const queuedMeta = {
    source: fetchedBy,
    fetch_mode: options && options.mode ? options.mode : null
  };
  const desiredTitlesAll = Array.isArray(overrideDesiredTitles) && overrideDesiredTitles.length ? overrideDesiredTitles.filter(Boolean) : Array.isArray(p.desired_titles) ? p.desired_titles.filter(Boolean) : [];
  const excludeTitles = Array.isArray(p.exclude_titles) ? p.exclude_titles.filter(Boolean) : [];
  const locations = Array.isArray(p.locations) ? p.locations.filter(Boolean) : [];
  const radiusKmBase = Number.isFinite(Number(p.radius_km)) ? Number(p.radius_km) : 50;
  if (!desiredTitlesAll.length) throw new Error("Customer has no desired_titles");
  if (!locations.length) throw new Error("Customer has no locations");
  const BA_TITLE_LIMIT = 5;
  const baseDesiredForBA = desiredTitlesAll.slice(0, BA_TITLE_LIMIT);
  const _normT = /* @__PURE__ */ __name((s) => String(s || "").trim().toLowerCase(), "_normT");
  const excludeSet = new Set(excludeTitles.map(_normT).filter(Boolean));
  const baseSet = new Set(baseDesiredForBA.map(_normT).filter(Boolean));
  let expandedTitles = baseDesiredForBA.slice();
  try {
    const roleClusters = await loadRoleClusters(env);
    const extra = [];
    const extraLimit = 2;
    for (const c of roleClusters || []) {
      const clusterTitles = Array.isArray(c.titles) ? c.titles : [];
      const clusterNormSet = new Set(clusterTitles.map(_normT).filter(Boolean));
      let matches = false;
      for (const bt of baseSet) {
        if (clusterNormSet.has(bt)) {
          matches = true;
          break;
        }
      }
      if (!matches) continue;
      for (const t of clusterTitles) {
        const nt = _normT(t);
        if (!nt) continue;
        if (excludeSet.has(nt)) continue;
        if (baseSet.has(nt)) continue;
        if (extra.some((x) => _normT(x) === nt)) continue;
        extra.push(String(t).trim());
        if (extra.length >= extraLimit) break;
      }
      if (extra.length >= extraLimit) break;
    }
    expandedTitles = expandedTitles.concat(extra);
  } catch (e) {
    expandedTitles = baseDesiredForBA.slice();
  }
  const desiredTitlesForBA = expandedTitles.slice(0, BA_TITLE_LIMIT + 1);
  const wo = String(locations[0]).trim();
  const sourceId = await getSourceId(env, "BA Jobsuche", "DE");
  const MIN_QUEUE_BEFORE_EXPAND = 20;
  const radiusKmExpanded = clamp(radiusKmBase + 25, 10, 150);
  const passes = [
    { match_level: 0, radius_km_used: radiusKmBase },
    { match_level: 1, radius_km_used: radiusKmExpanded }
  ];
  let totalFetched = 0;
  let totalInsertedRaw = 0;
  let totalUpsertedNormalized = 0;
  const details = [];
  let finalQueuedCount = 0;
  let finalMatchLevel = 0;
  let finalRadiusUsed = radiusKmBase;
  for (let i = 0; i < passes.length; i += 1) {
    const pass = passes[i];
    const radiusUsed = pass.radius_km_used;
    const matchLevel = pass.match_level;
    const passExternalIdSet = /* @__PURE__ */ new Set();
    for (const title of desiredTitlesForBA) {
      const r = await ingestBaOnce({ was: String(title).trim(), wo, umkreis: radiusUsed, page: 1, size: 25, veroeffentlichtseit: 365 }, env, null);
      totalFetched += r.fetched;
      totalInsertedRaw += r.inserted_raw;
      totalUpsertedNormalized += r.upserted_normalized;
      if (Array.isArray(r.external_ids)) {
        for (const eid of r.external_ids) passExternalIdSet.add(String(eid || "").trim());
      }
      details.push({
        pass: matchLevel,
        was: r.was,
        wo: r.wo,
        umkreis: r.umkreis,
        fetched: r.fetched,
        inserted_raw: r.inserted_raw,
        upserted_normalized: r.upserted_normalized
      });
    }
    let matchedJobIds = [];
    const passExternalIds = Array.from(passExternalIdSet).filter(Boolean);
    if (passExternalIds.length) {
      const jobs = await queryJobsByExternalIds(env, { sourceId, externalIds: passExternalIds, limit: 400 });
      matchedJobIds = pickTopJobsByLocationAndScore(jobs, locations, desiredTitlesAll, excludeTitles, 200);
    } else {
      const candidates = await queryCandidateJobsByTitle(env, { desiredTitles: desiredTitlesAll, limit: 400 });
      matchedJobIds = pickTopJobsByLocationAndScore(candidates, locations, desiredTitlesAll, excludeTitles, 200);
    }
    const queuedCount = await enqueueJobsForCustomer(env, customerId, matchedJobIds, fetchedBy, queuedMeta);
    finalQueuedCount = queuedCount;
    finalMatchLevel = matchLevel;
    finalRadiusUsed = radiusUsed;
    if (queuedCount >= MIN_QUEUE_BEFORE_EXPAND) break;
  }
  await writeFetchLog(env, {
    customerId,
    fetchedBy,
    totalJobsAdded: finalQueuedCount,
    radiusKmUsed: finalRadiusUsed,
    matchLevel: finalMatchLevel
  });
  return {
    ok: true,
    customer_id: customerId,
    location_used: wo,
    radius_km_used: finalRadiusUsed,
    match_level: finalMatchLevel,
    searches_run: desiredTitlesForBA.length,
    total_fetched: totalFetched,
    total_inserted_raw: totalInsertedRaw,
    total_upserted_normalized: totalUpsertedNormalized,
    queued_count: finalQueuedCount,
    details
  };
}
__name(fetchJobsForCustomerCore, "fetchJobsForCustomerCore");
async function handleCustomerSearch(request, url, env) {
  if (!isAdminAuthorized(request, env)) return json(request, { error: "Unauthorized" }, 401);
  const email = (url.searchParams.get("email") || "").trim().toLowerCase();
  if (!email) return json(request, { error: "email is required" }, 400);
  const qCust = new URLSearchParams();
  qCust.set("select", "id,email,full_name,created_at");
  qCust.set("email", `eq.${email}`);
  qCust.set("limit", "1");
  const customers = await supabaseFetch(env, `/rest/v1/customers?${qCust.toString()}`, { method: "GET" });
  if (!Array.isArray(customers) || customers.length === 0) {
    return json(request, { ok: true, found: false, email }, 200);
  }
  const c = customers[0];
  const qProf = new URLSearchParams();
  qProf.set(
    "select",
    "customer_id,locations,radius_km,desired_titles,exclude_titles,countries_allowed,updated_at,cv_path,cv_filename,cv_mime,cv_size,cv_uploaded_at,cv_ocr_status,cv_ocr_operation,cv_ocr_error,cv_ocr_updated_at"
  );
  qProf.set("customer_id", `eq.${c.id}`);
  qProf.set("limit", "1");
  const profiles = await supabaseFetch(env, `/rest/v1/customer_profiles?${qProf.toString()}`, { method: "GET" });
  const profile = Array.isArray(profiles) && profiles.length ? profiles[0] : null;
  return json(request, { ok: true, found: true, customer: { id: c.id, email: c.email, full_name: c.full_name, created_at: c.created_at }, profile }, 200);
}
__name(handleCustomerSearch, "handleCustomerSearch");
async function handleJobSearch(url, env, request) {
  const supabaseUrl = mustEnv(env, "SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = mustEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
  const country = (url.searchParams.get("country") || "").trim();
  const q = (url.searchParams.get("q") || "").trim();
  const city = (url.searchParams.get("city") || "").trim();
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "25", 10) || 25, 1), 100);
  const requestedEmail = (url.searchParams.get("email") || "").trim().toLowerCase();
  let email = "";
  if (!country) return json(request, { error: "country is required (UK, DE, TH, ID)" }, 400);
  if (requestedEmail) {
    const authUser = await getSupabaseUserFromAuthHeader(request, env).catch(() => null);
    const authEmail = String(authUser?.email || "").trim().toLowerCase();
    if (isAdminAuthorized(request, env) || authEmail && authEmail === requestedEmail) {
      email = requestedEmail;
    }
  }
  const qSafe = q ? escapeForPostgrestLike(q) : "";
  const citySafe = city ? escapeForPostgrestLike(city) : "";
  const select = "id,title,company_name,country,city,region,apply_url,posted_at,fetched_at,status";
  const params = new URLSearchParams();
  params.set("select", select);
  params.set("country", `eq.${country}`);
  params.set("status", "eq.active");
  params.set("order", "posted_at.desc");
  params.set("limit", String(limit));
  if (citySafe) params.set("city", `ilike.*${citySafe}*`);
  if (qSafe) params.set("or", `(title.ilike.*${qSafe}*,description_snippet.ilike.*${qSafe}*)`);
  if (email) {
    const qCust = new URLSearchParams();
    qCust.set("select", "id");
    qCust.set("email", `eq.${email}`);
    qCust.set("limit", "1");
    const customers = await supabaseFetch(env, `/rest/v1/customers?${qCust.toString()}`, { method: "GET" });
    if (Array.isArray(customers) && customers.length) {
      const customerId = customers[0].id;
      const qApps = new URLSearchParams();
      qApps.set("select", "job_id");
      qApps.set("customer_id", `eq.${customerId}`);
      qApps.set("status", "in.(applied,skipped,rejected,expired)");
      qApps.set("limit", "2000");
      const apps = await supabaseFetch(env, `/rest/v1/applications?${qApps.toString()}`, { method: "GET" });
      const jobIds = (apps || []).map((a) => a.job_id).filter(Boolean);
      if (jobIds.length) params.set("id", `not.in.(${jobIds.join(",")})`);
    }
  }
  const endpoint = `${supabaseUrl}/rest/v1/jobs_normalized?${params.toString()}`;
  const res = await fetch(endpoint, {
    method: "GET",
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" }
  });
  const text = await res.text();
  if (!res.ok) return json(request, { error: "Supabase query failed", status: res.status, details: text }, 500);
  const data = text ? JSON.parse(text) : [];
  return json(request, { count: data.length, data }, 200);
}
__name(handleJobSearch, "handleJobSearch");
async function handleCustomerJobQueue(request, url, env) {
  if (!isAdminAuthorized(request, env)) return json(request, { error: "Unauthorized" }, 401);
  const customerId = url.pathname.split("/")[2];
  const qApps = new URLSearchParams();
  qApps.set("select", "job_id,created_at,priority,priority_at");
  qApps.set("customer_id", `eq.${customerId}`);
  qApps.set("status", "eq.new");
  qApps.set("order", "priority.desc,priority_at.desc,created_at.desc");
  qApps.set("limit", "200");
  const apps = await supabaseFetch(env, `/rest/v1/applications?${qApps.toString()}`, { method: "GET" });
  const jobIds = (apps || []).map((a) => a.job_id).filter(Boolean);
  if (!jobIds.length) {
    return json(request, { ok: true, customer_id: customerId, count: 0, data: [] }, 200);
  }
  const qJobs = new URLSearchParams();
  qJobs.set("select", "id,title,company_name,country,city,region,apply_url,posted_at,fetched_at,status,source_modified_at");
  qJobs.set("id", `in.(${jobIds.join(",")})`);
  qJobs.set("limit", String(jobIds.length));
  const jobs = await supabaseFetch(env, `/rest/v1/jobs_normalized?${qJobs.toString()}`, { method: "GET" });
  const orderIndex = new Map(jobIds.map((id, idx) => [id, idx]));
  const sortedJobs = (jobs || []).slice().sort((a, b) => (orderIndex.get(a.id) ?? 999999) - (orderIndex.get(b.id) ?? 999999));
  const appMap = new Map((apps || []).map((a) => [a.job_id, a]));
  const withMeta = sortedJobs.map((j) => {
    const a = appMap.get(j.id) || {};
    return {
      ...j,
      _application: {
        priority: !!a.priority,
        priority_at: a.priority_at || null,
        created_at: a.created_at || null
      }
    };
  });
  return json(request, { ok: true, customer_id: customerId, count: withMeta.length, data: withMeta }, 200);
}
__name(handleCustomerJobQueue, "handleCustomerJobQueue");
async function handleCustomerApplicationsSummary(request, url, env) {
  if (!isAdminAuthorized(request, env)) return json(request, { error: "Unauthorized" }, 401);
  const customerId = url.pathname.split("/")[2];
  const q = new URLSearchParams();
  q.set("select", "status");
  q.set("customer_id", `eq.${customerId}`);
  q.set("limit", "5000");
  const rows = await supabaseFetch(env, `/rest/v1/applications?${q.toString()}`, { method: "GET" });
  const counts = {};
  let total = 0;
  for (const r of rows || []) {
    const s = (r.status || "unknown").toString();
    counts[s] = (counts[s] || 0) + 1;
    total += 1;
  }
  return json(request, { ok: true, customer_id: customerId, total, counts }, 200);
}
__name(handleCustomerApplicationsSummary, "handleCustomerApplicationsSummary");
async function handleFetchJobsForCustomer(request, url, env) {
  if (!isAdminAuthorized(request, env)) return json(request, { error: "Unauthorized" }, 401);
  const customerId = url.pathname.split("/")[2];
  const force = (url.searchParams.get("force") || "").toLowerCase() === "true";
  const result = await fetchJobsForCustomerCore(customerId, env, "team", force);
  return json(request, result, 200);
}
__name(handleFetchJobsForCustomer, "handleFetchJobsForCustomer");
async function handleManualFetchJobs(request, env) {
  if (!isAdminAuthorized(request, env)) return json(request, { error: "Unauthorized" }, 401);
  let body = null;
  try {
    body = await request.json();
  } catch {
    return json(request, { error: "Invalid JSON body" }, 400);
  }
  const customerId = String(body?.customer_id || "").trim();
  if (!looksLikeUuid(customerId)) {
    return json(request, { error: "Valid customer_id (uuid) is required" }, 400);
  }
  const fetchedBy = String(body?.source || "manual").trim().slice(0, 40) || "manual";
  const force = String(body?.force || "").toLowerCase() === "true" || body?.force === true;
  const result = await fetchJobsForCustomerCore(customerId, env, fetchedBy, force);
  return json(request, { ok: true, manual: true, ...result }, 200);
}
__name(handleManualFetchJobs, "handleManualFetchJobs");
async function handleMarkApplication(request, env) {
  const adminToken = (env.WORKER_ADMIN_TOKEN || "").trim();
  if (!adminToken) return json(request, { error: "Missing WORKER_ADMIN_TOKEN on Worker" }, 500);
  const incomingToken = (request.headers.get("x-admin-token") || "").trim();
  if (incomingToken !== adminToken) return json(request, { error: "Unauthorized" }, 401);
  let body;
  try {
    body = await request.json();
  } catch {
    return json(request, { error: "Invalid JSON body" }, 400);
  }
  const email = (body.email || "").toString().trim().toLowerCase();
  const fullName = (body.full_name || "").toString().trim();
  const refnr = (body.refnr || "").toString().trim();
  const jobIdFromBody = (body.job_id || "").toString().trim();
  const status = (body.status || "applied").toString().trim();
  const notes = (body.notes || "").toString().trim();
  const appliedBy = (body.applied_by || "").toString().trim();
  const applicationChannelRaw = (body.application_channel || "").toString().trim().toLowerCase();
  const fromEmailRaw = (body.from_email || "").toString().trim();
  const allowedChannels = /* @__PURE__ */ new Set(["email_manual", "email_gmail", "career_portal", ""]);
  if (!allowedChannels.has(applicationChannelRaw)) {
    return json(request, { error: "Invalid application_channel", allowed: ["email_manual", "email_gmail", "career_portal"] }, 400);
  }
  const application_channel = applicationChannelRaw || null;
  const from_email = fromEmailRaw ? fromEmailRaw.slice(0, 200) : null;
  if (from_email && !looksLikeEmail(from_email)) {
    return json(request, { error: "from_email must be a valid email if provided" }, 400);
  }
  if (!email) return json(request, { error: "email is required" }, 400);
  if (!refnr && !jobIdFromBody) return json(request, { error: "refnr or job_id is required" }, 400);
  const allowed = /* @__PURE__ */ new Set(["new", "shortlisted", "applied", "skipped", "rejected", "expired"]);
  if (!allowed.has(status)) return json(request, { error: "Invalid status", allowed: Array.from(allowed) }, 400);
  let jobId = "";
  if (jobIdFromBody) {
    if (!looksLikeUuid(jobIdFromBody)) return json(request, { error: "job_id is not a valid uuid", job_id: jobIdFromBody }, 400);
    const qJobById = new URLSearchParams();
    qJobById.set("select", "id");
    qJobById.set("id", `eq.${jobIdFromBody}`);
    qJobById.set("limit", "1");
    const jobsById = await supabaseFetch(env, `/rest/v1/jobs_normalized?${qJobById.toString()}`, { method: "GET" });
    if (!Array.isArray(jobsById) || jobsById.length === 0) return json(request, { error: "Job not found for job_id", job_id: jobIdFromBody }, 404);
    jobId = jobsById[0].id;
  } else {
    const sourceId = await getSourceId(env, "BA Jobsuche", "DE");
    const qJob = new URLSearchParams();
    qJob.set("select", "id");
    qJob.set("source_id", `eq.${sourceId}`);
    qJob.set("external_job_id", `eq.${refnr}`);
    qJob.set("limit", "1");
    const jobs = await supabaseFetch(env, `/rest/v1/jobs_normalized?${qJob.toString()}`, { method: "GET" });
    if (!Array.isArray(jobs) || jobs.length === 0) return json(request, { error: "Job not found for refnr", refnr }, 404);
    jobId = jobs[0].id;
  }
  await supabaseFetch(env, `/rest/v1/customers?on_conflict=email`, {
    method: "POST",
    body: [{ email, full_name: fullName || null }],
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
  const qCust = new URLSearchParams();
  qCust.set("select", "id");
  qCust.set("email", `eq.${email}`);
  qCust.set("limit", "1");
  const customers = await supabaseFetch(env, `/rest/v1/customers?${qCust.toString()}`, { method: "GET" });
  if (!Array.isArray(customers) || customers.length === 0) return json(request, { error: "Customer lookup failed after upsert", email }, 500);
  const customerId = customers[0].id;
  await supabaseFetch(env, `/rest/v1/applications?on_conflict=customer_id,job_id`, {
    method: "POST",
    body: [
      {
        customer_id: customerId,
        job_id: jobId,
        status,
        notes: notes || null,
        applied_by: appliedBy || null,
        application_channel,
        from_email,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }
    ],
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
  try {
    const st = String(status || "").toLowerCase();
    const allowedEvent = /* @__PURE__ */ new Set(["applied", "rejected", "skipped", "shortlisted", "expired"]);
    if (st === "applied") {
      await logApplicationEvent(env, {
        customerId,
        jobId,
        eventType: "sent",
        actor: appliedBy || "team",
        meta: {
          channel: application_channel || "email_manual",
          from_email: from_email || null
        }
      });
    }
    if (allowedEvent.has(st)) {
      await logApplicationEvent(env, {
        customerId,
        jobId,
        eventType: st,
        actor: appliedBy || "team",
        meta: notes ? { notes: String(notes).slice(0, 300) } : null
      });
    }
  } catch (e) {
  }
  return json(request, { ok: true, email, refnr: refnr || null, job_id: jobId, status, customer_id: customerId }, 200);
}
__name(handleMarkApplication, "handleMarkApplication");
async function handleDEJobDetails(url, env, request) {
  const refnr = decodeURIComponent(url.pathname.replace("/jobs/de/", "")).trim();
  if (!refnr) return json(request, { error: "Missing refnr" }, 400);
  const sourceId = await getSourceId(env, "BA Jobsuche", "DE");
  const q1 = new URLSearchParams();
  q1.set("select", "id,title,company_name,country,city,region,employment_type,seniority,description_snippet,description_full,description_full_source,description_full_fetched_at,description_full_error,description_full_error_at,apply_url,posted_at,fetched_at,status,external_job_id");
  q1.set("source_id", `eq.${sourceId}`);
  q1.set("external_job_id", `eq.${refnr}`);
  const jobs = await supabaseFetch(env, `/rest/v1/jobs_normalized?${q1.toString()}`, { method: "GET" });
  if (!Array.isArray(jobs) || jobs.length === 0) {
    return htmlPage(request, "Job not found", `<div class="card"><h1>Job not found</h1><p>refnr: ${escapeHtml(refnr)}</p></div>`, 404);
  }
  const q2 = new URLSearchParams();
  q2.set("select", "raw_payload,fetched_at,external_job_id");
  q2.set("source_id", `eq.${sourceId}`);
  q2.set("external_job_id", `eq.${refnr}`);
  q2.set("limit", "1");
  q2.set("order", "fetched_at.desc");
  const raw = await supabaseFetch(env, `/rest/v1/raw_jobs?${q2.toString()}`, { method: "GET" });
  const job = jobs[0];
  const rawPayload = Array.isArray(raw) && raw.length ? raw[0].raw_payload : null;
  const format = (url.searchParams.get("format") || "").toLowerCase();
  if (format === "json") return json(request, { job, raw: Array.isArray(raw) && raw.length ? raw[0] : null }, 200);
  const title = job.title || "Job Details";
  const company = job.company_name || rawPayload?.arbeitgeber || "";
  const city = job.city || rawPayload?.arbeitsort?.ort || "";
  const region = job.region || rawPayload?.arbeitsort?.region || "";
  const plz = rawPayload?.arbeitsort?.plz || "";
  const street = rawPayload?.arbeitsort?.strasse || "";
  const postedAt = job.posted_at ? new Date(job.posted_at).toISOString().slice(0, 10) : "";
  const entryDate = rawPayload?.eintrittsdatum || "";
  const content = `
  <div class="card">
  <div class="meta">Germany \xB7 ${escapeHtml(city)}${region ? ", " + escapeHtml(region) : ""}</div>
  <h1>${escapeHtml(title)}</h1>
  <div class="company">${escapeHtml(company)}</div>
  
  <div class="grid">
  <div><div class="label">Reference (BA)</div><div class="value">${escapeHtml(refnr)}</div></div>
  <div><div class="label">Posted at</div><div class="value">${escapeHtml(postedAt || "-")}</div></div>
  <div><div class="label">Start date</div><div class="value">${escapeHtml(entryDate || "-")}</div></div>
  <div><div class="label">Address</div><div class="value">${escapeHtml([street, plz, city].filter(Boolean).join(", ") || "-")}</div></div>
  </div>
  
  <div class="actions">
  <button id="copyRef">Copy refnr</button>
  <button id="copyCompany">Copy company</button>
  <button id="copyTitle">Copy title</button>
  <button id="googleSearch">Google search job</button>
  <button id="markApplied">Mark as applied</button>
  </div>
  
  <details>
  <summary>Job description (cached)</summary>
  <pre style="white-space:pre-wrap">${escapeHtml(job.description_full || (job.description_full_error ? "Not fetched yet (last error: " + job.description_full_error + ")" : "Not fetched yet. Use the dashboard to fetch it."))}</pre>
  <div class="hint">${escapeHtml(job.description_full_fetched_at ? "Fetched at: " + job.description_full_fetched_at : "")}${job.description_full_source ? " \xB7 " + escapeHtml(job.description_full_source) : ""}</div>
  </details>

  <details>
  <summary>Raw data (BA)</summary>
  <pre>${escapeHtml(JSON.stringify(rawPayload, null, 2) || "{}")}</pre>
  </details>
  
  <p class="hint">Tip: Use the Google search button to find the real company posting, then apply manually.</p>
  </div>
  
  <script>
  function copy(text) { navigator.clipboard.writeText(text); }
  
  const refnr = ${JSON.stringify(refnr)};
  const company = ${JSON.stringify(company)};
  const title = ${JSON.stringify(title)};
  
  document.getElementById("copyRef").addEventListener("click", () => copy(refnr));
  document.getElementById("copyCompany").addEventListener("click", () => copy(company));
  document.getElementById("copyTitle").addEventListener("click", () => copy(title));
  
  document.getElementById("googleSearch").addEventListener("click", () => {
  const query = encodeURIComponent(title + " " + company + " " + refnr);
  window.open("https://www.google.com/search?q=" + query, "_blank");
  });
  
  document.getElementById("markApplied").addEventListener("click", async () => {
  const email = prompt("Customer email:");
  if (!email) return;
  
  const token = prompt("Team admin token (x-admin-token):");
  if (!token) return;
  
  const notes = prompt("Notes (optional):") || "";

  const channel = (prompt("Application channel? (email_manual / email_gmail / career_portal)", "email_manual") || "email_manual").trim();
  const fromEmail = (prompt("From email? (optional, used for credibility display)", "") || "").trim();

  const res = await fetch(new URL("/applications/mark", window.location.origin).toString(), {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-admin-token": token.trim() },
  body: JSON.stringify({
    email: email.trim().toLowerCase(),
    full_name: "",
    refnr,
    status: "applied",
    applied_by: "team",
    notes,
    application_channel: channel,
    from_email: fromEmail || null
  })
  });
  
  const data = await res.json();
  if (!res.ok) { alert("Failed: " + (data.error || "unknown error")); return; }
  alert("Saved as applied");
  });
  <\/script>
  `;
  return htmlPage(request, title, content, 200);
}
__name(handleDEJobDetails, "handleDEJobDetails");
function htmlPage(request, title, bodyHtml, status = 200) {
  const html = `
  <!doctype html>
  <html lang="en">
  <head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 0; background: #f6f7fb; color: #111; }
  .wrap { max-width: 900px; margin: 0 auto; padding: 24px; }
  .card { background: white; border-radius: 14px; padding: 22px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
  h1 { margin: 8px 0 6px; font-size: 26px; line-height: 1.2; }
  .meta { font-size: 13px; opacity: 0.75; }
  .company { font-size: 16px; font-weight: 600; margin-bottom: 18px; }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin: 18px 0; }
  .label { font-size: 12px; opacity: 0.7; margin-bottom: 4px; }
  .value { font-size: 14px; font-weight: 600; word-break: break-word; }
  .actions { display: flex; gap: 10px; flex-wrap: wrap; margin: 14px 0 18px; }
  button { border: 1px solid #ddd; background: #fff; padding: 10px 12px; border-radius: 10px; cursor: pointer; font-weight: 600; }
  button:hover { background: #f2f2f2; }
  details { margin-top: 18px; }
  pre { background: #0b1020; color: #e6e6e6; padding: 14px; border-radius: 12px; overflow: auto; }
  .hint { margin-top: 16px; font-size: 13px; opacity: 0.75; }
  @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
  </style>
  </head>
  <body>
  <div class="wrap">
  ${bodyHtml}
  </div>
  </body>
  </html>
  `.trim();
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders(request) } });
}
__name(htmlPage, "htmlPage");
function escapeHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
__name(escapeHtml, "escapeHtml");
async function handleIngestBA(request, env) {
  if (!isAdminAuthorized(request, env)) return json(request, { error: "Unauthorized" }, 401);
  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const was = (body.was ?? "").toString().trim();
  const wo = (body.wo ?? "").toString().trim();
  const umkreis = Number(body.umkreis ?? 25);
  const page = Number(body.page ?? 1);
  const size = Math.min(Math.max(Number(body.size ?? 25), 1), 100);
  const veroeffentlichtseit = Number(body.veroeffentlichtseit ?? 30);
  const result = await ingestBaOnce({ was, wo, umkreis, page, size, veroeffentlichtseit }, env, request);
  return json(
    request,
    {
      ok: true,
      fetched: result.fetched,
      inserted_raw: result.inserted_raw,
      upserted_normalized: result.upserted_normalized,
      was: result.was,
      wo: result.wo,
      page: result.page,
      size: result.size,
      umkreis: result.umkreis,
      veroeffentlichtseit: result.veroeffentlichtseit
    },
    200
  );
}
__name(handleIngestBA, "handleIngestBA");
async function ingestBaOnce(input, env, requestForBase = null) {
  const sourceId = await getSourceId(env, "BA Jobsuche", "DE");
  const was = (input.was ?? "").toString().trim();
  const wo = (input.wo ?? "").toString().trim();
  const umkreis = Number(input.umkreis ?? 25);
  const page = Number(input.page ?? 1);
  const size = Math.min(Math.max(Number(input.size ?? 25), 1), 100);
  const veroeffentlichtseit = Number(input.veroeffentlichtseit ?? 30);
  const params = new URLSearchParams();
  if (was) params.set("was", was);
  if (wo) params.set("wo", wo);
  params.set("umkreis", String(umkreis));
  params.set("page", String(page));
  params.set("size", String(size));
  params.set("veroeffentlichtseit", String(veroeffentlichtseit));
  const baJson = await baFetchJson(env, `/pc/v4/jobs?${params.toString()}`);
  const jobs = baJson && (baJson.stellenangebote || baJson.stellenAngebote || baJson.jobs || baJson.items) || (Array.isArray(baJson) ? baJson : []);
  if (!Array.isArray(jobs)) throw new Error(`Unexpected BA response shape: ${baJson ? Object.keys(baJson) : "null"}`);
  const rawRows = [];
  const normRows = [];
  const externalIds = [];
  for (const j of jobs) {
    const externalId = (j.refnr ?? j.refNr ?? j.hashId ?? j.id ?? j.stellenangebotsnummer ?? "").toString();
    if (!externalId) continue;
    externalIds.push(externalId);
    const rawStr = JSON.stringify(j);
    const payloadHash = await sha256Hex(rawStr);
    rawRows.push({ source_id: sourceId, external_job_id: externalId, raw_payload: j, payload_hash: payloadHash });
    const title = (j.titel ?? j.title ?? j.bezeichnung ?? "").toString().trim();
    const company = (j.arbeitgeber ?? j.arbeitgebername ?? j.company ?? j.firma ?? "").toString().trim();
    const ort = (j.arbeitsort?.ort ?? j.arbeitsort?.stadt ?? j.ort ?? j.city ?? "").toString().trim();
    const region = (j.arbeitsort?.region ?? j.arbeitsort?.bundesland ?? j.region ?? "").toString().trim();
    const publicBase = getPublicBaseUrl(requestForBase || new Request("https://jobmejob.com/"), env) || "https://jobmejob.com";
    const applyUrl = `${publicBase}/jobs/de/${encodeURIComponent(externalId)}`;
    const postedAtRaw = j.aktuelleVeroeffentlichungsdatum ?? j.veroeffentlichungsdatum ?? j.date ?? null;
    const modTsRaw = j.modifikationsTimestamp ?? j.modifikationsZeitpunkt ?? j.aenderungsdatum ?? j.aenderungsdatumZeitpunkt ?? j.modificationTimestamp ?? null;
    let sourceModifiedAt = null;
    if (modTsRaw) {
      const d = new Date(modTsRaw);
      if (!Number.isNaN(d.getTime())) {
        sourceModifiedAt = d.toISOString();
      } else {
        const m = String(modTsRaw).match(/^(\d{4}-\d{2}-\d{2})/);
        if (m) {
          const d2 = /* @__PURE__ */ new Date(m[1] + "T00:00:00Z");
          if (!Number.isNaN(d2.getTime())) sourceModifiedAt = d2.toISOString();
        }
      }
    }
    normRows.push({
      source_id: sourceId,
      external_job_id: externalId,
      title: title || "Unknown title",
      title_normalized: normalizeTitle(title || "Unknown title"),
      company_name: company || null,
      country: "DE",
      city: ort || null,
      region: region || null,
      employment_type: j.arbeitszeit?.toString?.() ?? j.arbeitszeitmodell ?? null,
      seniority: null,
      description_snippet: (j.kurzbeschreibung ?? j.beschreibungKurz ?? "").toString().slice(0, 500) || null,
      apply_url: applyUrl,
      posted_at: postedAtRaw ? new Date(postedAtRaw).toISOString() : null,
      source_modified_at: sourceModifiedAt,
      status: "active"
    });
  }
  const rawCount = await upsertRawJobs(env, rawRows);
  const normCount = await upsertNormalizedJobs(env, normRows);
  return {
    was,
    wo,
    umkreis,
    page,
    size,
    veroeffentlichtseit,
    fetched: jobs.length,
    inserted_raw: rawCount,
    upserted_normalized: normCount,
    external_ids: externalIds
  };
}
__name(ingestBaOnce, "ingestBaOnce");
export {
  jobmejob_worker_default as default
};
//# sourceMappingURL=jobmejob-worker.js.map
