import en from "../../messages/en.json";
import de from "../../messages/de.json";
import es from "../../messages/es.json";
import ko from "../../messages/ko.json";

export const SUPPORTED_LOCALES = Object.freeze(["en", "de", "es", "ko"]);
export const DEFAULT_LOCALE = "en";
export const LOCALE_COOKIE = "jm_locale";
export const MARKET_COOKIE = "jm_market";
export const COUNTRY_COOKIE = "jm_country";
export const MESSAGES = Object.freeze({ en, de, es, ko });
export const LOCALE_FORMAT_TAGS = Object.freeze({
  en: "en-US",
  de: "de-DE",
  es: "es-ES",
  ko: "ko-KR"
});
export const SUPPORTED_MARKETS = Object.freeze(["usd", "eur", "krw"]);
export const DEFAULT_MARKET = "usd";
export const LOCALE_TO_MARKET = Object.freeze({
  en: "usd",
  de: "eur",
  es: "eur",
  ko: "krw"
});
export const MARKET_CONFIGS = Object.freeze({
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
export const LOCALIZED_PUBLIC_PATHS = new Set([
  "/",
  "/plan",
  "/signup",
  "/cv-studio"
]);
export const NON_INDEXABLE_PATHS = new Set([
  "/dashboard",
  "/jobs",
  "/profile",
  "/cv",
  "/extension-bridge",
  "/cv-mobile",
  "/cv-mobile-upload"
]);

const COUNTRY_TO_LOCALE = Object.freeze({
  AR: "es",
  AT: "de",
  BO: "es",
  CH: "de",
  CL: "es",
  CO: "es",
  CR: "es",
  CU: "es",
  DE: "de",
  DO: "es",
  EC: "es",
  ES: "es",
  GT: "es",
  HN: "es",
  KR: "ko",
  MX: "es",
  NI: "es",
  PA: "es",
  PE: "es",
  PR: "es",
  PY: "es",
  SV: "es",
  UY: "es",
  VE: "es"
});

const EURO_MARKET_COUNTRIES = new Set([
  "AD", "AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR",
  "HR", "IE", "IT", "LT", "LU", "LV", "MC", "ME", "MT", "NL",
  "PT", "SI", "SK", "SM", "VA"
]);

function matchSupportedLocale(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.startsWith("de")) return "de";
  if (raw.startsWith("es")) return "es";
  if (raw.startsWith("ko")) return "ko";
  if (raw.startsWith("en")) return "en";
  return "";
}

export function normalizeLocale(value) {
  const matched = matchSupportedLocale(value);
  if (matched) return matched;
  return DEFAULT_LOCALE;
}

export function normalizeCountry(value) {
  const raw = String(value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(raw) ? raw : "";
}

export function normalizeMarket(value) {
  const raw = String(value || "").trim().toLowerCase();
  return SUPPORTED_MARKETS.includes(raw) ? raw : "";
}

export function readRequestCountry(request) {
  const cfCountry = normalizeCountry(request && request.cf && request.cf.country);
  if (cfCountry) return cfCountry;
  try {
    return normalizeCountry(request && request.headers && request.headers.get("cf-ipcountry"));
  } catch (_) {
    return "";
  }
}

export function localeFromCountry(country) {
  return COUNTRY_TO_LOCALE[normalizeCountry(country)] || DEFAULT_LOCALE;
}

export function marketFromCountry(country) {
  const normalized = normalizeCountry(country);
  if (!normalized) return "";
  if (normalized === "KR") return "krw";
  if (EURO_MARKET_COUNTRIES.has(normalized)) return "eur";
  if (normalized === "US") return "usd";
  return "";
}

export function resolveMessages(locale) {
  return MESSAGES[normalizeLocale(locale)] || MESSAGES[DEFAULT_LOCALE];
}

export function pickBestMarket(country = "", cookieMarket = "", locale = "") {
  const geoMarket = marketFromCountry(country);
  if (geoMarket) return geoMarket;
  const storedMarket = normalizeMarket(cookieMarket);
  if (cookieMarket && SUPPORTED_MARKETS.includes(storedMarket)) return storedMarket;
  return LOCALE_TO_MARKET[normalizeLocale(locale)] || DEFAULT_MARKET;
}

export function resolveCommerceConfig(locale, market = "", messages = resolveMessages(locale)) {
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

export function formatPrice(locale, plan, messages = resolveMessages(locale), market = "") {
  const commerce = resolveCommerceConfig(locale, market, messages);
  const amount = commerce.prices[String(plan || "").trim().toLowerCase()];
  if (!Number.isFinite(amount)) return "";
  try {
    return new Intl.NumberFormat(LOCALE_FORMAT_TAGS[normalizeLocale(locale)] || LOCALE_FORMAT_TAGS[DEFAULT_LOCALE], {
      style: "currency",
      currency: commerce.currency,
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2
    }).format(amount);
  } catch (_) {
    return `${commerce.currency} ${amount}`;
  }
}

export function getMessage(messages, key, fallback = "") {
  const parts = String(key || "").split(".").filter(Boolean);
  let cursor = messages;
  for (const part of parts) {
    if (!cursor || typeof cursor !== "object" || !(part in cursor)) {
      return fallback;
    }
    cursor = cursor[part];
  }
  return typeof cursor === "string" ? cursor : fallback;
}

export function interpolate(template, vars = {}) {
  return String(template || "").replace(/\{(\w+)\}/g, (_match, key) => {
    const value = vars[key];
    return value === null || typeof value === "undefined" ? "" : String(value);
  });
}

export function parseLocalePath(pathname) {
  const raw = String(pathname || "/").trim() || "/";
  const segments = raw.split("/").filter(Boolean);
  const first = segments[0] || "";
  const locale = SUPPORTED_LOCALES.includes(first) ? first : null;
  if (!locale) {
    return {
      locale: null,
      hasLocalePrefix: false,
      strippedPath: raw
    };
  }
  const rest = segments.slice(1).join("/");
  return {
    locale,
    hasLocalePrefix: true,
    strippedPath: rest ? `/${rest}` : "/"
  };
}

export function normalizeAssetPath(strippedPath) {
  let raw = String(strippedPath || "/").trim() || "/";
  if (!raw.startsWith("/")) raw = `/${raw}`;
  raw = raw.replace(/\/{2,}/g, "/");
  if (raw.length > 1 && raw.endsWith("/")) raw = raw.slice(0, -1);
  if (raw === "/" || raw === "/index" || raw === "/index.html") return "/";
  if (raw.endsWith("/index")) return raw.slice(0, -6) || "/";
  if (raw.endsWith("/index.html")) return raw.slice(0, -11) || "/";
  if (raw.endsWith(".html")) return raw.slice(0, -5) || "/";
  return raw;
}

export function normalizeLocalizedPagePath(strippedPath) {
  const raw = normalizeAssetPath(strippedPath);
  if (raw === "/plan" || raw === "/plan.html") return "/plan";
  if (raw === "/signup" || raw === "/signup.html") return "/signup";
  if (raw === "/cv-studio" || raw === "/cv-studio.html") return "/cv-studio";
  return raw;
}

export function isLocalizedPublicPath(strippedPath) {
  return LOCALIZED_PUBLIC_PATHS.has(normalizeLocalizedPagePath(strippedPath));
}

export function isNoindexPath(strippedPath) {
  return NON_INDEXABLE_PATHS.has(normalizeAssetPath(strippedPath));
}

export function readCookieValue(cookieHeader, name) {
  const source = String(cookieHeader || "");
  const pairs = source.split(";").map((part) => part.trim()).filter(Boolean);
  for (const pair of pairs) {
    const [key, ...rest] = pair.split("=");
    if (String(key || "").trim() !== name) continue;
    return decodeURIComponent(rest.join("=") || "");
  }
  return "";
}

export function pickBestLocale(acceptLanguageHeader = "", cookieLocale = "", country = "") {
  const explicit = matchSupportedLocale(cookieLocale);
  if (explicit && SUPPORTED_LOCALES.includes(explicit)) return explicit;

  const source = String(acceptLanguageHeader || "");
  const tokens = source.split(",").map((item) => item.trim()).filter(Boolean);
  for (const token of tokens) {
    const locale = matchSupportedLocale(token.split(";")[0]);
    if (locale && SUPPORTED_LOCALES.includes(locale)) return locale;
  }
  return localeFromCountry(country);
}

export function buildLocalizedPath(locale, strippedPath = "/", search = "") {
  const normalizedLocale = normalizeLocale(locale);
  const normalizedPath = normalizeLocalizedPagePath(strippedPath);
  const suffix = normalizedPath === "/" ? "/" : normalizedPath;
  return `/${normalizedLocale}${suffix}${search || ""}`;
}

export function buildAlternateLinks(origin, strippedPath) {
  const normalized = normalizeLocalizedPagePath(strippedPath);
  const path = normalized === "/" ? "/" : normalized;
  const links = SUPPORTED_LOCALES.map((locale) => ({
    locale,
    href: `${origin}${buildLocalizedPath(locale, path)}`
  }));
  return {
    canonical: `${origin}${buildLocalizedPath(DEFAULT_LOCALE, path)}`,
    current: (locale) => `${origin}${buildLocalizedPath(locale, path)}`,
    links
  };
}
