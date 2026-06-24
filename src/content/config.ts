import { defineCollection, z } from 'astro:content';
import { CATEGORIES } from '../lib/categories';

const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.string().optional(),
    pubDate: z.coerce.date(),
    author: z.string().default('The Duke Post'),
    category: z.enum(CATEGORIES).default('general'),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles };
