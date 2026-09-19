// share.carter.md/robots.txt — the whole host is unlisted. (The personal
// site's robots.ts still answers on cartercrouch.dev.)
export function GET() {
  return new Response("User-agent: *\nDisallow: /\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
