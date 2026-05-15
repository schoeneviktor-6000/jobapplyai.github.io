import {
  COUNTRY_COOKIE,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  MARKET_COOKIE,
  buildAlternateLinks,
  buildLocalizedPath,
  formatPrice,
  getMessage,
  isGermanSeoPath,
  isKnownHtmlPath,
  isLocalizedNoindexPath,
  isNoindexPath,
  isLocalizedPublicPath,
  normalizeAssetPath,
  normalizeCountry,
  normalizeLocale,
  pickBestMarket,
  parseLocalePath,
  pickBestLocale,
  readRequestCountry,
  readCookieValue,
  resolveMessages
} from "./_lib/i18n.js";

class TextContentHandler {
  constructor(messages, sourceAttr = "data-i18n") {
    this.messages = messages;
    this.sourceAttr = sourceAttr;
  }
  element(element) {
    const key = element.getAttribute(this.sourceAttr);
    if (!key) return;
    const value = getMessage(this.messages, key);
    if (value) element.setInnerContent(value);
  }
}

class HtmlContentHandler {
  constructor(messages) {
    this.messages = messages;
  }
  element(element) {
    const key = element.getAttribute("data-i18n-html");
    if (!key) return;
    const value = getMessage(this.messages, key);
    if (value) element.setInnerContent(value, { html: true });
  }
}

class AttributeHandler {
  constructor(messages, sourceAttr, targetAttr) {
    this.messages = messages;
    this.sourceAttr = sourceAttr;
    this.targetAttr = targetAttr;
  }
  element(element) {
    const key = element.getAttribute(this.sourceAttr);
    if (!key) return;
    const value = getMessage(this.messages, key);
    if (value) element.setAttribute(this.targetAttr, value);
  }
}

class PriceContentHandler {
  constructor(locale, market, messages) {
    this.locale = normalizeLocale(locale);
    this.market = market;
    this.messages = messages;
  }
  element(element) {
    const plan = element.getAttribute("data-price-plan");
    if (!plan) return;
    const value = formatPrice(this.locale, plan, this.messages, this.market);
    if (value) element.setInnerContent(value);
  }
}

class HtmlLangHandler {
  constructor(locale, market, country) {
    this.locale = normalizeLocale(locale);
    this.market = market;
    this.country = normalizeCountry(country);
  }
  element(element) {
    element.setAttribute("lang", this.locale);
    if (this.market) element.setAttribute("data-market", this.market);
    if (this.country) element.setAttribute("data-country", this.country);
  }
}

class HeadHandler {
  constructor({ origin, locale, strippedPath }) {
    this.origin = origin;
    this.locale = normalizeLocale(locale);
    this.strippedPath = strippedPath;
  }
  element(element) {
    const urls = buildAlternateLinks(this.origin, this.strippedPath);
    const canonical = `${this.origin}${buildLocalizedPath(this.locale, this.strippedPath)}`;
    const alternates = urls.links
      .map((item) => `<link rel="alternate" hreflang="${item.locale}" href="${item.href}">`)
      .join("");
    const xDefault = `<link rel="alternate" hreflang="x-default" href="${urls.current(DEFAULT_LOCALE)}">`;
    const canonicalLink = `<link rel="canonical" href="${canonical}">`;
    const structuredData = buildStructuredDataScripts(this.origin, this.locale, this.strippedPath, canonical);
    element.append(`${canonicalLink}${alternates}${xDefault}${structuredData}`, { html: true });
  }
}

function jsonLdScript(data) {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

function breadcrumbSchema(origin, items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.item
    }))
  };
}

