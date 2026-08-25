# The Duke Post

A simple tech news site: original articles as Markdown, plus a curated RSS
"Wire" feed. Built with [Astro](https://astro.build) — no database, no CMS.

## Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:4321`.

## Write an article

Add a new `.md` file to `src/content/articles/`:

```markdown
---
title: "Your headline"
description: "One sentence for previews and SEO."
pubDate: 2026-06-21
category: "ai"        # ai | gadgets | startups | security | opinion | general
tags: ["llm", "chips"] # optional, powers /tags and /tags/[tag]
featured: false        # true = shows as homepage hero
---

Your article body in Markdown.
```

It's live automatically at `/articles/your-file-name`.

## Update the curated Wire feed

Edit the `FEEDS` array in `scripts/sync-feeds.mjs` to add/remove RSS sources,
then run:

```bash
npm run sync-feeds
```

This writes `src/data/wire.json`, which both the homepage and `/wire` page
read from. A GitHub Action (`.github/workflows/sync-feeds.yml`) is already
set up to run this automatically every 2 hours and commit the result —
just push this repo to GitHub and it'll start working (Actions are enabled
by default on public repos; enable them in Settings → Actions if private).

## Send the subscriber digest

`scripts/send-digest.mjs` turns the top Wire stories since the last send
into an email and sends it through [Buttondown](https://buttondown.com)
(the same service the subscribe form on `/subscribe` posts to).

Setup:
1. Get an API key from Buttondown → Settings → Programming.
2. Add it as a repo secret named `BUTTONDOWN_API_KEY` (Settings → Secrets and
   variables → Actions).

Then:

```bash
npm run send-digest:dry   # preview the email, sends nothing
npm run send-digest       # actually sends (requires BUTTONDOWN_API_KEY)
```

A GitHub Action (`.github/workflows/send-digest.yml`) sends it once a day
automatically and commits `src/data/digest-state.json`, which tracks the
last send so the next digest only includes stories that are new since then.

## "Most read this week"

The homepage's "Most read this week" module is powered by
[GoatCounter](https://www.goatcounter.com) (free, privacy-friendly analytics)
so it can show real pageview counts on an otherwise static site with no
backend.

Setup:
1. Create a free account at goatcounter.com and note your site code (the
   subdomain in `https://<code>.goatcounter.com`).
2. Generate an API token: Settings → API → new token, with the
   "Read: statistics" permission.
3. Set `PUBLIC_GOATCOUNTER_SITE=<code>` in your environment (e.g. a Vercel
   project env var) — this enables the tracking snippet in `BaseLayout.astro`.
4. Add two repo secrets (Settings → Secrets and variables → Actions):
   `GOATCOUNTER_SITE` (same code as above) and `GOATCOUNTER_API_TOKEN`.

Then:

```bash
npm run sync-stats   # pulls the last 7 days of hits into src/data/stats.json
```

A GitHub Action (`.github/workflows/sync-stats.yml`) runs this once a day.
Until GoatCounter is configured, `sync-stats` is a no-op and the "Most read"
section just doesn't render.

## Deploy

**Recommended: Vercel**
1. Push this folder to a GitHub repo.
2. Go to vercel.com → New Project → import the repo. Vercel auto-detects Astro.
3. Once deployed, go to Project Settings → Domains → add `thedukepost.com`.
4. Vercel gives you DNS records (usually an A record + CNAME for `www`) —
   add those at your domain registrar (wherever you bought thedukepost.com).
   DNS propagation usually takes a few minutes to a few hours.

**Alternative: Netlify** — same flow: connect repo, it auto-detects the
Astro build command (`npm run build`, output dir `dist`), then add your
domain under Site settings → Domain management.

## Project structure

```
src/
  content/articles/   ← your original posts (Markdown)
  data/wire.json      ← curated feed cache (auto-generated, don't hand-edit)
  layouts/            ← shared page shell
  pages/               ← routes (index, /articles, /wire, /about)
  styles/global.css   ← design tokens (colors, fonts)
scripts/sync-feeds.mjs ← RSS puller
```
