  (() => {
    "use strict";

    const S = window.JobMeJobShared || null;
    const APP_CONFIG = window.JobMeJob?.config || window.JobApplyAI?.config || null;
    const APP_LINKS = (APP_CONFIG && APP_CONFIG.LINKS && typeof APP_CONFIG.LINKS === "object")
      ? APP_CONFIG.LINKS
      : {};
    function getAppAuth(){
      return window.JobMeJob?.auth || window.JobApplyAI?.auth || null;
    }

    // Fallbacks (so one missing helper doesn't break the whole page)
    const F = {
      escapeHtml: (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])),
      showModal: (id) => { const el = document.getElementById(id); if(el) el.style.display=""; },
      hideModal: (id) => { const el = document.getElementById(id); if(el) el.style.display="none"; },
      showTopError: (id, msg) => { const el = document.getElementById(id); if(el){ el.textContent = msg||""; el.style.display = msg ? "" : "none"; } },
      setBadge: (id, cls, txt) => {
        const el = document.getElementById(id); if(!el) return;
        el.className = "badge" + (cls ? (" " + cls) : "");
        el.textContent = txt ?? "";
      },
      resolveApiBase: (x) => String(x || "").trim()
    };

    const H = {
      escapeHtml: S?.escapeHtml ? S.escapeHtml : F.escapeHtml,
      showModal: S?.showModal ? S.showModal : F.showModal,
      hideModal: S?.hideModal ? S.hideModal : F.hideModal,
      showTopError: S?.showTopError ? S.showTopError : F.showTopError,
      setBadge: S?.setBadge ? S.setBadge : F.setBadge,
      resolveApiBase: S?.resolveApiBase ? S.resolveApiBase : F.resolveApiBase,
      wireNavTransitions: S?.wireNavTransitions ? S.wireNavTransitions.bind(S) : (()=>{})
    };

    H.wireNavTransitions();

    const $ = (id) => document.getElementById(id);

    const API_BASE = (APP_CONFIG && APP_CONFIG.API_BASE
      ? String(APP_CONFIG.API_BASE)
      : H.resolveApiBase("https://jobmejob.schoene-viktor.workers.dev")
    ).replace(/\/+$/, "");

    let session = null;
    let jobs = [];
    let selectedJob = null;
    let selectedDesc = "";
    let selectedApplyUrl = "";
    const EXT_IMPORT_KEY = "cvstudio_extension_import_v1";
    const EXT_IMPORT_MAX_DESC = 20000;
    const CV_FREE_LIMIT_DEFAULT = 5;
    const CV_ACCESS_CACHE_KEY = "jm_cv_access_cache_v1";
    const CV_UPSELL_AUTO_KEY = "jm_cv_upsell_auto_v1";
    const CV_FONT_KEY = "jmj_cv_font_v1";
    const CV_SECTION_PREFS_KEY = "jmj_cv_section_prefs_v1";
    const CV_CUSTOM_SECTION_PREFIX = "custom:";
    const HEADER_EDITOR_KEY = "__header__";
    const PLAN_CHECKOUT_LINKS = Object.freeze({
      starter: String(APP_LINKS.CV_STUDIO_STARTER_URL || "").trim(),
      plus: String(APP_LINKS.CV_STUDIO_PLUS_URL || "").trim()
    });
    const CONTACT_STYLE_THEMES = Object.freeze({
      plain: {
        kind: "plain",
        preview: { phone:"", email:"", location:"", linkedin:"", portfolio:"" },
        pdf: { phone:"", email:"", location:"", linkedin:"", portfolio:"" }
      },
      classic: {
        kind: "symbol",
        preview: { phone:"☎", email:"✉", location:"⌂", linkedin:"in", portfolio:"↗" },
        pdf: { phone:"tel", email:"mail", location:"loc", linkedin:"in", portfolio:"web" }
      },
      tags: {
        kind: "tag",
        preview: { phone:"TEL", email:"MAIL", location:"LOC", linkedin:"IN", portfolio:"WEB" },
        pdf: { phone:"tel", email:"mail", location:"loc", linkedin:"in", portfolio:"web" }
      }
    });
    const CV_SECTION_KEYS = [
      "summary",
      "experience",
      "education",
      "achievements",
      "skills",
      "courses",
      "interests",
      "languages"
    ];

    // Job source: queue (your saved jobs) vs paste (manual job description)
    let jobSource = "queue"; // "queue" | "paste"
    let pasteDraft = { title:"", company:"", apply:"", lang_hint:"auto", desc:"" };
let pasteCacheKey = "";
let pendingExtensionImport = null;
let lastAccountState = null;
let upgradeCheckoutPlan = "";
let upgradeModalAutoTimer = 0;
let cvStudioAccess = {
  paid: false,
  planId: "",
  limit: CV_FREE_LIMIT_DEFAULT,
  used: 0,
  remaining: CV_FREE_LIMIT_DEFAULT,
  source: "default"
};

// UI: collapsible Setup panel (focus mode)
let setupCollapsed = false;
let setupUserToggled = false;
let setupAutoCollapsedOnce = false;

// UI: generation steps modal (auto-open while generating)
let genModalAuto = false;
let genStepsState = "idle";


    let lastCvText = "";
    let lastCvDoc = null;
    let lastLang = "en";
    let cvFontTheme = "serif";

    // Keyword tracking
    let atsKeywordsAll = [];     // full list from server (union)
    let lastUsed = [];
    let lastMissing = [];
    let lastDebug = {};

    // Edits
    let baseSnapshot = null;
    let historyStack = [];

    // Keyword modal state
    let activeKeywordRaw = "";
    let activeKeywordDisplay = "";
    let kwMode = "ai"; // ai | quick

    // AI placement recommendation (cached per CV+keyword)
    let kwAiReco = null; // { target, exp_index, bullet_index, rewritten_bullet, skill_group, skill_item, reason, confidence }
    let kwAiRecoKey = "";
    const kwAiRecoCache = new Map();
    let kwAiKeywordPretty = "";
    let kwAiRecoToken = 0;

    // "Rewrite again" variants (per keyword + language + selected bullet)
    let kwRewriteVariants = [];   // [{ text, at }]
    let kwRewriteSelected = "reco"; // "reco" or "v:<index>"
    let kwRewriteKey = "";
    let kwRewriteToken = 0;
    let kwRewriteLoading = false;

    // Preview-native keyword placement layer
    let kwSurface = "";
    let kwInlinePickMode = false;
    let kwInlineDraftLoading = false;
    let kwInlineDraftToken = 0;
    const kwInlineDraftCache = new Map();

    // Final QA state (local checks)
    let qaLastRunAt = 0;
    let qaLastHash = "";
    let pdfExportLoading = false;
    let cvSectionPrefs = null;
    let activeSectionEditorKey = "";
    let qaLastReport = null;
    let qaPendingAction = ""; // "", "print", "download"

    // UI language (interface). Keep English UI; keyword insertion language follows your CV language (auto).
    let uiLang = "en";

    /* -------------------------
       i18n (interface)
       ------------------------- */
    const I18N = {
      de: {
        subTitle: "Fuege einen Job ein oder waehle ihn aus Jobs. Wir passen deinen CV an, zeigen ATS-Luecken und bringen dich schnell zum Export.",
        setupTitle: "Setup",
        jobToTailorLbl: "Job auswählen",
        openJobsBtn: "Jobs öffnen",
        btnViewDesc: "Beschreibung ansehen",
        btnCopyDesc: "Beschreibung kopieren",
        templateLbl: "Vorlage",
        atsHintLine: "Klare Struktur, damit ATS-Systeme deinen CV sauber lesen koennen.",
        tailorStrengthLbl: "Tailoring-Stärke",
        light: "Leicht",
        balanced: "Balanced",
        aggressive: "Aggressiv",
        gen: "CV anpassen",
        genAgain: "Erneut anpassen",
        strengthModalTitle: "Tailoring-Staerke waehlen",
        strengthModalIntro: "Waehle eine Option. Danach startet die Anpassung direkt.",
        strengthModalReady: "Bereit. Klicke auf „CV anpassen“ und waehle dann die Staerke.",
        startLightDesc: "Leichte Anpassungen, nah an deinem Original.",
        startBalancedDesc: "Klarerer Fit ohne starkes Umschreiben.",
        startAggressiveDesc: "Staerkeres Rewriting fuer mehr Fit, bleibt aber wahr.",
        stepsTitle: "So funktioniert’s",
        stepsIntro: "Das passiert, wenn du auf „Generieren“ klickst:",
        s1: "Job-Keywords extrahieren",
        s2: "Summary & Bullets anpassen",
        s3: "ATS-sichere Struktur beibehalten",
        s4: "ATS Match berechnen",
        s5: "Preview & Export vorbereiten",
        truthHint: "Nur Inhalte, die bereits in deinem CV stehen, werden verwendet.",
        genStatusDetail: "Wir gleichen deinen aktuellen CV mit dieser Rolle ab.",
        genFocusTitle: "Fokus für diesen Entwurf",
        genFocusTag1: "Rollen-Keywords",
        genFocusTag2: "Stärkere Bullets",
        genFocusTag3: "ATS-sicheres Layout",
        pipelineTitle: "Pipeline-Status",

        tailoredTitle: "Angepasster CV",
        outHint: "Starte mit einem Job, um deinen angepassten CV zu erstellen.",
        kpiAts: "ATS Match",
        atsHint: "Praktischer Fit-Score basierend auf abgedeckten Job-Begriffen.",
        kpiUsed: "Abgedeckte Begriffe",
        kpiUsedHint: "Schon in deinem angepassten CV vorhanden.",
        kpiMissing: "Begriffe zum Hinzufuegen",
        kpiMissingHint: "Klicke einen echten fehlenden Begriff, um ihn direkt im Preview zu platzieren.",
        tabPreview: "Preview",
        tabText: "Manuell bearbeiten",
        tabChanges: "Was sich geaendert hat",
        copy: "Kopieren",
        download: "Download .txt",
        print: "PDF exportieren",
        printBusy: "PDF wird erstellt...",
        printDone: "PDF heruntergeladen.",
        printFallback: "PDF-Download nicht verfuegbar. Druckdialog wird geoeffnet.",
        printFailed: "PDF-Export fehlgeschlagen. Druckdialog wird stattdessen geoeffnet.",
        sectionsTitle: "Abschnitte",
        sectionsHint: "Bearbeite Inhalte, fuege eigene Abschnitte hinzu, blende optionale Bereiche aus oder verschiebe Abschnitte nach oben und unten.",
        sectionsReset: "Standardreihenfolge",
        sectionsAdd: "Abschnitt hinzufuegen",
        fontLbl: "Schriftstil",
        fontHint: "Wird auf Preview und PDF-Export angewendet.",
        fontSerif: "Classic Serif",
        fontSans: "Clean Sans",
        sectionShown: "Anzeigen",
        sectionHidden: "Ausblenden",
        sectionMoveUp: "Nach oben",
        sectionMoveDown: "Nach unten",
        sectionEmpty: "Leer",
        templateProfessional: "Classic Executive",

        atsKwTitle: "ATS Verbesserungen",
        undo: "Undo",
        reset: "Reset",
        copyMissing: "Fehlende kopieren",
        atsKwHint: "Klicke unten nur Begriffe an, die wirklich stimmen. Wir platzieren sie direkt im passenden Bullet im Preview.",
        usedLbl: "Schon abgedeckt",
        missingLbl: "Als Nächstes hinzufügen",
        debugTitle: "Debug Details",

        // Keyword modal
        kwH: "Add keyword",
        kwSub: "Schnellster Gewinn: echte fehlende Begriffe hinzufuegen. Erweiterte Platzierung nur nutzen, wenn du etwas in Erfahrung platzieren willst.",
        close: "Schließen",
        kwTruthLbl: "I confirm this keyword is true for me.",
        kwTruthNote: "We never invent experience. If it's not true, don’t add it.",
        kwWhereLbl: "Where should it appear?",
        kwWhereNote: "Skills is usually the safest option for ATS without adding new claims.",
        kwLangLbl: "Language",
        kwLangNote: "Auto passt zur Sprache deines CV. Wähle Deutsch, wenn dein CV auf Deutsch ist.",
        kwModeLbl: "Insertion mode",
        kwModeAi: "KI Formulierung",
        kwModeQuick: "Schnell hinzufuegen",
        kwModeNote: "KI integriert das Keyword natürlich. Falls dein Backend keinen KI-Endpunkt hat, nutzen wir automatisch Smart-Templates.",
        kwSkillsGroupLbl: "Which skill area?",
        kwSkillsGroupNote: "We add the keyword with clean casing and consistent style.",
        kwExpRoleLbl: "Which role?",
        kwExpHowLbl: "How to insert?",
        kwExpHowNote: "Rewriting is most natural and stays close to your real statements.",
        kwExpBulletLbl: "Which bullet?",
        kwNoteLbl: "Short note (important for new bullet)",
        kwNoteHelp: "Beispiel: „Kundenworkshops moderiert“, „OKRs eingeführt“, „SQL-Reports gebaut“. Damit bleibt es 100% wahrheitsgemäß.",
        kwPreviewLbl: "Preview",
        kwPreviewNote: "You can always use Undo/Reset.",
        kwCancel: "Cancel",
        kwApply: "Begriff hinzufuegen",
        kwInlineHint: "Wir starten mit dem empfohlenen Bullet. Klicke im Preview ein anderes Bullet an, wenn du den Begriff woanders platzieren willst.",
        kwInlinePickHint: "Waehle jetzt ein anderes Bullet direkt im Preview aus.",
        kwInlineCurrent: "Aktuelles Bullet",
        kwInlineSuggested: "Vorgeschlagene Formulierung",
        kwInlineChange: "Formulierung aendern",
        kwInlinePick: "Anderes Bullet waehlen",
        kwInlinePickActive: "Bullet anklicken",
        kwInlineBestFit: "Best fit",
        kwInlineBestFitMarked: "Best fit markiert",
        kwInlineSelected: "Ausgewaehltes Bullet",
        kwInlineAiLoading: "Formulierung wird verfeinert...",
        kwInlineRewriteLoading: "Neue Formulierung wird erstellt...",
        kwInlineAiReady: "KI-Entwurf bereit",
        kwInlineAltReady: "Alternative bereit",
        kwInlineTemplate: "Template-Entwurf",
        kwInlineDiffHint: "Neue Formulierung markiert",
        kwInlineChangeLoading: "Generiere…",
        kwRewriteAgain: "Neu formulieren",
        kwRewriteHelp: "Erstellt eine wirklich andere Formulierung fuer das ausgewaehlte Bullet. Waehle danach die beste Variante und klicke auf Anwenden.",
        kwRewriteNoFresh: "Diesmal konnte keine wirklich neue Formulierung erzeugt werden. Bitte versuche es erneut.",

        // errors
        pickJob: "Bitte wähle zuerst einen Job.",
        needCv: "Bitte generiere zuerst einen CV.",
        truthRequired: "Bitte bestätige, dass das Keyword für dich zutrifft.",
        needDoc: "Für diese Aktion brauchen wir die strukturierte CV-Ansicht (Preview). Bitte generiere den CV erneut.",
        noteRequired: "Bitte gib einen kurzen Hinweis, wie du das Keyword wirklich angewendet hast (für einen neuen Bullet).",
        aiFallback: "KI-Endpunkt nicht verfügbar — Smart-Template wurde verwendet.",
        added: "Eingefügt ✓",
        copied: "Kopiert ✓"
      },
      en: {
        subTitle: "Paste a job or pick one from Jobs. We tailor your CV, show the ATS gaps, and get you ready to send.",
        setupTitle: "Setup",
        jobSourceLbl: "Job source",
        sourceJobs: "From my Jobs",
        sourcePaste: "Paste description",
        jobSourceHint: "Use a saved job from your queue, or paste any job description.",
        pasteJobLbl: "Pasted job (not saved)",
        pasteDescLbl: "Job description",
        pasteHint: "Tip: include Responsibilities + Requirements + Tech stack. Don’t paste confidential info.",
        pasteTitlePh: "Job title (optional)",
        pasteCompanyPh: "Company (optional)",
        pasteApplyPh: "Apply link (optional)",
        pasteLangAuto: "Language: Auto",
        pasteLangEn: "Language: English",
        pasteLangDe: "Language: German",
        pasteTooShort: "Please paste a longer job description (at least 200 characters recommended).",
        pasteTooLong: "Job description is too long. Please shorten it (max 20,000 characters).",
        pasteNotSupported: "Your backend does not support tailoring from pasted job descriptions yet. Implement /me/cv/tailor_from_text in your Worker.",
        jobToTailorLbl: "Job to tailor",
        openJobsBtn: "Open Jobs",
        btnViewDesc: "View description",
        btnCopyDesc: "Copy description",
        templateLbl: "Template",
        atsHintLine: "Clean structure so ATS systems can read your CV reliably.",
        tailorStrengthLbl: "Tailoring strength",
        light: "Light",
        balanced: "Balanced",
        aggressive: "Aggressive",
        gen: "Tailor CV",
        genAgain: "Tailor again",
        strengthModalTitle: "Choose tailoring strength",
        strengthModalIntro: "Pick one option. Tailoring starts right away.",
        strengthModalReady: "Ready. Click Tailor CV, then choose the strength.",
        startLightDesc: "Light edits that stay close to your original.",
        startBalancedDesc: "Clearer fit without heavy rewriting.",
        startAggressiveDesc: "Stronger rewrite for fit, still truthful.",
        stepsTitle: "How it works",
        stepsIntro: "This is what happens when you click “Generate”:",
        s1: "Extract job keywords",
        s2: "Align summary & bullets",
        s3: "Keep ATS-safe structure",
        s4: "Compute ATS match",
        s5: "Prepare preview & export",
        truthHint: "Only details already in your CV are used.",
        genStatusDetail: "Matching your current CV to this role.",
        genFocusTitle: "Focus for this draft",
        genFocusTag1: "Role keywords",
        genFocusTag2: "Stronger bullets",
        genFocusTag3: "ATS-safe layout",
        pipelineTitle: "Pipeline status",

        tailoredTitle: "Tailored CV",
        outHint: "Start with a job to create your tailored CV.",
        kpiAts: "ATS match",
        atsHint: "A practical ATS fit score based on which job terms your CV already covers.",
        kpiUsed: "Covered terms",
        kpiUsedHint: "Already present in your tailored CV.",
        kpiMissing: "Terms to add",
        kpiMissingHint: "Click a true missing term to place it directly in the preview.",
        tabPreview: "Preview",
        tabText: "Manual edit",
        tabChanges: "What changed",
        copy: "Copy",
        download: "Download .txt",
        print: "Export PDF",
        printBusy: "Exporting PDF...",
        printDone: "PDF downloaded.",
        printFallback: "Direct PDF download is unavailable. Opening the print dialog instead.",
        printFailed: "PDF export failed. Opening the print dialog instead.",
        sectionsTitle: "Sections",
        sectionsHint: "Edit content, add custom sections, hide optional blocks, or move sections up and down.",
        sectionsReset: "Reset order",
        sectionsAdd: "Add section",
        fontLbl: "Font style",
        fontHint: "Applied to the preview and PDF export.",
        fontSerif: "Classic serif",
        fontSans: "Clean sans",
        sectionShown: "Shown",
        sectionHidden: "Hidden",
        sectionMoveUp: "Move up",
        sectionMoveDown: "Move down",
        sectionEmpty: "Empty",
        templateProfessional: "Classic Executive",

        atsKwTitle: "ATS improvements",
        undo: "Undo",
        reset: "Reset",
        copyMissing: "Copy missing",
        atsKwHint: "Click only the true missing terms below. We place them straight into the best matching bullet in your preview.",
        usedLbl: "Already covered",
        missingLbl: "Add next",
        debugTitle: "Debug details",

        kwH: "Add keyword",
        kwSub: "Fastest win: add true missing terms. Open advanced placement only if you want to place one inside experience.",
        close: "Close",
        kwTruthLbl: "I confirm this keyword is true for me.",
        kwTruthNote: "We don’t invent experience. If it’s not true, don’t add it.",
        kwWhereLbl: "Where should it appear?",
        kwWhereNote: "Skills is usually the safest ATS option without creating new claims.",
        kwLangLbl: "Language",
        kwLangNote: "Auto matches your CV language. Choose German if your CV is in German.",
        kwModeLbl: "Insert mode",
        kwModeAi: "AI wording",
        kwModeQuick: "Quick add",
        kwModeNote: "AI tries to integrate the keyword naturally. If your backend has no AI endpoint, we automatically fall back to smart templates.",
        kwSkillsGroupLbl: "Which skill area?",
        kwSkillsGroupNote: "We add the keyword in consistent casing and style.",
        kwExpRoleLbl: "Which role?",
        kwExpHowLbl: "How to insert?",
        kwExpHowNote: "Rewriting is most natural and stays close to your real statements.",
        kwExpBulletLbl: "Which bullet?",
        kwNoteLbl: "Short note (important for new bullet)",
        kwNoteHelp: "Example: “Facilitated client workshops”, “Implemented OKRs”, “Built SQL reports”. Keeps it 100% truthful.",
        kwPreviewLbl: "Preview",
        kwPreviewNote: "You can always use Undo/Reset.",
        kwCancel: "Cancel",
        kwApply: "Add term",
        kwInlineHint: "We start with the recommended bullet. Click another bullet in the preview if you want to place the term elsewhere.",
        kwInlinePickHint: "Selection mode is on. Click another bullet directly in the preview.",
        kwInlineCurrent: "Current bullet",
        kwInlineSuggested: "Suggested wording",
        kwInlineChange: "Change wording",
        kwInlinePick: "Select other bullet",
        kwInlinePickActive: "Click a bullet",
        kwInlineBestFit: "Best fit",
        kwInlineBestFitMarked: "Best fit highlighted",
        kwInlineSelected: "Selected bullet",
        kwInlineAiLoading: "Polishing wording...",
        kwInlineRewriteLoading: "Generating a new wording...",
        kwInlineAiReady: "AI draft ready",
        kwInlineAltReady: "Alternative ready",
        kwInlineTemplate: "Template draft",
        kwInlineDiffHint: "New wording highlighted",
        kwInlineChangeLoading: "Generating…",
        kwRewriteAgain: "Rewrite again",
        kwRewriteHelp: "Generates a genuinely different rewrite for the selected bullet. Pick the best one, then click Apply.",
        kwRewriteNoFresh: "Couldn’t generate a genuinely different wording this time. Please try again.",

        pickJob: "Pick a job first.",
        needCv: "Generate a CV first.",
        truthRequired: "Please confirm the keyword is true for you.",
        needDoc: "This action needs the structured CV view (Preview). Please generate again.",
        noteRequired: "Please add a short note describing how you actually used this keyword (for a new bullet).",
        aiFallback: "AI endpoint not available — used smart template instead.",
        added: "Applied ✓",
        copied: "Copied ✓"
      }
    };

    function guessUiLang(){
      return "en"; // Keep the interface in English
    }

    function t(key){
      return (I18N[uiLang] && I18N[uiLang][key]) || (I18N.en[key]) || key;
    }

    function applyUiTexts(){
      uiLang = guessUiLang();
      // top
      $("subTitle").textContent = t("subTitle");
      $("setupTitle").textContent = t("setupTitle");

      // CV Studio: top actions
      try{
        const newLbl = (uiLang==="de") ? "Neuer CV" : "New CV";
        $("btnNewCv") && ($("btnNewCv").textContent = newLbl);
        $("btnNewCv") && ($("btnNewCv").title = (uiLang==="de") ? "Neuen Tailoring-Flow starten" : "Start a new tailoring flow");
        $("btnUpgradeCv") && ($("btnUpgradeCv").textContent = (uiLang==="de") ? "Upgrade" : "Upgrade");
      }catch(_){}

      // Step 1 chooser cards (Gate)
      try{
        if(uiLang==="de"){
          $("gatePickQueueTitle") && ($("gatePickQueueTitle").textContent = "Aus Jobs");
          $("gatePickQueueDesc") && ($("gatePickQueueDesc").textContent = "Wähle einen passenden Job aus deiner Jobs-Liste / Queue.");
          $("gatePickQueueHint") && ($("gatePickQueueHint").textContent = "Empfohlen, wenn du schon Jobs gespeichert hast.");
          $("gatePickQueueTag") && ($("gatePickQueueTag").textContent = "Empfohlen");

          $("gatePickPasteTitle") && ($("gatePickPasteTitle").textContent = "Beschreibung einfügen");
          $("gatePickPasteDesc") && ($("gatePickPasteDesc").textContent = "Füge eine beliebige Stellenbeschreibung (z.B. LinkedIn oder Website) ein.");
          $("gatePickPasteHint") && ($("gatePickPasteHint").textContent = "Tipp: Aufgaben + Anforderungen + Tech-Stack einfügen.");
          $("gatePickPasteTag") && ($("gatePickPasteTag").textContent = "Schnell");
        }
      }catch(_){}

      // Gate back button (visible in Step 2 of the gate)
      try{
        const backLbl = (uiLang==="de") ? "← Zurück" : "← Back";
        $("gateBackBtn") && ($("gateBackBtn").textContent = backLbl);
      }catch(_){}



      // Job source (queue vs paste)
      $("jobSourceLbl").textContent = t("jobSourceLbl");
      $("srcQueue").textContent = t("sourceJobs");
      $("srcPaste").textContent = t("sourcePaste");
      $("jobSourceHint").textContent = t("jobSourceHint");

      $("pasteJobLbl").textContent = t("pasteJobLbl");
      $("pasteDescLbl").textContent = t("pasteDescLbl");
      $("pasteHint").textContent = t("pasteHint");
      $("pasteTitle").setAttribute("placeholder", t("pasteTitlePh"));
      $("pasteCompany").setAttribute("placeholder", t("pasteCompanyPh"));
      $("pasteApply").setAttribute("placeholder", t("pasteApplyPh"));

      const langSel = $("pasteLangHint");
      if(langSel && langSel.options && langSel.options.length >= 3){
        langSel.options[0].textContent = t("pasteLangAuto");
        langSel.options[1].textContent = t("pasteLangEn");
        langSel.options[2].textContent = t("pasteLangDe");
      }

      $("jobToTailorLbl").textContent = t("jobToTailorLbl");
      $("openJobsBtn").textContent = t("openJobsBtn");
      $("btnViewDesc").textContent = t("btnViewDesc");
      $("btnCopyDesc").textContent = t("btnCopyDesc");
      $("templateLbl").textContent = t("templateLbl");
      $("atsHintLine").textContent = t("atsHintLine");
      $("tailorStrengthLbl").textContent = t("tailorStrengthLbl");
      $("pillLight").textContent = t("light");
      $("pillBalanced").textContent = t("balanced");
      $("pillAggressive").textContent = t("aggressive");
      setText("strengthModalTitle", t("strengthModalTitle"));
      setText("strengthModalIntro", t("strengthModalIntro"));
      setText("startLightTitle", t("light"));
      setText("startBalancedTitle", t("balanced"));
      setText("startAggressiveTitle", t("aggressive"));
      setText("startLightDesc", t("startLightDesc"));
      setText("startBalancedDesc", t("startBalancedDesc"));
      setText("startAggressiveDesc", t("startAggressiveDesc"));
      setText("strengthClose", t("close"));
      $("btnGenerate").textContent = t("gen");
      $("btnGenerateAgain").textContent = t("genAgain");

      setText("stepsTitle", t("stepsTitle"));
      setText("stepsIntro", t("stepsIntro"));
      setText("s1", t("s1"));
      setText("s2", t("s2"));
      setText("s3", t("s3"));
      setText("s4", t("s4"));
      setText("s5", t("s5"));
      setText("truthHint", t("truthHint"));
      setText("genStatusDetail", t("genStatusDetail"));
      setText("genFocusTitle", t("genFocusTitle"));
      setText("genFocusTag1", t("genFocusTag1"));
      setText("genFocusTag2", t("genFocusTag2"));
      setText("genFocusTag3", t("genFocusTag3"));
      setText("pipelineTitle", t("pipelineTitle"));

      $("tailoredTitle").textContent = t("tailoredTitle");
      // outHint is dynamic, leave default value for now
      setText("templateValuePill", t("templateProfessional"));
      $("kpiAts").textContent = t("kpiAts");
      $("atsHint").textContent = t("atsHint");
      $("kpiUsed").textContent = t("kpiUsed");
      $("kpiUsedHint").textContent = t("kpiUsedHint");
      $("kpiMissing").textContent = t("kpiMissing");
      $("kpiMissingHint").textContent = t("kpiMissingHint");

      setText("tabPreview", t("tabPreview"));
      setText("tabText", t("tabText"));
      $("tabChanges").textContent = t("tabChanges");
      $("btnCopy").textContent = t("copy");
      $("btnDownload").textContent = t("download");
      $("btnPrint").textContent = pdfExportLoading ? t("printBusy") : t("print");
      setText("sectionsTitle", t("sectionsTitle"));
      setText("sectionsHint", t("sectionsHint"));
      setText("btnAddSection", t("sectionsAdd"));
      setText("btnResetSections", t("sectionsReset"));
      setText("fontLbl", t("fontLbl"));
      setText("fontHint", t("fontHint"));
      setText("fontSerifLbl", t("fontSerif"));
      setText("fontSansLbl", t("fontSans"));
      applyCvFontUi();

      $("atsKwTitle").textContent = t("atsKwTitle");
      $("btnUndoEdit").textContent = t("undo");
      $("btnResetEdits").textContent = t("reset");
      $("btnCopyMissing").textContent = t("copyMissing");
      $("atsKwHint").textContent = t("atsKwHint");
      $("missingLbl").textContent = t("missingLbl");
      setText("usedKeywordsSummary", t("usedLbl"));
      $("debugTitle").textContent = t("debugTitle");

      // Keyword modal
      $("kwH").textContent = t("kwH");
      $("kwSub").textContent = t("kwSub");
      $("kwClose").textContent = t("close");
      setText("kwTruthLbl", t("kwTruthLbl"));
      setText("kwTruthNote", t("kwTruthNote"));
      $("kwWhereLbl").textContent = t("kwWhereLbl");
      $("kwWhereNote").textContent = t("kwWhereNote");
      $("kwLangLbl").textContent = t("kwLangLbl");
      $("kwLangNote").textContent = t("kwLangNote");
      $("kwModeLbl").textContent = t("kwModeLbl");
      $("kwModeAi").textContent = t("kwModeAi");
      $("kwModeQuick").textContent = t("kwModeQuick");
      $("kwModeNote").textContent = t("kwModeNote");
      $("kwSkillsGroupLbl").textContent = t("kwSkillsGroupLbl");
      $("kwSkillsGroupNote").textContent = t("kwSkillsGroupNote");
      $("kwExpRoleLbl").textContent = t("kwExpRoleLbl");
      $("kwExpHowLbl").textContent = t("kwExpHowLbl");
      $("kwExpHowNote").textContent = t("kwExpHowNote");
      $("kwExpBulletLbl").textContent = t("kwExpBulletLbl");
      $("kwNoteLbl").textContent = t("kwNoteLbl");
      $("kwNoteHelp").textContent = t("kwNoteHelp");
      $("kwPreviewLbl").textContent = t("kwPreviewLbl");
      $("kwPreviewNote").textContent = t("kwPreviewNote");
      $("kwCancel").textContent = t("kwCancel");
      $("kwApply").textContent = t("kwApply");
      setText("kwRewriteAgain", t("kwRewriteAgain"));
      setText("kwRewriteHelp", t("kwRewriteHelp"));
      try{ updateSettingsSurfaceUi(); }catch(_){ }
    }

    function toNumberOrNull(v){
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }

    function normalizeCvPlanId(value){
      const raw = String(value || "").trim().toLowerCase();
      if(raw === "starter" || raw === "cv_starter") return "cv_starter";
      if(raw === "plus" || raw === "cv_plus") return "cv_plus";
      if(raw === "free") return "free";
      return raw;
    }

    function normalizeCvAccess(raw){
      const planId = normalizeCvPlanId(raw?.planId || "");
      const paid = !!raw?.paid;
      const explicitLimit = toNumberOrNull(raw?.limit);
      const used = Math.max(0, toNumberOrNull(raw?.used) || 0);
      const limit = explicitLimit !== null
        ? Math.max(0, explicitLimit)
        : (paid ? 0 : CV_FREE_LIMIT_DEFAULT);
      const remaining = limit > 0 ? Math.max(0, limit - used) : null;
      return {
        paid,
        planId,
        limit,
        used,
        remaining,
        source: String(raw?.source || "default")
      };
    }

    function hasCvStudioAccess(){
      return cvStudioAccess.limit > 0 ? (cvStudioAccess.remaining > 0) : true;
    }

    function isFreeCvLimitReached(){
      return !cvStudioAccess.paid && !hasCvStudioAccess();
    }

    function cvUsageLabel(){
      if(cvStudioAccess.paid){
        if(cvStudioAccess.limit > 0){
          const left = Math.max(0, Number(cvStudioAccess.remaining || 0));
          const total = Math.max(0, Number(cvStudioAccess.limit || 0));
          return uiLang === "de"
            ? (`${left} / ${total} diesen Monat übrig`)
            : (`${left} / ${total} left this month`);
        }
        return uiLang === "de" ? "CV Studio Plan aktiv" : "CV Studio plan active";
      }

      const left = Math.max(0, Number(cvStudioAccess.remaining || 0));
      if(left <= 0){
        return uiLang === "de" ? "5 Gratis-CVs verbraucht" : "5 free CVs used";
      }
      return uiLang === "de"
        ? (`${left} Gratis-CVs übrig`)
        : (`${left} free CV${left === 1 ? "" : "s"} left`);
    }

    function cvAccessBlockedMessage(){
      if(cvStudioAccess.paid && cvStudioAccess.limit > 0){
        return uiLang === "de"
          ? "Du hast dein monatliches CV-Studio-Kontingent erreicht. Passe deinen Plan an, um weiter zu generieren."
          : "You've reached your monthly CV Studio quota. Update your plan to keep generating.";
      }
      return uiLang === "de"
        ? "Du hast deine 5 kostenlosen CVs verbraucht. Upgrade auf einen CV-Studio-Plan, um weiter zu generieren."
        : "You've used your 5 free CVs. Upgrade to a CV Studio plan to keep generating.";
    }

    function updateCvUsageUi(){
      const pill = $("cvUsagePill");
      const upgradeBtn = $("btnUpgradeCv");
      if(pill){
        pill.style.display = "";
        pill.textContent = cvUsageLabel();
        pill.className = "pill mini";
        if(!hasCvStudioAccess()) pill.classList.add("warn");
        else if(cvStudioAccess.paid) pill.classList.add("good");
      }
      if(upgradeBtn){
        upgradeBtn.style.display = hasCvStudioAccess() ? "none" : "inline-flex";
      }
      try{ renderUpgradeUi(); }catch(_){}
      try{ maybeAutoOpenUpgradeModal(); }catch(_){}
    }

    function readCachedCvAccess(){
      try{
        const raw = localStorage.getItem(CV_ACCESS_CACHE_KEY);
        if(!raw) return null;
        return normalizeCvAccess(JSON.parse(raw));
      }catch(_){
        return null;
      }
    }

    function writeCachedCvAccess(access){
      try{
        localStorage.setItem(CV_ACCESS_CACHE_KEY, JSON.stringify({
          paid: !!access?.paid,
          planId: String(access?.planId || ""),
          limit: access?.limit,
          used: access?.used,
          source: String(access?.source || "cache"),
          at: Date.now()
        }));
      }catch(_){}
    }

    function extractCvAccessFromState(st){
      if(!st || typeof st !== "object") return null;

      const planId = String(
        st.cv_plan_id ||
        st.cv_studio_plan_id ||
        st.cvstudio_plan_id ||
        st?.entitlements?.cv_plan_id ||
        st?.entitlements?.cv_studio_plan_id ||
        ""
      ).trim().toLowerCase();

      const paid = !!(
        st.cv_paid === true ||
        st.cv_studio_paid === true ||
        st?.entitlements?.cv_paid === true ||
        st?.entitlements?.cv_studio_paid === true ||
        (typeof st.cv_subscription_status === "string" && st.cv_subscription_status.toLowerCase() === "active") ||
        (typeof st.subscription_status === "string" && st.subscription_status.toLowerCase() === "active" && !!planId) ||
        !!planId
      );

      const limit = [
        st.cv_quota_limit,
        st.cv_limit,
        st.cv_free_limit,
        st.cv_trial_limit,
        st.trial_cv_limit,
        st?.entitlements?.cv_quota_limit,
        st?.entitlements?.cv_free_limit
      ].map(toNumberOrNull).find((n) => n !== null);

      const used = [
        st.cv_quota_used,
        st.cv_used,
        st.cv_free_used,
        st.cv_trial_used,
        st.trial_cv_used,
        st?.entitlements?.cv_quota_used,
        st?.entitlements?.cv_free_used
      ].map(toNumberOrNull).find((n) => n !== null);

      if(!paid && limit === undefined && used === undefined) return null;
      return normalizeCvAccess({ paid, planId, limit, used, source:"state" });
    }

    async function fetchCvUsageFromHistory(){
      try{
        const res = await apiGet("/me/cv/tailored?limit=" + encodeURIComponent(String(CV_FREE_LIMIT_DEFAULT + 1)));
        const count = toNumberOrNull(res?.count);
        if(count !== null) return count;
        const rows = Array.isArray(res?.data) ? res.data : [];
        return rows.length;
      }catch(_){
        return null;
      }
    }

    function buildCustomSectionKey(id){
      const clean = String(id || "").trim();
      return clean ? (CV_CUSTOM_SECTION_PREFIX + clean) : "";
    }

    function isCustomSectionKey(key){
      return String(key || "").trim().startsWith(CV_CUSTOM_SECTION_PREFIX);
    }

    function getCustomSectionIdFromKey(key){
      return isCustomSectionKey(key) ? String(key || "").trim().slice(CV_CUSTOM_SECTION_PREFIX.length) : "";
    }

    function createCustomSectionId(){
      return "section_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function normalizeCustomSection(section, index = 0){
      const raw = (section && typeof section === "object") ? section : {};
      const id = String(raw.id || ("section_" + (index + 1))).trim() || ("section_" + (index + 1));
      const title = String(raw.title || "").trim();
      const styleRaw = String(raw.style || "").trim().toLowerCase();
      const style = styleRaw === "bullets" ? "bullets" : "paragraph";
      const items = (Array.isArray(raw.items) ? raw.items : asStringArr(raw.items, 120))
        .map((item) => String(item || "").trim())
        .filter(Boolean);
      return { id, title, style, items };
    }

    function ensureDocCustomSections(doc){
      if(!doc || typeof doc !== "object") return [];
      const raw = Array.isArray(doc.custom_sections) ? doc.custom_sections : [];
      doc.custom_sections = raw.map((section, index) => normalizeCustomSection(section, index));
      return doc.custom_sections;
    }

    function getDocCustomSectionKeys(doc){
      return ensureDocCustomSections(doc)
        .map((section) => buildCustomSectionKey(section.id))
        .filter(Boolean);
    }

    function getRawCustomSectionKeys(raw){
      const hiddenRaw = (raw && typeof raw.hidden === "object" && raw.hidden) ? raw.hidden : {};
      const orderRaw = Array.isArray(raw?.order) ? raw.order.map((x) => String(x || "").trim()) : [];
      const keys = [];
      orderRaw.concat(Object.keys(hiddenRaw || {})).forEach((key) => {
        if(!isCustomSectionKey(key) || keys.includes(key)) return;
        keys.push(key);
      });
      return keys;
    }

    function getAvailableSectionKeys(doc = lastCvDoc, raw = null){
      const keys = [...CV_SECTION_KEYS];
      const customKeys = doc ? getDocCustomSectionKeys(doc) : getRawCustomSectionKeys(raw);
      customKeys.forEach((key) => {
        if(!keys.includes(key)) keys.push(key);
      });
      return keys;
    }

    function isValidSectionKey(key, doc = lastCvDoc){
      if(String(key || "").trim() === HEADER_EDITOR_KEY) return true;
      return getAvailableSectionKeys(doc).includes(String(key || "").trim());
    }

    function defaultCvSectionPrefs(doc = lastCvDoc, raw = null){
      const hidden = {};
      const keys = getAvailableSectionKeys(doc, raw);
      keys.forEach((key) => { hidden[key] = false; });
      return { order: [...keys], hidden };
    }

    function getCustomSectionByKey(doc, key){
      const id = getCustomSectionIdFromKey(key);
      if(!id) return null;
      return ensureDocCustomSections(doc).find((section) => String(section.id) === id) || null;
    }

    function normalizeCvSectionPrefs(raw, doc = lastCvDoc){
      const base = defaultCvSectionPrefs(doc, raw);
      const allowedKeys = getAvailableSectionKeys(doc, raw);
      const allowed = new Set(allowedKeys);
      const hiddenRaw = (raw && typeof raw.hidden === "object" && raw.hidden) ? raw.hidden : {};
      const orderRaw = Array.isArray(raw?.order) ? raw.order.map((x) => String(x || "").trim()) : [];
      const order = [];
      orderRaw.forEach((key) => {
        if(!allowed.has(key) || order.includes(key)) return;
        order.push(key);
      });
      allowedKeys.forEach((key) => {
        if(!order.includes(key)) order.push(key);
        base.hidden[key] = !!hiddenRaw[key];
      });
      base.order = order.filter((key) => allowed.has(key));
      return base;
    }

    function ensureCvSectionPrefs(doc = lastCvDoc){
      if(!cvSectionPrefs) cvSectionPrefs = defaultCvSectionPrefs(doc);
      cvSectionPrefs = normalizeCvSectionPrefs(cvSectionPrefs, doc);
      return cvSectionPrefs;
    }

    function readCvSectionPrefs(doc = null){
      try{
        const raw = localStorage.getItem(CV_SECTION_PREFS_KEY);
        return raw ? normalizeCvSectionPrefs(JSON.parse(raw), doc) : defaultCvSectionPrefs(doc);
      }catch(_){
        return defaultCvSectionPrefs(doc);
      }
    }

    function writeCvSectionPrefs(){
      try{
        localStorage.setItem(CV_SECTION_PREFS_KEY, JSON.stringify(ensureCvSectionPrefs(lastCvDoc)));
      }catch(_){}
    }

    function getCvSectionPrefsSnapshot(){
      return deepCopy(ensureCvSectionPrefs(lastCvDoc));
    }

    function normalizeCvFontTheme(raw){
      return String(raw || "").trim().toLowerCase() === "sans" ? "sans" : "serif";
    }

    function getCvFontPreviewClass(theme = cvFontTheme){
      return normalizeCvFontTheme(theme) === "sans" ? "cvFontSans" : "cvFontSerif";
    }

    function readCvFontTheme(){
      try{
        return normalizeCvFontTheme(localStorage.getItem(CV_FONT_KEY));
      }catch(_){
        return "serif";
      }
    }

    function writeCvFontTheme(){
      try{
        localStorage.setItem(CV_FONT_KEY, normalizeCvFontTheme(cvFontTheme));
      }catch(_){}
    }

    function applyCvFontUi(){
      document.querySelectorAll("[data-font-theme]").forEach((btn) => {
        const theme = normalizeCvFontTheme(btn.getAttribute("data-font-theme"));
        btn.classList.toggle("active", theme === normalizeCvFontTheme(cvFontTheme));
        btn.setAttribute("aria-pressed", theme === normalizeCvFontTheme(cvFontTheme) ? "true" : "false");
      });
    }

    function setCvFontTheme(theme, opts = {}){
      const next = normalizeCvFontTheme(theme);
      const changed = next !== normalizeCvFontTheme(cvFontTheme);
      cvFontTheme = next;
      writeCvFontTheme();
      applyCvFontUi();
      if(changed && opts.render !== false){
        if(lastCvDoc){
          renderCvPreviewFromDoc(lastCvDoc, lastLang);
        }
        persistCurrentCvLocally();
      }
    }

    async function refreshCvStudioAccess(){
      const stateAccess = extractCvAccessFromState(lastAccountState);
      if(stateAccess){
        cvStudioAccess = stateAccess;
        writeCachedCvAccess(cvStudioAccess);
        updateCvUsageUi();
        try{ refreshModeUi(); }catch(_){}
        return cvStudioAccess;
      }

      const historyCount = await fetchCvUsageFromHistory();
      if(historyCount !== null){
        const usedCount = Math.max(historyCount, Number(cvStudioAccess.used || 0));
        cvStudioAccess = normalizeCvAccess({
          paid: false,
          limit: CV_FREE_LIMIT_DEFAULT,
          used: usedCount,
          source: "history"
        });
        writeCachedCvAccess(cvStudioAccess);
        updateCvUsageUi();
        try{ refreshModeUi(); }catch(_){}
        return cvStudioAccess;
      }

      const cached = readCachedCvAccess();
      cvStudioAccess = cached || normalizeCvAccess({ paid:false, limit: CV_FREE_LIMIT_DEFAULT, used:0, source:"cache" });
      updateCvUsageUi();
      try{ refreshModeUi(); }catch(_){}
      return cvStudioAccess;
    }

    function optimisticCvUsageIncrement(){
      if(cvStudioAccess.paid && cvStudioAccess.limit === 0) return;
      cvStudioAccess = normalizeCvAccess({
        ...cvStudioAccess,
        used: Number(cvStudioAccess.used || 0) + 1,
        source: "local"
      });
      writeCachedCvAccess(cvStudioAccess);
      updateCvUsageUi();
    }

    function blockCvGenerationIfNeeded(){
      if(hasCvStudioAccess()) return false;
      const msg = cvAccessBlockedMessage();
      if(!isFreeCvLimitReached()){
        showError(msg);
      }else{
        showError("");
      }
      try{
        const cta = $("ctaHint");
        if(cta){
          cta.style.display = "block";
          cta.textContent = msg;
        }
      }catch(_){}
      try{ setText("outHint", msg); }catch(_){}
      if(!isFreeCvLimitReached()){
        try{ window.JobMeJobShared?.toast?.(msg, { kind:"warn", title:"CV Studio" }); }catch(_){}
      }else{
        try{ openUpgradeModal({ source:"blocked-generate" }); }catch(_){}
      }
      try{ updateCvUsageUi(); }catch(_){}
      return true;
    }

    function syncCvAccessFromApiError(err){
      const body = err && typeof err === "object" ? err.body : null;
      const access = extractCvAccessFromState(body);
      if(!access) return false;
      cvStudioAccess = access;
      writeCachedCvAccess(cvStudioAccess);
      updateCvUsageUi();
      if(isFreeCvLimitReached()){
        try{ openUpgradeModal({ source:"quota-api" }); }catch(_){}
      }
      try{ refreshModeUi(); }catch(_){}
      return true;
    }

    /* -------------------------
       Helpers
       ------------------------- */
    function showError(msg){ H.showTopError("errorTop", msg || ""); }
    function setBadge(id, cls, txt){
      H.setBadge(id, cls, txt);
      // Mirror auth status into the top bar (so it stays visible when Setup is collapsed)
      if(id === "authBadge") H.setBadge("authBadgeTop", cls, txt);
    }
    function setText(id, txt){ const el = $(id); if (el) el.textContent = (txt == null) ? "" : String(txt); }

    function fallbackPlanHref(plan){
      const pid = String(plan || "").trim().toLowerCase();
      if(pid === "starter" && PLAN_CHECKOUT_LINKS.starter) return PLAN_CHECKOUT_LINKS.starter;
      if(pid === "plus" && PLAN_CHECKOUT_LINKS.plus) return PLAN_CHECKOUT_LINKS.plus;
      return "./plan.html#cv-pricing";
    }

    function markUpgradePromptSeen(){
      try{ sessionStorage.setItem(CV_UPSELL_AUTO_KEY, "1"); }catch(_){}
    }

    function buildUpgradeBannerText(){
      let meta = null;
      try{ meta = getActiveJobMeta(); }catch(_){ meta = null; }
      const title = shortText(meta?.title || "", 58);
      const company = shortText(meta?.company_name || "", 34);
      if(title && company){
        return uiLang === "de"
          ? (`Entsperre Starter oder Plus und mache direkt mit ${title} bei ${company} weiter.`)
          : (`Unlock Starter or Plus and keep tailoring ${title} at ${company} without losing your setup.`);
      }
      if(title){
        return uiLang === "de"
          ? (`Entsperre Starter oder Plus und mache direkt mit ${title} weiter.`)
          : (`Unlock Starter or Plus and keep tailoring ${title} without losing your setup.`);
      }
      return uiLang === "de"
        ? "Entsperre Starter oder Plus und mache direkt mit deinem nächsten zugeschnittenen CV weiter."
        : "Unlock Starter or Plus and keep tailoring your next CV without losing your current setup.";
    }

    function buildUpgradeRoleHint(){
      let meta = null;
      try{ meta = getActiveJobMeta(); }catch(_){ meta = null; }
      const title = shortText(meta?.title || "", 64);
      const company = shortText(meta?.company_name || "", 36);
      if(title && company){
        return uiLang === "de"
          ? (`Behalte ${title} bei ${company} griffbereit. Der Checkout startet direkt und dein bezahltes Kontingent wird danach diesem Account zugeordnet.`)
          : (`Keep ${title} at ${company} ready to send. Checkout opens right away, then the paid quota syncs back to this same account.`);
      }
      if(title){
        return uiLang === "de"
          ? (`Behalte ${title} griffbereit. Der Checkout startet direkt und dein bezahltes Kontingent wird danach diesem Account zugeordnet.`)
          : (`Keep ${title} ready to send. Checkout opens right away, then the paid quota syncs back to this same account.`);
      }
      return uiLang === "de"
        ? "Checkout startet direkt in Stripe und dein bezahltes Kontingent wird danach diesem Account zugeordnet."
        : "Checkout opens directly in Stripe, then the paid quota syncs back to this same account.";
    }

    function setUpgradeCheckoutLoading(plan, loading){
      upgradeCheckoutPlan = loading ? String(plan || "").trim().toLowerCase() : "";
      const starterBusy = loading && upgradeCheckoutPlan === "starter";
      const plusBusy = loading && upgradeCheckoutPlan === "plus";

      const starterBtn = $("upgradeStarterBtn");
      if(starterBtn){
        starterBtn.disabled = starterBusy;
        starterBtn.textContent = starterBusy
          ? (uiLang === "de" ? "Checkout wird geoeffnet…" : "Opening checkout…")
          : (uiLang === "de" ? "Starter kaufen" : "Checkout Starter");
      }

      const plusBtn = $("upgradePlusBtn");
      if(plusBtn){
        plusBtn.disabled = plusBusy;
        plusBtn.textContent = plusBusy
          ? (uiLang === "de" ? "Checkout wird geoeffnet…" : "Opening checkout…")
          : (uiLang === "de" ? "Plus kaufen" : "Checkout Plus");
      }
    }

    function renderUpgradeUi(){
      const show = isFreeCvLimitReached();
      const banner = $("cvUpgradeBanner");
      if(banner) banner.style.display = show ? "" : "none";

      const topUpgradeBtn = $("btnUpgradeCv");
      if(topUpgradeBtn){
        topUpgradeBtn.style.display = hasCvStudioAccess() ? "none" : "inline-flex";
        topUpgradeBtn.textContent = show
          ? (uiLang === "de" ? "Plan entsperren" : "Unlock plan")
          : (uiLang === "de" ? "Upgrade" : "Upgrade");
      }

      if(!show){
        try{ closeUpgradeModal(); }catch(_){}
        return;
      }

      const bannerText = buildUpgradeBannerText();
      const roleHint = buildUpgradeRoleHint();

      setText("cvUpgradeBannerBadge", uiLang === "de" ? "Gratislimit erreicht" : "Free plan complete");
      setText("cvUpgradeBannerTrust", uiLang === "de" ? "Sicherer Checkout" : "Secure checkout");
      setText("cvUpgradeBannerTitle", uiLang === "de" ? "Du hast deine 5 Gratis-CVs verbraucht." : "You've used your 5 free CVs.");
      setText("cvUpgradeBannerText", bannerText);
      setText("btnUpgradeBanner", uiLang === "de" ? "Plan entsperren" : "Unlock plan");
      setText("cvUpgradeBannerPricing", uiLang === "de" ? "Alle Preise ansehen" : "See full pricing");

      setText("upgradeModalKicker", uiLang === "de" ? "Gratislimit erreicht" : "Free plan complete");
      setText("upgradeModalTitle", uiLang === "de" ? "Du hast deine 5 Gratis-CVs verbraucht" : "You've used your 5 free CVs");
      setText(
        "upgradeModalSub",
        uiLang === "de"
          ? "Waehle einen Plan und gehe direkt in den sicheren Checkout. Danach wird dein bezahltes Kontingent diesem Account zugeordnet."
          : "Pick a plan and go straight to secure checkout. Your paid quota syncs back to this account after purchase."
      );
      setText("upgradeRoleHint", roleHint);
      setText("upgradeTrust1", uiLang === "de" ? "Sicherer Stripe Checkout" : "Secure Stripe checkout");
      setText("upgradeTrust2", uiLang === "de" ? "Kontingent fuer diesen Account" : "Quota syncs to this account");
      setText("upgradeTrust3", uiLang === "de" ? "Spaeter verwalten oder kuendigen" : "Manage or cancel later");
      setText("upgradeModalClose", t("close"));

      setText("upgradeStarterLead", uiLang === "de" ? "Der schnellste, reibungsarme Upgrade-Schritt fuer aktive woechentliche Bewerbungen." : "The fastest low-friction upgrade for active weekly applications.");
      setText("upgradeStarterTag", uiLang === "de" ? "Empfohlen" : "Recommended");
      setText("upgradeStarterPriceMeta", uiLang === "de" ? "/ Monat" : "/ month");
      setText("upgradeStarterQuota", uiLang === "de" ? "10 zugeschnittene CVs / Monat" : "10 tailored CVs / month");
      setText("upgradeStarterQuotaSub", uiLang === "de" ? "Haelt deine Suche in Bewegung, ohne unnoetig viel Volumen zu kaufen." : "Keeps your search moving without overbuying extra volume.");

      const starterList = $("upgradeStarterList");
      if(starterList){
        starterList.innerHTML = [
          uiLang === "de" ? "Ideal fuer eine fokussierte woechentliche Suche" : "Best for a focused weekly search",
          uiLang === "de" ? "Ein Kontingent fuer Paste-Flow und Extension-Importe" : "Same quota across pasted jobs and extension imports",
          uiLang === "de" ? "Checkout startet sofort in Stripe" : "Checkout opens right away in Stripe"
        ].map((item) => `<li>${H.escapeHtml(item)}</li>`).join("");
      }

      setText("upgradePlusLead", uiLang === "de" ? "Fuer breitere Suchen, mehr Tests und deutlich hoeheres Tailoring-Volumen." : "For broader searches, more experiments, and heavier tailoring volume.");
      setText("upgradePlusTag", uiLang === "de" ? "Mehr Volumen" : "Higher volume");
      setText("upgradePlusPriceMeta", uiLang === "de" ? "/ Monat" : "/ month");
      setText("upgradePlusQuota", uiLang === "de" ? "50 zugeschnittene CVs / Monat" : "50 tailored CVs / month");
      setText("upgradePlusQuotaSub", uiLang === "de" ? "Gedacht fuer taegliche Nutzung ueber mehr Rollen, Firmen und Maerkte hinweg." : "Built for daily use across more roles, companies, and markets.");

      const plusList = $("upgradePlusList");
      if(plusList){
        plusList.innerHTML = [
          uiLang === "de" ? "Ideal fuer hoeheres woechentliches Bewerbungsvolumen" : "Best for heavier weekly application volume",
          uiLang === "de" ? "Mehr Spielraum fuer Tests und breitere Rollenabdeckung" : "More room for A/B testing and broader role coverage",
          uiLang === "de" ? "Ein Upgrade deckt beide Studio-Einstiege ab" : "One upgrade covers both studio entry paths"
        ].map((item) => `<li>${H.escapeHtml(item)}</li>`).join("");
      }

      setText(
        "upgradeModalFootnote",
        uiLang === "de"
          ? "Starter ist das schnellste Upgrade, wenn du jede Woche einige Rollen tailorst. Plus passt besser zu breiteren Suchen und mehr Volumen."
          : "Starter is the quickest upgrade if you tailor a few roles each week. Plus fits broader searches, more experiments, and heavier volume."
      );
      setText("upgradePricingLink", uiLang === "de" ? "Alle Plan-Details vergleichen" : "Compare all plan details");

      setUpgradeCheckoutLoading(upgradeCheckoutPlan, !!upgradeCheckoutPlan);
    }

    function maybeAutoOpenUpgradeModal(){
      if(!isFreeCvLimitReached()) return;
      let alreadySeen = false;
      try{ alreadySeen = sessionStorage.getItem(CV_UPSELL_AUTO_KEY) === "1"; }catch(_){}
      if(alreadySeen) return;
      markUpgradePromptSeen();
      try{ window.clearTimeout(upgradeModalAutoTimer); }catch(_){}
      upgradeModalAutoTimer = window.setTimeout(() => {
        if(isFreeCvLimitReached()){
          try{ openUpgradeModal({ auto:true, source:"quota-auto" }); }catch(_){}
        }
      }, 420);
    }

    function openUpgradeModal(_opts = {}){
      if(!isFreeCvLimitReached()) return;
      markUpgradePromptSeen();
      renderUpgradeUi();
      H.showModal("upgradeModal");
      window.setTimeout(() => {
        try{ $("upgradeStarterBtn")?.focus(); }catch(_){}
      }, 40);
    }

    function closeUpgradeModal(){
      H.hideModal("upgradeModal");
    }

    async function openUpgradeCheckout(plan){
      const pid = String(plan || "").trim().toLowerCase();
      if(pid !== "starter" && pid !== "plus") return;

      markUpgradePromptSeen();
      setUpgradeCheckoutLoading(pid, true);

      try{
        const auth = getAppAuth();
        const activeSession = await getSessionFresh(false);
        if(!activeSession || !activeSession.user || !activeSession.user.email){
          try{ auth?.rememberPostAuthRedirect?.(window.location.pathname + window.location.search + window.location.hash); }catch(_){}
          window.location.href = "./signup.html?entry=cv-studio";
          return;
        }

        const data = await apiPostJson("/me/billing/checkout", { plan_id: pid });
        const target = String(data?.url || "").trim();
        if(target){
          window.location.href = target;
          return;
        }
      }catch(err){
        try{
          window.JobMeJobShared?.toast?.(
            uiLang === "de"
              ? "Checkout wird ueber die Preisseite geoeffnet."
              : "Opening checkout via the pricing page.",
            { kind:"warn", title:"CV Studio" }
          );
        }catch(_){}
      }finally{
        try{
          window.setTimeout(() => {
            if(document.visibilityState !== "hidden"){
              setUpgradeCheckoutLoading("", false);
            }
          }, 180);
        }catch(_){}
      }

      window.location.href = fallbackPlanHref(pid);
    }

/* -------------------------
   Focus mode: collapsible Setup panel + “How it works” modal
   ------------------------- */
function setSetupCollapsed(collapsed, opts = {}){
  const persist = (opts.persist !== false);
  const scroll = (opts.scroll !== false);

  setupCollapsed = !!collapsed;
  const studio = document.querySelector(".studio");
  if(studio) studio.classList.toggle("setupCollapsed", setupCollapsed);

  if(persist){
    try{ localStorage.setItem("cvstudio_setup_collapsed", setupCollapsed ? "1" : "0"); }catch(_){}
  }

  if(scroll && setupCollapsed){
    try{ document.querySelector(".studioCanvas")?.scrollIntoView({ behavior:"smooth", block:"start" }); }catch(_){}
  }
}

function maybeAutoCollapseAfterPaste(){
  if(jobSource !== "paste") return;
  if(setupUserToggled) return;
  if(setupAutoCollapsedOnce) return;

  const desc = getPasteDesc();
  if(desc.length < 260) return;

  // Collapse only after the user stopped typing for a moment (prevents jumpiness)
  window.clearTimeout(maybeAutoCollapseAfterPaste._t);
  maybeAutoCollapseAfterPaste._t = window.setTimeout(() => {
    if(jobSource !== "paste") return;
    if(setupUserToggled) return;
    if(setupAutoCollapsedOnce) return;
    if(getPasteDesc().length >= 260){
      setupAutoCollapsedOnce = true;
      // Leaving Step 1 gate (if active) opens the full studio view
      exitGate();

      setSetupCollapsed(true, { persist:false });
    }
  }, 900);
}

function openGenModal(auto = false){
  genModalAuto = !!auto;

  // Ensure labels are localized (light touch; no refactor)
  setText("genVizLabel", uiLang==="de" ? "Tailoring-Vorschau" : "Tailoring preview");
  setText("genVizJdTitle", uiLang==="de" ? "Anforderungen" : "Role requirements");
  setText("genVizCvTitle", uiLang==="de" ? "Dein CV" : "Your CV");
  setText("genVizOutTitle", uiLang==="de" ? "Angepasster Entwurf" : "Tailored draft");

  const jm = getActiveJobMeta();
  const title = (jm && jm.title) ? String(jm.title).trim() : "";
  const company = (jm && jm.company_name) ? String(jm.company_name).trim() : "";
  const titleLabel = title
    ? (uiLang==="de" ? ("Anpassung für " + shortText(title, 58)) : ("Tailoring for " + shortText(title, 58)))
    : (uiLang==="de" ? "CV wird angepasst" : "Tailoring your CV");
  const subParts = [];
  if(company) subParts.push(company);
  subParts.push(uiLang==="de" ? "Nur vorhandene Inhalte, ATS-sicher." : "Only what is already in your CV, ATS-safe.");
  const roleLabel = title && company
    ? (title + (uiLang==="de" ? " bei " : " at ") + company)
    : (title || company || "");
  const statusDetail = roleLabel
    ? (uiLang==="de"
        ? ("Wir gleichen deinen aktuellen CV mit " + shortText(roleLabel, 86) + " ab.")
        : ("Matching your current CV to " + shortText(roleLabel, 86) + "."))
    : t("genStatusDetail");

  setText("genTitle", titleLabel);
  setText("genSub", subParts.join(" · "));
  setText("genStatusDetail", statusDetail);

  // Show the job title at the top of the “Tailored CV” card
  setText("genVizJobTitle", title || "—");
  setText("genVizJobMeta", company || "");

  // Sync the little animation to current state (idle/running/done/error)
  try{ setGenVizState(auto ? "running" : (genStepsState || "idle")); }catch(_){ }

  H.showModal("genModal");
}


function closeGenModal(){
  genModalAuto = false;
  H.hideModal("genModal");
}

function openStrengthModal(){
  const btn = $("btnGenerate");
  if(btn && btn.disabled) return;
  if(isFreeCvLimitReached()){
    openUpgradeModal({ source:"generate-cta" });
    return;
  }
  H.showModal("strengthModal");
}

function closeStrengthModal(){
  H.hideModal("strengthModal");
}

async function startWithStrength(level){
  try{
    $("strengthRange").value = String(level);
    setStrengthUi();
  }catch(_){}

  closeStrengthModal();
  await generate();
}

    function qs(name){
      try{ return new URL(window.location.href).searchParams.get(name); }
      catch{ return null; }
    }

    function joinNonEmpty(arr, sep){
      return (arr || []).map(x => String(x || "").trim()).filter(Boolean).join(sep);
    }
    function asStringArr(arr, max=999){
      if(!Array.isArray(arr)) return [];
      return arr.map(x => String(x || "").trim()).filter(Boolean).slice(0, max);
    }

    // Small, stable hash for caching pasted descriptions in localStorage
    function fnv1a(str){
      let h = 0x811c9dc5;
      const s = String(str || "");
      for(let i=0;i<s.length;i++){
        h ^= s.charCodeAt(i);
        h = (h + ((h<<1) + (h<<4) + (h<<7) + (h<<8) + (h<<24))) >>> 0;
      }
      return ("00000000" + h.toString(16)).slice(-8);
    }

    
/* -------------------------
   Step 1 Gate (entry flow)
   ------------------------- */

/* -------------------------
   Incoming from Jobs (auto-start)
   ------------------------- */
let incomingJobId = "";
let autoStartTimer = null;
let autoStartArmed = false;

function isIncomingFromJobs(){
  return !!String(incomingJobId || "").trim();
}

function setFromJobsUi(){
  document.body.classList.toggle("fromJobsLink", isIncomingFromJobs());
}

function showAutoStartBar(show, msg){
  const bar = $("autoStartBar");
  if(!bar) return;
  bar.style.display = show ? "" : "none";
  if(msg){
    const d = $("autoStartDesc");
    if(d) d.textContent = String(msg);
  }
}

function clearAutoStartTimer(){
  if(autoStartTimer){
    try{ clearTimeout(autoStartTimer); }catch(_){}
    autoStartTimer = null;
  }
  autoStartArmed = false;
}

function cancelAutoStart(userInitiated = true){
  clearAutoStartTimer();
  showAutoStartBar(false);
  if(userInitiated){
    try{ window.JobMeJobShared?.toast?.("Tip hidden. Adjust the settings and click Tailor CV.", { kind:"warn", title:"CV Studio" }); }catch(_){}
  }
}


/* -------------------------
   Guided settings glow (Jobs → CV Studio)
   - Highlights Template + Tailoring strength until user clicks Generate
   ------------------------- */
let guidedSettingsGlowOn = false;

function setGuidedSettingsGlow(on){
  guidedSettingsGlowOn = !!on;

  // Template: highlight the entire row (select + ATS? button)
  let tplRow = null;
  try{
    const sel = $("tplSelect");
    tplRow = sel && sel.closest ? sel.closest(".row") : null;
  }catch(_){}

  // Strength: highlight the whole strength wrapper
  let strengthBox = null;
  try{
    strengthBox = document.querySelector(".strengthWrap");
  }catch(_){}

  const els = [tplRow, strengthBox];
  for(const el of els){
    if(!el) continue;
    el.classList.toggle("guidedGlow", guidedSettingsGlowOn);
    el.classList.toggle("guidedPulse", guidedSettingsGlowOn);
  }
}

function armAutoStartFromJobs(){
  if(!isIncomingFromJobs()) return;

  // Only meaningful in queue mode
  if(jobSource !== "queue") return;
  if(!selectedJob) return;

  // Safety: if the job_id isn't in your queue, don't proceed (avoid tailoring the wrong job)
  if(String(selectedJob?.id || "") !== String(incomingJobId || "")){
    showAutoStartBar(false);
    try{
      window.JobMeJobShared?.toast?.(
        uiLang==="de"
          ? "Dieser Job ist nicht in deiner Queue. Öffne Jobs und lade (fetch) erneut."
          : "This job isn’t in your queue. Open Jobs and fetch again.",
        { kind:"warn", title:"CV Studio" }
      );
    }catch(_){}
    return;
  }

  // IMPORTANT UX:
  // Coming from Jobs should *stop* at the tailoring settings so the user can review Template + Strength.
  // No auto-start.
  try{ setSetupCollapsed(false, { persist:false, scroll:false }); }catch(_){}
  setupUserToggled = true;
  try{ $("settingsDetails").open = true; }catch(_){}

  showAutoStartBar(true, uiLang==="de"
    ? "Waehle die Staerke, dann passe den CV an."
    : "Pick a strength, then tailor."
  );

  try{ setGuidedSettingsGlow(true); }catch(_){ }


  // No timer, no auto-run.
}

let gateActive = false;

let gateView = "choose"; // "choose" | "form"

function setGateView(view){
  gateView = (view === "form") ? "form" : "choose";

  // Helper class so CSS can handle most visibility rules
  document.body.classList.toggle("cvGateForm", gateActive && gateView === "form");

  // Explicit toggles (safe if elements are missing)
  const chooser = $("gateChooser");
  const formWrap = $("gateFormWrap");
  const backRow = $("gateBackRow");
  const backBadge = $("gateBackBadge");
  const sourceLbl = $("jobSourceLbl");
  const sourcePills = $("sourcePills");
  const sourceHint = $("jobSourceHint");

  if(chooser) chooser.style.display = (gateActive && gateView === "choose") ? "" : "none";
  if(formWrap) formWrap.style.display = (!gateActive || gateView === "form") ? "" : "none";
  if(backRow) backRow.style.display = (gateActive && gateView === "form") ? "flex" : "none";
  if(sourceLbl) sourceLbl.style.display = (gateView === "form") ? "none" : "";
  if(sourcePills) sourcePills.style.display = (gateView === "form") ? "none" : "";
  if(sourceHint) sourceHint.style.display = (gateView === "form") ? "none" : "";

  // Update step header copy (keeps the flow obvious)
  const st = $("setupTitle");
  const title = $("gateStepTitle");
  const hint = $("gateStepHint");
  const badge = $("gateStepBadge");

  if(!gateActive){
    if(st) st.textContent = t("setupTitle") || "Setup";
    return;
  }

  if(gateView === "choose"){
    // The stepper already communicates the step number — keep this header clean.
    if(st) st.textContent = t("setupTitle") || "Setup";
    if(title) title.textContent = (uiLang==="de")
      ? "Job-Quelle wählen"
      : "Choose your job source";
    if(hint) hint.textContent = (uiLang==="de")
      ? "Wähle den schnellsten Weg zu deinem angepassten CV."
      : "Choose the fastest path to your tailored CV.";
    try{ renderGateStepper(1); }catch(_){ }
    return;
  }

  // gateView === "form"
  if(st) st.textContent = t("setupTitle") || "Setup";
  if(title) title.textContent = (uiLang==="de")
    ? "Job-Details hinzufügen"
    : "Add job details";

  // Keep "Settings (optional)" open by default in Step 2 (both sources)
  try{ $("settingsDetails").open = true; }catch(_){ }

  if(hint){
    hint.textContent = (jobSource === "paste")
      ? ((uiLang==="de")
          ? "Füge die Stellenbeschreibung ein. Das komplette Posting liefert die besten ATS-Hinweise."
          : "Paste the job description. The full posting gives the best ATS guidance.")
      : ((uiLang==="de")
          ? "Wähle den Job aus, den du jetzt anpassen willst."
          : "Pick the job you want to tailor right now.");
  }
  try{ renderGateStepper(2); }catch(_){ }
  try{ updateCtaHint(); }catch(_){ }
}

  function renderGateStepper(step){
    const wrap = $("gateStepper");
    if(!wrap) return;

    const l1 = $("stepperLbl1");
    const l2 = $("stepperLbl2");
    const l3 = $("stepperLbl3");
    if(l1) l1.textContent = (uiLang==="de") ? "Quelle" : "Source";
    if(l2) l2.textContent = (uiLang==="de") ? "Details" : "Details";
    if(l3) l3.textContent = (uiLang==="de") ? "Studio" : "Studio";

    const s1 = $("stepper1");
    const s2 = $("stepper2");
    const s3 = $("stepper3");
    const l12 = $("stepLine12");
    const l23 = $("stepLine23");

    const clear = (el) => { if(el){ el.classList.remove("active"); el.classList.remove("done"); } };
    const clearLine = (el) => { if(el){ el.classList.remove("done"); } };
    clear(s1); clear(s2); clear(s3);
    clearLine(l12); clearLine(l23);

    const st = Number(step) || 1;
    if(st <= 1){
      if(s1) s1.classList.add("active");
      return;
    }
    if(st === 2){
      if(s1) s1.classList.add("done");
      if(l12) l12.classList.add("done");
      if(s2) s2.classList.add("active");
      return;
    }
    // step 3
    if(s1) s1.classList.add("done");
    if(l12) l12.classList.add("done");
    if(s2) s2.classList.add("done");
    if(l23) l23.classList.add("done");
    if(s3) s3.classList.add("active");
  }




function cameFromJobsPage(){
  const urlJobId = String(qs("job_id") || "").trim();
  if(urlJobId) return true;

  try{
    const ref = String(document.referrer || "");
    if(ref.includes("/jobs.html")) return true;
  }catch(_){}

  return false;
}

function shouldShowGate(){
  if(cameFromJobsPage()) return false;
  try{
    if(sessionStorage.getItem("cvstudio_started") === "1") return false;
  }catch(_){}
  return true;
}

function setGateActive(on){
  gateActive = !!on;

  document.body.classList.toggle("cvGate", gateActive);
  if(!gateActive){
    document.body.classList.remove("cvGateForm");
  }

  try{ $("gateIntro").style.display = gateActive ? "" : "none"; }catch(_){}

  // Make sure Setup is visible in Step 1
  if(gateActive){
    setSetupCollapsed(false, { persist:false, scroll:false });
    try{ setGuidedSettingsGlow(false); }catch(_){ }
    setupUserToggled = true; // avoid auto-collapse fighting Step 1
  }

  // Make the primary action clear
  const genBtn = $("btnGenerate");
  if(genBtn){
    genBtn.textContent = t("gen");
  }

  // Keep second button hidden to reduce confusion
  try{ $("btnGenerateAgain").style.display = "none"; }catch(_){}

  // Default gate view when entering
  if(gateActive) setGateView("choose");
  else setGateView("form");

  try{ updateStudioFlowUi(); }catch(_){ }
}

function exitGate(){
  if(!gateActive) return;
  try{ sessionStorage.setItem("cvstudio_started","1"); }catch(_){}
  setGateActive(false);
  // After Step 1, open the studio in Tailor mode (calm preview)
  try{ setStudioMode("tailor"); }catch(_){ }

  // Restore normal title
  const st = $("setupTitle");
  if(st){
    st.textContent = t("setupTitle") || "Setup";
  }

  try{ if(typeof updateSourceChip === "function") updateSourceChip(); }catch(_){ }
}

function getPasteDesc(){
      return String($("pasteDesc")?.value || "").trim();
    }

    function getActiveJobMeta(){
      if(jobSource === "paste"){
        const title = String($("pasteTitle")?.value || "").trim();
        const company_name = String($("pasteCompany")?.value || "").trim();
        const apply_url = applyUrlSafe(String($("pasteApply")?.value || "").trim());
        return {
          title: title || (uiLang==="de" ? "Eingefügter Job" : "Pasted job"),
          company_name,
          apply_url
        };
      }
      return {
        title: String(selectedJob?.title || "").trim(),
        company_name: String(selectedJob?.company_name || "").trim(),
        apply_url: applyUrlSafe(selectedJob?.apply_url || "")
      };
    }

    function shortText(s, maxLen){
      const str = String(s || "");
      const n = Number(maxLen || 42);
      if(!str) return "";
      if(str.length <= n) return str;
      return str.slice(0, Math.max(0, n - 1)) + "…";
    }

    function updateSourceChip(){
      const pill = $("sourceChipPill");
      if(!pill) return;

      // In Step 1 gate the studio bar is hidden anyway
      if(gateActive){
        pill.style.display = "none";
        return;
      }

      // Determine current "context" (job or paste)
      let meta = null;
      try{ meta = getActiveJobMeta(); }catch(_){ meta = null; }

      const title = String(meta?.title || "").trim();
      const company = String(meta?.company_name || "").trim();

      // If paste mode but no real description yet, keep it hidden (avoids confusion)
      if(jobSource === "paste"){
        const d = getPasteDesc();
        if(d.length < 40 && !title){
          pill.style.display = "none";
          return;
        }
      }

      let full = title || (jobSource === "paste"
        ? (uiLang==="de" ? "Eingefügte Beschreibung" : "Pasted description")
        : (uiLang==="de" ? "Ausgewählter Job" : "Selected job")
      );

      if(company) full = full + " · " + company;

      const lbl = $("sourceChipLabel");
      if(lbl) lbl.textContent = (uiLang==="de" ? "Aktiv:" : "Using:");

      const val = $("sourceChipValue");
      if(val){
        val.textContent = shortText(full, 64);
        val.title = full;
      }

      pill.style.display = "";
    }

function openGateForNewCv(){
  try{ cancelAutoStart(false); }catch(_){ }
  try{ pendingExtensionImport = null; }catch(_){}
  try{ setStudioMode("tailor", { persist:false }); }catch(_){ }

      // Opens the Step 1 chooser (clean start)
      try{
        // If they reload while here, keep them in Step 1
        sessionStorage.removeItem("cvstudio_started");
      }catch(_){}

      // Clear job_id from URL (no reload) so “New CV” is a clean start
      try{
        const u = new URL(window.location.href);
        if(u.searchParams.has("job_id")){
          u.searchParams.delete("job_id");
          history.replaceState({}, "", u.toString());
        try{ incomingJobId = ""; setFromJobsUi(); }catch(_){ }

        }
      }catch(_){}

      try{
        setGateActive(true);
        setGateView("choose");
      }catch(_){
        try{ document.body.classList.add("cvGate"); }catch(__){}
      }

      try{
        window.scrollTo({ top: 0, behavior: "smooth" });
      }catch(_){
        try{ window.scrollTo(0,0); }catch(__){}
      }
    }

    // Optional: a "change" entrypoint that skips the chooser and jumps straight to Step 2
    function openGateForChange(){
      try{
        sessionStorage.removeItem("cvstudio_started");
      }catch(_){}
      try{ setStudioMode("tailor", { persist:false }); }catch(_){ }

      try{
        setGateActive(true);
        setGateView("form");
      }catch(_){
        try{ document.body.classList.add("cvGate"); }catch(__){}
      }

      setTimeout(() => {
        try{
          if(jobSource === "paste") $("pasteDesc")?.focus();
          else $("jobSelect")?.focus();
        }catch(_){}
      }, 60);

      try{
        window.scrollTo({ top: 0, behavior: "smooth" });
      }catch(_){
        try{ window.scrollTo(0,0); }catch(__){}
      }
    }

function loadJobSource(){
      try{
        const v = String(localStorage.getItem("cvstudio_job_source") || "").trim();
        jobSource = (v === "paste") ? "paste" : "queue";
      }catch(_){
        jobSource = "queue";
      }
    }

    function loadPasteDraft(){
      try{
        const raw = localStorage.getItem("cvstudio_paste_draft");
        if(!raw) return;
        const obj = JSON.parse(raw);
        if(!obj) return;
        pasteDraft = {
          title: String(obj.title||""),
          company: String(obj.company||""),
          apply: String(obj.apply||""),
          lang_hint: String(obj.lang_hint||"auto"),
          desc: String(obj.desc||"")
        };
      }catch(_){}
    }

    function consumeExtensionImport(){
      try{
        const raw = localStorage.getItem(EXT_IMPORT_KEY);
        if(!raw) return null;
        localStorage.removeItem(EXT_IMPORT_KEY);

        const obj = JSON.parse(raw);
        if(!obj || typeof obj !== "object") return null;

        const desc = String(obj.description || obj.job_description || "").trim().slice(0, EXT_IMPORT_MAX_DESC);
        if(!desc) return null;

        return {
          title: String(obj.title || obj.job_title || "").trim(),
          company: String(obj.company || obj.company_name || "").trim(),
          apply: String(obj.apply_url || obj.url || "").trim(),
          lang_hint: String(obj.language_hint || obj.lang_hint || "auto").trim().toLowerCase() || "auto",
          desc,
          source_host: String(obj.source_host || "").trim(),
          source: String(obj.source || "chrome_extension").trim()
        };
      }catch(_){
        try{ localStorage.removeItem(EXT_IMPORT_KEY); }catch(__){}
        return null;
      }
    }

    function applyExtensionImportToDraft(data){
      const imp = data && typeof data === "object" ? data : null;
      if(!imp || !String(imp.desc || "").trim()) return false;

      pendingExtensionImport = imp;
      pasteDraft = {
        title: String(imp.title || ""),
        company: String(imp.company || ""),
        apply: String(imp.apply || ""),
        lang_hint: String(imp.lang_hint || "auto"),
        desc: String(imp.desc || "")
      };
      jobSource = "paste";

      try{ localStorage.setItem("cvstudio_job_source", "paste"); }catch(_){}
      try{ localStorage.setItem("cvstudio_paste_draft", JSON.stringify({ ...pasteDraft, at: Date.now(), source: imp.source || "chrome_extension" })); }catch(_){}
      return true;
    }

    function savePasteDraft(){
      try{
        pasteDraft = {
          title: String($("pasteTitle")?.value || ""),
          company: String($("pasteCompany")?.value || ""),
          apply: String($("pasteApply")?.value || ""),
          lang_hint: String($("pasteLangHint")?.value || "auto"),
          desc: String($("pasteDesc")?.value || "")
        };
        localStorage.setItem("cvstudio_paste_draft", JSON.stringify({ ...pasteDraft, at: Date.now() }));
      }catch(_){}
    }

    function applyPasteDraftToInputs(){
      try{
        $("pasteTitle").value = pasteDraft.title || "";
        $("pasteCompany").value = pasteDraft.company || "";
        $("pasteApply").value = pasteDraft.apply || "";
        $("pasteLangHint").value = pasteDraft.lang_hint || "auto";
        $("pasteDesc").value = pasteDraft.desc || "";
      }catch(_){}
    }

    function setJobSource(mode){
      jobSource = (mode === "paste") ? "paste" : "queue";
      try{ localStorage.setItem("cvstudio_job_source", jobSource); }catch(_){}

      $("srcQueue")?.classList.toggle("active", jobSource === "queue");
      $("srcPaste")?.classList.toggle("active", jobSource === "paste");

      $("queueBox").style.display = jobSource === "queue" ? "" : "none";
      $("pasteBox").style.display = jobSource === "paste" ? "" : "none";

      refreshModeUi();

      if(jobSource === "queue"){
        // refresh selection UI
        try{ onJobChange(); }catch(_){}
      }else{
        // update quality and enablement
        try{ updatePasteQuality(); }catch(_){}
      }

      try{ updateSourceChip(); }catch(_){}

      // In the guided Step 2 flow, keep Settings visible (it is a key feature)
      try{ if(document.body.classList.contains("cvGateForm")) $("settingsDetails").open = true; }catch(_){ }

    }


    // ------------------------------------------------------------
    // Guided attention: highlight the required field when CTA is disabled
    // (Best practice: helps users immediately see what to do next.)
    // Only active in Step 2 (gate form).
    // ------------------------------------------------------------
    function clearAttention(){
      try{ $("jobSelect") && $("jobSelect").classList.remove("needAttention"); }catch(_){}
      try{ $("openJobsBtn") && $("openJobsBtn").classList.remove("needAttention"); }catch(_){}
      try{ $("pasteDesc") && $("pasteDesc").classList.remove("needAttention"); }catch(_){}
    }

    function updateAttention(){
      clearAttention();

      // Only show this helper in the guided Step 2 screen
      if(!gateActive || gateView !== "form") return;

      if(jobSource === "queue"){
        if(!selectedJob){
          if(jobs && jobs.length === 0){
            try{ $("openJobsBtn").classList.add("needAttention"); }catch(_){}
          }else{
            try{ $("jobSelect").classList.add("needAttention"); }catch(_){}
          }
        }
        return;
      }

      // paste
      const len = getPasteDesc().length;
      if(len < 120){
        try{ $("pasteDesc").classList.add("needAttention"); }catch(_){}
      }
    }

    function refreshModeUi(){
      const accessOk = hasCvStudioAccess();
      const freeBlocked = isFreeCvLimitReached();

      setText("btnGenerate", freeBlocked ? (uiLang === "de" ? "Upgrade zum Fortfahren" : "Upgrade to continue") : t("gen"));
      setText("btnGenerateAgain", freeBlocked ? (uiLang === "de" ? "Upgrade zum Fortfahren" : "Upgrade to continue") : t("genAgain"));
      try{ renderUpgradeUi(); }catch(_){ }

      if(jobSource === "queue"){
        const ok = !!selectedJob;
        $("btnGenerate").disabled = !ok || (!accessOk && !freeBlocked);
        $("btnGenerateAgain").disabled = !ok || (!accessOk && !freeBlocked);
        $("btnViewDesc").disabled = !ok;
        $("btnCopyDesc").disabled = !ok;
        try{ updateCtaHint(); }catch(_){ }
        try{ updateAttention(); }catch(_){ }
        return;
      }

      // paste mode
      const desc = getPasteDesc();
      const len = desc.length;

      // allow generation at >=120 chars, recommend >=200
      const ok = len >= 120;

      $("btnGenerate").disabled = !ok || (!accessOk && !freeBlocked);
      $("btnGenerateAgain").disabled = !ok || (!accessOk && !freeBlocked);

      const hasAny = len > 0;
      $("btnViewDesc").disabled = !hasAny;
      $("btnCopyDesc").disabled = !hasAny;
      try{ updateCtaHint(); }catch(_){ }
      try{ updateAttention(); }catch(_){ }
    }

    function updateCtaHint(){
      const cta = $("ctaHint");
      if(!cta) return;

      // Only show this helper in the guided Step 2 screen
      if(!gateActive || gateView !== "form"){
        cta.style.display = "none";
        cta.textContent = "";
        return;
      }

      cta.style.display = "block";

      if(!hasCvStudioAccess()){
        cta.textContent = cvAccessBlockedMessage();
        return;
      }

      if(jobSource === "queue"){
        if(!selectedJob){
          if(jobs && jobs.length === 0){
            cta.textContent = (uiLang==="de")
              ? "Deine Job-Liste ist leer. Hole zuerst Jobs auf der Jobs-Seite."
              : "Your Jobs list is empty. Fetch jobs first on the Jobs page.";
          }else{
            cta.textContent = (uiLang==="de")
              ? "Wähle einen Job, um „CV anpassen“ zu aktivieren."
              : "Choose a job to unlock Tailor CV.";
          }
          return;
        }
        cta.textContent = t("strengthModalReady");
        return;
      }

      // paste
      const desc = getPasteDesc();
      const len = desc.length;
      if(len < 120){
        cta.textContent = (uiLang==="de")
          ? "Füge die vollständige Stellenbeschreibung ein, um „CV anpassen“ zu aktivieren."
          : "Paste the full job description to unlock Tailor CV.";
        return;
      }
      if(len < 200){
        cta.textContent = (uiLang==="de")
          ? "Fast fertig. Mehr Aufgaben und Anforderungen ergeben bessere ATS-Hinweise."
          : "Almost there. Add responsibilities and requirements for better ATS guidance.";
        return;
      }
      cta.textContent = t("strengthModalReady");
    }

function updatePasteQuality(){
      const desc = getPasteDesc();
      const pill = $("pasteQualityPill");
      const label = $("pasteQuality");

      const len = desc.length;
      const words = desc ? desc.split(/\s+/).filter(Boolean).length : 0;
      const lines = desc ? desc.split(/\n/).length : 0;

      // heuristics (English + German)
      const hasReq = /(requirements|qualifications|what you.*bring|we (are )?looking for|must have|you should|anforderungen|qualifikation|du bringst|wir suchen|solltest)/i.test(desc);
      const hasResp = /(responsibilities|what you.*do|your role|tasks|aufgaben|deine aufgaben|verantwortlichkeiten)/i.test(desc);

      let status = "warn";
      let msg = "";

      if(len < 50){
        msg = "Paste the full job posting for best results.";
      }else if(len < 200){
        msg = `Looks short (${len} chars). Add responsibilities and requirements for a better match.`;
      }else{
        status = "good";
        msg = `Looks good: ${len} chars · ${words} words · ${lines} lines` + ((hasReq || hasResp) ? "" : " (Tip: include requirements and tasks)");
      }

      if(pill){
        pill.classList.toggle("good", status === "good");
        pill.classList.toggle("warn", status !== "good");
        pill.textContent = status === "good" ? "Ready" : "Needs more";
      }
      if(label) label.textContent = msg;

      // cache key for local storage outputs (not a security hash, just a stable key)
      const tpl = String($("tplSelect")?.value || "professional").trim().toLowerCase();
      const s = (strengthValue()?.key) || "balanced";
      const langHint = String($("pasteLangHint")?.value || "auto");
      pasteCacheKey = "cvstudio_last_" + "paste_" + fnv1a(desc + "|" + tpl + "|" + s + "|" + langHint);

      refreshModeUi();
    }

    function deepCopy(obj){
      try{ return JSON.parse(JSON.stringify(obj)); }catch(_){ return null; }
    }

    function formatLoc(j){
      const parts = [];
      if (j.city) parts.push(j.city);
      if (j.region && j.region !== j.city) parts.push(j.region);
      if (j.country) parts.push(j.country);
      return parts.filter(Boolean).join(", ");
    }

    function applyUrlSafe(url){
      const u = String(url || "").trim();
      if (!u) return "";
      if (/^https?:\/\//i.test(u)) return u;
      return "https://" + u.replace(/^\/+/, "");
    }

    function isLikelyGerman(lang){
      const l = String(lang || "").toLowerCase();
      return l.startsWith("de");
    }

    /* Keyword casing + matching */
    const ACRONYMS = new Set([
      "API","APIs","SQL","AWS","GCP","AZURE","KPI","KPIs","OKR","OKRs","CRM","ERP","ETL","CI/CD","CI","CD","SaaS","B2B","B2C","GDPR","DSGVO","HR","UX","UI","QA","SEO","SEA"
    ]);

    function normalizeSpaces(s){ return String(s||"").replace(/\s+/g," ").trim(); }

    function titleCaseWord(w){
      if(!w) return w;
      const up = w.toUpperCase();
      if(ACRONYMS.has(up)) return up;
      // keep words that already contain uppercase letters or digits
      if(/[A-ZÄÖÜ]/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    }

    function prettyKeyword(raw, lang){
      const k = normalizeSpaces(raw);
      if(!k) return k;

      // If it looks like an acronym, upper it
      if(k.length <= 5 && /^[a-z0-9\/\-\+]+$/.test(k) && /[a-z]/.test(k)){
        const up = k.toUpperCase();
        if(ACRONYMS.has(up)) return up;
      }

      // If mostly lowercase, apply title-ish case
      const lowerRatio = (k.match(/[a-zäöü]/g)||[]).length / Math.max(1,(k.match(/[a-zA-ZÄÖÜäöü]/g)||[]).length);
      if(lowerRatio > 0.75){
        const parts = k.split(" ").map(p => {
          // handle hyphenated
          return p.split("-").map(titleCaseWord).join("-");
        });
        return parts.join(" ");
      }
      return k;
    }

    function normForMatch(s){
      // lower, remove punctuation -> spaces, collapse
      const str = String(s||"").toLowerCase();
      try{
        return str.replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
      }catch(_){
        return str.replace(/[^a-z0-9äöüß]+/g, " ").trim().replace(/\s+/g, " ");
      }
    }


    function tokenizeForScore(s){
      const n = normForMatch(s);
      return n ? n.split(" ").filter(Boolean) : [];
    }

    function scoreBulletForKeyword(bullet, keyword){
      const b = tokenizeForScore(bullet);
      const k = tokenizeForScore(keyword);
      if(!b.length || !k.length) return 0;
      const bSet = new Set(b);
      let hit = 0;
      for(const t of k){
        if(bSet.has(t)) hit += 2;
      }
      const kwNorm = normForMatch(keyword);
      const bNorm = normForMatch(bullet);
      if(kwNorm && bNorm.includes(kwNorm)) hit += 6;
      // Prefer medium-length bullets (not too short, not too long)
      const len = String(bullet||"").length;
      if(len >= 40 && len <= 140) hit += 1;
      return hit;
    }

    function pickBestBulletIndex(keyword, bullets){
      let best = 0;
      let bestScore = -1;
      bullets.forEach((b, i) => {
        const s = scoreBulletForKeyword(b, keyword);
        if(s > bestScore){
          bestScore = s;
          best = i;
        }
      });
      return { index: best, score: bestScore };
    }

    function isToolLikeKeyword(keyword){
      const k = normForMatch(keyword);
      return ["sql","excel","power bi","tableau","jira","confluence","sap","aws","gcp","azure","python","r","looker","snowflake","dbt","airflow","kpi","okr","crm"].some(x => k === x);
    }

    function pickBestRoleAndBullet(keyword){
      const exp = Array.isArray(lastCvDoc?.experience) ? lastCvDoc.experience : [];
      let best = { expIdx: 0, bulletIdx: 0, score: -1 };
      exp.forEach((e, expIdx) => {
        const bullets = asStringArr(e?.bullets, 50);
        const r = pickBestBulletIndex(keyword, bullets);
        if(r.score > best.score){
          best = { expIdx, bulletIdx: r.index, score: r.score };
        }
      });
      return best;
    }
    function keywordInText(keyword, text){
      const k = normForMatch(keyword);
      const ttxt = normForMatch(text);
      if(!k) return false;
      return ttxt.includes(k);
    }

    /* Deterministic variation (no randomness across refreshes) */
    function hashString(s){
      const str = String(s||"");
      let h = 2166136261;
      for(let i=0;i<str.length;i++){
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return (h >>> 0);
    }
    function pick(arr, seed){
      if(!arr.length) return "";
      const i = (seed % arr.length);
      return arr[i];
    }

    function isAudienceLikeKeyword(keyword){
      const k = normForMatch(keyword);
      if(!k) return false;
      return /\b(stakeholder|stakeholders|leadership|executive|executives|client|clients|customer|customers|partner|partners|supplier|suppliers|investor|investors|founder|founders|manager|managers|team|teams)\b/.test(k);
    }

    function isProcessLikeKeyword(keyword){
      const k = normForMatch(keyword);
      if(!k) return false;
      return /\b(requirements gathering|requirements analysis|process mapping|process improvement|forecasting|planning|governance|documentation|facilitation|storytelling|communication|workshop facilitation|change management|prioritization|prioritisation|collaboration|coordination|stakeholder management|data governance|scenario planning|demand planning|root cause analysis|financial modeling|financial modelling|cost modeling|cost modelling)\b/.test(k);
    }

    function localKeywordClause(keyword, lang){
      const kw = prettyKeyword(keyword, lang);
      const de = isLikelyGerman(lang);
      const k = normForMatch(keyword);
      if(isToolLikeKeyword(keyword)){
        return de ? ("unter Einsatz von " + kw) : ("using " + kw);
      }
      if(isProcessLikeKeyword(keyword)){
        const throughish = /\b(management|governance|collaboration|coordination)\b/.test(k);
        return de
          ? (throughish ? ("durch " + kw) : ("für " + kw))
          : (throughish ? ("through " + String(keyword || "").trim().toLowerCase()) : ("for " + String(keyword || "").trim().toLowerCase()));
      }
      if(isAudienceLikeKeyword(keyword)){
        if(!de && /\bstakeholders?\b/.test(k)) return "for key stakeholders";
        if(de && /\bstakeholders?\b/.test(k)) return "für relevante Stakeholder";
        return de ? ("für " + kw) : ("for " + String(keyword || "").trim().toLowerCase());
      }
      return de ? ("mit Fokus auf " + kw) : ("with a focus on " + String(keyword || "").trim().toLowerCase());
    }

    function insertClauseBeforeResult(base, clause){
      const b = String(base || "").trim();
      const c = String(clause || "").trim();
      if(!b || !c) return "";
      const resultRe = /^(.*?)(,\s*(?:resulting in|leading to|driving|delivering|creating)\b.*)$/i;
      if(!resultRe.test(b)) return "";
      return b.replace(resultRe, (_m, main, result) => {
        const lead = String(main || "").trim().replace(/[,\s]+$/, "");
        const joiner = /^(for|with|through)\b/i.test(c) ? " " : ", ";
        return `${lead}${joiner}${c}${String(result || "")}`;
      });
    }

    function localEnsureKeywordPresentNaturally(text, keyword, lang){
      const raw = String(text || "").trim();
      const kw = prettyKeyword(keyword, lang);
      if(!raw) return kw;
      if(keywordInText(keyword, raw) || keywordInText(kw, raw)) return raw;
      const clause = localKeywordClause(keyword, lang);
      const base = /[.!?]$/.test(raw) ? raw.slice(0, -1) : raw;
      const beforeResult = insertClauseBeforeResult(base, clause);
      if(beforeResult) return beforeResult + ".";
      const joiner = /^(for|with|through)\b/i.test(clause) ? " " : ", ";
      return base + joiner + clause + ".";
    }

    function localRewriteBullet(bullet, keyword, lang){
      const b = String(bullet||"").trim();
      const kw = prettyKeyword(keyword, lang);
      if(!b) return kw;
      if(keywordInText(keyword, b) || keywordInText(kw, b)) return b;

      return localEnsureKeywordPresentNaturally(b, keyword, lang);
    }

    function localAppendKeyword(bullet, keyword, lang){
      const b = String(bullet||"").trim();
      const kw = prettyKeyword(keyword, lang);
      if(!b) return kw;
      if(keywordInText(keyword, b) || keywordInText(kw, b)) return b;
      return localEnsureKeywordPresentNaturally(b, keyword, lang);
    }

    function localNewBullet(keyword, note, lang){
      const kw = prettyKeyword(keyword, lang);
      const n = normalizeSpaces(note);
      const de = isLikelyGerman(lang);
      const seed = hashString(keyword + "|" + note + "|" + lang);

      if(n){
        const templatesDe = [
          "Anwendung von " + kw + " (z. B. " + n + ").",
          n + " – mit Fokus auf " + kw + ".",
          "Umsetzung von " + kw + " im Kontext von " + n + "."
        ];
        const templatesEn = [
          "Applied " + kw + " (e.g., " + n + ").",
          n + " – with a focus on " + kw + ".",
          "Implemented " + kw + " in the context of " + n + "."
        ];
        return pick(de ? templatesDe : templatesEn, seed);
      }

      // If no note, be conservative
      return de
        ? ("Erfahrung mit " + kw + ".")
        : ("Experience with " + kw + ".");
    }

    /* -------------------------
       API helpers
       ------------------------- */

    const FETCH_TIMEOUT_MS = 45000;

    // Long-running AI endpoints can exceed 45s on slower devices/connections.
    // Keep a default timeout for normal calls, but allow longer timeouts for tailor/review.
    const TAILOR_TIMEOUT_MS  = 180000; // 3 min
    const REVIEW_TIMEOUT_MS  = 150000; // 2.5 min
    const KEYWORD_TIMEOUT_MS = 120000; // 2 min
    const JOB_CREATE_TIMEOUT_MS = 60000; // 60s

    const TOKEN_REFRESH_SKEW_SEC = 90;

    function timeoutForPath(path){
      const p = String(path || "");
      if(p.includes("/me/cv/tailor")) return TAILOR_TIMEOUT_MS;
      if(p.includes("/me/cv/review")) return REVIEW_TIMEOUT_MS;
      if(p.includes("/me/cv/keyword")) return KEYWORD_TIMEOUT_MS;
      if(p.includes("/me/jobs/create") || p.includes("/me/jobs/import") || p.includes("/me/jobs/create_from")) return JOB_CREATE_TIMEOUT_MS;
      return FETCH_TIMEOUT_MS;
    }

    function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS){
      // AbortController is not supported on some older browsers/webviews.
      // In that case, fall back to a plain fetch (no client-side timeout).
      if(typeof AbortController !== "function" || !timeoutMs || timeoutMs <= 0){
        return fetch(url, options);
      }
      const controller = new AbortController();
      const t = setTimeout(() => { try{ controller.abort(); }catch(_){ } }, timeoutMs);
      return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(t));
    }

    function isAbortError(e){
      if(!e) return false;
      if(e.name === "AbortError") return true;
      const msg = String(e.message || e || "");
      return /abort/i.test(msg);
    }

    function isNetworkishError(e){
      const msg = String(e?.message || e || "");
      const low = msg.toLowerCase();
      return (
        low.includes("failed to fetch") ||
        low.includes("network") ||
        low.includes("load failed") ||
        low.includes("connection") ||
        low.includes("canceled") ||
        low.includes("cancelled") ||
        isAbortError(e)
      );
    }

    function toNetworkError(path, e, timeoutMs){
      const msg = (e && e.message) ? String(e.message) : String(e||"");

      if(isAbortError(e)){
        const sec = timeoutMs ? Math.round(Number(timeoutMs)/1000) : 0;
        const err = new Error(
          path + " failed: request timed out" + (sec ? (" after " + sec + "s") : "") + ". " +
          "Please retry. If this keeps happening: check your connection, disable VPN/ad blockers, and verify API_BASE / CORS."
        );
        err.kind = "timeout";
        err.timeoutMs = timeoutMs || null;
        err.causeMsg = msg;
        return err;
      }

      if(isNetworkishError(e)){
        const err = new Error(
          path + " failed: network error. " +
          "If this keeps happening: check CORS on your Worker, disable VPN/ad blockers, and verify API_BASE."
        );
        err.kind = "network";
        err.timeoutMs = timeoutMs || null;
        err.causeMsg = msg;
        return err;
      }

      const err = new Error(path + " failed: " + msg);
      err.kind = "other";
      err.timeoutMs = timeoutMs || null;
      err.causeMsg = msg;
      return err;
    }

    async function getSessionFresh(forceRefresh = false){
      try{
        const auth = getAppAuth();
        if(!auth || !auth.getSession){
          return session || null;
        }

        let s = await auth.getSession();

        // Near-expiry refresh (best effort)
        const expiresAt = Number(s && s.expires_at ? s.expires_at : 0);
        const now = Math.floor(Date.now()/1000);
        const needsRefresh = forceRefresh || (expiresAt && (expiresAt - now) <= TOKEN_REFRESH_SKEW_SEC);

        if(needsRefresh){
          const sb = auth?.supabaseClient;
          if(sb && sb.auth && typeof sb.auth.refreshSession === "function"){
            const rr = await sb.auth.refreshSession();
            if(rr && rr.data && rr.data.session) s = rr.data.session;
          }
        }

        if(s && s.access_token){
          session = s;
          try{ sessionStorage.setItem("sb_access_token", s.access_token); }catch(_){}
        }
        return s || null;
      }catch(_){
        return session || null;
      }
    }

    async function authFetch(path, options = {}){
      const p = String(path || "");
      const url = API_BASE + p;

      // Support longer timeouts for AI-heavy endpoints (tailor/review/etc).
      // Caller can override with options.timeoutMs.
      const timeoutMs = Number(options.timeoutMs || timeoutForPath(p) || FETCH_TIMEOUT_MS);
      const { timeoutMs: _timeoutMs, ...opt } = options;

      const s1 = await getSessionFresh(false);
      const token1 = s1 && s1.access_token ? String(s1.access_token) : "";

      if(!token1){
        throw new Error(uiLang==="de" ? "Bitte anmelden." : "Please sign in.");
      }

      const headers1 = new Headers(opt.headers || {});
      headers1.set("Authorization", "Bearer " + token1);

      let res;
      try{
        res = await fetchWithTimeout(url, { ...opt, headers: headers1 }, timeoutMs);
      }catch(e){
        throw toNetworkError(p, e, timeoutMs);
      }

      // Retry once on 401 (token refresh)
      if(res.status === 401){
        const s2 = await getSessionFresh(true);
        const token2 = s2 && s2.access_token ? String(s2.access_token) : "";
        if(token2 && token2 !== token1){
          const headers2 = new Headers(opt.headers || {});
          headers2.set("Authorization", "Bearer " + token2);
          try{
            res = await fetchWithTimeout(url, { ...opt, headers: headers2 }, timeoutMs);
          }catch(e){
            throw toNetworkError(p, e, timeoutMs);
          }
        }
      }

      return res;
    }

    async function apiGet(path, options = {}){
      const res = await authFetch(path, { ...(options||{}), method:"GET" });
      const txt = await res.text().catch(()=> "");
      let json = null;
      try{ json = txt ? JSON.parse(txt) : null; }catch{ json = { raw: txt }; }
      if(!res.ok){
        const msg = path + " failed: " + res.status + " " + (json?.error || json?.details || json?.message || txt);
        const err = new Error(msg);
        err.status = res.status;
        err.body = json;
        throw err;
      }
      return json;
    }

    async function apiPostJson(path, body, options = {}){
      const headers = new Headers(options.headers || {});
      headers.set("content-type","application/json");
      const res = await authFetch(path, {
        ...((options||{})),
        method:"POST",
        headers,
        body: JSON.stringify(body || {})
      });
      const txt = await res.text().catch(()=> "");
      let json = null;
      try{ json = txt ? JSON.parse(txt) : null; }catch{ json = { raw: txt }; }
      if(!res.ok){
        const msg = path + " failed: " + res.status + " " + (json?.error || json?.details || json?.message || txt);
        const err = new Error(msg);
        err.status = res.status;
        err.body = json;
        throw err;
      }
      return json;
    }


    function isEndpointMissing(err){
      const s = Number(err?.status || 0);
      return s === 404 || s === 405;
    }

    function extractTextFromAiResponse(res){
      if(!res) return "";
      if(typeof res.rewritten_bullet === "string") return res.rewritten_bullet;
      if(typeof res.new_bullet === "string") return res.new_bullet;
      if(typeof res.text === "string") return res.text;
      if(typeof res.bullet === "string") return res.bullet;
      if(typeof res.output === "string") return res.output;
      if(res.result){
        const r = res.result;
        return r.rewritten_bullet || r.new_bullet || r.text || r.bullet || r.output || "";
      }
      return "";
    }

    async function tryAiRewriteOrCraft({ mode, keyword, lang, current_bullet, note, context }){
      // mode: "rewrite" | "new"
      const endpoints = [
        "/me/cv/keyword_polish",
        "/me/cv/keyword_boost",
        "/me/cv/keyword_inject",
        "/me/cv/keyword_insert"
      ];

      const payloadBase = {
        job_id: String(selectedJob?.id || ""),
        keyword: String(keyword || ""),
        language: String(lang || ""),
        lang: String(lang || ""),
        ui_language: String(uiLang || ""),
        mode: String(mode || ""),
        current_bullet: String(current_bullet || ""),
        note: String(note || ""),
        context: context || {}
      };

      for(const ep of endpoints){
        try{
          const res = await apiPostJson(ep, payloadBase);
          const out = extractTextFromAiResponse(res);
          if(out && String(out).trim()) return { ok:true, text:String(out).trim(), endpoint:ep };
        }catch(e){
          if(isEndpointMissing(e)) continue;
          // if endpoint exists but fails (401/500), don't silently swallow:
          throw e;
        }
      }
      return { ok:false, text:"", endpoint:"" };
    }

    /* -------------------------
       Tailor strength
       ------------------------- */
    function strengthValue(){
      const v = Number($("strengthRange").value);
      if (v === 0) return { key:"light", label:t("light"), help: uiLang==="de"
        ? "Kleine Anpassungen, nah an deinem Original."
        : "Light edits that stay close to your original." };
      if (v === 2) return { key:"strong", label:t("aggressive"), help: uiLang==="de"
        ? "Staerkeres Rewriting fuer mehr Fit, bleibt aber wahr."
        : "Stronger rewrite for fit, still truthful." };
      return { key:"balanced", label:t("balanced"), help: uiLang==="de"
        ? "Klarerer Fit ohne starkes Umschreiben."
        : "Clearer fit without heavy rewriting." };
    }

    function setStrengthUi(){
      const v = Number($("strengthRange").value);
      const s = strengthValue();
      setText("strengthBadge", s.label);
      setText("strengthHint", s.help);

      const pills = $("strengthPills")?.querySelectorAll(".miniPill") || [];
      pills.forEach(p => p.classList.toggle("active", Number(p.getAttribute("data-s")) === v));

      try{ localStorage.setItem("cv_strength", String(v)); }catch{}
      if(jobSource === "paste"){
        try{ updatePasteQuality(); }catch(_){ }
      }else{
        try{ refreshModeUi(); }catch(_){ }
      }
    }

    function setTemplateUi(){
      try{ localStorage.setItem("cv_template", String($("tplSelect").value || "professional")); }catch{}
      setText("templateValuePill", t("templateProfessional"));
      if(jobSource === "paste"){
        try{ updatePasteQuality(); }catch(_){ }
      }
    }

    function setGenVizState(state){
  genStepsState = state || "idle";
  const el = $("genViz");
  if(!el) return;

  el.classList.remove("isIdle","isRunning","isDone","isError");
  if(genStepsState === "running") el.classList.add("isRunning");
  else if(genStepsState === "done") el.classList.add("isDone");
  else if(genStepsState === "error") el.classList.add("isError");
  else el.classList.add("isIdle");

  const chip = $("genVizChip");
  if(chip){
    const cls = (genStepsState === "running") ? "warn"
      : (genStepsState === "done") ? "good"
      : (genStepsState === "error") ? "bad" : "";
    chip.className = "badge" + (cls ? (" " + cls) : "");
    chip.textContent = (genStepsState === "running") ? (uiLang==="de" ? "Arbeite…" : "Working…")
      : (genStepsState === "done") ? (uiLang==="de" ? "Fertig" : "Done")
      : (genStepsState === "error") ? (uiLang==="de" ? "Fehlgeschlagen" : "Failed")
      : (uiLang==="de" ? "Bereit" : "Ready");
  }
}

function markSteps(state){
  try{ setGenVizState(state); }catch(_){ genStepsState = state || "idle"; }

  const ids = ["s1","s2","s3","s4","s5"];
  ids.forEach(id => {
    const el = $(id);
    if(!el) return;
    el.style.fontWeight = "750";
    el.style.color = "rgba(17,19,24,.72)";
  });

  const setBoth = (cls, txt) => {
    setBadge("stepsBadge", cls, txt);
    setBadge("genBadge", cls, txt);
  };

  if(state === "idle"){ setBoth("", uiLang==="de" ? "Bereit" : "Ready"); return; }
  if(state === "running"){ setBoth("warn", uiLang==="de" ? "Generiere…" : "Generating…"); return; }
  if(state === "done"){
    setBoth("good", uiLang==="de" ? "Fertig" : "Done");
    ids.forEach(id => {
      const el = $(id); if(!el) return;
      el.style.color = "#0a3d1f";
      el.style.fontWeight = "900";
    });
    if(genModalAuto) closeGenModal();
    return;
  }
  if(state === "error"){
    setBoth("bad", uiLang==="de" ? "Fehlgeschlagen" : "Failed");
    if(genModalAuto) closeGenModal();
    return;
  }
}

    function setOutputEnabled(enabled){
      $("btnCopy").disabled = !enabled;
      $("btnDownload").disabled = !enabled;
      $("btnQa").disabled = !enabled;
      $("btnPrint").disabled = !enabled;
      $("btnCopyMissing").disabled = !enabled;
      $("btnUndoEdit").disabled = !enabled;
      $("btnResetEdits").disabled = !enabled;
      try{ updateQaDot(); }catch(_){}

      // Keep the primary action label clear (avoid "two generate buttons" confusion)
      try{
        const genBtn = $("btnGenerate");
        if(genBtn && !gateActive){
          genBtn.textContent = enabled ? "Tailor again" : t("gen");
        }
      }catch(_){}
      updateStudioFlowUi();
    }

    function updateUndoResetButtons(){
      const hasBase = !!baseSnapshot;
      $("btnResetEdits").disabled = !hasBase;
      $("btnUndoEdit").disabled = !(historyStack && historyStack.length);
    }

    /* -------------------------
       ATS score rendering
       ------------------------- */
    function computeAtsScore(used, missing){
      const u = Array.isArray(used) ? used.length : 0;
      const m = Array.isArray(missing) ? missing.length : 0;
      if(u + m <= 0) return null;
      return Math.round((u / (u + m)) * 100);
    }

    function renderKeywords(){
      const used = Array.isArray(lastUsed) ? lastUsed : [];
      const miss = Array.isArray(lastMissing) ? lastMissing : [];

      if(isKwInlineOpen() && activeKeywordRaw){
        const stillMissing = miss.some(k => normForMatch(k) === normForMatch(activeKeywordRaw));
        if(!stillMissing){
          closeKwModal();
        }
      }

      $("chipsUsed").innerHTML = used.length
        ? used.slice(0, 120).map(k => `<span class="chip good" title="${H.escapeHtml(k)}">${H.escapeHtml(prettyKeyword(k,lastLang))}</span>`).join("")
        : `<span class="hint">—</span>`;

      $("chipsMissing").innerHTML = miss.length
        ? miss.slice(0, 120).map(k => {
            const disp = prettyKeyword(k,lastLang);
            return `<button type="button" class="chip chipBtn warn" data-kw="${H.escapeHtml(k)}" title="${H.escapeHtml(k)}">
              <span style="min-width:0;overflow:hidden;text-overflow:ellipsis">${H.escapeHtml(disp)}</span>
              <span class="chipPlus" aria-hidden="true">＋</span>
            </button>`;
          }).join("")
        : `<span class="hint">No key gaps left. Nice work.</span>`;

      setText("kwUsedCount", used.length ? String(used.length) : "0");
      setText("kwMissCount", miss.length ? String(miss.length) : "0");

      const score = computeAtsScore(used, miss);
      if(score == null){
        setText("atsScore", "—");
        $("atsBar").style.width = "0%";
      }else{
        setText("atsScore", score + "%");
        $("atsBar").style.width = score + "%";
      }
      updateStudioFlowUi();
    }

    function recomputeCoverageFromCurrentText(){
      const text = $("cvText").value || "";
      const all = Array.isArray(atsKeywordsAll) && atsKeywordsAll.length
        ? atsKeywordsAll
        : Array.from(new Set([...(lastUsed||[]), ...(lastMissing||[])].map(x=>String(x||"").trim()).filter(Boolean)));

      const used = [];
      const miss = [];
      for(const kw of all){
        if(keywordInText(kw, text)) used.push(kw);
        else miss.push(kw);
      }
      lastUsed = used;
      lastMissing = miss;
      renderKeywords();
    }

    /* -------------------------
       CV doc formatting (ported from dashboard)
       ------------------------- */
    function cvLabels(lang){
      const de = isLikelyGerman(lang);
      return de ? {
        summary: "Profil",
        experience: "Berufserfahrung",
        education: "Ausbildung",
        achievements: "Erfolge",
        skills: "Kompetenzen",
        courses: "Kurse",
        interests: "Interessen",
        languages: "Sprachen"
      } : {
        summary: "Profile",
        experience: "Work experience",
        education: "Education",
        achievements: "Key achievements",
        skills: "Skills",
        courses: "Courses",
        interests: "Interests",
        languages: "Languages"
      };
    }

    function sectionEditorCopy(){
      const de = isLikelyGerman(uiLang);
      return de ? {
        edit: "Bearbeiten",
        editing: "Wird bearbeitet",
        custom: "Eigener Abschnitt",
        header: "Header",
        headerMeta: "Name, Rolle, Kontakt",
        headerHint: "Bearbeite hier Name, Kontaktdaten, Rollentitel und den Stil der Kontaktsymbole.",
        empty: "Wähle oben einen Abschnitt aus, um seinen Inhalt zu bearbeiten.",
        hint: "Aenderungen erscheinen direkt in der CV-Vorschau.",
        workspace: "Abschnitt bearbeiten",
        workspaceHint: "Waehle links einen Abschnitt oder fuege einen eigenen Block wie Projekte, Zertifikate oder Awards hinzu.",
        addSection: "Abschnitt hinzufuegen",
        addItem: "Eintrag hinzufügen",
        addRole: "Rolle hinzufügen",
        addEducation: "Ausbildung hinzufügen",
        addBullet: "Bullet hinzufügen",
        addGroup: "Gruppe hinzufügen",
        removeSection: "Abschnitt löschen",
        remove: "Entfernen",
        removeRole: "Rolle löschen",
        removeEducation: "Ausbildung löschen",
        removeGroup: "Gruppe löschen",
        customDefaultTitle: "Neuer Abschnitt",
        customTitle: "Abschnittstitel",
        customType: "Inhaltstyp",
        customParagraph: "Freitext",
        customBullets: "Bullets",
        customContent: "Inhalt",
        customParagraphPlaceholder: "Schreibe hier den Abschnitt. Nutze Leerzeilen fuer mehrere Absätze.",
        customBulletsPlaceholder: "Ein Punkt pro Zeile, zum Beispiel Projekte oder Zertifikate.",
        customContentHintParagraph: "Ideal für Projekte, Zertifikate oder einen kurzen Zusatzblock.",
        customContentHintBullets: "Jede Zeile wird als eigener Bullet in der CV-Vorschau angezeigt.",
        fullName: "Vollständiger Name",
        roleTitle: "Rollentitel",
        rolePlaceholder: "z. B. Senior BI Analyst",
        showRole: "Rollentitel anzeigen",
        showRoleHint: "Deaktiviere das, wenn du den CV bewusst allgemeiner verwenden möchtest.",
        contactStyle: "Kontaktsymbole",
        contactStyleHint: "Wird in Vorschau, Druckansicht und PDF verwendet.",
        contactStylePlain: "Ohne Symbole",
        contactStyleClassic: "Klassische Symbole",
        contactStyleTags: "Label-Tags",
        phone: "Telefon",
        email: "E-Mail",
        linkedin: "LinkedIn",
        portfolio: "Website / Portfolio",
        summaryLabel: "Text",
        summaryPlaceholder: "Beschreibe dein Profil in 2 bis 4 klaren Sätzen.",
        title: "Titel",
        company: "Unternehmen",
        school: "Schule",
        degree: "Abschluss",
        field: "Fach",
        location: "Standort",
        start: "Start",
        end: "Ende",
        bullets: "Bullets",
        bulletPlaceholder: "Beschreibe Verantwortung, Ergebnis oder Wirkung.",
        itemPlaceholder: "Eintrag",
        groupLabel: "Gruppentitel",
        groupItems: "Items",
        groupItemsPlaceholder: "z. B. SQL, Tableau, Forecasting",
        groupItemsHint: "Trenne Skills mit Kommas oder neuen Zeilen.",
        additionalSkills: "Weitere Skills",
        additionalSkillsPlaceholder: "z. B. Stakeholder Management, Storytelling"
      } : {
        edit: "Edit",
        editing: "Editing",
        custom: "Custom section",
        header: "Header",
        headerMeta: "Name, role, contact",
        headerHint: "Edit the name, contact details, role title, and contact symbol style here.",
        empty: "Select a section above to edit its content.",
        hint: "Changes appear in the CV preview right away.",
        workspace: "Section workspace",
        workspaceHint: "Pick a section on the left or add a custom block like Projects, Certifications, or Awards.",
        addSection: "Add section",
        addItem: "Add item",
        addRole: "Add role",
        addEducation: "Add education",
        addBullet: "Add bullet",
        addGroup: "Add group",
        removeSection: "Remove section",
        remove: "Remove",
        removeRole: "Remove role",
        removeEducation: "Remove education",
        removeGroup: "Remove group",
        customDefaultTitle: "New section",
        customTitle: "Section title",
        customType: "Content type",
        customParagraph: "Free text",
        customBullets: "Bullets",
        customContent: "Content",
        customParagraphPlaceholder: "Write the section here. Use empty lines to create multiple paragraphs.",
        customBulletsPlaceholder: "One bullet per line, for example projects or certifications.",
        customContentHintParagraph: "Best for projects, certifications, awards, or any custom note block.",
        customContentHintBullets: "Each line becomes its own bullet in the CV preview.",
        fullName: "Full name",
        roleTitle: "Role title",
        rolePlaceholder: "e.g. Senior BI Analyst",
        showRole: "Show role title",
        showRoleHint: "Turn this off if you want to use the CV for a more general purpose.",
        contactStyle: "Contact symbols",
        contactStyleHint: "Used in the preview, print view, and PDF export.",
        contactStylePlain: "Plain text",
        contactStyleClassic: "Classic symbols",
        contactStyleTags: "Label tags",
        phone: "Phone",
        email: "Email",
        linkedin: "LinkedIn",
        portfolio: "Website / portfolio",
        summaryLabel: "Text",
        summaryPlaceholder: "Write a clear 2 to 4 sentence profile summary.",
        title: "Title",
        company: "Company",
        school: "School",
        degree: "Degree",
        field: "Field",
        location: "Location",
        start: "Start",
        end: "End",
        bullets: "Bullets",
        bulletPlaceholder: "Describe the responsibility, result, or impact.",
        itemPlaceholder: "Entry",
        groupLabel: "Group label",
        groupItems: "Items",
        groupItemsPlaceholder: "e.g. SQL, Tableau, Forecasting",
        groupItemsHint: "Separate skills with commas or new lines.",
        additionalSkills: "Additional skills",
        additionalSkillsPlaceholder: "e.g. Stakeholder management, Storytelling"
      };
    }

    function getSectionTitleByKey(key, lang = lastLang, doc = lastCvDoc){
      if(String(key || "") === HEADER_EDITOR_KEY){
        return sectionEditorCopy().header;
      }
      if(isCustomSectionKey(key)){
        const custom = getCustomSectionByKey(doc, key);
        return String(custom?.title || "").trim() || sectionEditorCopy().customDefaultTitle;
      }
      return cvLabels(lang)?.[key] || String(key || "").trim();
    }

    function normalizeParagraphEditorText(value){
      return String(value || "")
        .split(/\n\s*\n/g)
        .map((part) => String(part || "").trim())
        .filter(Boolean);
    }

    function normalizeTokenEditorText(value){
      return String(value || "")
        .split(/[\n,]+/g)
        .map((part) => String(part || "").trim())
        .filter(Boolean);
    }

    function normalizeContactStyle(raw){
      const key = String(raw || "").trim().toLowerCase();
      return CONTACT_STYLE_THEMES[key] ? key : "plain";
    }

    function ensureDocHeader(doc){
      if(!doc || typeof doc !== "object") return { show_role: true, contact_style: "plain" };
      doc.contact = (doc.contact && typeof doc.contact === "object") ? doc.contact : {};
      const fallbacks = {
        phone: doc.phone,
        email: doc.email,
        location: doc.location,
        linkedin: doc.linkedin,
        portfolio: doc.portfolio || doc.website || doc.url
      };
      ["phone","email","location","linkedin","portfolio"].forEach((field) => {
        const raw = doc.contact[field] != null && String(doc.contact[field]).trim()
          ? doc.contact[field]
          : fallbacks[field];
        doc.contact[field] = String(raw || "").trim();
      });
      doc.header = (doc.header && typeof doc.header === "object") ? doc.header : {};
      doc.header.show_role = doc.header.show_role !== false;
      doc.header.contact_style = normalizeContactStyle(doc.header.contact_style);
      return doc.header;
    }

    function getHeaderRole(doc, fallback = ""){
      const header = ensureDocHeader(doc);
      if(header.show_role === false) return "";
      return String(doc?.target_role || fallback || "").trim();
    }

    function getContactTheme(style){
      return CONTACT_STYLE_THEMES[normalizeContactStyle(style)] || CONTACT_STYLE_THEMES.plain;
    }

    function getHeaderContactStyle(doc){
      return getContactTheme(ensureDocHeader(doc).contact_style);
    }

    function renderHeaderContactItemHtml(field, value, style){
      const text = String(value || "").trim();
      if(!text) return "";
      const theme = getContactTheme(style);
      const icon = String(theme.preview?.[field] || "").trim();
      if(!icon) return `<span class="cvContactItem"><span>${H.escapeHtml(text)}</span></span>`;
      const iconCls = "cvContactIcon" + (theme.kind === "tag" ? " isTag" : "");
      return `<span class="cvContactItem"><span class="${iconCls}">${H.escapeHtml(icon)}</span><span>${H.escapeHtml(text)}</span></span>`;
    }

    function renderHeaderContactLineHtml(entries, style){
      const items = entries
        .map(([field, value]) => renderHeaderContactItemHtml(field, value, style))
        .filter(Boolean);
      if(!items.length) return "";
      return items.map((item, idx) => idx ? `<span class="cvContactSep" aria-hidden="true">•</span>${item}` : item).join("");
    }

    function formatHeaderContactLine(entries, doc, mode = "plain"){
      const contactStyle = ensureDocHeader(doc).contact_style;
      if(mode === "plain"){
        return entries.map(([, value]) => String(value || "").trim()).filter(Boolean).join(" · ");
      }
      const theme = getContactTheme(contactStyle);
      return entries.map(([field, value]) => {
        const text = String(value || "").trim();
        if(!text) return "";
        const label = String(theme.pdf?.[field] || "").trim();
        return label ? `${label} ${text}` : text;
      }).filter(Boolean).join(" · ");
    }

    function hasExperienceEntryContent(entry){
      if(!entry || typeof entry !== "object") return false;
      return !!(
        String(entry.title || "").trim() ||
        String(entry.company || "").trim() ||
        String(entry.location || "").trim() ||
        String(entry.start || "").trim() ||
        String(entry.end || "").trim() ||
        asStringArr(entry.bullets, 20).length
      );
    }

    function hasEducationEntryContent(entry){
      if(!entry || typeof entry !== "object") return false;
      return !!(
        String(entry.degree || "").trim() ||
        String(entry.field || "").trim() ||
        String(entry.school || "").trim() ||
        String(entry.location || "").trim() ||
        String(entry.start || "").trim() ||
        String(entry.end || "").trim() ||
        asStringArr(entry.bullets, 20).length
      );
    }

    function createEmptyExperienceEntry(){
      return { title:"", company:"", location:"", start:"", end:"", bullets:[""] };
    }

    function createEmptyEducationEntry(){
      return { degree:"", field:"", school:"", location:"", start:"", end:"", bullets:[] };
    }

    function createEmptySkillGroup(){
      return { label:"", items:[""] };
    }

    function ensureDocListSection(doc, key){
      if(!doc || typeof doc !== "object") return [];
      const prop = key === "achievements" ? "key_achievements" : key;
      const arr = Array.isArray(doc[prop]) ? doc[prop] : asStringArr(doc[prop], 120);
      doc[prop] = arr;
      return doc[prop];
    }

    function ensureDocExperience(doc){
      if(!doc || typeof doc !== "object") return [];
      doc.experience = Array.isArray(doc.experience) ? doc.experience : [];
      return doc.experience;
    }

    function ensureDocEducation(doc){
      if(!doc || typeof doc !== "object") return [];
      doc.education = Array.isArray(doc.education) ? doc.education : [];
      return doc.education;
    }

    function ensureDocSkills(doc){
      if(!doc || typeof doc !== "object") return { groups: [], additional: [] };
      doc.skills = (doc.skills && typeof doc.skills === "object") ? doc.skills : {};
      doc.skills.groups = Array.isArray(doc.skills.groups) ? doc.skills.groups : [];
      doc.skills.additional = Array.isArray(doc.skills.additional) ? doc.skills.additional : asStringArr(doc.skills.additional, 120);
      return doc.skills;
    }

    function hasCustomSectionContent(section){
      if(!section || typeof section !== "object") return false;
      return Array.isArray(section.items) && section.items.some((item) => String(item || "").trim());
    }

    function ul(items){
      const arr = asStringArr(items, 999);
      if(!arr.length) return "";
      return `<ul class="cvUl">${arr.map(x => `<li>${H.escapeHtml(x)}</li>`).join("")}</ul>`;
    }

    function sec(title, inner, key = ""){
      if(!inner || !String(inner).trim()) return "";
      const active = (studioMode === "customize" && key && String(key) === String(activeSectionEditorKey || "")) ? " isSectionFocus" : "";
      const attr = key ? ` data-section-key="${H.escapeHtml(String(key))}"` : "";
      return `<div class="cvSection${active}"${attr}><div class="cvSectionTitle">${H.escapeHtml(title)}</div>${inner}</div>`;
    }

    function item(title, sub, meta, bullets){
      const t = String(title || "").trim();
      const s = String(sub || "").trim();
      const m = String(meta || "").trim();
      const b = asStringArr(bullets, 12);

      const parts = [];
      parts.push(`<div class="cvItem">`);
      if(t) parts.push(`<div class="cvItemTitle">${H.escapeHtml(t)}</div>`);
      if(s) parts.push(`<div class="cvItemSub">${H.escapeHtml(s)}</div>`);
      if(m) parts.push(`<div class="cvMetaLine">${H.escapeHtml(m)}</div>`);
      if(b.length) parts.push(ul(b));
      parts.push(`</div>`);
      return parts.join("");
    }

    function experienceItem(e, expIdx){
      const title = String(e?.title || "").trim();
      const sub = joinNonEmpty([e?.company, e?.location], ", ");
      const meta = joinNonEmpty([e?.start, e?.end], " – ");
      const bullets = asStringArr(e?.bullets, 12);

      const parts = [];
      parts.push(`<div class="cvItem cvExpItem" data-exp-index="${expIdx}">`);
      parts.push(`<div class="cvItemHead">`);
      parts.push(`<div class="cvItemHeadMain">`);
      if(title) parts.push(`<div class="cvItemTitle">${H.escapeHtml(title)}</div>`);
      if(sub) parts.push(`<div class="cvItemSub">${H.escapeHtml(sub)}</div>`);
      parts.push(`</div>`);
      if(meta) parts.push(`<div class="cvMetaLine">${H.escapeHtml(meta)}</div>`);
      parts.push(`</div>`);
      if(bullets.length){
        parts.push(`<ul class="cvUl cvExpBullets">`);
        bullets.forEach((bullet, bulletIdx) => {
          parts.push(
            `<li class="cvBulletItem" data-exp-index="${expIdx}" data-bullet-index="${bulletIdx}" tabindex="-1">` +
              `<span class="cvBulletText">${H.escapeHtml(bullet)}</span>` +
            `</li>`
          );
        });
        parts.push(`</ul>`);
      }
      parts.push(`</div>`);
      return parts.join("");
    }

    function educationItem(e){
      const title = joinNonEmpty([e?.degree, e?.field], " · ");
      const sub = joinNonEmpty([e?.school, e?.location], ", ");
      const meta = joinNonEmpty([e?.start, e?.end], " – ");
      return item(title, sub, meta, e?.bullets);
    }

    function getCvSectionEntries(doc, lang){
      const L = cvLabels(lang);
      const summary = asStringArr(doc?.summary, 8);
      const exp = (Array.isArray(doc?.experience) ? doc.experience : []).filter(hasExperienceEntryContent);
      const edu = (Array.isArray(doc?.education) ? doc.education : []).filter(hasEducationEntryContent);
      const ach = asStringArr(doc?.key_achievements, 10);
      const skills = doc?.skills || {};
      const skillGroups = Array.isArray(skills?.groups) ? skills.groups : [];
      const addSkills = asStringArr(skills?.additional, 24);
      const courses = asStringArr(doc?.courses, 12);
      const interests = asStringArr(doc?.interests, 12);
      const langs = asStringArr(doc?.languages, 12);

      const skillLines = [];
      skillGroups.forEach((g) => {
        const label = String(g?.label || "").trim();
        const items = asStringArr(g?.items, 30);
        if(!items.length) return;
        skillLines.push(label ? (label + ": " + items.join(", ")) : items.join(", "));
      });
      if(addSkills.length) skillLines.push(addSkills.join(", "));

      const customSections = ensureDocCustomSections(doc).map((section) => {
        const items = Array.isArray(section.items) ? section.items.map((item) => String(item || "").trim()).filter(Boolean) : [];
        const title = String(section.title || "").trim() || sectionEditorCopy().customDefaultTitle;
        return {
          key: buildCustomSectionKey(section.id),
          title,
          kind: section.style === "bullets" ? "bullets" : "paragraph",
          hasContent: items.length > 0,
          isCustom: true,
          paragraphs: section.style === "bullets" ? [] : items,
          items: section.style === "bullets" ? items : []
        };
      });

      return [
        {
          key: "summary",
          title: L.summary,
          kind: "paragraph",
          hasContent: summary.length > 0,
          paragraphs: summary.length ? [summary.join(" ")] : []
        },
        {
          key: "experience",
          title: L.experience,
          kind: "experience",
          hasContent: exp.length > 0,
          items: exp
        },
        {
          key: "education",
          title: L.education,
          kind: "education",
          hasContent: edu.length > 0,
          items: edu
        },
        {
          key: "achievements",
          title: L.achievements,
          kind: "bullets",
          hasContent: ach.length > 0,
          items: ach
        },
        {
          key: "skills",
          title: L.skills,
          kind: "lines",
          hasContent: skillLines.length > 0,
          items: skillLines
        },
        {
          key: "courses",
          title: L.courses,
          kind: "paragraph",
          hasContent: courses.length > 0,
          paragraphs: courses.length ? [courses.join(" · ")] : []
        },
        {
          key: "interests",
          title: L.interests,
          kind: "paragraph",
          hasContent: interests.length > 0,
          paragraphs: interests.length ? [interests.join(" · ")] : []
        },
        {
          key: "languages",
          title: L.languages,
          kind: "paragraph",
          hasContent: langs.length > 0,
          paragraphs: langs.length ? [langs.join(" · ")] : []
        },
        ...customSections
      ];
    }

    function getOrderedCvSections(doc, lang){
      const defs = getCvSectionEntries(doc, lang);
      const byKey = new Map(defs.map((entry) => [entry.key, entry]));
      const prefs = ensureCvSectionPrefs(doc);
      return prefs.order
        .map((key) => byKey.get(key))
        .filter((entry) => entry && entry.hasContent && !prefs.hidden[entry.key]);
    }

    function renderCvSectionInner(section){
      if(!section || !section.hasContent) return "";
      if(section.kind === "paragraph"){
        return section.paragraphs.map((text) => `<p class="cvPara">${H.escapeHtml(text)}</p>`).join("");
      }
      if(section.kind === "experience"){
        return (Array.isArray(section.items) ? section.items : []).map((e, expIdx) => experienceItem(e, expIdx)).join("");
      }
      if(section.kind === "education"){
        return (Array.isArray(section.items) ? section.items : []).map((e) => educationItem(e)).join("");
      }
      if(section.kind === "bullets"){
        return ul(section.items);
      }
      if(section.kind === "lines"){
        return (Array.isArray(section.items) ? section.items : []).map((line) => `<div class="cvSkillLine">${H.escapeHtml(line)}</div>`).join("");
      }
      return "";
    }

    function getSectionManagerEntries(doc, lang){
      const defs = getCvSectionEntries(doc || {}, lang || lastLang);
      const byKey = new Map(defs.map((entry) => [entry.key, entry]));
      const prefs = ensureCvSectionPrefs(doc || lastCvDoc);
      const copy = sectionEditorCopy();
      const maxIndex = Math.max(0, prefs.order.length - 1);
      const bodyEntries = prefs.order.map((key, idx) => {
        const entry = byKey.get(key) || { key, title: key, hasContent:false };
        return {
          key,
          index: idx,
          maxIndex,
          title: entry.title || key,
          hasContent: !!entry.hasContent,
          hidden: !!prefs.hidden[key],
          isCustom: !!entry.isCustom
        };
      });
      return [{
        key: HEADER_EDITOR_KEY,
        index: -1,
        title: copy.header,
        hasContent: true,
        hidden: false,
        isCustom: false,
        isFixed: true,
        meta: copy.headerMeta
      }, ...bodyEntries];
    }

    function scrollSectionEditorIntoView(behavior = "smooth"){
      try{
        requestAnimationFrame(() => {
          const target = $("sectionWorkspace") || $("sectionEditorPanel") || document.querySelector(".studioCanvas");
          target?.scrollIntoView({ behavior, block:"start" });
        });
      }catch(_){}
    }

    function setActiveSectionEditor(key, opts = {}){
      activeSectionEditorKey = isValidSectionKey(key, lastCvDoc) ? key : "";
      renderCvPreviewFromDoc(lastCvDoc, lastLang);
      renderSectionManager();
      renderSectionEditor();
      if(opts.scroll !== false) scrollSectionEditorIntoView(opts.behavior || "smooth");
    }

    function ensureActiveSectionEditorKey(){
      if(isValidSectionKey(activeSectionEditorKey, lastCvDoc)) return activeSectionEditorKey;
      activeSectionEditorKey = (ensureCvSectionPrefs(lastCvDoc).order || []).find((key) => isValidSectionKey(key, lastCvDoc)) || "";
      return activeSectionEditorKey;
    }

    function syncSectionDocEdit(opts = {}){
      cvSectionPrefs = normalizeCvSectionPrefs(cvSectionPrefs, lastCvDoc);
      writeCvSectionPrefs();
      renderCvPreviewFromDoc(lastCvDoc, lastLang);
      $("cvText").value = lastCvDoc ? cvDocToPlainText(lastCvDoc, lastLang) : (lastCvText || "");
      recomputeCoverageFromCurrentText();
      renderSectionManager();
      if(opts.renderEditor !== false) renderSectionEditor();
      updateUndoResetButtons();
      if($("tabChanges")?.classList?.contains("active")){ try{ renderChangesView(); }catch(_){ } }
      persistCurrentCvLocally();
    }

    function beginSectionEditorHistory(target){
      if(!target || target.dataset.historyOpen === "1") return;
      historyStack.push(snapshotCurrent());
      target.dataset.historyOpen = "1";
      updateUndoResetButtons();
    }

    function endSectionEditorHistory(target){
      if(!target) return;
      delete target.dataset.historyOpen;
    }

    function renderSectionEditorField(label, controlHtml, wide = false){
      return `
        <label class="sectionEditorField${wide ? " isWide" : ""}">
          <span class="sectionEditorLabel">${H.escapeHtml(label)}</span>
          ${controlHtml}
        </label>
      `;
    }

    function renderHeaderContactStyleOption(styleKey, currentStyle, copy){
      const labels = {
        plain: copy.contactStylePlain,
        classic: copy.contactStyleClassic,
        tags: copy.contactStyleTags
      };
      const samples = {
        plain: "+49 157 0000000 • name@email.com • Berlin",
        classic: "☎ +49 157 0000000 • ✉ name@email.com • ⌂ Berlin",
        tags: "TEL +49 157 0000000 • MAIL name@email.com • LOC Berlin"
      };
      const isActive = normalizeContactStyle(currentStyle) === styleKey;
      return `
        <button
          class="contactStyleOption${isActive ? " active" : ""}"
          type="button"
          data-section-editor-action="header-contact-style"
          data-style="${H.escapeHtml(styleKey)}"
          aria-pressed="${isActive ? "true" : "false"}"
        >
          <span class="contactStyleOptionLabel">${H.escapeHtml(labels[styleKey] || styleKey)}</span>
          <span class="contactStyleOptionSample">${H.escapeHtml(samples[styleKey] || "")}</span>
        </button>
      `;
    }

    function renderHeaderSectionEditor(doc){
      const copy = sectionEditorCopy();
      const header = ensureDocHeader(doc);
      const contact = doc?.contact || {};
      const showRole = header.show_role !== false;
      const contactStyle = normalizeContactStyle(header.contact_style);

      return `
        <div class="sectionEditorStack">
          <div class="sectionEditorGrid">
            ${renderSectionEditorField(copy.fullName, `<input class="textInput" type="text" value="${H.escapeHtml(doc?.name || "")}" data-editor-kind="header-field" data-field="name" />`, true)}
            <div class="sectionEditorField isWide">
              <span class="sectionEditorLabel">${H.escapeHtml(copy.roleTitle)}</span>
              <label class="sectionEditorCheck">
                <input type="checkbox" data-editor-kind="header-setting" data-setting="show_role" ${showRole ? "checked" : ""} />
                <span>
                  <strong>${H.escapeHtml(copy.showRole)}</strong>
                  <span class="sectionEditorCheckHint">${H.escapeHtml(copy.showRoleHint)}</span>
                </span>
              </label>
              <input class="textInput" type="text" value="${H.escapeHtml(doc?.target_role || "")}" placeholder="${H.escapeHtml(copy.rolePlaceholder)}" data-editor-kind="header-field" data-field="target_role" ${showRole ? "" : "disabled"} />
            </div>
            <div class="sectionEditorField isWide">
              <span class="sectionEditorLabel">${H.escapeHtml(copy.contactStyle)}</span>
              <div class="contactStylePicker" role="group" aria-label="${H.escapeHtml(copy.contactStyle)}">
                ${renderHeaderContactStyleOption("plain", contactStyle, copy)}
                ${renderHeaderContactStyleOption("classic", contactStyle, copy)}
                ${renderHeaderContactStyleOption("tags", contactStyle, copy)}
              </div>
              <div class="sectionEditorMicrocopy">${H.escapeHtml(copy.contactStyleHint)}</div>
            </div>
            ${renderSectionEditorField(copy.phone, `<input class="textInput" type="text" value="${H.escapeHtml(contact.phone || "")}" data-editor-kind="header-contact" data-field="phone" />`)}
            ${renderSectionEditorField(copy.email, `<input class="textInput" type="email" value="${H.escapeHtml(contact.email || "")}" data-editor-kind="header-contact" data-field="email" />`)}
            ${renderSectionEditorField(copy.location, `<input class="textInput" type="text" value="${H.escapeHtml(contact.location || "")}" data-editor-kind="header-contact" data-field="location" />`)}
            ${renderSectionEditorField(copy.linkedin, `<input class="textInput" type="text" value="${H.escapeHtml(contact.linkedin || "")}" data-editor-kind="header-contact" data-field="linkedin" />`)}
            ${renderSectionEditorField(copy.portfolio, `<input class="textInput" type="text" value="${H.escapeHtml(contact.portfolio || "")}" data-editor-kind="header-contact" data-field="portfolio" />`, true)}
          </div>
        </div>
      `;
    }

    function renderSimpleListSectionEditor(key, items){
      const copy = sectionEditorCopy();
      const arr = Array.isArray(items) ? items : [];
      return `
        <div class="sectionEditorStack">
          ${arr.map((item, index) => `
            <div class="sectionEditorListRow">
              <input
                class="textInput"
                type="text"
                value="${H.escapeHtml(item || "")}"
                placeholder="${H.escapeHtml(copy.itemPlaceholder)}"
                data-editor-kind="list-item"
                data-section-key="${H.escapeHtml(key)}"
                data-index="${index}"
              />
              <button class="btn small ghost" type="button" data-section-editor-action="remove-item" data-section-key="${H.escapeHtml(key)}" data-index="${index}">${H.escapeHtml(copy.remove)}</button>
            </div>
          `).join("")}
        </div>
        <button class="btn small ghost" type="button" data-section-editor-action="add-item" data-section-key="${H.escapeHtml(key)}">${H.escapeHtml(copy.addItem)}</button>
      `;
    }

    function renderExperienceSectionEditor(items){
      const copy = sectionEditorCopy();
      const arr = Array.isArray(items) ? items : [];
      return `
        <div class="sectionEditorStack">
          ${arr.map((entry, entryIdx) => {
            const bullets = Array.isArray(entry?.bullets) ? entry.bullets : [];
            return `
              <div class="sectionEditorCardBlock">
                <div class="sectionEditorGrid">
                  ${renderSectionEditorField(copy.title, `<input class="textInput" type="text" value="${H.escapeHtml(entry?.title || "")}" data-editor-kind="entry-field" data-section-key="experience" data-entry-index="${entryIdx}" data-field="title" />`)}
                  ${renderSectionEditorField(copy.company, `<input class="textInput" type="text" value="${H.escapeHtml(entry?.company || "")}" data-editor-kind="entry-field" data-section-key="experience" data-entry-index="${entryIdx}" data-field="company" />`)}
                  ${renderSectionEditorField(copy.location, `<input class="textInput" type="text" value="${H.escapeHtml(entry?.location || "")}" data-editor-kind="entry-field" data-section-key="experience" data-entry-index="${entryIdx}" data-field="location" />`)}
                  ${renderSectionEditorField(copy.start, `<input class="textInput" type="text" value="${H.escapeHtml(entry?.start || "")}" data-editor-kind="entry-field" data-section-key="experience" data-entry-index="${entryIdx}" data-field="start" />`)}
                  ${renderSectionEditorField(copy.end, `<input class="textInput" type="text" value="${H.escapeHtml(entry?.end || "")}" data-editor-kind="entry-field" data-section-key="experience" data-entry-index="${entryIdx}" data-field="end" />`)}
                </div>
                <div class="sectionEditorSubsection">
                  <div class="sectionEditorLabelRow">
                    <div class="sectionEditorLabel">${H.escapeHtml(copy.bullets)}</div>
                    <button class="btn small ghost" type="button" data-section-editor-action="add-bullet" data-section-key="experience" data-entry-index="${entryIdx}">${H.escapeHtml(copy.addBullet)}</button>
                  </div>
                  <div class="sectionEditorStack">
                    ${bullets.map((bullet, bulletIdx) => `
                      <div class="sectionEditorListRow">
                        <input
                          class="textInput"
                          type="text"
                          value="${H.escapeHtml(bullet || "")}"
                          placeholder="${H.escapeHtml(copy.bulletPlaceholder)}"
                          data-editor-kind="entry-bullet"
                          data-section-key="experience"
                          data-entry-index="${entryIdx}"
                          data-bullet-index="${bulletIdx}"
                        />
                        <button class="btn small ghost" type="button" data-section-editor-action="remove-bullet" data-section-key="experience" data-entry-index="${entryIdx}" data-bullet-index="${bulletIdx}">${H.escapeHtml(copy.remove)}</button>
                      </div>
                    `).join("")}
                  </div>
                </div>
                <div class="sectionEditorCardActions">
                  <button class="btn small ghost" type="button" data-section-editor-action="remove-entry" data-section-key="experience" data-entry-index="${entryIdx}">${H.escapeHtml(copy.removeRole)}</button>
                </div>
              </div>
            `;
          }).join("")}
        </div>
        <button class="btn small ghost" type="button" data-section-editor-action="add-entry" data-section-key="experience">${H.escapeHtml(copy.addRole)}</button>
      `;
    }

    function renderEducationSectionEditor(items){
      const copy = sectionEditorCopy();
      const arr = Array.isArray(items) ? items : [];
      return `
        <div class="sectionEditorStack">
          ${arr.map((entry, entryIdx) => {
            const bullets = Array.isArray(entry?.bullets) ? entry.bullets : [];
            return `
              <div class="sectionEditorCardBlock">
                <div class="sectionEditorGrid">
                  ${renderSectionEditorField(copy.degree, `<input class="textInput" type="text" value="${H.escapeHtml(entry?.degree || "")}" data-editor-kind="entry-field" data-section-key="education" data-entry-index="${entryIdx}" data-field="degree" />`)}
                  ${renderSectionEditorField(copy.field, `<input class="textInput" type="text" value="${H.escapeHtml(entry?.field || "")}" data-editor-kind="entry-field" data-section-key="education" data-entry-index="${entryIdx}" data-field="field" />`)}
                  ${renderSectionEditorField(copy.school, `<input class="textInput" type="text" value="${H.escapeHtml(entry?.school || "")}" data-editor-kind="entry-field" data-section-key="education" data-entry-index="${entryIdx}" data-field="school" />`)}
                  ${renderSectionEditorField(copy.location, `<input class="textInput" type="text" value="${H.escapeHtml(entry?.location || "")}" data-editor-kind="entry-field" data-section-key="education" data-entry-index="${entryIdx}" data-field="location" />`)}
                  ${renderSectionEditorField(copy.start, `<input class="textInput" type="text" value="${H.escapeHtml(entry?.start || "")}" data-editor-kind="entry-field" data-section-key="education" data-entry-index="${entryIdx}" data-field="start" />`)}
                  ${renderSectionEditorField(copy.end, `<input class="textInput" type="text" value="${H.escapeHtml(entry?.end || "")}" data-editor-kind="entry-field" data-section-key="education" data-entry-index="${entryIdx}" data-field="end" />`)}
                </div>
                <div class="sectionEditorSubsection">
                  <div class="sectionEditorLabelRow">
                    <div class="sectionEditorLabel">${H.escapeHtml(copy.bullets)}</div>
                    <button class="btn small ghost" type="button" data-section-editor-action="add-bullet" data-section-key="education" data-entry-index="${entryIdx}">${H.escapeHtml(copy.addBullet)}</button>
                  </div>
                  <div class="sectionEditorStack">
                    ${bullets.map((bullet, bulletIdx) => `
                      <div class="sectionEditorListRow">
                        <input
                          class="textInput"
                          type="text"
                          value="${H.escapeHtml(bullet || "")}"
                          placeholder="${H.escapeHtml(copy.bulletPlaceholder)}"
                          data-editor-kind="entry-bullet"
                          data-section-key="education"
                          data-entry-index="${entryIdx}"
                          data-bullet-index="${bulletIdx}"
                        />
                        <button class="btn small ghost" type="button" data-section-editor-action="remove-bullet" data-section-key="education" data-entry-index="${entryIdx}" data-bullet-index="${bulletIdx}">${H.escapeHtml(copy.remove)}</button>
                      </div>
                    `).join("")}
                  </div>
                </div>
                <div class="sectionEditorCardActions">
                  <button class="btn small ghost" type="button" data-section-editor-action="remove-entry" data-section-key="education" data-entry-index="${entryIdx}">${H.escapeHtml(copy.removeEducation)}</button>
                </div>
              </div>
            `;
          }).join("")}
        </div>
        <button class="btn small ghost" type="button" data-section-editor-action="add-entry" data-section-key="education">${H.escapeHtml(copy.addEducation)}</button>
      `;
    }

    function renderSkillsSectionEditor(skills){
      const copy = sectionEditorCopy();
      const skillDoc = skills && typeof skills === "object" ? skills : { groups: [], additional: [] };
      const groups = Array.isArray(skillDoc.groups) ? skillDoc.groups : [];
      const additional = Array.isArray(skillDoc.additional) ? skillDoc.additional : [];
      return `
        <div class="sectionEditorStack">
          ${groups.map((group, groupIdx) => `
            <div class="sectionEditorCardBlock">
              <div class="sectionEditorGrid">
                ${renderSectionEditorField(copy.groupLabel, `<input class="textInput" type="text" value="${H.escapeHtml(group?.label || "")}" data-editor-kind="skill-group-label" data-group-index="${groupIdx}" />`, true)}
                ${renderSectionEditorField(copy.groupItems, `<textarea class="sectionEditorTextarea" rows="3" placeholder="${H.escapeHtml(copy.groupItemsPlaceholder)}" data-editor-kind="skill-group-items" data-group-index="${groupIdx}">${H.escapeHtml((Array.isArray(group?.items) ? group.items : []).join("\n"))}</textarea>`, true)}
              </div>
              <div class="sectionEditorMicrocopy">${H.escapeHtml(copy.groupItemsHint)}</div>
              <div class="sectionEditorCardActions">
                <button class="btn small ghost" type="button" data-section-editor-action="remove-group" data-group-index="${groupIdx}">${H.escapeHtml(copy.removeGroup)}</button>
              </div>
            </div>
          `).join("")}
          ${renderSectionEditorField(copy.additionalSkills, `<textarea class="sectionEditorTextarea" rows="3" placeholder="${H.escapeHtml(copy.additionalSkillsPlaceholder)}" data-editor-kind="skills-additional">${H.escapeHtml(additional.join("\n"))}</textarea>`, true)}
        </div>
        <button class="btn small ghost" type="button" data-section-editor-action="add-group">${H.escapeHtml(copy.addGroup)}</button>
      `;
    }

    function renderCustomSectionEditor(sectionKey, section){
      const copy = sectionEditorCopy();
      const style = String(section?.style || "paragraph").trim().toLowerCase() === "bullets" ? "bullets" : "paragraph";
      const items = Array.isArray(section?.items) ? section.items : [];
      const textareaValue = style === "bullets" ? items.join("\n") : items.join("\n\n");
      const placeholder = style === "bullets" ? copy.customBulletsPlaceholder : copy.customParagraphPlaceholder;
      const hint = style === "bullets" ? copy.customContentHintBullets : copy.customContentHintParagraph;
      return `
        <div class="sectionEditorStack">
          <div class="sectionEditorGrid">
            ${renderSectionEditorField(copy.customTitle, `<input class="textInput" type="text" value="${H.escapeHtml(section?.title || "")}" placeholder="${H.escapeHtml(copy.customDefaultTitle)}" data-editor-kind="custom-title" data-section-key="${H.escapeHtml(sectionKey)}" />`, true)}
            ${renderSectionEditorField(copy.customType, `
              <select class="selectWide" data-editor-kind="custom-style" data-section-key="${H.escapeHtml(sectionKey)}">
                <option value="paragraph"${style === "paragraph" ? " selected" : ""}>${H.escapeHtml(copy.customParagraph)}</option>
                <option value="bullets"${style === "bullets" ? " selected" : ""}>${H.escapeHtml(copy.customBullets)}</option>
              </select>
            `)}
            ${renderSectionEditorField(copy.customContent, `<textarea class="sectionEditorTextarea" rows="7" placeholder="${H.escapeHtml(placeholder)}" data-editor-kind="custom-content" data-section-key="${H.escapeHtml(sectionKey)}">${H.escapeHtml(textareaValue)}</textarea>`, true)}
          </div>
          <div class="sectionEditorMicrocopy">${H.escapeHtml(hint)}</div>
          <div class="sectionEditorCardActions">
            <button class="btn small ghost" type="button" data-section-editor-action="remove-custom-section" data-section-key="${H.escapeHtml(sectionKey)}">${H.escapeHtml(copy.removeSection)}</button>
          </div>
        </div>
      `;
    }

    function persistCurrentCvLocally(){
      try{
        const key = (jobSource === "paste")
          ? (pasteCacheKey || ("cvstudio_last_paste_" + fnv1a(String($("pasteDesc")?.value || ""))))
          : ("cvstudio_last_" + String(selectedJob?.id || ""));
        if(!key) return;
        localStorage.setItem(key, JSON.stringify({
          at: Date.now(),
          payload: buildTailorPayload?.() || null,
          cv_text: $("cvText").value || "",
          cv_doc: lastCvDoc,
          lang: lastLang,
          used: lastUsed,
          missing: lastMissing,
          all: atsKeywordsAll,
          debug: lastDebug,
          sections: getCvSectionPrefsSnapshot(),
          font: normalizeCvFontTheme(cvFontTheme)
        }));
      }catch(_){}
    }

    function renderSectionManager(){
      const wrap = $("sectionManager");
      if(!wrap) return;
      const copy = sectionEditorCopy();
      const entries = getSectionManagerEntries(lastCvDoc || {}, lastLang);
      wrap.innerHTML = entries.map((entry) => `
        <div class="sectionRow ${entry.hidden ? "isHidden" : ""} ${activeSectionEditorKey === entry.key ? "isEditing" : ""}" data-section-key="${H.escapeHtml(entry.key)}" tabindex="0" aria-current="${activeSectionEditorKey === entry.key ? "true" : "false"}">
          <div class="sectionRowMain">
            <div class="sectionRowLabel">${H.escapeHtml(entry.title)}</div>
            <div class="sectionRowMeta">
              <span>${H.escapeHtml(entry.meta || (entry.hasContent ? t("sectionShown") : t("sectionEmpty")))}</span>
              ${entry.isCustom ? `<span>${H.escapeHtml(copy.custom)}</span>` : ``}
              ${activeSectionEditorKey === entry.key ? `<span>${H.escapeHtml(copy.editing)}</span>` : ``}
              ${entry.hidden ? `<span>${H.escapeHtml(t("sectionHidden"))}</span>` : ``}
            </div>
          </div>
          <div class="sectionRowActions">
            ${entry.isFixed ? `` : `
            <button class="sectionMiniBtn" type="button" data-section-action="up" title="${H.escapeHtml(t("sectionMoveUp"))}" ${entry.index === 0 ? "disabled" : ""}>↑</button>
            <button class="sectionMiniBtn" type="button" data-section-action="down" title="${H.escapeHtml(t("sectionMoveDown"))}" ${entry.index === entry.maxIndex ? "disabled" : ""}>↓</button>
            <button class="sectionToggle ${entry.hidden ? "" : "isActive"}" type="button" data-section-action="toggle">
              ${H.escapeHtml(entry.hidden ? t("sectionHidden") : t("sectionShown"))}
            </button>
            `}
          </div>
        </div>
      `).join("");
    }

    function renderSectionEditor(){
      const wrap = $("sectionEditorPanel");
      if(!wrap) return;
      const copy = sectionEditorCopy();
      if(!lastCvDoc){
        wrap.innerHTML = "";
        return;
      }

      let key = ensureActiveSectionEditorKey();
      if(!key){
        wrap.innerHTML = `<div class="sectionEditorEmpty">${H.escapeHtml(copy.empty)}</div>`;
        return;
      }

      const title = getSectionTitleByKey(key, lastLang, lastCvDoc);
      const workspaceHint = key === HEADER_EDITOR_KEY ? copy.headerHint : copy.workspaceHint;
      let body = "";

      if(key === HEADER_EDITOR_KEY){
        body = renderHeaderSectionEditor(lastCvDoc);
      }else if(key === "summary"){
        const paragraphs = ensureDocListSection(lastCvDoc, "summary");
        body = renderSectionEditorField(copy.summaryLabel, `<textarea class="sectionEditorTextarea" rows="6" placeholder="${H.escapeHtml(copy.summaryPlaceholder)}" data-editor-kind="summary">${H.escapeHtml(paragraphs.join("\n\n"))}</textarea>`, true);
      }else if(key === "experience"){
        body = renderExperienceSectionEditor(ensureDocExperience(lastCvDoc));
      }else if(key === "education"){
        body = renderEducationSectionEditor(ensureDocEducation(lastCvDoc));
      }else if(key === "skills"){
        body = renderSkillsSectionEditor(ensureDocSkills(lastCvDoc));
      }else if(isCustomSectionKey(key)){
        body = renderCustomSectionEditor(key, getCustomSectionByKey(lastCvDoc, key) || normalizeCustomSection({ title:"", style:"paragraph", items:[] }));
      }else{
        body = renderSimpleListSectionEditor(key, ensureDocListSection(lastCvDoc, key));
      }

      wrap.innerHTML = `
        <div class="sectionEditorTop">
          <div>
            <div class="sectionEditorEyebrow">${H.escapeHtml(copy.workspace)}</div>
            <div class="sectionEditorTitle">${H.escapeHtml(title)}</div>
            <div class="sectionEditorHint">${H.escapeHtml(workspaceHint)}</div>
          </div>
          <div class="sectionEditorTopActions">
            <button class="btn small primary" type="button" data-section-editor-action="add-custom-section">${H.escapeHtml(copy.addSection)}</button>
          </div>
        </div>
        <div class="sectionEditorBody">
          ${body}
        </div>
      `;
    }

    function applySectionPrefsChange(mutator){
      const prefs = ensureCvSectionPrefs(lastCvDoc);
      if(typeof mutator === "function") mutator(prefs);
      cvSectionPrefs = normalizeCvSectionPrefs(prefs, lastCvDoc);
      writeCvSectionPrefs();
      renderSectionManager();
      renderSectionEditor();
      renderCvPreviewFromDoc(lastCvDoc, lastLang);
      $("cvText").value = lastCvDoc ? cvDocToPlainText(lastCvDoc, lastLang) : (lastCvText || "");
      recomputeCoverageFromCurrentText();
      updateUndoResetButtons();
      if($("tabChanges")?.classList?.contains("active")){ try{ renderChangesView(); }catch(_){ } }
      persistCurrentCvLocally();
    }

    function moveSection(key, direction){
      if(!isValidSectionKey(key, lastCvDoc)) return;
      historyStack.push(snapshotCurrent());
      applySectionPrefsChange((prefs) => {
        const idx = prefs.order.indexOf(key);
        if(idx < 0) return;
        const next = idx + direction;
        if(next < 0 || next >= prefs.order.length) return;
        const swap = prefs.order[next];
        prefs.order[next] = key;
        prefs.order[idx] = swap;
      });
    }

    function toggleSectionVisibility(key){
      if(!isValidSectionKey(key, lastCvDoc)) return;
      historyStack.push(snapshotCurrent());
      applySectionPrefsChange((prefs) => {
        prefs.hidden[key] = !prefs.hidden[key];
      });
    }

    function resetSectionPrefs(){
      historyStack.push(snapshotCurrent());
      cvSectionPrefs = defaultCvSectionPrefs(lastCvDoc);
      applySectionPrefsChange();
    }

    function applySectionDocStructuralChange(mutator){
      if(!lastCvDoc || typeof mutator !== "function") return;
      historyStack.push(snapshotCurrent());
      mutator(lastCvDoc);
      syncSectionDocEdit({ renderEditor:true });
    }

    function updateSectionDocFromEditorInput(target){
      if(!target || !lastCvDoc) return;
      const kind = String(target.getAttribute("data-editor-kind") || "");
      if(!kind) return;

      if(kind === "summary"){
        lastCvDoc.summary = normalizeParagraphEditorText(target.value);
        return syncSectionDocEdit({ renderEditor:false });
      }

      if(kind === "header-field"){
        ensureDocHeader(lastCvDoc);
        const field = String(target.getAttribute("data-field") || "");
        if(!field) return;
        lastCvDoc[field] = String(target.value || "");
        return syncSectionDocEdit({ renderEditor:false });
      }

      if(kind === "header-contact"){
        ensureDocHeader(lastCvDoc);
        const field = String(target.getAttribute("data-field") || "");
        if(!field) return;
        lastCvDoc.contact[field] = String(target.value || "");
        return syncSectionDocEdit({ renderEditor:false });
      }

      if(kind === "header-setting"){
        const header = ensureDocHeader(lastCvDoc);
        const setting = String(target.getAttribute("data-setting") || "");
        if(setting === "show_role"){
          header.show_role = !!target.checked;
          return syncSectionDocEdit({ renderEditor:true });
        }
      }

      if(kind === "list-item"){
        const key = String(target.getAttribute("data-section-key") || "");
        const index = Number(target.getAttribute("data-index") || "-1");
        const arr = ensureDocListSection(lastCvDoc, key);
        if(index < 0 || index >= arr.length) return;
        arr[index] = String(target.value || "");
        return syncSectionDocEdit({ renderEditor:false });
      }

      if(kind === "entry-field"){
        const key = String(target.getAttribute("data-section-key") || "");
        const entryIndex = Number(target.getAttribute("data-entry-index") || "-1");
        const field = String(target.getAttribute("data-field") || "");
        const list = key === "education" ? ensureDocEducation(lastCvDoc) : ensureDocExperience(lastCvDoc);
        const entry = list[entryIndex];
        if(!entry || !field) return;
        entry[field] = String(target.value || "");
        return syncSectionDocEdit({ renderEditor:false });
      }

      if(kind === "entry-bullet"){
        const key = String(target.getAttribute("data-section-key") || "");
        const entryIndex = Number(target.getAttribute("data-entry-index") || "-1");
        const bulletIndex = Number(target.getAttribute("data-bullet-index") || "-1");
        const list = key === "education" ? ensureDocEducation(lastCvDoc) : ensureDocExperience(lastCvDoc);
        const entry = list[entryIndex];
        if(!entry) return;
        entry.bullets = Array.isArray(entry.bullets) ? entry.bullets : [];
        if(bulletIndex < 0 || bulletIndex >= entry.bullets.length) return;
        entry.bullets[bulletIndex] = String(target.value || "");
        return syncSectionDocEdit({ renderEditor:false });
      }

      if(kind === "skill-group-label"){
        const groupIndex = Number(target.getAttribute("data-group-index") || "-1");
        const skills = ensureDocSkills(lastCvDoc);
        const group = skills.groups[groupIndex];
        if(!group) return;
        group.label = String(target.value || "");
        return syncSectionDocEdit({ renderEditor:false });
      }

      if(kind === "skill-group-items"){
        const groupIndex = Number(target.getAttribute("data-group-index") || "-1");
        const skills = ensureDocSkills(lastCvDoc);
        const group = skills.groups[groupIndex];
        if(!group) return;
        group.items = normalizeTokenEditorText(target.value);
        return syncSectionDocEdit({ renderEditor:false });
      }

      if(kind === "skills-additional"){
        const skills = ensureDocSkills(lastCvDoc);
        skills.additional = normalizeTokenEditorText(target.value);
        return syncSectionDocEdit({ renderEditor:false });
      }

      if(kind === "custom-title"){
        const section = getCustomSectionByKey(lastCvDoc, String(target.getAttribute("data-section-key") || ""));
        if(!section) return;
        section.title = String(target.value || "");
        return syncSectionDocEdit({ renderEditor:false });
      }

      if(kind === "custom-style"){
        const section = getCustomSectionByKey(lastCvDoc, String(target.getAttribute("data-section-key") || ""));
        if(!section) return;
        section.style = String(target.value || "").trim().toLowerCase() === "bullets" ? "bullets" : "paragraph";
        return syncSectionDocEdit({ renderEditor:true });
      }

      if(kind === "custom-content"){
        const section = getCustomSectionByKey(lastCvDoc, String(target.getAttribute("data-section-key") || ""));
        if(!section) return;
        section.items = section.style === "bullets"
          ? String(target.value || "").split(/\n+/g).map((item) => String(item || "").trim()).filter(Boolean)
          : normalizeParagraphEditorText(target.value);
        return syncSectionDocEdit({ renderEditor:false });
      }
    }

    function handleSectionEditorAction(btn){
      if(!btn || !lastCvDoc) return;
      const action = String(btn.getAttribute("data-section-editor-action") || "");
      const key = String(btn.getAttribute("data-section-key") || activeSectionEditorKey || "");
      const index = Number(btn.getAttribute("data-index") || "-1");
      const entryIndex = Number(btn.getAttribute("data-entry-index") || "-1");
      const bulletIndex = Number(btn.getAttribute("data-bullet-index") || "-1");
      const groupIndex = Number(btn.getAttribute("data-group-index") || "-1");

      if(action === "add-item"){
        return applySectionDocStructuralChange((doc) => {
          ensureDocListSection(doc, key).push("");
        });
      }
      if(action === "remove-item"){
        return applySectionDocStructuralChange((doc) => {
          const arr = ensureDocListSection(doc, key);
          if(index >= 0 && index < arr.length) arr.splice(index, 1);
        });
      }
      if(action === "add-entry"){
        return applySectionDocStructuralChange((doc) => {
          const list = key === "education" ? ensureDocEducation(doc) : ensureDocExperience(doc);
          list.push(key === "education" ? createEmptyEducationEntry() : createEmptyExperienceEntry());
        });
      }
      if(action === "remove-entry"){
        return applySectionDocStructuralChange((doc) => {
          const list = key === "education" ? ensureDocEducation(doc) : ensureDocExperience(doc);
          if(entryIndex >= 0 && entryIndex < list.length) list.splice(entryIndex, 1);
        });
      }
      if(action === "add-bullet"){
        return applySectionDocStructuralChange((doc) => {
          const list = key === "education" ? ensureDocEducation(doc) : ensureDocExperience(doc);
          const entry = list[entryIndex];
          if(!entry) return;
          entry.bullets = Array.isArray(entry.bullets) ? entry.bullets : [];
          entry.bullets.push("");
        });
      }
      if(action === "remove-bullet"){
        return applySectionDocStructuralChange((doc) => {
          const list = key === "education" ? ensureDocEducation(doc) : ensureDocExperience(doc);
          const entry = list[entryIndex];
          if(!entry) return;
          entry.bullets = Array.isArray(entry.bullets) ? entry.bullets : [];
          if(bulletIndex >= 0 && bulletIndex < entry.bullets.length) entry.bullets.splice(bulletIndex, 1);
        });
      }
      if(action === "add-group"){
        return applySectionDocStructuralChange((doc) => {
          ensureDocSkills(doc).groups.push(createEmptySkillGroup());
        });
      }
      if(action === "header-contact-style"){
        historyStack.push(snapshotCurrent());
        ensureDocHeader(lastCvDoc).contact_style = normalizeContactStyle(btn.getAttribute("data-style") || "");
        return syncSectionDocEdit({ renderEditor:true });
      }
      if(action === "remove-group"){
        return applySectionDocStructuralChange((doc) => {
          const groups = ensureDocSkills(doc).groups;
          if(groupIndex >= 0 && groupIndex < groups.length) groups.splice(groupIndex, 1);
        });
      }
      if(action === "add-custom-section"){
        historyStack.push(snapshotCurrent());
        const sectionId = createCustomSectionId();
        const key = buildCustomSectionKey(sectionId);
        ensureDocCustomSections(lastCvDoc).push(normalizeCustomSection({
          id: sectionId,
          title: sectionEditorCopy().customDefaultTitle,
          style: "paragraph",
          items: []
        }));
        cvSectionPrefs = normalizeCvSectionPrefs(cvSectionPrefs, lastCvDoc);
        if(!cvSectionPrefs.order.includes(key)) cvSectionPrefs.order.push(key);
        cvSectionPrefs.hidden[key] = false;
        activeSectionEditorKey = key;
        syncSectionDocEdit({ renderEditor:true });
        scrollSectionEditorIntoView();
        return;
      }
      if(action === "remove-custom-section"){
        historyStack.push(snapshotCurrent());
        const keyToRemove = String(btn.getAttribute("data-section-key") || "");
        const id = getCustomSectionIdFromKey(keyToRemove);
        if(!id) return;
        const sections = ensureDocCustomSections(lastCvDoc);
        const idx = sections.findIndex((section) => String(section.id) === id);
        if(idx >= 0) sections.splice(idx, 1);
        cvSectionPrefs = normalizeCvSectionPrefs(cvSectionPrefs, lastCvDoc);
        cvSectionPrefs.order = cvSectionPrefs.order.filter((key) => key !== keyToRemove);
        delete cvSectionPrefs.hidden[keyToRemove];
        activeSectionEditorKey = (cvSectionPrefs.order[0] || CV_SECTION_KEYS[0] || "");
        syncSectionDocEdit({ renderEditor:true });
        scrollSectionEditorIntoView();
      }
    }

    function cvDocToPreviewHtml(doc, lang){
      ensureDocHeader(doc);
      const name = String(doc?.name || "YOUR NAME");
      const role = getHeaderRole(doc);
      const previewClass = ["cvPreview", getCvFontPreviewClass()].join(" ");
      const c = doc?.contact || {};
      const headerFocus = studioMode === "customize" && String(activeSectionEditorKey || "") === HEADER_EDITOR_KEY;
      const headerPrimaryHtml = renderHeaderContactLineHtml([
        ["phone", c.phone],
        ["email", c.email],
        ["location", c.location]
      ], doc.header?.contact_style);
      const headerSecondaryHtml = renderHeaderContactLineHtml([
        ["linkedin", c.linkedin],
        ["portfolio", c.portfolio]
      ], doc.header?.contact_style);
      const orderedSections = getOrderedCvSections(doc, lang);

      return [
        `<div class="${previewClass}">`,
        `<div class="cvHeaderBlock${headerFocus ? " isHeaderFocus" : ""}">`,
        `<div class="cvName">${H.escapeHtml(name)}</div>`,
        role ? `<div class="cvRole">${H.escapeHtml(role)}</div>` : ``,
        headerPrimaryHtml ? `<div class="cvContact">${headerPrimaryHtml}</div>` : ``,
        headerSecondaryHtml ? `<div class="cvContact cvContactSecondary">${headerSecondaryHtml}</div>` : ``,
        `</div>`,
        orderedSections.map((section) => sec(section.title, renderCvSectionInner(section), section.key)).join(""),
        `</div>`,
      ].join("");
    }

    function cvDocToPlainText(doc, lang){
      const lines = [];
      ensureDocHeader(doc);
      const name = String(doc?.name || "").trim();
      const role = getHeaderRole(doc);
      const c = doc?.contact || {};
      const contactLine = formatHeaderContactLine([
        ["phone", c.phone],
        ["email", c.email],
        ["linkedin", c.linkedin],
        ["portfolio", c.portfolio],
        ["location", c.location]
      ], doc, "plain");

      if(name) lines.push(name);
      if(role) lines.push(role);
      if(contactLine) lines.push(contactLine);
      if(lines.length) lines.push("");

      getOrderedCvSections(doc, lang).forEach((section) => {
        lines.push(String(section.title || "").toUpperCase());
        if(section.kind === "paragraph"){
          (section.paragraphs || []).forEach((paragraph) => lines.push(paragraph));
        }else if(section.kind === "experience"){
          (section.items || []).forEach((e) => {
            const t = String(e?.title || "").trim();
            const sub = joinNonEmpty([e?.company, e?.location], ", ");
            const meta = joinNonEmpty([e?.start, e?.end], " – ");
            if(t) lines.push(t);
            if(sub) lines.push(sub);
            if(meta) lines.push(meta);
            asStringArr(e?.bullets, 12).forEach((bb) => lines.push("- " + bb));
            lines.push("");
          });
        }else if(section.kind === "education"){
          (section.items || []).forEach((e) => {
            const t = joinNonEmpty([e?.degree, e?.field], " · ");
            const sub = joinNonEmpty([e?.school, e?.location], ", ");
            const meta = joinNonEmpty([e?.start, e?.end], " – ");
            if(t) lines.push(t);
            if(sub) lines.push(sub);
            if(meta) lines.push(meta);
            asStringArr(e?.bullets, 8).forEach((bb) => lines.push("- " + bb));
            lines.push("");
          });
        }else if(section.kind === "bullets"){
          (section.items || []).forEach((entry) => lines.push("- " + entry));
        }else if(section.kind === "lines"){
          (section.items || []).forEach((entry) => lines.push(entry));
        }
        lines.push("");
      });

      return lines.join("\n").trim() + "\n";
    }

    function cvTextToPrintableHtml(title, text){
      const safeTitle = H.escapeHtml(title || "Curriculum Vitae");
      const safeText = H.escapeHtml(String(text || "").trim());
      const textFont = normalizeCvFontTheme(cvFontTheme) === "sans"
        ? `"Helvetica Neue", Arial, "Segoe UI", sans-serif`
        : `"Georgia", "Times New Roman", serif`;
      return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${safeTitle}</title>
<style>
  @page{ size:A4; margin:14mm 14mm 14mm 14mm; }
  body{ margin:0; padding:0; font-family: ${textFont}; color:#111318; }
  .cvPaper{ max-width:820px; margin:0 auto; padding:0; }
  h1{ font-size:18px; margin:0 0 10px 0; }
  pre{ white-space:pre-wrap; font-size:12.5px; line-height:1.45; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace; }
</style>
</head>
<body>
  <div class="cvPaper">
    <h1>${safeTitle}</h1>
    <pre>${safeText}</pre>
  </div>
</body>
</html>`;
    }

    function cvDocToPrintableHtml(cvDoc, lang, title){
      const css = `
        @page{ size:A4; margin:14mm 14mm 14mm 14mm; }
        body{ margin:0; padding:0; color:#111318; }
        .cvPaper{ max-width:820px; margin:0 auto; }
        .cvPaper.cvFontSerif{ font-family: "Georgia", "Times New Roman", serif; }
        .cvPaper.cvFontSans{ font-family: "Helvetica Neue", Arial, "Segoe UI", sans-serif; }
        .cvName{ font-size:32px; font-weight:700; letter-spacing:0; color:#111318; text-align:center; }
        .cvPaper.cvFontSans .cvName{ font-weight:800; letter-spacing:-.04em; }
        .cvRole{ margin-top:4px; font-size:13.5px; font-weight:600; color:#3b3f46; text-align:center; }
        .cvContact{ margin-top:6px; font-size:11.6px; color:#3b3f46; text-align:center; }
        .cvContactSecondary{ margin-top:3px; }
        .cvSection{ margin-top:18px; }
        .cvSectionTitle{ font-size:13px; font-weight:700; letter-spacing:0; text-transform:none; border-bottom:1px solid rgba(17,19,24,.55); padding-bottom:6px; margin:0 0 9px 0; }
        .cvPaper.cvFontSans .cvSectionTitle{ font-weight:800; letter-spacing:-.01em; }
        .cvItem{ margin-top:11px; }
        .cvItemHead{ display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
        .cvItemHeadMain{ min-width:0; }
        .cvItemTitle{ font-size:13.6px; font-weight:700; }
        .cvItemSub{ margin-top:2px; font-size:11.9px; font-style:italic; color:#626872; }
        .cvMetaLine{ margin-top:1px; font-size:11.8px; color:#626872; font-style:italic; white-space:nowrap; }
        .cvUl{ margin:6px 0 0 18px; padding:0; }
        .cvUl li{ margin:0 0 3px 0; font-size:12.4px; line-height:1.42; }
        .cvPara{ font-size:12.5px; line-height:1.52; margin:0; }
        .cvSkillLine{ font-size:12.4px; line-height:1.46; margin:2px 0; }
      `;

      const safeTitle = H.escapeHtml(title || "Curriculum Vitae");
      const bodyHtml = cvDocToPreviewHtml(cvDoc, lang).replace(/<div class="cvPreview([^"]*)">/, '<div class="cvPaper$1">');

      return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${safeTitle}</title>
<style>${css}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
    }

    function printHtml(html){
      const blob = new Blob([html], {type:'text/html'});
      const url = URL.createObjectURL(blob);
      let iframe = document.getElementById('printFrame');
      if(!iframe){
        iframe = document.createElement('iframe');
        iframe.id = 'printFrame';
        iframe.style.position='fixed';
        iframe.style.right='0';
        iframe.style.bottom='0';
        iframe.style.width='1px';
        iframe.style.height='1px';
        iframe.style.opacity='0';
        iframe.style.pointerEvents='none';
        document.body.appendChild(iframe);
      }
      iframe.onload = () => {
        try{
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }catch(_){}
        setTimeout(()=>{ try{ URL.revokeObjectURL(url); }catch(_){} }, 1500);
      };
      iframe.src = url;
    }

    /* -------------------------
       Tabs + rendering
       ------------------------- */
    function setTabs(which){
      const isPreview = which === "preview";
      const isText = which === "text";
      const isChanges = which === "changes";

      $("tabPreview")?.classList.toggle("active", isPreview);
      $("tabText")?.classList.toggle("active", isText);
      $("tabChanges")?.classList.toggle("active", isChanges);

      $("cvPreviewWrap").style.display = isPreview ? "" : "none";
      $("cvTextWrap").style.display = isText ? "" : "none";
      $("cvChangesWrap").style.display = isChanges ? "" : "none";

      if(isChanges){
        renderChangesView();
      }
    }

    function hasGeneratedOutput(){
      return !!String($("cvText")?.value || "").trim();
    }

    function updateStudioFlowUi(){
      const hasOutput = hasGeneratedOutput();
      const showPostGenerateStages = hasOutput && !gateActive;
      if(studioRoot) studioRoot.classList.toggle("fullTailorMode", showPostGenerateStages && studioMode !== "customize");
      const modeTailor = $("modeTailor");
      const modeCustomize = $("modeCustomize");
      const modeEdit = $("modeEdit");
      const modeReview = $("modeReview");
      if(modeTailor){
        modeTailor.style.display = showPostGenerateStages ? "none" : "";
        modeTailor.disabled = showPostGenerateStages;
      }
      [modeCustomize, modeEdit, modeReview].forEach((btn) => {
        if(!btn) return;
        btn.style.display = showPostGenerateStages ? "" : "none";
        btn.disabled = !showPostGenerateStages;
      });

      if(!showPostGenerateStages && studioMode !== "tailor"){
        setStudioMode("tailor");
        return;
      }

      if(showPostGenerateStages && studioMode === "tailor"){
        setStudioMode("customize");
        return;
      }

      updateSettingsSurfaceUi();

      const usedDetails = $("usedKeywordsDetails");
      const usedCount = Array.isArray(lastUsed) ? lastUsed.length : 0;
      if(usedDetails) usedDetails.style.display = usedCount ? "" : "none";
      setText("usedKeywordsSummary", usedCount ? `Already covered (${usedCount})` : "Already covered");
    }

    /* -------------------------
       Studio modes (Resume.io-inspired)
       - Tailor: pre-generation job setup
       - Customize: content + formatting workspace once a CV exists
       - Edit: improvement workspace for ATS terms and wording
       - Review: final QA before export
       ------------------------- */
    const studioRoot = $("studioRoot");
    let studioMode = "tailor";

    function setModeButton(activeId){
      const ids = ["modeTailor","modeCustomize","modeEdit","modeReview"];
      ids.forEach((id) => {
        const b = $(id);
        if(!b) return;
        const isActive = id === activeId;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-selected", isActive ? "true" : "false");
      });
    }

    function updateSettingsSurfaceUi(){
      const hasOutput = hasGeneratedOutput();
      const showFormatOptions = hasOutput && !gateActive && studioMode === "customize";
      const formatBlock = $("formatOptionsBlock");
      if(formatBlock){
        formatBlock.hidden = !showFormatOptions;
        formatBlock.style.display = showFormatOptions ? "" : "none";
      }

      const summary = $("settingsSummary");
      if(summary){
        summary.textContent = showFormatOptions
          ? (uiLang === "de" ? "Formatoptionen" : "Formatting options")
          : (uiLang === "de" ? "Tailoring-Optionen" : "Tailoring options");
      }
    }

    function setStudioMode(mode, opts = {}){
      const hasOutput = hasGeneratedOutput();
      let nextMode = mode || "tailor";
      if((nextMode === "customize" || nextMode === "edit" || nextMode === "review") && !hasOutput) nextMode = "tailor";
      studioMode = nextMode;
      if(studioRoot) studioRoot.setAttribute("data-mode", studioMode);

      if(studioMode === "customize"){
        setModeButton("modeCustomize");
        setTabs("preview");
        try{ setSetupCollapsed(false, { persist:false, scroll:false }); }catch(_){}
        try{ $("settingsDetails").open = true; }catch(_){}
        if(!activeSectionEditorKey || !isValidSectionKey(activeSectionEditorKey, lastCvDoc)){
          const firstKey = (ensureCvSectionPrefs(lastCvDoc).order || []).find((key) => isValidSectionKey(key, lastCvDoc)) || "experience";
          activeSectionEditorKey = firstKey;
        }
        try{ $("setupTitle").textContent = isLikelyGerman(uiLang) ? "Content" : "Content"; }catch(_){}
        renderSectionEditor();
      }else if(studioMode === "edit"){
        setModeButton("modeEdit");
        // Keep the improvement workspace focused on the CV itself.
        setTabs("preview");
        try{ $("setupTitle").textContent = t("setupTitle") || "Setup"; }catch(_){}
      }else if(studioMode === "review"){
        setModeButton("modeReview");
        setTabs("preview");
        try{ $("setupTitle").textContent = t("setupTitle") || "Setup"; }catch(_){}
      }else{
        setModeButton("modeTailor");
        setTabs("preview");
        try{ $("setupTitle").textContent = t("setupTitle") || "Setup"; }catch(_){}
      }

      // Inspector header copy
      if(studioMode === "review"){
        $("inspectorTitle").textContent = "Final check";
        $("inspectorHint").textContent = "Run one last check before export. We flag the highest-impact fixes first.";
        $("inspectorBadge").textContent = "Final";
      }else if(studioMode === "customize"){
        $("inspectorTitle").textContent = "Content";
        $("inspectorHint").textContent = "Edit sections, adjust content, and shape the final layout while keeping the full CV visible.";
        $("inspectorBadge").textContent = "Content";
      }else if(studioMode === "edit"){
        $("inspectorTitle").textContent = "Improve";
        $("inspectorHint").textContent = "Add true missing ATS terms directly in the preview and refine the wording where it matters most.";
        $("inspectorBadge").textContent = "Improve";
      }else{
        $("inspectorTitle").textContent = "Inspector";
        $("inspectorHint").textContent = "Start with the missing ATS terms. When the match looks good, run the final check and export.";
        $("inspectorBadge").textContent = hasOutput ? "Next" : "Live";
      }

      // Close the download dropdown if it's open (keeps things tidy)
      const dl = $("studioDownloadDrop");
      if(dl) dl.open = false;

      if(opts.persist !== false){
        try { localStorage.setItem("jmj_cv_mode", studioMode); } catch(_) {}
      }
      updateStudioFlowUi();
      renderCvPreviewFromDoc(lastCvDoc, lastLang);
      renderSectionManager();
    }

    /* -------------------------
       Changes / Diff view
       ------------------------- */
    function normText(t){
      return String(t || "")
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+/g, " ")
        .trim();
    }

    function splitLines(t){
      const s = String(t || "").replace(/\r\n/g,"\n");
      // Keep empty lines (important for CV structure)
      return s.split("\n");
    }

    // Simple LCS-based line diff: returns [{type:"same"|"add"|"del", line:string}]
    function diffLinesLcs(aText, bText){
      const A = splitLines(aText);
      const B = splitLines(bText);

      const n = A.length;
      const m = B.length;

      // Fast paths
      if(n === 0 && m === 0) return [];
      if(n === 0) return B.map(line => ({ type:"add", line }));
      if(m === 0) return A.map(line => ({ type:"del", line }));

      // DP table (n+1) x (m+1)
      // Keep it as Uint16Array per row for memory (CVs are small enough)
      const dp = Array.from({length: n+1}, () => new Uint16Array(m+1));

      for(let i=n-1; i>=0; i--){
        const row = dp[i];
        const rowNext = dp[i+1];
        for(let j=m-1; j>=0; j--){
          if(A[i] === B[j]) row[j] = rowNext[j+1] + 1;
          else row[j] = Math.max(rowNext[j], row[j+1]);
        }
      }

      const out = [];
      let i = 0, j = 0;
      while(i < n && j < m){
        if(A[i] === B[j]){
          out.push({ type:"same", line: A[i] });
          i++; j++;
        }else{
          const down = dp[i+1][j];
          const right = dp[i][j+1];
          if(down >= right){
            out.push({ type:"del", line: A[i] });
            i++;
          }else{
            out.push({ type:"add", line: B[j] });
            j++;
          }
        }
      }
      while(i < n){ out.push({ type:"del", line: A[i++] }); }
      while(j < m){ out.push({ type:"add", line: B[j++] }); }
      return out;
    }

    function tokenizeInlineDiffText(text){
      const src = String(text || "");
      if(!src) return [];
      const fallbackRe = /(\s+|[A-Za-z0-9%]+(?:[\/&+.#-][A-Za-z0-9%]+)*|[^\s])/g;
      try{
        const unicodeRe = /(\s+|[\p{L}\p{N}%]+(?:[\/&+.#-][\p{L}\p{N}%]+)*|[^\s])/gu;
        const tokens = Array.from(src.matchAll(unicodeRe), m => m[0]);
        return tokens.length ? tokens : [src];
      }catch(_){
        const tokens = Array.from(src.matchAll(fallbackRe), m => m[0]);
        return tokens.length ? tokens : [src];
      }
    }

    function normalizeInlineDiffToken(token){
      return String(token || "").trim().toLocaleLowerCase(uiLang === "de" ? "de-DE" : "en-US");
    }

    function buildInlineDiffHighlightHtml(beforeText, afterText){
      const rawAfter = String(afterText || "");
      if(!rawAfter) return { html: "—", changed: false };

      const beforeTokens = tokenizeInlineDiffText(beforeText)
        .filter(tok => !/^\s+$/.test(tok))
        .map(normalizeInlineDiffToken);
      const afterPieces = tokenizeInlineDiffText(rawAfter).map(tok => ({
        text: tok,
        isSpace: /^\s+$/.test(tok),
        norm: /^\s+$/.test(tok) ? "" : normalizeInlineDiffToken(tok)
      }));
      const afterTokens = afterPieces.filter(piece => !piece.isSpace).map(piece => piece.norm);

      if(!beforeTokens.length || !afterTokens.length){
        return { html: H.escapeHtml(rawAfter), changed: false };
      }

      const n = beforeTokens.length;
      const m = afterTokens.length;
      const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));

      for(let i = n - 1; i >= 0; i--){
        const row = dp[i];
        const nextRow = dp[i + 1];
        for(let j = m - 1; j >= 0; j--){
          if(beforeTokens[i] === afterTokens[j]) row[j] = nextRow[j + 1] + 1;
          else row[j] = Math.max(nextRow[j], row[j + 1]);
        }
      }

      const addedTokenIndexes = new Set();
      let i = 0;
      let j = 0;
      while(i < n && j < m){
        if(beforeTokens[i] === afterTokens[j]){
          i++;
          j++;
        }else if(dp[i + 1][j] >= dp[i][j + 1]){
          i++;
        }else{
          addedTokenIndexes.add(j);
          j++;
        }
      }
      while(j < m){
        addedTokenIndexes.add(j);
        j++;
      }

      if(!addedTokenIndexes.size){
        return { html: H.escapeHtml(rawAfter), changed: false };
      }

      let html = "";
      let afterTokenIndex = 0;
      let inMark = false;
      const openMark = () => {
        if(inMark) return;
        html += `<mark class="kwInlineDiffAdd">`;
        inMark = true;
      };
      const closeMark = () => {
        if(!inMark) return;
        html += `</mark>`;
        inMark = false;
      };

      afterPieces.forEach(piece => {
        if(piece.isSpace){
          html += H.escapeHtml(piece.text);
          return;
        }
        const isAdded = addedTokenIndexes.has(afterTokenIndex);
        afterTokenIndex += 1;
        if(isAdded) openMark();
        else closeMark();
        html += H.escapeHtml(piece.text);
      });
      closeMark();

      return { html, changed: true };
    }

    function countAddedSignals(diff){
      const added = diff.filter(d => d.type === "add").map(d => d.line).join("\n");
      const del = diff.filter(d => d.type === "del").map(d => d.line).join("\n");

      // Numbers/metrics (often risky if introduced without proof)
      const numRe = /\b\d{1,3}(?:[.,]\d{1,2})?(?:%|k|K|m|M)?\b/g;
      const addedNums = (added.match(numRe) || []).length;

      // Certification / qualification-like tokens (heuristic)
      const certTokens = [
        "PMP","PRINCE2","ITIL","AWS","AZ-","GCP","Google Cloud","Scrum Master","CSM","PSM",
        "CFA","CPA","CIPP","CISSP","OSCP","ISTQB","TOGAF","SAP Certified","MBA"
      ];
      let certHits = 0;
      for(const tok of certTokens){
        const re = new RegExp(String(tok).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        if(re.test(added)) certHits += 1;
      }

      // Seniority inflation (heuristic)
      const seniorityHits = (added.match(/\b(Senior|Lead|Head of|Principal)\b/gi) || []).length;

      // Language claims (heuristic)
      const langClaimHits = (added.match(/\b(native|fluent|C2|C1|B2)\b/gi) || []).length;

      // How many lines changed
      const addLines = diff.filter(d => d.type === "add" && String(d.line||"").trim()).length;
      const delLines = diff.filter(d => d.type === "del" && String(d.line||"").trim()).length;

      return { addedNums, certHits, seniorityHits, langClaimHits, addLines, delLines, addedText: added, deletedText: del };
    }

    function assessReviewRisk(diff){
      const s = countAddedSignals(diff);
      let score = 0;

      if(s.addedNums > 0) score += 2;
      if(s.certHits > 0) score += 2;
      if(s.seniorityHits > 0) score += 1;
      if(s.langClaimHits > 0) score += 1;
      if(s.addLines + s.delLines > 18) score += 1;

      let level = "Low";
      let cls = "good";
      if(score >= 4){ level = "High"; cls = "bad"; }
      else if(score >= 2){ level = "Medium"; cls = "warn"; }

      // Confidence is inverse of risk score (simple)
      const confidence = Math.max(10, Math.min(100, 100 - score * 18));

      const notes = [];
      if(s.addedNums > 0) notes.push("New numbers/metrics detected");
      if(s.certHits > 0) notes.push("New certifications/qualifications detected");
      if(s.seniorityHits > 0) notes.push("Seniority wording changes detected");
      if(s.langClaimHits > 0) notes.push("Language proficiency claims detected");
      if(!notes.length) notes.push("Mostly wording/keyword changes");

      return { level, cls, confidence, notes, signals: s };
    }

    function fmtDelta(delta){
      if(delta == null || isNaN(delta)) return "";
      if(delta > 0) return `(+${delta})`;
      if(delta < 0) return `(${delta})`;
      return "(±0)";
    }

    function buildDocChanges(baseDoc, curDoc){
      const changes = [];
      if(!baseDoc || !curDoc) return changes;

      // Summary (array -> string compare)
      const baseSummary = Array.isArray(baseDoc.summary) ? baseDoc.summary.join(" ").trim() : String(baseDoc.summary||"").trim();
      const curSummary = Array.isArray(curDoc.summary) ? curDoc.summary.join(" ").trim() : String(curDoc.summary||"").trim();
      if(normText(baseSummary) !== normText(curSummary)){
        changes.push({
          id: "summary",
          kind: "summary",
          title: "Profile",
          meta: "Summary paragraph",
          before: baseSummary,
          after: curSummary
        });
      }

      // Experience bullets
      const baseExp = Array.isArray(baseDoc.experience) ? baseDoc.experience : [];
      const curExp = Array.isArray(curDoc.experience) ? curDoc.experience : [];
      const expN = Math.max(baseExp.length, curExp.length);

      for(let i=0; i<expN; i++){
        const be = baseExp[i] || null;
        const ce = curExp[i] || null;
        if(!be && !ce) continue;

        const label = [ce?.title || be?.title || "Role", ce?.company || be?.company || ""].filter(Boolean).join(" @ ").trim();
        const bBullets = Array.isArray(be?.bullets) ? be.bullets : [];
        const cBullets = Array.isArray(ce?.bullets) ? ce.bullets : [];
        const bn = bBullets.length;
        const cn = cBullets.length;
        const n = Math.max(bn, cn);

        for(let j=0; j<n; j++){
          const bb = (bBullets[j] == null) ? null : String(bBullets[j]);
          const cb = (cBullets[j] == null) ? null : String(cBullets[j]);
          if(bb === cb) continue;

          // Ignore trailing empty differences
          if(normText(bb) === "" && normText(cb) === "") continue;

          changes.push({
            id: `exp:${i}:${j}`,
            kind: "exp_bullet",
            expIndex: i,
            bulletIndex: j,
            title: "Experience",
            meta: `${label} • Bullet ${j+1}`,
            before: bb,
            after: cb
          });
        }
      }

      // Skills (groups + additional)
      const bSkills = baseDoc.skills || {};
      const cSkills = curDoc.skills || {};

      const bGroups = Array.isArray(bSkills.groups) ? bSkills.groups : [];
      const cGroups = Array.isArray(cSkills.groups) ? cSkills.groups : [];

      // map by label (case-insensitive), fallback to index
      const mapByLabel = (arr) => {
        const map = new Map();
        arr.forEach((g, idx) => {
          const key = String(g?.label || ("#"+idx)).trim().toLowerCase();
          map.set(key, { g, idx });
        });
        return map;
      };
      const bMap = mapByLabel(bGroups);
      const cMap = mapByLabel(cGroups);
      const allKeys = new Set([...bMap.keys(), ...cMap.keys()]);

      for(const key of allKeys){
        const bg = bMap.get(key)?.g || null;
        const cg = cMap.get(key)?.g || null;
        const label = String(cg?.label || bg?.label || "Skills").trim();
        const bItems = Array.isArray(bg?.items) ? bg.items.map(x=>String(x||"").trim()).filter(Boolean) : [];
        const cItems = Array.isArray(cg?.items) ? cg.items.map(x=>String(x||"").trim()).filter(Boolean) : [];

        // Compare as sets (order doesn't matter)
        const bSet = new Set(bItems.map(x=>x.toLowerCase()));
        const cSet = new Set(cItems.map(x=>x.toLowerCase()));
        const added = cItems.filter(x => !bSet.has(x.toLowerCase()));
        const removed = bItems.filter(x => !cSet.has(x.toLowerCase()));
        if(added.length || removed.length){
          changes.push({
            id: `skillsGroup:${key}`,
            kind: "skills_group",
            groupKey: key,
            groupLabel: label,
            title: "Skills",
            meta: label ? `Group: ${label}` : "Skill group",
            before: bItems.join(", "),
            after: cItems.join(", "),
            tags: [
              ...(added.length ? [`Added: ${added.slice(0,6).join(", ")}${added.length>6?"…":""}`] : []),
              ...(removed.length ? [`Removed: ${removed.slice(0,6).join(", ")}${removed.length>6?"…":""}`] : [])
            ]
          });
        }
      }

      const bAdd = Array.isArray(bSkills.additional) ? bSkills.additional.map(x=>String(x||"").trim()).filter(Boolean) : [];
      const cAdd = Array.isArray(cSkills.additional) ? cSkills.additional.map(x=>String(x||"").trim()).filter(Boolean) : [];
      const bAddSet = new Set(bAdd.map(x=>x.toLowerCase()));
      const cAddSet = new Set(cAdd.map(x=>x.toLowerCase()));
      const addAdded = cAdd.filter(x => !bAddSet.has(x.toLowerCase()));
      const addRemoved = bAdd.filter(x => !cAddSet.has(x.toLowerCase()));
      if(addAdded.length || addRemoved.length){
        changes.push({
          id: "skillsAdditional",
          kind: "skills_additional",
          title: "Skills",
          meta: "Additional skills line",
          before: bAdd.join(", "),
          after: cAdd.join(", "),
          tags: [
            ...(addAdded.length ? [`Added: ${addAdded.slice(0,6).join(", ")}${addAdded.length>6?"…":""}`] : []),
            ...(addRemoved.length ? [`Removed: ${addRemoved.slice(0,6).join(", ")}${addRemoved.length>6?"…":""}`] : [])
          ]
        });
      }

      return changes;
    }

    function detectManualTextEdits(){
      if(!lastCvDoc) return false;
      const docText = cvDocToPlainText(lastCvDoc, lastLang);
      const curText = $("cvText").value || "";
      return normText(docText) !== normText(curText);
    }

    function renderChangesView(){
      // If no baseline, show empty
      if(!baseSnapshot){
        $("changeKpis").innerHTML = `<span class="hint">Generate a CV to review changes.</span>`;
        $("changeCards").innerHTML = "";
        $("diffBox").textContent = "—";
        $("trustBar").style.width = "0%";
        $("trustHint").textContent = "—";
        $("btnCopyChangeSummary").disabled = true;
        $("btnUndoFromChanges").disabled = true;
        $("btnResetFromChanges").disabled = true;
        $("btnSyncTextToDoc").style.display = "none";
        return;
      }

      // Enable buttons
      $("btnCopyChangeSummary").disabled = false;
      $("btnUndoFromChanges").disabled = $("btnUndoEdit")?.disabled ?? false;
      $("btnResetFromChanges").disabled = $("btnResetEdits")?.disabled ?? false;

      const baseAts = computeAtsScore(baseSnapshot.used, baseSnapshot.missing);
      const curAts = computeAtsScore(lastUsed, lastMissing);

      const baseMiss = Array.isArray(baseSnapshot.missing) ? baseSnapshot.missing.length : 0;
      const curMiss = Array.isArray(lastMissing) ? lastMissing.length : 0;
      const missDelta = baseMiss - curMiss;

      const baseUsed = Array.isArray(baseSnapshot.used) ? baseSnapshot.used.length : 0;
      const curUsed = Array.isArray(lastUsed) ? lastUsed.length : 0;
      const usedDelta = curUsed - baseUsed;

      // Build diffs
      const baseText = String(baseSnapshot.cv_text || "");
      const curText = String($("cvText").value || "");
      const diff = diffLinesLcs(baseText, curText);

      // Risk
      const risk = assessReviewRisk(diff);
      $("trustBar").style.width = String(risk.confidence) + "%";
      $("trustHint").textContent = `Review risk: ${risk.level}. ${risk.notes.join(" · ")}.`;

      // Manual edits detection
      const manual = detectManualTextEdits();
      if(manual){
        $("btnSyncTextToDoc").style.display = "";
      }else{
        $("btnSyncTextToDoc").style.display = "none";
      }

      // KPIs
      const kpis = [];
      if(baseAts != null && curAts != null){
        const delta = curAts - baseAts;
        kpis.push(`<span class="changePill ${delta>=0 ? "good":"warn"}">ATS: ${baseAts}% → ${curAts}% ${fmtDelta(delta)}</span>`);
      }else if(curAts != null){
        kpis.push(`<span class="changePill">ATS: ${curAts}%</span>`);
      }else{
        kpis.push(`<span class="changePill">ATS: —</span>`);
      }

      kpis.push(`<span class="changePill ${missDelta>0 ? "good" : ""}">Missing keywords: ${baseMiss} → ${curMiss} ${fmtDelta(missDelta)}</span>`);
      kpis.push(`<span class="changePill ${usedDelta>0 ? "good" : ""}">Used keywords: ${baseUsed} → ${curUsed} ${fmtDelta(usedDelta)}</span>`);
      kpis.push(`<span class="changePill ${manual ? "warn" : ""}">${manual ? "Text edited manually" : "Text in sync"}</span>`);
      kpis.push(`<span class="changePill ${risk.cls}">Truth check: ${risk.level}</span>`);

      $("changeKpis").innerHTML = kpis.join("");

      // Structured doc changes (for per-bullet review)
      const docChanges = buildDocChanges(baseSnapshot.cv_doc, lastCvDoc);
      const showDocReview = !manual;

      if(!docChanges.length){
        $("changeCards").innerHTML = `<div class="hint">No structured changes detected.</div>`;
      }else{
        const baseMissingSet = new Set((baseSnapshot.missing || []).map(x => String(x||"").trim()).filter(Boolean));
        const cards = docChanges.slice(0, 120).map(ch => {
          const before = (ch.before == null) ? "" : String(ch.before);
          const after = (ch.after == null) ? "" : String(ch.after);

          // Tag any keywords newly introduced in this snippet
          const addedKws = [];
          const allKws = Array.isArray(atsKeywordsAll) ? atsKeywordsAll : [];
          for(const kw of allKws){
            if(!kw) continue;
            if(keywordInText(kw, after) && !keywordInText(kw, before)){
              const baseMissing = baseMissingSet.has(String(kw).trim());
              // prefer highlighting keywords that were missing at generation time
              if(baseMissing) addedKws.push(prettyKeyword(kw, lastLang));
              if(addedKws.length >= 6) break;
            }
          }

          const tags = [];
          if(addedKws.length) tags.push(`<span class="tag good">Added keywords: ${H.escapeHtml(addedKws.join(", "))}</span>`);
          if(Array.isArray(ch.tags)){
            for(const t of ch.tags.slice(0,3)){
              tags.push(`<span class="tag warn">${H.escapeHtml(String(t))}</span>`);
            }
          }

          const btn = showDocReview
            ? `<button class="btn small" type="button" data-revert-id="${H.escapeHtml(ch.id)}">Revert</button>`
            : `<button class="btn small" type="button" disabled title="Sync text to preview to enable per-change revert.">Revert</button>`;

          return `
            <div class="changeCard">
              <div class="changeCardTop">
                <div style="min-width:0">
                  <div class="changeTitle">${H.escapeHtml(ch.title)}</div>
                  <div class="changeMeta">${H.escapeHtml(ch.meta || "")}</div>
                </div>
                <div style="flex:0 0 auto; display:flex; gap:8px; align-items:center;">
                  ${btn}
                </div>
              </div>

              <div class="changeBody">
                <div class="changeBlock">
                  <div class="changeLabel">Before</div>
                  <div class="changeText">${H.escapeHtml(before || "—")}</div>
                </div>
                <div class="changeBlock">
                  <div class="changeLabel">After</div>
                  <div class="changeText">${H.escapeHtml(after || "—")}</div>
                  ${tags.length ? `<div class="changeTags">${tags.join("")}</div>` : ``}
                </div>
              </div>
            </div>
          `;
        }).join("");

        $("changeCards").innerHTML = cards;

        if(manual){
          $("changeCards").insertAdjacentHTML("afterbegin", `
            <div class="changeCard" style="border-color: rgba(255,179,0,.28); background: rgba(255,179,0,.06);">
              <div class="changeTitle">Heads up: Text tab edits are active</div>
              <div class="changeMeta">
                You edited the CV text manually. Preview is still based on the structured CV.
                If you want to revert changes per bullet safely, click “Sync text to preview”.
              </div>
            </div>
          `);
        }
      }

      // Render advanced diff
      const diffHtml = diff.slice(0, 1500).map(d => {
        const prefix = d.type === "add" ? "+ " : (d.type === "del" ? "- " : "  ");
        const cls = d.type === "add" ? "add" : (d.type === "del" ? "del" : "same");
        return `<span class="diffLine ${cls}">${H.escapeHtml(prefix + (d.line ?? ""))}</span>`;
      }).join("");

      $("diffBox").innerHTML = diffHtml ? `<div class="diffLines">${diffHtml}</div>` : "—";

      // Set hint
      const changedLines = diff.filter(d => d.type !== "same" && String(d.line||"").trim()).length;
      $("changesHint").textContent = changedLines
        ? `Review what changed since the last generation. (${changedLines} changed lines)`
        : "No textual changes since the last generation.";

      // Keep buttons state in sync with main Undo/Reset
      $("btnUndoFromChanges").disabled = $("btnUndoEdit")?.disabled ?? true;
      $("btnResetFromChanges").disabled = $("btnResetEdits")?.disabled ?? true;
    }

    function revertStructuredChange(changeId){
      if(!baseSnapshot || !baseSnapshot.cv_doc || !lastCvDoc) return;
      const manual = detectManualTextEdits();
      if(manual){
        showError("You edited the Text tab manually. Click “Sync text to preview” first to enable per-change revert safely.");
        return;
      }

      const baseDoc = baseSnapshot.cv_doc;
      const curDoc = lastCvDoc;

      // Find the matching change item (recompute)
      const changes = buildDocChanges(baseDoc, curDoc);
      const ch = changes.find(x => String(x.id) === String(changeId));
      if(!ch) return;

      // Save history
      historyStack.push(snapshotCurrent());
      updateUndoResetButtons();

      try{
        if(ch.kind === "summary"){
          curDoc.summary = deepCopy(baseDoc.summary);
        }else if(ch.kind === "exp_bullet"){
          const i = ch.expIndex;
          const j = ch.bulletIndex;
          const bExp = Array.isArray(baseDoc.experience) ? baseDoc.experience : [];
          const cExp = Array.isArray(curDoc.experience) ? curDoc.experience : [];
          if(!cExp[i]) return;

          const bBullets = Array.isArray(bExp[i]?.bullets) ? bExp[i].bullets : [];
          const cBullets = Array.isArray(cExp[i]?.bullets) ? cExp[i].bullets : [];

          const bb = (bBullets[j] == null) ? null : String(bBullets[j]);
          const cb = (cBullets[j] == null) ? null : String(cBullets[j]);

          if(bb == null && cb != null){
            // Added bullet -> remove
            cBullets.splice(j, 1);
          }else if(bb != null && cb == null){
            // Removed bullet -> insert back
            cBullets.splice(j, 0, bb);
          }else{
            // Edited -> restore
            cBullets[j] = bb;
          }

          cExp[i].bullets = cBullets;
          curDoc.experience = cExp;
        }else if(ch.kind === "skills_group"){
          const bSkills = baseDoc.skills || {};
          const cSkills = curDoc.skills || {};
          const bGroups = Array.isArray(bSkills.groups) ? bSkills.groups : [];
          const cGroups = Array.isArray(cSkills.groups) ? cSkills.groups : [];

          // locate group in current by key
          const key = String(ch.groupKey || "").trim().toLowerCase();
          const keyOf = (g, idx) => String(g?.label || ("#"+idx)).trim().toLowerCase();

          const bIdx = bGroups.findIndex((g, idx) => keyOf(g, idx) === key);
          const cIdx = cGroups.findIndex((g, idx) => keyOf(g, idx) === key);

          if(cIdx === -1){
            // nothing to revert
          }else if(bIdx === -1){
            // group did not exist in base -> remove group
            cGroups.splice(cIdx, 1);
          }else{
            // restore items to base
            cGroups[cIdx].items = deepCopy(bGroups[bIdx].items || []);
          }

          curDoc.skills = { ...(cSkills||{}), groups: cGroups };
        }else if(ch.kind === "skills_additional"){
          const bSkills = baseDoc.skills || {};
          const cSkills = curDoc.skills || {};
          curDoc.skills = { ...(cSkills||{}), additional: deepCopy(bSkills.additional || []) };
        }

        // Re-render + sync text to doc
        renderCvPreviewFromDoc(curDoc, lastLang);
        $("cvText").value = cvDocToPlainText(curDoc, lastLang);

        // Keep keyword coverage in sync
        recomputeCoverageFromCurrentText();

        // Re-render changes view if active
        if($("tabChanges").classList.contains("active")){
          renderChangesView();
        }
      }catch(e){
        showError(e?.message || String(e));
      }
    }

    async function copyChangeSummary(){
      if(!baseSnapshot) return;
      const baseAts = computeAtsScore(baseSnapshot.used, baseSnapshot.missing);
      const curAts = computeAtsScore(lastUsed, lastMissing);

      const baseMiss = Array.isArray(baseSnapshot.missing) ? baseSnapshot.missing.length : 0;
      const curMiss = Array.isArray(lastMissing) ? lastMissing.length : 0;

      const baseUsed = Array.isArray(baseSnapshot.used) ? baseSnapshot.used.length : 0;
      const curUsed = Array.isArray(lastUsed) ? lastUsed.length : 0;

      const baseText = String(baseSnapshot.cv_text || "");
      const curText = String($("cvText").value || "");
      const diff = diffLinesLcs(baseText, curText);
      const risk = assessReviewRisk(diff);

      const lines = [];
      const jm = getActiveJobMeta();
      if(jm?.title) lines.push(`Job: ${jm.title}` + (jm.company_name ? ` · ${jm.company_name}` : ""));
      if(baseAts != null && curAts != null) lines.push(`ATS match: ${baseAts}% → ${curAts}%`);
      else if(curAts != null) lines.push(`ATS match: ${curAts}%`);

      lines.push(`Keywords used: ${baseUsed} → ${curUsed}`);
      lines.push(`Keywords missing: ${baseMiss} → ${curMiss}`);
      lines.push(`Truth check: ${risk.level}`);

      const topMissing = Array.isArray(lastMissing) ? lastMissing.slice(0, 10) : [];
      if(topMissing.length) lines.push(`Top missing keywords: ${topMissing.map(k => prettyKeyword(k,lastLang)).join(", ")}`);

      await copyTextToClipboard(lines.join("\n"));
      $("btnCopyChangeSummary").textContent = "Copied ✓";
      setTimeout(()=>{ $("btnCopyChangeSummary").textContent = "Copy summary"; }, 900);
    }

    async function copyDiffToClipboard(){
      if(!baseSnapshot) return;
      const baseText = String(baseSnapshot.cv_text || "");
      const curText = String($("cvText").value || "");
      const diff = diffLinesLcs(baseText, curText);

      const out = diff.map(d => {
        const prefix = d.type === "add" ? "+ " : (d.type === "del" ? "- " : "  ");
        return prefix + String(d.line ?? "");
      }).join("\n");

      await copyTextToClipboard(out);
      $("btnCopyDiff").textContent = "Copied ✓";
      setTimeout(()=>{ $("btnCopyDiff").textContent = "Copy diff"; }, 900);
    }

    function syncTextToPreview(){
      if(!lastCvDoc) return;
      $("cvText").value = cvDocToPlainText(lastCvDoc, lastLang);
      recomputeCoverageFromCurrentText();
      showError("");


      renderChangesView();
    }


    function renderCvPreviewFromDoc(doc = lastCvDoc, lang = lastLang){
      const preview = $("cvPreview");
      if(!preview) return;

      if(doc){
        preview.innerHTML = cvDocToPreviewHtml(doc, lang);
      }else{
        preview.innerHTML = `<div class="hint">${uiLang==="de" ? "Keine strukturierte Preview verfügbar. Zeige Text." : "No structured preview available. Showing text only."}</div>`;
      }

      try{ renderKwInlineUi(); }catch(_){ }
    }

    function setCvOutput({ text, doc, lang }){
      lastCvText = String(text || "").trim();
      lastCvDoc = doc || null;
      if(lastCvDoc) ensureDocHeader(lastCvDoc);
      lastLang = lang || "en";

      // New CV output => QA should run again
      qaLastRunAt = 0;
      qaLastHash = "";
      qaLastReport = null;
      qaPendingAction = "";

      renderCvPreviewFromDoc(lastCvDoc, lastLang);
      renderSectionManager();
      renderSectionEditor();

      // Text view
      const textOut = lastCvDoc ? cvDocToPlainText(lastCvDoc, lastLang) : lastCvText;
      $("cvText").value = textOut || "";

      setOutputEnabled(!!(textOut && textOut.trim()));
      updateUndoResetButtons();
      if($("tabChanges")?.classList?.contains("active")){ try{ renderChangesView(); }catch(_){ } }
    }

    function snapshotCurrent(){
      return {
        at: Date.now(),
        cv_doc: deepCopy(lastCvDoc),
        cv_text: $("cvText").value || "",
        lang: lastLang,
        used: Array.isArray(lastUsed) ? [...lastUsed] : [],
        missing: Array.isArray(lastMissing) ? [...lastMissing] : [],
        all: Array.isArray(atsKeywordsAll) ? [...atsKeywordsAll] : [],
        sections: getCvSectionPrefsSnapshot()
      };
    }

    function restoreSnapshot(snap){
      if(!snap) return;
      lastCvDoc = deepCopy(snap.cv_doc);
      if(lastCvDoc) ensureDocHeader(lastCvDoc);
      lastLang = snap.lang || lastLang || "en";
      $("cvText").value = String(snap.cv_text || "");
      lastUsed = Array.isArray(snap.used) ? snap.used : [];
      lastMissing = Array.isArray(snap.missing) ? snap.missing : [];
      atsKeywordsAll = Array.isArray(snap.all) ? snap.all : atsKeywordsAll;
      cvSectionPrefs = normalizeCvSectionPrefs(snap.sections || cvSectionPrefs || readCvSectionPrefs(lastCvDoc), lastCvDoc);
      cvFontTheme = normalizeCvFontTheme(snap.font || cvFontTheme || readCvFontTheme());
      writeCvFontTheme();
      applyCvFontUi();
      writeCvSectionPrefs();

      // rerender preview from doc if possible
      renderCvPreviewFromDoc(lastCvDoc, lastLang);
      renderSectionManager();
      renderSectionEditor();
      renderKeywords();
      updateUndoResetButtons();
    }

    /* -------------------------
       Queue loading
       ------------------------- */
    async function loadQueue(){
      const resp = await apiGet("/me/jobs/queue");
      jobs = Array.isArray(resp?.data) ? resp.data : [];
      const sel = $("jobSelect");
      sel.innerHTML = "";

      if(!jobs.length){
        sel.innerHTML = `<option value="">${uiLang==="de" ? "Keine Jobs in der Queue" : "No jobs in queue"}</option>`;
        setText("jobHint", uiLang==="de" ? "Keine Jobs gefunden. Öffne Jobs und lade neue Jobs." : "No jobs found. Go to Jobs and fetch new jobs.");
        setText("jobMeta", "");
        selectedJob = null;

        if(jobSource === "queue"){
          $("btnGenerate").disabled = true;
          $("btnGenerateAgain").disabled = true;
          $("btnViewDesc").disabled = true;
          $("btnCopyDesc").disabled = true;
        }else{
          // Paste mode can still be used even with an empty queue
          refreshModeUi();
        }
        return;
      }

      for(const j of jobs){
        const label = [j.title || (uiLang==="de" ? "Ohne Titel" : "Untitled"), j.company_name || (uiLang==="de" ? "Firma" : "Company")].filter(Boolean).join(" · ");
        const opt = document.createElement("option");
        opt.value = String(j.id);
        opt.textContent = label;
        sel.appendChild(opt);
      }

      const urlJobId = (qs("job_id") || "").trim();
      const storedJobId = (localStorage.getItem("cvstudio_selected_job_id") || "").trim();
      const preferred = urlJobId || storedJobId;

      if(preferred && jobs.some(j => String(j.id) === String(preferred))){
        sel.value = preferred;
      } else {
        sel.value = String(jobs[0].id);
      }

      await onJobChange();
    }

    async function onJobChange(){
      const jobId = $("jobSelect").value;
      selectedJob = jobs.find(j => String(j.id) === String(jobId)) || null;

      // If user is in paste mode, keep the queue selection in memory but don't change UI state.
      if(jobSource !== "queue"){
        return;
      }

      if(!selectedJob){
        setText("jobMeta", "");
        $("btnGenerate").disabled = true;
        $("btnGenerateAgain").disabled = true;
        $("btnViewDesc").disabled = true;
        $("btnCopyDesc").disabled = true;
        return;
      }

      try{ localStorage.setItem("cvstudio_selected_job_id", String(selectedJob.id)); }catch{}

      const meta = [
        selectedJob.company_name ? String(selectedJob.company_name) : null,
        formatLoc(selectedJob) || null
      ].filter(Boolean).join(" · ");

      setText("jobHint", (uiLang==="de" ? "Ausgewählt: " : "Selected: ") + (selectedJob.title || (uiLang==="de" ? "Job" : "Job")));
      setText("jobMeta", meta ? meta : "");

      $("btnGenerate").disabled = false;
      $("btnGenerateAgain").disabled = false;
      $("btnViewDesc").disabled = false;
      $("btnCopyDesc").disabled = false;

      // Restore last from localStorage for this job (best effort)
      try{
        const key = "cvstudio_last_" + String(selectedJob.id);
        const raw = localStorage.getItem(key);
        if(raw){
          const obj = JSON.parse(raw);
          if(obj && (obj.cv_doc || obj.cv_text)){
            cvSectionPrefs = normalizeCvSectionPrefs(obj.sections || cvSectionPrefs || readCvSectionPrefs(obj.cv_doc || lastCvDoc), obj.cv_doc || lastCvDoc);
            cvFontTheme = normalizeCvFontTheme(obj.font || cvFontTheme || readCvFontTheme());
            writeCvFontTheme();
            applyCvFontUi();
            writeCvSectionPrefs();
            lastUsed = Array.isArray(obj.used) ? obj.used : [];
            lastMissing = Array.isArray(obj.missing) ? obj.missing : [];
            atsKeywordsAll = Array.isArray(obj.all) ? obj.all : Array.from(new Set([...(lastUsed||[]), ...(lastMissing||[])]));

            renderKeywords();

            setCvOutput({ text: obj.cv_text || "", doc: obj.cv_doc || null, lang: obj.lang || obj.language || "en" });
            setBadge("outStatus","good", uiLang==="de" ? "Bereit" : "Ready");
            setText("outModel","Model: —");
            setText("outHint", uiLang==="de"
              ? "Letzten angepassten CV von diesem Gerät geladen. Passe erneut an, wenn du ein frisches Ergebnis willst."
              : "Loaded your last tailored CV from this device. Tailor again if you want a fresh result."
            );

            baseSnapshot = snapshotCurrent();
            historyStack = [];
            updateUndoResetButtons();
          }
        }
      }catch(_){}

      try{ updateSourceChip(); }catch(_){}
    }

    function buildTailorPayload(){
      // IMPORTANT: keep payload minimal to avoid breaking strict backends
      const tpl = String($("tplSelect").value || "professional").trim().toLowerCase();
      const s = strengthValue();
      return { job_id: String(selectedJob?.id || ""), template: tpl, strength: s.key };
    }

    /* -------------------------
       Generate
       ------------------------- */
    async function generate(){
      showError("");

      // If an auto-start timer is pending, stop it (avoid double-run).
      try{ clearAutoStartTimer(); showAutoStartBar(false); }catch(_){ }

      try{ setGuidedSettingsGlow(false); }catch(_){ }



      if(jobSource === "paste"){
        await generateFromPaste();
        return;
      }

      if(!selectedJob){
        showError(t("pickJob"));
        return;
      }

      if(blockCvGenerationIfNeeded()) return;

      // Leaving Step 1 gate (if active) opens the full studio view
      exitGate();

      setSetupCollapsed(true, { persist:false });
      openGenModal(true);
      markSteps("running");
      setBadge("outStatus", "warn", uiLang==="de" ? "Passe an…" : "Tailoring…");
      setText("outHint", uiLang==="de" ? "Wir gleichen deinen CV mit dem Job ab und bereiten eine ATS-freundliche Version vor…" : "We’re matching your CV to the job and preparing an ATS-friendly version…");
      setText("debugBox", "—");
      setBadge("pipeBadge", "warn", uiLang==="de" ? "Arbeite…" : "Working…");

      $("btnGenerate").disabled = true;
      $("btnGenerateAgain").disabled = true;

      try{
        const payload = buildTailorPayload();

        // Prime job-description cache (reduces first-run delays when coming from Jobs)
        try{
          await apiGet("/me/jobs/description?job_id=" + encodeURIComponent(String(payload.job_id)), { timeoutMs: 90000 });
        }catch(_){ /* best effort */ }

        const res = await apiPostJson("/me/cv/tailor", payload);

        if(!res || res.ok !== true){
          throw new Error(res?.error || "CV tailoring failed");
        }

        const r = res.result || {};
        const text = String(r.cv_text || "").trim();
        const doc = r.cv_doc || null;
        const lang = r.language || "en";

        lastUsed = Array.isArray(r.ats_keywords_used) ? r.ats_keywords_used : [];
        lastMissing = Array.isArray(r.ats_keywords_missing) ? r.ats_keywords_missing : [];
        atsKeywordsAll = Array.from(new Set([...(lastUsed||[]), ...(lastMissing||[])].map(x=>String(x||"").trim()).filter(Boolean)));

        lastDebug = {
          cached: !!res.cached,
          cache_age_seconds: res.cache_age_seconds ?? null,
          model: r.model || null,
          prompt_version: r.prompt_version || null,
          language: lang || null,
          desc_cache_status: r.desc_cache_status || null,
          cv_clean_status: r.cv_clean_status || null,
          cv_clean_model: r.cv_clean_model || null,
          cv_structured_status: r.cv_structured_status || null,
          cv_structured_model: r.cv_structured_model || null
        };

        renderKeywords();
        setCvOutput({ text, doc, lang });

        // Reset edit history on each new generation
        baseSnapshot = snapshotCurrent();
        historyStack = [];
        updateUndoResetButtons();

        setBadge("outStatus", "good", res.cached ? (uiLang==="de" ? "Bereit" : "Ready") : (uiLang==="de" ? "Bereit" : "Ready"));
        setText("outModel", "Model: " + (r.model || "—"));
        setText("outHint", res.cached
          ? (uiLang==="de"
            ? "Dein angepasster CV ist bereit. Wenn du einen anderen Winkel testen willst, ändere die Intensität und passe ihn erneut an."
            : "Your tailored CV is ready. If you want a different angle, change the strength and tailor again.")
          : (uiLang==="de"
            ? "Dein angepasster CV ist bereit. Fuege echte fehlende Begriffe hinzu und exportiere dann."
            : "Your tailored CV is ready. Add any true missing terms, then export.")
        );
        markSteps("done");

        const lines = [
          "Job description: " + String(r.desc_cache_status || "—"),
          "CV clean: " + String(r.cv_clean_status || "—") + (r.cv_clean_model ? (" (" + r.cv_clean_model + ")") : ""),
          "CV structured: " + String(r.cv_structured_status || "—") + (r.cv_structured_model ? (" (" + r.cv_structured_model + ")") : ""),
          res.cached ? ("Cache: used (" + String(res.cache_age_seconds || "0") + "s old)") : "Cache: generated"
        ];
        $("pipeBox").textContent = lines.join("\n");
        setBadge("pipeBadge", "good", "OK");

        $("debugBox").textContent = JSON.stringify({ ok:true, ...lastDebug }, null, 2);

        // Save last output locally (best effort)
        try{
          const key = "cvstudio_last_" + String(payload.job_id);
          localStorage.setItem(key, JSON.stringify({
            at: Date.now(),
            payload,
            cv_text: $("cvText").value || "",
            cv_doc: lastCvDoc,
            lang: lastLang,
            used: lastUsed,
            missing: lastMissing,
            all: atsKeywordsAll,
            debug: lastDebug,
            sections: getCvSectionPrefsSnapshot(),
            font: normalizeCvFontTheme(cvFontTheme)
          }));
        }catch(_){}

        if(!res.cached){
          optimisticCvUsageIncrement();
          try{ setTimeout(() => { refreshCvStudioAccess().then(()=>{ try{ refreshModeUi(); }catch(_){ } }).catch(()=>{}); }, 0); }catch(_){}
        }
      }catch(e){
        const syncedQuota = syncCvAccessFromApiError(e);
        markSteps("error");
        setBadge("outStatus","bad", uiLang==="de" ? "Fehler" : "Failed");
        setBadge("pipeBadge","bad", uiLang==="de" ? "Fehler" : "Failed");
        showError(e?.message || String(e));
        $("debugBox").textContent = JSON.stringify({ ok:false, kind: e?.kind || null, timeoutMs: e?.timeoutMs || null, error: e?.message || String(e) }, null, 2);

        let hint = uiLang==="de"
          ? "Anpassen fehlgeschlagen. Prüfe CV-Upload und Jobbeschreibung."
          : "Tailoring failed. Check your CV upload and job description.";

        if(e && e.kind === "timeout"){
          hint = uiLang==="de"
            ? "Zeitüberschreitung. Der Server arbeitet eventuell noch - klicke „Erneut anpassen“, um das gecachte Ergebnis zu laden."
            : "Timed out. The server may still be finishing. Click “Tailor again” to fetch the cached result.";
        }else if(e && e.kind === "network"){
          hint = uiLang==="de"
            ? "Netzwerkfehler. Prüfe deine Verbindung (VPN/Ad-Blocker) und versuche es erneut."
            : "Network error. Check your connection (VPN/ad blockers) and try again.";
        }else if(syncedQuota && e && Number(e.status) === 402){
          hint = cvAccessBlockedMessage();
        }

        setText("outHint", hint);
      }finally{
        refreshModeUi();
      }
    }

    
    function isMissingEndpointError(e){
      const msg = String(e?.message || e || "");
      return /failed:\s*404\b/.test(msg) || /failed:\s*405\b/.test(msg);
    }

    function buildTailorFromTextPayload(){
      // keep payload minimal + explicit; backend should treat job_description as untrusted text
      const tpl = String($("tplSelect").value || "professional").trim().toLowerCase();
      const s = strengthValue();

      const job_title = String($("pasteTitle")?.value || "").trim();
      const company_name = String($("pasteCompany")?.value || "").trim();
      const apply_url = applyUrlSafe(String($("pasteApply")?.value || "").trim());
      const language_hint = String($("pasteLangHint")?.value || "auto").trim().toLowerCase();
      const job_description = getPasteDesc();

      return {
        template: tpl,
        strength: s.key,
        job_title,
        company_name,
        apply_url,
        language_hint,
        job_description
      };
    }

    async function generateFromPaste(){
      showError("");

      const desc = getPasteDesc();

      if(desc.length > 20000){
        showError(t("pasteTooLong"));
        return;
      }
      if(desc.length < 120){
        // We allow small texts in UI, but tailoring quality drops sharply below this.
        showError(t("pasteTooShort"));
        return;
      }

      if(blockCvGenerationIfNeeded()) return;

      // Leaving Step 1 gate (if active) opens the full studio view
      exitGate();

      setSetupCollapsed(true, { persist:false });
      openGenModal(true);
      markSteps("running");
      setBadge("outStatus", "warn", uiLang==="de" ? "Passe an…" : "Tailoring…");
      setText("outHint", uiLang==="de" ? "Wir gleichen deinen CV mit dem Job ab und bereiten eine ATS-freundliche Version vor…" : "We’re matching your CV to the job and preparing an ATS-friendly version…");
      setText("debugBox", "—");
      setBadge("pipeBadge", "warn", uiLang==="de" ? "Arbeite…" : "Working…");

      $("btnGenerate").disabled = true;
      $("btnGenerateAgain").disabled = true;

      try{
        const payload = buildTailorFromTextPayload();

        // Try common endpoint names (so you can roll this out without changing the frontend again)
        const endpoints = [
          "/me/cv/tailor_from_text",
          "/me/cv/tailor-from-text",
          "/me/cv/tailor_text"
        ];

        let res = null;
        let usedEndpoint = null;

        for(const ep of endpoints){
          try{
            res = await apiPostJson(ep, payload);
            usedEndpoint = ep;
            break;
          }catch(e){
            if(isMissingEndpointError(e)) continue;
            throw e;
          }
        }

        // Optional fallback: create a temporary job on the backend, then call the existing tailor endpoint.
        // Implement one of these endpoints if you prefer that architecture.
        if(!res){
          const createEndpoints = [
            "/me/jobs/create_from_text",
            "/me/jobs/import_text",
            "/me/jobs/create_from_desc",
            "/me/jobs/create_from_description"
          ];

          const createPayload = {
            title: payload.job_title || "Pasted job",
            company_name: payload.company_name || "",
            apply_url: payload.apply_url || "",
            description: payload.job_description,
            language_hint: payload.language_hint || "auto",
            source: "pasted"
          };

          for(const ep of createEndpoints){
            try{
              const r0 = await apiPostJson(ep, createPayload);
              const tmpJobId = r0?.job_id || r0?.id || r0?.data?.id || r0?.job?.id || r0?.result?.job_id || null;
              if(tmpJobId){
                usedEndpoint = ep + " + /me/cv/tailor";
                res = await apiPostJson("/me/cv/tailor", { job_id: String(tmpJobId), template: payload.template, strength: payload.strength });
                break;
              }
            }catch(e){
              if(isMissingEndpointError(e)) continue;
              throw e;
            }
          }
        }

        if(!res){
          throw new Error(t("pasteNotSupported"));
        }

        if(!res || res.ok !== true){
          throw new Error(res?.error || "CV tailoring failed");
        }

        const r = res.result || {};
        const text = String(r.cv_text || "").trim();
        const doc = r.cv_doc || null;
        const lang = r.language || payload.language_hint || "en";

        lastUsed = Array.isArray(r.ats_keywords_used) ? r.ats_keywords_used : [];
        lastMissing = Array.isArray(r.ats_keywords_missing) ? r.ats_keywords_missing : [];
        atsKeywordsAll = Array.from(new Set([...(lastUsed||[]), ...(lastMissing||[])].map(x=>String(x||"").trim()).filter(Boolean)));

        lastDebug = {
          cached: !!res.cached,
          cache_age_seconds: res.cache_age_seconds ?? null,
          model: r.model || null,
          prompt_version: r.prompt_version || null,
          language: lang || null,
          job_source: "paste",
          tailor_endpoint: usedEndpoint || "unknown",
          desc_cache_status: r.desc_cache_status || "pasted",
          cv_clean_status: r.cv_clean_status || null,
          cv_clean_model: r.cv_clean_model || null,
          cv_structured_status: r.cv_structured_status || null,
          cv_structured_model: r.cv_structured_model || null
        };

        renderKeywords();
        setCvOutput({ text, doc, lang });

        // Reset edit history on each new generation
        baseSnapshot = snapshotCurrent();
        historyStack = [];
        updateUndoResetButtons();

        setBadge("outStatus", "good", res.cached ? (uiLang==="de" ? "Bereit" : "Ready") : (uiLang==="de" ? "Bereit" : "Ready"));
        setText("outModel", "Model: " + (r.model || "—"));
        setText("outHint", res.cached
          ? (uiLang==="de"
            ? "Dein angepasster CV ist bereit. Wenn du einen anderen Winkel testen willst, ändere die Intensität und passe ihn erneut an."
            : "Your tailored CV is ready. If you want a different angle, change the strength and tailor again.")
          : (uiLang==="de"
            ? "Dein angepasster CV ist bereit. Fuege echte fehlende Begriffe hinzu und exportiere dann."
            : "Your tailored CV is ready. Add any true missing terms, then export.")
        );
        markSteps("done");

        const lines = [
          "Job description: pasted",
          "Tailor endpoint: " + String(usedEndpoint || "—"),
          "CV clean: " + String(r.cv_clean_status || "—") + (r.cv_clean_model ? (" (" + r.cv_clean_model + ")") : ""),
          "CV structured: " + String(r.cv_structured_status || "—") + (r.cv_structured_model ? (" (" + r.cv_structured_model + ")") : ""),
          res.cached ? ("Cache: used (" + String(res.cache_age_seconds || "0") + "s old)") : "Cache: generated"
        ];
        $("pipeBox").textContent = lines.join("\n");
        setBadge("pipeBadge", "good", "OK");

        $("debugBox").textContent = JSON.stringify({ ok:true, ...lastDebug }, null, 2);

        // Save last output locally (best effort)
        try{
          const key = pasteCacheKey || ("cvstudio_last_paste_" + fnv1a(desc));
          localStorage.setItem(key, JSON.stringify({
            at: Date.now(),
            payload,
            cv_text: $("cvText").value || "",
            cv_doc: lastCvDoc,
            lang: lastLang,
            used: lastUsed,
            missing: lastMissing,
            all: atsKeywordsAll,
            debug: lastDebug,
            sections: getCvSectionPrefsSnapshot(),
            font: normalizeCvFontTheme(cvFontTheme)
          }));
        }catch(_){}

        if(!res.cached){
          optimisticCvUsageIncrement();
          try{ setTimeout(() => { refreshCvStudioAccess().then(()=>{ try{ refreshModeUi(); }catch(_){ } }).catch(()=>{}); }, 0); }catch(_){}
        }
      }catch(e){
        const syncedQuota = syncCvAccessFromApiError(e);
        markSteps("error");
        setBadge("outStatus","bad", uiLang==="de" ? "Fehler" : "Failed");
        setBadge("pipeBadge","bad", uiLang==="de" ? "Fehler" : "Failed");
        showError(e?.message || String(e));
        $("debugBox").textContent = JSON.stringify({ ok:false, error: e?.message || String(e) }, null, 2);
        setText(
          "outHint",
          (syncedQuota && e && Number(e.status) === 402)
            ? cvAccessBlockedMessage()
            : (uiLang==="de" ? "Anpassen fehlgeschlagen. Prüfe die eingefügte Jobbeschreibung." : "Tailoring failed. Check the pasted job description.")
        );
      }finally{
        refreshModeUi();
      }
    }


    /* -------------------------
       Description modal
       ------------------------- */
    async function openDescModal(){
      showError("");

      const jm = getActiveJobMeta();

      if(jobSource === "queue" && !selectedJob){
        showError(t("pickJob"));
        return;
      }

      H.showModal("descModal");
      $("descH").textContent = jm.title || (uiLang==="de" ? "Jobbeschreibung" : "Job description");

      const loc = (jobSource === "queue" && selectedJob) ? formatLoc(selectedJob) : "";
      $("descMeta").textContent = [jm.company_name || "", loc].filter(Boolean).join(" · ");

      $("descText").textContent = uiLang==="de" ? "Lade…" : "Loading…";
      $("descOpen").setAttribute("href", "#");
      $("descCopy").textContent = t("copy");
      selectedDesc = "";
      selectedApplyUrl = applyUrlSafe(jm.apply_url);

      if(selectedApplyUrl){
        $("descOpen").setAttribute("href", selectedApplyUrl);
        $("descOpen").classList.remove("ghost");
      }else{
        $("descOpen").setAttribute("href", "#");
        $("descOpen").classList.add("ghost");
      }

      // Paste mode: show pasted text immediately (no API call)
      if(jobSource === "paste"){
        const txt = getPasteDesc();
        selectedDesc = txt || (uiLang==="de" ? "(Keine Beschreibung eingefügt.)" : "(No description pasted.)");
        $("descText").textContent = selectedDesc;
        return;
      }

      try{
        const resp = await apiGet("/me/jobs/description?job_id=" + encodeURIComponent(String(selectedJob.id)));
        const job = resp?.job || null;
        const txt = String(job?.description_full || job?.description || "").trim();
        selectedDesc = txt || (uiLang==="de" ? "(Keine Beschreibung verfügbar.)" : "(No description available.)");
        $("descText").textContent = selectedDesc;
      }catch(e){
        $("descText").textContent = (uiLang==="de" ? "Beschreibung konnte nicht geladen werden." : "Failed to load description.") + "\n\n" + (e?.message || String(e));
      }
    }


    async function copyTextToClipboard(txt){
      const text = String(txt || "");
      if(!text) return;
      try{
        await navigator.clipboard.writeText(text);
      }catch(_){
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try{ document.execCommand("copy"); }catch{}
        document.body.removeChild(ta);
      }
    }

    async function copyDesc(){
      if(jobSource === "paste"){
        const d = getPasteDesc();
        if(!d) return;
        await copyTextToClipboard(d);
        return;
      }

      if(!selectedDesc){
        await openDescModal();
        return;
      }
      await copyTextToClipboard(selectedDesc);
    }

    /* -------------------------
       Copy / Download / Print
       ------------------------- */
    async function copyCv(){
      const txt = $("cvText").value || "";
      if(!txt.trim()) return;
      await copyTextToClipboard(txt);
      $("btnCopy").textContent = t("copied");
      setTimeout(()=>{ $("btnCopy").textContent = t("copy"); }, 900);
    }

    function downloadTxt(){
      const txt = $("cvText").value || "";
      if(!txt.trim()) return;

      const jm = getActiveJobMeta();
      const title = (jm?.title ? String(jm.title).slice(0, 60) : "tailored_cv");
      const safe = title.replace(/[^a-z0-9\-\_ ]/gi, "").trim().replace(/\s+/g, "_") || "tailored_cv";
      const filename = safe + ".txt";

      const blob = new Blob([txt], { type:"text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function downloadBlobFile(blob, filename){
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => {
        try{ URL.revokeObjectURL(url); }catch(_){}
      }, 1500);
    }

    function buildCvFilename(ext){
      const jm = getActiveJobMeta();
      const name = String(lastCvDoc?.name || "").trim();
      const role = String(jm?.title || lastCvDoc?.target_role || "Tailored CV").trim();
      const company = String(jm?.company_name || "").trim();
      const base = [name, role, company]
        .filter(Boolean)
        .join(" - ")
        .replace(/[\\/:*?"<>|]+/g, " ")
        .replace(/\s+/g, " ")
        .trim() || "Tailored CV";
      return base + ext;
    }

    function setPdfExportLoading(isLoading){
      pdfExportLoading = !!isLoading;
      const btn = $("btnPrint");
      if(!btn) return;
      btn.disabled = !!isLoading || !hasGeneratedOutput();
      btn.textContent = isLoading ? t("printBusy") : t("print");
      btn.classList.toggle("isLoading", !!isLoading);
      btn.setAttribute("aria-busy", isLoading ? "true" : "false");
    }

    function normalizePdfText(text){
      return String(text || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\u00a0/g, " ")
        .replace(/[\u2018\u2019\u201a\u201b]/g, "'")
        .replace(/[\u201c\u201d\u201e]/g, "\"")
        .replace(/[\u2013\u2014\u2212]/g, "-")
        .replace(/\u2026/g, "...")
        .replace(/[\u2022\u25cf\u25e6]/g, "-");
    }

    function canPdfEncode(font, text){
      try{
        font.encodeText(String(text || ""));
        return true;
      }catch(_){
        return false;
      }
    }

    function sanitizePdfTextForFont(font, text){
      let out = normalizePdfText(text);
      if(canPdfEncode(font, out)) return out;
      try{
        out = out.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
      }catch(_){}
      if(canPdfEncode(font, out)) return out;
      out = out.replace(/[^\x20-\x7e\xa0-\xff\n]/g, "");
      if(canPdfEncode(font, out)) return out;
      return out.split("").map((ch) => canPdfEncode(font, ch) ? ch : "?").join("");
    }

    function splitPdfLongToken(font, size, token, maxWidth){
      const clean = sanitizePdfTextForFont(font, token);
      if(!clean) return [""];
      const parts = [];
      let chunk = "";
      for(const ch of clean){
        const next = chunk + ch;
        if(chunk && font.widthOfTextAtSize(next, size) > maxWidth){
          parts.push(chunk);
          chunk = ch;
        }else{
          chunk = next;
        }
      }
      if(chunk) parts.push(chunk);
      return parts.length ? parts : [clean];
    }

    function wrapPdfText(font, size, text, maxWidth){
      const clean = sanitizePdfTextForFont(font, text);
      const paragraphs = clean.split("\n");
      const lines = [];

      paragraphs.forEach((para, idx) => {
        const trimmed = para.trim();
        if(!trimmed){
          if(idx < paragraphs.length - 1) lines.push("");
          return;
        }

        const words = trimmed.split(/\s+/);
        let line = "";
        const flush = () => {
          if(line){
            lines.push(line);
            line = "";
          }
        };

        words.forEach((word) => {
          if(!word) return;
          if(font.widthOfTextAtSize(word, size) > maxWidth){
            flush();
            splitPdfLongToken(font, size, word, maxWidth).forEach((part) => {
              if(part) lines.push(part);
            });
            return;
          }
          const candidate = line ? (line + " " + word) : word;
          if(font.widthOfTextAtSize(candidate, size) <= maxWidth){
            line = candidate;
          }else{
            flush();
            line = word;
          }
        });

        flush();
        if(idx < paragraphs.length - 1) lines.push("");
      });

      return lines.length ? lines : [""];
    }

    function measurePdfTextBlock(font, size, text, maxWidth, lineHeight){
      const resolvedLineHeight = Number(lineHeight || (size * 1.35));
      const lines = wrapPdfText(font, size, text, maxWidth);
      return {
        lines,
        lineHeight: resolvedLineHeight,
        height: Math.max(resolvedLineHeight, lines.length * resolvedLineHeight)
      };
    }

    function drawPdfTextLinesAt(page, lines, opts){
      const font = opts.font;
      const size = Number(opts.size || 10);
      const x = Number(opts.x || 0);
      const topY = Number(opts.topY || 0);
      const lineHeight = Number(opts.lineHeight || (size * 1.35));
      const maxWidth = Number(opts.maxWidth || 0);
      const align = String(opts.align || "left");
      const color = opts.color;

      lines.forEach((line, idx) => {
        if(!line) return;
        const textWidth = font.widthOfTextAtSize(line, size);
        const drawX = (align === "right" && maxWidth)
          ? (x + Math.max(0, maxWidth - textWidth))
          : x;
        page.drawText(line, {
          x: drawX,
          y: topY - size - (idx * lineHeight),
          size,
          font,
          color
        });
      });
    }

    function createPdfComposer(pdfDoc){
      const composer = {
        pageWidth: 595.28,
        pageHeight: 841.89,
        margins: { top: 42, right: 42, bottom: 42, left: 42 },
        page: null,
        y: 0,
        addPage(){
          this.page = pdfDoc.addPage([this.pageWidth, this.pageHeight]);
          this.y = this.pageHeight - this.margins.top;
          return this.page;
        },
        ensure(spaceNeeded){
          if(this.y - spaceNeeded < this.margins.bottom){
            this.addPage();
          }
        }
      };
      composer.addPage();
      return composer;
    }

    async function embedPdfFontSet(pdfDoc, StandardFonts, rgb, theme = cvFontTheme){
      const family = normalizeCvFontTheme(theme) === "sans"
        ? {
            regular: StandardFonts.Helvetica,
            bold: StandardFonts.HelveticaBold,
            italic: StandardFonts.HelveticaOblique
          }
        : {
            regular: StandardFonts.TimesRoman,
            bold: StandardFonts.TimesRomanBold,
            italic: StandardFonts.TimesRomanItalic
          };
      return {
        regular: await pdfDoc.embedFont(family.regular),
        bold: await pdfDoc.embedFont(family.bold),
        italic: await pdfDoc.embedFont(family.italic),
        base: rgb(17/255, 19/255, 24/255),
        muted: rgb(97/255, 104/255, 114/255),
        rule: rgb(76/255, 82/255, 92/255)
      };
    }

    function drawPdfWrappedText(composer, text, opts){
      const font = opts.font;
      const size = Number(opts.size || 10);
      const x = Number(opts.x || composer.margins.left);
      const color = opts.color;
      const lineHeight = Number(opts.lineHeight || (size * 1.35));
      const maxWidth = Number(opts.maxWidth || (composer.pageWidth - composer.margins.right - x));
      const afterGap = Number(opts.afterGap || 0);
      const lines = wrapPdfText(font, size, text, maxWidth);
      const heightNeeded = Math.max(lineHeight, lines.length * lineHeight);

      composer.ensure(Math.min(heightNeeded, composer.pageHeight - composer.margins.top - composer.margins.bottom));
      lines.forEach((line) => {
        if(composer.y - lineHeight < composer.margins.bottom){
          composer.addPage();
        }
        if(line){
          const textWidth = font.widthOfTextAtSize(line, size);
          const drawX = String(opts.align || "left") === "right"
            ? (x + Math.max(0, maxWidth - textWidth))
            : x;
          composer.page.drawText(line, {
            x: drawX,
            y: composer.y - size,
            size,
            font,
            color
          });
        }
        composer.y -= lineHeight;
      });
      composer.y -= afterGap;
      return lines;
    }

    function drawPdfCenteredTextBlock(composer, text, opts){
      const font = opts.font;
      const size = Number(opts.size || 10);
      const x = Number(opts.x || composer.margins.left);
      const maxWidth = Number(opts.maxWidth || (composer.pageWidth - composer.margins.left - composer.margins.right));
      const lineHeight = Number(opts.lineHeight || (size * 1.35));
      const afterGap = Number(opts.afterGap || 0);
      const color = opts.color;
      const block = measurePdfTextBlock(font, size, text, maxWidth, lineHeight);

      composer.ensure(block.height);
      const topY = composer.y;
      block.lines.forEach((line, idx) => {
        if(!line) return;
        const textWidth = font.widthOfTextAtSize(line, size);
        composer.page.drawText(line, {
          x: x + Math.max(0, (maxWidth - textWidth) / 2),
          y: topY - size - (idx * lineHeight),
          size,
          font,
          color
        });
      });
      composer.y = topY - block.height - afterGap;
      return block.lines;
    }

    function drawPdfSectionTitle(composer, fonts, title){
      const label = sanitizePdfTextForFont(fonts.bold, String(title || ""));
      composer.ensure(28);
      composer.page.drawText(label, {
        x: composer.margins.left,
        y: composer.y - 10,
        size: 12.2,
        font: fonts.bold,
        color: fonts.base
      });
      composer.y -= 14;
      composer.page.drawLine({
        start: { x: composer.margins.left, y: composer.y },
        end: { x: composer.pageWidth - composer.margins.right, y: composer.y },
        thickness: 0.8,
        color: fonts.rule
      });
      composer.y -= 10;
    }

    function drawPdfBullet(composer, fonts, bulletText){
      const bulletX = composer.margins.left + 5.5;
      const textX = composer.margins.left + 17;
      const size = 10;
      const lineHeight = 13.6;
      const maxWidth = composer.pageWidth - composer.margins.right - textX;
      const block = measurePdfTextBlock(fonts.regular, size, bulletText, maxWidth, lineHeight);

      composer.ensure(Math.max(16, block.height + 2));
      const topY = composer.y;
      composer.page.drawCircle({
        x: bulletX,
        y: topY - (lineHeight * 0.5) + 0.4,
        size: 1.75,
        color: fonts.base
      });
      drawPdfTextLinesAt(composer.page, block.lines, {
        x: textX,
        topY,
        size,
        font: fonts.regular,
        color: fonts.base,
        lineHeight,
        maxWidth
      });
      composer.y = topY - block.height - 1;
    }

    function drawPdfExperienceItem(composer, fonts, itemData){
      const title = String(itemData?.title || "").trim();
      const sub = joinNonEmpty([itemData?.company, itemData?.location], ", ");
      const meta = joinNonEmpty([itemData?.start, itemData?.end], " – ");
      const bullets = asStringArr(itemData?.bullets, 20);

      const totalWidth = composer.pageWidth - composer.margins.left - composer.margins.right;
      const metaGap = meta ? 18 : 0;
      const metaMinWidth = meta ? 96 : 0;
      const metaMaxWidth = meta ? 140 : 0;
      let metaWidth = 0;
      let metaBlock = null;

      if(meta){
        const cleanMeta = sanitizePdfTextForFont(fonts.italic, meta);
        metaWidth = Math.min(metaMaxWidth, Math.max(metaMinWidth, fonts.italic.widthOfTextAtSize(cleanMeta, 9.4) + 2));
        metaBlock = measurePdfTextBlock(fonts.italic, 9.4, meta, metaWidth, 11.8);
      }

      const leftWidth = Math.max(180, totalWidth - metaWidth - metaGap);
      const titleBlock = title ? measurePdfTextBlock(fonts.bold, 11.2, title, leftWidth, 13.8) : null;
      const subBlock = sub ? measurePdfTextBlock(fonts.italic, 9.6, sub, leftWidth, 11.8) : null;
      const leftHeight = (titleBlock ? titleBlock.height : 0) + (subBlock ? subBlock.height : 0);
      const rowHeight = Math.max(leftHeight || 0, metaBlock ? metaBlock.height : 0, 13.8);

      composer.ensure(Math.max(32, rowHeight + 2));
      const topY = composer.y;
      if(titleBlock){
        drawPdfTextLinesAt(composer.page, titleBlock.lines, {
          x: composer.margins.left,
          topY,
          size: 11.2,
          font: fonts.bold,
          color: fonts.base,
          lineHeight: titleBlock.lineHeight,
          maxWidth: leftWidth
        });
      }
      if(subBlock){
        drawPdfTextLinesAt(composer.page, subBlock.lines, {
          x: composer.margins.left,
          topY: topY - (titleBlock ? titleBlock.height : 0),
          size: 9.6,
          font: fonts.italic,
          color: fonts.muted,
          lineHeight: subBlock.lineHeight,
          maxWidth: leftWidth
        });
      }
      if(metaBlock){
        drawPdfTextLinesAt(composer.page, metaBlock.lines, {
          x: composer.pageWidth - composer.margins.right - metaWidth,
          topY,
          size: 9.4,
          font: fonts.italic,
          color: fonts.muted,
          lineHeight: metaBlock.lineHeight,
          maxWidth: metaWidth,
          align: "right"
        });
      }

      composer.y = topY - rowHeight - 3;
      bullets.forEach((bullet) => drawPdfBullet(composer, fonts, bullet));
      composer.y -= 5;
    }

    async function buildStructuredPdfBytes(cvDoc, lang, jobTitle){
      const PDFLib = window.PDFLib;
      if(!PDFLib) throw new Error("pdf-lib missing");
      const { PDFDocument, StandardFonts, rgb } = PDFLib;
      const pdfDoc = await PDFDocument.create();
      const fonts = await embedPdfFontSet(pdfDoc, StandardFonts, rgb, cvFontTheme);
      const composer = createPdfComposer(pdfDoc);
      ensureDocHeader(cvDoc);
      const name = String(cvDoc?.name || "YOUR NAME").trim();
      const role = getHeaderRole(cvDoc, jobTitle || "Curriculum Vitae");
      const contact = cvDoc?.contact || {};
      const contactLine = formatHeaderContactLine([
        ["phone", contact.phone],
        ["email", contact.email],
        ["location", contact.location]
      ], cvDoc, "pdf");
      const contactLine2 = formatHeaderContactLine([
        ["linkedin", contact.linkedin],
        ["portfolio", contact.portfolio]
      ], cvDoc, "pdf");

      pdfDoc.setTitle(sanitizePdfTextForFont(fonts.bold, buildCvFilename(".pdf").replace(/\.pdf$/i, "")));
      pdfDoc.setProducer("jobmejob");
      pdfDoc.setCreator("jobmejob");

      drawPdfCenteredTextBlock(composer, name, {
        font: fonts.bold,
        size: 22,
        lineHeight: 25,
        color: fonts.base,
        x: composer.margins.left,
        maxWidth: composer.pageWidth - composer.margins.left - composer.margins.right,
        afterGap: 2
      });
      if(role){
        drawPdfCenteredTextBlock(composer, role, {
          font: fonts.regular,
          size: 10.6,
          lineHeight: 13,
          color: fonts.muted,
          x: composer.margins.left,
          maxWidth: composer.pageWidth - composer.margins.left - composer.margins.right,
          afterGap: 2
        });
      }
      if(contactLine){
        drawPdfCenteredTextBlock(composer, contactLine, {
          font: fonts.regular,
          size: 9.3,
          lineHeight: 11.3,
          color: fonts.muted,
          x: composer.margins.left,
          maxWidth: composer.pageWidth - composer.margins.left - composer.margins.right,
          afterGap: 2
        });
      }
      if(contactLine2){
        drawPdfCenteredTextBlock(composer, contactLine2, {
          font: fonts.regular,
          size: 9.3,
          lineHeight: 11.3,
          color: fonts.muted,
          x: composer.margins.left,
          maxWidth: composer.pageWidth - composer.margins.left - composer.margins.right,
          afterGap: 8
        });
      }else{
        composer.y -= 6;
      }

      getOrderedCvSections(cvDoc, lang).forEach((section) => {
        drawPdfSectionTitle(composer, fonts, section.title);
        if(section.kind === "paragraph"){
          (section.paragraphs || []).forEach((text) => {
            drawPdfWrappedText(composer, text, {
              font: fonts.regular,
              size: 10.3,
              lineHeight: 13.9,
              color: fonts.base,
              afterGap: 4
            });
          });
        }else if(section.kind === "experience"){
          (section.items || []).forEach((entry) => drawPdfExperienceItem(composer, fonts, entry));
        }else if(section.kind === "education"){
          (section.items || []).forEach((entry) => {
            drawPdfExperienceItem(composer, fonts, {
              title: joinNonEmpty([entry?.degree, entry?.field], " · "),
              company: entry?.school,
              location: entry?.location,
              start: entry?.start,
              end: entry?.end,
              bullets: entry?.bullets
            });
          });
        }else if(section.kind === "bullets"){
          (section.items || []).forEach((entry) => drawPdfBullet(composer, fonts, entry));
          composer.y -= 4;
        }else if(section.kind === "lines"){
          (section.items || []).forEach((entry) => {
            drawPdfWrappedText(composer, entry, {
              font: fonts.regular,
              size: 9.9,
              lineHeight: 13,
              color: fonts.base
            });
          });
          composer.y -= 4;
        }
      });

      return pdfDoc.save();
    }

    async function buildPlainTextPdfBytes(title, text){
      const PDFLib = window.PDFLib;
      if(!PDFLib) throw new Error("pdf-lib missing");
      const { PDFDocument, StandardFonts, rgb } = PDFLib;
      const pdfDoc = await PDFDocument.create();
      const theme = normalizeCvFontTheme(cvFontTheme) === "sans"
        ? { regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold }
        : { regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold };
      const regular = await pdfDoc.embedFont(theme.regular);
      const bold = await pdfDoc.embedFont(theme.bold);
      const composer = createPdfComposer(pdfDoc);
      const base = rgb(17/255, 19/255, 24/255);
      const muted = rgb(59/255, 63/255, 70/255);

      pdfDoc.setTitle(sanitizePdfTextForFont(bold, buildCvFilename(".pdf").replace(/\.pdf$/i, "")));
      pdfDoc.setProducer("jobmejob");
      pdfDoc.setCreator("jobmejob");

      drawPdfWrappedText(composer, title || "Curriculum Vitae", {
        font: bold,
        size: 18,
        lineHeight: 22,
        color: base,
        afterGap: 8
      });

      splitLines(String(text || "")).forEach((line) => {
        if(!String(line || "").trim()){
          composer.y -= 7;
          return;
        }
        drawPdfWrappedText(composer, line, {
          font: regular,
          size: 10.2,
          lineHeight: 13.6,
          color: /^[A-ZÄÖÜ0-9 .,&/-]{4,}$/.test(String(line || "").trim()) ? muted : base
        });
      });

      return pdfDoc.save();
    }

    function printPdfFallback(){
      const jm = getActiveJobMeta();
      const jobTitle = jm?.title ? String(jm.title) : "Curriculum Vitae";
      const useTextExport = !lastCvDoc || detectManualTextEdits();
      const html = (!useTextExport && lastCvDoc)
        ? cvDocToPrintableHtml(lastCvDoc, lastLang, jobTitle)
        : cvTextToPrintableHtml(jobTitle, $("cvText").value || "");
      printHtml(html);
    }

    async function exportPdf(){
      const jm = getActiveJobMeta();
      const jobTitle = jm?.title ? String(jm.title) : "Curriculum Vitae";
      const useTextExport = !lastCvDoc || detectManualTextEdits();

      setPdfExportLoading(true);
      showError("");
      try{
        if(!window.PDFLib){
          try{
            window.JobMeJobShared?.toast?.(t("printFallback"), { kind:"warn", title:"CV Studio" });
          }catch(_){}
          return printPdfFallback();
        }
        const bytes = useTextExport
          ? await buildPlainTextPdfBytes(jobTitle, $("cvText").value || "")
          : await buildStructuredPdfBytes(lastCvDoc, lastLang, jobTitle);
        downloadBlobFile(new Blob([bytes], { type:"application/pdf" }), buildCvFilename(".pdf"));
        try{
          window.JobMeJobShared?.toast?.(t("printDone"), { kind:"good", title:"CV Studio" });
        }catch(_){}
      }catch(e){
        console.error("PDF export failed", e);
        try{
          window.JobMeJobShared?.toast?.(t("printFailed"), { kind:"warn", title:"CV Studio" });
        }catch(_){}
        printPdfFallback();
      }finally{
        setPdfExportLoading(false);
      }
    }


    /* -------------------------
       Final QA (local checks)
       ------------------------- */
    function currentCvHash(){
      return String(hashString($("cvText").value || ""));
    }

    function qaIsUpToDate(){
      if(!qaLastHash) return false;
      return qaLastHash === currentCvHash();
    }

    function updateQaDot(){
      const dot = $("qaDot");
      const btn = $("btnQa");
      if(!dot || !btn) return;

      if(btn.disabled){
        dot.style.display = "none";
        return;
      }
      dot.style.display = "";

      const up = qaIsUpToDate();
      const hasRun = !!qaLastRunAt;

      dot.className = "miniBadgeDot " + (up ? "good" : (hasRun ? "warn" : "bad"));
      dot.title = up
        ? (uiLang==="de" ? "QA aktuell" : "QA up to date")
        : (hasRun ? (uiLang==="de" ? "QA veraltet" : "QA out of date") : (uiLang==="de" ? "QA noch nicht ausgeführt" : "QA not run yet"));

      // Mirror status into the Inspector AI Review panel (if visible)
      const rb = $("reviewBadge");
      if(rb){
        rb.className = "badge " + (up ? "good" : (hasRun ? "warn" : "bad"));
        rb.textContent = up
          ? (uiLang==="de" ? "Aktuell" : "Up to date")
          : (hasRun ? (uiLang==="de" ? "Veraltet" : "Out of date") : (uiLang==="de" ? "Nicht gestartet" : "Not run"));
      }
    }

    function openQaModal(action){
      qaPendingAction = action || "";
      $("qaSummary").textContent = uiLang==="de" ? "Prüfe…" : "Checking…";
      $("qaMeta").textContent = "—";
      $("qaChecks").innerHTML = "";
      $("qaFixes").innerHTML = "";

      const cont = $("qaContinue");
      if(cont){
	        if(qaPendingAction === "print"){
	          cont.style.display = "";
	          cont.textContent = uiLang==="de" ? "Weiter zu PDF-Export" : "Continue to Export PDF";
        }else if(qaPendingAction === "download"){
          cont.style.display = "";
          cont.textContent = uiLang==="de" ? "Weiter zu Download" : "Continue to Download";
        }else{
          cont.style.display = "none";
        }
      }

      H.showModal("qaModal");
      runQaCheck();
    }

    function closeQaModal(){
      H.hideModal("qaModal");
      qaPendingAction = "";
      const cont = $("qaContinue");
      if(cont) cont.style.display = "none";
    }

    function guessLangFromText(text){
      const t = String(text || "").toLowerCase();
      // very small, robust stopword heuristic
      const de = [" und "," der "," die "," das "," mit "," für "," von "," als "," auf "," im "," in "," bei "," nicht "," wird "," wurden "," durch "," sowie "," ich "];
      const en = [" and "," the "," with "," for "," from "," as "," on "," in "," at "," not "," through "," including "," led "," built "," managed "];
      let deScore = 0, enScore = 0;
      de.forEach(w => { deScore += (t.split(w).length - 1); });
      en.forEach(w => { enScore += (t.split(w).length - 1); });
      if(deScore === 0 && enScore === 0) return "";
      if(deScore > enScore * 1.25) return "de";
      if(enScore > deScore * 1.25) return "en";
      return ""; // mixed/unclear
    }

    function qaComputeReport(){
      const text = String($("cvText").value || "");
      const doc = lastCvDoc || null;
      const targetLang = (lastLang || "").trim() || guessLangFromText(text) || "en";

      const checks = [];
      const fixes = [];

      function add(level, title, desc, fixId, fixLabel){
        checks.push({ level, title, desc: desc || "" });
        if(fixId){
          fixes.push({ fixId, title: fixLabel || title, desc: desc || "" });
        }
      }

      // 1) Basic presence
      const hasEmail = !!(doc?.contact?.email) || /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text);
      if(!hasEmail){
        add("fix",
          uiLang==="de" ? "E-Mail fehlt" : "Email missing",
          uiLang==="de" ? "Füge eine E-Mail-Adresse hinzu. Ohne E-Mail ist die Bewerbung oft unvollständig." : "Add an email address. Without it, applications are often considered incomplete."
        );
      }else{
        add("pass",
          uiLang==="de" ? "Kontakt: E-Mail vorhanden" : "Contact: email present",
          uiLang==="de" ? "OK" : "OK"
        );
      }

      const hasExp = Array.isArray(doc?.experience) ? doc.experience.length > 0 : (text.toLowerCase().includes("experience") || text.toLowerCase().includes("erfahrung"));
      if(!hasExp){
        add("fix",
          uiLang==="de" ? "Erfahrung fehlt" : "Experience section missing",
          uiLang==="de" ? "Mindestens eine Station in EXPERIENCE/ERFAHRUNG ist nötig." : "You need at least one role in the EXPERIENCE section."
        );
      }else{
        add("pass",
          uiLang==="de" ? "Erfahrung vorhanden" : "Experience present",
          uiLang==="de" ? "OK" : "OK"
        );
      }

      // 2) Location sanity + common typo
      const loc = String(doc?.contact?.location || "");
      if(!loc && !/\b(Berlin|Germany|Deutschland|München|Hamburg|Köln|Frankfurt|Düsseldorf)\b/i.test(text)){
        add("warn",
          uiLang==="de" ? "Standort fehlt" : "Location missing",
          uiLang==="de" ? "Ein Standort erhöht Vertrauen und hilft beim Matching." : "A location improves trust and helps matching."
        );
      }
      if(/\bBelin\b/i.test(loc) || /\bBelin\b/i.test(text)){
        add("fix",
          uiLang==="de" ? "Tippfehler im Standort" : "Location typo detected",
          uiLang==="de" ? "„Belin“ sieht wie ein Tippfehler aus (meist „Berlin“)." : "“Belin” looks like a typo (usually “Berlin”).",
          "fix_location_berlin",
          uiLang==="de" ? "Belin → Berlin korrigieren" : "Fix Belin → Berlin"
        );
      }

      // 3) Language consistency
      const guess = guessLangFromText(text);
      if(guess && targetLang && guess !== targetLang){
        add("warn",
          uiLang==="de" ? "Sprache wirkt gemischt" : "Language may be mixed",
          uiLang==="de"
            ? ("Der Text wirkt eher " + (guess==="de" ? "Deutsch" : "Englisch") + ", aber das CV ist als " + (targetLang==="de" ? "Deutsch" : "Englisch") + " markiert.")
            : ("The text looks more " + (guess==="de" ? "German" : "English") + ", but the CV is marked as " + (targetLang==="de" ? "German" : "English") + ".")
        );
      }

      // 4) Bullet quality checks (if doc exists)
      if(doc && Array.isArray(doc.experience)){
        const longBullets = [];
        const allBullets = [];
        doc.experience.forEach((e, ei) => {
          const bullets = asStringArr(e?.bullets, 80);
          bullets.forEach((b, bi) => {
            const bb = String(b||"").trim();
            if(!bb) return;
            allBullets.push({ bb, ei, bi, title: e?.title || "" });
            const wc = bb.split(/\s+/).filter(Boolean).length;
            if(wc > 28 || bb.length > 220){
              longBullets.push({ bb, wc, ei, bi, title: e?.title || "" });
            }
          });
        });

        if(longBullets.length){
          const ex = longBullets.slice(0,2).map(x => `- ${x.title}: ${x.bb}`).join("\n");
          add("warn",
            uiLang==="de" ? "Zu lange Bullets" : "Bullets may be too long",
            uiLang==="de"
              ? ("Einige Bullets sind sehr lang. Kürzer = besser für ATS und Leser. Beispiele:\n" + ex)
              : ("Some bullets are very long. Shorter is better for ATS and readability. Examples:\n" + ex)
          );
        }else{
          add("pass",
            uiLang==="de" ? "Bullet-Länge ok" : "Bullet length OK",
            uiLang==="de" ? "OK" : "OK"
          );
        }

        // duplicates
        const seen = new Map();
        const dups = [];
        allBullets.forEach(x => {
          const key = normForMatch(x.bb).replace(/\d+/g,"#");
          if(!key) return;
          if(seen.has(key)){
            dups.push([seen.get(key), x]);
          }else{
            seen.set(key, x);
          }
        });
        if(dups.length){
          add("warn",
            uiLang==="de" ? "Doppelte Bullets" : "Duplicate bullets",
            uiLang==="de"
              ? ("Einige Bullets sind doppelt/nahezu gleich. Das wirkt repetitiv (ATS + Recruiter).")
              : ("Some bullets are duplicated or very similar. This looks repetitive (ATS + recruiter).")
          );
        }else{
          add("pass",
            uiLang==="de" ? "Keine Duplikate gefunden" : "No duplicates found",
            uiLang==="de" ? "OK" : "OK"
          );
        }

        // metrics
        const metricCount = allBullets.filter(x => /\d/.test(x.bb)).length;
        if(metricCount === 0){
          add("warn",
            uiLang==="de" ? "Wenig messbare Ergebnisse" : "Few measurable outcomes",
            uiLang==="de"
              ? "Keine Zahlen/Prozente gefunden. 1–3 messbare Ergebnisse erhöhen Glaubwürdigkeit."
              : "No numbers/percentages found. 1–3 measurable outcomes improve credibility."
          );
        }else{
          add("pass",
            uiLang==="de" ? "Ergebnisse mit Zahlen vorhanden" : "Metrics found",
            uiLang==="de" ? "OK" : "OK"
          );
        }

        // punctuation consistency (simple)
        const endPeriod = allBullets.filter(x => /[\.!?]$/.test(x.bb)).length;
        const ratio = allBullets.length ? (endPeriod / allBullets.length) : 0;
        if(allBullets.length >= 6 && ratio > 0.15 && ratio < 0.85){
          add("warn",
            uiLang==="de" ? "Punktuation inkonsistent" : "Punctuation inconsistent",
            uiLang==="de"
              ? "Einige Bullets enden mit Punkt, andere nicht. Einheitlich wirkt professioneller."
              : "Some bullets end with a period, others don’t. Consistency looks more professional.",
            "fix_bullet_punct",
            uiLang==="de" ? "Bullets ohne Punkt am Ende" : "Remove trailing periods"
          );
        }
      }

      // 5) Keyword coverage (from latest tailor call, if available)
      const miss = Array.isArray(lastMissing) ? lastMissing : [];
      if(miss.length){
        add("warn",
          uiLang==="de" ? "Fehlende Keywords" : "Missing keywords",
          uiLang==="de"
            ? ("Noch " + miss.length + " Keywords fehlen. Nutze den Keyword Booster, wenn sie wirklich zutreffen.")
            : (miss.length + " keywords are still missing. Use the Keyword Booster if they are true.")
        );
      }else if(lastUsed && Array.isArray(lastUsed)){
        add("pass",
          uiLang==="de" ? "Keywords abgedeckt" : "Keywords covered",
          uiLang==="de" ? "OK" : "OK"
        );
      }

      // Determine status
      const fixCount = checks.filter(c => c.level === "fix").length;
      const warnCount = checks.filter(c => c.level === "warn").length;
      const passCount = checks.filter(c => c.level === "pass").length;

      const status = fixCount ? "needs_fixes" : (warnCount ? "good_with_warnings" : "ready");
      return { status, targetLang, fixCount, warnCount, passCount, checks, fixes };
    }

    function renderQaReport(rep){
      if(!rep){ return; }

      const statusLine = (rep.status === "ready")
        ? (uiLang==="de" ? "Sieht gut aus – bereit zum Versand." : "Looks good — ready to send.")
        : (rep.status === "good_with_warnings")
          ? (uiLang==="de" ? "Gut – mit ein paar Verbesserungen." : "Good — with a few improvements.")
          : (uiLang==="de" ? "Bitte zuerst die wichtigsten Punkte fixen." : "Please fix the most important issues first.");

      $("qaSummary").textContent = statusLine;
      $("qaMeta").textContent = (uiLang==="de"
        ? (`Checks: ${rep.passCount} ok · ${rep.warnCount} Hinweise · ${rep.fixCount} Fixes · Sprache: ${rep.targetLang}`)
        : (`Checks: ${rep.passCount} ok · ${rep.warnCount} warnings · ${rep.fixCount} fixes · Language: ${rep.targetLang}`)
      );

      const checksEl = $("qaChecks");
      checksEl.innerHTML = rep.checks.map(c => {
        const tag = (c.level === "pass") ? (uiLang==="de" ? "OK" : "OK") : (c.level === "warn" ? (uiLang==="de" ? "Hinweis" : "Warning") : (uiLang==="de" ? "Fix" : "Fix"));
        const tagCls = (c.level === "pass") ? "good" : (c.level === "warn" ? "warn" : "bad");
        return `
          <div class="qaItem">
            <div class="qaHead">
              <div class="qaTitle">${H.escapeHtml(String(c.title||""))}</div>
              <span class="qaTag ${tagCls}">${H.escapeHtml(tag)}</span>
            </div>
            <div class="qaDesc">${H.escapeHtml(String(c.desc||""))}</div>
          </div>
        `;
      }).join("");

      const fixesEl = $("qaFixes");
      if(!rep.fixes.length){
        fixesEl.innerHTML = `<div class="qaItem"><div class="qaDesc">${uiLang==="de" ? "Keine Quick Fixes verfügbar." : "No quick fixes available."}</div></div>`;
      }else{
        fixesEl.innerHTML = rep.fixes.map(f => {
          return `
            <div class="qaItem">
              <div class="qaHead">
                <div class="qaTitle">${H.escapeHtml(String(f.title||""))}</div>
                <span class="qaTag warn">${uiLang==="de" ? "Quick Fix" : "Quick fix"}</span>
              </div>
              <div class="qaDesc">${H.escapeHtml(String(f.desc||""))}</div>
              <div class="qaActionsRow">
                <button class="btn small" type="button" data-fix="${H.escapeHtml(String(f.fixId||""))}">${uiLang==="de" ? "Anwenden" : "Apply"}</button>
              </div>
            </div>
          `;
        }).join("");
      }
    }

    function runQaCheck(){
      try{
        const rep = qaComputeReport();
        qaLastReport = rep;
        qaLastRunAt = Date.now();
        qaLastHash = currentCvHash();
        renderQaReport(rep);
        updateQaDot();
      }catch(e){
        $("qaSummary").textContent = (uiLang==="de" ? "QA fehlgeschlagen: " : "QA failed: ") + (e?.message || String(e));
        $("qaMeta").textContent = "—";
      }
    }

    function applyQaFix(fixId){
      if(!fixId) return;

      // Make sure Undo can bring us back
      try{ snapshotCurrent("QA fix: " + fixId); }catch(_){ }

      const txt0 = String($("cvText").value || "");
      let txt = txt0;

      if(fixId === "fix_location_berlin"){
        // Fix "Belin" typo in both structured doc (if any) and raw text
        try{
          if(lastCvDoc?.contact?.location){
            lastCvDoc.contact.location = String(lastCvDoc.contact.location).replace(/\bBelin\b/gi, "Berlin");
          }
        }catch(_){}
        txt = txt.replace(/\bBelin\b/gi, "Berlin");
      }

      if(fixId === "fix_bullet_punct"){
        // Remove trailing periods from bullets (simple heuristic)
        try{
          if(lastCvDoc && Array.isArray(lastCvDoc.experience)){
            lastCvDoc.experience = lastCvDoc.experience.map(e => {
              const bullets = asStringArr(e?.bullets, 80).map(b => String(b||"").replace(/[\s]*\.[\s]*$/,"").trim());
              return Object.assign({}, e, { bullets });
            });
          }
        }catch(_){}
        txt = txt.split("\n").map(line => {
          if(!/^\s*[-•]\s+/.test(line)) return line;
          return line.replace(/[\s]*\.[\s]*$/,"");
        }).join("\n");
      }

      if(txt !== txt0){
        $("cvText").value = txt;
        // If we have a structured doc, regenerate text from it for consistency
        try{
          if(lastCvDoc){
            $("cvText").value = cvDocToText(lastCvDoc, lastLang);
          }
        }catch(_){}
        recomputeCoverageFromCurrentText();
        if($("tabChanges")?.classList?.contains("active")){ try{ renderChangesView(); }catch(_){ } }
      }

      // QA needs rerun after changes
      try{ qaLastHash = ""; updateQaDot(); }catch(_){ }
      runQaCheck();
    }

    function onExportClick(kind){
      // If QA is not up to date, run it first and show results
      if(!qaIsUpToDate()){
        openQaModal(kind);
        return;
      }
      if(kind === "print") return exportPdf();
      if(kind === "download") return downloadTxt();
    }

    async function copyMissing(){
      const miss = Array.isArray(lastMissing) ? lastMissing : [];
      if(!miss.length) return;
      const text = miss.map(k => prettyKeyword(k,lastLang)).join(", ");
      await copyTextToClipboard(text);
      $("btnCopyMissing").textContent = t("copied");
      setTimeout(()=>{ $("btnCopyMissing").textContent = t("copyMissing"); }, 900);
    }

	    /* -------------------------
	       Keyword booster (modal)
	       ------------------------- */
	    function isKwAdvancedOpen(){
	      try{ return !!$("kwAdvancedDetails")?.open; }catch(_){ return false; }
	    }

	    function setKwMode(mode){
	      kwMode = mode === "quick" ? "quick" : "ai";
	      const btns = $("kwModeToggle").querySelectorAll("button");
	      btns.forEach(b => b.classList.toggle("active", b.getAttribute("data-mode") === kwMode));

      // Show/hide AI recommendation box
      const recoBox = $("kwAiRecoBox");
      if(recoBox) recoBox.style.display = (kwMode === "ai") ? "" : "none";

      // If user switches to AI while modal is open, refresh recommendation (non-blocking)
	      if(kwMode === "ai" && activeKeywordRaw && lastCvDoc && isKwAdvancedOpen()){
	        const ready = (($("kwSkillGroup")?.options?.length || 0) > 0) || (($("kwExpRole")?.options?.length || 0) > 0);
	        if(ready){
	          try{ aiRecommendPlacement({ force:false, source:"mode" }); }catch(_){}
	        }
      }

      try{ resetKwRewriteVariants(); updateKwRewriteUi(); }catch(_){ }
      updateKwPreview();
    }

    function chosenKwLang(){
      const v = String($("kwLang").value || "auto");
      if(v === "de" || v === "en") return v;
      // auto
      return isLikelyGerman(lastLang) ? "de" : "en";
    }

    function fillSkillGroups(){
      const sel = $("kwSkillGroup");
      sel.innerHTML = "";
      const groups = Array.isArray(lastCvDoc?.skills?.groups) ? lastCvDoc.skills.groups : [];
      groups.forEach((g, idx) => {
        const label = String(g?.label || "").trim() || (uiLang==="de" ? ("Gruppe " + (idx+1)) : ("Group " + (idx+1)));
        const opt = document.createElement("option");
        opt.value = "group:" + idx;
        opt.textContent = label;
        sel.appendChild(opt);
      });
      // additional bucket
      const opt2 = document.createElement("option");
      opt2.value = "additional";
      opt2.textContent = uiLang==="de" ? "Weitere Skills" : "Additional skills";
      sel.appendChild(opt2);

      if(sel.options.length) sel.value = sel.options[0].value;
    }

    function fillExperienceRoles(){
      const sel = $("kwExpRole");
      sel.innerHTML = "";
      const exp = Array.isArray(lastCvDoc?.experience) ? lastCvDoc.experience : [];
      exp.forEach((e, idx) => {
        const title = joinNonEmpty([e?.title, e?.company], " · ") || (uiLang==="de" ? ("Station " + (idx+1)) : ("Role " + (idx+1)));
        const opt = document.createElement("option");
        opt.value = String(idx);
        opt.textContent = title;
        sel.appendChild(opt);
      });
      if(sel.options.length) sel.value = "0";
      fillBulletsForSelectedRole();
    }

    function fillBulletsForSelectedRole(){
      const expIdx = Number($("kwExpRole").value || "0");
      const e = (Array.isArray(lastCvDoc?.experience) ? lastCvDoc.experience : [])[expIdx] || null;
      const bullets = asStringArr(e?.bullets, 50);

      const sel = $("kwExpBullet");
      sel.innerHTML = "";
      bullets.forEach((b, idx) => {
        const opt = document.createElement("option");
        opt.value = String(idx);
        opt.textContent = (String(b).length > 70 ? (String(b).slice(0,70) + "…") : String(b));
        sel.appendChild(opt);
      });

      if(sel.options.length){
        sel.value = "0";
        $("kwBulletPreview").textContent = bullets[0] || "—";
      }else{
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = uiLang==="de" ? "Keine Bullets vorhanden" : "No bullets available";
        sel.appendChild(opt);
        $("kwBulletPreview").textContent = uiLang==="de" ? "Diese Station hat noch keine Bullets." : "This role has no bullets.";
      }
    }

    function isKwInlineOpen(){
      return kwSurface === "inline" && !!activeKeywordRaw;
    }

    function getKwSelectedBullet(){
      return {
        expIdx: Number($("kwExpRole")?.value || "0"),
        bulletIdx: Number($("kwExpBullet")?.value || "0")
      };
    }

    function setKwSelectedBullet(expIdx, bulletIdx){
      if(!$("kwExpRole") || !$("kwExpBullet")) return;

      $("kwTarget").value = "experience";
      $("kwExpHow").value = "rewrite";
      updateKwTargetUi();
      updateKwExpHowUi();

      if($("kwExpRole") && [...$("kwExpRole").options].some(o => o.value === String(expIdx))){
        $("kwExpRole").value = String(expIdx);
      }
      fillBulletsForSelectedRole();

      if($("kwExpBullet") && [...$("kwExpBullet").options].some(o => o.value === String(bulletIdx))){
        $("kwExpBullet").value = String(bulletIdx);
      }else if($("kwExpBullet")?.options?.length){
        $("kwExpBullet").value = $("kwExpBullet").options[0].value;
      }

      const currentExp = Number($("kwExpRole").value || "0");
      const currentBullet = Number($("kwExpBullet").value || "0");
      const e = (Array.isArray(lastCvDoc?.experience) ? lastCvDoc.experience : [])[currentExp] || null;
      const bullets = asStringArr(e?.bullets, 50);
      $("kwBulletPreview").textContent = bullets[currentBullet] || "—";
    }

    function getKwRecommendedBullet(){
      if(!lastCvDoc || !activeKeywordRaw) return { expIdx: 0, bulletIdx: 0, score: -1 };
      return pickBestRoleAndBullet(activeKeywordRaw);
    }

    function getKwInlineDraftText(){
      const picked = getPickedKwRewriteForCurrentBullet();
      if(picked) return picked;

      const reco = getRecoRewriteForCurrentBullet();
      if(reco) return reco;

      return getDefaultRewriteDraftForCurrentBullet();
    }

    function getKwRewriteAvoidTexts(){
      const out = [];
      const reco = getRecoRewriteForCurrentBullet();
      if(reco) out.push(reco);
      kwRewriteVariants.forEach(v => { if(v?.text) out.push(String(v.text)); });
      return out
        .map(txt => String(txt || "").trim())
        .filter(Boolean)
        .filter((txt, idx, arr) => arr.findIndex(other => normForMatch(other) === normForMatch(txt)) === idx);
    }

    function scrollKwSelectedBulletIntoView(){
      if(!isKwInlineOpen()) return;
      const { expIdx, bulletIdx } = getKwSelectedBullet();
      const el = $("cvPreview")?.querySelector(`.cvBulletItem[data-exp-index="${expIdx}"][data-bullet-index="${bulletIdx}"]`);
      if(!el) return;
      try{
        el.scrollIntoView({ behavior:"smooth", block:"nearest", inline:"nearest" });
      }catch(_){
        try{ el.scrollIntoView(); }catch(__){}
      }
    }

    function positionKwInlineCard(){
      const host = $("kwInlineHost");
      const stage = $("pageStage");
      const preview = $("cvPreview");
      if(!host || !stage || !preview || !isKwInlineOpen()){
        if(host){
          host.style.setProperty("--kw-inline-offset", "0px");
          host.style.setProperty("--kw-inline-pointer", "30px");
          host.style.setProperty("--kw-inline-connector", "22px");
        }
        return;
      }

      const card = host.querySelector(".kwInlineCard");
      const { expIdx, bulletIdx } = getKwSelectedBullet();
      const bullet = preview.querySelector(`.cvBulletItem[data-exp-index="${expIdx}"][data-bullet-index="${bulletIdx}"]`);
      if(!card || !bullet){
        host.style.setProperty("--kw-inline-offset", "0px");
        host.style.setProperty("--kw-inline-pointer", "30px");
        host.style.setProperty("--kw-inline-connector", "22px");
        return;
      }

      host.style.setProperty("--kw-inline-offset", "0px");

      const stageRect = stage.getBoundingClientRect();
      const bulletRect = bullet.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const hostRect = host.getBoundingClientRect();
      const safeTop = 12;
      const safeBottom = 12;
      const rawTop = bulletRect.top - stageRect.top - 18;
      const maxTop = Math.max(0, stageRect.height - cardRect.height - safeBottom);
      const top = Math.max(safeTop, Math.min(rawTop, maxTop));
      const pointer = Math.max(
        24,
        Math.min(cardRect.height - 24, (bulletRect.top - stageRect.top) - top + (bulletRect.height / 2) - 5)
      );
      const connector = Math.max(14, Math.round(hostRect.left - bulletRect.right - 6));

      host.style.setProperty("--kw-inline-offset", `${Math.round(top)}px`);
      host.style.setProperty("--kw-inline-pointer", `${Math.round(pointer)}px`);
      host.style.setProperty("--kw-inline-connector", `${connector}px`);
    }

    function renderKwInlineUi(){
      const preview = $("cvPreview");
      const host = $("kwInlineHost");
      const stage = $("pageStage");
      if(!preview) return;

      preview.classList.remove("keywordPlacementMode", "keywordPlacementPicking");
      if(stage) stage.classList.remove("hasKwInspector");
      if(host){
        host.hidden = true;
        host.innerHTML = "";
      }
      preview.querySelectorAll(".kwInlineCard").forEach(el => el.remove());
      preview.querySelectorAll(".cvBulletItem").forEach(li => {
        li.classList.remove("is-kw-selected", "is-kw-recommended");
        li.setAttribute("tabindex", "-1");
        li.removeAttribute("aria-pressed");
      });

      if(!isKwInlineOpen() || !lastCvDoc) return;

      preview.classList.add("keywordPlacementMode");
      if(stage && host) stage.classList.add("hasKwInspector");

      const selected = getKwSelectedBullet();
      const selectedLi = preview.querySelector(`.cvBulletItem[data-exp-index="${selected.expIdx}"][data-bullet-index="${selected.bulletIdx}"]`);

      preview.querySelectorAll(".cvBulletItem").forEach(li => {
        li.setAttribute("tabindex", "0");
        const expIdx = Number(li.getAttribute("data-exp-index") || "-1");
        const bulletIdx = Number(li.getAttribute("data-bullet-index") || "-1");
        const isSelected = expIdx === Number(selected.expIdx) && bulletIdx === Number(selected.bulletIdx);
        li.classList.toggle("is-kw-selected", isSelected);
        li.setAttribute("aria-pressed", isSelected ? "true" : "false");
      });

      if(!selectedLi) return;

      const current = getCurrentSelectedBulletText() || "—";
      const suggested = getKwInlineDraftText() || "—";
      const suggestedDiff = buildInlineDiffHighlightHtml(current, suggested);
      const hasPickedAlt = !!getPickedKwRewriteForCurrentBullet();
      const isBusy = kwRewriteLoading || kwInlineDraftLoading;
      const statusText = kwRewriteLoading
        ? t("kwInlineRewriteLoading")
        : kwInlineDraftLoading
          ? t("kwInlineAiLoading")
          : hasPickedAlt
            ? t("kwInlineAltReady")
            : (suggested && suggested !== "—" && suggested !== current ? t("kwInlineAiReady") : t("kwInlineTemplate"));
      const keywordLabel = H.escapeHtml(activeKeywordDisplay || prettyKeyword(activeKeywordRaw, chosenKwLang()));
      const rewriteBtnLabel = kwRewriteLoading ? t("kwInlineChangeLoading") : t("kwInlineChange");
      const statusClass = "kwInlineStatus" + (isBusy ? " isLoading" : "") + (hasPickedAlt && !isBusy ? " isSuccess" : "");

      const card = document.createElement("div");
      card.className = "kwInlineCard";
      card.setAttribute("aria-busy", isBusy ? "true" : "false");
      card.innerHTML = `
        <div class="kwInlineTop">
          <div class="kwInlineHead">
            <div class="kwInlineTitle">${H.escapeHtml(t("kwH"))}</div>
            <div class="chips" style="margin-top:6px">
              <span class="chip warn">${keywordLabel}</span>
            </div>
          </div>
          <button class="btn small ghost" type="button" data-kw-inline-action="close">${H.escapeHtml(t("close"))}</button>
        </div>
        <div class="${statusClass}">${H.escapeHtml(statusText)}</div>
        <div class="kwInlineCompare">
          <div class="kwInlineBlock">
            <div class="kwInlineLabel">${H.escapeHtml(t("kwInlineCurrent"))}</div>
            <div class="kwInlineText">${H.escapeHtml(current)}</div>
          </div>
          <div class="kwInlineBlock">
            <div class="kwInlineLabelRow">
              <div class="kwInlineLabel">${H.escapeHtml(t("kwInlineSuggested"))}</div>
              ${suggestedDiff.changed ? `<div class="kwInlineDiffHint">${H.escapeHtml(t("kwInlineDiffHint"))}</div>` : ``}
            </div>
            <div class="kwInlineText kwInlineTextDiff">${suggestedDiff.html}</div>
          </div>
        </div>
        <div class="kwInlineActions">
          <button class="btn primary" type="button" data-kw-inline-action="apply">${H.escapeHtml(t("kwApply"))}</button>
          <button class="btn${kwRewriteLoading ? " isLoading" : ""}" type="button" data-kw-inline-action="rewrite"${isBusy ? " disabled" : ""}>${H.escapeHtml(rewriteBtnLabel)}</button>
        </div>
      `;

      if(host){
        host.hidden = false;
        host.appendChild(card);
      }else{
        selectedLi.appendChild(card);
      }

      try{
        requestAnimationFrame(() => positionKwInlineCard());
      }catch(_){
        positionKwInlineCard();
      }
    }

    function getKwInlineDraftCacheKey(){
      const { expIdx, bulletIdx } = getKwSelectedBullet();
      const lang = chosenKwLang();
      const current = normForMatch(getCurrentSelectedBulletText());
      return [
        normForMatch(activeKeywordRaw),
        String(lang || ""),
        String(expIdx),
        String(bulletIdx),
        current
      ].join("|");
    }

    async function refreshKwInlineDraft({ force=false, source="inline" } = {}){
      if(!isKwInlineOpen() || !lastCvDoc || !activeKeywordRaw) return;
      if(kwMode !== "ai") return;

      const { expIdx, bulletIdx } = getKwSelectedBullet();
      const current = getCurrentSelectedBulletText();
      if(!current) return;

      const lang = chosenKwLang();
      const cacheKey = getKwInlineDraftCacheKey();
      const recoKey = getAiRecoCacheKey(activeKeywordRaw, lang);

      if(!force && kwInlineDraftCache.has(cacheKey)){
        const cachedText = String(kwInlineDraftCache.get(cacheKey) || "").trim();
        if(cachedText){
          kwAiReco = {
            target: "experience",
            exp_index: expIdx,
            bullet_index: bulletIdx,
            rewritten_bullet: cachedText
          };
          kwAiRecoKey = recoKey;
          kwInlineDraftLoading = false;
          updateKwPreview();
        }
        return;
      }

      const exp = (Array.isArray(lastCvDoc?.experience) ? lastCvDoc.experience : [])[expIdx] || {};
      const token = ++kwInlineDraftToken;
      kwInlineDraftLoading = true;
      renderKwInlineUi();

      try{
        const ctx = {
          cv_language: lastLang,
          target_language: lang,
          role_title: exp?.title || "",
          company: exp?.company || "",
          job_title: selectedJob?.title || "",
          job_company: selectedJob?.company_name || "",
          intent: "rewrite",
          source
        };

        const ai = await tryAiRewriteOrCraft({
          mode: "rewrite",
          keyword: activeKeywordRaw,
          lang,
          current_bullet: current,
          note: "",
          context: ctx
        });

        if(token !== kwInlineDraftToken) return;

        if(ai.ok && ai.text){
          const rewritten = String(ai.text || "").trim();
          kwAiReco = {
            target: "experience",
            exp_index: expIdx,
            bullet_index: bulletIdx,
            rewritten_bullet: rewritten
          };
          kwAiRecoKey = recoKey;
          kwInlineDraftCache.set(cacheKey, rewritten);
        }
      }catch(_){
        if(token !== kwInlineDraftToken) return;
      }finally{
        if(token === kwInlineDraftToken){
          kwInlineDraftLoading = false;
          updateKwPreview();
        }
      }
    }

    function openKwInline(keywordRaw){
      showError("");
      if(!lastCvDoc){
        showError(t("needDoc"));
        return;
      }

      const exp = Array.isArray(lastCvDoc?.experience) ? lastCvDoc.experience : [];
      const hasBullets = exp.some(e => asStringArr(e?.bullets, 50).length);
      if(!hasBullets){
        openKwModal(keywordRaw);
        return;
      }

      H.hideModal("kwModal");
      activeKeywordRaw = String(keywordRaw || "").trim();
      activeKeywordDisplay = prettyKeyword(activeKeywordRaw, lastLang);
      kwSurface = "inline";
      kwInlinePickMode = false;
      kwInlineDraftLoading = false;
      kwInlineDraftToken += 1;
      kwRewriteLoading = false;
      $("kwChip").textContent = activeKeywordDisplay || "—";
      $("kwLang").value = "auto";
      $("kwTarget").value = "experience";
      $("kwExpHow").value = "rewrite";
      try{ $("kwAdvancedDetails").open = false; }catch(_){}
      clearKwAiReco();
      resetKwRewriteVariants();
      setKwMode("ai");
      fillSkillGroups();
      fillExperienceRoles();

      const best = getKwRecommendedBullet();
      setKwSelectedBullet(best.expIdx || 0, best.bulletIdx || 0);

      setStudioMode("tailor");
      setTabs("preview");
      updateKwPreview();
      scrollKwSelectedBulletIntoView();
      void refreshKwInlineDraft({ force:false, source:"open-inline" });
    }

    
    // -------------------------
    // AI recommendation (best placement)
    // -------------------------
    function clearKwAiReco(){
      kwAiReco = null;
      kwAiRecoKey = "";
      kwAiKeywordPretty = "";
      try{ setBadge("kwAiRecoBadge","", "—"); }catch(_){}
      try{ setText("kwAiRecoText", "—"); }catch(_){}
    }

    function setKwAiRecoLoading(){
      setBadge("kwAiRecoBadge","warn", uiLang==="de" ? "Denke…" : "Thinking…");
      setText("kwAiRecoText", uiLang==="de"
        ? "Finde das beste Placement und erstelle einen Vorschlag…"
        : "Finding the best placement and drafting a suggestion…"
      );
    }

    function setKwAiRecoError(msg){
      setBadge("kwAiRecoBadge","warn", uiLang==="de" ? "Nicht verfügbar" : "Unavailable");
      setText("kwAiRecoText", msg || (uiLang==="de"
        ? "Du kannst weiterhin Auto-pick oder Skills nutzen."
        : "You can still use Auto-pick or add it under Skills."
      ));
    }

    function slimCvDocForSuggest(doc){
      if(!doc || typeof doc !== "object") return null;

      const exp = Array.isArray(doc.experience) ? doc.experience : [];
      const expOut = exp.slice(0, 10).map((e) => ({
        title: String(e?.title || "").trim(),
        company: String(e?.company || "").trim(),
        bullets: asStringArr(e?.bullets, 10).map(b => String(b).trim().slice(0, 260))
      }));

      const skills = (doc.skills && typeof doc.skills === "object") ? doc.skills : {};
      const groups = Array.isArray(skills.groups) ? skills.groups : [];
      const groupsOut = groups.slice(0, 10).map((g) => ({
        label: String(g?.label || "").trim(),
        items: asStringArr(g?.items, 25).map(x => String(x).trim().slice(0, 80))
      }));

      const additionalOut = asStringArr(skills.additional, 60).map(x => String(x).trim().slice(0, 80));

      return { experience: expOut, skills: { groups: groupsOut, additional: additionalOut } };
    }

    function getAiRecoCacheKey(keyword, lang){
      const base = String(lastDebug?.input_hash || lastDebug?.hash || "");
      const src = String(jobSource || "queue");
      return [normForMatch(keyword), base, String(lang||""), src].join("|");
    }

    function roleLabelByIndex(expIdx){
      const e = (Array.isArray(lastCvDoc?.experience) ? lastCvDoc.experience : [])[Number(expIdx)||0] || null;
      return e ? (joinNonEmpty([e?.title, e?.company], " · ") || "") : "";
    }

    function skillGroupLabelByKey(groupKey){
      if(groupKey === "additional") return uiLang==="de" ? "Weitere Skills" : "Additional skills";
      const s = String(groupKey || "");
      if(s.startsWith("group:")){
        const idx = Number(s.split(":")[1] || "0");
        const g = (Array.isArray(lastCvDoc?.skills?.groups) ? lastCvDoc.skills.groups : [])[idx] || null;
        return String(g?.label || "").trim() || (uiLang==="de" ? ("Gruppe " + (idx+1)) : ("Group " + (idx+1)));
      }
      return uiLang==="de" ? "Skills" : "Skills";
    }

    function applyAiRecoToModalUi(reco){
      if(!reco) return;

      const target = String(reco.target || "").toLowerCase() === "experience" ? "experience" : "skills";
      $("kwTarget").value = target;
      updateKwTargetUi();

      if(target === "skills"){
        const sg = String(reco.skill_group || reco.skillGroup || "additional");
        if($("kwSkillGroup") && [...$("kwSkillGroup").options].some(o => o.value === sg)){
          $("kwSkillGroup").value = sg;
        }else{
          $("kwSkillGroup").value = "additional";
        }
      }else{
        const expIdx = Number(reco.exp_index ?? reco.expIdx ?? 0);
        const bulletIdx = Number(reco.bullet_index ?? reco.bulletIdx ?? 0);

        $("kwExpRole").value = String(Math.max(0, expIdx));
        fillBulletsForSelectedRole();

        if($("kwExpBullet") && [...$("kwExpBullet").options].some(o => o.value === String(bulletIdx))){
          $("kwExpBullet").value = String(bulletIdx);
        }else{
          $("kwExpBullet").value = "0";
        }

        $("kwExpHow").value = "rewrite";
        updateKwExpHowUi();

        const e = (Array.isArray(lastCvDoc?.experience) ? lastCvDoc.experience : [])[Number($("kwExpRole").value||0)] || null;
        const bullets = asStringArr(e?.bullets, 50);
        const i = Number($("kwExpBullet").value || "0");
        $("kwBulletPreview").textContent = bullets[i] || "—";
      }

      updateKwPreview();
    }

    function renderAiRecoBox(reco, lang){
      if(!reco){ clearKwAiReco(); return; }

      const conf = (typeof reco.confidence === "number") ? reco.confidence
        : (typeof reco.confidence_score === "number") ? reco.confidence_score
        : null;

      const confTxt = (conf != null && conf >= 0 && conf <= 1) ? (" • " + Math.round(conf*100) + "%") : "";
      setBadge("kwAiRecoBadge","good", (uiLang==="de" ? "Empfohlen" : "Recommended") + confTxt);

      const reason = String(reco.reason || "").trim();
      const target = String(reco.target || "").toLowerCase() === "experience" ? "experience" : "skills";

      if(target === "experience"){
        const expIdx = Number(reco.exp_index ?? reco.expIdx ?? 0);
        const bulletIdx = Number(reco.bullet_index ?? reco.bulletIdx ?? 0);
        const role = roleLabelByIndex(expIdx) || (uiLang==="de" ? "Experience" : "Experience");
        const rb = String(reco.rewritten_bullet || reco.rewrite || "").trim();

        const header = `Experience → ${role} (Bullet ${bulletIdx+1})`;
        const lines = [
          header,
          reason ? ("Reason: " + reason) : "",
          rb ? ("Suggested rewrite: " + rb) : ""
        ].filter(Boolean);

        setText("kwAiRecoText", lines.join("\n"));
      }else{
        const sg = String(reco.skill_group || reco.skillGroup || "additional");
        const groupLbl = skillGroupLabelByKey(sg);
        const item = String(reco.skill_item || reco.skillItem || prettyKeyword(activeKeywordRaw, lang)).trim();

        const header = `Skills → ${groupLbl}`;
        const lines = [
          header,
          reason ? ("Reason: " + reason) : "",
          item ? ("Suggested skill: " + item) : ""
        ].filter(Boolean);

        setText("kwAiRecoText", lines.join("\n"));
      }
    }

    async function tryAiSuggestPlacement({ keyword, lang, cv_doc, context }){
      const endpoints = [
        "/me/cv/keyword_suggest",
        "/me/cv/keyword_recommend"
      ];

      const payload = {
        keyword: String(keyword || ""),
        language: String(lang || ""),
        lang: String(lang || ""),
        cv_doc: cv_doc || null,
        context: context || {}
      };

      for(const ep of endpoints){
        try{
          const res = await apiPostJson(ep, payload);
          // expected: { ok:true, recommendation:{...}, keyword_pretty?:string }
          const keywordPretty = String(
            res?.keyword_pretty
              || res?.keywordPretty
              || res?.result?.keyword_pretty
              || res?.result?.keywordPretty
              || ""
          ).trim();

          const reco = res?.recommendation || res?.result?.recommendation || res?.result || res;
          if(reco && typeof reco === "object"){
            // Sometimes backend returns { recommendation:{...} } or a flat object
            const r = reco.recommendation || reco;
            if(r && (r.target || r.skill_group || r.exp_index != null)){
              return {
                ok: true,
                reco: r,
                endpoint: ep,
                keyword_pretty: keywordPretty,
                model: String(res?.model || res?.result?.model || ""),
                prompt_version: String(res?.prompt_version || res?.promptVersion || res?.result?.prompt_version || "")
              };
            }
          }
        }catch(e){
          if(isEndpointMissing(e)) continue;
          throw e;
        }
      }
      return { ok:false, reco:null, endpoint:"", keyword_pretty:"", model:"", prompt_version:"" };
    }

    async function aiRecommendPlacement({ force=false, source="auto" } = {}){
      if(!lastCvDoc || !activeKeywordRaw) return;
      if(kwMode !== "ai") return;

      const lang = chosenKwLang();
      const cacheKey = getAiRecoCacheKey(activeKeywordRaw, lang);
      kwAiRecoKey = cacheKey;

      // Cache hit
      if(!force && kwAiRecoCache.has(cacheKey)){
        const cached = kwAiRecoCache.get(cacheKey);
        kwAiReco = cached;
        kwAiKeywordPretty = String(cached?.keyword_pretty || "").trim();

        // If backend provided a nicer display, use it in the chip (does not change the raw keyword)
        if(kwAiKeywordPretty){
          activeKeywordDisplay = kwAiKeywordPretty;
          if($("kwChip")) $("kwChip").textContent = kwAiKeywordPretty;
        }

        applyAiRecoToModalUi(cached);
        renderAiRecoBox(cached, lang);
        try{ updateKwRewriteUi(); renderKwRewriteOptions(); }catch(_){ }
        return;
      }

      const token = ++kwAiRecoToken;
      setKwAiRecoLoading();

      try{
        const ctx = {
          target_language: lang,
          cv_language: lastLang,
          job: getActiveJobMeta(),
          source: source
        };

        const slim = slimCvDocForSuggest(lastCvDoc);
        const out = await tryAiSuggestPlacement({ keyword: activeKeywordRaw, lang, cv_doc: slim, context: ctx });

        if(token !== kwAiRecoToken) return; // stale

        if(out.ok && out.reco){
          const packed = Object.assign({}, out.reco);
          if(out.keyword_pretty) packed.keyword_pretty = out.keyword_pretty;

          kwAiReco = packed;
          kwAiKeywordPretty = String(out.keyword_pretty || packed.keyword_pretty || "").trim();
          kwAiRecoCache.set(cacheKey, packed);

          // If backend provided a nicer display, use it in the chip (does not change the raw keyword)
          if(kwAiKeywordPretty){
            activeKeywordDisplay = kwAiKeywordPretty;
            if($("kwChip")) $("kwChip").textContent = kwAiKeywordPretty;
          }

          applyAiRecoToModalUi(packed);
          renderAiRecoBox(packed, lang);
          try{ updateKwRewriteUi(); renderKwRewriteOptions(); }catch(_){ }
          updateKwPreview();
        }else{
          clearKwAiReco();
          setKwAiRecoError(uiLang==="de" ? "Keine Empfehlung verfügbar." : "No recommendation available.");
        }
      }catch(e){
        if(token !== kwAiRecoToken) return;
        clearKwAiReco();
        setKwAiRecoError((uiLang==="de" ? "AI Empfehlung fehlgeschlagen." : "AI recommendation failed.") + " " + (e?.message || String(e)));
      }
    }

	function openKwModal(keywordRaw){
	      showError("");
	      if(!lastCvDoc && !($("cvText").value || "").trim()){
	        showError(t("needCv"));
	        return;
      }

      kwSurface = "modal";
      kwInlinePickMode = false;
      kwInlineDraftLoading = false;
      kwInlineDraftToken += 1;
      kwRewriteLoading = false;
      renderKwInlineUi();
      activeKeywordRaw = String(keywordRaw || "").trim();
      activeKeywordDisplay = prettyKeyword(activeKeywordRaw, lastLang);
      $("kwChip").textContent = activeKeywordDisplay || "—";

      // Reset AI recommendation for this keyword
      try{ clearKwAiReco(); }catch(_){ }

	      // Default language: auto (match CV language unless user overrides)
	      $("kwLang").value = "auto";

	      // Default mode: quick add. Advanced AI wording stays available if needed.
	      setKwMode("quick");

	      // Default to the safest ATS improvement. Advanced placement can move it into experience.
	      let recommendedTarget = "skills";
	      $("kwTarget").value = recommendedTarget;
	      try{ $("kwAdvancedDetails").open = false; }catch(_){}

      // Populate role/groups if doc available
      if(lastCvDoc){
        fillSkillGroups();
        fillExperienceRoles();

        // If we recommend Experience: auto-pick the best matching role + bullet
        if(recommendedTarget === "experience"){
          try{
            const best = pickBestRoleAndBullet(activeKeywordRaw);
            $("kwExpRole").value = String(best.expIdx || 0);
            fillBulletsForSelectedRole();
            $("kwExpBullet").value = String(best.bulletIdx || 0);
            // Update bullet preview text
            const e = (Array.isArray(lastCvDoc?.experience) ? lastCvDoc.experience : [])[Number(best.expIdx||0)] || null;
            const bullets = asStringArr(e?.bullets, 50);
            $("kwBulletPreview").textContent = bullets[Number(best.bulletIdx||0)] || "—";
            // Default experience action = rewrite (best)
            $("kwExpHow").value = "rewrite";
          }catch(_){}
        }
      }else{
        // if no doc, force skills box only (text-only)
        $("kwTarget").value = "skills";
      }

      // Show/hide boxes
      updateKwTargetUi();
      try{ updateKwRewriteUi(); resetKwRewriteVariants(); }catch(_){ }
      updateKwPreview();

      H.showModal("kwModal");

	    }

    function closeKwModal(){
      H.hideModal("kwModal");
      kwSurface = "";
      kwInlinePickMode = false;
      kwInlineDraftLoading = false;
      kwInlineDraftToken += 1;
      kwRewriteLoading = false;
      activeKeywordRaw = "";
      activeKeywordDisplay = "";
      $("kwResultPreview").textContent = "—";
      $("kwNote").value = "";

      // Cancel any in-flight AI recommendation and reset UI
      try{ kwAiRecoToken += 1; }catch(_){ }
      try{ clearKwAiReco(); }catch(_){ }

      // Cancel/clear "Rewrite again" variants
      try{ kwRewriteToken += 1; }catch(_){ }
      kwRewriteVariants = [];
      kwRewriteSelected = "reco";
      kwRewriteKey = "";
      try{ updateKwRewriteUi(); }catch(_){ }
      renderKwInlineUi();
    }

    function updateKwTargetUi(){
      const target = String($("kwTarget").value || "skills");
      const hasDoc = !!lastCvDoc;

      $("kwSkillsBox").style.display = (target === "skills") ? "" : "none";
      $("kwExpBox").style.display = (target === "experience" && hasDoc) ? "" : "none";

      if(target === "experience" && !hasDoc){
        // can't do experience insert without doc
        $("kwTarget").value = "skills";
        $("kwSkillsBox").style.display = "";
        $("kwExpBox").style.display = "none";
      }

      updateKwExpHowUi();
    }

    function updateKwExpHowUi(){
      const how = String($("kwExpHow").value || "rewrite");
      const showPick = (how === "rewrite" || how === "append");
      $("kwBulletPickBox").style.display = showPick ? "" : "none";

      const showNote = (how === "new");
      $("kwNoteBox").style.display = showNote ? "" : "none";
      $("kwNewWarn").style.display = showNote ? "" : "none";

      // "Rewrite again" only makes sense when rewriting/appending an existing bullet in AI mode
      try{ updateKwRewriteUi(); }catch(_){ }

      updateKwPreview();
    }


    /* -------------------------
       Keyword modal: "Rewrite again" (variants)
       ------------------------- */
    function computeKwRewriteKey(){
      try{
        if(!activeKeywordRaw) return "";
        if(!lastCvDoc) return "";
        if(kwMode !== "ai") return "";
        const target = String($("kwTarget").value || "skills");
        if(target !== "experience") return "";
        const how = String($("kwExpHow").value || "rewrite");
        if(!(how === "rewrite" || how === "append")) return "";
        const expIdx = Number($("kwExpRole").value || "0");
        const bulletIdx = Number($("kwExpBullet").value || "0");
        const lang = chosenKwLang();
        return [String(activeKeywordRaw||""), String(lang||""), String(expIdx), String(bulletIdx), String(how)].join("||");
      }catch(_){
        return "";
      }
    }

    function getRecoRewriteForCurrentBullet(){
      try{
        const kw = activeKeywordRaw;
        const lang = chosenKwLang();
        const expIdx = Number($("kwExpRole").value || "0");
        const bulletIdx = Number($("kwExpBullet").value || "0");
        const key = getAiRecoCacheKey(kw, lang);

        if(kwMode === "ai" && kwAiReco && kwAiRecoKey === key && String(kwAiReco.target || "").toLowerCase() === "experience"){
          const reExp = Number(kwAiReco.exp_index ?? kwAiReco.expIdx ?? -1);
          const reBul = Number(kwAiReco.bullet_index ?? kwAiReco.bulletIdx ?? -1);
          const rb = String(kwAiReco.rewritten_bullet || kwAiReco.rewrite || "").trim();
          if(rb && reExp === expIdx && reBul === bulletIdx) return rb;
        }
      }catch(_){}
      return "";
    }

    function getCurrentSelectedBulletText(){
      try{
        const expIdx = Number($("kwExpRole").value || "0");
        const bulletIdx = Number($("kwExpBullet").value || "0");
        const exp = (Array.isArray(lastCvDoc?.experience) ? lastCvDoc.experience : [])[expIdx] || {};
        const bullets = asStringArr(exp?.bullets, 50);
        return String(bullets[bulletIdx] || "").trim();
      }catch(_){
        return "";
      }
    }

    function getDefaultRewriteDraftForCurrentBullet(){
      const lang = chosenKwLang();
      const kw = activeKeywordRaw;
      const how = String($("kwExpHow").value || "rewrite");
      const current = getCurrentSelectedBulletText();
      if(!current) return "";
      return (how === "append")
        ? localAppendKeyword(current, kw, lang)
        : localRewriteBullet(current, kw, lang);
    }

    function resetKwRewriteVariants(){
      kwRewriteVariants = [];
      kwRewriteSelected = "reco";
      kwRewriteKey = computeKwRewriteKey();
      renderKwRewriteOptions();
    }

    function setKwRewriteLoading(isLoading, msg){
      kwRewriteLoading = !!isLoading;
      const badge = $("kwRewriteBadge");
      const btn = $("kwRewriteAgain");
      if(btn){
        btn.disabled = !!isLoading;
        btn.textContent = isLoading ? t("kwInlineChangeLoading") : t("kwRewriteAgain");
        btn.classList.toggle("isLoading", !!isLoading);
      }
      if(badge){
        if(isLoading){
          badge.textContent = msg || t("kwInlineRewriteLoading");
          badge.className = "badge warn";
        }else{
          // badge updated in render
        }
      }
      if(isKwInlineOpen()) renderKwInlineUi();
    }

    function updateKwRewriteUi(){
      const box = $("kwRewriteBox");
      if(!box) return;

      const key = computeKwRewriteKey();
      const canShow = !!key;

      box.style.display = canShow ? "" : "none";

      if(!canShow){
        kwRewriteVariants = [];
        kwRewriteSelected = "reco";
        kwRewriteKey = "";
        const opt = $("kwRewriteOptions"); if(opt) opt.innerHTML = "";
        const badge = $("kwRewriteBadge"); if(badge){ badge.textContent = "—"; badge.className="badge"; }
        return;
      }

      if(key !== kwRewriteKey){
        kwRewriteKey = key;
        kwRewriteVariants = [];
        kwRewriteSelected = "reco";
      }

      renderKwRewriteOptions();
    }

    function renderKwRewriteOptions(){
      const box = $("kwRewriteBox");
      const list = $("kwRewriteOptions");
      const badge = $("kwRewriteBadge");
      if(!box || !list) return;

      const key = computeKwRewriteKey();
      if(!key || key !== kwRewriteKey){
        // keep it simple: reset when out-of-sync
        kwRewriteKey = key;
        kwRewriteVariants = [];
        kwRewriteSelected = "reco";
      }

      const reco = getRecoRewriteForCurrentBullet();
      const def = getDefaultRewriteDraftForCurrentBullet();
      const baseText = reco || def || "";

      // Badge
      if(badge){
        const n = kwRewriteVariants.length;
        badge.textContent = (n === 0) ? (uiLang==="de" ? "0 Varianten" : "0 variants") : (uiLang==="de" ? (n + " Varianten") : (n + " variants"));
        badge.className = "badge " + (n ? "good" : "warn");
      }

      // Build options
      const opts = [];
      opts.push({
        id: "reco",
        label: reco ? (uiLang==="de" ? "Empfohlen" : "Recommended") : (uiLang==="de" ? "Standard" : "Default"),
        pill: reco ? (uiLang==="de" ? "AI" : "AI") : (uiLang==="de" ? "Template" : "Template"),
        text: baseText || "—"
      });

      kwRewriteVariants.forEach((v, i) => {
        opts.push({
          id: "v:" + i,
          label: (uiLang==="de" ? "Variante " : "Variant ") + (i+1),
          pill: "AI",
          text: String(v?.text || "").trim() || "—"
        });
      });

      list.innerHTML = opts.map(o => {
        const active = (kwRewriteSelected === o.id) ? " active" : "";
        const safeText = H.escapeHtml(String(o.text||""));
        const safeLabel = H.escapeHtml(String(o.label||""));
        const safePill = H.escapeHtml(String(o.pill||""));
        return `
          <div class="altOption${active}" role="button" tabindex="0" data-alt="${safeLabel}" data-id="${H.escapeHtml(o.id)}">
            <div class="altMeta">
              <span class="altLabel">${safeLabel}</span>
              <span class="altPill">${safePill}</span>
            </div>
            <div class="altText">${safeText}</div>
          </div>
        `;
      }).join("");

      // If user selected a variant that no longer exists, fall back
      if(kwRewriteSelected !== "reco" && !opts.some(o => o.id === kwRewriteSelected)){
        kwRewriteSelected = "reco";
      }
    }

    function getPickedKwRewriteForCurrentBullet(){
      try{
        const key = computeKwRewriteKey();
        if(!key || key !== kwRewriteKey) return "";
        if(!kwRewriteSelected || kwRewriteSelected === "reco") return "";
        if(!String(kwRewriteSelected).startsWith("v:")) return "";
        const idx = Number(String(kwRewriteSelected).split(":")[1] || "-1");
        const v = kwRewriteVariants[idx];
        const text = String(v?.text || "").trim();
        return text || "";
      }catch(_){
        return "";
      }
    }

    async function onKwRewriteAgain(){
      showError("");
      if(!activeKeywordRaw){ return; }
      if(!lastCvDoc){ return; }
      if(kwMode !== "ai"){ return; }

      const key = computeKwRewriteKey();
      if(!key){
        showError(uiLang==="de" ? "Wähle zuerst eine Bullet aus." : "Please select a bullet first.");
        return;
      }
      if(key !== kwRewriteKey){
        resetKwRewriteVariants();
      }

      const lang = chosenKwLang();
      const kw = activeKeywordRaw;
      const how = String($("kwExpHow").value || "rewrite");
      const current = getCurrentSelectedBulletText();
      if(!current){
        showError(uiLang==="de" ? "Keine Bullet zum Umformulieren." : "No bullet to rewrite.");
        return;
      }

      const token = ++kwRewriteToken;
      setKwRewriteLoading(true, t("kwInlineRewriteLoading"));

      try{
        const expIdx = Number($("kwExpRole").value || "0");
        const exp = (Array.isArray(lastCvDoc?.experience) ? lastCvDoc.experience : [])[expIdx] || {};
        const seenNorms = new Set(getKwRewriteAvoidTexts().map(normForMatch).filter(Boolean));
        let freshText = "";
        let hadAiText = false;
        const maxAttempts = 3;

        for(let attempt = 0; attempt < maxAttempts; attempt++){
          const avoid = getKwRewriteAvoidTexts();
          const ctx = {
            cv_language: lastLang,
            target_language: lang,
            role_title: exp?.title || "",
            company: exp?.company || "",
            job_title: selectedJob?.title || "",
            job_company: selectedJob?.company_name || "",
            intent: how,
            variation: kwRewriteVariants.length + attempt + 1,
            rewrite_attempt: attempt + 1,
            require_distinct: true,
            avoid_rewrites: avoid.slice(0, 8)
          };

          const ai = await tryAiRewriteOrCraft({
            mode: "rewrite",
            keyword: kw,
            lang,
            current_bullet: current,
            note: "",
            context: ctx
          });

          if(token !== kwRewriteToken) return;
          if(!(ai.ok && ai.text)) continue;

          const txt = String(ai.text || "").trim();
          const normTxt = normForMatch(txt);
          if(!normTxt) continue;
          hadAiText = true;
          if(seenNorms.has(normTxt)){
            continue;
          }

          freshText = txt;
          break;
        }

        if(freshText){
          kwRewriteVariants.push({ text: freshText, at: Date.now() });
          kwRewriteSelected = "v:" + Math.max(0, kwRewriteVariants.length - 1);
          renderKwRewriteOptions();
          updateKwPreview();
        }else{
          showError(hadAiText ? t("kwRewriteNoFresh") : t("aiFallback"));
        }
      }catch(e){
        showError((uiLang==="de" ? "Rewrite fehlgeschlagen: " : "Rewrite failed: ") + (e?.message || String(e)));
      }finally{
        setKwRewriteLoading(false);
      }
    }

    function buildKwPreviewText(){
      const target = String($("kwTarget").value || "skills");
      const lang = chosenKwLang();
      const kw = activeKeywordRaw;

      if(!kw) return "—";

      if(target === "skills"){
        const group = String($("kwSkillGroup").value || "additional");
        const dest = group === "additional"
          ? (uiLang==="de" ? "Weitere Skills" : "Additional skills")
          : ($("kwSkillGroup").selectedOptions?.[0]?.textContent || (uiLang==="de" ? "Skills" : "Skills"));

        // Prefer AI-prettified casing (e.g., "Power BI") when available for the same keyword+language
        let kwShow = prettyKeyword(kw, lang);
        try{
          const key = getAiRecoCacheKey(kw, lang);
          if(kwMode === "ai" && kwAiReco && kwAiRecoKey === key){
            const rTarget = String(kwAiReco.target || "").toLowerCase();
            if(rTarget === "skills"){
              const item = String(kwAiReco.skill_item || kwAiReco.skillItem || kwAiReco.keyword_pretty || kwAiKeywordPretty || "").trim();
              if(item) kwShow = item;
            }else{
              const pp = String(kwAiReco.keyword_pretty || kwAiKeywordPretty || "").trim();
              if(pp) kwShow = pp;
            }
          }
        }catch(_){}

        const verb = (lang==="de") ? "Füge hinzu:" : "Add:";
        return `${verb} ${kwShow} → ${dest}`;
      }

      // experience
      const expIdx = Number($("kwExpRole").value || "0");
      const exp = (Array.isArray(lastCvDoc?.experience) ? lastCvDoc.experience : [])[expIdx] || {};
      const roleName = joinNonEmpty([exp?.title, exp?.company], " · ") || (lang==="de" ? "Experience" : "Experience");
      const how = String($("kwExpHow").value || "rewrite");
      const bullets = asStringArr(exp?.bullets, 50);

      if(how === "new"){
        const note = $("kwNote").value || "";
        const b = (kwMode === "ai")
          ? localNewBullet(kw, note, lang) // AI preview might change, but good enough
          : localNewBullet(kw, note, lang);
        return (lang==="de")
          ? (`Neue Bullet bei ${roleName}:\n- ${b}`)
          : (`New bullet under ${roleName}:\n- ${b}`);
      }

      const bulletIdx = Number($("kwExpBullet").value || "0");
      const current = bullets[bulletIdx] || "";
      let rewritten = (how === "append")
        ? localAppendKeyword(current, kw, lang)
        : localRewriteBullet(current, kw, lang);

      // If we already have an AI recommendation for this exact bullet, show that draft (more accurate than templates)
      try{
        const key = getAiRecoCacheKey(kw, lang);
        if(kwMode === "ai" && kwAiReco && kwAiRecoKey === key && String(kwAiReco.target || "").toLowerCase() === "experience"){
          const reExp = Number(kwAiReco.exp_index ?? kwAiReco.expIdx ?? -1);
          const reBul = Number(kwAiReco.bullet_index ?? kwAiReco.bulletIdx ?? -1);
          const rb = String(kwAiReco.rewritten_bullet || kwAiReco.rewrite || "").trim();
          if(rb && reExp === expIdx && reBul === bulletIdx){
            rewritten = rb;
          }
        }
      }catch(_){}

      // If you generated alternative rewrites (Rewrite again), prefer the one you picked
      try{
        const picked = getPickedKwRewriteForCurrentBullet();
        if(picked) rewritten = picked;
      }catch(_){ }

      const label = (how === "append")
        ? (lang==="de" ? "Anhängen:" : "Append:")
        : (lang==="de" ? "Umformulieren:" : "Rewrite:");
      return `${label} ${roleName}\nALT: ${current}\nNEU: ${rewritten}`;
    }

    function updateKwPreview(){
      $("kwResultPreview").textContent = buildKwPreviewText();
      if(isKwInlineOpen()) renderKwInlineUi();
    }

    async function applyKeyword(){
      showError("");
      if(!activeKeywordRaw){
        closeKwModal();
        return;
      }

      const target = String($("kwTarget").value || "skills");
      const lang = chosenKwLang();
      const kwRaw = activeKeywordRaw;
      const kwDisp = prettyKeyword(kwRaw, lang);

      // Take history snapshot
      historyStack.push(snapshotCurrent());
      updateUndoResetButtons();

      try{
        if(target === "skills"){
          // Prefer AI-prettified casing for skills when available (saves a second AI call on Apply)
          let kwSkillAdd = kwDisp;
          try{
            const key = getAiRecoCacheKey(kwRaw, lang);
            if(kwMode === "ai" && kwAiReco && kwAiRecoKey === key){
              const rTarget = String(kwAiReco.target || "").toLowerCase();
              if(rTarget === "skills"){
                const item = String(kwAiReco.skill_item || kwAiReco.skillItem || kwAiReco.keyword_pretty || kwAiKeywordPretty || "").trim();
                if(item) kwSkillAdd = item;
              }else{
                const pp = String(kwAiReco.keyword_pretty || kwAiKeywordPretty || "").trim();
                if(pp) kwSkillAdd = pp;
              }
            }
          }catch(_){}

          if(!lastCvDoc){
            // text-only: just append to end as "Skills: ..."
            const txt = $("cvText").value || "";
            const addLine = (lang==="de") ? ("\nSKILLS\n" + kwSkillAdd + "\n") : ("\nSKILLS\n" + kwSkillAdd + "\n");
            $("cvText").value = (txt.trim() + "\n" + addLine).trim() + "\n";
          }else{
            const skillGroup = String($("kwSkillGroup").value || "additional");
            lastCvDoc.skills = lastCvDoc.skills || {};
            lastCvDoc.skills.groups = Array.isArray(lastCvDoc.skills.groups) ? lastCvDoc.skills.groups : [];
            lastCvDoc.skills.additional = Array.isArray(lastCvDoc.skills.additional) ? lastCvDoc.skills.additional : [];

            const ensureUniquePush = (arr, val) => {
              const exists = arr.some(x => normForMatch(x) === normForMatch(val));
              if(!exists) arr.push(val);
            };

            if(skillGroup.startsWith("group:")){
              const idx = Number(skillGroup.split(":")[1] || "0");
              const g = lastCvDoc.skills.groups[idx];
              if(g){
                g.items = Array.isArray(g.items) ? g.items : [];
                ensureUniquePush(g.items, kwSkillAdd);
              }else{
                ensureUniquePush(lastCvDoc.skills.additional, kwSkillAdd);
              }
            }else{
              ensureUniquePush(lastCvDoc.skills.additional, kwSkillAdd);
            }

            // Update text and preview
            renderCvPreviewFromDoc(lastCvDoc, lastLang);
            $("cvText").value = cvDocToPlainText(lastCvDoc, lastLang);
          }

	          recomputeCoverageFromCurrentText();
	          try{ updateQaDot(); }catch(_){ }
	          setText("outHint", (Array.isArray(lastMissing) && lastMissing.length)
	            ? "Great. Keep adding only the true missing terms, then export."
	            : "Nice. Your ATS gaps are covered. Run the final check and export.");
	          updateKwPreview();
	          closeKwModal();
	          return;
        }

        // Experience
        if(!lastCvDoc){
          showError(t("needDoc"));
          return;
        }

        const expIdx = Number($("kwExpRole").value || "0");
        const how = String($("kwExpHow").value || "rewrite");

        lastCvDoc.experience = Array.isArray(lastCvDoc.experience) ? lastCvDoc.experience : [];
        const exp = lastCvDoc.experience[expIdx];
        if(!exp){
          showError(t("needDoc"));
          return;
        }
        exp.bullets = Array.isArray(exp.bullets) ? exp.bullets : [];

        let changed = false;
        let usedAi = false;
        let aiNote = "";

        if(how === "new"){
          const note = String($("kwNote").value || "").trim();
          if(!note || note.length < 4){
            showError(t("noteRequired"));
            return;
          }

          if(kwMode === "ai"){
            const ctx = {
              cv_language: lastLang,
              target_language: lang,
              role_title: exp?.title || "",
              company: exp?.company || "",
              job_title: selectedJob?.title || "",
              job_company: selectedJob?.company_name || ""
            };
            const ai = await tryAiRewriteOrCraft({
              mode: "new",
              keyword: kwRaw,
              lang,
              current_bullet: "",
              note,
              context: ctx
            });
            if(ai.ok){
              exp.bullets.unshift(ai.text);
              usedAi = true;
            }else{
              aiNote = t("aiFallback");
              exp.bullets.unshift(localNewBullet(kwRaw, note, lang));
            }
          }else{
            exp.bullets.unshift(localNewBullet(kwRaw, note, lang));
          }
          changed = true;
        } else {
          const bulletIdx = Number($("kwExpBullet").value || "0");
          const current = String(exp.bullets[bulletIdx] || "").trim();
          if(!current){
            // If no bullets, degrade to new with required note
            const note = String($("kwNote").value || "").trim();
            exp.bullets.unshift(localNewBullet(kwRaw, note, lang));
            changed = true;
          }else{
            if(kwMode === "ai" && (how === "rewrite" || how === "append")){
              // If AI already suggested a rewrite for this exact bullet, use it (saves an extra AI call)
              const recoText = (kwAiReco
                && kwAiRecoKey === getAiRecoCacheKey(kwRaw, lang)
                && String(kwAiReco.target || "").toLowerCase() === "experience"
                && Number(kwAiReco.exp_index ?? kwAiReco.expIdx ?? -1) === expIdx
                && Number(kwAiReco.bullet_index ?? kwAiReco.bulletIdx ?? -1) === bulletIdx)
                  ? String(kwAiReco.rewritten_bullet || kwAiReco.rewrite || "").trim()
                  : "";

              // If you picked a specific rewrite variant (Rewrite again), use it first
              const picked = getPickedKwRewriteForCurrentBullet();
              if(picked){
                exp.bullets[bulletIdx] = picked;
                usedAi = true;
                changed = true;
              } else if(recoText){
                exp.bullets[bulletIdx] = recoText;
                usedAi = true;
                changed = true;
              }else{
              const ctx = {
                cv_language: lastLang,
                target_language: lang,
                role_title: exp?.title || "",
                company: exp?.company || "",
                job_title: selectedJob?.title || "",
                job_company: selectedJob?.company_name || "",
                intent: how
              };
              const ai = await tryAiRewriteOrCraft({
                mode: "rewrite",
                keyword: kwRaw,
                lang,
                current_bullet: current,
                note: "",
                context: ctx
              });
              if(ai.ok){
                exp.bullets[bulletIdx] = ai.text;
                usedAi = true;
                changed = true;
              }else{
                aiNote = t("aiFallback");
                exp.bullets[bulletIdx] = (how === "append")
                  ? localAppendKeyword(current, kwRaw, lang)
                  : localRewriteBullet(current, kwRaw, lang);
                changed = true;
              }
              }
            } else if(how === "append"){
              exp.bullets[bulletIdx] = localAppendKeyword(current, kwRaw, lang);
              changed = true;
            } else {
              exp.bullets[bulletIdx] = localRewriteBullet(current, kwRaw, lang);
              changed = true;
            }
          }
        }

        if(changed){
          renderCvPreviewFromDoc(lastCvDoc, lastLang);
          $("cvText").value = cvDocToPlainText(lastCvDoc, lastLang);
          recomputeCoverageFromCurrentText();

	          if(aiNote){
	            // non-blocking: show as top info
	            showError(aiNote);
	          }
	          setText("outHint", (Array.isArray(lastMissing) && lastMissing.length)
	            ? "Great. Keep adding only the true missing terms, then export."
	            : "Nice. Your ATS gaps are covered. Run the final check and export.");
	          closeKwModal();
	        }
      }catch(e){
        // rollback snapshot
        const snap = historyStack.pop();
        restoreSnapshot(snap);
        showError(e?.message || String(e));
      }finally{
        updateUndoResetButtons();
        if($('tabChanges')?.classList?.contains('active')){ try{ renderChangesView(); }catch(_){ } }
        // Save edited output locally
        try{
          const key = "cvstudio_last_" + String(selectedJob?.id || "");
          localStorage.setItem(key, JSON.stringify({
            at: Date.now(),
            payload: buildTailorPayload(),
            cv_text: $("cvText").value || "",
            cv_doc: lastCvDoc,
            lang: lastLang,
            used: lastUsed,
            missing: lastMissing,
            all: atsKeywordsAll,
            debug: lastDebug,
            sections: getCvSectionPrefsSnapshot(),
            font: normalizeCvFontTheme(cvFontTheme)
          }));
        }catch(_){}
      }
    }

    function undoEdit(){
      if(!historyStack.length) return;
      const snap = historyStack.pop();
      restoreSnapshot(snap);
      updateUndoResetButtons();
      if($("tabChanges")?.classList?.contains("active")){ try{ renderChangesView(); }catch(_){ } }
    }

    function resetEdits(){
      if(!baseSnapshot) return;
      historyStack = [];
      restoreSnapshot(baseSnapshot);
      updateUndoResetButtons();
      if($("tabChanges")?.classList?.contains("active")){ try{ renderChangesView(); }catch(_){ } }
    }

    /* -------------------------
       Auth + boot
       ------------------------- */
    async function loadStateAndNav(){
      setBadge("authBadge","warn", uiLang==="de" ? "Prüfe…" : "Checking…");

      const auth = getAppAuth();
      session = auth ? await auth.getSession() : null;
      try{ if(session && session.access_token) sessionStorage.setItem("sb_access_token", session.access_token); }catch(_){ }
      if(!session || !session.user || !session.user.email){
        setBadge("authBadge","warn", uiLang==="de" ? "Abgemeldet" : "Signed out");
        try{ auth?.rememberPostAuthRedirect?.(window.location.pathname + window.location.search + window.location.hash); }catch(_){}
        window.location.replace("./signup.html?entry=cv-studio");
        return;
      }

      setBadge("authBadge","good", uiLang==="de" ? "Angemeldet" : "Signed in");

      // Ensure customer exists (best effort)
      try{
        await auth.requireAuthAndCustomer({ redirectTo: "./signup.html?entry=cv-studio" });
      }catch(_){}

      try{
        lastAccountState = await auth.syncStateToLocalStorage(session);
      }catch(_){}
      try{ H.hydrateAccountNav({ session, state: lastAccountState }); }catch(_){}
    }

    async function boot(){
      showError("");

      applyUiTexts();
      cvFontTheme = readCvFontTheme();
      applyCvFontUi();
      setStrengthUi();
      cvSectionPrefs = readCvSectionPrefs(lastCvDoc);
      renderSectionManager();

      // Step 1 Gate: if user didn't come from Jobs, start with job selection/paste as the main screen
      try{ setGateActive(shouldShowGate()); }catch(_){ }
      // If user clicked “Tailor in CV Studio” from Jobs, we arrive with ?job_id=...
      try{
        incomingJobId = String(qs("job_id") || "").trim();
      }catch(_){
        incomingJobId = "";
      }
      try{ setFromJobsUi(); }catch(_){}



      const auth = getAppAuth();
      if(!auth){
        showError("auth.js did not load. Ensure multipage/auth.js exists and is referenced as ./auth.js.");
        setBadge("authBadge","bad","Config error");
        return;
      }

      await loadStateAndNav();
      try{ await refreshCvStudioAccess(); }catch(_){ updateCvUsageUi(); }
      try{ maybeAutoOpenUpgradeModal(); }catch(_){}

      // restore saved template/strength
      try{
        const sv = localStorage.getItem("cv_strength");
        if(sv !== null && sv !== undefined && sv !== "") $("strengthRange").value = String(sv);
      }catch(_){}
      setStrengthUi();

      try{
        const tv = localStorage.getItem("cv_template");
        if(tv) $("tplSelect").value = tv;
      }catch(_){}
      setTemplateUi();

      // restore paste draft + job source (queue vs paste)
      loadJobSource();
      // Coming from Jobs: always use queue mode (even if last time was paste mode)
      if(incomingJobId){
        try{ jobSource = "queue"; }catch(_){}
        try{ localStorage.setItem("cvstudio_job_source", "queue"); }catch(_){}
      }

      loadPasteDraft();
      try{
        const extImport = consumeExtensionImport();
        if(extImport) applyExtensionImportToDraft(extImport);
      }catch(_){}

      if(pendingExtensionImport){
        try{ sessionStorage.removeItem("cvstudio_started"); }catch(_){}
        try{ setGateActive(true); }catch(_){}
        try{ setGateView("form"); }catch(_){}
      }

      applyPasteDraftToInputs();

      // apply initial mode UI
      setJobSource(jobSource);
      try{ updatePasteQuality(); }catch(_){}
      if(pendingExtensionImport){
        try{
          const host = pendingExtensionImport.source_host || "";
          const msg = host
            ? ("Imported job description from " + host + ". Review it, then click Tailor CV.")
            : "Imported job description from your browser extension. Review it, then click Tailor CV.";
          window.JobMeJobShared?.toast?.(msg, { kind:"good", title:"CV Studio" });
          setText("jobHint", msg);
          $("settingsDetails").open = true;
        }catch(_){}
      }

      // Restore focus mode preference (Setup collapsed)
      // In Step 1 gate we always keep Setup visible.
      if(!gateActive){
        try{
          const c = localStorage.getItem("cvstudio_setup_collapsed");
          if(String(c||"") === "1") setSetupCollapsed(true, { persist:false, scroll:false });
        }catch(_){ }
      }else{
        setSetupCollapsed(false, { persist:false, scroll:false });
      }

      
      // Coming from Jobs: ensure Setup is visible (so the user sees template/strength first)
      if(incomingJobId){
        try{ setSetupCollapsed(false, { persist:false, scroll:false }); }catch(_){}
        setupUserToggled = true;
        try{ $("settingsDetails").open = true; }catch(_){}
      }

// load queue
      await loadQueue();
      try{ armAutoStartFromJobs(); }catch(_){ }

      try{ updateSourceChip(); }catch(_){}

      // initial output state
      renderKeywords();
      setTabs("preview");
      markSteps("idle");
      setOutputEnabled(hasGeneratedOutput());
      try{
        const savedMode = (localStorage.getItem("jmj_cv_mode") || "").trim();
        if(gateActive) setStudioMode("tailor", { persist:false });
        else if(savedMode) setStudioMode(savedMode);
      }catch(_){}
      updateUndoResetButtons();
    }

    /* -------------------------
       Wire UI
       ------------------------- */
    $("jobSelect").addEventListener("change", onJobChange);
// Setup panel collapse (focus mode)
$("btnCollapseSetup")?.addEventListener("click", () => {
  setupUserToggled = true;
  setSetupCollapsed(true);
});
$("btnShowSetup")?.addEventListener("click", () => {
  setupUserToggled = true;
  setSetupCollapsed(false, { scroll:false });
});

// “How it works” (steps) modal
$("btnHowItWorks")?.addEventListener("click", () => openGenModal(false));
$("genClose")?.addEventListener("click", closeGenModal);
$("genOk")?.addEventListener("click", closeGenModal);
$("genModal")?.addEventListener("click", (e) => { if(e.target && e.target.id === "genModal") closeGenModal(); });
$("strengthClose")?.addEventListener("click", closeStrengthModal);
$("strengthModal")?.addEventListener("click", (e) => { if(e.target && e.target.id === "strengthModal") closeStrengthModal(); });
$("startStrengthList")?.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-s]");
  if(!btn) return;
  const level = Number(btn.getAttribute("data-s"));
  if(Number.isNaN(level)) return;
  await startWithStrength(level);
});


    // Job source (queue vs paste)
    $("sourcePills").addEventListener("click", (e) => {
      const p = e.target.closest(".miniPill");
      if(!p) return;
      const src = String(p.getAttribute("data-src") || "queue");
      setJobSource(src);
    });

    // Pasted job description inputs
    ["pasteTitle","pasteCompany","pasteApply"].forEach((id) => {
      const el = $(id);
      if(!el) return;
      el.addEventListener("input", () => {
        savePasteDraft();
        refreshModeUi();
        try{ updateSourceChip(); }catch(_){}
      });
    });

    $("pasteLangHint").addEventListener("change", () => {
      savePasteDraft();
      updatePasteQuality();
    });

    $("pasteDesc").addEventListener("input", () => {
      savePasteDraft();
      updatePasteQuality();
      maybeAutoCollapseAfterPaste();
      try{ updateSourceChip(); }catch(_){}
    });

    $("strengthRange").addEventListener("input", setStrengthUi);
    $("strengthPills").addEventListener("click", (e) => {
      const p = e.target.closest(".miniPill");
      if(!p) return;
      $("strengthRange").value = String(p.getAttribute("data-s"));
      setStrengthUi();
    });

    $("tplSelect").addEventListener("change", setTemplateUi);
    document.querySelectorAll("[data-font-theme]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setCvFontTheme(btn.getAttribute("data-font-theme") || "serif");
      });
    });
    $("sectionManager")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-section-action]");
      if(btn){
        const row = btn.closest("[data-section-key]");
        const key = String(row?.getAttribute("data-section-key") || "");
        const action = String(btn.getAttribute("data-section-action") || "");
        if(!key || !action) return;
        if(action === "up") return moveSection(key, -1);
        if(action === "down") return moveSection(key, 1);
        if(action === "toggle") return toggleSectionVisibility(key);
        return;
      }
      const row = e.target.closest("[data-section-key]");
      const key = String(row?.getAttribute("data-section-key") || "");
      if(!key) return;
      setActiveSectionEditor(key);
    });
    $("sectionManager")?.addEventListener("keydown", (e) => {
      const row = e.target.closest("[data-section-key]");
      if(!row || e.target.closest("[data-section-action]")) return;
      if(e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      const key = String(row.getAttribute("data-section-key") || "");
      if(!key) return;
      setActiveSectionEditor(key);
    });
    $("sectionEditorPanel")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-section-editor-action]");
      if(!btn) return;
      handleSectionEditorAction(btn);
    });
    $("sectionEditorPanel")?.addEventListener("input", (e) => {
      const target = e.target.closest("[data-editor-kind]");
      if(!target) return;
      beginSectionEditorHistory(target);
      updateSectionDocFromEditorInput(target);
    });
    $("sectionEditorPanel")?.addEventListener("focusout", (e) => {
      const target = e.target.closest("[data-editor-kind]");
      if(!target) return;
      endSectionEditorHistory(target);
    });
    $("btnAddSection")?.addEventListener("click", () => {
      handleSectionEditorAction({ getAttribute: (name) => name === "data-section-editor-action" ? "add-custom-section" : "" });
    });
    $("btnResetSections")?.addEventListener("click", resetSectionPrefs);

    $("btnAtsInfo").addEventListener("click", () => H.showModal("atsModal"));
    $("atsClose").addEventListener("click", () => H.hideModal("atsModal"));
    $("atsOk").addEventListener("click", () => H.hideModal("atsModal"));
    $("atsModal").addEventListener("click", (e) => { if(e.target && e.target.id === "atsModal") H.hideModal("atsModal"); });

    $("btnUpgradeCv")?.addEventListener("click", (e) => {
      if(!isFreeCvLimitReached()) return;
      e.preventDefault();
      openUpgradeModal({ source:"top-upgrade" });
    });
    $("btnUpgradeBanner")?.addEventListener("click", () => openUpgradeModal({ source:"banner-upgrade" }));
    $("upgradeModalClose")?.addEventListener("click", closeUpgradeModal);
    $("upgradeModal")?.addEventListener("click", (e) => { if(e.target && e.target.id === "upgradeModal") closeUpgradeModal(); });
    $("upgradeStarterBtn")?.addEventListener("click", () => openUpgradeCheckout("starter"));
    $("upgradePlusBtn")?.addEventListener("click", () => openUpgradeCheckout("plus"));

    $("btnViewDesc").addEventListener("click", openDescModal);
    $("btnCopyDesc").addEventListener("click", async () => {
      try{
        await copyDesc();
        $("btnCopyDesc").textContent = t("copied");
        setTimeout(()=>{ $("btnCopyDesc").textContent = t("btnCopyDesc"); }, 900);
      }catch(_){}
    });

    $("descClose").addEventListener("click", () => H.hideModal("descModal"));
    $("descModal").addEventListener("click", (e) => { if(e.target && e.target.id === "descModal") H.hideModal("descModal"); });
    $("descCopy").addEventListener("click", async () => {
      if(!selectedDesc) return;
      await copyDesc();
      $("descCopy").textContent = t("copied");
      setTimeout(()=>{ $("descCopy").textContent = t("copy"); }, 900);
    });

    document.addEventListener("keydown", (e) => {
      if(e.key === "Escape"){
        closeStrengthModal();
        closeUpgradeModal();
        H.hideModal("atsModal");
        H.hideModal("descModal");
        H.hideModal("kwModal");
        H.hideModal("qaModal");
        H.hideModal("activityModal");
        closeGenModal();
        if(isKwInlineOpen()) closeKwModal();
      }
    });

    $("btnGenerate").addEventListener("click", openStrengthModal);
    $("btnGenerateAgain").addEventListener("click", openStrengthModal);

    // “New CV” returns to Step 1 (chooser)
    $("btnNewCv")?.addEventListener("click", openGateForNewCv);

    // Jobs-entry hint controls
    $("btnCancelAuto")?.addEventListener("click", () => cancelAutoStart(true));


    // Step 1 chooser cards
    $("gatePickQueue")?.addEventListener("click", () => {
      try{ setJobSource("queue"); }catch(_){}
      setGateView("form");
      setTimeout(() => { try{ $("jobSelect")?.focus(); }catch(_){ } }, 60);
    });

    $("gatePickPaste")?.addEventListener("click", () => {
      try{ setJobSource("paste"); }catch(_){}
      setGateView("form");
      setTimeout(() => { try{ $("pasteDesc")?.focus(); }catch(_){ } }, 60);
    });

    // Back to the two-option chooser
    $("gateBackBtn")?.addEventListener("click", () => {
      setGateView("choose");
      setTimeout(() => { try{ $("gatePickQueue")?.focus(); }catch(_){ } }, 40);
    });


    
    // Studio mode buttons
    $("modeTailor")?.addEventListener("click", () => setStudioMode("tailor"));
    $("modeEdit")?.addEventListener("click", () => setStudioMode("edit"));
    $("modeReview")?.addEventListener("click", () => setStudioMode("review"));
    $("modeCustomize")?.addEventListener("click", () => setStudioMode("customize"));

    // Top-bar download menu hooks (reuse existing buttons)
    function closeStudioDownloadMenu(){
      const d = $("studioDownloadDrop");
      if(d) d.open = false;
    }
    $("studioActCopy")?.addEventListener("click", () => { closeStudioDownloadMenu(); $("btnCopy")?.click(); });
    $("studioActDownload")?.addEventListener("click", () => { closeStudioDownloadMenu(); $("btnDownload")?.click(); });
    $("studioActPrint")?.addEventListener("click", () => { closeStudioDownloadMenu(); $("btnPrint")?.click(); });
    $("studioActQa")?.addEventListener("click", () => { closeStudioDownloadMenu(); $("btnQa")?.click(); });

    // AI Review panel buttons
    $("btnRunReview")?.addEventListener("click", () => $("btnQa")?.click());
    $("btnOpenReview")?.addEventListener("click", () => $("btnQa")?.click());

    // Zoom controls (Preview)
    let zoom = 1.0;
    let zoomUserSet = false;
    let hadSavedZoom = false;

    function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

    function computeFitZoom(){
      const stage = $("pageStageMain") || document.querySelector(".pageStage");
      const page = $("cvPreview");
      if(!stage || !page) return 1.0;

      const avail = Math.max(320, stage.clientWidth - 24);
      const base = page.offsetWidth || page.getBoundingClientRect().width || 0;
      if(!base) return 1.0;

      const z = avail / base;
      return clamp(z, 0.65, 1.35);
    }

    function applyZoom(persist = true){
      const z = $("pageZoom");
      if(z) z.style.transform = "scale(" + zoom.toFixed(2) + ")";
      const pct = $("zoomPct");
      if(pct) pct.textContent = Math.round(zoom * 100) + "%";
      if(persist){
        try { localStorage.setItem("jmj_cv_zoom", String(zoom)); } catch(_) {}
      }
      if(isKwInlineOpen()){
        try{
          requestAnimationFrame(() => positionKwInlineCard());
        }catch(_){
          positionKwInlineCard();
        }
      }
    }

    try{
      const saved = Number(localStorage.getItem("jmj_cv_zoom") || "");
      if(saved && isFinite(saved)){
        zoom = clamp(saved, 0.55, 1.65);
        hadSavedZoom = true;
      }
    }catch(_){}

    if(!hadSavedZoom){
      zoom = computeFitZoom();
    }

    $("zoomIn")?.addEventListener("click", () => {
      zoomUserSet = true;
      zoom = clamp(zoom + 0.1, 0.55, 1.65);
      applyZoom(true);
    });
    $("zoomOut")?.addEventListener("click", () => {
      zoomUserSet = true;
      zoom = clamp(zoom - 0.1, 0.55, 1.65);
      applyZoom(true);
    });

    window.addEventListener("resize", () => {
      if(hadSavedZoom || zoomUserSet){
        if(isKwInlineOpen()){
          try{
            requestAnimationFrame(() => positionKwInlineCard());
          }catch(_){
            positionKwInlineCard();
          }
        }
        return;
      }
      zoom = computeFitZoom();
      applyZoom(false);
    });

    applyZoom(hadSavedZoom);
    $("zoomOut")?.addEventListener("click", () => { zoom = clamp(zoom - 0.1, 0.6, 1.4); applyZoom(); });
    applyZoom();

$("tabPreview")?.addEventListener("click", () => setTabs("preview"));
    $("tabText")?.addEventListener("click", () => setTabs("text"));
    $("tabChanges")?.addEventListener("click", () => setTabs("changes"));

    $("btnCopy").addEventListener("click", () => copyCv());
    $("btnDownload").addEventListener("click", () => onExportClick("download"));
    $("btnPrint").addEventListener("click", () => onExportClick("print"));
    $("btnQa").addEventListener("click", () => openQaModal(""));
    $("qaCloseX").addEventListener("click", closeQaModal);
    $("qaClose").addEventListener("click", closeQaModal);
    $("qaRunAgain").addEventListener("click", runQaCheck);
    $("qaContinue").addEventListener("click", () => {
      const kind = qaPendingAction;
      closeQaModal();
      if(kind === "print") return exportPdf();
      if(kind === "download") return downloadTxt();
    });
    $("qaFixes").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-fix]");
      if(!btn) return;
      const fixId = btn.getAttribute("data-fix") || "";
      applyQaFix(fixId);
    });

    $("btnCopyMissing").addEventListener("click", copyMissing);

    // Track manual text edits -> recompute keyword coverage
    $("cvText").addEventListener("input", () => {
      // If user edits text manually, keep keywords in sync
      recomputeCoverageFromCurrentText();
      // We do not mutate doc here to avoid confusion; Preview stays as last doc.
      if($("tabChanges")?.classList?.contains("active")){ try{ renderChangesView(); }catch(_){ } }
      try{ updateQaDot(); }catch(_){ }
    });

    // Keyword chips click
    $("chipsMissing").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-kw]");
      if(!btn) return;
      const kw = btn.getAttribute("data-kw") || "";
      if(!kw) return;
      if(!lastCvDoc && !($("cvText").value||"").trim()){
        showError(t("needCv"));
        return;
      }
      openKwInline(kw);
    });

    $("cvPreviewWrap").addEventListener("click", (e) => {
      const action = e.target.closest("[data-kw-inline-action]");
      if(action){
        const kind = action.getAttribute("data-kw-inline-action") || "";
        if(kind === "close"){
          closeKwModal();
          return;
        }
        if(kind === "apply"){
          applyKeyword();
          return;
        }
        if(kind === "rewrite"){
          onKwRewriteAgain();
          return;
        }
      }

      if(!isKwInlineOpen()) return;
      if(e.target.closest(".kwInlineCard")) return;

      const bullet = e.target.closest(".cvBulletItem[data-exp-index][data-bullet-index]");
      if(!bullet) return;

      const expIdx = Number(bullet.getAttribute("data-exp-index") || "0");
      const bulletIdx = Number(bullet.getAttribute("data-bullet-index") || "0");
      const current = getKwSelectedBullet();
      const sameBullet = current.expIdx === expIdx && current.bulletIdx === bulletIdx;

      if(!sameBullet){
        setKwSelectedBullet(expIdx, bulletIdx);
        resetKwRewriteVariants();
      }

      kwInlinePickMode = false;
      updateKwPreview();
      scrollKwSelectedBulletIntoView();

      if(!sameBullet){
        void refreshKwInlineDraft({ force:false, source:"preview-click" });
      }
    });

    $("cvPreview").addEventListener("keydown", (e) => {
      if(!isKwInlineOpen()) return;
      if(!(e.key === "Enter" || e.key === " ")) return;
      const bullet = e.target.closest(".cvBulletItem[data-exp-index][data-bullet-index]");
      if(!bullet) return;
      e.preventDefault();
      bullet.click();
    });

    // Undo / Reset
    $("btnUndoEdit").addEventListener("click", undoEdit);
    $("btnUndoFromChanges").addEventListener("click", () => { undoEdit(); renderChangesView(); });
    $("btnResetFromChanges").addEventListener("click", () => { resetEdits(); renderChangesView(); });
    $("btnCopyChangeSummary").addEventListener("click", copyChangeSummary);
    $("btnCopyDiff").addEventListener("click", copyDiffToClipboard);
    $("btnSyncTextToDoc").addEventListener("click", syncTextToPreview);

    // Change cards revert clicks (event delegation)
    $("changeCards").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-revert-id]");
      if(!btn) return;
      const id = btn.getAttribute("data-revert-id") || "";
      if(!id) return;
      revertStructuredChange(id);
    });

    $("btnResetEdits").addEventListener("click", resetEdits);

    // Keyword modal wiring
    $("kwClose").addEventListener("click", closeKwModal);
    $("kwCancel").addEventListener("click", closeKwModal);
    $("kwModal").addEventListener("click", (e) => { if(e.target && e.target.id === "kwModal") closeKwModal(); });

	    $("kwTarget").addEventListener("change", () => {
	      updateKwTargetUi();
	      try{ resetKwRewriteVariants(); updateKwRewriteUi(); }catch(_){ }
	      updateKwPreview();
	      if(kwMode === "ai" && activeKeywordRaw && lastCvDoc && isKwAdvancedOpen()){
	        try{ aiRecommendPlacement({ force:true, source:"target" }); }catch(_){ }
	      }
	    });
	    $("kwLang").addEventListener("change", () => {
	      try{ resetKwRewriteVariants(); updateKwRewriteUi(); }catch(_){ }
	      updateKwPreview();
	      if(kwMode === "ai" && activeKeywordRaw && lastCvDoc && isKwAdvancedOpen()){
	        try{ aiRecommendPlacement({ force:true, source:"lang" }); }catch(_){ }
	      }
	    });

    $("kwAiRecoRefresh").addEventListener("click", () => {
      if(kwMode === "ai" && activeKeywordRaw && lastCvDoc){
        try{ aiRecommendPlacement({ force:true, source:"refresh" }); }catch(_){ }
      }
    });

	    $("kwModeToggle").addEventListener("click", (e) => {
	      const b = e.target.closest("button[data-mode]");
	      if(!b) return;
	      setKwMode(b.getAttribute("data-mode"));
	    });
	    $("kwAdvancedDetails")?.addEventListener("toggle", () => {
	      if($("kwAdvancedDetails")?.open && kwMode === "ai" && activeKeywordRaw && lastCvDoc){
	        try{ aiRecommendPlacement({ force:false, source:"advanced" }); }catch(_){ }
	      }
	    });

    $("kwSkillGroup").addEventListener("change", updateKwPreview);
    $("kwExpRole").addEventListener("change", () => {
      fillBulletsForSelectedRole();
      try{ resetKwRewriteVariants(); updateKwRewriteUi(); }catch(_){ }
      updateKwPreview();
      if(isKwInlineOpen()) void refreshKwInlineDraft({ force:false, source:"role-change" });
    });
    $("kwExpHow").addEventListener("change", updateKwExpHowUi);
    $("kwExpBullet").addEventListener("change", () => {
      const expIdx = Number($("kwExpRole").value || "0");
      const exp = (Array.isArray(lastCvDoc?.experience) ? lastCvDoc.experience : [])[expIdx] || null;
      const bullets = asStringArr(exp?.bullets, 50);
      const i = Number($("kwExpBullet").value || "0");
      $("kwBulletPreview").textContent = bullets[i] || "—";
      try{ resetKwRewriteVariants(); updateKwRewriteUi(); }catch(_){ }
      updateKwPreview();
      if(isKwInlineOpen()) void refreshKwInlineDraft({ force:false, source:"bullet-change" });
    });
    
    $("kwAutoPick").addEventListener("click", () => {
      if(!lastCvDoc || !activeKeywordRaw) return;
      const best = pickBestRoleAndBullet(activeKeywordRaw);
      $("kwExpRole").value = String(best.expIdx || 0);
      fillBulletsForSelectedRole();
      $("kwExpBullet").value = String(best.bulletIdx || 0);
      const e = (Array.isArray(lastCvDoc?.experience) ? lastCvDoc.experience : [])[Number(best.expIdx||0)] || null;
      const bullets = asStringArr(e?.bullets, 50);
      $("kwBulletPreview").textContent = bullets[Number(best.bulletIdx||0)] || "—";
      const badge = $("kwAutoPickBadge");
      if(badge){
        badge.textContent = (best.score != null && best.score >= 0) ? ("Score " + best.score) : "—";
        badge.className = "badge " + ((best.score || 0) >= 4 ? "good" : "warn");
      }
      try{ resetKwRewriteVariants(); updateKwRewriteUi(); }catch(_){ }
      updateKwPreview();
      if(isKwInlineOpen()) void refreshKwInlineDraft({ force:false, source:"auto-pick" });
    });
$("kwNote").addEventListener("input", updateKwPreview);
    
    $("kwRewriteAgain").addEventListener("click", onKwRewriteAgain);
    $("kwRewriteOptions").addEventListener("click", (e) => {
      const opt = e.target.closest(".altOption");
      if(!opt) return;
      const id = opt.getAttribute("data-id") || "reco";
      kwRewriteSelected = id;
      renderKwRewriteOptions();
      updateKwPreview();
    });
$("kwApply").addEventListener("click", applyKeyword);


    /* -------------------------
       Nav: Activity log modal
       ------------------------- */
    function activityBadge(type){
      const t = String(type || "").toLowerCase();
      if(t === "applied") return { cls:"good", label:"Applied" };
      if(t === "sent") return { cls:"good", label:"Sent" };
      if(t === "rejected") return { cls:"bad", label:"Rejected" };
      if(t === "skipped") return { cls:"warn", label:"Skipped" };
      if(t === "prioritized") return { cls:"prio", label:"Prioritized" };
      if(t === "queued") return { cls:"warn", label:"Queued" };
      if(t === "new") return { cls:"warn", label:"New" };
      return { cls:"", label:(type || "Event") };
    }

    function fmtWhen(ts){
      try{
        if(!ts) return "—";
        const d = new Date(ts);
        if(Number.isNaN(d.getTime())) return String(ts);
        return d.toLocaleString();
      }catch(_){
        return String(ts || "—");
      }
    }

    function renderActivityList(items, kind){
      const arr = Array.isArray(items) ? items : [];
      if(!arr.length){
        return '<span class="badge warn">No activity yet</span>';
      }

      const html = arr.slice(0, 20).map((row) => {
        const evType = kind === "applications" ? String(row.status || "new") : String(row.event_type || "");
        const b = activityBadge(evType);

        const job = (kind === "applications" ? (row.job || {}) : (row.job || {})) || {};
        const title = String(job.title || "Untitled");
        const company = String(job.company_name || job.company || "—");
        const loc = [job.city || "", job.region || ""].filter(Boolean).join(", ") || "—";
        const when = kind === "applications" ? (row.updated_at || row.created_at) : row.created_at;
        const link = job.apply_url ? String(job.apply_url) : "";
        const titleHtml = link
          ? ('<a href="'+H.escapeHtml(link)+'" target="_blank" rel="noopener">'+H.escapeHtml(title)+'</a>')
          : H.escapeHtml(title);

        let meta = "";
        try{
          if(kind !== "applications" && row.meta && typeof row.meta === "object"){
            if(row.meta.channel) meta = "via " + String(row.meta.channel);
            if(row.meta.reason_code) meta = meta ? (meta + " • reason: " + String(row.meta.reason_code)) : ("reason: " + String(row.meta.reason_code));
          }
        }catch(_){}

        return (
          '<div class="activityItem">' +
            '<div class="activityTop">' +
              '<div class="activityTitle">' + titleHtml + '</div>' +
              '<span class="badge ' + H.escapeHtml(b.cls) + '">' + H.escapeHtml(b.label) + '</span>' +
            '</div>' +
            '<div class="activityMeta">' +
              '<span>' + H.escapeHtml(company) + '</span>' +
              '<span>•</span>' +
              '<span>' + H.escapeHtml(loc) + '</span>' +
              '<span>•</span>' +
              '<span>' + H.escapeHtml(fmtWhen(when)) + '</span>' +
              (meta ? ('<span class="mono">• ' + H.escapeHtml(meta) + '</span>') : '') +
            '</div>' +
          '</div>'
        );
      }).join("");

      return '<div class="activityList">' + html + '</div>';
    }

    async function loadActivityLog(){
      H.showTopError("activityError", "");
      const wrap = $("activityWrap");
      if(wrap) wrap.innerHTML = '<div class="modalMonoBox">Loading…</div>';

      const token = session && session.access_token ? String(session.access_token) : "";
      if(!token){
        H.showTopError("activityError", "You are signed out. Please sign in again.");
        if(wrap) wrap.innerHTML = "";
        return;
      }

      const et = String($("activityFilter")?.value || "").trim();
      const headers = { Authorization: "Bearer " + token };

      // 1) Try timeline endpoint first
      try{
        let url = API_BASE + "/me/application-events?limit=20";
        if(et) url += "&event_type=" + encodeURIComponent(et);

        const res = await fetch(url, { method:"GET", headers });
        const text = await res.text().catch(()=> "");
        let json = null;
        try{ json = JSON.parse(text); }catch{ json = { raw: text }; }

        if(!res.ok){
          const msg = (json && (json.error || json.message)) ? String(json.error || json.message) : (text || ("HTTP " + res.status));
          throw new Error(msg);
        }

        const items = Array.isArray(json?.data) ? json.data : [];
        if(wrap) wrap.innerHTML = renderActivityList(items, "events");
        return;
      }catch(e){
        // fallback below
      }

      // 2) Fallback: applications list
      try{
        const map = { queued:"new", prioritized:"new", applied:"applied", rejected:"rejected", skipped:"skipped", sent:"applied" };
        let url = API_BASE + "/me/applications?limit=20";
        if(et && map[et]) url += "&status=" + encodeURIComponent(map[et]);

        const res = await fetch(url, { method:"GET", headers });
        const text = await res.text().catch(()=> "");
        let json = null;
        try{ json = JSON.parse(text); }catch{ json = { raw: text }; }

        if(!res.ok){
          const msg = (json && (json.error || json.message)) ? String(json.error || json.message) : (text || ("HTTP " + res.status));
          throw new Error(msg);
        }

        const items = Array.isArray(json?.data) ? json.data : [];
        if(wrap) wrap.innerHTML = renderActivityList(items, "applications");
      }catch(e){
        H.showTopError("activityError", e?.message || String(e));
        if(wrap) wrap.innerHTML = '<span class="badge bad">Activity failed</span>';
      }
    }

    function openActivityModal(){
      const dd = $("navAccount");
      if(dd) dd.open = false;
      H.showModal("activityModal");
      loadActivityLog().catch((e) => {
        H.showTopError("activityError", e?.message || String(e));
      });
    }

    function closeActivityModal(){
      H.hideModal("activityModal");
      H.showTopError("activityError", "");
    }


    // Activity modal wiring (available from the Account dropdown)
    $("navActivity")?.addEventListener("click", openActivityModal);
    $("activityCloseX")?.addEventListener("click", closeActivityModal);
    $("activityClose")?.addEventListener("click", closeActivityModal);
    $("activityModal")?.addEventListener("click", (e) => { if(e.target && e.target.id === "activityModal") closeActivityModal(); });
    $("activityRefresh")?.addEventListener("click", () => loadActivityLog().catch(()=>{}));
    $("activityFilter")?.addEventListener("change", () => loadActivityLog().catch(()=>{}));

    // Initial view
    setTabs("preview");
    markSteps("idle");

    // Initial studio mode
    try{
      const savedMode = (localStorage.getItem("jmj_cv_mode") || "").trim();
      setStudioMode(savedMode || "tailor");
    }catch(_){
      setStudioMode("tailor");
    }


    window.addEventListener("load", () => {
      boot().catch((e) => {
        showError(e?.message || String(e));
        setBadge("authBadge","bad","Error");
      });
    });

  })();
  
