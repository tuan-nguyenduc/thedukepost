import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { authorSlug } from '../../lib/authors';

export async function getStaticPaths() {
  const articles = await getCollection('articles', ({ data }) => !data.draft);

  const authors = new Map();
  for (const article of articles) {
    const slug = authorSlug(article.data.author);
    if (!authors.has(slug)) authors.set(slug, article.data.author);
  }

  return Array.from(authors.entries()).map(([slug, name]) => ({
    params: { name: slug },
    props: { authorName: name },
  }));
}

export async function GET(context) {
  const { authorName } = context.props;

  const articles = (await getCollection('articles', ({ data }) => !data.draft && authorSlug(data.author) === context.params.name))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return rss({
    title: `${authorName} — The Duke Post`,
    description: `Original tech articles from The Duke Post by ${authorName}.`,
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
