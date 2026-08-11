import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { tagSlug } from '../../../lib/tags';
import { renderOgImage } from '../../../lib/ogImage';

export const getStaticPaths = (async () => {
  const articles = await getCollection('articles', ({ data }) => !data.draft);

  const counts = new Map<string, { label: string; count: number }>();
  for (const article of articles) {
    for (const tag of article.data.tags) {
      const slug = tagSlug(tag);
      const existing = counts.get(slug);
      if (existing) existing.count += 1;
      else counts.set(slug, { label: tag, count: 1 });
    }
  }

  return Array.from(counts.entries()).map(([slug, { label, count }]) => ({
    params: { tag: slug },
    props: { label, count },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { label, count } = props;

  const png = await renderOgImage({
    eyebrow: 'Tag',
    title: `#${label}`,
    meta: `${count} ${count === 1 ? 'article' : 'articles'}`,
  });

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
