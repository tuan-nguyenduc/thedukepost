import rss from '@astrojs/rss';
import wireData from '../data/wire.json';

export async function GET(context) {
  const items = [...wireData.items].sort(
    (a, b) => new Date(b.publishedAt).valueOf() - new Date(a.publishedAt).valueOf()
  );

  return rss({
    title: 'The Wire — The Duke Post',
    description: 'Curated tech headlines from across the industry, refreshed regularly. Every item links straight to the original publisher.',
    site: context.site,
    items: items.map((item) => ({
      title: item.title,
      description: item.summary,
      pubDate: new Date(item.publishedAt),
      categories: [item.source],
      link: item.link,
    })),
    customData: `<lastBuildDate>${new Date(wireData.syncedAt).toUTCString()}</lastBuildDate>`,
  });
}
