# jobmejob.com Frontend

This repository contains the static multi-page frontend for `jobmejob.com`.

It is designed to be deployed as a Cloudflare Pages site and talks to a separate Worker API for authenticated product actions.

## Repo Layout

- `index.html`: marketing landing page
- `signup.html`, `plan.html`, `profile.html`, `jobs.html`, `dashboard.html`, `cv.html`: product pages
- `auth.js`: shared Supabase auth helpers and storage cleanup
- `shared.js`: shared UI/runtime helpers
- `dashboard.app.js`, `profile.app.js`, `cv.app.js`: extracted page runtimes
- `dashboard.bi.override.v3.js`: dashboard BI/activity overrides
- `vendor/`: pinned third-party browser assets
- `_headers`, `robots.txt`, `sitemap.xml`: Pages-side headers and fallback indexing assets
- `functions/[[path]].js`, `functions/_lib/i18n.js`: locale routing, redirects, canonical/hreflang, and localized HTML rewriting on Pages
- `worker-api/`: source of truth for the API worker on `api.jobmejob.com`
- `jobmejob-seo/`: source of truth for the standalone SEO/proxy worker that owns `jobmejob.com/sitemap.xml`, `jobmejob.com/robots.txt`, and `jobmejob.com/api/*`

## Deployment Ownership

- Cloudflare Pages serves the website HTML, assets, and locale routes such as `/`, `/en`, `/de`, `/es`, `/ko`, `/de/plan`, `/es/signup`, and `/ko/cv-studio`.
- Pages source of truth for locale behavior is `functions/[[path]].js` plus `functions/_lib/i18n.js`. The client switcher/runtime lives in `i18n.js`.
- `worker-api/jobmejob-worker.js` serves the direct API domain `https://api.jobmejob.com/*` and is deployed with:

```bash
cd worker-api
npx wrangler deploy --config wrangler.jobmejob.toml
```

- `jobmejob-seo/worker.js` serves `https://jobmejob.com/sitemap.xml`, `https://jobmejob.com/robots.txt`, and proxies `https://jobmejob.com/api/*` to the upstream worker. Deploy it with:

```bash
cd jobmejob-seo
npx wrangler deploy --config wrangler.toml
```

- Pages deploy command:

```bash
npx wrangler pages deploy <dir> --project-name jobmejob --branch main
```

- Live source of truth for `sitemap.xml` and `robots.txt` is `jobmejob-seo/worker.js`.
- `sitemap.xml`, `robots.txt`, and `functions/sitemap.xml.js` in the Pages app are useful parity/fallback files, but the exact custom-domain SEO routes are overridden by `jobmejob-seo`.
- Important caveat: a custom-domain Worker route wins over Pages for the same path. If `jobmejob.com/sitemap.xml`, `jobmejob.com/robots.txt`, or `jobmejob.com/api/*` look wrong in production, check `jobmejob-seo` first, not Pages.

## Local Preview

You can preview the site with any simple static file server, for example:

```bash
python3 -m http.server 8788
```

Then open `http://localhost:8788`.

The debug API override mechanisms in the frontend are intentionally restricted to local environments such as `localhost`.

## Cloudflare Pages

This repo does not ship a live `wrangler.toml` yet because the production Pages project name and dashboard bindings need to match exactly.

Before switching Pages configuration into source control, download the current Cloudflare configuration from the existing project and review it:

```bash
npx wrangler pages download config <PROJECT_NAME>
```

Recommended deployment workflow:

1. Download the current Pages config from Cloudflare.
2. Compare it against `wrangler.toml.example`.
3. Save the reviewed result as `wrangler.toml`.
4. Deploy with `npx wrangler pages deploy .` or keep using Git integration.

The Worker API endpoint is currently configured in the frontend as `https://jobmejob.schoene-viktor.workers.dev`.

## Vendored Dependencies

The browser build of Supabase is pinned and vendored in this repo to avoid silent CDN upgrades:

- `vendor/supabase-js-2.100.1.js`

When updating it:

1. Download the exact browser build for the new version.
2. Replace the vendored file.
3. Update the HTML references if the filename changes.
4. Smoke-test auth and session restore flows.
