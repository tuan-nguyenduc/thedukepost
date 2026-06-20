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
