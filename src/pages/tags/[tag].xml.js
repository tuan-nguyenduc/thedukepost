import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { tagSlug } from '../../lib/tags';

export async function getStaticPaths() {
  const articles = await getCollection('articles', ({ data }) => !data.draft);
  const labelBySlug = new Map();
  for (const article of articles) {
    for (const tag of article.data.tags) {
      const slug = tagSlug(tag);
      if (!labelBySlug.has(slug)) labelBySlug.set(slug, tag);
    }
  }
  return Array.from(labelBySlug.entries()).map(([slug, label]) => ({
    params: { tag: slug },
    props: { label },
  }));
}

export async function GET(context) {
  const tag = context.params.tag;
  const { label } = context.props;

  const articles = (await getCollection('articles', ({ data }) => !data.draft && data.tags.some((t) => tagSlug(t) === tag)))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return rss({
    title: `#${label} — The Duke Post`,
    description: `Original tech articles from The Duke Post tagged "${label}".`,
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
