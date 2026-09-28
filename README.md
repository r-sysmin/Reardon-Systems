# Reardon Systems

Marketing site for Reardon Systems — selective cloud repatriation and private
platforms for mid-market teams.

## Stack

- **Astro 5** — static site, zero JS by default
- **Tailwind v4** — CSS-first config via `@theme` in `src/styles/global.css`
- **Content Layer API** — all repeated content lives in `src/content/` with Zod
  schemas in `src/content.config.ts`
- **Inter** — loaded from rsms.me during dev; swap to self-hosting before launch

## Local development

```bash
pnpm install
pnpm dev
```

Site runs at `http://localhost:4321`.

## Build

```bash
pnpm build
pnpm preview
```

Output goes to `dist/`.

## Project structure

```
src/
├── content.config.ts         # Zod schemas for all collections
├── content/
│   ├── ladder/               # Homepage ladder (4 files, one per stage)
│   ├── engagements/          # Full engagement detail (includes/needs/exit)
│   ├── faqs/                 # FAQs grouped by page (homepage, engagements, ...)
│   └── posts/                # Blog posts as Markdown
├── layouts/Base.astro        # HTML shell, nav, footer
├── components/               # Nav, Footer, CostCurve, ui/*
├── lib/                      # cn() helper, nav links
└── pages/                    # Routes
```

## Editing content

**To change a price, timeline, or ladder stage:**  
edit the corresponding YAML file in `src/content/ladder/` or  
`src/content/engagements/`. Both the homepage ladder and the Engagements page  
read from these files, so the change propagates everywhere in the next build.

**To add or edit an FAQ:**  
edit the relevant file in `src/content/faqs/`. Each file has a `page` field  
(`homepage`, `engagements`, `company`, `contact`, `specops`) and an `items`  
array.

**To publish a blog post:**  
add a `.md` file to `src/content/posts/`. Required frontmatter:

```yaml
---
title: "Post title"
category: "Platforms"
readTime: "14 min read"
date: 2026-09-04
summary: "One sentence that appears on the index and in search results."
featured: false
---
```

Set `featured: true` on exactly one post to feature it at the top of the blog
index.

## Build-time validation

The Zod schemas in `src/content.config.ts` run at build time. If you add a
ladder stage without a `price` field, or an engagement without an `includes`
array, `pnpm build` fails with an error naming the file. This is intentional.

## Deployment

### Static (default)

The site builds to pure static HTML. Deploy `dist/` to any static host:

- **Netlify** — `netlify deploy --prod --dir=dist`
- **Vercel** — `vercel deploy --prod`
- **Cloudflare Pages** — build command `pnpm build`, output `dist`
- **GitHub Pages** — use `withastro/action`

### Forms

The contact form and SpecOps waitlist form have placeholder `action="ACTION_URL"`
attributes. Before launch, replace with a form service (Formspree, Basin, Netlify
Forms) or an Astro adapter + API route.

## Pre-launch checklist

- [ ] Team section on `/company` has placeholder titles, no names
- [ ] Locations on `/company` need real cities
- [ ] Contact form action
- [ ] SpecOps waitlist form action (must accept multipart)
- [ ] Blog subscribe action
- [ ] Replace rsms.me font loading with self-hosted Inter

## Colophon

Copy written for mid-market infrastructure buyers. No thought leadership.
No transformation programs. Show us the bill that hurts.
