import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { authorSlug } from '../../../lib/authors';
import { renderOgImage } from '../../../lib/ogImage';

export const getStaticPaths = (async () => {
  const articles = await getCollection('articles', ({ data }) => !data.draft);

  const counts = new Map<string, { name: string; count: number }>();
  for (const article of articles) {
    const slug = authorSlug(article.data.author);
    const existing = counts.get(slug);
    if (existing) existing.count += 1;
    else counts.set(slug, { name: article.data.author, count: 1 });
  }

  return Array.from(counts.entries()).map(([slug, { name, count }]) => ({
    params: { name: slug },
    props: { authorName: name, count },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { authorName, count } = props;

  const png = await renderOgImage({
    eyebrow: 'Author',
    title: authorName,
    meta: `${count} ${count === 1 ? 'article' : 'articles'}`,
  });

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
