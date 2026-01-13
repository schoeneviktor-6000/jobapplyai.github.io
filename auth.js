/* auth.js - Shared Supabase + JobMeJob auth helpers
IMPORTANT:
- Load AFTER: https://unpkg.com/@supabase/supabase-js@2
- This is a plain JS file (NO <script> tags)
*/
(() => {
"use strict";

/* ============================================================
1) Defaults (frontend-safe)
============================================================ */
const SUPABASE_URL_DEFAULT = "https://awlzvhcnjegfhjedswko.supabase.co";

// Supabase ANON key (public, safe to ship to browser)
const SUPABASE_ANON_KEY_DEFAULT =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3bHp2aGNuamVnZmhqZWRzd2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NTE2OTgsImV4cCI6MjA4MjIyNzY5OH0.-UmHiVi0_g9tKDkr6ldfROeBrOk8hm18YVPRfnb8luY";

// Your Worker API base (default)
const API_BASE_DEFAULT = "https://jobmejob.schoene-viktor.workers.dev";

/* ============================================================
2) Safe localStorage helpers
============================================================ */
function lsGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, val); } catch {}
}
function lsRemove(key) {
  try { localStorage.removeItem(key); } catch {}
}
function lsKeys() {
  try {
    const out = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k) out.push(k);
    }
    return out;
  } catch {
    return [];
  }
}

/* ============================================================
3) Config resolution (NO duplicate consts)
- sb_url / sb_anon can be overridden in localStorage for debugging
- ja_api_base can override API base for debugging
- Also supports window.JobApplyAI.config.API_BASE if already set by page
============================================================ */
if (!lsGet("sb_url")) lsSet("sb_url", SUPABASE_URL_DEFAULT);
if (!lsGet("sb_anon")) lsSet("sb_anon", SUPABASE_ANON_KEY_DEFAULT);

const SUPABASE_URL = (lsGet("sb_url") || "").trim() || SUPABASE_URL_DEFAULT;
const SUPABASE_ANON_KEY = (lsGet("sb_anon") || "").trim() || SUPABASE_ANON_KEY_DEFAULT;

// Debug override: localStorage.setItem("ja_api_base","http://localhost:8787")
const apiOverride = (lsGet("ja_api_base") || "").trim().replace(/\/+$/, "");

// If the page already defined a base (some pages do), reuse it
const apiFromWindow =
  (window.JobApplyAI && window.JobApplyAI.config && window.JobApplyAI.config.API_BASE)
    ? String(window.JobApplyAI.config.API_BASE).trim().replace(/\/+$/, "")
    : "";

const API_BASE = apiOverride || apiFromWindow || API_BASE_DEFAULT;

/* ============================================================
4) Create Supabase client
============================================================ */
if (!window.supabase || typeof window.supabase.createClient !== "function") {
  console.error("[auth.js] supabase-js v2 is not loaded. Include https://unpkg.com/@supabase/supabase-js@2 BEFORE auth.js");
  return;
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

// Backward compatibility: some pages reference window.supabaseClient
window.supabaseClient = supabaseClient;

/* ============================================================
5) Auth helpers
============================================================ */
async function getSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) return null;
  return data && data.session ? data.session : null;
}

async function requireSession(redirectTo = "./signup.html") {
  const session = await getSession();
  if (!session || !session.user || !session.user.email) {
    if (redirectTo) window.location.replace(redirectTo);
    return null;
  }
  return session;
}

async function loginWithGoogle(redirectTo) {
  const rt = redirectTo || (window.location.origin + window.location.pathname);
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: rt }
  });
  if (error) throw error;
}

async function logout(redirectTo = "./index.html") {
  try { await supabaseClient.auth.signOut(); } catch {}

  // Clean only app keys (keep sb_* keys intact to avoid auth weirdness)
  for (const k of lsKeys()) {
    if (k.startsWith("ja_") || k.startsWith("jobapplyai_")) lsRemove(k);
  }
  try { sessionStorage.removeItem("sb_access_token"); } catch {}

  if (redirectTo) window.location.replace(redirectTo);
}

/* ============================================================
6) Backend helper: ensure customer exists
============================================================ */
async function upsertCustomerByEmail(email) {
  const res = await fetch(`${API_BASE}/customers/upsert`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email })
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`Customer upsert failed: ${res.status} ${text}`);
  return JSON.parse(text);
}

// Ensures customer row exists for the logged-in user
async function requireAuthAndCustomer(opts = {}) {
  const redirectTo = opts.redirectTo || "./signup.html";
  const session = await requireSession(redirectTo);
  if (!session) return null;

  const email = String(session.user.email || "").trim().toLowerCase();
  if (!email) {
    if (redirectTo) window.location.replace(redirectTo);
    return null;
  }

  const data = await upsertCustomerByEmail(email);
  const customerId = data && data.customer_id ? String(data.customer_id).trim() : "";

  if (customerId) lsSet("ja_customer_id", customerId);
  lsSet("ja_user_email", email);

  return { session, email, customerId: customerId || null };
}

// Optional: align local flags with backend truth (good for new device/incognito)
async function syncStateToLocalStorage(session) {
  try {
    const token = session && session.access_token ? session.access_token : "";
    if (!token) return null;

    const res = await fetch(`${API_BASE}/me/state`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;

    const state = await res.json();

    if (state && state.customer_id) lsSet("ja_customer_id", String(state.customer_id));
    if (state && state.email) lsSet("ja_user_email", String(state.email).trim().toLowerCase());

    if (state && state.plan_id) lsSet("ja_plan", String(state.plan_id).trim().toLowerCase());
    else lsRemove("ja_plan");

    if (state && state.profile_complete) lsSet("ja_profile_complete", "true");
    else lsRemove("ja_profile_complete");

    return state;
  } catch {
    return null;
  }
}

/* ============================================================
7) Export API for existing pages
============================================================ */
window.JobApplyAI = window.JobApplyAI || {};
window.JobApplyAI.config = window.JobApplyAI.config || {};
window.JobApplyAI.config.API_BASE = API_BASE;
window.JobApplyAI.config.SUPABASE_URL = SUPABASE_URL;

window.JobApplyAI.auth = {
  supabaseClient,
  getSession,
  requireSession,
  loginWithGoogle,
  logout,
  requireAuthAndCustomer,
  syncStateToLocalStorage
};
})();
