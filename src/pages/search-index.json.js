import { getCollection } from 'astro:content';
import wireData from '../data/wire.json';

export async function GET() {
  const articles = (await getCollection('articles', ({ data }) => !data.draft))
    .map((a) => ({
      type: 'article',
      link: `/articles/${a.slug}`,
      title: a.data.title,
      description: a.data.description,
      category: a.data.category,
      pubDate: a.data.pubDate.toISOString().slice(0, 10),
    }));

  const wire = wireData.items.map((item) => ({
    type: 'wire',
    link: item.link,
    title: item.title,
    description: item.summary,
    category: item.source,
    pubDate: item.publishedAt.slice(0, 10),
  }));

  const combined = [...articles, ...wire].sort((a, b) => b.pubDate.localeCompare(a.pubDate));

  return new Response(JSON.stringify(combined), {
    headers: { 'Content-Type': 'application/json' },
  });
}
