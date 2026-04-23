(() => {
  "use strict";

  const CHECK_ICON = "\u2713";

  // Edit keyword labels, score deltas, and overlay positions here.
  // Root position values are tied to the screenshot dimensions.
  // Slot positions are percentages relative to the clipped CV overlay root.
  const CV_STUDIO_PREVIEW_DEMO = Object.freeze({
    screenshotWidth: 1800,
    cvOverlayRoot: Object.freeze({
      top: "4.9%",
      left: "2.6%",
      width: "49.8%",
      height: "88.3%"
    }),
    initialScore: 43,
    maxScore: 50,
    keywords: Object.freeze([
      Object.freeze({
        id: "workflow-improvements",
        label: "Workflow Improvements",
        insertedText: "Delivered workflow improvements that reduced process friction and improved team efficiency.",
        highlightText: "workflow improvements",
        scoreDelta: 2,
        chipPosition: Object.freeze({
          top: "53.3%",
          left: "79.8%",
          width: "17.5%",
          height: "4.2%"
        }),
        cvSlotPosition: Object.freeze({
          top: "41.393%",
          left: "5.984%",
          width: "83.032%",
          height: "7.418%",
          tone: "selected"
        }),
        textStyle: Object.freeze({
          fontSize: "13.2px",
          lineHeight: "18.0px",
          paddingTop: "0px",
          paddingRight: "14px",
          paddingBottom: "0px",
          paddingLeft: "0px",
          letterSpacing: "-0.012em",
          fontWeight: "600"
        })
      }),
      Object.freeze({
        id: "compliance",
        label: "Compliance",
        insertedText: "Supported compliance-focused operations and maintained process consistency across teams.",
        highlightText: "compliance",
        scoreDelta: 1,
        chipPosition: Object.freeze({
          top: "58.2%",
          left: "76.5%",
          width: "12.4%",
          height: "4.2%"
        }),
        cvSlotPosition: Object.freeze({
          top: "75.821%",
          left: "5.863%",
          width: "83.233%",
          height: "7.305%",
          tone: "paper"
        }),
        textStyle: Object.freeze({
          fontSize: "13.0px",
          lineHeight: "17.8px",
          paddingTop: "0px",
          paddingRight: "14px",
          paddingBottom: "0px",
          paddingLeft: "0px",
          letterSpacing: "-0.012em",
          fontWeight: "590"
        })
      }),
      Object.freeze({
        id: "governance",
        label: "Governance",
        insertedText: "Contributed to governance-aligned reporting and operational decision support.",
        highlightText: "governance",
        scoreDelta: 2,
        chipPosition: Object.freeze({
          top: "58.2%",
          left: "87.1%",
          width: "11.3%",
          height: "4.2%"
        }),
        cvSlotPosition: Object.freeze({
          top: "90.204%",
          left: "5.924%",
          width: "82.129%",
          height: "6.965%",
          tone: "paper"
        }),
        textStyle: Object.freeze({
          fontSize: "12.8px",
          lineHeight: "17.4px",
          paddingTop: "0px",
          paddingRight: "12px",
          paddingBottom: "0px",
          paddingLeft: "0px",
          letterSpacing: "-0.012em",
          fontWeight: "590"
        })
      })
    ])
  });

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function easeOutCubic(value) {
    return 1 - Math.pow(1 - value, 3);
  }

  function translate(key, vars, fallback) {
    try {
      if (window.JobMeJobShared && typeof window.JobMeJobShared.tt === "function") {
        return window.JobMeJobShared.tt(key, vars || {}, fallback || key);
      }
      if (window.JobMeJobI18n && typeof window.JobMeJobI18n.t === "function") {
        return window.JobMeJobI18n.t(key, vars || {}, fallback || key);
      }
    } catch (_) {}
    return fallback || key;
  }

  function setBoxStyles(element, box) {
    if (!element || !box) return;
    if (box.top) element.style.top = box.top;
    if (box.left) element.style.left = box.left;
    if (box.right) element.style.right = box.right;
    if (box.bottom) element.style.bottom = box.bottom;
    if (box.width) element.style.width = box.width;
    if (box.height) element.style.height = box.height;
  }

  function setTextStyles(element, styles) {
    if (!element || !styles) return;
    if (styles.fontSize) element.style.setProperty("--demo-font-size", styles.fontSize);
    if (styles.lineHeight) element.style.setProperty("--demo-line-height", styles.lineHeight);
    if (styles.paddingTop) element.style.setProperty("--demo-padding-top", styles.paddingTop);
    if (styles.paddingRight) element.style.setProperty("--demo-padding-right", styles.paddingRight);
    if (styles.paddingBottom) element.style.setProperty("--demo-padding-bottom", styles.paddingBottom);
    if (styles.paddingLeft) element.style.setProperty("--demo-padding-left", styles.paddingLeft);
    if (styles.letterSpacing) element.style.setProperty("--demo-letter-spacing", styles.letterSpacing);
    if (styles.fontWeight) element.style.setProperty("--demo-font-weight", styles.fontWeight);
  }

  function highlightInsertedText(text, highlightText) {
    const safeText = escapeHtml(text);
    const needle = String(highlightText || "").trim();
    if (!needle) return safeText;
    const escapedNeedle = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedNeedle, "i");
    return safeText.replace(regex, (match) => `<mark>${match}</mark>`);
  }

  function buildDesktopChip(keyword) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "demo-chip-hit";
    button.setAttribute("data-demo-keyword", keyword.id);
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `Add ${keyword.label}`);
    setBoxStyles(button, keyword.chipPosition);

    const label = document.createElement("span");
    label.className = "demo-chip-hit-label";

    const icon = document.createElement("span");
    icon.className = "demo-chip-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = CHECK_ICON;

    const text = document.createElement("span");
    text.textContent = keyword.label;

    label.appendChild(icon);
    label.appendChild(text);
    button.appendChild(label);

    return button;
  }

  function buildMobileChip(keyword) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "demo-mobile-chip";
    button.setAttribute("data-demo-keyword", keyword.id);
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `Add ${keyword.label}`);

    const icon = document.createElement("span");
    icon.className = "demo-chip-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = CHECK_ICON;

    const text = document.createElement("span");
    text.textContent = keyword.label;

    button.appendChild(icon);
    button.appendChild(text);

    return button;
  }

  function buildInsert(keyword) {
    const block = document.createElement("div");
    block.className = "demo-bullet-slot";
    block.setAttribute("data-demo-insert", keyword.id);
    block.setAttribute("data-tone", keyword.cvSlotPosition.tone || "paper");
    setBoxStyles(block, keyword.cvSlotPosition);
    setTextStyles(block, keyword.textStyle);
    const copy = document.createElement("div");
    copy.className = "demo-bullet-copy";
    copy.innerHTML = highlightInsertedText(keyword.insertedText, keyword.highlightText);
    block.appendChild(copy);
    return block;
  }

  function initDemo(root) {
    if (!root || root.dataset.demoReady === "true") return;
    root.dataset.demoReady = "true";

    const frame = root.querySelector("[data-cv-demo]");
    const screenshot = root.querySelector(".demo-screenshot");
    const chipOverlay = root.querySelector("[data-demo-chip-overlay]");
    const cvOverlayRoot = root.querySelector("[data-demo-cv-overlay-root]");
    const cvOverlay = root.querySelector("[data-demo-cv-overlay]");
    const mobileRail = root.querySelector("[data-demo-mobile-chips]");
    const resetButton = root.querySelector("[data-demo-reset]");
    const announcer = root.querySelector("[data-demo-announcer]");
    const scoreBadge = root.querySelector(".demo-score-badge");
    const scoreValue = root.querySelector("[data-demo-score-value]");
    const scoreDelta = root.querySelector("[data-demo-score-delta]");
    const scoreMeter = root.querySelector("[data-demo-score-meter]");

    if (!frame || !chipOverlay || !cvOverlayRoot || !cvOverlay || !mobileRail || !resetButton || !scoreBadge || !scoreValue || !scoreDelta || !scoreMeter) {
      return;
    }

    setBoxStyles(cvOverlayRoot, CV_STUDIO_PREVIEW_DEMO.cvOverlayRoot);

    mobileRail.setAttribute(
      "aria-label",
      translate("pages.index.preview.keywordsAria", {}, "Missing keywords to add")
    );

    const state = {
      score: CV_STUDIO_PREVIEW_DEMO.initialScore,
      animatedScore: CV_STUDIO_PREVIEW_DEMO.initialScore,
      addedKeywordIds: new Set(),
      pendingKeywordIds: new Set(),
      activationTimers: new Map(),
      scoreFrame: 0
    };

    const keywordById = new Map();
    const desktopButtons = new Map();
    const mobileButtons = new Map();
    const inserts = new Map();
    let resizeObserver = null;

    function announce(message) {
      if (announcer) announcer.textContent = message;
    }

    function updateOverlayScale() {
      const width = screenshot && screenshot.clientWidth ? screenshot.clientWidth : frame.clientWidth;
      const rawScale = width > 0 ? width / CV_STUDIO_PREVIEW_DEMO.screenshotWidth : 1;
      const scale = clamp(rawScale, 0.28, 1);
      cvOverlayRoot.style.setProperty("--demo-scale", String(scale));
    }

    function setAnimatedScore(value) {
      const rounded = Math.round(value);
      scoreValue.textContent = `${rounded}%`;
      const meterScale = clamp((value - 30) / 20, 0.24, 1);
      scoreMeter.style.transform = `scaleX(${meterScale.toFixed(3)})`;
    }

    function animateScore(nextValue) {
      const from = state.animatedScore;
      const to = nextValue;
      if (state.scoreFrame) cancelAnimationFrame(state.scoreFrame);
      if (from === to) {
        setAnimatedScore(to);
        return;
      }

      const startedAt = performance.now();
      const duration = 320;

      function step(now) {
        const progress = clamp((now - startedAt) / duration, 0, 1);
        state.animatedScore = from + ((to - from) * easeOutCubic(progress));
        setAnimatedScore(state.animatedScore);
        if (progress < 1) {
          state.scoreFrame = requestAnimationFrame(step);
        } else {
          state.animatedScore = to;
          setAnimatedScore(to);
          state.scoreFrame = 0;
        }
      }

      state.scoreFrame = requestAnimationFrame(step);
    }

    function updateUi() {
      const addedCount = state.addedKeywordIds.size;
      const delta = Math.max(0, state.score - CV_STUDIO_PREVIEW_DEMO.initialScore);

      scoreBadge.setAttribute("data-has-change", delta > 0 ? "true" : "false");
      scoreDelta.textContent = `+${delta}`;
      resetButton.disabled = addedCount === 0;

      for (const keyword of CV_STUDIO_PREVIEW_DEMO.keywords) {
        const isAdded = state.addedKeywordIds.has(keyword.id);
        const desktopButton = desktopButtons.get(keyword.id);
        const mobileButton = mobileButtons.get(keyword.id);
        const insert = inserts.get(keyword.id);
        const isPending = state.pendingKeywordIds.has(keyword.id);

        if (desktopButton) {
          desktopButton.classList.toggle("is-added", isAdded);
          desktopButton.disabled = isAdded;
          desktopButton.setAttribute("aria-pressed", isAdded ? "true" : "false");
          desktopButton.setAttribute("aria-disabled", isAdded ? "true" : "false");
          desktopButton.setAttribute(
            "aria-label",
            isAdded ? `${keyword.label} added` : `Add ${keyword.label}`
          );
        }

        if (mobileButton) {
          mobileButton.classList.toggle("is-added", isAdded);
          mobileButton.disabled = isAdded;
          mobileButton.setAttribute("aria-pressed", isAdded ? "true" : "false");
          mobileButton.setAttribute("aria-disabled", isAdded ? "true" : "false");
          mobileButton.setAttribute(
            "aria-label",
            isAdded ? `${keyword.label} added` : `Add ${keyword.label}`
          );
        }

        if (insert) {
          insert.classList.toggle("is-activating", isPending);
          insert.classList.toggle("is-visible", isAdded && !isPending);
        }
      }
    }

    function addKeyword(keywordId) {
      const keyword = keywordById.get(keywordId);
      if (!keyword) return;

      if (state.addedKeywordIds.has(keywordId)) {
        announce(
          translate(
            "pages.index.preview.announcements.alreadyAdded",
            { keyword: keyword.label, score: state.score },
            `${keyword.label} is already added. ATS match ${state.score}%.`
          )
        );
        return;
      }

      state.addedKeywordIds.add(keywordId);
      state.pendingKeywordIds.add(keywordId);

      updateUi();

      const activationTimer = window.setTimeout(() => {
        state.pendingKeywordIds.delete(keywordId);
        state.activationTimers.delete(keywordId);
        state.score = Math.min(
          CV_STUDIO_PREVIEW_DEMO.maxScore,
          state.score + Number(keyword.scoreDelta || 0)
        );

        updateUi();
        animateScore(state.score);

        announce(
          translate(
            "pages.index.preview.announcements.added",
            { keyword: keyword.label, score: state.score },
            `${keyword.label} added. ATS match ${state.score}%.`
          )
        );
      }, 300);

      state.activationTimers.set(keywordId, activationTimer);
    }

    function resetDemo() {
      if (state.scoreFrame) cancelAnimationFrame(state.scoreFrame);
      state.scoreFrame = 0;
      for (const activationTimer of state.activationTimers.values()) {
        try { window.clearTimeout(activationTimer); } catch (_) {}
      }
      state.activationTimers.clear();
      state.addedKeywordIds.clear();
      state.pendingKeywordIds.clear();
      state.score = CV_STUDIO_PREVIEW_DEMO.initialScore;
      updateUi();
      animateScore(state.score);
      announce(
        translate(
          "pages.index.preview.announcements.reset",
          { score: state.score },
          `Demo reset. ATS match ${state.score}%.`
        )
      );
    }

    for (const keyword of CV_STUDIO_PREVIEW_DEMO.keywords) {
      keywordById.set(keyword.id, keyword);

      const desktopButton = buildDesktopChip(keyword);
      const mobileButton = buildMobileChip(keyword);
      const insert = buildInsert(keyword);

      desktopButton.addEventListener("click", () => addKeyword(keyword.id));
      mobileButton.addEventListener("click", () => addKeyword(keyword.id));

      chipOverlay.appendChild(desktopButton);
      mobileRail.appendChild(mobileButton);
      cvOverlay.appendChild(insert);

      desktopButtons.set(keyword.id, desktopButton);
      mobileButtons.set(keyword.id, mobileButton);
      inserts.set(keyword.id, insert);
    }

    resetButton.addEventListener("click", resetDemo);

    updateUi();
    updateOverlayScale();
    setAnimatedScore(state.score);

    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(updateOverlayScale);
      resizeObserver.observe(frame);
      if (screenshot) resizeObserver.observe(screenshot);
    } else {
      window.addEventListener("resize", updateOverlayScale, { passive: true });
    }
  }

  function initAllDemos() {
    document.querySelectorAll(".cv-studio-demo-section").forEach(initDemo);
  }

  function boot() {
    const ready = window.JobMeJobI18n && typeof window.JobMeJobI18n.ready === "function"
      ? window.JobMeJobI18n.ready().catch(() => null)
      : Promise.resolve();

    ready.finally(initAllDemos);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
