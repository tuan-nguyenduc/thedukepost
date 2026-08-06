import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { CATEGORIES, categoryLabel } from '../../../lib/categories';

export async function getStaticPaths() {
  return CATEGORIES.map((category) => ({ params: { category } }));
}

export async function GET(context) {
  const category = context.params.category;
  const label = categoryLabel(category);

  const articles = (await getCollection('articles', ({ data }) => !data.draft && data.category === category))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return rss({
    title: `${label} — The Duke Post`,
    description: `Original tech articles from The Duke Post filed under ${label}.`,
    site: context.site,
    items: articles.map((a) => ({
      title: a.data.title,
      description: a.data.description,
      pubDate: a.data.pubDate,
      author: a.data.author,
      categories: [a.data.category],
      link: `/articles/${a.slug}`,
    })),
  });
}
