// scripts/sync-feeds.mjs
// Pulls headlines from RSS feeds and writes them to src/data/wire.json
// Run manually with `npm run sync-feeds`, or wire it into a cron job / GitHub Action.

import Parser from 'rss-parser';
import { writeFile, mkdir } from 'node:fs/promises';

const parser = new Parser();

// Add or remove feeds here. Keep to publishers that publish full RSS feeds
// with title + link + summary — we only ever show a short excerpt and link out.
const FEEDS = [
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { name: 'Hacker News (Front Page)', url: 'https://hnrss.org/frontpage' },
];

const MAX_ITEMS_PER_FEED = 8;
const MAX_SUMMARY_LENGTH = 180;

function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, '').trim();
}

function truncate(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

async function syncFeeds() {
  const allItems = [];

  for (const feed of FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      const items = (parsed.items ?? []).slice(0, MAX_ITEMS_PER_FEED).map((item) => ({
        source: feed.name,
        title: item.title ?? 'Untitled',
        link: item.link ?? '#',
        summary: truncate(stripHtml(item.contentSnippet ?? item.summary ?? ''), MAX_SUMMARY_LENGTH),
        publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
      }));
      allItems.push(...items);
      console.log(`✓ ${feed.name}: ${items.length} items`);
    } catch (err) {
      console.error(`✗ ${feed.name}: failed to fetch — ${err.message}`);
    }
  }

  allItems.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  await mkdir('src/data', { recursive: true });
  await writeFile(
    'src/data/wire.json',
    JSON.stringify({ syncedAt: new Date().toISOString(), items: allItems }, null, 2)
  );

  console.log(`\nWrote ${allItems.length} items to src/data/wire.json`);
}

syncFeeds();
