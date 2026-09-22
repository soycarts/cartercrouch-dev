import type { NextConfig } from "next";

// share.carter.md is served by this same project. Requests arriving on that
// host are rewritten onto the /share/* routes before any file/page matching,
// so the personal site's "/" never answers on the share hostname.
const SHARE_HOST = process.env.SHARE_HOST || "share.carter.md";
const ID = "[1-9A-HJ-NP-Za-km-z]{22}";
/**
 * An archived draft's slug, as it appears in a URL. The "draft" prefix is
 * what keeps this pattern out of the way of the `files`, `md` and `pdf`
 * segments it shares a position with — none of them can ever match it.
 */
export const VERSION = "draft[0-9A-Za-z_]+";
const onShareHost = [{ type: "host" as const, value: SHARE_HOST }];

/**
 * The catch-all's path pattern. `beforeFiles` rewrites do not stop at the
 * first match: every later rule is re-tested against the already-rewritten
 * path. So the catch-all has to skip anything the specific rules above it
 * have already moved onto the /share mount — otherwise "/" became "/share"
 * and then "/share/share", and "/:id.md" became "/share/share/:id/md", which
 * is exactly why the landing page, robots.txt, and both download links 404ed.
 * Next's own asset paths are excluded for the same reason (88be7a6): they
 * must stay where they are or every stylesheet 404s on the share hostname.
 */
export const SHARE_CATCH_ALL = "(?!_next/|share(?:/|$)|favicon\\.ico$).*";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // The Chromium binary is loaded at runtime from node_modules/.../bin, which
  // output tracing cannot see through the dynamic import — include it by hand.
  // The key is a glob, so "[id]" would be a character class; use a wildcard.
  outputFileTracingIncludes: {
    "/share/*/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/share/*/files/*/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/share/*/*/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/share/*/*/files/*/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", has: onShareHost, destination: "/share" },
        { source: "/robots.txt", has: onShareHost, destination: "/share/robots.txt" },
        { source: `/:id(${ID}).md`, has: onShareHost, destination: "/share/:id/md" },
        { source: `/:id(${ID}).pdf`, has: onShareHost, destination: "/share/:id/pdf" },
        // The same two suffixes inside an archived draft. Their output lands
        // under /share, which the catch-all below already skips, so neither
        // gets rewritten a second time.
        {
          source: `/:id(${ID})/:version(${VERSION}).md`,
          has: onShareHost,
          destination: "/share/:id/:version/md",
        },
        {
          source: `/:id(${ID})/:version(${VERSION}).pdf`,
          has: onShareHost,
          destination: "/share/:id/:version/pdf",
        },
        // Everything else on the share host maps onto /share/*.
        { source: `/:path(${SHARE_CATCH_ALL})`, has: onShareHost, destination: "/share/:path" },
        // Same suffix routes on the /share mount itself, so local dev and the
        // cartercrouch.dev mirror behave identically to the share host.
        { source: `/share/:id(${ID}).md`, destination: "/share/:id/md" },
        { source: `/share/:id(${ID}).pdf`, destination: "/share/:id/pdf" },
        {
          source: `/share/:id(${ID})/:version(${VERSION}).md`,
          destination: "/share/:id/:version/md",
        },
        {
          source: `/share/:id(${ID})/:version(${VERSION}).pdf`,
          destination: "/share/:id/:version/pdf",
        },
      ],
    };
  },
  async headers() {
    // Keep the profile photo out of image-search indexes (both the raw file
    // and the next/image optimizer URL) while leaving it visible on the page.
    const noImageIndex = [{ key: "X-Robots-Tag", value: "noimageindex" }];
    const noIndex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [
      { source: "/profile.jpeg", headers: noImageIndex },
      {
        source: "/_next/image",
        has: [{ type: "query", key: "url", value: "/profile.jpeg" }],
        headers: noImageIndex,
      },
      // Belt and braces: everything under the share mount is unlisted. Header
      // rules match the *original* request path, so /share/:path* never fires
      // on share.carter.md, where the paths are bare — the host-conditioned
      // rule below is the one that covers the public host.
      { source: "/share/:path*", headers: noIndex },
      { source: "/:path*", has: onShareHost, headers: noIndex },
    ];
  },
};

export default nextConfig;
