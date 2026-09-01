import { getCollection } from 'astro:content';
import { getImage } from 'astro:assets';
import { marked } from 'marked';

export async function GET(context) {
  const articles = (await getCollection('articles', ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'The Duke Post',
    home_page_url: context.site.toString(),
    feed_url: new URL('/feed.json', context.site).toString(),
    description: 'Tech news and signal, curated and written by The Duke Post.',
    icon: new URL('/icon-192.png', context.site).toString(),
    favicon: new URL('/favicon-v3.svg', context.site).toString(),
    items: await Promise.all(articles.map(async (a) => {
      const url = new URL(`/articles/${a.slug}`, context.site).toString();
      return {
        id: url,
        url,
        title: a.data.title,
        summary: a.data.description,
        content_html: marked.parse(a.body),
        date_published: a.data.pubDate.toISOString(),
        authors: [{ name: a.data.author }],
        tags: [a.data.category, ...a.data.tags],
        ...(a.data.image ? { image: new URL((await getImage({ src: a.data.image })).src, context.site).toString() } : {}),
      };
    })),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: { 'Content-Type': 'application/feed+json; charset=utf-8' },
  });
}
