// scripts/sync-stats.mjs
// Pulls the last 7 days of pageview counts from the GoatCounter API and
// writes the top-read articles to src/data/stats.json, which the homepage
// reads to render a "Most read this week" module.
// Run manually with `npm run sync-stats`, or on a schedule via
// .github/workflows/sync-stats.yml.
//
// Requires GOATCOUNTER_SITE (the subdomain, e.g. "thedukepost" for
// thedukepost.goatcounter.com) and GOATCOUNTER_API_TOKEN (an API token with
// the "Read: statistics" permission, from Settings → API on your
// GoatCounter site) in the environment. Without them, this is a no-op so
// local dev and CI never need GoatCounter credentials to build the site.

import { writeFile, mkdir } from 'node:fs/promises';

const STATS_PATH = 'src/data/stats.json';
const LOOKBACK_DAYS = 7;
const MAX_ARTICLES = 10;

const site = process.env.GOATCOUNTER_SITE;
const token = process.env.GOATCOUNTER_API_TOKEN;

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

async function fetchHits() {
  const end = new Date();
  const start = new Date(end.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const url = new URL(`https://${site}.goatcounter.com/api/v0/stats/hits`);
  url.searchParams.set('start', isoDate(start));
  url.searchParams.set('end', isoDate(end));
  url.searchParams.set('limit', '100');

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`GoatCounter API returned ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.hits ?? [];
}

async function syncStats() {
  if (!site || !token) {
    console.log('GOATCOUNTER_SITE / GOATCOUNTER_API_TOKEN not set — skipping stats sync.');
    return;
  }

  const hits = await fetchHits();
  console.log(`✓ Fetched ${hits.length} paths from GoatCounter`);

  const mostRead = hits
    .filter((hit) => hit.path?.startsWith('/articles/') && hit.path !== '/articles/')
    .map((hit) => ({
      slug: hit.path.replace(/^\/articles\//, '').replace(/\/$/, ''),
      count: hit.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_ARTICLES);

  await mkdir('src/data', { recursive: true });
  await writeFile(
    STATS_PATH,
    JSON.stringify({ syncedAt: new Date().toISOString(), mostRead }, null, 2)
  );

  console.log(`✓ Wrote top ${mostRead.length} articles to ${STATS_PATH}`);
}

syncStats()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
