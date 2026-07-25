# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # astro dev — local server at localhost:4321
npm run build             # astro build — static output to dist/; run this to verify any change
npm run preview           # serve the built dist/ output
npm run sync-feeds        # pull RSS feeds into src/data/wire.json (also runs on a 2h GitHub Action)
npm run send-digest:dry   # preview the subscriber email without sending
npm run send-digest       # send it via Buttondown (needs BUTTONDOWN_API_KEY env var)
```

There is no lint script and no test suite — `npm run build` (which runs Astro's type checking) is the
verification step for changes. There is no single-test command since there are no tests.

## Architecture

Static Astro site (`output: 'static'`), no server, no database, no CMS. Two content sources feed the
site, and most pages are a straightforward `getCollection`/JSON-read + render:

1. **Original articles** — Markdown files in `src/content/articles/`, schema in `src/content/config.ts`
   (title, description, image, pubDate, author, category, tags, featured, draft). Categories are a
   fixed enum from `src/lib/categories.ts`, not freeform.
2. **The Wire** — curated third-party RSS headlines in `src/data/wire.json`, written by
   `scripts/sync-feeds.mjs` (edit the `FEEDS` array there to add/remove sources) and never hand-edited.
   The sync script also clusters same-story headlines from different outlets within a rolling time
   window (`CLUSTER_WINDOW_MS`) using token-overlap matching, producing `sourceCount`/`related` fields
   that the homepage "trending" module and the digest ranking both depend on. Because `wire.json` is
   committed by an automated job, pages that read it default missing `sourceCount`/`related` fields
   defensively rather than assuming the shape is always current.

Wire content is third-party and untrusted — anywhere it's rendered via `innerHTML`/`set:html` (e.g.
`SearchPalette.astro`, `search.astro`) it goes through a local `escapeHtml` helper first.

**Routing**: `src/pages/` — most listing pages (`articles/[...page]`, `wire/[...page]`) use Astro's
`paginate()`, and each duplicates its `PAGE_SIZE` constant once inside `getStaticPaths` and once at
top level, because `getStaticPaths` runs in an isolated scope and can't see other frontmatter consts.
Slug helpers live in `src/lib/` (`categoryHref`/`categoryLabel`, `tagHref`/`tagSlug`,
`authorHref`/`authorSlug`) and should be reused instead of hand-building paths.

**`Astro.url.pathname` has a trailing slash** in the static build (e.g. `/about/`, not `/about`) —
confirmed via each page's own `<link rel="canonical">`. Any exact-match routing logic (e.g. the nav's
active-state detection in `BaseLayout.astro`) must normalize with
`Astro.url.pathname.replace(/\/$/, '') || '/'` first; `startsWith` checks are unaffected.

**Layout/SEO**: `src/layouts/BaseLayout.astro` is the single shell — head tags, OG/Twitter meta, the
sitewide Organization + WebSite JSON-LD, the header nav (with active-state `aria-current`), skip-link,
footer, theme toggle, and the search palette. Pages pass a `jsonLd` prop (single object or array — it
gets merged with the sitewide entries) for page-specific structured data, and a `noindex` prop for
personalized/client-only pages that shouldn't be crawled (e.g. `/reading-list`). Breadcrumb trails
(`src/components/Breadcrumbs.astro` + `src/lib/breadcrumbs.ts`'s `breadcrumbJsonLd`) exist on article,
category, tag, and author pages — reuse both the component and the JSON-LD helper together if adding
breadcrumbs elsewhere.

**Social share images**: `src/lib/ogImage.ts` renders a branded 1200×630 PNG via satori + resvg, fonts
self-hosted as `.woff` under `src/assets/og-fonts/` (satori needs ttf/otf/woff, not woff2). It loads
fonts via `join(process.cwd(), ...)`, not an `import.meta.url`-relative path, because Astro bundles API
routes into `dist/` at a location that varies by route. `src/pages/og/[slug].png.ts` only generates a
PNG for articles missing a hand-picked `image`, and `articles/[slug].astro` falls back to it.

**Client-side interactivity** is deliberately split by scope:
- Global, delegated behavior (theme toggle, nav dropdown outside-click, the reading-list save/remove
  logic) lives as `is:inline` scripts in `BaseLayout.astro` so it runs on every page without per-page
  wiring — new features that need a sitewide toggle should add a delegated `document`-level listener
  there (see the `[data-save-toggle]` pattern) rather than duplicating a script per page.
- Page-local behavior (search filtering/keyboard nav, article copy-link/print/save, TOC scroll-spy)
  lives in that page's own `<script>` block.
- Search (`search.astro` full page, `SearchPalette.astro` ⌘K dialog) both build a Fuse.js index from
  `search-index.json.js` (which merges articles + Wire items) and intentionally duplicate their
  matching/render/`escapeHtml` logic rather than sharing a module, since they're two different DOM
  shapes.

**Design system**: no component library — CSS custom properties in `src/styles/global.css`
(`--ink`/`--paper`/`--slate`/`--signal`/`--accent`/`--font-*`, flipped by `[data-theme='dark']`) plus a
`.sticker` utility class (bordered, offset drop-shadow card look) used throughout for cards/buttons.
Each `.astro` file's `<style>` block is scoped by default; shared visual language comes from the CSS
variables and utility classes, not shared components — most listing pages (category/tag/author) copy
the same card-list markup/CSS rather than factoring out a shared component.

## Content authoring

New article: add a `.md` file to `src/content/articles/` with the frontmatter shown in `README.md`; it
publishes automatically at `/articles/<filename>`. `category` must be one of the enum values in
`src/lib/categories.ts`.
