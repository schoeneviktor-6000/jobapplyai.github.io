// ================================
// Supabase configuration
// ================================

const SUPABASE_URL = "https://awlzvhcnjegfhjedswko.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3bHp2aGNuamVnZmhqZWRzd2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NTE2OTgsImV4cCI6MjA4MjIyNzY5OH0.-UmHiVi0_g9tKDkr6ldfROeBrOk8hm18YVPRfnb8luY";

// ================================
// Make config available globally
// ================================

// Some pages expect config from localStorage
localStorage.setItem("sb_url", SUPABASE_URL);
localStorage.setItem("sb_anon", SUPABASE_ANON_KEY);

// ================================
// Supabase client initialization
// ================================

// Safety check: supabase-js must be loaded first
if (!window.supabase || !window.supabase.createClient) {
  console.error(
    "Supabase JS not loaded. Make sure @supabase/supabase-js is included before auth.js"
  );
} else {
  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}

// ================================
// Auth helpers
// ================================

async function getSession() {
  if (!window.supabaseClient) return null;
  const { data } = await window.supabaseClient.auth.getSession();
  return data?.session ?? null;
}

async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = "/index.html";
  }
  return session;
}

async function logout() {
  if (!window.supabaseClient) return;
  await window.supabaseClient.auth.signOut();
  window.location.href = "/index.html";
}

// ================================
// Expose helpers globally
// ================================

window.getSession = getSession;
window.requireAuth = requireAuth;
window.logout = logout;
