const SITE_ORIGIN = "https://jobmejob.com";
const LASTMOD = "2026-04-21";
const LOCALES = ["en", "de", "es", "ko"];
const LOCALIZED_PATHS = ["/", "/cv-studio", "/plan", "/signup"];

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildLocalizedUrl(locale, path) {
  const normalizedPath = path === "/" ? "/" : String(path || "/").replace(/\/+$/, "");
  return `${SITE_ORIGIN}/${locale}${normalizedPath === "/" ? "/" : normalizedPath}`;
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

function buildLocalizedEntries() {
  return LOCALIZED_PATHS.map((path) => {
    const alternates = LOCALES.map((locale) => ({
      hreflang: locale,
      href: buildLocalizedUrl(locale, path)
    }));

    alternates.push({
      hreflang: "x-default",
      href: buildLocalizedUrl("en", path)
    });

    return renderUrlEntry({
      loc: buildLocalizedUrl("en", path),
      alternates,
      changefreq: path === "/signup" ? "monthly" : "weekly",
      priority: path === "/" ? "1.0" : path === "/signup" ? "0.5" : path === "/plan" ? "0.7" : "0.8"
    });
  });
}

function buildPrivacyEntry() {
  return renderUrlEntry({
    loc: `${SITE_ORIGIN}/privacy`,
    alternates: [
      { hreflang: "en", href: `${SITE_ORIGIN}/privacy` },
      { hreflang: "x-default", href: `${SITE_ORIGIN}/privacy` }
    ],
    changefreq: "monthly",
    priority: "0.6"
  });
}

function buildSitemapXml() {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...buildLocalizedEntries(),
    buildPrivacyEntry(),
    "</urlset>"
  ].join("\n");
}

export function onRequestGet() {
  return new Response(buildSitemapXml(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate"
    }
  });
}
