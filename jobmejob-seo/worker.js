/**
 * Source of truth for the standalone `jobmejob-seo` worker.
 *
 * The live worker owns the `jobmejob.com/sitemap.xml` route and can proxy any
 * additional routes it may already be attached to. We keep the sitemap response
 * explicit and locale-aware here so the public custom-domain path stays fresh
 * even if a stale edge asset exists in front of Pages.
 */

const SITE_ORIGIN = "https://jobmejob.com";
const LASTMOD = "2026-04-21";
const LOCALES = ["en", "de", "es", "ko"];
const LOCALIZED_PATHS = ["/", "/cv-studio", "/plan", "/signup"];

function getEnvString(env, key, fallback = "") {
  const value = env && env[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
}

function splitCsv(value, fallbackArr = []) {
  if (!value || typeof value !== "string") return fallbackArr;
  const items = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return items.length ? items : fallbackArr;
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isProbablyJsonResponse(resp) {
  const contentType = resp.headers.get("content-type") || "";
  return contentType.toLowerCase().includes("application/json");
}

function addOrPreserveHeader(headers, name, value) {
  if (!headers.has(name)) headers.set(name, value);
}

function joinBasePath(basePathname, requestPathname) {
  const base = (basePathname || "/").replace(/\/+$/, "");
  const req = (requestPathname || "/").replace(/^\/+/, "");
  if (!base) return `/${req}`;
  if (!req) return base || "/";
  return `${base}/${req}`;
}

function redirectToCanonical(url, canonicalHost) {
  const target = new URL(url.toString());
  target.hostname = canonicalHost;
  target.protocol = "https:";
  return Response.redirect(target.toString(), 308);
}

function buildLocalizedUrl(origin, locale, path) {
  const normalizedPath = path === "/" ? "/" : String(path || "/").replace(/\/+$/, "");
  return `${origin}/${locale}${normalizedPath === "/" ? "/" : normalizedPath}`;
}

function renderUrlEntry({ loc, alternates = [], changefreq, priority }) {
  const alternateLinks = alternates
    .map((item) => `    <xhtml:link rel="alternate" hreflang="${escapeXml(item.hreflang)}" href="${escapeXml(item.href)}" />`)
    .join("\n");

  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <lastmod>${LASTMOD}</lastmod>`,
    `    <changefreq>${escapeXml(changefreq)}</changefreq>`,
    `    <priority>${escapeXml(priority)}</priority>`,
    alternateLinks,
    "  </url>"
  ].filter(Boolean).join("\n");
}

function buildSitemapXml(origin) {
  const localizedEntries = LOCALIZED_PATHS.map((path) => {
    const alternates = LOCALES.map((locale) => ({
      hreflang: locale,
      href: buildLocalizedUrl(origin, locale, path)
    }));
    alternates.push({
      hreflang: "x-default",
      href: buildLocalizedUrl(origin, "en", path)
    });

    return renderUrlEntry({
      loc: buildLocalizedUrl(origin, "en", path),
      alternates,
      changefreq: path === "/signup" ? "monthly" : "weekly",
      priority: path === "/" ? "1.0" : path === "/signup" ? "0.5" : path === "/plan" ? "0.7" : "0.8"
    });
  });

  const privacyEntry = renderUrlEntry({
    loc: `${origin}/privacy`,
    alternates: [
      { hreflang: "en", href: `${origin}/privacy` },
      { hreflang: "x-default", href: `${origin}/privacy` }
    ],
    changefreq: "monthly",
    priority: "0.6"
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...localizedEntries,
    privacyEntry,
    "</urlset>"
  ].join("\n");
}

function buildRobotsTxt(origin, disallowList) {
  const lines = ["User-agent: *", "Allow: /"];
  for (const path of disallowList) lines.push(`Disallow: ${path}`);
  lines.push(`Sitemap: ${origin}/sitemap.xml`, "");
  return lines.join("\n");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    const canonicalHost = getEnvString(env, "CANONICAL_HOST", "");
    if (canonicalHost && url.hostname !== canonicalHost) {
      return redirectToCanonical(url, canonicalHost);
    }

    const origin = canonicalHost ? `https://${canonicalHost}` : SITE_ORIGIN;

    if ((method === "GET" || method === "HEAD") && url.pathname === "/sitemap.xml") {
      const body = buildSitemapXml(origin);
      return new Response(method === "HEAD" ? null : body, {
        status: 200,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=0, must-revalidate"
        }
      });
    }

    if ((method === "GET" || method === "HEAD") && url.pathname === "/robots.txt") {
      const disallowList = splitCsv(
        getEnvString(env, "ROBOTS_DISALLOW", "/api/,/me/,/admin/,/customers/,/jobs/search,/ingest/"),
        ["/api/", "/me/", "/admin/", "/customers/", "/jobs/search", "/ingest/"]
      );

      const body = buildRobotsTxt(origin, disallowList);
      return new Response(method === "HEAD" ? null : body, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "public, max-age=0, must-revalidate"
        }
      });
    }

    const upstreamOrigin = getEnvString(env, "UPSTREAM_ORIGIN", "");
    if (!upstreamOrigin) {
      return new Response("Missing UPSTREAM_ORIGIN env var.", {
        status: 502,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    const upstream = new URL(upstreamOrigin);
    const target = new URL(request.url);
    target.protocol = upstream.protocol;
    target.hostname = upstream.hostname;
    target.port = upstream.port;
    target.pathname = joinBasePath(upstream.pathname, url.pathname);

    const upstreamRequest = new Request(target.toString(), request);
    let upstreamResponse = await fetch(upstreamRequest);

    if (isProbablyJsonResponse(upstreamResponse)) {
      const headers = new Headers(upstreamResponse.headers);
      addOrPreserveHeader(headers, "X-Robots-Tag", "noindex, nofollow");
      upstreamResponse = new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers
      });
    }

    return upstreamResponse;
  }
};
