import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { categoryLabel } from '../../lib/categories';
import { renderOgImage } from '../../lib/ogImage';

// Only articles without a hand-picked `image` need a generated card — the
// rest keep using their own cover image for social shares.
export const getStaticPaths = (async () => {
  const articles = await getCollection('articles', ({ data }) => !data.draft && !data.image);
  return articles.map((article) => ({ params: { slug: article.slug }, props: { article } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { article } = props;
  const png = await renderOgImage({
    eyebrow: categoryLabel(article.data.category),
    title: article.data.title,
    meta: `${article.data.author} · ${article.data.pubDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })}`,
  });

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
