import type { APIRoute, GetStaticPaths } from 'astro';
import archive from '../../../data/digest-archive.json';
import { renderOgImage } from '../../../lib/ogImage';

export const getStaticPaths = (async () => {
  return archive.issues.map((issue) => ({ params: { slug: issue.slug }, props: { issue } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { issue } = props;
  const dateLabel = new Date(issue.sentAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const png = await renderOgImage({
    eyebrow: 'Newsletter',
    title: issue.subject,
    meta: `Sent ${dateLabel} · ${issue.stories.length} ${issue.stories.length === 1 ? 'story' : 'stories'}`,
  });

  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
