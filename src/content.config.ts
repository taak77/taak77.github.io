import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const portfolio = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/portfolio' }),
  schema: z.object({
    title: z.string(),
    order: z.number().int().positive(),
    thumbnail: z.string().startsWith('/img/'),
    images: z.array(z.string().startsWith('/img/')).min(1),
    imageColumns: z.union([z.literal(1), z.literal(2)]).default(1),
    tools: z.array(z.string()).min(1),
  }),
});

export const collections = { portfolio };
