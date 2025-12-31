<script>
  // 1) Supabase config (replace these 2)
  const SUPABASE_URL = "https://awlzvhcnjegfhjedswko.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3bHp2aGNuamVnZmhqZWRzd2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NTE2OTgsImV4cCI6MjA4MjIyNzY5OH0.-UmHiVi0_g9tKDkr6ldfROeBrOk8hm18YVPRfnb8luY";

  // 2) Create client (supabase-js v2)
  const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 3) Expose globally for debugging
  window.supabaseClient = supabaseClient;

  // 4) Helper: require login (redirect if not logged in)
  async function requireAuth() {
    const { data } = await window.supabaseClient.auth.getSession();
    if (!data?.session?.access_token) {
      // redirect to signup page if not logged in
      window.location.href = "./signup.html";
      return null;
    }
    return data.session;
  }

  // 5) Helper: sign in with Google
  async function loginWithGoogle() {
    await window.supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + window.location.pathname
      }
    });
  }

  // 6) Helper: logout
  async function logout() {
    await window.supabaseClient.auth.signOut();
    window.location.href = "./index.html";
  }
</script>
