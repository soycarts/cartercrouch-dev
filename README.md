# cartercrouch.dev

Personal portfolio for **Carter Crouch** — Analytics Engineer, Entrepreneur, Lifelong Learner.

Built with [Next.js 16](https://nextjs.org) (App Router), [Tailwind CSS v4](https://tailwindcss.com), and TypeScript. Single-page, dark theme, fully static.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
```

## Build

```bash
npm run build    # static production build
npm run start    # serve the production build
```

## Editing content

All site content (bio, cycling roles, projects, skills, social links) lives in
[`src/lib/data.ts`](src/lib/data.ts) — edit that one file to update the site.

> The three project descriptions/links (Bountify.ai, Zapflex, Swarmtip) are
> placeholders; replace them with real copy and URLs in `src/lib/data.ts`.

## Structure

```
src/
  app/          layout, page, global styles
  components/   Nav, Hero (typewriter), About, Projects, Skills, Contact, icons
  lib/data.ts   ← all editable content
```

## Deploy

Optimized for [Vercel](https://vercel.com/new) — import the repo and deploy with
zero config. Any static/Node host works too.
