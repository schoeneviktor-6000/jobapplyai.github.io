// Cloudflare Worker: JobApplyAI API
// Endpoints:
// GET  /health
// POST /customers/upsert                 (PUBLIC - for website signup)
// POST /customer-profiles/upsert         (PUBLIC - legacy; prefer /me/profile)
// POST /customer-plans/upsert            (PUBLIC - legacy; prefer /me/plan)
// GET  /customers/search?email=test@example.com
// GET  /jobs/search?country=DE&q=analyst&city=Berlin&limit=25&email=test@example.com
// POST /ingest/ba
// POST /customers/<customer_id>/fetch-jobs
// GET  /customers/<customer_id>/jobs/queue
// GET  /customers/<customer_id>/applications/summary     <-- admin
// GET  /me/jobs/queue                                   <-- customer (Supabase auth)
// GET  /me/jobs/description?job_id=<uuid>               <-- customer (Supabase auth)  [NEW]
// GET  /me/applications/summary                          <-- customer (Supabase auth)
// GET  /me/profile                                       <-- customer (Supabase auth)  [NEW]
// POST /me/profile                                      <-- customer (Supabase auth)  [NEW]
// GET  /me/plan                                          <-- customer (Supabase auth)  [NEW]
// POST /me/plan                                         <-- customer (Supabase auth)  [NEW]
// GET  /me/cv                                            <-- customer (Supabase auth)
// POST /me/cv                                           <-- customer (Supabase auth)
// POST /me/cv/suggest-titles                             <-- customer (Supabase auth)
// POST /me/cv/tailor                                    <-- customer (Supabase auth)  [NEW]
// POST /me/cv/tailor_from_text                          <-- customer (Supabase auth)  [NEW]
// GET  /me/cv/tailored?job_id=<uuid>&job_ids=<uuid,uuid,...>  <-- customer (Supabase auth)  [NEW]
// POST /me/cv/ocr                                       <-- start OCR job
// GET  /me/cv/ocr/status                                 <-- poll OCR + save text
// GET  /me/cv/ocr/text                                   <-- fetch OCR text (from DB or GCS)
//
// Required Worker Secrets/Vars (Cloudflare -> Worker -> Settings -> Variables):
// SUPABASE_URL (Text)
// SUPABASE_SERVICE_ROLE_KEY (Secret)  -> sb_secret_... from Supabase
// SUPABASE_ANON_KEY (Text)            -> Supabase anon key (used to validate access token via /auth/v1/user)
// BA_API_KEY (Text) -> "jobboerse-jobsuche" (legacy; optional fallback)
// BA_CLIENT_ID (Secret/Text) -> your BA OAuth client_id
// BA_CLIENT_SECRET (Secret) -> your BA OAuth client_secret
// BA_TOKEN_URL (Text) -> default "https://rest.arbeitsagentur.de/oauth/gettoken_cc"
// BA_API_BASE (Text) -> default "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service"
// WORKER_ADMIN_TOKEN (Secret)         -> any strong random string
//
// Optional vars:
// CRON_ENABLED (Text) "true" | "false"
// CRON_MAX_CUSTOMERS (Text) default 200
// CV_BUCKET (Text) default "cvs"
// CV_MAX_BYTES (Text) default 5242880 (5MB)
//
// OCR / GCP vars:
// GCP_PROJECT_ID (Text) ex: "jobapplyai-auth"
// GCP_LOCATION (Text) ex: "eu" or "us"
// GCP_SA_KEY_JSON (Secret/Text) full service-account json
// GCP_GCS_BUCKET (Text) ex: "jobapplyai-ocr-eu"
// GCP_GCS_INPUT_PREFIX (Text) default "input"
// GCP_GCS_OUTPUT_PREFIX (Text) default "output"
// OCR_MAX_PDF_BYTES (Text) default 10485760 (10MB)

