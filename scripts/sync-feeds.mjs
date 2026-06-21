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
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss' },
  { name: 'Engadget', url: 'https://www.engadget.com/rss.xml' },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/' },
  { name: 'VentureBeat', url: 'https://venturebeat.com/feed/' },
];

const MAX_ITEMS_PER_FEED = 8;
const MAX_SUMMARY_LENGTH = 180;
const IMAGE_FETCH_CONCURRENCY = 12;
const IMAGE_FETCH_TIMEOUT_MS = 5000;

function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, '').trim();
}

function truncate(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// Many feeds already embed an image (an <enclosure>, or an <img> in the
// content HTML) — pulling that is free, so we only hit the network for
// items that don't have one.
function imageFromFeedItem(item) {
  if (item.enclosure?.url && /^image\//.test(item.enclosure.type ?? '')) {
    return item.enclosure.url;
  }
  const html = item['content:encoded'] ?? item.content ?? '';
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? decodeHtmlEntities(match[1]) : null;
}

// Fetch the original article page and pull its og:image (or twitter:image
// fallback) so each Wire item can show a real preview image, not a stock icon.
async function fetchPreviewImage(link) {
  try {
    const res = await fetch(link, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TheDukePostBot/1.0)' },
      signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    return match ? decodeHtmlEntities(match[1]) : null;
  } catch {
    return null;
  }
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
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
        image: imageFromFeedItem(item),
      }));
      allItems.push(...items);
      console.log(`✓ ${feed.name}: ${items.length} items`);
    } catch (err) {
      console.error(`✗ ${feed.name}: failed to fetch — ${err.message}`);
    }
  }

  allItems.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  const needsFetch = allItems.filter((item) => !item.image);
  console.log(`\n${allItems.length - needsFetch.length}/${allItems.length} items already had an image from their feed.`);
  console.log(`Fetching preview images for the other ${needsFetch.length}…`);
  const fetched = await mapWithConcurrency(needsFetch, IMAGE_FETCH_CONCURRENCY, (item) =>
    fetchPreviewImage(item.link)
  );
  needsFetch.forEach((item, i) => { item.image = fetched[i]; });
  console.log(`✓ Found images for ${allItems.filter((item) => item.image).length}/${allItems.length} items total`);

  await mkdir('src/data', { recursive: true });
  await writeFile(
    'src/data/wire.json',
    JSON.stringify({ syncedAt: new Date().toISOString(), items: allItems }, null, 2)
  );

  console.log(`\nWrote ${allItems.length} items to src/data/wire.json`);
}

syncFeeds();
