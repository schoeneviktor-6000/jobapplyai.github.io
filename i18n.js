(() => {
  "use strict";

  const SUPPORTED_LOCALES = ["en", "de", "es", "ko"];
  const DEFAULT_LOCALE = "en";
  const LOCALE_COOKIE = "jm_locale";
  const LOCALE_STORAGE_KEY = "jm_locale_pref";
  const MARKET_COOKIE = "jm_market";
  const COUNTRY_COOKIE = "jm_country";
  const SUPPORTED_MARKETS = ["usd", "eur", "krw"];
  const DEFAULT_MARKET = "usd";
  const LOCALE_FORMAT_TAGS = Object.freeze({
    en: "en-US",
    de: "de-DE",
    es: "es-ES",
    ko: "ko-KR"
  });
  const LOCALIZED_PUBLIC_PATHS = new Set(["/", "/plan", "/signup", "/cv-studio"]);
  const LOCALE_TO_MARKET = Object.freeze({
    en: "usd",
    de: "eur",
    es: "eur",
    ko: "krw"
  });
  const MARKET_CONFIGS = Object.freeze({
    usd: Object.freeze({
      currency: "USD",
      prices: Object.freeze({
        free: 0,
        starter: 4,
        plus: 12
      })
    }),
    eur: Object.freeze({
      currency: "EUR",
      prices: Object.freeze({
        free: 0,
        starter: 3,
        plus: 9
      })
    }),
    krw: Object.freeze({
      currency: "KRW",
      prices: Object.freeze({
        free: 0,
        starter: 4500,
        plus: 13500
      })
    })
  });
  const LOCALE_LABELS_WITH_FLAGS = Object.freeze({
    en: "🇺🇸 English",
    de: "🇩🇪 Deutsch",
    es: "🇪🇸 Español",
    ko: "🇰🇷 한국어"
  });

  let currentLocale = null;
  let currentMarket = null;
  let currentCountry = null;
  let messages = null;
  let readyPromise = null;

  function normalizeLocale(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return DEFAULT_LOCALE;
    if (raw.startsWith("de")) return "de";
    if (raw.startsWith("es")) return "es";
    if (raw.startsWith("ko")) return "ko";
    if (raw.startsWith("en")) return "en";
    return DEFAULT_LOCALE;
  }

  function parseLocalePath(pathname) {
    const raw = String(pathname || "/").trim() || "/";
    const segments = raw.split("/").filter(Boolean);
    const first = segments[0] || "";
    const locale = SUPPORTED_LOCALES.includes(first) ? first : null;
    if (!locale) {
      return { locale: null, strippedPath: raw };
    }
    const rest = segments.slice(1).join("/");
    return {
      locale,
      strippedPath: rest ? `/${rest}` : "/"
    };
  }

  function normalizeLocalizedPagePath(pathname) {
    const raw = String(pathname || "/").trim() || "/";
    if (raw === "/index" || raw === "/index.html") return "/";
    if (raw === "/plan" || raw === "/plan.html") return "/plan";
    if (raw === "/signup" || raw === "/signup.html") return "/signup";
    if (raw === "/cv-studio" || raw === "/cv-studio.html") return "/cv-studio";
    return raw;
  }

  function normalizeCountry(value) {
    const raw = String(value || "").trim().toUpperCase();
    return /^[A-Z]{2}$/.test(raw) ? raw : "";
  }

  function normalizeMarket(value) {
    const raw = String(value || "").trim().toLowerCase();
    return SUPPORTED_MARKETS.includes(raw) ? raw : "";
  }

  function readCookie(name) {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : "";
  }

  function getCurrentLocale() {
    if (currentLocale) return currentLocale;
    const fromPath = parseLocalePath(window.location.pathname).locale;
    if (fromPath) {
      currentLocale = fromPath;
      return currentLocale;
    }
    try {
      const fromStorage = normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
      if (SUPPORTED_LOCALES.includes(fromStorage)) {
        currentLocale = fromStorage;
        return currentLocale;
      }
    } catch (_) {}
    currentLocale = DEFAULT_LOCALE;
    return currentLocale;
  }

  function localeLabelWithFlag(locale) {
    return LOCALE_LABELS_WITH_FLAGS[normalizeLocale(locale)] || LOCALE_LABELS_WITH_FLAGS[DEFAULT_LOCALE];
  }

  function getCurrentCountry() {
    if (currentCountry) return currentCountry;
    const fromHtml = normalizeCountry(document.documentElement.getAttribute("data-country"));
    if (fromHtml) {
      currentCountry = fromHtml;
      return currentCountry;
    }
    const fromCookie = normalizeCountry(readCookie(COUNTRY_COOKIE));
    if (fromCookie) {
      currentCountry = fromCookie;
      return currentCountry;
    }
    currentCountry = "";
    return currentCountry;
  }

  function getCurrentMarket() {
    if (currentMarket) return currentMarket;
    const fromHtml = normalizeMarket(document.documentElement.getAttribute("data-market"));
    if (fromHtml && SUPPORTED_MARKETS.includes(fromHtml)) {
      currentMarket = fromHtml;
      return currentMarket;
    }
    const fromCookie = normalizeMarket(readCookie(MARKET_COOKIE));
    if (fromCookie && SUPPORTED_MARKETS.includes(fromCookie)) {
      currentMarket = fromCookie;
      return currentMarket;
    }
    currentMarket = LOCALE_TO_MARKET[getCurrentLocale()] || DEFAULT_MARKET;
    return currentMarket;
  }

  function getMessage(obj, key, fallback = "") {
    const parts = String(key || "").split(".").filter(Boolean);
    let cursor = obj;
    for (const part of parts) {
      if (!cursor || typeof cursor !== "object" || !(part in cursor)) return fallback;
      cursor = cursor[part];
    }
    return typeof cursor === "string" ? cursor : fallback;
  }

  function interpolate(template, vars = {}) {
    return String(template || "").replace(/\{(\w+)\}/g, (_match, key) => {
      const value = vars[key];
      return value === null || typeof value === "undefined" ? "" : String(value);
    });
  }

  async function loadMessages(locale = getCurrentLocale()) {
    const normalized = normalizeLocale(locale);
    const res = await fetch(`/messages/${normalized}.json`, { cache: "force-cache" });
    if (!res.ok) throw new Error(`Failed to load messages for ${normalized}`);
    return await res.json();
  }

  function ensureReady() {
    if (readyPromise) return readyPromise;
    currentLocale = getCurrentLocale();
    readyPromise = loadMessages(currentLocale)
      .then((data) => {
        messages = data || {};
        return messages;
      })
      .catch(() => {
        currentLocale = DEFAULT_LOCALE;
        return loadMessages(DEFAULT_LOCALE).then((data) => {
          messages = data || {};
          return messages;
        });
      });
    return readyPromise;
  }

  function t(key, vars = {}, fallback = "") {
    const base = getMessage(messages || {}, key, fallback || key);
    return interpolate(base, vars);
  }

  function getLocaleFormatTag(locale = getCurrentLocale()) {
    return LOCALE_FORMAT_TAGS[normalizeLocale(locale)] || LOCALE_FORMAT_TAGS[DEFAULT_LOCALE];
  }

  function getCommerceConfig(locale = getCurrentLocale(), market = getCurrentMarket()) {
    const commerceRoot = messages && messages.common && messages.common.commerce && typeof messages.common.commerce === "object"
      ? messages.common.commerce
      : null;
    const marketKey = normalizeMarket(market) || LOCALE_TO_MARKET[normalizeLocale(locale)] || DEFAULT_MARKET;
    const marketConfig = MARKET_CONFIGS[marketKey] || MARKET_CONFIGS[DEFAULT_MARKET];
    const currency = marketConfig.currency;
    const perMonth = commerceRoot && typeof commerceRoot.perMonth === "string"
      ? commerceRoot.perMonth
      : "/ month";
    const readPrice = (plan) => {
      const value = Number(marketConfig.prices[plan]);
      return Number.isFinite(value) ? value : Number(MARKET_CONFIGS[DEFAULT_MARKET].prices[plan] || 0);
    };
    return {
      locale: normalizeLocale(locale),
      market: marketKey,
      currency,
      perMonth,
      prices: {
        free: readPrice("free"),
        starter: readPrice("starter"),
        plus: readPrice("plus")
      }
    };
  }

  function formatPrice(plan, locale = getCurrentLocale(), market = getCurrentMarket()) {
    const commerce = getCommerceConfig(locale, market);
    const amount = commerce.prices[String(plan || "").trim().toLowerCase()];
    if (!Number.isFinite(amount)) return "";
    try {
      return new Intl.NumberFormat(getLocaleFormatTag(locale), {
        style: "currency",
        currency: commerce.currency,
        maximumFractionDigits: Number.isInteger(amount) ? 0 : 2
      }).format(amount);
    } catch (_) {
      return `${commerce.currency} ${amount}`;
    }
  }

  function applyLocalizedPricing(root = document) {
    if (!messages) return;
    root.querySelectorAll("[data-price-plan]").forEach((el) => {
      const plan = String(el.getAttribute("data-price-plan") || "").trim().toLowerCase();
      const value = formatPrice(plan);
      if (value) el.textContent = value;
    });
  }

  function applyTranslations(root = document) {
    if (!messages) return;
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const value = key ? getMessage(messages, key) : "";
      if (value) el.textContent = value;
    });
    root.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const key = el.getAttribute("data-i18n-html");
      const value = key ? getMessage(messages, key) : "";
      if (value) el.innerHTML = value;
    });
    root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      const value = key ? getMessage(messages, key) : "";
      if (value) el.setAttribute("placeholder", value);
    });
    root.querySelectorAll("[data-i18n-content]").forEach((el) => {
      const key = el.getAttribute("data-i18n-content");
      const value = key ? getMessage(messages, key) : "";
      if (value) el.setAttribute("content", value);
    });
    root.querySelectorAll("[data-i18n-data-flag]").forEach((el) => {
      const key = el.getAttribute("data-i18n-data-flag");
      const value = key ? getMessage(messages, key) : "";
      if (value) el.setAttribute("data-flag", value);
    });
    root.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
      const key = el.getAttribute("data-i18n-aria-label");
      const value = key ? getMessage(messages, key) : "";
      if (value) el.setAttribute("aria-label", value);
    });
    root.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.getAttribute("data-i18n-title");
      const value = key ? getMessage(messages, key) : "";
      if (value) el.textContent = value;
    });
  }

  function buildLocalePath(locale, fullUrl = window.location.href) {
    const nextLocale = normalizeLocale(locale);
    const url = new URL(fullUrl, window.location.origin);
    const parsed = parseLocalePath(url.pathname);
    const basePath = parsed.locale ? parsed.strippedPath : url.pathname;
    const normalizedPath = normalizeLocalizedPagePath(basePath);
    const suffix = LOCALIZED_PUBLIC_PATHS.has(normalizedPath) ? (normalizedPath === "/" ? "/" : normalizedPath) : "/";
    return `/${nextLocale}${suffix}${url.search}${url.hash}`;
  }

  function persistLocale(locale) {
    const normalized = normalizeLocale(locale);
    try { localStorage.setItem(LOCALE_STORAGE_KEY, normalized); } catch (_) {}
    document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(normalized)}; path=/; max-age=31536000; SameSite=Lax`;
  }

  function hydrateLocaleSwitchers(root = document) {
    const locale = getCurrentLocale();
    root.querySelectorAll("[data-locale-current]").forEach((el) => {
      el.textContent = t(`common.localeNamesWithFlags.${locale}`, {}, localeLabelWithFlag(locale));
    });
    root.querySelectorAll("[data-locale-switcher]").forEach((switcher) => {
      const ariaKey = switcher.getAttribute("data-i18n-aria-label");
      if (ariaKey) {
        const value = t(ariaKey, {}, localeLabelWithFlag(locale));
        if (value) switcher.setAttribute("aria-label", value);
      }
      switcher.querySelectorAll("[data-locale-option]").forEach((link) => {
        const optionLocale = normalizeLocale(link.getAttribute("data-locale-option"));
        link.textContent = t(`common.localeNamesWithFlags.${optionLocale}`, {}, localeLabelWithFlag(optionLocale));
        link.setAttribute("href", buildLocalePath(optionLocale));
        link.addEventListener("click", () => persistLocale(optionLocale), { once: true });
      });
    });
  }

  function translateInternalAbsoluteLinks(root = document) {
    const locale = getCurrentLocale();
    root.querySelectorAll("a[href^='/']").forEach((link) => {
      const href = String(link.getAttribute("href") || "").trim();
      if (!href || href.startsWith("//")) return;
      if (/^\/(favicon|apple-touch-icon|site\.webmanifest|logo-|vendor\/|messages\/|worker-api\/)/i.test(href)) return;
      if (/^\/(en|de|es|ko)(\/|$)/i.test(href)) return;
      if (/^\/[^?#]+\.(png|jpg|jpeg|svg|ico|webmanifest|css|js)$/i.test(href)) return;
      link.setAttribute("href", `/${locale}${href}`);
    });
  }

  function setDocumentLanguage() {
    document.documentElement.setAttribute("lang", getCurrentLocale());
  }

  function ready() {
    return ensureReady();
  }

  window.JobMeJobI18n = {
    SUPPORTED_LOCALES,
    DEFAULT_LOCALE,
    LOCALE_COOKIE,
    normalizeLocale,
    normalizeMarket,
    getCurrentLocale,
    getCurrentMarket,
    getCurrentCountry,
    buildLocalePath,
    persistLocale,
    t,
    formatPrice,
    ready,
    applyTranslations,
    applyLocalizedPricing,
    hydrateLocaleSwitchers
  };

  document.addEventListener("DOMContentLoaded", () => {
    ensureReady().then(() => {
      setDocumentLanguage();
      applyTranslations();
      applyLocalizedPricing();
      translateInternalAbsoluteLinks();
      hydrateLocaleSwitchers();
    }).catch(() => {});
  });
})();
