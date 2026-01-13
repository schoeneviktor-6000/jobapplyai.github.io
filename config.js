(() => {
"use strict";

const CFG = {
API_BASE_DEFAULT: "https://jobmejob.schoene-viktor.workers.dev",
SUPABASE_URL_DEFAULT: "https://awlzvhcnjegfhjedswko.supabase.co",
SUPABASE_ANON_KEY_DEFAULT:
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3bHp2aGNuamVnZmhqZWRzd2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NTE2OTgsImV4cCI6MjA4MjIyNzY5OH0.-UmHiVi0_g9tKDkr6ldfROeBrOk8hm18YVPRfnb8luY"
};

function lsGet(key){ try{ return localStorage.getItem(key); }catch{ return null; } }
function lsSet(key,val){ try{ localStorage.setItem(key,val); }catch{} }

const apiOverride = (lsGet("jm_api_base") || "").trim().replace(/\/+$/, "");
const sbUrlOverride = (lsGet("sb_url") || "").trim();
const sbAnonOverride = (lsGet("sb_anon") || "").trim();

if(!lsGet("sb_url")) lsSet("sb_url", CFG.SUPABASE_URL_DEFAULT);
if(!lsGet("sb_anon")) lsSet("sb_anon", CFG.SUPABASE_ANON_KEY_DEFAULT);

window.JobMeJob = window.JobMeJob || {};
window.JobMeJob.config = {
API_BASE: apiOverride || CFG.API_BASE_DEFAULT,
SUPABASE_URL: sbUrlOverride || CFG.SUPABASE_URL_DEFAULT,
SUPABASE_ANON_KEY: sbAnonOverride || CFG.SUPABASE_ANON_KEY_DEFAULT
};
})();
