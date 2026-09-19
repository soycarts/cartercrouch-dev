# cartercrouch.dev

Personal portfolio for **Carter Crouch** — Analytics Engineer, Entrepreneur, Lifelong Learner.

Built with [Next.js 16](https://nextjs.org) (App Router), [Tailwind CSS v4](https://tailwindcss.com), and TypeScript. Single-page, light theme, fully static.

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

## share.carter.md

The same project also serves **share.carter.md**, a Markdown-native sharing
tool: one canonical Markdown document, exposed as a styled reader, exact raw
Markdown, a `.md` download, and a styled PDF. Everything lives under
[`src/app/share`](src/app/share) and [`src/lib/share`](src/lib/share);
requests on the share hostname are rewritten onto `/share/*` by
[`next.config.ts`](next.config.ts).

| Public URL | What it returns |
| --- | --- |
| `https://share.carter.md/<id>` | Styled reader (`?view=markdown` shows the exact source) |
| `https://share.carter.md/<id>.md` | Canonical Markdown, `text/markdown`, byte-for-byte |
| `https://share.carter.md/<id>.pdf` | PDF printed from the reader's own stylesheet |
| `/new`, `/manage`, `/manage/<id>`, `/login` | Owner-only publishing, editing, revoking |
| `POST /api/share` | Bearer-authenticated publish for scripts and agents |

Documents are **unlisted**: 22-character base58 IDs (~129 bits of entropy),
`noindex,nofollow` on every page and response, no sitemap entries, and no
public index anywhere. Unknown, malformed, and revoked IDs all return 404.

### Local development

```bash
vercel env pull .env.local --yes   # Redis credentials from the Marketplace store
npm run dev                        # reader at http://localhost:3000/share/<id>
```

Locally the app is reached at `/share/...` on `localhost:3000` (the hostname
rewrite only applies on `share.carter.md`). `.env.local` also needs:

| Variable | Purpose |
| --- | --- |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash Redis (injected by the Marketplace integration) |
| `SHARE_OWNER_TOKEN` | Owner secret, ≥16 chars: `openssl rand -hex 32`. Also the API bearer token. |
| `NEXT_PUBLIC_SHARE_ORIGIN` | Public origin for generated links. `http://localhost:3000/share` locally; unset in production (defaults to `https://share.carter.md`). |
| `SHARE_HOST` | Optional. Hostname that triggers the rewrite (default `share.carter.md`). |
| `SHARE_STORE=memory` | Optional. Force the in-memory store (nothing persists). |
| `PUPPETEER_EXECUTABLE_PATH` | Optional. Chrome binary for local PDFs; macOS Chrome is auto-detected. |

### Storage

Upstash Redis, provisioned with `vercel integration add upstash/upstash-kv`
(resource `share-carter-md`, connected to production, preview, and
development). One JSON value per document at `share:doc:<id>` plus a set of
IDs at `share:ids` for the owner list. There are no migrations. Without
Redis credentials the app falls back to an in-memory store and logs a warning.

### Authentication

Single owner. `SHARE_OWNER_TOKEN` is checked in constant time; the `/login`
form sets an httpOnly cookie containing an HMAC of the token (never the
token itself), valid for 30 days. The API accepts the same token as
`Authorization: Bearer …`. Public readers never authenticate.

### Publishing, updating, revoking

- **UI:** sign in at `/login`, then `/new` to paste or upload Markdown, preview,
  and publish. The result page shows the reader, `.md`, and PDF URLs with
  copy buttons. `/manage` lists everything; `/manage/<id>` edits the Markdown
  in place (same ID) and toggles **Revoke access**.
- **CLI:** `npm run share -- proposal.md` reads `SHARE_OWNER_TOKEN` from the
  environment or `.env.local`, posts the file, and prints the three URLs. Set
  `SHARE_API_ORIGIN` to target a preview deployment or `http://localhost:3000/share`.
- **API:**

  ```bash
  curl -X POST https://share.carter.md/api/share \
    -H "Authorization: Bearer $SHARE_OWNER_TOKEN" \
    -H "Content-Type: text/markdown" \
    --data-binary @proposal.md
  # → {"id":"…","url":"…","markdownUrl":"…","pdfUrl":"…"}
  ```

The title is inferred from the first H1; the OpenGraph description from the
first paragraph. Raw HTML in Markdown is dropped, and the rendered tree is
sanitized with the GitHub schema.

### PDF generation

`GET /<id>.pdf` launches headless Chromium (`@sparticuz/chromium` on Vercel,
local Chrome elsewhere), loads the reader with `?print=1`, and prints A4 with
the `@media print` rules in `globals.css`. Links stay clickable. Output is
cached at the CDN for 60 s. Failures return a 502 text response and never
affect the HTML or `.md` routes. The printer fetches the page from this
deployment's own origin taken from the environment (production domain in
production, `VERCEL_URL` in previews), never from the request's Host header.
Preview deployments are behind Vercel Authentication, so PDFs there need
**Protection Bypass for Automation** enabled in the project settings; the
generated `VERCEL_AUTOMATION_BYPASS_SECRET` is picked up automatically.

### Domain / DNS

`carter.md` and `www.carter.md` keep their Cloudflare 308 redirect to
`cartercrouch.dev`. `share.carter.md` is a separate hostname on this Vercel
project:

1. `vercel domains add share.carter.md cartercrouch-dev`
2. In Cloudflare DNS for `carter.md`, add `CNAME share → cname.vercel-dns.com`,
   **DNS only** (grey cloud) so Cloudflare's proxy and redirect rule stay out
   of the path.
3. Confirm the redirect rule's expression matches only `carter.md` and
   `www.carter.md` (for example `http.host in {"carter.md" "www.carter.md"}`),
   not the whole zone.
4. Vercel issues the certificate automatically once DNS resolves. Verify with
   `curl -I https://share.carter.md/robots.txt` (expect `Disallow: /`) and
   `curl -I https://carter.md/x` (still 308 → cartercrouch.dev).

### Checks

```bash
npm test           # vitest: ids, sanitizer, store, urls, auth
npm run typecheck
npm run lint
npm run build
```
