import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Keep in sync with pages that pass `noindex` to BaseLayout — a page excluded
// from search indexing shouldn't also be advertised as a URL to crawl.
const NOINDEX_PATHS = ['/reading-list'];

export default defineConfig({
  site: 'https://thedukepost.com',
  output: 'static',
  integrations: [
    sitemap({
      filter: (page) => !NOINDEX_PATHS.some((path) => page.includes(path)),
    }),
  ],
});
