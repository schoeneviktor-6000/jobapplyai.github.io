(() => {
"use strict";
function $(id){ return document.getElementById(id); }
function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function go(url){
  document.body.classList.add("leaving");
  setTimeout(()=>{ window.location.href = url; }, 180);
}
function wireNavTransitions(){
  document.addEventListener("click",(e)=>{
    const a = e.target.closest("a[data-nav='1']");
    if(!a) return;
    const url = a.getAttribute("href");
    if(!url || url.startsWith("#")) return;
    if(/^https?:\/\//i.test(url)) return;
    e.preventDefault();
    go(url);
  });
}
function showTopError(id, msg){
  const el = $(id || "errorTop");
  if(!el) return;
  if(!msg){
    el.style.display = "none";
    el.textContent = "";
    return;
  }
  el.style.display = "block";
  el.textContent = String(msg);
}
function setBadge(id, cls, text){
  const el = $(id);
  if(!el) return;
  el.className = "badge" + (cls ? (" " + cls) : "");
  el.textContent = String(text ?? "");
}
function showModal(id){
  const el = $(id);
  if(!el) return;
  el.style.display = "flex";
  document.body.classList.add("modalOpen");
}
function hideModal(id){
  const el = $(id);
  if(!el) return;
  el.style.display = "none";
  try{
    const anyOpen = Array.from(document.querySelectorAll(".modalBackdrop"))
      .some(m => window.getComputedStyle(m).display !== "none");
    if(!anyOpen) document.body.classList.remove("modalOpen");
  }catch(_){
    document.body.classList.remove("modalOpen");
  }
}
function resolveApiBase(fallback){
  const ls = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const apiOverride = (ls("ja_api_base") || "").trim().replace(/\/+$/, "");
  const apiFromWindow =
    (window.JobApplyAI && window.JobApplyAI.config && window.JobApplyAI.config.API_BASE)
      ? String(window.JobApplyAI.config.API_BASE).trim().replace(/\/+$/, "")
      : "";
  return apiOverride || apiFromWindow || (fallback || "");
}
window.JobMeJobShared = {
  $,
  escapeHtml,
  go,
  wireNavTransitions,
  showTopError,
  setBadge,
  showModal,
  hideModal,
  resolveApiBase
};
})();
