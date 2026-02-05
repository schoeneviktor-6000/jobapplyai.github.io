/* ============================================================
   BI Dashboard Redesign (KPI strip + trend + funnel + actions)
   - Keeps existing endpoints and UI primitives
   - No external chart libs (HTML bar chart + funnel bars)
   ============================================================ */

let dashRangeDays = 14;                 // controlled by Range chips (14d / 30d)
let dashPrimaryEventType = "sent";      // will fallback to "applied" if "sent" not present
let dashEventsCache = [];              // unfiltered events (for KPIs + charts)
let dashEventsMode = "events";         // "events" | "applications" | "none"
let dashEventsLoadedAt = 0;

function fmtInt(x){ return (typeof x === "number" && isFinite(x)) ? String(Math.round(x)) : "–"; }
function fmtPct(x){
  if(x===null || x===undefined || !isFinite(Number(x))) return "–";
  return (Math.round(Number(x)*10)/10).toFixed(1) + "%";
}
function fmtSigned(n){
  const v = Number(n);
  if(!isFinite(v) || v===0) return "0";
  return (v>0 ? "+" : "") + String(Math.round(v));
}

function startOfLocalDayMs(d){
  const x = d ? new Date(d) : new Date();
  return new Date(x.getFullYear(), x.getMonth(), x.getDate(), 0,0,0,0).getTime();
}
function localDayKeyFromMs(ms){
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const da = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${da}`;
}
function labelFromDayKey(key){
  // key is YYYY-MM-DD
  try{
    const d = new Date(key + "T00:00:00");
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }catch{
    return key.slice(5);
  }
}

function getType(it){
  return String((it && (it.event_type || it.status)) || "").toLowerCase();
}
function getWhenMs(it){
  return safeMs(it && (it.created_at || it.updated_at));
}
function countTypeBetween(items, type, startMs, endMs){
  const arr = Array.isArray(items) ? items : [];
  const t = String(type||"").toLowerCase();
  let n = 0;
  for(const it of arr){
    if(getType(it) !== t) continue;
    const ms = getWhenMs(it);
    if(ms===null) continue;
    if(ms >= startMs && ms < endMs) n++;
  }
  return n;
}
function countAnyBetween(items, types, startMs, endMs){
  const set = new Set((types||[]).map(x=>String(x||"").toLowerCase()));
  const arr = Array.isArray(items) ? items : [];
  let n=0;
  for(const it of arr){
    const ty = getType(it);
    if(!set.has(ty)) continue;
    const ms = getWhenMs(it);
    if(ms===null) continue;
    if(ms >= startMs && ms < endMs) n++;
  }
  return n;
}

async function fetchDashboardEvents(accessToken, force){
  const TTL = 60 * 1000; // keep light; refresh after actions
  if(!force && dashEventsLoadedAt && (Date.now() - dashEventsLoadedAt) < TTL && Array.isArray(dashEventsCache) && dashEventsCache.length){
    return { mode: dashEventsMode, items: dashEventsCache };
  }

  // Try events endpoint first (best for timeline)
  try{
    const resp = await apiGet("/me/application-events?limit=600", accessToken);
    const items = Array.isArray(resp?.data) ? resp.data : [];
    dashEventsCache = items;
    dashEventsMode = "events";
    dashEventsLoadedAt = Date.now();
    return { mode:"events", items };
  }catch(e){
    // Fallback to applications list
    try{
      const resp = await apiGet("/me/applications?limit=600", accessToken);
      const items = Array.isArray(resp?.data) ? resp.data : [];
      dashEventsCache = items;
      dashEventsMode = "applications";
      dashEventsLoadedAt = Date.now();
      return { mode:"applications", items };
    }catch(e2){
      dashEventsCache = [];
      dashEventsMode = "none";
      dashEventsLoadedAt = Date.now();
      return { mode:"none", items:[], error: e2 };
    }
  }
}

function choosePrimaryEventType(items){
  // Prefer "sent" if present in last 30d; otherwise use "applied"
  const arr = Array.isArray(items) ? items : [];
  const since30 = Date.now() - (30*86400000);
  let sent30 = 0, applied30 = 0;
  for(const it of arr){
    const ms = getWhenMs(it);
    if(ms===null || ms < since30) continue;
    const t = getType(it);
    if(t==="sent") sent30++;
    if(t==="applied") applied30++;
  }
  return (sent30>0) ? "sent" : "applied";
}

function computeDailySeries(items, type, days){
  const n = Math.max(1, Number(days)||14);
  const keys = [];
  for(let i=n-1;i>=0;i--){
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(localDayKeyFromMs(d.getTime()));
  }
  const map = new Map(keys.map(k=>[k,0]));
  const arr = Array.isArray(items) ? items : [];
  const startMs = startOfLocalDayMs(new Date(Date.now() - (n-1)*86400000));
  for(const it of arr){
    if(getType(it) !== type) continue;
    const ms = getWhenMs(it);
    if(ms===null || ms < startMs) continue;
    const k = localDayKeyFromMs(ms);
    if(map.has(k)) map.set(k, (map.get(k)||0)+1);
  }
  const values = keys.map(k=>map.get(k)||0);
  const labels = keys.map(k=>labelFromDayKey(k));
  return { keys, labels, values };
}

function renderTrendBars(labels, values, cap){
  const vs = Array.isArray(values) ? values : [];
  const max = Math.max(1, ...(vs.length?vs:[0]), (Number(cap)||0));
  const capPct = (cap && isFinite(Number(cap))) ? Math.min(100, Math.max(0, (Number(cap)/max)*100)) : null;

  const cols = vs.map((v,i)=>{
    const h = Math.min(100, Math.max(0, (Number(v)/max)*100));
    const tip = `${labels[i]||""}: ${v}`;
    return `<div class="barCol" title="${escapeHtml(tip)}"><div class="bar" style="height:${h}%"></div></div>`;
  }).join("");

  const lbls = labels.map((l,i)=>{
    // show every 2nd label to reduce clutter
    const show = (labels.length<=10) ? true : (i%2===0);
    return `<div class="barLbl">${escapeHtml(show ? l : "")}</div>`;
  }).join("");

  return `
    <div class="barChartWrap">
      ${capPct!==null ? `<div class="capLine" style="bottom:${capPct}%"></div>` : ``}
      <div class="barChart">${cols}</div>
      <div class="barLblRow">${lbls}</div>
    </div>
  `;
}

function getTailorStatsFromMap(rangeDays){
  const total = tailorSummaryMap ? tailorSummaryMap.size : 0;
  let scored=0, sumScore=0;

  // For "recent tailored", use updated_at if present
  const sinceMs = Date.now() - ((Number(rangeDays)||14) * 86400000);
  let recent = 0;

  if(tailorSummaryMap && typeof tailorSummaryMap.forEach === "function"){
    tailorSummaryMap.forEach((row)=>{
      const score = (row && typeof row.ats_score === "number") ? row.ats_score : computeAtsMatchPercent(row?.ats_keywords_used, row?.ats_keywords_missing);
      if(score!==null && score!==undefined && isFinite(Number(score))){
        scored++;
        sumScore += Number(score);
      }
      const ms = safeMs(row && row.updated_at);
      if(ms!==null && ms>=sinceMs) recent++;
    });
  }

  const avg = scored ? Math.round((sumScore/scored)) : null;
  return { total, recent, avg };
}

function updateKpiStrip({ planDaily, queueCount, appsTotal, supply, eventsItems, primaryType }){
  // Today
  const startToday = startOfLocalDayMs();
  const endNow = Date.now() + 1;
  const today = countTypeBetween(eventsItems, primaryType, startToday, endNow);

  setText("kpiTodaySent", `${today}/${planDaily||0}`);
  setText("kpiTodaySentLabel", (primaryType==="applied") ? "applied today" : "sent today");
  setText("kpiTodaySentMeta", `Cap: ${planDaily||0}/day • ${today >= (planDaily||0) && planDaily ? "On track" : "Remaining: " + Math.max(0, (planDaily||0)-today)}`);

  const pct = (planDaily && planDaily>0) ? Math.min(1, today/planDaily) : (today>0 ? 1 : 0);
  const fill = document.getElementById("todayMeterFill");
  if(fill) fill.style.width = Math.round(pct*100) + "%";
  setBadge("badgeTodaySent", (planDaily && today>=planDaily) ? "good" : (today>0 ? "" : "warn"), (planDaily && today>=planDaily) ? "On track" : (today>0 ? "In progress" : "Start"));

  // Week (rolling 7d)
  const since7 = Date.now() - (7*86400000);
  const since14 = Date.now() - (14*86400000);
  const last7 = countTypeSince(eventsItems, primaryType, since7);
  const prev7 = countTypeBetween(eventsItems, primaryType, since14, since7);
  setText("kpiWeekSent", fmtInt(last7));
  setText("kpiWeekSentMeta", `vs prev 7d: ${fmtSigned(last7 - prev7)}`);
  setBadge("badgeWeekSent", (last7>0 ? "good" : "warn"), (last7>0 ? "Active" : "Low"));

  // Queue supply
  animateNumber(document.getElementById("kpiQueue"), queueCount);
  const coverDays = (planDaily && planDaily>0) ? (queueCount/planDaily) : null;
  const coverTxt = (coverDays===null) ? "—" : (coverDays<1 ? "today" : `${Math.floor(coverDays)} day${Math.floor(coverDays)===1?"":"s"}`);
  setText("kpiQueueMeta", `Coverage: ${coverTxt} • Fresh ≤2d: ${supply.freshCount ?? "—"}`);
  setBadge("badgeQueue", supply.badgeType || "", supply.healthLabel || "—");
  const sfill = document.getElementById("supplyMeterFill");
  if(sfill) sfill.style.width = Math.round((supply.ratio||0)*100) + "%";

  // Tailoring coverage
  const t = supply.tailorStats || { total:0, avg:null };
  const cov = (queueCount>0) ? (t.total/queueCount) : 0;
  setText("kpiTailorCoverage", queueCount>0 ? `${Math.round(cov*100)}%` : "—");
  setText("kpiTailorMeta", `Avg ATS: ${t.avg===null ? "—" : (String(t.avg)+"%")} • Tailored: ${t.total}`);
  setBadge("badgeTailor", (cov>=0.6 ? "good" : cov>0 ? "warn" : ""), (cov>=0.6 ? "Strong" : cov>0 ? "Some" : "None"));

  // Responses (30d)
  const since30 = Date.now() - (30*86400000);
  const sent30 = countTypeSince(eventsItems, primaryType, since30);
  const resp30 = countAnyBetween(eventsItems, ["replied","reply","response","responded"], since30, Date.now()+1);
  const rr = sent30>0 ? (resp30/sent30)*100 : null;
  setText("kpiResponseRate", rr===null ? "—" : fmtPct(rr));
  setText("kpiResponseMeta", `Responses: ${fmtInt(resp30)} • ${primaryType==="applied" ? "Applied" : "Sent"}: ${fmtInt(sent30)}`);
  setBadge("badgeResponse", (rr!==null && rr>=5) ? "good" : (rr!==null && rr>0 ? "" : "warn"), (rr===null ? "No data" : rr>=5 ? "Good" : rr>0 ? "Some" : "None"));

  // Plan + total apps
  setText("kpiAppsTotal", fmtInt(appsTotal));

  // Status pill (top-right)
  const statusEl = document.getElementById("dashStatusPill");
  if(statusEl){
    const onTrack = planDaily && today>=planDaily;
    const lowSupply = planDaily && coverDays!==null && coverDays<3;
    statusEl.className = "pill mini" + (onTrack ? " active" : "");
    statusEl.textContent = onTrack ? "On track today" : lowSupply ? "Queue needs attention" : "Keep going";
  }
}

function updateTrendAndFunnel({ planDaily, eventsItems, primaryType, rangeDays }){
  // Trend
  const series = computeDailySeries(eventsItems, primaryType, rangeDays);
  const cap = (planDaily && planDaily>0) ? planDaily : null;
  setHtml("trendChart", renderTrendBars(series.labels, series.values, cap));
  setText("trendMeta", `Last ${rangeDays} days · Bars = ${(primaryType==="applied")?"Applied":"Sent"} · Cap line = ${cap===null?"—":cap+"/day"}`);
  const totalRange = series.values.reduce((a,b)=>a+(Number(b)||0),0);
  const avgPerDay = totalRange / Math.max(1, rangeDays);
  setText("trendFoot", `Total: ${fmtInt(totalRange)} • Avg/day: ${fmtInt(avgPerDay)} • Best day: ${fmtInt(Math.max(...series.values))}`);
  setBadge("badgeTrend", totalRange>0 ? "good" : "warn", totalRange>0 ? "Active" : "No activity");

  // Funnel (same range as selected)
  const since = Date.now() - (rangeDays*86400000);
  const end = Date.now()+1;

  const queued = countTypeBetween(eventsItems, "queued", since, end);
  const prioritized = countTypeBetween(eventsItems, "prioritized", since, end);
  const applied = countTypeBetween(eventsItems, "applied", since, end);
  const sent = countTypeBetween(eventsItems, "sent", since, end);
  const replied = countAnyBetween(eventsItems, ["replied","reply","response","responded"], since, end);
  const rejected = countTypeBetween(eventsItems, "rejected", since, end);

  const tailorStats = getTailorStatsFromMap(rangeDays);
  const tailoredRecent = tailorStats.recent || 0;

  const steps = [
    { key:"queued", label:"Queued", n: queued },
    { key:"prioritized", label:"Prioritized", n: prioritized },
    { key:"tailored", label:"Tailored", n: tailoredRecent },
    { key:"applied", label:"Applied", n: applied },
    { key:"sent", label:"Sent", n: sent },
    { key:"replied", label:"Replied", n: replied },
  ];

  const max = Math.max(1, ...steps.map(s=>s.n||0));
  const rows = steps.map((s, idx)=>{
    const prev = idx===0 ? null : steps[idx-1].n;
    const conv = (prev && prev>0) ? Math.round((s.n/prev)*100) : null;
    const w = Math.round((s.n/max)*100);
    return `
      <div class="fRow">
        <div class="fLabel">${escapeHtml(s.label)}</div>
        <div class="fBarWrap"><div class="fBar" style="width:${w}%"></div></div>
        <div class="fVal">${escapeHtml(String(s.n||0))}</div>
        <div class="fConv">${conv===null ? "—" : (String(conv)+"%")}</div>
      </div>
    `;
  }).join("");

  // Bottleneck
  let worst = null;
  for(let i=1;i<steps.length;i++){
    const a = steps[i-1], b = steps[i];
    if(!a.n || a.n<=0) continue;
    const r = (b.n||0)/a.n; // lower is worse
    if(worst===null || r < worst.r){
      worst = { from:a.label, to:b.label, r };
    }
  }
  const bottleneckTxt = worst ? `Biggest drop: ${worst.from} → ${worst.to} (${Math.round(worst.r*100)}% conversion)` : "";

  setHtml("funnelWrap", `<div class="funnel">${rows}</div>`);
  setText("funnelMeta", `Last ${rangeDays} days · Tailored uses your CV tailoring activity`);
  setText("funnelBottleneck", bottleneckTxt || (rejected ? `Rejected: ${rejected} (last ${rangeDays}d)` : ""));
  setBadge("badgeFunnel", (queued>0 || applied>0 || sent>0) ? "good" : "warn", (queued>0 || applied>0 || sent>0) ? "Ready" : "Empty");
}

function renderNextActionsReco({ planDaily, queueCount, eventsItems, primaryType }){
  const startToday = startOfLocalDayMs();
  const today = countTypeBetween(eventsItems, primaryType, startToday, Date.now()+1);

  const coverDays = (planDaily && planDaily>0) ? (queueCount/planDaily) : null;
  const lowSupply = (coverDays!==null && coverDays<3);

  const tailorStats = getTailorStatsFromMap(dashRangeDays);
  const cov = queueCount>0 ? (tailorStats.total/queueCount) : 0;

  const items = [];

  if(planDaily && today < planDaily){
    items.push({
      title: `Finish today’s cap`,
      desc: `You’re at ${today}/${planDaily} ${(primaryType==="applied")?"applied":"sent"} today. Open Jobs and prioritize 1–3 high-fit roles.`,
      actions: [
        { label:"Open Jobs", href:"./jobs.html" },
      ],
      badge: { cls:"warn", text:`${planDaily-today} left` },
    });
  }else if(planDaily){
    items.push({
      title: `You’re on track today`,
      desc: `Daily cap reached (${today}/${planDaily}). Keep an eye on your queue supply so you don’t run out.`,
      actions: [{ label:"Open Jobs", href:"./jobs.html" }],
      badge: { cls:"good", text:"On track" },
    });
  }

  if(planDaily && lowSupply){
    items.push({
      title: `Queue is running low`,
      desc: `Coverage is under 3 days at your current cap. Fetch jobs now and consider broadening titles or radius.`,
      actions: [
        { label:"Fetch jobs", click:"qaFetchJobs" },
        { label:"Adjust search", href:"./profile.html" },
      ],
      badge: { cls:"warn", text:"Low supply" },
    });
  }

  if(queueCount>0 && cov < 0.3){
    items.push({
      title: `Increase tailoring coverage`,
      desc: `Only ~${Math.round(cov*100)}% of queued jobs have a tailored CV saved. Tailoring improves match + consistency.`,
      actions: [
        { label:"Tailor top job", click:"qaTailorTop" },
        { label:"CV Studio", href:"./cv.html" },
      ],
      badge: { cls:"", text:"Quality" },
    });
  }

  if(!items.length){
    items.push({
      title:"Next steps",
      desc:"Fetch jobs, prioritize a few, tailor one CV, then apply consistently.",
      actions:[{ label:"Open Jobs", href:"./jobs.html" }],
      badge:{ cls:"", text:"Ready" },
    });
  }

  const html = `<div class="recoList">` + items.slice(0,4).map(it=>{
    const btns = (it.actions||[]).map(a=>{
      if(a.href){
        return `<a class="btn small" href="${escapeHtml(a.href)}" data-nav="1">${escapeHtml(a.label)}</a>`;
      }
      if(a.scroll){
        return `<button class="btn small ghost" type="button" data-scroll="${escapeHtml(a.scroll)}">${escapeHtml(a.label)}</button>`;
      }
      if(a.click){
        return `<button class="btn small ghost" type="button" data-click="${escapeHtml(a.click)}">${escapeHtml(a.label)}</button>`;
      }
      return "";
    }).join("");

    return `
      <div class="recoItem">
        <div class="recoTop">
          <div>
            <div class="recoTitle">${escapeHtml(it.title)}</div>
            <div class="recoDesc">${escapeHtml(it.desc)}</div>
          </div>
          <div class="badgeGroup"><span class="badge ${escapeHtml(it.badge?.cls||"")}">${escapeHtml(it.badge?.text||"")}</span></div>
        </div>
        <div class="recoActions">${btns}</div>
      </div>
    `;
  }).join("") + `</div>`;

  setHtml("nextActionsReco", html);

  // Wire internal clicks (fetch / tailor) + scroll
  const wrap = document.getElementById("nextActionsReco");
  if(wrap && !wrap._wired){
    wrap._wired = true;
    wrap.addEventListener("click",(e)=>{
      const sc = e.target.closest("button[data-scroll]");
      if(sc){
        const sel = sc.getAttribute("data-scroll");
        const el = sel ? document.querySelector(sel) : null;
        if(el && el.scrollIntoView) el.scrollIntoView({behavior:"smooth", block:"start"});
        return;
      }
      const cl = e.target.closest("button[data-click]");
      if(cl){
        const id = cl.getAttribute("data-click");
        const btn = id ? document.getElementById(id) : null;
        if(btn) btn.click();
      }
    });
  }
}

function renderAutomationHealth({ planDaily, queueCount }){
  const lastTs = Number(localStorage.getItem("jm_last_manual_fetch_ts") || "0");
  const next = getNextFetchAllowedAt();
  const now = Date.now();

  const last = lastTs ? new Date(lastTs).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}) : "—";
  const nextTxt = (!next) ? "—" : (now < next
    ? (()=>{ const sec=Math.ceil((next-now)/1000); const m=Math.floor(sec/60); const s=sec%60; return `${m}:${String(s).padStart(2,"0")} remaining`; })()
    : "available now"
  );

  // Supply freshness (rough: from queue data if available)
  let freshPct = null;
  try{
    const items = (lastQueueResponse && Array.isArray(lastQueueResponse.data)) ? lastQueueResponse.data : [];
    const total = items.length || 0;
    if(total>0){
      const fresh = items.filter(j=>{ const d=daysAgo((j && (j.source_modified_at || j.posted_at)) || null); return d!==null && d<=2; }).length;
      freshPct = Math.round((fresh/total)*100);
    }
  }catch(_){}

  const rows = [
    `<div class="mono">Last fetch: ${escapeHtml(last)}</div>`,
    `<div class="mono">Next manual fetch: ${escapeHtml(nextTxt)}</div>`,
    `<div class="mono">Data freshness (≤2d): ${freshPct===null ? "—" : (String(freshPct)+"%")}</div>`,
  ].join("");

  setHtml("automationHealth", rows);
  setText("automationHealthMeta", planDaily ? `Daily cap: ${planDaily}/day • Queue: ${queueCount}` : `No plan selected • Queue: ${queueCount}`);

  const badgeCls = (freshPct!==null && freshPct>=60) ? "good" : "";
  const badgeTxt = (freshPct===null) ? "OK" : (freshPct>=60 ? "Fresh" : "OK");
  setBadge("badgeAutomation", badgeCls, badgeTxt);
}

function renderAiRecommendations(){
  const listEl = document.getElementById("aiRecoList");
  if(!listEl) return;

  try{
    const {p,c} = getAiJson();
    const has = !!(p && (p.job_titles || p.skills));
    if(!has){
      setBadge("badgeAi","warn","Locked");
      setText("aiRecoHint","Generate suggestions in Profile to unlock AI recommendations.");
      setHtml("aiRecoList",
        `<div class="recoList">
          <div class="recoItem">
            <div class="recoTop">
              <div>
                <div class="recoTitle">Unlock AI suggestions</div>
                <div class="recoDesc">Generate titles and skills from your profile to improve search coverage and tailoring quality.</div>
              </div>
              <div class="badgeGroup"><span class="badge warn">Action</span></div>
            </div>
            <div class="recoActions">
              <a class="btn small" href="./profile.html" data-nav="1">Go to Profile</a>
              <a class="btn small ghost" href="./plan.html" data-nav="1">See plans</a>
            </div>
          </div>
        </div>`
      );
      return;
    }

    setBadge("badgeAi","good","Ready");
    const created = p.created_at ? String(p.created_at).replace("T"," ").slice(0,16) : "";
    setText("aiRecoHint", created ? ("Updated: "+created) : "Updated: —");

    const titles = Array.isArray(p.job_titles) ? p.job_titles.slice(0,6) : [];
    const alt = (c && Array.isArray(c.alternative_titles)) ? c.alternative_titles.slice(0,6) : [];
    const core = (p.skills && Array.isArray(p.skills.core)) ? p.skills.core.slice(0,6) : [];
    const tools = (p.skills && Array.isArray(p.skills.tools)) ? p.skills.tools.slice(0,4) : [];

    const skillList = [...core, ...tools].map(s=>String(s||"").trim()).filter(Boolean).slice(0,10);

    const item = (title, desc, buttons, badge)=>{
      const btns = (buttons||[]).map(b=>{
        if(b.href) return `<a class="btn small" href="${escapeHtml(b.href)}" data-nav="1">${escapeHtml(b.label)}</a>`;
        if(b.click) return `<button class="btn small ghost" type="button" data-click="${escapeHtml(b.click)}">${escapeHtml(b.label)}</button>`;
        return "";
      }).join("");
      return `
        <div class="recoItem">
          <div class="recoTop">
            <div>
              <div class="recoTitle">${escapeHtml(title)}</div>
              <div class="recoDesc">${escapeHtml(desc)}</div>
            </div>
            <div class="badgeGroup"><span class="badge ${escapeHtml(badge?.cls||"")}">${escapeHtml(badge?.text||"")}</span></div>
          </div>
          <div class="recoActions">${btns}</div>
        </div>
      `;
    };

    const cards = [];

    if(titles.length){
      cards.push(item(
        "Focus titles",
        titles.join(" • "),
        [{label:"Adjust search in Profile", href:"./profile.html"}],
        {cls:"good", text:`${titles.length} titles`}
      ));
    }

    if(alt.length){
      cards.push(item(
        "Expand with alternative titles",
        alt.join(" • "),
        [{label:"Add to search", href:"./profile.html"}],
        {cls:"", text:`+${alt.length}`}
      ));
    }

    if(skillList.length){
      cards.push(item(
        "Skills to evidence in your CV",
        skillList.join(" • "),
        [{label:"Open CV Studio", href:"./cv.html"}],
        {cls:"", text:"Quality"}
      ));
    }
    setHtml("aiRecoList", `<div class="recoList">${cards.join("")}</div>`);

    // Wire internal clicks
    if(!listEl._wired){
      listEl._wired = true;
      listEl.addEventListener("click",(e)=>{
        const cl = e.target.closest("button[data-click]");
        if(cl){
          const id = cl.getAttribute("data-click");
          const btn = id ? document.getElementById(id) : null;
          if(btn) btn.click();
        }
      });
    }
  }catch(e){
    setBadge("badgeAi","warn","Locked");
    setText("aiRecoHint","Generate suggestions in Profile to unlock AI recommendations.");
    setHtml("aiRecoList", "");
  }
}

function wireRangeFilters(){
  const wrap = document.getElementById("rangeFilters");
  if(!wrap || wrap._wired) return;
  wrap._wired = true;
  wrap.addEventListener("click", async (e)=>{
    const btn = e.target.closest("button[data-range]");
    if(!btn) return;
    const v = Number(btn.getAttribute("data-range")||"14");
    dashRangeDays = (v===30) ? 30 : 14;

    for(const b of wrap.querySelectorAll(".chip")) b.classList.remove("active");
    btn.classList.add("active");

    // Refresh visuals from cached events (no extra network)
    try{
      const planDaily = currentPlanDaily || 0;
      const eventsItems = Array.isArray(dashEventsCache) ? dashEventsCache : [];
      updateTrendAndFunnel({ planDaily, eventsItems, primaryType: dashPrimaryEventType, rangeDays: dashRangeDays });
      renderNextActionsReco({ planDaily, queueCount: currentQueueCount||0, eventsItems, primaryType: dashPrimaryEventType });
    }catch(_){}
  });
}

function computeSupplyExtras(queue){
  const items=Array.isArray(queue?.data)?queue.data:[];
  const qCount=(typeof queue?.count==="number") ? queue.count : items.length;

  const prioCount = items.filter(j => j && j._application && j._application.priority).length;

  const dOf = (j)=>daysAgo((j && (j.source_modified_at || j.posted_at)) || null);
  const freshCount = items.filter(j=>{ const d=dOf(j); return d!==null && d<=2; }).length;
  const staleCount = items.filter(j=>{ const d=dOf(j); return d!==null && d>=10; }).length;

  return { qCount, prioCount, freshCount, staleCount };
}

async function loadTailorSummariesForQueue(queue){
  try{
    const items=Array.isArray(queue?.data)?queue.data:[];
    const ids=items.map(j=>j && j.id).filter(Boolean).map(String);
    if(!ids.length) return;
    await loadTailorSummariesForJobs(ids);
  }catch(_){}
}

/* Override: refreshQueueAndActivity to also refresh KPIs/charts */
async function refreshQueueAndActivity(){
  const queue = await apiGet("/me/jobs/queue", lastSessionToken);
  lastQueueResponse = queue;

  const extras = computeSupplyExtras(queue);
  currentQueueCount = extras.qCount;

  setHtml("queueWrap", renderQueueCards(queue));

  // Tailor summaries (best-effort, does not block UI)
  await loadTailorSummariesForQueue(queue);

  // Update metrics + charts from unfiltered events cache (force refresh after actions)
  const ev = await fetchDashboardEvents(lastSessionToken, true);
  dashPrimaryEventType = choosePrimaryEventType(ev.items);

  const planDaily = currentPlanDaily || 0;
  const supply = computeSupply(currentQueueCount||0, planDaily);
  supply.freshCount = extras.freshCount;
  supply.prioCount = extras.prioCount;
  supply.staleCount = extras.staleCount;
  supply.tailorStats = getTailorStatsFromMap(dashRangeDays);

  updateKpiStrip({
    planDaily,
    queueCount: currentQueueCount||0,
    appsTotal: Number(document.getElementById("kpiAppsTotal")?.textContent || "0") || 0,
    supply,
    eventsItems: ev.items,
    primaryType: dashPrimaryEventType,
  });
  updateTrendAndFunnel({ planDaily, eventsItems: ev.items, primaryType: dashPrimaryEventType, rangeDays: dashRangeDays });
  renderNextActionsReco({ planDaily, queueCount: currentQueueCount||0, eventsItems: ev.items, primaryType: dashPrimaryEventType });
  renderAutomationHealth({ planDaily, queueCount: currentQueueCount||0 });
  renderAiRecommendations();
}

/* Override: loadDashboard to fill KPI strip + visuals + right rail */
async function loadDashboard(){
  clearTopError();
  setText("errorBox","");
  setHtml("queueError","");

  // Skeleton states (new UI)
  setBadge("badgeTodaySent","","Loading");
  setBadge("badgeWeekSent","","Loading");
  setBadge("badgeQueue","","Loading");
  setBadge("badgeTailor","","Loading");
  setBadge("badgeResponse","","Loading");
  setBadge("badgePlan","","Loading");
  setBadge("badgeTrend","","Loading");
  setBadge("badgeFunnel","","Loading");
  setBadge("badgeAutomation","","Loading");
  setBadge("badgeAi","","Loading");

  setHtml("trendChart", '<div class="skeleton block" style="height:160px"></div>');
  setHtml("funnelWrap", '<div class="skeleton block" style="height:160px"></div>');
  setHtml("nextActionsReco", '<div class="skeleton block" style="height:120px"></div>');
  setHtml("automationHealth", '<div class="skeleton block" style="height:90px"></div>');
  setHtml("aiRecoList", '');

  setText("lastCheck", nowStamp());

  const session = await requireSession();
  if(!session) return;

  // Account display
  const email = session.user && session.user.email ? session.user.email : "—";
  setText("meEmail", email);
  setText("subLine", "Signed in as " + email);

  // Show account dropdown instead of Sign in
  try{
    const acc=document.getElementById("navAccount");
    const sign=document.getElementById("navSignIn");
    if(acc) acc.style.display="";
    if(sign) sign.style.display="none";
    const lbl=document.getElementById("navAccountLabel");
    if(lbl){
      const base = (email && String(email).includes("@")) ? String(email).split("@")[0] : "Account";
      lbl.textContent = base.length>14 ? (base.slice(0,14) + "…") : base;
    }
  }catch(_){}

  // Ensure range chip wiring is live
  wireRangeFilters();

  // Load profile (AI titles are server source of truth)
  try{
    const prof = await apiGet("/me/profile", session.access_token);
    const ai = prof && prof.profile && Array.isArray(prof.profile.ai_titles) ? prof.profile.ai_titles : [];
    window.lastAiTitleSuggestions = ai;
    try{ localStorage.setItem("jm_ai_titles_server", JSON.stringify(ai)); }catch(_){}
  }catch(e){
    try{
      const ai = JSON.parse(localStorage.getItem("jm_ai_titles_server") || "[]");
      window.lastAiTitleSuggestions = Array.isArray(ai) ? ai : [];
    }catch(_){
      window.lastAiTitleSuggestions = [];
    }
  }
// Plan / state
  let state=null;
  try{ state = await apiGet("/me/state", session.access_token); }catch{ state=null; }

  const plan = state && state.plan_id ? planFromState(state.plan_id) : planFallbackFromLocalStorage();
  currentPlanDaily = plan.daily;

  setText("kpiPlanName", plan.name);
  setText("kpiPlanMeta", plan.daily ? plan.meta : "no plan selected");
  setBadge("badgePlan", plan.daily ? "good" : "warn", plan.daily ? "Selected" : "Not selected");

  if(state && state.customer_id){ setText("meCustomerId", state.customer_id); }
  if(state){ setHtml("onboardingChecks", renderOnboardingChecks(state)); }

  // Queue
  let queue=null;
  try{
    queue = await apiGet("/me/jobs/queue", session.access_token);
    lastQueueResponse = queue;
    const extras = computeSupplyExtras(queue);
    currentQueueCount = extras.qCount;

    // Render queue breakdown cards (existing, no titles)
    setHtml("queueWrap", renderQueueCards(queue));

    // Tailored summaries (best-effort)
    await loadTailorSummariesForQueue(queue);

    // Apps summary (total)
    let appsTotal = 0;
    try{
      const apps = await apiGet("/me/applications/summary", session.access_token);
      appsTotal = (typeof apps.total==="number") ? apps.total : 0;
      animateNumber(document.getElementById("kpiAppsTotal"), appsTotal);
      setHtml("appsBreakdown", renderAppsBreakdown(apps));
    }catch(_){
      setText("kpiAppsTotal","–");
      setHtml("appsBreakdown", '<span class="badge warn">Not available</span>');
    }

    // Dashboard events (unfiltered)
    const ev = await fetchDashboardEvents(session.access_token, true);
    dashPrimaryEventType = choosePrimaryEventType(ev.items);

    // Supply + tailor stats
    const supply = computeSupply(currentQueueCount||0, currentPlanDaily||0);
    supply.freshCount = extras.freshCount;
    supply.prioCount = extras.prioCount;
    supply.staleCount = extras.staleCount;
    supply.tailorStats = getTailorStatsFromMap(dashRangeDays);

    // Update KPIs + visuals + right rail
    updateKpiStrip({
      planDaily: currentPlanDaily||0,
      queueCount: currentQueueCount||0,
      appsTotal,
      supply,
      eventsItems: ev.items,
      primaryType: dashPrimaryEventType,
    });
    updateTrendAndFunnel({ planDaily: currentPlanDaily||0, eventsItems: ev.items, primaryType: dashPrimaryEventType, rangeDays: dashRangeDays });
    renderNextActionsReco({ planDaily: currentPlanDaily||0, queueCount: currentQueueCount||0, eventsItems: ev.items, primaryType: dashPrimaryEventType });
    renderAutomationHealth({ planDaily: currentPlanDaily||0, queueCount: currentQueueCount||0 });
    renderAiRecommendations();

  }catch(e){
    setHtml("queueWrap", '<span class="badge bad">Queue failed</span>');
    setHtml("queueError", '<div class="error">'+escapeHtml(e.message)+'</div>');
    setText("errorBox", e.message);
    showTopError(e.message);
  }
}
