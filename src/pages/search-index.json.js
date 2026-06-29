import { getCollection } from 'astro:content';

export async function GET() {
  const articles = (await getCollection('articles', ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
    .map((a) => ({
      slug: a.slug,
      title: a.data.title,
      description: a.data.description,
      category: a.data.category,
      author: a.data.author,
      pubDate: a.data.pubDate.toISOString().slice(0, 10),
    }));

  return new Response(JSON.stringify(articles), {
    headers: { 'Content-Type': 'application/json' },
  });
}
