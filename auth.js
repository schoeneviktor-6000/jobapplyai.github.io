/* auth.js - Shared Supabase + JobMeJob auth helpers
IMPORTANT:
- Load AFTER: https://unpkg.com/@supabase/supabase-js@2
- This is a plain JS file (NO <script> tags)
*/
(() => {
"use strict";

// ============================================================
// 1) Project config (frontend-safe)
// ============================================================
const SUPABASE_URL_DEFAULT = "https://awlzvhcnjegfhjedswko.supabase.co";

// Supabase ANON key (public, safe to ship to browser)
const SUPABASE_ANON_KEY_DEFAULT =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3bHp2aGNuamVnZmhqZWRzd2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NTE2OTgsImV4cCI6MjA4MjIyNzY5OH0.-UmHiVi0_g9tKDkr6ldfROeBrOk8hm18YVPRfnb8luY";

// Cloudflare Worker API base URL (UPDATED)
// Use the Worker that actually exists in your Cloudflare account.
const API_BASE = (window.JobApplyAI && window.JobApplyAI.config && window.JobApplyAI.config.API_BASE) || "https://jobmejob.schoene-viktor.workers.dev";

// ============================================================
// 2) Safe localStorage helpers (won't crash in strict browsers)
// ============================================================
function lsGet(key) {
try {
return localStorage.getItem(key);
} catch {
return null;
}
}
function lsSet(key, val) {
try {
localStorage.setItem(key, val);
} catch {
// ignore
}
}
function lsRemove(key) {
try {
localStorage.removeItem(key);
} catch {
// ignore
}
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

// ============================================================
// 3) Ensure sb_url + sb_anon exist (prevents missing config)
// ============================================================
if (!lsGet("sb_url")) lsSet("sb_url", SUPABASE_URL_DEFAULT);
if (!lsGet("sb_anon")) lsSet("sb_anon", SUPABASE_ANON_KEY_DEFAULT);

const SUPABASE_URL = (lsGet("sb_url") || "").trim() || SUPABASE_URL_DEFAULT;
const SUPABASE_ANON_KEY = (lsGet("sb_anon") || "").trim() || SUPABASE_ANON_KEY_DEFAULT;

// Optional override for debugging:
// localStorage.setItem("ja_api_base", "http://localhost:8787")
const API_BASE = ((lsGet("ja_api_base") || "") || API_BASE_DEFAULT).trim().replace(/\/+$/, "");

// ============================================================
// 4) Create Supabase client
// ============================================================
if (!window.supabase || typeof window.supabase.createClient !== "function") {
console.error("[auth.js] supabase-js v2 is not loaded. Include https://unpkg.com/@supabase/supabase-js@2 BEFORE auth.js");
return;
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
auth: {
persistSession: true,
autoRefreshToken: true,
detectSessionInUrl: true
}
});

// Keep compatibility with your existing pages
window.supabaseClient = supabaseClient;

// ============================================================
// 5) Auth helpers
// ============================================================
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
const rt = redirectTo || window.location.href;
await supabaseClient.auth.signInWithOAuth({
provider: "google",
options: { redirectTo: rt }
});
}

async function logout(redirectTo = "./index.html") {
try {
await supabaseClient.auth.signOut();
} catch {
// ignore
}

// Clean app-local state (do NOT touch Supabase internal keys like "sb-...")
for (const k of lsKeys()) {
if (k.startsWith("ja_") || k.startsWith("jobapplyai_")) lsRemove(k);
}
try {
sessionStorage.removeItem("sb_access_token");
} catch {
// ignore
}

if (redirectTo) window.location.replace(redirectTo);
}

// ============================================================
// 6) Backend helpers (ensures customer exists for /me/* endpoints)
// ============================================================
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

// This prevents “only one account works” cases:
// we always ensure the logged-in email has a row in `customers`.
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

// Optional: keep local onboarding flags aligned with backend truth
// (useful when user logs in on a new device, or localStorage was cleared)
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

// ============================================================
// 7) Expose a clean API for your pages
// ============================================================
window.JobApplyAI = window.JobApplyAI || {};
window.JobApplyAI.config = {
API_BASE,
SUPABASE_URL
};
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
