import { getCollection } from 'astro:content';
import wireData from '../data/wire.json';
import digestArchive from '../data/digest-archive.json';

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

  const newsletter = digestArchive.issues.map((issue) => ({
    type: 'newsletter',
    link: `/newsletter/${issue.slug}`,
    title: issue.subject,
    description: `${issue.stories.length} ${issue.stories.length === 1 ? 'story' : 'stories'} · ${issue.stories.slice(0, 3).map((s) => s.title).join(' · ')}`,
    category: 'newsletter',
    pubDate: issue.sentAt.slice(0, 10),
  }));

  const combined = [...articles, ...wire, ...newsletter].sort((a, b) => b.pubDate.localeCompare(a.pubDate));

  return new Response(JSON.stringify(combined), {
    headers: { 'Content-Type': 'application/json' },
  });
}