function buildStructuredDataScripts(origin, locale, strippedPath, canonical) {
  const normalizedPath = normalizeAssetPath(strippedPath);
  const inLanguage = locale === "de" ? "de-DE" : locale === "es" ? "es-ES" : locale === "ko" ? "ko-KR" : "en-US";
  const orgId = `${origin}/#organization`;
  const websiteId = `${origin}/#website`;

  if (normalizedPath === "/") {
    return jsonLdScript({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": orgId,
          name: "jobmejob",
          url: `${origin}/`,
          logo: {
            "@type": "ImageObject",
            url: `${origin}/logo-512.png`,
            contentUrl: `${origin}/logo-512.png`,
            width: 512,
            height: 512
          }
        },
        {
          "@type": "WebSite",
          "@id": websiteId,
          url: `${origin}/`,
          name: "jobmejob",
          alternateName: "JobMeJob",
          inLanguage,
          publisher: { "@id": orgId }
        }
      ]
    });
  }

  if (normalizedPath === "/cv-studio") {
    const description = locale === "de"
      ? "CV Studio hilft Bewerberinnen und Bewerbern in Deutschland, Lebensläufe an Stellenanzeigen anzupassen, ATS-Keywords zu prüfen und ein PDF zu exportieren."
      : "CV Studio helps job seekers tailor a CV or resume to a job description, check ATS keywords, and export a polished PDF.";
    return [
      jsonLdScript({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "@id": `${canonical}#webapplication`,
        name: "jobmejob CV Studio",
        url: canonical,
        description,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web browser",
        inLanguage,
        publisher: { "@id": orgId },
        offers: {
          "@type": "Offer",
          price: 0,
          priceCurrency: locale === "de" || locale === "es" ? "EUR" : locale === "ko" ? "KRW" : "USD"
        }
      }),
      jsonLdScript(breadcrumbSchema(origin, [
        { name: "jobmejob", item: `${origin}${buildLocalizedPath(locale, "/")}` },
        { name: "CV Studio", item: canonical }
      ]))
    ].join("");
  }

  if (normalizedPath === "/plan") {
    return jsonLdScript(breadcrumbSchema(origin, [
      { name: "jobmejob", item: `${origin}${buildLocalizedPath(locale, "/")}` },
      { name: locale === "de" ? "Preise" : "Pricing", item: canonical }
    ]));
  }

  return "";
}

function appendCookie(headers, name, value) {
  if (!name || !value) return;
  headers.append("Set-Cookie", `${name}=${encodeURIComponent(String(value))}; Path=/; Max-Age=31536000; SameSite=Lax`);
}

