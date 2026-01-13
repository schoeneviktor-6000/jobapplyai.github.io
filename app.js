(() => {
"use strict";

function $(id){ return document.getElementById(id); }

function lsGet(key){ try{ return localStorage.getItem(key); }catch{ return null; } }
function lsSet(key,val){ try{ localStorage.setItem(key,val); }catch{} }
function lsRemove(key){ try{ localStorage.removeItem(key); }catch{} }

function lsKeys(){
try{
const out=[];
for(let i=0;i<localStorage.length;i++){
const k=localStorage.key(i);
if(k) out.push(k);
}
return out;
}catch{ return []; }
}

function friendlyNetworkError(where, err){
const msg=String(err?.message||err||"");
if(msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("Load failed")){
return where + ": Cannot reach the server. Check connection, VPN/adblock, or try again.";
}
return where + ": " + msg;
}

function resetLocalStateForNewUser(currentEmail){
const now=(String(currentEmail||"").trim().toLowerCase());
if(!now) return;

const last=(String(lsGet("jm_user_email")||lsGet("ja_user_email")||"").trim().toLowerCase());
if(last && last !== now){
for(const k of lsKeys()){
if(k.startsWith("jm_") || k.startsWith("ja_") || k.startsWith("jobmejob_") || k.startsWith("jobapplyai_")){
lsRemove(k);
}
}
try{ sessionStorage.removeItem("sb_access_token"); }catch{}
}
lsSet("jm_user_email", now);
lsSet("ja_user_email", now);
}

function requireSupabase(){
if(!window.supabase || typeof window.supabase.createClient !== "function"){
throw new Error("Supabase library not loaded. Include https://unpkg.com/@supabase/supabase-js@2 before app.js");
}
}

function getConfig(){
const c = window.JobMeJob && window.JobMeJob.config ? window.JobMeJob.config : null;
if(!c || !c.API_BASE || !c.SUPABASE_URL || !c.SUPABASE_ANON_KEY) throw new Error("Missing JobMeJob config");
return c;
}

function createSupabase(){
requireSupabase();
const c=getConfig();
return window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY, {
auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
});
}

let supabaseClient=null;

async function getSession(){
if(!supabaseClient) supabaseClient=createSupabase();
const {data,error}=await supabaseClient.auth.getSession();
if(error) return null;
return data?.session || null;
}

async function requireSession(redirectTo="./signup.html"){
const s=await getSession();
if(!s || !s.user || !s.user.email){
if(redirectTo) window.location.replace(redirectTo);
return null;
}
try{ sessionStorage.setItem("sb_access_token", s.access_token); }catch{}
resetLocalStateForNewUser(s.user.email);
return s;
}

async function loginWithGoogle(redirectTo){
if(!supabaseClient) supabaseClient=createSupabase();
const rt = redirectTo || (window.location.origin + window.location.pathname);
const { error } = await supabaseClient.auth.signInWithOAuth({
provider:"google",
options:{ redirectTo: rt }
});
if(error) throw error;
}

async function logout(redirectTo="./index.html"){
if(!supabaseClient) supabaseClient=createSupabase();
try{ await supabaseClient.auth.signOut(); }catch{}
for(const k of lsKeys()){
if(k.startsWith("jm_") || k.startsWith("ja_") || k.startsWith("jobmejob_") || k.startsWith("jobapplyai_")) lsRemove(k);
}
try{ sessionStorage.removeItem("sb_access_token"); }catch{}
if(redirectTo) window.location.replace(redirectTo);
}

async function apiGet(path, token){
const c=getConfig();
try{
const res=await fetch(c.API_BASE + path, { method:"GET", headers:{ Authorization:"Bearer "+token } });
const text=await res.text().catch(()=> "");
let json=null; try{ json=JSON.parse(text); }catch{ json={raw:text}; }
if(!res.ok){
const msg=(json && (json.error||json.details)) ? (json.error||json.details) : text;
throw new Error(path+" failed: "+res.status+" "+msg);
}
return json;
}catch(e){
throw new Error(friendlyNetworkError(path,e));
}
}

async function apiPostJson(path, token, body){
const c=getConfig();
try{
const res=await fetch(c.API_BASE + path, {
method:"POST",
headers:{ Authorization:"Bearer "+token, "content-type":"application/json" },
body: JSON.stringify(body||{})
});
const text=await res.text().catch(()=> "");
let json=null; try{ json=JSON.parse(text); }catch{ json={raw:text}; }
if(!res.ok){
const msg=(json && (json.error||json.details)) ? (json.error||json.details) : text;
throw new Error(path+" failed: "+res.status+" "+msg);
}
return json;
}catch(e){
throw new Error(friendlyNetworkError(path,e));
}
}

async function apiPostForm(path, token, formData){
const c=getConfig();
try{
const res=await fetch(c.API_BASE + path, {
method:"POST",
headers:{ Authorization:"Bearer "+token },
body: formData
});
const text=await res.text().catch(()=> "");
let json=null; try{ json=JSON.parse(text); }catch{ json={raw:text}; }
if(!res.ok){
const msg=(json && (json.error||json.details)) ? (json.error||json.details) : text;
throw new Error(path+" failed: "+res.status+" "+msg);
}
return json;
}catch(e){
throw new Error(friendlyNetworkError(path,e));
}
}

async function ensureCustomer(email){
const c=getConfig();
try{
const res=await fetch(c.API_BASE + "/customers/upsert", {
method:"POST",
headers:{ "content-type":"application/json" },
body: JSON.stringify({ email })
});
const text=await res.text().catch(()=> "");
if(!res.ok) throw new Error("customers/upsert failed: "+res.status+" "+text);
const data=JSON.parse(text);
if(data?.customer_id){
lsSet("jm_customer_id", data.customer_id);
lsSet("ja_customer_id", data.customer_id);
}
return data;
}catch(e){
throw new Error(friendlyNetworkError("/customers/upsert", e));
}
}

async function getState(token){
return apiGet("/me/state", token);
}

function routeFromState(st){
if(!st || typeof st !== "object") return "./profile.html";
if(!st.profile_complete) return "./profile.html";
if(!st.plan_id) return "./plan.html";
return "./dashboard.html";
}

/* expose */
window.JobMeJob = window.JobMeJob || {};
window.JobMeJob.app = {
$,
getConfig,
createSupabase,
getSession,
requireSession,
loginWithGoogle,
logout,
apiGet,
apiPostJson,
apiPostForm,
ensureCustomer,
getState,
routeFromState,
resetLocalStateForNewUser
};
})();