export default {
  async fetch(request, env) {
  const url = new URL(request.url);
  
  if (request.method === "OPTIONS") {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  
  try {
  // Root
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
  "GET /me/jobs/queue",
  "GET /me/jobs/description?job_id=<uuid>",
  "GET /me/applications/summary",
  "GET /me/profile",
  "POST /me/profile",
  "GET /me/plan",
  "POST /me/plan",
  "GET /me/cv",
  "POST /me/cv",
  "POST /me/cv/suggest-titles",
  "POST /me/cv/tailor",
  "POST /me/cv/tailor_from_text",
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
  
  // Health
  if (url.pathname === "/health" && request.method === "GET") {
  return json(request, { ok: true, service: "jobapplyai-api" }, 200);
  }
  
  // Public
  if ((url.pathname === "/customers/upsert" || url.pathname === "/api/customers/upsert") && request.method === "POST") {
  return await handleCustomerUpsertPublic(request, env);
  }
  if (url.pathname === "/customer-profiles/upsert" && request.method === "POST") {
  return await handleCustomerProfileUpsertPublic(request, env);
  }
  if (url.pathname === "/customer-plans/upsert" && request.method === "POST") {
  return await handleCustomerPlanUpsertPublic(request, env);
  }
  
  // Customer (/me)
  if ((url.pathname === "/me/applications/summary" || url.pathname === "/api/me/applications/summary") && request.method === "GET") {
  return await handleMeApplicationsSummary(request, env);
  }
  if (url.pathname === "/me/jobs/queue" && request.method === "GET") {
  return await handleMeJobsQueue(request, env);
  }
  if ((url.pathname === "/me/jobs/description" || url.pathname === "/api/me/jobs/description") && request.method === "GET") {
    return await handleMeJobsDescription(request, env);
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
  if (
    (
      url.pathname === "/me/cv/tailor_from_text" ||
      url.pathname === "/api/me/cv/tailor_from_text" ||
      url.pathname === "/me/cv/tailor-from-text" ||
      url.pathname === "/api/me/cv/tailor-from-text" ||
      url.pathname === "/me/cv/tailor_text" ||
      url.pathname === "/api/me/cv/tailor_text"
    ) &&
    request.method === "POST"
  ) {
    return await handleMeCvTailorFromText(request, env);
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
  // Back-compat alias
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
      
  // Admin / team
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
  // Manual fetch (admin token): POST /fetch-jobs/manual or /admin/fetch-jobs
  if ((url.pathname === "/fetch-jobs/manual" || url.pathname === "/admin/fetch-jobs") && request.method === "POST") {
  return await handleManualFetchJobs(request, env);
  }
  // Ingest
  if (url.pathname === "/ingest/ba" && request.method === "POST") {
  return await handleIngestBA(request, env);
  }
  
  // Job details page
  if (url.pathname.startsWith("/jobs/de/") && request.method === "GET") {
  return await handleDEJobDetails(url, env, request);
  }
  
  // Mark application (admin token)
  if (url.pathname === "/applications/mark" && request.method === "POST") {
  return await handleMarkApplication(request, env);
  }
  
  return json(request, { error: "Not found" }, 404);
  } catch (err) {
  const details = err && err.stack ? String(err.stack) : String(err);
  return json(request, { error: "Unhandled error", details }, 500);
  }
  },
  
  async scheduled(event, env, ctx) {
  if ((env.CRON_ENABLED || "true").toLowerCase() !== "true") return;
  ctx.waitUntil(runNightlyCron(env));
  }
  };
  
  /* -----------------------------
  CORS + response helpers
  ----------------------------- */
  
  function corsHeaders(request) {
  // Allow browser calls from your production + preview domains
  const ALLOWED_ORIGINS = new Set([
    "https://jobmejob.com",
    "https://www.jobmejob.com",
    "https://jobmejob.pages.dev",

    // Team/workplace frontends (add as you migrate)
    "https://workplace.jobmejob.com",
    "https://team.jobmejob.com",
    "https://jobapplyai-workplace.pages.dev",
    "https://schoeneviktor-6000.github.io",

    // Optional local dev
    "http://localhost:8787",
    "http://localhost:5173",
    "http://localhost:3000",
  ]);

  let origin = "";
  try {
    origin = request?.headers?.get("Origin") || "";
  } catch {
    origin = "";
  }

  // If the request comes from an allowed origin, echo it back.
  // If there is no Origin header (server-to-server), allow "*".
  const allowOrigin = origin
    ? (ALLOWED_ORIGINS.has(origin) ? origin : "null")
    : "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-token",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function clampInt(val, min, max, fallback){
  const n = Number.parseInt(String(val ?? ""), 10);
  if (Number.isNaN(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}


function withCors(request, headers = {}) {
  try {
    return { ...headers, ...corsHeaders(request) };
  } catch {
    return { ...headers, "Access-Control-Allow-Origin": "*" };
  }
}

function json(request, body, status = 200) {
  const headers = withCors(request, { "Content-Type": "application/json" });
  return new Response(JSON.stringify(body), { status, headers });
}


function jsonResponse(body, status = 200, request = null) {
  // Standalone JSON helper for handlers that don't want to thread `request` everywhere.
  const base = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization,content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  };
  const headers = request ? withCors(request, base) : base;
  return new Response(JSON.stringify(body), { status, headers });
}

function textResponse(request, text, status = 200) {
  const headers = withCors(request, { "Content-Type": "text/plain; charset=utf-8" });
  return new Response(text, { status, headers });
}

function mustEnv(env, name) {
  const v = (env[name] || "").trim();
  if (!v) throw new Error(`Missing env var/secret: ${name}`);
  return v;
  }
  
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
  
  function escapeForPostgrestLike(s) {
  return s.replace(/[()*]/g, "").replace(/%/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
  }
  
  function normalizeTitle(title) {
  if (!title) return "";
  return title
  .toLowerCase()
  .replace(/\(m\/w\/d\)/g, "")
  .replace(/\(w\/m\/d\)/g, "")
  .replace(/\(m\/f\/d\)/g, "")
  .replace(/\[.*?\]/g, "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, 200);
  }
  
  function clamp(n, min, max) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.min(Math.max(x, min), max);
  }


// -----------------------------
// Crypto helper: SHA-256 (hex)
// Used for deterministic source_hash / payload_hash dedupe keys.
// -----------------------------
async function sha256Hex(input) {
const data = new TextEncoder().encode(String(input ?? ""));
const hashBuf = await crypto.subtle.digest("SHA-256", data);
const hashArr = Array.from(new Uint8Array(hashBuf));
return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// -----------------------------
// Public base URL helper
// Used to build links (e.g., /jobs/de/<refnr>) without hardcoding old domains.
// Priority:
// 1) env.PUBLIC_API_BASE (recommended, e.g. https://api.jobmejob.com)
// 2) request origin (scheme + host)
// -----------------------------
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

function scoreJobAgainstTitles(job, desiredTitles, excludeTitles) {
  const title = String(job?.title || "").toLowerCase();
  const tnorm = String(job?.title_normalized || "").toLowerCase();
  const desc = String(job?.description_snippet || "").toLowerCase();

  const desired = (desiredTitles || []).map((x) => String(x || "").trim()).filter(Boolean);
  const excluded = (excludeTitles || []).map((x) => String(x || "").trim()).filter(Boolean);

  let score = 0;

  // Strong penalty for excluded titles/keywords
  for (const ex of excluded) {
    const exL = ex.toLowerCase();
    if (!exL) continue;
    if (title.includes(exL) || tnorm.includes(exL) || desc.includes(exL)) score -= 50;
  }

  // Positive scoring
  for (const d of desired) {
    const dL = d.toLowerCase();
    if (!dL) continue;

    if (title.includes(dL)) score += 20;
    if (tnorm.includes(dL)) score += 18;
    if (desc.includes(dL)) score += 6;
  }

  // Tiny quality proxies
  if (job?.company_name) score += 1;
  if (job?.posted_at) score += 1;

  return score;
}

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
  

/* -----------------------------
BA OAuth helpers (Jobsuche-service)

NOTE: We currently use BA_API_KEY (X-API-Key: jobboerse-jobsuche) for job fetching,
because BA OAuth token retrieval can return 403 in server-to-server contexts.
The OAuth code is kept here for future use, but baFetchJson() does NOT call it right now.
----------------------------- */

let BA_TOKEN_CACHE = null; 
// { token: string, expiresAtMs: number }

async function getBaAccessToken(env) {
  const clientId = (env.BA_CLIENT_ID || "").trim();
  const clientSecret = (env.BA_CLIENT_SECRET || "").trim();
  const tokenUrl = (env.BA_TOKEN_URL || "https://rest.arbeitsagentur.de/oauth/gettoken_cc").trim();

  if (!clientId || !clientSecret) {
    throw new Error("BA OAuth not configured (missing BA_CLIENT_ID / BA_CLIENT_SECRET)");
  }

  const now = Date.now();
  if (BA_TOKEN_CACHE && BA_TOKEN_CACHE.expiresAtMs > now) return BA_TOKEN_CACHE.token;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials"
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`BA token error ${res.status}: ${text}`);

  const data = text ? JSON.parse(text) : null;
  const token = data?.access_token;
  const expiresIn = Number(data?.expires_in || 900);

  if (!token) throw new Error(`BA token missing access_token: ${text}`);

  // refresh 60 seconds early to avoid expiry during batch
  BA_TOKEN_CACHE = {
    token,
    expiresAtMs: now + Math.max(60, expiresIn - 60) * 1000
  };

  return token;
}

async function baFetchJson(env, pathWithQuery) {
  const base = (env.BA_API_BASE || "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service").trim().replace(/\/$/, "");
  const url = `${base}${pathWithQuery.startsWith("/") ? "" : "/"}${pathWithQuery}`;

  // Use BA_API_KEY (jobboerse-jobsuche) for now. This avoids the OAuth token flow which can return 403.
  const baKey = (env.BA_API_KEY || "jobboerse-jobsuche").trim();

  const headers = {
    accept: "application/json",
    "X-API-Key": baKey,
    // These are harmless for the API-key flow and can help avoid edge filtering.
    "Accept-Language": "de-de",
    "User-Agent": "Jobsuche/1070 CFNetwork/1220.1 Darwin/20.3.0",
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

/* -----------------------------
  BA website jobdetail scraper

  Why: The BA REST jobdetails endpoint can return 403 from non-browser clients.
  Workaround: Fetch the public jobdetail HTML page and parse <script id="ng-state" type="application/json">.

  Output: description text (stellenangebotsBeschreibung) + metadata.
----------------------------- */

async function baFetchWebsiteJobdetail(env, refnr) {
  const base = (env.BA_WEBSITE_BASE || "https://www.arbeitsagentur.de").trim().replace(/\/$/, "");
  const url = `${base}/jobsuche/jobdetail/${encodeURIComponent(refnr)}`;

  const headers = {
    "User-Agent": (env.BA_WEBSITE_USER_AGENT || "Mozilla/5.0 (compatible; JobApplyAI/1.0; +https://jobmejob.com)").trim(),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
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

  const jd = state && (state.jobdetail || state.jobDetails || state.jobdetails)
    ? (state.jobdetail || state.jobDetails || state.jobdetails)
    : null;

  const description = (jd && (
    jd.stellenangebotsBeschreibung ||
    jd.stellenangebotsBeschreibungText ||
    jd.stellenbeschreibung ||
    jd.stellenbeschreibungText
  )) || "";

  const title = (jd && (
    jd.stellenangebotsTitel ||
    jd.titel ||
    jd.stellenbezeichnung
  )) || "";

  // BA jobdetail includes an "aenderungsdatum" (last changed) field in the SSR JSON.
  // We use it as an additional signal for "last employer update".
  const modifiedAtRaw = (jd && (
    jd.aenderungsdatum ||
    jd.aenderungsdatumZeitpunkt ||
    jd.modifikationsTimestamp ||
    jd.modifikationsZeitpunkt
  )) || null;

  let modifiedAt = null;
  if (modifiedAtRaw) {
    const d = new Date(modifiedAtRaw);
    if (!Number.isNaN(d.getTime())) {
      modifiedAt = d.toISOString();
    } else {
      const m = String(modifiedAtRaw).match(/^(\d{4}-\d{2}-\d{2})/);
      if (m) {
        const d2 = new Date(m[1] + "T00:00:00Z");
        if (!Number.isNaN(d2.getTime())) modifiedAt = d2.toISOString();
      }
    }
  }

  return {
    url,
    source: "ba_website_ng_state",
    title,
    description,
    modified_at: modifiedAt,
  };
}

function extractNgStateJsonFromHtml(html) {
  if (!html) return "";

  // Fast path: exact marker
  const marker = '<script id="ng-state" type="application/json">';
  const idx = html.indexOf(marker);
  if (idx !== -1) {
    const start = idx + marker.length;
    const end = html.indexOf("</script>", start);
    if (end !== -1) return html.slice(start, end).trim();
  }

  // Fallback: tolerate attribute ordering / whitespace
  const m = html.match(/<script[^>]*id=["']ng-state["'][^>]*>([\s\S]*?)<\/script>/i);
  if (m && m[1]) return m[1].trim();

  return "";
}

function parseIsoToMs(v) {
  if (!v) return 0;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : 0;
}

async function ensureBaJobDescriptionCached(env, jobRow, { ttlHours = 336 } = {}) {
  const job = jobRow;
  const now = Date.now();
  const ttlMs = Math.max(1, ttlHours) * 3600 * 1000;

  const existing = String(job.description_full || "").trim();
  const fetchedAtMs = parseIsoToMs(job.description_full_fetched_at);
  if (existing && fetchedAtMs && (now - fetchedAtMs) < ttlMs) {
    return { status: "cached", from_cache: true, fetched: false, job };
  }

  // Backoff if we failed recently (avoid hammering BA if they block)
  const err = String(job.description_full_error || "").trim();
  const errAtMs = parseIsoToMs(job.description_full_error_at);
  const backoffMs = 24 * 3600 * 1000;
  if (!existing && err && errAtMs && (now - errAtMs) < backoffMs) {
    return { status: "failed_recently", from_cache: true, fetched: false, job, error: err };
  }

  const refnr = String(job.external_job_id || "").trim();
  if (!refnr) {
    return { status: "failed", from_cache: false, fetched: false, job, error: "Job missing external_job_id" };
  }

  // Only BA refs are fetchable via the public BA jobdetail page.
  // For other sources, we keep existing description_* fields as-is.
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
      description_full_fetched_at: new Date().toISOString(),
      description_full_error: null,
      description_full_error_at: null,
    };

    // If available, also persist the BA "last modified" timestamp from the jobdetail SSR JSON.
    if (details.modified_at) {
      patch.source_modified_at = details.modified_at;
    }

    await supabaseFetch(env, `/rest/v1/jobs_normalized?id=eq.${encodeURIComponent(job.id)}`, {
      method: "PATCH",
      body: patch,
      headers: { Prefer: "return=minimal" },
    });

    return { status: "fetched", from_cache: false, fetched: true, job: { ...job, ...patch } };
  } catch (e) {
    const errMsg = String(e && e.message ? e.message : e).slice(0, 400);

    const patch = {
      description_full_error: errMsg,
      description_full_error_at: new Date().toISOString(),
    };

    try {
      await supabaseFetch(env, `/rest/v1/jobs_normalized?id=eq.${encodeURIComponent(job.id)}`, {
        method: "PATCH",
        body: patch,
        headers: { Prefer: "return=minimal" },
      });
    } catch {}

    return { status: "failed", from_cache: false, fetched: false, job: { ...job, ...patch }, error: errMsg };
  }
}


function isAdminAuthorized(request, env) {
  const adminToken = (env.WORKER_ADMIN_TOKEN || "").trim();
  if (!adminToken) return false;
  
  const incomingX = (request.headers.get("x-admin-token") || "").trim();
  if (incomingX && incomingX === adminToken) return true;
  
  const auth = (request.headers.get("Authorization") || "").trim();
  if (auth && auth === `Bearer ${adminToken}`) return true;
  
  return false;
  }
  
  function looksLikeUuid(s) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s);
  }
  
  function looksLikeEmail(s) {
  if (!s) return false;
  const v = String(s).trim();
  if (v.length < 5 || v.length > 200) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
  
  /* -----------------------------
  Profile input helpers
  ----------------------------- */
  
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
  
  function normRadiusKm(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  if (n > 500) return 500;
  return Math.round(n);
  }
  
  /* -----------------------------
  Supabase REST helpers
  ----------------------------- */
  
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

  // -----------------------------
  // Role clusters: DB cache + matching helpers
  // -----------------------------
  let ROLE_CLUSTER_CACHE = { data: null, expiresAt: 0 };

  function normalizeToken(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[(){}\[\],.]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function buildSkillBag(aiResult) {
    const core = (aiResult?.skills?.core || []).map(normalizeToken);
    const supporting = (aiResult?.skills?.supporting || []).map(normalizeToken);
    const tools = (aiResult?.skills?.tools || []).map(normalizeToken);
    const all = [...core, ...supporting, ...tools].filter(Boolean);

    const tokens = new Set();
    const phrases = new Set();
    for (const phrase of all) {
      phrases.add(phrase);
      for (const t of phrase.split(" ")) tokens.add(t);
    }
    return { phrases, tokens };
  }

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

  function suggestByRoleClusters(aiResult, clusters, opts = {}) {
    const minClusterScore = opts.minClusterScore ?? 0.20;
    const maxClusters = opts.maxClusters ?? 3;
    const maxAltTitles = opts.maxAltTitles ?? 5;

    const primaryTitles = new Set(
      (aiResult?.primary_job_titles || []).map(x => normalizeToken(x?.title))
    );

    const skillBag = buildSkillBag(aiResult);

    const ranked = (clusters || [])
      .map(c => {
        const { score, hit, penalty } = scoreCluster(c, skillBag);
        return { id: c.id, label: c.label, score, hit, penalty, titles: c.titles || [] };
      })
      .filter(x => x.score >= minClusterScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxClusters);

    const altTitles = [];
    const seen = new Set();

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

  async function loadRoleClusters(env, ttlMs = 10 * 60 * 1000) {
    const now = Date.now();
    if (ROLE_CLUSTER_CACHE.data && now < ROLE_CLUSTER_CACHE.expiresAt) return ROLE_CLUSTER_CACHE.data;

    const q = new URLSearchParams();
    q.set("select", "id,label,titles,skill_keywords,negative_keywords,is_active,version,updated_at");
    q.set("is_active", "eq.true");
    q.set("limit", "200");

    const rows = await supabaseFetch(env, `/rest/v1/role_clusters?${q.toString()}`, { method: "GET" });
    const clusters = (Array.isArray(rows) ? rows : []).map(r => ({
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

  
  /* -----------------------------
  Supabase Auth helper (customer /me/* endpoints)
  Validates Supabase access token by calling /auth/v1/user
  ----------------------------- */
  
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
  
  
async function ensureCustomerBootstrap(env, email) {
  const e = String(email || "").trim().toLowerCase();
  if (!looksLikeEmail(e)) throw new Error("Invalid email for bootstrap");

  // 1) Upsert customer by email
  await supabaseFetch(env, `/rest/v1/customers?on_conflict=email`, {
    method: "POST",
    body: [{ email: e, full_name: null }],
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });

  // 2) Load customer id
  const qCust = new URLSearchParams();
  qCust.set("select", "id,email,created_at");
  qCust.set("email", `eq.${e}`);
  qCust.set("limit", "1");

  const customers = await supabaseFetch(env, `/rest/v1/customers?${qCust.toString()}`, { method: "GET" });
  if (!Array.isArray(customers) || customers.length === 0) throw new Error("Customer lookup failed after upsert");
  const customerId = customers[0].id;

  const now = new Date().toISOString();

  // 3) Ensure profile row exists (ignore duplicates)
  await supabaseFetch(env, `/rest/v1/customer_profiles?on_conflict=customer_id`, {
    method: "POST",
    body: [{ customer_id: customerId, updated_at: now }],
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }
  });

  // 4) Ensure plan row exists (default starter; ignore duplicates)
  await supabaseFetch(env, `/rest/v1/customer_plans?on_conflict=customer_id`, {
    method: "POST",
    body: [{ customer_id: customerId, plan_id: "starter", updated_at: now }],
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" }
  });

  return { customerId };
}

async function enqueueJobsForCustomer(env, customerId, jobIds, appliedBy = "system", queuedMeta = null) {
    const ids = Array.isArray(jobIds) ? jobIds.filter(Boolean) : [];
    if (!ids.length) return 0;
    
    // Find existing applications for these jobIds
    const qExisting = new URLSearchParams();
    qExisting.set("select", "job_id");
    qExisting.set("customer_id", `eq.${customerId}`);
    qExisting.set("job_id", `in.(${ids.map((id) => `"${String(id).trim()}"`).join(",")})`);
    qExisting.set("limit", String(ids.length));
    
    const existing = await supabaseFetch(env, `/rest/v1/applications?${qExisting.toString()}`, { method: "GET" });
    const existingSet = new Set((existing || []).map((r) => r.job_id));
    
    const newJobIds = ids.filter((id) => !existingSet.has(id));
    if (!newJobIds.length) return 0;
    
    const now = new Date().toISOString();
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


    // Log queued events (bulk insert to avoid Cloudflare subrequest limits)
    try{
      const evRows = newJobIds.map((jobId)=>({
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
    }catch(e){
      // non-blocking
    }

    return rows.length;


    }
    
  
  async function getSourceId(env, name, country) {
  const q = new URLSearchParams();
  q.set("select", "id");
  q.set("name", `eq.${name}`);
  q.set("country", `eq.${country}`);
  const data = await supabaseFetch(env, `/rest/v1/sources?${q.toString()}`, { method: "GET" });
  if (!Array.isArray(data) || data.length === 0) throw new Error(`Source not found in DB: ${name} ${country}`);
  return data[0].id;
  }
  
  async function upsertRawJobs(env, rows) {
  if (!rows.length) return 0;
  await supabaseFetch(env, `/rest/v1/raw_jobs?on_conflict=source_id,external_job_id`, {
  method: "POST",
  body: rows,
  headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
  return rows.length;
  }
  
async function upsertNormalizedJobs(env, rows) {
  if (!rows.length) return 0;
  await supabaseFetch(env, `/rest/v1/jobs_normalized?on_conflict=source_id,external_job_id`, {
  method: "POST",
  body: rows,
  headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
  return rows.length;
  }

async function ensureCvStudioImportSourceId(env) {
  const name = "CV Studio Import";
  const country = "GLOBAL";

  const q = new URLSearchParams();
  q.set("select", "id");
  q.set("name", `eq.${name}`);
  q.set("country", `eq.${country}`);
  q.set("limit", "1");

  const existing = await supabaseFetch(env, `/rest/v1/sources?${q.toString()}`, { method: "GET" });
  if (Array.isArray(existing) && existing.length && existing[0]?.id) {
    return existing[0].id;
  }

  await supabaseFetch(env, `/rest/v1/sources?on_conflict=name,country`, {
    method: "POST",
    body: [{
      name,
      country,
      api_type: "manual",
      auth_type: "none",
      base_url: "https://jobmejob.com/cv",
      enabled: true
    }],
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });

  const rows = await supabaseFetch(env, `/rest/v1/sources?${q.toString()}`, { method: "GET" });
  if (Array.isArray(rows) && rows.length && rows[0]?.id) {
    return rows[0].id;
  }

  throw new Error("Failed to resolve CV Studio import source");
}

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
  const compositeHash = await sha256Hex([
    title,
    company || "",
    safeApplyUrl || "",
    descHash
  ].join("|"));
  const externalJobId = `cvstudio_${compositeHash.slice(0, 48)}`;
  const now = new Date().toISOString();

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
  if (!job?.id) {
    throw new Error("Failed to create imported CV Studio job");
  }

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
  
  /* -----------------------------
  PUBLIC: POST /customers/upsert
  ----------------------------- */
  
  async function handleCustomerUpsertPublic(request, env) {
  let body = null;
  try {
    body = await request.json();
  } catch {
    return json(request, { error: "Invalid JSON body" }, 400);
  }

  const email = (body?.email || "").toString().trim().toLowerCase();
  if (!looksLikeEmail(email)) {
    return json(request, { error: "Valid email is required" }, 400);
  }

  // Bootstrap: customers + default profile + default plan
  const boot = await ensureCustomerBootstrap(env, email);

  // Return customer record
  const qCust = new URLSearchParams();
  qCust.set("select", "id,email,created_at");
  qCust.set("id", `eq.${boot.customerId}`);
  qCust.set("limit", "1");

  const customers = await supabaseFetch(env, `/rest/v1/customers?${qCust.toString()}`, { method: "GET" });
  if (!Array.isArray(customers) || customers.length === 0) {
    return json(request, { error: "Customer lookup failed after bootstrap", email }, 500);
  }

  const c = customers[0];
  return json(request, { ok: true, email: c.email, customer_id: c.id, created_at: c.created_at }, 200);
}

// PUBLIC: POST /customer-profiles/upsert (legacy)


  
  async function handleCustomerProfileUpsertPublic(request, env) {
  let body = null;
  try {
  body = await request.json();
  } catch {
  return json(request, { error: "Invalid JSON body" }, 400);
  }
  
  const customer_id = (body?.customer_id || "").toString().trim();
  if (!looksLikeUuid(customer_id)) {
  return json(request, { error: "Valid customer_id (uuid) is required" }, 400);
  }
  
  const desired_titles = normStringArray(body?.desired_titles, { maxItems: 30, maxLen: 120 });
  const exclude_titles = normStringArray(body?.exclude_titles, { maxItems: 30, maxLen: 120 });
  const industries = normStringArray(body?.industries, { maxItems: 30, maxLen: 120 });
  const countries_allowed = normStringArray(body?.countries_allowed, { maxItems: 20, maxLen: 80 });
  const locations = normStringArray(body?.locations, { maxItems: 20, maxLen: 120 });
  const language_requirements = normStringArray(body?.language_requirements, { maxItems: 10, maxLen: 80 });
  const seniority = normStringArray(body?.seniority, { maxItems: 10, maxLen: 80 });
  const work_type = normStringArray(body?.work_type, { maxItems: 10, maxLen: 80 });
  
  const radius_km = normRadiusKm(body?.radius_km);
  const salary_min =
  body?.salary_min === null || body?.salary_min === undefined || body?.salary_min === ""
  ? null
  : Number.isFinite(Number(body?.salary_min))
  ? Math.max(0, Math.round(Number(body?.salary_min)))
  : null;
  
  const row = {
  customer_id,
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
  updated_at: new Date().toISOString()
  };
  
  await supabaseFetch(env, `/rest/v1/customer_profiles?on_conflict=customer_id`, {
  method: "POST",
  body: [row],
  headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
  
  return json(request, { ok: true, customer_id }, 200);
  }
  
  /* -----------------------------
  PUBLIC: POST /customer-plans/upsert (legacy)
  ----------------------------- */
  
  async function handleCustomerPlanUpsertPublic(request, env) {
  let body = null;
  try {
  body = await request.json();
  } catch {
  return json(request, { error: "Invalid JSON body" }, 400);
  }
  
  const customer_id = (body?.customer_id || "").toString().trim();
  if (!looksLikeUuid(customer_id)) {
  return json(request, { error: "Valid customer_id (uuid) is required" }, 400);
  }
  
  const plan_id = (body?.plan_id || "").toString().trim().toLowerCase();
  const allowed = new Set(["starter", "pro", "max", "cv_starter", "cv_plus", "cv_unlimited"]);
  if (!allowed.has(plan_id)) {
  return json(request, { error: "Invalid plan_id", allowed: Array.from(allowed) }, 400);
  }
  
  const row = { customer_id, plan_id, updated_at: new Date().toISOString() };
  
  await supabaseFetch(env, `/rest/v1/customer_plans?on_conflict=customer_id`, {
  method: "POST",
  body: [row],
  headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
  
  return json(request, { ok: true, customer_id, plan_id }, 200);
  }
  
  /* -----------------------------
  CUSTOMER auth: shared helper
  ----------------------------- */
  
  async function requireMeCustomerId(request, env) {
  const user = await getSupabaseUserFromAuthHeader(request, env);
  if (!user?.email) return { ok: false, res: json(request, { error: "Unauthorized" }, 401) };

  const email = String(user.email || "").trim().toLowerCase();
  let customerId = await getCustomerIdForSupabaseUserEmail(env, email);

  // Auto-bootstrap for any authenticated user (fixes old/new accounts)
  if (!customerId) {
    const boot = await ensureCustomerBootstrap(env, email);
    customerId = boot.customerId;
  }

  return { ok: true, customerId, email };
}

/* -----------------------------
  CUSTOMER: GET /me/profile (NEW)
  ----------------------------- */
  
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
  
  /* -----------------------------
  CUSTOMER: POST /me/profile (NEW)
  ----------------------------- */
  
  async function handleMeProfileUpsert(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  
  let body = null;
  try {
  body = await request.json();
  } catch {
  return json(request, { error: "Invalid JSON body" }, 400);
  }
  
  const desired_titles = normStringArray(body?.desired_titles, { maxItems: 30, maxLen: 120 });
  const exclude_titles = normStringArray(body?.exclude_titles, { maxItems: 30, maxLen: 120 });
  const industries = normStringArray(body?.industries, { maxItems: 30, maxLen: 120 });
  const countries_allowed = normStringArray(body?.countries_allowed, { maxItems: 20, maxLen: 80 });
  const locations = normStringArray(body?.locations, { maxItems: 20, maxLen: 120 });
  const language_requirements = normStringArray(body?.language_requirements, { maxItems: 10, maxLen: 80 });
  const seniority = normStringArray(body?.seniority, { maxItems: 10, maxLen: 80 });
  const work_type = normStringArray(body?.work_type, { maxItems: 10, maxLen: 80 });
  
  const radius_km = normRadiusKm(body?.radius_km);
  const salary_min =
  body?.salary_min === null || body?.salary_min === undefined || body?.salary_min === ""
  ? null
  : Number.isFinite(Number(body?.salary_min))
  ? Math.max(0, Math.round(Number(body?.salary_min)))
  : null;
  
  const row = {
  customer_id: me.customerId,
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
  updated_at: new Date().toISOString()
  };
  
  await supabaseFetch(env, `/rest/v1/customer_profiles?on_conflict=customer_id`, {
  method: "POST",
  body: [row],
  headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
  
  return json(request, { ok: true, me: true, customer_id: me.customerId }, 200);
  }
  
  /* -----------------------------
  CUSTOMER: GET /me/plan (NEW)
  ----------------------------- */
  
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
  
  /* -----------------------------
  CUSTOMER: POST /me/plan (NEW)
  ----------------------------- */
  
  async function handleMePlanUpsert(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  
  let body = null;
  try {
  body = await request.json();
  } catch {
  return json(request, { error: "Invalid JSON body" }, 400);
  }
  
  const plan_id = (body?.plan_id || "").toString().trim().toLowerCase();
  const allowed = new Set(["starter", "pro", "max", "cv_starter", "cv_plus", "cv_unlimited"]);
  if (!allowed.has(plan_id)) {
  return json(request, { error: "Invalid plan_id", allowed: Array.from(allowed) }, 400);
  }
  
  const row = { customer_id: me.customerId, plan_id, updated_at: new Date().toISOString() };
  
  await supabaseFetch(env, `/rest/v1/customer_plans?on_conflict=customer_id`, {
  method: "POST",
  body: [row],
  headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
  
  return json(request, { ok: true, me: true, customer_id: me.customerId, plan_id }, 200);
  }

const CV_STUDIO_PLAN_LIMITS = Object.freeze({
  cv_starter: 10,
  cv_plus: 50,
  cv_unlimited: 0
});

function getCvStudioPlanLimit(planId) {
  return Object.prototype.hasOwnProperty.call(CV_STUDIO_PLAN_LIMITS, planId)
    ? CV_STUDIO_PLAN_LIMITS[planId]
    : null;
}

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

async function resolveCvStudioAccess(env, customerId, planRow = null) {
  const freeLimit = clampInt(env.CV_STUDIO_FREE_LIMIT || "5", 0, 1000, 5);
  const legacyPlanId = planRow?.plan_id ? String(planRow.plan_id).trim().toLowerCase() : null;
  const cvPlanId = getCvStudioPlanLimit(legacyPlanId) !== null ? legacyPlanId : null;
  const paid = !!cvPlanId;
  const cvLimit = cvPlanId ? getCvStudioPlanLimit(cvPlanId) : freeLimit;
  const periodStartedAt = cvPlanId ? (planRow?.updated_at || null) : null;

  const freeRows = await listSuccessfulTailoredCvRows(env, customerId, { limit: freeLimit + 1 });
  const freeUsed = freeRows.length;
  const freeRemaining = freeLimit > 0 ? Math.max(0, freeLimit - freeUsed) : null;

  const paidRows = paid
    ? await listSuccessfulTailoredCvRows(env, customerId, {
        sinceIso: periodStartedAt || null,
        limit: cvLimit > 0 ? (cvLimit + 1) : 1
      })
    : freeRows;
  const paidUsed = paidRows.length;
  const paidRemaining = cvLimit > 0 ? Math.max(0, cvLimit - paidUsed) : null;

  const limit = paid ? cvLimit : freeLimit;
  const used = paid ? paidUsed : freeUsed;
  const remaining = paid ? paidRemaining : freeRemaining;

  return {
    paid,
    legacyPlanId,
    planId: cvPlanId,
    limit,
    used,
    remaining,
    periodStartedAt,
    freeLimit,
    freeUsed,
    freeRemaining
  };
}

function buildCvQuotaExceededBody(access) {
  const paid = !!access?.paid;
  const limit = Number(access?.limit || 0);
  const error = paid && limit > 0
    ? "You've reached your monthly CV Studio quota. Upgrade or wait for the next billing cycle to keep generating."
    : "You've used your 5 free CVs. Upgrade to a CV Studio plan to keep generating.";

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

async function getCustomerPlanRow(env, customerId) {
  const qPlan = new URLSearchParams();
  qPlan.set("select", "customer_id,plan_id,updated_at");
  qPlan.set("customer_id", `eq.${customerId}`);
  qPlan.set("limit", "1");
  const planRows = await supabaseFetch(env, `/rest/v1/customer_plans?${qPlan.toString()}`, { method: "GET" });
  return Array.isArray(planRows) && planRows.length ? planRows[0] : null;
}

async function handleMeStateGet(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;

    const email = me.email;
    const customerId = me.customerId;
    
    const qProf = new URLSearchParams();
    qProf.set("select", "customer_id,desired_titles,locations,updated_at,cv_path,cv_ocr_status,cv_ocr_updated_at");
    qProf.set("customer_id", `eq.${customerId}`);
    qProf.set("limit", "1");
    
    const qPlan = new URLSearchParams();
    qPlan.set("select", "customer_id,plan_id,updated_at");
    qPlan.set("customer_id", `eq.${customerId}`);
    qPlan.set("limit", "1");
    
    const profRows = await supabaseFetch(env, `/rest/v1/customer_profiles?${qProf.toString()}`, { method: "GET" });
    const planRows = await supabaseFetch(env, `/rest/v1/customer_plans?${qPlan.toString()}`, { method: "GET" });
    
    const profile = Array.isArray(profRows) && profRows.length ? profRows[0] : null;
    const plan = Array.isArray(planRows) && planRows.length ? planRows[0] : null;
    
    const desiredTitles = Array.isArray(profile?.desired_titles) ? profile.desired_titles.filter(Boolean) : [];
    const locations = Array.isArray(profile?.locations) ? profile.locations.filter(Boolean) : [];
    
    const profileExists = !!profile;
  const profileComplete = desiredTitles.length > 0 && locations.length > 0;
  
  const planId = plan?.plan_id ? String(plan.plan_id).trim().toLowerCase() : null;
  const cvAccess = await resolveCvStudioAccess(env, customerId, plan);
  
  const cvUploaded = !!(profile?.cv_path);
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
    
  /* -----------------------------
  CUSTOMER: GET /me/applications/summary
  ----------------------------- */
  
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
  async function handleMeApplicationsSkip(request, env) {
    const me = await requireMeCustomerId(request, env);
    if (!me.ok) return me.res;
    
    let body = null;
    try { body = await request.json(); } catch { body = null; }
    if (!body) return json(request, { error: "Invalid JSON body" }, 400);
    
    const job_id = String(body.job_id || "").trim();
    if (!looksLikeUuid(job_id)) return json(request, { error: "job_id must be a valid uuid" }, 400);
    
    const reason_code = String(body.reason_code || "").trim().toLowerCase();
    const allowed = new Set(["not_relevant","too_far","wrong_industry","salary_too_low","already_applied","other",""]);
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
    updated_at: new Date().toISOString()
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
    async function handleMeApplicationsUnskip(request, env) {
      const me = await requireMeCustomerId(request, env);
      if (!me.ok) return me.res;
      
      let body = null;
      try { body = await request.json(); } catch { body = null; }
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
      updated_at: new Date().toISOString()
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
      async function handleMeApplicationEventsList(request, env) {
        const me = await requireMeCustomerId(request, env);
        if (!me.ok) return me.res;
      
        const url = new URL(request.url);
        const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "30", 10) || 30, 1), 100);
        const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10) || 0, 0);
      
        const eventTypeRaw = String(url.searchParams.get("event_type") || "").trim().toLowerCase();
        const allowed = new Set([
          "queued", "drafted", "reviewed", "sent", "replied",
          "applied", "rejected", "skipped", "unskipped",
          "prioritized", "unprioritized", ""
        ]);
        const eventType = allowed.has(eventTypeRaw) ? eventTypeRaw : "";
      
        // 1) Fetch events WITHOUT embedded joins (schema-cache safe)
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
          // Make the error visible (instead of generic "Unhandled error")
          return json(request, { error: "Failed to load application_events", details: String(e) }, 502);
        }
      
        const events = Array.isArray(rows) ? rows : [];
        const jobIds = Array.from(new Set(events.map(r => r.job_id).filter(Boolean)));
      
        // 2) Fetch jobs in one query
        let jobMap = new Map();
        if (jobIds.length) {
          const qJobs = new URLSearchParams();
          qJobs.set("select", "id,title,company_name,country,city,region,apply_url,posted_at");
          qJobs.set("id", `in.(${jobIds.join(",")})`);
          qJobs.set("limit", String(jobIds.length));
      
          try {
            const jobs = await supabaseFetch(env, `/rest/v1/jobs_normalized?${qJobs.toString()}`, { method: "GET" });
            if (Array.isArray(jobs)) {
              jobMap = new Map(jobs.map(j => [j.id, j]));
            }
          } catch (e) {
            // Non-blocking: events still return, just without job
            jobMap = new Map();
          }
        }
      
        // 3) Attach job
        const data = events.map(ev => ({
          id: ev.id,
          event_type: ev.event_type,
          actor: ev.actor || null,
          meta: ev.meta ?? null,
          created_at: ev.created_at || null,
          job_id: ev.job_id || null,
          job: ev.job_id ? (jobMap.get(ev.job_id) || null) : null
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
      // Do not block main flow if event logging fails
      }
      }
      async function handleMeApplicationsPrioritize(request, env) {
        const me = await requireMeCustomerId(request, env);
        if (!me.ok) return me.res;
      
        let body = null;
        try { body = await request.json(); } catch { body = null; }
        if (!body) return json(request, { error: "Invalid JSON body" }, 400);
      
        const job_id = String(body.job_id || "").trim();
        if (!looksLikeUuid(job_id)) return json(request, { error: "job_id must be a valid uuid" }, 400);
      
        const now = new Date().toISOString();
      
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
      
      async function handleMeApplicationsUnprioritize(request, env) {
        const me = await requireMeCustomerId(request, env);
        if (!me.ok) return me.res;
      
        let body = null;
        try { body = await request.json(); } catch { body = null; }
        if (!body) return json(request, { error: "Invalid JSON body" }, 400);
      
        const job_id = String(body.job_id || "").trim();
        if (!looksLikeUuid(job_id)) return json(request, { error: "job_id must be a valid uuid" }, 400);
      
        const now = new Date().toISOString();
      
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
      
  /* -----------------------------
  CUSTOMER: GET /me/jobs/queue
  ----------------------------- */

  async function geminiGenerateJson(env, { model, promptText, temperature = 0.2, maxOutputTokens = 700 }) {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY secret in Worker");

    // Endpoint selection:
    // - vertex:    aiplatform.googleapis.com (Vertex AI publisher models)
    // - aistudio:  generativelanguage.googleapis.com (Gemini API / AI Studio)
    // Default: try Vertex first, then fall back to AI Studio.
    const prefer = String(env.GEMINI_API_BASE || "").trim().toLowerCase();

    const payload = {
      contents: [{ role: "user", parts: [{ text: promptText }] }],
      generationConfig: { temperature, maxOutputTokens }
    };

    async function callVertex() {
      const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(`Vertex Gemini error ${res.status}: ${txt}`);
      const data = JSON.parse(txt);
      return data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
    }

    async function callAiStudio() {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(`AI Studio Gemini error ${res.status}: ${txt}`);
      const data = JSON.parse(txt);
      return data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
    }

    if (prefer === "aistudio" || prefer === "generativelanguage") {
      return await callAiStudio();
    }
    if (prefer === "vertex" || prefer === "aiplatform") {
      return await callVertex();
    }

    // Auto fallback
    try {
      return await callVertex();
    } catch (e1) {
      const msg1 = String(e1 && e1.message ? e1.message : e1);
      try {
        return await callAiStudio();
      } catch (e2) {
        const msg2 = String(e2 && e2.message ? e2.message : e2);
        throw new Error((msg1 + " || " + msg2).slice(0, 1200));
      }
    }
  }

  function parseModelList(value, extraFallback = []) {
    // Accept comma-separated string or array
    const raw = Array.isArray(value) ? value : String(value || '').split(',');
    const out = [];
    const seen = new Set();
    function add(m){
      const v = String(m || '').trim();
      if(!v) return;
      const k = v.toLowerCase();
      if(seen.has(k)) return;
      seen.add(k);
      out.push(v);
    }
    for(const m of raw){ add(m); }
    for(const m of (Array.isArray(extraFallback) ? extraFallback : [extraFallback])){ add(m); }
    return out;
  }

  async function geminiGenerateJsonWithModels(env, { models, promptText, temperature = 0.2, maxOutputTokens = 1400 }) {
    const list = parseModelList(models);
    if(!list.length) throw new Error('No Gemini models configured');

    let lastErr = null;
    for(const model of list){
      try{
        const text = await geminiGenerateJson(env, { model, promptText, temperature, maxOutputTokens });
        const parsed = safeJsonParse(text);
        return { model, parsed, rawText: text };
      }catch(e){
        lastErr = e;
        // Try next model
      }
    }

    throw lastErr || new Error('Gemini generation failed');
  }


  function stripJsonFences(s) {
    let t = String(s || "").trim();
    if (!t) return "";
    if (t.startsWith("```")) {
      // Remove opening fence (``` or ```json)
      t = t.replace(/^```[a-zA-Z0-9_-]*\s*/i, "");
      // Remove a trailing closing fence
      t = t.replace(/\s*```\s*$/i, "");
    }
    return t.trim();
  }

  function safeJsonParse(s) {
    const cleaned = stripJsonFences(s);
    try {
      return JSON.parse(cleaned);
    } catch (_) {
      // continue
    }

    // Try to extract the first JSON object/array from the text (handles "Here is the JSON: {...}")
    const o1 = cleaned.indexOf("{");
    const o2 = cleaned.lastIndexOf("}");
    if (o1 !== -1 && o2 !== -1 && o2 > o1) {
      const cand = cleaned.slice(o1, o2 + 1);
      try { return JSON.parse(cand); } catch (_) {}
    }

    const a1 = cleaned.indexOf("[");
    const a2 = cleaned.lastIndexOf("]");
    if (a1 !== -1 && a2 !== -1 && a2 > a1) {
      const cand = cleaned.slice(a1, a2 + 1);
      try { return JSON.parse(cand); } catch (_) {}
    }

    throw new Error("Gemini returned non-JSON output. First 400 chars: " + cleaned.slice(0, 400));
  }

// -----------------------------
// CV tailoring helpers (ATS-friendly)
// -----------------------------

function isBaRefnr(s) {
  const v = String(s || "").trim();
  // Typical BA reference numbers look like: 10000-1234567890-S
  return /^\d{4,}-\d{6,}-S$/i.test(v);
}

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

function normLowerStringArray(v, { maxItems = 30, maxLen = 60 } = {}) {
  const arr = Array.isArray(v) ? v : [];
  const out = [];
  const seen = new Set();
  for (const item of arr) {
    const s0 = String(item || "").trim();
    if (!s0) continue;
    const s = s0.toLowerCase().slice(0, maxLen);
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
}

function buildTailoredCvPrompt({ lang, job, jobDescription, cvTextSlice }) {
  const language = (lang === "de") ? "de" : "en";

  const title = String(job?.title || "").trim();
  const company = String(job?.company_name || "").trim();
  const location = [job?.city, job?.region, job?.country].filter(Boolean).join(", ");

  const jd = String(jobDescription || "").trim().slice(0, 14000);
  const cv = String(cvTextSlice || "").trim().slice(0, 14000);

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
    "  \"language\": \"de\" | \"en\",",
    "  \"cv_text\": string,",
    "  \"ats_keywords_used\": string[],",
    "  \"ats_keywords_missing\": string[],",
    "  \"confidence\": number,",
    "  \"warnings\": string[]",
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
    "",
    "Output language:",
    (language === "de") ? "- Write the CV in German." : "- Write the CV in English.",
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
    experience: exp.slice(0, 12).map(e => ({
      title: e?.title || null,
      company: e?.company || null,
      location: e?.location || null,
      start: e?.start || null,
      end: e?.end || null,
      bullets: Array.isArray(e?.bullets) ? e.bullets.slice(0, 10) : []
    })),
    education: edu.slice(0, 6).map(e => ({
      degree: e?.degree || null,
      field: e?.field || null,
      school: e?.school || null,
      location: e?.location || null,
      start: e?.start || null,
      end: e?.end || null
    })),
    key_achievements: ach.slice(0, 10),
    skills: {
      groups: groups.slice(0, 6).map(g => ({
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

function buildTailoredCvDocPrompt({ lang, template, strength, job, jobDescription, cvBaseDoc }) {
  const language = (lang === "de") ? "de" : "en";

  const title = String(job?.title || "").trim();
  const company = String(job?.company_name || "").trim();
  const location = [job?.city, job?.region, job?.country].filter(Boolean).join(", ");

  const jd = String(jobDescription || "").trim().slice(0, 14000);
  const base = JSON.stringify(slimCvDocForPrompt(cvBaseDoc || {})).slice(0, 20000);

  const strengthKey = String(strength || "balanced").toLowerCase();
  const strengthOut = (strengthKey === "light" || strengthKey === "strong") ? strengthKey : "balanced";
  const templateOut = (String(template || "professional").toLowerCase() === "professional") ? "professional" : "professional";

  const strengthRules = (strengthOut === "light") ? [
    "- LIGHT: Keep the original CV structure and wording as much as possible.",
    "- Only adjust the Summary, Skills ordering, and a few bullets so they directly match the job description.",
    "- Minimal rephrasing. No new claims."
  ] : (strengthOut === "strong") ? [
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
    '  },',
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
    (language === "de") ? "- Write the CV in German." : "- Write the CV in English.",
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


function normalizeNewlines(s) {
  return String(s || "").replace(/\r\n?/g, "\n");
}

function normalizeOcrTextHeuristic(text) {
  let s = normalizeNewlines(text);

  // Normalize NBSP
  s = s.replace(/\u00a0/g, " ");

  // De-hyphenate common line breaks: "Wasser-\nbecken" -> "Wasserbecken"
  s = s.replace(/([A-Za-zÄÖÜäöüß])\-\n([A-Za-zÄÖÜäöüß])/g, "$1$2");

  // Join lines that look like soft wraps (very conservative)
  s = s.replace(/([^\n])\n([a-zäöüß])/g, "$1 $2");

  // Normalize whitespace
  s = s.replace(/[ \t]{2,}/g, " ");

  return s.trim();
}

function normalizeTailoredCvText(text, lang) {
  // Goal: remove empty bullets and stray marker lines, normalize bullets to "- ", keep headings readable.
  const headingsDe = new Set([
    "KONTAKT","PROFIL","BERUFSERFAHRUNG","AUSBILDUNG","KENNTNISSE","ZERTIFIKATE","SPRACHEN","PROJEKTE","EHRENAMT","INTERESSEN"
  ]);
  const headingsEn = new Set([
    "CONTACT","PROFESSIONAL SUMMARY","WORK EXPERIENCE","EDUCATION","SKILLS","CERTIFICATIONS","LANGUAGES","PROJECTS","VOLUNTEERING","INTERESTS"
  ]);

  const headingSet = (lang === "de") ? headingsDe : headingsEn;

  const lines = normalizeNewlines(text)
    .replace(/\u00a0/g, " ")
    .split("\n");

  function isHeadingLine(t) {
    const u = t.replace(/:$/, "").trim().toUpperCase();
    if (headingSet.has(u)) return true;
    // generic ALL CAPS heading
    if (/^[A-ZÄÖÜẞ0-9 &/+\.\-]{3,60}$/.test(t) && t.length <= 45) return true;
    return false;
  }

  function isBulletMarkerOnly(t) {
    // only bullet-like symbols (or a single dash)
    return /^[\-–—•·∙●▪◦]+$/.test(t);
  }

  function isBulletLine(t) {
    return /^[\-–—•·∙●▪◦]/.test(t);
  }

  function bulletContent(t) {
    return t.replace(/^[\-–—•·∙●▪◦]+\s*/, "").trim();
  }

  const out = [];
  let pendingBullet = false;

  for (let i = 0; i < lines.length; i++) {
    const t = String(lines[i] || "").trim();

    if (!t) {
      pendingBullet = false;
      // avoid excessive blank lines
      if (out.length && out[out.length - 1] !== "") out.push("");
      continue;
    }

    if (isHeadingLine(t)) {
      pendingBullet = false;
      const u = t.replace(/:$/, "").trim().toUpperCase();
      out.push(u);
      continue;
    }

    if (isBulletMarkerOnly(t) || (isBulletLine(t) && bulletContent(t) === "")) {
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

  // Trim leading/trailing blank lines
  while (out.length && out[0] === "") out.shift();
  while (out.length && out[out.length - 1] === "") out.pop();

  // Collapse 3+ blank lines -> max 2
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

function buildCvCleanPrompt(lang, cvTextRaw) {
  const outLang = lang === "de" ? "German" : lang === "en" ? "English" : "German";
  const headings = (lang === "de")
    ? ["KONTAKT", "PROFIL", "BERUFSERFAHRUNG", "AUSBILDUNG", "KENNTNISSE", "ZERTIFIKATE", "SPRACHEN", "PROJEKTE", "EHRENAMT", "INTERESSEN"]
    : ["CONTACT", "PROFESSIONAL SUMMARY", "WORK EXPERIENCE", "EDUCATION", "SKILLS", "CERTIFICATIONS", "LANGUAGES", "PROJECTS", "VOLUNTEERING", "INTERESTS"];

  return [
    "You are an expert CV editor. Your task: clean and restructure OCR'ed CV text into clear, ATS-friendly plain text.",
    `Output language: ${outLang}.`,
    "Hard rules:",
    "- Do not invent facts. Use only information present in CV_TEXT.",
    "- Fix obvious OCR artifacts (broken line breaks, hyphenation, duplicated spaces).",
    "- Remove stray bullet-only lines and ensure bullets are complete.",
    "- Use section headings (uppercase, on their own line) when possible:",
    ...headings.map(h => `  - ${h}`),
    "- Use bullet points that start with '- ' and always include text (no empty bullets).",
    "Return ONLY valid JSON (no markdown):",
    '{"language":"de|en|mixed","cv_text":"...","warnings":["..."]}',
    "CV_TEXT:",
    cvTextRaw
  ].join("\n");
}

async function ensureCvCleanText(env, customerId, prof, cvTextRaw, lang) {
  const version = "cv_clean_v1";
  const rawNorm = normalizeOcrTextHeuristic(cvTextRaw).slice(0, 14000);
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
      maxOutputTokens: 2500,
    });
  } catch (e) {
    // Best effort: return heuristic cleaned text
    return { cv_text: rawNorm, from_cache: false, model, warnings: ["cv_clean_model_error"] };
  }

  const cvText = String(parsed?.cv_text || "").trim() || rawNorm;
  const cvTextNorm = normalizeTailoredCvText(cvText, lang);
  const warnings = Array.isArray(parsed?.warnings) ? parsed.warnings.slice(0, 20) : [];

  // Persist cache (best effort - columns may not exist yet)
  try {
    await supabaseFetch(env, `/rest/v1/customer_profiles?customer_id=eq.${customerId}`, {
      method: "PATCH",
      body: {
        cv_clean_text: cvTextNorm,
        cv_clean_hash: inputHash,
        cv_clean_model: model,
        cv_clean_updated_at: new Date().toISOString(),
      },
    });
  } catch (e) {
    // ignore
  }

  return { cv_text: cvTextNorm, from_cache: false, model, warnings };
}


// -----------------------------
// CV structuring (for reliable formatting)
// -----------------------------

function buildCvStructuredPrompt(lang, cvTextClean) {
  const outLang = (lang === "de") ? "German" : "English";

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
    '    },',
    '    "summary": string[],',
    '    "experience": {',
    '      "title": string | null,',
    '      "company": string | null,',
    '      "location": string | null,',
    '      "start": string | null,',
    '      "end": string | null,',
    '      "bullets": string[]',
    '    }[],',
    '    "education": {',
    '      "degree": string | null,',
    '      "field": string | null,',
    '      "school": string | null,',
    '      "location": string | null,',
    '      "start": string | null,',
    '      "end": string | null',
    '    }[],',
    '    "key_achievements": string[],',
    '    "skills": {',
    '      "groups": {"label": string, "items": string[]}[],',
    '      "additional": string[]',
    '    },',
    '    "courses": string[],',
    '    "interests": string[],',
    '    "languages": string[]',
    '  },',
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
    String(cvTextClean || "").slice(0, 14000),
  ].join("\n");
}

async function ensureCvStructured(env, customerId, prof, cvTextClean, lang) {
  const version = "cv_struct_v1";
  const base = String(cvTextClean || "").trim();
  const baseHash = await sha256Hex(base.slice(0, 14000));
  const inputHash = await sha256Hex([version, lang || "", baseHash].join("|"));

  const cachedHash = String(prof?.cv_structured_hash || "").trim();
  const cachedJson = prof?.cv_structured_json || null;

  if (cachedHash && cachedHash === inputHash && cachedJson && typeof cachedJson === "object") {
    return { cv_doc: cachedJson?.cv_doc || cachedJson, from_cache: true, model: prof?.cv_structured_model || null, hash: inputHash, warnings: [] };
  }

  const prompt = buildCvStructuredPrompt(lang, base);

  // Prefer high-quality model list if configured; otherwise fall back to general model.
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
    // Persist error (best effort)
    try {
      await supabaseFetch(env, `/rest/v1/customer_profiles?customer_id=eq.${customerId}`, {
        method: "PATCH",
        body: {
          cv_structured_error: String(e?.message || e),
          cv_structured_error_at: new Date().toISOString()
        }
      });
    } catch (_) {}
    return { cv_doc: null, from_cache: false, model: null, hash: inputHash, warnings: ["cv_structured_model_error"] };
  }

  const parsed = out?.parsed || {};
  const cvDoc = parsed?.cv_doc || null;
  const warnings = Array.isArray(parsed?.warnings) ? parsed.warnings.slice(0, 20) : [];

  if (!cvDoc || typeof cvDoc !== "object") {
    return { cv_doc: null, from_cache: false, model: out?.model || null, hash: inputHash, warnings: warnings.concat(["cv_structured_invalid_output"]) };
  }

  // Store cache (best effort)
  try {
    await supabaseFetch(env, `/rest/v1/customer_profiles?customer_id=eq.${customerId}`, {
      method: "PATCH",
      body: {
        cv_structured_json: parsed,
        cv_structured_hash: inputHash,
        cv_structured_model: out?.model || null,
        cv_structured_updated_at: new Date().toISOString(),
        cv_structured_error: null,
        cv_structured_error_at: null
      }
    });
  } catch (_) {}

  return { cv_doc: cvDoc, from_cache: false, model: out?.model || null, hash: inputHash, warnings };
}

function renderCvTextFromDoc(cvDoc, lang) {
  const L = (lang === "de") ? {
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
  if (parts.length) lines.push(parts.join(" · "));
  lines.push("");

  function addSection(title, fn) {
    const before = lines.length;
    fn();
    const after = lines.length;
    if (after > before) {
      // ensure a blank line after section
      if (lines[lines.length - 1] !== "") lines.push("");
    }
  }

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
      const head = [title, company].filter(Boolean).join(" — ");
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
      if (school) lines.push([school, loc].filter(Boolean).join(" — "));
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
      const row = items.map(x => String(x).trim()).filter(Boolean).join(", ");
      if (label) lines.push(label + ": " + row);
      else lines.push(row);
    }
    if (additional.length) {
      const row = additional.map(x => String(x).trim()).filter(Boolean).join(", ");
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
    lines.push(langs.map(x => String(x).trim()).filter(Boolean).join(", "));
    lines.push("");
  }

  const interests = Array.isArray(cvDoc?.interests) ? cvDoc.interests.filter(Boolean) : [];
  if (interests.length) {
    lines.push(L.interests);
    lines.push(interests.map(x => String(x).trim()).filter(Boolean).join(", "));
    lines.push("");
  }

  return normalizeTailoredCvText(lines.join("\n"), lang);
}


function buildClusterSuggestionPrompt({ roleClusters, aiCvOutput, cvTextSlice }) {
    const clustersSlim = (roleClusters || []).map(c => ({
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
      "- confidence must be 0.50–0.95.",
      "- All keywords/skills lowercased, deduplicated, concise (1–4 words).",
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
      String(cvTextSlice || "").slice(0, 6000),
      "",
      "Now output JSON only."
    ].join("\n");
  }

  async function insertRoleClusterSuggestion(env, row) {
    await supabaseFetch(env, `/rest/v1/role_cluster_suggestions`, {
      method: "POST",
      body: [row],
      headers: { Prefer: "return=minimal" }
    });
  }
  
  async function handleMeAiProfileFromCv(request, env) {
    const auth = await requireMeCustomerId(request, env);
    if (!auth.ok) return auth.res;
  
    const customerId = auth.customerId;
  
    // Load CV text from customer_profiles
    const q = new URLSearchParams();
    q.set("select", "cv_ocr_text,cv_text,countries_allowed,locations,desired_titles,exclude_titles,industries,seniority");
    q.set("customer_id", `eq.${customerId}`);
    q.set("limit", "1");
  
    const rows = await supabaseFetch(env, `/rest/v1/customer_profiles?${q.toString()}`, { method: "GET" });
    const prof = Array.isArray(rows) && rows.length ? rows[0] : null;
  
    const cvText = (prof?.cv_ocr_text || prof?.cv_text || "").toString().trim();
    if (!cvText) return json(request, { error: "No CV text found. Upload CV and run OCR first." }, 400);
  
    // Keep input bounded (cost control)
    const cvSlice = cvText.slice(0, 12000);
  
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
      '  }[],',
      '  "alternative_job_titles": {',
      '    "title": string,',
      '    "confidence": number,',
      '    "reason_skills": string[]',
      '  }[],',
      '  "skills": {',
      '    "core": string[],',
      '    "supporting": string[],',
      '    "tools": string[]',
      '  },',
      '  "industries": string[],',
      '  "seniority": "junior" | "mid" | "senior" | "lead" | "unknown",',
      '  "summary": string',
      "}",
      "",
      "Rules:",
      "- primary_job_titles: 3–7 items",
      "- alternative_job_titles: 0–5 items, ONLY if there is strong skill overlap",
      "- confidence must be between 0.50 and 0.95",
      "- reason_skills must contain exactly 3 skills per title",
      "- skills.core: 6–12 items",
      "- skills.supporting: 4–10 items",
      "- skills.tools: 0–10 items",
      "- industries max 10 items",
      "- All skills must be lowercased, deduplicated, concise (1–4 words)",
      "- Do NOT invent experience, employers, education, or certifications",
      "- No seniority jumps (e.g. junior → lead)",
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
    
    
    const model = "gemini-2.0-flash-lite"; // keep cheap
    const raw = await geminiGenerateJson(env, { model, promptText: prompt });
    const parsed = safeJsonParse(raw);
  
    // Normalize output (new schema + backward compatible fields)
    const primary_job_titles = Array.isArray(parsed.primary_job_titles) ? parsed.primary_job_titles.slice(0, 7) : [];
    const alternative_job_titles = Array.isArray(parsed.alternative_job_titles) ? parsed.alternative_job_titles.slice(0, 5) : [];

    const core = Array.isArray(parsed?.skills?.core) ? parsed.skills.core.map(x => String(x).trim()).filter(Boolean).slice(0, 12) : [];
    const supporting = Array.isArray(parsed?.skills?.supporting) ? parsed.skills.supporting.map(x => String(x).trim()).filter(Boolean).slice(0, 10) : [];
    const tools = Array.isArray(parsed?.skills?.tools) ? parsed.skills.tools.map(x => String(x).trim()).filter(Boolean).slice(0, 10) : [];

    const industries = Array.isArray(parsed.industries) ? parsed.industries.map(x => String(x).trim()).filter(Boolean).slice(0, 10) : [];
    const seniority = ["junior", "mid", "senior", "lead", "unknown"].includes(String(parsed.seniority)) ? String(parsed.seniority) : "unknown";
    const summary = String(parsed.summary || "").trim().slice(0, 400);

    // Backward-compatible fields for existing UI/DB expectations
    const job_titles = primary_job_titles.map(x => String(x?.title || "").trim()).filter(Boolean).slice(0, 15);
    const excluded_titles = Array.isArray(parsed.excluded_titles) ? parsed.excluded_titles.map(x => String(x).trim()).filter(Boolean).slice(0, 10) : [];
    const skills_flat = Array.from(new Set([...core, ...supporting, ...tools].map(s => String(s).trim()).filter(Boolean))).slice(0, 40);

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
    
  async function handleMeAiClusterSuggestion(request, env) {
    const auth = await requireMeCustomerId(request, env);
    if (!auth.ok) return auth.res;

    const customerId = auth.customerId;

    // Load CV text from customer_profiles
    const q = new URLSearchParams();
    q.set("select", "cv_ocr_text,cv_text,countries_allowed,locations");
    q.set("customer_id", `eq.${customerId}`);
    q.set("limit", "1");

    const rows = await supabaseFetch(env, `/rest/v1/customer_profiles?${q.toString()}`, { method: "GET" });
    const prof = Array.isArray(rows) && rows.length ? rows[0] : null;

    const cvText = (prof?.cv_ocr_text || prof?.cv_text || "").toString().trim();
    if (!cvText) return json(request, { error: "No CV text found. Upload CV and run OCR first." }, 400);

    const cvSlice = cvText.slice(0, 12000);

    const localeHint = {
      countries_allowed: Array.isArray(prof?.countries_allowed) ? prof.countries_allowed : [],
      locations: Array.isArray(prof?.locations) ? prof.locations : []
    };

    // 1) Load active clusters (cached)
    const roleClusters = await loadRoleClusters(env);

    // 2) Run the same CV extraction prompt used in /me/ai/profile-from-cv
    const extractionPrompt = [
      "Return ONLY valid JSON. No markdown. No code fences. No commentary.",
      "",
      "Schema:",
      "{",
      '  "primary_job_titles": {',
      '    "title": string,',
      '    "confidence": number,',
      '    "reason_skills": string[]',
      '  }[],',
      '  "alternative_job_titles": {',
      '    "title": string,',
      '    "confidence": number,',
      '    "reason_skills": string[]',
      '  }[],',
      '  "skills": {',
      '    "core": string[],',
      '    "supporting": string[],',
      '    "tools": string[]',
      '  },',
      '  "industries": string[],',
      '  "seniority": "junior" | "mid" | "senior" | "lead" | "unknown",',
      '  "summary": string',
      "}",
      "",
      "Rules:",
      "- primary_job_titles: 3–7 items",
      "- alternative_job_titles: 0–5 items, ONLY if there is strong skill overlap",
      "- confidence must be between 0.50 and 0.95",
      "- reason_skills must contain exactly 3 skills per title",
      "- skills.core: 6–12 items",
      "- skills.supporting: 4–10 items",
      "- skills.tools: 0–10 items",
      "- industries max 10 items",
      "- All skills must be lowercased, deduplicated, concise (1–4 words)",
      "- Do NOT invent experience, employers, education, or certifications",
      "- No seniority jumps (e.g. junior → lead)",
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

    // 3) Deterministic cluster match (stable layer)
    const derived = suggestByRoleClusters(aiCvOutput, roleClusters, { minClusterScore: 0.20, maxClusters: 3, maxAltTitles: 5 });

    // 4) AI suggestion to maintain/enrich the cluster DB (learning layer)
    const prompt2 = buildClusterSuggestionPrompt({ roleClusters, aiCvOutput, cvTextSlice: cvSlice });
    const raw2 = await geminiGenerateJson(env, { model, promptText: prompt2 });
    const suggestion = safeJsonParse(raw2);

    // 5) Store suggestion (dedupe via source_hash)
    const source_hash = await sha256Hex(JSON.stringify({
      customerId,
      cvSlice: cvSlice.slice(0, 6000),
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
async function handleAdminApplyRoleClusterSuggestion(request, env) {
  if (!isAdminAuthorized(request, env)) return json(request, { error: "Unauthorized" }, 401);

  let body = null;
  try { body = await request.json(); } catch { body = null; }
  if (!body) return json(request, { error: "Invalid JSON body" }, 400);

  const suggestionId = String(body.suggestion_id || "").trim();
  if (!looksLikeUuid(suggestionId)) return json(request, { error: "suggestion_id must be a uuid" }, 400);

  const apply = body.apply || {};
  const addTitles = Array.isArray(apply.add_titles) ? apply.add_titles.map(x => String(x || "").trim()).filter(Boolean).slice(0, 10) : [];
  const addSkills = Array.isArray(apply.add_skill_keywords) ? apply.add_skill_keywords.map(x => String(x || "").trim().toLowerCase()).filter(Boolean).slice(0, 25) : [];
  const addNeg = Array.isArray(apply.add_negative_keywords) ? apply.add_negative_keywords.map(x => String(x || "").trim().toLowerCase()).filter(Boolean).slice(0, 15) : [];

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

  const existingTitles = new Set((cl.titles || []).map(x => String(x || "").trim()).filter(Boolean));
  const existingSkills = new Set((cl.skill_keywords || []).map(x => String(x || "").trim().toLowerCase()).filter(Boolean));
  const existingNeg = new Set((cl.negative_keywords || []).map(x => String(x || "").trim().toLowerCase()).filter(Boolean));

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
      updated_at: new Date().toISOString()
    },
    headers: { Prefer: "return=minimal" }
  });

  await supabaseFetch(env, `/rest/v1/role_cluster_suggestions?id=eq.${encodeURIComponent(suggestionId)}`, {
    method: "PATCH",
    body: {
      applied: true,
      applied_at: new Date().toISOString()
    },
    headers: { Prefer: "return=minimal" }
  });

  // Reset cache so next request uses updated clusters
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

async function handleMeJobsQueue(request, env) {
  const user = await getSupabaseUserFromAuthHeader(request, env);
  if (!user?.email) return json(request, { error: "Unauthorized" }, 401);

  const customerId = await getCustomerIdForSupabaseUserEmail(env, user.email);
  if (!customerId) {
    return json(request, { error: "Customer not found for auth user", email: String(user.email || "").toLowerCase() }, 404);
  }

  // Pull queue applications, prioritizing prio jobs first
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
  // Keep payload minimal for the dashboard job cards.
  qJobs.set(
    "select",
    "id,title,company_name,country,city,region,apply_url,posted_at,fetched_at,status,source_modified_at"
  );
  qJobs.set("id", `in.(${jobIds.join(",")})`);
  qJobs.set("limit", String(jobIds.length));

  const jobs = await supabaseFetch(env, `/rest/v1/jobs_normalized?${qJobs.toString()}`, { method: "GET" });

  // Preserve order from apps list
  const orderIndex = new Map(jobIds.map((id, idx) => [id, idx]));
  const sortedJobs = (jobs || []).slice().sort((a, b) => (orderIndex.get(a.id) ?? 999999) - (orderIndex.get(b.id) ?? 999999));

  // Attach application metadata so the dashboard can render Prio state
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

/* -----------------------------
  CUSTOMER: GET /me/jobs/description?job_id=<uuid>
  - Returns full job description for a job in this customer's applications.
  - If missing in DB (or stale), fetches from BA website and caches it.
----------------------------- */

async function handleMeJobsDescription(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;

  const url = new URL(request.url);
  const jobId = String(url.searchParams.get("job_id") || "").trim();
  if (!looksLikeUuid(jobId)) {
    return json(request, { error: "job_id (uuid) is required" }, 400);
  }

  // Security: only allow fetching descriptions for jobs that belong to this customer
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

  const ttlHours = clampInt(env.BA_JOBDETAIL_TTL_HOURS || "336", 1, 24 * 365, 336); // default 14 days
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
      job: ensured.job,
    },
    200
  );
}


async function handleMeJobsFetch(request, env) {
  const user = await getSupabaseUserFromAuthHeader(request, env).catch(() => null);
  if (!user) return json(request, { error: "Unauthorized" }, 401);

  // Map Supabase auth user -> internal customer id
  const email = (user && user.email) ? String(user.email).toLowerCase() : "";
  if (!email) return json(request, { error: "Unauthorized (missing email)" }, 401);

  const qCust = new URLSearchParams();
  qCust.set("select", "id,email");
  qCust.set("email", `eq.${email}`);
  const resCust = await supabaseFetch(env, `/rest/v1/customers?${qCust.toString()}`, { method: "GET" });
  const custRows = Array.isArray(resCust) ? resCust : [];
  const cust = custRows.length ? custRows[0] : null;
  if (!cust || !cust.id) return json(request, { error: "Customer not found" }, 404);
  const customerId = cust.id;
  // Rate-limit manual fetch: once every 10 minutes per customer (prevents hammering)
  const cooldownMinutes = 10;
  const sinceIso = new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString();
  try{
    const qRl = new URLSearchParams();
    qRl.set("select", "id,created_at");
    qRl.set("customer_id", `eq.${customerId}`);
    qRl.set("fetched_by", `eq.manual`);
    qRl.set("created_at", `gte.${sinceIso}`);
    qRl.set("order", "created_at.desc");
    qRl.set("limit", "1");
    const recent = await supabaseFetch(env, `/rest/v1/customer_fetch_logs?${qRl.toString()}`, { method: "GET" });
    if (Array.isArray(recent) && recent.length){
      return json(request, {
        error: "Too many requests",
        message: "You can fetch again in a few minutes.",
        retry_after_seconds: cooldownMinutes * 60
      }, 429);
    }
  }catch(e){
    // If rate-limit check fails, continue (do not block)
  }


  let body = {};
  try { body = await request.json(); } catch (_) {}

  const fetchMode = String(body.fetch_mode || "").trim().toLowerCase();
  const includeAi = Boolean(body.include_ai_titles);
  const aiTitlesRaw = Array.isArray(body.ai_titles) ? body.ai_titles : []; // kept for backwards-compat, but ai_only now uses profile.ai_titles


  // Titles mode:
  // - profile (default): use customer profile titles
  // - ai_only: use only AI titles sent from dashboard
  // - profile_plus_ai: merge profile titles + AI titles
  const mode = fetchMode || (includeAi ? "profile_plus_ai" : "profile");


  // Load profile
  const qProfile = new URLSearchParams();
  qProfile.set("select", "customer_id,desired_titles,locations,radius_km,countries_allowed,exclude_titles");
  qProfile.set("customer_id", `eq.${customerId}`);

  const resProfile = await supabaseFetch(env, `/rest/v1/customer_profiles?${qProfile.toString()}`, { method: "GET" });
  const profiles = Array.isArray(resProfile) ? resProfile : [];
  const p = Array.isArray(profiles) && profiles.length ? profiles[0] : null;

  const profileAiTitles = Array.isArray(p && p.ai_titles) ? p.ai_titles.map(t=>String(t||"").trim()).filter(Boolean) : [];

  if (!p) return json(request, { error: "Customer profile not found" }, 404);

  const desired = Array.isArray(p.desired_titles) ? p.desired_titles.filter(Boolean) : [];
  const locations = Array.isArray(p.locations) ? p.locations.filter(Boolean) : [];

  if (!desired.length) return json(request, { error: "Profile incomplete: add at least 1 desired title first." }, 400);
  if (!locations.length) return json(request, { error: "Profile incomplete: add at least 1 location first." }, 400);

  // Queue cap guard (prevents pointless manual spam)
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

  // Merge desired titles + (optional) AI suggestions (dedupe, trim, cap)
  const merged = [];
  const pushTitle = (t) => {
    const s = String(t || "").trim();
    if (!s) return;
    if (merged.some(x => x.toLowerCase() === s.toLowerCase())) return;
    merged.push(s);
  };

  desired.forEach(pushTitle);
  if (includeAi) aiTitlesRaw.forEach(pushTitle);

  const maxTitles = clampInt(env.MAX_FETCH_TITLES || "25", 5, 100);
  const overrideTitles = merged.slice(0, maxTitles);

  // Manual fetch: force=true so you can test even if a cron ran earlier today
  const result = await fetchJobsForCustomerCore(customerId, env, "manual", true, overrideTitles);

  // Updated queue count
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

async function handleMeAiTitlesSave(request, env){
  const user = await getSupabaseUserFromAuthHeader(request, env).catch(() => null);
  if (!user) return json(request, { error: "Unauthorized" }, 401);

  const email = (user && user.email) ? String(user.email).toLowerCase() : "";
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
  try{ body = await request.json(); }catch(_){}

  const titles = Array.isArray(body.ai_titles) ? body.ai_titles : [];
  const cleaned = [];
  const seen = new Set();
  for(const t of titles){
    const s = String(t||"").trim();
    if(!s) continue;
    const k = s.toLowerCase();
    if(seen.has(k)) continue;
    seen.add(k);
    cleaned.push(s);
  }
  if (!cleaned.length) return json(request, { error: "No ai_titles provided" }, 400);

  await supabaseFetch(env, `/rest/v1/customer_profiles`, {
    method: "POST",
    body: [{
      customer_id: customerId,
      ai_titles: cleaned,
      ai_titles_updated_at: new Date().toISOString()
    }],
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });

  return json(request, { ok: true, customer_id: customerId, saved: cleaned.length }, 200);
}






  async function handleMeApplicationsList(request, env) {
    const me = await requireMeCustomerId(request, env);
    if (!me.ok) return me.res;
  
    const url = new URL(request.url);
  
    const limitRaw = url.searchParams.get("limit") || "30";
    const offsetRaw = url.searchParams.get("offset") || "0";
    const status = (url.searchParams.get("status") || "").trim().toLowerCase();
  
    const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 30, 1), 100);
    const offset = Math.max(parseInt(offsetRaw, 10) || 0, 0);
  
    // Optional filtering: allow only known statuses to avoid weird queries
    const allowedStatuses = new Set(["new", "applied", "shortlisted", "skipped", "rejected", "expired"]);
    const statusFilter = status && allowedStatuses.has(status) ? status : "";
  
    // Join job info via PostgREST relationship
    // This assumes applications.job_id FK references jobs_normalized.id (as in your schema).
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
  
    // Normalize output to keep frontend simple
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
  
  /* -----------------------------
  CV Upload helpers + endpoints
  ----------------------------- */
  
  function getCvBucket(env) {
  return String(env.CV_BUCKET || "cvs").trim() || "cvs";
  }
  
  function getMaxCvBytes(env) {
  const n = Number(env.CV_MAX_BYTES || 5 * 1024 * 1024);
  return Number.isFinite(n) && n > 0 ? n : 5 * 1024 * 1024;
  }
  
  function inferCvMimeFromName(name) {
  const n = String(name || "").toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".doc")) return "application/msword";
  if (n.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "";
  }
  
  const ALLOWED_CV_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ]);
  
  function safeFileName(name) {
  return String(name || "cv")
  .replace(/[^a-zA-Z0-9._-]/g, "_")
  .slice(0, 120);
  }
  
  function encodeStoragePath(path) {
  return encodeURIComponent(path).replace(/%2F/g, "/");
  }
  
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
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const path = `${me.customerId}/${ts}-${originalName}`;
  
  await uploadToSupabaseStorage(env, { bucket: getCvBucket(env), path, file, contentType: mime });
  
  const payload = {
  customer_id: me.customerId,
  cv_path: path,
  cv_filename: originalName,
  cv_mime: mime,
  cv_size: size,
  cv_uploaded_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  cv_ocr_status: null,
  cv_ocr_operation: null,
  cv_ocr_error: null,
  cv_ocr_text: null,
  cv_ocr_updated_at: new Date().toISOString()
  };
  
  await supabaseFetch(env, `/rest/v1/customer_profiles?on_conflict=customer_id`, {
  method: "POST",
  body: [payload],
  headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
  
  return json(request, { ok: true, me: true, customer_id: me.customerId, ...payload }, 200);
  }
  
  async function handleMeCvGet(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  
  const q = new URLSearchParams();
  q.set(
  "select",
  "cv_path,cv_filename,cv_mime,cv_size,cv_uploaded_at,cv_ocr_status,cv_ocr_operation,cv_ocr_error,cv_ocr_updated_at"
  );
  q.set("customer_id", `eq.${me.customerId}`);
  q.set("limit", "1");
  
  const rows = await supabaseFetch(env, `/rest/v1/customer_profiles?${q.toString()}`, { method: "GET" });
  const cv = Array.isArray(rows) && rows.length ? rows[0] : null;
  
  return json(request, { ok: true, me: true, customer_id: me.customerId, cv }, 200);
  }
  
  
async function persistAiTitles(env, customerId, aiTitles){
  const titles = Array.isArray(aiTitles) ? aiTitles.map(t=>String(t||"").trim()).filter(Boolean).slice(0, 50) : [];
  const payload = {
    customer_id: customerId,
    ai_titles: titles,
    ai_titles_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  try{
    await supabaseFetch(env, `/rest/v1/customer_profiles?on_conflict=customer_id`, {
      method: "POST",
      body: [payload],
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
    });
  }catch(e){
    // non-blocking, but surface in logs for debugging
    console.log("persistAiTitles failed", String(e));
  }
  return titles;
}

/* -----------------------------
  CUSTOMER: POST /me/cv/suggest-titles
  ----------------------------- */
  
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
  
  // If OCR text exists, use it first
  const ocrText = String(row.cv_ocr_text || "").trim();
  if (ocrText.length > 40) {
  const normalizedText = normalizeForMatch(ocrText);
  const baseTitles = getCommonTitleDictionary();
  const suggestions = scoreTitlesFromText(normalizedText, baseTitles, limit);
  await persistAiTitles(env, me.customerId, suggestions);
  return json(
  request,
  {
  ok: true,
  me: true,
  customer_id: me.customerId,
  parsed: { chars: normalizedText.length, has_text: normalizedText.length > 40, source: "ocr" },
  suggestions
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
  
  function normalizeForMatch(s) {
  return String(s || "")
  .replace(/\u0000/g, " ")
  .replace(/\s+/g, " ")
  .toLowerCase()
  .trim();
  }
  
  function extractTextFromPdfBytes(bytes) {
  try {
  const raw = new TextDecoder("latin1").decode(new Uint8Array(bytes));
  const parts = [];
  
  const reTj = /\(([^)]{1,200})\)\s*Tj/g;
  let m;
  while ((m = reTj.exec(raw)) !== null) {
  parts.push(unescapePdfString(m[1]));
  if (parts.length > 5000) break;
  }
  
  const reTJ = /\[(.{1,2000}?)\]\s*TJ/g;
  let m2;
  while ((m2 = reTJ.exec(raw)) !== null) {
  const inside = m2[1];
  const reInner = /\(([^)]{1,200})\)/g;
  let im;
  while ((im = reInner.exec(inside)) !== null) {
  parts.push(unescapePdfString(im[1]));
  if (parts.length > 5000) break;
  }
  if (parts.length > 5000) break;
  }
  
  return parts.join(" ");
  } catch {
  return "";
  }
  }
  
  function unescapePdfString(s) {
  return String(s || "")
  .replace(/\\\(/g, "(")
  .replace(/\\\)/g, ")")
  .replace(/\\\\/g, "\\")
  .replace(/\\n/g, " ")
  .replace(/\\r/g, " ")
  .replace(/\\t/g, " ")
  .replace(/\\[0-7]{1,3}/g, " ");
  }
  
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
  
  const seen = new Set();
  const final = [];
  for (const s of out) {
  if (seen.has(s.title)) continue;
  seen.add(s.title);
  final.push(s);
  if (final.length >= limit) break;
  }
  return final;
  }
  
  /* -----------------------------
  OCR (GCP Vision async PDF OCR)
  ----------------------------- */
  
  function getOcrMaxPdfBytes(env) {
  const n = Number(env.OCR_MAX_PDF_BYTES || 10 * 1024 * 1024);
  return Number.isFinite(n) && n > 0 ? n : 10 * 1024 * 1024;
  }
  
  function getGcsBucket(env) {
  return mustEnv(env, "GCP_GCS_BUCKET");
  }
  
  function normPrefix(p) {
  const s = String(p || "").trim();
  if (!s) return "";
  return s.endsWith("/") ? s.slice(0, -1) : s;
  }
  
  function base64UrlEncode(bytes) {
  let binary = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i += 1) binary += String.fromCharCode(arr[i]);
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  
  function pemToArrayBuffer(pem) {
  const b64 = pem
  .replace(/-----BEGIN PRIVATE KEY-----/g, "")
  .replace(/-----END PRIVATE KEY-----/g, "")
  .replace(/\s+/g, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
  }
  
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
  
  async function getGcpAccessToken(env) {
  const saJson = JSON.parse(mustEnv(env, "GCP_SA_KEY_JSON"));
  const clientEmail = saJson.client_email;
  const privateKey = saJson.private_key;
  if (!clientEmail || !privateKey) throw new Error("GCP_SA_KEY_JSON missing client_email/private_key");
  
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
  iss: clientEmail,
  scope: "https://www.googleapis.com/auth/cloud-platform",
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
  
  async function gcsProbeVisionOutputFiles(env, accessToken, bucket, outPrefix) {
  const max = 20;
  const names = [];
  const base = outPrefix.replace(/\/$/, "");
  
  for (let a = 1; a <= max; a++) {
  for (let b = a; b <= Math.min(a + 1, max); b++) {
  const name = `${base}/output-${a}-to-${b}.json`;
  const json = await gcsTryDownloadJson(env, accessToken, bucket, name);
  if (json) names.push(name);
  }
  }
  
  if (names.length === 0) {
  for (let n = 1; n <= max; n++) {
  const name = `${base}/output-1-to-${n}.json`;
  const json = await gcsTryDownloadJson(env, accessToken, bucket, name);
  if (json) names.push(name);
  }
  }
  
  return [...new Set(names)];
  }
  
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
  
  async function gcsDownloadObjectJson(env, accessToken, bucket, objectName) {
  const json = await gcsTryDownloadJson(env, accessToken, bucket, objectName);
  if (!json) {
  throw new Error(`GCS JSON not found or not valid: gs://${bucket}/${objectName}`);
  }
  return json;
  }
  
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
  
  async function setOcrState(env, customerId, patch) {
  const payload = {
  customer_id: customerId,
  ...patch,
  cv_ocr_updated_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
  };
  await supabaseFetch(env, `/rest/v1/customer_profiles?on_conflict=customer_id`, {
  method: "POST",
  body: [payload],
  headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });
  }
  
  async function setCustomerCvOcrResult(env, customerId, { status, operation, error, text }) {
  await setOcrState(env, customerId, {
  cv_ocr_status: status || null,
  cv_ocr_operation: operation || null,
  cv_ocr_error: error || null,
  cv_ocr_text: text || null
  });
  }
  
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
  


/* -----------------------------
  CUSTOMER: POST /me/cv/tailor
  Generates an ATS-friendly, job-tailored CV text from:
  - BA job description (cached)
  - CV OCR raw text (from customer_profiles.cv_ocr_text)
  Stores result in public.tailored_cvs
  ----------------------------- */

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

  // Confirm the customer has this job in applications
  const appRows = await supabaseFetch(
    env,
    `/rest/v1/applications?select=id,job_id,customer_id&customer_id=eq.${me.customerId}&job_id=eq.${jobId}&limit=1`
  );
  if (!appRows || appRows.length === 0) {
    return jsonResponse({ ok: false, error: "Job not found for this customer" }, 404);
  }

  // Load the job
  const jobRows = await supabaseFetch(
    env,
    `/rest/v1/jobs_normalized?select=` +
      `id,title,company_name,country,city,region,` +
      `external_job_id,apply_url,source_id,source_modified_at,` +
      `description_full,description_full_source,description_full_hash,description_full_fetched_at,description_full_error,description_full_error_at` +
      `&id=eq.${jobId}&limit=1`
  );
  const job = jobRows?.[0];
  if (!job) {
    return jsonResponse({ ok: false, error: "Job not found" }, 404);
  }

  // Load the customer profile (CV)
  // NOTE: our schema uses customer_id (uuid) as the key (no customer_profiles.id).
  // Keep the select list strictly to existing columns to avoid PostgREST 42703 errors.
  const profRows = await supabaseFetch(
    env,
    `/rest/v1/customer_profiles?select=` +
      `customer_id,language_requirements,` +
      `cv_text,cv_text_source,` +
      `cv_ocr_text,cv_ocr_status,cv_ocr_updated_at,` +
      `cv_clean_text,cv_clean_hash,cv_clean_model,cv_clean_updated_at,cv_clean_error,cv_clean_error_at,` +
      `cv_structured_json,cv_structured_hash,cv_structured_model,cv_structured_updated_at,cv_structured_error,cv_structured_error_at` +
      `&customer_id=eq.${me.customerId}&limit=1`
  );
  const prof = profRows?.[0];
  if (!prof) {
    return jsonResponse({ ok: false, error: "Profile not found" }, 404);
  }

  // Prefer OCR text if available
  const cvTextRaw = String(prof.cv_ocr_text || prof.cv_text || "").trim();
  if (!cvTextRaw) {
    return jsonResponse({ ok: false, error: "No CV text found. Upload a CV first." }, 400);
  }

  // Decide output language later (after we ensured a job description); default is English.
  let lang = "en";

  // Ensure job description exists (BA website scrape + DB cache)
  let descText = (job.description_full || "").trim();
  let descHash = job.description_full_hash || null;

  // Always run the cache helper; it refreshes if stale and backs off if recently blocked.
  const ensuredDesc = await ensureBaJobDescriptionCached(env, job, { ttlHours: Number(env.JOBDESC_TTL_HOURS || 336) });
  descText = String(ensuredDesc?.job?.description_full || descText || "").trim();
  descHash = ensuredDesc?.job?.description_full_hash || descHash || null;
  let descCacheStatus = ensuredDesc?.status || (descText ? "cached" : "missing");

  // If we have text but no hash (older rows), compute it once.
  if (descText && !descHash) {
    try {
      descHash = await sha256Hex(descText);
      await supabaseFetch(env, `/rest/v1/jobs_normalized?id=eq.${encodeURIComponent(jobId)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: { description_full_hash: descHash },
      });
    } catch {}
  }

  // If we still don't have a description, we can still try but results will be weaker.
  if (!descText) {
    return jsonResponse({ ok: false, error: "No job description available for this job." }, 400);
  }

  // Decide output language (job description + customer language preferences)
  // Default: detect from the job description text.
  lang = detectLanguageHint(descText) || lang;

  // If the customer has language_requirements set, respect it if it clearly prefers one language.
  try {
    const lrRaw = prof?.language_requirements;
    let lrText = "";

    if (Array.isArray(lrRaw)) {
      lrText = lrRaw.join(" ");
    } else if (typeof lrRaw === "string") {
      const s = lrRaw.trim();
      // language_requirements might be stored as JSON text or plain text
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
    // If both are true, keep the job-desc detected language.
  } catch (_) {}

  // 1) Clean CV text (cached)
  const cleanRes = await ensureCvCleanText(env, me.customerId, prof, cvTextRaw, lang);
  const cvTextClean = String(cleanRes?.cv_text || "").trim();
  const cvCleanStatus = cleanRes?.from_cache ? "cached" : "generated";
  const cvCleanModel = cleanRes?.model || null;
  const cleanWarnings = Array.isArray(cleanRes?.warnings) ? cleanRes.warnings : [];

  const cvCleanHash = await sha256Hex(cvTextClean);

  // 2) Structured CV doc (cached)
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

  // Cache key for tailored CV
  const promptVersion = "cv_tailor_v3_structured_professional";
  const inputHash = await sha256Hex([
    promptVersion,
    lang,
    template,
    strength,
    descHash || "no_desc_hash",
    baseHash,
  ].join("|"));

  // Reuse cached tailored CV (same input hash)
  const cacheRows = await supabaseFetch(
    env,
    `/rest/v1/tailored_cvs?select=` +
      `id,status,input_hash,output_hash,language,model,prompt_version,template,strength,cv_text,ats_keywords_used,ats_keywords_missing,confidence,warnings,error,updated_at,created_at` +
      `&customer_id=eq.${me.customerId}&job_id=eq.${jobId}&input_hash=eq.${inputHash}` +
      `&order=updated_at.desc&limit=1`
  );

  const cacheSeconds = Number(env.CV_TAILOR_CACHE_SECONDS || 3600);
  const cached = cacheRows?.[0];
  if (!force && cached && (cached.status === "ok" || cached.status === "ready") && cached.cv_text) {
    const updatedAt = cached.updated_at ? Date.parse(cached.updated_at) : 0;
    const ageSec = updatedAt ? (Date.now() - updatedAt) / 1000 : Infinity;
    if (ageSec <= cacheSeconds) {
      return jsonResponse({
        ok: true,
        cached: true,
        cache_age_seconds: Math.round(ageSec),
        result: {
          job_id: jobId,
          template: cached.template || template,
          strength: cached.strength || strength,
          cv_text: cached.cv_text,
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
          cv_structured_model: cvStructuredModel,
        },
      });
    }
  }

  const currentPlan = await getCustomerPlanRow(env, me.customerId);
  const cvAccess = await resolveCvStudioAccess(env, me.customerId, currentPlan);
  if (cvAccess.limit > 0 && cvAccess.remaining <= 0) {
    return jsonResponse(buildCvQuotaExceededBody(cvAccess), 402, request);
  }

  // Create a row to track status
  const now = new Date().toISOString();
  const modelPref = env.GEMINI_CV_FINAL_MODELS || env.GEMINI_CV_MODEL_QUALITY || (env.GEMINI_CV_MODEL ? `gemini-2.0-pro,${env.GEMINI_CV_MODEL}` : "gemini-2.0-pro,gemini-2.0-flash");

  const insRows = await supabaseFetch(env, `/rest/v1/tailored_cvs`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
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
        created_at: now,
      },
    ],
  });

  const recordId = insRows?.[0]?.id;

  try {
    // Build prompt (structured path preferred)
    let promptText = "";
    if (cvBaseDoc && typeof cvBaseDoc === "object") {
      promptText = buildTailoredCvDocPrompt({
        lang,
        template,
        strength,
        job,
        jobDescription: descText,
        cvBaseDoc,
      });
    } else {
      const cvTextSlice = String(cvTextClean || "").slice(0, 12000);
      promptText = buildTailoredCvPrompt({
        lang,
        job,
        jobDescription: descText,
        cvTextSlice,
      });
    }

    const maxOut = Number(env.GEMINI_CV_MAX_OUTPUT_TOKENS || 3200);
    const gen = await geminiGenerateJsonWithModels(env, {
      models: modelPref,
      promptText,
      temperature: 0.15,
      maxOutputTokens: maxOut,
    });

    const parsed = gen.parsed;
    const usedModel = gen.model;

    // Turn model output into final CV text (stable formatting)
    let outCvDoc = parsed?.cv_doc && typeof parsed.cv_doc === "object" ? parsed.cv_doc : null;
    let cvTextOut = "";

    if (outCvDoc) {
      // Fill missing header fields from base doc / job
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

    const warnSet = new Set();
    const warnings = [];
    for (const w of [...(Array.isArray(parsed?.warnings) ? parsed.warnings : []), ...cleanWarnings]) {
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
        ...(parsed && typeof parsed === "object" ? parsed : {}),
        template,
        strength,
        cv_doc: outCvDoc,
        meta: {
          cv_clean_status: cvCleanStatus,
          cv_clean_model: cvCleanModel,
          cv_structured_status: cvStructuredStatus,
          cv_structured_model: cvStructuredModel,
          desc_cache_status: descCacheStatus,
        },
      },
      ats_keywords_used: Array.isArray(parsed?.ats_keywords_used) ? parsed.ats_keywords_used.slice(0, 250) : [],
      ats_keywords_missing: Array.isArray(parsed?.ats_keywords_missing) ? parsed.ats_keywords_missing.slice(0, 250) : [],
      confidence: typeof parsed?.confidence === "number" ? parsed.confidence : null,
      warnings: warnings.length ? warnings : null,
      error: null,
      updated_at: now,
    };

    if (recordId) {
      await supabaseFetch(env, `/rest/v1/tailored_cvs?id=eq.${recordId}`, {
        method: "PATCH",
        body: rowPatch,
      });
    } else {
      await supabaseFetch(env, `/rest/v1/tailored_cvs`, {
        method: "POST",
        body: [{ ...rowPatch, customer_id: me.customerId, job_id: jobId, input_hash: inputHash, created_at: now }],
      });
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
        warnings: warnings,
        model: usedModel,
        prompt_version: promptVersion,
        desc_cache_status: descCacheStatus,
        cv_clean_status: cvCleanStatus,
        cv_clean_model: cvCleanModel,
        cv_structured_status: cvStructuredStatus,
        cv_structured_model: cvStructuredModel,
      },
    });
  } catch (err) {
    const msg = String(err?.message || err || "CV tailoring failed");
    if (recordId) {
      await supabaseFetch(env, `/rest/v1/tailored_cvs?id=eq.${recordId}`, {
        method: "PATCH",
        body: { status: "error", error: msg, updated_at: now },
      });
    }
    return jsonResponse({ ok: false, error: msg }, 502);
  }
}

/* -----------------------------
  CUSTOMER: POST /me/cv/tailor_from_text
  Converts a pasted job description into a lightweight imported job and
  reuses the regular /me/cv/tailor path so quota, caching, and storage stay aligned.
----------------------------- */

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
  if (jobDescription.length > 60000) {
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
      const parts = jobIdsCsv.split(",").map(s => s.trim()).filter(Boolean);
      const uniq = [];
      const seen = new Set();
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

    // Build PostgREST query
    const params = new URLSearchParams();
    params.set("select", "id,job_id,status,created_at,updated_at,model,language,confidence,ats_keywords_used,ats_keywords_missing,error,prompt_version");
    params.set("customer_id", `eq.${customerId}`);

    if (jobIds.length === 1) {
      params.set("job_id", `eq.${jobIds[0]}`);
      params.set("limit", "1");
    } else {
      const inList = jobIds.map(x => `"${x}"`).join(",");
      params.set("job_id", `in.(${inList})`);
      params.set("limit", String(jobIds.length));
    }

    const rows = await supabaseFetch(env, `/rest/v1/tailored_cvs?${params.toString()}`, { method: "GET" });

    return json(request, { ok: true, me: true, customer_id: customerId, count: rows.length, data: rows }, 200);
  }

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
  
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
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
  
  async function handleMeCvOcrStatus(request, env) {
  const me = await requireMeCustomerId(request, env);
  if (!me.ok) return me.res;
  
  const url = new URL(request.url);
  const opParam = (url.searchParams.get("operation") || url.searchParams.get("op") || "").trim();
  const outParam = (url.searchParams.get("out") || url.searchParams.get("output") || "").trim();
  
  const projectId = mustEnv(env, "GCP_PROJECT_ID");
  const location = (env.GCP_LOCATION || "eu").trim() || "eu";
  
  const profile = await getCustomerCvRow(env, me.customerId);
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
  
  const outUriFromOp =
  op?.response?.responses?.[0]?.outputConfig?.gcsDestination?.uri ||
  op?.response?.outputConfig?.gcsDestination?.uri ||
  "";
  
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
  
  /* -----------------------------
  Cron: nightly fetch jobs for all customers
  ----------------------------- */
  
  async function runNightlyCron(env) {
  const startedAt = new Date().toISOString();
  
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
  
  /* -----------------------------
  Shared core: fetch jobs for one customer (daily protected)
  ----------------------------- */
  
  async function fetchJobsForCustomerCore(customerId, env, fetchedBy = "team", force = false, overrideDesiredTitles = null, options = null) {
  const todayUTC = new Date().toISOString().slice(0, 10);
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
    fetch_mode: (options && options.mode) ? options.mode : null
  };

  const desiredTitlesAll = (Array.isArray(overrideDesiredTitles) && overrideDesiredTitles.length)
    ? overrideDesiredTitles.filter(Boolean)
    : (Array.isArray(p.desired_titles) ? p.desired_titles.filter(Boolean) : []);
  const excludeTitles = Array.isArray(p.exclude_titles) ? p.exclude_titles.filter(Boolean) : [];
  const locations = Array.isArray(p.locations) ? p.locations.filter(Boolean) : [];
  const radiusKmBase = Number.isFinite(Number(p.radius_km)) ? Number(p.radius_km) : 50;

  if (!desiredTitlesAll.length) throw new Error("Customer has no desired_titles");
  if (!locations.length) throw new Error("Customer has no locations");

  const BA_TITLE_LIMIT = 5;
// Expand title set deterministically using role clusters:
// If a desired title matches any cluster title, we also try other titles from that cluster.
// This increases the job pool without calling AI during fetch.
const baseDesiredForBA = desiredTitlesAll.slice(0, BA_TITLE_LIMIT);

// Build excluded set (normalized)
const _normT = (s) => String(s || "").trim().toLowerCase();
const excludeSet = new Set(excludeTitles.map(_normT).filter(Boolean));
const baseSet = new Set(baseDesiredForBA.map(_normT).filter(Boolean));

let expandedTitles = baseDesiredForBA.slice();

try {
  const roleClusters = await loadRoleClusters(env);
  const extra = [];
  const extraLimit = 2; // keep small to avoid BA subrequest explosion

  for (const c of roleClusters || []) {
    const clusterTitles = Array.isArray(c.titles) ? c.titles : [];
    const clusterNormSet = new Set(clusterTitles.map(_normT).filter(Boolean));

    // Does this cluster contain any of the base titles?
    let matches = false;
    for (const bt of baseSet) {
      if (clusterNormSet.has(bt)) { matches = true; break; }
    }
    if (!matches) continue;

    // Add other titles from the same cluster
    for (const t of clusterTitles) {
      const nt = _normT(t);
      if (!nt) continue;
      if (excludeSet.has(nt)) continue;
      if (baseSet.has(nt)) continue;
      if (extra.some(x => _normT(x) === nt)) continue;
      extra.push(String(t).trim());
      if (extra.length >= extraLimit) break;
    }
    if (extra.length >= extraLimit) break;
  }

  expandedTitles = expandedTitles.concat(extra);
} catch (e) {
  // Non-blocking: if role cluster load fails, keep base titles only
  expandedTitles = baseDesiredForBA.slice();
}

// Final cap (VERY IMPORTANT): keep BA requests bounded
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
  
  const passExternalIdSet = new Set();
  
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
  
  /* -----------------------------
  GET /customers/search?email=... (admin)
  ----------------------------- */
  
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
  
  /* -----------------------------
  GET /jobs/search
  ----------------------------- */
  
  async function handleJobSearch(url, env, request) {
  const supabaseUrl = mustEnv(env, "SUPABASE_URL").replace(/\/$/, "");
  const serviceKey = mustEnv(env, "SUPABASE_SERVICE_ROLE_KEY");
  
  const country = (url.searchParams.get("country") || "").trim();
  const q = (url.searchParams.get("q") || "").trim();
  const city = (url.searchParams.get("city") || "").trim();
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "25", 10) || 25, 1), 100);
  const email = (url.searchParams.get("email") || "").trim().toLowerCase();
  
  if (!country) return json(request, { error: "country is required (UK, DE, TH, ID)" }, 400);
  
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
  
  /* -----------------------------
  GET /customers/:customerId/jobs/queue (admin)
  ----------------------------- */
  
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
  // Keep payload minimal for the dashboard job cards.
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
  
  /* -----------------------------
  POST /customers/:customerId/fetch-jobs (admin token)
  ----------------------------- */
  
  async function handleFetchJobsForCustomer(request, url, env) {
  if (!isAdminAuthorized(request, env)) return json(request, { error: "Unauthorized" }, 401);
  
  const customerId = url.pathname.split("/")[2];
  const force = (url.searchParams.get("force") || "").toLowerCase() === "true";
  const result = await fetchJobsForCustomerCore(customerId, env, "team", force);
  return json(request, result, 200);
  }
  
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

  /* -----------------------------
  POST /applications/mark - admin token
  ----------------------------- */
  
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

  const allowedChannels = new Set(["email_manual", "email_gmail", "career_portal", ""]);
  if (!allowedChannels.has(applicationChannelRaw)) {
  return json(request, { error: "Invalid application_channel", allowed: ["email_manual","email_gmail","career_portal"] }, 400);
  }
  const application_channel = applicationChannelRaw || null;

  const from_email = fromEmailRaw ? fromEmailRaw.slice(0, 200) : null;
  if (from_email && !looksLikeEmail(from_email)) {
  return json(request, { error: "from_email must be a valid email if provided" }, 400);
  }

  
  if (!email) return json(request, { error: "email is required" }, 400);
  if (!refnr && !jobIdFromBody) return json(request, { error: "refnr or job_id is required" }, 400);
  
  const allowed = new Set(["new", "shortlisted", "applied", "skipped", "rejected", "expired"]);
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
  updated_at: new Date().toISOString()
  }
  ],
  headers: { Prefer: "resolution=merge-duplicates,return=minimal" }
  });

  // Log timeline events
  try {
    const st = String(status || "").toLowerCase();
    const allowedEvent = new Set(["applied", "rejected", "skipped", "shortlisted", "expired"]);

    // If applied => also log "sent" as identity proof
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

    // Keep existing status event
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
    // non-blocking
  }

  return json(request, { ok: true, email, refnr: refnr || null, job_id: jobId, status, customer_id: customerId }, 200);
  }
  
  /* -----------------------------
  GET /jobs/de/<refnr> (HTML page)
  ----------------------------- */
  
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
  <div class="meta">Germany · ${escapeHtml(city)}${region ? ", " + escapeHtml(region) : ""}</div>
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
  <pre style="white-space:pre-wrap">${escapeHtml(job.description_full || (job.description_full_error ? ("Not fetched yet (last error: " + job.description_full_error + ")") : "Not fetched yet. Use the dashboard to fetch it."))}</pre>
  <div class="hint">${escapeHtml(job.description_full_fetched_at ? ("Fetched at: " + job.description_full_fetched_at) : "")}${job.description_full_source ? " · " + escapeHtml(job.description_full_source) : ""}</div>
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
  </script>
  `;
  
  return htmlPage(request, title, content, 200);
  }
  
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
  
  function escapeHtml(s) {
  return String(s ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");
  }
  
  /* -----------------------------
  POST /ingest/ba (admin token)
  ----------------------------- */
  
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

  // Use OAuth (preferred) if configured; otherwise fallback to X-API-Key via baFetchJson()
  const baJson = await baFetchJson(env, `/pc/v4/jobs?${params.toString()}`);

const jobs = (baJson && (baJson.stellenangebote || baJson.stellenAngebote || baJson.jobs || baJson.items)) || (Array.isArray(baJson) ? baJson : []);
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
  
      const publicBase = getPublicBaseUrl(requestForBase || new Request('https://jobmejob.com/'), env) || "https://jobmejob.com";
  const applyUrl = `${publicBase}/jobs/de/${encodeURIComponent(externalId)}`;
  const postedAtRaw = j.aktuelleVeroeffentlichungsdatum ?? j.veroeffentlichungsdatum ?? j.date ?? null;

  // BA provides a "modifikationsTimestamp" that indicates when the employer last updated the posting.
  // We store this so the dashboard can show "updated X days ago".
  const modTsRaw =
    j.modifikationsTimestamp ??
    j.modifikationsZeitpunkt ??
    j.aenderungsdatum ??
    j.aenderungsdatumZeitpunkt ??
    j.modificationTimestamp ??
    null;

  let sourceModifiedAt = null;
  if (modTsRaw) {
    const d = new Date(modTsRaw);
    if (!Number.isNaN(d.getTime())) {
      sourceModifiedAt = d.toISOString();
    } else {
      const m = String(modTsRaw).match(/^(\d{4}-\d{2}-\d{2})/);
      if (m) {
        const d2 = new Date(m[1] + "T00:00:00Z");
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
  employment_type: (j.arbeitszeit?.toString?.() ?? j.arbeitszeitmodell ?? null),
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
  
