import type { NextConfig } from "next";

// share.carter.md is served by this same project. Requests arriving on that
// host are rewritten onto the /share/* routes before any file/page matching,
// so the personal site's "/" never answers on the share hostname.
const SHARE_HOST = process.env.SHARE_HOST || "share.carter.md";
const ID = "[1-9A-HJ-NP-Za-km-z]{22}";
const onShareHost = [{ type: "host" as const, value: SHARE_HOST }];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  // The Chromium binary is loaded at runtime from node_modules/.../bin, which
  // output tracing cannot see through the dynamic import — include it by hand.
  // The key is a glob, so "[id]" would be a character class; use a wildcard.
  outputFileTracingIncludes: {
    "/share/*/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/share/*/files/*/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", has: onShareHost, destination: "/share" },
        { source: "/robots.txt", has: onShareHost, destination: "/share/robots.txt" },
        { source: `/:id(${ID}).md`, has: onShareHost, destination: "/share/:id/md" },
        { source: `/:id(${ID}).pdf`, has: onShareHost, destination: "/share/:id/pdf" },
        { source: "/:path*", has: onShareHost, destination: "/share/:path*" },
        // Same suffix routes on the /share mount itself, so local dev and the
        // cartercrouch.dev mirror behave identically to the share host.
        { source: `/share/:id(${ID}).md`, destination: "/share/:id/md" },
        { source: `/share/:id(${ID}).pdf`, destination: "/share/:id/pdf" },
      ],
    };
  },
  async headers() {
    // Keep the profile photo out of image-search indexes (both the raw file
    // and the next/image optimizer URL) while leaving it visible on the page.
    const noImageIndex = [{ key: "X-Robots-Tag", value: "noimageindex" }];
    return [
      { source: "/profile.jpeg", headers: noImageIndex },
      {
        source: "/_next/image",
        has: [{ type: "query", key: "url", value: "/profile.jpeg" }],
        headers: noImageIndex,
      },
      // Belt and braces: everything under the share mount is unlisted.
      {
        source: "/share/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
