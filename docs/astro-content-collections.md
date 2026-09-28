# Astro content collections (draft schema)

Public marketing copy for the Astro migration lives under `src/content/`.
This repo is still Vite today; these files are the **source of truth** for homepage, services, packages, and pricing once Astro content collections are wired.

## Collections

| Collection | Path | Purpose |
|------------|------|---------|
| `site` | `src/content/site/` | Singleton pages (homepage sections) |
| `packages` | `src/content/packages/` | Cloud repatriation commercial ladder |
| `services` | `src/content/services/` | Build / consult / support offers |
| `pricing` | `src/content/pricing/` | Pricing page framing |

## Suggested `content.config.ts` (paste when Astro lands)

```ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const site = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/site" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    eyebrow: z.string().optional(),
    heroTitle: z.string(),
    heroBody: z.string(),
    primaryCta: z.object({ label: z.string(), href: z.string() }),
    secondaryCta: z.object({ label: z.string(), href: z.string() }).optional(),
    draft: z.boolean().default(false),
  }),
});

const packages = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/packages" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    order: z.number(),
    eyebrow: z.string(),
    tagline: z.string(),
    outcome: z.string(),
    priceLabel: z.string(),
    priceNote: z.string().optional(),
    entryCriteria: z.string().optional(),
    includes: z.array(z.string()),
    cta: z.object({ label: z.string(), href: z.string() }),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const services = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/services" }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    order: z.number(),
    priceLabel: z.string(),
    leavesWith: z.array(z.string()),
    draft: z.boolean().default(false),
  }),
});

const pricing = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/pricing" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    eyebrow: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { site, packages, services, pricing };
```

## Brand rules for this copy

- Lead with **selective repatriation + hybridization**, not anti-cloud ideology.
- Prefer Flexera-style “about one-fifth of workloads” framing over vendor survey extremes.
- Cite primary sources (DHH / Dropbox S-1 / OCP) before hard public numbers.
- SpecOps remains a product callout; packages ladder is the growth commercial offer.