function withLocalizationState(response, { locale, market = "", country = "" }) {
  const headers = new Headers(response.headers);
  headers.set("Content-Language", normalizeLocale(locale));
  appendCookie(headers, LOCALE_COOKIE, normalizeLocale(locale));
  if (market) appendCookie(headers, MARKET_COOKIE, market);
  if (country) appendCookie(headers, COUNTRY_COOKIE, normalizeCountry(country));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function withRobotsTag(response, value) {
  const headers = new Headers(response.headers);
  headers.set("X-Robots-Tag", value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function notFoundResponse() {
  return new Response("<!doctype html><title>Not found</title><h1>Not found</h1>", {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow"
    }
  });
}

async function proxyGermanJobDetail(request, url, env) {
  const method = request.method;
  if (method !== "GET" && method !== "HEAD") return notFoundResponse();
  const upstreamOrigin = String(env.JOB_DETAIL_API_ORIGIN || "https://api.jobmejob.com").replace(/\/+$/, "");
  const target = new URL(`${url.pathname}${url.search}`, upstreamOrigin);
  const upstreamRequest = new Request(target.toString(), request);
  const upstreamResponse = await fetch(upstreamRequest);
  const headers = new Headers(upstreamResponse.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  if (upstreamResponse.status >= 400 && !headers.has("X-Robots-Tag")) {
    headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return new Response(method === "HEAD" ? null : upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers
  });
}

function rewriteLocalizedHtml(response, { origin, locale, strippedPath, market, country }) {
  const messages = resolveMessages(locale);
  const rewriter = new HTMLRewriter()
    .on("html", new HtmlLangHandler(locale, market, country))
    .on("head", new HeadHandler({ origin, locale, strippedPath }))
    .on("[data-i18n]", new TextContentHandler(messages))
    .on("[data-i18n-html]", new HtmlContentHandler(messages))
    .on("[data-i18n-placeholder]", new AttributeHandler(messages, "data-i18n-placeholder", "placeholder"))
    .on("[data-i18n-content]", new AttributeHandler(messages, "data-i18n-content", "content"))
    .on("[data-i18n-data-flag]", new AttributeHandler(messages, "data-i18n-data-flag", "data-flag"))
    .on("[data-i18n-aria-label]", new AttributeHandler(messages, "data-i18n-aria-label", "aria-label"))
    .on("[data-i18n-title]", new TextContentHandler(messages, "data-i18n-title"))
    .on("[data-price-plan]", new PriceContentHandler(locale, market, messages));

  return withLocalizationState(rewriter.transform(response), { locale, market, country });
}

function buildRedirectResponse(url, targetPath, status = 308) {
  return Response.redirect(`${url.origin}${targetPath}${url.search}`, status);
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const cookieHeader = request.headers.get("cookie");
  const country = readRequestCountry(request);
  const cookieLocale = readCookieValue(cookieHeader, LOCALE_COOKIE);
  const cookieMarket = readCookieValue(cookieHeader, MARKET_COOKIE);
  const preferredLocale = pickBestLocale(request.headers.get("accept-language"), cookieLocale, country);
  const preferredMarket = pickBestMarket(country, cookieMarket, preferredLocale);
  const localePath = parseLocalePath(url.pathname);

  if (url.pathname.startsWith("/jobs/de/")) {
    return proxyGermanJobDetail(request, url, env);
  }

  if (!localePath.hasLocalePrefix) {
    const normalizedPath = normalizeAssetPath(url.pathname);

    if (normalizedPath !== "/jobs" && isGermanSeoPath(normalizedPath)) {
      return buildRedirectResponse(url, `/de${normalizedPath}`, 308);
    }

    if (isLocalizedPublicPath(normalizedPath) || isLocalizedNoindexPath(normalizedPath)) {
      const targetPath = buildLocalizedPath(preferredLocale, normalizedPath);
      return withLocalizationState(buildRedirectResponse(url, targetPath, 307), {
        locale: preferredLocale,
        market: preferredMarket,
        country
      });
    }

    if (normalizedPath !== url.pathname) {
      const normalizedUrl = new URL(normalizedPath + url.search, url.origin);
      const normalizedRequest = new Request(normalizedUrl.toString(), request);
      const normalizedResponse = await env.ASSETS.fetch(normalizedRequest);
      if (!normalizedResponse.ok) {
        return normalizedResponse;
      }
      return withLocalizationState(buildRedirectResponse(url, normalizedPath, 308), {
        locale: preferredLocale,
        market: preferredMarket,
        country
      });
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (!assetResponse.ok) return assetResponse;

    const contentType = String(assetResponse.headers.get("content-type") || "").toLowerCase();
    if (contentType.includes("text/html") && !isKnownHtmlPath(normalizedPath)) {
      return notFoundResponse();
    }

    if (!isNoindexPath(normalizedPath)) {
      return assetResponse;
    }

    return withRobotsTag(assetResponse, "noindex, nofollow");
  }

  const market = pickBestMarket(country, cookieMarket, localePath.locale);
  const normalizedPath = normalizeAssetPath(localePath.strippedPath);

  if (isGermanSeoPath(normalizedPath)) {
    if (localePath.locale !== "de") {
      return withLocalizationState(buildRedirectResponse(url, `/de${normalizedPath}`, 308), {
        locale: "de",
        market: pickBestMarket(country, cookieMarket, "de"),
        country
      });
    }

    const localizedPath = `/de${normalizedPath}`;
    if (localizedPath !== url.pathname) {
      return withLocalizationState(buildRedirectResponse(url, localizedPath, 308), {
        locale: "de",
        market,
        country
      });
    }

    const assetUrl = new URL(`${localizedPath}${url.search}`, url.origin);
    const assetRequest = new Request(assetUrl.toString(), request);
    const assetResponse = await env.ASSETS.fetch(assetRequest);
    if (!assetResponse.ok) return withLocalizationState(assetResponse, { locale: "de", market, country });
    return withLocalizationState(assetResponse, { locale: "de", market, country });
  }

  if (isLocalizedPublicPath(normalizedPath) || isLocalizedNoindexPath(normalizedPath)) {
    const localizedPath = buildLocalizedPath(localePath.locale, normalizedPath);
    if (localizedPath !== url.pathname) {
      return withLocalizationState(buildRedirectResponse(url, localizedPath, 308), {
        locale: localePath.locale,
        market,
        country
      });
    }

    const assetUrl = new URL(normalizedPath + url.search, url.origin);
    const assetRequest = new Request(assetUrl.toString(), request);
    const assetResponse = await env.ASSETS.fetch(assetRequest);

    if (!assetResponse.ok) {
      return withLocalizationState(assetResponse, { locale: localePath.locale, market, country });
    }

    const contentType = String(assetResponse.headers.get("content-type") || "").toLowerCase();
    if (contentType.includes("text/html")) {
      const localizedResponse = rewriteLocalizedHtml(assetResponse, {
        origin: url.origin,
        locale: localePath.locale,
        strippedPath: normalizedPath,
        market,
        country
      });
      if (isLocalizedNoindexPath(normalizedPath)) {
        return withRobotsTag(localizedResponse, "noindex, follow");
      }
      return localizedResponse;
    }

    return withLocalizationState(assetResponse, { locale: localePath.locale, market, country });
  }

  const assetUrl = new URL(normalizedPath + url.search, url.origin);
  const assetRequest = new Request(assetUrl.toString(), request);
  const assetResponse = await env.ASSETS.fetch(assetRequest);

  if (!assetResponse.ok) {
    return withLocalizationState(assetResponse, { locale: localePath.locale, market, country });
  }

  const contentType = String(assetResponse.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("text/html") && !isKnownHtmlPath(normalizedPath)) {
    return notFoundResponse();
  }

  return withLocalizationState(buildRedirectResponse(url, normalizedPath, 308), {
    locale: localePath.locale,
    market,
    country
  });
}
