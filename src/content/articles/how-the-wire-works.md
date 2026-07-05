---
title: "How the Wire feed stays current"
description: "A quick note on the RSS sync mechanism behind The Duke Post."
image: "/images/wire-sync-cover.svg"
pubDate: 2026-06-19
author: "The Duke Post"
category: "general"
tags: ["meta", "wire", "rss"]
featured: false
---

The Wire section pulls from a small set of RSS feeds defined in `scripts/sync-feeds.mjs`. Running `npm run sync-feeds` fetches the latest items, trims them to a short excerpt, and writes them to `src/data/wire.json`, which the homepage and Wire page read from at build time.

To keep it current automatically, you can wire the sync script into a scheduled GitHub Action that runs on a cron schedule and commits the refreshed JSON, or trigger a redeploy on your host of choice.
