import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
const ladder = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/ladder" }),
  schema: z.object({
    step: z.string(),
    name: z.string(),
    duration: z.string(),
    price: z.string(),
    summary: z.string(),
    exit: z.string(),
    order: z.number(),
  }),
});
const faqs = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/faqs" }),
  schema: z.object({
    page: z.string(),
    items: z.array(
      z.object({
        q: z.string(),
        a: z.string(),
      })
    ),
  }),
});
const engagements = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/engagements" }),
  schema: z.object({
    step: z.string(),
    name: z.string(),
    price: z.string(),
    duration: z.string(),
    summary: z.string(),
    includes: z.array(z.string()),
    needs: z.array(z.string()),
    exit: z.string(),
    cta: z.string(),
    ctaHref: z.string(),
    order: z.number(),
  }),
});
const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    category: z.string(),
    readTime: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    featured: z.boolean().default(false),
  }),
});
export const collections = { ladder, faqs, engagements, posts };
