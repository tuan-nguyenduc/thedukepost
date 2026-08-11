import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { CATEGORIES, categoryLabel, type Category } from '../../../lib/categories';
import { renderOgImage } from '../../../lib/ogImage';

export const getStaticPaths = (async () => {
  const articles = await getCollection('articles', ({ data }) => !data.draft);

  return CATEGORIES.map((category) => ({
    params: { category },
    props: { count: articles.filter((a) => a.data.category === category).length },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params, props }) => {
  const category = params.category as Category;
  const { count } = props;

  const png = await renderOgImage({
    eyebrow: 'Category',
    title: categoryLabel(category),
    meta: `${count} ${count === 1 ? 'article' : 'articles'}`,
  });

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
